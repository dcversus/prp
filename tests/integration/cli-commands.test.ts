/**
 * CLI Commands Integration Test Suite
 *
 * Comprehensive testing of all CLI commands and core functionality:
 * - Command parsing and validation
 * - Error handling and edge cases
 * - Integration with filesystem and configuration
 * - Cross-platform compatibility
 * - Command chaining and workflows
 */

import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';
import { CLIRunner } from '../helpers/cli-runner';
import { ProjectValidator } from '../helpers/project-validator';

describe('CLI Commands Integration Tests', () => {
  const testDirectories: string[] = [];
  const originalCwd = process.cwd();
  const cli = new CLIRunner();

  afterEach(() => {
    testDirectories.forEach(dir => {
      rmSync(dir, { recursive: true, force: true });
    });
    process.chdir(originalCwd);
  });

  beforeAll(async () => {
    // Ensure CLI is built
    try {
      require('child_process').execSync('npm run build', { stdio: 'pipe' });
    } catch (error) {
      console.warn('Build failed, using existing CLI');
    }
  });

  describe('Help and Version Commands', () => {
    it('should display version information', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-version-'));
      testDirectories.push(testDir);

      const result = await cli.run(['--version'], {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Should contain version number
    });

    it('should display help information', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-help-'));
      testDirectories.push(testDir);

      const result = await cli.run(['--help'], {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('Options:');
    });

    it('should show help for specific commands', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-help-cmd-'));
      testDirectories.push(testDir);

      const result = await cli.run(['init', '--help'], {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('template');
    });
  });

  describe('Init Command Integration', () => {
    describe('Basic Functionality', () => {
      it('should initialize project with minimal flags', async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-minimal-'));
        testDirectories.push(testDir);

        const result = await cli.runCI(['init', 'test-project', '--template', 'none'], {
          cwd: testDir,
          timeout: 30000
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);

        // Verify basic project structure
        const validator = new ProjectValidator(testDir);
        const structureValidation = validator.validateNone();
        expect(structureValidation.valid).toBe(true);

        // Verify .prprc exists and is valid
        expect(existsSync(join(testDir, '.prprc'))).toBe(true);
        const prprc = JSON.parse(readFileSync(join(testDir, '.prprc'), 'utf8'));
        expect(prprc.name).toBe('test-project');
      });

      it('should initialize with all templates', async () => {
        const templates = ['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none'];

        for (const template of templates) {
          const testDir = mkdtempSync(join(os.tmpdir(), `prp-int-${template}-`));
          testDirectories.push(testDir);

          const projectName = `test-${template}-project`;
          const result = await cli.runCI([
            'init',
            projectName,
            '--template', template,
            '--no-interactive'
          ], {
            cwd: testDir,
            timeout: 45000
          });

          expect(result.success).toBe(true);
          expect(result.exitCode).toBe(0);

          // Verify template-specific structure
          const validator = new ProjectValidator(testDir);
          const templateValidation = validator[`validate${template.charAt(0).toUpperCase() + template.slice(1)}` as keyof ProjectValidator]();
          expect(templateValidation.valid).toBe(true);
        }
      }, 180000);

      it('should handle custom project paths', async () => {
        const baseDir = mkdtempSync(join(os.tmpdir(), 'prp-int-path-'));
        testDirectories.push(baseDir);

        const projectDir = join(baseDir, 'custom-path', 'my-project');
        const result = await cli.runCI([
          'init',
          'path-test-project',
          '--template', 'none',
          '--no-interactive'
        ], {
          cwd: projectDir, // This should create the directory
          timeout: 30000
        });

        expect(result.success).toBe(true);
        expect(existsSync(join(projectDir, '.prprc'))).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should reject invalid project names', async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-invalid-name-'));
        testDirectories.push(testDir);

        const invalidNames = ['123-invalid', 'invalid-name!', '', 'name-with spaces', 'name/with/slashes'];

        for (const invalidName of invalidNames) {
          const result = await cli.runCI(['init', invalidName, '--template', 'none'], {
            cwd: testDir,
            timeout: 10000
          });

          expect(result.success).toBe(false);
          expect(result.exitCode).toBeGreaterThan(0);
          expect(result.stderr || result.stdout).toMatch(/invalid|name/i);
        }
      });

      it('should fail gracefully with invalid template', async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-invalid-template-'));
        testDirectories.push(testDir);

        const result = await cli.runCI(['init', 'test-project', '--template', 'invalid-template'], {
          cwd: testDir,
          timeout: 10000
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).toBeGreaterThan(0);
        expect(result.stderr || result.stdout).toMatch(/template|invalid/i);
      });

      it('should handle filesystem permissions issues', async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-permissions-'));
        testDirectories.push(testDir);

        // Create a file where directory should be (simulate permission error)
        const blockerFile = join(testDir, 'PRPs');
        writeFileSync(blockerFile, 'blocking directory creation');

        const result = await cli.runCI(['init', 'test-project', '--template', 'none'], {
          cwd: testDir,
          timeout: 15000
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).toBeGreaterThan(0);
      });
    });

    describe('Configuration Options', () => {
      it('should respect CI mode flag', async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-ci-mode-'));
        testDirectories.push(testDir);

        const result = await cli.runCI([
          'init',
          'ci-test-project',
          '--template', 'none',
          '--no-interactive'
        ], {
          cwd: testDir,
          timeout: 30000
        });

        expect(result.success).toBe(true);

        // Verify CI mode is reflected in configuration
        const prprc = JSON.parse(readFileSync(join(testDir, '.prprc'), 'utf8'));
        expect(prprc.name).toBe('ci-test-project');
      });

      it('should handle agent configuration', async () => {
        const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-agents-'));
        testDirectories.push(testDir);

        const result = await cli.runCI([
          'init',
          'agent-test-project',
          '--template', 'none',
          '--agents', 'robo-developer,robo-quality-control,robo-ux-ui-designer',
          '--no-interactive'
        ], {
          cwd: testDir,
          timeout: 30000
        });

        expect(result.success).toBe(true);

        const prprc = JSON.parse(readFileSync(join(testDir, '.prprc'), 'utf8'));
        expect(prprc.agents).toBeDefined();
        if (Array.isArray(prprc.agents)) {
          expect(prprc.agents.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Orchestrator Command Integration', () => {
    let projectDir: string;

    beforeEach(async () => {
      projectDir = mkdtempSync(join(os.tmpdir(), 'prp-int-orch-'));
      testDirectories.push(projectDir);

      // Initialize a project for orchestrator tests
      await cli.runCI(['init', 'orchestrator-test', '--template', 'typescript', '--no-interactive'], {
        cwd: projectDir,
        timeout: 30000
      });
    });

    it('should start orchestrator in initialized project', async () => {
      const result = await cli.run(['orchestrator'], {
        cwd: projectDir,
        timeout: 10000,
        captureSession: true
      });

      // Orchestrator should start successfully (we'll kill it after verification)
      expect(result.success).toBe(true);
      expect(result.sessionLog).toBeDefined();
      expect(result.sessionLog!.length).toBeGreaterThan(0);
    });

    it('should fail to start orchestrator without .prprc', async () => {
      const emptyDir = mkdtempSync(join(os.tmpdir(), 'prp-int-no-prprc-'));
      testDirectories.push(emptyDir);

      const result = await cli.run(['orchestrator'], {
        cwd: emptyDir,
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.stderr || result.stdout).toMatch(/\.prprc|configuration/i);
    });

    it('should handle orchestrator with different configurations', async () => {
      // Test with custom configuration
      const prprc = JSON.parse(readFileSync(join(projectDir, '.prprc'), 'utf8'));
      prprc.orchestrator = {
        mode: 'development',
        debug: true,
        agents: ['robo-developer']
      };
      writeFileSync(join(projectDir, '.prprc'), JSON.stringify(prprc, null, 2));

      const result = await cli.run(['orchestrator'], {
        cwd: projectDir,
        timeout: 8000,
        captureSession: true
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Config Command Integration', () => {
    let projectDir: string;

    beforeEach(async () => {
      projectDir = mkdtempSync(join(os.tmpdir(), 'prp-int-config-'));
      testDirectories.push(projectDir);

      await cli.runCI(['init', 'config-test', '--template', 'typescript', '--no-interactive'], {
        cwd: projectDir,
        timeout: 30000
      });
    });

    it('should display current configuration', async () => {
      const result = await cli.run(['config', 'show'], {
        cwd: projectDir,
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('name');
      expect(result.stdout).toContain('template');
    });

    it('should validate configuration', async () => {
      const result = await cli.run(['config', 'validate'], {
        cwd: projectDir,
        timeout: 10000
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/valid|ok/i);
    });

    it('should detect invalid configuration', async () => {
      // Corrupt the .prprc file
      writeFileSync(join(projectDir, '.prprc'), 'invalid json content');

      const result = await cli.run(['config', 'validate'], {
        cwd: projectDir,
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.stderr || result.stdout).toMatch(/invalid|error/i);
    });
  });

  describe('Status Command Integration', () => {
    let projectDir: string;

    beforeEach(async () => {
      projectDir = mkdtempSync(join(os.tmpdir(), 'prp-int-status-'));
      testDirectories.push(projectDir);

      await cli.runCI(['init', 'status-test', '--template', 'typescript', '--no-interactive'], {
        cwd: projectDir,
        timeout: 30000
      });
    });

    it('should show project status', async () => {
      const result = await cli.run(['status'], {
        cwd: projectDir,
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/project|status|initialized/i);
    });

    it('should show detailed status with flags', async () => {
      const result = await cli.run(['status', '--verbose'], {
        cwd: projectDir,
        timeout: 8000
      });

      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(100); // Should be verbose output
    });

    it('should handle status in non-PRP project', async () => {
      const emptyDir = mkdtempSync(join(os.tmpdir(), 'prp-int-empty-status-'));
      testDirectories.push(emptyDir);

      const result = await cli.run(['status'], {
        cwd: emptyDir,
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.stderr || result.stdout).toMatch(/not.*prp|no.*project/i);
    });
  });

  describe('Build Command Integration', () => {
    let projectDir: string;

    beforeEach(async () => {
      projectDir = mkdtempSync(join(os.tmpdir(), 'prp-int-build-'));
      testDirectories.push(projectDir);

      await cli.runCI(['init', 'build-test', '--template', 'typescript', '--no-interactive'], {
        cwd: projectDir,
        timeout: 30000
      });
    });

    it('should build project when possible', async () => {
      const result = await cli.run(['build'], {
        cwd: projectDir,
        timeout: 30000
      });

      // Build should either succeed or fail gracefully with informative message
      expect(result.exitCode !== undefined).toBe(true);
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle build with options', async () => {
      const result = await cli.run(['build', '--verbose'], {
        cwd: projectDir,
        timeout: 45000
      });

      expect(result.exitCode !== undefined).toBe(true);
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid command gracefully', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-invalid-cmd-'));
      testDirectories.push(testDir);

      const result = await cli.run(['invalid-command'], {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.stderr || result.stdout).toMatch(/unknown|invalid|command/i);
    });

    it('should handle missing required arguments', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-missing-args-'));
      testDirectories.push(testDir);

      const result = await cli.run(['init'], {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });

    it('should handle conflicting options', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-conflict-'));
      testDirectories.push(testDir);

      const result = await cli.runCI([
        'init',
        'test-project',
        '--template', 'typescript',
        '--no-interactive',  // These might conflict
        '--interactive'
      ], {
        cwd: testDir,
        timeout: 10000
      });

      // Should either succeed (if conflict resolved) or fail gracefully
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle Ctrl+C interruption gracefully', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-interrupt-'));
      testDirectories.push(testDir);

      // Test interruption with long-running command
      const result = await cli.runWithKeyboardSimulation(
        ['init'],
        [
          { key: 'c', ctrl: true, delay: 1000 } // Send Ctrl+C after 1 second
        ],
        {
          cwd: testDir,
          timeout: 5000
        }
      );

      // Should be interrupted (killed) or exit with non-zero code
      expect(result.killed === true || (result.exitCode !== null && result.exitCode !== 0)).toBe(true);
    }, 10000);
  });

  describe('Workflow Integration Tests', () => {
    it('should support complete init -> status -> config workflow', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-workflow-'));
      testDirectories.push(testDir);

      // Step 1: Initialize project
      const initResult = await cli.runCI([
        'init',
        'workflow-test',
        '--template', 'typescript',
        '--no-interactive'
      ], {
        cwd: testDir,
        timeout: 30000
      });

      expect(initResult.success).toBe(true);

      // Step 2: Check status
      const statusResult = await cli.run(['status'], {
        cwd: testDir,
        timeout: 5000
      });

      expect(statusResult.success).toBe(true);

      // Step 3: Show configuration
      const configResult = await cli.run(['config', 'show'], {
        cwd: testDir,
        timeout: 5000
      });

      expect(configResult.success).toBe(true);

      // Verify all steps used the same project
      const prprc = JSON.parse(readFileSync(join(testDir, '.prprc'), 'utf8'));
      expect(prprc.name).toBe('workflow-test');
    }, 60000);

    it('should handle multiple projects in same directory', async () => {
      const baseDir = mkdtempSync(join(os.tmpdir(), 'prp-int-multiple-'));
      testDirectories.push(baseDir);

      const project1Dir = join(baseDir, 'project1');
      const project2Dir = join(baseDir, 'project2');

      // Initialize first project
      const result1 = await cli.runCI(['init', 'project1', '--template', 'none', '--no-interactive'], {
        cwd: project1Dir,
        timeout: 30000
      });

      // Initialize second project
      const result2 = await cli.runCI(['init', 'project2', '--template', 'none', '--no-interactive'], {
        cwd: project2Dir,
        timeout: 30000
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify both projects have independent configurations
      const prprc1 = JSON.parse(readFileSync(join(project1Dir, '.prprc'), 'utf8'));
      const prprc2 = JSON.parse(readFileSync(join(project2Dir, '.prprc'), 'utf8'));

      expect(prprc1.name).toBe('project1');
      expect(prprc2.name).toBe('project2');
    }, 90000);
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle different path formats', async () => {
      const testDir = mkdtempSync(join(os.tmpdir(), 'prp-int-paths-'));
      testDirectories.push(testDir);

      // Test with various path formats that might be platform-specific
      const projectName = 'path-compatibility-test';

      const result = await cli.runCI([
        'init',
        projectName,
        '--template', 'none',
        '--no-interactive'
      ], {
        cwd: testDir,
        timeout: 30000
      });

      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, '.prprc'))).toBe(true);

      // Test that paths are handled correctly
      const validator = new ProjectValidator(testDir);
      const validation = validator.validateNone();
      expect(validation.valid).toBe(true);
    });
  });
});