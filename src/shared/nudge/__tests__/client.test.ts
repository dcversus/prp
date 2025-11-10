/**
 * Nudge Client Unit Tests
 *
 * Tests for HTTP client communication with dcmaidbot endpoint.
 */

import axios from 'axios';
import { NudgeClient, createNudgeClient } from '../client.js';
import { NudgeError } from '../types.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock version utility
jest.mock('../../utils/version.js', () => ({
  getCliUserAgent: () => 'PRP-CLI/1.0.0-test',
  getVersion: () => '1.0.0-test'
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe('NudgeClient', () => {
  let client: NudgeClient;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, NUDGE_SECRET: 'test-secret' };

    // Reset axios mocks
    jest.clearAllMocks();

    // Mock axios.create to return a mocked instance
    const mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance as any);
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

    client = new NudgeClient();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should create client with default configuration', () => {
      expect(client).toBeInstanceOf(NudgeClient);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://dcmaid.theedgestory.org/nudge',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-secret',
          'User-Agent': 'PRP-CLI/1.0.0-test'
        }
      });
    });

    it('should create client with custom configuration', () => {
      const options = {
        config: {
          endpoint: 'https://custom.endpoint.com',
          timeout: 5000,
          retry_attempts: 5
        },
        userAgent: 'Custom-Agent/1.0'
      };

      const customClient = new NudgeClient(options);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom.endpoint.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-secret',
          'User-Agent': 'Custom-Agent/1.0'
        }
      });
    });

    it('should throw error when NUDGE_SECRET is missing', () => {
      delete process.env.NUDGE_SECRET;

      expect(() => new NudgeClient()).toThrow(NudgeError);
    });
  });

  describe('sendNudge', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        post: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      client = new NudgeClient();
    });

    it('should send direct nudge successfully', async () => {
      const mockResponse = {
        data: {
          message_id: 'test-id',
          sent_to: ['admin'],
          timestamp: '2024-01-01T00:00:00Z',
          delivery_type: 'direct'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request = {
        type: 'direct' as const,
        message: 'Test message',
        urgency: 'medium' as const
      };

      const result = await client.sendNudge(request);

      expect(result).toEqual({
        success: true,
        message_id: 'test-id',
        sent_to: ['admin'],
        timestamp: '2024-01-01T00:00:00Z',
        delivery_type: 'direct'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('', request);
    });

    it('should send LLM-mode nudge successfully', async () => {
      const mockResponse = {
        data: {
          message_id: 'llm-id',
          sent_to: ['admin'],
          timestamp: '2024-01-01T00:00:00Z',
          delivery_type: 'llm-enhanced'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request = {
        type: 'llm-mode' as const,
        message: 'Complex decision needed',
        context: { prp_id: 'test-prp' },
        expected_response_type: 'decision' as const
      };

      const result = await client.sendNudge(request);

      expect(result.delivery_type).toBe('llm-enhanced');
    });

    it('should handle network errors with retry', async () => {
      // Mock network error on first attempt, success on second
      mockAxiosInstance.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { message_id: 'retry-id', sent_to: ['admin'] }
        });

      const request = {
        type: 'direct' as const,
        message: 'Test message',
        urgency: 'low' as const
      };

      const result = await client.sendNudge(request);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication errors', async () => {
      const authError = {
        response: { status: 401 },
        isAxiosError: true
      };

      mockAxiosInstance.post.mockRejectedValue(authError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const request = {
        type: 'direct' as const,
        message: 'Test message',
        urgency: 'medium' as const
      };

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);

      try {
        await client.sendNudge(request);
      } catch (error) {
        expect(error).toBeInstanceOf(NudgeError);
        expect((error as NudgeError).code).toBe('AUTHENTICATION_ERROR');
      }
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = {
        response: { status: 429 },
        isAxiosError: true
      };

      mockAxiosInstance.post.mockRejectedValue(rateLimitError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const request = {
        type: 'direct' as const,
        message: 'Test message',
        urgency: 'medium' as const
      };

      try {
        await client.sendNudge(request);
      } catch (error) {
        expect((error as NudgeError).code).toBe('RATE_LIMIT_ERROR');
      }
    });

    it('should handle server errors with retry', async () => {
      const serverError = {
        response: { status: 500 },
        isAxiosError: true
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          data: { message_id: 'recovery-id', sent_to: ['admin'] }
        });

      const request = {
        type: 'direct' as const,
        message: 'Test message',
        urgency: 'medium' as const
      };

      const result = await client.sendNudge(request);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should add default metadata if missing', async () => {
      const mockResponse = { data: { message_id: 'test-id' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request = {
        type: 'direct' as const,
        message: 'Test message',
        urgency: 'medium' as const
      };

      await client.sendNudge(request);

      const [callArgs] = mockAxiosInstance.post.mock.calls;
      const sentRequest = callArgs[1];

      expect(sentRequest.metadata).toBeDefined();
      expect(sentRequest.metadata.timestamp).toBeDefined();
      expect(sentRequest.metadata.cli_version).toBe('1.0.0-test');
    });
  });

  describe('testConnectivity', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        post: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      client = new NudgeClient();
    });

    it('should return true on successful connectivity test', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { message_id: 'test-id' }
      });

      const result = await client.testConnectivity();

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should return false on failed connectivity test', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Connection failed'));

      const result = await client.testConnectivity();

      expect(result).toBe(false);
    });
  });

  describe('getConfigStatus', () => {
    it('should return configuration status', () => {
      const status = client.getConfigStatus();

      expect(status).toEqual({
        configured: true,
        endpoint: 'https://dcmaid.theedgestory.org/nudge',
        hasSecret: true,
        hasAdminId: false,
        timeout: 10000
      });
    });

    it('should return false configured when missing secret', () => {
      delete process.env.NUDGE_SECRET;

      expect(() => new NudgeClient()).toThrow();
    });
  });

  describe('Validation', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        post: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      client = new NudgeClient();
    });

    it('should validate nudge type', async () => {
      const request = {
        type: 'invalid' as any,
        message: 'Test',
        urgency: 'medium' as const
      };

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
    });

    it('should validate message presence', async () => {
      const request = {
        type: 'direct' as const,
        message: '',
        urgency: 'medium' as const
      };

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
    });

    it('should validate urgency for direct nudge', async () => {
      const request = {
        type: 'direct' as const,
        message: 'Test message',
        urgency: undefined as any
      };

      await expect(client.sendNudge(request)).rejects.toThrow(NudgeError);
    });
  });
});

describe('createNudgeClient', () => {
  it('should create NudgeClient instance', () => {
    const client = createNudgeClient();
    expect(client).toBeInstanceOf(NudgeClient);
  });

  it('should create client with options', () => {
    const options = { debug: true };
    const client = createNudgeClient(options);
    expect(client).toBeInstanceOf(NudgeClient);
  });
});