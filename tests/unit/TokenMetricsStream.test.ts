/**
 * Unit tests for TokenMetricsStream
 */

import { TokenMetricsStream, TokenStreamSubscriber } from '../../src/shared/monitoring/TokenMetricsStream.js';
import { TokenDataPoint } from '../../src/shared/types/token-metrics.js';

describe('TokenMetricsStream', () => {
  let stream: TokenMetricsStream;

  beforeEach(() => {
    stream = new TokenMetricsStream({
      bufferSize: 100,
      backpressureThreshold: 50,
      maxSubscribers: 10
    });
  });

  afterEach(() => {
    stream.destroy();
  });

  describe('Subscription Management', () => {
    let testData: TokenDataPoint;
    let receivedData: TokenDataPoint[];
    let subscriber: TokenStreamSubscriber;

    beforeEach(() => {
      testData = {
        timestamp: new Date(),
        agentId: 'test-agent-1',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900,
        cost: 0.01
      };

      receivedData = [];
      subscriber = (data: TokenDataPoint) => {
        receivedData.push(data);
      };
    });

    it('should subscribe to agent data updates', (done) => {
      stream.subscribe('test-agent-1', subscriber);
      stream.publish(testData);

      // Wait for async delivery
      setTimeout(() => {
        expect(receivedData).toHaveLength(1);
        expect(receivedData[0]).toEqual(testData);
        done();
      }, 10);
    });

    it('should support multiple subscribers for the same agent', (done) => {
      const receivedData2: TokenDataPoint[] = [];
      const subscriber2: TokenStreamSubscriber = (data) => {
        receivedData2.push(data);
      };

      stream.subscribe('test-agent-1', subscriber);
      stream.subscribe('test-agent-1', subscriber2);
      stream.publish(testData);

      setTimeout(() => {
        expect(receivedData).toHaveLength(1);
        expect(receivedData2).toHaveLength(1);
        expect(receivedData[0]).toEqual(testData);
        expect(receivedData2[0]).toEqual(testData);
        done();
      }, 10);
    });

    it('should unsubscribe correctly', (done) => {
      stream.subscribe('test-agent-1', subscriber);
      stream.publish(testData);

      setTimeout(() => {
        expect(receivedData).toHaveLength(1);

        stream.unsubscribe('test-agent-1', subscriber);
        stream.publish({
          ...testData,
          tokensUsed: 200,
          remaining: 800
        });

        setTimeout(() => {
          expect(receivedData).toHaveLength(1); // Should still be 1, not 2
          done();
        }, 10);
      }, 10);
    });

    it('should handle unsubscribe for non-existent subscriber gracefully', () => {
      expect(() => {
        stream.unsubscribe('non-existent-agent', subscriber);
      }).not.toThrow();
    });

    it('should throw error for invalid callback', () => {
      expect(() => {
        stream.subscribe('test-agent-1', null as any);
      }).toThrow('Callback must be a function');

      expect(() => {
        stream.subscribe('test-agent-1', 'invalid' as any);
      }).toThrow('Callback must be a function');
    });

    it('should enforce maximum subscribers limit', () => {
      const smallStream = new TokenMetricsStream({ maxSubscribers: 2 });

      smallStream.subscribe('test-agent-1', subscriber);
      smallStream.subscribe('test-agent-1', () => {});

      expect(() => {
        smallStream.subscribe('test-agent-1', () => {});
      }).toThrow('Maximum subscribers (2) reached for agent test-agent-1');

      smallStream.destroy();
    });
  });

  describe('Data Publishing', () => {
    let testData: TokenDataPoint;

    beforeEach(() => {
      testData = {
        timestamp: new Date(),
        agentId: 'test-agent-1',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900,
        cost: 0.01
      };
    });

    it('should publish data to correct subscribers only', (done) => {
      const receivedData1: TokenDataPoint[] = [];
      const receivedData2: TokenDataPoint[] = [];

      stream.subscribe('agent-1', (data) => receivedData1.push(data));
      stream.subscribe('agent-2', (data) => receivedData2.push(data));

      stream.publish({ ...testData, agentId: 'agent-1' });

      setTimeout(() => {
        expect(receivedData1).toHaveLength(1);
        expect(receivedData2).toHaveLength(0);
        done();
      }, 10);
    });

    it('should validate data points', () => {
      expect(() => {
        stream.publish(null as any);
      }).toThrow('Data point cannot be null or undefined');

      expect(() => {
        stream.publish({} as any);
      }).toThrow('Invalid agentId: must be a non-empty string');

      expect(() => {
        stream.publish({
          ...testData,
          agentId: ''
        });
      }).toThrow('Invalid agentId: must be a non-empty string');

      expect(() => {
        stream.publish({
          ...testData,
          timestamp: 'invalid' as any
        });
      }).toThrow('Invalid timestamp: must be a Date object');

      expect(() => {
        stream.publish({
          ...testData,
          tokensUsed: -1
        });
      }).toThrow('Invalid tokensUsed: must be a non-negative number');

      expect(() => {
        stream.publish({
          ...testData,
          limit: -1
        });
      }).toThrow('Invalid limit: must be a non-negative number');

      expect(() => {
        stream.publish({
          ...testData,
          remaining: -1
        });
      }).toThrow('Invalid remaining: must be a non-negative number');

      expect(() => {
        stream.publish({
          ...testData,
          cost: -1
        });
      }).toThrow('Invalid cost: must be a non-negative number or undefined');
    });

    it('should handle subscriber errors gracefully', (done) => {
      const errorCallback = jest.fn(() => {
        throw new Error('Subscriber error');
      });

      stream.subscribe('test-agent-1', errorCallback);

      const errorSpy = jest.spyOn(stream, 'emit');
      stream.publish(testData);

      setTimeout(() => {
        expect(errorSpy).toHaveBeenCalledWith('subscriber_error', expect.objectContaining({
          agentId: 'test-agent-1',
          error: expect.any(Error)
        }));
        done();
      }, 10);
    });
  });

  describe('Buffer Management', () => {
    it('should maintain buffer within size limits', () => {
      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      // Publish more data than buffer size
      for (let i = 0; i < 150; i++) {
        stream.publish({
          ...dataPoint,
          timestamp: new Date(Date.now() + i),
          tokensUsed: i
        });
      }

      const allData = stream.getAllLatestData(200);
      expect(allData.length).toBeLessThanOrEqual(100); // Buffer size
    });

    it('should get latest data for specific agent', () => {
      const dataPoint1: TokenDataPoint = {
        timestamp: new Date(Date.now() - 1000),
        agentId: 'agent-1',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      const dataPoint2: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'agent-1',
        tokensUsed: 200,
        limit: 1000,
        remaining: 800
      };

      const dataPoint3: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'agent-2',
        tokensUsed: 300,
        limit: 1000,
        remaining: 700
      };

      stream.publish(dataPoint1);
      stream.publish(dataPoint2);
      stream.publish(dataPoint3);

      const agent1Data = stream.getLatestData('agent-1');
      expect(agent1Data).toHaveLength(2);
      expect(agent1Data[0]?.tokensUsed).toBe(200); // Latest first
      expect(agent1Data[1]?.tokensUsed).toBe(100);
    });

    it('should clear buffer for specific agent', () => {
      const dataPoint1: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'agent-1',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      const dataPoint2: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'agent-2',
        tokensUsed: 200,
        limit: 1000,
        remaining: 800
      };

      stream.publish(dataPoint1);
      stream.publish(dataPoint2);

      expect(stream.getAllLatestData()).toHaveLength(2);

      stream.clearBuffer('agent-1');

      const remainingData = stream.getAllLatestData();
      expect(remainingData).toHaveLength(1);
      expect(remainingData[0]?.agentId).toBe('agent-2');
    });

    it('should clear entire buffer', () => {
      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      stream.publish(dataPoint);
      expect(stream.getAllLatestData()).toHaveLength(1);

      stream.clearBuffer();
      expect(stream.getAllLatestData()).toHaveLength(0);
    });
  });

  describe('Backpressure Handling', () => {
    it('should detect backpressure condition', () => {
      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      expect(stream.isUnderBackpressure()).toBe(false);

      // Publish enough data to trigger backpressure
      for (let i = 0; i < 60; i++) { // Backpressure threshold is 50
        stream.publish({
          ...dataPoint,
          timestamp: new Date(Date.now() + i)
        });
      }

      expect(stream.isUnderBackpressure()).toBe(true);
    });

    it('should emit backpressure events', () => {
      const backpressureSpy = jest.spyOn(stream, 'emit');
      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      // Trigger backpressure
      for (let i = 0; i < 60; i++) {
        stream.publish({
          ...dataPoint,
          timestamp: new Date(Date.now() + i)
        });
      }

      expect(backpressureSpy).toHaveBeenCalledWith('backpressure', expect.objectContaining({
        bufferSize: expect.any(Number),
        threshold: 50
      }));
    });

    it('should drop data under severe backpressure', () => {
      const dropSpy = jest.spyOn(stream, 'emit');
      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      // Create severe backpressure (1.5x threshold)
      for (let i = 0; i < 80; i++) {
        stream.publish({
          ...dataPoint,
          timestamp: new Date(Date.now() + i)
        });
      }

      expect(dropSpy).toHaveBeenCalledWith('data_dropped', expect.objectContaining({
        droppedCount: expect.any(Number),
        bufferSize: expect.any(Number)
      }));
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();
      const subscriber3 = jest.fn();

      stream.subscribe('agent-1', subscriber1);
      stream.subscribe('agent-1', subscriber2);
      stream.subscribe('agent-2', subscriber3);

      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      stream.publish(dataPoint);

      const stats = stream.getStatistics();
      expect(stats.totalSubscribers).toBe(3);
      expect(stats.subscribersByAgent).toEqual({
        'agent-1': 2,
        'agent-2': 1
      });
      expect(stats.bufferSize).toBe(1);
      expect(stats.bufferUtilization).toBe(1); // 1/100 * 100
    });
  });

  describe('Event Emission', () => {
    it('should emit subscriber_added event', () => {
      const spy = jest.spyOn(stream, 'emit');
      const subscriber = jest.fn();

      stream.subscribe('test-agent', subscriber);

      expect(spy).toHaveBeenCalledWith('subscriber_added', {
        agentId: 'test-agent',
        subscriberCount: 1
      });
    });

    it('should emit subscriber_removed event', () => {
      const spy = jest.spyOn(stream, 'emit');
      const subscriber = jest.fn();

      stream.subscribe('test-agent', subscriber);
      stream.unsubscribe('test-agent', subscriber);

      expect(spy).toHaveBeenCalledWith('subscriber_removed', {
        agentId: 'test-agent',
        subscriberCount: 0,
        totalSubscribers: 0
      });
    });

    it('should emit data_published event', () => {
      const spy = jest.spyOn(stream, 'emit');
      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      stream.publish(dataPoint);

      expect(spy).toHaveBeenCalledWith('data_published', {
        agentId: 'test-agent',
        timestamp: dataPoint.timestamp,
        bufferSize: 1
      });
    });

    it('should emit buffer_cleared event', () => {
      const spy = jest.spyOn(stream, 'emit');

      stream.clearBuffer('test-agent');

      expect(spy).toHaveBeenCalledWith('buffer_cleared', {
        agentId: 'test-agent'
      });
    });
  });

  describe('Cleanup', () => {
    it('should destroy resources properly', () => {
      const subscriber = jest.fn();
      stream.subscribe('test-agent', subscriber);

      const dataPoint: TokenDataPoint = {
        timestamp: new Date(),
        agentId: 'test-agent',
        tokensUsed: 100,
        limit: 1000,
        remaining: 900
      };

      stream.publish(dataPoint);

      expect(stream.getStatistics().totalSubscribers).toBe(1);
      expect(stream.getAllLatestData()).toHaveLength(1);

      stream.destroy();

      expect(stream.getStatistics().totalSubscribers).toBe(0);
      expect(stream.getAllLatestData()).toHaveLength(0);
    });
  });
});