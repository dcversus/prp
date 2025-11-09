/**
 * Jest E2E test setup file
 */

// Mock console methods to reduce noise during tests
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
const mockChalk = {
  red: (text: string) => text,
  green: (text: string) => text,
  blue: (text: string) => text,
  yellow: (text: string) => text,
  cyan: (text: string) => text,
  magenta: (text: string) => text,
  gray: (text: string) => text,
  white: (text: string) => text,
  bgRed: (text: string) => text,
  bgGreen: (text: string) => text,
  bgBlue: (text: string) => text,
  bold: (text: string) => text,
  dim: (text: string) => text,
  italic: (text: string) => text,
  underline: (text: string) => text
};

const mockSpinner = {
  start: jest.fn(() => mockSpinner),
  succeed: jest.fn(() => mockSpinner),
  fail: jest.fn(() => mockSpinner),
  stop: jest.fn(() => mockSpinner),
  clear: jest.fn(() => mockSpinner),
  render: jest.fn(() => mockSpinner),
  text: ''
};

// Setup mock module exports
module.exports = {
  setupFilesAfterEnv: () => {
    // Mock chalk
    jest.doMock('chalk', () => ({
      default: mockChalk,
      ...mockChalk
    }));

    // Mock ora
    jest.doMock('ora', () => {
      const ora = jest.fn(() => mockSpinner);
      ora.default = ora;
      return ora;
    });

    // Mock inquirer
    jest.doMock('inquirer', () => ({
      prompt: jest.fn(() => Promise.resolve({}))
    }));

    // Mock figlet
    jest.doMock('figlet', () => ({
      textSync: jest.fn((text: string) => text),
      loadFontSync: jest.fn()
    }));

    // Mock boxen
    jest.doMock('boxen', () => ({
      default: jest.fn((text: string) => text)
    }));

    // Mock fs
    jest.doMock('fs', () => ({
      ...jest.requireActual('fs'),
      promises: jest.requireActual('fs/promises'),
      createWriteStream: jest.fn(() => ({
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      }))
    }));
  }
};