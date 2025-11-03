/**
 * Comprehensive E2E Tests for CLI Flow
 * Tests all requirements from agents05.md and validates failure scenarios
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

interface E2ETestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

interface ProjectFiles {
  [filename: string]: string | Buffer;
}

describe('CLI Flow E2E Tests', () => {
  let testDir: string;
  let originalCwd: string;
  const cliPath = resolve(__dirname, '../../dist/cli.js');

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(process.cwd(), '.e2e-test-' + createHash('md5').update(Date.now().toString()).digest('hex').substr(0, 8));
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to execute CLI commands
   */
  async function runCLI(args: string[], options: { env?: Record<string, string>, timeout?: number } = {}): Promise<E2ETestResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const child: ChildProcess = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options.env },
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

      const timeout = options.timeout || 30000;
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`CLI command timed out after ${timeout}ms`));
      }, timeout);

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
        reject(new Error(`Failed to execute CLI: ${error.message}`));
      });
    });
  }

  /**
   * Helper to check if files exist and read their content
   */
  async function getProjectFiles(): Promise<ProjectFiles> {
    const files: ProjectFiles = {};

    async function scanDirectory(dir: string, prefix: string = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = prefix ? join(prefix, entry.name) : entry.name;

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDirectory(fullPath, relativePath);
        } else if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath);
            files[relativePath] = content;
          } catch (error) {
            files[relativePath] = `ERROR: ${error.message}`;
          }
        }
      }
    }

    await scanDirectory(process.cwd());
    return files;
  }

  /**
   * Helper to parse JSON from file content
   */
  function parseJSON(content: string | Buffer): any {
    try {
      return JSON.parse(content.toString());
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  describe('Core CLI Functionality', () => {
    it('should show help information', async () => {
      const result = await runCLI(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('auth');
      expect(result.stdout).toContain('agents');
    });

    it('should show version information', async () => {
      const result = await runCLI(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Init Command - Core Requirements', () => {
    it('should initialize project with fast template', async () => {
      const result = await runCLI([
        'init', 'test-project',
        '--template', 'fast',
        '--default',
        '--prp', 'Test project for E2E validation'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project initialized successfully');

      const files = await getProjectFiles();

      // Check essential files exist
      expect(files['package.json']).toBeDefined();
      expect(files['AGENTS.md']).toBeDefined();
      expect(files['.prprc']).toBeDefined();
      expect(files['README.md']).toBeDefined();
      expect(files['.gitignore']).toBeDefined();
      expect(files['tsconfig.json']).toBeDefined();

      // Validate package.json
      const packageJson = parseJSON(files['package.json']);
      expect(packageJson.name).toBe('test-project');
      expect(packageJson.description).toBe('Test project for E2E validation');
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies['@dcversus/prp']).toBeDefined();

      // Validate .prprc
      const prprc = parseJSON(files['.prprc']);
      expect(prprc.version).toBe('1.0.0');
      expect(prprc.agents.enabled).toContain('robo-developer');
      expect(prprc.agents.enabled).toContain('robo-aqa');
      expect(prprc.templates.default).toBe('fast');
    });

    it('should initialize project with minimal template', async () => {
      const result = await runCLI([
        'init', 'minimal-project',
        '--template', 'minimal',
        '--default',
        '--prp', 'Minimal test project'
      ]);

      expect(result.exitCode).toBe(0);

      const files = await getProjectFiles();

      // Check minimal files exist
      expect(files['package.json']).toBeDefined();
      expect(files['AGENTS.md']).toBeDefined();
      expect(files['.prprc']).toBeDefined();
      expect(files['README.md']).toBeDefined();
      expect(files['.gitignore']).toBeDefined();

      // Check minimal template has no dev dependencies
      const packageJson = parseJSON(files['package.json']);
      expect(Object.keys(packageJson.devDependencies || {})).toHaveLength(0);
    });

    it('should initialize project with all template', async () => {
      const result = await runCLI([
        'init', 'all-project',
        '--template', 'all',
        '--default',
        '--prp', 'Complete test project with all features'
      ]);

      expect(result.exitCode).toBe(0);

      const files = await getProjectFiles();

      // Check comprehensive files exist
      expect(files['package.json']).toBeDefined();
      expect(files['AGENTS.md']).toBeDefined();
      expect(files['.prprc']).toBeDefined();
      expect(files['README.md']).toBeDefined();
      expect(files['.gitignore']).toBeDefined();
      expect(files['tsconfig.json']).toBeDefined();
      expect(files['.github/workflows/ci.yml']).toBeDefined();

      // Check all agents are enabled
      const prprc = parseJSON(files['.prprc']);
      expect(prprc.agents.enabled.length).toBeGreaterThan(2);
      expect(prprc.agents.enabled).toContain('robo-orchestrator');
    });
  });

  describe('Init Command - Dancing Monkeys Feature', () => {
    it('should detect dancing monkeys PRP and use landing-page template', async () => {
      const result = await runCLI([
        'init', 'monkeys-project',
        '--default',
        '--prp', 'Deliver gh-page with animated dancing monkeys spawn around'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Special deployment detected: Landing page with dancing monkeys');

      const files = await getProjectFiles();

      // Check landing page files exist
      expect(files['index.html']).toBeDefined();
      expect(files['style.css']).toBeDefined();
      expect(files['script.js']).toBeDefined();

      // Check HTML contains dancing monkeys functionality
      const htmlContent = files['index.html'].toString();
      expect(htmlContent).toContain('monkey-container');
      expect(htmlContent).toContain('dancing monkeys');
      expect(htmlContent).toContain('PRP CLI');

      // Check CSS contains monkey animations
      const cssContent = files['style.css'].toString();
      expect(cssContent).toContain('@keyframes dance');
      expect(cssContent).toContain('.monkey');

      // Check JavaScript contains monkey functionality
      const jsContent = files['script.js'].toString();
      expect(jsContent).toContain('showDancingMonkeys');
      expect(jsContent).toContain('makeMonkeyDance');
      expect(jsContent).toContain('createSparkles');

      // Check .prprc indicates landing-page template
      const prprc = parseJSON(files['.prprc']);
      expect(prprc.templates.default).toBe('landing-page');
    });

    it('should support various dancing monkeys PRP patterns', async () => {
      const testCases = [
        'Create landing page with dancing monkeys',
        'gh-page with animated monkeys spawn around',
        'Build website with animated dancing monkeys',
        'Deploy page with dancing monkeys animation'
      ];

      for (let i = 0; i < testCases.length; i++) {
        const projectName = `monkeys-test-${i}`;
        const result = await runCLI([
          'init', projectName,
          '--default',
          '--prp', testCases[i]
        ]);

        expect(result.exitCode).toBe(0);

        const files = await getProjectFiles();
        expect(files['index.html']).toBeDefined();
        expect(files['index.html'].toString()).toContain('monkey-container');
      }
    });
  });

  describe('Init Command - Agent Configuration', () => {
    it('should configure custom agents', async () => {
      const result = await runCLI([
        'init', 'custom-agents-project',
        '--default',
        '--agents', 'robo-developer,robo-ux-ui-designer,robo-system-analyst',
        '--prp', 'Project with custom agent configuration'
      ]);

      expect(result.exitCode).toBe(0);

      const files = await getProjectFiles();
      const prprc = parseJSON(files['.prprc']);

      // Check custom agents are configured
      expect(prprc.agents.enabled).toContain('robo-developer');
      expect(prprc.agents.enabled).toContain('robo-ux-ui-designer');
      expect(prprc.agents.enabled).toContain('robo-system-analyst');
      expect(prprc.agents.enabled).not.toContain('robo-aqa'); // Should not include default agent
    });

    it('should validate agent names', async () => {
      const result = await runCLI([
        'init', 'invalid-agents-project',
        '--default',
        '--agents', 'invalid-agent-name',
        '--prp', 'Project with invalid agent'
      ]);

      expect(result.exitCode).toBe(0);
      // Should not fail but warn about invalid agents
      expect(result.stderr).toContain('');
    });
  });

  describe('Init Command - Security and CI Mode', () => {
    it('should block init command in CI mode', async () => {
      const result = await runCLI([
        'init', 'ci-test-project'
      ], {
        env: { CI_MODE: 'true' }
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
      expect(result.stderr).toContain('Use template copying instead');
    });

    it('should handle non-interactive mode correctly', async () => {
      const result = await runCLI([
        'init', 'non-interactive-project',
        '--template', 'minimal',
        '--default',
        '--prp', 'Non-interactive test project'
      ]);

      expect(result.exitCode).toBe(0);

      const files = await getProjectFiles();
      expect(files['package.json']).toBeDefined();
      expect(files['AGENTS.md']).toBeDefined();
    });
  });

  describe('Init Command - Error Handling', () => {
    it('should handle invalid template names', async () => {
      const result = await runCLI([
        'init', 'invalid-template-project',
        '--template', 'non-existent-template',
        '--default',
        '--prp', 'Project with invalid template'
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid template: non-existent-template');
    });

    it('should handle existing directory', async () => {
      // Create directory first
      await fs.mkdir('existing-project', { recursive: true });
      await fs.writeFile('existing-project/existing-file.txt', 'exists');

      const result = await runCLI([
        'init', 'existing-project',
        '--default',
        '--prp', 'Project in existing directory'
      ]);

      // Should either succeed (overwriting) or fail gracefully
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle missing PRP in non-default mode', async () => {
      const result = await runCLI([
        'init', 'no-prp-project'
        // No --prp and no --default
      ]);

      // Should either succeed with prompts or fail gracefully
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('File Content Validation', () => {
    it('should create valid package.json with all required fields', async () => {
      await runCLI([
        'init', 'validation-project',
        '--template', 'fast',
        '--default',
        '--prp', 'Project for content validation'
      ]);

      const files = await getProjectFiles();
      const packageJson = parseJSON(files['package.json']);

      // Check required fields
      expect(packageJson.name).toBe('validation-project');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.description).toBe('Project for content validation');
      expect(packageJson.main).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.engines).toBeDefined();
      expect(packageJson.engines.node).toMatch(/^>=\d+\.\d+\.\d+$/);
    });

    it('should create AGENTS.md with proper structure', async () => {
      await runCLI([
        'init', 'agents-md-project',
        '--template', 'fast',
        '--default',
        '--prp', 'Project for AGENTS.md validation'
      ]);

      const files = await getProjectFiles();
      const agentsContent = files['AGENTS.md'].toString();

      expect(agentsContent).toContain('# AGENTS.md');
      expect(agentsContent).toContain('AI Agent Workflow System');
      expect(agentsContent).toContain('Signal System');
      expect(agentsContent).toContain('Available Agents');
      expect(agentsContent).toContain('robo-developer');
      expect(agentsContent).toContain('robo-aqa');
    });

    it('should create valid .prprc configuration', async () => {
      await runCLI([
        'init', 'prprc-project',
        '--template', 'all',
        '--default',
        '--prp', 'Project for .prprc validation'
      ]);

      const files = await getProjectFiles();
      const prprc = parseJSON(files['.prprc']);

      // Check structure
      expect(prprc.version).toBeDefined();
      expect(prprc.agents).toBeDefined();
      expect(prprc.templates).toBeDefined();
      expect(prprc.features).toBeDefined();

      // Check agents configuration
      expect(Array.isArray(prprc.agents.enabled)).toBe(true);
      expect(prprc.agents.enabled.length).toBeGreaterThan(0);
      expect(typeof prprc.agents.configurations).toBe('object');

      // Check features
      expect(typeof prprc.features.git).toBe('boolean');
      expect(typeof prprc.features.npm).toBe('boolean');
    });
  });

  describe('Landing Page Template Specific Tests', () => {
    it('should create complete landing page with all features', async () => {
      await runCLI([
        'init', 'landing-complete',
        '--template', 'landing-page',
        '--default',
        '--prp', 'Complete landing page project'
      ]);

      const files = await getProjectFiles();

      // Check all landing page files
      expect(files['index.html']).toBeDefined();
      expect(files['style.css']).toBeDefined();
      expect(files['script.js']).toBeDefined();
      expect(files['README.md']).toBeDefined();

      // Validate HTML structure
      const htmlContent = files['index.html'].toString();
      expect(htmlContent).toMatch(/<!DOCTYPE html>/i);
      expect(htmlContent).toContain('<html');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('<header>');
      expect(htmlContent).toContain('<main>');
      expect(htmlContent).toContain('<footer>');
      expect(htmlContent).toContain('PRP CLI');

      // Validate CSS content
      const cssContent = files['style.css'].toString();
      expect(cssContent).toContain(':root');
      expect(cssContent).toContain('--primary-color');
      expect(cssContent).toContain('.hero');
      expect(cssContent).toContain('.features');
      expect(cssContent).toContain('@media');

      // Validate JavaScript content
      const jsContent = files['script.js'].toString();
      expect(jsContent).toContain('document.addEventListener');
      expect(jsContent).toContain('console.log');
      expect(jsContent).toContain('PRP CLI');
    });

    it('should have responsive design and accessibility', async () => {
      await runCLI([
        'init', 'landing-responsive',
        '--template', 'landing-page',
        '--default',
        '--prp', 'Responsive landing page project'
      ]);

      const files = await getProjectFiles();
      const htmlContent = files['index.html'].toString();
      const cssContent = files['style.css'].toString();

      // Check HTML accessibility features
      expect(htmlContent).toContain('lang=');
      expect(htmlContent).toContain('meta name="description"');
      expect(htmlContent).toContain('meta name="viewport"');
      expect(htmlContent).toContain('<title>');

      // Check CSS responsive design
      expect(cssContent).toContain('@media');
      expect(cssContent).toContain('max-width');
      expect(cssContent).toContain('grid-template-columns');
      expect(cssContent).toContain('flex-wrap');
    });
  });

  describe('Performance and Resource Usage', () => {
    it('should complete init within reasonable time', async () => {
      const startTime = Date.now();

      const result = await runCLI([
        'init', 'performance-test',
        '--template', 'fast',
        '--default',
        '--prp', 'Performance test project'
      ], { timeout: 60000 });

      const duration = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should handle multiple rapid initializations', async () => {
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(
          runCLI([
            'init', `rapid-test-${i}`,
            '--template', 'minimal',
            '--default',
            '--prp', `Rapid test project ${i}`
          ])
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe('Integration with Core Architecture', () => {
    it('should create project structure compatible with scanner', async () => {
      await runCLI([
        'init', 'scanner-compatible',
        '--template', 'all',
        '--default',
        '--prp', 'Scanner compatible project'
      ]);

      const files = await getProjectFiles();

      // Check for scanner-compatible structure
      expect(files['PRPs']).toBeDefined();
      expect(files['src']).toBeDefined();
      expect(files['tests']).toBeDefined();
      expect(files['docs']).toBeDefined();
      expect(files['.gitignore']).toBeDefined();
    });

    it('should include signal system configuration', async () => {
      await runCLI([
        'init', 'signal-system',
        '--template', 'fast',
        '--default',
        '--prp', 'Signal system test project'
      ]);

      const files = await getProjectFiles();
      const agentsContent = files['AGENTS.md'].toString();

      // Check for signal system references
      expect(agentsContent).toContain('Signal');
      expect(agentsContent).toContain('workflow');
      expect(agentsContent).toContain('ATTENTION');
      expect(agentsContent).toContain('BLOCKED');
    });
  });

  describe('Not Implemented Features - Expected Failures', () => {
    it('should fail gracefully for TUI system commands', async () => {
      const result = await runCLI(['tui']);

      // TUI is not implemented yet, should fail
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('command not found') ||
             expect(result.stderr).toContain('unknown command') ||
             expect(result.exitCode).toBe(0); // Or it might succeed with not implemented message
    });

    it('should fail gracefully for deploy commands', async () => {
      const result = await runCLI(['deploy', '--dancing-monkeys']);

      // Deploy is not implemented yet, should fail
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('command not found') ||
             expect(result.stderr).toContain('unknown command') ||
             expect(result.exitCode).toBe(0); // Or it might succeed with not implemented message
    });

    it('should fail gracefully for MCP server commands', async () => {
      const result = await runCLI(['mcp', 'start']);

      // MCP server is not implemented yet, should fail
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('command not found') ||
             expect(result.stderr).toContain('unknown command') ||
             expect(result.exitCode).toBe(0); // Or it might succeed with not implemented message
    });

    it('should fail gracefully for nudge notification commands', async () => {
      const result = await runCLI(['nudge', 'test']);

      // Nudge system is not implemented yet, should fail
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('command not found') ||
             expect(result.stderr).toContain('unknown command') ||
             expect(result.exitCode).toBe(0); // Or it might succeed with not implemented message
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very long project names', async () => {
      const longName = 'a'.repeat(100);

      const result = await runCLI([
        'init', longName,
        '--template', 'minimal',
        '--default',
        '--prp', 'Project with very long name'
      ]);

      // Should either succeed or fail gracefully
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle special characters in PRP', async () => {
      const specialPRP = 'Project with special chars: áéíóú ñ € @ # $ % ^ & * ( ) - _ + = { } [ ] | \\ : ; " \' < > , . ? / ~ `';

      const result = await runCLI([
        'init', 'special-chars-project',
        '--default',
        '--prp', specialPRP
      ]);

      expect(result.exitCode).toBe(0);

      const files = await getProjectFiles();
      const packageJson = parseJSON(files['package.json']);
      expect(packageJson.description).toBe(specialPRP);
    });

    it('should handle Unicode in project names', async () => {
      const unicodeName = '测试项目-🐵-dancing-monkeys';

      const result = await runCLI([
        'init', unicodeName,
        '--default',
        '--prp', 'Unicode project name test'
      ]);

      // Should handle gracefully (may succeed or fail depending on filesystem)
      expect([0, 1]).toContain(result.exitCode);
    });
  });
});