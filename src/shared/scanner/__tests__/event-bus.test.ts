import { ScannerEventBus } from '../event-bus.js';

import type { ScannerEvent } from '../event-bus.js';

describe('ScannerEventBus', () => {
  let eventBus: ScannerEventBus;

  beforeEach(() => {
    eventBus = new ScannerEventBus();
  });

  describe('emit', () => {
    it('should emit events to subscribers', () => {
      const mockHandler = jest.fn();
      eventBus.subscribe('test-event', mockHandler);

      const testEvent: ScannerEvent = {
        type: 'test-event',
        signal: 'tp',
        timestamp: new Date(),
        source: 'test',
      };

      eventBus.emit(testEvent);

      expect(mockHandler).toHaveBeenCalledWith(testEvent);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should emit events to wildcard subscribers', () => {
      const mockHandler = jest.fn();
      eventBus.subscribeToAll(mockHandler);

      const testEvent: ScannerEvent = {
        type: 'test-event',
        timestamp: new Date(),
      };

      eventBus.emit(testEvent);

      expect(mockHandler).toHaveBeenCalledWith(testEvent);
    });

    it('should store events in history', () => {
      const testEvent: ScannerEvent = {
        type: 'test-event',
        timestamp: new Date(),
      };

      eventBus.emit(testEvent);

      const recent = eventBus.getRecentEvents(1);
      expect(recent).toHaveLength(1);
      expect(recent[0]).toEqual(testEvent);
    });

    it('should limit history size', () => {
      // Create a small event bus for testing
      const smallBus = new ScannerEventBus();
      smallBus.setMaxHistorySize(2);

      const event1: ScannerEvent = { type: 'event1', timestamp: new Date() };
      const event2: ScannerEvent = { type: 'event2', timestamp: new Date() };
      const event3: ScannerEvent = { type: 'event3', timestamp: new Date() };

      smallBus.emit(event1);
      smallBus.emit(event2);
      smallBus.emit(event3);

      const recent = smallBus.getRecentEvents();
      expect(recent).toHaveLength(2);
      expect(recent[0]?.type).toBe('event2');
      expect(recent[1]?.type).toBe('event3');
    });

    it('should handle handler errors gracefully', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();

      eventBus.subscribe('test-event', errorHandler);
      eventBus.subscribe('test-event', normalHandler);

      const testEvent: ScannerEvent = {
        type: 'test-event',
        timestamp: new Date(),
      };

      // Should not throw even if handler throws
      expect(() => eventBus.emit(testEvent)).not.toThrow();

      // Normal handler should still be called
      expect(normalHandler).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should return subscription ID', () => {
      const mockHandler = jest.fn();
      const subscriptionId = eventBus.subscribe('test-event', mockHandler);

      expect(subscriptionId).toMatch(/^sub-\d+$/);
    });

    it('should allow multiple subscriptions to same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);

      const testEvent: ScannerEvent = {
        type: 'test-event',
        timestamp: new Date(),
      };

      eventBus.emit(testEvent);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription', () => {
      const mockHandler = jest.fn();
      const subscriptionId = eventBus.subscribe('test-event', mockHandler);

      eventBus.unsubscribe(subscriptionId);

      const testEvent: ScannerEvent = {
        type: 'test-event',
        timestamp: new Date(),
      };

      eventBus.emit(testEvent);

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle unsubscribing non-existent subscription gracefully', () => {
      expect(() => eventBus.unsubscribe('non-existent')).not.toThrow();
    });
  });

  describe('getRecentEvents', () => {
    it('should return requested number of recent events', () => {
      const events: ScannerEvent[] = [
        { type: 'event1', timestamp: new Date(Date.now() - 3000) },
        { type: 'event2', timestamp: new Date(Date.now() - 2000) },
        { type: 'event3', timestamp: new Date(Date.now() - 1000) },
      ];

      events.forEach((event) => eventBus.emit(event));

      const recent = eventBus.getRecentEvents(2);
      expect(recent).toHaveLength(2);
      expect(recent[0]!.type).toBe('event2');
      expect(recent[1]!.type).toBe('event3');
    });

    it('should return all events if count exceeds available', () => {
      const event: ScannerEvent = { type: 'test', timestamp: new Date() };
      eventBus.emit(event);

      const recent = eventBus.getRecentEvents(10);
      expect(recent).toHaveLength(1);
    });
  });

  describe('getEventsByType', () => {
    it('should return events of specified type', () => {
      const event1: ScannerEvent = { type: 'type-a', timestamp: new Date() };
      const event2: ScannerEvent = { type: 'type-b', timestamp: new Date() };
      const event3: ScannerEvent = { type: 'type-a', timestamp: new Date() };

      [event1, event2, event3].forEach((event) => eventBus.emit(event));

      const typeAEvents = eventBus.getEventsByType('type-a');
      expect(typeAEvents).toHaveLength(2);
      expect(typeAEvents[0]!.type).toBe('type-a');
      expect(typeAEvents[1]!.type).toBe('type-a');
    });

    it('should return empty array for non-existent type', () => {
      const events = eventBus.getEventsByType('non-existent');
      expect(events).toHaveLength(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear event history', () => {
      const event: ScannerEvent = { type: 'test', timestamp: new Date() };
      eventBus.emit(event);

      expect(eventBus.getRecentEvents()).toHaveLength(1);

      eventBus.clearHistory();

      expect(eventBus.getRecentEvents()).toHaveLength(0);
    });
  });

  describe('getSubscriptionMetrics', () => {
    it('should return subscription statistics', () => {
      eventBus.subscribe('event-a', jest.fn());
      eventBus.subscribe('event-a', jest.fn());
      eventBus.subscribe('event-b', jest.fn());
      eventBus.subscribeToAll(jest.fn());

      const metrics = eventBus.getSubscriptionMetrics();

      expect(metrics.total).toBe(4);
      expect(metrics.byEventType['event-a']).toBe(2);
      expect(metrics.byEventType['event-b']).toBe(1);
      expect(metrics.byEventType['*']).toBe(1);
    });

    it('should return empty metrics for no subscriptions', () => {
      const metrics = eventBus.getSubscriptionMetrics();

      expect(metrics.total).toBe(0);
      expect(metrics.byEventType).toEqual({});
    });
  });

  describe('setMaxHistorySize', () => {
    it('should update maximum history size', () => {
      eventBus.setMaxHistorySize(5);
      expect(eventBus.getHealthMetrics().maxHistorySize).toBe(5);
    });

    it('should trim history if new size is smaller than current', () => {
      // Add events
      for (let i = 0; i < 10; i++) {
        eventBus.emit({ type: `event${i}`, timestamp: new Date() });
      }

      expect(eventBus.getRecentEvents()).toHaveLength(10);

      // Reduce size
      eventBus.setMaxHistorySize(3);

      expect(eventBus.getRecentEvents()).toHaveLength(3);
    });
  });

  describe('getHealthMetrics', () => {
    it('should return health metrics', () => {
      eventBus.subscribe('test', jest.fn());
      eventBus.emit({ type: 'test', timestamp: new Date() });

      const metrics = eventBus.getHealthMetrics();

      expect(metrics.totalEvents).toBe(1);
      expect(metrics.maxHistorySize).toBe(1000); // default
      expect(metrics.historyUtilization).toBeLessThan(1);
      expect(metrics.subscriptionMetrics.total).toBe(1);
    });
  });
});
