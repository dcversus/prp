/**
 * ♫ Shared Components for @dcversus/prp
 *
 * Central exports for shared types, utilities, and infrastructure.
 */

// Types
export * from './types';

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
  SignalParser,
  FileUtils,
  GitUtils,
  PerformanceMonitor,
  ConfigUtils,
  TimeUtils,
  HashUtils,
  Validator
} from './utils';

// Logger
export * from './logger';

// Config
export * from './config';

// GitHub
export * from './github';

// Agent Config
export {
  AgentRegistry,
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