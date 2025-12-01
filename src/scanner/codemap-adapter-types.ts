/**
 * ♫ Codemap Adapter Types for @dcversus/prp
 *
 * Comprehensive TypeScript types for codemap adapters ensuring type safety
 * across the system. Defines interfaces for codemap conversion, agent coordination,
 * and real-time updates.
 */

import { CodeAnalysisResult, FunctionInfo, ClassInfo } from './types';

import type { CodemapData, Position } from './types';

// ============================================================================
// INSPECTOR ADAPTER TYPES
// ============================================================================

/**
 * Inspector-specific query and filtering types
 */
export interface InspectorQueryOptions {
  files?: string[];
  functions?: string[];
  classes?: string[];
  patterns?: string[];
  complexityThreshold?: number;
  issueSeverity?: 'low' | 'medium' | 'high' | 'critical';
  languages?: string[];
  includeSignals?: boolean;
  includeIssues?: boolean;
  maxResults?: number;
  tokenOptimized?: boolean;
}

/**
 * Inspector function information with enhanced metadata
 */
export interface InspectorFunctionInfo {
  id: string;
  name: string;
  type: 'declaration' | 'expression' | 'arrow';
  file: string;
  position: Position;
  signature: string;
  complexity: {
    cyclomatic: number;
    cognitive: number;
    nestingDepth: number;
  };
  metrics: {
    size: number;
    parameterCount: number;
    isAsync: boolean;
    isExported: boolean;
  };
  signals: string[];
  issues: Array<{
    type: string;
    severity: string;
    message: string;
    position: Position;
  }>;
}

/**
 * Inspector class information with enhanced metadata
 */
export interface InspectorClassInfo {
  id: string;
  name: string;
  type: 'class' | 'interface' | 'abstract_class' | 'type';
  file: string;
  position: Position;
  size: number;
  methods: InspectorFunctionInfo[];
  properties: Array<{
    name: string;
    type?: string;
    visibility: 'public' | 'private' | 'protected';
    isStatic: boolean;
  }>;
  inheritance: string[];
  decorators: string[];
  signals: string[];
  issues: Array<{
    type: string;
    severity: string;
    message: string;
    position: Position;
  }>;
}

/**
 * Inspector file information with comprehensive metadata
 */
export interface InspectorFileInfo {
  id: string;
  path: string;
  language: string;
  size: number;
  linesOfCode: number;
  lastModified: Date;
  structure: {
    functions: InspectorFunctionInfo[];
    classes: InspectorClassInfo[];
    imports: Array<{
      source: string;
      imports: Array<{
        name: string;
        alias?: string;
        isDefault: boolean;
      }>;
      type: 'import' | 'require';
      position: Position;
    }>;
    exports: Array<{
      name: string;
      type: string;
      isDefault: boolean;
      position: Position;
    }>;
    variables: Array<{
      name: string;
      type?: string;
      isConst: boolean;
      isExported: boolean;
      position: Position;
    }>;
  };
  dependencies: Array<{
    module: string;
    type: 'import' | 'require';
    imports: Array<{
      name: string;
      alias?: string;
      isDefault: boolean;
    }>;
    isExternal: boolean;
    position: Position;
  }>;
  issues: Array<{
    type: 'style' | 'performance' | 'security' | 'complexity' | 'duplication';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    position: Position;
    suggestion?: string;
  }>;
  signals: string[];
  quality: {
    maintainabilityIndex: number;
    issueCount: number;
    complexityScore: number;
  };
}

/**
 * Complete inspector codemap summary
 */
export interface InspectorCodemapSummary {
  id: string;
  generatedAt: Date;
  rootPath: string;
  files: InspectorFileInfo[];
  metrics: {
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
    totalLines: number;
    averageComplexity: number;
    languageDistribution: Record<string, number>;
    issueCount: number;
    signalCount: number;
  };
  crossFileReferences: Array<{
    sourceFile: string;
    targetFile: string;
    type: 'function_call' | 'class_instantiation' | 'type_reference' | 'variable_reference';
    name: string;
    position: Position;
    targetPosition?: Position;
  }>;
  dependencies: Map<string, string[]>;
}

/**
 * Inspector query result with performance metrics
 */
export interface InspectorQueryResult {
  queryId: string;
  timestamp: Date;
  options: InspectorQueryOptions;
  results: {
    files: InspectorFileInfo[];
    functions: InspectorFunctionInfo[];
    classes: InspectorClassInfo[];
    issues: Array<{
      type: string;
      severity: string;
      message: string;
      position: Position;
    }>;
    signals: string[];
  };
  metrics: {
    totalResults: number;
    processingTime: number;
    tokenCount: number;
  };
}

// ============================================================================
// ORCHESTRATOR ADAPTER TYPES
// ============================================================================

/**
 * Agent capability definition
 */
export interface AgentCapability {
  id: string;
  name: string;
  fileTypes: string[];
  patterns: string[];
  functions: string[];
  classes: string[];
  dependencies: string[];
  expertise: string[];
}

/**
 * Agent workload tracking
 */
export interface AgentWorkload {
  agentId: string;
  agentType: string;
  assignedFiles: string[];
  estimatedComplexity: number;
  dependencies: string[];
  coordinationRequirements: string[];
  currentCapacity: number;
  maxCapacity: number;
}

/**
 * Orchestration task definition
 */
export interface OrchestrationTask {
  id: string;
  type: 'analysis' | 'development' | 'testing' | 'documentation' | 'deployment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  agentType: string;
  files: string[];
  requirements: string[];
  dependencies: string[];
  estimatedDuration: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'blocked';
  assignedAgent?: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agentType: string;
  inputFiles: string[];
  outputFiles: string[];
  dependencies: string[];
  estimatedDuration: number;
  parallelizable: boolean;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Complete orchestration plan
 */
export interface OrchestrationPlan {
  id: string;
  createdAt: Date;
  rootPath: string;
  tasks: OrchestrationTask[];
  workflow: WorkflowStep[];
  agentAssignments: Map<string, AgentWorkload>;
  dependencies: Map<string, string[]>;
  criticalPath: string[];
  estimatedTotalDuration: number;
  parallelizationOpportunities: string[];
}

/**
 * Agent-specific relevant information
 */
export interface AgentRelevantInfo {
  agentType: string;
  relevantFiles: Array<{
    path: string;
    relevance: number;
    complexity: number;
    signals: string[];
    issues: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
  }>;
  dependencies: Array<{
    source: string;
    target: string;
    type: string;
  }>;
  coordinationNeeds: Array<{
    type: 'shared_file' | 'dependency' | 'sequence' | 'resource';
    details: string;
    agents: string[];
  }>;
  estimatedWorkload: {
    files: number;
    complexity: number;
    duration: number;
  };
}

/**
 * Real-time update information
 */
export interface RealTimeUpdate {
  timestamp: Date;
  type: 'file_added' | 'file_modified' | 'file_deleted' | 'dependency_changed' | 'signal_detected';
  filePath: string;
  affectedAgents: string[];
  impact: {
    workload: number;
    dependencies: string[];
    coordination: string[];
  };
}

// ============================================================================
// UTILITY ADAPTER TYPES
// ============================================================================

/**
 * Codemap representation types
 */
export type CodemapRepresentation = 'full' | 'compact' | 'summary' | 'minimal';

/**
 * Code pattern definition
 */
export interface CodePattern {
  type: 'function' | 'class' | 'import' | 'export' | 'variable' | 'interface' | 'type';
  name: string;
  pattern: RegExp;
  description: string;
  category: string;
}

/**
 * Compact file information
 */
export interface CompactFileInfo {
  path: string;
  language: string;
  linesOfCode: number;
  complexity: number;
  functions: number;
  classes: number;
  issues: number;
  signals: string[];
}

/**
 * Compact function information
 */
export interface CompactFunctionInfo {
  name: string;
  file: string;
  complexity: number;
  line: number;
  signals: string[];
}

/**
 * Compact class information
 */
export interface CompactClassInfo {
  name: string;
  file: string;
  methods: number;
  properties: number;
  line: number;
  signals: string[];
}

/**
 * Complete codemap summary
 */
export interface CodemapSummary {
  id: string;
  generatedAt: Date;
  rootPath: string;
  representation: CodemapRepresentation;
  files: CompactFileInfo[];
  functions: CompactFunctionInfo[];
  classes: CompactClassInfo[];
  metrics: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    averageComplexity: number;
    issueCount: number;
    signalCount: number;
    languageDistribution: Record<string, number>;
  };
  dependencies: Array<{
    source: string;
    target: string;
    count: number;
  }>;
}

/**
 * Filter options for codemap operations
 */
export interface FilterOptions {
  filePatterns?: string[];
  languages?: string[];
  complexityRange?: { min: number; max: number };
  issueTypes?: string[];
  signalPatterns?: string[];
  includeSignals?: boolean;
  includeIssues?: boolean;
  maxResults?: number;
  sortBy?: 'name' | 'complexity' | 'size' | 'issues' | 'signals';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Extraction options for code patterns
 */
export interface ExtractionOptions {
  includePrivate?: boolean;
  includeInternal?: boolean;
  includeExported?: boolean;
  maxDepth?: number;
  includeSignatures?: boolean;
  includeMetadata?: boolean;
  tokenOptimized?: boolean;
}

/**
 * Search result entry
 */
export interface SearchResultEntry {
  type: string;
  file: string;
  name: string;
  line?: number;
  context?: string;
  relevance: number;
}

// ============================================================================
// COMMON ADAPTER TYPES
// ============================================================================

/**
 * Adapter configuration options
 */
export interface AdapterConfiguration {
  cacheTimeout: number;
  maxCacheSize: number;
  tokenOptimizationThreshold: number;
  parallelProcessing: boolean;
  realTimeUpdates: boolean;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Performance metrics for adapters
 */
export interface AdapterPerformanceMetrics {
  operationType: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  memoryUsage: number;
  tokenCount: number;
  cacheHitRate: number;
  errorCount: number;
}

/**
 * Adapter error information
 */
export interface AdapterError {
  id: string;
  timestamp: Date;
  adapterType: 'inspector' | 'orchestrator' | 'utility';
  operation: string;
  error: Error;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Adapter event types
 */
export interface AdapterEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  data: any;
  metadata: {
    priority: 'low' | 'medium' | 'high';
    category: string;
  };
}

/**
 * Adapter status information
 */
export interface AdapterStatus {
  adapterId: string;
  adapterType: 'inspector' | 'orchestrator' | 'utility';
  status: 'idle' | 'processing' | 'error' | 'maintenance';
  uptime: number;
  operationsProcessed: number;
  averageProcessingTime: number;
  cacheUtilization: number;
  memoryUtilization: number;
  lastError?: AdapterError;
  lastUpdate: Date;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * Cross-adapter data transfer object
 */
export interface CodemapTransferObject {
  version: string;
  timestamp: Date;
  source: CodemapData;
  inspector?: InspectorCodemapSummary;
  orchestrator?: OrchestrationPlan;
  utility?: CodemapSummary;
  metadata: {
    processingTime: number;
    tokenCount: number;
    adapters: string[];
  };
}

/**
 * Adapter coordination message
 */
export interface AdapterCoordinationMessage {
  id: string;
  timestamp: Date;
  sourceAdapter: 'inspector' | 'orchestrator' | 'utility';
  targetAdapter: 'inspector' | 'orchestrator' | 'utility' | 'all';
  messageType: 'data_update' | 'cache_invalidate' | 'configuration_change' | 'error_notification';
  payload: any;
  requiresResponse: boolean;
}

/**
 * Adapter registry information
 */
export interface AdapterRegistry {
  adapters: Map<
    string,
    {
      type: 'inspector' | 'orchestrator' | 'utility';
      instance: any;
      status: AdapterStatus;
      capabilities: string[];
    }
  >;
  coordinationHistory: AdapterCoordinationMessage[];
  performanceHistory: AdapterPerformanceMetrics[];
}

// ============================================================================
// TYPE GUARDS AND VALIDATION
// ============================================================================

/**
 * Type guard for InspectorQueryOptions
 */
export function isInspectorQueryOptions(obj: unknown): obj is InspectorQueryOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    (candidate.files === undefined || Array.isArray(candidate.files)) &&
    (candidate.functions === undefined || Array.isArray(candidate.functions)) &&
    (candidate.classes === undefined || Array.isArray(candidate.classes)) &&
    (candidate.patterns === undefined || Array.isArray(candidate.patterns)) &&
    (candidate.complexityThreshold === undefined || typeof candidate.complexityThreshold === 'number') &&
    (candidate.issueSeverity === undefined ||
      (typeof candidate.issueSeverity === 'string' &&
        ['low', 'medium', 'high', 'critical'].includes(candidate.issueSeverity))) &&
    (candidate.languages === undefined || Array.isArray(candidate.languages)) &&
    (candidate.includeSignals === undefined || typeof candidate.includeSignals === 'boolean') &&
    (candidate.includeIssues === undefined || typeof candidate.includeIssues === 'boolean') &&
    (candidate.maxResults === undefined || typeof candidate.maxResults === 'number') &&
    (candidate.tokenOptimized === undefined || typeof candidate.tokenOptimized === 'boolean')
  );
}

/**
 * Type guard for OrchestrationTask
 */
export function isOrchestrationTask(obj: unknown): obj is OrchestrationTask {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    ['analysis', 'development', 'testing', 'documentation', 'deployment'].includes(candidate.type) &&
    typeof candidate.priority === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(candidate.priority) &&
    typeof candidate.agentType === 'string' &&
    Array.isArray(candidate.files) &&
    Array.isArray(candidate.requirements) &&
    Array.isArray(candidate.dependencies) &&
    typeof candidate.estimatedDuration === 'number' &&
    typeof candidate.status === 'string' &&
    ['pending', 'assigned', 'in_progress', 'completed', 'blocked'].includes(candidate.status)
  );
}

/**
 * Type guard for AgentCapability
 */
export function isAgentCapability(obj: unknown): obj is AgentCapability {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.fileTypes) &&
    Array.isArray(candidate.patterns) &&
    Array.isArray(candidate.functions) &&
    Array.isArray(candidate.classes) &&
    Array.isArray(candidate.dependencies) &&
    Array.isArray(candidate.expertise)
  );
}

/**
 * Type guard for RealTimeUpdate
 */
export function isRealTimeUpdate(obj: unknown): obj is RealTimeUpdate {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    candidate.timestamp instanceof Date &&
    typeof candidate.type === 'string' &&
    [
      'file_added',
      'file_modified',
      'file_deleted',
      'dependency_changed',
      'signal_detected',
    ].includes(candidate.type) &&
    typeof candidate.filePath === 'string' &&
    Array.isArray(candidate.affectedAgents) &&
    typeof candidate.impact === 'object' &&
    candidate.impact !== null &&
    typeof (candidate.impact as Record<string, unknown>).workload === 'number' &&
    Array.isArray((candidate.impact as Record<string, unknown>).dependencies) &&
    Array.isArray((candidate.impact as Record<string, unknown>).coordination)
  );
}

/**
 * Type guard for FilterOptions
 */
export function isFilterOptions(obj: unknown): obj is FilterOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    (candidate.filePatterns === undefined || Array.isArray(candidate.filePatterns)) &&
    (candidate.languages === undefined || Array.isArray(candidate.languages)) &&
    (candidate.complexityRange === undefined ||
      (typeof candidate.complexityRange === 'object' &&
        candidate.complexityRange !== null &&
        typeof (candidate.complexityRange as Record<string, unknown>).min === 'number' &&
        typeof (candidate.complexityRange as Record<string, unknown>).max === 'number')) &&
    (candidate.issueTypes === undefined || Array.isArray(candidate.issueTypes)) &&
    (candidate.signalPatterns === undefined || Array.isArray(candidate.signalPatterns)) &&
    (candidate.includeSignals === undefined || typeof candidate.includeSignals === 'boolean') &&
    (candidate.includeIssues === undefined || typeof candidate.includeIssues === 'boolean') &&
    (candidate.maxResults === undefined || typeof candidate.maxResults === 'number') &&
    (candidate.sortBy === undefined ||
      (typeof candidate.sortBy === 'string' &&
        ['name', 'complexity', 'size', 'issues', 'signals'].includes(candidate.sortBy))) &&
    (candidate.sortOrder === undefined ||
      (typeof candidate.sortOrder === 'string' && ['asc', 'desc'].includes(candidate.sortOrder)))
  );
}

/**
 * Type guard for ExtractionOptions
 */
export function isExtractionOptions(obj: unknown): obj is ExtractionOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    (candidate.includePrivate === undefined || typeof candidate.includePrivate === 'boolean') &&
    (candidate.includeInternal === undefined || typeof candidate.includeInternal === 'boolean') &&
    (candidate.includeExported === undefined || typeof candidate.includeExported === 'boolean') &&
    (candidate.maxDepth === undefined || typeof candidate.maxDepth === 'number') &&
    (candidate.includeSignatures === undefined || typeof candidate.includeSignatures === 'boolean') &&
    (candidate.includeMetadata === undefined || typeof candidate.includeMetadata === 'boolean') &&
    (candidate.tokenOptimized === undefined || typeof candidate.tokenOptimized === 'boolean')
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial type for nested objects
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Required fields with optional others
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Extract promise resolved type
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

/**
 * Event handler type
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * Async function type
 */
export type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>;

/**
 * Validation result type
 */
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
