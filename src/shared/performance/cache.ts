/**
 * Performance caching utilities for PRP CLI
 */
import { createLayerLogger } from '../logger';

const logger = createLayerLogger('shared');
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}
export class LRUCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };
  constructor(maxSize = 100, defaultTTL: number = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: ttl ?? this.defaultTTL,
      accessCount: 1,
      lastAccessed: now,
    };
    // Remove expired entries
    this.removeExpired();
    // If cache is full, remove least recently used
    let evictedKey: string | undefined;
    if (this.cache.size >= this.maxSize) {
      evictedKey = this.findLRU();
      if (evictedKey !== undefined) {
        this.cache.delete(evictedKey);
      }
    }
    this.cache.set(key, entry);
    logger.debug('LRUCache', 'Cache entry set', {
      key,
      ttl: entry.ttl,
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      evictedKey,
    });
  }
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      logger.debug('LRUCache', 'Cache miss', { key, missType: 'not_found' });
      return undefined;
    }
    const now = Date.now();
    // Check if entry is expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('LRUCache', 'Cache miss', { key, missType: 'expired' });
      return undefined;
    }
    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;
    logger.debug('LRUCache', 'Cache hit', {
      key,
      accessCount: entry.accessCount,
      age: now - entry.timestamp,
    });
    return entry.value;
  }
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
  private removeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  private findLRU(): string | undefined {
    let lruKey: string | undefined;
    let oldestAccess = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        lruKey = key;
      }
    }
    return lruKey;
  }
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // String size
      size += JSON.stringify(entry).length * 2; // Entry size
    }
    return size;
  }
  getEntries(): Array<{ key: string; entry: CacheEntry<T> }> {
    this.removeExpired();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }
}
// Specialized caches for different use cases
export class PerformanceCache {
  // Singleton instances
  private static readonly configCache = new LRUCache<any>(50, 10 * 60 * 1000); // 10 minutes
  private static readonly fileCache = new LRUCache<string>(200, 5 * 60 * 1000); // 5 minutes
  private static readonly commandCache = new LRUCache<any>(100, 2 * 60 * 1000); // 2 minutes
  private static readonly templateCache = new LRUCache<string>(50, 30 * 60 * 1000); // 30 minutes
  static getConfigCache(): LRUCache<any> {
    return this.configCache;
  }
  static getFileCache(): LRUCache<string> {
    return this.fileCache;
  }
  static getCommandCache(): LRUCache<any> {
    return this.commandCache;
  }
  static getTemplateCache(): LRUCache<string> {
    return this.templateCache;
  }
  static getAllStats(): Record<string, CacheStats> {
    return {
      config: this.configCache.getStats(),
      file: this.fileCache.getStats(),
      command: this.commandCache.getStats(),
      template: this.templateCache.getStats(),
    };
  }
  static clearAll(): void {
    this.configCache.clear();
    this.fileCache.clear();
    this.commandCache.clear();
    this.templateCache.clear();
  }
  static warmUpCache(): void {
    // Pre-warm commonly used cache entries
    this.configCache.set('default-theme', 'dark');
    this.configCache.set('default-timeout', 30000);
    this.fileCache.set('config-paths', '.prprc.json,.prprc.yaml,.prprc.yml');
  }
}
// Memory-efficient debounced function caching
export class DebouncedCache {
  private readonly cache = new Map<string, { value: unknown; timeout: NodeJS.Timeout }>();
  debounce<T>(key: string, fn: () => T, delay: number): T {
    const existing = this.cache.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
    }
    const value = fn();
    const timeout = setTimeout(() => {
      this.cache.delete(key);
    }, delay);
    this.cache.set(key, { value, timeout });
    return value;
  }
  clear(): void {
    for (const entry of this.cache.values()) {
      clearTimeout(entry.timeout);
    }
    this.cache.clear();
  }
  size(): number {
    return this.cache.size;
  }
}
// Global cache instance
export const performanceCache = PerformanceCache;
export const debouncedCache = new DebouncedCache();
