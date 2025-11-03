/**
 * Secret Management CLI Commands
 *
 * Provides command-line interface for Kubernetes secret management.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createSecretManager, createKubectlSecretManager } from '../kubectl/secret-manager.js';

const secretManager = createSecretManager();

/**
 * Create secret command group
 */
export function createSecretCommand(): Command {
  const secretCmd = new Command('secret')
    .description('Manage Kubernetes secrets for PRP system');

  // Get command
  secretCmd
    .command('get')
    .description('Retrieve NUDGE_SECRET from Kubernetes')
    .option('-n, --namespace <namespace>', 'Kubernetes namespace', 'dcmaidbot')
    .option('-s, --secret <secret>', 'Secret name', 'dcmaidbot-secrets')
    .option('-f, --field <field>', 'Secret field', 'NUDGE_SECRET')
    .option('--no-cache', 'Bypass cache')
    .option('--show', 'Show full secret value (use with caution)')
    .action(async (options) => {
      console.log(chalk.blue('🔑 Retrieving NUDGE_SECRET from Kubernetes...\n'));

      try {
        const result = await secretManager.getNudgeSecret({
          forceRefresh: options.cache === false
        });
        const secret = result.value;

        if (options.show) {
          console.log(chalk.green('Secret value:'));
          console.log(secret);
        } else {
          const visible = `${secret.substring(0, 8)}...${secret.substring(secret.length - 8)}`;
          console.log(chalk.green(`Secret: ${visible}`));
          console.log(chalk.gray(`Length: ${secret.length} characters`));
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to retrieve secret:'), error);
        process.exit(1);
      }
    });

  // Test command
  secretCmd
    .command('test')
    .description('Test secret retrieval and validation')
    .action(async () => {
      console.log(chalk.blue('🧪 Testing Secret Management...\n'));

      try {
        const status = await secretManager.getStatus();

        console.log(`${status.kubectl_available ? '✅ PASS' : '❌ FAIL'} kubectl Available`);
        console.log(`${status.cluster_connected ? '✅ PASS' : '❌ FAIL'} Cluster Connected`);
        console.log(`${status.secret_accessible ? '✅ PASS' : '❌ FAIL'} Secret Retrieved`);
        console.log(`${status.validation_result ? '✅ PASS' : '❌ FAIL'} Secret Validated`);

        console.log(chalk.blue('\n📊 Status Details:'));
        console.log(`   Cache Enabled: ${status.cache_enabled ? '✅ Yes' : '❌ No'}`);
        if (status.last_retrieval) {
          console.log(`   Last Retrieval: ${status.last_retrieval.toISOString()}`);
        }
        if (status.last_validation) {
          console.log(`   Last Validation: ${status.last_validation.toISOString()}`);
        }

        if (status.kubectl_available && status.secret_accessible) {
          console.log(chalk.green('\n🎉 All tests passed!'));
        } else {
          console.log(chalk.yellow('\n⚠️  Some tests failed. Check configuration.'));
        }

      } catch (error) {
        console.error(chalk.red('❌ Secret test failed:'), error);
        process.exit(1);
      }
    });

  // Status command
  secretCmd
    .command('status')
    .description('Check secret manager status')
    .action(async () => {
      console.log(chalk.blue('📊 Secret Manager Status\n'));

      try {
        const status = await secretManager.getStatus();

        console.log(`${status.kubectl_available ? '✅' : '❌'} kubectl Available`);
        console.log(`${status.cluster_connected ? '✅' : '❌'} Cluster Connected`);
        console.log(`${status.secret_accessible ? '✅' : '❌'} Secret Accessible`);
        console.log(`${status.cache_enabled ? '✅' : '❌'} Cache Enabled`);

        if (status.last_retrieval) {
          console.log(chalk.yellow(`\nLast Retrieval: ${status.last_retrieval.toLocaleString()}`));
        }

        if (status.last_validation) {
          console.log(chalk.yellow(`Last Validation: ${status.last_validation.toLocaleString()}`));
          console.log(chalk.yellow(`Validation Result: ${status.validation_result ? '✅ PASSED' : '❌ FAILED'}`));
        }

        // Cache information
        const cacheInfo = secretManager.getCacheInfo();
        if (cacheInfo.length > 0) {
          console.log(chalk.yellow('\nCache Information:'));
          cacheInfo.forEach(info => {
            console.log(`${info.expired ? '❌ Expired' : '✅ Active'} ${info.key} - TTL: ${Math.round(info.ttl / 1000)}s`);
          });
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to get status:'), error);
        process.exit(1);
      }
    });

  // Cache commands
  const cacheCmd = secretCmd
    .command('cache')
    .description('Manage secret cache');

  cacheCmd
    .command('clear')
    .description('Clear secret cache')
    .option('-n, --namespace <namespace>', 'Clear only specific namespace')
    .option('-s, --secret <secret>', 'Clear only specific secret')
    .action(async (options) => {
      try {
        if (options.namespace || options.secret) {
          secretManager.clearCache({
            namespace: options.namespace,
            name: options.secret,
            field: 'NUDGE_SECRET'
          });
          console.log(chalk.green('✅ Specific cache entries cleared'));
        } else {
          secretManager.clearCache();
          console.log(chalk.green('✅ All cache cleared'));
        }
      } catch (error) {
        console.error(chalk.red('❌ Failed to clear cache:'), error);
        process.exit(1);
      }
    });

  cacheCmd
    .command('info')
    .description('Show cache information')
    .action(async () => {
      console.log(chalk.blue('📋 Cache Information\n'));

      try {
        const cacheInfo = secretManager.getCacheInfo();

        if (cacheInfo.length === 0) {
          console.log(chalk.yellow('No cached secrets found'));
          return;
        }

        cacheInfo.forEach(info => {
          console.log(`${info.expired ? '❌ Expired' : '✅ Active'} ${info.key}`);
          console.log(`  Created: ${info.timestamp.toLocaleString()}`);
          console.log(`  Expires: ${info.expires.toLocaleString()}`);
          console.log(`  Time to Live: ${Math.round(info.ttl / 1000)}s`);
          console.log('');
        });

      } catch (error) {
        console.error(chalk.red('❌ Failed to get cache info:'), error);
        process.exit(1);
      }
    });

  cacheCmd
    .command('clean')
    .description('Clean expired cache entries')
    .action(async () => {
      try {
        const cleaned = secretManager.cleanExpiredCache();
        console.log(chalk.green(`✅ Cleaned ${cleaned} expired cache entries`));
      } catch (error) {
        console.error(chalk.red('❌ Failed to clean cache:'), error);
        process.exit(1);
      }
    });

  // Enhanced kubectl command
  secretCmd
    .command('kubectl')
    .description('Enhanced kubectl secret management')
    .option('-f, --force-refresh', 'Force refresh from cluster, ignore cache')
    .option('-n, --namespace <namespace>', 'Kubernetes namespace', 'dcmaidbot')
    .option('-s, --secret-name <name>', 'Secret name', 'dcmaidbot-secrets')
    .option('-k, --secret-key <key>', 'Secret key', 'NUDGE_SECRET')
    .action(async (options) => {
      console.log(chalk.blue('🔑 Enhanced Kubernetes Secret Management\n'));

      try {
        const manager = createKubectlSecretManager({
          namespace: options.namespace,
          secretName: options.secretName,
          secretKey: options.secretKey
        });

        // Check kubectl status
        const spinner = ora('Checking kubectl status...').start();
        const status = await manager.getKubectlStatus();

        if (!status.available) {
          spinner.fail('kubectl not available');
          console.error(chalk.red('❌ kubectl is not installed or not in PATH'));
          process.exit(1);
        }

        if (!status.connected) {
          spinner.fail('Not connected to Kubernetes cluster');
          console.error(chalk.red('❌ Cannot connect to Kubernetes cluster'));
          if (status.error) {
            console.error(chalk.red('Error:'), status.error);
          }
          process.exit(1);
        }

        spinner.succeed('Connected to Kubernetes cluster');

        if (status.clusterInfo) {
          console.log(chalk.green('📊 Cluster Information:'));
          console.log(`   Server: ${status.clusterInfo.server}`);
          console.log(`   Context: ${status.clusterInfo.context}`);
          console.log(`   Namespace: ${status.clusterInfo.namespace}`);
          console.log('');
        }

        // Test secret access
        const accessSpinner = ora('Testing secret access...').start();
        const accessTest = await manager.testSecretAccess();

        if (accessTest.accessible) {
          accessSpinner.succeed('Secret accessible');
        } else {
          accessSpinner.fail('Secret not accessible');
          console.error(chalk.red(`❌ ${accessTest.error}`));
          process.exit(1);
        }

        // Retrieve secret
        const retrieveSpinner = ora('Retrieving secret...').start();
        const result = await manager.getNudgeSecret({
          forceRefresh: options.forceRefresh
        });

        retrieveSpinner.succeed('Secret retrieved successfully');

        console.log(chalk.green('\n🔑 Secret Information:'));
        console.log(`   Retrieved: ${result.retrievedAt}`);
        console.log(`   Expires: ${result.expiresAt}`);
        console.log(`   From Cache: ${result.fromCache ? 'Yes' : 'No'}`);
        console.log(`   Length: ${result.value.length} characters`);

        // Show masked secret
        const maskedSecret = result.value.substring(0, 8) + '...' + result.value.substring(result.value.length - 4);
        console.log(`   Value: ${chalk.cyan(maskedSecret)}`);

        // Validate secret
        const validateSpinner = ora('Validating secret...').start();
        const validation = await manager.validateSecret(result.value);

        if (validation.isValid) {
          validateSpinner.succeed('Secret validation passed');
          console.log(chalk.green(`   Format: ${validation.metadata.format}`));
        } else {
          validateSpinner.fail('Secret validation failed');
          console.error(chalk.red(`   Error: ${validation.error}`));
        }

        // Export to environment variable
        process.env.NUDGE_SECRET = result.value;
        console.log(chalk.green('\n✅ NUDGE_SECRET exported to environment variable'));

        console.log(chalk.green('\n🎉 Enhanced secret retrieval completed successfully!'));

      } catch (error) {
        console.error(chalk.red('\n❌ Failed to retrieve secret:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return secretCmd;
}