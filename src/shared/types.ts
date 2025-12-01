/**
 * ♫ Storage Types for @dcversus/prp
 *
 * Types for the persistent storage system managing .prp/ directory.
 */

// Re-export types from inspector/types to avoid duplication
export type {
  InspectorPayload,
  Recommendation,
  EnhancedSignalClassification
} from '../inspector/types';

// Types imported as needed in implementation files
export interface StorageConfig {
  dataDir: string;
  cacheDir: string;
  worktreesDir: string;
  notesDir: string;
  logsDir: string;
  keychainFile: string;
  persistFile: string;
  maxCacheSize: number;
  retentionPeriod: number;
}
export interface PersistentState {
  version: string;
  createdAt: Date;
  lastModified: Date;
  worktrees: Record<string, WorktreeState>;
  agents: Record<string, AgentState>;
  prps: Record<string, PRPState>;
  signals: Record<string, SignalState>;
  tokens: TokenState;
  guidelines: GuidelineState;
  notes: Record<string, NoteState>;
  metrics: SystemMetrics;
  userPreferences: UserPreferences;
}
export interface WorktreeState {
  id: string;
  name: string;
  path: string;
  branch: string;
  status: 'active' | 'inactive' | 'error';
  lastActivity: Date;
  lastScan?: Date;
  changes: FileChangeState[];
  prps: string[]; // PRP IDs
  agent?: string;
  metrics: {
    totalScans: number;
    totalChanges: number;
    averageScanTime: number;
    errorCount: number;
  };
}
export interface FileChangeState {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  size: number;
  timestamp: Date;
  hash?: string;
  processed: boolean;
}
export interface AgentState {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  lastActivity: Date;
  worktree?: string;
  tokenUsage: {
    used: number;
    limit: number;
    cost: number;
    lastUpdated: Date;
  };
  capabilities: {
    supportsTools: boolean;
    supportsImages: boolean;
    supportsSubAgents: boolean;
    supportsParallel: boolean;
  };
  configuration: Record<string, unknown>;
  logs: AgentLogEntry[];
  metrics: {
    totalTasks: number;
    completedTasks: number;
    averageTaskTime: number;
    errorRate: number;
  };
}
export interface AgentLogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
  tokenCost?: number;
}
export interface PRPState {
  id: string;
  name: string;
  path: string;
  worktree: string;
  status: 'active' | 'completed' | 'blocked' | 'pending';
  goal: string;
  definitionOfReady: string[];
  definitionOfDone: string[];
  progressLog: ProgressEntryState[];
  signals: string[]; // Signal IDs
  lastModified: Date;
  metadata: {
    createdBy: string;
    assignedTo?: string;
    priority: number;
    tags: string[];
    estimatedDuration?: number;
    actualDuration?: number;
  };
  checkpoints: CheckpointState[];
}
export interface ProgressEntryState {
  id: string;
  timestamp: Date;
  message: string;
  signals: string[];
  status: string;
  actor: string;
  checkpoint?: string;
}
export interface CheckpointState {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  reachedAt?: Date;
  requiredSignals: string[];
  outcomes: string[];
}
export interface SignalState {
  id: string;
  type: string;
  priority: number;
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: {
    worktree?: string;
    agent?: string;
    guideline?: string;
    tokenCost?: number;
    resolved: boolean;
    resolvedAt?: Date;
    resolution?: string;
  };
  relatedSignals: string[];
  childSignals: string[];
  parentSignal?: string;
}
export interface TokenState {
  accounting: TokenAccountingState;
  limits: TokenLimitsState;
  alerts: TokenAlertState[];
  reports: TokenReportState[];
}
export interface TokenAccountingState {
  totalUsed: number;
  totalCost: number;
  totalOperations: number;
  byAgent: Record<string, AgentTokenUsage>;
  byLayer: Record<string, LayerTokenUsage>;
  byModel: Record<string, ModelTokenUsage>;
  byTime: TimeSeriesData[];
  lastUpdated: Date;
}
export interface AgentTokenUsage {
  agentId: string;
  tokens: number;
  cost: number;
  operations: number;
  lastUsed: Date;
  dailyUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
}
export interface LayerTokenUsage {
  layer: string;
  tokens: number;
  cost: number;
  operations: number;
  lastUsed: Date;
}
export interface ModelTokenUsage {
  model: string;
  tokens: number;
  cost: number;
  operations: number;
  lastUsed: Date;
}
export interface TimeSeriesData {
  timestamp: Date;
  tokens: number;
  cost: number;
  operations: number;
}
// File change and PRP file types for scanner compatibility
export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  size: number;
  timestamp: Date;
  hash?: string;
  content?: string;
  oldPath?: string;
  processed?: boolean;
}
export interface PRPFile {
  id: string;
  path: string;
  name: string;
  content: string;
  signals: Signal[];
  lastModified: Date;
  metadata: {
    worktree?: string;
    version?: number;
    author?: string;
    checksum?: string;
  };
}
export interface TokenLimitsState {
  enabled: boolean;
  agentLimits: Record<string, TokenLimitConfig>;
  globalLimits: TokenLimitConfig;
  alertThresholds: {
    warning: number; // percentage
    critical: number; // percentage
  };
}
export interface TokenLimitConfig {
  daily?: number;
  weekly?: number;
  monthly?: number;
  maxPrice?: number;
  perTime?: number;
  timeWindow?: number;
}
export interface TokenAlertState {
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
  resolution?: string;
}
export interface TokenReportState {
  id: string;
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
  generatedAt: Date;
  format: 'json' | 'csv' | 'html';
  filePath?: string;
}
export interface GuidelineState {
  enabled: string[]; // Guideline IDs
  disabled: string[];
  configurations: Record<string, GuidelineConfiguration>;
  executionHistory: GuidelineExecution[];
  activeExecutions: Record<string, GuidelineExecution>;
}
export interface GuidelineConfiguration {
  id: string;
  name: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  requiredFeatures: string[];
  tokenLimits: {
    inspector: number;
    orchestrator: number;
  };
  customPrompts: {
    inspector?: string;
    orchestrator?: string;
  };
  protocol: {
    id: string;
    description: string;
    steps: GuidelineStep[];
    requirements?: string[];
    dependencies?: string[];
    metadata?: Record<string, unknown>;
  };
}
export interface GuidelineExecution {
  id: string;
  guidelineId: string;
  triggerSignal: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  steps: GuidelineStepExecution[];
  context: Record<string, unknown>;
  result?: unknown;
  error?: string;
}
export interface GuidelineStepExecution {
  stepId: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  tokenUsage?: {
    input: number;
    output: number;
    cost: number;
  };
}
export interface NoteState {
  id: string;
  name: string;
  content: string;
  pattern: string;
  createdAt: Date;
  lastModified: Date;
  tags: string[];
  relevantTo: {
    prps: string[];
    agents: string[];
    guidelines: string[];
    signals: string[];
  };
  metadata: {
    author: string;
    version: number;
    wordCount: number;
    readingTime: number;
  };
  access: {
    public: boolean;
    sharedWith: string[];
    permissions: Record<string, string[]>;
  };
}
export interface SystemMetrics {
  uptime: number;
  scans: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
  };
  agents: {
    total: number;
    active: number;
    busy: number;
    error: number;
  };
  prps: {
    total: number;
    active: number;
    completed: number;
    blocked: number;
  };
  signals: {
    total: number;
    resolved: number;
    pending: number;
    averageResolutionTime: number;
  };
  performance: {
    memoryUsage: number;
    diskUsage: number;
    cpuUsage: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    recent: ErrorEntry[];
  };
}
export interface ErrorEntry {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: Date;
}
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    enabled: boolean;
    types: string[];
    quietHours: {
      start: string;
      end: string;
    };
  };
  ui: {
    showLineNumbers: boolean;
    wordWrap: boolean;
    fontSize: number;
    fontFamily: string;
  };
  features: {
    autoSave: boolean;
    autoScan: boolean;
    tokenAlerts: boolean;
    performanceMonitoring: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    dataRetention: number; // days
  };
}
export interface StorageStats {
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  lastModified: Date;
  oldestFile?: Date;
  newestFile?: Date;
  byType: Record<
    string,
    {
      count: number;
      size: number;
    }
  >;
}
export interface BackupMetadata {
  id: string;
  createdAt: Date;
  version: string;
  description?: string;
  includes: string[];
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
}
export interface KeychainData {
  version: string;
  encrypted: boolean;
  entries: KeychainEntry[];
  metadata: {
    createdAt: Date;
    lastModified: Date;
    accessCount: number;
  };
}
export interface KeychainEntry {
  id: string;
  name: string;
  type: 'api_key' | 'password' | 'token' | 'certificate' | 'other';
  value: string; // Encrypted
  metadata: {
    service?: string;
    username?: string;
    url?: string;
    expiresAt?: Date;
    notes?: string;
  };
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}
// Signal system types
export interface Signal {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
  priority: number;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
  relatedSignals: string[];
  metadata?: Record<string, unknown>;
}
// Event system types
export interface ChannelEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  data: T;
  metadata?: Record<string, unknown>;
}
export interface ScannerEvent extends ChannelEvent {
  type: 'scan_started' | 'scan_completed' | 'file_changed' | 'error';
  data: {
    worktree?: string;
    filePath?: string;
    changeType?: 'added' | 'modified' | 'deleted';
    error?: string;
  };
}
export interface InspectorEvent extends ChannelEvent {
  type: 'inspection_started' | 'inspection_completed' | 'signal_detected' | 'error';
  data: {
    signalId?: string;
    signalType?: string;
    worktree?: string;
    analysis?: Record<string, unknown>;
    error?: string;
  };
}
export interface OrchestratorEvent extends ChannelEvent {
  type: 'decision_made' | 'action_started' | 'action_completed' | 'agent_spawned' | 'error';
  data: {
    decisionId?: string;
    agentId?: string;
    action?: string;
    result?: Record<string, unknown>;
    error?: string;
  };
}
// Guidelines system types
export interface GuidelineProtocol {
  id: string;
  description: string;
  steps: GuidelineStep[];
  requirements?: string[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  decisionPoints?: Array<{
    id: string;
    question: string;
    requiresInput?: boolean;
    options: Array<{
      id: string;
      label: string;
      action: string;
      nextSteps: string[];
    }>;
  }>;
  successCriteria?: string[];
  fallbackActions?: string[];
}
export interface GuidelineStep {
  id: string;
  name: string;
  description: string;
  type:
    | 'inspector_analysis'
    | 'orchestrator_decision'
    | 'agent_action'
    | 'verification'
    | 'action_execution';
  required?: boolean;
  dependencies?: string[];
  timeout?: number;
  tokenLimits?: {
    inspector?: number;
    orchestrator?: number;
    agent?: number;
  };
  outputs?: string[];
  nextSteps?: string[];
}
// Additional type exports for orchestrator compatibility
// Agent configuration types (re-exported from config/agent-config)
export type AgentConfig = import('../config/agent-config.js').AgentConfig;
// Agent role type (re-exported from config/agent-config)
export type AgentRole = import('../config/agent-config.js').AgentRole;
// Inspector payload types (re-exported from inspector/types)
export interface SignalClassification {
  category: string;
  subcategory: string;
  priority: number;
  confidence: number;
  reasoning?: string;
  suggestedActions?: string[];
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  suggestedRole?: string;
  signal?: string;
  agentRole?: string;
}
export interface PreparedContext {
  id: string;
  summary: string;
  keyPoints: string[];
  relevantData: Record<string, unknown>;
  fileReferences: string[];
  agentStates: Record<string, unknown>;
  activePRPs?: string[];
  blockedItems?: string[];
  recentActivity?: string[];
  tokenStatus?: {
    used: number;
    totalUsed: number;
    totalLimit: number;
    approachingLimit: boolean;
    criticalLimit: boolean;
    agentBreakdown: Record<string, unknown>;
  };
  agentStatus?: string[];
  sharedNotes?: string[];
  signal?: string;
}
// Recommendation type is re-exported from inspector/types to avoid duplication
// Type alias for GuidelineConfiguration to maintain compatibility
export type GuidelineConfig = GuidelineConfiguration;
// Missing type exports for compatibility
export interface TUIState {
  mode: 'cli' | 'tui';
  activeScreen: string;
  followEvents: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}
export type SignalType = string;
export interface GuidelineRequirement {
  id?: string;
  name: string;
  description: string;
  type: 'must' | 'should' | 'could' | 'wont' | 'feature' | 'service' | 'auth' | 'config';
  priority?: number;
  required?: boolean;
  check?: () => Promise<boolean>;
  errorMessage?: string;
  source?: string;
  validation?: string;
}
export type LogLevel = 'debug' | 'verbose' | 'info' | 'warn' | 'error';
export const LOG_LEVELS: readonly LogLevel[] = [
  'debug',
  'verbose',
  'info',
  'warn',
  'error',
] as const;
export interface CommandResult {
  success: boolean;
  output?: string;
  stdout?: string;
  stderr?: string;
  message?: string;
  error?: string;
  exitCode?: number;
  duration?: number;
  data?: unknown;
}
// Additional missing types for compatibility
export interface FileToGenerate {
  path: string;
  template?: string;
  content?: string;
  overwrite?: boolean;
  executable?: boolean;
}
// Signal event type for signal processing
export interface SignalEvent {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
  data: unknown;
  metadata?: Record<string, unknown>;
}
// Signal priority enum for signal processing
export const SignalPriorityEnum = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type SignalPriority = (typeof SignalPriorityEnum)[keyof typeof SignalPriorityEnum];
// Re-export OrchestratorConfig for compatibility
export type OrchestratorConfig = import('../orchestrator/types.js').OrchestratorConfig;
// Re-export AgentSession for compatibility
export type AgentSession = import('../orchestrator/types.js').AgentSession;
// ===== AGENT CAPABILITY TYPES =====
/**
 * Comprehensive agent capability definitions
 */
export interface AgentCapabilities {
  primary: string[]; // Main capabilities
  secondary: string[]; // Supporting capabilities
  tools: string[]; // Available tools
  maxConcurrent: number; // Maximum concurrent tasks
  specializations?: string[]; // Specialized areas
  version?: string; // Capability version
  certified?: boolean; // Capability certification status
}
/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  taskCompletionRate: number;
  averageTaskDuration: number;
  tokensUsedPerTask: number;
  costPerTask: number;
  successRate: number;
  errorFrequency: Record<string, number>;
  lastUpdated: Date;
}
/**
 * Agent health metrics
 */
export interface AgentHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  lastHealthCheck: Date;
  consecutiveFailures: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}
/**
 * Agent spawning decision matrix
 */
export interface SpawnDecision {
  shouldSpawn: boolean;
  agentType?: string;
  reason: string;
  priority: number;
  alternativeAgents?: string[];
  estimatedCost?: number;
  estimatedDuration?: number;
}
/**
 * Signal-based spawn request
 */
export interface SignalBasedSpawnRequest {
  signal: string;
  context?: {
    prpId?: string;
    filePath?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };
  task?: AgentTask | string;
  priority?: number;
  timeout?: number;
  waitForHealth?: boolean;
  tokenTracking?: boolean;
}
/**
 * Enhanced agent task definition
 */
export interface AgentTask {
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
  estimatedDuration?: number;
  maxTokens?: number;
  requiresCapabilities?: string[];
  dependencies?: string[];
}
/**
 * Agent configuration for spawning
 */
export interface AgentSpawningConfig {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  priority: number;
  resourceRequirements: ResourceRequirements;
  healthCheck: HealthCheckConfig;
  tokenLimits: TokenLimits;
  capabilities: AgentCapabilities;
  environment?: Record<string, string>;
  constraints?: AgentConstraints;
}
/**
 * Resource requirements for agents
 */
export interface ResourceRequirements {
  memoryMB: number;
  cpuCores: number;
  maxExecutionTime: number; // milliseconds
  requiresNetwork: boolean;
  requiresFileSystem: boolean;
  parallelizable: boolean;
  maxConcurrentTasks?: number;
}
/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  maxFailures: number;
  pingEndpoint?: string;
  healthThresholds?: {
    cpuUsage?: number;
    memoryUsage?: number;
    responseTime?: number;
    errorRate?: number;
  };
}
/**
 * Token limits and cost controls
 */
export interface TokenLimits {
  dailyLimit: number;
  perRequestLimit: number;
  costLimit: number;
  alertThresholds: {
    warning: number; // percentage
    critical: number; // percentage
  };
  costPerToken?: number;
  model?: string;
}
/**
 * Agent operational constraints
 */
export interface AgentConstraints {
  maxConcurrentTasks?: number;
  maxWorkTime?: number; // milliseconds
  allowedWorktimes?: {
    start?: string; // HH:MM
    end?: string; // HH:MM
  };
  restrictedOperations?: string[];
  requiredPermissions?: string[];
}
/**
 * Agent spawning analytics
 */
export interface SpawningAnalytics {
  signalFrequency: Record<string, number>;
  agentUsage: Record<string, { count: number; lastUsed: Date }>;
  currentLoad: Record<string, number>;
  recommendations: string[];
  signalHistory: Record<string, Array<{ timestamp: Date; agentType?: string }>>;
  performanceMetrics: {
    averageSpawnTime: number;
    spawnSuccessRate: number;
    agentUtilization: Record<string, number>;
  };
}
/**
 * Signal to agent mapping
 */
export interface SignalAgentMapping {
  signal: string;
  agentTypes: string[];
  priority: number;
  conditions?: {
    maxConcurrent?: number;
    resourceRequirements?: ResourceRequirements;
    requiredCapabilities?: string[];
  };
  alternatives?: string[];
}
/**
 * Agent lifecycle event types
 */
export interface AgentLifecycleEvent {
  type: 'spawned' | 'stopped' | 'error' | 'health_check' | 'task_completed' | 'task_failed';
  agentId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  metadata?: {
    source?: string;
    version?: string;
    correlationId?: string;
  };
}
/**
 * Agent communication message
 */
export interface AgentMessage {
  id: string;
  type: 'instruction' | 'query' | 'signal' | 'update' | 'response';
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: Date;
  from: string;
  to?: string;
  metadata?: Record<string, unknown>;
  requiresResponse?: boolean;
  expiresAt?: Date;
}
/**
 * Agent work item
 */
export interface AgentWorkItem {
  id: string;
  agentId: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  payload: Record<string, unknown>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  metrics?: {
    duration?: number;
    tokensUsed?: number;
    cost?: number;
  };
}
/**
 * Agent registry information
 */
export interface AgentRegistry {
  agents: Record<string, AgentState>;
  types: Record<string, AgentTypeInfo>;
  capabilities: Record<string, AgentCapabilities>;
  mappings: SignalAgentMapping[];
  statistics: {
    totalAgents: number;
    activeAgents: number;
    totalSpawns: number;
    averageUptime: number;
    lastUpdated: Date;
  };
}
/**
 * Agent type information
 */
export interface AgentTypeInfo {
  type: string;
  name: string;
  description: string;
  defaultCapabilities: AgentCapabilities;
  defaultResourceRequirements: ResourceRequirements;
  supportedSignals: string[];
  maxConcurrent: number;
  version?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
}
