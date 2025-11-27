/**
 * ♫ Token Monitoring Integration for @dcversus/prp
 *
 * Main integration point that brings together all token monitoring components:
 * - Multi-provider token accounting
 * - Real-time token usage detection
 * - Token cap enforcement
 * - Unified monitoring dashboard
 * - Comprehensive API
 * - Automated alerting system
 */
import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils } from '../shared';

import { MultiProviderTokenAccounting } from './multi-provider-token-accounting';
import { RealtimeTokenUsageDetector } from './realtime-token-usage-detector';
import { TokenCapEnforcementManager } from './token-cap-enforcement';
import { UnifiedTokenMonitoringDashboard } from './unified-token-monitoring-dashboard';
import { ComprehensiveMonitoringAPI } from './comprehensive-monitoring-api';
import { AutomatedAlertingSystem } from './automated-alerting-system';

import type { ProviderUsage, LimitPrediction } from './multi-provider-token-accounting';
import type {
  TokenDataPoint,
  TUIDashboardData,
  TokenAlert,
  AgentTokenStatus,
} from '../shared/types/token-metrics';

const logger = createLayerLogger('scanner');

// Main integration interfaces
export interface TokenMonitoringIntegrationConfig {
  persistPath?: string;
  enableRealTimeDetection?: boolean;
  enableCapEnforcement?: boolean;
  enableAlerting?: boolean;
  updateInterval?: number;
  retentionPeriod?: number;
  alertRules?: any[];
}

export interface TokenMonitoringSystem {
  // Core components
  accounting: MultiProviderTokenAccounting;
  detector: RealtimeTokenUsageDetector;
  enforcement: TokenCapEnforcementManager;
  dashboard: UnifiedTokenMonitoringDashboard;
  api: ComprehensiveMonitoringAPI;
  alerting: AutomatedAlertingSystem;

  // System state
  isInitialized: boolean;
  isRunning: boolean;
  startTime: Date;

  // Methods
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getSystemStatus(): any;
  getTUIData(): Promise<TUIDashboardData>;
}

/**
 * Token Monitoring Integration System
 *
 * This is the main entry point for the complete token monitoring system.
 * It coordinates all components and provides a unified interface.
 */
export class TokenMonitoringIntegration implements TokenMonitoringSystem {
  public readonly accounting: MultiProviderTokenAccounting;
  public readonly detector: RealtimeTokenUsageDetector;
  public readonly enforcement: TokenCapEnforcementManager;
  public readonly dashboard: UnifiedTokenMonitoringDashboard;
  public readonly api: ComprehensiveMonitoringAPI;
  public readonly alerting: AutomatedAlertingSystem;

  // System state
  public isInitialized = false;
  public isRunning = false;
  public startTime: Date = new Date();

  private readonly config: TokenMonitoringIntegrationConfig;

  constructor(config: TokenMonitoringIntegrationConfig = {}) {
    this.config = {
      persistPath: '.prp/multi-provider-token-accounting.json',
      enableRealTimeDetection: true,
      enableCapEnforcement: true,
      enableAlerting: true,
      updateInterval: 5000, // 5 seconds
      retentionPeriod: 24, // 24 hours
      alertRules: [],
      ...config,
    };

    // Initialize components in dependency order
    this.accounting = new MultiProviderTokenAccounting(this.config.persistPath);
    this.enforcement = new TokenCapEnforcementManager(this.accounting);
    this.dashboard = new UnifiedTokenMonitoringDashboard(null, this.accounting); // Will be updated after detector
    this.detector = new RealtimeTokenUsageDetector(this.accounting, this.enforcement);
    this.alerting = new AutomatedAlertingSystem({
      rules: this.config.alertRules,
    });

    // Update dashboard with detector reference
    this.dashboard = new UnifiedTokenMonitoringDashboard(this.accounting, this.detector);
    this.api = new ComprehensiveMonitoringAPI(
      this.accounting,
      this.enforcement,
      this.dashboard,
      this.detector
    );

    this.setupComponentIntegration();
  }

  /**
   * Setup integration between components
   */
  private setupComponentIntegration(): void {
    logger.info('TokenMonitoringIntegration', 'Setting up component integration...');

    // Connect detector to accounting and enforcement
    this.detector.on('detected', (detection: any) => {
      // Forward to alerting system
      if (this.alerting && detection.extracted.tokens > 0) {
        this.alerting.emit('token_usage_detected', {
          tokens: detection.extracted.tokens,
          provider: detection.extracted.provider,
          agent: detection.extracted.agent,
          source: detection.source,
        });
      }
    });

    // Connect enforcement to alerting
    this.enforcement.on('enforcement_triggered', (enforcement: any) => {
      if (this.alerting) {
        this.alerting.emit('enforcement_triggered', enforcement);
      }
    });

    // Connect dashboard to alerting
    this.dashboard.on('alert', (alert: TokenAlert) => {
      if (this.alerting) {
        this.alerting.emit('dashboard_alert', alert);
      }
    });

    // Connect accounting to alerting
    this.accounting.on('limits:critical', (data: any) => {
      if (this.alerting) {
        this.alerting.emit('limits_critical', data);
      }
    });

    // Forward API events
    this.api.on('data_update', (data: any) => {
      logger.debug('TokenMonitoringIntegration', 'Data update received', { type: data.type });
    });

    this.api.on('critical_alert', (data: any) => {
      logger.warn('TokenMonitoringIntegration', 'Critical alert', { type: data.type });
    });

    // Setup alerting system integration
    if (this.alerting) {
      this.setupAlertingIntegration();
    }

    logger.info('TokenMonitoringIntegration', '✅ Component integration setup complete');
  }

  /**
   * Setup alerting system integration
   */
  private setupAlertingIntegration(): void {
    // Forward alert events to the main event emitter
    this.alerting.on('alert_triggered', (alert: any) => {
      this.emit('alert', alert);
    });

    this.alerting.on('alert_escalated', (alert: any) => {
      this.emit('alert_escalated', alert);
    });

    this.alerting.on('nudge_request', (nudge: any) => {
      this.emit('nudge_request', nudge);
    });

    // Feed monitoring data to alerting system
    setInterval(() => {
      if (this.alerting && this.isRunning) {
        this.feedDataToAlerting();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Feed current monitoring data to alerting system
   */
  private feedDataToAlerting(): void {
    try {
      const systemHealth = this.getSystemStatus();
      const providerUsage = this.accounting.getProviderUsage();
      const enforcementStatus = this.enforcement.getCurrentStatus();

      this.alerting.updateMonitoringData({
        providers: providerUsage,
        enforcement: enforcementStatus,
        systemHealth,
      });

    } catch (error) {
      logger.warn('TokenMonitoringIntegration', 'Failed to feed data to alerting system', { error });
    }
  }

  /**
   * Initialize the token monitoring system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('TokenMonitoringIntegration', 'System already initialized');
      return;
    }

    try {
      logger.info('TokenMonitoringIntegration', 'Initializing token monitoring system...');

      // Initialize accounting first
      await this.accounting.initialize();

      // Other components auto-initialize in their constructors

      this.isInitialized = true;
      this.startTime = TimeUtils.now();

      logger.info('TokenMonitoringIntegration', '✅ Token monitoring system initialized', {
        accounting: 'ready',
        detector: 'ready',
        enforcement: 'ready',
        dashboard: 'ready',
        api: 'ready',
        alerting: 'ready',
      });

    } catch (error) {
      logger.error('TokenMonitoringIntegration', 'Failed to initialize token monitoring system', error as Error);
      throw error;
    }
  }

  /**
   * Start the token monitoring system
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isRunning) {
      logger.warn('TokenMonitoringIntegration', 'System already running');
      return;
    }

    try {
      logger.info('TokenMonitoringIntegration', 'Starting token monitoring system...');

      // Start all components
      // Note: Components auto-start in their constructors
      // We just need to verify they're running

      // Verify system health
      const healthCheck = await this.performHealthCheck();
      if (!healthCheck.healthy) {
        logger.warn('TokenMonitoringIntegration', 'System health check failed', healthCheck);
      }

      this.isRunning = true;

      logger.info('TokenMonitoringIntegration', '✅ Token monitoring system started', {
        uptime: 0,
        health: healthCheck,
      });

      this.emit('started', {
        timestamp: TimeUtils.now(),
        healthCheck,
      });

    } catch (error) {
      logger.error('TokenMonitoringIntegration', 'Failed to start token monitoring system', error as Error);
      throw error;
    }
  }

  /**
   * Stop the token monitoring system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.info('TokenMonitoringIntegration', 'System already stopped');
      return;
    }

    try {
      logger.info('TokenMonitoringIntegration', 'Stopping token monitoring system...');

      // Stop all components in reverse order
      this.alerting.stop();
      this.api.stop();
      this.dashboard.stop();
      this.detector.stop();
      this.enforcement.stop();
      this.accounting.stop();

      this.isRunning = false;

      logger.info('TokenMonitoringIntegration', '✅ Token monitoring system stopped');

      this.emit('stopped', {
        timestamp: TimeUtils.now(),
        uptime: TimeUtils.now().getTime() - this.startTime.getTime(),
      });

    } catch (error) {
      logger.error('TokenMonitoringIntegration', 'Error stopping token monitoring system', error as Error);
      throw error;
    }
  }

  /**
   * Perform health check on all components
   */
  private async performHealthCheck(): Promise<{ healthy: boolean; components: Record<string, boolean>; }> {
    const components: Record<string, boolean> = {};

    try {
      // Check accounting
      const providerUsage = this.accounting.getProviderUsage();
      components.accounting = Array.isArray(providerUsage);

      // Check enforcement
      const enforcementStatus = this.enforcement.getCurrentStatus();
      components.enforcement = !!enforcementStatus;

      // Check dashboard
      const dashboardMetrics = this.dashboard.getCurrentMetrics();
      components.dashboard = dashboardMetrics !== null;

      // Check API
      const apiStatus = this.api.getAPIStatus();
      components.api = apiStatus.isRunning;

      // Check detector
      const detectionStats = this.detector.getDetectionStats();
      components.detector = detectionStats.totalDetections >= 0;

      // Check alerting
      const alertStats = this.alerting.getAlertStatistics();
      components.alerting = alertStats.total >= 0;

      const healthy = Object.values(components).every(status => status);

      return { healthy, components };

    } catch (error) {
      logger.error('TokenMonitoringIntegration', 'Health check failed', error as Error);
      return { healthy: false, components };
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): any {
    const apiStatus = this.api.getAPIStatus();
    const alertStats = this.alerting.getAlertStatistics();
    const activeAlerts = this.alerting.getActiveAlerts();

    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.isRunning ? TimeUtils.now().getTime() - this.startTime.getTime() : 0,
      health: apiStatus.componentHealth,
      alerts: {
        total: alertStats.total,
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
      },
      performance: {
        cacheInfo: apiStatus.cacheInfo,
        lastUpdate: TimeUtils.now(),
      },
    };
  }

  /**
   * Get TUI-formatted data
   */
  async getTUIData(): Promise<TUIDashboardData> {
    try {
      const response = await this.api.getTUIData();

      if (!response.success || !response.data) {
        throw new Error('Failed to get TUI data');
      }

      // Convert to standard TUIDashboardData format
      return {
        summary: {
          totalAgents: response.data.summary.tokenOverview.activeAgents,
          totalTokensUsed: response.data.summary.tokenOverview.totalTokensUsed,
          totalCost: response.data.summary.tokenOverview.totalCost,
          activeAlerts: response.data.summary.alerts.total,
        },
        agents: response.data.details.agents,
        alerts: activeAlerts.map(alert => ({
          id: alert.id,
          agentId: alert.agentId || 'system',
          type: alert.severity,
          message: alert.message,
          timestamp: alert.timestamp,
          acknowledged: alert.acknowledged,
        })),
        trends: response.data.trends.tokens.map((point, index) => ({
          timestamp: point.timestamp,
          usage: point.value,
          cost: response.data.trends.cost[index]?.value || 0,
          agentBreakdown: {},
        })),
        projections: this.dashboard.getCurrentMetrics()?.projections || [],
      };

    } catch (error) {
      logger.error('TokenMonitoringIntegration', 'Failed to get TUI data', error as Error);
      throw error;
    }
  }

  /**
   * Record token usage manually
   */
  recordUsage(
    agentId: string,
    operation: string,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, unknown>
  ): void {
    this.accounting.recordUsage(agentId, operation, inputTokens, outputTokens, metadata);
  }

  /**
   * Get provider usage statistics
   */
  getProviderUsage(): ProviderUsage[] {
    return this.accounting.getProviderUsage();
  }

  /**
   * Get limit predictions
   */
  getLimitPredictions(): LimitPrediction[] {
    return this.accounting.getLimitPredictions();
  }

  /**
   * Get enforcement status
   */
  getEnforcementStatus() {
    return this.enforcement.getCurrentStatus();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alerting.getActiveAlerts();
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    return this.alerting.acknowledgeAlert(alertId, acknowledgedBy);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolution?: string): boolean {
    return this.alerting.resolveAlert(alertId, resolution);
  }

  /**
   * Get system performance metrics
   */
  getPerformanceMetrics() {
    return this.api.getAPIStatus();
  }

  /**
   * Export configuration for backup/debugging
   */
  exportConfiguration(): any {
    return {
      config: this.config,
      systemStatus: this.getSystemStatus(),
      alertRules: this.alerting.getAlertStatistics(),
      componentHealth: this.performHealthCheck(),
    };
  }

  /**
   * Reset system to initial state
   */
  async reset(): Promise<void> {
    logger.info('TokenMonitoringIntegration', 'Resetting token monitoring system...');

    await this.stop();

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.start();

    logger.info('TokenMonitoringIntegration', '✅ Token monitoring system reset complete');
  }
}

/**
 * Factory function to create a token monitoring system with sensible defaults
 */
export function createTokenMonitoringSystem(
  config: TokenMonitoringIntegrationConfig = {}
): TokenMonitoringSystem {
  return new TokenMonitoringIntegration(config);
}

/**
 * Quick start function for easy integration
 */
export async function quickStartTokenMonitoring(
  config?: TokenMonitoringIntegrationConfig
): Promise<TokenMonitoringSystem> {
  const system = createTokenMonitoringSystem(config);

  await system.initialize();
  await system.start();

  logger.info('TokenMonitoringIntegration', '🚀 Token monitoring system quick started');

  return system;
}

// Export main types and factory
export type { TokenMonitoringIntegrationConfig };
export { MultiProviderTokenAccounting, RealtimeTokenUsageDetector, TokenCapEnforcementManager };
export { UnifiedTokenMonitoringDashboard, ComprehensiveMonitoringAPI, AutomatedAlertingSystem };