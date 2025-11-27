#!/usr/bin/env node

import { Command } from 'commander';

import { logger, initializeLogger } from '../shared/logger';

import type { CommanderOptions, GlobalCLIOptions } from '../cli/types';

interface ConfigOptions extends GlobalCLIOptions {
  set?: string;
  get?: string;
  list?: boolean;
  reset?: boolean;
}

/**
 * Create and return the config command
 */
export const createConfigCommand = (): Command => {
  const configCmd = new Command('config')
    .description('Manage PRP configuration')
    .option('--set <key=value>', 'Set configuration value')
    .option('--get <key>', 'Get configuration value')
    .option('--list', 'List all configuration values', false)
    .option('--reset', 'Reset configuration to defaults', false)
    .action(async (options: ConfigOptions, command: Command) => {
      const globalOptions = (command.parent?.opts() as CommanderOptions<ConfigOptions>) ?? {};
      const mergedOptions = { ...globalOptions, ...options };
      await handleConfigCommand(mergedOptions);
    });

  return configCmd;
};

/**
 * Handle config command execution
 */
export const handleConfigCommand = async (options: ConfigOptions): Promise<void> => {
  initializeLogger({
    ci: options.ci,
    debug: options.debug,
    logLevel: options.logLevel,
    logFile: options.logFile,
    noColor: options.noColor,
    tuiMode: !(options.ci ?? false),
  });

  logger.info('cli', 'ConfigCommand', 'Managing configuration', {
    set: options.set,
    get: options.get,
    list: options.list,
    reset: options.reset,
  });

  // TODO: Implement actual config management logic
  if (options.list) {
    logger.info('cli', 'ConfigCommand', 'Configuration listing...');
  }
  if (options.get) {
    logger.info('cli', 'ConfigCommand', `Getting config for: ${options.get}`);
  }
  if (options.set) {
    logger.info('cli', 'ConfigCommand', `Setting config: ${options.set}`);
  }
  if (options.reset) {
    logger.info('cli', 'ConfigCommand', 'Resetting configuration to defaults');
  }
};

export type { ConfigOptions };