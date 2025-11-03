#!/usr/bin/env node

/**
 * Initialization Command Implementation
 *
 * Provides comprehensive project initialization with wizard
 * and template support.
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';

interface InitOptions {
  name?: string;
  description?: string;
  author?: string;
  email?: string;
  template?: string;
  license?: string;
  git?: boolean;
  install?: boolean;
  interactive?: boolean;
  yes?: boolean;
}

/**
 * Create init command for CLI
 */
export function createInitCommand(): Command {
  const initCmd = new Command('init')
    .description('Initialize a new PRP project or upgrade existing project')
    .option('-n, --name <name>', 'project name')
    .option('-d, --description <description>', 'project description')
    .option('-a, --author <author>', 'author name')
    .option('-e, --email <email>', 'author email')
    .option('-t, --template <template>', 'project template (node, react, next, express, python, django, fastapi, go, cli, library)')
    .option('-l, --license <license>', 'license type (default: MIT)', 'MIT')
    .option('--no-git', 'skip git initialization')
    .option('--no-install', 'skip dependency installation')
    .option('--no-interactive', 'run in non-interactive mode')
    .option('--yes', 'use default values for all options')
    .action(async (options: InitOptions) => {
      await handleInitCommand(options);
    });

  return initCmd;
}

/**
 * Handle init command execution
 */
async function handleInitCommand(options: InitOptions): Promise<void> {
  logger.info('🚀 Initializing PRP Project');

  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute init command
    const result = await cli.run(['init'], options);

    if (result.success) {
      logger.success('✅ Project initialized successfully');
    } else {
      logger.error('❌ Project initialization failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Initialization failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createInitCommand as default };