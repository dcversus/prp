/**
 * Init Empty Journey E2E Test
 * Tests bootstrap from scratch in empty directory
 * Validates both TUI (interactive) and CI (automated) modes
 */

import { join } from 'path';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { runInTempDir } from './helpers/terminal-runner';
import { createTUISimulator } from './helpers/tui-simulator';
import { BusinessValidator } from './helpers/business-validator';

describe('Init Empty Journey - Bootstrap from Scratch', () => {
  describe('TUI Mode - Interactive Initialization', () => {
    const templates = ['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none'];

    templates.forEach(template => {
      describe(`Template: ${template}`, () => {
        let tempDir: string;
        let validator: BusinessValidator;
        let captures: string[] = [];

        beforeAll(async () => {
          // Ensure CLI is built
          require('child_process').execSync('npm run build', { stdio: 'pipe' });
        });

        afterEach(async () => {
          // Cleanup captures and temp dirs
          captures.forEach(file => {
            try {
              unlinkSync(file);
            } catch (e) {
              // Ignore cleanup errors
            }
          });

          if (tempDir && existsSync(tempDir)) {
            try {
              rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        });

        it('should complete full TUI initialization flow', async () => {
          const projectName = `test-${template}-${Date.now()}`;

          const result = await runInTempDir(async (runner, dir) => {
            tempDir = dir;
            const { terminal, simulator } = createTUISimulator(dir, 'tui');
            validator = new BusinessValidator(dir);

            try {
              // Start the init command
              const initPromise = terminal.runInit();

              // Run complete TUI flow
              await simulator.runCompleteInitFlow(projectName, template);

              // Wait for initialization to complete
              const initResult = await initPromise;

              // Save captures
              captures = captures.concat(
                terminal.saveScreenCapture(),
                simulator.saveScreenSnapshot()
              );

              return initResult;
            } catch (error) {
              // Save error state for debugging
              captures.push(
                terminal.saveScreenCapture(),
                simulator.saveScreenSnapshot()
              );
              throw error;
            }
          });

          // Verify command succeeded
          expect(result.exitCode).toBe(0);
          expect(result.duration).toBeLessThan(60000); // Should complete within 60 seconds
          expect(result.output).toContain('success');

          // Validate project structure
          const structureValidation = validator.validateProjectStructure();
          expect(structureValidation.valid).toBe(true);
          expect(structureValidation.passed).toContain('.prprc configuration file exists');
          expect(structureValidation.passed).toContain('PRPs directory exists');
          expect(structureValidation.passed).toContain('AGENTS.md file exists');

          // Validate PRP configuration
          const prprcValidation = validator.validatePrprcConfig();
          expect(prprcValidation.valid).toBe(true);
          expect(prprcValidation.passed).toContain('Project name configured');
          expect(prprcValidation.passed).toContain('Agent robo-developer configured');

          // Validate AGENTS.md
          const agentsValidation = validator.validateAgentsMd();
          expect(agentsValidation.valid).toBe(true);
          expect(agentsValidation.passed).toContain('System section properly marked');
          expect(agentsValidation.passed).toContain('Signal system documented');

          // Validate initial PRP
          const prpValidation = validator.validateInitialPRP();
          expect(prpValidation.valid).toBe(true);
          expect(prpValidation.passed).toContain('PRP filename follows correct format');

          // Validate template compliance
          const templateValidation = validator.validateTemplateCompliance(template);
          if (template !== 'none') {
            expect(templateValidation.valid).toBe(true);
          }

          // Validate overall compliance
          const compliance = validator.validatePRPCompliance(template);
          expect(compliance.structureValid).toBe(true);
          expect(compliance.prprcValid).toBe(true);
          expect(compliance.agentsMdValid).toBe(true);
          expect(compliance.initialPRPValid).toBe(true);
          expect(compliance.governanceIntact).toBe(true);
        }, 120000); // 2 minute timeout

        it('should handle navigation gracefully', async () => {
          const projectName = `test-nav-${template}-${Date.now()}`;

          const result = await runInTempDir(async (runner, dir) => {
            const { terminal, simulator } = createTUISimulator(dir, 'tui');

            try {
              const initPromise = terminal.runInit();

              // Test navigation back and forth
              await simulator.waitForScreen('welcome');
              await simulator.confirm();

              await simulator.waitForScreen('project-name');
              await simulator.goBack(); // Go back to welcome
              await simulator.delay(500);
              await simulator.confirm(); // Continue

              await simulator.waitForScreen('project-name');
              await simulator.fillInput(projectName);
              await simulator.confirm();

              // Skip ahead to test template selection navigation
              await simulator.waitForScreen('template-selection');
              await simulator.sendKey('down'); // Navigate down
              await simulator.sendKey('up'); // Navigate up
              await simulator.selectChoice(template);

              // Continue with rest of flow
              await simulator.runAgentConfigurationFlow();
              await simulator.runIntegrationsFlow();
              await simulator.runConfirmationFlow();
              await simulator.waitForScreen('success');

              return await initPromise;
            } catch (error) {
              captures.push(
                terminal.saveScreenCapture(),
                simulator.saveScreenSnapshot()
              );
              throw error;
            }
          });

          expect(result.exitCode).toBe(0);
        }, 120000);

        it('should validate input properly', async () => {
          const projectName = `test-validation-${template}-${Date.now()}`;

          const result = await runInTempDir(async (runner, dir) => {
            const { terminal, simulator } = createTUISimulator(dir, 'tui');

            try {
              const initPromise = terminal.runInit();

              await simulator.waitForScreen('welcome');
              await simulator.confirm();

              await simulator.waitForScreen('project-name');

              // Try invalid project name first
              await simulator.fillInput(''); // Empty name
              await simulator.confirm();
              await simulator.delay(500); // Wait for validation

              // Should still be on project name screen
              const state = simulator.getState();
              expect(state.currentScreen).toBe('project-name');

              // Try valid name now
              await simulator.fillInput(projectName);
              await simulator.confirm();

              // Continue with flow
              await simulator.runTemplateSelectionFlow(template);
              await simulator.runAgentConfigurationFlow();
              await simulator.runIntegrationsFlow();
              await simulator.runConfirmationFlow();
              await simulator.waitForScreen('success');

              return await initPromise;
            } catch (error) {
              captures.push(
                terminal.saveScreenCapture(),
                simulator.saveScreenSnapshot()
              );
              throw error;
            }
          });

          expect(result.exitCode).toBe(0);
        }, 120000);
      });
    });
  });

  describe('CI Mode - Automated Initialization', () => {
    const templates = ['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none'];

    templates.forEach(template => {
      describe(`Template: ${template}`, () => {
        let tempDir: string;
        let validator: BusinessValidator;
        let captures: string[] = [];

        afterEach(async () => {
          captures.forEach(file => {
            try {
              unlinkSync(file);
            } catch (e) {
              // Ignore cleanup errors
            }
          });

          if (tempDir && existsSync(tempDir)) {
            try {
              rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        });

        it('should initialize project with flags', async () => {
          const projectName = `test-ci-${template}-${Date.now()}`;

          const result = await runInTempDir(async (runner, dir) => {
            tempDir = dir;
            const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');
            validator = new BusinessValidator(dir);

            try {
              // Initialize with command line flags
              const initResult = await terminal.runInit([
                projectName,
                '--template', template,
                '--mode', 'ci',
                '--no-interactive',
                '--agents', 'robo-developer,robo-quality-control',
                '--no-integrations'
              ]);

              captures.push(terminal.saveScreenCapture());
              return initResult;
            } catch (error) {
              captures.push(terminal.saveScreenCapture());
              throw error;
            }
          });

          // Verify command succeeded
          expect(result.exitCode).toBe(0);
          expect(result.duration).toBeLessThan(30000); // CI should be faster than TUI

          // Validate project was created correctly
          const structureValidation = validator.validateProjectStructure();
          expect(structureValidation.valid).toBe(true);

          // Validate PRP configuration
          const prprcValidation = validator.validatePrprcConfig();
          expect(prprcValidation.valid).toBe(true);

          // Validate template compliance
          const templateValidation = validator.validateTemplateCompliance(template);
          if (template !== 'none') {
            expect(templateValidation.valid).toBe(true);
          }

          // Verify .prprc contains CI mode settings
          const prprcPath = join(tempDir, '.prprc');
          if (existsSync(prprcPath)) {
            const config = JSON.parse(require('fs').readFileSync(prprcPath, 'utf8'));
            expect(config.project.name).toBe(projectName);
            expect(config.template.name).toBe(template);
          }
        }, 90000);

        it('should handle missing flags gracefully', async () => {
          const result = await runInTempDir(async (runner, dir) => {
            const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

            try {
              // Try without required flags - should show help
              const result = await terminal.runInit([]);
              return result;
            } catch (error) {
              // Expected to fail or show help
              return {
                exitCode: 1,
                stdout: '',
                stderr: error.message,
                output: error.message,
                duration: 0,
                killed: false
              };
            }
          });

          // Should either fail with non-zero exit or show help
          expect(
            result.exitCode !== 0 ||
            result.stdout.includes('help') ||
            result.stderr.includes('help') ||
            result.output.includes('help')
          ).toBe(true);
        }, 30000);

        it('should validate template choice', async () => {
          const projectName = `test-invalid-template-${Date.now()}`;

          const result = await runInTempDir(async (runner, dir) => {
            const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

            try {
              // Try with invalid template
              const result = await terminal.runInit([
                projectName,
                '--template', 'invalid-template-name',
                '--mode', 'ci'
              ]);
              return result;
            } catch (error) {
              return {
                exitCode: 1,
                stdout: '',
                stderr: error.message,
                output: error.message,
                duration: 0,
                killed: false
              };
            }
          });

          // Should fail with invalid template
          expect(result.exitCode).toBe(1);
        }, 30000);
      });
    });
  });

  describe('Cross-Mode Validation', () => {
    let tuiDir: string;
    let ciDir: string;
    let captures: string[] = [];

    afterEach(async () => {
      captures.forEach(file => {
        try {
          unlinkSync(file);
        } catch (e) {
          // Ignore cleanup errors
        }
      });

      [tuiDir, ciDir].forEach(dir => {
        if (dir && existsSync(dir)) {
          try {
            rmSync(dir, { recursive: true, force: true });
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      });
    });

    it('should create equivalent projects in TUI and CI modes', async () => {
      const projectName = `test-cross-mode-${Date.now()}`;
      const template = 'typescript';

      // Create project with TUI mode
      const tuiResult = await runInTempDir(async (runner, dir) => {
        tuiDir = dir;
        const { terminal, simulator } = createTUISimulator(dir, 'tui');

        try {
          const initPromise = terminal.runInit();
          await simulator.runCompleteInitFlow(projectName, template);
          return await initPromise;
        } catch (error) {
          captures.push(terminal.saveScreenCapture());
          throw error;
        }
      });

      // Create project with CI mode
      const ciResult = await runInTempDir(async (runner, dir) => {
        ciDir = dir;
        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          return await terminal.runInit([
            projectName,
            '--template', template,
            '--mode', 'ci',
            '--no-interactive',
            '--agents', 'robo-developer,robo-quality-control,robo-ux-ui-designer,robo-devops-sre',
            '--no-integrations'
          ]);
        } catch (error) {
          captures.push(terminal.saveScreenCapture());
          throw error;
        }
      });

      // Both should succeed
      expect(tuiResult.exitCode).toBe(0);
      expect(ciResult.exitCode).toBe(0);

      // Validate both projects
      const tuiValidator = new BusinessValidator(tuiDir);
      const ciValidator = new BusinessValidator(ciDir);

      const tuiValidation = tuiValidator.validatePRPCompliance(template);
      const ciValidation = ciValidator.validatePRPCompliance(template);

      // Both should be compliant
      expect(tuiValidation.structureValid).toBe(true);
      expect(ciValidation.structureValid).toBe(true);

      expect(tuiValidation.governanceIntact).toBe(true);
      expect(ciValidation.governanceIntact).toBe(true);

      // Compare configurations (they should be functionally equivalent)
      const tuiPrprc = JSON.parse(require('fs').readFileSync(join(tuiDir, '.prprc'), 'utf8'));
      const ciPrprc = JSON.parse(require('fs').readFileSync(join(ciDir, '.prprc'), 'utf8'));

      expect(tuiPrprc.project.name).toBe(projectName);
      expect(ciPrprc.project.name).toBe(projectName);
      expect(tuiPrprc.template.name).toBe(template);
      expect(ciPrprc.template.name).toBe(template);
    }, 180000);
  });

  describe('Error Handling', () => {
    it('should handle interruption gracefully', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        const { terminal, simulator } = createTUISimulator(dir, 'tui');

        try {
          const initPromise = terminal.runInit();

          // Start the flow
          await simulator.waitForScreen('welcome');

          // Interrupt with Ctrl+C
          terminal.sendKey('c', true); // Ctrl+C

          // Wait a bit for graceful shutdown
          await simulator.delay(1000);

          // The process should exit
          return await initPromise;
        } catch (error) {
          // Expected to be interrupted
          return {
            exitCode: null, // Killed process
            stdout: '',
            stderr: '',
            output: '',
            duration: 0,
            killed: true
          };
        }
      });

      // Process should be killed or exit with non-zero code
      expect(
        result.killed === true ||
        (result.exitCode !== null && result.exitCode !== 0)
      ).toBe(true);
    }, 30000);

    it('should handle file system errors', async () => {
      // Create a directory with restricted permissions (simulate error)
      const result = await runInTempDir(async (runner, dir) => {
        // Create a file where directory should be (simulate error)
        const blockerFile = join(dir, 'PRPs');
        require('fs').writeFileSync(blockerFile, 'blocking file creation');

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          return await terminal.runInit([
            'test-error',
            '--template', 'typescript',
            '--mode', 'ci'
          ]);
        } catch (error) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      // Should fail gracefully
      expect(result.exitCode).toBe(1);
    }, 30000);
  });

  describe('Performance Requirements', () => {
    it('should complete initialization within performance limits', async () => {
      const projectName = `test-perf-${Date.now()}`;
      const template = 'typescript';

      // Test TUI performance
      const tuiStart = Date.now();
      const tuiResult = await runInTempDir(async (runner, dir) => {
        const { terminal, simulator } = createTUISimulator(dir, 'tui');

        const initPromise = terminal.runInit();
        await simulator.runCompleteInitFlow(projectName, template);
        return await initPromise;
      });
      const tuiDuration = Date.now() - tuiStart;

      // Test CI performance
      const ciStart = Date.now();
      const ciResult = await runInTempDir(async (runner, dir) => {
        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        return await terminal.runInit([
          projectName,
          '--template', template,
          '--mode', 'ci',
          '--no-interactive'
        ]);
      });
      const ciDuration = Date.now() - ciStart;

      // Both should succeed
      expect(tuiResult.exitCode).toBe(0);
      expect(ciResult.exitCode).toBe(0);

      // Performance assertions
      expect(tuiDuration).toBeLessThan(60000); // TUI within 60 seconds
      expect(ciDuration).toBeLessThan(30000); // CI within 30 seconds
      expect(tuiResult.duration).toBeLessThan(60000);
      expect(ciResult.duration).toBeLessThan(30000);

      console.log(`Performance: TUI=${tuiDuration}ms, CI=${ciDuration}ms`);
    }, 120000);
  });
});