/**
 * Self Identity Storage Manager
 * Manages orchestrator self identity and context storage
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

import { logger } from '../logger';

export interface SelfData {
  selfName: string;
  selfSummary: string;
  selfGoal: string;
  identity?: string; // Raw input
  lastUpdated: Date;
}
export interface SelfStore {
  get(): Promise<SelfData | null>;
  set(data: SelfData): Promise<void>;
  update(partial: Partial<SelfData>): Promise<SelfData>;
  clear(): Promise<void>;
}
class FileSelfStore implements SelfStore {
  private readonly filePath: string;
  constructor() {
    this.filePath = join(homedir(), '.prp', 'self.json');
  }
  async get(): Promise<SelfData | null> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        lastUpdated: new Date(parsed.lastUpdated),
      };
    } catch (error) {
      logger.debug(
        'self-store',
        'get',
        'Failed to read self data',
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }
  async set(data: SelfData): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(join(this.filePath, '..'), { recursive: true });
      const serialized = JSON.stringify(
        {
          ...data,
          lastUpdated: data.lastUpdated.toISOString(),
        },
        null,
        2,
      );
      await fs.writeFile(this.filePath, serialized, 'utf-8');
      logger.info('self-store', 'set', 'Self data stored', { selfName: data.selfName });
    } catch (error) {
      logger.error(
        'self-store',
        'set',
        'Failed to store self data',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  async update(partial: Partial<SelfData>): Promise<SelfData> {
    const current = (await this.get()) || this.getDefault();
    const updated: SelfData = {
      ...current,
      ...partial,
      lastUpdated: new Date(),
    };
    await this.set(updated);
    return updated;
  }
  async clear(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
      logger.info('self-store', 'clear', 'Self data cleared');
    } catch (error) {
      logger.debug(
        'self-store',
        'clear',
        'No self data to clear',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  private getDefault(): SelfData {
    return {
      selfName: 'prp-orchestrator',
      selfSummary: 'Managing autonomous development workflow with signal-driven orchestration',
      selfGoal: 'Orchestrate autonomous development across all PRPs',
      lastUpdated: new Date(),
    };
  }
}
// Singleton instance
export const selfStore: SelfStore = new FileSelfStore();
