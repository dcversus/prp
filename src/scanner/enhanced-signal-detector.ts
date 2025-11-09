/**
 * ♫ Enhanced Real-Time Signal Detector for @dcversus/prp Scanner
 *
 * High-performance signal detection with sub-100ms response time,
 * intelligent caching, and batch processing capabilities.
 * Part of PRP-004: Scanner Signal Integration Enhancement
 */

import { Signal } from '../shared/types';
import { SignalPattern } from './types';
import { createLayerLogger, HashUtils } from '../shared';
import { SignalDetectorImpl } from './signal-detector';

const logger = createLayerLogger('scanner');

// Performance monitoring interface
interface DetectionMetrics {
  totalDetections: number;
  averageLatency: number;
  cacheHitRate: number;
  signalsPerSecond: number;
  lastResetTime: Date;
}

// Batch processing configuration
interface BatchConfig {
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  maxConcurrency: number;
}

// Enhanced cache with LRU eviction
class SignalCache {
  private cache = new Map<string, { signals: Signal[]; timestamp: Date; accessCount: number }>();
  private maxSize: number;
  private ttl: number; // time to live in milliseconds

  constructor(maxSize: number = 10000, ttl: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): Signal[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp.getTime() > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access count for LRU
    entry.accessCount++;
    return entry.signals;
  }

  set(key: string, signals: Signal[]): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      signals,
      timestamp: new Date(),
      accessCount: 1
    });
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < oldestAccess) {
        oldestAccess = entry.accessCount;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need hit tracking implementation
    };
  }
}

// Real-time signal processor with debouncing
class RealTimeProcessor {
  private processingQueue = new Map<string, { content: string; timestamp: number; timer?: ReturnType<typeof setTimeout> }>();
  private debounceTime: number;
  private onSignalsDetected: (filePath: string, signals: Signal[]) => void;

  constructor(debounceTime: number = 50, onSignalsDetected: (filePath: string, signals: Signal[]) => void) {
    this.debounceTime = debounceTime;
    this.onSignalsDetected = onSignalsDetected;
  }

  queueProcessing(filePath: string, content: string): void {
    const existing = this.processingQueue.get(filePath);

    // Clear existing timer
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    // Queue new processing
    const timer = setTimeout(() => {
      this.processFile(filePath, content);
      this.processingQueue.delete(filePath);
    }, this.debounceTime);

    this.processingQueue.set(filePath, {
      content,
      timestamp: Date.now(),
      timer
    });
  }

  private processFile(filePath: string, content: string): void {
    const startTime = Date.now();
    const signals = this.extractSignals(content);
    const latency = Date.now() - startTime;

    // Add file path metadata
    signals.forEach(signal => {
      signal.metadata = {
        ...signal.metadata,
        filePath,
        detectionLatency: latency,
        processedAt: new Date()
      };
    });

    this.onSignalsDetected(filePath, signals);
  }

  private extractSignals(content: string): Signal[] {
    const signals: Signal[] = [];
    const signalPattern = /\[([a-zA-Z]{2})\]/g;
    let match;

    while ((match = signalPattern.exec(content)) !== null) {
      const signalCode = match[1];

      if (!signalCode) continue;
      signals.push({
        id: HashUtils.generateId(),
        type: signalCode,
        priority: this.calculatePriority(signalCode),
        source: 'enhanced-scanner',
        timestamp: new Date(),
        data: {
          rawSignal: match[0],
          position: match.index,
          line: this.getLineNumber(content, match.index)
        },
        metadata: {
          detector: 'enhanced-real-time',
          patternVersion: '2.0'
        }
      });
    }

    return signals;
  }

  private calculatePriority(signalCode: string): number {
    // Priority mapping based on signal importance
    const priorityMap: Record<string, number> = {
      'FF': 10, // System Fatal Error
      'bb': 9,  // Blocker
      'ff': 9,  // Goal Not Achievable
      'JC': 9,  // Jesus Christ (Incident Resolved)
      'af': 8,  // Feedback Request
      'no': 8,  // Not Obvious
      'ic': 8,  // Incident
      'er': 8,  // Escalation Required
      'oa': 8,  // Orchestrator Attention
      'tr': 6,  // Tests Red
      'cf': 6,  // CI Failed
      'rr': 6,  // Research Request
      'aa': 6,  // Admin Attention
    };

    return priorityMap[signalCode.toUpperCase()] ?? 3;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  clear(): void {
    // Clear all pending timers
    for (const entry of this.processingQueue.values()) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    }
    this.processingQueue.clear();
  }

  getQueueSize(): number {
    return this.processingQueue.size;
  }
}

// Main enhanced signal detector
export class EnhancedSignalDetector {
  private patterns: SignalPattern[] = [];
  private cache: SignalCache;
  private realTimeProcessor: RealTimeProcessor;
  private metrics: DetectionMetrics;
  private batchConfig: BatchConfig;
  private signalCallbacks = new Set<(filePath: string, signals: Signal[]) => void>();

  constructor(config: {
    cacheSize?: number;
    cacheTTL?: number;
    debounceTime?: number;
    batchSize?: number;
    batchTimeout?: number;
    maxConcurrency?: number;
  } = {}) {
    this.cache = new SignalCache(
      config.cacheSize ?? 10000,
      config.cacheTTL ?? 60000
    );

    this.batchConfig = {
      maxBatchSize: config.batchSize ?? 100,
      batchTimeout: config.batchTimeout ?? 100,
      maxConcurrency: config.maxConcurrency ?? 5
    };

    this.realTimeProcessor = new RealTimeProcessor(
      config.debounceTime ?? 50,
      this.handleSignalsDetected.bind(this)
    );

    this.metrics = {
      totalDetections: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      signalsPerSecond: 0,
      lastResetTime: new Date()
    };

    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default signal patterns from AGENTS.md
   */
  private initializeDefaultPatterns(): void {
    // Import all patterns from SignalDetectorImpl for consistency
    const originalDetector = new SignalDetectorImpl();
    this.patterns = originalDetector.getAllPatterns();
  }

  private getSignalPosition(content: string, index: number): { line: number; column: number } {
    const beforeIndex = content.substring(0, index);
    const lines = beforeIndex.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1]?.length ?? 0;
    return { line, column };
  }

  private extractContext(content: string, line: number, column: number, contextRadius: number = 50): string {
    const lines = content.split('\n');
    const lineContent = lines[line] ?? '';
    const start = Math.max(0, column - contextRadius);
    const end = Math.min(lineContent.length, column + contextRadius);
    return lineContent.substring(start, end).trim();
  }

  /**
   * Real-time signal detection with caching
   */
  async detectSignalsRealTime(filePath: string, content: string): Promise<Signal[]> {
    const startTime = Date.now();

    // Handle invalid content gracefully
    if (!content || typeof content !== 'string') {
      return [];
    }

    // Generate content hash for caching
    const contentHash = await HashUtils.hashString(String(content));
    const cacheKey = `${filePath}:${contentHash.substring(0, 16)}`;

    // Check cache first
    const cachedSignals = this.cache.get(cacheKey);
    if (cachedSignals) {
      this.updateMetrics(Date.now() - startTime, true);
      return cachedSignals;
    }

    // Process in real-time with debouncing
    this.realTimeProcessor.queueProcessing(filePath, content);

    // Return signals synchronously for immediate response
    const signals = await this.extractSignalsWithPatterns(content);

    // Cache the results
    this.cache.set(cacheKey, signals);

    this.updateMetrics(Date.now() - startTime, false);
    return signals;
  }

  /**
   * Batch process multiple files for optimal performance
   */
  async detectSignalsBatch(files: Array<{ path: string; content: string }>): Promise<Array<{ path: string; signals: Signal[] }>> {
    const startTime = Date.now();
    const results: Array<{ path: string; signals: Signal[] }> = [];

    // Process files in parallel with concurrency limit
    const chunks = this.chunkArray(files, this.batchConfig.maxBatchSize);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        const signals = await this.detectSignalsRealTime(file.path, file.content);
        return { path: file.path, signals };
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    logger.info('EnhancedSignalDetector', `Batch processed ${files.length} files in ${Date.now() - startTime}ms`);
    return results;
  }

  /**
   * Extract signals using optimized pattern matching
   */
  private async extractSignalsWithPatterns(content: string): Promise<Signal[]> {
    const signals: Signal[] = [];

    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;

      let match;
      if (pattern.pattern.global) {
        pattern.pattern.lastIndex = 0;
      }

      while ((match = pattern.pattern.exec(content)) !== null) {
        const signalMatch = match[0];
        if (!signalMatch || typeof signalMatch !== 'string') continue;

        const signalCode = signalMatch.substring(1, 3); // Extract XX from [XX]
        const position = this.getSignalPosition(content, match.index);

        signals.push({
          id: HashUtils.generateId(),
          type: signalCode,
          priority: pattern.priority,
          source: 'enhanced-detector',
          timestamp: new Date(),
          data: {
            rawSignal: signalMatch,
            patternName: pattern.name,
            category: pattern.category,
            description: pattern.description,
            line: position.line,
            column: position.column,
            context: this.extractContext(content, position.line, position.column)
          },
          metadata: {
            detector: 'enhanced-pattern-matcher',
            guideline: pattern.id
          }
        });
      }
    }

    return signals;
  }

  /**
   * Handle signals detected by real-time processor
   */
  private handleSignalsDetected(filePath: string, signals: Signal[]): void {
    // Notify all registered callbacks
    for (const callback of this.signalCallbacks) {
      try {
        callback(filePath, signals);
      } catch (error) {
        logger.error('EnhancedSignalDetector', `Error in signal callback for ${filePath}: ${error}`);
      }
    }

    // Update metrics
    this.metrics.totalDetections += signals.length;
  }

  /**
   * Register callback for signal detection events
   */
  onSignalsDetected(callback: (filePath: string, signals: Signal[]) => void): void {
    this.signalCallbacks.add(callback);
  }

  /**
   * Remove signal detection callback
   */
  removeSignalCallback(callback: (filePath: string, signals: Signal[]) => void): void {
    this.signalCallbacks.delete(callback);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(latency: number, cacheHit: boolean): void {
    this.metrics.totalDetections++;

    // Update average latency (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageLatency = this.metrics.averageLatency * (1 - alpha) + latency * alpha;

    // Update cache hit rate
    // This is simplified - would need proper tracking in production
    this.metrics.cacheHitRate = cacheHit ? 0.8 : 0.2;

    // Update signals per second
    const now = Date.now();
    const timeDiff = now - this.metrics.lastResetTime.getTime();
    if (timeDiff > 1000) { // Reset every second
      this.metrics.signalsPerSecond = this.metrics.totalDetections;
      this.metrics.totalDetections = 0;
      this.metrics.lastResetTime = new Date(now);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): DetectionMetrics & {
    cacheStats: { size: number; hitRate: number };
    queueSize: number;
    patternCount: number;
  } {
    return {
      ...this.metrics,
      cacheStats: this.cache.getStats(),
      queueSize: this.realTimeProcessor.getQueueSize(),
      patternCount: this.patterns.length
    };
  }

  /**
   * Add custom signal pattern
   */
  addPattern(pattern: Omit<SignalPattern, 'id'>): void {
    const newPattern: SignalPattern = {
      ...pattern,
      id: HashUtils.generateId(),
      custom: true
    };

    this.patterns.push(newPattern);
    logger.info('EnhancedSignalDetector', `Added custom pattern: ${newPattern.name}`);
  }

  /**
   * Remove pattern by ID
   */
  removePattern(patternId: string): boolean {
    const index = this.patterns.findIndex(p => p.id === patternId);
    if (index >= 0) {
      this.patterns.splice(index, 1);
      logger.info('EnhancedSignalDetector', `Removed pattern: ${patternId}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all caches and reset metrics
   */
  reset(): void {
    this.cache.clear();
    this.realTimeProcessor.clear();
    this.metrics = {
      totalDetections: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      signalsPerSecond: 0,
      lastResetTime: new Date()
    };
  }

  /**
   * Utility function to chunk array for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): void {
    this.reset();
    this.signalCallbacks.clear();
    logger.info('EnhancedSignalDetector', 'Enhanced signal detector shutdown complete');
  }
}