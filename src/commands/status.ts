#!/usr/bin/env node

/**
 * Status Command Implementation
 *
 * Provides project status and system information
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';
import type { CommandResult } from '../types';

interface StatusOptions {
  json?: boolean;
  verbose?: boolean;
}

/**
 * Create status command for CLI
 */
export function createStatusCommand(): Command {
  const statusCmd = new Command('status')
    .description('Show project and system status')
    .option('-j, --json', 'output status in JSON format')
    .option('-v, --verbose', 'show detailed status information')
    .action(async (options: StatusOptions) => {
      await handleStatusCommand(options);
    });

  return statusCmd;
}

/**
 * Handle status command execution
 */
async function handleStatusCommand(options: StatusOptions): Promise<void> {
  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute status command
    const result = await cli.run(['status'], options);

    if (result.success) {
      logger.info(result.stdout || 'Status retrieved successfully');
    } else {
      logger.error('❌ Status retrieval failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Status command failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createStatusCommand as default };