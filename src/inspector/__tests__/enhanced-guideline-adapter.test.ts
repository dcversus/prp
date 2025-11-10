/**
 * Enhanced Guideline Adapter Tests
 *
 * Comprehensive tests for the enhanced guideline adapter with support for
 * style, architecture, process, and security guidelines.
 */

// Mock the dependencies that cause issues with Jest
jest.mock('../../shared/utils', () => ({
  createLayerLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),
  HashUtils: {
    generateId: () => 'test-id-' + Math.random().toString(36).substr(2, 9),
    hashString: async (str: string) => 'hashed-' + str.length
  }
}));

import { GuidelineAdapter, GuidelineType, SeverityLevel } from '../guideline-adapter';
import { Signal } from '../../shared/types';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

describe('EnhancedGuidelineAdapter', () => {
  let adapter: GuidelineAdapter;
  let testDir: string;

  beforeEach(() => {
    adapter = new GuidelineAdapter();
    testDir = join(tmpdir(), `prp-guideline-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Guideline Types', () => {
    it('should support all guideline types', () => {
      expect(GuidelineType.STYLE).toBe('style');
      expect(GuidelineType.ARCHITECTURE).toBe('architecture');
      expect(GuidelineType.PROCESS).toBe('process');
      expect(GuidelineType.SECURITY).toBe('security');
    });

    it('should support all severity levels', () => {
      expect(SeverityLevel.ERROR).toBe('error');
      expect(SeverityLevel.WARNING).toBe('warning');
      expect(SeverityLevel.INFO).toBe('info');
    });
  });

  describe('Built-in Guidelines', () => {
    it('should initialize with built-in style guidelines', () => {
      const styleChecks = adapter.getGuidelineChecksByType(GuidelineType.STYLE);
      expect(styleChecks.length).toBeGreaterThan(0);

      const eslintCheck = styleChecks.find(check => check.guidelineId === 'eslint-standard');
      expect(eslintCheck).toBeDefined();
      expect(eslintCheck?.rules.length).toBeGreaterThan(0);
    });

    it('should initialize with built-in architecture guidelines', () => {
      const archChecks = adapter.getGuidelineChecksByType(GuidelineType.ARCHITECTURE);
      expect(archChecks.length).toBeGreaterThan(0);

      const solidCheck = archChecks.find(check => check.guidelineId === 'solid-principles');
      expect(solidCheck).toBeDefined();
      expect(solidCheck?.rules.length).toBeGreaterThan(0);
    });

    it('should initialize with built-in process guidelines', () => {
      const processChecks = adapter.getGuidelineChecksByType(GuidelineType.PROCESS);
      expect(processChecks.length).toBeGreaterThan(0);

      const gitCheck = processChecks.find(check => check.guidelineId === 'git-workflow');
      expect(gitCheck).toBeDefined();
    });

    it('should initialize with built-in security guidelines', () => {
      const securityChecks = adapter.getGuidelineChecksByType(GuidelineType.SECURITY);
      expect(securityChecks.length).toBeGreaterThan(0);

      const owaspCheck = securityChecks.find(check => check.guidelineId === 'owasp-security');
      expect(owaspCheck).toBeDefined();
      expect(owaspCheck?.rules.length).toBeGreaterThan(0);
    });
  });

  describe('File Checking', () => {
    it('should detect console statements in JavaScript files', async () => {
      const testFile = join(testDir, 'test.js');
      writeFileSync(testFile, `
        function test() {
          console.log('This is a test');
          console.warn('Warning message');
          return true;
        }
      `);

      const violations = await adapter.checkFile(testFile);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.rule === 'no-console')).toBe(true);
      expect(violations.some(v => v.severity === SeverityLevel.WARNING)).toBe(true);
    });

    it('should detect hardcoded secrets', async () => {
      const testFile = join(testDir, 'config.js');
      writeFileSync(testFile, `
        const config = {
          apiKey: 'sk-1234567890abcdef',
          password: 'secret123',
          databaseUrl: 'mongodb://localhost:27017'
        };
      `);

      const violations = await adapter.checkFile(testFile);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.rule === 'no-hardcoded-secrets')).toBe(true);
      expect(violations.some(v => v.severity === SeverityLevel.ERROR)).toBe(true);
    });

    it('should detect SQL injection risks', async () => {
      const testFile = join(testDir, 'database.js');
      writeFileSync(testFile, `
        function getUser(id) {
          const query = "SELECT * FROM users WHERE id = " + id;
          return db.query(query);
        }
      `);

      const violations = await adapter.checkFile(testFile);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.rule === 'sql-injection-prevention')).toBe(true);
      expect(violations.some(v => v.severity === SeverityLevel.ERROR)).toBe(true);
    });

    it('should provide line and column information for violations', async () => {
      const testFile = join(testDir, 'test.js');
      writeFileSync(testFile, `
        line 1
        line 2
        console.log('error on line 3');
        line 4
      `);

      const violations = await adapter.checkFile(testFile);
      const consoleViolation = violations.find(v => v.rule === 'no-console');

      expect(consoleViolation).toBeDefined();
      expect(consoleViolation?.line).toBe(3);
      expect(consoleViolation?.column).toBeGreaterThan(0);
    });

    it('should check multiple files and generate comprehensive report', async () => {
      const files = [
        join(testDir, 'file1.js'),
        join(testDir, 'file2.ts'),
        join(testDir, 'file3.js')
      ];

      writeFileSync(files[0], 'console.log("error");');
      writeFileSync(files[1], 'const password = "secret123";');
      writeFileSync(files[2], '// Clean file with no violations');

      const report = await adapter.checkFiles(files);

      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.summary.totalViolations).toBeGreaterThan(0);
      expect(report.summary.errors).toBeGreaterThan(0);
      expect(report.summary.warnings).toBeGreaterThan(0);
      expect(report.violations.length).toBe(report.summary.totalViolations);
      expect(report.guidelines.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.metrics.filesProcessed).toBe(3);
      expect(report.metrics.checkDuration).toBeGreaterThan(0);
    });

    it('should filter checks by type', async () => {
      const testFile = join(testDir, 'test.js');
      writeFileSync(testFile, `
        console.log('style violation');
        const password = 'secret123'; // security violation
      `);

      const allViolations = await adapter.checkFile(testFile);
      expect(allViolations.length).toBe(2);

      const securityViolations = await adapter.checkFile(testFile, { types: [GuidelineType.SECURITY] });
      expect(securityViolations.length).toBe(1);
      expect(securityViolations[0].type).toBe(GuidelineType.SECURITY);

      const styleViolations = await adapter.checkFile(testFile, { types: [GuidelineType.STYLE] });
      expect(styleViolations.length).toBe(1);
      expect(styleViolations[0].type).toBe(GuidelineType.STYLE);
    });
  });

  describe('Guideline Management', () => {
    it('should add custom guideline checks', () => {
      const customCheck = {
        guidelineId: 'custom-test',
        enabled: true,
        type: GuidelineType.STYLE,
        rules: [{
          id: 'custom-rule',
          name: 'Custom Rule',
          description: 'A custom test rule',
          severity: SeverityLevel.WARNING as const,
          pattern: /TODO:/g
        }],
        configuration: {}
      };

      adapter.addGuidelineCheck(customCheck);

      const checks = adapter.getGuidelineChecks();
      expect(checks.some(c => c.guidelineId === 'custom-test')).toBe(true);
    });

    it('should remove guideline checks', () => {
      const customCheck = {
        guidelineId: 'removable-test',
        enabled: true,
        type: GuidelineType.STYLE,
        rules: [{
          id: 'test-rule',
          name: 'Test Rule',
          description: 'A test rule',
          severity: SeverityLevel.INFO as const,
          pattern: /test/g
        }],
        configuration: {}
      };

      adapter.addGuidelineCheck(customCheck);
      expect(adapter.getGuidelineChecks().some(c => c.guidelineId === 'removable-test')).toBe(true);

      const removed = adapter.removeGuidelineCheck('removable-test');
      expect(removed).toBe(true);
      expect(adapter.getGuidelineChecks().some(c => c.guidelineId === 'removable-test')).toBe(false);
    });

    it('should enable and disable guideline checks', () => {
      const checkId = 'eslint-standard';
      const check = adapter.getGuidelineChecks().find(c => c.guidelineId === checkId);
      expect(check?.enabled).toBe(true);

      const disabled = adapter.setGuidelineCheckEnabled(checkId, false);
      expect(disabled).toBe(true);

      const updatedCheck = adapter.getGuidelineChecks().find(c => c.guidelineId === checkId);
      expect(updatedCheck?.enabled).toBe(false);
    });
  });

  describe('Violation History', () => {
    it('should track violation history for files', async () => {
      const testFile = join(testDir, 'test.js');
      writeFileSync(testFile, 'console.log("test");');

      await adapter.checkFile(testFile);
      const history = adapter.getViolationHistory(testFile);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].file).toBe(testFile);
    });

    it('should clear violation history', async () => {
      const testFile = join(testDir, 'test.js');
      writeFileSync(testFile, 'console.log("test");');

      await adapter.checkFile(testFile);
      expect(adapter.getViolationHistory(testFile).length).toBeGreaterThan(0);

      adapter.clearViolationHistory();
      expect(adapter.getViolationHistory(testFile).length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive statistics', () => {
      const stats = adapter.getGuidelineStats();

      expect(stats.totalGuidelines).toBeGreaterThanOrEqual(0);
      expect(stats.enabledGuidelines).toBeGreaterThanOrEqual(0);
      expect(stats.checksByType.style).toBeGreaterThanOrEqual(0);
      expect(stats.checksByType.architecture).toBeGreaterThanOrEqual(0);
      expect(stats.checksByType.process).toBeGreaterThanOrEqual(0);
      expect(stats.checksByType.security).toBeGreaterThanOrEqual(0);
      expect(stats.totalRules).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const violations = await adapter.checkFile('/non/existent/file.js');
      expect(violations).toEqual([]);
    });

    it('should handle invalid file patterns gracefully', async () => {
      const invalidFile = join(testDir, 'invalid.js');
      writeFileSync(invalidFile, 'Invalid content');

      // Should not throw errors for various content types
      const violations = await adapter.checkFile(invalidFile);
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('Signal Processing Integration', () => {
    it('should integrate with existing signal processing', async () => {
      // Load some guidelines first
      await adapter.loadGuidelines();

      const testSignal: Signal = {
        id: 'test-signal',
        type: '[qb]',
        source: 'test',
        timestamp: new Date(),
        priority: 5,
        data: {
          rawSignal: '[qb] Quality bug found in implementation'
        }
      };

      const guideline = await adapter.getGuidelineForSignal(testSignal);

      // Should either return a guideline or null (both are valid)
      expect(typeof guideline === 'string' || guideline === null).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive recommendations', async () => {
      const testFile = join(testDir, 'test.js');
      writeFileSync(testFile, `
        console.log('warning');
        const password = 'secret123'; // error
        const apiKey = 'key123'; // error
      `);

      const report = await adapter.checkFiles([testFile]);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('critical error'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('security'))).toBe(true);
    });

    it('should provide fixable violation count', async () => {
      const testFile = join(testDir, 'test.js');
      writeFileSync(testFile, 'console.log("fixable");');

      const report = await adapter.checkFiles([testFile]);

      expect(report.summary.fixable).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', async () => {
      const largeContent = Array(1000).fill('console.log("line");').join('\n');
      const testFile = join(testDir, 'large.js');
      writeFileSync(testFile, largeContent);

      const startTime = Date.now();
      const violations = await adapter.checkFile(testFile);
      const duration = Date.now() - startTime;

      expect(violations.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple files concurrently', async () => {
      const files = Array(10).fill(null).map((_, i) => {
        const file = join(testDir, `file${i}.js`);
        writeFileSync(file, `console.log("file ${i}");`);
        return file;
      });

      const startTime = Date.now();
      const report = await adapter.checkFiles(files);
      const duration = Date.now() - startTime;

      expect(report.metrics.filesProcessed).toBe(10);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});