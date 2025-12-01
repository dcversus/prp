/**
 * ♫ Enhanced Codemap Storage for @dcversus/prp
 *
 * Advanced persisted storage system for codemap data with support for:
 * - JSON file persistence
 * - Git commit hash-based versioning
 * - Diff tracking between versions
 * - Worktree support for separate storage per branch
 * - Incremental updates and rollback
 * - Merge support for branch codemaps
 * - Integration with git monitoring
 */

import { writeFile, readFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync, lstatSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';


import { createLayerLogger } from '../shared/logger';

import type { CodemapData, CodeAnalysisResult, CrossFileReference } from './types';
import type { EventBus } from '../shared/events';

const logger = createLayerLogger('scanner');

export interface CodemapStorageOptions {
  storageDir: string;
  compressionEnabled: boolean;
  maxStorageFiles: number;
  retentionDays: number;
  enableGitIntegration: boolean;
  enableDiffTracking: boolean;
  maxDiffHistory: number;
}

export interface DiffInfo {
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  fileChanges: Map<string, FileChangeDiff>;
  crossReferenceChanges: {
    added: CrossFileReference[];
    removed: CrossFileReference[];
  };
}

export interface FileChangeDiff {
  changeType: 'added' | 'modified' | 'deleted';
  oldAnalysis?: CodeAnalysisResult;
  newAnalysis?: CodeAnalysisResult;
  sizeChange: number;
  complexityChange: number;
  issuesChange: number;
  functionsAdded: string[];
  functionsRemoved: string[];
  classesAdded: string[];
  classesRemoved: string[];
}

export interface VersionInfo {
  commitHash: string;
  branch: string;
  message: string;
  author: string;
  timestamp: Date;
  parentCommits: string[];
  mergeCommits?: string[];
}

export interface WorktreeInfo {
  path: string;
  name: string;
  branch: string;
  commit: string;
  isMainWorktree: boolean;
  lastSynced: Date;
}

export interface CodemapSnapshot {
  id: string;
  timestamp: Date;
  version: string;
  codemap: CodemapData;
  checksum: string;
  versionInfo: VersionInfo;
  worktreeInfo: WorktreeInfo;
  diffFromPrevious?: DiffInfo;
  metadata: {
    fileSize: number;
    compressedSize?: number;
    generationTime: number;
    filesAnalyzed: number;
    isIncremental: boolean;
    gitSynced: boolean;
  };
}

export interface CodemapDiff {
  fromVersion: string;
  toVersion: string;
  diffInfo: DiffInfo;
  timestamp: Date;
  summary: {
    filesChanged: number;
    totalAdditions: number;
    totalDeletions: number;
    complexityChange: number;
  };
}

/**
 * Enhanced Codemap Storage Manager
 *
 * Handles persistence of codemap data with git-based versioning, diff tracking,
 * worktree support, and incremental updates.
 */
export class CodemapStorage {
  private readonly options: CodemapStorageOptions;
  private readonly snapshotsDir: string;
  private readonly currentSnapshotPath: string;
  private readonly diffsDir: string;
  private readonly worktreesDir: string;
  private readonly eventBus: EventBus;
  private readonly gitRepoPath: string;
  private readonly worktreeCache = new Map<string, WorktreeInfo>();
  private readonly diffCache = new Map<string, DiffInfo>();

  constructor(eventBus: EventBus, options: Partial<CodemapStorageOptions> = {}) {
    this.eventBus = eventBus;
    this.options = {
      storageDir: options.storageDir || '.prp/codemap',
      compressionEnabled: options.compressionEnabled ?? true,
      maxStorageFiles: options.maxStorageFiles || 10,
      retentionDays: options.retentionDays || 30,
      enableGitIntegration: options.enableGitIntegration ?? true,
      enableDiffTracking: options.enableDiffTracking ?? true,
      maxDiffHistory: options.maxDiffHistory || 50,
      ...options,
    };

    this.snapshotsDir = join(this.options.storageDir, 'snapshots');
    this.currentSnapshotPath = join(this.options.storageDir, 'current.json');
    this.diffsDir = join(this.options.storageDir, 'diffs');
    this.worktreesDir = join(this.options.storageDir, 'worktrees');
    this.gitRepoPath = resolve(process.cwd());
  }

  /**
   * Initialize storage directories and git integration
   */
  async initialize(): Promise<void> {
    try {
      await mkdir(this.options.storageDir, { recursive: true });
      await mkdir(this.snapshotsDir, { recursive: true });
      await mkdir(this.diffsDir, { recursive: true });
      await mkdir(this.worktreesDir, { recursive: true });

      // Initialize git integration if enabled
      if (this.options.enableGitIntegration) {
        await this.initializeGitIntegration();
      }

      logger.debug('CodemapStorage', 'Enhanced storage directories initialized', {
        storageDir: this.options.storageDir,
        snapshotsDir: this.snapshotsDir,
        diffsDir: this.diffsDir,
        worktreesDir: this.worktreesDir,
        gitIntegration: this.options.enableGitIntegration,
      });
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to initialize enhanced storage directories',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Save codemap to persistent storage with git versioning and worktree support
   */
  async saveCodemap(codemap: CodemapData, worktreePath?: string): Promise<string> {
    const startTime = Date.now();
    const worktreeInfo = await this.getWorktreeInfo(worktreePath || this.gitRepoPath);
    const versionInfo = this.options.enableGitIntegration
      ? await this.getVersionInfo(worktreeInfo.commit)
      : this.createMockVersionInfo();

    try {
      // Get previous snapshot for diff tracking
      const previousSnapshot = await this.loadCurrentSnapshot(worktreeInfo.name);
      let diffFromPrevious: DiffInfo | undefined;

      if (this.options.enableDiffTracking && previousSnapshot) {
        diffFromPrevious = await this.calculateDiff(previousSnapshot.codemap, codemap);
        await this.saveDiff(previousSnapshot.id, this.generateSnapshotId(), diffFromPrevious);
      }

      // Create enhanced snapshot
      const snapshot: CodemapSnapshot = {
        id: this.generateSnapshotId(),
        timestamp: new Date(),
        version: codemap.version,
        codemap,
        checksum: this.calculateChecksum(codemap),
        versionInfo,
        worktreeInfo,
        diffFromPrevious,
        metadata: {
          fileSize: JSON.stringify(codemap).length,
          generationTime: Date.now() - startTime,
          filesAnalyzed: codemap.files.size,
          isIncremental: !!previousSnapshot,
          gitSynced: this.options.enableGitIntegration,
        },
      };

      // Save as current snapshot for worktree
      const currentPath = this.getWorktreeCurrentPath(worktreeInfo.name);
      await this.saveSnapshot(snapshot, currentPath);

      // Create timestamped backup
      const backupPath = join(this.snapshotsDir, `${snapshot.id}.json`);
      await this.saveSnapshot(snapshot, backupPath);

      // Update worktree cache
      this.worktreeCache.set(worktreeInfo.name, worktreeInfo);

      // Cleanup old snapshots
      await this.cleanupOldSnapshots();

      const generationTime = Date.now() - startTime;
      logger.info('CodemapStorage', 'Enhanced codemap saved successfully', {
        snapshotId: snapshot.id,
        worktree: worktreeInfo.name,
        branch: worktreeInfo.branch,
        commit: worktreeInfo.commit,
        filesCount: codemap.files.size,
        generationTime: `${generationTime}ms`,
        fileSize: snapshot.metadata.fileSize,
        hasDiff: !!diffFromPrevious,
        filesChanged: diffFromPrevious
          ? diffFromPrevious.addedFiles.length +
            diffFromPrevious.modifiedFiles.length +
            diffFromPrevious.deletedFiles.length
          : 0,
      });

      // Emit event for git integration
      this.eventBus.emit('codemap-saved', {
        snapshotId: snapshot.id,
        worktreeInfo,
        versionInfo,
        diffInfo: diffFromPrevious,
      });

      return snapshot.id;
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to save enhanced codemap',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Load current codemap from storage with worktree support
   */
  async loadCurrentCodemap(worktreeName?: string): Promise<CodemapData | null> {
    try {
      const currentPath = worktreeName
        ? this.getWorktreeCurrentPath(worktreeName)
        : this.currentSnapshotPath;

      if (!existsSync(currentPath)) {
        logger.debug('CodemapStorage', 'No current codemap found', { worktreeName });
        return null;
      }

      const snapshot = await this.loadSnapshot(currentPath);
      return snapshot.codemap;
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to load current codemap',
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }

  /**
   * Load codemap snapshot by ID
   */
  async loadSnapshotById(snapshotId: string): Promise<CodemapSnapshot | null> {
    try {
      const snapshotPath = join(this.snapshotsDir, `${snapshotId}.json`);

      if (!existsSync(snapshotPath)) {
        logger.debug('CodemapStorage', 'Snapshot not found', { snapshotId });
        return null;
      }

      return await this.loadSnapshot(snapshotPath);
    } catch (error) {
      logger.error('CodemapStorage', 'Failed to load snapshot', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * List available snapshots
   */
  async listSnapshots(): Promise<CodemapSnapshot[]> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.snapshotsDir);

      const snapshotFiles = files.filter((file) => file.endsWith('.json'));
      const snapshots: CodemapSnapshot[] = [];

      for (const file of snapshotFiles) {
        try {
          const snapshotPath = join(this.snapshotsDir, file);
          const snapshot = await this.loadSnapshot(snapshotPath);
          if (snapshot) {
            snapshots.push(snapshot);
          }
        } catch (error) {
          logger.warn('CodemapStorage', 'Failed to load snapshot metadata', {
            file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to list snapshots',
        error instanceof Error ? error : new Error(String(error)),
      );
      return [];
    }
  }

  /**
   * Perform incremental update to codemap
   */
  async updateCodemap(
    updatedFiles: Array<{ path: string; analysis: CodeAnalysisResult }>,
    deletedFiles: string[] = [],
  ): Promise<string> {
    try {
      // Load current codemap
      const codemap = await this.loadCurrentCodemap();

      if (!codemap) {
        throw new Error('No current codemap found for incremental update');
      }

      // Update file analyses
      for (const { path, analysis } of updatedFiles) {
        codemap.files.set(path, analysis);
      }

      // Remove deleted files
      for (const filePath of deletedFiles) {
        codemap.files.delete(filePath);
      }

      // Recalculate metrics
      this.recalculateMetrics(codemap);

      // Update timestamp
      codemap.generatedAt = new Date();

      // Save updated codemap
      const snapshotId = await this.saveCodemap(codemap);

      logger.info('CodemapStorage', 'Incremental update completed', {
        snapshotId,
        filesUpdated: updatedFiles.length,
        filesDeleted: deletedFiles.length,
        totalFiles: codemap.files.size,
      });

      return snapshotId;
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to perform incremental update',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Rollback to previous snapshot
   */
  async rollback(snapshotId: string): Promise<boolean> {
    try {
      const snapshot = await this.loadSnapshotById(snapshotId);

      if (!snapshot) {
        logger.warn('CodemapStorage', 'Cannot rollback - snapshot not found', { snapshotId });
        return false;
      }

      // Validate checksum
      const calculatedChecksum = this.calculateChecksum(snapshot.codemap);
      if (calculatedChecksum !== snapshot.checksum) {
        logger.error('CodemapStorage', 'Cannot rollback - checksum mismatch', new Error('Checksum mismatch'), {
          expected: snapshot.checksum,
          calculated: calculatedChecksum,
        });
        return false;
      }

      // Save as current
      await this.saveSnapshot(snapshot, this.currentSnapshotPath);

      logger.info('CodemapStorage', 'Rollback completed', {
        snapshotId,
        rollbackTo: snapshot.timestamp,
        filesCount: snapshot.codemap.files.size,
      });

      return true;
    } catch (error) {
      logger.error('CodemapStorage', 'Failed to rollback', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    snapshotsCount: number;
    totalStorageSize: number;
    currentCodemapSize: number;
    oldestSnapshot?: Date;
    newestSnapshot?: Date;
  }> {
    try {
      const snapshots = await this.listSnapshots();
      let totalStorageSize = 0;
      let currentCodemapSize = 0;
      let oldestSnapshot: Date | undefined;
      let newestSnapshot: Date | undefined;

      // Calculate sizes
      for (const snapshot of snapshots) {
        totalStorageSize += snapshot.metadata.fileSize;

        if (!oldestSnapshot || snapshot.timestamp < oldestSnapshot) {
          oldestSnapshot = snapshot.timestamp;
        }

        if (!newestSnapshot || snapshot.timestamp > newestSnapshot) {
          newestSnapshot = snapshot.timestamp;
        }
      }

      // Get current codemap size
      if (existsSync(this.currentSnapshotPath)) {
        const { stat } = await import('fs/promises');
        const stats = await stat(this.currentSnapshotPath);
        currentCodemapSize = stats.size;
      }

      return {
        snapshotsCount: snapshots.length,
        totalStorageSize,
        currentCodemapSize,
        oldestSnapshot,
        newestSnapshot,
      };
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to get storage stats',
        error instanceof Error ? error : new Error(String(error)),
      );

      return {
        snapshotsCount: 0,
        totalStorageSize: 0,
        currentCodemapSize: 0,
      };
    }
  }

  /**
   * Cleanup old snapshots based on retention policy
   */
  async cleanupOldSnapshots(): Promise<void> {
    try {
      const snapshots = await this.listSnapshots();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

      // Sort by timestamp (newest first)
      snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Keep snapshots within retention period or up to max file count
      const snapshotsToKeep: CodemapSnapshot[] = [];
      const snapshotsToDelete: CodemapSnapshot[] = [];

      for (const snapshot of snapshots) {
        if (
          snapshot.timestamp >= cutoffDate &&
          snapshotsToKeep.length < this.options.maxStorageFiles
        ) {
          snapshotsToKeep.push(snapshot);
        } else {
          snapshotsToDelete.push(snapshot);
        }
      }

      // Delete old snapshots
      for (const snapshot of snapshotsToDelete) {
        const snapshotPath = join(this.snapshotsDir, `${snapshot.id}.json`);
        const { unlink } = await import('fs/promises');
        await unlink(snapshotPath);

        logger.debug('CodemapStorage', 'Deleted old snapshot', {
          snapshotId: snapshot.id,
          timestamp: snapshot.timestamp,
        });
      }

      if (snapshotsToDelete.length > 0) {
        logger.info('CodemapStorage', 'Cleanup completed', {
          deletedCount: snapshotsToDelete.length,
          retainedCount: snapshotsToKeep.length,
          retentionDays: this.options.retentionDays,
          maxFiles: this.options.maxStorageFiles,
        });
      }
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to cleanup old snapshots',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // Private Methods

  private generateSnapshotId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  private calculateChecksum(codemap: CodemapData): string {
    const data = JSON.stringify(codemap);
    return createHash('sha256').update(data).digest('hex');
  }

  private async saveSnapshot(snapshot: CodemapSnapshot, filePath: string): Promise<void> {
    // Convert Map to plain object for JSON serialization
    // Also convert Date objects to strings for proper serialization
    const serializableSnapshot = {
      ...snapshot,
      codemap: {
        ...snapshot.codemap,
        files: Object.fromEntries(
          Array.from(snapshot.codemap.files.entries()).map(([key, value]) => [
            key,
            {
              ...value,
              lastModified: value.lastModified.toISOString(),
            },
          ]),
        ),
        dependencies: Object.fromEntries(snapshot.codemap.dependencies),
        metrics: {
          ...snapshot.codemap.metrics,
          languageDistribution: Object.fromEntries(snapshot.codemap.metrics.languageDistribution),
        },
      },
      diffFromPrevious: snapshot.diffFromPrevious
        ? {
            ...snapshot.diffFromPrevious,
            fileChanges: Object.fromEntries(snapshot.diffFromPrevious.fileChanges),
          }
        : undefined,
    };

    const data = JSON.stringify(serializableSnapshot, null, 2);
    await writeFile(filePath, data, 'utf-8');
  }

  private async loadSnapshot(filePath: string): Promise<CodemapSnapshot> {
    const data = await readFile(filePath, 'utf-8');
    const snapshot = JSON.parse(data);

    // Convert timestamp strings back to Date objects
    snapshot.timestamp = new Date(snapshot.timestamp);
    snapshot.codemap.generatedAt = new Date(snapshot.codemap.generatedAt);

    // Convert plain objects back to Maps and handle Date conversion
    const filesMap = new Map();
    for (const [key, value] of Object.entries(snapshot.codemap.files || {})) {
      filesMap.set(key, {
        ...(value as any),
        lastModified: new Date((value as any).lastModified),
      });
    }
    snapshot.codemap.files = filesMap;

    snapshot.codemap.dependencies = new Map(Object.entries(snapshot.codemap.dependencies || {}));
    snapshot.codemap.metrics.languageDistribution = new Map(
      Object.entries(snapshot.codemap.metrics.languageDistribution || {}),
    );

    if (snapshot.diffFromPrevious) {
      snapshot.diffFromPrevious.fileChanges = new Map(
        Object.entries(snapshot.diffFromPrevious.fileChanges || {}),
      );
    }

    return snapshot as CodemapSnapshot;
  }

  private recalculateMetrics(codemap: CodemapData): void {
    const files = Array.from(codemap.files.values());

    codemap.metrics.totalFiles = files.length;
    codemap.metrics.totalLines = files.reduce((sum, file) => sum + file.metrics.linesOfCode, 0);
    codemap.metrics.totalFunctions = files.reduce(
      (sum, file) => sum + file.metrics.functionsCount,
      0,
    );
    codemap.metrics.totalClasses = files.reduce((sum, file) => sum + file.metrics.classesCount, 0);

    if (files.length > 0) {
      codemap.metrics.averageComplexity =
        files.reduce((sum, file) => sum + file.complexity.cyclomaticComplexity, 0) / files.length;
    }

    codemap.metrics.issueCount = files.reduce((sum, file) => sum + file.issues.length, 0);

    // Update language distribution
    codemap.metrics.languageDistribution.clear();
    for (const file of files) {
      const current = codemap.metrics.languageDistribution.get(file.language) || 0;
      codemap.metrics.languageDistribution.set(file.language, current + 1);
    }
  }

  // Enhanced Git Integration Methods

  /**
   * Initialize git integration and detect worktrees
   */
  private async initializeGitIntegration(): Promise<void> {
    try {
      if (!this.isGitRepository()) {
        logger.warn('CodemapStorage', 'Not a git repository, git integration disabled');
        return;
      }

      // Detect worktrees
      await this.detectWorktrees();
      logger.info('CodemapStorage', 'Git integration initialized', {
        worktreesCount: this.worktreeCache.size,
        mainRepo: this.gitRepoPath,
      });
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to initialize git integration',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Check if current directory is a git repository
   */
  private isGitRepository(): boolean {
    try {
      const gitDir = join(this.gitRepoPath, '.git');
      return existsSync(gitDir) || lstatSync(gitDir).isSymbolicLink();
    } catch {
      return false;
    }
  }

  /**
   * Detect all git worktrees for this repository
   */
  private async detectWorktrees(): Promise<void> {
    try {
      // Get main worktree info
      const mainCommit = this.getCurrentCommit();
      const mainBranch = this.getCurrentBranch();

      const mainWorktreeInfo: WorktreeInfo = {
        path: this.gitRepoPath,
        name: 'main',
        branch: mainBranch,
        commit: mainCommit,
        isMainWorktree: true,
        lastSynced: new Date(),
      };

      this.worktreeCache.set('main', mainWorktreeInfo);

      // Detect other worktrees
      try {
        const worktreeList = execSync('git worktree list', {
          cwd: this.gitRepoPath,
          encoding: 'utf8',
        })
          .trim()
          .split('\n');

        for (const worktreeLine of worktreeList) {
          const [worktreePath, branchInfo] = worktreeLine.split(/\s+/);
          const branch = branchInfo.replace('[', '').replace(']', '').split('/')[-1];
          const worktreeName = relative(this.gitRepoPath, worktreePath) || 'main';

          if (worktreeName !== 'main') {
            const commit = this.getCurrentCommit(worktreePath);
            const worktreeInfo: WorktreeInfo = {
              path: resolve(worktreePath),
              name: worktreeName,
              branch,
              commit,
              isMainWorktree: false,
              lastSynced: new Date(),
            };

            this.worktreeCache.set(worktreeName, worktreeInfo);
          }
        }
      } catch (error) {
        logger.debug('CodemapStorage', 'No additional worktrees found');
      }
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to detect worktrees',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get current commit hash for repository or worktree
   */
  private getCurrentCommit(repoPath: string = this.gitRepoPath): string {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: repoPath,
        encoding: 'utf8',
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get current branch name for repository or worktree
   */
  private getCurrentBranch(repoPath: string = this.gitRepoPath): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
        encoding: 'utf8',
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get detailed version information for a commit
   */
  private async getVersionInfo(commitHash: string): Promise<VersionInfo> {
    try {
      const commitInfo = execSync(`git show --format="%H|%s|%an|%ad|%P" --no-patch ${commitHash}`, {
        cwd: this.gitRepoPath,
        encoding: 'utf8',
      }).trim();

      const [hash, message, author, dateStr, parentCommits] = commitInfo.split('|');
      const parentList = parentCommits ? parentCommits.split(' ').filter(Boolean) : [];

      return {
        commitHash: hash,
        branch: this.getCurrentBranch(),
        message,
        author,
        timestamp: new Date(dateStr),
        parentCommits: parentList,
      };
    } catch (error) {
      logger.warn('CodemapStorage', 'Failed to get version info', { commitHash });
      return this.createMockVersionInfo(commitHash);
    }
  }

  /**
   * Create mock version info when git is unavailable
   */
  private createMockVersionInfo(commitHash = 'mock'): VersionInfo {
    return {
      commitHash,
      branch: 'unknown',
      message: 'Mock version - no git integration',
      author: 'System',
      timestamp: new Date(),
      parentCommits: [],
    };
  }

  /**
   * Get worktree information by path
   */
  private async getWorktreeInfo(worktreePath: string): Promise<WorktreeInfo> {
    const absolutePath = resolve(worktreePath);
    const worktreeName = relative(this.gitRepoPath, absolutePath) || 'main';

    // Check cache first
    if (this.worktreeCache.has(worktreeName)) {
      const cached = this.worktreeCache.get(worktreeName)!;
      // Update last synced time
      cached.lastSynced = new Date();
      return cached;
    }

    // Create new worktree info
    const commit = this.getCurrentCommit(absolutePath);
    const branch = this.getCurrentBranch(absolutePath);

    const worktreeInfo: WorktreeInfo = {
      path: absolutePath,
      name: worktreeName,
      branch,
      commit,
      isMainWorktree: worktreeName === 'main',
      lastSynced: new Date(),
    };

    this.worktreeCache.set(worktreeName, worktreeInfo);
    return worktreeInfo;
  }

  /**
   * Get worktree-specific current snapshot path
   */
  private getWorktreeCurrentPath(worktreeName: string): string {
    return worktreeName === 'main'
      ? this.currentSnapshotPath
      : join(this.worktreesDir, `${worktreeName}-current.json`);
  }

  /**
   * Load current snapshot with worktree support
   */
  private async loadCurrentSnapshot(worktreeName?: string): Promise<CodemapSnapshot | null> {
    try {
      const currentPath = worktreeName
        ? this.getWorktreeCurrentPath(worktreeName)
        : this.currentSnapshotPath;

      if (!existsSync(currentPath)) {
        return null;
      }

      return await this.loadSnapshot(currentPath);
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to load current snapshot',
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }

  // Diff Tracking Methods

  /**
   * Calculate diff between two codemap versions
   */
  private async calculateDiff(fromCodemap: CodemapData, toCodemap: CodemapData): Promise<DiffInfo> {
    const fromFiles = new Set(fromCodemap.files.keys());
    const toFiles = new Set(toCodemap.files.keys());

    const addedFiles = Array.from(toFiles).filter((file) => !fromFiles.has(file));
    const deletedFiles = Array.from(fromFiles).filter((file) => !toFiles.has(file));
    const modifiedFiles = Array.from(fromFiles).filter(
      (file) =>
        toFiles.has(file) &&
        this.isFileChanged(fromCodemap.files.get(file)!, toCodemap.files.get(file)!),
    );

    const fileChanges = new Map<string, FileChangeDiff>();
    const crossReferenceChanges = {
      added: this.findAddedCrossReferences(fromCodemap, toCodemap),
      removed: this.findRemovedCrossReferences(fromCodemap, toCodemap),
    };

    // Process file changes
    for (const filePath of addedFiles) {
      const analysis = toCodemap.files.get(filePath)!;
      fileChanges.set(filePath, {
        changeType: 'added',
        newAnalysis: analysis,
        sizeChange: analysis.size,
        complexityChange: analysis.complexity.cyclomaticComplexity,
        issuesChange: analysis.issues.length,
        functionsAdded: analysis.structure.functions.map((f) => f.name),
        functionsRemoved: [],
        classesAdded: analysis.structure.classes.map((c) => c.name),
        classesRemoved: [],
      });
    }

    for (const filePath of deletedFiles) {
      const analysis = fromCodemap.files.get(filePath)!;
      fileChanges.set(filePath, {
        changeType: 'deleted',
        oldAnalysis: analysis,
        sizeChange: -analysis.size,
        complexityChange: -analysis.complexity.cyclomaticComplexity,
        issuesChange: -analysis.issues.length,
        functionsAdded: [],
        functionsRemoved: analysis.structure.functions.map((f) => f.name),
        classesAdded: [],
        classesRemoved: analysis.structure.classes.map((c) => c.name),
      });
    }

    for (const filePath of modifiedFiles) {
      const oldAnalysis = fromCodemap.files.get(filePath)!;
      const newAnalysis = toCodemap.files.get(filePath)!;

      const oldFunctions = new Set(oldAnalysis.structure.functions.map((f) => f.name));
      const newFunctions = new Set(newAnalysis.structure.functions.map((f) => f.name));

      const oldClasses = new Set(oldAnalysis.structure.classes.map((c) => c.name));
      const newClasses = new Set(newAnalysis.structure.classes.map((c) => c.name));

      fileChanges.set(filePath, {
        changeType: 'modified',
        oldAnalysis,
        newAnalysis,
        sizeChange: newAnalysis.size - oldAnalysis.size,
        complexityChange:
          newAnalysis.complexity.cyclomaticComplexity - oldAnalysis.complexity.cyclomaticComplexity,
        issuesChange: newAnalysis.issues.length - oldAnalysis.issues.length,
        functionsAdded: Array.from(newFunctions).filter((f) => !oldFunctions.has(f)),
        functionsRemoved: Array.from(oldFunctions).filter((f) => !newFunctions.has(f)),
        classesAdded: Array.from(newClasses).filter((c) => !oldClasses.has(c)),
        classesRemoved: Array.from(oldClasses).filter((c) => !newClasses.has(c)),
      });
    }

    return {
      addedFiles,
      modifiedFiles,
      deletedFiles,
      fileChanges,
      crossReferenceChanges,
    };
  }

  /**
   * Check if file analysis has changed
   */
  private isFileChanged(oldAnalysis: CodeAnalysisResult, newAnalysis: CodeAnalysisResult): boolean {
    return (
      oldAnalysis.size !== newAnalysis.size ||
      oldAnalysis.lastModified.getTime() !== newAnalysis.lastModified.getTime() ||
      JSON.stringify(oldAnalysis.metrics) !== JSON.stringify(newAnalysis.metrics) ||
      JSON.stringify(oldAnalysis.structure) !== JSON.stringify(newAnalysis.structure)
    );
  }

  /**
   * Find added cross-references between versions
   */
  private findAddedCrossReferences(
    fromCodemap: CodemapData,
    toCodemap: CodemapData,
  ): CrossFileReference[] {
    const fromRefs = new Set(fromCodemap.crossFileReferences.map((ref) => JSON.stringify(ref)));
    return toCodemap.crossFileReferences.filter((ref) => !fromRefs.has(JSON.stringify(ref)));
  }

  /**
   * Find removed cross-references between versions
   */
  private findRemovedCrossReferences(
    fromCodemap: CodemapData,
    toCodemap: CodemapData,
  ): CrossFileReference[] {
    const toRefs = new Set(toCodemap.crossFileReferences.map((ref) => JSON.stringify(ref)));
    return fromCodemap.crossFileReferences.filter((ref) => !toRefs.has(JSON.stringify(ref)));
  }

  /**
   * Save diff information between two versions
   */
  private async saveDiff(
    fromSnapshotId: string,
    toSnapshotId: string,
    diffInfo: DiffInfo,
  ): Promise<void> {
    try {
      const diffPath = join(this.diffsDir, `${fromSnapshotId}-${toSnapshotId}.json`);
      const codemapDiff: CodemapDiff = {
        fromVersion: fromSnapshotId,
        toVersion: toSnapshotId,
        diffInfo,
        timestamp: new Date(),
        summary: {
          filesChanged:
            diffInfo.addedFiles.length +
            diffInfo.modifiedFiles.length +
            diffInfo.deletedFiles.length,
          totalAdditions: Array.from(diffInfo.fileChanges.values())
            .filter((change) => change.changeType !== 'deleted')
            .reduce((sum, change) => sum + Math.max(0, change.sizeChange), 0),
          totalDeletions: Array.from(diffInfo.fileChanges.values())
            .filter((change) => change.changeType !== 'added')
            .reduce((sum, change) => sum + Math.max(0, -change.sizeChange), 0),
          complexityChange: Array.from(diffInfo.fileChanges.values()).reduce(
            (sum, change) => sum + change.complexityChange,
            0,
          ),
        },
      };

      await writeFile(diffPath, JSON.stringify(codemapDiff, null, 2), 'utf-8');

      // Cleanup old diffs
      await this.cleanupOldDiffs();
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to save diff',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Cleanup old diff files based on retention policy
   */
  private async cleanupOldDiffs(): Promise<void> {
    try {
      const diffFiles = await readdir(this.diffsDir);
      const jsonFiles = diffFiles.filter((file) => file.endsWith('.json'));

      if (jsonFiles.length <= this.options.maxDiffHistory) {
        return;
      }

      // Get file stats and sort by modification time
      const filesWithStats = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = join(this.diffsDir, file);
          const stats = await (await import('fs/promises')).stat(filePath);
          return { file, mtime: stats.mtime };
        }),
      );

      filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Delete oldest files
      const filesToDelete = filesWithStats.slice(
        0,
        filesWithStats.length - this.options.maxDiffHistory,
      );

      for (const { file } of filesToDelete) {
        const filePath = join(this.diffsDir, file);
        await unlink(filePath);
      }

      logger.debug('CodemapStorage', 'Cleaned up old diffs', {
        deletedCount: filesToDelete.length,
        remainingCount: jsonFiles.length - filesToDelete.length,
      });
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to cleanup old diffs',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // Enhanced Rollback and Sync Methods

  /**
   * Resync current codemap to latest commit state
   */
  async resyncToLatest(worktreeName?: string): Promise<boolean> {
    try {
      const worktreeInfo = worktreeName
        ? this.worktreeCache.get(worktreeName)
        : Array.from(this.worktreeCache.values()).find((wt) => wt.isMainWorktree);

      if (!worktreeInfo) {
        logger.error('CodemapStorage', 'Worktree not found for resync');
        return false;
      }

      const latestCommit = this.getCurrentCommit(worktreeInfo.path);

      if (worktreeInfo.commit === latestCommit) {
        logger.debug('CodemapStorage', 'Already at latest commit', {
          worktree: worktreeInfo.name,
          commit: latestCommit,
        });
        return true;
      }

      // Update worktree info
      worktreeInfo.commit = latestCommit;
      worktreeInfo.lastSynced = new Date();

      logger.info('CodemapStorage', 'Resynced to latest commit', {
        worktree: worktreeInfo.name,
        oldCommit: worktreeInfo.commit,
        newCommit: latestCommit,
      });

      // Emit event for resync
      this.eventBus.emit('codemap-resynced', {
        worktreeInfo,
        newCommit: latestCommit,
      });

      return true;
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to resync to latest',
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
    }
  }

  /**
   * Merge codemaps from different branches
   */
  async mergeCodemaps(fromBranch: string, toBranch: string): Promise<string | null> {
    try {
      const fromWorktree = this.worktreeCache.get(fromBranch);
      const toWorktree = this.worktreeCache.get(toBranch);

      if (!fromWorktree || !toWorktree) {
        logger.error('CodemapStorage', 'Worktree not found for merge');
        return null;
      }

      const fromCodemap = await this.loadCurrentCodemap(fromBranch);
      const toCodemap = await this.loadCurrentCodemap(toBranch);

      if (!fromCodemap || !toCodemap) {
        logger.error('CodemapStorage', 'Codemap not found for merge');
        return null;
      }

      // Merge codemaps (simple merge - takes latest version of each file)
      const mergedCodemap: CodemapData = {
        ...toCodemap,
        files: new Map(toCodemap.files),
        generatedAt: new Date(),
        version: `${toCodemap.version}+merged-${fromBranch}`,
      };

      // Add files from source branch that don't exist in target
      for (const [filePath, analysis] of Array.from(fromCodemap.files.entries())) {
        if (!mergedCodemap.files.has(filePath)) {
          mergedCodemap.files.set(filePath, analysis);
        }
      }

      // Save merged codemap
      const snapshotId = await this.saveCodemap(mergedCodemap, toWorktree.path);

      logger.info('CodemapStorage', 'Codemaps merged successfully', {
        fromBranch,
        toBranch,
        snapshotId,
        filesMerged: fromCodemap.files.size,
      });

      // Emit merge event
      this.eventBus.emit('codemaps-merged', {
        fromWorktree,
        toWorktree,
        snapshotId,
      });

      return snapshotId;
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to merge codemaps',
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }

  /**
   * Get list of all worktrees
   */
  getWorktrees(): WorktreeInfo[] {
    return Array.from(this.worktreeCache.values());
  }

  /**
   * Get diff history for a worktree
   */
  async getDiffHistory(worktreeName?: string): Promise<CodemapDiff[]> {
    try {
      const diffFiles = await readdir(this.diffsDir);
      const jsonFiles = diffFiles.filter((file) => file.endsWith('.json'));

      const diffs: CodemapDiff[] = [];

      for (const file of jsonFiles) {
        try {
          const diffPath = join(this.diffsDir, file);
          const diffData = await readFile(diffPath, 'utf-8');
          const diff = JSON.parse(diffData) as CodemapDiff;

          // Convert timestamp back to Date
          diff.timestamp = new Date(diff.timestamp);

          diffs.push(diff);
        } catch (error) {
          logger.warn('CodemapStorage', 'Failed to load diff file', { file });
        }
      }

      return diffs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error(
        'CodemapStorage',
        'Failed to get diff history',
        error instanceof Error ? error : new Error(String(error)),
      );
      return [];
    }
  }
}
