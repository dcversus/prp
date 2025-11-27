/**
 * ♫ Automated Alerting System for @dcversus/prp
 *
 * Provides intelligent alerting for token usage thresholds, cost projections,
 * and system anomalies with configurable rules, escalation policies, and
 * multiple notification channels.
 */
import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils } from '../shared';

import type {
  TokenAlert,
  TokenDataPoint,
  AgentTokenStatus,
  TokenProjection,
} from '../shared/types/token-metrics';
import type {
  ProviderUsage,
  LimitPrediction,
  TokenUsageRecord,
} from './multi-provider-token-accounting';
import type {
  CapEnforcementStatus,
  EnforcementAction,
} from './token-cap-enforcement';

const logger = createLayerLogger('scanner');

// Alert system interfaces
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'threshold' | 'trend' | 'anomaly' | 'projection' | 'enforcement';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  conditions: AlertCondition[];
  cooldown: number; // minutes
  maxFrequency: number; // per hour
  escalation: AlertEscalation[];
  actions: AlertAction[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'change' | 'rate';
  value: number | string;
  timeframe?: number; // minutes for rate calculations
  aggregation?: 'avg' | 'sum' | 'max' | 'min' | 'count';
}

export interface AlertEscalation {
  level: number;
  delay: number; // minutes
  severity: 'warning' | 'critical' | 'emergency';
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'log' | 'emit' | 'webhook' | 'email' | 'slack' | 'nudge' | 'system_command';
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  timestamp: Date;
  severity: TokenAlert['type'];
  title: string;
  message: string;
  agentId?: string;
  component?: string;
  metrics: Record<string, number>;
  context: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
  escalated: boolean;
  escalationLevel: number;
  actions: AlertExecution[];
}

export interface AlertExecution {
  timestamp: Date;
  actionType: AlertAction['type'];
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number; // milliseconds
}

export interface AlertSystemConfig {
  enabled: boolean;
  checkInterval: number; // seconds
  retentionPeriod: number; // days
  maxActiveAlerts: number;
  defaultActions: AlertAction[];
  rules: AlertRule[];
  notifications: {
    enableWebhooks: boolean;
    enableEmail: boolean;
    enableSlack: boolean;
    enableNudge: boolean;
    webhookUrls: string[];
    emailRecipients: string[];
    slackChannels: string[];
  };
}

/**
 * Automated Alerting System
 */
export class AutomatedAlertingSystem extends EventEmitter {
  private readonly config: AlertSystemConfig;
  private readonly activeRules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, AlertInstance>();
  private alertHistory: AlertInstance[] = [];
  private readonly actionQueue: AlertExecution[] = [];
  private readonly executionTimers = new Map<string, NodeJS.Timeout>();

  // Rate limiting
  private readonly alertFrequency = new Map<string, { count: number; lastReset: Date; }>();

  // Monitoring data cache
  private readonly cachedMetrics = new Map<string, { value: number; timestamp: Date; }>();
  private lastCheck = new Date();

  constructor(config: Partial<AlertSystemConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      checkInterval: 30, // 30 seconds
      retentionPeriod: 30, // 30 days
      maxActiveAlerts: 100,
      defaultActions: [
        {
          type: 'log',
          config: { level: 'info' },
          enabled: true,
        },
        {
          type: 'emit',
          config: {},
          enabled: true,
        },
      ],
      rules: this.getDefaultRules(),
      notifications: {
        enableWebhooks: false,
        enableEmail: false,
        enableSlack: false,
        enableNudge: true,
        webhookUrls: [],
        emailRecipients: [],
        slackChannels: [],
      },
      ...config,
    };

    this.initializeRules();
    this.startMonitoring();
  }

  /**
   * Get default alert rules
   */
  private getDefaultRules(): AlertRule[] {
    return [
      // Token limit threshold rules
      {
        id: 'inspector_high_usage',
        name: 'Inspector High Token Usage',
        description: 'Alert when inspector token usage exceeds warning threshold',
        enabled: true,
        type: 'threshold',
        severity: 'warning',
        conditions: [
          {
            metric: 'inspector.usage_percentage',
            operator: 'gte',
            value: 70,
            aggregation: 'max',
          },
        ],
        cooldown: 15,
        maxFrequency: 4,
        escalation: [
          {
            level: 1,
            delay: 5,
            severity: 'critical',
            actions: [
              {
                type: 'nudge',
                config: { priority: 'high', message: 'Inspector token usage critical' },
                enabled: true,
              },
            ],
          },
        ],
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
            enabled: true,
          },
        ],
      },

      {
        id: 'orchestrator_high_usage',
        name: 'Orchestrator High Token Usage',
        description: 'Alert when orchestrator token usage exceeds warning threshold',
        enabled: true,
        type: 'threshold',
        severity: 'warning',
        conditions: [
          {
            metric: 'orchestrator.usage_percentage',
            operator: 'gte',
            value: 70,
            aggregation: 'max',
          },
        ],
        cooldown: 15,
        maxFrequency: 4,
        escalation: [
          {
            level: 1,
            delay: 5,
            severity: 'critical',
            actions: [
              {
                type: 'nudge',
                config: { priority: 'high', message: 'Orchestrator token usage critical' },
                enabled: true,
              },
            ],
          },
        ],
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
            enabled: true,
          },
        ],
      },

      {
        id: 'provider_critical_usage',
        name: 'Provider Critical Usage',
        description: 'Alert when any provider reaches critical usage levels',
        enabled: true,
        type: 'threshold',
        severity: 'critical',
        conditions: [
          {
            metric: 'provider.daily_usage_percentage',
            operator: 'gte',
            value: 90,
            aggregation: 'max',
          },
        ],
        cooldown: 10,
        maxFrequency: 6,
        escalation: [
          {
            level: 1,
            delay: 2,
            severity: 'emergency',
            actions: [
              {
                type: 'system_command',
                config: { command: 'emergency_stop', component: 'provider' },
                enabled: false, // Disabled by default for safety
              },
            ],
          },
        ],
        actions: [
          {
            type: 'log',
            config: { level: 'error' },
            enabled: true,
          },
          {
            type: 'nudge',
            config: { priority: 'urgent', message: 'Provider critical usage detected' },
            enabled: true,
          },
        ],
      },

      // Cost alerting rules
      {
        id: 'high_hourly_cost',
        name: 'High Hourly Cost',
        description: 'Alert when hourly cost exceeds threshold',
        enabled: true,
        type: 'threshold',
        severity: 'warning',
        conditions: [
          {
            metric: 'cost.hourly_total',
            operator: 'gt',
            value: 10, // $10 per hour
            aggregation: 'sum',
            timeframe: 60,
          },
        ],
        cooldown: 30,
        maxFrequency: 2,
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
            enabled: true,
          },
        ],
      },

      {
        id: 'projected_cost_spike',
        name: 'Projected Cost Spike',
        description: 'Alert when projected costs show significant increase',
        enabled: true,
        type: 'projection',
        severity: 'warning',
        conditions: [
          {
            metric: 'projection.cost_increase_rate',
            operator: 'gt',
            value: 50, // 50% increase
            aggregation: 'max',
          },
        ],
        cooldown: 60,
        maxFrequency: 3,
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
            enabled: true,
          },
        ],
      },

      // Trend and anomaly rules
      {
        id: 'rapid_token_increase',
        name: 'Rapid Token Usage Increase',
        description: 'Alert when token usage increases rapidly over time',
        enabled: true,
        type: 'trend',
        severity: 'warning',
        conditions: [
          {
            metric: 'tokens.usage_rate',
            operator: 'change',
            value: 200, // 200% increase
            timeframe: 30,
            aggregation: 'avg',
          },
        ],
        cooldown: 20,
        maxFrequency: 4,
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
            enabled: true,
          },
        ],
      },

      // Enforcement action alerts
      {
        id: 'enforcement_triggered',
        name: 'Enforcement Action Triggered',
        description: 'Alert when enforcement actions are triggered',
        enabled: true,
        type: 'enforcement',
        severity: 'critical',
        conditions: [
          {
            metric: 'enforcement.actions_count',
            operator: 'gt',
            value: 0,
            aggregation: 'count',
            timeframe: 1,
          },
        ],
        cooldown: 5,
        maxFrequency: 10,
        actions: [
          {
            type: 'log',
            config: { level: 'error' },
            enabled: true,
          },
          {
            type: 'nudge',
            config: { priority: 'urgent', message: 'Token cap enforcement triggered' },
            enabled: true,
          },
        ],
      },

      // System health rules
      {
        id: 'system_degraded',
        name: 'System Health Degraded',
        description: 'Alert when overall system health is degraded',
        enabled: true,
        type: 'threshold',
        severity: 'warning',
        conditions: [
          {
            metric: 'system.health_score',
            operator: 'lt',
            value: 70,
            aggregation: 'min',
          },
        ],
        cooldown: 10,
        maxFrequency: 6,
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
            enabled: true,
          },
        ],
      },
    ];
  }

  /**
   * Initialize alert rules
   */
  private initializeRules(): void {
    for (const rule of this.config.rules) {
      if (rule.enabled) {
        this.activeRules.set(rule.id, rule);
      }
    }

    logger.info('AutomatedAlertingSystem', 'Alert rules initialized', {
      totalRules: this.config.rules.length,
      activeRules: this.activeRules.size,
    });
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    if (!this.config.enabled) {
      logger.info('AutomatedAlertingSystem', 'Alerting system disabled');
      return;
    }

    setInterval(() => {
      this.performAlertCheck();
    }, this.config.checkInterval * 1000);

    // Process action queue
    setInterval(() => {
      this.processActionQueue();
    }, 1000);

    // Cleanup old data
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour

    logger.info('AutomatedAlertingSystem', '✅ Automated alerting system started', {
      checkInterval: this.config.checkInterval,
      activeRules: this.activeRules.size,
    });
  }

  /**
   * Perform alert check for all rules
   */
  private performAlertCheck(): void {
    const startTime = Date.now();

    try {
      this.lastCheck = TimeUtils.now();

      for (const rule of Array.from(this.activeRules.values())) {
        if (!rule.enabled) {
          continue;
        }

        try {
          this.evaluateRule(rule);
        } catch (error) {
          logger.warn('AutomatedAlertingSystem', 'Failed to evaluate rule', {
            ruleId: rule.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Check for escalations
      this.checkEscalations();

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        logger.debug('AutomatedAlertingSystem', 'Alert check completed', {
          duration,
          rulesEvaluated: this.activeRules.size,
        });
      }

    } catch (error) {
      logger.error('AutomatedAlertingSystem', 'Alert check failed', error as Error);
    }
  }

  /**
   * Evaluate a single alert rule
   */
  private evaluateRule(rule: AlertRule): void {
    // Check cooldown
    if (this.isInCooldown(rule)) {
      return;
    }

    // Check frequency limits
    if (this.exceedsFrequencyLimit(rule)) {
      return;
    }

    // Evaluate conditions
    const results = rule.conditions.map(condition => this.evaluateCondition(condition));

    // All conditions must be true for alert to trigger
    if (results.every(result => result)) {
      this.triggerAlert(rule);
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: AlertCondition): boolean {
    const metricValue = this.getMetricValue(condition);

    if (metricValue === null) {
      return false; // Cannot evaluate without metric value
    }

    const { operator, value } = condition;

    switch (operator) {
      case 'gt':
        return metricValue > (value as number);
      case 'gte':
        return metricValue >= (value as number);
      case 'lt':
        return metricValue < (value as number);
      case 'lte':
        return metricValue <= (value as number);
      case 'eq':
        return metricValue === (value as number);
      case 'ne':
        return metricValue !== (value as number);
      case 'change':
        return this.evaluateChangeCondition(condition, metricValue);
      case 'rate':
        return this.evaluateRateCondition(condition, metricValue);
      default:
        return false;
    }
  }

  /**
   * Get metric value for condition evaluation
   */
  private getMetricValue(condition: AlertCondition): number | null {
    const metricKey = condition.metric;
    const cached = this.cachedMetrics.get(metricKey);

    // Check if we have recent cached data
    if (cached && (TimeUtils.now().getTime() - cached.timestamp.getTime()) < 60000) {
      return cached.value;
    }

    // Calculate metric value based on metric type
    let value: number | null = null;

    if (metricKey.startsWith('inspector.')) {
      value = this.getInspectorMetric(metricKey.replace('inspector.', ''));
    } else if (metricKey.startsWith('orchestrator.')) {
      value = this.getOrchestratorMetric(metricKey.replace('orchestrator.', ''));
    } else if (metricKey.startsWith('provider.')) {
      value = this.getProviderMetric(metricKey.replace('provider.', ''));
    } else if (metricKey.startsWith('cost.')) {
      value = this.getCostMetric(metricKey.replace('cost.', ''));
    } else if (metricKey.startsWith('tokens.')) {
      value = this.getTokenMetric(metricKey.replace('tokens.', ''));
    } else if (metricKey.startsWith('projection.')) {
      value = this.getProjectionMetric(metricKey.replace('projection.', ''));
    } else if (metricKey.startsWith('enforcement.')) {
      value = this.getEnforcementMetric(metricKey.replace('enforcement.', ''));
    } else if (metricKey.startsWith('system.')) {
      value = this.getSystemMetric(metricKey.replace('system.', ''));
    }

    // Cache the value
    if (value !== null) {
      this.cachedMetrics.set(metricKey, { value, timestamp: TimeUtils.now() });
    }

    return value;
  }

  /**
   * Get inspector-specific metrics
   */
  private getInspectorMetric(metric: string): number | null {
    // This would be connected to actual inspector usage tracking
    switch (metric) {
      case 'usage_percentage':
        return Math.random() * 100; // Simulate
      case 'current_usage':
        return Math.random() * 1000000;
      case 'remaining_percentage':
        return Math.random() * 100;
      default:
        return null;
    }
  }

  /**
   * Get orchestrator-specific metrics
   */
  private getOrchestratorMetric(metric: string): number | null {
    // This would be connected to actual orchestrator usage tracking
    switch (metric) {
      case 'usage_percentage':
        return Math.random() * 100; // Simulate
      case 'current_usage':
        return Math.random() * 200000;
      case 'remaining_percentage':
        return Math.random() * 100;
      default:
        return null;
    }
  }

  /**
   * Get provider-specific metrics
   */
  private getProviderMetric(metric: string): number | null {
    // This would be connected to actual provider data
    switch (metric) {
      case 'daily_usage_percentage':
        return Math.random() * 100;
      case 'weekly_usage_percentage':
        return Math.random() * 100;
      case 'monthly_usage_percentage':
        return Math.random() * 100;
      default:
        return null;
    }
  }

  /**
   * Get cost-related metrics
   */
  private getCostMetric(metric: string): number | null {
    switch (metric) {
      case 'hourly_total':
        return Math.random() * 50; // Simulate $0-$50 per hour
      case 'daily_total':
        return Math.random() * 500; // Simulate $0-$500 per day
      case 'cost_rate':
        return Math.random() * 10; // Tokens per dollar
      default:
        return null;
    }
  }

  /**
   * Get token-related metrics
   */
  private getTokenMetric(metric: string): number | null {
    switch (metric) {
      case 'usage_rate':
        return Math.random() * 10000; // Tokens per minute
      case 'total_usage':
        return Math.random() * 1000000;
      case 'efficiency_score':
        return Math.random() * 100;
      default:
        return null;
    }
  }

  /**
   * Get projection-related metrics
   */
  private getProjectionMetric(metric: string): number | null {
    switch (metric) {
      case 'cost_increase_rate':
        return Math.random() * 200; // Percentage increase
      case 'usage_increase_rate':
        return Math.random() * 150; // Percentage increase
      case 'confidence_score':
        return Math.random() * 100;
      default:
        return null;
    }
  }

  /**
   * Get enforcement-related metrics
   */
  private getEnforcementMetric(metric: string): number | null {
    switch (metric) {
      case 'actions_count':
        return Math.floor(Math.random() * 5);
      case 'active_enforcements':
        return Math.floor(Math.random() * 3);
      case 'escalation_level':
        return Math.floor(Math.random() * 3);
      default:
        return null;
    }
  }

  /**
   * Get system-related metrics
   */
  private getSystemMetric(metric: string): number | null {
    switch (metric) {
      case 'health_score':
        return Math.random() * 100;
      case 'active_components':
        return Math.floor(Math.random() * 5) + 1;
      case 'error_rate':
        return Math.random() * 10;
      default:
        return null;
    }
  }

  /**
   * Evaluate change condition
   */
  private evaluateChangeCondition(condition: AlertCondition, currentValue: number): boolean {
    // This would compare current value with historical value
    // For now, simulate with random chance
    return Math.random() > 0.9; // 10% chance of triggering
  }

  /**
   * Evaluate rate condition
   */
  private evaluateRateCondition(condition: AlertCondition, currentValue: number): boolean {
    // This would calculate rate over time period
    // For now, simulate with random chance
    return Math.random() > 0.95; // 5% chance of triggering
  }

  /**
   * Check if rule is in cooldown period
   */
  private isInCooldown(rule: AlertRule): boolean {
    const recentAlerts = Array.from(this.activeAlerts.values()).filter(
      alert => alert.ruleId === rule.id &&
      (TimeUtils.now().getTime() - alert.timestamp.getTime()) < rule.cooldown * 60 * 1000
    );

    return recentAlerts.length > 0;
  }

  /**
   * Check if rule exceeds frequency limit
   */
  private exceedsFrequencyLimit(rule: AlertRule): boolean {
    const key = rule.id;
    const frequency = this.alertFrequency.get(key);

    if (!frequency) {
      return false;
    }

    const now = TimeUtils.now();
    const timeSinceReset = now.getTime() - frequency.lastReset.getTime();

    // Reset counter every hour
    if (timeSinceReset > 60 * 60 * 1000) {
      this.alertFrequency.set(key, { count: 0, lastReset: now });
      return false;
    }

    return frequency.count >= rule.maxFrequency;
  }

  /**
   * Trigger an alert from a rule
   */
  private triggerAlert(rule: AlertRule): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: AlertInstance = {
      id: alertId,
      ruleId: rule.id,
      timestamp: TimeUtils.now(),
      severity: rule.severity as TokenAlert['type'],
      title: rule.name,
      message: this.generateAlertMessage(rule),
      context: {
        rule: rule,
        timestamp: TimeUtils.now().toISOString(),
      },
      metrics: this.collectAlertMetrics(rule),
      acknowledged: false,
      resolved: false,
      escalated: false,
      escalationLevel: 0,
      actions: [],
    };

    // Add to active alerts
    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Update frequency counter
    const key = rule.id;
    const frequency = this.alertFrequency.get(key) ?? { count: 0, lastReset: TimeUtils.now() };
    this.alertFrequency.set(key, { count: frequency.count + 1, lastReset: frequency.lastReset });

    // Execute actions
    this.executeAlertActions(alert, rule.actions);

    // Setup escalation timer
    if (rule.escalation.length > 0) {
      this.setupEscalation(alert, rule);
    }

    // Emit alert event
    this.emit('alert_triggered', alert);

    logger.info('AutomatedAlertingSystem', 'Alert triggered', {
      alertId,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name,
    });
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule): string {
    const conditions = rule.conditions.map(condition => {
      return `${condition.metric} ${condition.operator} ${condition.value}`;
    }).join(' AND ');

    return `${rule.description}: ${conditions}`;
  }

  /**
   * Collect metrics for alert
   */
  private collectAlertMetrics(rule: AlertRule): Record<string, number> {
    const metrics: Record<string, number> = {};

    for (const condition of rule.conditions) {
      const value = this.getMetricValue(condition);
      if (value !== null) {
        metrics[condition.metric] = value;
      }
    }

    return metrics;
  }

  /**
   * Execute alert actions
   */
  private executeAlertActions(alert: AlertInstance, actions: AlertAction[]): void {
    for (const action of actions) {
      if (!action.enabled) {
        continue;
      }

      const execution: AlertExecution = {
        timestamp: TimeUtils.now(),
        actionType: action.type,
        success: false,
        duration: 0,
      };

      try {
        const startTime = Date.now();

        switch (action.type) {
          case 'log':
            this.executeLogAction(alert, action);
            break;
          case 'emit':
            this.executeEmitAction(alert, action);
            break;
          case 'webhook':
            this.executeWebhookAction(alert, action);
            break;
          case 'email':
            this.executeEmailAction(alert, action);
            break;
          case 'slack':
            this.executeSlackAction(alert, action);
            break;
          case 'nudge':
            this.executeNudgeAction(alert, action);
            break;
          case 'system_command':
            this.executeSystemCommandAction(alert, action);
            break;
        }

        execution.success = true;
        execution.duration = Date.now() - startTime;

      } catch (error) {
        execution.error = error instanceof Error ? error.message : String(error);
        execution.duration = Date.now() - startTime;

        logger.warn('AutomatedAlertingSystem', 'Alert action failed', {
          alertId: alert.id,
          actionType: action.type,
          error: execution.error,
        });
      }

      alert.actions.push(execution);
      this.actionQueue.push(execution);
    }
  }

  /**
   * Execute log action
   */
  private executeLogAction(alert: AlertInstance, action: AlertAction): void {
    const level = action.config.level as string || 'info';
    const message = `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`;

    switch (level) {
      case 'error':
        logger.error('AutomatedAlertingSystem', message);
        break;
      case 'warn':
        logger.warn('AutomatedAlertingSystem', message);
        break;
      case 'debug':
        logger.debug('AutomatedAlertingSystem', message);
        break;
      default:
        logger.info('AutomatedAlertingSystem', message);
        break;
    }
  }

  /**
   * Execute emit action
   */
  private executeEmitAction(alert: AlertInstance, action: AlertAction): void {
    this.emit('alert', {
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp,
      metrics: alert.metrics,
    });
  }

  /**
   * Execute webhook action
   */
  private executeWebhookAction(alert: AlertInstance, action: AlertAction): void {
    if (!this.config.notifications.enableWebhooks) {
      return;
    }

    // Implementation would make HTTP request to webhook URL
    logger.debug('AutomatedAlertingSystem', 'Webhook action executed', {
      alertId: alert.id,
      webhookUrls: this.config.notifications.webhookUrls,
    });
  }

  /**
   * Execute email action
   */
  private executeEmailAction(alert: AlertInstance, action: AlertAction): void {
    if (!this.config.notifications.enableEmail) {
      return;
    }

    // Implementation would send email notification
    logger.debug('AutomatedAlertingSystem', 'Email action executed', {
      alertId: alert.id,
      recipients: this.config.notifications.emailRecipients,
    });
  }

  /**
   * Execute Slack action
   */
  private executeSlackAction(alert: AlertInstance, action: AlertAction): void {
    if (!this.config.notifications.enableSlack) {
      return;
    }

    // Implementation would send Slack notification
    logger.debug('AutomatedAlertingSystem', 'Slack action executed', {
      alertId: alert.id,
      channels: this.config.notifications.slackChannels,
    });
  }

  /**
   * Execute nudge action
   */
  private executeNudgeAction(alert: AlertInstance, action: AlertAction): void {
    if (!this.config.notifications.enableNudge) {
      return;
    }

    // Emit nudge event for external notification system
    this.emit('nudge_request', {
      alertId: alert.id,
      priority: action.config.priority,
      message: action.config.message || alert.message,
      severity: alert.severity,
      timestamp: alert.timestamp,
    });
  }

  /**
   * Execute system command action
   */
  private executeSystemCommandAction(alert: AlertInstance, action: AlertAction): void {
    // This would execute system commands for emergency actions
    // For safety, most commands would be disabled by default
    logger.debug('AutomatedAlertingSystem', 'System command action executed', {
      alertId: alert.id,
      command: action.config.command,
      component: action.config.component,
    });
  }

  /**
   * Setup escalation for alert
   */
  private setupEscalation(alert: AlertInstance, rule: AlertRule): void {
    const escalation = rule.escalation[0]; // Start with level 1

    if (!escalation) {
      return;
    }

    const timer = setTimeout(() => {
      this.escalateAlert(alert, escalation);
    }, escalation.delay * 60 * 1000);

    this.executionTimers.set(alert.id, timer);
  }

  /**
   * Check for pending escalations
   */
  private checkEscalations(): void {
    for (const [alertId, alert] of Array.from(this.activeAlerts.entries())) {
      if (alert.escalated || alert.resolved || alert.acknowledged) {
        continue;
      }

      const rule = this.activeRules.get(alert.ruleId);
      if (!rule || rule.escalation.length === 0) {
        continue;
      }

      // Check if it's time to escalate
      const timeSinceAlert = TimeUtils.now().getTime() - alert.timestamp.getTime();
      const nextEscalation = rule.escalation[alert.escalationLevel];

      if (nextEscalation && timeSinceAlert >= nextEscalation.delay * 60 * 1000) {
        this.escalateAlert(alert, nextEscalation);
      }
    }
  }

  /**
   * Escalate an alert
   */
  private escalateAlert(alert: AlertInstance, escalation: AlertEscalation): void {
    // Clear existing timer
    const existingTimer = this.executionTimers.get(alert.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.executionTimers.delete(alert.id);
    }

    // Update alert
    alert.escalated = true;
    alert.escalationLevel = escalation.level;
    alert.severity = escalation.severity as TokenAlert['type'];

    // Execute escalation actions
    this.executeAlertActions(alert, escalation.actions);

    // Setup next level escalation if available
    const rule = this.activeRules.get(alert.ruleId);
    if (rule) {
      const nextLevel = rule.escalation.find(e => e.level === escalation.level + 1);
      if (nextLevel) {
        const timer = setTimeout(() => {
          this.escalateAlert(alert, nextLevel);
        }, nextLevel.delay * 60 * 1000);

        this.executionTimers.set(alert.id, timer);
      }
    }

    this.emit('alert_escalated', alert);

    logger.info('AutomatedAlertingSystem', 'Alert escalated', {
      alertId: alert.id,
      level: escalation.level,
      severity: escalation.severity,
    });
  }

  /**
   * Process action queue
   */
  private processActionQueue(): void {
    if (this.actionQueue.length === 0) {
      return;
    }

    // Process actions (in a real implementation, this might rate-limit or batch actions)
    const actions = this.actionQueue.splice(0); // Clear queue
    // Actions are already executed when added to queue, so just log here
    logger.debug('AutomatedAlertingSystem', `Processed ${actions.length} alert actions`);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = TimeUtils.now();

    // Cancel escalation timer
    const timer = this.executionTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.executionTimers.delete(alertId);
    }

    this.emit('alert_acknowledged', alert);

    logger.info('AutomatedAlertingSystem', 'Alert acknowledged', {
      alertId,
      acknowledgedBy,
    });

    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = TimeUtils.now();
    alert.resolution = resolution;

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Cancel escalation timer
    const timer = this.executionTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.executionTimers.delete(alertId);
    }

    this.emit('alert_resolved', alert);

    logger.info('AutomatedAlertingSystem', 'Alert resolved', {
      alertId,
      resolution,
    });

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertInstance[] {
    return Array.from(this.activeAlerts.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert history
   */
  getAlertHistory(days = 7): AlertInstance[] {
    const cutoff = TimeUtils.daysAgo(days);
    return this.alertHistory.filter(alert => alert.timestamp >= cutoff);
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics() {
    const now = TimeUtils.now();
    const dayAgo = TimeUtils.daysAgo(1);
    const weekAgo = TimeUtils.daysAgo(7);

    const recentAlerts = this.alertHistory.filter(alert => alert.timestamp >= dayAgo);
    const weeklyAlerts = this.alertHistory.filter(alert => alert.timestamp >= weekAgo);

    return {
      total: this.alertHistory.length,
      active: this.activeAlerts.size,
      last24h: recentAlerts.length,
      last7d: weeklyAlerts.length,
      bySeverity: {
        info: weeklyAlerts.filter(a => a.severity === 'info').length,
        warning: weeklyAlerts.filter(a => a.severity === 'warning').length,
        critical: weeklyAlerts.filter(a => a.severity === 'critical').length,
        emergency: weeklyAlerts.filter(a => a.severity === 'emergency').length,
      },
      acknowledged: weeklyAlerts.filter(a => a.acknowledged).length,
      resolved: weeklyAlerts.filter(a => a.resolved).length,
      averageResolutionTime: this.calculateAverageResolutionTime(weeklyAlerts),
    };
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(alerts: AlertInstance[]): number {
    const resolvedAlerts = alerts.filter(a => a.resolved && a.resolvedAt);
    if (resolvedAlerts.length === 0) {
      return 0;
    }

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime());
    }, 0);

    return totalTime / resolvedAlerts.length / (1000 * 60); // Convert to minutes
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.config.rules.push(rule);
    if (rule.enabled) {
      this.activeRules.set(rule.id, rule);
    }

    logger.info('AutomatedAlertingSystem', 'Alert rule added', {
      ruleId: rule.id,
      name: rule.name,
      enabled: rule.enabled,
    });
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const index = this.config.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return false;
    }

    Object.assign(this.config.rules[index], updates);
    const rule = this.config.rules[index];

    if (rule.enabled) {
      this.activeRules.set(ruleId, rule);
    } else {
      this.activeRules.delete(ruleId);
    }

    logger.info('AutomatedAlertingSystem', 'Alert rule updated', {
      ruleId,
      updates: Object.keys(updates),
    });

    return true;
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.config.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return false;
    }

    this.config.rules.splice(index, 1);
    this.activeRules.delete(ruleId);

    logger.info('AutomatedAlertingSystem', 'Alert rule removed', { ruleId });

    return true;
  }

  /**
   * Update monitoring data (called by external components)
   */
  updateMonitoringData(data: {
    providers?: ProviderUsage[];
    enforcement?: CapEnforcementStatus;
    systemHealth?: any;
  }): void {
    // Cache relevant metrics for alert evaluation
    if (data.providers) {
      for (const provider of data.providers) {
        this.cachedMetrics.set(`provider.daily_usage_percentage.${provider.providerId}`, {
          value: provider.percentages.daily,
          timestamp: TimeUtils.now(),
        });
      }
    }

    if (data.enforcement) {
      this.cachedMetrics.set('inspector.usage_percentage', {
        value: data.enforcement.inspector.percentage,
        timestamp: TimeUtils.now(),
      });
      this.cachedMetrics.set('orchestrator.usage_percentage', {
        value: data.enforcement.orchestrator.percentage,
        timestamp: TimeUtils.now(),
      });
    }

    if (data.systemHealth) {
      this.cachedMetrics.set('system.health_score', {
        value: data.systemHealth.overallScore,
        timestamp: TimeUtils.now(),
      });
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = TimeUtils.daysAgo(this.config.retentionPeriod);

    // Clean old alert history
    const initialLength = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp >= cutoff);

    // Clean old cached metrics
    for (const [key, cached] of Array.from(this.cachedMetrics.entries())) {
      if (TimeUtils.now().getTime() - cached.timestamp.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
        this.cachedMetrics.delete(key);
      }
    }

    // Clean old frequency counters
    for (const [key, frequency] of Array.from(this.alertFrequency.entries())) {
      if (TimeUtils.now().getTime() - frequency.lastReset.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
        this.alertFrequency.delete(key);
      }
    }

    if (this.alertHistory.length < initialLength) {
      logger.debug('AutomatedAlertingSystem', 'Cleanup completed', {
        removedAlerts: initialLength - this.alertHistory.length,
        remainingAlerts: this.alertHistory.length,
      });
    }
  }

  /**
   * Stop the alerting system
   */
  stop(): void {
    // Clear all timers
    for (const timer of Array.from(this.executionTimers.values())) {
      clearTimeout(timer);
    }
    this.executionTimers.clear();

    this.removeAllListeners();

    logger.info('AutomatedAlertingSystem', 'Automated alerting system stopped');
  }
}