/**
 * ♫ Storage Management for @dcversus/prp
 *
 * Simple file-based storage system for persistence.
 */

import { FileUtils } from './utils';
import { createLayerLogger } from './logger';

const logger = createLayerLogger('shared');

export interface StorageManager {
  saveData(path: string, data: unknown): Promise<void>;
  loadData(path: string): Promise<unknown>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}

class FileStorageManager implements StorageManager {
  private dataDir: string;

  constructor(dataDir: string = '.prp') {
    this.dataDir = dataDir;
  }

  async saveData(path: string, data: unknown): Promise<void> {
    try {
      const fullPath = `${this.dataDir}/${path}`;
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      await FileUtils.ensureDir(parentDir);
      await FileUtils.writeTextFile(fullPath, JSON.stringify(data, null, 2));
      logger.debug('storage', `Saved data to ${path}`, { path });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('storage', `Failed to save data to ${path}`, err, { path });
      throw err;
    }
  }

  async loadData(path: string): Promise<unknown> {
    try {
      const fullPath = `${this.dataDir}/${path}`;
      const content = await FileUtils.readTextFile(fullPath);
      const data = JSON.parse(content);
      logger.debug('storage', `Loaded data from ${path}`, { path });
      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('storage', `Failed to load data from ${path}`, err, { path });
      throw err;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = `${this.dataDir}/${path}`;
      return await FileUtils.pathExists(fullPath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('storage', `Failed to check if ${path} exists`, err, { path });
      return false;
    }
  }

  async delete(path: string): Promise<void> {
    try {
      const fullPath = `${this.dataDir}/${path}`;
      const fs = await import('fs/promises');
      await fs.unlink(fullPath);
      logger.debug('storage', `Deleted ${path}`, { path });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('storage', `Failed to delete ${path}`, err, { path });
      throw err;
    }
  }
}

// Global storage manager instance
export const storageManager = new FileStorageManager();

export default storageManager;