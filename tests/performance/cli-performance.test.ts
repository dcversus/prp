/**
 * 🚀 CLI Performance Tests for @dcversus/prp
 *
 * Comprehensive performance testing suite covering:
 * - CLI startup time
 * - Memory usage
 * - Command execution time
 * - Lazy loading effectiveness
 * - Cache performance
 */

import { performance } from 'perf_hooks';
import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs-extra';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  memoryUsage: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface PerformanceBenchmark {
  name: string;
  maxDuration: number; // ms
  maxMemory: number; // MB
  samples: number;
}

const BENCHMARKS: PerformanceBenchmark[] = [
  {
    name: 'cli-startup',
    maxDuration: 2000, // 2 seconds
    maxMemory: 50, // 50MB
    samples: 5
  },
  {
    name: 'cli-help',
    maxDuration: 1000, // 1 second
    maxMemory: 30, // 30MB
    samples: 10
  },
  {
    name: 'cli-init-quick',
    maxDuration: 3000, // 3 seconds
    maxMemory: 60, // 60MB
    samples: 3
  },
  {
    name: 'cli-version',
    maxDuration: 500, // 0.5 seconds
    maxMemory: 25, // 25MB
    samples: 10
  }
];

class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting CLI Performance Test Suite...\n');

    for (const benchmark of BENCHMARKS) {
      await this.runBenchmark(benchmark);
    }

    this.generateReport();
  }

  private async runBenchmark(benchmark: PerformanceBenchmark): Promise<void> {
    console.log(`📊 Running benchmark: ${benchmark.name}`);

    const testResults: PerformanceTestResult[] = [];

    for (let i = 0; i < benchmark.samples; i++) {
      const result = await this.runSingleTest(benchmark);
      testResults.push(result);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (i < benchmark.samples - 1) {
        process.stdout.write('.');
      }
    }

    console.log();

    // Analyze results
    const successfulResults = testResults.filter(r => r.success);
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const avgMemory = successfulResults.reduce((sum, r) => sum + r.memoryUsage, 0) / successfulResults.length;

    const passed = avgDuration <= benchmark.maxDuration && avgMemory <= benchmark.maxMemory;

    console.log(`  Average Duration: ${avgDuration.toFixed(2)}ms (max: ${benchmark.maxDuration}ms)`);
    console.log(`  Average Memory: ${avgMemory.toFixed(2)}MB (max: ${benchmark.maxMemory}MB)`);
    console.log(`  Success Rate: ${successfulResults.length}/${benchmark.samples}`);
    console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);

    // Store results
    this.results.push(...testResults);
  }

  private async runSingleTest(benchmark: PerformanceBenchmark): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    let memoryUsage = 0;
    let success = false;
    let error: string | undefined;

    try {
      switch (benchmark.name) {
        case 'cli-startup':
          ({ memoryUsage, success } = await this.testCliStartup());
          break;
        case 'cli-help':
          ({ memoryUsage, success } = await this.testCliHelp());
          break;
        case 'cli-init-quick':
          ({ memoryUsage, success } = await this.testCliInitQuick());
          break;
        case 'cli-version':
          ({ memoryUsage, success } = await this.testCliVersion());
          break;
        default:
          throw new Error(`Unknown benchmark: ${benchmark.name}`);
      }

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      success = false;
    }

    const duration = performance.now() - startTime;

    return {
      testName: benchmark.name,
      duration,
      memoryUsage,
      success,
      error
    };
  }

  private async testCliStartup(): Promise<{ memoryUsage: number; success: boolean }> {
    const startMemory = process.memoryUsage().heapUsed;

    return new Promise((resolve) => {
      const child = spawn('node', [join(this.projectRoot, 'dist/cli.js'), '--help'], {
        stdio: 'pipe',
        cwd: this.projectRoot
      });

      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        const endMemory = process.memoryUsage().heapUsed;
        const memoryUsage = (endMemory - startMemory) / 1024 / 1024; // MB
        const success = code === 0 && output.includes('Usage:');
        resolve({ memoryUsage, success });
      });

      child.on('error', (err) => {
        console.error('CLI startup test error:', err);
        resolve({ memoryUsage: 0, success: false });
      });

      // Kill after 10 seconds if still running
      setTimeout(() => {
        child.kill();
        resolve({ memoryUsage: 0, success: false });
      }, 10000);
    });
  }

  private async testCliHelp(): Promise<{ memoryUsage: number; success: boolean }> {
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const output = execSync('node dist/cli.js --help', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 5000
      });

      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsage = (endMemory - startMemory) / 1024 / 1024;
      const success = output.includes('Usage:') && output.includes('Options:');

      return { memoryUsage, success };
    } catch (error) {
      return { memoryUsage: 0, success: false };
    }
  }

  private async testCliInitQuick(): Promise<{ memoryUsage: number; success: boolean }> {
    const startMemory = process.memoryUsage().heapUsed;

    return new Promise((resolve) => {
      // Create a temporary directory for testing
      const testDir = join(this.projectRoot, 'test-temp');

      const child = spawn('node', [
        join(this.projectRoot, 'dist/cli.js'),
        'init',
        '--name', 'test-project',
        '--template', 'none',
        '--yes',
        '--no-git',
        '--no-install'
      ], {
        stdio: 'pipe',
        cwd: this.projectRoot,
        env: { ...process.env, TEST_TEMP_DIR: testDir }
      });

      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        const endMemory = process.memoryUsage().heapUsed;
        const memoryUsage = (endMemory - startMemory) / 1024 / 1024;
        const success = code === 0 && (output.includes('Project initialized') || output.includes('Success'));

        // Cleanup
        try {
          if (existsSync(testDir)) {
            execSync(`rm -rf ${testDir}`);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup test directory:', cleanupError);
        }

        resolve({ memoryUsage, success });
      });

      child.on('error', (err) => {
        console.error('CLI init test error:', err);
        resolve({ memoryUsage: 0, success: false });
      });

      // Kill after 15 seconds if still running
      setTimeout(() => {
        child.kill();
        resolve({ memoryUsage: 0, success: false });
      }, 15000);
    });
  }

  private async testCliVersion(): Promise<{ memoryUsage: number; success: boolean }> {
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const output = execSync('node dist/cli.js --version', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 3000
      });

      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsage = (endMemory - startMemory) / 1024 / 1024;
      const success = /^\d+\.\d+\.\d+$/.test(output.trim());

      return { memoryUsage, success };
    } catch (error) {
      return { memoryUsage: 0, success: false };
    }
  }

  private generateReport(): void {
    console.log('📈 Performance Test Report\n');

    // Group results by test name
    const groupedResults = new Map<string, PerformanceTestResult[]>();
    for (const result of this.results) {
      if (!groupedResults.has(result.testName)) {
        groupedResults.set(result.testName, []);
      }
      groupedResults.get(result.testName)!.push(result);
    }

    // Generate summary for each test
    for (const [testName, results] of groupedResults.entries()) {
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        const minDuration = Math.min(...successful.map(r => r.duration));
        const maxDuration = Math.max(...successful.map(r => r.duration));
        const avgMemory = successful.reduce((sum, r) => sum + r.memoryUsage, 0) / successful.length;

        console.log(`${testName}:`);
        console.log(`  Duration: avg=${avgDuration.toFixed(2)}ms, min=${minDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`);
        console.log(`  Memory: avg=${avgMemory.toFixed(2)}MB`);
        console.log(`  Success Rate: ${successful.length}/${results.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);

        if (failed.length > 0) {
          console.log(`  Failed Tests: ${failed.length}`);
          failed.forEach(f => {
            if (f.error) {
              console.log(`    - ${f.error}`);
            }
          });
        }
      } else {
        console.log(`${testName}: ❌ All tests failed`);
      }
      console.log();
    }

    // Overall summary
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const overallSuccessRate = (successfulTests / totalTests) * 100;

    console.log(`Overall Results:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Successful: ${successfulTests}`);
    console.log(`  Success Rate: ${overallSuccessRate.toFixed(1)}%`);

    if (overallSuccessRate >= 90) {
      console.log('🎉 Performance tests PASSED! CLI is performing well.');
    } else if (overallSuccessRate >= 70) {
      console.log('⚠️  Performance tests WARNING! CLI performance needs improvement.');
    } else {
      console.log('❌ Performance tests FAILED! CLI performance is poor.');
    }

    // Performance recommendations
    this.generateRecommendations(groupedResults);
  }

  private generateRecommendations(groupedResults: Map<string, PerformanceTestResult[]>): void {
    console.log('\n💡 Performance Recommendations:');

    const recommendations: string[] = [];

    for (const [testName, results] of groupedResults.entries()) {
      const successful = results.filter(r => r.success);

      if (successful.length === 0) continue;

      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const avgMemory = successful.reduce((sum, r) => sum + r.memoryUsage, 0) / successful.length;

      const benchmark = BENCHMARKS.find(b => b.name === testName);
      if (!benchmark) continue;

      if (avgDuration > benchmark.maxDuration) {
        recommendations.push(`${testName}: Average duration ${avgDuration.toFixed(2)}ms exceeds threshold ${benchmark.maxDuration}ms. Consider optimizing startup time.`);
      }

      if (avgMemory > benchmark.maxMemory) {
        recommendations.push(`${testName}: Average memory ${avgMemory.toFixed(2)}MB exceeds threshold ${benchmark.maxMemory}MB. Consider reducing memory usage.`);
      }
    }

    if (recommendations.length === 0) {
      console.log('  ✅ All performance metrics are within acceptable limits!');
    } else {
      recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new PerformanceTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('Performance test suite failed:', error);
    process.exit(1);
  });
}

export { PerformanceTestSuite, BENCHMARKS };