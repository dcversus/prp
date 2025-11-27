/**
 * ♫ Agents Module Index for @dcversus/prp
 *
 * Central export point for all agent-related functionality including
 * the new signal attribution system.
 */

// Base agent interfaces
export type {
  BaseAgent,
  AgentCapabilities,
  AgentLimits,
  AgentStatus,
  AgentMetrics,
  BaseAgentConstructor
} from './base-agent';

// Concrete agent implementations
export { default as RoboDeveloper } from './robo-developer';
export { default as RoboAQA } from './robo-aqa';
export { default as RoboSystemAnalyst } from './robo-system-analyst';
export { default as RoboUXUIDesigner } from './robo-ux-ui-designer';
export { default as RoboDevopsSRE } from './robo-devops-sre';
export { default as RoboQualityControl } from './robo-quality-control';

// Agent lifecycle management
export { AgentLifecycleManager } from './agent-lifecycle-manager';

// Signal Attribution System
export * from './attribution-index';

// Legacy exports for compatibility
export type {
  AgentActivityTracker as LegacyAgentActivityTracker,
  AgentSignalRegistry as LegacyAgentSignalRegistry
} from './agent-activity-tracker';