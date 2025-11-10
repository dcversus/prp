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
  noInteractive?: boolean;
  interactive?: boolean; // Commander passes --no-interactive as interactive:false
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

    if (options.ci || options.default || options.noInteractive || options.interactive === false) {
      // For CI, default, or non-interactive mode, use basic scaffolding
      if (options.template && options.template !== 'none') {
        logger.info('shared', 'InitCommand', `Creating ${options.template} project in ${targetDir}`, {});
        // TODO: Implement basic scaffolding service for non-interactive mode
        logger.info('shared', 'InitCommand', 'Non-interactive scaffolding not yet implemented', {});
      } else {
        logger.info('shared', 'InitCommand', 'No template specified or using none, creating basic project structure', {});
        // Create basic project structure
        await createBasicProjectStructure(targetDir, options.template);
      }
    } else {
      await runTUIInit({
        projectName: projectName ?? options.projectName,
        template: options.template,
        prompt: options.prompt,
        force: options.force ?? false,
        ci: options.ci ?? false,
        debug: options.debug ?? false
      });
    }
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

async function createBasicProjectStructure(targetDir: string, template?: string): Promise<void> {
  try {
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Create basic .prprc file
    const prprcContent = {
      name: path.basename(targetDir),
      template: template || 'none',
      created: new Date().toISOString(),
      version: '0.5.0'
    };

    await fs.writeFile(
      path.join(targetDir, '.prprc'),
      JSON.stringify(prprcContent, null, 2),
      'utf8'
    );

    logger.info('shared', 'InitCommand', `Basic project structure created in ${targetDir}`, {});
  } catch (error) {
    throw new Error(`Failed to create project structure: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export { handleInitCommand };
