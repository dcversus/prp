/**
 * ♫ PrpRc Configuration Manager
 *
 * Configuration management with proper hierarchy: defaults < .prprc < .prp/.prprc
 * Aligns with PRP-001 specification and implements secure secret handling.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { homedir } from 'os';

import { ConfigUtils } from '../shared/utils';
import { logger } from '../shared/logger';
import { DEFAULT_PRPRC, REQUIRED_PRPRC_FIELDS } from '../shared/types/prprc';

import { validateConfig } from './schema-validator';

import type {
  PrpRc,
  ConfigMergeResult,
  ConfigValidationResult,
  ConfigPaths,
  WriteOptions,
} from '../shared/types/prprc';
// Singleton instance
let instance: PrpRcManager | null = null;
/**
 * PrpRc Configuration Manager
 * Singleton implementing PRP-001 hierarchy: ~/.prprc < .prp/.prprc < ./.prprc
 */
export class PrpRcManager {
  private readonly workingDirectory: string;
  private readonly paths: ConfigPaths;
  private config: PrpRc | null = null;
  private constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
    this.paths = this.resolveConfigPaths(workingDirectory);
    this.config = null;
  }
  /**
   * Get singleton instance
   */
  static getInstance(workingDirectory?: string): PrpRcManager {
    if (!instance) {
      instance = new PrpRcManager(workingDirectory);
    }
    return instance;
  }
  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    instance = null;
  }
  /**
   * Resolve all config file paths following PRP-001 hierarchy
   * Priority: ~/.prprc < .prprc < .prp/.prprc
   */
  private resolveConfigPaths(workingDirectory: string): ConfigPaths {
    return {
      global: join(homedir(), '.prprc'),
      local: resolve(workingDirectory, '.prprc'),
      secrets: resolve(workingDirectory, '.prp/.prprc'),
    };
  }
  /**
   * Load configuration with proper merging hierarchy
   * Hierarchy: defaults < ~/.prprc < ./.prprc < .prp/.prprc
   */
  async load(refresh = false): Promise<ConfigMergeResult> {
    if (this.config && !refresh) {
      return {
        merged: this.config,
        sources: {
          defaults: this.config,
        },
        metadata: {
          merged_at: new Date().toISOString(),
          config_paths: this.paths,
        },
      };
    }
    try {
      // Load defaults
      const defaults = { ...DEFAULT_PRPRC } as PrpRc;
      // Load global config (~/.prprc) - lowest priority
      let globalConfig: Partial<PrpRc> = {};
      if (existsSync(this.paths.global)) {
        const globalConfigData = readFileSync(this.paths.global, 'utf8');
        globalConfig = JSON.parse(globalConfigData);
        logger.info('config', 'PrpRcManager', `Loaded global config from ${this.paths.global}`);
      }
      // Load local config (./.prprc) - medium priority
      let localConfig: Partial<PrpRc> = {};
      if (existsSync(this.paths.local)) {
        const localConfigData = readFileSync(this.paths.local, 'utf8');
        localConfig = JSON.parse(localConfigData);
        logger.info('config', 'PrpRcManager', `Loaded local config from ${this.paths.local}`);
      }
      // Load secrets config (.prp/.prprc) - highest priority
      let secretsConfig: Partial<PrpRc> = {};
      if (existsSync(this.paths.secrets)) {
        const secretsConfigData = readFileSync(this.paths.secrets, 'utf8');
        secretsConfig = JSON.parse(secretsConfigData);
        logger.info('config', 'PrpRcManager', `Loaded secrets config from ${this.paths.secrets}`);
      }
      // Merge configurations: defaults < global < local < secrets
      const merged = this.mergeConfigs(defaults, globalConfig, localConfig, secretsConfig);
      // Validate final configuration
      const validation = this.validate(merged);
      if (!validation.valid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.config = merged;
      const result: ConfigMergeResult = {
        merged,
        sources: {
          defaults,
          ...(Object.keys(localConfig).length > 0 && { user: localConfig as PrpRc }),
          ...(Object.keys(secretsConfig).length > 0 && { secrets: secretsConfig as PrpRc }),
        },
        metadata: {
          merged_at: new Date().toISOString(),
          config_paths: {
            ...(existsSync(this.paths.local) && { user: this.paths.local }),
            ...(existsSync(this.paths.secrets) && { secrets: this.paths.secrets }),
          },
        },
      };
      logger.info('config', 'PrpRcManager', 'Configuration loaded and merged successfully');
      return result;
    } catch (error) {
      logger.error(
        'config',
        'PrpRcManager',
        'Failed to load configuration',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new Error(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  /**
   * Write configuration to specific location
   */
  async write(options: WriteOptions = {}): Promise<void> {
    const location = options.location ?? 'local';
    const createIfMissing = options.createIfMissing ?? true;
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    let configPath: string;
    switch (location) {
      case 'global':
        configPath = this.paths.global;
        break;
      case 'secrets':
        configPath = this.paths.secrets;
        if (createIfMissing && !existsSync(dirname(configPath))) {
          mkdirSync(dirname(configPath), { recursive: true });
        }
        break;
      case 'local':
      default:
        configPath = this.paths.local;
        break;
    }
    // Ensure directory exists
    if (createIfMissing && !existsSync(dirname(configPath))) {
      mkdirSync(dirname(configPath), { recursive: true });
    }
    // Prepare config to write (filter secrets for non-secrets location)
    let configToWrite: Partial<PrpRc> = this.config;
    if (location !== 'secrets') {
      configToWrite = this.filterSecrets(this.config);
    }
    // Write file
    const configJson = JSON.stringify(configToWrite, null, 2);
    writeFileSync(configPath, configJson, 'utf8');
    logger.info('config', 'PrpRcManager', `Wrote config to ${configPath}`);
  }
  /**
   * Write only secrets to .prp/.prprc
   */
  async writeSecrets(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    const secretsPath = this.paths.secrets;
    if (!existsSync(dirname(secretsPath))) {
      mkdirSync(dirname(secretsPath), { recursive: true });
    }
    const secrets = this.extractSecrets(this.config);
    const secretsJson = JSON.stringify(secrets, null, 2);
    writeFileSync(secretsPath, secretsJson, 'utf8');
    logger.info('config', 'PrpRcManager', `Wrote secrets to ${secretsPath}`);
  }
  /**
   * Validate configuration against schema and requirements
   */
  validate(config: PrpRc): ConfigValidationResult {
    const result: ConfigValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    // Check required fields
    for (const field of REQUIRED_PRPRC_FIELDS) {
      if (!(field in config) || config[field] === undefined || config[field] === null) {
        result.errors.push({
          path: field,
          message: `Required field '${field}' is missing`,
          value: config[field],
        });
        result.valid = false;
      }
    }
    // JSON Schema validation
    try {
      const schemaValidation = validateConfig(config);
      if (!schemaValidation.isValid) {
        result.errors.push(
          ...schemaValidation.errors.map((e) => ({
            path: e.field,
            message: e.message,
            value: e.value,
          })),
        );
        result.warnings.push(
          ...schemaValidation.warnings.map((w) => ({
            path: w.field,
            message: w.message,
            ...(w.suggestion && { suggestion: w.suggestion }),
          })),
        );
        result.valid = false;
      }
    } catch (error) {
      result.errors.push({
        path: 'schema',
        message: `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      result.valid = false;
    }
    // Business logic validation
    if (config.limit && !this.isValidLimitFormat(config.limit)) {
      result.errors.push({
        path: 'limit',
        message: `Invalid limit format: ${config.limit}. Expected format like '100k', '2M', '1k#agent-name', '100usd10k#provider'`,
        value: config.limit,
      });
      result.valid = false;
    }
    // Validate providers
    if (config.providers) {
      config.providers.forEach((provider, index) => {
        if (!provider.id || !provider.type) {
          result.errors.push({
            path: `providers[${index}]`,
            message: 'Provider must have id and type',
          });
          result.valid = false;
        }
      });
    }
    // Validate agents
    if (config.agents) {
      config.agents.forEach((agent, index) => {
        if (!agent.id || !agent.provider || !agent.type) {
          result.errors.push({
            path: `agents[${index}]`,
            message: 'Agent must have id, provider, and type',
          });
          result.valid = false;
        }
      });
    }
    return result;
  }
  /**
   * Merge configurations with proper precedence
   * defaults < global < local < secrets
   */
  private mergeConfigs(
    defaults: PrpRc,
    global: Partial<PrpRc>,
    local: Partial<PrpRc>,
    secrets: Partial<PrpRc>,
  ): PrpRc {
    // Start with defaults
    let merged = ConfigUtils.mergeDeep(
      defaults as unknown as Record<string, unknown>,
      global as unknown as Record<string, unknown>,
    ) as unknown as PrpRc;
    // Apply local config on top
    merged = ConfigUtils.mergeDeep(
      merged as unknown as Record<string, unknown>,
      local as unknown as Record<string, unknown>,
    ) as unknown as PrpRc;
    // Apply secrets on top (highest precedence)
    merged = ConfigUtils.mergeDeep(
      merged as unknown as Record<string, unknown>,
      secrets as unknown as Record<string, unknown>,
    ) as unknown as PrpRc;
    return merged;
  }
  /**
   * Get configuration value using dot notation
   * Example: get('project.name') or get('providers.0.id')
   */
  get(path?: string): unknown {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    if (!path) {
      return this.config;
    }
    // Navigate nested properties
    const keys = path.split('.');
    let current: unknown = this.config;
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }
  /**
   * Set configuration value using dot notation
   */
  set(path: string, value: unknown): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) {
      throw new Error('Invalid path provided');
    }
    let current: unknown = this.config;
    // Navigate to parent
    for (const key of keys) {
      if (!(key in (current as Record<string, unknown>))) {
        (current as Record<string, unknown>)[key] = {};
      }
      current = (current as Record<string, unknown>)[key];
    }
    (current as Record<string, unknown>)[lastKey] = value;
  }
  /**
   * Filter out secrets from configuration (for .prprc)
   */
  private filterSecrets(config: Partial<PrpRc>): Partial<PrpRc> {
    const filtered = { ...config };
    // Remove connection tokens (should be in .prp/.prprc)
    if (filtered.connections) {
      const connections: Record<string, unknown> = { ...filtered.connections };
      if (connections.github) {
        const githubRecord = connections.github as Record<string, unknown>;
        const { token: _token, ...githubRest } = githubRecord;
        connections.github = githubRest;
      }
      if (connections.npm) {
        const npmRecord = connections.npm as Record<string, unknown>;
        const { token: _token, ...npmRest } = npmRecord;
        connections.npm = npmRest;
      }
      if (Object.keys(connections).length > 0) {
        filtered.connections = connections as Partial<PrpRc>['connections'];
      } else {
        delete filtered.connections;
      }
    }
    // Remove provider auth values (should be in .prp/.prprc)
    if (filtered.providers) {
      const filteredProviders = filtered.providers
        .map((provider) => {
          const { auth: _auth, ...providerRest } = provider;
          return providerRest;
        })
        .filter(Boolean);
      if (filteredProviders.length > 0) {
        filtered.providers = filteredProviders as Partial<PrpRc>['providers'];
      } else {
        delete filtered.providers;
      }
    }
    return filtered;
  }
  /**
   * Extract only secrets from configuration (for .prp/.prprc)
   */
  private extractSecrets(config: Partial<PrpRc>): Partial<PrpRc> {
    const secrets: Partial<PrpRc> = {};
    // Extract connection tokens
    if (config.connections) {
      const connections: {
        github?: { api_url: string; token: string };
        npm?: { token: string; registry: string };
      } = {};
      if (config.connections.github?.token) {
        connections.github = {
          api_url: config.connections.github.api_url || 'https://api.github.com',
          token: config.connections.github.token,
        };
      }
      if (config.connections.npm?.token) {
        connections.npm = {
          token: config.connections.npm.token,
          registry: config.connections.npm.registry || 'https://registry.npmjs.org',
        };
      }
      if (Object.keys(connections).length > 0) {
        (secrets as any).connections = connections;
      }
    }
    // Extract provider auth
    if (config.providers) {
      const providersWithAuth = config.providers
        .filter((provider) => provider.auth)
        .map((provider) => ({
          id: provider.id,
          limit: provider.limit,
          type: provider.type,
          temperature: provider.temperature,
          base_url: provider.base_url,
          seed: provider.seed,
          extra_args: provider.extra_args,
          auth: provider.auth,
          config: provider.config,
        }));
      if (providersWithAuth.length > 0) {
        secrets.providers = providersWithAuth;
      }
    }
    return secrets;
  }
  /**
   * Validate limit format (e.g., '100k', '2M', '1k#agent-name')
   */
  private isValidLimitFormat(limit: string): boolean {
    // Basic format validation
    const pattern = /^(\d+(?:\.\d+)?[kmg]?)(?:#(.+))?$/i;
    return pattern.test(limit);
  }
  /**
   * Get configuration file paths
   */
  getPaths(): ConfigPaths {
    return { ...this.paths };
  }
  /**
   * Get current working directory
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }
}
/**
 * Global PrpRc manager instance
 */
export const prpRcManager = PrpRcManager.getInstance();
/**
 * Initialize and load PrpRc configuration
 */
export async function initializePrpRc(workingDirectory?: string): Promise<ConfigMergeResult> {
  const manager = workingDirectory ? PrpRcManager.getInstance(workingDirectory) : prpRcManager;
  return manager.load();
}
