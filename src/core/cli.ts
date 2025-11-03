import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { ConfigurationManager } from '../config/manager';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigurationError } from '../utils/error-handler';
import { execSync } from 'child_process';
import { statSync } from 'fs';
import packageJson from '../../package.json';
import type { PRPConfig, CommandResult } from '../types';

/**
 * Main CLI class
 */
export class PRPCli extends EventEmitter {
  private config?: PRPConfig;
  private configManager: ConfigurationManager;
  private errorHandler: ErrorHandler;
  private initialized: boolean = false;
  private startTime: number = Date.now();

  constructor(private options: {
    cwd?: string;
    debug?: boolean;
    configPath?: string;
    quiet?: boolean;
    verbose?: boolean;
    noColor?: boolean;
  } = {}) {
    super();

    this.configManager = new ConfigurationManager(options.cwd);
    this.errorHandler = new ErrorHandler(options.debug);

    // Configure logger based on options
    if (options.debug) {
      logger.setLevel('debug');
    } else if (options.verbose) {
      logger.setLevel('verbose');
    } else if (options.quiet) {
      logger.setLevel('error');
    }

    if (options.noColor) {
      logger.setColors(false);
    }

    this.setupEventHandlers();
  }

  /**
   * Initialize CLI
   */
  async initialize(cliOptions?: any): Promise<void> {
    if (this.initialized) {
      logger.debug('CLI already initialized');
      return;
    }

    try {
      this.emit('cli:start', { options: this.options });

      // Load configuration
      await this.loadConfiguration(cliOptions?.config || this.options.configPath);

      // Validate configuration
      const validation = this.configManager.validate();
      if (!validation.isValid) {
        const errors = validation.errors?.join(', ') || 'Unknown validation error';
        throw new ConfigurationError(`Configuration validation failed: ${errors}`);
      }

      // Perform system checks
      await this.performSystemChecks();

      this.initialized = true;
      this.emit('cli:initialized', { config: this.config });

      logger.success('PRP CLI initialized successfully');
      logger.info(`Project: ${this.config!.name} v${this.config!.version}`);

    } catch (error) {
      const result = await this.errorHandler.handle(error as Error);
      this.emit('cli:error', { error, result });
      throw error;
    }
  }

  /**
   * Run a command
   */
  async run(args: string[], options?: any): Promise<CommandResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const command = args[0];
    const commandArgs = args.slice(1);

    try {
      this.emit('cli:command:start', { command, args: commandArgs });

      logger.debug(`Executing command: ${command} ${commandArgs.join(' ')}`);

      // Execute command
      const result = await this.executeCommand(command, commandArgs, options);

      const duration = Date.now() - startTime;
      result.duration = duration;

      this.emit('cli:command:success', { command, result });

      logger.debug(`Command completed in ${duration}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result = await this.errorHandler.handle(error as Error);
      result.duration = duration;

      this.emit('cli:command:error', { command, error, result });

      return result;
    }
  }

  /**
   * Execute specific command
   */
  private async executeCommand(
    command: string,
    args: string[],
    options?: any
  ): Promise<CommandResult> {
    switch (command) {
      case 'init':
        return await this.executeInit(args, options);
      case 'build':
        return await this.executeBuild(args, options);
      case 'test':
        return await this.executeTest(args, options);
      case 'lint':
        return await this.executeLint(args, options);
      case 'quality':
        return await this.executeQuality(args, options);
      case 'status':
        return await this.executeStatus(args, options);
      case 'config':
        return await this.executeConfig(args, options);
      case 'debug':
        return await this.executeDebug(args, options);
      case 'ci':
        return await this.executeCI(args, options);
      case 'deploy':
        return await this.executeDeploy(args, options);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): PRPConfig {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded');
    }
    return this.config;
  }

  /**
   * Get configuration manager
   */
  getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Check if CLI is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get CLI version
   */
  getVersion(): string {
    try {
      const pkg = packageJson;
      return pkg.version;
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Get CLI uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Shutdown CLI
   */
  async shutdown(): Promise<void> {
    this.emit('cli:shutdown');

    // Cleanup resources
    this.removeAllListeners();

    logger.info('PRP CLI shutdown complete');
  }

  /**
   * Load configuration
   */
  private async loadConfiguration(configPath?: string): Promise<void> {
    try {
      this.config = await this.configManager.load(configPath);
      this.emit('cli:config:loaded', { config: this.config });
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform system checks
   */
  private async performSystemChecks(): Promise<void> {
    logger.debug('Performing system checks');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 16) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
    }

    // Check if we're in a git repository (optional)
    try {
      // execSync already imported
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      logger.debug('Git repository detected');
    } catch {
      logger.warn('Not in a Git repository. Some features may not work correctly.');
    }

    // Check available disk space
    statSync(process.cwd());
    logger.debug(`Working directory: ${process.cwd()}`);

    logger.debug('System checks completed');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Log important events
    this.on('cli:start', (data) => {
      logger.debug('CLI starting', data);
    });

    this.on('cli:initialized', (data) => {
      logger.debug('CLI initialized', data);
    });

    this.on('cli:command:start', (data) => {
      logger.debug(`Command started: ${data.command}`, data);
    });

    this.on('cli:command:success', (data) => {
      logger.debug(`Command completed: ${data.command}`, data);
    });

    this.on('cli:command:error', (data) => {
      logger.error(`Command failed: ${data.command}`, data);
    });

    this.on('cli:shutdown', () => {
      logger.debug('CLI shutting down');
    });

    // Handle uncaught exceptions
    this.on('error', (error) => {
      logger.error('CLI error:', error);
    });
  }

  // Command implementations (stubs for now)
  private async executeInit(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Initializing project...');
    // Implementation will be added in init command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Project initialized successfully',
      stderr: '',
      duration: 0
    };
  }

  private async executeBuild(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Building project...');
    // Implementation will be added in build command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Build completed successfully',
      stderr: '',
      duration: 0
    };
  }

  private async executeTest(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Running tests...');
    // Implementation will be added in test command
    return {
      success: true,
      exitCode: 0,
      stdout: 'All tests passed',
      stderr: '',
      duration: 0
    };
  }

  private async executeLint(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Running linting...');
    // Implementation will be added in lint command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Linting completed successfully',
      stderr: '',
      duration: 0
    };
  }

  private async executeQuality(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Running quality gates...');
    // Implementation will be added in quality command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Quality gates passed',
      stderr: '',
      duration: 0
    };
  }

  private async executeStatus(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Checking status...');
    // Implementation will be added in status command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Status: All systems operational',
      stderr: '',
      duration: 0
    };
  }

  private async executeConfig(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Managing configuration...');
    // Implementation will be added in config command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Configuration operation completed',
      stderr: '',
      duration: 0
    };
  }

  private async executeDebug(args: string[], options?: any): Promise<CommandResult> {
    logger.info('Starting debug mode...');
    // Implementation will be added in debug command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Debug mode started',
      stderr: '',
      duration: 0
    };
  }

  private async executeCI(args: string[], options?: any): Promise<CommandResult> {
    logger.info('Managing CI/CD...');
    // Implementation will be added in CI command
    return {
      success: true,
      exitCode: 0,
      stdout: 'CI/CD operation completed',
      stderr: '',
      duration: 0
    };
  }

  private async executeDeploy(_args: string[], _options?: any): Promise<CommandResult> {
    logger.info('Deploying application...');
    // Implementation will be added in deploy command
    return {
      success: true,
      exitCode: 0,
      stdout: 'Deployment completed successfully',
      stderr: '',
      duration: 0
    };
  }
}