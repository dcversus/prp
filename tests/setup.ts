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