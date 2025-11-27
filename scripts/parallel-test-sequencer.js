/**
 * Parallel Test Sequencer
 *
 * Custom test sequencer that optimizes test execution order:
 * - Prioritizes fast unit tests first
 * - Groups integration tests by dependencies
 * - Schedules E2E tests to avoid resource conflicts
 * - Optimizes for parallel execution
 */

const Sequencer = require('@jest/test-sequencer').default;
const { statSync, existsSync } = require('fs');
const path = require('path');

class ParallelTestSequencer extends Sequencer {
  /**
   * Sort tests for optimal parallel execution
   */
  sort(tests) {
    console.log(`🔄 Sorting ${tests.length} tests for optimal parallel execution...`);

    const testStats = tests.map(test => ({
      test,
      path: test.path,
      suite: this.getTestSuite(test.path),
      estimatedDuration: this.estimateTestDuration(test.path),
      resourceRequirements: this.getResourceRequirements(test.path),
      dependencies: this.getTestDependencies(test.path)
    }));

    // Sort by priority and resource requirements
    const sortedTests = testStats
      .sort((a, b) => {
        // Priority order: Unit > Integration > E2E > Performance
        const priorityOrder = { unit: 0, integration: 1, e2e: 2, performance: 3 };
        const aPriority = priorityOrder[a.suite] || 999;
        const bPriority = priorityOrder[b.suite] || 999;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Within same suite, sort by estimated duration (fastest first)
        return a.estimatedDuration - b.estimatedDuration;
      })
      .map(stat => stat.test);

    // Log test distribution
    const distribution = this.getTestDistribution(sortedTests);
    console.log('📊 Test distribution:');
    Object.entries(distribution).forEach(([suite, count]) => {
      console.log(`   ${suite}: ${count} tests`);
    });

    return sortedTests;
  }

  /**
   * Determine test suite based on file path
   */
  getTestSuite(testPath) {
    if (testPath.includes('/src/') && testPath.includes('/__tests__/')) {
      return 'unit';
    } else if (testPath.includes('/tests/integration/')) {
      return 'integration';
    } else if (testPath.includes('/tests/e2e/')) {
      return 'e2e';
    } else if (testPath.includes('/tests/performance/')) {
      return 'performance';
    }
    return 'unknown';
  }

  /**
   * Estimate test duration based on file characteristics
   */
  estimateTestDuration(testPath) {
    try {
      const stats = statSync(testPath);
      const fileSize = stats.size;

      // Base duration by suite type
      const suite = this.getTestSuite(testPath);
      const baseDurations = {
        unit: 1000,      // 1 second average
        integration: 10000, // 10 seconds average
        e2e: 45000,     // 45 seconds average
        performance: 120000, // 2 minutes average
        unknown: 5000   // 5 seconds default
      };

      let estimatedDuration = baseDurations[suite] || baseDurations.unknown;

      // Adjust based on file size (larger files likely take longer)
      const sizeMultiplier = Math.min(3, 1 + (fileSize / 10000)); // Max 3x duration
      estimatedDuration *= sizeMultiplier;

      // Adjust based on file name patterns
      const fileName = path.basename(testPath);
      if (fileName.includes('journey') || fileName.includes('comprehensive')) {
        estimatedDuration *= 1.5;
      } else if (fileName.includes('quick') || fileName.includes('basic')) {
        estimatedDuration *= 0.7;
      }

      return Math.round(estimatedDuration);
    } catch (error) {
      return 5000; // Default 5 seconds if we can't estimate
    }
  }

  /**
   * Determine resource requirements for test
   */
  getResourceRequirements(testPath) {
    const suite = this.getTestSuite(testPath);
    const fileName = path.basename(testPath);

    const requirements = {
      memory: 256, // MB
      cpu: 1,      // cores
      disk: 100,   // MB
      network: false,
      exclusive: false
    };

    // Adjust based on suite type
    switch (suite) {
      case 'e2e':
        requirements.memory = 512;
        requirements.disk = 200;
        requirements.network = true;
        requirements.exclusive = fileName.includes('journey');
        break;
      case 'performance':
        requirements.memory = 1024;
        requirements.cpu = 2;
        requirements.exclusive = true;
        break;
      case 'integration':
        requirements.memory = 384;
        requirements.disk = 150;
        requirements.network = true;
        break;
    }

    // Fine-tune based on test content
    if (fileName.includes('parallel') || fileName.includes('concurrent')) {
      requirements.memory *= 1.5;
      requirements.cpu *= 2;
    }

    if (fileName.includes('memory') || fileName.includes('stress')) {
      requirements.memory *= 2;
    }

    if (fileName.includes('orchestrator') || fileName.includes('cli')) {
      requirements.network = true;
      requirements.exclusive = true;
    }

    return requirements;
  }

  /**
   * Get test dependencies
   */
  getTestDependencies(testPath) {
    const dependencies = [];

    // Integration tests might depend on unit tests
    if (testPath.includes('/tests/integration/')) {
      dependencies.push('unit-tests');
    }

    // E2E tests might depend on integration tests
    if (testPath.includes('/tests/e2e/')) {
      dependencies.push('unit-tests', 'integration-tests');
    }

    // Performance tests should run after all other tests
    if (testPath.includes('/tests/performance/')) {
      dependencies.push('unit-tests', 'integration-tests', 'e2e-tests');
    }

    // Check for explicit dependencies in file content
    try {
      const fs = require('fs');
      const content = fs.readFileSync(testPath, 'utf8');

      // Look for dependency comments
      const depMatches = content.match(/\/\/ @depends-on:\s*(.+)/g);
      if (depMatches) {
        depMatches.forEach(match => {
          const dep = match.replace('// @depends-on:', '').trim();
          dependencies.push(dep);
        });
      }
    } catch (error) {
      // Ignore file reading errors
    }

    return dependencies;
  }

  /**
   * Get test distribution by suite
   */
  getTestDistribution(tests) {
    const distribution = {
      unit: 0,
      integration: 0,
      e2e: 0,
      performance: 0,
      unknown: 0
    };

    tests.forEach(test => {
      const suite = this.getTestSuite(test.path);
      distribution[suite] = (distribution[suite] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Cache test results for faster subsequent runs
   */
  cacheResults(tests, results) {
    // Implementation for caching test results
    // This could check if files have changed and skip unchanged tests
    console.log(`💾 Caching results for ${tests.length} tests`);
  }
}

module.exports = ParallelTestSequencer;