/**
 * ♫ Agent Configuration System for @dcversus/prp
 *
 * Flexible agent configuration with roles, limits, capabilities,
 * and multi-provider authentication
 */
import { EventEmitter } from 'events';

import { FileUtils, ConfigUtils, HashUtils } from '../shared';
import { createLayerLogger } from '../shared/logger';

const logger = createLayerLogger('config');
export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  role: AgentRole;
  provider: ProviderType;
  enabled: boolean;
  capabilities: AgentCapabilities;
  limits: AgentLimits;
  authentication: AgentAuthentication;
  personality: AgentPersonality;
  tools: AgentTool[];
  environment: AgentEnvironment;
  preferences: AgentPreferences;
  metadata: AgentMetadata;
  // Backwards compatibility properties for older interfaces
  description?: string;
  category?: string;
  enabledByDefault?: boolean;
  availableModels?: string[];
  defaultModel?: string;
  defaultMaxTokens?: number;
  configuration?: Record<string, unknown>;
  // Additional properties accessed by agent-manager
  roles?: AgentRole[];
  bestRole?: AgentRole;
  runCommands?: string[];
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
}
export type AgentType =
  | 'claude'
  | 'claude-code-anthropic'
  | 'claude-code-glm'
  | 'codex'
  | 'gemini'
  | 'amp'
  | 'aider'
  | 'github-copilot'
  | 'custom';
export type AgentRole =
  | 'robo-developer'
  | 'robo-system-analyst'
  | 'robo-aqa'
  | 'robo-security-expert'
  | 'robo-performance-engineer'
  | 'robo-ui-designer'
  | 'robo-devops'
  | 'robo-documenter'
  | 'orchestrator-agent'
  | 'task-agent'
  | 'specialist-agent'
  | 'conductor';
export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'groq'
  | 'ollama'
  | 'github'
  | 'custom';
export interface AgentCapabilities {
  supportsTools: boolean;
  supportsImages: boolean;
  supportsSubAgents: boolean;
  supportsParallel: boolean;
  supportsCodeExecution: boolean;
  maxContextLength: number;
  supportedModels: string[];
  supportedFileTypes: string[];
  canAccessInternet: boolean;
  canAccessFileSystem: boolean;
  canExecuteCommands: boolean;
  availableTools?: string[];
  specializations?: string[];
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentLimits {
  maxTokensPerRequest: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxCostPerDay: number;
  maxExecutionTime: number; // milliseconds
  maxMemoryUsage: number; // MB
  maxConcurrentTasks: number;
  cooldownPeriod: number; // milliseconds between requests
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentAuthentication {
  type: 'api-key' | 'oauth' | 'basic' | 'token' | 'certificate';
  credentials?: {
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
    certificate?: string;
    privateKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  headers?: Record<string, string>;
  endpoints?: {
    api?: string;
    auth?: string;
    webhook?: string;
  };
  encrypted: boolean;
  lastValidated?: Date;
  expiresAt?: Date;
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentPersonality {
  tone: 'professional' | 'friendly' | 'casual' | 'technical' | 'creative';
  language: string;
  responseStyle: 'concise' | 'detailed' | 'conversational' | 'technical';
  verbosity: 'minimal' | 'balanced' | 'detailed';
  creativity: number; // 0-1
  strictness: number; // 0-1
  proactivity: number; // 0-1
  customInstructions?: string;
  communicationStyle: {
    useEmojis: boolean;
    useFormatting: boolean;
    includeCodeBlocks: boolean;
    includeExplanations: boolean;
  };
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentTool {
  id: string;
  name: string;
  type: 'builtin' | 'custom' | 'external';
  enabled: boolean;
  configuration: Record<string, unknown>;
  permissions: string[];
  rateLimit?: {
    requestsPerMinute: number;
    cooldownMs: number;
  };
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentEnvironment {
  workingDirectory?: string;
  shell?: string;
  envVars?: Record<string, string>;
  nodeVersion?: string;
  pythonVersion?: string;
  allowedCommands?: string[];
  blockedCommands?: string[];
  networkAccess: {
    allowedDomains?: string[];
    blockedDomains?: string[];
    allowExternalRequests: boolean;
  };
  fileSystem: {
    allowedPaths?: string[];
    blockedPaths?: string[];
    maxFileSize: number; // bytes
    allowWrite: boolean;
    allowDelete: boolean;
  };
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentPreferences {
  autoSave: boolean;
  autoCommit: boolean;
  preferAsync: boolean;
  useCache: boolean;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  notifications: {
    enabled: boolean;
    types: ('error' | 'warning' | 'info' | 'success')[];
    channels: ('console' | 'file' | 'slack' | 'email')[];
  };
  git: {
    autoStage: boolean;
    commitMessageFormat: string;
    branchNaming: string;
  };
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentMetadata {
  version: string;
  author: string;
  createdAt: Date;
  lastModified: Date;
  tags: string[];
  category: string;
  description: string;
  documentation?: string;
  examples?: string[];
  dependencies: string[];
  compatibility: {
    platforms: string[];
    nodeVersions: string[];
    pythonVersions?: string[];
  };
}
// eslint-disable-next-line import/no-unused-modules
export interface AgentConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: Partial<AgentConfig>;
  variables: TemplateVariable[];
  requiredFeatures: string[];
}
// eslint-disable-next-line import/no-unused-modules
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'secret';
  description: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: unknown[];
  };
  placeholder?: string;
  helpText?: string;
}
export interface AgentConfigValidation {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}
export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}
/**
 * ♫ Agent Configuration Manager
 */
export class AgentConfigManager extends EventEmitter {
  private readonly configs = new Map<string, AgentConfig>();
  private readonly templates = new Map<string, AgentConfigTemplate>();
  private readonly configPath = '.prprc';
  constructor() {
    super();
    this.initializeDefaultTemplates();
  }
  /**
   * Load agent configuration from file
   */
  async loadConfig(configPath?: string): Promise<AgentConfig[]> {
    const path = configPath ?? this.configPath;
    try {
      const exists = await FileUtils.pathExists(path);
      if (!exists) {
        logger.info('AgentConfigManager', `No config file found at ${path}, using defaults`, {
          path,
        });
        return await this.createDefaultConfig();
      }
      const configData = await ConfigUtils.loadConfigFile<Record<string, unknown>>(path);
      if (!configData?.['agents']) {
        logger.warn('AgentConfigManager', 'Invalid config format, using defaults', { path });
        return await this.createDefaultConfig();
      }
      const agents: AgentConfig[] = [];
      const agentsArray = configData['agents'];
      if (Array.isArray(agentsArray)) {
        for (const agentData of agentsArray) {
          const agent = this.validateAndNormalizeAgent(agentData);
          if (agent) {
            this.configs.set(agent.id, agent);
            agents.push(agent);
          }
        }
      }
      logger.info('AgentConfigManager', `Loaded ${agents.length} agent configurations`, {
        count: agents.length,
        path,
      });
      this.emit('config-loaded', agents);
      return agents;
    } catch (error) {
      logger.error(
        'AgentConfigManager',
        'Failed to load configuration',
        error instanceof Error ? error : new Error(String(error)),
        { path },
      );
      return this.createDefaultConfig();
    }
  }
  /**
   * Save agent configuration to file
   */
  async saveConfig(agents: AgentConfig[], configPath?: string): Promise<void> {
    const path = configPath ?? this.configPath;
    try {
      const configData = {
        version: '1.0.0',
        agents: agents,
        templates: Array.from(this.templates.values()),
        lastModified: new Date().toISOString(),
      };
      await FileUtils.writeTextFile(path, JSON.stringify(configData, null, 2));
      logger.info('AgentConfigManager', `Saved ${agents.length} agent configurations to ${path}`, {
        count: agents.length,
        path,
      });
      this.emit('config-saved', agents);
    } catch (error) {
      logger.error(
        'AgentConfigManager',
        'Failed to save configuration',
        error instanceof Error ? error : new Error(String(error)),
        { path },
      );
      throw error;
    }
  }
  /**
   * Get agent configuration by ID
   */
  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.configs.get(agentId);
  }
  /**
   * Get all agent configurations
   */
  getAllAgentConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }
  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): AgentConfig[] {
    return this.getAllAgentConfigs().filter((agent) => agent.type === type);
  }
  /**
   * Get agents by role
   */
  getAgentsByRole(role: AgentRole): AgentConfig[] {
    return this.getAllAgentConfigs().filter((agent) => agent.role === role);
  }
  /**
   * Get enabled agents
   */
  getEnabledAgents(): AgentConfig[] {
    return this.getAllAgentConfigs().filter((agent) => agent.enabled);
  }
  /**
   * Add or update agent configuration
   */
  async setAgentConfig(agent: AgentConfig): Promise<void> {
    const validation = this.validateAgentConfig(agent);
    if (!validation.valid) {
      throw new Error(
        `Invalid agent configuration: ${validation.errors.map((e) => e.message).join(', ')}`,
      );
    }
    // Normalize and sanitize
    const normalizedAgent = this.validateAndNormalizeAgent(agent);
    if (!normalizedAgent) {
      throw new Error('Failed to normalize agent configuration');
    }
    this.configs.set(normalizedAgent.id, normalizedAgent);
    // Save to storage
    await this.saveConfig(this.getAllAgentConfigs());
    this.emit('agent-updated', normalizedAgent);
    logger.info('AgentConfigManager', `Agent configuration saved: ${normalizedAgent.id}`, {
      agentId: normalizedAgent.id,
    });
  }
  /**
   * Remove agent configuration
   */
  async removeAgentConfig(agentId: string): Promise<boolean> {
    const agent = this.configs.get(agentId);
    if (!agent) {
      return false;
    }
    this.configs.delete(agentId);
    await this.saveConfig(this.getAllAgentConfigs());
    this.emit('agent-removed', agentId);
    logger.info('AgentConfigManager', `Agent configuration removed: ${agentId}`, { agentId });
    return true;
  }
  /**
   * Enable/disable agent
   */
  async setAgentEnabled(agentId: string, enabled: boolean): Promise<boolean> {
    const agent = this.configs.get(agentId);
    if (!agent) {
      return false;
    }
    agent.enabled = enabled;
    agent.metadata.lastModified = new Date();
    await this.saveConfig(this.getAllAgentConfigs());
    this.emit('agent-toggled', { agentId, enabled });
    logger.info('AgentConfigManager', `Agent ${agentId} ${enabled ? 'enabled' : 'disabled'}`, {
      agentId,
      enabled,
    });
    return true;
  }
  /**
   * Validate agent configuration
   */
  validateAgentConfig(agent: unknown): AgentConfigValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    // Type guard for agent object
    if (!agent || typeof agent !== 'object') {
      errors.push({
        field: 'agent',
        message: 'Agent configuration must be a valid object',
        code: 'INVALID_OBJECT',
        severity: 'error',
      });
      return { valid: false, errors, warnings, suggestions };
    }
    const agentObj = agent as Record<string, unknown>;
    // Required fields
    const agentId = agentObj['id'];
    if (!agentId || typeof agentId !== 'string') {
      errors.push({
        field: 'id',
        message: 'Agent ID is required and must be a string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }
    const agentName = agentObj['name'];
    if (!agentName || typeof agentName !== 'string') {
      errors.push({
        field: 'name',
        message: 'Agent name is required and must be a string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }
    // Validate type
    const agentType = agentObj['type'];
    if (!agentType || !this.isValidAgentType(String(agentType))) {
      errors.push({
        field: 'type',
        message: `Invalid agent type: ${String(agentType ?? 'undefined')}`,
        code: 'INVALID_TYPE',
        severity: 'error',
      });
    }
    // Validate role
    const agentRole = agentObj['role'];
    if (!agentRole || !this.isValidAgentRole(String(agentRole))) {
      errors.push({
        field: 'role',
        message: `Invalid agent role: ${String(agentRole ?? 'undefined')}`,
        code: 'INVALID_ROLE',
        severity: 'error',
      });
    }
    // Validate provider
    const agentProvider = agentObj['provider'];
    if (!agentProvider || !this.isValidProviderType(String(agentProvider))) {
      errors.push({
        field: 'provider',
        message: `Invalid provider type: ${String(agentProvider ?? 'undefined')}`,
        code: 'INVALID_PROVIDER',
        severity: 'error',
      });
    }
    // Validate capabilities
    const agentCapabilities = agentObj['capabilities'];
    if (agentCapabilities && typeof agentCapabilities === 'object' && agentCapabilities !== null) {
      const capabilities = agentCapabilities as Record<string, unknown>;
      const maxContextLength = capabilities['maxContextLength'];
      if (
        typeof maxContextLength !== 'number' ||
        maxContextLength <= 0
      ) {
        errors.push({
          field: 'capabilities.maxContextLength',
          message: 'Max context length must be a positive number',
          code: 'INVALID_VALUE',
          severity: 'error',
        });
      }
      const supportsTools = capabilities['supportsTools'];
      if (
        supportsTools === true
      ) {
        const agentTools = agentObj['tools'];
        if (!agentTools || !Array.isArray(agentTools) || agentTools.length === 0) {
          warnings.push({
            field: 'tools',
            message: 'Agent supports tools but no tools are configured',
            recommendation: 'Add tools to the agent configuration',
          });
        }
      }
    }
    // Validate limits
    const agentLimits = agentObj['limits'];
    if (agentLimits && typeof agentLimits === 'object' && agentLimits !== null) {
      const limits = agentLimits as Record<string, unknown>;
      const maxTokensPerRequest = limits['maxTokensPerRequest'];
      if (typeof maxTokensPerRequest !== 'number' || maxTokensPerRequest <= 0) {
        errors.push({
          field: 'limits.maxTokensPerRequest',
          message: 'Max tokens per request must be greater than 0',
          code: 'INVALID_VALUE',
          severity: 'error',
        });
      }
      const maxCostPerDay = limits['maxCostPerDay'];
      if (typeof maxCostPerDay !== 'number' || maxCostPerDay < 0) {
        errors.push({
          field: 'limits.maxCostPerDay',
          message: 'Max cost per day cannot be negative',
          code: 'INVALID_VALUE',
          severity: 'error',
        });
      }
    }
    // Validate authentication
    const agentAuthentication = agentObj['authentication'];
    if (agentAuthentication && typeof agentAuthentication === 'object' && agentAuthentication !== null) {
      const auth = agentAuthentication as Record<string, unknown>;
      if (auth['type'] === 'api-key') {
        const credentials = auth['credentials'] as Record<string, unknown>;
        if (credentials && typeof credentials === 'object' && !credentials['apiKey']) {
          errors.push({
            field: 'authentication.credentials.apiKey',
            message: 'API key is required for api-key authentication',
            code: 'MISSING_CREDENTIALS',
            severity: 'error',
          });
        }
      }
      if (auth['encrypted'] === true && !process.env?.ENCRYPTION_KEY) {
        warnings.push({
          field: 'authentication.encrypted',
          message: 'Authentication is marked as encrypted but no encryption key is available',
          recommendation: 'Set ENCRYPTION_KEY environment variable',
        });
      }
    }
    // Suggestions
    const agentPersonality = agentObj['personality'];
    if (
      !agentPersonality ||
      typeof agentPersonality !== 'object' ||
      agentPersonality === null ||
      !(agentPersonality as Record<string, unknown>)['customInstructions']
    ) {
      suggestions.push('Consider adding custom instructions to personalize agent behavior');
    }
    const agentPreferences = agentObj['preferences'];
    if (
      (!agentPreferences ||
        typeof agentPreferences !== 'object' ||
        agentPreferences === null ||
        !(agentPreferences as Record<string, unknown>)['autoSave']) &&
      (agentObj['role'] as string) === 'robo-developer'
    ) {
      suggestions.push('Consider enabling auto-save for developer agents');
    }
    const valid = errors.length === 0;
    return {
      valid,
      errors,
      warnings,
      suggestions,
    };
  }
  /**
   * Validate and normalize agent configuration
   */
  private validateAndNormalizeAgent(agentData: unknown): AgentConfig | null {
    try {
      const validation = this.validateAgentConfig(agentData);
      if (!validation.valid) {
        const agentId = agentData && typeof agentData === 'object' && agentData !== null
          ? String((agentData as Record<string, unknown>)['id'] ?? 'unknown')
          : 'unknown';
        logger.error(
          'AgentConfigManager',
          'Invalid agent configuration',
          new Error('Validation failed'),
          {
            errors: validation.errors.map((e) => e.message).join(', '),
            agentId,
          },
        );
        return null;
      }
      if (!agentData || typeof agentData !== 'object' || agentData === null) {
        return null;
      }
      const data = agentData as Record<string, unknown>;
      // Apply defaults and normalize
      const agent: AgentConfig = {
        id: String(data['id'] ?? ''),
        name: String(data['name'] ?? ''),
        type: this.isValidAgentType(String(data['type'] ?? '')) ? (data['type'] as AgentType) : 'claude-code-anthropic',
        role: this.isValidAgentRole(String(data['role'] ?? '')) ? (data['role'] as AgentRole) : 'orchestrator-agent',
        provider: this.isValidProviderType(String(data['provider'] ?? '')) ? (data['provider'] as ProviderType) : 'anthropic',
        enabled: Boolean(data['enabled'] ?? true),
        capabilities: {
          supportsTools:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean((data['capabilities'] as Record<string, unknown>)['supportsTools'] ?? true)
              : true,
          supportsImages:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean(
                  (data['capabilities'] as Record<string, unknown>)['supportsImages'] ?? false,
                )
              : false,
          supportsSubAgents:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean(
                  (data['capabilities'] as Record<string, unknown>)['supportsSubAgents'] ?? false,
                )
              : false,
          supportsParallel:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean(
                  (data['capabilities'] as Record<string, unknown>)['supportsParallel'] ?? false,
                )
              : false,
          supportsCodeExecution:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean(
                  (data['capabilities'] as Record<string, unknown>)['supportsCodeExecution'] ??
                    false,
                )
              : false,
          maxContextLength:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Number(
                  (data['capabilities'] as Record<string, unknown>)['maxContextLength'] || 4000,
                )
              : 4000,
          supportedModels:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? ((data['capabilities'] as Record<string, unknown>)['supportedModels'] as
                  | string[]
                  | undefined) || []
              : [],
          supportedFileTypes:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? ((data['capabilities'] as Record<string, unknown>)['supportedFileTypes'] as
                  | string[]
                  | undefined) || ['*']
              : ['*'],
          canAccessInternet:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean(
                  (data['capabilities'] as Record<string, unknown>)['canAccessInternet'] || true,
                )
              : true,
          canAccessFileSystem:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean(
                  (data['capabilities'] as Record<string, unknown>)['canAccessFileSystem'] || true,
                )
              : true,
          canExecuteCommands:
            data['capabilities'] && typeof data['capabilities'] === 'object'
              ? Boolean(
                  (data['capabilities'] as Record<string, unknown>)['canExecuteCommands'] || false,
                )
              : false,
          ...((data['capabilities'] as Record<string, unknown>) || {}),
        },
        limits: {
          maxTokensPerRequest:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['maxTokensPerRequest'] || 4000)
              : 4000,
          maxRequestsPerHour:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['maxRequestsPerHour'] || 100)
              : 100,
          maxRequestsPerDay:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['maxRequestsPerDay'] || 1000)
              : 1000,
          maxCostPerDay:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['maxCostPerDay'] || 10.0)
              : 10.0,
          maxExecutionTime:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['maxExecutionTime'] || 300000)
              : 300000,
          maxMemoryUsage:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['maxMemoryUsage'] || 1024)
              : 1024,
          maxConcurrentTasks:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['maxConcurrentTasks'] || 1)
              : 1,
          cooldownPeriod:
            data['limits'] && typeof data['limits'] === 'object'
              ? Number((data['limits'] as Record<string, unknown>)['cooldownPeriod'] || 1000)
              : 1000,
          ...((data['limits'] as Record<string, unknown>) || {}),
        },
        authentication: {
          type:
            data['authentication'] && typeof data['authentication'] === 'object'
              ? ((data['authentication'] as Record<string, unknown>)['type'] as
                  | 'token'
                  | 'basic'
                  | 'certificate'
                  | 'api-key'
                  | 'oauth') || 'api-key'
              : 'api-key',
          credentials:
            data['authentication'] && typeof data['authentication'] === 'object'
              ? ((data['authentication'] as Record<string, unknown>)['credentials'] as
                  | Record<string, unknown>
                  | undefined) || {}
              : {},
          headers:
            data['authentication'] && typeof data['authentication'] === 'object'
              ? ((data['authentication'] as Record<string, unknown>)['headers'] as
                  | Record<string, string>
                  | undefined) || {}
              : {},
          endpoints:
            data['authentication'] && typeof data['authentication'] === 'object'
              ? ((data['authentication'] as Record<string, unknown>)['endpoints'] as
                  | Record<string, string>
                  | undefined) || {}
              : {},
          encrypted:
            data['authentication'] && typeof data['authentication'] === 'object'
              ? Boolean((data['authentication'] as Record<string, unknown>)['encrypted'] || false)
              : false,
          ...((data['authentication'] as Record<string, unknown>) || {}),
        },
        personality: {
          tone:
            data['personality'] && typeof data['personality'] === 'object'
              ? (((data['personality'] as Record<string, unknown>)['tone'] as
                  | 'professional'
                  | 'friendly'
                  | 'casual'
                  | 'technical'
                  | 'creative') ?? 'professional')
              : 'professional',
          language:
            data['personality'] && typeof data['personality'] === 'object'
              ? (((data['personality'] as Record<string, unknown>)['language'] as string) ?? 'en')
              : 'en',
          responseStyle:
            data['personality'] && typeof data['personality'] === 'object'
              ? (((data['personality'] as Record<string, unknown>)['responseStyle'] as
                  | 'technical'
                  | 'concise'
                  | 'detailed'
                  | 'conversational') ?? 'detailed')
              : 'detailed',
          verbosity:
            data['personality'] && typeof data['personality'] === 'object'
              ? (((data['personality'] as Record<string, unknown>)['verbosity'] as
                  | 'minimal'
                  | 'detailed'
                  | 'balanced') ?? 'balanced')
              : 'balanced',
          creativity:
            data['personality'] && typeof data['personality'] === 'object'
              ? Number((data['personality'] as Record<string, unknown>)['creativity'] ?? 0.7)
              : 0.7,
          strictness:
            data['personality'] && typeof data['personality'] === 'object'
              ? Number((data['personality'] as Record<string, unknown>)['strictness'] ?? 0.5)
              : 0.5,
          proactivity:
            data['personality'] && typeof data['personality'] === 'object'
              ? Number((data['personality'] as Record<string, unknown>)['proactivity'] ?? 0.3)
              : 0.3,
          customInstructions:
            data['personality'] && typeof data['personality'] === 'object'
              ? (((data['personality'] as Record<string, unknown>)[
                  'customInstructions'
                ] as string) ?? '')
              : '',
          communicationStyle: {
            useEmojis:
              data['personality'] &&
              typeof data['personality'] === 'object' &&
              (data['personality'] as Record<string, unknown>)['communicationStyle'] &&
              typeof (data['personality'] as Record<string, unknown>)['communicationStyle'] ===
                'object'
                ? Boolean(
                    (
                      (data['personality'] as Record<string, unknown>)[
                        'communicationStyle'
                      ] as Record<string, unknown>
                    )['useEmojis'] ?? false,
                  )
                : false,
            useFormatting:
              data['personality'] &&
              typeof data['personality'] === 'object' &&
              (data['personality'] as Record<string, unknown>)['communicationStyle'] &&
              typeof (data['personality'] as Record<string, unknown>)['communicationStyle'] ===
                'object'
                ? Boolean(
                    (
                      (data['personality'] as Record<string, unknown>)[
                        'communicationStyle'
                      ] as Record<string, unknown>
                    )['useFormatting'] ?? true,
                  )
                : true,
            includeCodeBlocks:
              data['personality'] &&
              typeof data['personality'] === 'object' &&
              (data['personality'] as Record<string, unknown>)['communicationStyle'] &&
              typeof (data['personality'] as Record<string, unknown>)['communicationStyle'] ===
                'object'
                ? Boolean(
                    (
                      (data['personality'] as Record<string, unknown>)[
                        'communicationStyle'
                      ] as Record<string, unknown>
                    )['includeCodeBlocks'] ?? true,
                  )
                : true,
            includeExplanations:
              data['personality'] &&
              typeof data['personality'] === 'object' &&
              (data['personality'] as Record<string, unknown>)['communicationStyle'] &&
              typeof (data['personality'] as Record<string, unknown>)['communicationStyle'] ===
                'object'
                ? Boolean(
                    (
                      (data['personality'] as Record<string, unknown>)[
                        'communicationStyle'
                      ] as Record<string, unknown>
                    )['includeExplanations'] ?? true,
                  )
                : true,
            ...(data['personality'] && typeof data['personality'] === 'object'
              ? ((data['personality'] as Record<string, unknown>)['communicationStyle'] as Record<
                  string,
                  unknown
                >) || {}
              : {}),
          },
          ...((data['personality'] as Record<string, unknown>) ?? {}),
        },
        tools: Array.isArray(data['tools']) ? (data['tools'] as AgentTool[]) : [],
        environment: {
          workingDirectory:
            data['environment'] && typeof data['environment'] === 'object'
              ? (((data['environment'] as Record<string, unknown>)['workingDirectory'] as string) ??
                process.cwd())
              : process.cwd(),
          shell:
            data['environment'] && typeof data['environment'] === 'object'
              ? (((data['environment'] as Record<string, unknown>)['shell'] as string) ??
                '/bin/bash')
              : '/bin/bash',
          envVars:
            data['environment'] && typeof data['environment'] === 'object'
              ? (((data['environment'] as Record<string, unknown>)['envVars'] as
                  | Record<string, string>
                  | undefined) ?? {})
              : {},
          nodeVersion:
            data['environment'] && typeof data['environment'] === 'object'
              ? (((data['environment'] as Record<string, unknown>)['nodeVersion'] as string) ??
                '18')
              : '18',
          pythonVersion:
            data['environment'] && typeof data['environment'] === 'object'
              ? (((data['environment'] as Record<string, unknown>)['pythonVersion'] as string) ??
                '3.9')
              : '3.9',
          allowedCommands:
            data['environment'] && typeof data['environment'] === 'object'
              ? (((data['environment'] as Record<string, unknown>)['allowedCommands'] as
                  | string[]
                  | undefined) ?? [])
              : [],
          blockedCommands:
            data['environment'] && typeof data['environment'] === 'object'
              ? (((data['environment'] as Record<string, unknown>)['blockedCommands'] as
                  | string[]
                  | undefined) ?? ['rm -rf', 'sudo', 'chmod 777'])
              : ['rm -rf', 'sudo', 'chmod 777'],
          networkAccess: {
            allowedDomains:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['networkAccess'] &&
              typeof (data['environment'] as Record<string, unknown>)['networkAccess'] === 'object'
                ? (((
                    (data['environment'] as Record<string, unknown>)['networkAccess'] as Record<
                      string,
                      unknown
                    >
                  )['allowedDomains'] as string[] | undefined) ?? [])
                : [],
            blockedDomains:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['networkAccess'] &&
              typeof (data['environment'] as Record<string, unknown>)['networkAccess'] === 'object'
                ? (((
                    (data['environment'] as Record<string, unknown>)['networkAccess'] as Record<
                      string,
                      unknown
                    >
                  )['blockedDomains'] as string[] | undefined) ?? [])
                : [],
            allowExternalRequests:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['networkAccess'] &&
              typeof (data['environment'] as Record<string, unknown>)['networkAccess'] === 'object'
                ? Boolean(
                    (
                      (data['environment'] as Record<string, unknown>)['networkAccess'] as Record<
                        string,
                        unknown
                      >
                    )['allowExternalRequests'] ?? true,
                  )
                : true,
            ...(data['environment'] && typeof data['environment'] === 'object'
              ? ((data['environment'] as Record<string, unknown>)['networkAccess'] as Record<
                  string,
                  unknown
                >) || {}
              : {}),
          },
          fileSystem: {
            allowedPaths:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['fileSystem'] &&
              typeof (data['environment'] as Record<string, unknown>)['fileSystem'] === 'object'
                ? (((
                    (data['environment'] as Record<string, unknown>)['fileSystem'] as Record<
                      string,
                      unknown
                    >
                  )['allowedPaths'] as string[] | undefined) ?? [])
                : [],
            blockedPaths:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['fileSystem'] &&
              typeof (data['environment'] as Record<string, unknown>)['fileSystem'] === 'object'
                ? (((
                    (data['environment'] as Record<string, unknown>)['fileSystem'] as Record<
                      string,
                      unknown
                    >
                  )['blockedPaths'] as string[] | undefined) ?? ['/etc', '/usr/bin', '/bin'])
                : ['/etc', '/usr/bin', '/bin'],
            maxFileSize:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['fileSystem'] &&
              typeof (data['environment'] as Record<string, unknown>)['fileSystem'] === 'object'
                ? Number(
                    (
                      (data['environment'] as Record<string, unknown>)['fileSystem'] as Record<
                        string,
                        unknown
                      >
                    )['maxFileSize'] ?? 10485760,
                  )
                : 10485760,
            allowWrite:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['fileSystem'] &&
              typeof (data['environment'] as Record<string, unknown>)['fileSystem'] === 'object'
                ? Boolean(
                    (
                      (data['environment'] as Record<string, unknown>)['fileSystem'] as Record<
                        string,
                        unknown
                      >
                    )['allowWrite'] ?? true,
                  )
                : true,
            allowDelete:
              data['environment'] &&
              typeof data['environment'] === 'object' &&
              (data['environment'] as Record<string, unknown>)['fileSystem'] &&
              typeof (data['environment'] as Record<string, unknown>)['fileSystem'] === 'object'
                ? Boolean(
                    (
                      (data['environment'] as Record<string, unknown>)['fileSystem'] as Record<
                        string,
                        unknown
                      >
                    )['allowDelete'] ?? false,
                  )
                : false,
            ...(data['environment'] && typeof data['environment'] === 'object'
              ? ((data['environment'] as Record<string, unknown>)['fileSystem'] as Record<
                  string,
                  unknown
                >) || {}
              : {}),
          },
          ...((data['environment'] as Record<string, unknown>) ?? {}),
        },
        preferences: {
          autoSave:
            data['preferences'] && typeof data['preferences'] === 'object'
              ? Boolean((data['preferences'] as Record<string, unknown>)['autoSave'] ?? true)
              : true,
          autoCommit:
            data['preferences'] && typeof data['preferences'] === 'object'
              ? Boolean((data['preferences'] as Record<string, unknown>)['autoCommit'] ?? false)
              : false,
          preferAsync:
            data['preferences'] && typeof data['preferences'] === 'object'
              ? Boolean((data['preferences'] as Record<string, unknown>)['preferAsync'] ?? true)
              : true,
          useCache:
            data['preferences'] && typeof data['preferences'] === 'object'
              ? Boolean((data['preferences'] as Record<string, unknown>)['useCache'] ?? true)
              : true,
          debugMode:
            data['preferences'] && typeof data['preferences'] === 'object'
              ? Boolean((data['preferences'] as Record<string, unknown>)['debugMode'] ?? false)
              : false,
          logLevel:
            data['preferences'] && typeof data['preferences'] === 'object'
              ? (((data['preferences'] as Record<string, unknown>)['logLevel'] as
                  | 'error'
                  | 'debug'
                  | 'info'
                  | 'warn') ?? 'info')
              : 'info',
          notifications: {
            enabled:
              data['preferences'] &&
              typeof data['preferences'] === 'object' &&
              (data['preferences'] as Record<string, unknown>)['notifications'] &&
              typeof (data['preferences'] as Record<string, unknown>)['notifications'] === 'object'
                ? Boolean(
                    (
                      (data['preferences'] as Record<string, unknown>)['notifications'] as Record<
                        string,
                        unknown
                      >
                    )['enabled'] ?? true,
                  )
                : true,
            types:
              data['preferences'] &&
              typeof data['preferences'] === 'object' &&
              (data['preferences'] as Record<string, unknown>)['notifications'] &&
              typeof (data['preferences'] as Record<string, unknown>)['notifications'] === 'object'
                ? (((
                    (data['preferences'] as Record<string, unknown>)['notifications'] as Record<
                      string,
                      unknown
                    >
                  )['types'] as ('error' | 'info' | 'success' | 'warning')[] | undefined) ?? [
                    'error',
                    'warning',
                  ])
                : ['error', 'warning'],
            channels:
              data['preferences'] &&
              typeof data['preferences'] === 'object' &&
              (data['preferences'] as Record<string, unknown>)['notifications'] &&
              typeof (data['preferences'] as Record<string, unknown>)['notifications'] === 'object'
                ? (((
                    (data['preferences'] as Record<string, unknown>)['notifications'] as Record<
                      string,
                      unknown
                    >
                  )['channels'] as ('file' | 'console' | 'email' | 'slack')[] | undefined) ?? [
                    'console',
                  ])
                : ['console'],
            ...(data['preferences'] && typeof data['preferences'] === 'object'
              ? ((data['preferences'] as Record<string, unknown>)['notifications'] as Record<
                  string,
                  unknown
                >) || {}
              : {}),
          },
          git: {
            autoStage:
              data['preferences'] &&
              typeof data['preferences'] === 'object' &&
              (data['preferences'] as Record<string, unknown>)['git'] &&
              typeof (data['preferences'] as Record<string, unknown>)['git'] === 'object'
                ? Boolean(
                    (
                      (data['preferences'] as Record<string, unknown>)['git'] as Record<
                        string,
                        unknown
                      >
                    )['autoStage'] ?? true,
                  )
                : true,
            commitMessageFormat:
              data['preferences'] &&
              typeof data['preferences'] === 'object' &&
              (data['preferences'] as Record<string, unknown>)['git'] &&
              typeof (data['preferences'] as Record<string, unknown>)['git'] === 'object'
                ? (((
                    (data['preferences'] as Record<string, unknown>)['git'] as Record<
                      string,
                      unknown
                    >
                  )['commitMessageFormat'] as string | undefined) ?? 'feat: {description}')
                : 'feat: {description}',
            branchNaming:
              data['preferences'] &&
              typeof data['preferences'] === 'object' &&
              (data['preferences'] as Record<string, unknown>)['git'] &&
              typeof (data['preferences'] as Record<string, unknown>)['git'] === 'object'
                ? (((
                    (data['preferences'] as Record<string, unknown>)['git'] as Record<
                      string,
                      unknown
                    >
                  )['branchNaming'] as string | undefined) ?? 'feature/{name}')
                : 'feature/{name}',
            ...(data['preferences'] && typeof data['preferences'] === 'object'
              ? ((data['preferences'] as Record<string, unknown>)['git'] as Record<
                  string,
                  unknown
                >) || {}
              : {}),
          },
          ...((data['preferences'] as Record<string, unknown>) ?? {}),
        },
        metadata: {
          version:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['version'] as string) ?? '1.0.0')
              : '1.0.0',
          author:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['author'] as string) ?? 'system')
              : 'system',
          createdAt:
            data['metadata'] &&
            typeof data['metadata'] === 'object' &&
            (data['metadata'] as Record<string, unknown>)['createdAt']
              ? new Date(String((data['metadata'] as Record<string, unknown>)['createdAt']))
              : new Date(),
          lastModified: new Date(),
          tags:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['tags'] as string[] | undefined) ??
                [])
              : [],
          category:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['category'] as string) ?? 'general')
              : 'general',
          description:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['description'] as string) ?? '')
              : '',
          documentation:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['documentation'] as string) ?? '')
              : '',
          examples:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['examples'] as
                  | string[]
                  | undefined) ?? [])
              : [],
          dependencies:
            data['metadata'] && typeof data['metadata'] === 'object'
              ? (((data['metadata'] as Record<string, unknown>)['dependencies'] as
                  | string[]
                  | undefined) ?? [])
              : [],
          compatibility: {
            platforms:
              data['metadata'] &&
              typeof data['metadata'] === 'object' &&
              (data['metadata'] as Record<string, unknown>)['compatibility'] &&
              typeof (data['metadata'] as Record<string, unknown>)['compatibility'] === 'object'
                ? (((
                    (data['metadata'] as Record<string, unknown>)['compatibility'] as Record<
                      string,
                      unknown
                    >
                  )['platforms'] as string[] | undefined) ?? ['linux', 'macos', 'windows'])
                : ['linux', 'macos', 'windows'],
            nodeVersions:
              data['metadata'] &&
              typeof data['metadata'] === 'object' &&
              (data['metadata'] as Record<string, unknown>)['compatibility'] &&
              typeof (data['metadata'] as Record<string, unknown>)['compatibility'] === 'object'
                ? (((
                    (data['metadata'] as Record<string, unknown>)['compatibility'] as Record<
                      string,
                      unknown
                    >
                  )['nodeVersions'] as string[] | undefined) ?? ['16', '18', '20'])
                : ['16', '18', '20'],
            pythonVersions:
              data['metadata'] &&
              typeof data['metadata'] === 'object' &&
              (data['metadata'] as Record<string, unknown>)['compatibility'] &&
              typeof (data['metadata'] as Record<string, unknown>)['compatibility'] === 'object'
                ? (((
                    (data['metadata'] as Record<string, unknown>)['compatibility'] as Record<
                      string,
                      unknown
                    >
                  )['pythonVersions'] as string[] | undefined) ?? ['3.8', '3.9', '3.10', '3.11'])
                : ['3.8', '3.9', '3.10', '3.11'],
            ...(data['metadata'] && typeof data['metadata'] === 'object'
              ? ((data['metadata'] as Record<string, unknown>)['compatibility'] as Record<
                  string,
                  unknown
                >) || {}
              : {}),
          },
          ...((data['metadata'] as Record<string, unknown>) || {}),
        },
      };
      return agent;
    } catch (error) {
      const agentId =
        agentData && typeof agentData === 'object'
          ? (agentData as Record<string, unknown>)['id']
          : 'unknown';
      logger.error(
        'AgentConfigManager',
        'Failed to validate agent',
        error instanceof Error ? error : new Error(String(error)),
        { agentId: String(agentId) },
      );
      return null;
    }
  }
  /**
   * Check if agent type is valid
   */
  private isValidAgentType(type: string): type is AgentType {
    const validTypes: AgentType[] = [
      'claude-code-anthropic',
      'claude-code-glm',
      'codex',
      'gemini',
      'amp',
      'aider',
      'github-copilot',
      'custom',
    ];
    return validTypes.includes(type as AgentType);
  }
  /**
   * Check if agent role is valid
   */
  private isValidAgentRole(role: string): role is AgentRole {
    const validRoles: AgentRole[] = [
      'robo-developer',
      'robo-system-analyst',
      'robo-aqa',
      'robo-security-expert',
      'robo-performance-engineer',
      'robo-ui-designer',
      'robo-devops',
      'robo-documenter',
      'orchestrator-agent',
      'task-agent',
      'specialist-agent',
      'conductor',
    ];
    return validRoles.includes(role as AgentRole);
  }
  /**
   * Check if provider type is valid
   */
  private isValidProviderType(provider: string): provider is ProviderType {
    const validProviders: ProviderType[] = [
      'anthropic',
      'openai',
      'google',
      'groq',
      'ollama',
      'github',
      'custom',
    ];
    return validProviders.includes(provider as ProviderType);
  }
  /**
   * Create default configuration
   */
  private async createDefaultConfig(): Promise<AgentConfig[]> {
    logger.info('AgentConfigManager', 'Creating default agent configuration', {
      timestamp: new Date().toISOString(),
    });
    const defaultAgents: AgentConfig[] = [
      {
        id: 'claude-code-anthropic-main',
        name: 'Claude Code Anthropic',
        type: 'claude-code-anthropic',
        role: 'orchestrator-agent',
        provider: 'anthropic',
        enabled: true,
        capabilities: {
          supportsTools: true,
          supportsImages: true,
          supportsSubAgents: true,
          supportsParallel: false,
          supportsCodeExecution: false,
          maxContextLength: 200000,
          supportedModels: ['claude-3-5-sonnet-20241022'],
          supportedFileTypes: ['*'],
          canAccessInternet: true,
          canAccessFileSystem: true,
          canExecuteCommands: false,
        },
        limits: {
          maxTokensPerRequest: 100000,
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 500,
          maxCostPerDay: 50.0,
          maxExecutionTime: 600000, // 10 minutes
          maxMemoryUsage: 2048, // 2GB
          maxConcurrentTasks: 3,
          cooldownPeriod: 2000, // 2 seconds
        },
        authentication: {
          type: 'api-key',
          credentials: {
            apiKey: process['env']['ANTHROPIC_API_KEY'] ?? '',
          },
          encrypted: true,
        },
        personality: {
          tone: 'professional',
          language: 'en',
          responseStyle: 'detailed',
          verbosity: 'balanced',
          creativity: 0.7,
          strictness: 0.6,
          proactivity: 0.4,
          customInstructions:
            'You are Claude Code, an AI assistant specialized in software development.',
          communicationStyle: {
            useEmojis: false,
            useFormatting: true,
            includeCodeBlocks: true,
            includeExplanations: true,
          },
        },
        tools: [
          {
            id: 'file-reader',
            name: 'File Reader',
            type: 'builtin',
            enabled: true,
            configuration: {},
            permissions: ['read'],
          },
          {
            id: 'file-writer',
            name: 'File Writer',
            type: 'builtin',
            enabled: true,
            configuration: {},
            permissions: ['write'],
          },
        ],
        environment: {
          workingDirectory: process.cwd(),
          shell: '/bin/bash',
          envVars: {},
          nodeVersion: '18',
          pythonVersion: '3.9',
          allowedCommands: ['git', 'npm', 'node', 'python', 'ls', 'cat', 'grep'],
          blockedCommands: ['rm -rf', 'sudo', 'chmod 777', 'dd'],
          networkAccess: {
            allowedDomains: [],
            blockedDomains: [],
            allowExternalRequests: true,
          },
          fileSystem: {
            allowedPaths: [],
            blockedPaths: ['/etc', '/usr/bin', '/bin', '/sbin'],
            maxFileSize: 10485760, // 10MB
            allowWrite: true,
            allowDelete: false,
          },
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
            channels: ['console'],
          },
          git: {
            autoStage: true,
            commitMessageFormat: 'feat: {description}',
            branchNaming: 'feature/{name}',
          },
        },
        metadata: {
          version: '1.0.0',
          author: 'system',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['default', 'anthropic', 'claude', 'orchestrator'],
          category: 'ai-assistant',
          description: 'Main Claude Code agent for orchestration and development tasks',
          documentation: '',
          examples: [],
          dependencies: [],
          compatibility: {
            platforms: ['linux', 'macos', 'windows'],
            nodeVersions: ['16', '18', '20'],
            pythonVersions: ['3.8', '3.9', '3.10', '3.11'],
          },
        },
      },
    ];
    // Save default configuration
    await this.saveConfig(defaultAgents);
    return defaultAgents;
  }
  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // Claude Code Anthropic template
    this.templates.set('claude-code-anthropic', {
      id: 'claude-code-anthropic',
      name: 'Claude Code Anthropic Template',
      description: 'Template for Claude Code Anthropic agents',
      category: 'ai-assistant',
      template: {
        type: 'claude-code-anthropic',
        provider: 'anthropic',
        role: '{{role}}' as AgentRole,
        capabilities: {
          supportsTools: true,
          supportsImages: true,
          supportsSubAgents: true,
          supportsParallel: false,
          supportsCodeExecution: false,
          maxContextLength: 200000,
          supportedModels: ['claude-3-5-sonnet-20241022'],
          supportedFileTypes: ['*'],
          canAccessInternet: true,
          canAccessFileSystem: true,
          canExecuteCommands: false,
        },
        authentication: {
          type: 'api-key',
          credentials: {
            apiKey: '{{apiKey}}',
          },
          encrypted: true,
        },
      },
      variables: [
        {
          name: 'apiKey',
          type: 'secret',
          description: 'Anthropic API key',
          required: true,
          placeholder: 'sk-ant-...',
        },
        {
          name: 'role',
          type: 'string',
          description: 'Agent role',
          required: true,
          defaultValue: 'orchestrator-agent',
          validation: {
            options: ['orchestrator-agent', 'task-agent', 'specialist-agent', 'robo-developer'],
          },
        },
      ],
      requiredFeatures: ['anthropic-api-access'],
    });
    logger.debug('AgentConfigManager', 'Default templates initialized', {
      templateCount: this.templates.size,
    });
  }
  /**
   * Get configuration template
   */
  getTemplate(templateId: string): AgentConfigTemplate | undefined {
    return this.templates.get(templateId);
  }
  /**
   * Get all templates
   */
  getAllTemplates(): AgentConfigTemplate[] {
    return Array.from(this.templates.values());
  }
  /**
   * Create agent from template
   */
  createAgentFromTemplate(
    templateId: string,
    variables: Record<string, unknown>,
  ): AgentConfig | null {
    const template = this.templates.get(templateId);
    if (!template) {
      logger.error(
        'AgentConfigManager',
        `Template not found: ${templateId}`,
        new Error(`Template not found: ${templateId}`),
        { templateId },
      );
      return null;
    }
    // Validate variables
    for (const variable of template.variables) {
      if (variable.required && !variables[variable.name]) {
        logger.error(
          'AgentConfigManager',
          'Required variable missing',
          new Error('Template validation failed'),
          {
            templateId,
            variableName: variable.name,
          },
        );
        return null;
      }
    }
    // Apply template with variables
    const agentId = HashUtils.generateId();
    const agentData = {
      id: agentId,
      name: `${template.name} - ${agentId.slice(0, 8)}`,
      ...template.template,
      metadata: {
        ...template.template.metadata,
        createdAt: new Date(),
        lastModified: new Date(),
      },
    };
    // Replace template variables
    const agentJson = JSON.stringify(agentData);
    const replacedJson = agentJson.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
    const agent = JSON.parse(replacedJson);
    return this.validateAndNormalizeAgent(agent);
  }
}
// Global instance
export const agentConfigManager = new AgentConfigManager();
export default AgentConfigManager;
