/**
 * ♫ Signal Processor for @dcversus/prp Orchestrator
 *
 * High-performance signal processing with batching, memory management,
 * and optimized throughput for real-time signal systems.
 */

import { EventEmitter } from 'events';
import { SignalEvent, SignalPriorityEnum } from '../types';

export interface SignalProcessorOptions {
  batchSize?: number;
  maxMemoryUsage?: number; // in bytes
  processingInterval?: number; // in milliseconds
  enableProfiling?: boolean;
  gcThreshold?: number; // signals processed before triggering GC
}

export interface SignalProcessorStats {
  totalProcessed: number;
  totalBatches: number;
  averageBatchSize: number;
  processingTime: number;
  memoryUsage: number;
  errorRate: number;
  throughput: number; // signals per second
  lastBatchTime?: Date;
}

export interface ProcessingMetrics {
  startTime: number;
  endTime: number;
  signalCount: number;
  batchSize: number;
  memoryBefore: number;
  memoryAfter: number;
  errors: number;
}

/**
 * High-performance Signal Processor
 */
export class SignalProcessor extends EventEmitter {
  private options: Required<SignalProcessorOptions>;
  private processingQueue: SignalEvent[] = [];
  private isProcessing = false;
  private stats: SignalProcessorStats = {
    totalProcessed: 0,
    totalBatches: 0,
    averageBatchSize: 0,
    processingTime: 0,
    memoryUsage: 0,
    errorRate: 0,
    throughput: 0
  };
  private batchMetrics: ProcessingMetrics[] = [];
  private memoryCheckInterval?: NodeJS.Timeout;

  constructor(options: SignalProcessorOptions = {}) {
    super();
    this.options = {
      batchSize: options.batchSize ?? 50,
      maxMemoryUsage: options.maxMemoryUsage ?? 50 * 1024 * 1024, // 50MB
      processingInterval: options.processingInterval ?? 100,
      enableProfiling: options.enableProfiling ?? true,
      gcThreshold: options.gcThreshold ?? 1000
    };

    // Start memory monitoring
    if (this.options.enableProfiling) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Add signal to processing queue
   */
  addSignal(signal: SignalEvent): void {
    this.processingQueue.push(signal);

    // Trigger processing if queue is full
    if (this.processingQueue.length >= this.options.batchSize) {
      this.processNextBatch();
    }
  }

  /**
   * Add multiple signals to queue
   */
  addSignals(signals: SignalEvent[]): void {
    this.processingQueue.push(...signals);

    // Trigger processing if queue is full
    if (this.processingQueue.length >= this.options.batchSize) {
      this.processNextBatch();
    }
  }

  /**
   * Process signals with custom handler
   */
  async processWithHandler(
    signals: SignalEvent[],
    handler: (signal: SignalEvent) => Promise<void>
  ): Promise<ProcessingMetrics> {
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    let processedCount = 0;
    let errorCount = 0;

    // Sort by priority for optimal processing
    const sortedSignals = this.sortByPriority(signals);

    for (const signal of sortedSignals) {
      try {
        await handler(signal);
        processedCount++;
      } catch (error) {
        errorCount++;
        this.emit('processingError', { signal, error });
      }
    }

    const endTime = Date.now();
    const memoryAfter = this.getMemoryUsage();

    const metrics: ProcessingMetrics = {
      startTime,
      endTime,
      signalCount: signals.length,
      batchSize: this.options.batchSize,
      memoryBefore,
      memoryAfter,
      errors: errorCount
    };

    this.updateStats(metrics);
    this.emit('batchProcessed', metrics);

    return metrics;
  }

  /**
   * Process next batch of signals
   */
  private async processNextBatch(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.processingQueue.splice(0, this.options.batchSize);
      if (batch.length === 0) {
        return;
      }

      const metrics = await this.processWithHandler(batch, async (signal) => {
        // Default processing behavior
        this.emit('signalProcessed', signal);
      });

      this.batchMetrics.push(metrics);

      // Garbage collection if threshold reached
      if (this.stats.totalProcessed % this.options.gcThreshold === 0) {
        this.performGarbageCollection();
      }

    } catch (error) {
      this.emit('batchError', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start automatic processing loop
   */
  startProcessing(): void {
    const interval = setInterval(() => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        this.processNextBatch();
      }
    }, this.options.processingInterval);

    this.on('shutdown', () => {
      clearInterval(interval);
    });
  }

  /**
   * Stop processing and cleanup
   */
  shutdown(): void {
    this.removeAllListeners();
    this.processingQueue.length = 0;

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.emit('shutdown');
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Sort signals by priority
   */
  private sortByPriority(signals: SignalEvent[]): SignalEvent[] {
    const priorityOrder = {
      [SignalPriorityEnum.CRITICAL]: 0,
      [SignalPriorityEnum.HIGH]: 1,
      [SignalPriorityEnum.MEDIUM]: 2,
      [SignalPriorityEnum.LOW]: 3
    };

    return signals.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 999;
      const bPriority = priorityOrder[b.priority] ?? 999;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Secondary sort by timestamp (newest first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Update processing statistics
   */
  private updateStats(metrics: ProcessingMetrics): void {
    this.stats.totalProcessed += metrics.signalCount;
    this.stats.totalBatches++;
    this.stats.averageBatchSize = this.stats.totalProcessed / this.stats.totalBatches;
    this.stats.processingTime += (metrics.endTime - metrics.startTime);
    this.stats.memoryUsage = Math.max(this.stats.memoryUsage, metrics.memoryAfter);

    const errorRate = this.stats.totalBatches > 0
      ? this.batchMetrics.reduce((sum, m) => sum + m.errors, 0) / this.stats.totalProcessed
      : 0;
    this.stats.errorRate = errorRate;

    // Calculate throughput (signals per second)
    if (this.stats.processingTime > 0) {
      this.stats.throughput = (this.stats.totalProcessed / this.stats.processingTime) * 1000;
    }

    this.stats.lastBatchTime = new Date();
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }

    // Clear old metrics to save memory
    if (this.batchMetrics.length > 100) {
      this.batchMetrics = this.batchMetrics.slice(-50);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const currentMemory = this.getMemoryUsage();

      if (currentMemory > this.options.maxMemoryUsage) {
        this.emit('memoryWarning', {
          current: currentMemory,
          max: this.options.maxMemoryUsage,
          queueSize: this.processingQueue.length
        });

        // Force garbage collection
        this.performGarbageCollection();
      }

      this.stats.memoryUsage = currentMemory;
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get processing statistics
   */
  getStats(): SignalProcessorStats {
    return { ...this.stats };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    size: number;
    isProcessing: boolean;
    memoryUsage: number;
    batchCapacity: number;
    } {
    return {
      size: this.processingQueue.length,
      isProcessing: this.isProcessing,
      memoryUsage: this.getMemoryUsage(),
      batchCapacity: this.options.batchSize
    };
  }

  /**
   * Get recent batch metrics
   */
  getRecentMetrics(count: number = 10): ProcessingMetrics[] {
    return this.batchMetrics.slice(-count);
  }

  /**
   * Force process all remaining signals
   */
  async flush(): Promise<void> {
    while (this.processingQueue.length > 0) {
      await this.processNextBatch();
    }
  }

  /**
   * Optimize settings based on current performance
   */
  optimizeSettings(): void {
    const stats = this.getStats();
    const queueStatus = this.getQueueStatus();

    // Adjust batch size based on performance
    if (stats.throughput < 10 && this.options.batchSize > 10) {
      // Low throughput, reduce batch size
      this.options.batchSize = Math.max(10, Math.floor(this.options.batchSize * 0.8));
    } else if (stats.throughput > 100 && this.options.batchSize < 200) {
      // High throughput, can increase batch size
      this.options.batchSize = Math.min(200, Math.floor(this.options.batchSize * 1.2));
    }

    // Adjust processing interval based on queue size
    if (queueStatus.size > this.options.batchSize * 2) {
      // Queue building up, process more frequently
      this.options.processingInterval = Math.max(10, Math.floor(this.options.processingInterval * 0.8));
    } else if (queueStatus.size === 0) {
      // Empty queue, can process less frequently
      this.options.processingInterval = Math.min(1000, Math.floor(this.options.processingInterval * 1.2));
    }

    this.emit('settingsOptimized', {
      newBatchSize: this.options.batchSize,
      newInterval: this.options.processingInterval,
      throughput: stats.throughput
    });
  }
}

// Singleton instance for global use
let globalSignalProcessor: SignalProcessor | null = null;

export function getSignalProcessor(options?: SignalProcessorOptions): SignalProcessor {
  if (!globalSignalProcessor) {
    globalSignalProcessor = new SignalProcessor(options);
  }
  return globalSignalProcessor;
}

export function resetSignalProcessor(): void {
  if (globalSignalProcessor) {
    globalSignalProcessor.shutdown();
    globalSignalProcessor = null;
  }
}