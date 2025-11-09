/**
 * 🚀 Optimized Scanner for @dcversus/prp
 *
 * Performance optimizations:
 * - Debounced file watching
 * - Lazy signal parsing
 * - Cached file hashing
 * - Efficient git operations
 * - Memory-managed event handling
 * - Batch processing
 */

import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'chokidar';
import { performanceManager, measurePerformanceDecorator } from '../performance/index.js';
import { extname } from 'path';
import { readFile, stat } from 'fs/promises';
import { createHash } from 'crypto';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('scanner');

export interface OptimizedScannerConfig {
  paths: string[];
  ignore?: string[];
  debounceMs?: number;
  batchSize?: number;
  maxMemoryMB?: number;
  cacheEnabled?: boolean;
  signalParsingEnabled?: boolean;
}

export interface ScanResult {
  path: string;
  hash: string;
  signals: Signal[];
  size: number;
  modified: Date;
}

export interface Signal {
  type: string;
  line: number;
  column: number;
  context: string;
  file: string;
}

export interface ScanEvent {
  type: 'change' | 'add' | 'unlink';
  path: string;
  result?: ScanResult;
  error?: Error;
}

/**
 * High-performance file hasher with caching
 */
class FileHasher {
  private cache = new Map<string, { hash: string; mtime: number }>();
  private maxCacheSize = 10000;

  async hashFile(filePath: string): Promise<string> {
    performanceManager.startOperation('file-hashing');

    try {
      const fileStat = await stat(filePath);
      const mtime = fileStat.mtime.getTime();

      // Check cache first
      const cached = this.cache.get(filePath);
      if (cached?.mtime === mtime) {
        performanceManager.endOperation('file-hashing');
        return cached.hash;
      }

      // Compute hash
      const content = await readFile(filePath, 'utf-8');
      const hash = createHash('md5').update(content).digest('hex');

      // Update cache
      if (this.cache.size >= this.maxCacheSize) {
        // Remove oldest entries
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].mtime - b[1].mtime);
        entries.slice(0, this.cache.size / 2).forEach(([key]) => {
          this.cache.delete(key);
        });
      }

      this.cache.set(filePath, { hash, mtime });

      performanceManager.endOperation('file-hashing');
      return hash;

    } catch (error) {
      performanceManager.endOperation('file-hashing');
      throw error;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Optimized signal parser with lazy evaluation
 */
class LazySignalParser {
  private signalPatterns = new Map<string, RegExp>([
    ['dp', /\[dp\]/g],
    ['bf', /\[bf\]/g],
    ['cq', /\[cq\]/g],
    ['tw', /\[tw\]/g],
    ['dp', /\[dp\]/g],
    ['br', /\[br\]/g],
    ['rc', /\[rc\]/g],
    ['bb', /\[bb\]/g],
    ['af', /\[af\]/g],
    ['gg', /\[gg\]/g],
    ['ff', /\[ff\]/g],
    ['da', /\[da\]/g],
    ['no', /\[no\]/g],
    ['rp', /\[rp\]/g],
    ['vr', /\[vr\]/g],
    ['rr', /\[rr\]/g],
    ['vp', /\[vp\]/g],
    ['er', /\[er\]/g],
    ['ip', /\[ip\]/g],
    ['tg', /\[tg\]/g],
    ['tr', /\[tr\]/g],
    ['cf', /\[cf\]/g],
    ['cp', /\[cp\]/g],
    ['pc', /\[pc\]/g],
    ['rg', /\[rg\]/g],
    ['cd', /\[cd\]/g],
    ['cc', /\[cc\]/g],
    ['rv', /\[rv\]/g],
    ['iv', /\[iv\]/g],
    ['ra', /\[ra\]/g],
    ['mg', /\[mg\]/g],
    ['rl', /\[rl\]/g],
    ['ps', /\[ps\]/g],
    ['ic', /\[ic\]/g],
    ['JC', /\[JC\]/g],
    ['pm', /\[pm\]/g],
    ['oa', /\[oa\]/g],
    ['aa', /\[aa\]/g],
    ['ap', /\[ap\]/g]
  ]);

  // Cache for parsed files
  private parseCache = new Map<string, { signals: Signal[]; mtime: number }>();
  private maxCacheSize = 5000;

  async parseSignals(filePath: string, content: string): Promise<Signal[]> {
    performanceManager.startOperation('signal-parsing');

    try {
      const fileStat = await stat(filePath);
      const mtime = fileStat.mtime.getTime();

      // Check cache first
      const cached = this.parseCache.get(filePath);
      if (cached?.mtime === mtime) {
        performanceManager.endOperation('signal-parsing');
        return cached.signals;
      }

      // Only parse relevant files
      if (!this.shouldParseFile(filePath)) {
        performanceManager.endOperation('signal-parsing');
        return [];
      }

      const signals: Signal[] = [];
      const lines = content.split('\n');

      for (const [signalType, pattern] of this.signalPatterns) {
        if (!signalType) continue;
        pattern.lastIndex = 0; // Reset regex

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          if (!line) continue;

          let match;

          while ((match = pattern.exec(line)) !== null) {
            signals.push({
              type: signalType,
              line: lineIndex + 1,
              column: match.index + 1,
              context: this.extractContext(lines, lineIndex, match.index),
              file: filePath
            });
          }
        }
      }

      // Update cache
      if (this.parseCache.size >= this.maxCacheSize) {
        const entries = Array.from(this.parseCache.entries());
        entries.sort((a, b) => a[1].mtime - b[1].mtime);
        entries.slice(0, this.parseCache.size / 2).forEach(([key]) => {
          this.parseCache.delete(key);
        });
      }

      this.parseCache.set(filePath, { signals, mtime });

      performanceManager.endOperation('signal-parsing');
      return signals;

    } catch (error) {
      performanceManager.endOperation('signal-parsing');
      throw error;
    }
  }

  private shouldParseFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const validExtensions = ['.md', '.txt', '.js', '.ts', '.jsx', '.tsx'];
    const basename = filePath.toLowerCase();

    // Only parse relevant files
    return validExtensions.includes(ext) || basename.includes('prp') || basename.includes('readme');
  }

  private extractContext(lines: string[], lineIndex: number, columnIndex: number): string {
    const contextLines = 2;
    const startLine = Math.max(0, lineIndex - contextLines);
    const endLine = Math.min(lines.length - 1, lineIndex + contextLines);

    const context = lines.slice(startLine, endLine + 1).join('\n');
    return context.substring(Math.max(0, columnIndex - 50), columnIndex + 50);
  }

  clearCache(): void {
    this.parseCache.clear();
  }

  getCacheSize(): number {
    return this.parseCache.size;
  }
}

/**
 * Debounced batch processor for file changes
 */
class DebouncedBatchProcessor {
  private pending = new Map<string, ScanEvent>();
  private timeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly handler: (events: ScanEvent[]) => Promise<void>,
    private readonly debounceMs: number = 500
  ) {}

  add(event: ScanEvent): void {
    this.pending.set(event.path, event);

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(async () => {
      const events = Array.from(this.pending.values());
      this.pending.clear();
      this.timeout = null;

      try {
        await this.handler(events);
      } catch (error) {
        logger.error('OptimizedScanner', 'Batch processor error', error instanceof Error ? error : new Error(String(error)));
      }
    }, this.debounceMs);
  }

  flush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

/**
 * Optimized scanner with all performance improvements
 */
export class OptimizedScanner extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private hasher: FileHasher;
  private signalParser: LazySignalParser;
  private batchProcessor: DebouncedBatchProcessor;
  private isRunning = false;
  private config: OptimizedScannerConfig;

  // Performance metrics
  private metrics = {
    filesScanned: 0,
    signalsFound: 0,
    errors: 0,
    avgScanTime: 0
  };

  constructor(config: OptimizedScannerConfig) {
    super();

    this.config = {
      debounceMs: 500,
      batchSize: 50,
      maxMemoryMB: 100,
      cacheEnabled: true,
      signalParsingEnabled: true,
      ...config
    };

    this.hasher = new FileHasher();
    this.signalParser = new LazySignalParser();
    this.batchProcessor = new DebouncedBatchProcessor(
      this.handleBatchEvents.bind(this),
      this.config.debounceMs
    );

    // Set up memory monitoring
    this.setupMemoryMonitoring();
  }

  @measurePerformanceDecorator('scanner-start')
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('OptimizedScanner', 'Scanner is already running');
      return;
    }

    performanceManager.startOperation('scanner-startup');

    try {
      logger.info('OptimizedScanner', `🚀 Starting optimized scanner for paths: ${this.config.paths.join(', ')}`);

      this.watcher = watch(this.config.paths, {
        ignored: this.config.ignore ?? ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      // Set up file system event handlers
      this.watcher.on('change', this.handleFileChange.bind(this));
      this.watcher.on('add', this.handleFileAdd.bind(this));
      this.watcher.on('unlink', this.handleFileUnlink.bind(this));
      this.watcher.on('error', this.handleError.bind(this));

      this.isRunning = true;
      performanceManager.endOperation('scanner-startup');

      logger.info('OptimizedScanner', '✅ Optimized scanner started successfully');
      this.emit('started');

    } catch (error) {
      performanceManager.endOperation('scanner-startup');
      this.handleError(error);
      throw error;
    }
  }

  @measurePerformanceDecorator('scanner-stop')
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    performanceManager.startOperation('scanner-shutdown');

    try {
      // Flush pending events
      this.batchProcessor.flush();

      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }

      this.isRunning = false;
      performanceManager.endOperation('scanner-shutdown');

      logger.info('OptimizedScanner', '✅ Optimized scanner stopped');
      this.emit('stopped');

    } catch (error) {
      performanceManager.endOperation('scanner-shutdown');
      this.handleError(error);
      throw error;
    }
  }

  private handleFileChange(filePath: string): void {
    this.batchProcessor.add({
      type: 'change',
      path: filePath
    });
  }

  private handleFileAdd(filePath: string): void {
    this.batchProcessor.add({
      type: 'add',
      path: filePath
    });
  }

  private handleFileUnlink(filePath: string): void {
    this.batchProcessor.add({
      type: 'unlink',
      path: filePath
    });
  }

  private handleError(error: unknown): void {
    this.metrics.errors++;
    logger.error('OptimizedScanner', '❌ Scanner error', error instanceof Error ? error : new Error(String(error)));
    this.emit('error', error);
  }

  @measurePerformanceDecorator('batch-process')
  private async handleBatchEvents(events: ScanEvent[]): Promise<void> {
    performanceManager.startOperation('batch-scan');

    try {
      // Process events in batches to avoid memory spikes
      const batchSize = this.config.batchSize ?? 50;
      const batches = this.chunkArray(events, batchSize);

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(event => this.processFileEvent(event))
        );

        // Emit results
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            this.emit('scan', result.value);
          } else {
            this.handleError(result.reason);
          }
        });

        // Allow event loop to process other tasks
        await new Promise(resolve => setImmediate(resolve));
      }

      performanceManager.endOperation('batch-scan');

    } catch (error) {
      performanceManager.endOperation('batch-scan');
      this.handleError(error);
    }
  }

  @measurePerformanceDecorator('file-scan')
  private async processFileEvent(event: ScanEvent): Promise<ScanEvent & { result: ScanResult }> {
    performanceManager.startOperation('single-file-scan');

    try {
      if (event.type === 'unlink') {
        return { ...event, result: { path: event.path, hash: '', signals: [], size: 0, modified: new Date() } };
      }

      // Read and hash file
      const content = await readFile(event.path, 'utf-8');
      const hash = await this.hasher.hashFile(event.path);
      const fileStat = await stat(event.path);

      // Parse signals if enabled
      const signals = this.config.signalParsingEnabled
        ? await this.signalParser.parseSignals(event.path, content)
        : [];

      const result: ScanResult = {
        path: event.path,
        hash,
        signals,
        size: fileStat.size,
        modified: fileStat.mtime
      };

      // Update metrics
      this.metrics.filesScanned++;
      this.metrics.signalsFound += signals.length;

      performanceManager.endOperation('single-file-scan');
      return { ...event, result };

    } catch (error) {
      performanceManager.endOperation('single-file-scan');
      throw new Error(`Failed to process file ${event.path}: ${error}`);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private setupMemoryMonitoring(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      const memoryMB = usage.heapUsed / 1024 / 1024;

      if (memoryMB > (this.config.maxMemoryMB ?? 100)) {
        logger.warn('OptimizedScanner', `🚨 Scanner memory usage high: ${memoryMB.toFixed(2)}MB`);

        // Clear caches to free memory
        this.hasher.clearCache();
        this.signalParser.clearCache();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  getMetrics(): typeof this.metrics & {
    cacheSize: { hasher: number; parser: number };
    isRunning: boolean;
  } {
    return {
      ...this.metrics,
      cacheSize: {
        hasher: this.hasher.getCacheSize(),
        parser: this.signalParser.getCacheSize()
      },
      isRunning: this.isRunning
    };
  }

  clearCaches(): void {
    this.hasher.clearCache();
    this.signalParser.clearCache();
  }
}

/**
 * Factory function for creating optimized scanner instances
 */
export function createOptimizedScanner(config: OptimizedScannerConfig): OptimizedScanner {
  return new OptimizedScanner(config);
}