/**
 * ♫ Guidelines Executor
 *
 * Parallel execution system for signal guidelines with 40K token limits
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import {
  Signal,
  GuidelineDefinition,
  GuidelineExecution,
  StepExecution,
  GuidelineContext,
  InspectorAnalysisResult,
  Action,
  Recommendation
} from './types';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('shared');

// Stub implementations for missing functions
async function loadSignalGuideline(_signalType: string): Promise<GuidelineDefinition> {
  // Stub implementation - would load actual guideline based on signal type
  return {
    id: 'default-guideline',
    name: 'Default Guideline',
    description: 'Default guideline for signal processing',
    category: 'development',
    priority: 'medium',
    enabled: true,
    protocol: {
      id: 'default-protocol',
      description: 'Default protocol',
      steps: [],
      decisionPoints: [],
      successCriteria: [],
      fallbackActions: []
    },
    requirements: [],
    prompts: {
      inspector: 'Default inspector prompt',
      orchestrator: 'Default orchestrator prompt'
    },
    tokenLimits: {
      inspector: 40000,
      orchestrator: 20000
    },
    tools: [],
    metadata: {
      version: '1.0.0',
      author: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      tags: [],
      dependencies: []
    }
  };
}

function getSignalPriority(_signalCode: string): number {
  // Stub implementation - would return actual priority based on signal code
  return 5;
}

function getTokenLimits(_signalType: string): { inspector: number; orchestrator: number } {
  // Stub implementation - would return actual token limits based on signal type
  return {
    inspector: 40000,
    orchestrator: 20000
  };
}

export interface ExecutorConfig {
  maxParallelExecutions: number;
  defaultTimeout: number;
  retryAttempts: number;
  enableMetrics: boolean;
  tokenLimits: {
    inspector: number;
    orchestrator: number;
  };
}

export interface ExecutionContext {
  executionId: string;
  signal: Signal;
  guideline: GuidelineDefinition;
  worktree?: string;
  agent?: string;
  startTime: Date;
  timeout: number;
  retryCount: number;
}

export class GuidelinesExecutor extends EventEmitter {
  private config: ExecutorConfig;
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  private executionQueue: ExecutionContext[] = [];
  private executionHistory: GuidelineExecution[] = [];
  private workers: Worker[] = [];
  private isRunning = false;
  private metrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    totalTokenUsage: 0
  };

  constructor(config: Partial<ExecutorConfig> = {}) {
    super();

    this.config = {
      maxParallelExecutions: config.maxParallelExecutions || 3,
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      retryAttempts: config.retryAttempts || 2,
      enableMetrics: config.enableMetrics !== false,
      tokenLimits: {
        inspector: config.tokenLimits?.inspector || 40000,
        orchestrator: config.tokenLimits?.orchestrator || 20000
      }
    };

    this.initializeWorkers();
  }

  /**
   * Initialize worker pool for parallel execution
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxParallelExecutions; i++) {
      const worker = new Worker(__dirname + '/workers/guideline-worker.js');

      worker.on('message', (result) => {
        this.handleWorkerResult(result);
      });

      worker.on('error', (error) => {
        logger.error('GuidelinesExecutor',
          `Worker ${i} error: ${error.message}`, error, { workerId: i });
        this.handleWorkerError(i, error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          logger.error('GuidelinesExecutor',
            `Worker ${i} stopped with exit code ${code}`, undefined, { workerId: i, exitCode: code });
        }
      });

      this.workers.push(worker);
    }
  }

  /**
   * Execute a signal guideline
   */
  async executeSignal(
    signal: Signal,
    worktree?: string,
    agent?: string
  ): Promise<GuidelineExecution> {
    try {
      // Load the appropriate guideline
      const guideline = await loadSignalGuideline(signal.type);

      // Create execution context
      const executionId = this.generateExecutionId();
      const context: ExecutionContext = {
        executionId,
        signal,
        guideline,
        worktree,
        agent,
        startTime: new Date(),
        timeout: this.config.defaultTimeout,
        retryCount: 0
      };

      // Create execution record
      const execution: GuidelineExecution = {
        id: executionId,
        guidelineId: guideline.id,
        triggerSignal: signal,
        status: 'pending',
        startedAt: context.startTime,
        context: this.buildExecutionContext(context) as GuidelineContext,
        steps: [],
        performance: {
          totalDuration: 0,
          tokenUsage: {
            inspector: 0,
            orchestrator: 0,
            total: 0
          },
          stepBreakdown: {}
        }
      };

      // Track execution
      this.activeExecutions.set(executionId, context);
      this.executionHistory.push(execution);

      // Add to queue if at capacity
      if (this.activeExecutions.size >= this.config.maxParallelExecutions) {
        this.executionQueue.push(context);
        logger.debug('GuidelinesExecutor',
          `Execution ${executionId} queued for signal ${signal.type}`, { executionId, signalType: signal.type });
      } else {
        // Execute immediately
        await this.startExecution(context);
      }

      this.emit('execution_started', execution);
      return execution;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorObj = error instanceof Error ? error : new Error(errorMsg);
      logger.error('GuidelinesExecutor',
        `Failed to execute signal ${signal.type}: ${errorMsg}`, errorObj, { signalType: signal.type });

      const failedExecution: GuidelineExecution = {
        id: this.generateExecutionId(),
        guidelineId: 'unknown',
        triggerSignal: signal,
        status: 'failed',
        startedAt: new Date(),
        error: {
          code: 'GUIDELINE_LOAD_ERROR',
          message: errorMsg,
          recoverable: false,
          suggestions: ['Check signal code validity', 'Verify guideline configuration']
        },
        context: {} as GuidelineContext,
        steps: [],
        performance: {
          totalDuration: 0,
          tokenUsage: { inspector: 0, orchestrator: 0, total: 0 },
          stepBreakdown: {}
        }
      };

      this.emit('execution_failed', failedExecution);
      return failedExecution;
    }
  }

  /**
   * Start execution of a guideline
   */
  private async startExecution(context: ExecutionContext): Promise<void> {
    const { executionId } = context;

    // Update execution status
    const execution = this.executionHistory.find(e => e.id === executionId);
    if (execution) {
      execution.status = 'preparing';
    }

    try {
      // Prepare inspector step
      const inspectorStep = await this.executeInspectorStep(context);

      if (execution) {
        execution.steps.push(inspectorStep);
        execution.status = 'inspector_processing';
      }

      // Prepare orchestrator step
      const orchestratorStep = await this.executeOrchestratorStep(context, inspectorStep.result);

      if (execution) {
        execution.steps.push(orchestratorStep);
        execution.status = 'orchestrator_processing';
      }

      // Complete execution
      await this.completeExecution(context, inspectorStep.result as InspectorAnalysisResult, orchestratorStep.result);

    } catch (error) {
      await this.failExecution(context, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute inspector step
   */
  private async executeInspectorStep(context: ExecutionContext): Promise<StepExecution> {
    const stepId = `${context.executionId}-inspector`;
    const step: StepExecution = {
      stepId,
      name: 'Inspector Analysis',
      description: 'Analyze signal and prepare structured payload for orchestrator',
      status: 'in_progress',
      startedAt: new Date(),
      artifacts: [],
      dependencies: [],
      tokenUsage: { input: 0, output: 0, cost: 0 }
    };

    try {
      // Build inspector prompt
      const inspectorPrompt = this.buildInspectorPrompt(context);

      // Execute inspector analysis (simulate LLM call)
      const inspectorResult = await this.executeLLMAnalysis(
        inspectorPrompt,
        context.guideline.tokenLimits.inspector,
        'inspector'
      );

      step.result = inspectorResult;
      step.status = 'completed';
      step.completedAt = new Date();
      step.tokenUsage = {
        input: inspectorPrompt.length / 4, // Rough token estimation
        output: JSON.stringify(inspectorResult).length / 4,
        cost: 0 // Calculate based on model pricing
      };

      this.emit('step_completed', {
        executionId: context.executionId,
        stepId,
        result: inspectorResult
      });

    } catch (error) {
      step.status = 'failed';
      step.completedAt = new Date();
      const errorMsg = error instanceof Error ? error.message : String(error);
      step.error = {
        code: 'INSPECTOR_ERROR',
        message: errorMsg,
        recoverable: true,
        suggestions: ['Retry with adjusted prompt', 'Check signal data validity']
      };

      throw error;
    }

    return step;
  }

  /**
   * Execute orchestrator step
   */
  private async executeOrchestratorStep(
    context: ExecutionContext,
    inspectorResult: unknown
  ): Promise<StepExecution> {
    const stepId = `${context.executionId}-orchestrator`;
    const step: StepExecution = {
      stepId,
      name: 'Orchestrator Processing',
      description: 'Process inspector payload and execute resolution actions',
      status: 'in_progress',
      startedAt: new Date(),
      artifacts: [],
      dependencies: [`${context.executionId}-inspector`],
      tokenUsage: { input: 0, output: 0, cost: 0 }
    };

    try {
      // Build orchestrator prompt
      const orchestratorPrompt = this.buildOrchestratorPrompt(context, inspectorResult);

      // Execute orchestrator processing (simulate LLM call)
      const orchestratorResult = await this.executeLLMAnalysis(
        orchestratorPrompt,
        context.guideline.tokenLimits.orchestrator,
        'orchestrator'
      );

      step.result = orchestratorResult;
      step.status = 'completed';
      step.completedAt = new Date();
      step.tokenUsage = {
        input: orchestratorPrompt.length / 4,
        output: JSON.stringify(orchestratorResult).length / 4,
        cost: 0
      };

      this.emit('step_completed', {
        executionId: context.executionId,
        stepId,
        result: orchestratorResult
      });

    } catch (error) {
      step.status = 'failed';
      step.completedAt = new Date();
      const errorMsg = error instanceof Error ? error.message : String(error);
      step.error = {
        code: 'ORCHESTRATOR_ERROR',
        message: errorMsg,
        recoverable: true,
        suggestions: ['Check inspector output format', 'Verify orchestrator prompt validity']
      };

      throw error;
    }

    return step;
  }

  /**
   * Complete execution successfully
   */
  private async completeExecution(
    context: ExecutionContext,
    _inspectorResult: InspectorAnalysisResult,
    orchestratorResult: unknown
  ): Promise<void> {
    const execution = this.executionHistory.find(e => e.id === context.executionId);
    if (!execution) return;

    const endTime = new Date();
    const duration = endTime.getTime() - context.startTime.getTime();

    execution.status = 'completed';
    execution.completedAt = endTime;
    const orchestratorResultTyped = orchestratorResult as {
      actions?: Action[];
      nextSteps?: string[];
      recommendations?: Recommendation[];
    };

    execution.result = {
      success: true,
      outcome: 'Signal processed successfully',
      signalsGenerated: [],
      actionsTaken: orchestratorResultTyped.actions || [],
      checkpointsReached: [],
      nextSteps: orchestratorResultTyped.nextSteps || [],
      recommendations: orchestratorResultTyped.recommendations || [],
      artifacts: [],
      summary: {
        totalSteps: execution.steps.length,
        completedSteps: execution.steps.length,
        failedSteps: 0,
        skippedSteps: 0,
        totalDuration: duration,
        tokenCost: this.calculateTokenCost(execution.steps)
      }
    };

    execution.performance.totalDuration = duration;
    execution.performance.tokenUsage = this.aggregateTokenUsage(execution.steps) as {
      inspector: number;
      orchestrator: number;
      total: number;
    };
    execution.performance.stepBreakdown = this.buildStepBreakdown(execution.steps);

    // Update metrics
    this.updateMetrics(execution);

    // Clean up
    this.activeExecutions.delete(context.executionId);
    this.processQueue();

    this.emit('execution_completed', execution);
    logger.info('GuidelinesExecutor',
      `Execution ${context.executionId} completed in ${duration}ms`, { executionId: context.executionId, duration });
  }

  /**
   * Handle execution failure
   */
  private async failExecution(context: ExecutionContext, error: Error): Promise<void> {
    const execution = this.executionHistory.find(e => e.id === context.executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.completedAt = new Date();
    execution.error = {
      code: 'EXECUTION_ERROR',
      message: error.message,
      stack: error.stack,
      recoverable: context.retryCount < this.config.retryAttempts,
      suggestions: ['Retry execution', 'Check guideline configuration', 'Verify signal validity']
    };

    // Retry if possible
    if (execution.error.recoverable) {
      context.retryCount++;
      logger.info('GuidelinesExecutor',
        `Retrying execution ${context.executionId}, attempt ${context.retryCount}`, { executionId: context.executionId, retryCount: context.retryCount });

      setTimeout(() => {
        this.startExecution(context);
      }, 1000 * context.retryCount); // Exponential backoff

      return;
    }

    // Clean up
    this.activeExecutions.delete(context.executionId);
    this.processQueue();

    this.emit('execution_failed', execution);
    logger.error('GuidelinesExecutor',
      `Execution ${context.executionId} failed: ${error.message}`, error, { executionId: context.executionId });
  }

  /**
   * Process execution queue
   */
  private processQueue(): void {
    if (this.executionQueue.length === 0) return;
    if (this.activeExecutions.size >= this.config.maxParallelExecutions) return;

    const nextContext = this.executionQueue.shift();
    if (nextContext) {
      this.startExecution(nextContext);
    }
  }

  /**
   * Build execution context
   */
  private buildExecutionContext(context: ExecutionContext) : unknown {
    return {
      guidelineId: context.guideline.id,
      executionId: context.executionId,
      triggerSignal: context.signal,
      worktree: context.worktree,
      agent: context.agent,
      additionalContext: {
        activePRPs: [], // Would be populated from scanner data
        recentActivity: [], // Would be populated from activity log
        tokenStatus: {
          totalUsed: 0,
          totalLimit: 1000000,
          approachingLimit: false,
          criticalLimit: false,
          agentBreakdown: {}
        },
        agentStatus: [], // Would be populated from agent manager
        sharedNotes: [], // Would be populated from notes system
        environment: {
          worktree: context.worktree || process.cwd(),
          branch: 'main',
          availableTools: [],
          systemCapabilities: [],
          constraints: {}
        }
      },
      configuration: {
        enabled: context.guideline.enabled,
        settings: {},
        requiredFeatures: context.guideline.requirements.map(r => r.name),
        tokenLimits: getTokenLimits(context.signal.type),
        customPrompts: {},
        executionSettings: {
          timeout: context.timeout,
          retryAttempts: this.config.retryAttempts,
          parallelExecution: true,
          requireApproval: false
        }
      }
    };
  }

  /**
   * Build inspector prompt
   */
  private buildInspectorPrompt(context: ExecutionContext): string {
    const { guideline, signal } = context;

    let prompt = guideline.prompts.inspector;

    // Replace template variables
    prompt = prompt.replace(/\{\{signal\}\}/g, JSON.stringify(signal, null, 2));
    prompt = prompt.replace(/\{\{worktree\}\}/g, context.worktree || process.cwd());
    prompt = prompt.replace(/\{\{agent\}\}/g, context.agent || 'none');
    prompt = prompt.replace(/\{\{executionId\}\}/g, context.executionId);

    return prompt;
  }

  /**
   * Build orchestrator prompt
   */
  private buildOrchestratorPrompt(context: ExecutionContext, inspectorResult: unknown): string {
    const { guideline, signal } = context;

    let prompt = guideline.prompts.orchestrator;

    // Replace template variables
    prompt = prompt.replace(/\{\{signal\}\}/g, JSON.stringify(signal, null, 2));
    prompt = prompt.replace(/\{\{inspectorResult\}\}/g, JSON.stringify(inspectorResult, null, 2));
    prompt = prompt.replace(/\{\{worktree\}\}/g, context.worktree || process.cwd());
    prompt = prompt.replace(/\{\{agent\}\}/g, context.agent || 'none');
    prompt = prompt.replace(/\{\{executionId\}\}/g, context.executionId);

    return prompt;
  }

  /**
   * Simulate LLM analysis (would be actual LLM call in production)
   */
  private async executeLLMAnalysis(
    prompt: string,
    tokenLimit: number,
    type: 'inspector' | 'orchestrator'
  ): Promise<unknown> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate token limit check
    const estimatedTokens = prompt.length / 4;
    if (estimatedTokens > tokenLimit) {
      throw new Error(`Prompt exceeds token limit: ${estimatedTokens} > ${tokenLimit}`);
    }

    // Return mock structured output based on type
    if (type === 'inspector') {
      return {
        analysis: 'Mock inspector analysis result',
        priority: getSignalPriority('os'),
        recommendations: ['Mock recommendation 1', 'Mock recommendation 2'],
        nextActions: ['Mock action 1', 'Mock action 2'],
        metadata: {
          processedAt: new Date().toISOString(),
          tokenUsage: estimatedTokens,
          confidence: 0.95
        }
      };
    } else {
      return {
        decision: 'Mock orchestrator decision',
        actions: ['Mock action 1', 'Mock action 2'],
        nextSteps: ['Mock next step 1', 'Mock next step 2'],
        tools: ['tool1', 'tool2'],
        metadata: {
          processedAt: new Date().toISOString(),
          tokenUsage: estimatedTokens,
          confidence: 0.90
        }
      };
    }
  }

  /**
   * Worker result handler
   */
  private handleWorkerResult(result: unknown): void {
    // Handle worker results for parallel execution
    logger.debug('GuidelinesExecutor',
      `Received result from worker`, { result });
  }

  /**
   * Worker error handler
   */
  private handleWorkerError(workerId: number, error: Error): void {
    logger.error('GuidelinesExecutor',
      `Worker ${workerId} error: ${error.message}`, error, { workerId });

    // Restart worker on error
    this.workers[workerId]?.terminate();
    const newWorker = new Worker(__dirname + '/workers/guideline-worker.js');
    this.workers[workerId] = newWorker;
  }

  /**
   * Update execution metrics
   */
  private updateMetrics(execution: GuidelineExecution): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalExecutions++;

    if (execution.status === 'completed') {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    // Update average execution time
    const totalTime = this.executionHistory
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.performance?.totalDuration || 0), 0);
    const completedCount = this.executionHistory.filter(e => e.status === 'completed').length;
    this.metrics.averageExecutionTime = completedCount > 0 ? totalTime / completedCount : 0;

    // Update token usage
    this.metrics.totalTokenUsage += execution.performance?.tokenUsage?.total || 0;
  }

  /**
   * Calculate token cost
   */
  private calculateTokenCost(steps: StepExecution[]): number {
    return steps.reduce((total, step) => {
      return total + (step.tokenUsage?.cost || 0);
    }, 0);
  }

  /**
   * Aggregate token usage
   */
  private aggregateTokenUsage(steps: StepExecution[]) : unknown {
    return steps.reduce((usage, step) => {
      if (step.tokenUsage) {
        usage.inspector += step.tokenUsage.input + step.tokenUsage.output;
        usage.orchestrator += step.tokenUsage.input + step.tokenUsage.output;
        usage.total += step.tokenUsage.input + step.tokenUsage.output;
      }
      return usage;
    }, { inspector: 0, orchestrator: 0, total: 0 });
  }

  /**
   * Build step breakdown
   */
  private buildStepBreakdown(steps: StepExecution[]): Record<string, number> {
    return steps.reduce((breakdown: Record<string, number>, step) => {
      if (step.startedAt && step.completedAt) {
        const duration = step.completedAt.getTime() - step.startedAt.getTime();
        breakdown[step.stepId] = duration;
      }
      return breakdown;
    }, {});
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution metrics
   */
  getMetrics() : unknown {
    return {
      ...this.metrics,
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length,
      successRate: this.metrics.totalExecutions > 0
        ? (this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100
        : 0
    };
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): GuidelineExecution | undefined {
    return this.executionHistory.find(e => e.id === executionId);
  }

  /**
   * Get recent executions
   */
  getRecentExecutions(limit: number = 50): GuidelineExecution[] {
    return this.executionHistory
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Start the executor
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('GuidelinesExecutor',
      `Guidelines executor started with ${this.config.maxParallelExecutions} parallel workers`, { maxParallelExecutions: this.config.maxParallelExecutions });

    this.emit('executor_started');
  }

  /**
   * Stop the executor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Wait for active executions to complete or timeout
    const timeout = setTimeout(() => {
      logger.warn('GuidelinesExecutor',
        'Forcing shutdown with active executions remaining', { activeExecutions: this.activeExecutions.size });
    }, 30000);

    while (this.activeExecutions.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    clearTimeout(timeout);

    // Terminate workers
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];

    logger.info('GuidelinesExecutor', 'Guidelines executor stopped');
    this.emit('executor_stopped');
  }
}