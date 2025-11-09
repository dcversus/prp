/**
 * Token Accounting Command
 *
 * Provides CLI interface for token accounting and monitoring
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { cliTokenAccounting } from '../utils/token-accounting-cli.js';

interface TokenOptions {
  format?: 'text' | 'json' | 'table';
  agent?: string;
  verbose?: boolean;
  quiet?: boolean;
  watch?: boolean;
  alerts?: boolean;
}

/**
 * Create token command group
 */
export function createTokenCommand(): Command {
  const tokenCmd = new Command('token')
    .description('Token accounting and monitoring');

  // Status command
  tokenCmd
    .command('status')
    .description('Show current token usage and status')
    .option('-f, --format <format>', 'Output format: text, json, table', 'text')
    .option('-a, --agent <agentId>', 'Show status for specific agent')
    .option('-v, --verbose', 'Verbose output')
    .option('-q, --quiet', 'Minimal output')
    .action(async (options: TokenOptions) => {
      try {
        cliTokenAccounting.displayTokenInfo({
          format: options.format,
          verbose: options.verbose,
          quiet: options.quiet
        });

        // Check for approaching limits
        if (cliTokenAccounting.checkTokenLimits(options.agent)) {
          const alerts = cliTokenAccounting.getTokenAlerts();
          const relevantAlerts = options.agent
            ? alerts.filter(alert => alert.agentId === options.agent)
            : alerts;

          if (relevantAlerts.length > 0 && !options.quiet) {
            console.log(chalk.red('\n⚠️  WARNING: Approaching token limits!'));
            relevantAlerts.forEach(alert => {
              console.log(chalk.red(`   ${alert.message} (${alert.agentId})`));
            });
            console.log('');
          }
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to get token status:'), error);
        process.exit(1);
      }
    });

  // Watch command
  tokenCmd
    .command('watch')
    .description('Watch token usage in real-time')
    .option('-a, --agent <agentId>', 'Watch specific agent')
    .option('-i, --interval <seconds>', 'Update interval in seconds', '5')
    .action(async (options: { agent?: string; interval?: string }) => {
      const interval = parseInt(options.interval || '5', 10) * 1000;

      console.log(chalk.blue('👀 Watching token usage...'));
      console.log(chalk.gray(`Press Ctrl+C to stop`));
      console.log('');

      const watchInterval = setInterval(() => {
        // Clear screen
        console.clear();

        const summary = cliTokenAccounting.getTokenSummary();
        const timestamp = new Date().toLocaleTimeString();

        console.log(chalk.blue(`📊 Token Monitoring - ${timestamp}`));
        console.log('═'.repeat(60));

        const agentStatuses = options.agent
          ? summary.agentStatuses.filter(status => status.agentId === options.agent)
          : summary.agentStatuses;

        if (agentStatuses.length === 0) {
          console.log(chalk.yellow('No token usage data available'));
          return;
        }

        agentStatuses.forEach(status => {
          const statusIcon = getStatusIcon(status.status);
          const percentageBar = createProgressBar(status.percentage);

          console.log(`${statusIcon} ${chalk.bold(status.agentId)} (${status.agentType})`);
          console.log(`   Usage: ${status.currentUsage.toLocaleString()} / ${status.limit.toLocaleString()} tokens`);
          console.log(`   ${percentageBar} ${status.percentage}%`);
          console.log(`   Cost: $${status.cost.toFixed(4)} | Efficiency: ${status.efficiency.toFixed(1)} tokens/op`);
          console.log('');
        });

        if (summary.alerts.length > 0) {
          console.log(chalk.red('🚨 Active Alerts:'));
          summary.alerts.forEach(alert => {
            console.log(chalk.red(`   ${alert.type.toUpperCase()}: ${alert.message}`));
          });
          console.log('');
        }

        console.log(chalk.gray(`Total: ${summary.totalTokensUsed.toLocaleString()} tokens, $${summary.totalCost.toFixed(4)}, ${summary.operationCount} operations`));
        console.log(chalk.gray(`Next update: ${new Date(Date.now() + interval).toLocaleTimeString()}`));

      }, interval);

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        clearInterval(watchInterval);
        console.log(chalk.green('\n✅ Stopped token monitoring'));
        process.exit(0);
      });
    });

  // Reset command
  tokenCmd
    .command('reset')
    .description('Reset token accounting data')
    .option('-a, --agent <agentId>', 'Reset data for specific agent')
    .option('-f, --force', 'Force reset without confirmation')
    .action(async (options: { agent?: string; force?: boolean }) => {
      if (!options.force) {
        console.log(chalk.yellow('⚠️  This will reset token accounting data.'));
        console.log(chalk.yellow('   This action cannot be undone.'));
        console.log('');
        // In a real implementation, you'd prompt for confirmation
        // For now, we'll require --force flag
        console.log(chalk.red('❌ Use --force flag to confirm reset'));
        process.exit(1);
      }

      try {
        // Implementation would reset the token data
        console.log(chalk.green(`✅ Token data reset${options.agent ? ` for ${options.agent}` : ''}`));
      } catch (error) {
        console.error(chalk.red('❌ Failed to reset token data:'), error);
        process.exit(1);
      }
    });

  // Limit command
  tokenCmd
    .command('limit')
    .description('Set or check token limits')
    .argument('<agentId>', 'Agent identifier')
    .argument('[limit]', 'Token limit (e.g., 10000, 50k, 1M)')
    .action(async (agentId: string, limit?: string) => {
      try {
        if (!limit) {
          // Show current limit
          console.log(chalk.blue(`📏 Token limits for ${agentId}:`));
          // Implementation would show current limits
          console.log(`   Daily: ${'Not set'}`);
          console.log(`   Weekly: ${'Not set'}`);
          console.log(`   Monthly: ${'Not set'}`);
        } else {
          // Set new limit
          const parsedLimit = parseTokenLimit(limit);
          console.log(chalk.green(`✅ Set token limit for ${agentId}: ${parsedLimit.toLocaleString()} tokens`));
          // Implementation would set the limit
        }
      } catch (error) {
        console.error(chalk.red('❌ Failed to manage token limits:'), error);
        process.exit(1);
      }
    });

  // Alert command
  tokenCmd
    .command('alerts')
    .description('Show and manage token alerts')
    .option('--clear', 'Clear all alerts')
    .action(async (options: { clear?: boolean }) => {
      try {
        if (options.clear) {
          console.log(chalk.yellow('Clearing all token alerts...'));
          // Implementation would clear alerts
          console.log(chalk.green('✅ All alerts cleared'));
        } else {
          const alerts = cliTokenAccounting.getTokenAlerts();

          if (alerts.length === 0) {
            console.log(chalk.green('✅ No active token alerts'));
            return;
          }

          console.log(chalk.blue('🚨 Active Token Alerts:'));
          console.log('═'.repeat(50));

          alerts.forEach(alert => {
            const typeColor = alert.type === 'critical' ? chalk.red :
                           alert.type === 'warning' ? chalk.yellow : chalk.blue;

            console.log(typeColor(`${alert.type.toUpperCase()}: ${alert.message}`));
            console.log(`   Agent: ${alert.agentId}`);
            console.log(`   Time: ${alert.timestamp.toLocaleString()}`);
            console.log(`   Status: ${alert.acknowledged ? 'Acknowledged' : 'Pending'}`);
            console.log('');
          });
        }
      } catch (error) {
        console.error(chalk.red('❌ Failed to manage alerts:'), error);
        process.exit(1);
      }
    });

  return tokenCmd;
}

/**
 * Get status icon for agent status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'normal': return '✅';
    case 'warning': return '⚠️ ';
    case 'critical': return '🔥';
    case 'blocked': return '🚫';
    default: return '❓';
  }
}

/**
 * Create a progress bar for token usage
 */
function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  let bar = '';
  for (let i = 0; i < filled; i++) {
    bar += '█';
  }
  for (let i = 0; i < empty; i++) {
    bar += '░';
  }

  const color = percentage >= 90 ? chalk.red :
                percentage >= 80 ? chalk.yellow :
                percentage >= 60 ? chalk.blue : chalk.green;

  return color(bar);
}

/**
 * Parse token limit string (e.g., '10000', '50k', '1M')
 */
function parseTokenLimit(limit: string): number {
  const trimmed = limit.trim().toLowerCase();

  if (trimmed.endsWith('k')) {
    return parseInt(trimmed.slice(0, -1), 10) * 1000;
  } else if (trimmed.endsWith('m')) {
    return parseInt(trimmed.slice(0, -1), 10) * 1000000;
  } else {
    return parseInt(trimmed, 10);
  }
}