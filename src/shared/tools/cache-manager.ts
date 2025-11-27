/**
 * ♫ Cache Manager for @dcversus/prp
 *
 * Shared caching utilities with LRU eviction, TTL support, and compression.
 */
import { createHash } from 'crypto';

// import { TextProcessor, CompressionStrategy } from '../utils/text-processing';

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // bytes
  compressed: boolean;
  metadata?: Record<string, unknown>;
}
export interface CacheConfig {
  maxSize?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory usage in bytes
  defaultTTL?: number; // Default TTL in milliseconds
  enableCompression?: boolean;
  compressionThreshold?: number; // Size threshold for compression in bytes
  enableMetrics?: boolean;
  cleanupInterval?: number; // Cleanup interval in milliseconds
}
export interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  compressionRate: number;
  averageAccessTime: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  compressions: number;
  decompressions: number;
  totalAccessTime: number;
  memoryUsage: number;
}
/**
 * Advanced Cache Manager with LRU, TTL, and Compression
 */
export class CacheManager<T = unknown> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private readonly config: Required<CacheConfig>;
  private metrics: CacheMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      maxMemory: config.maxMemory ?? 100 * 1024 * 1024, // 100MB
      defaultTTL: config.defaultTTL ?? 3600000, // 1 hour
      enableCompression: config.enableCompression ?? true,
      compressionThreshold: config.compressionThreshold ?? 1024, // 1KB
      enableMetrics: config.enableMetrics ?? true,
      cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
    };
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      compressions: 0,
      decompressions: 0,
      totalAccessTime: 0,
      memoryUsage: 0,
    };
    // Start cleanup timer
    if (this.config.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }
  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number, metadata?: Record<string, unknown>): void {
    const startTime = Date.now();
    const serializedValue = JSON.stringify(value);
    let finalValue = serializedValue;
    let compressed = false;
    let size = serializedValue.length;
    // Apply compression if enabled and threshold is met
    if (this.config.enableCompression && size >= this.config.compressionThreshold) {
      try {
        const compressedValue = this.compressData(serializedValue);
        if (compressedValue.length < size * 0.8) {
          // Only use compression if it reduces size significantly
          finalValue = compressedValue;
          compressed = true;
          size = compressedValue.length;
          this.metrics.compressions++;
        }
      } catch (error) {
        // Fallback to uncompressed if compression fails
        // console.warn('Cache compression failed:', error);
      }
    }
    const now = new Date();
    const expiresAt = ttl
      ? new Date(now.getTime() + ttl)
      : this.config.defaultTTL
        ? new Date(now.getTime() + this.config.defaultTTL)
        : undefined;
    const entry: CacheEntry<T> = {
      key,
      value: compressed ? (finalValue as unknown as T) : value,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
      size,
      compressed,
      metadata,
    };
    // Check if we need to evict entries
    this.ensureCapacity();
    // Set the entry
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    // Update metrics
    this.metrics.sets++;
    this.updateMemoryUsage();
    this.updateAccessTime(Date.now() - startTime);
  }
  /**
   * Get a value from cache
   */
  get(key: string): T | null {
    const startTime = Date.now();
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      this.updateAccessTime(Date.now() - startTime);
      return null;
    }
    // Check if entry has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt.getTime()) {
      this.delete(key);
      this.metrics.misses++;
      this.updateAccessTime(Date.now() - startTime);
      return null;
    }
    // Update access information
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.updateAccessOrder(key);
    // Decompress if necessary
    let {value} = entry;
    if (entry.compressed) {
      try {
        value = this.decompressData(entry.value as unknown as string) as unknown as T;
        this.metrics.decompressions++;
      } catch (error) {
        // console.warn('Cache decompression failed:', error);
        this.delete(key);
        this.metrics.misses++;
        this.updateAccessTime(Date.now() - startTime);
        return null;
      }
    }
    this.metrics.hits++;
    this.updateAccessTime(Date.now() - startTime);
    return value;
  }
  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    // Check if entry has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt.getTime()) {
      this.delete(key);
      return false;
    }
    return true;
  }
  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.metrics.deletes++;
      this.updateMemoryUsage();
    }
    return deleted;
  }
  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.metrics.deletes += this.cache.size;
    this.updateMemoryUsage();
  }
  /**
   * Get multiple keys from cache
   */
  mget(keys: string[]): Array<{ key: string; value: T | null }> {
    return keys.map((key) => ({
      key,
      value: this.get(key),
    }));
  }
  /**
   * Set multiple key-value pairs
   */
  mset(
    entries: Array<{ key: string; value: T; ttl?: number; metadata?: Record<string, unknown> }>,
  ): void {
    for (const { key, value, ttl, metadata } of entries) {
      this.set(key, value, ttl, metadata);
    }
  }
  /**
   * Delete multiple keys
   */
  mdelete(keys: string[]): number {
    let deleted = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }
  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  /**
   * Get all values in cache
   */
  values(): T[] {
    return Array.from(this.cache.values())
      .map((entry) => {
        if (entry.compressed) {
          try {
            return this.decompressData(entry.value as unknown as string) as unknown as T;
          } catch (error) {
            return null;
          }
        }
        return entry.value;
      })
      .filter((value) => value !== null) as T[];
  }
  /**
   * Get all entries as key-value pairs
   */
  entries(): Array<{ key: string; value: T }> {
    return this.keys()
      .map((key) => ({
        key,
        value: this.get(key)!,
      }))
      .filter((entry) => entry.value !== null);
  }
  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.metrics.misses / totalRequests) * 100 : 0;
    const compressionRate =
      this.metrics.sets > 0 ? (this.metrics.compressions / this.metrics.sets) * 100 : 0;
    const averageAccessTime = totalRequests > 0 ? this.metrics.totalAccessTime / totalRequests : 0;
    const timestamps = Array.from(this.cache.values()).map((entry) => entry.timestamp);
    const oldestEntry =
      timestamps.length > 0 ? new Date(Math.min(...timestamps.map((t) => t.getTime()))) : undefined;
    const newestEntry =
      timestamps.length > 0 ? new Date(Math.max(...timestamps.map((t) => t.getTime()))) : undefined;
    return {
      totalEntries: this.cache.size,
      memoryUsage: this.metrics.memoryUsage,
      hitRate,
      missRate,
      evictionCount: this.metrics.evictions,
      compressionRate,
      averageAccessTime,
      oldestEntry,
      newestEntry,
    };
  }
  /**
   * Get detailed metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }
  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      compressions: 0,
      decompressions: 0,
      totalAccessTime: 0,
      memoryUsage: this.calculateMemoryUsage(),
    };
  }
  /**
   * Force cleanup of expired entries
   */
  cleanup(): number {
    const now = Date.now();
    const toDelete: string[] = [];
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.expiresAt && now > entry.expiresAt.getTime()) {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) {
      this.delete(key);
    }
    return toDelete.length;
  }
  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
  // Private helper methods
  /**
   * Ensure cache capacity limits are respected
   */
  private ensureCapacity(): void {
    // Check size limit
    while (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }
    // Check memory limit
    while (this.calculateMemoryUsage() > this.config.maxMemory) {
      this.evictLRU();
    }
  }
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }
    const lruKey = this.accessOrder.shift()!;
    this.cache.delete(lruKey);
    this.metrics.evictions++;
  }
  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }
  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
  /**
   * Calculate current memory usage
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, entry] of Array.from(this.cache.entries())) {
      totalSize += entry.size + key.length * 2; // Approximate overhead
    }
    return totalSize;
  }
  /**
   * Update memory usage metric
   */
  private updateMemoryUsage(): void {
    this.metrics.memoryUsage = this.calculateMemoryUsage();
  }
  /**
   * Update access time metric
   */
  private updateAccessTime(accessTime: number): void {
    if (this.config.enableMetrics) {
      this.metrics.totalAccessTime += accessTime;
    }
  }
  /**
   * Compress data using simple compression
   */
  private compressData(data: string): string {
    // Simple compression using run-length encoding for demonstration
    // In a real implementation, you'd use a proper compression library
    let compressed = '';
    let count = 1;
    let prevChar = data[0];
    for (let i = 1; i < data.length; i++) {
      const char = data[i];
      if (char === prevChar && count < 255) {
        count++;
      } else {
        if (count > 3) {
          compressed += `~${count}${prevChar}`;
        } else {
          compressed += prevChar.repeat(count);
        }
        prevChar = char;
        count = 1;
      }
    }
    // Handle last run
    if (count > 3) {
      compressed += `~${count}${prevChar}`;
    } else {
      compressed += prevChar.repeat(count);
    }
    return compressed;
  }
  /**
   * Decompress data
   */
  private decompressData(compressedData: string): string {
    let decompressed = '';
    let i = 0;
    while (i < compressedData.length) {
      if (compressedData[i] === '~' && i + 2 < compressedData.length) {
        // Run-length encoded sequence
        const count = compressedData.charCodeAt(i + 1);
        const char = compressedData[i + 2];
        decompressed += char.repeat(count);
        i += 3;
      } else {
        decompressed += compressedData[i];
        i++;
      }
    }
    return decompressed;
  }
  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  /**
   * Generate cache key from data
   */
  static generateKey(data: unknown): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }
  /**
   * Create a namespaced cache key
   */
  static createNamespacedKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
}
/**
 * Specialized cache for token management
 */
export class TokenCache extends CacheManager<string> {
  constructor(config: CacheConfig = {}) {
    super({
      ...config,
      defaultTTL: config.defaultTTL ?? 1800000, // 30 minutes
      maxSize: config.maxSize ?? 500,
      enableCompression: config.enableCompression ?? false, // Tokens are usually small
    });
  }
  /**
   * Cache token estimation
   */
  cacheTokenEstimation(text: string, tokens: number, ttl?: number): void {
    const key = `tokens:${CacheManager.generateKey(text)}`;
    this.set(key, tokens.toString(), ttl, { textLength: text.length });
  }
  /**
   * Get cached token estimation
   */
  getTokenEstimation(text: string): number | null {
    const key = `tokens:${CacheManager.generateKey(text)}`;
    const cached = this.get(key);
    return cached ? parseInt(cached, 10) : null;
  }
  /**
   * Cache cost calculation
   */
  cacheCostCalculation(tokens: number, cost: number, provider: string, ttl?: number): void {
    const key = `cost:${provider}:${tokens}`;
    this.set(key, cost.toString(), ttl, { tokens, provider });
  }
  /**
   * Get cached cost calculation
   */
  getCostCalculation(tokens: number, provider: string): number | null {
    const key = `cost:${provider}:${tokens}`;
    const cached = this.get(key);
    return cached ? parseFloat(cached) : null;
  }
}
