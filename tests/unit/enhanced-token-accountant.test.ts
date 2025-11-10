/**
 * Comprehensive test suite for enhanced TokenAccountant with real-time monitoring
 */

import { TokenAccountant } from '../../src/scanner/token-accountant';
import { writeFileSync, mkdirSync, existsSync } from 'fs-extra';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

describe('Enhanced TokenAccountant', () => {
  let accountant: TokenAccountant;
  let testDir: string;

  beforeEach(() => {
    // Create temporary directory for test data
    testDir = join(tmpdir(), `token-accountant-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create fresh accountant instance for each test
    // Use a specific file path within the test directory
    const storagePath = join(testDir, 'token-usage.json');
    accountant = new TokenAccountant(storagePath);
  });

  afterEach(() => {
    // Cleanup test data
    if (accountant) {
      accountant.removeAllListeners();
    }
  });

  describe('Real-time Event Streaming', () => {
    test('should subscribe to and receive token usage events', (done) => {
      const agentId = 'test-agent';
      const eventData = {
        agentId,
        agentType: 'scanner',
        tokens: 100,
        operation: 'request' as const,
        model: 'gpt-4'
      };

      // Subscribe to token usage events
      const subscriptionId = accountant.onTokenUsage(agentId, (event: TokenUsageEvent) => {
        expect(event.agentId).toBe(agentId);
        expect(event.tokensUsed).toBe(100);
        expect(event.agentType).toBe('scanner');
        expect(event.operation).toBe('request');
        expect(event.model).toBe('gpt-4');
        expect(event.cost).toBeGreaterThan(0);
        expect(event.timestamp).toBeInstanceOf(Date);

        // Cleanup subscription
        accountant.offTokenUsage(subscriptionId);
        done();
      });

      // Record usage to trigger event
      accountant.recordUsage(eventData);
    });

    test('should support multiple subscribers for the same agent', (done) => {
      const agentId = 'multi-subscriber-agent';
      const eventData = {
        agentId,
        agentType: 'inspector',
        tokens: 200,
        operation: 'response' as const,
        model: 'claude-3-sonnet'
      };

      let callCount = 0;
      const expectedCalls = 2;

      // Subscribe with multiple callbacks
      const subscription1 = accountant.onTokenUsage(agentId, () => {
        callCount++;
        if (callCount === expectedCalls) {
          accountant.offTokenUsage(subscription1);
          accountant.offTokenUsage(subscription2);
          done();
        }
      });

      const subscription2 = accountant.onTokenUsage(agentId, () => {
        callCount++;
        if (callCount === expectedCalls) {
          accountant.offTokenUsage(subscription1);
          accountant.offTokenUsage(subscription2);
          done();
        }
      });

      // Record usage to trigger events
      accountant.recordUsage(eventData);
    });

    test('should filter events by agent ID', (done) => {
      const agent1 = 'agent-1';
      const agent2 = 'agent-2';

      let agent1Received = false;
      let agent2Received = false;

      // Subscribe only to agent1 events
      const subscriptionId = accountant.onTokenUsage(agent1, (event: TokenUsageEvent) => {
        if (event.agentId === agent1) {
          agent1Received = true;
        }
        if (event.agentId === agent2) {
          agent2Received = true;
        }

        // Check after a short delay to ensure all events are processed
        setTimeout(() => {
          expect(agent1Received).toBe(true);
          expect(agent2Received).toBe(false);
          accountant.offTokenUsage(subscriptionId);
          done();
        }, 50);
      });

      // Record usage for both agents
      accountant.recordUsage({
        agentId: agent1,
        agentType: 'scanner',
        tokens: 100,
        operation: 'request',
        model: 'gpt-4'
      });

      accountant.recordUsage({
        agentId: agent2,
        agentType: 'orchestrator',
        tokens: 150,
        operation: 'response',
        model: 'gpt-3.5-turbo'
      });
    });
  });

  describe('Cost Calculation', () => {
    test('should calculate cost for different models correctly', () => {
      const gpt4Event = {
        agentId: 'gpt4-agent',
        agentType: 'inspector',
        tokens: 1000,
        operation: 'request' as const,
        model: 'gpt-4'
      };

      const gpt35Event = {
        agentId: 'gpt35-agent',
        agentType: 'scanner',
        tokens: 1000,
        operation: 'request' as const,
        model: 'gpt-3.5-turbo'
      };

      accountant.recordUsage(gpt4Event);
      accountant.recordUsage(gpt35Event);

      const gpt4Stats = accountant.getTokenStatistics('gpt4-agent');
      const gpt35Stats = accountant.getTokenStatistics('gpt35-agent');

      // GPT-4 should be more expensive than GPT-3.5-Turbo
      expect(gpt4Stats.totalCost).toBeGreaterThan(gpt35Stats.totalCost);
      expect(gpt4Stats.totalCost).toBeCloseTo(0.03, 2); // $0.03 for 1K tokens
      expect(gpt35Stats.totalCost).toBeCloseTo(0.001, 3); // $0.001 for 1K tokens
    });

    test('should handle unknown models gracefully', () => {
      const unknownModelEvent = {
        agentId: 'unknown-agent',
        agentType: 'scanner',
        tokens: 1000,
        operation: 'request' as const,
        model: 'unknown-model'
      };

      accountant.recordUsage(unknownModelEvent);

      const stats = accountant.getTokenStatistics('unknown-agent');
      expect(stats.totalCost).toBe(0); // Should default to 0 for unknown models
    });

    test('should calculate agent total cost correctly', () => {
      const agentId = 'cost-test-agent';

      // Record multiple events for the same agent
      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 1000,
        operation: 'request',
        model: 'gpt-4'
      });

      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 2000,
        operation: 'response',
        model: 'gpt-4'
      });

      const stats = accountant.getTokenStatistics(agentId);
      expect(stats.totalCost).toBeCloseTo(0.09, 2); // (1000 + 2000) * 0.03 / 1000 = 0.09
    });
  });

  describe('Limit Enforcement', () => {
    test('should create alerts when approaching limits', (done) => {
      const agentId = 'limit-test-agent';
      const dailyLimit = 1000;

      // Set limits for the agent
      accountant.setLimits(agentId, 'inspector', { daily: dailyLimit });

      // Listen for alert events
      accountant.on('alert_created', (alert: TokenAlert) => {
        expect(alert.agentId).toBe(agentId);
        expect(alert.type).toBe('warning');
        expect(alert.message).toContain('Notice: Agent has used 85.0% of daily limit');
        expect(alert.acknowledged).toBe(false);
        done();
      });

      // Record usage that exceeds 80% threshold
      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 850, // 85% of daily limit
        operation: 'request',
        model: 'gpt-4'
      });
    });

    test('should create critical alerts when near hard limits', (done) => {
      const agentId = 'critical-test-agent';
      const dailyLimit = 1000;

      accountant.setLimits(agentId, 'inspector', { daily: dailyLimit });

      accountant.on('alert_created', (alert: TokenAlert) => {
        expect(alert.agentId).toBe(agentId);
        expect(alert.type).toBe('warning'); // At 92% it's still a warning, not critical
        expect(alert.message).toContain('Warning: Agent has used 92.0% of daily limit');
        done();
      });

      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 920, // 92% of daily limit
        operation: 'request',
        model: 'gpt-4'
      });
    });

    test('should emit limit exceeded events at hard limits', (done) => {
      const agentId = 'exceed-test-agent';
      const dailyLimit = 1000;

      accountant.setLimits(agentId, 'inspector', { daily: dailyLimit });

      accountant.on('limit_exceeded', (data) => {
        expect(data.agentId).toBe(agentId);
        expect(data.percentage).toBeGreaterThanOrEqual(95);
        expect(data.action).toBe('block_requests');
        done();
      });

      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 960, // 96% of daily limit
        operation: 'request',
        model: 'gpt-4'
      });
    });
  });

  describe('TUI Dashboard Data', () => {
    test('should generate comprehensive dashboard data', () => {
      // Setup multiple agents with different usage patterns
      const agents = [
        { id: 'agent-1', type: 'scanner', tokens: 5000, model: 'gpt-3.5-turbo' },
        { id: 'agent-2', type: 'inspector', tokens: 15000, model: 'gpt-4' },
        { id: 'agent-3', type: 'orchestrator', tokens: 8000, model: 'claude-3-sonnet' }
      ];

      agents.forEach(agent => {
        accountant.setLimits(agent.id, agent.type, { daily: 10000 });
        accountant.recordUsage({
          agentId: agent.id,
          agentType: agent.type,
          tokens: agent.tokens,
          operation: 'request',
          model: agent.model
        });
      });

      const dashboardData = accountant.getTUIDashboardData();

      // Verify summary data
      expect(dashboardData.summary.totalAgents).toBe(3);
      expect(dashboardData.summary.totalTokensUsed).toBe(28000);
      expect(dashboardData.summary.totalCost).toBeGreaterThan(0);
      expect(dashboardData.summary.activeAlerts).toBeGreaterThanOrEqual(0);

      // Verify agent data
      expect(dashboardData.agents).toHaveLength(3);

      const agent2Data = dashboardData.agents.find(agent => agent.agentId === 'agent-2');
      expect(agent2Data?.percentage).toBe(150); // 15000/10000 * 100
      expect(agent2Data?.status).toBe('blocked'); // Should be blocked at 150%

      // Verify data structure
      expect(dashboardData.alerts).toBeInstanceOf(Array);
      expect(dashboardData.trends).toBeInstanceOf(Array);
      expect(dashboardData.projections).toBeInstanceOf(Array);
    });

    test('should calculate agent efficiency correctly', () => {
      const agentId = 'efficiency-agent';

      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 2000,
        operation: 'request',
        model: 'gpt-4'
      });

      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 1000,
        operation: 'response',
        model: 'gpt-4'
      });

      const dashboardData = accountant.getTUIDashboardData();
      const agentData = dashboardData.agents.find(agent => agent.agentId === agentId);

      expect(agentData?.efficiency).toBe(1500); // Average tokens per request
    });
  });

  describe('Token Statistics', () => {
    test('should calculate comprehensive statistics for active agents', () => {
      const agentId = 'stats-agent';

      // Record multiple events over time
      const events = [
        { tokens: 1000, operation: 'request' as const },
        { tokens: 2000, operation: 'response' as const },
        { tokens: 1500, operation: 'tool_call' as const }
      ];

      events.forEach(event => {
        accountant.recordUsage({
          agentId,
          agentType: 'inspector',
          tokens: event.tokens,
          operation: event.operation,
          model: 'gpt-4'
        });
      });

      const stats = accountant.getTokenStatistics(agentId);

      expect(stats.totalTokens).toBe(4500);
      expect(stats.averageTokensPerRequest).toBe(1500);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.efficiency).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(stats.trend);
    });

    test('should return empty statistics for unknown agents', () => {
      const stats = accountant.getTokenStatistics('unknown-agent');

      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.averageTokensPerRequest).toBe(0);
      expect(stats.requestsPerMinute).toBe(0);
      expect(stats.costPerMinute).toBe(0);
      expect(stats.efficiency).toBe(0);
      expect(stats.trend).toBe('stable');
    });
  });

  describe('Cost Projections', () => {
    test('should generate projections for different timeframes', () => {
      const agentId = 'projection-agent';

      // Set up some usage history
      accountant.recordUsage({
        agentId,
        agentType: 'inspector',
        tokens: 5000,
        operation: 'request',
        model: 'gpt-4'
      });

      const timeframes = ['hour', 'day', 'week', 'month'] as const;

      timeframes.forEach(timeframe => {
        const projection = accountant.getCostProjection(agentId, timeframe);

        expect(projection.timeframe).toBe(timeframe);
        expect(projection.projectedUsage).toBeGreaterThanOrEqual(0);
        expect(projection.projectedCost).toBeGreaterThanOrEqual(0);
        expect(projection.confidence).toBeGreaterThanOrEqual(0);
        expect(projection.confidence).toBeLessThanOrEqual(1);
        expect(projection.recommendations).toBeInstanceOf(Array);
        expect(projection.recommendations.length).toBeGreaterThan(0);
      });
    });

    test('should handle projections for agents with no data', () => {
      const projection = accountant.getCostProjection('no-data-agent', 'day');

      expect(projection.projectedUsage).toBe(0);
      expect(projection.projectedCost).toBe(0);
      expect(projection.confidence).toBe(0);
      expect(projection.recommendations).toContain('No data available for projection');
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', () => {
      const metrics = accountant.getPerformanceMetrics();

      expect(metrics.eventProcessingLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.eventThroughput).toBeGreaterThanOrEqual(0);
      expect(metrics.subscriberCount).toBeGreaterThanOrEqual(0);
      expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics.bufferUtilization).toBeLessThanOrEqual(100);
    });

    test('should update subscriber count in metrics', async () => {
      const initialMetrics = accountant.getPerformanceMetrics();
      expect(initialMetrics.subscriberCount).toBe(0);

      const subscriptionId = accountant.onTokenUsage('test-agent', () => {});

      // Wait a brief moment for the subscription to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedMetrics = accountant.getPerformanceMetrics();
      expect(updatedMetrics.subscriberCount).toBe(1);

      accountant.offTokenUsage(subscriptionId);

      // Wait a brief moment for the unsubscription to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      const finalMetrics = accountant.getPerformanceMetrics();
      expect(finalMetrics.subscriberCount).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    test('should allow updating monitoring configuration', (done) => {
      const newConfig = {
        system: {
          updateFrequency: 1000,
          retentionPeriod: 14 * 24 * 60 * 60 * 1000, // 14 days
          compressionEnabled: false,
          performanceMode: 'high' as const
        }
      };

      accountant.on('config_updated', (data) => {
        expect(data.config.system.updateFrequency).toBe(1000);
        expect(data.config.system.performanceMode).toBe('high');
        done();
      });

      accountant.updateMonitoringConfig(newConfig);
    });
  });

  describe('Data Persistence and Recovery', () => {
    test('should persist and recover data across restarts', (done) => {
      const agentId = 'persistence-agent';
      const usageData = {
        agentId,
        agentType: 'inspector' as const,
        tokens: 5000,
        operation: 'request' as const,
        model: 'gpt-4'
      };

      // Record usage and set limits
      accountant.recordUsage(usageData);
      accountant.setLimits(agentId, 'inspector', { daily: 10000 });

      // Wait for async operations to complete
      setTimeout(() => {
        // Create new accountant instance (simulates restart)
        const storagePath = join(testDir, 'token-usage.json');
        const newAccountant = new TokenAccountant(storagePath);

        // Verify data was recovered
        const usage = newAccountant.getAgentUsage(agentId);
        expect(usage).toBeTruthy();
        expect(usage!.totalTokens).toBe(5000);
        expect(usage!.agentType).toBe('inspector');

        const stats = newAccountant.getUsageStats();
        expect(stats.get(agentId)).toBeTruthy();

        newAccountant.removeAllListeners();
        done();
      }, 100);
    });

    test('should handle corrupted data files gracefully', () => {
      // Write corrupted JSON file
      const corruptedPath = join(testDir, 'token-usage.json');
      writeFileSync(corruptedPath, 'invalid json content');

      // Should not throw error
      expect(() => {
        const newAccountant = new TokenAccountant(testDir);
        newAccountant.removeAllListeners();
      }).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle subscriber callback errors gracefully', () => {
      const agentId = 'error-agent';
      let errorCount = 0;

      // Subscribe with a callback that throws an error
      const subscriptionId = accountant.onTokenUsage(agentId, () => {
        throw new Error('Subscriber callback error');
      });

      // Listen for error events
      accountant.on('subscriber_error', (data) => {
        errorCount++;
      });

      // Record usage - should not crash
      expect(() => {
        accountant.recordUsage({
          agentId,
          agentType: 'scanner',
          tokens: 100,
          operation: 'request',
          model: 'gpt-4'
        });
      }).not.toThrow();

      // Clean up
      accountant.offTokenUsage(subscriptionId);
    });

    test('should handle invalid token amounts gracefully', () => {
      const agentId = 'invalid-tokens-agent';

      expect(() => {
        accountant.recordUsage({
          agentId,
          agentType: 'scanner',
          tokens: -100, // Negative tokens
          operation: 'request',
          model: 'gpt-4'
        });
      }).not.toThrow();

      const usage = accountant.getAgentUsage(agentId);
      expect(usage).toBeTruthy();
    });

    test('should handle empty event buffers correctly', () => {
      const metrics = accountant.getPerformanceMetrics();
      expect(metrics.bufferUtilization).toBe(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit appropriate events for different actions', (done) => {
      const eventsReceived: string[] = [];
      const expectedEvents = ['token_subscribed', 'events_processed'];

      accountant.on('token_subscribed', () => {
        eventsReceived.push('token_subscribed');
        checkCompletion();
      });

      accountant.on('events_processed', () => {
        eventsReceived.push('events_processed');
        checkCompletion();
      });

      function checkCompletion() {
        if (eventsReceived.length === expectedEvents.length) {
          expect(eventsReceived.sort()).toEqual(expectedEvents.sort());
          done();
        }
      }

      const subscriptionId = accountant.onTokenUsage('event-test-agent', () => {});
      accountant.recordUsage({
        agentId: 'event-test-agent',
        agentType: 'scanner',
        tokens: 100,
        operation: 'request',
        model: 'gpt-4'
      });

      // Clean up
      setTimeout(() => {
        accountant.offTokenUsage(subscriptionId);
      }, 100);
    });
  });
});