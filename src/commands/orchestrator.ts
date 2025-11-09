#!/usr/bin/env node

/**
 * Orchestrator Command Implementation
 *
 * Provides PRP orchestrator integration with agent spawning,
 * signal processing, and workflow management.
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { ConfigurationError } from '../utils/error-handler';

interface OrchestratorOptions {
  // PRP-001 required options
  prompt?: string;
  run?: string;
  // Global flags
  ci?: boolean;
  debug?: boolean;
  logLevel?: string;
  noColor?: boolean;
  logFile?: string;
  mcpPort?: string;
  // Additional options
  config?: string;
  limit?: string;
}

interface PRPRunItem {
  name: string;
  role?: string;
  agent?: string;
}

interface LimitItem {
  type: 'tokens' | 'cost' | 'time' | 'custom';
  value: number;
  unit?: string;
  custom?: string;
  target?: string;
}

/**
 * Create orchestrator command for CLI
 */
export function createOrchestratorCommand(): Command {
  const orchestratorCmd = new Command('orchestrator')
    .description('Start PRP orchestrator with agent management and signal processing')
    // PRP-001 required orchestrator options
    .option('--prompt <string>', 'Orchestrator start command')
    .option('--run <prps>', 'Run PRPs in format: prp-name#robo-role,second-prp-with-auto-role,third-prp#with-agent-name')
    // Global flags
    .option('--ci', 'Run in CI mode with JSON output')
    .option('--debug', 'Enable debug logging')
    .action(async (options: OrchestratorOptions, command: Command) => {
      // Merge global options from parent command
      const globalOptions = command.parent?.opts() || {};
      const mergedOptions = { ...globalOptions, ...options };

      await handleOrchestratorCommand(mergedOptions);
    });

  return orchestratorCmd;
}

/**
 * Handle orchestrator command execution
 */
async function handleOrchestratorCommand(options: OrchestratorOptions): Promise<void> {
  try {
    // Set debug logging if debug flag is provided
    if (options.debug) {
      process.env.DEBUG = 'true';
      process.env.VERBOSE_MODE = 'true';
      logger.info('Debug mode enabled for orchestrator');
    }

    logger.info('Orchestrator Command', 'Starting PRP orchestrator');

    // Load configuration
    const config = await loadOrchestratorConfig(options);
    logger.info('Orchestrator Command', 'Configuration loaded', { config });

    // Initialize orchestrator
    const { Orchestrator } = await import('../orchestrator/orchestrator.js');
    const engine = new Orchestrator(config);

    // Start orchestrator with specified options
    await startOrchestrator(engine, options);

    logger.info('Orchestrator Command', 'Orchestrator started successfully');

  } catch (error) {
    if (error instanceof ConfigurationError) {
      logger.error('Orchestrator Command', `Configuration error: ${error.message}`);
      process.exit(1);
    } else if (error instanceof Error) {
      logger.error('Orchestrator Command', `Failed to start orchestrator: ${error.message}`);
      process.exit(1);
    } else {
      logger.error('Orchestrator Command', 'Unknown error occurred');
      process.exit(1);
    }
  }
}


/**
 * Load and validate orchestrator configuration
 */
async function loadOrchestratorConfig(options: OrchestratorOptions): Promise<Record<string, unknown>> {
  const { ConfigurationManager } = await import('../config/manager.js');

  // Default configuration for orchestrator
  let config: Record<string, unknown> = {
    name: 'prp-orchestrator',
    version: '1.0.0',
    agents: [],
    tools: [
      {
        name: 'token-monitoring',
        enabled: true,
        config: {}
      },
      {
        name: 'agent-management',
        enabled: true,
        config: {}
      },
      {
        name: 'signal-processing',
        enabled: true,
        config: {}
      }
    ],
    guidelines: {
      channels: ['default'],
      defaultChannel: 'default'
    },
    storage: {
      type: 'file',
      path: '.prp'
    },
    limits: {
      maxConcurrentAgents: 5,
      tokenAlertThreshold: 0.8
    }
  };

  // Load from config file if specified
  if (options.config) {
    try {
      // Check if it's a JSON object or file path
      if (options.config.startsWith('{')) {
        config = { ...config, ...JSON.parse(options.config) };
      } else {
        const configManager = new ConfigurationManager();
        const fileConfig = await configManager.load(options.config);
        config = { ...config, ...fileConfig };
      }
      logger.info('Orchestrator Command', 'Loaded config from file', { path: options.config });
    } catch (error) {
      throw new ConfigurationError(`Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Override with command-line options
  if (options.prompt) {
    config.prompt = options.prompt;
  }
  if (options.run) {
    config.run = parseRunOption(options.run);
  }
  if (options.limit) {
    config.limits = parseLimitOption(options.limit);
  }

  return config;
}

/**
 * Parse the --run option format
 * Expected: prp-name#robo-role,second-prp-with-auto-role,third-prp#with-agent-name
 */
export function parseRunOption(runOption: string): PRPRunItem[] {
  if (!runOption || runOption.trim() === '') {
    throw new ConfigurationError(`Invalid --run format. Expected: prp-name#robo-role,second-prp...`);
  }

  try {
    const items = runOption.split(',');
    return items.map(item => {
      const trimmed = item.trim();
      if (!trimmed) {
        throw new Error('Empty item found');
      }

      const [prpName, role] = trimmed.split('#');
      if (!prpName?.trim()) {
        throw new Error('Missing PRP name');
      }

      return {
        name: prpName.trim(),
        role: role?.trim() ?? 'auto' // Default to auto if no role specified
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ConfigurationError(`Invalid --run format: ${errorMessage}. Expected: prp-name#robo-role,second-prp...`);
  }
}

/**
 * Parse the --limit option format
 * Expected: 1k,2k#robo-role,100usd10k#agent-name,2d10k-prp-name#role
 */
export function parseLimitOption(limitOption: string): LimitItem[] {
  if (!limitOption || limitOption.trim() === '') {
    throw new ConfigurationError(`Invalid --limit format. Expected: 1k,2k#robo-role,100usd10k#agent-name`);
  }

  try {
    const items = limitOption.split(',');
    return items.map(item => {
      const trimmedItem = item.trim();
      if (!trimmedItem) {
        throw new Error('Empty limit item found');
      }

      const [limitSpec, target] = trimmedItem.split('#');
      const trimmedSpec = limitSpec?.trim() ?? '';

      if (!trimmedSpec) {
        throw new Error('Missing limit specification');
      }

      // Parse limit spec: could be "1k", "100usd", "2d", "10k-prp-name"
      let type: 'tokens' | 'cost' | 'time' | 'custom';
      let value: number;
      let unit: string | undefined;
      let custom: string | undefined;

      // Check for cost limit (USD)
      if (trimmedSpec.includes('usd')) {
        type = 'cost';
        const parts = trimmedSpec.split('usd');
        value = parseInt(parts[0] ?? '0', 10);
        unit = undefined;
        custom = undefined;
      }
      // Check for custom limit with dash (must be checked before 'k' and 'd')
      else if (trimmedSpec.includes('-')) {
        type = 'custom';
        const dashIndex = trimmedSpec.indexOf('-');
        value = parseInt(trimmedSpec.substring(0, dashIndex), 10);
        custom = trimmedSpec.substring(dashIndex + 1);
        unit = undefined;
      }
      // Check for time limit (days, but not when combined with 'k')
      else if (trimmedSpec.endsWith('d') && !trimmedSpec.includes('k')) {
        type = 'time';
        value = parseInt(trimmedSpec.replace('d', ''), 10);
        unit = 'days';
        custom = undefined;
      }
      // Check for token limit (k for thousands)
      else if (trimmedSpec.endsWith('k')) {
        type = 'tokens';
        value = parseInt(trimmedSpec.replace('k', ''), 10);
        unit = 'thousands';
        custom = undefined;
      }
      else {
        throw new Error(`Unrecognized limit format: ${trimmedSpec}`);
      }

      if (isNaN(value) || value <= 0) {
        throw new Error(`Invalid numeric value in limit: ${trimmedSpec}`);
      }

      return {
        type,
        value,
        unit,
        custom,
        target: target?.trim() ?? 'global' // Default to global if no target specified
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ConfigurationError(`Invalid --limit format: ${errorMessage}. Expected: 1k,2k#robo-role,100usd10k#agent-name`);
  }
}

/**
 * Start orchestrator with parsed options
 */
async function startOrchestrator(engine: { initialize(): Promise<void>; runPRPs?(run: string): Promise<void>; startInteractive?(): Promise<void> }, options: OrchestratorOptions): Promise<void> {
  try {
    // Initialize orchestrator
    await engine.initialize();

    // Run specified PRPs if provided
    if (options.run && engine.runPRPs) {
      logger.info('Orchestrator Command', 'Running specified PRPs', { run: options.run });
      await engine.runPRPs(options.run);
    } else if (engine.startInteractive) {
      // Start interactive orchestrator mode
      logger.info('Orchestrator Command', 'Starting interactive orchestrator mode');
      await engine.startInteractive();
    }

  } catch (error) {
    throw new ConfigurationError(`Failed to start orchestrator: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export for use in main CLI
export { createOrchestratorCommand as default, handleOrchestratorCommand };