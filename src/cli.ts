#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { createInitCommand } from './commands/init.js';
import { createOrchestratorCommand } from './commands/orchestrator.js';

const program = new Command();

program
  .name('prp')
  .description('Interactive Project Bootstrap CLI - Modern scaffolding tool with AI integration')
  .version('0.4.9')
  .configureOutput({
    writeErr: (str) => process.stderr.write(str),
    writeOut: (str) => process.stdout.write(str)
  })
  // Core global options as per PRP-001 specification
  .option('-c, --ci', 'Run in CI mode with non-interactive execution')
  .option('-d, --debug', 'Enable debug mode with verbose logging')
  .option('--log-level <level>', 'Set logging level (error, warn, info, debug, verbose)', 'info')
  .option('--no-color', 'Disable colored output for CI environments')
  .option('--log-file <path>', 'Output to file instead of console only with mcp')
  .option('--mcp-port <port>', 'Run MCP server, default for docker run is --ci --mcp-port 8080')
  .option('--config <path>', 'Path to configuration file (.prprc format)')
  .option('--limit <format>', 'Token limits format (e.g., 1k,2k#robo-role,100usd10k#agent-name)')
  .option('--instructions-path <path>', 'Path to instructions file (default: AGENTS.md)')
  .option('--verbose', 'Enable detailed operation logging')
  .option('-n, --name <name>', 'project name')
  .option('--description <description>', 'project description')
  .option('--force', 'Force initialization even in existing directories, use defaults for all options')
  .option('--openai-api-key <key>', 'OpenAI API key for LLM generation')
  
// Add only the commands specified in PRP-001
program.addCommand(createInitCommand());
program.addCommand(createOrchestratorCommand());

// Export program for testing
export { program };

// Only parse if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Handle default behavior when no command is specified
  if (args.length === 0 || (!args.includes('init') && !args.includes('orchestrator') && !args.includes('help') && !args.includes('--help') && !args.includes('-h'))) {
    // No command provided, check if .prprc exists and decide what to run
    (async () => {
      try {
        await fs.access('.prprc');
        // .prprc exists, run orchestrator
        const { handleOrchestratorCommand } = await import('./commands/orchestrator.js');
        await handleOrchestratorCommand(program.opts());
      } catch {
        // .prprc doesn't exist, run init
        const { handleInitCommand } = await import('./commands/init.js');
        await handleInitCommand(program.opts(), undefined);
      }
    })();
  } else {
    // Command provided, let Commander handle it
    program.parse();
  }
}
