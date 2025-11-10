/**
 * ♫ Dynamic Context Manager for @dcversus/prp Orchestrator
 *
 * Implements dynamic token distribution and context management
 * according to agents05.md specifications
 */

import { EventEmitter } from 'events';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('orchestrator');

/**
 * Dynamic token limits based on agent type and model
 */
interface DynamicTokenLimits {
  inspectorOutput: number;      // Fixed: 40K from inspector
  agentsMd: number;             // Fixed: 20K for AGENTS.md
  prpContent: number;           // Dynamic: 30K base, compressed if needed
  sharedWarzone: number;       // Dynamic: 10K per active agent
  userMessages: number;         // Dynamic: 20K recent messages only
  toolCalls: number;            // Dynamic: Auto-calculated based on tools
  cotReasoning: number;         // Dynamic: Auto-calculated based on complexity
  safetyBuffer: number;         // Dynamic: Whatever tokens remain
}

/**
 * Agent capabilities for decision making
 */
interface AgentCapabilities {
  id: string;
  type: 'claude' | 'codex' | 'gemini' | 'glm';
  role: string;
  tokenLimits: {
    daily: number;
    weekly: number;
    monthly: number;
    current: number;
    percentage: number;
  };
  signalsHandled: string[];
  toolsAvailable: string[];
  status: 'active' | 'idle' | 'token_limited' | 'error';
  lastActivity: Date;
  performance: {
    avgResponseTime: number;
    successRate: number;
    tasksCompleted: number;
  };
  contextWindow: number;  // Model's context window size
}

/**
 * Compression strategies for context management
 */
interface CompressionStrategy {
  name: string;
  description: string;
  applicableTo: string[];
  compressionRatio: number;
  priority: number;
}

/**
 * Dynamic Context Manager
 */
export class DynamicContextManager extends EventEmitter {
  private modelTokenLimits: Map<string, number> = new Map();
  private agentCapabilities: Map<string, AgentCapabilities> = new Map();
  private _compressionStrategies: CompressionStrategy[] = [];
  private _contextCache: Map<string, unknown> = new Map();
  private tokenUsageHistory: Array<{
    timestamp: Date;
    agentId: string;
    tokensUsed: number;
    context: string;
  }> = [];

  constructor() {
    super();
    this.initializeModelLimits();
    this.initializeCompressionStrategies();
  }

  /**
   * Initialize model-specific token limits
   */
  private initializeModelLimits(): void {
    // Claude models
    this.modelTokenLimits.set('claude-3-5-sonnet-20241022', 200000);
    this.modelTokenLimits.set('claude-3-5-haiku-20241022', 200000);
    this.modelTokenLimits.set('claude-3-opus-20240229', 200000);

    // OpenAI models
    this.modelTokenLimits.set('gpt-4', 128000);
    this.modelTokenLimits.set('gpt-4-turbo', 128000);
    this.modelTokenLimits.set('gpt-3.5-turbo', 16385);

    // Google models
    this.modelTokenLimits.set('gemini-1.5-pro', 2097152);
    this.modelTokenLimits.set('gemini-1.5-flash', 1048576);

    // GLM models
    this.modelTokenLimits.set('glm-4.6', 128000);
    this.modelTokenLimits.set('glm-4.5-air', 128000);
  }

  /**
   * Initialize compression strategies
   */
  private initializeCompressionStrategies(): void {
    this._compressionStrategies = [
      {
        name: 'summarize_long_conversations',
        description: 'Summarize long conversation threads',
        applicableTo: ['userMessages', 'prpContent'],
        compressionRatio: 0.3,
        priority: 1
      },
      {
        name: 'truncate_old_context',
        description: 'Remove old context beyond certain age',
        applicableTo: ['userMessages', 'sharedWarzone'],
        compressionRatio: 0.5,
        priority: 2
      },
      {
        name: 'merge_similar_signals',
        description: 'Merge similar signals and responses',
        applicableTo: ['prpContent', 'sharedWarzone'],
        compressionRatio: 0.4,
        priority: 3
      },
      {
        name: 'compress_code_snippets',
        description: 'Compress long code snippets with summaries',
        applicableTo: ['prpContent', 'toolCalls'],
        compressionRatio: 0.6,
        priority: 4
      }
    ];
  }

  /**
   * Calculate dynamic token distribution for orchestrator prompt
   */
  calculateDynamicTokenDistribution(
    activeAgents: AgentCapabilities[],
    modelType: string,
    signalComplexity: 'low' | 'medium' | 'high' = 'medium'
  ): DynamicTokenLimits {
    const modelLimit = this.modelTokenLimits.get(modelType) ?? 200000;
    const activeAgentCount = activeAgents.filter(a => a.status === 'active').length;

    // Base allocation according to agents05.md specifications
    const distribution: DynamicTokenLimits = {
      inspectorOutput: 40000,      // Fixed 40K
      agentsMd: 20000,             // Fixed 20K
      prpContent: 30000,           // Base 30K
      sharedWarzone: 10000 * activeAgentCount,  // 10K per active agent
      userMessages: 20000,         // Base 20K
      toolCalls: 5000,              // Base 5K
      cotReasoning: this.calculateCoTAllocation(signalComplexity), // Dynamic
      safetyBuffer: 0               // Calculate remaining
    };

    // Calculate dynamic allocations based on complexity and usage
    distribution.prpContent = this.adjustForComplexity(distribution.prpContent, signalComplexity);
    distribution.userMessages = this.adjustForAgentCount(distribution.userMessages, activeAgentCount);
    distribution.toolCalls = this.calculateToolCallAllocation(activeAgents, signalComplexity);
    distribution.cotReasoning = this.calculateCoTAllocation(signalComplexity);

    // Calculate safety buffer (whatever tokens remain)
    const usedTokens = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    distribution.safetyBuffer = Math.max(0, modelLimit - usedTokens);

    // If we're over limit, apply compression
    if (usedTokens > modelLimit) {
      logger.warn('DynamicContextManager', `Token usage (${usedTokens}) exceeds model limit (${modelLimit}), applying compression`);
      return this.applyCompression(distribution, modelLimit);
    }

    logger.info('DynamicContextManager', `Calculated distribution for ${modelType}: ${usedTokens}/${modelLimit} tokens used`);

    return distribution;
  }

  /**
   * Adjust token allocation based on signal complexity
   */
  private adjustForComplexity(baseAllocation: number, complexity: string): number {
    const multipliers = {
      'low': 0.7,
      'medium': 1.0,
      'high': 1.5
    };
    return Math.round(baseAllocation * (multipliers[complexity as keyof typeof multipliers] || 1.0));
  }

  /**
   * Adjust user messages allocation based on active agent count
   */
  private adjustForAgentCount(baseAllocation: number, agentCount: number): number {
    // More agents = more coordination needed = more message history
    const multiplier = Math.min(2.0, 1.0 + (agentCount * 0.2));
    return Math.round(baseAllocation * multiplier);
  }

  /**
   * Calculate CoT reasoning allocation based on complexity
   */
  private calculateCoTAllocation(complexity: string): number {
    const allocations = {
      'low': 5000,
      'medium': 10000,
      'high': 20000
    };
    return allocations[complexity as keyof typeof allocations] || 10000;
  }

  /**
   * Calculate tool call allocation based on active agents and complexity
   */
  private calculateToolCallAllocation(activeAgents: AgentCapabilities[], complexity: string): number {
    const baseAllocation = 5000;
    const agentMultiplier = Math.min(2.0, 1.0 + (activeAgents.length * 0.1));
    const complexityMultiplier = this.adjustForComplexity(1.0, complexity);

    return Math.round(baseAllocation * agentMultiplier * complexityMultiplier);
  }

  /**
   * Apply compression strategies to fit within token limits
   */
  private applyCompression(distribution: DynamicTokenLimits, modelLimit: number): DynamicTokenLimits {
    const currentTotal = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    const excessTokens = currentTotal - modelLimit;
    const compressionRatio = modelLimit / currentTotal;

    logger.info('DynamicContextManager', `Applying ${(1 - compressionRatio).toFixed(2)} compression ratio`);

    // Apply compression to compressible sections
    const compressed = { ...distribution };

    // Prioritize compression: userMessages > prpContent > sharedWarzone > cotReasoning > toolCalls
    const compressibleSections = [
      { key: 'userMessages', priority: 1 },
      { key: 'prpContent', priority: 2 },
      { key: 'sharedWarzone', priority: 3 },
      { key: 'cotReasoning', priority: 4 },
      { key: 'toolCalls', priority: 5 }
    ];

    let remainingReduction = excessTokens;

    for (const section of compressibleSections) {
      if (remainingReduction <= 0) {
        break;
      }

      const currentAllocation = compressed[section.key as keyof DynamicTokenLimits];
      const maxReduction = Math.floor(currentAllocation * 0.7); // Don't compress more than 70%
      const reduction = Math.min(remainingReduction, maxReduction);

      compressed[section.key as keyof DynamicTokenLimits] = currentAllocation - reduction;
      remainingReduction -= reduction;

      logger.debug('DynamicContextManager', `Compressed ${section.key} by ${reduction} tokens`);
    }

    // Recalculate safety buffer
    const newTotal = Object.values(compressed).reduce((sum, val) => sum + val, 0);
    compressed.safetyBuffer = Math.max(0, modelLimit - newTotal);

    return compressed;
  }

  /**
   * Update agent capabilities in real-time
   */
  updateAgentCapabilities(agentCapabilities: AgentCapabilities): void {
    this.agentCapabilities.set(agentCapabilities.id, agentCapabilities);

    // Emit event for real-time updates
    this.emit('agent_capabilities_updated', {
      agentId: agentCapabilities.id,
      capabilities: agentCapabilities,
      timestamp: new Date()
    });

    logger.debug('DynamicContextManager', `Updated capabilities for agent ${agentCapabilities.id}`);
  }

  /**
   * Get agent capabilities for decision making
   */
  getAgentCapabilities(agentId?: string): AgentCapabilities[] {
    if (agentId) {
      const agent = this.agentCapabilities.get(agentId);
      return agent ? [agent] : [];
    }
    return Array.from(this.agentCapabilities.values());
  }

  /**
   * Get best agent for specific signal based on capabilities
   */
  getBestAgentForSignal(signalType: string, requiredTools: string[] = []): AgentCapabilities | null {
    const activeAgents = Array.from(this.agentCapabilities.values())
      .filter(agent => agent.status === 'active')
      .filter(agent => agent.signalsHandled.includes(signalType) || agent.signalsHandled.includes('all'))
      .filter(agent => requiredTools.every(tool => agent.toolsAvailable.includes(tool)));

    if (activeAgents.length === 0) {
      return null;
    }

    // Sort by token availability and performance
    activeAgents.sort((a, b) => {
      // Prefer agents with more available tokens
      const aTokenAvailability = a.tokenLimits.percentage;
      const bTokenAvailability = b.tokenLimits.percentage;

      if (aTokenAvailability !== bTokenAvailability) {
        return bTokenAvailability - aTokenAvailability;
      }

      // Then by performance (success rate)
      return b.performance.successRate - a.performance.successRate;
    });

    return activeAgents.length > 0 ? (activeAgents[0] ?? null) : null;
  }

  /**
   * Record token usage for tracking
   */
  recordTokenUsage(agentId: string, tokensUsed: number, context: string): void {
    this.tokenUsageHistory.push({
      timestamp: new Date(),
      agentId,
      tokensUsed,
      context
    });

    // Update agent's current usage
    const agent = this.agentCapabilities.get(agentId);
    if (agent) {
      agent.tokenLimits.current += tokensUsed;
      agent.tokenLimits.percentage = (agent.tokenLimits.current / agent.tokenLimits.daily) * 100;

      // Check if agent is approaching limits
      if (agent.tokenLimits.percentage > 90) {
        this.emit('agent_token_limit_approaching', {
          agentId,
          percentage: agent.tokenLimits.percentage,
          remaining: agent.tokenLimits.daily - agent.tokenLimits.current
        });
      }

      if (agent.tokenLimits.percentage >= 100) {
        agent.status = 'token_limited';
        this.emit('agent_token_limit_reached', {
          agentId,
          limit: agent.tokenLimits.daily,
          used: agent.tokenLimits.current
        });
      }
    }

    // Keep history manageable
    if (this.tokenUsageHistory.length > 10000) {
      this.tokenUsageHistory = this.tokenUsageHistory.slice(-5000);
    }
  }

  /**
   * Get real-time agent statistics
   */
  getAgentStatistics() : unknown {
    const agents = Array.from(this.agentCapabilities.values());

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      idleAgents: agents.filter(a => a.status === 'idle').length,
      tokenLimitedAgents: agents.filter(a => a.status === 'token_limited').length,
      errorAgents: agents.filter(a => a.status === 'error').length,
      totalTokensUsed: agents.reduce((sum, a) => sum + a.tokenLimits.current, 0),
      totalTokenLimit: agents.reduce((sum, a) => sum + a.tokenLimits.daily, 0),
      averageTokenUsage: agents.length > 0 ?
        agents.reduce((sum, a) => sum + a.tokenLimits.percentage, 0) / agents.length : 0,
      agentBreakdown: agents.map(agent => ({
        id: agent.id,
        type: agent.type,
        role: agent.role,
        status: agent.status,
        tokenUsage: {
          current: agent.tokenLimits.current,
          limit: agent.tokenLimits.daily,
          percentage: agent.tokenLimits.percentage
        },
        performance: agent.performance,
        lastActivity: agent.lastActivity
      }))
    };
  }

  /**
   * Generate warzone shared context
   */
  generateWarzoneContext(): string {
    const agents = Array.from(this.agentCapabilities.values()).filter(a => a.status === 'active');

    let context = '# Warzone Shared Context\n\n';
    context += `## Active Agents (${agents.length})\n\n`;

    for (const agent of agents) {
      context += `### ${agent.role} (${agent.type})\n`;
      context += `- **Status**: ${agent.status}\n`;
      context += `- **Token Usage**: ${agent.tokenLimits.current.toLocaleString()}/${agent.tokenLimits.daily.toLocaleString()} (${agent.tokenLimits.percentage.toFixed(1)}%)\n`;
      context += `- **Current Task**: ${agent.lastActivity.toISOString()}\n`;
      context += `- **Performance**: ${agent.performance.successRate.toFixed(1)}% success rate, ${agent.performance.avgResponseTime}ms avg response\n`;
      context += '\n';
    }

    context += '## Current Blockers\n';
    context += '- No active blockers reported\n\n';

    context += '## What\'s Done\n';
    context += '- System operational with ' + agents.length + ' active agents\n';
    context += '- Token monitoring active\n\n';

    context += '## What\'s Next\n';
    context += '- Continue monitoring agent activities\n';
    context += '- Optimize token allocation based on usage patterns\n';

    return context;
  }

  /**
   * Get compression strategies
   */
  getCompressionStrategies(): CompressionStrategy[] {
    return this._compressionStrategies;
  }

  /**
   * Get context cache
   */
  getContextCache(): Map<string, unknown> {
    return this._contextCache;
  }
}