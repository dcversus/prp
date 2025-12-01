/**
 * ♫ Unified Signal Processing Pipeline for @dcversus/prp
 *
 * This is the main orchestrator that connects:
 * Scanner → Inspector → Orchestrator
 *
 * Features:
 * - FIFO queue from scanner to inspector
 * - Priority-based processing from inspector to orchestrator
 * - Proper signal flow and state management
 * - Token accounting and cost tracking
 * - Error handling and retry logic
 */

import { EventEmitter } from 'events';

import { createLayerLogger, HashUtils } from './index';

import type { Signal , TokenUsage } from './types/common';
import type { EnhancedSignal, SignalStatus, SignalBatch, InspectorResult, OrchestratorAction } from './types/signals';

const logger = createLayerLogger('signal-pipeline');

// Pipeline configuration
export interface PipelineConfig {
  // Scanner settings
  scanner: {
    enabled: boolean;
    debounceTime: number;
    batchSize: number;
    cacheSize: number;
    cacheTTL: number;
  };
  // Inspector settings
  inspector: {
    enabled: boolean;
    concurrency: number;
    timeout: number;
    tokenCap: number; // 1M tokens as per PRP spec
  };
  // Orchestrator settings
  orchestrator: {
    enabled: boolean;
    tokenCap: number; // 200K tokens as per PRP spec
    maxConcurrentSignals: number;
  };
  // Common settings
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
  // Dead letter queue
  deadLetterQueue: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
}

// Pipeline metrics
export interface PipelineMetrics {
  // Overall metrics
  totalSignalsProcessed: number;
  averageProcessingTime: number;
  successRate: number;

  // Scanner metrics
  scanner: {
    signalsDetected: number;
    detectionRate: number; // signals per second
    averageDetectionTime: number;
  };

  // Inspector metrics
  inspector: {
    signalsAnalyzed: number;
    analysisRate: number;
    averageAnalysisTime: number;
    tokensUsed: number;
    costIncurred: number;
  };

  // Orchestrator metrics
  orchestrator: {
    signalsResolved: number;
    resolutionRate: number;
    averageResolutionTime: number;
    actionsTaken: number;
    tokensUsed: number;
    costIncurred: number;
  };

  // Error metrics
  errors: {
    totalErrors: number;
    errorRate: number;
    deadLetterCount: number;
    retryCount: number;
  };
}

/**
 * Main Signal Pipeline
 *
 * Flow:
 * 1. Scanner detects signals and emits them
 * 2. Pipeline receives signals and queues them FIFO for inspector
 * 3. Inspector processes signals in parallel (up to concurrency limit)
 * 4. Inspector sends classified signals to orchestrator queue
 * 5. Orchestrator processes high-priority signals first
 * 6. Actions are executed and signals are resolved
 */
export class UnifiedSignalPipeline extends EventEmitter {
  private readonly config: PipelineConfig;
  private isRunning = false;
  private startTime?: Date;

  // Queues
  private readonly inspectorQueue: EnhancedSignal[] = []; // FIFO
  private readonly orchestratorQueue: EnhancedSignal[] = []; // Priority-based
  private readonly deadLetterQueue: Array<{ signal: EnhancedSignal; error: Error; timestamp: Date }> = [];

  // Processing state
  private readonly activeInspectorSignals = new Map<string, EnhancedSignal>();
  private readonly activeOrchestratorSignals = new Map<string, EnhancedSignal>();

  // Metrics
  private readonly metrics: PipelineMetrics = {
    totalSignalsProcessed: 0,
    averageProcessingTime: 0,
    successRate: 0,
    scanner: {
      signalsDetected: 0,
      detectionRate: 0,
      averageDetectionTime: 0,
    },
    inspector: {
      signalsAnalyzed: 0,
      analysisRate: 0,
      averageAnalysisTime: 0,
      tokensUsed: 0,
      costIncurred: 0,
    },
    orchestrator: {
      signalsResolved: 0,
      resolutionRate: 0,
      averageResolutionTime: 0,
      actionsTaken: 0,
      tokensUsed: 0,
      costIncurred: 0,
    },
    errors: {
      totalErrors: 0,
      errorRate: 0,
      deadLetterCount: 0,
      retryCount: 0,
    },
  };

  // Timers
  private inspectorTimer?: NodeJS.Timeout;
  private orchestratorTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<PipelineConfig> = {}) {
    super();

    // Default configuration
    this.config = {
      scanner: {
        enabled: true,
        debounceTime: 50,
        batchSize: 10,
        cacheSize: 10000,
        cacheTTL: 60000,
        ...config.scanner,
      },
      inspector: {
        enabled: true,
        concurrency: 2,
        timeout: 30000,
        tokenCap: 1000000, // 1M tokens
        ...config.inspector,
      },
      orchestrator: {
        enabled: true,
        tokenCap: 200000, // 200K tokens
        maxConcurrentSignals: 1,
        ...config.orchestrator,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 30000,
        ...config.retryPolicy,
      },
      deadLetterQueue: {
        enabled: true,
        maxSize: 1000,
        ttl: 3600000, // 1 hour
        ...config.deadLetterQueue,
      },
      ...config,
    };
  }

  /**
   * Start the signal processing pipeline
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('UnifiedSignalPipeline', 'Pipeline is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();

    // Start processing loops
    this.startInspectorProcessing();
    this.startOrchestratorProcessing();
    this.startCleanupTimer();

    logger.info('UnifiedSignalPipeline', 'Signal pipeline started', {
      config: this.config,
    });

    this.emit('pipeline:started', { timestamp: this.startTime });
  }

  /**
   * Stop the signal processing pipeline
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear timers
    if (this.inspectorTimer) {
      clearInterval(this.inspectorTimer);
    }
    if (this.orchestratorTimer) {
      clearInterval(this.orchestratorTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Wait for active processing to complete
    const timeout = setTimeout(() => {
      logger.warn('UnifiedSignalPipeline', 'Shutdown timeout - forcing stop');
    }, 5000);

    await Promise.all([
      this.waitForInspectorCompletion(),
      this.waitForOrchestratorCompletion(),
    ]);

    clearTimeout(timeout);

    logger.info('UnifiedSignalPipeline', 'Signal pipeline stopped', {
      metrics: this.metrics,
      queueSizes: {
        inspector: this.inspectorQueue.length,
        orchestrator: this.orchestratorQueue.length,
        deadLetter: this.deadLetterQueue.length,
      },
    });

    this.emit('pipeline:stopped', { timestamp: new Date(), metrics: this.metrics });
  }

  /**
   * Process a signal from the scanner
   * This is the entry point for all detected signals
   */
  async processSignal(signal: Signal): Promise<void> {
    if (!this.isRunning) {
      logger.warn('UnifiedSignalPipeline', 'Pipeline not running - ignoring signal');
      return;
    }

    const startTime = Date.now();

    try {
      // Convert to enhanced signal
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

      // Update scanner metrics
      this.metrics.scanner.signalsDetected++;
      this.metrics.scanner.detectionRate = this.calculateRate(
        this.metrics.scanner.signalsDetected,
        this.startTime!,
      );

      // Add to inspector queue (FIFO)
      this.inspectorQueue.push(enhancedSignal);

      // Emit event
      this.emit('signal:detected', { signal: enhancedSignal });

      logger.debug('UnifiedSignalPipeline', 'Signal queued for inspection', {
        signalId: enhancedSignal.id,
        type: enhancedSignal.type,
        queueSize: this.inspectorQueue.length,
      });

    } catch (error) {
      this.handleError('processSignal', error as Error, { signal });
    } finally {
      this.updateProcessingTime(Date.now() - startTime);
    }
  }

  /**
   * Start the inspector processing loop
   */
  private startInspectorProcessing(): void {
    this.inspectorTimer = setInterval(async () => {
      if (!this.config.inspector.enabled || !this.isRunning) {
        return;
      }

      // Process signals up to concurrency limit
      while (
        this.activeInspectorSignals.size < this.config.inspector.concurrency &&
        this.inspectorQueue.length > 0
      ) {
        const signal = this.inspectorQueue.shift()!;
        this.processWithInspector(signal);
      }
    }, 100); // Check every 100ms
  }

  /**
   * Process a signal with the inspector
   */
  private async processWithInspector(signal: EnhancedSignal): Promise<void> {
    const startTime = Date.now();
    signal.status = SignalStatus.ANALYZING;
    this.activeInspectorSignals.set(signal.id, signal);

    try {
      logger.debug('UnifiedSignalPipeline', 'Processing signal with inspector', {
        signalId: signal.id,
        type: signal.type,
      });

      // Emit event for inspector to handle
      this.emit('inspector:process', { signal });

      // The actual inspector will emit back an 'inspector:result' event
      // This is handled in handleInspectorResult

    } catch (error) {
      this.handleInspectorError(signal, error as Error);
    } finally {
      const processingTime = Date.now() - startTime;
      this.metrics.inspector.averageAnalysisTime = this.updateAverage(
        this.metrics.inspector.averageAnalysisTime,
        this.metrics.inspector.signalsAnalyzed,
        processingTime,
      );
      this.activeInspectorSignals.delete(signal.id);
    }
  }

  /**
   * Handle inspector result
   */
  async handleInspectorResult(result: InspectorResult): Promise<void> {
    const {signalId} = result;

    // Update metrics
    this.metrics.inspector.signalsAnalyzed++;
    this.metrics.inspector.tokensUsed += result.processing.tokensUsed;
    this.metrics.inspector.costIncurred += result.processing.processingTime * 0.00001; // Estimate cost

    // Find the signal in active processing or queue
    let signal = this.activeInspectorSignals.get(signalId);
    if (!signal) {
      signal = this.inspectorQueue.find(s => s.id === signalId);
    }

    if (!signal) {
      logger.error('UnifiedSignalPipeline', 'Inspector result for unknown signal', {
        signalId,
        result,
      });
      return;
    }

    // Update signal with inspector data
    signal.status = SignalStatus.CLASSIFIED;
    signal.metadata = {
      ...signal.metadata,
      confidence: result.classification.confidence / 100,
      processedAt: new Date(),
    };

    // Add to orchestrator queue (priority-based)
    this.addToOrchestratorQueue(signal, result.classification.urgency);

    // Emit event
    this.emit('inspector:completed', { signal, result });

    logger.debug('UnifiedSignalPipeline', 'Signal classified', {
      signalId: signal.id,
      urgency: result.classification.urgency,
      orchestratorQueueSize: this.orchestratorQueue.length,
    });
  }

  /**
   * Add signal to orchestrator queue with priority
   */
  private addToOrchestratorQueue(signal: EnhancedSignal, urgency: number): void {
    signal.status = SignalStatus.QUEUED;

    // Insert based on priority (high urgency first)
    let insertIndex = this.orchestratorQueue.length;
    for (let i = 0; i < this.orchestratorQueue.length; i++) {
      if (urgency > this.orchestratorQueue[i]!.priority) {
        insertIndex = i;
        break;
      }
    }

    this.orchestratorQueue.splice(insertIndex, 0, signal);
  }

  /**
   * Start the orchestrator processing loop
   */
  private startOrchestratorProcessing(): void {
    this.orchestratorTimer = setInterval(async () => {
      if (!this.config.orchestrator.enabled || !this.isRunning) {
        return;
      }

      // Process highest priority signal
      if (
        this.activeOrchestratorSignals.size < this.config.orchestrator.maxConcurrentSignals &&
        this.orchestratorQueue.length > 0
      ) {
        const signal = this.orchestratorQueue.shift()!;
        this.processWithOrchestrator(signal);
      }
    }, 50); // Check every 50ms (faster for better responsiveness)
  }

  /**
   * Process a signal with the orchestrator
   */
  private async processWithOrchestrator(signal: EnhancedSignal): Promise<void> {
    const startTime = Date.now();
    signal.status = SignalStatus.PROCESSING;
    this.activeOrchestratorSignals.set(signal.id, signal);

    try {
      logger.debug('UnifiedSignalPipeline', 'Processing signal with orchestrator', {
        signalId: signal.id,
        type: signal.type,
        priority: signal.priority,
      });

      // Emit event for orchestrator to handle
      this.emit('orchestrator:process', { signal });

      // The actual orchestrator will emit back an 'orchestrator:action' event

    } catch (error) {
      this.handleOrchestratorError(signal, error as Error);
    }
  }

  /**
   * Handle orchestrator action
   */
  async handleOrchestratorAction(action: OrchestratorAction): Promise<void> {
    const {signalId} = action;

    // Update metrics
    this.metrics.orchestrator.actionsTaken++;

    // Find the signal
    const signal = this.activeOrchestratorSignals.get(signalId);
    if (!signal) {
      logger.error('UnifiedSignalPipeline', 'Orchestrator action for unknown signal', {
        signalId,
        action,
      });
      return;
    }

    // Execute the action
    this.emit('orchestrator:execute', { signal, action });

    // Mark signal as resolved when action completes
    signal.status = SignalStatus.RESOLVED;
    signal.resolved = true;
    signal.resolvedAt = new Date();
    signal.resolution = action.instruction.expectedOutcome;

    // Update metrics
    this.metrics.orchestrator.signalsResolved++;
    this.metrics.totalSignalsProcessed++;

    // Calculate success rate
    this.metrics.successRate =
      (this.metrics.totalSignalsProcessed - this.metrics.errors.totalErrors) /
      this.metrics.totalSignalsProcessed;

    // Emit completion event
    this.emit('signal:resolved', { signal, action });

    logger.info('UnifiedSignalPipeline', 'Signal resolved', {
      signalId: signal.id,
      type: signal.type,
      action: action.type,
      processingTime: Date.now() - signal.timestamp.getTime(),
    });

    // Clean up
    this.activeOrchestratorSignals.delete(signalId);
  }

  /**
   * Error handling methods
   */
  private handleInspectorError(signal: EnhancedSignal, error: Error): void {
    logger.error('UnifiedSignalPipeline', 'Inspector error', {
      signalId: signal.id,
      error: error.message,
    });

    this.metrics.errors.totalErrors++;

    // Add to dead letter queue if retries exhausted
    if (this.shouldRetry(signal)) {
      this.retryWithInspector(signal);
    } else {
      this.addToDeadLetterQueue(signal, error);
    }
  }

  private handleOrchestratorError(signal: EnhancedSignal, error: Error): void {
    logger.error('UnifiedSignalPipeline', 'Orchestrator error', {
      signalId: signal.id,
      error: error.message,
    });

    this.metrics.errors.totalErrors++;

    // Add to dead letter queue if retries exhausted
    if (this.shouldRetry(signal)) {
      this.retryWithOrchestrator(signal);
    } else {
      this.addToDeadLetterQueue(signal, error);
    }
  }

  private handleError(context: string, error: Error, data?: any): void {
    logger.error('UnifiedSignalPipeline', `Error in ${context}`, {
      error: error.message,
      stack: error.stack,
      data,
    });

    this.metrics.errors.totalErrors++;
    this.emit('pipeline:error', { context, error, data });
  }

  /**
   * Retry logic
   */
  private shouldRetry(signal: EnhancedSignal): boolean {
    const retryCount = (signal.metadata?.retryCount || 0) + 1;
    return retryCount <= this.config.retryPolicy.maxRetries;
  }

  private retryWithInspector(signal: EnhancedSignal): void {
    const retryCount = (signal.metadata?.retryCount || 0) + 1;
    signal.metadata = {
      ...signal.metadata,
      retryCount,
    };

    const delay = Math.min(
      this.config.retryPolicy.initialDelay *
      Math.pow(this.config.retryPolicy.backoffMultiplier, retryCount - 1),
      this.config.retryPolicy.maxDelay,
    );

    setTimeout(() => {
      this.inspectorQueue.push(signal);
      this.metrics.errors.retryCount++;
    }, delay);
  }

  private retryWithOrchestrator(signal: EnhancedSignal): void {
    const retryCount = (signal.metadata?.retryCount || 0) + 1;
    signal.metadata = {
      ...signal.metadata,
      retryCount,
    };

    const delay = Math.min(
      this.config.retryPolicy.initialDelay *
      Math.pow(this.config.retryPolicy.backoffMultiplier, retryCount - 1),
      this.config.retryPolicy.maxDelay,
    );

    setTimeout(() => {
      this.addToOrchestratorQueue(signal, signal.priority);
      this.metrics.errors.retryCount++;
    }, delay);
  }

  /**
   * Dead letter queue management
   */
  private addToDeadLetterQueue(signal: EnhancedSignal, error: Error): void {
    if (!this.config.deadLetterQueue.enabled) {
      return;
    }

    // Remove oldest if at capacity
    if (this.deadLetterQueue.length >= this.config.deadLetterQueue.maxSize) {
      this.deadLetterQueue.shift();
    }

    this.deadLetterQueue.push({
      signal,
      error,
      timestamp: new Date(),
    });

    this.metrics.errors.deadLetterCount++;
    signal.status = SignalStatus.EXPIRED;

    logger.warn('UnifiedSignalPipeline', 'Signal added to dead letter queue', {
      signalId: signal.id,
      error: error.message,
      queueSize: this.deadLetterQueue.length,
    });
  }

  /**
   * Cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      // Clean up expired signals from dead letter queue
      const now = Date.now();
      this.deadLetterQueue = this.deadLetterQueue.filter(
        item => now - item.timestamp.getTime() < this.config.deadLetterQueue.ttl
      );
    }, 60000); // Clean up every minute
  }

  /**
   * Wait for completion
   */
  private async waitForInspectorCompletion(): Promise<void> {
    while (this.activeInspectorSignals.size > 0 || this.inspectorQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async waitForOrchestratorCompletion(): Promise<void> {
    while (this.activeOrchestratorSignals.size > 0 || this.orchestratorQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Utility methods
   */
  private calculateRate(count: number, startTime: Date): number {
    const elapsed = (Date.now() - startTime.getTime()) / 1000; // seconds
    return elapsed > 0 ? count / elapsed : 0;
  }

  private updateAverage(current: number, count: number, value: number): number {
    return count === 0 ? value : (current * count + value) / (count + 1);
  }

  private updateProcessingTime(time: number): void {
    this.metrics.averageProcessingTime = this.updateAverage(
      this.metrics.averageProcessingTime,
      this.metrics.totalSignalsProcessed,
      time,
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    inspectorQueue: number;
    orchestratorQueue: number;
    deadLetterQueue: number;
    activeInspector: number;
    activeOrchestrator: number;
  } {
    return {
      inspectorQueue: this.inspectorQueue.length,
      orchestratorQueue: this.orchestratorQueue.length,
      deadLetterQueue: this.deadLetterQueue.length,
      activeInspector: this.activeInspectorSignals.size,
      activeOrchestrator: this.activeOrchestratorSignals.size,
    };
  }

  /**
   * Get dead letter queue contents
   */
  getDeadLetterQueue(): Array<{ signal: EnhancedSignal; error: Error; timestamp: Date }> {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue.length = 0;
    return count;
  }
}

// Export singleton instance
export const signalPipeline = new UnifiedSignalPipeline();