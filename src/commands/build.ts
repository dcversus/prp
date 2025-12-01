#!/usr/bin/env node

import { Command } from 'commander';

import { logger, initializeLogger } from '../shared/logger';

import type { CommanderOptions, GlobalCLIOptions } from '../cli/types';

interface BuildOptions extends GlobalCLIOptions {
  production?: boolean;
  watch?: boolean;
  clean?: boolean;
}

/**
 * Create and return the build command
 */
 
export const createBuildCommand = (): Command => {
  const buildCmd = new Command('build')
    .description('Build the PRP project')
    .option('--production', 'Build for production', false)
    .option('--watch', 'Enable watch mode', false)
    .option('--clean', 'Clean build artifacts before building', false)
    .action(async (options: BuildOptions, command: Command) => {
      const globalOptions = (command.parent?.opts() as CommanderOptions<BuildOptions>) ?? {};
      const mergedOptions = { ...globalOptions, ...options };
      await handleBuildCommand(mergedOptions);
    });

  return buildCmd;
};

/**
 * Handle build command execution
 */
export const handleBuildCommand = async (options: BuildOptions): Promise<void> => {
  initializeLogger({
    ci: options.ci,
    debug: options.debug,
    logLevel: options.logLevel,
    logFile: options.logFile,
    noColor: options.noColor,
    tuiMode: !(options.ci ?? false),
  });

  logger.info('cli', 'BuildCommand', 'Starting build process', {
    production: options.production,
    watch: options.watch,
    clean: options.clean,
  });

  // TODO: Implement actual build logic
  logger.info('cli', 'BuildCommand', 'Build completed successfully');
};

export type { BuildOptions };