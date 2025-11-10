/**
 * Orchestrator Command Unit Tests
 *
 * Comprehensive behavior tests for the orchestrator command functionality
 * covering configuration parsing, limit options, run options, and CI mode.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createOrchestratorCommand, parseLimitOption, parseRunOption, handleOrchestratorCommand } from '../../../src/commands/orchestrator.js';
import { Orchestrator } from '../../../src/orchestrator/orchestrator.js';
import { logger } from '../../../src/shared/logger.js';

// Mock dependencies
jest.mock('../../../src/shared/logger.js');
jest.mock('../../../src/orchestrator/orchestrator.js');
jest.mock('../../../src/tui/index.js');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockOrchestrator = Orchestrator as jest.MockedClass<typeof Orchestrator>;

describe('Orchestrator Command', () => {
  let mockOrchestratorInstance: jest.Mocked<Orchestrator>;

  beforeEach(() => {
    // Mock orchestrator instance
    mockOrchestratorInstance = {
      initialize: jest.fn().mockResolvedValue(undefined)
    } as any;
    mockOrchestrator.mockImplementation(() => mockOrchestratorInstance);

    // Mock logger
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});

    // Mock process.exit
    const mockExit = jest.fn();
    (process.exit as any) = mockExit;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Creation', () => {
    it('should create orchestrator command with correct configuration', () => {
      const command = createOrchestratorCommand();

      expect(command.name()).toBe('orchestrator');
      expect(command.description()).toBe('Start PRP orchestrator with agent management and signal processing');
    });

    it('should have all expected options', () => {
      const command = createOrchestratorCommand();

      const optionNames = command.options.map(opt => opt.long);
      expect(optionNames).toContain('prompt');
      expect(optionNames).toContain('run');
      expect(optionNames).toContain('config');
      expect(optionNames).toContain('limit');
      expect(optionNames).toContain('screen');
      expect(optionNames).toContain('ci');
      expect(optionNames).toContain('debug');
    });
  });

  describe('Limit Option Parsing', () => {
    describe('valid formats', () => {
      it('should parse simple limit', () => {
        const result = parseLimitOption('1000');
        expect(result).toEqual([{
          type: 'custom',
          value: 1000,
          unit: '',
          target: undefined
        }]);
      });

      it('should parse limit with unit', () => {
        const result = parseLimitOption('1000k');
        expect(result).toEqual([{
          type: 'custom',
          value: 1000,
          unit: 'k',
          target: undefined
        }]);
      });

      it('should parse limit with target', () => {
        const result = parseLimitOption('1000k#robo-developer');
        expect(result).toEqual([{
          type: 'custom',
          value: 1000,
          unit: 'k',
          target: 'robo-developer'
        }]);
      });

      it('should parse multiple limits', () => {
        const result = parseLimitOption('1k,2k#robo-role,100usd10k#agent-name');
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
          type: 'custom',
          value: 1,
          unit: 'k',
          target: undefined
        });
        expect(result[1]).toEqual({
          type: 'custom',
          value: 2,
          unit: 'k',
          target: 'robo-role'
        });
        expect(result[2]).toEqual({
          type: 'custom',
          value: 100,
          unit: 'usd10k',
          target: 'agent-name'
        });
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', () => {
        expect(() => parseLimitOption('')).toThrow('Invalid --limit format');
      });

      it('should throw error for empty string with spaces', () => {
        expect(() => parseLimitOption('   ')).toThrow('Invalid --limit format');
      });

      it('should throw error for invalid format', () => {
        expect(() => parseLimitOption('invalid')).toThrow('Invalid --limit format');
      });

      it('should throw error for non-numeric value', () => {
        expect(() => parseLimitOption('abc')).toThrow('Invalid number');
      });

      it('should throw error for empty limit item', () => {
        expect(() => parseLimitOption('1k,,2k')).toThrow('Empty limit item found');
      });
    });
  });

  describe('Run Option Parsing', () => {
    describe('valid formats', () => {
      it('should parse simple PRP name', () => {
        const result = parseRunOption('prp-001');
        expect(result).toEqual([{
          prp: 'prp-001',
          role: undefined,
          agent: undefined
        }]);
      });

      it('should parse PRP with role', () => {
        const result = parseRunOption('prp-001#robo-developer');
        expect(result).toEqual([{
          prp: 'prp-001',
          role: 'robo-developer',
          agent: undefined
        }]);
      });

      it('should parse multiple PRPs with mixed formats', () => {
        const result = parseRunOption('prp-001#robo-developer,prp-002,prp-003#robo-quality-control');
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
          prp: 'prp-001',
          role: 'robo-developer',
          agent: undefined
        });
        expect(result[1]).toEqual({
          prp: 'prp-002',
          role: undefined,
          agent: undefined
        });
        expect(result[2]).toEqual({
          prp: 'prp-003',
          role: 'robo-quality-control',
          agent: undefined
        });
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', () => {
        expect(() => parseRunOption('')).toThrow('Invalid --run format');
      });

      it('should throw error for empty string with spaces', () => {
        expect(() => parseRunOption('   ')).toThrow('Invalid --run format');
      });

      it('should throw error for empty PRP name', () => {
        expect(() => parseRunOption('#robo-developer')).toThrow('PRP name is required');
      });

      it('should throw error for empty run item', () => {
        expect(() => parseRunOption('prp-001,,prp-002')).toThrow('Empty run item found');
      });
    });
  });

  describe('CI Mode', () => {
    it('should initialize orchestrator in CI mode', async () => {
      const options = {
        ci: true
      };

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5',
          maxTokens: 100000
        })
      );
      expect(mockOrchestratorInstance.initialize).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'shared',
        'OrchestratorCommand',
        'Orchestrator initialized',
        {}
      );
    });

    it('should handle prompt in CI mode', async () => {
      const options = {
        ci: true,
        prompt: 'Execute specific task'
      };

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'Execute specific task'
        })
      );
    });

    it('should handle run tasks in CI mode', async () => {
      const options = {
        ci: true,
        run: 'prp-001#robo-developer,prp-002'
      };

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          tasks: [{
            prp: 'prp-001',
            role: 'robo-developer',
            agent: undefined
          }, {
            prp: 'prp-002',
            role: undefined,
            agent: undefined
          }]
        })
      );
    });

    it('should handle limits in CI mode', async () => {
      const options = {
        ci: true,
        limit: '1000k#robo-developer,500usd'
      };

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          limits: [{
            type: 'custom',
            value: 1000,
            unit: 'k',
            target: 'robo-developer'
          }, {
            type: 'custom',
            value: 500,
            unit: 'usd',
            target: undefined
          }]
        })
      );
    });

    it('should handle orchestrator initialization errors in CI mode', async () => {
      const errorMessage = 'Orchestrator initialization failed';
      mockOrchestratorInstance.initialize.mockRejectedValue(new Error(errorMessage));

      const options = {
        ci: true
      };

      await handleOrchestratorCommand(options);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'shared',
        'OrchestratorCommand',
        `CI mode failed: ${errorMessage}`,
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Configuration Loading', () => {
    it('should load default configuration', async () => {
      const options = {};

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5',
          maxTokens: 100000,
          temperature: 0.7,
          timeout: 180000,
          maxConcurrentDecisions: 3,
          maxChainOfThoughtDepth: 10
        })
      );
    });

    it('should include context preservation settings', async () => {
      const options = {};

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          contextPreservation: {
            enabled: true,
            maxContextSize: 50000,
            compressionStrategy: 'summarize',
            preserveElements: ['signals', 'active_tasks', 'agent_status'],
            compressionRatio: 0.3,
            importantSignals: ['At', 'Bb', 'Ur', 'Co']
          }
        })
      );
    });

    it('should include agent management settings', async () => {
      const options = {};

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: {
            maxConcurrent: 5,
            defaultRole: 'robo-developer',
            availableRoles: [
              'robo-system-analyst',
              'robo-developer',
              'robo-quality-control',
              'robo-ux-ui-designer',
              'robo-devops-sre'
            ]
          }
        })
      );
    });

    it('should include prompt settings', async () => {
      const options = {};

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          prompts: {
            systemPrompt: '',
            cotPrompt: '',
            toolSelectionPrompt: '',
            agentCoordinationPrompt: ''
          }
        })
      );
    });

    it('should include decision thresholds', async () => {
      const options = {};

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          decisionThresholds: {
            confidence: 0.7,
            parallelThreshold: 0.8
          }
        })
      );
    });
  });

  describe('Screen Mapping', () => {
    it('should map screen options correctly', async () => {
      const testCases = [
        { input: 'o', expected: 'orchestrator' },
        { input: 'i', expected: 'info' },
        { input: 'a', expected: 'agents' },
        { input: '1', expected: 'agent-1' },
        { input: 'n', expected: 'agent-2' },
        { input: undefined, expected: 'orchestrator' }
      ];

      for (const testCase of testCases) {
        // Import the mapScreenOption function
        const { mapScreenOption } = require('../../../src/commands/orchestrator.js');
        const result = mapScreenOption(testCase.input);

        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('Debug Mode', () => {
    it('should set debug environment variables when debug flag is provided', async () => {
      const originalDebug = process.env.DEBUG;
      const originalVerbose = process.env.VERBOSE_MODE;

      const options = {
        debug: true
      };

      await handleOrchestratorCommand(options);

      expect(process.env.DEBUG).toBe('true');
      expect(process.env.VERBOSE_MODE).toBe('true');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'shared',
        'OrchestratorCommand',
        'Debug mode enabled for orchestrator',
        {}
      );

      // Restore original values
      process.env.DEBUG = originalDebug;
      process.env.VERBOSE_MODE = originalVerbose;
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', async () => {
      const options = {
        run: '', // Invalid format
      };

      await handleOrchestratorCommand(options);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle limit parsing errors', async () => {
      const options = {
        limit: 'invalid-format'
      };

      await handleOrchestratorCommand(options);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete configuration with all options', async () => {
      const options = {
        prompt: 'Execute comprehensive task',
        run: 'prp-001#robo-developer,prp-002#robo-quality-control',
        limit: '1000k#robo-developer,500usd10k#robo-quality-control',
        screen: 'a' as const,
        debug: true
      };

      await handleOrchestratorCommand(options);

      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'Execute comprehensive task',
          tasks: [
            { prp: 'prp-001', role: 'robo-developer', agent: undefined },
            { prp: 'prp-002', role: 'robo-quality-control', agent: undefined }
          ],
          limits: [
            { type: 'custom', value: 1000, unit: 'k', target: 'robo-developer' },
            { type: 'custom', value: 500, unit: 'usd10k', target: 'robo-quality-control' }
          ]
        })
      );
    });
  });
});