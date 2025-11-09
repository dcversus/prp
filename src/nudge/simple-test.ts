/**
 * Simple Nudge Test Functions
 *
 * Basic test utilities for nudge system connectivity and functionality.
 */

import { createNudgeClient } from './client.js';
import { logger } from '../utils/logger.js';

/**
 * Run comprehensive nudge system test
 */
export async function runNudgeTest(): Promise<boolean> {
  logger.info('nudge', '🧪 Starting Nudge System Test...');

  try {
    // Test 1: Configuration validation
    logger.info('nudge', 'Test 1: Configuration validation');
    const client = createNudgeClient();
    const configStatus = client.getConfigStatus();

    if (!configStatus.hasSecret) {
      logger.error('nudge', '❌ NUDGE_SECRET not configured');
      return false;
    }

    logger.info('nudge', '✅ Configuration validation passed');
    logger.info('nudge', `   Endpoint: ${configStatus.endpoint}`);
    logger.info('nudge', `   Timeout: ${configStatus.timeout}ms`);

    // Test 2: Connectivity test
    logger.info('nudge', 'Test 2: Connectivity test');
    const connectivityResult = await testNudgeConnectivity();

    if (!connectivityResult) {
      logger.error('nudge', '❌ Connectivity test failed');
      return false;
    }

    logger.info('nudge', '✅ Connectivity test passed');

    // Test 3: Message sending
    logger.info('nudge', 'Test 3: Message sending test');
    try {
      const response = await client.sendNudge({
        type: 'direct',
        message: 'PRP CLI Nudge System Test - Successful!',
        urgency: 'low',
        metadata: {
          timestamp: new Date().toISOString(),
          test_mode: true,
          source: 'prp-cli-test'
        }
      });

      if (response.success) {
        logger.info('nudge', '✅ Message sending test passed');
        logger.info('nudge', `   Message ID: ${response.message_id}`);
        logger.info('nudge', `   Delivery Type: ${response.delivery_type}`);
        if (response.sent_to) {
          logger.info('nudge', `   Sent To: ${response.sent_to.join(', ')}`);
        }
      } else {
        logger.error('nudge', '❌ Message sending test failed');
        return false;
      }
    } catch (error) {
      logger.error('nudge', '❌ Message sending test failed', error instanceof Error ? error : new Error(String(error)));
      return false;
    }

    logger.info('nudge', '🎉 All nudge system tests passed!');
    return true;

  } catch (error) {
    logger.error('nudge', '❌ Nudge system test failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Test nudge connectivity only
 */
export async function testNudgeConnectivity(): Promise<boolean> {
  try {
    const client = createNudgeClient();
    return await client.testConnectivity();
  } catch (error) {
    logger.error('nudge', 'Nudge connectivity test failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}