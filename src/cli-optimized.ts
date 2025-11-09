#!/usr/bin/env node

/**
 * Performance-optimized CLI entry point with lazy loading
 * Target startup time: <2 seconds
 * Target memory usage: <50MB normal operations
 */

import { performanceMonitor } from './performance/monitor.js';
import { lazy, lazyCommands, ModulePreloader, ConditionalLoader } from './performance/lazy-loader.js';
import { performanceCache } from './performance/cache.js';
import { logger } from './utils/logger.js';

// Define proper types for CLI options and program
interface CLIOptions {
  name?: string;
  description?: string;
  author?: string;
  email?: string;
  template?: string;
  interactive?: boolean;
  yes?: boolean;
  license?: string;
  git?: boolean;
  install?: boolean;
}

interface Command {
  command: string;
  desc?: string;
  handler: (args: string[]) => Promise<void> | void;
  args?: string[];
  processedArgs?: string[];
  commands?: Map<string, unknown>;
  options?: Map<string, unknown>;
  // Add other required properties that Commander's Command has
  addCommand?: (cmd: Command, opts?: unknown) => Command;
  parse?: (args?: string[]) => Command;
  action?: (handler: (options: CLIOptions) => Promise<void>) => Command;
  option?: (flags: string, description: string) => Command;
  name?: (name: string) => Command;
  description?: (description: string) => Command;
  version?: (version: string) => Command;
}

interface Program {
  name: (name: string) => Program;
  description: (description: string) => Program;
  version: (version: string) => Program;
  option: (flags: string, description: string) => Program;
  action: (handler: (options: CLIOptions) => Promise<void>) => Program;
  addCommand: (command: Command) => Program;
  parse: (args?: string[]) => Program;
}

// Start performance measurement immediately
performanceMonitor.startMeasurement();

// Optimized CLI class with lazy loading
export class OptimizedCLI {
  private initialized = false;

  constructor() {
    // Warm up caches early
    performanceCache.warmUpCache();

    // Add critical modules to preload queue
    ModulePreloader.addToPreload(() => import('commander'));

    // Start preloading in background (non-blocking)
    ModulePreloader.preloadCritical().catch((error) => logger.warn('Failed to preload critical modules:', error));
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Lazy load Commander only when needed
      const { Command } = await lazy(() => import('commander')).load();

      // Create program with lazy-loaded commands
      const program = new Command();

      program
        .name('prp')
        .description('Interactive Project Bootstrap CLI - Modern scaffolding tool with AI integration')
        .version('0.4.9')
        .option('-n, --name <name>', 'project name')
        .option('-d, --description <description>', 'project description')
        .option('-a, --author <author>', 'author name')
        .option('-e, --email <email>', 'author email')
        .option('-t, --template <template>', 'project template (fastapi, nestjs, react, typescript-lib, wikijs, none)')
        .option('--no-interactive', 'run in non-interactive mode')
        .option('--yes', 'use default values for all options')
        .option('--license <license>', 'license type (default: MIT)')
        .option('--no-git', 'skip git initialization')
        .option('--no-install', 'skip dependency installation')
        .action(async (options) => {
          await this.handleMainCommand(options);
        });

      // Add lazy-loaded subcommands
      await this.addLazyCommands(program as unknown as Program);

      // Parse arguments
      program.parse();

      this.initialized = true;

      // Record startup time
      const startupTime = performanceMonitor.recordStartupTime();
      logger.debug(`CLI initialized in ${startupTime}ms`);

    } catch (error) {
      logger.error('Failed to initialize CLI:', error);
      process.exit(1);
    }
  }

  private async handleMainCommand(options: CLIOptions): Promise<void> {
    try {
      if (options.interactive) {
        // Lazy load React UI only when needed
        const { render } = await lazy(() => import('ink')).load();
        const React = await lazy(() => import('react')).load();
        const App = await ConditionalLoader.loadUI('App');

        render(React.createElement(App.default ?? App, { options }));
      } else {
        // Lazy load non-interactive mode
        const NonInteractive = await ConditionalLoader.loadUI('NonInteractive');
        await NonInteractive.runNonInteractive(options);
      }
    } catch (error) {
      logger.error('Error handling command:', error);
      process.exit(1);
    }
  }

  private async addLazyCommands(program: Program): Promise<void> {
    const commandNames = Object.keys(lazyCommands);

    for (const commandName of commandNames) {
      try {
        // Load command module only when command is used
        program.addCommand({
          command: commandName,
          desc: `${commandName} command`,
          handler: async (args: string[]) => {
            const commandModule = await ConditionalLoader.loadCommand(commandName);
            const commandFunction = commandModule[`create${commandName.charAt(0).toUpperCase() + commandName.slice(1)}Command`];

            if (commandFunction) {
              const command = commandFunction();
              program.addCommand(command);
              // Re-parse to execute the command
              program.parse(args);
            }
          }
        });
      } catch (error) {
        logger.warn(`Failed to add command ${commandName}:`, error);
      }
    }
  }

  getPerformanceMetrics() {
    return performanceMonitor.getCurrentMetrics();
  }

  getPerformanceReport() {
    return performanceMonitor.generateReport();
  }
}

// Optimized execution with performance monitoring
async function runOptimizedCLI(): Promise<void> {
  const cli = new OptimizedCLI();

  try {
    await cli.initialize();

    // Check performance thresholds
    const thresholdStatus = performanceMonitor.checkThresholds();
    if (!thresholdStatus.passed) {
      logger.warn('Performance thresholds exceeded:', thresholdStatus.violations);
    }

  } catch (error) {
    logger.error('CLI execution failed:', error);
    process.exit(1);
  }
}

// Handle process cleanup
process.on('exit', () => {
  // Cleanup caches
  performanceCache.clearAll();
});

process.on('SIGINT', () => {
  logger.info('\nShutting down gracefully...');
  performanceCache.clearAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  performanceCache.clearAll();
  process.exit(0);
});

// Run the optimized CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runOptimizedCLI().catch((error) => logger.error('CLI execution failed:', error));
}

export { runOptimizedCLI };