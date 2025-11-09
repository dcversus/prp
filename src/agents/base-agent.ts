/**
 * ♫ Base Agent Interface for @dcversus/prp
 *
 * Common interface for all agent implementations.
 */

export interface BaseAgent {
  id: string;
  name: string;
  type: string;
  role: string;
  enabled: boolean;
  capabilities: AgentCapabilities;
  limits: AgentLimits;

  // Core agent methods
  initialize(): Promise<void>;
  process(_input: unknown): Promise<unknown>;
  shutdown(): Promise<void>;

  // Agent lifecycle
  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
}

export interface AgentCapabilities {
  supportsTools: boolean;
  supportsImages: boolean;
  supportsSubAgents: boolean;
  supportsParallel: boolean;
  supportsCodeExecution: boolean;
  maxContextLength: number;
  supportedModels: string[];
  supportedFileTypes: string[];
  canAccessInternet: boolean;
  canAccessFileSystem: boolean;
  canExecuteCommands: boolean;
}

export interface AgentLimits {
  maxTokensPerRequest: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxCostPerDay: number;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxConcurrentTasks: number;
  cooldownPeriod: number;
}

export interface AgentStatus {
  status: 'idle' | 'busy' | 'error' | 'offline';
  lastActivity: Date;
  currentTask?: string;
  errorCount: number;
  uptime: number;
}

export interface AgentMetrics {
  tasksCompleted: number;
  averageTaskTime: number;
  errorRate: number;
  tokensUsed: number;
  costIncurred: number;
  lastReset: Date;
}