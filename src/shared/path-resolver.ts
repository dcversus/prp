/**
 * Path Resolution Utilities
 *
 * Provides robust path resolution for CLI applications across different execution contexts:
 * - npx @dcversus/prp (temporary npx cache)
 * - prp (global installation)
 * - npm run dev (local development)
 * - node dist/cli.js (direct execution)
 */

import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';
import { logger } from './logger.js';

export class PathResolver {
  private static packageRoot: string | null = null;

  /**
   * Get the package root directory (where package.json, templates/, AGENTS.md are located)
   */
  static getPackageRoot(): string {
    if (this.packageRoot) {
      return this.packageRoot;
    }

    try {
      // Get directory of current module (src/shared/path-resolver.ts)
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      // For scaffolding service in src/services/, go up two levels
      const directRoot = resolve(__dirname, '../..');

      // logger.debug('PathResolver', `Checking direct root: ${directRoot}`);

      if (this.isPackageRoot(directRoot)) {
        this.packageRoot = directRoot;
        logger.info('shared', 'PathResolver', `Package root found: ${this.packageRoot}`);
        return this.packageRoot;
      }

      // Fall back to walking up directory tree
      // logger.debug('PathResolver', 'Walking up directory tree to find package root');
      this.packageRoot = this.findPackageRoot(__dirname);

      if (!this.packageRoot) {
        throw new Error('Could not determine package root directory');
      }

      logger.info('shared', 'PathResolver', `Package root found via traversal: ${this.packageRoot}`);
      return this.packageRoot;

    } catch (error) {
      const execInfo = this.getExecutionInfo();
      logger.error('shared', 'PathResolver', `Failed to resolve package root. Execution: ${execInfo.type}, Module: ${execInfo.modulePath}, Error: ${error}`);
      throw new Error(`Failed to resolve package root directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get path relative to package root
   */
  static getPackagePath(relativePath: string): string {
    const fullPath = join(this.getPackageRoot(), relativePath);

    if (!existsSync(fullPath)) {
      const execInfo = this.getExecutionInfo();
      logger.warn('shared', 'PathResolver', `Path does not exist: ${fullPath}. Execution: ${execInfo.type}, PackageRoot: ${this.packageRoot}`);
    }

    return fullPath;
  }

  /**
   * Check if directory is package root (has required files)
   */
  private static isPackageRoot(dir: string): boolean {
    return existsSync(join(dir, 'package.json')) &&
           existsSync(join(dir, 'templates')) &&
           existsSync(join(dir, 'AGENTS.md'));
  }

  /**
   * Walk up directory tree to find package root
   */
  private static findPackageRoot(startDir: string): string | null {
    let currentDir = startDir;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (currentDir !== dirname(currentDir) && iterations < maxIterations) {
      if (this.isPackageRoot(currentDir)) {
        return currentDir;
      }
      currentDir = dirname(currentDir);
      iterations++;
    }

    // logger.debug('PathResolver', `Package root not found after ${iterations} iterations`);
    return null;
  }

  /**
   * Get execution context information
   */
  static getExecutionInfo(): {
    type: 'npx' | 'global' | 'local' | 'direct';
    modulePath: string;
    packageRoot: string | null;
    workingDir: string;
    } {
    const modulePath = fileURLToPath(import.meta.url);
    const workingDir = process.cwd();

    // Determine execution type
    let type: 'npx' | 'global' | 'local' | 'direct';

    if (modulePath.includes('.npm/_npx/') || modulePath.includes('/.pnpm/')) {
      type = 'npx';
    } else if (modulePath.includes('node_modules/')) {
      // Check if working directory is same as package root
      try {
        const potentialRoot = resolve(modulePath, '../../../'); // From node_modules/@dcversus/prp/dist/cli.js to project root
        type = workingDir === potentialRoot ? 'local' : 'global';
      } catch {
        type = 'global';
      }
    } else {
      type = 'direct';
    }

    return {
      type,
      modulePath,
      packageRoot: this.packageRoot,
      workingDir
    };
  }

  /**
   * Reset cached package root (useful for testing)
   */
  static resetCache(): void {
    this.packageRoot = null;
  }

  /**
   * Get current working directory (where user called the CLI)
   */
  static getWorkingDirectory(): string {
    return process.cwd();
  }

  /**
   * Validate that required directories exist
   */
  static validatePackageStructure(): { valid: boolean; missing: string[] } {
    const root = this.getPackageRoot();
    const required = ['templates', 'AGENTS.md'];
    const missing: string[] = [];

    for (const item of required) {
      if (!existsSync(join(root, item))) {
        missing.push(item);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}