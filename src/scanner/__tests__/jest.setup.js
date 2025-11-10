/**
 * ♫ Scanner Test Setup
 */

/* eslint-disable @typescript-eslint/no-namespace */
 
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

// Configure Jest globals
declare global {
  namespace jest {
    interface Fn<TArgs extends readonly unknown[] = [], TReturn = unknown> {
      (..._args: TArgs): TReturn;
    }
  }
  namespace NodeJS {
    interface Global {
      testUtils: {
        createMockEventBus: () => {
          publishToChannel: jest.Mock;
          on: jest.Mock;
          off: jest.Mock;
          emit: jest.Mock;
        };
        createMockTimeUtils: () => {
          now: () => Date;
          daysAgo: (_days: number) => Date;
          hoursAgo: (_hours: number) => Date;
          minutesAgo: (_minutes: number) => Date;
        };
        createMockFileStats: (_overrides?: Record<string, unknown>) => {
          isFile: jest.Mock;
          isDirectory: jest.Mock;
          size: jest.Mock;
          mtime: jest.Mock;
        };
      };
      testHelpers: {
        delay: (_ms: number) => Promise<void>;
        createMockPRPContent: (_signals?: string[]) => string;
        createMockScanResult: (_overrides?: Record<string, unknown>) => {
          id: string;
          timestamp: Date;
          worktree: string;
          scanType: string;
          changes: unknown[];
          prpUpdates: unknown[];
          signals: unknown[];
          performance: {
            duration: number;
            memoryUsage: number;
            filesScanned: number;
            changesFound: number;
          };
        };
        assertSignalDetection: (_result: { signals: unknown[] }, _expectedSignals: string[]) => void;
      };
      console: {
        log: jest.Mock;
        debug: jest.Mock;
        info: jest.Mock;
        warn: jest.Mock;
        error: jest.Mock;
        [key: string]: jest.Mock;
      };
      expect: jest.Expect;
    }
  }
}

// Mock console methods to reduce test noise
global.console = {
  ...global.console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock process.env for tests
process.env.NODE_ENV = 'test';

// Set up global test utilities
global.testUtils = {
  createMockEventBus: () => ({
    publishToChannel: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }),

  createMockTimeUtils: () => ({
    now: () => new Date('2024-01-01T00:00:00.000Z'),
    daysAgo: (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    hoursAgo: (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000),
    minutesAgo: (minutes: number) => new Date(Date.now() - minutes * 60 * 1000)
  }),

  createMockFileStats: (overrides = {}) => ({
    isFile: jest.fn().mockReturnValue(true),
    isDirectory: jest.fn().mockReturnValue(false),
    size: jest.fn().mockReturnValue(1000),
    mtime: jest.fn().mockReturnValue(new Date()),
    ...overrides
  })
};

// Test helpers
global.testHelpers = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  createMockPRPContent: (signals = []) => {
    let content = '# Test PRP\n\n## progress\n';
    content += signals.map(signal => `[${signal}] ${signal} description`).join('\n');
    content += '\n## description\nTest description\n';
    return content;
  },

  createMockScanResult: (overrides = {}) => ({
    id: 'test-scan-id',
    timestamp: new Date(),
    worktree: 'test-worktree',
    scanType: 'full',
    changes: [],
    prpUpdates: [],
    signals: [],
    performance: {
      duration: 1000,
      memoryUsage: 50000000,
      filesScanned: 10,
      changesFound: 5
    },
    ...overrides
  }),

  assertSignalDetection: (result, expectedSignals) => {
    expect(result.signals).toHaveLength(expectedSignals.length);

    const signalTypes = result.signals.map((s: { type: string }) => s.type);
    expectedSignals.forEach(expectedSignal => {
      expect(signalTypes).toContain(expectedSignal);
    });

    result.signals.forEach((signal: { pattern: unknown; type: unknown; content: unknown; line: unknown; priority: unknown }) => {
      expect(signal).toHaveProperty('pattern');
      expect(signal).toHaveProperty('type');
      expect(signal).toHaveProperty('content');
      expect(signal).toHaveProperty('line');
      expect(signal).toHaveProperty('priority');
    });
  }
};

// Error handling for async tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});