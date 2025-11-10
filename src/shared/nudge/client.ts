/**
 * Nudge HTTP Client
 *
 * Handles communication with the dcmaidbot nudge endpoint.
 * Supports both direct and LLM-mode nudge delivery.
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  NudgeRequest,
  NudgeResponse,
  NudgeConfig,
  NudgeClientOptions,
  NudgeError,
  isValidNudgeType
} from './types.js';
import { logger } from '../utils/logger.js';

// Missing utility functions
function getCliUserAgent(): string {
  return `prp-cli/${process.env.npm_package_version ?? '1.0.0'} (node.js)`;
}

function getVersion(): string {
  return process.env.npm_package_version ?? '1.0.0';
}
export class NudgeClient {
  private client: AxiosInstance;
  private config: NudgeConfig;

  constructor(options: NudgeClientOptions = {}) {
    this.config = {
      endpoint: process.env.NUDGE_ENDPOINT ?? 'https://dcmaid.theedgestory.org/nudge',
      secret: process.env.NUDGE_SECRET,
      admin_id: process.env.ADMIN_ID,
      timeout: 10000,
      retry_attempts: 3,
      retry_delay: 1000,
      ...options.config
    };

    // Validate configuration
    if (!this.config.secret) {
      throw new NudgeError(
        'CONFIG_ERROR',
        'NUDGE_SECRET is required but not configured',
        { config: this.config }
      );
    }

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.secret}`,
        'User-Agent': options.userAgent ?? getCliUserAgent()
      }
    });

    // Request interceptor for debugging
    if (options.debug) {
      this.client.interceptors.request.use((request) => {
        logger.debug('Nudge Request:', {
          method: request.method,
          url: request.url,
          headers: {
            ...request.headers,
            'Authorization': '[REDACTED]'
          },
          data: request.data
        });
        return request;
      });
    }

    // Response interceptor for debugging
    if (options.debug) {
      this.client.interceptors.response.use((response) => {
        logger.debug('Nudge Response:', {
          status: response.status,
          headers: response.headers,
          data: response.data
        });
        return response;
      });
    }
  }

  /**
   * Send a nudge message to the dcmaidbot endpoint
   */
  async sendNudge(request: NudgeRequest): Promise<NudgeResponse> {
    // Validate request
    this.validateNudgeRequest(request);

    const attemptSend = async (attempt: number): Promise<NudgeResponse> => {
      try {
        const response: AxiosResponse<NudgeResponse> = await this.client.post(
          '',
          request
        );

        return {
          success: true,
          message_id: response.data.message_id,
          sent_to: response.data.sent_to,
          timestamp: response.data.timestamp ?? new Date().toISOString(),
          delivery_type: response.data.delivery_type ?? (request.type === 'direct' ? 'direct' : 'llm-enhanced')
        };

      } catch (error) {
        const nudgeError = this.handleError(error, attempt);

        // Retry logic for network errors
        if (this.shouldRetry(error, attempt)) {
          const delay = (this.config.retry_delay ?? 1000) * Math.pow(2, attempt - 1);
          logger.warn(`Nudge send failed (attempt ${attempt}/${this.config.retry_attempts}), retrying in ${delay}ms...`);
          await this.sleep(delay);
          return attemptSend(attempt + 1);
        }

        throw nudgeError;
      }
    };

    return attemptSend(1);
  }

  /**
   * Test connectivity to the nudge endpoint
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const testRequest: NudgeRequest = {
        type: 'direct',
        message: 'PRP CLI Connectivity Test',
        urgency: 'low',
        metadata: {
          timestamp: new Date().toISOString(),
          agent_version: getVersion(),
          cli_version: getVersion()
        }
      };

      const response = await this.sendNudge(testRequest);
      return response.success;

    } catch (error) {
      logger.error('Nudge connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get client configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    endpoint: string;
    hasSecret: boolean;
    hasAdminId: boolean;
    timeout: number;
    } {
    return {
      configured: !!(this.config.secret && this.config.endpoint),
      endpoint: this.config.endpoint,
      hasSecret: !!this.config.secret,
      hasAdminId: !!this.config.admin_id,
      timeout: this.config.timeout ?? 10000
    };
  }

  /**
   * Validate nudge request structure
   */
  private validateNudgeRequest(request: NudgeRequest): void {
    if (!request.type || !isValidNudgeType(request.type)) {  
      throw new NudgeError(
        'VALIDATION_ERROR',
        'Invalid nudge type. Must be "direct" or "llm-mode"',
        { request }
      );
    }

    if (!request.message || typeof request.message !== 'string') {
      throw new NudgeError(
        'VALIDATION_ERROR',
        'Message is required and must be a string',
        { request }
      );
    }

    if (request.type === 'direct' && !request.urgency) {  
      throw new NudgeError(
        'VALIDATION_ERROR',
        'Direct nudge requires urgency level',
        { request }
      );
    }

    // Add default metadata if not provided
    if (!request.metadata) {
      request.metadata = {
        timestamp: new Date().toISOString(),
        cli_version: getVersion()
      };
    } else if (!request.metadata.timestamp) {
      request.metadata.timestamp = new Date().toISOString();
    }
  }

  /**
   * Handle API errors and convert to NudgeError
   */
  private handleError(error: Error | AxiosError | unknown, attempt: number): NudgeError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;

      switch (status) {
        case 401:
          return new NudgeError(
            'AUTHENTICATION_ERROR',
            'Invalid NUDGE_SECRET or authentication failed',
            { status, data, attempt }
          );

        case 403:
          return new NudgeError(
            'AUTHORIZATION_ERROR',
            'Not authorized to send nudges',
            { status, data, attempt }
          );

        case 429:
          return new NudgeError(
            'RATE_LIMIT_ERROR',
            'Rate limit exceeded. Please try again later',
            { status, data, attempt }
          );

        case 500:
        case 502:
        case 503:
        case 504:
          return new NudgeError(
            'SERVER_ERROR',
            'dcmaidbot server error',
            { status, data, attempt }
          );

        default:
          return new NudgeError(
            'HTTP_ERROR',
            `HTTP error ${status}: ${axiosError.message}`,
            { status, data, attempt, axiosError: axiosError.message }
          );
      }
    }

    if (error instanceof NudgeError) {
      return error;
    }

    return new NudgeError(
      'UNKNOWN_ERROR',
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error, attempt }
    );
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: Error | AxiosError | unknown, attempt: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= (this.config.retry_attempts ?? 3)) {
      return false;
    }

    // Retry on network errors and 5xx server errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      return !status || status >= 500 || status === 429;
    }

    // Don't retry on validation or authentication errors
    if (error instanceof NudgeError) {
      return !['VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR'].includes(error.code);
    }

    return true;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create default client instance
export const createNudgeClient = (options?: NudgeClientOptions): NudgeClient => {
  return new NudgeClient(options);
};