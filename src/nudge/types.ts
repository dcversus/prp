/**
 * Nudge System Type Definitions
 *
 * This file defines all types for the nudge communication system
 * between PRP agents and human users via dcmaidbot endpoint.
 */

export interface NudgeContext {
  prp_id?: string;
  signal?: string;
  agent_role?: string;
  urgency?: 'high' | 'medium' | 'low';
  options?: string[];
  recommendation?: string;
  prp_link?: string;
  timestamp?: string;
}

export interface NudgeMetadata {
  timestamp: string;
  prp_link?: string;
  agent_version?: string;
  cli_version?: string;
  delivery_type?: 'direct' | 'llm-enhanced';
  fallback_from?: 'llm-mode';
  agent_type?: string;
  signal_type?: string;
  auto_generated?: boolean;
}

export interface BaseNudgeRequest {
  message: string;
  context?: NudgeContext;
  metadata?: NudgeMetadata;
}

export interface DirectNudgeRequest extends BaseNudgeRequest {
  type: 'direct';
  urgency: 'high' | 'medium' | 'low';
}

export interface LLMModeNudgeRequest extends BaseNudgeRequest {
  type: 'llm-mode';
  agent_analysis?: string;
  recommendations?: string[];
  expected_response_type?: 'decision' | 'approval' | 'information';
}

export type NudgeRequest = DirectNudgeRequest | LLMModeNudgeRequest;

export interface NudgeResponse {
  success: boolean;
  message_id?: string;
  sent_to?: string[];
  timestamp?: string;
  delivery_type?: 'direct' | 'llm-enhanced' | 'direct-fallback';
  error?: string;
}

export interface NudgeErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface NudgeConfig {
  endpoint: string;
  secret?: string;
  admin_id?: string;
  timeout?: number;
  retry_attempts?: number;
  retry_delay?: number;
}

export interface NudgeClientOptions {
  config?: Partial<NudgeConfig>;
  userAgent?: string;
  debug?: boolean;
}

// Agent integration types
export interface AgentNudgeMessage {
  agentType: string;
  signal: string;
  prpId: string;
  message: string;
  context: Record<string, any>;
  urgency: 'high' | 'medium' | 'low';
  expectedResponseType?: 'decision' | 'approval' | 'information';
}

// GitHub dispatch types for response handling
export interface NudgeResponsePayload {
  prp: string;
  user_handle: string;
  response: string;
  nudge_secret: string;
  timestamp: string;
  telegram_message_id?: string;
}

export interface GitHubDispatchEvent {
  event_type: 'nudge_response';
  client_payload: NudgeResponsePayload;
}

// Message templates
export interface NudgeMessageTemplate {
  signal: string;
  template: string;
  defaultUrgency: 'high' | 'medium' | 'low';
  expectedResponseType?: 'decision' | 'approval' | 'information';
}

// Error types
export class NudgeError extends Error {
  public readonly code: string;
  public readonly timestamp: string;
  public readonly details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'NudgeError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.details = details;
  }
}

// Validation helpers
export const isValidNudgeType = (type: string): type is 'direct' | 'llm-mode' => {
  return type === 'direct' || type === 'llm-mode';
};

export const isValidUrgency = (urgency: string): urgency is 'high' | 'medium' | 'low' => {
  return urgency === 'high' || urgency === 'medium' || urgency === 'low';
};

export const isValidResponseType = (
  type: string
): type is 'decision' | 'approval' | 'information' => {
  return type === 'decision' || type === 'approval' || type === 'information';
};