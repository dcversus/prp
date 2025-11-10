/**
 * ♫ Shared Components for @dcversus/prp
 *
 * Central exports for shared types, utilities, and infrastructure.
 */

// Types
export * from './types';

// Inspector types (re-export for shared access)
export type { InspectorPayload } from '../inspector/types';

// Events
export type { EventChannel } from './events';
export {
  EventChannelImpl,
  eventBus,
  EventBus,
  isScannerEvent,
  isInspectorEvent,
  isOrchestratorEvent,
  isSignalEvent,
  createEventFilter,
  eventFilters,
  type ChannelStats
} from './events';

// Utils
export {
  TokenCounter,
  ConfigUtils,
  HashUtils,
  TimeUtils,
  Validator,
  FileUtils,
  GitUtils,
  PerformanceMonitor,
  SignalParser
} from './utils';
export * from './utils/index';

// Add missing utility exports
export * from './utils/error-handler';
export * from './utils/metrics';
export * from './utils/validation';

// New Shared Utilities
export {
  TokenManager,
  TokenEstimator,
  type TokenUsage,
  type TokenLimitConfig,
  type LLMProvider
} from './utils/token-management';

export {
  TextProcessor,
  type CompressionStrategy,
  type TextProcessingOptions
} from './utils/text-processing';

export {
  MetricsCalculator,
  PerformanceMonitor as SharedPerformanceMonitor,
  type PerformanceMetrics,
  type OperationResult,
  type TimeWindow
} from './utils/metrics';

// Shared Tools
export {
  WorkerPool,
  type TaskData,
  type WorkerInfo,
  type WorkerConfig,
  type WorkerPoolConfig,
  type WorkerPoolStatus,
  type WorkerMessage,
  type WorkerMessageType
} from './tools/worker-pool';

export {
  CacheManager,
  TokenCache,
  type CacheEntry,
  type CacheConfig,
  type CacheStats,
  type CacheMetrics
} from './tools/cache-manager';

// Logger
export * from './logger';

// Config
export * from './config';

// GitHub
export * from './github';

// Agent Config
export type { AgentRegistry, AgentConfig } from './agent-config';
export type { AgentRole } from '../config/agent-config';
export {
  defaultAgentConfig,
  createAgentConfig,
  validateAgentConfig
} from './agent-config';

// Storage
export * from './storage';

// Protocols
export * from './protocols';

// Enhanced Types (resolve Issue conflict)
export {
  createAgentId,
  createSignalId,
  createWorktreePath,
  createPRPFilePath,
  type UnknownRecord,
  type SignalData,
  type EventData,
  type ApiResponse,
  type AsyncFunction,
  type Callback,
  type AsyncCallback,
  type StorageData,
  type ConfigData,
  type AgentMessage,
  type TaskResult,
  type ProcessedSignalData,
  type ComponentData,
  type AnalysisResult,
  type SystemMetrics,
  type TokenMetrics,
  type StringOrUndefined,
  type NumberOrUndefined,
  type BooleanOrUndefined,
  type DateOrUndefined,
  type ArrayOrUndefined,
  type RecordOrUndefined,
  type DeepPartial,
  type RequiredFields,
  type OptionalFields,
  type AgentId,
  type SignalId,
  type WorktreePath,
  type PRPFilePath,
  type Validator as TypeValidator,
  type TypeGuard,
  type ErrorInfo,
  type TypedFunction,
  type AsyncTypedFunction,
  type Result,
  type Option,
  type EventHandler,
  type EventBus as EventBusInterface,
  type PerformanceData,
  type ExecutionContext
} from './enhanced-types';

// Requirements
export * from './requirements';

// Nudge System
export * from './nudge/index';

// Signals System
export {
  SignalRegistry,
  SIGNAL_REGISTRY,
  signalRegistry,
  type SignalDefinition,
  SignalProcessor,
  SignalEscalationManager,
  type SignalMetrics,
  type ExtendedSignal
} from './signals/index';