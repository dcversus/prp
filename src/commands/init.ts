#!/usr/bin/env node

/**
 * Initialization Command Implementation
 *
 * Provides comprehensive project initialization with wizard
 * and template support using the new ScaffoldingService.
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import * as path from 'path';
import { runTUIInit } from './tui-init.js';

interface InitOptions {
  // PRP-001 required options
  prompt?: string;
  projectName?: string;
  template?: string;
  force?: boolean;
  // Global flags
  ci?: boolean;
  debug?: boolean;
}


/**
 * Create init command for CLI
 */
export function createInitCommand(): Command {
  const initCmd = new Command('init')
    .description('Initialize a new PRP project')
    .argument('[projectName]', 'project name (optional)')
    // PRP-001 required options
    .option('--prompt <string>', 'Project base prompt from what project start auto build')
    .option('--project-name <string>', 'Project name (alternative to positional argument)')
    .option('--template <template>', 'project template (react, nestjs, wikijs, typescript, none)')
    .option('--force', 'Force initialization even in non-empty directories')
    // Global flags
    .option('--ci', 'Run in CI mode with JSON output')
    .option('--debug', 'Enable debug logging')
    .action(async (projectName: string | undefined, options: InitOptions, command: Command) => {
      // Check if help is being requested - if so, let Commander handle it
      const args = process.argv.slice(2);
      if (args.includes('--help') || args.includes('-h')) {
        return; // Let Commander's built-in help handler take over
      }

      // Merge global options from parent command
      const globalOptions = command.parent?.opts() || {};
      const mergedOptions = { ...globalOptions, ...options };

      await handleInitCommand(mergedOptions, projectName);
    });

  return initCmd;
}

/**
 * Handle init command execution
 */
async function handleInitCommand(options: InitOptions, projectName?: string): Promise<void> {
  // Set debug logging if debug flag is provided
  if (options.debug) {
    process.env.DEBUG = 'true';
    process.env.VERBOSE_MODE = 'true';
  }

  try {
    // Determine the target directory to check for .prprc
    const targetDir = projectName || '.';
    const prprcPath = path.join(targetDir, '.prprc');

    // Check if .prprc exists
    let prprcExists = false;
    try {
      await fs.access(prprcPath);
      prprcExists = true;
    } catch {
      prprcExists = false;
    }

    // If .prprc exists in target directory and not forced, prompt for re-initialization
    if (prprcExists && !options.force && !options.ci) {
      // In TUI mode, we can still proceed to ask user if they want to re-initialize
      // The TUI will handle showing appropriate messages
    }

    // Start TUI init - NO LOGS to keep TUI clean
    await runTUIInit({
      projectName: projectName,
      prompt: options.prompt,
      template: options.template,
      force: options.force,
      ci: options.ci,
      debug: options.debug,
      existingProject: prprcExists
    });

  } catch (error) {
    // Only show error if not in TUI mode
    if (options.ci) {
      logger.error('Initialization failed:', error);
    }
    process.exit(1);
  }
}











// Export for use in main CLI
export { createInitCommand as default, handleInitCommand };