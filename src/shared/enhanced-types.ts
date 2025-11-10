/**
 * ♫ Enhanced Type Definitions for @dcversus/prp
 *
 * Comprehensive type definitions to resolve unknown type issues.
 */

// Base types for unknown data structures
export type UnknownRecord = Record<string, unknown>;

// Enhanced signal data types
export interface SignalData extends UnknownRecord {
  worktree?: string;
  agent?: string;
  guideline?: string;
  tokenCost?: number;
  priority?: number;
  source?: string;
  timestamp?: Date;
  message?: string;
  details?: string;
  context?: UnknownRecord;
  metadata?: UnknownRecord;
}

// Event data types
export interface EventData extends UnknownRecord {
  type: string;
  timestamp: Date;
  source: string;
  payload?: UnknownRecord;
  details?: UnknownRecord;
  metadata?: UnknownRecord;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: UnknownRecord;
}

// Generic async function wrapper
export interface AsyncFunction<T = unknown> {
  (...args: unknown[]): Promise<T>;
}

// Generic callback types
export interface Callback<T = unknown> {
  (data: T): void;
}

export interface AsyncCallback<T = unknown> {
  (data: T): Promise<void>;
}

// Enhanced storage types
export interface StorageData<T = unknown> {
  id: string;
  type: string;
  data: T;
  createdAt: Date;
  updatedAt: Date;
  metadata?: UnknownRecord;
}

// Configuration types with unknown properties
export interface ConfigData extends UnknownRecord {
  id: string;
  name: string;
  enabled: boolean;
  settings?: UnknownRecord;
  metadata?: UnknownRecord;
}

// Agent communication data
export interface AgentMessage extends UnknownRecord {
  id: string;
  from: string;
  to: string;
  type: string;
  data: UnknownRecord;
  timestamp: Date;
  priority?: number;
}

// Task execution types
export interface TaskResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  duration?: number;
  metadata?: UnknownRecord;
}

// Processed signal data
export interface ProcessedSignalData extends UnknownRecord {
  category: string;
  priority: string;
  severity: string;
  confidence: number;
  urgency: number;
  recommendedAction: string;
  implementation_analysis?: {
    code_quality: number;
    test_coverage: number;
    performance_impact: string;
    security_considerations: string;
    dependencies: string[];
    complexity: string;
  };
}

// Component data for UI
export interface ComponentData extends UnknownRecord {
  id: string;
  type: string;
  props: UnknownRecord;
  children?: ComponentData[];
  state?: UnknownRecord;
}

// Analysis result types
export interface AnalysisResult extends UnknownRecord {
  id: string;
  type: string;
  data: UnknownRecord;
  confidence: number;
  recommendations: string[];
  issues: Issue[];
}

// Issue types
export interface Issue extends UnknownRecord {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation?: string;
  component?: string;
  line?: number;
  file?: string;
}

// Metrics and monitoring types
export interface SystemMetrics extends UnknownRecord {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  network: UnknownRecord;
  processes: number;
  uptime: number;
}

// Token tracking types
export interface TokenMetrics extends UnknownRecord {
  agentId: string;
  timestamp: Date;
  tokens: number;
  cost: number;
  model: string;
  operation: 'input' | 'output' | 'total';
  duration?: number;
  success: boolean;
}

// Generic union types for common patterns
export type StringOrUndefined = string | undefined;
export type NumberOrUndefined = number | undefined;
export type BooleanOrUndefined = boolean | undefined;
export type DateOrUndefined = Date | undefined;
export type ArrayOrUndefined<T> = T[] | undefined;
export type RecordOrUndefined<T = unknown> = Record<string, T> | undefined;

// Enhanced generic types with constraints
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown>
    ? DeepPartial<T[P]>
    : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Branded types for specific data shapes
export type AgentId = string & { readonly __brand: 'AgentId' };
export type SignalId = string & { readonly __brand: 'SignalId' };
export type WorktreePath = string & { readonly __brand: 'WorktreePath' };
export type PRPFilePath = string & { readonly __brand: 'PRPFilePath' };

// Helper functions for branded types
export function createAgentId(id: string): AgentId {
  return id as AgentId;
}

export function createSignalId(id: string): SignalId {
  return id as SignalId;
}

export function createWorktreePath(path: string): WorktreePath {
  return path as WorktreePath;
}

export function createPRPFilePath(path: string): PRPFilePath {
  return path as PRPFilePath;
}

// Generic validation types
export interface Validator<T = unknown> {
  validate(value: unknown): value is T;
  sanitize(value: unknown): T;
}

export interface TypeGuard<T = unknown> {
  (value: unknown): value is T;
}

// Error handling types
export interface ErrorInfo extends UnknownRecord {
  message: string;
  code?: string;
  stack?: string;
  timestamp: Date;
  context?: UnknownRecord;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Enhanced function types
export type TypedFunction<T extends unknown[], R> = (...args: T) => R;
export type AsyncTypedFunction<T extends unknown[], R> = (...args: T) => Promise<R>;

// Generic wrapper types
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface Option<T> {
  hasValue: boolean;
  value?: T;
}

// Event system types
export interface EventHandler<T = unknown> {
  (event: { type: string; data: T; timestamp: Date }): void | Promise<void>;
}

export interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, data: T): void;
}

// Performance monitoring types
export interface PerformanceData extends UnknownRecord {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  memory: {
    before: number;
    after: number;
    delta: number;
  };
  success: boolean;
  error?: string;
}

// Context types
export interface ExecutionContext extends UnknownRecord {
  id: string;
  timestamp: Date;
  agent?: string;
  operation: string;
  parameters: UnknownRecord;
  result?: UnknownRecord;
  error?: string;
  duration?: number;
}