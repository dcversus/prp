/**
 * ♫ Context Manager for @dcversus/prp Orchestrator
 *
 * Manages modular prompt construction and context synchronization
 * across PRPs, agents, and shared memory.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { Signal, PRPFile } from '../shared/types';
import { createLayerLogger } from '../shared';

// Placeholder types for missing definitions
interface SharedContext {
  signals: unknown[];
  notes: unknown[];
  agents: unknown[];
  metrics: unknown;
  warzone: {
    blockers: { description: string; priority: number }[];
    completed: { description: string; prp: string }[];
    next: { description: string; priority: number }[];
    notes: string[];
  };
  agentStatuses: Map<string, unknown>;
  systemMetrics: {
    tokensUsed: number;
    tokensLimit: number;
    activeAgents: number;
    processingSignals: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

interface ContextWindow {
  total: number;
  used: number;
  available: number;
  sections: {
    agents: number;
    shared: number;
    prp: number;
    tools: number;
    system: number;
  };
}

interface PromptSection {
  id: string;
  type: string;
  content: string;
  tokens: number;
  compressible: boolean;
}

const logger = createLayerLogger('orchestrator');

interface ContextLimits {
  prp: number;
  shared: number;
  agents: number;
  tools: number;
  system: number;
  total: number;
}

interface ContextSection {
  name: string;
  content: string;
  tokens: number;
  priority: number;
  required: boolean;
  compressible: boolean;
  lastUpdated: Date;
}


/**
 * Context Manager - Handles prompt construction and context management
 */
export class ContextManager {
  private contextLimits: ContextLimits;
  private sharedContext: SharedContext;
  private prpContexts: Map<string, ContextSection[]> = new Map();
  private agentContexts: Map<string, ContextSection[]> = new Map();
  private noteCache: Map<string, unknown> = new Map();
  private storagePath: string;
  private _maxCacheSize: number;
  
  constructor(contextLimits: Partial<ContextLimits> = {}) {
    this.contextLimits = {
      prp: contextLimits.prp || 30000,
      shared: contextLimits.shared || 10000,
      agents: contextLimits.agents || 20000,
      tools: contextLimits.tools || 5000,
      system: contextLimits.system || 5000,
      total: contextLimits.total || 200000
    };

    this.sharedContext = {
      signals: [],
      notes: [],
      agents: [],
      metrics: {},
      warzone: {
        blockers: [],
        completed: [],
        next: [],
        notes: []
      },
      agentStatuses: new Map(),
      systemMetrics: {
        tokensUsed: 0,
        tokensLimit: this.contextLimits.total,
        activeAgents: 0,
        processingSignals: 0,
        averageResponseTime: 0,
        errorRate: 0
      }
    };

    this.storagePath = resolve(process.cwd(), '.prp', 'context');
    this._maxCacheSize = 1000;

    this.ensureStorageDirectory();
  }

  /**
   * Initialize the context manager
   */
  async initialize(): Promise<void> {
    logger.info('initialize', 'Initializing context manager');

    try {
      // Load persisted context
      await this.loadPersistedContext();

      // Load notes from filesystem
      await this.loadNotes();

      logger.info('initialize', 'Context manager initialized successfully');
    } catch (error) {
      logger.error('initialize', 'Failed to initialize context manager',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Build complete context for a signal
   */
  async buildContext(signal: Signal, orchestratorState: unknown): Promise<{
    prompt: string;
    contextWindow: ContextWindow;
    sections: PromptSection[];
  }> {
    logger.debug('buildContext', 'Building context for signal', {
      signalType: signal.type,
      signalId: signal.id
    });

    try {
      // Gather all context sections
      const sections = await this.gatherContextSections(signal, orchestratorState);

      // Calculate token requirements
      const tokenRequirements = this.calculateTokenRequirements(sections);

      // Optimize and compress if needed
      const optimizedSections = await this.optimizeSections(sections, tokenRequirements);

      // Build final prompt
      const prompt = this.buildPrompt(optimizedSections);

      // Create context window information
      const contextWindow = this.createContextWindow(optimizedSections);

      return {
        prompt,
        contextWindow,
        sections: optimizedSections.map(section => ({
          id: section.name,
          type: 'context',
          content: section.content,
          tokens: section.tokens,
          compressible: section.compressible
        }))
      };

    } catch (error) {
      logger.error('buildContext', 'Failed to build context');
      throw error;
    }
  }

  /**
   * Update shared context
   */
  async updateSharedContext(updates: Partial<SharedContext>): Promise<void> {
    Object.assign(this.sharedContext, updates);

    // Persist updates
    await this.persistSharedContext();

    logger.debug('updateSharedContext', 'Shared context updated');
  }

  /**
   * Update PRP context
   */
  async updatePRPContext(prp: PRPFile): Promise<void> {
    const sections = await this.createPRPSections(prp);
    this.prpContexts.set(prp.name, sections);

    // Persist PRP context
    await this.persistPRPContext(prp.name, sections);

    logger.debug('updatePRPContext', `PRP context updated: ${prp.name}`);
  }

  /**
   * Update agent context
   */
  async updateAgentContext(agentId: string, context: unknown): Promise<void> {
    const sections = await this.createAgentSections(agentId, context as { status?: string; capabilities?: unknown });
    this.agentContexts.set(agentId, sections);

    logger.debug('updateAgentContext', `Agent context updated: ${agentId}`);
  }

  /**
   * Get context summary
   */
  getContextSummary(): {
    sharedContext: unknown;
    prpContexts: number;
    agentContexts: number;
    notesCount: number;
    totalTokens: number;
  } {
    return {
      sharedContext: this.sharedContext,
      prpContexts: this.prpContexts.size,
      agentContexts: this.agentContexts.size,
      notesCount: this.noteCache.size,
      totalTokens: this.calculateTotalTokens()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('cleanup', 'Cleaning up context manager');

    try {
      // Persist all contexts
      await this.persistAllContexts();

      // Clear caches
      this.prpContexts.clear();
      this.agentContexts.clear();
      this.noteCache.clear();

      logger.info('cleanup', 'Context manager cleaned up successfully');
    } catch (error) {
      logger.error('cleanup', 'Error during cleanup',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Gather all context sections for a signal
   */
  private async gatherContextSections(signal: Signal, orchestratorState: unknown): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // System sections
    sections.push(...await this.createSystemSections());

    // Shared context sections
    sections.push(...await this.createSharedSections());

    // Agent context sections
    sections.push(...await this.createActiveAgentSections(orchestratorState as { activeAgents?: unknown[]; metrics?: { activeAgents?: number; } }));

    // PRP context sections
    sections.push(...await this.createRelevantPRPSections(signal));

    // Signal-specific sections
    sections.push(...await this.createSignalSections(signal));

    // Tool context sections
    sections.push(...await this.createToolSections());

    // Notes sections
    sections.push(...await this.createRelevantNotes(signal));

    // Sort by priority and required status
    sections.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return b.priority - a.priority;
    });

    return sections;
  }

  /**
   * Create system context sections
   */
  private async createSystemSections(): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // System instructions
    sections.push({
      name: 'system_instructions',
      content: `You are the orchestrator for the PRP (Product Requirement Prompt) system.
Your role is to coordinate agents, make decisions, and drive projects to completion.
You have access to tools and can delegate tasks to specialized agents.
Always think step-by-step and explain your reasoning clearly.`,
      tokens: this.estimateTokens(`You are the orchestrator for the PRP (Product Requirement Prompt) system.
Your role is to coordinate agents, make decisions, and drive projects to completion.
You have access to tools and can delegate tasks to specialized agents.
Always think step-by-step and explain your reasoning clearly.`),
      priority: 10,
      required: true,
      compressible: false,
      lastUpdated: new Date()
    });

    // Current system state
    const systemState = this.formatSystemState();
    sections.push({
      name: 'system_state',
      content: systemState,
      tokens: this.estimateTokens(systemState),
      priority: 8,
      required: true,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create shared context sections
   */
  private async createSharedSections(): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Warzone context
    const warzone = this.formatWarzoneContext();
    sections.push({
      name: 'warzone',
      content: warzone,
      tokens: this.estimateTokens(warzone),
      priority: 9,
      required: true,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create active agent context sections
   */
  private async createActiveAgentSections(orchestratorState: { activeAgents?: unknown[], metrics?: { activeAgents?: number } }): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    if (orchestratorState.activeAgents && Array.isArray(orchestratorState.activeAgents) && orchestratorState.activeAgents.length > 0) {
      const agentStatuses = this.formatAgentStatuses(orchestratorState.activeAgents);
      sections.push({
        name: 'active_agents',
        content: agentStatuses,
        tokens: this.estimateTokens(agentStatuses),
        priority: 7,
        required: false,
        compressible: true,
        lastUpdated: new Date()
      });
    }

    return sections;
  }

  /**
   * Create relevant PRP context sections
   */
  private async createRelevantPRPSections(signal: Signal): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Find PRPs relevant to this signal
    const relevantPRPs = this.findRelevantPRPs(signal);

    for (const prp of relevantPRPs) {
      const prpSections = this.prpContexts.get(prp.name) || await this.createPRPSections(prp);

      for (const section of prpSections) {
        if (this.isSectionRelevantToSignal(section, signal)) {
          sections.push(section);
        }
      }
    }

    return sections;
  }

  /**
   * Create signal-specific context sections
   */
  private async createSignalSections(signal: Signal): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Signal details
    const signalDetails = this.formatSignalDetails(signal);
    sections.push({
      name: 'current_signal',
      content: signalDetails,
      tokens: this.estimateTokens(signalDetails),
      priority: 10,
      required: true,
      compressible: false,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create tool context sections
   */
  private async createToolSections(): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Available tools
    const toolsList = this.formatAvailableTools();
    sections.push({
      name: 'available_tools',
      content: toolsList,
      tokens: this.estimateTokens(toolsList),
      priority: 6,
      required: false,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create relevant notes sections
   */
  private async createRelevantNotes(signal: Signal): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Find notes relevant to this signal
    const relevantNotes = this.findRelevantNotes(signal);

    for (const note of relevantNotes) {
      const noteObj = note as { id: string; content: string; lastModified: Date };
      sections.push({
        name: `note_${noteObj.id}`,
        content: noteObj.content,
        tokens: this.estimateTokens(noteObj.content),
        priority: 5,
        required: false,
        compressible: true,
        lastUpdated: noteObj.lastModified
      });
    }

    return sections;
  }

  /**
   * Calculate token requirements for sections
   */
  private calculateTokenRequirements(sections: ContextSection[]): {
    total: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const section of sections) {
      total += section.tokens;
      byCategory[section.name] = (byCategory[section.name] || 0) + section.tokens;
    }

    return { total, byCategory };
  }

  /**
   * Optimize sections to fit within token limits
   */
  private async optimizeSections(
    sections: ContextSection[],
    requirements: { total: number; byCategory: Record<string, number> }
  ): Promise<ContextSection[]> {
    let optimizedSections = [...sections];

    // If within limits, return as-is
    if (requirements.total <= this.contextLimits.total) {
      return optimizedSections;
    }

    // Sort sections by priority and compressibility
    optimizedSections.sort((a, b) => {
      // Required sections come first
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;

      // Then by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Compressible sections can be reduced
      return a.compressible ? 1 : -1;
    });

    let currentTokens = 0;
    const finalSections: ContextSection[] = [];

    for (const section of optimizedSections) {
      const projectedTokens = currentTokens + section.tokens;

      if (projectedTokens <= this.contextLimits.total) {
        // Section fits as-is
        finalSections.push(section);
        currentTokens += section.tokens;
      } else if (section.compressible && section.required) {
        // Compress required section
        const compressed = await this.compressSection(section, this.contextLimits.total - currentTokens);
        finalSections.push(compressed);
        currentTokens += compressed.tokens;
      } else if (!section.required) {
        // Skip optional section
        continue;
      } else {
        // Required section doesn't fit and can't be compressed - truncate
        const truncated = await this.truncateSection(section, this.contextLimits.total - currentTokens);
        finalSections.push(truncated);
        currentTokens += truncated.tokens;
        break; // No more space
      }
    }

    return finalSections;
  }

  /**
   * Compress a section
   */
  private async compressSection(section: ContextSection, maxTokens: number): Promise<ContextSection> {
    // Simple compression strategy - summarize content
    const summary = await this.summarizeContent(section.content, maxTokens);

    return {
      ...section,
      content: summary,
      tokens: this.estimateTokens(summary),
      lastUpdated: new Date()
    };
  }

  /**
   * Truncate a section
   */
  private async truncateSection(section: ContextSection, maxTokens: number): Promise<ContextSection> {
    const estimatedCharsPerToken = 4;
    const maxChars = maxTokens * estimatedCharsPerToken;

    let truncated = section.content.substring(0, maxChars);
    if (truncated.length < section.content.length) {
      truncated += '\n... [Content truncated due to token limits]';
    }

    return {
      ...section,
      content: truncated,
      tokens: this.estimateTokens(truncated),
      lastUpdated: new Date()
    };
  }

  /**
   * Build final prompt from sections
   */
  private buildPrompt(sections: ContextSection[]): string {
    const promptParts: string[] = [];

    for (const section of sections) {
      if (section.content.trim()) {
        promptParts.push(`## ${section.name.toUpperCase()}\n${section.content}\n`);
      }
    }

    return promptParts.join('\n');
  }

  /**
   * Create context window information
   */
  private createContextWindow(sections: ContextSection[]): ContextWindow {
    const used = sections.reduce((sum, section) => sum + section.tokens, 0);
    const available = this.contextLimits.total - used;

    return {
      total: this.contextLimits.total,
      used,
      available,
      sections: {
        agents: sections.filter(s => s.name.startsWith('agent')).reduce((sum, s) => sum + s.tokens, 0),
        shared: sections.filter(s => s.name.startsWith('shared') || s.name.startsWith('warzone')).reduce((sum, s) => sum + s.tokens, 0),
        prp: sections.filter(s => s.name.startsWith('prp')).reduce((sum, s) => sum + s.tokens, 0),
        tools: sections.filter(s => s.name.startsWith('tool')).reduce((sum, s) => sum + s.tokens, 0),
        system: sections.filter(s => s.name.startsWith('system')).reduce((sum, s) => sum + s.tokens, 0)
      }
    };
  }

  // Helper methods for formatting different context types
  private formatSystemState(): string {
    const metrics = this.sharedContext.systemMetrics;
    return `System Metrics:
- Tokens Used: ${metrics.tokensUsed}/${metrics.tokensLimit}
- Active Agents: ${metrics.activeAgents}
- Processing Signals: ${metrics.processingSignals}
- Average Response Time: ${metrics.averageResponseTime}ms
- Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`;
  }

  private formatWarzoneContext(): string {
    const warzone = this.sharedContext.warzone;

    let output = 'Warzone Context:\n';

    if (warzone.blockers.length > 0) {
      output += `Blockers (${warzone.blockers.length}):\n`;
      warzone.blockers.forEach((blocker) => {
        output += `- ${blocker.description} (Priority: ${blocker.priority})\n`;
      });
    }

    if (warzone.completed.length > 0) {
      output += `Completed (${warzone.completed.length}):\n`;
      warzone.completed.forEach((completed) => {
        output += `- ${completed.description} (${completed.prp})\n`;
      });
    }

    if (warzone.next.length > 0) {
      output += `Next Actions (${warzone.next.length}):\n`;
      warzone.next.forEach((next) => {
        output += `- ${next.description} (Priority: ${next.priority})\n`;
      });
    }

    return output;
  }

  private formatAgentStatuses(activeAgents: unknown[]): string {
    return `Active Agents (${activeAgents.length}):\n${activeAgents.map(agent => {
      const agentObj = agent as { name: string; status: string; currentTask?: string };
      return `- ${agentObj.name}: ${agentObj.status} (Task: ${agentObj.currentTask || 'None'})`;
    }).join('\n')}`;
  }

  private formatSignalDetails(signal: Signal): string {
    return `Current Signal:
- Type: ${signal.type}
- Priority: ${signal.priority}
- Source: ${signal.source}
- Timestamp: ${signal.timestamp.toISOString()}
- Data: ${JSON.stringify(signal.data, null, 2)}`;
  }

  private formatAvailableTools(): string {
    // This would return available tools from the tool registry
    return 'Available Tools: read_file, write_file, list_directory, execute_command, git_status, http_request';
  }

  // Filesystem and persistence methods
  private ensureStorageDirectory(): void {
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  private async loadPersistedContext(): Promise<void> {
    try {
      const sharedContextFile = join(this.storagePath, 'shared-context.json');
      if (existsSync(sharedContextFile)) {
        const data = readFileSync(sharedContextFile, 'utf8');
        const persisted = JSON.parse(data);
        Object.assign(this.sharedContext, persisted);
      }
    } catch {
      logger.warn('loadPersistedContext', 'Failed to load persisted context');
    }
  }

  private async persistSharedContext(): Promise<void> {
    try {
      const sharedContextFile = join(this.storagePath, 'shared-context.json');
      writeFileSync(sharedContextFile, JSON.stringify(this.sharedContext, null, 2));
    } catch {
      logger.error('persistSharedContext', 'Failed to persist shared context');
    }
  }

  private async persistPRPContext(prpName: string, sections: ContextSection[]): Promise<void> {
    try {
      const prpContextFile = join(this.storagePath, `prp-${prpName}.json`);
      writeFileSync(prpContextFile, JSON.stringify(sections, null, 2));
    } catch (error) {
      logger.error('orchestrator', 'Failed to persist PRP context', error instanceof Error ? error : new Error(String(error)), {
        prpName
      });
    }
  }

  private async persistAllContexts(): Promise<void> {
    await this.persistSharedContext();

    for (const [prpName, sections] of Array.from(this.prpContexts.entries())) {
      await this.persistPRPContext(prpName, sections);
    }
  }

  // Note management
  private async loadNotes(): Promise<void> {
    // Load notes from filesystem
    // This would scan for .md files with signal patterns
  }

  private findRelevantNotes(_signal: Signal): unknown[] {
    // Find notes matching signal patterns
    return [];
  }

  // PRP and agent section creation
  private async createPRPSections(prp: PRPFile): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // PRP goal
    if (prp.goal) {
      sections.push({
        name: `prp_goal_${prp.name}`,
        content: `PRP Goal: ${prp.goal}`,
        tokens: this.estimateTokens(prp.goal),
        priority: 8,
        required: true,
        compressible: false,
        lastUpdated: prp.lastModified
      });
    }

    // Progress log (recent entries)
    if (prp.progressLog && prp.progressLog.length > 0) {
      const recentProgress = prp.progressLog.slice(-5);
      const progressContent = recentProgress.map(entry =>
        `[${entry.timestamp.toISOString()}] ${entry.message}`
      ).join('\n');

      sections.push({
        name: `prp_progress_${prp.name}`,
        content: `Recent Progress:\n${progressContent}`,
        tokens: this.estimateTokens(progressContent),
        priority: 6,
        required: false,
        compressible: true,
        lastUpdated: prp.lastModified
      });
    }

    return sections;
  }

  private async createAgentSections(agentId: string, context: { status?: string; capabilities?: unknown }): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Agent status and capabilities
    const statusContent = `Agent ${agentId} Status: ${context.status || 'Unknown'}
Capabilities: ${JSON.stringify(context.capabilities || {}, null, 2)}`;

    sections.push({
      name: `agent_status_${agentId}`,
      content: statusContent,
      tokens: this.estimateTokens(statusContent),
      priority: 5,
      required: false,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  // Utility methods
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private async summarizeContent(content: string, maxTokens: number): Promise<string> {
    // Simple truncation-based summarization
    // In production, would use an LLM for proper summarization
    const estimatedCharsPerToken = 4;
    const maxChars = maxTokens * estimatedCharsPerToken;

    let summary = content.substring(0, maxChars);
    if (summary.length < content.length) {
      summary += '\n... [Content summarized]';
    }

    return summary;
  }

  private findRelevantPRPs(_signal: Signal): PRPFile[] {
    // Logic to find PRPs relevant to this signal
    // For now, return empty array
    return [];
  }

  private isSectionRelevantToSignal(_section: ContextSection, _signal: Signal): boolean {
    // Logic to determine if a section is relevant to the signal
    // For now, return true for all sections
    return true;
  }

  private calculateTotalTokens(): number {
    let total = 0;

    // Shared context tokens
    total += this.estimateTokens(JSON.stringify(this.sharedContext));

    // PRP context tokens
    for (const sections of Array.from(this.prpContexts.values())) {
      total += sections.reduce((sum, section) => sum + section.tokens, 0);
    }

    // Agent context tokens
    for (const sections of Array.from(this.agentContexts.values())) {
      total += sections.reduce((sum, section) => sum + section.tokens, 0);
    }

    // Note tokens
    for (const note of Array.from(this.noteCache.values())) {
      total += this.estimateTokens(JSON.stringify(note));
    }

    return total;
  }

  /**
   * Get maximum cache size
   */
  getMaxCacheSize(): number {
    return this._maxCacheSize;
  }
}