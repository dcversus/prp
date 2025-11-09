import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { EventEmitter } from 'events';
import {
  TokenUsageEvent,
  TokenEventCallback,
  TokenEventSubscription,
  TokenCostCalculation,
  TokenStatistics,
  TokenProjection,
  TUIDashboardData,
  AgentTokenStatus,
  TokenAlert,
  TokenMonitoringConfig,
  TokenPerformanceMetrics
} from '../types/token-metrics';

/**
 * Token Accounting System - tracks token usage across agents and PRPs
 */
export interface TokenUsage {
  agentId?: string;
  agentType?: string;
  totalTokens: number;
  requestCount: number;
  lastReset: Date;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  lastActivity: Date;
  averageRequestSize: number;
}

export interface TokenLimit {
  agentId: string;
  agentType: string;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  currentUsage: {
    daily: number;
    weekly: number;
    monthly: number;
    lastDailyReset: Date;
    lastWeeklyReset: Date;
    lastMonthlyReset: Date;
  };
}

export interface TokenEvent {
  agentId: string;
  agentType: string;
  tokens: number;
  operation: 'request' | 'response' | 'tool_call';
  timestamp: Date;
  prpId?: string;
  signal?: string;
  model?: string;
}

export interface ApproachingLimit {
  agentId: string;
  agentType: string;
  limit: number;
  current: number;
  percentUsed: number;
  period: 'daily' | 'weekly' | 'monthly';
  timeToReset: Date;
}

// Interfaces for raw JSON data (dates as strings)
interface RawTokenUsage {
  agentId?: string;
  agentType?: string;
  totalTokens: number;
  requestCount: number;
  lastReset: string; // ISO string
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  lastActivity: string; // ISO string
  averageRequestSize: number;
}

interface RawCurrentUsage {
  daily: number;
  weekly: number;
  monthly: number;
  lastDailyReset: string; // ISO string
  lastWeeklyReset: string; // ISO string
  lastMonthlyReset: string; // ISO string
}

interface RawTokenLimit {
  agentId: string;
  agentType: string;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  currentUsage: RawCurrentUsage;
}

interface RawTokenEvent {
  agentId: string;
  agentType: string;
  tokens: number;
  operation: 'request' | 'response' | 'tool_call';
  timestamp: string; // ISO string
  prpId?: string;
  signal?: string;
  model?: string;
}

/**
 * Enhanced Token Accountant class with real-time monitoring and event streaming
 */
export class TokenAccountant extends EventEmitter {
  private usage: Map<string, TokenUsage> = new Map();
  private limits: Map<string, TokenLimit> = new Map();
  private events: TokenEvent[] = [];
  private storagePath: string;

  // Enhanced monitoring features
  private eventSubscriptions: Map<string, TokenEventSubscription> = new Map();
  private costCalculations: Map<string, TokenCostCalculation> = new Map();
  private alerts: TokenAlert[] = [];
  private performanceMetrics: TokenPerformanceMetrics;
  private monitoringConfig: TokenMonitoringConfig;

  // Performance optimization
  private eventBuffer: TokenUsageEvent[] = [];
  private lastFlushTime: number = Date.now();
  private flushInterval: number = 200; // 200ms
  private maxBufferSize: number = 1000;

  constructor(storageDir?: string, config?: Partial<TokenMonitoringConfig>) {
    super();

    this.storagePath = storageDir || join(homedir(), '.prp', 'token-usage.json');
    this.monitoringConfig = this.createDefaultConfig(config);
    this.performanceMetrics = this.initializePerformanceMetrics();

    this.loadData();
    this.cleanupOldEvents();
    this.initializeCostCalculations();
    this.startEventProcessing();
    this.setupPerformanceMonitoring();
  }

  /**
   * Record token usage for an agent with enhanced real-time monitoring
   */
  recordUsage(event: Omit<TokenEvent, 'timestamp'>): void {
    const tokenEvent: TokenEvent = {
      ...event,
      timestamp: new Date()
    };

    // Store event
    this.events.push(tokenEvent);
    this.trimEvents();

    // Update usage statistics
    this.updateUsage(tokenEvent);

    // Check for limit warnings
    this.checkLimitWarnings(tokenEvent);

    // Enhanced real-time monitoring
    this.processTokenUsageEvent(tokenEvent);

    // Persist data
    this.saveData();
  }

  /**
   * Enhanced real-time token usage event processing
   */
  private processTokenUsageEvent(event: TokenEvent): void {
    // Create enhanced token usage event
    const enhancedEvent: TokenUsageEvent = {
      agentId: event.agentId,
      agentType: event.agentType || 'unknown',
      tokensUsed: event.tokens,
      limit: this.getCurrentLimit(event.agentId),
      remaining: this.getRemainingTokens(event.agentId),
      timestamp: event.timestamp,
      operation: event.operation,
      model: event.model,
      prpId: event.prpId,
      signal: event.signal,
      cost: this.calculateCost(event)
    };

    // Buffer event for processing
    this.bufferEvent(enhancedEvent);

    // Update performance metrics
    this.updatePerformanceMetrics();

    // Check limit enforcement
    this.enforceTokenLimits(enhancedEvent);
  }

  /**
   * Subscribe to real-time token usage events
   */
  onTokenUsage(agentId: string, callback: TokenEventCallback): string {
    const subscriptionId = this.generateSubscriptionId();
    const subscription: TokenEventSubscription = {
      id: subscriptionId,
      agentId,
      callback,
      createdAt: new Date()
    };

    this.eventSubscriptions.set(subscriptionId, subscription);

    // Emit subscription event
    this.emit('token_subscribed', { subscriptionId, agentId });

    return subscriptionId;
  }

  /**
   * Unsubscribe from token usage events
   */
  offTokenUsage(subscriptionId: string): void {
    const subscription = this.eventSubscriptions.get(subscriptionId);
    if (subscription) {
      this.eventSubscriptions.delete(subscriptionId);
      this.emit('token_unsubscribed', { subscriptionId, agentId: subscription.agentId });
    }
  }

  /**
   * Get TUI dashboard data
   */
  getTUIDashboardData(): TUIDashboardData {
    const agents: AgentTokenStatus[] = [];
    let totalTokensUsed = 0;
    let totalCost = 0;

    // Process each agent's status
    for (const [agentId, usage] of this.usage.entries()) {
      const limit = this.limits.get(agentId);
      const currentUsage = usage.totalTokens;
      const limitAmount = limit?.dailyLimit || 0;
      const percentage = limitAmount > 0 ? (currentUsage / limitAmount) * 100 : 0;
      const cost = this.calculateAgentTotalCost(agentId);

      agents.push({
        agentId,
        agentType: limit?.agentType || usage.agentType || 'unknown',
        currentUsage,
        limit: limitAmount,
        percentage,
        cost,
        status: this.getAgentStatus(percentage),
        lastActivity: usage.lastActivity,
        efficiency: usage.averageRequestSize || 0
      });

      totalTokensUsed += currentUsage;
      totalCost += cost;
    }

    return {
      summary: {
        totalAgents: agents.length,
        totalTokensUsed,
        totalCost,
        activeAlerts: this.alerts.filter(alert => !alert.acknowledged).length
      },
      agents,
      alerts: this.alerts,
      trends: this.getTrendData(),
      projections: this.getProjections()
    };
  }

  /**
   * Get token statistics for an agent
   */
  getTokenStatistics(agentId: string): TokenStatistics {
    const usage = this.usage.get(agentId);
    if (!usage) {
      return this.createEmptyStatistics();
    }

    const recentEvents = this.getRecentEvents(agentId, 60 * 60 * 1000); // Last hour
    const requestsPerMinute = recentEvents.length / 60;
    const costPerMinute = this.calculateAgentCost(agentId, recentEvents);

    return {
      totalTokens: usage.totalTokens,
      totalCost: this.calculateAgentTotalCost(agentId),
      averageTokensPerRequest: usage.averageRequestSize,
      requestsPerMinute,
      costPerMinute,
      efficiency: usage.totalTokens / Math.max(this.calculateAgentTotalCost(agentId), 1),
      trend: this.calculateTrend(agentId)
    };
  }

  /**
   * Get cost projection for an agent
   */
  getCostProjection(agentId: string, timeframe: 'hour' | 'day' | 'week' | 'month'): TokenProjection {
    const usage = this.usage.get(agentId);
    if (!usage) {
      return this.createEmptyProjection(timeframe);
    }

    const recentEvents = this.getRecentEvents(agentId, this.getTimeframeMs(timeframe));
    const currentRate = this.calculateUsageRate(recentEvents, this.getTimeframeMs(timeframe));

    const projectedUsage = currentRate * this.getTimeframeMs(timeframe);
    const projectedCost = this.calculateProjectedCost(agentId, projectedUsage);

    return {
      timeframe,
      projectedUsage,
      projectedCost,
      confidence: this.calculateConfidence(recentEvents.length),
      recommendations: this.generateRecommendations(agentId, projectedUsage, projectedCost)
    };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): TokenPerformanceMetrics {
    // Update subscriber count in real-time
    this.performanceMetrics.subscriberCount = this.eventSubscriptions.size;
    return { ...this.performanceMetrics };
  }

  /**
   * Update monitoring configuration
   */
  updateMonitoringConfig(config: Partial<TokenMonitoringConfig>): void {
    this.monitoringConfig = { ...this.monitoringConfig, ...config };
    this.emit('config_updated', { config: this.monitoringConfig });
  }

  /**
   * Get usage statistics for all agents
   */
  getUsageStats(): Map<string, TokenUsage> {
    return new Map(this.usage);
  }

  /**
   * Get usage for a specific agent
   */
  getAgentUsage(agentId: string): TokenUsage | null {
    return this.usage.get(agentId) || null;
  }

  /**
   * Set token limits for an agent
   */
  setLimits(agentId: string, agentType: string, limits: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  }): void {
    const existingLimit = this.limits.get(agentId);
    const now = new Date();

    const limit: TokenLimit = {
      agentId,
      agentType,
      dailyLimit: limits.daily || existingLimit?.dailyLimit || 100000,
      weeklyLimit: limits.weekly || existingLimit?.weeklyLimit || 500000,
      monthlyLimit: limits.monthly || existingLimit?.monthlyLimit || 2000000,
      currentUsage: existingLimit?.currentUsage || {
        daily: 0,
        weekly: 0,
        monthly: 0,
        lastDailyReset: this.getDailyReset(now),
        lastWeeklyReset: this.getWeeklyReset(now),
        lastMonthlyReset: this.getMonthlyReset(now)
      }
    };

    this.limits.set(agentId, limit);
    this.saveData();
  }

  /**
   * Check if agent is approaching token limits
   */
  checkApproachingLimits(threshold: number = 80): ApproachingLimit[] {
    const warnings: ApproachingLimit[] = [];
    const now = new Date();

    for (const [agentId, limit] of Array.from(this.limits.entries())) {
      this.resetCountersIfNeeded(limit, now);

      // Check daily limit
      if (limit.dailyLimit > 0) {
        const dailyPercent = (limit.currentUsage.daily / limit.dailyLimit) * 100;
        if (dailyPercent >= threshold) {
          warnings.push({
            agentId,
            agentType: limit.agentType,
            limit: limit.dailyLimit,
            current: limit.currentUsage.daily,
            percentUsed: dailyPercent,
            period: 'daily',
            timeToReset: limit.currentUsage.lastDailyReset
          });
        }
      }

      // Check weekly limit
      if (limit.weeklyLimit > 0) {
        const weeklyPercent = (limit.currentUsage.weekly / limit.weeklyLimit) * 100;
        if (weeklyPercent >= threshold) {
          warnings.push({
            agentId,
            agentType: limit.agentType,
            limit: limit.weeklyLimit,
            current: limit.currentUsage.weekly,
            percentUsed: weeklyPercent,
            period: 'weekly',
            timeToReset: limit.currentUsage.lastWeeklyReset
          });
        }
      }

      // Check monthly limit
      if (limit.monthlyLimit > 0) {
        const monthlyPercent = (limit.currentUsage.monthly / limit.monthlyLimit) * 100;
        if (monthlyPercent >= threshold) {
          warnings.push({
            agentId,
            agentType: limit.agentType,
            limit: limit.monthlyLimit,
            current: limit.currentUsage.monthly,
            percentUsed: monthlyPercent,
            period: 'monthly',
            timeToReset: limit.currentUsage.lastMonthlyReset
          });
        }
      }
    }

    return warnings.sort((a, b) => b.percentUsed - a.percentUsed);
  }

  /**
   * Check if agent has exceeded limits
   */
  hasExceededLimits(agentId: string): { exceeded: boolean; periods: string[] } {
    const limit = this.limits.get(agentId);
    if (!limit) return { exceeded: false, periods: [] };

    this.resetCountersIfNeeded(limit, new Date());

    const exceededPeriods: string[] = [];

    if (limit.dailyLimit > 0 && limit.currentUsage.daily > limit.dailyLimit) {
      exceededPeriods.push('daily');
    }
    if (limit.weeklyLimit > 0 && limit.currentUsage.weekly > limit.weeklyLimit) {
      exceededPeriods.push('weekly');
    }
    if (limit.monthlyLimit > 0 && limit.currentUsage.monthly > limit.monthlyLimit) {
      exceededPeriods.push('monthly');
    }

    return {
      exceeded: exceededPeriods.length > 0,
      periods: exceededPeriods
    };
  }

  /**
   * Get default usage structure
   */
  getDefaultUsage(): TokenUsage {
    return {
      totalTokens: 0,
      requestCount: 0,
      lastReset: new Date(),
      lastActivity: new Date(),
      averageRequestSize: 0
    };
  }

  /**
   * Get usage statistics for reporting
   */
  getUsageReport(): {
    totalTokens: number;
    totalRequests: number;
    agentStats: Array<{
      agentId: string;
      agentType: string;
      totalTokens: number;
      requestCount: number;
      averageRequestSize: number;
      dailyUsage: number;
      dailyLimit: number;
      weeklyUsage: number;
      weeklyLimit: number;
      monthlyUsage: number;
      monthlyLimit: number;
    }>;
    approachingLimits: ApproachingLimit[];
  } {
    const totalTokens = Array.from(this.usage.values())
      .reduce((sum, usage) => sum + usage.totalTokens, 0);

    const totalRequests = Array.from(this.usage.values())
      .reduce((sum, usage) => sum + usage.requestCount, 0);

    const agentStats = Array.from(this.usage.entries()).map(([agentId, usage]) => {
      const limit = this.limits.get(agentId);
      return {
        agentId,
        agentType: limit?.agentType || 'unknown',
        totalTokens: usage.totalTokens,
        requestCount: usage.requestCount,
        averageRequestSize: usage.averageRequestSize,
        dailyUsage: limit?.currentUsage.daily || 0,
        dailyLimit: limit?.dailyLimit || 0,
        weeklyUsage: limit?.currentUsage.weekly || 0,
        weeklyLimit: limit?.weeklyLimit || 0,
        monthlyUsage: limit?.currentUsage.monthly || 0,
        monthlyLimit: limit?.monthlyLimit || 0
      };
    });

    return {
      totalTokens,
      totalRequests,
      agentStats,
      approachingLimits: this.checkApproachingLimits()
    };
  }

  /**
   * Update usage statistics based on event
   */
  private updateUsage(event: TokenEvent): void {
    const existing = this.usage.get(event.agentId) || this.getDefaultUsage();
    const limit = this.limits.get(event.agentId);

    // Update usage
    existing.totalTokens += event.tokens;
    existing.requestCount += 1;
    existing.lastActivity = event.timestamp;
    existing.agentId = event.agentId;
    existing.agentType = event.agentType;

    // Update average request size
    existing.averageRequestSize = existing.totalTokens / existing.requestCount;

    // Update limit counters
    if (limit) {
      this.resetCountersIfNeeded(limit, event.timestamp);
      limit.currentUsage.daily += event.tokens;
      limit.currentUsage.weekly += event.tokens;
      limit.currentUsage.monthly += event.tokens;
    }

    this.usage.set(event.agentId, existing);
  }

  /**
   * Check for limit warnings and emit events if needed
   */
  private checkLimitWarnings(event: TokenEvent): void {
    const limit = this.limits.get(event.agentId);
    if (!limit) return;

    this.resetCountersIfNeeded(limit, event.timestamp);

    const warnings = [
      { period: 'daily', current: limit.currentUsage.daily, limit: limit.dailyLimit },
      { period: 'weekly', current: limit.currentUsage.weekly, limit: limit.weeklyLimit },
      { period: 'monthly', current: limit.currentUsage.monthly, limit: limit.monthlyLimit }
    ];

    for (const warning of warnings) {
      if (warning.limit > 0) {
        const percentUsed = (warning.current / warning.limit) * 100;
        if (percentUsed >= 90) {
          // Emit warning event (would be handled by scanner)
          console.warn(`⚠️  Agent ${event.agentId} has used ${percentUsed.toFixed(1)}% of ${warning.period} limit`);
        }
      }
    }
  }

  /**
   * Reset counters if needed
   */
  private resetCountersIfNeeded(limit: TokenLimit, now: Date): void {
    // Reset daily counter
    if (now >= limit.currentUsage.lastDailyReset) {
      limit.currentUsage.daily = 0;
      limit.currentUsage.lastDailyReset = this.getDailyReset(now);
    }

    // Reset weekly counter
    if (now >= limit.currentUsage.lastWeeklyReset) {
      limit.currentUsage.weekly = 0;
      limit.currentUsage.lastWeeklyReset = this.getWeeklyReset(now);
    }

    // Reset monthly counter
    if (now >= limit.currentUsage.lastMonthlyReset) {
      limit.currentUsage.monthly = 0;
      limit.currentUsage.lastMonthlyReset = this.getMonthlyReset(now);
    }
  }

  /**
   * Get next daily reset time
   */
  private getDailyReset(now: Date): Date {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get next weekly reset time (Monday 00:00)
   */
  private getWeeklyReset(now: Date): Date {
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    // If today is Monday and it's past midnight, go to next Monday
    if (monday <= now) {
      monday.setDate(monday.getDate() + 7);
    }

    return monday;
  }

  /**
   * Get next monthly reset time (1st of next month 00:00)
   */
  private getMonthlyReset(now: Date): Date {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }

  /**
   * Trim old events to prevent memory issues
   */
  private trimEvents(): void {
    const maxEvents = 10000; // Keep last 10k events
    if (this.events.length > maxEvents) {
      this.events = this.events.slice(-maxEvents);
    }
  }

  /**
   * Clean up old events on startup
   */
  private cleanupOldEvents(): void {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    this.events = this.events.filter(event => event.timestamp >= oneWeekAgo);
  }

  /**
   * Load data from storage
   */
  private loadData(): void {
    try {
      if (existsSync(this.storagePath)) {
        const fileContent = readFileSync(this.storagePath, 'utf8');

        // Skip empty files or files with only whitespace
        if (!fileContent || fileContent.trim() === '') {
          // File is empty, initialize with empty data
          return;
        }

        // Basic JSON validation - check if it starts with { or [
        const trimmed = fileContent.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          console.warn('⚠️  Token usage data file does not contain valid JSON. Initializing empty data.');
          return;
        }

        const data = JSON.parse(fileContent);

        // Load usage data
        if (data.usage) {
          this.usage = new Map(
            Object.entries(data.usage).map(([key, value]): [string, TokenUsage] => [
              key,
              {
                ...(value as RawTokenUsage),
                lastReset: new Date((value as RawTokenUsage).lastReset),
                lastActivity: new Date((value as RawTokenUsage).lastActivity)
              }
            ])
          );
        }

        // Load limits
        if (data.limits) {
          this.limits = new Map(
            Object.entries(data.limits).map(([key, value]): [string, TokenLimit] => [
              key,
              {
                ...(value as RawTokenLimit),
                currentUsage: (value as RawTokenLimit).currentUsage ? {
                  ...(value as RawTokenLimit).currentUsage,
                  lastDailyReset: new Date((value as RawTokenLimit).currentUsage.lastDailyReset),
                  lastWeeklyReset: new Date((value as RawTokenLimit).currentUsage.lastWeeklyReset),
                  lastMonthlyReset: new Date((value as RawTokenLimit).currentUsage.lastMonthlyReset)
                } : {
                  lastDailyReset: new Date(),
                  lastWeeklyReset: new Date(),
                  lastMonthlyReset: new Date(),
                  daily: 0,
                  weekly: 0,
                  monthly: 0
                }
              }
            ])
          );
        }

        // Load events
        if (data.events) {
          this.events = data.events.map((event: RawTokenEvent): TokenEvent => ({
            ...event,
            timestamp: new Date(event.timestamp)
          }));
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load token usage data:', error);
    }
  }

  /**
   * Save data to storage
   */
  private saveData(): void {
    try {
      // Ensure directory exists
      const dir = dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const data = {
        usage: Object.fromEntries(this.usage),
        limits: Object.fromEntries(this.limits),
        events: this.events.slice(-1000) // Save only last 1k events
      };

      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Could not save token usage data:', error);
    }
  }

  // ===== Enhanced Token Monitoring Helper Methods =====

  /**
   * Create default monitoring configuration
   */
  private createDefaultConfig(override?: Partial<TokenMonitoringConfig>): TokenMonitoringConfig {
    const defaultConfig: TokenMonitoringConfig = {
      agents: {
        scanner: {
          tokenLimits: { daily: 50000, weekly: 250000, monthly: 1000000 },
          costThresholds: { warningThreshold: 80, criticalThreshold: 95 },
          monitoringSettings: {
            realTimeUpdates: true,
            eventBuffering: true,
            compressionEnabled: true,
            analyticsEnabled: true,
            alertingEnabled: true
          }
        },
        inspector: {
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000 },
          costThresholds: { warningThreshold: 80, criticalThreshold: 95 },
          monitoringSettings: {
            realTimeUpdates: true,
            eventBuffering: true,
            compressionEnabled: true,
            analyticsEnabled: true,
            alertingEnabled: true
          }
        },
        orchestrator: {
          tokenLimits: { daily: 200000, weekly: 1000000, monthly: 4000000 },
          costThresholds: { warningThreshold: 80, criticalThreshold: 95 },
          monitoringSettings: {
            realTimeUpdates: true,
            eventBuffering: true,
            compressionEnabled: true,
            analyticsEnabled: true,
            alertingEnabled: true
          }
        }
      },
      system: {
        updateFrequency: 500,
        retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
        compressionEnabled: true,
        performanceMode: 'balanced'
      }
    };

    return { ...defaultConfig, ...override };
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): TokenPerformanceMetrics {
    return {
      eventProcessingLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      eventThroughput: 0,
      subscriberCount: 0,
      bufferUtilization: 0
    };
  }

  /**
   * Initialize cost calculations for major providers
   */
  private initializeCostCalculations(): void {
    // OpenAI pricing (example rates, should be updated with current rates)
    this.costCalculations.set('gpt-4', {
      model: 'gpt-4',
      provider: 'openai',
      inputTokenPrice: 0.03,  // $0.03 per 1K input tokens
      outputTokenPrice: 0.06, // $0.06 per 1K output tokens
      currency: 'USD',
      lastUpdated: new Date()
    });

    this.costCalculations.set('gpt-3.5-turbo', {
      model: 'gpt-3.5-turbo',
      provider: 'openai',
      inputTokenPrice: 0.001,  // $0.001 per 1K input tokens
      outputTokenPrice: 0.002, // $0.002 per 1K output tokens
      currency: 'USD',
      lastUpdated: new Date()
    });

    // Anthropic pricing
    this.costCalculations.set('claude-3-sonnet', {
      model: 'claude-3-sonnet',
      provider: 'anthropic',
      inputTokenPrice: 0.015,  // $0.015 per 1K input tokens
      outputTokenPrice: 0.075, // $0.075 per 1K output tokens
      currency: 'USD',
      lastUpdated: new Date()
    });
  }

  /**
   * Start event processing loop
   */
  private startEventProcessing(): void {
    setInterval(() => {
      this.flushEventBuffer();
    }, this.flushInterval);
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.cleanupOldData();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Buffer events for batch processing
   */
  private bufferEvent(event: TokenUsageEvent): void {
    this.eventBuffer.push(event);

    // Force flush if buffer is full
    if (this.eventBuffer.length >= this.maxBufferSize) {
      this.flushEventBuffer();
    }
  }

  /**
   * Flush event buffer to subscribers
   */
  private flushEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.lastFlushTime = Date.now();

    // Notify subscribers
    for (const subscription of this.eventSubscriptions.values()) {
      const relevantEvents = events.filter(event =>
        subscription.agentId === 'all' || event.agentId === subscription.agentId
      );

      for (const event of relevantEvents) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error(`❌ Error in token event subscription ${subscription.id}:`, error);
        }
      }
    }

    // Emit batch processing event
    this.emit('events_processed', {
      eventCount: events.length,
      processingTime: Date.now() - this.lastFlushTime
    });
  }

  /**
   * Calculate cost for a token event
   */
  private calculateCost(event: TokenEvent): number {
    if (!event.model) return 0;

    const costCalc = this.costCalculations.get(event.model);
    if (!costCalc) return 0;

    // Simple cost calculation (input vs output tokens would need to be determined)
    const inputCost = (event.tokens * costCalc.inputTokenPrice) / 1000;
    return inputCost;
  }

  /**
   * Get current limit for an agent
   */
  private getCurrentLimit(agentId: string): number {
    const limit = this.limits.get(agentId);
    return limit?.dailyLimit || 0;
  }

  /**
   * Get remaining tokens for an agent
   */
  private getRemainingTokens(agentId: string): number {
    const usage = this.usage.get(agentId);
    const limit = this.limits.get(agentId);

    if (!usage || !limit) return 0;

    return Math.max(0, limit.dailyLimit - limit.currentUsage.daily);
  }

  /**
   * Enforce token limits with multi-tier thresholds
   */
  private enforceTokenLimits(event: TokenUsageEvent): void {
    const limit = this.limits.get(event.agentId);
    if (!limit) return;

    this.resetCountersIfNeeded(limit, event.timestamp);
    const percentage = (limit.currentUsage.daily / limit.dailyLimit) * 100;

    // Multi-tier enforcement
    if (percentage >= 95) {
      this.createAlert(event.agentId, 'critical', `Critical: Agent has used ${percentage.toFixed(1)}% of daily limit`);
      this.emit('limit_exceeded', { agentId: event.agentId, percentage, action: 'block_requests' });
    } else if (percentage >= 90) {
      this.createAlert(event.agentId, 'warning', `Warning: Agent has used ${percentage.toFixed(1)}% of daily limit`);
      this.emit('limit_approached', { agentId: event.agentId, percentage, action: 'throttle_requests' });
    } else if (percentage >= 80) {
      this.createAlert(event.agentId, 'warning', `Notice: Agent has used ${percentage.toFixed(1)}% of daily limit`);
      this.emit('limit_warning', { agentId: event.agentId, percentage, action: 'emit_alert' });
    }
  }

  /**
   * Create a token alert
   */
  private createAlert(agentId: string, type: 'warning' | 'critical' | 'blocked', message: string): void {
    const alert: TokenAlert = {
      id: this.generateAlertId(),
      agentId,
      type,
      message,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    this.trimAlerts();

    this.emit('alert_created', alert);
  }

  /**
   * Trim old alerts to prevent memory bloat
   */
  private trimAlerts(): void {
    const maxAlerts = 1000;
    if (this.alerts.length > maxAlerts) {
      this.alerts = this.alerts.slice(-maxAlerts);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    this.performanceMetrics.subscriberCount = this.eventSubscriptions.size;
    this.performanceMetrics.bufferUtilization = (this.eventBuffer.length / this.maxBufferSize) * 100;

    // Calculate event throughput (events per second)
    const recentEvents = this.events.filter(event =>
      Date.now() - event.timestamp.getTime() < 5000 // Last 5 seconds
    );
    this.performanceMetrics.eventThroughput = recentEvents.length / 5;
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const retentionPeriod = this.monitoringConfig.system.retentionPeriod;
    const cutoffTime = Date.now() - retentionPeriod;

    // Clean old events
    this.events = this.events.filter(event => event.timestamp.getTime() > cutoffTime);

    // Clean old alerts
    this.alerts = this.alerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get recent events for an agent
   */
  private getRecentEvents(agentId: string, timeWindowMs: number): TokenEvent[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.events.filter(event =>
      event.agentId === agentId && event.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Calculate agent total cost
   */
  private calculateAgentTotalCost(agentId: string): number {
    const agentEvents = this.events.filter(event => event.agentId === agentId);
    return agentEvents.reduce((total, event) => total + this.calculateCost(event), 0);
  }

  /**
   * Calculate agent cost for specific events
   */
  private calculateAgentCost(agentId: string, events: TokenEvent[]): number {
    const agentEvents = events.filter(event => event.agentId === agentId);
    return agentEvents.reduce((total, event) => total + this.calculateCost(event), 0);
  }

  /**
   * Get agent status based on usage percentage
   */
  private getAgentStatus(percentage: number): 'normal' | 'warning' | 'critical' | 'blocked' {
    if (percentage >= 95) return 'blocked';
    if (percentage >= 90) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'normal';
  }

  /**
   * Get trend data for dashboard
   */
  private getTrendData(): any[] {
    // Simplified trend data - in real implementation would calculate actual trends
    return [{
      timestamp: new Date(),
      usage: Array.from(this.usage.values()).reduce((sum, usage) => sum + usage.totalTokens, 0),
      cost: Array.from(this.usage.keys()).reduce((sum, agentId) => sum + this.calculateAgentTotalCost(agentId), 0),
      agentBreakdown: Object.fromEntries(
        Array.from(this.usage.entries()).map(([agentId, usage]) => [agentId, usage.totalTokens])
      )
    }];
  }

  /**
   * Get projections for dashboard
   */
  private getProjections(): TokenProjection[] {
    const projections: TokenProjection[] = [];
    const timeframes: ('hour' | 'day' | 'week' | 'month')[] = ['hour', 'day', 'week', 'month'];

    for (const agentId of this.usage.keys()) {
      for (const timeframe of timeframes) {
        projections.push(this.getCostProjection(agentId, timeframe));
      }
    }

    return projections;
  }

  /**
   * Calculate usage trend
   */
  private calculateTrend(agentId: string): 'increasing' | 'decreasing' | 'stable' {
    const recentEvents = this.getRecentEvents(agentId, 60 * 60 * 1000); // Last hour
    const olderEvents = this.getRecentEvents(agentId, 2 * 60 * 60 * 1000) // Last 2 hours
      .filter(event => !recentEvents.includes(event));

    const recentUsage = recentEvents.reduce((sum, event) => sum + event.tokens, 0);
    const olderUsage = olderEvents.reduce((sum, event) => sum + event.tokens, 0);

    if (recentUsage > olderUsage * 1.1) return 'increasing';
    if (recentUsage < olderUsage * 0.9) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate usage rate
   */
  private calculateUsageRate(events: TokenEvent[], timeWindowMs: number): number {
    const totalTokens = events.reduce((sum, event) => sum + event.tokens, 0);
    return totalTokens / (timeWindowMs / 1000 / 60); // tokens per minute
  }

  /**
   * Calculate projected cost
   */
  private calculateProjectedCost(agentId: string, projectedUsage: number): number {
    const averageCostPerToken = this.calculateAgentTotalCost(agentId) /
      Math.max(this.usage.get(agentId)?.totalTokens || 1, 1);
    return projectedUsage * averageCostPerToken;
  }

  /**
   * Calculate confidence based on data sample size
   */
  private calculateConfidence(sampleSize: number): number {
    // Simple confidence calculation based on sample size
    if (sampleSize < 5) return 0.3;
    if (sampleSize < 20) return 0.6;
    if (sampleSize < 50) return 0.8;
    return 0.95;
  }

  /**
   * Generate recommendations based on projections
   */
  private generateRecommendations(agentId: string, projectedUsage: number, projectedCost: number): string[] {
    const recommendations: string[] = [];
    const limit = this.limits.get(agentId);

    if (limit && projectedUsage > limit.dailyLimit * 0.8) {
      recommendations.push('Consider reducing request frequency to stay within daily limits');
    }

    if (projectedCost > 10) { // $10 threshold
      recommendations.push('Projected cost is high, consider optimizing prompts');
    }

    if (recommendations.length === 0) {
      recommendations.push('Usage is within normal parameters');
    }

    return recommendations;
  }

  /**
   * Create empty statistics
   */
  private createEmptyStatistics(): TokenStatistics {
    return {
      totalTokens: 0,
      totalCost: 0,
      averageTokensPerRequest: 0,
      requestsPerMinute: 0,
      costPerMinute: 0,
      efficiency: 0,
      trend: 'stable'
    };
  }

  /**
   * Create empty projection
   */
  private createEmptyProjection(timeframe: 'hour' | 'day' | 'week' | 'month'): TokenProjection {
    return {
      timeframe,
      projectedUsage: 0,
      projectedCost: 0,
      confidence: 0,
      recommendations: ['No data available for projection']
    };
  }

  /**
   * Get timeframe in milliseconds
   */
  private getTimeframeMs(timeframe: 'hour' | 'day' | 'week' | 'month'): number {
    switch (timeframe) {
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}