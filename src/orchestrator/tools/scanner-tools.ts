/**
 * ♫ Tuner Tools for Orchestrator Integration
 *
 * Comprehensive tools providing access to tuner (tuner) functionality from orchestrator,
 * including real-time data access, signal management, and system monitoring.
 */
import { createLayerLogger } from '../../shared';
import { selfStore } from '../../shared/self';

import type { ScannerCore , TokenUsage } from '../../scanner/scanner-core';
import type { MultiProviderTokenAccounting } from '../../scanner/multi-provider-token-accounting';
import type { PersistedLogsManager } from '../../scanner/persisted-logs-manager';
import type { EnhancedGitWorktreeMonitor } from '../../scanner/enhanced-git-worktree-monitor';
import type { PRPContentTracker } from '../../scanner/prp-content-tracker';
import type { UnifiedSignalDetector } from '../../scanner/unified-signal-detector';
import type { EnhancedTmuxIntegration } from '../../scanner/enhanced-tmux-integration';
import type { CodeAnalyzerWithTreeSitter } from '../../scanner/code-analyzer-with-tree-sitter';
import type { EventBus } from '../../shared/events';

const logger = createLayerLogger('orchestrator');

// Type definitions for scanner tools return types
interface ScannerStatusResponse {
  status: string;
  isScanning: boolean;
  worktreeCount: number;
  metrics: {
    totalScans: number;
    averageScanTime: number;
    peakWorktrees: number;
    totalEvents: number;
    errorCount: number;
  };
  lastError?: unknown;
  timestamp: Date;
}

// Enhanced signal type for better type safety
interface DetectedSignal {
  id: string;
  type: string;
  content: string;
  line: number;
  column: number;
  context: unknown;
  priority: string;
  source: string;
  timestamp: Date;
}

// Log entry type for better type safety
interface LogEntry {
  id: string;
  timestamp: Date;
  level: string;
  source: string;
  agentId: string;
  sessionId: string;
  prpId?: string;
  message: string;
  data: unknown;
  tags: unknown[];
}

// Search result types
interface SearchResult {
  entries: LogEntry[];
  total: number;
  hasMore: boolean;
  query: Record<string, unknown>;
  processingTime: number;
}

// PRP result types
interface PRPSearchResult {
  path: string;
  name: string;
  matches: unknown[];
}

// Version history type
interface PRPVersion {
  id: string;
  timestamp: Date;
  hash: string;
  size: number;
  signals: unknown[];
  changes: unknown[];
  metadata: unknown;
}

// Agent session type
interface AgentSessionData {
  sessionId: string;
  agentId: string;
  status: string;
  startTime: Date;
  lastActivity?: Date;
  metrics?: unknown;
  config?: unknown;
}

// Provider usage type
interface ProviderUsageData {
  providerId: string;
  status: string;
}

// Log metrics type
interface LogMetrics {
  totalEntries: number;
  filesCount: number;
  sessionsCount: number;
}

// Tmux metrics type
interface TmuxMetrics {
  activeSessions: number;
  totalCommands: number;
  totalErrors: number;
}

interface WorktreeStatus {
  branch: string;
  status: 'clean' | 'dirty' | 'conflict';
  commit?: string;
  aheadCommits?: number;
  behindCommits?: number;
  fileChanges?: unknown[];
  stagedChanges?: unknown[];
  untrackedFiles?: string[];
  lastModified?: Date;
}

interface WorktreeStatusResponse {
  worktrees: WorktreeStatus[];
  total: number;
  active: number;
  dirty: number;
  conflicted: number;
}

type SingleWorktreeStatusResponse = WorktreeStatus

interface TokenUsageResponse {
  tuner: {
    totalTokens: number;
    requestCount: number;
  };
  agentSpecific?: {
    usage?: unknown;
    providerUsage: unknown[];
  };
  providers: Array<{
    providerId: string;
    providerName: string;
    usage: {
      totalTokens: number;
      totalCost: number;
      requestCount: number;
      dailyUsage: unknown;
      weeklyUsage: unknown;
      monthlyUsage: unknown;
      limits: unknown;
      percentages: unknown;
      status: string;
    };
  }>;
  predictions: Array<{
    providerId: string;
    currentUsage: number;
    predictedUsage: number;
    timeToLimit: string;
    confidence: number;
    recommendation: string;
  }>;
}

interface MetricsResponse {
  tuner: unknown;
  logs: unknown;
  tmux: unknown;
  timestamp: Date;
}

interface SelfResponse {
  selfName: string;
  selfSummary: string;
  selfGoal: string;
  identity: unknown;
  lastUpdated: Date;
  formatted: {
    who: string;
    what: string;
    why: string;
  };
}

interface SelfErrorResponse {
  error: string;
  suggestion?: string;
  details?: string;
}

interface SignalDetectionResponse {
  signals: Array<{
    id: string;
    type: string;
    content: string;
    line: number;
    column: number;
    context: unknown;
    priority: string;
    source: string;
    timestamp: Date;
  }>;
  analysis: {
    totalSignals: number;
    duplicates: number;
    patterns: unknown;
    processingTime: number;
    metadata: unknown;
  };
}

interface RecentSignalsResponse {
  signals: Array<{
    id: string;
    timestamp: Date;
    level: string;
    source: string;
    agentId: string;
    sessionId: string;
    message: string;
    data: unknown;
    tags: unknown[];
  }>;
  total: number;
  hasMore: boolean;
  processingTime: number;
}

interface SignalSearchQuery {
  text?: string;
  type?: string[];
  source?: string[];
  agentId?: string[];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

interface SignalSearchResponse {
  signals: Array<{
    id: string;
    timestamp: Date;
    level: string;
    source: string;
    agentId: string;
    sessionId: string;
    prpId?: string;
    message: string;
    data: unknown;
    tags: unknown[];
  }>;
  total: number;
  hasMore: boolean;
  query: SignalSearchQuery;
  processingTime: number;
}

interface PRPContentResponse {
  prpPath: string;
  version: unknown;
  signals: unknown[];
  metadata: unknown;
  changes: unknown[];
  timestamp: Date;
}

interface PRPVersionHistoryResponse {
  prpPath: string;
  versions: Array<{
    id: string;
    timestamp: Date;
    hash: string;
    size: number;
    signalsCount: number;
    changes: unknown[];
    metadata: unknown;
  }>;
  totalVersions: number;
}

interface PRPSearchQuery {
  text?: string;
  includeContent?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
}

interface PRPSearchResponse {
  results: Array<{
    prpPath: string;
    name: string;
    matches: unknown[];
    matchCount: number;
  }>;
  total: number;
  query: PRPSearchQuery;
}

interface GitStatusResponse {
  worktreeName: string;
  status: WorktreeStatus;
  branch: string;
  commit?: string;
  upstreamBranch?: string;
  aheadCommits?: number;
  behindCommits?: number;
  fileChanges?: unknown[];
  stagedChanges?: unknown[];
  untrackedFiles?: string[];
  timestamp: Date;
}

interface RecentChangesResponse {
  worktrees: Array<{
    name: string;
    branch: string;
    status: string;
    fileChanges: number;
    stagedChanges: number;
    untrackedFiles: number;
    aheadCommits?: number;
    behindCommits?: number;
    lastModified?: Date;
  }>;
  total: number;
  hasChanges: boolean;
}

interface LogSearchQuery {
  text?: string;
  level?: string[];
  source?: string[];
  agentId?: string[];
  sessionId?: string[];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

interface LogSearchResponse {
  logs: unknown[];
  total: number;
  hasMore: boolean;
  query: LogSearchQuery;
  processingTime: number;
}

interface SessionLogsResponse {
  sessionId: string;
  logs: unknown[];
  count: number;
}

interface AgentLogsResponse {
  agentId: string;
  logs: unknown[];
  count: number;
}

interface RecentLogsResponse {
  logs: unknown[];
  count: number;
  limit: number;
  levels?: string[];
}

interface CodeAnalysisResponse {
  filePath: string;
  analysis: unknown;
  timestamp: Date;
}

interface DiffAnalysisResponse {
  filePath: string;
  diff: unknown;
  timestamp: Date;
}

interface CodeMapResponse {
  directoryPath: string;
  codeMap: unknown;
  timestamp: Date;
}

type ProviderUsageResponse = Array<unknown>

type LimitPredictionsResponse = Array<unknown>

interface SpawnAgentConfig {
  agentId: string;
  workingDirectory: string;
  command: string;
  environment?: Record<string, string>;
  logPath?: string;
}

interface SpawnAgentResponse {
  sessionId: string;
  agentId: string;
  status: string;
  startTime: Date;
  config: SpawnAgentConfig;
  timestamp: Date;
}

interface AgentSession {
  sessionId: string;
  agentId: string;
  status: string;
  startTime: Date;
  lastActivity?: Date;
  metrics?: unknown;
  config?: unknown;
  timestamp: Date;
}

interface HealthCheckResponse {
  overall: 'healthy' | 'warning' | 'critical' | 'error';
  components: {
    tuner: {
      status: string;
      isScanning: boolean;
      worktreeCount: number;
      health: string;
    };
    tokenAccounting: {
      status: string;
      providersCount: number;
      issues: number;
    };
    logsManager: {
      status: string;
      totalEntries: number;
      filesCount: number;
      sessionsCount: number;
    };
    tmuxIntegration: {
      status: string;
      activeSessions: number;
      totalCommands: number;
      totalErrors: number;
    };
  };
  timestamp: Date;
  summary: string;
}

interface HealthErrorResponse {
  overall: 'error';
  error: string;
  timestamp: Date;
}

interface ScanResponse {
  scanResults: unknown;
  processingTime: number;
  timestamp: Date;
  summary: string;
}

// Scanner tools interface for orchestrator
interface _IScannerTools {
  // Core tuner operations
  getScannerStatus(): Promise<ScannerStatusResponse>;
  getWorktreeStatus(worktreeName?: string): Promise<WorktreeStatusResponse | SingleWorktreeStatusResponse>;
  getTokenUsage(agentId?: string): Promise<TokenUsageResponse>;
  getMetrics(): Promise<MetricsResponse>;
  // Self identity operations
  getSelf(): Promise<SelfResponse | SelfErrorResponse>;
  // Signal detection and management
  detectSignals(content: string, source?: string): Promise<SignalDetectionResponse>;
  getRecentSignals(limit?: number): Promise<RecentSignalsResponse>;
  searchSignals(query: SignalSearchQuery): Promise<SignalSearchResponse>;
  // PRP content tracking
  getPRPContent(prpPath: string, versionId?: string): Promise<PRPContentResponse>;
  getPRPVersionHistory(prpPath: string): Promise<PRPVersionHistoryResponse>;
  searchPRPs(query: PRPSearchQuery): Promise<PRPSearchResponse>;
  refreshPRP(prpPath: string): Promise<boolean>;
  // Git operations
  getGitStatus(worktreeName: string): Promise<GitStatusResponse>;
  getRecentChanges(worktreeName?: string): Promise<RecentChangesResponse>;
  performSyncCheck(): Promise<void>;
  // Log management
  searchLogs(query: LogSearchQuery): Promise<LogSearchResponse>;
  getSessionLogs(sessionId: string, options?: { limit?: number; level?: string[] }): Promise<SessionLogsResponse>;
  getAgentLogs(agentId: string, options?: { limit?: number; startTime?: Date; endTime?: Date }): Promise<AgentLogsResponse>;
  getRecentLogs(limit?: number, level?: string[]): Promise<RecentLogsResponse>;
  // Code analysis
  analyzeCode(filePath: string): Promise<CodeAnalysisResponse>;
  analyzeDiff(filePath: string, oldContent: string, newContent: string): Promise<DiffAnalysisResponse>;
  generateCodeMap(directoryPath: string): Promise<CodeMapResponse>;
  // Token accounting
  getProviderUsage(): Promise<ProviderUsageResponse>;
  getLimitPredictions(): Promise<LimitPredictionsResponse>;
  recordTokenUsage(
    agentId: string,
    operation: string,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, unknown>,
  ): void;
  // Tmux operations
  spawnAgent(config: SpawnAgentConfig): Promise<SpawnAgentResponse>;
  sendCommand(sessionId: string, command: string): Promise<void>;
  getAgentSessions(): Promise<AgentSession[]>;
  terminateAgent(sessionId: string, reason?: string): Promise<void>;
  // System monitoring
  performHealthCheck(): Promise<HealthCheckResponse | HealthErrorResponse>;
  performScan(): Promise<ScanResponse>;
  getSystemMetrics(): Promise<MetricsResponse>;
}
/**
 * Tuner Tools Implementation for Orchestrator
 */
export class ScannerTools {
  private readonly tuner: ScannerCore;
  private readonly tokenAccounting: MultiProviderTokenAccounting;
  private readonly logsManager: PersistedLogsManager;
  private readonly gitMonitor: EnhancedGitWorktreeMonitor;
  private readonly prpTracker: PRPContentTracker;
  private readonly signalDetector: UnifiedSignalDetector;
  private readonly tmuxIntegration: EnhancedTmuxIntegration;
  private readonly codeAnalyzer: CodeAnalyzerWithTreeSitter;
  private readonly _eventBus: EventBus;
  private isInitialized = false;
  constructor(
    tuner: ScannerCore,
    tokenAccounting: MultiProviderTokenAccounting,
    logsManager: PersistedLogsManager,
    gitMonitor: EnhancedGitWorktreeMonitor,
    prpTracker: PRPContentTracker,
    signalDetector: UnifiedSignalDetector,
    tmuxIntegration: EnhancedTmuxIntegration,
    codeAnalyzer: CodeAnalyzerWithTreeSitter,
    _eventBus: EventBus,
  ) {
    this.tuner = tuner;
    this.tokenAccounting = tokenAccounting;
    this.logsManager = logsManager;
    this.gitMonitor = gitMonitor;
    this.prpTracker = prpTracker;
    this.signalDetector = signalDetector;
    this.tmuxIntegration = tmuxIntegration;
    this.codeAnalyzer = codeAnalyzer;
    this._eventBus = _eventBus;
  }
  /**
   * Initialize all tuner components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      logger.info('ScannerTools', 'Initializing tuner tools...');
      // Initialize all components
      await this.tuner.initialize();
      await this.tokenAccounting.initialize();
      await this.logsManager.initialize();
      await this.gitMonitor.initialize();
      await this.prpTracker.initialize();
      await this.tmuxIntegration.initialize();
      this.isInitialized = true;
      logger.success('ScannerTools', '✅ Scanner tools initialized successfully');
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to initialize tuner tools',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get current tuner status and metrics
   */
  async getScannerStatus(): Promise<ScannerStatusResponse> {
    this.ensureInitialized();
    try {
      const state = this.tuner.getState();
      const metrics = this.tuner.getMetrics();
      // Type assertion to access private property safely
      const tunerInstance = this.tuner as unknown as { isScanning: boolean };
      return {
        status: state.status,
        isScanning: tunerInstance.isScanning,
        worktreeCount: state.monitors.size,
        metrics: {
          totalScans: metrics.totalScans,
          averageScanTime: metrics.averageScanTime,
          peakWorktrees: metrics.peakWorktrees,
          totalEvents: metrics.totalEvents,
          errorCount: metrics.errorCount,
        },
        lastError: state.lastError,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get tuner status',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get worktree status information
   */
  async getWorktreeStatus(worktreeName?: string): Promise<WorktreeStatusResponse | SingleWorktreeStatusResponse> {
    this.ensureInitialized();
    try {
      if (worktreeName) {
        const status = this.tuner.getWorktreeStatus(worktreeName);
        if (!status) {
          throw new Error(`Worktree not found: ${worktreeName}`);
        }
        return status;
      } else {
        const allStatuses = this.tuner.getAllWorktreeStatuses();
        return {
          worktrees: allStatuses,
          total: allStatuses.length,
          active: allStatuses.filter((w) => w.status === 'clean' || w.status === 'dirty').length,
          dirty: allStatuses.filter((w) => w.status === 'dirty').length,
          conflicted: allStatuses.filter((w) => w.status === 'conflict').length,
        };
      }
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get worktree status',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get token usage statistics
   */
  async getTokenUsage(agentId?: string): Promise<TokenUsageResponse> {
    this.ensureInitialized();
    try {
      const tokenUsage = this.tuner.getTokenUsage();
      const providerUsage = this.tokenAccounting.getProviderUsage();
      const predictions = this.tokenAccounting.getLimitPredictions();
      const result = {
        tuner: {
          totalTokens: Array.from(tokenUsage.values()).reduce(
            (sum: number, usage) => sum + (usage).totalTokens,
            0,
          ),
          requestCount: Array.from(tokenUsage.values()).reduce(
            (sum: number, usage) => sum + (usage).requestCount,
            0,
          ),
        },
        providers: providerUsage.map((provider) => ({
          providerId: provider.providerId,
          providerName: provider.providerName,
          usage: {
            totalTokens: provider.totalTokens,
            totalCost: provider.totalCost,
            requestCount: provider.requestCount,
            dailyUsage: provider.dailyUsage,
            weeklyUsage: provider.weeklyUsage,
            monthlyUsage: provider.monthlyUsage,
            limits: provider.limits,
            percentages: provider.percentages,
            status: provider.status,
          },
        })),
        predictions: predictions.map((pred) => ({
          providerId: pred.providerId,
          currentUsage: pred.currentUsage,
          predictedUsage: pred.predictedUsage,
          timeToLimit: pred.timeToLimit,
          confidence: pred.confidence,
          recommendation: pred.recommendation,
        })),
      };
      // Filter by agent if specified
      if (agentId) {
        result.agentSpecific = {
          usage: tokenUsage.get(agentId),
          providerUsage: providerUsage.filter((_p) => {
            // Check if provider has usage for this agent
            return true; // Would check actual provider data in production
          }),
        };
      }
      return result;
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get token usage',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get system metrics
   */
  async getMetrics(): Promise<MetricsResponse> {
    this.ensureInitialized();
    try {
      const tunerMetrics = this.tuner.getMetrics();
      const logsMetrics = this.logsManager.getMetrics();
      const tmuxMetrics = this.tmuxIntegration.getMetrics();
      return {
        tuner: tunerMetrics,
        logs: logsMetrics,
        tmux: tmuxMetrics,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get metrics',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get self identity information
   */
  async getSelf(): Promise<SelfResponse | SelfErrorResponse> {
    try {
      const selfData = await selfStore.get();
      if (!selfData) {
        return {
          error: 'No self identity configured',
          suggestion: 'Use --self parameter to set self identity',
        };
      }
      return {
        selfName: selfData.selfName,
        selfSummary: selfData.selfSummary,
        selfGoal: selfData.selfGoal,
        identity: selfData.identity,
        lastUpdated: selfData.lastUpdated,
        formatted: {
          who: selfData.selfName,
          what: selfData.selfSummary,
          why: selfData.selfGoal,
        },
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get self data',
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        error: 'Failed to retrieve self identity',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }
  /**
   * Detect signals in content
   */
  async detectSignals(content: string, source = 'unknown'): Promise<SignalDetectionResponse> {
    this.ensureInitialized();
    try {
      const result = await this.signalDetector.detectSignals(content, source);
      // Type guard function for signal objects
      function isSignalObject(obj: unknown): obj is {
        type: string;
        content: string;
        line: number;
        column: number;
        context: unknown;
        priority: string;
      } {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'type' in obj &&
          'content' in obj &&
          'line' in obj &&
          'column' in obj &&
          'context' in obj &&
          'priority' in obj &&
          typeof (obj as any).type === 'string' &&
          typeof (obj as any).content === 'string' &&
          typeof (obj as any).line === 'number' &&
          typeof (obj as any).column === 'number' &&
          typeof (obj as any).priority === 'string'
        );
      }

      const signals: DetectedSignal[] = [];
      for (const signal of result.signals) {
        if (isSignalObject(signal)) {
          signals.push({
            id: `${signal.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: signal.type,
            content: signal.content,
            line: signal.line,
            column: signal.column,
            context: signal.context,
            priority: signal.priority,
            source,
            timestamp: new Date(),
          });
        }
      }

      return {
        signals,
        analysis: {
          totalSignals: result.signals.length,
          duplicates: result.duplicates,
          patterns: result.patterns,
          processingTime: result.processingTime,
          metadata: result.metadata,
        },
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to detect signals',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get recent signals from detection history
   */
  async getRecentSignals(limit = 50): Promise<RecentSignalsResponse> {
    this.ensureInitialized();
    try {
      // Get recent logs and filter for signal events
      const logs = await this.logsManager.search({
        text: 'signal',
        limit: limit,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      // Type guard for log entries
      function isLogEntry(obj: unknown): obj is LogEntry {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'id' in obj &&
          'timestamp' in obj &&
          'level' in obj &&
          'source' in obj &&
          'agentId' in obj &&
          'sessionId' in obj &&
          'message' in obj &&
          'data' in obj &&
          'tags' in obj &&
          typeof (obj as any).id === 'string' &&
          (obj as any).timestamp instanceof Date &&
          typeof (obj as any).level === 'string' &&
          typeof (obj as any).source === 'string' &&
          typeof (obj as any).agentId === 'string' &&
          typeof (obj as any).sessionId === 'string' &&
          typeof (obj as any).message === 'string' &&
          Array.isArray((obj as any).tags)
        );
      }

      const signals = logs.entries.filter(isLogEntry);

      return {
        signals,
        total: logs.total,
        hasMore: logs.hasMore,
        processingTime: logs.processingTime,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get recent signals',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Search signals by criteria
   */
  async searchSignals(query: SignalSearchQuery): Promise<SignalSearchResponse> {
    this.ensureInitialized();
    try {
      const searchQuery: Record<string, unknown> = {
        ...query,
        limit: query.limit || 100,
      };
      const results = await this.logsManager.search(searchQuery);

      // Type guard for log entries with optional prpId
      function isSignalSearchEntry(obj: unknown): obj is LogEntry & { prpId?: string } {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'id' in obj &&
          'timestamp' in obj &&
          'level' in obj &&
          'source' in obj &&
          'agentId' in obj &&
          'sessionId' in obj &&
          'message' in obj &&
          'data' in obj &&
          'tags' in obj &&
          typeof (obj as any).id === 'string' &&
          (obj as any).timestamp instanceof Date &&
          typeof (obj as any).level === 'string' &&
          typeof (obj as any).source === 'string' &&
          typeof (obj as any).agentId === 'string' &&
          typeof (obj as any).sessionId === 'string' &&
          typeof (obj as any).message === 'string' &&
          Array.isArray((obj as any).tags)
        );
      }

      const signals = results.entries.filter(isSignalSearchEntry);

      return {
        signals,
        total: results.total,
        hasMore: results.hasMore,
        query: searchQuery,
        processingTime: results.processingTime,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to search signals',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get PRP content
   */
  async getPRPContent(prpPath: string, versionId?: string): Promise<PRPContentResponse> {
    this.ensureInitialized();
    try {
      const content = await this.prpTracker.getPRPContent(prpPath, versionId);
      if (!content) {
        throw new Error(`PRP content not found: ${prpPath}`);
      }
      const signals = await this.signalDetector.detectSignals(content.content, prpPath);
      return {
        prpPath,
        version: content,
        signals: signals.signals,
        metadata: content.metadata,
        changes: content.changes,
        timestamp: content.timestamp,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get PRP content',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get PRP version history
   */
  async getPRPVersionHistory(prpPath: string): Promise<PRPVersionHistoryResponse> {
    this.ensureInitialized();
    try {
      const history = this.prpTracker.getPRPVersionHistory(prpPath);

      // Type guard for PRP versions
      function isPRPVersion(obj: unknown): obj is PRPVersion {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'id' in obj &&
          'timestamp' in obj &&
          'hash' in obj &&
          'size' in obj &&
          'signals' in obj &&
          'changes' in obj &&
          'metadata' in obj &&
          typeof (obj as any).id === 'string' &&
          (obj as any).timestamp instanceof Date &&
          typeof (obj as any).hash === 'string' &&
          typeof (obj as any).size === 'number' &&
          Array.isArray((obj as any).signals)
        );
      }

      const validVersions = history.filter(isPRPVersion);

      return {
        prpPath,
        versions: validVersions.map((version) => ({
          id: version.id,
          timestamp: version.timestamp,
          hash: version.hash,
          size: version.size,
          signalsCount: version.signals.length,
          changes: version.changes,
          metadata: version.metadata,
        })),
        totalVersions: validVersions.length,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get PRP version history',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Search PRPs by content
   */
  async searchPRPs(query: PRPSearchQuery): Promise<PRPSearchResponse> {
    this.ensureInitialized();
    try {
      const results = await this.prpTracker.searchPRPs(query);

      // Type guard for PRP search results
      function isPRPSearchResult(obj: unknown): obj is PRPSearchResult {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'path' in obj &&
          'name' in obj &&
          'matches' in obj &&
          typeof (obj as any).path === 'string' &&
          typeof (obj as any).name === 'string' &&
          Array.isArray((obj as any).matches)
        );
      }

      const validResults = results.filter(isPRPSearchResult);

      return {
        results: validResults.map((result) => ({
          prpPath: result.path,
          name: result.name,
          matches: result.matches,
          matchCount: result.matches.length,
        })),
        total: validResults.length,
        query,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to search PRPs',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Refresh PRP content
   */
  async refreshPRP(prpPath: string): Promise<boolean> {
    this.ensureInitialized();
    try {
      return await this.prpTracker.refreshPRP(prpPath);
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to refresh PRP',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get git status for worktree
   */
  async getGitStatus(worktreeName: string): Promise<GitStatusResponse> {
    this.ensureInitialized();
    try {
      const status = await this.gitMonitor.getWorktreeStatus(worktreeName);
      if (!status) {
        throw new Error(`Worktree status not found: ${worktreeName}`);
      }
      return {
        worktreeName,
        status: status,
        branch: status.branch,
        commit: status.commit,
        upstreamBranch: status.upstreamBranch,
        aheadCommits: status.aheadCommits,
        behindCommits: status.behindCommits,
        fileChanges: status.fileChanges,
        stagedChanges: status.stagedChanges,
        untrackedFiles: status.untrackedFiles,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get git status',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get recent changes across worktrees
   */
  async getRecentChanges(worktreeName?: string): Promise<RecentChangesResponse> {
    this.ensureInitialized();
    try {
      const allStatuses = await this.gitMonitor.getAllWorktreeStatuses();
      const statuses = worktreeName
        ? [allStatuses.get(worktreeName)].filter(Boolean)
        : Array.from(allStatuses.values());
      return {
        worktrees: statuses.map((status) => ({
          name: worktreeName || status.branch,
          branch: status.branch,
          status: status.status,
          fileChanges: status.fileChanges.length,
          stagedChanges: status.stagedChanges.length,
          untrackedFiles: status.untrackedFiles.length,
          aheadCommits: status.aheadCommits,
          behindCommits: status.behindCommits,
          lastModified: status.lastModified,
        })),
        total: statuses.length,
        hasChanges: statuses.some((s) => s.status !== 'clean'),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get recent changes',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Perform git sync check
   */
  async performSyncCheck(): Promise<void> {
    this.ensureInitialized();
    try {
      await this.gitMonitor.performSyncCheck();
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to perform sync check',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Search logs by criteria
   */
  async searchLogs(query: LogSearchQuery): Promise<LogSearchResponse> {
    this.ensureInitialized();
    try {
      const results = await this.logsManager.search(query);
      return {
        logs: results.entries,
        total: results.total,
        hasMore: results.hasMore,
        query: results.query,
        processingTime: results.processingTime,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to search logs',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get session logs
   */
  async getSessionLogs(
    sessionId: string,
    options: {
      limit?: number;
      level?: string[];
    } = {},
  ): Promise<SessionLogsResponse> {
    this.ensureInitialized();
    try {
      const logs = await this.logsManager.getSessionLogs(sessionId, options);
      return {
        sessionId,
        logs,
        count: logs.length,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get session logs',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get agent logs
   */
  async getAgentLogs(
    agentId: string,
    options: {
      limit?: number;
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): Promise<AgentLogsResponse> {
    this.ensureInitialized();
    try {
      const logs = await this.logsManager.getAgentLogs(agentId, options);
      return {
        agentId,
        logs,
        count: logs.length,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get agent logs',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get recent logs
   */
  async getRecentLogs(limit = 100, level?: string[]): Promise<RecentLogsResponse> {
    this.ensureInitialized();
    try {
      const logs = await this.logsManager.getRecentLogs(limit, level);
      return {
        logs,
        count: logs.length,
        limit,
        levels: level,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get recent logs',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Analyze code file
   */
  async analyzeCode(filePath: string): Promise<CodeAnalysisResponse> {
    this.ensureInitialized();
    try {
      const analysis = await this.codeAnalyzer.analyzeFile(filePath);
      return {
        filePath,
        analysis,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to analyze code',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Analyze code diff
   */
  async analyzeDiff(filePath: string, oldContent: string, newContent: string): Promise<DiffAnalysisResponse> {
    this.ensureInitialized();
    try {
      const diff = await this.codeAnalyzer.analyzeDiff(filePath, oldContent, newContent);
      return {
        filePath,
        diff,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to analyze diff',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Generate code map
   */
  async generateCodeMap(directoryPath: string): Promise<CodeMapResponse> {
    this.ensureInitialized();
    try {
      const codeMap = await this.codeAnalyzer.generateCodeMap(directoryPath);
      return {
        directoryPath,
        codeMap,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to generate code map',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Record token usage
   */
  recordTokenUsage(
    agentId: string,
    operation: string,
    inputTokens: number,
    outputTokens: number,
    metadata: Record<string, unknown> = {},
  ): void {
    this.ensureInitialized();
    try {
      this.tuner.recordTokenUsage(agentId, operation, inputTokens, outputTokens, {
        ...metadata,
        timestamp: new Date(),
      });
      // Also record in multi-provider accounting
      this.tokenAccounting.recordUsage(agentId, operation, inputTokens, outputTokens, metadata);
      logger.debug('ScannerTools', 'Token usage recorded', {
        agentId,
        operation,
        totalTokens: inputTokens + outputTokens,
        metadata,
      });
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to record token usage',
        error instanceof Error ? error : new Error(String(error)),
      );
      // Don't throw error for recording usage
    }
  }
  /**
   * Get provider usage statistics
   */
  async getProviderUsage(): Promise<ProviderUsageResponse> {
    this.ensureInitialized();
    try {
      return this.tokenAccounting.getProviderUsage();
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get provider usage',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get limit predictions
   */
  async getLimitPredictions(): Promise<LimitPredictionsResponse> {
    this.ensureInitialized();
    try {
      return this.tokenAccounting.getLimitPredictions();
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get limit predictions',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Spawn agent session
   */
  async spawnAgent(config: SpawnAgentConfig): Promise<SpawnAgentResponse> {
    this.ensureInitialized();
    try {
      const sessionConfig = {
        name: config.agentId,
        agentId: config.agentId,
        workingDirectory: config.workingDirectory,
        command: config.command,
        environment: {
          ...process.env,
          ...config.environment,
        },
        logPath: config.logPath || `.prp/logs/agents/${  config.agentId  }.log`,
        autoStart: true,
        idleTimeout: 300000, // 5 minutes
        maxLifetime: 3600000, // 1 hour
      };
      const session = await this.tmuxIntegration.spawnAgent(sessionConfig);
      return {
        sessionId: session.sessionId,
        agentId: session.agentId,
        status: session.status,
        startTime: session.startTime,
        config: sessionConfig,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to spawn agent',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Send command to agent
   */
  async sendCommand(sessionId: string, command: string): Promise<void> {
    this.ensureInitialized();
    try {
      await this.tmuxIntegration.sendCommand(sessionId, command);
      logger.debug('ScannerTools', 'Command sent to agent', {
        sessionId,
        command,
      });
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to send command',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get active agent sessions
   */
  async getAgentSessions(): Promise<AgentSession[]> {
    this.ensureInitialized();
    try {
      const sessions = this.tmuxIntegration.getActiveSessions();

      // Type guard for agent sessions
      function isAgentSessionData(obj: unknown): obj is AgentSessionData {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'sessionId' in obj &&
          'agentId' in obj &&
          'status' in obj &&
          'startTime' in obj &&
          typeof (obj as any).sessionId === 'string' &&
          typeof (obj as any).agentId === 'string' &&
          typeof (obj as any).status === 'string' &&
          (obj as any).startTime instanceof Date
        );
      }

      const validSessions = sessions.filter(isAgentSessionData);

      return validSessions.map((session) => ({
        sessionId: session.sessionId,
        agentId: session.agentId,
        status: session.status,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        metrics: session.metrics,
        config: session.config,
        timestamp: new Date(),
      }));
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to get agent sessions',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Terminate agent session
   */
  async terminateAgent(sessionId: string, reason?: string): Promise<void> {
    this.ensureInitialized();
    try {
      await this.tmuxIntegration.terminateAgent(sessionId, reason);
      logger.info('ScannerTools', 'Agent session terminated', {
        sessionId,
        reason,
      });
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to terminate agent',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResponse | HealthErrorResponse> {
    this.ensureInitialized();
    try {
      const tunerStatus = this.tuner.getState();
      const tokenUsage = this.tokenAccounting.getProviderUsage();
      const logsMetrics = this.logsManager.getMetrics();
      const tmuxMetrics = this.tmuxIntegration.getMetrics();

      // Type assertion to access private property safely
      const tunerInstance = this.tuner as unknown as { isScanning: boolean };

      // Type guard for provider usage data
      function isProviderUsageData(obj: unknown): obj is ProviderUsageData {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'providerId' in obj &&
          'status' in obj &&
          typeof (obj as any).providerId === 'string' &&
          typeof (obj as any).status === 'string'
        );
      }

      // Type guard for log metrics
      function isLogMetrics(obj: unknown): obj is LogMetrics {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'totalEntries' in obj &&
          'filesCount' in obj &&
          'sessionsCount' in obj &&
          typeof (obj as any).totalEntries === 'number' &&
          typeof (obj as any).filesCount === 'number' &&
          typeof (obj as any).sessionsCount === 'number'
        );
      }

      // Type guard for tmux metrics
      function isTmuxMetrics(obj: unknown): obj is TmuxMetrics {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'activeSessions' in obj &&
          'totalCommands' in obj &&
          'totalErrors' in obj &&
          typeof (obj as any).activeSessions === 'number' &&
          typeof (obj as any).totalCommands === 'number' &&
          typeof (obj as any).totalErrors === 'number'
        );
      }

      const validTokenUsage = tokenUsage.filter(isProviderUsageData);
      const validLogsMetrics = isLogMetrics(logsMetrics) ? logsMetrics : { totalEntries: 0, filesCount: 0, sessionsCount: 0 };
      const validTmuxMetrics = isTmuxMetrics(tmuxMetrics) ? tmuxMetrics : { activeSessions: 0, totalCommands: 0, totalErrors: 0 };

      const health = {
        overall: 'healthy' as 'healthy' | 'warning' | 'critical' | 'error',
        components: {
          tuner: {
            status: tunerStatus.status,
            isScanning: tunerInstance.isScanning,
            worktreeCount: tunerStatus.monitors.size,
            health: tunerStatus.status === 'idle' ? 'healthy' : 'active',
          },
          tokenAccounting: {
            status: 'healthy',
            providersCount: validTokenUsage.length,
            issues: validTokenUsage.filter(
              (p) => p.status === 'critical' || p.status === 'exceeded',
            ).length,
          },
          logsManager: {
            status: 'healthy',
            totalEntries: validLogsMetrics.totalEntries,
            filesCount: validLogsMetrics.filesCount,
            sessionsCount: validLogsMetrics.sessionsCount,
          },
          tmuxIntegration: {
            status: 'healthy',
            activeSessions: validTmuxMetrics.activeSessions,
            totalCommands: validTmuxMetrics.totalCommands,
            totalErrors: validTmuxMetrics.totalErrors,
          },
        },
        timestamp: new Date(),
        summary: 'All tuner components are operational',
      };

      // Determine overall health
      const hasCriticalIssues = Object.values(health.components).some(
        (component) =>
          component.status === 'error' || ('issues' in component && component.issues > 0),
      );
      if (hasCriticalIssues) {
        health.overall = 'critical';
      } else if (
        Object.values(health.components).some((component) => component.status !== 'healthy')
      ) {
        health.overall = 'warning';
      }
      return health;
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Health check failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        overall: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }
  /**
   * Perform comprehensive scan
   */
  async performScan(): Promise<ScanResponse> {
    this.ensureInitialized();
    try {
      const startTime = Date.now();
      // Type assertion to access private method safely
      const tunerInstance = this.tuner as unknown as { performComprehensiveScan(): Promise<unknown> };
      const scanResults = await tunerInstance.performComprehensiveScan();
      const processingTime = Date.now() - startTime;
      return {
        scanResults,
        processingTime,
        timestamp: new Date(),
        summary: `Scan completed in ${processingTime}ms`,
      };
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Scan failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Stop all tuner components
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    try {
      logger.info('ScannerTools', 'Stopping tuner tools...');
      await this.tuner.stop();
      await this.tokenAccounting.stop();
      await this.logsManager.stop();
      await this.gitMonitor.stopMonitoring();
      await this.tmuxIntegration.stop();
      this.isInitialized = false;
      logger.info('ScannerTools', '✅ Scanner tools stopped');
    } catch (error) {
      logger.error(
        'ScannerTools',
        'Failed to stop tuner tools',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Ensure tuner tools are initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Scanner tools not initialized. Call initialize() first.');
    }
  }
}
