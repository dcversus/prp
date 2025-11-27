/**
 * ♫ Agent Manager for @dcversus/prp Orchestrator
 *
 * Manages agent lifecycle, task delegation, and coordination
 * for the orchestrator system.
 */
import { EventEmitter } from 'events';
import { spawn } from 'child_process';

import { AgentState } from '../shared/types';
import { createLayerLogger, HashUtils } from '../shared';
import { EventBus } from '../shared/events';
import {
  TmuxManager,
  type TmuxConfig,
  type AgentTerminalSession,
  type AgentMessage,
  type AgentTaskResult
} from '../shared/tmux-exports';

import type { AgentTask, AgentSession, OrchestratorConfig } from './types';
import type { AgentConfig, AgentRole } from '../shared/types';
import type { ChildProcess } from 'child_process';


const logger = createLayerLogger('orchestrator');
interface AgentProcess {
  process: ChildProcess;
  session: AgentSession;
  lastPing: Date;
  isAlive: boolean;
}

/**
 * Adapter to convert AgentTerminalSession to AgentSession
 */
function adaptTmuxSessionToAgentSession(
  tmuxSession: AgentTerminalSession,
  agentConfig: AgentConfig
): AgentSession {
  return {
    id: tmuxSession.id,
    agentId: tmuxSession.agentId,
    agentConfig,
    status: tmuxSession.status === 'running' ? 'busy' :
           tmuxSession.status === 'idle' ? 'idle' :
           tmuxSession.status === 'error' ? 'error' : 'offline',
    lastActivity: tmuxSession.lastActivity,
    tokenUsage: tmuxSession.tokenUsage,
    performance: tmuxSession.performance,
    capabilities: {
      supportsTools: tmuxSession.agentCapabilities.supportsTools,
      supportsImages: tmuxSession.agentCapabilities.supportsImages,
      supportsSubAgents: tmuxSession.agentCapabilities.supportsSubAgents,
      supportsParallel: tmuxSession.agentCapabilities.supportsParallel,
      supportsCodeExecution: tmuxSession.agentCapabilities.supportsCodeExecution,
      maxContextLength: tmuxSession.agentCapabilities.maxContextLength,
      supportedModels: tmuxSession.agentCapabilities.supportedModels,
      supportedFileTypes: tmuxSession.agentCapabilities.supportedFileTypes,
      canAccessInternet: tmuxSession.agentCapabilities.canAccessInternet,
      canAccessFileSystem: tmuxSession.agentCapabilities.canAccessFileSystem,
      canExecuteCommands: tmuxSession.agentCapabilities.canExecuteCommands,
      availableTools: tmuxSession.agentCapabilities.availableTools || [],
      specializations: tmuxSession.agentCapabilities.specializations || [],
    }
  };
}

/**
 * Agent Manager - Manages agent lifecycle and task coordination
 */
export class AgentManager extends EventEmitter {
  private readonly config: OrchestratorConfig;
  private readonly agents = new Map<string, AgentConfig>();
  private readonly activeSessions = new Map<string, AgentProcess>();
  private readonly taskHistory = new Map<string, AgentTask>();
  private readonly tmuxManager: TmuxManager;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly useTmuxManager = true;

  constructor(config: OrchestratorConfig, eventBus?: EventBus) {
    super();
    this.config = config;

    // Initialize TmuxManager with default configuration
    const tmuxConfig: TmuxConfig = {
      socketName: 'prp-agent-tmux',
      baseSessionName: 'prp-agents',
      maxSessions: config.agents?.maxActiveAgents || 10,
      defaultShell: process.env.SHELL || '/bin/bash',
      sessionTimeout: config.agents?.defaultTimeout || 3600000,
      idleTimeout: 300000, // 5 minutes
      logLevel: 'info',
      resourceMonitoring: {
        enabled: true,
        intervalMs: 5000,
        retentionHours: 24,
      },
      terminal: {
        defaultProfile: 'default',
        historyLimit: 10000,
        scrollbackLines: 5000,
      },
    };

    this.tmuxManager = new TmuxManager(tmuxConfig, eventBus || new EventBus());
  }
  /**
   * Initialize the agent manager
   */
  async initialize(): Promise<void> {
    logger.info('AgentManager', 'Initializing agent manager');
    try {
      // Initialize TmuxManager first
      if (this.useTmuxManager) {
        await this.tmuxManager.initialize();
        logger.info('AgentManager', 'TmuxManager initialized');
      }

      // Load agent configurations
      await this.loadAgentConfigurations();

      // Start health checking
      this.startHealthChecking();

      logger.info('AgentManager', `Agent manager initialized with ${this.agents.size} agents`);
      this.emit('manager:initialized', { agentCount: this.agents.size });
    } catch (error) {
      logger.error(
        'AgentManager',
        'Failed to initialize agent manager',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Execute a task with an appropriate agent
   */
  async executeTask(task: AgentTask): Promise<unknown> {
    logger.info('AgentManager', 'Executing agent task');
    try {
      // Store task in history
      this.taskHistory.set(task.id, task);
      task.status = 'in_progress';
      task.startedAt = new Date();
      // Find appropriate agent
      const agentConfig = this.findBestAgent(task);
      if (!agentConfig) {
        throw new Error(`No suitable agent found for task: ${task.type}`);
      }
      // Get or create agent session
      const session = await this.getOrCreateSession(agentConfig);
      if (!session) {
        throw new Error(`Failed to create agent session for: ${agentConfig.name}`);
      }
      // Send task to agent
      const result = await this.sendTaskToAgent(session, task);
      // Update task status
      task.status = result.success ? 'completed' : 'failed';
      task.completedAt = new Date();
      task.result = result.data;
      task.error = result.error;
      task.tokenUsage = result.tokenUsage;
      logger.info('AgentManager', 'Agent task completed');
      this.emit('task:completed', { task, result });
      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();
      logger.error(
        'AgentManager',
        'Agent task failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      this.emit('task:failed', { task, error });
      throw error;
    }
  }
  /**
   * Stop all active agents
   */
  async stopAll(): Promise<void> {
    logger.info('AgentManager', 'Stopping all active agents');
    try {
      // Stop health checking
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Terminate all agent processes (both tmux and regular)
      const stopPromises = Array.from(this.activeSessions.entries()).map(async ([sessionId]) => {
        try {
          await this.terminateAgent(sessionId);
        } catch (error) {
          logger.error(
            'AgentManager',
            `Failed to stop agent ${sessionId}`,
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      });

      await Promise.all(stopPromises);

      // Cleanup TmuxManager if used
      if (this.useTmuxManager) {
        await this.tmuxManager.cleanup();
      }

      logger.info('AgentManager', 'All agents stopped successfully');
    } catch (error) {
      logger.error(
        'AgentManager',
        'Error stopping agents',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  /**
   * Get all agent statuses
   */
  getAllStatuses(): Map<string, any> {
    // Using any for now to avoid type conflicts
    const statuses = new Map<string, any>();
    for (const [sessionId, agentProcess] of Array.from(this.activeSessions.entries())) {
      statuses.set(sessionId, {
        id: sessionId,
        name: agentProcess.session.agentConfig.name,
        status:
          agentProcess.session.status === 'idle'
            ? 'idle'
            : agentProcess.session.status === 'busy'
              ? 'busy'
              : agentProcess.session.status === 'error'
                ? 'error'
                : 'offline',
        currentTask: agentProcess.session.currentTask?.description,
        lastActivity: agentProcess.session.lastActivity,
        tokenUsage: {
          used: agentProcess.session.tokenUsage.total,
          limit: agentProcess.session.agentConfig.limits.maxCostPerDay || 100000,
        },
        capabilities: {
          supportsTools: agentProcess.session.capabilities.supportsTools,
          supportsImages: agentProcess.session.capabilities.supportsImages,
          supportsSubAgents: agentProcess.session.capabilities.supportsSubAgents,
          supportsParallel: agentProcess.session.capabilities.supportsParallel,
          maxContextLength: agentProcess.session.capabilities.maxContextLength,
          supportedModels: agentProcess.session.capabilities.supportedModels,
          availableTools: agentProcess.session.capabilities.availableTools,
          specializations: agentProcess.session.capabilities.specializations,
          supportsCodeExecution: agentProcess.session.capabilities.supportsCodeExecution || false,
          supportedFileTypes: agentProcess.session.capabilities.supportedFileTypes,
          canAccessInternet: agentProcess.session.capabilities.canAccessInternet || false,
          canAccessFileSystem: agentProcess.session.capabilities.canAccessFileSystem || true,
          canExecuteCommands: agentProcess.session.capabilities.canExecuteCommands || true,
        },
      });
    }
    return statuses;
  }
  /**
   * Get active agent count
   */
  getActiveAgentCount(): number {
    return this.activeSessions.size;
  }
  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | null {
    return this.taskHistory.get(taskId) ?? null;
  }
  /**
   * Get task history
   */
  getTaskHistory(limit = 50): AgentTask[] {
    const tasks = Array.from(this.taskHistory.values());
    return tasks
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
      .slice(0, limit);
  }
  /**
   * Load agent configurations
   */
  private async loadAgentConfigurations(): Promise<void> {
    // Load agents from configuration - TODO: Update config structure
    // For now, we'll use empty array since config structure needs to be fixed
    const agentConfigs: AgentConfig[] = [];
    for (const config of agentConfigs) {
      this.agents.set(config.id, {
        ...config,
        // Add default values for required properties if they don't exist
        roles: config.roles ?? [config.role],
        bestRole: config.bestRole ?? config.role,
        runCommands: config.runCommands ?? [],
      } as AgentConfig);
    }
    logger.info('AgentManager', `Loaded ${agentConfigs.length} agent configurations`);
  }
  /**
   * Find best agent for a task
   */
  private findBestAgent(task: AgentTask): AgentConfig | null {
    const candidates: Array<{ agent: AgentConfig; score: number }> = [];
    for (const agent of Array.from(this.agents.values())) {
      let score = 0;
      // Check if agent can handle the task type
      if (agent.roles?.includes(task.type as AgentRole)) {
        score += 10;
      }
      // Check if agent's best role matches
      if (agent.bestRole === task.type) {
        score += 5;
      }
      // Check token limits
      if (this.checkTokenLimits(agent)) {
        score += 3;
      }
      // Check agent availability
      const session = this.findSessionByAgent(agent.id);
      if (!session || session.session.status === 'idle') {
        score += 2;
      }
      if (score > 0) {
        candidates.push({ agent, score });
      }
    }
    if (candidates.length === 0) {
      return null;
    }
    // Return agent with highest score
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.agent ?? null;
  }
  /**
   * Check if agent has sufficient token limits for task
   */
  private checkTokenLimits(agent: AgentConfig): boolean {
    // Simple check - in production would be more sophisticated
    return agent.limits.maxCostPerDay > 1000; // Minimum tokens available
  }
  /**
   * Get or create agent session
   */
  private async getOrCreateSession(agentConfig: AgentConfig): Promise<AgentProcess | null> {
    // Check if session already exists
    const existingSession = this.findSessionByAgent(agentConfig.id);
    if (existingSession?.isAlive) {
      return existingSession;
    }
    // Create new session
    return this.createAgentSession(agentConfig);
  }
  /**
   * Find session by agent ID
   */
  private findSessionByAgent(agentId: string): AgentProcess | null {
    for (const [, agentProcess] of Array.from(this.activeSessions.entries())) {
      if (agentProcess.session.agentConfig.id === agentId) {
        return agentProcess;
      }
    }
    return null;
  }
  /**
   * Create new agent session
   */
  private async createAgentSession(agentConfig: AgentConfig): Promise<AgentProcess | null> {
    logger.info('AgentManager', `Creating session for agent: ${agentConfig.name}`);
    try {
      if (this.useTmuxManager) {
        // Use TmuxManager to create tmux session
        return await this.createTmuxAgentSession(agentConfig);
      } else {
        // Fallback to process spawning
        return await this.createProcessAgentSession(agentConfig);
      }
    } catch (error) {
      logger.error(
        'AgentManager',
        `Failed to create session for agent: ${agentConfig.name}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }

  /**
   * Create agent session using TmuxManager
   */
  private async createTmuxAgentSession(agentConfig: AgentConfig): Promise<AgentProcess | null> {
    try {
      // Create instructions for the agent
      const instructions = `Initializing agent ${agentConfig.name} (${agentConfig.type}) with role: ${agentConfig.role}`;

      // Create tmux session for agent
      const tmuxSession = await this.tmuxManager.createAgentSession(
        agentConfig.id,
        agentConfig,
        instructions,
        process.cwd()
      );

      if (!tmuxSession) {
        throw new Error('Failed to create tmux session');
      }

      // Adapt tmux session to agent session
      const agentSession = adaptTmuxSessionToAgentSession(tmuxSession, agentConfig);

      // Create agent process wrapper (process is null for tmux sessions)
      const agentProcess: AgentProcess = {
        process: null as any,
        session: agentSession,
        lastPing: new Date(),
        isAlive: true,
      };

      // Add to active sessions
      this.activeSessions.set(agentSession.id, agentProcess);

      logger.info('AgentManager', `Tmux agent session created: ${agentSession.id}`);
      this.emit('session:created', { sessionId: agentSession.id, agentConfig });

      return agentProcess;
    } catch (error) {
      logger.error(
        'AgentManager',
        `Failed to create tmux session for agent: ${agentConfig.name}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }

  /**
   * Create agent session using process spawning (fallback)
   */
  private async createProcessAgentSession(agentConfig: AgentConfig): Promise<AgentProcess | null> {
    try {
      // Spawn agent process
      const runCommands = agentConfig.runCommands ?? [];
      if (runCommands.length === 0) {
        throw new Error(`No run commands configured for agent ${agentConfig.id}`);
      }
      const childProcess = spawn(runCommands[0] as string, runCommands.slice(1));
      const sessionId = HashUtils.generateId();
      const session: AgentSession = {
        id: sessionId,
        agentId: agentConfig.id,
        agentConfig,
        status: 'busy',
        lastActivity: new Date(),
        tokenUsage: {
          total: 0,
          cost: 0,
          lastUpdated: new Date(),
        },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 1.0,
          errorCount: 0,
        },
        capabilities: {
          supportsTools: true,
          supportsImages: agentConfig.type !== 'codex',
          supportsSubAgents: agentConfig.type.startsWith('claude-code'),
          supportsParallel: false,
          supportsCodeExecution: true,
          maxContextLength: 200000,
          supportedModels: [this.config.model || 'gpt-4'],
          supportedFileTypes: ['.ts', '.js', '.md', '.json'],
          canAccessInternet: false,
          canAccessFileSystem: true,
          canExecuteCommands: true,
          availableTools: ['read_file', 'write_file', 'execute_command'],
          specializations: agentConfig.roles ?? [],
        },
      };
      const agentProcess: AgentProcess = {
        process: childProcess,
        session,
        lastPing: new Date(),
        isAlive: true,
      };
      // Set up process event handlers
      this.setupProcessHandlers(sessionId, agentProcess);
      // Add to active sessions
      this.activeSessions.set(sessionId, agentProcess);
      // Wait for agent to be ready
      await this.waitForAgentReady(sessionId);
      logger.info('AgentManager', `Process agent session created: ${sessionId}`);
      this.emit('session:created', { sessionId, agentConfig });
      return agentProcess;
    } catch (error) {
      logger.error(
        'AgentManager',
        `Failed to create process session for agent: ${agentConfig.name}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }
  /**
   * Set up process event handlers
   */
  private setupProcessHandlers(sessionId: string, agentProcess: AgentProcess): void {
    const childProcess = agentProcess.process;
    childProcess.on('spawn', () => {
      logger.debug('AgentManager', `Agent process spawned: ${sessionId}`);
      agentProcess.session.status = 'idle';
    });
    childProcess.on('error', (error) => {
      logger.error('AgentManager', `Agent process error: ${sessionId}`, error);
      agentProcess.session.status = 'error';
      agentProcess.isAlive = false;
      this.emit('session:error', { sessionId, error });
    });
    childProcess.on('exit', (code, signal) => {
      logger.info('AgentManager', `Agent process exited: ${sessionId}`, { code, signal });
      agentProcess.session.status = 'offline';
      agentProcess.isAlive = false;
      this.activeSessions.delete(sessionId);
      this.emit('session:exited', { sessionId, code, signal });
    });
    // Handle stdout and stderr
    childProcess.stdout?.on('data', (data) => {
      logger.debug('AgentManager', `Agent stdout: ${sessionId}`, {
        data: data.toString().trim(),
      });
      agentProcess.lastPing = new Date();
    });
    childProcess.stderr?.on('data', (data) => {
      logger.warn('AgentManager', `Agent stderr: ${sessionId}`, {
        data: data.toString().trim(),
      });
    });
  }
  /**
   * Wait for agent to be ready
   */
  private async waitForAgentReady(sessionId: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const checkReady = () => {
        const agentProcess = this.activeSessions.get(sessionId);
        if (!agentProcess) {
          reject(new Error(`Agent session ${sessionId} not found`));
          return;
        }
        if (agentProcess.session.status === 'idle') {
          resolve();
          return;
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Agent ${sessionId} failed to become ready within ${timeout}ms`));
          return;
        }
        setTimeout(checkReady, 1000);
      };
      checkReady();
    });
  }
  /**
   * Send task to agent
   */
  private async sendTaskToAgent(
    agentProcess: AgentProcess,
    task: AgentTask,
  ): Promise<AgentTaskResult> {
    const sessionId = agentProcess.session.id;
    agentProcess.session.status = 'busy';
    agentProcess.session.currentTask = task;
    logger.debug('AgentManager', `Sending task to agent: ${sessionId}`, {
      task: task.description,
    });
    try {
      // Create task message
      const taskMessage = {
        type: 'task',
        id: task.id,
        description: task.description,
        payload: task.payload,
        priority: task.priority,
      };

      let result: AgentTaskResult;

      if (this.useTmuxManager && !agentProcess.process) {
        // Send task via TmuxManager
        result = await this.sendTaskToTmuxAgent(agentProcess.session.id, taskMessage);
      } else {
        // Send task via process stdin (fallback)
        result = await this.sendTaskMessage(agentProcess, taskMessage);
      }

      // Update session
      agentProcess.session.lastActivity = new Date();
      agentProcess.session.status = 'idle';
      agentProcess.session.currentTask = undefined;

      // Update performance metrics
      this.updatePerformanceMetrics(agentProcess.session, task, result);

      return result;
    } catch (error) {
      agentProcess.session.status = 'error';
      agentProcess.session.currentTask = undefined;
      agentProcess.session.performance.errorCount++;
      logger.error(
        'AgentManager',
        `Failed to send task to agent: ${sessionId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Send task to tmux-based agent
   */
  private async sendTaskToTmuxAgent(
    sessionId: string,
    taskMessage: Record<string, unknown>,
  ): Promise<AgentTaskResult> {
    try {
      // Send task instructions to tmux session
      const instructions = JSON.stringify(taskMessage);
      await this.tmuxManager.sendInstructionsToAgent(sessionId, instructions);

      // Wait for a simulated response (in real implementation, this would monitor for output)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return mock result (in real implementation, this would parse actual agent response)
      return {
        success: true,
        data: {
          message: 'Task sent to agent via tmux',
          sessionId,
        },
        duration: 1000,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  /**
   * Send task message to agent process
   */
  private async sendTaskMessage(
    agentProcess: AgentProcess,
    message: unknown,
  ): Promise<AgentTaskResult> {
    return new Promise((resolve, reject) => {
      const messageStr = `${JSON.stringify(message)  }\n`;
      agentProcess.process.stdin?.write(messageStr, (error) => {
        if (error) {
          reject(error);
          return;
        }
        // Wait for response
        const timeout = setTimeout(() => {
          reject(new Error('Agent response timeout'));
        }, 60000);
        // Listen for response
        const onData = (data: Buffer) => {
          try {
            const response = JSON.parse(data.toString().trim());
            clearTimeout(timeout);
            agentProcess.process.stdout?.removeListener('data', onData);
            resolve(response);
          } catch {
            // Not a valid JSON response, keep listening
          }
        };
        agentProcess.process.stdout?.on('data', onData);
      });
    });
  }
  /**
   * Terminate agent session
   */
  private async terminateAgent(sessionId: string): Promise<void> {
    const agentProcess = this.activeSessions.get(sessionId);
    if (!agentProcess) {
      return;
    }
    logger.info('AgentManager', `Terminating agent: ${sessionId}`);
    try {
      if (this.useTmuxManager && !agentProcess.process) {
        // Terminate tmux session
        await this.tmuxManager.terminateSession(sessionId, 'user_request');
      } else {
        // Terminate process session (fallback)
        // Send shutdown signal
        agentProcess.process.stdin?.write(`${JSON.stringify({ type: 'shutdown' })  }\n`);
        // Wait for graceful shutdown
        await new Promise((resolve) => setTimeout(resolve, 5000));
        // Force terminate if still running
        if (agentProcess.isAlive) {
          agentProcess.process.kill('SIGTERM');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          agentProcess.process.kill('SIGKILL');
        }
      }
      this.activeSessions.delete(sessionId);
      logger.info('AgentManager', `Agent terminated: ${sessionId}`);
    } catch (error) {
      logger.error(
        'AgentManager',
        `Error terminating agent: ${sessionId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkAgentHealth();
    }, 30000); // Check every 30 seconds
  }
  /**
   * Check health of all agents
   */
  private checkAgentHealth(): void {
    const now = Date.now();
    for (const [sessionId, agentProcess] of Array.from(this.activeSessions.entries())) {
      // Check if agent is responsive
      const timeSinceLastPing = now - agentProcess.lastPing.getTime();
      if (timeSinceLastPing > 120000) {
        // 2 minutes
        logger.warn('AgentManager', `Agent unresponsive: ${sessionId}`);
        // Try to ping the agent
        this.pingAgent(agentProcess);
      }
    }
  }
  /**
   * Ping agent to check responsiveness
   */
  private pingAgent(agentProcess: AgentProcess): void {
    try {
      const pingMessage = { type: 'ping', timestamp: new Date().toISOString() };
      agentProcess.process.stdin?.write(`${JSON.stringify(pingMessage)  }\n`);
    } catch (error) {
      logger.error(
        'AgentManager',
        `Failed to ping agent: ${agentProcess.session.id}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(
    session: AgentSession,
    task: AgentTask,
    result: AgentTaskResult,
  ): void {
    const {performance} = session;
    // Update task completion count
    performance.tasksCompleted++;
    // Update average task time
    const taskTime = (task.completedAt?.getTime() ?? 0) - (task.startedAt?.getTime() ?? 0);
    if (taskTime > 0) {
      performance.averageTaskTime =
        (performance.averageTaskTime * (performance.tasksCompleted - 1) + taskTime) /
        performance.tasksCompleted;
    }
    // Update success rate
    if (result.success) {
      performance.successRate =
        (performance.successRate * (performance.tasksCompleted - 1) + 1) /
        performance.tasksCompleted;
    } else {
      performance.errorCount++;
      performance.successRate =
        (performance.successRate * (performance.tasksCompleted - 1)) / performance.tasksCompleted;
    }
    // Update token usage
    if (result.tokenUsage) {
      session.tokenUsage.total += result.tokenUsage.total;
      session.tokenUsage.cost += result.tokenUsage.cost ?? 0;
      session.tokenUsage.lastUpdated = new Date();
    }
  }
}
