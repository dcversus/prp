/**
 * Nudge Wrapper
 *
 * Main wrapper that provides a unified interface for sending both
 * direct and LLM-mode nudge messages with intelligent fallback.
 */

import { NudgeClient, createNudgeClient } from './client.js';
import {
  NudgeRequest,
  NudgeResponse,
  DirectNudgeRequest,
  LLMModeNudgeRequest,
  NudgeContext,
  AgentNudgeMessage,
  NudgeError,
  NudgeClientOptions
} from './types.js';
import { logger } from '../utils/logger.js';

export class NudgeWrapper {
  private client: NudgeClient;
  private fallbackEnabled: boolean;

  constructor(options: NudgeClientOptions = {}, fallbackEnabled: boolean = true) {
    this.client = createNudgeClient(options);
    this.fallbackEnabled = fallbackEnabled;
  }

  /**
   * Send a direct nudge message (immediate delivery, bypasses LLM)
   */
  async sendDirectNudge(
    message: string,
    urgency: 'high' | 'medium' | 'low',
    context?: NudgeContext,
    metadata?: Record<string, unknown>
  ): Promise<NudgeResponse> {
    const request: DirectNudgeRequest = {
      type: 'direct',
      message,
      urgency,
      context,
      metadata: {
        timestamp: new Date().toISOString(),
        delivery_type: 'direct',
        ...metadata
      }
    };

    return this.sendWithFallback(request);
  }

  /**
   * Send an LLM-mode nudge message (enhanced processing)
   */
  async sendLLMModeNudge(
    message: string,
    context: NudgeContext,
    agentAnalysis?: string,
    recommendations?: string[],
    expectedResponseType?: 'decision' | 'approval' | 'information',
    metadata?: Record<string, unknown>
  ): Promise<NudgeResponse> {
    const request: LLMModeNudgeRequest = {
      type: 'llm-mode',
      message,
      context,
      agent_analysis: agentAnalysis,
      recommendations,
      expected_response_type: expectedResponseType,
      metadata: {
        timestamp: new Date().toISOString(),
        delivery_type: 'llm-enhanced',
        ...metadata
      }
    };

    return this.sendWithFallback(request);
  }

  /**
   * Send nudge from agent with automatic message formatting
   */
  async sendAgentNudge(agentMessage: AgentNudgeMessage): Promise<NudgeResponse> {
    const { agentType, signal, prpId, message, context, urgency, expectedResponseType } = agentMessage;

    // Build nudge context
    const nudgeContext: NudgeContext = {
      prp_id: prpId,
      signal,
      agent_role: agentType,
      urgency,
      prp_link: `https://github.com/dcversus/prp/blob/main/PRPs/${prpId.toLowerCase()}.md`,
      timestamp: new Date().toISOString(),
      ...context
    };

    // Determine nudge type based on urgency and complexity
    const isHighPriority = urgency === 'high' || signal === '[ic]' || signal === '[aa]';
    const isComplexDecision = expectedResponseType === 'decision' && context.options;

    if (isHighPriority || !isComplexDecision) {
      // Use direct nudge for urgent or simple messages
      return this.sendDirectNudge(
        message,
        urgency,
        nudgeContext,
        {
          agent_type: agentType,
          signal_type: signal,
          auto_generated: true
        }
      );
    } else {
      // Use LLM-mode for complex decisions
      return this.sendLLMModeNudge(
        message,
        nudgeContext,
        context.analysis as string | undefined,
        context.recommendations as string[] | undefined,
        expectedResponseType,
        {
          agent_type: agentType,
          signal_type: signal,
          auto_generated: true
        }
      );
    }
  }

  /**
   * Send nudge with intelligent fallback
   */
  private async sendWithFallback(request: NudgeRequest): Promise<NudgeResponse> {
    try {
      return await this.client.sendNudge(request);
    } catch (error) {
      // If fallback is disabled, rethrow the error
      if (!this.fallbackEnabled) {
        throw error;
      }

      // If LLM-mode failed, try direct nudge as fallback
      if (request.type === 'llm-mode') {
        logger.warn('nudge', 'LLM-mode nudge failed, attempting direct nudge fallback...');

        const fallbackRequest: DirectNudgeRequest = {
          type: 'direct',
          message: request.message,
          urgency: request.context?.urgency ?? 'medium',
          context: request.context,
          metadata: {
            ...request.metadata,
            timestamp: new Date().toISOString()
          }
        };

        try {
          const response = await this.client.sendNudge(fallbackRequest);
          logger.info('nudge', 'Direct nudge fallback successful');
          return {
            ...response,
            delivery_type: 'direct'
          };
        } catch (fallbackError) {
          logger.error('nudge', 'Direct nudge fallback also failed', fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
          throw new NudgeError(
            'FALLBACK_FAILED',
            'Both LLM-mode and direct nudge delivery failed',
            {
              originalError: error,
              fallbackError,
              request
            }
          );
        }
      }

      // For direct nudge failures, no fallback available
      throw error;
    }
  }

  /**
   * Test nudge system connectivity and configuration
   */
  async testSystem(): Promise<{
    connectivity: boolean;
    config: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const connectivity = await this.client.testConnectivity();
      const config = this.client.getConfigStatus();

      return {
        connectivity,
        config
      };
    } catch (error) {
      return {
        connectivity: false,
        config: this.client.getConfigStatus(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get system status and health information
   */
  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      client_config: Record<string, unknown>;
      fallback_enabled: boolean;
      last_test?: {
        connectivity: boolean;
        timestamp: string;
        error?: string;
      };
    };
  }> {
    const testResult = await this.testSystem();
    const config = testResult.config;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (!config.configured) {
      status = 'unhealthy';
    } else if (!testResult.connectivity) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      details: {
        client_config: config,
        fallback_enabled: this.fallbackEnabled,
        last_test: {
          connectivity: testResult.connectivity,
          timestamp: new Date().toISOString(),
          error: testResult.error
        }
      }
    };
  }

  /**
   * Send a simple nudge message with automatic type selection
   */
  async sendNudge(
    message: string,
    options: {
      urgency?: 'high' | 'medium' | 'low';
      context?: NudgeContext;
      type?: 'direct' | 'llm-mode';
      agentAnalysis?: string;
      recommendations?: string[];
      expectedResponseType?: 'decision' | 'approval' | 'information';
    } = {}
  ): Promise<NudgeResponse> {
    const {
      urgency = 'medium',
      context,
      type,
      agentAnalysis,
      recommendations,
      expectedResponseType
    } = options;

    // Auto-determine nudge type if not specified
    if (!type) {
      if (agentAnalysis || recommendations || expectedResponseType) {
        return this.sendLLMModeNudge(
          message,
          context ?? {},
          agentAnalysis,
          recommendations,
          expectedResponseType
        );
      } else {
        return this.sendDirectNudge(message, urgency, context);
      }
    }

    if (type === 'direct') {
      return this.sendDirectNudge(message, urgency, context);
    } else {
      return this.sendLLMModeNudge(
        message,
        context ?? {},
        agentAnalysis,
        recommendations,
        expectedResponseType
      );
    }
  }
}

// Create default wrapper instance
export const createNudgeWrapper = (
  options?: NudgeClientOptions,
  fallbackEnabled?: boolean
): NudgeWrapper => {
  return new NudgeWrapper(options, fallbackEnabled);
};