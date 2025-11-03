/**
 * Nudge CLI Commands
 *
 * Provides command-line interface for nudge system operations.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { runNudgeTest, testNudgeConnectivity } from '../nudge/simple-test.js';

/**
 * Create nudge command group
 */
export function createNudgeCommand(): Command {
  const nudgeCmd = new Command('nudge')
    .description('Manage nudge communications with dcmaidbot');

  // Test command
  nudgeCmd
    .command('test')
    .description('Test nudge system connectivity and configuration')
    .action(async () => {
      console.log(chalk.blue('🧪 Testing Nudge System...\n'));

      try {
        const success = await runNudgeTest();
        if (!success) {
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error);
        process.exit(1);
      }
    });

  // Send command
  nudgeCmd
    .command('send')
    .description('Send a nudge message')
    .argument('<message>', 'Message to send')
    .option('-u, --urgency <urgency>', 'Urgency level: high, medium, low', 'medium')
    .action(async (message, options) => {
      console.log(chalk.blue('📤 Sending Nudge Message...\n'));

      try {
        const spinner = ora('Sending nudge...').start();

        const secret = process.env.NUDGE_SECRET;
        const endpoint = process.env.NUDGE_ENDPOINT || 'https://dcmaid.theedgestory.org/nudge';

        if (!secret) {
          spinner.fail('NUDGE_SECRET not configured');
          process.exit(1);
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secret}`,
            'User-Agent': 'prp-cli/0.5.0'
          },
          body: JSON.stringify({
            type: 'direct',
            message: message,
            urgency: options.urgency || 'medium',
            metadata: {
              timestamp: new Date().toISOString(),
              cli_version: '0.5.0'
            }
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          spinner.succeed('Nudge sent successfully!');

          console.log(chalk.green('\n📊 Response Details:'));
          console.log(`Success: ${data.success ? 'Yes' : 'No'}`);
          console.log(`Message ID: ${data.message_id || 'N/A'}`);
          console.log(`Sent To: ${data.sent_to?.join(', ') || 'N/A'}`);
          console.log(`Delivery Type: ${data.delivery_type || 'N/A'}`);
          console.log(`Timestamp: ${data.timestamp || 'N/A'}`);

          if (data.error) {
            console.log(chalk.red(`\n⚠️  Error: ${data.error}`));
          }
        } else {
          spinner.fail(`Failed to send nudge: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error details:', errorText);
          process.exit(1);
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to send nudge:'), error);
        process.exit(1);
      }
    });

  // Status command
  nudgeCmd
    .command('status')
    .description('Check nudge system status and health')
    .action(async () => {
      console.log(chalk.blue('📊 Nudge System Status\n'));

      const secret = process.env.NUDGE_SECRET;
      const adminId = process.env.ADMIN_ID;
      const endpoint = process.env.NUDGE_ENDPOINT || 'https://dcmaid.theedgestory.org/nudge';

      console.log('Configuration:');
      console.log(`   Endpoint: ${endpoint}`);
      console.log(`   Secret Configured: ${secret ? '✅ Yes' : '❌ No'}`);
      console.log(`   Admin ID Configured: ${adminId ? '✅ Yes' : '⚠️  No'}`);

      if (secret) {
        console.log(`   Secret Length: ${secret.length} characters`);
      }

      console.log('');
      const connectivity = await testNudgeConnectivity();
      if (connectivity) {
        console.log(chalk.green('✅ Connectivity: PASSED'));
        console.log(chalk.green('\n🎉 Nudge system is healthy and ready to use!'));
      } else {
        console.log(chalk.red('❌ Connectivity: FAILED'));
        console.log(chalk.red('\n⚠️  Nudge system has connectivity issues.'));
      }
    });

  return nudgeCmd;
}