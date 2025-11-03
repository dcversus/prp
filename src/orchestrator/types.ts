/**
 * ♫ Orchestrator Layer Types for @dcversus/prp
 *
 * Types for the decision-making layer - LLM-based orchestration with tools
 * and agent coordination capabilities.
 */

import { AgentConfig, AgentRole, Signal } from '../shared/types';
import { InspectorPayload, Recommendation } from '../shared/types';

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
export type AgentCapabilities = import('../config/agent-config.js').AgentCapabilities;

export interface DecisionRecord {
  id: string;
  timestamp: Date;
  payload: InspectorPayload;
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
  type: 'spawn_agent' | 'send_message' | 'execute_command' | 'call_tool' | 'create_note' | 'update_prp' | 'create_signal' | 'wait' | 'escalate';
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
  originalPayload: InspectorPayload;
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
  toolUsage: Record<string, {
    calls: number;
    successRate: number;
    averageTime: number;
  }>;
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
  type: 'decision_error' | 'agent_error' | 'tool_error' | 'timeout_error' | 'context_error' | 'system_error';
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
  payload: InspectorPayload;
  timestamp: Date;
}

export interface OrchestratorDecisionStartedEvent {
  decisionId: string;
  payload: InspectorPayload;
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