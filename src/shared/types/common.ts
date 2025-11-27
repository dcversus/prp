/**
 * Common types used across the application
 * Centralized to avoid duplication
 */
// ================================
// PRIMITIVE TYPES
// ================================
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = Array<JsonValue>
// ================================
// AGENT TYPES
// ================================
export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  role: string;
  version?: string;
  enabled?: boolean;
  capabilities?: AgentCapabilities;
  limits?: AgentLimits;
  runCommands?: string[];
  roles?: string[];
  bestRole?: string;
  metadata?: Record<string, unknown>;
}

export type AgentRole = string;

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
  primary?: string[];
  secondary?: string[];
  tools?: string[];
  maxConcurrent?: number;
  specializations?: string[];
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
export interface AgentState {
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused';
  progress?: number;
  error?: string | null;
  metrics?: Record<string, unknown>;
}
export interface AgentMessage {
  id: string;
  agentId: string;
  type: 'request' | 'response' | 'notification';
  payload: Record<string, unknown>;
  timestamp: number;
}
// ================================
// API TYPES
// ================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: number;
    version: string;
    requestId?: string;
  };
}
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
// ================================
// COMMAND TYPES
// ================================
export type CommandOptions = Record<string, string | boolean | number | undefined>;
export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: string[];
}
// ================================
// AUDIO TYPES
// ================================
export interface AudioConfig {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  bufferSize?: number;
}
export interface AudioSignal {
  frequency: number;
  duration: number;
  amplitude: number;
  type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
}
// ================================
// TUI TYPES
// ================================
export interface TUIProps {
  width?: number;
  height?: number;
  theme?: 'light' | 'dark' | 'auto';
}
export interface UIState {
  isLoading: boolean;
  error?: string | null;
  data?: unknown;
}
// ================================
// UTILITY TYPES
// ================================
/** Make all properties optional recursively */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
/** Make all properties required recursively */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
/** Pick properties from T that match type U */
export type PickByType<T, U> = Pick<T, { [K in keyof T]: T[K] extends U ? K : never }[keyof T]>;
/** Omit properties from T that match type U */
export type OmitByType<T, U> = Pick<T, { [K in keyof T]: T[K] extends U ? never : K }[keyof T]>;
/** Extract array element type */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;
/** Extract promise value type */
export type PromiseValue<T> = T extends Promise<infer U> ? U : never;
// ================================
// TYPE GUARDS
// ================================
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};
export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};
export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return value != null && typeof value === 'object' && !Array.isArray(value);
};
export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};
export const isFunction = (value: unknown): boolean => {
  return typeof value === 'function';
};
export const isNotNull = <T>(value: T | null): value is T => {
  return value != null;
};
export const isNotNullish = <T>(value: T | null | undefined): value is T => {
  return value != null;
};
// ================================
// SIGNAL TYPES
// ================================
export interface Signal {
  id: string;
  type: string;           // Two-letter signal code [XX]
  priority: number;       // 1-10 priority level
  source: string;         // Where signal originated
  timestamp: Date;        // When signal was detected
  resolved: boolean;      // Whether signal is resolved
  relatedSignals: string[]; // IDs of related signals
  data: SignalData;       // Signal-specific data
  metadata?: SignalMetadata; // Processing metadata
}

export interface SignalData {
  rawSignal: string;      // The raw [XX] match
  line?: number;          // Line number in file
  column?: number;        // Column position
  context?: string;       // Context around signal
  patternName?: string;   // Name of the pattern matched
  category?: string;      // Signal category
  description?: string;   // Signal description
  filePath?: string;      // File where signal was found
  position?: number;      // Byte position in file
  comment?: string;       // Comment following signal
  [key: string]: unknown; // Additional properties
}

export interface SignalMetadata {
  agent: string;          // Agent or component that created signal
  guideline?: string;     // Associated guideline ID
  detectionTime?: number; // Time taken to detect (ms)
  detectionLatency?: number; // Detection latency (ms)
  processedAt?: Date;     // When signal was processed
  filePath?: string;      // File path for file-based signals
  confidence?: number;    // Detection confidence 0-1
  detector?: string;      // Which detector found it
  patternVersion?: string; // Pattern version used
  tokenCost?: number;     // Token cost for processing
  error?: string;         // Last error if any
  [key: string]: unknown; // Additional metadata
}

// ================================
// EVENT TYPES
// ================================
export interface BaseEvent {
  type: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}
export interface AgentEvent extends BaseEvent {
  agentId: string;
  type: 'agent:started' | 'agent:completed' | 'agent:failed' | 'agent:paused';
}
export interface SystemEvent extends BaseEvent {
  type: 'system:ready' | 'system:error' | 'system:shutdown';
}
// ================================
// ERROR TYPES
// ================================
export interface AppError {
  name: string;
  message: string;
  code?: string;
  stack?: string;
  cause?: Error | unknown;
  context?: Record<string, unknown>;
}
export const createError = (name: string, message: string, options?: Partial<AppError>): AppError => {
  const error = new Error(message) as AppError;
  error.name = name;
  Object.assign(error, options);
  return error;
};
// ================================
// RESULT TYPE (Either pattern)
// ================================
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
export const ok = <T>(value: T): Result<T, never> => {
  return { success: true, data: value };
};
export const err = <E>(error: E): Result<never, E> => {
  return { success: false, error };
};
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } => {
  return result.success;
};
export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } => {
  return !result.success;
};
// ================================
// ASYNC UTILITIES
// ================================
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
export const wrapAsync = async <T, E = Error>(asyncFn: Promise<T>): Promise<Result<T, E>> => {
  try {
    const data = await asyncFn;
    return ok(data);
  } catch (error: unknown) {
    return err(error as E);
  }
};
// ================================
// ENVIRONMENT TYPES
// ================================
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT?: number;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  API_BASE_URL?: string;
  [key: string]: string | number | undefined;
}
// ================================
// RE-EXPORTS
// ================================
// Re-export common Node.js types
export type { Readable, Writable, Duplex } from 'stream';
// React types should be imported from @types/react when needed
// export type ReactNode = React.ReactNode;
