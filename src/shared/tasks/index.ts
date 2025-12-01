/**
 * ♫ Task Management System for @dcversus/prp
 *
 * Central task management exports for the orchestrator-scanner-inspector framework.
 */
export * from './types';
export * from './task-manager';
// Re-export common utilities
export { TaskManager } from './task-manager';
// Re-export specific types that are commonly imported
export { TaskType, TaskPriority, AssignmentStatus, TaskOutcome } from './types';

// Agent capability type for orchestrator compatibility
export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: 'primary' | 'secondary' | 'tool' | 'specialization';
  type: string;
  enabled: boolean;
  version?: string;
  certification?: {
    certified: boolean;
    level?: 'basic' | 'intermediate' | 'advanced' | 'expert';
    expiresAt?: Date;
  };
  metadata?: Record<string, unknown>;
}
