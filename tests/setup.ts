/**
 * Jest test setup file
 */

// Set test timeout for E2E tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(60000);
}