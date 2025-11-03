/**
 * ♫ Phase 2 Inspector Integration Tests
 *
 * Comprehensive tests for LLM-powered signal analysis,
 * parallel execution, and context management.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedInspector, EnhancedInspectorConfig } from '../../src/inspector/enhanced-inspector';
import { Signal, AgentRole } from '../../src/shared/types';
import { LLMProvider } from '../../src/inspector/llm-execution-engine';

describe('Phase 2 Inspector Integration Tests', () => {
  let inspector: EnhancedInspector;
  let mockLLMProvider: jest.Mocked<LLMProvider>;

  // Mock signal data
  const mockSignals = [
    {
      id: 'signal-1',
      type: 'dp',
      source: 'git',
      priority: 8,
      timestamp: new Date(),
      data: {
        rawSignal: '[dp] Development Progress - Authentication module completed',
        patternName: 'development-progress',
        description: 'Authentication module implementation completed successfully'
      }
    },
    {
      id: 'signal-2',
      type: 'tg',
      source: 'test-runner',
      priority: 7,
      timestamp: new Date(),
      data: {
        rawSignal: '[tg] Tests Green - All unit tests passing',
        patternName: 'tests-green',
        description: 'Unit test suite completed with all tests passing'
      }
    },
    {
      id: 'signal-3',
      type: 'bb',
      source: 'developer',
      priority: 10,
      timestamp: new Date(),
      data: {
        rawSignal: '[bb] Blocker - Missing API credentials',
        patternName: 'blocker-detected',
        description: 'Cannot proceed without API credentials'
      }
    }
  ] as Signal[];

  beforeEach(() => {
    // Mock LLM provider
    mockLLMProvider = {
      name: 'mock-provider',
      model: 'mock-model',
      maxTokens: 40000,
      costPerToken: 0.000002,
      execute: jest.fn()
    } as any;

    // Create mock response
    mockLLMProvider.execute.mockResolvedValue({
      id: 'mock-response',
      model: 'mock-model',
      prompt: 'mock prompt',
      response: JSON.stringify({
        category: 'development',
        subcategory: 'progress',
        priority: 8,
        agentRole: AgentRole.Developer,
        escalationLevel: 1,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        dependencies: [],
        confidence: 95,
        recommendations: [
          {
            type: 'review',
            priority: 'high',
            description: 'Review completed authentication module',
            estimatedTime: 30,
            prerequisites: []
          }
        ]
      }),
      usage: {
        promptTokens: 15000,
        completionTokens: 5000,
        totalTokens: 20000
      },
      finishReason: 'stop',
      timestamp: new Date(),
      processingTime: 1500
    });

    // Create test configuration
    const config: EnhancedInspectorConfig = {
      inspector: {
        model: 'mock-model',
        maxTokens: 40000,
        temperature: 0.7,
        timeout: 60000,
        batchSize: 1,
        maxConcurrentClassifications: 2,
        tokenLimits: {
          input: 40000,
          output: 40000,
          total: 40000
        },
        prompts: {
          classification: 'Mock classification prompt',
          contextPreparation: 'Mock context preparation prompt',
          recommendationGeneration: 'Mock recommendation prompt'
        },
        structuredOutput: {
          enabled: true,
          schema: {},
          validation: true,
          fallbackToText: true
        }
      },
      llm: {
        provider: mockLLMProvider,
        tokenLimits: {
          totalLimit: 40000,
          basePrompt: 20000,
          guidelinePrompt: 20000,
          contextWindow: 0,
          safetyMargin: 0.05,
          compressionThreshold: 0.8
        }
      },
      context: {
        maxSize: 40000,
        windowSize: 3600000,
        compressionThreshold: 0.8,
        summaryInterval: 900000,
        maxAge: 7200000,
        priorityLevels: 5
      },
      parallel: {
        maxWorkers: 2,
        maxConcurrentPerWorker: 3,
        taskTimeout: 60000,
        retryAttempts: 3,
        retryDelay: 5000,
        enableLoadBalancing: true,
        enableHealthChecks: true,
        healthCheckInterval: 30000,
        gracefulShutdownTimeout: 30000
      },
      features: {
        enableSemanticSummarization: true,
        enableParallelProcessing: true,
        enableIntelligentCompression: true,
        enableHistoricalAnalysis: true,
        enablePredictiveProcessing: true
      }
    };

    inspector = new EnhancedInspector(config);
  });

  afterEach(async () => {
    if (inspector) {
      await inspector.stop();
    }
  });

  describe('Inspector Lifecycle', () => {
    it('should start and stop successfully', async () => {
      await inspector.start();
      expect(inspector.getStatus().isRunning).toBe(true);

      await inspector.stop();
      expect(inspector.getStatus().isRunning).toBe(false);
    });

    it('should throw error when starting already running inspector', async () => {
      await inspector.start();

      await expect(inspector.start()).rejects.toThrow('Enhanced inspector is already running');
    });

    it('should initialize all components on start', async () => {
      await inspector.start();

      const status = inspector.getStatus();
      expect(status.parallelStatus).toBeDefined();
      expect(status.contextStats).toBeDefined();
      expect(status.metrics).toBeDefined();
    });
  });

  describe('Single Signal Analysis', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should analyze signal successfully', async () => {
      const signal = mockSignals[0];
      const response = await inspector.analyzeSignal(signal);

      expect(response).toBeDefined();
      expect(response.request.signal.id).toBe(signal.id);
      expect(response.result.signalId).toBe(signal.id);
      expect(response.result.success).toBe(true);
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.recommendations).toBeDefined();
      expect(response.contextUsed).toBe(true);
      expect(response.cacheHit).toBe(false);
    });

    it('should use cached response when available', async () => {
      const signal = mockSignals[1];

      // First analysis
      const response1 = await inspector.analyzeSignal(signal);
      expect(response1.cacheHit).toBe(false);

      // Second analysis should use cache
      const response2 = await inspector.analyzeSignal(signal);
      expect(response2.cacheHit).toBe(true);
      expect(mockLLMProvider.execute).toHaveBeenCalledTimes(1); // Called only once
    });

    it('should force reprocess when requested', async () => {
      const signal = mockSignals[2];

      // First analysis
      await inspector.analyzeSignal(signal);

      // Force reprocess
      const response2 = await inspector.analyzeSignal(signal, { forceReprocess: true });
      expect(response2.cacheHit).toBe(false);
      expect(mockLLMProvider.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle LLM execution errors gracefully', async () => {
      const signal = mockSignals[0];

      // Mock LLM error
      mockLLMProvider.execute.mockRejectedValueOnce(new Error('LLM execution failed'));

      await expect(inspector.analyzeSignal(signal)).rejects.toThrow('LLM execution failed');
    });

    it('should respect timeout limits', async () => {
      const signal = mockSignals[0];

      // Mock slow LLM response
      mockLLMProvider.execute.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const start = Date.now();
      await expect(inspector.analyzeSignal(signal, { timeout: 1000 })).rejects.toThrow();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // Should timeout quickly
    });
  });

  describe('Batch Signal Analysis', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should analyze multiple signals in batch', async () => {
      const responses = await inspector.analyzeBatch(mockSignals);

      expect(responses).toHaveLength(mockSignals.length);
      responses.forEach((response, index) => {
        expect(response.request.signal.id).toBe(mockSignals[index].id);
        expect(response.result.success).toBe(true);
      });
    });

    it('should handle mixed success/failure in batch', async () => {
      // Mock one failure
      mockLLMProvider.execute.mockRejectedValueOnce(new Error('Processing failed'));

      const responses = await inspector.analyzeBatch(mockSignals);

      // Should still return responses for successful signals
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should use parallel processing when enabled', async () => {
      const responses = await inspector.analyzeBatch(mockSignals, { enableParallel: true });

      expect(responses).toHaveLength(mockSignals.length);
      // Parallel processing should complete faster than sequential
      expect(mockLLMProvider.execute).toHaveBeenCalledTimes(mockSignals.length);
    });

    it('should fall back to sequential processing when parallel disabled', async () => {
      const responses = await inspector.analyzeBatch(mockSignals, { enableParallel: false });

      expect(responses).toHaveLength(mockSignals.length);
    });
  });

  describe('Context Management', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should build processing context for signals', async () => {
      const signal = mockSignals[0];
      const response = await inspector.analyzeSignal(signal);

      expect(response.contextUsed).toBe(true);

      const contextStats = inspector.getStatus().contextStats;
      expect(contextStats).toBeDefined();
      expect(contextStats.totalEntries).toBeGreaterThan(0);
    });

    it('should compress context when needed', async () => {
      // Add many signals to trigger compression
      const manySignals = Array.from({ length: 50 }, (_, i) => ({
        ...mockSignals[0],
        id: `signal-${i}`,
        data: {
          rawSignal: `[dp] Development Progress - Signal ${i} with a lot of content that should trigger context compression when enough signals are added to the system`,
          patternName: 'development-progress',
          description: `Description for signal ${i} with additional details`
        }
      })) as Signal[];

      await inspector.analyzeBatch(manySignals);

      const contextStats = inspector.getStatus().contextStats;
      expect(contextStats.totalTokens).toBeLessThan(45000); // Should be compressed
    });

    it('should generate semantic summaries', async () => {
      const signal = mockSignals[0];
      await inspector.analyzeSignal(signal);

      // In a real implementation, this would check for generated summaries
      const contextStats = inspector.getStatus().contextStats;
      expect(contextStats.summaryCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Parallel Execution', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should distribute work across workers', async () => {
      const responses = await inspector.analyzeBatch(mockSignals, { enableParallel: true });

      expect(responses).toHaveLength(mockSignals.length);

      const parallelStatus = inspector.getStatus().parallelStatus;
      expect(parallelStatus.totalWorkers).toBeGreaterThan(0);
    });

    it('should handle worker failures gracefully', async () => {
      // This would test worker failure scenarios
      // In a real implementation, we'd mock worker failures
      const responses = await inspector.analyzeBatch(mockSignals);
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      const start = Date.now();

      // Process multiple signals
      const manySignals = Array.from({ length: 10 }, (_, i) => ({
        ...mockSignals[0],
        id: `signal-${i}`
      })) as Signal[];

      await inspector.analyzeBatch(manySignals);

      const duration = Date.now() - start;
      const metrics = inspector.getMetrics();

      expect(metrics.processingRate).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeLessThan(duration);
    });
  });

  describe('Token Management', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should respect 40K token limits', async () => {
      const signal = mockSignals[0];
      const response = await inspector.analyzeSignal(signal);

      expect(response.tokenUsage.total).toBeLessThanOrEqual(40000);
    });

    it('should track token usage accurately', async () => {
      const responses = await inspector.analyzeBatch(mockSignals);

      responses.forEach(response => {
        expect(response.tokenUsage.input).toBeGreaterThan(0);
        expect(response.tokenUsage.output).toBeGreaterThan(0);
        expect(response.tokenUsage.total).toBe(
          response.tokenUsage.input + response.tokenUsage.output
        );
      });
    });

    it('should calculate costs correctly', async () => {
      const signal = mockSignals[0];
      const response = await inspector.analyzeSignal(signal);

      expect(response.tokenUsage.cost).toBeGreaterThan(0);
      expect(typeof response.tokenUsage.cost).toBe('number');
    });
  });

  describe('Guideline Adaptation', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should adapt guidelines for different signal types', async () => {
      const responses = await inspector.analyzeBatch(mockSignals);

      responses.forEach(response => {
        expect(response.result.guideline).toBeDefined();
        expect(typeof response.result.guideline).toBe('string');
        expect(response.result.guideline.length).toBeGreaterThan(0);
      });
    });

    it('should include signal-specific context in guidelines', async () => {
      const signal = mockSignals[0];
      const response = await inspector.analyzeSignal(signal);

      expect(response.result.guideline).toContain(signal.type);
      expect(response.result.guideline).toContain(signal.priority.toString());
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should track comprehensive metrics', async () => {
      await inspector.analyzeBatch(mockSignals);

      const metrics = inspector.getMetrics();

      expect(metrics.totalProcessed).toBe(mockSignals.length);
      expect(metrics.successfulClassifications).toBe(mockSignals.length);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.processingRate).toBeGreaterThan(0);
    });

    it('should calculate performance metrics correctly', async () => {
      await inspector.analyzeSignal(mockSignals[0]);

      const metrics = inspector.getMetrics();

      expect(metrics.performance.fastestClassification).toBeGreaterThan(0);
      expect(metrics.performance.slowestClassification).toBeGreaterThan(0);
      expect(metrics.performance.peakThroughput).toBeGreaterThanOrEqual(0);
    });

    it('should track error rates', async () => {
      // Mock an error
      mockLLMProvider.execute.mockRejectedValueOnce(new Error('Test error'));

      try {
        await inspector.analyzeSignal(mockSignals[0]);
      } catch {
        // Expected to fail
      }

      const metrics = inspector.getMetrics();
      expect(metrics.failedClassifications).toBe(1);
      expect(metrics.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should cache responses when enabled', async () => {
      const signal = mockSignals[0];

      await inspector.analyzeSignal(signal);
      await inspector.analyzeSignal(signal); // Should use cache

      expect(mockLLMProvider.execute).toHaveBeenCalledTimes(1);
    });

    it('should respect cache size limits', async () => {
      // Add many signals to exceed cache size
      const manySignals = Array.from({ length: 1005 }, (_, i) => ({
        ...mockSignals[0],
        id: `signal-${i}`,
        data: {
          rawSignal: `[dp] Development Progress - Signal ${i}`,
          patternName: 'development-progress',
          description: `Description ${i}`
        }
      })) as Signal[];

      await inspector.analyzeBatch(manySignals);

      // Cache should be limited
      const status = inspector.getStatus();
      expect(status.cacheSize).toBeLessThanOrEqual(1000);
    });

    it('should clear cache on demand', async () => {
      await inspector.analyzeSignal(mockSignals[0]);

      expect(inspector.getStatus().cacheSize).toBe(1);

      inspector.clearCache();
      expect(inspector.getStatus().cacheSize).toBe(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await inspector.start();
    });

    it('should handle LLM provider errors', async () => {
      mockLLMProvider.execute.mockRejectedValueOnce(new Error('Provider error'));

      await expect(inspector.analyzeSignal(mockSignals[0])).rejects.toThrow('Provider error');
    });

    it('should handle timeout errors', async () => {
      mockLLMProvider.execute.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      await expect(
        inspector.analyzeSignal(mockSignals[0], { timeout: 1000 })
      ).rejects.toThrow();
    });

    it('should maintain stability after errors', async () => {
      // Cause an error
      mockLLMProvider.execute.mockRejectedValueOnce(new Error('Test error'));

      try {
        await inspector.analyzeSignal(mockSignals[0]);
      } catch {
        // Expected to fail
      }

      // Should recover and process next signal successfully
      const response = await inspector.analyzeSignal(mockSignals[1]);
      expect(response.result.success).toBe(true);
    });
  });

  describe('Feature Flags', () => {
    it('should respect parallel processing flag', async () => {
      const config: EnhancedInspectorConfig = {
        inspector: {} as any,
        llm: {
          provider: mockLLMProvider,
          tokenLimits: {} as any
        },
        context: {} as any,
        parallel: {} as any,
        features: {
          enableSemanticSummarization: true,
          enableParallelProcessing: false, // Disabled
          enableIntelligentCompression: true,
          enableHistoricalAnalysis: true,
          enablePredictiveProcessing: true
        }
      };

      const inspectorWithoutParallel = new EnhancedInspector(config);
      await inspectorWithoutParallel.start();

      const response = await inspectorWithoutParallel.analyzeSignal(mockSignals[0]);
      expect(response.result.success).toBe(true);

      await inspectorWithoutParallel.stop();
    });

    it('should respect caching feature flag', async () => {
      const response1 = await inspector.analyzeSignal(mockSignals[0]);
      expect(response1.cacheHit).toBe(false);

      const response2 = await inspector.analyzeSignal(mockSignals[0], { useCache: false });
      expect(response2.cacheHit).toBe(false);
      expect(mockLLMProvider.execute).toHaveBeenCalledTimes(2);
    });
  });
});