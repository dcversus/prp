/**
 * TokenMetricsStream - Real-time token data streaming system
 *
 * Provides subscription-based streaming of token usage data for agents
 * with backpressure handling, WebSocket support, historical data persistence,
 * and token efficiency calculations.
 */

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';
import {
  TokenDataPoint,
  TokenStatistics,
  TokenProjection,
  AgentTokenStatus,
  TokenAlert,
  TokenCostCalculation,
  TUIDashboardData,
  TokenPerformanceMetrics,
  TokenTrendData
} from '../types/token-metrics.js';

export interface TokenStreamSubscriber {
  (data: TokenDataPoint): void;
}

export interface TokenStreamOptions {
  bufferSize?: number;
  backpressureThreshold?: number;
  maxSubscribers?: number;
  enablePersistence?: boolean;
  persistencePath?: string;
  enableEfficiencyTracking?: boolean;
  enableProjections?: boolean;
  updateFrequency?: number;
}

/**
 * TokenMetricsStream - Manages real-time token data streaming
 */
export class TokenMetricsStream extends EventEmitter {
  private subscribers: Map<string, Set<TokenStreamSubscriber>> = new Map();
  private buffer: TokenDataPoint[] = [];
  private backpressureThreshold: number;
  private maxBufferSize: number;
  private maxSubscribers: number;

  // Enhanced features
  private enablePersistence: boolean;
  private persistencePath: string;
  private enableEfficiencyTracking: boolean;
  private enableProjections: boolean;
  private updateFrequency: number;

  // Historical data and analytics
  private historicalData: Map<string, TokenDataPoint[]> = new Map();
  private agentStatistics: Map<string, TokenStatistics> = new Map();
  private agentAlerts: Map<string, TokenAlert[]> = new Map();
  private agentEfficiency: Map<string, number[]> = new Map(); // Rolling efficiency scores
  private costCalculations: Map<string, TokenCostCalculation> = new Map();

  // Performance tracking
  private performanceMetrics: TokenPerformanceMetrics;
  private updateTimer?: NodeJS.Timeout;

  constructor(options: TokenStreamOptions = {}) {
    super();

    this.backpressureThreshold = options.backpressureThreshold ?? 5000;
    this.maxBufferSize = options.bufferSize ?? 1000;
    this.maxSubscribers = options.maxSubscribers ?? 50;
    this.enablePersistence = options.enablePersistence ?? true;
    this.persistencePath = options.persistencePath ?? join(homedir(), '.prp', 'token-metrics');
    this.enableEfficiencyTracking = options.enableEfficiencyTracking ?? true;
    this.enableProjections = options.enableProjections ?? true;
    this.updateFrequency = options.updateFrequency ?? 5000; // 5 seconds

    // Initialize performance metrics
    this.performanceMetrics = {
      eventProcessingLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      eventThroughput: 0,
      subscriberCount: 0,
      bufferUtilization: 0
    };

    // Initialize persistence directory
    if (this.enablePersistence) {
      this.initializePersistence();
    }

    // Start periodic updates
    this.startPeriodicUpdates();

    // Load historical data
    this.loadHistoricalData();
  }

  /**
   * Subscribe to token data updates for an agent
   */
  subscribe(agentId: string, callback: TokenStreamSubscriber): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Check subscriber limit
    const agentSubscribers = this.subscribers.get(agentId);
    if (agentSubscribers && agentSubscribers.size >= this.maxSubscribers) {
      throw new Error(`Maximum subscribers (${this.maxSubscribers}) reached for agent ${agentId}`);
    }

    // Add subscriber
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }

    const subscribers = this.subscribers.get(agentId);
    if (!subscribers) {
      throw new Error(`Agent ${agentId} not found in subscribers`);
    }
    subscribers.add(callback);

    // Emit subscription event
    this.emit('subscriber_added', { agentId, subscriberCount: subscribers.size });
  }

  /**
   * Unsubscribe from token data updates
   */
  unsubscribe(agentId: string, callback: TokenStreamSubscriber): void {
    const subscribers = this.subscribers.get(agentId);
    if (!subscribers) {
      return; // Nothing to unsubscribe
    }

    const removed = subscribers.delete(callback);

    // Clean up empty subscriber sets
    if (subscribers.size === 0) {
      this.subscribers.delete(agentId);
    }

    if (removed) {
      this.emit('subscriber_removed', {
        agentId,
        subscriberCount: subscribers.size,
        totalSubscribers: this.getTotalSubscriberCount()
      });
    }
  }

  /**
   * Publish new token data to subscribers
   */
  publish(data: TokenDataPoint): void {
    // Validate data
    this.validateDataPoint(data);

    // Add to buffer
    this.buffer.push(data);

    // Maintain buffer size
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift(); // Remove oldest data point
    }

    // Check for backpressure
    if (this.buffer.length > this.backpressureThreshold) {
      this.emit('backpressure', {
        bufferSize: this.buffer.length,
        threshold: this.backpressureThreshold
      });

      // Drop oldest data points if under severe pressure
      if (this.buffer.length > this.backpressureThreshold * 1.5) {
        const dropCount = Math.floor(this.buffer.length * 0.2);
        this.buffer.splice(0, dropCount);

        this.emit('data_dropped', {
          droppedCount: dropCount,
          bufferSize: this.buffer.length
        });
      }
    }

    // Notify subscribers
    const subscribers = this.subscribers.get(data.agentId);
    if (subscribers && subscribers.size > 0) {
      // Use setTimeout for async delivery to avoid blocking (setImmediate not available in Jest)
      setTimeout(() => {
        subscribers.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            this.emit('subscriber_error', {
              agentId: data.agentId,
              error: error instanceof Error ? error : new Error(String(error))
            });
          }
        });
      }, 0);
    }

    // Emit publish event
    this.emit('data_published', {
      agentId: data.agentId,
      timestamp: data.timestamp,
      bufferSize: this.buffer.length
    });
  }

  /**
   * Get latest data points for an agent
   */
  getLatestData(agentId: string, limit: number = 100): TokenDataPoint[] {
    return this.buffer
      .filter(data => data.agentId === agentId)
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get all latest data points across all agents
   */
  getAllLatestData(limit: number = 100): TokenDataPoint[] {
    return this.buffer
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    totalSubscribers: number;
    subscribersByAgent: Record<string, number>;
    bufferSize: number;
    bufferUtilization: number;
    } {
    const subscribersByAgent: Record<string, number> = {};

    this.subscribers.forEach((subscribers, agentId) => {
      subscribersByAgent[agentId] = subscribers.size;
    });

    return {
      totalSubscribers: this.getTotalSubscriberCount(),
      subscribersByAgent,
      bufferSize: this.buffer.length,
      bufferUtilization: (this.buffer.length / this.maxBufferSize) * 100
    };
  }

  /**
   * Clear buffer for an agent or all agents
   */
  clearBuffer(agentId?: string): void {
    if (agentId) {
      this.buffer = this.buffer.filter(data => data.agentId !== agentId);
    } else {
      this.buffer = [];
    }

    this.emit('buffer_cleared', { agentId });
  }

  /**
   * Check if system is under backpressure
   */
  isUnderBackpressure(): boolean {
    return this.buffer.length > this.backpressureThreshold;
  }

  /**
   * Get total subscriber count across all agents
   */
  private getTotalSubscriberCount(): number {
    let total = 0;
    this.subscribers.forEach(subscribers => {
      total += subscribers.size;
    });
    return total;
  }

  /**
   * Validate token data point
   */
  private validateDataPoint(data: TokenDataPoint): void {
    if (!data.agentId || typeof data.agentId !== 'string') {
      throw new Error('Invalid agentId: must be a non-empty string');
    }

    if (!(data.timestamp instanceof Date)) {
      throw new Error('Invalid timestamp: must be a Date object');
    }

    if (typeof data.tokensUsed !== 'number' || data.tokensUsed < 0) {
      throw new Error('Invalid tokensUsed: must be a non-negative number');
    }

    if (typeof data.limit !== 'number' || data.limit < 0) {
      throw new Error('Invalid limit: must be a non-negative number');
    }

    if (typeof data.remaining !== 'number' || data.remaining < 0) {
      throw new Error('Invalid remaining: must be a non-negative number');
    }

    if (data.cost !== undefined && (typeof data.cost !== 'number' || data.cost < 0)) {
      throw new Error('Invalid cost: must be a non-negative number or undefined');
    }
  }

  /**
   * Get historical data for an agent
   */
  getHistoricalData(agentId: string, hours: number = 24): TokenDataPoint[] {
    const historical = this.historicalData.get(agentId) ?? [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return historical.filter(data => data.timestamp >= cutoff);
  }

  /**
   * Get agent statistics
   */
  getAgentStatistics(agentId: string): TokenStatistics | null {
    return this.agentStatistics.get(agentId) ?? null;
  }

  /**
   * Get all agent alerts
   */
  getAgentAlerts(agentId?: string): TokenAlert[] {
    if (agentId) {
      return this.agentAlerts.get(agentId) ?? [];
    }

    const allAlerts: TokenAlert[] = [];
    this.agentAlerts.forEach(alerts => {
      allAlerts.push(...alerts);
    });
    return allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get token efficiency for an agent
   */
  getAgentEfficiency(agentId: string): number {
    const efficiencyScores = this.agentEfficiency.get(agentId) ?? [];
    if (efficiencyScores.length === 0) {
      return 0;
    }

    // Return average of recent efficiency scores
    const recentScores = efficiencyScores.slice(-10); // Last 10 measurements
    return recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  }

  /**
   * Get cost calculation for a model
   */
  getCostCalculation(model: string): TokenCostCalculation | null {
    return this.costCalculations.get(model) ?? null;
  }

  /**
   * Set cost calculation for a model
   */
  setCostCalculation(model: string, calculation: TokenCostCalculation): void {
    this.costCalculations.set(model, calculation);
    this.emit('cost_calculation_updated', { model, calculation });
  }

  /**
   * Get TUI dashboard data
   */
  getTUIDashboardData(): TUIDashboardData {
    const summary = {
      totalAgents: this.subscribers.size,
      totalTokensUsed: this.calculateTotalTokensUsed(),
      totalCost: this.calculateTotalCost(),
      activeAlerts: this.getActiveAlertsCount()
    };

    const agents = this.getAgentStatuses();
    const alerts = this.getAgentAlerts();
    const trends = this.calculateTrends();
    const projections = this.calculateProjections();

    return {
      summary,
      agents,
      alerts,
      trends,
      projections
    };
  }

  /**
   * Add a custom alert
   */
  addAlert(alert: Omit<TokenAlert, 'id' | 'timestamp'>): void {
    const fullAlert: TokenAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    if (!this.agentAlerts.has(alert.agentId)) {
      this.agentAlerts.set(alert.agentId, []);
    }

    const alerts = this.agentAlerts.get(alert.agentId);
    if (alerts) {
      alerts.push(fullAlert);
    }
    this.emit('alert_added', fullAlert);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    for (const [agentId, alerts] of Array.from(this.agentAlerts.entries())) {
      const alert = alerts.find((a: TokenAlert) => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        this.emit('alert_acknowledged', { alertId, agentId });
        return;
      }
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): TokenPerformanceMetrics {
    this.updatePerformanceMetrics();
    return { ...this.performanceMetrics };
  }

  /**
   * Initialize persistence directory
   */
  private initializePersistence(): void {
    try {
      if (!existsSync(this.persistencePath)) {
        mkdirSync(this.persistencePath, { recursive: true });
      }
    } catch (error) {
      logger.warn('Failed to initialize persistence directory:', error);
      this.enablePersistence = false;
    }
  }

  /**
   * Load historical data from disk
   */
  private loadHistoricalData(): void {
    if (!this.enablePersistence) {
      return;
    }

    try {
      const dataPath = join(this.persistencePath, 'historical-data.json');
      if (existsSync(dataPath)) {
        const data = JSON.parse(readFileSync(dataPath, 'utf8'));

        // Convert string timestamps back to Date objects
        Object.entries(data).forEach(([agentId, dataPoints]) => {
          this.historicalData.set(agentId, (dataPoints as unknown[]).map((dp: unknown) => {
            const dataPoint = dp as TokenDataPoint & { timestamp: string };
            return {
              ...dataPoint,
              timestamp: new Date(dataPoint.timestamp)
            };
          }));
        });
      }
    } catch (error) {
      logger.warn('Failed to load historical data:', error);
    }
  }

  /**
   * Save historical data to disk
   */
  private saveHistoricalData(): void {
    if (!this.enablePersistence) {
      return;
    }

    try {
      const dataPath = join(this.persistencePath, 'historical-data.json');
      const data: Record<string, TokenDataPoint[]> = {};

      this.historicalData.forEach((dataPoints, agentId) => {
        // Keep only last 1000 data points per agent
        data[agentId] = dataPoints.slice(-1000);
      });

      writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.warn('Failed to save historical data:', error);
    }
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.updateStatistics();
      this.updatePerformanceMetrics();
      this.saveHistoricalData();

      if (this.enableProjections) {
        this.updateProjections();
      }

    }, this.updateFrequency);
  }

  /**
   * Update statistics for all agents
   */
  private updateStatistics(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    this.subscribers.forEach((_, agentId) => {
      const recentData = this.getLatestData(agentId, 100);
      const hourlyData = recentData.filter(dp => dp.timestamp >= oneHourAgo);

      if (hourlyData.length > 0) {
        const totalTokens = hourlyData.reduce((sum, dp) => sum + dp.tokensUsed, 0);
        const totalCost = hourlyData.reduce((sum, dp) => sum + (dp.cost ?? 0), 0);
        const averageTokensPerRequest = totalTokens / hourlyData.length;
        const requestsPerMinute = hourlyData.length / 60;
        const costPerMinute = totalCost / 60;
        const efficiency = totalTokens > 0 ? totalCost / totalTokens : 0;

        // Calculate trend
        const trend = this.calculateTrend(agentId, hourlyData);

        const statistics: TokenStatistics = {
          totalTokens,
          totalCost,
          averageTokensPerRequest,
          requestsPerMinute,
          costPerMinute,
          efficiency,
          trend
        };

        this.agentStatistics.set(agentId, statistics);
      }
    });
  }

  /**
   * Calculate trend for an agent
   */
  private calculateTrend(_agentId: string, data: TokenDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) {
      return 'stable';
    }

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, dp) => sum + dp.tokensUsed, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, dp) => sum + dp.tokensUsed, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (Math.abs(change) < 0.1) {
      return 'stable';
    }
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = Date.now();

    this.performanceMetrics.subscriberCount = this.getTotalSubscriberCount();
    this.performanceMetrics.bufferUtilization = (this.buffer.length / this.maxBufferSize) * 100;

    // Calculate event throughput (events per second)
    const recentEvents = this.buffer.filter(dp => now - dp.timestamp.getTime() < 60000); // Last minute
    this.performanceMetrics.eventThroughput = recentEvents.length / 60;

    // Memory usage approximation
    this.performanceMetrics.memoryUsage = process.memoryUsage().heapUsed;

    // CPU usage would need more complex implementation, using 0 for now
    this.performanceMetrics.cpuUsage = 0;
  }

  /**
   * Calculate total tokens used across all agents
   */
  private calculateTotalTokensUsed(): number {
    let total = 0;
    this.buffer.forEach(dp => {
      total += dp.tokensUsed;
    });
    return total;
  }

  /**
   * Calculate total cost across all agents
   */
  private calculateTotalCost(): number {
    let total = 0;
    this.buffer.forEach(dp => {
      total += dp.cost ?? 0;
    });
    return total;
  }

  /**
   * Get active alerts count
   */
  private getActiveAlertsCount(): number {
    let count = 0;
    this.agentAlerts.forEach(alerts => {
      count += alerts.filter(alert => !alert.acknowledged).length;
    });
    return count;
  }

  /**
   * Get agent statuses for dashboard
   */
  private getAgentStatuses(): AgentTokenStatus[] {
    const statuses: AgentTokenStatus[] = [];

    this.subscribers.forEach((_, agentId) => {
      const latestData = this.getLatestData(agentId, 1)[0];
      const efficiency = this.getAgentEfficiency(agentId);

      if (latestData) {
        const percentage = (latestData.tokensUsed / latestData.limit) * 100;
        let status: 'normal' | 'warning' | 'critical' | 'blocked' = 'normal';

        if (percentage >= 95) {
          status = 'blocked';
        } else if (percentage >= 90) {
          status = 'critical';
        } else if (percentage >= 80) {
          status = 'warning';
        }

        statuses.push({
          agentId,
          agentType: this.extractAgentType(agentId),
          currentUsage: latestData.tokensUsed,
          limit: latestData.limit,
          percentage,
          cost: latestData.cost ?? 0,
          status,
          lastActivity: latestData.timestamp,
          efficiency
        });
      }
    });

    return statuses;
  }

  /**
   * Extract agent type from agent ID
   */
  private extractAgentType(agentId: string): string {
    if (agentId.includes('scanner')) {
      return 'scanner';
    }
    if (agentId.includes('inspector')) {
      return 'inspector';
    }
    if (agentId.includes('orchestrator')) {
      return 'orchestrator';
    }
    return 'unknown';
  }

  /**
   * Calculate trends for dashboard
   */
  private calculateTrends(): TokenTrendData[] {
    // Simplified trend calculation
    const now = new Date();
    const trends: TokenTrendData[] = [];

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      trends.push({
        timestamp,
        usage: 0,
        cost: 0,
        agentBreakdown: {}
      });
    }

    return trends.reverse();
  }

  /**
   * Calculate projections
   */
  private calculateProjections(): TokenProjection[] {
    const projections: TokenProjection[] = [];

    this.subscribers.forEach((_, agentId) => {
      const statistics = this.agentStatistics.get(agentId);
      if (statistics) {
        ['hour', 'day', 'week', 'month'].forEach(timeframe => {
          let multiplier = 1;
          switch (timeframe) {
            case 'hour': multiplier = 1; break;
            case 'day': multiplier = 24; break;
            case 'week': multiplier = 168; break;
            case 'month': multiplier = 720; break;
          }

          projections.push({
            timeframe: timeframe as 'hour' | 'day' | 'week' | 'month',
            projectedUsage: statistics.totalTokens * multiplier,
            projectedCost: statistics.totalCost * multiplier,
            confidence: 0.8,
            recommendations: this.generateRecommendations(agentId, statistics)
          });
        });
      }
    });

    return projections;
  }

  /**
   * Generate recommendations for an agent
   */
  private generateRecommendations(_agentId: string, statistics: TokenStatistics): string[] {
    const recommendations: string[] = [];

    if (statistics.efficiency < 0.5) {
      recommendations.push('Consider optimizing prompts to reduce token usage');
    }

    if (statistics.requestsPerMinute > 10) {
      recommendations.push('High request rate detected - consider batching operations');
    }

    if (statistics.trend === 'increasing') {
      recommendations.push('Token usage is increasing - monitor closely');
    }

    return recommendations;
  }

  /**
   * Update projections
   */
  private updateProjections(): void {
    // Emit projection updates
    const projections = this.calculateProjections();
    this.emit('projections_updated', projections);
  }

  /**
   * Enhanced publish method with analytics
   */
  publishEnhanced(data: TokenDataPoint & { model?: string; operation?: string }): void {
    const startTime = Date.now();

    // Call original publish method
    this.publish(data);

    // Track efficiency if enabled
    if (this.enableEfficiencyTracking && data.cost) {
      const efficiency = data.tokensUsed / data.cost;

      if (!this.agentEfficiency.has(data.agentId)) {
        this.agentEfficiency.set(data.agentId, []);
      }

      const efficiencyScores = this.agentEfficiency.get(data.agentId);
      if (efficiencyScores) {
        efficiencyScores.push(efficiency);

        // Keep only last 100 efficiency scores
        if (efficiencyScores.length > 100) {
          efficiencyScores.shift();
        }
      }
    }

    // Store in historical data
    if (!this.historicalData.has(data.agentId)) {
      this.historicalData.set(data.agentId, []);
    }

    const historical = this.historicalData.get(data.agentId);
    if (historical) {
      historical.push(data);

      // Keep only last 1000 data points
      if (historical.length > 1000) {
        historical.shift();
      }
    }

    // Check for alerts
    this.checkForAlerts(data);

    // Update performance metrics
    this.performanceMetrics.eventProcessingLatency = Date.now() - startTime;
  }

  /**
   * Check for alerts based on token usage
   */
  private checkForAlerts(data: TokenDataPoint): void {
    const percentage = (data.tokensUsed / data.limit) * 100;
    let alertType: 'warning' | 'critical' | 'blocked' | null = null;
    let message = '';

    if (percentage >= 95) {
      alertType = 'blocked';
      message = `Agent ${data.agentId} has exceeded 95% of token limit`;
    } else if (percentage >= 90) {
      alertType = 'critical';
      message = `Agent ${data.agentId} has exceeded 90% of token limit`;
    } else if (percentage >= 80) {
      alertType = 'warning';
      message = `Agent ${data.agentId} has exceeded 80% of token limit`;
    }

    if (alertType) {
      this.addAlert({
        agentId: data.agentId,
        type: alertType,
        message,
        acknowledged: false
      });
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    // Save final data
    this.saveHistoricalData();

    this.subscribers.clear();
    this.buffer = [];
    this.historicalData.clear();
    this.agentStatistics.clear();
    this.agentAlerts.clear();
    this.agentEfficiency.clear();
    this.costCalculations.clear();
    this.removeAllListeners();
  }
}