/**
 * Agent Integration Unit Tests
 *
 * Tests for the agent integration layer that provides standardized
 * interfaces for agents to send nudge messages.
 */

import { jest } from '@jest/globals';
import { AgentNudgeIntegration, createAgentNudgeIntegration } from '../agent-integration.js';
import { NudgeWrapper } from '../wrapper.js';
import {
  AgentNudgeMessage,
  NudgeResponse,
  NudgeMessageTemplate
} from '../types.js';

// Mock NudgeWrapper
jest.mock('../wrapper.js');
const MockedNudgeWrapper = NudgeWrapper as jest.MockedClass<typeof NudgeWrapper>;

describe('AgentNudgeIntegration', () => {
  let integration: AgentNudgeIntegration;
  let mockWrapper: jest.Mocked<NudgeWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock wrapper
    mockWrapper = {
      sendAgentNudge: jest.fn(),
      getStatus: jest.fn(),
      testSystem: jest.fn()
    } as any;

    MockedNudgeWrapper.mockImplementation(() => mockWrapper);
    integration = new AgentNudgeIntegration();
  });

  describe('Constructor and Initialization', () => {
    it('should create integration with NudgeWrapper', () => {
      expect(MockedNudgeWrapper).toHaveBeenCalled();
      expect(integration).toBeInstanceOf(AgentNudgeIntegration);
    });

    it('should initialize default templates', () => {
      const templates = integration.getAvailableTemplates();

      expect(templates).toHaveLength(5);
      expect(templates.map(t => t.signal)).toEqual([
        '[gg] Goal Clarification',
        '[af] Feedback Request',
        '[bb] Blocker Detected',
        '[oa] Orchestrator Attention',
        '[aa] Admin Attention'
      ]);
    });

    it('should have correct default template properties', () => {
      const templates = integration.getAvailableTemplates();

      const goalTemplate = templates.find(t => t.signal === '[gg] Goal Clarification');
      expect(goalTemplate?.defaultUrgency).toBe('medium');
      expect(goalTemplate?.expectedResponseType).toBe('information');

      const blockerTemplate = templates.find(t => t.signal === '[bb] Blocker Detected');
      expect(blockerTemplate?.defaultUrgency).toBe('high');
      expect(blockerTemplate?.expectedResponseType).toBe('decision');
    });
  });

  describe('sendAgentNudge', () => {
    const mockResponse: NudgeResponse = {
      success: true,
      message_id: 'agent-integration-test-123'
    };

    it('should send nudge using template', async () => {
      mockWrapper.sendAgentNudge.mockResolvedValue(mockResponse);

      const result = await integration.sendAgentNudge(
        '[gg] Goal Clarification',
        {
          agentType: 'robo-system-analyst',
          prpId: 'test-prp',
          urgency: 'medium'
        },
        {
          issue: 'Requirements unclear',
          current_understanding: 'System should handle X',
          questions: ['Should it handle Y?', 'What about Z?'],
          options: ['Option A', 'Option B'],
          recommendation: 'Option A'
        }
      );

      expect(result).toEqual(mockResponse);
      expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: 'robo-system-analyst',
          signal: '[gg] Goal Clarification',
          prpId: 'test-prp',
          message: expect.stringContaining('Requirements unclear'),
          context: expect.objectContaining({
            urgency: 'medium',
            signal: '[gg] Goal Clarification',
            issue: 'Requirements unclear'
          }),
          urgency: 'medium',
          expectedResponseType: 'information'
        })
      );
    });

    it('should throw error when template not found', async () => {
      await expect(
        integration.sendAgentNudge('[xx] Unknown Signal', {
          agentType: 'test-agent',
          prpId: 'test-prp'
        })
      ).rejects.toThrow('No template found for signal: [xx] Unknown Signal');
    });

    it('should merge template data with agent message context', async () => {
      mockWrapper.sendAgentNudge.mockResolvedValue(mockResponse);

      await integration.sendAgentNudge(
        '[af] Feedback Request',
        {
          agentType: 'robo-developer',
          prpId: 'test-prp',
          context: { additional_info: 'Extra context' }
        },
        {
          topic: 'API design',
          proposal: 'Use REST API',
          alternatives: ['GraphQL', 'gRPC'],
          questions: ['What about performance?']
        }
      );

      expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            topic: 'API design',
            proposal: 'Use REST API',
            alternatives: 'GraphQL, gRPC',
            questions: '1. What about performance?',
            additional_info: 'Extra context'
          })
        })
      );
    });
  });

  describe('Template Methods', () => {
    const mockResponse: NudgeResponse = {
      success: true,
      message_id: 'template-test-123'
    };

    beforeEach(() => {
      mockWrapper.sendAgentNudge.mockResolvedValue(mockResponse);
    });

    describe('sendGoalClarification', () => {
      it('should send properly formatted goal clarification', async () => {
        await integration.sendGoalClarification({
          prpId: 'test-prp',
          agentType: 'robo-system-analyst',
          issue: 'Authentication approach unclear',
          currentUnderstanding: 'Should use JWT tokens',
          questions: ['Should we use refresh tokens?', 'What about SSO?'],
          options: ['JWT only', 'JWT + refresh tokens', 'Full OAuth2'],
          recommendation: 'JWT + refresh tokens for better UX',
          urgency: 'high'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            signal: '[gg] Goal Clarification',
            urgency: 'high',
            expectedResponseType: 'information',
            message: expect.stringContaining('Authentication approach unclear'),
            message: expect.stringContaining('JWT + refresh tokens for better UX'),
            message: expect.stringContaining('1. Should we use refresh tokens?')
          })
        );
      });

      it('should use default urgency and handle missing optional fields', async () => {
        await integration.sendGoalClarification({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          issue: 'Simple question',
          currentUnderstanding: 'Basic understanding'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            urgency: 'medium',
            message: expect.stringContaining('No specific options defined'),
            message: expect.stringContaining('No specific recommendation')
          })
        );
      });
    });

    describe('sendFeedbackRequest', () => {
      it('should send properly formatted feedback request', async () => {
        await integration.sendFeedbackRequest({
          prpId: 'test-prp',
          agentType: 'robo-ux-designer',
          topic: 'Design system approach',
          proposal: 'Use Material Design components',
          alternatives: ['Custom components', 'Tailwind UI'],
          questions: ['Brand consistency concerns?'],
          urgency: 'medium'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            signal: '[af] Feedback Request',
            urgency: 'medium',
            expectedResponseType: 'approval',
            message: expect.stringContaining('Design system approach'),
            message: expect.stringContaining('Use Material Design components')
          })
        );
      });

      it('should handle missing alternatives and questions', async () => {
        await integration.sendFeedbackRequest({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          topic: 'Simple feedback',
          proposal: 'Basic proposal'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('No alternatives considered'),
            message: expect.stringContaining('No specific questions')
          })
        );
      });
    });

    describe('sendBlockerNotification', () => {
      it('should send properly formatted blocker notification', async () => {
        await integration.sendBlockerNotification({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          blockerDescription: 'API endpoint not responding',
          impact: 'Cannot complete user authentication feature',
          attemptedSolutions: ['Restarted services', 'Checked network connectivity'],
          neededAction: 'Deploy hotfix to production',
          urgency: 'high'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            signal: '[bb] Blocker Detected',
            urgency: 'high',
            expectedResponseType: 'decision',
            message: expect.stringContaining('API endpoint not responding'),
            message: expect.stringContaining('Cannot complete user authentication feature'),
            message: expect.stringContaining('Deploy hotfix to production')
          })
        );
      });

      it('should use default urgency and handle missing attempted solutions', async () => {
        await integration.sendBlockerNotification({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          blockerDescription: 'Database connection failed',
          impact: 'All data operations blocked',
          neededAction: 'Restart database service'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            urgency: 'high',
            message: expect.stringContaining('No solutions attempted yet')
          })
        );
      });
    });

    describe('sendOrchestratorCoordination', () => {
      it('should send properly formatted coordination request', async () => {
        await integration.sendOrchestratorCoordination({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          issue: 'Resource conflict between frontend and backend',
          involvedAgents: ['robo-ux-designer', 'robo-devops'],
          conflictDescription: 'Both teams need same API endpoint',
          proposedResolution: 'Create separate endpoints for each team',
          timelineImpact: '2-day delay expected',
          urgency: 'medium'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            signal: '[oa] Orchestrator Attention',
            urgency: 'medium',
            expectedResponseType: 'decision',
            message: expect.stringContaining('Resource conflict between frontend and backend'),
            message: expect.stringContaining('robo-ux-designer, robo-devops'),
            message: expect.stringContaining('2-day delay expected')
          })
        );
      });

      it('should handle missing optional coordination fields', async () => {
        await integration.sendOrchestratorCoordination({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          issue: 'Simple coordination needed',
          involvedAgents: ['robo-system-analyst']
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('No specific conflict'),
            message: expect.stringContaining('No resolution proposed'),
            message: expect.stringContaining('Unknown impact')
          })
        );
      });
    });

    describe('sendAdminAttention', () => {
      it('should send properly formatted admin attention request', async () => {
        await integration.sendAdminAttention({
          prpId: 'test-prp',
          agentType: 'robo-system-analyst',
          topic: 'Budget approval needed',
          summary: 'Need additional AWS credits for testing',
          details: 'Current testing environment requires more resources due to increased load testing requirements',
          actionRequired: 'Approve $500 budget increase',
          priority: 'high'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            signal: '[aa] Admin Attention',
            urgency: 'high',
            expectedResponseType: 'approval',
            message: expect.stringContaining('Budget approval needed'),
            message: expect.stringContaining('Need additional AWS credits for testing'),
            message: expect.stringContaining('Approve $500 budget increase')
          })
        );
      });
    });

    describe('sendCustomNudge', () => {
      it('should send custom nudge message', async () => {
        await integration.sendCustomNudge({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          message: 'Custom status update',
          context: { progress: '50%' },
          urgency: 'low',
          expectedResponseType: 'information'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            signal: '[custom] Custom Message',
            message: 'Custom status update',
            context: { progress: '50%' },
            urgency: 'low',
            expectedResponseType: 'information'
          })
        );
      });

      it('should use default values for optional parameters', async () => {
        await integration.sendCustomNudge({
          prpId: 'test-prp',
          agentType: 'robo-developer',
          message: 'Simple custom message'
        });

        expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
          expect.objectContaining({
            context: {},
            urgency: 'medium',
            expectedResponseType: undefined
          })
        );
      });
    });
  });

  describe('Template Management', () => {
    it('should add custom template', () => {
      const customTemplate: NudgeMessageTemplate = {
        signal: '[custom] Custom Signal',
        template: 'Custom template: {message}',
        defaultUrgency: 'low',
        expectedResponseType: 'information'
      };

      integration.addTemplate(customTemplate);

      const templates = integration.getAvailableTemplates();
      expect(templates).toContainEqual(customTemplate);
    });

    it('should return all available templates', () => {
      const templates = integration.getAvailableTemplates();
      expect(templates).toHaveLength(5);
      expect(templates[0]).toHaveProperty('signal');
      expect(templates[0]).toHaveProperty('template');
      expect(templates[0]).toHaveProperty('defaultUrgency');
    });
  });

  describe('System Status Methods', () => {
    it('should delegate getStatus to wrapper', async () => {
      const mockStatus = { status: 'healthy' };
      mockWrapper.getStatus.mockResolvedValue(mockStatus);

      const result = await integration.getStatus();

      expect(result).toEqual(mockStatus);
      expect(mockWrapper.getStatus).toHaveBeenCalledTimes(1);
    });

    it('should delegate testSystem to wrapper', async () => {
      const mockTestResult = { connectivity: true };
      mockWrapper.testSystem.mockResolvedValue(mockTestResult);

      const result = await integration.testSystem();

      expect(result).toEqual(mockTestResult);
      expect(mockWrapper.testSystem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Template Generation', () => {
    it('should replace all template variables', async () => {
      const mockResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(mockResponse);

      await integration.sendGoalClarification({
        prpId: 'test-prp',
        agentType: 'robo-system-analyst',
        issue: 'Test {variable}',
        currentUnderstanding: 'Understanding {variable}',
        questions: ['Question with {variable}'],
        options: ['Option {variable}'],
        recommendation: 'Recommendation {variable}'
      });

      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];
      expect(call.message).toContain('Test {variable}');
      expect(call.message).toContain('Understanding {variable}');
      expect(call.message).toContain('Option {variable}');
    });

    it('should handle missing template variables gracefully', async () => {
      const mockResponse: NudgeResponse = { success: true };
      mockWrapper.sendAgentNudge.mockResolvedValue(mockResponse);

      await integration.sendGoalClarification({
        prpId: 'test-prp',
        agentType: 'robo-system-analyst',
        issue: 'Simple issue',
        currentUnderstanding: 'Simple understanding'
        // questions, options, recommendation missing
      });

      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];
      expect(call.message).toContain('No specific options defined');
      expect(call.message).toContain('No specific recommendation');
    });
  });
});

describe('createAgentNudgeIntegration', () => {
  it('should create AgentNudgeIntegration instance', () => {
    const integration = createAgentNudgeIntegration();
    expect(integration).toBeInstanceOf(AgentNudgeIntegration);
  });

  it('should pass options to AgentNudgeIntegration constructor', () => {
    const options = {
      config: { timeout: 15000 }
    };

    const integration = createAgentNudgeIntegration(options);
    expect(MockedNudgeWrapper).toHaveBeenCalledWith(options, true);
  });
});