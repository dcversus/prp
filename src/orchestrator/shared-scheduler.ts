/**
 * Shared Scheduler System
 *
 * Centralized scheduling system with ping intervals for orchestrator coordination,
 * agent health monitoring, and task distribution.
 */

import { createAgentNudgeIntegration } from '../nudge/agent-integration';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('orchestrator-scheduler');

/**
 * Scheduler task types
 */
export enum SchedulerTaskType {
  HEALTH_CHECK = 'health-check',
  COORDINATION = 'coordination',
  FOLLOW_UP = 'follow-up',
  CLEANUP = 'cleanup',
  PING = 'ping',
  BULK_DELIVERY = 'bulk-delivery',
  ESCALATION = 'escalation',
  STATUS_UPDATE = 'status-update'
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
  BACKGROUND = 5
}

/**
 * Scheduler task interface
 */
export interface SchedulerTask {
  id: string;
  type: SchedulerTaskType;
  priority: TaskPriority;
  name: string;
  description: string;
  schedule: {
    interval: number; // milliseconds
    maxRetries: number;
    timeout: number; // milliseconds
  };
  handler: () => Promise<TaskResult>;
  metadata: {
    createdAt: Date;
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    successCount: number;
    failureCount: number;
    lastError?: string;
    enabled: boolean;
    requiresCoordination?: boolean;
    coordinationGroupId?: string;
  };
  dependencies?: string[]; // Task IDs that must complete before this runs
}

/**
 * Task execution result
 */
export interface TaskResult {
  success: boolean;
  duration: number;
  message?: string;
  data?: unknown;
  error?: Error;
  nextRun?: Date;
}

/**
 * Agent ping information
 */
export interface AgentPing {
  agentId: string;
  agentType: string;
  status: 'active' | 'idle' | 'offline' | 'error';
  lastPing: Date;
  responseTime: number;
  memoryUsage?: number;
  tokenUsage?: number;
  currentTasks: string[];
  capabilities: string[];
  metadata?: unknown;
}

/**
 * Coordination group for parallel task execution
 */
export interface CoordinationGroup {
  id: string;
  name: string;
  description: string;
  tasks: string[]; // Task IDs
  agents: string[]; // Agent IDs
  requiresSync: boolean;
  syncTimeout: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  lastRun?: Date;
}

/**
 * Shared Scheduler Configuration
 */
export interface SchedulerConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  healthCheckInterval: number;
  pingInterval: number;
  coordinationTimeout: number;
  retryDelay: number;
  maxRetryAttempts: number;
  cleanupInterval: number;
  metricsEnabled: boolean;
  enableHealthChecks: boolean;
  enablePingMonitoring: boolean;
}

/**
 * Shared Scheduler System
 */
export class SharedScheduler {
  private tasks: Map<string, SchedulerTask> = new Map();
  private coordinationGroups: Map<string, CoordinationGroup> = new Map();
  private agentPings: Map<string, AgentPing> = new Map();
  private runningTasks: Map<string, Promise<TaskResult>> = new Map();
  private config: SchedulerConfig;
  private agentNudge: ReturnType<typeof createAgentNudgeIntegration>;
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private metrics: {
    tasksExecuted: number;
    tasksSucceeded: number;
    tasksFailed: number;
    averageExecutionTime: number;
    uptime: Date;
  };

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      maxConcurrentTasks: 10,
      taskTimeout: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      pingInterval: 30000, // 30 seconds
      coordinationTimeout: 120000, // 2 minutes
      retryDelay: 5000, // 5 seconds
      maxRetryAttempts: 3,
      cleanupInterval: 300000, // 5 minutes
      metricsEnabled: true,
      enableHealthChecks: true,
      enablePingMonitoring: true,
      ...config
    };

    this.agentNudge = createAgentNudgeIntegration();
    this.metrics = {
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      uptime: new Date()
    };

    this.initializeScheduler();
  }

  /**
   * Initialize scheduler with default tasks
   */
  private initializeScheduler(): void {
    logger.info('SharedScheduler', 'Initializing shared scheduler system');

    // Register default tasks
    this.registerDefaultTasks();

    // Start main scheduler loop
    this.startSchedulerLoop();

    // Start health monitoring
    if (this.config.enableHealthChecks) {
      this.startHealthMonitoring();
    }

    // Start ping monitoring
    if (this.config.enablePingMonitoring) {
      this.startPingMonitoring();
    }

    // Start cleanup process
    this.startCleanupProcess();

    logger.info('SharedScheduler', 'Shared scheduler initialized', {
      config: this.config,
      tasksCount: this.tasks.size
    });
  }

  /**
   * Register default scheduler tasks
   */
  private registerDefaultTasks(): void {
    // Health check task
    this.registerTask({
      id: 'health-check',
      type: SchedulerTaskType.HEALTH_CHECK,
      priority: TaskPriority.HIGH,
      name: 'System Health Check',
      description: 'Monitor system health and resource utilization',
      schedule: {
        interval: this.config.healthCheckInterval,
        maxRetries: 3,
        timeout: 30000
      },
      handler: () => this.performHealthCheck(),
      metadata: {
        createdAt: new Date(),
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        enabled: true
      }
    });

    // Agent ping coordination task
    this.registerTask({
      id: 'agent-ping-coordination',
      type: SchedulerTaskType.PING,
      priority: TaskPriority.MEDIUM,
      name: 'Agent Ping Coordination',
      description: 'Coordinate agent pings and monitor availability',
      schedule: {
        interval: this.config.pingInterval,
        maxRetries: 2,
        timeout: 15000
      },
      handler: () => this.coordinateAgentPings(),
      metadata: {
        createdAt: new Date(),
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        enabled: true,
        requiresCoordination: true,
        coordinationGroupId: 'agent-monitoring'
      }
    });

    // Bulk delivery coordination task
    this.registerTask({
      id: 'bulk-delivery-coordination',
      type: SchedulerTaskType.BULK_DELIVERY,
      priority: TaskPriority.MEDIUM,
      name: 'Bulk Message Delivery',
      description: 'Coordinate bulk delivery of aggregated messages',
      schedule: {
        interval: 60000, // 1 minute
        maxRetries: 3,
        timeout: 45000
      },
      handler: () => this.coordinateBulkDelivery(),
      metadata: {
        createdAt: new Date(),
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        enabled: true
      }
    });

    // Follow-up coordination task
    this.registerTask({
      id: 'follow-up-coordination',
      type: SchedulerTaskType.FOLLOW_UP,
      priority: TaskPriority.MEDIUM,
      name: 'Follow-up Coordination',
      description: 'Coordinate follow-up messages and escalations',
      schedule: {
        interval: 120000, // 2 minutes
        maxRetries: 2,
        timeout: 30000
      },
      handler: () => this.coordinateFollowUps(),
      metadata: {
        createdAt: new Date(),
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        enabled: true
      }
    });

    // Cleanup task
    this.registerTask({
      id: 'cleanup',
      type: SchedulerTaskType.CLEANUP,
      priority: TaskPriority.LOW,
      name: 'System Cleanup',
      description: 'Clean up expired data and optimize performance',
      schedule: {
        interval: this.config.cleanupInterval,
        maxRetries: 1,
        timeout: 60000
      },
      handler: () => this.performSystemCleanup(),
      metadata: {
        createdAt: new Date(),
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        enabled: true
      }
    });

    // Create coordination groups
    this.createCoordinationGroups();
  }

  /**
   * Create coordination groups for parallel task execution
   */
  private createCoordinationGroups(): void {
    // Agent monitoring coordination group
    this.coordinationGroups.set('agent-monitoring', {
      id: 'agent-monitoring',
      name: 'Agent Monitoring Group',
      description: 'Coordinates agent health checks and ping monitoring',
      tasks: ['health-check', 'agent-ping-coordination'],
      agents: ['orchestrator', 'system-monitor', 'agent-manager'],
      requiresSync: true,
      syncTimeout: this.config.coordinationTimeout,
      status: 'idle',
      createdAt: new Date()
    });

    // Message coordination group
    this.coordinationGroups.set('message-coordination', {
      id: 'message-coordination',
      name: 'Message Coordination Group',
      description: 'Coordinates message delivery and follow-ups',
      tasks: ['bulk-delivery-coordination', 'follow-up-coordination'],
      agents: ['orchestrator', 'message-handler', 'nudge-client'],
      requiresSync: false, // Can run in parallel
      syncTimeout: this.config.coordinationTimeout,
      status: 'idle',
      createdAt: new Date()
    });
  }

  /**
   * Register a new scheduler task
   */
  registerTask(task: Omit<SchedulerTask, 'metadata'> & { metadata?: Partial<SchedulerTask['metadata']> }): void {
    const fullTask: SchedulerTask = {
      ...task,
      metadata: {
        createdAt: new Date(),
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        enabled: true,
        ...task.metadata
      }
    };

    this.tasks.set(task.id, fullTask);

    logger.info('SharedScheduler', 'Task registered', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
      interval: task.schedule.interval
    });
  }

  /**
   * Start main scheduler loop
   */
  private startSchedulerLoop(): void {
    const schedulerInterval = setInterval(() => {
      this.processScheduledTasks();
    }, 10000); // Check every 10 seconds for tasks ready to run

    this.intervals.set('main-scheduler', schedulerInterval);

    logger.info('SharedScheduler', 'Main scheduler loop started');
  }

  /**
   * Process tasks that are ready to run
   */
  private async processScheduledTasks(): Promise<void> {
    const now = new Date();
    const readyTasks = Array.from(this.tasks.values())
      .filter(task =>
        task.metadata.enabled &&
        (!task.metadata.nextRun || now >= task.metadata.nextRun) &&
        !this.runningTasks.has(task.id)
      )
      .sort((a, b) => a.priority - b.priority) // Lower number = higher priority
      .slice(0, this.config.maxConcurrentTasks - this.runningTasks.size);

    if (readyTasks.length === 0) {
      return;
    }

    logger.info('SharedScheduler', `Processing ${readyTasks.length} ready tasks`);

    // Process coordination groups first
    const coordinationTasks = readyTasks.filter(task => task.metadata.requiresCoordination);
    const independentTasks = readyTasks.filter(task => !task.metadata.requiresCoordination);

    // Handle coordination tasks
    for (const task of coordinationTasks) {
      if (task.metadata.coordinationGroupId) {
        await this.processCoordinationTask(task, task.metadata.coordinationGroupId);
      }
    }

    // Handle independent tasks
    for (const task of independentTasks) {
      this.executeTask(task);
    }
  }

  /**
   * Process task that requires coordination
   */
  private async processCoordinationTask(task: SchedulerTask, coordinationGroupId: string): Promise<void> {
    const group = this.coordinationGroups.get(coordinationGroupId);
    if (!group) {
      logger.warn('SharedScheduler', 'Coordination group not found', {
        taskId: task.id,
        coordinationGroupId
      });
      return;
    }

    // Check if all tasks in group are ready
    const groupTasks = group.tasks.map(taskId => this.tasks.get(taskId)).filter(Boolean) as SchedulerTask[];
    const readyTasks = groupTasks.filter(t =>
      t.metadata.enabled &&
      (!t.metadata.nextRun || new Date() >= t.metadata.nextRun) &&
      !this.runningTasks.has(t.id)
    );

    if (readyTasks.length !== groupTasks.length) {
      logger.debug('SharedScheduler', 'Coordination group not ready', {
        groupId: coordinationGroupId,
        readyCount: readyTasks.length,
        totalCount: groupTasks.length
      });
      return;
    }

    // Execute coordination group
    await this.executeCoordinationGroup(group, readyTasks);
  }

  /**
   * Execute coordination group
   */
  private async executeCoordinationGroup(group: CoordinationGroup, tasks: SchedulerTask[]): Promise<void> {
    group.status = 'running';
    group.lastRun = new Date();

    logger.info('SharedScheduler', 'Executing coordination group', {
      groupId: group.id,
      taskCount: tasks.length,
      requiresSync: group.requiresSync
    });

    try {
      if (group.requiresSync) {
        // Execute tasks synchronously
        for (const task of tasks) {
          await this.executeTask(task);
        }
      } else {
        // Execute tasks in parallel
        const promises = tasks.map(task => this.executeTask(task));
        await Promise.allSettled(promises);
      }

      group.status = 'completed';
      logger.info('SharedScheduler', 'Coordination group completed', {
        groupId: group.id
      });

    } catch (error) {
      group.status = 'failed';
      logger.error('SharedScheduler', 'Coordination group failed', error instanceof Error ? error : new Error(error instanceof Error ? error.message : 'Unknown error'), {
        groupId: group.id
      });
    }
  }

  /**
   * Execute individual task
   */
  private async executeTask(task: SchedulerTask): Promise<void> {
    if (this.runningTasks.has(task.id)) {
      logger.debug('SharedScheduler', 'Task already running', { taskId: task.id });
      return;
    }

    const startTime = Date.now();
    task.metadata.lastRun = new Date();
    task.metadata.runCount++;

    logger.info('SharedScheduler', 'Executing task', {
      taskId: task.id,
      type: task.type,
      runCount: task.metadata.runCount
    });

    const taskPromise = this.runTaskWithTimeout(task, this.config.taskTimeout);
    this.runningTasks.set(task.id, taskPromise);

    try {
      const result = await taskPromise;
      const duration = Date.now() - startTime;

      if (result.success) {
        task.metadata.successCount++;
        this.metrics.tasksSucceeded++;
        logger.info('SharedScheduler', 'Task completed successfully', {
          taskId: task.id,
          duration,
          runCount: task.metadata.runCount
        });
      } else {
        task.metadata.failureCount++;
        this.metrics.tasksFailed++;
        logger.error('SharedScheduler', 'Task failed', result.error || new Error('Task execution failed'), {
          taskId: task.id,
          runCount: task.metadata.runCount
        });
      }

      // Update metrics
      this.updateMetrics(duration);

      // Schedule next run
      task.metadata.nextRun = result.nextRun || new Date(Date.now() + task.schedule.interval);

    } catch (error) {
      task.metadata.failureCount++;
      this.metrics.tasksFailed++;
      task.metadata.lastError = error instanceof Error ? error.message : 'Unknown error';

      logger.error('SharedScheduler', 'Task execution failed', error instanceof Error ? error : new Error('Unknown error'), {
        taskId: task.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      // Schedule retry if applicable
      if (task.metadata.failureCount <= task.schedule.maxRetries) {
        task.metadata.nextRun = new Date(Date.now() + this.config.retryDelay);
      } else {
        task.metadata.enabled = false;
        logger.warn('SharedScheduler', 'Task disabled after max retries', {
          taskId: task.id,
          failureCount: task.metadata.failureCount
        });
      }

    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * Run task with timeout
   */
  private async runTaskWithTimeout(task: SchedulerTask, timeout: number): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timeout: ${task.id}`));
      }, timeout);

      task.handler()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          resolve({
            success: false,
            duration: 0,
            error
          });
        });
    });
  }

  /**
   * Default task handlers
   */
  private async performHealthCheck(): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      // Check system resources
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      const activeTasks = this.runningTasks.size;

      // Check nudge system health
      const nudgeStatus = await this.agentNudge.testSystem();

      const health = {
        memory: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal
        },
        uptime,
        activeTasks,
        nudgeSystem: nudgeStatus,
        timestamp: new Date()
      };

      // Send health alert if needed
      if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
        await this.agentNudge.sendAdminAttention({
          prpId: 'SYSTEM-HEALTH',
          agentType: 'shared-scheduler',
          topic: 'High Memory Usage Alert',
          summary: 'System memory usage exceeds 90%',
          details: `Memory usage: ${(memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2)}%`,
          actionRequired: 'Monitor system performance and consider restart',
          priority: 'high'
        });
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        message: 'Health check completed',
        data: health
      };

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error : new Error('Unknown health check error')
      };
    }
  }

  private async coordinateAgentPings(): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      // Simulate agent pings (in real implementation, this would ping actual agents)
      const agents = ['system-analyst', 'developer', 'aqa', 'orchestrator'];
      const pings: AgentPing[] = [];

      for (const agentId of agents) {
        const ping: AgentPing = {
          agentId,
          agentType: agentId.replace('-', '-'),
          status: 'active',
          lastPing: new Date(),
          responseTime: Math.random() * 100 + 50, // 50-150ms
          memoryUsage: Math.random() * 100 + 50, // MB
          tokenUsage: Math.random() * 1000,
          currentTasks: [],
          capabilities: []
        };

        this.agentPings.set(agentId, ping);
        pings.push(ping);
      }

      // Check for offline agents
      const offlineAgents = agents.filter(agentId => {
        const ping = this.agentPings.get(agentId);
        return !ping || (Date.now() - ping.lastPing.getTime()) > 120000; // 2 minutes
      });

      if (offlineAgents.length > 0) {
        await this.agentNudge.sendAdminAttention({
          prpId: 'SYSTEM-MONITORING',
          agentType: 'shared-scheduler',
          topic: 'Agent Offline Alert',
          summary: `${offlineAgents.length} agent(s) offline`,
          details: `Offline agents: ${offlineAgents.join(', ')}`,
          actionRequired: 'Investigate agent connectivity',
          priority: 'high'
        });
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        message: `Coordinated pings for ${pings.length} agents`,
        data: { pings, offlineAgents }
      };

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error : new Error('Unknown ping coordination error')
      };
    }
  }

  private async coordinateBulkDelivery(): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      // This would integrate with the orchestrator scanner guidelines
      // for bulk delivery of aggregated signals
      logger.info('SharedScheduler', 'Coordinating bulk delivery');

      return {
        success: true,
        duration: Date.now() - startTime,
        message: 'Bulk delivery coordination completed'
      };

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error : new Error('Unknown bulk delivery error')
      };
    }
  }

  private async coordinateFollowUps(): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      // This would integrate with the message handling guidelines
      // for follow-up coordination
      logger.info('SharedScheduler', 'Coordinating follow-ups');

      return {
        success: true,
        duration: Date.now() - startTime,
        message: 'Follow-up coordination completed'
      };

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error : new Error('Unknown follow-up coordination error')
      };
    }
  }

  private async performSystemCleanup(): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      // Clean up old agent pings
      const cutoffTime = Date.now() - 3600000; // 1 hour ago
      let cleanedPings = 0;

      for (const [agentId, ping] of this.agentPings.entries()) {
        if (ping.lastPing.getTime() < cutoffTime) {
          this.agentPings.delete(agentId);
          cleanedPings++;
        }
      }

      // Clean up completed coordination groups
      let cleanedGroups = 0;
      for (const [groupId, group] of this.coordinationGroups.entries()) {
        if (group.status === 'completed' && group.lastRun &&
            (Date.now() - group.lastRun.getTime()) > 3600000) {
          logger.debug('SharedScheduler', `Resetting completed coordination group ${groupId} to idle`);
          group.status = 'idle';
          cleanedGroups++;
        }
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        message: `System cleanup completed`,
        data: { cleanedPings, cleanedGroups }
      };

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error : new Error('Unknown cleanup error')
      };
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const healthInterval = setInterval(() => {
      const healthTask = this.tasks.get('health-check');
      if (healthTask?.metadata.enabled) {
        this.executeTask(healthTask);
      }
    }, this.config.healthCheckInterval);

    this.intervals.set('health-monitoring', healthInterval);
  }

  /**
   * Start ping monitoring
   */
  private startPingMonitoring(): void {
    const pingInterval = setInterval(() => {
      const pingTask = this.tasks.get('agent-ping-coordination');
      if (pingTask?.metadata.enabled) {
        this.executeTask(pingTask);
      }
    }, this.config.pingInterval);

    this.intervals.set('ping-monitoring', pingInterval);
  }

  /**
   * Start cleanup process
   */
  private startCleanupProcess(): void {
    const cleanupInterval = setInterval(() => {
      const cleanupTask = this.tasks.get('cleanup');
      if (cleanupTask?.metadata.enabled) {
        this.executeTask(cleanupTask);
      }
    }, this.config.cleanupInterval);

    this.intervals.set('cleanup-process', cleanupInterval);
  }

  /**
   * Update scheduler metrics
   */
  private updateMetrics(duration: number): void {
    this.metrics.tasksExecuted++;

    // Calculate rolling average execution time
    const totalDuration = this.metrics.averageExecutionTime * (this.metrics.tasksExecuted - 1) + duration;
    this.metrics.averageExecutionTime = totalDuration / this.metrics.tasksExecuted;
  }

  /**
   * Get scheduler status and metrics
   */
  getSchedulerStatus(): {
    uptime: number;
    metrics: {
      tasksExecuted: number;
      tasksSucceeded: number;
      tasksFailed: number;
      averageExecutionTime: number;
      uptime: Date;
    };
    tasks: {
      total: number;
      enabled: number;
      running: number;
      byType: Record<SchedulerTaskType, number>;
    };
    agents: {
      total: number;
      active: number;
      offline: number;
    };
    coordinationGroups: {
      total: number;
      running: number;
      idle: number;
      failed: number;
    };
  } {
    const tasks = Array.from(this.tasks.values());
    const agents = Array.from(this.agentPings.values());
    const groups = Array.from(this.coordinationGroups.values());

    const tasksByType: Record<SchedulerTaskType, number> = {
      [SchedulerTaskType.HEALTH_CHECK]: 0,
      [SchedulerTaskType.COORDINATION]: 0,
      [SchedulerTaskType.FOLLOW_UP]: 0,
      [SchedulerTaskType.CLEANUP]: 0,
      [SchedulerTaskType.PING]: 0,
      [SchedulerTaskType.BULK_DELIVERY]: 0,
      [SchedulerTaskType.ESCALATION]: 0,
      [SchedulerTaskType.STATUS_UPDATE]: 0
    };

    tasks.forEach(task => {
      tasksByType[task.type]++;
    });

    const activeAgents = agents.filter(ping =>
      ping.status === 'active' &&
      (Date.now() - ping.lastPing.getTime()) < 120000
    );

    return {
      uptime: Date.now() - this.metrics.uptime.getTime(),
      metrics: { ...this.metrics },
      tasks: {
        total: tasks.length,
        enabled: tasks.filter(t => t.metadata.enabled).length,
        running: this.runningTasks.size,
        byType: tasksByType
      },
      agents: {
        total: agents.length,
        active: activeAgents.length,
        offline: agents.length - activeAgents.length
      },
      coordinationGroups: {
        total: groups.length,
        running: groups.filter(g => g.status === 'running').length,
        idle: groups.filter(g => g.status === 'idle').length,
        failed: groups.filter(g => g.status === 'failed').length
      }
    };
  }

  /**
   * Get agent ping information
   */
  getAgentPings(): AgentPing[] {
    return Array.from(this.agentPings.values());
  }

  /**
   * Get coordination group status
   */
  getCoordinationGroups(): CoordinationGroup[] {
    return Array.from(this.coordinationGroups.values());
  }

  /**
   * Enable/disable task
   */
  setTaskEnabled(taskId: string, enabled: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.metadata.enabled = enabled;
    logger.info('SharedScheduler', `Task ${enabled ? 'enabled' : 'disabled'}`, { taskId });

    return true;
  }

  /**
   * Force execute task
   */
  async forceExecuteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task?.metadata.enabled) {
      return false;
    }

    await this.executeTask(task);
    return true;
  }

  /**
   * Shutdown scheduler
   */
  shutdown(): void {
    logger.info('SharedScheduler', 'Shutting down shared scheduler');

    // Clear all intervals
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      logger.debug('SharedScheduler', `Cleared interval: ${name}`);
    });
    this.intervals.clear();

    // Wait for running tasks to complete or timeout
    const runningTaskPromises = Array.from(this.runningTasks.values());
    if (runningTaskPromises.length > 0) {
      logger.info('SharedScheduler', `Waiting for ${runningTaskPromises.length} tasks to complete`);
      Promise.allSettled(runningTaskPromises).then(() => {
        logger.info('SharedScheduler', 'All tasks completed, shutdown complete');
      });
    }

    logger.info('SharedScheduler', 'Shared scheduler shutdown completed');
  }
}

/**
 * Create shared scheduler instance
 */
export const createSharedScheduler = (
  config?: Partial<SchedulerConfig>
): SharedScheduler => {
  return new SharedScheduler(config);
};