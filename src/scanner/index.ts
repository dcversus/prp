/**
 * ♫ Scanner System for @dcversus/prp
 *
 * High-performance infrastructure layer for monitoring hundreds of worktrees,
 * tracking token usage, and detecting signals across the development environment.
 */
export type * from './types';
// Explicit exports to avoid conflicts
// Multi-provider token accounting has been removed - see PRP-000 for token tracking strategy
export { ScannerCore as Scanner } from './scanner-core';
export { UnifiedSignalDetector } from './unified-signal-detector';
export * from './logs-manager';
export * from './code-analyzer-with-tree-sitter';
export * from './enhanced-git-worktree-monitor';
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
  TokenEvent as RealTimeTokenEvent, // Rename to avoid conflict
} from './realtime-event-emitter';
// Main exports - Core Components
export { LogsManager } from './logs-manager';
export { CodeAnalyzerWithTreeSitter as CodeAnalyzer } from './code-analyzer-with-tree-sitter';
// Legacy exports for compatibility
export { EnhancedGitWorktreeMonitor as EnhancedGitMonitor } from './enhanced-git-worktree-monitor';
export { EnhancedPRPParser } from './enhanced-prp-parser';

// Codemap system exports
export { CodemapStorage } from './codemap-storage';
export type {
  CodemapStorageOptions,
  DiffInfo,
  FileChangeDiff,
  VersionInfo,
  WorktreeInfo,
  CodemapSnapshot,
  CodemapDiff,
} from './codemap-storage';

export { CodemapInspectorAdapter } from './codemap-inspector-adapter';
export type {
  InspectorFunctionInfo,
  InspectorClassInfo,
  InspectorFileInfo,
  InspectorCodemapSummary,
  InspectorQueryOptions,
  InspectorQueryResult,
} from './codemap-inspector-adapter';

export { CodemapUtils } from './codemap-utils';
export type {
  CodemapRepresentation,
  CodePattern,
  CompactFileInfo,
  CompactFunctionInfo,
  CompactClassInfo,
  CodemapSummary,
  FilterOptions,
  ExtractionOptions,
} from './codemap-utils';

export * from './codemap-adapter-types';

// Multi-Provider Token Accounting System Exports
export { MultiProviderTokenAccounting } from './multi-provider-token-accounting';
export type {
  TokenUsageRecord,
  ProviderUsage,
  LimitPrediction,
  TrendDataPoint,
  TokenEvent,
  TokenLimit,
  ApproachingLimit,
} from './multi-provider-token-accounting';

// Unified Token Monitoring Dashboard Exports
export { UnifiedTokenMonitoringDashboard } from './unified-token-monitoring-dashboard';
export type {
  UnifiedTokenMetrics,
  TokenCapEnforcement,
  MonitoringDashboardConfig,
} from './unified-token-monitoring-dashboard';

// Token Cap Enforcement System Exports
export { TokenCapEnforcementManager } from './token-cap-enforcement';
export type {
  CapEnforcementConfig,
  EnforcementAction,
  ComponentUsage,
  CapEnforcementStatus,
} from './token-cap-enforcement';

// Real-time Token Usage Detector Exports
export { RealtimeTokenUsageDetector } from './realtime-token-usage-detector';
export type {
  TokenDetectionPattern,
  TokenDetectionConfig,
  TokenDetectionEvent,
} from './realtime-token-usage-detector';

// Comprehensive Monitoring API Exports
export { ComprehensiveMonitoringAPI } from './comprehensive-monitoring-api';
export type {
  MonitoringSystemConfig,
  SystemHealthStatus,
  ComponentHealth,
  ComprehensiveMonitoringData,
  MonitoringApiResponse,
  TUIDataResponse,
} from './comprehensive-monitoring-api';

// Automated Alerting System Exports
export { AutomatedAlertingSystem } from './automated-alerting-system';
export type {
  AlertRule,
  AlertCondition,
  AlertEscalation,
  AlertAction,
  AlertInstance,
  AlertExecution,
  AlertSystemConfig,
} from './automated-alerting-system';

// Main Integration Exports
export {
  TokenMonitoringIntegration,
  createTokenMonitoringSystem,
  quickStartTokenMonitoring,
} from './token-monitoring-integration';
export type {
  TokenMonitoringIntegrationConfig,
  TokenMonitoringSystem,
} from './token-monitoring-integration';
