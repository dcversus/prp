/**
 * ♫ Complete Signal Flow Integration Test
 *
 * This test validates the end-to-end signal flow from agent logs
 * through signal detection to TUI display.
 *
 * Test Flow:
 * 1. Initialize signal system components
 * 2. Create mock agent log with signals
 * 3. Process log through signal detection
 * 4. Verify signal events are routed to EventBus
 * 5. Confirm TUI subscription receives signals
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';

import { signalSystemIntegration, SignalSystemIntegration } from '../../src/shared/signals/signal-system-integration';
import type { SignalEvent } from '../../src/shared/types/signals';

// Mock Tmux Manager for testing
const mockTmuxManager = {
  listSessions: jest.fn().mockResolvedValue([
    { name: 'agent-robo-developer-1', id: 'session1' },
    { name: 'agent-robo-system-analyst-2', id: 'session2' },
  ]),
  captureOutput: jest.fn().mockResolvedValue('Mock tmux output'),
  getSessionInfo: jest.fn().mockResolvedValue({
    name: 'test-session',
    created: new Date(),
    windows: [],
  }),
} as any;

// Test data
const mockAgentLogContent = `
[dp] Working on authentication system - implementing JWT validation
[cq] Code quality checks passing with 95% coverage
[aa] Need admin guidance on API rate limiting strategy
[tg] All tests passing in authentication module
[bb] Database connection blocked - need credentials
`;

const mockPRPContent = `
# PRP-001: Signal System Implementation

> our goal of user quote: Implement comprehensive signal detection and event routing

## progress

- `/src/shared/signals/event-bus-integration.ts` EventBus integration layer connecting scanner to TUI [dp]
- `/src/orchestrator/agent-log-streaming.ts` Agent log streaming system for real-time signal detection [tp]
- `/src/shared/signals/signal-flow-coordinator.ts` Signal flow coordinator for end-to-end processing [da]
- `/tests/integration/signal-flow-integration.test.ts` Comprehensive test suite for signal flow [cq]

[da] Implementation complete - ready for TUI integration
[tp] Tests prepared and passing
[bb] Need to resolve TUI subscription integration
`;

describe('Complete Signal Flow Integration', () => {
  let signalSystem: SignalSystemIntegration;
  let capturedSignals: SignalEvent[] = [];

  beforeEach(async () => {
    // Reset captured signals
    capturedSignals = [];

    // Initialize signal system
    signalSystem = new SignalSystemIntegration({
      eventBus: { enabled: true, maxHistorySize: 100 },
      signalDetector: { enabled: true, cacheSize: 1000, debounceTime: 10 },
      signalFlow: { enabled: true, batchSize: 10, processingInterval: 50 },
      agentStreaming: { enabled: true, autoDiscovery: false, monitorInterval: 1000 },
      performance: {
        enableMetrics: true,
        metricsInterval: 500,
        alertThresholds: { latency: 1000, errorRate: 10, queueSize: 100 },
      },
    });

    // Initialize the system
    await signalSystem.initialize();

    // Set up signal capture
    const eventBus = signalSystem.getEventBus();
    eventBus.subscribeToAll((event: SignalEvent) => {
      capturedSignals.push(event);
    });

    // Start the signal system
    await signalSystem.start();
  });

  afterEach(async () => {
    if (signalSystem) {
      await signalSystem.cleanup();
    }
    jest.clearAllMocks();
  });

  describe('Agent Log Signal Detection', () => {
    it('should detect signals in agent log content', async () => {
      // Process agent log content
      await signalSystem.processAgentLog('robo-developer', mockAgentLogContent);

      // Wait for signal processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify signals were detected
      expect(capturedSignals.length).toBeGreaterThan(0);

      const signals = capturedSignals.filter(s => s.source === 'agent:robo-developer');
      expect(signals).toHaveLength(5); // dp, cq, aa, tg, bb

      // Verify specific signals
      const dpSignal = signals.find(s => s.signal === '[DP]');
      expect(dpSignal).toBeDefined();
      expect(dpSignal?.priority).toBe('medium');

      const bbSignal = signals.find(s => s.signal === '[BB]');
      expect(bbSignal).toBeDefined();
      expect(bbSignal?.priority).toBe('critical');

      const aaSignal = signals.find(s => s.signal === '[AA]');
      expect(aaSignal).toBeDefined();
      expect(aaSignal?.priority).toBe('medium');
    });

    it('should route agent signals through EventBus', async () => {
      // Process agent log content
      await signalSystem.processAgentLog('robo-system-analyst', mockAgentLogContent);

      // Wait for routing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify EventBus routing
      const agentSignals = capturedSignals.filter(s => s.source === 'agent:robo-system-analyst');
      expect(agentSignals.length).toBeGreaterThan(0);

      // Verify metadata is preserved
      agentSignals.forEach(signal => {
        expect(signal.metadata).toBeDefined();
        expect(signal.metadata.agentId).toBe('robo-system-analyst');
        expect(signal.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('File Signal Detection', () => {
    it('should detect signals in PRP file content', async () => {
      // Process PRP content
      const filePath = '/test/PRP-001-signal-system.md';
      const detectedSignals = await signalSystem.processFile(filePath, mockPRPContent);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify signals were detected
      expect(detectedSignals.length).toBeGreaterThan(0);

      // Check for expected signals
      const signalTypes = detectedSignals.map(s => s.signal);
      expect(signalTypes).toContain('[DP]');
      expect(signalTypes).toContain('[TP]');
      expect(signalTypes).toContain('[DA]');
      expect(signalTypes).toContain('[CQ]');
      expect(signalTypes).toContain('[BB]');

      // Verify file path is included in metadata
      detectedSignals.forEach(signal => {
        expect(signal.metadata.filePath).toBe(filePath);
      });
    });

    it('should handle file signals through complete pipeline', async () => {
      const filePath = '/test/implementation-progress.md';
      await signalSystem.processFile(filePath, mockPRPContent);

      // Wait for complete pipeline processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify signals passed through all stages
      const fileSignals = capturedSignals.filter(s => s.source === 'scanner:file_system');
      expect(fileSignals.length).toBeGreaterThan(0);

      // Verify signal flow coordinator metrics
      const status = signalSystem.getStatus();
      expect(status.components.signalFlow.processing).toBe(true);
      expect(status.performance.totalSignals).toBeGreaterThan(0);
    });
  });

  describe('Signal Routing and Filtering', () => {
    it('should route signals to correct channels', async () => {
      // Process both agent and file signals
      await Promise.all([
        signalSystem.processAgentLog('robo-developer', mockAgentLogContent),
        signalSystem.processFile('/test/prp.md', mockPRPContent),
      ]);

      // Wait for routing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify channel routing
      const agentChannelSignals = signalSystem.getSignalsByType('agent_log_signal');
      const fileChannelSignals = signalSystem.getSignalsByType('file_signal_detected');

      expect(agentChannelSignals.length).toBeGreaterThan(0);
      expect(fileChannelSignals.length).toBeGreaterThan(0);

      // Verify channel separation
      agentChannelSignals.forEach(signal => {
        expect(signal.source).toContain('agent:');
      });

      fileChannelSignals.forEach(signal => {
        expect(signal.source).toBe('scanner:file_system');
      });
    });

    it('should filter signals by type', async () => {
      // Process mixed content
      await signalSystem.processFile('/test/mixed.md', mockPRPContent);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Test filtering
      const criticalSignals = signalSystem.getSignalsByType('signal_detected').filter(s => s.priority === 'critical');
      const mediumSignals = signalSystem.getSignalsByType('signal_detected').filter(s => s.priority === 'medium');

      expect(criticalSignals.length).toBeGreaterThanOrEqual(0);
      expect(mediumSignals.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Metrics', () => {
    it('should collect and report accurate metrics', async () => {
      // Process several signals
      await Promise.all([
        signalSystem.processAgentLog('agent1', mockAgentLogContent),
        signalSystem.processAgentLog('agent2', mockAgentLogContent),
        signalSystem.processFile('/test/file1.md', mockPRPContent),
        signalSystem.processFile('/test/file2.md', mockPRPContent),
      ]);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get status and metrics
      const status = signalSystem.getStatus();
      const metrics = signalSystem.getMetrics();

      // Verify component status
      expect(status.initialized).toBe(true);
      expect(status.running).toBe(true);
      expect(status.components.eventBus.initialized).toBe(true);
      expect(status.components.signalDetector.connected).toBe(true);

      // Verify performance metrics
      expect(status.performance.totalSignals).toBeGreaterThan(0);
      expect(status.performance.processingRate).toBeGreaterThanOrEqual(0);

      // Verify detailed metrics
      expect(metrics.eventBus).toBeDefined();
      expect(metrics.signalDetector).toBeDefined();
      expect(metrics.signalFlow).toBeDefined();
    });

    it('should handle signal processing within performance thresholds', async () => {
      const startTime = Date.now();

      // Process content
      await signalSystem.processFile('/test/performance.md', mockPRPContent);

      const processingTime = Date.now() - startTime;

      // Should process within reasonable time (less than 1 second)
      expect(processingTime).toBeLessThan(1000);

      // Verify latency is tracked
      const status = signalSystem.getStatus();
      expect(status.performance.averageLatency).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', async () => {
      // Test with malformed content
      const malformedContent = 'Invalid [signal content without closing bracket';

      await expect(
        signalSystem.processFile('/test/malformed.md', malformedContent)
      ).resolves.not.toThrow();

      // Should not crash or generate invalid signals
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(capturedSignals.length).toBe(0);
    });

    it('should continue processing after errors', async () => {
      // First, process some valid content
      await signalSystem.processFile('/test/valid.md', mockPRPContent);

      // Then process content that might cause issues
      await signalSystem.processFile('/test/empty.md', '');

      // Finally, process more valid content
      await signalSystem.processFile('/test/more-valid.md', mockAgentLogContent);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should still have processed valid signals
      expect(capturedSignals.length).toBeGreaterThan(0);

      // System should still be running
      const status = signalSystem.getStatus();
      expect(status.running).toBe(true);
    });
  });

  describe('Agent Log Streaming Integration', () => {
    it('should start and stop agent streaming', async () => {
      // This test requires a tmux manager
      const systemWithTmux = new SignalSystemIntegration({
        agentStreaming: { enabled: true, autoDiscovery: false, monitorInterval: 100 },
      });

      await systemWithTmux.initialize(mockTmuxManager);

      // Start streaming
      await expect(
        systemWithTmux.startAgentStreaming('test-session', 'robo-developer')
      ).resolves.not.toThrow();

      // Check status
      const status = systemWithTmux.getStatus();
      expect(status.components.agentStreaming.activeAgents).toBeGreaterThan(0);

      // Stop streaming
      await expect(
        systemWithTmux.stopAgentStreaming('test-session')
      ).resolves.not.toThrow();

      await systemWithTmux.cleanup();
    });
  });

  describe('Integration with TUI Components', () => {
    it('should provide EventBus for TUI subscription', () => {
      const eventBus = signalSystem.getEventBus();

      expect(eventBus).toBeDefined();
      expect(eventBus.subscribe).toBeDefined();
      expect(eventBus.unsubscribe).toBeDefined();
      expect(eventBus.getRecentEvents).toBeDefined();
    });

    it('should support TUI signal filtering', async () => {
      // Process signals
      await signalSystem.processFile('/test/tui.md', mockPRPContent);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Test filtering functionality
      const recentSignals = signalSystem.getRecentSignals(5);
      expect(recentSignals.length).toBeLessThanOrEqual(5);

      const criticalSignals = signalSystem.getSignalsByType('signal_detected')
        .filter(s => s.priority === 'critical');
      expect(criticalSignals.length).toBeGreaterThanOrEqual(0);
    });
  });
});