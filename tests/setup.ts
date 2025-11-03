/**
 * Jest test setup file
 */

import { jest } from '@jest/globals';

// Set up test environment
global.console = {
  ...console,
  // Uncomment to ignore specific console log levels during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock problematic ESM dependencies that cause Jest issues
jest.mock('chalk', () => ({
  default: {
    red: jest.fn((text) => text),
    green: jest.fn((text) => text),
    blue: jest.fn((text) => text),
    yellow: jest.fn((text) => text),
    cyan: jest.fn((text) => text),
    magenta: jest.fn((text) => text),
    gray: jest.fn((text) => text),
    white: jest.fn((text) => text),
    bgRed: jest.fn((text) => text),
    bgGreen: jest.fn((text) => text),
    bgBlue: jest.fn((text) => text),
    bold: jest.fn((text) => text),
    dim: jest.fn((text) => text),
    italic: jest.fn((text) => text),
    underline: jest.fn((text) => text)
  }
}));

jest.mock('ora', () => {
  const mockSpinner = {
    start: jest.fn(() => mockSpinner),
    succeed: jest.fn(() => mockSpinner),
    fail: jest.fn(() => mockSpinner),
    stop: jest.fn(() => mockSpinner),
    clear: jest.fn(() => mockSpinner),
    render: jest.fn(() => mockSpinner),
    text: ''
  };
  const ora = jest.fn(() => mockSpinner);
  ora.default = ora;
  return ora;
});

jest.mock('inquirer', () => ({
  prompt: jest.fn(() => Promise.resolve({}))
}));

jest.mock('figlet', () => ({
  textSync: jest.fn((text) => text),
  loadFontSync: jest.fn()
}));

jest.mock('boxen', () => ({
  default: jest.fn((text) => text)
}));

// Mock Node.js modules that might cause issues in tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: jest.requireActual('fs/promises'),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  }))
}));

// Add custom matchers if needed
expect.extend({
  toBeValidTimestamp(received) {
    const pass = typeof received === 'number' && received > 0;
    return {
      message: () =>
        `expected ${received} to be a valid timestamp`,
      pass,
    };
  },
});

// Set up global test timeout
jest.setTimeout(30000);