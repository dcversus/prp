#!/usr/bin/env node
import { promises as fs } from 'fs';
import * as path from 'path';

import { Command } from 'commander';

import { logger, initializeLogger } from '../shared/logger';

import { runTUIInit, type TUIInitOptions } from './tui-init';

import type { CommanderOptions, GlobalCLIOptions } from '../cli/types';


export interface InitOptions extends GlobalCLIOptions {
  prompt?: string;
  projectName?: string;
  template?: string;
  force?: boolean;
  default?: boolean;
}
export const createInitCommand = (): Command => {
  /**
   * Create and return the init command with all options and handlers
   * @returns Configured commander Command instance
   */
  const initCmd = new Command('init')
    .description('Initialize a new PRP project')
    .argument('[projectName]', 'project name (optional)')
    .option('-p, --prompt <string>', 'Project base prompt from what project start auto build')
    .option('-n, --project-name <string>', 'Project name')
    .option(
      '--template <type>',
      'Project template (none|typescript|react|fastapi|wikijs|nestjs)',
      'none',
    )
    .option('--default', 'Go with default options without stopping')
    .option('--force', 'Overwrite existing files and apply all with overwrite')
    .action(
      async (
        projectName: string | undefined,
        options: InitOptions,
        command: Command,
      ): Promise<void> => {
        const args = process.argv.slice(2);
        if (args.includes('--help') || args.includes('-h')) {
          return;
        }
        const globalOptions = (command.parent?.opts() as CommanderOptions<GlobalCLIOptions>) ?? {};
        const mergedOptions = { ...globalOptions, ...options };
        await handleInitCommand(mergedOptions, projectName);
      },
    );
  return initCmd;
}
const handleInitCommand = async (options: InitOptions, projectName?: string): Promise<void> => {
  // Initialize logger with proper context
  initializeLogger({
    ci: options.ci,
    debug: options.debug,
    logLevel: options.logLevel,
    logFile: options.logFile,
    noColor: options.noColor,
    tuiMode: !(options.ci ?? false), // TUI mode unless CI is explicitly requested
  });

  if (options.debug === true) {
    process.env.DEBUG = 'true';
    process.env.VERBOSE_MODE = 'true';
  }
  try {
    const targetDir = projectName ?? '.';
    const prprcPath = path.join(targetDir, '.prprc');
    let prprcExists = false;
    try {
      await fs.access(prprcPath);
      prprcExists = true;
    } catch {
      prprcExists = false;
    }

    // Handle CI mode with existing project
    if (options.ci === true && prprcExists === true && options.force !== true) {
      const ciOutput = {
        success: false,
        error: 'PRP project already exists in this directory',
        project: {
          name: path.basename(process.cwd()),
          path: process.cwd(),
        },
        force: true,
        message: 'Use --force to overwrite the existing project',
      };
      process.stdout.write(`${JSON.stringify(ciOutput, null, 2)  }\n`);
      process.exit(1);
    }

    // Always use TUI init - it handles both TUI and CI modes properly
    const initOptions: TUIInitOptions = {
      existingProject: prprcExists === true && options.force !== true,
    };

    if (projectName && projectName.trim() !== '') {
      initOptions.projectName = projectName;
    } else if (options.projectName && options.projectName.trim() !== '') {
      initOptions.projectName = options.projectName;
    }
    if (options.template && options.template.trim() !== '') {
      initOptions.template = options.template;
    }
    if (options.prompt && options.prompt.trim() !== '') {
      initOptions.prompt = options.prompt;
    }
    if (options.force !== undefined) {
      initOptions.force = options.force;
    }
    if (options.ci !== undefined) {
      initOptions.ci = options.ci;
    }
    if (options.debug !== undefined) {
      initOptions.debug = options.debug;
    }

    await runTUIInit(initOptions);
  } catch (error) {
    logger.error(
      'shared',
      'InitCommand',
      `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error)),
    );
    process.exit(1);
  }
}
export { handleInitCommand };
