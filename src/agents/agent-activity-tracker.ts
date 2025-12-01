/**
 * ♫ Agent Activity Tracking System for @dcversus/prp
 *
 * Provides comprehensive tracking of agent activities and signal attribution
 * connecting scanner signal detection with specific agent actions.
 */

/* eslint-disable */


import type { BaseAgent, AgentMetrics } from './base-agent';
import type { Signal } from '../shared/types';

/**
 * Agent activity types for categorizing different agent behaviors
 */
export enum AgentActivityType {
  SIGNAL_GENERATED = 'signal_generated',
  FILE_MODIFIED = 'file_modified',
  PRP_UPDATED = 'prp_updated',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  ERROR_OCCURRED = 'error_occurred',
  TOKEN_USED = 'token_used',
  MESSAGE_SENT = 'message_sent',
  TOOL_EXECUTED = 'tool_executed'
}

/**
 * Signal attribution confidence levels
 */
export enum AttributionConfidence {
  HIGH = 'high',      // Direct agent signature or unique pattern
  MEDIUM = 'medium',  // Contextual evidence and timing correlation
  LOW = 'low',        // Weak evidence or probabilistic matching
  UNKNOWN = 'unknown' // No clear attribution evidence
}

/**
 * Agent activity record with comprehensive metadata
 */
export interface AgentActivity {
  id: string;
  timestamp: Date;
  agentId: string;
  agentType: string;
  activityType: AgentActivityType;
  description: string;
  metadata: Record<string, unknown>;
  // Signal attribution
  relatedSignals: string[]; // Signal IDs this activity relates to
  signalConfidence: AttributionConfidence;
  // Context information
  prpContext?: string; // PRP name/id if applicable
  filePath?: string; // File path if file-related activity
  sessionId?: string; // Session identifier for correlation
  parentActivityId?: string; // For activity chaining
  childActivityIds: string[]; // For activity hierarchy
}

/**
 * Signal attribution result linking signals to agents
 */
export interface SignalAttribution {
  signalId: string;
  signalCode: string; // [gg], [bb], etc.
  detectedAt: Date;
  attributedAgent?: {
    agentId: string;
    agentType: string;
    confidence: AttributionConfidence;
    evidence: string[];
    reasoning: string;
  };
  alternativeAgents?: Array<{
    agentId: string;
    agentType: string;
    confidence: AttributionConfidence;
    evidence: string[];
  }>;
  attributionMethod: 'direct' | 'contextual' | 'temporal' | 'pattern_match' | 'ml_inference';
  metadata: Record<string, unknown>;
}

/**
 * Agent activity tracking configuration
 */
export interface AgentActivityTrackerConfig {
  retentionPeriod: number; // milliseconds to keep activity records
  maxActivitiesPerAgent: number;
  enableRealTimeTracking: boolean;
  enableAttribution: boolean;
  attributionThresholds: {
    highConfidence: number; // 0.0-1.0
    mediumConfidence: number; // 0.0-1.0
    maxTimeDelta: number; // milliseconds for temporal correlation
  };
  trackingFilters: {
    excludedActivityTypes: AgentActivityType[];
    includedAgents: string[]; // Empty means all agents
    includedPRPs: string[]; // Empty means all PRPs
  };
}

/**
 * Agent activity tracker interface
 */
export interface AgentActivityTracker {
  // Core tracking methods
  trackActivity(activity: Omit<AgentActivity, 'id' | 'timestamp'>): Promise<string>;
  getActivity(activityId: string): Promise<AgentActivity | null>;
  getActivitiesByAgent(agentId: string, limit?: number): Promise<AgentActivity[]>;
  getActivitiesByPRP(prpName: string, limit?: number): Promise<AgentActivity[]>;
  getActivitiesBySignal(signalId: string): Promise<AgentActivity[]>;

  // Attribution methods
  attributeSignalToAgent(
    signalId: string,
    signalCode: string,
    context: {
      timestamp: Date;
      content: string;
      filePath?: string;
      prpContext?: string;
    }
  ): Promise<SignalAttribution>;

  // Query and analytics
  getAgentMetrics(agentId: string, timeRange?: { start: Date; end: Date }): Promise<{
    activity: AgentActivity[];
    signalAttributions: SignalAttribution[];
    performance: Omit<AgentMetrics, 'lastReset'> & {
      signalGenerationRate: number;
      attributionAccuracy: number;
    };
  }>;

  // Cleanup and maintenance
  cleanup(): Promise<void>;
  getConfiguration(): AgentActivityTrackerConfig;
  updateConfiguration(config: Partial<AgentActivityTrackerConfig>): Promise<void>;
}

/**
 * Agent signal registry for managing agent-signal relationships
 */
export interface AgentSignalRegistry {
  // Registration methods
  registerAgent(agent: BaseAgent): Promise<void>;
  unregisterAgent(agentId: string): Promise<void>;

  // Signal-agent association
  associateSignalWithAgent(
    signalId: string,
    agentId: string,
    confidence: AttributionConfidence,
    evidence: string[]
  ): Promise<void>;

  // Query methods
  getAgentForSignal(signalId: string): Promise<string | null>;
  getSignalsForAgent(agentId: string, timeRange?: { start: Date; end: Date }): Promise<string[]>;
  getActiveAgents(): Promise<string[]>;

  // Pattern learning
  learnSignalPatterns(
    agentId: string,
    signalPatterns: Array<{
      signalCode: string;
      context: string;
      frequency: number;
    }>
  ): Promise<void>;

  getSignalPatterns(agentId: string): Promise<Array<{
    signalCode: string;
    context: string;
    frequency: number;
    confidence: number;
  }>>;
}

/**
 * Enhanced signal with agent attribution information
 */
export interface AttributedSignal extends Signal {
  attribution?: SignalAttribution;
  agentActivity?: AgentActivity[];
  detectionSource: {
    component: 'scanner' | 'inspector' | 'orchestrator' | 'agent';
    method: string;
  };
}

/**
 * Activity correlation result for linking related activities
 */
export interface ActivityCorrelation {
  primaryActivity: AgentActivity;
  correlatedActivities: Array<{
    activity: AgentActivity;
    correlationStrength: number; // 0.0-1.0
    correlationType: 'temporal' | 'causal' | 'contextual' | 'sequential';
  }>;
  confidence: number;
  reasoning: string;
}

// Note: All types are already exported through their interface declarations