import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GuidelineAdapter } from './guideline-adapter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { InspectorConfig, SignalProcessor } from './types';
import { Signal } from '../shared/types';

/**
 * Extended InspectorConfig with additional properties for core functionality
 */
interface ExtendedInspectorConfig extends InspectorConfig {
  maxWorkers: number;
  workerTimeout: number;
}

/**
 * Parallel Inspector System
 * Processes scanner events with parallel workers using guideline adapters
 */
export interface InspectorWorkerData {
  signal: Signal;
  guideline: string;
  context: Record<string, unknown>;
  config: InspectorConfig;
}

export interface InspectorResult {
  signalId: string;
  type: string;
  priority: number;
  processedAt: Date;
  data: Record<string, unknown>;
  guideline: string;
  contextSize: number;
  processingTime: number;
  workerId: number;
  success: boolean;
  error?: string;
}

/**
 * Inspector Core - Parallel signal processing with guideline adapters
 */
export class InspectorCore extends EventEmitter {
  private config: ExtendedInspectorConfig;
  private workers: Worker[] = [];
  private guidelineAdapter: GuidelineAdapter;
  private isRunning = false;
  private processingQueue: SignalProcessor[] = [];
  private results: InspectorResult[] = [];
  private workerIdCounter = 0;

  // Performance metrics
  private metrics = {
    totalProcessed: 0,
    avgProcessingTime: 0,
    maxProcessingTime: 0,
    activeWorkers: 0,
    queueSize: 0,
    errors: 0,
    throughput: 0
  };

  constructor(config: ExtendedInspectorConfig) {
    super();
    this.config = config;
    this.guidelineAdapter = new GuidelineAdapter();
  }

  /**
   * Start the inspector service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Inspector is already running');
    }

    console.log(`🔍 Starting Inspector with ${this.config.maxWorkers} workers...`);

    try {
      // Load guideline adapters
      await this.guidelineAdapter.loadGuidelines();

      // Initialize worker pool
      await this.initializeWorkerPool();

      this.isRunning = true;
      this.metrics.activeWorkers = this.workers.length;

      console.log(`✅ Inspector started with ${this.workers.length} workers`);
      this.emit('inspector:started', { workerCount: this.workers.length });

    } catch (error) {
      console.error('❌ Failed to start inspector:', error);
      this.emit('inspector:error', error);
      throw error;
    }
  }

  /**
   * Stop the inspector service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Inspector...');

    try {
      // Terminate all workers
      for (const worker of this.workers) {
        await worker.terminate();
      }

      this.workers = [];
      this.isRunning = false;
      this.metrics.activeWorkers = 0;

      console.log('✅ Inspector stopped');
      this.emit('inspector:stopped');

    } catch (error) {
      console.error('❌ Error stopping inspector:', error);
      this.emit('inspector:error', error);
    }
  }

  /**
   * Process a signal through the inspector pipeline
   */
  async processSignal(signal: Signal): Promise<InspectorResult | null> {
    if (!this.isRunning) {
      throw new Error('Inspector is not running');
    }

    const startTime = Date.now();

    try {
      // Get appropriate guideline for this signal
      const guideline = await this.guidelineAdapter.getGuidelineForSignal(signal);

      if (!guideline) {
        console.warn(`⚠️  No guideline found for signal type: ${signal.type}`);
        return null;
      }

      // Create signal processor
      const processor: SignalProcessor = {
        signal,
        guideline,
        context: this.buildContext(signal),
        priority: signal.priority || 5,
        createdAt: new Date()
      };

      // Process with available worker
      const result = await this.processWithWorker(processor);

      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, true);

      if (result) {
        result.processingTime = processingTime;
        this.results.push(result);
        this.emit('inspector:result', result);
      }

      return result;

    } catch (error) {
      this.updateMetrics(Date.now() - startTime, false);
      console.error(`❌ Error processing signal ${signal.type}:`, error);
      this.emit('inspector:error', error);

      return {
        signalId: signal.id,
        type: signal.type,
        priority: signal.priority || 5,
        processedAt: new Date(),
        data: {} as Record<string, unknown>,
        guideline: '',
        contextSize: 0,
        processingTime: Date.now() - startTime,
        workerId: -1,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process multiple signals in batch
   */
  async processBatch(signals: Signal[]): Promise<InspectorResult[]> {
    const startTime = Date.now();
    const results: InspectorResult[] = [];

    try {
      // Process signals in parallel up to worker limit
      const batchSize = Math.min(signals.length, this.workers.length);
      const batches: Signal[][] = [];

      for (let i = 0; i < signals.length; i += batchSize) {
        batches.push(signals.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(signal => this.processSignal(signal));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(r => r !== null));
      }

      const totalTime = Date.now() - startTime;
      console.log(`📊 Processed ${signals.length} signals in ${totalTime}ms, got ${results.length} results`);

      return results;

    } catch (error) {
      console.error(`❌ Error processing signal batch:`, error);
      this.emit('inspector:error', error);
      return [];
    }
  }

  /**
   * Get inspector status and metrics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      metrics: this.metrics,
      queueSize: this.processingQueue.length,
      workerCount: this.workers.length,
      activeWorkers: this.metrics.activeWorkers,
      guidelineCount: this.guidelineAdapter.getGuidelineCount(),
      recentResults: this.results.slice(-10),
      throughput: this.calculateThroughput()
    };
  }

  /**
   * Get recent processing results
   */
  getRecentResults(limit: number = 50): InspectorResult[] {
    return this.results.slice(-limit);
  }

  /**
   * Get results by signal type
   */
  getResultsByType(signalType: string): InspectorResult[] {
    return this.results.filter(result => result.type === signalType);
  }

  /**
   * Clear results history
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Initialize worker pool
   */
  private async initializeWorkerPool(): Promise<void> {
    const workerPromises = [];

    for (let i = 0; i < this.config.maxWorkers; i++) {
      const workerPromise = this.createWorker();
      workerPromises.push(workerPromise);
    }

    this.workers = await Promise.all(workerPromises);
  }

  /**
   * Create a single worker
   */
  private async createWorker(): Promise<Worker> {
    const workerId = this.workerIdCounter++;
    const workerData = { workerId, config: this.config };

    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'inspector-worker.js'), {
        workerData
      });

      worker.on('online', () => {
        console.log(`🔧 Inspector worker ${workerId} online`);
        resolve(worker);
      });

      worker.on('message', (data) => {
        this.handleWorkerMessage(workerId, data);
      });

      worker.on('error', (error) => {
        console.error(`❌ Inspector worker ${workerId} error:`, error);
        this.metrics.errors++;
        this.emit('inspector:worker-error', { workerId, error });
        reject(error);
      });

      worker.on('exit', (code) => {
        console.log(`🔧 Inspector worker ${workerId} exited with code ${code}`);
        this.metrics.activeWorkers = Math.max(0, this.metrics.activeWorkers - 1);
        this.emit('inspector:worker-exit', { workerId, code });
      });

      // Set timeout for worker startup
      setTimeout(() => {
        reject(new Error(`Worker ${workerId} startup timeout`));
      }, 10000);
    });
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(workerId: number, data: { type: string; payload: unknown }): void {
    try {
      switch (data.type) {
        case 'result':
          this.handleWorkerResult(workerId, data.payload);
          break;
        case 'error': {
          const errorPayload = data.payload as Error;
          this.handleWorkerError(workerId, errorPayload);
          break;
        }
        case 'status':
          // Worker status update
          break;
        case 'ready':
          // Worker is ready for work
          break;
        default:
          console.warn(`Unknown message type from worker ${workerId}:`, data.type);
      }
    } catch (error) {
      console.error(`Error handling worker ${workerId} message:`, error);
    }
  }

  /**
   * Handle successful worker result
   */
  private handleWorkerResult(workerId: number, result: unknown): void {
    const typedResult = result as InspectorResult;
    typedResult.workerId = workerId;
    this.results.push(typedResult);

    // Update metrics
    this.updateMetrics(typedResult.processingTime, true);

    // Emit result event
    this.emit('inspector:result', typedResult);

    // Return worker to pool
    this.returnWorkerToPool(workerId);
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerId: number, error: Error): void {
    this.metrics.errors++;
    this.emit('inspector:error', { workerId, error });
    this.returnWorkerToPool(workerId);
  }

  /**
   * Return worker to available pool
   */
  private returnWorkerToPool(_workerId: number): void {
    // In a real implementation, we would track which workers are busy
    // For now, we assume all workers are always available
  }

  /**
   * Process signal with available worker
   */
  private async processWithWorker(processor: SignalProcessor): Promise<InspectorResult> {
    // Get available worker (simplified - would use proper worker pool management)
    const worker = this.workers[0];

    if (!worker) {
      throw new Error('No workers available');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker processing timeout'));
      }, this.config.workerTimeout);

      const handleMessage = (data: { type: string; payload: unknown }) => {
        clearTimeout(timeout);
        worker.off('message', handleMessage);

        const payload = data.payload as InspectorResult;
        if (data.type === 'result' && payload.signalId === processor.signal.id) {
          resolve(payload);
        } else if (data.type === 'error') {
          const errorPayload = data.payload as { error: string };
          reject(new Error(errorPayload.error));
        }
      };

      worker.on('message', handleMessage);

      // Send processing request to worker
      worker.postMessage({
        type: 'process',
        payload: processor
      });
    });
  }

  /**
   * Build context for signal processing
   */
  private buildContext(signal: Signal): Record<string, unknown> {
    return {
      signalId: signal.id,
      signalType: signal.type,
      source: signal.source,
      timestamp: signal.timestamp,
      data: signal.data,
      // Add any additional context needed for processing
      scannerMetrics: this.getScannerMetrics(),
      inspectorMetrics: this.metrics
    };
  }

  /**
   * Get scanner metrics (would be injected from scanner)
   */
  private getScannerMetrics(): Record<string, unknown> {
    // This would be provided by the scanner via shared state
    return {};
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(processingTime: number, success: boolean): void {
    this.metrics.totalProcessed++;

    // Update average processing time
    this.metrics.avgProcessingTime =
      (this.metrics.avgProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) /
      this.metrics.totalProcessed;

    // Update max processing time
    this.metrics.maxProcessingTime = Math.max(this.metrics.maxProcessingTime, processingTime);

    // Update error count
    if (!success) {
      this.metrics.errors++;
    }

    // Calculate throughput (results per minute)
    this.metrics.throughput = this.calculateThroughput();
  }

  /**
   * Calculate processing throughput
   */
  private calculateThroughput(): number {
    // Simple throughput calculation (results per minute)
    // In a real implementation, this would be more sophisticated
    if (this.results.length === 0) return 0;

    const timeWindow = 60000; // 1 minute in milliseconds
    const now = Date.now();
    const recentResults = this.results.filter(r =>
      (now - r.processedAt.getTime()) < timeWindow
    );

    return recentResults.length;
  }

  
  /**
   * Get processing queue status
   */
  getQueueStatus(): {
    size: number;
    oldestSignal: Signal | null;
    newestSignal: Signal | null;
  } {
    return {
      size: this.processingQueue.length,
      oldestSignal: this.processingQueue.length > 0 && this.processingQueue[0]
        ? this.processingQueue[0].signal
        : null,
      newestSignal: this.processingQueue.length > 0 && this.processingQueue[this.processingQueue.length - 1]
        ? this.processingQueue[this.processingQueue.length - 1]!.signal
        : null
    };
  }
}