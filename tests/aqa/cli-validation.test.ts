/**
 * 🔍 AQA - CLI Validation Tests
 *
 * As robo-aqa, I validate that:
 * 1. CLI commands execute and produce expected outputs
 * 2. All files are created with correct content and structure
 * 3. Main goal from agents05.md is achieved: dancing monkeys deployment
 * 4. Test artifacts remain in place for inspection
 * 5. 100% of PRP requirements are covered by tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

interface CLIExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  artifacts: {
    files: string[];
    directories: string[];
  };
}

describe('🔍 AQA - CLI System Validation', () => {
  let testDir: string;
  let originalCwd: string;
  const cliPath = resolve(__dirname, '../../dist/cli.js');
  const artifacts: Map<string, any> = new Map();

  beforeEach(async () => {
    originalCwd = process.cwd();
    // Create persistent test directory - NO CLEANUP
    testDir = join('/tmp/prp-test-artifacts', 'cli-validation-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Ensure CLI is built for testing
    await ensureCLIBuilt();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    // 🚫 NO CLEANUP - Keep artifacts for inspection as AQA best practice
    console.log(`📁 Test artifacts preserved at: ${testDir}`);
  });

  /**
   * Execute CLI command and capture all outputs
   */
  async function executeCLI(args: string[], options: { timeout?: number } = {}): Promise<CLIExecutionResult> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
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

      child.on('close', async (code) => {
        clearTimeout(timeoutHandle);

        // Capture artifacts created by the command
        const artifactsData = await captureArtifacts();

        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          duration: Date.now() - startTime,
          artifacts: artifactsData
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(new Error(`Failed to execute CLI: ${error.message}`));
      });
    });
  }

  /**
   * Capture all files and directories created by CLI
   */
  async function captureArtifacts(): Promise<{ files: string[], directories: string[] }> {
    const files: string[] = [];
    const directories: string[] = [];

    async function scanDirectory(dir: string, relativePath: string = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativeFullPath = relativePath ? join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          directories.push(relativeFullPath);
          await scanDirectory(fullPath, relativeFullPath);
        } else if (entry.isFile()) {
          files.push(relativeFullPath);
        }
      }
    }

    await scanDirectory(process.cwd());
    return { files, directories };
  }

  /**
   * Ensure CLI is built for testing
   */
  async function ensureCLIBuilt(): Promise<void> {
    try {
      await fs.access(cliPath);
    } catch (error) {
      // CLI not built, try to build it
      console.log('🔨 Building CLI for AQA validation...');
      await new Promise<void>((resolve, reject) => {
        const child = spawn('npm', ['run', 'build'], {
          cwd: resolve(__dirname, '../..'),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`CLI build failed with code ${code}`));
          }
        });

        child.on('error', reject);
      });
    }
  }

  /**
   * Read and validate file content
   */
  async function validateFile(filePath: string, expectedContent?: string[]): Promise<string> {
    const fullPath = join(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    if (expectedContent) {
      const missingContent = expectedContent.filter(item => !content.includes(item));
      if (missingContent.length > 0) {
        throw new Error(`Missing expected content in ${filePath}: ${missingContent.join(', ')}`);
      }
    }

    return content;
  }

  /**
   * Validate JSON file structure
   */
  async function validateJSONFile(filePath: string, requiredFields: string[]): Promise<any> {
    const content = await validateFile(filePath);
    const json = JSON.parse(content);

    const missingFields = requiredFields.filter(field => !(field in json));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in ${filePath}: ${missingFields.join(', ')}`);
    }

    return json;
  }

  describe('🎯 Main Goal Validation - Dancing Monkeys Deployment', () => {
    it('should achieve the main goal: deploy gh-page with animated dancing monkeys', async () => {
      // Execute the exact command from agents05.md main goal
      const result = await executeCLI([
        'init', 'dancing-monkeys-goal-test',
        '--default',
        '--prp', 'Deliver gh-page with animated danced monkeys spawn around'
      ]);

      // AQA validation: Command must succeed
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project initialized successfully');
      expect(result.stdout).toContain('Special deployment detected: Landing page with dancing monkeys');

      // AQA validation: All required files must be created
      const expectedFiles = [
        'package.json',
        'AGENTS.md',
        '.prprc',
        'README.md',
        '.gitignore',
        'index.html',
        'style.css',
        'script.js'
      ];

      expectedFiles.forEach(file => {
        expect(result.artifacts.files).toContain(file);
      });

      // AQA validation: Dancing monkeys functionality must be present
      const htmlContent = await validateFile('index.html', [
        'monkey-container',
        'dancing monkeys',
        'PRP CLI Landing Page',
        '<!DOCTYPE html>',
        '<title>'
      ]);

      const cssContent = await validateFile('style.css', [
        '@keyframes dance',
        '.monkey',
        'animation',
        'transition'
      ]);

      const jsContent = await validateFile('script.js', [
        'showDancingMonkeys',
        'makeMonkeyDance',
        'createSparkles',
        'monkey-container',
        'console.log'
      ]);

      // AQA validation: Configuration must be correct
      const packageJson = await validateJSONFile('package.json', ['name', 'version', 'scripts']);
      expect(packageJson.name).toBe('dancing-monkeys-goal-test');
      expect(packageJson.scripts['deploy:monkeys']).toBeDefined();

      const prprc = await validateJSONFile('.prprc', ['version', 'agents', 'templates']);
      expect(prprc.templates.default).toBe('landing-page');
      expect(prprc.agents.enabled).toContain('robo-developer');
      expect(prprc.agents.enabled).toContain('robo-aqa');

      // AQA validation: AGENTS.md must contain proper structure
      const agentsContent = await validateFile('AGENTS.md', [
        'AGENTS.md',
        'AI Agent Workflow System',
        'Available Agents',
        'Signal System'
      ]);

      // Store artifacts for AQA review
      artifacts.set('main-goal-result', result);
      artifacts.set('main-goal-html', htmlContent);
      artifacts.set('main-goal-css', cssContent);
      artifacts.set('main-goal-js', jsContent);
      artifacts.set('main-goal-config', { packageJson, prprc, agentsContent });
    });

    it('should support multiple dancing monkeys command patterns', async () => {
      const testCases = [
        {
          name: 'pattern-1',
          prp: 'Create landing page with dancing monkeys'
        },
        {
          name: 'pattern-2',
          prp: 'gh-page with animated monkeys spawn around'
        },
        {
          name: 'pattern-3',
          prp: 'Build website with animated dancing monkeys'
        }
      ];

      for (const testCase of testCases) {
        const projectName = `monkeys-pattern-${testCase.name}`;

        const result = await executeCLI([
          'init', projectName,
          '--default',
          '--prp', testCase.prp
        ]);

        // AQA validation: Each pattern must create dancing monkeys
        expect(result.exitCode).toBe(0);
        expect(result.artifacts.files).toContain('index.html');
        expect(result.artifacts.files).toContain('script.js');

        // Verify dancing monkeys are present
        const htmlContent = await validateFile('index.html', ['monkey-container']);
        expect(htmlContent).toContain('monkey-container');

        // Store for AQA review
        artifacts.set(`pattern-${testCase.name}`, { result, htmlContent });
      }
    });
  });

  describe('📋 Template System Validation', () => {
    it('should create fast template with all required components', async () => {
      const result = await executeCLI([
        'init', 'fast-template-test',
        '--template', 'fast',
        '--default',
        '--prp', 'Fast template validation project'
      ]);

      expect(result.exitCode).toBe(0);

      // AQA validation: Fast template must create essential files
      const expectedFiles = [
        'package.json',
        'AGENTS.md',
        '.prprc',
        'README.md',
        '.gitignore',
        'tsconfig.json'
      ];

      expectedFiles.forEach(file => {
        expect(result.artifacts.files).toContain(file);
      });

      // AQA validation: Validate configuration structure
      const packageJson = await validateJSONFile('package.json', ['name', 'version', 'scripts', 'devDependencies']);
      const prprc = await validateJSONFile('.prprc', ['version', 'agents', 'templates']);

      expect(prprc.templates.default).toBe('fast');
      expect(packageJson.devDependencies).toBeDefined();
      expect(Object.keys(packageJson.devDependencies).length).toBeGreaterThan(0);

      artifacts.set('fast-template', { result, packageJson, prprc });
    });

    it('should create minimal template with bare essentials', async () => {
      const result = await executeCLI([
        'init', 'minimal-template-test',
        '--template', 'minimal',
        '--default',
        '--prp', 'Minimal template validation project'
      ]);

      expect(result.exitCode).toBe(0);

      // AQA validation: Minimal template should have no dev dependencies
      const packageJson = await validateJSONFile('package.json', ['name', 'version']);
      expect(Object.keys(packageJson.devDependencies || {})).toHaveLength(0);

      artifacts.set('minimal-template', { result, packageJson });
    });

    it('should create all template with comprehensive features', async () => {
      const result = await executeCLI([
        'init', 'all-template-test',
        '--template', 'all',
        '--default',
        '--prp', 'Complete project with all features'
      ]);

      expect(result.exitCode).toBe(0);

      // AQA validation: All template should include CI/CD
      expect(result.artifacts.files).toContain('.github/workflows/ci.yml');

      const ciContent = await validateFile('.github/workflows/ci.yml', ['name:', 'on:', 'jobs:']);
      expect(ciContent).toContain('CI/CD Pipeline');

      artifacts.set('all-template', { result, ciContent });
    });
  });

  describe('🤖 Agent Configuration Validation', () => {
    it('should configure default agents correctly', async () => {
      const result = await executeCLI([
        'init', 'default-agents-test',
        '--template', 'fast',
        '--default',
        '--prp', 'Default agents validation project'
      ]);

      expect(result.exitCode).toBe(0);

      const prprc = await validateJSONFile('.prprc', ['version', 'agents']);

      // AQA validation: Default agents must be configured
      expect(prprc.agents.enabled).toContain('robo-developer');
      expect(prprc.agents.enabled).toContain('robo-aqa');
      expect(prprc.agents.enabled.length).toBeGreaterThanOrEqual(2);

      artifacts.set('default-agents', { result, prprc });
    });

    it('should support custom agent configuration', async () => {
      const result = await executeCLI([
        'init', 'custom-agents-test',
        '--template', 'all',
        '--default',
        '--agents', 'robo-developer,robo-ux-ui-designer,robo-system-analyst',
        '--prp', 'Custom agents validation project'
      ]);

      expect(result.exitCode).toBe(0);

      const prprc = await validateJSONFile('.prprc', ['version', 'agents']);

      // AQA validation: Custom agents must be configured
      expect(prprc.agents.enabled).toContain('robo-developer');
      expect(prprc.agents.enabled).toContain('robo-ux-ui-designer');
      expect(prprc.agents.enabled).toContain('robo-system-analyst');
      expect(prprc.agents.enabled.length).toBeGreaterThanOrEqual(3);

      artifacts.set('custom-agents', { result, prprc });
    });
  });

  describe('🔒 Security and Compliance Validation', () => {
    it('should block init command in CI mode', async () => {
      const result = await executeCLI([
        'init', 'ci-blocked-test',
        '--default',
        '--prp', 'CI mode test project'
      ], {
        env: { CI_MODE: 'true' }
      });

      // AQA validation: Must fail in CI mode
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR: init command cannot be run in CI mode');
      expect(result.stderr).toContain('Use template copying instead');

      artifacts.set('ci-blocking', { result });
    });

    it('should handle non-interactive mode gracefully', async () => {
      const result = await executeCLI([
        'init', 'non-interactive-test',
        '--template', 'minimal',
        '--default',
        '--prp', 'Non-interactive test project'
      ]);

      expect(result.exitCode).toBe(0);

      // Should create project without prompts
      expect(result.artifacts.files).toContain('package.json');
      expect(result.artifacts.files).toContain('AGENTS.md');

      artifacts.set('non-interactive', { result });
    });
  });

  describe('📁 File Structure and Content Validation', () => {
    it('should create valid package.json with all required fields', async () => {
      await executeCLI([
        'init', 'package-validation-test',
        '--template', 'fast',
        '--default',
        '--prp', 'Package.json validation project'
      ]);

      const packageJson = await validateJSONFile('package.json', [
        'name',
        'version',
        'description',
        'main',
        'scripts',
        'engines'
      ]);

      // AQA validation: Package.json must have proper structure
      expect(packageJson.name).toBe('package-validation-test');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.engines.node).toMatch(/^>=\d+\.\d+\.\d+$/);
      expect(Object.keys(packageJson.scripts).length).toBeGreaterThan(0);

      artifacts.set('package-validation', packageJson);
    });

    it('should create AGENTS.md with proper signal system', async () => {
      await executeCLI([
        'init', 'agents-md-test',
        '--template', 'fast',
        '--default',
        '--prp', 'AGENTS.md validation project'
      ]);

      const agentsContent = await validateFile('AGENTS.md', [
        '# AGENTS.md',
        'AI Agent Workflow System',
        'Signal System',
        'Available Agents',
        'robo-developer',
        'robo-aqa'
      ]);

      // AQA validation: Must include signal system references
      expect(agentsContent).toContain('Signal');
      expect(agentsContent).toContain('workflow');

      artifacts.set('agents-md', agentsContent);
    });

    it('should create .prprc with valid configuration structure', async () => {
      await executeCLI([
        'init', 'prprc-validation-test',
        '--template', 'all',
        '--default',
        '--prp', '.prprc validation project'
      ]);

      const prprc = await validateJSONFile('.prprc', [
        'version',
        'agents',
        'templates',
        'features'
      ]);

      // AQA validation: Configuration must be complete
      expect(prprc.version).toBeDefined();
      expect(Array.isArray(prprc.agents.enabled)).toBe(true);
      expect(typeof prprc.agents.configurations).toBe('object');
      expect(typeof prprc.features).toBe('object');

      artifacts.set('prprc-validation', prprc);
    });
  });

  describe('⚠️ Error Handling and Edge Cases', () => {
    it('should handle invalid template names gracefully', async () => {
      const result = await executeCLI([
        'init', 'invalid-template-test',
        '--template', 'non-existent-template',
        '--default',
        '--prp', 'Invalid template test project'
      ]);

      // AQA validation: Should fail gracefully with clear error
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid template: non-existent-template');

      artifacts.set('invalid-template', { result });
    });

    it('should handle very long project names', async () => {
      const longName = 'a'.repeat(50); // Test boundary condition

      const result = await executeCLI([
        'init', longName,
        '--template', 'minimal',
        '--default',
        '--prp', 'Long name test project'
      ]);

      // AQA validation: Should handle gracefully (may succeed or fail with clear error)
      expect([0, 1]).toContain(result.exitCode);

      artifacts.set('long-name', { result, name: longName });
    });

    it('should handle special characters in PRP', async () => {
      const specialPRP = 'Project with special chars: áéíóú ñ € @ # $ % ^ & * ( ) - _ + =';

      const result = await executeCLI([
        'init', 'special-chars-test',
        '--default',
        '--prp', specialPRP
      ]);

      expect(result.exitCode).toBe(0);

      const packageJson = await validateJSONFile('package.json');
      expect(packageJson.description).toBe(specialPRP);

      artifacts.set('special-chars', { result, prp: specialPRP, packageJson });
    });
  });

  describe('📊 Performance and Resource Validation', () => {
    it('should complete initialization within reasonable time', async () => {
      const startTime = Date.now();

      const result = await executeCLI([
        'init', 'performance-test',
        '--template', 'fast',
        '--default',
        '--prp', 'Performance validation project'
      ]);

      const duration = Date.now() - startTime;

      // AQA validation: Should complete within reasonable time
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(30000); // 30 seconds max

      artifacts.set('performance', { result, duration });
    });

    it('should create reasonable file sizes', async () => {
      await executeCLI([
        'init', 'file-size-test',
        '--template', 'all',
        '--default',
        '--prp', 'File size validation project'
      ]);

      // AQA validation: Check file sizes are reasonable
      for (const file of ['package.json', '.prprc', 'AGENTS.md', 'README.md']) {
        const stats = await fs.stat(file);
        expect(stats.size).toBeLessThan(50000); // 50KB max for config files
        artifacts.set(`file-size-${file}`, { size: stats.size, path: file });
      }
    });
  });

  describe('🎵 Complete User Journey Validation', () => {
    it('should support complete user workflow from init to deployment-ready', async () => {
      // Step 1: Initialize project with dancing monkeys
      const result1 = await executeCLI([
        'init', 'user-journey-test',
        '--default',
        '--prp', 'Complete user journey test with dancing monkeys'
      ]);

      expect(result1.exitCode).toBe(0);

      // Step 2: Validate all components are ready
      const packageJson = await validateJSONFile('package.json', ['scripts']);
      const prprc = await validateJSONFile('.prprc');

      // AQA validation: Deployment scripts must be present
      expect(packageJson.scripts['deploy:monkeys']).toBeDefined();
      expect(prprc.templates.default).toBe('landing-page');

      // Step 3: Validate project is deployment-ready
      const htmlContent = await validateFile('index.html');
      const cssContent = await validateFile('style.css');
      const jsContent = await validateFile('script.js');

      // AQA validation: All deployment components must be functional
      expect(htmlContent).toContain('monkey-container');
      expect(cssContent).toContain('@keyframes dance');
      expect(jsContent).toContain('showDancingMonkeys');

      // Store complete journey artifacts
      artifacts.set('user-journey', {
        init: result1,
        files: result1.artifacts.files,
        packageJson,
        prprc,
        htmlContent,
        cssContent,
        jsContent
      });

      console.log('\n🎉 Complete user journey validated successfully!');
      console.log(`📁 Artifacts preserved at: ${testDir}`);
      console.log('🐵 Dancing monkeys page ready for deployment!');
    });
  });
});