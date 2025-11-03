/**
 * ♫ Token Accounting System for @dcversus/prp Scanner
 *
 * Comprehensive token usage tracking, limits monitoring, and alerting.
 */

import {
  TokenAccountingEntry,
  TokenAccountingReport,
  TokenAlert,
  ScannerConfig,
  TokenAccountingMetadata,
  AgentBreakdown,
  LayerBreakdown,
  ModelBreakdown,
  PersistedAccountingData
} from './types';
import {
  createLayerLogger,
  TimeUtils,
  HashUtils,
  FileUtils,
  ConfigUtils
} from '../shared';
import { configManager } from '../shared/config';

const logger = createLayerLogger('scanner');

export interface TokenLimitStatus {
  agentId: string;
  current: {
    tokens: number;
    cost: number;
    operations: number;
  };
  limits: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    maxPrice?: number;
  };
  percentages: {
    daily: number;
    weekly: number;
    monthly: number;
    price: number;
  };
  alerts: TokenAlert[];
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
}

/**
 * ♫ Token Accounting Manager
 */
export class TokenAccountingManager {
  private entries: Map<string, TokenAccountingEntry> = new Map();
  private alerts: Map<string, TokenAlert> = new Map();
  private persistPath: string;

  constructor(_config: ScannerConfig, persistPath: string = '.prp/token-accounting.json') {
    this.persistPath = persistPath;
    this.loadPersistedData();
    this.startPeriodicChecks();
  }

  /**
   * Record token usage for an agent
   */
  recordUsage(
    agentId: string,
    agentType: string,
    operation: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    layer: 'scanner' | 'inspector' | 'orchestrator' | 'agent',
    metadata: TokenAccountingMetadata = {}
  ): void {
    const totalTokens = inputTokens + outputTokens;
    const cost = this.calculateCost(model, totalTokens);

    const entry: TokenAccountingEntry = {
      id: HashUtils.generateId(),
      timestamp: TimeUtils.now(),
      agentId,
      agentType,
      operation,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      currency: 'USD',
      layer,
      metadata: {
        ...metadata,
        scanId: metadata.scanId,
        worktree: metadata.worktree,
      }
    };

    this.entries.set(entry.id, entry);

    logger.tokenUsage('scanner', `${agentId} - ${operation}`, inputTokens, outputTokens, model, {
      cost,
      operation
    });

    // Check for alerts
    this.checkTokenLimits(agentId, entry);

    // Event publishing would be handled by the event system
    // eventBus.publishToChannel('scanner', {
    //   id: entry.id,
    //   type: 'token_usage_recorded',
    //   timestamp: entry.timestamp,
    //   source: 'scanner',
    //   data: entry,
    //   metadata: entry.metadata
    // });

    // Persist data periodically
    if (this.entries.size % 10 === 0) {
      this.persistData();
    }
  }

  /**
   * Get token usage for an agent within a time period
   */
  getUsage(
    agentId: string,
    period: 'day' | 'week' | 'month' | 'custom' = 'day',
    customStart?: Date,
    customEnd?: Date
  ): {
    tokens: number;
    cost: number;
    operations: number;
    entries: TokenAccountingEntry[];
  } {
    const now = TimeUtils.now();
    let startTime: Date;
    let endTime: Date = now;

    switch (period) {
      case 'day':
        startTime = TimeUtils.daysAgo(1);
        break;
      case 'week':
        startTime = TimeUtils.daysAgo(7);
        break;
      case 'month':
        startTime = TimeUtils.daysAgo(30);
        break;
      case 'custom':
        startTime = customStart || TimeUtils.daysAgo(1);
        endTime = customEnd || now;
        break;
    }

    const agentEntries = Array.from(this.entries.values()).filter(entry =>
      entry.agentId === agentId &&
      entry.timestamp >= startTime &&
      entry.timestamp <= endTime
    );

    const tokens = agentEntries.reduce((sum, entry) => sum + entry.totalTokens, 0);
    const cost = agentEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const operations = agentEntries.length;

    return {
      tokens,
      cost,
      operations,
      entries: agentEntries
    };
  }

  /**
   * Get token limit status for an agent
   */
  getLimitStatus(agentId: string): TokenLimitStatus | null {
    const config = configManager.get();
    const agentConfig = config.agents.find(a => a.id === agentId);

    if (!agentConfig) {
      return null;
    }

    const dailyUsage = this.getUsage(agentId, 'day');
    const weeklyUsage = this.getUsage(agentId, 'week');
    const monthlyUsage = this.getUsage(agentId, 'month');

    const current = {
      tokens: dailyUsage.tokens,
      cost: dailyUsage.cost,
      operations: dailyUsage.operations
    };

    const tokenLimits = (agentConfig as any).tokenLimits || {};
    const limits = {
      daily: tokenLimits.daily || 0,
      weekly: tokenLimits.weekly || 0,
      monthly: tokenLimits.monthly || 0,
      maxPrice: tokenLimits.maxPrice || 0
    };

    const percentages = {
      daily: limits.daily ? (dailyUsage.tokens / limits.daily) * 100 : 0,
      weekly: limits.weekly ? (weeklyUsage.tokens / limits.weekly) * 100 : 0,
      monthly: limits.monthly ? (monthlyUsage.tokens / limits.monthly) * 100 : 0,
      price: limits.maxPrice ? (monthlyUsage.cost / limits.maxPrice) * 100 : 0
    };

    const agentAlerts = Array.from(this.alerts.values()).filter(alert =>
      alert.agentId === agentId && !alert.resolved
    );

    // Determine status
    let status: TokenLimitStatus['status'] = 'healthy';
    if (percentages.daily > 95 || percentages.weekly > 95 || percentages.monthly > 95 || percentages.price > 95) {
      status = 'exceeded';
    } else if (percentages.daily > 80 || percentages.weekly > 80 || percentages.monthly > 80 || percentages.price > 80) {
      status = 'critical';
    } else if (percentages.daily > 60 || percentages.weekly > 60 || percentages.monthly > 60 || percentages.price > 60) {
      status = 'warning';
    }

    return {
      agentId,
      current,
      limits,
      percentages,
      alerts: agentAlerts,
      status
    };
  }

  /**
   * Generate accounting report
   */
  generateReport(
    period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
    customStart?: Date,
    customEnd?: Date
  ): TokenAccountingReport {
    const now = TimeUtils.now();
    let startTime: Date;
    let endTime: Date = now;

    switch (period) {
      case 'daily':
        startTime = TimeUtils.daysAgo(1);
        break;
      case 'weekly':
        startTime = TimeUtils.daysAgo(7);
        break;
      case 'monthly':
        startTime = TimeUtils.daysAgo(30);
        break;
      case 'custom':
        startTime = customStart || TimeUtils.daysAgo(1);
        endTime = customEnd || now;
        break;
    }

    const reportId = HashUtils.generateId();
    const allEntries = Array.from(this.entries.values()).filter(entry =>
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );

    const totalTokens = allEntries.reduce((sum, entry) => sum + entry.totalTokens, 0);
    const totalCost = allEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const totalOperations = allEntries.length;

    // Get unique agents
    const uniqueAgents = new Set(allEntries.map(entry => entry.agentId));

    // Breakdown by agent
    const byAgent: Record<string, AgentBreakdown> = {};
    allEntries.forEach(entry => {
      if (!byAgent[entry.agentId]) {
        byAgent[entry.agentId] = { tokens: 0, cost: 0, operations: 0, percentage: 0 };
      }
      const agentStats = byAgent[entry.agentId];
      if (agentStats) {
        agentStats.tokens += entry.totalTokens;
        agentStats.cost += entry.cost;
        agentStats.operations += 1;
      }
    });

    // Calculate percentages for agents
    Object.keys(byAgent).forEach(agentId => {
      const agentStats = byAgent[agentId];
      if (agentStats) {
        agentStats.percentage = (agentStats.tokens / totalTokens) * 100;
      }
    });

    // Breakdown by layer
    const byLayer: Record<string, LayerBreakdown> = {};
    allEntries.forEach(entry => {
      if (!byLayer[entry.layer]) {
        byLayer[entry.layer] = { tokens: 0, cost: 0, operations: 0, percentage: 0 };
      }
      const layerStats = byLayer[entry.layer];
      if (layerStats) {
        layerStats.tokens += entry.totalTokens;
        layerStats.cost += entry.cost;
        layerStats.operations += 1;
      }
    });

    Object.keys(byLayer).forEach(layer => {
      const layerStats = byLayer[layer];
      if (layerStats) {
        layerStats.percentage = (layerStats.tokens / totalTokens) * 100;
      }
    });

    // Breakdown by model
    const byModel: Record<string, ModelBreakdown> = {};
    allEntries.forEach(entry => {
      if (!byModel[entry.model]) {
        byModel[entry.model] = { tokens: 0, cost: 0, operations: 0, percentage: 0 };
      }
      const modelStats = byModel[entry.model];
      if (modelStats) {
        modelStats.tokens += entry.totalTokens;
        modelStats.cost += entry.cost;
        modelStats.operations += 1;
      }
    });

    Object.keys(byModel).forEach(model => {
      const modelStats = byModel[model];
      if (modelStats) {
        modelStats.percentage = (modelStats.tokens / totalTokens) * 100;
      }
    });

    // Time series data (hourly buckets)
    const byTime: Array<{ timestamp: Date; tokens: number; cost: number }> = [];
    const timeBuckets = new Map<string, { tokens: number; cost: number }>();

    allEntries.forEach(entry => {
      const hourKey = new Date(entry.timestamp).toISOString().substring(0, 13); // YYYY-MM-DDTHH
      if (!timeBuckets.has(hourKey)) {
        timeBuckets.set(hourKey, { tokens: 0, cost: 0 });
      }
      const bucket = timeBuckets.get(hourKey)!;
      bucket.tokens += entry.totalTokens;
      bucket.cost += entry.cost;
    });

    timeBuckets.forEach((data, hourKey) => {
      byTime.push({
        timestamp: new Date(hourKey + ':00:00Z'),
        tokens: data.tokens,
        cost: data.cost
      });
    });

    // Get active alerts
    const alerts = Array.from(this.alerts.values()).filter(alert =>
      alert.timestamp >= startTime && alert.timestamp <= endTime
    );

    return {
      reportId,
      generatedAt: now,
      period: {
        start: startTime,
        end: endTime,
        type: period
      },
      summary: {
        totalTokens,
        totalCost,
        totalOperations,
        averageCostPerOperation: totalOperations > 0 ? totalCost / totalOperations : 0,
        agentsTracked: uniqueAgents.size
      },
      breakdown: {
        byAgent,
        byLayer,
        byModel,
        byTime: byTime.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      },
      alerts
    };
  }

  /**
   * Check token limits and create alerts if needed
   */
  private checkTokenLimits(agentId: string, _entry: TokenAccountingEntry): void {
    const status = this.getLimitStatus(agentId);
    if (!status) return;

    const { percentages, limits } = status;

    // Check for approaching limits (warning level)
    if ((percentages.daily > 60 && percentages.daily <= 80) ||
        (percentages.weekly > 60 && percentages.weekly <= 80) ||
        (percentages.monthly > 60 && percentages.monthly <= 80) ||
        (percentages.price > 60 && percentages.price <= 80)) {

      this.createAlert(
        'approaching_limit',
        'medium',
        agentId,
        `Agent ${agentId} is approaching token limits (${Math.round(Math.max(percentages.daily, percentages.weekly, percentages.monthly, percentages.price))}% of limit)`,
        status.current,
        limits,
        percentages
      );
    }

    // Check for critical levels
    if ((percentages.daily > 80 && percentages.daily <= 95) ||
        (percentages.weekly > 80 && percentages.weekly <= 95) ||
        (percentages.monthly > 80 && percentages.monthly <= 95) ||
        (percentages.price > 80 && percentages.price <= 95)) {

      this.createAlert(
        'approaching_limit',
        'high',
        agentId,
        `Agent ${agentId} is critically close to token limits (${Math.round(Math.max(percentages.daily, percentages.weekly, percentages.monthly, percentages.price))}% of limit)`,
        status.current,
        limits,
        percentages
      );
    }

    // Check for exceeded limits
    if (percentages.daily > 95 || percentages.weekly > 95 || percentages.monthly > 95 || percentages.price > 95) {
      this.createAlert(
        'limit_exceeded',
        'critical',
        agentId,
        `Agent ${agentId} has exceeded token limits (${Math.round(Math.max(percentages.daily, percentages.weekly, percentages.monthly, percentages.price))}% of limit)`,
        status.current,
        limits,
        percentages
      );
    }

    // Check for unusual spikes (simple detection)
    const recentEntries = Array.from(this.entries.values()).filter(e =>
      e.agentId === agentId &&
      e.timestamp > TimeUtils.minutesAgo(60)
    );

    if (recentEntries.length > 10) { // More than 10 operations in the last hour
      const recentCost = recentEntries.reduce((sum, e) => sum + e.cost, 0);
      if (recentCost > 1.0) { // More than $1 in the last hour
        this.createAlert(
          'spike_detected',
          'medium',
          agentId,
          `Unusual token usage spike detected for agent ${agentId} ($${recentCost.toFixed(2)} in the last hour)`,
          status.current,
          limits,
          percentages
        );
      }
    }
  }

  /**
   * Create a token alert
   */
  private createAlert(
    type: TokenAlert['type'],
    severity: TokenAlert['severity'],
    agentId: string,
    message: string,
    current: TokenLimitStatus['current'],
    limits: TokenLimitStatus['limits'],
    percentages: TokenLimitStatus['percentages']
  ): void {
    const alertId = HashUtils.generateId();
    const alert: TokenAlert = {
      id: alertId,
      type,
      severity,
      agentId,
      message,
      current,
      threshold: {
        tokens: limits.daily || limits.weekly || limits.monthly,
        cost: limits.maxPrice,
        percentage: Math.max(percentages.daily, percentages.weekly, percentages.monthly, percentages.price)
      },
      timestamp: TimeUtils.now(),
      resolved: false
    };

    this.alerts.set(alertId, alert);

    logger.warn('TokenAccounting', `Token alert created: ${message}`, {
      alertId,
      agentId,
      type,
      severity
    });

    // Event publishing would be handled by the event system
    // eventBus.publishToChannel('scanner', {
    //   id: alertId,
    //   type: 'token_alert',
    //   timestamp: alert.timestamp,
    //   source: 'scanner',
    //   data: { alert },
    //   metadata: { agentId, type, severity }
    // });
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = TimeUtils.now();

    logger.info('TokenAccounting', `Alert resolved: ${alert.message}`, {
      alertId,
      resolvedAt: alert.resolvedAt
    });

    return true;
  }

  /**
   * Get all active (unresolved) alerts
   */
  getActiveAlerts(): TokenAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts for an agent
   */
  getAgentAlerts(agentId: string): TokenAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.agentId === agentId);
  }

  /**
   * Calculate cost based on model and token count
   */
  private calculateCost(model: string, tokens: number): number {
    // Simplified cost calculation - would use actual pricing in production
    const costPer1kTokens: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-4-turbo-preview': 0.01,
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus': 0.075,
      'claude-3-sonnet': 0.015,
      'claude-3-haiku': 0.00025,
      'gemini-pro': 0.00025,
      'gemini-pro-vision': 0.0025,
    };

    const costPerToken = (costPer1kTokens[model] || 0.01) / 1000;
    return tokens * costPerToken;
  }

  /**
   * Start periodic checks for token limits
   */
  private startPeriodicChecks(): void {
    setInterval(() => {
      this.checkAllAgents();
    }, 60000); // Check every minute
  }

  /**
   * Check all agents for limit violations
   */
  private checkAllAgents(): void {
    const config = configManager.get();

    for (const agent of config.agents) {
      const status = this.getLimitStatus(agent.id);
      if (status && (status.status === 'critical' || status.status === 'exceeded')) {
        // Event publishing would be handled by the event system
        // eventBus.publishToChannel('scanner', {
        //   id: HashUtils.generateId(),
        //   type: 'token_critical',
        //   timestamp: TimeUtils.now(),
        //   source: 'scanner',
        //   data: { agentId: agent.id, status },
        //   metadata: { urgency: 'high' }
        // });
      }
    }
  }

  /**
   * Persist accounting data to disk
   */
  private async persistData(): Promise<void> {
    try {
      const data = {
        entries: Array.from(this.entries.values()),
        alerts: Array.from(this.alerts.values()),
        lastSaved: TimeUtils.now().toISOString()
      };

      await FileUtils.ensureDir((await import('path')).dirname(this.persistPath));
      await FileUtils.writeTextFile(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('TokenAccounting', 'Failed to persist token accounting data', err, {
        error: err.message
      });
    }
  }

  /**
   * Load persisted accounting data
   */
  private async loadPersistedData(): Promise<void> {
    try {
      const exists = await FileUtils.pathExists(this.persistPath);
      if (!exists) return;

      const data = await ConfigUtils.loadConfigFile<PersistedAccountingData>(this.persistPath);
      if (!data) return;

      // Load entries (only recent ones to avoid memory issues)
      const cutoffDate = TimeUtils.daysAgo(30); // Keep only last 30 days
      if (data.entries) {
        data.entries.forEach((entry: TokenAccountingEntry) => {
          if (new Date(entry.timestamp) > cutoffDate) {
            this.entries.set(entry.id, entry);
          }
        });
      }

      // Load alerts (only unresolved recent ones)
      if (data.alerts) {
        data.alerts.forEach((alert: TokenAlert) => {
          if (!alert.resolved && new Date(alert.timestamp) > cutoffDate) {
            this.alerts.set(alert.id, alert);
          }
        });
      }

      logger.info('TokenAccounting', `Loaded ${this.entries.size} entries and ${this.alerts.size} alerts`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('TokenAccounting', 'Failed to load persisted data', err, {
        error: err.message
      });
    }
  }

  /**
   * Cleanup old data
   */
  async cleanup(): Promise<void> {
    const cutoffDate = TimeUtils.daysAgo(30);

    // Remove old entries
    Array.from(this.entries.entries()).forEach(([id, entry]) => {
      if (new Date(entry.timestamp) < cutoffDate) {
        this.entries.delete(id);
      }
    });

    // Remove old resolved alerts
    Array.from(this.alerts.entries()).forEach(([id, alert]) => {
      if (alert.resolved && alert.resolvedAt && new Date(alert.resolvedAt) < cutoffDate) {
        this.alerts.delete(id);
      }
    });

    await this.persistData();
    logger.info('TokenAccounting', 'Token accounting data cleaned up');
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    totalEntries: number;
    activeAlerts: number;
    totalTokens: number;
    totalCost: number;
    agentsTracked: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const entries = Array.from(this.entries.values());
    const activeAlerts = this.getActiveAlerts();
    const uniqueAgents = new Set(entries.map(e => e.agentId));

    return {
      totalEntries: entries.length,
      activeAlerts: activeAlerts.length,
      totalTokens: entries.reduce((sum, e) => sum + e.totalTokens, 0),
      totalCost: entries.reduce((sum, e) => sum + e.cost, 0),
      agentsTracked: uniqueAgents.size,
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.timestamp.getTime()))) : null,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.timestamp.getTime()))) : null,
    };
  }
}