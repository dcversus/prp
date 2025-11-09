/**
 * Performance Test Setup
 *
 * Configures the testing environment for performance tests.
 */

// Enable garbage collection for memory testing
if (typeof global.gc === 'undefined') {
  // @ts-ignore - global.gc is available when Node is run with --expose-gc
  global.gc = () => {
    console.warn('⚠️  Global garbage collection not available. Run Node.js with --expose-gc flag for accurate memory testing.');
  };
}

// Performance test environment variables
process.env.NODE_ENV = 'test';
process.env.PERFORMANCE_TEST = 'true';

// Increase timeout for performance tests
jest.setTimeout(60000);

// Configure console output for performance tests
const originalConsole = global.console;

beforeAll(() => {
  // Limit console output during performance tests to avoid noise
  global.console = {
    ...originalConsole,
    log: (...args: any[]) => {
      // Only log performance-related messages
      const message = args.join(' ');
      if (
        message.includes('⚡') ||
        message.includes('📊') ||
        message.includes('🚀') ||
        message.includes('✅') ||
        message.includes('❌') ||
        message.includes('⚠️') ||
        message.includes('📈') ||
        message.includes('💾') ||
        message.includes('Memory') ||
        message.includes('Performance') ||
        message.includes('Benchmark') ||
        message.includes('ms') ||
        message.includes('MB')
      ) {
        originalConsole.log(...args);
      }
    },
    warn: originalConsole.warn,
    error: originalConsole.error,
    info: (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('Performance')) {
        originalConsole.info(...args);
      }
    }
  };
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Global performance test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceThreshold(expected: number, threshold?: number): R;
      toMeetMemoryRequirement(maxMemoryMB: number): R;
    }
  }
}

// Custom matchers for performance assertions
expect.extend({
  toBeWithinPerformanceThreshold(received: number, expected: number, threshold: number = 0.1) {
    const lowerBound = expected * (1 - threshold);
    const upperBound = expected * (1 + threshold);
    const pass = received >= lowerBound && received <= upperBound;

    return {
      message: () =>
        pass
          ? `expected ${received} not to be within ${threshold * 100}% of ${expected}`
          : `expected ${received} to be within ${threshold * 100}% of ${expected} (between ${lowerBound} and ${upperBound})`,
      pass,
    };
  },

  toMeetMemoryRequirement(received: { memoryUsage: MemoryUsage; peakMemory: number }, maxMemoryMB: number) {
    const maxMemory = Math.max(received.memoryUsage.rss, received.peakMemory);
    const pass = maxMemory <= maxMemoryMB;

    return {
      message: () =>
        pass
          ? `expected memory usage ${maxMemory}MB not to be <= ${maxMemoryMB}MB`
          : `expected memory usage ${maxMemory}MB to be <= ${maxMemoryMB}MB`,
      pass,
    };
  },
});

interface MemoryUsage {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

// Performance test helper functions
export const performanceTestHelpers = {
  /**
   * Force garbage collection and wait for completion
   */
  async forceGC(): Promise<void> {
    if (typeof global.gc === 'function') {
      global.gc();
      // Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  },

  /**
   * Get current memory usage in MB
   */
  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
    };
  },

  /**
   * Measure execution time of an async function
   */
  async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    return { result, duration: Math.round(duration * 100) / 100 };
  },

  /**
   * Measure memory usage during function execution
   */
  async measureMemory<T>(fn: () => Promise<T>): Promise<{ result: T; memoryUsage: MemoryUsage; peakMemory: number }> {
    await this.forceGC();
    const baseline = this.getMemoryUsage();

    const memorySnapshots: MemoryUsage[] = [];
    const snapshotInterval = setInterval(() => {
      memorySnapshots.push(this.getMemoryUsage());
    }, 50);

    try {
      const result = await fn();

      clearInterval(snapshotInterval);
      await this.forceGC();
      const finalMemory = this.getMemoryUsage();

      const peakMemory = Math.max(
        ...memorySnapshots.map(m => m.rss),
        finalMemory.rss
      );

      return {
        result,
        memoryUsage: finalMemory,
        peakMemory: Math.round(peakMemory * 100) / 100,
      };
    } catch (error) {
      clearInterval(snapshotInterval);
      throw error;
    }
  },

  /**
   * Run multiple iterations of a function and return statistics
   */
  async runBenchmark<T>(
    fn: () => Promise<T>,
    iterations: number = 5
  ): Promise<{
    results: T[];
    durations: number[];
    memoryUsages: MemoryUsage[];
    peakMemories: number[];
    statistics: {
      meanDuration: number;
      minDuration: number;
      maxDuration: number;
      meanMemory: number;
      peakMemory: number;
    };
  }> {
    const results: T[] = [];
    const durations: number[] = [];
    const memoryUsages: MemoryUsage[] = [];
    const peakMemories: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measureTime(fn);
      const { memoryUsage, peakMemory } = await this.measureMemory(fn);

      results.push(result);
      durations.push(duration);
      memoryUsages.push(memoryUsage);
      peakMemories.push(peakMemory);

      // Force GC between iterations
      await this.forceGC();
    }

    const statistics = {
      meanDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      meanMemory: memoryUsages.reduce((sum, m) => sum + m.rss, 0) / memoryUsages.length,
      peakMemory: Math.max(...peakMemories),
    };

    return {
      results,
      durations,
      memoryUsages,
      peakMemories,
      statistics: {
        meanDuration: Math.round(statistics.meanDuration * 100) / 100,
        minDuration: Math.round(statistics.minDuration * 100) / 100,
        maxDuration: Math.round(statistics.maxDuration * 100) / 100,
        meanMemory: Math.round(statistics.meanMemory * 100) / 100,
        peakMemory: Math.round(statistics.peakMemory * 100) / 100,
      },
    };
  },
};

// Export for use in tests
(global as any).performanceTestHelpers = performanceTestHelpers;