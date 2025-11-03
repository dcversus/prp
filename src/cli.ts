#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './ui/App.js';
import { createNudgeCommand } from './commands/nudge.js';
import { createTUICommand } from './commands/tui.js';
import { createDebugCommand } from './commands/debug.js';
import { createInitCommand } from './commands/init.js';
import { createBuildCommand } from './commands/build.js';
import { createTestCommand } from './commands/test.js';
import { createLintCommand } from './commands/lint.js';
import { createQualityCommand } from './commands/quality.js';
import { createStatusCommand } from './commands/status.js';
import { createConfigCommand } from './commands/config.js';
import { createCICommand } from './commands/ci.js';
import { createDeployCommand } from './commands/deploy.js';

const program = new Command();

program
  .name('prp')
  .description('Interactive Project Bootstrap CLI - Modern scaffolding tool with AI integration')
  .version('0.4.9')
  .option('-n, --name <name>', 'project name')
  .option('-d, --description <description>', 'project description')
  .option('-a, --author <author>', 'author name')
  .option('-e, --email <email>', 'author email')
  .option(
    '-t, --template <template>',
    'project template (fastapi, nestjs, react, typescript-lib, wikijs, none)'
  )
  .option('--no-interactive', 'run in non-interactive mode')
  .option('--yes', 'use default values for all options')
  .option('--license <license>', 'license type (default: MIT)')
  .option('--no-git', 'skip git initialization')
  .option('--no-install', 'skip dependency installation')
  .action(async (options) => {
    if (options.interactive) {
      // Interactive mode with Ink UI
      render(React.createElement(App, { options }));
    } else {
      // Non-interactive mode
      const { runNonInteractive } = await import('./nonInteractive.js');
      await runNonInteractive(options);
    }
  });

// Add all subcommands
program.addCommand(createNudgeCommand());
program.addCommand(createTUICommand());
program.addCommand(createDebugCommand());
program.addCommand(createInitCommand());
program.addCommand(createBuildCommand());
program.addCommand(createTestCommand());
program.addCommand(createLintCommand());
program.addCommand(createQualityCommand());
program.addCommand(createStatusCommand());
program.addCommand(createConfigCommand());
program.addCommand(createCICommand());
program.addCommand(createDeployCommand());

program.parse();
