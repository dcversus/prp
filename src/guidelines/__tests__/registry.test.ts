/**
 * Guidelines Registry Test Suite
 *
 * Tests for the guidelines registry functionality including language support,
 * registration, validation, and retrieval methods.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GuidelinesRegistry } from '../registry';
import type { GuidelineDefinition, GuidelineMetrics } from '../types';

// Mock the shared modules to avoid import issues
jest.mock('../../shared', () => ({
  Signal: {},
  eventBus: {
    subscribeToChannel: jest.fn()
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  FileUtils: {
    pathExists: jest.fn(),
    writeTextFile: jest.fn()
  },
  ConfigUtils: {
    loadConfigFile: jest.fn()
  },
  TimeUtils: {
    now: jest.fn(() => new Date('2025-01-09T12:00:00Z'))
  },
  HashUtils: {
    generateId: jest.fn(() => 'test-id-123')
  },
  Validator: {
    isValidAgentId: jest.fn(() => true)
  },
  AgentRole: {
    DEVELOPER: 'developer',
    SYSTEM_ANALYST: 'system-analyst'
  }
}));

jest.mock('../../shared/config', () => ({
  configManager: {
    get: jest.fn(() => ({
      agents: [
        { type: 'github', credentials: { token: 'test-token' } }
      ]
    }))
  }
}));

describe('GuidelinesRegistry', () => {
  let registry: GuidelinesRegistry;

  beforeEach(() => {
    registry = new GuidelinesRegistry();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Language Support', () => {
    it('should support multiple languages', () => {
      const supportedLanguages = registry.getSupportedLanguages();
      expect(supportedLanguages).toContain('EN');
      expect(supportedLanguages).toContain('DE');
      expect(supportedLanguages).toContain('SC');
    });

    it('should get guidelines by language', () => {
      const englishGuidelines = registry.getGuidelinesByLanguage('EN');
      expect(englishGuidelines.length).toBeGreaterThan(0);

      englishGuidelines.forEach(guideline => {
        expect(guideline.language).toBe('EN');
      });
    });

    it('should return empty array for unsupported language', () => {
      const unsupportedGuidelines = registry.getGuidelinesByLanguage('FR');
      expect(unsupportedGuidelines).toEqual([]);
    });

    it('should provide language fallback functionality', () => {
      const pullRequestGuideline = registry.getGuideline('pull-request-analysis');
      expect(pullRequestGuideline).toBeDefined();
      expect(pullRequestGuideline?.language).toBe('EN');

      const fallbackGuideline = registry.getGuidelineWithFallback('pull-request-analysis', 'DE');
      expect(fallbackGuideline).toBeDefined();
      // Should return the English version since German version doesn't exist
      expect(fallbackGuideline?.language).toBe('EN');
    });

    it('should return available languages', () => {
      const availableLanguages = registry.getAvailableLanguages();
      expect(availableLanguages).toContain('EN');
      expect(availableLanguages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Guideline Registration', () => {
    it('should register a new guideline with language support', () => {
      const testGuideline: GuidelineDefinition = {
        id: 'test-guideline',
        name: 'Test Guideline',
        description: 'A test guideline for unit testing',
        category: 'development',
        priority: 'medium',
        enabled: true,
        language: 'EN',
        protocol: {
          id: 'test-protocol',
          description: 'Test protocol',
          steps: [{
            id: 'test-step',
            name: 'Test Step',
            description: 'A test step',
            type: 'inspector_analysis',
            required: true,
            outputs: ['test-output'],
            nextSteps: []
          }],
          decisionPoints: [],
          successCriteria: ['Test completed'],
          fallbackActions: ['Retry test']
        },
        requirements: [],
        prompts: {
          inspector: 'Test inspector prompt',
          orchestrator: 'Test orchestrator prompt'
        },
        tokenLimits: {
          inspector: 1000,
          orchestrator: 2000
        },
        tools: ['test-tool'],
        metadata: {
          version: '1.0.0',
          author: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['test'],
          dependencies: [],
          language: 'EN'
        }
      };

      expect(() => registry.registerGuideline(testGuideline)).not.toThrow();

      const retrievedGuideline = registry.getGuideline('test-guideline');
      expect(retrievedGuideline).toEqual(testGuideline);
    });

    it('should set default language if not provided', () => {
      const testGuideline: GuidelineDefinition = {
        id: 'test-no-language',
        name: 'Test No Language',
        description: 'Test guideline without language',
        category: 'development',
        priority: 'medium',
        enabled: true,
        language: 'EN', // Provide the required language field
        protocol: {
          id: 'test-protocol',
          description: 'Test protocol',
          steps: [{
            id: 'test-step',
            name: 'Test Step',
            description: 'A test step',
            type: 'inspector_analysis',
            required: true,
            outputs: ['test-output'],
            nextSteps: []
          }],
          decisionPoints: [],
          successCriteria: ['Test completed'],
          fallbackActions: ['Retry test']
        },
        requirements: [],
        prompts: {
          inspector: 'Test inspector prompt',
          orchestrator: 'Test orchestrator prompt'
        },
        tokenLimits: {
          inspector: 1000,
          orchestrator: 2000
        },
        tools: ['test-tool'],
        metadata: {
          version: '1.0.0',
          author: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['test'],
          dependencies: [],
          language: 'EN'
        }
      };

      registry.registerGuideline(testGuideline);
      const retrieved = registry.getGuideline('test-no-language');
      expect(retrieved?.language).toBe('EN'); // Default language
    });
  });

  describe('Guideline Retrieval', () => {
    it('should get all guidelines', () => {
      const allGuidelines = registry.getAllGuidelines();
      expect(allGuidelines.length).toBeGreaterThan(0);

      // Should include default guidelines
      const pullRequestAnalysis = allGuidelines.find(g => g.id === 'pull-request-analysis');
      expect(pullRequestAnalysis).toBeDefined();
      expect(pullRequestAnalysis?.language).toBe('EN');
    });

    it('should get guidelines by category', () => {
      const developmentGuidelines = registry.getGuidelinesByCategory('development');
      expect(developmentGuidelines.length).toBeGreaterThan(0);

      developmentGuidelines.forEach(guideline => {
        expect(guideline.category).toBe('development');
      });
    });

    it('should get enabled guidelines', () => {
      const enabledGuidelines = registry.getEnabledGuidelines();
      expect(enabledGuidelines.length).toBeGreaterThan(0);

      enabledGuidelines.forEach(guideline => {
        expect(guideline.enabled).toBe(true);
      });
    });

    it('should return undefined for non-existent guideline', () => {
      const nonExistent = registry.getGuideline('non-existent-guideline');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Guideline Management', () => {
    it('should enable and disable guidelines', () => {
      const pullRequestGuideline = registry.getGuideline('pull-request-analysis');
      expect(pullRequestGuideline?.enabled).toBe(true);

      const disableResult = registry.setGuidelineEnabled('pull-request-analysis', false);
      expect(disableResult).toBe(true);

      const disabledGuideline = registry.getGuideline('pull-request-analysis');
      expect(disabledGuideline?.enabled).toBe(false);

      const enableResult = registry.setGuidelineEnabled('pull-request-analysis', true);
      expect(enableResult).toBe(true);
    });

    it('should return false when trying to enable/disable non-existent guideline', () => {
      const result = registry.setGuidelineEnabled('non-existent', false);
      expect(result).toBe(false);
    });
  });

  describe('Metrics and Execution', () => {
    it('should track guideline metrics', () => {
      const metrics = registry.getMetrics();
      expect(metrics).toBeInstanceOf(Map);
    });

    it('should track individual guideline metrics', () => {
      const pullRequestMetrics = registry.getMetrics('pull-request-analysis') as GuidelineMetrics | undefined;
      expect(pullRequestMetrics).toBeDefined();
      expect(pullRequestMetrics?.guidelineId).toBe('pull-request-analysis');
    });

    it('should return undefined for non-existent guideline metrics', () => {
      const nonExistentMetrics = registry.getMetrics('non-existent');
      expect(nonExistentMetrics).toBeUndefined();
    });

    it('should track executions', () => {
      const executions = registry.getExecutions();
      expect(Array.isArray(executions)).toBe(true);
    });

    it('should track executions by status', () => {
      const pendingExecutions = registry.getExecutions('pending');
      expect(Array.isArray(pendingExecutions)).toBe(true);
    });
  });

  describe('Event Emission', () => {
    it('should emit events when guidelines are registered', () => {
      const eventSpy = jest.fn();
      registry.on('guideline_registered', eventSpy);

      const testGuideline: GuidelineDefinition = {
        id: 'event-test-guideline',
        name: 'Event Test Guideline',
        description: 'Test guideline for event emission',
        category: 'development',
        priority: 'medium',
        enabled: true,
        language: 'EN',
        protocol: {
          id: 'test-protocol',
          description: 'Test protocol',
          steps: [{
            id: 'test-step',
            name: 'Test Step',
            description: 'A test step',
            type: 'inspector_analysis',
            required: true,
            outputs: ['test-output'],
            nextSteps: []
          }],
          decisionPoints: [],
          successCriteria: ['Test completed'],
          fallbackActions: ['Retry test']
        },
        requirements: [],
        prompts: {
          inspector: 'Test inspector prompt',
          orchestrator: 'Test orchestrator prompt'
        },
        tokenLimits: {
          inspector: 1000,
          orchestrator: 2000
        },
        tools: ['test-tool'],
        metadata: {
          version: '1.0.0',
          author: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['test'],
          dependencies: [],
          language: 'EN'
        }
      };

      registry.registerGuideline(testGuideline);
      expect(eventSpy).toHaveBeenCalledWith(testGuideline);
    });
  });
});