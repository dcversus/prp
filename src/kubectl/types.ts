/**
 * Kubectl Secret Management Types
 *
 * Type definitions for managing Kubernetes secrets retrieval
 * and validation for the NUDGE system.
 */

export interface KubectlSecretConfig {
  /** Kubernetes namespace where secrets are stored */
  namespace?: string;
  /** Name of the secret containing NUDGE_SECRET */
  secretName?: string;
  /** Key within the secret that contains the NUDGE_SECRET value */
  secretKey?: string;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
  /** kubectl command timeout in milliseconds */
  commandTimeout?: number;
}

export interface SecretRetrievalResult {
  /** The retrieved secret value */
  value: string;
  /** Timestamp when the secret was retrieved */
  retrievedAt: string;
  /** Cache expiration timestamp */
  expiresAt: string;
  /** Whether the secret was from cache or fresh retrieval */
  fromCache: boolean;
}

export interface SecretValidationResult {
  /** Whether the secret is valid */
  isValid: boolean;
  /** Validation error message if invalid */
  error?: string;
  /** Secret metadata */
  metadata: {
    length: number;
    format: string;
    retrievedAt: string;
  };
}

export interface KubectlStatus {
  /** Whether kubectl is available and configured */
  available: boolean;
  /** Whether cluster connection is working */
  connected: boolean;
  /** Kubernetes cluster info */
  clusterInfo?: {
    server: string;
    context: string;
    namespace: string;
  };
  /** Error details if not available */
  error?: string;
}

export interface SecretCache {
  /** Cached secret value */
  value: string;
  /** Cache expiration timestamp */
  expiresAt: number;
  /** Retrieval timestamp */
  retrievedAt: number;
}

export interface KubectlCommandOptions {
  /** Command timeout in milliseconds */
  timeout?: number;
  /** Working directory for command execution */
  cwd?: string;
  /** Environment variables for the command */
  env?: Record<string, string>;
  /** Whether to suppress command output */
  silent?: boolean;
}

// Error types
export class KubectlError extends Error {
  public readonly code: string;
  public readonly command: string;
  public readonly exitCode: number | null;
  public readonly stdout: string;
  public readonly stderr: string;

  constructor(
    code: string,
    message: string,
    command: string,
    exitCode: number | null,
    stdout: string,
    stderr: string
  ) {
    super(message);
    this.name = 'KubectlError';
    this.code = code;
    this.command = command;
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

// Default configuration
export const DEFAULT_KUBECTL_CONFIG: Required<KubectlSecretConfig> = {
  namespace: 'dcmaidbot',
  secretName: 'dcmaidbot-secrets',
  secretKey: 'NUDGE_SECRET',
  cacheDuration: 300000, // 5 minutes
  commandTimeout: 10000  // 10 seconds
} as const;

// Secret validation patterns
export const SECRET_VALIDATION_PATTERNS = {
  // Pattern for JWT-like secrets (alphanumeric with some special chars)
  JWT: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  // Pattern for API keys (alphanumeric, 20+ chars)
  API_KEY: /^[A-Za-z0-9]{20,}$/,
  // Pattern for generic secrets (at least 16 chars, mix of alphanumeric and special chars)
  GENERIC: /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{16,}$/
} as const;

export type SecretFormat = keyof typeof SECRET_VALIDATION_PATTERNS;

/**
 * Kubernetes cluster context information
 */
export interface KubectlContext {
  name: string;
  cluster: string;
  user: string;
  namespace?: string;
  context?: {
    cluster: string;
    user: string;
    namespace?: string;
  };
}

/**
 * Kubernetes cluster information from kubectl config
 */
export interface KubectlClusterInfo {
  contexts: KubectlContext[];
  'current-context': string;
}