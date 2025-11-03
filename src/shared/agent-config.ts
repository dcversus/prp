/**
 * ♫ Agent Configuration for @dcversus/prp
 *
 * Configuration types and utilities for AI agents.
 */

// AgentConfig is imported from src/config/agent-config.ts to avoid duplication
export type AgentConfig = import('../config/agent-config.js').AgentConfig;

export interface AgentRegistry {
  agents: Record<string, AgentConfig>;
  defaultAgents: string[];
  configurations: Record<string, Partial<AgentConfig>>;
}

export const defaultAgentConfig: AgentConfig = {
  id: 'default',
  name: 'Default Agent',
  type: 'claude-code-anthropic',
  role: 'robo-developer',
  provider: 'anthropic',
  enabled: true,
  capabilities: {
    supportsTools: true,
    supportsMCP: true,
    supportsFileOperations: true,
    supportsGitOperations: true,
    supportsCodeGeneration: true,
    supportsCodeReview: true,
    supportsTesting: true,
    supportsDocumentation: true,
    supportsDebugging: true,
    supportsRefactoring: true
  },
  limits: {
    maxTokens: 4000,
    maxRequestsPerMinute: 60,
    maxCostPerHour: 10.0,
    maxContextLength: 200000
  },
  authentication: {
    type: 'api-key',
    apiKey: '',
    organization: ''
  },
  personality: {
    style: 'professional',
    verbosity: 'balanced',
    creativity: 'moderate',
    friendliness: 'moderate'
  },
  tools: [],
  environment: {
    nodeVersion: '>=18.0.0',
    workingDirectory: process.cwd(),
    environmentVariables: {}
  },
  preferences: {
    language: 'typescript',
    framework: 'react',
    codeStyle: 'eslint',
    testingFramework: 'jest'
  },
  metadata: {
    version: '1.0.0',
    lastUpdated: new Date(),
    createdBy: 'system'
  }
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