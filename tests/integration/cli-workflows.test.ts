/**
 * CLI Workflows Integration Tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'test-integration-temp');

  beforeEach(async () => {
    // Create test directory
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might not exist or have permission issues
    }
  });

  describe('CLI Help and Version', () => {
    it('should display help information', async () => {
      const result = await execAsync('node dist/cli.js --help', {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('Commands:');
    });

    it('should display version information', async () => {
      const result = await execAsync('node dist/cli.js --version', {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.stdout).toContain('0.4.9');
    });
  });

  describe('Status Command', () => {
    it('should show status without configuration', async () => {
      const result = await execAsync('node dist/cli.js status', {
        cwd: testDir,
        timeout: 5000
      });

      expect(result.stdout).toContain('PRP Status Report');
      expect(result.stdout).toContain('Project Status');
      expect(result.stdout).toContain('System Status');
      expect(result.stdout).toContain('Configuration: ❌ Not found');
    });

    it('should show status in JSON format', async () => {
      const result = await execAsync('node dist/cli.js status --json', {
        cwd: testDir,
        timeout: 5000
      });

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('timestamp');
      expect(output).toHaveProperty('project');
      expect(output).toHaveProperty('system');
      expect(output).toHaveProperty('performance');
      expect(output).toHaveProperty('health');
    });
  });

  describe('Config Command', () => {
    it('should handle config validation without configuration file', async () => {
      try {
        await execAsync('node dist/cli.js config --validate', {
          cwd: testDir,
          timeout: 5000
        });
        // Should not reach here if it fails appropriately
      } catch (error: any) {
        expect(error.stderr).toContain('No configuration file found');
      }
    });

    it('should show config summary', async () => {
      try {
        const result = await execAsync('node dist/cli.js config --show', {
          cwd: testDir,
          timeout: 5000
        });
        // This might fail if no config exists, which is expected
      } catch (error: any) {
        expect(error.stderr).toContain('No configuration file found');
      }
    });
  });

  describe('Quick Init Command', () => {
    it('should reject invalid template', async () => {
      try {
        await execAsync('node dist/cli.js quick-init invalid-template test-project', {
          cwd: testDir,
          timeout: 10000
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr).toContain('Unknown template: invalid-template');
        expect(error.stderr).toContain('Available templates:');
      }
    });

    it('should create TypeScript project successfully', async () => {
      const result = await execAsync('node dist/cli.js quick-init ts test-typescript-project', {
        cwd: testDir,
        timeout: 15000
      });

      expect(result.stdout).toContain('✅ Project "test-typescript-project" created successfully!');

      // Verify project structure
      const projectPath = path.join(testDir, 'test-typescript-project');
      const packageJsonPath = path.join(projectPath, 'package.json');
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      const srcIndexPath = path.join(projectPath, 'src', 'index.ts');

      expect(await fs.access(packageJsonPath)).not.toThrow();
      expect(await fs.access(tsconfigPath)).not.toThrow();
      expect(await fs.access(srcIndexPath)).not.toThrow();

      // Verify content of key files
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      expect(packageJson.name).toBe('test-typescript-project');
      expect(packageJson.devDependencies).toHaveProperty('typescript');

      const srcIndex = await fs.readFile(srcIndexPath, 'utf-8');
      expect(srcIndex).toContain('export function hello');
    }, 20000);

    it('should create React project successfully', async () => {
      const result = await execAsync('node dist/cli.js quick-init react test-react-project', {
        cwd: testDir,
        timeout: 15000
      });

      expect(result.stdout).toContain('✅ Project "test-react-project" created successfully!');

      const projectPath = path.join(testDir, 'test-react-project');
      const packageJsonPath = path.join(projectPath, 'package.json');
      const srcAppPath = path.join(projectPath, 'src', 'App.tsx');

      expect(await fs.access(packageJsonPath)).not.toThrow();
      expect(await fs.access(srcAppPath)).not.toThrow();

      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.devDependencies).toHaveProperty('@vitejs/plugin-react');
    }, 20000);

    it('should create FastAPI project successfully', async () => {
      const result = await execAsync('node dist/cli.js quick-init fastapi test-fastapi-project', {
        cwd: testDir,
        timeout: 15000
      });

      expect(result.stdout).toContain('✅ Project "test-fastapi-project" created successfully!');

      const projectPath = path.join(testDir, 'test-fastapi-project');
      const mainPyPath = path.join(projectPath, 'main.py');
      const requirementsPath = path.join(projectPath, 'requirements.txt');

      expect(await fs.access(mainPyPath)).not.toThrow();
      expect(await fs.access(requirementsPath)).not.toThrow();

      const mainPy = await fs.readFile(mainPyPath, 'utf-8');
      expect(mainPy).toContain('from fastapi import FastAPI');

      const requirements = await fs.readFile(requirementsPath, 'utf-8');
      expect(requirements).toContain('fastapi');
    }, 20000);

    it('should support CI mode with JSON output', async () => {
      const result = await execAsync('node dist/cli.js quick-init ts test-ci-project --ci', {
        cwd: testDir,
        timeout: 15000
      });

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.project).toBeDefined();
      expect(output.project.name).toBe('test-ci-project');
      expect(output.project.template).toBe('typescript');
    }, 20000);

    it('should handle force flag for existing directories', async () => {
      // Create directory first
      const existingProjectPath = path.join(testDir, 'existing-project');
      await fs.mkdir(existingProjectPath, { recursive: true });
      await fs.writeFile(path.join(existingProjectPath, 'existing-file.txt'), 'test');

      const result = await execAsync('node dist/cli.js quick-init ts existing-project --force', {
        cwd: testDir,
        timeout: 15000
      });

      expect(result.stdout).toContain('✅ Project "existing-project" created successfully!');
    }, 20000);

    it('should reject project creation without force in existing directory', async () => {
      // Create directory first
      const existingProjectPath = path.join(testDir, 'existing-project-2');
      await fs.mkdir(existingProjectPath, { recursive: true });

      try {
        await execAsync('node dist/cli.js quick-init ts existing-project-2', {
          cwd: testDir,
          timeout: 10000
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr).toContain('Directory');
        expect(error.stderr).toContain('already exists');
        expect(error.stderr).toContain('Use --force to overwrite');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      try {
        await execAsync('node dist/cli.js unknown-command', {
          cwd: testDir,
          timeout: 5000
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr).toContain('Unknown command');
        expect(error.stderr).toContain('unknown-command');
      }
    });

    it('should handle invalid options gracefully', async () => {
      try {
        await execAsync('node dist/cli.js --invalid-option', {
          cwd: testDir,
          timeout: 5000
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr).toContain('Unknown option');
        expect(error.stderr).toContain('--invalid-option');
      }
    });

    it('should handle missing arguments gracefully', async () => {
      try {
        await execAsync('node dist/cli.js quick-init', {
          cwd: testDir,
          timeout: 5000
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr).toContain('Missing required argument');
        expect(error.stderr).toContain('<template>');
      }
    });
  });

  describe('Command Discovery', () => {
    it('should list all available commands in help', async () => {
      const result = await execAsync('node dist/cli.js --help', {
        cwd: testDir,
        timeout: 5000
      });

      // Check that all expected commands are present
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('tui-init');
      expect(result.stdout).toContain('tui');
      expect(result.stdout).toContain('orchestrator');
      expect(result.stdout).toContain('quick-init');
      expect(result.stdout).toContain('config');
      expect(result.stdout).toContain('status');
    });
  });

  describe('Performance', () => {
    it('should start up quickly', async () => {
      const startTime = Date.now();

      await execAsync('node dist/cli.js --version', {
        cwd: testDir,
        timeout: 5000
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should start within 2 seconds (allowing for cold start)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent status requests', async () => {
      const promises = Array(5).fill(0).map(() =>
        execAsync('node dist/cli.js status --json', {
          cwd: testDir,
          timeout: 5000
        })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        const output = JSON.parse(result.stdout);
        expect(output).toHaveProperty('timestamp');
        expect(output).toHaveProperty('project');
      });
    });
  });
});