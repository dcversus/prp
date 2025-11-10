/**
 * Git operations utilities
 */

import { execa } from 'execa';

export class GitUtils {
  /**
   * Initialize git repository
   */
  async init(cwd: string): Promise<void> {
    await execa('git', ['init'], { cwd });
  }

  /**
   * Add all files to git
   */
  async addAll(cwd: string): Promise<void> {
    await execa('git', ['add', '.'], { cwd });
  }

  /**
   * Create initial commit
   */
  async commit(cwd: string, message: string = 'Initial commit'): Promise<void> {
    await execa('git', ['commit', '-m', message], { cwd });
  }

  /**
   * Check if git is available
   */
  async isGitAvailable(): Promise<boolean> {
    try {
      await execa('git', ['--version']);
      return true;
    } catch {
      return false;
    }
  }
}

export const gitUtils = new GitUtils();
