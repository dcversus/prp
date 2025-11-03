#!/usr/bin/env node

/**
 * Test Command Implementation
 *
 * Provides testing functionality with coverage and reporting
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';
import type { CommandResult } from '../types';

interface TestOptions {
  type?: string;
  coverage?: boolean;
  watch?: boolean;
  parallel?: boolean;
  environment?: string;
}

/**
 * Create test command for CLI
 */
export function createTestCommand(): Command {
  const testCmd = new Command('test')
    .description('Run tests with coverage and reporting')
    .option('-t, --type <type>', 'test type (unit, integration, e2e, all)', 'all')
    .option('-c, --coverage', 'generate coverage report')
    .option('-w, --watch', 'watch for changes and re-run tests')
    .option('--no-parallel', 'run tests sequentially')
    .option('-e, --environment <env>', 'test environment (node, jsdom)', 'node')
    .action(async (options: TestOptions) => {
      await handleTestCommand(options);
    });

  return testCmd;
}

/**
 * Handle test command execution
 */
async function handleTestCommand(options: TestOptions): Promise<void> {
  logger.info('🧪 Running tests');

  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute test command
    const result = await cli.run(['test'], options);

    if (result.success) {
      logger.success('✅ All tests passed');
    } else {
      logger.error('❌ Tests failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createTestCommand as default };