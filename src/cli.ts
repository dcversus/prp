#!/usr/bin/env node
/**
 * Main CLI entry point for PRP
 * Handles command routing and global options
 */
// [da] CLI entry point implemented with commander.js - supports prp, prp init, prp orchestrator commands - robo-developer
import { Command } from 'commander';

import { initializeLogger } from './shared/logger';
import { createInitCommand } from './commands/init';
import { createOrchestratorCommand } from './commands/orchestrator';
import { createConfigCommand } from './commands/config';
import { createStatusCommand } from './commands/status';
import { createBuildCommand } from './commands/build';
import { createCodemapCommand } from './commands/codemap';
import { parsePort, type GlobalCLIOptions } from './cli/types';

const program = new Command();
program
  .name('prp')
  .description('♫ @dcversus/prp - Autonomous Development Orchestration')
  .version('0.4.9', '-v, --version', 'Show version number')
  .configureOutput({
    writeErr: (str) => process.stderr.write(str),
    writeOut: (str) => process.stdout.write(str),
  })
  // Configure help output
  .configureHelp({
    sortSubcommands: true,
  })
  // Global options available for all commands (comprehensive CLI requirements)
  .option('--ci', 'Run in CI mode without TUI or interactive prompts', false)
  .option('--debug', 'Enable debug mode with verbose logging and system monitoring', false)
  .option('--log-level <level>', 'Set logging level (error|warn|info|debug|verbose)', 'info')
  .option('--log-file <path>', 'Write logs to specified file')
  .option('--no-color', 'Disable colored output')
  .option('--mcp-port <port>', 'Start MCP server on specified port')
  .addHelpText(
    'afterAll',
    `
Examples:
  prp                                     Start orchestrator (default)
  prp init                                Interactive project initialization
  prp orchestrator                        Start TUI orchestrator mode
  prp orchestrator --ci                   Run orchestrator in CI mode
  prp config --list                       List all configuration values
  prp status --verbose                    Show detailed project status
  prp build --production                  Build project for production
  prp codemap generate                    Generate project codemap
  prp codemap inspect "function"          Search codemap for functions
  prp --mcp-port 8080                     Start with MCP server on port 8080

For more help on a specific command:
  prp <command> --help
  `,
  );
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
program.addCommand(createConfigCommand());
program.addCommand(createStatusCommand());
program.addCommand(createBuildCommand());
program.addCommand(createCodemapCommand());

// Export program for testing only
export { program }; // eslint-disable-line import/no-unused-modules
// Only parse if this file is run directly
if (import.meta.url.endsWith('cli.js') || import.meta.url.endsWith('cli.ts') || import.meta.url.endsWith('cli.mjs')) {
  let args = process.argv.slice(2);

  // Initialize logger with basic detection of CI mode early to avoid unwanted output
  const isCI = args.includes('--ci');
  const isDebug = args.includes('--debug');
  initializeLogger({
    ci: isCI,
    debug: isDebug,
    tuiMode: !isCI, // Default to TUI mode unless CI is explicitly requested
  });

  // Handle --watch internal option (remove from args before commander processes)
  const hasWatch = args.includes('--watch');
  if (hasWatch) {
    args = args.filter((arg) => arg !== '--watch');
    // Set watch flag for dev command
    process.env.PRP_DEV_WATCH = 'true';
  }

  // Also handle --watch flag that might come from npm script
  const watchIndex = args.findIndex((arg) => arg === '--watch');
  if (watchIndex !== -1) {
    args.splice(watchIndex, 1);
    process.env.PRP_DEV_WATCH = 'true';
  }

  // Handle version output with custom behavior
  const versionIndex = args.findIndex((arg) => arg === '-v' || arg === '--version');
  if (versionIndex !== -1) {
    // Version command should have NO output to stderr, only to stdout
    process.stdout.write(`${program.version()}\n`);
    process.exit(0);
  }
  // Handle dev command specially (internal command)
  if (args[0] === 'dev') {
    const { handleDevCommand } = await import('./commands/dev');
    const opts = program.opts<GlobalCLIOptions>();
    await handleDevCommand(opts);
    process.exit(0);
  }

  // Parse commands with Commander
  // If no command was provided, run orchestrator by default
  if (process.argv.length <= 2) {
    // Import and run orchestrator command handler directly
    const { handleOrchestratorCommand } = await import('./commands/orchestrator');
    const opts = program.opts<GlobalCLIOptions>();
    await handleOrchestratorCommand(opts);
  } else {
    // Parse and execute the command - use full process.argv, not sliced args
    program.parse(process.argv);
  }

  // Handle global --mcp-port option after command execution
  const opts = program.opts<GlobalCLIOptions>();

  if (opts.mcpPort !== undefined && opts.mcpPort !== '') {
    // Start MCP server if --mcp-port is specified
    const apiSecret = process.env.API_SECRET;
    if (!apiSecret) {
      // Simple error output to stderr for missing API_SECRET
      process.stderr.write(
        'Error: API_SECRET environment variable is required when using --mcp-port\n',
      );
      process.exit(1);
    }
    const { MCPServer } = await import('./mcp/server');
    const mcpConfig = {
      host: '0.0.0.0',
      port: parsePort(opts.mcpPort),
      ssl: false,
      apiSecret: apiSecret,
      jwtExpiration: '24h',
      rateLimitWindow: 900000, // 15 minutes
      rateLimitMax: 100,
      corsOrigins: ['*'],
      enableStreaming: true,
      maxConnections: 10,
    };
    const mcpServer = new MCPServer(mcpConfig);
    await mcpServer.start();

    // Only log if not in TUI mode
    if (!opts.ci) {
      // eslint-disable-next-line no-console
      console.log(`MCP Server started on port ${opts.mcpPort}`);
      // eslint-disable-next-line no-console
      console.log(`Metrics available at: http://localhost:${opts.mcpPort}/metrics`);
    }

    // Keep the process alive
    process.on('SIGINT', () => {
      void (async () => {
        if (!opts.ci) {
          // eslint-disable-next-line no-console
          console.log('Shutting down MCP Server...');
        }
        await mcpServer.stop();
        process.exit(0);
      })();
    });
  }
}
