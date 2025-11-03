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
    supportsImages: false,
    supportsSubAgents: false,
    supportsParallel: false,
    supportsCodeExecution: false,
    maxContextLength: 200000,
    supportedModels: [],
    supportedFileTypes: ['*'],
    canAccessInternet: true,
    canAccessFileSystem: true,
    canExecuteCommands: false
  },
  limits: {
    maxTokensPerRequest: 4000,
    maxRequestsPerHour: 60,
    maxRequestsPerDay: 1000,
    maxCostPerDay: 10.0,
    maxExecutionTime: 300000,
    maxMemoryUsage: 1024,
    maxConcurrentTasks: 1,
    cooldownPeriod: 1000
  },
  authentication: {
    type: 'api-key',
    credentials: {},
    headers: {},
    endpoints: {},
    encrypted: false
  },
  personality: {
    tone: 'professional',
    language: 'en',
    responseStyle: 'detailed',
    verbosity: 'balanced',
    creativity: 0.7,
    strictness: 0.5,
    proactivity: 0.3,
    customInstructions: '',
    communicationStyle: {
      useEmojis: false,
      useFormatting: true,
      includeCodeBlocks: true,
      includeExplanations: true
    }
  },
  tools: [],
  environment: {
    workingDirectory: process.cwd(),
    shell: '/bin/bash',
    envVars: {},
    nodeVersion: '18',
    pythonVersion: '3.9',
    allowedCommands: [],
    blockedCommands: ['rm -rf', 'sudo', 'chmod 777'],
    networkAccess: {
      allowedDomains: [],
      blockedDomains: [],
      allowExternalRequests: true
    },
    fileSystem: {
      allowedPaths: [],
      blockedPaths: ['/etc', '/usr/bin', '/bin'],
      maxFileSize: 10485760,
      allowWrite: true,
      allowDelete: false
    }
  },
  preferences: {
    autoSave: true,
    autoCommit: false,
    preferAsync: true,
    useCache: true,
    debugMode: false,
    logLevel: 'info',
    notifications: {
      enabled: true,
      types: ['error', 'warning'],
      channels: ['console']
    },
    git: {
      autoStage: true,
      commitMessageFormat: 'feat: {description}',
      branchNaming: 'feature/{name}'
    }
  },
  metadata: {
    version: '1.0.0',
    author: 'system',
    createdAt: new Date(),
    lastModified: new Date(),
    tags: [],
    category: 'general',
    description: '',
    documentation: '',
    examples: [],
    dependencies: [],
    compatibility: {
      platforms: ['linux', 'macos', 'windows'],
      nodeVersions: ['16', '18', '20'],
      pythonVersions: ['3.8', '3.9', '3.10', '3.11']
    }
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