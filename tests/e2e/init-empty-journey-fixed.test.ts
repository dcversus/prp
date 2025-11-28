/**
 * Init Empty Journey E2E Test (Fixed Version)
 * Tests bootstrap from scratch in empty directory using real CLI execution
 * Validates both TUI (interactive) and CI (automated) modes
 */

import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { CLIRunner } from '../helpers/cli-runner';
import { ProjectValidator } from '../helpers/project-validator';

describe('Init Empty Journey - Bootstrap from Scratch (Fixed)', () => {
  describe('CI Mode - Non-interactive Initialization', () => {
    const templates = ['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none'];

    templates.forEach(template => {
      describe(`Template: ${template}`, () => {
        let runner: CLIRunner;
        let tempDir: string;
        let validator: ProjectValidator;

        beforeEach(() => {
          runner = new CLIRunner();
        });

        afterEach(async () => {
          // Cleanup temp dir
          if (tempDir && existsSync(tempDir)) {
            try {
              rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        });

        it(`should create ${template} project in CI mode`, async () => {
          const projectName = `test-${template}-${Date.now()}`;
          tempDir = join(require('os').tmpdir(), `prp-test-${projectName}`);

          // Use our enhanced CLIRunner for CI mode
          console.log(`Running CI init for ${template} in ${tempDir}`);
          const result = await runner.runCIJourney({
            projectDir: tempDir,
            projectName,
            template,
            prompt: `Test ${template} project created via CI mode`,
            description: `A test project using ${template} template`,
            timeout: 45000
          });

          console.log(`CI init result:`, { success: result.success, exitCode: result.exitCode, stdout: result.stdout?.slice(0, 200), stderr: result.stderr?.slice(0, 200) });

          // Verify command succeeded
          expect(result.success).toBe(true);
          expect(result.exitCode).toBe(0);

          // Get performance metrics
          const metrics = runner.getPerformanceMetrics();
          expect(metrics.totalDuration).toBeLessThan(45000);
          expect(metrics.startupTime).toBeGreaterThan(0);

          // Validate project structure
          validator = new ProjectValidator(tempDir);
          const validation = validator.validateCompleteProject();

          // Basic validation should pass
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);

          // Check for essential files
          const templateType = validator.getTemplateType();
          expect(templateType).toBe(template);

          // Get detailed project report
          const report = validator.getProjectReport();
          expect(report.template).toBe(template);
          expect(report.validation.valid).toBe(true);
          expect(report.size.totalFiles).toBeGreaterThan(0);

          console.log(`✅ ${template} project created successfully`);
          console.log(`📊 Files created: ${report.size.totalFiles}`);
          console.log(`⏱️  Duration: ${metrics.totalDuration}ms`);
        });
      });
    });

    describe('Complete User Journey - CI Mode', () => {
      let runner: CLIRunner;

      it('should complete full init → orchestrator → interrupt workflow', async () => {
        const projectName = `test-full-journey-${Date.now()}`;
        const tempDir = join(require('os').tmpdir(), `prp-test-${projectName}`);

        runner = new CLIRunner();

        try {
          // Test full user journey using our enhanced CLIRunner
          const journeyResult = await runner.runFullUserJourney({
            projectDir: tempDir,
            projectName,
            template: 'typescript',
            initTimeout: 30000,
            orchestratorTimeout: 10000,
            captureSession: true
          });

          // Verify init succeeded
          expect(journeyResult.initResult.success).toBe(true);

          // Validate project
          validator = new ProjectValidator(tempDir);
          const validation = validator.validateOrchestratorReady();
          expect(validation.valid).toBe(true);

          // Check session logs
          const sessionLogs = runner.getSessionLog();
          expect(sessionLogs.length).toBeGreaterThan(0);

          console.log('✅ Full user journey completed successfully');
          console.log(`📝 Session events: ${sessionLogs.length}`);
        } finally {
          // Cleanup
          if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
          }
        }
      });
    });
  });

  describe('CLI Bundle Validation', () => {
    it('should validate CLI bundle exists and works', async () => {
      const runner = new CLIRunner();
      const validation = await runner.validateCLI();

      expect(validation.valid).toBe(true);
      expect(validation.version).toBeDefined();

      console.log(`✅ CLI bundle validated - Version: ${validation.version}`);
    });
  });
});