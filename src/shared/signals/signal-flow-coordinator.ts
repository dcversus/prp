/**
 * ♫ Signal Flow Coordinator for @dcversus/prp
 *
 * Central coordinator for the complete signal flow pipeline:
 * Scanner → EventBus → Inspector → Orchestrator → TUI
 *
 * Manages signal lifecycle, routing, and processing across all
 * system components with proper error handling and performance monitoring.
 */

import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils } from '../index';
import { unifiedSignalDetector } from '../../scanner/unified-signal-detector';
import { signalPipeline } from '../signal-pipeline';

import { eventBusIntegration } from './event-bus-integration';

import type { Signal, SignalEvent } from '../types/common';
import type { EnhancedSignal, SignalStatus } from '../types/signals';

const logger = createLayerLogger('signals');

/**
 * Signal Flow Configuration
 */
export interface SignalFlowConfig {
  // Scanner settings
  scanner: {
    enabled: boolean;
    debounceTime: number;
    cacheSize: number;
  };
  // Event processing
  eventProcessing: {
    batchSize: number;
    processingInterval: number;
    maxConcurrency: number;
  };
  // Signal routing
  routing: {
    enableFiltering: boolean;
    enableDeduplication: boolean;
    enablePrioritization: boolean;
  };
  // Performance monitoring
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      latency: number; // milliseconds
      errorRate: number; // percentage
      queueSize: number;
    };
  };
}

/**
 * Signal Flow Metrics
 */
export interface SignalFlowMetrics {
  // Overall metrics
  totalSignals: number;
  processedSignals: number;
  errorRate: number;
  averageLatency: number;
  throughput: number; // signals per second

  // Stage metrics
  scanner: {
    signalsDetected: number;
    detectionRate: number;
    cacheHitRate: number;
  };
  eventBus: {
    eventsPublished: number;
    eventsProcessed: number;
    subscribers: number;
  };
  pipeline: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };

  // Performance
  lastResetTime: Date;
  peakLatency: number;
  memoryUsage: number;
}

/**
 * Signal Flow Coordinator
 *
 * Manages the complete signal processing pipeline from detection
 * through to TUI display with real-time coordination and monitoring.
 */
export class SignalFlowCoordinator extends EventEmitter {
  private static instance: SignalFlowCoordinator | null = null;

  private isInitialized = false;
  private isRunning = false;
  private readonly config: SignalFlowConfig;
  private startTime?: Date;

  // Processing state
  private readonly processingQueue = new Map<string, { signal: Signal; timestamp: number; retries: number }>();
  private readonly routingTable = new Map<string, Array<(signal: SignalEvent) => void>>();
  private readonly deduplicationCache = new Map<string, number>(); // signalId -> timestamp

  // Metrics
  private metrics: SignalFlowMetrics;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: Partial<SignalFlowConfig> = {}) {
    super();

    this.config = {
      scanner: {
        enabled: true,
        debounceTime: 50,
        cacheSize: 10000,
        ...config.scanner,
      },
      eventProcessing: {
        batchSize: 50,
        processingInterval: 100,
        maxConcurrency: 10,
        ...config.eventProcessing,
      },
      routing: {
        enableFiltering: true,
        enableDeduplication: true,
        enablePrioritization: true,
        ...config.routing,
      },
      monitoring: {
        enabled: true,
        metricsInterval: 5000,
        alertThresholds: {
          latency: 1000,
          errorRate: 5,
          queueSize: 1000,
        },
        ...config.monitoring,
      },
      ...config,
    };

    this.initializeMetrics();
    this.setupEventListeners();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<SignalFlowConfig>): SignalFlowCoordinator {
    if (!SignalFlowCoordinator.instance) {
      SignalFlowCoordinator.instance = new SignalFlowCoordinator(config);
    }
    return SignalFlowCoordinator.instance;
  }

  /**
   * Initialize the signal flow coordinator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('SignalFlowCoordinator', 'Signal flow coordinator already initialized');
      return;
    }

    try {
      logger.info('SignalFlowCoordinator', 'Initializing signal flow coordinator...');

      // Initialize components
      await this.initializeComponents();

      // Setup signal routing
      this.setupSignalRouting();

      // Start metrics collection
      if (this.config.monitoring.enabled) {
        this.startMetricsCollection();
      }

      this.isInitialized = true;
      logger.info('SignalFlowCoordinator', '✅ Signal flow coordinator initialized successfully');

      this.emit('coordinator:initialized', {
        timestamp: TimeUtils.now(),
        config: this.config,
      });

    } catch (error) {
      logger.error('SignalFlowCoordinator', 'Failed to initialize signal flow coordinator', error as Error);
      throw error;
    }
  }

  /**
   * Start the signal flow processing
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Signal flow coordinator not initialized');
    }

    if (this.isRunning) {
      logger.warn('SignalFlowCoordinator', 'Signal flow coordinator already running');
      return;
    }

    try {
      logger.info('SignalFlowCoordinator', 'Starting signal flow coordinator...');

      // Start EventBus integration
      await eventBusIntegration.initialize();

      // Start signal pipeline
      await signalPipeline.start();

      // Start processing loop
      this.startProcessingLoop();

      this.isRunning = true;
      this.startTime = TimeUtils.now();

      logger.info('SignalFlowCoordinator', '✅ Signal flow coordinator started successfully');

      this.emit('coordinator:started', {
        timestamp: this.startTime,
      });

    } catch (error) {
      logger.error('SignalFlowCoordinator', 'Failed to start signal flow coordinator', error as Error);
      throw error;
    }
  }

  /**
   * Stop the signal flow processing
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('SignalFlowCoordinator', 'Stopping signal flow coordinator...');

      this.isRunning = false;

      // Stop processing loop
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Stop signal pipeline
      await signalPipeline.stop();

      // Cleanup EventBus integration
      await eventBusIntegration.cleanup();

      // Clear processing queue
      this.processingQueue.clear();

      logger.info('SignalFlowCoordinator', '✅ Signal flow coordinator stopped');

      this.emit('coordinator:stopped', {
        timestamp: TimeUtils.now(),
        metrics: this.metrics,
      });

    } catch (error) {
      logger.error('SignalFlowCoordinator', 'Failed to stop signal flow coordinator', error as Error);
    }
  }

  /**
   * Process a signal through the complete pipeline
   */
  async processSignal(filePath: string, content: string): Promise<void> {
    if (!this.isRunning) {
      logger.warn('SignalFlowCoordinator', 'Signal flow coordinator not running - ignoring signal');
      return;
    }

    const startTime = Date.now();

    try {
      // Step 1: Detect signals in content
      const detectedSignals = await this.detectSignals(filePath, content);

      for (const signal of detectedSignals) {
        // Step 2: Apply signal routing and filtering
        if (this.shouldProcessSignal(signal)) {
          // Step 3: Route to EventBus
          await this.routeSignal(signal);

          // Step 4: Add to pipeline for further processing
          await this.addToPipeline(signal);

          // Step 5: Update metrics
          this.updateMetrics(Date.now() - startTime);
        }
      }

    } catch (error) {
      this.handleProcessingError('processSignal', error as Error, { filePath });
    }
  }

  /**
   * Add signal to processing queue
   */
  addToQueue(signal: Signal, priority = 0): void {
    const queueId = `${signal.id}-${Date.now()}`;

    this.processingQueue.set(queueId, {
      signal,
      timestamp: TimeUtils.now().getTime(),
      retries: 0,
    });

    // Maintain queue size
    if (this.processingQueue.size > this.config.eventProcessing.batchSize * 2) {
      // Remove oldest entries
      const entries = Array.from(this.processingQueue.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - this.config.eventProcessing.batchSize);
      for (const [key] of toRemove) {
        this.processingQueue.delete(key);
      }
    }

    logger.debug('SignalFlowCoordinator', 'Signal added to queue', {
      signalId: signal.id,
      queueSize: this.processingQueue.size,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): SignalFlowMetrics {
    return { ...this.metrics };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.processingQueue.size,
      maxQueueSize: this.config.eventProcessing.batchSize * 2,
      processing: this.isRunning,
      components: {
        scanner: this.metrics.scanner,
        eventBus: this.metrics.eventBus,
        pipeline: this.metrics.pipeline,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();

    this.routingTable.clear();
    this.deduplicationCache.clear();

    this.removeAllListeners();
    this.isInitialized = false;

    logger.info('SignalFlowCoordinator', '✅ Signal flow coordinator cleaned up');
  }

  // Private methods

  private initializeMetrics(): void {
    this.metrics = {
      totalSignals: 0,
      processedSignals: 0,
      errorRate: 0,
      averageLatency: 0,
      throughput: 0,

      scanner: {
        signalsDetected: 0,
        detectionRate: 0,
        cacheHitRate: 0,
      },

      eventBus: {
        eventsPublished: 0,
        eventsProcessed: 0,
        subscribers: 0,
      },

      pipeline: {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },

      lastResetTime: TimeUtils.now(),
      peakLatency: 0,
      memoryUsage: 0,
    };
  }

  private async initializeComponents(): Promise<void> {
    // Initialize EventBus integration
    await eventBusIntegration.initialize();

    // Initialize signal pipeline
    await signalPipeline.start();

    logger.debug('SignalFlowCoordinator', 'Components initialized');
  }

  private setupEventListeners(): void {
    // Listen to EventBus signals
    eventBusIntegration.on('signal:event', (event: SignalEvent) => {
      this.handleEventBusSignal(event);
    });

    // Listen to pipeline events
    signalPipeline.on('signal:detected', (data) => {
      this.metrics.scanner.signalsDetected++;
    });

    signalPipeline.on('signal:resolved', (data) => {
      this.metrics.pipeline.completed++;
      this.metrics.processedSignals++;
    });

    signalPipeline.on('pipeline:error', (error) => {
      this.metrics.pipeline.failed++;
      this.handleProcessingError('pipeline', error.error, error.data);
    });
  }

  private setupSignalRouting(): void {
    // Route different signal types to appropriate handlers
    this.routingTable.set('scanner:file_system', [
      this.handleFileSystemSignal.bind(this),
    ]);

    this.routingTable.set('agent:*', [
      this.handleAgentSignal.bind(this),
    ]);

    this.routingTable.set('*', [
      this.handleGenericSignal.bind(this),
    ]);
  }

  private async detectSignals(filePath: string, content: string): Promise<Signal[]> {
    return unifiedSignalDetector.detectSignals(filePath, content);
  }

  private shouldProcessSignal(signal: Signal): boolean {
    // Apply deduplication
    if (this.config.routing.enableDeduplication) {
      const now = TimeUtils.now().getTime();
      const lastSeen = this.deduplicationCache.get(signal.id);
      if (lastSeen && (now - lastSeen) < 5000) { // 5 second deduplication window
        return false;
      }
      this.deduplicationCache.set(signal.id, now);
    }

    return true;
  }

  private async routeSignal(signal: Signal): Promise<void> {
    const signalEvent: SignalEvent = {
      id: signal.id,
      type: 'signal_detected',
      signal: `[${signal.type.toUpperCase()}]`,
      timestamp: signal.timestamp,
      source: signal.source,
      priority: this.mapPriority(signal.priority),
      state: 'active',
      metadata: {
        ...signal.metadata,
        filePath: signal.metadata?.filePath,
        originalData: signal.data,
      },
    };

    // Publish to EventBus
    eventBusIntegration.publishToChannel('scanner', signalEvent);
    this.metrics.eventBus.eventsPublished++;

    // Route to specific handlers
    for (const [pattern, handlers] of Array.from(this.routingTable.entries())) {
      if (this.matchesPattern(signalEvent.source, pattern)) {
        for (const handler of handlers) {
          try {
            await handler(signalEvent);
          } catch (error) {
            logger.error('SignalFlowCoordinator', 'Error in signal handler', error as Error);
          }
        }
      }
    }
  }

  private async addToPipeline(signal: Signal): Promise<void> {
    const enhancedSignal: EnhancedSignal = {
      ...signal,
      status: SignalStatus.DETECTED,
      data: {
        ...signal.data,
        filePath: signal.metadata?.filePath,
      },
      metadata: {
        ...signal.metadata,
        detector: signal.metadata?.detector || 'unknown',
        confidence: signal.metadata?.confidence || 0.5,
      },
    };

    await signalPipeline.processSignal(signal);
    this.metrics.pipeline.queued++;
  }

  private startProcessingLoop(): void {
    setInterval(async () => {
      if (!this.isRunning || this.processingQueue.size === 0) {
        return;
      }

      const batchSize = Math.min(this.config.eventProcessing.batchSize, this.processingQueue.size);
      const entries = Array.from(this.processingQueue.entries()).slice(0, batchSize);

      for (const [queueId, entry] of entries) {
        try {
          await this.processQueueEntry(entry);
          this.processingQueue.delete(queueId);
        } catch (error) {
          logger.error('SignalFlowCoordinator', 'Error processing queue entry', error as Error);
          this.processingQueue.delete(queueId);
        }
      }
    }, this.config.eventProcessing.processingInterval);
  }

  private async processQueueEntry(entry: { signal: Signal; timestamp: number; retries: number }): Promise<void> {
    // Additional processing for queued signals
    this.metrics.pipeline.processing++;
  }

  private handleEventBusSignal(event: SignalEvent): void {
    this.metrics.eventBus.eventsProcessed++;
    this.emit('signal:processed', event);
  }

  private handleFileSystemSignal(event: SignalEvent): void {
    logger.debug('SignalFlowCoordinator', 'File system signal', { signal: event.signal, source: event.source });
  }

  private handleAgentSignal(event: SignalEvent): void {
    logger.debug('SignalFlowCoordinator', 'Agent signal', { signal: event.signal, source: event.source });
  }

  private handleGenericSignal(event: SignalEvent): void {
    logger.debug('SignalFlowCoordinator', 'Generic signal', { signal: event.signal, source: event.source });
  }

  private mapPriority(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority >= 9) return 'critical';
    if (priority >= 7) return 'high';
    if (priority >= 5) return 'medium';
    return 'low';
  }

  private matchesPattern(source: string, pattern: string): boolean {
    // Simple wildcard matching
    const regexPattern = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`).test(source);
  }

  private updateMetrics(latency: number): void {
    this.metrics.totalSignals++;
    this.metrics.processedSignals++;

    // Update average latency
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.processedSignals - 1) + latency) /
      this.metrics.processedSignals
    );

    // Update peak latency
    this.metrics.peakLatency = Math.max(this.metrics.peakLatency, latency);

    // Calculate throughput
    const elapsed = (TimeUtils.now().getTime() - this.metrics.lastResetTime.getTime()) / 1000;
    if (elapsed > 0) {
      this.metrics.throughput = this.metrics.processedSignals / elapsed;
    }

    // Update error rate
    this.metrics.errorRate = (this.metrics.pipeline.failed / Math.max(1, this.metrics.totalSignals)) * 100;
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      if (!this.isRunning) {
        return;
      }

      // Update scanner metrics from detector
      const detectorMetrics = unifiedSignalDetector.getMetrics();
      this.metrics.scanner.signalsDetected = detectorMetrics.totalDetections;
      this.metrics.scanner.cacheHitRate = detectorMetrics.cacheHitRate;

      // Update EventBus metrics
      const eventBusStatus = eventBusIntegration.getIntegrationStatus();
      this.metrics.eventBus.subscribers = eventBusStatus.subscribers.total;

      // Update pipeline metrics
      const queueStatus = signalPipeline.getQueueStatus();
      this.metrics.pipeline.queued = queueStatus.inspectorQueue + queueStatus.orchestratorQueue;

      // Check alert thresholds
      this.checkAlertThresholds();

      this.emit('metrics:updated', this.metrics);

    }, this.config.monitoring.metricsInterval);
  }

  private checkAlertThresholds(): void {
    const thresholds = this.config.monitoring.alertThresholds;

    if (this.metrics.averageLatency > thresholds.latency) {
      this.emit('alert:latency', {
        current: this.metrics.averageLatency,
        threshold: thresholds.latency,
      });
    }

    if (this.metrics.errorRate > thresholds.errorRate) {
      this.emit('alert:errorRate', {
        current: this.metrics.errorRate,
        threshold: thresholds.errorRate,
      });
    }

    if (this.metrics.pipeline.queued > thresholds.queueSize) {
      this.emit('alert:queueSize', {
        current: this.metrics.pipeline.queued,
        threshold: thresholds.queueSize,
      });
    }
  }

  private handleProcessingError(context: string, error: Error, data?: any): void {
    logger.error('SignalFlowCoordinator', `Error in ${context}`, error, data);
    this.emit('processing:error', { context, error, data });
  }
}

// Export singleton instance
export const signalFlowCoordinator = SignalFlowCoordinator.getInstance();