import { LRUCache, PerformanceCache, DebouncedCache } from '../cache.js';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3, 100); // Small cache for testing
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should handle TTL expiration', (done) => {
      const shortCache = new LRUCache<string>(10, 50); // 50ms TTL
      shortCache.set('key1', 'value1');

      // Should be available immediately
      expect(shortCache.get('key1')).toBe('value1');

      // Should expire after TTL
      setTimeout(() => {
        expect(shortCache.get('key1')).toBeUndefined();
        done();
      }, 60);
    });

    it('should update access statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(1);
    });

    it('should count misses', () => {
      cache.get('nonexistent1');
      cache.get('nonexistent2');

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', (done) => {
      const shortCache = new LRUCache<string>(10, 50);
      shortCache.set('key1', 'value1');

      setTimeout(() => {
        expect(shortCache.has('key1')).toBe(false);
        done();
      }, 60);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries and reset stats', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('nonexistent');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // All should be present
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');

      // Add fourth item, should evict key1 (least recently used)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBeUndefined(); // Evicted
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it most recently used
      cache.get('key1');

      // Add fourth item, should evict key2 (now least recently used)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1'); // Still present due to access
      expect(cache.get('key2')).toBeUndefined(); // Evicted
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('getEntries', () => {
    it('should return all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const entries = cache.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries.find(e => e.key === 'key1')?.entry.value).toBe('value1');
      expect(entries.find(e => e.key === 'key2')?.entry.value).toBe('value2');
    });

    it('should not include expired entries', (done) => {
      const shortCache = new LRUCache<string>(10, 50);
      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2');

      setTimeout(() => {
        const entries = shortCache.getEntries();
        expect(entries).toHaveLength(0);
        done();
      }, 60);
    });
  });
});

describe('PerformanceCache', () => {
  beforeEach(() => {
    PerformanceCache.clearAll();
  });

  describe('singleton instances', () => {
    it('should provide cache instances', () => {
      const configCache = PerformanceCache.getConfigCache();
      const fileCache = PerformanceCache.getFileCache();
      const commandCache = PerformanceCache.getCommandCache();
      const templateCache = PerformanceCache.getTemplateCache();

      expect(configCache).toBeInstanceOf(LRUCache);
      expect(fileCache).toBeInstanceOf(LRUCache);
      expect(commandCache).toBeInstanceOf(LRUCache);
      expect(templateCache).toBeInstanceOf(LRUCache);
    });

    it('should return same instances on multiple calls', () => {
      const cache1 = PerformanceCache.getConfigCache();
      const cache2 = PerformanceCache.getConfigCache();

      expect(cache1).toBe(cache2);
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all caches', () => {
      PerformanceCache.getConfigCache().set('test', 'value');
      PerformanceCache.getFileCache().set('test', 'value');

      const stats = PerformanceCache.getAllStats();

      expect(stats.config).toBeDefined();
      expect(stats.file).toBeDefined();
      expect(stats.command).toBeDefined();
      expect(stats.template).toBeDefined();

      expect(stats.config?.size).toBe(1);
      expect(stats.file?.size).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should clear all cache instances', () => {
      PerformanceCache.getConfigCache().set('test', 'value');
      PerformanceCache.getFileCache().set('test', 'value');

      PerformanceCache.clearAll();

      const stats = PerformanceCache.getAllStats();
      expect(stats.config?.size).toBe(0);
      expect(stats.file?.size).toBe(0);
      expect(stats.command?.size).toBe(0);
      expect(stats.template?.size).toBe(0);
    });
  });

  describe('warmUpCache', () => {
    it('should pre-populate cache with common values', () => {
      PerformanceCache.warmUpCache();

      const configCache = PerformanceCache.getConfigCache();
      const fileCache = PerformanceCache.getFileCache();

      expect(configCache.get('default-theme')).toBe('dark');
      expect(configCache.get('default-timeout')).toBe(30000);
      expect(fileCache.get('config-paths')).toBe('.prprc.json,.prprc.yaml,.prprc.yml');
    });
  });
});

describe('DebouncedCache', () => {
  let debouncedCache: DebouncedCache;
  let mockFn: jest.Mock;

  beforeEach(() => {
    debouncedCache = new DebouncedCache();
    mockFn = jest.fn(() => 'computed-value');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    debouncedCache.clear();
  });

  describe('debounce', () => {
    it('should return function result immediately', () => {
      const result = debouncedCache.debounce('key1', mockFn, 100);
      expect(result).toBe('computed-value');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached result for same key within delay', () => {
      debouncedCache.debounce('key1', mockFn, 100);
      const result = debouncedCache.debounce('key1', mockFn, 100);

      expect(result).toBe('computed-value');
      expect(mockFn).toHaveBeenCalledTimes(1); // Function not called again
    });

    it('should call function again after delay', () => {
      debouncedCache.debounce('key1', mockFn, 100);

      jest.advanceTimersByTime(100);

      const result = debouncedCache.debounce('key1', mockFn, 100);

      expect(result).toBe('computed-value');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle different keys independently', () => {
      const mockFn2 = jest.fn(() => 'value2');

      const result1 = debouncedCache.debounce('key1', mockFn, 100);
      const result2 = debouncedCache.debounce('key2', mockFn2, 100);

      expect(result1).toBe('computed-value');
      expect(result2).toBe('value2');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn2).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous timeout when same key is used again', () => {
      debouncedCache.debounce('key1', mockFn, 100);
      debouncedCache.debounce('key1', mockFn, 100); // Reset timer

      jest.advanceTimersByTime(100);

      // Should still have the entry because timer was reset
      expect(debouncedCache.size()).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries and cancel timeouts', () => {
      debouncedCache.debounce('key1', mockFn, 100);
      debouncedCache.debounce('key2', mockFn, 100);

      expect(debouncedCache.size()).toBe(2);

      debouncedCache.clear();

      expect(debouncedCache.size()).toBe(0);

      // Advance timers to ensure timeouts are cancelled
      jest.advanceTimersByTime(100);
      expect(debouncedCache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return number of cached entries', () => {
      expect(debouncedCache.size()).toBe(0);

      debouncedCache.debounce('key1', mockFn, 100);
      expect(debouncedCache.size()).toBe(1);

      debouncedCache.debounce('key2', mockFn, 100);
      expect(debouncedCache.size()).toBe(2);
    });
  });
});