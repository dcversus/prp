/**
 * ♫ Enhanced Tmux Integration with Log Streaming for @dcversus/prp Tuner
 *
 * Advanced tmux integration with real-time log streaming, agent monitoring,
 * terminal event handling, and seamless orchestrator integration.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Readable, Writable, Transform } from 'stream';
import { createReadStream, createWriteStream } from 'fs';

import { EventBus } from '../shared/events';
import { createLayerLogger, TimeUtils, HashUtils, FileUtils } from '../shared';
import { PersistedLogsManager } from './persisted-logs-manager';

const execAsync = promisify(exec);

const logger = createLayerLogger('scanner');

// Enhanced tmux session configuration
interface TmuxSessionConfig {
  name: string;
  agentId: string;
  workingDirectory: string;
  command: string;
  environment: Record<string, string>;
  logPath: string;
  autoStart: boolean;
  idleTimeout: number; // milliseconds
  maxLifetime: number; // milliseconds
}

// Agent session with enhanced capabilities
interface EnhancedAgentSession {
  id: string;
  sessionId: string;
  agentId: string;
  config: TmuxSessionConfig;
  status: 'initializing' | 'running' | 'idle' | 'busy' | 'error' | 'terminating';
  startTime: Date;
  lastActivity: Date;
  metrics: {
    totalCommands: number;
    outputLines: number;
    errorCount: number;
    averageResponseTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  resources: {
    pid?: number;
    memory?: number;
    cpu?: number;
  };
  logStream: Writable | null;
  eventBuffer: Array<{
    timestamp: Date;
    type: string;
    data: unknown;
  }>;
}

// Log streaming configuration
interface LogStreamingConfig {
  enabled: boolean;
  bufferSize: number;
  flushInterval: number;
  compressionEnabled: boolean;
  realTimeStreaming: boolean;
  sessionLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Terminal event
interface TerminalEvent {
  sessionId: string;
  agentId: string;
  type: 'command' | 'output' | 'error' | 'signal' | 'status_change';
  timestamp: Date;
  data: unknown;
  metadata?: Record<string, unknown>;
}

// Stream processor for real-time log processing
class LogStreamProcessor extends Transform {
  private sessionId: string;
  private agentId: string;
  private logsManager: PersistedLogsManager;
  private buffer: string = '';

  constructor(sessionId: string, agentId: string, logsManager: PersistedLogsManager) {
    super({ objectMode: true });
    this.sessionId = sessionId;
    this.agentId = agentId;
    this.logsManager = logsManager;
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: any): void {
    const data = chunk.toString();
    this.buffer += data;

    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        this.processLine(line);
      }
    }

    callback();
  }

  private processLine(line: string): void {
    const timestamp = TimeUtils.now();

    // Determine log level from line content
    let level: 'debug' | 'info' | 'warn' | 'error' = 'info';
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
      level = 'error';
    } else if (line.toLowerCase().includes('warn') || line.toLowerCase().includes('warning')) {
      level = 'warn';
    } else if (line.toLowerCase().includes('debug')) {
      level = 'debug';
    }

    // Log to persisted logs manager
    this.logsManager.log({
      level,
      source: 'agent',
      agentId: this.agentId,
      sessionId: this.sessionId,
      message: line,
      tags: ['tmux', 'agent'],
      metadata: {
        streamProcessor: true,
        timestamp: timestamp.toISOString()
      }
    });
  }
}

/**
 * Enhanced Tmux Integration with Log Streaming
 */
export class EnhancedTmuxIntegration extends EventEmitter {
  private eventBus: EventBus;
  private logsManager: PersistedLogsManager;
  private config: LogStreamingConfig;
  private sessions: Map<string, EnhancedAgentSession> = new Map();
  private socketName: string;
  private baseSessionName: string;
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private isInitialized = false;

  constructor(
    eventBus: EventBus,
    logsManager: PersistedLogsManager,
    config: Partial<LogStreamingConfig> = {}
  ) {
    super();
    this.eventBus = eventBus;
    this.logsManager = logsManager;

    // Default configuration
    this.config = {
      enabled: true,
      bufferSize: 1000,
      flushInterval: 5000,
      compressionEnabled: false,
      realTimeStreaming: true,
      sessionLogging: true,
      logLevel: 'info',
      ...config
    };

    this.socketName = `prp-${Date.now()}`;
    this.baseSessionName = 'prp-base';
  }

  /**
   * Initialize the tmux integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('EnhancedTmuxIntegration', 'Tmux integration already initialized');
      return;
    }

    try {
      logger.info('EnhancedTmuxIntegration', 'Initializing enhanced tmux integration...');

      // Check tmux availability
      await this.checkTmuxAvailability();

      // Create base session
      await this.createBaseSession();

      // Cleanup orphaned sessions
      await this.cleanupOrphanedSessions();

      this.isInitialized = true;

      logger.info('EnhancedTmuxIntegration', '✅ Enhanced tmux integration initialized');

      this.emit('integration:initialized', {
        socketName: this.socketName,
        baseSessionName: this.baseSessionName,
        timestamp: TimeUtils.now()
      });

    } catch (error) {
      logger.error('EnhancedTmuxIntegration', 'Failed to initialize tmux integration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Spawn an agent with enhanced capabilities
   */
  async spawnAgent(config: TmuxSessionConfig): Promise<EnhancedAgentSession> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sessionId = `agent-${config.agentId}-${Date.now()}`;
    const sessionName = `${this.baseSessionName}-${config.agentId}`;

    try {
      logger.info('EnhancedTmuxIntegration', 'Spawning agent', {
        agentId: config.agentId,
        sessionId,
        workingDirectory: config.workingDirectory
      });

      // Create session in tmux
      await this.createTmuxSession(sessionName, config.workingDirectory, config.command, config.environment);

      // Create enhanced session object
      const session: EnhancedAgentSession = {
        id: randomUUID(),
        sessionId,
        agentId: config.agentId,
        config,
        status: 'initializing',
        startTime: TimeUtils.now(),
        lastActivity: TimeUtils.now(),
        metrics: {
          totalCommands: 0,
          outputLines: 0,
          errorCount: 0,
          averageResponseTime: 0
        },
        resources: {},
        logStream: null,
        eventBuffer: []
      };

      // Setup log streaming
      if (this.config.realTimeStreaming) {
        await this.setupLogStreaming(session);
      }

      // Store session
      this.sessions.set(sessionId, session);

      // Start monitoring
      this.startSessionMonitoring(session);

      // Update status
      session.status = 'running';

      // Log session creation
      if (this.config.sessionLogging) {
        this.logsManager.startSession(config.agentId);
      }

      logger.info('EnhancedTmuxIntegration', 'Agent spawned successfully', {
        sessionId,
        agentId: config.agentId
      });

      // Emit events
      this.emit('agent:spawned', {
        session,
        timestamp: TimeUtils.now()
      });

      this.eventBus.publishToChannel('tmux', {
        id: randomUUID(),
        type: 'agent_spawned',
        timestamp: TimeUtils.now(),
        source: 'tmux-integration',
        data: {
          sessionId,
          agentId: config.agentId,
          status: session.status,
          config
        },
        metadata: {}
      });

      return session;

    } catch (error) {
      logger.error('EnhancedTmuxIntegration', 'Failed to spawn agent', error instanceof Error ? error : new Error(String(error)), {
        agentId: config.agentId
      });

      // Create error session and emit failure event
      const errorSession: EnhancedAgentSession = {
        id: randomUUID(),
        sessionId,
        agentId: config.agentId,
        config,
        status: 'error',
        startTime: TimeUtils.now(),
        lastActivity: TimeUtils.now(),
        metrics: {
          totalCommands: 0,
          outputLines: 0,
          errorCount: 1,
          averageResponseTime: 0
        },
        resources: {},
        logStream: null,
        eventBuffer: []
      };

      this.sessions.set(sessionId, errorSession);

      this.emit('agent:spawn_failed', {
        session: errorSession,
        error: error instanceof Error ? error.message : String(error),
        timestamp: TimeUtils.now()
      });

      throw error;
    }
  }

  /**
   * Send command to agent session
   */
  async sendCommand(sessionId: string, command: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'running' && session.status !== 'idle') {
      throw new Error(`Session not ready for commands: ${sessionId} (status: ${session.status})`);
    }

    try {
      // Send command to tmux pane
      await this.sendKeysToPane(sessionId, command);

      // Update metrics
      session.metrics.totalCommands++;
      session.lastActivity = TimeUtils.now();
      session.status = 'busy';

      // Log command
      this.logsManager.log({
        level: 'info',
        source: 'agent',
        agentId: session.agentId,
        sessionId,
        message: `Command sent: ${command}`,
        tags: ['tmux', 'command'],
        metadata: {
          command,
          timestamp: TimeUtils.now().toISOString()
        }
      });

      // Emit command event
      this.emit('command:sent', {
        sessionId,
        agentId: session.agentId,
        command,
        timestamp: TimeUtils.now()
      });

      // Set timeout to return to idle
      setTimeout(() => {
        if (session.status === 'busy') {
          session.status = 'running';
        }
      }, 5000); // Assume command completes within 5 seconds

    } catch (error) {
      session.metrics.errorCount++;
      session.status = 'error';

      logger.error('EnhancedTmuxIntegration', 'Failed to send command', error instanceof Error ? error : new Error(String(error)), {
        sessionId,
        command
      });

      throw error;
    }
  }

  /**
   * Get session output in real-time
   */
  async getSessionOutput(sessionId: string, lines?: number): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      const command = `tmux -L ${this.socketName} capture-pane -t ${sessionId} -p${lines ? ` -S -${lines}` : ''}`;
      const { stdout } = await execAsync(command);

      return stdout;

    } catch (error) {
      logger.error('EnhancedTmuxIntegration', 'Failed to capture session output', error instanceof Error ? error : new Error(String(error)), {
        sessionId
      });
      throw error;
    }
  }

  /**
   * Terminate agent session
   */
  async terminateAgent(sessionId: string, reason: string = 'user_request'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      logger.info('EnhancedTmuxIntegration', 'Terminating agent', {
        sessionId,
        agentId: session.agentId,
        reason
      });

      // Stop monitoring
      this.stopSessionMonitoring(sessionId);

      // Close log stream
      if (session.logStream) {
        session.logStream.end();
        session.logStream = null;
      }

      // Kill tmux session
      await this.killTmuxSession(sessionId);

      // Update status
      session.status = 'terminating';

      // End session logging
      if (this.config.sessionLogging) {
        this.logsManager.endSession(sessionId, 'completed');
      }

      // Remove from active sessions
      this.sessions.delete(sessionId);

      // Log termination
      this.logsManager.log({
        level: 'info',
        source: 'agent',
        agentId: session.agentId,
        sessionId,
        message: `Agent session terminated: ${reason}`,
        tags: ['tmux', 'termination'],
        metadata: {
          reason,
          duration: TimeUtils.now().getTime() - session.startTime.getTime(),
          metrics: session.metrics
        }
      });

      // Emit termination event
      this.emit('agent:terminated', {
        sessionId,
        agentId: session.agentId,
        reason,
        session,
        timestamp: TimeUtils.now()
      });

      logger.info('EnhancedTmuxIntegration', 'Agent terminated successfully', {
        sessionId,
        agentId: session.agentId
      });

    } catch (error) {
      logger.error('EnhancedTmuxIntegration', 'Failed to terminate agent', error instanceof Error ? error : new Error(String(error)), {
        sessionId
      });
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): EnhancedAgentSession[] {
    return Array.from(this.sessions.values()).filter(session =>
      ['running', 'idle', 'busy'].includes(session.status)
    );
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): EnhancedAgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get session by agent ID
   */
  getSessionByAgentId(agentId: string): EnhancedAgentSession | undefined {
    return Array.from(this.sessions.values()).find(session => session.agentId === agentId);
  }

  /**
   * Get integration metrics
   */
  getMetrics() {
    const activeSessions = this.getActiveSessions();
    const totalOutputLines = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.metrics.outputLines, 0);
    const totalCommands = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.metrics.totalCommands, 0);
    const totalErrors = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.metrics.errorCount, 0);

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      totalOutputLines,
      totalCommands,
      totalErrors,
      averageResponseTime: this.calculateAverageResponseTime(),
      config: this.config
    };
  }

  /**
   * Stop all sessions and cleanup
   */
  async stop(): Promise<void> {
    logger.info('EnhancedTmuxIntegration', 'Stopping enhanced tmux integration...');

    // Terminate all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      try {
        await this.terminateAgent(sessionId, 'shutdown');
      } catch (error) {
        logger.warn('EnhancedTmuxIntegration', 'Failed to terminate session during shutdown', {
          sessionId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Kill base tmux session
    try {
      await execAsync(`tmux -L ${this.socketName} kill-session -t ${this.baseSessionName}`);
    } catch {
      // Base session might not exist
    }

    this.sessions.clear();
    this.isInitialized = false;

    logger.info('EnhancedTmuxIntegration', '✅ Enhanced tmux integration stopped');
  }

  // Private methods

  private async checkTmuxAvailability(): Promise<void> {
    try {
      const { stdout } = await execAsync('tmux -V');
      logger.debug('EnhancedTmuxIntegration', 'Tmux version detected', { version: stdout.trim() });
    } catch {
      throw new Error('Tmux is not available or not in PATH');
    }
  }

  private async createBaseSession(): Promise<void> {
    try {
      await execAsync(`tmux -L ${this.socketName} new-session -d -s ${this.baseSessionName}`);
      logger.debug('EnhancedTmuxIntegration', 'Base tmux session created', {
        sessionName: this.baseSessionName
      });
    } catch (error) {
      throw new Error(`Failed to create base tmux session: ${error}`);
    }
  }

  private async createTmuxSession(
    sessionName: string,
    workingDirectory: string,
    command: string,
    environment: Record<string, string>
  ): Promise<void> {
    try {
      // Build environment variables
      const envVars = Object.entries(environment)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');

      const fullCommand = `${envVars} ${command}`;

      await execAsync(`tmux -L ${this.socketName} new-session -d -s ${sessionName} -c "${workingDirectory}" '${fullCommand}'`);

    } catch (error) {
      throw new Error(`Failed to create tmux session ${sessionName}: ${error}`);
    }
  }

  private async setupLogStreaming(session: EnhancedAgentSession): Promise<void> {
    try {
      // Create log stream processor
      const logProcessor = new LogStreamProcessor(session.sessionId, session.agentId, this.logsManager);

      // Create file write stream for session logs
      const logStream = createWriteStream(session.config.logPath, { flags: 'a' });

      // Pipe log processor to file
      logProcessor.pipe(logStream);

      session.logStream = logStream;

      // Start monitoring tmux output and pipe to processor
      // This would require tmux pipe-pane functionality
      // For now, we'll simulate this with periodic captures
      this.startOutputCapture(session, logProcessor);

      logger.debug('EnhancedTmuxIntegration', 'Log streaming setup completed', {
        sessionId: session.sessionId,
        logPath: session.config.logPath
      });

    } catch (error) {
      logger.error('EnhancedTmuxIntegration', 'Failed to setup log streaming', error instanceof Error ? error : new Error(String(error)), {
        sessionId: session.sessionId
      });
    }
  }

  private startOutputCapture(session: EnhancedAgentSession, logProcessor: LogStreamProcessor): void {
    const captureInterval = setInterval(async () => {
      try {
        const output = await this.getSessionOutput(session.sessionId, 10); // Get last 10 lines
        if (output.trim()) {
          logProcessor.write(output);
        }
      } catch (error) {
        logger.warn('EnhancedTmuxIntegration', 'Failed to capture output', {
          sessionId: session.sessionId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 1000); // Capture every second

    // Store interval for cleanup
    this.monitoringIntervals.set(session.sessionId, captureInterval);
  }

  private startSessionMonitoring(session: EnhancedAgentSession): void {
    const monitoringInterval = setInterval(async () => {
      try {
        await this.updateSessionMetrics(session);
        await this.checkSessionHealth(session);
      } catch (error) {
        logger.warn('EnhancedTmuxIntegration', 'Session monitoring error', {
          sessionId: session.sessionId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 5000); // Monitor every 5 seconds

    this.monitoringIntervals.set(session.sessionId, monitoringInterval);
  }

  private stopSessionMonitoring(sessionId: string): void {
    const interval = this.monitoringIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(sessionId);
    }
  }

  private async updateSessionMetrics(session: EnhancedAgentSession): Promise<void> {
    try {
      // Check if session still exists
      await execAsync(`tmux -L ${this.socketName} has-session -t ${session.sessionId}`);

      // Update last activity
      session.lastActivity = TimeUtils.now();

      // Update status if was busy for too long
      if (session.status === 'busy') {
        const busyDuration = TimeUtils.now().getTime() - session.lastActivity.getTime();
        if (busyDuration > 10000) { // 10 seconds
          session.status = 'running';
        }
      }

    } catch {
      // Session doesn't exist anymore
      session.status = 'error';
      session.metrics.errorCount++;
    }
  }

  private async checkSessionHealth(session: EnhancedAgentSession): Promise<void> {
    // Check for idle timeout
    const idleTime = TimeUtils.now().getTime() - session.lastActivity.getTime();
    if (idleTime > session.config.idleTimeout) {
      this.emit('session:idle', {
        sessionId: session.sessionId,
        agentId: session.agentId,
        idleTime,
        timestamp: TimeUtils.now()
      });
    }

    // Check for maximum lifetime
    const lifetime = TimeUtils.now().getTime() - session.startTime.getTime();
    if (lifetime > session.config.maxLifetime) {
      this.emit('session:max_lifetime', {
        sessionId: session.sessionId,
        agentId: session.agentId,
        lifetime,
        timestamp: TimeUtils.now()
      });
    }
  }

  private async sendKeysToPane(sessionId: string, keys: string): Promise<void> {
    const command = `tmux -L ${this.socketName} send-keys -t ${sessionId} "${keys.replace(/"/g, '\\"')}" Enter`;
    await execAsync(command);
  }

  private async killTmuxSession(sessionId: string): Promise<void> {
    const command = `tmux -L ${this.socketName} kill-session -t ${sessionId}`;
    await execAsync(command);
  }

  private async cleanupOrphanedSessions(): Promise<void> {
    try {
      const { stdout } = await execAsync(`tmux -L ${this.socketName} list-sessions -F "#{session_name}"`);
      const sessions = stdout.trim().split('\n');

      for (const sessionName of sessions) {
        if (sessionName.includes('agent-')) {
          try {
            await this.killTmuxSession(sessionName);
            logger.debug('EnhancedTmuxIntegration', 'Cleaned up orphaned session', { sessionName });
          } catch (error) {
            logger.warn('EnhancedTmuxIntegration', 'Failed to cleanup orphaned session', {
              sessionName,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

    } catch (error) {
      logger.warn('EnhancedTmuxIntegration', 'Failed to cleanup orphaned sessions', { error });
    }
  }

  private calculateAverageResponseTime(): number {
    const sessions = Array.from(this.sessions.values());
    if (sessions.length === 0) {
      return 0;
    }

    const totalResponseTime = sessions.reduce((sum, session) => sum + session.metrics.averageResponseTime, 0);
    return totalResponseTime / sessions.length;
  }
}