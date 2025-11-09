/**
 * Performance Testing Utilities
 *
 * Provides comprehensive performance measurement and monitoring capabilities
 * for CLI applications and template generation operations.
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { createWriteStream, WriteStream } from 'fs';

export interface PerformanceMetrics {
  /** Operation name */
  operation: string;
  /** Start timestamp in milliseconds */
  startTime: number;
  /** End timestamp in milliseconds */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Memory usage in MB */
  memoryUsage: MemoryUsage;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface MemoryUsage {
  /** RSS memory in MB */
  rss: number;
  /** Heap used in MB */
  heapUsed: number;
  /** Heap total in MB */
  heapTotal: number;
  /** External memory in MB */
  external: number;
}

export interface PerformanceBenchmark {
  /** Benchmark name */
  name: string;
  /** Performance requirements */
  requirements: PerformanceRequirements;
  /** Measured metrics */
  metrics: PerformanceMetrics[];
  /** Statistics */
  statistics: PerformanceStatistics;
}

export interface PerformanceRequirements {
  /** Maximum duration in milliseconds */
  maxDuration: number;
  /** Maximum memory usage in MB */
  maxMemoryMB: number;
  /** Maximum CPU usage percentage */
  maxCpuUsage?: number;
}

export interface PerformanceStatistics {
  /** Mean duration */
  meanDuration: number;
  /** Median duration */
  medianDuration: number;
  /** Minimum duration */
  minDuration: number;
  /** Maximum duration */
  maxDuration: number;
  /** Standard deviation */
  standardDeviation: number;
  /** 95th percentile */
  percentile95: number;
  /** Success rate */
  successRate: number;
  /** Number of samples */
  sampleCount: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;
  private baselineMemory?: NodeJS.MemoryUsage;

  constructor(private operationName: string) {}

  /**
   * Start monitoring performance
   */
  start(): void {
    this.startTime = performance.now();
    this.baselineMemory = process.memoryUsage();
  }

  /**
   * Stop monitoring and record metrics
   */
  stop(metadata?: Record<string, any>): PerformanceMetrics {
    if (!this.startTime) {
      throw new Error('Performance monitoring not started');
    }

    const endTime = performance.now();
    const currentMemory = process.memoryUsage();
    const duration = endTime - this.startTime;

    const memoryUsage: MemoryUsage = {
      rss: Math.round((currentMemory.rss / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((currentMemory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((currentMemory.heapTotal / 1024 / 1024) * 100) / 100,
      external: Math.round((currentMemory.external / 1024 / 1024) * 100) / 100,
    };

    const metrics: PerformanceMetrics = {
      operation: this.operationName,
      startTime: this.startTime,
      endTime,
      duration,
      memoryUsage,
      metadata,
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Calculate statistics from recorded metrics
   */
  calculateStatistics(): PerformanceStatistics {
    if (this.metrics.length === 0) {
      throw new Error('No metrics recorded');
    }

    const durations = this.metrics.map(m => m.duration);
    const sortedDurations = [...durations].sort((a, b) => a - b);

    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      meanDuration: Math.round(mean * 100) / 100,
      medianDuration: sortedDurations[Math.floor(sortedDurations.length / 2)],
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      percentile95: sortedDurations[Math.floor(sortedDurations.length * 0.95)],
      successRate: 100, // All recorded metrics are successful
      sampleCount: this.metrics.length,
    };
  }
}

/**
 * Measure CLI startup time
 */
export async function measureCLIStartupTime(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {}
): Promise<{ duration: number; memoryUsage: MemoryUsage; success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const child = spawn('node', [command, ...args], {
      stdio: 'pipe',
      cwd: options.cwd,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let output = '';
    let errorOutput = '';
    let success = true;
    let error: string | undefined;

    const timeout = options.timeout || 10000;
    const timeoutId = setTimeout(() => {
      child.kill('SIGKILL');
      success = false;
      error = `Process timed out after ${timeout}ms`;
    }, timeout);

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Try to get memory usage from the process if available
      const memoryUsage: MemoryUsage = {
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      };

      if (code !== 0) {
        success = false;
        error = errorOutput || `Process exited with code ${code}`;
      }

      resolve({
        duration: Math.round(duration * 100) / 100,
        memoryUsage,
        success,
        error,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      success = false;
      error = err.message;
      resolve({
        duration: 0,
        memoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
        success: false,
        error: err.message,
      });
    });
  });
}

/**
 * Measure template generation performance
 */
export async function measureTemplateGeneration(
  templateName: string,
  outputPath: string,
  options: Record<string, any> = {}
): Promise<PerformanceMetrics> {
  const monitor = new PerformanceMonitor(`template-generation-${templateName}`);

  try {
    monitor.start();

    // Import and run template generation
    const { generateTemplate } = await import('../../generators/index.js');
    await generateTemplate(templateName, outputPath, options);

    return monitor.stop({ templateName, outputPath });
  } catch (error) {
    return monitor.stop({
      templateName,
      outputPath,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Measure memory usage during operation
 */
export async function measureMemoryUsage<T>(
  operation: () => Promise<T>
): Promise<{ result: T; memoryUsage: MemoryUsage; peakMemory: number }> {
  const baselineMemory = process.memoryUsage();
  const memorySnapshots: NodeJS.MemoryUsage[] = [];

  // Start memory monitoring
  const monitoringInterval = setInterval(() => {
    memorySnapshots.push(process.memoryUsage());
  }, 100); // Sample every 100ms

  try {
    const result = await operation();

    // Stop monitoring
    clearInterval(monitoringInterval);

    // Calculate peak memory usage
    const peakMemory = Math.max(...memorySnapshots.map(m => m.heapUsed));
    const finalMemory = process.memoryUsage();

    const memoryUsage: MemoryUsage = {
      rss: Math.round((finalMemory.rss / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((finalMemory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((finalMemory.heapTotal / 1024 / 1024) * 100) / 100,
      external: Math.round((finalMemory.external / 1024 / 1024) * 100) / 100,
    };

    return {
      result,
      memoryUsage,
      peakMemory: Math.round((peakMemory / 1024 / 1024) * 100) / 100,
    };
  } catch (error) {
    clearInterval(monitoringInterval);
    throw error;
  }
}

/**
 * Run performance benchmark with multiple iterations
 */
export async function runBenchmark(
  name: string,
  operation: () => Promise<void>,
  requirements: PerformanceRequirements,
  iterations: number = 10
): Promise<PerformanceBenchmark> {
  const monitor = new PerformanceMonitor(name);
  const errors: string[] = [];

  console.log(`\n🏃 Running benchmark: ${name} (${iterations} iterations)`);

  for (let i = 0; i < iterations; i++) {
    try {
      process.stdout.write(`.`);
      const metrics = monitor.measureWithOperation(operation);

      // Check if requirements are met
      if (metrics.duration > requirements.maxDuration) {
        errors.push(`Iteration ${i + 1}: Duration ${metrics.duration}ms exceeds requirement ${requirements.maxDuration}ms`);
      }

      if (metrics.memoryUsage.rss > requirements.maxMemoryMB) {
        errors.push(`Iteration ${i + 1}: Memory ${metrics.memoryUsage.rss}MB exceeds requirement ${requirements.maxMemoryMB}MB`);
      }
    } catch (error) {
      errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(); // New line after progress dots

  const statistics = monitor.calculateStatistics();
  const successRate = ((iterations - errors.length) / iterations) * 100;

  const benchmark: PerformanceBenchmark = {
    name,
    requirements,
    metrics: monitor.getMetrics(),
    statistics: {
      ...statistics,
      successRate: Math.round(successRate * 100) / 100,
    },
  };

  // Print benchmark results
  printBenchmarkResults(benchmark, errors);

  return benchmark;
}

/**
 * Measure operation with monitoring
 */
PerformanceMonitor.prototype.measureWithOperation = async function<T>(
  operation: () => Promise<T>
): Promise<PerformanceMetrics> {
  this.start();

  try {
    await operation();
    return this.stop();
  } catch (error) {
    return this.stop({ error: error instanceof Error ? error.message : String(error) });
  }
};

/**
 * Print benchmark results in a formatted way
 */
function printBenchmarkResults(benchmark: PerformanceBenchmark, errors: string[]): void {
  const { name, requirements, statistics } = benchmark;

  console.log(`\n📊 Benchmark Results: ${name}`);
  console.log(`═══════════════════════════════════════════════════════════════`);

  // Requirements
  console.log(`📋 Requirements:`);
  console.log(`   • Max Duration: ${requirements.maxDuration}ms`);
  console.log(`   • Max Memory: ${requirements.maxMemoryMB}MB`);
  if (requirements.maxCpuUsage) {
    console.log(`   • Max CPU: ${requirements.maxCpuUsage}%`);
  }

  // Results
  console.log(`\n📈 Results:`);
  console.log(`   • Mean Duration: ${statistics.meanDuration}ms`);
  console.log(`   • Median Duration: ${statistics.medianDuration}ms`);
  console.log(`   • Min/Max: ${statistics.minDuration}ms / ${statistics.maxDuration}ms`);
  console.log(`   • 95th Percentile: ${statistics.percentile95}ms`);
  console.log(`   • Standard Deviation: ${statistics.standardDeviation}ms`);
  console.log(`   • Success Rate: ${statistics.successRate}%`);

  // Status
  const durationPass = statistics.meanDuration <= requirements.maxDuration;
  const successRatePass = statistics.successRate >= 90;

  console.log(`\n🎯 Status:`);
  console.log(`   • Duration: ${durationPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   • Success Rate: ${successRatePass ? '✅ PASS' : '❌ FAIL'}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors (${errors.length}):`);
    errors.slice(0, 5).forEach(error => console.log(`   • ${error}`));
    if (errors.length > 5) {
      console.log(`   • ... and ${errors.length - 5} more errors`);
    }
  }

  console.log(`\n${durationPass && successRatePass ? '✅ BENCHMARK PASSED' : '❌ BENCHMARK FAILED'}`);
}

/**
 * Create temporary directory for testing
 */
export async function createTempDirectory(): Promise<string> {
  const tmpDir = join(process.cwd(), 'tmp', `perf-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Save benchmark results to JSON file
 */
export async function saveBenchmarkResults(
  results: PerformanceBenchmark[],
  outputPath: string
): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    results,
  };

  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
}

/**
 * Generate performance report in markdown format
 */
export async function generatePerformanceReport(
  benchmarks: PerformanceBenchmark[],
  outputPath: string
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];

  let markdown = `# Performance Report - ${timestamp}\n\n`;
  markdown += `Generated on: ${new Date().toISOString()}\n`;
  markdown += `Node.js Version: ${process.version}\n`;
  markdown += `Platform: ${process.platform}-${process.arch}\n\n`;

  for (const benchmark of benchmarks) {
    markdown += `## ${benchmark.name}\n\n`;

    markdown += `### Requirements\n`;
    markdown += `- **Max Duration**: ${benchmark.requirements.maxDuration}ms\n`;
    markdown += `- **Max Memory**: ${benchmark.requirements.maxMemoryMB}MB\n`;
    if (benchmark.requirements.maxCpuUsage) {
      markdown += `- **Max CPU**: ${benchmark.requirements.maxCpuUsage}%\n`;
    }

    markdown += `\n### Results\n`;
    markdown += `- **Mean Duration**: ${benchmark.statistics.meanDuration}ms\n`;
    markdown += `- **Median Duration**: ${benchmark.statistics.medianDuration}ms\n`;
    markdown += `- **95th Percentile**: ${benchmark.statistics.percentile95}ms\n`;
    markdown += `- **Success Rate**: ${benchmark.statistics.successRate}%\n`;

    const durationPass = benchmark.statistics.meanDuration <= benchmark.requirements.maxDuration;
    const successRatePass = benchmark.statistics.successRate >= 90;

    markdown += `\n### Status: ${durationPass && successRatePass ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    markdown += `---\n\n`;
  }

  await fs.writeFile(outputPath, markdown);
}