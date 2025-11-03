/**
 * Nudge System Main Module
 *
 * Complete nudge communication system for PRP agents to communicate
 * with human users via dcmaidbot endpoint.
 */

// Type exports
export {
  NudgeContext,
  NudgeMetadata,
  BaseNudgeRequest,
  DirectNudgeRequest,
  LLMModeNudgeRequest,
  NudgeRequest,
  NudgeResponse,
  NudgeError,
  NudgeErrorDetails,
  NudgeConfig,
  NudgeClientOptions,
  AgentNudgeMessage,
  NudgeResponsePayload,
  GitHubDispatchEvent,
  NudgeMessageTemplate,
  isValidNudgeType,
  isValidUrgency,
  isValidResponseType
} from './types.js';

// Client exports
export { NudgeClient, createNudgeClient } from './client.js';

// Wrapper exports
export { NudgeWrapper, createNudgeWrapper } from './wrapper.js';

// Agent integration exports
export { AgentNudgeIntegration, createAgentNudgeIntegration } from './agent-integration.js';

// Default exports for convenience
export { createAgentNudgeIntegration as default } from './agent-integration.js';