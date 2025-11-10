/**
 * ♫ @dcversus/prp - Three-Layer Architecture System
 * Main entry point for programmatic usage
 */

// Core components with explicit exports to avoid conflicts
export {
  Scanner
} from './scanner/index.js';
export type {
  ScannerConfig,
  ScanResult
} from './scanner/index.js';

export {
  Inspector
} from './inspector/index.js';
export type {
  InspectorPayload,
  SignalClassification
} from './inspector/index.js';

export {
  Orchestrator,
  ToolImplementation
} from './orchestrator/index.js';
export type {
  OrchestratorConfig,
  OrchestratorState,
  DecisionRecord,
  AgentSession
} from './orchestrator/index.js';

export {
  StorageManager
} from './shared/storage.js';
export type {
  StorageConfig
} from './shared/types.js';

export {
  GuidelinesRegistry
} from './guidelines/index.js';
export type {
  GuidelineDefinition
} from './guidelines/index.js';

export type {
  GuidelineProtocol
} from './shared/types';

export {
  EventBus,
  Logger
} from './shared/index.js';
export type {
  EventChannel,
  Signal,
  ChannelEvent
} from './shared/index.js';
export type {
  AgentConfig
} from './shared/index.js';

// tmux functionality has been moved to appropriate modules
// scanner/terminal-monitor, orchestrator/tmux-management, and shared/types

export {
  SignalRegistry,
  SIGNAL_REGISTRY,
  signalRegistry,
  SignalProcessor,
  SignalEscalationManager
} from './shared/signals/index.js';
export type {
  SignalMetrics
} from './shared/signals/index.js';
