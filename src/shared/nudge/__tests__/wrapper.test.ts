/**
 * Nudge Wrapper Unit Tests
 *
 * Tests for nudge wrapper with intelligent fallback and message routing.
 */

import { NudgeWrapper, createNudgeWrapper } from '../wrapper.js';
import type {
  NudgeResponse,
  NudgeRequest,
  NudgeContext,
  AgentNudgeMessage,
  NudgeClientOptions
} from '../types.js';

// Mock the client to isolate testing
jest.mock('../client.js', () => ({
  createNudgeClient: jest.fn(() => ({
    sendNudge: jest.fn(),
    testConnectivity: jest.fn(),
    getConfigStatus: jest.fn()
  }))
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

describe('NudgeWrapper', () => {
  let wrapper: NudgeWrapper;
  let mockClient: any;
  const { logger } = require('../../utils/logger.js');

  beforeEach(() => {
    const { createNudgeClient } = require('../client.js');
    mockClient = createNudgeClient();
    wrapper = new NudgeWrapper();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create wrapper with default settings', () => {
      expect(wrapper).toBeInstanceOf(NudgeWrapper);
    });

    it('should create wrapper with custom options', () => {
      const options: NudgeClientOptions = {
        config: { endpoint: 'https://test.com' },
        debug: true
      };

      const customWrapper = new NudgeWrapper(options, false);
      expect(customWrapper).toBeInstanceOf(NudgeWrapper);
    });
  });

  describe('sendDirectNudge', () => {
    it('should send direct nudge successfully', async () => {
      const expectedResponse: NudgeResponse = {
        success: true,
        message_id: 'direct-id',
        sent_to: ['admin'],
        timestamp: '2024-01-01T00:00:00Z',
        delivery_type: 'direct'
      };

      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      const context: NudgeContext = {
        prp_id: 'test-prp',
        signal: '[test] Test Signal'
      };

      const result = await wrapper.sendDirectNudge(
        'Test direct message',
        'medium',
        context,
        { custom: 'metadata' }
      );

      expect(result).toEqual(expectedResponse);
      expect(mockClient.sendNudge).toHaveBeenCalledTimes(1);

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('direct');
      expect(request.message).toBe('Test direct message');
      expect(request.urgency).toBe('medium');
      expect(request.context).toEqual(context);
      expect(request.metadata).toEqual({
        timestamp: expect.any(String),
        delivery_type: 'direct',
        custom: 'metadata'
      });
    });
  });

  describe('sendLLMModeNudge', () => {
    it('should send LLM-mode nudge successfully', async () => {
      const expectedResponse: NudgeResponse = {
        success: true,
        message_id: 'llm-id',
        sent_to: ['admin'],
        timestamp: '2024-01-01T00:00:00Z',
        delivery_type: 'llm-enhanced'
      };

      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      const context: NudgeContext = {
        prp_id: 'test-prp',
        signal: '[gg] Goal Clarification',
        agent_role: 'robo-developer'
      };

      const result = await wrapper.sendLLMModeNudge(
        'Complex decision needed',
        context,
        'Agent analysis',
        ['Option A', 'Option B'],
        'decision',
        { custom: 'metadata' }
      );

      expect(result).toEqual(expectedResponse);
      expect(mockClient.sendNudge).toHaveBeenCalledTimes(1);

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('llm-mode');
      expect(request.message).toBe('Complex decision needed');
      expect(request.context).toEqual(context);
      expect(request.agent_analysis).toBe('Agent analysis');
      expect(request.recommendations).toEqual(['Option A', 'Option B']);
      expect(request.expected_response_type).toBe('decision');
      expect(request.metadata).toEqual({
        timestamp: expect.any(String),
        delivery_type: 'llm-enhanced',
        custom: 'metadata'
      });
    });
  });

  describe('sendAgentNudge', () => {
    it('should route high priority messages to direct nudge', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[ic] Incident',
        prpId: 'test-prp',
        message: 'Critical incident occurred',
        context: { detail: 'System down' },
        urgency: 'high'
      };

      await wrapper.sendAgentNudge(agentMessage);

      expect(mockClient.sendNudge).toHaveBeenCalledTimes(1);

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('direct');
      expect(request.urgency).toBe('high');
    });

    it('should route simple messages to direct nudge', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[custom] Update',
        prpId: 'test-prp',
        message: 'Simple update',
        context: {},
        urgency: 'medium',
        expectedResponseType: 'information'
      };

      await wrapper.sendAgentNudge(agentMessage);

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('direct');
    });

    it('should route complex decisions to LLM-mode', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[af] Feedback Request',
        prpId: 'test-prp',
        message: 'Need feedback on approach',
        context: {
          options: ['Option A', 'Option B'],
          analysis: 'Detailed analysis here'
        },
        urgency: 'medium',
        expectedResponseType: 'decision'
      };

      await wrapper.sendAgentNudge(agentMessage);

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('llm-mode');
      expect(request.agent_analysis).toBe('Detailed analysis here');
      expect(request.expected_response_type).toBe('decision');
    });

    it('should enrich context with automatic fields', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[gg] Goal Clarification',
        prpId: 'test-prp-123',
        message: 'Need clarification',
        context: { custom: 'field' },
        urgency: 'medium'
      };

      await wrapper.sendAgentNudge(agentMessage);

      const [request] = mockClient.sendNudge.mock.calls[0];
      const context = request.context;

      expect(context.prp_id).toBe('test-prp-123');
      expect(context.signal).toBe('[gg] Goal Clarification');
      expect(context.agent_role).toBe('robo-developer');
      expect(context.custom).toBe('field');
      expect(context.prp_link).toBe('https://github.com/dcversus/prp/blob/main/PRPs/test-prp-123.md');
      expect(context.timestamp).toBeDefined();
    });
  });

  describe('Fallback Mechanism', () => {
    it('should attempt direct nudge fallback when LLM-mode fails', async () => {
      const llmError = new Error('LLM service unavailable');
      const directResponse: NudgeResponse = {
        success: true,
        message_id: 'fallback-id',
        delivery_type: 'direct'
      };

      mockClient.sendNudge
        .mockRejectedValueOnce(llmError)
        .mockResolvedValueOnce(directResponse);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[af] Feedback Request',
        prpId: 'test-prp',
        message: 'Complex decision needed',
        context: {
          options: ['Option A', 'Option B'],
          analysis: 'Detailed analysis'
        },
        urgency: 'medium',
        expectedResponseType: 'decision'
      };

      const result = await wrapper.sendAgentNudge(agentMessage);

      expect(result.success).toBe(true);
      expect(result.delivery_type).toBe('direct');
      expect(mockClient.sendNudge).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith('nudge', 'LLM-mode nudge failed, attempting direct nudge fallback...');
      expect(logger.info).toHaveBeenCalledWith('nudge', 'Direct nudge fallback successful');
    });

    it('should handle complete fallback failure', async () => {
      const llmError = new Error('LLM service unavailable');
      const directError = new Error('Direct service also unavailable');

      mockClient.sendNudge
        .mockRejectedValueOnce(llmError)
        .mockRejectedValueOnce(directError);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[af] Feedback Request',
        prpId: 'test-prp',
        message: 'Complex decision needed',
        context: { options: ['Option A', 'Option B'] },
        urgency: 'medium',
        expectedResponseType: 'decision'
      };

      await expect(wrapper.sendAgentNudge(agentMessage)).rejects.toThrow('FALLBACK_FAILED');
      expect(logger.error).toHaveBeenCalledWith('nudge', 'Direct nudge fallback also failed', expect.any(Error));
    });

    it('should not attempt fallback when disabled', async () => {
      const wrapperNoFallback = new NudgeWrapper({}, false);
      const llmError = new Error('LLM service unavailable');

      mockClient.sendNudge.mockRejectedValue(llmError);

      const agentMessage: AgentNudgeMessage = {
        agentType: 'robo-developer',
        signal: '[af] Feedback Request',
        prpId: 'test-prp',
        message: 'Complex decision needed',
        context: { options: ['Option A', 'Option B'] },
        urgency: 'medium',
        expectedResponseType: 'decision'
      };

      await expect(wrapperNoFallback.sendAgentNudge(agentMessage)).rejects.toThrow(llmError);
      expect(mockClient.sendNudge).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendNudge (Auto-detection)', () => {
    it('should auto-select LLM-mode for complex messages', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      await wrapper.sendNudge('Complex decision', {
        agentAnalysis: 'Detailed analysis',
        recommendations: ['Option A', 'Option B'],
        expectedResponseType: 'decision'
      });

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('llm-mode');
    });

    it('should auto-select direct for simple messages', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      await wrapper.sendNudge('Simple message', {
        urgency: 'medium'
      });

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('direct');
    });

    it('should use specified type when provided', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockClient.sendNudge.mockResolvedValue(expectedResponse);

      await wrapper.sendNudge('Force direct', {
        type: 'direct',
        urgency: 'high'
      });

      const [request] = mockClient.sendNudge.mock.calls[0];
      expect(request.type).toBe('direct');
    });
  });

  describe('testSystem', () => {
    it('should return successful test result', async () => {
      mockClient.testConnectivity.mockResolvedValue(true);
      mockClient.getConfigStatus.mockReturnValue({
        configured: true,
        endpoint: 'https://test.com',
        hasSecret: true,
        hasAdminId: false,
        timeout: 10000
      });

      const result = await wrapper.testSystem();

      expect(result).toEqual({
        connectivity: true,
        config: {
          configured: true,
          endpoint: 'https://test.com',
          hasSecret: true,
          hasAdminId: false,
          timeout: 10000
        }
      });
    });

    it('should return failed test result with error', async () => {
      mockClient.testConnectivity.mockRejectedValue(new Error('Connection failed'));
      mockClient.getConfigStatus.mockReturnValue({
        configured: true,
        endpoint: 'https://test.com'
      });

      const result = await wrapper.testSystem();

      expect(result.connectivity).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.config).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return healthy status when configured and connected', async () => {
      mockClient.testConnectivity.mockResolvedValue(true);
      mockClient.getConfigStatus.mockReturnValue({
        configured: true,
        endpoint: 'https://test.com',
        hasSecret: true
      });

      const result = await wrapper.getStatus();

      expect(result.status).toBe('healthy');
      expect(result.details.client_config.configured).toBe(true);
      expect(result.details.fallback_enabled).toBe(true);
      expect(result.details.last_test).toBeDefined();
    });

    it('should return unhealthy status when not configured', async () => {
      mockClient.testConnectivity.mockResolvedValue(false);
      mockClient.getConfigStatus.mockReturnValue({
        configured: false,
        endpoint: 'https://test.com',
        hasSecret: false
      });

      const result = await wrapper.getStatus();

      expect(result.status).toBe('unhealthy');
    });

    it('should return degraded status when configured but not connected', async () => {
      mockClient.testConnectivity.mockResolvedValue(false);
      mockClient.getConfigStatus.mockReturnValue({
        configured: true,
        endpoint: 'https://test.com',
        hasSecret: true
      });

      const result = await wrapper.getStatus();

      expect(result.status).toBe('degraded');
    });
  });
});

describe('createNudgeWrapper', () => {
  it('should create NudgeWrapper instance', () => {
    const wrapper = createNudgeWrapper();
    expect(wrapper).toBeInstanceOf(NudgeWrapper);
  });

  it('should create wrapper with options', () => {
    const options: NudgeClientOptions = { debug: true };
    const wrapper = createNudgeWrapper(options, false);
    expect(wrapper).toBeInstanceOf(NudgeWrapper);
  });
});