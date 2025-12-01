/**
 * Test Results Processor
 *
 * Processes and formats test results for better reporting:
 * - Aggregates test metrics
 * - Generates performance insights
 * - Creates visual reports
 * - Identifies flaky tests
 * - Tracks test trends over time
 */

const fs = require('fs');
const path = require('path');

class TestResultsProcessor {
  constructor() {
    this.results = [];
    this.metrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
      slowestTests: [],
      flakyTests: [],
      coverage: {}
    };
  }

  process(results, testContext) {
    console.log('📊 Processing test results...');

    try {
      // Basic aggregation
      this.aggregateBasicMetrics(results);

      // Identify performance issues
      this.analyzePerformance(results);

      // Detect flaky tests
      this.detectFlakyTests(results);

      // Generate insights
      const insights = this.generateInsights();

      // Save processed results
      this.saveProcessedResults(insights);

      console.log('✅ Test results processing completed');
      return insights;
    } catch (error) {
      console.error('❌ Failed to process test results:', error);
      throw error;
    }
  }

  aggregateBasicMetrics(results) {
    const testResults = results.testResults || [];

    this.metrics.totalTests = testResults.length;
    this.metrics.passedTests = testResults.filter(r => r.status === 'passed').length;
    this.metrics.failedTests = testResults.filter(r => r.status === 'failed').length;
    this.metrics.skippedTests = testResults.filter(r => r.status === 'skipped').length;

    this.metrics.totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);

    // Find slowest tests
    this.metrics.slowestTests = testResults
      .filter(r => r.duration)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(t => ({
        title: t.title,
        duration: t.duration,
        file: t.testFilePath
      }));

    // Calculate success rate
    this.metrics.successRate = this.metrics.totalTests > 0
      ? (this.metrics.passedTests / this.metrics.totalTests) * 100
      : 0;
  }

  analyzePerformance(results) {
    const performanceIssues = [];

    // Analyze test duration outliers
    const testResults = results.testResults || [];
    const durations = testResults.filter(r => r.duration).map(r => r.duration);

    if (durations.length > 0) {
      const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      // Flag tests that are more than 2 standard deviations from mean
      testResults.forEach(test => {
        if (test.duration && Math.abs(test.duration - mean) > 2 * stdDev) {
          performanceIssues.push({
            type: 'duration_outlier',
            test: test.title,
            duration: test.duration,
            mean: mean,
            stdDev: stdDev
          });
        }
      });
    }

    // Analyze memory usage if available
    const memoryIssues = this.analyzeMemoryUsage(testResults);
    performanceIssues.push(...memoryIssues);

    this.metrics.performanceIssues = performanceIssues;
  }

  analyzeMemoryUsage(testResults) {
    const issues = [];

    testResults.forEach(test => {
      if (test.memoryUsage) {
        // Flag tests using excessive memory (> 100MB)
        if (test.memoryUsage.peak && test.memoryUsage.peak > 100 * 1024 * 1024) {
          issues.push({
            type: 'high_memory_usage',
            test: test.title,
            peakMemory: test.memoryUsage.peak,
            threshold: 100 * 1024 * 1024
          });
        }

        // Flag potential memory leaks (continuous growth)
        if (test.memoryUsage.final && test.memoryUsage.initial) {
          const growth = test.memoryUsage.final - test.memoryUsage.initial;
          const growthPercent = (growth / test.memoryUsage.initial) * 100;

          if (growthPercent > 50) { // 50% growth threshold
            issues.push({
              type: 'potential_memory_leak',
              test: test.title,
              growthPercent: growthPercent,
              initialMemory: test.memoryUsage.initial,
              finalMemory: test.memoryUsage.final
            });
          }
        }
      }
    });

    return issues;
  }

  detectFlakyTests(results) {
    // This would need historical data to detect flaky tests
    // For now, we'll flag tests that failed with timeout errors
    const testResults = results.testResults || [];

    const potentiallyFlaky = testResults.filter(test =>
      test.status === 'failed' &&
      test.failureMessages &&
      test.failureMessages.some(msg => msg.includes('timeout') || msg.includes('TIMEOUT'))
    );

    this.metrics.flakyTests = potentiallyFlaky.map(test => ({
      title: test.title,
      file: test.testFilePath,
      failureType: 'timeout',
      duration: test.duration
    }));
  }

  generateInsights() {
    const insights = {
      summary: this.metrics,
      recommendations: [],
      warnings: [],
      trends: {}
    };

    // Generate recommendations
    if (this.metrics.successRate < 95) {
      insights.recommendations.push({
        type: 'stability',
        message: `Test success rate is ${this.metrics.successRate.toFixed(1)}%. Consider investigating failing tests.`,
        priority: 'high'
      });
    }

    if (this.metrics.totalDuration > 300000) { // 5 minutes
      insights.recommendations.push({
        type: 'performance',
        message: `Test suite took ${(this.metrics.totalDuration / 1000).toFixed(1)}s. Consider optimizing slow tests.`,
        priority: 'medium'
      });
    }

    if (this.metrics.slowestTests.length > 0 && this.metrics.slowestTests[0].duration > 60000) {
      insights.recommendations.push({
        type: 'optimization',
        message: `Slowest test took ${(this.metrics.slowestTests[0].duration / 1000).toFixed(1)}s. Consider breaking it down or mocking dependencies.`,
        priority: 'medium'
      });
    }

    // Generate warnings
    if (this.metrics.flakyTests.length > 0) {
      insights.warnings.push({
        type: 'flaky_tests',
        message: `Detected ${this.metrics.flakyTests.length} potentially flaky tests. Review and stabilize them.`,
        count: this.metrics.flakyTests.length
      });
    }

    if (insights.summary.performanceIssues && insights.summary.performanceIssues.length > 5) {
      insights.warnings.push({
        type: 'performance_issues',
        message: `Multiple performance issues detected. Review slow or memory-intensive tests.`,
        count: insights.summary.performanceIssues.length
      });
    }

    return insights;
  }

  saveProcessedResults(insights) {
    const testResultsDir = path.join(process.cwd(), 'test-results');

    // Ensure directory exists
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    // Save detailed insights
    const insightsPath = path.join(testResultsDir, 'test-insights.json');
    fs.writeFileSync(insightsPath, JSON.stringify(insights, null, 2));

    // Save summary
    const summaryPath = path.join(testResultsDir, 'test-summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.metrics.totalTests,
        passed: this.metrics.passedTests,
        failed: this.metrics.failedTests,
        skipped: this.metrics.skippedTests,
        successRate: this.metrics.successRate,
        duration: this.metrics.totalDuration
      },
      slowestTests: this.metrics.slowestTests.slice(0, 5),
      flakyTests: this.metrics.flakyTests,
      recommendations: insights.recommendations,
      warnings: insights.warnings
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Generate markdown report
    this.generateMarkdownReport(summary, insights);

    console.log(`📄 Test insights saved to: ${insightsPath}`);
    console.log(`📄 Test summary saved to: ${summaryPath}`);
  }

  generateMarkdownReport(summary, insights) {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const reportPath = path.join(testResultsDir, 'test-report.md');

    const markdown = `# Test Execution Report

**Generated:** ${summary.timestamp}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${summary.summary.total} |
| Passed | ${summary.summary.passed} |
| Failed | ${summary.summary.failed} |
| Skipped | ${summary.summary.skipped} |
| Success Rate | ${summary.summary.successRate.toFixed(1)}% |
| Duration | ${(summary.summary.duration / 1000).toFixed(1)}s |

## Slowest Tests

${summary.slowestTests.map((test, index) =>
  `${index + 1}. **${test.title}** - ${(test.duration / 1000).toFixed(1)}s`
).join('\n')}

${summary.flakyTests.length > 0 ? `
## Potentially Flaky Tests

${summary.flakyTests.map((test, index) =>
  `${index + 1}. **${test.title}** - ${test.failureType}`
).join('\n')}
` : ''}

${insights.recommendations.length > 0 ? `
## Recommendations

${insights.recommendations.map(rec =>
  `- **${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}:** ${rec.message}`
).join('\n')}
` : ''}

${insights.warnings.length > 0 ? `
## Warnings

${insights.warnings.map(warning =>
  `- **${warning.type.charAt(0).toUpperCase() + warning.type.slice(1)}:** ${warning.message}`
).join('\n')}
` : ''}

---

*Report generated by PRP Test Results Processor*
`;

    fs.writeFileSync(reportPath, markdown);
    console.log(`📄 Markdown report saved to: ${reportPath}`);
  }
}

// Process results when called by Jest
function processTestResults(results, testContext) {
  const processor = new TestResultsProcessor();
  return processor.process(results, testContext);
}

module.exports = processTestResults;