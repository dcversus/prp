/**
 * ♫ Logger for @dcversus/prp
 *
 * Structured logging system with token usage tracking and performance monitoring.
 */

import { createWriteStream, type WriteStream } from 'fs';
import { join, dirname } from 'path';

import { FileUtils, PerformanceMonitor, TokenCounter } from './utils';

import type { LogLevel } from '../types';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  layer:
    | 'scanner'
    | 'inspector'
    | 'orchestrator'
    | 'shared'
    | 'tui'
    | 'config'
    | 'signal-aggregation'
    | 'orchestrator-scheduler'
    | 'cli'
    | 'mcp-server'
    | 'budget'
    | 'inspect'
    | 'scan'
    | 'signal-flow'
    | 'token-accounting'
    | 'workflow';
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  performance?: {
    operation: string;
    duration: number;
    memoryBefore: number;
    memoryAfter: number;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  enableTokenTracking: boolean;
  enablePerformanceTracking: boolean;
  structuredOutput: boolean;
  ciMode?: boolean; // When true, logger outputs JSON only to stdout
  tuiMode?: boolean; // When true, logger disables console output to avoid interfering with Ink
}

/**
 * ♫ Logger - Musical performance tracking for the orchestra
 */
export class Logger {
  private config: LoggerConfig;
  private readonly fileStreams = new Map<string, WriteStream>();
  private readonly tokenMetrics = new Map<string, { input: number; output: number; cost: number }>();
  private readonly performanceMetrics = new Map<string, { count: number; totalDuration: number }>();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: true,
      logDir: '/tmp/prp-logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      enableTokenTracking: true,
      enablePerformanceTracking: true,
      structuredOutput: true,
      ...config,
    };

    void this.initializeFileStreams();
  }

  private async initializeFileStreams(): Promise<void> {
    if (!this.config.enableFile) {
      return;
    }

    await FileUtils.ensureDir(this.config.logDir);

    const layers = [
      'scanner',
      'inspector',
      'orchestrator',
      'shared',
      'tui',
      'config',
      'signal-aggregation',
      'orchestrator-scheduler',
      'cli',
      'mcp-server',
      'budget',
      'inspect',
      'scan',
      'signal-flow',
      'token-accounting',
      'workflow',
    ];
    const today = new Date().toISOString().split('T')[0];

    for (const layer of layers) {
      const filename = `${layer}-${today}.log`;
      const filepath = join(this.config.logDir, filename);
      const stream = createWriteStream(filepath, { flags: 'a' });
      this.fileStreams.set(layer, stream);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.config.structuredOutput) {
      return JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        layer: entry.layer,
        component: entry.component,
        message: entry.message,
        metadata: entry.metadata,
        tokenUsage: entry.tokenUsage,
        performance: entry.performance,
        error: entry.error
          ? {
              name: entry.error.name,
              message: entry.error.message,
            }
          : undefined,
      });
    } else {
      const parts = [
        entry.timestamp.toISOString(),
        `[${entry.level.toUpperCase()}]`,
        `[${entry.layer}:${entry.component}]`,
        entry.message,
      ];

      if (entry.tokenUsage) {
        parts.push(
          `(tokens: ${entry.tokenUsage.total}, cost: $${entry.tokenUsage.cost.toFixed(6)})`,
        );
      }

      if (entry.performance) {
        parts.push(`(${entry.performance.operation}: ${entry.performance.duration}ms)`);
      }

      return parts.join(' ');
    }
  }

  private writeLogEntry(entry: LogEntry): void {
    // CI mode: output JSON only, no colors, no formatting
    if (this.config.ciMode === true) {
      const ciJson = {
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        layer: entry.layer,
        component: entry.component,
        message: entry.message,
        metadata: entry.metadata,
        tokenUsage: entry.tokenUsage,
        performance: entry.performance,
        error: entry.error
          ? {
              name: entry.error.name,
              message: entry.error.message,
            }
          : undefined,
      };
      process.stdout.write(`${JSON.stringify(ciJson)  }\n`);
      return;
    }

    // TUI mode: disable console output to avoid interfering with Ink interface
    if (this.config.tuiMode === true) {
      // Only write to file, no console output
      if (this.config.enableFile) {
        const formatted = this.formatLogEntry(entry);
        const stream = this.fileStreams.get(entry.layer);
        if (stream) {
          stream.write(`${formatted  }\n`);
        }
      }
      return;
    }

    const formatted = this.formatLogEntry(entry);

    // Console output
    if (this.config.enableConsole) {
      const colorize = (text: string, level: LogLevel) => {
        const colors: Record<LogLevel, string> = {
          debug: '\x1b[36m', // cyan
          verbose: '\x1b[37m', // white
          info: '\x1b[32m', // green
          warn: '\x1b[33m', // yellow
          error: '\x1b[31m', // red
        };
        return `${colors[level]}${text}\x1b[0m`;
      };

      process.stdout.write(`${colorize(formatted, entry.level)  }\n`);
    }

    // File output (only if not in TUI mode, since TUI mode already handled file output above)
    if (this.config.enableFile === true && (this.config.tuiMode === undefined || this.config.tuiMode === false)) {
      const stream = this.fileStreams.get(entry.layer);
      if (stream) {
        stream.write(`${formatted  }\n`);
      }
    }

    // Update metrics
    if (entry.tokenUsage !== undefined && this.config.enableTokenTracking === true) {
      this.updateTokenMetrics(entry.layer, entry.tokenUsage);
    }

    if (entry.performance !== undefined && this.config.enablePerformanceTracking === true) {
      this.updatePerformanceMetrics(entry.performance);
    }
  }

  private updateTokenMetrics(layer: string, usage: LogEntry['tokenUsage']): void {
    if (!usage) {
      return;
    }

    const current = this.tokenMetrics.get(layer) ?? { input: 0, output: 0, cost: 0 };
    this.tokenMetrics.set(layer, {
      input: current.input + usage.input,
      output: current.output + usage.output,
      cost: current.cost + usage.cost,
    });
  }

  private updatePerformanceMetrics(performance: LogEntry['performance']): void {
    if (!performance) {
      return;
    }

    const current = this.performanceMetrics.get(performance.operation) ?? {
      count: 0,
      totalDuration: 0,
    };
    this.performanceMetrics.set(performance.operation, {
      count: current.count + 1,
      totalDuration: current.totalDuration + performance.duration,
    });
  }

  // Helper method to create log entries with proper optional property handling
  private createLogEntry(
    level: LogLevel,
    layer: LogEntry['layer'],
    component: string,
    message: string,
    metadata?: Record<string, unknown>,
    additionalFields?: Partial<LogEntry>,
  ): LogEntry {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      layer,
      component,
      message,
      ...additionalFields,
    };

    if (metadata) {
      logEntry.metadata = metadata;
    }

    return logEntry;
  }

  // Logging methods
  debug(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('debug')) {
      return;
    }

    this.writeLogEntry(this.createLogEntry('debug', layer, component, message, metadata));
  }

  info(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('info')) {
      return;
    }

    this.writeLogEntry(this.createLogEntry('info', layer, component, message, metadata));
  }

  warn(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('warn')) {
      return;
    }

    this.writeLogEntry(this.createLogEntry('warn', layer, component, message, metadata));
  }

  error(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('error')) {
      return;
    }

    const additionalFields: Partial<LogEntry> = {};

    if (error) {
      additionalFields.error = {
        name: error.name,
        message: error.message,
        ...(error.stack !== undefined && error.stack.length > 0 && { stack: error.stack }),
      };
    }

    this.writeLogEntry(
      this.createLogEntry('error', layer, component, message, metadata, additionalFields),
    );
  }

  fatal(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('error')) {
      return;
    }

    const additionalFields: Partial<LogEntry> = {};

    if (error) {
      additionalFields.error = {
        name: error.name,
        message: error.message,
        ...(error.stack !== undefined && error.stack.length > 0 && { stack: error.stack }),
      };
    }

    this.writeLogEntry(
      this.createLogEntry('error', layer, component, message, metadata, additionalFields),
    );
  }

  // Specialized logging methods
  tokenUsage(
    layer: LogEntry['layer'],
    component: string,
    operation: string,
    input: number,
    output: number,
    model: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.config.enableTokenTracking) {
      return;
    }

    const total = input + output;
    const cost = TokenCounter.calculateCost(total, model);

    this.writeLogEntry({
      timestamp: new Date(),
      level: 'info',
      layer,
      component,
      message: `Token usage for ${operation}`,
      metadata: { ...metadata, model, operation },
      tokenUsage: { input, output, total, cost },
    });
  }

  performance(
    layer: LogEntry['layer'],
    component: string,
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.config.enablePerformanceTracking) {
      return;
    }

    const memoryBefore = PerformanceMonitor.getMemoryUsage();

    const additionalFields: Partial<LogEntry> = {
      performance: {
        operation,
        duration,
        memoryBefore: memoryBefore.heapUsed,
        memoryAfter: PerformanceMonitor.getMemoryUsage().heapUsed,
      },
    };

    this.writeLogEntry(
      this.createLogEntry(
        'debug',
        layer,
        component,
        `Performance: ${operation}`,
        metadata,
        additionalFields,
      ),
    );
  }

  signal(
    layer: LogEntry['layer'],
    component: string,
    signal: string,
    details: Record<string, unknown>,
  ): void {
    this.writeLogEntry({
      timestamp: new Date(),
      level: 'info',
      layer,
      component,
      message: `Signal: ${signal}`,
      metadata: details,
    });
  }

  // Metrics and reporting
  getTokenUsageMetrics(): Record<string, { input: number; output: number; cost: number }> {
    return Object.fromEntries(this.tokenMetrics);
  }

  getPerformanceMetrics(): Record<string, { count: number; averageDuration: number }> {
    const result: Record<string, { count: number; averageDuration: number }> = {};

    const performanceEntries = Array.from(this.performanceMetrics.entries());
    for (const [operation, metrics] of performanceEntries) {
      result[operation] = {
        count: metrics.count,
        averageDuration: metrics.totalDuration / metrics.count,
      };
    }

    return result;
  }

  resetMetrics(): void {
    this.tokenMetrics.clear();
    this.performanceMetrics.clear();
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  setOptions(options: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...options };
  }

  // Cleanup
  shutdown(): void {
    const streamValues = Array.from(this.fileStreams.values());
    for (const stream of streamValues) {
      stream.end();
    }
    this.fileStreams.clear();
  }
}

// Global logger instance - initialized with minimal default config
export const logger = new Logger({
  level: 'info',
  enableConsole: false, // Disable console output by default
  enableFile: false, // Disable file output by default
  structuredOutput: false, // Disable structured output by default
  enableTokenTracking: false,
  enablePerformanceTracking: false,
});

// Initialize logger with proper options based on CLI context
export const initializeLogger = (options: {
  ci?: boolean;
  debug?: boolean;
  logLevel?: string;
  logFile?: string;
  noColor?: boolean;
  tuiMode?: boolean;
}): void => {
  const config: Partial<LoggerConfig> = {
    level: (options.logLevel as LogLevel) ?? 'info',
    enableConsole: true, // Enable console output by default after initialization
    enableFile: true,
    structuredOutput: false, // Default to non-structured output
    ciMode: options.ci ?? false,
    tuiMode: options.tuiMode ?? false,
  };

  // CI mode: JSON output to stdout only, no file logging
  if (options.ci === true) {
    config.ciMode = true;
    config.enableConsole = false; // We'll handle console output manually in CI mode
    config.enableFile = false;
    config.structuredOutput = true; // Use structured output for CI JSON
  }

  // TUI mode: Disable console output to avoid interfering with Ink
  if (options.tuiMode === true) {
    config.tuiMode = true;
    config.enableConsole = false;
    config.enableFile = true; // Keep file logging for TUI mode
  }

  // Debug mode: Enable verbose logging and performance tracking
  if (options.debug === true) {
    config.level = 'debug';
    config.enableTokenTracking = true;
    config.enablePerformanceTracking = true;
  }

  // Custom log file
  if (options.logFile !== undefined && options.logFile.length > 0) {
    config.logDir = dirname(options.logFile);
  }

  logger.setOptions(config);
}

// Configure logger for CI mode
export const setLoggerCIMode = (enabled: boolean): void => {
  const currentConfig = logger.getConfig();
  logger.setOptions({
    ...currentConfig,
    ciMode: enabled,
    enableConsole: enabled ? false : currentConfig.enableConsole,
  });
}

// Configure logger for TUI mode
export const setLoggerTUIMode = (enabled: boolean): void => {
  const currentConfig = logger.getConfig();
  logger.setOptions({
    ...currentConfig,
    tuiMode: enabled,
    enableConsole: enabled ? false : currentConfig.enableConsole,
  });
}

// Layer-specific convenience methods
export const createLayerLogger = (layer: LogEntry['layer']) => ({
  debug: (component: string, message: string, metadata?: Record<string, unknown>) =>
    logger.debug(layer, component, message, metadata),

  info: (component: string, message: string, metadata?: Record<string, unknown>) =>
    logger.info(layer, component, message, metadata),

  warn: (component: string, message: string, metadata?: Record<string, unknown>) =>
    logger.warn(layer, component, message, metadata),

  error: (component: string, message: string, error?: Error, metadata?: Record<string, unknown>) =>
    logger.error(layer, component, message, error, metadata),

  fatal: (component: string, message: string, error?: Error, metadata?: Record<string, unknown>) =>
    logger.fatal(layer, component, message, error, metadata),

  tokenUsage: (
    component: string,
    operation: string,
    input: number,
    output: number,
    model: string,
    metadata?: Record<string, unknown>,
  ) => logger.tokenUsage(layer, component, operation, input, output, model, metadata),

  performance: (
    component: string,
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>,
  ) => logger.performance(layer, component, operation, duration, metadata),

  signal: (component: string, signal: string, details: Record<string, unknown>) =>
    logger.signal(layer, component, signal, details),
});

// Performance monitoring wrapper
export const withPerformanceTracking = <T>(
  layer: LogEntry['layer'],
  component: string,
  operation: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> => {
  return PerformanceMonitor.measureAsync(operation, async () => {
    const result = await fn();
    const duration = PerformanceMonitor.endTimer(operation);
    logger.performance(layer, component, operation, duration, metadata);
    return result;
  }).then((measured) => measured.result);
}

// Token usage tracking for common operations
export const trackTokenUsage = (
  layer: LogEntry['layer'],
  component: string,
  operation: string,
  inputTokens: number,
  outputTokens: number,
  model: string,
  metadata?: Record<string, unknown>,
): void => {
  logger.tokenUsage(layer, component, operation, inputTokens, outputTokens, model, metadata);
}
