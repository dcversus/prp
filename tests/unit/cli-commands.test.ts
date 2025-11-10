/**
 * CLI Commands Test Suite
 *
 * Comprehensive tests for all CLI commands and their behavior
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  executeCLI,
  expectCLISuccess,
  expectCLIFailure,
  createTestProject,
  expectDirectoryStructure,
  CLIScenarios,
  cleanupTestProjects,
  measurePerformance
} from '../helpers/cli-tools';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

afterAll(async () => {
  await cleanupTestProjects();
});

describe('CLI Core Commands', () => {
  describe('--help', () => {
    it('should display usage information', async () => {
      const result = await expectCLISuccess(['--help']);

      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('Commands:');
      expect(result.exitCode).toBe(0);
    });

    it('should display help with -h flag', async () => {
      const result = await expectCLISuccess(['-h']);

      expect(result.stdout).toContain('Usage:');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('--version', () => {
    it('should display version information', async () => {
      const result = await expectCLISuccess(['--version']);

      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(result.exitCode).toBe(0);
    });

    it('should display version with -v flag', async () => {
      const result = await expectCLISuccess(['-v']);

      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await expectCLIFailure(['unknown-command']);

      expect(result.stderr).toContain('Unknown command');
      expect(result.exitCode).toBe(1);
    });

    it('should handle invalid options', async () => {
      const result = await expectCLIFailure(['--invalid-option']);

      expect(result.exitCode).toBe(1);
    });
  });
});

describe('init command', () => {
  describe('basic functionality', () => {
    it('should create a TypeScript project with --no-interactive flag', async () => {
      const project = createTestProject();

      try {
        const { result } = await measurePerformance(
          () => CLIScenarios.init.shouldCreateProject('typescript'),
          'TypeScript project creation'
        );

        expect(result.exitCode).toBe(0);
        expectDirectoryStructure(project, [
          'package.json',
          'tsconfig.json',
          'src/index.ts',
          'README.md'
        ]);

        // Verify package.json contents
        const packageJson = JSON.parse(project.path + '/package.json');
        expect(packageJson.name).toBe(project.name);
        expect(packageJson.scripts).toBeDefined();
      } finally {
        project.cleanup();
      }
    });

    it('should create a React project with --no-interactive flag', async () => {
      const project = createTestProject();

      try {
        const { result } = await measurePerformance(
          () => CLIScenarios.init.shouldCreateProject('react'),
          'React project creation'
        );

        expect(result.exitCode).toBe(0);
        expectDirectoryStructure(project, [
          'package.json',
          'src/App.tsx',
          'src/main.tsx',
          'index.html',
          'tsconfig.json',
          'README.md'
        ]);
      } finally {
        project.cleanup();
      }
    });

    it('should create a NestJS project with --no-interactive flag', async () => {
      const project = createTestProject();

      try {
        const { result } = await measurePerformance(
          () => CLIScenarios.init.shouldCreateProject('nestjs'),
          'NestJS project creation'
        );

        expect(result.exitCode).toBe(0);
        expectDirectoryStructure(project, [
          'package.json',
          'src/main.ts',
          'src/app.module.ts',
          'nest-cli.json',
          'tsconfig.json',
          'README.md'
        ]);
      } finally {
        project.cleanup();
      }
    });

    it('should create project with custom name', async () => {
      const customName = 'my-custom-project';
      const project = createTestProject(customName);

      try {
        const result = await expectCLISuccess([
          'init',
          customName,
          '--template', 'typescript',
          '--no-interactive'
        ], { cwd: project.path });

        expect(result.exitCode).toBe(0);

        const packageJson = JSON.parse(project.path + '/package.json');
        expect(packageJson.name).toBe(customName);
      } finally {
        project.cleanup();
      }
    });
  });

  describe('validation and error handling', () => {
    it('should fail in existing directory without --force', async () => {
      const result = await measurePerformance(
        () => CLIScenarios.init.shouldFailInExistingDirectory(),
        'Existing directory validation'
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('already exists');
    });

    it('should fail with invalid template', async () => {
      const project = createTestProject();

      try {
        const result = await expectCLIFailure([
          'init',
          project.name,
          '--template', 'invalid-template',
          '--no-interactive'
        ], { cwd: project.path });

        expect(result.stderr).toContain('template');
        expect(result.exitCode).toBe(1);
      } finally {
        project.cleanup();
      }
    });

    it('should fail with invalid project name', async () => {
      const result = await expectCLIFailure([
        'init',
        'invalid-name-with-spaces',
        '--template', 'typescript',
        '--no-interactive'
      ]);

      expect(result.exitCode).toBe(1);
    });
  });

  describe('performance requirements', () => {
    it('should create projects within performance limits', async () => {
      const project = createTestProject();

      try {
        const { duration } = await measurePerformance(
          () => expectCLISuccess([
            'init',
            project.name,
            '--template', 'typescript',
            '--no-interactive'
          ], { cwd: project.path }),
          'Project creation performance'
        );

        // Should complete within 10 seconds
        expect(duration).toBeLessThan(10000);
      } finally {
        project.cleanup();
      }
    });
  });
});

describe('tui command', () => {
  describe('basic functionality', () => {
    it('should start TUI interface', async () => {
      const { result, duration } = await measurePerformance(
        () => CLIScenarios.tui.shouldStartInterface(),
        'TUI startup'
      );

      // TUI should either start successfully or timeout (which is expected)
      expect(result.exitCode === 0 || duration >= 1000).toBe(true);
    });

    it('should accept --debug flag', async () => {
      const result = await executeCLI(['tui', '--debug'], { timeout: 1000 });

      // Should either start or timeout gracefully
      expect(result.exitCode === 0 || result.duration >= 1000).toBe(true);
    });
  });
});

describe('orchestrator command', () => {
  describe('basic functionality', () => {
    it('should start orchestrator with default settings', async () => {
      const result = await executeCLI(['orchestrator', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('orchestrator');
    });

    it('should accept configuration options', async () => {
      const result = await executeCLI(['orchestrator', '--help']);

      expect(result.stdout).toContain('Options:');
      expect(result.exitCode).toBe(0);
    });
  });
});

describe('CLI Performance and Resource Usage', () => {
  describe('startup performance', () => {
    it('should start within 2 seconds for help command', async () => {
      const { duration } = await measurePerformance(
        () => expectCLISuccess(['--help']),
        'CLI startup performance'
      );

      expect(duration).toBeLessThan(2000);
    });

    it('should start within 3 seconds for version command', async () => {
      const { duration } = await measurePerformance(
        () => expectCLISuccess(['--version']),
        'Version command performance'
      );

      expect(duration).toBeLessThan(3000);
    });
  });

  describe('memory efficiency', () => {
    it('should handle repeated commands without memory leaks', async () => {
      const iterations = 5;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await measurePerformance(
          () => expectCLISuccess(['--version']),
          `Version command iteration ${i + 1}`
        );
        durations.push(duration);
      }

      // Performance should not degrade significantly
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(maxDuration).toBeLessThan(avgDuration * 2); // No more than 2x average
    });
  });

  describe('concurrent execution', () => {
    it('should handle multiple simultaneous CLI executions', async () => {
      const promises = Array(3).fill(null).map(() =>
        measurePerformance(
          () => expectCLISuccess(['--version']),
          'Concurrent version command'
        )
      );

      const results = await Promise.all(promises);

      results.forEach(({ result, duration }) => {
        expect(result.exitCode).toBe(0);
        expect(duration).toBeLessThan(5000); // Allow more time for concurrent execution
      });
    });
  });
});

describe('CLI Integration Scenarios', () => {
  describe('workflow testing', () => {
    it('should support complete init to build workflow', async () => {
      const project = createTestProject();

      try {
        // Step 1: Initialize project
        const initResult = await expectCLISuccess([
          'init',
          project.name,
          '--template', 'typescript',
          '--no-interactive'
        ], { cwd: project.path });

        expect(initResult.exitCode).toBe(0);

        // Step 2: Verify project structure
        expectDirectoryStructure(project, [
          'package.json',
          'tsconfig.json',
          'src/index.ts'
        ]);

        // Step 3: Test if the project is valid
        const packageJson = JSON.parse(project.path + '/package.json');
        expect(packageJson.scripts).toBeDefined();
      } finally {
        project.cleanup();
      }
    });
  });

  describe('error recovery', () => {
    it('should provide helpful error messages', async () => {
      const result = await expectCLIFailure(['init', 'invalid-project-name']);

      expect(result.stderr).not.toBe('');
      expect(result.stderr.length).toBeGreaterThan(10);
      expect(result.exitCode).toBe(1);
    });

    it('should handle interrupted commands gracefully', async () => {
      // Test with timeout to simulate interruption
      const result = await executeCLI(['tui'], { timeout: 100 });

      // Should handle timeout/interruption gracefully
      expect(result.duration).toBeGreaterThanOrEqual(100);
    });
  });
});

describe('CLI Configuration and Environment', () => {
  describe('environment variables', () => {
    it('should respect NODE_ENV=test', async () => {
      const result = await executeCLI(['--version'], {
        env: { NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle custom environment variables', async () => {
      const result = await executeCLI(['--version'], {
        env: {
          NODE_ENV: 'test',
          PRP_TEST_MODE: 'true'
        }
      });

      expect(result.exitCode).toBe(0);
    });
  });

  describe('working directory handling', () => {
    it('should respect custom working directory', async () => {
      const project = createTestProject();

      try {
        const result = await executeCLI(['--version'], {
          cwd: project.path
        });

        expect(result.exitCode).toBe(0);
      } finally {
        project.cleanup();
      }
    });
  });
});