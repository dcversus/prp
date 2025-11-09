/**
 * ♫ Token Monitoring Tools for @dcversus/prp
 *
 * Real-time token usage tracking, caps management, and distribution monitoring
 * for orchestrator with TUI dashboard integration.
 */

import { Tool } from '../types';
import { createLayerLogger } from '../../shared';

const logger = createLayerLogger('orchestrator');

/**
 * Token metrics interface
 */
export interface TokenMetrics {
  timestamp: Date;
  agentType: string;
  component: 'inspector' | 'orchestrator' | 'scanner' | 'agent';
  currentUsage: number;
  limit: number;
  remaining: number;
  cost: number;
  signalsProcessed: number;
  averagePerSignal: number;
  metadata?: {
    prpId?: string;
    taskId?: string;
    [key: string]: unknown;
  };
}

export interface AgentCap {
  compact: number;
  waste: number;
  daily: number;
  weekly: number;
  monthly: number;
}

export interface TokenCaps {
  inspector: {
    total: number;
    basePrompt: number;
    guidelines: number;
    context: number;
  };
  orchestrator: {
    total: number;
    basePrompt: number;
    guidelines: number;
    agentsmd: number;
    notesPrompt: number;
    inspectorPayload: number;
    prp: number;
    sharedContext: number;
    prpContext: number;
  };
  agents: Map<string, AgentCap>;
}

// Interface for token caps response
interface InspectorCapsResponse {
  caps: TokenCaps['inspector'];
  current: {
    usage: number;
    remaining: number;
    percentage: number;
  } | null;
  status: string;
}

interface OrchestratorCapsResponse {
  caps: TokenCaps['orchestrator'];
  current: {
    usage: number;
    remaining: number;
    percentage: number;
  } | null;
  status: string;
}

interface AgentCurrentUsage {
  usage: number;
  remaining: number;
  percentage: number;
}

interface AgentDataEntry {
  caps: AgentCap;
  current: AgentCurrentUsage | null;
  status: string;
}

interface AgentCapsResponse {
  [agentType: string]: AgentDataEntry;
}

// Interface for scanner metrics response
interface SignalBreakdown {
  [key: string]: number;
}

interface TimeSeriesDataPoint {
  timestamp: Date;
  tokens: number;
  signals: number;
  cost: number;
}

interface ScannerMetricsResponse {
  timeRange: string;
  totalSignals: number;
  totalTokens: number;
  totalCost: number;
  averagePerSignal: number;
  signalsPerMinute: number;
  signalBreakdown?: SignalBreakdown;
  timeSeriesData: TimeSeriesDataPoint[];
}

// Interface for distribution analysis
interface DistributionEntry {
  tokens: number;
  percentage?: number;
}

interface DistributionData {
  [key: string]: DistributionEntry | number;
}

interface EfficiencyMetrics {
  tokensPerSignal: number;
  costPerToken: number;
  costPerSignal: number;
  averageSignalComplexity: number;
}

interface TrendData {
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  firstHalfUsage: number;
  secondHalfUsage: number;
}

interface DistributionResponse {
  timeRange: string;
  groupBy: string;
  totalTokens: number;
  distribution: DistributionData;
  summary: {
    topConsumer: string | null;
    efficiency: EfficiencyMetrics | null;
    trends: TrendData;
  };
}

// Interface for real-time monitoring
interface ComponentData {
  activeInstances: number;
  totalUsage: number;
  averageUsage: number;
  status: 'high' | 'medium' | 'low';
}

interface AgentMetricsData {
  [agentType: string]: {
    activeInstances: number;
    totalUsage: number;
    averageUsage: number;
  };
}

interface RealTimeComponentsData {
  inspector: ComponentData | null;
  orchestrator: ComponentData | null;
  scanner: ComponentData | null;
  agents: AgentMetricsData;
}

interface RealTimeSummaryData {
  totalActive: number;
  totalUsage: number;
  averageLoad: number;
}

interface RealTimeResponseData {
  timestamp: Date;
  components: RealTimeComponentsData;
  summary: RealTimeSummaryData;
}

interface AlertData {
  level: 'critical' | 'warning';
  type: string;
  component: string;
  message: string;
  recommendation: string;
}

interface MonitoringData {
  timestamp: Date;
  updateInterval: number;
  realTimeData: RealTimeResponseData;
  alerts: AlertData[];
  status: string;
  projections: {
    nextHour: number;
    next6Hours: number;
    next24Hours: number;
    confidence: string;
  };
  tuiDisplay?: TUIDisplayData;
}

interface TUIDisplayData {
  header: string;
  status: string;
  sections: Array<{
    title: string;
    content: string[];
    color?: string;
  }>;
  footer: string;
}

/**
 * Token Monitoring Tool Implementation
 */
export class TokenMonitoringTools {
  private tokenHistory: TokenMetrics[] = [];
  private currentCaps: TokenCaps;
  private realTimeData: Map<string, TokenMetrics> = new Map();

  constructor() {
    this.currentCaps = this.initializeDefaultCaps();
  }

  /**
   * Initialize default token caps from configuration
   */
  private initializeDefaultCaps(): TokenCaps {
    return {
      inspector: {
        total: 1000000,      // 1M tokens
        basePrompt: 20000,   // 20K tokens
        guidelines: 20000,   // 20K tokens
        context: 960000      // Remaining for context
      },
      orchestrator: {
        total: 200000,       // 200K tokens
        basePrompt: 20000,   // 20K tokens
        guidelines: 20000,   // 20K tokens
        agentsmd: 10000,     // 10K tokens
        notesPrompt: 20000,  // 20K tokens
        inspectorPayload: 40000, // 40K tokens
        prp: 20000,          // 20K tokens
        sharedContext: 10000, // 10K tokens
        prpContext: 70000    // 70K tokens
      },
      agents: new Map([
        ['claude-code', { compact: 50000, waste: 100000, daily: 500000, weekly: 2000000, monthly: 5000000 }],
        ['claude-sonnet-4-5', { compact: 75000, waste: 150000, daily: 750000, weekly: 3000000, monthly: 7500000 }],
        ['glm', { compact: 40000, waste: 80000, daily: 400000, weekly: 1600000, monthly: 4000000 }],
        ['aider', { compact: 60000, waste: 120000, daily: 600000, weekly: 2400000, monthly: 6000000 }]
      ])
    };
  }

  /**
   * Tool: Get current token caps
   */
  get_current_token_caps(): Tool {
    return {
      id: 'get_current_token_caps',
      name: 'get_current_token_caps',
      description: 'Get current token limits and usage for all system components',
      category: 'system',
      enabled: true,
      parameters: {
        component: {
          type: 'string',
          description: 'Component to get caps for (default: all)',
          enum: ['all', 'inspector', 'orchestrator', 'agents']
        }
      },
      execute: async (params: unknown) => {
        const typedParams = params as { component?: string };
        const component = typedParams.component ?? 'all';

        try {
          const result: {
            timestamp: Date;
            component: string;
            inspector?: InspectorCapsResponse;
            orchestrator?: OrchestratorCapsResponse;
            agents?: AgentCapsResponse;
          } = {
            timestamp: new Date(),
            component
          };

          switch (component) {
            case 'inspector':
              result.inspector = this.getInspectorCaps();
              break;
            case 'orchestrator':
              result.orchestrator = this.getOrchestratorCaps();
              break;
            case 'agents':
              result.agents = this.getAgentCaps();
              break;
            default:
              result.inspector = this.getInspectorCaps();
              result.orchestrator = this.getOrchestratorCaps();
              result.agents = this.getAgentCaps();
          }

          logger.info('get_current_token_caps', 'Retrieved token caps', { component });

          return {
            success: true,
            data: result,
            tokenUsage: 100,
            executionTime: 0
          };

        } catch (error) {
          logger.error('get_current_token_caps', 'Failed to get token caps', error as Error);
          throw error;
        }
      }
    };
  }

  /**
   * Tool: Get latest scanner metrics
   */
  get_latest_scanner_metrics(): Tool {
    return {
      id: 'get_latest_scanner_metrics',
      name: 'get_latest_scanner_metrics',
      description: 'Get latest token usage metrics from scanner components',
      category: 'system',
      enabled: true,
      parameters: {
        timeRange: {
          type: 'string',
          description: 'Time range for metrics (default: 1h)',
          enum: ['1m', '5m', '30m', '1h', '6h', '12h', '24h']
        },
        includeSignals: {
          type: 'boolean',
          description: 'Include signal-level breakdown (default: true)'
        }
      },
      execute: async (params: unknown) => {
        const typedParams = params as { timeRange?: string; includeSignals?: boolean };
        const timeRange = typedParams.timeRange ?? '1h';
        const includeSignals = typedParams.includeSignals !== false;

        try {
          const now = new Date();
          const timeRangeMs = this.parseTimeRange(timeRange);
          const cutoffTime = new Date(now.getTime() - timeRangeMs);

          // Filter metrics by time range
          const recentMetrics = this.tokenHistory.filter(
            metric => metric.timestamp >= cutoffTime && metric.component === 'scanner'
          );

          const scannerMetrics = {
            timeRange,
            totalSignals: recentMetrics.length,
            totalTokens: recentMetrics.reduce((sum, m) => sum + m.currentUsage, 0),
            totalCost: recentMetrics.reduce((sum, m) => sum + m.cost, 0),
            averagePerSignal: recentMetrics.length > 0
              ? recentMetrics.reduce((sum, m) => sum + m.averagePerSignal, 0) / recentMetrics.length
              : 0,
            signalsPerMinute: recentMetrics.length / (timeRangeMs / 60000),
            signalBreakdown: includeSignals ? this.getSignalBreakdown(recentMetrics) : undefined,
            timeSeriesData: this.getTimeSeriesData(recentMetrics, timeRangeMs)
          };

          logger.info('get_latest_scanner_metrics', 'Retrieved scanner metrics', {
            timeRange,
            signalCount: recentMetrics.length
          });

          return {
            success: true,
            data: scannerMetrics,
            tokenUsage: 100,
            executionTime: 0
          };

        } catch (error) {
          logger.error('get_latest_scanner_metrics', 'Failed to get scanner metrics', error as Error);
          throw error;
        }
      }
    };
  }

  /**
   * Tool: Track token distribution
   */
  track_token_distribution(): Tool {
    return {
      id: 'track_token_distribution',
      name: 'track_token_distribution',
      description: 'Track token distribution across PRPs, agents, and tasks',
      category: 'system',
      enabled: true,
      parameters: {
        groupBy: {
          type: 'string',
          description: 'Grouping level for distribution analysis (default: component)',
          enum: ['prp', 'agent', 'task', 'component']
        },
        timeRange: {
          type: 'string',
          description: 'Time range for analysis (default: 24h)',
          enum: ['1h', '6h', '12h', '24h', '7d', '30d']
        },
        includePercentages: {
          type: 'boolean',
          description: 'Include percentage breakdown (default: true)'
        }
      },
      execute: async (params: unknown) => {
        const typedParams = params as { groupBy?: string; timeRange?: string; includePercentages?: boolean };
        const groupBy = typedParams.groupBy ?? 'component';
        const timeRange = typedParams.timeRange ?? '24h';
        const includePercentages = typedParams.includePercentages !== false;

        try {
          const now = new Date();
          const timeRangeMs = this.parseTimeRange(timeRange);
          const cutoffTime = new Date(now.getTime() - timeRangeMs);

          const recentMetrics = this.tokenHistory.filter(
            metric => metric.timestamp >= cutoffTime
          );

          const distribution = this.calculateDistribution(recentMetrics, groupBy, includePercentages);

          const result = {
            timeRange,
            groupBy,
            totalTokens: recentMetrics.reduce((sum, m) => sum + m.currentUsage, 0),
            distribution,
            summary: {
              topConsumer: this.getTopConsumer(distribution),
              efficiency: this.calculateEfficiency(recentMetrics),
              trends: this.calculateTrends(recentMetrics, timeRangeMs)
            }
          };

          logger.info('track_token_distribution', 'Calculated token distribution', {
            groupBy,
            timeRange,
            totalTokens: result.totalTokens
          });

          return {
            success: true,
            data: result,
            tokenUsage: 100,
            executionTime: 0
          };

        } catch (error) {
          logger.error('track_token_distribution', 'Failed to track token distribution', error as Error);
          throw error;
        }
      }
    };
  }

  /**
   * Tool: Real-time token monitoring
   */
  real_time_token_monitoring(): Tool {
    return {
      id: 'real_time_token_monitoring',
      name: 'real_time_token_monitoring',
      description: 'Real-time token usage monitoring with streaming updates',
      category: 'system',
      enabled: true,
      parameters: {
        updateInterval: {
          type: 'number',
          description: 'Update interval in seconds (default: 5)',
          minimum: 1,
          maximum: 60
        },
        includeAlerts: {
          type: 'boolean',
          description: 'Include threshold alerts (default: true)'
        },
        tuiFormat: {
          type: 'boolean',
          description: 'Format for TUI dashboard display (default: false)'
        }
      },
      execute: async (params: unknown) => {
        const typedParams = params as { updateInterval?: number; includeAlerts?: boolean; tuiFormat?: boolean };
        const updateInterval = typedParams.updateInterval ?? 5;
        const includeAlerts = typedParams.includeAlerts !== false;
        const tuiFormat = typedParams.tuiFormat ?? false;

        try {
          const now = new Date();
          const realTimeData = this.getRealTimeData();
          const alerts = includeAlerts ? this.checkThresholds(realTimeData) : [];

          const monitoringData = {
            timestamp: now,
            updateInterval,
            realTimeData,
            alerts,
            status: this.getSystemStatus(realTimeData),
            projections: this.getProjectedUsage(realTimeData),
            tuiDisplay: tuiFormat ? this.formatForTUI(realTimeData, alerts) : undefined
          };

          logger.info('real_time_token_monitoring', 'Generated real-time monitoring data', {
            updateInterval,
            alertCount: alerts.length
          });

          return {
            success: true,
            data: monitoringData,
            tokenUsage: 100,
            executionTime: 0
          };

        } catch (error) {
          logger.error('real_time_token_monitoring', 'Failed to generate real-time monitoring', error as Error);
          throw error;
        }
      }
    };
  }

  /**
   * Update token metrics
   */
  updateTokenMetrics(metrics: Omit<TokenMetrics, 'timestamp'>): void {
    const fullMetrics: TokenMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.tokenHistory.push(fullMetrics);
    this.realTimeData.set(`${metrics.component}_${metrics.agentType}`, fullMetrics);

    // Keep history manageable (last 10000 entries)
    if (this.tokenHistory.length > 10000) {
      this.tokenHistory = this.tokenHistory.slice(-5000);
    }

    logger.debug('updateTokenMetrics', 'Updated token metrics', {
      component: metrics.component,
      agentType: metrics.agentType,
      usage: metrics.currentUsage,
      remaining: metrics.remaining
    });
  }

  /**
   * Get inspector token caps and current usage
   */
  private getInspectorCaps(): InspectorCapsResponse {
    const inspectorMetrics = this.tokenHistory.filter(m => m.component === 'inspector');
    const latest = inspectorMetrics[inspectorMetrics.length - 1];

    return {
      caps: this.currentCaps.inspector,
      current: latest ? {
        usage: latest.currentUsage,
        remaining: latest.remaining,
        percentage: (latest.currentUsage / this.currentCaps.inspector.total) * 100
      } : null,
      status: this.getCapStatus(latest, this.currentCaps.inspector.total)
    };
  }

  /**
   * Get orchestrator token caps and current usage
   */
  private getOrchestratorCaps(): OrchestratorCapsResponse {
    const orchestratorMetrics = this.tokenHistory.filter(m => m.component === 'orchestrator');
    const latest = orchestratorMetrics[orchestratorMetrics.length - 1];

    return {
      caps: this.currentCaps.orchestrator,
      current: latest ? {
        usage: latest.currentUsage,
        remaining: latest.remaining,
        percentage: (latest.currentUsage / this.currentCaps.orchestrator.total) * 100
      } : null,
      status: this.getCapStatus(latest, this.currentCaps.orchestrator.total)
    };
  }

  /**
   * Get agent token caps and current usage
   */
  private getAgentCaps(): AgentCapsResponse {
    const agentMetrics = this.tokenHistory.filter(m => m.component === 'agent');
    const agentUsage = new Map<string, TokenMetrics[]>();

    for (const metric of agentMetrics) {
      if (!agentUsage.has(metric.agentType)) {
        agentUsage.set(metric.agentType, []);
      }
      agentUsage.get(metric.agentType).push(metric);
    }

    const agentData: AgentCapsResponse = {};

    // Return all configured agents, even if no history data exists
    for (const [agentType, caps] of Array.from(this.currentCaps.agents)) {
      const metrics = agentUsage.get(agentType) ?? [];
      const latest = metrics.length > 0 ? metrics[metrics.length - 1] : undefined;

      agentData[agentType] = {
        caps,
        current: latest ? {
          usage: latest.currentUsage,
          remaining: latest.remaining,
          percentage: (latest.currentUsage / caps.waste) * 100
        } : null,
        status: this.getCapStatus(latest, caps.waste)
      };
    }

    return agentData;
  }

  /**
   * Get cap status based on usage percentage
   */
  private getCapStatus(metric: TokenMetrics | undefined, limit: number): string {
    if (!metric) return 'no_data';
    const percentage = (metric.currentUsage / limit) * 100;

    if (percentage >= 95) return 'critical';
    if (percentage >= 80) return 'warning';
    if (percentage >= 60) return 'moderate';
    return 'healthy';
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    const units: Record<string, number> = {
      'm': 60000,      // minutes
      'h': 3600000,    // hours
      'd': 86400000,   // days
      'w': 604800000   // weeks
    };

    const match = timeRange.match(/^(\d+)([mhdw])$/);
    if (!match) {
      throw new Error(`Invalid time range format: ${timeRange}`);
    }

    const [, amount, unit] = match;
    if (!unit || !(unit in units)) {
      throw new Error(`Invalid time unit: ${unit}`);
    }
    return parseInt(amount ?? '0', 10) * (units[unit] ?? 0);
  }

  /**
   * Get signal breakdown from metrics
   */
  private getSignalBreakdown(metrics: TokenMetrics[]): SignalBreakdown {
    const breakdown: Record<string, number> = {};

    for (const metric of metrics) {
      // This would need to be enhanced with actual signal data
      const key = `${metric.agentType}_${metric.component}`;
      breakdown[key] = (breakdown[key] ?? 0) + metric.currentUsage;
    }

    return breakdown;
  }

  /**
   * Get time series data for charts
   */
  private getTimeSeriesData(metrics: TokenMetrics[], timeRangeMs: number): TimeSeriesDataPoint[] {
    const bucketSize = Math.max(timeRangeMs / 50, 60000); // 50 buckets or 1 minute minimum
    const buckets = new Map<number, TokenMetrics[]>();

    for (const metric of metrics) {
      const bucketTime = Math.floor(metric.timestamp.getTime() / bucketSize) * bucketSize;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)?.push(metric);
    }

    return Array.from(buckets.entries()).map(([timestamp, bucketMetrics]) => ({
      timestamp: new Date(timestamp),
      tokens: bucketMetrics.reduce((sum, m) => sum + m.currentUsage, 0),
      signals: bucketMetrics.length,
      cost: bucketMetrics.reduce((sum, m) => sum + m.cost, 0)
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate token distribution
   */
  private calculateDistribution(metrics: TokenMetrics[], groupBy: string, includePercentages: boolean): DistributionData {
    const distribution: Record<string, any> = {};
    const total = metrics.reduce((sum, m) => sum + m.currentUsage, 0);

    for (const metric of metrics) {
      let key: string;
      switch (groupBy) {
        case 'prp':
          key = metric.metadata?.prpId ?? 'unknown';
          break;
        case 'agent':
          key = metric.agentType;
          break;
        case 'task':
          key = metric.metadata?.taskId ?? 'unknown';
          break;
        case 'component':
        default:
          key = metric.component;
      }

      distribution[key] = (distribution[key] ?? 0) + metric.currentUsage;
    }

    if (includePercentages && total > 0) {
      for (const key in distribution) {
        const tokenValue = distribution[key];
        distribution[key] = {
          tokens: tokenValue,
          percentage: (tokenValue / total) * 100
        };
      }
    }

    return distribution;
  }

  /**
   * Get top consumer from distribution
   */
  private getTopConsumer(distribution: DistributionData): string | null {
    let topConsumer = null;
    let maxUsage = 0;

    for (const [key, value] of Object.entries(distribution)) {
      const usage = typeof value === 'object' && value !== null && 'tokens' in value ? (value as { tokens: number }).tokens : value;
      if (usage > maxUsage) {
        maxUsage = usage;
        topConsumer = key;
      }
    }

    return topConsumer;
  }

  /**
   * Calculate efficiency metrics
   */
  private calculateEfficiency(metrics: TokenMetrics[]): EfficiencyMetrics | null {
    if (metrics.length === 0) return null;

    const totalTokens = metrics.reduce((sum, m) => sum + m.currentUsage, 0);
    const totalSignals = metrics.length;
    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);

    return {
      tokensPerSignal: totalTokens / totalSignals,
      costPerToken: totalCost / totalTokens,
      costPerSignal: totalCost / totalSignals,
      averageSignalComplexity: metrics.reduce((sum, m) => sum + m.averagePerSignal, 0) / totalSignals
    };
  }

  /**
   * Calculate usage trends
   */
  private calculateTrends(metrics: TokenMetrics[], timeRangeMs: number): TrendData {
    const midpoint = new Date(Date.now() - timeRangeMs / 2);
    const firstHalf = metrics.filter(m => m.timestamp < midpoint);
    const secondHalf = metrics.filter(m => m.timestamp >= midpoint);

    const firstUsage = firstHalf.reduce((sum, m) => sum + m.currentUsage, 0);
    const secondUsage = secondHalf.reduce((sum, m) => sum + m.currentUsage, 0);

    const trend = secondUsage > firstUsage ? 'increasing' : secondUsage < firstUsage ? 'decreasing' : 'stable';
    const changePercent = firstUsage > 0 ? ((secondUsage - firstUsage) / firstUsage) * 100 : 0;

    return {
      trend,
      changePercent,
      firstHalfUsage: firstUsage,
      secondHalfUsage: secondUsage
    };
  }

  /**
   * Get real-time data for monitoring
   */
  private getRealTimeData(): RealTimeResponseData {
    const now = new Date();
    const recentData = new Map();

    // Get most recent data for each component/agent combination
    for (const [key, metrics] of Array.from(this.realTimeData)) {
      // Only include data from last 5 minutes
      if (now.getTime() - metrics.timestamp.getTime() < 300000) {
        recentData.set(key, metrics);
      }
    }

    return {
      timestamp: now,
      components: {
        inspector: this.getComponentData('inspector', recentData),
        orchestrator: this.getComponentData('orchestrator', recentData),
        scanner: this.getComponentData('scanner', recentData),
        agents: this.getAgentData(recentData)
      },
      summary: {
        totalActive: recentData.size,
        totalUsage: Array.from(recentData.values()).reduce((sum, m) => sum + m.currentUsage, 0),
        averageLoad: recentData.size > 0 ? Array.from(recentData.values()).reduce((sum, m) => sum + (m.currentUsage / m.limit), 0) / recentData.size : 0
      }
    };
  }

  /**
   * Get component data for real-time monitoring
   */
  private getComponentData(component: string, data: Map<string, TokenMetrics>): ComponentData | null {
    const componentData = Array.from(data.values()).filter(m => m.component === component);

    if (componentData.length === 0) return null;

    const totalUsage = componentData.reduce((sum, m) => sum + m.currentUsage, 0);
    const avgUsage = totalUsage / componentData.length;

    return {
      activeInstances: componentData.length,
      totalUsage,
      averageUsage: avgUsage,
      status: avgUsage > 0.8 ? 'high' : avgUsage > 0.5 ? 'medium' : 'low' as 'high' | 'medium' | 'low'
    };
  }

  /**
   * Get agent data for real-time monitoring
   */
  private getAgentData(data: Map<string, TokenMetrics>): AgentMetricsData {
    const agentData = new Map<string, TokenMetrics[]>();

    for (const metrics of Array.from(data.values())) {
      if (metrics.component === 'agent') {
        if (!agentData.has(metrics.agentType)) {
          agentData.set(metrics.agentType, []);
        }
        agentData.get(metrics.agentType)?.push(metrics);
      }
    }

    const result: AgentMetricsData = {};
    for (const [agentType, metrics] of Array.from(agentData)) {
      result[agentType] = {
        activeInstances: metrics.length,
        totalUsage: metrics.reduce((sum, m) => sum + m.currentUsage, 0),
        averageUsage: metrics.reduce((sum, m) => sum + m.currentUsage, 0) / metrics.length
      };
    }

    return result;
  }

  /**
   * Check thresholds and generate alerts
   */
  private checkThresholds(data: RealTimeResponseData): AlertData[] {
    const alerts: AlertData[] = [];

    // Check for high usage
    for (const [component, compData] of Object.entries(data.components)) {
      if (compData && compData !== null && typeof compData === 'object' && 'averageUsage' in compData) {
        const componentData = compData as ComponentData;
        if (componentData.averageUsage > 0.9) {
          alerts.push({
            level: 'critical',
            type: 'high_usage',
            component,
            message: `${component} usage at ${(componentData.averageUsage * 100).toFixed(1)}%`,
            recommendation: 'Consider scaling or optimizing usage'
          });
        } else if (componentData.averageUsage > 0.8) {
          alerts.push({
            level: 'warning',
            type: 'moderate_usage',
            component,
            message: `${component} usage at ${(componentData.averageUsage * 100).toFixed(1)}%`,
            recommendation: 'Monitor closely'
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Get system status based on real-time data
   */
  private getSystemStatus(data: RealTimeResponseData): string {
    const avgLoad = data.summary.averageLoad;

    if (avgLoad > 0.9) return 'critical';
    if (avgLoad > 0.7) return 'warning';
    if (avgLoad > 0.4) return 'moderate';
    return 'healthy';
  }

  /**
   * Project future usage based on current trends
   */
  private getProjectedUsage(data: RealTimeResponseData): MonitoringData['projections'] {
    // Simple projection based on current usage
    const currentHourlyUsage = data.summary.totalUsage;

    return {
      nextHour: currentHourlyUsage * 1.1,
      next6Hours: currentHourlyUsage * 6.5,
      next24Hours: currentHourlyUsage * 25,
      confidence: 'medium' // Could be enhanced with actual trend analysis
    };
  }

  /**
   * Format data for TUI display
   */
  private formatForTUI(data: RealTimeResponseData, alerts: AlertData[]): TUIDisplayData {
    const systemStatus = data.summary.totalActive > 0 ? 'ACTIVE' : 'IDLE';
    return {
      header: `Token Monitor - ${data.timestamp.toLocaleTimeString()}`,
      status: systemStatus,
      sections: [
        {
          title: 'Overview',
          content: [
            `Active Components: ${data.summary.totalActive}`,
            `Total Usage: ${data.summary.totalUsage.toLocaleString()} tokens`,
            `Average Load: ${(data.summary.averageLoad * 100).toFixed(1)}%`,
            `Status: ${systemStatus}`
          ]
        },
        {
          title: 'Components',
          content: Object.entries(data.components).map(([comp, compData]) =>
            compData && compData !== null && typeof compData === 'object' && 'averageUsage' in compData
              ? `${comp}: ${((compData as ComponentData).averageUsage * 100).toFixed(1)}% (${(compData as ComponentData).activeInstances} active)`
              : `${comp}: INACTIVE`
          )
        },
        ...(alerts.length > 0 ? [{
          title: 'Alerts',
          content: alerts.map(alert => `⚠️ ${alert.message}`),
          color: 'red'
        }] : [])
      ],
      footer: `Next update in ${data.updateInterval}s`
    };
  }
}