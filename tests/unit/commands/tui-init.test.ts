/**
 * TUI Init Command Unit Tests
 *
 * Comprehensive behavior tests for the TUI init command functionality
 * covering CI mode, TUI mode, template mapping, and project generation.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { runTUIInit, createTUIInitCommand } from '../../../src/commands/tui-init.js';
import { logger, Logger, setLoggerTUIMode } from '../../../src/shared/logger.js';

// Mock dependencies
jest.mock('../../../src/shared/logger.js');
jest.mock('../../../src/services/scaffolding-service.js');
jest.mock('../../../src/tui/config/TUIConfig.js');
jest.mock('../../../src/tui/components/init/InitFlow.js');
jest.mock('../../../src/tui/config/theme-provider.js');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockScaffoldingService = ScaffoldingService as jest.MockedClass<typeof ScaffoldingService>;
const mockSetLoggerTUIMode = setLoggerTUIMode as jest.MockedFunction<typeof setLoggerTUIMode>;

describe('TUI Init Command', () => {
  let testDir: string;
  let mockScaffoldingInstance: jest.Mocked<ScaffoldingService>;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join('/tmp', `prp-tui-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(testDir, { recursive: true });

    // Mock scaffolding service
    mockScaffoldingInstance = {
      scaffold: jest.fn().mockResolvedValue(undefined)
    } as any;
    mockScaffoldingService.mockImplementation(() => mockScaffoldingInstance);

    // Mock logger
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});

    // Mock setLoggerTUIMode
    mockSetLoggerTUIMode.mockImplementation(() => {});

    // Mock process.stdout.write
    const mockWrite = jest.fn();
    (process.stdout.write as any) = mockWrite;

    // Mock process.exit
    const mockExit = jest.fn();
    (process.exit as any) = mockExit;
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    jest.clearAllMocks();
  });

  describe('CI Mode', () => {
    it('should create project in CI mode with minimal options', async () => {
      const options = {
        ci: true,
        projectName: 'test-project'
      };

      const result = await runTUIInit(options);

      expect(mockScaffoldingService).toHaveBeenCalledTimes(1);
      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'test-project',
          template: 'typescript',
          description: 'Project test-project'
        })
      );

      expect(result).toEqual({
        success: true,
        project: {
          name: 'test-project',
          path: expect.stringContaining('test-project'),
          template: 'typescript',
          description: 'Project test-project'
        }
      });
    });

    it('should use custom description in CI mode', async () => {
      const options = {
        ci: true,
        projectName: 'test-project',
        description: 'Custom project description',
        prompt: 'Custom project prompt'
      };

      const result = await runTUIInit(options);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Custom project description',
          prompt: 'Custom project prompt'
        })
      );

      expect(result.project?.description).toBe('Custom project description');
    });

    it('should use custom template in CI mode', async () => {
      const options = {
        ci: true,
        projectName: 'test-project',
        template: 'react'
      };

      const result = await runTUIInit(options);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'react'
        })
      );

      expect(result.project?.template).toBe('react');
    });

    it('should fail without project name in CI mode', async () => {
      const options = {
        ci: true
      };

      const result = await runTUIInit(options);

      expect(result).toEqual({
        success: false,
        error: 'Project name is required in CI mode'
      });

      expect(mockScaffoldingService).not.toHaveBeenCalled();
    });

    it('should handle scaffolding errors in CI mode', async () => {
      const errorMessage = 'Scaffolding failed';
      mockScaffoldingInstance.scaffold.mockRejectedValue(new Error(errorMessage));

      const options = {
        ci: true,
        projectName: 'test-project'
      };

      const result = await runTUIInit(options);

      expect(result).toEqual({
        success: false,
        error: `Failed to generate project: ${errorMessage}`
      });
    });

    it('should output JSON in CI mode', async () => {
      const mockWrite = jest.fn();
      (process.stdout.write as any) = mockWrite;

      const options = {
        ci: true,
        projectName: 'test-project'
      };

      await runTUIInit(options);

      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringMatching(/^\{[\s\S]*\}$/) // JSON format
      );
    });
  });

  describe('Template Mapping', () => {
    const templateMap = [
      { input: 'ts', expected: 'typescript' },
      { input: 'typescript', expected: 'typescript' },
      { input: 'react', expected: 'react' },
      { input: 'nest', expected: 'nestjs' },
      { input: 'nestjs', expected: 'nestjs' },
      { input: 'fastapi', expected: 'fastapi' },
      { input: 'python', expected: 'fastapi' },
      { input: 'wikijs', expected: 'wikijs' },
      { input: 'wiki', expected: 'wikijs' },
      { input: 'none', expected: 'none' },
      { input: 'minimal', expected: 'none' },
      { input: 'basic', expected: 'none' },
      { input: 'invalid', expected: 'typescript' }, // Default fallback
      { input: undefined, expected: 'typescript' }, // Default fallback
      { input: '', expected: 'typescript' } // Default fallback
    ];

    templateMap.forEach(({ input, expected }) => {
      it(`should map '${input}' template to '${expected}'`, async () => {
        // Import the mapTemplateOption function
        const { mapTemplateOption } = require('../../../src/commands/tui-init.js');
        const result = mapTemplateOption(input);

        expect(result).toBe(expected);
      });
    });
  });

  describe('Command Creation', () => {
    it('should create TUI init command with correct configuration', () => {
      const command = createTUIInitCommand();

      expect(command.name()).toBe('init');
      expect(command.description()).toContain('TUI interface');
    });

    it('should have all expected options', () => {
      const command = createTUIInitCommand();

      const optionNames = command.options.map(opt => opt.long);
      expect(optionNames).toContain('tui');
      expect(optionNames).toContain('quick');
      expect(optionNames).toContain('screen');
      expect(optionNames).toContain('config');
      expect(optionNames).toContain('prompt');
      expect(optionNames).toContain('project-name');
      expect(optionNames).toContain('template');
      expect(optionNames).toContain('description');
      expect(optionNames).toContain('force');
      expect(optionNames).toContain('ci');
      expect(optionNames).toContain('debug');
    });
  });

  describe('Screen Validation', () => {
    const validScreens = ['intro', 'project', 'connections', 'agents', 'integrations', 'template'];

    validScreens.forEach(screen => {
      it(`should accept '${screen}' as valid screen option`, async () => {
        const options = {
          ci: true,
          projectName: 'test-project',
          screen
        };

        await expect(handleTUIInitCommand(options)).resolves.not.toThrow();
      });
    });

    it('should reject invalid screen option', async () => {
      const options = {
        ci: true,
        projectName: 'test-project',
        screen: 'invalid-screen'
      };

      await expect(handleTUIInitCommand(options)).rejects.toThrow('Invalid screen: invalid-screen');
    });
  });

  describe('Debug Mode', () => {
    it('should set debug environment variables when debug flag is provided', async () => {
      const originalDebug = process.env.DEBUG;
      const originalVerbose = process.env.VERBOSE_MODE;

      const options = {
        ci: true,
        projectName: 'test-project',
        debug: true
      };

      await handleTUIInitCommand(options);

      expect(process.env.DEBUG).toBe('true');
      expect(process.env.VERBOSE_MODE).toBe('true');

      // Restore original values
      process.env.DEBUG = originalDebug;
      process.env.VERBOSE_MODE = originalVerbose;
    });
  });

  describe('Project Generation', () => {
    it('should scaffold project with correct options', async () => {
      const mockInitState = {
        projectName: 'test-project',
        projectPrompt: 'Test prompt',
        template: 'react',
        projectPath: path.resolve(testDir, 'test-project'),
        provider: 'openai',
        authType: 'api-key',
        glmApiKey: 'test-key',
        currentAgentIndex: 0,
        templateConfig: { files: [], configureFiles: false },
        configureFiles: false,
        selectedFiles: new Set(['src/', 'README.md', '.gitignore', 'package.json']),
        generatePromptQuote: true,
        validation: {},
        canGoBack: false,
        canGoForward: false,
        step: 5,
        isComplete: false,
        agents: [{
          id: 'robo-developer',
          type: 'claude',
          limit: '100usd10k#dev',
          cv: 'Full-stack developer',
          warning_limit: '2k#robo-quality-control',
          provider: 'anthropic',
          yolo: false,
          sub_agents: true,
          max_parallel: 5,
          mcp: '.mcp.json',
          compact_prediction: {
            percent_threshold: 0.82,
            auto_adjust: true,
            cap: 24000
          }
        }],
        integrations: {},
        mcpConfig: {
          enabled: true,
          servers: ['context7', 'chrome-mcp'],
          configPath: '.mcp.json'
        },
        agentFileLink: {
          enabled: true,
          sourceFile: 'agents.md',
          targetFile: 'claude.md'
        }
      };

      // Import and test generateProject function
      const { generateProject } = require('../../../src/commands/tui-init.js');
      await generateProject(mockScaffoldingInstance, mockInitState);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith({
        projectName: 'test-project',
        targetPath: expect.stringContaining('test-project'),
        template: 'react',
        description: 'Test prompt',
        prompt: 'Test prompt',
        author: '',
        email: '',
        gitInit: true,
        installDeps: false,
        force: true,
        upgrade: false,
        ci: false,
        default: false,
        variables: {
          PROJECT_NAME: 'test-project',
          PROJECT_DESCRIPTION: 'Test prompt',
          TEMPLATE: 'react',
          PROVIDER: 'openai',
          AUTH_TYPE: 'api-key'
        }
      });
    });
  });

  describe('Orchestrator Integration', () => {
    it('should start orchestrator after project generation', async () => {
      const mockHandleOrchestratorCommand = jest.fn().mockResolvedValue(undefined);

      // Mock the import
      jest.doMock('../../../src/commands/orchestrator.js', () => ({
        handleOrchestratorCommand: mockHandleOrchestratorCommand
      }));

      const mockInitState = {
        projectName: 'test-project',
        projectPrompt: 'Test prompt',
        template: 'typescript',
        projectPath: testDir,
        step: 5,
        isComplete: false
        // ... other required properties
      };

      // Import and test startOrchestrator function
      const { startOrchestrator } = require('../../../src/commands/tui-init.js');
      await startOrchestrator(testDir);

      expect(mockHandleOrchestratorCommand).toHaveBeenCalledWith({});
    });

    it('should handle orchestrator start errors gracefully', async () => {
      const mockHandleOrchestratorCommand = jest.fn().mockRejectedValue(new Error('Orchestrator failed'));

      jest.doMock('../../../src/commands/orchestrator.js', () => ({
        handleOrchestratorCommand: mockHandleOrchestratorCommand
      }));

      // Import and test startOrchestrator function
      const { startOrchestrator } = require('../../../src/commands/tui-init.js');

      // Should not throw error
      await expect(startOrchestrator(testDir)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown errors gracefully', async () => {
      const unknownError = 'Unknown error occurred';
      mockScaffoldingInstance.scaffold.mockRejectedValue(unknownError);

      const options = {
        ci: true,
        projectName: 'test-project'
      };

      const result = await runTUIInit(options);

      expect(result).toEqual({
        success: false,
        error: `Failed to generate project: ${unknownError}`
      });
    });

    it('should restore logger mode on error', async () => {
      mockScaffoldingInstance.scaffold.mockRejectedValue(new Error('Test error'));

      const options = {
        ci: true,
        projectName: 'test-project'
      };

      await runTUIInit(options);

      expect(mockSetLoggerTUIMode).toHaveBeenCalledWith(false);
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete CI project creation with all options', async () => {
      const options = {
        ci: true,
        projectName: 'complex-project',
        template: 'nestjs',
        description: 'Complex NestJS application',
        prompt: 'Build a comprehensive NestJS application',
        force: true
      };

      const result = await runTUIInit(options);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'complex-project',
          template: 'nestjs',
          description: 'Complex NestJS application',
          prompt: 'Build a comprehensive NestJS application',
          force: true
        })
      );

      expect(result).toEqual({
        success: true,
        project: {
          name: 'complex-project',
          path: expect.stringContaining('complex-project'),
          template: 'nestjs',
          description: 'Complex NestJS application'
        }
      });
    });
  });
});