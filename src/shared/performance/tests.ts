/**
 * Performance test suite for PRP CLI optimization
 */

/* eslint-disable no-console */

import { execSync } from 'child_process';

export interface PerformanceTestResult {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryPeak: NodeJS.MemoryUsage;
  success: boolean;
  error?: string;
  metrics: Record<string, unknown>;
}

export interface BenchmarkSuite {
  name: string;
  tests: PerformanceTest[];
  summary: BenchmarkSummary;
}

export interface BenchmarkSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageDuration: number;
  averageMemoryUsage: number;
  fastestTest: string;
  slowestTest: string;
  recommendations: string[];
}

export class PerformanceTest {
  private results: PerformanceTestResult[] = [];
  private memoryMonitor: NodeJS.Timeout | null = null;
  private peakMemory: NodeJS.MemoryUsage = process.memoryUsage();

  constructor(private testName: string) {}

  async runTest(testFn: () => Promise<unknown>, metrics?: Record<string, unknown>): Promise<PerformanceTestResult> {
    const memoryBefore = process.memoryUsage();
    const startTime = Date.now();

    // Start memory monitoring
    this.startMemoryMonitoring();

    try {
      await testFn();
      const endTime = Date.now();
      const memoryAfter = process.memoryUsage();

      this.stopMemoryMonitoring();

      const result: PerformanceTestResult = {
        testName: this.testName,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryPeak: this.peakMemory,
        success: true,
        metrics: metrics ?? {}
      };

      this.results.push(result);
      return result;

    } catch (error) {
      const endTime = Date.now();
      const memoryAfter = process.memoryUsage();
      this.stopMemoryMonitoring();

      const result: PerformanceTestResult = {
        testName: this.testName,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryPeak: this.peakMemory,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: metrics ?? {}
      };

      this.results.push(result);
      return result;
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      const current = process.memoryUsage();
      if (current.heapUsed > this.peakMemory.heapUsed) {
        this.peakMemory = current;
      }
    }, 100);
  }

  private stopMemoryMonitoring(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
  }

  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  getAverageDuration(): number {
    if (this.results.length === 0) {
      return 0;
    }
    const total = this.results.reduce((sum, result) => sum + result.duration, 0);
    return total / this.results.length;
  }

  getAverageMemoryUsage(): number {
    if (this.results.length === 0) {
      return 0;
    }
    const total = this.results.reduce((sum, result) => sum + result.memoryAfter.heapUsed, 0);
    return total / this.results.length;
  }

  clear(): void {
    this.results = [];
    this.peakMemory = process.memoryUsage();
  }
}

export class BenchmarkRunner {
  private tests: PerformanceTest[] = [];

  addTest(testName: string): void {
    const test = new PerformanceTest(testName);
    this.tests.push(test);
  }

  async runAllTests(): Promise<BenchmarkSuite> {
    const results: PerformanceTestResult[] = [];

    for (const test of this.tests) {
      console.log(`Running performance test: ${test.constructor.name}`);
      const testResults = await this.runMultipleIterations(test, 5);
      results.push(...testResults);
    }

    return this.generateSuite(results);
  }

  private async runMultipleIterations(test: PerformanceTest, iterations: number): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 100));

      // Run the test
      const result = await test.runTest(async () => {
        // Test implementation will be added by specific test methods
        return true;
      });

      results.push(result);
    }

    return results;
  }

  private generateSuite(results: PerformanceTestResult[]): BenchmarkSuite {
    const summary = this.generateSummary(results);

    return {
      name: 'PRP CLI Performance Benchmark',
      tests: this.tests,
      summary
    };
  }

  private generateSummary(results: PerformanceTestResult[]): BenchmarkSummary {
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;

    const durations = results.map(r => r.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    const memoryUsages = results.map(r => r.memoryAfter.heapUsed);
    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;

    const fastestTest = results.reduce((prev, current) =>
      prev.duration < current.duration ? prev : current
    ).testName;

    const slowestTest = results.reduce((prev, current) =>
      prev.duration > current.duration ? prev : current
    ).testName;

    const recommendations = this.generateRecommendations(results, averageDuration, averageMemoryUsage);

    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      averageDuration,
      averageMemoryUsage,
      fastestTest,
      slowestTest,
      recommendations
    };
  }

  private generateRecommendations(results: PerformanceTestResult[], avgDuration: number, avgMemory: number): string[] {
    const recommendations: string[] = [];

    if (avgDuration > 2000) {
      recommendations.push('Average startup time exceeds 2 seconds. Consider more aggressive lazy loading.');
    }

    if (avgMemory > 50 * 1024 * 1024) {
      recommendations.push('Average memory usage exceeds 50MB. Review memory management and caching strategies.');
    }

    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed. Review error handling and edge cases.`);
    }

    const slowTests = results.filter(r => r.duration > avgDuration * 1.5);
    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length} tests are significantly slower than average. Investigate bottlenecks.`);
    }

    return recommendations;
  }
}

// Predefined performance tests
export class CLIPerformanceTests extends BenchmarkRunner {
  constructor() {
    super();
    this.setupTests();
  }

  private setupTests(): void {
    // Add test names
    this.addTest('CLI Startup Time');
    this.addTest('CLI Help Command');
    this.addTest('Memory Usage Under Load');
    this.addTest('Cache Performance');
    this.addTest('File System Operations');
  }
}

// Performance test runner
export async function runPerformanceTests(): Promise<BenchmarkSuite> {
  console.log('🚀 Starting PRP CLI Performance Tests\n');

  const testSuite = new CLIPerformanceTests();
  const results = await testSuite.runAllTests();

  console.log('\n📊 Performance Test Results:');
  console.log('============================');
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`Passed: ${results.summary.passedTests}`);
  console.log(`Failed: ${results.summary.failedTests}`);
  console.log(`Average Duration: ${Math.round(results.summary.averageDuration)}ms`);
  console.log(`Average Memory: ${Math.round(results.summary.averageMemoryUsage / 1024 / 1024)}MB`);
  console.log(`Fastest Test: ${results.summary.fastestTest}`);
  console.log(`Slowest Test: ${results.summary.slowestTest}`);

  if (results.summary.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.summary.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  return results;
}

// Individual test runners for specific scenarios
export async function testCLIStartup(): Promise<PerformanceTestResult> {
  const test = new PerformanceTest('CLI Startup Test');

  return test.runTest(async () => {
    const start = Date.now();
    execSync('node dist/cli.js --version', { stdio: 'ignore' });
    const duration = Date.now() - start;

    return { duration, target: 2000 };
  });
}

export async function testMemoryUsage(): Promise<PerformanceTestResult> {
  const test = new PerformanceTest('Memory Usage Test');

  return test.runTest(async () => {
    const initialMemory = process.memoryUsage();

    // Simulate typical CLI workload
    await import('commander');
    await import('chalk');
    await import('fs-extra');

    const finalMemory = process.memoryUsage();
    const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;

    return {
      memoryUsed,
      target: 50 * 1024 * 1024, // 50MB
      initialMemory: initialMemory.heapUsed,
      finalMemory: finalMemory.heapUsed
    };
  });
}