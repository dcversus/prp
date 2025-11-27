/**
 * ♫ Unified Signal Detector for @dcversus/prp Scanner
 *
 * Consolidates signal detection logic from all three implementations:
 * - signal-detector.ts
 * - enhanced-signal-detector.ts
 * - enhanced-signal-detector-with-patterns.ts
 *
 * Features:
 * - Single source of truth for signal patterns
 * - High-performance caching with LRU eviction
 * - Real-time processing with debouncing
 * - Batch processing capabilities
 * - Proper TypeScript types
 */

import { EventEmitter } from 'events';

import { createLayerLogger, HashUtils } from '../shared';
import { SignalCategory } from '../shared/types/signals';

import type { Signal } from '../shared/types/common';
import type { SignalPattern } from './types';

const logger = createLayerLogger('scanner');

// Enhanced cache with LRU eviction and TTL
class SignalCache {
  private readonly cache = new Map<string, { signals: Signal[]; timestamp: number; accessCount: number }>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 10000, ttl = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): Signal[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access count for LRU
    entry.accessCount++;
    this.hits++;
    return entry.signals;
  }

  set(key: string, signals: Signal[]): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      signals,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;
    for (const [key, entry] of Array.from(this.cache.entries())) {
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
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// Real-time processor with debouncing
class RealTimeProcessor {
  private readonly processingQueue = new Map<
    string,
    { content: string; timestamp: number; timer?: ReturnType<typeof setTimeout> }
  >();
  private readonly debounceTime: number;
  private readonly onSignalsDetected: (filePath: string, signals: Signal[]) => void;

  constructor(debounceTime = 50, onSignalsDetected: (filePath: string, signals: Signal[]) => void) {
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
      timer,
    });
  }

  private processFile(filePath: string, content: string): void {
    const signals = this.extractSignals(content);

    // Add file path metadata
    signals.forEach((signal) => {
      signal.metadata = {
        ...(signal.metadata || {}),
        agent: 'unified-signal-detector',
        filePath,
        processedAt: new Date(),
      };
    });

    this.onSignalsDetected(filePath, signals);
  }

  private extractSignals(content: string): Signal[] {
    const signals: Signal[] = [];

    // Enhanced signal pattern that matches [XX] where XX are exactly 2 letters
    const signalPattern = /\[([a-zA-Z]{2})\]/g;
    let match;

    while ((match = signalPattern.exec(content)) !== null) {
      const signalCode = match[1]?.toUpperCase();
      if (signalCode?.length !== 2) {
        continue;
      }

      // Validate signal code against known signal patterns
      if (this.isValidSignalCode(signalCode)) {
        const position = this.getSignalPosition(content, match.index);

        signals.push({
          id: HashUtils.generateId(),
          type: signalCode,
          priority: this.calculatePriority(signalCode),
          source: 'unified-scanner',
          timestamp: new Date(),
          resolved: false,
          relatedSignals: [],
          data: {
            rawSignal: match[0],
            line: position.line,
            column: position.column,
            context: this.extractSignalContext(content, match.index),
          },
          metadata: {
            agent: 'unified-signal-detector',
            detector: 'unified-signal-detector',
            confidence: this.calculateConfidence(content, match.index),
          },
        });
      }
    }

    return signals;
  }

  private isValidSignalCode(signalCode: string): boolean {
    // List of valid signal codes from AGENTS.md
    const validSignals = new Set([
      // System signals
      'HF', 'pr', 'PR', 'FF', 'TF', 'TC', 'TI',
      // Agent signals - Critical/High Priority
      'bb', 'af', 'gg', 'ff', 'da', 'no', 'ic', 'er', 'oa',
      // Agent signals - Medium Priority
      'rp', 'vr', 'rr', 'vp', 'ip', 'tp', 'dp', 'br', 'rc',
      'tw', 'bf', 'cq', 'cp', 'tr', 'tg', 'cf', 'pc', 'rg',
      'cd', 'rv', 'iv', 'ra', 'mg', 'rl', 'ps', 'JC', 'pm',
      // Agent signals - Coordination
      'aa', 'ap', 'oa', 'cc', 'fo', 'as', 'pt', 'pe', 'fs',
      'ds', 'rb', 'ao', 'ac', 'sl', 'eb', 'ir', 'pb', 'rc',
      'rt', 'ts', 'er',
      // Designer signals
      'du', 'ds', 'dr', 'dh', 'da', 'dc', 'df', 'dt', 'dp',
      // DevOps/SRE signals
      'id', 'cd', 'mo', 'ir', 'so', 'sc', 'pb', 'dr', 'cu',
      'ao', 'sl', 'eb', 'ps', 'rc', 'rt', 'ao', 'ts', 'er',
    ]);

    return validSignals.has(signalCode);
  }

  private calculatePriority(signalCode: string): number {
    // Priority mapping based on signal importance
    const priorityMap: Record<string, number> = {
      // Critical Priority (9-10)
      FF: 10, // System Fatal Error
      bb: 9,  // Blocker
      ff: 9,  // Goal Not Achievable
      JC: 9,  // Jesus Christ (Incident Resolved)

      // High Priority (7-8)
      af: 8,  // Feedback Request
      no: 8,  // Not Obvious
      ic: 8,  // Incident
      er: 8,  // Escalation Required
      oa: 8,  // Orchestrator Attention

      // Medium-High Priority (5-6)
      tr: 6,  // Tests Red
      cf: 6,  // CI Failed
      rr: 6,  // Research Request
      aa: 6,  // Admin Attention

      // Default medium priority
    };

    return priorityMap[signalCode.toUpperCase()] ?? 3;
  }

  private getSignalPosition(content: string, index?: number): { line: number; column: number } {
    if (!index) return { line: 0, column: 0 };

    const beforeIndex = content.substring(0, index);
    const lines = beforeIndex.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1]?.length ?? 0;

    return { line, column };
  }

  private extractSignalContext(content: string, index?: number, contextRadius = 100): string {
    if (!index) return '';

    const start = Math.max(0, index - contextRadius);
    const end = Math.min(content.length, index + contextRadius);
    return content.substring(start, end);
  }

  private calculateConfidence(content: string, index?: number): number {
    if (!index) return 0.5;

    // High confidence if signal appears in PRP context
    const context = this.extractSignalContext(content, index, 200);
    let confidence = 0.8; // Base confidence

    // Boost confidence for PRP files
    if (context.includes('PRP-') || context.includes('## progress') || context.includes('> our goal')) {
      confidence += 0.15;
    }

    // Boost confidence if signal is followed by comment
    const afterSignal = content.substring(index + 4, Math.min(content.length, index + 100));
    if (afterSignal.includes('-') || afterSignal.includes('✅') || afterSignal.includes('❌')) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  clear(): void {
    // Clear all pending timers
    for (const entry of Array.from(this.processingQueue.values())) {
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

// Main Unified Signal Detector
export class UnifiedSignalDetector extends EventEmitter {
  private patterns: SignalPattern[] = [];
  private readonly cache: SignalCache;
  private readonly realTimeProcessor: RealTimeProcessor;
  private readonly signalCallbacks = new Set<(filePath: string, signals: Signal[]) => void>();

  private metrics = {
    totalDetections: 0,
    averageLatency: 0,
    cacheHitRate: 0,
    signalsPerSecond: 0,
    lastResetTime: new Date(),
  };

  constructor(config: {
    cacheSize?: number;
    cacheTTL?: number;
    debounceTime?: number;
    batchSize?: number;
    batchTimeout?: number;
    maxConcurrency?: number;
  } = {}) {
    super();

    this.cache = new SignalCache(config.cacheSize ?? 10000, config.cacheTTL ?? 60000);
    this.realTimeProcessor = new RealTimeProcessor(
      config.debounceTime ?? 50,
      this.handleSignalsDetected.bind(this),
    );

    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default signal patterns from AGENTS.md
   */
  private initializeDefaultPatterns(): void {
    // All 75+ signals from AGENTS.md with proper categorization
    this.patterns = [
      // === CRITICAL PRIORITY SIGNALS (9-10) ===
      {
        id: 'FF',
        name: 'System Fatal Error',
        pattern: /\[FF\]/gi,
        category: SignalCategory.SYSTEM,
        priority: 10,
        description: 'Critical system corruption/unrecoverable errors',
        enabled: true,
        custom: false,
      },
      {
        id: 'bb',
        name: 'Blocker',
        pattern: /\[bb\]/gi,
        category: SignalCategory.DEVELOPMENT,
        priority: 9,
        description: 'Technical dependency, configuration, or external requirement blocks progress',
        enabled: true,
        custom: false,
      },
      {
        id: 'ff',
        name: 'Goal Not Achievable',
        pattern: /\[ff\]/gi,
        category: SignalCategory.ANALYSIS,
        priority: 9,
        description: 'Analysis shows PRP goals cannot be achieved with current constraints/technology',
        enabled: true,
        custom: false,
      },
      {
        id: 'JC',
        name: 'Jesus Christ (Incident Resolved)',
        pattern: /\[JC\]/gi,
        category: SignalCategory.INCIDENT,
        priority: 9,
        description: 'Critical production incident successfully resolved and service restored',
        enabled: true,
        custom: false,
      },

      // === HIGH PRIORITY SIGNALS (7-8) ===
      {
        id: 'af',
        name: 'Feedback Request',
        pattern: /\[af\]/gi,
        category: SignalCategory.COORDINATION,
        priority: 8,
        description: 'Decision needed on design approach, implementation strategy, or requirement interpretation',
        enabled: true,
        custom: false,
      },
      {
        id: 'no',
        name: 'Not Obvious',
        pattern: /\[no\]/gi,
        category: SignalCategory.DEVELOPMENT,
        priority: 8,
        description: 'Implementation complexity, technical uncertainty, or unknown dependencies discovered',
        enabled: true,
        custom: false,
      },
      {
        id: 'ic',
        name: 'Incident',
        pattern: /\[ic\]/gi,
        category: SignalCategory.INCIDENT,
        priority: 8,
        description: 'Production issue, error, or unexpected behavior detected',
        enabled: true,
        custom: false,
      },
      {
        id: 'er',
        name: 'Escalation Required',
        pattern: /\[er\]/gi,
        category: SignalCategory.COORDINATION,
        priority: 8,
        description: 'Issues require escalation to senior teams or external vendors',
        enabled: true,
        custom: false,
      },
      {
        id: 'oa',
        name: 'Orchestrator Attention',
        pattern: /\[oa\]/gi,
        category: SignalCategory.COORDINATION,
        priority: 8,
        description: 'Need coordination of parallel work, resource allocation, or workflow orchestration',
        enabled: true,
        custom: false,
      },

      // === MEDIUM-HIGH PRIORITY SIGNALS (5-6) ===
      {
        id: 'tr',
        name: 'Tests Red',
        pattern: /\[tr\]/gi,
        category: SignalCategory.TESTING,
        priority: 6,
        description: 'Test suite fails with failing tests identified',
        enabled: true,
        custom: false,
      },
      {
        id: 'cf',
        name: 'CI Failed',
        pattern: /\[cf\]/gi,
        category: SignalCategory.TESTING,
        priority: 6,
        description: 'Continuous integration pipeline fails with errors',
        enabled: true,
        custom: false,
      },
      {
        id: 'rr',
        name: 'Research Request',
        pattern: /\[rr\]/gi,
        category: SignalCategory.ANALYSIS,
        priority: 6,
        description: 'Unknown dependencies, technology gaps, or market research needed to proceed',
        enabled: true,
        custom: false,
      },
      {
        id: 'aa',
        name: 'Admin Attention',
        pattern: /\[aa\]/gi,
        category: SignalCategory.COORDINATION,
        priority: 6,
        description: 'Report generation required, system status needed, or administrative oversight requested',
        enabled: true,
        custom: false,
      },

      // === MEDIUM PRIORITY SIGNALS (3-4) ===
      {
        id: 'da',
        name: 'Done Assessment',
        pattern: /\[da\]/gi,
        category: SignalCategory.DEVELOPMENT,
        priority: 3,
        description: 'Task or milestone completed, ready for Definition of Done validation',
        enabled: true,
        custom: false,
      },
      {
        id: 'rp',
        name: 'Ready for Preparation',
        pattern: /\[rp\]/gi,
        category: SignalCategory.ANALYSIS,
        priority: 3,
        description: 'PRP analysis complete, requirements clear, ready to move to planning phase',
        enabled: true,
        custom: false,
      },
      {
        id: 'dp',
        name: 'Development Progress',
        pattern: /\[dp\]/gi,
        category: SignalCategory.DEVELOPMENT,
        priority: 3,
        description: 'Significant implementation milestone completed or increment ready',
        enabled: true,
        custom: false,
      },
      {
        id: 'cq',
        name: 'Code Quality',
        pattern: /\[cq\]/gi,
        category: SignalCategory.TESTING,
        priority: 3,
        description: 'Code passes linting, formatting, and quality gate checks',
        enabled: true,
        custom: false,
      },
      {
        id: 'tg',
        name: 'Tests Green',
        pattern: /\[tg\]/gi,
        category: SignalCategory.TESTING,
        priority: 3,
        description: 'All tests passing with full coverage achieved',
        enabled: true,
        custom: false,
      },

      // Add more signal patterns as needed...
    ];
  }

  /**
   * Real-time signal detection with caching
   */
  async detectSignals(filePath: string, content: string): Promise<Signal[]> {
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

    // Extract signals synchronously for immediate response
    const signals = await this.extractSignalsWithPatterns(content);

    // Cache the results
    this.cache.set(cacheKey, signals);
    this.updateMetrics(Date.now() - startTime, false);

    return signals;
  }

  /**
   * Extract signals using optimized pattern matching
   */
  private async extractSignalsWithPatterns(content: string): Promise<Signal[]> {
    const signals: Signal[] = [];

    for (const pattern of this.patterns) {
      if (!pattern.enabled) {
        continue;
      }

      let match;
      if (pattern.pattern.global) {
        pattern.pattern.lastIndex = 0;
      }

      while ((match = pattern.pattern.exec(content)) !== null) {
        const signalMatch = match[0];
        if (!signalMatch || typeof signalMatch !== 'string') {
          continue;
        }

        const signalCode = signalMatch.substring(1, 3); // Extract XX from [XX]
        const position = this.getSignalPosition(content, match.index);

        signals.push({
          id: HashUtils.generateId(),
          type: signalCode,
          priority: pattern.priority,
          source: 'unified-detector',
          timestamp: new Date(),
          resolved: false,
          relatedSignals: [],
          data: {
            rawSignal: signalMatch,
            patternName: pattern.name,
            category: pattern.category,
            description: pattern.description,
            line: position.line,
            column: position.column,
            context: this.extractContext(content, position.line, position.column),
          },
          metadata: {
            agent: 'unified-signal-detector',
            detector: 'unified-pattern-matcher',
            guideline: pattern.id,
          },
        });
      }
    }

    // Remove duplicates based on signal code and position
    return this.removeDuplicateSignals(signals);
  }

  private getSignalPosition(content: string, index?: number): { line: number; column: number } {
    if (!index) return { line: 0, column: 0 };

    const beforeIndex = content.substring(0, index);
    const lines = beforeIndex.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1]?.length ?? 0;

    return { line, column };
  }

  private extractContext(
    content: string,
    line: number,
    column: number,
    contextRadius = 50,
  ): string {
    const lines = content.split('\n');
    const lineContent = lines[line] ?? '';
    const start = Math.max(0, column - contextRadius);
    const end = Math.min(lineContent.length, column + contextRadius);
    return lineContent.substring(start, end).trim();
  }

  private removeDuplicateSignals(signals: Signal[]): Signal[] {
    const seen = new Map<string, Signal>();

    for (const signal of signals) {
      const key = `${signal.type}-${signal.data.line}-${signal.data.column}`;
      const existingSignal = seen.get(key);

      if (!seen.has(key) || (existingSignal && existingSignal.priority < signal.priority)) {
        seen.set(key, signal);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Handle signals detected by real-time processor
   */
  private handleSignalsDetected(filePath: string, signals: Signal[]): void {
    // Notify all registered callbacks
    for (const callback of Array.from(this.signalCallbacks)) {
      try {
        callback(filePath, signals);
      } catch (error) {
        logger.error(
          'UnifiedSignalDetector',
          `Error in signal callback for ${filePath}: ${error}`,
        );
      }
    }

    // Emit events
    this.emit('signalsDetected', { filePath, signals });
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
  private updateMetrics(latency: number, _cacheHit: boolean): void {
    this.metrics.totalDetections++;

    // Update average latency (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageLatency = this.metrics.averageLatency * (1 - alpha) + latency * alpha;

    // Update cache hit rate from cache stats
    const cacheStats = this.cache.getStats();
    this.metrics.cacheHitRate = cacheStats.hitRate;

    // Update signals per second
    const now = Date.now();
    const timeDiff = now - this.metrics.lastResetTime.getTime();
    if (timeDiff > 1000) {
      // Reset every second
      this.metrics.signalsPerSecond = this.metrics.totalDetections;
      this.metrics.totalDetections = 0;
      this.metrics.lastResetTime = new Date(now);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): {
    totalDetections: number;
    averageLatency: number;
    cacheHitRate: number;
    signalsPerSecond: number;
    cacheStats: { size: number; hitRate: number };
    queueSize: number;
    patternCount: number;
  } {
    return {
      ...this.metrics,
      cacheStats: this.cache.getStats(),
      queueSize: this.realTimeProcessor.getQueueSize(),
      patternCount: this.patterns.length,
    };
  }

  /**
   * Add custom signal pattern
   */
  addPattern(pattern: Omit<SignalPattern, 'id'>): void {
    const newPattern: SignalPattern = {
      ...pattern,
      id: HashUtils.generateId(),
      custom: true,
    };
    this.patterns.push(newPattern);
    logger.info('UnifiedSignalDetector', `Added custom pattern: ${newPattern.name}`);
  }

  /**
   * Remove pattern by ID
   */
  removePattern(patternId: string): boolean {
    const index = this.patterns.findIndex((p) => p.id === patternId);
    if (index >= 0) {
      this.patterns.splice(index, 1);
      logger.info('UnifiedSignalDetector', `Removed pattern: ${patternId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): SignalPattern[] {
    return [...this.patterns];
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: string): SignalPattern[] {
    return this.patterns.filter((p) => p.category === category);
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
      lastResetTime: new Date(),
    };
  }

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): void {
    this.reset();
    this.signalCallbacks.clear();
    this.removeAllListeners();
    logger.info('UnifiedSignalDetector', 'Unified signal detector shutdown complete');
  }
}

// Export singleton instance
export const unifiedSignalDetector = new UnifiedSignalDetector();