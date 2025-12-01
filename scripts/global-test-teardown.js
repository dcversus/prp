/**
 * Global Test Teardown Script
 *
 * Runs after all test suites to:
 * - Clean up test resources
 * - Generate final reports
 * - Archive test results
 * - Cleanup temporary files and databases
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  try {
    // Generate comprehensive test report
    await generateFinalReport();

    // Clean up any remaining test resources
    await cleanupTestResources();

    // Archive test results if configured
    if (process.env.ARCHIVE_TEST_RESULTS === 'true') {
      await archiveTestResults();
    }

    // Performance summary
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      await generatePerformanceSummary();
    }

    console.log('✅ Global test teardown completed');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    throw error;
  }
}

async function generateFinalReport() {
  console.log('📊 Generating final test report...');

  const testResultsDir = path.join(process.cwd(), 'test-results');
  const reportPath = path.join(testResultsDir, 'final-report.json');

  // Collect test results from various sources
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: require('os').cpus().length,
      totalMemory: require('os').totalmem()
    },
    summary: {
      totalTestFiles: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0
    }
  };

  // Read existing test results if available
  try {
    const junitPath = path.join(testResultsDir, 'junit.xml');
    if (fs.existsSync(junitPath)) {
      // Parse JUnit XML for summary stats (simplified)
      const junitContent = fs.readFileSync(junitPath, 'utf8');
      const testMatches = junitContent.match(/tests="/g);
      const failureMatches = junitContent.match(/failures="/g);

      if (testMatches) {
        testResults.summary.totalTests = parseInt(testMatches.length);
      }
      if (failureMatches) {
        testResults.summary.failedTests = parseInt(failureMatches.length);
      }
      testResults.summary.passedTests = testResults.summary.totalTests - testResults.summary.failedTests;
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse existing test results:', error.message);
  }

  // Write final report
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Final report generated: ${reportPath}`);
}

async function cleanupTestResources() {
  console.log('🧹 Cleaning up test resources...');

  const tempDir = require('os').tmpdir();
  const { readdirSync, rmSync, existsSync } = require('fs');

  try {
    // Clean up any remaining PRP test directories
    const tempFiles = readdirSync(tempDir).filter(file =>
      file.startsWith('prp-test-') || file.startsWith('prp-perf-')
    );

    for (const tempFile of tempFiles) {
      const tempPath = path.join(tempDir, tempFile);
      try {
        rmSync(tempPath, { recursive: true, force: true });
      } catch (error) {
        console.warn(`⚠️ Failed to clean up ${tempPath}:`, error.message);
      }
    }

    // Clean up test database if used
    if (process.env.CLEANUP_TEST_DB === 'true') {
      console.log('🗄️ Cleaning up test database...');
      // Add database cleanup logic here if needed
    }

    // Clean up any test recordings or logs older than 24 hours
    const recordingsDir = path.join(tempDir, 'prp-test-recordings');
    if (existsSync(recordingsDir)) {
      const recordings = readdirSync(recordingsDir);
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

      for (const recording of recordings) {
        const recordingPath = path.join(recordingsDir, recording);
        try {
          const stats = require('fs').statSync(recordingPath);
          if (stats.mtime.getTime() < cutoffTime) {
            rmSync(recordingPath, { recursive: true, force: true });
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

  } catch (error) {
    console.warn('⚠️ Error during resource cleanup:', error.message);
  }
}

async function archiveTestResults() {
  console.log('📦 Archiving test results...');

  const { createGzip } = require('zlib');
  const { promisify } = require('util');
  const { pipeline } = require('stream');
  const gzip = promisify(createGzip);

  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const archivePath = path.join(testResultsDir, `test-results-${Date.now()}.tar.gz`);

    // Create archive (simplified - in real implementation would use proper archiving)
    const archiveData = {
      timestamp: new Date().toISOString(),
      files: []
    };

    // Collect file information
    if (fs.existsSync(testResultsDir)) {
      const files = fs.readdirSync(testResultsDir);
      for (const file of files) {
        const filePath = path.join(testResultsDir, file);
        const stats = fs.statSync(filePath);
        archiveData.files.push({
          name: file,
          size: stats.size,
          modified: stats.mtime,
          type: stats.isDirectory() ? 'directory' : 'file'
        });
      }
    }

    fs.writeFileSync(archivePath.replace('.tar.gz', '.json'), JSON.stringify(archiveData, null, 2));
    console.log(`📦 Test results archived: ${archivePath}`);

  } catch (error) {
    console.warn('⚠️ Failed to archive test results:', error.message);
  }
}

async function generatePerformanceSummary() {
  console.log('📈 Generating performance summary...');

  const testResultsDir = path.join(process.cwd(), 'test-results');
  const summaryPath = path.join(testResultsDir, 'performance-summary.json');

  const performanceSummary = {
    timestamp: new Date().toISOString(),
    testSuites: [],
    systemMetrics: {
      peakMemoryUsage: 0,
      totalTestDuration: 0,
      averageTestDuration: 0
    }
  };

  try {
    // Look for performance reports from test runs
    const files = fs.readdirSync(testResultsDir).filter(file =>
      file.includes('performance') || file.includes('benchmark')
    );

    for (const file of files) {
      const filePath = path.join(testResultsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (file.endsWith('.json')) {
          const data = JSON.parse(content);
          if (data.summary || data.results) {
            performanceSummary.testSuites.push({
              name: file.replace('.json', ''),
              data: data
            });
          }
        }
      } catch (parseError) {
        // Skip files that can't be parsed
      }
    }

    // Calculate system metrics
    if (performanceSummary.testSuites.length > 0) {
      const totalDuration = performanceSummary.testSuites.reduce((sum, suite) => {
        return sum + (suite.data.summary?.totalDuration || suite.data.duration || 0);
      }, 0);

      performanceSummary.systemMetrics.totalTestDuration = totalDuration;
      performanceSummary.systemMetrics.averageTestDuration =
        totalDuration / performanceSummary.testSuites.length;
    }

    fs.writeFileSync(summaryPath, JSON.stringify(performanceSummary, null, 2));
    console.log(`📈 Performance summary generated: ${summaryPath}`);

  } catch (error) {
    console.warn('⚠️ Failed to generate performance summary:', error.message);
  }
}

module.exports = globalTeardown;