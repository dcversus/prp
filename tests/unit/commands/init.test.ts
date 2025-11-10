/**
 * Init Command Unit Tests
 *
 * Comprehensive behavior tests for the init command functionality
 * covering project creation, validation, error handling, and edge cases.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createInitCommand, handleInitCommand } from '../../../src/commands/init.js';
import { logger } from '../../../src/shared/logger.js';
import { ScaffoldingService } from '../../../src/shared/services/scaffolding-service.js';

// Mock dependencies
jest.mock('../../../src/shared/logger.js');
jest.mock('../../../src/shared/services/scaffolding-service.js');
jest.mock('../../../src/commands/tui-init.js');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockScaffoldingService = ScaffoldingService as jest.MockedClass<typeof ScaffoldingService>;

describe('Init Command', () => {
  let testDir: string;
  let mockScaffoldingInstance: jest.Mocked<ScaffoldingService>;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join('/tmp', `prp-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(testDir, { recursive: true });

    // Mock scaffolding service
    mockScaffoldingInstance = {
      scaffold: jest.fn().mockResolvedValue(undefined)
    };
    mockScaffoldingService.mockImplementation(() => mockScaffoldingInstance);

    // Mock logger
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});

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

  describe('Command Creation', () => {
    it('should create init command with correct configuration', () => {
      const command = createInitCommand();

      expect(command.name()).toBe('init');
      expect(command.description()).toBe('Initialize a new PRP project');
    });

    it('should accept project name as argument', () => {
      const command = createInitCommand();

      // Test argument configuration
      expect(command.registeredArguments).toHaveLength(1);
      expect(command.registeredArguments?.[0]?.name).toBe('projectName');
    });

    it('should have all expected options', () => {
      const command = createInitCommand();

      const optionNames = command.options.map(opt => opt.long);
      expect(optionNames).toContain('prompt');
      expect(optionNames).toContain('project-name');
      expect(optionNames).toContain('template');
      expect(optionNames).toContain('default');
      expect(optionNames).toContain('force');
    });
  });

  describe('CI Mode', () => {
    it('should create TypeScript project in CI mode', async () => {
      const options = {
        ci: true,
        template: 'typescript',
        projectName: 'test-project'
      };

      await handleInitCommand(options, 'test-project');

      expect(mockScaffoldingService).toHaveBeenCalledTimes(1);
      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith({
        projectName: 'test-project',
        template: 'typescript',
        prompt: '',
        description: '',
        author: '',
        email: '',
        targetPath: 'test-project',
        force: false
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'shared',
        'InitCommand',
        'Project "test-project" created successfully with template "typescript"',
        {}
      );
    });

    it('should use default template when not specified in CI mode', async () => {
      const options = {
        ci: true,
        projectName: 'test-project'
      };

      await handleInitCommand(options, 'test-project');

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'typescript' // Default template
        })
      );
    });

    it('should use force flag when provided', async () => {
      const options = {
        ci: true,
        force: true,
        projectName: 'test-project'
      };

      await handleInitCommand(options, 'test-project');

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true
        })
      );
    });

    it('should use custom prompt when provided', async () => {
      const options = {
        ci: true,
        prompt: 'Custom project prompt',
        projectName: 'test-project'
      };

      await handleInitCommand(options, 'test-project');

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Custom project prompt'
        })
      );
    });
  });

  describe('Project Name Resolution', () => {
    it('should use argument name when provided', async () => {
      const options = {
        ci: true,
        projectName: 'from-argument'
      };

      await handleInitCommand(options, 'argument-project');

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'argument-project'
        })
      );
    });

    it('should use option name when no argument provided', async () => {
      const options = {
        ci: true,
        projectName: 'from-option'
      };

      await handleInitCommand(options);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'from-option'
        })
      );
    });

    it('should use default name when neither argument nor option provided', async () => {
      const options = {
        ci: true
      };

      await handleInitCommand(options);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'prp-project'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should fail when .prprc exists and force not provided', async () => {
      // Create existing .prprc file
      const prprcPath = path.join(testDir, '.prprc');
      await fs.writeFile(prprcPath, '{}');

      const options = {
        ci: false
      };

      await handleInitCommand(options, testDir);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'shared',
        'InitCommand',
        expect.stringContaining('already exists'),
        expect.any(Error)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'shared',
        'InitCommand',
        expect.stringContaining('Use --force'),
        {}
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should continue when .prprc exists but force is provided', async () => {
      // Create existing .prprc file
      const prprcPath = path.join(testDir, '.prprc');
      await fs.writeFile(prprcPath, '{}');

      const options = {
        ci: true,
        force: true
      };

      await handleInitCommand(options, testDir);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle scaffolding service errors', async () => {
      const errorMessage = 'Scaffolding failed';
      mockScaffoldingInstance.scaffold.mockRejectedValue(new Error(errorMessage));

      const options = {
        ci: true,
        projectName: 'test-project'
      };

      await handleInitCommand(options);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'shared',
        'InitCommand',
        `Initialization failed: ${errorMessage}`,
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle unknown errors', async () => {
      const unknownError = 'Unknown error occurred';
      mockScaffoldingInstance.scaffold.mockRejectedValue(unknownError);

      const options = {
        ci: true,
        projectName: 'test-project'
      };

      await handleInitCommand(options);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'shared',
        'InitCommand',
        `Initialization failed: ${unknownError}`,
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Debug Mode', () => {
    it('should set debug environment variables when debug flag is provided', async () => {
      const originalDebug = process.env.DEBUG;
      const originalVerbose = process.env.VERBOSE_MODE;

      const options = {
        ci: true,
        debug: true,
        projectName: 'test-project'
      };

      await handleInitCommand(options);

      expect(process.env.DEBUG).toBe('true');
      expect(process.env.VERBOSE_MODE).toBe('true');

      // Restore original values
      process.env.DEBUG = originalDebug;
      process.env.VERBOSE_MODE = originalVerbose;
    });
  });

  describe('Template Support', () => {
    const supportedTemplates = [
      'none',
      'typescript',
      'react',
      'nestjs',
      'fastapi',
      'wikijs'
    ];

    supportedTemplates.forEach(template => {
      it(`should support ${template} template`, async () => {
        const options = {
          ci: true,
          template,
          projectName: 'test-project'
        };

        await handleInitCommand(options);

        expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
          expect.objectContaining({
            template
          })
        );
      });
    });
  });

  describe('Integration Validation', () => {
    it('should maintain consistency between argument and option names', async () => {
      // Test that argument name takes precedence
      const options = {
        ci: true,
        projectName: 'option-name'
      };

      await handleInitCommand(options, 'argument-name');

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'argument-name', // Argument wins
          targetPath: 'argument-name'
        })
      );
    });

    it('should handle complex project creation scenarios', async () => {
      const options = {
        ci: true,
        prompt: 'A comprehensive test project',
        template: 'react',
        force: true,
        projectName: 'complex-test-project'
      };

      await handleInitCommand(options);

      expect(mockScaffoldingInstance.scaffold).toHaveBeenCalledWith({
        projectName: 'complex-test-project',
        template: 'react',
        prompt: 'A comprehensive test project',
        description: '',
        author: '',
        email: '',
        targetPath: 'complex-test-project',
        force: true
      });
    });
  });
});