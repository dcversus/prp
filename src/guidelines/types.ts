/**
 * ♫ Guidelines Types for @dcversus/prp
 *
 * Types for the configurable guidelines system with protocol-based signal resolution.
 */

import type { GuidelineProtocol, GuidelineRequirement, AgentRole, Signal } from '../shared/types';

// Re-export types that are used by other modules
export type { Signal, InspectorPayload } from '../shared/types';

export interface GuidelineDefinition {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'testing' | 'deployment' | 'security' | 'performance' | 'documentation' | 'communication';
  priority: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  protocol: GuidelineProtocol;
  requirements: GuidelineRequirement[];
  prompts: {
    inspector: string;
    orchestrator: string;
  };
  tokenLimits: {
    inspector: number;
    orchestrator: number;
  };
  tools: string[];
  customLogic?: string; // JavaScript code for custom logic
  metadata: {
    version: string;
    author: string;
    createdAt: Date;
    lastModified: Date;
    tags: string[];
    dependencies: string[]; // Other guidelines this depends on
  };
}

export interface GuidelineContext {
  guidelineId: string;
  executionId: string;
  triggerSignal: Signal;
  worktree?: string;
  agent?: AgentRole;
  additionalContext: {
    activePRPs: string[];
    recentActivity: ActivityEntry[];
    tokenStatus: TokenStatusInfo;
    agentStatus: AgentStatusInfo[];
    sharedNotes: SharedNoteInfo[];
    environment: EnvironmentInfo;
  };
  configuration: GuidelineConfiguration;
}

export interface ActivityEntry {
  timestamp: Date;
  actor: string;
  action: string;
  details: string;
  relevantTo: string[]; // PRP IDs, signal IDs, etc.
}

export interface TokenStatusInfo {
  totalUsed: number;
  totalLimit: number;
  approachingLimit: boolean;
  criticalLimit: boolean;
  agentBreakdown: Record<string, { used: number; limit: number; percentage: number }>;
}

export interface AgentStatusInfo {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  lastActivity: Date;
  capabilities: AgentCapabilitiesInfo;
}

export interface AgentCapabilitiesInfo {
  supportsTools: boolean;
  supportsImages: boolean;
  supportsSubAgents: boolean;
  supportsParallel: boolean;
  maxContextLength: number;
  supportedModels: string[];
}

export interface SharedNoteInfo {
  id: string;
  name: string;
  pattern: string;
  lastModified: Date;
  tags: string[];
  relevantTo: string[];
}

export interface EnvironmentInfo {
  worktree: string;
  branch: string;
  availableTools: string[];
  systemCapabilities: string[];
  constraints: {
    memory?: number;
    diskSpace?: number;
    networkAccess?: boolean;
  };
}

export interface GuidelineConfiguration {
  enabled: boolean;
  settings: GuidelineSettings;
  requiredFeatures: string[];
  tokenLimits: {
    inspector: number;
    orchestrator: number;
  };
  customPrompts: {
    inspector?: string;
    orchestrator?: string;
  };
  executionSettings: {
    timeout: number; // milliseconds
    retryAttempts: number;
    parallelExecution: boolean;
    requireApproval: boolean;
  };
}

export interface GuidelineExecution {
  id: string;
  guidelineId: string;
  triggerSignal: Signal;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  context: GuidelineContext;
  steps: StepExecution[];
  result?: GuidelineResult;
  error?: ExecutionError;
  performance: {
    totalDuration: number;
    tokenUsage: {
      inspector: number;
      orchestrator: number;
      total: number;
    };
    stepBreakdown: Record<string, number>;
  };
}

export type ExecutionStatus =
  | 'pending'
  | 'preparing'
  | 'in_progress'
  | 'inspector_processing'
  | 'orchestrator_processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'awaiting_approval';

export interface StepExecution {
  stepId: string;
  name: string;
  description: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: ExecutionError;
  tokenUsage?: {
    input: number;
    output: number;
    cost: number;
  };
  artifacts: Artifact[];
  dependencies: string[]; // IDs of steps that must complete first
}

export type StepStatus =
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'blocked';

export interface Artifact {
  id: string;
  name: string;
  type: 'file' | 'directory' | 'data' | 'signal' | 'message' | 'tool_output';
  content?: unknown;
  path?: string;
  metadata: ArtifactMetadata;
  createdAt: Date;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
  stepId?: string;
  recoverable: boolean;
  suggestions: string[];
}

export interface GuidelineResult {
  success: boolean;
  outcome: string;
  signalsGenerated: Signal[];
  actionsTaken: Action[];
  checkpointsReached: CheckpointReached[];
  nextSteps: string[];
  recommendations: Recommendation[];
  artifacts: Artifact[];
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    skippedSteps: number;
    totalDuration: number;
    tokenCost: number;
  };
}

export interface Action {
  id: string;
  type: 'spawn_agent' | 'send_message' | 'execute_command' | 'create_note' | 'update_prp' | 'create_signal' | 'call_tool' | 'approve-pr' | 'request-changes' | 'add-comments' | 'create-review' | 'escalate';
  target?: string;
  payload: ActionPayload;
  reasoning: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  executedAt?: Date;
  // PR-related properties
  prNumber?: number;
  message?: string;
  issues?: string[];
  comments?: { path: string; line: number; body: string; }[];
  review?: PullRequestReview;
  reason?: string;
}

export interface CheckpointReached {
  checkpointId: string;
  name: string;
  reachedAt: Date;
  evidence: unknown;
  quality: 'passed' | 'warning' | 'failed';
  notes?: string;
}

export interface Recommendation {
  id: string;
  type: 'improvement' | 'optimization' | 'warning' | 'best_practice';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: string;
}

export interface SignalPattern {
  id: string;
  name: string;
  pattern: string | RegExp;
  category: string;
  priority: number;
  description: string;
  enabled: boolean;
  custom: boolean;
}

export interface GuidelineRegistry {
  guidelines: Map<string, GuidelineDefinition>;
  categories: Map<string, Set<string>>; // category -> guideline IDs
  dependencies: Map<string, Set<string>>; // guideline -> dependencies
  dependents: Map<string, Set<string>>; // guideline -> dependents
  signalMappings: Map<string, Set<string>>; // signal pattern -> guideline IDs
}

export interface InspectorPrompt {
  id: string;
  guidelineId: string;
  template: string;
  variables: PromptVariable[];
  tokenLimit: number;
  model: string;
  temperature: number;
  maxTokens: number;
  structuredOutput: StructuredOutputSchema;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: unknown;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'enum';
  value?: unknown;
  message?: string;
}

export interface StructuredOutputSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required: string[];
  additionalProperties: boolean;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: unknown[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

export interface OrchestratorPrompt {
  id: string;
  guidelineId: string;
  template: string;
  variables: PromptVariable[];
  tokenLimit: number;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: ToolDefinition[];
  chainOfThought: boolean;
  contextPreservation: ContextPreservationSettings;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameters;
  required: string[];
  enabled: boolean;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required: string[];
}

export interface ContextPreservationSettings {
  enabled: boolean;
  maxContextSize: number;
  compressionStrategy: 'summarize' | 'truncate' | 'semantic';
  preserveElements: string[]; // Elements to always preserve
}

export interface GuidelineMetrics {
  guidelineId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageTokenCost: number;
  lastExecuted?: Date;
  successRate: number;
  popularSteps: Record<string, number>;
  commonErrors: Record<string, number>;
}

export interface GuidelineTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  protocol: GuidelineProtocol;
  prompts: {
    inspector: string;
    orchestrator: string;
  };
  variables: TemplateVariable[];
  requirements: TemplateRequirement[];
  tags: string[];
}

export interface TemplateVariable {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface TemplateRequirement {
  type: 'feature' | 'service' | 'auth' | 'config' | 'tool';
  name: string;
  description: string;
  required: boolean;
  checkCommand?: string;
  errorMessage?: string;
}

// Event types
export interface GuidelineTriggeredEvent {
  guidelineId: string;
  executionId: string;
  triggerSignal: Signal;
  context: GuidelineContext;
}

export interface GuidelineCompletedEvent {
  executionId: string;
  guidelineId: string;
  result: GuidelineResult;
  performance: unknown;
}

export interface GuidelineFailedEvent {
  executionId: string;
  guidelineId: string;
  error: ExecutionError;
  context: GuidelineContext;
}

export interface GuidelineStepCompletedEvent {
  executionId: string;
  stepId: string;
  result: unknown;
  tokenUsage?: number;
}

export interface GuidelineApprovalRequiredEvent {
  executionId: string;
  guidelineId: string;
  stepId: string;
  reason: string;
  context: unknown;
  requires: string[]; // What needs approval
}

// Event interfaces for executor
export interface GuidelineTriggeredEventPayload {
  guidelineId: string;
  executionId: string;
  triggerSignal: Signal;
  context: GuidelineContext;
}

// Additional type definitions to replace 'any' types
export interface GuidelineSettings {
  [key: string]: string | number | boolean | string[] | Record<string, unknown>;
}

export interface ArtifactMetadata {
  [key: string]: string | number | boolean | Date | string[] | Record<string, unknown>;
}

export interface ActionPayload {
  [key: string]: string | number | boolean | string[] | Record<string, unknown>;
}

export interface PullRequestReview {
  id: number;
  user: {
    login: string;
    id: number;
  };
  body: string;
  state: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
  html_url: string;
  submitted_at?: string;
  commit_id: string;
}

export interface InspectorAnalysisResult {
  classification: {
    category: string;
    priority: number;
    severity: string;
  };
  issues: Array<{
    type: string;
    description: string;
    location?: string;
    impact: string;
  }>;
  recommendations: string[];
  implementation_analysis?: {
    code_quality: number;
    security: number;
    performance: number;
    [key: string]: number;
  };
}

export interface ClassificationResult {
  category: string;
  priority: number;
  severity: string;
  confidence: number;
  priorityIssues: Issue[];
  riskAssessment: Record<string, unknown>;
  nextActions: string[];
  overallPriority: string;
}

export interface Issue {
  id?: string;
  type: string;
  description: string;
  location?: string;
  impact: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file?: string;
  line_number?: number;
  suggested_fix?: string;
  category?: string;
}

export interface ActionParameters {
  [key: string]: unknown;
}

export interface StepDefinition {
  id: string;
  name: string;
  description: string;
  type: 'inspector_analysis' | 'orchestrator_decision' | 'action_execution' | 'verification';
  required: boolean;
  dependencies?: string[];
  parameters?: Record<string, unknown>;
}