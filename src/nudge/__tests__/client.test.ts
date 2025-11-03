/**
 * Nudge Client Unit Tests
 *
 * Comprehensive tests for the nudge HTTP client functionality,
 * including error handling, retry logic, and validation.
 */

import { jest } from '@jest/globals';
import axios from 'axios';
import { NudgeClient, createNudgeClient } from '../client.js';
import {
  DirectNudgeRequest,
  LLMModeNudgeRequest,
  NudgeError,
  NudgeResponse
} from '../types.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console methods to avoid noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('NudgeClient', () => {
  let client: NudgeClient;
  let mockAxiosInstance: jest.Mocked<typeof axios>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();

    // Setup mocked axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Set environment variables
    process.env.NUDGE_SECRET = 'test-secret-key';
    process.env.NUDGE_ENDPOINT = 'https://test.example.com/nudge';
    process.env.ADMIN_ID = 'test-admin-id';

    client = new NudgeClient({
      debug: false,
      config: {
        timeout: 5000,
        retry_attempts: 2,
        retry_delay: 100
      }
    });
  });

  afterEach(() => {
    // Restore console methods
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Constructor', () => {
    it('should create client with default configuration', () => {
      const testClient = new NudgeClient();
      expect(testClient).toBeInstanceOf(NudgeClient);
    });

    it('should use environment variables for configuration', () => {
      const testClient = new NudgeClient();
      const config = testClient.getConfigStatus();

      expect(config.endpoint).toBe('https://test.example.com/nudge');
      expect(config.hasSecret).toBe(true);
    });

    it('should throw error when NUDGE_SECRET is not configured', () => {
      delete process.env.NUDGE_SECRET;

      expect(() => new NudgeClient()).toThrow(NudgeError);
    });

    it('should merge custom config with defaults', () => {
      const testClient = new NudgeClient({
        config: {
          timeout: 15000,
          retry_attempts: 5
        }
      });

      const config = testClient.getConfigStatus();
      expect(config.timeout).toBe(15000);
    });

    it('should setup axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.example.com/nudge',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-secret-key',
          'User-Agent': 'prp-cli/0.5.0'
        }
      });
    });
  });

  describe('sendNudge', () => {
    const mockSuccessResponse: NudgeResponse = {
      success: true,
      message_id: 'test-msg-123',
      sent_to: ['@testuser'],
      timestamp: '2025-01-01T00:00:00Z',
      delivery_type: 'direct'
    };

    it('should send direct nudge successfully', async () => {
      const directRequest: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test direct nudge',
        urgency: 'medium'
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: mockSuccessResponse,
        status: 200
      });

      const result = await client.sendNudge(directRequest);

      expect(result).toEqual(mockSuccessResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('', directRequest);
    });

    it('should send LLM-mode nudge successfully', async () => {
      const llmRequest: LLMModeNudgeRequest = {
        type: 'llm-mode',
        message: 'Test LLM nudge',
        context: {
          prp_id: 'test-prp',
          agent_role: 'test-agent'
        }
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: mockSuccessResponse,
        status: 200
      });

      const result = await client.sendNudge(llmRequest);

      expect(result).toEqual(mockSuccessResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('', llmRequest);
    });

    it('should add default metadata if not provided', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'high',
        metadata: {
          custom_field: 'value'
        }
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: mockSuccessResponse,
        status: 200
      });

      await client.sendNudge(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          metadata: expect.objectContaining({
            custom_field: 'value',
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should validate request structure', async () => {
      const invalidRequest = {
        type: 'invalid',
        message: 'Test'
      } as unknown;

      await expect(client.sendNudge(invalidRequest)).rejects.toThrow(NudgeError);
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should validate message is present', async () => {
      const invalidRequest = {
        type: 'direct',
        urgency: 'medium'
      } as unknown;

      await expect(client.sendNudge(invalidRequest)).rejects.toThrow(NudgeError);
    });

    it('should validate urgency for direct nudge', async () => {
      const invalidRequest = {
        type: 'direct',
        message: 'Test'
        // missing urgency
      } as unknown;

      await expect(client.sendNudge(invalidRequest)).rejects.toThrow(NudgeError);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors (401)', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      const authError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        },
        isAxiosError: true
      };

      // Mock axios.isAxiosError to return true for our mock error
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(authError);

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);

      try {
        await client.sendNudge(request);
      } catch (error) {
        expect(error).toBeInstanceOf(NudgeError);
        const nudgeError = error as NudgeError;
        expect(nudgeError.code).toBe('AUTHENTICATION_ERROR');
      }
    });

    it('should handle authorization errors (403)', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      const forbiddenError = {
        response: {
          status: 403,
          data: { error: 'Forbidden' }
        },
        isAxiosError: true
      };

      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(forbiddenError);

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
    });

    it('should handle rate limit errors (429)', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      const rateLimitError = {
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        },
        isAxiosError: true
      };

      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(rateLimitError);

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
    });

    it('should handle server errors (5xx)', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      const serverError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        },
        isAxiosError: true
      };

      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(serverError);

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
    });

    it('should handle network errors', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      const networkError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND test.example.com',
        isAxiosError: true
      };

      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(networkError);

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      // Use faster retries for tests
      client = new NudgeClient({
        config: {
          timeout: 1000,
          retry_attempts: 3,
          retry_delay: 10
        }
      });
    });

    it('should retry on network errors', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      // Setup axios error mock
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      // Fail twice, then succeed
      mockAxiosInstance.post
        .mockRejectedValueOnce({ code: 'ENOTFOUND', isAxiosError: true })
        .mockRejectedValueOnce({ code: 'ENOTFOUND', isAxiosError: true })
        .mockResolvedValueOnce({
          data: {
            success: true,
            message_id: 'retry-success'
          },
          status: 200
        });

      const result = await client.sendNudge(request);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('retrying in')
      );
    });

    it('should retry on 5xx server errors', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      mockAxiosInstance.post
        .mockRejectedValueOnce({
          response: { status: 500 },
          isAxiosError: true
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            message_id: 'server-error-retry'
          },
          status: 200
        });

      const result = await client.sendNudge(request);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should not retry on authentication errors', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 401 },
        isAxiosError: true
      });

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should not retry on validation errors', async () => {
      // Create an invalid request that will fail validation immediately
      const invalidRequest = {
        type: 'direct',
        message: 'Test'
        // Missing required 'urgency' field
      } as unknown;

      await expect(client.sendNudge(invalidRequest)).rejects.toThrow(NudgeError);
      // Should not make any HTTP requests due to validation failure
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(0);
    });

    it('should respect maximum retry attempts', async () => {
      const request: DirectNudgeRequest = {
        type: 'direct',
        message: 'Test',
        urgency: 'medium'
      };

      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      // Always fail
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ENOTFOUND',
        isAxiosError: true
      });

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('testConnectivity', () => {
    it('should return true on successful connectivity test', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true },
        status: 200
      });

      const result = await client.testConnectivity();

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          type: 'direct',
          message: 'PRP CLI Connectivity Test',
          urgency: 'low'
        })
      );
    });

    it('should return false on failed connectivity test', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ENOTFOUND',
        isAxiosError: true
      });

      const result = await client.testConnectivity();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Nudge connectivity test failed:',
        expect.any(Error)
      );
    });
  });

  describe('getConfigStatus', () => {
    it('should return correct configuration status', () => {
      const status = client.getConfigStatus();

      expect(status).toEqual({
        configured: true,
        endpoint: 'https://test.example.com/nudge',
        hasSecret: true,
        hasAdminId: true,
        timeout: 5000
      });
    });

    it('should show not configured when secret is missing', () => {
      delete process.env.NUDGE_SECRET;

      expect(() => {
        new NudgeClient({
          config: { secret: undefined }
        });
      }).toThrow(NudgeError);

      // Test that we can create a client with empty secret config but catch the error
      try {
        const noSecretClient = new NudgeClient({
          config: { secret: undefined }
        });
        const status = noSecretClient.getConfigStatus();
        expect(status.configured).toBe(false);
        expect(status.hasSecret).toBe(false);
      } catch (error) {
        // Expected to throw due to missing secret
        expect(error).toBeInstanceOf(NudgeError);
      }
    });
  });

  describe('Debug Mode', () => {
    it('should setup request interceptor in debug mode', () => {
      new NudgeClient({ debug: true });

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });
});

describe('createNudgeClient', () => {
  it('should create NudgeClient instance', () => {
    const client = createNudgeClient();
    expect(client).toBeInstanceOf(NudgeClient);
  });

  it('should pass options to NudgeClient constructor', () => {
    const options = {
      debug: true,
      config: { timeout: 15000 }
    };

    const client = createNudgeClient(options);
    expect(client).toBeInstanceOf(NudgeClient);
  });
});