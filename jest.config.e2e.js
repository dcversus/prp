/**
 * Jest configuration for E2E tests
 */

export default {
  displayName: 'E2E',
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.tsx'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        module: 'ESNext',
        target: 'ES2022',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^axios$': 'axios/dist/node/axios.cjs',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(ink|ink-testing-library|react)/)'
  ],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testTimeout: 30000,
  verbose: true
};