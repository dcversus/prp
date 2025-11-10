/**
 * ♫ Task Management System for @dcversus/prp
 *
 * Core interfaces and types for task distribution, assignment, and execution
 * across the orchestrator-scanner-inspector framework.
 */

import { Signal } from '../types';

/**
 * Task definition interface - what needs to be done
 */
export interface TaskDefinition {
  /** Unique task identifier */
  id: string;

  /** Task type classification */
  type: TaskType;

  /** Task priority level */
  priority: TaskPriority;

  /** Human-readable task title */
  title: string;

  /** Detailed task description */
  description: string;

  /** Original signal that triggered this task */
  sourceSignal: Signal;

  /** Task context and metadata */
  context: {
    /** PRP ID this task relates to */
    prpId?: string;

    /** Files involved in this task */
    files?: string[];

    /** Agent that requested this task */
    requestedBy?: string;

    /** Timestamp when task was created */
    createdAt: Date;

    /** Deadline for task completion */
    deadline?: Date;

    /** Estimated effort required */
    estimatedEffort?: 'low' | 'medium' | 'high';

    /** Task dependencies */
    dependencies?: string[];

    /** Additional metadata */
    metadata?: Record<string, unknown>;
  };

  /** Required capabilities for task execution */
  requiredCapabilities: string[];

  /** Task parameters and configuration */
  parameters: Record<string, unknown>;

  /** Expected outcome format */
  expectedOutcome?: {
    type: 'file_change' | 'validation' | 'analysis' | 'generation' | 'coordination';
    description: string;
    successCriteria?: string[];
  };
}

/**
 * Task assignment interface - who does it
 */
export interface TaskAssignment {
  /** Unique assignment identifier */
  id: string;

  /** Reference to task definition */
  taskId: string;

  /** Agent assigned to execute the task */
  assignedAgent: AgentAssignment;

  /** Assignment status */
  status: AssignmentStatus;

  /** Assignment timestamps */
  timestamps: {
    /** When task was assigned */
    assignedAt: Date;

    /** When work started */
    startedAt?: Date;

    /** When work was completed */
    completedAt?: Date;

    /** Estimated completion time */
    estimatedCompletion?: Date;
  };

  /** Assignment metadata */
  metadata: {
    /** Reason for agent selection */
    selectionReason?: string;

    /** Agent confidence level */
    agentConfidence?: number;

    /** Assignment priority override */
    priorityOverride?: TaskPriority;

    /** Additional notes */
    notes?: string;
  };

  /** Assignment result */
  result?: TaskResult;
}

/**
 * Agent assignment information
 */
export interface AgentAssignment {
  /** Agent identifier */
  id: string;

  /** Agent type (robo-developer, robo-aqa, etc.) */
  type: string;

  /** Agent capabilities that match task requirements */
  matchedCapabilities: string[];

  /** Agent current status */
  status: 'available' | 'busy' | 'offline' | 'error';

  /** Agent current workload */
  currentWorkload: {
    /** Number of active tasks */
    activeTasks: number;

    /** Total tasks in queue */
    queuedTasks: number;

    /** Available capacity percentage */
    availableCapacity: number;
  };

  /** Agent performance metrics */
  performance?: {
    /** Average task completion time */
    avgCompletionTime: number;

    /** Success rate percentage */
    successRate: number;

    /** Quality score */
    qualityScore: number;
  };
}

/**
 * Task result interface - what was accomplished
 */
export interface TaskResult {
  /** Unique result identifier */
  id: string;

  /** Reference to task definition */
  taskId: string;

  /** Reference to assignment */
  assignmentId: string;

  /** Execution outcome */
  outcome: TaskOutcome;

  /** Result timestamps */
  timestamps: {
    /** When execution started */
    startedAt: Date;

    /** When execution completed */
    completedAt: Date;

    /** Total execution duration in milliseconds */
    duration: number;
  };

  /** Result details */
  details: {
    /** Summary of what was accomplished */
    summary: string;

    /** Detailed description of actions taken */
    actions?: string[];

    /** Files that were modified or created */
    affectedFiles?: string[];

    /** Output data or artifacts */
    output?: unknown;

    /** Error information if execution failed */
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };

    /** Warnings or notices */
    warnings?: string[];

    /** Additional metadata */
    metadata?: Record<string, unknown>;
  };

  /** Quality metrics */
  quality: {
    /** Overall quality score (0-100) */
    score: number;

    /** Completeness percentage */
    completeness: number;

    /** Accuracy assessment */
    accuracy: 'high' | 'medium' | 'low';

    /** Adherence to requirements */
    requirementAdherence: number;

    /** Performance metrics */
    performance?: {
      /** Resource usage efficiency */
      efficiency: number;

      /** Time taken vs estimated */
      timeliness: number;
    };
  };

  /** Validation results */
  validation?: {
    /** Whether result passed validation */
    passed: boolean;

    /** Validation checks performed */
    checks: ValidationCheck[];

    /** Overall validation status */
    status: 'passed' | 'failed' | 'partial';
  };

  /** Next steps or follow-up tasks */
  nextSteps?: {
    /** Tasks that should be created next */
    suggestedTasks?: string[];

    /** Follow-up actions required */
    actions?: string[];

    /** Agents that should review the result */
    reviewers?: string[];
  };
}

/**
 * Task type enumeration
 */
export enum TaskType {
  /** Code development tasks */
  DEVELOPMENT = 'development',

  /** Quality assurance and testing */
  TESTING = 'testing',

  /** Code review and validation */
  REVIEW = 'review',

  /** System analysis and investigation */
  ANALYSIS = 'analysis',

  /** System design and architecture */
  DESIGN = 'design',

  /** Documentation tasks */
  DOCUMENTATION = 'documentation',

  /** Deployment and operations */
  DEPLOYMENT = 'deployment',

  /** Coordination and management */
  COORDINATION = 'coordination',

  /** Research and investigation */
  RESEARCH = 'research',

  /** Bug fixing and troubleshooting */
  BUGFIX = 'bugfix',

  /** Feature implementation */
  FEATURE = 'feature',

  /** Refactoring and optimization */
  REFACTORING = 'refactoring',

  /** Integration tasks */
  INTEGRATION = 'integration',

  /** Monitoring and maintenance */
  MONITORING = 'monitoring',

  /** Security and compliance */
  SECURITY = 'security',

  /** Performance optimization */
  PERFORMANCE = 'performance',

  /** Cleanup and maintenance */
  CLEANUP = 'cleanup'
}

/**
 * Task priority enumeration
 */
export enum TaskPriority {
  /** Critical - immediate attention required */
  CRITICAL = 1,

  /** High - priority attention */
  HIGH = 2,

  /** Medium - normal priority */
  MEDIUM = 3,

  /** Low - can be deferred */
  LOW = 4,

  /** Background - when time permits */
  BACKGROUND = 5
}

/**
 * Assignment status enumeration
 */
export enum AssignmentStatus {
  /** Task assigned but not yet started */
  ASSIGNED = 'assigned',

  /** Agent has started working on task */
  IN_PROGRESS = 'in_progress',

  /** Task completed successfully */
  COMPLETED = 'completed',

  /** Task failed to complete */
  FAILED = 'failed',

  /** Task was cancelled */
  CANCELLED = 'cancelled',

  /** Task is on hold */
  ON_HOLD = 'on_hold',

  /** Task is blocked by dependencies */
  BLOCKED = 'blocked',

  /** Task is awaiting validation */
  PENDING_VALIDATION = 'pending_validation',

  /** Task is being reviewed */
  UNDER_REVIEW = 'under_review'
}

/**
 * Task outcome enumeration
 */
export enum TaskOutcome {
  /** Task completed successfully */
  SUCCESS = 'success',

  /** Task failed to complete */
  FAILURE = 'failure',

  /** Task partially completed */
  PARTIAL = 'partial',

  /** Task was cancelled */
  CANCELLED = 'cancelled',

  /** Task timed out */
  TIMEOUT = 'timeout',

  /** Task blocked by external factors */
  BLOCKED = 'blocked'
}

/**
 * Validation check interface
 */
export interface ValidationCheck {
  /** Check identifier */
  id: string;

  /** Check description */
  description: string;

  /** Check type */
  type: 'automated' | 'manual' | 'peer_review';

  /** Check result */
  result: 'pass' | 'fail' | 'warning' | 'skip';

  /** Check details */
  details?: {
    /** Check output or evidence */
    evidence?: unknown;

    /** Error message if failed */
    error?: string;

    /** Recommendations if failed */
    recommendations?: string[];
  };

  /** Check timestamp */
  timestamp: Date;
}

/**
 * Task filtering options
 */
export interface TaskFilter {
  /** Task types to include */
  types?: TaskType[];

  /** Task priorities to include */
  priorities?: TaskPriority[];

  /** Assignment statuses to include */
  statuses?: AssignmentStatus?;

  /** Agent IDs to filter by */
  agents?: string[];

  /** PRP IDs to filter by */
  prpIds?: string[];

  /** Date range filter */
  dateRange?: {
    start?: Date;
    end?: Date;
  };

  /** Text search filter */
  search?: string;

  /** Custom filter criteria */
  custom?: Record<string, unknown>;
}

/**
 * Task statistics interface
 */
export interface TaskStatistics {
  /** Total number of tasks */
  total: number;

  /** Tasks by status */
  byStatus: Record<AssignmentStatus, number>;

  /** Tasks by type */
  byType: Record<TaskType, number>;

  /** Tasks by priority */
  byPriority: Record<TaskPriority, number>;

  /** Tasks by agent */
  byAgent: Record<string, number>;

  /** Performance metrics */
  performance: {
    /** Average completion time */
    avgCompletionTime: number;

    /** Success rate percentage */
    successRate: number;

    /** Quality score average */
    avgQualityScore: number;

    /** Tasks completed per hour */
    throughput: number;
  };

  /** Current workload */
  workload: {
    /** Active tasks count */
    active: number;

    /** Queued tasks count */
    queued: number;

    /** Overdue tasks count */
    overdue: number;
  };
}