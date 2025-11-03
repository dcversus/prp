/**
 * Git Adapter - Detects signals from Git operations
 * Part of PRP-007-F: Signal Sensor Inspector Implementation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface GitSignalEvent {
  type: 'commit' | 'merge' | 'branch' | 'tag' | 'push';
  signal: string;
  commitHash?: string;
  branch?: string;
  author?: string;
  message: string;
  files: string[];
  timestamp: Date;
}

export class GitAdapter {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  /**
   * Check if path is a Git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await fs.promises.access(path.join(this.repoPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect signals from recent commits
   */
  async detectCommitSignals(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): Promise<GitSignalEvent[]> {
    const signals: GitSignalEvent[] = [];

    try {
      // Get commits since yesterday
      const sinceISO = since.toISOString();
      const { stdout: logOutput } = await execAsync(
        `git log --since="${sinceISO}" --pretty=format:"%H|%s|%an|%ae|%ad|%f" --date=iso`,
        { cwd: this.repoPath }
      );

      const commits = logOutput.trim().split('\n');

      for (const commit of commits) {
        if (!commit) continue;

        const [hash, subject, author, email, date] = commit.split('|');
        const commitHash = hash.substring(0, 7);

        // Extract signals from commit message
        const signalsInMessage = this.extractSignalsFromText(subject);

        // Get files changed in this commit
        const { stdout: filesOutput } = await execAsync(
          `git show --name-only --format="" ${commitHash}`,
          { cwd: this.repoPath }
        );
        const changedFiles = filesOutput.trim().split('\n').filter(f => f);

        for (const signal of signalsInMessage) {
          signals.push({
            type: 'commit',
            signal,
            commitHash,
            branch: await this.getCurrentBranch(),
            author: `${author} <${email}>`,
            message: subject,
            files: changedFiles,
            timestamp: new Date(date)
          });
        }
      }
    } catch (error) {
      console.error('Error detecting Git commit signals:', error);
    }

    return signals;
  }

  /**
   * Detect signals from merge commits
   */
  async detectMergeSignals(): Promise<GitSignalEvent[]> {
    const signals: GitSignalEvent[] = [];

    try {
      const { stdout: logOutput } = await execAsync(
        'git log --merges --pretty=format:"%H|%s|%an|%ad" --date=iso -n 20',
        { cwd: this.repoPath }
      );

      const merges = logOutput.trim().split('\n');

      for (const merge of merges) {
        if (!merge) continue;

        const [hash, subject, author, date] = merge.split('|');
        const commitHash = hash.substring(0, 7);

        // Look for signals in merge message
        const signalsInMessage = this.extractSignalsFromText(subject);

        for (const signal of signalsInMessage) {
          signals.push({
            type: 'merge',
            signal,
            commitHash,
            branch: await this.getCurrentBranch(),
            author,
            message: subject,
            files: [], // Merge commits affect many files
            timestamp: new Date(date)
          });
        }
      }
    } catch (error) {
      console.error('Error detecting Git merge signals:', error);
    }

    return signals;
  }

  /**
   * Detect signals from branch names
   */
  async detectBranchSignals(): Promise<GitSignalEvent[]> {
    const signals: GitSignalEvent[] = [];

    try {
      const { stdout: branchesOutput } = await execAsync(
        'git branch --format="%(refname:short)|%(committerdate:iso)"',
        { cwd: this.repoPath }
      );

      const branches = branchesOutput.trim().split('\n');

      for (const branch of branches) {
        if (!branch) continue;

        const [branchName, date] = branch.split('|');

        // Look for signals in branch name
        const signalsInName = this.extractSignalsFromText(branchName);

        signalsInName.forEach(signal => {
          signals.push({
            type: 'branch',
            signal,
            branch: branchName,
            message: `Branch created/updated: ${branchName}`,
            files: [],
            timestamp: new Date(date)
          });
        });
      }
    } catch (error) {
      console.error('Error detecting Git branch signals:', error);
    }

    return signals;
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: this.repoPath });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if file is tracked by Git
   */
  async isTracked(filePath: string): Promise<boolean> {
    try {
      const relativePath = path.relative(this.repoPath, filePath);
      await execAsync(`git ls-files --error-unmatch ${relativePath}`, { cwd: this.repoPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get staged files with signals
   */
  async getStagedFilesWithSignals(): Promise<Array<{ file: string; signals: string[] }>> {
    const results: Array<{ file: string; signals: string[] }> = [];

    try {
      // Get staged files
      const { stdout: stagedOutput } = await execAsync(
        'git diff --cached --name-only',
        { cwd: this.repoPath }
      );

      const stagedFiles = stagedOutput.trim().split('\n').filter(f => f);

      for (const file of stagedFiles) {
        // Get patch for this file to see what changed
        const { stdout: patchOutput } = await execAsync(
          `git diff --cached --unified=3 -- "${file}"`,
          { cwd: this.repoPath }
        );

        // Look for signals in the diff
        const signals = this.extractSignalsFromText(patchOutput);

        if (signals.length > 0) {
          results.push({ file, signals: Array.from(new Set(signals)) }); // Remove duplicates
        }
      }
    } catch (error) {
      console.error('Error getting staged files with signals:', error);
    }

    return results;
  }

  /**
   * Watch for Git activity (pushes, pulls, merges)
   */
  watchGitActivity(callback: (event: GitSignalEvent) => void): () => void {
    // In a real implementation, this would use git hooks or polling
    // For now, we'll set up a basic poller
    const interval = setInterval(async () => {
      const recentSignals = await this.detectCommitSignals(
        new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

      recentSignals.forEach(signal => {
        callback(signal);
      });
    }, 30000); // Check every 30 seconds

    // Return cleanup function
    return () => clearInterval(interval);
  }

  /**
   * Extract [XX] signals from text
   */
  private extractSignalsFromText(text: string): string[] {
    const signalPattern = /\[([a-zA-Z]{2})\]/g;
    const signals: string[] = [];
    let match;

    while ((match = signalPattern.exec(text)) !== null) {
      signals.push(match[1]);
    }

    // Remove duplicates while preserving order
    return Array.from(new Set(signals));
  }

  /**
   * Get repository status
   */
  async getStatus(): Promise<{
    branch: string;
    clean: boolean;
    staged: number;
    modified: number;
    untracked: number;
  }> {
    try {
      const { stdout: statusOutput } = await execAsync(
        'git status --porcelain',
        { cwd: this.repoPath }
      );

      const lines = statusOutput.trim().split('\n');
      let staged = 0;
      let modified = 0;
      let untracked = 0;

      for (const line of lines) {
        if (line.length === 0) continue;

        const statusCode = line.substring(0, 2);
        if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
          staged++;
        }
        if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
          modified++;
        }
        if (statusCode === '??') {
          untracked++;
        }
      }

      return {
        branch: await this.getCurrentBranch(),
        clean: lines.length === 0,
        staged,
        modified,
        untracked
      };
    } catch (error) {
      console.error('Error getting Git status:', error);
      return {
        branch: 'unknown',
        clean: false,
        staged: 0,
        modified: 0,
        untracked: 0
      };
    }
  }
}