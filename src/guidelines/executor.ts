/**
 * ♫ Guidelines Executor
 *
 * Parallel execution system for signal guidelines with 40K token limits
 */

import { EventEmitter } from 'events';
import {
  GuidelineDefinition,
  GuidelineExecution,
  ExecutionStatus,
  StepExecution,
  GuidelineContext,
  StepStatus,
  GuidelineTriggeredEventPayload,
  InspectorAnalysisResult,
  ClassificationResult,
  Issue,
  StepDefinition,
  Action,
  PullRequestReview
} from './types';
import { guidelinesRegistry } from './registry';
import {
  createLayerLogger,
  Signal,
  InspectorPayload,
  TimeUtils,
  HashUtils
} from '../shared';

import { getGitHubClient, storageManager } from '../shared';

const logger = createLayerLogger('shared');

// Forward declarations for external dependencies
interface Inspector extends EventEmitter {
  analyze(payload: InspectorPayload, prompt?: string): Promise<EnhancedInspectorPayload>;
}

interface EnhancedInspectorPayload {
  id: string;
  timestamp: Date;
  sourceSignals: Signal[];
  classification: {
    category: string;
    priority: number;
    severity: string;
  }[];
  recommendations: string[];
  context: {
    summary: string;
    activePRPs: string[];
    blockedItems: string[];
    recentActivity: string[];
    tokenStatus: {
      used: number;
      totalUsed: number;
      totalLimit: number;
      approachingLimit: boolean;
      criticalLimit: boolean;
      agentBreakdown: Record<string, unknown>;
    };
    agentStatus: unknown[];
    sharedNotes: unknown[];
  };
  estimatedTokens: number;
  priority: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  inspectorClassification?: {
    category: string;
    priority: number;
    severity: string;
  };
}

interface Orchestrator extends EventEmitter {
  processPayload(payload: InspectorPayload): Promise<string>;
  makeDecision(context: unknown, prompt: string, tools: string[]): Promise<unknown>;
}

// Extended interface for additional context that allows dynamic properties
interface ExtendedAdditionalContext extends NonNullable<GuidelineContext['additionalContext']> {
  [key: string]: unknown;
  fetchedData?: {
    pr?: {
      id: number;
    };
    files?: unknown[];
    [key: string]: unknown;
  };
  inspectorAnalysis?: InspectorAnalysisResult;
  structuralClassification?: ClassificationResult;
  orchestratorDecision?: unknown;
}

/**
 * Initialize additional context with proper default structure
 */
function initializeAdditionalContext(): ExtendedAdditionalContext {
  return {
    activePRPs: [],
    recentActivity: [],
    tokenStatus: {
      totalUsed: 0,
      totalLimit: 0,
      approachingLimit: false,
      criticalLimit: false,
      agentBreakdown: {}
    },
    agentStatus: [],
    sharedNotes: [],
    environment: {
      worktree: '',
      branch: '',
      availableTools: [],
      systemCapabilities: [],
      constraints: {}
    }
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
  private executions: Map<string, GuidelineExecution> = new Map();
  private inspector: Inspector;
  private orchestrator: Orchestrator;

  constructor(inspector: Inspector, orchestrator: Orchestrator) {
    super();
    this.inspector = inspector;
    this.orchestrator = orchestrator;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to guideline triggers
    guidelinesRegistry.on('guideline_triggered', (event) => {
      this.handleGuidelineTriggered(event);
    });

    // Listen to inspector results
    this.inspector.on('analysis_completed', (event) => {
      this.handleInspectorCompleted(event);
    });

    // Listen to orchestrator decisions
    this.orchestrator.on('decision_made', (event) => {
      this.handleOrchestratorDecision(event);
    });
  }

  /**
   * Handle guideline triggered event
   */
  private async handleGuidelineTriggered(event: GuidelineTriggeredEventPayload): Promise<void> {
    const { guidelineId, executionId, triggerSignal, context } = event;

    logger.info('GuidelinesExecutor', `Executing guideline: ${String(guidelineId)}`, {
      executionId
    });

    try {
      await this.executeGuideline(guidelineId, executionId, triggerSignal, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelinesExecutor', `Error executing guideline: ${String(guidelineId)} - ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      this.handleExecutionError(executionId, error as Error);
    }
  }

  /**
   * Execute a guideline protocol
   */
  async executeGuideline(
    guidelineId: string,
    executionId: string,
    triggerSignal: Signal,
    context: GuidelineContext
  ): Promise<void> {
    const guideline = guidelinesRegistry.getGuideline(guidelineId);
    if (!guideline) {
      throw new Error(`Guideline not found: ${guidelineId}`);
    }

    // Create execution record
    const execution: GuidelineExecution = {
      id: executionId,
      guidelineId,
      triggerSignal,
      status: 'pending',
      startedAt: TimeUtils.now(),
      context: context,
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

    this.executions.set(executionId, execution);
    this.emit('execution_started', { executionId, guidelineId });

    // Execute protocol steps
    await this.executeProtocolSteps(execution, guideline);

    // Complete execution
    await this.completeExecution(execution);
  }

  /**
   * Execute protocol steps
   */
  private async executeProtocolSteps(
    execution: GuidelineExecution,
    guideline: GuidelineDefinition
  ): Promise<void> {
    const steps = guideline.protocol.steps;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      const stepExecution = await this.executeStep(execution, step, i);

      execution.steps.push(stepExecution);

      // Check if step failed
      if (stepExecution.status === 'failed') {
        execution.status = 'failed';
        execution.error = stepExecution.error;
        throw new Error(`Step ${step?.id || 'unknown'} failed: ${stepExecution.error?.message}`);
      }

      // Check for dependencies
      if (stepExecution.status !== 'completed') {
        execution.status = 'pending'; // Changed from 'blocked' which is not a valid ExecutionStatus
        return;
      }
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    execution: GuidelineExecution,
    step: StepDefinition,
    _stepIndex: number // Unused parameter but required by interface
  ): Promise<StepExecution> {
    const stepExecution: StepExecution = {
      stepId: step.id,
      name: step.name,
      description: step.description,
      status: 'pending',
      startedAt: TimeUtils.now(),
      result: null,
      artifacts: [],
      dependencies: []
    };

    execution.status = this.getStepExecutionStatus(stepExecution.status);
    this.emit('step_started', { executionId: execution.id, stepId: step.id });

    try {
      stepExecution.status = 'in_progress';

      // Execute step based on type
      if (step.id.includes('fetch') || step.id.includes('data')) {
        await this.executeDataFetchingStep(execution, step, stepExecution);
      } else if (step.id.includes('inspector') || step.id.includes('analysis')) {
        await this.executeInspectorStep(execution, step, stepExecution);
      } else if (step.id.includes('classification') || step.id.includes('structural')) {
        await this.executeClassificationStep(execution, step, stepExecution);
      } else if (step.id.includes('orchestrator') || step.id.includes('decision')) {
        await this.executeOrchestratorStep(execution, step, stepExecution);
      } else {
        // Default execution
        await this.executeGenericStep(execution, step, stepExecution);
      }

      stepExecution.status = 'completed';
      stepExecution.completedAt = TimeUtils.now();

      // Update performance metrics
      const duration = stepExecution.completedAt.getTime() - stepExecution.startedAt!.getTime();
      execution.performance.stepBreakdown[step.id] = duration;

      this.emit('step_completed', { executionId: execution.id, stepId: step.id, result: stepExecution.result });

    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error = {
        code: 'STEP_EXECUTION_ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack,
        stepId: step.id,
        recoverable: true,
        suggestions: ['Retry step', 'Check dependencies', 'Review step configuration']
      };
      stepExecution.completedAt = TimeUtils.now();

      this.emit('step_failed', { executionId: execution.id, stepId: step.id, error: stepExecution.error });
    }

    return stepExecution;
  }

  /**
   * Execute data fetching step (GitHub API calls)
   */
  private async executeDataFetchingStep(
    execution: GuidelineExecution,
    step: StepDefinition,
    stepExecution: StepExecution
  ): Promise<void> {
    logger.debug('GuidelinesExecutor', `Fetching data for step ${step.id}`);

    const gitHubClient = getGitHubClient();

    // Extract PR number from context or signal
    const prNumber = this.extractPRNumber(execution.context, execution.triggerSignal);
    if (!prNumber) {
      throw new Error('PR number not found in context or signal');
    }

    // Fetch Pull Request data based on guideline type
    let prData: unknown;

    switch (execution.guidelineId) {
      case 'pull-request-analysis':
        prData = await gitHubClient.analyzePR(prNumber);
        break;
      case 'security-review': {
        // Fetch security-focused data
        const [pr, ci, files] = await Promise.all([
          gitHubClient.getPR(prNumber),
          gitHubClient.getCIStatus(prNumber),
          gitHubClient.getFiles(prNumber)
        ]);
        prData = { pr, ci, files };
        break;
      }
      case 'pull-request-performance-analysis': {
        // Fetch performance-focused data
        const [perfPr, perfFiles] = await Promise.all([
          gitHubClient.getPR(prNumber),
          gitHubClient.getFiles(prNumber)
        ]);
        prData = { pr: perfPr, files: perfFiles };
        break;
      }
      default:
        prData = await gitHubClient.getPR(prNumber);
    }

    // Store result in execution context
    stepExecution.result = {
      type: 'github_data',
      data: prData,
      prNumber,
      fetchedAt: TimeUtils.now()
    };

    // Add artifact
    stepExecution.artifacts.push({
      id: HashUtils.generateId(),
      name: `PR Data for ${prNumber}`,
      type: 'data',
      content: prData,
      metadata: {
        source: 'github_api',
        prNumber,
        guidelineId: execution.guidelineId
      },
      createdAt: TimeUtils.now()
    });

    // Update context with fetched data
    if (!execution.context.additionalContext) {
      execution.context.additionalContext = initializeAdditionalContext();
    }
    const dataContext = execution.context.additionalContext as ExtendedAdditionalContext;
    dataContext.fetchedData = prData as {
      pr?: { id: number };
      files?: unknown[];
      [key: string]: unknown;
    };
  }

  /**
   * Execute Inspector step
   */
  private async executeInspectorStep(
    execution: GuidelineExecution,
    step: StepDefinition,
    stepExecution: StepExecution
  ): Promise<void> {
    logger.debug('GuidelinesExecutor', `Executing Inspector analysis for step ${step.id}`);

    const guideline = guidelinesRegistry.getGuideline(execution.guidelineId);
    if (!guideline) {
      throw new Error(`Guideline not found: ${execution.guidelineId}`);
    }

    // Prepare Inspector payload
    const payload: InspectorPayload = {
      id: HashUtils.generateId(),
      timestamp: TimeUtils.now(),
      sourceSignals: [execution.triggerSignal],
      classification: [],
      recommendations: [],
      context: {
        summary: `Guideline execution for ${execution.guidelineId}`,
        activePRPs: [],
        blockedItems: [],
        recentActivity: [],
        tokenStatus: {
          used: 0,
          totalUsed: 0,
          totalLimit: 100000,
          approachingLimit: false,
          criticalLimit: false,
          agentBreakdown: {}
        },
        agentStatus: [],
        sharedNotes: []
      },
      estimatedTokens: 1000,
      priority: guideline.priority === 'critical' ? 1 : 5
    };

    // Get Inspector prompt for this guideline
    const inspectorPrompt = this.getInspectorPrompt(guideline, step, execution.context);

    // Execute Inspector analysis
    const analysisResult = await this.inspector.analyze(payload, inspectorPrompt);

    // Store result
    stepExecution.result = {
      type: 'inspector_analysis',
      data: analysisResult,
      analysisType: step.id,
      completedAt: TimeUtils.now()
    };

    // Add artifacts
    stepExecution.artifacts.push({
      id: HashUtils.generateId(),
      name: `Inspector Analysis: ${step.name}`,
      type: 'data',
      content: analysisResult,
      metadata: {
        analysisType: step.id,
        guidelineId: execution.guidelineId,
        inspectorModel: 'gpt-5-mini'
      },
      createdAt: TimeUtils.now()
    });

    // Update token usage
    if (analysisResult.tokenUsage) {
      execution.performance.tokenUsage.inspector += analysisResult.tokenUsage.total;
    }

    // Store analysis in context for next steps
    if (!execution.context.additionalContext) {
      execution.context.additionalContext = initializeAdditionalContext();
    }
    const analysisContext = execution.context.additionalContext as ExtendedAdditionalContext;
    // Create a mock InspectorAnalysisResult from the EnhancedInspectorPayload
    const mockAnalysisResult: InspectorAnalysisResult = {
      classification: analysisResult.inspectorClassification || {
        category: 'general',
        priority: 5,
        severity: 'medium'
      },
      issues: analysisResult.recommendations ? [{
        type: 'recommendation',
        description: analysisResult.recommendations.join(', '),
        impact: 'medium'
      }] : [],
      recommendations: analysisResult.recommendations || []
    };
    analysisContext.inspectorAnalysis = mockAnalysisResult;
  }

  /**
   * Execute Classification step
   */
  private async executeClassificationStep(
    execution: GuidelineExecution,
    step: StepDefinition,
    stepExecution: StepExecution
  ): Promise<void> {
    logger.debug('GuidelinesExecutor', `Executing classification for step ${step.id}`);

    const additionalContext = execution.context.additionalContext as ExtendedAdditionalContext;
    const inspectorAnalysis = additionalContext?.inspectorAnalysis;
    if (!inspectorAnalysis) {
      throw new Error('Inspector analysis not found in context');
    }

    // Perform structural classification
    const classification = this.performStructuralClassification(inspectorAnalysis, execution.guidelineId);

    // Store result
    stepExecution.result = {
      type: 'structural_classification',
      data: classification,
      classificationType: step.id,
      completedAt: TimeUtils.now()
    };

    // Add artifacts
    stepExecution.artifacts.push({
      id: HashUtils.generateId(),
      name: `Classification: ${step.name}`,
      type: 'data',
      content: classification,
      metadata: {
        classificationType: step.id,
        guidelineId: execution.guidelineId
      },
      createdAt: TimeUtils.now()
    });

    // Store classification in context
    if (!execution.context.additionalContext) {
      execution.context.additionalContext = initializeAdditionalContext();
    }
    const context = execution.context.additionalContext as ExtendedAdditionalContext;
    context.structuralClassification = classification;
  }

  /**
   * Execute Orchestrator step
   */
  private async executeOrchestratorStep(
    execution: GuidelineExecution,
    step: StepDefinition,
    stepExecution: StepExecution
  ): Promise<void> {
    logger.debug('GuidelinesExecutor', `Executing Orchestrator decision for step ${step.id}`);

    const guideline = guidelinesRegistry.getGuideline(execution.guidelineId);
    if (!guideline) {
      throw new Error(`Guideline not found: ${execution.guidelineId}`);
    }

    // Prepare decision context
    const additionalContext = execution.context.additionalContext as ExtendedAdditionalContext;
    const decisionData = {
      execution,
      guideline,
      step,
      inspectorAnalysis: additionalContext?.inspectorAnalysis,
      classification: additionalContext?.structuralClassification,
      prData: additionalContext?.fetchedData
    };

    // Get Orchestrator prompt
    const orchestratorPrompt = this.getOrchestratorPrompt(guideline, step, execution.context);

    // Execute Orchestrator decision
    const decision = await this.orchestrator.makeDecision(
      decisionData,
      orchestratorPrompt,
      guideline.tools
    ) as {
      action?: string;
      reasoning?: string;
      confidence?: number;
      tokenUsage?: {
        total: number;
        input: number;
        output: number;
      };
    };

    // Execute action if specified
    let actionResult = null;
    if (decision.action) {
      actionResult = await this.executeAction(decision.action as unknown as Action, execution.context);
    }

    // Store result
    stepExecution.result = {
      type: 'orchestrator_decision',
      data: decision,
      actionResult,
      decisionType: step.id,
      completedAt: TimeUtils.now()
    };

    // Add artifacts
    stepExecution.artifacts.push({
      id: HashUtils.generateId(),
      name: `Orchestrator Decision: ${step.name}`,
      type: 'data',
      content: decision,
      metadata: {
        decisionType: step.id,
        guidelineId: execution.guidelineId,
        orchestratorModel: 'gpt-5'
      },
      createdAt: TimeUtils.now()
    });

    // Update token usage
    if (decision.tokenUsage) {
      execution.performance.tokenUsage.orchestrator += decision.tokenUsage.total;
    }

    // Store decision in context
    if (!execution.context.additionalContext) {
      execution.context.additionalContext = initializeAdditionalContext();
    }
    const decisionContext = execution.context.additionalContext as ExtendedAdditionalContext;
    decisionContext.orchestratorDecision = decision;
  }

  /**
   * Execute generic step
   */
  private async executeGenericStep(
    _execution: GuidelineExecution,
    step: StepDefinition,
    stepExecution: StepExecution
  ): Promise<void> {
    logger.debug('GuidelinesExecutor', `Executing generic step ${step.id}`);

    // For generic steps, just mark as completed
    stepExecution.result = {
      type: 'generic_step',
      data: { stepId: step.id, completed: true },
      completedAt: TimeUtils.now()
    };
  }

  /**
   * Perform structural classification
   */
  private performStructuralClassification(inspectorAnalysis: InspectorAnalysisResult, _guidelineId: string): ClassificationResult {
    const classification: ClassificationResult = {
      category: 'structural',
      priority: 5,
      severity: 'medium',
      confidence: 0.7,
      priorityIssues: [],
      riskAssessment: {},
      nextActions: [],
      overallPriority: 'medium'
    };

    // Extract and classify issues from inspector analysis
    if (inspectorAnalysis.implementation_analysis) {
      // Create issues from implementation analysis
      const issues: Issue[] = [
        {
          id: 'code-quality',
          type: 'quality',
          severity: (inspectorAnalysis.implementation_analysis?.['code_quality'] ?? 0) < 0.7 ? 'high' : 'medium',
          description: `Code quality score: ${inspectorAnalysis.implementation_analysis?.['code_quality'] ?? 0}`,
          impact: 'High',
          suggested_fix: 'Improve code quality through refactoring and testing'
        },
        {
          id: 'test-coverage',
          type: 'testing',
          severity: (inspectorAnalysis.implementation_analysis?.['test_coverage'] ?? 0) < 0.8 ? 'high' : 'medium',
          description: `Test coverage: ${inspectorAnalysis.implementation_analysis?.['test_coverage'] ?? 0}`,
          impact: 'Medium',
          suggested_fix: 'Increase test coverage to meet quality standards'
        }
      ];

      classification.priorityIssues = issues;
    }

    // Assess overall risk
    if (inspectorAnalysis.implementation_analysis?.['security_considerations']) {
      classification.riskAssessment['security'] = 'high';
    } else if (inspectorAnalysis.implementation_analysis?.['performance_impact']) {
      classification.riskAssessment['performance'] = 'medium';
    } else {
      classification.riskAssessment['general'] = 'low';
    }

    // Determine next actions
    classification.nextActions = this.generateNextActions(classification.priorityIssues, classification.riskAssessment);

    // Calculate overall priority
    classification.overallPriority = this.calculateOverallPriority(classification);

    return classification;
  }

  
  /**
   * Generate next actions
   */
  private generateNextActions(priorityIssues: Issue[], riskAssessment: Record<string, unknown>): string[] {
    const actions: string[] = [];

    // Actions for critical issues
    const criticalIssues = priorityIssues.filter((issue: Issue) => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      actions.push(`Address ${criticalIssues.length} critical issues before merge`);
    }

    // Actions for high issues
    const highIssues = priorityIssues.filter((issue: Issue) => issue.severity === 'high');
    if (highIssues.length > 0) {
      actions.push(`Resolve ${highIssues.length} high-priority issues`);
    }

    // Risk-based actions
    if (riskAssessment['security'] === 'high') {
      actions.push('Conduct security review and fix vulnerabilities');
    }

    if (riskAssessment['performance'] === 'high') {
      actions.push('Optimize performance bottlenecks');
    }

    // Default actions
    if (actions.length === 0) {
      actions.push('Review and address any remaining issues');
    }

    return actions;
  }

  /**
   * Calculate overall priority
   */
  private calculateOverallPriority(classification: ClassificationResult): string {
    const criticalCount = classification.priorityIssues.filter((issue: Issue) => issue.severity === 'critical').length;
    const highCount = classification.priorityIssues.filter((issue: Issue) => issue.severity === 'high').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 0) return 'high';
    if (classification.riskAssessment['security'] === 'high') return 'high';
    if (classification.priorityIssues.length > 0) return 'medium';
    return 'low';
  }

  /**
   * Execute action (GitHub API calls, etc.)
   */
  private async executeAction(action: Action, _context: GuidelineContext): Promise<unknown> {
    logger.info('GuidelinesExecutor', `Executing action: ${action.type}`);

    switch (action.type) {
      case 'approve-pr':
        if (action.prNumber && action.message) {
          return await this.approvePR(action.prNumber, action.message);
        }
        break;
      case 'request-changes':
        if (action.prNumber && action.message && action.issues) {
          const issues: Issue[] = action.issues.map((issue: string, index: number) => ({
            id: `issue-${index}`,
            type: 'general',
            description: issue,
            impact: 'Medium',
            severity: 'medium' as const
          }));
          return await this.requestChanges(action.prNumber, action.message, issues);
        }
        break;
      case 'add-comments':
        if (action.prNumber && action.comments) {
          const stringComments = action.comments.map(comment => comment.body);
          return await this.addComments(action.prNumber, stringComments);
        }
        break;
      case 'create-review':
        if (action.prNumber && action.review) {
          // Convert PullRequestReview to the expected format
          const reviewData = {
            body: action.review.body,
            event: action.review.state === 'APPROVED' ? 'APPROVE' as const :
                  action.review.state === 'CHANGES_REQUESTED' ? 'REQUEST_CHANGES' as const :
                  'COMMENT' as const,
            comments: [] // Could be populated from review comments if needed
          };
          return await this.createReview(action.prNumber, reviewData);
        }
        break;
      case 'escalate':
        if (action.prNumber && action.reason) {
          return await this.escalateReview(action.prNumber, action.reason);
        }
        break;
      default:
        logger.warn('GuidelinesExecutor', `Unknown action type: ${action.type}`);
        return { success: false, message: 'Unknown action type' };
    }
    return { success: false, message: 'Missing required parameters' };
  }

  /**
   * Approve PR
   */
  private async approvePR(prNumber: number, message: string): Promise<unknown> {
    const gitHubClient = getGitHubClient();
    return await gitHubClient.createReview(prNumber, {
      body: message,
      event: 'APPROVE'
    });
  }

  /**
   * Request changes
   */
  private async requestChanges(prNumber: number, message: string, issues: Issue[]): Promise<unknown> {
    const gitHubClient = getGitHubClient();

    // Format issues as review comments
    const reviewComments = issues
      .filter((issue: Issue) => issue.file && issue.line_number)
      .map((issue: Issue) => ({
        path: issue.file!,
        line: issue.line_number!,
        body: `${issue.description}\n\n**Suggested Fix:** ${issue.suggested_fix || 'No suggested fix provided'}`
      }));

    return await gitHubClient.createReview(prNumber, {
      body: message,
      event: 'REQUEST_CHANGES' as const,
      comments: reviewComments
    });
  }

  /**
   * Add comments
   */
  private async addComments(prNumber: number, comments: string[]): Promise<unknown> {
    const gitHubClient = getGitHubClient();
    const results = [];

    for (const comment of comments) {
      const result = await gitHubClient.postComment(prNumber, comment);
      results.push(result);
    }

    return results;
  }

  /**
   * Create review
   */
  private async createReview(prNumber: number, review: { body: string; event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' | 'PENDING'; comments?: { path: string; line: number; body: string; }[] }): Promise<unknown> {
    const gitHubClient = getGitHubClient();
    return await gitHubClient.createReview(prNumber, review);
  }

  /**
   * Escalate review
   */
  private async escalateReview(prNumber: number, reason: string): Promise<unknown> {
    const gitHubClient = getGitHubClient();
    const message = `🚨 ESCALATION REQUIRED 🚨\n\n${reason}\n\nThis PR requires human review and decision.`;
    return await gitHubClient.postComment(prNumber, message);
  }

  /**
   * Get Inspector prompt for guideline
   */
  private getInspectorPrompt(guideline: GuidelineDefinition, step: StepDefinition, context: GuidelineContext): string {
    // Replace template variables in prompt
    let prompt = guideline.prompts.inspector;

    // Replace common variables
    prompt = prompt.replace(/{{context}}/g, JSON.stringify(context, null, 2));
    prompt = prompt.replace(/{{stepId}}/g, step.id);
    prompt = prompt.replace(/{{guidelineId}}/g, guideline.id);

    // Add data from context
    const additionalContext = context.additionalContext as ExtendedAdditionalContext;
    if (additionalContext?.fetchedData) {
      prompt = prompt.replace(/{{prData}}/g, JSON.stringify(additionalContext.fetchedData, null, 2));
      prompt = prompt.replace(/{{filesChanged}}/g, JSON.stringify(additionalContext.fetchedData.files || [], null, 2));
    }

    return prompt;
  }

  /**
   * Get Orchestrator prompt for guideline
   */
  private getOrchestratorPrompt(guideline: GuidelineDefinition, step: StepDefinition, context: GuidelineContext): string {
    // Replace template variables in prompt
    let prompt = guideline.prompts.orchestrator;

    // Replace common variables
    prompt = prompt.replace(/{{context}}/g, JSON.stringify(context, null, 2));
    prompt = prompt.replace(/{{stepId}}/g, step.id);
    prompt = prompt.replace(/{{guidelineId}}/g, guideline.id);

    // Add analysis results
    const additionalContext = context.additionalContext as ExtendedAdditionalContext;
    if (additionalContext?.inspectorAnalysis) {
      prompt = prompt.replace(/{{inspectorAnalysis}}/g, JSON.stringify(additionalContext.inspectorAnalysis, null, 2));
    }

    if (additionalContext?.structuralClassification) {
      prompt = prompt.replace(/{{classification}}/g, JSON.stringify(additionalContext.structuralClassification, null, 2));
    }

    return prompt;
  }

  /**
   * Extract PR number from context or signal
   */
  private extractPRNumber(context: GuidelineContext, signal: Signal): number | null {
    // Try to get from context first
    const additionalContext = context.additionalContext as ExtendedAdditionalContext;
    if (additionalContext?.fetchedData?.pr?.id) {
      return additionalContext.fetchedData.pr.id;
    }

    // Try to extract from signal data
    if (signal.data?.['prNumber']) {
      return signal.data['prNumber'] as number;
    }

    if (signal.data?.['prUrl']) {
      // Extract from URL
      const prUrl = signal.data['prUrl'] as string;
      const match = prUrl.match(/\/pull\/(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  /**
   * Get step execution status
   */
  private getStepExecutionStatus(stepStatus: StepStatus): ExecutionStatus {
    switch (stepStatus) {
      case 'pending': return 'pending';
      case 'in_progress': return 'in_progress';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'blocked': return 'failed';
      default: return 'pending';
    }
  }

  /**
   * Handle Inspector completion
   */
  private handleInspectorCompleted(_event: unknown): void {
    // This will be handled by the step execution logic
    logger.debug('GuidelinesExecutor', 'Inspector analysis completed');
  }

  /**
   * Handle Orchestrator decision
   */
  private handleOrchestratorDecision(_event: unknown): void {
    // This will be handled by the step execution logic
    logger.debug('GuidelinesExecutor', 'Orchestrator decision made');
  }

  /**
   * Handle execution error
   */
  private handleExecutionError(executionId: string, error: Error): void {
    const execRecord = this.executions.get(executionId);
    if (execRecord) {
      execRecord.status = 'failed';
      execRecord.error = {
        code: 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
        recoverable: false,
        suggestions: ['Retry execution', 'Check guideline configuration', 'Verify dependencies']
      };

      this.emit('execution_failed', { executionId, error: execRecord.error });
    }
  }

  /**
   * Complete execution
   */
  private async completeExecution(execution: GuidelineExecution): Promise<void> {
    execution.status = 'completed';
    execution.completedAt = TimeUtils.now();

    // Calculate total duration
    execution.performance.totalDuration = execution.completedAt.getTime() - execution.startedAt.getTime();

    // Calculate total token usage
    execution.performance.tokenUsage.total =
      execution.performance.tokenUsage.inspector + execution.performance.tokenUsage.orchestrator;

    // Create result
    execution.result = {
      success: true,
      outcome: 'Guideline executed successfully',
      signalsGenerated: [], // Could be populated by actions
      actionsTaken: [], // Could be populated by actions
      checkpointsReached: [],
      nextSteps: [],
      recommendations: [],
      artifacts: execution.steps.flatMap(step => step.artifacts),
      summary: {
        totalSteps: execution.steps.length,
        completedSteps: execution.steps.filter(step => step.status === 'completed').length,
        failedSteps: execution.steps.filter(step => step.status === 'failed').length,
        skippedSteps: execution.steps.filter(step => step.status === 'skipped').length,
        totalDuration: execution.performance.totalDuration,
        tokenCost: execution.performance.tokenUsage.total
      }
    };

    // Save execution record
    await this.saveExecution(execution);

    this.emit('execution_completed', { executionId: execution.id, result: execution.result });
  }

  /**
   * Save execution record
   */
  private async saveExecution(execution: GuidelineExecution): Promise<void> {
    try {
      await storageManager.saveData(`executions/${execution.id}.json`, execution);
      logger.debug('GuidelinesExecutor', `Execution ${execution.id} saved`);
    } catch (error) {
      logger.error('GuidelinesExecutor', 'Failed to save execution', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get execution
   */
  getExecution(executionId: string): GuidelineExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions
   */
  getAllExecutions(): GuidelineExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Get executions by status
   */
  getExecutionsByStatus(status: ExecutionStatus): GuidelineExecution[] {
    return this.getAllExecutions().filter(execution => execution.status === status);
  }
}

export default GuidelinesExecutor;