import { logger } from './logger';
import type { CommandResult } from '../types';

/**
 * Custom error classes for PRP CLI
 */
export class PRPError extends Error {
  public readonly code: string;
  public readonly exitCode: number;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    exitCode: number = 1,
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'PRPError';
    this.code = code;
    this.exitCode = exitCode;
    this.recoverable = recoverable;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PRPError);
    }
  }
}

export class ConfigurationError extends PRPError {
  constructor(message: string, field?: string) {
    super(
      `Configuration error: ${message}${field ? ` (field: ${field})` : ''}`,
      'CONFIG_ERROR',
      2,
      true
    );
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends PRPError {
  constructor(message: string, field?: string) {
    super(
      `Validation error: ${message}${field ? ` (field: ${field})` : ''}`,
      'VALIDATION_ERROR',
      3,
      true
    );
    this.name = 'ValidationError';
  }
}

export class BuildError extends PRPError {
  constructor(message: string, stage?: string) {
    super(
      `Build error: ${message}${stage ? ` (stage: ${stage})` : ''}`,
      'BUILD_ERROR',
      4,
      false
    );
    this.name = 'BuildError';
  }
}

export class TestError extends PRPError {
  constructor(message: string, test?: string) {
    super(
      `Test error: ${message}${test ? ` (test: ${test})` : ''}`,
      'TEST_ERROR',
      5,
      false
    );
    this.name = 'TestError';
  }
}

export class QualityGateError extends PRPError {
  constructor(message: string, gate?: string) {
    super(
      `Quality gate error: ${message}${gate ? ` (gate: ${gate})` : ''}`,
      'QUALITY_GATE_ERROR',
      6,
      true
    );
    this.name = 'QualityGateError';
  }
}

export class CIError extends PRPError {
  constructor(message: string, workflow?: string) {
    super(
      `CI/CD error: ${message}${workflow ? ` (workflow: ${workflow})` : ''}`,
      'CI_ERROR',
      7,
      false
    );
    this.name = 'CIError';
  }
}

export class DependencyError extends PRPError {
  constructor(message: string, dependency?: string) {
    super(
      `Dependency error: ${message}${dependency ? ` (dependency: ${dependency})` : ''}`,
      'DEPENDENCY_ERROR',
      8,
      true
    );
    this.name = 'DependencyError';
  }
}

export class NetworkError extends PRPError {
  constructor(message: string, url?: string) {
    super(
      `Network error: ${message}${url ? ` (url: ${url})` : ''}`,
      'NETWORK_ERROR',
      9,
      true
    );
    this.name = 'NetworkError';
  }
}

export class FileSystemError extends PRPError {
  constructor(message: string, path?: string) {
    super(
      `File system error: ${message}${path ? ` (path: ${path})` : ''}`,
      'FILESYSTEM_ERROR',
      10,
      false
    );
    this.name = 'FileSystemError';
  }
}

export class PermissionError extends PRPError {
  constructor(message: string, resource?: string) {
    super(
      `Permission error: ${message}${resource ? ` (resource: ${resource})` : ''}`,
      'PERMISSION_ERROR',
      11,
      false
    );
    this.name = 'PermissionError';
  }
}

export class TimeoutError extends PRPError {
  constructor(message: string, timeout?: number) {
    super(
      `Timeout error: ${message}${timeout ? ` (timeout: ${timeout}ms)` : ''}`,
      'TIMEOUT_ERROR',
      12,
      true
    );
    this.name = 'TimeoutError';
  }
}

export class AuthenticationError extends PRPError {
  constructor(message: string, service?: string) {
    super(
      `Authentication error: ${message}${service ? ` (service: ${service})` : ''}`,
      'AUTH_ERROR',
      13,
      true
    );
    this.name = 'AuthenticationError';
  }
}

export class PluginError extends PRPError {
  constructor(message: string, plugin?: string) {
    super(
      `Plugin error: ${message}${plugin ? ` (plugin: ${plugin})` : ''}`,
      'PLUGIN_ERROR',
      14,
      true
    );
    this.name = 'PluginError';
  }
}

/**
 * Error handler class
 */
export class ErrorHandler {
  private debug: boolean = false;

  constructor(debug?: boolean) {
    this.debug = debug || process.env['DEBUG_MODE'] === 'true';
  }

  /**
   * Handle errors consistently
   */
  async handle(error: Error): Promise<CommandResult> {
    const startTime = Date.now();

    // Log the error
    this.logError(error);

    // Generate command result
    const result: CommandResult = {
      success: false,
      exitCode: this.getExitCode(error),
      stdout: '',
      stderr: error.message,
      duration: Date.now() - startTime,
      data: {
        code: this.getErrorCode(error),
        recoverable: this.isRecoverable(error)
      }
    };

    // Show suggestions for recoverable errors
    if (this.isRecoverable(error)) {
      this.showSuggestions(error);
    }

    return result;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: Error): void {
    if (error instanceof PRPError) {
      if (error instanceof ValidationError || error instanceof ConfigurationError) {
        logger.warn(error.message);
      } else {
        logger.error(error.message);
      }
    } else {
      logger.error(`Unexpected error: ${error.message}`);
    }

    // Log stack trace in debug mode
    if (this.debug && error.stack) {
      logger.debug(error.stack);
    }
  }

  /**
   * Get exit code for error
   */
  private getExitCode(error: Error): number {
    if (error instanceof PRPError) {
      return error.exitCode;
    }

    // Generic error codes
    if (error.name === 'ValidationError') {
      return 3;
    }
    if (error.name === 'TypeError') {
      return 4;
    }
    if (error.name === 'ReferenceError') {
      return 5;
    }
    if (error.name === 'SyntaxError') {
      return 6;
    }
    if (error.name === 'RangeError') {
      return 7;
    }

    return 1; // Generic error
  }

  /**
   * Get error code
   */
  private getErrorCode(error: Error): string {
    if (error instanceof PRPError) {
      return error.code;
    }

    return error.name || 'UNKNOWN_ERROR';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(error: Error): boolean {
    if (error instanceof PRPError) {
      return error.recoverable;
    }

    // Some built-in error types are recoverable
    const recoverableErrors = [
      'ValidationError',
      'ConfigurationError',
      'NetworkError',
      'TimeoutError',
      'AuthenticationError'
    ];

    return recoverableErrors.includes(error.name);
  }

  /**
   * Show suggestions for recoverable errors
   */
  private showSuggestions(error: Error): void {
    logger.info('\nSuggestions:');

    if (error instanceof ConfigurationError) {
      logger.info('• Run `prp config validate` to check your configuration');
      logger.info('• Use `prp config edit` to open configuration file');
      logger.info('• Check the documentation at /docs/config/README.md');
    }

    if (error instanceof ValidationError) {
      logger.info('• Check the required fields and their formats');
      logger.info('• Run `prp config validate` for detailed validation');
      logger.info('• Refer to the configuration schema');
    }

    if (error instanceof DependencyError) {
      logger.info('• Run `prp deps install` to install dependencies');
      logger.info('• Try `prp deps update` to update dependencies');
      logger.info('• Check your package.json configuration');
    }

    if (error instanceof NetworkError) {
      logger.info('• Check your internet connection');
      logger.info('• Verify firewall and proxy settings');
      logger.info('• Try again in a few moments');
    }

    if (error instanceof AuthenticationError) {
      logger.info('• Run `prp auth login` to authenticate');
      logger.info('• Check your credentials');
      logger.info('• Verify service access permissions');
    }

    if (error instanceof PermissionError) {
      logger.info('• Check file and directory permissions');
      logger.info('• Try running with elevated privileges if necessary');
      logger.info('• Verify you have write access to the target directory');
    }

    logger.info('• Run with --debug flag for more information');
    logger.info('• Use `prp --help` for command assistance');
  }

  /**
   * Handle multiple errors
   */
  async handleMultiple(errors: Error[]): Promise<CommandResult> {
    const primaryError = errors[0];
    if (!primaryError) {
      return {
        success: false,
        message: 'No errors to handle',
        data: undefined,
        exitCode: 1
      };
    }
    const result = await this.handle(primaryError);

    // Log additional errors
    errors.slice(1).forEach(error => {
      logger.warn(`Additional error: ${error.message}`);
    });

    // Update result data with all errors
    const currentData = (result.data && typeof result.data === 'object') ? result.data as Record<string, unknown> : {};
    result.data = {
      ...currentData,
      errors: errors.map(e => ({
        message: e.message,
        code: this.getErrorCode(e),
        recoverable: this.isRecoverable(e)
      }))
    };

    return result;
  }

  /**
   * Wrap async function with error handling
   */
  wrap<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R | CommandResult> {
    return async (...args: T): Promise<R | CommandResult> => {
      try {
        return await fn(...args);
      } catch (error) {
        const result = await this.handle(error as Error);

        // In production, throw the error to be handled by caller
        if (process.env['NODE_ENV'] === 'production') {
          throw error;
        }

        return result;
      }
    };
  }

  /**
   * Create error from various sources
   */
  static from(source: Error | string | Record<string, unknown>): PRPError {
    if (source instanceof PRPError) {
      return source;
    }

    if (source instanceof Error) {
      // Convert common error types
      switch (source.name) {
        case 'ValidationError':
          return new ValidationError(source.message);
        case 'TypeError':
          return new ValidationError(`Type error: ${source.message}`);
        case 'RangeError':
          return new ValidationError(`Range error: ${source.message}`);
        case 'SyntaxError':
          return new ValidationError(`Syntax error: ${source.message}`);
        case 'EACCES':
        case 'EPERM':
          return new PermissionError(source.message);
        case 'ENOENT':
        case 'ENOTDIR':
        case 'EISDIR':
          return new FileSystemError(source.message);
        case 'ETIMEDOUT':
          return new TimeoutError(source.message);
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
          return new NetworkError(source.message);
        default:
          return new PRPError(source.message, source.name);
      }
    }

    if (typeof source === 'string') {
      return new PRPError(source);
    }

    if (typeof source === 'object' && source.message) {
      return new PRPError(String(source.message), String((source).code || 'UNKNOWN_ERROR'));
    }

    return new PRPError('Unknown error occurred', 'UNKNOWN_ERROR');
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();