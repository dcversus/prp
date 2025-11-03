/**
 * ♫ Tmux Integration Types for @dcversus/prp
 *
 * Types for managing tmux sessions, terminals, and agents
 * with monitoring, logging, and orchestration capabilities.
 */

import { AgentConfig } from '../shared/types';

export interface TmuxConfig {
  socketName: string;
  baseSessionName: string;
  maxSessions: number;
  defaultShell: string;
  sessionTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  resourceMonitoring: {
    enabled: boolean;
    intervalMs: number;
    retentionHours: number;
  };
  terminal: {
    defaultProfile: string;
    historyLimit: number;
    scrollbackLines: number;
  };
}

export interface TmuxSession {
  id: string;
  name: string;
  windowId: string;
  paneId: string;
  agentId?: string;
  status: 'creating' | 'running' | 'idle' | 'stopped' | 'error' | 'terminating';
  createdAt: Date;
  lastActivity: Date;
  startTime?: Date;
  endTime?: Date;
  workingDirectory: string;
  command: string;
  environment: Record<string, string>;
  pid?: number;
  exitCode?: number;
  metadata: TmuxSessionMetadata;
}

export interface TmuxSessionMetadata {
  agentType?: string;
  agentRole?: string;
  priority: number;
  tags: string[];
  description?: string;
  spawnedBy: string; // orchestrator decision ID or user request
  parentSession?: string; // for nested sessions
  resources: {
    initialMemory: number;
    initialCpu: number;
    peakMemory: number;
    peakCpu: number;
    averageMemory: number;
    averageCpu: number;
  };
}

export interface AgentTerminalSession extends TmuxSession {
  agentId: string;
  agentConfig: AgentConfig;
  instructions: string;
  capabilities: string[];
  logPath: string;
  state: 'initializing' | 'ready' | 'working' | 'waiting' | 'error' | 'completed';
  lastInteraction: Date;
  interactionCount: number;
  messages: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  timestamp: Date;
  type: 'instruction' | 'response' | 'error' | 'log' | 'status';
  direction: 'to_agent' | 'from_agent';
  content: string;
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    confidence?: number;
    toolCalls?: string[];
  };
}

export interface TerminalActivity {
  sessionId: string;
  timestamp: Date;
  type: 'keystroke' | 'command' | 'output' | 'error' | 'idle' | 'focus_change';
  content?: string;
  duration?: number; // for idle periods
  metadata?: {
    command?: string;
    exitCode?: number;
    signal?: number;
  };
}

export interface ResourceMetrics {
  sessionId: string;
  timestamp: Date;
  memory: {
    used: number;
    peak: number;
    average: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    peak: number;
    average: number;
    percentage: number;
  };
  processes: number;
  fileDescriptors: number;
  networkConnections: number;
}

export interface TmuxManagerConfig {
  tmux: TmuxConfig;
  agents: {
    defaultInstructions: string;
    defaultCapabilities: string[];
    spawnTimeout: number;
    heartbeatInterval: number;
    maxIdleTime: number;
  };
  monitoring: {
    enabled: boolean;
    logToFile: boolean;
    logPath: string;
    metricsRetention: number; // hours
    alertThresholds: {
      cpuUsage: number;
      memoryUsage: number;
      idleTime: number;
      sessionDuration: number;
    };
  };
}

export interface TmuxCommand {
  id: string;
  type: 'create_session' | 'send_keys' | 'capture_pane' | 'list_sessions' | 'kill_session' | 'attach_session';
  sessionId?: string;
  command: string;
  parameters?: Record<string, unknown>;
  timestamp: Date;
  timeout: number;
  retries: number;
}

export interface TmuxCommandResult {
  commandId: string;
  success: boolean;
  output?: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  timestamp: Date;
}

// Event types for tmux integration
export interface TmuxSessionCreatedEvent {
  sessionId: string;
  session: TmuxSession;
  timestamp: Date;
}

export interface TmuxSessionTerminatedEvent {
  sessionId: string;
  session: TmuxSession;
  reason: 'user_request' | 'timeout' | 'error' | 'agent_completed';
  timestamp: Date;
}

export interface TmuxActivityDetectedEvent {
  sessionId: string;
  activity: TerminalActivity;
  timestamp: Date;
}

export interface TmuxIdleDetectedEvent {
  sessionId: string;
  idleDuration: number;
  lastActivity: Date;
  timestamp: Date;
}

export interface TmuxResourceAlertEvent {
  sessionId: string;
  metric: 'memory' | 'cpu' | 'session_duration' | 'idle_time';
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

export interface TmuxAgentMessageEvent {
  sessionId: string;
  agentId: string;
  message: AgentMessage;
  timestamp: Date;
}

export interface TmuxErrorEvent {
  sessionId?: string;
  error: string;
  context: string;
  recoverable: boolean;
  timestamp: Date;
}

export interface TabInfo {
  id: string;
  title: string;
  type: 'main' | 'orchestrator' | 'agent' | 'info' | 'logs';
  sessionId?: string;
  agentId?: string;
  isActive: boolean;
  badge?: {
    type: 'error' | 'warning' | 'info' | 'success';
    count: number;
  };
  lastUpdate: Date;
}