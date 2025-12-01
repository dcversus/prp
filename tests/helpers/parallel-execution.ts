/**
 * Parallel Test Execution Framework
 *
 * Advanced test orchestration system for:
 * - Parallel test execution with proper isolation
 * - Resource management and cleanup
 * - Test scheduling and dependency resolution
 * - Load balancing across test workers
 * - Comprehensive reporting and metrics
 */

import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';
import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';

export interface TestSuite {
  name: string;
  tests: TestCase[];
  dependencies?: string[];
  maxConcurrency?: number;
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  retries?: number;
}

export interface TestCase {
  id: string;
  name: string;
  path: string;
  timeout: number;
  retries: number;
  resources: TestResources;
  dependencies?: string[];
  tags?: string[];
}

export interface TestResources {
  memory: number; // MB
  cpu: number; // cores
  disk: number; // MB
  network: boolean;
  tempDirs: number;
}

export interface TestResult {
  testCase: TestCase;
  success: boolean;
  duration: number;
  startTime: Date;
  endTime: Date;
  output: string;
  error?: string;
  metrics: TestMetrics;
  tempDirs: string[];
}

export interface TestMetrics {
  memoryUsage: {
    peak: number;
    average: number;
    final: number;
  };
  cpuUsage: number;
  diskUsage: number;
  networkRequests: number;
}

export interface ParallelTestConfig {
  maxWorkers: number;
  maxMemoryPerWorker: number; // MB
  maxGlobalMemory: number; // MB
  cleanupTimeout: number; // ms
  resourcePollingInterval: number; // ms
  loadBalancingStrategy: 'round-robin' | 'least-memory' | 'least-cpu';
  retryStrategy: 'exponential' | 'linear' | 'none';
}

export class ParallelTestExecutor extends EventEmitter {
  private config: ParallelTestConfig;
  private workers: Map<string, Worker> = new Map();
  private runningTests: Map<string, TestExecution> = new Map();
  private testQueue: TestCase[] = [];
  private completedTests: Map<string, TestResult> = new Map();
  private globalTempDirs: string[] = [];
  private resourceMonitor: ResourceMonitor;
  private loadBalancer: LoadBalancer;

  constructor(config?: Partial<ParallelTestConfig>) {
    super();

    this.config = {
      maxWorkers: Math.min(os.cpus().length, 8), // Limit to 8 workers max
      maxMemoryPerWorker: 512, // 512MB per worker
      maxGlobalMemory: os.totalmem() / 1024 / 1024 * 0.7, // 70% of total memory
      cleanupTimeout: 30000, // 30 seconds
      resourcePollingInterval: 1000, // 1 second
      loadBalancingStrategy: 'least-memory',
      retryStrategy: 'exponential',
      ...config
    };

    this.resourceMonitor = new ResourceMonitor(this.config);
    this.loadBalancer = new LoadBalancer(this.config);

    // Setup cleanup on process exit
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * Execute test suites in parallel with proper isolation
   */
  async executeTestSuites(testSuites: TestSuite[]): Promise<TestResult[]> {
    console.log(`🚀 Starting parallel test execution with ${this.config.maxWorkers} workers`);
    console.log(`📊 Test suites: ${testSuites.length}`);

    // Sort suites by priority and resolve dependencies
    const sortedSuites = this.sortSuitesByPriority(testSuites);
    const resolvedSuites = this.resolveDependencies(sortedSuites);

    // Initialize workers
    await this.initializeWorkers();

    // Execute suites respecting dependencies
    const results: TestResult[] = [];

    for (const suite of resolvedSuites) {
      console.log(`📋 Executing suite: ${suite.name} (${suite.tests.length} tests)`);

      const suiteResults = await this.executeSuite(suite);
      results.push(...suiteResults);

      // Emit progress
      this.emit('suiteCompleted', {
        suite: suite.name,
        results: suiteResults,
        totalCompleted: results.length,
        totalExpected: testSuites.reduce((sum, s) => sum + s.tests.length, 0)
      });
    }

    console.log(`✅ All test suites completed. Total results: ${results.length}`);
    return results;
  }

  /**
   * Execute a single test suite with controlled concurrency
   */
  private async executeSuite(suite: TestSuite): Promise<TestResult[]> {
    const maxConcurrency = Math.min(suite.maxConcurrency || this.config.maxWorkers, this.config.maxWorkers);
    const results: TestResult[] = [];

    // Add tests to queue
    this.testQueue.push(...suite.tests);

    // Execute tests with controlled concurrency
    const promises: Promise<TestResult>[] = [];

    for (let i = 0; i < maxConcurrency; i++) {
      promises.push(this.testWorker(suite.name));
    }

    const workerResults = await Promise.all(promises);
    results.push(...workerResults.filter(r => r !== null));

    return results;
  }

  /**
   * Test worker that processes tests from queue
   */
  private async testWorker(suiteName: string): Promise<TestResult | null> {
    const workerId = `${suiteName}-worker-${Date.now()}`;

    try {
      const worker = await this.createWorker(workerId);
      this.workers.set(workerId, worker);

      while (this.testQueue.length > 0) {
        const testCase = this.testQueue.shift();
        if (!testCase) break;

        // Check resource availability
        if (!await this.resourceMonitor.hasAvailableResources(testCase.resources)) {
          // Re-queue test and wait
          this.testQueue.push(testCase);
          await this.delay(1000);
          continue;
        }

        // Execute test
        const result = await this.executeTest(worker, testCase);

        // Store result
        this.completedTests.set(testCase.id, result);

        // Emit test completion
        this.emit('testCompleted', { testCase, result });
      }

      return null;
    } catch (error) {
      console.error(`Worker ${workerId} failed:`, error);
      return null;
    } finally {
      await this.cleanupWorker(workerId);
    }
  }

  /**
   * Execute individual test with isolation and monitoring
   */
  private async executeTest(worker: Worker, testCase: TestCase): Promise<TestResult> {
    const startTime = new Date();
    const tempDirs: string[] = [];

    try {
      // Create isolated temp directories
      for (let i = 0; i < testCase.resources.tempDirs; i++) {
        const tempDir = mkdtempSync(join(os.tmpdir(), `prp-test-${testCase.id}-${i}-`));
        tempDirs.push(tempDir);
        this.globalTempDirs.push(tempDir);
      }

      console.log(`🧪 Executing test: ${testCase.name} in ${tempDirs.length} temp dirs`);

      // Start resource monitoring
      const monitorPromise = this.resourceMonitor.monitorTest(testCase.id);

      // Execute test in worker
      const testPromise = new Promise<TestResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Test timeout after ${testCase.timeout}ms`));
        }, testCase.timeout);

        worker.once('message', (result) => {
          clearTimeout(timeout);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });

        worker.postMessage({
          type: 'execute',
          testCase: {
            ...testCase,
            tempDirs
          }
        });
      });

      // Wait for test completion or timeout
      const result = await testPromise;

      // Stop monitoring
      const metrics = await monitorPromise;

      const endTime = new Date();

      return {
        ...result,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        metrics,
        tempDirs
      };

    } catch (error) {
      const endTime = new Date();

      return {
        testCase,
        success: false,
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          memoryUsage: { peak: 0, average: 0, final: 0 },
          cpuUsage: 0,
          diskUsage: 0,
          networkRequests: 0
        },
        tempDirs
      };
    }
  }

  /**
   * Create isolated worker thread
   */
  private async createWorker(workerId: string): Promise<Worker> {
    const workerCode = `
      const { parentPort } = require('worker_threads');
      const { performance } = require('perf_hooks');

      parentPort.on('message', async (message) => {
        if (message.type === 'execute') {
          try {
            const { testCase } = message;
            const startTime = performance.now();

            // Load and execute test file
            const testModule = require(testCase.path);

            // Execute test with isolation
            const result = await testModule.default?.() || testModule();

            const endTime = performance.now();

            parentPort.postMessage({
              testCase: testCase.id,
              success: true,
              duration: endTime - startTime,
              output: result.output || '',
              error: null
            });
          } catch (error) {
            parentPort.postMessage({
              testCase: testCase.id,
              success: false,
              duration: 0,
              output: '',
              error: error.message
            });
          }
        }
      });
    `;

    const worker = new Worker(workerCode, {
      resourceLimits: {
        maxOldGenerationSizeMb: this.config.maxMemoryPerWorker
      }
    });

    return worker;
  }

  /**
   * Sort test suites by priority
   */
  private sortSuitesByPriority(suites: TestSuite[]): TestSuite[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return suites.sort((a, b) => {
      const priorityA = priorityOrder[a.priority || 'medium'];
      const priorityB = priorityOrder[b.priority || 'medium'];
      return priorityA - priorityB;
    });
  }

  /**
   * Resolve test suite dependencies
   */
  private resolveDependencies(suites: TestSuite[]): TestSuite[] {
    const suiteMap = new Map(suites.map(s => [s.name, s]));
    const resolved: TestSuite[] = [];
    const visited = new Set<string>();

    const resolve = (suiteName: string) => {
      if (visited.has(suiteName)) return;
      visited.add(suiteName);

      const suite = suiteMap.get(suiteName);
      if (!suite) return;

      // Resolve dependencies first
      if (suite.dependencies) {
        suite.dependencies.forEach(dep => resolve(dep));
      }

      resolved.push(suite);
    };

    suites.forEach(suite => resolve(suite.name));
    return resolved;
  }

  /**
   * Clean up worker and associated resources
   */
  private async cleanupWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      await worker.terminate();
      this.workers.delete(workerId);
    }
  }

  /**
   * Initialize all workers
   */
  private async initializeWorkers(): Promise<void> {
    console.log(`🔧 Initializing ${this.config.maxWorkers} workers`);
    // Workers are created on-demand in testWorker method
  }

  /**
   * Comprehensive cleanup
   */
  public async cleanup(): Promise<void> {
    console.log('🧹 Starting comprehensive cleanup...');

    // Cleanup workers
    const workerCleanupPromises = Array.from(this.workers.entries()).map(
      ([id]) => this.cleanupWorker(id)
    );
    await Promise.all(workerCleanupPromises);

    // Cleanup temp directories
    for (const tempDir of this.globalTempDirs) {
      if (existsSync(tempDir)) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to cleanup temp directory: ${tempDir}`, error);
        }
      }
    }
    this.globalTempDirs = [];

    // Stop resource monitor
    await this.resourceMonitor.stop();

    console.log('✅ Cleanup completed');
  }

  /**
   * Generate execution report
   */
  public generateReport(): {
    summary: any;
    suiteResults: TestResult[];
    performanceMetrics: any;
    resourceUsage: any;
  } {
    const results = Array.from(this.completedTests.values());
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const summary = {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / results.length) * 100,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
    };

    const performanceMetrics = {
      slowestTest: results.reduce((max, r) => r.duration > max.duration ? r : max, results[0]),
      fastestTest: results.reduce((min, r) => r.duration < min.duration ? r : min, results[0]),
      memoryUsage: {
        peak: Math.max(...results.map(r => r.metrics.memoryUsage.peak)),
        average: results.reduce((sum, r) => sum + r.metrics.memoryUsage.average, 0) / results.length
      }
    };

    const resourceUsage = this.resourceMonitor.getUsageReport();

    return {
      summary,
      suiteResults: results,
      performanceMetrics,
      resourceUsage
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class ResourceMonitor {
  private config: ParallelTestConfig;
  private monitoring = new Map<string, any>();
  private intervalId?: NodeJS.Timeout;

  constructor(config: ParallelTestConfig) {
    this.config = config;
  }

  async hasAvailableResources(requested: TestResources): Promise<boolean> {
    const currentUsage = process.memoryUsage();
    const availableMemory = this.config.maxGlobalMemory - (currentUsage.heapUsed / 1024 / 1024);

    return (
      availableMemory >= requested.memory &&
      this.monitoring.size < this.config.maxWorkers
    );
  }

  async monitorTest(testId: string): Promise<TestMetrics> {
    const startMemory = process.memoryUsage();
    let peakMemory = startMemory.heapUsed;
    let totalCpu = 0;
    let samples = 0;

    this.monitoring.set(testId, { startMemory, peakMemory, totalCpu, samples });

    const interval = setInterval(() => {
      const current = process.memoryUsage();
      peakMemory = Math.max(peakMemory, current.heapUsed);
      samples++;
    }, this.config.resourcePollingInterval);

    return new Promise((resolve) => {
      // This will be resolved when monitoring is stopped
      this.monitoring.set(testId, { ...this.monitoring.get(testId), interval, resolve });
    });
  }

  async stop(): Promise<void> {
    for (const [testId, monitoring] of this.monitoring) {
      if (monitoring.interval) {
        clearInterval(monitoring.interval);
      }
    }
    this.monitoring.clear();
  }

  getUsageReport(): any {
    return {
      activeMonitors: this.monitoring.size,
      config: this.config
    };
  }
}

class LoadBalancer {
  private config: ParallelTestConfig;
  private workerStats = new Map<string, any>();

  constructor(config: ParallelTestConfig) {
    this.config = config;
  }

  selectWorker(workers: string[]): string {
    switch (this.config.loadBalancingStrategy) {
      case 'least-memory':
        return this.selectByMemoryUsage(workers);
      case 'least-cpu':
        return this.selectByCpuUsage(workers);
      case 'round-robin':
      default:
        return this.selectRoundRobin(workers);
    }
  }

  private selectByMemoryUsage(workers: string[]): string {
    // Simplified - in real implementation would track actual memory usage
    return workers[0];
  }

  private selectByCpuUsage(workers: string[]): string {
    // Simplified - in real implementation would track actual CPU usage
    return workers[0];
  }

  private selectRoundRobin(workers: string[]): string {
    // Simplified round-robin implementation
    return workers[0];
  }
}

// Export singleton instance
export const parallelTestExecutor = new ParallelTestExecutor();

// Export convenience functions
export async function runTestsInParallel(testSuites: TestSuite[], config?: Partial<ParallelTestConfig>): Promise<TestResult[]> {
  const executor = new ParallelTestExecutor(config);
  return await executor.executeTestSuites(testSuites);
}