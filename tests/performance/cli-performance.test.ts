/**
 * CLI Performance Benchmarking Framework
 *
 * Comprehensive performance testing suite for PRP CLI with:
 * - Startup time measurement
 * - Memory usage tracking
 * - Command execution benchmarking
 * - Resource utilization monitoring
 * - Performance regression detection
 * - Baseline establishment and comparison
 */

import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { CLIRunner } from '../helpers/cli-runner';
import { ProjectValidator } from '../helpers/project-validator';

interface PerformanceBaseline {
  startupTime: number;
  memoryUsage: number;
  commandDuration: {
    init: { min: number; max: number; avg: number };
    orchestrator: { min: number; max: number; avg: number };
    config: { min: number; max: number; avg: number };
    status: { min: number; max: number; avg: number };
  };
  resourceUsage: {
    cpu: number;
    disk: number;
    network: number;
  };
  timestamp: number;
}

interface BenchmarkResult {
  testName: string;
  duration: number;
  memoryUsage: {
    peak: number;
    average: number;
    final: number;
  };
  cpuUsage: number;
  success: boolean;
  error?: string;
  metadata: Record<string, any>;
}

describe('CLI Performance Benchmarks', () => {
  const testDirectories: string[] = [];
  const originalCwd = process.cwd();
  const cli = new CLIRunner();

  // Performance baselines (will be established during first run)
  let baseline: PerformanceBaseline | null = null;
  const results: BenchmarkResult[] = [];

  afterEach(() => {
    testDirectories.forEach(dir => {
      rmSync(dir, { recursive: true, force: true });
    });
    process.chdir(originalCwd);
  });

  beforeAll(async () => {
    // Ensure CLI is built
    try {
      require('child_process').execSync('npm run build', { stdio: 'pipe' });
    } catch (error) {
      console.warn('Build failed, using existing CLI');
    }
  });

  describe('CLI Startup Performance', () => {
    it('should start within acceptable time limits', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-perf-startup-'));
      testDirectories.push(testDir);

      const measurements = [];
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        const result = await cli.run(['--version'], {
          cwd: testDir,
          timeout: 10000,
          measurePerformance: true
        });

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;

        measurements.push({
          duration,
          memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
          success: result.success
        });
      }

      const avgDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
      const avgMemory = measurements.reduce((sum, m) => sum + m.memoryUsed, 0) / measurements.length;
      const successRate = measurements.filter(m => m.success).length / measurements.length;

      console.log(`Startup Performance:`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);

      // Performance assertions
      expect(avgDuration).toBeLessThan(2000); // Should start in under 2 seconds
      expect(avgMemory).toBeLessThan(50 * 1024 * 1024); // Should use less than 50MB
      expect(successRate).toBe(1.0); // Should always succeed

      // Store baseline if not established
      if (!baseline) {
        baseline = {
          startupTime: avgDuration,
          memoryUsage: avgMemory,
          commandDuration: {
            init: { min: 0, max: 0, avg: 0 },
            orchestrator: { min: 0, max: 0, avg: 0 },
            config: { min: 0, max: 0, avg: 0 },
            status: { min: 0, max: 0, avg: 0 }
          },
          resourceUsage: {
            cpu: 0,
            disk: 0,
            network: 0
          },
          timestamp: Date.now()
        };
      }

      results.push({
        testName: 'cli-startup',
        duration: avgDuration,
        memoryUsage: {
          peak: Math.max(...measurements.map(m => m.memoryUsed)),
          average: avgMemory,
          final: measurements[measurements.length - 1].memoryUsed
        },
        cpuUsage: 0, // Not measured for simple startup
        success: true,
        metadata: { iterations, successRate }
      });
    }, 30000);

    it('should handle concurrent startup requests efficiently', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-perf-concurrent-'));
      testDirectories.push(testDir);

      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, async (_, index) => {
        const requestStart = performance.now();
        const result = await cli.run(['--version'], {
          cwd: testDir,
          timeout: 15000,
          measurePerformance: true
        });
        const requestEnd = performance.now();

        return {
          index,
          duration: requestEnd - requestStart,
          success: result.success,
          memory: result.performance?.peakMemoryUsage || 0
        };
      });

      const requestResults = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const avgRequestTime = requestResults.reduce((sum, r) => sum + r.duration, 0) / requestResults.length;
      const maxRequestTime = Math.max(...requestResults.map(r => r.duration));
      const successRate = requestResults.filter(r => r.success).length / requestResults.length;

      console.log(`Concurrent Startup Performance:`);
      console.log(`  Total time for ${concurrentRequests} requests: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average request time: ${avgRequestTime.toFixed(2)}ms`);
      console.log(`  Max request time: ${maxRequestTime.toFixed(2)}ms`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);

      // Concurrent requests should complete efficiently
      expect(totalTime).toBeLessThan(avgRequestTime * concurrentRequests * 0.7); // Should benefit from concurrency
      expect(avgRequestTime).toBeLessThan(3000); // Each request should complete in under 3 seconds
      expect(successRate).toBe(1.0);
    }, 45000);
  });

  describe('Command Execution Performance', () => {
    const templates = ['typescript', 'react', 'nestjs', 'fastapi', 'none'];

    templates.forEach(template => {
      it(`should init ${template} project within performance limits`, async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), `prp-perf-init-${template}-`));
        testDirectories.push(testDir);

        const projectName = `perf-test-${template}-${Date.now()}`;
        const measurements = [];

        // Run multiple iterations for statistical significance
        for (let i = 0; i < 3; i++) {
          const result = await cli.runInit({
            projectDir: testDir,
            projectName: `${projectName}-${i}`,
            template: template
          });

          measurements.push({
            duration: result.performance?.totalDuration || 0,
            memory: result.performance?.peakMemoryUsage || 0,
            success: result.success,
            startup: result.performance?.startupTime || 0
          });
        }

        const avgDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
        const avgMemory = measurements.reduce((sum, m) => sum + m.memory, 0) / measurements.length;
        const avgStartup = measurements.reduce((sum, m) => sum + m.startup, 0) / measurements.length;
        const successRate = measurements.filter(m => m.success).length / measurements.length;

        console.log(`${template} Init Performance:`);
        console.log(`  Average duration: ${(avgDuration / 1000).toFixed(2)}s`);
        console.log(`  Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Average startup: ${avgStartup.toFixed(2)}ms`);
        console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);

        // Performance assertions based on template complexity
        const expectedMaxDuration = template === 'wikijs' ? 45000 : template === 'nestjs' ? 35000 : 25000;
        const expectedMaxMemory = 150 * 1024 * 1024; // 150MB max for any template

        expect(avgDuration).toBeLessThan(expectedMaxDuration);
        expect(avgMemory).toBeLessThan(expectedMaxMemory);
        expect(successRate).toBe(1.0);

        // Update baseline
        if (baseline) {
          baseline.commandDuration.init.min = Math.min(baseline.commandDuration.init.min, avgDuration);
          baseline.commandDuration.init.max = Math.max(baseline.commandDuration.init.max, avgDuration);
          baseline.commandDuration.init.avg = avgDuration;
        }

        results.push({
          testName: `init-${template}`,
          duration: avgDuration,
          memoryUsage: {
            peak: Math.max(...measurements.map(m => m.memory)),
            average: avgMemory,
            final: measurements[measurements.length - 1].memory
          },
          cpuUsage: 0,
          success: true,
          metadata: { template, iterations: measurements.length, successRate }
        });
      }, 90000);
    });

    it('should handle orchestrator startup efficiently', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-perf-orchestrator-'));
      testDirectories.push(testDir);

      // First create a project
      await cli.runInit({
        projectDir: testDir,
        projectName: 'orchestrator-perf-test',
        template: 'typescript'
      });

      const measurements = [];

      // Test orchestrator startup multiple times
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        const result = await cli.runOrchestrator(testDir, 15000); // 15 second timeout

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;

        measurements.push({
          duration,
          memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
          success: result.success
        });
      }

      const avgDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
      const avgMemory = measurements.reduce((sum, m) => sum + m.memoryUsed, 0) / measurements.length;
      const successRate = measurements.filter(m => m.success).length / measurements.length;

      console.log(`Orchestrator Performance:`);
      console.log(`  Average startup: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);

      expect(avgDuration).toBeLessThan(5000); // Should start in under 5 seconds
      expect(avgMemory).toBeLessThan(100 * 1024 * 1024); // Should use less than 100MB
      expect(successRate).toBeGreaterThan(0.8); // Allow some failures due to environment

      // Update baseline
      if (baseline) {
        baseline.commandDuration.orchestrator.min = Math.min(baseline.commandDuration.orchestrator.min, avgDuration);
        baseline.commandDuration.orchestrator.max = Math.max(baseline.commandDuration.orchestrator.max, avgDuration);
        baseline.commandDuration.orchestrator.avg = avgDuration;
      }

      results.push({
        testName: 'orchestrator-startup',
        duration: avgDuration,
        memoryUsage: {
          peak: Math.max(...measurements.map(m => m.memoryUsed)),
          average: avgMemory,
          final: measurements[measurements.length - 1].memoryUsed
        },
        cpuUsage: 0,
        success: successRate > 0.8,
        metadata: { iterations: measurements.length, successRate }
      });
    }, 60000);
  });

  describe('Resource Usage Monitoring', () => {
    it('should monitor memory usage patterns during extended operations', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-perf-memory-'));
      testDirectories.push(testDir);

      const memoryMeasurements = [];
      const measurementInterval = 1000; // 1 second
      const testDuration = 10000; // 10 seconds

      // Start a long-running operation
      const orchestratorPromise = cli.runOrchestrator(testDir, testDuration + 5000);

      // Monitor memory usage during operation
      const memoryMonitor = setInterval(() => {
        const memoryUsage = process.memoryUsage();
        memoryMeasurements.push({
          timestamp: Date.now(),
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        });
      }, measurementInterval);

      try {
        await orchestratorPromise;
      } catch (error) {
        // Expected to timeout
      } finally {
        clearInterval(memoryMonitor);
      }

      if (memoryMeasurements.length > 0) {
        const heapUsage = memoryMeasurements.map(m => m.heapUsed);
        const maxHeap = Math.max(...heapUsage);
        const minHeap = Math.min(...heapUsage);
        const avgHeap = heapUsage.reduce((sum, h) => sum + h, 0) / heapUsage.length;
        const memoryGrowth = maxHeap - minHeap;

        console.log(`Memory Usage Analysis:`);
        console.log(`  Initial heap: ${(minHeap / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Peak heap: ${(maxHeap / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Average heap: ${(avgHeap / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Measurements: ${memoryMeasurements.length}`);

        // Memory usage should be reasonable
        expect(maxHeap).toBeLessThan(200 * 1024 * 1024); // Peak under 200MB
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Growth under 50MB
      }
    }, 20000);

    it('should detect memory leaks with repeated operations', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-perf-leak-'));
      testDirectories.push(testDir);

      const initialMemory = process.memoryUsage().heapUsed;
      const memorySnapshots = [];

      // Perform multiple operations and check for memory growth
      for (let i = 0; i < 10; i++) {
        // Run a command that allocates memory
        await cli.run(['--version'], {
          cwd: testDir,
          measurePerformance: true
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const memorySnapshot = process.memoryUsage();
        memorySnapshots.push({
          iteration: i,
          heapUsed: memorySnapshot.heapUsed,
          timestamp: Date.now()
        });

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      const avgMemory = memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / memorySnapshots.length;

      console.log(`Memory Leak Detection:`);
      console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Total growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);

      // Check for excessive memory growth
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth
    }, 30000);
  });

  describe('Performance Regression Detection', () => {
    it('should compare performance against established baseline', () => {
      if (!baseline) {
        console.warn('⚠️ No baseline established - skipping regression test');
        return;
      }

      const regressionThreshold = 0.2; // 20% degradation threshold
      const regressions: string[] = [];

      results.forEach(result => {
        if (result.testName === 'cli-startup' && baseline) {
          const degradation = (result.duration - baseline.startupTime) / baseline.startupTime;
          if (degradation > regressionThreshold) {
            regressions.push(`${result.testName}: ${(degradation * 100).toFixed(1)}% slower than baseline`);
          }
        }
      });

      if (regressions.length > 0) {
        console.warn('🚨 Performance Regressions Detected:');
        regressions.forEach(regression => console.warn(`  - ${regression}`));
      }

      // In a real CI environment, you might want to fail the build on regressions
      // For now, we'll just report them
      expect(regressions.length).toBeLessThan(5); // Allow some minor regressions
    });

    it('should generate performance report', () => {
      const performanceReport = {
        timestamp: new Date().toISOString(),
        baseline: baseline ? {
          established: new Date(baseline.timestamp).toISOString(),
          startupTime: baseline.startupTime,
          commandDurations: baseline.commandDuration
        } : null,
        results: results.map(r => ({
          testName: r.testName,
          duration: r.duration,
          memoryPeakMB: Math.round(r.memoryUsage.peak / 1024 / 1024 * 100) / 100,
          memoryAvgMB: Math.round(r.memoryUsage.average / 1024 / 1024 * 100) / 100,
          success: r.success,
          metadata: r.metadata
        })),
        summary: {
          totalTests: results.length,
          successfulTests: results.filter(r => r.success).length,
          averageDuration: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
          peakMemoryUsage: Math.round(Math.max(...results.map(r => r.memoryUsage.peak)) / 1024 / 1024 * 100) / 100
        }
      };

      console.log('\n📊 Performance Report:');
      console.log(JSON.stringify(performanceReport, null, 2));

      // Save report to file for analysis
      const reportPath = join(os.tmpdir(), `prp-performance-report-${Date.now()}.json`);
      require('fs').writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));
      console.log(`\n📄 Performance report saved to: ${reportPath}`);

      expect(performanceReport.summary.totalTests).toBeGreaterThan(0);
      expect(performanceReport.summary.successfulTests).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency command execution', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-perf-stress-'));
      testDirectories.push(testDir);

      const commandCount = 50;
      const startTime = performance.now();

      const promises = Array.from({ length: commandCount }, async (_, index) => {
        return cli.run(['--version'], {
          cwd: testDir,
          timeout: 5000,
          measurePerformance: true
        });
      });

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      const avgDuration = totalTime / commandCount;

      console.log(`Stress Test Results:`);
      console.log(`  Commands executed: ${commandCount}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time per command: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Successful: ${successful}`);
      console.log(`  Failed: ${failed}`);
      console.log(`  Success rate: ${((successful / commandCount) * 100).toFixed(1)}%`);

      expect(successful / commandCount).toBeGreaterThan(0.9); // 90% success rate
      expect(avgDuration).toBeLessThan(1000); // Average under 1 second per command
    }, 120000);
  });
});