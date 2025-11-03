#!/usr/bin/env node

/**
 * Config Command Implementation
 *
 * Provides configuration management functionality
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';

interface ConfigOptions {
  get?: string;
  set?: string;
  delete?: string;
  list?: boolean;
}

/**
 * Create config command for CLI
 */
export function createConfigCommand(): Command {
  const configCmd = new Command('config')
    .description('Manage project configuration')
    .option('-g, --get <key>', 'get configuration value')
    .option('-s, --set <key=value>', 'set configuration value')
    .option('-d, --delete <key>', 'delete configuration key')
    .option('-l, --list', 'list all configuration values')
    .action(async (options: ConfigOptions) => {
      await handleConfigCommand(options);
    });

  return configCmd;
}

/**
 * Handle config command execution
 */
async function handleConfigCommand(options: ConfigOptions): Promise<void> {
  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute config command
    const result = await cli.run(['config'], options);

    if (result.success) {
      logger.info(result.stdout || 'Configuration operation completed successfully');
    } else {
      logger.error('❌ Configuration operation failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Config command failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createConfigCommand as default };