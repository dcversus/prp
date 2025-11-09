#!/usr/bin/env node

/**
 * Performance Benchmark Runner
 *
 * Comprehensive performance testing script that runs all performance benchmarks
 * and generates detailed reports for regression detection.
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class BenchmarkRunner {
  constructor(options = {}) {
    this.options = {
      iterations: options.iterations || 5,
      timeout: options.timeout || 30000,
      outputDir: options.outputDir || join(projectRoot, 'tmp'),
      verbose: options.verbose || false,
      compare: options.compare || false, // Compare with previous results
      ...options,
    };

    this.results = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      benchmarks: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        regressions: 0,
      },
    };

    this.performanceRequirements = {
      cli: {
        startup: { maxDuration: 2000, maxMemoryMB: 50 },
        help: { maxDuration: 2000, maxMemoryMB: 50 },
        version: { maxDuration: 1500, maxMemoryMB: 30 },
      },
      templates: {
        simple: { maxDuration: 2000, maxMemoryMB: 30 },
        complex: { maxDuration: 5000, maxMemoryMB: 50 },
        minimal: { maxDuration: 1000, maxMemoryMB: 20 },
      },
      memory: {
        baseline: { maxMemoryMB: 50 },
        operations: { maxMemoryMB: 50 },
        stress: { maxMemoryMB: 80 },
      },
    };
  }

  async run() {
    console.log('🚀 Starting Performance Benchmark Suite\n');
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}-${process.arch}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Iterations: ${this.options.iterations}`);
    console.log(`Timeout: ${this.options.timeout}ms\n`);

    try {
      await this.ensureOutputDirectory();
      await this.buildProject();

      // Run all benchmark categories
      await this.runCLIBenchmarks();
      await this.runTemplateBenchmarks();
      await this.runMemoryBenchmarks();
      await this.runStressTests();

      // Generate reports
      await this.generateReports();

      // Print summary
      this.printSummary();

      // Exit with appropriate code
      process.exit(this.results.summary.failed > 0 ? 1 : 0);

    } catch (error) {
      console.error('\n❌ Benchmark suite failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error.message}`);
    }
  }

  async buildProject() {
    console.log('📦 Building project...');
    try {
      execSync('npm run build', {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        cwd: projectRoot
      });
      console.log('✅ Build completed\n');
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async runCLIBenchmarks() {
    console.log('🖥️  Running CLI Performance Benchmarks...\n');

    const cliPath = join(projectRoot, 'dist', 'cli.js');

    const benchmarks = [
      {
        name: 'cli-startup-help',
        command: 'node',
        args: [cliPath, '--help'],
        requirements: this.performanceRequirements.cli.help,
        iterations: 10,
      },
      {
        name: 'cli-startup-version',
        command: 'node',
        args: [cliPath, '--version'],
        requirements: this.performanceRequirements.cli.version,
        iterations: 15,
      },
      {
        name: 'cli-startup-debug',
        command: 'node',
        args: [cliPath, '--debug', '--help'],
        requirements: { maxDuration: 3000, maxMemoryMB: 60 },
        iterations: 5,
      },
    ];

    for (const benchmark of benchmarks) {
      const result = await this.runBenchmark(benchmark);
      this.results.benchmarks.push(result);
      this.updateSummary(result);
    }
  }

  async runTemplateBenchmarks() {
    console.log('📝 Running Template Generation Benchmarks...\n');

    // Ensure Node.js can find built modules
    process.env.NODE_PATH = join(projectRoot, 'dist');

    const benchmarks = [
      {
        name: 'template-minimal',
        script: join(projectRoot, 'tests', 'performance', 'template-generation.test.ts'),
        testPattern: 'should generate minimal template within 1 second',
        requirements: this.performanceRequirements.templates.minimal,
        iterations: 10,
      },
      {
        name: 'template-typescript-lib',
        script: join(projectRoot, 'tests', 'performance', 'template-generation.test.ts'),
        testPattern: 'should generate TypeScript library template within 2 seconds',
        requirements: this.performanceRequirements.templates.simple,
        iterations: 5,
      },
      {
        name: 'template-react',
        script: join(projectRoot, 'tests', 'performance', 'template-generation.test.ts'),
        testPattern: 'should generate React template within 5 seconds',
        requirements: this.performanceRequirements.templates.complex,
        iterations: 3,
      },
      {
        name: 'template-fastapi',
        script: join(projectRoot, 'tests', 'performance', 'template-generation.test.ts'),
        testPattern: 'should generate FastAPI template within 5 seconds',
        requirements: this.performanceRequirements.templates.complex,
        iterations: 3,
      },
    ];

    for (const benchmark of benchmarks) {
      const result = await this.runJestBenchmark(benchmark);
      this.results.benchmarks.push(result);
      this.updateSummary(result);
    }
  }

  async runMemoryBenchmarks() {
    console.log('💾 Running Memory Usage Benchmarks...\n');

    const benchmarks = [
      {
        name: 'memory-baseline',
        script: join(projectRoot, 'tests', 'performance', 'memory-usage.test.ts'),
        testPattern: 'should have reasonable baseline memory usage',
        requirements: this.performanceRequirements.memory.baseline,
        iterations: 1,
      },
      {
        name: 'memory-template-generation',
        script: join(projectRoot, 'tests', 'performance', 'memory-usage.test.ts'),
        testPattern: 'should stay within memory limits during template generation',
        requirements: this.performanceRequirements.memory.operations,
        iterations: 3,
      },
      {
        name: 'memory-leak-detection',
        script: join(projectRoot, 'tests', 'performance', 'memory-usage.test.ts'),
        testPattern: 'should not leak memory during repeated template generations',
        requirements: { maxMemoryGrowthMB: 15 },
        iterations: 1,
      },
    ];

    for (const benchmark of benchmarks) {
      const result = await this.runJestBenchmark(benchmark);
      this.results.benchmarks.push(result);
      this.updateSummary(result);
    }
  }

  async runStressTests() {
    console.log('💪 Running Stress Tests...\n');

    const benchmarks = [
      {
        name: 'stress-concurrent-cli',
        script: join(projectRoot, 'tests', 'performance', 'cli-startup.test.ts'),
        testPattern: 'should handle multiple concurrent CLI processes',
        requirements: { maxDuration: 3000, maxMemoryMB: 100 },
        iterations: 2,
      },
      {
        name: 'stress-concurrent-templates',
        script: join(projectRoot, 'tests', 'performance', 'template-generation.test.ts'),
        testPattern: 'should handle multiple concurrent template generations',
        requirements: { maxDuration: 8000, maxMemoryMB: 100 },
        iterations: 2,
      },
    ];

    for (const benchmark of benchmarks) {
      const result = await this.runJestBenchmark(benchmark);
      this.results.benchmarks.push(result);
      this.updateSummary(result);
    }
  }

  async runBenchmark(benchmark) {
    console.log(`📊 Running ${benchmark.name}...`);

    const measurements = [];
    let failures = 0;

    for (let i = 0; i < benchmark.iterations; i++) {
      if (this.options.verbose) {
        process.stdout.write(`  Iteration ${i + 1}/${benchmark.iterations}... `);
      }

      try {
        const measurement = await this.measureCommand(benchmark);
        measurements.push(measurement);

        if (this.options.verbose) {
          console.log(`${measurement.duration}ms, ${measurement.memoryMB}MB`);
        } else {
          process.stdout.write('.');
        }
      } catch (error) {
        failures++;
        if (this.options.verbose) {
          console.log(`❌ Failed: ${error.message}`);
        } else {
          process.stdout.write('F');
        }
      }
    }

    if (!this.options.verbose) {
      console.log();
    }

    return this.analyzeMeasurements(benchmark, measurements, failures);
  }

  async runJestBenchmark(benchmark) {
    console.log(`🧪 Running ${benchmark.name}...`);

    try {
      const jestPath = join(projectRoot, 'node_modules', '.bin', 'jest');
      const testMatch = benchmark.testPattern
        ? `--testNamePattern="${benchmark.testPattern}"`
        : '';

      const output = execSync(
        `${jestPath} "${benchmark.script}" ${testMatch} --verbose --json`,
        {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: this.options.timeout,
          env: {
            ...process.env,
            NODE_OPTIONS: '--max-old-space-size=4096',
          },
        }
      );

      const jestResults = JSON.parse(output);
      return this.analyzeJestResults(benchmark, jestResults);

    } catch (error) {
      // Jest returns non-zero exit code on test failures
      if (error.stdout) {
        try {
          const jestResults = JSON.parse(error.stdout);
          return this.analyzeJestResults(benchmark, jestResults);
        } catch (parseError) {
          // Fall through to error handling
        }
      }

      return {
        name: benchmark.name,
        passed: false,
        error: error.message,
        duration: 0,
        measurements: [],
        requirements: benchmark.requirements,
      };
    }
  }

  async measureCommand(benchmark) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    try {
      execSync(`${benchmark.command} ${benchmark.args.join(' ')}`, {
        stdio: 'pipe',
        timeout: this.options.timeout,
        cwd: projectRoot,
      });

      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();

      return {
        duration: Number(endTime - startTime) / 1000000, // Convert to milliseconds
        memoryMB: endMemory.heapUsed / 1024 / 1024,
        success: true,
      };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();

      return {
        duration: Number(endTime - startTime) / 1000000,
        memoryMB: endMemory.heapUsed / 1024 / 1024,
        success: false,
        error: error.message,
      };
    }
  }

  analyzeMeasurements(benchmark, measurements, failures) {
    if (measurements.length === 0) {
      return {
        name: benchmark.name,
        passed: false,
        error: 'All measurements failed',
        duration: 0,
        measurements: [],
        requirements: benchmark.requirements,
        failures,
      };
    }

    const durations = measurements.map(m => m.duration).filter(d => d > 0);
    const memories = measurements.map(m => m.memoryMB).filter(m => m > 0);

    const statistics = {
      meanDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      meanMemory: memories.length > 0 ? memories.reduce((a, b) => a + b, 0) / memories.length : 0,
      maxMemory: memories.length > 0 ? Math.max(...memories) : 0,
      successRate: ((measurements.length - failures) / measurements.length) * 100,
    };

    const passed = this.checkRequirements(benchmark.requirements, statistics, failures);

    return {
      name: benchmark.name,
      passed,
      statistics,
      measurements,
      requirements: benchmark.requirements,
      failures,
      iterations: benchmark.iterations,
    };
  }

  analyzeJestResults(benchmark, jestResults) {
    const testResults = jestResults.testResults || [];
    const relevantTests = testResults.filter(tr =>
      tr.testResults.some(t => t.fullName.includes(benchmark.testPattern || ''))
    );

    if (relevantTests.length === 0) {
      return {
        name: benchmark.name,
        passed: false,
        error: `No tests found matching pattern: ${benchmark.testPattern}`,
        duration: 0,
        measurements: [],
        requirements: benchmark.requirements,
      };
    }

    const durations = [];
    let failures = 0;
    let totalDuration = 0;

    relevantTests.forEach(testResult => {
      testResult.testResults.forEach(test => {
        if (test.status === 'passed') {
          durations.push(test.duration || 0);
        } else {
          failures++;
        }
        totalDuration += test.duration || 0;
      });
    });

    const statistics = {
      meanDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      successRate: ((relevantTests.length - failures) / relevantTests.length) * 100,
    };

    const passed = this.checkRequirements(benchmark.requirements, statistics, failures);

    return {
      name: benchmark.name,
      passed,
      statistics,
      measurements: durations.map(d => ({ duration: d, success: true })),
      requirements: benchmark.requirements,
      failures,
      iterations: relevantTests.length,
      totalTestDuration: totalDuration,
    };
  }

  checkRequirements(requirements, statistics, failures) {
    const successRate = statistics.successRate || 0;

    // Check success rate
    if (successRate < 90) {
      return false;
    }

    // Check duration requirement
    if (requirements.maxDuration && statistics.meanDuration > requirements.maxDuration) {
      return false;
    }

    // Check memory requirement
    if (requirements.maxMemoryMB && statistics.maxMemory > requirements.maxMemoryMB) {
      return false;
    }

    // Check memory growth requirement
    if (requirements.maxMemoryGrowthMB && statistics.memoryGrowth > requirements.maxMemoryGrowthMB) {
      return false;
    }

    return true;
  }

  updateSummary(result) {
    this.results.summary.total++;
    if (result.passed) {
      this.results.summary.passed++;
      console.log(`✅ ${result.name} - PASSED`);
    } else {
      this.results.summary.failed++;
      console.log(`❌ ${result.name} - FAILED`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    if (this.options.verbose && result.statistics) {
      console.log(`   Duration: ${result.statistics.meanDuration?.toFixed(2)}ms`);
      console.log(`   Memory: ${result.statistics.maxMemory?.toFixed(2)}MB`);
      console.log(`   Success Rate: ${result.statistics.successRate?.toFixed(1)}%`);
    }
  }

  async generateReports() {
    console.log('\n📄 Generating Reports...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = join(this.options.outputDir, `benchmark-results-${timestamp}.json`);
    const markdownPath = join(this.options.outputDir, `benchmark-report-${timestamp}.md`);

    // Save JSON results
    await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));

    // Generate markdown report
    const markdown = this.generateMarkdownReport();
    await fs.writeFile(markdownPath, markdown);

    console.log(`📊 JSON report saved to: ${jsonPath}`);
    console.log(`📝 Markdown report saved to: ${markdownPath}`);

    // Compare with previous results if requested
    if (this.options.compare) {
      await this.compareWithPrevious(jsonPath);
    }
  }

  generateMarkdownReport() {
    let markdown = `# Performance Benchmark Report\n\n`;
    markdown += `Generated on: ${this.results.timestamp}\n`;
    markdown += `Node.js Version: ${this.results.nodeVersion}\n`;
    markdown += `Platform: ${this.results.platform}-${this.results.arch}\n\n`;

    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Benchmarks**: ${this.results.summary.total}\n`;
    markdown += `- **Passed**: ${this.results.summary.passed}\n`;
    markdown += `- **Failed**: ${this.results.summary.failed}\n`;
    markdown += `- **Success Rate**: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%\n\n`;

    // Individual benchmarks
    markdown += `## Benchmark Results\n\n`;

    for (const benchmark of this.results.benchmarks) {
      markdown += `### ${benchmark.name}\n\n`;
      markdown += `**Status**: ${benchmark.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

      if (benchmark.statistics) {
        markdown += `| Metric | Value |\n`;
        markdown += `|--------|-------|\n`;

        if (benchmark.statistics.meanDuration !== undefined) {
          markdown += `| Mean Duration | ${benchmark.statistics.meanDuration.toFixed(2)}ms |\n`;
        }
        if (benchmark.statistics.minDuration !== undefined) {
          markdown += `| Min Duration | ${benchmark.statistics.minDuration.toFixed(2)}ms |\n`;
        }
        if (benchmark.statistics.maxDuration !== undefined) {
          markdown += `| Max Duration | ${benchmark.statistics.maxDuration.toFixed(2)}ms |\n`;
        }
        if (benchmark.statistics.maxMemory !== undefined) {
          markdown += `| Max Memory | ${benchmark.statistics.maxMemory.toFixed(2)}MB |\n`;
        }
        if (benchmark.statistics.successRate !== undefined) {
          markdown += `| Success Rate | ${benchmark.statistics.successRate.toFixed(1)}% |\n`;
        }

        markdown += `\n`;

        // Requirements comparison
        if (benchmark.requirements) {
          markdown += `**Requirements**:\n`;
          if (benchmark.requirements.maxDuration) {
            const passed = !benchmark.statistics.meanDuration || benchmark.statistics.meanDuration <= benchmark.requirements.maxDuration;
            markdown += `- Duration: ${passed ? '✅' : '❌'} ${benchmark.statistics.meanDuration?.toFixed(2)}ms ≤ ${benchmark.requirements.maxDuration}ms\n`;
          }
          if (benchmark.requirements.maxMemoryMB) {
            const passed = !benchmark.statistics.maxMemory || benchmark.statistics.maxMemory <= benchmark.requirements.maxMemoryMB;
            markdown += `- Memory: ${passed ? '✅' : '❌'} ${benchmark.statistics.maxMemory?.toFixed(2)}MB ≤ ${benchmark.requirements.maxMemoryMB}MB\n`;
          }
          markdown += `\n`;
        }
      }

      if (benchmark.error) {
        markdown += `**Error**: ${benchmark.error}\n\n`;
      }

      markdown += `---\n\n`;
    }

    // Performance recommendations
    markdown += `## Performance Recommendations\n\n`;

    const failedBenchmarks = this.results.benchmarks.filter(b => !b.passed);
    if (failedBenchmarks.length === 0) {
      markdown += `🎉 All benchmarks are passing! The system meets performance requirements.\n\n`;
    } else {
      markdown += `⚠️ ${failedBenchmarks.length} benchmark(s) are failing. Consider the following:\n\n`;

      for (const benchmark of failedBenchmarks) {
        markdown += `### ${benchmark.name}\n`;

        if (benchmark.statistics) {
          if (benchmark.statistics.meanDuration > benchmark.requirements?.maxDuration) {
            markdown += `- **Duration Optimization**: Mean duration (${benchmark.statistics.meanDuration.toFixed(2)}ms) exceeds limit (${benchmark.requirements.maxDuration}ms)\n`;
          }
          if (benchmark.statistics.maxMemory > benchmark.requirements?.maxMemoryMB) {
            markdown += `- **Memory Optimization**: Peak memory (${benchmark.statistics.maxMemory.toFixed(2)}MB) exceeds limit (${benchmark.requirements.maxMemoryMB}MB)\n`;
          }
        }

        markdown += `\n`;
      }
    }

    return markdown;
  }

  async compareWithPrevious(currentResultsPath) {
    // Find previous results file
    const files = await fs.readdir(this.options.outputDir);
    const resultFiles = files
      .filter(f => f.startsWith('benchmark-results-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (resultFiles.length <= 1) {
      console.log('ℹ️  No previous results found for comparison');
      return;
    }

    const previousResultsPath = join(this.options.outputDir, resultFiles[1]);

    try {
      const currentResults = JSON.parse(await fs.readFile(currentResultsPath, 'utf8'));
      const previousResults = JSON.parse(await fs.readFile(previousResultsPath, 'utf8'));

      console.log('\n📊 Performance Comparison with Previous Run:');

      // Compare overall summary
      const currentSuccessRate = (currentResults.summary.passed / currentResults.summary.total) * 100;
      const previousSuccessRate = (previousResults.summary.passed / previousResults.summary.total) * 100;

      console.log(`Overall Success Rate: ${currentSuccessRate.toFixed(1)}% (${previousSuccessRate.toFixed(1)}% previous)`);

      if (currentSuccessRate < previousSuccessRate) {
        console.log('⚠️  Success rate decreased - potential regression detected');
        this.results.summary.regressions++;
      } else if (currentSuccessRate > previousSuccessRate) {
        console.log('✅ Success rate improved - performance enhanced');
      }

      // Compare individual benchmarks
      for (const current of currentResults.benchmarks) {
        const previous = previousResults.benchmarks.find(b => b.name === current.name);
        if (!previous) continue;

        if (current.statistics && previous.statistics) {
          const durationChange = current.statistics.meanDuration - previous.statistics.meanDuration;
          const durationChangePercent = (durationChange / previous.statistics.meanDuration) * 100;

          if (Math.abs(durationChangePercent) > 10) { // Significant change
            const direction = durationChangePercent > 0 ? '⚠️  Slower' : '✅ Faster';
            console.log(`${current.name}: ${direction} by ${Math.abs(durationChangePercent).toFixed(1)}%`);
          }
        }
      }

    } catch (error) {
      console.log('⚠️  Failed to compare with previous results:', error.message);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 BENCHMARK SUITE SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n📊 Results Summary:`);
    console.log(`   Total Benchmarks: ${this.results.summary.total}`);
    console.log(`   ✅ Passed: ${this.results.summary.passed}`);
    console.log(`   ❌ Failed: ${this.results.summary.failed}`);
    console.log(`   📈 Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);

    if (this.results.summary.regressions > 0) {
      console.log(`   ⚠️  Regressions Detected: ${this.results.summary.regressions}`);
    }

    // Performance health indicators
    console.log(`\n🏥 Performance Health:`);

    const slowBenchmarks = this.results.benchmarks.filter(b =>
      b.statistics?.meanDuration && b.statistics.meanDuration > 3000
    );

    const memoryHeavyBenchmarks = this.results.benchmarks.filter(b =>
      b.statistics?.maxMemory && b.statistics.maxMemory > 60
    );

    if (slowBenchmarks.length === 0 && memoryHeavyBenchmarks.length === 0) {
      console.log(`   ✅ All benchmarks within performance limits`);
    } else {
      if (slowBenchmarks.length > 0) {
        console.log(`   ⚠️  ${slowBenchmarks.length} slow benchmark(s) (>3s)`);
      }
      if (memoryHeavyBenchmarks.length > 0) {
        console.log(`   ⚠️  ${memoryHeavyBenchmarks.length} memory-heavy benchmark(s) (>60MB)`);
      }
    }

    console.log(`\n${this.results.summary.failed === 0 ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(60));
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--iterations':
        options.iterations = parseInt(args[++i]);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--output':
        options.outputDir = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--compare':
      case '-c':
        options.compare = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Performance Benchmark Runner

Usage: node scripts/benchmark.js [options]

Options:
  --iterations <n>    Number of iterations for each benchmark (default: 5)
  --timeout <ms>      Timeout for each benchmark in milliseconds (default: 30000)
  --output <dir>      Output directory for reports (default: ./tmp)
  --verbose, -v       Enable verbose output
  --compare, -c       Compare results with previous run
  --help, -h          Show this help message

Examples:
  node scripts/benchmark.js --iterations 10 --verbose
  node scripts/benchmark.js --compare --output ./reports
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const runner = new BenchmarkRunner(options);
  runner.run().catch(error => {
    console.error('Benchmark runner failed:', error);
    process.exit(1);
  });
}

export { BenchmarkRunner };