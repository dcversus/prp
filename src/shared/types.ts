/**
 * ♫ Shared Types for @dcversus/prp Three-Layer Architecture
 *
 * Core type definitions used across all layers of the system.
 */


// AgentConfig is imported from src/config/agent-config.ts to avoid duplication
export type AgentConfig = import('../config/agent-config.js').AgentConfig;

// Guideline protocol
export interface GuidelineProtocol {
  steps: ProtocolStep[];
  [key: string]: unknown;
}



// TUI state
export interface TUIState {
  mode: 'cli' | 'tui';
  activeScreen: 'main' | 'status' | 'agent' | 'logs' | 'config';
  selectedPRP?: string;
  selectedAgent?: string;
  followEvents: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface Signal {
  id: string;
  type: string;
  priority: number; // 1-10
  source: string; // scanner, inspector, orchestrator, agent, user
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: {
    worktree?: string;
    agent?: string;
    guideline?: string;
    tokenCost?: number;
    [key: string]: unknown;
  };
}

export type SignalType = string;

export interface PRPFile {
  path: string;
  name: string;
  status: 'active' | 'completed' | 'blocked' | 'pending';
  goal: string;
  definitionOfReady: string[];
  definitionOfDone: string[];
  progressLog: ProgressEntry[];
  signals: Signal[];
  lastModified: Date;
  worktree?: string;
}

export interface ProgressEntry {
  timestamp: Date;
  message: string;
  signals: string[];
  status: string;
  actor: 'scanner' | 'inspector' | 'orchestrator' | 'agent' | 'user';
}

// AgentConfig is imported from src/config/agent-config.ts to avoid duplication

// AgentRole is imported from src/config/agent-config.ts to avoid duplication
export type AgentRole = import('../config/agent-config.js').AgentRole;

export interface TokenLimits {
  daily?: number;
  weekly?: number;
  monthly?: number;
  perTime?: number; // tokens per time period
  maxPrice?: number; // maximum price in USD
  timeWindow?: number; // time window in minutes
}

// AgentCapabilities is imported from src/config/agent-config.ts to avoid duplication
export type AgentCapabilities = import('../config/agent-config.js').AgentCapabilities;

export interface WorktreeStatus {
  path: string;
  name: string;
  branch: string;
  status: 'active' | 'inactive' | 'error';
  lastActivity: Date;
  changes: FileChange[];
  prps: PRPFile[];
  agent?: string;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  size: number;
  timestamp: Date;
  hash?: string;
}

export interface TokenUsage {
  agentId: string;
  timestamp: Date;
  tokens: number;
  cost: number;
  model: string;
  operation: 'input' | 'output' | 'total';
  layer: 'scanner' | 'inspector' | 'orchestrator' | 'agent';
}

export interface InspectorPayload {
  id: string;
  timestamp: Date;
  sourceSignals: Signal[];
  classification: SignalClassification[];
  recommendations: Recommendation[];
  context: PreparedContext;
  estimatedTokens: number;
  priority: number;
}

export interface SignalClassification {
  signal: Signal;
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requiresAction: boolean;
  suggestedRole: AgentRole;
  guideline?: string;
  confidence: number; // 0-1
}

export interface Recommendation {
  type: 'spawn_agent' | 'send_message' | 'execute_command' | 'create_note' | 'update_prp';
  target?: string;
  payload: Record<string, unknown>;
  reasoning: string;
  priority: number;
}

export interface PreparedContext {
  summary: string;
  activePRPs: string[];
  blockedItems: string[];
  recentActivity: ActivityEntry[];
  tokenStatus: TokenStatus;
  agentStatus: AgentStatus[];
  sharedNotes: SharedNote[];
}

export interface ActivityEntry {
  timestamp: Date;
  actor: string;
  action: string;
  details: string;
}

export interface TokenStatus {
  used: number;
  totalUsed: number;
  totalLimit: number;
  approachingLimit: boolean;
  criticalLimit: boolean;
  agentBreakdown: Record<string, { used: number; limit: number }>;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  lastActivity: Date;
  tokenUsage: { used: number; limit: number };
  capabilities: AgentCapabilities;
}

export interface SharedNote {
  id: string;
  name: string;
  content: string;
  pattern: string;
  lastModified: Date;
  tags: string[];
  relevantTo: string[]; // PRP IDs, agent IDs, etc.
}

export interface GuidelineConfig {
  id: string;
  name: string;
  enabled: boolean;
  protocol: GuidelineProtocol;
  requirements?: GuidelineRequirement[];
  tools?: string[];
  prompts?: {
    inspector?: string;
    orchestrator?: string;
  };
  tokenLimits?: {
    inspector?: number;
    orchestrator?: number;
  };
}

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
  customLogic?: string;
  metadata: {
    version: string;
    author: string;
    createdAt: Date;
    lastModified: Date;
    tags: string[];
    dependencies: string[];
  };
}

export interface GuidelineProtocol {
  id: string;
  description: string;
  steps: ProtocolStep[];
  decisionPoints: DecisionPoint[];
  successCriteria: string[];
  fallbackActions: string[];
}

export interface ProtocolStep {
  id: string;
  name: string;
  description: string;
  type: 'inspector_analysis' | 'orchestrator_decision' | 'action_execution' | 'verification';
  required: boolean;
  tools?: string[];
  outputs?: string[];
  nextSteps: string[];
  dependencies?: string[];
  parameters?: Record<string, unknown>;
}

export interface DecisionPoint {
  id: string;
  question: string;
  options: DecisionOption[];
  defaultOption?: string;
  requiresInput: boolean;
}

export interface DecisionOption {
  id: string;
  label: string;
  action: string;
  nextSteps: string[];
  conditions?: string[];
}

export interface GuidelineRequirement {
  type: 'feature' | 'service' | 'auth' | 'config';
  name: string;
  description?: string;
  required: boolean;
  check: () => Promise<boolean>;
  errorMessage?: string;
}

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

export interface SystemStatus {
  scanner: {
    status: 'running' | 'stopped' | 'error';
    monitoredWorktrees: number;
    changesDetected: number;
    lastScan: Date;
    performance: {
      scanTime: number;
      memoryUsage: number;
      fileCount: number;
    };
  };
  inspector: {
    status: 'running' | 'stopped' | 'error';
    queuedSignals: number;
    processedSignals: number;
    averageProcessingTime: number;
    model: string;
  };
  orchestrator: {
    status: 'active' | 'idle' | 'busy' | 'error';
    activeAgents: number;
    currentTask?: string;
    contextSize: number;
    lastDecision: Date;
  };
  agents: AgentStatus[];
  tokens: TokenStatus;
  guidelines: {
    total: number;
    enabled: number;
    disabled: number;
    errors: string[];
  };
}

export interface ChannelEvent<T = unknown> {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  data: T;
  metadata: Record<string, unknown>;
}

// Event channels
export type ScannerEvent = ChannelEvent<{
  type: 'file_change' | 'prp_update' | 'signal_detected' | 'token_alert';
  details: unknown;
  data?: unknown;
  content?: string;
  source?: string;
}>;

export type InspectorEvent = ChannelEvent<{
  type: 'signal_classified' | 'payload_prepared' | 'recommendation_generated';
  payload: InspectorPayload;
}>;

export type OrchestratorEvent = ChannelEvent<{
  type: 'decision_made' | 'agent_spawned' | 'task_assigned' | 'checkpoint_reached';
  details: unknown;
}>;

export interface InspectorResult {
  originalSignal?: Signal;
  processingResult?: {
    category: string;
    urgency: number;
    recommendedAction: string;
    [key: string]: unknown;
  };
  classification?: SignalClassification;
  recommendation?: Recommendation;
}

export interface OrchestratorDecision {
  confidence?: number;
  tools?: string[];
  action?: string;
  reasoning?: string;
  decision?: string;
  targetAgent?: string;
}

export interface OrchestratorAction {
  status?: string;
  result?: unknown;
  action?: string;
}

export interface InspectorAnalysisResult {
  category: string;
  priority: string;
  severity: string;
  confidence: number;
  urgency: number;
  recommendedAction: string;
  implementation_analysis?: {
    code_quality: number;
    test_coverage: number;
    performance_impact: string;
    security_considerations: string;
    dependencies: string[];
    complexity: string;
  };
  [key: string]: unknown;
}

export interface ClassificationResult {
  category: string;
  priority: string;
  severity: string;
  confidence: number;
  priorityIssues: string[];
  riskAssessment: Record<string, unknown>;
  nextActions: string[];
  overallPriority: string;
}

export interface Issue {
  id: string;
  type: string;
  severity: string;
  description: string;
  recommendation?: string;
  [key: string]: unknown;
}

export interface SignalMetrics {
  totalProcessed: number;
  totalEscalated: number;
  totalIgnored: number;
  averageProcessingTime: number;
  priorityDistribution: Record<string, number>;
  [key: string]: unknown;
}

export interface StepDefinition {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<void>;
  validate?: () => boolean;
  [key: string]: unknown;
}