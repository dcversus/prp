/**
 * Utility functions and exports
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

// Legacy utility functions (kept for compatibility)
export async function initGitRepo(targetPath: string): Promise<void> {
  await execAsync('git init', { cwd: targetPath });
  await execAsync('git add .', { cwd: targetPath });
  await execAsync('git commit -m "Initial commit"', { cwd: targetPath });
}

export async function installDependencies(targetPath: string, packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'): Promise<void> {
  await execAsync(`${packageManager} install`, { cwd: targetPath });
}

export async function writeFile(filePath: string, content: string, executable = false): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, { mode: executable ? 0o755 : 0o644 });
}

export function validateProjectName(name: string): boolean {
  // NPM package name validation (simplified)
  const nameRegex = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return nameRegex.test(name);
}

// New modular utilities
export * from './fileGenerator.js';
export * from './gitUtils.js';
export * from './packageManager.js';
export * from './validation.js';
