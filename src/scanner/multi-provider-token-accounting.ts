/**
 * ♫ Multi-Provider Token Accounting System for @dcversus/prp Tuner
 *
 * Comprehensive token usage tracking with support for multiple providers
 * (Claude Code, OpenAI, Gemini, AMP, etc.), real-time pricing, and
 * intelligent limit prediction with auto-adjust functionality.
 */
import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils, HashUtils, FileUtils, ConfigUtils } from '../shared';

const logger = createLayerLogger('scanner');
// Provider configuration interfaces
interface ProviderConfig {
  id: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  models: ModelConfig[];
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    tokensPerDay: number;
  };
  pricing: PricingConfig;
  enabled: boolean;
}
interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricing: ModelPricing;
  capabilities: string[];
}
interface PricingConfig {
  currency: string;
  updateInterval: number; // minutes
  lastUpdated: Date;
  autoUpdate: boolean;
}
interface ModelPricing {
  input: number; // price per 1k tokens
  output: number; // price per 1k tokens
  currency: string;
  effectiveDate: Date;
}
// Usage tracking interfaces
export interface TokenUsageRecord {
  id: string;
  timestamp: Date;
  providerId: string;
  modelId: string;
  agentId: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  currency: string;
  metadata: Record<string, unknown>;
}
interface ProviderUsage {
  providerId: string;
  providerName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageTokensPerRequest: number;
  dailyUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
  limits: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  percentages: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
}
interface LimitPrediction {
  providerId: string;
  currentUsage: number;
  predictedUsage: number;
  timeToLimit: number; // hours
  confidence: number; // 0-1
  recommendation: 'continue' | 'caution' | 'stop' | 'upgrade';
}
// Provider-specific detection patterns
interface ProviderPattern {
  provider: string;
  patterns: RegExp[];
  tokenExtraction: RegExp[];
  modelDetection: RegExp[];
}
/**
 * Multi-Provider Token Accounting Manager
 */
export class MultiProviderTokenAccounting extends EventEmitter {
  private readonly providers = new Map<string, ProviderConfig>();
  private readonly usageRecords = new Map<string, TokenUsageRecord>();
  private priceUpdateTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private readonly persistPath: string;
  // Provider detection patterns
  private readonly providerPatterns: ProviderPattern[] = [
    {
      provider: 'claude-code',
      patterns: [/claude-code/i, /anthropic/i],
      tokenExtraction: [/tokens?:\s*(\d+)/i, /usage:\s*(\d+)/i],
      modelDetection: [/claude-3-[\w-]+/i],
    },
    {
      provider: 'openai',
      patterns: [/gpt-[\w-]+/i, /openai/i],
      tokenExtraction: [/tokens?:\s*(\d+)/i, /usage:\s*(\d+)/i],
      modelDetection: [/gpt-4[\w-]*/i, /gpt-3\.5[\w-]*/i],
    },
    {
      provider: 'gemini',
      patterns: [/gemini/i, /google/i],
      tokenExtraction: [/tokens?:\s*(\d+)/i, /usage:\s*(\d+)/i],
      modelDetection: [/gemini-[\w-]+/i],
    },
    {
      provider: 'amp',
      patterns: [/amp/i, /anthropic-model-protocol/i],
      tokenExtraction: [/tokens?:\s*(\d+)/i, /usage:\s*(\d+)/i],
      modelDetection: [/claude-[\w-]+/i],
    },
  ];
  constructor(persistPath = '.prp/multi-provider-token-accounting.json') {
    super();
    this.persistPath = persistPath;
    this.initializeProviders();
  }
  /**
   * Initialize the multi-provider token accounting system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('MultiProviderTokenAccounting', 'System already initialized');
      return;
    }
    try {
      logger.info(
        'MultiProviderTokenAccounting',
        'Initializing multi-provider token accounting...',
      );
      // Load persisted data
      await this.loadPersistedData();
      // Start price updates
      this.startPriceUpdates();
      // Start limit monitoring
      this.startLimitMonitoring();
      this.isInitialized = true;
      logger.info('MultiProviderTokenAccounting', '✅ Multi-provider token accounting initialized');
      this.emit('accounting:initialized', {
        providersCount: this.providers.size,
        recordsCount: this.usageRecords.size,
        timestamp: TimeUtils.now(),
      });
    } catch (error) {
      logger.error(
        'MultiProviderTokenAccounting',
        'Failed to initialize',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Record token usage for any provider
   */
  recordUsage(
    agentId: string,
    operation: string,
    inputTokens: number,
    outputTokens: number,
    metadata: Record<string, unknown> = {},
  ): void {
    try {
      // Detect provider and model from metadata
      const detection = this.detectProviderAndModel(metadata);
      if (!detection.provider) {
        logger.warn('MultiProviderTokenAccounting', 'Could not detect provider from metadata', {
          agentId,
          operation,
        });
        return;
      }
      const provider = this.providers.get(detection.provider);
      if (!provider?.enabled) {
        logger.warn('MultiProviderTokenAccounting', 'Provider not found or disabled', {
          provider: detection.provider,
        });
        return;
      }
      const model = provider.models.find((m) => m.id === detection.model) ?? provider.models[0];
      if (!model) {
        logger.warn('MultiProviderTokenAccounting', 'Model not found', { model: detection.model });
        return;
      }
      // Calculate cost
      const cost = this.calculateCost(provider, model, inputTokens, outputTokens);
      // Create usage record
      const record: TokenUsageRecord = {
        id: HashUtils.generateId(),
        timestamp: TimeUtils.now(),
        providerId: provider.id,
        modelId: model.id,
        agentId,
        operation,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost,
        currency: provider.pricing.currency,
        metadata,
      };
      // Store record
      this.usageRecords.set(record.id, record);
      // Check limits
      this.checkLimits(provider, agentId);
      // Emit usage event
      this.emit('usage:recorded', {
        record,
        provider: provider.name,
        model: model.name,
        cost,
        timestamp: record.timestamp,
      });
      // Log significant usage
      if (cost > 0.1 || record.totalTokens > 10000) {
        logger.info('MultiProviderTokenAccounting', 'Significant token usage recorded', {
          agentId,
          provider: provider.name,
          model: model.name,
          tokens: record.totalTokens,
          cost: cost.toFixed(4),
        });
      }
    } catch (error) {
      logger.error(
        'MultiProviderTokenAccounting',
        'Error recording usage',
        error instanceof Error ? error : new Error(String(error)),
        {
          agentId,
          operation,
        },
      );
    }
  }
  /**
   * Get usage statistics for all providers
   */
  getProviderUsage(): ProviderUsage[] {
    const usage: ProviderUsage[] = [];
    for (const provider of Array.from(this.providers.values())) {
      if (!provider.enabled) {
        continue;
      }
      const providerRecords = Array.from(this.usageRecords.values()).filter(
        (record) => record.providerId === provider.id,
      );
      const totalTokens = providerRecords.reduce((sum, record) => sum + record.totalTokens, 0);
      const totalCost = providerRecords.reduce((sum, record) => sum + record.cost, 0);
      const requestCount = providerRecords.length;
      // Calculate time-based usage
      const now = TimeUtils.now();
      const dailyUsage = this.calculateUsageInPeriod(providerRecords, TimeUtils.daysAgo(1), now);
      const weeklyUsage = this.calculateUsageInPeriod(providerRecords, TimeUtils.daysAgo(7), now);
      const monthlyUsage = this.calculateUsageInPeriod(providerRecords, TimeUtils.daysAgo(30), now);
      // Calculate percentages
      const dailyPercent =
        provider.rateLimits.tokensPerDay > 0
          ? (dailyUsage / provider.rateLimits.tokensPerDay) * 100
          : 0;
      const weeklyPercent =
        provider.rateLimits.tokensPerDay * 7 > 0
          ? (weeklyUsage / (provider.rateLimits.tokensPerDay * 7)) * 100
          : 0;
      const monthlyPercent =
        provider.rateLimits.tokensPerDay * 30 > 0
          ? (monthlyUsage / (provider.rateLimits.tokensPerDay * 30)) * 100
          : 0;
      // Determine status
      let status: ProviderUsage['status'] = 'healthy';
      if (dailyPercent > 95 || weeklyPercent > 95 || monthlyPercent > 95) {
        status = 'exceeded';
      } else if (dailyPercent > 80 || weeklyPercent > 80 || monthlyPercent > 80) {
        status = 'critical';
      } else if (dailyPercent > 60 || weeklyPercent > 60 || monthlyPercent > 60) {
        status = 'warning';
      }
      usage.push({
        providerId: provider.id,
        providerName: provider.name,
        totalTokens,
        totalCost,
        requestCount,
        averageTokensPerRequest: requestCount > 0 ? totalTokens / requestCount : 0,
        dailyUsage,
        weeklyUsage,
        monthlyUsage,
        limits: {
          daily: provider.rateLimits.tokensPerDay,
          weekly: provider.rateLimits.tokensPerDay * 7,
          monthly: provider.rateLimits.tokensPerDay * 30,
        },
        percentages: {
          daily: dailyPercent,
          weekly: weeklyPercent,
          monthly: monthlyPercent,
        },
        status,
      });
    }
    return usage.sort((a, b) => b.totalCost - a.totalCost); // Sort by cost
  }
  /**
   * Get limit predictions with auto-adjust recommendations
   */
  getLimitPredictions(): LimitPrediction[] {
    const predictions: LimitPrediction[] = [];
    for (const provider of Array.from(this.providers.values())) {
      if (!provider.enabled) {
        continue;
      }
      const providerRecords = Array.from(this.usageRecords.values())
        .filter((record) => record.providerId === provider.id)
        .filter((record) => record.timestamp > TimeUtils.hoursAgo(24)); // Last 24 hours
      if (providerRecords.length < 3) {
        continue;
      } // Need minimum data
      // Calculate usage trend
      const hourlyUsage = this.calculateHourlyUsage(providerRecords);
      const averageHourlyUsage =
        hourlyUsage.reduce((sum, usage) => sum + usage, 0) / hourlyUsage.length;
      // Predict time to limit
      const dailyLimit = provider.rateLimits.tokensPerDay;
      const currentDailyUsage = this.calculateUsageInPeriod(
        providerRecords,
        TimeUtils.daysAgo(1),
        TimeUtils.now(),
      );
      const remainingDailyLimit = dailyLimit - currentDailyUsage;
      const hoursToLimit =
        averageHourlyUsage > 0 ? remainingDailyLimit / averageHourlyUsage : Infinity;
      // Calculate confidence based on data consistency
      const variance = this.calculateVariance(hourlyUsage);
      const confidence = Math.max(0.1, 1 - variance / (averageHourlyUsage * averageHourlyUsage));
      // Determine recommendation
      let recommendation: LimitPrediction['recommendation'] = 'continue';
      if (hoursToLimit < 2) {
        recommendation = 'stop';
      } else if (hoursToLimit < 6) {
        recommendation = 'caution';
      } else if (hoursToLimit < 12 && confidence < 0.5) {
        recommendation = 'upgrade';
      }
      predictions.push({
        providerId: provider.id,
        currentUsage: currentDailyUsage,
        predictedUsage: currentDailyUsage + averageHourlyUsage * 12, // Next 12 hours
        timeToLimit: hoursToLimit,
        confidence,
        recommendation,
      });
    }
    return predictions.sort((a, b) => a.timeToLimit - b.timeToLimit);
  }
  /**
   * Update pricing for all providers
   */
  async updatePricing(): Promise<void> {
    logger.info('MultiProviderTokenAccounting', 'Updating pricing for all providers...');
    for (const provider of Array.from(this.providers.values())) {
      if (!provider.enabled || !provider.pricing.autoUpdate) {
        continue;
      }
      try {
        await this.updateProviderPricing(provider);
      } catch (error) {
        logger.warn('MultiProviderTokenAccounting', 'Failed to update pricing', {
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    // Persist updated pricing
    await this.persistData();
    this.emit('pricing:updated', {
      timestamp: TimeUtils.now(),
      providersCount: this.providers.size,
    });
  }
  /**
   * Add custom provider
   */
  addProvider(provider: ProviderConfig): void {
    this.providers.set(provider.id, provider);
    logger.info('MultiProviderTokenAccounting', 'Custom provider added', {
      providerId: provider.id,
      name: provider.name,
    });
  }
  /**
   * Remove provider
   */
  removeProvider(providerId: string): boolean {
    const removed = this.providers.delete(providerId);
    if (removed) {
      logger.info('MultiProviderTokenAccounting', 'Provider removed', { providerId });
    }
    return removed;
  }
  /**
   * Stop the token accounting system
   */
  async stop(): Promise<void> {
    logger.info('MultiProviderTokenAccounting', 'Stopping multi-provider token accounting...');
    // Stop price updates
    if (this.priceUpdateTimer) {
      clearInterval(this.priceUpdateTimer);
      this.priceUpdateTimer = null;
    }
    // Persist data
    await this.persistData();
    await this.cleanup();
    this.isInitialized = false;
    logger.info('MultiProviderTokenAccounting', '✅ Multi-provider token accounting stopped');
  }
  // Private methods
  private initializeProviders(): void {
    // Claude Code (Anthropic)
    this.providers.set('claude-code', {
      id: 'claude-code',
      name: 'Claude Code',
      models: [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          contextWindow: 200000,
          maxOutputTokens: 8192,
          pricing: {
            input: 0.003,
            output: 0.015,
            currency: 'USD',
            effectiveDate: TimeUtils.now(),
          },
          capabilities: ['text', 'code', 'analysis'],
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku',
          contextWindow: 200000,
          maxOutputTokens: 8192,
          pricing: {
            input: 0.0008,
            output: 0.004,
            currency: 'USD',
            effectiveDate: TimeUtils.now(),
          },
          capabilities: ['text', 'code', 'fast'],
        },
      ],
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 40000,
        tokensPerDay: 1000000,
      },
      pricing: {
        currency: 'USD',
        updateInterval: 60, // 1 hour
        lastUpdated: TimeUtils.now(),
        autoUpdate: true,
      },
      enabled: true,
    });
    // OpenAI
    this.providers.set('openai', {
      id: 'openai',
      name: 'OpenAI',
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          contextWindow: 128000,
          maxOutputTokens: 4096,
          pricing: {
            input: 0.005,
            output: 0.015,
            currency: 'USD',
            effectiveDate: TimeUtils.now(),
          },
          capabilities: ['text', 'vision', 'code'],
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          contextWindow: 128000,
          maxOutputTokens: 4096,
          pricing: {
            input: 0.01,
            output: 0.03,
            currency: 'USD',
            effectiveDate: TimeUtils.now(),
          },
          capabilities: ['text', 'vision', 'code'],
        },
      ],
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000,
        tokensPerDay: 10000000,
      },
      pricing: {
        currency: 'USD',
        updateInterval: 60,
        lastUpdated: TimeUtils.now(),
        autoUpdate: true,
      },
      enabled: true,
    });
    // Gemini (Google)
    this.providers.set('gemini', {
      id: 'gemini',
      name: 'Google Gemini',
      models: [
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          contextWindow: 2000000,
          maxOutputTokens: 8192,
          pricing: {
            input: 0.00125,
            output: 0.005,
            currency: 'USD',
            effectiveDate: TimeUtils.now(),
          },
          capabilities: ['text', 'vision', 'code', 'audio'],
        },
      ],
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 32000,
        tokensPerDay: 2000000,
      },
      pricing: {
        currency: 'USD',
        updateInterval: 60,
        lastUpdated: TimeUtils.now(),
        autoUpdate: true,
      },
      enabled: true,
    });
  }
  private detectProviderAndModel(metadata: Record<string, unknown>): {
    provider?: string;
    model?: string;
  } {
    const metadataString = JSON.stringify(metadata).toLowerCase();
    for (const pattern of this.providerPatterns) {
      // Check if any provider pattern matches
      const providerMatch = pattern.patterns.some((p) => p.test(metadataString));
      if (providerMatch) {
        // Detect model
        let model = pattern.provider; // Default to provider name
        for (const modelPattern of pattern.modelDetection) {
          const match = metadataString.match(modelPattern);
          if (match) {
            model = match[0];
            break;
          }
        }
        return { provider: pattern.provider, model };
      }
    }
    return {};
  }
  private calculateCost(
    provider: ProviderConfig,
    model: ModelConfig,
    inputTokens: number,
    outputTokens: number,
  ): number {
    return (
      (inputTokens / 1000) * model.pricing.input + (outputTokens / 1000) * model.pricing.output
    );
  }
  private calculateUsageInPeriod(
    records: TokenUsageRecord[],
    startTime: Date,
    endTime: Date,
  ): number {
    return records
      .filter((record) => record.timestamp >= startTime && record.timestamp <= endTime)
      .reduce((sum, record) => sum + record.totalTokens, 0);
  }
  private calculateHourlyUsage(records: TokenUsageRecord[]): number[] {
    const hourlyBuckets = new Map<number, number>();
    for (const record of records) {
      const hour = record.timestamp.getHours();
      const current = hourlyBuckets.get(hour) ?? 0;
      hourlyBuckets.set(hour, current + record.totalTokens);
    }
    return Array.from({ length: 24 }, (_, hour) => hourlyBuckets.get(hour) ?? 0);
  }
  private calculateVariance(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }
  private checkLimits(provider: ProviderConfig, agentId: string): void {
    const now = TimeUtils.now();
    const dayStart = TimeUtils.daysAgo(1);
    const dailyUsage = this.calculateUsageInPeriod(
      Array.from(this.usageRecords.values()).filter(
        (record) => record.providerId === provider.id && record.agentId === agentId,
      ),
      dayStart,
      now,
    );
    const dailyPercent = (dailyUsage / provider.rateLimits.tokensPerDay) * 100;
    if (dailyPercent > 90) {
      this.emit('limit:warning', {
        providerId: provider.id,
        agentId,
        usage: dailyUsage,
        limit: provider.rateLimits.tokensPerDay,
        percentage: dailyPercent,
        timestamp: now,
      });
    }
    if (dailyPercent > 100) {
      this.emit('limit:exceeded', {
        providerId: provider.id,
        agentId,
        usage: dailyUsage,
        limit: provider.rateLimits.tokensPerDay,
        percentage: dailyPercent,
        timestamp: now,
      });
    }
  }
  private async updateProviderPricing(provider: ProviderConfig): Promise<void> {
    // Placeholder for actual pricing API calls
    // In production, this would call provider APIs to get current pricing
    logger.debug('MultiProviderTokenAccounting', 'Updating pricing for provider', {
      provider: provider.name,
    });
    provider.pricing.lastUpdated = TimeUtils.now();
  }
  private startPriceUpdates(): void {
    // Find the minimum update interval
    const minInterval = Math.min(
      ...Array.from(this.providers.values())
        .filter((p) => p.enabled && p.pricing.autoUpdate)
        .map((p) => p.pricing.updateInterval),
    );
    if (minInterval > 0) {
      this.priceUpdateTimer = setInterval(
        async () => {
          await this.updatePricing();
        },
        minInterval * 60 * 1000,
      ); // Convert minutes to milliseconds
      logger.info('MultiProviderTokenAccounting', 'Price updates started', {
        intervalMinutes: minInterval,
      });
    }
  }
  private startLimitMonitoring(): void {
    setInterval(
      () => {
        const predictions = this.getLimitPredictions();
        const criticalPredictions = predictions.filter(
          (p) => p.recommendation === 'stop' || p.recommendation === 'caution',
        );
        if (criticalPredictions.length > 0) {
          this.emit('limits:critical', {
            predictions: criticalPredictions,
            timestamp: TimeUtils.now(),
          });
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes
  }
  private async loadPersistedData(): Promise<void> {
    try {
      const exists = await FileUtils.pathExists(this.persistPath);
      if (!exists) {
        return;
      }
      const data = await ConfigUtils.loadConfigFile<any>(this.persistPath);
      if (!data) {
        return;
      }
      // Load providers configuration
      if (data.providers) {
        for (const providerData of data.providers) {
          this.providers.set(providerData.id, providerData);
        }
      }
      // Load usage records (only recent ones)
      if (data.usageRecords) {
        const cutoffDate = TimeUtils.daysAgo(30);
        for (const recordData of data.usageRecords) {
          if (new Date(recordData.timestamp) > cutoffDate) {
            this.usageRecords.set(recordData.id, recordData);
          }
        }
      }
      logger.info('MultiProviderTokenAccounting', 'Persisted data loaded', {
        providers: this.providers.size,
        records: this.usageRecords.size,
      });
    } catch (error) {
      logger.warn('MultiProviderTokenAccounting', 'Failed to load persisted data', { error });
    }
  }
  private async persistData(): Promise<void> {
    try {
      const data = {
        providers: Array.from(this.providers.values()),
        usageRecords: Array.from(this.usageRecords.values()),
        lastSaved: TimeUtils.now().toISOString(),
        version: '1.0.0',
      };
      await FileUtils.ensureDir((await import('path')).dirname(this.persistPath));
      await FileUtils.writeTextFile(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(
        'MultiProviderTokenAccounting',
        'Failed to persist data',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  private async cleanup(): Promise<void> {
    const cutoffDate = TimeUtils.daysAgo(30);
    // Remove old usage records
    for (const [id, record] of Array.from(this.usageRecords.entries())) {
      if (record.timestamp < cutoffDate) {
        this.usageRecords.delete(id);
      }
    }
    await this.persistData();
    logger.info('MultiProviderTokenAccounting', 'Cleanup completed');
  }
}

// Export types that are imported in index.ts
export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  providerId: string;
}

export interface TokenEvent {
  id: string;
  timestamp: Date;
  type: 'usage' | 'limit' | 'alert';
  providerId: string;
  data: unknown;
}

export interface TokenLimit {
  providerId: string;
  daily: number;
  monthly: number;
  current: {
    daily: number;
    monthly: number;
  };
}

export interface ProviderUsage {
  providerId: string;
  providerName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageTokensPerRequest: number;
  costPerRequest: number;
  requestsPerMinute: number;
  limits: {
    daily: number;
    monthly: number;
  };
  usage: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
}

export interface LimitPrediction {
  providerId: string;
  currentUsage: number;
  predictedUsage: number;
  timeToLimit: number; // hours
  recommendation: 'continue' | 'slow_down' | 'stop' | 'upgrade';
  confidence: number;
  projectedDailyTotal: number;
  projectedMonthlyTotal: number;
  limitType: 'daily' | 'monthly';
  alertThreshold: number;
}

export interface ApproachingLimit {
  providerId: string;
  limitType: 'daily' | 'monthly';
  current: number;
  limit: number;
  percentage: number;
  estimatedTimeToLimit: Date;
  recommendations: string[];
}

