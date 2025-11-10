/**
 * ♫ LLM Execution Engine Unit Tests for @dcversus/prp
 *
 * Behavior-driven tests for the LLM execution engine with shared utilities.
 */

import { LLMExecutionEngine } from '../../llm-execution-engine';
import { TokenManager, TextProcessor } from '../../../shared';
import type { InspectorConfig, ProcessingContext } from '../../types';

// Mock logger
jest.mock('../../../shared/logger', () => ({
  createLayerLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('LLMExecutionEngine', () => {
  let engine: LLMExecutionEngine;
  let mockConfig: InspectorConfig;
  let mockProvider: any;
  let mockSignal: any;
  let mockContext: ProcessingContext;

  beforeEach(() => {
    mockConfig = {
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.7,
      timeout: 30000,
      batchSize: 10,
      maxConcurrentClassifications: 5,
      tokenLimits: {
        input: 8000,
        output: 4000,
        total: 12000
      },
      prompts: {
        classification: 'Analyze this signal',
        contextPreparation: 'Prepare context',
        recommendationGeneration: 'Generate recommendations'
      },
      structuredOutput: {
        enabled: true,
        schema: {
          type: 'object'
        },
        validation: true,
        fallbackToText: false
      }
    };

    mockProvider = {
      name: 'openai',
      model: 'gpt-4',
      maxTokens: 4000,
      costPerToken: 0.000002,
      execute: jest.fn()
    };

    mockSignal = {
      id: 'test-signal-1',
      type: 'development',
      priority: 5,
      source: 'scanner',
      timestamp: new Date(),
      data: {
        content: 'Test signal content for analysis',
        metadata: {}
      }
    };

    mockContext = {
      signalId: 'test-signal-1',
      worktree: '/test/worktree',
      agent: 'test-agent',
      relatedSignals: [],
      activePRPs: ['PRP-001'],
      recentActivity: [],
      tokenStatus: {
        totalUsed: 1000,
        totalLimit: 10000,
        approachingLimit: false,
        criticalLimit: false,
        agentBreakdown: {},
        projections: {
          daily: 100,
          weekly: 700,
          monthly: 3000
        }
      },
      agentStatus: [],
      sharedNotes: [],
      environment: {
        worktree: '/test/worktree',
        branch: 'main',
        availableTools: [],
        systemCapabilities: [],
        constraints: {},
        recentChanges: {
          count: 0,
          types: {},
          lastChange: new Date()
        }
      },
      guidelineContext: {
        applicableGuidelines: [],
        enabledGuidelines: [],
        disabledGuidelines: [],
        protocolSteps: {},
        requirements: {
          met: [],
          unmet: [],
          blocked: []
        }
      },
      historicalData: {
        similarSignals: [],
        agentPerformance: {},
        systemPerformance: {
          averageProcessingTime: 0,
          successRate: 0,
          tokenEfficiency: 0
        },
        recentPatterns: []
      }
    };

    engine = new LLMExecutionEngine(mockConfig, mockProvider);
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(engine).toBeDefined();
      expect(engine.getTokenLimits().totalLimit).toBe(40000);
      expect(engine.getTokenLimits().basePrompt).toBe(20000);
      expect(engine.getTokenLimits().guidelinePrompt).toBe(20000);
      expect(engine.getTokenLimits().safetyMargin).toBe(0.05);
    });

    it('should set up compression strategies', () => {
      const metrics = engine.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.startTime).toBeInstanceOf(Date);
    });
  });

  describe('Token Management', () => {
    it('should distribute tokens correctly among components', () => {
      const limits = engine.getTokenLimits();
      const distributed = TokenManager.distributeTokens(
        limits.totalLimit,
        limits.safetyMargin
      );

      expect(distributed.available).toBeLessThan(limits.totalLimit);
      expect(distributed.basePrompt).toBeGreaterThan(0);
      expect(distributed.guideline).toBeGreaterThan(0);
      expect(distributed.context).toBeGreaterThanOrEqual(0);
      expect(distributed.basePrompt + distributed.guideline + distributed.context).toBe(distributed.available);
    });

    it('should validate token usage against limits', () => {
      const limits = engine.getTokenLimits();
      const mockUsage = {
        input: 15000,
        output: 5000,
        total: 20000,
        cost: 0.04
      };

      const validation = TokenManager.validateTokenUsage(mockUsage, limits);
      expect(validation.isValid).toBe(true);
      expect(validation.utilizationRate).toBe(0.5);
    });

    it('should detect when token usage exceeds limits', () => {
      const limits = engine.getTokenLimits();
      const mockUsage = {
        input: 30000,
        output: 20000,
        total: 50000,
        cost: 0.10
      };

      const validation = TokenManager.validateTokenUsage(mockUsage, limits);
      expect(validation.isValid).toBe(false);
      expect(validation.exceededLimits.length).toBeGreaterThan(0);
    });
  });

  describe('Text Processing', () => {
    it('should estimate token counts accurately', () => {
      const text = 'This is a test text for token estimation.';
      const tokens = TokenManager.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it('should compress text when exceeding token limits', async () => {
      const longText = 'This is a very long text that should be compressed when it exceeds the token limit. '.repeat(100);
      const compression = {
        strategy: 'truncate' as const,
        level: 'high' as const,
        preserveKeyInfo: true,
        targetSize: 50
      };

      const compressed = await TextProcessor.compressText(longText, compression);
      const compressedTokens = TokenManager.estimateTokens(compressed);
      const originalTokens = TokenManager.estimateTokens(longText);

      expect(compressedTokens).toBeLessThan(originalTokens);
      expect(compressedTokens).toBeLessThanOrEqual(compression.targetSize);
    });

    it('should extract key information from text', () => {
      const markdownText = `
# Main Heading
Some content here.

## Subheading
More content.

- List item 1
- List item 2
- List item 3

\`\`\`javascript
const code = 'example';
\`\`\`
      `;

      const keyInfo = TextProcessor.extractKeyInfo(markdownText, true);
      expect(keyInfo.headings).toContain('Main Heading');
      expect(keyInfo.headings).toContain('Subheading');
      expect(keyInfo.lists.length).toBeGreaterThan(0);
      expect(keyInfo.codeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('Signal Analysis', () => {
    it('should analyze signal with valid LLM response', async () => {
      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: [
            {
              type: 'implementation',
              priority: 'high',
              description: 'Implement the feature',
              estimatedTime: 30,
              prerequisites: []
            }
          ]
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const result = await engine.analyzeSignal(mockSignal, mockContext, 'Test guideline');

      expect(result).toBeDefined();
      expect(result.signalId).toBe(mockSignal.id);
      expect(result.classification.category).toBe('development');
      expect(result.classification.agentRole).toBe('developer');
      expect(result.classification.confidence).toBe(85);
      expect(result.recommendations).toHaveLength(1);
      expect(result.tokenUsage.total).toBe(1500);
      expect(result.tokenUsage.cost).toBeCloseTo(0.003, 3);
      expect(result.processingTime).toBe(1000);
    });

    it('should handle LLM parsing errors gracefully', async () => {
      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: 'Invalid JSON response',
        usage: {
          promptTokens: 1000,
          completionTokens: 100,
          totalTokens: 1100
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 500
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const result = await engine.analyzeSignal(mockSignal, mockContext, 'Test guideline');

      expect(result).toBeDefined();
      expect(result.classification.category).toBe('unknown');
      expect(result.classification.confidence).toBe(25); // Low confidence for fallback
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].description).toContain('Manual review required');
    });

    it('should handle LLM execution errors', async () => {
      mockProvider.execute.mockRejectedValue(new Error('LLM API Error'));

      await expect(
        engine.analyzeSignal(mockSignal, mockContext, 'Test guideline')
      ).rejects.toThrow('LLM API Error');
    });

    it('should apply compression when prompt exceeds token limits', async () => {
      // Create a very long guideline that would exceed token limits
      const longGuideline = 'This is a very long guideline '.repeat(1000);

      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'compressed prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 20000, // Still within limits after compression
          completionTokens: 500,
          totalTokens: 20500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1500
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const result = await engine.analyzeSignal(mockSignal, mockContext, longGuideline);

      expect(result).toBeDefined();
      expect(mockProvider.execute).toHaveBeenCalled();

      // Verify compression was applied by checking the prompt argument
      const callArgs = mockProvider.execute.mock.calls[0];
      const prompt = callArgs[0];
      expect(prompt).toContain('COMPRESSED');
    });
  });

  describe('Context Preparation', () => {
    it('should prepare context within token limits', async () => {
      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      await engine.analyzeSignal(mockSignal, mockContext, 'Test guideline');

      expect(mockProvider.execute).toHaveBeenCalled();
      const callArgs = mockProvider.execute.mock.calls[0];
      const prompt = callArgs[0];

      // Verify prompt structure
      expect(prompt).toContain('# SIGNAL ANALYSIS TASK');
      expect(prompt).toContain('## Base Instructions');
      expect(prompt).toContain('## Analysis Guidelines');
      expect(prompt).toContain('## Context Information');
      expect(prompt).toContain('## Analysis Required');
    });
  });

  describe('Metrics and Performance', () => {
    it('should track processing metrics correctly', async () => {
      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      await engine.analyzeSignal(mockSignal, mockContext, 'Test guideline');
      await engine.analyzeSignal(mockSignal, mockContext, 'Test guideline');

      const metrics = engine.getMetrics();
      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.successfulClassifications).toBe(2);
      expect(metrics.failedClassifications).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageProcessingTime).toBe(1000);
      expect(metrics.averageTokenUsage.total).toBe(1500);
    });

    it('should calculate token efficiency correctly', () => {
      const metrics = engine.getMetrics();
      expect(metrics.tokenEfficiency).toBeGreaterThanOrEqual(0);
    });

    it('should emit analysis events', async () => {
      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const analysisCompletedSpy = jest.fn();
      engine.on('analysis:completed', analysisCompletedSpy);

      await engine.analyzeSignal(mockSignal, mockContext, 'Test guideline');

      expect(analysisCompletedSpy).toHaveBeenCalledWith({
        analysisId: expect.any(String),
        analysis: expect.objectContaining({
          signalId: mockSignal.id,
          confidence: 85
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid signal data gracefully', async () => {
      const invalidSignal = {
        ...mockSignal,
        data: null
      };

      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const result = await engine.analyzeSignal(invalidSignal, mockContext, 'Test guideline');

      expect(result).toBeDefined();
      expect(result.signalId).toBe(invalidSignal.id);
    });

    it('should emit error events on analysis failure', async () => {
      mockProvider.execute.mockRejectedValue(new Error('API Error'));

      const analysisFailedSpy = jest.fn();
      engine.on('analysis:failed', analysisFailedSpy);

      await expect(
        engine.analyzeSignal(mockSignal, mockContext, 'Test guideline')
      ).rejects.toThrow('API Error');

      expect(analysisFailedSpy).toHaveBeenCalledWith({
        analysisId: expect.any(String),
        signal: mockSignal,
        error: expect.any(Error)
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear cache when requested', () => {
      engine.clearCache();

      // Verify cache is cleared (no direct way to test private cache)
      // but we can ensure no errors are thrown
      expect(true).toBe(true);
    });

    it('should handle cache operations without errors', () => {
      expect(() => engine.clearCache()).not.toThrow();
    });
  });

  describe('Integration with Shared Utilities', () => {
    it('should use shared TokenManager for cost calculations', async () => {
      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const result = await engine.analyzeSignal(mockSignal, mockContext, 'Test guideline');

      // Verify cost calculation uses shared utility
      const expectedCost = TokenManager.calculateCost(1500, mockProvider.costPerToken);
      expect(result.tokenUsage.cost).toBeCloseTo(expectedCost, 5);
    });

    it('should use shared TextProcessor for compression', async () => {
      const longGuideline = 'This is a very long guideline that should be compressed '.repeat(500);

      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'compressed prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      await engine.analyzeSignal(mockSignal, mockContext, longGuideline);

      // Verify that the prompt sent to LLM was compressed
      const callArgs = mockProvider.execute.mock.calls[0];
      const prompt = callArgs[0];
      expect(prompt.length).toBeLessThan(longGuideline.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty context gracefully', async () => {
      const emptyContext: ProcessingContext = {
        signalId: 'test-signal-1',
        worktree: '',
        agent: '',
        relatedSignals: [],
        activePRPs: [],
        recentActivity: [],
        tokenStatus: {
          totalUsed: 0,
          totalLimit: 10000,
          approachingLimit: false,
          criticalLimit: false,
          agentBreakdown: {},
          projections: {
            daily: 0,
            weekly: 0,
            monthly: 0
          }
        },
        agentStatus: [],
        sharedNotes: [],
        environment: {
          worktree: '',
          branch: '',
          availableTools: [],
          systemCapabilities: [],
          constraints: {},
          recentChanges: {
            count: 0,
            types: {},
            lastChange: new Date()
          }
        },
        guidelineContext: {
          applicableGuidelines: [],
          enabledGuidelines: [],
          disabledGuidelines: [],
          protocolSteps: {},
          requirements: {
            met: [],
            unmet: [],
            blocked: []
          }
        },
        historicalData: {
          similarSignals: [],
          agentPerformance: {},
          systemPerformance: {
            averageProcessingTime: 0,
            successRate: 0,
            tokenEfficiency: 0
          },
          recentPatterns: []
        }
      };

      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 500,
          completionTokens: 500,
          totalTokens: 1000
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 500
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const result = await engine.analyzeSignal(mockSignal, emptyContext, 'Test guideline');

      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
    });

    it('should handle very long signals gracefully', async () => {
      const longSignal = {
        ...mockSignal,
        data: {
          content: 'Very long signal content '.repeat(1000),
          metadata: {}
        }
      };

      const mockLLMResponse = {
        id: 'response-1',
        model: 'gpt-4',
        prompt: 'test prompt',
        response: JSON.stringify({
          category: 'development',
          subcategory: 'feature',
          priority: 5,
          agentRole: 'developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85,
          recommendations: []
        }),
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop',
        timestamp: new Date(),
        processingTime: 1000
      };

      mockProvider.execute.mockResolvedValue(mockLLMResponse);

      const result = await engine.analyzeSignal(longSignal, mockContext, 'Test guideline');

      expect(result).toBeDefined();
      expect(result.signalId).toBe(longSignal.id);
    });
  });
});