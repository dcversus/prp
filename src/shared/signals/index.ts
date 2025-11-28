/* eslint-disable */
/**
 * ♫ Signal System Exports for @dcversus/prp
 *
 * Complete signal management system with hierarchy:
 * oo → aa → OO → AA (ascending urgency)
 *
 * Integration Components:
 * - Signal detection and processing
 * - EventBus integration for TUI
 * - Agent log streaming
 * - Signal flow coordination
 * - End-to-end pipeline management
 */

// Core signal system components
export { SignalRegistry, SIGNAL_REGISTRY, signalRegistry } from './registry';
export type { SignalDefinition, ExtendedSignal } from './registry';
export { SignalProcessor, SignalEscalationManager, SignalMetricsTracker } from './processor';
export type { SignalProcessingResult, SignalMetrics } from './processor';

// Signal tracking and lifecycle management
export { SignalTracker } from './tracker';
export type {
  SignalLifecycleEvent,
  SignalAnalytics,
  SignalFilter
} from './tracker';

// Signal priority queue and processing
export { SignalPriorityQueue, DefaultSignalConsumers } from './priority-queue';
export type {
  QueuedSignal,
  QueueStats,
  SignalConsumer
} from './priority-queue';

// EventBus integration for TUI connectivity
export { EventBusIntegrationManager, eventBusIntegration } from './event-bus-integration';
export type { EventBusIntegration } from '../../types';

// Signal flow coordination and pipeline management
export { SignalFlowCoordinator, signalFlowCoordinator } from './signal-flow-coordinator';
export type { SignalFlowConfig, SignalFlowMetrics } from './signal-flow-coordinator';

// Main signal system integration
export {
  SignalSystemIntegration,
  signalSystemIntegration,
  initializeSignalSystem,
  startSignalSystem
} from './signal-system-integration';
export type { SignalSystemConfig, SignalSystemStatus } from './signal-system-integration';

// Re-export Signal types for convenience
export type { Signal } from '../types/common';
export type { SignalEvent } from '../../types';
export type {
  EnhancedSignal,
  SignalStatusType as SignalStatus,
  SignalFilter,
  SignalQueryResult
} from '../types/signals';
export type {
  SignalAggregation,
  SignalSubscription,
  SignalDisplay
} from '../../types';
