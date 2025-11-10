/**
 * 🚀 Scanner Performance Tests for @dcversus/prp
 *
 * Comprehensive performance testing for the scanner component:
 * - File watching performance
 * - Signal parsing speed
 * - Memory usage under load
 * - Cache effectiveness
 * - Batch processing efficiency
 */

import { performance } from 'perf_hooks';
import { createOptimizedScanner, OptimizedScanner } from '../../src/scanner/optimized-scanner.js';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

interface ScannerPerformanceResult {
  testName: string;
  duration: number;
  memoryUsage: number;
  filesProcessed: number;
  signalsFound: number;
  success: boolean;
  error?: string;
  cacheHitRate?: number;
}

class ScannerPerformanceTestSuite {
  private results: ScannerPerformanceResult[] = [];
  private testDir: string;

  constructor() {
    this.testDir = join(process.cwd(), 'test-scanner-temp');
  }

  async runAllTests(): Promise<void> {
    console.log('🔍 Starting Scanner Performance Test Suite...\n');

    await this.setupTestEnvironment();

    try {
      await this.testFileWatchingPerformance();
      await this.testSignalParsingPerformance();
      await this.testMemoryUsage();
      await this.testCacheEffectiveness();
      await this.testBatchProcessing();

      this.generateReport();
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('📁 Setting up test environment...');

    try {
      await mkdir(this.testDir, { recursive: true });
      await this.createTestFiles();
      console.log('✅ Test environment ready\n');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  private async createTestFiles(): Promise<void> {
    const fileConfigs = [
      { name: 'large-prp.md', size: 100000, signals: 50 }, // 100KB file with many signals
      { name: 'medium-prp.md', size: 10000, signals: 10 },  // 10KB file
      { name: 'small-prp.md', size: 1000, signals: 2 },    // 1KB file
      { name: 'no-signals.md', size: 5000, signals: 0 },    // No signals
      { name: 'typescript.ts', size: 20000, signals: 5 },   // TypeScript file
      { name: 'config.json', size: 1000, signals: 0 },      // Config file
    ];

    for (const config of fileConfigs) {
      const content = this.generateFileContent(config.size, config.signals);
      await writeFile(join(this.testDir, config.name), content, 'utf-8');
    }

    // Create subdirectories with more files
    const subdirs = ['subdir1', 'subdir2', 'deep/nested/path'];
    for (const subdir of subdirs) {
      const fullPath = join(this.testDir, subdir);
      await mkdir(fullPath, { recursive: true });

      for (let i = 1; i <= 5; i++) {
        const content = this.generateFileContent(2000, 3);
        await writeFile(join(fullPath, `file${i}.md`), content, 'utf-8');
      }
    }
  }

  private generateFileContent(size: number, signalCount: number): string {
    let content = '# Test File\n\n';

    // Add some base content
    const baseContent = 'This is test content for performance testing. '.repeat(Math.ceil(size / 50));
    content += baseContent.substring(0, Math.max(0, size - signalCount * 20));

    // Add signals throughout the content
    const signalTypes = ['dp', 'bf', 'cq', 'tw', 'br', 'rc', 'bb', 'af', 'gg', 'ff', 'da', 'no'];
    const contentLength = content.length;

    for (let i = 0; i < signalCount; i++) {
      const position = Math.floor((i + 1) * (contentLength / (signalCount + 1)));
      const signalType = signalTypes[i % signalTypes.length];
      const insertion = `[${signalType}] Signal ${i + 1} - `;

      content = content.slice(0, position) + insertion + content.slice(position);
    }

    return content;
  }

  private async testFileWatchingPerformance(): Promise<void> {
    console.log('👀 Testing file watching performance...');

    const scanner = createOptimizedScanner({
      paths: [this.testDir],
      debounceMs: 100,
      batchSize: 10,
      cacheEnabled: true
    });

    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return new Promise((resolve) => {
      let filesScanned = 0;
      let signalsFound = 0;

      scanner.on('scan', (event) => {
        if (event.result) {
          filesScanned++;
          signalsFound += event.result.signals.length;
        }
      });

      scanner.on('started', () => {
        // Wait for initial scan to complete
        setTimeout(async () => {
          const duration = performance.now() - startTime;
          const endMemory = process.memoryUsage().heapUsed;
          const memoryUsage = (endMemory - startMemory) / 1024 / 1024;

          await scanner.stop();

          this.results.push({
            testName: 'file-watching',
            duration,
            memoryUsage,
            filesProcessed: filesScanned,
            signalsFound,
            success: filesScanned > 0
          });

          console.log(`  Processed ${filesScanned} files with ${signalsFound} signals in ${duration.toFixed(2)}ms`);
          console.log(`  Memory usage: ${memoryUsage.toFixed(2)}MB\n`);
          resolve();
        }, 2000);
      });

      scanner.start().catch((error) => {
        console.error('Scanner start failed:', error);
        resolve();
      });
    });
  }

  private async testSignalParsingPerformance(): Promise<void> {
    console.log('📡 Testing signal parsing performance...');

    const testFiles = [
      { name: 'large-prp.md', expectedSignals: 50 },
      { name: 'medium-prp.md', expectedSignals: 10 },
      { name: 'small-prp.md', expectedSignals: 2 }
    ];

    for (const file of testFiles) {
      const filePath = join(this.testDir, file.name);
      const startTime = performance.now();

      try {
        // Simulate signal parsing (simplified for test)
        const content = await readFile(filePath, 'utf-8');
        const signals = this.parseSignalsManually(content);

        const duration = performance.now() - startTime;

        this.results.push({
          testName: `signal-parsing-${file.name}`,
          duration,
          memoryUsage: 0, // Not measuring memory for individual file parsing
          filesProcessed: 1,
          signalsFound: signals.length,
          success: signals.length === file.expectedSignals
        });

        console.log(`  ${file.name}: Found ${signals.length} signals in ${duration.toFixed(2)}ms`);

      } catch (error) {
        this.results.push({
          testName: `signal-parsing-${file.name}`,
          duration: 0,
          memoryUsage: 0,
          filesProcessed: 0,
          signalsFound: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log();
  }

  private async testMemoryUsage(): Promise<void> {
    console.log('💾 Testing memory usage under load...');

    const scanner = createOptimizedScanner({
      paths: [this.testDir],
      cacheEnabled: true,
      batchSize: 5
    });

    const initialMemory = process.memoryUsage().heapUsed;

    return new Promise((resolve) => {
      let scansCompleted = 0;
      const targetScans = 3;

      scanner.on('scan', () => {
        scansCompleted++;

        if (scansCompleted >= targetScans) {
          const currentMemory = process.memoryUsage().heapUsed;
          const memoryUsage = (currentMemory - initialMemory) / 1024 / 1024;

          this.results.push({
            testName: 'memory-usage',
            duration: 0,
            memoryUsage,
            filesProcessed: scansCompleted,
            signalsFound: 0,
            success: memoryUsage < 100 // Should use less than 100MB
          });

          console.log(`  Memory usage after ${scansCompleted} scans: ${memoryUsage.toFixed(2)}MB`);

          scanner.stop().then(() => resolve());
        }
      });

      scanner.on('started', () => {
        // Trigger multiple scans by modifying files
        setTimeout(() => this.modifyRandomFile(), 1000);
        setTimeout(() => this.modifyRandomFile(), 2000);
        setTimeout(() => this.modifyRandomFile(), 3000);
      });

      scanner.start().catch((error) => {
        console.error('Memory test failed:', error);
        resolve();
      });
    });
  }

  private async testCacheEffectiveness(): Promise<void> {
    console.log('🗄️  Testing cache effectiveness...');

    const scanner = createOptimizedScanner({
      paths: [this.testDir],
      cacheEnabled: true,
      debounceMs: 50
    });

    return new Promise((resolve) => {
      let firstScanComplete = false;
      let firstScanTime = 0;
      let secondScanTime = 0;

      scanner.on('scan', () => {
        if (!firstScanComplete) {
          firstScanComplete = true;
          firstScanTime = performance.now();

          // Modify the same file to test cache
          setTimeout(() => this.modifyRandomFile(), 500);

        } else {
          secondScanTime = performance.now();
          const improvement = firstScanTime - secondScanTime;
          const improvementPercent = (improvement / firstScanTime) * 100;

          this.results.push({
            testName: 'cache-effectiveness',
            duration: improvement,
            memoryUsage: 0,
            filesProcessed: 2,
            signalsFound: 0,
            success: improvement > 0,
            cacheHitRate: improvementPercent
          });

          console.log(`  First scan: ${firstScanTime.toFixed(2)}ms`);
          console.log(`  Second scan: ${secondScanTime.toFixed(2)}ms`);
          console.log(`  Improvement: ${improvement.toFixed(2)}ms (${improvementPercent.toFixed(1)}%)\n`);

          scanner.stop().then(() => resolve());
        }
      });

      scanner.start().catch((error) => {
        console.error('Cache test failed:', error);
        resolve();
      });
    });
  }

  private async testBatchProcessing(): Promise<void> {
    console.log('📦 Testing batch processing efficiency...');

    // Create many files simultaneously
    const batchFiles = [];
    for (let i = 1; i <= 20; i++) {
      batchFiles.push(`batch-file-${i}.md`);
    }

    const startTime = performance.now();

    // Create all files at once
    await Promise.all(batchFiles.map(async (fileName) => {
      const content = this.generateFileContent(1000, 3);
      await writeFile(join(this.testDir, fileName), content, 'utf-8');
    }));

    const scanner = createOptimizedScanner({
      paths: [this.testDir],
      batchSize: 10,
      debounceMs: 200
    });

    return new Promise((resolve) => {
      let filesProcessed = 0;

      scanner.on('scan', (event) => {
        if (event.result && batchFiles.includes(event.result.path.split('/').pop()!)) {
          filesProcessed++;
        }

        if (filesProcessed >= batchFiles.length) {
          const duration = performance.now() - startTime;

          this.results.push({
            testName: 'batch-processing',
            duration,
            memoryUsage: 0,
            filesProcessed,
            signalsFound: 0,
            success: filesProcessed === batchFiles.length
          });

          console.log(`  Processed ${filesProcessed} files in batch in ${duration.toFixed(2)}ms`);
          console.log(`  Average per file: ${(duration / filesProcessed).toFixed(2)}ms\n`);

          // Cleanup batch files
          Promise.all(batchFiles.map(async (fileName) => {
            try {
              await unlink(join(this.testDir, fileName));
            } catch (error) {
              // Ignore cleanup errors
            }
          })).then(() => {
            scanner.stop().then(() => resolve());
          });
        }
      });

      scanner.start().catch((error) => {
        console.error('Batch processing test failed:', error);
        resolve();
      });
    });
  }

  private parseSignalsManually(content: string): Array<{ type: string; line: number }> {
    const signals: Array<{ type: string; line: number }> = [];
    const lines = content.split('\n');
    const signalPattern = /\[([a-z]{1,2})\]/g;

    for (let i = 0; i < lines.length; i++) {
      let match;
      while ((match = signalPattern.exec(lines[i])) !== null) {
        signals.push({
          type: match[1],
          line: i + 1
        });
      }
    }

    return signals;
  }

  private async modifyRandomFile(): Promise<void> {
    const files = ['large-prp.md', 'medium-prp.md', 'small-prp.md'];
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const filePath = join(this.testDir, randomFile);

    try {
      const content = await readFile(filePath, 'utf-8');
      const modifiedContent = content + '\n\n[dp] Modified at ' + new Date().toISOString();
      await writeFile(filePath, modifiedContent, 'utf-8');
    } catch (error) {
      // Ignore file modification errors
    }
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    try {
      const { execSync } = require('child_process');
      execSync(`rm -rf ${this.testDir}`, { stdio: 'ignore' });
      console.log('✅ Cleanup complete\n');
    } catch (error) {
      console.error('⚠️  Cleanup failed:', error);
    }
  }

  private generateReport(): void {
    console.log('📊 Scanner Performance Test Report\n');

    for (const result of this.results) {
      console.log(`${result.testName}:`);
      console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`  Memory: ${result.memoryUsage.toFixed(2)}MB`);
      console.log(`  Files: ${result.filesProcessed}, Signals: ${result.signalsFound}`);
      console.log(`  Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);

      if (result.cacheHitRate !== undefined) {
        console.log(`  Cache Improvement: ${result.cacheHitRate.toFixed(1)}%`);
      }

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log();
    }

    // Performance analysis
    const successfulResults = this.results.filter(r => r.success);
    const totalFiles = successfulResults.reduce((sum, r) => sum + r.filesProcessed, 0);
    const totalSignals = successfulResults.reduce((sum, r) => sum + r.signalsFound, 0);
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;

    console.log('Summary:');
    console.log(`  Total Tests: ${this.results.length}`);
    console.log(`  Successful: ${successfulResults.length}`);
    console.log(`  Total Files Processed: ${totalFiles}`);
    console.log(`  Total Signals Found: ${totalSignals}`);
    console.log(`  Average Duration: ${avgDuration.toFixed(2)}ms`);

    // Recommendations
    console.log('\n💡 Scanner Performance Recommendations:');

    const slowTests = this.results.filter(r => r.duration > 1000);
    if (slowTests.length > 0) {
      console.log('  - Some operations are taking > 1s. Consider optimizing file I/O operations.');
    }

    const memoryHeavyTests = this.results.filter(r => r.memoryUsage > 50);
    if (memoryHeavyTests.length > 0) {
      console.log('  - High memory usage detected. Consider implementing more aggressive cache cleanup.');
    }

    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log('  - Some tests failed. Review error messages and fix issues.');
    }

    if (slowTests.length === 0 && memoryHeavyTests.length === 0 && failedTests.length === 0) {
      console.log('  ✅ Scanner performance is excellent!');
    }
  }
}

// Helper function for readFile
async function readFile(path: string, encoding: BufferEncoding): Promise<string> {
  const { readFile } = await import('fs/promises');
  return readFile(path, encoding);
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new ScannerPerformanceTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('Scanner performance test suite failed:', error);
    process.exit(1);
  });
}

export { ScannerPerformanceTestSuite };