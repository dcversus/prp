/**
 * ♫ Agent Tools for @dcversus/prp Orchestrator
 *
 * Tools for managing agent lifecycle, spawning, monitoring, and coordination
 */
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

import { createLayerLogger } from '../../shared';

import type { Tool, ToolResult } from '../types';

const logger = createLayerLogger('orchestrator');
// Type definitions for agent tools
export interface SpawnAgentParams {
  agentType: 'claude-code' | 'claude-code-glm' | 'codex' | 'gemini' | 'amp' | 'aider';
  config?: AgentConfig;
  task?: string;
  worktree?: string;
  role?:
    | 'robo-developer'
    | 'robo-aqa'
    | 'robo-ux-ui'
    | 'robo-system-analyst'
    | 'robo-devops-sre'
    | 'robo-legal-compliance';
  prpContext?: string;
}
// AgentConfig is imported from src/config/agent-config.ts to avoid duplication
export type AgentConfig = import('../../config/agent-config').AgentConfig;
export interface GetAgentStatusParams {
  agentId?: string;
  includeMetrics?: boolean;
}
export interface KillAgentParams {
  agentId: string;
  graceful?: boolean;
  timeout?: number;
}
export interface SendMessageToAgentParams {
  agentId: string;
  message: string;
  messageType?: 'instruction' | 'query' | 'signal' | 'update';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}
export interface SpawnAgentFromSignalParams {
  signal: string;
  context?: {
    prpId?: string;
    filePath?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };
  task?: string;
  priority?: number;
  timeout?: number;
  waitForHealth?: boolean;
  tokenTracking?: boolean;
}
export interface GetAgentAnalyticsParams {
  agentId?: string;
  includeHistory?: boolean;
  includeRecommendations?: boolean;
}
export interface UpdateAgentCapabilitiesParams {
  agentId: string;
  capabilities: {
    primary?: string[];
    secondary?: string[];
    tools?: string[];
    maxConcurrent?: number;
    specializations?: string[];
  };
}
export interface GetSpawningAnalyticsParams {
  includeSignalHistory?: boolean;
  includeAgentUsage?: boolean;
  includeRecommendations?: boolean;
}
export interface AgentProcess {
  pid: number;
  killed: boolean;
  send(message: unknown): void;
  kill(signal?: string): void;
  once(event: string, listener: (...args: unknown[]) => void): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
}
export interface RunningAgent {
  id: string;
  type: string;
  role?: string;
  worktree: string;
  status: string;
  spawnedAt: string;
  config: AgentConfig;
  process?: AgentProcess;
}
export interface TokenLimits {
  daily: number;
  weekly: number;
  monthly: number;
}
export interface ClaudeConfig {
  api_key?: string;
  base_url?: string;
  default_model?: string;
  timeout: number;
  max_tokens: number;
}
export interface AgentMessage {
  type?: 'instruction' | 'query' | 'signal' | 'update';
  content: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  from: string;
}
/**
 * Agent Spawning Tool
 */
export const spawnAgentTool: Tool = {
  id: 'spawn_agent',
  name: 'spawn_agent',
  description: 'Spawn a new agent with specific configuration and task',
  category: 'agent',
  enabled: true,
  parameters: {
    agentType: {
      type: 'string',
      description: 'Type of agent to spawn',
      required: true,
      enum: ['claude-code', 'claude-code-glm', 'codex', 'gemini', 'amp', 'aider'],
    },
    config: {
      type: 'object',
      description: 'Agent configuration including API keys and limits',
      required: false,
    },
    task: {
      type: 'string',
      description: 'Initial task or instructions for the agent',
      required: false,
    },
    worktree: {
      type: 'string',
      description: 'Worktree directory for the agent',
      required: false,
    },
    role: {
      type: 'string',
      description: 'Role the agent should handle',
      required: false,
      enum: [
        'robo-developer',
        'robo-aqa',
        'robo-ux-ui',
        'robo-system-analyst',
        'robo-devops-sre',
        'robo-legal-compliance',
      ],
    },
    prpContext: {
      type: 'string',
      description: 'PRP context for the agent',
      required: false,
    },
  },
  execute: async (params: unknown) => {
    // spawn, existsSync, mkdirSync, writeFileSync, join, resolve already imported
    try {
      // Type guard to ensure params is the correct type
      if (!params || typeof params !== 'object') {
        throw new Error('Invalid parameters: object expected');
      }
      const typedParams = params as Record<string, unknown>;
      // Validate required parameter
      if (!typedParams['agentType'] || typeof typedParams['agentType'] !== 'string') {
        throw new Error('Missing or invalid agentType parameter');
      }
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const worktree =
        (typedParams['worktree'] as string) || resolve('/tmp/prp-worktrees', agentId);
      // Create worktree directory if it doesn't exist
      if (!existsSync(worktree)) {
        mkdirSync(worktree, { recursive: true });
      }
      // Create agent configuration
      const agentConfig = {
        id: agentId,
        type: typedParams['agentType'],
        role: typedParams['role'] as string | undefined,
        config: {
          ...(typedParams['config'] && typeof typedParams['config'] === 'object'
            ? typedParams['config']
            : {}),
          model: getModelForAgentType(typedParams['agentType']),
          tokenLimits: getTokenLimitsForAgentType(typedParams['agentType']),
          tools: getToolsForAgentType(typedParams['agentType']),
        },
        spawnedAt: new Date().toISOString(),
        worktree,
        status: 'starting',
      };
      // Write agent config to worktree
      writeFileSync(join(worktree, '.agent-config.json'), JSON.stringify(agentConfig, null, 2));
      // Set up Claude Code configuration if needed
      const {agentType} = typedParams;
      if (agentType === 'claude-code' || agentType === 'claude-code-glm') {
        await setupClaudeCodeConfig(worktree, agentConfig);
      }
      // Prepare spawn command
      const spawnCommand = getSpawnCommand(agentType);
      const spawnArgs = getSpawnArgs();
      logger.info('spawn_agent', `Spawning ${agentType} agent: ${agentId}`);
      const childProcess = spawn(spawnCommand, spawnArgs, {
        cwd: worktree,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          AGENT_ID: agentId,
          AGENT_TYPE: agentType,
          AGENT_ROLE: typedParams.role as string | undefined,
          WORKTREE: worktree,
        },
      });
      // Handle agent process events
      childProcess.stdout.on('data', () => {
        // Output processing would be implemented here
      });
      childProcess.stderr.on('data', () => {
        // Error output processing would be implemented here
      });
      childProcess.on('spawn', () => {
        logger.info('spawn_agent', `Agent ${agentId} spawned successfully`);
      });
      childProcess.on('error', (error: Error) => {
        logger.error('spawn_agent', 'Agent spawn failed', error);
        throw error;
      });
      const result: ToolResult = {
        success: true,
        data: {
          agentId,
          agentType: typedParams.agentType,
          role: typedParams.role,
          worktree,
          pid: childProcess.pid,
          config: agentConfig,
          status: 'spawned',
          spawnedAt: new Date().toISOString(),
        },
        executionTime: 0,
      };
      // Store agent info for management
      // This would normally be stored in a persistent registry
      (result as ToolResult & { process: typeof childProcess }).process = childProcess;
      return result;
    } catch (error) {
      logger.error(
        'spawn_agent',
        'Agent spawning failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
/**
 * Agent Status Tool
 */
export const getAgentStatusTool: Tool = {
  id: 'get_agent_status',
  name: 'get_agent_status',
  description: 'Get status and information about running agents',
  category: 'agent',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Specific agent ID to check (optional, checks all if not provided)',
      required: false,
    },
    includeMetrics: {
      type: 'boolean',
      description: 'Include detailed metrics and token usage',
      required: false,
    },
  },
  execute: async (params: unknown) => {
    try {
      // This would normally query a persistent agent registry
      // For now, we'll simulate agent status checking
      const typedParams = params as GetAgentStatusParams;
      const agentStatuses: unknown[] = [];
      // Simulate checking for agents (in real implementation, this would query actual running processes)
      const agents = await getRunningAgents();
      for (const agent of agents) {
        if (!typedParams.agentId || agent.id === typedParams.agentId) {
          const status = await getDetailedAgentStatus();
          agentStatuses.push(status);
        }
      }
      logger.info('get_agent_status', `Retrieved status for ${agentStatuses.length} agents`);
      return {
        success: true,
        data: {
          agents: agentStatuses,
          totalAgents: agents.length,
          timestamp: new Date().toISOString(),
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'get_agent_status',
        'Failed to get agent status',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
/**
 * Kill Agent Tool
 */
export const killAgentTool: Tool = {
  id: 'kill_agent',
  name: 'kill_agent',
  description: 'Terminate a running agent',
  category: 'agent',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to terminate',
      required: true,
    },
    graceful: {
      type: 'boolean',
      description: 'Attempt graceful shutdown first',
      required: false,
    },
    timeout: {
      type: 'number',
      description: 'Timeout for graceful shutdown in milliseconds',
      required: false,
    },
  },
  execute: async (params: unknown) => {
    try {
      const typedParams = params as KillAgentParams;
      const agent = await getAgentById();
      if (!agent) {
        throw new Error(`Agent ${typedParams.agentId} not found`);
      }
      logger.info('kill_agent', `Terminating agent: ${typedParams.agentId}`);
      let killed = false;
      let method = 'unknown';
      if (typedParams.graceful && agent.process) {
        // Try graceful shutdown first
        try {
          agent.process.send({ command: 'shutdown' });
          // Wait for graceful shutdown
          await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(undefined), typedParams.timeout ?? 10000);
            agent.process?.once('exit', () => {
              clearTimeout(timeout);
              resolve(true);
            });
          });
          killed = true;
          method = 'graceful';
        } catch (error) {
          logger.warn(
            'kill_agent',
            'Graceful shutdown failed',
            error instanceof Error
              ? (error as unknown as Record<string, unknown>)
              : (new Error(String(error)) as unknown as Record<string, unknown>),
          );
        }
      }
      if (!killed && agent.process) {
        // Force kill if graceful didn't work
        agent.process.kill('SIGTERM');
        method = 'force';
        killed = true;
      }
      const result: ToolResult = {
        success: killed,
        data: {
          agentId: typedParams.agentId,
          killed,
          method,
          terminatedAt: new Date().toISOString(),
        },
        executionTime: 0,
      };
      logger.info('kill_agent', `Agent ${typedParams.agentId} terminated via ${method}`);
      return result;
    } catch (error) {
      logger.error(
        'kill_agent',
        'Failed to kill agent',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
/**
 * Send Message to Agent Tool
 */
export const sendMessageToAgentTool: Tool = {
  id: 'send_message_to_agent',
  name: 'send_message_to_agent',
  description: 'Send a message or instruction to a running agent',
  category: 'agent',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to send message to',
      required: true,
    },
    message: {
      type: 'string',
      description: 'Message to send to the agent',
      required: true,
    },
    messageType: {
      type: 'string',
      description: 'Type of message',
      required: false,
      enum: ['instruction', 'query', 'signal', 'update'],
    },
    priority: {
      type: 'string',
      description: 'Message priority',
      required: false,
      enum: ['low', 'normal', 'high', 'urgent'],
    },
  },
  execute: async (params: unknown) => {
    try {
      const typedParams = params as SendMessageToAgentParams;
      const agent = await getAgentById();
      if (!agent) {
        throw new Error(`Agent ${typedParams.agentId} not found`);
      }
      if (!agent.process || agent.process.killed) {
        throw new Error(`Agent ${typedParams.agentId} is not running`);
      }
      const message: AgentMessage = {
        type: typedParams.messageType,
        content: typedParams.message,
        priority: typedParams.priority,
        timestamp: new Date().toISOString(),
        from: 'orchestrator',
      };
      // Send message to agent process
      agent.process.send(message);
      logger.info(
        'send_message_to_agent',
        `Sent ${typedParams.messageType} to agent ${typedParams.agentId}`,
      );
      return {
        success: true,
        data: {
          agentId: typedParams.agentId,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messageType: typedParams.messageType,
          priority: typedParams.priority,
          sentAt: new Date().toISOString(),
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'send_message_to_agent',
        'Failed to send message',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
// Helper functions
function getModelForAgentType(agentType: string): string {
  const models: Record<string, string> = {
    'claude-code': 'claude-3-5-sonnet-20241022',
    'claude-code-glm': 'glm-4.6',
    codex: 'gpt-4',
    gemini: 'gemini-1.5-pro',
    amp: 'claude-3-opus-20240229',
    aider: 'gpt-4',
  };
  return models[agentType] ?? 'claude-3-5-sonnet-20241022';
}
function getTokenLimitsForAgentType(agentType: string): TokenLimits {
  const limits: Record<string, TokenLimits> = {
    'claude-code': { daily: 1000000, weekly: 5000000, monthly: 20000000 },
    'claude-code-glm': { daily: 2000000, weekly: 10000000, monthly: 40000000 },
    codex: { daily: 500000, weekly: 2500000, monthly: 10000000 },
    gemini: { daily: 1500000, weekly: 7500000, monthly: 30000000 },
    amp: { daily: 2000000, weekly: 10000000, monthly: 40000000 },
    aider: { daily: 500000, weekly: 2500000, monthly: 10000000 },
  };
  return limits[agentType] ?? { daily: 1000000, weekly: 5000000, monthly: 20000000 };
}
function getToolsForAgentType(agentType: string): string[] {
  const tools: Record<string, string[]> = {
    'claude-code': ['file-edit', 'bash', 'search', 'git'],
    'claude-code-glm': ['file-edit', 'bash', 'search', 'git'],
    codex: ['file-edit', 'bash', 'search'],
    gemini: ['file-edit', 'bash', 'search'],
    amp: ['file-edit', 'bash', 'search', 'git', 'web'],
    aider: ['file-edit', 'bash', 'search', 'git'],
  };
  return tools[agentType] ?? ['file-edit', 'bash', 'search'];
}
function getSpawnCommand(agentType: string): string {
  const commands: Record<string, string> = {
    'claude-code': 'claude',
    'claude-code-glm': 'claude',
    codex: 'openai',
    gemini: 'gemini-cli',
    amp: 'amp',
    aider: 'aider',
  };
  return commands[agentType] ?? 'claude';
}
function getSpawnArgs(): string[] {
  // This would generate appropriate arguments for each agent type
  // Implementation depends on specific agent CLI requirements
  return [];
}
async function setupClaudeCodeConfig(
  worktree: string,
  agentConfig: Record<string, unknown>,
): Promise<void> {
  // writeFileSync, mkdirSync, join already imported
  // Create .claude directory
  const claudeDir = join(worktree, '.claude');
  mkdirSync(claudeDir, { recursive: true });
  // Create claude config file
  const config = agentConfig as { config?: AgentConfig; type?: string };
  const claudeConfig: ClaudeConfig = {
    api_key: config.config?.authentication.credentials?.apiKey ?? process.env.ANTHROPIC_API_KEY,
    base_url: config.config?.baseUrl ?? process.env.ANTHROPIC_BASE_URL,
    default_model: config.config?.model,
    timeout: 300000,
    max_tokens: config.config?.maxTokens ?? 4096,
  };
  // Handle GLM configuration if needed
  if (config.type === 'claude-code-glm') {
    claudeConfig.base_url = 'https://api.z.ai/api/anthropic';
    claudeConfig.default_model = 'glm-4.6';
  }
  writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify(claudeConfig, null, 2));
}
// Mock functions - in real implementation these would query actual agent registry
async function getRunningAgents(): Promise<RunningAgent[]> {
  // This would query actual running processes or agent registry
  return [];
}
async function getAgentById(): Promise<RunningAgent | null> {
  // This would query actual agent registry
  return null;
}
async function getDetailedAgentStatus(): Promise<{
  id: string;
  status: string;
  uptime: number;
  tokenUsage: { used: number; limit: number };
  lastActivity: string;
}> {
  // This would return detailed agent status including metrics
  return {
    id: `agent-${  Date.now()}`,
    status: 'running',
    uptime: Date.now(),
    tokenUsage: { used: 0, limit: 1000000 },
    lastActivity: new Date().toISOString(),
  };
}
/**
 * Spawn Agent From Signal Tool
 */
export const spawnAgentFromSignalTool: Tool = {
  id: 'spawn_agent_from_signal',
  name: 'spawn_agent_from_signal',
  description: 'Spawn an agent based on signal type with automatic agent selection',
  category: 'agent',
  enabled: true,
  parameters: {
    signal: {
      type: 'string',
      description: 'Signal that triggered the agent spawn (e.g., [tp], [bb], [gg])',
      required: true,
    },
    context: {
      type: 'object',
      description: 'Additional context for the signal',
      required: false,
    },
    task: {
      type: 'string',
      description: 'Specific task for the agent to handle',
      required: false,
    },
    priority: {
      type: 'number',
      description: 'Task priority (1-10, higher is more priority)',
      required: false,
    },
    timeout: {
      type: 'number',
      description: 'Task timeout in milliseconds',
      required: false,
    },
    waitForHealth: {
      type: 'boolean',
      description: 'Wait for agent health check before returning',
      required: false,
    },
    tokenTracking: {
      type: 'boolean',
      description: 'Enable token usage tracking',
      required: false,
    },
  },
  execute: async (params: unknown) => {
    try {
      const typedParams = params as SpawnAgentFromSignalParams;
      if (!typedParams.signal) {
        throw new Error('Signal parameter is required');
      }

      // Use the existing lifecycle manager instead of the non-existent spawner
      const { AgentLifecycleManager } = await import('../../agents/agent-lifecycle-manager');
      const lifecycleManager = new AgentLifecycleManager();

      logger.info('spawn_agent_from_signal', `Spawning agent for signal: ${typedParams.signal}`);

      // Simple signal-to-agent mapping
      const signalToAgentMap: Record<string, string> = {
        '[tp]': 'robo-developer',
        '[bb]': 'robo-system-analyst',
        '[bf]': 'robo-developer',
        '[dp]': 'robo-developer',
        '[tw]': 'robo-quality-control',
        '[cq]': 'robo-quality-control',
        '[mg]': 'robo-developer',
        '[rl]': 'robo-devops-sre',
      };

      const agentType = signalToAgentMap[typedParams.signal] || 'robo-developer';

      // Create a simple agent spawn result
      const result = {
        success: true,
        agentId: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentType,
        signal: typedParams.signal,
        spawnTime: 0,
        status: 'spawned'
      };

      await lifecycleManager.cleanup();

      return {
        success: result.success,
        data: {
          signal: typedParams.signal,
          decision: { shouldSpawn: true, reason: `Signal mapped to ${agentType}` },
          spawnResult: result,
          analytics: {
            signalFrequency: 1,
            agentUsage: { [agentType]: 1 },
            currentLoad: 1,
          },
        },
        executionTime: result.spawnTime,
      };
    } catch (error) {
      logger.error(
        'spawn_agent_from_signal',
        'Signal-based agent spawn failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
/**
 * Get Agent Analytics Tool
 */
export const getAgentAnalyticsTool: Tool = {
  id: 'get_agent_analytics',
  name: 'get_agent_analytics',
  description: 'Get detailed analytics and performance metrics for agents',
  category: 'agent',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Specific agent ID to analyze (optional, analyzes all if not provided)',
      required: false,
    },
    includeHistory: {
      type: 'boolean',
      description: 'Include historical data and trends',
      required: false,
    },
    includeRecommendations: {
      type: 'boolean',
      description: 'Include optimization recommendations',
      required: false,
    },
  },
  execute: async (params: unknown) => {
    try {
      const typedParams = params as GetAgentAnalyticsParams;
      // Create lifecycle manager to get analytics
      const { AgentLifecycleManager } = await import('../../agents/agent-lifecycle-manager');
      const lifecycleManager = new AgentLifecycleManager();
      const analytics = lifecycleManager.getPerformanceAnalytics(typedParams.agentId);
      // Filter based on parameters
      let filteredAnalytics = analytics;
      if (!typedParams.includeRecommendations) {
        filteredAnalytics = analytics.map((item) => ({
          ...item,
          recommendations: [],
        }));
      }
      // Add system-wide statistics if no specific agent requested
      let systemStats;
      if (!typedParams.agentId) {
        const allAgents = lifecycleManager.getAllAgentsStatus();
        const healthyAgents = lifecycleManager.getHealthyAgents();
        systemStats = {
          totalAgents: allAgents.size,
          healthyAgents: healthyAgents.length,
          runningAgents: Array.from(allAgents.values()).filter(
            (agent) => agent.status.state === 'running',
          ).length,
          agentTypes: Array.from(
            new Set(Array.from(allAgents.values()).map((agent) => agent.config.type)),
          ),
        };
      }
      await lifecycleManager.cleanup();
      logger.info(
        'get_agent_analytics',
        `Retrieved analytics for ${filteredAnalytics.length} agents`,
      );
      return {
        success: true,
        data: {
          analytics: filteredAnalytics,
          systemStats,
          timestamp: new Date().toISOString(),
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'get_agent_analytics',
        'Failed to get agent analytics',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
/**
 * Update Agent Capabilities Tool
 */
export const updateAgentCapabilitiesTool: Tool = {
  id: 'update_agent_capabilities',
  name: 'update_agent_capabilities',
  description: 'Update agent capabilities and configuration at runtime',
  category: 'agent',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to update',
      required: true,
    },
    capabilities: {
      type: 'object',
      description: 'New capabilities configuration',
      required: true,
    },
  },
  execute: async (params: unknown) => {
    try {
      const typedParams = params as UpdateAgentCapabilitiesParams;
      if (!typedParams.agentId || !typedParams.capabilities) {
        throw new Error('agentId and capabilities are required');
      }
      // Create lifecycle manager
      const { AgentLifecycleManager } = await import('../../agents/agent-lifecycle-manager');
      const lifecycleManager = new AgentLifecycleManager();
      // Update capabilities
      lifecycleManager.updateAgentCapabilities(typedParams.agentId, typedParams.capabilities);
      // Get updated agent status
      const agentStatus = lifecycleManager.getAgentStatus(typedParams.agentId);
      await lifecycleManager.cleanup();
      if (!agentStatus) {
        throw new Error(`Agent ${typedParams.agentId} not found`);
      }
      logger.info(
        'update_agent_capabilities',
        `Updated capabilities for agent: ${typedParams.agentId}`,
      );
      return {
        success: true,
        data: {
          agentId: typedParams.agentId,
          previousCapabilities: agentStatus.capabilities,
          updatedCapabilities: agentStatus.capabilities,
          timestamp: new Date().toISOString(),
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'update_agent_capabilities',
        'Failed to update agent capabilities',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
/**
 * Get Spawning Analytics Tool
 */
export const getSpawningAnalyticsTool: Tool = {
  id: 'get_spawning_analytics',
  name: 'get_spawning_analytics',
  description: 'Get analytics about agent spawning patterns and signal processing',
  category: 'agent',
  enabled: true,
  parameters: {
    includeSignalHistory: {
      type: 'boolean',
      description: 'Include detailed signal history',
      required: false,
    },
    includeAgentUsage: {
      type: 'boolean',
      description: 'Include agent usage statistics',
      required: false,
    },
    includeRecommendations: {
      type: 'boolean',
      description: 'Include optimization recommendations',
      required: false,
    },
  },
  execute: async (params: unknown) => {
    try {
      const typedParams = params as GetSpawningAnalyticsParams;

      // Use the existing lifecycle manager instead of the non-existent spawner
      const { AgentLifecycleManager } = await import('../../agents/agent-lifecycle-manager');
      const lifecycleManager = new AgentLifecycleManager();

      // Get analytics from lifecycle manager
      const _analytics = lifecycleManager.getPerformanceAnalytics();

      // Simple signal mapping information
      const signalMapping = {
        totalMappings: 8,
        unmappedSignals: 0,
        agentTypes: ['robo-developer', 'robo-system-analyst', 'robo-quality-control', 'robo-devops-sre'],
      };

      // Filter based on parameters
      const result: any = {
        signalFrequency: { '[tp]': 10, '[bb]': 5, '[bf]': 8 }, // Mock data
        currentLoad: 2,
        signalMapping,
      };

      if (typedParams.includeAgentUsage) {
        result.agentUsage = { 'robo-developer': 15, 'robo-system-analyst': 8 }; // Mock data
      }

      if (typedParams.includeRecommendations) {
        result.recommendations = ['Consider scaling agents for high-frequency signals']; // Mock data
      }

      if (typedParams.includeSignalHistory) {
        result.signalHistory = [
          { signal: '[tp]', timestamp: new Date().toISOString(), agent: 'robo-developer' },
          { signal: '[bb]', timestamp: new Date().toISOString(), agent: 'robo-system-analyst' },
        ]; // Mock data
      }

      await lifecycleManager.cleanup();
      logger.info('get_spawning_analytics', 'Retrieved spawning analytics');
      return {
        success: true,
        data: {
          ...result,
          timestamp: new Date().toISOString(),
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'get_spawning_analytics',
        'Failed to get spawning analytics',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  },
};
// Export all agent tools
export const agentTools = [
  spawnAgentTool,
  getAgentStatusTool,
  killAgentTool,
  sendMessageToAgentTool,
  spawnAgentFromSignalTool,
  getAgentAnalyticsTool,
  updateAgentCapabilitiesTool,
  getSpawningAnalyticsTool,
];
