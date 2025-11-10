/**
 * Jest configuration for PRP testing framework
 * Optimized for ES modules and TypeScript
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test file patterns
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],

  // ES module configuration
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // Handle ES module imports
    '^(\\.{1,2}/.*)\\.js$': '$1',

    // Module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@generators/(.*)$': '<rootDir>/src/generators/$1',
    '^@templates/(.*)$': '<rootDir>/src/templates/$1',
    '^@ai/(.*)$': '<rootDir>/src/ai/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@orchestrator/(.*)$': '<rootDir>/src/orchestrator/$1',
    '^@scanner/(.*)$': '<rootDir>/src/scanner/$1',
    '^@inspector/(.*)$': '<rootDir>/src/inspector/$1',
    '^@tui/(.*)$': '<rootDir>/src/tui/$1',
    '^@agents/(.*)$': '<rootDir>/src/agents/$1',
    '^@audio/(.*)$': '<rootDir>/src/audio/$1',
    '^@commands/(.*)$': '<rootDir>/src/commands/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',

    // Handle specific modules
    '^axios$': 'axios/dist/node/axios.cjs'
  },

  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          module: 'ESNext',
          target: 'ES2022',
          strict: true,
          noUnusedLocals: false, // Disabled for tests
          noUnusedParameters: false, // Disabled for tests
          exactOptionalPropertyTypes: false, // Disabled for tests
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        },
        useESM: true
      }
    ]
  },

  // Ignore transformations for node_modules (except specific packages)
  transformIgnorePatterns: [
    'node_modules/(?!(axios|ink|ink-testing-library|@testing-library|execa|fs-extra|tmp))/'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/__tests__/**',
    '!src/cli.ts', // CLI entry point - hard to test
    '!src/nonInteractive.ts' // Will be tested in integration
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Critical paths must have 100% coverage
    './src/shared/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/scanner/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Performance configuration
  maxWorkers: 4,
  testTimeout: 30000,

  // Reporting
  verbose: true,

  
  // Mock files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Test environment setup
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  }
};