/**
 * Agent Integration Layer
 *
 * Provides standardized interfaces for agents to send nudge messages.
 * Handles message templating and automatic context enrichment.
 */

import { NudgeWrapper, createNudgeWrapper } from './wrapper.js';
import {
  AgentNudgeMessage,
  NudgeContext,
  NudgeMessageTemplate,
  NudgeResponse,
  NudgeClientOptions
} from './types.js';

export class AgentNudgeIntegration {
  private wrapper: NudgeWrapper;
  private templates: Map<string, NudgeMessageTemplate> = new Map();

  constructor(options?: NudgeClientOptions) {
    this.wrapper = createNudgeWrapper(options);
    this.initializeTemplates();
  }

  /**
   * Initialize default message templates for different signals
   */
  private initializeTemplates(): void {
    // Goal Clarification Template
    this.templates.set('[gg] Goal Clarification', {
      signal: '[gg] Goal Clarification',
      template: `🎯 Goal Clarification Needed

PRP: {prp_id}
Agent: {agent_role}

**Issue:** {issue}

**Current Understanding:** {current_understanding}

**Questions:**
{questions}

**Options:** {options}

**Recommendation:** {recommendation}

Please provide clarification to proceed with implementation.`,
      defaultUrgency: 'medium',
      expectedResponseType: 'information'
    });

    // Feedback Request Template
    this.templates.set('[af] Feedback Request', {
      signal: '[af] Feedback Request',
      template: `🔄 Feedback Request

PRP: {prp_id}
Agent: {agent_role}

**Topic:** {topic}

**Proposal:** {proposal}

**Alternatives Considered:** {alternatives}

**Questions:** {questions}

Please provide feedback on the proposed approach.`,
      defaultUrgency: 'medium',
      expectedResponseType: 'approval'
    });

    // Blocker Detected Template
    this.templates.set('[bb] Blocker Detected', {
      signal: '[bb] Blocker Detected',
      template: `🚫 Blocker Detected

PRP: {prp_id}
Agent: {agent_role}

**BLOCKER:** {blocker_description}

**Impact:** {impact}

**Attempted Solutions:** {attempted_solutions}

**Needed Action:** {needed_action}

**URGENCY:** {urgency}

Immediate attention required to unblock progress.`,
      defaultUrgency: 'high',
      expectedResponseType: 'decision'
    });

    // Orchestrator Attention Template
    this.templates.set('[oa] Orchestrator Attention', {
      signal: '[oa] Orchestrator Attention',
      template: `👥 Orchestrator Coordination Needed

PRP: {prp_id}
Agent: {agent_role}

**Coordination Issue:** {issue}

**Involved Agents:** {involved_agents}

**Conflict:** {conflict_description}

**Proposed Resolution:** {proposed_resolution}

**Timeline Impact:** {timeline_impact}

Please coordinate agent workflow to resolve this issue.`,
      defaultUrgency: 'medium',
      expectedResponseType: 'decision'
    });

    // Admin Attention Template
    this.templates.set('[aa] Admin Attention', {
      signal: '[aa] Admin Attention',
      template: `📋 Admin Attention Required

PRP: {prp_id}
Agent: {agent_role}

**Topic:** {topic}

**Summary:** {summary}

**Details:** {details}

**Action Required:** {action_required}

**Priority:** {priority}

Administrative oversight needed for this request.`,
      defaultUrgency: 'medium',
      expectedResponseType: 'approval'
    });
  }

  /**
   * Send nudge message from agent using template
   */
  async sendAgentNudge(
    signal: string,
    agentMessage: Partial<AgentNudgeMessage>,
    templateData: Record<string, any> = {}
  ): Promise<NudgeResponse> {
    const template = this.templates.get(signal);

    if (!template) {
      throw new Error(`No template found for signal: ${signal}`);
    }

    // Generate message from template
    const message = this.generateMessageFromTemplate(template, templateData);

    // Build complete agent message
    const completeAgentMessage: AgentNudgeMessage = {
      agentType: agentMessage.agentType || 'unknown',
      signal,
      prpId: agentMessage.prpId || 'unknown',
      message,
      context: {
        urgency: template.defaultUrgency,
        signal,
        ...templateData,
        ...agentMessage.context
      },
      urgency: agentMessage.urgency || template.defaultUrgency,
      expectedResponseType: template.expectedResponseType
    };

    return this.wrapper.sendAgentNudge(completeAgentMessage);
  }

  /**
   * Send goal clarification nudge
   */
  async sendGoalClarification(data: {
    prpId: string;
    agentType: string;
    issue: string;
    currentUnderstanding: string;
    questions: string[];
    options?: string[];
    recommendation?: string;
    urgency?: 'high' | 'medium' | 'low';
  }): Promise<NudgeResponse> {
    const templateData = {
      agentType: data.agentType,
      prpId: data.prpId,
      issue: data.issue,
      current_understanding: data.currentUnderstanding,
      questions: data.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
      options: data.options?.map((o, i) => `${i + 1}. ${o}`).join('\n') || 'No specific options defined',
      recommendation: data.recommendation || 'No specific recommendation',
      urgency: data.urgency
    };

    return this.sendAgentNudge('[gg] Goal Clarification', {
      agentType: data.agentType,
      prpId: data.prpId,
      urgency: data.urgency || 'medium'
    }, templateData);
  }

  /**
   * Send feedback request nudge
   */
  async sendFeedbackRequest(data: {
    prpId: string;
    agentType: string;
    topic: string;
    proposal: string;
    alternatives?: string[];
    questions?: string[];
    urgency?: 'high' | 'medium' | 'low';
  }): Promise<NudgeResponse> {
    const templateData = {
      agentType: data.agentType,
      prpId: data.prpId,
      topic: data.topic,
      proposal: data.proposal,
      alternatives: data.alternatives?.join('\n') || 'No alternatives considered',
      questions: data.questions?.map((q, i) => `${i + 1}. ${q}`).join('\n') || 'No specific questions',
      urgency: data.urgency
    };

    return this.sendAgentNudge('[af] Feedback Request', {
      agentType: data.agentType,
      prpId: data.prpId,
      urgency: data.urgency || 'medium'
    }, templateData);
  }

  /**
   * Send blocker notification nudge
   */
  async sendBlockerNotification(data: {
    prpId: string;
    agentType: string;
    blockerDescription: string;
    impact: string;
    attemptedSolutions?: string[];
    neededAction: string;
    urgency?: 'high' | 'medium' | 'low';
  }): Promise<NudgeResponse> {
    const templateData = {
      agentType: data.agentType,
      prpId: data.prpId,
      blocker_description: data.blockerDescription,
      impact: data.impact,
      attempted_solutions: data.attemptedSolutions?.join('\n') || 'No solutions attempted yet',
      needed_action: data.neededAction,
      urgency: data.urgency || 'high'
    };

    return this.sendAgentNudge('[bb] Blocker Detected', {
      agentType: data.agentType,
      prpId: data.prpId,
      urgency: data.urgency || 'high'
    }, templateData);
  }

  /**
   * Send orchestrator coordination nudge
   */
  async sendOrchestratorCoordination(data: {
    prpId: string;
    agentType: string;
    issue: string;
    involvedAgents: string[];
    conflictDescription?: string;
    proposedResolution?: string;
    timelineImpact?: string;
    urgency?: 'high' | 'medium' | 'low';
  }): Promise<NudgeResponse> {
    const templateData = {
      agentType: data.agentType,
      prpId: data.prpId,
      issue: data.issue,
      involved_agents: data.involvedAgents.join(', '),
      conflict_description: data.conflictDescription || 'No specific conflict',
      proposed_resolution: data.proposedResolution || 'No resolution proposed',
      timeline_impact: data.timelineImpact || 'Unknown impact',
      urgency: data.urgency
    };

    return this.sendAgentNudge('[oa] Orchestrator Attention', {
      agentType: data.agentType,
      prpId: data.prpId,
      urgency: data.urgency || 'medium'
    }, templateData);
  }

  /**
   * Send admin attention nudge
   */
  async sendAdminAttention(data: {
    prpId: string;
    agentType: string;
    topic: string;
    summary: string;
    details: string;
    actionRequired: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<NudgeResponse> {
    const templateData = {
      agentType: data.agentType,
      prpId: data.prpId,
      topic: data.topic,
      summary: data.summary,
      details: data.details,
      action_required: data.actionRequired,
      priority: data.priority || 'medium'
    };

    return this.sendAgentNudge('[aa] Admin Attention', {
      agentType: data.agentType,
      prpId: data.prpId,
      urgency: data.priority || 'medium'
    }, templateData);
  }

  /**
   * Send custom nudge message
   */
  async sendCustomNudge(data: {
    prpId: string;
    agentType: string;
    message: string;
    context?: NudgeContext;
    urgency?: 'high' | 'medium' | 'low';
    expectedResponseType?: 'decision' | 'approval' | 'information';
  }): Promise<NudgeResponse> {
    const agentMessage: AgentNudgeMessage = {
      agentType: data.agentType,
      signal: '[custom] Custom Message',
      prpId: data.prpId,
      message: data.message,
      context: data.context || {},
      urgency: data.urgency || 'medium',
      expectedResponseType: data.expectedResponseType
    };

    return this.wrapper.sendAgentNudge(agentMessage);
  }

  /**
   * Generate message from template
   */
  private generateMessageFromTemplate(
    template: NudgeMessageTemplate,
    data: Record<string, any>
  ): string {
    let message = template.template;

    // Replace template variables
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return message;
  }

  /**
   * Add custom template
   */
  addTemplate(template: NudgeMessageTemplate): void {
    this.templates.set(template.signal, template);
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): NudgeMessageTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get system status
   */
  async getStatus() {
    return this.wrapper.getStatus();
  }

  /**
   * Test nudge system
   */
  async testSystem() {
    return this.wrapper.testSystem();
  }
}

// Create default agent integration instance
export const createAgentNudgeIntegration = (
  options?: NudgeClientOptions
): AgentNudgeIntegration => {
  return new AgentNudgeIntegration(options);
};