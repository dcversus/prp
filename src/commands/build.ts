#!/usr/bin/env node

/**
 * Build Command Implementation
 *
 * Provides project building with compilation and optimization
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';

interface BuildOptions {
  mode?: string;
  output?: string;
  clean?: boolean;
  sourcemap?: boolean;
  minify?: boolean;
  watch?: boolean;
}

/**
 * Create build command for CLI
 */
export function createBuildCommand(): Command {
  const buildCmd = new Command('build')
    .description('Build the project with compilation and optimization')
    .option('-m, --mode <mode>', 'build mode (development, production)', 'production')
    .option('-o, --output <dir>', 'output directory', 'dist')
    .option('--no-clean', 'skip cleaning output directory')
    .option('--no-sourcemap', 'skip source map generation')
    .option('--no-minify', 'skip minification')
    .option('-w, --watch', 'watch for changes and rebuild')
    .action(async (options: BuildOptions) => {
      await handleBuildCommand(options);
    });

  return buildCmd;
}

/**
 * Handle build command execution
 */
async function handleBuildCommand(options: BuildOptions): Promise<void> {
  logger.info('🔨 Building project');

  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();

    // Execute build command
    const result = await cli.run(['build'], options);

    if (result.success) {
      logger.success('✅ Build completed successfully');
    } else {
      logger.error('❌ Build failed');
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(1);
    }

  } catch (error) {
    logger.error('Build failed:', error);
    process.exit(1);
  }
}

// Export for use in main CLI
export { createBuildCommand as default };