// Jest setup file for ES modules
// This file is loaded before all test files

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Mock some global objects if needed
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Configure jest environment for modules
Object.defineProperty(global, 'fetch', {
  writable: true,
  value: jest.fn(),
});


// Mock execa completely to avoid ESM issues
jest.mock('execa', () => {
  return {
    execa: jest.fn(() => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 })),
    default: jest.fn(() => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 })),
  };
});

// Mock git operations
jest.mock('../src/shared/utils/gitUtils', () => ({
  GitUtils: {
    isGitRepository: jest.fn(() => Promise.resolve(true)),
    getCurrentBranch: jest.fn(() => Promise.resolve('main')),
    getUncommittedFiles: jest.fn(() => Promise.resolve([])),
    getTrackedFiles: jest.fn(() => Promise.resolve(['package.json'])),
    getDiffFiles: jest.fn(() => Promise.resolve([])),
    getCommitHash: jest.fn(() => Promise.resolve('abc123')),
  },
}));