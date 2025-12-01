/**
 * CLI Testing Utilities
 *
 * Helper functions for testing CLI commands and their behavior
 */

import { spawn } from 'child_process';
import { existsSync, statSync, readFileSync, rmSync, promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface CLIExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  args: string[];
  duration: number;
}

export interface TestProject {
  name: string;
  path: string;
  cleanup: () => void;
}

/**
 * Create a temporary test project directory
 */
export function createTestProject(name?: string): TestProject {
  const projectName = name || `test-prp-${randomUUID().substring(0, 8)}`;
  const projectPath = join(tmpdir(), projectName);

  // Ensure directory doesn't exist
  if (existsSync(projectPath)) {
    rmSync(projectPath, { recursive: true, force: true });
  }

  return {
    name: projectName,
    path: projectPath,
    cleanup: () => {
      if (existsSync(projectPath)) {
        rmSync(projectPath, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Execute CLI command with options
 */
export async function executeCLI(
  args: string[] = [],
  options: {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
    input?: string;
  } = {}
): Promise<CLIExecutionResult> {
  const startTime = Date.now();
  const { cwd = process.cwd(), timeout = 30000, env = {}, input } = options;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isResolved = false;

    const child = spawn('node', [join(process.cwd(), 'dist', 'cli.mjs'), ...args], {
      cwd,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...env,
      },
      stdio: 'pipe',
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        child.kill('SIGTERM');
        resolve({
          stdout,
          stderr: `Command timed out after ${timeout}ms`,
          exitCode: 124,
          command: `node ${join(process.cwd(), 'dist', 'cli.mjs')}`,
          args,
          duration: Date.now() - startTime,
        });
      }
    }, timeout);

    // Collect stdout
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    // Collect stderr
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    // Handle input
    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

    // Handle process completion
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      if (!isResolved) {
        isResolved = true;
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          command: `node ${join(process.cwd(), 'dist', 'cli.mjs')}`,
          args,
          duration: Date.now() - startTime,
        });
      }
    });

    // Handle errors
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      if (!isResolved) {
        isResolved = true;
        resolve({
          stdout,
          stderr: error.message,
          exitCode: 1,
          command: `node ${join(process.cwd(), 'dist', 'cli.mjs')}`,
          args,
          duration: Date.now() - startTime,
        });
      }
    });
  });
}

/**
 * Execute CLI command and expect success
 */
export async function expectCLISuccess(
  args: string[],
  options?: Parameters<typeof executeCLI>[1]
): Promise<CLIExecutionResult> {
  const result = await executeCLI(args, options);

  if (result.exitCode !== 0) {
    throw new Error(`CLI command failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  return result;
}

/**
 * Execute CLI command and expect failure
 */
export async function expectCLIFailure(
  args: string[],
  options?: Parameters<typeof executeCLI>[1]
): Promise<CLIExecutionResult> {
  const result = await executeCLI(args, options);

  if (result.exitCode === 0) {
    throw new Error(`CLI command unexpectedly succeeded: ${result.stdout}`);
  }

  return result;
}

/**
 * Check if file exists in project
 */
export function fileExists(project: TestProject, relativePath: string): boolean {
  return existsSync(join(project.path, relativePath));
}

/**
 * Read file content from project
 */
export function readFile(project: TestProject, relativePath: string): string {
  return readFileSync(join(project.path, relativePath), 'utf8');
}

/**
 * Check if directory structure matches expected pattern
 */
export function expectDirectoryStructure(project: TestProject, expectedPaths: string[]): void {
  const missingPaths = expectedPaths.filter((path) => !fileExists(project, path));

  if (missingPaths.length > 0) {
    throw new Error(`Missing expected files/directories: ${missingPaths.join(', ')}`);
  }
}

/**
 * Get file stats for verification
 */
export function getFileStats(project: TestProject, relativePath: string) {
  const fullPath = join(project.path, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`File does not exist: ${relativePath}`);
  }
  return statSync(fullPath);
}

/**
 * Mock user input for interactive commands
 */
export function createMockInput(inputs: string[]): string {
  return `${inputs.join('\n')  }\n`;
}

/**
 * Wait for a file to be created (with timeout)
 */
export async function waitForFile(
  project: TestProject,
  relativePath: string,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();
  const fullPath = join(project.path, relativePath);

  while (Date.now() - startTime < timeout) {
    if (existsSync(fullPath)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`File not created within timeout: ${relativePath}`);
}

/**
 * CLI Test Scenarios
 */
export const CLIScenarios = {
  // Basic help scenarios
  help: {
    shouldShowUsage: async () => {
      const result = await expectCLISuccess(['--help']);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Options:');
      return result;
    },
  },

  // Version scenarios
  version: {
    shouldShowVersion: async () => {
      const result = await expectCLISuccess(['--version']);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      return result;
    },
  },

  // Init command scenarios
  init: {
    shouldCreateProject: async (template = 'typescript') => {
      const project = createTestProject();
      try {
        const result = await expectCLISuccess(
          ['init', project.name, '--template', template, '--no-interactive'],
          { cwd: tmpdir() }
        );

        expectDirectoryStructure(project, [
          'package.json',
          'tsconfig.json',
          'src/index.ts',
          'README.md',
        ]);

        return { project, result };
      } catch (error) {
        project.cleanup();
        throw error;
      }
    },

    shouldFailInExistingDirectory: async () => {
      const project = createTestProject();
      try {
        // Create a file to make directory non-empty
        const fs = require('fs');
        fs.writeFileSync(join(project.path, 'existing.txt'), 'test');

        const result = await expectCLIFailure(
          ['init', '.', '--template', 'typescript', '--no-interactive'],
          { cwd: project.path }
        );

        expect(result.stderr).toContain('already exists');
        return result;
      } finally {
        project.cleanup();
      }
    },
  },

  // TUI scenarios
  tui: {
    shouldStartInterface: async () => {
      const result = await executeCLI(['tui'], { timeout: 1000 });
      // Should either start successfully or timeout (which is expected for TUI)
      expect(result.exitCode === 0 || result.duration >= 1000).toBe(true);
      return result;
    },
  },
};

/**
 * Performance monitoring utilities
 */
export function measurePerformance<T>(
  fn: () => Promise<T> | T,
  label: string
): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve) => {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      console.log(`⏱️  ${label}: ${duration}ms`);
      resolve({ result, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${label}: Failed after ${duration}ms`);
      throw error;
    }
  });
}

/**
 * Cleanup utilities
 */
export async function cleanupTestProjects(): Promise<void> {
  const testDir = tmpdir();

  try {
    const files = await fs.readdir(testDir);
    const testProjects = files.filter((file) => file.startsWith('test-prp-'));

    for (const project of testProjects) {
      const projectPath = join(testDir, project);
      try {
        await fs.rm(projectPath, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup ${projectPath}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to list test directory:', error);
  }
}
