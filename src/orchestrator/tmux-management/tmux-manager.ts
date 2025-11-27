/**
 * ♫ Tmux Manager for @dcversus/prp
 *
 * Core tmux session management with agent spawning,
 * monitoring, and orchestration capabilities.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { setTimeout, clearTimeout, setInterval } from 'timers';

import { createLayerLogger } from '../../shared/logger';

import type { EventBus } from '../../shared/events';
import type {
  TmuxConfig,
  TmuxSession,
  AgentTerminalSession,
  TmuxCommand,
  AgentMessage,
  TmuxManagerAPI,
} from '../../shared/tmux-exports';
import type { AgentConfig as CommonAgentConfig } from '../../shared/types';

// Create a unified agent config type that works with both systems
type AgentConfig = CommonAgentConfig & {
  provider?: string;
  authentication?: {
    credentials?: {
      apiKey?: string;
    };
  };
  personality?: string;
  tools?: string[];
  limits?: {
    maxTokensPerRequest?: number;
    maxRequestsPerHour?: number;
    maxRequestsPerDay?: number;
    maxCostPerDay?: number;
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
    maxConcurrentTasks?: number;
    cooldownPeriod?: number;
  };
  metadata?: Record<string, unknown>;
};

const execAsync = promisify(exec);
/**
 * Manages tmux sessions, agents, and terminal monitoring
 */
export class TmuxManager implements TmuxManagerAPI {
  private readonly config: TmuxConfig;
  private readonly eventBus: EventBus;
  private readonly logger: ReturnType<typeof createLayerLogger>;
  private readonly sessions = new Map<string, TmuxSession>();
  private readonly agentSessions = new Map<string, AgentTerminalSession>();
  private readonly commandQueue = new Map<string, TmuxCommand>();
  private readonly monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private readonly activityTrackers = new Map<string, NodeJS.Timeout>();
  private readonly lastActivities = new Map<string, Date>();
  private isInitialized = false;
  constructor(config: TmuxConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.logger = createLayerLogger('orchestrator');
  }
  /**
   * Initialize tmux manager and verify tmux availability
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      // Check tmux availability
      await this.checkTmuxAvailability();
      // Create or attach to base session
      await this.ensureBaseSession();
      // Clean up orphaned sessions
      await this.cleanupOrphanedSessions();
      this.isInitialized = true;
      this.logger.info('TmuxManager', 'TmuxManager initialized', {
        socketName: this.config.socketName,
        baseSession: this.config.baseSessionName,
      });
      this.eventBus.publishToChannel('tmux', {
        id: `tmux_${Date.now()}`,
        type: 'manager.initialized',
        timestamp: new Date(),
        source: 'tmux-manager',
        data: {
          timestamp: new Date(),
          config: this.config,
        },
        metadata: {},
      });
    } catch (error) {
      this.logger.error(
        'TmuxManager',
        'Failed to initialize TmuxManager',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Create a new tmux session for an agent
   */
  async createAgentSession(
    agentId: string,
    agentConfig: AgentConfig,
    instructions: string,
    workingDirectory: string = process.cwd(),
  ): Promise<AgentTerminalSession> {
    await this.ensureInitialized();
    const sessionId = `agent_${agentId}_${Date.now()}`;
    const sessionName = `${this.config.baseSessionName}-agent-${agentId}`;
    try {
      // Create log directory
      const logDir = path.join('/tmp/prp-logs', 'agents');
      await fs.mkdir(logDir, { recursive: true });
      const logPath = path.join(logDir, `${sessionId}.log`);
      // Create tmux session
      const { windowId, paneId } = await this.createTmuxSession(sessionName, workingDirectory);
      // Create agent session object
      const agentSession: AgentTerminalSession = {
        id: sessionId,
        name: sessionName,
        windowId,
        paneId,
        agentId,
        agentConfig,
        instructions,
        capabilities: Array.isArray(agentConfig.capabilities)
          ? agentConfig.capabilities
          : Object.keys(agentConfig.capabilities),
        logPath,
        state: 'initializing',
        status: 'creating',
        createdAt: new Date(),
        lastActivity: new Date(),
        lastInteraction: new Date(),
        interactionCount: 0,
        messages: [],
        workingDirectory,
        command: this.config.defaultShell,
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
        agentCapabilities: {
          supportsTools: Boolean(agentConfig.tools?.length),
          supportsImages: agentConfig.type?.toString().includes('claude'),
          supportsSubAgents: false,
          supportsParallel: false,
          supportsCodeExecution: agentConfig.capabilities?.canExecuteCommands || false,
          maxContextLength: agentConfig.capabilities?.maxContextLength || 4096,
          supportedModels: agentConfig.capabilities?.supportedModels || [],
          supportedFileTypes: agentConfig.capabilities?.supportedFileTypes || [],
          canAccessInternet: agentConfig.capabilities?.canAccessInternet || false,
          canAccessFileSystem: agentConfig.capabilities?.canAccessFileSystem || true,
          canExecuteCommands: agentConfig.capabilities?.canExecuteCommands || false,
          availableTools: agentConfig.tools || [],
          specializations: agentConfig.capabilities?.specializations || [],
        },
        environment: {
          ...process.env,
          PRP_AGENT_ID: agentId,
          PRP_SESSION_ID: sessionId,
          PRP_LOG_PATH: logPath,
        },
        metadata: {
          agentType: agentConfig.type,
          agentRole: agentConfig.role,
          priority: 5,
          tags: [agentConfig.role],
          description: `Agent session for ${agentId}`,
          spawnedBy: 'orchestrator',
          resources: {
            initialMemory: 0,
            initialCpu: 0,
            peakMemory: 0,
            peakCpu: 0,
            averageMemory: 0,
            averageCpu: 0,
          },
        },
      };
      // Store session
      this.sessions.set(sessionId, agentSession);
      this.agentSessions.set(agentId, agentSession);
      this.lastActivities.set(sessionId, new Date());
      // Start monitoring
      this.startSessionMonitoring(sessionId);
      this.startActivityTracking(sessionId);
      // Send initial instructions
      await this.sendInstructionsToAgent(sessionId, instructions);
      // Update state
      agentSession.state = 'ready';
      agentSession.status = 'running';
      agentSession.startTime = new Date();
      // Log initial resource metrics
      await this.captureResourceMetrics(sessionId);
      // Emit event
      this.eventBus.publishToChannel('tmux', {
        id: `tmux_${Date.now()}`,
        type: 'session.created',
        timestamp: new Date(),
        source: 'tmux-manager',
        data: {
          sessionId,
          session: agentSession,
          timestamp: new Date(),
        },
        metadata: {},
      });
      this.logger.info('TmuxManager', 'Agent session created', {
        sessionId,
        agentId,
        sessionName,
        workingDirectory,
      });
      return agentSession;
    } catch (error) {
      this.logger.error(
        'createAgentSession',
        'Failed to create agent session',
        error instanceof Error ? error : new Error(String(error)),
        {
          agentId,
          sessionId,
        },
      );
      // Emit error event
      this.eventBus.publishToChannel('tmux', {
        id: `tmux_${Date.now()}`,
        type: 'error',
        timestamp: new Date(),
        source: 'tmux-manager',
        data: {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          context: 'create_agent_session',
          recoverable: true,
          timestamp: new Date(),
        },
        metadata: {},
      });
      throw error;
    }
  }
  /**
   * Send instructions to an agent session
   */
  async sendInstructionsToAgent(sessionId: string, instructions: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    try {
      // Send instructions to tmux pane
      await this.sendKeysToPane(session.paneId, instructions);
      // Log instruction
      if (this.isAgentSession(session)) {
        const message: AgentMessage = {
          id: randomUUID(),
          timestamp: new Date(),
          type: 'instruction',
          direction: 'to_agent',
          content: instructions,
        };
        session.messages.push(message);
        session.lastInteraction = new Date();
        session.interactionCount++;
        // Emit message event
        this.eventBus.publishToChannel('tmux', {
          id: `tmux_${Date.now()}`,
          type: 'agent.message',
          timestamp: new Date(),
          source: 'tmux-manager',
          data: {
            sessionId,
            agentId: session.agentId,
            message,
            timestamp: new Date(),
          },
          metadata: {},
        });
      }
      this.logger.debug('TmuxManager', 'Instructions sent to agent', {
        sessionId,
        instructionLength: instructions.length,
      });
    } catch (error) {
      this.logger.error(
        'sendInstructions',
        'Failed to send instructions to agent',
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId,
        },
      );
      throw error;
    }
  }
  /**
   * Get session output/logs
   */
  async getSessionOutput(sessionId: string, lines?: number): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    try {
      const command = `tmux capture-pane -t ${session.paneId} -p${lines ? ` -S -${lines}` : ''}`;
      const { stdout } = await execAsync(command, {
        env: { ...process.env, TMUX: this.config.socketName },
      });
      return stdout;
    } catch (error) {
      this.logger.error(
        'getSessionOutput',
        'Failed to capture session output',
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId,
        },
      );
      throw error;
    }
  }
  /**
   * Terminate a session
   */
  async terminateSession(
    sessionId: string,
    reason: 'user_request' | 'timeout' | 'error' | 'agent_completed' = 'user_request',
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return; // Session already terminated
    }
    try {
      // Stop monitoring
      this.stopSessionMonitoring(sessionId);
      this.stopActivityTracking(sessionId);
      // Kill tmux session
      await this.killTmuxSession(session.name);
      // Update session
      session.status = 'terminating';
      session.endTime = new Date();
      // Final resource capture
      await this.captureResourceMetrics(sessionId);
      // Remove from active sessions
      this.sessions.delete(sessionId);
      if (this.isAgentSession(session)) {
        this.agentSessions.delete(session.agentId);
      }
      // Emit termination event
      this.eventBus.publishToChannel('tmux', {
        id: `tmux_${Date.now()}`,
        type: 'session.terminated',
        timestamp: new Date(),
        source: 'tmux-manager',
        data: {
          sessionId,
          session,
          reason,
          timestamp: new Date(),
        },
        metadata: {},
      });
      this.logger.info('TmuxManager', 'Session terminated', {
        sessionId,
        reason,
        duration: session.endTime.getTime() - session.createdAt.getTime(),
      });
    } catch (error) {
      this.logger.error(
        'terminateSession',
        'Failed to terminate session',
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId,
        },
      );
      throw error;
    }
  }
  /**
   * Get active sessions
   */
  getActiveSessions(): TmuxSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === 'running' || s.status === 'idle',
    );
  }
  /**
   * Get agent sessions
   */
  getAgentSessions(): AgentTerminalSession[] {
    return Array.from(this.agentSessions.values());
  }
  /**
   * Get session by ID
   */
  getSession(sessionId: string): TmuxSession | undefined {
    return this.sessions.get(sessionId);
  }
  /**
   * Get agent session by agent ID
   */
  getAgentSession(agentId: string): AgentTerminalSession | undefined {
    return this.agentSessions.get(agentId);
  }
  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      try {
        await this.terminateSession(sessionId, 'user_request');
      } catch (error) {
        this.logger.warn('TmuxManager', 'Failed to cleanup session', { sessionId, error });
      }
    }
    this.sessions.clear();
    this.agentSessions.clear();
    this.commandQueue.clear();
    this.lastActivities.clear();
    this.logger.info('TmuxManager', 'TmuxManager cleanup completed');
  }

  // ===== TMUX MANAGER API IMPLEMENTATION =====

  /**
   * Spawn a new agent in a tmux session
   * Alias for createAgentSession to match API interface
   */
  async spawnAgent(
    agentId: string,
    agentConfig: AgentConfig,
    instructions: string,
    workingDirectory?: string,
  ): Promise<AgentTerminalSession> {
    return this.createAgentSession(agentId, agentConfig, instructions, workingDirectory);
  }

  /**
   * Stop a running agent
   */
  async stopAgent(
    agentId: string,
    reason: 'user_request' | 'timeout' | 'error' | 'agent_completed' = 'user_request',
    graceful = true,
    timeout = 10000,
  ): Promise<{ success: boolean; terminatedAt: Date; method: string }> {
    const agentSession = this.agentSessions.get(agentId);
    if (!agentSession) {
      return {
        success: false,
        terminatedAt: new Date(),
        method: 'not_found',
      };
    }

    try {
      if (graceful) {
        // Try graceful shutdown first
        try {
          await this.sendInstructionsToAgent(agentSession.id, '#shutdown');
          // Wait for graceful shutdown
          await new Promise((resolve) => {
            const shutdownTimeout = setTimeout(() => resolve(undefined), timeout);
            const checkInterval = setInterval(() => {
              const session = this.sessions.get(agentSession.id);
              if (!session || session.status === 'stopped') {
                clearTimeout(shutdownTimeout);
                clearInterval(checkInterval);
                resolve(undefined);
              }
            }, 500);
          });
        } catch (gracefulError) {
          this.logger.warn('stopAgent', 'Graceful shutdown failed, forcing termination', {
            agentId,
            error: gracefulError,
          });
        }
      }

      // Force termination
      await this.terminateSession(agentSession.id, reason);

      return {
        success: true,
        terminatedAt: new Date(),
        method: graceful ? 'graceful_or_force' : 'force',
      };
    } catch (error) {
      this.logger.error('stopAgent', 'Failed to stop agent', error instanceof Error ? error : new Error(String(error)), {
        agentId,
      });
      return {
        success: false,
        terminatedAt: new Date(),
        method: 'failed',
      };
    }
  }

  /**
   * Send a message to an agent
   */
  async sendMessage(
    agentId: string,
    message: string,
    messageType: 'instruction' | 'query' | 'signal' | 'update' = 'instruction',
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
  ): Promise<{
    success: boolean;
    messageId: string;
    sentAt: Date;
    deliveryStatus: 'sent' | 'queued' | 'failed';
  }> {
    const agentSession = this.agentSessions.get(agentId);
    if (!agentSession) {
      return {
        success: false,
        messageId: '',
        sentAt: new Date(),
        deliveryStatus: 'failed',
      };
    }

    try {
      const messageId = randomUUID();
      const agentMessage: AgentMessage = {
        id: messageId,
        timestamp: new Date(),
        type: messageType === 'instruction' ? 'instruction' : 'status',
        direction: 'to_agent',
        content: message,
        metadata: {
          priority,
          deliveryAttempts: 1,
          originalType: messageType,
        },
      };

      // Send instructions to agent
      await this.sendInstructionsToAgent(agentSession.id, message);

      // Add to message history
      agentSession.messages.push(agentMessage);
      agentSession.lastInteraction = new Date();
      agentSession.interactionCount++;

      // Emit message event
      this.eventBus.publishToChannel('tmux', {
        id: `tmux_${Date.now()}`,
        type: 'agent.message',
        timestamp: new Date(),
        source: 'tmux-manager',
        data: {
          sessionId: agentSession.id,
          agentId,
          message: agentMessage,
          timestamp: new Date(),
        },
        metadata: {},
      });

      this.logger.info('sendMessage', `Message sent to agent ${agentId}`, {
        messageId,
        messageType,
        priority,
      });

      return {
        success: true,
        messageId,
        sentAt: new Date(),
        deliveryStatus: 'sent',
      };
    } catch (error) {
      this.logger.error('sendMessage', 'Failed to send message to agent', error instanceof Error ? error : new Error(String(error)), {
        agentId,
        message: message.substring(0, 100), // Limit log size
      });
      return {
        success: false,
        messageId: '',
        sentAt: new Date(),
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Get agent status and health information
   */
  async getAgentStatus(agentId: string, includeMetrics = false): Promise<{
    agentId: string;
    status: string;
    state: string;
    uptime: number;
    lastActivity: Date;
    tokenUsage: { used: number; limit: number; cost?: number };
    performance: {
      tasksCompleted: number;
      averageTaskTime: number;
      successRate: number;
      errorCount: number;
    };
    sessionInfo: {
      sessionId: string;
      sessionName: string;
      workingDirectory: string;
      logPath: string;
      pid?: string;
    };
  }> {
    const agentSession = this.agentSessions.get(agentId);
    if (!agentSession) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const now = new Date();
    const uptime = agentSession.startTime ? now.getTime() - agentSession.startTime.getTime() : 0;

    // Calculate success rate
    const successRate = agentSession.performance.tasksCompleted > 0
      ? (agentSession.performance.tasksCompleted - agentSession.performance.errorCount) / agentSession.performance.tasksCompleted
      : 1.0;

    // Get current resource metrics if requested
    let currentMemory = 0;
    let currentCpu = 0;
    if (includeMetrics) {
      await this.captureResourceMetrics(agentSession.id);
      currentMemory = agentSession.metadata.resources.peakMemory;
      currentCpu = agentSession.metadata.resources.peakCpu;
    }

    return {
      agentId,
      status: agentSession.status,
      state: agentSession.state,
      uptime,
      lastActivity: agentSession.lastActivity,
      tokenUsage: {
        used: agentSession.tokenUsage.total,
        limit: agentSession.agentConfig.limits?.maxTokensPerRequest || 1000000,
        cost: agentSession.tokenUsage.cost,
      },
      performance: {
        tasksCompleted: agentSession.performance.tasksCompleted,
        averageTaskTime: agentSession.performance.averageTaskTime,
        successRate,
        errorCount: agentSession.performance.errorCount,
      },
      sessionInfo: {
        sessionId: agentSession.id,
        sessionName: agentSession.name,
        workingDirectory: agentSession.workingDirectory,
        logPath: agentSession.logPath,
        pid: agentSession.pid,
      },
    };
  }

  /**
   * List all active agents
   */
  async listActiveAgents(): Promise<AgentTerminalSession[]> {
    return this.getAgentSessions().filter(
      (session) => session.status === 'running' || session.status === 'idle'
    );
  }

  /**
   * Get logs from an agent session
   */
  async getAgentLogs(
    agentId: string,
    options: {
      lines?: number;
      since?: Date;
      until?: Date;
      level?: 'debug' | 'info' | 'warn' | 'error';
    } = {},
  ): Promise<string> {
    const agentSession = this.agentSessions.get(agentId);
    if (!agentSession) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      // Get session output
      const output = await this.getSessionOutput(agentSession.id, options.lines || 100);

      // Filter by date range if specified
      if (options.since || options.until) {
        const lines = output.split('\n');
        const filteredLines = lines.filter(line => {
          // Simple timestamp-based filtering
          // In a real implementation, we'd parse actual timestamps
          return true; // Placeholder
        });
        return filteredLines.join('\n');
      }

      // Filter by log level if specified
      if (options.level) {
        const lines = output.split('\n');
        const filteredLines = lines.filter(line =>
          line.toLowerCase().includes(options.level!)
        );
        return filteredLines.join('\n');
      }

      return output;
    } catch (error) {
      this.logger.error('getAgentLogs', 'Failed to get agent logs', error instanceof Error ? error : new Error(String(error)), {
        agentId,
      });
      throw error;
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(
    agentId: string,
    period: '1h' | '6h' | '24h' | '7d' = '24h'
  ): Promise<{
    agentId: string;
    period: string;
    tokenUsage: {
      total: number;
      cost: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    performance: {
      taskCompletionRate: number;
      averageResponseTime: number;
      errorRate: number;
    };
    resourceUsage: {
      peakMemory: number;
      averageCpu: number;
      diskUsage: number;
    };
  }> {
    const agentSession = this.agentSessions.get(agentId);
    if (!agentSession) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Get current resource metrics
    await this.captureResourceMetrics(agentSession.id);

    // Calculate trends (simplified implementation)
    const tokenTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'; // Would compare with historical data
    const successRate = agentSession.performance.tasksCompleted > 0
      ? (agentSession.performance.tasksCompleted - agentSession.performance.errorCount) / agentSession.performance.tasksCompleted
      : 1.0;

    return {
      agentId,
      period,
      tokenUsage: {
        total: agentSession.tokenUsage.total,
        cost: agentSession.tokenUsage.cost,
        trend: tokenTrend,
      },
      performance: {
        taskCompletionRate: successRate,
        averageResponseTime: agentSession.performance.averageTaskTime,
        errorRate: agentSession.performance.errorCount / Math.max(agentSession.performance.tasksCompleted, 1),
      },
      resourceUsage: {
        peakMemory: agentSession.metadata.resources.peakMemory,
        averageCpu: agentSession.metadata.resources.averageCpu,
        diskUsage: 0, // Would need to calculate actual disk usage
      },
    };
  }
  // Private methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  private async checkTmuxAvailability(): Promise<void> {
    try {
      const { stdout } = await execAsync('tmux -V');
      this.logger.info('TmuxManager', 'Tmux version detected', { version: stdout.trim() });
    } catch {
      throw new Error('Tmux is not available or not in PATH');
    }
  }
  private async ensureBaseSession(): Promise<void> {
    try {
      // Check if base session exists
      await execAsync(
        `tmux -L ${this.config.socketName} has-session -t ${this.config.baseSessionName}`,
        {
          env: { ...process.env, TMUX: this.config.socketName },
        },
      );
    } catch {
      // Create base session if it doesn't exist
      try {
        await execAsync(
          `tmux -L ${this.config.socketName} new-session -d -s ${this.config.baseSessionName}`,
          {
            env: { ...process.env, TMUX: this.config.socketName },
          },
        );
        this.logger.info('TmuxManager', 'Base tmux session created', {
          sessionName: this.config.baseSessionName,
        });
      } catch (createError) {
        throw new Error(`Failed to create base tmux session: ${createError}`);
      }
    }
  }
  private async createTmuxSession(
    sessionName: string,
    workingDirectory: string,
  ): Promise<{ windowId: string; paneId: string }> {
    try {
      const command = `tmux -L ${this.config.socketName} new-session -d -s ${sessionName} -c "${workingDirectory}"`;
      await execAsync(command, {
        env: { ...process.env, TMUX: this.config.socketName },
      });
      // Get window and pane IDs
      const listCommand = `tmux -L ${this.config.socketName} list-panes -t ${sessionName} -F "#{window_id} #{pane_id}"`;
      const { stdout: listOutput } = await execAsync(listCommand, {
        env: { ...process.env, TMUX: this.config.socketName },
      });
      const parts = listOutput.trim().split(' ');
      const windowId = parts[0] ?? '';
      const paneId = parts[1] ?? '';
      if (!windowId || !paneId) {
        throw new Error(`Invalid tmux output format: ${listOutput}`);
      }
      return { windowId, paneId };
    } catch (error) {
      throw new Error(`Failed to create tmux session ${sessionName}: ${error}`);
    }
  }
  private async sendKeysToPane(paneId: string, keys: string): Promise<void> {
    const command = `tmux -L ${this.config.socketName} send-keys -t ${paneId} "${keys.replace(/"/g, '\\"')}" Enter`;
    await execAsync(command, {
      env: { ...process.env, TMUX: this.config.socketName },
    });
  }
  private async killTmuxSession(sessionName: string): Promise<void> {
    const command = `tmux -L ${this.config.socketName} kill-session -t ${sessionName}`;
    await execAsync(command, {
      env: { ...process.env, TMUX: this.config.socketName },
    });
  }
  private async cleanupOrphanedSessions(): Promise<void> {
    try {
      const listCommand = `tmux -L ${this.config.socketName} list-sessions -F "#{session_name}"`;
      const { stdout } = await execAsync(listCommand, {
        env: { ...process.env, TMUX: this.config.socketName },
      });
      const sessions = stdout.trim().split('\n');
      const prpSessions = sessions.filter((s) => s.includes(this.config.baseSessionName));
      for (const sessionName of prpSessions) {
        if (sessionName !== this.config.baseSessionName) {
          try {
            await this.killTmuxSession(sessionName);
            this.logger.info('TmuxManager', 'Cleaned up orphaned session', { sessionName });
          } catch (error) {
            this.logger.warn('TmuxManager', 'Failed to cleanup orphaned session', {
              sessionName,
              error,
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('TmuxManager', 'Failed to cleanup orphaned sessions', { error });
    }
  }
  private startSessionMonitoring(sessionId: string): void {
    const interval = setInterval(async () => {
      try {
        await this.captureResourceMetrics(sessionId);
        await this.checkSessionHealth(sessionId);
      } catch (error) {
        this.logger.error(
          'monitorSession',
          'Session monitoring error',
          error instanceof Error ? error : new Error(String(error)),
          { sessionId },
        );
      }
    }, this.config.resourceMonitoring.intervalMs);
    this.monitoringIntervals.set(sessionId, interval);
  }
  private stopSessionMonitoring(sessionId: string): void {
    const interval = this.monitoringIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(sessionId);
    }
  }
  private startActivityTracking(sessionId: string): void {
    const interval = setInterval(async () => {
      const now = new Date();
      const lastActivity = this.lastActivities.get(sessionId);
      if (lastActivity) {
        const idleTime = now.getTime() - lastActivity.getTime();
        if (idleTime > this.config.idleTimeout) {
          // Emit idle detection event
          this.eventBus.publishToChannel('tmux', {
            id: `tmux_${Date.now()}`,
            type: 'idle.detected',
            timestamp: new Date(),
            source: 'tmux-manager',
            data: {
              sessionId,
              idleDuration: idleTime,
              lastActivity,
              timestamp: now,
            },
            metadata: {},
          });
          // Update session status
          const session = this.sessions.get(sessionId);
          if (session?.status === 'running') {
            session.status = 'idle';
            session.lastActivity = now;
          }
        }
      }
    }, this.config.idleTimeout / 2); // Check twice as often as timeout
    this.activityTrackers.set(sessionId, interval);
  }
  private stopActivityTracking(sessionId: string): void {
    const interval = this.activityTrackers.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.activityTrackers.delete(sessionId);
    }
    this.lastActivities.delete(sessionId);
  }
  private async captureResourceMetrics(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.pid) {
      return;
    }
    try {
      // Get process resource usage
      const statsCommand = `ps -p ${session.pid} -o pid,pcpu,pmem,rss,vsz --no-headers`;
      const { stdout } = await execAsync(statsCommand);
      if (stdout.trim()) {
        const parts = stdout.trim().split(/\s+/);
        const rss = parts[3];
        const cpu = parts[1];
        const memoryMB = parseInt(rss ?? '0', 10) / 1024;
        const cpuUsage = parseFloat(cpu ?? '0');
        // Update session metadata
        const {resources} = session.metadata;
        resources.peakMemory = Math.max(resources.peakMemory, memoryMB);
        resources.peakCpu = Math.max(resources.peakCpu, cpuUsage);
        // Check resource thresholds
        if (memoryMB > 1000) {
          // 1GB threshold
          this.eventBus.publishToChannel('tmux', {
            id: `tmux_${Date.now()}`,
            type: 'resource.alert',
            timestamp: new Date(),
            source: 'tmux-manager',
            data: {
              sessionId,
              metric: 'memory',
              currentValue: memoryMB,
              threshold: 1000,
              timestamp: new Date(),
            },
            metadata: {},
          });
        }
        if (cpuUsage > 80) {
          // 80% CPU threshold
          this.eventBus.publishToChannel('tmux', {
            id: `tmux_${Date.now()}`,
            type: 'resource.alert',
            timestamp: new Date(),
            source: 'tmux-manager',
            data: {
              sessionId,
              metric: 'cpu',
              currentValue: cpuUsage,
              threshold: 80,
              timestamp: new Date(),
            },
            metadata: {},
          });
        }
      }
    } catch (error) {
      // Process might have ended
      this.logger.debug('TmuxManager', 'Failed to capture resource metrics', { sessionId, error });
    }
  }
  private async checkSessionHealth(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    try {
      // Check if tmux session still exists
      const checkCommand = `tmux -L ${this.config.socketName} has-session -t ${session.name}`;
      await execAsync(checkCommand, {
        env: { ...process.env, TMUX: this.config.socketName },
      });
      // Update last activity
      this.lastActivities.set(sessionId, new Date());
      // Update session status if it was idle
      if (session.status === 'idle') {
        session.status = 'running';
      }
    } catch {
      // Session has ended
      session.status = 'stopped';
      session.endTime = new Date();
      this.eventBus.publishToChannel('tmux', {
        id: `tmux_${Date.now()}`,
        type: 'session.terminated',
        timestamp: new Date(),
        source: 'tmux-manager',
        data: {
          sessionId,
          session,
          reason: 'error',
          timestamp: new Date(),
        },
        metadata: {},
      });
      this.stopSessionMonitoring(sessionId);
      this.stopActivityTracking(sessionId);
    }
  }
  private isAgentSession(session: TmuxSession): session is AgentTerminalSession {
    return 'agentId' in session && 'messages' in session;
  }
}
