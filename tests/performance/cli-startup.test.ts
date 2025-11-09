/**
 * CLI Startup Performance Tests
 *
 * Tests CLI startup performance to ensure it meets the requirements:
 * - CLI startup time < 2 seconds
 * - Memory usage < 50MB during startup
 * - Cold start and warm start performance
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  measureCLIStartupTime,
  runBenchmark,
  createTempDirectory,
  cleanupTempDirectory,
  PerformanceRequirements,
  saveBenchmarkResults,
  generatePerformanceReport,
} from './helpers/performance-utils.js';

describe('CLI Startup Performance', () => {
  const cliPath = join(process.cwd(), 'dist', 'cli.js');
  let tempDir: string;
  let benchmarkResults: any[] = [];

  beforeAll(async () => {
    // Ensure CLI is built
    try {
      await fs.access(cliPath);
    } catch {
      // Build CLI if not exists
      const { execSync } = await import('child_process');
      execSync('npm run build', { stdio: 'inherit' });
    }

    tempDir = await createTempDirectory();
  });

  afterAll(async () => {
    await cleanupTempDirectory(tempDir);

    // Save benchmark results
    if (benchmarkResults.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await saveBenchmarkResults(
        benchmarkResults,
        join(process.cwd(), 'tmp', `cli-startup-benchmark-${timestamp}.json`)
      );
      await generatePerformanceReport(
        benchmarkResults,
        join(process.cwd(), 'tmp', `cli-startup-report-${timestamp}.md`)
      );
    }
  });

  describe('Help Command Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 2000, // 2 seconds
      maxMemoryMB: 50,
    };

    it('should display help within 2 seconds (cold start)', async () => {
      const result = await measureCLIStartupTime(cliPath, ['--help'], {
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.error).toBeUndefined();

      console.log(`Help command (cold start): ${result.duration}ms`);
    });

    it('should display help within 2 seconds (warm start)', async () => {
      // First call to warm up Node.js module cache
      await measureCLIStartupTime(cliPath, ['--version']);

      // Second call for warm start measurement
      const result = await measureCLIStartupTime(cliPath, ['--help'], {
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.error).toBeUndefined();

      console.log(`Help command (warm start): ${result.duration}ms`);
    });

    it('should pass benchmark test with multiple iterations', async () => {
      const benchmark = await runBenchmark(
        'cli-help-startup',
        async () => {
          const result = await measureCLIStartupTime(cliPath, ['--help']);
          if (!result.success) {
            throw new Error(result.error || 'CLI startup failed');
          }
          if (result.duration > requirements.maxDuration) {
            throw new Error(`Duration ${result.duration}ms exceeds limit ${requirements.maxDuration}ms`);
          }
        },
        requirements,
        10
      );

      benchmarkResults.push(benchmark);

      expect(benchmark.statistics.meanDuration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(benchmark.statistics.successRate).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Version Command Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 1500, // Version should be faster than help
      maxMemoryMB: 30,
    };

    it('should display version within 1.5 seconds', async () => {
      const result = await measureCLIStartupTime(cliPath, ['--version'], {
        timeout: 3000,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.error).toBeUndefined();

      console.log(`Version command: ${result.duration}ms`);
    });

    it('should pass benchmark test with multiple iterations', async () => {
      const benchmark = await runBenchmark(
        'cli-version-startup',
        async () => {
          const result = await measureCLIStartupTime(cliPath, ['--version']);
          if (!result.success) {
            throw new Error(result.error || 'CLI startup failed');
          }
          if (result.duration > requirements.maxDuration) {
            throw new Error(`Duration ${result.duration}ms exceeds limit ${requirements.maxDuration}ms`);
          }
        },
        requirements,
        15
      );

      benchmarkResults.push(benchmark);

      expect(benchmark.statistics.meanDuration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(benchmark.statistics.successRate).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Init Command Detection Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 2000, // Slightly longer as it checks for .prprc
      maxMemoryMB: 50,
    };

    it('should start initialization flow within 2 seconds (no .prprc)', async () => {
      const result = await measureCLIStartupTime(cliPath, [], {
        cwd: tempDir,
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.error).toBeUndefined();

      console.log(`Init detection (no .prprc): ${result.duration}ms`);
    });

    it('should start orchestrator within 2 seconds (.prprc exists)', async () => {
      // Create .prprc file
      const prprcPath = join(tempDir, '.prprc');
      await fs.writeFile(prprcPath, JSON.stringify({
        projectName: 'test-project',
        template: 'minimal',
      }, null, 2));

      const result = await measureCLIStartupTime(cliPath, [], {
        cwd: tempDir,
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.error).toBeUndefined();

      console.log(`Orchestrator detection (.prprc exists): ${result.duration}ms`);
    });
  });

  describe('Error Handling Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 1000, // Error handling should be fast
      maxMemoryMB: 20,
    };

    it('should handle invalid command quickly', async () => {
      const result = await measureCLIStartupTime(cliPath, ['invalid-command'], {
        timeout: 3000,
      });

      // We expect this to fail, but it should fail quickly
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      console.log(`Invalid command error handling: ${result.duration}ms`);
    });

    it('should handle missing arguments quickly', async () => {
      const result = await measureCLIStartupTime(cliPath, ['init'], {
        timeout: 3000,
      });

      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      // This might succeed or fail depending on implementation, but should be fast

      console.log(`Missing args handling: ${result.duration}ms`);
    });
  });

  describe('Complex Command Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 3000, // More complex commands can take longer
      maxMemoryMB: 60,
    };

    it('should handle debug mode startup within 3 seconds', async () => {
      const result = await measureCLIStartupTime(cliPath, ['--debug', '--help'], {
        timeout: 6000,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.error).toBeUndefined();

      console.log(`Debug mode help: ${result.duration}ms`);
    });

    it('should handle CI mode startup within 3 seconds', async () => {
      const result = await measureCLIStartupTime(cliPath, ['--ci', '--help'], {
        timeout: 6000,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(result.error).toBeUndefined();

      console.log(`CI mode help: ${result.duration}ms`);
    });
  });

  describe('Memory Usage During Startup', () => {
    it('should not exceed memory limits during startup', async () => {
      // Test multiple rapid startups to check for memory leaks
      const startups = [];
      const memoryUsages = [];

      for (let i = 0; i < 5; i++) {
        const result = await measureCLIStartupTime(cliPath, ['--version']);
        startups.push(result);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const memUsage = process.memoryUsage();
        memoryUsages.push({
          rss: memUsage.rss / 1024 / 1024,
          heapUsed: memUsage.heapUsed / 1024 / 1024,
          heapTotal: memUsage.heapTotal / 1024 / 1024,
        });
      }

      // Check that memory usage is stable
      const maxMemory = Math.max(...memoryUsages.map(m => m.rss));
      expect(maxMemory).toBeLessThan(50); // Less than 50MB

      // Check for memory leaks (memory should not grow consistently)
      const memoryGrowth = memoryUsages[memoryUsages.length - 1].rss - memoryUsages[0].rss;
      expect(memoryGrowth).toBeLessThan(10); // Less than 10MB growth

      console.log(`Peak memory usage: ${maxMemory.toFixed(2)}MB`);
      console.log(`Memory growth: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Startup Performance', () => {
    it('should handle multiple concurrent CLI processes', async () => {
      const concurrentCount = 5;
      const requirements: PerformanceRequirements = {
        maxDuration: 3000, // Allow more time for concurrent execution
        maxMemoryMB: 100, // More memory for concurrent processes
      };

      const promises = Array.from({ length: concurrentCount }, () =>
        measureCLIStartupTime(cliPath, ['--version'])
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThanOrEqual(requirements.maxDuration);
        console.log(`Concurrent startup ${index + 1}: ${result.duration}ms`);
      });

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`Average concurrent startup time: ${avgDuration.toFixed(2)}ms`);

      expect(avgDuration).toBeLessThan(requirements.maxDuration);
    });
  });
});