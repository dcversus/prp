/**
 * ♫ Scanner System for @dcversus/prp
 *
 * High-performance infrastructure layer for monitoring hundreds of worktrees,
 * tracking token usage, and detecting signals across the development environment.
 */

export type * from './types';

// Explicit exports to avoid conflicts
export { TokenAccountant } from './token-accountant';
export type {
  TrendDataPoint,
  TokenUsage,
  TokenLimit,
  TokenEvent,
  ApproachingLimit
} from './token-accountant';

export { ScannerCore as Scanner } from './ScannerCore';
export * from './signal-detector';
export * from './enhanced-signal-detector';
export * from './logs-manager';
export * from './code-analyzer';
export * from './enhanced-git-monitor';
export * from './enhanced-prp-parser';

// Export RealTimeEventEmitter with renamed TokenEvent to avoid conflicts
export { RealTimeEventEmitter } from './realtime-event-emitter';
export type {
  RealTimeEvent,
  SignalEvent,
  ScannerEvent,
  PRPEvent,
  GitEvent,
  SystemEvent,
  TokenEvent as RealTimeTokenEvent  // Rename to avoid conflict
} from './realtime-event-emitter';

// Main exports - Core Components
export { EnhancedSignalDetector } from './enhanced-signal-detector';
export { LogsManager } from './logs-manager';
export { CodeAnalyzer } from './code-analyzer';

// Legacy exports for compatibility
export { EnhancedGitMonitor } from './enhanced-git-monitor';
export { EnhancedPRPParser } from './enhanced-prp-parser';