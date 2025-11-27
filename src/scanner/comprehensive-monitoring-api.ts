/**
 * ♫ Comprehensive Monitoring API for @dcversus/prp
 *
 * Provides a unified API that integrates multi-provider token accounting,
 * real-time detection, cap enforcement, and dashboard functionality
 * for seamless TUI integration and external monitoring.
 */
import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils } from '../shared';

import type {
  TokenDataPoint,
  TUIDashboardData,
  TokenPerformanceMetrics,
  TokenAlert,
  AgentTokenStatus,
  TokenProjection,
} from '../shared/types/token-metrics';
import type {
  MultiProviderTokenAccounting,
  ProviderUsage,
  LimitPrediction,
  TokenUsageRecord,
} from './multi-provider-token-accounting';
import type {
  TokenCapEnforcementManager,
  CapEnforcementStatus,
  EnforcementAction,
} from './token-cap-enforcement';
import type {
  UnifiedTokenMonitoringDashboard,
  UnifiedTokenMetrics,
} from './unified-token-monitoring-dashboard';
import type {
  RealtimeTokenUsageDetector,
  TokenDetectionEvent,
} from './realtime-token-usage-detector';

const logger = createLayerLogger('scanner');

// Comprehensive monitoring interfaces
export interface MonitoringSystemConfig {
  updateInterval: number; // milliseconds
  retentionPeriod: number; // hours
  enableRealTimeUpdates: boolean;
  enableHistoricalData: boolean;
  enableAlerting: boolean;
  enableProjections: boolean;
  performanceMode: 'high' | 'balanced' | 'low';
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  components: {
    accounting: ComponentHealth;
    enforcement: ComponentHealth;
    dashboard: ComponentHealth;
    detector: ComponentHealth;
  };
  overallScore: number; // 0-100
  lastUpdate: Date;
  activeIssues: string[];
}

export interface ComponentHealth {
  status: 'running' | 'degraded' | 'stopped' | 'error';
  lastCheck: Date;
  responseTime: number; // milliseconds
  errorCount: number;
  lastError?: string;
}

export interface ComprehensiveMonitoringData {
  timestamp: Date;
  systemHealth: SystemHealthStatus;
  tokenMetrics: {
    current: UnifiedTokenMetrics | null;
    history: UnifiedTokenMetrics[];
    providers: ProviderUsage[];
    predictions: LimitPrediction[];
  };
  enforcement: {
    status: CapEnforcementStatus | null;
    history: EnforcementAction[];
    activeActions: EnforcementAction[];
  };
  detections: {
    recent: TokenDetectionEvent[];
    statistics: any;
    patterns: any[];
  };
  performance: TokenPerformanceMetrics;
  alerts: TokenAlert[];
  projections: TokenProjection[];
}

export interface MonitoringApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  processingTime: number;
}

export interface TUIDataResponse {
  summary: {
    systemHealth: SystemHealthStatus;
    tokenOverview: {
      totalTokensUsed: number;
      totalCost: number;
      activeAgents: number;
      systemStatus: string;
    };
    alerts: {
      total: number;
      critical: number;
      warnings: number;
    };
  };
  details: {
    providers: ProviderUsage[];
    agents: AgentTokenStatus[];
    enforcement: CapEnforcementStatus | null;
    detections: TokenDetectionEvent[];
  };
  trends: {
    tokens: Array<{ timestamp: Date; value: number; }>;
    cost: Array<{ timestamp: Date; value: number; }>;
    alerts: Array<{ timestamp: Date; count: number; }>;
  };
}

/**
 * Comprehensive Monitoring API
 */
export class ComprehensiveMonitoringAPI extends EventEmitter {
  private readonly config: MonitoringSystemConfig;

  // Component references
  private readonly multiProviderAccounting: MultiProviderTokenAccounting;
  private readonly capEnforcement: TokenCapEnforcementManager;
  private readonly monitoringDashboard: UnifiedTokenMonitoringDashboard;
  private readonly tokenDetector: RealtimeTokenUsageDetector;

  // System state
  private isRunning = false;
  private updateTimer?: NodeJS.Timeout;
  private readonly lastUpdate: Date = new Date();

  // Health monitoring
  private readonly componentHealth = new Map<string, ComponentHealth>();
  private readonly systemErrors = new Map<string, { timestamp: Date; message: string; }>();

  // Data caching
  private cachedData: ComprehensiveMonitoringData | null = null;
  private cacheTimestamp: Date = new Date();
  private readonly cacheTimeout = 5000; // 5 seconds

  constructor(
    multiProviderAccounting: MultiProviderTokenAccounting,
    capEnforcement: TokenCapEnforcementManager,
    monitoringDashboard: UnifiedTokenMonitoringDashboard,
    tokenDetector: RealtimeTokenUsageDetector,
    config: Partial<MonitoringSystemConfig> = {}
  ) {
    super();

    this.multiProviderAccounting = multiProviderAccounting;
    this.capEnforcement = capEnforcement;
    this.monitoringDashboard = monitoringDashboard;
    this.tokenDetector = tokenDetector;

    this.config = {
      updateInterval: 2000, // 2 seconds
      retentionPeriod: 24, // 24 hours
      enableRealTimeUpdates: true,
      enableHistoricalData: true,
      enableAlerting: true,
      enableProjections: true,
      performanceMode: 'balanced',
      ...config,
    };

    this.initializeComponentHealth();
    this.setupEventHandlers();
    this.start();
  }

  /**
   * Initialize component health tracking
   */
  private initializeComponentHealth(): void {
    const components = ['accounting', 'enforcement', 'dashboard', 'detector'];

    components.forEach(component => {
      this.componentHealth.set(component, {
        status: 'stopped',
        lastCheck: new Date(),
        responseTime: 0,
        errorCount: 0,
      });
    });

    logger.info('ComprehensiveMonitoringAPI', 'Component health tracking initialized');
  }

  /**
   * Setup event handlers for all components
   */
  private setupEventHandlers(): void {
    // Multi-provider accounting events
    this.multiProviderAccounting.on('usage:recorded', (data: any) => {
      this.updateComponentHealth('accounting', 'running');
      this.emit('data_update', { type: 'usage_recorded', data });
    });

    this.multiProviderAccounting.on('limits:critical', (data: any) => {
      this.updateComponentHealth('accounting', 'running');
      this.emit('critical_alert', { type: 'limits_critical', data });
    });

    this.multiProviderAccounting.on('error', (error: Error) => {
      this.updateComponentHealth('accounting', 'error', error.message);
    });

    // Cap enforcement events
    this.capEnforcement.on('enforcement_triggered', (data: any) => {
      this.updateComponentHealth('enforcement', 'running');
      this.emit('enforcement_alert', data);
    });

    this.capEnforcement.on('status_update', (data: any) => {
      this.updateComponentHealth('enforcement', 'running');
      this.emit('status_update', data);
    });

    // Monitoring dashboard events
    this.monitoringDashboard.on('update', (data: any) => {
      this.updateComponentHealth('dashboard', 'running');
      this.cachedData = null; // Invalidate cache
      this.emit('metrics_update', data);
    });

    this.monitoringDashboard.on('alert', (alert: TokenAlert) => {
      this.updateComponentHealth('dashboard', 'running');
      this.emit('dashboard_alert', alert);
    });

    // Token detector events
    this.tokenDetector.on('detected', (data: any) => {
      this.updateComponentHealth('detector', 'running');
      this.emit('token_detected', data);
    });

    this.tokenDetector.on('error', (error: Error) => {
      this.updateComponentHealth('detector', 'error', error.message);
    });
  }

  /**
   * Start the monitoring API
   */
  private start(): void {
    if (this.isRunning) {
      logger.warn('ComprehensiveMonitoringAPI', 'API already running');
      return;
    }

    this.isRunning = true;

    // Initialize all components to 'running' status
    this.updateComponentHealth('accounting', 'running');
    this.updateComponentHealth('enforcement', 'running');
    this.updateComponentHealth('dashboard', 'running');
    this.updateComponentHealth('detector', 'running');

    // Start periodic updates
    if (this.config.enableRealTimeUpdates) {
      this.updateTimer = setInterval(() => {
        this.performHealthCheck();
        this.updateCachedData();
      }, this.config.updateInterval);
    }

    logger.info('ComprehensiveMonitoringAPI', '✅ Comprehensive monitoring API started', {
      updateInterval: this.config.updateInterval,
      performanceMode: this.config.performanceMode,
    });
  }

  /**
   * Update component health status
   */
  private updateComponentHealth(
    component: string,
    status: ComponentHealth['status'],
    errorMessage?: string
  ): void {
    const current = this.componentHealth.get(component);
    if (!current) {
      return;
    }

    const health: ComponentHealth = {
      ...current,
      status,
      lastCheck: new Date(),
      errorCount: status === 'error' ? current.errorCount + 1 : 0,
      lastError: status === 'error' ? errorMessage : undefined,
      responseTime: status === 'running' ? Math.random() * 100 : current.responseTime, // Simulate response time
    };

    this.componentHealth.set(component, health);

    // Track system errors
    if (errorMessage) {
      this.systemErrors.set(`${component}_${Date.now()}`, {
        timestamp: new Date(),
        message: errorMessage,
      });
    }
  }

  /**
   * Perform health check on all components
   */
  private performHealthCheck(): void {
    for (const [component, health] of Array.from(this.componentHealth.entries())) {
      // Check if component has been updated recently
      const timeSinceLastCheck = TimeUtils.now().getTime() - health.lastCheck.getTime();

      if (timeSinceLastCheck > 30000) { // 30 seconds without update
        this.updateComponentHealth(component, 'degraded', `No updates for ${Math.floor(timeSinceLastCheck / 1000)}s`);
      } else if (health.status === 'error' && timeSinceLastCheck > 60000) { // 1 minute in error state
        this.updateComponentHealth(component, 'stopped', 'Component appears to be stopped');
      }
    }
  }

  /**
   * Update cached data
   */
  private updateCachedData(): void {
    try {
      const startTime = Date.now();

      // Gather data from all components
      const systemHealth = this.getSystemHealth();
      const tokenMetrics = this.getTokenMetrics();
      const enforcement = this.getEnforcementData();
      const detections = this.getDetectionData();
      const performance = this.getPerformanceMetrics();
      const alerts = this.getAlerts();
      const projections = this.getProjections();

      this.cachedData = {
        timestamp: TimeUtils.now(),
        systemHealth,
        tokenMetrics,
        enforcement,
        detections,
        performance,
        alerts,
        projections,
      };

      this.cacheTimestamp = new Date();

      const processingTime = Date.now() - startTime;
      if (processingTime > 1000) { // Log if processing is slow
        logger.debug('ComprehensiveMonitoringAPI', 'Data update completed', {
          processingTime,
          componentsCount: 4,
        });
      }

    } catch (error) {
      logger.warn('ComprehensiveMonitoringAPI', 'Failed to update cached data', { error });
    }
  }

  /**
   * Get current system health
   */
  getSystemHealth(): SystemHealthStatus {
    const components: SystemHealthStatus['components'] = {
      accounting: this.componentHealth.get('accounting')!,
      enforcement: this.componentHealth.get('enforcement')!,
      dashboard: this.componentHealth.get('dashboard')!,
      detector: this.componentHealth.get('detector')!,
    };

    // Calculate overall status
    const statuses = Object.values(components).map(c => c.status);
    let overallStatus: SystemHealthStatus['status'] = 'healthy';
    let overallScore = 100;

    if (statuses.some(s => s === 'error' || s === 'stopped')) {
      overallStatus = 'critical';
      overallScore = 25;
    } else if (statuses.some(s => s === 'degraded')) {
      overallStatus = 'degraded';
      overallScore = 60;
    } else if (statuses.every(s => s === 'running')) {
      overallStatus = 'healthy';
      overallScore = 95;
    }

    // Get active issues
    const activeIssues: string[] = [];
    for (const [component, health] of Array.from(components.entries())) {
      if (health.status !== 'running') {
        activeIssues.push(`${component}: ${health.status}${health.lastError ? ` - ${health.lastError}` : ''}`);
      }
    }

    return {
      status: overallStatus,
      components,
      overallScore,
      lastUpdate: new Date(),
      activeIssues,
    };
  }

  /**
   * Get token metrics from all sources
   */
  private getTokenMetrics(): ComprehensiveMonitoringData['tokenMetrics'] {
    return {
      current: this.monitoringDashboard.getCurrentMetrics(),
      history: this.monitoringDashboard.getMetricsHistory(24),
      providers: this.multiProviderAccounting.getProviderUsage(),
      predictions: this.multiProviderAccounting.getLimitPredictions(),
    };
  }

  /**
   * Get enforcement data
   */
  private getEnforcementData(): ComprehensiveMonitoringData['enforcement'] {
    return {
      status: this.capEnforcement.getCurrentStatus(),
      history: this.capEnforcement.getEnforcementHistory(24),
      activeActions: Array.from(this.capEnforcement.getCurrentStatus().activeEnforcements),
    };
  }

  /**
   * Get detection data
   */
  private getDetectionData(): ComprehensiveMonitoringData['detections'] {
    return {
      recent: this.tokenDetector.getRecentDetections(60),
      statistics: this.tokenDetector.getDetectionStats(),
      patterns: [], // Would be populated from detector
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): TokenPerformanceMetrics {
    return this.monitoringDashboard.getPerformanceMetrics();
  }

  /**
   * Get current alerts
   */
  private getAlerts(): TokenAlert[] {
    const dashboardAlerts = this.monitoringDashboard.getCurrentMetrics()?.alerts ?? [];
    const streamAlerts = []; // Would get from token metrics stream

    return [...dashboardAlerts, ...streamAlerts];
  }

  /**
   * Get projections
   */
  private getProjections(): TokenProjection[] {
    return this.monitoringDashboard.getCurrentMetrics()?.projections ?? [];
  }

  /**
   * Main API method: Get comprehensive monitoring data
   */
  async getMonitoringData(): Promise<MonitoringApiResponse<ComprehensiveMonitoringData>> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.cachedData && (Date.now() - this.cacheTimestamp.getTime()) < this.cacheTimeout) {
        return {
          success: true,
          data: this.cachedData,
          timestamp: this.cacheTimestamp,
          processingTime: Date.now() - startTime,
        };
      }

      // Generate fresh data
      this.updateCachedData();

      return {
        success: true,
        data: this.cachedData!,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      logger.error('ComprehensiveMonitoringAPI', 'Failed to get monitoring data', error as Error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get TUI-formatted data
   */
  async getTUIData(): Promise<MonitoringApiResponse<TUIDataResponse>> {
    const startTime = Date.now();

    try {
      const monitoringData = await this.getMonitoringData();

      if (!monitoringData.success || !monitoringData.data) {
        throw new Error('Failed to get monitoring data');
      }

      const {data} = monitoringData;

      // Format for TUI consumption
      const tuiResponse: TUIDataResponse = {
        summary: {
          systemHealth: data.systemHealth,
          tokenOverview: {
            totalTokensUsed: data.tokenMetrics.current?.totalTokensUsed ?? 0,
            totalCost: data.tokenMetrics.current?.totalCost ?? 0,
            activeAgents: data.tokenMetrics.current?.activeAgents ?? 0,
            systemStatus: data.systemHealth.status.toUpperCase(),
          },
          alerts: {
            total: data.alerts.length,
            critical: data.alerts.filter(a => a.type === 'critical').length,
            warnings: data.alerts.filter(a => a.type === 'warning').length,
          },
        },
        details: {
          providers: data.tokenMetrics.providers,
          agents: this.getAgentStatuses(),
          enforcement: data.enforcement.status,
          detections: data.detections.recent.slice(0, 10), // Last 10 detections
        },
        trends: {
          tokens: this.getTrendData('tokens'),
          cost: this.getTrendData('cost'),
          alerts: this.getTrendData('alerts'),
        },
      };

      return {
        success: true,
        data: tuiResponse,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      logger.error('ComprehensiveMonitoringAPI', 'Failed to get TUI data', error as Error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get agent statuses for TUI
   */
  private getAgentStatuses(): AgentTokenStatus[] {
    const providers = this.multiProviderAccounting.getProviderUsage();

    const agentStatuses: AgentTokenStatus[] = providers.map(provider => ({
      agentId: provider.providerId,
      agentType: provider.providerName,
      currentUsage: provider.dailyUsage,
      limit: provider.limits.daily,
      percentage: provider.percentages.daily,
      cost: provider.totalCost,
      status: provider.status === 'healthy' ? 'normal' :
              provider.status === 'warning' ? 'warning' :
              provider.status === 'critical' ? 'critical' : 'blocked',
      lastActivity: new Date(),
      efficiency: provider.averageTokensPerRequest > 0 ? provider.totalCost / provider.totalTokens : 0,
    }));

    // Add system components as agents
    const enforcementStatus = this.capEnforcement.getCurrentStatus();

    agentStatuses.push({
      agentId: 'inspector',
      agentType: 'Inspector',
      currentUsage: enforcementStatus.inspector.currentUsage,
      limit: enforcementStatus.inspector.limit,
      percentage: enforcementStatus.inspector.percentage,
      cost: 0,
      status: enforcementStatus.inspector.status === 'normal' ? 'normal' :
              enforcementStatus.inspector.status === 'warning' ? 'warning' :
              enforcementStatus.inspector.status === 'critical' ? 'critical' : 'blocked',
      lastActivity: enforcementStatus.timestamp,
      efficiency: 0.85,
    });

    agentStatuses.push({
      agentId: 'orchestrator',
      agentType: 'Orchestrator',
      currentUsage: enforcementStatus.orchestrator.currentUsage,
      limit: enforcementStatus.orchestrator.limit,
      percentage: enforcementStatus.orchestrator.percentage,
      cost: 0,
      status: enforcementStatus.orchestrator.status === 'normal' ? 'normal' :
              enforcementStatus.orchestrator.status === 'warning' ? 'warning' :
              enforcementStatus.orchestrator.status === 'critical' ? 'critical' : 'blocked',
      lastActivity: enforcementStatus.timestamp,
      efficiency: 0.90,
    });

    return agentStatuses;
  }

  /**
   * Get trend data for charts
   */
  private getTrendData(type: 'tokens' | 'cost' | 'alerts'): Array<{ timestamp: Date; value: number; }> {
    const history = this.monitoringDashboard.getMetricsHistory(24); // Last 24 hours
    const now = new Date();

    return history.map((metrics, index) => {
      const timestamp = new Date(now.getTime() - (23 - index) * 60 * 60 * 1000);

      let value = 0;
      switch (type) {
        case 'tokens':
          value = metrics.totalTokensUsed;
          break;
        case 'cost':
          value = metrics.totalCost;
          break;
        case 'alerts':
          value = metrics.alerts.length;
          break;
      }

      return { timestamp, value };
    });
  }

  /**
   * Get specific endpoint data
   */
  async getSystemHealthStatus(): Promise<MonitoringApiResponse<SystemHealthStatus>> {
    try {
      return {
        success: true,
        data: this.getSystemHealth(),
        timestamp: new Date(),
        processingTime: 10,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        processingTime: 10,
      };
    }
  }

  async getProviderUsage(): Promise<MonitoringApiResponse<ProviderUsage[]>> {
    try {
      return {
        success: true,
        data: this.multiProviderAccounting.getProviderUsage(),
        timestamp: new Date(),
        processingTime: 50,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        processingTime: 50,
      };
    }
  }

  async getEnforcementStatus(): Promise<MonitoringApiResponse<CapEnforcementStatus>> {
    try {
      return {
        success: true,
        data: this.capEnforcement.getCurrentStatus(),
        timestamp: new Date(),
        processingTime: 25,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        processingTime: 25,
      };
    }
  }

  async getDetectionEvents(minutes = 10): Promise<MonitoringApiResponse<TokenDetectionEvent[]>> {
    try {
      return {
        success: true,
        data: this.tokenDetector.getRecentDetections(minutes),
        timestamp: new Date(),
        processingTime: 30,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        processingTime: 30,
      };
    }
  }

  /**
   * Get API status and configuration
   */
  getAPIStatus(): {
    isRunning: boolean;
    config: MonitoringSystemConfig;
    componentHealth: Record<string, ComponentHealth>;
    cacheInfo: {
      isCached: boolean;
      cacheAge: number;
      lastUpdate: Date;
    };
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      componentHealth: Object.fromEntries(this.componentHealth),
      cacheInfo: {
        isCached: this.cachedData !== null,
        cacheAge: Date.now() - this.cacheTimestamp.getTime(),
        lastUpdate: this.cacheTimestamp,
      },
    };
  }

  /**
   * Update API configuration
   */
  updateConfig(updates: Partial<MonitoringSystemConfig>): void {
    Object.assign(this.config, updates);

    // Restart with new configuration if needed
    if (updates.updateInterval && this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = setInterval(() => {
        this.performHealthCheck();
        this.updateCachedData();
      }, this.config.updateInterval);
    }

    logger.info('ComprehensiveMonitoringAPI', 'Configuration updated', { updates });
  }

  /**
   * Stop the monitoring API
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.removeAllListeners();
    this.cachedData = null;

    logger.info('ComprehensiveMonitoringAPI', 'Comprehensive monitoring API stopped');
  }
}