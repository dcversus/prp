/**
 * ♫ Signal Priority Queue for @dcversus/prp
 *
 * Implements priority-based FIFO signal processing for the signal system.
 * Supports signal prioritization, FIFO ordering within priority levels,
 * and efficient signal consumption by orchestrator.
 */
import type { Signal } from '../types';
import type { Logger } from '../logger';

export interface QueuedSignal extends Signal {
  queueTimestamp: Date;
  processingAttempts: number;
  lastAttempt?: Date;
  estimatedWaitTime?: number;
}
export interface QueueStats {
  totalQueued: number;
  byPriority: Record<number, number>;
  byCategory: Record<string, number>;
  averageWaitTime: number;
  oldestSignal?: Date;
  processingRate: number;
}
export interface SignalConsumer {
  id: string;
  name: string;
  priority: number;
  canProcess: (signal: Signal) => boolean; // eslint-disable-line no-unused-vars
  process: (signal: Signal) => Promise<boolean>; // eslint-disable-line no-unused-vars
}
/**
 * Priority-based FIFO signal queue
 */
export class SignalPriorityQueue {
  private readonly queues = new Map<number, QueuedSignal[]>();
  private readonly consumers: SignalConsumer[] = [];
  private readonly processing = new Set<string>();
  private completed: QueuedSignal[] = [];
  private readonly maxHistory = 1000;
  private readonly maxQueueSize = 10000;
  private readonly logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
    // Initialize priority queues (1-10)
    for (let priority = 1; priority <= 10; priority++) {
      this.queues.set(priority, []);
    }
  }
  /**
   * Add signal to priority queue
   */
  enqueue(signal: Signal): boolean {
    // Check queue capacity
    const totalQueued = this.getTotalQueued();
    if (totalQueued >= this.maxQueueSize) {
      this.logger.warn(
        'orchestrator',
        'SignalPriorityQueue',
        `Queue at capacity (${this.maxQueueSize}), rejecting signal`,
        {
          signalId: signal.id,
          type: signal.type,
        },
      );
      return false;
    }
    const {priority} = signal;
    const queue = this.queues.get(priority);
    if (!queue) {
      this.logger.error(
        'orchestrator',
        'SignalPriorityQueue',
        `Invalid priority: ${priority}`,
        new Error(`Invalid priority: ${priority}`),
      );
      return false;
    }
    const queuedSignal: QueuedSignal = {
      ...signal,
      queueTimestamp: new Date(),
      processingAttempts: 0,
    };
    queue.push(queuedSignal);
    this._updateWaitTimes();
    this.logger.debug(
      'orchestrator',
      'SignalPriorityQueue',
      `Signal queued with priority ${priority}`,
      {
        signalId: signal.id,
        type: signal.type,
        priority,
        queueSize: queue.length,
      },
    );
    return true;
  }
  /**
   * Get next signal for processing (highest priority first, FIFO within priority)
   */
  dequeue(consumer?: SignalConsumer): QueuedSignal | null {
    // Find highest priority non-empty queue
    for (let priority = 10; priority >= 1; priority--) {
      const queue = this.queues.get(priority);
      if (!queue || queue.length === 0) {
        continue;
      }
      // Check if consumer can process this signal
      const signalIndex = queue.findIndex((s) => !consumer || consumer.canProcess(s));
      if (signalIndex === -1) {
        continue;
      }
      const signal = queue.splice(signalIndex, 1)[0];
      signal.processingAttempts++;
      signal.lastAttempt = new Date();
      this.processing.add(signal.id);
      this.logger.debug('orchestrator', 'SignalPriorityQueue', 'Signal dequeued for processing', {
        signalId: signal.id,
        type: signal.type,
        priority,
        consumer: consumer?.name,
        attempts: signal.processingAttempts,
      });
      this._updateWaitTimes();
      return signal;
    }
    return null;
  }
  /**
   * Mark signal as processed successfully
   */
  complete(signalId: string, success: boolean): void {
    if (!this.processing.has(signalId)) {
      this.logger.warn(
        'orchestrator',
        'SignalPriorityQueue',
        `Signal ${signalId} not in processing set`,
      );
      return;
    }
    this.processing.delete(signalId);
    // Find in queues and remove or mark as completed
    for (const [, queue] of Array.from(this.queues.entries())) {
      const index = queue.findIndex((s) => s.id === signalId);
      if (index !== -1) {
        const signal = queue.splice(index, 1)[0];
        if (success) {
          this._addToHistory(signal);
        } else {
          // Re-queue for retry (with backoff)
          signal.processingAttempts++;
          if (signal.processingAttempts < 3) {
            // Reduce priority for retry
            const newPriority = Math.max(1, signal.priority - 1);
            signal.priority = newPriority;
            this.queues.get(newPriority)?.push(signal);
          } else {
            // Max retries reached, move to history as failed
            this._addToHistory(signal);
          }
        }
        break;
      }
    }
    this._updateWaitTimes();
  }
  /**
   * Register a signal consumer
   */
  registerConsumer(consumer: SignalConsumer): void {
    this.consumers.push(consumer);
    this.consumers.sort((a, b) => b.priority - a.priority); // Sort by priority
    this.logger.info(
      'orchestrator',
      'SignalPriorityQueue',
      `Consumer registered: ${consumer.name}`,
      {
        consumerId: consumer.id,
        priority: consumer.priority,
      },
    );
  }
  /**
   * Unregister a signal consumer
   */
  unregisterConsumer(consumerId: string): void {
    const index = this.consumers.findIndex((c) => c.id === consumerId);
    if (index !== -1) {
      const consumer = this.consumers.splice(index, 1)[0];
      this.logger.info(
        'orchestrator',
        'SignalPriorityQueue',
        `Consumer unregistered: ${consumer.name}`,
        {
          consumerId,
        },
      );
    }
  }
  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const byPriority: Record<number, number> = {};
    const byCategory: Record<string, number> = {};
    let totalQueued = 0;
    let oldestSignal: Date | undefined;
    // Count signals by priority and category
    for (const [priority, queue] of Array.from(this.queues.entries())) {
      byPriority[priority] = queue.length;
      totalQueued += queue.length;
      for (const signal of queue) {
        const category = (signal.metadata?.category as string) || 'unknown';
        byCategory[category] = (byCategory[category] ?? 0) + 1;
        if (!oldestSignal || signal.queueTimestamp < oldestSignal) {
          oldestSignal = signal.queueTimestamp;
        }
      }
    }
    // Calculate average wait time
    const now = new Date();
    let totalWaitTime = 0;
    let signalCount = 0;
    for (const queue of Array.from(this.queues.values())) {
      for (const signal of queue) {
        totalWaitTime += now.getTime() - signal.queueTimestamp.getTime();
        signalCount++;
      }
    }
    const averageWaitTime = signalCount > 0 ? totalWaitTime / signalCount : 0;
    // Calculate processing rate (signals per minute)
    const recentCompleted = this.completed.filter(
      (s) => now.getTime() - s.queueTimestamp.getTime() < 300000, // Last 5 minutes
    );
    const processingRate = recentCompleted.length * 12; // Convert to per minute
    return {
      totalQueued,
      byPriority,
      byCategory,
      averageWaitTime,
      oldestSignal,
      processingRate,
    };
  }
  /**
   * Get signals in queue (for debugging)
   */
  getQueueSnapshot(): Array<{ priority: number; signals: QueuedSignal[] }> {
    const snapshot: Array<{ priority: number; signals: QueuedSignal[] }> = [];
    for (let priority = 10; priority >= 1; priority--) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        snapshot.push({
          priority,
          signals: [...queue], // Copy array
        });
      }
    }
    return snapshot;
  }
  /**
   * Get processing signals
   */
  getProcessingSignals(): string[] {
    return Array.from(this.processing);
  }
  /**
   * Get recent completed signals
   */
  getRecentCompleted(limit = 50): QueuedSignal[] {
    return this.completed.slice(-limit);
  }
  /**
   * Clear queue (for emergency situations)
   */
  clearQueue(): void {
    const totalCleared = this.getTotalQueued();
    for (const queue of Array.from(this.queues.values())) {
      queue.length = 0;
    }
    this.processing.clear();
    this.completed = [];
    this.logger.warn(
      'orchestrator',
      'SignalPriorityQueue',
      `Queue cleared, ${totalCleared} signals removed`,
    );
  }
  /**
   * Get total number of queued signals
   */
  getTotalQueued(): number {
    let total = 0;
    for (const queue of Array.from(this.queues.values())) {
      total += queue.length;
    }
    return total;
  }
  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.getTotalQueued() === 0;
  }
  // Private methods
  private _updateWaitTimes(): void {
    let cumulativeWait = 0;
    // Calculate estimated wait time for each signal based on priority
    for (let priority = 10; priority >= 1; priority--) {
      const queue = this.queues.get(priority);
      if (!queue) {
        continue;
      }
      for (const signal of queue) {
        signal.estimatedWaitTime = cumulativeWait;
        // Estimate processing time based on priority (higher priority = faster processing)
        const estimatedProcessingTime = 5000 / priority; // 5 seconds base / priority
        cumulativeWait += estimatedProcessingTime;
      }
    }
  }
  private _addToHistory(signal: QueuedSignal): void {
    this.completed.push(signal);
    if (this.completed.length > this.maxHistory) {
      this.completed = this.completed.slice(-this.maxHistory);
    }
  }
  /**
   * Process signals automatically with registered consumers
   */
  async processSignals(): Promise<void> {
    // Try each consumer in priority order
    for (const consumer of this.consumers) {
      const signal = this.dequeue(consumer);
      if (!signal) {
        continue;
      }
      try {
        this.logger.debug(
          'orchestrator',
          'SignalPriorityQueue',
          `Processing signal with ${consumer.name}`,
          {
            signalId: signal.id,
            type: signal.type,
          },
        );
        const success = await consumer.process(signal);
        this.complete(signal.id, success);
      } catch (error) {
        this.logger.error(
          'orchestrator',
          'SignalPriorityQueue',
          `Error processing signal with ${consumer.name}`,
          error instanceof Error ? error : new Error(String(error)),
          {
            signalId: signal.id,
            type: signal.type,
            consumerId: consumer.id,
          },
        );
        this.complete(signal.id, false);
      }
      // Process one signal per consumer per cycle to prevent starvation
      break;
    }
  }
  /**
   * Start automatic signal processing
   */
  startProcessing(intervalMs = 1000): () => void {
    this.logger.info(
      'orchestrator',
      'SignalPriorityQueue',
      `Starting automatic signal processing (interval: ${intervalMs}ms)`,
    );
    const interval = setInterval(async () => {
      if (!this.isEmpty()) {
        await this.processSignals();  
      }
    }, intervalMs);
    return () => {
      clearInterval(interval);
      this.logger.info(
        'orchestrator',
        'SignalPriorityQueue',
        'Stopped automatic signal processing',
      );
    };
  }
}
/**
 * Default signal consumers
 */
export const DefaultSignalConsumers = {
  orchestrator: {
    id: 'orchestrator',
    name: 'Orchestrator',
    priority: 10,
    canProcess: (signal: Signal) => {
      // Orchestrator can process most signals
      const orchestratorHandledCategories = [
        'system_info',
        'agent_info',
        'development',
        'testing',
        'coordination',
        'deployment',
        'design',
      ];
      return orchestratorHandledCategories.includes(signal.metadata?.category as string);
    },
    process: (_signal: Signal): Promise<boolean> => {
      // This would be implemented by the orchestrator
      return Promise.resolve(true);
    },
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    priority: 9,
    canProcess: (signal: Signal) => {
      // Admin handles critical signals
      return signal.priority >= 8 || (signal.metadata?.category as string) === 'incident';
    },
    process: (_signal: Signal): Promise<boolean> => {
      // This would be implemented by the admin interface
      return Promise.resolve(true);
    },
  },
  qualityControl: {
    id: 'quality-control',
    name: 'Quality Control',
    priority: 7,
    canProcess: (signal: Signal) => {
      // QC handles testing and quality signals
      return ['testing', 'quality'].includes(signal.metadata?.category as string);
    },
    process: (_signal: Signal): Promise<boolean> => {
      // This would be implemented by the QC system
      return Promise.resolve(true);
    },
  },
};
