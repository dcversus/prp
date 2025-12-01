/**
 * ♫ Token Monitoring Usage Examples for @dcversus/prp
 *
 * This file demonstrates how to use the comprehensive token monitoring system
 * that integrates multi-provider accounting, real-time detection, cap enforcement,
 * and automated alerting.
 */
import { createLayerLogger } from '../../shared';
import {
  quickStartTokenMonitoring,
  createTokenMonitoringSystem
} from '../token-monitoring-integration';

import type {
  TokenMonitoringIntegrationConfig} from '../token-monitoring-integration';

const logger = createLayerLogger('examples');

/**
 * Example 1: Quick Start - Easiest way to get started
 */
async function quickStartExample(): Promise<void> {
  logger.info('TokenMonitoringUsage', 'Starting quick start example...');

  try {
    // Quick start with default configuration
    const tokenSystem = await quickStartTokenMonitoring({
      persistPath: '.prp/token-accounting.json',
      enableRealTimeDetection: true,
      enableCapEnforcement: true,
      enableAlerting: true,
    });

    // Get current system status
    const status = tokenSystem.getSystemStatus();
    logger.info('TokenMonitoringUsage', 'System status', { status });

    // Get TUI data for dashboard
    const tuiData = await tokenSystem.getTUIData();
    logger.info('TokenMonitoringUsage', 'TUI data summary', {
      totalAgents: tuiData.summary.totalAgents,
      totalTokensUsed: tuiData.summary.totalTokensUsed,
      totalCost: tuiData.summary.totalCost,
      activeAlerts: tuiData.summary.activeAlerts,
    });

    // Record some sample usage
    tokenSystem.recordUsage(
      'test-agent',
      'test-operation',
      1000, // input tokens
      500,  // output tokens
      {
        model: 'claude-3-5-sonnet',
        provider: 'anthropic',
        operation: 'code-analysis',
      }
    );

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check updated status
    const updatedStatus = tokenSystem.getSystemStatus();
    logger.info('TokenMonitoringUsage', 'Updated system status', { updatedStatus });

    // Stop the system
    await tokenSystem.stop();

    logger.info('TokenMonitoringUsage', '✅ Quick start example completed');

  } catch (error) {
    logger.error('TokenMonitoringUsage', 'Quick start example failed', error as Error);
  }
}

/**
 * Example 2: Advanced Configuration with Custom Alert Rules
 */
async function advancedConfigurationExample(): Promise<void> {
  logger.info('TokenMonitoringUsage', 'Starting advanced configuration example...');

  try {
    // Custom alert rules
    const customAlertRules = [
      {
        id: 'custom_high_cost_alert',
        name: 'Custom High Cost Alert',
        description: 'Alert when hourly cost exceeds $25',
        enabled: true,
        type: 'threshold' as const,
        severity: 'critical' as const,
        conditions: [
          {
            metric: 'cost.hourly_total',
            operator: 'gt' as const,
            value: 25,
            aggregation: 'sum' as const,
            timeframe: 60,
          },
        ],
        cooldown: 15,
        maxFrequency: 2,
        escalation: [],
        actions: [
          {
            type: 'log' as const,
            config: { level: 'error' },
            enabled: true,
          },
          {
            type: 'nudge' as const,
            config: { priority: 'urgent', message: 'High cost threshold exceeded!' },
            enabled: true,
          },
        ],
      },
    ];

    const config: TokenMonitoringIntegrationConfig = {
      persistPath: '.prp/advanced-token-accounting.json',
      enableRealTimeDetection: true,
      enableCapEnforcement: true,
      enableAlerting: true,
      updateInterval: 3000, // 3 seconds
      retentionPeriod: 48, // 48 hours
      alertRules: customAlertRules,
    };

    const tokenSystem = createTokenMonitoringSystem(config);

    // Initialize and start
    await tokenSystem.initialize();
    await tokenSystem.start();

    // Listen for events
    tokenSystem.on('alert', (alert) => {
      logger.info('TokenMonitoringUsage', 'Alert received', {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
      });
    });

    tokenSystem.on('nudge_request', (nudge) => {
      logger.info('TokenMonitoringUsage', 'Nudge request', {
        priority: nudge.priority,
        message: nudge.message,
      });
    });

    // Simulate high cost scenario
    logger.info('TokenMonitoringUsage', 'Simulating high cost scenario...');

    // Record usage that would trigger the alert
    for (let i = 0; i < 10; i++) {
      tokenSystem.recordUsage(
        `high-cost-agent-${i}`,
        'expensive-operation',
        50000, // Large token usage
        25000,
        {
          model: 'claude-3-5-sonnet',
          provider: 'anthropic',
          cost: 3.0, // $3 per operation
        }
      );
    }

    // Wait for processing and alert generation
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check for alerts
    const activeAlerts = tokenSystem.getActiveAlerts();
    logger.info('TokenMonitoringUsage', 'Active alerts', { count: activeAlerts.length });

    // Get provider usage
    const providerUsage = tokenSystem.getProviderUsage();
    logger.info('TokenMonitoringUsage', 'Provider usage', providerUsage);

    // Get enforcement status
    const enforcementStatus = tokenSystem.getEnforcementStatus();
    logger.info('TokenMonitoringUsage', 'Enforcement status', {
      inspectorUsage: enforcementStatus.inspector.currentUsage,
      orchestratorUsage: enforcementStatus.orchestrator.currentUsage,
      systemStatus: enforcementStatus.systemStatus,
    });

    // Stop the system
    await tokenSystem.stop();

    logger.info('TokenMonitoringUsage', '✅ Advanced configuration example completed');

  } catch (error) {
    logger.error('TokenMonitoringUsage', 'Advanced configuration example failed', error as Error);
  }
}

/**
 * Example 3: Real-time Monitoring with Event Handling
 */
async function realTimeMonitoringExample(): Promise<void> {
  logger.info('TokenMonitoringUsage', 'Starting real-time monitoring example...');

  try {
    const tokenSystem = await quickStartTokenMonitoring({
      enableRealTimeDetection: true,
      enableAlerting: true,
      updateInterval: 2000, // 2 seconds
    });

    // Set up comprehensive event listeners
    tokenSystem.on('started', () => {
      logger.info('TokenMonitoringUsage', '🚀 Token monitoring system started');
    });

    tokenSystem.on('alert', (alert) => {
      logger.warn('TokenMonitoringUsage', '🚨 Alert triggered', {
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
      });
    });

    tokenSystem.on('alert_escalated', (alert) => {
      logger.error('TokenMonitoringUsage', '🔥 Alert escalated', {
        id: alert.id,
        level: alert.escalationLevel,
        severity: alert.severity,
      });
    });

    tokenSystem.on('nudge_request', (nudge) => {
      logger.info('TokenMonitoringUsage', '📬 Nudge request', nudge);
    });

    tokenSystem.on('data_update', (data) => {
      logger.debug('TokenMonitoringUsage', '📊 Data update', { type: data.type });
    });

    // Simulate various activities over time
    const activities = [
      { agent: 'claude-code', operation: 'code-generation', tokens: 8000, output: 4000 },
      { agent: 'inspector', operation: 'signal-analysis', tokens: 12000, output: 6000 },
      { agent: 'orchestrator', operation: 'task-coordination', tokens: 5000, output: 2500 },
      { agent: 'scanner', operation: 'file-analysis', tokens: 3000, output: 1500 },
    ];

    logger.info('TokenMonitoringUsage', 'Starting simulated activities...');

    // Run activities with intervals
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      logger.info('TokenMonitoringUsage', `Simulating ${activity.operation} for ${activity.agent}`);

      tokenSystem.recordUsage(
        activity.agent,
        activity.operation,
        activity.tokens,
        activity.output,
        {
          model: 'claude-3-5-sonnet',
          provider: 'anthropic',
          timestamp: new Date().toISOString(),
        }
      );

      // Wait between activities
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check system status after each activity
      const status = tokenSystem.getSystemStatus();
      logger.debug('TokenMonitoringUsage', 'System status after activity', {
        activity: activity.operation,
        uptime: status.uptime,
        activeAlerts: status.alerts.active,
      });
    }

    // Get final system overview
    const finalStatus = tokenSystem.getSystemStatus();
    const tuiData = await tokenSystem.getTUIData();
    const performanceMetrics = tokenSystem.getPerformanceMetrics();

    logger.info('TokenMonitoringUsage', '📈 Final system overview', {
      uptime: finalStatus.uptime,
      totalTokensUsed: tuiData.summary.totalTokensUsed,
      totalCost: tuiData.summary.totalCost,
      activeAlerts: finalStatus.alerts.active,
      performance: performanceMetrics,
    });

    // Stop the system
    await tokenSystem.stop();

    logger.info('TokenMonitoringUsage', '✅ Real-time monitoring example completed');

  } catch (error) {
    logger.error('TokenMonitoringUsage', 'Real-time monitoring example failed', error as Error);
  }
}

/**
 * Example 4: Alert Management and Resolution
 */
async function alertManagementExample(): Promise<void> {
  logger.info('TokenMonitoringUsage', 'Starting alert management example...');

  try {
    const tokenSystem = await quickStartTokenMonitoring({
      enableAlerting: true,
      enableCapEnforcement: true,
    });

    // Listen for alert events
    tokenSystem.on('alert', (alert) => {
      logger.warn('TokenMonitoringUsage', 'New alert', {
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
      });
    });

    // Generate some alerts by exceeding thresholds
    logger.info('TokenMonitoringUsage', 'Generating alerts...');

    // Simulate inspector limit exceeded
    for (let i = 0; i < 15; i++) {
      tokenSystem.recordUsage(
        'inspector-test',
        'heavy-analysis',
        50000, // Large usage to trigger alerts
        25000,
        {
          model: 'claude-3-5-sonnet',
          provider: 'anthropic',
          operation: 'signal-processing',
        }
      );
    }

    // Wait for alert generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get active alerts
    const activeAlerts = tokenSystem.getActiveAlerts();
    logger.info('TokenMonitoringUsage', 'Active alerts generated', {
      count: activeAlerts.length,
      alerts: activeAlerts.map(a => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        acknowledged: a.acknowledged,
      })),
    });

    // Demonstrate alert acknowledgment
    if (activeAlerts.length > 0) {
      const firstAlert = activeAlerts[0];
      logger.info('TokenMonitoringUsage', 'Acknowledging alert', { alertId: firstAlert.id });

      const acknowledged = tokenSystem.acknowledgeAlert(firstAlert.id, 'example-user');
      logger.info('TokenMonitoringUsage', 'Alert acknowledgment result', { acknowledged });

      // Verify acknowledgment
      const updatedAlerts = tokenSystem.getActiveAlerts();
      const updatedAlert = updatedAlerts.find(a => a.id === firstAlert.id);
      logger.info('TokenMonitoringUsage', 'Alert acknowledgment status', {
        acknowledged: updatedAlert?.acknowledged,
        acknowledgedBy: updatedAlert?.acknowledgedBy,
        acknowledgedAt: updatedAlert?.acknowledgedAt,
      });
    }

    // Demonstrate alert resolution
    if (activeAlerts.length > 1) {
      const secondAlert = activeAlerts[1];
      logger.info('TokenMonitoringUsage', 'Resolving alert', { alertId: secondAlert.id });

      const resolved = tokenSystem.resolveAlert(secondAlert.id, 'Issue resolved through configuration changes');
      logger.info('TokenMonitoringUsage', 'Alert resolution result', { resolved });

      // Verify resolution
      const finalAlerts = tokenSystem.getActiveAlerts();
      logger.info('TokenMonitoringUsage', 'Final active alerts count', { count: finalAlerts.length });
    }

    // Get alert statistics
    const alertStats = tokenSystem.alerting.getAlertStatistics();
    logger.info('TokenMonitoringUsage', 'Alert statistics', {
      total: alertStats.total,
      active: alertStats.active,
      last24h: alertStats.last24h,
      acknowledged: alertStats.acknowledged,
      resolved: alertStats.resolved,
      bySeverity: alertStats.bySeverity,
    });

    // Stop the system
    await tokenSystem.stop();

    logger.info('TokenMonitoringUsage', '✅ Alert management example completed');

  } catch (error) {
    logger.error('TokenMonitoringUsage', 'Alert management example failed', error as Error);
  }
}

/**
 * Run all examples
 */
export async function runTokenMonitoringExamples(): Promise<void> {
  logger.info('TokenMonitoringUsage', '🎯 Running token monitoring examples...');

  try {
    // Run examples sequentially
    await quickStartExample();
    logger.info('TokenMonitoringUsage', '');

    await advancedConfigurationExample();
    logger.info('TokenMonitoringUsage', '');

    await realTimeMonitoringExample();
    logger.info('TokenMonitoringUsage', '');

    await alertManagementExample();

    logger.info('TokenMonitoringUsage', '✅ All token monitoring examples completed successfully');

  } catch (error) {
    logger.error('TokenMonitoringUsage', 'Examples failed', error as Error);
  }
}

// Export examples for individual use
export {
  quickStartExample,
  advancedConfigurationExample,
  realTimeMonitoringExample,
  alertManagementExample,
};

// Export the main runner
export { runTokenMonitoringExamples as default };