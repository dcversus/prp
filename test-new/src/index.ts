#!/usr/bin/env node

/**
 * test-new
 * 
 *
 * @author 
 * @version 1.0.0
 */

// Import necessary modules
import { promises as fs } from 'fs';
import path from 'path';

// Define interfaces for better type safety
interface AppConfig {
  name: string;
  version: string;
  environment: string;
}

interface Logger {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

// Simple logger implementation
class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(prefix: string = 'test-new') {
    this.prefix = prefix;
  }

  log(message: string): void {
    console.log(`[${this.prefix}] ${new Date().toISOString()} - ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.prefix}] ${new Date().toISOString()} - ERROR: ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.prefix}] ${new Date().toISOString()} - WARN: ${message}`);
  }
}

// Main application class
class Application {
  private logger: Logger;
  private config: AppConfig;

  constructor(config: AppConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  private async initialize(): Promise<void> {
    this.logger.log(`Initializing ${this.config.name} v${this.config.version}...`);

    // Add initialization logic here
    try {
      // Example: Create a data directory if it doesn't exist
      const dataDir = path.join(process.cwd(), 'data');
      await fs.mkdir(dataDir, { recursive: true });
      this.logger.log('Data directory created or verified');
    } catch (error) {
      this.logger.error(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();
      this.logger.log(`${this.config.name} started successfully in ${this.config.environment} mode! 🚀`);

      // Add your main application logic here
      this.runMainLogic();

    } catch (error) {
      this.logger.error(`Failed to start application: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private runMainLogic(): void {
    this.logger.log('Running main application logic...');

    // Example logic
    const message = 'Hello from test-new!';
    this.logger.log(message);

    // Add more application logic here
  }

  public async shutdown(): Promise<void> {
    this.logger.log('Shutting down application...');

    // Add cleanup logic here

    this.logger.log('Application shutdown complete');
  }
}

// Configuration
const config: AppConfig = {
  name: 'test-new',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

// Initialize logger
const logger = new ConsoleLogger();

// Graceful shutdown handling
const app = new Application(config, logger);

process.on('SIGINT', async () => {
  logger.log('Received SIGINT, shutting down gracefully...');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.log('Received SIGTERM, shutting down gracefully...');
  await app.shutdown();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  app.start().catch((error) => {
    logger.error(`Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  });
}

// Export for testing or module usage
export { Application, AppConfig, Logger, ConsoleLogger };