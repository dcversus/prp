/**
 * Utility functions and exports
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

import * as fs from 'fs-extra';

const execAsync = promisify(exec);
// Legacy utility functions (kept for compatibility)
export async function initGitRepo(targetPath: string): Promise<void> {
  await execAsync('git init', { cwd: targetPath });
  await execAsync('git add .', { cwd: targetPath });
  await execAsync('git commit -m "Initial commit"', { cwd: targetPath });
}
export async function installDependencies(
  targetPath: string,
  packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm',
): Promise<void> {
  await execAsync(`${packageManager} install`, { cwd: targetPath });
}
export async function writeFile(
  filePath: string,
  content: string,
  executable = false,
): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, { mode: executable ? 0o755 : 0o644 });
}
// New modular utilities
export * from './fileGenerator';
export * from './gitUtils';
export * from './packageManager';
export * from './validation';
export * from './merge-prompt';
// Convenience exports
import { gitUtils } from './gitUtils';
import { packageManagerUtils } from './packageManager';
// Export fs-extra functions for compatibility
export const {ensureDir} = fs;
export const FileUtils = {
  ensureDir,
};
export async function initGit(targetPath: string): Promise<void> {
  await gitUtils.init(targetPath);
  await gitUtils.addAll(targetPath);
  await gitUtils.commit(targetPath, 'Initial commit');
}
export async function detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
  return packageManagerUtils.detect();
}
