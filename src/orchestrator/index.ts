/**
 * ♫ Orchestrator Layer Exports for @dcversus/prp
 *
 * Central decision-making layer with LLM-based orchestration,
 * chain-of-thought reasoning, and agent coordination.
 */
export { OrchestratorCore } from './orchestrator-core';
export type {
  OrchestratorConfig,
  ContextPreservationConfig,
  ToolConfig,
  ToolParameters,
  ParameterDefinition,
  AgentManagementConfig,
  OrchestratorPrompts,
  DecisionThresholds,
  OrchestratorState,
  AgentSession,
  AgentTask,
  AgentCapabilities,
  DecisionRecord,
  OrchestratorDecision,
  DecisionAction,
  AgentAssignment,
  ToolUsage,
  CheckpointDefinition,
  ChainOfThoughtState,
  CoTStep,
  CoTContext,
  ChainOfThoughtResult,
  ActionResult,
  DecisionOutcome,
  CheckpointResult,
  ContextMemory,
  ConversationTurn,
  SharedNote,
  OrchestratorMetrics,
  OrchestratorError,
  ExecutionPlan,
  ExecutionStep,
  // Event types
  OrchestratorPayloadReceivedEvent,
  OrchestratorDecisionStartedEvent,
  OrchestratorDecisionCompletedEvent,
  OrchestratorAgentTaskAssignedEvent,
  OrchestratorAgentTaskCompletedEvent,
  OrchestratorCheckpointReachedEvent,
  OrchestratorErrorEvent,
  OrchestratorChainOfThoughtUpdateEvent,
  OrchestratorContextUpdateEvent,
} from './types';
export { ToolImplementation } from './tool-implementation';

// Codemap integration exports
export { CodemapOrchestratorAdapter } from './codemap-adapter';
export type {
  AgentCapability,
  AgentWorkload,
  OrchestrationTask,
  WorkflowStep,
  OrchestrationPlan,
  AgentRelevantInfo,
  RealTimeUpdate,
} from './codemap-adapter';
