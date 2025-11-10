/**
 * Agent Integration Unit Tests
 *
 * Tests for agent nudge integration layer with templating and message formatting.
 */

import { AgentNudgeIntegration, createAgentNudgeIntegration } from '../agent-integration.js';
import type {
  AgentNudgeMessage,
  NudgeResponse,
  NudgeClientOptions
} from '../types.js';

// Mock the wrapper to isolate testing
jest.mock('../wrapper.js', () => ({
  createNudgeWrapper: jest.fn(() => ({
    sendAgentNudge: jest.fn(),
    getStatus: jest.fn(),
    testSystem: jest.fn()
  }))
}));

describe('AgentNudgeIntegration', () => {
  let agentIntegration: AgentNudgeIntegration;
  let mockWrapper: any;

  beforeEach(() => {
    const { createNudgeWrapper } = require('../wrapper.js');
    mockWrapper = createNudgeWrapper();
    agentIntegration = new AgentNudgeIntegration();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      expect(agentIntegration).toBeInstanceOf(AgentNudgeIntegration);
    });

    it('should create instance with custom options', () => {
      const options: NudgeClientOptions = {
        config: { endpoint: 'https://test.com' },
        debug: true
      };

      const customAgent = new AgentNudgeIntegration(options);
      expect(customAgent).toBeInstanceOf(AgentNudgeIntegration);
    });
  });

  describe('Template System', () => {
    it('should initialize with default templates', () => {
      const templates = agentIntegration.getAvailableTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.signal === '[gg] Goal Clarification')).toBe(true);
      expect(templates.some(t => t.signal === '[af] Feedback Request')).toBe(true);
      expect(templates.some(t => t.signal === '[bb] Blocker Detected')).toBe(true);
    });

    it('should add custom template', () => {
      const customTemplate = {
        signal: '[custom] Custom Signal',
        template: 'Custom template with {variable}',
        defaultUrgency: 'medium' as const,
        expectedResponseType: 'information' as const
      };

      agentIntegration.addTemplate(customTemplate);

      const templates = agentIntegration.getAvailableTemplates();
      expect(templates.some(t => t.signal === '[custom] Custom Signal')).toBe(true);
    });
  });

  describe('sendGoalClarification', () => {
    it('should send goal clarification nudge with valid data', async () => {
      const expectedResponse: NudgeResponse = {
        success: true,
        message_id: 'test-id',
        sent_to: ['admin'],
        timestamp: '2024-01-01T00:00:00Z',
        delivery_type: 'direct'
      };

      mockWrapper.sendAgentNudge.mockResolvedValue(expectedResponse);

      const result = await agentIntegration.sendGoalClarification({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        issue: 'Requirements unclear',
        currentUnderstanding: 'We need to build X',
        questions: ['What is X?', 'When is it due?'],
        options: ['Option A', 'Option B'],
        recommendation: 'Choose Option A',
        urgency: 'medium'
      });

      expect(result).toEqual(expectedResponse);
      expect(mockWrapper.sendAgentNudge).toHaveBeenCalledTimes(1);

      const [callArgs] = mockWrapper.sendAgentNudge.mock.calls;
      const agentMessage: AgentNudgeMessage = callArgs[0];

      expect(agentMessage.agentType).toBe('robo-developer');
      expect(agentMessage.prpId).toBe('test-prp');
      expect(agentMessage.signal).toBe('[gg] Goal Clarification');
      expect(agentMessage.urgency).toBe('medium');
      expect(agentMessage.message).toContain('Requirements unclear');
      expect(agentMessage.message).toContain('1. What is X?');
      expect(agentMessage.message).toContain('1. Option A');
    });

    it('should handle missing optional parameters', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(expectedResponse);

      await agentIntegration.sendGoalClarification({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        issue: 'Issue',
        currentUnderstanding: 'Understanding',
        questions: ['Question 1']
      });

      const [callArgs] = mockWrapper.sendAgentNudge.mock.calls;
      const agentMessage: AgentNudgeMessage = callArgs[0];

      expect(agentMessage.message).toContain('No specific options defined');
      expect(agentMessage.message).toContain('No specific recommendation');
    });
  });

  describe('sendFeedbackRequest', () => {
    it('should send feedback request nudge', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(expectedResponse);

      await agentIntegration.sendFeedbackRequest({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        topic: 'Database Design',
        proposal: 'Use PostgreSQL',
        alternatives: ['MySQL', 'MongoDB'],
        questions: ['Performance requirements?'],
        urgency: 'high'
      });

      expect(mockWrapper.sendAgentNudge).toHaveBeenCalledTimes(1);

      const [callArgs] = mockWrapper.sendAgentNudge.mock.calls;
      const agentMessage: AgentNudgeMessage = callArgs[0];

      expect(agentMessage.signal).toBe('[af] Feedback Request');
      expect(agentMessage.urgency).toBe('high');
      expect(agentMessage.message).toContain('Database Design');
      expect(agentMessage.message).toContain('Use PostgreSQL');
      expect(agentMessage.message).toContain('MySQL');
      expect(agentMessage.message).toContain('1. Performance requirements?');
    });
  });

  describe('sendBlockerNotification', () => {
    it('should send blocker notification', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(expectedResponse);

      await agentIntegration.sendBlockerNotification({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        blockerDescription: 'Cannot connect to database',
        impact: 'Development blocked',
        attemptedSolutions: ['Restarted service', 'Checked credentials'],
        neededAction: 'Database admin assistance required',
        urgency: 'high'
      });

      const [callArgs] = mockWrapper.sendAgentNudge.mock.calls;
      const agentMessage: AgentNudgeMessage = callArgs[0];

      expect(agentMessage.signal).toBe('[bb] Blocker Detected');
      expect(agentMessage.urgency).toBe('high');
      expect(agentMessage.message).toContain('Cannot connect to database');
      expect(agentMessage.message).toContain('Development blocked');
      expect(agentMessage.message).toContain('Restarted service');
      expect(agentMessage.message).toContain('Database admin assistance required');
    });
  });

  describe('sendOrchestratorCoordination', () => {
    it('should send orchestrator coordination request', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(expectedResponse);

      await agentIntegration.sendOrchestratorCoordination({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        issue: 'Resource conflict',
        involvedAgents: ['robo-aqa', 'robo-ux-ui-designer'],
        conflictDescription: 'Both agents need same environment',
        proposedResolution: 'Sequential execution',
        timelineImpact: '1 day delay',
        urgency: 'medium'
      });

      const [callArgs] = mockWrapper.sendAgentNudge.mock.calls;
      const agentMessage: AgentNudgeMessage = callArgs[0];

      expect(agentMessage.signal).toBe('[oa] Orchestrator Attention');
      expect(agentMessage.message).toContain('Resource conflict');
      expect(agentMessage.message).toContain('robo-aqa, robo-ux-ui-designer');
      expect(agentMessage.message).toContain('Sequential execution');
      expect(agentMessage.message).toContain('1 day delay');
    });
  });

  describe('sendAdminAttention', () => {
    it('should send admin attention request', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(expectedResponse);

      await agentIntegration.sendAdminAttention({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        topic: 'API Key Required',
        summary: 'Need external API key for service',
        details: 'Service X requires API key for integration',
        actionRequired: 'Please provide API key',
        priority: 'high'
      });

      const [callArgs] = mockWrapper.sendAgentNudge.mock.calls;
      const agentMessage: AgentNudgeMessage = callArgs[0];

      expect(agentMessage.signal).toBe('[aa] Admin Attention');
      expect(agentMessage.message).toContain('API Key Required');
      expect(agentMessage.message).toContain('Need external API key for service');
      expect(agentMessage.message).toContain('Please provide API key');
    });
  });

  describe('sendCustomNudge', () => {
    it('should send custom nudge message', async () => {
      const expectedResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(expectedResponse);

      const customData = {
        prpId: 'test-prp',
        agentType: 'robo-developer',
        message: 'Custom message',
        context: { detail: 'Custom context' },
        urgency: 'low' as const,
        expectedResponseType: 'information' as const
      };

      await agentIntegration.sendCustomNudge(customData);

      const [callArgs] = mockWrapper.sendAgentNudge.mock.calls;
      const agentMessage: AgentNudgeMessage = callArgs[0];

      expect(agentMessage.signal).toBe('[custom] Custom Message');
      expect(agentMessage.message).toBe('Custom message');
      expect(agentMessage.context).toEqual({
        urgency: 'low',
        detail: 'Custom context'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing template gracefully', async () => {
      await expect(
        agentIntegration.sendAgentNudge('[nonexistent] Template', {})
      ).rejects.toThrow('No template found for signal: [nonexistent] Template');
    });
  });

  describe('Utility Methods', () => {
    it('should get system status', async () => {
      const mockStatus = { status: 'healthy' };
      mockWrapper.getStatus.mockResolvedValue(mockStatus);

      const status = await agentIntegration.getStatus();
      expect(status).toEqual(mockStatus);
      expect(mockWrapper.getStatus).toHaveBeenCalledTimes(1);
    });

    it('should test system', async () => {
      const mockTestResult = { connectivity: true, config: {} };
      mockWrapper.testSystem.mockResolvedValue(mockTestResult);

      const testResult = await agentIntegration.testSystem();
      expect(testResult).toEqual(mockTestResult);
      expect(mockWrapper.testSystem).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createAgentNudgeIntegration', () => {
  it('should create AgentNudgeIntegration instance', () => {
    const agent = createAgentNudgeIntegration();
    expect(agent).toBeInstanceOf(AgentNudgeIntegration);
  });

  it('should create instance with options', () => {
    const options: NudgeClientOptions = { debug: true };
    const agent = createAgentNudgeIntegration(options);
    expect(agent).toBeInstanceOf(AgentNudgeIntegration);
  });
});