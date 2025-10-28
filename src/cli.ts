#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './ui/App.js';

const program = new Command();

program
  .name('prp')
  .description('Interactive Project Bootstrap CLI - Modern scaffolding tool with AI integration')
  .version('0.1.0')
  .option('-n, --name <name>', 'project name')
  .option('-d, --description <description>', 'project description')
  .option('-a, --author <author>', 'author name')
  .option('-e, --email <email>', 'author email')
  .option('-t, --template <template>', 'project template (fastapi, nestjs, react, typescript-lib, none)')
  .option('--no-interactive', 'run in non-interactive mode')
  .option('--yes', 'use default values for all options')
  .option('--license <license>', 'license type (default: MIT)')
  .option('--no-git', 'skip git initialization')
  .option('--no-install', 'skip dependency installation')
  .action((options) => {
    if (options.interactive) {
      // Interactive mode with Ink UI
      render(React.createElement(App, { options }));
    } else {
      // Non-interactive mode
      console.log('Non-interactive mode not yet implemented');
      console.log('Options:', options);
      process.exit(1);
    }
  });

program.parse();
