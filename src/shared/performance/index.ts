/**
 * Performance optimization module for PRP CLI
 *
 * Features:
 * - Startup time optimization (<2 seconds target)
 * - Memory usage optimization (<50MB target)
 * - Signal processing optimization (<100ms latency target)
 * - Comprehensive performance monitoring
 * - Automated performance testing
 */

import { performanceMonitor } from './monitor.js';
import { signalProcessor } from './signal-processor.js';
import { performanceCache } from './cache.js';
import { LazyImport } from './lazy-loader.js';

export * from './monitor.js';
export * from './cache.js';
export * from './lazy-loader.js';
export * from './signal-processor.js';
export * from './tests.js';

// Re-export commonly used utilities with aliases for compatibility
export { LazyImport as LazyLoader } from './lazy-loader.js';

// Performance report interfaces
interface MemoryUsage {
  rss: number;
  heapUsed: number;
  heapTotal: number;
}

interface MonitorMetrics {
  startupTime: number;
  memoryUsage: MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

interface SignalMetrics {
  averageLatency: number;
  throughputPerSecond: number;
  errorRate: number;
  [key: string]: unknown;
}

interface CacheStats {
  [key: string]: {
    hitRate: number;
    size: number;
    [key: string]: unknown;
  };
}

interface ThresholdStatus {
  passed: boolean;
  violations: Array<{
    metric: string;
    actual: number;
    threshold: number;
  }>;
}

interface PerformanceReport {
  timestamp: string;
  system: {
    startup: number;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    cpu: NodeJS.CpuUsage;
  };
  signalProcessing: SignalMetrics;
  cache: CacheStats;
  thresholds: {
    passed: boolean;
    violations: ThresholdStatus['violations'];
  };
  recommendations: string[];
}

// Export performance measurement functions for compatibility
export function measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return performanceManager.measureStartup(name, fn);
}

// Export a simple lazy loader wrapper for compatibility
export function createLazyLoader<T>(importFn: () => Promise<T>): LazyImport<T> {
  return new LazyImport(importFn);
}

// Performance decorator for methods
export function measurePerformanceDecorator(name: string) {
  return function (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        // console.log(`Performance: ${name} took ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        // console.log(`Performance: ${name} failed after ${duration}ms`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

// Performance management utilities
export class PerformanceManager {
  private static instance: PerformanceManager;
  private performanceMonitor = performanceMonitor;
  private signalProcessor = signalProcessor;
  private performanceCache = performanceCache;

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  // Initialize performance monitoring
  initialize(): void {
    this.performanceMonitor.startMeasurement();
    this.performanceCache.warmUpCache();
  }

  // Enable all performance optimizations
  enableOptimizations(): void {
    // Enable garbage collection hints
    if (process.env.NODE_ENV === 'development' && !global.gc) {
      // @ts-expect-error - global.gc may not be available
      global.gc = () => {};
    }

    // Set up performance thresholds
    this.performanceMonitor.setThresholds({
      startupTime: 2000, // 2 seconds
      memoryRSS: 50 * 1024 * 1024, // 50MB
      memoryHeapUsed: 30 * 1024 * 1024, // 30MB
      commandLatency: 100 // 100ms
    });

    // Enable memory monitoring
    this.startMemoryMonitoring();
  }

  // Get comprehensive performance report
  getReport(): PerformanceReport {
    const monitorMetrics = this.performanceMonitor.getCurrentMetrics();
    const signalMetrics = this.signalProcessor.getMetrics();
    const cacheStats = this.performanceCache.getAllStats();
    const thresholdStatus = this.performanceMonitor.checkThresholds();

    return {
      timestamp: new Date().toISOString(),
      system: {
        startup: monitorMetrics.startupTime,
        memory: {
          rss: Math.round(monitorMetrics.memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(monitorMetrics.memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(monitorMetrics.memoryUsage.heapTotal / 1024 / 1024)
        },
        cpu: monitorMetrics.cpuUsage
      },
      signalProcessing: {
        ...signalMetrics,
        averageLatency: Math.round(signalMetrics.averageLatency * 100) / 100,
        throughputPerSecond: Math.round(signalMetrics.throughputPerSecond * 100) / 100
      },
      cache: cacheStats as unknown as CacheStats,
      thresholds: {
        passed: thresholdStatus.passed,
        violations: thresholdStatus.violations as unknown as Array<{ metric: string; actual: number; threshold: number }>
      },
      recommendations: this.generateRecommendations(monitorMetrics, signalMetrics as unknown as SignalMetrics, thresholdStatus as unknown as ThresholdStatus)
    };
  }

  private generateRecommendations(monitorMetrics: MonitorMetrics, signalMetrics: SignalMetrics, thresholdStatus: ThresholdStatus): string[] {
    const recommendations: string[] = [];

    if (monitorMetrics.startupTime > 1500) {
      recommendations.push('Consider more aggressive lazy loading to reduce startup time');
    }

    if (monitorMetrics.memoryUsage.heapUsed > 40 * 1024 * 1024) {
      recommendations.push('Memory usage is high, review caching strategies and module loading');
    }

    if (signalMetrics.averageLatency > 80) {
      recommendations.push('Signal processing latency is high, consider optimizing critical paths');
    }

    if (signalMetrics.errorRate > 0.02) {
      recommendations.push('Error rate is elevated, review error handling and input validation');
    }

    if (!thresholdStatus.passed) {
      recommendations.push('Performance thresholds exceeded, review system resources and optimization strategies');
    }

    const cacheStats = Object.values(this.performanceCache.getAllStats());
    const cacheHitRate = cacheStats.length > 0
      ? cacheStats.reduce((acc: number, stat) => acc + stat.hitRate, 0) / cacheStats.length
      : 0;
    if (cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate is low, review caching strategies and TTL settings');
    }

    return recommendations;
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();

      // Warn if memory usage is high
      if (memUsage.heapUsed > 40 * 1024 * 1024) { // 40MB
        // console.warn(`High memory usage detected: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }

      // Force garbage collection if available and memory is very high
      if (memUsage.heapUsed > 60 * 1024 * 1024 && global.gc) { // 60MB
        global.gc();
      }
    }, 30000); // Check every 30 seconds
  }

  // Performance measurement utilities
  async measureStartup<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    this.performanceMonitor.recordMetric(name, Date.now());
    return result;
  }

  startOperation(name: string): void {
    this.performanceMonitor.recordMetric(`operation:${name}:start`, Date.now());
  }

  endOperation(name: string): void {
    this.performanceMonitor.recordMetric(`operation:${name}:end`, Date.now());
  }

  async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.performanceCache.getConfigCache().get(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    const result = await fn();
    this.performanceCache.getConfigCache().set(key, result);
    return result;
  }
}

// Global performance manager instance
export const performanceManager = PerformanceManager.getInstance();

// Performance optimization utilities
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

export function memoize<T extends (...args: unknown[]) => unknown>(fn: T, cacheSize = 100): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;

    // Implement simple LRU
    if (cache.size >= cacheSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, result);
    return result;
  }) as T;
}

// Initialize performance monitoring on import
performanceManager.initialize();