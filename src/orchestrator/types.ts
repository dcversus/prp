/**
 * ♫ Orchestrator Layer Types for @dcversus/prp
 *
 * Types for the decision-making layer - LLM-based orchestration with tools
 * and agent coordination capabilities.
 */
import { InspectorPayload } from '../shared/types';

import type { AgentConfig, AgentRole, Signal, PRPFile , Recommendation } from '../shared/types';
import type { InspectorPayload as InspectorPayloadType } from '../inspector/types';

export interface OrchestratorConfig {
  model: string; // GPT-5
  maxTokens: number;
  temperature: number;
  timeout: number; // milliseconds
  maxConcurrentDecisions: number;
  maxChainOfThoughtDepth: number;
  contextPreservation: ContextPreservationConfig;
  tools: ToolConfig[];
  agents: AgentManagementConfig;
  prompts: OrchestratorPrompts;
  decisionThresholds: DecisionThresholds;
  self?: SelfConfig;
}
export interface ContextPreservationConfig {
  enabled: boolean;
  maxContextSize: number;
  compressionStrategy: 'summarize' | 'truncate' | 'semantic';
  preserveElements: string[];
  compressionRatio: number; // 0-1, how much to compress
  importantSignals: string[]; // Signals to always preserve
}
export interface ToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  parameters: ToolParameters;
  required: boolean;
  category: 'file' | 'git' | 'system' | 'network' | 'database' | 'agent';
  permissions: string[];
  rateLimit?: {
    callsPerMinute: number;
    cooldownMs: number;
  };
}
export interface ToolParameters {
  type: 'object';
  properties: Record<string, ParameterDefinition>;
  required: string[];
}
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
}
export interface AgentManagementConfig {
  maxActiveAgents: number;
  defaultTimeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  parallelExecution: boolean;
  loadBalancing: 'round_robin' | 'least_busy' | 'priority';
  healthCheckInterval: number; // milliseconds
}
export interface OrchestratorPrompts {
  systemPrompt: string;
  decisionMaking: string;
  chainOfThought: string;
  toolSelection: string;
  agentCoordination: string;
  checkpointEvaluation: string;
  errorHandling: string;
  contextUpdate: string;
}
export interface DecisionThresholds {
  confidence: number; // Minimum confidence for auto-approval
  tokenUsage: number; // Maximum tokens per decision
  processingTime: number; // Maximum processing time in milliseconds
  agentResponse: number; // Maximum time to wait for agent response
  errorRate: number; // Maximum acceptable error rate
}
export interface SelfConfig {
  enabled: boolean;
  identity: string; // Raw self string from CLI
  selfName?: string; // Extracted from self reasoning
  selfSummary?: string; // Extracted from self reasoning
  selfGoal?: string; // Extracted from self reasoning
  lastUpdated?: Date;
}
export interface OrchestratorState {
  status: 'idle' | 'thinking' | 'deciding' | 'coordinating' | 'executing' | 'error' | 'stopped';
  currentDecision?: string;
  activeAgents: Map<string, AgentSession>;
  decisionHistory: DecisionRecord[];
  contextMemory: ContextMemory;
  chainOfThought: ChainOfThoughtState;
  metrics: OrchestratorMetrics;
  lastError?: OrchestratorError;
  lastActivity?: Date;
  processingCount?: number;
  sharedContext?: {
    warzone: {
      blockers: string[];
      completed: string[];
      next: string[];
    };
    systemMetrics: {
      tokensUsed: number;
      activeAgents: number;
      processingSignals: number;
    };
  };
}
export interface AgentSession {
  id: string;
  agentId: string;
  agentConfig: AgentConfig;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: AgentTask;
  lastActivity: Date;
  tokenUsage: {
    total: number;
    cost: number;
    lastUpdated: Date;
  };
  performance: {
    tasksCompleted: number;
    averageTaskTime: number;
    successRate: number;
    errorCount: number;
  };
  capabilities: AgentCapabilities;
}
export interface AgentTask {
  id: string;
  type: string;
  description: string;
  priority: number;
  payload: unknown;
  assignedAt: Date;
  deadline?: Date;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}
// AgentCapabilities is imported from config/agent-config.ts to avoid duplication
export type AgentCapabilities = import('../config/agent-config').AgentCapabilities;
export interface DecisionRecord {
  id: string;
  timestamp: Date;
  payload: InspectorPayloadType;
  decision: OrchestratorDecision;
  reasoning: ChainOfThoughtResult;
  actions: ActionResult[];
  outcome: DecisionOutcome;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  processingTime: number;
  confidence: number;
  agentsInvolved: string[];
  checkpoints: CheckpointResult[];
}
export interface OrchestratorDecision {
  id: string;
  type: 'analyze' | 'coordinate' | 'execute' | 'delegate' | 'escalate' | 'wait';
  priority: number;
  reasoning: string;
  confidence: number;
  actions: DecisionAction[];
  agents: AgentAssignment[];
  tools: ToolUsage[];
  checkpoints: CheckpointDefinition[];
  estimatedDuration: number;
  tokenEstimate: number;
}
export interface DecisionAction {
  id: string;
  type:
    | 'spawn_agent'
    | 'send_message'
    | 'execute_command'
    | 'call_tool'
    | 'create_note'
    | 'update_prp'
    | 'create_signal'
    | 'wait'
    | 'escalate';
  description: string;
  payload: unknown;
  priority: number;
  dependencies: string[];
  expectedOutcome: string;
  timeout?: number;
  retryCount?: number;
}
export interface AgentAssignment {
  agentId: string;
  role: AgentRole;
  task: string;
  instructions: string;
  context: unknown;
  tools: string[];
  priority: number;
  estimatedDuration: number;
}
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  parameters: Record<string, ParameterDefinition>;
  execute: (params: unknown) => Promise<ToolResult>;
  permissions?: string[];
  rateLimit?: {
    callsPerMinute: number;
    cooldownMs: number;
  };
}
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  tokenUsage?: number;
  executionTime: number;
}
export interface ToolUsage {
  toolName: string;
  parameters: unknown;
  result?: unknown;
  error?: string;
  executionTime: number;
  tokenUsage?: number;
}
export interface CheckpointDefinition {
  id: string;
  name: string;
  description: string;
  type: 'success_criteria' | 'milestone' | 'decision_point' | 'verification';
  criteria: string[];
  evidence: string[];
  required: boolean;
  timeout?: number;
}
export interface ChainOfThought {
  id: string;
  steps: CoTStep[];
  decision?: {
    blockers?: string[];
    completed?: string[];
    next?: string[];
    actions?: Array<{
      type: string;
      agentType?: string;
      task?: string;
      priority?: number;
      context?: unknown;
      signalType?: string;
      message?: string;
      channel?: string;
      data?: unknown;
    }>;
  };
  tokenUsage: number;
  context: unknown;
}
export interface ChainOfThoughtState {
  id: string;
  depth: number;
  currentStep: number;
  steps: CoTStep[];
  context: CoTContext;
  status: 'active' | 'completed' | 'failed' | 'paused';
}
export interface CoTStep {
  id: string;
  type?: 'analyze' | 'consider' | 'decide' | 'verify' | 'iterate';
  content?: string;
  reasoning?: string;
  alternatives?: string[];
  decision?: string;
  confidence?: number;
  toolCall?: {
    toolName: string;
    parameters: unknown;
  };
  timestamp: Date;
}
export interface CoTContext {
  originalPayload: InspectorPayloadType;
  signals: Signal[];
  activeGuidelines: string[];
  availableAgents: string[];
  systemState: unknown;
  previousDecisions: DecisionRecord[];
  constraints: unknown[];
}
export interface ChainOfThoughtResult {
  reasoning: string;
  steps: CoTStep[];
  decision: string;
  confidence: number;
  alternatives: string[];
  risks: string[];
  nextSteps: string[];
}
export interface ActionResult {
  id: string;
  actionId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  tokenUsage?: number;
  agentId?: string;
}
export interface DecisionOutcome {
  success: boolean;
  summary: string;
  achievedGoals: string[];
  blockedItems: string[];
  nextActions: string[];
  recommendations: Recommendation[];
  lessons: string[];
  metrics: {
    decisionsMade: number;
    agentsCoordinated: number;
    toolsUsed: number;
    tokenConsumed: number;
    timeSpent: number;
  };
}
export interface CheckpointResult {
  checkpointId: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  evidence: unknown[];
  notes?: string;
  timestamp: Date;
  agentId?: string;
}
export interface ContextMemory {
  signals: Map<string, Signal>;
  decisions: Map<string, DecisionRecord>;
  agentStates: Map<string, AgentSession>;
  systemMetrics: Map<string, unknown>;
  conversationHistory: ConversationTurn[];
  sharedNotes: Map<string, SharedNote>;
  lastUpdate: Date;
  size: number; // tokens
  maxSize: number;
}
export interface ConversationTurn {
  id: string;
  timestamp: Date;
  speaker: 'orchestrator' | 'agent' | 'user';
  content: string;
  type: 'decision' | 'request' | 'response' | 'notification';
  metadata?: unknown;
}
export interface SharedNote {
  id: string;
  name: string;
  content: string;
  pattern: string;
  relevanceScore: number;
  lastUsed: Date;
  tags: string[];
  referencedBy: string[]; // decision IDs, signal IDs
}
export interface OrchestratorMetrics {
  startTime: Date;
  totalDecisions: number;
  successfulDecisions: number;
  failedDecisions: number;
  averageDecisionTime: number;
  averageTokenUsage: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  agentUtilization: {
    active: number;
    total: number;
    averageTasksPerAgent: number;
    successRate: number;
  };
  toolUsage: Record<
    string,
    {
      calls: number;
      successRate: number;
      averageTime: number;
    }
  >;
  checkpointStats: {
    total: number;
    passed: number;
    failed: number;
    averageTime: number;
  };
  chainOfThoughtStats: {
    averageDepth: number;
    averageTime: number;
    successRate: number;
  };
}
export interface OrchestratorError {
  id: string;
  type:
    | 'decision_error'
    | 'agent_error'
    | 'tool_error'
    | 'timeout_error'
    | 'context_error'
    | 'system_error';
  message: string;
  details?: unknown;
  stack?: string;
  decisionId?: string;
  agentId?: string;
  toolName?: string;
  timestamp: Date;
  recoverable: boolean;
  suggestions: string[];
}
export interface ExecutionPlan {
  id: string;
  decisionId: string;
  steps: ExecutionStep[];
  dependencies: Map<string, string[]>; // stepId -> dependencies
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  progress: number; // 0-100
}
export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  type: 'agent_task' | 'tool_call' | 'decision' | 'wait' | 'verification';
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  assignedTo?: string; // agent ID or tool name
  payload?: unknown;
  result?: unknown;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  tokenUsage?: number;
  retryCount: number;
  maxRetries: number;
}
// Event types
export interface OrchestratorPayloadReceivedEvent {
  payload: InspectorPayloadType;
  timestamp: Date;
}
export interface OrchestratorDecisionStartedEvent {
  decisionId: string;
  payload: InspectorPayloadType;
  timestamp: Date;
}
export interface OrchestratorDecisionCompletedEvent {
  decisionId: string;
  decision: OrchestratorDecision;
  outcome: DecisionOutcome;
  timestamp: Date;
}
export interface OrchestratorAgentTaskAssignedEvent {
  agentId: string;
  taskId: string;
  task: AgentTask;
  timestamp: Date;
}
export interface OrchestratorAgentTaskCompletedEvent {
  agentId: string;
  taskId: string;
  result: unknown;
  timestamp: Date;
}
export interface OrchestratorCheckpointReachedEvent {
  checkpointId: string;
  result: CheckpointResult;
  timestamp: Date;
}
export interface OrchestratorErrorEvent {
  error: OrchestratorError;
  timestamp: Date;
}
export interface OrchestratorChainOfThoughtUpdateEvent {
  decisionId: string;
  step: CoTStep;
  timestamp: Date;
}
export interface OrchestratorContextUpdateEvent {
  updates: {
    signals?: Signal[];
    decisions?: DecisionRecord[];
    notes?: SharedNote[];
  };
  timestamp: Date;
}
// ===== ENHANCED CONTEXT SYSTEM TYPES =====
// Context aggregation strategies
export enum AggregationStrategy {
  MERGE = 'merge',
  PRIORITY_BASED = 'priority_based',
  TOKEN_OPTIMIZED = 'token_optimized',
  RELEVANCE_SCORED = 'relevance_scored',
}
// PRP section types for extraction
export enum PRPSectionType {
  GOAL = 'goal',
  PROGRESS = 'progress',
  PLAN = 'plan',
  DOR = 'dor',
  DOD = 'dod',
  SIGNALS = 'signals',
  RESEARCH = 'research',
  IMPLEMENTATION = 'implementation',
}
// Context types for sharing
export enum ContextType {
  PRP_CONTEXT = 'prp_context',
  AGENT_STATUS = 'agent_status',
  SHARED_MEMORY = 'shared_memory',
  SIGNAL_HISTORY = 'signal_history',
  TOOL_CONTEXT = 'tool_context',
}
// Enhanced context section with metadata
export interface EnhancedContextSection {
  id: string;
  name: string;
  content: string;
  tokens: number;
  priority: number;
  required: boolean;
  compressible: boolean;
  lastUpdated: Date;
  source: string;
  version: number;
  tags: string[];
  permissions: string[];
  dependencies: string[];
  relevanceScore?: number;
  lastAccessed: Date;
  accessCount: number;
}
// Aggregated context from multiple PRPs
export interface AggregatedContext {
  id: string;
  sourcePRPs: string[];
  sections: EnhancedContextSection[];
  metadata: {
    aggregatedAt: Date;
    strategy: AggregationStrategy;
    totalTokens: number;
    compressionRatio: number;
  };
}
// Context conflict resolution
export interface ContextConflict {
  sectionId: string;
  conflictType: 'content' | 'priority' | 'permissions';
  conflictingSections: EnhancedContextSection[];
  resolution?: ConflictResolution;
}
export interface ConflictResolution {
  strategy: 'merge' | 'priority' | 'timestamp' | 'manual';
  resolvedSection: EnhancedContextSection;
  resolvedAt: Date;
}
// Agent context sharing
export interface ContextSession {
  id: string;
  participants: string[];
  sharedContexts: Map<string, EnhancedContextSection>;
  createdAt: Date;
  lastActivity: Date;
}
// Dynamic context updates
export interface ContextUpdate {
  contextId: string;
  updateType: 'create' | 'update' | 'delete';
  section: EnhancedContextSection;
  timestamp: Date;
  source: string;
}
export type UpdateCallback = (update: ContextUpdate) => Promise<void>;
export interface Subscription {
  id: string;
  contextId: string;
  callback: UpdateCallback;
  createdAt: Date;
  active: boolean;
}
export interface SyncResult {
  success: boolean;
  syncedContexts: string[];
  conflicts: ContextConflict[];
  errors: string[];
}
// PRP parsing results
export interface ParsedPRP {
  id: string;
  sections: Map<PRPSectionType, string>;
  metadata: {
    parsedAt: Date;
    sectionCount: number;
    totalTokens: number;
  };
}
export interface SignalEntry {
  signal: Signal;
  timestamp: Date;
  context: string;
  agent?: string;
}
// Context aggregation interfaces
export interface ContextAggregator {
  aggregateContexts(prpIds: string[], strategy: AggregationStrategy): Promise<AggregatedContext>;
  mergeContexts(contexts: EnhancedContextSection[]): EnhancedContextSection[];
  resolveConflicts(conflicts: ContextConflict[]): Promise<ConflictResolution[]>;
  calculateRelevanceScore(section: EnhancedContextSection, signal: Signal): number;
}
// PRP section extraction interfaces
export interface PRPSectionExtractor {
  extractSection(prp: PRPFile, sectionType: PRPSectionType): Promise<EnhancedContextSection>;
  parsePRPStructure(content: string): Promise<ParsedPRP>;
  extractSignalHistory(prp: PRPFile): Promise<SignalEntry[]>;
  extractRelevantSections(prp: PRPFile, signal: Signal): Promise<EnhancedContextSection[]>;
}
// Dynamic context update interfaces
export interface DynamicContextUpdater {
  updateContext(contextId: string, updates: ContextUpdate): Promise<void>;
  subscribeToContextUpdates(contextId: string, callback: UpdateCallback): Promise<Subscription>;
  synchronizeContexts(contextIds: string[]): Promise<SyncResult>;
  broadcastUpdate(update: ContextUpdate): Promise<void>;
}
// Agent context broker interfaces
// Enhanced context manager interface
export interface EnhancedContextManager {
  getContext(signalId: string): Promise<EnhancedContextSection | null>;
  updateContext(signalId: string, context: EnhancedContextSection): Promise<void>;
  deleteContext(signalId: string): Promise<void>;
  optimizeContexts(contextIds: string[]): Promise<EnhancedContextSection[]>;
  mergeContexts(contexts: EnhancedContextSection[]): Promise<EnhancedContextSection>;
}
export interface AgentContextBroker {
  shareContext(fromAgent: string, toAgent: string, context: EnhancedContextSection): Promise<void>;
  requestContext(agent: string, contextType: ContextType): Promise<EnhancedContextSection>;
  establishContextSession(participants: string[]): Promise<ContextSession>;
}
