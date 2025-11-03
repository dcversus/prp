/**
 * ♫ Agent Configuration for @dcversus/prp
 *
 * Configuration types and utilities for AI agents.
 */

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  credentials?: {
    token?: string;
    apiKey?: string;
    [key: string]: unknown;
  };
}

export interface AgentRegistry {
  agents: Record<string, AgentConfig>;
  defaultAgents: string[];
  configurations: Record<string, Partial<AgentConfig>>;
}

export const defaultAgentConfig: AgentConfig = {
  id: 'default',
  name: 'Default Agent',
  type: 'claude-code',
  enabled: true,
  model: 'claude-3-sonnet-20240229',
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 30000
};

export function createAgentConfig(config: Partial<AgentConfig>): AgentConfig {
  return {
    ...defaultAgentConfig,
    ...config,
    id: config.id || `agent-${Date.now()}`
  };
}

export function validateAgentConfig(config: AgentConfig): boolean {
  return !!(config.id && config.name && config.type);
}