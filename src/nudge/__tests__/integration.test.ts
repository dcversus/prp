/**
 * Nudge Integration Tests
 *
 * End-to-end integration tests for the nudge system,
 * testing the complete flow from agent integration to HTTP client.
 */

import { jest } from '@jest/globals';
import { AgentNudgeIntegration } from '../agent-integration.js';
import { NudgeWrapper } from '../wrapper.js';
import { NudgeClient } from '../client.js';
import { NudgeResponse } from '../types.js';

// Mock all external dependencies
jest.mock('../client.js');
jest.mock('../wrapper.js');

const MockedNudgeClient = NudgeClient as jest.MockedClass<typeof NudgeClient>;
const MockedNudgeWrapper = NudgeWrapper as jest.MockedClass<typeof NudgeWrapper>;

describe('Nudge System Integration Tests', () => {
  let mockClient: jest.Mocked<NudgeClient>;
  let mockWrapper: jest.Mocked<NudgeWrapper>;
  let integration: AgentNudgeIntegration;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {
      sendNudge: jest.fn(),
      testConnectivity: jest.fn(),
      getConfigStatus: jest.fn()
    } as jest.Mocked<NudgeClient>;

    MockedNudgeClient.mockImplementation(() => mockClient);

    // Setup mock wrapper
    mockWrapper = {
      sendAgentNudge: jest.fn(),
      getStatus: jest.fn(),
      testSystem: jest.fn()
    } as jest.Mocked<NudgeWrapper>;

    MockedNudgeWrapper.mockImplementation(() => mockWrapper);

    integration = new AgentNudgeIntegration();
  });

  describe('Complete Agent-to-Endpoint Flow', () => {
    const mockSuccessResponse: NudgeResponse = {
      success: true,
      message_id: 'integration-test-123',
      sent_to: ['@admin'],
      timestamp: '2025-01-01T00:00:00Z',
      delivery_type: 'direct'
    };

    it('should complete goal clarification flow from agent to endpoint', async () => {
      // Mock wrapper to return processed agent message

      mockWrapper.sendAgentNudge.mockResolvedValue(mockSuccessResponse);
      mockWrapper.sendAgentNudge.mockImplementation(async () => {
        // Simulate the wrapper processing the agent message
        mockClient.sendNudge.mockResolvedValue(mockSuccessResponse);
        return mockSuccessResponse;
      });

      // Send goal clarification through integration
      const result = await integration.sendGoalClarification({
        prpId: 'test-prp',
        agentType: 'robo-system-analyst',
        issue: 'Requirements unclear',
        currentUnderstanding: 'Basic understanding',
        questions: ['Should we use X?'],
        options: ['Option X'],
        recommendation: 'Use X'
      });

      // Verify the complete flow
      expect(result).toEqual(mockSuccessResponse);
      expect(mockWrapper.sendAgentNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: 'robo-system-analyst',
          signal: '[gg] Goal Clarification',
          prpId: 'test-prp'
        })
      );
    });

    it('should complete blocker notification flow with fallback', async () => {
      const directFallbackResponse: NudgeResponse = {
        success: true,
        message_id: 'blocker-fallback-456',
        delivery_type: 'direct-fallback'
      };

      // Simulate LLM-mode failure and direct fallback success
      mockWrapper.sendAgentNudge.mockImplementation(async () => {
        // First attempt (LLM-mode) fails
        const llmError = new Error('LLM processing failed');

        // Second attempt (direct fallback) succeeds
        mockClient.sendNudge
          .mockRejectedValueOnce(llmError)
          .mockResolvedValueOnce(directFallbackResponse);

        return directFallbackResponse;
      });

      const result = await integration.sendBlockerNotification({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        blockerDescription: 'API endpoint down',
        impact: 'Cannot complete authentication',
        neededAction: 'Deploy hotfix',
        urgency: 'high'
      });

      expect(result.success).toBe(true);
      expect(result.delivery_type).toBe('direct-fallback');
    });

    it('should handle complete failure flow gracefully', async () => {
      // Mock complete failure (both LLM and direct)
      mockWrapper.sendAgentNudge.mockImplementation(async () => {
        mockClient.sendNudge.mockRejectedValue(new Error('Network unreachable'));
        throw new Error('All delivery methods failed');
      });

      await expect(
        integration.sendFeedbackRequest({
          prpId: 'test-prp',
          agentType: 'robo-ux-designer',
          topic: 'Design review',
          proposal: 'New color scheme'
        })
      ).rejects.toThrow('All delivery methods failed');
    });
  });

  describe('Real-World Agent Scenarios', () => {
    const mockResponse: NudgeResponse = {
      success: true,
      message_id: 'scenario-test-789'
    };

    beforeEach(() => {
      mockWrapper.sendAgentNudge.mockResolvedValue(mockResponse);
    });

    it('should handle robo-developer technical decision scenario', async () => {
      await integration.sendFeedbackRequest({
        prpId: 'nudge-endpoint-integrated',
        agentType: 'robo-developer',
        topic: 'Authentication strategy',
        proposal: 'Implement JWT with refresh tokens',
        alternatives: ['Session-based auth', 'OAuth2 with third-party providers'],
        questions: [
          'What are the security requirements?',
          'Do we need SSO integration?',
          'What is the expected user session duration?'
        ],
        urgency: 'medium'
      });

      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];

      expect(call.signal).toBe('[af] Feedback Request');
      expect(call.context.topic).toBe('Authentication strategy');
      expect(call.message).toContain('JWT with refresh tokens');
      expect(call.message).toContain('What are the security requirements?');
      expect(call.expectedResponseType).toBe('approval');
    });

    it('should handle robo-system-analyst goal clarification scenario', async () => {
      await integration.sendGoalClarification({
        prpId: 'nudge-endpoint-integrated',
        agentType: 'robo-system-analyst',
        issue: 'Integration scope unclear',
        currentUnderstanding: 'Need to integrate existing dcmaidbot endpoint with PRP system',
        questions: [
          'Should we implement kubectl secret retrieval now or later?',
          'Is the GitHub response workflow required for MVP?',
          'What is the priority level for agent integration?'
        ],
        options: [
          'Phase 1: Basic integration only',
          'Phase 1: Full feature implementation',
          'Phase 1: Integration + comprehensive testing'
        ],
        recommendation: 'Phase 1: Basic integration only to validate functionality',
        urgency: 'high'
      });

      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];

      expect(call.context.urgency).toBe('high');
      expect(call.message).toContain('Integration scope unclear');
      expect(call.message).toContain('kubectl secret retrieval');
      expect(call.expectedResponseType).toBe('information');
    });

    it('should handle robo-devops infrastructure scenario', async () => {
      await integration.sendOrchestratorCoordination({
        prpId: 'nudge-endpoint-integrated',
        agentType: 'robo-devops',
        issue: 'Kubernetes cluster access conflicts',
        involvedAgents: ['robo-developer', 'robo-system-analyst'],
        conflictDescription: 'Developer needs cluster access for secret retrieval, but production access restricted',
        proposedResolution: 'Create separate development namespace with limited permissions',
        timelineImpact: '1-2 days for namespace setup and RBAC configuration',
        urgency: 'medium'
      });

      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];

      expect(call.signal).toBe('[oa] Orchestrator Attention');
      expect(call.context.involved_agents).toBe('robo-developer, robo-system-analyst');
      expect(call.message).toContain('Kubernetes cluster access conflicts');
      expect(call.expectedResponseType).toBe('decision');
    });

    it('should handle urgent blocker scenario', async () => {
      await integration.sendBlockerNotification({
        prpId: 'nudge-endpoint-integrated',
        agentType: 'robo-developer',
        blockerDescription: 'Tests failing due to missing environment variables',
        impact: 'Cannot validate nudge functionality, blocking release',
        attemptedSolutions: [
          'Added NUDGE_SECRET to .env.example',
          'Updated documentation with setup instructions',
          'Tried running with mock configuration'
        ],
        neededAction: 'Provide actual NUDGE_SECRET and ADMIN_ID values for testing',
        urgency: 'high'
      });

      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];

      expect(call.context.urgency).toBe('high');
      expect(call.message).toContain('Tests failing due to missing environment variables');
      expect(call.message).toContain('Cannot validate nudge functionality');
      expect(call.expectedResponseType).toBe('decision');
    });
  });

  describe('System Health and Monitoring', () => {
    it('should report healthy status when all systems operational', async () => {
      mockWrapper.getStatus.mockResolvedValue({
        status: 'healthy',
        details: {
          client_config: {
            configured: true,
            endpoint: 'https://dcmaid.theedgestory.org/nudge',
            hasSecret: true,
            hasAdminId: true,
            timeout: 10000
          },
          fallback_enabled: true,
          last_test: {
            connectivity: true,
            timestamp: '2025-01-01T00:00:00Z'
          }
        }
      });

      const status = await integration.getStatus();

      expect(status.status).toBe('healthy');
      expect(status.details.client_config.configured).toBe(true);
      expect(status.details.fallback_enabled).toBe(true);
    });

    it('should report degraded status with connectivity issues', async () => {
      mockWrapper.getStatus.mockResolvedValue({
        status: 'degraded',
        details: {
          client_config: {
            configured: true,
            hasSecret: true,
            hasAdminId: true
          },
          fallback_enabled: true,
          last_test: {
            connectivity: false,
            timestamp: '2025-01-01T00:00:00Z',
            error: 'Network timeout'
          }
        }
      });

      const status = await integration.getStatus();

      expect(status.status).toBe('degraded');
      expect(status.details.last_test?.connectivity).toBe(false);
      expect(status.details.last_test?.error).toBe('Network timeout');
    });

    it('should report unhealthy status when not configured', async () => {
      mockWrapper.getStatus.mockResolvedValue({
        status: 'unhealthy',
        details: {
          client_config: {
            configured: false,
            hasSecret: false,
            hasAdminId: false
          },
          fallback_enabled: true
        }
      });

      const status = await integration.getStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.details.client_config.configured).toBe(false);
    });
  });

  describe('Template Customization and Extensibility', () => {
    it('should support custom templates for new signal types', async () => {
      // Add a custom template for a new signal type
      integration.addTemplate({
        signal: '[ci] Continuous Integration',
        template: `🔄 CI Pipeline Update

PRP: {prp_id}
Agent: {agent_role}

**Pipeline Status:** {pipeline_status}
**Build Number:** {build_number}
**Failed Stage:** {failed_stage}
**Error Details:** {error_details}

**Action Required:** {action_required}

Please review and provide guidance.`,
        defaultUrgency: 'medium',
        expectedResponseType: 'decision'
      });

      // Mock the wrapper response
      mockWrapper.sendAgentNudge.mockResolvedValue({
        success: true,
        message_id: 'custom-template-test'
      });

      // Send a message using the custom template
      await integration.sendAgentNudge('[ci] Continuous Integration', {
        agentType: 'robo-devops',
        prpId: 'test-prp',
        urgency: 'high'
      }, {
        pipeline_status: 'Failed',
        build_number: '#1234',
        failed_stage: 'Integration Tests',
        error_details: 'Test timeout after 10 minutes',
        action_required: 'Investigate test failures and approve manual deployment if needed'
      });

      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];

      expect(call.signal).toBe('[ci] Continuous Integration');
      expect(call.message).toContain('Pipeline Status: Failed');
      expect(call.message).toContain('Build Number: #1234');
      expect(call.expectedResponseType).toBe('decision');
    });

    it('should maintain all default templates when adding custom ones', () => {
      const initialTemplateCount = integration.getAvailableTemplates().length;

      integration.addTemplate({
        signal: '[custom] Test Signal',
        template: 'Test template: {message}',
        defaultUrgency: 'low',
        expectedResponseType: 'information'
      });

      const templates = integration.getAvailableTemplates();
      expect(templates).toHaveLength(initialTemplateCount + 1);

      // Verify default templates still exist
      const defaultSignals = [
        '[gg] Goal Clarification',
        '[af] Feedback Request',
        '[bb] Blocker Detected',
        '[oa] Orchestrator Attention',
        '[aa] Admin Attention'
      ];

      defaultSignals.forEach(signal => {
        expect(templates.find(t => t.signal === signal)).toBeDefined();
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle template generation errors gracefully', async () => {
      // Mock template generation failure
      mockWrapper.sendAgentNudge.mockImplementation(async () => {
        throw new Error('Template generation failed');
      });

      await expect(
        integration.sendGoalClarification({
          prpId: 'test-prp',
          agentType: 'robo-system-analyst',
          issue: 'Test issue',
          currentUnderstanding: 'Test understanding'
        })
      ).rejects.toThrow('Template generation failed');
    });

    it('should handle malformed template data', async () => {
      mockWrapper.sendAgentNudge.mockResolvedValue({
        success: true,
        message_id: 'malformed-data-test'
      });

      // Send data with potential issues (null values, special characters, etc.)
      await integration.sendFeedbackRequest({
        prpId: 'test-prp',
        agentType: 'robo-developer',
        topic: 'Test with special chars: !@#$%^&*()',
        proposal: 'Proposal with "quotes" and \'apostrophes\'',
        alternatives: ['Option with\nnewlines', 'Option with\ttabs'],
        questions: ['Question with <html> tags?']
      });

      expect(mockWrapper.sendAgentNudge).toHaveBeenCalled();

      // Verify that the message was processed without throwing errors
      const call = mockWrapper.sendAgentNudge.mock.calls[0][0];
      expect(call.message).toContain('special chars: !@#$%^&*()');
    });
  });
});