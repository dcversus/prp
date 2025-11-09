/**
 * ♫ Agent Spawner System
 *
 * Dynamic agent spawning, lifecycle management, and resource allocation
 * for creating and managing agent instances on demand
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { createLayerLogger, HashUtils } from '../shared';
import {
  AgentConfig,
  AgentType,
  AgentRole,
  } from './agent-config';
import { AgentDiscovery, DiscoveredAgent } from './agent-discovery';
import { AgentValidator, ValidationResult } from './agent-validator';

const logger = createLayerLogger('config');

export interface SpawnRequest {
  id: string;
  agentId: string;
  role?: AgentRole;
  task?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requirements: SpawnRequirements;
  options: SpawnOptions;
  requestTime: Date;
  timeout?: number; // milliseconds
  requester: string;
}

export interface SpawnRequirements {
  capabilities: string[];
  minPerformance?: number; // 0-100
  maxCost?: number;
  maxResponseTime?: number; // milliseconds
  requiredTools?: string[];
  environment?: Record<string, string>;
  resources?: ResourceRequirements;
}

export interface ResourceRequirements {
  minMemory?: number; // MB
  maxMemory?: number; // MB
  minCpu?: number; // percentage
  maxCpu?: number; // percentage
  minDisk?: number; // MB
  networkBandwidth?: number; // Mbps
}

export interface SpawnOptions {
  reuseExisting?: boolean;
  ttl?: number; // time to live in milliseconds
  autoScale?: boolean;
  healthCheckInterval?: number; // milliseconds
  gracefulShutdownTimeout?: number; // milliseconds
  enableProfiling?: boolean;
  debugMode?: boolean;
  sandbox?: boolean;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  timeout?: number; // milliseconds
}

export interface SpawnedAgent {
  id: string;
  config: AgentConfig;
  process?: ChildProcess;
  status: AgentLifecycleStatus;
  resources: AllocatedResources;
  performance: PerformanceMetrics;
  health: AgentHealthStatus;
  metadata: SpawnMetadata;
  createdAt: Date;
  lastActivity: Date;
  ttl?: number; // time to live
  request: SpawnRequest;
}

export interface AgentLifecycleStatus {
  state: 'initializing' | 'starting' | 'running' | 'busy' | 'idle' | 'stopping' | 'stopped' | 'error' | 'crashed';
  progress: number; // 0-100
  message: string;
  lastStateChange: Date;
  errors: SpawnError[];
  restartCount: number;
  maxRestarts: number;
}

export interface AllocatedResources {
  memory: {
    allocated: number; // MB
    used: number; // MB
    peak: number; // MB
  };
  cpu: {
    allocated: number; // percentage
    used: number; // percentage
    peak: number; // percentage
  };
  disk: {
    allocated: number; // MB
    used: number; // MB
  };
  network: {
    bandwidth: number; // Mbps
    used: number; // Mbps
  };
  tokens: {
    allocated: number;
    used: number;
    remaining: number;
  };
  cost: {
    allocated: number; // USD
    used: number; // USD
  };
}

export interface PerformanceMetrics {
  startTime: Date;
  uptime: number; // milliseconds
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number; // milliseconds
  throughput: number; // requests per minute
  lastRequestTime?: Date;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

export interface AgentHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  checks: HealthCheckResult[];
  lastHealthCheck: Date;
  consecutiveFailures: number;
  alerts: HealthAlert[];
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  timestamp: Date;
  duration: number; // milliseconds
  details?: Record<string, unknown>;
}

export interface HealthAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export interface SpawnMetadata {
  spawnId: string;
  parentId?: string;
  environment: Record<string, string>;
  workingDirectory: string;
  command: string;
  args: string[];
  pid?: number;
  port?: number;
  endpoints: AgentEndpoint[];
  logs: LogEntry[];
}

export interface AgentEndpoint {
  type: 'http' | 'websocket' | 'grpc' | 'tcp' | 'stdio';
  url?: string;
  host?: string;
  port?: number;
  path?: string;
  protocol: string;
  status: 'active' | 'inactive' | 'error';
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SpawnError {
  code: string;
  message: string;
  timestamp: Date;
  stack?: string;
  recoverable: boolean;
}

export interface SpawnResult {
  success: boolean;
  agent?: SpawnedAgent;
  error?: SpawnError;
  duration: number; // milliseconds
}

export interface SpawnPool {
  agents: Map<string, SpawnedAgent>;
  byRole: Map<AgentRole, Set<string>>;
  byType: Map<AgentType, Set<string>>;
  byStatus: Map<AgentLifecycleStatus['state'], Set<string>>;
  totalResources: AllocatedResources;
  lastCleanup: Date;
}

/**
 * Agent Spawner System
 */
export class AgentSpawner extends EventEmitter {
  private discovery: AgentDiscovery;
  private pool: SpawnPool;
  private spawnQueue: SpawnRequest[] = [];
  private processingQueue = false;
  private cleanupInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private maxConcurrentSpawns: number = 10;
  private currentSpawns: number = 0;

  constructor(discovery?: AgentDiscovery, _validator?: AgentValidator) {
    super();
    this.discovery = discovery || new AgentDiscovery();
    this.pool = {
      agents: new Map(),
      byRole: new Map(),
      byType: new Map(),
      byStatus: new Map(),
      totalResources: this.createEmptyResources(),
      lastCleanup: new Date()
    };
    this.initializeIndexes();
  }

  /**
   * Start the spawner system
   */
  async start(options: {
    cleanupInterval?: number; // milliseconds
    healthCheckInterval?: number; // milliseconds
    maxConcurrentSpawns?: number;
  } = {}): Promise<void> {
    logger.info('AgentSpawner', 'Starting agent spawner system');

    const {
      cleanupInterval = 60000, // 1 minute
      healthCheckInterval = 30000, // 30 seconds
      maxConcurrentSpawns = 10
    } = options;

    this.maxConcurrentSpawns = maxConcurrentSpawns;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(error => {
        logger.error('AgentSpawner', 'Cleanup failed', error);
      });
    }, cleanupInterval);

    // Start health check interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch(error => {
        logger.error('AgentSpawner', 'Health checks failed', error);
      });
    }, healthCheckInterval);

    // Start processing queue
    this.processSpawnQueue();

    this.emit('spawner-started', { cleanupInterval, healthCheckInterval, maxConcurrentSpawns });
  }

  /**
   * Stop the spawner system
   */
  async stop(): Promise<void> {
    logger.info('AgentSpawner', 'Stopping agent spawner system');

    // Stop all agents
    const stopPromises = Array.from(this.pool.agents.values()).map(agent =>
      this.stopAgent(agent.id)
    );

    await Promise.allSettled(stopPromises);

    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.emit('spawner-stopped');
  }

  /**
   * Spawn an agent
   */
  async spawnAgent(request: SpawnRequest): Promise<SpawnResult> {
    logger.info('AgentSpawner', `Spawning agent: ${request.agentId}`, {
      requestId: request.id,
      role: request.role,
      priority: request.priority
    });

    const startTime = Date.now();

    try {
      // Validate request
      const validation = await this.validateSpawnRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: validation.errors.map(e => e.message).join(', '),
            timestamp: new Date(),
            recoverable: false
          },
          duration: Date.now() - startTime
        };
      }

      // Check if we can reuse existing agent
      if (request.options.reuseExisting) {
        const existingAgent = await this.findReusableAgent(request);
        if (existingAgent) {
          logger.info('AgentSpawner', `Reusing existing agent: ${existingAgent.id}`);
          return {
            success: true,
            agent: existingAgent,
            duration: Date.now() - startTime
          };
        }
      }

      // Check spawn limits
      if (this.currentSpawns >= this.maxConcurrentSpawns) {
        // Add to queue
        this.spawnQueue.push(request);
        logger.info('AgentSpawner', `Request queued: ${request.id}`, {
          queueLength: this.spawnQueue.length
        });
        return {
          success: false,
          error: {
            code: 'QUEUE_FULL',
            message: 'Request queued due to spawn limit',
            timestamp: new Date(),
            recoverable: true
          },
          duration: Date.now() - startTime
        };
      }

      // Find suitable agent configuration
      const discoveredAgent = await this.discovery.findBestAgent({
        requiredCapabilities: request.requirements.capabilities,
        preferredRole: request.role,
        maxCost: request.requirements.maxCost,
        minHealth: request.requirements.minPerformance || 80,
        excludeBusy: true
      });

      if (!discoveredAgent) {
        return {
          success: false,
          error: {
            code: 'NO_SUITABLE_AGENT',
            message: 'No suitable agent configuration found',
            timestamp: new Date(),
            recoverable: false
          },
          duration: Date.now() - startTime
        };
      }

      // Spawn the agent
      const spawnedAgent = await this.doSpawnAgent(discoveredAgent, request);

      // Add to pool
      this.pool.agents.set(spawnedAgent.id, spawnedAgent);
      this.updateIndexes(spawnedAgent);

      this.emit('agent-spawned', {
        agent: spawnedAgent,
        request,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        agent: spawnedAgent,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('AgentSpawner', 'Spawn failed', error instanceof Error ? error : new Error(String(error)), {
        requestId: request.id,
        duration
      });

      return {
        success: false,
        error: {
          code: 'SPAWN_FAILED',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          stack: error instanceof Error ? error.stack : undefined,
          recoverable: true
        },
        duration
      };
    }
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string, options: {
    graceful?: boolean;
    timeout?: number;
    force?: boolean;
  } = {}): Promise<boolean> {
    const agent = this.pool.agents.get(agentId);
    if (!agent) {
      return false;
    }

    logger.info('AgentSpawner', `Stopping agent: ${agentId}`, options);

    try {
      agent.status.state = 'stopping';
      agent.status.lastStateChange = new Date();

      if (agent.process && !agent.process.killed) {
        if (options.graceful || options.force) {
          const timeout = options.timeout || agent.request.options.gracefulShutdownTimeout || 10000;

          // Try graceful shutdown first
          if (!options.force) {
            agent.process.send('shutdown');

            const gracefulShutdown = new Promise<void>((resolve) => {
              const timer = setTimeout(() => {
                resolve();
              }, timeout);

              agent.process!.once('exit', () => {
                clearTimeout(timer);
                resolve();
              });
            });

            await gracefulShutdown;
          }

          // Force kill if still running
          if (!agent.process.killed) {
            agent.process.kill('SIGKILL');
          }
        } else {
          agent.process.kill();
        }
      }

      // Remove from pool
      this.pool.agents.delete(agentId);
      this.removeFromIndexes(agent);

      this.emit('agent-stopped', { agentId, agent });

      return true;

    } catch (error) {
      logger.error('AgentSpawner', 'Failed to stop agent', error instanceof Error ? error : new Error(String(error)), {
        agentId
      });
      return false;
    }
  }

  /**
   * Get spawned agents
   */
  getAgents(filter?: {
    role?: AgentRole;
    type?: AgentType;
    status?: AgentLifecycleStatus['state'];
    healthy?: boolean;
  }): SpawnedAgent[] {
    let agents = Array.from(this.pool.agents.values());

    if (filter) {
      if (filter.role) {
        agents = agents.filter(agent => agent.config.role === filter.role);
      }
      if (filter.type) {
        agents = agents.filter(agent => agent.config.type === filter.type);
      }
      if (filter.status) {
        agents = agents.filter(agent => agent.status.state === filter.status);
      }
      if (filter.healthy !== undefined) {
        agents = agents.filter(agent =>
          filter.healthy ?
          agent.health.overall === 'healthy' :
          agent.health.overall !== 'healthy'
        );
      }
    }

    return agents;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): SpawnedAgent | undefined {
    return this.pool.agents.get(agentId);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: Partial<AgentLifecycleStatus>): boolean {
    const agent = this.pool.agents.get(agentId);
    if (!agent) {
      return false;
    }

    const previousState = agent.status.state;
    agent.status = { ...agent.status, ...status };
    agent.status.lastStateChange = new Date();
    agent.lastActivity = new Date();

    // Update indexes if state changed
    if (previousState !== agent.status.state) {
      this.pool.byStatus.get(previousState)?.delete(agentId);
      this.pool.byStatus.get(agent.status.state)?.add(agentId);
    }

    this.emit('agent-status-updated', { agentId, status: agent.status, previousState });

    return true;
  }

  /**
   * Get spawn statistics
   */
  getStatistics(): {
    totalAgents: number;
    runningAgents: number;
    idleAgents: number;
    failedAgents: number;
    queuedRequests: number;
    totalResources: AllocatedResources;
    averageUptime: number;
    successRate: number;
  } {
    const agents = Array.from(this.pool.agents.values());

    const stats = {
      totalAgents: agents.length,
      runningAgents: agents.filter(a => a.status.state === 'running').length,
      idleAgents: agents.filter(a => a.status.state === 'idle').length,
      failedAgents: agents.filter(a => a.status.state === 'error' || a.status.state === 'crashed').length,
      queuedRequests: this.spawnQueue.length,
      totalResources: this.pool.totalResources,
      averageUptime: agents.length > 0
        ? agents.reduce((sum, a) => sum + a.performance.uptime, 0) / agents.length
        : 0,
      successRate: agents.length > 0
        ? agents.reduce((sum, a) => sum + (a.performance.requestCount > 0 ? a.performance.successCount / a.performance.requestCount : 1), 0) / agents.length * 100
        : 100
    };

    return stats;
  }

  /**
   * Private methods
   */

  private async processSpawnQueue(): Promise<void> {
    if (this.processingQueue || this.spawnQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.spawnQueue.length > 0 && this.currentSpawns < this.maxConcurrentSpawns) {
        const request = this.spawnQueue.shift()!;
        this.currentSpawns++;

        // Process spawn request asynchronously
        this.spawnAgent(request).finally(() => {
          this.currentSpawns--;
        });
      }
    } finally {
      this.processingQueue = false;
    }

    // Schedule next queue processing if there are pending requests
    if (this.spawnQueue.length > 0) {
      setTimeout(() => this.processSpawnQueue(), 1000);
    }
  }

  private async validateSpawnRequest(request: SpawnRequest): Promise<ValidationResult> {
    // Basic validation
    if (!request.agentId || !request.requester) {
      return {
        valid: false,
        errors: [{
          field: 'request',
          message: 'Missing required fields',
          code: 'INVALID_REQUEST',
          severity: 'error'
        }],
        warnings: [],
        suggestions: [],
        securityScore: 0,
        performanceScore: 0,
        compatibilityScore: 0,
        recommendations: [],
        estimatedCosts: {
          perRequest: { min: 0, max: 0, average: 0 },
          perDay: { min: 0, max: 0, average: 0 },
          perMonth: { min: 0, max: 0, average: 0 },
          currency: 'USD'
        },
        resourceUsage: {
          memory: { min: 0, max: 0, recommended: 0 },
          cpu: { min: 0, max: 0, recommended: 0 },
          storage: { temp: 0, persistent: 0 },
          network: { bandwidth: 0, requests: 0 }
        }
      };
    }

    return { valid: true, errors: [], warnings: [], suggestions: [], securityScore: 100, performanceScore: 100, compatibilityScore: 100, recommendations: [], estimatedCosts: { perRequest: { min: 0, max: 0, average: 0 }, perDay: { min: 0, max: 0, average: 0 }, perMonth: { min: 0, max: 0, average: 0 }, currency: 'USD' }, resourceUsage: { memory: { min: 0, max: 0, recommended: 0 }, cpu: { min: 0, max: 0, recommended: 0 }, storage: { temp: 0, persistent: 0 }, network: { bandwidth: 0, requests: 0 } } };
  }

  private async findReusableAgent(request: SpawnRequest): Promise<SpawnedAgent | undefined> {
    const agents = Array.from(this.pool.agents.values());

    // Find running agents that match requirements
    const candidates = agents.filter(agent =>
      agent.status.state === 'running' || agent.status.state === 'idle'
    );

    for (const candidate of candidates) {
      // Check role match
      if (request.role && candidate.config.role !== request.role) {
        continue;
      }

      // Check capabilities
      const hasAllCapabilities = request.requirements.capabilities.every(cap => {
        // Check against various capability properties
        const capabilityMap = {
          'tools': candidate.config.capabilities.supportsTools,
          'images': candidate.config.capabilities.supportsImages,
          'sub-agents': candidate.config.capabilities.supportsSubAgents,
          'parallel': candidate.config.capabilities.supportsParallel,
          'code-execution': candidate.config.capabilities.supportsCodeExecution,
          'file-system': candidate.config.capabilities.canAccessFileSystem,
          'command-execution': candidate.config.capabilities.canExecuteCommands
        };
        return capabilityMap[cap as keyof typeof capabilityMap] || false;
      });

      if (!hasAllCapabilities) {
        continue;
      }

      // Check resource availability
      if (candidate.resources.memory.used > candidate.resources.memory.allocated * 0.8) {
        continue;
      }

      // Found suitable agent
      candidate.lastActivity = new Date();
      candidate.status.state = 'busy';
      return candidate;
    }

    return undefined;
  }

  private async doSpawnAgent(discoveredAgent: DiscoveredAgent, request: SpawnRequest): Promise<SpawnedAgent> {
    const spawnId = HashUtils.generateId();
    const agentId = `${discoveredAgent.config.id}-${spawnId.slice(0, 8)}`;

    logger.info('AgentSpawner', `Creating agent instance: ${agentId}`, {
      spawnId,
      configId: discoveredAgent.config.id
    });

    const spawnedAgent: SpawnedAgent = {
      id: agentId,
      config: discoveredAgent.config,
      status: {
        state: 'initializing',
        progress: 0,
        message: 'Initializing agent...',
        lastStateChange: new Date(),
        errors: [],
        restartCount: 0,
        maxRestarts: request.options.maxRetries || 3
      },
      resources: this.createEmptyResources(),
      performance: {
        startTime: new Date(),
        uptime: 0,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      health: {
        overall: 'unhealthy',
        checks: [],
        lastHealthCheck: new Date(),
        consecutiveFailures: 0,
        alerts: []
      },
      metadata: {
        spawnId,
        environment: { ...discoveredAgent.config.environment.envVars },
        workingDirectory: discoveredAgent.config.environment.workingDirectory || process.cwd(),
        command: 'node',
        args: ['src/index.js', '--agent', agentId],
        endpoints: [],
        logs: []
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      ttl: request.options.ttl,
      request
    };

    try {
      // Start the agent process
      spawnedAgent.status.state = 'starting';
      spawnedAgent.status.message = 'Starting agent process...';

      const processArgs = [
        '--agent-id', agentId,
        '--config', discoveredAgent.config.id,
        '--role', request.role || discoveredAgent.config.role,
        '--spawn-id', spawnId
      ];

      if (request.options.debugMode) {
        processArgs.push('--debug');
      }

      if (request.options.sandbox) {
        processArgs.push('--sandbox');
      }

      const childProcess = spawn('node', processArgs, {
        cwd: spawnedAgent.metadata.workingDirectory,
        env: {
          ...process.env,
          ...spawnedAgent.metadata.environment,
          AGENT_ID: agentId,
          SPAWN_ID: spawnId,
          AGENT_CONFIG: JSON.stringify(discoveredAgent.config)
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      spawnedAgent.process = childProcess;
      spawnedAgent.metadata.pid = childProcess.pid;

      // Set up process event handlers
      childProcess.on('spawn', () => {
        spawnedAgent.status.state = 'running';
        spawnedAgent.status.message = 'Agent is running';
        spawnedAgent.status.progress = 100;
        spawnedAgent.lastActivity = new Date();

        this.emit('agent-started', { agent: spawnedAgent });
      });

      childProcess.on('exit', (code, signal) => {
        logger.info('AgentSpawner', `Agent process exited: ${agentId}`, { code, signal });

        spawnedAgent.status.state = code === 0 ? 'stopped' : 'crashed';
        spawnedAgent.status.message = `Process exited (code: ${code}, signal: ${signal})`;
        spawnedAgent.lastActivity = new Date();

        if (code !== 0 && spawnedAgent.status.restartCount < spawnedAgent.status.maxRestarts) {
          // Attempt restart
          setTimeout(() => this.restartAgent(agentId), 5000);
        } else {
          // Remove from pool
          this.pool.agents.delete(agentId);
          this.removeFromIndexes(spawnedAgent);
        }

        this.emit('agent-exited', { agentId, code, signal });
      });

      childProcess.on('error', (error) => {
        logger.error('AgentSpawner', 'Agent process error', error, { agentId });

        spawnedAgent.status.state = 'error';
        spawnedAgent.status.message = `Process error: ${error.message}`;
        spawnedAgent.status.errors.push({
          code: 'PROCESS_ERROR',
          message: error.message,
          timestamp: new Date(),
          stack: error.stack,
          recoverable: true
        });

        this.emit('agent-error', { agentId, error });
      });

      // Set up stdout/stderr handlers
      childProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          spawnedAgent.metadata.logs.push({
            timestamp: new Date(),
            level: 'info',
            message,
            metadata: { source: 'stdout' }
          });
        }
      });

      childProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          spawnedAgent.metadata.logs.push({
            timestamp: new Date(),
            level: 'error',
            message,
            metadata: { source: 'stderr' }
          });
        }
      });

      // Allocate resources
      await this.allocateResources(spawnedAgent);

      // Wait for process to start
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Agent startup timeout'));
        }, request.options.timeout || 30000);

        childProcess.once('spawn', () => {
          clearTimeout(timeout);
          resolve();
        });

        childProcess.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      return spawnedAgent;

    } catch (error) {
      spawnedAgent.status.state = 'error';
      spawnedAgent.status.message = `Spawn failed: ${error instanceof Error ? error.message : String(error)}`;

      throw error;
    }
  }

  private async restartAgent(agentId: string): Promise<void> {
    const agent = this.pool.agents.get(agentId);
    if (!agent) {
      return;
    }

    logger.info('AgentSpawner', `Restarting agent: ${agentId}`);

    agent.status.restartCount++;
    agent.status.lastStateChange = new Date();

    try {
      // Spawn new agent with same request
      const result = await this.doSpawnAgent(
        { config: agent.config } as DiscoveredAgent,
        agent.request
      );

      // Replace old agent with new one
      this.pool.agents.delete(agentId);
      this.removeFromIndexes(agent);

      this.pool.agents.set(result.id, result);
      this.updateIndexes(result);

      this.emit('agent-restarted', { oldAgentId: agentId, newAgent: result });

    } catch (error) {
      logger.error('AgentSpawner', 'Agent restart failed', error instanceof Error ? error : new Error(String(error)), {
        agentId
      });
    }
  }

  private async allocateResources(agent: SpawnedAgent): Promise<void> {
    // Calculate required resources based on agent configuration
    const config = agent.config;

    agent.resources.memory.allocated = Math.max(
      config.limits.maxMemoryUsage || 512,
      256 // Minimum 256MB
    );

    agent.resources.cpu.allocated = Math.max(
      config.limits.maxConcurrentTasks * 10, // 10% per concurrent task
      20 // Minimum 20%
    );

    agent.resources.disk.allocated = 100; // 100MB for temporary files
    agent.resources.network.bandwidth = 10; // 10 Mbps

    agent.resources.tokens.allocated = config.limits.maxTokensPerRequest * config.limits.maxRequestsPerDay;
    agent.resources.cost.allocated = config.limits.maxCostPerDay;

    // Update total resources
    this.updateTotalResources();
  }

  private updateTotalResources(): void {
    const agents = Array.from(this.pool.agents.values());

    this.pool.totalResources = {
      memory: {
        allocated: agents.reduce((sum, a) => sum + a.resources.memory.allocated, 0),
        used: agents.reduce((sum, a) => sum + a.resources.memory.used, 0),
        peak: agents.reduce((sum, a) => sum + a.resources.memory.peak, 0)
      },
      cpu: {
        allocated: agents.reduce((sum, a) => sum + a.resources.cpu.allocated, 0),
        used: agents.reduce((sum, a) => sum + a.resources.cpu.used, 0),
        peak: agents.reduce((sum, a) => sum + a.resources.cpu.peak, 0)
      },
      disk: {
        allocated: agents.reduce((sum, a) => sum + a.resources.disk.allocated, 0),
        used: agents.reduce((sum, a) => sum + a.resources.disk.used, 0)
      },
      network: {
        bandwidth: agents.reduce((sum, a) => sum + a.resources.network.bandwidth, 0),
        used: agents.reduce((sum, a) => sum + a.resources.network.used, 0)
      },
      tokens: {
        allocated: agents.reduce((sum, a) => sum + a.resources.tokens.allocated, 0),
        used: agents.reduce((sum, a) => sum + a.resources.tokens.used, 0),
        remaining: agents.reduce((sum, a) => sum + a.resources.tokens.remaining, 0)
      },
      cost: {
        allocated: agents.reduce((sum, a) => sum + a.resources.cost.allocated, 0),
        used: agents.reduce((sum, a) => sum + a.resources.cost.used, 0)
      }
    };
  }

  private async performCleanup(): Promise<void> {
    logger.debug('AgentSpawner', 'Performing cleanup');

    const now = new Date();
    const agentsToRemove: string[] = [];

    for (const [agentId, agent] of this.pool.agents) {
      // Remove agents with expired TTL
      if (agent.ttl && (now.getTime() - agent.createdAt.getTime()) > agent.ttl) {
        agentsToRemove.push(agentId);
        continue;
      }

      // Remove idle agents for too long
      if (agent.status.state === 'idle') {
        const idleTime = now.getTime() - agent.lastActivity.getTime();
        if (idleTime > 600000) { // 10 minutes
          agentsToRemove.push(agentId);
          continue;
        }
      }

      // Remove crashed agents
      if (agent.status.state === 'crashed' || agent.status.state === 'error') {
        const errorTime = now.getTime() - agent.status.lastStateChange.getTime();
        if (errorTime > 300000) { // 5 minutes
          agentsToRemove.push(agentId);
          continue;
        }
      }
    }

    // Remove marked agents
    for (const agentId of agentsToRemove) {
      await this.stopAgent(agentId, { force: true });
    }

    this.pool.lastCleanup = now;

    if (agentsToRemove.length > 0) {
      logger.info('AgentSpawner', `Cleaned up ${agentsToRemove.length} agents`);
    }
  }

  private async performHealthChecks(): Promise<void> {
    const agents = Array.from(this.pool.agents.values());

    for (const agent of agents) {
      if (agent.status.state !== 'running' && agent.status.state !== 'idle') {
        continue;
      }

      const healthCheck: HealthCheckResult = {
        name: 'process-health',
        status: 'pass',
        message: 'Process is running',
        timestamp: new Date(),
        duration: 0
      };

      try {
        // Check if process is still alive
        if (agent.process?.killed) {
          healthCheck.status = 'fail';
          healthCheck.message = 'Process was killed';
        } else if (agent.process?.exitCode !== null) {
          healthCheck.status = 'fail';
          healthCheck.message = 'Process has exited';
        }

        // Update agent health
        agent.health.checks = [healthCheck];
        agent.health.lastHealthCheck = new Date();

        if (healthCheck.status === 'fail') {
          agent.health.consecutiveFailures++;
          if (agent.health.consecutiveFailures >= 3) {
            agent.health.overall = 'critical';
          } else {
            agent.health.overall = 'unhealthy';
          }
        } else {
          agent.health.consecutiveFailures = 0;
          agent.health.overall = 'healthy';
        }

      } catch (error) {
        healthCheck.status = 'fail';
        healthCheck.message = `Health check failed: ${error instanceof Error ? error.message : String(error)}`;
        agent.health.consecutiveFailures++;
      }
    }
  }

  private createEmptyResources(): AllocatedResources {
    return {
      memory: { allocated: 0, used: 0, peak: 0 },
      cpu: { allocated: 0, used: 0, peak: 0 },
      disk: { allocated: 0, used: 0 },
      network: { bandwidth: 0, used: 0 },
      tokens: { allocated: 0, used: 0, remaining: 0 },
      cost: { allocated: 0, used: 0 }
    };
  }

  private initializeIndexes(): void {
    const types: AgentType[] = [
      'claude-code-anthropic', 'claude-code-glm', 'codex', 'gemini',
      'amp', 'aider', 'github-copilot', 'custom'
    ];
    const roles: AgentRole[] = [
      'robo-developer', 'robo-system-analyst', 'robo-aqa', 'robo-security-expert',
      'robo-performance-engineer', 'robo-ui-designer', 'robo-devops', 'robo-documenter',
      'orchestrator-agent', 'task-agent', 'specialist-agent', 'conductor'
    ];
    const statuses: AgentLifecycleStatus['state'][] = [
      'initializing', 'starting', 'running', 'busy', 'idle', 'stopping', 'stopped', 'error', 'crashed'
    ];

    for (const type of types) {
      this.pool.byType.set(type, new Set());
    }
    for (const role of roles) {
      this.pool.byRole.set(role, new Set());
    }
    for (const status of statuses) {
      this.pool.byStatus.set(status, new Set());
    }
  }

  private updateIndexes(agent: SpawnedAgent): void {
    this.pool.byType.get(agent.config.type)?.add(agent.id);
    this.pool.byRole.get(agent.config.role)?.add(agent.id);
    this.pool.byStatus.get(agent.status.state)?.add(agent.id);
  }

  private removeFromIndexes(agent: SpawnedAgent): void {
    this.pool.byType.get(agent.config.type)?.delete(agent.id);
    this.pool.byRole.get(agent.config.role)?.delete(agent.id);
    this.pool.byStatus.get(agent.status.state)?.delete(agent.id);
  }
}

// Global instance
export const agentSpawner = new AgentSpawner();

export default AgentSpawner;