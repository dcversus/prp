/**
 * ♫ Scanner Test Configuration for Jest
 */

module.exports = {
  displayName: 'Scanner',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(execa)/)'
  ],
  collectCoverageFrom: [
    '../**/*.ts',
    '!../**/__tests__/**',
    '!../**/*.d.ts',
    '!../**/node_modules/**'
  ],
  coverageDirectory: '../coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: [
    'jest.setup.js'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../$1'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 30000
};