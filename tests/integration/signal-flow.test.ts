/**
 * ♫ Signal Flow Integration Tests
 *
 * End-to-end integration tests for the complete signal system pipeline.
 */

import {
  SignalEvent,
  SignalCodeEnum,
  SignalSourceEnum,
  SignalPriorityEnum,
  SignalTypeEnum
} from '../../src/types';
import { SignalDetectorImpl } from '../../src/scanner/signal-detector';
import { SignalRouter } from '../../src/orchestrator/signal-router';

describe('Signal Flow Integration', () => {
  let detector: SignalDetectorImpl;
  let router: SignalRouter;

  beforeEach(() => {
    detector = new SignalDetectorImpl();
    router = new SignalRouter({
      enableLogging: false,
      maxRoutes: 20,
      bufferSize: 50
    });
  });

  afterEach(() => {
    router.shutdown();
  });

  describe('Detection to Routing Pipeline', () => {
    test('should detect and route development signals', async () => {
      const receivedSignals: SignalEvent[] = [];

      // Add route for development signals
      router.addRoute(/\[dp\]/gi, (signal) => {
        receivedSignals.push(signal);
      });

      // Simulate PRP content with development signal
      const prpContent = `
# PRP-001: Feature Development

## progress
[dp] Development progress made on authentication system

## description
Implement user authentication with JWT tokens

## dor
- [ ] Research JWT libraries
- [ ] Create auth service
- [ ] Implement login endpoint
- [ ] Add token validation

## dod
- [ ] Authentication endpoints implemented
- [ ] JWT token generation working
- [ ] Token validation middleware in place
- [ ] Security tests passing
      `;

      // Detect signals
      const detectedSignals = await detector.detectSignals(prpContent, 'PRP-001.md');

      // Route detected signals
      for (const signal of detectedSignals) {
        await router.route(signal);
      }

      // Verify pipeline
      expect(detectedSignals).toHaveLength(1);
      expect(receivedSignals).toHaveLength(1);
      expect(receivedSignals[0].signal).toBe(SignalCodeEnum.DEVELOPMENT_PROGRESS);
      expect(receivedSignals[0].source).toBe('PRP-001.md');
    });

    test('should detect and route multiple signal types', async () => {
      const developmentSignals: SignalEvent[] = [];
      const blockerSignals: SignalEvent[] = [];
      const testingSignals: SignalEvent[] = [];

      // Add routes for different signal types
      router.addRoute(/\[dp\]/gi, (signal) => developmentSignals.push(signal));
      router.addRoute(/\[bb\]/gi, (signal) => blockerSignals.push(signal));
      router.addRoute(/\[tg\]/gi, (signal) => testingSignals.push(signal));

      // Simulate PRP content with multiple signals
      const prpContent = `
# PRP-002: API Integration

## progress
[dp] API client implementation started
[bb] Blocked by missing API documentation
[tg] All existing tests passing

## description
Integrate with external payment API

## issues
- Need API documentation from vendor
- Rate limiting parameters unclear
      `;

      // Detect signals
      const detectedSignals = await detector.detectSignals(prpContent, 'PRP-002.md');

      // Route detected signals
      for (const signal of detectedSignals) {
        await router.route(signal);
      }

      // Verify pipeline
      expect(detectedSignals.length).toBeGreaterThanOrEqual(3);
      expect(developmentSignals.length).toBeGreaterThan(0);
      expect(blockerSignals.length).toBeGreaterThan(0);
      expect(testingSignals.length).toBeGreaterThan(0);
    });
  });

  describe('Priority-Based Routing', () => {
    test('should route critical signals with highest priority', async () => {
      const routedSignals: Array<{ signal: SignalEvent; priority: number }> = [];

      // Add routes with different priorities
      router.addRoute(/\[FF\]/gi, (signal) => {
        routedSignals.push({ signal, priority: 10 });
      }, { priority: 10 });

      router.addRoute(/\[bb\]/gi, (signal) => {
        routedSignals.push({ signal, priority: 8 });
      }, { priority: 8 });

      router.addRoute(/\[dp\]/gi, (signal) => {
        routedSignals.push({ signal, priority: 3 });
      }, { priority: 3 });

      // Simulate critical scenario
      const prpContent = `
# System Status Report

## progress
[FF] System fatal error occurred in production
[bb] Database connection pool exhausted
[dp] Investigation ongoing
      `;

      // Detect and route signals
      const detectedSignals = await detector.detectSignals(prpContent, 'SYSTEM.md');
      for (const signal of detectedSignals) {
        await router.route(signal);
      }

      // Verify priority ordering (critical signals first)
      expect(routedSignals.length).toBe(3);

      const orderedSignals = routedSignals.sort((a, b) => b.priority - a.priority);
      expect(orderedSignals[0].priority).toBe(10); // FF should be first
      expect(orderedSignals[1].priority).toBe(8);  // bb should be second
      expect(orderedSignals[2].priority).toBe(3);  // dp should be last
    });
  });

  describe('Signal Aggregation', () => {
    test('should aggregate signals from multiple sources', async () => {
      const aggregatedSignals: SignalEvent[] = [];

      // Add aggregation route
      router.addRoute(/\[dp\]/gi, (signal) => {
        aggregatedSignals.push(signal);
      });

      // Simulate multiple PRP files
      const prpFiles = [
        {
          name: 'PRP-001.md',
          content: '[dp] Frontend development started'
        },
        {
          name: 'PRP-002.md',
          content: '[dp] Backend API development in progress'
        },
        {
          name: 'PRP-003.md',
          content: '[dp] Database schema design completed'
        }
      ];

      // Process all files
      for (const file of prpFiles) {
        const signals = await detector.detectSignals(file.content, file.name);
        for (const signal of signals) {
          await router.route(signal);
        }
      }

      // Verify aggregation
      expect(aggregatedSignals).toHaveLength(3);
      expect(aggregatedSignals[0].source).toBe('PRP-001.md');
      expect(aggregatedSignals[1].source).toBe('PRP-002.md');
      expect(aggregatedSignals[2].source).toBe('PRP-003.md');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle handler failures gracefully', async () => {
      const successfulRoutes: SignalEvent[] = [];

      // Add one failing handler and one successful handler
      router.addRoute(/\[dp\]/gi, () => {
        throw new Error('Handler failed');
      });

      router.addRoute(/\[dp\]/gi, (signal) => {
        successfulRoutes.push(signal);
      });

      const prpContent = '[dp] Development progress with error scenario';
      const detectedSignals = await detector.detectSignals(prpContent, 'test.md');

      // Route signals - should not throw
      expect(async () => {
        for (const signal of detectedSignals) {
          await router.route(signal);
        }
      }).not.toThrow();

      // Successful handler should still execute
      expect(successfulRoutes).toHaveLength(1);
    });

    test('should maintain system stability under high load', async () => {
      const processedSignals: SignalEvent[] = [];

      // Add high-volume route
      router.addRoute(/\[dp\]/gi, (signal) => {
        processedSignals.push(signal);
      });

      // Generate high signal volume
      const highVolumeContent = Array(100).fill('[dp] Development progress batch ').join('\n');
      const detectedSignals = await detector.detectSignals(highVolumeContent, 'bulk.md');

      expect(detectedSignals.length).toBe(100);

      // Process all signals
      const startTime = Date.now();
      for (const signal of detectedSignals) {
        await router.route(signal);
      }
      const processingTime = Date.now() - startTime;

      // Verify performance and stability
      expect(processedSignals).toHaveLength(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Check router statistics
      const stats = router.getStats();
      expect(stats.signalsProcessed).toBeGreaterThan(0);
      expect(stats.errors).toBe(0); // No errors should have occurred
    });
  });

  describe('Real-time Signal Processing', () => {
    test('should handle real-time signal streams', async () => {
      const realtimeSignals: SignalEvent[] = [];
      const signalTimestamps: number[] = [];

      // Add real-time processing route
      router.addRoute(/\[dp\]/gi, (signal) => {
        realtimeSignals.push(signal);
        signalTimestamps.push(Date.now());
      });

      // Simulate real-time signal generation
      const signalGenerator = async () => {
        for (let i = 0; i < 10; i++) {
          const content = `[dp] Real-time signal ${i + 1}`;
          const signals = await detector.detectSignals(content, `realtime-${i}.md`);

          for (const signal of signals) {
            await router.route(signal);
          }

          // Small delay to simulate real-time intervals
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      };

      await signalGenerator();

      // Verify real-time processing
      expect(realtimeSignals).toHaveLength(10);

      // Verify timestamps are increasing (real-time order)
      for (let i = 1; i < signalTimestamps.length; i++) {
        expect(signalTimestamps[i]).toBeGreaterThanOrEqual(signalTimestamps[i - 1]);
      }
    });
  });

  describe('Signal Filtering and Transformation', () => {
    test('should transform signals during routing', async () => {
      const transformedSignals: Array<{ original: SignalEvent; transformed: any }> = [];

      // Add transformation route
      router.addRoute(/\[dp\]/gi, (signal) => {
        const transformed = {
          id: signal.id,
          type: 'development_progress',
          timestamp: signal.timestamp.toISOString(),
          source: signal.source,
          metadata: {
            signalCode: signal.signal,
            priority: signal.priority,
            originalSignal: signal
          }
        };

        transformedSignals.push({ original: signal, transformed });
      });

      const prpContent = '[dp] Development progress for transformation';
      const detectedSignals = await detector.detectSignals(prpContent, 'transform.md');

      for (const signal of detectedSignals) {
        await router.route(signal);
      }

      // Verify transformation
      expect(transformedSignals).toHaveLength(1);
      expect(transformedSignals[0].transformed.type).toBe('development_progress');
      expect(transformedSignals[0].transformed.metadata.signalCode).toBe(SignalCodeEnum.DEVELOPMENT_PROGRESS);
      expect(transformedSignals[0].original).toBe(detectedSignals[0]);
    });
  });

  describe('Signal Persistence and State Management', () => {
    test('should maintain signal state across routing operations', async () => {
      const routedSignals: SignalEvent[] = [];

      // Add state-preserving route
      router.addRoute(/\[dp\]/gi, (signal) => {
        // Modify signal state
        signal.state = 'processed';
        signal.data = {
          ...signal.data,
          processedAt: new Date().toISOString(),
          router: 'test-router'
        };

        routedSignals.push({ ...signal }); // Copy to preserve state
      });

      const prpContent = '[dp] Development progress with state management';
      const detectedSignals = await detector.detectSignals(prpContent, 'state.md');

      const originalSignal = { ...detectedSignals[0] };
      expect(originalSignal.state).toBe('active');

      for (const signal of detectedSignals) {
        await router.route(signal);
      }

      // Verify state preservation
      expect(routedSignals).toHaveLength(1);
      expect(routedSignals[0].state).toBe('processed');
      expect(routedSignals[0].data?.processedAt).toBeDefined();
      expect(routedSignals[0].data?.router).toBe('test-router');
    });
  });
});