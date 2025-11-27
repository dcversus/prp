#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

import { watch } from 'chokidar';
import { Command } from 'commander';

import { logger } from '../shared/logger';
import { EventBus } from '../shared/events';
import { EnhancedGitWorktreeMonitor } from '../scanner/enhanced-git-worktree-monitor';

import type { GlobalCLIOptions, CommanderOptions } from '../cli/types';

type NodeTimeout = ReturnType<typeof setTimeout>;

const execAsync = promisify(exec);

// Helper function to conditionally log only in CI mode
const logCI = (message: string, data?: Record<string, unknown>) => {
  if (process.argv.includes('--ci')) {
    logger.info('cli', 'DevCommand', message, data);
  }
};

interface DevOptions extends GlobalCLIOptions {
  branch?: string;
  worktree?: string;
  watch?: boolean;
}

/**
 * Development configuration interface
 */
interface DevConfig {
  currentBranch: string;
  isMainBranch: boolean;
  worktreeMode: boolean;
  worktreePath?: string;
  mainWorktreePath?: string;
  orchestratorMode: boolean;
  hotReload: boolean;
}

/**
 * Create development command with watch support and worktree logic
 */
export const createDevCommand = (): Command => {
  const devCmd = new Command('dev')
    .description('Start development mode with hot reload and worktree support')
    .option('--branch <branch>', 'Specify branch to work on (auto-detected if not provided)')
    .option('--worktree <path>', 'Specify worktree path for non-main branches')
    .option('--ci', 'Run in CI mode with JSON output')
    .option('--debug', 'Enable debug logging')
    .option('--watch', 'Enable watch mode with hot reload (default: true)')
    .action(async (options: DevOptions, command: Command) => {
      const args = process.argv.slice(2);
      if (args.includes('--help') || args.includes('-h')) {
        return;
      }

      const globalOptions = (command.parent?.opts() as CommanderOptions<GlobalCLIOptions>) ?? {};
      const mergedOptions = {
        ...globalOptions,
        ...options,
        watch: options.watch ?? (process.env.PRP_DEV_WATCH === 'true'),
      };

      await handleDevCommand(mergedOptions);
    });

  return devCmd;
}

/**
 * Main development command handler
 */
const handleDevCommand = async (options: DevOptions): Promise<void> => {
  // Check if CI mode is enabled - if so, log normally, otherwise keep console clean
  if (options.debug === true) {
    process.env.DEBUG = 'true';
    process.env.VERBOSE_MODE = 'true';
    // Only log in CI mode
    logCI('Development mode started with debug logging', {});
  }

  const devConfig = await determineDevConfig(options);

  logCI('Development configuration determined', {
    branch: devConfig.currentBranch,
    isMainBranch: devConfig.isMainBranch,
    worktreeMode: devConfig.worktreeMode,
    worktreePath: devConfig.worktreePath,
    hotReload: devConfig.hotReload,
  });

  // Setup worktree if needed
  if (devConfig.worktreeMode === true && devConfig.worktreePath !== undefined && devConfig.worktreePath.length > 0) {
    await setupWorktree(devConfig);
  }

  // Start development server with hot reload
  if (options.watch === true || devConfig.hotReload === true) {
    await startDevServerWithWatch(devConfig, options);
  } else {
    await startDevServer(devConfig, options);
  }
}

/**
 * Determine development configuration based on git state and options
 */
const determineDevConfig = async (options: DevOptions): Promise<DevConfig> => {
  try {
    // Get current branch
    const { stdout: branchOutput } = await execAsync('git branch --show-current');
    const currentBranch = branchOutput.trim() ?? options.branch ?? 'main';

    // Check if it's main branch
    const isMainBranch = currentBranch === 'main' || currentBranch === 'master';

    // Get worktree information
    const { stdout: worktreeList } = await execAsync('git worktree list');
    const worktreeLines = worktreeList.trim().split('\n');

    // Find current worktree and main worktree
    const currentWorktreePath = process.cwd();
    let mainWorktreePath: string | undefined;

    for (const line of worktreeLines) {
      const match = line.match(/^([^\s]+)\s+([a-f0-9]+)(?:\s+\[([^\]]+)\])?$/);
      if (match) {
        const [, path, , branch] = match;
        if (branch === 'main' || branch === 'master') {
          mainWorktreePath = path;
        }
      }
    }

    // For PRP self-development on feature branches:
    // - First agent works in actual working directory (currentWorktreePath)
    // - No worktree setup needed - we're developing PRP itself
    // - Use current directory for all operations

    // For main branch:
    // - All agents should work in worktrees
    // - Use worktree mode for proper isolation

    const worktreeMode = isMainBranch; // Only use worktree mode on main branch
    let worktreePath: string | undefined;

    if (worktreeMode === true && mainWorktreePath !== undefined && mainWorktreePath.length > 0 && mainWorktreePath !== currentWorktreePath) {
      // On main branch but not in main worktree - use main worktree
      worktreePath = mainWorktreePath;
    } else if (worktreeMode === false) {
      // On feature branch - use current directory (PRP development directory)
      worktreePath = currentWorktreePath;
    }

    return {
      currentBranch,
      isMainBranch,
      worktreeMode,
      worktreePath,
      mainWorktreePath,
      orchestratorMode: true,
      hotReload: options.watch ?? true, // Default to hot reload in dev mode
    };
  } catch (error) {
    logCI('Could not determine git branch, assuming development mode', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Assume we're in development mode on a feature branch
    return {
      currentBranch: options.branch ?? 'feature-branch',
      isMainBranch: false,
      worktreeMode: false,
      worktreePath: process.cwd(),
      orchestratorMode: true,
      hotReload: options.watch ?? true,
    };
  }
}

/**
 * Setup worktree if needed (only for main branch development)
 */
const setupWorktree = async (config: DevConfig): Promise<void> => {
  // Only setup worktrees when on main branch and worktree mode is enabled
  if (config.worktreeMode === false || config.worktreePath === undefined || config.worktreePath.length === 0 || config.currentBranch === undefined) {
    logCI('Skipping worktree setup - not in worktree mode', {
      worktreeMode: config.worktreeMode,
      branch: config.currentBranch,
    });
    return;
  }

  try {
    logger.info(
      'cli',
      'DevCommand',
      `Setting up worktree for main branch development: ${config.currentBranch}`,
      {
        worktreePath: config.worktreePath,
      },
    );

    // Check if worktree already exists
    try {
      await execAsync('git rev-parse --git-dir', { cwd: config.worktreePath });
      logCI('Worktree already exists', { worktreePath: config.worktreePath });
      return;
    } catch {
      // Worktree doesn't exist, create it
      logCI('Creating new worktree for main branch', {
        branch: config.currentBranch,
        worktreePath: config.worktreePath,
      });

      await execAsync(`git worktree add ${config.worktreePath} ${config.currentBranch}`, {
        cwd: process.cwd(),
      });

      logCI('Worktree created successfully', {
        branch: config.currentBranch,
        worktreePath: config.worktreePath,
      });
    }
  } catch (error) {
    logger.error(
      'cli',
      'DevCommand',
      'Failed to setup worktree',
      error instanceof Error ? error : new Error(String(error)),
      {
        branch: config.currentBranch,
        worktreePath: config.worktreePath,
      },
    );
    throw error;
  }
}

/**
 * Start development server with hot reload
 */
const startDevServerWithWatch = async (config: DevConfig, options: DevOptions): Promise<void> => {
  const eventBus = new EventBus();
  let orchestratorProcess: ReturnType<typeof exec> | null = null;
  let restartTimeout: NodeTimeout | null = null;

  // Setup file watcher - watch both main directory and worktree
  const mainDirectory = process.cwd();
  const baseWatchPaths = [
    'src/**/*.ts',
    'src/**/*.tsx',
    'src/**/*.json',
    '.prp/**/*.md',
    'PRPs/**/*.md',
    'templates/**/*',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
  ];

  // Extend watch paths to include both worktrees
  const watchPaths = [...baseWatchPaths];

  // Add main worktree paths if available
  if (config.mainWorktreePath !== undefined && config.mainWorktreePath.length > 0 && config.mainWorktreePath !== mainDirectory) {
    watchPaths.push(
      `${config.mainWorktreePath}/src/**/*.ts`,
      `${config.mainWorktreePath}/src/**/*.tsx`,
      `${config.mainWorktreePath}/src/**/*.json`,
      `${config.mainWorktreePath}/.prp/**/*.md`,
      `${config.mainWorktreePath}/PRPs/**/*.md`,
      `!${config.mainWorktreePath}/src/**/*.test.ts`,
      `!${config.mainWorktreePath}/src/**/*.test.tsx`,
    );
  }

  // Add current worktree paths if different from base
  if (config.worktreePath !== undefined && config.worktreePath.length > 0 && config.worktreePath !== mainDirectory) {
    watchPaths.push(
      `${config.worktreePath}/src/**/*.ts`,
      `${config.worktreePath}/src/**/*.tsx`,
      `${config.worktreePath}/src/**/*.json`,
      `${config.worktreePath}/.prp/**/*.md`,
      `${config.worktreePath}/PRPs/**/*.md`,
      `!${config.worktreePath}/src/**/*.test.ts`,
      `!${config.worktreePath}/src/**/*.test.tsx`,
    );
  }

  const watcher = watch(watchPaths, {
    ignored: /node_modules|\.git|dist|coverage/,
    persistent: true,
    ignoreInitial: true,
    cwd: mainDirectory, // Watch from main directory
  });

  logCI('Starting development server with hot reload', {
    watchPaths,
    worktreePath: config.worktreePath,
  });

  // Function to start orchestrator
  const startOrchestrator = async () => {
    // Stop existing orchestrator if running
    if (orchestratorProcess) {
      logCI('Stopping existing orchestrator process');
      orchestratorProcess.kill();
      orchestratorProcess = null;
    }

    logCI('Starting orchestrator with configuration', {
      branch: config.currentBranch,
      isMainBranch: config.isMainBranch,
      worktreeMode: config.worktreeMode,
      worktreePath: config.worktreePath,
      mainWorktreePath: config.mainWorktreePath,
    });

    // For development mode, we need to build the CLI first
    const cliDirectory = config.worktreePath ?? mainDirectory;
    const cliPath =
      config.isMainBranch === true && config.mainWorktreePath !== undefined && config.mainWorktreePath.length > 0
        ? `${config.mainWorktreePath}/dist/cli.js`
        : `${cliDirectory}/dist/cli.js`;

    // Build CLI if not exists
    if (!existsSync(cliPath)) {
      logCI(`CLI not found at ${cliPath}, building...`);
      try {
        await execAsync('npm run build', { cwd: cliDirectory });
        logCI('CLI build completed successfully');
      } catch (buildError) {
        logger.error(
          'cli',
          'DevCommand',
          'Failed to build CLI',
          buildError instanceof Error ? buildError : new Error(String(buildError)),
        );
        throw new Error(`Failed to build CLI. Please run 'npm run build' manually.`);
      }
    }

    // Verify CLI exists after build
    if (!existsSync(cliPath)) {
      logger.error(
        'cli',
        'DevCommand',
        `CLI still not found at path: ${cliPath}`,
        new Error('CLI executable missing'),
      );
      throw new Error(
        `CLI not found at ${cliPath} even after build. Please check the build configuration.`,
      );
    }

    // Start orchestrator as subprocess
    orchestratorProcess = exec(`node ${cliPath} orchestrator`, {
      cwd: cliDirectory,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PRP_DEV_MODE: 'true',
        PRP_WORKTREE_PATH: config.worktreePath ?? '',
        PRP_MAIN_WORKTREE_PATH: config.mainWorktreePath ?? '',
        PRP_CURRENT_BRANCH: config.currentBranch,
        PRP_CURRENT_WORKTREE: process.cwd(),
        PRP_IS_MAIN_BRANCH: config.isMainBranch.toString(),
        PRP_WORKTREE_MODE: config.worktreeMode.toString(),
        DEBUG: options.debug === true ? 'true' : 'false',
      },
    });

    if (orchestratorProcess.stdout) {
      orchestratorProcess.stdout.on('data', (data: Buffer) => {
        process.stdout.write(data);
      });
    }

    if (orchestratorProcess.stderr) {
      orchestratorProcess.stderr.on('data', (data: Buffer) => {
        process.stderr.write(data);
      });
    }

    orchestratorProcess.on('exit', (code: number | null) => {
      if (code !== 0) {
        logger.error(
          'cli',
          'DevCommand',
          'Orchestrator process exited with error',
          code !== null ? new Error(`Exit code: ${code}`) : new Error('Unknown exit error'),
        );
      }
      orchestratorProcess = null;
    });
  };

  // Setup worktree monitoring if in worktree mode
  if (config.worktreeMode === true && config.worktreePath !== undefined && config.worktreePath.length > 0) {
    const worktreeMonitor = new EnhancedGitWorktreeMonitor(process.cwd(), eventBus);

    try {
      await worktreeMonitor.initialize();
      await worktreeMonitor.addWorktree(
        config.currentBranch,
        config.worktreePath,
        config.currentBranch,
      );

      // Listen for worktree changes
      worktreeMonitor.on('worktree:files_changed', () => {
        logCI('Worktree files changed, triggering restart');
        scheduleRestart();
      });
    } catch (error) {
      logCI('Could not initialize worktree monitoring', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Schedule restart function with debouncing
  const scheduleRestart = () => {
    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }
    restartTimeout = setTimeout(() => {
      void (async () => {
        logCI('Restarting orchestrator due to file changes');
        await startOrchestrator();
      })();
    }, 1000); // 1 second debounce
  };

  // File change handlers
  watcher.on('change', (path: string) => {
    logCI(`File changed: ${path}`);
    scheduleRestart();
  });

  watcher.on('add', (path: string) => {
    logCI(`File added: ${path}`);
    scheduleRestart();
  });

  watcher.on('unlink', (path: string) => {
    logCI(`File removed: ${path}`);
    scheduleRestart();
  });

  watcher.on('error', (error: unknown) => {
    logCI('Watcher error', { error: error instanceof Error ? error.message : String(error) });
  });

  // Start orchestrator initially
  await startOrchestrator();

  // Handle process cleanup
  const cleanup = () => {
    logCI('Cleaning up development server');
    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }
    if (orchestratorProcess) {
      orchestratorProcess.kill();
    }
    void watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

/**
 * Start development server without hot reload
 */
const startDevServer = async (config: DevConfig, options: DevOptions): Promise<void> => {
  logCI('Starting orchestrator in development mode', {
    worktreePath: config.worktreePath,
    branch: config.currentBranch,
  });

  try {
    // Import and run orchestrator directly
    const { handleOrchestratorCommand } = await import('./orchestrator');

    const orchestratorOptions = {
      ...options,
      ci: false, // Force interactive mode in dev
      debug: options.debug ?? true,
      screen: 'o' as const, // Default to orchestrator screen
      self: `development-${config.currentBranch}`,
    };

    await handleOrchestratorCommand(orchestratorOptions);
  } catch (error) {
    logger.error(
      'cli',
      'DevCommand',
      'Failed to start development server',
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

export { createDevCommand as default, handleDevCommand };
export type { DevOptions, DevConfig };
