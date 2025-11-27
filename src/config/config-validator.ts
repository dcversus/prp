/**
 * Configuration Validator Module
 * Exports the schema validator and related utilities
 */
export {
  SchemaValidator,
  validateConfig,
  validateConfigFile,
  isProductionReady,
  getConfigTemplate,
} from './schema-validator';
export type { ValidationResult, ValidationError, ValidationWarning } from './schema-validator';
