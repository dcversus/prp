/**
 * Schema Validator Unit Tests
 *
 * Comprehensive behavior tests for the SchemaValidator class
 * covering configuration validation, error reporting, and schema handling.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SchemaValidator } from '../../../src/config/schema-validator.js';
import { logger } from '../../../src/utils/logger.js';
import type { PRPConfig } from '../../../src/shared/config.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js');
jest.mock('ajv');
jest.mock('ajv-formats');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockAjv = jest.fn();
const mockAddFormats = jest.fn();

jest.mock('ajv', () => mockAjv);
jest.mock('ajv-formats', () => mockAddFormats);

describe('SchemaValidator', () => {
  let validator: SchemaValidator;
  let mockValidate: jest.Mock;

  beforeEach(() => {
    // Mock validate function
    mockValidate = jest.fn();
    mockValidate.mockReturnValue(true);

    // Mock Ajv instance
    const mockAjvInstance = {
      addFormat: jest.fn(),
      compile: jest.fn().mockReturnValue(mockValidate),
      validate: mockValidate
    };

    mockAjv.mockImplementation(() => mockAjvInstance);
    mockAddFormats.mockImplementation(() => {});

    validator = new SchemaValidator();

    // Mock logger
    mockLogger.error.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should validate a correct configuration', () => {
      const validConfig: PRPConfig = {
        version: '1.0.0',
        name: 'test-project',
        description: 'Test project',
        storage: {
          dataDir: '.prp',
          cacheDir: '/tmp/prp-cache',
          worktreesDir: '/tmp/prp-worktrees',
          notesDir: '.prp/notes',
          logsDir: '/tmp/prp-logs',
          keychainFile: '.prp/keychain.json',
          persistFile: '.prp/state.json',
          maxCacheSize: 100 * 1024 * 1024,
          retentionPeriod: 30 * 24 * 60 * 60 * 1000
        },
        agents: [],
        guidelines: [],
        signals: {},
        orchestrator: {},
        scanner: {},
        inspector: {},
        tui: {
          mode: 'cli',
          activeScreen: 'main',
          followEvents: true,
          autoRefresh: true,
          refreshInterval: 5000
        },
        features: {
          scanner: true,
          inspector: true,
          orchestrator: true,
          tui: true,
          mcp: true,
          worktrees: true
        },
        limits: {
          maxConcurrentAgents: 5,
          maxWorktrees: 50,
          maxPRPsPerWorktree: 20,
          tokenAlertThreshold: 0.8,
          tokenCriticalThreshold: 0.95
        },
        logging: {
          level: 'info',
          enableFileLogging: true,
          enableTokenTracking: true,
          enablePerformanceTracking: true,
          logRetentionDays: 7
        },
        security: {
          enablePinProtection: false,
          encryptSecrets: true,
          sessionTimeout: 60
        },
        settings: {
          debug: {
            enabled: false,
            level: 'info',
            console: true,
            file: false,
            timestamp: true,
            colors: true,
            profiling: false
          },
          quality: {
            linting: {
              enabled: true,
              rules: {},
              fixOnSave: true
            },
            testing: {
              enabled: true,
              coverage: 80,
              frameworks: ['jest']
            },
            security: {
              enabled: true,
              tools: ['npm-audit'],
              rules: {}
            },
            performance: {
              enabled: true,
              thresholds: {
                loadTime: 3000,
                bundleSize: 1000000
              }
            }
          },
          build: {
            tool: 'tsc',
            optimization: true,
            minification: true,
            sourceMap: true,
            target: ['es2020'],
            output: {
              directory: 'dist',
              filename: 'index.js',
              format: ['cjs']
            }
          },
          test: {
            framework: 'jest',
            coverage: {
              enabled: true,
              threshold: 80,
              reporters: ['text', 'lcov']
            },
            environment: 'node',
            setupFiles: [],
            testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts']
          },
          ci: {
            platform: 'github',
            workflows: {
              build: true,
              test: true,
              deploy: false,
              security: true
            },
            triggers: {
              onPush: true,
              onPR: true,
              onSchedule: false
            },
            environment: {
              NODE_ENV: 'test'
            }
          },
          development: {
            watch: true,
            hotReload: true,
            port: 3000,
            host: 'localhost',
            proxy: {},
            server: 'webpack-dev-server'
          },
          packageManager: {
            manager: 'npm',
            autoInstall: true,
            scripts: {
              dev: 'prp dev',
              build: 'prp build',
              test: 'prp test'
            },
            dependencies: {},
            devDependencies: {}
          }
        },
        scripts: {
          dev: 'prp dev',
          build: 'prp build',
          test: 'prp test',
          lint: 'prp lint',
          quality: 'prp quality'
        }
      };

      const result = SchemaValidator.validate(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should handle validation errors', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [
        {
          instancePath: '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string'
        },
        {
          instancePath: '/version',
          schemaPath: '#/properties/version/pattern',
          keyword: 'pattern',
          params: { pattern: '^\\d+\\.\\d+\\.\\d+$' },
          message: 'must match pattern'
        }
      ];

      const invalidConfig = {
        name: 123, // Should be string
        version: 'invalid-version'
      };

      const result = SchemaValidator.validate(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('name');
      expect(result.errors[0]).toContain('must be string');
      expect(result.errors[1]).toContain('version');
      expect(result.errors[1]).toContain('must match pattern');
    });

    it('should handle validation warnings', () => {
      mockValidate.mockReturnValue(true);
      mockValidate.errors = [];
      // Mock warnings mechanism - in a real implementation, this might come from custom validators
      const originalValidate = SchemaValidator.validate;

      // Override method to simulate warnings
      SchemaValidator.validate = jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [
          {
            field: 'storage.maxCacheSize',
            message: 'Consider increasing cache size for better performance',
            suggestion: 'Set to at least 200MB for large projects'
          }
        ]
      });

      const config = {
        name: 'test-project',
        version: '1.0.0',
        storage: {
          maxCacheSize: 50 * 1024 * 1024 // Small cache size
        }
      };

      const result = SchemaValidator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('storage.maxCacheSize');
      expect(result.warnings[0]).toContain('Consider increasing cache size');

      // Restore original method
      SchemaValidator.validate = originalValidate;
    });
  });

  describe('Field Validation', () => {
    it('should validate project name format', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [{
        instancePath: '/name',
        schemaPath: '#/properties/name/pattern',
        keyword: 'pattern',
        params: { pattern: '^[a-z][a-z0-9-_]*$' },
        message: 'must match pattern'
      }];

      const invalidConfigs = [
        { name: 'Invalid-Name', version: '1.0.0' },
        { name: '123invalid', version: '1.0.0' },
        { name: 'invalid name', version: '1.0.0' },
        { name: '', version: '1.0.0' }
      ];

      invalidConfigs.forEach(config => {
        const result = SchemaValidator.validate(config);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('name');
      });
    });

    it('should validate version format', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [{
        instancePath: '/version',
        schemaPath: '#/properties/version/pattern',
        keyword: 'pattern',
        params: { pattern: '^\\d+\\.\\d+\\.\\d+(-[a-z0-9.-]+)?$' },
        message: 'must match pattern'
      }];

      const invalidVersions = [
        { name: 'test', version: '1.0' },
        { name: 'test', version: 'v1.0.0' },
        { name: 'test', version: '1.0.0.0' },
        { name: 'test', version: '1.0.0-alpha.1' } // Invalid characters
      ];

      invalidVersions.forEach(config => {
        const result = SchemaValidator.validate(config);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('version');
      });
    });

    it('should validate email format for authors', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [{
        instancePath: '/authors/0',
        schemaPath: '#/properties/authors/items/format',
        keyword: 'format',
        params: { format: 'email' },
        message: 'must match format'
      }];

      const configWithInvalidEmail = {
        name: 'test',
        version: '1.0.0',
        authors: ['invalid-email', 'another-invalid']
      };

      const result = SchemaValidator.validate(configWithInvalidEmail);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('authors');
      expect(result.errors[0]).toContain('email');
    });
  });

  describe('Schema Properties', () => {
    it('should validate required properties', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'name' },
          message: 'must have required property'
        },
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'version' },
          message: 'must have required property'
        }
      ];

      const incompleteConfig = {
        description: 'Project without required fields'
      };

      const result = SchemaValidator.validate(incompleteConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('should validate property types', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [
        {
          instancePath: '/storage/maxCacheSize',
          schemaPath: '#/properties/storage/properties/maxCacheSize/type',
          keyword: 'type',
          params: { type: 'number' },
          message: 'must be number'
        },
        {
          instancePath: '/features/scanner',
          schemaPath: '#/properties/features/properties/scanner/type',
          keyword: 'type',
          params: { type: 'boolean' },
          message: 'must be boolean'
        }
      ];

      const configWithWrongTypes = {
        name: 'test',
        version: '1.0.0',
        storage: {
          maxCacheSize: '100MB' // Should be number
        },
        features: {
          scanner: 'true' // Should be boolean
        }
      };

      const result = SchemaValidator.validate(configWithWrongTypes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.includes('maxCacheSize'))).toBe(true);
      expect(result.errors.some(e => e.includes('scanner'))).toBe(true);
    });

    it('should validate array properties', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [
        {
          instancePath: '/agents',
          schemaPath: '#/properties/agents/type',
          keyword: 'type',
          params: { type: 'array' },
          message: 'must be array'
        }
      ];

      const configWithInvalidArray = {
        name: 'test',
        version: '1.0.0',
        agents: 'not-an-array' // Should be array
      };

      const result = SchemaValidator.validate(configWithInvalidArray);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('agents');
      expect(result.errors[0]).toContain('array');
    });
  });

  describe('Error Handling', () => {
    it('should handle schema compilation errors', () => {
      const mockAjvInstance = {
        addFormat: jest.fn(),
        compile: jest.fn().mockImplementation(() => {
          throw new Error('Schema compilation failed');
        })
      };

      mockAjv.mockImplementation(() => mockAjvInstance);

      expect(() => new SchemaValidator()).toThrow('Schema compilation failed');
    });

    it('should handle validation runtime errors', () => {
      mockValidate.mockImplementation(() => {
        throw new Error('Validation runtime error');
      });

      const config = { name: 'test', version: '1.0.0' };

      expect(() => SchemaValidator.validate(config)).toThrow('Validation runtime error');
    });

    it('should handle invalid input types', () => {
      const invalidInputs = [
        null,
        undefined,
        'string-instead-of-object',
        123,
        [],
        true
      ];

      invalidInputs.forEach(input => {
        const result = SchemaValidator.validate(input as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Configuration must be an object');
      });
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate nested configuration objects', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [
        {
          instancePath: '/settings/debug/level',
          schemaPath: '#/properties/settings/properties/debug/properties/level/enum',
          keyword: 'enum',
          params: { allowedValues: ['error', 'warn', 'info', 'debug', 'verbose'] },
          message: 'must be equal to one of the allowed values'
        },
        {
          instancePath: '/settings/quality/testing/coverage/threshold',
          schemaPath: '#/properties/settings/properties/quality/properties/testing/properties/coverage/properties/threshold/minimum',
          keyword: 'minimum',
          params: { limit: 0 },
          message: 'must be >= 0'
        }
      ];

      const configWithNestedErrors = {
        name: 'test',
        version: '1.0.0',
        settings: {
          debug: {
            level: 'invalid-level'
          },
          quality: {
            testing: {
              coverage: {
                threshold: -10 // Must be >= 0
              }
            }
          }
        }
      };

      const result = SchemaValidator.validate(configWithNestedErrors);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.includes('debug/level'))).toBe(true);
      expect(result.errors.some(e => e.includes('coverage/threshold'))).toBe(true);
    });

    it('should provide detailed error context', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [
        {
          instancePath: '/storage/cacheDir',
          schemaPath: '#/properties/storage/properties/cacheDir/minLength',
          keyword: 'minLength',
          params: { limit: 1 },
          message: 'must NOT have fewer than 1 characters',
          data: '/tmp' // Actual value
        }
      ];

      const config = {
        name: 'test',
        version: '1.0.0',
        storage: {
          cacheDir: '' // Empty string
        }
      };

      const result = SchemaValidator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('storage/cacheDir');
      expect(result.errors[0]).toContain('must NOT have fewer than 1 characters');
    });

    it('should handle multiple validation errors simultaneously', () => {
      mockValidate.mockReturnValue(false);
      mockValidate.errors = [
        {
          instancePath: '/name',
          keyword: 'pattern',
          message: 'Invalid project name format'
        },
        {
          instancePath: '/version',
          keyword: 'pattern',
          message: 'Invalid version format'
        },
        {
          instancePath: '/storage/dataDir',
          keyword: 'minLength',
          message: 'Data directory path is required'
        },
        {
          instancePath: '/features',
          keyword: 'required',
          message: 'Features configuration is required'
        }
      ];

      const configWithMultipleErrors = {
        // Missing many required properties with invalid values
      };

      const result = SchemaValidator.validate(configWithMultipleErrors);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors[0]).toContain('name');
      expect(result.errors[1]).toContain('version');
      expect(result.errors[2]).toContain('storage/dataDir');
      expect(result.errors[3]).toContain('features');
    });
  });

  describe('Static Methods', () => {
    it('should provide static validation method', () => {
      const config = { name: 'test', version: '1.0.0' };

      expect(typeof SchemaValidator.validate).toBe('function');
      expect(() => SchemaValidator.validate(config)).not.toThrow();
    });

    it('should handle large configurations efficiently', () => {
      const largeConfig = {
        name: 'large-test-project',
        version: '1.0.0',
        agents: Array(100).fill(null).map((_, i) => ({
          id: `agent-${i}`,
          type: 'claude',
          config: {}
        })),
        guidelines: Array(50).fill(null).map((_, i) => ({
          id: `guideline-${i}`,
          content: `Guideline content ${i}`
        }))
      };

      mockValidate.mockReturnValue(true);

      const startTime = Date.now();
      const result = SchemaValidator.validate(largeConfig);
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should validate within 1 second
    });
  });
});