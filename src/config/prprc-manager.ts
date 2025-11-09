/**
 * ♫ PrpRc Configuration Manager
 *
 * Configuration management with proper hierarchy: defaults < .prprc < .prp/.prprc
 * Aligns with PRP-001 specification and implements secure secret handling.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { logger } from '../utils/logger.js';
import { ConfigUtils } from '../shared/utils.js';
import type { PrpRc, ConfigMergeResult, ConfigValidationResult } from '../types/prprc.js';
import { DEFAULT_PRPRC, REQUIRED_PRPRC_FIELDS } from '../types/prprc.js';
import { validateConfig } from './schema-validator.js';

/**
 * PrpRc Configuration Manager
 * Implements proper configuration merging and validation
 */
export class PrpRcManager {
  private workingDirectory: string;
  private userConfigPath: string;
  private secretsConfigPath: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
    this.userConfigPath = resolve(workingDirectory, '.prprc');
    this.secretsConfigPath = resolve(workingDirectory, '.prp/.prprc');
  }

  /**
   * Load configuration with proper merging hierarchy
   * Hierarchy: defaults < .prprc < .prp/.prprc
   */
  async load(): Promise<ConfigMergeResult> {
    try {
      // Load defaults
      const defaults = { ...DEFAULT_PRPRC } as PrpRc;

      // Load user config (.prprc)
      let userConfig: Partial<PrpRc> = {};
      if (existsSync(this.userConfigPath)) {
        const userConfigData = readFileSync(this.userConfigPath, 'utf8');
        userConfig = JSON.parse(userConfigData);
        logger.info('config', 'PrpRcManager', `Loaded user config from ${this.userConfigPath}`);
      }

      // Load secrets config (.prp/.prprc)
      let secretsConfig: Partial<PrpRc> = {};
      if (existsSync(this.secretsConfigPath)) {
        const secretsConfigData = readFileSync(this.secretsConfigPath, 'utf8');
        secretsConfig = JSON.parse(secretsConfigData);
        logger.info('config', 'PrpRcManager', `Loaded secrets config from ${this.secretsConfigPath}`);
      }

      // Merge configurations: defaults < user < secrets
      const merged = this.mergeConfigs(defaults, userConfig, secretsConfig);

      // Validate final configuration
      const validation = this.validate(merged);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const result: ConfigMergeResult = {
        merged,
        sources: {
          defaults,
          user: Object.keys(userConfig).length > 0 ? userConfig as PrpRc : undefined,
          secrets: Object.keys(secretsConfig).length > 0 ? secretsConfig as PrpRc : undefined
        },
        metadata: {
          merged_at: new Date().toISOString(),
          config_paths: {
            user: existsSync(this.userConfigPath) ? this.userConfigPath : undefined,
            secrets: existsSync(this.secretsConfigPath) ? this.secretsConfigPath : undefined
          }
        }
      };

      logger.info('config', 'PrpRcManager', 'Configuration loaded and merged successfully');
      return result;

    } catch (error) {
      logger.error('config', 'PrpRcManager', 'Failed to load configuration', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save user configuration (.prprc)
   * Only saves non-secret values to .prprc
   */
  async saveUserConfig(config: Partial<PrpRc>): Promise<void> {
    try {
      // Filter out secrets that should go to .prp/.prprc
      const filteredConfig = this.filterSecrets(config);

      // Ensure directory exists
      mkdirSync(dirname(this.userConfigPath), { recursive: true });

      // Write user config
      writeFileSync(this.userConfigPath, JSON.stringify(filteredConfig, null, 2), 'utf8');
      logger.info('config', 'PrpRcManager', `User config saved to ${this.userConfigPath}`);
    } catch (error) {
      logger.error('config', 'PrpRcManager', 'Failed to save user configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Save secrets configuration (.prp/.prprc)
   * Only saves secret values to .prp/.prprc
   */
  async saveSecretsConfig(config: Partial<PrpRc>): Promise<void> {
    try {
      // Filter only secrets
      const secretsConfig = this.extractSecrets(config);

      // Ensure directory exists
      mkdirSync(dirname(this.secretsConfigPath), { recursive: true });

      // Write secrets config
      writeFileSync(this.secretsConfigPath, JSON.stringify(secretsConfig, null, 2), 'utf8');
      logger.info('config', 'PrpRcManager', `Secrets config saved to ${this.secretsConfigPath}`);
    } catch (error) {
      logger.error('config', 'PrpRcManager', 'Failed to save secrets configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validate configuration against schema and requirements
   */
  validate(config: PrpRc): ConfigValidationResult {
    const result: ConfigValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    for (const field of REQUIRED_PRPRC_FIELDS) {
      if (!(field in config) || config[field] === undefined || config[field] === null) {
        result.errors.push({
          path: field,
          message: `Required field '${field}' is missing`,
          value: config[field]
        });
        result.valid = false;
      }
    }

    // JSON Schema validation
    try {
      const schemaValidation = validateConfig(config);
      if (!schemaValidation.isValid) {
        result.errors.push(...schemaValidation.errors.map(e => ({
          path: e.field,
          message: e.message,
          value: e.value
        })));
        result.warnings.push(...schemaValidation.warnings.map(w => ({
          path: w.field,
          message: w.message,
          suggestion: w.suggestion
        })));
        result.valid = false;
      }
    } catch (error) {
      result.errors.push({
        path: 'schema',
        message: `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
      result.valid = false;
    }

    // Business logic validation
    if (config.limit && !this.isValidLimitFormat(config.limit)) {
      result.errors.push({
        path: 'limit',
        message: `Invalid limit format: ${config.limit}. Expected format like '100k', '2M', '1k#agent-name', '100usd10k#provider'`,
        value: config.limit
      });
      result.valid = false;
    }

    // Validate providers
    if (config.providers) {
      config.providers.forEach((provider, index) => {
        if (!provider.id || !provider.type) {
          result.errors.push({
            path: `providers[${index}]`,
            message: 'Provider must have id and type'
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
            message: 'Agent must have id, provider, and type'
          });
          result.valid = false;
        }
      });
    }

    return result;
  }

  /**
   * Merge configurations with proper precedence
   * defaults < user < secrets
   */
  private mergeConfigs(defaults: PrpRc, user: Partial<PrpRc>, secrets: Partial<PrpRc>): PrpRc {
    // Start with defaults
    let merged = ConfigUtils.mergeDeep(defaults as unknown as Record<string, unknown>, user as unknown as Record<string, unknown>) as unknown as PrpRc;

    // Apply secrets on top (highest precedence)
    merged = ConfigUtils.mergeDeep(merged as unknown as Record<string, unknown>, secrets as unknown as Record<string, unknown>) as unknown as PrpRc;

    return merged;
  }

  /**
   * Filter out secrets from configuration (for .prprc)
   */
  private filterSecrets(config: Partial<PrpRc>): Partial<PrpRc> {
    const filtered = { ...config };

    // Remove connection tokens (should be in .prp/.prprc)
    if (filtered.connections) {
      const connections: any = { ...filtered.connections };
      if (connections.github) {
        const { token, ...github } = connections.github;
        connections.github = github;
      }
      if (connections.npm) {
        const { token, ...npm } = connections.npm;
        connections.npm = npm;
      }
      filtered.connections = connections;
    }

    // Remove provider auth values (should be in .prp/.prprc)
    if (filtered.providers) {
      filtered.providers = filtered.providers.map(provider => {
        const { auth, ...p } = provider;
        return p;
      }) as any;
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
      const connections: any = {};
      if (config.connections.github?.token) {
        connections.github = { token: config.connections.github.token };
      }
      if (config.connections.npm?.token) {
        connections.npm = { token: config.connections.npm.token };
      }
      if (Object.keys(connections).length > 0) {
        secrets.connections = connections;
      }
    }

    // Extract provider auth
    if (config.providers) {
      const providersWithAuth = config.providers
        .filter(provider => provider.auth)
        .map(provider => ({
          id: provider.id,
          auth: provider.auth
        }));
      if (providersWithAuth.length > 0) {
        secrets.providers = providersWithAuth as any;
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
  getPaths() {
    return {
      user: this.userConfigPath,
      secrets: this.secretsConfigPath,
      working: this.workingDirectory
    };
  }
}

/**
 * Global PrpRc manager instance
 */
export const prpRcManager = new PrpRcManager();

/**
 * Initialize and load PrpRc configuration
 */
export async function initializePrpRc(workingDirectory?: string): Promise<ConfigMergeResult> {
  const manager = workingDirectory ? new PrpRcManager(workingDirectory) : prpRcManager;
  return await manager.load();
}