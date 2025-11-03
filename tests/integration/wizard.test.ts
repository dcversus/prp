/**
 * Tests for CLI Wizard functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CLIWizard } from '../../src/commands/wizard';
import { TemplateManager } from '../../src/commands/template-manager';
import { AgentConfigurator } from '../../src/commands/agent-configurator';
import { WizardConfig, WizardOptions } from '../../src/commands/types';

// Mock chalk to avoid import issues in tests
jest.mock('chalk', () => ({
  blue: (text: string) => text,
  gray: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  red: (text: string) => text,
  cyan: (text: string) => text,
  magenta: (text: string) => text,
  bold: (text: string) => text,
  italic: (text: string) => text,
  underline: (text: string) => text
}));

describe('CLI Wizard', () => {
  let wizard: CLIWizard;
  let testDir: string;
  let wizardConfig: WizardConfig;

  beforeEach(async () => {
    // Create test directory using absolute path
    const baseDir = process.cwd();
    testDir = join(baseDir, 'test-wizard-temp');
    await fs.mkdir(testDir, { recursive: true });

    // Save original directory and change to test directory
    const originalCwd = process.cwd();
    (global as any).originalTestCwd = originalCwd;
    process.chdir(testDir);

    // Setup wizard config
    wizardConfig = {
      templates: {
        registry: 'https://registry.prp-cli.com',
        cacheDir: join(testDir, '.prp-cache'),
        defaultTemplate: 'fast'
      },
      agents: {
        registry: 'https://agents.prp-cli.com',
        default: ['robo-developer', 'robo-aqa'],
        configurations: {}
      },
      showTips: false, // Disable tips for testing
      ciMode: true, // Use CI mode for testing
      verbose: false
    };

    wizard = new CLIWizard(wizardConfig);

    // Initialize the template manager to load built-in templates
    await wizard['templateManager'].initialize();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      const originalCwd = (global as any).originalTestCwd;
      if (originalCwd) {
        process.chdir(originalCwd);
      }
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Default Mode', () => {
    it('should initialize project with default settings', async () => {
      const options: WizardOptions = {
        projectName: 'test-project',
        template: 'fast',
        prp: 'Test project for wizard validation',
        default: true
      };

      // Mock the command execution to avoid actual npm install
      const executeCommandSpy = jest.spyOn(wizard as any, 'executeCommand')
        .mockImplementation(async (command: string, args: string[]) => {
          if (command === 'npm' && args.includes('install')) {
            return { success: true, stdout: 'Mocked npm install success', stderr: '' };
          }
          if (command === 'git') {
            return { success: true, stdout: 'Initialized git repository', stderr: '' };
          }
          return { success: true, stdout: '', stderr: '' };
        });

      await wizard.start(options);

      // Check if project files were created
      await expect(fs.access('package.json')).resolves.toBeUndefined();
      await expect(fs.access('AGENTS.md')).resolves.toBeUndefined();
      await expect(fs.access('.prprc')).resolves.toBeUndefined();
      await expect(fs.access('README.md')).resolves.toBeUndefined();
      await expect(fs.access('.gitignore')).resolves.toBeUndefined();

      // Check package.json content
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      expect(packageJson.name).toBe('test-project');
      expect(packageJson.description).toBe('Test project for wizard validation');

      // Check .prprc content
      const prprc = JSON.parse(await fs.readFile('.prprc', 'utf-8'));
      expect(prprc.version).toBe('1.0.0');
      expect(prprc.agents.enabled).toContain('robo-developer');
      expect(prprc.agents.enabled).toContain('robo-aqa');

      // Restore spy
      executeCommandSpy.mockRestore();
    });

    it('should detect dancing monkeys PRP and use landing-page template', async () => {
      const options: WizardOptions = {
        projectName: 'monkeys-project',
        template: 'fast', // This should be overridden
        prp: 'Deliver gh-page with animated dancing monkeys spawn around',
        default: true
      };

      await wizard.start(options);

      // Check if landing page files were created
      await expect(fs.access('index.html')).resolves.toBeUndefined();
      await expect(fs.access('style.css')).resolves.toBeUndefined();
      await expect(fs.access('script.js')).resolves.toBeUndefined();

      // Check index.html contains dancing monkeys script
      const indexHtml = await fs.readFile('index.html', 'utf-8');
      expect(indexHtml).toContain('monkey-container');
      expect(indexHtml).toContain('dancing monkeys');
    });
  });

  describe('Template Selection', () => {
    it('should create minimal template', async () => {
      const options: WizardOptions = {
        projectName: 'minimal-test',
        template: 'minimal',
        prp: 'Minimal test project',
        default: true
      };

      await wizard.start(options);

      // Check minimal files exist
      await expect(fs.access('.prprc')).resolves.toBeUndefined();
      await expect(fs.access('README.md')).resolves.toBeUndefined();

      // Should not have dev dependencies
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      expect(packageJson.devDependencies).toEqual({});
    });

    it('should create all template', async () => {
      const options: WizardOptions = {
        projectName: 'all-test',
        template: 'all',
        prp: 'Complete test project with all features',
        default: true
      };

      await wizard.start(options);

      // Check comprehensive files exist
      await expect(fs.access('.github/workflows/ci.yml')).resolves.toBeUndefined();

      // Should have all agents enabled
      const prprc = JSON.parse(await fs.readFile('.prprc', 'utf-8'));
      expect(prprc.agents.enabled.length).toBeGreaterThan(2);
    });

    it('should create landing page template', async () => {
      const options: WizardOptions = {
        projectName: 'landing-test',
        template: 'landing-page',
        prp: 'Landing page test project',
        default: true
      };

      await wizard.start(options);

      // Check landing page files exist
      await expect(fs.access('index.html')).resolves.toBeUndefined();
      await expect(fs.access('style.css')).resolves.toBeUndefined();
      await expect(fs.access('script.js')).resolves.toBeUndefined();

      // Check HTML structure
      const indexHtml = await fs.readFile('index.html', 'utf-8');
      expect(indexHtml).toContain('<!DOCTYPE html>');
      expect(indexHtml).toContain('<title>');
      expect(indexHtml).toContain('PRP CLI');
    });
  });

  describe('Agent Configuration', () => {
    it('should configure custom agents', async () => {
      const options: WizardOptions = {
        projectName: 'agents-test',
        template: 'fast',
        prp: 'Test project with custom agents',
        agents: ['robo-developer', 'robo-ux-ui-designer'],
        agentConfigs: {
          'robo-developer': {
            enabled: true,
            model: 'gpt-4',
            maxTokens: 4000
          },
          'robo-ux-ui-designer': {
            enabled: true,
            model: 'claude-3-sonnet',
            maxTokens: 6000
          }
        },
        default: true
      };

      await wizard.start(options);

      // Check agent configuration
      const prprc = JSON.parse(await fs.readFile('.prprc', 'utf-8'));
      expect(prprc.agents.enabled).toContain('robo-developer');
      expect(prprc.agents.enabled).toContain('robo-ux-ui-designer');
      expect(prprc.agents.enabled).not.toContain('robo-aqa'); // Should not include default agent

      // Check custom configurations
      expect(prprc.agents.configurations['robo-developer']).toBeDefined();
      expect(prprc.agents.configurations['robo-ux-ui-designer']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid template', async () => {
      const options: WizardOptions = {
        projectName: 'error-test',
        template: 'invalid-template' as any,
        prp: 'Test project',
        default: true
      };

      await expect(wizard.start(options)).rejects.toThrow('Invalid template: invalid-template');
    });

    it('should handle missing project name in non-interactive mode', async () => {
      const options: WizardOptions = {
        template: 'fast',
        prp: 'Test project',
        default: true,
        ciMode: true
      };

      await wizard.start(options);

      // Should use default project name
      await expect(fs.access('package.json')).resolves.toBeUndefined();
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      expect(packageJson.name).toMatch(/prp-project|test-wizard-temp/);
    });
  });

  describe('State Management', () => {
    it('should track wizard progress', async () => {
      const options: WizardOptions = {
        projectName: 'state-test',
        template: 'fast',
        prp: 'Test project',
        default: true
      };

      const progressSpy = jest.fn();
      wizard.on('wizard:progress-updated', progressSpy);

      await wizard.start(options);

      // Check that progress was updated
      expect(progressSpy).toHaveBeenCalled();

      // Check final state
      const state = wizard.getState();
      expect(state.progress).toBe(100);
      expect(state.data.projectName).toBe('state-test');
      expect(state.errors).toHaveLength(0);
    });

    it('should emit completion event', async () => {
      const options: WizardOptions = {
        projectName: 'event-test',
        template: 'fast',
        prp: 'Test project',
        default: true
      };

      const completionSpy = jest.fn();
      wizard.on('wizard:completed', completionSpy);

      await wizard.start(options);

      expect(completionSpy).toHaveBeenCalled();
      expect(completionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'event-test',
          template: 'fast'
        })
      );
    });
  });
});