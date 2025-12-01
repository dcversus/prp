/**
 * Nudge System Main Module
 *
 * Complete nudge communication system for PRP agents to communicate
 * with human users via dcmaidbot endpoint.
 */
// Type exports
export type {
  NudgeContext,
  NudgeMetadata,
  BaseNudgeRequest,
  DirectNudgeRequest,
  LLMModeNudgeRequest,
  NudgeRequest,
  NudgeResponse,
  NudgeErrorDetails,
  NudgeConfig,
  NudgeClientOptions,
  AgentNudgeMessage,
  NudgeResponsePayload,
  GitHubDispatchEvent,
  NudgeMessageTemplate,
} from './types';
export { NudgeError, isValidNudgeType, isValidUrgency, isValidResponseType } from './types';
// Client exports
export { NudgeClient, createNudgeClient } from './client';
// Wrapper exports
export { NudgeWrapper, createNudgeWrapper } from './wrapper';
// Agent integration exports
export { AgentNudgeIntegration, createAgentNudgeIntegration } from './agent-integration';
// Default exports for convenience
export { createAgentNudgeIntegration as default } from './agent-integration';
