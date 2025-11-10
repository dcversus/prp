#!/usr/bin/env node

/**
 * Main CLI entry point for PRP
 * Handles command routing and global options
 */

// [da] CLI entry point implemented with commander.js - supports prp, prp init, prp orchestrator commands - robo-developer

import { Command } from 'commander';
import { createLayerLogger } from './shared/logger.js';
import { createInitCommand } from './commands/init.js';
import { createOrchestratorCommand } from './commands/orchestrator.js';

const logger = createLayerLogger('shared');
const program = new Command();

program
  .name('prp')
  .description('♫ @dcversus/prp - Autonomous Development Orchestration')
  .version('0.4.9')
  .configureOutput({
    writeErr: (str) => process.stderr.write(str),
    writeOut: (str) => process.stdout.write(str)
  })
  // Global options available for all commands (PRP-001 bootstrap requirements)
  .option('--ci', 'Run in CI mode without TUI or interactive prompts')
  .option('--debug', 'Enable debug mode with verbose logging and system monitoring')
  .option('--log-level <level>', 'Set logging level (error|warn|info|debug|verbose)', 'info')
  .option('--log-file <path>', 'Write logs to specified file')
  .option('--no-color', 'Disable colored output')
  .option('--mcp-port <port>', 'Start MCP server on specified port');

// Add version as explicit command
program
  .command('version')
  .description('Show version number')
  .action(() => {
    process.stdout.write(`${program.version()}\n`);
    process.exit(0);
  });

// Add core commands as specified in PRP-001
program.addCommand(createInitCommand());
program.addCommand(createOrchestratorCommand());

// Export program for testing
export { program };

// Only parse if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Check for version flag first - it should always exit after showing version
  if (args.includes('-V') || args.includes('--version')) {
    logger.info('cli', 'CLI', `Version: ${program.version()}`);
    process.exit(0);
  }

  // Check for help flag
  if (args.includes('-h') || args.includes('--help')) {
    program.help();
    process.exit(0);
  }

  // Parse commands with Commander
  try {
    program.parse();

    // Handle global --mcp-port option
    const opts = program.opts();
    if (opts.mcpPort) {
      // Start MCP server if --mcp-port is specified
      if (!process.env.API_SECRET) {
        logger.error(
          'cli',
          'CLI',
          'API_SECRET environment variable is required when using --mcp-port',
          new Error('Missing API_SECRET')
        );
        process.exit(1);
      }

      const { MCPServer } = await import('./mcp/server.js');
      const mcpConfig = {
        host: '0.0.0.0',
        port: parseInt(opts.mcpPort, 10) || 8080,
        ssl: false,
        apiSecret: process.env.API_SECRET,
        jwtExpiration: '24h',
        rateLimitWindow: 900000, // 15 minutes
        rateLimitMax: 100,
        corsOrigins: ['*'],
        enableStreaming: true,
        maxConnections: 10
      };

      const mcpServer = new MCPServer(mcpConfig);
      await mcpServer.start();

      logger.info('cli', 'CLI', `MCP Server started on port ${opts.mcpPort}`, {});
      logger.info(
        'cli',
        'CLI',
        `Metrics available at: http://localhost:${opts.mcpPort}/metrics`,
        {}
      );

      // Keep the process alive
      process.on('SIGINT', () => {
        void (async () => {
          logger.info('cli', 'CLI', 'Shutting down MCP Server...', {});
          await mcpServer.stop();
          process.exit(0);
        })();
      });
    }
  } catch (error) {
    logger.debug(
      'shared',
      'command-parsing-error',
      `Command parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error
        ? { error: error.message, stack: error.stack }
        : { error: String(error) }
    );
    process.exit(1);
  }
}
