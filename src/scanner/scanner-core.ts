import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'chokidar';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { PRPParser } from './prp-parser';
import { TokenAccountant } from './token-accountant';
import { FileHasher } from '../shared/tools/file-hasher.js';
import { SignalDetectorImpl } from './signal-detector';
import { GitStatusMonitor } from './git-monitor';
import { SignalData, DetectedSignal, FileChangeData } from './types';

/**
 * High-performance scanner for monitoring worktrees, git state, and PRP changes
 * Designed to handle hundreds of worktrees and thousands of changes efficiently
 */
export interface ScannerConfig {
  worktreesRoot: string;
  mainRepoPath: string;
  scanInterval: number; // milliseconds
  maxConcurrentWorktrees: number;
  fileHashCacheSize: number;
  signalQueueSize: number;
}

export interface ScanEvent {
  type: 'worktree_change' | 'git_change' | 'prp_change' | 'signal_detected' | 'system_event';
  timestamp: Date;
  source: string; // worktree name or 'system'
  data: unknown;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface WorktreeStatus {
  name: string;
  path: string;
  lastModified: Date;
  branch: string;
  commit: string;
  status: 'clean' | 'dirty' | 'conflict' | 'diverged';
  fileChanges: FileChange[];
  prpFiles: string[];
  signals: DetectedSignal[];
  tokenUsage: TokenUsage;
}

export interface FileChange {
  path: string;
  hash: string;
  size: number;
  lastModified: Date;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  estimatedTokens?: number;
}


export interface TokenUsage {
  agentId?: string;
  agentType?: string;
  totalTokens: number;
  requestCount: number;
  lastReset: Date;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
}

/**
 * Core Scanner class - optimized for performance and scalability
 */
export class ScannerCore extends EventEmitter {
  private config: ScannerConfig;
  private fileWatcher: FSWatcher | null = null;
  private worktrees: Map<string, WorktreeStatus> = new Map();
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private isScanning = false;

  // Component dependencies
  private prpParser: PRPParser;
  private tokenAccountant: TokenAccountant;
  private fileHasher: FileHasher;
  private signalDetector: SignalDetectorImpl;
  private gitMonitor: GitStatusMonitor;

  // Performance metrics
  private scanMetrics = {
    totalScans: 0,
    avgScanTime: 0,
    peakWorktrees: 0,
    totalEvents: 0,
    errors: 0
  };

  // Additional metrics for Prometheus
  private eventQueue: any[] = [];
  private fileChangeCount = { added: 0, modified: 0, deleted: 0, renamed: 0 };
  private signalCounts: Map<string, number> = new Map();
  private tokenUsage: Map<string, any> = new Map();
  private lastScanTime = 0;

  constructor(config: ScannerConfig) {
    super();
    this.config = config;

    // Initialize components
    this.prpParser = new PRPParser();
    this.tokenAccountant = new TokenAccountant();
    this.fileHasher = new FileHasher(config.fileHashCacheSize);
    this.signalDetector = new SignalDetectorImpl();
    this.gitMonitor = new GitStatusMonitor();
  }

  /**
   * Start the scanner
   */
  async start(): Promise<void> {
    logger.info(`🚀 Starting scanner for worktrees: ${this.config.worktreesRoot}`);

    try {
      // Discover existing worktrees
      await this.discoverWorktrees();

      // Start file watching
      this.startFileWatcher();

      // Start periodic scanning
      this.startPeriodicScanning();

      // Initial scan
      await this.performScan();

      logger.info(`✅ Scanner started. Monitoring ${this.worktrees.size} worktrees`);
      this.emit('scanner:started', { worktreeCount: this.worktrees.size });

    } catch (error) {
      logger.error('❌ Failed to start scanner:', error);
      this.emit('scanner:error', error);
      throw error;
    }
  }

  /**
   * Stop the scanner
   */
  async stop(): Promise<void> {
    logger.info('🛑 Stopping scanner...');

    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }

    this.isScanning = false;
    logger.info('✅ Scanner stopped');
    this.emit('scanner:stopped');
  }

  /**
   * Get current scanner status and metrics
   */
  getStatus() {
    return {
      isScanning: this.isScanning,
      worktreeCount: this.worktrees.size,
      config: this.config,
      metrics: this.scanMetrics,
      worktrees: Array.from(this.worktrees.entries()).map(([name, status]) => ({
        name,
        branch: status.branch,
        status: status.status,
        prpFiles: status.prpFiles.length,
        signals: status.signals.length,
        lastModified: status.lastModified
      }))
    };
  }

  /**
   * Get specific worktree status
   */
  getWorktreeStatus(name: string): WorktreeStatus | null {
    return this.worktrees.get(name) ?? null;
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): Map<string, TokenUsage> {
    return this.tokenAccountant.getUsageStats();
  }

  /**
   * Discover existing worktrees in the worktrees root
   */
  private async discoverWorktrees(): Promise<void> {
    try {
      const result = execSync('git worktree list', {
        cwd: this.config.mainRepoPath,
        encoding: 'utf8'
      });

      const lines = result.trim().split('\n');

      for (const line of lines) {
        const match = line.match(/^(.+?)\s+([a-f0-9]+)\s+\[(.+?)\]$/);
        if (match) {
          const [, path, commit, branch] = match;
          const name = this.getWorktreeName(path ?? '');

          await this.addWorktree(name, path ?? '', commit ?? '', branch ?? '');
        }
      }

      this.scanMetrics.peakWorktrees = Math.max(this.scanMetrics.peakWorktrees, this.worktrees.size);

    } catch (error) {
      logger.warning('⚠️  Could not discover worktrees:', error);
    }
  }

  /**
   * Add a worktree to monitoring
   */
  private async addWorktree(name: string, path: string, commit: string, branch: string): Promise<void> {
    const status: WorktreeStatus = {
      name,
      path: resolve(path),
      branch,
      commit,
      status: 'clean',
      fileChanges: [],
      prpFiles: [],
      signals: [],
      tokenUsage: this.tokenAccountant.getDefaultUsage(),
      lastModified: new Date()
    };

    // Scan for PRP files
    status.prpFiles = await this.scanPRPFiles(status.path);

    // Detect signals in PRP files
    for (const prpFile of status.prpFiles) {
      const signals = await this.signalDetector.detectSignals(prpFile);
      const detectedSignals: DetectedSignal[] = signals.map(signal => ({
        pattern: signal.type,
        type: signal.type,
        content: String((signal.data as SignalData).rawSignal ?? ''),
        line: 0,
        column: 0,
        context: String(signal.metadata.worktree ?? ''),
        priority: this.mapPriorityToLevel(signal.priority)
      }));
      status.signals.push(...detectedSignals);
    }

    this.worktrees.set(name, status);

    this.emitEvent({
      type: 'worktree_change',
      timestamp: new Date(),
      source: name,
      data: { action: 'added', status },
      priority: 'medium'
    });
  }

  /**
   * Scan for PRP files in a directory
   */
  private async scanPRPFiles(dir: string): Promise<string[]> {
    return this.prpParser.discoverPRPFiles(dir);
  }

  /**
   * Start file system watching
   */
  private startFileWatcher(): void {
    const watchPaths = [
      this.config.worktreesRoot,
      this.config.mainRepoPath
    ];

    this.fileWatcher = watch(watchPaths, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**'
      ],
      persistent: true,
      ignoreInitial: true
    });

    this.fileWatcher.on('change', async (path) => {
      await this.handleFileChange(path, 'modified');
    });

    this.fileWatcher.on('add', async (path) => {
      await this.handleFileChange(path, 'added');
    });

    this.fileWatcher.on('unlink', async (path) => {
      await this.handleFileChange(path, 'deleted');
    });
  }

  /**
   * Handle file system changes
   */
  private async handleFileChange(filePath: string, changeType: 'added' | 'modified' | 'deleted'): Promise<void> {
    try {
      const worktree = this.findWorktreeForFile(filePath);
      if (!worktree) {
        return;
      }

      const relativePath = filePath.replace(worktree.path + '/', '');
      const fileChange: FileChange = {
        path: relativePath,
        hash: '',
        size: 0,
        lastModified: new Date(),
        changeType,
        estimatedTokens: this.estimateFileTokens(relativePath)
      };

      // Calculate hash if file exists
      if (changeType !== 'deleted' && existsSync(filePath)) {
        const hashResult = await this.fileHasher.hashFile(filePath);
        fileChange.hash = hashResult.hash;
        fileChange.size = statSync(filePath).size;
        fileChange.lastModified = statSync(filePath).mtime;
      }

      // Update worktree status
      const status = this.worktrees.get(worktree.name);
      if (status) {
        // Remove old version of this file change
        status.fileChanges = status.fileChanges.filter(fc => fc.path !== relativePath);

        if (changeType !== 'deleted') {
          status.fileChanges.push(fileChange);
        }

        status.lastModified = new Date();
        status.status = 'dirty';

        // If this is a PRP file, re-scan for signals
        if (this.isPRPFile(relativePath)) {
          if (changeType === 'deleted') {
            status.prpFiles = status.prpFiles.filter(f => f !== relativePath);
          } else {
            if (!status.prpFiles.includes(relativePath)) {
              status.prpFiles.push(relativePath);
            }

            const signals = await this.signalDetector.detectSignals(filePath);
            // Remove old signals from this file and add new ones
            status.signals = status.signals.filter(s => !s.context.includes(relativePath));
            const detectedSignals: DetectedSignal[] = signals.map(signal => ({
              pattern: signal.type,
              type: signal.type,
              content: String((signal.data as SignalData).rawSignal ?? ''),
              line: 0,
              column: 0,
              context: `${relativePath} - ${String((signal.data as SignalData).rawSignal ?? '')}`,
              priority: this.mapPriorityToLevel(signal.priority)
            }));
            status.signals.push(...detectedSignals);
          }
        }

        this.emitEvent({
          type: 'worktree_change',
          timestamp: new Date(),
          source: worktree.name,
          data: { fileChange, isPRP: this.isPRPFile(relativePath) },
          priority: 'medium'
        });
      }
    } catch (error) {
      logger.error(`❌ Error handling file change for ${filePath}:`, error);
      this.scanMetrics.errors++;
    }
  }

  /**
   * Start periodic scanning
   */
  private startPeriodicScanning(): void {
    this.scanTimer = setInterval(async () => {
      if (!this.isScanning) {
        await this.performScan();
      }
    }, this.config.scanInterval);
  }

  /**
   * Perform comprehensive scan of all worktrees
   */
  private async performScan(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      // Update git status for all worktrees
      for (const [name, worktree] of Array.from(this.worktrees.entries())) {
        const gitStatus = await this.gitMonitor.getGitStatus(worktree.path);

        const statusChanged = worktree.status !== gitStatus.status ||
                           worktree.branch !== gitStatus.branch ||
                           worktree.commit !== gitStatus.commit;

        if (statusChanged) {
          const oldStatus = worktree.status;
          worktree.status = gitStatus.status;
          worktree.branch = gitStatus.branch;
          worktree.commit = gitStatus.commit;
          worktree.fileChanges = gitStatus.fileChanges.map(fc => ({
            path: fc.path,
            hash: '',
            size: 0,
            lastModified: new Date(),
            changeType: (fc as FileChangeData).type ?? 'modified' as 'added' | 'modified' | 'deleted' | 'renamed',
            estimatedTokens: this.estimateFileTokens(fc.path)
          }));
          worktree.lastModified = new Date();

          this.emitEvent({
            type: 'git_change',
            timestamp: new Date(),
            source: name,
            data: {
              oldStatus,
              newStatus: gitStatus,
              fileChanges: gitStatus.fileChanges.length
            },
            priority: gitStatus.status === 'conflict' ? 'high' : 'medium'
          });
        }
      }

      // Check for approaching token limits
      const approachingLimits = this.tokenAccountant.checkApproachingLimits();
      if (approachingLimits.length > 0) {
        for (const limit of approachingLimits) {
          this.emitEvent({
            type: 'system_event',
            timestamp: new Date(),
            source: 'system',
            data: {
              type: 'token_limit_warning',
              agent: limit.agentId,
              usage: limit.current,
              limit: limit.limit,
              percentUsed: limit.percentUsed
            },
            priority: limit.percentUsed > 90 ? 'critical' : 'high'
          });
        }
      }

      this.scanMetrics.totalScans++;

    } catch (error) {
      logger.error('❌ Error during scan:', error);
      this.scanMetrics.errors++;
      this.emit('scanner:error', error);
    } finally {
      const scanTime = Date.now() - startTime;
      this.scanMetrics.avgScanTime =
        (this.scanMetrics.avgScanTime * (this.scanMetrics.totalScans - 1) + scanTime) /
        this.scanMetrics.totalScans;

      this.isScanning = false;
    }
  }

  /**
   * Find which worktree a file belongs to
   */
  private findWorktreeForFile(filePath: string): WorktreeStatus | null {
    for (const worktree of Array.from(this.worktrees.values())) {
      if (filePath.startsWith(worktree.path)) {
        return worktree;
      }
    }
    return null;
  }

  /**
   * Get worktree name from path
   */
  private getWorktreeName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] ?? path;
  }

  /**
   * Check if file is a PRP file
   */
  private isPRPFile(filePath: string): boolean {
    return this.prpParser.isPRPFile(filePath);
  }

  /**
   * Estimate token count for a file
   */
  private estimateFileTokens(filePath: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    // This will be refined by the token accountant
    const extension = filePath.split('.').pop()?.toLowerCase();

    // File type multipliers
    const multipliers: Record<string, number> = {
      'md': 1.3,      // Markdown has more metadata
      'js': 1.2,      // Code has syntax overhead
      'ts': 1.3,      // TypeScript has more syntax
      'json': 0.8,    // JSON is dense
      'yml': 0.9,     // YAML is fairly dense
      'yaml': 0.9,
      'txt': 1.0     // Plain text
    };

    const multiplier = multipliers[extension ?? ''] ?? 1.0;
    return Math.ceil(1000 * multiplier); // Placeholder, will be calculated accurately
  }

  /**
   * Map numeric priority to priority level
   */
  private mapPriorityToLevel(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority >= 8) {
      return 'critical';
    }
    if (priority >= 6) {
      return 'high';
    }
    if (priority >= 3) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Emit an event with queue management
   */
  private emitEvent(event: ScanEvent): void {
    this.scanMetrics.totalEvents++;
    this.emit('scanner:event', event);
  }

  /**
   * Get comprehensive scanner metrics for Prometheus
   */
  public getMetrics(): any {
    const worktrees = Array.from(this.worktrees.values());

    // Aggregate signals from all worktrees
    const allSignals: any[] = [];
    const allTokenUsage: { [key: string]: any } = {};

    worktrees.forEach(wt => {
      // Collect signals
      if (wt.signals) {
        allSignals.push(...wt.signals.map(s => ({
          type: s.type,
          severity: s.priority,
          content: s.content,
          context: s.context
        })));
      }

      // Collect token usage
      if (wt.tokenUsage) {
        allTokenUsage[wt.name] = {
          agentId: wt.tokenUsage.agentId || wt.name,
          agentType: wt.tokenUsage.agentType || 'worktree',
          totalTokens: wt.tokenUsage.totalTokens,
          requestCount: wt.tokenUsage.requestCount,
          dailyLimit: wt.tokenUsage.dailyLimit,
          weeklyLimit: wt.tokenUsage.weeklyLimit,
          monthlyLimit: wt.tokenUsage.monthlyLimit
        };
      }
    });

    return {
      scanMetrics: {
        ...this.scanMetrics,
        lastScanTime: this.lastScanTime,
        avgScanTimeMs: this.scanMetrics.avgScanTime
      },
      worktrees: worktrees.map(wt => ({
        name: wt.name,
        path: wt.path,
        branch: wt.branch,
        commit: wt.commit,
        status: wt.status,
        lastModified: wt.lastModified,
        fileChanges: wt.fileChanges,
        prpFiles: wt.prpFiles,
        signals: wt.signals,
        tokenUsage: wt.tokenUsage
      })),
      signals: allSignals,
      tokenUsage: allTokenUsage,
      eventQueueSize: this.eventQueue.length,
      fileHashCacheSize: this.fileHasher?.['cacheSize'] || 0,
      config: {
        scanInterval: this.config.scanInterval,
        maxConcurrentWorktrees: this.config.maxConcurrentWorktrees,
        fileHashCacheSize: this.config.fileHashCacheSize,
        signalQueueSize: this.config.signalQueueSize
      }
    };
  }

  /**
   * Get current event queue size
   */
  public getEventQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Get file hash cache size
   */
  public getFileHashCacheSize(): number {
    return this.fileHasher?.['cacheSize'] || 0;
  }

  /**
   * Get worktree count by status
   */
  public getWorktreeStatusCounts(): { [status: string]: number } {
    const counts = { clean: 0, dirty: 0, conflict: 0, diverged: 0 };
    this.worktrees.forEach(wt => {
      if (counts[wt.status] !== undefined) {
        counts[wt.status]++;
      }
    });
    return counts;
  }

  /**
   * Get file change statistics
   */
  public getFileChangeStats(): { [type: string]: number } {
    const stats = { added: 0, modified: 0, deleted: 0, renamed: 0 };
    this.worktrees.forEach(wt => {
      wt.fileChanges.forEach(fc => {
        if (stats[fc.changeType] !== undefined) {
          stats[fc.changeType]++;
        }
      });
    });
    return stats;
  }

  /**
   * Get signal statistics
   */
  public getSignalStats(): { [type: string]: number } {
    const stats: { [key: string]: number } = {};
    this.worktrees.forEach(wt => {
      wt.signals.forEach(signal => {
        stats[signal.type] = (stats[signal.type] || 0) + 1;
      });
    });
    return stats;
  }
}