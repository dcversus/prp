#!/usr/bin/env node

/**
 * Debug Mode Command Implementation
 *
 * Provides CI-like console output with system monitoring
 * and CTRL+D interface switching capability.
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';

interface DebugOptions {
  verbose?: boolean;
  level?: string;
  output?: string;
  components?: string[];
  follow?: boolean;
  json?: boolean;
  nocolor?: boolean;
}

/**
 * Create debug command for CLI
 */
export function createDebugCommand(): Command {
  const debugCmd = new Command('debug')
    .description('Start debug mode with CI-like console output and system monitoring')
    .option('-v, --verbose', 'Enable verbose debug output')
    .option('-l, --level <level>', 'Debug level (error, warn, info, debug, verbose)', 'debug')
    .option('-o, --output <format>', 'Output format (console, json, file)', 'console')
    .option('-c, --components <components>', 'Comma-separated list of components to debug', 'cli,build,test,lint,deploy')
    .option('-f, --follow', 'Follow debug output in real-time', true)
    .option('-j, --json', 'Output debug information in JSON format')
    .option('--no-color', 'Disable colored output')
    .option('--signal-history <count>', 'Number of recent signals to display', '50')
    .action(async (options: DebugOptions) => {
      await handleDebugCommand(options);
    });

  return debugCmd;
}

/**
 * Handle debug command execution
 */
async function handleDebugCommand(options: DebugOptions): Promise<void> {
  logger.info('🐛 Starting PRP Debug Mode');

  try {
    // Initialize CLI in debug mode
    const cli = new PRPCli({
      debug: true,
      verbose: options.verbose,
      noColor: options.nocolor,
    });

    await cli.initialize();

    // Start debug mode
    const debugSession = new DebugModeSession(cli, options);
    await debugSession.start();

  } catch (error) {
    logger.error('Debug mode failed to start:', error);
    process.exit(1);
  }
}

/**
 * Debug Mode Session
 */
class DebugModeSession {
  private cli: PRPCli;
  private options: DebugOptions;
  private isRunning = false;
  private signalHistory: any[] = [];
  private maxSignalHistory = 50;

  constructor(cli: PRPCli, options: DebugOptions) {
    this.cli = cli;
    this.options = options;
    this.maxSignalHistory = parseInt(options.signalHistory || '50', 10);
  }

  /**
   * Start debug mode session
   */
  async start(): Promise<void> {
    this.isRunning = true;

    logger.success('🚀 PRP Debug Mode Started');
    logger.info('📊 System Status Monitoring Active');
    logger.info('⚙️  Orchestrator Integration: DISABLED (pending dependency resolution)');
    logger.info('⌨️  Press CTRL+C to exit debug mode');
    logger.info('─'.repeat(80));

    // Setup keyboard input handling
    this.setupKeyboardHandlers();

    // Start debug loop
    await this.debugLoop();
  }

  /**
   * Setup keyboard input handlers
   */
  private setupKeyboardHandlers(): void {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      // CTRL+D (EOF character) - placeholder for future orchestrator integration
      if (key === '\x04') {
        this.logSignal('[SYSTEM]', 'CTRL+D pressed - orchestrator interface not yet available', 'warn');
      }
      // CTRL+C
      else if (key === '\x03') {
        this.shutdown();
      }
    });

    process.on('SIGINT', () => {
      this.shutdown();
    });
  }

  /**
   * Debug loop
   */
  private async debugLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Show system status periodically
        await this.showSystemStatus();

        // Wait for next iteration
        await this.sleep(5000);

      } catch (error) {
        this.logSignal('[ERROR]', `Debug loop error: ${error instanceof Error ? error.message : String(error)}`, 'error');
        await this.sleep(1000);
      }
    }
  }

  /**
   * Show system status
   */
  private async showSystemStatus(): Promise<void> {
    const uptime = this.cli.getUptime();
    const version = this.cli.getVersion();

    const statusInfo = {
      uptime: `${Math.floor(uptime / 1000)}s`,
      project: 'PRP CLI',
      version: version,
      signals: this.signalHistory.length,
      orchestrator: 'disabled',
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    if (this.options.json) {
      logger.info(JSON.stringify(statusInfo, null, 2));
    } else {
      logger.info('📊 System Status:');
      logger.info(`  Project: ${statusInfo.project} v${statusInfo.version}`);
      logger.info(`  Uptime: ${statusInfo.uptime}`);
      logger.info(`  Signals: ${statusInfo.signals}`);
      logger.info(`  Orchestrator: ${statusInfo.orchestrator}`);
      logger.info(`  Memory: ${(statusInfo.memory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
      logger.info(`  Node.js: ${statusInfo.nodeVersion}`);
      logger.info(`  Platform: ${statusInfo.platform} (${statusInfo.arch})`);
      logger.info(`  Time: ${new Date().toLocaleTimeString()}`);

      // Show recent signals
      if (this.signalHistory.length > 0) {
        logger.info('🔔 Recent Signals:');
        const recent = this.signalHistory.slice(-5);
        recent.forEach(signal => {
          logger.info(`  ${signal.timestamp} [${signal.level}] ${signal.source}: ${signal.message}`);
        });
      }

      logger.info('─'.repeat(80));
    }
  }

  /**
   * Log a signal
   */
  private logSignal(source: string, message: string, level: string = 'info'): void {
    const signal = {
      timestamp: new Date().toISOString(),
      source,
      message,
      level
    };

    // Add to history
    this.signalHistory.push(signal);

    // Trim history if needed
    if (this.signalHistory.length > this.maxSignalHistory) {
      this.signalHistory = this.signalHistory.slice(-this.maxSignalHistory);
    }

    // Log the message
    switch (level) {
      case 'error':
        logger.error(`${source}: ${message}`);
        break;
      case 'warn':
        logger.warn(`${source}: ${message}`);
        break;
      case 'success':
        logger.success(`${source}: ${message}`);
        break;
      default:
        logger.info(`${source}: ${message}`);
    }
  }

  /**
   * Shutdown debug mode
   */
  private async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down debug mode...');
    this.isRunning = false;

    try {
      // Restore stdin
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners();

      // Shutdown CLI
      await this.cli.shutdown();

      logger.success('✅ Debug mode shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in main CLI
export { createDebugCommand as default };