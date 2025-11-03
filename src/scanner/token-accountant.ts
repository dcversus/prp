import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

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
 * Token Accountant class
 */
export class TokenAccountant {
  private usage: Map<string, TokenUsage> = new Map();
  private limits: Map<string, TokenLimit> = new Map();
  private events: TokenEvent[] = [];
  private storagePath: string;

  constructor(storageDir?: string) {
    this.storagePath = storageDir || join(homedir(), '.prp', 'token-usage.json');
    this.loadData();
    this.cleanupOldEvents();
  }

  /**
   * Record token usage for an agent
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

    // Persist data
    this.saveData();
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
        const data = JSON.parse(readFileSync(this.storagePath, 'utf8'));

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
                } : undefined
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
}