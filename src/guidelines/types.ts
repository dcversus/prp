/**
 * ♫ Guidelines Types for @dcversus/prp
 *
 * Types for the configurable guidelines system with protocol-based signal resolution.
 */

import type { GuidelineProtocol, Signal } from '../shared/types';

// Import missing types from appropriate modules
import type { AgentRole } from '../config/agent-config';

// Re-export types that are used by other modules
export type { Signal } from '../shared/types';
export type { InspectorPayload } from '../inspector/types';

// Define GuidelineRequirement locally since it's missing
export interface GuidelineRequirement {
  type: 'feature' | 'service' | 'auth' | 'config' | 'command';
  name: string;
  description?: string;
  required: boolean;
  errorMessage?: string;
  check?: () => Promise<boolean>;
  dependencies?: string[];
  validation?: {
    type: 'file' | 'directory' | 'command' | 'api' | 'custom';
    pattern?: string;
    expected?: string | boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
  blockingIssues?: ValidationError[];
  recommendations?: ValidationError[];
  suggestions?: ValidationError[];
  passed?: boolean;
}

export interface GuidelineValidationResult extends ValidationResult {
  guidelineId: string;
  category?: string;
  severity: ValidationSeverity;
  dependencies?: {
    satisfied: string[];
    missing: string[];
    conflicting: string[];
  };
  score: number;
  metadata?: {
    validationTime: Date;
    validatorVersion: string;
    checklistPassed: string[];
    checklistFailed: string[];
  };
  suggestions?: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: ValidationSeverity;
  suggestion?: string;
  fixable?: boolean;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export const ValidationSeverity = {
  CRITICAL: 'critical' as const,
  HIGH: 'high' as const,
  MEDIUM: 'medium' as const,
  LOW: 'low' as const,
  INFO: 'info' as const
} as const;

export type ValidationSeverity = typeof ValidationSeverity[keyof typeof ValidationSeverity];

export interface GuidelineDefinition {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'testing' | 'deployment' | 'security' | 'performance' | 'documentation' | 'communication';
  priority: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  language: string; // Language code: 'EN', 'DE', 'SC', etc.
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
    filePath?: string; // Path to the guideline file
    language: string; // Language code
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
  languages: Map<string, Set<string>>; // language -> guideline IDs
  filePaths: Map<string, string>; // guideline ID -> file path
}

export interface LanguageSpecificGuideline {
  language: string;
  guidelinePath: string;
  fallbackLanguage?: string; // Fallback language if translation not available
  isDefault: boolean; // Whether this is the default language for this guideline
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
  type: 'inspector_analysis' | 'orchestrator_decision' | 'action_execution' | 'verification' | 'agent_action';
  required: boolean;
  dependencies?: string[];
  parameters?: Record<string, unknown>;
  outputs?: string[]; // Expected outputs from this step
  nextSteps?: string[]; // Next step IDs to execute
}

// Validation interfaces - Note: ValidationResult and ValidationError defined above

// Dependency management interfaces
export interface DependencyGraph {
  nodes: Map<string, GuidelineDefinition>;
  edges: Map<string, Set<string>>; // guideline -> dependencies
  circularDependencies: string[];
  missingDependencies: string[];
}

// Quality Gates interfaces
export interface QualityGate {
  id: string;
  name: string;
  description: string;
  criteria: QualityCriteria[];
  thresholds: QualityThresholds;
  enabled: boolean;
}

export interface QualityCriteria {
  id: string;
  name: string;
  description: string;
  type: 'automated' | 'manual' | 'hybrid';
  weight: number; // 0-1, importance in overall score
  validator: (guideline: GuidelineDefinition) => Promise<ValidationResult>;
}

export interface QualityThresholds {
  minimumScore: number; // 0-100
  criticalIssuesAllowed: number;
  warningsAllowed: number;
  maxTokenUsage: number;
  minTestCoverage: number; // 0-100
}

// Research templates interfaces
export interface ResearchTemplate {
  id: string;
  name: string;
  description: string;
  category: 'competitor' | 'market' | 'technical' | 'user' | 'trend';
  template: string;
  variables: ResearchVariable[];
  methodology: ResearchMethodology;
  outputs: ResearchOutput[];
}

export interface ResearchVariable {
  name: string;
  type: 'text' | 'url' | 'file' | 'data' | 'boolean';
  required: boolean;
  description: string;
  source?: string;
  validation?: ValidationRule;
}

export interface ResearchMethodology {
  approach: 'qualitative' | 'quantitative' | 'mixed';
  dataCollection: string[];
  analysisMethods: string[];
  timeline?: string;
  tools?: string[];
}

export interface ResearchOutput {
  type: 'report' | 'analysis' | 'recommendations' | 'action_items' | 'metrics';
  format: 'markdown' | 'json' | 'structured';
  template?: string;
  validationCriteria?: string[];
}

// Notes system interfaces
export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  pattern: SignalPattern; // Signal pattern that triggers this note
  context?: NoteContext;
  metadata: NoteMetadata;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface NoteContext {
  triggerSignals: string[];
  relevantPRPs: string[];
  agentContext: string[];
  environmentalFactors: string[];
  prerequisites: string[];
}

export interface NoteMetadata {
  author: string;
  reviewer?: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidentiality: 'public' | 'internal' | 'confidential';
  relatedGuidelines: string[];
  relatedPatterns: string[];
  lastUsed?: Date;
  usageCount: number;
}

// Base flow interfaces
export interface BaseFlowTemplate {
  id: string;
  name: string;
  description: string;
  phase: 'create-prp' | 'analyse' | 'plan' | 'implement' | 'test' | 'review' | 'release' | 'reflect';
  steps: FlowStep[];
  entryCriteria: FlowCriteria[];
  exitCriteria: FlowCriteria[];
  successMetrics: FlowMetric[];
  dependencies: string[]; // Other flows or guidelines
}

export interface FlowStep {
  id: string;
  name: string;
  description: string;
  type: 'action' | 'decision' | 'validation' | 'communication';
  required: boolean;
  sequential: boolean;
  parallelWith?: string[]; // Step IDs that can run in parallel
  triggers: SignalPattern[];
  outputs: FlowOutput[];
  estimatedDuration?: number; // minutes
  resources: string[]; // Tools, agents, external resources
}

export interface FlowCriteria {
  id: string;
  name: string;
  description: string;
  type: 'must_have' | 'should_have' | 'could_have' | 'wont_have'; // MoSCoW
  validator: (context: FlowContext) => Promise<boolean>;
  errorMessage?: string;
}

export interface FlowMetric {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'number' | 'percentage' | 'time' | 'quality_score';
  target: unknown;
  measurement: string;
  frequency: 'once' | 'per_step' | 'continuous';
}

export interface FlowOutput {
  type: 'signal' | 'artifact' | 'state_change' | 'message' | 'tool_result';
  name: string;
  description: string;
  format: string;
  required: boolean;
}

export interface FlowContext {
  phase: string;
  step: string;
  inputs: Record<string, unknown>;
  environment: EnvironmentInfo;
  agentContext: AgentStatusInfo[];
  previousOutputs: unknown[];
  metadata: Record<string, unknown>;
}