#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from '../shared/logger.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { runTUIInit } from './tui-init.js';

export interface InitOptions {
  prompt?: string;
  projectName?: string;
  template?: string;
  force?: boolean;
  default?: boolean;
  ci?: boolean;
  debug?: boolean;
  logLevel?: string;
  noColor?: boolean;
  logFile?: string;
}

export function createInitCommand(): Command {
  const initCmd = new Command('init')
    .description('Initialize a new PRP project')
    .argument('[projectName]', 'project name (optional)')
    .option('-p, --prompt <string>', 'Project base prompt from what project start auto build')
    .option('-n, --project-name <string>', 'Project name')
    .option(
      '--template <type>',
      'Project template (none|typescript|react|fastapi|wikijs|nestjs)',
      'none'
    )
    .option('--default', 'Go with default options without stopping')
    .option('--force', 'Overwrite existing files and apply all with overwrite')
    .action(async (projectName: string | undefined, options: InitOptions, command: Command) => {
      const args = process.argv.slice(2);
      if (args.includes('--help') || args.includes('-h')) {
        return;
      }

      const globalOptions = command.parent?.opts() ?? {};
      const mergedOptions = { ...globalOptions, ...options };

      await handleInitCommand(mergedOptions, projectName);
    });

  return initCmd;
}

async function handleInitCommand(options: InitOptions, projectName?: string): Promise<void> {
  if (options.debug) {
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

    if (prprcExists && !options.force) {
      logger.error(
        'shared',
        'InitCommand',
        `PRP project already exists in ${targetDir}`,
        new Error('Project already exists')
      );
      logger.info(
        'shared',
        'InitCommand',
        'Use --force to overwrite or choose a different directory',
        {}
      );
      process.exit(1);
    }

    // Always use TUI init - it handles both TUI and CI modes properly
    await runTUIInit({
      projectName: projectName ?? options.projectName,
      template: options.template,
      prompt: options.prompt,
      force: options.force ?? false,
      ci: options.ci ?? false,
      debug: options.debug ?? false
    });
  } catch (error) {
    logger.error(
      'shared',
      'InitCommand',
      `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}


export { handleInitCommand };
