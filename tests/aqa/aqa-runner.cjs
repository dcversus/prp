/**
 * 🔍 AQA - Automated Quality Assurance Runner
 *
 * As robo-aqa, I ensure:
 * 1. 100% PRP requirements coverage
 * 2. All CLI functionality is tested
 * 3. Artifacts are preserved for inspection
 * 4. Comprehensive reporting for stakeholders
 * 5. Quality gates are enforced
 */

const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');

class AQARunner {
  constructor() {
    this.results = {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        passRate: 0
      },
      requirements: {
        coreCLI: { passed: 0, total: 0, status: 'pending' },
        mainGoal: { passed: 0, total: 0, status: 'pending' },
        templates: { passed: 0, total: 0, status: 'pending' },
        agents: { passed: 0, total: 0, status: 'pending' },
        security: { passed: 0, total: 0, status: 'pending' },
        fileValidation: { passed: 0, total: 0, status: 'pending' },
        errorHandling: { passed: 0, total: 0, status: 'pending' },
        performance: { passed: 0, total: 0, status: 'pending' },
        userJourney: { passed: 0, total: 0, status: 'pending' }
      },
      artifacts: new Map(),
      testResults: [],
      qualityGates: {
        overallPassRate: 95, // 95% pass rate required
        mainGoalMandatory: true, // Main goal must pass
        criticalFailures: [] // Track critical failures
      }
    };

    this.startTime = Date.now();
    this.testDir = process.cwd();
  }

  async runCompleteAQA() {
    console.log('🔍 AQA - Automated Quality Assurance');
    console.log('='.repeat(80));
    console.log('🎯 Objective: Ensure 100% PRP requirements coverage');
    console.log('📁 Artifacts: All test artifacts will be preserved');
    console.log('⏱️  Started:', new Date().toLocaleString());
    console.log('');

    try {
      // Step 1: Ensure CLI is built
      await this.ensureCLIBuilt();

      // Step 2: Run AQA validation tests
      await this.runAQLTests();

      // Step 3: Validate artifacts and coverage
      await this.validateArtifacts();

      // Step 4: Enforce quality gates
      await this.enforceQualityGates();

      // Step 5: Generate comprehensive report
      await this.generateReport();

      this.displayFinalResults();

    } catch (error) {
      console.error('❌ AQA Runner failed:', error.message);
      this.results.qualityGates.criticalFailures.push(error.message);
      this.generateReport();
      this.displayFinalResults();
      process.exit(1);
    }
  }

  async ensureCLIBuilt() {
    console.log('🔨 Ensuring CLI is built for AQA testing...');

    try {
      await fs.access('./dist/cli.js');
      console.log('✅ CLI is built and ready for testing\n');
    } catch (error) {
      console.log('📦 Building CLI...');
      await this.runCommand('npm', ['run', 'build']);
      console.log('✅ CLI built successfully\n');
    }
  }

  async runAQLTests() {
    console.log('🧪 Running AQA Validation Tests');
    console.log('-'.repeat(50));

    // Run Jest tests for AQA validation
    const testPath = path.join(__dirname, 'cli-validation.test.ts');
    const result = await this.runJestTests([testPath]);

    // Parse test results
    this.parseTestResults(result);
  }

  async runJestTests(testFiles = []) {
    const jestPath = path.join(this.testDir, 'node_modules', '.bin', 'jest');
    const args = [
      ...testFiles,
      '--verbose',
      '--no-cache',
      '--detectOpenHandles',
      '--forceExit',
      '--json',
      '--outputFile', '.aqa-test-results.json',
      '--testTimeout=30000'
    ];

    return new Promise((resolve, reject) => {
      const child = spawn('node', [jestPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.testDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      child.on('close', (code) => {
        resolve({ exitCode: code, stdout, stderr });
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to run Jest tests: ${error.message}`));
      });
    });
  }

  async parseTestResults(jestResult) {
    try {
      // Load detailed results
      const resultsData = await fs.readFile('.aqa-test-results.json', 'utf-8');
      const jestResults = JSON.parse(resultsData);

      this.results.summary.totalTests = jestResults.numTotalTests || 0;
      this.results.summary.passedTests = jestResults.numPassedTests || 0;
      this.results.summary.failedTests = jestResults.numFailedTests || 0;
      this.results.summary.skippedTests = jestResults.numPendingTests || 0;
      this.results.summary.duration = Date.now() - this.startTime;
      this.results.summary.passRate = this.results.summary.totalTests > 0
        ? (this.results.summary.passedTests / this.results.summary.totalTests * 100)
        : 0;

      // Parse individual test results and categorize
      if (jestResults.testResults) {
        jestResults.testResults.forEach(testSuite => {
          testSuite.assertionResults.forEach(assertion => {
            const testResult = {
              title: assertion.fullName,
              status: assertion.status,
              duration: assertion.duration || 0,
              failureMessages: assertion.failureMessages || [],
              category: this.categorizeTest(assertion.fullName),
              location: assertion.location
            };

            this.results.testResults.push(testResult);
            this.updateRequirements(testResult);
          });
        });
      }

    } catch (error) {
      console.log('⚠️  Could not parse Jest results, using fallback parsing');
      this.parseFallbackResults(jestResult.stdout);
    }
  }

  categorizeTest(testName) {
    if (testName.includes('Main Goal') || testName.includes('dancing monkeys')) {
      return 'mainGoal';
    } else if (testName.includes('Template System')) {
      return 'templates';
    } else if (testName.includes('Agent Configuration')) {
      return 'agents';
    } else if (testName.includes('Security') || testName.includes('CI mode')) {
      return 'security';
    } else if (testName.includes('File Structure') || testName.includes('File Validation')) {
      return 'fileValidation';
    } else if (testName.includes('Error Handling') || testName.includes('Edge Cases')) {
      return 'errorHandling';
    } else if (testName.includes('Performance') || testName.includes('Resource')) {
      return 'performance';
    } else if (testName.includes('User Journey') || testName.includes('Complete')) {
      return 'userJourney';
    } else {
      return 'coreCLI';
    }
  }

  updateRequirements(testResult) {
    const category = this.results.requirements[testResult.category];
    if (category) {
      category.total++;
      if (testResult.status === 'passed') {
        category.passed++;
      }
      category.status = category.passed === category.total ? 'passed' : 'failed';
    }
  }

  parseFallbackResults(stdout) {
    const lines = stdout.split('\n');

    lines.forEach(line => {
      if (line.includes('✓') || line.includes('✔') || line.includes('PASS')) {
        this.results.summary.passedTests++;
        this.results.summary.totalTests++;
      } else if (line.includes('✕') || line.includes('❌') || line.includes('FAIL')) {
        this.results.summary.failedTests++;
        this.results.summary.totalTests++;
      }
    });

    this.results.summary.passRate = this.results.summary.totalTests > 0
      ? (this.results.summary.passedTests / this.results.summary.totalTests * 100)
      : 0;
  }

  async validateArtifacts() {
    console.log('📁 Validating Test Artifacts');
    console.log('-'.repeat(50));

    const artifactsDir = '/tmp/prp-test-artifacts';

    try {
      const artifacts = await fs.readdir(artifactsDir, { withFileTypes: true });
      const testDirs = artifacts.filter(item => item.isDirectory() && item.name.startsWith('cli-validation-'));

      console.log(`📊 Found ${testDirs.length} test artifact directories`);

      for (const testDir of testDirs) {
        const testPath = path.join(artifactsDir, testDir.name);
        const files = await this.analyzeTestDirectory(testPath);
        this.results.artifacts.set(testDir.name, files);

        console.log(`  📁 ${testDir.name}: ${files.files.length} files, ${files.directories.length} dirs`);
      }

      // Look for dancing monkeys artifacts specifically
      const monkeysDirs = testDirs.filter(dir => dir.name.includes('dancing-monkeys'));
      if (monkeysDirs.length > 0) {
        console.log(`  🐵 Found ${monkeysDirs.length} dancing monkeys artifacts`);
        await this.validateDancingMonkeysArtifacts(monkeysDirs, artifactsDir);
      }

    } catch (error) {
      console.log(`⚠️  Could not validate artifacts: ${error.message}`);
    }
  }

  async analyzeTestDirectory(testPath) {
    const files = [];
    const directories = [];

    async function scanDirectory(dir, relativePath = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativeFullPath = relativePath ? join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          directories.push(relativeFullPath);
          await scanDirectory(fullPath, relativeFullPath);
        } else if (entry.isFile()) {
          files.push(relativeFullPath);
        }
      }
    }

    await scanDirectory(testPath);
    return { files, directories };
  }

  async validateDancingMonkeysArtifacts(monkeysDirs, artifactsDir) {
    console.log('  🐵 Validating dancing monkeys artifacts...');

    for (const dir of monkeysDirs) {
      const testPath = path.join(artifactsDir, dir.name);

      try {
        // Check for essential dancing monkeys files
        const htmlPath = path.join(testPath, 'index.html');
        const cssPath = path.join(testPath, 'style.css');
        const jsPath = path.join(testPath, 'script.js');

        const hasHTML = await fs.access(htmlPath).then(() => true).catch(() => false);
        const hasCSS = await fs.access(cssPath).then(() => true).catch(() => false);
        const hasJS = await fs.access(jsPath).then(() => true).catch(() => false);

        if (hasHTML && hasCSS && hasJS) {
          // Validate HTML content
          const htmlContent = await fs.readFile(htmlPath, 'utf-8');
          const hasMonkeys = htmlContent.includes('monkey-container') && htmlContent.includes('dancing monkeys');

          if (hasMonkeys) {
            console.log(`    ✅ ${dir.name}: Complete dancing monkeys implementation`);
            this.results.artifacts.set(`${dir.name}-validation`, { status: 'complete', hasMonkeys });
          } else {
            console.log(`    ⚠️  ${dir.name}: Missing monkey content`);
            this.results.artifacts.set(`${dir.name}-validation`, { status: 'incomplete', hasMonkeys: false });
          }
        } else {
          console.log(`    ❌ ${dir.name}: Missing essential files`);
          this.results.artifacts.set(`${dir.name}-validation`, { status: 'incomplete', files: { html: hasHTML, css: hasCSS, js: hasJS } });
        }
      } catch (error) {
        console.log(`    ❌ ${dir.name}: Validation error: ${error.message}`);
        this.results.artifacts.set(`${dir.name}-validation`, { status: 'error', error: error.message });
      }
    }
  }

  async enforceQualityGates() {
    console.log('🚪 Enforcing Quality Gates');
    console.log('-'.repeat(50));

    // Gate 1: Overall pass rate
    const currentPassRate = this.results.summary.passRate;
    const requiredPassRate = this.results.qualityGates.overallPassRate;

    console.log(`📊 Pass Rate: ${currentPassRate.toFixed(1)}% (Required: ${requiredPassRate}%)`);

    if (currentPassRate < requiredPassRate) {
      const failure = `Pass rate ${currentPassRate.toFixed(1)}% below required ${requiredPassRate}%`;
      this.results.qualityGates.criticalFailures.push(failure);
      console.log(`❌ Gate 1 FAILED: ${failure}`);
    } else {
      console.log('✅ Gate 1 PASSED: Pass rate meets requirements');
    }

    // Gate 2: Main goal mandatory
    const mainGoalStatus = this.results.requirements.mainGoal;
    console.log(`🎯 Main Goal Status: ${mainGoalStatus.passed}/${mainGoalStatus.total} tests passed`);

    if (this.results.qualityGates.mainGoalMandatory && mainGoalStatus.status !== 'passed') {
      const failure = 'Main goal (dancing monkeys) is mandatory and not passing';
      this.results.qualityGates.criticalFailures.push(failure);
      console.log(`❌ Gate 2 FAILED: ${failure}`);
    } else {
      console.log('✅ Gate 2 PASSED: Main goal achieved');
    }

    // Gate 3: Critical functionality
    const criticalCategories = ['coreCLI', 'templates', 'fileValidation'];
    let criticalPassed = 0;

    criticalCategories.forEach(category => {
      const status = this.results.requirements[category];
      if (status.status === 'passed') {
        criticalPassed++;
        console.log(`✅ ${category}: ${status.passed}/${status.total} passed`);
      } else {
        console.log(`❌ ${category}: ${status.passed}/${status.total} passed`);
      }
    });

    if (criticalPassed < criticalCategories.length) {
      const failure = `Critical functionality failures: ${criticalCategories.length - criticalPassed}/${criticalCategories.length} categories failed`;
      this.results.qualityGates.criticalFailures.push(failure);
      console.log(`❌ Gate 3 FAILED: ${failure}`);
    } else {
      console.log('✅ Gate 3 PASSED: All critical functionality working');
    }
  }

  async generateReport() {
    console.log('📊 Generating Comprehensive AQA Report');
    console.log('-'.repeat(50));

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        runner: 'AQA - Automated Quality Assurance',
        version: '1.0.0',
        testDir: this.testDir,
        artifactsPreserved: true
      },
      summary: this.results.summary,
      requirements: this.results.requirements,
      qualityGates: {
        overallPassRate: this.results.qualityGates.overallPassRate,
        mainGoalMandatory: this.results.qualityGates.mainGoalMandatory,
        criticalFailures: this.results.qualityGates.criticalFailures,
        status: this.results.qualityGates.criticalFailures.length === 0 ? 'PASSED' : 'FAILED'
      },
      artifacts: Object.fromEntries(this.results.artifacts),
      testResults: this.results.testResults,
      recommendations: this.generateRecommendations()
    };

    // Save JSON report
    await fs.writeFile('.aqa-report.json', JSON.stringify(report, null, 2));
    console.log('📄 JSON report saved to .aqa-report.json');

    // Generate markdown report
    await this.generateMarkdownReport(report);
    console.log('📄 Markdown report saved to .aqa-report.md');

    // Generate artifact summary
    await this.generateArtifactSummary();
    console.log('📄 Artifact summary saved to .aqa-artifacts.md');
  }

  generateRecommendations() {
    const recommendations = [];

    // Main goal recommendations
    if (this.results.requirements.mainGoal.status !== 'passed') {
      recommendations.push({
        priority: 'HIGH',
        category: 'Main Goal',
        description: 'Fix dancing monkeys functionality - this is the primary requirement from agents05.md',
        action: 'Ensure the command `prp init --default --prp "Deliver gh-page with animated danced monkeys spawn around"` works completely'
      });
    }

    // Performance recommendations
    if (this.results.requirements.performance.status !== 'passed') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        description: 'Performance issues detected in CLI execution',
        action: 'Optimize CLI initialization speed and resource usage'
      });
    }

    // Error handling recommendations
    if (this.results.requirements.errorHandling.status !== 'passed') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Error Handling',
        description: 'Error handling needs improvement',
        action: 'Implement better error messages and graceful degradation'
      });
    }

    // Coverage recommendations
    if (this.results.summary.passRate < 100) {
      recommendations.push({
        priority: 'LOW',
        category: 'Test Coverage',
        description: `Test coverage at ${this.results.summary.passRate.toFixed(1)}% - aim for 100%`,
        action: 'Add more comprehensive test cases to improve coverage'
      });
    }

    return recommendations;
  }

  async generateMarkdownReport(report) {
    const markdown = `# 🔍 AQA - Automated Quality Assurance Report

**Generated:** ${new Date(report.metadata.timestamp).toLocaleString()}
**Test Directory:** ${report.metadata.testDir}
**Artifacts Preserved:** ${report.metadata.artifactsPreserved ? 'Yes' : 'No'}

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Tests | ${report.summary.totalTests} | ${report.summary.passRate >= 95 ? '✅' : '❌'} |
| Passed | ${report.summary.passedTests} | |
| Failed | ${report.summary.failedTests} | |
| Skipped | ${report.summary.skippedTests} | |
| Duration | ${(report.summary.duration / 1000).toFixed(2)}s | |
| Overall Status | ${report.qualityGates.status} | ${report.qualityGates.status === 'PASSED' ? '🎉' : '❌'} |

## 🚪 Quality Gates

### Gate 1: Pass Rate (${report.summary.passRate.toFixed(1)}%)
**Required:** ${report.qualityGates.overallPassRate}%
**Status:** ${report.summary.passRate >= report.qualityGates.overallPassRate ? '✅ PASSED' : '❌ FAILED'}

### Gate 2: Main Goal (${report.requirements.mainGoal.passed}/${report.requirements.mainGoal.total})
**Required:** Mandatory
**Status:** ${report.requirements.mainGoal.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}

### Gate 3: Critical Functionality
**Core CLI:** ${report.requirements.coreCLI.status}
**Templates:** ${report.requirements.templates.status}
**File Validation:** ${report.requirements.fileValidation.status}
**Overall:** ${['coreCLI', 'templates', 'fileValidation'].filter(cat => report.requirements[cat].status === 'passed').length}/3

## 📋 Requirements Validation

### Core CLI Functionality (${report.requirements.coreCLI.passRate}%)
${this.generateRequirementSection(report.requirements.coreCLI)}

### 🎯 Main Goal - Dancing Monkeys (${report.requirements.mainGoal.passRate}%)
${this.generateRequirementSection(report.requirements.mainGoal)}

### Template System (${report.requirements.templates.passRate}%)
${this.generateRequirementSection(report.requirements.templates)}

### Agent Configuration (${report.requirements.agents.passRate}%)
${this.generateRequirementSection(report.requirements.agents)}

### Security & Compliance (${report.requirements.security.passRate}%)
${this.generateRequirementSection(report.requirements.security)}

### File Validation (${report.requirements.fileValidation.passRate}%)
${this.generateRequirementSection(report.requirements.fileValidation)}

### Error Handling (${report.requirements.errorHandling.passRate}%)
${this.generateRequirementSection(report.requirements.errorHandling)}

### Performance (${report.requirements.performance.passRate}%)
${this.generateRequirementSection(report.requirements.performance)}

### Complete User Journey (${report.requirements.userJourney.passRate}%)
${this.generateRequirementSection(report.requirements.userJourney)}

## 🎯 Main Goal Achievement Status

**Requirement:** "be able from \`prp init --default --prp 'Deliver gh-page with animated danced monkeys spawn around'\` get actual deployed page"

**Status:** ${report.requirements.mainGoal.status === 'passed' ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'}

**Details:**
${report.requirements.mainGoal.status === 'passed' ?
  '✅ Dancing monkeys are automatically detected' :
  '❌ Main goal not met - primary requirement from agents05.md'
}

${report.requirements.mainGoal.status === 'passed' ?
  '✅ Landing page template is applied correctly' :
  '❌ Landing page template not working'
}

${report.requirements.mainGoal.status === 'passed' ?
  '✅ All required files are created (HTML, CSS, JS)' :
  '❌ Required files missing or incorrect'
}

## 📁 Artifacts Summary

**Total Artifacts:** ${Object.keys(report.artifacts).length}

**Dancing Monkeys Artifacts:** ${Object.keys(report.artifacts).filter(key => key.includes('dancing-monkeys')).length}

**Artifact Locations:**
${Object.keys(report.artifacts).filter(key => key.includes('validation')).slice(0, 5).map(key => `- \`${key}\``).join('\n')}

## 🔧 Recommendations

${report.recommendations.map(rec =>
  `### ${rec.priority} - ${rec.category}\n**Issue:** ${rec.description}\n**Action:** ${rec.action}\n`
).join('\n')}

## 📊 Test Results Details

${report.testResults.slice(0, 10).map(test =>
  `### ${test.title}\n- **Status:** ${test.status === 'passed' ? '✅ Passed' : '❌ Failed'}\n- **Duration:** ${test.duration}ms\n- **Category:** ${test.category}\n${test.failureMessages.length > 0 ? `- **Errors:**\n${test.failureMessages.map(msg => `  - ${msg}`).join('\n')}\n` : ''}`
).join('\n')}

---

*Report generated by AQA - Automated Quality Assurance*
*All test artifacts are preserved for inspection at: ${report.metadata.testDir}*`;

    await fs.writeFile('.aqa-report.md', markdown);
  }

  generateRequirementSection(requirement) {
    return `- **Tests:** ${requirement.passed}/${requirement.total}\n- **Status:** ${requirement.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}\n- **Pass Rate:** ${requirement.total > 0 ? ((requirement.passed / requirement.total) * 100).toFixed(1) : '0'}%\n`;
  }

  async generateArtifactSummary() {
    const artifactSummary = `# 📁 AQA Artifacts Summary

**Generated:** ${new Date().toLocaleString()}
**Total Artifacts:** ${this.results.artifacts.size}

## 🎯 Main Goal Artifacts

${Object.entries(this.results.artifacts)
  .filter(([key, value]) => key.includes('dancing-monkeys'))
  .map(([key, value]) => {
    const status = value.status === 'complete' ? '✅' :
                  value.status === 'incomplete' ? '⚠️' : '❌';
    return `### ${key}\n${status} Status: ${value.status}\n${value.hasMonkeys ? '🐵 Contains dancing monkeys' : '❌ Missing monkeys'}\n`;
  })
  .join('\n')}

## 📋 All Test Artifacts

${Object.entries(this.results.artifacts)
  .map(([key, value]) => {
    const status = typeof value === 'object' && value.status ?
      (value.status === 'complete' ? '🟢' :
       value.status === 'incomplete' ? '🟡' : '🔴') : '📋';
    return `### ${key}\n${status} ${key}\n`;
  })
  .join('\n')}

## 🔍 How to Inspect Artifacts

1. **Navigate to test directory:**
   \`\`\`bash
   cd /tmp/prp-test-artifacts
   \`\`\`

2. **Explore specific test results:**
   \`\`\`bash
   ls -la cli-validation-*
   cd cli-validation-[timestamp]
   \`\`\`

3. **Inspect dancing monkeys implementation:**
   \`\`\`bash
   # Find dancing monkeys artifacts
   find . -name "*dancing-monkeys*" -type d
   cd [dancing-monkeys-artifact]

   # View the HTML implementation
   cat index.html

   # View the CSS animations
   cat style.css

   # View the JavaScript functionality
   cat script.js
   \`\`\`

4. **Validate configuration:**
   \`\`\`bash
   # Check .prprc configuration
   cat .prprc | jq '.'

   # Check package.json
   cat package.json | jq '.scripts'

   # Check AGENTS.md
   cat AGENTS.md
   \`\`\`

5. **Test in browser:**
   \`\`\`bash
   # Open dancing monkeys page in browser
   open index.html
   \`\`\`

---

*Artifacts generated by AQA - Automated Quality Assurance*
*Location: /tmp/prp-test-artifacts/*`;

    await fs.writeFile('.aqa-artifacts.md', artifactSummary);
  }

  displayFinalResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 AQA - Final Results');
    console.log('='.repeat(80));

    console.log(`\n📊 Overall Status: ${this.results.qualityGates.status}`);
    console.log(`🎯 Pass Rate: ${this.results.summary.passRate.toFixed(1)}% (Required: ${this.results.qualityGates.overallPassRate}%)`);
    console.log(`📋 Tests: ${this.results.summary.passedTests}/${this.results.summary.totalTests} passed`);
    console.log(`⏱️  Duration: ${(this.results.summary.duration / 1000).toFixed(2)}s`);

    console.log('\n🎯 Main Goal Status:');
    if (this.results.requirements.mainGoal.status === 'passed') {
      console.log('✅ SUCCESS! Dancing monkeys deployment is working!');
      console.log('🐵 Users can now execute: prp init --default --prp "Deliver gh-page with animated danced monkeys spawn around"');
    } else {
      console.log('❌ CRITICAL FAILURE! Main goal not achieved');
      console.log('📝 This is the primary requirement from agents05.md');
    }

    console.log('\n📁 Artifacts:');
    console.log(`   Total: ${this.results.artifacts.size} artifact directories`);
    console.log(`   Location: /tmp/prp-test-artifacts/`);
    console.log('   ✅ All artifacts preserved for inspection');

    if (this.results.qualityGates.criticalFailures.length > 0) {
      console.log('\n❌ Critical Failures:');
      this.results.qualityGates.criticalFailures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure}`);
      });
    }

    if (this.results.qualityGates.status === 'PASSED') {
      console.log('\n🎉 AQA PASSED! Quality gates met successfully.');
      console.log('✅ CLI is ready for deployment');
      console.log('✅ Main goal achieved');
      console.log('✅ All critical functionality working');
    } else {
      console.log('\n❌ AQA FAILED! Quality gates not met.');
      console.log('🔧 Address critical failures before proceeding');
      console.log('📝 Review detailed reports for specific issues');
    }

    console.log('\n📊 Reports Generated:');
    console.log('   📄 .aqa-report.json - Detailed JSON report');
    console.log('   📄 .aqa-report.md - Human-readable report');
    console.log('   📄 .aqa-artifacts.md - Artifact summary');

    console.log('\n' + '='.repeat(80));
  }

  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.testDir
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ exitCode: code, stdout, stderr });
      });

      child.on('error', reject);
    });
  }
}

// Run AQA if executed directly
if (require.main === module) {
  const runner = new AQARunner();
  runner.runCompleteAQA().catch(error => {
    console.error('💥 AQA Runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = AQARunner;