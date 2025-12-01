/**
 * ♫ Inspector Layer for @dcversus/prp
 *
 * Enhanced Inspector (Critic) system with:
 * - FIFO processing with cheapest LLM and largest context
 * - Parallel execution support (default 2 inspectors, configurable)
 * - 1M token cap with 40K output limits
 * - Signal classification with priority/confidence scoring
 * - Dynamic guidelines loading from /src/guidelines/XX/ directories
 * - Structured output and comprehensive testing
 */
// Export all types from the types module
export type * from './types';
// Core FIFO Inspector Implementation (PRP-000-agents05)
export { FIFOInspector } from './fifo-inspector';
export type { FIFOInspectorConfig, InspectorAnalysisResult } from './fifo-inspector';
// Export alias for backward compatibility
export { FIFOInspector as Inspector } from './fifo-inspector';
// Enhanced Guideline Adapter
export { EnhancedGuidelineAdapter } from './enhanced-guideline-adapter';
export type { InspectorGuideline, GuidelineLoadResult } from './enhanced-guideline-adapter';
// Active components
export * from '../orchestrator/enhanced-context-manager';
export * from './parallel-executor';
export * from './llm-execution-engine';
// export { SignalClassifier } from './signal-classifier'; // TODO: Update with new signal detection system
// export { GuidelinesAdapterV2 } from './guideline-adapter-v2'; // Removed - duplicate functionality

// Codemap integration exports
export { CodemapInspectorAdapter } from '../scanner/codemap-inspector-adapter';
export type {
  InspectorFunctionInfo,
  InspectorClassInfo,
  InspectorFileInfo,
  InspectorCodemapSummary,
  InspectorQueryOptions,
  InspectorQueryResult,
} from '../scanner/codemap-inspector-adapter';
