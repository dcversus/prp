/**
 * ♫ Real-time Event Emitter for @dcversus/prp Signal System
 *
 * High-performance event emission system for real-time signal detection,
 * processing, and distribution across the scanner-inspector-orchestrator pipeline.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import { createLayerLogger, HashUtils, TimeUtils } from '../shared';

const logger = createLayerLogger('scanner');

export interface SignalEvent {
  id: string;
  type: 'signal_detected' | 'signal_processed' | 'signal_resolved' | 'signal_expired';
  timestamp: Date;
  signal: Signal;
  source: string;
  metadata: Record<string, any>;
}

export interface ScannerEvent {
  id: string;
  type: 'scan_started' | 'scan_completed' | 'scan_failed' | 'scan_paused' | 'scan_resumed';
  timestamp: Date;
  worktree: string;
  scanId?: string;
  metadata: {
    scanType: 'full' | 'incremental';
    scanId?: string;
    duration?: number;
    changesFound?: number;
    signalsDetected?: number;
    error?: string;
  };
}

export interface PRPEvent {
  id: string;
  type: 'prp_created' | 'prp_modified' | 'prp_deleted' | 'prp_signals_updated';
  timestamp: Date;
  prpPath: string;
  metadata: {
    version?: number;
    changes?: string[];
    signals?: Signal[];
    previousVersion?: number;
  };
}

export interface GitEvent {
  id: string;
  type: 'commit_detected' | 'branch_changed' | 'pr_detected' | 'merge_detected';
  timestamp: Date;
  repository: string;
  metadata: {
    commit?: string;
    branch?: string;
    prNumber?: number;
    author?: string;
    message?: string;
    signals?: Signal[];
  };
}

export interface TokenEvent {
  id: string;
  type: 'token_usage_recorded' | 'token_limit_warning' | 'token_limit_exceeded';
  timestamp: Date;
  agentId: string;
  metadata: {
    tokens: number;
    cost: number;
    operation: string;
    model: string;
    limit?: number;
    percentage?: number;
  };
}

export interface SystemEvent {
  id: string;
  type: 'system_started' | 'system_shutdown' | 'system_error' | 'system_health_check';
  timestamp: Date;
  metadata: {
    component: string;
    status: string;
    details?: any;
  };
}

export type RealTimeEvent = SignalEvent | ScannerEvent | PRPEvent | GitEvent | TokenEvent | SystemEvent;

export interface EventSubscription {
  id: string;
  eventType: string;
  filter?: (event: RealTimeEvent) => boolean;
  callback: (event: RealTimeEvent) => void | Promise<void>;
  created: Date;
  lastTriggered?: Date;
  triggerCount: number;
  active: boolean;
}

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsPerSecond: number;
  averageProcessingTime: number;
  activeSubscriptions: number;
  eventQueueSize: number;
  droppedEvents: number;
}

/**
 * Real-time Event Emitter with high-performance event processing
 */
export class RealTimeEventEmitter {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: RealTimeEvent[] = [];
  private processing = false;
  private metrics = {
    totalEvents: 0,
    eventsByType: {} as Record<string, number>,
    processingTimes: [] as number[],
    droppedEvents: 0,
    startTime: TimeUtils.now()
  };
  private maxQueueSize = 10000;
  private batchSize = 100;
  private processingInterval = 10; // ms

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(1000); // Support many listeners
    this.startProcessing();
    this.setupHealthMonitoring();
  }

  /**
   * Emit a signal detection event
   */
  emitSignalDetected(signal: Signal, source: string, metadata: Record<string, any> = {}): void {
    const event: SignalEvent = {
      id: HashUtils.generateId(),
      type: 'signal_detected',
      timestamp: TimeUtils.now(),
      signal,
      source,
      metadata
    };

    this.emitEvent(event);
    logger.debug('RealTimeEventEmitter', `Signal detected: ${signal.type} from ${source}`);
  }

  /**
   * Emit a signal processing event
   */
  emitSignalProcessed(signal: Signal, source: string, metadata: Record<string, any> = {}): void {
    const event: SignalEvent = {
      id: HashUtils.generateId(),
      type: 'signal_processed',
      timestamp: TimeUtils.now(),
      signal,
      source,
      metadata
    };

    this.emitEvent(event);
  }

  /**
   * Emit a signal resolution event
   */
  emitSignalResolved(signal: Signal, source: string, metadata: Record<string, any> = {}): void {
    const event: SignalEvent = {
      id: HashUtils.generateId(),
      type: 'signal_resolved',
      timestamp: TimeUtils.now(),
      signal,
      source,
      metadata
    };

    this.emitEvent(event);
  }

  /**
   * Emit a scanner event
   */
  emitScannerEvent(type: ScannerEvent['type'], worktree: string, metadata: ScannerEvent['metadata']): void {
    const event: ScannerEvent = {
      id: HashUtils.generateId(),
      type,
      timestamp: TimeUtils.now(),
      worktree,
      scanId: metadata.scanId || HashUtils.generateId(),
      metadata
    };

    this.emitEvent(event);
  }

  /**
   * Emit a PRP event
   */
  emitPRPEvent(type: PRPEvent['type'], prpPath: string, metadata: PRPEvent['metadata']): void {
    const event: PRPEvent = {
      id: HashUtils.generateId(),
      type,
      timestamp: TimeUtils.now(),
      prpPath,
      metadata
    };

    this.emitEvent(event);
  }

  /**
   * Emit a git event
   */
  emitGitEvent(type: GitEvent['type'], repository: string, metadata: GitEvent['metadata']): void {
    const event: GitEvent = {
      id: HashUtils.generateId(),
      type,
      timestamp: TimeUtils.now(),
      repository,
      metadata
    };

    this.emitEvent(event);
  }

  /**
   * Emit a token event
   */
  emitTokenEvent(type: TokenEvent['type'], agentId: string, metadata: TokenEvent['metadata']): void {
    const event: TokenEvent = {
      id: HashUtils.generateId(),
      type,
      timestamp: TimeUtils.now(),
      agentId,
      metadata
    };

    this.emitEvent(event);
  }

  /**
   * Emit a system event
   */
  emitSystemEvent(type: SystemEvent['type'], component: string, metadata: Partial<SystemEvent['metadata']> = {}): void {
    const event: SystemEvent = {
      id: HashUtils.generateId(),
      type,
      timestamp: TimeUtils.now(),
      metadata: {
        component,
        status: metadata.status || 'unknown',
        ...metadata
      }
    };

    this.emitEvent(event);
  }

  /**
   * Generic event emission
   */
  private emitEvent(event: RealTimeEvent): void {
    // Update metrics
    this.metrics.totalEvents++;
    const eventType = event.type;
    this.metrics.eventsByType[eventType] = (this.metrics.eventsByType[eventType] || 0) + 1;

    // Add to queue for processing
    if (this.eventQueue.length >= this.maxQueueSize) {
      // Drop oldest events if queue is full
      this.eventQueue.shift();
      this.metrics.droppedEvents++;
      logger.warn('RealTimeEventEmitter', 'Event queue full, dropping oldest event');
    }

    this.eventQueue.push(event);

    // Also emit immediately for high-priority events
    if (this.isHighPriorityEvent(event)) {
      this.processEvent(event);
    }
  }

  /**
   * Subscribe to events with optional filtering
   */
  subscribe(
    eventType: string,
    callback: (event: RealTimeEvent) => void | Promise<void>,
    filter?: (event: RealTimeEvent) => boolean
  ): string {
    const subscription: EventSubscription = {
      id: HashUtils.generateId(),
      eventType,
      filter,
      callback,
      created: TimeUtils.now(),
      triggerCount: 0,
      active: true
    };

    this.subscriptions.set(subscription.id, subscription);

    logger.debug('RealTimeEventEmitter', `Subscription created: ${eventType}`, {
      subscriptionId: subscription.id
    });

    return subscription.id;
  }

  /**
   * Subscribe to signal events
   */
  subscribeToSignals(
    callback: (event: SignalEvent) => void | Promise<void>,
    filter?: (event: SignalEvent) => boolean
  ): string {
    return this.subscribe('signal_detected', callback as any, filter as any);
  }

  /**
   * Subscribe to scanner events
   */
  subscribeToScanner(
    callback: (event: ScannerEvent) => void | Promise<void>,
    filter?: (event: ScannerEvent) => boolean
  ): string {
    return this.subscribe('scan_completed', callback as any, filter as any);
  }

  /**
   * Subscribe to PRP events
   */
  subscribeToPRP(
    callback: (event: PRPEvent) => void | Promise<void>,
    filter?: (event: PRPEvent) => boolean
  ): string {
    return this.subscribe('prp_modified', callback as any, filter as any);
  }

  /**
   * Subscribe to git events
   */
  subscribeToGit(
    callback: (event: GitEvent) => void | Promise<void>,
    filter?: (event: GitEvent) => boolean
  ): string {
    return this.subscribe('commit_detected', callback as any, filter as any);
  }

  /**
   * Subscribe to token events
   */
  subscribeToTokens(
    callback: (event: TokenEvent) => void | Promise<void>,
    filter?: (event: TokenEvent) => boolean
  ): string {
    return this.subscribe('token_usage_recorded', callback as any, filter as any);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.active = false;
    this.subscriptions.delete(subscriptionId);

    logger.debug('RealTimeEventEmitter', `Subscription removed: ${subscriptionId}`);
    return true;
  }

  /**
   * Get subscription metrics
   */
  getSubscriptionMetrics(): {
    total: number;
    active: number;
    byEventType: Record<string, number>;
    mostTriggered: Array<{ id: string; eventType: string; triggerCount: number }>;
  } {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(sub => sub.active);
    const byEventType: Record<string, number> = {};

    activeSubscriptions.forEach(sub => {
      byEventType[sub.eventType] = (byEventType[sub.eventType] || 0) + 1;
    });

    const mostTriggered = activeSubscriptions
      .sort((a, b) => b.triggerCount - a.triggerCount)
      .slice(0, 10)
      .map(sub => ({
        id: sub.id,
        eventType: sub.eventType,
        triggerCount: sub.triggerCount
      }));

    return {
      total: this.subscriptions.size,
      active: activeSubscriptions.length,
      byEventType,
      mostTriggered
    };
  }

  /**
   * Start processing events from the queue
   */
  private startProcessing(): void {
    setInterval(() => {
      if (!this.processing && this.eventQueue.length > 0) {
        this.processBatch();
      }
    }, this.processingInterval);
  }

  /**
   * Process a batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;
    const startTime = Date.now();

    try {
      const batch = this.eventQueue.splice(0, this.batchSize);

      await Promise.all(batch.map(event => this.processEvent(event)));

      const processingTime = Date.now() - startTime;
      this.metrics.processingTimes.push(processingTime);

      // Keep only last 100 processing times for average calculation
      if (this.metrics.processingTimes.length > 100) {
        this.metrics.processingTimes = this.metrics.processingTimes.slice(-100);
      }

    } catch (error) {
      logger.error('RealTimeEventEmitter', 'Error processing event batch', error instanceof Error ? error : new Error(String(error)), {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: RealTimeEvent): Promise<void> {
    try {
      // Emit to traditional event emitter
      this.emitter.emit(event.type, event);
      this.emitter.emit('*', event); // Wildcard event

      // Process subscriptions
      const relevantSubscriptions = Array.from(this.subscriptions.values())
        .filter(sub => sub.active && sub.eventType === event.type);

      await Promise.all(relevantSubscriptions.map(async subscription => {
        try {
          // Apply filter if present
          if (subscription.filter && !subscription.filter(event)) {
            return;
          }

          // Update subscription metrics
          subscription.triggerCount++;
          subscription.lastTriggered = TimeUtils.now();

          // Execute callback
          await subscription.callback(event);

        } catch (error) {
          logger.error('RealTimeEventEmitter', 'Error in subscription callback', error instanceof Error ? error : new Error(String(error)), {
            subscriptionId: subscription.id,
            eventType: subscription.eventType,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }));

    } catch (error) {
      logger.error('RealTimeEventEmitter', 'Error processing event', error instanceof Error ? error : new Error(String(error)), {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check if an event is high priority
   */
  private isHighPriorityEvent(event: RealTimeEvent): boolean {
    const highPriorityTypes = [
      'signal_detected',
      'token_limit_exceeded',
      'system_error',
      'scan_failed'
    ];

    return highPriorityTypes.includes(event.type);
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const metrics = this.getMetrics();

    // Log warnings for potential issues
    if (metrics.eventQueueSize > 1000) {
      logger.warn('RealTimeEventEmitter', 'Event queue size is high', {
        queueSize: metrics.eventQueueSize
      });
    }

    if (metrics.eventsPerSecond > 1000) {
      logger.warn('RealTimeEventEmitter', 'High event rate detected', {
        eventsPerSecond: metrics.eventsPerSecond
      });
    }

    if (metrics.droppedEvents > 0) {
      logger.warn('RealTimeEventEmitter', 'Events have been dropped', {
        droppedEvents: metrics.droppedEvents
      });
    }

    if (metrics.averageProcessingTime > 100) {
      logger.warn('RealTimeEventEmitter', 'High processing time detected', {
        averageProcessingTime: metrics.averageProcessingTime
      });
    }

    // Emit system health event
    this.emitSystemEvent('system_health_check', 'event-emitter', {
      status: 'healthy',
      details: { metrics }
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): EventMetrics {
    const now = TimeUtils.now();
    const uptime = now.getTime() - this.metrics.startTime.getTime();
    const eventsPerSecond = uptime > 0 ? (this.metrics.totalEvents / (uptime / 1000)) : 0;

    const averageProcessingTime = this.metrics.processingTimes.length > 0
      ? this.metrics.processingTimes.reduce((sum, time) => sum + time, 0) / this.metrics.processingTimes.length
      : 0;

    return {
      totalEvents: this.metrics.totalEvents,
      eventsByType: { ...this.metrics.eventsByType },
      eventsPerSecond,
      averageProcessingTime,
      activeSubscriptions: Array.from(this.subscriptions.values()).filter(sub => sub.active).length,
      eventQueueSize: this.eventQueue.length,
      droppedEvents: this.metrics.droppedEvents
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      processingTimes: [],
      droppedEvents: 0,
      startTime: TimeUtils.now()
    };

    logger.info('RealTimeEventEmitter', 'Metrics reset');
  }

  /**
   * Shutdown the event emitter
   */
  async shutdown(): Promise<void> {
    logger.info('RealTimeEventEmitter', 'Shutting down event emitter');

    // Process remaining events
    while (this.eventQueue.length > 0) {
      await this.processBatch();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Clear all subscriptions
    this.subscriptions.clear();

    // Remove all listeners
    this.emitter.removeAllListeners();

    logger.info('RealTimeEventEmitter', 'Event emitter shutdown complete');
  }

  /**
   * Get detailed event statistics
   */
  getDetailedStatistics(): {
    uptime: number;
    metrics: EventMetrics;
    subscriptionMetrics: ReturnType<typeof this.getSubscriptionMetrics>;
    recentEvents: Array<{
      type: string;
      timestamp: Date;
      id: string;
    }>;
  } {
    const uptime = TimeUtils.now().getTime() - this.metrics.startTime.getTime();

    const recentEvents = this.eventQueue.slice(-10).map(event => ({
      type: event.type,
      timestamp: event.timestamp,
      id: event.id
    }));

    return {
      uptime,
      metrics: this.getMetrics(),
      subscriptionMetrics: this.getSubscriptionMetrics(),
      recentEvents
    };
  }
}