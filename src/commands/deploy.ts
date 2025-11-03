#!/usr/bin/env node

/**
 * Deploy Command Implementation
 *
 * Provides deployment functionality
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';
import type { CommandResult } from '../types';

interface DeployOptions {
  environment?: string;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Create deploy command for CLI
 */
export function createDeployCommand(): Command {
  const deployCmd = new Command('deploy')
    .description('Deploy the application')
    .option('-e, --environment <env>', 'target environment (development, staging, production)', 'production')
    .option('-d, --dry-run', 'perform deployment dry run')
    .option('-f, --force', 'force deployment without confirmation')
    .action(async (options: DeployOptions) => {
      await handleDeployCommand(options);
    });

  return deployCmd;
}

/**
 * Handle deploy command execution
 */
async function handleDeployCommand(options: DeployOptions): Promise<void> {
  logger.info('🚀 Deploying application');

  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute deploy command
    const result = await cli.run(['deploy'], options);

    if (result.success) {
      logger.success('✅ Deployment completed successfully');
    } else {
      logger.error('❌ Deployment failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createDeployCommand as default };