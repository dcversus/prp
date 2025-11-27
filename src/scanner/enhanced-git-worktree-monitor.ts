/**
 * ♫ Enhanced Git Worktree Monitor for @dcversus/prp Tuner
 *
 * High-performance git worktree monitoring with comprehensive change detection,
 * branch tracking, commit monitoring, and push detection capabilities.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

import { createLayerLogger, TimeUtils } from '../shared';

import type { EventBus } from '../shared/events';
import type { FileChangeData } from './types';

const execAsync = promisify(exec);
const logger = createLayerLogger('scanner');
// Git worktree configuration
interface WorktreeConfig {
  name: string;
  path: string;
  branch: string;
  commit: string;
  tracked: boolean;
  lastSync: Date;
}
// Git status information
interface GitStatus {
  branch: string;
  commit: string;
  upstreamBranch?: string;
  aheadCommits: number;
  behindCommits: number;
  status: 'clean' | 'dirty' | 'conflict' | 'diverged';
  fileChanges: FileChangeData[];
  stagedChanges: FileChangeData[];
  untrackedFiles: string[];
}
// Git commit information
interface _GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files: string[];
  stats: {
    additions: number;
    deletions: number;
    changes: number;
  };
}
// Git remote information
interface _GitRemote {
  name: string;
  url: string;
  pushUrl?: string;
  fetchUrl?: string;
}
// Branch information
interface _GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  commit: string;
  ahead: number;
  behind: number;
  tracking: boolean;
}
// Worktree monitoring metrics
interface WorktreeMetrics {
  totalCommits: number;
  totalPushes: number;
  totalBranchChanges: number;
  totalFileChanges: number;
  lastActivity: Date;
  averageCommitInterval: number; // minutes
  mostActiveFiles: Array<{ path: string; changes: number }>;
}
// Monitoring state for a worktree
interface WorktreeState {
  config: WorktreeConfig;
  status: GitStatus;
  metrics: WorktreeMetrics;
  lastCheck: Date;
  errorCount: number;
  lastError?: string;
  isActive: boolean;
}
/**
 * Enhanced Git Worktree Monitor
 */
export class EnhancedGitWorktreeMonitor extends EventEmitter {
  private readonly mainRepoPath: string;
  private readonly eventBus: EventBus;
  private readonly worktrees = new Map<string, WorktreeState>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private readonly checkIntervalMs = 30000; // 30 seconds default
  // Performance optimization
  private readonly statusCache = new Map<string, { status: GitStatus; timestamp: Date }>();
  private readonly cacheTimeoutMs = 5000; // 5 seconds cache
  constructor(mainRepoPath: string, eventBus: EventBus) {
    super();
    this.mainRepoPath = resolve(mainRepoPath);
    this.eventBus = eventBus;
  }
  /**
   * Initialize git worktree monitoring
   */
  async initialize(): Promise<void> {
    try {
      logger.info('EnhancedGitWorktreeMonitor', 'Initializing git worktree monitor...');
      // Verify this is a git repository
      await this.verifyGitRepository();
      // Discover existing worktrees
      await this.discoverWorktrees();
      // Start monitoring
      this.startMonitoring();
      logger.info(
        'EnhancedGitWorktreeMonitor',
        `✅ Git worktree monitor initialized. Monitoring ${this.worktrees.size} worktrees`,
      );
      this.emit('monitor:initialized', {
        worktreeCount: this.worktrees.size,
        mainRepoPath: this.mainRepoPath,
        timestamp: TimeUtils.now(),
      });
    } catch (error) {
      logger.error(
        'EnhancedGitWorktreeMonitor',
        'Failed to initialize git worktree monitor',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Add worktree to monitoring
   */
  async addWorktree(name: string, path: string, _branch: string): Promise<void> {
    try {
      const worktreePath = resolve(path);
      if (!existsSync(worktreePath)) {
        throw new Error(`Worktree path does not exist: ${worktreePath}`);
      }
      // Verify it's a git worktree
      const gitDir = await this.getGitDir(worktreePath);
      if (!gitDir) {
        throw new Error(`Path is not a git worktree: ${worktreePath}`);
      }
      // Get current status
      const status = await this.getGitStatus(worktreePath);
      // Create worktree state
      const worktreeState: WorktreeState = {
        config: {
          name,
          path: worktreePath,
          branch: status.branch,
          commit: status.commit,
          tracked: true,
          lastSync: TimeUtils.now(),
        },
        status,
        metrics: this.createInitialMetrics(),
        lastCheck: TimeUtils.now(),
        errorCount: 0,
        isActive: true,
      };
      this.worktrees.set(name, worktreeState);
      logger.info('EnhancedGitWorktreeMonitor', 'Worktree added to monitoring', {
        name,
        path: worktreePath,
        branch: status.branch,
      });
      this.emit('worktree:added', {
        name,
        path: worktreePath,
        branch: status.branch,
        commit: status.commit,
        timestamp: TimeUtils.now(),
      });
    } catch (error) {
      logger.error(
        'EnhancedGitWorktreeMonitor',
        'Failed to add worktree',
        error instanceof Error ? error : new Error(String(error)),
        {
          name,
          path,
        },
      );
      throw error;
    }
  }
  /**
   * Remove worktree from monitoring
   */
  removeWorktree(name: string): boolean {
    const worktree = this.worktrees.get(name);
    if (!worktree) {
      return false;
    }
    this.worktrees.delete(name);
    logger.info('EnhancedGitWorktreeMonitor', 'Worktree removed from monitoring', { name });
    this.emit('worktree:removed', {
      name,
      path: worktree.config.path,
      timestamp: TimeUtils.now(),
    });
    return true;
  }
  /**
   * Get worktree status
   */
  async getWorktreeStatus(name: string): Promise<GitStatus | null> {
    const worktree = this.worktrees.get(name);
    if (!worktree?.isActive) {
      return null;
    }
    try {
      return await this.getCachedGitStatus(worktree.config.path);
    } catch (error) {
      logger.error(
        'EnhancedGitWorktreeMonitor',
        'Failed to get worktree status',
        error instanceof Error ? error : new Error(String(error)),
        {
          name,
        },
      );
      return null;
    }
  }
  /**
   * Get all worktree statuses
   */
  async getAllWorktreeStatuses(): Promise<Map<string, GitStatus>> {
    const statuses = new Map<string, GitStatus>();
    for (const [name, worktree] of Array.from(this.worktrees.entries())) {
      if (!worktree.isActive) {
        continue;
      }
      try {
        const status = await this.getCachedGitStatus(worktree.config.path);
        statuses.set(name, status);
      } catch (error) {
        logger.warn('EnhancedGitWorktreeMonitor', 'Failed to get status for worktree', {
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return statuses;
  }
  /**
   * Get worktree metrics
   */
  getWorktreeMetrics(name: string): WorktreeMetrics | null {
    const worktree = this.worktrees.get(name);
    return worktree ? { ...worktree.metrics } : null;
  }
  /**
   * Get all monitored worktrees
   */
  getMonitoredWorktrees(): string[] {
    return Array.from(this.worktrees.keys()).filter((name) => this.worktrees.get(name)?.isActive);
  }
  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, this.checkIntervalMs);
    logger.info('EnhancedGitWorktreeMonitor', 'Git worktree monitoring started', {
      interval: this.checkIntervalMs,
      worktreeCount: this.worktrees.size,
    });
  }
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    logger.info('EnhancedGitWorktreeMonitor', 'Git worktree monitoring stopped');
  }
  /**
   * Perform manual sync check
   */
  async performSyncCheck(): Promise<void> {
    logger.info('EnhancedGitWorktreeMonitor', 'Performing manual sync check...');
    for (const [name, worktree] of Array.from(this.worktrees.entries())) {
      if (!worktree.isActive) {
        continue;
      }
      try {
        await this.checkWorktreeSync(worktree);
      } catch (error) {
        logger.error(
          'EnhancedGitWorktreeMonitor',
          'Failed to check sync for worktree',
          error instanceof Error ? error : new Error(String(error)),
          {
            name,
          },
        );
      }
    }
  }
  // Private methods
  private async verifyGitRepository(): Promise<void> {
    try {
      await execAsync('git rev-parse --git-dir', {
        cwd: this.mainRepoPath,
      });
    } catch (error) {
      throw new Error(`Not a git repository: ${this.mainRepoPath}`);
    }
  }
  private async discoverWorktrees(): Promise<void> {
    try {
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: this.mainRepoPath,
      });
      const lines = stdout.trim().split('\n');
      let currentWorktree: any = {};
      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          if (currentWorktree.path) {
            // Add previous worktree
            await this.addDiscoveredWorktree(currentWorktree);
          }
          currentWorktree = {
            path: line.substring(9).trim(),
          };
        } else if (line.startsWith('HEAD ')) {
          currentWorktree.commit = line.substring(5).trim();
        } else if (line.startsWith('branch ')) {
          currentWorktree.branch = line.substring(7).trim().replace('refs/heads/', '');
        }
      }
      // Add last worktree
      if (currentWorktree.path) {
        await this.addDiscoveredWorktree(currentWorktree);
      }
    } catch (error) {
      logger.warn('EnhancedGitWorktreeMonitor', 'Could not discover worktrees', { error });
    }
  }
  private async addDiscoveredWorktree(worktreeData: any): Promise<void> {
    try {
      const name = this.extractWorktreeName(worktreeData.path);
      const status = await this.getGitStatus(worktreeData.path);
      const worktreeState: WorktreeState = {
        config: {
          name,
          path: resolve(worktreeData.path),
          branch: worktreeData.branch || status.branch,
          commit: worktreeData.commit || status.commit,
          tracked: true,
          lastSync: TimeUtils.now(),
        },
        status,
        metrics: this.createInitialMetrics(),
        lastCheck: TimeUtils.now(),
        errorCount: 0,
        isActive: true,
      };
      this.worktrees.set(name, worktreeState);
      logger.debug('EnhancedGitWorktreeMonitor', 'Discovered worktree', {
        name,
        path: worktreeData.path,
        branch: status.branch,
      });
    } catch (error) {
      logger.warn('EnhancedGitWorktreeMonitor', 'Failed to add discovered worktree', {
        path: worktreeData.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  private async performMonitoringCycle(): Promise<void> {
    for (const [name, worktree] of this.worktrees.entries()) {
      if (!worktree.isActive) {
        continue;
      }
      try {
        await this.checkWorktree(worktree);
      } catch (error) {
        worktree.errorCount++;
        worktree.lastError = error instanceof Error ? error.message : String(error);
        logger.error(
          'EnhancedGitWorktreeMonitor',
          'Error in monitoring cycle',
          error instanceof Error ? error : new Error(String(error)),
          {
            name,
            errorCount: worktree.errorCount,
          },
        );
        // Deactivate worktree after too many errors
        if (worktree.errorCount > 5) {
          worktree.isActive = false;
          this.emit('worktree:deactivated', {
            name,
            reason: 'too_many_errors',
            errorCount: worktree.errorCount,
            timestamp: TimeUtils.now(),
          });
        }
      }
    }
  }
  private async checkWorktree(worktree: WorktreeState): Promise<void> {
    const previousStatus = worktree.status;
    const currentStatus = await this.getCachedGitStatus(worktree.config.path);
    // Check for changes
    const changes = this.detectStatusChanges(previousStatus, currentStatus);
    if (changes.hasChanges) {
      await this.handleWorktreeChanges(worktree, changes, currentStatus);
    }
    // Update worktree state
    worktree.status = currentStatus;
    worktree.lastCheck = TimeUtils.now();
    worktree.config.lastSync = TimeUtils.now();
    // Reset error count on successful check
    if (worktree.errorCount > 0) {
      worktree.errorCount = Math.max(0, worktree.errorCount - 1);
    }
  }
  private async checkWorktreeSync(worktree: WorktreeState): Promise<void> {
    try {
      // Check for remote updates
      const { stdout: remoteOutput } = await execAsync('git remote -v', {
        cwd: worktree.config.path,
      });
      if (remoteOutput.trim()) {
        // Fetch latest changes
        await execAsync('git fetch --all', {
          cwd: worktree.config.path,
        });
        // Check if we're behind remote
        const { stdout: statusOutput } = await execAsync('git status --porcelain --branch', {
          cwd: worktree.config.path,
        });
        const behindMatch = statusOutput.match(/behind (\d+)/);
        if (behindMatch) {
          const behindCommits = parseInt(behindMatch[1], 10);
          this.emit('worktree:behind', {
            name: worktree.config.name,
            behindCommits,
            branch: worktree.config.branch,
            timestamp: TimeUtils.now(),
          });
        }
      }
    } catch (error) {
      logger.warn('EnhancedGitWorktreeMonitor', 'Failed to check worktree sync', {
        name: worktree.config.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  private async getCachedGitStatus(worktreePath: string): Promise<GitStatus> {
    const cacheKey = worktreePath;
    const cached = this.statusCache.get(cacheKey);
    if (cached && TimeUtils.now().getTime() - cached.timestamp.getTime() < this.cacheTimeoutMs) {
      return cached.status;
    }
    const status = await this.getGitStatus(worktreePath);
    this.statusCache.set(cacheKey, {
      status,
      timestamp: TimeUtils.now(),
    });
    return status;
  }
  private async getGitStatus(worktreePath: string): Promise<GitStatus> {
    try {
      // Get branch and commit info
      const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: worktreePath,
      });
      const { stdout: commitOutput } = await execAsync('git rev-parse HEAD', {
        cwd: worktreePath,
      });
      const branch = branchOutput.trim();
      const commit = commitOutput.trim();
      // Get ahead/behind info
      let aheadCommits = 0;
      let behindCommits = 0;
      let upstreamBranch: string | undefined;
      try {
        const { stdout: upstreamOutput } = await execAsync('git rev-parse --abbrev-ref @{u}', {
          cwd: worktreePath,
        });
        upstreamBranch = upstreamOutput.trim() ?? undefined;
        const { stdout: aheadBehindOutput } = await execAsync(
          'git rev-list --count --left-right @{u}...HEAD',
          {
            cwd: worktreePath,
          },
        );
        const [behind, ahead] = aheadBehindOutput.trim().split('\t');
        behindCommits = parseInt(behind || '0', 10);
        aheadCommits = parseInt(ahead || '0', 10);
      } catch {
        // No upstream branch
      }
      // Get file changes
      const { stdout: statusOutput } = await execAsync('git status --porcelain', {
        cwd: worktreePath,
      });
      const fileChanges: FileChangeData[] = [];
      const stagedChanges: FileChangeData[] = [];
      const untrackedFiles: string[] = [];
      const lines = statusOutput.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        const statusCode = line.substring(0, 2);
        const filePath = line.substring(3);
        if (statusCode === '??') {
          untrackedFiles.push(filePath);
        } else {
          const changeType = this.getChangeType(statusCode);
          const change: FileChangeData = {
            type: changeType,
            path: filePath,
            timestamp: TimeUtils.now(),
          };
          if (!statusCode.startsWith(' ') && !statusCode.startsWith('?')) {
            stagedChanges.push(change);
          }
          if (statusCode[1] !== ' ') {
            fileChanges.push(change);
          }
        }
      }
      // Determine overall status
      let status: GitStatus['status'] = 'clean';
      if (
        fileChanges.some((change) => change.type === 'deleted') ||
        stagedChanges.some((change) => change.type === 'deleted')
      ) {
        status = 'conflict';
      } else if (fileChanges.length > 0 || stagedChanges.length > 0) {
        status = 'dirty';
      } else if (behindCommits > 0 || aheadCommits > 0) {
        status = 'diverged';
      }
      return {
        branch,
        commit,
        upstreamBranch,
        aheadCommits,
        behindCommits,
        status,
        fileChanges,
        stagedChanges,
        untrackedFiles,
      };
    } catch (error) {
      logger.error(
        'EnhancedGitWorktreeMonitor',
        'Failed to get git status',
        error instanceof Error ? error : new Error(String(error)),
        {
          worktreePath,
        },
      );
      throw error;
    }
  }
  private async getGitDir(worktreePath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse --git-dir', {
        cwd: worktreePath,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }
  private detectStatusChanges(
    previous: GitStatus,
    current: GitStatus,
  ): {
    hasChanges: boolean;
    changes: {
      branchChanged?: boolean;
      commitChanged?: boolean;
      statusChanged?: boolean;
      filesChanged?: boolean;
      stagedFilesChanged?: boolean;
      divergenceChanged?: boolean;
    };
  } {
    const changes = {
      hasChanges: false,
      changes: {} as any,
    };
    if (previous.branch !== current.branch) {
      changes.hasChanges = true;
      changes.changes.branchChanged = true;
    }
    if (previous.commit !== current.commit) {
      changes.hasChanges = true;
      changes.changes.commitChanged = true;
    }
    if (previous.status !== current.status) {
      changes.hasChanges = true;
      changes.changes.statusChanged = true;
    }
    if (JSON.stringify(previous.fileChanges) !== JSON.stringify(current.fileChanges)) {
      changes.hasChanges = true;
      changes.changes.filesChanged = true;
    }
    if (JSON.stringify(previous.stagedChanges) !== JSON.stringify(current.stagedChanges)) {
      changes.hasChanges = true;
      changes.changes.stagedFilesChanged = true;
    }
    if (
      previous.aheadCommits !== current.aheadCommits ||
      previous.behindCommits !== current.behindCommits
    ) {
      changes.hasChanges = true;
      changes.changes.divergenceChanged = true;
    }
    return changes;
  }
  private async handleWorktreeChanges(
    worktree: WorktreeState,
    changes: any,
    currentStatus: GitStatus,
  ): Promise<void> {
    const {name} = worktree.config;
    // Update metrics
    worktree.metrics.lastActivity = TimeUtils.now();
    worktree.metrics.totalFileChanges += currentStatus.fileChanges.length;
    // Track most active files
    for (const change of currentStatus.fileChanges) {
      if (change.path) {
        const existing = worktree.metrics.mostActiveFiles.find((f) => f.path === change.path);
        if (existing) {
          existing.changes++;
        } else {
          worktree.metrics.mostActiveFiles.push({ path: change.path, changes: 1 });
        }
      }
    }
    // Emit change events
    if (changes.changes.commitChanged) {
      worktree.metrics.totalCommits++;
      this.emit('worktree:commit', {
        name,
        previousCommit: worktree.status.commit,
        newCommit: currentStatus.commit,
        branch: currentStatus.branch,
        timestamp: TimeUtils.now(),
      });
    }
    if (changes.changes.branchChanged) {
      worktree.metrics.totalBranchChanges++;
      this.emit('worktree:branch_changed', {
        name,
        previousBranch: worktree.status.branch,
        newBranch: currentStatus.branch,
        timestamp: TimeUtils.now(),
      });
    }
    if (changes.changes.filesChanged) {
      this.emit('worktree:files_changed', {
        name,
        changes: currentStatus.fileChanges,
        stagedChanges: currentStatus.stagedChanges,
        untrackedFiles: currentStatus.untrackedFiles,
        timestamp: TimeUtils.now(),
      });
    }
    if (changes.changes.divergenceChanged) {
      this.emit('worktree:divergence_changed', {
        name,
        aheadCommits: currentStatus.aheadCommits,
        behindCommits: currentStatus.behindCommits,
        upstreamBranch: currentStatus.upstreamBranch,
        timestamp: TimeUtils.now(),
      });
    }
    // Publish to event bus
    this.eventBus.publishToChannel('scanner', {
      id: randomUUID(),
      type: 'worktree_change',
      timestamp: TimeUtils.now(),
      source: 'git-monitor',
      data: {
        worktree: name,
        changes: changes.changes,
        status: currentStatus,
      },
      metadata: {},
    });
  }
  private getChangeType(statusCode: string): FileChangeData['type'] {
    const index = statusCode[0];
    const worktree = statusCode[1];
    // Conflict states
    if (index === 'U' || worktree === 'U' || statusCode === 'AA' || statusCode === 'DD') {
      return 'deleted'; // Unmerged (treat as deleted for type safety)
    }
    // Deleted
    if (index === 'D' || worktree === 'D') {
      return 'deleted';
    }
    // Added
    if (index === 'A' || worktree === 'A') {
      return 'added';
    }
    // Modified
    if (index === 'M' || worktree === 'M') {
      return 'modified';
    }
    // Renamed
    if (index === 'R' || worktree === 'R') {
      return 'renamed';
    }
    // Copied
    if (index === 'C' || worktree === 'C') {
      return 'renamed'; // Treat copied as renamed
    }
    return 'modified'; // Default to modified
  }
  private extractWorktreeName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] ?? path;
  }
  private createInitialMetrics(): WorktreeMetrics {
    return {
      totalCommits: 0,
      totalPushes: 0,
      totalBranchChanges: 0,
      totalFileChanges: 0,
      lastActivity: TimeUtils.now(),
      averageCommitInterval: 0,
      mostActiveFiles: [],
    };
  }
}
