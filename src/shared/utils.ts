/**
 * ♫ Shared Utilities for @dcversus/prp
 *
 * Common utility functions used across all layers.
 */

// Types are imported as needed in individual functions
import { resolve, dirname } from 'path';

/**
 * Token counting utilities
 */
export class TokenCounter {
  private static readonly CHARS_PER_TOKEN = 4;

  static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  static estimateTokensFromObject(obj: unknown): number {
    const text = JSON.stringify(obj);
    return this.estimateTokens(text);
  }

  static calculateCost(tokens: number, model: string): number {
    // Simplified cost calculation - would be more sophisticated in reality
    const costPer1kTokens = this.getCostPer1kTokens(model);
    return (tokens / 1000) * costPer1kTokens;
  }

  private static getCostPer1kTokens(model: string): number {
    const costs: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-4-mini': 0.00015,
      'claude-3-sonnet': 0.015,
      'claude-3-haiku': 0.00025,
      'gemini-pro': 0.00025,
    };
    return costs[model] || 0.01;
  }
}

/**
 * Signal parsing utilities
 */
export class SignalParser {
  private static readonly SIGNAL_PATTERN = /\[([A-Z][a-z]?)\]/g;

  static extractSignals(text: string): string[] {
    const matches = text.match(this.SIGNAL_PATTERN) || [];
    return Array.from(new Set(matches)); // Remove duplicates
  }

  static parseSignal(signal: string): { code: string; priority: number } | null {
    const match = signal.match(/\[([A-Z][a-z]?)\]/);
    if (!match) return null;

    const code = match[1];
    if (!code) return null;

    const priority = this.getSignalPriority(code);

    return { code, priority };
  }

  private static getSignalPriority(code: string): number {
    const priorities: Record<string, number> = {
      'At': 10, // Attention
      'Bb': 9,  // Blocked
      'Ur': 8,  // Urgent
      'Ex': 7,  // Excited
      'En': 6,  // Encantado
      'Fr': 5,  // Frustrated
      'Ti': 4,  // Tired
      'Gt': 3,  // Gate
      'Pi': 2,  // Progress
      'Cf': 2,  // Confident
      'Vd': 2,  // Validated
      'Co': 1,  // Completed
    };
    return priorities[code] || 5;
  }

  static isSignal(text: string): boolean {
    return this.SIGNAL_PATTERN.test(text);
  }
}

/**
 * File system utilities
 */
export class FileUtils {
  static async readFileStats(path: string): Promise<{
    size: number;
    modified: Date;
    created: Date;
    isDirectory: boolean;
  }> {
    const fs = await import('fs/promises');
    const stats = await fs.stat(path);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
    };
  }

  static async readTextFile(path: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(path, 'utf-8');
  }

  static async writeTextFile(path: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(path, content, 'utf-8');
  }

  static async pathExists(path: string): Promise<boolean> {
    const fs = await import('fs/promises');
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  static async ensureDir(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(path, { recursive: true });
  }

  static getFileExtension(path: string): string {
    return path.split('.').pop() || '';
  }

  static isMarkdownFile(path: string): boolean {
    const ext = this.getFileExtension(path).toLowerCase();
    return ['md', 'markdown'].includes(ext);
  }

  static isPRPFile(path: string): boolean {
    return path.includes('PRP') && this.isMarkdownFile(path);
  }
}

/**
 * Git utilities
 */
export class GitUtils {
  static async getRepoStatus(repoPath: string): Promise<{
    branch: string;
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: repoPath,
      });

      const lines = stdout.trim().split('\n');
      const result = {
        branch: await this.getCurrentBranch(repoPath),
        modified: [] as string[],
        added: [] as string[],
        deleted: [] as string[],
        untracked: [] as string[],
      };

      for (const line of lines) {
        if (!line) continue;

        const status = line.substring(0, 2);
        const path = line.substring(3);

        switch (status) {
          case ' M':
            result.modified.push(path);
            break;
          case 'A ':
          case 'M ':
            result.added.push(path);
            break;
          case ' D ':
          case ' D':
            result.deleted.push(path);
            break;
          case '??':
            result.untracked.push(path);
            break;
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getCurrentBranch(repoPath: string): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
      });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  static async getLastCommitHash(repoPath: string): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('git rev-parse HEAD', {
        cwd: repoPath,
      });
      return stdout.trim();
    } catch {
      return 'none';
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  static endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      throw new Error(`Timer ${name} not found`);
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);
    return duration;
  }

  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.startTimer(name);
    const result = await fn();
    const duration = this.endTimer(name);
    return { result, duration };
  }

  static getMemoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  } {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
    };
  }
}

/**
 * Validation utilities
 */
export class Validator {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidAgentId(id: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 3;
  }

  static isValidSignalCode(code: string): boolean {
    return /^[A-Z][a-z]?$/.test(code);
  }

  static isValidWorktreeName(name: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0;
  }

  static sanitizeString(str: string, maxLength: number = 1000): string {
    if (typeof str !== 'string') return '';
    return str.substring(0, maxLength).trim();
  }
}

/**
 * Configuration utilities
 */
export class ConfigUtils {
  static mergeDeep<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof result[key] === 'object' &&
          result[key] !== null &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.mergeDeep(
            result[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          ) as T[Extract<keyof T, string>];
        } else {
          result[key] = source[key] as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }

  static resolvePath(basePath: string, ...segments: string[]): string {
    return resolve(basePath, ...segments);
  }

  static async loadConfigFile<T>(path: string): Promise<T | null> {
    try {
      const content = await FileUtils.readTextFile(path);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  static async saveConfigFile<T>(path: string, config: T): Promise<void> {
    await FileUtils.ensureDir(dirname(path));
    await FileUtils.writeTextFile(path, JSON.stringify(config, null, 2));
  }
}

/**
 * Time utilities
 */
export class TimeUtils {
  static now(): Date {
    return new Date();
  }

  static minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60 * 1000);
  }

  static hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  static daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  static formatDateTime(date: Date): string {
    return date.toISOString();
  }

  static isWithinTimeRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }
}

/**
 * Hash utilities
 */
export class HashUtils {
  static async hashString(str: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateShortId(): string {
    return Math.random().toString(36).substr(2, 8);
  }
}