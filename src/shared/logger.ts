/**
 * ♫ Logger for @dcversus/prp
 *
 * Structured logging system with token usage tracking and performance monitoring.
 */

import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import { FileUtils, PerformanceMonitor, TokenCounter } from './utils.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  layer: 'scanner' | 'inspector' | 'orchestrator' | 'shared' | 'tui' | 'config' | 'signal-aggregation' | 'orchestrator-scheduler';
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
}

/**
 * ♫ Logger - Musical performance tracking for the orchestra
 */
export class Logger {
  private config: LoggerConfig;
  private fileStreams: Map<string, WriteStream> = new Map();
  private tokenMetrics: Map<string, { input: number; output: number; cost: number }> = new Map();
  private performanceMetrics: Map<string, { count: number; totalDuration: number }> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
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

    this.initializeFileStreams();
  }

  private async initializeFileStreams(): Promise<void> {
    if (!this.config.enableFile) return;

    await FileUtils.ensureDir(this.config.logDir);

    const layers = ['scanner', 'inspector', 'orchestrator', 'shared', 'tui', 'config', 'signal-aggregation', 'orchestrator-scheduler'];
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
        level: LogLevel[entry.level],
        layer: entry.layer,
        component: entry.component,
        message: entry.message,
        metadata: entry.metadata,
        tokenUsage: entry.tokenUsage,
        performance: entry.performance,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
        } : undefined,
      });
    } else {
      const parts = [
        entry.timestamp.toISOString(),
        `[${LogLevel[entry.level]}]`,
        `[${entry.layer}:${entry.component}]`,
        entry.message,
      ];

      if (entry.tokenUsage) {
        parts.push(`(tokens: ${entry.tokenUsage.total}, cost: $${entry.tokenUsage.cost.toFixed(6)})`);
      }

      if (entry.performance) {
        parts.push(`(${entry.performance.operation}: ${entry.performance.duration}ms)`);
      }

      return parts.join(' ');
    }
  }

  private async writeLogEntry(entry: LogEntry): Promise<void> {
    const formatted = this.formatLogEntry(entry);

    // Console output
    if (this.config.enableConsole) {
      const colorize = (text: string, level: LogLevel) => {
        const colors = {
          [LogLevel.DEBUG]: '\x1b[36m', // cyan
          [LogLevel.INFO]: '\x1b[32m',  // green
          [LogLevel.WARN]: '\x1b[33m',  // yellow
          [LogLevel.ERROR]: '\x1b[31m', // red
          [LogLevel.FATAL]: '\x1b[35m', // magenta
        };
        return `${colors[level]}${text}\x1b[0m`;
      };

      console.log(colorize(formatted, entry.level));
    }

    // File output
    if (this.config.enableFile) {
      const stream = this.fileStreams.get(entry.layer);
      if (stream) {
        stream.write(formatted + '\n');
      }
    }

    // Update metrics
    if (entry.tokenUsage && this.config.enableTokenTracking) {
      this.updateTokenMetrics(entry.layer, entry.tokenUsage);
    }

    if (entry.performance && this.config.enablePerformanceTracking) {
      this.updatePerformanceMetrics(entry.performance);
    }
  }

  private updateTokenMetrics(layer: string, usage: LogEntry['tokenUsage']): void {
    if (!usage) return;

    const current = this.tokenMetrics.get(layer) || { input: 0, output: 0, cost: 0 };
    this.tokenMetrics.set(layer, {
      input: current.input + usage.input,
      output: current.output + usage.output,
      cost: current.cost + usage.cost,
    });
  }

  private updatePerformanceMetrics(performance: LogEntry['performance']): void {
    if (!performance) return;

    const current = this.performanceMetrics.get(performance.operation) || { count: 0, totalDuration: 0 };
    this.performanceMetrics.set(performance.operation, {
      count: current.count + 1,
      totalDuration: current.totalDuration + performance.duration,
    });
  }

  // Logging methods
  debug(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      layer,
      component,
      message,
      metadata,
    });
  }

  info(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.INFO,
      layer,
      component,
      message,
      metadata,
    });
  }

  warn(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.WARN,
      layer,
      component,
      message,
      metadata,
    });
  }

  error(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      layer,
      component,
      message,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  fatal(
    layer: LogEntry['layer'],
    component: string,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;

    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.FATAL,
      layer,
      component,
      message,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  // Specialized logging methods
  tokenUsage(
    layer: LogEntry['layer'],
    component: string,
    operation: string,
    input: number,
    output: number,
    model: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enableTokenTracking) return;

    const total = input + output;
    const cost = TokenCounter.calculateCost(total, model);

    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.INFO,
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
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enablePerformanceTracking) return;

    const memoryBefore = PerformanceMonitor.getMemoryUsage();

    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      layer,
      component,
      message: `Performance: ${operation}`,
      metadata,
      performance: {
        operation,
        duration,
        memoryBefore: memoryBefore.heapUsed,
        memoryAfter: PerformanceMonitor.getMemoryUsage().heapUsed,
      },
    });
  }

  signal(
    layer: LogEntry['layer'],
    component: string,
    signal: string,
    details: Record<string, unknown>
  ): void {
    this.writeLogEntry({
      timestamp: new Date(),
      level: LogLevel.INFO,
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

  // Cleanup
  async shutdown(): Promise<void> {
    const streamValues = Array.from(this.fileStreams.values());
    for (const stream of streamValues) {
      stream.end();
    }
    this.fileStreams.clear();
  }
}

// Global logger instance
export const logger = new Logger();

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

  tokenUsage: (component: string, operation: string, input: number, output: number, model: string, metadata?: Record<string, unknown>) =>
    logger.tokenUsage(layer, component, operation, input, output, model, metadata),

  performance: (component: string, operation: string, duration: number, metadata?: Record<string, unknown>) =>
    logger.performance(layer, component, operation, duration, metadata),

  signal: (component: string, signal: string, details: Record<string, unknown>) =>
    logger.signal(layer, component, signal, details),
});

// Performance monitoring wrapper
export function withPerformanceTracking<T>(
  layer: LogEntry['layer'],
  component: string,
  operation: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return PerformanceMonitor.measureAsync(operation, async () => {
    const result = await fn();
    const duration = PerformanceMonitor.endTimer(operation);
    logger.performance(layer, component, operation, duration, metadata);
    return result;
  }).then(measured => measured.result);
}

// Token usage tracking for common operations
export function trackTokenUsage(
  layer: LogEntry['layer'],
  component: string,
  operation: string,
  inputTokens: number,
  outputTokens: number,
  model: string,
  metadata?: Record<string, unknown>
): void {
  logger.tokenUsage(layer, component, operation, inputTokens, outputTokens, model, metadata);
}