/**
 * ♫ Parallel Executor for @dcversus/prp Inspector
 *
 * Parallel execution framework for inspector workers with configurable concurrency.
 */
import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


import {
  createLayerLogger,
  HashUtils,
  type WorkerPoolConfig,
  type WorkerPoolStatus,
} from '../shared';

import type {
  SignalProcessor,
  DetailedInspectorResult,
  InspectorError,
  InspectorMetrics,
  SignalClassification,
  PreparedContext,
  InspectorPayload,
} from './types';
import type { LLMExecutionEngine } from './llm-execution-engine';
import type { Signal } from '../shared/types';

const logger = createLayerLogger('inspector');
// Get current file path for worker
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Task data interface
 */
export interface TaskData {
  signal: Signal;
  processor: SignalProcessor;
  priority: number;
  timestamp: Date;
}
/**
 * Re-export types from inspector types for worker use
 */
export type { DetailedInspectorResult, InspectorPayload } from './types';
// Worker interfaces now imported from shared tools/worker-pool.ts
/**
 * Worker task message interface specific to inspector
 */
export interface WorkerTaskMessage {
  type: 'task:execute';
  taskId: string;
  data: TaskData;
  workerId?: number;
  timestamp: Date;
}
/**
 * Worker message union type for all worker communications
 */
export type WorkerMessage =
  | WorkerTaskMessage
  | { type: 'worker:ready'; workerId: number; timestamp: Date }
  | {
      type: 'worker:error';
      workerId: number;
      error: { code: string; message: string; stack?: string };
      timestamp: Date;
    }
  | { type: 'worker:heartbeat'; workerId: number; timestamp: Date }
  | { type: 'worker:shutdown'; workerId: number; timestamp: Date }
  | { type: 'task:start'; taskId: string; workerId: number; timestamp: Date }
  | { type: 'task:progress'; taskId: string; progress: number; workerId: number; timestamp: Date }
  | { type: 'task:complete'; taskId: string; data: unknown; workerId: number; timestamp: Date }
  | { type: 'task:error'; taskId: string; error: Error; workerId: number; timestamp: Date };
/**
 * Execution task specific to inspector
 */
export interface ExecutionTask {
  id: string;
  signal: Signal;
  processor: SignalProcessor;
  priority: number;
  createdAt: Date;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  timeout: number;
  dependencies?: string[]; // Task IDs this task depends on
}
/**
 * Parallel execution configuration
 */
export interface ParallelExecutionConfig extends Omit<WorkerPoolConfig, 'maxMemory'> {
  // Inspector-specific configuration can be added here
  inspectorSpecific?: boolean;
}
/**
 * Parallel Executor - Manages parallel signal processing with worker pool
 */
export class ParallelExecutor extends EventEmitter {
  private readonly config: ParallelExecutionConfig;
  private readonly workers = new Map<number, InspectorWorkerInfo>();
  private readonly taskQueue: ExecutionTask[] = [];
  private readonly processingTasks = new Map<string, ExecutionTask>();
  private readonly completedTasks = new Map<string, DetailedInspectorResult>();
  private readonly failedTasks = new Map<string, InspectorError>();
  private readonly llmEngine: LLMExecutionEngine;
  private isRunning = false;
  private shutdownRequested = false;
  // Performance metrics
  private readonly metrics: InspectorMetrics = {
    startTime: new Date(),
    totalProcessed: 0,
    successfulClassifications: 0,
    failedClassifications: 0,
    averageProcessingTime: 0,
    averageTokenUsage: {
      input: 0,
      output: 0,
      total: 0,
    },
    successRate: 0,
    tokenEfficiency: 0,
    queueLength: 0,
    processingRate: 0,
    errorRate: 0,
    byCategory: {},
    byUrgency: {},
    performance: {
      fastestClassification: 0,
      slowestClassification: 0,
      peakThroughput: 0,
      memoryUsage: 0,
    },
  };
  constructor(config: ParallelExecutionConfig, llmEngine: LLMExecutionEngine) {
    super();
    this.config = {
      maxWorkers: config.maxWorkers ?? 2,
      maxConcurrentPerWorker: config.maxConcurrentPerWorker ?? 3,
      taskTimeout: config.taskTimeout ?? 60000, // 1 minute
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 5000, // 5 seconds
      enableLoadBalancing: config.enableLoadBalancing ?? true,
      enableHealthChecks: config.enableHealthChecks ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30 seconds
      gracefulShutdownTimeout: config.gracefulShutdownTimeout ?? 30000, // 30 seconds
    };
    this.llmEngine = llmEngine;
    // Setup event handlers
    this.setupEventHandlers();
  }
  /**
   * Start the parallel executor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Parallel executor is already running');
    }
    logger.info('ParallelExecutor', `Starting with ${this.config.maxWorkers} workers`);
    try {
      // Initialize worker pool
      await this.initializeWorkerPool();
      this.isRunning = true;
      this.shutdownRequested = false;
      // Start task processing loop
      this.startTaskProcessingLoop();
      // Start health checks if enabled
      if (this.config.enableHealthChecks) {
        this.startHealthChecks();
      }
      logger.info('ParallelExecutor', `Started successfully with ${this.workers.size} workers`);
      this.emit('executor:started', { workerCount: this.workers.size });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'ParallelExecutor',
        'Failed to start',
        error instanceof Error ? error : new Error(errorMessage),
      );
      throw error;
    }
  }
  /**
   * Stop the parallel executor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    logger.info('ParallelExecutor', 'Stopping parallel executor');
    this.shutdownRequested = true;
    try {
      // Wait for current tasks to complete or timeout
      const shutdownPromise = new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.processingTasks.size === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
        // Force shutdown after timeout
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, this.config.gracefulShutdownTimeout);
      });
      await shutdownPromise;
      // Terminate all workers
      const terminationPromises = Array.from(this.workers.values()).map((worker) =>
        this.terminateWorker(worker),
      );
      await Promise.allSettled(terminationPromises);
      this.workers.clear();
      this.isRunning = false;
      logger.info('ParallelExecutor', 'Stopped successfully');
      this.emit('executor:stopped');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'ParallelExecutor',
        'Error during shutdown',
        error instanceof Error ? error : new Error(errorMessage),
      );
    }
  }
  /**
   * Process a single signal
   */
  async processSignal(
    signal: Signal,
    processor: SignalProcessor,
  ): Promise<DetailedInspectorResult> {
    return new Promise((resolve, reject) => {
      const taskId = HashUtils.generateId();
      const task: ExecutionTask = {
        id: taskId,
        signal,
        processor,
        priority: signal.priority,
        createdAt: new Date(),
        scheduledAt: new Date(),
        attempts: 0,
        maxAttempts: this.config.retryAttempts ?? 3,
        timeout: this.config.taskTimeout ?? 30000,
      };
      // Set up result handlers
      const handleResult = (result: DetailedInspectorResult) => {
        if (result.signal.id === signal.id) {
          this.off('task:completed', handleResult);
          this.off('task:failed', handleError);
          resolve(result);
        }
      };
      const handleError = (error: InspectorError) => {
        if (error.signal.id === signal.id) {
          this.off('task:completed', handleResult);
          this.off('task:failed', handleError);
          reject(new Error(error.error.message));
        }
      };
      this.on('task:completed', handleResult);
      this.on('task:failed', handleError);
      // Add task to queue
      this.addTask(task);
      // Set timeout for the entire operation
      setTimeout(
        () => {
          this.off('task:completed', handleResult);
          this.off('task:failed', handleError);
          reject(new Error(`Signal processing timeout: ${signal.type}`));
        },
        (this.config.taskTimeout ?? 30000) * 2,
      );
    });
  }
  /**
   * Process multiple signals in batch
   */
  async processBatch(
    signals: Signal[],
    processors: SignalProcessor[],
  ): Promise<DetailedInspectorResult[]> {
    if (signals.length !== processors.length) {
      throw new Error('Signals and processors must have the same length');
    }
    const tasks = signals
      .map((signal, index) => {
        const processor = processors[index];
        if (!processor) {
          throw new Error(`No processor found for signal at index ${index}`);
        }
        return {
          id: HashUtils.generateId(),
          signal,
          processor,
          priority: signal.priority,
          createdAt: new Date(),
          scheduledAt: new Date(),
          attempts: 0,
          maxAttempts: this.config.retryAttempts ?? 3,
          timeout: this.config.taskTimeout ?? 30000,
        };
      })
      .filter((task) => task !== null) as ExecutionTask[];
    // Add all tasks to queue
    tasks.forEach((task) => this.addTask(task));
    // Wait for all tasks to complete
    const results: DetailedInspectorResult[] = [];
    const errors: InspectorError[] = [];
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const completed = tasks.filter(
          (task) => this.completedTasks.has(task.id) || this.failedTasks.has(task.id),
        );
        if (completed.length === tasks.length) {
          // Collect results and errors
          tasks.forEach((task) => {
            const result = this.completedTasks.get(task.id);
            const error = this.failedTasks.get(task.id);
            if (result) {
              results.push(result);
            } else if (error) {
              errors.push(error);
            }
          });
          // Clean up task data
          tasks.forEach((task) => {
            this.completedTasks.delete(task.id);
            this.failedTasks.delete(task.id);
          });
          if (errors.length > 0 && results.length === 0) {
            reject(new Error(`All ${errors.length} tasks failed`));
          } else {
            resolve(results);
          }
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      checkCompletion();
    });
  }
  /**
   * Get executor status
   */
  getStatus(): WorkerPoolStatus {
    const activeWorkers = Array.from(this.workers.values()).filter(
      (w) => w.status === 'busy',
    ).length;
    const busyWorkers = Array.from(this.workers.values()).filter((w) => w.status === 'busy').length;
    const idleWorkers = Array.from(this.workers.values()).filter((w) => w.status === 'idle').length;
    const failedWorkers = Array.from(this.workers.values()).filter(
      (w) => w.status === 'failed',
    ).length;
    return {
      totalWorkers: this.workers.size,
      activeWorkers,
      idleWorkers,
      busyWorkers,
      failedWorkers,
      queueSize: this.taskQueue.length,
      processingTasks: this.processingTasks.size,
      completedTasks: this.completedTasks.size,
      averageResponseTime: this.metrics.averageProcessingTime,
      throughput: this.metrics.processingRate,
      workerDetails: Array.from(this.workers.values()).map((worker) => ({
        id: worker.id,
        status: worker.status,
        tasksProcessed: worker.tasksProcessed,
        currentTask: worker.currentTask ?? null,
        lastHeartbeat: new Date(),
      })),
    };
  }
  /**
   * Get metrics
   */
  getMetrics(): InspectorMetrics {
    // Update queue length
    this.metrics.queueLength = this.taskQueue.length;
    // Calculate processing rate (tasks per minute)
    const timeRunning = (Date.now() - this.metrics.startTime.getTime()) / 1000 / 60; // minutes
    this.metrics.processingRate = this.metrics.totalProcessed / timeRunning;
    // Calculate error rate
    this.metrics.errorRate =
      this.metrics.totalProcessed > 0
        ? (this.metrics.failedClassifications / this.metrics.totalProcessed) * 100
        : 0;
    return { ...this.metrics };
  }
  /**
   * Add task to queue
   */
  private addTask(task: ExecutionTask): void {
    // Insert task based on priority (higher priority first)
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queueTask = this.taskQueue[i];
      if (
        queueTask?.priority !== undefined &&
        task.priority !== undefined &&
        queueTask.priority < task.priority
      ) {
        insertIndex = i;
        break;
      }
    }
    this.taskQueue.splice(insertIndex, 0, task);
    logger.debug('ParallelExecutor', `Task added to queue: ${task.signal.type}`, {
      taskId: task.id,
      queueSize: this.taskQueue.length,
      priority: task.priority,
    });
  }
  /**
   * Initialize worker pool
   */
  private async initializeWorkerPool(): Promise<void> {
    const workerPromises = [];
    for (let i = 0; i < (this.config.maxWorkers ?? 4); i++) {
      workerPromises.push(this.createWorker(i));
    }
    const workers = await Promise.allSettled(workerPromises);
    // Filter out failed workers
    workers.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(
          'ParallelExecutor',
          `Failed to create worker ${index}`,
          result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        );
      }
    });
    if (this.workers.size === 0) {
      throw new Error('Failed to create any workers');
    }
  }
  /**
   * Create a single worker
   */
  private async createWorker(workerId: number): Promise<InspectorWorkerInfo> {
    return new Promise((resolve, reject) => {
      const workerPath = join(__dirname, 'parallel-executor-worker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          workerId,
          config: this.config,
        },
      });
      const workerInfo: InspectorWorkerInfo = {
        id: workerId,
        worker,
        status: 'initializing',
        currentTask: null,
        tasksProcessed: 0,
        lastHeartbeat: new Date(),
        createdAt: new Date(),
        startTime: null,
      };
      const messageHandler = (data: WorkerMessage) => {
        this.handleWorkerMessage(workerId, data);
      };
      const errorHandler = (error: Error) => {
        logger.error('ParallelExecutor', `Worker ${workerId} error`, error);
        workerInfo.status = 'failed';
        this.emit('worker:error', { workerId, error });
        reject(error);
      };
      const exitHandler = (code: number) => {
        logger.warn('ParallelExecutor', `Worker ${workerId} exited with code ${code}`);
        workerInfo.status = 'exited';
        worker.off('message', messageHandler);
        worker.off('error', errorHandler);
        worker.off('exit', exitHandler);
      };
      worker.on('message', messageHandler);
      worker.on('error', errorHandler);
      worker.on('exit', exitHandler);
      // Set timeout for worker initialization
      const timeout = setTimeout(() => {
        worker.off('message', messageHandler);
        worker.off('error', errorHandler);
        worker.off('exit', exitHandler);
        worker.terminate();
        reject(new Error(`Worker ${workerId} initialization timeout`));
      }, 10000);
      // Wait for worker to be ready
      const readyHandler = (data: WorkerMessage) => {
        if (data.type === 'worker:ready' && data.workerId === workerId) {
          clearTimeout(timeout);
          workerInfo.status = 'idle';
          workerInfo.startTime = new Date();
          this.workers.set(workerId, workerInfo);
          worker.off('message', readyHandler);
          resolve(workerInfo);
        }
      };
      worker.on('message', readyHandler);
    });
  }
  /**
   * Handle worker message
   */
  private handleWorkerMessage(workerId: number, message: WorkerMessage): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }
    switch (message.type) {
      case 'worker:ready':
        worker.status = 'idle';
        break;
      case 'worker:heartbeat':
        worker.lastHeartbeat = new Date();
        break;
      case 'task:start':
        if (message.taskId) {
          this.handleTaskStart(workerId, message.taskId);
        }
        break;
      case 'task:progress':
        // Handle task progress updates
        break;
      case 'task:complete':
        if (message.taskId && message.data) {
          this.handleTaskComplete(
            workerId,
            message.taskId,
            message.data as DetailedInspectorResult,
          );
        }
        break;
      case 'task:error':
        if (message.taskId && message.error) {
          this.handleTaskError(workerId, message.taskId, message.error);
        }
        break;
      case 'worker:error':
        worker.status = 'failed';
        this.emit('worker:error', { workerId, error: message.error });
        break;
      case 'worker:shutdown':
        worker.status = 'shutdown';
        break;
    }
  }
  /**
   * Handle task start
   */
  private handleTaskStart(workerId: number, taskId: string): void {
    const worker = this.workers.get(workerId);
    const task = this.processingTasks.get(taskId);
    if (worker && task) {
      worker.status = 'busy';
      worker.currentTask = taskId;
      logger.debug('ParallelExecutor', `Task started: ${taskId} on worker ${workerId}`);
    }
  }
  /**
   * Handle task completion
   */
  private handleTaskComplete(
    workerId: number,
    taskId: string,
    result: DetailedInspectorResult,
  ): void {
    const worker = this.workers.get(workerId);
    const task = this.processingTasks.get(taskId);
    if (worker && task) {
      // Update worker status
      worker.status = 'idle';
      worker.currentTask = null;
      worker.tasksProcessed++;
      // Move task from processing to completed
      this.processingTasks.delete(taskId);
      this.completedTasks.set(taskId, result);
      // Update metrics
      this.updateMetrics(result, true);
      logger.debug('ParallelExecutor', `Task completed: ${taskId}`, {
        signalType: result.signal.type,
        processingTime: result.processingTime,
        workerId,
      });
      this.emit('task:completed', result);
    }
  }
  /**
   * Handle task error
   */
  private handleTaskError(
    workerId: number,
    taskId: string,
    error: Error | Record<string, unknown>,
  ): void {
    const worker = this.workers.get(workerId);
    const task = this.processingTasks.get(taskId);
    if (worker && task) {
      // Update worker status
      worker.status = 'idle';
      worker.currentTask = null;
      // Create error object
      const inspectorError: InspectorError = {
        id: taskId,
        signal: task.signal,
        error: {
          code: ((error as Record<string, unknown>).code as string) || 'WORKER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown worker error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        processingTime: Date.now() - task.scheduledAt.getTime(),
        timestamp: new Date(),
        retryCount: task.attempts,
        recoverable: task.attempts < task.maxAttempts,
      };
      // Retry logic
      if (task.attempts < task.maxAttempts) {
        task.attempts++;
        logger.info('ParallelExecutor', `Retrying task: ${taskId}`, {
          attempt: task.attempts,
          maxAttempts: task.maxAttempts,
        });
        // Add delay before retry
        setTimeout(() => {
          this.addTask(task);
        }, this.config.retryDelay);
      } else {
        // Max retries exceeded
        this.processingTasks.delete(taskId);
        this.failedTasks.set(taskId, inspectorError);
        this.updateMetrics(
          {
            id: task.signal.id,
            signal: task.signal,
            classification: {} as SignalClassification,
            context: {} as PreparedContext,
            payload: {} as InspectorPayload,
            recommendations: [],
            tokenUsage: { input: 0, output: 0, total: 0, cost: 0 },
            confidence: 0,
            processingTime: inspectorError.processingTime,
            model: '',
            timestamp: new Date(),
          },
          false,
        );
      }
      logger.warn('ParallelExecutor', `Task error: ${taskId}`, {
        error: error.message,
        workerId,
        attempt: task.attempts,
      });
      this.emit('task:failed', inspectorError);
    }
  }
  /**
   * Start task processing loop
   */
  private startTaskProcessingLoop(): void {
    const processLoop = () => {
      if (this.shutdownRequested) {
        return;
      }
      // Get available workers
      const availableWorkers = Array.from(this.workers.values()).filter((w) => w.status === 'idle');
      // Process tasks if we have available workers and tasks in queue
      while (availableWorkers.length > 0 && this.taskQueue.length > 0) {
        const worker = availableWorkers.shift();
        const task = this.taskQueue.shift();
        // Assign task to worker if both exist
        if (worker && task) {
          this.assignTaskToWorker(worker, task);
        }
      }
      // Schedule next iteration
      setImmediate(processLoop);
    };
    processLoop();
  }
  /**
   * Assign task to worker
   */
  private assignTaskToWorker(worker: InspectorWorkerInfo, task: ExecutionTask): void {
    // Move task from queue to processing
    this.processingTasks.set(task.id, task);
    // Send task to worker
    worker.worker.postMessage({
      type: 'task:execute',
      taskId: task.id,
      data: {
        signal: task.signal,
        processor: task.processor,
        llmConfig: this.llmEngine.getTokenLimits(),
      },
    });
    logger.debug('ParallelExecutor', `Task assigned to worker: ${task.id}`, {
      workerId: worker.id,
      signalType: task.signal.type,
    });
  }
  /**
   * Terminate worker
   */
  private async terminateWorker(worker: InspectorWorkerInfo): Promise<void> {
    try {
      // Send shutdown message
      worker.worker.postMessage({
        type: 'worker:shutdown',
        workerId: worker.id,
        timestamp: new Date(),
      });
      // Wait for graceful shutdown or force terminate
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          worker.worker.terminate();
          resolve();
        }, 5000);
        worker.worker.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.warn('ParallelExecutor', `Error terminating worker ${worker.id}`, {
        message: errorObj.message,
        stack: errorObj.stack,
        name: errorObj.name,
      });
    }
  }
  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }
  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const now = new Date();
    const staleThreshold = (this.config.healthCheckInterval ?? 5000) * 2;
    for (const [workerId, worker] of Array.from(this.workers.entries())) {
      const timeSinceHeartbeat = now.getTime() - worker.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > staleThreshold) {
        logger.warn('ParallelExecutor', `Worker ${workerId} is stale`, {
          timeSinceHeartbeat,
          lastHeartbeat: worker.lastHeartbeat,
        });
        // Mark worker as failed and create replacement
        worker.status = 'failed';
        this.emit('worker:failed', { workerId, reason: 'stale' });
        // Create replacement worker
        this.createWorker(workerId).catch((error) => {
          logger.error(
            'ParallelExecutor',
            `Failed to create replacement worker ${workerId}`,
            error instanceof Error ? error : new Error(String(error)),
          );
        });
      } else {
        // Send heartbeat request
        worker.worker.postMessage({
          type: 'worker:heartbeat',
          workerId,
          timestamp: now,
        });
      }
    }
  }
  /**
   * Update metrics
   */
  private updateMetrics(result: DetailedInspectorResult, success: boolean): void {
    this.metrics.totalProcessed++;
    if (success) {
      this.metrics.successfulClassifications++;
    } else {
      this.metrics.failedClassifications++;
    }
    // Update average processing time
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) +
        result.processingTime) /
      this.metrics.totalProcessed;
    // Update success rate
    this.metrics.successRate =
      (this.metrics.successfulClassifications / this.metrics.totalProcessed) * 100;
    // Update performance metrics
    if (result.processingTime > this.metrics.performance.slowestClassification) {
      this.metrics.performance.slowestClassification = result.processingTime;
    }
    if (
      this.metrics.performance.fastestClassification === 0 ||
      result.processingTime < this.metrics.performance.fastestClassification
    ) {
      this.metrics.performance.fastestClassification = result.processingTime;
    }
    // Calculate peak throughput
    const currentThroughput =
      this.metrics.totalProcessed / ((Date.now() - this.metrics.startTime.getTime()) / 1000 / 60);
    if (currentThroughput > this.metrics.performance.peakThroughput) {
      this.metrics.performance.peakThroughput = currentThroughput;
    }
  }
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle cleanup on process exit
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await this.stop();
      process.exit(0);
    });
  }
}
/**
 * Inspector worker information interface (extends shared WorkerInfo)
 */
interface InspectorWorkerInfo {
  id: number;
  worker: Worker;
  status: 'initializing' | 'idle' | 'busy' | 'failed' | 'exited' | 'shutdown';
  currentTask: string | null;
  tasksProcessed: number;
  lastHeartbeat: Date;
  createdAt: Date;
  startTime: Date | null;
}
