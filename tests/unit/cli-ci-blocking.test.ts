/**
 * CLI CI Mode Blocking Test
 *
 * Tests that init command is properly blocked in CI environments
 * This is a critical security and usability feature
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

interface TestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

describe('CLI CI Mode Security Tests', () => {
  let testDir: string;
  let originalCwd: string;
  const cliPath = resolve(__dirname, '../../dist/cli.js');

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(process.cwd(), '.test-ci-mode-' + createHash('md5').update(Date.now().toString()).digest('hex').substr(0, 8));
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Execute CLI command and capture output
   */
  async function runCLI(args: string[], env: Record<string, string> = {}): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const child: ChildProcess = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...env },
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('CLI command timed out'));
      }, 10000);

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          duration: Date.now() - startTime
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  describe('🚫 CI Mode Blocking Security', () => {
    it('should block init command in CI=true environment', async () => {
      const result = await runCLI(['init', 'test-project'], {
        CI: 'true'
      });

      // Critical security validation
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
      expect(result.stderr).toContain('Use template copying or existing project configuration instead');
      expect(result.stderr).toContain('init command is blocked in CI environments');
    });

    it('should block init command in CI_MODE=true environment', async () => {
      const result = await runCLI(['init', 'test-project'], {
        CI_MODE: 'true'
      });

      // Critical security validation
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
      expect(result.stderr).toContain('Use template copying or existing project configuration instead');
    });

    it('should block init command in CONTINUOUS_INTEGRATION=true environment', async () => {
      const result = await runCLI(['init', 'test-project'], {
        CONTINUOUS_INTEGRATION: 'true'
      });

      // Critical security validation
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
      expect(result.stderr).toContain('Use template copying or existing project configuration instead');
    });

    it('should allow init command in non-CI environment', async () => {
      const result = await runCLI([
        'init', 'test-project',
        '--template', 'minimal',
        '--yes',
        '--description', 'Test project for CI validation'
      ], {
        CI: 'false' // Explicitly set CI to false
      });

      // Should succeed in non-CI environment
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('initialized successfully');
      expect(result.stderr).not.toContain('ERROR: init command cannot be run in CI mode');
    });

    it('should allow init command when no CI variables are set', async () => {
      const result = await runCLI([
        'init', 'test-project',
        '--template', 'minimal',
        '--yes',
        '--description', 'Test project without CI environment'
      ]);

      // Should succeed when no CI environment is detected
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('initialized successfully');
      expect(result.stderr).not.toContain('ERROR: init command cannot be run in CI mode');
    });

    it('should handle multiple CI environment variables', async () => {
      const result = await runCLI(['init', 'test-project'], {
        CI: 'true',
        CI_MODE: 'true',
        CONTINUOUS_INTEGRATION: 'true'
      });

      // Should still block even with multiple CI variables
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
    });

    it('should block init with CI environment regardless of flags', async () => {
      // Tests that environment variable detection works even with other flags
      const result = await runCLI(['init', 'test-project', '--yes'], {
        CI: 'true'
      });

      // Should block with CI environment
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
    });
  });

  describe('🔍 Edge Cases and Error Handling', () => {
    it('should handle CI=false as non-CI environment', async () => {
      const result = await runCLI(['init', 'test-project', '--yes', '--template', 'minimal'], {
        CI: 'false'
      });

      // Should succeed when CI is explicitly false
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('initialized successfully');
    });

    it('should handle empty CI environment variable', async () => {
      const result = await runCLI(['init', 'test-project', '--yes', '--template', 'minimal'], {
        CI: ''
      });

      // Should succeed when CI is empty string
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('initialized successfully');
    });

    it('should handle CI=0 as non-CI environment', async () => {
      const result = await runCLI(['init', 'test-project', '--yes', '--template', 'minimal'], {
        CI: '0'
      });

      // Should succeed when CI is '0'
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('initialized successfully');
    });

    it('should handle CI=no as non-CI environment', async () => {
      const result = await runCLI(['init', 'test-project', '--yes', '--template', 'minimal'], {
        CI: 'no'
      });

      // Should succeed when CI is 'no'
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('initialized successfully');
    });
  });

  describe('⚡ Performance and Timing', () => {
    it('should fail quickly in CI mode', async () => {
      const startTime = Date.now();

      const result = await runCLI(['init', 'test-project'], {
        CI: 'true'
      });

      const duration = Date.now() - startTime;

      // Should fail quickly (within 2 seconds)
      expect(result.exitCode).toBe(1);
      expect(duration).toBeLessThan(2000);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
    });
  });

  describe('🔐 Security Validation', () => {
    it('should not create any files when blocked in CI mode', async () => {
      await runCLI(['init', 'test-project'], {
        CI: 'true'
      });

      // Verify no files were created
      const files = await fs.readdir('.').catch(() => []);
      expect(files.length).toBe(0);
    });

    it('should not modify existing files when blocked in CI mode', async () => {
      // Create an existing file
      await fs.writeFile('existing.txt', 'original content');

      await runCLI(['init', 'test-project'], {
        CI: 'true'
      });

      // Verify existing file is unchanged
      const content = await fs.readFile('existing.txt', 'utf8');
      expect(content).toBe('original content');
    });
  });
});