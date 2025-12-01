/**
 * CLI Type Definitions
 *
 * Provides proper TypeScript interfaces for CLI commands, options, and configuration
 * to ensure type safety throughout the CLI system.
 */

// import type { Command } from 'commander'; // Not used yet but will be needed

/**
 * Global CLI options available for all commands
 */
export interface GlobalCLIOptions {
  ci?: boolean;
  debug?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  logFile?: string;
  noColor?: boolean;
  mcpPort?: string;
  // Internal watch option (not shown in help)
  watch?: boolean;
  // Additional dynamic options
  [key: string]: unknown;
}

/**
 * Complete CLI options including global and command-specific options
 */
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface CLICommandOptions extends GlobalCLIOptions {
  // Additional command-specific options
  [key: string]: unknown;
}

/**
 * Command handler function type
 */
// eslint-disable-next-line import/no-unused-modules
export type CommandHandler = () => Promise<void> | void;

/**
 * Command handler with argument(s)
 */
// eslint-disable-next-line import/no-unused-modules
export type CommandHandlerWithArgs = () => Promise<void> | void;

/**
 * CLI error types
 */
export class CLIError extends Error {
  public readonly code: string;
  public readonly exitCode: number;

  constructor(
    message: string,
    code: string,
    exitCode = 1,
  ) {
    super(message);
    this.name = 'CLIError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

export class ConfigurationError extends CLIError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 1);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends CLIError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
  ) {
    super(message, 'VALIDATION_ERROR', 1);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Utility type for commander.js options return type
 */
export type CommanderOptions<T extends CLICommandOptions = CLICommandOptions> = T;

/**
 * Utility functions for CLI type safety
 */
export const parsePort = function(port: string | undefined): number {
  if (port === undefined || port === '') {
    throw new ConfigurationError('Port is required');
  }
  const parsed = parseInt(port, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new ConfigurationError(`Invalid port: ${port}. Must be between 1 and 65535.`);
  }
  return parsed;
};

// eslint-disable-next-line import/no-unused-modules
export const validateLogLevel = function(level: string | undefined): GlobalCLIOptions['logLevel'] {
  if (level === undefined || level === null || level === '') {
    return 'info';
  }
  const validLevels: GlobalCLIOptions['logLevel'][] = ['error', 'warn', 'info', 'debug', 'verbose'];
  if (!validLevels.includes(level as GlobalCLIOptions['logLevel'])) {
    throw new ValidationError(
      `Invalid log level: ${level}. Valid levels: ${validLevels.join(', ')}`,
    );
  }
  return level as GlobalCLIOptions['logLevel'];
};
