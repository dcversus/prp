/**
 * ♫ @dcversus/prp - Three-Layer Architecture System
 * Main entry point for programmatic usage
 */
// Core components with explicit exports to avoid conflicts
export { Scanner } from './scanner/index';
export type { ScannerConfig, ScanResult } from './scanner/index';
export { Inspector } from './inspector/index';
export type { InspectorPayload, SignalClassification } from './inspector/index';
export { OrchestratorCore, ToolImplementation } from './orchestrator/index';
export type {
  OrchestratorConfig,
  OrchestratorState,
  DecisionRecord,
  AgentSession,
} from './orchestrator/index';
export { StorageManager } from './shared/storage';
export type { StorageConfig } from './shared/types';
export { GuidelinesRegistry } from './guidelines/index';
export type { GuidelineDefinition } from './guidelines/index';
export type { GuidelineProtocol } from './shared/types';
export { EventBus, Logger } from './shared/index';
export type { EventChannel, Signal, ChannelEvent } from './shared/index';
export type { AgentConfig } from './shared/index';
// tmux functionality has been moved to appropriate modules
// scanner/terminal-monitor, orchestrator/tmux-management, and shared/types
export {
  SignalRegistry,
  SIGNAL_REGISTRY,
  signalRegistry,
  SignalProcessor,
  SignalEscalationManager,
} from './shared/signals/index';
export type { SignalMetrics } from './shared/signals/index';

// Codemap system exports
export { CodemapStorage, CodemapInspectorAdapter, CodemapUtils } from './scanner/index';
export type {
  CodemapStorageOptions,
  DiffInfo,
  FileChangeDiff,
  VersionInfo,
  WorktreeInfo,
  CodemapSnapshot,
  CodemapDiff,
  InspectorFunctionInfo,
  InspectorClassInfo,
  InspectorFileInfo,
  InspectorCodemapSummary,
  InspectorQueryOptions,
  InspectorQueryResult,
  CodemapRepresentation,
  CodePattern,
  CompactFileInfo,
  CompactFunctionInfo,
  CompactClassInfo,
  CodemapSummary,
  FilterOptions,
  ExtractionOptions,
} from './scanner/index';

export { CodemapOrchestratorAdapter } from './orchestrator/index';
export type {
  AgentCapability,
  AgentWorkload,
  OrchestrationTask,
  WorkflowStep,
  OrchestrationPlan,
  AgentRelevantInfo,
  RealTimeUpdate,
} from './orchestrator/index';
