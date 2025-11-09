/**
 * High-performance signal processing system for PRP
 * Target signal processing latency: <100ms
 */

import { EventEmitter } from 'events';
import { performanceCache } from './cache.js';
import { performanceMonitor } from './monitor.js';

export interface Signal {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  metadata?: Record<string, any>;
}

export interface SignalProcessor {
  canProcess(signal: Signal): boolean;
  process(signal: Signal): Promise<SignalResult>;
  getLatency(): number;
  getProcessedCount(): number;
}

export interface SignalResult {
  success: boolean;
  processedAt: number;
  latency: number;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProcessingMetrics {
  totalProcessed: number;
  totalErrors: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  throughputPerSecond: number;
  errorRate: number;
}

export class HighPerformanceSignalProcessor extends EventEmitter {
  private processors: Map<string, SignalProcessor> = new Map();
  private signalQueue: Signal[] = [];
  private processingBatch: Signal[] = [];
  private isProcessing: boolean = false;
  private batchSize: number = 10;
  private batchTimeout: number = 50; // 50ms
  private batchTimer: NodeJS.Timeout | null = null;
  private metrics: ProcessingMetrics = {
    totalProcessed: 0,
    totalErrors: 0,
    averageLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    throughputPerSecond: 0,
    errorRate: 0
  };
  private latencyHistory: number[] = [];
  private lastThroughputCheck: number = Date.now();
  private processedSinceLastCheck: number = 0;

  constructor(options: { batchSize?: number; batchTimeout?: number } = {}) {
    super();
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 50;

    // Start metrics collection
    this.startMetricsCollection();

    // Set up performance monitoring
    performanceMonitor.setThresholds({
      commandLatency: 100 // 100ms target for signal processing
    });
  }

  registerProcessor(signalType: string, processor: SignalProcessor): void {
    this.processors.set(signalType, processor);
    this.emit('processor-registered', { signalType, processor });
  }

  unregisterProcessor(signalType: string): void {
    this.processors.delete(signalType);
    this.emit('processor-unregistered', { signalType });
  }

  async processSignal(signal: Signal): Promise<SignalResult> {
    const startTime = Date.now();

    try {
      // Add to queue for batch processing
      this.signalQueue.push(signal);

      // Prioritize critical signals
      if (signal.priority === 'critical') {
        return await this.processImmediately(signal);
      }

      // Schedule batch processing
      this.scheduleBatchProcessing();

      // For non-critical signals, we can return a pending result
      return {
        success: true,
        processedAt: Date.now(),
        latency: Date.now() - startTime,
        metadata: { status: 'queued', queuePosition: this.signalQueue.length }
      };

    } catch (error) {
      this.metrics.totalErrors++;
      return {
        success: false,
        processedAt: Date.now(),
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async processImmediately(signal: Signal): Promise<SignalResult> {
    const startTime = Date.now();

    try {
      const processor = this.processors.get(signal.type);
      if (!processor) {
        throw new Error(`No processor registered for signal type: ${signal.type}`);
      }

      const result = await processor.process(signal);
      const latency = Date.now() - startTime;

      this.updateMetrics(latency, false);
      this.emit('signal-processed', { signal, result });

      return {
        ...result,
        processedAt: Date.now(),
        latency
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(latency, true);

      return {
        success: false,
        processedAt: Date.now(),
        latency,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private scheduleBatchProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Process immediately if batch is full or after timeout
    if (this.signalQueue.length >= this.batchSize) {
      this.processBatch();
    } else {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.batchTimeout);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.signalQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Take a batch of signals
      this.processingBatch = this.signalQueue.splice(0, this.batchSize);

      // Process signals in parallel
      const processingPromises = this.processingBatch.map(signal =>
        this.processSignalInternal(signal)
      );

      await Promise.allSettled(processingPromises);

      this.processingBatch = [];

      // Continue processing if more signals are queued
      if (this.signalQueue.length > 0) {
        setImmediate(() => this.scheduleBatchProcessing());
      }

    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSignalInternal(signal: Signal): Promise<SignalResult> {
    const startTime = Date.now();
    const cacheKey = `signal:${signal.type}:${JSON.stringify(signal.data)}`;

    try {
      // Check cache first
      const cached = performanceCache.getCommandCache().get(cacheKey);
      if (cached) {
        const latency = Date.now() - startTime;
        this.updateMetrics(latency, false);
        return {
          success: true,
          processedAt: Date.now(),
          latency,
          result: cached,
          metadata: { cached: true }
        };
      }

      // Process the signal
      const processor = this.processors.get(signal.type);
      if (!processor) {
        throw new Error(`No processor registered for signal type: ${signal.type}`);
      }

      const result = await processor.process(signal);
      const latency = Date.now() - startTime;

      // Cache the result
      performanceCache.getCommandCache().set(cacheKey, result.result, 5000); // 5 seconds TTL

      this.updateMetrics(latency, false);
      this.emit('signal-processed', { signal, result });

      return {
        ...result,
        processedAt: Date.now(),
        latency
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(latency, true);

      return {
        success: false,
        processedAt: Date.now(),
        latency,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private updateMetrics(latency: number, isError: boolean): void {
    this.metrics.totalProcessed++;
    this.processedSinceLastCheck++;

    if (isError) {
      this.metrics.totalErrors++;
    }

    // Update latency metrics
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 1000) {
      this.latencyHistory.shift();
    }

    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
    this.metrics.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    this.metrics.errorRate = this.metrics.totalErrors / this.metrics.totalProcessed;

    // Check performance thresholds
    if (latency > 100) {
      this.emit('performance-warning', {
        type: 'high-latency',
        latency,
        threshold: 100
      });
    }

    if (this.metrics.errorRate > 0.05) { // 5% error rate
      this.emit('performance-warning', {
        type: 'high-error-rate',
        errorRate: this.metrics.errorRate,
        threshold: 0.05
      });
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - this.lastThroughputCheck) / 1000; // Convert to seconds

      if (timeDiff > 0) {
        this.metrics.throughputPerSecond = this.processedSinceLastCheck / timeDiff;
        this.processedSinceLastCheck = 0;
        this.lastThroughputCheck = now;

        this.emit('metrics-updated', this.metrics);
      }
    }, 1000); // Update every second
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  getQueueStatus(): { queued: number; processing: number; isProcessing: boolean } {
    return {
      queued: this.signalQueue.length,
      processing: this.processingBatch.length,
      isProcessing: this.isProcessing
    };
  }

  clearQueue(): void {
    this.signalQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      totalErrors: 0,
      averageLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      throughputPerSecond: 0,
      errorRate: 0
    };
    this.latencyHistory = [];
    this.processedSinceLastCheck = 0;
    this.lastThroughputCheck = Date.now();
  }
}

// Specialized processors for different signal types
export class CommandSignalProcessor implements SignalProcessor {
  private processedCount = 0;
  private totalLatency = 0;

  canProcess(signal: Signal): boolean {
    return signal.type.startsWith('command:');
  }

  async process(signal: Signal): Promise<SignalResult> {
    const startTime = Date.now();

    try {
      // Simulate command processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

      this.processedCount++;
      const latency = Date.now() - startTime;
      this.totalLatency += latency;

      return {
        success: true,
        processedAt: Date.now(),
        latency,
        result: { command: signal.data.command, status: 'executed' }
      };

    } catch (error) {
      return {
        success: false,
        processedAt: Date.now(),
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getLatency(): number {
    return this.processedCount > 0 ? this.totalLatency / this.processedCount : 0;
  }

  getProcessedCount(): number {
    return this.processedCount;
  }
}

export class EventSignalProcessor implements SignalProcessor {
  private processedCount = 0;
  private totalLatency = 0;

  canProcess(signal: Signal): boolean {
    return signal.type.startsWith('event:');
  }

  async process(signal: Signal): Promise<SignalResult> {
    const startTime = Date.now();

    try {
      // Simulate event processing (typically faster than commands)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 20));

      this.processedCount++;
      const latency = Date.now() - startTime;
      this.totalLatency += latency;

      return {
        success: true,
        processedAt: Date.now(),
        latency,
        result: { event: signal.data.event, status: 'processed' }
      };

    } catch (error) {
      return {
        success: false,
        processedAt: Date.now(),
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getLatency(): number {
    return this.processedCount > 0 ? this.totalLatency / this.processedCount : 0;
  }

  getProcessedCount(): number {
    return this.processedCount;
  }
}

// Global signal processor instance
export const signalProcessor = new HighPerformanceSignalProcessor({
  batchSize: 10,
  batchTimeout: 50
});

// Register default processors
signalProcessor.registerProcessor('command', new CommandSignalProcessor());
signalProcessor.registerProcessor('event', new EventSignalProcessor());