/**
 * ♫ Inspector Layer Types for @dcversus/prp
 *
 * Types for the analysis layer - GPT-5 mini classification and signal preparation.
 */

import { Signal, GuidelineConfig, AgentRole } from '../shared/types';

// Enhanced type definitions for better type safety
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  enum?: string[] | number[] | boolean[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ContextData {
  signalContent?: string;
  agentContext?: Record<string, unknown>;
  worktreeState?: Record<string, unknown>;
  relevantFiles?: Array<{
    path: string;
    content: string;
    lastModified: Date;
  }>;
  environment?: Record<string, string | number | boolean>;
}

export interface EventData {
  type: string;
  payload?: unknown;
  timestamp: Date;
  source: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Forward declarations for types that will be defined in shared/types.ts
export interface SignalClassification {
  category: string;
  subcategory: string;
  priority: number;
  agentRole: AgentRole;
  escalationLevel: number;
  deadline: Date;
  dependencies: string[];
  confidence: number;
}

export interface Recommendation {
  type: string;
  priority: string;
  description: string;
  estimatedTime: number;
  prerequisites: string[];
}

export interface PreparedContext {
  id: string;
  signalId: string;
  content: ContextData;
  size: number;
  compressed: boolean;
  tokenCount: number;
}

export interface InspectorPayload {
  id: string;
  signalId: string;
  classification: SignalClassification;
  context: PreparedContext;
  recommendations: Recommendation[];
  timestamp: Date;
  size: number;
  compressed: boolean;
}

export interface SignalProcessor {
  signal: Signal;
  guideline: string;
  context: ContextData | ProcessingContext;
  priority: number;
  createdAt: Date;
}

export interface InspectorEvent {
  type: string;
  timestamp: Date;
  data: EventData;
}

export interface InspectorConfig {
  model: string; // GPT-5 mini
  maxTokens: number;
  temperature: number;
  timeout: number; // milliseconds
  batchSize: number;
  maxConcurrentClassifications: number;
  tokenLimits: {
    input: number;
    output: number;
    total: number;
  };
  prompts: {
    classification: string;
    contextPreparation: string;
    recommendationGeneration: string;
  };
  structuredOutput: StructuredOutputConfig;
}

export interface StructuredOutputConfig {
  enabled: boolean;
  schema: JSONSchema;
  validation: boolean;
  fallbackToText: boolean;
}

export interface InspectorState {
  status: 'idle' | 'processing' | 'busy' | 'error';
  currentBatch?: string;
  queue: Signal[];
  processing: Map<string, InspectorProcessing>;
  completed: Map<string, DetailedInspectorResult>;
  failed: Map<string, InspectorError>;
  metrics: InspectorMetrics;
  lastError?: InspectorError;
}

export interface InspectorProcessing {
  id: string;
  signal: Signal;
  startedAt: Date;
  context?: ProcessingContext;
  guideline?: GuidelineConfig;
  status: 'analyzing' | 'classifying' | 'preparing_context' | 'generating_payload' | 'completed' | 'failed';
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

export interface InspectorResult {
  id: string;
  signal: Signal;
  classification?: SignalClassification;
  context?: PreparedContext;
  payload?: InspectorPayload;
  recommendations?: Recommendation[];
  processingTime: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  model?: string;
  timestamp: Date;
  confidence?: number;
  success: boolean;
  error?: string;
}

export interface DetailedInspectorResult {
  id: string;
  signal: Signal;
  classification: SignalClassification;
  context: PreparedContext;
  payload: InspectorPayload;
  recommendations: Recommendation[];
  processingTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  model: string;
  timestamp: Date;
  confidence: number;
}

export interface InspectorError {
  id: string;
  signal: Signal;
  error: {
    code: string;
    message: string;
    details?: EventData;
    stack?: string;
  };
  processingTime: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  timestamp: Date;
  retryCount: number;
  recoverable: boolean;
}

export interface ProcessingContext {
  signalId: string;
  worktree?: string;
  agent?: string;
  relatedSignals: Signal[];
  activePRPs: string[];
  recentActivity: ActivityEntry[];
  tokenStatus: TokenStatusInfo;
  agentStatus: AgentStatusInfo[];
  sharedNotes: SharedNoteInfo[];
  environment: EnvironmentInfo | Record<string, string | number | boolean>;
  guidelineContext: GuidelineContext;
  historicalData: HistoricalData;
}

export interface ActivityEntry {
  timestamp: Date;
  actor: string;
  action: string;
  details: string;
  relevantTo: string[];
  priority: number;
}

export interface TokenStatusInfo {
  totalUsed: number;
  totalLimit: number;
  approachingLimit: boolean;
  criticalLimit: boolean;
  agentBreakdown: Record<string, {
    used: number;
    limit: number;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical';
  }>;
  projections: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface AgentStatusInfo {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  lastActivity: Date;
  capabilities: {
    supportsTools: boolean;
    supportsImages: boolean;
    supportsSubAgents: boolean;
    supportsParallel: boolean;
    maxContextLength: number;
  };
  performance: {
    tasksCompleted: number;
    averageTaskTime: number;
    errorRate: number;
  };
}

export interface SharedNoteInfo {
  id: string;
  name: string;
  pattern: string;
  content: string;
  lastModified: Date;
  tags: string[];
  relevantTo: string[];
  priority: number;
  wordCount: number;
  readingTime: number;
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
    maxFileSize?: number;
  };
  recentChanges: {
    count: number;
    types: Record<string, number>;
    lastChange: Date;
  };
}

export interface GuidelineContext {
  applicableGuidelines: string[];
  enabledGuidelines: string[];
  disabledGuidelines: string[];
  protocolSteps: Record<string, {
    id: string;
    name: string;
    status: string;
    completed: boolean;
  }>;
  requirements: {
    met: string[];
    unmet: string[];
    blocked: string[];
  };
}

export interface HistoricalData {
  similarSignals: Array<{
    signal: Signal;
    outcome: string;
    processingTime: number;
    recommendations: string[];
    timestamp: Date;
  }>;
  agentPerformance: Record<string, {
    successRate: number;
    averageTime: number;
    preferredTasks: string[];
  }>;
  systemPerformance: {
    averageProcessingTime: number;
    successRate: number;
    tokenEfficiency: number;
  };
  recentPatterns: Array<{
    pattern: string;
    frequency: number;
    lastOccurrence: Date;
    typicalResolution: string;
  }>;
}

export interface ClassificationRequest {
  id: string;
  signal: Signal;
  context: ProcessingContext;
  guidelines: GuidelineConfig[];
  requirements: ClassificationRequirements;
}

export interface ClassificationRequirements {
  categories: string[];
  urgencyLevels: string[];
  agentRoles: AgentRole[];
  specialCases: string[];
  customRules: ClassificationRule[];
}

export interface ClassificationRule {
  id: string;
  name: string;
  condition: string;
  category: string;
  urgency: string;
  agentRole: string;
  priority: number;
  confidence: number;
}

export interface PayloadGenerationRequest {
  id: string;
  classification: SignalClassification;
  context: ProcessingContext;
  guidelines: GuidelineConfig[];
  targetSize: number; // Target token count (~40k)
  compressionLevel: 'low' | 'medium' | 'high';
  includeSections: PayloadSection[];
}

export interface PayloadSection {
  id: string;
  name: string;
  description: string;
  required: boolean;
  maxSize: number; // tokens
  priority: number;
  content?: ContextData;
}

export interface InspectorMetrics {
  startTime: Date;
  totalProcessed: number;
  successfulClassifications: number;
  failedClassifications: number;
  averageProcessingTime: number;
  averageTokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  successRate: number;
  tokenEfficiency: number;
  queueLength: number;
  processingRate: number; // signals per minute
  errorRate: number;
  byCategory: Record<string, {
    count: number;
    averageTime: number;
    successRate: number;
  }>;
  byUrgency: Record<string, {
    count: number;
    averageTime: number;
    tokenUsage: number;
  }>;
  performance: {
    fastestClassification: number;
    slowestClassification: number;
    peakThroughput: number;
    memoryUsage: number;
  };
}

export interface InspectorBatch {
  id: string;
  signals: Signal[];
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: DetailedInspectorResult[];
  errors: InspectorError[];
  processingTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  summary: {
    totalSignals: number;
    successful: number;
    failed: number;
    averageConfidence: number;
  };
}

export interface ModelResponse {
  id: string;
  model: string;
  prompt: string;
  response: EventData;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  timestamp: Date;
  processingTime: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: string | number | boolean | Array<unknown> | Record<string, unknown>;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'enum' | 'range';
  value?: string | number | boolean | Array<string | number> | Record<string, unknown>;
  message?: string;
}

export interface CacheEntry {
  id: string;
  key: string;
  data: EventData;
  timestamp: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // bytes
}

// Event types
export interface InspectorSignalReceivedEvent {
  signal: Signal;
  timestamp: Date;
}

export interface InspectorProcessingStartedEvent {
  processingId: string;
  signal: Signal;
  context: ProcessingContext;
}

export interface InspectorClassificationCompletedEvent {
  processingId: string;
  classification: SignalClassification;
  confidence: number;
}

export interface InspectorPayloadGeneratedEvent {
  processingId: string;
  payload: InspectorPayload;
  tokenCount: number;
}

export interface InspectorProcessingCompletedEvent {
  processingId: string;
  result: DetailedInspectorResult;
  processingTime: number;
}

export interface InspectorProcessingFailedEvent {
  processingId: string;
  error: InspectorError;
  retryCount: number;
}

export interface InspectorBatchCompletedEvent {
  batchId: string;
  results: DetailedInspectorResult[];
  summary: EventData;
}