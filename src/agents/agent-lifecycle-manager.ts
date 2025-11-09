/**
 * ♫ Agent Lifecycle Management System
 *
 * Manages the complete lifecycle of agents including spawning,
 * health monitoring, resource allocation, and cleanup.
 */

import { EventEmitter } from 'events';
import type { BaseAgent } from './base-agent.js';
import { TokenMetricsStream } from '../monitoring/TokenMetricsStream.js';
import { TokenDataPoint } from '../types/token-metrics.js';

export interface AgentConfig {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  priority: number; // 1-10, higher is more priority
  resourceRequirements: ResourceRequirements;
  healthCheck: HealthCheckConfig;
  tokenLimits: TokenLimits;
}

export interface ResourceRequirements {
  memoryMB: number;
  cpuCores: number;
  maxExecutionTime: number; // milliseconds
  requiresNetwork: boolean;
  requiresFileSystem: boolean;
  parallelizable: boolean;
}

export interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  maxFailures: number;
  pingEndpoint?: string;
}

export interface TokenLimits {
  dailyLimit: number;
  perRequestLimit: number;
  costLimit: number;
  alertThresholds: {
    warning: number; // percentage
    critical: number; // percentage
  };
}

export interface AgentInstance {
  config: AgentConfig;
  agent: BaseAgent;
  status: AgentLifecycleStatus;
  metrics: AgentLifecycleMetrics;
  health: AgentHealthStatus;
  createdAt: Date;
  lastStarted: Date;
  startTime?: Date;
}

export interface AgentLifecycleStatus {
  state: 'stopped' | 'starting' | 'running' | 'paused' | 'stopping' | 'error';
  progress: number; // 0-100
  currentTask?: string;
  exitCode?: number;
  errorMessage?: string;
}

export interface AgentLifecycleMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageRunTime: number;
  totalTokensUsed: number;
  totalCost: number;
  lastRunAt?: Date;
  lastRunDuration?: number;
  uptime: number;
}

export interface AgentHealthStatus {
  isHealthy: boolean;
  lastPing?: Date;
  responseTime?: number;
  consecutiveFailures: number;
  lastError?: string;
  nextCheckAt: Date;
}

export interface AgentSpawningOptions {
  waitForHealth?: boolean;
  timeoutMs?: number;
  tokenTracking?: boolean;
  resourceAllocation?: 'auto' | 'manual';
}

export interface AgentExecutionResult {
  success: boolean;
  duration: number;
  tokensUsed: number;
  cost: number;
  output: any;
  error?: string;
}

/**
 * Agent Lifecycle Manager - Centralized agent management system
 */
export class AgentLifecycleManager extends EventEmitter {
  private agents: Map<string, AgentInstance> = new Map();
  private tokenMetricsStream: TokenMetricsStream;
  private healthCheckTimer?: NodeJS.Timeout;
  private resourceMonitor: ResourceMonitor;

  constructor(tokenMetricsStream?: TokenMetricsStream) {
    super();
    this.tokenMetricsStream = tokenMetricsStream || new TokenMetricsStream();
    this.resourceMonitor = new ResourceMonitor();
    this.startHealthChecks();
  }

  /**
   * Register a new agent configuration
   */
  registerAgent(config: AgentConfig): void {
    if (this.agents.has(config.id)) {
      throw new Error(`Agent ${config.id} is already registered`);
    }

    const agentInstance: AgentInstance = {
      config,
      agent: null as any, // Will be created on spawn
      status: {
        state: 'stopped',
        progress: 0
      },
      metrics: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageRunTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        uptime: 0
      },
      health: {
        isHealthy: true,
        consecutiveFailures: 0,
        nextCheckAt: new Date()
      },
      createdAt: new Date(),
      lastStarted: new Date()
    };

    this.agents.set(config.id, agentInstance);
    this.emit('agent_registered', { agentId: config.id, config });
  }

  /**
   * Spawn an agent instance
   */
  async spawnAgent(agentId: string, options: AgentSpawningOptions = {}): Promise<void> {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    if (instance.status.state !== 'stopped') {
      throw new Error(`Agent ${agentId} is already running (state: ${instance.status.state})`);
    }

    if (!this.checkResourceAvailability(instance.config.resourceRequirements)) {
      throw new Error(`Insufficient resources to spawn agent ${agentId}`);
    }

    try {
      // Update status
      instance.status.state = 'starting';
      instance.status.progress = 0;
      this.emit('agent_spawning', { agentId, instance });

      // Load and create agent instance
      const AgentClass = await this.loadAgentClass(instance.config.type);
      instance.agent = new AgentClass();

      // Initialize agent
      await instance.agent.initialize();

      // Setup token tracking if enabled
      if (options.tokenTracking) {
        this.setupTokenTracking(instance);
      }

      // Update status
      instance.status.state = 'running';
      instance.status.progress = 100;
      instance.startTime = new Date();
      instance.lastStarted = new Date();

      // Wait for health check if requested
      if (options.waitForHealth) {
        await this.waitForHealthCheck(agentId, options.timeoutMs || 30000);
      }

      this.emit('agent_spawned', { agentId, instance });

    } catch (error) {
      instance.status.state = 'error';
      instance.status.errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('agent_spawn_failed', { agentId, error });
      throw error;
    }
  }

  /**
   * Stop an agent instance
   */
  async stopAgent(agentId: string, graceful: boolean = true): Promise<void> {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    if (instance.status.state === 'stopped') {
      return; // Already stopped
    }

    try {
      instance.status.state = 'stopping';
      this.emit('agent_stopping', { agentId, graceful });

      if (instance.agent) {
        if (graceful) {
          // Graceful shutdown with timeout
          await Promise.race([
            instance.agent.shutdown(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Shutdown timeout')), 30000)
            )
          ]);
        } else {
          // Force shutdown
          await instance.agent.shutdown();
        }
      }

      // Update metrics
      if (instance.startTime) {
        const runDuration = Date.now() - instance.startTime.getTime();
        this.updateRunMetrics(instance, runDuration, false);
      }

      instance.status.state = 'stopped';
      instance.status.progress = 0;
      instance.startTime = undefined;

      this.emit('agent_stopped', { agentId, instance });

    } catch (error) {
      instance.status.state = 'error';
      instance.status.errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('agent_stop_failed', { agentId, error });
      throw error;
    }
  }

  /**
   * Execute a task on an agent
   */
  async executeTask(agentId: string, task: any, options: {
    timeout?: number;
    trackTokens?: boolean;
    priority?: number;
  } = {}): Promise<AgentExecutionResult> {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    if (instance.status.state !== 'running') {
      throw new Error(`Agent ${agentId} is not running (state: ${instance.status.state})`);
    }

    const startTime = Date.now();
    let tokensUsed = 0;
    let cost = 0;
    let result: any;
    let error: string | undefined;

    // Setup token tracking if requested (declare outside try to be accessible in finally)
    let tokenUnsubscribe: (() => void) | undefined;

    try {
      // Update current task
      instance.status.currentTask = typeof task === 'string' ? task : JSON.stringify(task).substring(0, 100);

      if (options.trackTokens) {
        tokenUnsubscribe = this.trackTaskTokens(agentId, (tokensDelta) => {
          tokensUsed += tokensDelta;
        });
      }

      // Execute task with timeout
      const timeout = options.timeout || instance.config.resourceRequirements.maxExecutionTime;
      result = await Promise.race([
        instance.agent.process(task),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Task execution timeout')), timeout)
        )
      ]);

      // Calculate cost (simplified)
      cost = this.calculateCost(tokensUsed, instance.config.type);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateRunMetrics(instance, duration, true, tokensUsed, cost);

      this.emit('task_completed', { agentId, task, result, duration, tokensUsed, cost });

      return {
        success: true,
        duration,
        tokensUsed,
        cost,
        output: result
      };

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      const duration = Date.now() - startTime;

      // Update metrics for failed run
      this.updateRunMetrics(instance, duration, false, tokensUsed, cost);

      this.emit('task_failed', { agentId, task, error: err, duration, tokensUsed });

      return {
        success: false,
        duration,
        tokensUsed,
        cost,
        output: null,
        error
      };

    } finally {
      // Cleanup
      if (tokenUnsubscribe) {
        tokenUnsubscribe();
      }
      instance.status.currentTask = undefined;
    }
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId: string): AgentInstance | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get all agents status
   */
  getAllAgentsStatus(): Map<string, AgentInstance> {
    return new Map(this.agents);
  }

  /**
   * Get healthy agents
   */
  getHealthyAgents(): AgentInstance[] {
    return Array.from(this.agents.values()).filter(
      instance => instance.health.isHealthy && instance.status.state === 'running'
    );
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: string): AgentInstance[] {
    return Array.from(this.agents.values()).filter(
      instance => instance.config.type === type
    );
  }

  /**
   * Get best agent for task based on priority and health
   */
  getBestAgent(taskType?: string): AgentInstance | null {
    const healthyAgents = this.getHealthyAgents();

    if (healthyAgents.length === 0) {
      return null;
    }

    // Sort by priority (higher first) and then by recent success rate
    return healthyAgents
      .filter(agent => !taskType || agent.config.type === taskType)
      .sort((a, b) => {
        // First by priority
        if (a.config.priority !== b.config.priority) {
          return b.config.priority - a.config.priority;
        }

        // Then by success rate
        const aSuccessRate = a.metrics.totalRuns > 0 ? a.metrics.successfulRuns / a.metrics.totalRuns : 0;
        const bSuccessRate = b.metrics.totalRuns > 0 ? b.metrics.successfulRuns / b.metrics.totalRuns : 0;

        return bSuccessRate - aSuccessRate;
      })[0] || null;
  }

  /**
   * Remove an agent
   */
  async removeAgent(agentId: string): Promise<void> {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    // Stop if running
    if (instance.status.state !== 'stopped') {
      await this.stopAgent(agentId, false);
    }

    this.agents.delete(agentId);
    this.emit('agent_removed', { agentId, instance });
  }

  /**
   * Cleanup all agents
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const stopPromises = Array.from(this.agents.keys()).map(agentId =>
      this.stopAgent(agentId, false).catch(err =>
        console.error(`Failed to stop agent ${agentId}:`, err)
      )
    );

    await Promise.allSettled(stopPromises);
    this.agents.clear();
    this.removeAllListeners();
  }

  /**
   * Load agent class dynamically
   */
  private async loadAgentClass(type: string): Promise<any> {
    // Try to load a specific agent type
    try {
      const module = await import(`./${type}.js`);
      const AgentClass = module.default || module[type];

      if (typeof AgentClass !== 'function') {
        throw new Error(`Invalid agent class for type: ${type}`);
      }

      return AgentClass;
    } catch {
      // Fallback to RoboDeveloper as default
      const module = await import('./robo-developer.js');
      return module.RoboDeveloper;
    }
  }

  /**
   * Check resource availability
   */
  private checkResourceAvailability(requirements: ResourceRequirements): boolean {
    return this.resourceMonitor.checkAvailability(requirements);
  }

  /**
   * Setup token tracking for agent
   */
  private setupTokenTracking(instance: AgentInstance): void {
    this.tokenMetricsStream.subscribe(instance.config.id, (data: TokenDataPoint) => {
      instance.metrics.totalTokensUsed += data.tokensUsed;
      instance.metrics.totalCost += data.cost || 0;
    });
  }

  /**
   * Track tokens during task execution
   */
  private trackTaskTokens(agentId: string, callback: (tokens: number) => void): () => void {
    let lastTokens = 0;

    const tokenCallback = (data: TokenDataPoint) => {
      const tokensDelta = data.tokensUsed - lastTokens;
      if (tokensDelta > 0) {
        callback(tokensDelta);
        lastTokens = data.tokensUsed;
      }
    };

    // Subscribe to token stream
    this.tokenMetricsStream.subscribe(agentId, tokenCallback);

    // Return unsubscribe function
    return (): void => {
      this.tokenMetricsStream.unsubscribe(agentId, tokenCallback);
    };
  }

  /**
   * Calculate cost based on tokens and agent type
   */
  private calculateCost(tokens: number, agentType: string): number {
    // Simplified cost calculation - in real implementation this would use actual pricing
    const costPerToken = {
      'robo-developer': 0.00001,
      'robo-quality-control': 0.000008,
      'robo-system-analyst': 0.000012,
      'robo-devops-sre': 0.000009,
      'robo-ux-ui-designer': 0.000007
    };

    return tokens * (costPerToken[agentType as keyof typeof costPerToken] || 0.00001);
  }

  /**
   * Update run metrics
   */
  private updateRunMetrics(
    instance: AgentInstance,
    duration: number,
    success: boolean,
    tokens: number = 0,
    cost: number = 0
  ): void {
    instance.metrics.totalRuns++;
    if (success) {
      instance.metrics.successfulRuns++;
    } else {
      instance.metrics.failedRuns++;
    }

    // Update average run time
    const totalDuration = instance.metrics.averageRunTime * (instance.metrics.totalRuns - 1) + duration;
    instance.metrics.averageRunTime = totalDuration / instance.metrics.totalRuns;

    // Update token and cost metrics
    instance.metrics.totalTokensUsed += tokens;
    instance.metrics.totalCost += cost;
    instance.metrics.lastRunAt = new Date();
    instance.metrics.lastRunDuration = duration;

    // Update uptime if agent is still running
    if (instance.startTime) {
      instance.metrics.uptime = Date.now() - instance.startTime.getTime();
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health checks on all running agents
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.agents.values())
      .filter(instance => instance.status.state === 'running' && instance.config.healthCheck.enabled)
      .map(instance => this.checkAgentHealth(instance.config.id));

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Check health of a specific agent
   */
  private async checkAgentHealth(agentId: string): Promise<void> {
    const instance = this.agents.get(agentId);
    if (!instance?.agent) {
      return;
    }

    const config = instance.config.healthCheck;
    const startTime = Date.now();

    try {
      // Simple health check - in real implementation this could ping an endpoint
      // or call a health method on the agent
      await Promise.race([
        Promise.resolve(), // Replace with actual health check
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), config.timeoutMs)
        )
      ]);

      const responseTime = Date.now() - startTime;

      // Update health status
      instance.health.isHealthy = true;
      instance.health.lastPing = new Date();
      instance.health.responseTime = responseTime;
      instance.health.consecutiveFailures = 0;
      instance.health.lastError = undefined;

      this.emit('agent_healthy', { agentId, responseTime });

    } catch (error) {
      instance.health.consecutiveFailures++;
      instance.health.lastError = error instanceof Error ? error.message : String(error);
      instance.health.lastPing = new Date();

      // Mark as unhealthy if too many failures
      if (instance.health.consecutiveFailures >= config.maxFailures) {
        instance.health.isHealthy = false;
        this.emit('agent_unhealthy', { agentId, error, consecutiveFailures: instance.health.consecutiveFailures });
      }
    } finally {
      instance.health.nextCheckAt = new Date(Date.now() + config.intervalMs);
    }
  }

  /**
   * Wait for health check completion
   */
  private async waitForHealthCheck(agentId: string, timeoutMs: number): Promise<void> {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (instance.health.isHealthy) {
        return;
      }

      if (instance.health.consecutiveFailures > 0) {
        throw new Error(`Agent ${agentId} failed health check`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Health check timeout for agent ${agentId}`);
  }
}

/**
 * Resource Monitor - manages system resources for agents
 */
class ResourceMonitor {
  private allocatedResources: Map<string, ResourceRequirements> = new Map();

  checkAvailability(requirements: ResourceRequirements): boolean {
    // Simplified resource checking - in real implementation this would check actual system resources
    const totalAllocated = Array.from(this.allocatedResources.values()).reduce(
      (acc, req) => ({
        memoryMB: acc.memoryMB + req.memoryMB,
        cpuCores: acc.cpuCores + req.cpuCores
      }),
      { memoryMB: 0, cpuCores: 0 }
    );

    // Assume we have 8GB RAM and 4 CPU cores available
    const availableMemory = 8192; // 8GB in MB
    const availableCpuCores = 4;

    return (
      totalAllocated.memoryMB + requirements.memoryMB <= availableMemory &&
      totalAllocated.cpuCores + requirements.cpuCores <= availableCpuCores
    );
  }

  allocate(agentId: string, requirements: ResourceRequirements): void {
    this.allocatedResources.set(agentId, requirements);
  }

  deallocate(agentId: string): void {
    this.allocatedResources.delete(agentId);
  }
}