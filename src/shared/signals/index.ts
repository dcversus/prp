/**
 * ♫ Signal System Exports for @dcversus/prp
 *
 * Complete signal management system with hierarchy:
 * oo → aa → OO → AA (ascending urgency)
 */

export {
  SignalRegistry,
  SIGNAL_REGISTRY,
  signalRegistry
} from './registry';

export type {
  SignalDefinition,
  ExtendedSignal
} from './registry';

export {
  SignalProcessor,
  SignalEscalationManager
} from './processor';

export type { SignalMetrics } from './processor';