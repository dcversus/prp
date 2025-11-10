/**
 * Guidelines Validator Test Suite
 *
 * Tests for the guidelines validation functionality including language validation,
 * structure validation, and quality gates.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GuidelinesValidator } from '../validator';
import type { GuidelineDefinition } from '../types';
import { ValidationSeverity } from '../types';

// Mock the shared modules to avoid import issues
jest.mock('../../shared', () => ({
  Validator: {
    isValidAgentId: jest.fn(() => true)
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  TimeUtils: {
    now: jest.fn(() => new Date('2025-01-09T12:00:00Z'))
  }
}));

describe('GuidelinesValidator', () => {
  let validator: GuidelinesValidator;
  let validGuideline: GuidelineDefinition;

  beforeEach(() => {
    validator = new GuidelinesValidator();

    validGuideline = {
      id: 'test-guideline',
      name: 'Test Guideline',
      description: 'A valid test guideline for unit testing',
      category: 'development',
      priority: 'medium',
      enabled: true,
      language: 'EN',
      protocol: {
        id: 'test-protocol',
        description: 'Test protocol for validation',
        steps: [
          {
            id: 'test-step-1',
            name: 'Test Step 1',
            description: 'First test step',
            type: 'inspector_analysis',
            required: true,
            outputs: ['analysis-result'],
            nextSteps: ['test-step-2']
          },
          {
            id: 'test-step-2',
            name: 'Test Step 2',
            description: 'Second test step',
            type: 'orchestrator_decision',
            required: true,
            outputs: ['decision-result'],
            nextSteps: []
          }
        ],
        decisionPoints: [
          {
            id: 'test-decision',
            question: 'Should we proceed with the test?',
            options: [
              {
                id: 'proceed',
                label: 'Proceed with test',
                action: 'continue',
                nextSteps: []
              },
              {
                id: 'stop',
                label: 'Stop test',
                action: 'halt',
                nextSteps: []
              }
            ],
            requiresInput: true
          }
        ],
        successCriteria: [
          'All steps completed successfully',
          'Decision made',
          'Results documented'
        ],
        fallbackActions: [
          'Retry failed steps',
          'Escalate to manual review'
        ]
      },
      requirements: [
        {
          type: 'service',
          name: 'Test Service',
          required: true,
          check: jest.fn(() => Promise.resolve(true)) as () => Promise<boolean>,
          errorMessage: 'Test service not available'
        }
      ],
      prompts: {
        inspector: 'This is a comprehensive test prompt for the inspector. It contains detailed instructions on how to analyze the test data and provide structured output. {{context}} {{stepId}}',
        orchestrator: 'This is a comprehensive test prompt for the orchestrator. It contains detailed instructions on how to make decisions based on inspector analysis. {{context}} {{stepId}}'
      },
      tokenLimits: {
        inspector: 5000,
        orchestrator: 8000
      },
      tools: ['test-tool', 'analysis-tool'],
      metadata: {
        version: '1.0.0',
        author: 'test-author',
        createdAt: new Date('2025-01-09T10:00:00Z'),
        lastModified: new Date('2025-01-09T11:00:00Z'),
        tags: ['test', 'validation'],
        dependencies: [],
        language: 'EN'
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Validation', () => {
    it('should validate a complete and valid guideline', async () => {
      const result = await validator.validateGuideline(validGuideline);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.guidelineId).toBe('test-guideline');
      expect(result.metadata?.validatorVersion).toBe('1.0.0');
    });

    it('should handle missing language field', async () => {
      const guidelineWithoutLanguage = { ...validGuideline };
      delete (guidelineWithoutLanguage as any).language;

      const result = await validator.validateGuideline(guidelineWithoutLanguage as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_LANGUAGE')).toBe(true);
      expect(result.errors.some(e => e.severity === ValidationSeverity.CRITICAL)).toBe(true);
    });

    it('should warn about unsupported languages', async () => {
      const guidelineWithUnsupportedLanguage = {
        ...validGuideline,
        language: 'FR'
      };

      const result = await validator.validateGuideline(guidelineWithUnsupportedLanguage);

      // Should still be valid but with a warning
      expect(result.warnings.some(e => e.code === 'UNSUPPORTED_LANGUAGE')).toBe(true);
    });
  });

  describe('ID Validation', () => {
    it('should reject invalid IDs', async () => {
      const guidelineWithInvalidId = {
        ...validGuideline,
        id: 'Invalid ID!'
      };

      // Mock the validator to return false for this ID
      const { Validator } = require('../../shared');
      Validator.isValidAgentId.mockReturnValue(false);

      const result = await validator.validateGuideline(guidelineWithInvalidId);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ID')).toBe(true);

      // Reset mock
      Validator.isValidAgentId.mockReturnValue(true);
    });

    it('should reject empty IDs', async () => {
      const guidelineWithEmptyId = {
        ...validGuideline,
        id: ''
      };

      const result = await validator.validateGuideline(guidelineWithEmptyId);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ID')).toBe(true);
    });
  });

  describe('Name Validation', () => {
    it('should reject names that are too short', async () => {
      const guidelineWithShortName = {
        ...validGuideline,
        name: 'AB'
      };

      const result = await validator.validateGuideline(guidelineWithShortName);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_NAME')).toBe(true);
    });

    it('should reject empty names', async () => {
      const guidelineWithEmptyName = {
        ...validGuideline,
        name: ''
      };

      const result = await validator.validateGuideline(guidelineWithEmptyName);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_NAME')).toBe(true);
    });
  });

  describe('Description Validation', () => {
    it('should reject descriptions that are too short', async () => {
      const guidelineWithShortDescription = {
        ...validGuideline,
        description: 'Short'
      };

      const result = await validator.validateGuideline(guidelineWithShortDescription);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DESCRIPTION')).toBe(true);
    });
  });

  describe('Category Validation', () => {
    it('should reject invalid categories', async () => {
      const guidelineWithInvalidCategory = {
        ...validGuideline,
        category: 'invalid-category' as any
      };

      const result = await validator.validateGuideline(guidelineWithInvalidCategory);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CATEGORY')).toBe(true);
    });
  });

  describe('Priority Validation', () => {
    it('should reject invalid priorities', async () => {
      const guidelineWithInvalidPriority = {
        ...validGuideline,
        priority: 'invalid-priority' as any
      };

      const result = await validator.validateGuideline(guidelineWithInvalidPriority);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PRIORITY')).toBe(true);
    });
  });

  describe('Token Limits Validation', () => {
    it('should reject inspector token limits that are too low', async () => {
      const guidelineWithLowInspectorLimit = {
        ...validGuideline,
        tokenLimits: {
          inspector: 0,
          orchestrator: 8000
        }
      };

      const result = await validator.validateGuideline(guidelineWithLowInspectorLimit);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_INSPECTOR_TOKEN_LIMIT')).toBe(true);
    });

    it('should reject inspector token limits that are too high', async () => {
      const guidelineWithHighInspectorLimit = {
        ...validGuideline,
        tokenLimits: {
          inspector: 200000,
          orchestrator: 8000
        }
      };

      const result = await validator.validateGuideline(guidelineWithHighInspectorLimit);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_INSPECTOR_TOKEN_LIMIT')).toBe(true);
    });

    it('should reject orchestrator token limits that are too low', async () => {
      const guidelineWithLowOrchestratorLimit = {
        ...validGuideline,
        tokenLimits: {
          inspector: 5000,
          orchestrator: -100
        }
      };

      const result = await validator.validateGuideline(guidelineWithLowOrchestratorLimit);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ORCHESTRATOR_TOKEN_LIMIT')).toBe(true);
    });
  });

  describe('Protocol Validation', () => {
    it('should reject guidelines without protocol', async () => {
      const guidelineWithoutProtocol = { ...validGuideline };
      delete (guidelineWithoutProtocol as any).protocol;

      const result = await validator.validateGuideline(guidelineWithoutProtocol as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_PROTOCOL')).toBe(true);
    });

    it('should reject protocols without steps', async () => {
      const guidelineWithoutSteps = {
        ...validGuideline,
        protocol: {
          ...validGuideline.protocol,
          steps: []
        }
      };

      const result = await validator.validateGuideline(guidelineWithoutSteps);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_PROTOCOL_STEPS')).toBe(true);
    });

    it('should validate step IDs', async () => {
      const guidelineWithInvalidStepId = {
        ...validGuideline,
        protocol: {
          ...validGuideline.protocol,
          steps: [
            {
              ...validGuideline.protocol.steps[0],
              id: 'Invalid Step!',
              name: 'Test Step'
            }
          ]
        }
      };

      // Mock the validator to return false for this step ID
      const { Validator } = require('../../shared');
      Validator.isValidAgentId.mockReturnValue(false);

      const result = await validator.validateGuideline(guidelineWithInvalidStepId as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_STEP_ID')).toBe(true);

      // Reset mock
      Validator.isValidAgentId.mockReturnValue(true);
    });
  });

  describe('Content Quality Validation', () => {
    it('should reject inspector prompts that are too short', async () => {
      const guidelineWithShortInspectorPrompt = {
        ...validGuideline,
        prompts: {
          inspector: 'Short',
          orchestrator: validGuideline.prompts.orchestrator
        }
      };

      const result = await validator.validateGuideline(guidelineWithShortInspectorPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'WEAK_INSPECTOR_PROMPT')).toBe(true);
    });

    it('should reject orchestrator prompts that are too short', async () => {
      const guidelineWithShortOrchestratorPrompt = {
        ...validGuideline,
        prompts: {
          inspector: validGuideline.prompts.inspector,
          orchestrator: 'Short'
        }
      };

      const result = await validator.validateGuideline(guidelineWithShortOrchestratorPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'WEAK_ORCHESTRATOR_PROMPT')).toBe(true);
    });
  });

  describe('Integration Validation', () => {
    it('should warn about missing tools', async () => {
      const guidelineWithoutTools = {
        ...validGuideline,
        tools: []
      };

      const result = await validator.validateGuideline(guidelineWithoutTools);

      // Should be valid but with warning
      expect(result.warnings.some(e => e.code === 'NO_TOOLS_SPECIFIED')).toBe(true);
    });

    it('should provide suggestions for missing requirements', async () => {
      const guidelineWithoutRequirements = {
        ...validGuideline,
        requirements: []
      };

      const result = await validator.validateGuideline(guidelineWithoutRequirements);

      // Should be valid but with suggestion
      expect(result.suggestions?.some(e => e.code === 'NO_REQUIREMENTS_SPECIFIED')).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    it('should warn about high token usage', async () => {
      const guidelineWithHighTokenUsage = {
        ...validGuideline,
        tokenLimits: {
          inspector: 60000,
          orchestrator: 60000
        }
      };

      const result = await validator.validateGuideline(guidelineWithHighTokenUsage);

      expect(result.warnings.some(e => e.code === 'HIGH_TOKEN_USAGE')).toBe(true);
    });

    it('should warn about protocols with too many steps', async () => {
      const manySteps = Array.from({ length: 15 }, (_, i) => ({
        id: `step-${i}`,
        name: `Step ${i}`,
        description: `Description for step ${i}`,
        type: 'inspector_analysis' as const,
        required: true,
        outputs: [`output-${i}`],
        nextSteps: i < 14 ? [`step-${i + 1}`] : []
      }));

      const guidelineWithManySteps = {
        ...validGuideline,
        protocol: {
          ...validGuideline.protocol,
          steps: manySteps
        }
      };

      const result = await validator.validateGuideline(guidelineWithManySteps);

      expect(result.warnings.some(e => e.code === 'MANY_STEPS')).toBe(true);
    });
  });

  describe('Validation History', () => {
    it('should track validation history', async () => {
      await validator.validateGuideline(validGuideline);

      const history = validator.getValidationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]?.guidelineId).toBe('test-guideline');
      expect(history[0]?.result.isValid).toBe(true);
    });

    it('should clear validation history', async () => {
      await validator.validateGuideline(validGuideline);
      expect(validator.getValidationHistory()).toHaveLength(1);

      validator.clearValidationHistory();
      expect(validator.getValidationHistory()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation exceptions gracefully', async () => {
      // Create a guideline that will cause an exception during validation
      const problematicGuideline = {
        ...validGuideline,
        // This will cause an exception when accessed
        get id() {
          throw new Error('Validation error');
        }
      } as any;

      const result = await validator.validateGuideline(problematicGuideline);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VALIDATION_EXCEPTION')).toBe(true);
      expect(result.errors[0]?.fixable).toBe(false);
    });
  });

  describe('Version Management', () => {
    it('should report validator version', () => {
      const version = validator.getVersion();
      expect(version).toBe('1.0.0');
    });
  });
});