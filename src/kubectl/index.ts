/**
 * Kubectl Secret Management Module
 */

export type {
  KubectlSecretConfig as SecretConfig,
  SecretRetrievalResult,
  SecretValidationResult,
  KubectlStatus as SecretManagerStatus,
  SecretCache,
  KubectlCommandOptions
} from './types.js';

export {
  KubectlError,
  DEFAULT_KUBECTL_CONFIG,
  SECRET_VALIDATION_PATTERNS,
  type SecretFormat
} from './types.js';

export {
  SecretManager,
  createSecretManager,
  secretManager
} from './secret-manager.js';