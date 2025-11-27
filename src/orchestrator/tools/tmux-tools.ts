/**
 * ♫ Tmux Tools for @dcversus/prp Orchestrator
 *
 * Tools for integrating tmux session management with the orchestrator.
 * Provides spawnAgent, stopAgent, sendMessage, and other tmux-related operations.
 */
import { createLayerLogger } from '../../shared';
import { createDefaultTmuxConfig } from '../../shared/tmux-exports';

import type { Tool, ToolResult } from '../types';
import type { EventBus } from '../../shared/events';
import type { AgentConfig as CommonAgentConfig } from '../../shared/types';
import type { AgentConfig as ConfigAgentConfig } from '../../config/agent-config';

// Create unified type for tool parameters
type AgentConfig = CommonAgentConfig & {
  provider?: string;
  authentication?: {
    credentials?: {
      apiKey?: string;
    };
  };
  personality?: string | Record<string, unknown>;
  tools?: string[];
  limits?: {
    maxTokensPerRequest?: number;
    maxRequestsPerHour?: number;
    maxRequestsPerDay?: number;
    maxCostPerDay?: number;
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
    maxConcurrentTasks?: number;
    cooldownPeriod?: number;
  };
  metadata?: Record<string, unknown>;
};

const logger = createLayerLogger('orchestrator');

// Global tmux manager instance - lazy loaded
let tmuxManagerInstance: import('../tmux-management/tmux-manager').TmuxManager | null = null;
let eventBusInstance: EventBus | null = null;

/**
 * Initialize or get the tmux manager instance
 */
async function getTmuxManager(): Promise<import('../tmux-management/tmux-manager').TmuxManager> {
  if (!tmuxManagerInstance) {
    if (!eventBusInstance) {
      throw new Error('EventBus not initialized. Call initializeTmuxTools first.');
    }

    const { TmuxManager } = await import('../tmux-management/tmux-manager');
    const config = createDefaultTmuxConfig();
    tmuxManagerInstance = new TmuxManager(config, eventBusInstance);
    await tmuxManagerInstance.initialize();
  }
  return tmuxManagerInstance;
}

/**
 * Initialize tmux tools with event bus
 */
export async function initializeTmuxTools(eventBus: EventBus): Promise<void> {
  eventBusInstance = eventBus;
  logger.info('initializeTmuxTools', 'Tmux tools initialized with event bus');
}

/**
 * Cleanup tmux tools
 */
export async function cleanupTmuxTools(): Promise<void> {
  if (tmuxManagerInstance) {
    await tmuxManagerInstance.cleanup();
    tmuxManagerInstance = null;
  }
  eventBusInstance = null;
  logger.info('cleanupTmuxTools', 'Tmux tools cleaned up');
}

// Tool parameter interfaces
export interface TmuxSpawnAgentParams {
  agentId: string;
  agentConfig: AgentConfig;
  instructions: string;
  workingDirectory?: string;
}

export interface TmuxStopAgentParams {
  agentId: string;
  reason?: 'user_request' | 'timeout' | 'error' | 'agent_completed';
  graceful?: boolean;
  timeout?: number;
}

export interface TmuxSendMessageParams {
  agentId: string;
  message: string;
  messageType?: 'instruction' | 'query' | 'signal' | 'update';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface TmuxGetAgentStatusParams {
  agentId: string;
  includeMetrics?: boolean;
}

export interface TmuxListAgentsParams {
  activeOnly?: boolean;
}

export interface TmuxGetAgentLogsParams {
  agentId: string;
  lines?: number;
  level?: 'debug' | 'info' | 'warn' | 'error';
}

export interface TmuxGetAgentMetricsParams {
  agentId: string;
  period?: '1h' | '6h' | '24h' | '7d';
}

/**
 * Tmux Spawn Agent Tool
 */
export const tmuxSpawnAgentTool: Tool = {
  id: 'tmux_spawn_agent',
  name: 'tmux_spawn_agent',
  description: 'Spawn a new agent in a tmux session with full terminal management',
  category: 'tmux',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Unique identifier for the agent',
      required: true,
    },
    agentConfig: {
      type: 'object',
      description: 'Agent configuration including capabilities and limits',
      required: true,
    },
    instructions: {
      type: 'string',
      description: 'Initial instructions or task for the agent',
      required: true,
    },
    workingDirectory: {
      type: 'string',
      description: 'Working directory for the agent session',
      required: false,
    },
  },
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const typedParams = params as TmuxSpawnAgentParams;

      if (!typedParams.agentId || !typedParams.agentConfig || !typedParams.instructions) {
        throw new Error('Missing required parameters: agentId, agentConfig, instructions');
      }

      const tmuxManager = await getTmuxManager();
      logger.info('tmux_spawn_agent', `Spawning agent ${typedParams.agentId}`);

      const agentSession = await tmuxManager.spawnAgent(
        typedParams.agentId,
        typedParams.agentConfig as any,
        typedParams.instructions,
        typedParams.workingDirectory
      );

      return {
        success: true,
        data: {
          agentId: typedParams.agentId,
          sessionId: agentSession.id,
          sessionName: agentSession.name,
          status: agentSession.status,
          state: agentSession.state,
          workingDirectory: agentSession.workingDirectory,
          logPath: agentSession.logPath,
          createdAt: agentSession.createdAt,
          capabilities: agentSession.capabilities,
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'tmux_spawn_agent',
        'Failed to spawn agent via tmux',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },
};

/**
 * Tmux Stop Agent Tool
 */
export const tmuxStopAgentTool: Tool = {
  id: 'tmux_stop_agent',
  name: 'tmux_stop_agent',
  description: 'Stop a running agent in its tmux session',
  category: 'tmux',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to stop',
      required: true,
    },
    reason: {
      type: 'string',
      description: 'Reason for stopping the agent',
      required: false,
      enum: ['user_request', 'timeout', 'error', 'agent_completed'],
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
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const typedParams = params as TmuxStopAgentParams;

      if (!typedParams.agentId) {
        throw new Error('Missing required parameter: agentId');
      }

      const tmuxManager = await getTmuxManager();
      logger.info('tmux_stop_agent', `Stopping agent ${typedParams.agentId}`);

      const result = await tmuxManager.stopAgent(
        typedParams.agentId,
        typedParams.reason,
        typedParams.graceful,
        typedParams.timeout
      );

      return {
        success: result.success,
        data: {
          agentId: typedParams.agentId,
          success: result.success,
          terminatedAt: result.terminatedAt,
          method: result.method,
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'tmux_stop_agent',
        'Failed to stop agent via tmux',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },
};

/**
 * Tmux Send Message Tool
 */
export const tmuxSendMessageTool: Tool = {
  id: 'tmux_send_message',
  name: 'tmux_send_message',
  description: 'Send a message or instruction to a running agent',
  category: 'tmux',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to send message to',
      required: true,
    },
    message: {
      type: 'string',
      description: 'Message content to send',
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
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const typedParams = params as TmuxSendMessageParams;

      if (!typedParams.agentId || !typedParams.message) {
        throw new Error('Missing required parameters: agentId, message');
      }

      const tmuxManager = await getTmuxManager();
      logger.info('tmux_send_message', `Sending message to agent ${typedParams.agentId}`);

      const result = await tmuxManager.sendMessage(
        typedParams.agentId,
        typedParams.message,
        typedParams.messageType,
        typedParams.priority
      );

      return {
        success: result.success,
        data: {
          agentId: typedParams.agentId,
          messageId: result.messageId,
          deliveryStatus: result.deliveryStatus,
          sentAt: result.sentAt,
          messageType: typedParams.messageType,
          priority: typedParams.priority,
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'tmux_send_message',
        'Failed to send message via tmux',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },
};

/**
 * Tmux Get Agent Status Tool
 */
export const tmuxGetAgentStatusTool: Tool = {
  id: 'tmux_get_agent_status',
  name: 'tmux_get_agent_status',
  description: 'Get detailed status and health information for an agent',
  category: 'tmux',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to get status for',
      required: true,
    },
    includeMetrics: {
      type: 'boolean',
      description: 'Include detailed resource metrics',
      required: false,
    },
  },
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const typedParams = params as TmuxGetAgentStatusParams;

      if (!typedParams.agentId) {
        throw new Error('Missing required parameter: agentId');
      }

      const tmuxManager = await getTmuxManager();
      logger.info('tmux_get_agent_status', `Getting status for agent ${typedParams.agentId}`);

      const status = await tmuxManager.getAgentStatus(
        typedParams.agentId,
        typedParams.includeMetrics
      );

      return {
        success: true,
        data: status,
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'tmux_get_agent_status',
        'Failed to get agent status via tmux',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },
};

/**
 * Tmux List Agents Tool
 */
export const tmuxListAgentsTool: Tool = {
  id: 'tmux_list_agents',
  name: 'tmux_list_agents',
  description: 'List all active agents managed by tmux',
  category: 'tmux',
  enabled: true,
  parameters: {
    activeOnly: {
      type: 'boolean',
      description: 'Only return active (running/idle) agents',
      required: false,
    },
  },
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const typedParams = params as TmuxListAgentsParams;

      const tmuxManager = await getTmuxManager();
      logger.info('tmux_list_agents', 'Listing agents via tmux');

      let agents;
      if (typedParams.activeOnly) {
        agents = await tmuxManager.listActiveAgents();
      } else {
        agents = tmuxManager.getAgentSessions();
      }

      return {
        success: true,
        data: {
          agents: agents.map(agent => ({
            agentId: agent.agentId,
            sessionId: agent.id,
            sessionName: agent.name,
            status: agent.status,
            state: agent.state,
            agentType: agent.agentConfig.type,
            agentRole: agent.agentConfig.role,
            workingDirectory: agent.workingDirectory,
            createdAt: agent.createdAt,
            lastActivity: agent.lastActivity,
            interactionCount: agent.interactionCount,
            capabilities: agent.capabilities,
          })),
          totalCount: agents.length,
          activeCount: typedParams.activeOnly ? agents.length : agents.filter(a => a.status === 'running' || a.status === 'idle').length,
          timestamp: new Date().toISOString(),
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'tmux_list_agents',
        'Failed to list agents via tmux',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },
};

/**
 * Tmux Get Agent Logs Tool
 */
export const tmuxGetAgentLogsTool: Tool = {
  id: 'tmux_get_agent_logs',
  name: 'tmux_get_agent_logs',
  description: 'Get logs from an agent session',
  category: 'tmux',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to get logs for',
      required: true,
    },
    lines: {
      type: 'number',
      description: 'Number of lines to retrieve (default: 100)',
      required: false,
    },
    level: {
      type: 'string',
      description: 'Filter by log level',
      required: false,
      enum: ['debug', 'info', 'warn', 'error'],
    },
  },
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const typedParams = params as TmuxGetAgentLogsParams;

      if (!typedParams.agentId) {
        throw new Error('Missing required parameter: agentId');
      }

      const tmuxManager = await getTmuxManager();
      logger.info('tmux_get_agent_logs', `Getting logs for agent ${typedParams.agentId}`);

      const logs = await tmuxManager.getAgentLogs(typedParams.agentId, {
        lines: typedParams.lines,
        level: typedParams.level,
      });

      return {
        success: true,
        data: {
          agentId: typedParams.agentId,
          logs,
          lineCount: logs.split('\n').length,
          options: {
            lines: typedParams.lines,
            level: typedParams.level,
          },
          retrievedAt: new Date().toISOString(),
        },
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'tmux_get_agent_logs',
        'Failed to get agent logs via tmux',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },
};

/**
 * Tmux Get Agent Metrics Tool
 */
export const tmuxGetAgentMetricsTool: Tool = {
  id: 'tmux_get_agent_metrics',
  name: 'tmux_get_agent_metrics',
  description: 'Get performance and resource metrics for an agent',
  category: 'tmux',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to get metrics for',
      required: true,
    },
    period: {
      type: 'string',
      description: 'Time period for metrics',
      required: false,
      enum: ['1h', '6h', '24h', '7d'],
    },
  },
  execute: async (params: unknown): Promise<ToolResult> => {
    try {
      const typedParams = params as TmuxGetAgentMetricsParams;

      if (!typedParams.agentId) {
        throw new Error('Missing required parameter: agentId');
      }

      const tmuxManager = await getTmuxManager();
      logger.info('tmux_get_agent_metrics', `Getting metrics for agent ${typedParams.agentId}`);

      const metrics = await tmuxManager.getAgentMetrics(typedParams.agentId, typedParams.period);

      return {
        success: true,
        data: metrics,
        executionTime: 0,
      };
    } catch (error) {
      logger.error(
        'tmux_get_agent_metrics',
        'Failed to get agent metrics via tmux',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  },
};

// Export all tmux tools
export const tmuxTools = [
  tmuxSpawnAgentTool,
  tmuxStopAgentTool,
  tmuxSendMessageTool,
  tmuxGetAgentStatusTool,
  tmuxListAgentsTool,
  tmuxGetAgentLogsTool,
  tmuxGetAgentMetricsTool,
];