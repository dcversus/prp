/**
 * ♫ Signal System Unit Tests
 *
 * Comprehensive test suite for the PRP-007 signal system components.
 */

import React from 'react';
import {
  SignalEvent,
  SignalCodeEnum,
  SignalSourceEnum,
  SignalPriorityEnum,
  SignalTypeEnum
} from '../../src/types';

// Mock React and Ink for component testing
jest.mock('react', () => ({
  useState: jest.fn((initial) => [initial, jest.fn()]),
  useEffect: jest.fn(),
  useRef: jest.fn(() => ({ current: null })),
  useCallback: jest.fn((fn) => fn),
}));

jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children, ...props }: any) => ({ children, props }),
  TextInput: ({ value, onChange }: any) => ({ value, onChange }),
}));

// Import components after mocking
import { SignalTicker } from '../../src/tui/components/SignalTicker';
import { SignalFilter } from '../../src/tui/components/SignalFilter';
import { SignalRouter, getSignalRouter } from '../../src/orchestrator/signal-router';

describe('Signal System Types', () => {
  describe('Signal Enums', () => {
    test('should have correct signal codes', () => {
      expect(SignalCodeEnum.BLOCKER).toBe('bb');
      expect(SignalCodeEnum.DEVELOPMENT_PROGRESS).toBe('dp');
      expect(SignalCodeEnum.TESTS_GREEN).toBe('tg');
      expect(SignalCodeEnum.SYSTEM_FATAL_ERROR).toBe('FF');
    });

    test('should have correct signal sources', () => {
      expect(SignalSourceEnum.ROBO_DEVELOPER).toBe('robo-developer');
      expect(SignalSourceEnum.ROBO_AQA).toBe('robo-aqa');
      expect(SignalSourceEnum.ORCHESTRATOR).toBe('orchestrator');
      expect(SignalSourceEnum.SYSTEM).toBe('system');
    });

    test('should have correct signal priorities', () => {
      expect(SignalPriorityEnum.CRITICAL).toBe('critical');
      expect(SignalPriorityEnum.HIGH).toBe('high');
      expect(SignalPriorityEnum.MEDIUM).toBe('medium');
      expect(SignalPriorityEnum.LOW).toBe('low');
    });

    test('should have correct signal types', () => {
      expect(SignalTypeEnum.AGENT).toBe('agent');
      expect(SignalTypeEnum.SYSTEM).toBe('system');
      expect(SignalTypeEnum.SCANNER).toBe('scanner');
      expect(SignalTypeEnum.INSPECTOR).toBe('inspector');
      expect(SignalTypeEnum.ORCHESTRATOR).toBe('orchestrator');
    });
  });

  describe('SignalEvent Interface', () => {
    test('should create valid SignalEvent', () => {
      const signal: SignalEvent = {
        id: 'test-1',
        type: SignalTypeEnum.AGENT,
        signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
        title: 'Development Progress',
        description: 'Significant development milestone completed',
        timestamp: new Date(),
        source: SignalSourceEnum.ROBO_DEVELOPER,
        priority: SignalPriorityEnum.MEDIUM,
        state: 'active',
        data: {
          fileName: 'test.ts',
          lineNumber: 42,
          context: 'Development context'
        }
      };

      expect(signal.id).toBe('test-1');
      expect(signal.signal).toBe(SignalCodeEnum.DEVELOPMENT_PROGRESS);
      expect(signal.source).toBe(SignalSourceEnum.ROBO_DEVELOPER);
      expect(signal.priority).toBe(SignalPriorityEnum.MEDIUM);
      expect(signal.state).toBe('active');
      expect(signal.data?.fileName).toBe('test.ts');
    });
  });
});

describe('SignalRouter', () => {
  let router: SignalRouter;

  beforeEach(() => {
    router = new SignalRouter({
      enableLogging: false,
      maxRoutes: 10,
      bufferSize: 100
    });
  });

  afterEach(() => {
    router.shutdown();
  });

  describe('Route Management', () => {
    test('should add and remove routes', () => {
      const handler = jest.fn();
      const pattern = /\[dp\]/gi;

      const routeId = router.addRoute(pattern, handler, {
        metadata: { name: 'Development Progress Route' }
      });

      expect(routeId).toBeDefined();
      expect(typeof routeId).toBe('string');

      const route = router.getRoute(routeId);
      expect(route).toBeDefined();
      expect(route?.pattern).toBe(pattern);
      expect(route?.metadata?.name).toBe('Development Progress Route');

      const removed = router.removeRoute(routeId);
      expect(removed).toBe(true);

      const removedRoute = router.getRoute(routeId);
      expect(removedRoute).toBeUndefined();
    });

    test('should not remove non-existent route', () => {
      const removed = router.removeRoute('non-existent');
      expect(removed).toBe(false);
    });

    test('should enforce maximum routes limit', () => {
      const handler = jest.fn();
      const pattern = /\[test\]/gi;

      // Fill up to max routes
      for (let i = 0; i < 10; i++) {
        router.addRoute(pattern, handler);
      }

      // Next add should throw
      expect(() => {
        router.addRoute(pattern, handler);
      }).toThrow('Maximum number of routes (10) reached');
    });

    test('should enable and disable routes', () => {
      const handler = jest.fn();
      const routeId = router.addRoute(/\[dp\]/gi, handler);

      // Default should be enabled
      let route = router.getRoute(routeId);
      expect(route?.enabled).toBe(true);

      // Disable route
      const disabled = router.setRouteEnabled(routeId, false);
      expect(disabled).toBe(true);

      route = router.getRoute(routeId);
      expect(route?.enabled).toBe(false);

      // Enable route
      const enabled = router.setRouteEnabled(routeId, true);
      expect(enabled).toBe(true);

      route = router.getRoute(routeId);
      expect(route?.enabled).toBe(true);
    });
  });

  describe('Signal Routing', () => {
    test('should route signals to matching handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      router.addRoute(/\[dp\]/gi, handler1);
      router.addRoute(/\[bb\]/gi, handler2);

      const signal: SignalEvent = {
        id: 'test-1',
        type: SignalTypeEnum.AGENT,
        signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
        title: 'Development Progress',
        description: 'Progress made',
        timestamp: new Date(),
        source: SignalSourceEnum.ROBO_DEVELOPER,
        priority: SignalPriorityEnum.MEDIUM,
        state: 'active'
      };

      const routesMatched = await router.route(signal);

      expect(routesMatched).toBe(1);
      expect(handler1).toHaveBeenCalledWith(signal);
      expect(handler2).not.toHaveBeenCalled();
    });

    test('should route to multiple matching handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      router.addRoute(/\[dp\]/gi, handler1);
      router.addRoute(/Development/gi, handler2);

      const signal: SignalEvent = {
        id: 'test-1',
        type: SignalTypeEnum.AGENT,
        signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
        title: 'Development Progress',
        description: 'Progress made',
        timestamp: new Date(),
        source: SignalSourceEnum.ROBO_DEVELOPER,
        priority: SignalPriorityEnum.MEDIUM,
        state: 'active'
      };

      const routesMatched = await router.route(signal);

      expect(routesMatched).toBe(2);
      expect(handler1).toHaveBeenCalledWith(signal);
      expect(handler2).toHaveBeenCalledWith(signal);
    });

    test('should handle async handlers', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      router.addRoute(/\[dp\]/gi, handler);

      const signal: SignalEvent = {
        id: 'test-1',
        type: SignalTypeEnum.AGENT,
        signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
        title: 'Development Progress',
        description: 'Progress made',
        timestamp: new Date(),
        source: SignalSourceEnum.ROBO_DEVELOPER,
        priority: SignalPriorityEnum.MEDIUM,
        state: 'active'
      };

      const routesMatched = await router.route(signal);

      expect(routesMatched).toBe(1);
      expect(handler).toHaveBeenCalledWith(signal);
    });

    test('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = jest.fn();

      router.addRoute(/\[dp\]/gi, errorHandler);
      router.addRoute(/Development/gi, successHandler);

      const signal: SignalEvent = {
        id: 'test-1',
        type: SignalTypeEnum.AGENT,
        signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
        title: 'Development Progress',
        description: 'Progress made',
        timestamp: new Date(),
        source: SignalSourceEnum.ROBO_DEVELOPER,
        priority: SignalPriorityEnum.MEDIUM,
        state: 'active'
      };

      const routesMatched = await router.route(signal);

      expect(routesMatched).toBe(1); // Only successful handler counts
      expect(errorHandler).toHaveBeenCalledWith(signal);
      expect(successHandler).toHaveBeenCalledWith(signal);
    });

    test('should route signals by priority', async () => {
      const calls: string[] = [];

      const highPriorityHandler = jest.fn(() => calls.push('high'));
      const lowPriorityHandler = jest.fn(() => calls.push('low'));

      router.addRoute(/\[dp\]/gi, lowPriorityHandler, { priority: 1 });
      router.addRoute(/\[dp\]/gi, highPriorityHandler, { priority: 10 });

      const signal: SignalEvent = {
        id: 'test-1',
        type: SignalTypeEnum.AGENT,
        signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
        title: 'Development Progress',
        description: 'Progress made',
        timestamp: new Date(),
        source: SignalSourceEnum.ROBO_DEVELOPER,
        priority: SignalPriorityEnum.MEDIUM,
        state: 'active'
      };

      await router.route(signal);

      expect(calls).toEqual(['high', 'low']);
    });
  });

  describe('Batch Processing', () => {
    test('should route multiple signals in batch', async () => {
      const handler = jest.fn();

      router.addRoute(/\[dp\]/gi, handler);

      const signals: SignalEvent[] = [
        {
          id: 'test-1',
          type: SignalTypeEnum.AGENT,
          signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
          title: 'Development Progress 1',
          description: 'Progress made',
          timestamp: new Date(),
          source: SignalSourceEnum.ROBO_DEVELOPER,
          priority: SignalPriorityEnum.MEDIUM,
          state: 'active'
        },
        {
          id: 'test-2',
          type: SignalTypeEnum.AGENT,
          signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
          title: 'Development Progress 2',
          description: 'Progress made',
          timestamp: new Date(),
          source: SignalSourceEnum.ROBO_DEVELOPER,
          priority: SignalPriorityEnum.MEDIUM,
          state: 'active'
        }
      ];

      const results = await router.routeBatch(signals);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(1);
      expect(results[1]).toBe(1);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Statistics', () => {
    test('should provide accurate statistics', () => {
      const handler = jest.fn();

      expect(router.getStats().totalRoutes).toBe(0);
      expect(router.getStats().activeRoutes).toBe(0);

      const routeId = router.addRoute(/\[dp\]/gi, handler);

      expect(router.getStats().totalRoutes).toBe(1);
      expect(router.getStats().activeRoutes).toBe(1);

      router.setRouteEnabled(routeId, false);

      expect(router.getStats().totalRoutes).toBe(1);
      expect(router.getStats().activeRoutes).toBe(0);
    });

    test('should track queue status', () => {
      const signal: SignalEvent = {
        id: 'test-1',
        type: SignalTypeEnum.AGENT,
        signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
        title: 'Test',
        description: 'Test',
        timestamp: new Date(),
        source: SignalSourceEnum.ROBO_DEVELOPER,
        priority: SignalPriorityEnum.MEDIUM,
        state: 'active'
      };

      router.addSignalToQueue(signal);

      const status = router.getQueueStatus();
      expect(status.size).toBe(1);
      expect(status.isProcessing).toBe(false);
      expect(status.bufferSize).toBe(100);
    });
  });
});

describe('Signal Components', () => {
  describe('SignalTicker', () => {
    test('should render without crashing', () => {
      const signals: SignalEvent[] = [
        {
          id: 'test-1',
          type: SignalTypeEnum.AGENT,
          signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
          title: 'Development Progress',
          description: 'Progress made',
          timestamp: new Date(),
          source: SignalSourceEnum.ROBO_DEVELOPER,
          priority: SignalPriorityEnum.MEDIUM,
          state: 'active'
        }
      ];

      // This test ensures the component can be instantiated without crashing
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const ticker = React.createElement(SignalTicker, { signals });
      }).not.toThrow();
    });
  });

  describe('SignalFilter', () => {
    test('should filter signals without crashing', () => {
      const signals: SignalEvent[] = [
        {
          id: 'test-1',
          type: SignalTypeEnum.AGENT,
          signal: SignalCodeEnum.DEVELOPMENT_PROGRESS,
          title: 'Development Progress',
          description: 'Progress made',
          timestamp: new Date(),
          source: SignalSourceEnum.ROBO_DEVELOPER,
          priority: SignalPriorityEnum.MEDIUM,
          state: 'active'
        }
      ];

      const mockOnFilter = jest.fn();

      // This test ensures the component can be instantiated without crashing
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const filter = React.createElement(SignalFilter, { signals, onFilter: mockOnFilter });
      }).not.toThrow();
    });
  });
});

describe('Global Signal Router', () => {
  afterEach(() => {
    // Clean up global instance
    if ((global as any).__signalRouter) {
      (global as any).__signalRouter = null;
    }
  });

  test('should provide singleton instance', () => {
    const router1 = getSignalRouter();
    const router2 = getSignalRouter();

    expect(router1).toBe(router2);
    expect(router1).toBeInstanceOf(SignalRouter);
  });

  test('should maintain singleton pattern', () => {
    const router1 = getSignalRouter();
    const router2 = getSignalRouter();

    expect(router1).toBe(router2);
    expect(router1).toBeInstanceOf(SignalRouter);
  });
});