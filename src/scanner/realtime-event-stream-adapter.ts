/**
 * ♫ Real-Time Event Stream Adapter for @dcversus/prp Tuner
 *
 * High-performance event streaming with sub-100ms latency, intelligent
 * filtering, and real-time signal detection capabilities.
 */

import { EventEmitter } from 'events';
import { Transform } from 'stream';
import { Readable, Writable } from 'stream';
import { randomUUID } from 'crypto';

import { EventBus } from '../shared/events';
import { createLayerLogger, TimeUtils, HashUtils } from '../shared';
import { SignalData, DetectedSignal, SignalPattern } from './types';

const logger = createLayerLogger('scanner');

// Event stream configuration
interface StreamConfig {
  maxBufferSize: number;
  flushInterval: number; // milliseconds
  maxConcurrency: number;
  enableCompression: boolean;
  enableFiltering: boolean;
  enableDeduplication: boolean;
  deduplicationWindow: number; // milliseconds
}

// Event metrics for performance monitoring
interface StreamMetrics {
  totalEvents: number;
  totalSignals: number;
  averageLatency: number;
  peakLatency: number;
  bufferSize: number;
  throughput: number; // events per second
  errorCount: number;
  lastResetTime: Date;
}

// Stream event with metadata
interface StreamEvent {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  data: unknown;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, unknown>;
  processedAt?: Date;
  latency?: number;
}

// Signal detection result
interface SignalDetectionResult {
  eventId: string;
  signals: DetectedSignal[];
  processingTime: number;
  confidence: number;
}

// Deduplication cache entry
interface DeduplicationEntry {
  eventId: string;
  timestamp: Date;
  hash: string;
  signalType: string;
  content: string;
}

/**
 * Real-time event stream adapter with signal detection
 */
export class RealTimeEventStreamAdapter extends EventEmitter {
  private config: StreamConfig;
  private eventBus: EventBus;
  private isProcessing = false;
  private isInitialized = false;

  // Event processing
  private eventBuffer: StreamEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private processingQueue: Array<() => Promise<void>> = [];
  private isQueueProcessing = false;

  // Signal detection
  private signalPatterns: Map<string, SignalPattern> = new Map();
  private deduplicationCache = new Map<string, DeduplicationEntry>();

  // Performance metrics
  private metrics: StreamMetrics;
  private latencySamples: number[] = [];
  private lastThroughputCalculation = TimeUtils.now();

  // Stream management
  private inputStream: Transform | null = null;
  private outputStream: Transform | null = null;

  constructor(config: Partial<StreamConfig> = {}, eventBus: EventBus) {
    super();
    this.eventBus = eventBus;

    // Default configuration
    this.config = {
      maxBufferSize: 1000,
      flushInterval: 100, // 100ms for real-time processing
      maxConcurrency: 10,
      enableCompression: false,
      enableFiltering: true,
      enableDeduplication: true,
      deduplicationWindow: 5000, // 5 seconds
      ...config
    };

    // Initialize metrics
    this.metrics = {
      totalEvents: 0,
      totalSignals: 0,
      averageLatency: 0,
      peakLatency: 0,
      bufferSize: 0,
      throughput: 0,
      errorCount: 0,
      lastResetTime: TimeUtils.now()
    };

    // Initialize default signal patterns
    this.initializeSignalPatterns();

    // Create stream transform
    this.createStreams();
  }

  /**
   * Initialize the stream adapter
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('RealTimeEventStreamAdapter', 'Stream adapter already initialized');
      return;
    }

    try {
      logger.info('RealTimeEventStreamAdapter', 'Initializing real-time event stream adapter...');

      // Start periodic flushing
      this.startPeriodicFlush();

      // Start throughput monitoring
      this.startThroughputMonitoring();

      // Cleanup old deduplication entries
      this.startDeduplicationCleanup();

      this.isInitialized = true;

      logger.info('RealTimeEventStreamAdapter', '✅ Real-time event stream adapter initialized');

      this.emit('adapter:initialized', {
        config: this.config,
        timestamp: TimeUtils.now()
      });

    } catch (error) {
      logger.error('RealTimeEventStreamAdapter', 'Failed to initialize stream adapter', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Process incoming event
   */
  async processEvent(event: Partial<StreamEvent>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const streamEvent: StreamEvent = {
        id: event.id ?? randomUUID(),
        timestamp: event.timestamp ?? TimeUtils.now(),
        type: event.type ?? 'unknown',
        source: event.source ?? 'unknown',
        data: event.data,
        priority: event.priority ?? 'medium',
        metadata: event.metadata ?? {}
      };

      // Add to buffer
      this.addToBuffer(streamEvent);

      // If buffer is full or high priority event, flush immediately
      if (this.eventBuffer.length >= this.config.maxBufferSize || streamEvent.priority === 'critical') {
        await this.flushBuffer();
      }

    } catch (error) {
      this.metrics.errorCount++;
      logger.error('RealTimeEventStreamAdapter', 'Error processing event', error instanceof Error ? error : new Error(String(error)), {
        eventType: event.type,
        source: event.source
      });
    }
  }

  /**
   * Add event to buffer
   */
  private addToBuffer(event: StreamEvent): void {
    this.eventBuffer.push(event);
    this.metrics.bufferSize = this.eventBuffer.length;
    this.metrics.totalEvents++;

    // Log high priority events immediately
    if (event.priority === 'critical' || event.priority === 'high') {
      logger.debug('RealTimeEventStreamAdapter', 'High priority event received', {
        eventId: event.id,
        type: event.type,
        priority: event.priority
      });
    }
  }

  /**
   * Flush event buffer for processing
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      const events = this.eventBuffer.splice(0, this.config.maxBufferSize);
      this.metrics.bufferSize = this.eventBuffer.length;

      // Process events in parallel with concurrency limit
      const chunks = this.chunkArray(events, this.config.maxConcurrency);

      for (const chunk of chunks) {
        await Promise.all(chunk.map(event => this.processSingleEvent(event)));
      }

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateLatencyMetrics(processingTime);

      logger.debug('RealTimeEventStreamAdapter', 'Event buffer flushed', {
        eventCount: events.length,
        processingTime,
        bufferSize: this.eventBuffer.length
      });

    } catch (error) {
      this.metrics.errorCount++;
      logger.error('RealTimeEventStreamAdapter', 'Error flushing buffer', error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process single event and detect signals
   */
  private async processSingleEvent(event: StreamEvent): Promise<void> {
    const startTime = Date.now();
    event.processedAt = TimeUtils.now();

    try {
      // Detect signals in event
      const signals = await this.detectSignals(event);

      // Apply deduplication if enabled
      const uniqueSignals = this.config.enableDeduplication
        ? this.deduplicateSignals(signals)
        : signals;

      // Update signal metrics
      this.metrics.totalSignals += uniqueSignals.length;

      // Emit signals
      if (uniqueSignals.length > 0) {
        this.emitSignalsDetected(event, uniqueSignals);
      }

      // Publish to event bus
      this.publishToEventBus(event, uniqueSignals);

      // Update latency
      const latency = Date.now() - startTime;
      event.latency = latency;

      // Emit processed event
      this.emit('event:processed', {
        event,
        signals: uniqueSignals,
        latency
      });

    } catch (error) {
      this.metrics.errorCount++;
      logger.error('RealTimeEventStreamAdapter', 'Error processing single event', error instanceof Error ? error : new Error(String(error)), {
        eventId: event.id,
        type: event.type
      });
    }
  }

  /**
   * Detect signals in event data
   */
  private async detectSignals(event: StreamEvent): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];

    try {
      const dataString = JSON.stringify(event.data);
      const content = `${event.type} ${event.source} ${dataString}`;

      // Check each signal pattern
      for (const [patternId, pattern] of this.signalPatterns.entries()) {
        if (!pattern.enabled) {
          continue;
        }

        const matches = content.match(pattern.pattern);
        if (matches) {
          const signal: DetectedSignal = {
            pattern: patternId,
            type: pattern.name,
            content: matches[0] ?? '',
            line: 0,
            column: 0,
            context: this.buildSignalContext(event, matches[0]),
            priority: this.mapPatternPriority(pattern.priority)
          };

          signals.push(signal);
        }
      }

    } catch (error) {
      logger.error('RealTimeEventStreamAdapter', 'Error detecting signals', error instanceof Error ? error : new Error(String(error)), {
        eventId: event.id
      });
    }

    return signals;
  }

  /**
   * Remove duplicate signals
   */
  private deduplicateSignals(signals: DetectedSignal[]): DetectedSignal[] {
    const uniqueSignals: DetectedSignal[] = [];
    const now = TimeUtils.now();

    for (const signal of signals) {
      const hash = this.calculateSignalHash(signal);
      const cacheKey = `${signal.type}:${hash}`;

      // Check if signal exists in cache
      const existing = this.deduplicationCache.get(cacheKey);
      if (existing) {
        // Check if within deduplication window
        const timeDiff = now.getTime() - existing.timestamp.getTime();
        if (timeDiff <= this.config.deduplicationWindow) {
          continue; // Skip duplicate
        }
      }

      // Add to cache and unique signals
      this.deduplicationCache.set(cacheKey, {
        eventId: randomUUID(),
        timestamp: now,
        hash,
        signalType: signal.type,
        content: signal.content
      });

      uniqueSignals.push(signal);
    }

    return uniqueSignals;
  }

  /**
   * Create transform streams
   */
  private createStreams(): void {
    // Input stream - transforms incoming data to events
    this.inputStream = new Transform({
      objectMode: true,
      transform(chunk: unknown, encoding, callback) {
        try {
          const event = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
          this.push({ data: event, timestamp: TimeUtils.now() });
          callback();
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });

    // Output stream - formats processed events
    this.outputStream = new Transform({
      objectMode: true,
      transform(event: StreamEvent, encoding, callback) {
        const formatted = {
          id: event.id,
          timestamp: event.timestamp,
          type: event.type,
          source: event.source,
          priority: event.priority,
          latency: event.latency,
          processed: true
        };
        this.push(formatted);
        callback();
      }
    });

    // Pipe streams together
    this.inputStream.pipe(this.outputStream);
  }

  /**
   * Start periodic buffer flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      if (this.eventBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, this.config.flushInterval);
  }

  /**
   * Start throughput monitoring
   */
  private startThroughputMonitoring(): void {
    setInterval(() => {
      const now = TimeUtils.now();
      const timeDiff = now.getTime() - this.lastThroughputCalculation.getTime();

      if (timeDiff > 0) {
        this.metrics.throughput = (this.metrics.totalEvents / timeDiff) * 1000; // events per second
        this.lastThroughputCalculation = now;
      }
    }, 1000); // Calculate every second
  }

  /**
   * Start deduplication cache cleanup
   */
  private startDeduplicationCleanup(): void {
    setInterval(() => {
      const now = TimeUtils.now();
      const cutoffTime = new Date(now.getTime() - this.config.deduplicationWindow);

      for (const [key, entry] of this.deduplicationCache.entries()) {
        if (entry.timestamp < cutoffTime) {
          this.deduplicationCache.delete(key);
        }
      }
    }, this.config.deduplicationWindow); // Cleanup every deduplication window
  }

  /**
   * Initialize default signal patterns
   */
  private initializeSignalPatterns(): void {
    // AGENTS.md signal patterns
    this.addSignalPattern({
      id: 'test_prepared',
      name: 'test_prepared',
      pattern: /\[tp\]/g,
      category: 'development',
      priority: 6,
      description: 'Tests prepared signal',
      enabled: true,
      custom: false
    });

    this.addSignalPattern({
      id: 'development_progress',
      name: 'development_progress',
      pattern: /\[dp\]/g,
      category: 'development',
      priority: 5,
      description: 'Development progress signal',
      enabled: true,
      custom: false
    });

    this.addSignalPattern({
      id: 'bug_fixed',
      name: 'bug_fixed',
      pattern: /\[bf\]/g,
      category: 'development',
      priority: 7,
      description: 'Bug fixed signal',
      enabled: true,
      custom: false
    });

    this.addSignalPattern({
      id: 'tests_written',
      name: 'tests_written',
      pattern: /\[tw\]/g,
      category: 'testing',
      priority: 5,
      description: 'Tests written signal',
      enabled: true,
      custom: false
    });

    this.addSignalPattern({
      id: 'cleanup_done',
      name: 'cleanup_done',
      pattern: /\[cd\]/g,
      category: 'maintenance',
      priority: 4,
      description: 'Cleanup done signal',
      enabled: true,
      custom: false
    });

    // System signals
    this.addSignalPattern({
      id: 'blocker',
      name: 'blocker',
      pattern: /\[bb\]/g,
      category: 'blocking',
      priority: 9,
      description: 'Blocker signal',
      enabled: true,
      custom: false
    });

    this.addSignalPattern({
      id: 'feedback_request',
      name: 'feedback_request',
      pattern: /\[af\]/g,
      category: 'collaboration',
      priority: 6,
      description: 'Feedback request signal',
      enabled: true,
      custom: false
    });
  }

  /**
   * Add signal pattern
   */
  addSignalPattern(pattern: SignalPattern): void {
    this.signalPatterns.set(pattern.id, pattern);
    logger.debug('RealTimeEventStreamAdapter', 'Signal pattern added', { patternId: pattern.id, name: pattern.name });
  }

  /**
   * Remove signal pattern
   */
  removeSignalPattern(patternId: string): boolean {
    const removed = this.signalPatterns.delete(patternId);
    if (removed) {
      logger.debug('RealTimeEventStreamAdapter', 'Signal pattern removed', { patternId });
    }
    return removed;
  }

  /**
   * Get stream metrics
   */
  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  /**
   * Stop stream processing
   */
  async stop(): Promise<void> {
    logger.info('RealTimeEventStreamAdapter', 'Stopping real-time event stream adapter...');

    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining events
    if (this.eventBuffer.length > 0) {
      await this.flushBuffer();
    }

    // Close streams
    if (this.inputStream) {
      this.inputStream.destroy();
      this.inputStream = null;
    }

    if (this.outputStream) {
      this.outputStream.destroy();
      this.outputStream = null;
    }

    this.isInitialized = false;

    logger.info('RealTimeEventStreamAdapter', '✅ Real-time event stream adapter stopped');
  }

  // Helper methods

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private buildSignalContext(event: StreamEvent, match: string): string {
    return `${event.source}:${event.type} - ${match}`;
  }

  private mapPatternPriority(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority >= 8) {
      return 'critical';
    }
    if (priority >= 6) {
      return 'high';
    }
    if (priority >= 3) {
      return 'medium';
    }
    return 'low';
  }

  private calculateSignalHash(signal: DetectedSignal): string {
    const content = `${signal.type}:${signal.content}:${signal.context}`;
    return HashUtils.generateId();
  }

  private updateLatencyMetrics(latency: number): void {
    this.latencySamples.push(latency);

    // Keep only last 100 samples
    if (this.latencySamples.length > 100) {
      this.latencySamples.shift();
    }

    // Calculate average latency
    this.metrics.averageLatency = this.latencySamples.reduce((sum, sample) => sum + sample, 0) / this.latencySamples.length;

    // Update peak latency
    this.metrics.peakLatency = Math.max(this.metrics.peakLatency, latency);
  }

  private emitSignalsDetected(event: StreamEvent, signals: DetectedSignal[]): void {
    this.emit('signals:detected', {
      eventId: event.id,
      signals,
      timestamp: TimeUtils.now()
    });
  }

  private publishToEventBus(event: StreamEvent, signals: DetectedSignal[]): void {
    this.eventBus.publishToChannel('scanner', {
      id: event.id,
      type: 'signal_detected',
      timestamp: event.timestamp,
      source: event.source,
      data: {
        event,
        signals,
        signalCount: signals.length
      },
      metadata: {
        priority: event.priority,
        latency: event.latency
      }
    });
  }
}