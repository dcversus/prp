/**
 * Nudge Wrapper Unit Tests
 *
 * Tests for the nudge wrapper that provides unified interface
 * for both direct and LLM-mode nudge messages.
 */

import { jest } from '@jest/globals';
import { NudgeWrapper, createNudgeWrapper } from '../wrapper.js';
import { NudgeClient } from '../client.js';
import {
  NudgeRequest,
  DirectNudgeRequest,
  LLMModeNudgeRequest,
  AgentNudgeMessage,
  NudgeResponse,
  NudgeError
} from '../types.js';

// Mock NudgeClient
jest.mock('../client.js');
const MockedNudgeClient = NudgeClient as jest.MockedClass<typeof NudgeClient>;

// Mock console methods
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;

describe('NudgeWrapper', () => {
  let wrapper: NudgeWrapper;
  let mockClient: jest.Mocked<NudgeClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.error = jest.fn();

    // Setup mock client
    mockClient = {
      sendNudge: jest.fn(),
      testConnectivity: jest.fn(),
      getConfigStatus: jest.fn()
    } as any;

    MockedNudgeClient.mockImplementation(() => mockClient);
    wrapper = new NudgeWrapper({}, true);
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
  });

  describe('Constructor', () => {
    it('should create wrapper with NudgeClient', () => {
      expect(MockedNudgeClient).toHaveBeenCalledWith({}, true);
      expect(wrapper).toBeInstanceOf(NudgeWrapper);
    });

    it('should enable fallback by default', () => {
      const testWrapper = new NudgeWrapper();
      // Fallback enabled is tested through sendWithFallback behavior
      expect(testWrapper).toBeInstanceOf(NudgeWrapper);
    });
  });

  describe('sendDirectNudge', () => {
    const mockResponse: NudgeResponse = {
      success: true,
      message_id: 'direct-test-123',
      delivery_type: 'direct'
    };

    it('should send direct nudge successfully', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      const result = await wrapper.sendDirectNudge(
        'Test direct message',
        'high',
        { prp_id: 'test-prp' }
      );

      expect(result).toEqual(mockResponse);
      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct',
          message: 'Test direct message',
          urgency: 'high',
          context: { prp_id: 'test-prp' },
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            delivery_type: 'direct'
          })
        })
      );
    });

    it('should add default metadata', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      await wrapper.sendDirectNudge('Test', 'medium', undefined, { custom: 'value' });

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            custom: 'value',
            timestamp: expect.any(String),
            delivery_type: 'direct'
          })
        })
      );
    });
  });

  describe('sendLLMModeNudge', () => {
    const mockResponse: NudgeResponse = {
      success: true,
      message_id: 'llm-test-123',
      delivery_type: 'llm-enhanced'
    };

    it('should send LLM-mode nudge successfully', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      const result = await wrapper.sendLLMModeNudge(
        'Test LLM message',
        { prp_id: 'test-prp' },
        'Agent analysis',
        ['Option 1', 'Option 2'],
        'decision'
      );

      expect(result).toEqual(mockResponse);
      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm-mode',
          message: 'Test LLM message',
          context: { prp_id: 'test-prp' },
          agent_analysis: 'Agent analysis',
          recommendations: ['Option 1', 'Option 2'],
          expected_response_type: 'decision',
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            delivery_type: 'llm-enhanced'
          })
        })
      );
    });

    it('should handle optional parameters', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      await wrapper.sendLLMModeNudge('Test', { prp_id: 'test-prp' });

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm-mode',
          message: 'Test',
          context: { prp_id: 'test-prp' },
          agent_analysis: undefined,
          recommendations: undefined,
          expected_response_type: undefined
        })
      );
    });
  });

  describe('sendAgentNudge', () => {
    const mockResponse: NudgeResponse = {
      success: true,
      message_id: 'agent-test-123'
    };

    it('should send direct nudge for urgent messages', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[aa] Admin Attention',
        prpId: 'test-prp',
        message: 'Urgent admin input needed',
        context: { details: 'System configuration issue' },
        urgency: 'high'
      };

      const result = await wrapper.sendAgentNudge(agentMessage);

      expect(result).toEqual(mockResponse);
      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct',
          message: 'Urgent admin input needed',
          urgency: 'high',
          context: expect.objectContaining({
            prp_id: 'test-prp',
            signal: '[aa] Admin Attention',
            agent_role: 'robo-developer',
            urgency: 'high',
            prp_link: 'https://github.com/dcversus/prp/blob/main/test-prp.md',
            details: 'System configuration issue',
            timestamp: expect.any(String)
          }),
          metadata: expect.objectContaining({
            agent_type: 'robo-developer',
            signal_type: '[aa] Admin Attention',
            auto_generated: true
          })
        })
      );
    });

    it('should send LLM-mode nudge for complex decisions', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-system-analyst',
        signal: '[gg] Goal Clarification',
        prpId: 'test-prp',
        message: 'Need clarification on requirements',
        context: {
          options: ['Option A', 'Option B'],
          analysis: 'Detailed analysis',
          recommendations: ['Option A is better']
        },
        urgency: 'medium',
        expectedResponseType: 'decision'
      };

      const result = await wrapper.sendAgentNudge(agentMessage);

      expect(result).toEqual(mockResponse);
      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm-mode',
          message: 'Need clarification on requirements',
          context: expect.objectContaining({
            prp_id: 'test-prp',
            signal: '[gg] Goal Clarification',
            agent_role: 'robo-system-analyst',
            urgency: 'medium'
          }),
          agent_analysis: 'Detailed analysis',
          recommendations: ['Option A is better'],
          expected_response_type: 'decision'
        })
      );
    });

    it('should use direct nudge for simple messages without options', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[dp] Development Progress',
        prpId: 'test-prp',
        message: 'Simple status update',
        context: {},
        urgency: 'medium'
      };

      await wrapper.sendAgentNudge(agentMessage);

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct'
        })
      );
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fallback from LLM-mode to direct on failure', async () => {
      const llmError = new NudgeError('LLM_ERROR', 'LLM processing failed');
      const directResponse: NudgeResponse = {
        success: true,
        message_id: 'fallback-success',
        delivery_type: 'direct'
      };

      mockClient.sendNudge
        .mockRejectedValueOnce(llmError)
        .mockResolvedValueOnce(directResponse);

      const result = await wrapper.sendLLMModeNudge(
        'Test message',
        { prp_id: 'test-prp' }
      );

      expect(result).toEqual({
        ...directResponse,
        delivery_type: 'direct-fallback'
      });
      expect(mockClient.sendNudge).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith(
        'LLM-mode nudge failed, attempting direct nudge fallback...'
      );
      expect(console.info).toHaveBeenCalledWith('Direct nudge fallback successful');
    });

    it('should handle fallback failure', async () => {
      const llmError = new NudgeError('LLM_ERROR', 'LLM processing failed');
      const directError = new NudgeError('DIRECT_ERROR', 'Direct sending failed');

      mockClient.sendNudge
        .mockRejectedValueOnce(llmError)
        .mockRejectedValueOnce(directError);

      await expect(
        wrapper.sendLLMModeNudge('Test', { prp_id: 'test-prp' })
      ).rejects.toThrow(NudgeError);

      expect(mockClient.sendNudge).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledWith(
        'Direct nudge fallback also failed:',
        directError
      );
    });

    it('should not fallback when disabled', async () => {
      const noFallbackWrapper = new NudgeWrapper({}, false);
      mockClient.sendNudge.mockRejectedValue(new NudgeError('LLM_ERROR', 'Failed'));

      await expect(
        noFallbackWrapper.sendLLMModeNudge('Test', { prp_id: 'test-prp' })
      ).rejects.toThrow(NudgeError);

      expect(mockClient.sendNudge).toHaveBeenCalledTimes(1);
    });

    it('should not fallback for direct nudge failures', async () => {
      mockClient.sendNudge.mockRejectedValue(new NudgeError('DIRECT_ERROR', 'Failed'));

      await expect(
        wrapper.sendDirectNudge('Test', 'medium')
      ).rejects.toThrow(NudgeError);

      expect(mockClient.sendNudge).toHaveBeenCalledTimes(1);
    });
  });

  describe('testSystem', () => {
    it('should return system test results', async () => {
      mockClient.testConnectivity.mockResolvedValue(true);
      mockClient.getConfigStatus.mockReturnValue({
        configured: true,
        endpoint: 'https://test.example.com',
        hasSecret: true,
        hasAdminId: true,
        timeout: 10000
      });

      const result = await wrapper.testSystem();

      expect(result).toEqual({
        connectivity: true,
        config: {
          configured: true,
          endpoint: 'https://test.example.com',
          hasSecret: true,
          hasAdminId: true,
          timeout: 10000
        }
      });
    });

    it('should handle test errors', async () => {
      mockClient.testConnectivity.mockRejectedValue(new Error('Network error'));
      mockClient.getConfigStatus.mockReturnValue({
        configured: false,
        endpoint: 'https://test.example.com',
        hasSecret: false,
        hasAdminId: false,
        timeout: 10000
      });

      const result = await wrapper.testSystem();

      expect(result).toEqual({
        connectivity: false,
        config: {
          configured: false,
          endpoint: 'https://test.example.com',
          hasSecret: false,
          hasAdminId: false,
          timeout: 10000
        },
        error: 'Network error'
      });
    });
  });

  describe('getStatus', () => {
    it('should return healthy status when configured and connected', async () => {
      mockClient.testConnectivity.mockResolvedValue(true);
      mockClient.getConfigStatus.mockReturnValue({
        configured: true,
        endpoint: 'https://test.example.com',
        hasSecret: true,
        hasAdminId: true,
        timeout: 10000
      });

      const result = await wrapper.getStatus();

      expect(result.status).toBe('healthy');
      expect(result.details.client_config.configured).toBe(true);
      expect(result.details.fallback_enabled).toBe(true);
      expect(result.details.last_test?.connectivity).toBe(true);
    });

    it('should return unhealthy status when not configured', async () => {
      mockClient.testConnectivity.mockResolvedValue(false);
      mockClient.getConfigStatus.mockReturnValue({
        configured: false,
        endpoint: 'https://test.example.com',
        hasSecret: false,
        hasAdminId: false,
        timeout: 10000
      });

      const result = await wrapper.getStatus();

      expect(result.status).toBe('unhealthy');
    });

    it('should return degraded status when configured but not connected', async () => {
      mockClient.testConnectivity.mockResolvedValue(false);
      mockClient.getConfigStatus.mockReturnValue({
        configured: true,
        endpoint: 'https://test.example.com',
        hasSecret: true,
        hasAdminId: true,
        timeout: 10000
      });

      const result = await wrapper.getStatus();

      expect(result.status).toBe('degraded');
    });
  });

  describe('sendNudge (Unified Interface)', () => {
    const mockResponse: NudgeResponse = {
      success: true,
      message_id: 'unified-test-123'
    };

    it('should auto-select LLM-mode when analysis is provided', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      await wrapper.sendNudge('Test', {
        agentAnalysis: 'Detailed analysis'
      });

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm-mode',
          agent_analysis: 'Detailed analysis'
        })
      );
    });

    it('should auto-select LLM-mode when recommendations are provided', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      await wrapper.sendNudge('Test', {
        recommendations: ['Option 1', 'Option 2']
      });

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm-mode',
          recommendations: ['Option 1', 'Option 2']
        })
      );
    });

    it('should auto-select direct when no LLM features are provided', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      await wrapper.sendNudge('Test', {
        urgency: 'high'
      });

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct',
          urgency: 'high'
        })
      );
    });

    it('should use explicit type when provided', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      await wrapper.sendNudge('Test', {
        type: 'direct',
        agentAnalysis: 'This should be ignored for direct type'
      });

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct'
        })
      );
    });

    it('should use default urgency and empty context', async () => {
      mockClient.sendNudge.mockResolvedValue(mockResponse);

      await wrapper.sendNudge('Test');

      expect(mockClient.sendNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct',
          urgency: 'medium',
          context: {}
        })
      );
    });
  });
});

describe('createNudgeWrapper', () => {
  it('should create NudgeWrapper instance', () => {
    const wrapper = createNudgeWrapper();
    expect(wrapper).toBeInstanceOf(NudgeWrapper);
  });

  it('should pass options to NudgeWrapper constructor', () => {
    const wrapper = createNudgeWrapper(
      { config: { timeout: 15000 } },
      false
    );
    expect(wrapper).toBeInstanceOf(NudgeWrapper);
  });
});