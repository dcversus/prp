/**
 * ♫ Agent Lifecycle Management System
 *
 * Manages the complete lifecycle of agents including spawning,
 * health monitoring, resource allocation, and cleanup.
 */
import { EventEmitter } from 'events';

import { TokenMetricsStream } from '../shared/monitoring';
import { logger } from '../shared/logger';

import type { TokenDataPoint } from '../shared/types/token-metrics';
import type { BaseAgent, AgentCapabilities, BaseAgentConstructor } from './base-agent';

// Interfaces for dynamic module loading
interface AgentModuleExport {
  default?: BaseAgentConstructor;
  [key: string]: unknown;
}

type AgentConstructor = BaseAgentConstructor;

// Type guards for agent validation
const isValidAgentConstructor = (obj: unknown): obj is AgentConstructor =>
  typeof obj === 'function' &&
  obj !== null &&
  'name' in obj &&
  typeof obj.name === 'string' &&
  'prototype' in obj &&
  obj.prototype !== null;

const isValidAgentModule = (module: unknown): module is AgentModuleExport =>
  typeof module === 'object' && module !== null;

const agentLogger = logger;
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
  agent: BaseAgent | null;
  status: AgentLifecycleStatus;
  metrics: AgentLifecycleMetrics;
  health: AgentHealthStatus;
  capabilities: AgentCapabilities;
  performance: AgentPerformanceMetrics;
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
  output: unknown;
  error?: string;
}
/**
 * Interface for agent tasks
 */
export interface AgentTask {
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
}
// Use AgentCapabilities from base-agent.ts to avoid duplication
export interface AgentHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  lastHealthCheck: Date;
}
export interface AgentPerformanceMetrics {
  taskCompletionRate: number;
  averageTaskDuration: number;
  tokensUsedPerTask: number;
  costPerTask: number;
  successRate: number;
  errorFrequency: Record<string, number>;
}
/**
 * Agent Lifecycle Manager - Centralized agent management system
 */
export class AgentLifecycleManager extends EventEmitter {
  private readonly agents = new Map<string, AgentInstance>();
  private readonly tokenMetricsStream: TokenMetricsStream;
  private healthCheckTimer?: ReturnType<typeof setTimeout>;
  private readonly resourceMonitor: ResourceMonitor;
  constructor(tokenMetricsStream?: TokenMetricsStream) {
    super();
    this.tokenMetricsStream = tokenMetricsStream ?? new TokenMetricsStream();
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
      agent: null, // Will be created on spawn
      status: {
        state: 'stopped',
        progress: 0,
      },
      metrics: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageRunTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        uptime: 0,
      },
      health: {
        isHealthy: true,
        consecutiveFailures: 0,
        nextCheckAt: new Date(),
      },
      capabilities: this.getAgentCapabilities(config.type),
      performance: {
        taskCompletionRate: 0,
        averageTaskDuration: 0,
        tokensUsedPerTask: 0,
        costPerTask: 0,
        successRate: 0,
        errorFrequency: {},
      },
      createdAt: new Date(),
      lastStarted: new Date(),
    };
    this.agents.set(config.id, agentInstance);
    this.emit('agent_registered', { agentId: config.id, config });
  }
  /**
   * Spawn an agent instance
   */
  async spawnAgent(agentId: string, options: AgentSpawningOptions = {}): Promise<void> {
    const instance = this.agents.get(agentId);
    if (instance === null || instance === undefined) {
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
      instance.agent = new AgentClass({
        id: instance.config.id,
        type: instance.config.type
      });
      // Initialize agent
      await instance.agent.initialize();
      // Setup token tracking if enabled
      if (options.tokenTracking === true) {
        this.setupTokenTracking(instance);
      }
      // Update status
      instance.status.state = 'running';
      instance.status.progress = 100;
      instance.startTime = new Date();
      instance.lastStarted = new Date();
      // Wait for health check if requested
      if (options.waitForHealth === true) {
        await this.waitForHealthCheck(agentId, options.timeoutMs ?? 30000);
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
  async stopAgent(agentId: string, graceful = true): Promise<void> {
    const instance = this.agents.get(agentId);
    if (instance === null || instance === undefined) {
      throw new Error(`Agent ${agentId} is not registered`);
    }
    if (instance.status.state === 'stopped') {
      return; // Already stopped
    }
    try {
      instance.status.state = 'stopping';
      this.emit('agent_stopping', { agentId, graceful });
      if (instance.agent === null || instance.agent === undefined) {
        throw new Error(`Agent instance is null for ${agentId}`);
      }
      if (graceful) {
        // Graceful shutdown with timeout
        await Promise.race([
          instance.agent.shutdown(),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error('Shutdown timeout')), 30000),
          ),
        ]);
      } else {
        // Force shutdown
        await instance.agent.shutdown();
      }
      // Update metrics
      if (instance.startTime) {
        const runDuration = Date.now() - instance.startTime.getTime();
        this.updateRunMetrics(instance, runDuration, false);
      }
      instance.status.state = 'stopped';
      instance.status.progress = 0;
      delete instance.startTime;
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
  async executeTask(
    agentId: string,
    task: AgentTask | string,
    options: {
      timeout?: number;
      trackTokens?: boolean;
      priority?: number;
    } = {},
  ): Promise<AgentExecutionResult> {
    const instance = this.agents.get(agentId);
    if (instance === null || instance === undefined) {
      throw new Error(`Agent ${agentId} is not registered`);
    }
    if (instance.status.state !== 'running') {
      throw new Error(`Agent ${agentId} is not running (state: ${instance.status.state})`);
    }
    const startTime = Date.now();
    // eslint-disable-next-line prefer-const
    let tokensUsed = 0;
    let cost = 0;
    let result: unknown;
    let error: string | undefined;
    // Setup token tracking if requested (declare outside try to be accessible in finally)
    let tokenUnsubscribe: (() => void) | undefined;
    try {
      // Update current task
      instance.status.currentTask =
        typeof task === 'string' ? task : JSON.stringify(task).substring(0, 100);
      if (options.trackTokens === true) {
        tokenUnsubscribe = this.trackTaskTokens(agentId, () => {
          // Note: Token tracking would be implemented here with proper monitoring
        });
      }
      // Execute task with timeout
      const timeout = options.timeout ?? instance.config.resourceRequirements.maxExecutionTime;
      if (instance.agent === null || instance.agent === undefined) {
        throw new Error(`Agent instance is null for ${agentId}`);
      }
      result = await Promise.race([
        instance.agent.process(task),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Task execution timeout')), timeout),
        ),
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
        output: result,
      };
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      const duration = Date.now() - startTime;

      // Re-throw timeout errors as they should be rejected
      if (error === 'Task execution timeout') {
        this.emit('task_failed', { agentId, task, error: err, duration, tokensUsed });
        throw err;
      }

      // Update metrics for failed run
      this.updateRunMetrics(instance, duration, false, tokensUsed, cost);
      this.emit('task_failed', { agentId, task, error: err, duration, tokensUsed });
      return {
        success: false,
        duration,
        tokensUsed,
        cost,
        output: null,
        error,
      };
    } finally {
      // Cleanup
      if (tokenUnsubscribe) {
        tokenUnsubscribe();
      }
      delete instance.status.currentTask;
    }
  }
  /**
   * Get agent status
   */
  getAgentStatus(agentId: string): AgentInstance | null {
    return this.agents.get(agentId) ?? null;
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
      (instance) => instance.health.isHealthy && instance.status.state === 'running',
    );
  }
  /**
   * Get agents by type
   */
  getAgentsByType(type: string): AgentInstance[] {
    return Array.from(this.agents.values()).filter((instance) => instance.config.type === type);
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
    return (
      healthyAgents
        .filter((agent) => (taskType === undefined) || (agent.config.type === taskType))
        .sort((a, b) => {
          // First by priority
          if (a.config.priority !== b.config.priority) {
            return b.config.priority - a.config.priority;
          }
          // Then by success rate
          const aSuccessRate =
            a.metrics.totalRuns > 0 ? a.metrics.successfulRuns / a.metrics.totalRuns : 0;
          const bSuccessRate =
            b.metrics.totalRuns > 0 ? b.metrics.successfulRuns / b.metrics.totalRuns : 0;
          return bSuccessRate - aSuccessRate;
        })[0] ?? null
    );
  }
  /**
   * Remove an agent
   */
  async removeAgent(agentId: string): Promise<void> {
    const instance = this.agents.get(agentId);
    if (instance === null || instance === undefined) {
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
    const stopPromises = Array.from(this.agents.keys()).map((agentId) =>
      this.stopAgent(agentId, false).catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        agentLogger.error('orchestrator', 'agent-lifecycle-manager', `Failed to stop agent ${agentId}:`, error);
        return error;
      }),
    );
    await Promise.allSettled(stopPromises);
    this.agents.clear();
    this.removeAllListeners();
  }
  /**
   * Load agent class dynamically
   */
  private async loadAgentClass(type: string): Promise<AgentConstructor> {
    const tryLoadConstructor = async (modulePath: string, exportName: string): Promise<AgentConstructor | null> => {
      try {
        const module: unknown = await import(modulePath);

        if (!isValidAgentModule(module)) {
          return null;
        }

        // Try default export first
        const defaultConstructor = module.default;
        if (defaultConstructor && isValidAgentConstructor(defaultConstructor)) {
          return defaultConstructor;
        }

        // Try named export
        const namedConstructor = (module as Record<string, unknown>)[exportName];
        if (namedConstructor !== null && namedConstructor !== undefined && isValidAgentConstructor(namedConstructor)) {
          return namedConstructor;
        }

        return null;
      } catch {
        return null;
      }
    };

    // Try to load the specific agent type
    const agentConstructor = await tryLoadConstructor(`./${type}`, type);
    if (agentConstructor) {
      return agentConstructor;
    }

    // Fallback to RoboDeveloper as default
    const fallbackConstructor = await tryLoadConstructor('./robo-developer', 'RoboDeveloper');
    if (fallbackConstructor) {
      return fallbackConstructor;
    }

    throw new Error(`Failed to load agent class for type '${type}'. Neither the specific agent nor RoboDeveloper fallback could be loaded.`);
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
      instance.metrics.totalCost += data.cost ?? 0;
    });
  }
  /**
   * Track tokens during task execution
   */
  private trackTaskTokens(agentId: string, callback: () => void): () => void {
    let lastTokens = 0;
    const tokenCallback = (data: TokenDataPoint) => {
      const _tokensDelta = data.tokensUsed - lastTokens;
      if (_tokensDelta > 0) {
        callback();
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
    const costPerToken: Record<string, number> = {
      'robo-developer': 0.00001,
      'robo-quality-control': 0.000008,
      'robo-system-analyst': 0.000012,
      'robo-devops-sre': 0.000009,
      'robo-ux-ui-designer': 0.000007,
    };
    return tokens * (costPerToken[agentType] ?? 0.00001);
  }
  /**
   * Update run metrics
   */
  private updateRunMetrics(
    instance: AgentInstance,
    duration: number,
    success: boolean,
    tokens = 0,
    cost = 0,
  ): void {
    instance.metrics.totalRuns++;
    if (success) {
      instance.metrics.successfulRuns++;
    } else {
      instance.metrics.failedRuns++;
    }
    // Update average run time
    const totalDuration =
      instance.metrics.averageRunTime * (instance.metrics.totalRuns - 1) + duration;
    instance.metrics.averageRunTime = totalDuration / instance.metrics.totalRuns;
    // Update token and cost metrics
    instance.metrics.totalTokensUsed += tokens;
    instance.metrics.totalCost += cost;
    instance.metrics.lastRunAt = new Date();
    instance.metrics.lastRunDuration = duration;
    // Update performance metrics
    instance.performance.successRate =
      instance.metrics.totalRuns > 0
        ? instance.metrics.successfulRuns / instance.metrics.totalRuns
        : 0;
    instance.performance.taskCompletionRate = instance.performance.successRate;
    instance.performance.averageTaskDuration = instance.metrics.averageRunTime;
    instance.performance.tokensUsedPerTask =
      instance.metrics.totalRuns > 0
        ? instance.metrics.totalTokensUsed / instance.metrics.totalRuns
        : 0;
    instance.performance.costPerTask =
      instance.metrics.totalRuns > 0 ? instance.metrics.totalCost / instance.metrics.totalRuns : 0;
    // Update uptime if agent is still running
    if (instance.startTime) {
      instance.metrics.uptime = Date.now() - instance.startTime.getTime();
    }
  }
  /**
   * Get agent capabilities by type
   */
  private getAgentCapabilities(agentType: string): AgentCapabilities {
    const capabilities: Record<string, AgentCapabilities> = {
      'robo-developer': {
        supportsTools: true,
        supportsImages: true,
        supportsSubAgents: false,
        supportsParallel: false,
        supportsCodeExecution: true,
        maxContextLength: 200000,
        supportedModels: ['claude-3-sonnet'],
        supportedFileTypes: ['*'],
        canAccessInternet: true,
        canAccessFileSystem: true,
        canExecuteCommands: true,
        // Extended capabilities for lifecycle management
        primary: ['code-development', 'debugging', 'testing', 'linting'],
        secondary: ['documentation', 'refactoring', 'git-operations'],
        tools: ['file-edit', 'bash', 'search', 'git', 'test-runner'],
        maxConcurrent: 3,
        specializations: ['typescript', 'javascript', 'react', 'node.js'],
      },
      'robo-quality-control': {
        supportsTools: true,
        supportsImages: true,
        supportsSubAgents: false,
        supportsParallel: false,
        supportsCodeExecution: true,
        maxContextLength: 200000,
        supportedModels: ['claude-3-sonnet'],
        supportedFileTypes: ['*'],
        canAccessInternet: true,
        canAccessFileSystem: true,
        canExecuteCommands: true,
        primary: ['code-review', 'testing', 'quality-assurance'],
        secondary: ['performance-testing', 'security-scanning', 'accessibility-testing'],
        tools: ['test-runner', 'linter', 'security-scanner', 'accessibility-checker'],
        maxConcurrent: 2,
        specializations: ['unit-tests', 'integration-tests', 'e2e-tests'],
      },
      'robo-system-analyst': {
        supportsTools: true,
        supportsImages: true,
        supportsSubAgents: false,
        supportsParallel: false,
        supportsCodeExecution: false,
        maxContextLength: 200000,
        supportedModels: ['claude-3-sonnet'],
        supportedFileTypes: ['*.md', '*.txt', '*.json', '*.yaml'],
        canAccessInternet: true,
        canAccessFileSystem: true,
        canExecuteCommands: false,
        primary: ['requirements-analysis', 'system-design', 'research'],
        secondary: ['documentation', 'planning', 'stakeholder-communication'],
        tools: ['research-tools', 'documentation-tools', 'analysis-tools'],
        maxConcurrent: 1,
        specializations: ['requirements-gathering', 'system-architecture', 'technical-writing'],
      },
      'robo-devops-sre': {
        supportsTools: true,
        supportsImages: true,
        supportsSubAgents: false,
        supportsParallel: false,
        supportsCodeExecution: true,
        maxContextLength: 200000,
        supportedModels: ['claude-3-sonnet'],
        supportedFileTypes: ['*.yml', '*.yaml', '*.json', '*.dockerfile', '*.sh'],
        canAccessInternet: true,
        canAccessFileSystem: true,
        canExecuteCommands: true,
        primary: ['deployment', 'infrastructure', 'monitoring'],
        secondary: ['incident-response', 'security', 'performance-optimization', 'automation'],
        tools: ['deployment-tools', 'monitoring-tools', 'security-tools', 'automation-tools'],
        maxConcurrent: 2,
        specializations: ['docker', 'kubernetes', 'ci-cd', 'cloud-platforms'],
      },
      'robo-ux-ui-designer': {
        supportsTools: true,
        supportsImages: true,
        supportsSubAgents: false,
        supportsParallel: false,
        supportsCodeExecution: false,
        maxContextLength: 200000,
        supportedModels: ['claude-3-sonnet'],
        supportedFileTypes: ['*.css', '*.scss', '*.tsx', '*.jsx', '*.svg', '*.png'],
        canAccessInternet: true,
        canAccessFileSystem: true,
        canExecuteCommands: false,
        primary: ['ui-design', 'ux-research', 'prototyping'],
        secondary: ['design-systems', 'accessibility', 'user-testing', 'visual-design'],
        tools: ['design-tools', 'prototyping-tools', 'user-testing-tools'],
        maxConcurrent: 1,
        specializations: ['responsive-design', 'accessibility', 'design-systems'],
      },
    };
    const defaultCapabilities = capabilities['robo-developer'];
    if (defaultCapabilities === null || defaultCapabilities === undefined) {
      throw new Error('Default robo-developer capabilities not found');
    }
    return capabilities[agentType] ?? defaultCapabilities;
  }
  /**
   * Check if agent can handle specific task type
   */
  canHandleTask(agentId: string, taskType: string): boolean {
    const instance = this.agents.get(agentId);
    if (instance === null || instance === undefined) {
      return false;
    }
    const { capabilities, status } = instance;
    // Check if agent is in a state to handle tasks
    if (status.state !== 'running') {
      return false;
    }
    // Check if task type matches agent capabilities
    const allCapabilities = [...(capabilities.primary ?? []), ...(capabilities.secondary ?? [])];
    return allCapabilities.includes(taskType) || allCapabilities.includes('*');
  }
  /**
   * Get agents that can handle specific task type
   */
  getAgentsForTask(taskType: string): AgentInstance[] {
    return Array.from(this.agents.values()).filter((instance) =>
      this.canHandleTask(instance.config.id, taskType),
    );
  }
  /**
   * Get best agent for specific task
   */
  getBestAgentForTask(taskType: string): AgentInstance | null {
    const eligibleAgents = this.getAgentsForTask(taskType);
    if (eligibleAgents.length === 0) {
      return null;
    }
    // Score agents based on performance and availability
    const scoredAgents = eligibleAgents.map((agent) => ({
      agent,
      score: this.calculateAgentTaskScore(agent, taskType),
    }));
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0]?.agent ?? null;
  }
  /**
   * Calculate agent score for task assignment
   */
  private calculateAgentTaskScore(agent: AgentInstance, taskType: string): number {
    let score = 100; // Base score
    // Prioritize agents with the task as primary capability
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if ((agent.capabilities.primary !== null && agent.capabilities.primary !== undefined) && agent.capabilities.primary.includes(taskType)) {
      score += 50;
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    } else if ((agent.capabilities.secondary !== null && agent.capabilities.secondary !== undefined) && agent.capabilities.secondary.includes(taskType)) {
      score += 25;
    }
    // Factor in performance metrics
    score += agent.performance.successRate * 30;
    score += agent.performance.taskCompletionRate * 20;
    // Penalize agents with high error rates
    score -=
      Object.values(agent.performance.errorFrequency).reduce((sum, count) => sum + count, 0) * 5;
    // Factor in current load
    if (agent.status.currentTask && agent.status.currentTask.length > 0) {
      score -= 20; // Penalty for being busy
    }
    // Factor in health
    if (!agent.health.isHealthy) {
      score -= 100; // Heavy penalty for unhealthy agents
    }
    return Math.max(0, score);
  }
  /**
   * Get agent performance analytics
   */
  getPerformanceAnalytics(agentId?: string): {
    agentId?: string;
    performance: AgentPerformanceMetrics;
    health: AgentHealthStatus;
    capabilities: AgentCapabilities;
    recommendations: string[];
  }[] {
    const agents = (agentId !== null && agentId !== undefined)
      ? ([this.agents.get(agentId)].filter((agent): agent is AgentInstance => agent !== null && agent !== undefined))
      : Array.from(this.agents.values());
    return agents.map((agent) => {
      const recommendations: string[] = [];
      // Generate recommendations based on performance
      if (agent.performance.successRate < 0.8) {
        recommendations.push('Low success rate detected - review agent configuration and tasks');
      }
      if (agent.performance.averageTaskDuration > 300000) {
        // 5 minutes
        recommendations.push(
          'High average task duration - consider task optimization or resource allocation',
        );
      }
      if (agent.performance.tokensUsedPerTask > 10000) {
        recommendations.push('High token usage per task - review task efficiency');
      }
      if (!agent.health.isHealthy) {
        recommendations.push(`Agent health issues: ${agent.health.lastError}`);
      }
      return {
        agentId: agent.config.id,
        performance: agent.performance,
        health: agent.health,
        capabilities: agent.capabilities,
        recommendations,
      };
    });
  }
  /**
   * Update agent capabilities (for runtime modifications)
   */
  updateAgentCapabilities(agentId: string, capabilities: Partial<AgentCapabilities>): void {
    const instance = this.agents.get(agentId);
    if (instance === null || instance === undefined) {
      throw new Error(`Agent ${agentId} not found`);
    }
    // Merge capabilities
    instance.capabilities = {
      ...instance.capabilities,
      ...capabilities,
    };
    this.emit('agent_capabilities_updated', { agentId, capabilities: instance.capabilities });
  }
  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      void this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }
  /**
   * Perform health checks on all running agents
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.agents.values())
      .filter(
        (instance) => instance.status.state === 'running' && instance.config.healthCheck.enabled,
      )
      .map((instance) => this.checkAgentHealth(instance.config.id));
    await Promise.allSettled(healthCheckPromises);
  }
  /**
   * Check health of a specific agent
   */
  private async checkAgentHealth(agentId: string): Promise<void> {
    const instance = this.agents.get(agentId);
    if (instance?.agent === null || instance?.agent === undefined) {
      return;
    }
    const config = instance.config.healthCheck;
    const startTime = Date.now();
    try {
      // Simple health check - in real implementation this could ping an endpoint
      // or call a health method on the agent
      await Promise.race([
        Promise.resolve(), // Replace with actual health check
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), config.timeoutMs),
        ),
      ]);
      const responseTime = Date.now() - startTime;
      // Update health status
      instance.health.isHealthy = true;
      instance.health.lastPing = new Date();
      instance.health.responseTime = responseTime;
      instance.health.consecutiveFailures = 0;
      delete instance.health.lastError;
      this.emit('agent_healthy', { agentId, responseTime });
    } catch (error) {
      instance.health.consecutiveFailures++;
      instance.health.lastError = error instanceof Error ? error.message : String(error);
      instance.health.lastPing = new Date();
      // Mark as unhealthy if too many failures
      if (instance.health.consecutiveFailures >= config.maxFailures) {
        instance.health.isHealthy = false;
        this.emit('agent_unhealthy', {
          agentId,
          error,
          consecutiveFailures: instance.health.consecutiveFailures,
        });
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
    if (instance === null || instance === undefined) {
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
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Health check timeout for agent ${agentId}`);
  }
}
/**
 * Resource Monitor - manages system resources for agents
 */
class ResourceMonitor {
  private readonly allocatedResources = new Map<string, ResourceRequirements>();
  checkAvailability(requirements: ResourceRequirements): boolean {
    // Simplified resource checking - in real implementation this would check actual system resources
    const totalAllocated = Array.from(this.allocatedResources.values()).reduce(
      (acc, req) => ({
        memoryMB: acc.memoryMB + req.memoryMB,
        cpuCores: acc.cpuCores + req.cpuCores,
      }),
      { memoryMB: 0, cpuCores: 0 },
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
