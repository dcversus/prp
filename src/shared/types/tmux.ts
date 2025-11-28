/**
 * ♫ Tmux Management Types for @dcversus/prp
 *
 * Type definitions for tmux session management, agent terminals,
 * and resource monitoring integration.
 */
import type { AgentConfig } from './common';

/**
 * Core tmux configuration interface
 */
export interface TmuxConfig {
  /** Socket name for tmux server */
  socketName: string;
  /** Base session name for PRP orchestrator */
  baseSessionName: string;
  /** Maximum number of concurrent sessions */
  maxSessions: number;
  /** Default shell to use in tmux sessions */
  defaultShell: string;
  /** Session timeout in milliseconds */
  sessionTimeout: number;
  /** Idle timeout in milliseconds */
  idleTimeout: number;
  /** Log level for tmux operations */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Resource monitoring configuration */
  resourceMonitoring: {
    /** Whether resource monitoring is enabled */
    enabled: boolean;
    /** Monitoring interval in milliseconds */
    intervalMs: number;
    /** How long to retain monitoring data (hours) */
    retentionHours: number;
  };
  /** Terminal configuration */
  terminal: {
    /** Default terminal profile */
    defaultProfile: string;
    /** Command history limit */
    historyLimit: number;
    /** Scrollback lines limit */
    scrollbackLines: number;
  };
}

/**
 * Base tmux session interface
 */
export interface TmuxSession {
  /** Unique session identifier */
  id: string;
  /** Session name in tmux */
  name: string;
  /** Tmux window ID */
  windowId: string;
  /** Tmux pane ID */
  paneId: string;
  /** Process ID of the session */
  pid?: string;
  /** Current session state */
  state: 'initializing' | 'ready' | 'running' | 'idle' | 'stopping' | 'stopped' | 'error';
  /** Session status */
  status: 'creating' | 'running' | 'idle' | 'terminating' | 'stopped' | 'error';
  /** When the session was created */
  createdAt: Date;
  /** When the session started (if different from created) */
  startTime?: Date;
  /** When the session ended */
  endTime?: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Working directory for the session */
  workingDirectory: string;
  /** Command being executed */
  command: string;
  /** Environment variables for the session */
  environment: Record<string, string | undefined>;
  /** Session metadata */
  metadata: {
    /** Agent type if applicable */
    agentType?: string;
    /** Agent role if applicable */
    agentRole?: string;
    /** Session priority */
    priority: number;
    /** Session tags */
    tags: string[];
    /** Session description */
    description: string;
    /** What spawned this session */
    spawnedBy: string;
    /** Resource usage metrics */
    resources: {
      /** Initial memory usage in MB */
      initialMemory: number;
      /** Initial CPU usage percentage */
      initialCpu: number;
      /** Peak memory usage in MB */
      peakMemory: number;
      /** Peak CPU usage percentage */
      peakCpu: number;
      /** Average memory usage in MB */
      averageMemory: number;
      /** Average CPU usage percentage */
      averageCpu: number;
    };
  };
}

/**
 * Agent-specific tmux session interface
 */
export interface AgentTerminalSession extends TmuxSession {
  /** Agent identifier */
  agentId: string;
  /** Agent configuration */
  agentConfig: AgentConfig;
  /** Initial instructions sent to agent */
  instructions: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Path to session log file */
  logPath: string;
  /** Last interaction timestamp */
  lastInteraction: Date;
  /** Number of interactions with agent */
  interactionCount: number;
  /** Messages exchanged with agent */
  messages: AgentMessage[];
  /** Current task being processed */
  currentTask?: AgentTask;
  /** Token usage tracking */
  tokenUsage: {
    /** Total tokens used */
    total: number;
    /** Estimated cost */
    cost: number;
    /** Last updated timestamp */
    lastUpdated: Date;
  };
  /** Performance metrics */
  performance: {
    /** Number of tasks completed */
    tasksCompleted: number;
    /** Average task completion time */
    averageTaskTime: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Number of errors encountered */
    errorCount: number;
  };
  /** Agent capabilities (detailed) */
  agentCapabilities: {
    /** Whether agent supports tool usage */
    supportsTools: boolean;
    /** Whether agent supports images */
    supportsImages: boolean;
    /** Whether agent supports sub-agents */
    supportsSubAgents: boolean;
    /** Whether agent supports parallel execution */
    supportsParallel: boolean;
    /** Whether agent supports code execution */
    supportsCodeExecution: boolean;
    /** Maximum context length */
    maxContextLength: number;
    /** Supported models */
    supportedModels: string[];
    /** Supported file types */
    supportedFileTypes: string[];
    /** Whether agent can access internet */
    canAccessInternet: boolean;
    /** Whether agent can access file system */
    canAccessFileSystem: boolean;
    /** Whether agent can execute commands */
    canExecuteCommands: boolean;
    /** Available tools */
    availableTools: string[];
    /** Agent specializations */
    specializations: string[];
  };
}

/**
 * Task interface for agent sessions
 */
export interface AgentTask {
  /** Task identifier */
  id: string;
  /** Task type */
  type: string;
  /** Task description */
  description: string;
  /** Task priority */
  priority: number;
  /** Task payload/data */
  payload?: Record<string, unknown>;
  /** Task status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  /** When task was created */
  createdAt: Date;
  /** When task started */
  startedAt?: Date;
  /** When task completed */
  completedAt?: Date;
  /** Task result */
  result?: unknown;
  /** Task error if failed */
  error?: string;
  /** Token usage for task */
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
    cost?: number;
  };
  /** Task duration in milliseconds */
  duration?: number;
}

/**
 * Message interface for agent communication
 */
export interface AgentMessage {
  /** Message identifier */
  id: string;
  /** Message timestamp */
  timestamp: Date;
  /** Message type */
  type: 'instruction' | 'response' | 'error' | 'status' | 'ping' | 'pong';
  /** Message direction */
  direction: 'to_agent' | 'from_agent';
  /** Message content */
  content: string;
  /** Message metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tmux command interface
 */
export interface TmuxCommand {
  /** Command identifier */
  id: string;
  /** Command to execute */
  command: string;
  /** Target session/window/pane */
  target?: string;
  /** Command arguments */
  args?: string[];
  /** Command timeout in milliseconds */
  timeout?: number;
  /** When command was created */
  createdAt: Date;
  /** Command status */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'timeout';
  /** Command result */
  result?: TmuxCommandResult;
  /** Command error if failed */
  error?: string;
}

/**
 * Tmux command result interface
 */
export interface TmuxCommandResult {
  /** Command exit code */
  exitCode: number;
  /** Command stdout */
  stdout: string;
  /** Command stderr */
  stderr: string;
  /** Command execution duration in milliseconds */
  duration: number;
  /** When command completed */
  completedAt: Date;
}

/**
 * Terminal activity interface
 */
export interface TerminalActivity {
  /** Activity identifier */
  id: string;
  /** Session identifier */
  sessionId: string;
  /** Activity type */
  type: 'keypress' | 'command' | 'output' | 'error' | 'signal';
  /** Activity content */
  content: string;
  /** Activity timestamp */
  timestamp: Date;
  /** Activity metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Resource metrics interface
 */
export interface ResourceMetrics {
  /** Process ID */
  pid: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Virtual memory size in KB */
  virtualMemory: number;
  /** Resident set size in KB */
  residentSetSize: number;
  /** When metrics were captured */
  timestamp: Date;
}

/**
 * Tmux manager configuration interface
 */
export interface TmuxManagerConfig extends TmuxConfig {
  /** Event bus configuration */
  eventBus?: {
    /** Event bus URL or connection string */
    url?: string;
    /** Event bus namespace */
    namespace?: string;
    /** Connection timeout in milliseconds */
    timeout?: number;
  };
  /** Integration configuration */
  integration?: {
    /** Whether to integrate with AgentManager */
    enableAgentManager: boolean;
    /** Whether to integrate with Scanner */
    enableScanner: boolean;
    /** Custom integration settings */
    settings?: Record<string, unknown>;
  };
}

// Event interfaces for tmux system

/**
 * Tmux session created event
 */
export interface TmuxSessionCreatedEvent {
  type: 'session.created';
  sessionId: string;
  session: TmuxSession;
  timestamp: Date;
}

/**
 * Tmux session terminated event
 */
export interface TmuxSessionTerminatedEvent {
  type: 'session.terminated';
  sessionId: string;
  session: TmuxSession;
  reason: 'user_request' | 'timeout' | 'error' | 'agent_completed';
  timestamp: Date;
}

/**
 * Tmux activity detected event
 */
export interface TmuxActivityDetectedEvent {
  type: 'activity.detected';
  sessionId: string;
  activity: TerminalActivity;
  timestamp: Date;
}

/**
 * Tmux idle detected event
 */
export interface TmuxIdleDetectedEvent {
  type: 'idle.detected';
  sessionId: string;
  idleDuration: number;
  lastActivity: Date;
  timestamp: Date;
}

/**
 * Tmux resource alert event
 */
export interface TmuxResourceAlertEvent {
  type: 'resource.alert';
  sessionId: string;
  metric: 'memory' | 'cpu' | 'disk';
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

/**
 * Tmux agent message event
 */
export interface TmuxAgentMessageEvent {
  type: 'agent.message';
  sessionId: string;
  agentId: string;
  message: AgentMessage;
  timestamp: Date;
}

/**
 * Tmux error event
 */
export interface TmuxErrorEvent {
  type: 'error';
  sessionId?: string;
  error: string;
  context: string;
  recoverable: boolean;
  timestamp: Date;
}

/**
 * Tab information for TUI integration
 */
export interface TabInfo {
  /** Tab identifier */
  id: string;
  /** Tab title */
  title: string;
  /** Tab content type */
  contentType: 'terminal' | 'agent' | 'orchestrator' | 'info' | 'debug';
  /** Associated session ID if applicable */
  sessionId?: string;
  /** Associated agent ID if applicable */
  agentId?: string;
  /** Whether tab is active */
  active: boolean;
  /** Tab order */
  order: number;
  /** Tab metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent task result interface for integration
 */
export interface AgentTaskResult {
  /** Whether the task was successful */
  success: boolean;
  /** Task result data */
  data?: unknown;
  /** Task error message */
  error?: string;
  /** Token usage for the task */
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
    cost?: number;
  };
  /** Task duration in milliseconds */
  duration?: number;
}

/**
 * Tmux Manager API interface for orchestrator integration
 */
export interface TmuxManagerAPI {
  /**
   * Spawn a new agent in a tmux session
   */
  spawnAgent(
    agentId: string,
    agentConfig: any, // Use any to accommodate different AgentConfig types
    instructions: string,
    workingDirectory?: string,
  ): Promise<AgentTerminalSession>;

  /**
   * Stop a running agent
   */
  stopAgent(
    agentId: string,
    reason?: 'user_request' | 'timeout' | 'error' | 'agent_completed',
    graceful?: boolean,
    timeout?: number,
  ): Promise<{ success: boolean; terminatedAt: Date; method: string }>;

  /**
   * Send a message to an agent
   */
  sendMessage(
    agentId: string,
    message: string,
    messageType?: 'instruction' | 'query' | 'signal' | 'update',
    priority?: 'low' | 'normal' | 'high' | 'urgent',
  ): Promise<{
    success: boolean;
    messageId: string;
    sentAt: Date;
    deliveryStatus: 'sent' | 'queued' | 'failed';
  }>;

  /**
   * Get agent status and health information
   */
  getAgentStatus(agentId: string, includeMetrics?: boolean): Promise<{
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
  }>;

  /**
   * List all active agents
   */
  listActiveAgents(): Promise<AgentTerminalSession[]>;

  /**
   * List all tmux sessions
   */
  listSessions(): Promise<string[]>;

  /**
   * Get logs from an agent session
   */
  getAgentLogs(
    agentId: string,
    options?: {
      lines?: number;
      since?: Date;
      until?: Date;
      level?: 'debug' | 'info' | 'warn' | 'error';
    },
  ): Promise<string>;

  /**
   * Get agent performance metrics
   */
  getAgentMetrics(agentId: string, period?: '1h' | '6h' | '24h' | '7d'): Promise<{
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
  }>;
}