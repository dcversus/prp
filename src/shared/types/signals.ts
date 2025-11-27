/* eslint-disable */
/**
 * ♫ Unified Signal Types for @dcversus/prp
 *
 * Consolidates all signal-related types from across the codebase.
 * Provides single source of truth for signal definitions and priorities.
 */

import type { Signal } from './common';

// Signal priority enumeration for consistent ordering
export const SignalPriority = {
  CRITICAL: 10,
  HIGH: 8,
  MEDIUM_HIGH: 6,
  MEDIUM: 4,
  LOW: 2,
  INFO: 1,
} as const;

// Signal category enumeration
export const SignalCategory = {
  SYSTEM: 'system',
  DEVELOPMENT: 'development',
  ANALYSIS: 'analysis',
  INCIDENT: 'incident',
  COORDINATION: 'coordination',
  TESTING: 'testing',
  RELEASE: 'release',
  POST_RELEASE: 'post-release',
  DESIGN: 'design',
  DEVOPS: 'devops',
  CUSTOM: 'custom',
} as const;

// Signal status enumeration
export const SignalStatus = {
  DETECTED: 'detected',     // Signal found by scanner
  PENDING: 'pending',       // Queued for inspector
  ANALYZING: 'analyzing',   // Being processed by inspector
  CLASSIFIED: 'classified', // Inspector has classified
  QUEUED: 'queued',         // Queued for orchestrator
  PROCESSING: 'processing', // Being handled by orchestrator
  RESOLVED: 'resolved',     // Signal has been resolved
  CANCELLED: 'cancelled',   // Signal was cancelled
  EXPIRED: 'expired',       // Signal timed out
} as const;

// Export corresponding types for use in interfaces
export type SignalPriorityType = typeof SignalPriority[keyof typeof SignalPriority];
export type SignalCategoryType = typeof SignalCategory[keyof typeof SignalCategory];
export type SignalStatusType = typeof SignalStatus[keyof typeof SignalStatus];

// Signal pattern interface
export interface SignalPattern {
  id: string;
  name: string;
  pattern: RegExp;
  category: SignalCategoryType;
  priority: number;
  description: string;
  enabled: boolean;
  custom: boolean;
}

// Enhanced signal interface with proper typing
export interface EnhancedSignal extends Omit<Signal, 'data' | 'metadata'> {
  // Status tracking (extends base Signal)
  status: SignalStatusType;
  resolvedAt?: Date;
  resolution?: string;

  // Relationships
  parentSignal?: string;    // ID of parent signal
  childSignals: string[];   // IDs of child signals

  // Override signal data with enhanced version
  data: {
    rawSignal: string;     // The raw [XX] match
    line?: number;         // Line number in file
    column?: number;       // Column position
    context?: string;      // Context around signal
    filePath?: string;     // File where signal was found
    prpId?: string;        // Associated PRP ID
    agentId?: string;      // Agent that generated signal
    comment?: string;      // Comment following signal
    metadata?: Record<string, unknown>; // Additional data
  };

  // Override processing metadata with enhanced version
  metadata: {
    detector: string;       // Which detector found it
    guideline?: string;    // Associated guideline
    confidence?: number;   // Detection confidence 0-1
    processedAt?: Date;    // When it was processed
    batchId?: string;      // Batch ID if processed in batch
    retryCount?: number;   // Number of retries
    error?: string;        // Last error if any
  };

  // Token and cost tracking
  tokenCost?: number;
  processingCost?: number;
}

// Signal batch for processing
export interface SignalBatch {
  id: string;
  signals: EnhancedSignal[];
  timestamp: Date;
  source: string;
  priority: number;
  status: SignalStatusType;
  metadata?: {
    processingTime?: number;
    errorCount?: number;
    retryCount?: number;
  };
}

// Signal event for emission - re-exported from main types to avoid duplication
export type { SignalEvent } from '../../types';

// Inspector result
export interface InspectorResult {
  id: string;
  signalId: string;
  status: SignalStatusType;
  classification: {
    category: SignalCategoryType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    urgency: number; // 1-10
  };
  analysis: {
    confidence: number; // 0-100
    acceptance: number; // PRP acceptance score 0-100
    complexity: 'simple' | 'moderate' | 'complex' | 'unknown';
    risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  context: {
    prpId?: string;
    relatedSignals: string[];
    affectedFiles: string[];
    recommendations: string[];
  };
  processing: {
    tokensUsed: number;
    processingTime: number;
    modelUsed: string;
    guidelines: string[];
  };
  metadata: {
    inspectorVersion: string;
    processedAt: Date;
    retryCount?: number;
  };
}

// Orchestrator action result
export interface OrchestratorAction {
  id: string;
  signalId: string;
  type: 'message' | 'spawn' | 'tool' | 'wait' | 'resolve';
  target: {
    agentId?: string;
    agentType?: string;
    toolName?: string;
    messageId?: string;
  };
  instruction: {
    content: string;
    parameters?: Record<string, unknown>;
    expectedOutcome?: string;
  };
  execution: {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    result?: unknown;
    error?: string;
  };
  metadata: {
    orchestratorVersion: string;
    createdAt: Date;
    priority: number;
  };
}

// Signal queue configuration
export interface SignalQueueConfig {
  maxSize: number;
  batchSize: number;
  batchTimeout: number;
  maxConcurrency: number;
  priorityThreshold: number;
  enableDeadLetterQueue: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
}

// Signal metrics
export interface SignalMetrics {
  // Counters
  totalDetected: number;
  totalProcessed: number;
  totalResolved: number;
  totalFailed: number;
  totalExpired: number;

  // Rates
  detectionRate: number;    // signals per second
  processingRate: number;   // signals per second
  resolutionRate: number;   // percentage resolved

  // Timing
  averageDetectionLatency: number;
  averageProcessingTime: number;
  averageResolutionTime: number;

  // Queue metrics
  queueSize: number;
  queueAge: number; // Average time in queue

  // Error metrics
  errorRate: number;
  retryRate: number;
  deadLetterCount: number;

  // By category
  byCategory: Record<SignalCategoryType, {
    count: number;
    averagePriority: number;
    averageProcessingTime: number;
    resolutionRate: number;
  }>;

  // By priority
  byPriority: Record<number, {
    count: number;
    processingTime: number;
    resolutionRate: number;
  }>;
}

// Signal filter criteria
export interface SignalFilter {
  types?: string[];         // Signal types to include
  categories?: SignalCategoryType[];
  priorities?: number[];    // Priority range
  status?: SignalStatusType[];
  sources?: string[];       // Signal sources
  agents?: string[];        // Agent IDs
  prps?: string[];          // PRP IDs
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  resolved?: boolean;
  hasError?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'priority' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Signal query result
export interface SignalQueryResult {
  signals: EnhancedSignal[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
  metrics?: Partial<SignalMetrics>;
}

// Export standard Signal type for backward compatibility
export type { Signal } from './common';