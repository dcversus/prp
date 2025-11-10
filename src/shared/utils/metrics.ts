/**
 * ♫ Metrics and Performance Utilities for @dcversus/prp
 *
 * Shared utilities for performance metrics, throughput calculation, and monitoring.
 */

export interface PerformanceMetrics {
  startTime: Date;
  totalProcessed: number;
  successfulOperations: number;
  failedOperations: number;
  averageProcessingTime: number;
  averageTokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  successRate: number;
  tokenEfficiency: number;
  queueLength: number;
  processingRate: number;
  errorRate: number;
  byCategory: Record<string, {
    count: number;
    averageTime: number;
    successRate: number;
  }>;
  byUrgency: Record<string, {
    count: number;
    averageTime: number;
    tokenUsage: number;
  }>;
  performance: {
    fastestOperation: number;
    slowestOperation: number;
    peakThroughput: number;
    memoryUsage: number;
  };
}

export interface OperationResult {
  processingTime: number;
  success: boolean;
  category?: string;
  urgency?: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  timestamp: Date;
}

export interface TimeWindow {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

/**
 * Metrics Calculator Utility Class
 */
export class MetricsCalculator {
  /**
   * Calculate comprehensive metrics from operation results
   */
  static calculateMetrics(
    results: OperationResult[],
    startTime: Date,
    currentQueueLength: number = 0
  ): PerformanceMetrics {
    if (results.length === 0) {
      return this.createEmptyMetrics(startTime);
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Basic metrics
    const totalProcessed = results.length;
    const successfulOperations = successful.length;
    const failedOperations = failed.length;
    const successRate = (successfulOperations / totalProcessed) * 100;
    const errorRate = (failedOperations / totalProcessed) * 100;

    // Processing time metrics
    const processingTimes = results.map(r => r.processingTime);
    const averageProcessingTime = this.calculateAverage(processingTimes);
    const fastestOperation = Math.min(...processingTimes);
    const slowestOperation = Math.max(...processingTimes);

    // Token usage metrics
    const tokenUsages = results
      .filter(r => r.tokenUsage)
      .map(r => r.tokenUsage!);
    const averageTokenUsage = this.calculateAverageTokenUsage(tokenUsages);

    // Processing rate (operations per minute)
    const timeWindowMs = Date.now() - startTime.getTime();
    const processingRate = this.calculateProcessingRate(totalProcessed, timeWindowMs);

    // Peak throughput calculation
    const peakThroughput = this.calculatePeakThroughput(results);

    // Category-based metrics
    const byCategory = this.calculateCategoryMetrics(results);

    // Urgency-based metrics
    const byUrgency = this.calculateUrgencyMetrics(results);

    // Token efficiency
    const tokenEfficiency = this.calculateTokenEfficiency(successful, averageTokenUsage);

    return {
      startTime,
      totalProcessed,
      successfulOperations,
      failedOperations,
      averageProcessingTime,
      averageTokenUsage,
      successRate,
      tokenEfficiency,
      queueLength: currentQueueLength,
      processingRate,
      errorRate,
      byCategory,
      byUrgency,
      performance: {
        fastestOperation,
        slowestOperation,
        peakThroughput,
        memoryUsage: 0 // Would be calculated from system metrics
      }
    };
  }

  /**
   * Calculate average of numbers
   */
  static calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) {
      return 0;
    }
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(
    values: number[],
    windowSize: number
  ): number[] {
    if (values.length === 0) {
      return [];
    }
    if (windowSize >= values.length) {
      return [this.calculateAverage(values)];
    }

    const movingAverages: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      movingAverages.push(this.calculateAverage(window));
    }

    return movingAverages;
  }

  /**
   * Calculate percentile
   */
  static calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) {
      return 0;
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Calculate processing rate (operations per minute)
   */
  static calculateProcessingRate(
    totalOperations: number,
    timeWindowMs: number
  ): number {
    if (timeWindowMs === 0) {
      return 0;
    }
    const timeWindowMinutes = timeWindowMs / (1000 * 60);
    return totalOperations / timeWindowMinutes;
  }

  /**
   * Calculate peak throughput
   */
  static calculatePeakThroughput(results: OperationResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    // Group results by minute windows
    const minuteWindows: Record<string, OperationResult[]> = {};

    for (const result of results) {
      const minuteKey = new Date(result.timestamp).toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
      if (!minuteWindows[minuteKey]) {
        minuteWindows[minuteKey] = [];
      }
      minuteWindows[minuteKey].push(result);
    }

    // Find the minute with most operations
    const maxOperations = Math.max(
      ...Object.values(minuteWindows).map(window => window.length)
    );

    return maxOperations;
  }

  /**
   * Calculate category-based metrics
   */
  static calculateCategoryMetrics(
    results: OperationResult[]
  ): Record<string, { count: number; averageTime: number; successRate: number }> {
    const categoryGroups: Record<string, OperationResult[]> = {};

    // Group by category
    for (const result of results) {
      const category = result.category || 'unknown';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(result);
    }

    // Calculate metrics for each category
    const metrics: Record<string, { count: number; averageTime: number; successRate: number }> = {};

    for (const [category, categoryResults] of Object.entries(categoryGroups)) {
      const successful = categoryResults.filter(r => r.success).length;
      const averageTime = this.calculateAverage(categoryResults.map(r => r.processingTime));
      const successRate = (successful / categoryResults.length) * 100;

      metrics[category] = {
        count: categoryResults.length,
        averageTime,
        successRate
      };
    }

    return metrics;
  }

  /**
   * Calculate urgency-based metrics
   */
  static calculateUrgencyMetrics(
    results: OperationResult[]
  ): Record<string, { count: number; averageTime: number; tokenUsage: number }> {
    const urgencyGroups: Record<string, OperationResult[]> = {};

    // Group by urgency
    for (const result of results) {
      const urgency = result.urgency || 'medium';
      if (!urgencyGroups[urgency]) {
        urgencyGroups[urgency] = [];
      }
      urgencyGroups[urgency].push(result);
    }

    // Calculate metrics for each urgency level
    const metrics: Record<string, { count: number; averageTime: number; tokenUsage: number }> = {};

    for (const [urgency, urgencyResults] of Object.entries(urgencyGroups)) {
      const averageTime = this.calculateAverage(urgencyResults.map(r => r.processingTime));
      const tokenUsages = urgencyResults
        .filter(r => r.tokenUsage)
        .map(r => r.tokenUsage!.total);
      const averageTokenUsage = tokenUsages.length > 0 ? this.calculateAverage(tokenUsages) : 0;

      metrics[urgency] = {
        count: urgencyResults.length,
        averageTime,
        tokenUsage: averageTokenUsage
      };
    }

    return metrics;
  }

  /**
   * Calculate average token usage
   */
  static calculateAverageTokenUsage(
    tokenUsages: { input: number; output: number; total: number }[]
  ): { input: number; output: number; total: number } {
    if (tokenUsages.length === 0) {
      return { input: 0, output: 0, total: 0 };
    }

    const totals = tokenUsages.reduce(
      (acc, usage) => ({
        input: acc.input + usage.input,
        output: acc.output + usage.output,
        total: acc.total + usage.total
      }),
      { input: 0, output: 0, total: 0 }
    );

    const count = tokenUsages.length;
    return {
      input: Math.round(totals.input / count),
      output: Math.round(totals.output / count),
      total: Math.round(totals.total / count)
    };
  }

  /**
   * Calculate token efficiency
   */
  static calculateTokenEfficiency(
    successfulResults: OperationResult[],
    averageTokenUsage: { input: number; output: number; total: number }
  ): number {
    if (successfulResults.length === 0 || averageTokenUsage.total === 0) {
      return 0;
    }

    // Simple efficiency metric: success rate divided by average token usage
    const successRate = 1; // All successfulResults are successful
    const tokenFactor = Math.log10(averageTokenUsage.total + 1) / 10; // Logarithmic scaling

    return successRate / Math.max(1, tokenFactor);
  }

  /**
   * Create empty metrics structure
   */
  private static createEmptyMetrics(startTime: Date): PerformanceMetrics {
    return {
      startTime,
      totalProcessed: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageProcessingTime: 0,
      averageTokenUsage: { input: 0, output: 0, total: 0 },
      successRate: 0,
      tokenEfficiency: 0,
      queueLength: 0,
      processingRate: 0,
      errorRate: 0,
      byCategory: {},
      byUrgency: {},
      performance: {
        fastestOperation: 0,
        slowestOperation: 0,
        peakThroughput: 0,
        memoryUsage: 0
      }
    };
  }

  /**
   * Calculate performance trends
   */
  static calculateTrends(
    historicalMetrics: PerformanceMetrics[]
  ): {
    processingRateTrend: 'increasing' | 'decreasing' | 'stable';
    successRateTrend: 'increasing' | 'decreasing' | 'stable';
    averageTimeTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (historicalMetrics.length < 2) {
      return {
        processingRateTrend: 'stable',
        successRateTrend: 'stable',
        averageTimeTrend: 'stable'
      };
    }

    const recent = historicalMetrics.slice(-3); // Last 3 metrics
    const older = historicalMetrics.slice(-6, -3); // 3-6 metrics ago

    if (older.length === 0) {
      return {
        processingRateTrend: 'stable',
        successRateTrend: 'stable',
        averageTimeTrend: 'stable'
      };
    }

    const recentAvg = {
      processingRate: this.calculateAverage(recent.map(m => m.processingRate)),
      successRate: this.calculateAverage(recent.map(m => m.successRate)),
      averageTime: this.calculateAverage(recent.map(m => m.averageProcessingTime))
    };

    const olderAvg = {
      processingRate: this.calculateAverage(older.map(m => m.processingRate)),
      successRate: this.calculateAverage(older.map(m => m.successRate)),
      averageTime: this.calculateAverage(older.map(m => m.averageProcessingTime))
    };

    const threshold = 0.05; // 5% threshold for trend detection

    return {
      processingRateTrend: this.getTrend(recentAvg.processingRate, olderAvg.processingRate, threshold),
      successRateTrend: this.getTrend(recentAvg.successRate, olderAvg.successRate, threshold),
      averageTimeTrend: this.getTrend(olderAvg.averageTime, recentAvg.averageTime, threshold) // Inverted for time (lower is better)
    };
  }

  /**
   * Determine trend direction
   */
  private static getTrend(
    recent: number,
    older: number,
    threshold: number
  ): 'increasing' | 'decreasing' | 'stable' {
    const change = (recent - older) / older;

    if (change > threshold) {
      return 'increasing';
    }
    if (change < -threshold) {
      return 'decreasing';
    }
    return 'stable';
  }
}

/**
 * Performance Monitor Utility Class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private operationHistory: Map<string, OperationResult[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record an operation result
   */
  recordOperation(component: string, result: OperationResult): void {
    if (!this.operationHistory.has(component)) {
      this.operationHistory.set(component, []);
    }

    const history = this.operationHistory.get(component)!;
    history.push(result);

    // Keep only last 1000 operations to prevent memory issues
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Update metrics
    this.updateComponentMetrics(component);
  }

  /**
   * Get metrics for a component
   */
  getMetrics(component: string): PerformanceMetrics | null {
    return this.metrics.get(component) || null;
  }

  /**
   * Get all component metrics
   */
  getAllMetrics(): Record<string, PerformanceMetrics> {
    const result: Record<string, PerformanceMetrics> = {};
    for (const [component, metrics] of Array.from(this.metrics.entries())) {
      result[component] = metrics;
    }
    return result;
  }

  /**
   * Update metrics for a component
   */
  private updateComponentMetrics(component: string): void {
    const history = this.operationHistory.get(component);
    if (!history || history.length === 0) {
      return;
    }

    const startTime = history[0].timestamp;
    const currentQueueLength = 0; // Would be injected from component

    this.metrics.set(component, MetricsCalculator.calculateMetrics(history, startTime, currentQueueLength));
  }

  /**
   * Clear metrics for a component
   */
  clearMetrics(component: string): void {
    this.operationHistory.delete(component);
    this.metrics.delete(component);
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.operationHistory.clear();
    this.metrics.clear();
  }
}