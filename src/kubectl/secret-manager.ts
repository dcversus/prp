/**
 * Kubectl Secret Manager
 *
 * Enhanced secret management for the NUDGE system with comprehensive
 * error handling, validation, caching, and status monitoring.
 */

import { spawn } from 'child_process';
import {
  KubectlSecretConfig,
  SecretRetrievalResult,
  SecretValidationResult,
  KubectlStatus,
  SecretCache,
  KubectlCommandOptions,
  KubectlError,
  DEFAULT_KUBECTL_CONFIG,
  SECRET_VALIDATION_PATTERNS
} from './types.js';

export class KubectlSecretManager {
  protected config: Required<KubectlSecretConfig>;
  protected cache: SecretCache | null = null;
  protected lastValidation: SecretValidationResult | null = null;

  constructor(config: Partial<KubectlSecretConfig> = {}) {
    this.config = {
      ...DEFAULT_KUBECTL_CONFIG,
      ...config
    };
  }

  /**
   * Retrieve NUDGE_SECRET from Kubernetes cluster
   */
  async getNudgeSecret(options: { forceRefresh?: boolean } = {}): Promise<SecretRetrievalResult> {
    const now = Date.now();
    const { forceRefresh = false } = options;

    // Check cache first
    if (!forceRefresh && this.cache && this.cache.expiresAt > now) {
      return {
        value: this.cache.value,
        retrievedAt: new Date(this.cache.retrievedAt).toISOString(),
        expiresAt: new Date(this.cache.expiresAt).toISOString(),
        fromCache: true
      };
    }

    try {
      // Retrieve secret from Kubernetes
      const secretValue = await this.retrieveSecretFromCluster();

      // Update cache
      this.cache = {
        value: secretValue,
        retrievedAt: now,
        expiresAt: now + this.config.cacheDuration
      };

      return {
        value: secretValue,
        retrievedAt: new Date(now).toISOString(),
        expiresAt: new Date(this.cache.expiresAt).toISOString(),
        fromCache: false
      };

    } catch (error) {
      // If we have a cached value, return it even if expired
      if (this.cache) {
        console.warn('Failed to retrieve fresh secret, using expired cache:', error);
        return {
          value: this.cache.value,
          retrievedAt: new Date(this.cache.retrievedAt).toISOString(),
          expiresAt: new Date(this.cache.expiresAt).toISOString(),
          fromCache: true
        };
      }

      throw error;
    }
  }

  /**
   * Validate the retrieved secret
   */
  async validateSecret(secret?: string): Promise<SecretValidationResult> {
    const secretToValidate = secret || (this.cache?.value);

    if (!secretToValidate) {
      return {
        isValid: false,
        error: 'No secret provided for validation',
        metadata: {
          length: 0,
          format: 'none',
          retrievedAt: new Date().toISOString()
        }
      };
    }

    const result: SecretValidationResult = {
      isValid: true,
      metadata: {
        length: secretToValidate.length,
        format: 'unknown',
        retrievedAt: new Date().toISOString()
      }
    };

    // Check minimum length
    if (secretToValidate.length < 16) {
      result.isValid = false;
      result.error = 'Secret is too short (minimum 16 characters)';
      return result;
    }

    // Determine format
    if (SECRET_VALIDATION_PATTERNS.JWT.test(secretToValidate)) {
      result.metadata.format = 'jwt';
    } else if (SECRET_VALIDATION_PATTERNS.API_KEY.test(secretToValidate)) {
      result.metadata.format = 'api_key';
    } else if (SECRET_VALIDATION_PATTERNS.GENERIC.test(secretToValidate)) {
      result.metadata.format = 'generic';
    } else {
      result.isValid = false;
      result.error = 'Secret does not match any known format patterns';
      return result;
    }

    // Test connectivity with dcmaidbot endpoint if available
    try {
      const endpoint = process.env.NUDGE_ENDPOINT || 'https://dcmaid.theedgestory.org/nudge';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secretToValidate}`,
          'User-Agent': 'prp-cli/0.5.0'
        },
        body: JSON.stringify({
          type: 'direct',
          message: 'Secret validation test',
          urgency: 'low'
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        result.isValid = false;
        result.error = `Secret validation failed: HTTP ${response.status}`;
      }
    } catch (error) {
      // Network errors don't invalidate the secret, but we note them
      console.warn('Secret validation connectivity test failed:', error);
    }

    this.lastValidation = result;
    return result;
  }

  /**
   * Get kubectl and cluster status
   */
  async getKubectlStatus(): Promise<KubectlStatus> {
    const status: KubectlStatus = {
      available: false,
      connected: false
    };

    try {
      // Check if kubectl is available
      await this.executeKubectlCommand(['version', '--client'], { silent: true });
      status.available = true;

      // Get cluster info
      const clusterInfoResult = await this.executeKubectlCommand(
        ['config', 'view', '--minify', '-o', 'json'],
        { silent: true }
      );

      const clusterInfo = JSON.parse(clusterInfoResult.stdout);
      const currentContext = clusterInfo.contexts?.find((ctx: any) =>
        ctx.name === clusterInfo['current-context']
      );

      if (currentContext) {
        status.connected = true;
        status.clusterInfo = {
          server: currentContext.context?.cluster || 'unknown',
          context: currentContext.name || 'unknown',
          namespace: currentContext.context?.namespace || 'default'
        };
      }

    } catch (error) {
      status.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return status;
  }

  /**
   * Test secret accessibility
   */
  async testSecretAccess(): Promise<{
    accessible: boolean;
    error?: string;
    namespace?: string;
    secretName?: string;
  }> {
    try {
      const status = await this.getKubectlStatus();
      if (!status.available) {
        return {
          accessible: false,
          error: 'kubectl not available'
        };
      }

      if (!status.connected) {
        return {
          accessible: false,
          error: 'Not connected to Kubernetes cluster'
        };
      }

      // Try to access the secret
      await this.executeKubectlCommand([
        'get', 'secret', this.config.secretName,
        '-n', this.config.namespace,
        '-o', 'jsonpath={.data}'
      ], { silent: true });

      return {
        accessible: true,
        namespace: this.config.namespace,
        secretName: this.config.secretName
      };

    } catch (error) {
      return {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear the secret cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Get current cache status
   */
  getCacheStatus(): {
    hasCachedSecret: boolean;
    isExpired: boolean;
    expiresAt?: string;
    retrievedAt?: string;
  } {
    if (!this.cache) {
      return {
        hasCachedSecret: false,
        isExpired: false
      };
    }

    const now = Date.now();
    return {
      hasCachedSecret: true,
      isExpired: this.cache.expiresAt <= now,
      expiresAt: new Date(this.cache.expiresAt).toISOString(),
      retrievedAt: new Date(this.cache.retrievedAt).toISOString()
    };
  }

  /**
   * Get last validation result
   */
  getLastValidation(): SecretValidationResult | null {
    return this.lastValidation;
  }

  /**
   * Execute a kubectl command
   */
  private async executeKubectlCommand(
    args: string[],
    options: KubectlCommandOptions = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const {
      timeout = this.config.commandTimeout,
      cwd,
      env,
      silent = false
    } = options;

    return new Promise((resolve, reject) => {
      const command = 'kubectl';
      const commandArgs = args;

      if (!silent) {
        console.log(`Executing: ${command} ${commandArgs.join(' ')}`);
      }

      const child = spawn(command, commandArgs, {
        cwd,
        env: { ...process.env, ...env },
        stdio: silent ? 'pipe' : 'inherit'
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new KubectlError(
          'TIMEOUT',
          `Command timed out after ${timeout}ms`,
          `${command} ${commandArgs.join(' ')}`,
          null,
          stdout,
          stderr
        ));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);

        if (code === 0) {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          reject(new KubectlError(
            'COMMAND_FAILED',
            `Command failed with exit code ${code}`,
            `${command} ${commandArgs.join(' ')}`,
            code,
            stdout,
            stderr
          ));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(new KubectlError(
          'SPAWN_ERROR',
          `Failed to spawn command: ${error.message}`,
          `${command} ${commandArgs.join(' ')}`,
          null,
          stdout,
          stderr
        ));
      });
    });
  }

  /**
   * Retrieve secret from Kubernetes cluster
   */
  private async retrieveSecretFromCluster(): Promise<string> {
    const command = [
      'get', 'secret', this.config.secretName,
      '-n', this.config.namespace,
      '-o', `jsonpath={.data.${this.config.secretKey}}`
    ];

    const result = await this.executeKubectlCommand(command, { silent: true });

    if (!result.stdout) {
      throw new KubectlError(
        'SECRET_NOT_FOUND',
        `Secret key '${this.config.secretKey}' not found in secret '${this.config.secretName}'`,
        `kubectl ${command.join(' ')}`,
        0,
        result.stdout,
        result.stderr
      );
    }

    try {
      // Decode base64 secret value
      const decodedSecret = Buffer.from(result.stdout, 'base64').toString('utf8');

      if (!decodedSecret) {
        throw new Error('Decoded secret is empty');
      }

      return decodedSecret;
    } catch (error) {
      throw new KubectlError(
        'DECODE_ERROR',
        `Failed to decode secret: ${error instanceof Error ? error.message : 'Unknown error'}`,
        `kubectl ${command.join(' ')}`,
        0,
        result.stdout,
        result.stderr
      );
    }
  }
}

// Legacy compatibility - maintain old interface
export class SecretManager extends KubectlSecretManager {
  private legacyCache: Map<string, any> = new Map();
  private defaultConfig = {
    name: 'dcmaidbot-secrets',
    namespace: 'dcmaidbot',
    field: 'NUDGE_SECRET'
  };

  /**
   * Legacy method that returns just the secret value (string)
   * for backward compatibility
   */
  async getNudgeSecretValue(options: { forceRefresh?: boolean } = {}): Promise<string> {
    const result = await super.getNudgeSecret(options);
    return result.value;
  }

  /**
   * Legacy method that returns just the validation result (boolean)
   * for backward compatibility
   */
  async validateSecretSimple(secret: string): Promise<boolean> {
    const result = await super.validateSecret(secret);
    return result.isValid;
  }

  /**
   * Override testSecretAccess to provide legacy interface
   */
  override async testSecretAccess(): Promise<{
    accessible: boolean;
    error?: string;
    namespace?: string;
    secretName?: string;
    kubectl_available?: boolean;
    cluster_connected?: boolean;
    secret_retrieved?: boolean;
    secret_validated?: boolean;
  }> {
    try {
      const status = await this.getKubectlStatus();
      const baseResult = await super.testSecretAccess();

      // Add legacy properties
      return {
        ...baseResult,
        kubectl_available: status.available,
        cluster_connected: status.connected,
        secret_retrieved: baseResult.accessible,
        secret_validated: baseResult.accessible // Assume valid if accessible
      };
    } catch (error) {
      return {
        accessible: false,
        error: error instanceof Error ? error.message : String(error),
        namespace: this.defaultConfig.namespace,
        secretName: this.defaultConfig.name,
        kubectl_available: false,
        cluster_connected: false,
        secret_retrieved: false,
        secret_validated: false
      };
    }
  }

  /**
   * Get comprehensive status information
   */
  async getStatus(): Promise<{
    kubectl_available: boolean;
    cluster_connected: boolean;
    secret_accessible: boolean;
    cache_enabled: boolean;
    last_retrieval?: Date;
    last_validation?: Date;
    validation_result?: boolean;
  }> {
    const kubectlStatus = await this.getKubectlStatus();
    const testAccess = await this.testSecretAccess();

    return {
      kubectl_available: kubectlStatus.available,
      cluster_connected: kubectlStatus.connected,
      secret_accessible: testAccess.accessible,
      cache_enabled: this.cache !== null,
      last_retrieval: this.cache ? new Date(this.cache.retrievedAt) : undefined,
      last_validation: this.lastValidation ? new Date() : undefined,
      validation_result: this.lastValidation?.isValid
    };
  }

  /**
   * Get cache information
   */
  getCacheInfo(): Array<{
    key: string;
    timestamp: Date;
    expires: Date;
    ttl: number;
    expired: boolean;
  }> {
    if (!this.cache) {
      return [];
    }

    const now = Date.now();
    return [{
      key: `${this.defaultConfig.namespace}/${this.defaultConfig.name}/${this.defaultConfig.field}`,
      timestamp: new Date(this.cache.retrievedAt),
      expires: new Date(this.cache.expiresAt),
      ttl: this.cache.expiresAt - now,
      expired: this.cache.expiresAt <= now
    }];
  }

  /**
   * Clear cache entries with filtering options
   */
  clearCacheFiltered(options?: { namespace?: string; name?: string; field?: string }): void {
    // If no options provided, clear all cache
    if (!options || (!options.namespace && !options.name && !options.field)) {
      this.cache = null;
      this.legacyCache.clear();
      return;
    }

    // If options match current cache, clear it
    if (this.cache) {
      if ((options.namespace && options.namespace !== this.defaultConfig.namespace) ||
          (options.name && options.name !== this.defaultConfig.name) ||
          (options.field && options.field !== this.defaultConfig.field)) {
        return; // Don't clear if options don't match
      }
      this.cache = null;
    }

    // Clear legacy cache entries that match
    for (const [key] of this.legacyCache) {
      if (options.namespace && !key.includes(options.namespace)) continue;
      if (options.name && !key.includes(options.name)) continue;
      if (options.field && !key.includes(options.field)) continue;
      this.legacyCache.delete(key);
    }
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    let cleaned = 0;
    const now = Date.now();

    // Check main cache
    if (this.cache && this.cache.expiresAt <= now) {
      this.cache = null;
      cleaned++;
    }

    // Clean legacy cache
    for (const [key, entry] of this.legacyCache) {
      if (entry.expiresAt <= now) {
        this.legacyCache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Create default instances
export const createKubectlSecretManager = (
  config?: Partial<KubectlSecretConfig>
): KubectlSecretManager => {
  return new KubectlSecretManager(config);
};

export const createSecretManager = (): SecretManager => {
  return new SecretManager();
};

// Export singleton instances
export const kubectlSecretManager = createKubectlSecretManager();
export const secretManager = createSecretManager();