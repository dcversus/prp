/**
 * ♫ Enhanced Git Monitor for @dcversus/prp Signal System
 *
 * Advanced git monitoring with signal detection in commits, branches, and PRs.
 * Provides real-time monitoring and signal extraction from git activities.
 */

import { execSync } from 'child_process';
import { Signal } from '../shared/types';
import { SignalDetectorImpl } from './signal-detector';
import { createLayerLogger, HashUtils, FileUtils } from '../shared';

const logger = createLayerLogger('scanner');

export interface EnhancedGitStatus {
  // Basic status info
  branch: string;
  commit: string;
  status: 'clean' | 'dirty' | 'conflict' | 'diverged';
  ahead: number;
  behind: number;

  // Enhanced tracking
  lastScannedCommit?: string;
  commitSignals: Signal[];
  branchSignals: Signal[];
  prSignals: Signal[];
  fileChanges: EnhancedFileChange[];
  lastUpdated: Date;
}

export interface EnhancedFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  hash?: string;
  // Enhanced properties
  signals: Signal[];
  isPRPFile: boolean;
  size: number;
  lastModified: Date;
}

export interface GitCommitInfo {
  commit: string;
  message: string;
  author: string;
  email: string;
  date: Date;
  changes: number;
  additions: number;
  deletions: number;
  files: string[];
  signals: Signal[];
}

export interface GitPullRequestInfo {
  number: number;
  title: string;
  description: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  headBranch: string;
  baseBranch: string;
  signals: Signal[];
  lastUpdated: Date;
}

export interface GitBranchInfo {
  name: string;
  commit: string;
  isRemote: boolean;
  trackingBranch?: string;
  signals: Signal[];
  ahead: number;
  behind: number;
}

/**
 * Enhanced Git Monitor with signal detection capabilities
 */
export class EnhancedGitMonitor {
  private signalDetector: SignalDetectorImpl;
  private lastScannedCommits: Map<string, string> = new Map();
  private commitCache: Map<string, GitCommitInfo> = new Map();
  private branchCache: Map<string, GitBranchInfo> = new Map();
  private prCache: Map<string, GitPullRequestInfo[]> = new Map();
  private cacheTimeout = 60000; // 1 minute

  constructor() {
    this.signalDetector = new SignalDetectorImpl();
  }

  /**
   * Get enhanced git status with signal detection
   */
  async getEnhancedGitStatus(repoPath: string): Promise<EnhancedGitStatus> {
    try {
      logger.debug('EnhancedGitMonitor', `Getting enhanced git status for ${repoPath}`);

      // Get basic git status
      const basicStatus = await this.getBasicGitStatus(repoPath);

      // Get last scanned commit for this repository
      const repoKey = (await HashUtils.hashString(repoPath)).substring(0, 16);
      const lastScannedCommit = this.lastScannedCommits.get(repoKey);

      // Detect signals in commits since last scan
      const commitSignals = await this.detectCommitSignals(repoPath, lastScannedCommit);

      // Detect signals in current branch
      const branchSignals = await this.detectBranchSignals(repoPath, basicStatus.branch);

      // Detect signals in PRs (if available)
      const prSignals = await this.detectPRSignals(repoPath);

      // Enhance file changes with signal detection
      const enhancedFileChanges = await this.enhanceFileChanges(repoPath, basicStatus.fileChanges);

      // Update last scanned commit
      this.lastScannedCommits.set(repoKey, basicStatus.commit);

      const enhancedStatus: EnhancedGitStatus = {
        ...basicStatus,
        lastScannedCommit,
        commitSignals,
        branchSignals,
        prSignals,
        fileChanges: enhancedFileChanges,
        lastUpdated: new Date()
      };

      logger.debug('EnhancedGitMonitor', `Enhanced status complete`, {
        commitSignals: commitSignals.length,
        branchSignals: branchSignals.length,
        prSignals: prSignals.length,
        fileChanges: enhancedFileChanges.length
      });

      return enhancedStatus;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      logger.error('EnhancedGitMonitor', `Failed to get enhanced git status for ${repoPath}`, errorObj);
      throw new Error(`Failed to get enhanced git status for ${repoPath}: ${errorMessage}`);
    }
  }

  /**
   * Get basic git status
   */
  private async getBasicGitStatus(repoPath: string): Promise<
  Omit<EnhancedGitStatus, 'lastScannedCommit' | 'commitSignals' | 'branchSignals' | 'prSignals' | 'fileChanges'> &
  { fileChanges: EnhancedFileChange[] }
> {
    try {
      // Get current branch and commit
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      const commit = execSync('git rev-parse HEAD', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      // Get file status
      const statusOutput = execSync('git status --porcelain', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      // Check for divergence from remote
      let ahead = 0;
      let behind = 0;
      try {
        const divergenceOutput = execSync('git rev-list --left-right --count HEAD...@{u}', {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim();

        if (divergenceOutput) {
          const [behindStr, aheadStr] = divergenceOutput.split('\t');
          behind = parseInt(behindStr || '') || 0;
          ahead = parseInt(aheadStr || '') || 0;
        }
      } catch {
        // No upstream or tracking information
      }

      // Parse file changes
      const fileChanges = this.parseStatusOutput(statusOutput);

      // Determine overall status
      let status: EnhancedGitStatus['status'] = 'clean';
      if (fileChanges.length > 0) {
        status = 'dirty';
      }

      // Check for conflicts
      const hasConflicts = fileChanges.some(change =>
        change.status === 'untracked' && change.path.includes('conflicted')
      );
      if (hasConflicts) {
        status = 'conflict';
      }

      // Check if diverged
      if (ahead > 0 || behind > 0) {
        status = 'diverged';
      }

      return {
        branch,
        commit,
        status,
        ahead,
        behind,
        fileChanges,
        lastUpdated: new Date()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get basic git status: ${errorMessage}`);
    }
  }

  /**
   * Parse git status output with enhanced file information
   */
  private parseStatusOutput(statusOutput: string): EnhancedFileChange[] {
    if (!statusOutput) {
      return [];
    }

    const changes: EnhancedFileChange[] = [];
    const lines = statusOutput.split('\n');

    for (const line of lines) {
      if (line.length < 3) continue;

      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const path = line.substring(3);

      // Determine file status
      let status: EnhancedFileChange['status'];
      let staged = false;

      if (workTreeStatus === '?' && indexStatus === ' ') {
        status = 'untracked';
        staged = false;
      } else if (workTreeStatus === 'D') {
        status = 'deleted';
        staged = indexStatus === ' ';
      } else if (workTreeStatus === 'A') {
        status = 'added';
        staged = indexStatus === ' ';
      } else if (workTreeStatus === 'M') {
        status = 'modified';
        staged = indexStatus === ' ' || indexStatus === 'M';
      } else if (workTreeStatus === 'R') {
        status = 'renamed';
        staged = indexStatus === ' ' || indexStatus === 'R';
      } else {
        status = 'modified';
        staged = indexStatus !== ' ';
      }

      changes.push({
        path,
        status,
        staged,
        hash: undefined,
        signals: [],
        isPRPFile: FileUtils.isPRPFile(path),
        size: 0,
        lastModified: new Date()
      });
    }

    return changes;
  }

  /**
   * Enhance file changes with signal detection and metadata
   */
  private async enhanceFileChanges(repoPath: string, fileChanges: EnhancedFileChange[]): Promise<EnhancedFileChange[]> {
    const enhanced: EnhancedFileChange[] = [];

    for (const change of fileChanges) {
      try {
        const fullPath = `${repoPath}/${change.path}`;
        const signals: Signal[] = [];
        let size = 0;
        let lastModified = new Date();

        // Check if it's a PRP file
        const isPRPFile = FileUtils.isPRPFile(change.path);

        // Try to read file content for signal detection
        if (isPRPFile && change.status !== 'deleted') {
          try {
            const content = await FileUtils.readTextFile(fullPath);
            const fileSignals = await this.signalDetector.detectSignals(content, fullPath);
            signals.push(...fileSignals);
          } catch {
            // File might not exist or be readable
          }
        }

        // Get file stats if file exists
        if (change.status !== 'deleted') {
          try {
            const stats = await FileUtils.readFileStats(fullPath);
            size = stats.size;
            lastModified = stats.modified;
          } catch {
            // File might not exist
          }
        }

        enhanced.push({
          ...change,
          signals,
          isPRPFile,
          size,
          lastModified
        });

      } catch (error) {
        logger.warn('EnhancedGitMonitor', `Failed to enhance file change for ${change.path}`, {
          error: error instanceof Error ? error.message : String(error)
        });

        // Add basic change without enhancement
        enhanced.push({
          ...change,
          signals: [],
          isPRPFile: FileUtils.isPRPFile(change.path),
          size: 0,
          lastModified: new Date()
        });
      }
    }

    return enhanced;
  }

  /**
   * Detect signals in commits since last scan
   */
  private async detectCommitSignals(repoPath: string, sinceCommit?: string): Promise<Signal[]> {
    try {
      const allSignals: Signal[] = [];

      // Get commit range
      let commitRange = 'HEAD';
      if (sinceCommit && sinceCommit !== 'HEAD') {
        commitRange = `${sinceCommit}..HEAD`;
      }

      // Get commit messages
      const logOutput = execSync(
        `git log ${commitRange} --pretty=format:"%H|%s|%an|%ad" --date=iso`,
        {
          cwd: repoPath,
          encoding: 'utf8'
        }
      ).trim();

      if (!logOutput) {
        return allSignals;
      }

      const commits = logOutput.split('\n');

      for (const commitLine of commits) {
        const [commit, message, author, dateStr] = commitLine.split('|');

        if (!commit || !message) continue;

        // Detect signals in commit message
        const signals = await this.signalDetector.detectSignals(message, `commit:${commit}`);

        // Add commit metadata to signals
        signals.forEach(signal => {
          signal.metadata = {
            ...signal.metadata,
            worktree: repoPath,
            commit,
            author,
            date: new Date(dateStr)
          };
        });

        allSignals.push(...signals);
      }

      return allSignals;

    } catch (error) {
      logger.warn('EnhancedGitMonitor', 'Failed to detect commit signals', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Detect signals in branch name and configuration
   */
  private async detectBranchSignals(repoPath: string, branchName: string): Promise<Signal[]> {
    try {
      const allSignals: Signal[] = [];

      // Detect signals in branch name
      const branchSignals = await this.signalDetector.detectSignals(branchName, `branch:${branchName}`);

      // Add branch metadata to signals
      branchSignals.forEach(signal => {
        signal.metadata = {
          ...signal.metadata,
          worktree: repoPath,
          branch: branchName
        };
      });

      allSignals.push(...branchSignals);

      // Detect signals in branch description (if available)
      try {
        const branchDesc = execSync(`git config branch.${branchName}.description`, {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim();

        if (branchDesc) {
          const descSignals = await this.signalDetector.detectSignals(branchDesc, `branch-desc:${branchName}`);

          descSignals.forEach(signal => {
            signal.metadata = {
              ...signal.metadata,
              worktree: repoPath,
              branch: branchName
            };
          });

          allSignals.push(...descSignals);
        }
      } catch {
        // No branch description
      }

      return allSignals;

    } catch (error) {
      logger.warn('EnhancedGitMonitor', 'Failed to detect branch signals', {
        error: error instanceof Error ? error.message : String(error),
        branch: branchName
      });
      return [];
    }
  }

  /**
   * Detect signals in pull requests (requires GitHub CLI or git remote parsing)
   */
  private async detectPRSignals(repoPath: string): Promise<Signal[]> {
    try {
      const allSignals: Signal[] = [];

      // Try to get PR information using GitHub CLI
      try {
        const prOutput = execSync('gh pr list --json number,title,body,author,state,headRefName,baseRefName,updatedAt', {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim();

        if (prOutput) {
          const prs = JSON.parse(prOutput);

          for (const pr of prs) {
            const prSignals: Signal[] = [];

            // Detect signals in PR title
            const titleSignals = await this.signalDetector.detectSignals(pr.title, `pr:${pr.number}:title`);
            prSignals.push(...titleSignals);

            // Detect signals in PR description
            if (pr.body) {
              const descSignals = await this.signalDetector.detectSignals(pr.body, `pr:${pr.number}:description`);
              prSignals.push(...descSignals);
            }

            // Add PR metadata to signals
            prSignals.forEach(signal => {
              signal.metadata = {
                ...signal.metadata,
                worktree: repoPath,
                prNumber: pr.number,
                prAuthor: pr.author?.login || 'unknown',
                prState: pr.state
              };
            });

            allSignals.push(...prSignals);
          }
        }
      } catch {
        // GitHub CLI not available or no PRs
      }

      return allSignals;

    } catch (error) {
      logger.warn('EnhancedGitMonitor', 'Failed to detect PR signals', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get detailed commit information with signal analysis
   */
  async getCommitWithSignals(repoPath: string, commitHash: string): Promise<GitCommitInfo | null> {
    try {
      const cacheKey = `${repoPath}:${commitHash}`;
      const cached = this.commitCache.get(cacheKey);

      if (cached && (Date.now() - cached.date.getTime()) < this.cacheTimeout) {
        return cached;
      }

      // Get commit details
      const showOutput = execSync(
        `git show --pretty=format:"%H|%s|%an|%ae|%ad|%cn" --numstat ${commitHash}`,
        {
          cwd: repoPath,
          encoding: 'utf8'
        }
      );

      const lines = showOutput.split('\n');
      const [commit, message, author, email, dateStr] = lines[0].split('|');

      // Parse file changes
      const files: string[] = [];
      let additions = 0;
      let deletions = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const parts = line.split('\t');
        if (parts.length >= 3) {
          const add = parseInt(parts[0]) || 0;
          const del = parseInt(parts[1]) || 0;
          const file = parts[2];

          additions += add;
          deletions += del;
          files.push(file);
        }
      }

      // Detect signals in commit message
      const signals = await this.signalDetector.detectSignals(message, `commit:${commitHash}`);

      const commitInfo: GitCommitInfo = {
        commit: commit || commitHash,
        message: message || '',
        author: author || '',
        email: email || '',
        date: new Date(dateStr),
        changes: files.length,
        additions,
        deletions,
        files,
        signals
      };

      // Cache the result
      this.commitCache.set(cacheKey, commitInfo);

      return commitInfo;

    } catch (error) {
      logger.warn('EnhancedGitMonitor', `Failed to get commit info for ${commitHash}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get all branches with signal analysis
   */
  async getBranchesWithSignals(repoPath: string): Promise<GitBranchInfo[]> {
    try {
      const branchesOutput = execSync('git branch -a --format="%(refname:short)|%(objectname)|%(upstream:short)"', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      if (!branchesOutput) {
        return [];
      }

      const branches: GitBranchInfo[] = [];
      const lines = branchesOutput.split('\n');

      for (const line of lines) {
        const [name, commit, trackingBranch] = line.split('|');

        if (!name || !commit) continue;

        const isRemote = name.startsWith('origin/') || name.includes('/');
        const branchName = isRemote ? name : name;

        // Get divergence info
        let ahead = 0;
        let behind = 0;

        if (!isRemote && trackingBranch) {
          try {
            const divergenceOutput = execSync(`git rev-list --left-right --count ${trackingBranch}...${branchName}`, {
              cwd: repoPath,
              encoding: 'utf8'
            }).trim();

            if (divergenceOutput) {
              const [behindStr, aheadStr] = divergenceOutput.split('\t');
              behind = parseInt(behindStr || '') || 0;
              ahead = parseInt(aheadStr || '') || 0;
            }
          } catch {
            // No tracking branch or other error
          }
        }

        // Detect signals in branch name
        const signals = await this.signalDetector.detectSignals(branchName, `branch:${branchName}`);

        branches.push({
          name: branchName,
          commit,
          isRemote,
          trackingBranch: trackingBranch || undefined,
          signals,
          ahead,
          behind
        });
      }

      return branches;

    } catch (error) {
      logger.warn('EnhancedGitMonitor', 'Failed to get branches with signals', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.lastScannedCommits.clear();
    this.commitCache.clear();
    this.branchCache.clear();
    this.prCache.clear();
    logger.info('EnhancedGitMonitor', 'All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    lastScannedCommits: number;
    commitCache: number;
    branchCache: number;
    prCache: number;
  } {
    return {
      lastScannedCommits: this.lastScannedCommits.size,
      commitCache: this.commitCache.size,
      branchCache: this.branchCache.size,
      prCache: this.prCache.size
    };
  }
}