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

// Legacy components for compatibility
export * from './inspector-core';
export * from './inspector';
export * from './enhanced-inspector';
export * from './llm-execution-engine';
export * from './llm-executor';
export * from './context-manager';
export * from './parallel-executor';
export * from './guideline-adapter';
export { SignalClassifier } from './signal-classifier';
export { GuidelinesAdapterV2 } from './guideline-adapter-v2';