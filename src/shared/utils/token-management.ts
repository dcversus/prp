/**
 * ♫ Token Management Utilities for @dcversus/prp
 *
 * Shared utilities for token estimation, cost calculation, and token limit management.
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cost: number;
}
export interface TokenLimitConfig {
  totalLimit: number; // Total token limit (e.g., 40K)
  basePrompt: number; // Tokens for base prompt
  guidelinePrompt: number; // Tokens for guidelines
  contextWindow: number; // Remaining tokens for context
  safetyMargin: number; // Safety margin percentage (e.g., 0.05 for 5%)
  compressionThreshold: number; // When to start compressing
}
export interface LLMProviderOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  [key: string]: unknown;
}

export interface LLMProvider {
  name: string;
  model: string;
  maxTokens: number;
  costPerToken: number;
  execute(prompt: string, options?: LLMProviderOptions): Promise<unknown>;
}
/**
 * Token Management Utility Class
 */
export class TokenManager {
  /**
   * Estimate token count from text (rough estimation)
   * Uses approximately 1 token per 4 characters rule
   */
  static estimateTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }
  /**
   * Calculate cost based on token usage and provider rate
   */
  static calculateCost(tokens: number, costPerToken: number): number {
    return tokens * costPerToken;
  }
  /**
   * Calculate total cost from token usage
   */
  static calculateTokenCost(tokenUsage: TokenUsage, provider: LLMProvider): number {
    return this.calculateCost(tokenUsage.total, provider.costPerToken);
  }
  /**
   * Distribute available tokens among components
   */
  static distributeTokens(
    totalLimit: number,
    safetyMargin: number,
    basePromptRatio = 0.5,
    guidelineRatio = 0.5,
  ): {
    available: number;
    basePrompt: number;
    guideline: number;
    context: number;
  } {
    const available = totalLimit - Math.floor(totalLimit * safetyMargin);
    const basePrompt = Math.floor(available * basePromptRatio);
    const guideline = Math.floor(available * guidelineRatio);
    const context = available - basePrompt - guideline;
    return {
      available,
      basePrompt,
      guideline,
      context,
    };
  }
  /**
   * Check if content is within token limits
   */
  static isWithinTokenLimit(content: string, limit: number): boolean {
    return this.estimateTokens(content) <= limit;
  }
  /**
   * Calculate token usage statistics
   */
  static calculateTokenStats(usages: TokenUsage[]): {
    totalInput: number;
    totalOutput: number;
    totalTokens: number;
    totalCost: number;
    averageInput: number;
    averageOutput: number;
    averageTotal: number;
    averageCost: number;
  } {
    if (usages.length === 0) {
      return {
        totalInput: 0,
        totalOutput: 0,
        totalTokens: 0,
        totalCost: 0,
        averageInput: 0,
        averageOutput: 0,
        averageTotal: 0,
        averageCost: 0,
      };
    }
    const totals = usages.reduce(
      (acc, usage) => ({
        input: acc.input + usage.input,
        output: acc.output + usage.output,
        total: acc.total + usage.total,
        cost: acc.cost + usage.cost,
      }),
      { input: 0, output: 0, total: 0, cost: 0 },
    );
    return {
      totalInput: totals.input,
      totalOutput: totals.output,
      totalTokens: totals.total,
      totalCost: totals.cost,
      averageInput: Math.round(totals.input / usages.length),
      averageOutput: Math.round(totals.output / usages.length),
      averageTotal: Math.round(totals.total / usages.length),
      averageCost: Math.round((totals.cost / usages.length) * 10000) / 10000, // 4 decimal places
    };
  }
  /**
   * Create token limit configuration
   */
  static createTokenLimitConfig(config: {
    totalLimit?: number;
    basePrompt?: number;
    guidelinePrompt?: number;
    safetyMargin?: number;
    compressionThreshold?: number;
  }): TokenLimitConfig {
    return {
      totalLimit: config.totalLimit ?? 40000,
      basePrompt: config.basePrompt ?? 20000,
      guidelinePrompt: config.guidelinePrompt ?? 20000,
      contextWindow: 0, // Calculated dynamically
      safetyMargin: config.safetyMargin ?? 0.05,
      compressionThreshold: config.compressionThreshold ?? 0.8,
    };
  }
  /**
   * Validate token usage against limits
   */
  static validateTokenUsage(
    usage: TokenUsage,
    limits: TokenLimitConfig,
  ): {
    isValid: boolean;
    exceededLimits: string[];
    utilizationRate: number;
  } {
    const exceededLimits: string[] = [];
    if (usage.total > limits.totalLimit) {
      exceededLimits.push(`Total: ${usage.total} > ${limits.totalLimit}`);
    }
    if (usage.input > limits.basePrompt) {
      exceededLimits.push(`Input: ${usage.input} > ${limits.basePrompt}`);
    }
    const utilizationRate = usage.total / limits.totalLimit;
    const isValid = exceededLimits.length === 0 && utilizationRate <= 1.0;
    return {
      isValid,
      exceededLimits,
      utilizationRate,
    };
  }
}
/**
 * Token estimation strategies for different content types
 */
export class TokenEstimator {
  /**
   * Estimate tokens for JSON content
   */
  static estimateJSONTokens(obj: unknown): number {
    const jsonString = JSON.stringify(obj, null, 0);
    return TokenManager.estimateTokens(jsonString);
  }
  /**
   * Estimate tokens for structured content
   */
  static estimateStructuredTokens(content: Record<string, unknown>): number {
    let totalTokens = 0;
    for (const [key, value] of Object.entries(content)) {
      // Key tokens
      totalTokens += TokenManager.estimateTokens(key);
      // Value tokens
      if (typeof value === 'string') {
        totalTokens += TokenManager.estimateTokens(value);
      } else if (Array.isArray(value)) {
        totalTokens += this.estimateArrayTokens(value);
      } else if (typeof value === 'object' && value !== null) {
        totalTokens += this.estimateStructuredTokens(value as Record<string, unknown>);
      } else {
        totalTokens += TokenManager.estimateTokens(String(value));
      }
    }
    return totalTokens;
  }
  /**
   * Estimate tokens for array content
   */
  private static estimateArrayTokens(array: unknown[]): number {
    let total = 0;
    for (const item of array) {
      if (typeof item === 'string') {
        total += TokenManager.estimateTokens(item);
      } else if (Array.isArray(item)) {
        total += this.estimateArrayTokens(item);
      } else if (typeof item === 'object' && item !== null) {
        total += this.estimateStructuredTokens(item as Record<string, unknown>);
      } else {
        total += TokenManager.estimateTokens(String(item));
      }
    }
    return total;
  }
  /**
   * Estimate tokens for code content
   */
  static estimateCodeTokens(code: string): number {
    // Code is typically more token-dense than natural language
    // Use a slightly higher ratio
    return Math.ceil(code.length / 3.5);
  }
  /**
   * Estimate tokens for markdown content
   */
  static estimateMarkdownTokens(markdown: string): number {
    // Markdown includes formatting characters that count as tokens
    return Math.ceil(markdown.length / 3.8);
  }
}
