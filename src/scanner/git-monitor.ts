import { execSync } from 'child_process';

/**
 * Git Status Monitor - tracks git repository status and changes
 */
export interface GitStatus {
  branch: string;
  commit: string;
  status: 'clean' | 'dirty' | 'conflict' | 'diverged';
  ahead: number;
  behind: number;
  fileChanges: FileChange[];
  lastUpdated: Date;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  hash?: string;
}

/**
 * Git Status Monitor class
 */
export class GitStatusMonitor {
  /**
   * Get git status for a repository
   */
  async getGitStatus(repoPath: string): Promise<GitStatus> {
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

      // Check if we're in a git repository
      if (!branch || !commit) {
        throw new Error('Not a git repository');
      }

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
      let status: GitStatus['status'] = 'clean';
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
      throw new Error(`Failed to get git status for ${repoPath}: ${error}`);
    }
  }

  /**
   * Parse git status output
   */
  private parseStatusOutput(statusOutput: string): FileChange[] {
    if (!statusOutput) {
      return [];
    }

    const changes: FileChange[] = [];
    const lines = statusOutput.split('\n');

    for (const line of lines) {
      if (line.length < 3) continue;

      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const path = line.substring(3);

      // Skip deleted files from work tree that are staged for deletion
      if (indexStatus === 'D' && workTreeStatus === ' ') {
        continue;
      }

      // Determine file status
      let status: FileChange['status'];
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
        // Other statuses
        status = 'modified';
        staged = indexStatus !== ' ';
      }

      changes.push({
        path,
        status,
        staged
      });
    }

    return changes;
  }

  /**
   * Get commit history for a branch
   */
  async getCommitHistory(repoPath: string, limit: number = 10): Promise<Array<{
    commit: string;
    message: string;
    author: string;
    date: Date;
    changes: number;
  }>> {
    try {
      const logOutput = execSync(`git log --oneline --pretty=format:"%H|%s|%an|%ad|%n" --date=iso -n ${limit}`, {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      const commits = logOutput.split('\n').map(line => {
        const [commit, ...parts] = line.split('|');
        const message = parts[0] || '';
        const author = parts[1] || '';
        const dateString = parts[2] || '';
        const changesCount = parseInt(parts[3] || '0') || 0;

        return {
          commit: commit || '',
          message,
          author,
          date: new Date(dateString),
          changes: changesCount
        };
      });

      return commits;
    } catch (error) {
      console.error(`❌ Error getting commit history for ${repoPath}:`, error);
      return [];
    }
  }

  /**
   * Get remote information
   */
  async getRemoteInfo(repoPath: string): Promise<{
    name: string;
    url: string;
    branch: string;
  } | null> {
    try {
      const remoteOutput = execSync('git remote -v', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      if (!remoteOutput) {
        return null;
      }

      const remoteLines = remoteOutput.split('\n');
      const originLine = remoteLines.find(line => line.includes('(origin)') || line.includes('origin'));

      if (!originLine) {
        return null;
      }

      const parts = originLine.split(/\s+/);
      const name = parts[0];
      const url = parts[1];

      // Get tracking branch
      const trackingBranch = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      return {
        name: name || '',
        url: url || '',
        branch: trackingBranch
      };
    } catch {
      // No remote tracking
      return null;
    }
  }

  /**
   * Check if repository has uncommitted changes
   */
  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    try {
      const status = await this.getGitStatus(repoPath);
      return status.fileChanges.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get staged changes
   */
  async getStagedChanges(repoPath: string): Promise<FileChange[]> {
    try {
      const status = await this.getGitStatus(repoPath);
      return status.fileChanges.filter(change => change.staged);
    } catch {
      return [];
    }
  }

  /**
   * Get unstaged changes
   */
  async getUnstagedChanges(repoPath: string): Promise<FileChange[]> {
    try {
      const status = await this.getGitStatus(repoPath);
      return status.fileChanges.filter(change => !change.staged);
    } catch {
      return [];
    }
  }

  /**
   * Get untracked files
   */
  async getUntrackedFiles(repoPath: string): Promise<FileChange[]> {
    try {
      const status = await this.getGitStatus(repoPath);
      return status.fileChanges.filter(change => change.status === 'untracked');
    } catch {
      return [];
    }
  }
}