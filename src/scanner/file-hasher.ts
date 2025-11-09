import { createHash } from 'crypto';
import { readFileSync, statSync } from 'fs';
import { LRUCache } from 'lru-cache';

/**
 * File Hasher - efficient file content hashing with LRU cache
 */
export interface FileHash {
  path: string;
  hash: string;
  size: number;
  lastModified: Date;
  algorithm: 'md5' | 'sha1' | 'sha256';
}

/**
 * File Hasher class
 */
export class FileHasher {
  private cache: LRUCache<string, FileHash>;

  constructor(maxSize: number = 10000) {
    this.cache = new LRUCache({
      max: maxSize,
      ttl: 1000 * 60 * 60, // 1 hour TTL
      updateAgeOnGet: true
    });
  }

  /**
   * Calculate hash for a file
   */
  async hashFile(filePath: string, algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'): Promise<FileHash> {
    const cacheKey = `${filePath}:${algorithm}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const stats = statSync(filePath);
      if (stats.mtime.getTime() === cached.lastModified.getTime()) {
        return cached;
      }
    }

    // Calculate new hash
    try {
      const content = readFileSync(filePath);
      const stats = statSync(filePath);

      const hash = createHash(algorithm);
      hash.update(content);
      const digest = hash.digest('hex');

      const fileHash: FileHash = {
        path: filePath,
        hash: digest,
        size: stats.size,
        lastModified: stats.mtime,
        algorithm
      };

      // Store in cache
      this.cache.set(cacheKey, fileHash);

      return fileHash;
    } catch (error) {
      throw new Error(`Failed to hash file ${filePath}: ${error}`);
    }
  }

  /**
   * Check if file has changed since last hash
   */
  async hasFileChanged(filePath: string, algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'): Promise<boolean> {
    const cacheKey = `${filePath}:${algorithm}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return true; // No previous hash
    }

    try {
      const stats = statSync(filePath);
      return stats.mtime.getTime() !== cached.lastModified.getTime();
    } catch {
      return true; // File doesn't exist or can't stat
    }
  }

  /**
   * Get cached hash without calculating
   */
  getCachedHash(filePath: string, algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'): FileHash | null {
    const cacheKey = `${filePath}:${algorithm}`;
    return this.cache.get(cacheKey) ?? null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      totalCalculations: this.cache.calculatedSize
    };
  }
}