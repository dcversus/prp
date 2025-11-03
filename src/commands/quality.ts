#!/usr/bin/env node

/**
 * Quality Command Implementation
 *
 * Provides quality gates and validation functionality
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';

interface QualityOptions {
  strict?: boolean;
  gates?: string[];
  skip?: string[];
}

/**
 * Create quality command for CLI
 */
export function createQualityCommand(): Command {
  const qualityCmd = new Command('quality')
    .description('Run quality gates and validation checks')
    .option('-s, --strict', 'enable strict quality mode')
    .option('-g, --gates <gates>', 'comma-separated list of quality gates to run')
    .option('--skip <gates>', 'comma-separated list of quality gates to skip')
    .action(async (options: QualityOptions) => {
      await handleQualityCommand(options);
    });

  return qualityCmd;
}

/**
 * Handle quality command execution
 */
async function handleQualityCommand(options: QualityOptions): Promise<void> {
  logger.info('🛡️ Running quality gates');

  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute quality command
    const result = await cli.run(['quality'], options as Record<string, unknown>);

    if (result.success) {
      logger.success('✅ All quality gates passed');
    } else {
      logger.error('❌ Quality gates failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Quality gate execution failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createQualityCommand as default };