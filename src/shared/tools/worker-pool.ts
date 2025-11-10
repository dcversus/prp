/**
 * ♫ Worker Pool Management for @dcversus/prp
 *
 * Abstract worker pool implementation with task queue management and load balancing.
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';

export interface TaskData {
  id: string;
  type: string;
  data: unknown;
  priority: number;
  createdAt: Date;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  timeout: number;
  dependencies?: string[];
}

export interface WorkerInfo {
  id: number;
  worker: Worker;
  status: 'initializing' | 'idle' | 'busy' | 'failed' | 'exited' | 'shutdown';
  currentTask: string | null;
  tasksProcessed: number;
  lastHeartbeat: Date;
  createdAt: Date;
  startTime: Date | null;
  errorCount: number;
}

export interface WorkerConfig {
  id: number;
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  heartbeatInterval: number;
  maxIdleTime: number;
}

export interface WorkerPoolConfig {
  maxWorkers?: number;
  maxConcurrentPerWorker?: number;
  taskTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableLoadBalancing?: boolean;
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
  gracefulShutdownTimeout?: number;
  maxIdleTime?: number;
}

export interface WorkerPoolStatus {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  failedWorkers: number;
  queueSize: number;
  processingTasks: number;
  completedTasks: number;
  averageResponseTime: number;
  throughput: number;
  workerDetails: Array<{
    id: number;
    status: string;
    tasksProcessed: number;
    currentTask: string | null;
    lastHeartbeat: Date;
  }>;
}

export type WorkerMessageType =
  | 'task:start'
  | 'task:execute'
  | 'task:progress'
  | 'task:complete'
  | 'task:error'
  | 'worker:ready'
  | 'worker:heartbeat'
  | 'worker:error'
  | 'worker:shutdown';

export interface WorkerMessage {
  type: WorkerMessageType;
  taskId?: string;
  workerId?: number;
  data?: TaskData | unknown;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  timestamp: Date;
}

/**
 * Abstract Worker Pool Implementation
 */
export abstract class WorkerPool extends EventEmitter {
  protected config: Required<WorkerPoolConfig>;
  protected workers: Map<number, WorkerInfo> = new Map();
  protected taskQueue: TaskData[] = [];
  protected processingTasks: Map<string, TaskData> = new Map();
  protected completedTasks: Map<string, unknown> = new Map();
  protected failedTasks: Map<string, Error> = new Map();
  protected isRunning = false;
  protected shutdownRequested = false;
  protected workerIdCounter = 0;

  constructor(config: WorkerPoolConfig = {}) {
    super();

    this.config = {
      maxWorkers: config.maxWorkers ?? 2,
      maxConcurrentPerWorker: config.maxConcurrentPerWorker ?? 3,
      taskTimeout: config.taskTimeout ?? 60000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 5000,
      enableLoadBalancing: config.enableLoadBalancing ?? true,
      enableHealthChecks: config.enableHealthChecks ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      gracefulShutdownTimeout: config.gracefulShutdownTimeout ?? 30000,
      maxIdleTime: config.maxIdleTime ?? 300000 // 5 minutes
    };

    this.setupEventHandlers();
  }

  /**
   * Start the worker pool
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Worker pool is already running');
    }

    this.isRunning = true;
    this.shutdownRequested = false;

    try {
      // Initialize worker pool
      await this.initializeWorkerPool();

      // Start task processing loop
      this.startTaskProcessingLoop();

      // Start health checks if enabled
      if (this.config.enableHealthChecks) {
        this.startHealthChecks();
      }

      this.emit('pool:started', { workerCount: this.workers.size });

    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the worker pool
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.shutdownRequested = true;

    try {
      // Wait for current tasks to complete or timeout
      await this.waitForShutdown();

      // Terminate all workers
      await this.terminateAllWorkers();

      this.workers.clear();
      this.isRunning = false;

      this.emit('pool:stopped');

    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Add task to queue
   */
  addTask(task: Omit<TaskData, 'id' | 'createdAt' | 'scheduledAt' | 'attempts'>): string {
    const taskId = this.generateTaskId();
    const fullTask: TaskData = {
      ...task,
      id: taskId,
      createdAt: new Date(),
      scheduledAt: new Date(),
      attempts: 0
    };

    // Insert task based on priority (higher priority first)
    this.insertTaskByPriority(fullTask);

    this.emit('task:queued', fullTask);
    return taskId;
  }

  /**
   * Get worker pool status
   */
  getStatus(): WorkerPoolStatus {
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status === 'busy').length;
    const idleWorkers = Array.from(this.workers.values()).filter(w => w.status === 'idle').length;
    const busyWorkers = Array.from(this.workers.values()).filter(w => w.status === 'busy').length;
    const failedWorkers = Array.from(this.workers.values()).filter(w => w.status === 'failed').length;

    const workerDetails = Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      status: worker.status,
      tasksProcessed: worker.tasksProcessed,
      currentTask: worker.currentTask,
      lastHeartbeat: worker.lastHeartbeat
    }));

    return {
      totalWorkers: this.workers.size,
      activeWorkers,
      idleWorkers,
      busyWorkers,
      failedWorkers,
      queueSize: this.taskQueue.length,
      processingTasks: this.processingTasks.size,
      completedTasks: this.completedTasks.size,
      averageResponseTime: this.calculateAverageResponseTime(),
      throughput: this.calculateThroughput(),
      workerDetails
    };
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): TaskData | null {
    // Check in queue
    const queuedTask = this.taskQueue.find(t => t.id === taskId);
    if (queuedTask) {
      return queuedTask;
    }

    // Check in processing
    return this.processingTasks.get(taskId) || null;
  }

  /**
   * Get completed task result
   */
  getCompletedTask(taskId: string): unknown | null {
    return this.completedTasks.get(taskId) || null;
  }

  /**
   * Get failed task error
   */
  getFailedTask(taskId: string): Error | null {
    return this.failedTasks.get(taskId) || null;
  }

  /**
   * Clear completed and failed tasks
   */
  clearCompletedTasks(): void {
    this.completedTasks.clear();
    this.failedTasks.clear();
    this.emit('tasks:cleared');
  }

  // Abstract methods to be implemented by concrete worker pools

  /**
   * Create a worker instance - must be implemented by subclass
   */
  protected abstract createWorker(workerId: number): Promise<Worker>;

  /**
   * Handle worker message - can be overridden by subclass
   */
  protected handleWorkerMessage(workerId: number, message: WorkerMessage): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }

    switch (message.type) {
      case 'worker:ready':
        worker.status = 'idle';
        worker.startTime = new Date();
        break;

      case 'worker:heartbeat':
        worker.lastHeartbeat = new Date();
        break;

      case 'task:start':
        if (message.taskId) {
          this.handleTaskStart(workerId, message.taskId);
        }
        break;

      case 'task:complete':
        if (message.taskId && message.data) {
          this.handleTaskComplete(workerId, message.taskId, message.data);
        }
        break;

      case 'task:error':
        if (message.taskId && message.error) {
          this.handleTaskError(workerId, message.taskId, message.error);
        }
        break;

      case 'worker:error':
        worker.status = 'failed';
        worker.errorCount++;
        this.emit('worker:error', { workerId, error: message.error });
        break;

      case 'worker:shutdown':
        worker.status = 'shutdown';
        break;
    }
  }

  // Protected helper methods

  /**
   * Initialize worker pool
   */
  protected async initializeWorkerPool(): Promise<void> {
    const workerPromises = [];

    for (let i = 0; i < this.config.maxWorkers; i++) {
      workerPromises.push(this.createWorker(i));
    }

    const workers = await Promise.allSettled(workerPromises);

    // Check if at least one worker was created successfully
    const successfulWorkers = workers.filter(result => result.status === 'fulfilled');
    if (successfulWorkers.length === 0) {
      throw new Error('Failed to create any workers');
    }

    // Log failed workers
    workers.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.emit('worker:creation:failed', { workerId: index, error: result.reason });
      }
    });
  }

  /**
   * Insert task by priority
   */
  protected insertTaskByPriority(task: TaskData): void {
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queueItem = this.taskQueue[i];
      if (queueItem && queueItem.priority < task.priority) {
        insertIndex = i;
        break;
      }
    }
    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * Start task processing loop
   */
  protected startTaskProcessingLoop(): void {
    const processLoop = () => {
      if (this.shutdownRequested) {
        return;
      }

      // Get available workers
      const availableWorkers = Array.from(this.workers.values())
        .filter(w => w.status === 'idle');

      // Process tasks if we have available workers and tasks in queue
      while (availableWorkers.length > 0 && this.taskQueue.length > 0) {
        const worker = availableWorkers.shift();
        const task = this.taskQueue.shift();

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
  protected assignTaskToWorker(worker: WorkerInfo, task: TaskData): void {
    // Move task from queue to processing
    this.processingTasks.set(task.id, task);

    // Update worker status
    worker.status = 'busy';
    worker.currentTask = task.id;

    // Send task to worker
    worker.worker.postMessage({
      type: 'task:execute',
      taskId: task.id,
      data: task.data,
      timestamp: new Date()
    });

    this.emit('task:assigned', { taskId: task.id, workerId: worker.id });
  }

  /**
   * Handle task start
   */
  protected handleTaskStart(workerId: number, taskId: string): void {
    const worker = this.workers.get(workerId);
    const task = this.processingTasks.get(taskId);

    if (worker && task) {
      worker.currentTask = taskId;
      this.emit('task:started', { taskId, workerId });
    }
  }

  /**
   * Handle task completion
   */
  protected handleTaskComplete(workerId: number, taskId: string, result: unknown): void {
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

      this.emit('task:completed', { taskId, workerId, result });
    }
  }

  /**
   * Handle task error
   */
  protected handleTaskError(workerId: number, taskId: string, error: Error | Record<string, unknown>): void {
    const worker = this.workers.get(workerId);
    const task = this.processingTasks.get(taskId);

    if (worker && task) {
      worker.status = 'idle';
      worker.currentTask = null;

      const taskError = error instanceof Error ? error : new Error(String(error));

      // Retry logic
      if (task.attempts < task.maxAttempts) {
        task.attempts++;
        setTimeout(() => {
          this.insertTaskByPriority(task);
        }, this.config.retryDelay);

        this.emit('task:retry', { taskId, workerId, attempt: task.attempts });
      } else {
        // Max retries exceeded
        this.processingTasks.delete(taskId);
        this.failedTasks.set(taskId, taskError);

        this.emit('task:failed', { taskId, workerId, error: taskError });
      }
    }
  }

  /**
   * Start health checks
   */
  protected startHealthChecks(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  protected performHealthCheck(): void {
    const now = new Date();
    const staleThreshold = this.config.healthCheckInterval * 2;

    for (const [workerId, worker] of Array.from(this.workers.entries())) {
      const timeSinceHeartbeat = now.getTime() - worker.lastHeartbeat.getTime();

      if (timeSinceHeartbeat > staleThreshold) {
        worker.status = 'failed';
        this.emit('worker:stale', { workerId, timeSinceHeartbeat });

        // Create replacement worker
        this.createWorker(workerId).catch(error => {
          this.emit('worker:replacement:failed', { workerId, error });
        });
      } else {
        // Send heartbeat request
        worker.worker.postMessage({
          type: 'worker:heartbeat',
          workerId,
          timestamp: now
        });
      }
    }
  }

  /**
   * Wait for shutdown
   */
  protected async waitForShutdown(): Promise<void> {
    return new Promise((resolve) => {
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
  }

  /**
   * Terminate all workers
   */
  protected async terminateAllWorkers(): Promise<void> {
    const terminationPromises = Array.from(this.workers.values()).map(worker =>
      this.terminateWorker(worker)
    );

    await Promise.allSettled(terminationPromises);
  }

  /**
   * Terminate a single worker
   */
  protected async terminateWorker(worker: WorkerInfo): Promise<void> {
    try {
      // Send shutdown message
      worker.worker.postMessage({
        type: 'worker:shutdown',
        workerId: worker.id,
        timestamp: new Date()
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
      this.emit('worker:termination:error', { workerId: worker.id, error });
    }
  }

  /**
   * Setup event handlers
   */
  protected setupEventHandlers(): void {
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

  /**
   * Generate task ID
   */
  protected generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate average response time
   */
  protected calculateAverageResponseTime(): number {
    // This would be calculated from task completion times
    // Implementation depends on specific use case
    return 0;
  }

  /**
   * Calculate throughput
   */
  protected calculateThroughput(): number {
    const firstWorker = Array.from(this.workers.values())[0];
    const timeRunning = Date.now() - (this.workers.size > 0 && firstWorker ?
      firstWorker.createdAt.getTime() : Date.now());
    return this.completedTasks.size / Math.max(1, timeRunning / 60000); // per minute
  }
}