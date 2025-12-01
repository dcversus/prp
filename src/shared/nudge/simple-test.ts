/**
 * Simple Nudge Test Functions
 *
 * Basic test utilities for nudge system connectivity and functionality.
 */
import { logger } from '../logger';

import { createNudgeClient } from './client';
/**
 * Run comprehensive nudge system test
 */
export async function runNudgeTest(): Promise<boolean> {
  logger.info('shared', 'nudge-test', '🧪 Starting Nudge System Test...');
  try {
    // Test 1: Configuration validation
    logger.info('shared', 'nudge-test', 'Test 1: Configuration validation');
    const client = createNudgeClient();
    const configStatus = client.getConfigStatus();
    if (!configStatus.hasSecret) {
      logger.error('shared', 'nudge-test', '❌ NUDGE_SECRET not configured');
      return false;
    }
    logger.info('shared', 'nudge-test', '✅ Configuration validation passed');
    logger.info('shared', 'nudge-test', `   Endpoint: ${configStatus.endpoint}`);
    logger.info('shared', 'nudge-test', `   Timeout: ${configStatus.timeout}ms`);
    // Test 2: Connectivity test
    logger.info('shared', 'nudge-test', 'Test 2: Connectivity test');
    const connectivityResult = await testNudgeConnectivity();
    if (!connectivityResult) {
      logger.error('shared', 'nudge-test', '❌ Connectivity test failed');
      return false;
    }
    logger.info('shared', 'nudge-test', '✅ Connectivity test passed');
    // Test 3: Message sending
    logger.info('shared', 'nudge-test', 'Test 3: Message sending test');
    try {
      const response = await client.sendNudge({
        type: 'direct',
        message: 'PRP CLI Nudge System Test - Successful!',
        urgency: 'low',
        metadata: {
          timestamp: new Date().toISOString(),
          auto_generated: true,
          agent_type: 'test',
        },
      });
      if (response.success) {
        logger.info('shared', 'nudge-test', '✅ Message sending test passed');
        logger.info('shared', 'nudge-test', `   Message ID: ${response.message_id}`);
        logger.info('shared', 'nudge-test', `   Delivery Type: ${response.delivery_type}`);
        if (response.sent_to) {
          logger.info('shared', 'nudge-test', `   Sent To: ${response.sent_to.join(', ')}`);
        }
      } else {
        logger.error('shared', 'nudge-test', '❌ Message sending test failed');
        return false;
      }
    } catch (error) {
      logger.error(
        'shared',
        'nudge-test',
        '❌ Message sending test failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
    }
    logger.info('shared', 'nudge-test', '🎉 All nudge system tests passed!');
    return true;
  } catch (error) {
    logger.error(
      'shared',
      'nudge-test',
      '❌ Nudge system test failed',
      error instanceof Error ? error : new Error(String(error)),
    );
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
    logger.error(
      'shared',
      'nudge-test',
      'Nudge connectivity test failed',
      error instanceof Error ? error : new Error(String(error)),
    );
    return false;
  }
}
