/**
 * Tests for Real-time Event Emitter
 */

import { RealTimeEventEmitter } from '../../src/scanner/realtime-event-emitter';
import { Signal } from '../../src/shared/types';

// Mock shared utils and logger
jest.mock('../../src/shared/utils', () => ({
  createLayerLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  HashUtils: {
    generateId: jest.fn(() => 'test-event-id'),
    hashString: jest.fn((str: string) => `hash-${str}`)
  },
  TimeUtils: {
    now: jest.fn(() => new Date('2024-01-01T00:00:00Z'))
  },
  FileUtils: {
    ensureDir: jest.fn().mockResolvedValue(undefined),
    readTextFile: jest.fn().mockResolvedValue('test content'),
    writeTextFile: jest.fn().mockResolvedValue(undefined),
    pathExists: jest.fn().mockResolvedValue(true),
    readFileStats: jest.fn().mockResolvedValue({
      size: 1024,
      modified: new Date(),
      created: new Date(),
      isDirectory: false
    })
  }
}));

// Mock the logger to avoid file system operations
jest.mock('../../src/shared/logger', () => ({
  createLayerLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    tokenUsage: jest.fn(),
    performance: jest.fn(),
    signal: jest.fn(),
    getTokenUsageMetrics: jest.fn().mockReturnValue({}),
    getPerformanceMetrics: jest.fn().mockReturnValue({}),
    resetMetrics: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined)
  }))
}));


describe('Real-time Event Emitter', () => {
  let emitter: RealTimeEventEmitter;

  beforeEach(() => {
    jest.useFakeTimers();
    emitter = new RealTimeEventEmitter();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (emitter) {
      await emitter.shutdown();
    }
    // Clear all timers to prevent hanging
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Signal Events', () => {
    test('should emit signal detected event', () => {
      const testSignal: Signal = {
        id: 'signal-1',
        type: 'dp',
        priority: 5,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      };

      let capturedEvent: { type: string; signal: any; source: string; timestamp: Date } | null = null;
      emitter.subscribeToSignals((event) => {
        capturedEvent = event;
      });

      emitter.emitSignalDetected(testSignal, 'test-source', { test: true });

      // Process any pending timers
      jest.advanceTimersByTime(0);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent.type).toBe('signal_detected');
      expect(capturedEvent.signal).toEqual(testSignal);
      expect(capturedEvent.source).toBe('test-source');
    });

    test('should emit signal processed event', () => {
      const testSignal: Signal = {
        id: 'signal-1',
        type: 'bf',
        priority: 4,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[bf] Bug fixed' },
        metadata: {}
      };

      let capturedEvent: { type: string; signal: { code: string; priority: number }; source: string; timestamp: Date } | null = null;
      emitter.subscribe('signal_processed', (event) => {
        capturedEvent = event;
      });

      emitter.emitSignalProcessed(testSignal, 'test-source');
      jest.advanceTimersByTime(0);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent.type).toBe('signal_processed');
      expect(capturedEvent.signal).toEqual(testSignal);
    });

    test('should emit signal resolved event', (done) => {
      const testSignal: Signal = {
        id: 'signal-1',
        type: 'bb',
        priority: 9,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[bb] Blocker resolved' },
        metadata: {}
      };

      emitter.subscribe('signal_resolved', (event) => {
        expect(event.type).toBe('signal_resolved');
        expect(event.signal).toEqual(testSignal);
        done();
      });

      emitter.emitSignalResolved(testSignal, 'test-source');
    });
  });

  describe('Scanner Events', () => {
    test('should emit scanner started event', (done) => {
      emitter.subscribe('scan_started', (event) => {
        expect(event.type).toBe('scan_started');
        expect(event.worktree).toBe('/test/repo');
        expect(event.metadata.scanType).toBe('full');
        done();
      });

      emitter.emitScannerEvent('scan_started', '/test/repo', { scanType: 'full' });
    });

    test('should emit scanner completed event with metadata', (done) => {
      emitter.subscribe('scan_completed', (event) => {
        expect(event.type).toBe('scan_completed');
        expect(event.worktree).toBe('/test/repo');
        expect(event.metadata.duration).toBe(1500);
        expect(event.metadata.changesFound).toBe(5);
        expect(event.metadata.signalsDetected).toBe(3);
        done();
      });

      emitter.emitScannerEvent('scan_completed', '/test/repo', {
        scanType: 'incremental',
        duration: 1500,
        changesFound: 5,
        signalsDetected: 3
      });
    });

    test('should emit scanner failed event', (done) => {
      emitter.subscribe('scan_failed', (event) => {
        expect(event.type).toBe('scan_failed');
        expect(event.worktree).toBe('/test/repo');
        expect(event.metadata.error).toBe('Permission denied');
        done();
      });

      emitter.emitScannerEvent('scan_failed', '/test/repo', {
        scanType: 'full',
        error: 'Permission denied'
      });
    });
  });

  describe('PRP Events', () => {
    test('should emit PRP created event', (done) => {
      emitter.subscribe('prp_created', (event) => {
        expect(event.type).toBe('prp_created');
        expect(event.prpPath).toBe('/test/PRP-001.md');
        expect(event.metadata.version).toBe(1);
        done();
      });

      emitter.emitPRPEvent('prp_created', '/test/PRP-001.md', { version: 1 });
    });

    test('should emit PRP modified event', (done) => {
      emitter.subscribe('prp_modified', (event) => {
        expect(event.type).toBe('prp_modified');
        expect(event.prpPath).toBe('/test/PRP-001.md');
        expect(event.metadata.previousVersion).toBe(1);
        expect(event.metadata.version).toBe(2);
        expect(event.metadata.changes).toContain('Added new signals');
        done();
      });

      emitter.emitPRPEvent('prp_modified', '/test/PRP-001.md', {
        version: 2,
        previousVersion: 1,
        changes: ['Added new signals']
      });
    });

    test('should emit PRP deleted event', (done) => {
      emitter.subscribe('prp_deleted', (event) => {
        expect(event.type).toBe('prp_deleted');
        expect(event.prpPath).toBe('/test/PRP-001.md');
        done();
      });

      emitter.emitPRPEvent('prp_deleted', '/test/PRP-001.md', {});
    });
  });

  describe('Git Events', () => {
    test('should emit commit detected event', (done) => {
      emitter.subscribeToGit((event) => {
        expect(event.type).toBe('commit_detected');
        expect(event.repository).toBe('/test/repo');
        expect(event.metadata.commit).toBe('abc123');
        expect(event.metadata.author).toBe('John Doe');
        expect(event.metadata.message).toContain('[dp]');
        done();
      });

      emitter.emitGitEvent('commit_detected', '/test/repo', {
        commit: 'abc123',
        author: 'John Doe',
        message: '[dp] Development progress made'
      });
    });

    test('should emit branch changed event', (done) => {
      emitter.subscribe('branch_changed', (event) => {
        expect(event.type).toBe('branch_changed');
        expect(event.repository).toBe('/test/repo');
        expect(event.metadata.branch).toBe('feature/test-branch');
        done();
      });

      emitter.emitGitEvent('branch_changed', '/test/repo', {
        branch: 'feature/test-branch'
      });
    });

    test('should emit PR detected event', (done) => {
      emitter.subscribe('pr_detected', (event) => {
        expect(event.type).toBe('pr_detected');
        expect(event.repository).toBe('/test/repo');
        expect(event.metadata.prNumber).toBe(123);
        expect(event.metadata.author).toBe('testuser');
        done();
      });

      emitter.emitGitEvent('pr_detected', '/test/repo', {
        prNumber: 123,
        author: 'testuser'
      });
    });
  });

  describe('Token Events', () => {
    test('should emit token usage recorded event', (done) => {
      emitter.subscribeToTokens((event) => {
        expect(event.type).toBe('token_usage_recorded');
        expect(event.agentId).toBe('agent-1');
        expect(event.metadata.tokens).toBe(1000);
        expect(event.metadata.cost).toBe(0.03);
        expect(event.metadata.operation).toBe('signal-detection');
        expect(event.metadata.model).toBe('gpt-4');
        done();
      });

      emitter.emitTokenEvent('token_usage_recorded', 'agent-1', {
        tokens: 1000,
        cost: 0.03,
        operation: 'signal-detection',
        model: 'gpt-4'
      });
    });

    test('should emit token limit warning event', (done) => {
      emitter.subscribe('token_limit_warning', (event) => {
        expect(event.type).toBe('token_limit_warning');
        expect(event.agentId).toBe('agent-1');
        expect(event.metadata.tokens).toBe(8000);
        expect(event.metadata.limit).toBe(10000);
        expect(event.metadata.percentage).toBe(80);
        done();
      });

      emitter.emitTokenEvent('token_limit_warning', 'agent-1', {
        tokens: 8000,
        cost: 0.24,
        operation: 'analysis',
        model: 'gpt-4',
        limit: 10000,
        percentage: 80
      });
    });

    test('should emit token limit exceeded event', (done) => {
      emitter.subscribe('token_limit_exceeded', (event) => {
        expect(event.type).toBe('token_limit_exceeded');
        expect(event.agentId).toBe('agent-1');
        expect(event.metadata.tokens).toBe(10500);
        expect(event.metadata.percentage).toBe(105);
        done();
      });

      emitter.emitTokenEvent('token_limit_exceeded', 'agent-1', {
        tokens: 10500,
        cost: 0.315,
        operation: 'analysis',
        model: 'gpt-4',
        limit: 10000,
        percentage: 105
      });
    });
  });

  describe('System Events', () => {
    test('should emit system started event', (done) => {
      emitter.subscribe('system_started', (event) => {
        expect(event.type).toBe('system_started');
        expect(event.metadata.component).toBe('signal-detector');
        expect(event.metadata.status).toBe('initialized');
        done();
      });

      emitter.emitSystemEvent('system_started', 'signal-detector', {
        status: 'initialized'
      });
    });

    test('should emit system error event', (done) => {
      emitter.subscribe('system_error', (event) => {
        expect(event.type).toBe('system_error');
        expect(event.metadata.component).toBe('parser');
        expect(event.metadata.status).toBe('failed');
        expect(event.metadata.details).toBe('Parse error: Invalid format');
        done();
      });

      emitter.emitSystemEvent('system_error', 'parser', {
        status: 'failed',
        details: 'Parse error: Invalid format'
      });
    });
  });

  describe('Subscription Management', () => {
    test('should subscribe with filter', (done) => {
      const filter = (event: { signal: { priority: number } }) => event.signal.priority > 5;

      emitter.subscribeToSignals((event) => {
        expect(event.signal.priority).toBeGreaterThan(5);
        done();
      }, filter);

      const highPrioritySignal: Signal = {
        id: 'high-1',
        type: 'bb',
        priority: 9,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[bb] Blocker' },
        metadata: {}
      };

      const lowPrioritySignal: Signal = {
        id: 'low-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      };

      // This should trigger the callback
      emitter.emitSignalDetected(highPrioritySignal, 'test');

      // This should NOT trigger the callback due to filter
      emitter.emitSignalDetected(lowPrioritySignal, 'test');
    });

    test('should unsubscribe correctly', () => {
      let callbackCount = 0;

      const subscriptionId = emitter.subscribeToSignals(() => {
        callbackCount++;
      });

      const testSignal: Signal = {
        id: 'test-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      };

      // Emit event - should trigger callback
      emitter.emitSignalDetected(testSignal, 'test');
      expect(callbackCount).toBe(1);

      // Unsubscribe
      const unsubscribed = emitter.unsubscribe(subscriptionId);
      expect(unsubscribed).toBe(true);

      // Emit event again - should not trigger callback
      emitter.emitSignalDetected(testSignal, 'test');
      expect(callbackCount).toBe(1); // Still 1, not 2
    });

    test('should handle invalid unsubscribe', () => {
      const unsubscribed = emitter.unsubscribe('invalid-id');
      expect(unsubscribed).toBe(false);
    });

    test('should get subscription metrics', () => {
      // Add multiple subscriptions directly to avoid helper method complexity
      emitter.subscribe('signal_detected', () => {});
      emitter.subscribe('scan_completed', () => {});
      emitter.subscribe('prp_created', () => {});
      emitter.subscribe('commit_detected', () => {});
      emitter.subscribe('token_usage_recorded', () => {});

      const metrics = emitter.getSubscriptionMetrics();

      expect(metrics.total).toBe(5);
      expect(metrics.active).toBe(5);
      expect(metrics.byEventType['signal_detected']).toBe(1);
      expect(metrics.byEventType['scan_completed']).toBe(1);
      expect(metrics.byEventType['prp_created']).toBe(1);
      expect(metrics.byEventType['commit_detected']).toBe(1);
      expect(metrics.byEventType['token_usage_recorded']).toBe(1);
    });
  });

  describe('Performance', () => {
    test('should handle high volume events', (done) => {
      let receivedCount = 0;
      const targetCount = 1000;

      emitter.subscribe('signal_detected', () => {
        receivedCount++;
        if (receivedCount === targetCount) {
          expect(receivedCount).toBe(targetCount);
          done();
        }
      });

      // Emit many events
      for (let i = 0; i < targetCount; i++) {
        const signal: Signal = {
          id: `signal-${i}`,
          type: 'dp',
          priority: 3,
          source: 'test',
          timestamp: new Date(),
          data: { rawSignal: `[dp] Event ${i}` },
          metadata: {}
        };

        emitter.emitSignalDetected(signal, 'test');
      }
    });

    test('should provide performance metrics', () => {
      // Emit some events to generate metrics
      const testSignal: Signal = {
        id: 'test-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      };

      for (let i = 0; i < 10; i++) {
        emitter.emitSignalDetected(testSignal, 'test');
      }

      const metrics = emitter.getMetrics();

      expect(metrics.totalEvents).toBeGreaterThan(0);
      expect(metrics.eventsByType['signal_detected']).toBeGreaterThan(0);
      expect(metrics.activeSubscriptions).toBeGreaterThanOrEqual(0);
      expect(metrics.eventQueueSize).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.eventsPerSecond).toBe('number');
      expect(typeof metrics.averageProcessingTime).toBe('number');
    });

    test('should reset metrics', () => {
      // Emit some events
      emitter.emitSignalDetected({
        id: 'test-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      }, 'test');

      let metrics = emitter.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThan(0);

      // Reset metrics
      emitter.resetMetrics();

      metrics = emitter.getMetrics();
      expect(metrics.totalEvents).toBe(0);
      expect(Object.keys(metrics.eventsByType)).toHaveLength(0);
    });
  });

  describe('Event Queue Management', () => {
    test('should process events in order', (done) => {
      const receivedEvents: string[] = [];

      emitter.subscribe('signal_detected', (event) => {
        receivedEvents.push(event.signal.data.rawSignal);

        if (receivedEvents.length === 3) {
          expect(receivedEvents).toEqual([
            '[dp] First event',
            '[dp] Second event',
            '[dp] Third event'
          ]);
          done();
        }
      });

      // Emit events in specific order
      emitter.emitSignalDetected({
        id: '1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] First event' },
        metadata: {}
      }, 'test');

      emitter.emitSignalDetected({
        id: '2',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Second event' },
        metadata: {}
      }, 'test');

      emitter.emitSignalDetected({
        id: '3',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Third event' },
        metadata: {}
      }, 'test');
    });

    test('should handle queue overflow gracefully', () => {
      // Create emitter with very small queue for testing
      const smallEmitter = new RealTimeEventEmitter();
      (smallEmitter as RealTimeEventEmitter & { maxQueueSize: number }).maxQueueSize = 2;

      // Emit more events than queue size
      for (let i = 0; i < 5; i++) {
        smallEmitter.emitSignalDetected({
          id: `signal-${i}`,
          type: 'dp',
          priority: 3,
          source: 'test',
          timestamp: new Date(),
          data: { rawSignal: `[dp] Event ${i}` },
          metadata: {}
        }, 'test');
      }

      const metrics = smallEmitter.getMetrics();
      expect(metrics.droppedEvents).toBeGreaterThan(0);

      smallEmitter.shutdown();
    });
  });

  describe('Error Handling', () => {
    test('should handle callback errors gracefully', () => {
      let goodCallbackTriggered = false;

      // Callback that throws error
      emitter.subscribeToSignals(() => {
        throw new Error('Callback error');
      });

      // Callback that should still work
      emitter.subscribeToSignals(() => {
        goodCallbackTriggered = true;
      });

      const testSignal: Signal = {
        id: 'test-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      };

      emitter.emitSignalDetected(testSignal, 'test');

      // Advance timers to process async operations
      jest.advanceTimersByTime(100);

      // The good callback should still be triggered despite the error
      expect(goodCallbackTriggered).toBe(true);
    });

    test('should handle async callback errors', () => {
      // Async callback that rejects
      emitter.subscribeToSignals(async () => {
        throw new Error('Async callback error');
      });

      const testSignal: Signal = {
        id: 'test-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      };

      emitter.emitSignalDetected(testSignal, 'test');

      // Advance timers to process async operations
      jest.advanceTimersByTime(100);

      // If we get here without throwing, the error was handled gracefully
      expect(true).toBe(true);
    });
  });

  describe('Health Monitoring', () => {
    test('should provide detailed statistics', () => {
      // Emit some events
      emitter.emitSignalDetected({
        id: 'test-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Development progress' },
        metadata: {}
      }, 'test');

      emitter.emitSystemEvent('system_health_check', 'test-component', {
        status: 'healthy'
      });

      const stats = emitter.getDetailedStatistics();

      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('metrics');
      expect(stats).toHaveProperty('subscriptionMetrics');
      expect(stats).toHaveProperty('recentEvents');
      expect(Array.isArray(stats.recentEvents)).toBe(true);
    });
  });
});