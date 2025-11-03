/**
 * ♫ Inspector Layer for @dcversus/prp
 *
 * LLM-powered signal analysis with 40K token limit management,
 * parallel execution framework, and intelligent context management.
 */

// Export specific types to avoid conflicts
export type {
  DetailedInspectorResult as InspectorResult,
  InspectorError,
  InspectorConfig,
  InspectorState,
  InspectorMetrics,
  InspectorBatch,
  SignalClassification,
  Recommendation,
  ProcessingContext,
  InspectorPayload,
  PreparedContext,
  ContextData,
  EventData,
  SignalProcessor,
  InspectorEvent,
  StructuredOutputConfig,
  InspectorProcessing,
  ClassificationRequest,
  ClassificationRequirements,
  ClassificationRule,
  PayloadGenerationRequest,
  PayloadSection,
  ModelResponse,
  PromptTemplate,
  PromptVariable,
  ValidationRule,
  CacheEntry,
  InspectorSignalReceivedEvent,
  InspectorProcessingStartedEvent,
  InspectorClassificationCompletedEvent,
  InspectorPayloadGeneratedEvent,
  InspectorProcessingCompletedEvent,
  InspectorProcessingFailedEvent,
  InspectorBatchCompletedEvent,
  ActivityEntry,
  TokenStatusInfo,
  AgentStatusInfo,
  SharedNoteInfo,
  EnvironmentInfo,
  GuidelineContext,
  HistoricalData,
  JSONSchema
} from './types';

export * from './inspector';
export * from './inspector-core';
export * from './llm-execution-engine';
export * from './context-manager';
export * from './parallel-executor';
export * from './guideline-adapter';

// Main exports
export { Inspector } from './inspector';
export { InspectorCore } from './inspector-core';
export { LLMExecutionEngine } from './llm-execution-engine';
export { ContextManager } from './context-manager';
export { ParallelExecutor } from './parallel-executor';
export { GuidelineAdapter } from './guideline-adapter';