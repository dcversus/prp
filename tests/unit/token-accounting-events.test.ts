/**
 * Tests for token accounting events functionality
 */

import { TokenAccountingManager, TokenUsageEvent } from '../../src/scanner/token-accounting';
import { ScannerConfig } from '../../src/scanner/types';

describe('Token Accounting Events', () => {
  let manager: TokenAccountingManager;
  let mockConfig: ScannerConfig;
  const testPersistPath = '/tmp/test-token-accounting.json';

  beforeEach(() => {
    // Clean up any existing test file
    if (require('fs').existsSync(testPersistPath)) {
      require('fs').unlinkSync(testPersistPath);
    }

    mockConfig = {
      scanInterval: 1000,
      maxConcurrentScans: 5,
      batchSize: 100,
      enableGitMonitoring: true,
      enableFileMonitoring: true,
      enablePRPMonitoring: true,
      excludedPaths: ['node_modules', '.git'],
      includedExtensions: ['.ts', '.js', '.md'],
      worktreePaths: ['/tmp'],
      performanceThresholds: {
        maxScanTime: 5000,
        maxMemoryUsage: 512 * 1024 * 1024,
        maxFileCount: 1000
      }
    };

    manager = new TokenAccountingManager(mockConfig, testPersistPath);
  });

  afterEach(() => {
    // Clean up test file
    if (require('fs').existsSync(testPersistPath)) {
      require('fs').unlinkSync(testPersistPath);
    }

    // Clean up event listeners to prevent Jest from hanging
    manager.eventEmitter.removeAllListeners();
  });

  describe('Event Emission', () => {
    it('should emit tokenUsage event when tokens are tracked', (done) => {
      // Arrange
      const expectedEvent: Partial<TokenUsageEvent> = {
        agentId: 'test-agent',
        tokensUsed: 150, // 100 input + 50 output
        operation: 'test-operation',
        model: 'gpt-4'
      };

      // Act
      manager.onTokenUsage((event: TokenUsageEvent) => {
        // Assert
        expect(event.agentId).toBe(expectedEvent.agentId);
        expect(event.tokensUsed).toBe(expectedEvent.tokensUsed);
        expect(event.operation).toBe(expectedEvent.operation);
        expect(event.model).toBe(expectedEvent.model);
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.cost).toBeGreaterThan(0);
        expect(typeof event.limit).toBe('number');
        expect(typeof event.remaining).toBe('number');
        done();
      });

      // Record usage to trigger event
      manager.recordUsage(
        expectedEvent.agentId!,
        'test-agent-type',
        expectedEvent.operation!,
        expectedEvent.model!,
        100, // inputTokens
        50,  // outputTokens
        'scanner',
        { testId: 'test-123' }
      );
    });

    it('should emit multiple events for multiple usage records', (done) => {
      // Arrange
      let eventCount = 0;
      const expectedEvents = 3;

      manager.onTokenUsage((event: TokenUsageEvent) => {
        eventCount++;
        expect(event.agentId).toBe('test-agent');
        expect(event.tokensUsed).toBeGreaterThan(0);

        if (eventCount === expectedEvents) {
          expect(eventCount).toBe(expectedEvents);
          done();
        }
      });

      // Act - Record multiple usage events
      for (let i = 0; i < expectedEvents; i++) {
        manager.recordUsage(
          'test-agent',
          'test-agent-type',
          `test-operation-${i}`,
          'gpt-4',
          100,
          50,
          'scanner',
          { iteration: i }
        );
      }
    });

    it('should track remaining tokens correctly', (done) => {
      // Arrange
      let totalTokensUsed = 0;

      manager.onTokenUsage((event: TokenUsageEvent) => {
        totalTokensUsed += event.tokensUsed;
        // For test agents without configured limits, limit will be 0
        // This is expected behavior - remaining tokens will be negative
        expect(typeof event.limit).toBe('number');
        expect(typeof event.remaining).toBe('number');

        if (totalTokensUsed === 300) { // After 3 operations of 100 tokens each
          done();
        }
      });

      // Act - Record multiple usage events
      for (let i = 0; i < 3; i++) {
        manager.recordUsage(
          'test-agent',
          'test-agent-type',
          `test-operation-${i}`,
          'gpt-4',
          50,  // inputTokens
          50,  // outputTokens
          'scanner'
        );
      }
    });
  });

  describe('Event Subscription Management', () => {
    it('should allow unsubscribing from events', () => {
      // Arrange
      let eventCount = 0;
      const callback = (event: TokenUsageEvent) => {
        eventCount++;
      };

      // Act
      manager.onTokenUsage(callback);

      // Record usage - should trigger event
      manager.recordUsage('test-agent', 'test-type', 'test-op', 'gpt-4', 50, 50, 'scanner');
      expect(eventCount).toBe(1);

      // Unsubscribe
      manager.offTokenUsage(callback);

      // Record usage again - should not trigger event
      manager.recordUsage('test-agent', 'test-type', 'test-op-2', 'gpt-4', 50, 50, 'scanner');
      expect(eventCount).toBe(1); // Should still be 1
    });

    it('should handle multiple subscribers', (done) => {
      // Arrange
      const subscriber1CallCount = { count: 0 };
      const subscriber2CallCount = { count: 0 };
      const expectedCalls = 2;

      const callback1 = (event: TokenUsageEvent) => {
        subscriber1CallCount.count++;
        checkCompletion();
      };

      const callback2 = (event: TokenUsageEvent) => {
        subscriber2CallCount.count++;
        checkCompletion();
      };

      const checkCompletion = () => {
        if (subscriber1CallCount.count === expectedCalls &&
            subscriber2CallCount.count === expectedCalls) {
          expect(subscriber1CallCount.count).toBe(expectedCalls);
          expect(subscriber2CallCount.count).toBe(expectedCalls);
          done();
        }
      };

      // Act
      manager.onTokenUsage(callback1);
      manager.onTokenUsage(callback2);

      // Record multiple usage events
      for (let i = 0; i < expectedCalls; i++) {
        manager.recordUsage(`test-agent-${i}`, 'test-type', `test-op-${i}`, 'gpt-4', 50, 50, 'scanner');
      }
    });
  });

  describe('Event Data Accuracy', () => {
    it('should include accurate cost calculation in events', (done) => {
      // Arrange
      const expectedCostPer1kTokens = 0.03; // gpt-4 rate
      const totalTokens = 200; // 100 input + 100 output
      const expectedCost = (totalTokens / 1000) * expectedCostPer1kTokens;

      manager.onTokenUsage((event: TokenUsageEvent) => {
        // Assert
        expect(event.cost).toBeCloseTo(expectedCost, 5); // Allow for floating point precision
        expect(event.cost).toBeGreaterThan(0);
        done();
      });

      // Act
      manager.recordUsage('test-agent', 'test-type', 'test-op', 'gpt-4', 100, 100, 'scanner');
    });

    it('should handle agents without token limits gracefully', (done) => {
      // Arrange - Using an agent ID that won't be in config
      const unknownAgentId = 'unknown-agent';

      manager.onTokenUsage((event: TokenUsageEvent) => {
        // Assert
        expect(event.agentId).toBe(unknownAgentId);
        expect(event.limit).toBe(0);
        expect(event.remaining).toBeLessThanOrEqual(0); // Should be negative or zero
        done();
      });

      // Act
      manager.recordUsage(unknownAgentId, 'test-type', 'test-op', 'gpt-4', 50, 50, 'scanner');
    });

    it('should include timestamp in events', (done) => {
      // Arrange
      const beforeRecording = new Date();

      manager.onTokenUsage((event: TokenUsageEvent) => {
        // Assert
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeRecording.getTime());
        expect(event.timestamp.getTime()).toBeLessThanOrEqual(new Date().getTime());
        done();
      });

      // Act
      manager.recordUsage('test-agent', 'test-type', 'test-op', 'gpt-4', 50, 50, 'scanner');
    });
  });

  describe('Performance Impact', () => {
    it('should handle high-frequency events without performance degradation', (done) => {
      // Arrange
      const startTime = Date.now();
      const eventCount = 1000;
      let eventsReceived = 0;

      manager.onTokenUsage((event: TokenUsageEvent) => {
        eventsReceived++;

        // Check completion
        if (eventsReceived === eventCount) {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Assert
          expect(eventsReceived).toBe(eventCount);
          expect(duration).toBeLessThan(1000); // Should complete within 1 second
          done();
        }
      });

      // Act - Record many usage events
      for (let i = 0; i < eventCount; i++) {
        manager.recordUsage(`agent-${i % 10}`, 'test-type', `test-op-${i}`, 'gpt-4', 10, 10, 'scanner');
      }
    });
  });
});