/**
 * ♫ Configuration Management for @dcversus/prp
 *
 * Centralized configuration system with validation and defaults.
 */

import { StorageConfig, GuidelineConfig, TUIState, AgentRole } from './types';
import type { AgentConfig } from '../config/agent-config';
import { ConfigUtils, FileUtils, Validator } from './utils';
import { logger } from './logger';
import { dirname } from 'path';

// SettingsConfig for backwards compatibility
export interface SettingsConfig {
  debug?: any;
  quality?: any;
  build?: any;
  test?: any;
  ci?: any;
  development?: any;
  packageManager?: any;
}

export interface PRPConfig extends Record<string, unknown> {
  // Basic project information
  version: string;
  name?: string;
  description?: string;
  author?: string;
  license?: string;
  type?: string; // Project type for template selection

  // Core system configuration
  storage: StorageConfig;
  agents: AgentConfig[];
  guidelines: GuidelineConfig[];
  signals: any;
  orchestrator: any;
  scanner: any;
  inspector: any;

  // TUI configuration
  tui: TUIState;

  // Feature flags
  features: {
    scanner: boolean;
    inspector: boolean;
    orchestrator: boolean;
    tui: boolean;
    mcp: boolean;
    worktrees: boolean;
  };

  // System limits
  limits: {
    maxConcurrentAgents: number;
    maxWorktrees: number;
    maxPRPsPerWorktree: number;
    tokenAlertThreshold: number;
    tokenCriticalThreshold: number;
  };

  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFileLogging: boolean;
    enableTokenTracking: boolean;
    enablePerformanceTracking: boolean;
    logRetentionDays: number;
  };

  // Security settings
  security: {
    enablePinProtection: boolean;
    encryptSecrets: boolean;
    sessionTimeout: number;
  };

  // Settings for backwards compatibility
  settings: SettingsConfig;

  // Optional scripts
  scripts?: Record<string, string>;
}

export interface ConfigExportData {
  config: Partial<PRPConfig>;
  exportedAt: string;
  version: string;
}

export const DEFAULT_CONFIG: PRPConfig = {
  // Basic project information
  version: '1.0.0',
  name: undefined,
  description: undefined,
  author: undefined,
  license: undefined,
  type: undefined,

  // Core system configuration
  storage: {
    dataDir: '.prp',
    cacheDir: '/tmp/prp-cache',
    worktreesDir: '/tmp/prp-worktrees',
    notesDir: '.prp/notes',
    logsDir: '/tmp/prp-logs',
    keychainFile: '.prp/keychain.json',
    persistFile: '.prp/state.json',
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  agents: [],
  guidelines: [],
  signals: {},
  orchestrator: {},
  scanner: {},
  inspector: {},

  // TUI configuration
  tui: {
    mode: 'cli',
    activeScreen: 'main',
    followEvents: true,
    autoRefresh: true,
    refreshInterval: 5000,
  },

  // Feature flags
  features: {
    scanner: true,
    inspector: true,
    orchestrator: true,
    tui: true,
    mcp: true,
    worktrees: true,
  },

  // System limits
  limits: {
    maxConcurrentAgents: 5,
    maxWorktrees: 50,
    maxPRPsPerWorktree: 20,
    tokenAlertThreshold: 0.8,
    tokenCriticalThreshold: 0.95,
  },

  // Logging configuration
  logging: {
    level: 'info',
    enableFileLogging: true,
    enableTokenTracking: true,
    enablePerformanceTracking: true,
    logRetentionDays: 7,
  },

  // Security settings
  security: {
    enablePinProtection: false,
    encryptSecrets: true,
    sessionTimeout: 60, // 1 hour
  },

  // Settings for backwards compatibility
  settings: {},

  // Optional scripts
  scripts: undefined,
};

/**
 * ♫ Configuration Manager
 */
export class ConfigManager {
  private config: PRPConfig;
  private configPath: string;

  constructor(configPath: string = '.prprc') {
    this.configPath = configPath;
    this.config = { ...DEFAULT_CONFIG };
  }

  async load(): Promise<PRPConfig> {
    try {
      const exists = await FileUtils.pathExists(this.configPath);
      if (exists) {
        const userConfig = await ConfigUtils.loadConfigFile<Partial<PRPConfig>>(this.configPath);
        if (userConfig) {
          this.config = ConfigUtils.mergeDeep(DEFAULT_CONFIG, userConfig as Record<string, unknown>) as PRPConfig;
          this.validate();
          logger.info('shared', 'ConfigManager', 'Configuration loaded successfully', { configPath: this.configPath });
        }
      } else {
        logger.warn('shared', 'ConfigManager', `Config file not found: ${this.configPath}, using defaults`, { path: this.configPath });
      }
    } catch (error) {
      logger.error('shared', 'ConfigManager', 'Failed to load configuration', error instanceof Error ? error : new Error(String(error)), { configPath: this.configPath });
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }

    return this.config;
  }

  async save(): Promise<void> {
    try {
      await FileUtils.ensureDir(dirname(this.configPath));
      await ConfigUtils.saveConfigFile(this.configPath, this.config);
      logger.info('shared', 'ConfigManager', 'Configuration saved successfully', { configPath: this.configPath });
    } catch (error) {
      logger.error('shared', 'ConfigManager', 'Failed to save configuration', error instanceof Error ? error : new Error(String(error)), { configPath: this.configPath });
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  get(): PRPConfig {
    return { ...this.config };
  }

  update(updates: Partial<PRPConfig>): void {
    this.config = ConfigUtils.mergeDeep(this.config, updates as Record<string, unknown>) as PRPConfig;
    this.validate();
  }

  addAgent(agent: AgentConfig): void {
    if (!this.isValidAgent(agent)) {
      throw new Error(`Invalid agent configuration: ${agent.id}`);
    }

    const existingIndex = this.config.agents.findIndex(a => a.id === agent.id);
    if (existingIndex >= 0) {
      this.config.agents[existingIndex] = agent;
    } else {
      this.config.agents.push(agent);
    }

    logger.info('shared', 'ConfigManager', `Agent ${agent.id} added/updated`, { agentId: agent.id });
  }

  removeAgent(agentId: string): boolean {
    const index = this.config.agents.findIndex(a => a.id === agentId);
    if (index >= 0) {
      this.config.agents.splice(index, 1);
      logger.info('shared', 'ConfigManager', `Agent ${agentId} removed`, { agentId });
      return true;
    }
    return false;
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.config.agents.find(a => a.id === agentId);
  }

  getAgentsByRole(role: AgentRole): AgentConfig[] {
    return this.config.agents.filter(a => a.role === role);
  }

  addGuideline(guideline: GuidelineConfig): void {
    if (!this.isValidGuideline(guideline)) {
      throw new Error(`Invalid guideline configuration: ${guideline.id}`);
    }

    const existingIndex = this.config.guidelines.findIndex(g => g.id === guideline.id);
    if (existingIndex >= 0) {
      this.config.guidelines[existingIndex] = guideline;
    } else {
      this.config.guidelines.push(guideline);
    }

    logger.info('shared', 'ConfigManager', `Guideline ${guideline.id} added/updated`, { guidelineId: guideline.id });
  }

  removeGuideline(guidelineId: string): boolean {
    const index = this.config.guidelines.findIndex(g => g.id === guidelineId);
    if (index >= 0) {
      this.config.guidelines.splice(index, 1);
      logger.info('shared', 'ConfigManager', `Guideline ${guidelineId} removed`, { guidelineId });
      return true;
    }
    return false;
  }

  getGuideline(guidelineId: string): GuidelineConfig | undefined {
    return this.config.guidelines.find(g => g.id === guidelineId);
  }

  getEnabledGuidelines(): GuidelineConfig[] {
    return this.config.guidelines.filter(g => g.enabled);
  }

  enableFeature(feature: keyof PRPConfig['features']): void {
    this.config.features[feature] = true;
    logger.info('shared', 'ConfigManager', `Feature ${feature} enabled`, { feature });
  }

  disableFeature(feature: keyof PRPConfig['features']): void {
    this.config.features[feature] = false;
    logger.info('shared', 'ConfigManager', `Feature ${feature} disabled`, { feature });
  }

  isFeatureEnabled(feature: keyof PRPConfig['features']): boolean {
    return this.config.features[feature];
  }

  private validate(): void {
    // Validate storage paths
    if (!Validator.isValidWorktreeName(this.config.storage.dataDir)) {
      throw new Error('Invalid storage data directory');
    }

    // Validate agents
    for (const agent of this.config.agents) {
      if (!this.isValidAgent(agent)) {
        throw new Error(`Invalid agent configuration: ${agent.id}`);
      }
    }

    // Validate guidelines
    for (const guideline of this.config.guidelines) {
      if (!this.isValidGuideline(guideline)) {
        throw new Error(`Invalid guideline configuration: ${guideline.id}`);
      }
    }

    // Validate limits
    if (this.config.limits.maxConcurrentAgents <= 0) {
      throw new Error('maxConcurrentAgents must be positive');
    }

    if (this.config.limits.tokenAlertThreshold <= 0 || this.config.limits.tokenAlertThreshold > 1) {
      throw new Error('tokenAlertThreshold must be between 0 and 1');
    }
  }

  private isValidAgent(agent: AgentConfig): boolean {
    return (
      Validator.isValidAgentId(agent.id) &&
      agent.name.length > 0 &&
      ['claude-code-anthropic', 'claude-code-glm', 'codex', 'gemini', 'amp', 'aider', 'github-copilot', 'custom'].includes(agent.type) &&
      agent.role &&
      agent.capabilities &&
      typeof agent.capabilities.supportsTools === 'boolean'
    );
  }

  private isValidGuideline(guideline: GuidelineConfig): boolean {
    return (
      Validator.isValidAgentId(guideline.id) &&
      guideline.name.length > 0 &&
      typeof guideline.enabled === 'boolean' &&
      guideline.protocol &&
      guideline.protocol.steps &&
      guideline.protocol.steps.length > 0
    );
  }

  private isValidConfigExportData(data: unknown): data is ConfigExportData {
    return (
      data !== null &&
      typeof data === 'object' &&
      'config' in data &&
      'exportedAt' in data &&
      'version' in data &&
      typeof (data as ConfigExportData).exportedAt === 'string' &&
      typeof (data as ConfigExportData).version === 'string'
    );
  }

  // Export/Import functionality
  async export(exportPath: string): Promise<void> {
    try {
      const exportData = {
        config: this.config as Record<string, unknown>,
        exportedAt: new Date().toISOString(),
        version: this.config.version,
      };

      await ConfigUtils.saveConfigFile(exportPath, exportData);
      logger.info('shared', 'ConfigManager', `Configuration exported to ${exportPath}`, { exportPath });
    } catch (error) {
      logger.error('shared', 'ConfigManager', 'Failed to export configuration', error instanceof Error ? error : new Error(String(error)), { exportPath });
      throw error;
    }
  }

  async import(importPath: string): Promise<void> {
    try {
      const importData = await ConfigUtils.loadConfigFile<unknown>(importPath);
      if (this.isValidConfigExportData(importData)) {
        this.config = ConfigUtils.mergeDeep(DEFAULT_CONFIG, importData.config) as PRPConfig;
        this.validate();
        logger.info('shared', 'ConfigManager', `Configuration imported from ${importPath}`, { importPath });
      } else {
        throw new Error('Invalid import file format');
      }
    } catch (error) {
      logger.error('shared', 'ConfigManager', 'Failed to import configuration', error instanceof Error ? error : new Error(String(error)), { importPath });
      throw error;
    }
  }

  // Reset to defaults
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    logger.info('shared', 'ConfigManager', 'Configuration reset to defaults', { timestamp: new Date().toISOString() });
  }
}

// Global configuration manager instance
export const configManager = new ConfigManager();

// Initialize configuration
export async function initializeConfig(configPath?: string): Promise<PRPConfig> {
  if (configPath) {
    const manager = new ConfigManager(configPath);
    await manager.load();
    return manager.get();
  } else {
    await configManager.load();
    return configManager.get();
  }
}

// Configuration validation utilities
export function validateConfig(config: PRPConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Create a temporary manager with the config to validate
    const tempManager = new class extends ConfigManager {
      constructor() {
        super('/dev/null'); // dummy path
        // Set the config directly for validation
        (this as unknown as { config: PRPConfig }).config = config;
      }
    }();

    // Access the private validate method through a public interface
    // Since we can't access private methods directly, we'll use the update method
    // which calls validate internally
    tempManager.update({});
  } catch (error) {
    errors.push((error as Error).message);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}