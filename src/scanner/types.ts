/**
 * ♫ Scanner Layer Types for @dcversus/prp
 *
 * Types specific to the infrastructure layer - scanner functionality.
 */
import type { FileChange, PRPFile, Signal } from '../shared/types';
// Re-export FileChange for use within scanner domain
export type { FileChange };
// Enhanced metadata interfaces for better type safety
export interface TokenAccountingMetadata {
  operationType?: string;
  requestId?: string;
  sessionId?: string;
  worktree?: string;
  scanId?: string;
  modelVersion?: string;
  temperature?: number;
  maxTokens?: number;
  processingTime?: number;
  errorType?: string;
  retryCount?: number;
  batchId?: string;
  customFields?: Record<string, string | number | boolean | null>;
}
export interface ScannerConfig {
  scanInterval: number; // milliseconds
  maxConcurrentScans: number;
  batchSize: number;
  enableGitMonitoring: boolean;
  enableFileMonitoring: boolean;
  enablePRPMonitoring: boolean;
  excludedPaths: string[];
  includedExtensions: string[];
  worktreePaths: string[];
  performanceThresholds: {
    maxScanTime: number; // milliseconds
    maxMemoryUsage: number; // bytes
    maxFileCount: number;
  };
}
export interface ScanResult {
  id: string;
  timestamp: Date;
  worktree: string;
  scanType: 'full' | 'incremental';
  changes: FileChange[];
  prpUpdates: PRPUpdate[];
  signals: Signal[];
  performance: {
    duration: number;
    memoryUsage: number;
    filesScanned: number;
    changesFound: number;
  };
  errors?: string[];
}
export interface PRPUpdate {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  previousVersion?: PRPFile;
  newVersion?: PRPFile;
  detectedSignals: Signal[];
  lastModified: Date;
}
export interface TokenAccountingEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  agentType: string;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  currency: string;
  layer: 'scanner' | 'inspector' | 'orchestrator' | 'agent';
  metadata: TokenAccountingMetadata;
}
export interface TokenAccountingReport {
  reportId: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
  };
  summary: {
    totalTokens: number;
    totalCost: number;
    totalOperations: number;
    averageCostPerOperation: number;
    agentsTracked: number;
  };
  breakdown: {
    byAgent: Record<string, AgentBreakdown>;
    byLayer: Record<string, LayerBreakdown>;
    byModel: Record<string, ModelBreakdown>;
    byTime: TimeSeriesData[];
  };
  alerts: TokenAlert[];
}
export interface TokenAlert {
  id: string;
  type: 'approaching_limit' | 'limit_exceeded' | 'spike_detected' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agentId: string;
  message: string;
  current: {
    tokens: number;
    cost: number;
    limit?: number;
    percentage?: number;
  };
  threshold: {
    tokens?: number;
    cost?: number;
    percentage?: number;
  };
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}
// Enhanced breakdown interfaces for better type safety
export interface AgentBreakdown {
  tokens: number;
  cost: number;
  operations: number;
  percentage: number;
}
export interface LayerBreakdown {
  tokens: number;
  cost: number;
  operations: number;
  percentage: number;
}
export interface ModelBreakdown {
  tokens: number;
  cost: number;
  operations: number;
  percentage: number;
}
export interface TimeSeriesData {
  timestamp: Date;
  tokens: number;
  cost: number;
}
// Interface for persisted data structure
export interface PersistedAccountingData {
  entries?: TokenAccountingEntry[];
  alerts?: TokenAlert[];
  lastSaved?: Date;
  version?: string;
}
// Enhanced signal data interfaces
export interface SignalData {
  rawSignal?: string;
  source?: string;
  worktree?: string;
  agent?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}
export interface DetectedSignal {
  pattern: string;
  type: string;
  content: string;
  line: number;
  column: number;
  context: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
export interface FileChangeData {
  type?: 'added' | 'modified' | 'deleted' | 'renamed';
  path?: string;
  oldPath?: string;
  newPath?: string;
  content?: string;
  timestamp?: Date;
}
export interface FileWatcherChangeEvent {
  id: string;
  timestamp: Date;
  path: string;
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  processed: boolean;
}
export interface PRPScanResult {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  previousVersion?: PRPFile;
  newVersion?: PRPFile;
  detectedSignals: Signal[];
  lastModified: Date;
}
export interface WatcherInstance {
  close?: () => Promise<void>;
  closeSync?: () => void;
}
// Signal pattern interface for detector patterns
export interface SignalPattern {
  id: string;
  name: string;
  pattern: RegExp;
  category: string;
  priority: number;
  description: string;
  enabled: boolean;
  custom: boolean;
}
export interface WorktreeMonitor {
  path: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'scanning';
  lastScan?: Date;
  scanInterval: number;
  fileWatcher?: unknown; // FSWatcher instance
  gitWatcher?: unknown; // FSWatcher instance for .git
  metrics: {
    totalScans: number;
    totalChanges: number;
    averageScanTime: number;
    errorCount: number;
    lastError?: string;
  };
}
export interface FileWatcher {
  worktreePath: string;
  patterns: string[];
  ignored: string[];
  watcher: unknown; // chokidar watcher
  events: FileWatcherEvent[];
  maxEvents: number;
}
export interface FileWatcherEvent {
  id: string;
  timestamp: Date;
  path: string;
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  stats?: {
    size: number;
    mtime: Date;
  };
  processed: boolean;
}
export interface PRPParser {
  worktreePath: string;
  cache: Map<string, { content: string; lastModified: Date; signals: Signal[] }>;
  maxCacheSize: number;
  cacheTimeout: number; // milliseconds
  parseErrors: Array<{
    path: string;
    error: string;
    timestamp: Date;
  }>;
}
export interface SignalDetector {
  patterns: SignalPattern[];
  customPatterns: SignalPattern[];
  enabledCategories: Set<string>;
  cache: Map<string, Signal[]>;
  maxCacheSize: number;
}
export interface SignalPattern {
  id: string;
  name: string;
  pattern: RegExp;
  category: string;
  priority: number;
  description: string;
  enabled: boolean;
  custom: boolean;
}
export interface ScannerMetrics {
  startTime: Date;
  totalScans: number;
  totalChanges: number;
  totalPRPUpdates: number;
  totalSignalsDetected: number;
  averageScanTime: number;
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
  };
  performance: {
    fastestScan: number;
    slowestScan: number;
    errorRate: number;
  };
  worktrees: {
    active: number;
    inactive: number;
    error: number;
  };
}
export interface ScannerState {
  status: 'idle' | 'scanning' | 'paused' | 'error';
  currentScan?: string;
  config: ScannerConfig;
  monitors: Map<string, WorktreeMonitor>;
  metrics: ScannerMetrics;
  alerts: TokenAlert[];
  lastError?: {
    message: string;
    timestamp: Date;
    stack?: string;
  };
}
// Scanner events
export interface ScannerStartedEvent {
  scanId: string;
  worktree: string;
  scanType: 'full' | 'incremental';
}
export interface ScannerCompletedEvent {
  scanId: string;
  result: ScanResult;
}
export interface ScannerErrorEvent {
  scanId?: string;
  worktree: string;
  error: Error;
}
export interface TokenAlertEvent {
  alert: TokenAlert;
}
export interface WorktreeStatusChangeEvent {
  worktree: string;
  oldStatus: string;
  newStatus: string;
  details?: unknown;
}
export interface FileChangeEvent {
  worktree: string;
  event: FileWatcherEvent;
}
export interface PRPUpdateEvent {
  worktree: string;
  update: PRPUpdate;
}
export interface SignalDetectedEvent {
  worktree: string;
  signals: Signal[];
  source: string; // file path, agent, etc.
}
// Missing types that are imported in other files
export interface WorktreeStatus {
  path: string;
  status: 'active' | 'inactive' | 'error' | 'scanning';
  lastModified?: Date;
  changes?: FileChange[];
  signals?: Signal[];
}
export interface TokenUsage {
  agentId: string;
  agentType: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
  metadata?: TokenAccountingMetadata;
}
export interface ScanEvent {
  type: 'started' | 'completed' | 'error' | 'pause' | 'resume';
  scanId: string;
  worktree: string;
  timestamp: Date;
  data?: unknown;
}

// Tree-sitter Codemap Scanner Types

export interface Position {
  line: number;
  column: number;
}

export interface FunctionInfo {
  name: string;
  type: 'declaration' | 'expression' | 'arrow';
  position: Position;
  size: number;
  complexity: number;
  nestingDepth: number;
  parameters: Array<{
    name: string;
    type?: string;
    optional: boolean;
  }>;
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface ClassInfo {
  name: string;
  type: 'class' | 'interface' | 'abstract_class' | 'type';
  position: Position;
  size: number;
  methods: FunctionInfo[];
  properties: Array<{
    name: string;
    type?: string;
    visibility: 'public' | 'private' | 'protected';
    isStatic: boolean;
  }>;
  inheritance: string[];
  decorators: string[];
}

export interface ImportInfo {
  source: string;
  imports: Array<{
    name: string;
    alias?: string;
    isDefault: boolean;
  }>;
  type: 'import' | 'require';
  position: Position;
}

export interface ExportInfo {
  name: string;
  type: string;
  isDefault: boolean;
  position: Position;
}

export interface VariableInfo {
  name: string;
  type?: string;
  isConst: boolean;
  isExported: boolean;
  position: Position;
}

export interface CodeIssue {
  type: 'style' | 'performance' | 'security' | 'complexity' | 'duplication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  position: Position;
  suggestion?: string;
}

export interface Dependency {
  module: string;
  type: 'import' | 'require';
  imports: Array<{
    name: string;
    alias?: string;
    isDefault: boolean;
  }>;
  isExternal: boolean;
  position: Position;
}

export interface CrossFileReference {
  sourceFile: string;
  targetFile: string;
  type: 'function_call' | 'class_instantiation' | 'type_reference' | 'variable_reference';
  name: string;
  position: Position;
  targetPosition?: Position;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  halsteadComplexity: {
    operators: number;
    operands: number;
    difficulty: number;
    effort: number;
  };
}

export interface FileAnalysisMetrics {
  linesOfCode: number;
  functionsCount: number;
  classesCount: number;
  importsCount: number;
  exportsCount: number;
  variablesCount: number;
  maxNestingDepth: number;
  averageFunctionSize: number;
  duplicateCodeBlocks: number;
}

export interface InterfaceInfo {
  name: string;
  properties: Record<string, unknown>;
  methods: string[];
  extends?: string[];
  location: {
    line: number;
    column: number;
  };
}

export interface TypeInfo {
  name: string;
  kind: 'alias' | 'union' | 'intersection' | 'generic';
  definition: string;
  location: {
    line: number;
    column: number;
  };
}

export interface EnumInfo {
  name: string;
  members: Array<{
    name: string;
    value?: string | number;
  }>;
  location: {
    line: number;
    column: number;
  };
}

export interface ModuleInfo {
  name: string;
  path: string;
  exports: string[];
  imports: string[];
}

export interface FileStructure {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  variables: VariableInfo[];
  interfaces: InterfaceInfo[];
  types: TypeInfo[];
  enums: EnumInfo[];
  modules: ModuleInfo[];
}

export interface CodeAnalysisResult {
  filePath: string;
  language: string;
  size: number;
  lastModified: Date;
  structure: FileStructure;
  metrics: FileAnalysisMetrics;
  complexity: ComplexityMetrics;
  dependencies: Dependency[];
  issues: CodeIssue[];
  crossFileReferences: CrossFileReference[];
}

export interface CodemapMetrics {
  totalFiles: number;
  totalLines: number;
  totalFunctions: number;
  totalClasses: number;
  averageComplexity: number;
  languageDistribution: Map<string, number>;
  issueCount: number;
  duplicateCodeBlocks: number;
}

export interface CodemapData {
  version: string;
  generatedAt: Date;
  rootPath: string;
  files: Map<string, CodeAnalysisResult>;
  dependencies: Map<string, Set<string>>;
  metrics: CodemapMetrics;
  crossFileReferences: CrossFileReference[];
}

export interface FileAnalysis {
  path: string;
  language: string;
  size: number;
  linesOfCode: number;
  complexity: number;
  issues: number;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: Dependency[];
  lastModified: Date;
}

// Additional types needed by other files
export interface FileInfo {
  path: string;
  language: string;
  size: number;
  linesOfCode: number;
  lastModified: Date;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export interface Codemap {
  version: string;
  generatedAt: Date;
  rootPath: string;
  files: Map<string, FileInfo>;
  dependencies: Map<string, Set<string>>;
  metrics: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    averageComplexity: number;
    languageDistribution: Map<string, number>;
  };
  metadata: {
    projectName: string;
    commitHash: string;
    generatedAt: string;
    [key: string]: unknown;
  };
}
