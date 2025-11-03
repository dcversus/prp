#!/usr/bin/env node

/**
 * Lint Command Implementation
 *
 * Provides code linting and formatting functionality
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';
import type { CommandResult } from '../types';

interface LintOptions {
  fix?: boolean;
  format?: boolean;
  quiet?: boolean;
}

/**
 * Create lint command for CLI
 */
export function createLintCommand(): Command {
  const lintCmd = new Command('lint')
    .description('Run linting and code quality checks')
    .option('-f, --fix', 'automatically fix linting issues')
    .option('--format', 'format code after linting')
    .option('-q, --quiet', 'only show errors')
    .action(async (options: LintOptions) => {
      await handleLintCommand(options);
    });

  return lintCmd;
}

/**
 * Handle lint command execution
 */
async function handleLintCommand(options: LintOptions): Promise<void> {
  logger.info('🔍 Running linting');

  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute lint command
    const result = await cli.run(['lint'], options);

    if (result.success) {
      logger.success('✅ Linting completed successfully');
    } else {
      logger.error('❌ Linting failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Linting failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createLintCommand as default };