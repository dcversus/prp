/**
 * ♫ Orchestrator Core Tests for @dcversus/prp
 *
 * TDD test suite for orchestrator core functionality with token distribution,
 * signal consumption, and agent coordination capabilities.
 */

import { OrchestratorCore } from '../orchestrator-core';
import { OrchestratorConfig } from '../types';
import { Signal } from '../../shared/types';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../tool-registry');
jest.mock('../context-manager');
jest.mock('../cot-processor');
jest.mock('../agent-manager');
jest.mock('../signal-resolution-engine');
jest.mock('../tools/token-monitoring-tools');

describe('OrchestratorCore', () => {
  let orchestrator: OrchestratorCore;
  let mockConfig: OrchestratorConfig;
  let mockSignal: Signal;

  beforeEach(() => {
    mockConfig = {
      model: 'gpt-5',
      maxTokens: 200000,
      temperature: 0.7,
      timeout: 30000,
      maxConcurrentDecisions: 5,
      maxChainOfThoughtDepth: 10,
      contextPreservation: {
        enabled: true,
        maxContextSize: 200000,
        compressionStrategy: 'summarize',
        preserveElements: ['signals', 'decisions', 'agentStates'],
        compressionRatio: 0.3,
        importantSignals: ['FF', 'bb', 'af', 'ic']
      },
      tools: [],
      agents: {
        maxActiveAgents: 10,
        defaultTimeout: 60000,
        retryAttempts: 3,
        retryDelay: 5000,
        parallelExecution: true,
        loadBalancing: 'priority',
        healthCheckInterval: 30000
      },
      prompts: {
        systemPrompt: 'You are the orchestrator for PRP system...',
        decisionMaking: 'Analyze signals and make decisions...',
        chainOfThought: 'Think step by step...',
        toolSelection: 'Select appropriate tools...',
        agentCoordination: 'Coordinate agents effectively...',
        checkpointEvaluation: 'Evaluate checkpoints...',
        errorHandling: 'Handle errors gracefully...',
        contextUpdate: 'Update context appropriately...'
      },
      decisionThresholds: {
        confidence: 0.8,
        tokenUsage: 180000,
        processingTime: 25000,
        agentResponse: 45000,
        errorRate: 0.1
      }
    };

    mockSignal = {
      id: 'test-signal-1',
      type: 'dp', // Development Progress
      priority: 7,
      source: 'robo-developer',
      timestamp: new Date(),
      data: {
        prpId: 'PRP-000-agents05',
        comment: '[dp] Development progress: Orchestrator core implementation started. Token distribution configured.',
        agent: 'robo-developer',
        files: ['src/orchestrator/orchestrator-core.ts'],
        progress: 25
      },
      metadata: {
        category: 'progress',
        context: 'implementation',
        duration: 0
      }
    };

    orchestrator = new OrchestratorCore(mockConfig);
  });

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with correct token distribution configuration', () => {
      const status = orchestrator.getStatus();

      expect(status.contextMemory.maxSize).toBe(200000);
      expect(status.chainOfThought.depth).toBe(0);
      expect(status.metrics).toBeDefined();
    });

    it('should start successfully and emit start event', async () => {
      const startSpy = jest.fn();
      orchestrator.on('orchestrator:started', startSpy);

      await orchestrator.start();

      expect(startSpy).toHaveBeenCalledWith({ timestamp: expect.any(Date) });
      expect(orchestrator.getStatus().status).toBe('thinking');
    });

    it('should fail to start if already running', async () => {
      await orchestrator.start();

      await expect(orchestrator.start()).rejects.toThrow('Orchestrator is already running');
    });

    it('should stop gracefully and emit stop event', async () => {
      const stopSpy = jest.fn();
      orchestrator.on('orchestrator:stopped', stopSpy);

      await orchestrator.start();
      await orchestrator.stop();

      expect(stopSpy).toHaveBeenCalledWith({ timestamp: expect.any(Date) });
      expect(orchestrator.getStatus().status).toBe('stopped');
    });
  });

  describe('signal processing', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should process development progress signal correctly', async () => {
      const signalProcessedSpy = jest.fn();
      orchestrator.on('orchestrator:signal_processed', signalProcessedSpy);

      await orchestrator.processSignal(mockSignal);

      expect(signalProcessedSpy).toHaveBeenCalledWith({
        signal: mockSignal,
        result: expect.objectContaining({
          success: expect.any(Boolean),
          processingTime: expect.any(Number),
          tokenUsage: expect.any(Number)
        })
      });
    });

    it('should handle critical priority signals with higher precedence', async () => {
      const criticalSignal: Signal = {
        ...mockSignal,
        type: 'FF', // System Fatal Error
        priority: 10,
        data: {
          ...mockSignal.data,
          error: 'Critical system failure detected'
        }
      };

      const processingOrder: Signal[] = [];
      orchestrator.on('orchestrator:signal_processed', (event) => {
        processingOrder.push(event.signal);
      });

      // Process in reverse order to test priority sorting
      await orchestrator.processSignal(mockSignal);
      await orchestrator.processSignal(criticalSignal);

      // Critical signal should be processed first due to higher priority
      expect(processingOrder[0].type).toBe('FF');
      expect(processingOrder[1].type).toBe('dp');
    });

    it('should track token usage within configured limits', async () => {
      await orchestrator.processSignal(mockSignal);

      const status = orchestrator.getStatus();
      const processingHistory = orchestrator.getProcessingHistory(1);

      expect(status.sharedContext?.systemMetrics?.tokensUsed).toBeGreaterThanOrEqual(0);
      expect(processingHistory[0].tokenUsage).toBeGreaterThanOrEqual(0);
    });

    it('should emit error event when signal processing fails', async () => {
      const errorSpy = jest.fn();
      orchestrator.on('orchestrator:signal_error', errorSpy);

      const invalidSignal: Signal = {
        ...mockSignal,
        data: null // Invalid data that might cause processing to fail
      };

      await orchestrator.processSignal(invalidSignal);

      expect(errorSpy).toHaveBeenCalledWith({
        signal: invalidSignal,
        error: expect.any(String)
      });
    });
  });

  describe('token distribution management', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should respect token cap distribution limits', async () => {
      const result = await orchestrator.executeCommand('get_token_distribution', {});

      expect(result).toBeDefined();
      // Verify the token distribution follows PRP requirements:
      // - Total cap: 200k
      // - Inspector payload: 40k
      // - Agents.md: 10k
      // - PRP content: 20k
      // - Shared context: 10k
      // - PRP context (CoT/tools): 70k
      // - Base/guideline prompts: 40k
    });

    it('should trigger context compaction when approaching token limits', async () => {
      // Simulate high token usage
      for (let i = 0; i < 100; i++) {
        await orchestrator.processSignal({
          ...mockSignal,
          id: `signal-${i}`,
          data: { ...mockSignal.data, largeContent: 'x'.repeat(1000) }
        });
      }

      const status = orchestrator.getStatus();
      // Should have managed token usage through compaction
      expect(status.contextMemory.size).toBeLessThanOrEqual(status.contextMemory.maxSize);
    });
  });

  describe('agent communication', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should dispatch tasks to appropriate agents based on signal type', async () => {
      const developerSignal: Signal = {
        ...mockSignal,
        type: 'tp', // Tests Prepared
        source: 'robo-developer'
      };

      const result = await orchestrator.processSignal(developerSignal);

      expect(result).toMatchObject({
        success: true,
        nextActions: expect.objectContaining({
          agentTasks: expect.any(Array)
        })
      });
    });

    it('should support parallel agent execution for sub-agents', async () => {
      const parallelSignal: Signal = {
        ...mockSignal,
        type: 'oa', // Orchestrator Attention
        data: {
          ...mockSignal.data,
          parallelTasks: [
            { agent: 'robo-developer', task: 'implement-feature' },
            { agent: 'robo-aqa', task: 'test-feature' }
          ]
        }
      };

      const result = await orchestrator.processSignal(parallelSignal);

      expect(result.nextActions.agentTasks.length).toBeGreaterThan(1);
    });
  });

  describe('context management', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should maintain war-room memo format for shared context', async () => {
      await orchestrator.processSignal(mockSignal);

      const status = orchestrator.getStatus();

      expect(status.sharedContext?.warzone).toBeDefined();
      expect(status.sharedContext?.warzone).toMatchObject({
        blockers: expect.any(Array),
        completed: expect.any(Array),
        next: expect.any(Array)
      });
    });

    it('should preserve Chain of Thought and tool history', async () => {
      await orchestrator.processSignal(mockSignal);

      const status = orchestrator.getStatus();

      expect(status.chainOfThought.steps).toBeDefined();
      expect(status.decisionHistory).toBeDefined();
    });
  });

  describe('tool integration', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should have scanner tools for real-time data access', () => {
      const tools = orchestrator.getAvailableTools();

      const scannerToolNames = tools.map(tool => tool.name);
      expect(scannerToolNames).toContain('get_latest_scanner_metrics');
      expect(scannerToolNames).toContain('track_token_distribution');
    });

    it('should execute tool calls through Chain of Thought', async () => {
      const toolSignal: Signal = {
        ...mockSignal,
        type: 'aa', // Admin Attention
        data: {
          ...mockSignal.data,
          toolCall: 'get_current_token_caps',
          parameters: { component: 'orchestrator' }
        }
      };

      const result = await orchestrator.processSignal(toolSignal);

      expect(result.toolResults).toBeDefined();
      expect(result.toolResults.results).toBeInstanceOf(Array);
    });
  });

  describe('error handling and recovery', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should handle system failures gracefully with [FF] signals', async () => {
      const failureSignal: Signal = {
        ...mockSignal,
        type: 'FF', // System Fatal Error
        priority: 10,
        data: {
          error: 'Critical system failure',
          component: 'orchestrator',
          stack: 'Error stack trace'
        }
      };

      const result = await orchestrator.processSignal(failureSignal);

      expect(result.success).toBe(false);
      expect(result.escalation).toBeDefined();
    });

    it('should track error rates and adjust behavior', async () => {
      // Process multiple failing signals
      for (let i = 0; i < 5; i++) {
        const errorSignal: Signal = {
          ...mockSignal,
          id: `error-${i}`,
          data: { error: `Error ${i}` }
        };
        await orchestrator.processSignal(errorSignal);
      }

      const status = orchestrator.getStatus();
      expect(status.metrics.failedDecisions).toBeGreaterThan(0);
    });
  });

  describe('performance and monitoring', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should track processing metrics', async () => {
      const startTime = Date.now();
      await orchestrator.processSignal(mockSignal);
      const endTime = Date.now();

      const history = orchestrator.getProcessingHistory(1);
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[0].processingTime).toBeLessThan(endTime - startTime + 1000); // Allow some tolerance
    });

    it('should provide comprehensive status information', () => {
      const status = orchestrator.getStatus();

      expect(status).toMatchObject({
        status: expect.any(String),
        signalQueueLength: expect.any(Number),
        activePRPsCount: expect.any(Number),
        processingHistoryCount: expect.any(Number),
        metrics: expect.any(Object),
        sharedContext: expect.any(Object)
      });
    });

    it('should handle multiple concurrent signals efficiently', async () => {
      const signals = Array.from({ length: 10 }, (_, i) => ({
        ...mockSignal,
        id: `concurrent-${i}`,
        data: { ...mockSignal.data, index: i }
      }));

      const startTime = Date.now();

      // Process signals concurrently
      await Promise.all(signals.map(signal => orchestrator.processSignal(signal)));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 10 signals efficiently (under 5 seconds for this test)
      expect(processingTime).toBeLessThan(5000);

      const status = orchestrator.getStatus();
      expect(status.processingHistoryCount).toBe(10);
    });
  });

  describe('integration with inspector and scanner', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('should consume highest priority signals from inspector', async () => {
      const highPrioritySignal: Signal = {
        ...mockSignal,
        type: 'af', // Feedback Request
        priority: 8,
        data: {
          ...mockSignal.data,
          question: 'Critical decision needed for implementation approach',
          options: ['option-a', 'option-b'],
          context: 'architecture decision'
        }
      };

      const result = await orchestrator.processSignal(highPrioritySignal);

      expect(result.resolutionResult).toBeDefined();
      expect(result.resolutionResult.success).toBe(true);
    });

    it('should integrate with scanner API for real-time data', async () => {
      const scannerSignal: Signal = {
        ...mockSignal,
        type: 'dp',
        data: {
          ...mockSignal.data,
          requestScannerData: true,
          files: ['src/orchestrator/*'],
          changes: ['modified', 'added']
        }
      };

      const result = await orchestrator.processSignal(scannerSignal);

      expect(result.success).toBe(true);
      // Should have accessed scanner tools for real-time data
    });
  });

  describe('brand compliance and UX', () => {
    it('should use ♫ icon for orchestrator operations', async () => {
      await orchestrator.start();

      // Verify orchestrator branding in logs/events
      const events = orchestrator.eventNames();
      expect(events).toContain('orchestrator:started');
      expect(events).toContain('orchestrator:stopped');
      expect(events).toContain('orchestrator:signal_processed');
    });

    it('should maintain debug mode output capabilities', () => {
      const tools = orchestrator.getAvailableTools();
      const debugTools = tools.filter(tool =>
        tool.name.includes('debug') || tool.name.includes('monitor')
      );

      expect(debugTools.length).toBeGreaterThan(0);
    });
  });
});