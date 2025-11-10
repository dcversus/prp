/**
 * ♫ Agent Spawner Utility
 *
 * High-level interface for spawning and managing agents with
 * automatic resource allocation and health monitoring.
 */

import {
  AgentLifecycleManager,
  AgentConfig,
  AgentSpawningOptions,
  AgentInstance,
  AgentTask,
  ResourceRequirements,
  TokenLimits
} from './agent-lifecycle-manager.js';
import { TokenMetricsStream } from '../shared/monitoring/TokenMetricsStream.js';
import { logger } from '../shared/utils/logger.js';

/**
 * Signal to Agent Type Mapping
 * Defines which agents should be spawned based on incoming signals
 */
export const SIGNAL_AGENT_MAPPING: Record<string, string[]> = {
  // Development signals
  '[tp]': ['robo-developer'],
  '[dp]': ['robo-developer'],
  '[bf]': ['robo-developer'],
  '[tw]': ['robo-developer', 'robo-quality-control'],
  '[cd]': ['robo-developer'],
  '[cc]': ['robo-developer'],
  '[mg]': ['robo-developer', 'robo-devops-sre'],
  '[rl]': ['robo-devops-sre'],

  // Quality assurance signals
  '[cq]': ['robo-quality-control'],
  '[tg]': ['robo-quality-control'],
  '[tr]': ['robo-quality-control'],
  '[cp]': ['robo-quality-control'],
  '[cf]': ['robo-quality-control'],
  '[rv]': ['robo-quality-control'],
  '[pc]': ['robo-quality-control'],

  // System analysis signals
  '[gg]': ['robo-system-analyst'],
  '[ff]': ['robo-system-analyst'],
  '[rp]': ['robo-quality-control'],
  '[vr]': ['robo-system-analyst'],
  '[rc]': ['robo-system-analyst'],
  '[rr]': ['robo-system-analyst'],
  '[vp]': ['robo-system-analyst'],
  '[ip]': ['robo-system-analyst'],
  '[er]': ['robo-system-analyst'],

  // UX/UI design signals
  '[du]': ['robo-ux-ui-designer'],
  '[ds]': ['robo-ux-ui-designer'],
  '[dr]': ['robo-ux-ui-designer'],
  '[dh]': ['robo-ux-ui-designer'],
  '[da]': ['robo-ux-ui-designer'],
  '[dc]': ['robo-ux-ui-designer'],
  '[df]': ['robo-ux-ui-designer'],
  '[dt]': ['robo-ux-ui-designer'],
  '[di]': ['robo-ux-ui-designer'],

  // DevOps/SRE signals
  '[id]': ['robo-devops-sre'],
  '[mo]': ['robo-devops-sre'],
  '[ir]': ['robo-devops-sre'],
  '[so]': ['robo-devops-sre'],
  '[sc]': ['robo-devops-sre'],
  '[pb]': ['robo-devops-sre'],
  '[dr]': ['robo-devops-sre'],
  '[cu]': ['robo-devops-sre'],
  '[ac]': ['robo-devops-sre'],
  '[sl]': ['robo-devops-sre'],
  '[eb]': ['robo-devops-sre'],

  // Coordination signals (multiple agents)
  '[oa]': ['robo-system-analyst'],
  '[aa]': ['robo-system-analyst'],
  '[bb]': ['robo-developer', 'robo-system-analyst'],
  '[af]': ['robo-system-analyst'],
  '[no]': ['robo-developer'],
  '[br]': ['robo-developer'],
  '[da]': ['robo-quality-control'],
  '[rg]': ['robo-quality-control'],
  '[ps]': ['robo-quality-control', 'robo-devops-sre'],
  '[ic]': ['robo-devops-sre'],
  '[JC]': ['robo-devops-sre', 'robo-developer'],
  '[pm]': ['robo-system-analyst']
};

/**
 * Signal priority mapping for spawning decisions
 */
export const SIGNAL_PRIORITY: Record<string, number> = {
  // Critical - system emergencies
  '[ic]': 10,
  '[JC]': 10,
  '[ff]': 9,
  '[cf]': 9,

  // High - blocking issues
  '[bb]': 8,
  '[af]': 7,
  '[er]': 7,
  '[br]': 7,

  // Medium - normal workflow
  '[tp]': 6,
  '[dp]': 6,
  '[bf]': 6,
  '[cq]': 5,
  '[tg]': 5,

  // Lower - maintenance
  '[cd]': 4,
  '[cc]': 4,
  '[ps]': 4,

  // Lowest - coordination
  '[oa]': 3,
  '[aa]': 2,
  '[ap]': 2
};

const spawnerLogger = logger.child('AgentSpawner');

export interface SpawnRequest {
  agentType: string;
  task?: AgentTask | string;
  priority: number;
  timeout?: number;
  waitForHealth?: boolean;
  tokenTracking?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SignalBasedSpawnRequest {
  signal: string;
  context?: {
    prpId?: string;
    filePath?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };
  task?: AgentTask | string;
  priority?: number;
  timeout?: number;
  waitForHealth?: boolean;
  tokenTracking?: boolean;
}

export interface SpawnDecision {
  shouldSpawn: boolean;
  agentType?: string;
  reason: string;
  priority: number;
  alternativeAgents?: string[];
}

export interface SpawnResult {
  success: boolean;
  agentId: string;
  instance?: AgentInstance;
  executionResult?: unknown;
  error?: string;
  spawnTime: number;
  executionTime?: number;
}

/**
 * Agent Spawner - High-level agent management interface
 */
export class AgentSpawner {
  private lifecycleManager: AgentLifecycleManager;
  private tokenMetricsStream: TokenMetricsStream;
  private spawnQueue: SpawnRequest[] = [];
  private activeSpawns: Map<string, SpawnRequest> = new Map();
  private maxConcurrentSpawns: number;

  constructor(tokenMetricsStream?: TokenMetricsStream, maxConcurrentSpawns: number = 5) {
    this.tokenMetricsStream = tokenMetricsStream ?? new TokenMetricsStream();
    this.lifecycleManager = new AgentLifecycleManager(this.tokenMetricsStream);
    this.maxConcurrentSpawns = maxConcurrentSpawns;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Register a new agent configuration
   */
  registerAgent(config: AgentConfig): void {
    this.lifecycleManager.registerAgent(config);
  }

  /**
   * Spawn an agent with optional immediate task execution
   */
  async spawnAgent(request: SpawnRequest): Promise<SpawnResult> {
    const startTime = Date.now();
    const agentId = this.generateAgentId(request.agentType);

    try {
      // Create agent config
      const config: AgentConfig = {
        id: agentId,
        type: request.agentType,
        name: `${request.agentType}-${agentId}`,
        enabled: true,
        priority: request.priority,
        resourceRequirements: this.getResourceRequirements(request.agentType),
        healthCheck: {
          enabled: true,
          intervalMs: 30000,
          timeoutMs: 10000,
          maxFailures: 3
        },
        tokenLimits: this.getTokenLimits(request.agentType)
      };

      // Register and spawn agent
      this.registerAgent(config);
      this.activeSpawns.set(agentId, request);

      const spawnOptions: AgentSpawningOptions = {
        waitForHealth: request.waitForHealth ?? true,
        timeoutMs: request.timeout ?? 60000,
        tokenTracking: request.tokenTracking ?? true
      };

      await this.lifecycleManager.spawnAgent(agentId, spawnOptions);

      const instance = this.lifecycleManager.getAgentStatus(agentId);
      const spawnTime = Date.now() - startTime;

      let executionResult;
      let executionTime;

      // Execute task if provided
      if (request.task) {
        const execStartTime = Date.now();
        const taskOptions: {
          timeout?: number;
          trackTokens?: boolean;
          priority: number;
        } = {
          priority: request.priority
        };

        if (request.timeout !== undefined) {
          taskOptions.timeout = request.timeout;
        }

        if (request.tokenTracking !== undefined) {
          taskOptions.trackTokens = request.tokenTracking;
        }

        executionResult = await this.lifecycleManager.executeTask(
          agentId,
          request.task,
          taskOptions
        );
        executionTime = Date.now() - execStartTime;
      }

      this.activeSpawns.delete(agentId);

      if (!instance) {
        throw new Error(`Failed to spawn agent: ${agentId}`);
      }

      const result: {
        success: boolean;
        agentId: string;
        instance: AgentInstance;
        spawnTime: number;
        executionResult?: unknown;
        executionTime?: number;
      } = {
        success: true,
        agentId,
        instance,
        spawnTime
      };

      if (executionResult !== undefined) {
        result.executionResult = executionResult;
      }

      if (executionTime !== undefined) {
        result.executionTime = executionTime;
      }

      return result;
    } catch (error) {
      this.activeSpawns.delete(agentId);
      return {
        success: false,
        agentId,
        error: error instanceof Error ? error.message : String(error),
        spawnTime: Date.now() - startTime
      };
    }
  }

  /**
   * Spawn multiple agents in parallel
   */
  async spawnMultipleAgents(requests: SpawnRequest[]): Promise<SpawnResult[]> {
    // Prioritize requests
    const sortedRequests = requests.sort((a, b) => b.priority - a.priority);

    // Process in batches to respect concurrency limits
    const results: SpawnResult[] = [];
    for (let i = 0; i < sortedRequests.length; i += this.maxConcurrentSpawns) {
      const batch = sortedRequests.slice(i, i + this.maxConcurrentSpawns);
      const batchResults = await Promise.all(batch.map((request) => this.spawnAgent(request)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Spawn the best agent for a task type
   */
  async spawnBestAgent(
    taskType: string,
    task?: AgentTask | string,
    options: {
      priority?: number;
      timeout?: number;
    } = {}
  ): Promise<SpawnResult> {
    // Find available agent types
    const availableTypes = this.getAvailableAgentTypes();

    if (availableTypes.length === 0) {
      return {
        success: false,
        agentId: '',
        error: 'No agent types available',
        spawnTime: 0
      };
    }

    // Try to find an existing running agent first
    const bestInstance = this.lifecycleManager.getBestAgent(taskType);
    if (bestInstance && task) {
      try {
        const execStartTime = Date.now();
        const taskOptions: {
          timeout?: number;
          trackTokens: boolean;
          priority: number;
        } = {
          trackTokens: true,
          priority: options.priority ?? 5
        };

        if (options.timeout !== undefined) {
          taskOptions.timeout = options.timeout;
        }

        const result = await this.lifecycleManager.executeTask(
          bestInstance.config.id,
          task,
          taskOptions
        );

        return {
          success: true,
          agentId: bestInstance.config.id,
          instance: bestInstance,
          executionResult: result,
          spawnTime: 0,
          executionTime: Date.now() - execStartTime
        };
      } catch {
        // If execution fails, try spawning a new instance
      }
    }

    // Spawn a new agent
    const spawnRequest: SpawnRequest = {
      agentType: taskType,
      priority: options.priority ?? 5,
      waitForHealth: true,
      tokenTracking: true
    };

    if (task !== undefined) {
      spawnRequest.task = task;
    }

    if (options.timeout !== undefined) {
      spawnRequest.timeout = options.timeout;
    }

    return this.spawnAgent(spawnRequest);
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string, graceful: boolean = true): Promise<void> {
    await this.lifecycleManager.stopAgent(agentId, graceful);
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId: string): AgentInstance | null {
    return this.lifecycleManager.getAgentStatus(agentId);
  }

  /**
   * Get all agents status
   */
  getAllAgentsStatus(): Map<string, AgentInstance> {
    return this.lifecycleManager.getAllAgentsStatus();
  }

  /**
   * Get healthy agents
   */
  getHealthyAgents(): AgentInstance[] {
    return this.lifecycleManager.getHealthyAgents();
  }

  /**
   * Get active spawns
   */
  getActiveSpawns(): Map<string, SpawnRequest> {
    return new Map(this.activeSpawns);
  }

  /**
   * Get spawn queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeSpawns: number;
    maxConcurrent: number;
    } {
    return {
      queueLength: this.spawnQueue.length,
      activeSpawns: this.activeSpawns.size,
      maxConcurrent: this.maxConcurrentSpawns
    };
  }

  /**
   * Cleanup all agents
   */
  async cleanup(): Promise<void> {
    await this.lifecycleManager.cleanup();
    this.spawnQueue = [];
    this.activeSpawns.clear();
  }

  /**
   * Get resource requirements for agent type
   */
  private getResourceRequirements(agentType: string): ResourceRequirements {
    const requirements: Record<string, ResourceRequirements> = {
      'robo-developer': {
        memoryMB: 512,
        cpuCores: 1,
        maxExecutionTime: 300000, // 5 minutes
        requiresNetwork: true,
        requiresFileSystem: true,
        parallelizable: false
      },
      'robo-quality-control': {
        memoryMB: 256,
        cpuCores: 1,
        maxExecutionTime: 180000, // 3 minutes
        requiresNetwork: false,
        requiresFileSystem: true,
        parallelizable: true
      },
      'robo-system-analyst': {
        memoryMB: 1024,
        cpuCores: 2,
        maxExecutionTime: 600000, // 10 minutes
        requiresNetwork: true,
        requiresFileSystem: true,
        parallelizable: false
      },
      'robo-devops-sre': {
        memoryMB: 512,
        cpuCores: 1,
        maxExecutionTime: 300000, // 5 minutes
        requiresNetwork: true,
        requiresFileSystem: true,
        parallelizable: true
      },
      'robo-ux-ui-designer': {
        memoryMB: 768,
        cpuCores: 1,
        maxExecutionTime: 240000, // 4 minutes
        requiresNetwork: true,
        requiresFileSystem: false,
        parallelizable: false
      }
    };

    const defaultRequirements = requirements['robo-developer'];
    if (!defaultRequirements) {
      throw new Error('Default robo-developer requirements not found');
    }
    return requirements[agentType] ?? defaultRequirements;
  }

  /**
   * Get token limits for agent type
   */
  private getTokenLimits(agentType: string): TokenLimits {
    const limits: Record<string, TokenLimits> = {
      'robo-developer': {
        dailyLimit: 100000,
        perRequestLimit: 5000,
        costLimit: 10.0,
        alertThresholds: {
          warning: 70,
          critical: 90
        }
      },
      'robo-quality-control': {
        dailyLimit: 50000,
        perRequestLimit: 2000,
        costLimit: 5.0,
        alertThresholds: {
          warning: 70,
          critical: 90
        }
      },
      'robo-system-analyst': {
        dailyLimit: 200000,
        perRequestLimit: 10000,
        costLimit: 20.0,
        alertThresholds: {
          warning: 70,
          critical: 90
        }
      },
      'robo-devops-sre': {
        dailyLimit: 75000,
        perRequestLimit: 3000,
        costLimit: 7.5,
        alertThresholds: {
          warning: 70,
          critical: 90
        }
      },
      'robo-ux-ui-designer': {
        dailyLimit: 60000,
        perRequestLimit: 2500,
        costLimit: 6.0,
        alertThresholds: {
          warning: 70,
          critical: 90
        }
      }
    };

    const defaultLimits = limits['robo-developer'];
    if (!defaultLimits) {
      throw new Error('Default robo-developer limits not found');
    }
    return limits[agentType] ?? defaultLimits;
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(agentType: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${agentType}-${timestamp}-${random}`;
  }

  /**
   * Get available agent types
   */
  private getAvailableAgentTypes(): string[] {
    // In a real implementation, this would check available agent classes
    return [
      'robo-developer',
      'robo-quality-control',
      'robo-system-analyst',
      'robo-devops-sre',
      'robo-ux-ui-designer'
    ];
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.lifecycleManager.on('agent_spawned', ({ agentId }) => {
      spawnerLogger.info(`Agent spawned: ${agentId}`);
    });

    this.lifecycleManager.on('agent_spawn_failed', ({ agentId, error }) => {
      spawnerLogger.error(`Agent spawn failed: ${agentId}`, error);
    });

    this.lifecycleManager.on('task_completed', ({ agentId, duration, tokensUsed, cost }) => {
      spawnerLogger.info(
        `Task completed by ${agentId}: ${duration}ms, ${tokensUsed} tokens, $${cost.toFixed(4)}`
      );
    });

    this.lifecycleManager.on('task_failed', ({ agentId, error, duration }) => {
      spawnerLogger.error(`Task failed by ${agentId}: ${duration}ms`, error);
    });

    this.lifecycleManager.on('agent_unhealthy', ({ agentId, consecutiveFailures }) => {
      spawnerLogger.warn(`Agent ${agentId} unhealthy (${consecutiveFailures} failures)`);
    });
  }
}

/**
 * Priority Manager - manages task priority and agent selection
 */
export class PriorityManager {
  private taskQueue: Array<{ task: AgentTask | string; priority: number; agentType?: string }> = [];
  private maxQueueSize: number;

  constructor(maxQueueSize: number = 100) {
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Add task to queue
   */
  addTask(task: AgentTask | string, priority: number, agentType?: string): boolean {
    if (this.taskQueue.length >= this.maxQueueSize) {
      return false; // Queue full
    }

    const taskItem: { task: AgentTask | string; priority: number; agentType?: string } = {
      task,
      priority
    };

    if (agentType !== undefined) {
      taskItem.agentType = agentType;
    }

    this.taskQueue.push(taskItem);
    this.taskQueue.sort((a, b) => b.priority - a.priority); // Sort by priority (high first)

    return true;
  }

  /**
   * Get next task for agent type
   */
  getNextTask(agentType?: string): { task: AgentTask | string; priority: number } | null {
    // Find highest priority task for this agent type
    if (agentType) {
      const index = this.taskQueue.findIndex(
        (item) => !item.agentType || item.agentType === agentType
      );
      if (index !== -1) {
        const item = this.taskQueue.splice(index, 1)[0];
        if (item) {
          return { task: item.task, priority: item.priority };
        }
      }
    }

    // Find highest priority task without agent type restriction
    const index = this.taskQueue.findIndex((item) => !item.agentType);
    if (index !== -1) {
      const item = this.taskQueue.splice(index, 1)[0];
      if (item) {
        return { task: item.task, priority: item.priority };
      }
    }

    // Return highest priority task
    if (this.taskQueue.length > 0) {
      const item = this.taskQueue.shift();
      if (item) {
        return { task: item.task, priority: item.priority };
      }
    }

    return null;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    totalTasks: number;
    tasksByType: Record<string, number>;
    averagePriority: number;
    } {
    const tasksByType: Record<string, number> = {};
    let totalPriority = 0;

    this.taskQueue.forEach((item) => {
      const type = item.agentType ?? 'any';
      tasksByType[type] = (tasksByType[type] ?? 0) + 1;
      totalPriority += item.priority;
    });

    return {
      totalTasks: this.taskQueue.length,
      tasksByType,
      averagePriority: this.taskQueue.length > 0 ? totalPriority / this.taskQueue.length : 0
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.taskQueue = [];
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.taskQueue.length;
  }
}

/**
 * Enhanced AgentSpawner with signal-based spawning capabilities
 */
export class SignalBasedAgentSpawner extends AgentSpawner {
  private signalHistory: Map<string, Array<{ timestamp: Date; agentType?: string }>> = new Map();
  private agentUsage: Map<string, { count: number; lastUsed: Date }> = new Map();
  private maxConcurrentByType: Map<string, number> = new Map();

  constructor(tokenMetricsStream?: TokenMetricsStream, maxConcurrentSpawns: number = 5) {
    super(tokenMetricsStream, maxConcurrentSpawns);
    this.initializeConcurrentLimits();
  }

  /**
   * Initialize concurrent limits by agent type
   */
  private initializeConcurrentLimits(): void {
    this.maxConcurrentByType.set('robo-developer', 3);
    this.maxConcurrentByType.set('robo-quality-control', 2);
    this.maxConcurrentByType.set('robo-system-analyst', 1);
    this.maxConcurrentByType.set('robo-devops-sre', 2);
    this.maxConcurrentByType.set('robo-ux-ui-designer', 1);
  }

  /**
   * Make spawning decision based on signal
   */
  makeSpawnDecision(signal: string, _context?: SignalBasedSpawnRequest['context']): SpawnDecision {
    const currentAgents = Array.from(this.getAllAgentsStatus().values());
    const agentTypes = SIGNAL_AGENT_MAPPING[signal];

    // Check if signal maps to any agent types
    if (!agentTypes || agentTypes.length === 0) {
      return {
        shouldSpawn: false,
        reason: `No agent mapping found for signal: ${signal}`,
        priority: 0,
        alternativeAgents: this.getAvailableAgentTypes()
      };
    }

    // Select best agent type based on current conditions
    const selectedAgentType = this.selectBestAgentType(agentTypes, signal, currentAgents);

    // Check if we can spawn another agent of this type
    const canSpawn = this.canSpawnAgentOfType(selectedAgentType, currentAgents);

    if (!canSpawn) {
      // Find alternatives
      const alternatives = agentTypes.filter(
        (type) => type !== selectedAgentType && this.canSpawnAgentOfType(type, currentAgents)
      );

      return {
        shouldSpawn: alternatives.length > 0,
        agentType: alternatives[0],
        reason:
          alternatives.length > 0
            ? `Primary agent ${selectedAgentType} at capacity, using alternative`
            : `All mapped agents at capacity for signal: ${signal}`,
        priority: SIGNAL_PRIORITY[signal] ?? 5,
        alternativeAgents: alternatives
      };
    }

    return {
      shouldSpawn: true,
      agentType: selectedAgentType,
      reason: `Signal ${signal} requires ${selectedAgentType} capabilities`,
      priority: SIGNAL_PRIORITY[signal] ?? 5,
      alternativeAgents: agentTypes.filter((type) => type !== selectedAgentType)
    };
  }

  /**
   * Spawn agent based on signal
   */
  async spawnAgentForSignal(request: SignalBasedSpawnRequest): Promise<SpawnResult> {
    const decision = this.makeSpawnDecision(request.signal, request.context);

    if (!decision.shouldSpawn || !decision.agentType) {
      return {
        success: false,
        agentId: '',
        error: decision.reason,
        spawnTime: 0
      };
    }

    // Create enhanced task description
    const taskDescription = this.createTaskDescription(
      request.signal,
      request.context,
      request.task
    );

    const spawnRequest: SpawnRequest = {
      agentType: decision.agentType,
      task: taskDescription,
      priority: request.priority ?? decision.priority,
      timeout: request.timeout,
      waitForHealth: request.waitForHealth ?? true,
      tokenTracking: request.tokenTracking ?? true,
      metadata: {
        signal: request.signal,
        context: request.context,
        spawnReason: decision.reason,
        ...request.metadata
      }
    };

    const result = await this.spawnAgent(spawnRequest);

    // Record the spawn for tracking
    if (result.success) {
      this.recordSpawn(request.signal, decision.agentType);
    }

    return result;
  }

  /**
   * Select best agent type from available options
   */
  private selectBestAgentType(
    agentTypes: string[],
    signal: string,
    currentAgents: AgentInstance[]
  ): string {
    // Score each agent type
    const scoredAgents = agentTypes.map((agentType) => ({
      agentType,
      score: this.calculateAgentScore(agentType, signal, currentAgents)
    }));

    // Sort by score (highest first) and return the best
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agentType;
  }

  /**
   * Calculate agent score for selection
   */
  private calculateAgentScore(
    agentType: string,
    signal: string,
    currentAgents: AgentInstance[]
  ): number {
    let score = 100; // Base score

    // Check current usage of this agent type
    const currentAgentsOfType = currentAgents.filter(
      (agent) => agent.config.type === agentType && agent.status.state === 'running'
    ).length;

    // Penalize heavily used agents
    const maxConcurrent = this.maxConcurrentByType.get(agentType) ?? 2;
    const usageRatio = currentAgentsOfType / maxConcurrent;
    score -= usageRatio * 50; // Heavy penalty for high usage

    // Consider recent usage patterns
    const usage = this.agentUsage.get(agentType);
    if (usage) {
      const hoursSinceLastUse = (Date.now() - usage.lastUsed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastUse < 1) {
        score -= usage.count * 10; // Penalty for very recent use
      } else if (hoursSinceLastUse < 6) {
        score -= usage.count * 5; // Moderate penalty
      } else if (hoursSinceLastUse > 24) {
        score += 20; // Bonus for agents not used recently
      }
    }

    // Consider agent health and success rate
    const agentsOfThisType = currentAgents.filter((agent) => agent.config.type === agentType);
    if (agentsOfThisType.length > 0) {
      const avgSuccessRate =
        agentsOfThisType.reduce((sum, agent) => {
          const successRate =
            agent.metrics.totalRuns > 0
              ? agent.metrics.successfulRuns / agent.metrics.totalRuns
              : 0;
          return sum + successRate;
        }, 0) / agentsOfThisType.length;

      score += avgSuccessRate * 20; // Bonus for high success rate
    }

    return Math.max(0, score);
  }

  /**
   * Check if we can spawn another agent of the specified type
   */
  private canSpawnAgentOfType(agentType: string, currentAgents: AgentInstance[]): boolean {
    const maxConcurrent = this.maxConcurrentByType.get(agentType) ?? 2;
    const currentRunning = currentAgents.filter(
      (agent) => agent.config.type === agentType && agent.status.state === 'running'
    ).length;

    return currentRunning < maxConcurrent;
  }

  /**
   * Create task description from signal and context
   */
  private createTaskDescription(
    signal: string,
    context?: SignalBasedSpawnRequest['context'],
    task?: AgentTask | string
  ): AgentTask | string {
    if (task) {
      return task;
    }

    const baseDescription = `Handle signal: ${signal}`;
    const contextParts: string[] = [];

    if (context?.prpId) {
      contextParts.push(`PRP: ${context.prpId}`);
    }

    if (context?.filePath) {
      contextParts.push(`File: ${context.filePath}`);
    }

    if (context?.description) {
      contextParts.push(`Description: ${context.description}`);
    }

    const fullDescription =
      contextParts.length > 0 ? `${baseDescription} (${contextParts.join(', ')})` : baseDescription;

    return {
      type: 'signal-response',
      payload: {
        signal,
        context,
        description: fullDescription
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'signal-spawner'
      }
    };
  }

  /**
   * Record agent spawn for tracking and analytics
   */
  private recordSpawn(signal: string, agentType: string): void {
    // Update signal history
    const history = this.signalHistory.get(signal) ?? [];
    history.push({
      timestamp: new Date(),
      agentType
    });

    // Keep only last 50 entries per signal
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    this.signalHistory.set(signal, history);

    // Update agent usage
    const usage = this.agentUsage.get(agentType) ?? { count: 0, lastUsed: new Date() };
    usage.count++;
    usage.lastUsed = new Date();
    this.agentUsage.set(agentType, usage);

    spawnerLogger.info('Agent spawn recorded', {
      signal,
      agentType,
      totalUsage: usage.count,
      signalFrequency: history.length
    });
  }

  /**
   * Get spawning statistics and analytics
   */
  getSpawningAnalytics(): {
    signalFrequency: Record<string, number>;
    agentUsage: Record<string, { count: number; lastUsed: Date }>;
    currentLoad: Record<string, number>;
    recommendations: string[];
    signalHistory: Record<string, Array<{ timestamp: Date; agentType?: string }>>;
    } {
    const signalFrequency: Record<string, number> = {};
    const agentUsage: Record<string, { count: number; lastUsed: Date }> = {};
    const currentLoad: Record<string, number> = {};
    const recommendations: string[] = [];
    const signalHistory: Record<string, Array<{ timestamp: Date; agentType?: string }>> = {};

    // Process signal frequency
    this.signalHistory.forEach((history, signal) => {
      signalFrequency[signal] = history.length;
      signalHistory[signal] = history;
    });

    // Process agent usage
    this.agentUsage.forEach((usage, agentType) => {
      agentUsage[agentType] = { ...usage };
    });

    // Calculate current load
    const currentAgents = Array.from(this.getAllAgentsStatus().values());
    currentAgents.forEach((agent) => {
      if (agent.status.state === 'running') {
        currentLoad[agent.config.type] = (currentLoad[agent.config.type] ?? 0) + 1;
      }
    });

    // Generate recommendations
    const totalSpawns = Object.values(signalFrequency).reduce((sum, count) => sum + count, 0);

    if (totalSpawns > 100) {
      recommendations.push(
        'High agent spawning activity detected - consider workflow optimization'
      );
    }

    if (signalFrequency['[bb]'] > 5) {
      recommendations.push(
        'Frequent blocker signals detected - review development workflow bottlenecks'
      );
    }

    if (agentUsage['robo-developer']?.count > 50) {
      recommendations.push('High robo-developer usage - consider increasing concurrent limit');
    }

    // Check for underutilized agent types
    const unusedAgents = this.getAvailableAgentTypes().filter(
      (type) => !agentUsage[type] || agentUsage[type].count === 0
    );

    if (unusedAgents.length > 0) {
      recommendations.push(`Underutilized agent types: ${unusedAgents.join(', ')}`);
    }

    return {
      signalFrequency,
      agentUsage,
      currentLoad,
      recommendations,
      signalHistory
    };
  }

  /**
   * Get signal to agent mapping information
   */
  getSignalMapping(): {
    mappings: Record<string, string[]>;
    unmappedSignals: string[];
    agentCapabilities: Record<string, string[]>;
    } {
    const allSignals = Object.keys(SIGNAL_PRIORITY);
    const mappedSignals = Object.keys(SIGNAL_AGENT_MAPPING);
    const unmappedSignals = allSignals.filter((signal) => !mappedSignals.includes(signal));

    return {
      mappings: SIGNAL_AGENT_MAPPING,
      unmappedSignals,
      agentCapabilities: this.getAgentCapabilities()
    };
  }

  /**
   * Get agent capabilities (placeholder - should be defined elsewhere)
   */
  private getAgentCapabilities(): Record<string, string[]> {
    return {
      'robo-developer': ['code-development', 'debugging', 'testing', 'linting'],
      'robo-quality-control': ['code-review', 'testing', 'quality-assurance'],
      'robo-system-analyst': ['requirements-analysis', 'system-design', 'research'],
      'robo-devops-sre': ['deployment', 'infrastructure', 'monitoring'],
      'robo-ux-ui-designer': ['ui-design', 'ux-research', 'prototyping']
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStatistics(): void {
    this.signalHistory.clear();
    this.agentUsage.clear();
    spawnerLogger.info('Spawning statistics reset');
  }
}
