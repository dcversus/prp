/**
 * Memory Usage Profiling Tests
 *
 * Comprehensive memory usage testing to ensure efficient memory management:
 * - Memory usage < 50MB during normal operations
 * - No memory leaks during repeated operations
 * - Efficient garbage collection
 * - Memory usage stays within limits during stress tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  measureMemoryUsage,
  createTempDirectory,
  cleanupTempDirectory,
  PerformanceMonitor,
  runBenchmark,
  PerformanceRequirements,
} from './helpers/performance-utils.js';
import { generateProject, GeneratorContext } from '../../generators/index.js';

describe('Memory Usage Profiling', () => {
  let tempDirs: string[] = [];
  let initialMemory: NodeJS.MemoryUsage;

  const createTempDir = async (): Promise<string> => {
    const dir = await createTempDirectory();
    tempDirs.push(dir);
    return dir;
  };

  beforeAll(async () => {
    initialMemory = process.memoryUsage();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait a bit for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up all temporary directories
    for (const dir of tempDirs) {
      await cleanupTempDirectory(dir);
    }

    // Final memory check
    const finalMemory = process.memoryUsage();
    const memoryGrowth = finalMemory.rss - initialMemory.rss;
    const memoryGrowthMB = memoryGrowth / 1024 / 1024;

    console.log(`\n📊 Memory Usage Summary:`);
    console.log(`   Initial RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Final RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Memory Growth: ${memoryGrowthMB.toFixed(2)}MB`);

    // Memory growth should be minimal after all tests
    expect(memoryGrowthMB).toBeLessThan(20); // Allow some growth but not excessive
  });

  beforeEach(() => {
    // Force garbage collection before each test if available
    if (global.gc) {
      global.gc();
    }
  });

  const createGeneratorContext = (template: string, targetPath: string): GeneratorContext => ({
    options: {
      name: 'memory-test-project',
      description: 'Memory usage test project',
      template,
      author: 'Memory Tester',
      email: 'test@example.com',
      telegram: '@tester',
      license: 'MIT',
      includeEditorConfig: true,
      includeContributing: true,
      includeCodeOfConduct: true,
      includeCLA: false,
      includeSecurityPolicy: false,
      includeIssueTemplates: true,
      includePRTemplate: true,
      includeGitHubActions: true,
      includeESLint: true,
      includePrettier: true,
      includeDocker: true,
    },
    targetPath,
    templatePath: join(process.cwd(), 'templates'),
  });

  describe('Baseline Memory Usage', () => {
    it('should have reasonable baseline memory usage', () => {
      const memory = process.memoryUsage();
      const rssMB = memory.rss / 1024 / 1024;
      const heapUsedMB = memory.heapUsed / 1024 / 1024;

      expect(rssMB).toBeLessThan(100); // RSS should be under 100MB
      expect(heapUsedMB).toBeLessThan(50); // Heap should be under 50MB

      console.log(`Baseline memory - RSS: ${rssMB.toFixed(2)}MB, Heap: ${heapUsedMB.toFixed(2)}MB`);
    });
  });

  describe('CLI Operations Memory Usage', () => {
    it('should maintain memory usage within limits during CLI operations', async () => {
      const requirements: PerformanceRequirements = {
        maxDuration: 5000,
        maxMemoryMB: 50,
      };

      const monitor = new PerformanceMonitor('cli-operations-memory');

      // Simulate CLI operations
      const operations = [
        async () => {
          // Import CLI module (simulates CLI startup)
          await import('../../cli.js');
        },
        async () => {
          // Import commands module
          await import('../../commands/init-new.js');
        },
        async () => {
          // Import orchestrator module
          await import('../../commands/orchestrator.js');
        },
      ];

      for (const operation of operations) {
        const { result, memoryUsage, peakMemory } = await measureMemoryUsage(operation);

        expect(peakMemory).toBeLessThanOrEqual(requirements.maxMemoryMB);

        monitor.getMetrics(); // Record metrics for each operation
      }

      const statistics = monitor.calculateStatistics();
      expect(statistics.meanDuration).toBeLessThan(requirements.maxDuration);

      console.log(`CLI operations memory - Mean: ${statistics.meanDuration.toFixed(2)}ms`);
    });
  });

  describe('Template Generation Memory Usage', () => {
    it('should stay within memory limits during template generation', async () => {
      const templates = ['typescript-lib', 'react', 'fastapi', 'vue'];
      const memoryUsages: number[] = [];

      for (const template of templates) {
        const targetPath = await createTempDir();
        const context = createGeneratorContext(template, targetPath);

        const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
          return generateProject(context);
        });

        expect(peakMemory).toBeLessThan(50); // Less than 50MB for any template
        memoryUsages.push(peakMemory);

        console.log(`${template} template memory usage: ${peakMemory}MB`);
      }

      const avgMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
      const maxMemory = Math.max(...memoryUsages);

      expect(avgMemory).toBeLessThan(40); // Average should be under 40MB
      expect(maxMemory).toBeLessThan(50); // Max should be under 50MB

      console.log(`Template generation - Avg memory: ${avgMemory.toFixed(2)}MB, Max: ${maxMemory}MB`);
    });

    it('should handle complex template generation efficiently', async () => {
      const targetPath = await createTempDir();

      // Create context with all options enabled for maximum complexity
      const context: GeneratorContext = {
        options: {
          name: 'complex-memory-test',
          description: 'Complex project for memory testing with all features enabled',
          template: 'react',
          author: 'Memory Tester',
          email: 'test@example.com',
          telegram: '@tester',
          license: 'MIT',
          includeEditorConfig: true,
          includeContributing: true,
          includeCodeOfConduct: true,
          includeCLA: true,
          includeSecurityPolicy: true,
          includeIssueTemplates: true,
          includePRTemplate: true,
          includeGitHubActions: true,
          includeESLint: true,
          includePrettier: true,
          includeDocker: true,
        },
        targetPath,
        templatePath: join(process.cwd(), 'templates'),
      };

      const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
        return generateProject(context);
      });

      expect(peakMemory).toBeLessThan(60); // Allow slightly more for complex templates

      // Verify files were created
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(10); // Should have many files

      console.log(`Complex template - Peak memory: ${peakMemory}MB, Files generated: ${files.length}`);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated template generations', async () => {
      const iterations = 10;
      const memorySnapshots: NodeJS.MemoryUsage[] = [];
      const peakMemories: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const targetPath = await createTempDir();
        const context = createGeneratorContext('typescript-lib', targetPath);

        // Measure memory during generation
        const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
          return generateProject(context);
        });

        peakMemories.push(peakMemory);

        // Record memory snapshot after generation
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for GC

        memorySnapshots.push(process.memoryUsage());
      }

      // Analyze memory growth
      const initialHeap = memorySnapshots[0].heapUsed;
      const finalHeap = memorySnapshots[memorySnapshots.length - 1].heapUsed;
      const memoryGrowth = (finalHeap - initialHeap) / 1024 / 1024;

      const avgPeakMemory = peakMemories.reduce((sum, mem) => sum + mem, 0) / peakMemories.length;
      const maxPeakMemory = Math.max(...peakMemories);

      expect(memoryGrowth).toBeLessThan(15); // Less than 15MB growth over iterations
      expect(avgPeakMemory).toBeLessThan(40); // Average peak memory should be reasonable
      expect(maxPeakMemory).toBeLessThan(50); // Peak memory should not exceed limits

      console.log(`Memory leak test - Growth: ${memoryGrowth.toFixed(2)}MB over ${iterations} iterations`);
      console.log(`Peak memory - Avg: ${avgPeakMemory.toFixed(2)}MB, Max: ${maxPeakMemory}MB`);
    });

    it('should not leak memory during repeated CLI operations', async () => {
      const iterations = 20;
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Simulate CLI module loading and usage
        await import('../../cli.js');
        await import('../../commands/init-new.js');

        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 10));

        const memory = process.memoryUsage();
        memorySnapshots.push(memory.heapUsed / 1024 / 1024);
      }

      // Check for memory growth trend
      const firstHalf = memorySnapshots.slice(0, Math.floor(iterations / 2));
      const secondHalf = memorySnapshots.slice(Math.floor(iterations / 2));

      const firstHalfAvg = firstHalf.reduce((sum, mem) => sum + mem, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, mem) => sum + mem, 0) / secondHalf.length;

      const memoryTrend = secondHalfAvg - firstHalfAvg;

      expect(memoryTrend).toBeLessThan(5); // Memory trend should be minimal
      expect(Math.max(...memorySnapshots)).toBeLessThan(100); // Peak memory should be reasonable

      console.log(`CLI memory leak test - Trend: ${memoryTrend.toFixed(2)}MB`);
      console.log(`Peak memory: ${Math.max(...memorySnapshots).toFixed(2)}MB`);
    });
  });

  describe('Stress Testing Memory Usage', () => {
    it('should handle high concurrency without excessive memory usage', async () => {
      const concurrentOperations = 5;
      const operationsPerBatch = 3;

      const memoryUsages: number[] = [];

      for (let batch = 0; batch < operationsPerBatch; batch++) {
        const promises = Array.from({ length: concurrentOperations }, async () => {
          const targetPath = await createTempDir();
          const context = createGeneratorContext('typescript-lib', targetPath);

          const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
            return generateProject(context);
          });

          return peakMemory;
        });

        const batchResults = await Promise.all(promises);
        memoryUsages.push(...batchResults);

        // Force garbage collection between batches
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const maxMemory = Math.max(...memoryUsages);
      const avgMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;

      expect(maxMemory).toBeLessThan(80); // Allow more for concurrent operations
      expect(avgMemory).toBeLessThan(50); // Average should still be reasonable

      console.log(`Stress test - Concurrent operations: ${concurrentOperations * operationsPerBatch}`);
      console.log(`Memory usage - Avg: ${avgMemory.toFixed(2)}MB, Max: ${maxMemory}MB`);
    });

    it('should handle large file generation without memory issues', async () => {
      const targetPath = await createTempDir();

      // Create multiple projects in the same directory to stress test
      const projects = ['project1', 'project2', 'project3'];
      const memoryUsages: number[] = [];

      for (const projectName of projects) {
        const projectPath = join(targetPath, projectName);
        await fs.mkdir(projectPath, { recursive: true });

        const context = createGeneratorContext('react', projectPath);
        context.options.name = projectName;

        const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
          return generateProject(context);
        });

        memoryUsages.push(peakMemory);
      }

      const totalFiles = await fs.readdir(targetPath, { recursive: true });
      const maxMemory = Math.max(...memoryUsages);

      expect(maxMemory).toBeLessThan(60); // Should handle multiple projects
      expect(totalFiles.length).toBeGreaterThan(20); // Should generate many files

      console.log(`Large file generation - Files: ${totalFiles.length}, Max memory: ${maxMemory}MB`);
    });
  });

  describe('Memory Efficiency Benchmarks', () => {
    it('should pass memory efficiency benchmarks', async () => {
      const requirements: PerformanceRequirements = {
        maxDuration: 3000,
        maxMemoryMB: 40,
      };

      const benchmark = await runBenchmark(
        'memory-efficiency-typescript-lib',
        async () => {
          const targetPath = await createTempDir();
          const context = createGeneratorContext('typescript-lib', targetPath);

          const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
            return generateProject(context);
          });

          if (peakMemory > requirements.maxMemoryMB) {
            throw new Error(`Memory usage ${peakMemory}MB exceeds limit ${requirements.maxMemoryMB}MB`);
          }
        },
        requirements,
        5
      );

      expect(benchmark.statistics.successRate).toBeGreaterThanOrEqual(90);

      console.log(`Memory efficiency benchmark - Success rate: ${benchmark.statistics.successRate}%`);
      console.log(`Average duration: ${benchmark.statistics.meanDuration.toFixed(2)}ms`);
    });

    it('should maintain consistent memory usage patterns', async () => {
      const iterations = 5;
      const memoryPatterns: number[][] = [];

      for (let i = 0; i < iterations; i++) {
        const targetPath = await createTempDir();
        const context = createGeneratorContext('react', targetPath);

        // Monitor memory throughout the operation
        const memorySnapshots: number[] = [];
        const monitor = setInterval(() => {
          const memory = process.memoryUsage();
          memorySnapshots.push(memory.heapUsed / 1024 / 1024);
        }, 50); // Sample every 50ms

        try {
          await generateProject(context);
        } finally {
          clearInterval(monitor);
        }

        memoryPatterns.push(memorySnapshots);

        // Clean up
        if (global.gc) {
          global.gc();
        }
      }

      // Analyze memory patterns for consistency
      const peakMemories = memoryPatterns.map(pattern => Math.max(...pattern));
      const avgPeak = peakMemories.reduce((sum, peak) => sum + peak, 0) / peakMemories.length;
      const maxDeviation = Math.max(...peakMemories.map(peak => Math.abs(peak - avgPeak)));

      expect(maxDeviation).toBeLessThan(10); // Memory usage should be consistent
      expect(avgPeak).toBeLessThan(45); // Average peak memory should be reasonable

      console.log(`Memory consistency - Avg peak: ${avgPeak.toFixed(2)}MB`);
      console.log(`Max deviation: ${maxDeviation.toFixed(2)}MB`);
    });
  });

  describe('Garbage Collection Behavior', () => {
    it('should respond well to garbage collection', async () => {
      const targetPath = await createTempDir();
      const context = createGeneratorContext('typescript-lib', targetPath);

      // Generate project
      await generateProject(context);

      // Measure memory before GC
      const beforeGC = process.memoryUsage();
      const beforeGCMB = beforeGC.heapUsed / 1024 / 1024;

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 100));

      // Measure memory after GC
      const afterGC = process.memoryUsage();
      const afterGCMB = afterGC.heapUsed / 1024 / 1024;

      const memoryReduction = beforeGCMB - afterGCMB;

      expect(memoryReduction).toBeGreaterThan(0); // Should see some memory reduction
      expect(afterGCMB).toBeLessThan(40); // Should be under reasonable limit after GC

      console.log(`GC behavior - Before: ${beforeGCMB.toFixed(2)}MB, After: ${afterGCMB.toFixed(2)}MB`);
      console.log(`Memory reduction: ${memoryReduction.toFixed(2)}MB`);
    });

    it('should handle memory pressure gracefully', async () => {
      const operations = 10;
      const memorySnapshots: number[] = [];

      for (let i = 0; i < operations; i++) {
        const targetPath = await createTempDir();
        const context = createGeneratorContext('react', targetPath);

        await generateProject(context);

        // Check memory after each operation
        if (global.gc) {
          global.gc();
        }

        const memory = process.memoryUsage();
        memorySnapshots.push(memory.heapUsed / 1024 / 1024);
      }

      // Memory should not grow indefinitely
      const maxMemory = Math.max(...memorySnapshots);
      const minMemory = Math.min(...memorySnapshots);
      const memoryRange = maxMemory - minMemory;

      expect(maxMemory).toBeLessThan(80); // Should not exceed reasonable limit
      expect(memoryRange).toBeLessThan(30); // Memory should be somewhat stable

      console.log(`Memory pressure test - Max: ${maxMemory.toFixed(2)}MB, Range: ${memoryRange.toFixed(2)}MB`);
    });
  });
});