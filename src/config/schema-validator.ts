/**
 * Configuration Schema Validator
 */
import { readFile } from 'fs/promises';

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import { ConfigurationError } from '../shared/utils/error-handler';
import { logger } from '../shared/logger';
// Embed JSON schema directly to avoid path resolution issues
const schema: Record<string, unknown> = {
  $id: 'https://prp.dev/schemas/prp-config.schema.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PRP Configuration',
  description: 'PRP (Product Requirement Prompts) CLI configuration',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Project name',
      default: 'prp-project',
      pattern: '^[a-z][a-z0-9-_]*$',
      minLength: 1,
      maxLength: 100,
    },
    description: {
      type: 'string',
      description: 'Project description',
      default: '',
      maxLength: 500,
    },
    version: {
      type: 'string',
      description: 'Project version',
      default: '0.1.0',
      pattern: '^\\d+\\.\\d+\\.\\d+(-[a-z0-9.-]+)?$',
    },
    authors: {
      type: 'array',
      description: 'Project authors',
      items: {
        type: 'string',
        format: 'email',
      },
      default: [],
    },
    license: {
      type: 'string',
      description: 'Project license',
      default: 'MIT',
      enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 'UNLICENSED'],
    },
    repository: {
      type: 'object',
      description: 'Repository configuration',
      properties: {
        type: {
          type: 'string',
          enum: ['git', 'svn', 'hg'],
          default: 'git',
        },
        url: {
          type: 'string',
          format: 'uri',
          description: 'Repository URL',
        },
      },
      additionalProperties: false,
    },
    features: {
      type: 'object',
      description: 'Feature flags',
      properties: {
        orchestrator: {
          type: 'boolean',
          description: 'Enable orchestrator',
          default: true,
        },
        scanner: {
          type: 'boolean',
          description: 'Enable scanner',
          default: true,
        },
        inspector: {
          type: 'boolean',
          description: 'Enable inspector',
          default: true,
        },
        tui: {
          type: 'boolean',
          description: 'Enable TUI',
          default: true,
        },
        templates: {
          type: 'boolean',
          description: 'Enable templates',
          default: true,
        },
        nudge: {
          type: 'boolean',
          description: 'Enable nudge system',
          default: false,
        },
      },
      additionalProperties: false,
      default: {},
    },
    agents: {
      type: 'array',
      description: 'Agent configuration',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Agent name',
          },
          type: {
            type: 'string',
            enum: [
              'robo-developer',
              'robo-aqa',
              'robo-ux-ui-designer',
              'robo-devops-sre',
              'robo-system-analyst',
              'robo-quality-control',
            ],
            description: 'Agent type',
          },
          enabled: {
            type: 'boolean',
            description: 'Agent enabled',
            default: true,
          },
          config: {
            type: 'object',
            description: 'Agent-specific configuration',
            additionalProperties: true,
            default: {},
          },
        },
        required: ['name', 'type'],
        additionalProperties: false,
      },
      default: [],
    },
    templates: {
      type: 'array',
      description: 'Template configuration',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Template name',
          },
          type: {
            type: 'string',
            enum: ['typescript', 'react', 'nestjs', 'fastapi', 'nextjs', 'nuxt'],
            description: 'Template type',
          },
          enabled: {
            type: 'boolean',
            description: 'Template enabled',
            default: true,
          },
          path: {
            type: 'string',
            description: 'Template path',
          },
        },
        required: ['name', 'type'],
        additionalProperties: false,
      },
      default: [],
    },
    connections: {
      type: 'object',
      description: 'External connections',
      properties: {
        github: {
          type: 'object',
          description: 'GitHub connection',
          properties: {
            enabled: {
              type: 'boolean',
              default: false,
            },
            token: {
              type: 'string',
              description: 'GitHub token',
            },
            defaultBranch: {
              type: 'string',
              default: 'main',
              enum: ['main', 'master'],
            },
          },
          additionalProperties: false,
        },
        registry: {
          type: 'object',
          description: 'Package registry connection',
          properties: {
            enabled: {
              type: 'boolean',
              default: false,
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Registry URL',
            },
            auth: {
              type: 'object',
              description: 'Authentication configuration',
              properties: {
                type: {
                  type: 'string',
                  enum: ['basic', 'bearer', 'token'],
                  description: 'Auth type',
                },
                credentials: {
                  type: 'string',
                  description: 'Authentication credentials',
                },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
      default: {},
    },
    settings: {
      type: 'object',
      description: 'Global settings',
      properties: {
        debug: {
          type: 'object',
          description: 'Debug settings',
          properties: {
            enabled: {
              type: 'boolean',
              default: false,
            },
            level: {
              type: 'string',
              enum: ['error', 'warn', 'info', 'debug', 'trace'],
              default: 'info',
            },
            output: {
              type: 'string',
              enum: ['console', 'file', 'both'],
              default: 'console',
            },
          },
          additionalProperties: false,
        },
        development: {
          type: 'object',
          description: 'Development settings',
          properties: {
            watch: {
              type: 'boolean',
              default: false,
            },
            hotReload: {
              type: 'boolean',
              default: false,
            },
            port: {
              type: 'number',
              default: 3000,
              minimum: 1024,
              maximum: 65535,
            },
          },
          additionalProperties: false,
        },
        test: {
          type: 'object',
          description: 'Test settings',
          properties: {
            environment: {
              type: 'string',
              enum: ['node', 'browser', 'both'],
              default: 'node',
            },
            coverage: {
              type: 'boolean',
              default: true,
            },
            timeout: {
              type: 'number',
              default: 5000,
              minimum: 1000,
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
      default: {},
    },
    security: {
      type: 'object',
      description: 'Security settings',
      properties: {
        enablePinProtection: {
          type: 'boolean',
          default: false,
        },
        encryptSecrets: {
          type: 'boolean',
          default: true,
        },
        allowedOrigins: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uri',
          },
          default: [],
        },
      },
      additionalProperties: false,
    },
    limits: {
      type: 'object',
      description: 'Resource limits',
      properties: {
        maxConcurrentAgents: {
          type: 'number',
          default: 5,
          minimum: 1,
          maximum: 20,
        },
        maxProjects: {
          type: 'number',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
        tokenAlertThreshold: {
          type: 'number',
          default: 0.8,
          minimum: 0,
          maximum: 1,
        },
        maxFileSize: {
          type: 'number',
          default: 10485760,
          minimum: 1024,
          description: 'Maximum file size in bytes',
        },
      },
      additionalProperties: false,
    },
  },
  required: ['name'],
  additionalProperties: false,
};
/**
 * Initialize AJV with formats and options
 */
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  allowUnionTypes: true,
  removeAdditional: false,
  useDefaults: false,
  coerceTypes: false,
  addUsedSchema: false,
});
// Add JSON schema formats
addFormats(ajv);
// Custom formatters for better error messages
ajv.addKeyword({
  keyword: 'errorMessage',
  type: 'string',
  schemaType: 'string',
});
// Compile the schema
let validateFunction: ValidateFunction;
try {
  validateFunction = ajv.compile(schema);
} catch (error) {
  logger.error(
    'config',
    'SchemaValidator',
    'Failed to compile JSON schema',
    error instanceof Error ? error : new Error(String(error)),
  );
  throw new ConfigurationError('Failed to compile configuration schema');
}
/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
  allowedValues?: unknown[];
  constraint?: string;
}
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}
/**
 * Format AJV errors to our validation format
 */
const formatErrors = (errors: ErrorObject[]): ValidationError[] => {
  return errors.map((error) => {
    const field = error.instancePath || error.schemaPath || 'unknown';
    const message = error.message ?? 'Unknown validation error';
    // Extract value from the error data
    let value: unknown;
    if (error.data !== undefined) {
      value = error.data;
    }
    // Extract allowed values for enum errors
    let allowedValues: unknown[] = [];
    if (error.keyword === 'enum' && error.schema && Array.isArray(error.schema)) {
      allowedValues = error.schema;
    }
    // Extract constraint for other errors
    let constraint: string | undefined;
    if (error.keyword === 'minimum' || error.keyword === 'maximum') {
      constraint = `${error.keyword}: ${error.schema}`;
    } else if (error.keyword === 'minLength' || error.keyword === 'maxLength') {
      constraint = `${error.keyword}: ${error.schema}`;
    } else if (error.keyword === 'pattern') {
      constraint = `pattern: ${error.schema}`;
    }
    const result: ValidationError = {
      field: field.replace(/^\//, '').replace(/\//g, '.'),
      message,
      value,
      allowedValues,
    };

    if (constraint !== undefined) {
      result.constraint = constraint;
    }

    return result;
  });
};
/**
 * Generate warnings based on configuration content
 */
const generateWarnings = (config: Record<string, unknown>): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  // Warning for default project name
  if (config.name === 'prp-project') {
    warnings.push({
      field: 'name',
      message: 'Using default project name',
      suggestion: 'Consider setting a descriptive project name',
    });
  }
  // Warning for empty description
  const {description} = config;
  if (
    !description ||
    (typeof description === 'string' && description.trim() === '')
  ) {
    warnings.push({
      field: 'description',
      message: 'Project description is empty',
      suggestion: 'Add a description to help identify the project purpose',
    });
  }
  // Warning for no agents configured
  const {agents} = config;
  if (!agents || (Array.isArray(agents) && agents.length === 0)) {
    warnings.push({
      field: 'agents',
      message: 'No agents configured',
      suggestion: 'Add at least one agent to enable AI assistance',
    });
  }
  // Warning for all features disabled
  const {features} = config;
  if (features && typeof features === 'object' && features !== null) {
    const featuresRecord = features as Record<string, boolean>;
    const enabledFeatures = Object.values(featuresRecord).filter(Boolean);
    if (enabledFeatures.length === 0) {
      warnings.push({
        field: 'features',
        message: 'All features are disabled',
        suggestion: 'Enable at least one feature to use PRP functionality',
      });
    }
  }
  // Warning for high limits
  const {limits} = config;
  if (limits && typeof limits === 'object' && limits !== null) {
    const limitsRecord = limits as Record<string, number>;
    const {maxConcurrentAgents} = limitsRecord;
    if (maxConcurrentAgents && maxConcurrentAgents > 10) {
      warnings.push({
        field: 'limits.maxConcurrentAgents',
        message: 'High concurrent agent limit may impact performance',
        suggestion: 'Consider reducing to 5-10 agents for better performance',
      });
    }
    const {tokenAlertThreshold} = limitsRecord;
    if (tokenAlertThreshold !== undefined && tokenAlertThreshold < 0.5) {
      warnings.push({
        field: 'limits.tokenAlertThreshold',
        message: 'Low token alert threshold may cause frequent warnings',
        suggestion: 'Consider setting to 0.7-0.8 for balanced monitoring',
      });
    }
  }
  // Warning for debug settings in production
  const {settings} = config;
  if (settings && typeof settings === 'object' && settings !== null) {
    const settingsRecord = settings as Record<string, unknown>;
    const {debug} = settingsRecord;
    if (debug && typeof debug === 'object' && debug !== null) {
      const debugRecord = debug as Record<string, unknown>;
      if (debugRecord.enabled === true) {
        warnings.push({
          field: 'settings.debug.enabled',
          message: 'Debug mode is enabled',
          suggestion: 'Disable debug mode in production for better performance',
        });
      }
    }
  }
  return warnings;
};
/**
 * Main schema validator class
 */
export class SchemaValidator {
  /**
   * Validate configuration against schema
   */
  static validate(config: unknown): ValidationResult {
    if (!validateFunction(config)) {
      const errors = validateFunction.errors ?? [];
      return {
        isValid: false,
        errors: formatErrors(errors),
        warnings: [],
      };
    }
    // If schema validation passes, generate warnings
    const warnings = generateWarnings(config as Record<string, unknown>);
    return {
      isValid: true,
      errors: [],
      warnings,
    };
  }
  /**
   * Validate configuration file by loading and validating
   */
  static async validateFile(filePath: string): Promise<ValidationResult> {
    try {
      const configData = await readFile(filePath, 'utf8');
      const config = JSON.parse(configData);
      return this.validate(config);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `Failed to read configuration file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  /**
   * Get schema for introspection/documentation
   */
  static getSchema(): Record<string, unknown> {
    return schema;
  }
  /**
   * Get configuration template with defaults
   */
  static getTemplate(): Record<string, unknown> {
    // Extract default values from schema
    const extractDefaults = (schemaObj: Record<string, unknown>): Record<string, unknown> => {
      const defaults: Record<string, unknown> = {};
      if (schemaObj.default !== undefined) {
        return schemaObj.default as Record<string, unknown>;
      }
      if (schemaObj.type === 'object' && schemaObj.properties) {
        const properties = schemaObj.properties as Record<string, Record<string, unknown>>;
        for (const [key, propSchema] of Object.entries(properties)) {
          if (propSchema.default !== undefined) {
            defaults[key] = propSchema.default;
          } else if (propSchema.type === 'object' && propSchema.properties) {
            defaults[key] = extractDefaults(propSchema);
          } else if (propSchema.type === 'array' && propSchema.items) {
            // For arrays, we can't provide meaningful defaults without more context
            defaults[key] = [];
          } else if (propSchema.type === 'boolean') {
            defaults[key] = false;
          } else if (propSchema.type === 'string') {
            defaults[key] =
              propSchema.enum && Array.isArray(propSchema.enum) ? propSchema.enum[0] : '';
          } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
            if (propSchema.minimum !== undefined) {
              defaults[key] = propSchema.minimum;
            } else if (propSchema.maximum !== undefined) {
              defaults[key] = propSchema.maximum;
            } else {
              defaults[key] = 0;
            }
          }
        }
      }
      return defaults;
    };
    return extractDefaults(schema);
  }
  /**
   * Validate partial configuration (for updates)
   */
  static validatePartial(config: unknown): ValidationResult {
    // For partial validation, we validate against a subset of the schema
    // This is a simplified implementation - in a full implementation,
    // we would create a subschema based on allowedPaths
    return this.validate(config);
  }
  /**
   * Check if configuration is production-ready
   */
  static isProductionReady(config: Record<string, unknown>): { ready: boolean; issues: string[] } {
    const issues: string[] = [];
    // Check for debug mode
    const {settings} = config;
    if (settings && typeof settings === 'object' && settings !== null) {
      const settingsRecord = settings as Record<string, unknown>;
      const {debug} = settingsRecord;
      if (debug && typeof debug === 'object' && debug !== null) {
        const debugRecord = debug as Record<string, unknown>;
        if (debugRecord.enabled === true) {
          issues.push('Debug mode should be disabled in production');
        }
      }
    }
    // Check for development servers
    if (settings && typeof settings === 'object' && settings !== null) {
      const settingsRecord = settings as Record<string, unknown>;
      const {development} = settingsRecord;
      if (development && typeof development === 'object' && development !== null) {
        const devRecord = development as Record<string, unknown>;
        if (devRecord.watch === true || devRecord.hotReload === true) {
          issues.push('Development features should be disabled in production');
        }
      }
    }
    // Check for test configuration
    if (settings && typeof settings === 'object' && settings !== null) {
      const settingsRecord = settings as Record<string, unknown>;
      const {test} = settingsRecord;
      if (test && typeof test === 'object' && test !== null) {
        const testRecord = test as Record<string, unknown>;
        const {environment} = testRecord;
        if (environment && environment !== 'node') {
          issues.push('Test environment should be set to "node" in production');
        }
      }
    }
    // Check for loose security settings
    const {security} = config;
    if (security && typeof security === 'object' && security !== null) {
      const securityRecord = security as Record<string, unknown>;
      if (securityRecord.enablePinProtection === false) {
        issues.push('PIN protection should be enabled in production');
      }
      if (securityRecord.encryptSecrets === false) {
        issues.push('Secret encryption should be enabled in production');
      }
    }
    return {
      ready: issues.length === 0,
      issues,
    };
  }
}
/**
 * Export validation utilities
 */
export function validateConfig(config: unknown): ValidationResult {
  return SchemaValidator.validate(config);
}
export function validateConfigFile(filePath: string): Promise<ValidationResult> {
  return SchemaValidator.validateFile(filePath);
}
export function isProductionReady(config: Record<string, unknown>): {
  ready: boolean;
  issues: string[];
} {
  return SchemaValidator.isProductionReady(config);
}
export function getConfigTemplate(): Record<string, unknown> {
  return SchemaValidator.getTemplate();
}
