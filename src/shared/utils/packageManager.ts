/**
 * Package manager utilities
 */
import { execa } from 'execa';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';
export class PackageManagerUtils {
  /**
   * Detect which package manager to use
   */
  async detect(): Promise<PackageManager> {
    // Check for lock files
    try {
      const fs = await import('fs-extra');
      if (await fs.pathExists('pnpm-lock.yaml')) {
        return 'pnpm';
      }
      if (await fs.pathExists('yarn.lock')) {
        return 'yarn';
      }
      return 'npm';
    } catch {
      return 'npm';
    }
  }
  /**
   * Install dependencies
   */
  async install(cwd: string, packageManager: PackageManager = 'npm'): Promise<void> {
    await execa(packageManager, ['install'], { cwd });
  }
  /**
   * Check if package manager is available
   */
  async isAvailable(packageManager: PackageManager): Promise<boolean> {
    try {
      await execa(packageManager, ['--version']);
      return true;
    } catch {
      return false;
    }
  }
}
export const packageManagerUtils = new PackageManagerUtils();
