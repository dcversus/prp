/**
 * ♫ Tuner Tools for Orchestrator Integration
 *
 * Comprehensive tools providing access to tuner (tuner) functionality from orchestrator,
 * including real-time data access, signal management, and system monitoring.
 */

import {
  EnhancedScannerCore
} from '../../scanner/enhanced-scanner-core';
import {
  MultiProviderTokenAccounting
} from '../../scanner/multi-provider-token-accounting';
import {
  PersistedLogsManager
} from '../../scanner/persisted-logs-manager';
import {
  EnhancedGitWorktreeMonitor
} from '../../scanner/enhanced-git-worktree-monitor';
import {
  PRPContentTracker
} from '../../scanner/prp-content-tracker';
import {
  EnhancedSignalDetectorWithPatterns
} from '../../scanner/enhanced-signal-detector-with-patterns';
import {
  EnhancedTmuxIntegration
} from '../../scanner/enhanced-tmux-integration';
import {
  CodeAnalyzerWithTreeSitter
} from '../../scanner/code-analyzer-with-tree-sitter';

import { EventBus } from '../../shared/events';
import { createLayerLogger } from '../../shared';
import { selfStore } from '../../shared/self';

const logger = createLayerLogger('orchestrator');

// Scanner tools interface for orchestrator
interface _IScannerTools {
  // Core tuner operations
  getScannerStatus(): Promise<any>;
  getWorktreeStatus(worktreeName?: string): Promise<any>;
  getTokenUsage(agentId?: string): Promise<any>;
  getMetrics(): Promise<any>;

  // Self identity operations
  getSelf(): Promise<any>;

  // Signal detection and management
  detectSignals(content: string, source?: string): Promise<any>;
  getRecentSignals(limit?: number): Promise<any>;
  searchSignals(query: any): Promise<any>;

  // PRP content tracking
  getPRPContent(prpPath: string, versionId?: string): Promise<any>;
  getPRPVersionHistory(prpPath: string): Promise<any>;
  searchPRPs(query: any): Promise<any>;
  refreshPRP(prpPath: string): Promise<boolean>;

  // Git operations
  getGitStatus(worktreeName: string): Promise<any>;
  getRecentChanges(worktreeName?: string): Promise<any>;
  performSyncCheck(): Promise<void>;

  // Log management
  searchLogs(query: any): Promise<any>;
  getSessionLogs(sessionId: string, options?: any): Promise<any>;
  getAgentLogs(agentId: string, options?: any): Promise<any>;
  getRecentLogs(limit?: number, level?: string[]): Promise<any>;

  // Code analysis
  analyzeCode(filePath: string): Promise<any>;
  analyzeDiff(filePath: string, oldContent: string, newContent: string): Promise<any>;
  generateCodeMap(directoryPath: string): Promise<any>;

  // Token accounting
  getProviderUsage(): Promise<any>;
  getLimitPredictions(): Promise<any>;
  recordTokenUsage(agentId: string, operation: string, inputTokens: number, outputTokens: number, metadata?: Record<string, unknown>): void;

  // Tmux operations
  spawnAgent(config: any): Promise<any>;
  sendCommand(sessionId: string, command: string): Promise<void>;
  getAgentSessions(): Promise<any[]>;
  terminateAgent(sessionId: string, reason?: string): Promise<void>;

  // System monitoring
  performHealthCheck(): Promise<any>;
  performScan(): Promise<any>;
  getSystemMetrics(): Promise<any>;
}

/**
 * Tuner Tools Implementation for Orchestrator
 */
export class ScannerTools {
  private tuner: EnhancedScannerCore;
  private tokenAccounting: MultiProviderTokenAccounting;
  private logsManager: PersistedLogsManager;
  private gitMonitor: EnhancedGitWorktreeMonitor;
  private prpTracker: PRPContentTracker;
  private signalDetector: EnhancedSignalDetectorWithPatterns;
  private tmuxIntegration: EnhancedTmuxIntegration;
  private codeAnalyzer: CodeAnalyzerWithTreeSitter;
  private _eventBus: EventBus;
  private isInitialized = false;

  constructor(
    tuner: EnhancedScannerCore,
    tokenAccounting: MultiProviderTokenAccounting,
    logsManager: PersistedLogsManager,
    gitMonitor: EnhancedGitWorktreeMonitor,
    prpTracker: PRPContentTracker,
    signalDetector: EnhancedSignalDetectorWithPatterns,
    tmuxIntegration: EnhancedTmuxIntegration,
    codeAnalyzer: CodeAnalyzerWithTreeSitter,
    _eventBus: EventBus
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
      logger.error('ScannerTools', 'Failed to initialize tuner tools', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get current tuner status and metrics
   */
  async getScannerStatus(): Promise<any> {
    this.ensureInitialized();

    try {
      const state = this.tuner.getState();
      const metrics = this.tuner.getMetrics();

      return {
        status: state.status,
        isScanning: this.tuner['isScanning'],
        worktreeCount: state.monitors.size,
        metrics: {
          totalScans: metrics.totalScans,
          averageScanTime: metrics.averageScanTime,
          peakWorktrees: metrics.peakWorktrees,
          totalEvents: metrics.totalEvents,
          errorCount: metrics.errorCount
        },
        lastError: state.lastError,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get tuner status', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get worktree status information
   */
  async getWorktreeStatus(worktreeName?: string): Promise<any> {
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
          active: allStatuses.filter(w => w.status === 'clean' || w.status === 'dirty').length,
          dirty: allStatuses.filter(w => w.status === 'dirty').length,
          conflicted: allStatuses.filter(w => w.status === 'conflict').length
        };
      }

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get worktree status', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get token usage statistics
   */
  async getTokenUsage(agentId?: string): Promise<any> {
    this.ensureInitialized();

    try {
      const tokenUsage = this.tuner.getTokenUsage();
      const providerUsage = this.tokenAccounting.getProviderUsage();
      const predictions = this.tokenAccounting.getLimitPredictions();

      const result = {
        tuner: {
          totalTokens: Array.from(tokenUsage.values()).reduce((sum, usage) => sum + usage.totalTokens, 0),
          requestCount: Array.from(tokenUsage.values()).reduce((sum, usage) => sum + usage.requestCount, 0)
        },
        providers: providerUsage.map(provider => ({
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
            status: provider.status
          }
        })),
        predictions: predictions.map(pred => ({
          providerId: pred.providerId,
          currentUsage: pred.currentUsage,
          predictedUsage: pred.predictedUsage,
          timeToLimit: pred.timeToLimit,
          confidence: pred.confidence,
          recommendation: pred.recommendation
        }))
      };

      // Filter by agent if specified
      if (agentId) {
        result.agentSpecific = {
          usage: tokenUsage.get(agentId),
          providerUsage: providerUsage.filter((_p) => {
            // Check if provider has usage for this agent
            return true; // Would check actual provider data in production
          })
        };
      }

      return result;

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get token usage', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getMetrics(): Promise<any> {
    this.ensureInitialized();

    try {
      const tunerMetrics = this.tuner.getMetrics();
      const logsMetrics = this.logsManager.getMetrics();
      const tmuxMetrics = this.tmuxIntegration.getMetrics();

      return {
        tuner: tunerMetrics,
        logs: logsMetrics,
        tmux: tmuxMetrics,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get metrics', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get self identity information
   */
  async getSelf(): Promise<any> {
    try {
      const selfData = await selfStore.get();

      if (!selfData) {
        return {
          error: 'No self identity configured',
          suggestion: 'Use --self parameter to set self identity'
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
          why: selfData.selfGoal
        }
      };
    } catch (error) {
      logger.error('ScannerTools', 'Failed to get self data', error instanceof Error ? error : new Error(String(error)));
      return {
        error: 'Failed to retrieve self identity',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Detect signals in content
   */
  async detectSignals(content: string, source: string = 'unknown'): Promise<any> {
    this.ensureInitialized();

    try {
      const result = await this.signalDetector.detectSignals(content, source);

      return {
        signals: result.signals.map((signal: any) => ({
          id: signal.type + '_' + Date.now(),
          type: signal.type,
          content: signal.content,
          line: signal.line,
          column: signal.column,
          context: signal.context,
          priority: signal.priority,
          source,
          timestamp: new Date()
        })),
        analysis: {
          totalSignals: result.signals.length,
          duplicates: result.duplicates,
          patterns: result.patterns,
          processingTime: result.processingTime,
          metadata: result.metadata
        }
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to detect signals', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get recent signals from detection history
   */
  async getRecentSignals(limit: number = 50): Promise<any> {
    this.ensureInitialized();

    try {
      // Get recent logs and filter for signal events
      const logs = await this.logsManager.search({
        text: 'signal',
        limit: limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      return {
        signals: logs.entries.map((entry: any) => ({
          id: entry.id,
          timestamp: entry.timestamp,
          level: entry.level,
          source: entry.source,
          agentId: entry.agentId,
          sessionId: entry.sessionId,
          message: entry.message,
          data: entry.data,
          tags: entry.tags
        })),
        total: logs.total,
        hasMore: logs.hasMore,
        processingTime: logs.processingTime
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get recent signals', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search signals by criteria
   */
  async searchSignals(query: {
    text?: string;
    type?: string[];
    source?: string[];
    agentId?: string[];
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any> {
    this.ensureInitialized();

    try {
      const searchQuery: any = {
        ...query,
        limit: query.limit || 100
      };

      const results = await this.logsManager.search(searchQuery);

      return {
        signals: results.entries.map((entry: any) => ({
          id: entry.id,
          timestamp: entry.timestamp,
          level: entry.level,
          source: entry.source,
          agentId: entry.agentId,
          sessionId: entry.sessionId,
          prpId: entry.prpId,
          message: entry.message,
          data: entry.data,
          tags: entry.tags
        })),
        total: results.total,
        hasMore: results.hasMore,
        query: searchQuery,
        processingTime: results.processingTime
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to search signals', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get PRP content
   */
  async getPRPContent(prpPath: string, versionId?: string): Promise<any> {
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
        timestamp: content.timestamp
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get PRP content', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get PRP version history
   */
  async getPRPVersionHistory(prpPath: string): Promise<any> {
    this.ensureInitialized();

    try {
      const history = this.prpTracker.getPRPVersionHistory(prpPath);

      return {
        prpPath,
        versions: history.map((version: any) => ({
          id: version.id,
          timestamp: version.timestamp,
          hash: version.hash,
          size: version.size,
          signalsCount: version.signals.length,
          changes: version.changes,
          metadata: version.metadata
        })),
        totalVersions: history.length
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get PRP version history', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search PRPs by content
   */
  async searchPRPs(query: {
    text?: string;
    includeContent?: boolean;
    caseSensitive?: boolean;
    maxResults?: number;
  }): Promise<any> {
    this.ensureInitialized();

    try {
      const results = await this.prpTracker.searchPRPs(query);

      return {
        results: results.map((result: any) => ({
          prpPath: result.path,
          name: result.name,
          matches: result.matches,
          matchCount: result.matches.length
        })),
        total: results.length,
        query
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to search PRPs', error instanceof Error ? error : new Error(String(error)));
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
      logger.error('ScannerTools', 'Failed to refresh PRP', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get git status for worktree
   */
  async getGitStatus(worktreeName: string): Promise<any> {
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
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get git status', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get recent changes across worktrees
   */
  async getRecentChanges(worktreeName?: string): Promise<any> {
    this.ensureInitialized();

    try {
      const allStatuses = await this.gitMonitor.getAllWorktreeStatuses();
      const statuses = worktreeName
        ? [allStatuses.get(worktreeName)].filter(Boolean)
        : Array.from(allStatuses.values());

      return {
        worktrees: statuses.map(status => ({
          name: worktreeName || status.branch,
          branch: status.branch,
          status: status.status,
          fileChanges: status.fileChanges.length,
          stagedChanges: status.stagedChanges.length,
          untrackedFiles: status.untrackedFiles.length,
          aheadCommits: status.aheadCommits,
          behindCommits: status.behindCommits,
          lastModified: status.lastModified
        })),
        total: statuses.length,
        hasChanges: statuses.some(s => s.status !== 'clean')
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get recent changes', error instanceof Error ? error : new Error(String(error)));
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
      logger.error('ScannerTools', 'Failed to perform sync check', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search logs by criteria
   */
  async searchLogs(query: {
    text?: string;
    level?: string[];
    source?: string[];
    agentId?: string[];
    sessionId?: string[];
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    this.ensureInitialized();

    try {
      const results = await this.logsManager.search(query);

      return {
        logs: results.entries,
        total: results.total,
        hasMore: results.hasMore,
        query: results.query,
        processingTime: results.processingTime
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to search logs', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get session logs
   */
  async getSessionLogs(sessionId: string, options: {
    limit?: number;
    level?: string[];
  } = {}): Promise<any> {
    this.ensureInitialized();

    try {
      const logs = await this.logsManager.getSessionLogs(sessionId, options);

      return {
        sessionId,
        logs,
        count: logs.length
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get session logs', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get agent logs
   */
  async getAgentLogs(agentId: string, options: {
    limit?: number;
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<any> {
    this.ensureInitialized();

    try {
      const logs = await this.logsManager.getAgentLogs(agentId, options);

      return {
        agentId,
        logs,
        count: logs.length
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get agent logs', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(limit: number = 100, level?: string[]): Promise<any> {
    this.ensureInitialized();

    try {
      const logs = await this.logsManager.getRecentLogs(limit, level);

      return {
        logs,
        count: logs.length,
        limit,
        levels: level
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get recent logs', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Analyze code file
   */
  async analyzeCode(filePath: string): Promise<any> {
    this.ensureInitialized();

    try {
      const analysis = await this.codeAnalyzer.analyzeFile(filePath);

      return {
        filePath,
        analysis,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to analyze code', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Analyze code diff
   */
  async analyzeDiff(filePath: string, oldContent: string, newContent: string): Promise<any> {
    this.ensureInitialized();

    try {
      const diff = await this.codeAnalyzer.analyzeDiff(filePath, oldContent, newContent);

      return {
        filePath,
        diff,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to analyze diff', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate code map
   */
  async generateCodeMap(directoryPath: string): Promise<any> {
    this.ensureInitialized();

    try {
      const codeMap = await this.codeAnalyzer.generateCodeMap(directoryPath);

      return {
        directoryPath,
        codeMap,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to generate code map', error instanceof Error ? error : new Error(String(error)));
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
    metadata: Record<string, unknown> = {}
  ): void {
    this.ensureInitialized();

    try {
      this.tuner.recordTokenUsage(agentId, operation, inputTokens, outputTokens, {
        ...metadata,
        timestamp: new Date()
      });

      // Also record in multi-provider accounting
      this.tokenAccounting.recordUsage(
        agentId,
        operation,
        inputTokens,
        outputTokens,
        metadata
      );

      logger.debug('ScannerTools', 'Token usage recorded', {
        agentId,
        operation,
        totalTokens: inputTokens + outputTokens,
        metadata
      });

    } catch (error) {
      logger.error('ScannerTools', 'Failed to record token usage', error instanceof Error ? error : new Error(String(error)));
      // Don't throw error for recording usage
    }
  }

  /**
   * Get provider usage statistics
   */
  async getProviderUsage(): Promise<any> {
    this.ensureInitialized();

    try {
      return this.tokenAccounting.getProviderUsage();

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get provider usage', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get limit predictions
   */
  async getLimitPredictions(): Promise<any> {
    this.ensureInitialized();

    try {
      return this.tokenAccounting.getLimitPredictions();

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get limit predictions', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Spawn agent session
   */
  async spawnAgent(config: {
    agentId: string;
    workingDirectory: string;
    command: string;
    environment?: Record<string, string>;
    logPath?: string;
  }): Promise<any> {
    this.ensureInitialized();

    try {
      const sessionConfig = {
        name: config.agentId,
        agentId: config.agentId,
        workingDirectory: config.workingDirectory,
        command: config.command,
        environment: {
          ...process.env,
          ...config.environment
        },
        logPath: config.logPath || '.prp/logs/agents/' + config.agentId + '.log',
        autoStart: true,
        idleTimeout: 300000, // 5 minutes
        maxLifetime: 3600000 // 1 hour
      };

      const session = await this.tmuxIntegration.spawnAgent(sessionConfig);

      return {
        sessionId: session.sessionId,
        agentId: session.agentId,
        status: session.status,
        startTime: session.startTime,
        config: sessionConfig,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('ScannerTools', 'Failed to spawn agent', error instanceof Error ? error : new Error(String(error)));
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
        command
      });

    } catch (error) {
      logger.error('ScannerTools', 'Failed to send command', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get active agent sessions
   */
  async getAgentSessions(): Promise<any[]> {
    this.ensureInitialized();

    try {
      const sessions = this.tmuxIntegration.getActiveSessions();

      return sessions.map((session: any) => ({
        sessionId: session.sessionId,
        agentId: session.agentId,
        status: session.status,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        metrics: session.metrics,
        config: session.config,
        timestamp: new Date()
      }));

    } catch (error) {
      logger.error('ScannerTools', 'Failed to get agent sessions', error instanceof Error ? error : new Error(String(error)));
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
        reason
      });

    } catch (error) {
      logger.error('ScannerTools', 'Failed to terminate agent', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<any> {
    this.ensureInitialized();

    try {
      const tunerStatus = this.tuner.getState();
      const tokenUsage = this.tokenAccounting.getProviderUsage();
      const logsMetrics = this.logsManager.getMetrics();
      const tmuxMetrics = this.tmuxIntegration.getMetrics();

      const health = {
        overall: 'healthy',
        components: {
          tuner: {
            status: tunerStatus.status,
            isScanning: this.tuner['isScanning'],
            worktreeCount: tunerStatus.monitors.size,
            health: tunerStatus.status === 'idle' ? 'healthy' : 'active'
          },
          tokenAccounting: {
            status: 'healthy',
            providersCount: tokenUsage.length,
            issues: tokenUsage.filter((p: any) => p.status === 'critical' || p.status === 'exceeded').length
          },
          logsManager: {
            status: 'healthy',
            totalEntries: logsMetrics.totalEntries,
            filesCount: logsMetrics.filesCount,
            sessionsCount: logsMetrics.sessionsCount
          },
          tmuxIntegration: {
            status: 'healthy',
            activeSessions: tmuxMetrics.activeSessions,
            totalCommands: tmuxMetrics.totalCommands,
            totalErrors: tmuxMetrics.totalErrors
          }
        },
        timestamp: new Date(),
        summary: 'All tuner components are operational'
      };

      // Determine overall health
      const hasCriticalIssues = Object.values(health.components).some(
        component => component.status === 'error' || ('issues' in component && component.issues > 0)
      );

      if (hasCriticalIssues) {
        health.overall = 'critical';
      } else if (Object.values(health.components).some(component => component.status !== 'healthy')) {
        health.overall = 'warning';
      }

      return health;

    } catch (error) {
      logger.error('ScannerTools', 'Health check failed', error instanceof Error ? error : new Error(String(error)));
      return {
        overall: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Perform comprehensive scan
   */
  async performScan(): Promise<any> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      // Trigger scan in tuner
      const scanResults = await this.tuner['performComprehensiveScan']();

      const processingTime = Date.now() - startTime;

      return {
        scanResults,
        processingTime,
        timestamp: new Date(),
        summary: `Scan completed in ${processingTime}ms`
      };

    } catch (error) {
      logger.error('ScannerTools', 'Scan failed', error instanceof Error ? error : new Error(String(error)));
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
      logger.error('ScannerTools', 'Failed to stop tuner tools', error instanceof Error ? error : new Error(String(error)));
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