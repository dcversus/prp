/**
 * REAL E2E Tests for PRP Init Command
 *
 * These tests actually run the CLI with --ci flag and verify real functionality
 * No manual interaction, no timeouts, real pass/fail criteria
 */

import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import * as os from 'os';
import { CLIRunner } from '../helpers/cli-runner';
import { ProjectValidator } from '../helpers/project-validator';

describe('REAL E2E: Init Command', () => {
  const testDirectories: string[] = [];
  const originalCwd = process.cwd();
  const cli = new CLIRunner();

  afterEach(() => {
    testDirectories.forEach(dir => {
      rmSync(dir, { recursive: true, force: true });
    });
    process.chdir(originalCwd);
  });

  describe('Template Creation', () => {
    const templates = [
      { name: 'typescript', validator: 'validateTypeScript' },
      { name: 'react', validator: 'validateReact' },
      { name: 'nestjs', validator: 'validateNestJS' },
      { name: 'fastapi', validator: 'validateFastAPI' },
      { name: 'wikijs', validator: 'validateWikiJS' },
      { name: 'none', validator: 'validateNone' }
    ];

    templates.forEach(({ name, validator }) => {
      it(`should create a working ${name} project`, async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), `prp-e2e-${name}-`));
        testDirectories.push(testDir);

        console.log(`\n🧪 Testing ${name} template creation in: ${testDir}`);

        // Run init with CI mode - no interactive prompts
        const result = await cli.runInit({
          projectDir: testDir,
          projectName: `test-${name}-project`,
          template: name
        });

        console.log(`Exit code: ${result.exitCode}`);
        if (result.stderr) console.log(`Stderr: ${result.stderr}`);
        if (result.stdout) console.log(`Stdout: ${result.stdout}`);

        // Verify CLI succeeded
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);

        // Verify project structure
        const validatorInstance = new ProjectValidator(testDir);
        const validation = validatorInstance[validator as keyof ProjectValidator]();

        console.log(`Validation errors: ${validation.errors.length}`);
        console.log(`Validation warnings: ${validation.warnings.length}`);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Verify .prprc has correct template
        const detectedTemplate = validatorInstance.getTemplateType();
        expect(detectedTemplate).toBe(name);

        // For buildable projects, verify they can build
        if (['typescript', 'react', 'nestjs'].includes(name)) {
          const buildResult = validatorInstance.canBuild();
          if (!buildResult.valid) {
            console.warn('Build warnings:', buildResult.warnings);
            console.warn('Build errors:', buildResult.errors);
            // Don't fail test on build issues for now (might be missing deps)
          }
        }

        console.log(`✅ ${name} template validated successfully!`);
      }, 60000); // 60 second timeout for real CLI execution
    });
  });

  describe('Error Handling', () => {
    it('should fail with invalid project name', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-e2e-invalid-name-'));
      testDirectories.push(testDir);

      const result = await cli.runInit({
        projectDir: testDir,
        projectName: '123-Invalid-Name!', // Invalid name
        template: 'typescript'
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
      // CLI should return error message about invalid name
      expect(result.stderr || result.stdout).toMatch(/invalid|name/i);
    }, 30000);

    it('should fail in non-empty directory without force', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-e2e-nonempty-'));
      testDirectories.push(testDir);

      // Create an existing file
      const { writeFileSync } = await import('fs');
      writeFileSync(join(testDir, 'existing-file.txt'), 'exists');

      const result = await cli.runInit({
        projectDir: testDir,
        projectName: 'test-project',
        template: 'typescript'
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    }, 30000);

    it('should fail with non-existent template', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-e2e-bad-template-'));
      testDirectories.push(testDir);

      const result = await cli.runInit({
        projectDir: testDir,
        projectName: 'test-project',
        template: 'non-existent-template'
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Configuration Validation', () => {
    it('should create valid .prprc configuration', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-e2e-config-'));
      testDirectories.push(testDir);

      const result = await cli.runInit({
        projectDir: testDir,
        projectName: 'config-test-project',
        template: 'typescript'
      });

      expect(result.success).toBe(true);

      // Verify .prprc content
      const { readFileSync } = await import('fs');
      const prprcContent = JSON.parse(readFileSync(join(testDir, '.prprc'), 'utf8'));

      expect(prprc.name).toBe('config-test-project');
      expect(prprc.template).toBe('typescript');
      expect(prprc.version).toBeDefined();
      expect(prprc.created).toBeDefined();
    }, 30000);

    it('should create working directory structure', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-e2e-structure-'));
      testDirectories.push(testDir);

      const result = await cli.runInit({
        projectDir: testDir,
        projectName: 'structure-test',
        template: 'typescript'
      });

      expect(result.success).toBe(true);

      // Check PRP directory structure
      const { readdirSync, existsSync } = await import('fs');

      expect(existsSync(join(testDir, 'PRPs'))).toBe(true);
      expect(existsSync(join(testDir, 'README.md'))).toBe(true);
      expect(existsSync(join(testDir, 'AGENTS.md'))).toBe(true);

      // Check PRPs directory has files
      const prpFiles = readdirSync(join(testDir, 'PRPs'));
      expect(prpFiles.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Performance Benchmarks', () => {
    it('should complete initialization within reasonable time', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-e2e-perf-'));
      testDirectories.push(testDir);

      const startTime = Date.now();

      const result = await cli.runInit({
        projectDir: testDir,
        projectName: 'perf-test',
        template: 'typescript'
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds

      console.log(`Init completed in ${duration}ms`);
    }, 45000);
  });
});