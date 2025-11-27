/**
 * Inspector → Orchestrator Bridge
 *
 * Bridges the gap between the Inspector analysis and Orchestrator decision making.
 * Handles payload creation, task forwarding, and result coordination between the two systems.
 */
import { EventEmitter } from 'events';

import { logger } from '../shared/logger';

import type { InspectorResult } from '../inspector/types';
import type { InspectorPayload } from '../shared/types';

export interface InspectorOrchestratorBridgeConfig {
  // Payload creation settings
  payloadTimeout?: number;
  maxPayloadSize?: number;
  enablePayloadCompression?: boolean;
  // Task routing settings
  enableTaskPrioritization?: boolean;
  maxConcurrentTasks?: number;
  taskTimeout?: number;
  // Result aggregation settings
  resultAggregationWindow?: number;
  enableResultBatching?: boolean;
  batchSize?: number;
  // Error handling
  maxRetries?: number;
  retryDelay?: number;
  enableDeadLetterQueue?: boolean;
  // Health monitoring
  healthCheckInterval?: number;
  connectionTimeout?: number;
}
export interface BridgeMetrics {
  payloadsCreated: number;
  tasksForwarded: number;
  resultsAggregated: number;
  averageLatency: number;
  errorCount: number;
  uptime: number;
  lastHealthCheck: Date;
  deadLetterQueueSize: number;
}
export interface TaskRequest {
  id: string;
  type: string;
  priority: number;
  payload: any;
  sourceResultId: string;
  createdAt: Date;
  retryCount: number;
}
export interface ResultAggregation {
  id: string;
  results: InspectorResult[];
  createdAt: Date;
  completedAt?: Date;
  payload?: InspectorPayload;
}
/**
 * Bridge component that connects Inspector to Orchestrator
 */
export class InspectorOrchestratorBridge extends EventEmitter {
  private readonly config: Required<InspectorOrchestratorBridgeConfig>;
  private readonly metrics: BridgeMetrics;
  private isRunning = false;
  private startTime?: Date;
  private healthCheckTimer?: NodeJS.Timeout;
  private readonly pendingTasks = new Map<string, TaskRequest>();
  private readonly resultAggregations = new Map<string, ResultAggregation>();
  private deadLetterQueue: InspectorResult[] = [];
  // References to connected components
  private inspector?: any; // Will be set via connectInspector()
  private orchestrator?: any; // Will be set via connectOrchestrator()
  constructor(config: InspectorOrchestratorBridgeConfig = {}) {
    super();
    // Default configuration
    this.config = {
      payloadTimeout: config.payloadTimeout ?? 5000, // 5 seconds
      maxPayloadSize: config.maxPayloadSize ?? 1000000, // 1MB
      enablePayloadCompression: config.enablePayloadCompression ?? false,
      enableTaskPrioritization: config.enableTaskPrioritization ?? true,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
      taskTimeout: config.taskTimeout ?? 30000, // 30 seconds
      resultAggregationWindow: config.resultAggregationWindow ?? 2000, // 2 seconds
      enableResultBatching: config.enableResultBatching ?? true,
      batchSize: config.batchSize ?? 5,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableDeadLetterQueue: config.enableDeadLetterQueue ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout ?? 5000, // 5 seconds
    };
    this.metrics = {
      payloadsCreated: 0,
      tasksForwarded: 0,
      resultsAggregated: 0,
      averageLatency: 0,
      errorCount: 0,
      uptime: 0,
      lastHealthCheck: new Date(),
      deadLetterQueueSize: 0,
    };
  }
  /**
   * Start the bridge and begin monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('InspectorOrchestratorBridge is already running');
    }
    this.startTime = new Date();
    this.isRunning = true;
    // Start health monitoring
    this.startHealthMonitoring();
    this.emit('bridge:started', {
      bridge: 'inspector-orchestrator',
      timestamp: this.startTime,
      config: this.config,
    });
    logger.debug('orchestrator', 'inspector-orchestrator-bridge', '🌉 Inspector-Orchestrator Bridge started');
  }
  /**
   * Stop the bridge and clean up resources
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    // Process pending tasks
    await this.processPendingTasks();
    // Complete pending aggregations
    await this.completePendingAggregations();
    this.removeAllListeners();
    this.emit('bridge:stopped', {
      bridge: 'inspector-orchestrator',
      timestamp: new Date(),
      metrics: this.metrics,
    });
    logger.debug('orchestrator', 'inspector-orchestrator-bridge', '🌉 Inspector-Orchestrator Bridge stopped');
  }
  /**
   * Connect to inspector component
   */
  connectInspector(inspector: any): void {
    if (this.inspector) {
      this.disconnectInspector();
    }
    this.inspector = inspector;
    // Set up event listeners for inspector
    inspector.on('inspector:result', (result: InspectorResult) => {
      this.handleInspectorResult(result);
    });
    inspector.on('inspector:batch_completed', (results: InspectorResult[]) => {
      this.handleInspectorBatch(results);
    });
    inspector.on('inspector:error', (error: Error) => {
      this.handleInspectorError(error);
    });
    this.emit('bridge:inspector_connected', { inspector: inspector.constructor.name });
  }
  /**
   * Connect to orchestrator component
   */
  connectOrchestrator(orchestrator: any): void {
    if (this.orchestrator) {
      this.disconnectOrchestrator();
    }
    this.orchestrator = orchestrator;
    // Set up event listeners for orchestrator
    orchestrator.on('decision_started', (data: any) => {
      this.handleDecisionStarted(data);
    });
    orchestrator.on('decision_completed', (data: any) => {
      this.handleDecisionCompleted(data);
    });
    orchestrator.on('error', (error: Error) => {
      this.handleOrchestratorError(error);
    });
    this.emit('bridge:orchestrator_connected', { orchestrator: orchestrator.constructor.name });
  }
  /**
   * Disconnect from inspector
   */
  disconnectInspector(): void {
    if (this.inspector) {
      this.inspector.removeAllListeners('inspector:result');
      this.inspector.removeAllListeners('inspector:batch_completed');
      this.inspector.removeAllListeners('inspector:error');
      this.inspector = undefined;
      this.emit('bridge:inspector_disconnected');
    }
  }
  /**
   * Disconnect from orchestrator
   */
  disconnectOrchestrator(): void {
    if (this.orchestrator) {
      this.orchestrator.removeAllListeners('decision_started');
      this.orchestrator.removeAllListeners('decision_completed');
      this.orchestrator.removeAllListeners('error');
      this.orchestrator = undefined;
      this.emit('bridge:orchestrator_disconnected');
    }
  }
  /**
   * Handle single inspector result
   */
  private async handleInspectorResult(result: InspectorResult): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    const startTime = Date.now();
    try {
      // Create aggregation for this result
      const aggregationId = `agg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const aggregation: ResultAggregation = {
        id: aggregationId,
        results: [result],
        createdAt: new Date(),
      };
      this.resultAggregations.set(aggregationId, aggregation);
      // Set timer to complete aggregation
      setTimeout(() => {
        this.completeAggregation(aggregationId);
      }, this.config.resultAggregationWindow);
      this.emit('bridge:result_received', {
        resultId: result.id,
        aggregationId,
        confidence: result.confidence,
      });
    } catch (error) {
      this.metrics.errorCount++;
      this.handleResultError(result, error instanceof Error ? error : new Error(String(error)));
    }
    // Update metrics
    const latency = Date.now() - startTime;
    this.updateMetrics(latency);
  }
  /**
   * Handle batch of inspector results
   */
  private async handleInspectorBatch(results: InspectorResult[]): Promise<void> {
    if (!this.isRunning || results.length === 0) {
      return;
    }
    const startTime = Date.now();
    try {
      // Create aggregation for batch
      const aggregationId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const aggregation: ResultAggregation = {
        id: aggregationId,
        results: results,
        createdAt: new Date(),
      };
      this.resultAggregations.set(aggregationId, aggregation);
      // Complete aggregation immediately for batches
      await this.completeAggregation(aggregationId);
      this.emit('bridge:batch_received', {
        aggregationId,
        resultCount: results.length,
        averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      });
    } catch (error) {
      this.metrics.errorCount++;
      console.error('Failed to handle inspector batch:', error);
    }
    // Update metrics
    const latency = Date.now() - startTime;
    this.updateMetrics(latency);
  }
  /**
   * Complete a result aggregation and create payload
   */
  private async completeAggregation(aggregationId: string): Promise<void> {
    const aggregation = this.resultAggregations.get(aggregationId);
    if (!aggregation || aggregation.completedAt) {
      return;
    }
    try {
      // Create payload from aggregation
      const payload = this.createPayloadFromResults(aggregation.results);
      aggregation.payload = payload;
      aggregation.completedAt = new Date();
      // Forward payload to orchestrator
      await this.forwardPayloadToOrchestrator(payload, aggregationId);
      // Update metrics
      this.metrics.resultsAggregated += aggregation.results.length;
      this.metrics.payloadsCreated++;
      this.emit('bridge:aggregation_completed', {
        aggregationId,
        resultCount: aggregation.results.length,
        payloadId: payload.id,
        processingTime: aggregation.completedAt.getTime() - aggregation.createdAt.getTime(),
      });
    } catch (error) {
      this.metrics.errorCount++;
      this.handleAggregationError(
        aggregation,
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      // Clean up aggregation after a delay
      setTimeout(() => {
        this.resultAggregations.delete(aggregationId);
      }, 5000);
    }
  }
  /**
   * Create inspector payload from results
   */
  private createPayloadFromResults(results: InspectorResult[]): InspectorPayload {
    if (results.length === 0) {
      throw new Error('Cannot create payload from empty results');
    }
    const primaryResult = results[0]; // Use first result as primary
    const allSignals = results.map((r) => r.signal);
    // Calculate aggregate confidence
    const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const maxPriority = Math.max(...results.map((r) => r.signal.priority));
    return {
      id: `payload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      signalId: primaryResult.signal.id,
      timestamp: new Date(),
      sourceSignals: allSignals,
      classification: {
        category: primaryResult.classification.category,
        subcategory: primaryResult.classification.subcategory,
        priority: maxPriority,
        agentRole: primaryResult.classification.agentRole,
        escalationLevel: primaryResult.classification.escalationLevel,
        deadline: primaryResult.classification.deadline,
        dependencies: primaryResult.classification.dependencies,
        confidence: averageConfidence,
      },
      recommendations: results.flatMap((r) => r.recommendations || []),
      context: {
        id: `context-${Date.now()}`,
        summary: `Analysis of ${results.length} signal(s)`,
        keyPoints: this.extractKeyPoints(results),
        relevantData: {
          resultCount: results.length,
          signalTypes: [...new Set(allSignals.map((s) => s.type))],
          sources: [...new Set(allSignals.map((s) => s.source))],
        },
        fileReferences: [],
        agentStates: {},
        activePRPs: [],
        blockedItems: [],
        recentActivity: [],
        tokenStatus: {
          used: 0,
          totalUsed: 0,
          totalLimit: 100000,
          approachingLimit: false,
          criticalLimit: false,
          agentBreakdown: {},
        },
        agentStatus: [],
        sharedNotes: [],
      },
      size: 0,
      compressed: false,
      estimatedTokens: this.estimateTokenCount(results),
      priority: maxPriority,
    };
  }
  /**
   * Extract key points from results
   */
  private extractKeyPoints(results: InspectorResult[]): string[] {
    const keyPoints: string[] = [];
    for (const result of results) {
      if (result.classification.category) {
        keyPoints.push(`Category: ${result.classification.category}`);
      }
      if (result.signal.type) {
        keyPoints.push(`Signal: ${result.signal.type}`);
      }
      if (result.confidence > 0.8) {
        keyPoints.push(`High confidence: ${result.confidence}`);
      }
    }
    return keyPoints.slice(0, 10); // Limit to 10 key points
  }
  /**
   * Estimate token count for results
   */
  private estimateTokenCount(results: InspectorResult[]): number {
    // Rough estimation: 1 token per 4 characters
    const totalChars = JSON.stringify(results).length;
    return Math.ceil(totalChars / 4);
  }
  /**
   * Forward payload to orchestrator
   */
  private async forwardPayloadToOrchestrator(
    payload: InspectorPayload,
    aggregationId: string,
  ): Promise<void> {
    if (!this.orchestrator) {
      throw new Error('Orchestrator not connected');
    }
    try {
      const decisionId = await this.orchestrator.processPayload(payload);
      this.metrics.tasksForwarded++;
      this.emit('bridge:payload_forwarded', {
        payloadId: payload.id,
        decisionId,
        aggregationId,
        priority: payload.priority,
      });
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }
  /**
   * Handle decision started event from orchestrator
   */
  private handleDecisionStarted(data: any): void {
    this.emit('bridge:decision_started', {
      decisionId: data.decisionId,
      bridgeMetrics: this.metrics,
    });
  }
  /**
   * Handle decision completed event from orchestrator
   */
  private handleDecisionCompleted(data: any): void {
    this.emit('bridge:decision_completed', {
      decisionId: data.decisionId,
      outcome: data.outcome,
      bridgeMetrics: this.metrics,
    });
  }
  /**
   * Handle inspector error
   */
  private handleInspectorError(error: Error): void {
    this.metrics.errorCount++;
    this.emit('bridge:inspector_error', {
      error,
      bridgeMetrics: this.metrics,
    });
  }
  /**
   * Handle orchestrator error
   */
  private handleOrchestratorError(error: Error): void {
    this.metrics.errorCount++;
    this.emit('bridge:orchestrator_error', {
      error,
      bridgeMetrics: this.metrics,
    });
  }
  /**
   * Handle result processing error
   */
  private handleResultError(result: InspectorResult, error: Error): void {
    if (this.config.enableDeadLetterQueue) {
      this.deadLetterQueue.push(result);
      this.metrics.deadLetterQueueSize = this.deadLetterQueue.length;
      this.emit('bridge:dead_letter_queued', {
        resultId: result.id,
        error: error.message,
      });
    }
    this.emit('bridge:result_error', {
      resultId: result.id,
      error: error.message,
    });
  }
  /**
   * Handle aggregation error
   */
  private handleAggregationError(aggregation: ResultAggregation, error: Error): void {
    if (this.config.enableDeadLetterQueue) {
      this.deadLetterQueue.push(...aggregation.results);
      this.metrics.deadLetterQueueSize = this.deadLetterQueue.length;
    }
    this.emit('bridge:aggregation_error', {
      aggregationId: aggregation.id,
      resultCount: aggregation.results.length,
      error: error.message,
    });
  }
  /**
   * Process pending tasks during shutdown
   */
  private async processPendingTasks(): Promise<void> {
    const tasks = Array.from(this.pendingTasks.values());
    for (const task of tasks) {
      try {
        // Log pending tasks
        logger.debug('orchestrator', 'inspector-orchestrator-bridge', `Pending task during shutdown: ${task.id} (${task.type})`);
      } catch (error) {
        console.warn(`Failed to process pending task ${task.id}:`, error);
      }
    }
    this.pendingTasks.clear();
  }
  /**
   * Complete pending aggregations during shutdown
   */
  private async completePendingAggregations(): Promise<void> {
    const aggregations = Array.from(this.resultAggregations.values());
    for (const aggregation of aggregations) {
      if (!aggregation.completedAt) {
        try {
          await this.completeAggregation(aggregation.id);
        } catch (error) {
          console.warn(`Failed to complete aggregation ${aggregation.id}:`, error);
        }
      }
    }
  }
  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }
  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const health = {
      bridge: this.isRunning,
      inspector: !!this.inspector,
      orchestrator: !!this.orchestrator,
      pendingTasks: this.pendingTasks.size,
      pendingAggregations: this.resultAggregations.size,
      deadLetterQueue: this.deadLetterQueue.length,
      metrics: this.metrics,
    };
    this.metrics.lastHealthCheck = new Date();
    this.emit('bridge:health_check', health);
    // Log warnings for unhealthy conditions
    if (!health.inspector) {
      console.warn('⚠️ Inspector not connected to bridge');
    }
    if (!health.orchestrator) {
      console.warn('⚠️ Orchestrator not connected to bridge');
    }
    if (health.pendingAggregations > 20) {
      console.warn(`⚠️ High number of pending aggregations: ${health.pendingAggregations}`);
    }
  }
  /**
   * Update bridge metrics
   */
  private updateMetrics(latency: number): void {
    // Update average latency
    const totalOperations = this.metrics.payloadsCreated + this.metrics.tasksForwarded;
    if (totalOperations > 0) {
      this.metrics.averageLatency =
        (this.metrics.averageLatency * (totalOperations - 1) + latency) / totalOperations;
    }
    this.metrics.uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }
  /**
   * Get current bridge metrics
   */
  getMetrics(): BridgeMetrics {
    return { ...this.metrics };
  }
  /**
   * Get bridge configuration
   */
  getConfig(): InspectorOrchestratorBridgeConfig {
    return { ...this.config };
  }
  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    connectedComponents: {
      inspector: boolean;
      orchestrator: boolean;
    };
    pendingTasks: number;
    pendingAggregations: number;
    deadLetterQueue: number;
    metrics: BridgeMetrics;
  } {
    return {
      isRunning: this.isRunning,
      connectedComponents: {
        inspector: !!this.inspector,
        orchestrator: !!this.orchestrator,
      },
      pendingTasks: this.pendingTasks.size,
      pendingAggregations: this.resultAggregations.size,
      deadLetterQueue: this.deadLetterQueue.length,
      metrics: this.getMetrics(),
    };
  }
  /**
   * Process dead letter queue (retry failed results)
   */
  async processDeadLetterQueue(): Promise<void> {
    if (this.deadLetterQueue.length === 0) {
      return;
    }
    const resultsToRetry = [...this.deadLetterQueue];
    this.deadLetterQueue = [];
    this.metrics.deadLetterQueueSize = 0;
    logger.debug('orchestrator', 'inspector-orchestrator-bridge', `🔄 Retrying ${resultsToRetry.length} results from dead letter queue`);
    try {
      await this.handleInspectorBatch(resultsToRetry);
    } catch (error) {
      console.error('Failed to process dead letter queue:', error);
      // Put results back in queue
      this.deadLetterQueue.push(...resultsToRetry);
      this.metrics.deadLetterQueueSize = this.deadLetterQueue.length;
    }
  }
  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    this.metrics.deadLetterQueueSize = 0;
    return count;
  }
}
