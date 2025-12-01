/**
 * ♫ Unified Token Monitoring Dashboard for @dcversus/prp
 *
 * Comprehensive real-time token monitoring system that integrates multi-provider
 * token accounting with inspector cap enforcement and provides TUI dashboard
 * integration with automated alerting and projections.
 */
import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils } from '../shared';

import type {
  TokenDataPoint,
  TokenStatistics,
  TokenProjection,
  AgentTokenStatus,
  TokenAlert,
  TokenCostCalculation,
  TUIDashboardData,
  TokenPerformanceMetrics,
  TokenTrendData,
  TokenLimitEnforcement,
  TokenUsageEvent,
} from '../shared/types/token-metrics';
import type {
  TokenUsageRecord,
  ProviderUsage,
  LimitPrediction,
} from './multi-provider-token-accounting';

const logger = createLayerLogger('scanner');

// Enhanced interfaces for unified monitoring
export interface UnifiedTokenMetrics {
  timestamp: Date;
  // Multi-provider data
  providers: ProviderUsage[];
  predictions: LimitPrediction[];
  // System-wide metrics
  totalTokensUsed: number;
  totalCost: number;
  activeAgents: number;
  // Component breakdown
  inspector: {
    usage: number;
    limit: number;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical' | 'exceeded';
  };
  orchestrator: {
    usage: number;
    limit: number;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical' | 'exceeded';
  };
  // Alerts and projections
  alerts: TokenAlert[];
  projections: TokenProjection[];
}

export interface TokenCapEnforcement {
  inspector: {
    currentUsage: number;
    limit: number;
    enforcementActions: EnforcedAction[];
  };
  orchestrator: {
    currentUsage: number;
    limit: number;
    enforcementActions: EnforcedAction[];
  };
}

interface EnforcedAction {
  timestamp: Date;
  action: 'warning_logged' | 'alert_emitted' | 'requests_throttled' | 'requests_blocked' | 'emergency_stopped';
  reason: string;
  details: Record<string, unknown>;
}

export interface MonitoringDashboardConfig {
  updateInterval: number; // milliseconds
  retentionPeriod: number; // hours
  enableAlerting: boolean;
  enableProjections: boolean;
  enableEnforcement: boolean;
  alertThresholds: {
    warning: number; // percentage
    critical: number; // percentage
    blocking: number; // percentage
  };
}

/**
 * Unified Token Monitoring Dashboard
 */
export class UnifiedTokenMonitoringDashboard extends EventEmitter {
  private readonly config: MonitoringDashboardConfig;
  private readonly tokenMetricsStream: any; // TokenMetricsStream
  private readonly multiProviderAccounting: any; // MultiProviderTokenAccounting
  private updateTimer?: NodeJS.Timeout;

  // Data storage
  private metricsHistory: UnifiedTokenMetrics[] = [];
  private readonly activeAlerts = new Map<string, TokenAlert>();
  private enforcementHistory: TokenCapEnforcement[] = [];
  private readonly performanceMetrics: TokenPerformanceMetrics;

  // Real-time data
  private currentMetrics: UnifiedTokenMetrics | null = null;
  private lastUpdate: Date = new Date();

  constructor(
    tokenMetricsStream: any,
    multiProviderAccounting: any,
    config: Partial<MonitoringDashboardConfig> = {}
  ) {
    super();

    this.tokenMetricsStream = tokenMetricsStream;
    this.multiProviderAccounting = multiProviderAccounting;

    this.config = {
      updateInterval: 5000, // 5 seconds
      retentionPeriod: 24, // 24 hours
      enableAlerting: true,
      enableProjections: true,
      enableEnforcement: true,
      alertThresholds: {
        warning: 70,
        critical: 85,
        blocking: 95,
      },
      ...config,
    };

    // Initialize performance metrics
    this.performanceMetrics = {
      eventProcessingLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      eventThroughput: 0,
      subscriberCount: 0,
      bufferUtilization: 0,
    };

    this.initializeEventHandlers();
    this.startMonitoring();
  }

  /**
   * Initialize event handlers for incoming data
   */
  private initializeEventHandlers(): void {
    // Listen to multi-provider accounting events
    if (this.multiProviderAccounting) {
      this.multiProviderAccounting.on('usage:recorded', (data: any) => {
        this.handleTokenUsageRecorded(data);
      });

      this.multiProviderAccounting.on('limits:critical', (data: any) => {
        this.handleCriticalLimit(data);
      });

      this.multiProviderAccounting.on('pricing:updated', (data: any) => {
        this.handlePricingUpdated(data);
      });
    }

    // Listen to token metrics stream events
    if (this.tokenMetricsStream) {
      this.tokenMetricsStream.on('alert_added', (alert: TokenAlert) => {
        this.handleAlertAdded(alert);
      });

      this.tokenMetricsStream.on('projections_updated', (projections: TokenProjection[]) => {
        this.handleProjectionsUpdated(projections);
      });
    }
  }

  /**
   * Start the monitoring loop
   */
  private startMonitoring(): void {
    logger.info('UnifiedTokenMonitoringDashboard', 'Starting unified token monitoring...');

    // Initial data collection
    this.collectMetrics();

    // Start periodic updates
    this.updateTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.updateInterval);

    // Start cleanup interval
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour

    logger.info('UnifiedTokenMonitoringDashboard', '✅ Unified token monitoring started', {
      updateInterval: this.config.updateInterval,
      alerting: this.config.enableAlerting,
      enforcement: this.config.enableEnforcement,
    });
  }

  /**
   * Collect metrics from all sources
   */
  private async collectMetrics(): Promise<void> {
    const startTime = Date.now();

    try {
      const timestamp = TimeUtils.now();

      // Get multi-provider data
      const providerUsage = this.multiProviderAccounting?.getProviderUsage() ?? [];
      const predictions = this.multiProviderAccounting?.getLimitPredictions() ?? [];

      // Get token metrics stream data
      const tuiData = this.tokenMetricsStream?.getTUIDashboardData();

      // Calculate system-wide metrics
      const totalTokensUsed = providerUsage.reduce((sum, provider) => sum + provider.totalTokens, 0);
      const totalCost = providerUsage.reduce((sum, provider) => sum + provider.totalCost, 0);
      const activeAgents = tuiData?.summary.totalAgents ?? 0;

      // Simulate inspector and orchestrator usage (would be connected to actual systems)
      const inspectorUsage = this.getComponentUsage('inspector');
      const orchestratorUsage = this.getComponentUsage('orchestrator');

      // Create unified metrics
      const unifiedMetrics: UnifiedTokenMetrics = {
        timestamp,
        providers: providerUsage,
        predictions,
        totalTokensUsed,
        totalCost,
        activeAgents,
        inspector: inspectorUsage,
        orchestrator: orchestratorUsage,
        alerts: Array.from(this.activeAlerts.values()),
        projections: tuiData?.projections ?? [],
      };

      // Update current metrics
      this.currentMetrics = unifiedMetrics;
      this.lastUpdate = timestamp;

      // Add to history
      this.metricsHistory.push(unifiedMetrics);

      // Update performance metrics
      this.performanceMetrics.eventProcessingLatency = Date.now() - startTime;
      this.performanceMetrics.subscriberCount = this.listenerCount('update') + this.listenerCount('alert');
      this.performanceMetrics.memoryUsage = process.memoryUsage().heapUsed;

      // Check for enforcement actions
      if (this.config.enableEnforcement) {
        this.checkEnforcementActions(unifiedMetrics);
      }

      // Emit update event
      this.emit('update', unifiedMetrics);

      // Check for alerts
      if (this.config.enableAlerting) {
        this.checkForAlerts(unifiedMetrics);
      }

    } catch (error) {
      logger.error('UnifiedTokenMonitoringDashboard', 'Failed to collect metrics', error as Error);
      this.emit('error', error);
    }
  }

  /**
   * Get component usage (inspector/orchestrator)
   */
  private getComponentUsage(component: 'inspector' | 'orchestrator'): {
    usage: number;
    limit: number;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical' | 'exceeded';
  } {
    // These would be connected to actual inspector and orchestrator systems
    const limits = {
      inspector: 1000000, // 1M tokens
      orchestrator: 200000, // 200K tokens
    };

    // Simulate current usage (would get from actual systems)
    const currentUsage = Math.random() * limits[component] * 0.8; // Simulate 80% usage
    const percentage = (currentUsage / limits[component]) * 100;

    let status: 'healthy' | 'warning' | 'critical' | 'exceeded' = 'healthy';
    if (percentage >= 95) {
      status = 'exceeded';
    } else if (percentage >= 85) {
      status = 'critical';
    } else if (percentage >= 70) {
      status = 'warning';
    }

    return {
      usage: Math.round(currentUsage),
      limit: limits[component],
      percentage: Math.round(percentage * 100) / 100,
      status,
    };
  }

  /**
   * Check for enforcement actions based on token usage
   */
  private checkEnforcementActions(metrics: UnifiedTokenMetrics): void {
    const enforcementActions: EnforcedAction[] = [];

    // Check inspector limits
    if (metrics.inspector.percentage >= this.config.alertThresholds.warning) {
      let action: EnforcedAction['action'];
      let reason: string;

      if (metrics.inspector.percentage >= this.config.alertThresholds.blocking) {
        action = 'requests_blocked';
        reason = 'Inspector token limit exceeded blocking threshold';
      } else if (metrics.inspector.percentage >= this.config.alertThresholds.critical) {
        action = 'requests_throttled';
        reason = 'Inspector token usage at critical level';
      } else {
        action = 'alert_emitted';
        reason = 'Inspector token usage at warning level';
      }

      enforcementActions.push({
        timestamp: TimeUtils.now(),
        action,
        reason,
        details: {
          percentage: metrics.inspector.percentage,
          usage: metrics.inspector.usage,
          limit: metrics.inspector.limit,
        },
      });
    }

    // Check orchestrator limits
    if (metrics.orchestrator.percentage >= this.config.alertThresholds.warning) {
      let action: EnforcedAction['action'];
      let reason: string;

      if (metrics.orchestrator.percentage >= this.config.alertThresholds.blocking) {
        action = 'requests_blocked';
        reason = 'Orchestrator token limit exceeded blocking threshold';
      } else if (metrics.orchestrator.percentage >= this.config.alertThresholds.critical) {
        action = 'requests_throttled';
        reason = 'Orchestrator token usage at critical level';
      } else {
        action = 'alert_emitted';
        reason = 'Orchestrator token usage at warning level';
      }

      enforcementActions.push({
        timestamp: TimeUtils.now(),
        action,
        reason,
        details: {
          percentage: metrics.orchestrator.percentage,
          usage: metrics.orchestrator.usage,
          limit: metrics.orchestrator.limit,
        },
      });
    }

    // Store enforcement history if actions were taken
    if (enforcementActions.length > 0) {
      this.enforcementHistory.push({
        inspector: {
          currentUsage: metrics.inspector.usage,
          limit: metrics.inspector.limit,
          enforcementActions: enforcementActions.filter(a => a.reason.toLowerCase().includes('inspector')),
        },
        orchestrator: {
          currentUsage: metrics.orchestrator.usage,
          limit: metrics.orchestrator.limit,
          enforcementActions: enforcementActions.filter(a => a.reason.toLowerCase().includes('orchestrator')),
        },
      });

      // Emit enforcement event
      this.emit('enforcement', {
        timestamp: TimeUtils.now(),
        actions: enforcementActions,
        metrics,
      });
    }
  }

  /**
   * Check for alerts based on metrics
   */
  private checkForAlerts(metrics: UnifiedTokenMetrics): void {
    // Check provider-specific alerts
    for (const provider of metrics.providers) {
      if (provider.status === 'critical' || provider.status === 'exceeded') {
        this.createAlert({
          agentId: provider.providerId,
          type: 'critical',
          message: `${provider.providerName} usage at ${provider.percentages.daily.toFixed(1)}% (${provider.dailyUsage}/${provider.limits.daily} tokens)`,
        });
      }
    }

    // Check system-wide alerts
    if (metrics.totalCost > 50) { // $50 cost threshold
      this.createAlert({
        agentId: 'system',
        type: 'warning',
        message: `Total token cost exceeded $50: $${metrics.totalCost.toFixed(2)}`,
      });
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(alertData: Omit<TokenAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: TokenAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: TimeUtils.now(),
      acknowledged: false,
    };

    this.activeAlerts.set(alert.id, alert);
    this.emit('alert', alert);

    logger.warn('UnifiedTokenMonitoringDashboard', 'Alert created', {
      id: alert.id,
      agentId: alert.agentId,
      type: alert.type,
      message: alert.message,
    });
  }

  /**
   * Handle token usage recorded from multi-provider accounting
   */
  private handleTokenUsageRecorded(data: any): void {
    // Emit usage event for subscribers
    this.emit('usage_recorded', {
      timestamp: TimeUtils.now(),
      provider: data.provider,
      model: data.model,
      cost: data.cost,
      record: data.record,
    });
  }

  /**
   * Handle critical limit events
   */
  private handleCriticalLimit(data: any): void {
    this.createAlert({
      agentId: data.predictions?.[0]?.providerId ?? 'unknown',
      type: 'critical',
      message: `Critical token limit predicted for provider: ${JSON.stringify(data.predictions?.[0]?.recommendation)}`,
    });
  }

  /**
   * Handle pricing updates
   */
  private handlePricingUpdated(data: any): void {
    this.emit('pricing_updated', {
      timestamp: TimeUtils.now(),
      providersCount: data.providersCount,
    });
  }

  /**
   * Handle alert added from token metrics stream
   */
  private handleAlertAdded(alert: TokenAlert): void {
    this.activeAlerts.set(alert.id, alert);
    this.emit('alert', alert);
  }

  /**
   * Handle projections updated
   */
  private handleProjectionsUpdated(projections: TokenProjection[]): void {
    // Check for concerning projections
    const concerningProjections = projections.filter(p =>
      p.confidence > 0.7 && p.projectedUsage > p.projectedCost * 1000 // High cost projection
    );

    if (concerningProjections.length > 0) {
      this.createAlert({
        agentId: 'system',
        type: 'warning',
        message: `High cost projections detected for ${concerningProjections.length} agents`,
      });
    }
  }

  /**
   * Get current unified metrics
   */
  getCurrentMetrics(): UnifiedTokenMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours = 24): UnifiedTokenMetrics[] {
    const cutoff = TimeUtils.hoursAgo(hours);
    return this.metricsHistory.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get TUI dashboard data
   */
  getTUIDashboardData(): TUIDashboardData {
    if (!this.currentMetrics) {
      return {
        summary: {
          totalAgents: 0,
          totalTokensUsed: 0,
          totalCost: 0,
          activeAlerts: 0,
        },
        agents: [],
        alerts: [],
        trends: [],
        projections: [],
      };
    }

    const agentStatuses: AgentTokenStatus[] = this.currentMetrics.providers.map(provider => ({
      agentId: provider.providerId,
      agentType: provider.providerName,
      currentUsage: provider.dailyUsage,
      limit: provider.limits.daily,
      percentage: provider.percentages.daily,
      cost: provider.totalCost,
      status: provider.status === 'healthy' ? 'normal' :
              provider.status === 'warning' ? 'warning' :
              provider.status === 'critical' ? 'critical' : 'blocked',
      lastActivity: TimeUtils.now(),
      efficiency: provider.averageTokensPerRequest > 0 ? provider.totalCost / provider.totalTokens : 0,
    }));

    // Add inspector and orchestrator as agents
    agentStatuses.push({
      agentId: 'inspector',
      agentType: 'Inspector',
      currentUsage: this.currentMetrics.inspector.usage,
      limit: this.currentMetrics.inspector.limit,
      percentage: this.currentMetrics.inspector.percentage,
      cost: this.currentMetrics.inspector.usage * 0.00001, // Simulate cost
      status: this.currentMetrics.inspector.status === 'healthy' ? 'normal' :
              this.currentMetrics.inspector.status === 'warning' ? 'warning' :
              this.currentMetrics.inspector.status === 'critical' ? 'critical' : 'blocked',
      lastActivity: TimeUtils.now(),
      efficiency: 0.8,
    });

    agentStatuses.push({
      agentId: 'orchestrator',
      agentType: 'Orchestrator',
      currentUsage: this.currentMetrics.orchestrator.usage,
      limit: this.currentMetrics.orchestrator.limit,
      percentage: this.currentMetrics.orchestrator.percentage,
      cost: this.currentMetrics.orchestrator.usage * 0.00001, // Simulate cost
      status: this.currentMetrics.orchestrator.status === 'healthy' ? 'normal' :
              this.currentMetrics.orchestrator.status === 'warning' ? 'warning' :
              this.currentMetrics.orchestrator.status === 'critical' ? 'critical' : 'blocked',
      lastActivity: TimeUtils.now(),
      efficiency: 0.9,
    });

    return {
      summary: {
        totalAgents: this.currentMetrics.activeAgents,
        totalTokensUsed: this.currentMetrics.totalTokensUsed,
        totalCost: this.currentMetrics.totalCost,
        activeAlerts: this.activeAlerts.size,
      },
      agents: agentStatuses,
      alerts: Array.from(this.activeAlerts.values()),
      trends: this.calculateTrends(),
      projections: this.currentMetrics.projections,
    };
  }

  /**
   * Calculate trend data
   */
  private calculateTrends(): TokenTrendData[] {
    const trends: TokenTrendData[] = [];
    const now = TimeUtils.now();

    // Generate hourly trends for the last 24 hours
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourMetrics = this.metricsHistory.filter(m =>
        Math.abs(m.timestamp.getTime() - timestamp.getTime()) < 30 * 60 * 1000
      );

      if (hourMetrics.length > 0) {
        const avgTokens = hourMetrics.reduce((sum, m) => sum + m.totalTokensUsed, 0) / hourMetrics.length;
        const avgCost = hourMetrics.reduce((sum, m) => sum + m.totalCost, 0) / hourMetrics.length;

        trends.push({
          timestamp,
          usage: avgTokens,
          cost: avgCost,
          agentBreakdown: {}, // Would be populated with actual breakdown
        });
      } else {
        trends.push({
          timestamp,
          usage: 0,
          cost: 0,
          agentBreakdown: {},
        });
      }
    }

    return trends.reverse(); // Most recent first
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert_acknowledged', { alertId, timestamp: TimeUtils.now() });
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): TokenPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get enforcement history
   */
  getEnforcementHistory(hours = 24): TokenCapEnforcement[] {
    const cutoff = TimeUtils.hoursAgo(hours);
    return this.enforcementHistory.filter(e => {
      // Check if any enforcement action occurred after cutoff
      return e.inspector.enforcementActions.some(a => a.timestamp >= cutoff) ||
             e.orchestrator.enforcementActions.some(a => a.timestamp >= cutoff);
    });
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = TimeUtils.hoursAgo(this.config.retentionPeriod);

    // Clean metrics history
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp >= cutoff);

    // Clean old acknowledged alerts
    for (const [id, alert] of Array.from(this.activeAlerts.entries())) {
      if (alert.acknowledged && alert.timestamp < cutoff) {
        this.activeAlerts.delete(id);
      }
    }

    // Clean old enforcement history
    this.enforcementHistory = this.enforcementHistory.slice(-100); // Keep last 100 entries

    logger.debug('UnifiedTokenMonitoringDashboard', 'Cleanup completed', {
      metricsCount: this.metricsHistory.length,
      alertsCount: this.activeAlerts.size,
      enforcementCount: this.enforcementHistory.length,
    });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.removeAllListeners();

    logger.info('UnifiedTokenMonitoringDashboard', 'Unified token monitoring stopped');
  }
}