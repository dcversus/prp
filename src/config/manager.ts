import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { logger } from '../utils/logger';
import { ConfigurationError } from '../utils/error-handler';
import type {
  PRPConfig,
  SettingsConfig,
  ValidationResult,
  DebugSettings,
  QualitySettings,
  BuildSettings,
  TestSettings,
  CISettings,
  DevelopmentSettings,
  PackageManagerSettings
} from '../types';

/**
 * Configuration file paths in order of precedence
 */
const CONFIG_PATHS = [
  '.prprc',
  '.prprc.json',
  '.prprc.yaml',
  '.prprc.yml',
  'prp.config.js',
  'prp.config.json'
];

/**
 * Configuration Manager
 */
export class ConfigurationManager {
  private configPath?: string;
  private config?: PRPConfig;
  private schema?: any;

  constructor(private cwd: string = process.cwd()) {
    this.loadSchema();
  }

  /**
   * Load configuration from file
   */
  async load(configPath?: string): Promise<PRPConfig> {
    const targetPath = configPath || this.findConfigFile();

    if (!targetPath) {
      logger.debug('No configuration file found, using defaults');
      return this.getDefaultConfig();
    }

    this.configPath = targetPath;
    logger.debug(`Loading configuration from: ${targetPath}`);

    try {
      const configData = await this.readConfigFile(targetPath);
      this.config = this.mergeWithDefaults(configData);

      // Validate configuration
      const validation = this.validate(this.config);
      if (!validation.isValid) {
        const errors = validation.errors?.join(', ') || 'Unknown validation error';
        throw new ConfigurationError(`Configuration validation failed: ${errors}`);
      }

      // Resolve environment variables
      this.config = this.resolveEnvironmentVariables(this.config);

      logger.info(`Configuration loaded successfully from: ${targetPath}`);
      return this.config!;

    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: PRPConfig, configPath?: string): Promise<void> {
    const targetPath = configPath || this.configPath || '.prprc';

    // Validate configuration before saving
    const validation = this.validate(config);
    if (!validation.isValid) {
      const errors = validation.errors?.join(', ') || 'Unknown validation error';
      throw new ConfigurationError(`Cannot save invalid configuration: ${errors}`);
    }

    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(path.resolve(targetPath)));

      // Determine format from file extension
      const ext = path.extname(targetPath);
      let content: string;

      switch (ext) {
        case '.json':
          content = JSON.stringify(config, null, 2);
          break;
        case '.yaml':
        case '.yml':
          content = yaml.stringify(config);
          break;
        default:
          // Default to JSON for .prprc files
          content = JSON.stringify(config, null, 2);
      }

      await fs.writeFile(targetPath, content, 'utf8');
      this.config = config;
      this.configPath = targetPath;

      logger.info(`Configuration saved to: ${targetPath}`);

    } catch (error) {
      throw new ConfigurationError(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current configuration
   */
  get(): PRPConfig {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Get configuration file path
   */
  getPath(): string | undefined {
    return this.configPath;
  }

  /**
   * Update configuration section
   */
  async updateSection<K extends keyof SettingsConfig>(
    section: K,
    value: SettingsConfig[K]
  ): Promise<void> {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call load() first.');
    }

    (this.config.settings as any)[section] = value;
    await this.save(this.config);
  }

  /**
   * Get configuration section
   */
  getSection<K extends keyof SettingsConfig>(section: K): SettingsConfig[K] {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call load() first.');
    }

    return (this.config.settings as any)[section];
  }

  /**
   * Validate configuration
   */
  validate(config?: PRPConfig): ValidationResult {
    const targetConfig = config || this.config;

    if (!targetConfig) {
      return {
        isValid: false,
        errors: ['No configuration to validate'],
        warnings: []
      };
    }

    if (!this.schema) {
      return {
        isValid: true,
        errors: [],
        warnings: ['No validation schema available']
      };
    }

    // Basic validation - TODO: Implement proper schema validation
    const errors: string[] = [];

    if (!targetConfig.name || targetConfig.name.trim() === '') {
      errors.push('Configuration name is required');
    }

    if (!targetConfig.version || !targetConfig.version.match(/^\d+\.\d+\.\d+$/)) {
      errors.push('Configuration version must be in semver format (x.y.z)');
    }

    if (!targetConfig.settings) {
      errors.push('Configuration settings are required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Find configuration file in current directory
   */
  private findConfigFile(): string | undefined {
    for (const configPath of CONFIG_PATHS) {
      const fullPath = path.join(this.cwd, configPath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return undefined;
  }

  /**
   * Read configuration file based on extension
   */
  private async readConfigFile(filePath: string): Promise<Partial<PRPConfig>> {
    const ext = path.extname(filePath);
    const content = await fs.readFile(filePath, 'utf8');

    try {
      switch (ext) {
        case '.json':
          return JSON.parse(content);
        case '.yaml':
        case '.yml':
          return yaml.parse(content);
        case '.js': {
          // Dynamic import for JS config files
          const module = await import(path.resolve(filePath));
          return module.default || module;
        }
        default:
          // Try JSON as default
          return JSON.parse(content);
      }
    } catch (error) {
      throw new ConfigurationError(`Failed to parse ${ext} file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PRPConfig {
    return {
      version: '1.0.0',
      name: 'prp-project',
      description: 'PRP Project',
      storage: {
        dataDir: '.prp',
        cacheDir: '/tmp/prp-cache',
        worktreesDir: '/tmp/prp-worktrees',
        notesDir: '.prp/notes',
        logsDir: '/tmp/prp-logs',
        keychainFile: '.prp/keychain.json',
        persistFile: '.prp/state.json',
        maxCacheSize: 100 * 1024 * 1024,
        retentionPeriod: 30 * 24 * 60 * 60 * 1000,
      },
      agents: [],
      guidelines: [],
      signals: {},
      orchestrator: {},
      scanner: {},
      inspector: {},
      tui: {
        mode: 'cli',
        activeScreen: 'main',
        followEvents: true,
        autoRefresh: true,
        refreshInterval: 5000,
      },
      features: {
        scanner: true,
        inspector: true,
        orchestrator: true,
        tui: true,
        mcp: true,
        worktrees: true,
      },
      limits: {
        maxConcurrentAgents: 5,
        maxWorktrees: 50,
        maxPRPsPerWorktree: 20,
        tokenAlertThreshold: 0.8,
        tokenCriticalThreshold: 0.95,
      },
      logging: {
        level: 'info',
        enableFileLogging: true,
        enableTokenTracking: true,
        enablePerformanceTracking: true,
        logRetentionDays: 7,
      },
      security: {
        enablePinProtection: false,
        encryptSecrets: true,
        sessionTimeout: 60,
      },
      settings: {
        debug: {
          enabled: false,
          level: 'info',
          output: 'console',
          components: {
            cli: true,
            build: true,
            test: true,
            lint: true,
            deploy: true
          }
        },
        quality: {
          enabled: true,
          strict: false,
          gates: {
            lint: {
              enabled: true,
              tools: ['eslint'],
              failOnWarnings: false,
              maxWarnings: 0
            },
            test: {
              enabled: true,
              coverage: {
                enabled: true,
                minimum: 80,
                threshold: 5
              },
              failures: {
                maximum: 0
              }
            },
            security: {
              enabled: true,
              tools: ['npm-audit'],
              failOnHigh: true,
              failOnMedium: false
            }
          },
          preCommitHooks: true,
          prePushHooks: true
        },
        build: {
          mode: 'production',
          output: 'dist',
          clean: true,
          sourcemap: true,
          minify: true,
          incremental: true,
          parallel: true
        },
        test: {
          type: 'all',
          framework: 'jest',
          coverage: true,
          parallel: true,
          testEnvironment: 'node'
        },
        ci: {
          provider: 'github',
          enabled: false,
          workflows: {}
        },
        development: {
          port: 3000,
          hotReload: true,
          open: true
        },
        packageManager: {
          type: 'npm',
          cache: true,
          audit: true
        }
      },
      scripts: {
        dev: 'prp dev',
        build: 'prp build',
        test: 'prp test',
        lint: 'prp lint',
        quality: 'prp quality'
      }
    };
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: Partial<PRPConfig>): PRPConfig {
    const defaults = this.getDefaultConfig();

    return {
      ...defaults,
      ...config,
      settings: {
        ...defaults.settings,
        ...config.settings,
        // Deep merge for nested settings with proper type safety
        debug: {
          ...defaults.settings.debug!,
          ...(config.settings?.debug || {})
        } as DebugSettings,
        quality: {
          ...defaults.settings.quality!,
          ...(config.settings?.quality || {}),
          gates: {
            ...defaults.settings.quality!.gates,
            ...(config.settings?.quality?.gates || {})
          }
        } as QualitySettings,
        build: {
          ...defaults.settings.build!,
          ...(config.settings?.build || {})
        } as BuildSettings,
        test: {
          ...defaults.settings.test!,
          ...(config.settings?.test || {})
        } as TestSettings,
        ci: {
          ...defaults.settings.ci!,
          ...(config.settings?.ci || {})
        } as CISettings,
        development: {
          ...defaults.settings.development!,
          ...(config.settings?.development || {})
        } as DevelopmentSettings,
        packageManager: {
          ...defaults.settings.packageManager!,
          ...(config.settings?.packageManager || {})
        } as PackageManagerSettings
      },
      scripts: { ...defaults.scripts, ...config.scripts }
    };
  }

  /**
   * Resolve environment variables in configuration
   */
  private resolveEnvironmentVariables(config: any): any {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    if (Array.isArray(config)) {
      return config.map(item => this.resolveEnvironmentVariables(item));
    }

    const resolved: any = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && value.includes('${')) {
        resolved[key] = this.substituteVariables(value);
      } else if (typeof value === 'object') {
        resolved[key] = this.resolveEnvironmentVariables(value);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Substitute environment variables
   */
  private substituteVariables(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      // Handle default values: ${VAR:-default}
      const [varName, defaultValue] = variable.split(':-');

      const envValue = process.env[varName] ||
                     process.env[varName.toUpperCase()] ||
                     process.env[varName.toLowerCase()];

      return envValue || defaultValue || match;
    });
  }

  /**
   * Load JSON schema for validation
   */
  private loadSchema(): void {
    // This would typically load from a JSON schema file
    // For now, we'll use a basic validation
    this.schema = {
      type: 'object',
      required: ['name', 'version', 'settings'],
      properties: {
        name: { type: 'string', minLength: 1 },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        type: { type: 'string' },
        description: { type: 'string' },
        author: { type: 'string' },
        license: { type: 'string' },
        settings: {
          type: 'object',
          required: ['debug', 'quality', 'build', 'test'],
          properties: {
            debug: { $ref: '#/definitions/DebugSettings' },
            quality: { $ref: '#/definitions/QualitySettings' },
            build: { $ref: '#/definitions/BuildSettings' },
            test: { $ref: '#/definitions/TestSettings' },
            ci: { $ref: '#/definitions/CISettings' }
          }
        }
      },
      definitions: {
        DebugSettings: {
          type: 'object',
          required: ['enabled', 'level', 'output'],
          properties: {
            enabled: { type: 'boolean' },
            level: { enum: ['error', 'warn', 'info', 'debug', 'verbose'] },
            output: { enum: ['console', 'file', 'json'] }
          }
        },
        QualitySettings: {
          type: 'object',
          required: ['enabled', 'gates'],
          properties: {
            enabled: { type: 'boolean' },
            strict: { type: 'boolean' },
            gates: { type: 'object' }
          }
        },
        BuildSettings: {
          type: 'object',
          required: ['mode'],
          properties: {
            mode: { enum: ['development', 'production'] }
          }
        },
        TestSettings: {
          type: 'object',
          required: ['type', 'framework'],
          properties: {
            type: { enum: ['unit', 'integration', 'e2e', 'all'] },
            framework: { type: 'string' }
          }
        },
        CISettings: {
          type: 'object',
          required: ['provider', 'enabled'],
          properties: {
            provider: { enum: ['github', 'gitlab', 'circleci', 'jenkins'] },
            enabled: { type: 'boolean' }
          }
        }
      }
    };
  }

  /**
   * Reset configuration
   */
  reset(): void {
    this.config = undefined;
    this.configPath = undefined;
  }

  /**
   * Check if configuration exists
   */
  exists(): boolean {
    return this.configPath !== undefined || this.findConfigFile() !== undefined;
  }

  /**
   * Get configuration summary
   */
  getSummary(): Record<string, any> {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded');
    }

    return {
      name: this.config.name,
      version: this.config.version,
      configFile: this.configPath,
      features: {
        debug: this.config.settings.debug?.enabled || false,
        quality: this.config.settings.quality?.enabled || false,
        ci: this.config.settings.ci?.enabled || false,
        development: this.config.settings.development !== undefined
      }
    };
  }
}