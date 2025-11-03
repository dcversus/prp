/**
 * ♫ Test Runner for Integration Tests
 *
 * Orchestrates the execution of integration tests and provides detailed reporting.
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  path: string;
  description: string;
  estimatedTime: number; // seconds
  dependencies: string[];
}

interface TestResult {
  suite: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  output?: string;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

interface TestReport {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  suites: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage?: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
  };
}

export class IntegrationTestRunner extends EventEmitter {
  private testSuites: TestSuite[] = [];
  private currentReport: TestReport | null = null;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.initializeTestSuites();
  }

  /**
   * Initialize available test suites
   */
  private initializeTestSuites(): void {
    this.testSuites = [
      {
        name: 'Scanner → Inspector Flow',
        path: 'tests/integration/scanner-inspector-flow.test.ts',
        description: 'Tests signal processing pipeline from scanner detection through inspector classification',
        estimatedTime: 60,
        dependencies: ['storage', 'guidelines', 'events']
      },
      {
        name: 'End-to-End System Integration',
        path: 'tests/integration/end-to-end-flow.test.ts',
        description: 'Complete system tests covering all layers and components',
        estimatedTime: 90,
        dependencies: ['scanner', 'inspector', 'guidelines', 'storage']
      },
      {
        name: 'Guidelines System Integration',
        path: 'tests/integration/guidelines-flow.test.ts',
        description: 'Tests guideline triggering, execution, and protocol resolution',
        estimatedTime: 45,
        dependencies: ['guidelines', 'inspector', 'storage']
      },
      {
        name: 'Token Accounting Integration',
        path: 'tests/integration/token-accounting.test.ts',
        description: 'Tests token usage tracking across all system components',
        estimatedTime: 30,
        dependencies: ['scanner', 'inspector', 'storage']
      },
      {
        name: 'Performance and Scalability',
        path: 'tests/integration/performance.test.ts',
        description: 'Tests system performance under various load conditions',
        estimatedTime: 120,
        dependencies: ['scanner', 'inspector', 'storage']
      }
    ];
  }

  /**
   * Run all integration tests
   */
  async runAllTests(options: {
    coverage?: boolean;
    verbose?: boolean;
    pattern?: string;
    timeout?: number;
  } = {}): Promise<TestReport> {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    this.currentReport = {
      startTime: new Date(),
      endTime: new Date(),
      totalDuration: 0,
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };

    try {
      this.emit('started', { report: this.currentReport });

      // Filter suites based on pattern if provided
      let suitesToRun = this.testSuites;
      if (options.pattern) {
        suitesToRun = suitesToRun.filter(suite =>
          suite.name.toLowerCase().includes(options.pattern!.toLowerCase()) ||
          suite.description.toLowerCase().includes(options.pattern!.toLowerCase())
        );
      }

      // Run each test suite
      for (const suite of suitesToRun) {
        const result = await this.runTestSuite(suite, options);
        this.currentReport.suites.push(result);

        // Update summary
        this.currentReport.summary.total++;
        if (result.status === 'passed') {
          this.currentReport.summary.passed++;
        } else if (result.status === 'failed') {
          this.currentReport.summary.failed++;
        } else if (result.status === 'skipped') {
          this.currentReport.summary.skipped++;
        }

        this.emit('suite_completed', { suite, result });
      }

      // Finalize report
      this.currentReport.endTime = new Date();
      this.currentReport.totalDuration = this.currentReport.endTime.getTime() - this.currentReport.startTime.getTime();

      // Generate coverage report if requested
      if (options.coverage) {
        await this.generateCoverageReport();
      }

      this.emit('completed', { report: this.currentReport });
      return this.currentReport;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a single test suite
   */
  private async runTestSuite(suite: TestSuite, options: any): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      suite: suite.name,
      status: 'pending',
      duration: 0
    };

    try {
      this.emit('suite_started', { suite });

      // Check dependencies
      const dependenciesMet = await this.checkDependencies(suite.dependencies);
      if (!dependenciesMet) {
        result.status = 'skipped';
        result.error = 'Dependencies not met';
        result.duration = Date.now() - startTime;
        return result;
      }

      result.status = 'running';

      // Prepare test command
      const testCommand = this.buildTestCommand(suite, options);

      // Execute test
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: process.cwd(),
        timeout: options.timeout || (suite.estimatedTime * 2000), // Double the estimated time
        env: {
          ...process.env,
          NODE_ENV: 'test',
          INTEGRATION_TEST: 'true'
        }
      });

      result.status = 'passed';
      result.output = stdout + stderr;

      // Parse coverage if available
      if (options.coverage) {
        result.coverage = await this.parseCoverageOutput(stdout);
      }

    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      result.output = error.stdout || error.stderr || '';

      // Check for timeout
      if (error.signal === 'SIGTERM' || error.message.includes('timeout')) {
        result.error = `Test timed out after ${options.timeout || (suite.estimatedTime * 2000)}ms`;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Build test command for a suite
   */
  private buildTestCommand(suite: TestSuite, options: any): string {
    let command = 'npx jest';

    // Add test file
    command += ` ${suite.path}`;

    // Add options
    if (options.verbose) {
      command += ' --verbose';
    }

    if (options.coverage) {
      command += ' --coverage';
      command += ' --coverageReporters=text-lcov';
    }

    command += ' --runInBand'; // Important for integration tests
    command += ' --forceExit'; // Clean exit after tests
    command += ' --detectOpenHandles'; // Detect handle leaks

    return command;
  }

  /**
   * Check if dependencies are available
   */
  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    for (const dep of dependencies) {
      try {
        // Check if dependency module can be required
        require.resolve(dep);
      } catch {
        console.warn(`Dependency not found: ${dep}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Parse coverage output from jest
   */
  private async parseCoverageOutput(output: string): Promise<TestResult['coverage']> {
    try {
      // Look for coverage summary in output
      const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
      if (coverageMatch) {
        return {
          lines: parseFloat(coverageMatch[1]),
          functions: parseFloat(coverageMatch[2]),
          branches: parseFloat(coverageMatch[3]),
          statements: parseFloat(coverageMatch[4])
        };
      }
    } catch (error) {
      console.warn('Failed to parse coverage output:', error);
    }

    return {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0
    };
  }

  /**
   * Generate coverage report
   */
  private async generateCoverageReport(): Promise<void> {
    try {
      // Combine coverage from all test runs
      const coverageDir = path.join(process.cwd(), 'coverage');
      const lcovFile = path.join(coverageDir, 'lcov.info');

      if (await fs.access(lcovFile).then(() => true).catch(() => false)) {
        const lcovContent = await fs.readFile(lcovFile, 'utf8');

        // Generate HTML report
        await execAsync('npx lcov --remove lcov.info "*.test.*" "*.spec.*" -o lcov-filtered.info', {
          cwd: coverageDir
        });

        await execAsync('genhtml lcov-filtered.info -o html-report', {
          cwd: coverageDir
        });

        console.log('Coverage report generated in coverage/html-report/index.html');
      }
    } catch (error) {
      console.warn('Failed to generate coverage report:', error);
    }
  }

  /**
   * Get test suite information
   */
  getTestSuites(): TestSuite[] {
    return [...this.testSuites];
  }

  /**
   * Get current test report
   */
  getCurrentReport(): TestReport | null {
    return this.currentReport;
  }

  /**
   * Check if tests are currently running
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Print formatted test results
   */
  printResults(report: TestReport): void {
    console.log('\n🎵 Integration Test Results');
    console.log('━'.repeat(60));

    // Print summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${report.summary.total}`);
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   ⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`   ⏱️  Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);

    // Print coverage if available
    if (report.summary.coverage) {
      console.log(`\n📈 Coverage:`);
      console.log(`   Lines: ${report.summary.coverage.lines}%`);
      console.log(`   Functions: ${report.summary.coverage.functions}%`);
      console.log(`   Branches: ${report.summary.coverage.branches}%`);
      console.log(`   Statements: ${report.summary.coverage.statements}%`);
    }

    // Print individual suite results
    console.log(`\n📋 Test Suites:`);
    report.suites.forEach(suite => {
      const status = suite.status === 'passed' ? '✅' :
                   suite.status === 'failed' ? '❌' :
                   suite.status === 'skipped' ? '⏭️' : '⏳';

      console.log(`   ${status} ${suite.suite} (${(suite.duration / 1000).toFixed(2)}s)`);

      if (suite.error) {
        console.log(`      Error: ${suite.error}`);
      }
    });

    console.log('━'.repeat(60));
  }

  /**
   * Save test results to file
   */
  async saveResults(report: TestReport, outputPath?: string): Promise<void> {
    const filePath = outputPath || `test-results-${Date.now()}.json`;
    const reportData = {
      ...report,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Test results saved to: ${filePath}`);
  }
}

/**
 * Main test runner execution
 */
export async function runIntegrationTests(options: any = {}): Promise<void> {
  const runner = new IntegrationTestRunner();

  // Set up event listeners
  runner.on('started', ({ report }) => {
    console.log('🚀 Starting integration tests...\n');
  });

  runner.on('suite_started', ({ suite }) => {
    console.log(`📝 Running: ${suite.name}`);
  });

  runner.on('suite_completed', ({ suite, result }) => {
    const status = result.status === 'passed' ? '✅' :
                 result.status === 'failed' ? '❌' :
                 result.status === 'skipped' ? '⏭️' : '⏳';
    console.log(`   ${status} ${result.suite} (${(result.duration / 1000).toFixed(2)}s)`);
  });

  runner.on('completed', ({ report }) => {
    runner.printResults(report);
    runner.saveResults(report);
  });

  // Run tests
  const report = await runner.runAllTests({
    coverage: true,
    verbose: true,
    ...options
  });

  // Exit with appropriate code
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests(process.argv.slice(2)).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}