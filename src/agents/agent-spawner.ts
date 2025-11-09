/**
 * ♫ Agent Spawner Utility
 *
 * High-level interface for spawning and managing agents with
 * automatic resource allocation and health monitoring.
 */

import { AgentLifecycleManager, AgentConfig, AgentSpawningOptions, AgentInstance } from './agent-lifecycle-manager.js';
import { TokenMetricsStream } from '../monitoring/TokenMetricsStream.js';

export interface SpawnRequest {
  agentType: string;
  task?: unknown;
  priority: number;
  timeout?: number;
  waitForHealth?: boolean;
  tokenTracking?: boolean;
  metadata?: Record<string, unknown>;
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

// Interface for resource requirements
interface ResourceRequirements {
  memoryMB: number;
  cpuCores: number;
  maxExecutionTime: number;
  requiresNetwork: boolean;
  requiresFileSystem: boolean;
  parallelizable: boolean;
}

// Interface for token limits
interface TokenLimits {
  dailyLimit: number;
  perRequestLimit: number;
  costLimit: number;
  alertThresholds: {
    warning: number;
    critical: number;
  };
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
    this.tokenMetricsStream = tokenMetricsStream || new TokenMetricsStream();
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
        timeoutMs: request.timeout || 60000,
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
        executionResult = await this.lifecycleManager.executeTask(agentId, request.task, {
          timeout: request.timeout,
          trackTokens: request.tokenTracking,
          priority: request.priority
        });
        executionTime = Date.now() - execStartTime;
      }

      this.activeSpawns.delete(agentId);

      if (!instance) {
        throw new Error(`Failed to spawn agent: ${agentId}`);
      }

      return {
        success: true,
        agentId,
        instance,
        executionResult,
        spawnTime,
        executionTime
      };

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
      const batchResults = await Promise.all(
        batch.map(request => this.spawnAgent(request))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Spawn the best agent for a task type
   */
  async spawnBestAgent(taskType: string, task?: unknown, options: {
    priority?: number;
    timeout?: number;
  } = {}): Promise<SpawnResult> {
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
    if (bestInstance) {
      try {
        const execStartTime = Date.now();
        const result = await this.lifecycleManager.executeTask(bestInstance.config.id, task, {
          timeout: options.timeout,
          trackTokens: true,
          priority: options.priority || 5
        });

        return {
          success: true,
          agentId: bestInstance.config.id,
          instance: bestInstance,
          executionResult: result,
          spawnTime: 0,
          executionTime: Date.now() - execStartTime
        };
      } catch (_error) {
        // If execution fails, try spawning a new instance
      }
    }

    // Spawn a new agent
    const spawnRequest: SpawnRequest = {
      agentType: taskType,
      task,
      priority: options.priority || 5,
      timeout: options.timeout,
      waitForHealth: true,
      tokenTracking: true
    };

    return await this.spawnAgent(spawnRequest);
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

    return requirements[agentType] ?? requirements['robo-developer']!;
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

    return limits[agentType] ?? limits['robo-developer']!;
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
      console.log(`✅ Agent spawned: ${agentId}`);
    });

    this.lifecycleManager.on('agent_spawn_failed', ({ agentId, error }) => {
      console.error(`❌ Agent spawn failed: ${agentId}`, error);
    });

    this.lifecycleManager.on('task_completed', ({ agentId, duration, tokensUsed, cost }) => {
      console.log(`✅ Task completed by ${agentId}: ${duration}ms, ${tokensUsed} tokens, $${cost.toFixed(4)}`);
    });

    this.lifecycleManager.on('task_failed', ({ agentId, error, duration }) => {
      console.error(`❌ Task failed by ${agentId}: ${duration}ms`, error);
    });

    this.lifecycleManager.on('agent_unhealthy', ({ agentId, consecutiveFailures }) => {
      console.warn(`⚠️ Agent ${agentId} unhealthy (${consecutiveFailures} failures)`);
    });
  }
}

/**
 * Priority Manager - manages task priority and agent selection
 */
export class PriorityManager {
  private taskQueue: Array<{ task: unknown; priority: number; agentType?: string }> = [];
  private maxQueueSize: number;

  constructor(maxQueueSize: number = 100) {
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Add task to queue
   */
  addTask(task: unknown, priority: number, agentType?: string): boolean {
    if (this.taskQueue.length >= this.maxQueueSize) {
      return false; // Queue full
    }

    this.taskQueue.push({ task, priority, agentType });
    this.taskQueue.sort((a, b) => b.priority - a.priority); // Sort by priority (high first)

    return true;
  }

  /**
   * Get next task for agent type
   */
  getNextTask(agentType?: string): { task: unknown; priority: number } | null {
    // Find highest priority task for this agent type
    if (agentType) {
      const index = this.taskQueue.findIndex(item => !item.agentType || item.agentType === agentType);
      if (index !== -1) {
        const item = this.taskQueue.splice(index, 1)[0];
        if (item) {
          return { task: item.task, priority: item.priority };
        }
      }
    }

    // Find highest priority task without agent type restriction
    const index = this.taskQueue.findIndex(item => !item.agentType);
    if (index !== -1) {
      const item = this.taskQueue.splice(index, 1)[0];
      if (item) {
        return { task: item.task, priority: item.priority };
      }
    }

    // Return highest priority task
    if (this.taskQueue.length > 0) {
      const item = this.taskQueue.shift()!;
      return { task: item.task, priority: item.priority };
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

    this.taskQueue.forEach(item => {
      const type = item.agentType || 'any';
      tasksByType[type] = (tasksByType[type] || 0) + 1;
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