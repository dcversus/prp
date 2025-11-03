/**
 * ♫ Agent Tools for @dcversus/prp Orchestrator
 *
 * Tools for managing agent lifecycle, spawning, monitoring, and coordination
 */

import { Tool, ToolResult } from '../types';
import { createLayerLogger } from '../../shared';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const logger = createLayerLogger('orchestrator');

// Type definitions for agent tools
export interface SpawnAgentParams {
  agentType: 'claude-code' | 'claude-code-glm' | 'codex' | 'gemini' | 'amp' | 'aider';
  config?: AgentConfig;
  task?: string;
  worktree?: string;
  role?: 'robo-developer' | 'robo-aqa' | 'robo-ux-ui' | 'robo-system-analyst' | 'robo-devops-sre' | 'robo-legal-compliance';
  prpContext?: string;
}

// AgentConfig is imported from src/config/agent-config.ts to avoid duplication
export type AgentConfig = import('../../config/agent-config.js').AgentConfig;

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
      enum: ['claude-code', 'claude-code-glm', 'codex', 'gemini', 'amp', 'aider']
    },
    config: {
      type: 'object',
      description: 'Agent configuration including API keys and limits',
      required: false
    },
    task: {
      type: 'string',
      description: 'Initial task or instructions for the agent',
      required: false
    },
    worktree: {
      type: 'string',
      description: 'Worktree directory for the agent',
      required: false
    },
    role: {
      type: 'string',
      description: 'Role the agent should handle',
      required: false,
      enum: ['robo-developer', 'robo-aqa', 'robo-ux-ui', 'robo-system-analyst', 'robo-devops-sre', 'robo-legal-compliance']
    },
    prpContext: {
      type: 'string',
      description: 'PRP context for the agent',
      required: false
    }
  },
  execute: async (params: Record<string, unknown>) => {
    // spawn, existsSync, mkdirSync, writeFileSync, join, resolve already imported

    try {
      const typedParams = params as SpawnAgentParams;
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const worktree = typedParams.worktree || resolve('/tmp/prp-worktrees', agentId);

      // Create worktree directory if it doesn't exist
      if (!existsSync(worktree)) {
        mkdirSync(worktree, { recursive: true });
      }

      // Create agent configuration
      const agentConfig = {
        id: agentId,
        type: typedParams.agentType,
        role: typedParams.role,
        config: {
          ...typedParams.config,
          model: getModelForAgentType(typedParams.agentType),
          tokenLimits: getTokenLimitsForAgentType(typedParams.agentType),
          tools: getToolsForAgentType(typedParams.agentType)
        },
        spawnedAt: new Date().toISOString(),
        worktree,
        status: 'starting'
      };

      // Write agent config to worktree
      writeFileSync(
        join(worktree, '.agent-config.json'),
        JSON.stringify(agentConfig, null, 2)
      );

      // Set up Claude Code configuration if needed
      if (typedParams.agentType === 'claude-code' || typedParams.agentType === 'claude-code-glm') {
        await setupClaudeCodeConfig(worktree, agentConfig);
      }

      // Prepare spawn command
      const spawnCommand = getSpawnCommand(typedParams.agentType);
      const spawnArgs = getSpawnArgs();

      logger.info('spawn_agent', `Spawning ${typedParams.agentType} agent: ${agentId}`);

      const childProcess = spawn(spawnCommand, spawnArgs, {
        cwd: worktree,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          AGENT_ID: agentId,
          AGENT_TYPE: typedParams.agentType,
          AGENT_ROLE: typedParams.role,
          WORKTREE: worktree
        }
      });

      // Handle agent process events
      childProcess.stdout?.on('data', () => {
        // Output processing would be implemented here
      });

      childProcess.stderr?.on('data', () => {
        // Error output processing would be implemented here
      });

      childProcess.on('spawn', () => {
        logger.info('spawn_agent', `Agent ${agentId} spawned successfully`);
      });

      childProcess.on('error', (error: Error) => {
        logger.error('spawn_agent', `Agent spawn failed`, error);
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
          spawnedAt: new Date().toISOString()
        },
        executionTime: 0
      };

      // Store agent info for management
      // This would normally be stored in a persistent registry
      (result as ToolResult & { process: typeof childProcess }).process = childProcess;

      return result;

    } catch (error) {
      logger.error('spawn_agent', `Agent spawning failed`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
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
      required: false
    },
    includeMetrics: {
      type: 'boolean',
      description: 'Include detailed metrics and token usage',
      required: false
    }
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
          timestamp: new Date().toISOString()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('get_agent_status', `Failed to get agent status`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
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
      required: true
    },
    graceful: {
      type: 'boolean',
      description: 'Attempt graceful shutdown first',
      required: false
    },
    timeout: {
      type: 'number',
      description: 'Timeout for graceful shutdown in milliseconds',
      required: false
    }
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

      if (typedParams.graceful && (agent as RunningAgent).process) {
        // Try graceful shutdown first
        try {
          (agent as RunningAgent).process!.send({ command: 'shutdown' });

          // Wait for graceful shutdown
          await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(undefined), typedParams.timeout || 10000);

            (agent as RunningAgent).process!.once('exit', () => {
              clearTimeout(timeout);
              resolve(true);
            });
          });

          killed = true;
          method = 'graceful';
        } catch (error) {
          logger.warn('kill_agent', `Graceful shutdown failed`, error instanceof Error ? error as unknown as Record<string, unknown> : new Error(String(error)) as unknown as Record<string, unknown>);
        }
      }

      if (!killed && (agent as RunningAgent).process) {
        // Force kill if graceful didn't work
        (agent as RunningAgent).process!.kill('SIGTERM');
        method = 'force';
        killed = true;
      }

      const result: ToolResult = {
        success: killed,
        data: {
          agentId: typedParams.agentId,
          killed,
          method,
          terminatedAt: new Date().toISOString()
        },
        executionTime: 0
      };

      logger.info('kill_agent', `Agent ${typedParams.agentId} terminated via ${method}`);

      return result;

    } catch (error) {
      logger.error('kill_agent', `Failed to kill agent`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
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
      required: true
    },
    message: {
      type: 'string',
      description: 'Message to send to the agent',
      required: true
    },
    messageType: {
      type: 'string',
      description: 'Type of message',
      required: false,
      enum: ['instruction', 'query', 'signal', 'update']
    },
    priority: {
      type: 'string',
      description: 'Message priority',
      required: false,
      enum: ['low', 'normal', 'high', 'urgent']
    }
  },
  execute: async (params: unknown) => {
    try {
      const typedParams = params as SendMessageToAgentParams;
      const agent = await getAgentById();

      if (!agent) {
        throw new Error(`Agent ${typedParams.agentId} not found`);
      }

      if (!(agent as RunningAgent).process || (agent as RunningAgent).process!.killed) {
        throw new Error(`Agent ${typedParams.agentId} is not running`);
      }

      const message: AgentMessage = {
        type: typedParams.messageType,
        content: typedParams.message,
        priority: typedParams.priority,
        timestamp: new Date().toISOString(),
        from: 'orchestrator'
      };

      // Send message to agent process
      (agent as RunningAgent).process!.send(message);

      logger.info('send_message_to_agent', `Sent ${typedParams.messageType} to agent ${typedParams.agentId}`);

      return {
        success: true,
        data: {
          agentId: typedParams.agentId,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messageType: typedParams.messageType,
          priority: typedParams.priority,
          sentAt: new Date().toISOString()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('send_message_to_agent', `Failed to send message`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

// Helper functions
function getModelForAgentType(agentType: string): string {
  const models: Record<string, string> = {
    'claude-code': 'claude-3-5-sonnet-20241022',
    'claude-code-glm': 'glm-4.6',
    'codex': 'gpt-4',
    'gemini': 'gemini-1.5-pro',
    'amp': 'claude-3-opus-20240229',
    'aider': 'gpt-4'
  };
  return models[agentType] || 'claude-3-5-sonnet-20241022';
}

function getTokenLimitsForAgentType(agentType: string): TokenLimits {
  const limits: Record<string, TokenLimits> = {
    'claude-code': { daily: 1000000, weekly: 5000000, monthly: 20000000 },
    'claude-code-glm': { daily: 2000000, weekly: 10000000, monthly: 40000000 },
    'codex': { daily: 500000, weekly: 2500000, monthly: 10000000 },
    'gemini': { daily: 1500000, weekly: 7500000, monthly: 30000000 },
    'amp': { daily: 2000000, weekly: 10000000, monthly: 40000000 },
    'aider': { daily: 500000, weekly: 2500000, monthly: 10000000 }
  };
  return limits[agentType] || { daily: 1000000, weekly: 5000000, monthly: 20000000 };
}

function getToolsForAgentType(agentType: string): string[] {
  const tools: Record<string, string[]> = {
    'claude-code': ['file-edit', 'bash', 'search', 'git'],
    'claude-code-glm': ['file-edit', 'bash', 'search', 'git'],
    'codex': ['file-edit', 'bash', 'search'],
    'gemini': ['file-edit', 'bash', 'search'],
    'amp': ['file-edit', 'bash', 'search', 'git', 'web'],
    'aider': ['file-edit', 'bash', 'search', 'git']
  };
  return tools[agentType] || ['file-edit', 'bash', 'search'];
}

function getSpawnCommand(agentType: string): string {
  const commands: Record<string, string> = {
    'claude-code': 'claude',
    'claude-code-glm': 'claude',
    'codex': 'openai',
    'gemini': 'gemini-cli',
    'amp': 'amp',
    'aider': 'aider'
  };
  return commands[agentType] || 'claude';
}

function getSpawnArgs(): string[] {
  // This would generate appropriate arguments for each agent type
  // Implementation depends on specific agent CLI requirements
  return [];
}

async function setupClaudeCodeConfig(worktree: string, agentConfig: Record<string, unknown>): Promise<void> {
  // writeFileSync, mkdirSync, join already imported

  // Create .claude directory
  const claudeDir = join(worktree, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  // Create claude config file
  const config = agentConfig as { config?: AgentConfig; type?: string };
  const claudeConfig: ClaudeConfig = {
    api_key: config?.config?.authentication.credentials?.apiKey || process['env']['ANTHROPIC_API_KEY'],
    base_url: config?.config?.baseUrl || process['env']['ANTHROPIC_BASE_URL'],
    default_model: config?.config?.model,
    timeout: 300000,
    max_tokens: config?.config?.maxTokens || 4096
  };

  // Handle GLM configuration if needed
  if (config?.type === 'claude-code-glm') {
    claudeConfig.base_url = 'https://api.z.ai/api/anthropic';
    claudeConfig.default_model = 'glm-4.6';
  }

  writeFileSync(
    join(claudeDir, 'settings.json'),
    JSON.stringify(claudeConfig, null, 2)
  );
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
    id: 'agent-' + Date.now(),
    status: 'running',
    uptime: Date.now(),
    tokenUsage: { used: 0, limit: 1000000 },
    lastActivity: new Date().toISOString()
  };
}

// Export all agent tools
export const agentTools = [
  spawnAgentTool,
  getAgentStatusTool,
  killAgentTool,
  sendMessageToAgentTool
];
