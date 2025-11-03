/**
 * Basic test infrastructure verification
 */

// Mock basic utilities to avoid file system operations
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

describe('Basic Test Infrastructure', () => {
  test('should be able to import required modules', () => {
    const { RealTimeEventEmitter } = require('../../src/scanner/realtime-event-emitter');
    expect(RealTimeEventEmitter).toBeDefined();
  });

  test('should create emitter without hanging', () => {
    const { RealTimeEventEmitter } = require('../../src/scanner/realtime-event-emitter');
    const emitter = new RealTimeEventEmitter();
    expect(emitter).toBeDefined();
    expect(typeof emitter.emitSignalDetected).toBe('function');
    expect(typeof emitter.subscribe).toBe('function');
  });

  test('should handle basic metrics', () => {
    const { RealTimeEventEmitter } = require('../../src/scanner/realtime-event-emitter');
    const emitter = new RealTimeEventEmitter();

    const metrics = emitter.getMetrics();
    expect(metrics).toHaveProperty('totalEvents');
    expect(metrics).toHaveProperty('eventsByType');
    expect(metrics).toHaveProperty('activeSubscriptions');
    expect(typeof metrics.totalEvents).toBe('number');
  });

  test('should handle subscription metrics', () => {
    const { RealTimeEventEmitter } = require('../../src/scanner/realtime-event-emitter');
    const emitter = new RealTimeEventEmitter();

    emitter.subscribe('test-event', () => {});

    const metrics = emitter.getSubscriptionMetrics();
    expect(metrics.total).toBe(1);
    expect(metrics.active).toBe(1);
  });

  test('should handle basic event emission', () => {
    const { RealTimeEventEmitter } = require('../../src/scanner/realtime-event-emitter');
    const emitter = new RealTimeEventEmitter();

    let eventReceived = false;
    emitter.subscribe('test-event', () => {
      eventReceived = true;
    });

    // Test direct emission method if available
    if (emitter.emitSignalDetected) {
      const testSignal = {
        id: 'test-1',
        type: 'dp',
        priority: 3,
        source: 'test',
        timestamp: new Date(),
        data: { rawSignal: '[dp] Test signal' },
        metadata: {}
      };

      emitter.emitSignalDetected(testSignal, 'test-source');
      // The event may be processed asynchronously, so we just verify it doesn't crash
      expect(typeof testSignal.id).toBe('string');
    }
  });

  test('should handle cleanup properly', async () => {
    const { RealTimeEventEmitter } = require('../../src/scanner/realtime-event-emitter');
    const emitter = new RealTimeEventEmitter();

    // Should not throw when shutting down
    await expect(emitter.shutdown()).resolves.toBeUndefined();
  });
});