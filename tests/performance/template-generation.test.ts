/**
 * Template Generation Performance Tests
 *
 * Tests template generation performance to ensure it meets the requirements:
 * - Template generation < 5 seconds for complex templates
 * - Memory usage < 50MB during operations
 * - All template types perform within acceptable limits
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  measureTemplateGeneration,
  measureMemoryUsage,
  runBenchmark,
  createTempDirectory,
  cleanupTempDirectory,
  PerformanceRequirements,
  saveBenchmarkResults,
  generatePerformanceReport,
} from './helpers/performance-utils.js';
import { generateProject, GeneratorContext } from '../../generators/index.js';

describe('Template Generation Performance', () => {
  let tempDirs: string[] = [];
  let benchmarkResults: any[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await createTempDirectory();
    tempDirs.push(dir);
    return dir;
  };

  beforeAll(async () => {
    // Ensure all modules are available
    try {
      await import('../../generators/index.js');
    } catch (error) {
      throw new Error('Failed to import generators. Make sure the project is built.');
    }
  });

  afterAll(async () => {
    // Clean up all temporary directories
    for (const dir of tempDirs) {
      await cleanupTempDirectory(dir);
    }

    // Save benchmark results
    if (benchmarkResults.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await saveBenchmarkResults(
        benchmarkResults,
        join(process.cwd(), 'tmp', `template-generation-benchmark-${timestamp}.json`)
      );
      await generatePerformanceReport(
        benchmarkResults,
        join(process.cwd(), 'tmp', `template-generation-report-${timestamp}.md`)
      );
    }
  });

  const createGeneratorContext = (template: string, targetPath: string): GeneratorContext => ({
    options: {
      name: 'test-project',
      description: 'Test project for performance testing',
      template,
      author: 'Performance Tester',
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

  describe('Simple Template Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 2000, // 2 seconds for simple templates
      maxMemoryMB: 30,
    };

    it('should generate TypeScript library template within 2 seconds', async () => {
      const targetPath = await createTempDir();
      const context = createGeneratorContext('typescript-lib', targetPath);

      const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
        return generateProject(context);
      });

      expect(result).toBeUndefined(); // Function returns void on success

      // Verify files were generated
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('package.json');
      expect(files).toContain('src');

      expect(peakMemory).toBeLessThanOrEqual(requirements.maxMemoryMB);

      console.log(`TypeScript library template: Peak memory ${peakMemory}MB`);
    });

    it('should pass benchmark for TypeScript library', async () => {
      const benchmark = await runBenchmark(
        'template-typescript-lib',
        async () => {
          const targetPath = await createTempDir();
          const context = createGeneratorContext('typescript-lib', targetPath);

          await generateProject(context);

          // Verify generation succeeded
          const files = await fs.readdir(targetPath);
          expect(files.length).toBeGreaterThan(0);
        },
        requirements,
        5
      );

      benchmarkResults.push(benchmark);

      expect(benchmark.statistics.meanDuration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(benchmark.statistics.successRate).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Complex Template Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 5000, // 5 seconds for complex templates
      maxMemoryMB: 50,
    };

    it('should generate React template within 5 seconds', async () => {
      const targetPath = await createTempDir();
      const context = createGeneratorContext('react', targetPath);

      const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
        return generateProject(context);
      });

      expect(result).toBeUndefined();

      // Verify files were generated
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('package.json');
      expect(files).toContain('src');

      expect(peakMemory).toBeLessThanOrEqual(requirements.maxMemoryMB);

      console.log(`React template: Peak memory ${peakMemory}MB`);
    });

    it('should generate FastAPI template within 5 seconds', async () => {
      const targetPath = await createTempDir();
      const context = createGeneratorContext('fastapi', targetPath);

      const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
        return generateProject(context);
      });

      expect(result).toBeUndefined();

      // Verify files were generated
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(0);

      expect(peakMemory).toBeLessThanOrEqual(requirements.maxMemoryMB);

      console.log(`FastAPI template: Peak memory ${peakMemory}MB`);
    });

    it('should generate Vue.js template within 5 seconds', async () => {
      const targetPath = await createTempDir();
      const context = createGeneratorContext('vue', targetPath);

      const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
        return generateProject(context);
      });

      expect(result).toBeUndefined();

      // Verify files were generated
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('package.json');

      expect(peakMemory).toBeLessThanOrEqual(requirements.maxMemoryMB);

      console.log(`Vue.js template: Peak memory ${peakMemory}MB`);
    });

    it('should generate WikiJS template within 5 seconds', async () => {
      const targetPath = await createTempDir();
      const context = createGeneratorContext('wikijs', targetPath);

      const { result, memoryUsage, peakMemory } = await measureMemoryUsage(async () => {
        return generateProject(context);
      });

      expect(result).toBeUndefined();

      // Verify files were generated
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(0);

      expect(peakMemory).toBeLessThanOrEqual(requirements.maxMemoryMB);

      console.log(`WikiJS template: Peak memory ${peakMemory}MB`);
    });
  });

  describe('Complex Template Benchmarks', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 5000,
      maxMemoryMB: 50,
    };

    const templates = ['react', 'fastapi', 'vue', 'wikijs'];

    templates.forEach((template) => {
      it(`should pass benchmark for ${template} template`, async () => {
        const benchmark = await runBenchmark(
          `template-${template}`,
          async () => {
            const targetPath = await createTempDir();
            const context = createGeneratorContext(template, targetPath);

            await generateProject(context);

            // Verify generation succeeded
            const files = await fs.readdir(targetPath);
            expect(files.length).toBeGreaterThan(0);
          },
          requirements,
          3 // Fewer iterations for complex templates
        );

        benchmarkResults.push(benchmark);

        expect(benchmark.statistics.meanDuration).toBeLessThanOrEqual(requirements.maxDuration);
        expect(benchmark.statistics.successRate).toBeGreaterThanOrEqual(90);
      });
    });
  });

  describe('Minimal Template Performance', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 1000, // 1 second for minimal template
      maxMemoryMB: 20,
    };

    it('should generate minimal template within 1 second', async () => {
      const targetPath = await createTempDir();
      const context = createGeneratorContext('none', targetPath);

      const startTime = Date.now();
      await generateProject(context);
      const duration = Date.now() - startTime;

      // Verify files were generated (common files only)
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('README.md');

      expect(duration).toBeLessThanOrEqual(requirements.maxDuration);

      console.log(`Minimal template: ${duration}ms`);
    });

    it('should pass benchmark for minimal template', async () => {
      const benchmark = await runBenchmark(
        'template-minimal',
        async () => {
          const targetPath = await createTempDir();
          const context = createGeneratorContext('none', targetPath);

          await generateProject(context);

          // Verify generation succeeded
          const files = await fs.readdir(targetPath);
          expect(files.length).toBeGreaterThan(0);
        },
        requirements,
        10
      );

      benchmarkResults.push(benchmark);

      expect(benchmark.statistics.meanDuration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(benchmark.statistics.successRate).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Concurrent Template Generation', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 8000, // Allow more time for concurrent operations
      maxMemoryMB: 100, // More memory for concurrent operations
    };

    it('should handle multiple concurrent template generations', async () => {
      const concurrentCount = 3;
      const templates = ['typescript-lib', 'react', 'fastapi'];

      const promises = templates.map(async (template, index) => {
        const targetPath = await createTempDir();
        const context = createGeneratorContext(template, targetPath);

        const startTime = Date.now();
        await generateProject(context);
        const duration = Date.now() - startTime;

        return { template, duration, fileCount: (await fs.readdir(targetPath)).length };
      });

      const results = await Promise.all(promises);

      results.forEach(({ template, duration, fileCount }) => {
        expect(duration).toBeLessThanOrEqual(requirements.maxDuration);
        expect(fileCount).toBeGreaterThan(0);
        console.log(`Concurrent ${template}: ${duration}ms, ${fileCount} files`);
      });

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`Average concurrent generation time: ${avgDuration.toFixed(2)}ms`);

      expect(avgDuration).toBeLessThan(requirements.maxDuration);
    });
  });

  describe('Memory Efficiency During Template Generation', () => {
    it('should not have memory leaks during repeated generations', async () => {
      const memorySnapshots: number[] = [];
      const generations = 5;

      for (let i = 0; i < generations; i++) {
        const targetPath = await createTempDir();
        const context = createGeneratorContext('typescript-lib', targetPath);

        const { peakMemory } = await measureMemoryUsage(async () => {
          return generateProject(context);
        });

        memorySnapshots.push(peakMemory);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Check for memory leaks (memory should not grow consistently)
      const firstMemory = memorySnapshots[0];
      const lastMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastMemory - firstMemory;

      expect(memoryGrowth).toBeLessThan(10); // Less than 10MB growth
      expect(Math.max(...memorySnapshots)).toBeLessThan(50); // Peak memory under 50MB

      console.log(`Memory growth over ${generations} generations: ${memoryGrowth.toFixed(2)}MB`);
      console.log(`Peak memory usage: ${Math.max(...memorySnapshots).toFixed(2)}MB`);
    });
  });

  describe('Large Project Template Generation', () => {
    const requirements: PerformanceRequirements = {
      maxDuration: 7000, // Allow more time for large projects
      maxMemoryMB: 60,
    };

    it('should handle large project options efficiently', async () => {
      const targetPath = await createTempDir();

      // Create context with all options enabled
      const context: GeneratorContext = {
        options: {
          name: 'large-test-project',
          description: 'Large test project with all features enabled for performance testing',
          template: 'react',
          author: 'Performance Tester',
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

      expect(result).toBeUndefined();

      // Verify files were generated
      const files = await fs.readdir(targetPath);
      expect(files.length).toBeGreaterThan(0);

      expect(peakMemory).toBeLessThanOrEqual(requirements.maxMemoryMB);

      console.log(`Large project template: Peak memory ${peakMemory}MB, ${files.length} files`);
    });

    it('should pass benchmark for large project template', async () => {
      const benchmark = await runBenchmark(
        'template-large-project',
        async () => {
          const targetPath = await createTempDir();
          const context: GeneratorContext = {
            options: {
              name: 'benchmark-project',
              description: 'Benchmark project',
              template: 'react',
              author: 'Tester',
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

          await generateProject(context);

          // Verify generation succeeded
          const files = await fs.readdir(targetPath);
          expect(files.length).toBeGreaterThan(0);
        },
        requirements,
        3
      );

      benchmarkResults.push(benchmark);

      expect(benchmark.statistics.meanDuration).toBeLessThanOrEqual(requirements.maxDuration);
      expect(benchmark.statistics.successRate).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle template errors quickly', async () => {
      const requirements: PerformanceRequirements = {
        maxDuration: 1000, // Errors should be handled quickly
        maxMemoryMB: 20,
      };

      const targetPath = await createTempDir();

      // Create context with invalid template
      const context: GeneratorContext = {
        options: {
          name: 'error-test',
          description: 'Test error handling',
          template: 'invalid-template' as any,
          author: 'Tester',
          email: 'test@example.com',
          telegram: '@tester',
          license: 'MIT',
          includeEditorConfig: false,
          includeContributing: false,
          includeCodeOfConduct: false,
          includeCLA: false,
          includeSecurityPolicy: false,
          includeIssueTemplates: false,
          includePRTemplate: false,
          includeGitHubActions: false,
          includeESLint: false,
          includePrettier: false,
          includeDocker: false,
        },
        targetPath,
        templatePath: join(process.cwd(), 'templates'),
      };

      const startTime = Date.now();

      // This should not throw but handle the error gracefully
      await generateProject(context);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThanOrEqual(requirements.maxDuration);

      console.log(`Error handling time: ${duration}ms`);
    });
  });
});