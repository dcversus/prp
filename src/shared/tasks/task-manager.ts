/**
 * ♫ Task Manager for @dcversus/prp
 *
 * Central task management system for creating, assigning, tracking,
 * and completing tasks across the orchestrator-scanner-inspector framework.
 */

import { EventEmitter } from 'events';
import { Signal } from '../types';
import {
  TaskDefinition,
  TaskAssignment,
  TaskResult,
  TaskType,
  TaskPriority,
  AssignmentStatus,
  TaskOutcome,
  TaskFilter,
  TaskStatistics,
  AgentAssignment
} from './types';
import { createLayerLogger } from '../index';

const logger = createLayerLogger('task-manager');

/**
 * Task Manager Configuration
 */
export interface TaskManagerConfig {
  /** Maximum concurrent tasks per agent */
  maxConcurrentTasksPerAgent: number;

  /** Default task timeout in milliseconds */
  defaultTaskTimeout: number;

  /** Maximum task age before auto-cleanup */
  maxTaskAge: number;

  /** Enable task statistics tracking */
  enableStatistics: boolean;

  /** Auto-assign tasks to suitable agents */
  enableAutoAssignment: boolean;

  /** Task priority weights for scheduling */
  priorityWeights: Record<TaskPriority, number>;
}

/**
 * Default task manager configuration
 */
const DEFAULT_CONFIG: TaskManagerConfig = {
  maxConcurrentTasksPerAgent: 3,
  defaultTaskTimeout: 30 * 60 * 1000, // 30 minutes
  maxTaskAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableStatistics: true,
  enableAutoAssignment: true,
  priorityWeights: {
    [TaskPriority.CRITICAL]: 100,
    [TaskPriority.HIGH]: 80,
    [TaskPriority.MEDIUM]: 60,
    [TaskPriority.LOW]: 40,
    [TaskPriority.BACKGROUND]: 20
  }
};

/**
 * Agent capability registry
 */
interface AgentCapability {
  agentId: string;
  agentType: string;
  capabilities: string[];
  currentWorkload: number;
  maxWorkload: number;
  status: 'available' | 'busy' | 'offline' | 'error';
  performance?: {
    avgCompletionTime: number;
    successRate: number;
    qualityScore: number;
  };
}

/**
 * Task Manager - Central task coordination system
 */
export class TaskManager extends EventEmitter {
  private config: TaskManagerConfig;
  private tasks: Map<string, TaskDefinition> = new Map();
  private assignments: Map<string, TaskAssignment> = new Map();
  private results: Map<string, TaskResult> = new Map();
  private agents: Map<string, AgentCapability> = new Map();
  private statistics: TaskStatistics;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<TaskManagerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statistics = this.initializeStatistics();
    this.initializeCleanup();
  }

  /**
   * Initialize the task manager
   */
  async initialize(): Promise<void> {
    logger.info('TaskManager', 'Initializing task manager system');

    // Load existing tasks from storage if needed
    await this.loadPersistedState();

    // Start background processes
    this.startBackgroundProcesses();

    logger.info('TaskManager', 'Task manager initialized', {
      config: this.config,
      tasksCount: this.tasks.size,
      agentsCount: this.agents.size
    });

    this.emit('manager:initialized', {
      tasksCount: this.tasks.size,
      agentsCount: this.agents.size
    });
  }

  /**
   * Create a new task from a signal
   */
  createTaskFromSignal(signal: Signal, options?: {
    type?: TaskType;
    priority?: TaskPriority;
    title?: string;
    description?: string;
    requiredCapabilities?: string[];
    parameters?: Record<string, unknown>;
  }): TaskDefinition {
    const taskId = this.generateTaskId();

    // Determine task type based on signal
    const taskType = options?.type ?? this.determineTaskType(signal);

    // Determine priority based on signal
    const priority = options?.priority ?? this.determineTaskPriority(signal);

    const task: TaskDefinition = {
      id: taskId,
      type: taskType,
      priority,
      title: options?.title ?? this.generateTaskTitle(signal, taskType),
      description: options?.description ?? this.generateTaskDescription(signal, taskType),
      sourceSignal: signal,
      context: {
        prpId: this.extractPrpId(signal),
        files: this.extractFiles(signal),
        createdAt: new Date(),
        estimatedEffort: this.estimateEffort(signal, taskType),
        metadata: {
          signalId: signal.id,
          signalType: signal.type
        }
      },
      requiredCapabilities: options?.requiredCapabilities ?? this.determineRequiredCapabilities(signal, taskType),
      parameters: options?.parameters ?? this.extractParameters(signal),
      expectedOutcome: this.defineExpectedOutcome(signal, taskType)
    };

    // Store task
    this.tasks.set(taskId, task);
    this.updateStatistics();

    logger.info('TaskManager', 'Task created from signal', {
      taskId,
      taskType,
      priority,
      signalId: signal.id,
      signalType: signal.type
    });

    this.emit('task:created', { task, signal });

    // Auto-assign if enabled
    if (this.config.enableAutoAssignment) {
      this.autoAssignTask(task);
    }

    return task;
  }

  /**
   * Assign a task to an agent
   */
  assignTask(taskId: string, agentId: string, options?: {
    reason?: string;
    confidence?: number;
    priorityOverride?: TaskPriority;
  }): TaskAssignment | null {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task) {
      logger.warn('TaskManager', 'Task not found for assignment', { taskId });
      return null;
    }

    if (!agent) {
      logger.warn('TaskManager', 'Agent not found for assignment', { agentId });
      return null;
    }

    // Check if agent is available
    if (agent.status !== 'available' && agent.currentWorkload >= agent.maxWorkload) {
      logger.warn('TaskManager', 'Agent not available for assignment', {
        agentId,
        status: agent.status,
        currentWorkload: agent.currentWorkload,
        maxWorkload: agent.maxWorkload
      });
      return null;
    }

    // Check capability match
    const matchedCapabilities = this.getMatchedCapabilities(task, agent);
    if (matchedCapabilities.length === 0) {
      logger.warn('TaskManager', 'Agent lacks required capabilities', {
        taskId,
        agentId,
        requiredCapabilities: task.requiredCapabilities,
        agentCapabilities: agent.capabilities
      });
      return null;
    }

    // Create assignment
    const assignmentId = this.generateAssignmentId();
    const assignment: TaskAssignment = {
      id: assignmentId,
      taskId,
      assignedAgent: {
        id: agentId,
        type: agent.agentType,
        matchedCapabilities,
        status: agent.status,
        currentWorkload: {
          activeTasks: agent.currentWorkload,
          queuedTasks: 0, // TODO: Implement task queuing
          availableCapacity: Math.max(0, agent.maxWorkload - agent.currentWorkload)
        },
        performance: agent.performance
      },
      status: AssignmentStatus.ASSIGNED,
      timestamps: {
        assignedAt: new Date(),
        estimatedCompletion: this.estimateCompletionTime(task, agent)
      },
      metadata: {
        selectionReason: options?.reason ?? this.generateSelectionReason(task, agent),
        agentConfidence: options?.confidence ?? this.calculateAssignmentConfidence(task, agent),
        priorityOverride: options?.priorityOverride
      }
    };

    // Store assignment
    this.assignments.set(assignmentId, assignment);

    // Update agent workload
    agent.currentWorkload++;
    if (agent.currentWorkload >= agent.maxWorkload) {
      agent.status = 'busy';
    }

    logger.info('TaskManager', 'Task assigned to agent', {
      taskId,
      assignmentId,
      agentId,
      taskType: task.type,
      priority: options?.priorityOverride ?? task.priority
    });

    this.emit('task:assigned', { task, assignment, agent });

    return assignment;
  }

  /**
   * Complete a task with results
   */
  completeTask(assignmentId: string, result: Omit<TaskResult, 'id' | 'assignmentId'>): TaskResult | null {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      logger.warn('TaskManager', 'Assignment not found for completion', { assignmentId });
      return null;
    }

    const task = this.tasks.get(assignment.taskId);
    if (!task) {
      logger.warn('TaskManager', 'Task not found for completion', { taskId: assignment.taskId });
      return null;
    }

    const agent = this.agents.get(assignment.assignedAgent.id);
    if (!agent) {
      logger.warn('TaskManager', 'Agent not found for completion', { agentId: assignment.assignedAgent.id });
      return null;
    }

    // Create result
    const taskResult: TaskResult = {
      id: this.generateResultId(),
      taskId: task.id,
      assignmentId,
      ...result
    };

    // Store result
    this.results.set(taskResult.id, taskResult);

    // Update assignment
    assignment.result = taskResult;
    assignment.status = this.mapOutcomeToStatus(result.outcome);
    assignment.timestamps.completedAt = new Date();

    // Update agent workload and performance
    if (agent.currentWorkload > 0) {
      agent.currentWorkload--;
    }
    if (agent.currentWorkload < agent.maxWorkload) {
      agent.status = 'available';
    }

    // Update agent performance metrics
    this.updateAgentPerformance(agent, taskResult);

    // Update statistics
    this.updateStatistics();

    logger.info('TaskManager', 'Task completed', {
      taskId: task.id,
      assignmentId,
      outcome: result.outcome,
      duration: result.timestamps.duration,
      qualityScore: result.quality.score
    });

    this.emit('task:completed', { task, assignment, result: taskResult, agent });

    return taskResult;
  }

  /**
   * Register an agent with its capabilities
   */
  registerAgent(agentInfo: {
    id: string;
    type: string;
    capabilities: string[];
    maxWorkload?: number;
    performance?: {
      avgCompletionTime: number;
      successRate: number;
      qualityScore: number;
    };
  }): void {
    const agent: AgentCapability = {
      ...agentInfo,
      currentWorkload: 0,
      maxWorkload: agentInfo.maxWorkload ?? this.config.maxConcurrentTasksPerAgent,
      status: 'available'
    };

    this.agents.set(agentInfo.id, agent);

    logger.info('TaskManager', 'Agent registered', {
      agentId: agentInfo.id,
      type: agentInfo.type,
      capabilities: agentInfo.capabilities.length,
      maxWorkload: agent.maxWorkload
    });

    this.emit('agent:registered', { agent });
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): TaskDefinition | null {
    return this.tasks.get(taskId) ?? null;
  }

  /**
   * Get assignment by ID
   */
  getAssignment(assignmentId: string): TaskAssignment | null {
    return this.assignments.get(assignmentId) ?? null;
  }

  /**
   * Get result by ID
   */
  getResult(resultId: string): TaskResult | null {
    return this.results.get(resultId) ?? null;
  }

  /**
   * Get tasks with filtering
   */
  getTasks(filter?: TaskFilter): TaskDefinition[] {
    let tasks = Array.from(this.tasks.values());

    if (filter) {
      if (filter.types && filter.types.length > 0) {
        tasks = tasks.filter(task => filter.types!.includes(task.type));
      }

      if (filter.priorities && filter.priorities.length > 0) {
        tasks = tasks.filter(task => filter.priorities!.includes(task.priority));
      }

      if (filter.agents && filter.agents.length > 0) {
        const agentTaskIds = Array.from(this.assignments.values())
          .filter(assignment => filter.agents!.includes(assignment.assignedAgent.id))
          .map(assignment => assignment.taskId);
        tasks = tasks.filter(task => agentTaskIds.includes(task.id));
      }

      if (filter.prpIds && filter.prpIds.length > 0) {
        tasks = tasks.filter(task =>
          task.context.prpId && filter.prpIds!.includes(task.context.prpId)
        );
      }

      if (filter.dateRange) {
        tasks = tasks.filter(task => {
          const createdAt = task.context.createdAt.getTime();
          const start = filter.dateRange!.start?.getTime() ?? 0;
          const end = filter.dateRange!.end?.getTime() ?? Date.now();
          return createdAt >= start && createdAt <= end;
        });
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        tasks = tasks.filter(task =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower)
        );
      }
    }

    return tasks;
  }

  /**
   * Get task statistics
   */
  getStatistics(): TaskStatistics {
    return { ...this.statistics };
  }

  /**
   * Get available agents for a task
   */
  getAvailableAgents(task: TaskDefinition): AgentCapability[] {
    return Array.from(this.agents.values())
      .filter(agent =>
        agent.status === 'available' &&
        agent.currentWorkload < agent.maxWorkload &&
        this.hasRequiredCapabilities(task, agent)
      )
      .sort((a, b) => {
        // Sort by performance score if available
        const aScore = a.performance?.qualityScore ?? 50;
        const bScore = b.performance?.qualityScore ?? 50;
        return bScore - aScore;
      });
  }

  /**
   * Auto-assign task to best available agent
   */
  private autoAssignTask(task: TaskDefinition): void {
    const availableAgents = this.getAvailableAgents(task);
    if (availableAgents.length === 0) {
      logger.warn('TaskManager', 'No available agents for auto-assignment', {
        taskId: task.id,
        requiredCapabilities: task.requiredCapabilities
      });
      return;
    }

    const bestAgent = availableAgents[0];
    this.assignTask(task.id, bestAgent.id, {
      reason: 'Auto-assigned to best available agent based on capabilities and performance'
    });
  }

  /**
   * Private helper methods
   */

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAssignmentId(): string {
    return `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineTaskType(signal: Signal): TaskType {
    // Map signal types to task types
    const signalTypeMap: Record<string, TaskType> = {
      'tp': TaskType.DEVELOPMENT,
      'dp': TaskType.DEVELOPMENT,
      'tw': TaskType.TESTING,
      'bf': TaskType.BUGFIX,
      'cd': TaskType.REFACTORING,
      'af': TaskType.ANALYSIS,
      'gg': TaskType.ANALYSIS,
      'ff': TaskType.ANALYSIS,
      'da': TaskType.REVIEW,
      'vr': TaskType.REVIEW,
      'mg': TaskType.DEPLOYMENT,
      'rl': TaskType.DEPLOYMENT,
      'oa': TaskType.COORDINATION,
      'aa': TaskType.COORDINATION,
      'du': TaskType.DESIGN,
      'ds': TaskType.DESIGN,
      'dh': TaskType.DESIGN,
      'dr': TaskType.DESIGN,
      'id': TaskType.DEPLOYMENT,
      'mo': TaskType.MONITORING,
      'ir': TaskType.DEPLOYMENT,
      'so': TaskType.PERFORMANCE,
      'sc': TaskType.SECURITY
    };

    return signalTypeMap[signal.type] ?? TaskType.COORDINATION;
  }

  private determineTaskPriority(signal: Signal): TaskPriority {
    if (signal.priority >= 9) {
      return TaskPriority.CRITICAL;
    }
    if (signal.priority >= 7) {
      return TaskPriority.HIGH;
    }
    if (signal.priority >= 5) {
      return TaskPriority.MEDIUM;
    }
    if (signal.priority >= 3) {
      return TaskPriority.LOW;
    }
    return TaskPriority.BACKGROUND;
  }

  private generateTaskTitle(signal: Signal, taskType: TaskType): string {
    const typeNames: Record<TaskType, string> = {
      [TaskType.DEVELOPMENT]: 'Development',
      [TaskType.TESTING]: 'Testing',
      [TaskType.REVIEW]: 'Review',
      [TaskType.ANALYSIS]: 'Analysis',
      [TaskType.DESIGN]: 'Design',
      [TaskType.DOCUMENTATION]: 'Documentation',
      [TaskType.DEPLOYMENT]: 'Deployment',
      [TaskType.COORDINATION]: 'Coordination',
      [TaskType.RESEARCH]: 'Research',
      [TaskType.BUGFIX]: 'Bug Fix',
      [TaskType.FEATURE]: 'Feature Implementation',
      [TaskType.REFACTORING]: 'Refactoring',
      [TaskType.INTEGRATION]: 'Integration',
      [TaskType.MONITORING]: 'Monitoring',
      [TaskType.SECURITY]: 'Security',
      [TaskType.PERFORMANCE]: 'Performance',
      [TaskType.CLEANUP]: 'Cleanup'
    };

    return `${typeNames[taskType]} task for ${signal.type} signal`;
  }

  private generateTaskDescription(signal: Signal, taskType: TaskType): string {
    return `Process ${signal.type} signal from ${signal.source} with priority ${signal.priority}. Task type: ${taskType}`;
  }

  private extractPrpId(signal: Signal): string | undefined {
    // Extract PRP ID from signal data or source
    if (typeof signal.data === 'object' && signal.data && 'prpId' in signal.data) {
      return String(signal.data.prpId);
    }
    return undefined;
  }

  private extractFiles(signal: Signal): string[] | undefined {
    if (typeof signal.data === 'object' && signal.data && 'files' in signal.data) {
      const files = signal.data.files;
      return Array.isArray(files) ? files.map(String) : undefined;
    }
    return undefined;
  }

  private estimateEffort(signal: Signal, taskType: TaskType): 'low' | 'medium' | 'high' {
    if (signal.priority >= 8) {
      return 'high';
    }
    if (signal.priority >= 5) {
      return 'medium';
    }
    return 'low';
  }

  private determineRequiredCapabilities(signal: Signal, taskType: TaskType): string[] {
    const baseCapabilities: Record<TaskType, string[]> = {
      [TaskType.DEVELOPMENT]: ['coding', 'file_operations', 'testing'],
      [TaskType.TESTING]: ['testing', 'validation', 'analysis'],
      [TaskType.REVIEW]: ['code_review', 'analysis', 'validation'],
      [TaskType.ANALYSIS]: ['analysis', 'research', 'documentation'],
      [TaskType.DESIGN]: ['design', 'creativity', 'analysis'],
      [TaskType.DOCUMENTATION]: ['writing', 'analysis', 'organization'],
      [TaskType.DEPLOYMENT]: ['deployment', 'system_operations', 'monitoring'],
      [TaskType.COORDINATION]: ['communication', 'planning', 'organization'],
      [TaskType.RESEARCH]: ['research', 'analysis', 'problem_solving'],
      [TaskType.BUGFIX]: ['debugging', 'coding', 'testing'],
      [TaskType.FEATURE]: ['coding', 'design', 'testing'],
      [TaskType.REFACTORING]: ['coding', 'analysis', 'testing'],
      [TaskType.INTEGRATION]: ['coding', 'testing', 'system_integration'],
      [TaskType.MONITORING]: ['monitoring', 'analysis', 'alerting'],
      [TaskType.SECURITY]: ['security_analysis', 'auditing', 'compliance'],
      [TaskType.PERFORMANCE]: ['performance_analysis', 'optimization', 'monitoring'],
      [TaskType.CLEANUP]: ['file_operations', 'organization', 'cleanup']
    };

    return baseCapabilities[taskType] ?? ['general'];
  }

  private extractParameters(signal: Signal): Record<string, unknown> {
    return {
      signalId: signal.id,
      signalType: signal.type,
      signalData: signal.data,
      signalSource: signal.source
    };
  }

  private defineExpectedOutcome(signal: Signal, taskType: TaskType): TaskDefinition['expectedOutcome'] {
    return {
      type: 'coordination',
      description: `Process ${signal.type} signal successfully`
    };
  }

  private getMatchedCapabilities(task: TaskDefinition, agent: AgentCapability): string[] {
    return task.requiredCapabilities.filter(cap =>
      agent.capabilities.includes(cap)
    );
  }

  private hasRequiredCapabilities(task: TaskDefinition, agent: AgentCapability): boolean {
    return this.getMatchedCapabilities(task, agent).length > 0;
  }

  private calculateAssignmentConfidence(task: TaskDefinition, agent: AgentCapability): number {
    const matchedCapabilities = this.getMatchedCapabilities(task, agent);
    const capabilityMatch = matchedCapabilities.length / task.requiredCapabilities.length;

    const workloadFactor = 1 - (agent.currentWorkload / agent.maxWorkload);
    const performanceBonus = agent.performance?.qualityScore ? agent.performance.qualityScore / 100 : 0.5;

    return (capabilityMatch * 0.5 + workloadFactor * 0.3 + performanceBonus * 0.2);
  }

  private generateSelectionReason(task: TaskDefinition, agent: AgentCapability): string {
    const matchedCapabilities = this.getMatchedCapabilities(task, agent);
    return `Selected for capabilities: ${matchedCapabilities.join(', ')}`;
  }

  private estimateCompletionTime(task: TaskDefinition, agent: AgentCapability): Date {
    const baseTime = agent.performance?.avgCompletionTime ?? 30 * 60 * 1000; // 30 minutes default
    const effortMultiplier = task.context.estimatedEffort === 'high' ? 1.5 :
      task.context.estimatedEffort === 'low' ? 0.7 : 1.0;
    const workloadMultiplier = 1 + (agent.currentWorkload * 0.2);

    const estimatedMs = baseTime * effortMultiplier * workloadMultiplier;
    return new Date(Date.now() + estimatedMs);
  }

  private mapOutcomeToStatus(outcome: TaskOutcome): AssignmentStatus {
    switch (outcome) {
      case TaskOutcome.SUCCESS: return AssignmentStatus.COMPLETED;
      case TaskOutcome.FAILURE: return AssignmentStatus.FAILED;
      case TaskOutcome.CANCELLED: return AssignmentStatus.CANCELLED;
      case TaskOutcome.BLOCKED: return AssignmentStatus.BLOCKED;
      default: return AssignmentStatus.FAILED;
    }
  }

  private updateAgentPerformance(agent: AgentCapability, result: TaskResult): void {
    if (!agent.performance) {
      agent.performance = {
        avgCompletionTime: result.timestamps.duration,
        successRate: result.outcome === TaskOutcome.SUCCESS ? 100 : 0,
        qualityScore: result.quality.score
      };
      return;
    }

    const alpha = 0.3; // Learning rate
    agent.performance.avgCompletionTime =
      agent.performance.avgCompletionTime * (1 - alpha) + result.timestamps.duration * alpha;

    agent.performance.successRate =
      agent.performance.successRate * (1 - alpha) + (result.outcome === TaskOutcome.SUCCESS ? 100 : 0) * alpha;

    agent.performance.qualityScore =
      agent.performance.qualityScore * (1 - alpha) + result.quality.score * alpha;
  }

  private initializeStatistics(): TaskStatistics {
    return {
      total: 0,
      byStatus: {} as Record<AssignmentStatus, number>,
      byType: {} as Record<TaskType, number>,
      byPriority: {} as Record<TaskPriority, number>,
      byAgent: {},
      performance: {
        avgCompletionTime: 0,
        successRate: 0,
        avgQualityScore: 0,
        throughput: 0
      },
      workload: {
        active: 0,
        queued: 0,
        overdue: 0
      }
    };
  }

  private updateStatistics(): void {
    const assignments = Array.from(this.assignments.values());
    const results = Array.from(this.results.values());

    // Reset counters
    this.statistics = this.initializeStatistics();
    this.statistics.total = assignments.length;

    // Count by status
    for (const assignment of assignments) {
      this.statistics.byStatus[assignment.status] =
        (this.statistics.byStatus[assignment.status] || 0) + 1;
    }

    // Count by type and priority
    for (const task of this.tasks.values()) {
      this.statistics.byType[task.type] = (this.statistics.byType[task.type] || 0) + 1;
      this.statistics.byPriority[task.priority] = (this.statistics.byPriority[task.priority] || 0) + 1;
    }

    // Count by agent
    for (const assignment of assignments) {
      const agentId = assignment.assignedAgent.id;
      this.statistics.byAgent[agentId] = (this.statistics.byAgent[agentId] || 0) + 1;
    }

    // Calculate performance metrics
    if (results.length > 0) {
      const successfulResults = results.filter(r => r.outcome === TaskOutcome.SUCCESS);
      this.statistics.performance.successRate = (successfulResults.length / results.length) * 100;

      const avgTime = results.reduce((sum, r) => sum + r.timestamps.duration, 0) / results.length;
      this.statistics.performance.avgCompletionTime = avgTime;

      const avgQuality = results.reduce((sum, r) => sum + r.quality.score, 0) / results.length;
      this.statistics.performance.avgQualityScore = avgQuality;
    }

    // Calculate workload
    this.statistics.workload.active = assignments.filter(a =>
      a.status === AssignmentStatus.IN_PROGRESS || a.status === AssignmentStatus.ASSIGNED
    ).length;

    this.statistics.workload.queued = assignments.filter(a =>
      a.status === AssignmentStatus.ASSIGNED
    ).length;
  }

  private initializeCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  private performCleanup(): void {
    const cutoffTime = Date.now() - this.config.maxTaskAge;
    let cleanedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.context.createdAt.getTime() < cutoffTime) {
        // Check if task is completed
        const isCompleted = Array.from(this.assignments.values())
          .some(assignment =>
            assignment.taskId === taskId &&
            [AssignmentStatus.COMPLETED, AssignmentStatus.FAILED].includes(assignment.status)
          );

        if (isCompleted) {
          this.tasks.delete(taskId);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info('TaskManager', `Cleaned up ${cleanedCount} old tasks`);
      this.updateStatistics();
    }
  }

  private startBackgroundProcesses(): void {
    // Start any background processes here
    logger.info('TaskManager', 'Background processes started');
  }

  private async loadPersistedState(): Promise<void> {
    // Load persisted state from storage if needed
    logger.debug('TaskManager', 'Loading persisted state');
  }

  /**
   * Shutdown the task manager
   */
  async shutdown(): Promise<void> {
    logger.info('TaskManager', 'Shutting down task manager');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Save state if needed
    await this.saveState();

    logger.info('TaskManager', 'Task manager shutdown complete');
    this.emit('manager:shutdown');
  }

  private async saveState(): Promise<void> {
    // Save current state to storage if needed
    logger.debug('TaskManager', 'Saving task manager state');
  }
}