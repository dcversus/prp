/**
 * ♫ Agent Log Streaming System for @dcversus/prp
 *
 * Real-time agent log streaming and signal detection system.
 * Connects to tmux sessions, streams agent logs, and detects signals
 * in real-time for immediate TUI updates.
 *
 * Features:
 * - Tmux session connection and log streaming
 * - Real-time signal detection from agent output
 * - Automatic agent discovery and management
 * - Performance monitoring and error handling
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

import { createLayerLogger, TimeUtils } from '../shared';
import { eventBusIntegration } from '../shared/signals/event-bus-integration';

import type { TmuxManagerAPI } from '../shared/types/tmux';
import type { AgentSession, LogStream, StreamingConfig, AgentLogEntry } from '../shared/types/common';
import type { SignalEvent } from '../shared/types/signals';

const logger = createLayerLogger('orchestrator');

/**
 * Agent Log Streaming Manager
 *
 * Manages real-time log streaming from active agent tmux sessions
 * and connects to the EventBus for signal detection and distribution.
 */
export class AgentLogStreamingManager extends EventEmitter {
  private static instance: AgentLogStreamingManager | null = null;

  private isInitialized = false;
  private readonly config: StreamingConfig;
  private readonly tmuxManager: TmuxManagerAPI;

  // Active streams and sessions
  private readonly activeStreams = new Map<string, LogStream>();
  private readonly activeSessions = new Map<string, AgentSession>();
  private readonly sessionMonitors = new Map<string, NodeJS.Timeout>();

  // Signal detection
  private readonly signalPatterns = new Map<string, RegExp>();

  constructor(tmuxManager: TmuxManagerAPI, config: Partial<StreamingConfig> = {}) {
    super();

    this.tmuxManager = tmuxManager;
    this.config = {
      bufferSize: 1000,
      flushInterval: 100,
      maxConcurrency: 10,
      enableCompression: false,
      enableFiltering: true,
      enableDeduplication: true,
      autoDiscovery: true,
      monitorInterval: 5000,
      maxLogLineLength: 10000,
      signalDetectionTimeout: 5000,
      ...config,
    };

    this.initializeSignalPatterns();
  }

  /**
   * Get singleton instance
   */
  static getInstance(tmuxManager: TmuxManagerAPI, config?: Partial<StreamingConfig>): AgentLogStreamingManager {
    if (!AgentLogStreamingManager.instance) {
      AgentLogStreamingManager.instance = new AgentLogStreamingManager(tmuxManager, config);
    }
    return AgentLogStreamingManager.instance;
  }

  /**
   * Initialize the log streaming system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('AgentLogStreamingManager', 'Log streaming already initialized');
      return;
    }

    try {
      logger.info('AgentLogStreamingManager', 'Initializing agent log streaming system...');

      // Initialize EventBus integration
      await eventBusIntegration.initialize();

      // Discover existing agent sessions
      if (this.config.autoDiscovery) {
        await this.discoverAgentSessions();
      }

      // Start session monitoring
      this.startSessionMonitoring();

      // Setup cleanup handlers
      this.setupCleanupHandlers();

      this.isInitialized = true;
      logger.info('AgentLogStreamingManager', '✅ Agent log streaming initialized successfully');

      this.emit('streaming:initialized', {
        timestamp: TimeUtils.now(),
        activeSessions: Array.from(this.activeSessions.keys()),
        activeStreams: Array.from(this.activeStreams.keys()),
      });

    } catch (error) {
      logger.error('AgentLogStreamingManager', 'Failed to initialize log streaming', error as Error);
      throw error;
    }
  }

  /**
   * Start streaming logs for a specific agent session
   */
  async startAgentStreaming(sessionId: string, agentId: string): Promise<void> {
    if (this.activeStreams.has(sessionId)) {
      logger.warn('AgentLogStreamingManager', 'Streaming already active for session', { sessionId });
      return;
    }

    try {
      logger.info('AgentLogStreamingManager', 'Starting agent log streaming', { sessionId, agentId });

      // Create log stream
      const stream: LogStream = {
        id: randomUUID(),
        sessionId,
        agentId,
        isActive: true,
        startTime: TimeUtils.now(),
        lastActivity: TimeUtils.now(),
        buffer: [],
        bufferSize: this.config.bufferSize,
        lineCount: 0,
        signalsDetected: 0,
        errors: 0,
      };

      // Store stream and session info
      this.activeStreams.set(sessionId, stream);
      this.activeSessions.set(sessionId, {
        id: sessionId,
        agentId,
        tmuxSession: sessionId,
        startTime: TimeUtils.now(),
        isActive: true,
        lastSeen: TimeUtils.now(),
      });

      // Start log monitoring for the session
      await this.startLogMonitoring(sessionId);

      // Start EventBus integration for this agent
      await eventBusIntegration.startAgentLogStreaming(agentId, sessionId);

      logger.info('AgentLogStreamingManager', '✅ Agent log streaming started', { sessionId, agentId, streamId: stream.id });

      this.emit('agent:streaming:started', {
        sessionId,
        agentId,
        streamId: stream.id,
      });

    } catch (error) {
      logger.error('AgentLogStreamingManager', 'Failed to start agent streaming', error as Error, { sessionId, agentId });
      throw error;
    }
  }

  /**
   * Stop streaming logs for a specific agent session
   */
  async stopAgentStreaming(sessionId: string): Promise<void> {
    const stream = this.activeStreams.get(sessionId);
    if (!stream) {
      logger.warn('AgentLogStreamingManager', 'No active stream for session', { sessionId });
      return;
    }

    try {
      logger.info('AgentLogStreamingManager', 'Stopping agent log streaming', { sessionId });

      // Mark stream as inactive
      stream.isActive = false;
      stream.endTime = TimeUtils.now();

      // Update session info
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.isActive = false;
      }

      // Stop log monitoring
      this.stopLogMonitoring(sessionId);

      // Stop EventBus integration
      if (session?.agentId) {
        await eventBusIntegration.stopAgentLogStreaming(session.agentId);
      }

      // Clean up after delay
      setTimeout(() => {
        this.activeStreams.delete(sessionId);
        this.activeSessions.delete(sessionId);
      }, 5000);

      logger.info('AgentLogStreamingManager', '✅ Agent log streaming stopped', { sessionId });

      this.emit('agent:streaming:stopped', {
        sessionId,
        streamId: stream.id,
        duration: stream.endTime ? stream.endTime.getTime() - stream.startTime.getTime() : 0,
      });

    } catch (error) {
      logger.error('AgentLogStreamingManager', 'Failed to stop agent streaming', error as Error, { sessionId });
    }
  }

  /**
   * Process a log entry from an agent session
   */
  async processLogEntry(sessionId: string, logLine: string): Promise<void> {
    const stream = this.activeStreams.get(sessionId);
    const session = this.activeSessions.get(sessionId);

    if (!stream || !session) {
      logger.debug('AgentLogStreamingManager', 'No active session for log entry', { sessionId });
      return;
    }

    try {
      // Update activity timestamps
      stream.lastActivity = TimeUtils.now();
      session.lastSeen = TimeUtils.now();

      // Create log entry
      const logEntry: AgentLogEntry = {
        id: randomUUID(),
        sessionId,
        agentId: session.agentId,
        timestamp: TimeUtils.now(),
        content: logLine.substring(0, this.config.maxLogLineLength),
        level: this.detectLogLevel(logLine),
        signals: this.detectSignals(logLine),
      };

      // Add to buffer
      stream.buffer.push(logEntry);
      stream.lineCount++;

      // Maintain buffer size
      if (stream.buffer.length > stream.bufferSize) {
        stream.buffer.shift();
      }

      // Process detected signals
      if (logEntry.signals.length > 0) {
        stream.signalsDetected += logEntry.signals.length;

        for (const signal of logEntry.signals) {
          // Publish signal event
          const signalEvent: SignalEvent = {
            id: signal.id,
            type: 'agent_log_signal',
            signal: signal.pattern,
            timestamp: logEntry.timestamp,
            source: `agent:${session.agentId}`,
            priority: this.mapSignalPriority(signal.priority),
            state: 'active',
            metadata: {
              sessionId,
              agentId: session.agentId,
              logEntryId: logEntry.id,
              lineNumber: stream.lineCount,
              context: signal.context,
              confidence: signal.confidence,
            },
          };

          eventBusIntegration.publishToChannel('agent-logs', signalEvent);
        }
      }

      // Send log entry to EventBus for processing
      await eventBusIntegration.processAgentLogEntry(session.agentId, logLine);

      // Emit log entry event
      this.emit('log:entry', logEntry);

      // Emit metrics update
      if (stream.lineCount % 100 === 0) {
        this.emit('stream:metrics', this.getStreamMetrics(sessionId));
      }

    } catch (error) {
      stream.errors++;
      logger.error('AgentLogStreamingManager', 'Failed to process log entry', error as Error, { sessionId });
    }
  }

  /**
   * Get metrics for a specific stream
   */
  getStreamMetrics(sessionId: string) {
    const stream = this.activeStreams.get(sessionId);
    if (!stream) {
      return null;
    }

    const duration = TimeUtils.now().getTime() - stream.startTime.getTime();
    const linesPerSecond = duration > 0 ? (stream.lineCount / duration) * 1000 : 0;

    return {
      sessionId,
      streamId: stream.id,
      agentId: this.activeSessions.get(sessionId)?.agentId,
      isActive: stream.isActive,
      duration,
      lineCount: stream.lineCount,
      linesPerSecond,
      signalsDetected: stream.signalsDetected,
      errors: stream.errors,
      bufferSize: stream.buffer.length,
      lastActivity: stream.lastActivity,
    };
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): LogStream[] {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get recent log entries for a session
   */
  getRecentLogEntries(sessionId: string, count = 50): AgentLogEntry[] {
    const stream = this.activeStreams.get(sessionId);
    return stream ? stream.buffer.slice(-count) : [];
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    logger.info('AgentLogStreamingManager', 'Cleaning up agent log streaming...');

    // Stop all active streams
    for (const sessionId of Array.from(this.activeStreams.keys())) {
      await this.stopAgentStreaming(sessionId);
    }

    // Clear monitors
    for (const monitor of Array.from(this.sessionMonitors.values())) {
      clearInterval(monitor);
    }
    this.sessionMonitors.clear();

    // Remove all listeners
    this.removeAllListeners();

    this.isInitialized = false;
    logger.info('AgentLogStreamingManager', '✅ Agent log streaming cleaned up');
  }

  // Private methods

  private async discoverAgentSessions(): Promise<void> {
    try {
      logger.info('AgentLogStreamingManager', 'Discovering agent sessions...');

      const sessions = await this.tmuxManager.listSessions();
      let discoveredCount = 0;

      for (const session of sessions) {
        // Check if session looks like an agent session
        if (this.isAgentSession(session.name)) {
          const agentId = this.extractAgentId(session.name);
          if (agentId) {
            await this.startAgentStreaming(session.name, agentId);
            discoveredCount++;
          }
        }
      }

      logger.info('AgentLogStreamingManager', `✅ Discovered ${discoveredCount} agent sessions`);

    } catch (error) {
      logger.error('AgentLogStreamingManager', 'Failed to discover agent sessions', error as Error);
    }
  }

  private startSessionMonitoring(): void {
    const monitor = setInterval(async () => {
      if (!this.config.autoDiscovery) {
        return;
      }

      try {
        const sessions = await this.tmuxManager.listSessions();
        const activeSessionNames = new Set(sessions.map(s => s.name));

        // Check for stopped sessions
        for (const [sessionId, stream] of Array.from(this.activeStreams.entries())) {
          if (!activeSessionNames.has(sessionId) && stream.isActive) {
            logger.info('AgentLogStreamingManager', 'Detected stopped session', { sessionId });
            await this.stopAgentStreaming(sessionId);
          }
        }

        // Check for new sessions
        for (const session of sessions) {
          if (this.isAgentSession(session.name) && !this.activeStreams.has(session.name)) {
            const agentId = this.extractAgentId(session.name);
            if (agentId) {
              logger.info('AgentLogStreamingManager', 'Detected new agent session', { sessionId: session.name, agentId });
              await this.startAgentStreaming(session.name, agentId);
            }
          }
        }

      } catch (error) {
        logger.error('AgentLogStreamingManager', 'Error in session monitoring', error as Error);
      }
    }, this.config.monitorInterval);

    this.sessionMonitors.set('session-monitor', monitor);
  }

  private async startLogMonitoring(sessionId: string): Promise<void> {
    // This would integrate with tmux log monitoring
    // For now, we'll set up a placeholder that would be replaced with actual tmux log monitoring
    logger.debug('AgentLogStreamingManager', 'Log monitoring started for session', { sessionId });
  }

  private stopLogMonitoring(sessionId: string): void {
    // Stop monitoring for specific session
    logger.debug('AgentLogStreamingManager', 'Log monitoring stopped for session', { sessionId });
  }

  private setupCleanupHandlers(): void {
    // Handle process shutdown
    const cleanup = async () => {
      await this.cleanup();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  private initializeSignalPatterns(): void {
    // Initialize signal patterns based on AGENTS.md
    const patterns: Record<string, string> = {
      'bb': '\\[bb\\]',
      'af': '\\[af\\]',
      'da': '\\[da\\]',
      'no': '\\[no\\]',
      'gg': '\\[gg\\]',
      'ff': '\\[ff\\]',
      'rp': '\\[rp\\]',
      'vr': '\\[vr\\]',
      'rr': '\\[rr\\]',
      'vp': '\\[vp\\]',
      'ip': '\\[ip\\]',
      'er': '\\[er\\]',
      'rc': '\\[rc\\]',
      'tp': '\\[tp\\]',
      'dp': '\\[dp\\]',
      'br': '\\[br\\]',
      'tw': '\\[tw\\]',
      'bf': '\\[bf\\]',
      'mg': '\\[mg\\]',
      'rl': '\\[rl\\]',
      'cc': '\\[cc\\]',
      'cq': '\\[cq\\]',
      'cp': '\\[cp\\]',
      'tr': '\\[tr\\]',
      'tg': '\\[tg\\]',
      'cf': '\\[cf\\]',
      'pc': '\\[pc\\]',
      'rg': '\\[rg\\]',
      'rv': '\\[rv\\]',
      'iv': '\\[iv\\]',
      'oa': '\\[oa\\]',
      'aa': '\\[aa\\]',
      'ap': '\\[ap\\]',
      'ra': '\\[ra\\]',
      'ps': '\\[ps\\]',
      'ic': '\\[ic\\]',
      'JC': '\\[JC\\]',
      'pm': '\\[pm\\]',
    };

    for (const [signalId, pattern] of Object.entries(patterns)) {
      this.signalPatterns.set(signalId, new RegExp(pattern, 'gi'));
    }
  }

  private detectSignals(logLine: string) {
    const detectedSignals = [];

    for (const [signalId, pattern] of Array.from(this.signalPatterns.entries())) {
      const matches = logLine.match(pattern);
      if (matches) {
        detectedSignals.push({
          id: randomUUID(),
          pattern: `[${signalId.toUpperCase()}]`,
          priority: this.getSignalPriority(signalId),
          confidence: this.calculateConfidence(logLine, matches[0]),
          context: this.extractContext(logLine, matches[0]),
        });
      }
    }

    return detectedSignals;
  }

  private detectLogLevel(logLine: string): 'debug' | 'info' | 'warn' | 'error' | 'critical' {
    const lower = logLine.toLowerCase();
    if (lower.includes('fatal') || lower.includes('[ff]') || lower.includes('[bb]')) {
      return 'critical';
    }
    if (lower.includes('error') || lower.includes('[cf]') || lower.includes('[tr]')) {
      return 'error';
    }
    if (lower.includes('warn') || lower.includes('[af]') || lower.includes('[no]')) {
      return 'warn';
    }
    if (lower.includes('info') || lower.includes('[da]') || lower.includes('[dp]')) {
      return 'info';
    }
    return 'debug';
  }

  private isAgentSession(sessionName: string): boolean {
    return sessionName.includes('agent') || sessionName.includes('claude') || sessionName.includes('robo-');
  }

  private extractAgentId(sessionName: string): string | null {
    // Extract agent ID from session name
    const match = sessionName.match(/(?:agent|robo-)([a-zA-Z-]+)/i);
    return match ? match[1].toLowerCase() : sessionName;
  }

  private getSignalPriority(signalId: string): number {
    const priorityMap: Record<string, number> = {
      'FF': 10,
      'bb': 9,
      'ff': 9,
      'JC': 9,
      'af': 8,
      'no': 8,
      'ic': 8,
      'er': 8,
      'oa': 8,
      'tr': 6,
      'cf': 6,
      'rr': 6,
      'aa': 6,
      'ra': 10,
      'rp': 7,
      'vr': 7,
      'iv': 7,
      'cp': 7,
      'tg': 7,
      'pc': 7,
      'mg': 7,
      'rl': 7,
      'rc': 6,
      'vp': 6,
      'ip': 7,
      'dp': 5,
      'cq': 5,
      'pc': 7,
      'rg': 4,
      'rv': 6,
      'cc': 4,
      'ps': 5,
      'ap': 6,
      'pm': 6,
      'da': 5,
    };

    return priorityMap[signalId.toUpperCase()] ?? 3;
  }

  private calculateConfidence(logLine: string, match: string): number {
    // Calculate confidence based on context
    let confidence = 0.8; // Base confidence

    // Boost confidence if signal is followed by explanation
    const afterMatch = logLine.substring(logLine.indexOf(match) + match.length, logLine.indexOf(match) + match.length + 100);
    if (afterMatch.includes('-') || afterMatch.includes(':') || afterMatch.includes('|')) {
      confidence += 0.1;
    }

    // Boost confidence if in PRP context
    if (logLine.includes('PRP-') || logLine.includes('##') || logLine.includes('> ')) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private extractContext(logLine: string, match: string, radius = 50): string {
    const index = logLine.indexOf(match);
    const start = Math.max(0, index - radius);
    const end = Math.min(logLine.length, index + match.length + radius);
    return logLine.substring(start, end).trim();
  }

  private mapSignalPriority(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority >= 9) return 'critical';
    if (priority >= 7) return 'high';
    if (priority >= 5) return 'medium';
    return 'low';
  }
}

// Export singleton factory
export function createAgentLogStreamingManager(tmuxManager: TmuxManagerAPI, config?: Partial<StreamingConfig>): AgentLogStreamingManager {
  return AgentLogStreamingManager.getInstance(tmuxManager, config);
}