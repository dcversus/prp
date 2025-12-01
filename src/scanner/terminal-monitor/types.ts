/**
 * ♫ Storage Types for @dcversus/prp
 *
 * Types for the persistent storage system managing .prp/ directory.
 */
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
