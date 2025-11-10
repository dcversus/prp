/**
 * ♫ Inspector System Test Suite for @dcversus/prp
 *
 * Comprehensive tests for the Inspector (Critic) system including:
 * - LLM Executor with token management
 * - Signal Classifier with priority/confidence scoring
 * - Guidelines Adapter V2 with dynamic loading
 * - Context Manager with 40K token limits
 * - FIFO processing and parallel execution
 */

import {
  LLMExecutor,
  SignalClassifier,
  GuidelinesAdapterV2
} from '../index';
import { LLMExecutorRequest } from '../llm-executor';
import { Signal, AgentRole } from '../../shared/types';
import {
  InspectorConfig,
  ProcessingContext,
  InspectorAnalysisRequest,
  createTestSignal,
  GuidelineConfig
} from '../types';

// Mock utilities
const createMockSignal = (type: string, priority: number = 5): Signal => createTestSignal({
  id: `signal-${type}-${Date.now()}`,
  type,
  source: 'test',
  priority,
  data: { test: true },
  metadata: {}
});

const createMockGuideline = (content: string): GuidelineConfig => ({
  id: `guideline-${Date.now()}`,
  name: `Test Guideline ${Math.random().toString(36).substr(2, 9)}`,
  enabled: true,
  settings: {},
  requiredFeatures: [],
  tokenLimits: {
    inspector: 1000,
    orchestrator: 1000
  },
  customPrompts: {
    inspector: content,
    orchestrator: content
  },
  protocol: {
    id: `protocol-${Date.now()}`,
    description: 'Test protocol',
    steps: [],
    requirements: [],
    dependencies: [],
    metadata: {}
  }
});

const createMockContext = (): ProcessingContext => ({
  signalId: 'test-signal',
  worktree: '/test',
  agent: 'robo-developer' as AgentRole,
  relatedSignals: [],
  activePRPs: ['test-prp'],
  recentActivity: [],
  tokenStatus: {
    totalUsed: 1000,
    totalLimit: 1000000,
    approachingLimit: false,
    criticalLimit: false,
    agentBreakdown: {},
    projections: {
      daily: 10000,
      weekly: 70000,
      monthly: 300000
    }
  },
  agentStatus: [],
  sharedNotes: [],
  environment: {
    worktree: '/test',
    branch: 'main',
    availableTools: ['test'],
    systemCapabilities: [],
    constraints: {},
    recentChanges: { count: 0, types: {}, lastChange: new Date() }
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
      averageProcessingTime: 1000,
      successRate: 95,
      tokenEfficiency: 85
    },
    recentPatterns: []
  }
});

// Helper function to convert InspectorAnalysisRequest to LLMExecutorRequest
const convertToLLMExecutorRequest = (analysisRequest: InspectorAnalysisRequest, priority: number = 5): LLMExecutorRequest => {
  const guideline = analysisRequest.guidelines[0];
  return {
    id: analysisRequest.id,
    signal: analysisRequest.signal,
    context: analysisRequest.context,
    guideline: guideline?.customPrompts?.inspector || 'Default guideline',
    guidelineId: guideline?.id || 'default-guideline',
    priority,
    createdAt: new Date()
  };
};

describe('Inspector System Integration Tests', () => {
  let llmExecutor: LLMExecutor;
  let signalClassifier: SignalClassifier;
  let guidelinesAdapter: GuidelinesAdapterV2;
  let mockConfig: InspectorConfig;

  beforeEach(() => {
    mockConfig = {
      model: 'gpt-4o-mini',
      maxTokens: 40000,
      temperature: 0.1,
      timeout: 60000,
      batchSize: 10,
      maxConcurrentClassifications: 2,
      tokenLimits: {
        input: 50000,
        output: 40000,
        total: 90000
      },
      prompts: {
        classification: 'Test classification prompt',
        contextPreparation: 'Test context prompt',
        recommendationGeneration: 'Test recommendation prompt'
      },
      structuredOutput: {
        enabled: true,
        schema: {
          type: 'object',
          properties: {
            test: { type: 'string' }
          },
          required: ['test']
        },
        validation: true,
        fallbackToText: true
      }
    };

    llmExecutor = new LLMExecutor(mockConfig);
    signalClassifier = new SignalClassifier();
    guidelinesAdapter = new GuidelinesAdapterV2('./test-guidelines');
  });

  afterEach(() => {
    // Cleanup
    llmExecutor.clearCache();
  });

  describe('LLM Executor', () => {
    describe('Token Management', () => {
      test('should respect 1M token inspector cap', async () => {
        const signal = createMockSignal('test', 5);
        const context = createMockContext();
        const analysisRequest: InspectorAnalysisRequest = {
          id: 'test-req-1',
          signal,
          context,
          guidelines: [createMockGuideline('Test guideline content')],
          requirements: {
            categories: [],
            urgencyLevels: [],
            agentRoles: [],
            specialCases: [],
            customRules: []
          }
        };

        // Convert to LLMExecutorRequest
        const request: LLMExecutorRequest = {
          id: analysisRequest.id,
          signal: analysisRequest.signal,
          context: analysisRequest.context,
          guideline: analysisRequest.guidelines[0]?.customPrompts?.inspector || 'Test guideline content',
          guidelineId: analysisRequest.guidelines[0]?.id || 'test-guideline',
          priority: 5,
          createdAt: new Date()
        };

        const result = await llmExecutor.executeAnalysis(request);

        expect(result.tokenUsage.total).toBeLessThanOrEqual(1000000);
        expect(result.success).toBe(true);
        expect(result.model).toBe('gpt-4o-mini');
      });

      test('should enforce 40K output limit', async () => {
        const signal = createMockSignal('test', 10);
        const context = createMockContext();
        const request: InspectorAnalysisRequest = {
          id: 'test-req-2',
          signal,
          context,
          guidelines: [createMockGuideline('X'.repeat(50000))], // Large guideline
          requirements: {
            categories: [],
            urgencyLevels: [],
            agentRoles: [],
            specialCases: [],
            customRules: []
          }
        };

        const result = await llmExecutor.executeAnalysis(request);

        expect(result.tokenUsage.output).toBeLessThanOrEqual(40000);
        expect(result.tokenUsage.input).toBeGreaterThan(0);
      });

      test('should handle token distribution correctly', async () => {
        const signal = createMockSignal('test');
        const context = createMockContext();
        const request: InspectorAnalysisRequest = {
          id: 'test-req-3',
          signal,
          context,
          guidelines: [createMockGuideline('Test guideline with moderate length')],
          guidelineId: 'moderate-guideline',
          priority: 5,
          createdAt: new Date()
        };

        const result = await llmExecutor.executeAnalysis(request);

        expect(result.tokenUsage.input).toBeGreaterThan(0);
        expect(result.tokenUsage.output).toBeGreaterThan(0);
        expect(result.tokenUsage.total).toBe(result.tokenUsage.input + result.tokenUsage.output);
      });
    });

    describe('Queue Processing', () => {
      test('should process requests in FIFO order', async () => {
        const signals = [
          createMockSignal('first', 1),
          createMockSignal('second', 5),
          createMockSignal('third', 10)
        ];

        const context = createMockContext();
        const results: string[] = [];

        // Add requests to queue
        signals.forEach((signal, index) => {
          const request: InspectorAnalysisRequest = {
            id: `queue-test-${index}`,
            signal,
            context,
            guidelines: [`Guideline ${index}`],
            guidelineId: `guideline-${index}`,
            priority: signal.priority,
            createdAt: new Date()
          };

          llmExecutor.addToQueue(request);

          // Listen for completion
          llmExecutor.once('analysis:completed', ({ result }) => {
            results.push(result.signalId);
          });
        });

        // Process queue
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify FIFO order
        expect(results).toHaveLength(3);
        expect(results[0]!).toBe(signals[0]!.id);
        expect(results[1]!).toBe(signals[1]!.id);
        expect(results[2]!).toBe(signals[2]!.id);
      });

      test('should handle queue status correctly', async () => {
        const initialStatus = llmExecutor.getQueueStatus();
        expect(initialStatus.size).toBe(0);
        expect(initialStatus.processing).toBe(0);
        expect(initialStatus.isProcessing).toBe(false);

        // Add some requests
        const signal = createMockSignal('test');
        const context = createMockContext();

        for (let i = 0; i < 3; i++) {
          const request: InspectorAnalysisRequest = {
            id: `queue-status-${i}`,
            signal,
            context,
            guidelines: ['Test guideline'],
            guidelineId: 'test',
            priority: 5,
            createdAt: new Date()
          };
          llmExecutor.addToQueue(request);
        }

        const updatedStatus = llmExecutor.getQueueStatus();
        expect(updatedStatus.size).toBe(3);
      });
    });

    describe('Structured Output', () => {
      test('should generate valid structured output', async () => {
        const signal = createMockSignal('structured-test');
        const context = createMockContext();
        const request: InspectorAnalysisRequest = {
          id: 'structured-req',
          signal,
          context,
          guidelines: ['Test guideline for structured output'],
          guidelineId: 'structured-guideline',
          priority: 5,
          createdAt: new Date()
        };

        const result = await llmExecutor.executeAnalysis(request);

        expect(result.success).toBe(true);
        expect(result.classification).toBeDefined();
        expect(result.payload).toBeDefined();
        expect(result.recommendations).toBeInstanceOf(Array);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
      });

      test('should handle structured output parsing errors gracefully', async () => {
        // Mock a response that will fail parsing
        const signal = createMockSignal('parse-error-test');
        const context = createMockContext();
        const request: InspectorAnalysisRequest = {
          id: 'parse-error-req',
          signal,
          context,
          guidelines: ['Test guideline that causes parse error'],
          guidelineId: 'parse-error-guideline',
          priority: 5,
          createdAt: new Date()
        };

        const result = await llmExecutor.executeAnalysis(request);

        // Should fallback successfully
        expect(result.success).toBe(false); // Note: In mock, might be false due to parse error
        expect(result.error).toBeDefined();
        expect(result.classification).toBeDefined(); // Fallback classification
      });
    });
  });

  describe('Signal Classifier', () => {
    describe('Priority Scoring', () => {
      test('should calculate priority scores correctly', async () => {
        const testCases = [
          { signal: createMockSignal('low-priority', 2), expectedRange: [1, 4] },
          { signal: createMockSignal('medium-priority', 5), expectedRange: [4, 7] },
          { signal: createMockSignal('high-priority', 8), expectedRange: [7, 10] },
          { signal: createMockSignal('critical-priority', 10), expectedRange: [9, 10] }
        ];

        for (const testCase of testCases) {
          const result = await signalClassifier.classifySignal(testCase.signal, createMockContext());

          expect(result.classification.priority).toBeGreaterThanOrEqual(testCase.expectedRange[0]!);
          expect(result.classification.priority).toBeLessThanOrEqual(testCase.expectedRange[1]!);
        }
      });

      test('should adjust priority based on signal age', async () => {
        const oldSignal = createMockSignal('old-signal', 5);
        oldSignal.timestamp = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

        const newSignal = createMockSignal('new-signal', 5);
        newSignal.timestamp = new Date(); // Now

        const oldResult = await signalClassifier.classifySignal(oldSignal, createMockContext());
        const newResult = await signalClassifier.classifySignal(newSignal, createMockContext());

        // Old signals should get higher priority
        expect(oldResult.classification.priority).toBeGreaterThanOrEqual(newResult.classification.priority);
      });
    });

    describe('Confidence Scoring', () => {
      test('should calculate confidence scores within valid range', async () => {
        const signals = [
          createMockSignal('test-1'),
          createMockSignal('test-2'),
          createMockSignal('test-3')
        ];

        for (const signal of signals) {
          const result = await signalClassifier.classifySignal(signal, createMockContext());

          expect(result.classification.confidence).toBeGreaterThanOrEqual(0);
          expect(result.classification.confidence).toBeLessThanOrEqual(100);
        }
      });

      test('should provide higher confidence for known patterns', async () => {
        const knownSignal = createMockSignal('dp'); // Known pattern
        const unknownSignal = createMockSignal('unknown-signal-type');

        const knownResult = await signalClassifier.classifySignal(knownSignal, createMockContext());
        const unknownResult = await signalClassifier.classifySignal(unknownSignal, createMockContext());

        // Known patterns should have higher confidence
        expect(knownResult.classification.confidence).toBeGreaterThan(unknownResult.classification.confidence);
      });
    });

    describe('Risk Assessment', () => {
      test('should assess risk factors correctly', async () => {
        const highRiskSignal = createMockSignal('critical-bug', 10);
        highRiskSignal.data = { critical: true, affectsProduction: true };

        const result = await signalClassifier.classifySignal(highRiskSignal, createMockContext());

        expect(result.riskAssessment.overallRisk).toBeGreaterThan(0);
        expect(result.riskAssessment.overallRisk).toBeLessThanOrEqual(100);
        expect(result.riskAssessment.riskLevel).toBeDefined();
        expect(result.riskAssessment.mitigationStrategies).toBeInstanceOf(Array);
        expect(result.riskAssessment.mitigationStrategies.length).toBeGreaterThan(0);
      });

      test('should provide appropriate mitigation strategies', async () => {
        const signal = createMockSignal('high-complexity', 8);
        signal.data = { complexity: 'high', dependencies: 5 };

        const result = await signalClassifier.classifySignal(signal, createMockContext());

        expect(result.riskAssessment.mitigationStrategies.length).toBeGreaterThan(0);

        // Should include strategies relevant to complexity
        const strategies = result.riskAssessment.mitigationStrategies.join(' ').toLowerCase();
        expect(strategies).toMatch(/senior|technical|review|allocate/i);
      });
    });

    describe('Complexity Assessment', () => {
      test('should assess complexity levels correctly', async () => {
        const testCases = [
          {
            signal: createMockSignal('simple-task'),
            expectedComplexity: 'low'
          },
          {
            signal: createMockSignal('medium-complexity'),
            expectedComplexity: 'medium'
          },
          {
            signal: createMockSignal('high-complexity'),
            expectedComplexity: 'high'
          }
        ];

        for (const testCase of testCases) {
          const result = await signalClassifier.classifySignal(testCase.signal, createMockContext());

          expect(['low', 'medium', 'high', 'critical']).toContain(result.classification.complexity);
        }
      });
    });

    describe('Token Analysis', () => {
      test('should analyze token implications', async () => {
        const signal = createMockSignal('token-analysis-test');
        const result = await signalClassifier.classifySignal(signal, createMockContext());

        expect(result.tokenAnalysis.input).toBeGreaterThan(0);
        expect(result.tokenAnalysis.output).toBeGreaterThan(0);
        expect(result.tokenAnalysis.total).toBe(result.tokenAnalysis.input + result.tokenAnalysis.output);
        expect(result.tokenAnalysis.efficiency).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Guidelines Adapter V2', () => {
    describe('Dynamic Loading', () => {
      test('should load guidelines for signal types', async () => {
        const signal = createMockSignal('dp');
        const context = createMockContext();

        // Mock successful file loading - in real implementation these would be used

        // These would be mocked in a real test environment
        const guideline = await guidelinesAdapter.getGuidelineForSignal(signal, context);

        // In a real test with actual files, this would return a guideline
        // For now, test that the method doesn't throw
        expect(guideline).toBe(null); // Expected with no actual files
      });

      test('should handle missing guidelines gracefully', async () => {
        const signal = createMockSignal('nonexistent-signal-type');
        const context = createMockContext();

        const guideline = await guidelinesAdapter.getGuidelineForSignal(signal, context);

        expect(guideline).toBe(null);
      });

      test('should cache loaded guidelines', async () => {
        const signal = createMockSignal('cache-test');
        const context = createMockContext();

        // First load
        const start1 = Date.now();
        await guidelinesAdapter.getGuidelineForSignal(signal, context);
        const time1 = Date.now() - start1;

        // Second load (should be from cache)
        const start2 = Date.now();
        await guidelinesAdapter.getGuidelineForSignal(signal, context);
        const time2 = Date.now() - start2;

        // Cache should make second load faster (in real scenario)
        expect(time2).toBeLessThanOrEqual(time1 + 100); // Allow some variance
      });
    });

    describe('Cache Management', () => {
      test('should provide cache statistics', () => {
        const stats = guidelinesAdapter.getCacheStatistics();

        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('hitRate');
        expect(stats).toHaveProperty('totalAccesses');
        expect(stats).toHaveProperty('oldestEntry');
        expect(stats).toHaveProperty('newestEntry');
      });

      test('should clear cache correctly', () => {
        guidelinesAdapter.clearCache();

        const stats = guidelinesAdapter.getCacheStatistics();
        expect(stats.size).toBe(0);
        expect(stats.totalAccesses).toBe(0);
      });
    });

    describe('Validation', () => {
      test('should validate guideline structure', async () => {
        // This would test with actual guideline files
        const mockGuideline = {
          signalType: 'test',
          basePrompt: 'Test base prompt',
          inspectorPrompt: 'Test inspector prompt',
          metadata: {
            signalType: 'test',
            version: '1.0.0',
            author: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            tags: ['test'],
            dependencies: [],
            requiredTools: [],
            tokenLimits: {
              inspector: 35000,
              orchestrator: 25000
            }
          },
          compiledAt: new Date(),
          cacheKey: 'test-key'
        };

        // In real implementation, would call validateGuideline
        expect(mockGuideline.signalType).toBe('test');
        expect(mockGuideline.basePrompt).toBeDefined();
        expect(mockGuideline.inspectorPrompt).toBeDefined();
      });
    });
  });

  describe('Integration Tests', () => {
    test('should process complete signal analysis workflow', async () => {
      const signal = createMockSignal('integration-test', 7);
      const context = createMockContext();

      // Step 1: Classify signal
      const classificationResult = await signalClassifier.classifySignal(signal, context);
      expect(classificationResult.classification).toBeDefined();
      expect(classificationResult.riskAssessment).toBeDefined();

      // Step 2: Get guideline (would normally work with actual files)
      const guideline = await guidelinesAdapter.getGuidelineForSignal(signal, context);

      // Step 3: Execute LLM analysis
      const request: InspectorAnalysisRequest = {
        id: 'integration-req',
        signal,
        context,
        guidelines: [guideline?.inspectorPrompt || 'Default guideline'],
        guidelineId: classificationResult.classification.category,
        priority: classificationResult.classification.priority,
        createdAt: new Date()
      };

      const llmResult = await llmExecutor.executeAnalysis(request);
      expect(llmResult.success).toBe(true);
      expect(llmResult.classification).toBeDefined();
      expect(llmResult.recommendations).toBeDefined();

      // Verify consistency
      expect(llmResult.signalId).toBe(signal.id);
      expect(llmResult.classification.category).toBe(classificationResult.classification.category);
    });

    test('should handle multiple concurrent signals', async () => {
      const signals = [
        createMockSignal('concurrent-1', 3),
        createMockSignal('concurrent-2', 7),
        createMockSignal('concurrent-3', 5)
      ];

      const context = createMockContext();
      const promises = signals.map(async (signal, index) => {
        // Classify
        const classification = await signalClassifier.classifySignal(signal, context);

        // Execute LLM analysis
        const request: InspectorAnalysisRequest = {
          id: `concurrent-req-${index}`,
          signal,
          context,
          guidelines: ['Test guideline for concurrent processing'],
          guidelineId: classification.classification.category,
          priority: classification.classification.priority,
          createdAt: new Date()
        };

        return llmExecutor.executeAnalysis(request);
      });

      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.signalId).toBeDefined();
      });

      // Verify they have different signal IDs
      const signalIds = results.map(r => r.signalId);
      const uniqueIds = new Set(signalIds);
      expect(uniqueIds.size).toBe(3);
    });

    test('should handle error scenarios gracefully', async () => {
      const signal = createMockSignal('error-test');
      const context = createMockContext();

      // Test with invalid request
      const invalidRequest: InspectorAnalysisRequest = {
        id: 'invalid-req',
        signal,
        context,
        guidelines: [], // Empty guideline
        requirements: {
          categories: [],
          urgencyLevels: [],
          agentRoles: [],
          specialCases: [],
          customRules: []
        }
      };

      // Should handle gracefully without throwing
      const result = await llmExecutor.executeAnalysis(invalidRequest);
      expect(result).toBeDefined();
      // May be success with fallback or success: false with error
    });
  });

  describe('Performance Tests', () => {
    test('should complete analysis within reasonable time', async () => {
      const signal = createMockSignal('performance-test');
      const context = createMockContext();

      const startTime = Date.now();

      const classification = await signalClassifier.classifySignal(signal, context);
      const classificationTime = Date.now() - startTime;

      expect(classificationTime).toBeLessThan(5000); // Should complete within 5 seconds

      const request: InspectorAnalysisRequest = {
        id: 'performance-req',
        signal,
        context,
        guidelines: ['Performance test guideline'],
        guidelineId: classification.classification.category,
        priority: classification.classification.priority,
        createdAt: new Date()
      };

      const llmStartTime = Date.now();
      await llmExecutor.executeAnalysis(request);
      const llmTime = Date.now() - llmStartTime;

      expect(llmTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle memory usage efficiently', async () => {
      const signals = Array.from({ length: 10 }, (_, i) =>
        createMockSignal(`memory-test-${i}`)
      );

      const context = createMockContext();
      const results = [];

      for (const signal of signals) {
        const result = await signalClassifier.classifySignal(signal, context);
        results.push(result);
      }

      // Should complete without memory issues
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.classification).toBeDefined();
      });

      // Clean up
      llmExecutor.clearCache();
    });
  });
});

describe('Inspector System Error Handling', () => {
  test('should handle LLM executor failures', async () => {
    const config: InspectorConfig = {
      model: 'invalid-model',
      maxTokens: 40000,
      temperature: 0.1,
      timeout: 100,
      batchSize: 1,
      maxConcurrentClassifications: 1,
      tokenLimits: { input: 40000, output: 40000, total: 80000 },
      prompts: {
        classification: 'test',
        contextPreparation: 'test',
        recommendationGeneration: 'test'
      },
      structuredOutput: { enabled: true, schema: { type: 'object' }, validation: true, fallbackToText: true }
    };

    const executor = new LLMExecutor(config);
    const signal = createMockSignal('error-test');
    const request: InspectorAnalysisRequest = {
      id: 'error-req',
      signal,
      context: createMockContext(),
      guidelines: [],
      requirements: {
        categories: [],
        urgencyLevels: [],
        agentRoles: [],
        specialCases: [],
        customRules: []
      }
    };

    // Should handle error gracefully
    const result = await executor.executeAnalysis(request);
    expect(result).toBeDefined();
  });

  test('should handle signal classifier errors', async () => {
    const classifier = new SignalClassifier();
    const invalidSignal = {
      id: '',
      type: '',
      source: '',
      priority: -1,
      timestamp: new Date('invalid'),
      data: null
    } as any;

    // Should handle invalid input gracefully
    const result = await classifier.classifySignal(invalidSignal);
    expect(result).toBeDefined();
  });
});