/**
 * Scanner → Inspector Bridge
 *
 * Bridges the gap between the Scanner signal detection and Inspector analysis.
 * Handles signal forwarding, filtering, and event management between the two systems.
 */
import { EventEmitter } from 'events';

import { logger } from '../shared/logger';

import type { Signal } from '../shared/types';
import type { InspectorResult } from '../inspector/types';

export interface ScannerInspectorBridgeConfig {
  // Signal filtering
  enabledSignalTypes?: string[];
  priorityThreshold?: number;
  // Performance settings
  batchSize?: number;
  batchTimeout?: number;
  maxConcurrentBatches?: number;
  // Error handling
  maxRetries?: number;
  retryDelay?: number;
  enableDeadLetterQueue?: boolean;
  // Health monitoring
  healthCheckInterval?: number;
  connectionTimeout?: number;
}
export interface BridgeMetrics {
  signalsForwarded: number;
  signalsProcessed: number;
  signalsDropped: number;
  averageLatency: number;
  errorCount: number;
  batchesProcessed: number;
  uptime: number;
  lastHealthCheck: Date;
}
export interface SignalBatch {
  id: string;
  signals: Signal[];
  timestamp: Date;
  source: string;
  priority: number;
}
/**
 * Bridge component that connects Scanner to Inspector
 */
export class ScannerInspectorBridge extends EventEmitter {
  private readonly config: Required<ScannerInspectorBridgeConfig>;
  private readonly metrics: BridgeMetrics;
  private isRunning = false;
  private startTime?: Date;
  private healthCheckTimer?: NodeJS.Timeout;
  private readonly pendingBatches = new Map<string, SignalBatch>();
  private deadLetterQueue: Signal[] = [];
  // References to connected components
  private scanner?: any; // Will be set via connectScanner()
  private inspector?: any; // Will be set via connectInspector()
  constructor(config: ScannerInspectorBridgeConfig = {}) {
    super();
    // Default configuration
    this.config = {
      enabledSignalTypes: config.enabledSignalTypes ?? [],
      priorityThreshold: config.priorityThreshold ?? 1,
      batchSize: config.batchSize ?? 10,
      batchTimeout: config.batchTimeout ?? 1000, // 1 second
      maxConcurrentBatches: config.maxConcurrentBatches ?? 5,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableDeadLetterQueue: config.enableDeadLetterQueue ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout ?? 5000, // 5 seconds
    };
    this.metrics = {
      signalsForwarded: 0,
      signalsProcessed: 0,
      signalsDropped: 0,
      averageLatency: 0,
      errorCount: 0,
      batchesProcessed: 0,
      uptime: 0,
      lastHealthCheck: new Date(),
    };
  }
  /**
   * Start the bridge and begin monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('ScannerInspectorBridge is already running');
    }
    this.startTime = new Date();
    this.isRunning = true;
    // Start health monitoring
    this.startHealthMonitoring();
    this.emit('bridge:started', {
      bridge: 'scanner-inspector',
      timestamp: this.startTime,
      config: this.config,
    });
    logger.debug('orchestrator', 'scanner-inspector-bridge', '🌉 Scanner-Inspector Bridge started');
  }
  /**
   * Stop the bridge and clean up resources
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    // Process any remaining batches
    await this.processPendingBatches();
    this.removeAllListeners();
    this.emit('bridge:stopped', {
      bridge: 'scanner-inspector',
      timestamp: new Date(),
      metrics: this.metrics,
    });
    logger.debug('orchestrator', 'scanner-inspector-bridge', '🌉 Scanner-Inspector Bridge stopped');
  }
  /**
   * Connect to scanner component
   */
  connectScanner(scanner: any): void {
    if (this.scanner) {
      this.disconnectScanner();
    }
    this.scanner = scanner;
    // Set up event listeners for scanner
    scanner.on('signals_detected', (signals: Signal[]) => {
      this.handleSignalsDetected(signals, 'scanner');
    });
    scanner.on('signal_detected', (signal: Signal) => {
      this.handleSignalsDetected([signal], 'scanner');
    });
    scanner.on('error', (error: Error) => {
      this.handleScannerError(error);
    });
    this.emit('bridge:scanner_connected', { scanner: scanner.constructor.name });
  }
  /**
   * Connect to inspector component
   */
  connectInspector(inspector: any): void {
    if (this.inspector) {
      this.disconnectInspector();
    }
    this.inspector = inspector;
    // Set up event listeners for inspector
    inspector.on('inspector:result', (result: InspectorResult) => {
      this.handleInspectorResult(result);
    });
    inspector.on('inspector:error', (error: Error) => {
      this.handleInspectorError(error);
    });
    this.emit('bridge:inspector_connected', { inspector: inspector.constructor.name });
  }
  /**
   * Disconnect from scanner
   */
  disconnectScanner(): void {
    if (this.scanner) {
      this.scanner.removeAllListeners('signals_detected');
      this.scanner.removeAllListeners('signal_detected');
      this.scanner.removeAllListeners('error');
      this.scanner = undefined;
      this.emit('bridge:scanner_disconnected');
    }
  }
  /**
   * Disconnect from inspector
   */
  disconnectInspector(): void {
    if (this.inspector) {
      this.inspector.removeAllListeners('inspector:result');
      this.inspector.removeAllListeners('inspector:error');
      this.inspector = undefined;
      this.emit('bridge:inspector_disconnected');
    }
  }
  /**
   * Handle signals detected by scanner
   */
  private async handleSignalsDetected(signals: Signal[], source: string): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    const startTime = Date.now();
    try {
      // Filter signals based on configuration
      const filteredSignals = this.filterSignals(signals);
      if (filteredSignals.length === 0) {
        this.metrics.signalsDropped += signals.length;
        return;
      }
      // Create batch
      const batch: SignalBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        signals: filteredSignals,
        timestamp: new Date(),
        source,
        priority: this.calculateBatchPriority(filteredSignals),
      };
      // Process batch
      await this.processBatch(batch);
      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(latency, filteredSignals.length);
      this.emit('bridge:signals_processed', {
        batchId: batch.id,
        signalCount: filteredSignals.length,
        latency,
        source,
      });
    } catch (error) {
      this.metrics.errorCount++;
      this.emit('bridge:error', {
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'signal_processing',
      });
    }
  }
  /**
   * Filter signals based on bridge configuration
   */
  private filterSignals(signals: Signal[]): Signal[] {
    return signals.filter((signal) => {
      // Filter by signal type
      if (
        this.config.enabledSignalTypes.length > 0 &&
        !this.config.enabledSignalTypes.includes(signal.type)
      ) {
        return false;
      }
      // Filter by priority threshold
      if (signal.priority < this.config.priorityThreshold) {
        return false;
      }
      // Additional validation
      if (!signal.id || !signal.type || !signal.source) {
        return false;
      }
      return true;
    });
  }
  /**
   * Calculate priority for a batch of signals
   */
  private calculateBatchPriority(signals: Signal[]): number {
    if (signals.length === 0) {
      return 0;
    }
    // Use the highest priority signal in the batch
    return Math.max(...signals.map((s) => s.priority));
  }
  /**
   * Process a batch of signals through the inspector
   */
  private async processBatch(batch: SignalBatch): Promise<void> {
    if (!this.inspector) {
      throw new Error('Inspector not connected');
    }
    this.pendingBatches.set(batch.id, batch);
    try {
      // Process signals through inspector
      const results = await this.inspector.processBatch(batch.signals);
      // Update metrics
      this.metrics.signalsProcessed += batch.signals.length;
      this.metrics.batchesProcessed++;
      // Remove from pending
      this.pendingBatches.delete(batch.id);
      this.emit('bridge:batch_completed', {
        batchId: batch.id,
        signalCount: batch.signals.length,
        resultCount: results.length,
        processingTime: Date.now() - batch.timestamp.getTime(),
      });
    } catch (error) {
      // Handle failed batch
      await this.handleFailedBatch(
        batch,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  /**
   * Handle failed batch processing
   */
  private async handleFailedBatch(batch: SignalBatch, error: Error): Promise<void> {
    this.metrics.errorCount++;
    if (this.config.enableDeadLetterQueue) {
      // Add signals to dead letter queue for retry
      this.deadLetterQueue.push(...batch.signals);
      this.emit('bridge:dead_letter_queued', {
        batchId: batch.id,
        signalCount: batch.signals.length,
        error: error.message,
      });
    }
    this.pendingBatches.delete(batch.id);
    this.emit('bridge:batch_failed', {
      batchId: batch.id,
      signalCount: batch.signals.length,
      error: error.message,
    });
  }
  /**
   * Process any pending batches during shutdown
   */
  private async processPendingBatches(): Promise<void> {
    const batches = Array.from(this.pendingBatches.values());
    for (const batch of batches) {
      try {
        await this.processBatch(batch);
      } catch (error) {
        console.warn(`Failed to process pending batch ${batch.id}:`, error);
      }
    }
    this.pendingBatches.clear();
  }
  /**
   * Handle inspector result
   */
  private handleInspectorResult(result: InspectorResult): void {
    this.metrics.signalsForwarded++;
    this.emit('bridge:inspector_result', {
      result,
      bridgeMetrics: this.metrics,
    });
  }
  /**
   * Handle scanner error
   */
  private handleScannerError(error: Error): void {
    this.metrics.errorCount++;
    this.emit('bridge:scanner_error', {
      error,
      bridgeMetrics: this.metrics,
    });
  }
  /**
   * Handle inspector error
   */
  private handleInspectorError(error: Error): void {
    this.metrics.errorCount++;
    this.emit('bridge:inspector_error', {
      error,
      bridgeMetrics: this.metrics,
    });
  }
  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }
  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const health = {
      bridge: this.isRunning,
      scanner: !!this.scanner,
      inspector: !!this.inspector,
      pendingBatches: this.pendingBatches.size,
      deadLetterQueue: this.deadLetterQueue.length,
      metrics: this.metrics,
    };
    this.metrics.lastHealthCheck = new Date();
    this.emit('bridge:health_check', health);
    // Log warnings for unhealthy conditions
    if (!health.scanner) {
      console.warn('⚠️ Scanner not connected to bridge');
    }
    if (!health.inspector) {
      console.warn('⚠️ Inspector not connected to bridge');
    }
    if (health.pendingBatches > 10) {
      console.warn(`⚠️ High number of pending batches: ${health.pendingBatches}`);
    }
  }
  /**
   * Update bridge metrics
   */
  private updateMetrics(latency: number, signalCount: number): void {
    // Update average latency
    const totalSignals = this.metrics.signalsForwarded + signalCount;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * this.metrics.signalsForwarded + latency) / totalSignals;
    this.metrics.signalsForwarded += signalCount;
    this.metrics.uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }
  /**
   * Get current bridge metrics
   */
  getMetrics(): BridgeMetrics {
    return { ...this.metrics };
  }
  /**
   * Get bridge configuration
   */
  getConfig(): ScannerInspectorBridgeConfig {
    return { ...this.config };
  }
  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    connectedComponents: {
      scanner: boolean;
      inspector: boolean;
    };
    pendingBatches: number;
    deadLetterQueue: number;
    metrics: BridgeMetrics;
  } {
    return {
      isRunning: this.isRunning,
      connectedComponents: {
        scanner: !!this.scanner,
        inspector: !!this.inspector,
      },
      pendingBatches: this.pendingBatches.size,
      deadLetterQueue: this.deadLetterQueue.length,
      metrics: this.getMetrics(),
    };
  }
  /**
   * Process dead letter queue (retry failed signals)
   */
  async processDeadLetterQueue(): Promise<void> {
    if (this.deadLetterQueue.length === 0) {
      return;
    }
    const signalsToRetry = [...this.deadLetterQueue];
    this.deadLetterQueue = [];
    logger.debug('orchestrator', 'scanner-inspector-bridge', `🔄 Retrying ${signalsToRetry.length} signals from dead letter queue`);
    try {
      await this.handleSignalsDetected(signalsToRetry, 'dead_letter_retry');
    } catch (error) {
      console.error('Failed to process dead letter queue:', error);
      // Put signals back in queue
      this.deadLetterQueue.push(...signalsToRetry);
    }
  }
  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    return count;
  }
}
