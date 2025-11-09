/**
 * Simple Jest E2E test setup
 */

// Set test timeout for E2E tests after jest is available
setTimeout(() => {
  if (typeof jest !== 'undefined') {
    jest.setTimeout(180000); // 3 minutes
  }
}, 0);

// Mock console to reduce noise
global.console = {
  ...console,
  // Uncomment to ignore console logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});