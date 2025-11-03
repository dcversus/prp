import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { format } from 'util';

import type { LogLevel } from '../types';

/**
 * Logger utility for consistent logging across the CLI
 */
export class Logger {
  private level: LogLevel = 'info';
  private output: 'console' | 'file' | 'json' = 'console';
  private logFile?: string;
  private useColors: boolean = true;
  private timestamp: boolean = true;

  constructor(options?: {
    level?: LogLevel;
    output?: 'console' | 'file' | 'json';
    logFile?: string;
    useColors?: boolean;
    timestamp?: boolean;
  }) {
    if (options) {
      this.level = options.level || this.level;
      this.output = options.output || this.output;
      this.logFile = options.logFile;
      this.useColors = options.useColors !== false;
      this.timestamp = options.timestamp !== false;
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set output mode
   */
  setOutput(output: 'console' | 'file' | 'json', logFile?: string): void {
    this.output = output;
    if (logFile) {
      this.logFile = logFile;
    }
  }

  /**
   * Enable/disable colors
   */
  setColors(enabled: boolean): void {
    this.useColors = enabled;
  }

  /**
   * Enable/disable timestamps
   */
  setTimestamp(enabled: boolean): void {
    this.timestamp = enabled;
  }

  /**
   * Error level logging
   */
  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Info level logging
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Debug level logging
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Verbose level logging
   */
  verbose(message: string, ...args: unknown[]): void {
    this.log('verbose', message, ...args);
  }

  /**
   * Success message (info level with green color)
   */
  success(message: string, ...args: unknown[]): void {
    const coloredMessage = this.useColors ? chalk.green(message) : message;
    this.log('info', coloredMessage, ...args);
  }

  /**
   * Warning message with yellow color
   */
  warning(message: string, ...args: unknown[]): void {
    const coloredMessage = this.useColors ? chalk.yellow(message) : message;
    this.log('warn', coloredMessage, ...args);
  }

  /**
   * Error message with red color
   */
  failure(message: string, ...args: unknown[]): void {
    const coloredMessage = this.useColors ? chalk.red(message) : message;
    this.log('error', coloredMessage, ...args);
  }

  /**
   * Info message with blue color
   */
  highlight(message: string, ...args: unknown[]): void {
    const coloredMessage = this.useColors ? chalk.blue(message) : message;
    this.log('info', coloredMessage, ...args);
  }

  /**
   * Dimmed message
   */
  dim(message: string, ...args: unknown[]): void {
    const coloredMessage = this.useColors ? chalk.dim(message) : message;
    this.log('info', coloredMessage, ...args);
  }

  /**
   * Bold message
   */
  bold(message: string, ...args: unknown[]): void {
    const coloredMessage = this.useColors ? chalk.bold(message) : message;
    this.log('info', coloredMessage, ...args);
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = args.length > 0 ? format(message, ...args) : message;
    const timestamp = this.timestamp ? new Date().toISOString() : '';

    switch (this.output) {
      case 'console':
        this.logToConsole(level, formattedMessage, timestamp);
        break;
      case 'file':
        this.logToFile(level, formattedMessage, timestamp);
        break;
      case 'json':
        this.logToJson(level, formattedMessage, timestamp);
        break;
    }
  }

  /**
   * Log to console with colors
   */
  private logToConsole(level: LogLevel, message: string, timestamp: string): void {
    const timestampStr = timestamp ? `[${timestamp}] ` : '';
    const levelStr = this.useColors ? this.formatLevel(level) : level.toUpperCase().padEnd(7);
    const prefix = `${timestampStr}${levelStr}`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
        break;
    }
  }

  /**
   * Log to file
   */
  private logToFile(level: LogLevel, message: string, timestamp: string): void {
    if (!this.logFile) {
      throw new Error('Log file path is required for file output');
    }

    const logEntry = {
      timestamp,
      level,
      message
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.ensureDirSync(path.dirname(this.logFile));
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      // Fallback to console if file writing fails
      console.error(`Failed to write to log file: ${error}`);
      console.log(`${timestamp} [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Log as JSON
   */
  private logToJson(level: LogLevel, message: string, timestamp: string): void {
    const logEntry = {
      timestamp,
      level,
      message,
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Format log level with colors
   */
  private formatLevel(level: LogLevel): string {
    const levelUpper = level.toUpperCase().padEnd(7);

    if (!this.useColors) {
      return levelUpper;
    }

    switch (level) {
      case 'error':
        return chalk.red(levelUpper);
      case 'warn':
        return chalk.yellow(levelUpper);
      case 'info':
        return chalk.blue(levelUpper);
      case 'debug':
        return chalk.magenta(levelUpper);
      case 'verbose':
        return chalk.cyan(levelUpper);
      default:
        return levelUpper;
    }
  }

  /**
   * Create child logger with prefix
   */
  child(prefix: string): Logger {
    const childLogger = new Logger({
      level: this.level,
      output: this.output,
      logFile: this.logFile,
      useColors: this.useColors,
      timestamp: this.timestamp
    });

    // Override log methods to add prefix
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, ...args: unknown[]) => {
      const prefixedMessage = `[${prefix}] ${message}`;
      originalLog(level, prefixedMessage, ...args);
    };

    return childLogger;
  }

  /**
   * Create progress logger
   */
  createProgress(total: number, message: string = 'Progress'): ProgressLogger {
    return new ProgressLogger(this, total, message);
  }

  /**
   * Create spinner logger
   */
  createSpinner(message: string = 'Loading...'): SpinnerLogger {
    return new SpinnerLogger(this, message);
  }
}

/**
 * Progress logger for showing progress bars
 */
export class ProgressLogger {
  private current: number = 0;
  private startTime: number = Date.now();

  constructor(
    private logger: Logger,
    private total: number,
    private message: string
  ) {}

  /**
   * Update progress
   */
  update(increment: number = 1, message?: string): void {
    this.current += increment;
    const percentage = Math.round((this.current / this.total) * 100);
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const eta = rate > 0 ? Math.round((this.total - this.current) / rate) : 0;

    const progressMessage = message || this.message;
    const logMessage = `${progressMessage}: ${this.current}/${this.total} (${percentage}%) - ETA: ${eta}s`;

    if (this.current >= this.total) {
      this.logger.success(logMessage);
    } else {
      this.logger.info(logMessage);
    }
  }

  /**
   * Complete progress
   */
  complete(message?: string): void {
    const finalMessage = message || `${this.message} completed`;
    this.logger.success(finalMessage);
  }
}

/**
 * Spinner logger for showing loading spinners
 */
export class SpinnerLogger {
  private interval?: NodeJS.Timeout;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;

  constructor(
    private logger: Logger,
    private message: string
  ) {}

  /**
   * Start spinner
   */
  start(): void {
    this.interval = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      this.logger.info(`${frame} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  /**
   * Stop spinner with success
   */
  succeed(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    this.logger.success(`✓ ${finalMessage}`);
  }

  /**
   * Stop spinner with failure
   */
  fail(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    this.logger.failure(`✗ ${finalMessage}`);
  }

  /**
   * Stop spinner with warning
   */
  warn(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    this.logger.warning(`⚠ ${finalMessage}`);
  }

  /**
   * Update spinner message
   */
  update(message: string): void {
    this.message = message;
  }

  /**
   * Stop spinner
   */
  private stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();