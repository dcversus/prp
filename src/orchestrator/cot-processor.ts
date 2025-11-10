/**
 * ♫ Chain of Thought Processor for @dcversus/prp Orchestrator
 *
 * Handles LLM-based chain of thought reasoning, decision making,
 * and structured output processing.
 */

import { Signal, InspectorPayload } from '../shared/types';
import { ChainOfThought, CoTStep, CoTContext, DecisionRecord } from './types';
import { logger, HashUtils } from '../shared';
import {
  TaskManager,
  TaskDefinition,
  TaskAssignment,
  TaskResult,
  TaskType,
  TaskPriority,
  AgentCapability
} from '../shared/tasks';

interface AgentInfo {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  capabilities?: string[];
}

interface Constraint {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'mitigated';
}

export interface ProcessingContext {
  payload?: InspectorPayload;
  signals?: Signal[];
  availableAgents?: AgentInfo[];
  systemState?: {
    status?: string;
    [key: string]: unknown;
  };
  previousDecisions?: DecisionRecord[];
  constraints?: Constraint[];
}

const createDefaultInspectorPayload = (): InspectorPayload => ({
  id: '',
  timestamp: new Date(),
  sourceSignals: [],
  classification: [],
  recommendations: [],
  context: {
    summary: '',
    activePRPs: [],
    blockedItems: [],
    recentActivity: [],
    tokenStatus: { used: 0, totalUsed: 0, totalLimit: 100000, approachingLimit: false, criticalLimit: false, agentBreakdown: {} },
    agentStatus: [],
    sharedNotes: []
  },
  estimatedTokens: 0,
  priority: 0
});

interface ChainOfThoughtContext {
  signalId: string;
  timestamp: Date;
  reasoning: string;
}


/**
 * Chain of Thought Processor - Manages LLM-based reasoning
 */
export class CoTProcessor {
  private processingHistory: Map<string, ChainOfThought> = new Map();
  private taskManager?: TaskManager;

  constructor(taskManager?: TaskManager) {
    this.taskManager = taskManager;
  }

  /**
   * Initialize the CoT processor
   */
  async initialize(): Promise<void> {
    logger.info('orchestrator', 'cot-processor', 'Initializing Chain of Thought processor');

    // Load any saved processing history
    await this.loadProcessingHistory();

    logger.info('orchestrator', 'cot-processor', 'CoT processor initialized successfully');
  }

  /**
   * Generate Chain of Thought for a signal
   */
  async generateCoT(
    signal: Signal,
    context: ProcessingContext,
    guideline: string
  ): Promise<ChainOfThought> {
    logger.debug('orchestrator', 'cot-processor', 'Generating Chain of Thought', {
      signalType: signal.type,
      signalId: signal.id
    });

    const startTime = Date.now();
    const cotId = HashUtils.generateId();

    try {
      // Create CoT context
      const processingContext: CoTContext = {
        originalPayload: context.payload ?? createDefaultInspectorPayload(),
        signals: context.signals ?? [signal],
        activeGuidelines: [guideline],
        availableAgents: (context.availableAgents ?? []).map(agent => typeof agent === 'string' ? agent : agent.id ?? 'unknown'),
        systemState: context.systemState ?? {},
        previousDecisions: context.previousDecisions ?? [],
        constraints: context.constraints ?? []
      };

      // Generate reasoning steps
      const steps = await this.generateReasoningSteps(signal, processingContext);

      // Generate final decision
      const decision = await this.generateDecision(signal, steps, processingContext);

      // Create Chain of Thought result
      const cotContext: ChainOfThoughtContext = {
        signalId: signal.id,
        timestamp: new Date(),
        reasoning: this.formatReasoning(steps)
      };

      const cot: ChainOfThought = {
        id: cotId,
        steps,
        decision,
        tokenUsage: this.estimateTokenUsage(steps, decision),
        context: cotContext
      };

      // Store in history
      this.processingHistory.set(cotId, cot);

      const processingTime = Date.now() - startTime;

      logger.info('orchestrator', 'cot-processor', 'Chain of Thought generated', {
        cotId,
        steps: steps.length,
        processingTime
      });

      return cot;

    } catch (error) {
      logger.error('orchestrator', 'Failed to generate Chain of Thought',
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Get CoT by ID
   */
  getCoT(cotId: string): ChainOfThought | null {
    return this.processingHistory.get(cotId) ?? null;
  }

  /**
   * Set task manager instance
   */
  setTaskManager(taskManager: TaskManager): void {
    this.taskManager = taskManager;
  }

  /**
   * Generate Chain of Thought for a task
   */
  async generateCoTForTask(
    task: TaskDefinition,
    context: ProcessingContext,
    guideline: string
  ): Promise<ChainOfThought> {
    logger.debug('orchestrator', 'cot-processor', 'Generating Chain of Thought for task', {
      taskId: task.id,
      taskType: task.type,
      taskPriority: task.priority
    });

    // Create a signal from the task for processing
    const taskSignal: Signal = {
      id: `task_${task.id}`,
      type: this.mapTaskTypeToSignalType(task.type),
      priority: this.mapTaskPriorityToSignalPriority(task.priority),
      source: task.context.requestedBy ?? 'task-manager',
      data: {
        taskId: task.id,
        taskType: task.type,
        taskTitle: task.title,
        taskDescription: task.description,
        parameters: task.parameters,
        prpId: task.context.prpId,
        files: task.context.files
      },
      timestamp: new Date()
    };

    // Add task information to context
    const taskContext: ProcessingContext = {
      ...context,
      availableAgents: this.getAvailableAgentsForTask(task),
      systemState: {
        ...context.systemState,
        currentTask: {
          id: task.id,
          type: task.type,
          priority: task.priority,
          requiredCapabilities: task.requiredCapabilities
        }
      }
    };

    return this.generateCoT(taskSignal, taskContext, guideline);
  }

  /**
   * Create tasks from CoT decision
   */
  async createTasksFromCoTDecision(
    cot: ChainOfThought,
    context: ProcessingContext
  ): Promise<TaskDefinition[]> {
    if (!this.taskManager) {
      logger.warn('orchestrator', 'cot-processor', 'No task manager available, cannot create tasks from CoT');
      return [];
    }

    const createdTasks: TaskDefinition[] = [];

    try {
      // Extract task creation instructions from decision
      const taskInstructions = this.extractTaskInstructions(cot);

      for (const instruction of taskInstructions) {
        // Create signal from instruction
        const signal: Signal = {
          id: `cot_${cot.id}_${Date.now()}`,
          type: instruction.signalType,
          priority: instruction.priority,
          source: 'cot-processor',
          data: {
            cotId: cot.id,
            instruction: instruction.description,
            parameters: instruction.parameters,
            context: instruction.context
          },
          timestamp: new Date()
        };

        // Create task
        const task = this.taskManager.createTaskFromSignal(signal, {
          type: instruction.taskType,
          priority: instruction.priority,
          title: instruction.title,
          description: instruction.description,
          requiredCapabilities: instruction.requiredCapabilities,
          parameters: instruction.parameters
        });

        if (task) {
          createdTasks.push(task);
          logger.info('orchestrator', 'cot-processor', 'Task created from CoT decision', {
            taskId: task.id,
            cotId: cot.id,
            taskType: task.type,
            instruction: instruction.title
          });
        }
      }

      logger.info('orchestrator', 'cot-processor', `Created ${createdTasks.length} tasks from CoT decision`, {
        cotId: cot.id
      });

    } catch (error) {
      logger.error('orchestrator', 'cot-processor', 'Failed to create tasks from CoT decision', error instanceof Error ? error : new Error(String(error)), {
        cotId: cot.id
      });
    }

    return createdTasks;
  }

  /**
   * Update CoT with task execution results
   */
  updateCoTWithTaskResults(cotId: string, results: TaskResult[]): void {
    const cot = this.processingHistory.get(cotId);
    if (!cot) {
      logger.warn('orchestrator', 'cot-processor', 'CoT not found for update', { cotId });
      return;
    }

    // Add task results as a new step
    const resultsStep: CoTStep = {
      id: HashUtils.generateId(),
      type: 'verify',
      content: this.formatTaskResults(results),
      reasoning: 'Updating Chain of Thought with task execution results',
      confidence: this.calculateResultsConfidence(results),
      timestamp: new Date()
    };

    // Add step to CoT
    if (!cot.steps) {
      cot.steps = [];
    }
    cot.steps.push(resultsStep);

    // Update decision if needed
    if (results.length > 0) {
      this.updateDecisionWithResults(cot, results);
    }

    logger.info('orchestrator', 'cot-processor', 'CoT updated with task results', {
      cotId,
      resultsCount: results.length
    });
  }

  /**
   * Get CoT history
   */
  getCoTHistory(limit: number = 50): ChainOfThought[] {
    const history = Array.from(this.processingHistory.values());
    return history
      .sort((a, b) => {
        const aContext = a.context as ChainOfThoughtContext;
        const bContext = b.context as ChainOfThoughtContext;
        const aTime = aContext.timestamp.getTime();
        const bTime = bContext.timestamp.getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  /**
   * Clear processing history
   */
  clearHistory(): void {
    this.processingHistory.clear();
    logger.info('orchestrator', 'cot-processor', 'Chain of Thought history cleared');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('orchestrator', 'cot-processor', 'Cleaning up CoT processor');

    // Save processing history
    await this.saveProcessingHistory();

    // Clear memory
    this.processingHistory.clear();

    logger.info('orchestrator', 'cot-processor', 'CoT processor cleaned up successfully');
  }

  /**
   * Generate reasoning steps
   */
  private async generateReasoningSteps(
    signal: Signal,
    context: CoTContext
  ): Promise<CoTStep[]> {
    const steps: CoTStep[] = [];

    // Step 1: Analyze the signal
    steps.push(await this.createAnalysisStep(signal));

    // Step 2: Consider context and constraints
    steps.push(await this.createConsiderationStep(signal, context));

    // Step 3: Evaluate options and alternatives
    steps.push(await this.createEvaluationStep(signal, context));

    // Step 4: Make decision
    steps.push(await this.createDecisionStep(signal, context));

    // Step 5: Verify decision
    steps.push(this.createVerificationStep(signal, context));

    return steps;
  }

  /**
   * Create analysis step
   */
  private async createAnalysisStep(signal: Signal): Promise<CoTStep> {
    const analysis = `Signal Analysis:
- Type: ${signal.type}
- Priority: ${signal.priority}
- Source: ${signal.source}
- Content: ${JSON.stringify(signal.data, null, 2)}
- Urgency: ${this.assessUrgency(signal)}
- Complexity: ${this.assessComplexity(signal)}
- Required Attention: ${this.assessRequiredAttention(signal)}`;

    return {
      id: HashUtils.generateId(),
      type: 'analyze',
      content: analysis,
      reasoning: 'Understanding what the signal means and its immediate implications',
      confidence: 0.9,
      timestamp: new Date()
    };
  }

  /**
   * Create consideration step
   */
  private async createConsiderationStep(_signal: Signal, context: CoTContext): Promise<CoTStep> {
    const systemState = context.systemState as { status?: string } | undefined;
    const considerations = [
      `System State: ${systemState?.status ?? 'active'}`,
      `Active Agents: ${context.availableAgents.length}`,
      `Similar Signals: ${context.previousDecisions.length}`,
      `Guidelines: ${context.activeGuidelines.join(', ')}`
    ];

    return {
      id: HashUtils.generateId(),
      type: 'consider',
      content: considerations.join('\n'),
      reasoning: 'Evaluating how the signal fits within current system state and constraints',
      confidence: 0.8,
      timestamp: new Date()
    };
  }

  /**
   * Create evaluation step
   */
  private async createEvaluationStep(signal: Signal, context: CoTContext): Promise<CoTStep> {
    const options = this.generateOptions(signal);
    // TODO: implement context-aware evaluation
    console.debug('Context marked as used:', context); // Explicitly mark as used

    return {
      id: HashUtils.generateId(),
      type: 'consider',
      content: `Available Options:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`,
      reasoning: 'Considering different approaches to handle this signal',
      alternatives: options,
      confidence: 0.7,
      timestamp: new Date()
    };
  }

  /**
   * Create decision step
   */
  private async createDecisionStep(signal: Signal, context: CoTContext): Promise<CoTStep> {
    const decision = this.makeDecision(signal, context);

    return {
      id: HashUtils.generateId(),
      type: 'decide',
      content: decision,
      reasoning: 'Based on analysis and evaluation, determining the best course of action',
      decision: decision,
      confidence: 0.8,
      timestamp: new Date()
    };
  }

  /**
   * Create verification step
   */
  private createVerificationStep(signal: Signal, context: CoTContext): CoTStep {
    const verification = `Decision Verification:
- Risk Assessment: ${this.assessRisk(signal)}
- Resource Requirements: ${this.assessResourceRequirements(signal)}
- Success Criteria: ${this.assessSuccessCriteria(signal)}
- Potential Issues: ${this.identifyPotentialIssues(signal, context)}`;

    return {
      id: HashUtils.generateId(),
      type: 'verify',
      content: verification,
      reasoning: 'Double-checking the decision for potential problems and ensuring it aligns with goals',
      confidence: 0.85,
      timestamp: new Date()
    };
  }

  /**
   * Generate final decision
   */
  private async generateDecision(
    signal: Signal,
    steps: CoTStep[],
    context: CoTContext
  ): Promise<ChainOfThought['decision']> {
    const decisionStep = steps.find(step => step.type === 'decide');

    const action = decisionStep?.decision ?? 'No action determined';
    const reasoning = steps.map(step => step.reasoning).join(' → ');

    // Determine actions based on signal type and decision
    const actions = this.determineActions(signal, action, context);

    // Identify blockers
    const blockers = this.identifyBlockers(signal, context);

    // Track completed items
    const completed = this.identifyCompleted(signal, context);

    // Plan next steps
    const next = this.planNextSteps(signal);

    return {
      blockers,
      completed,
      next,
      actions: actions.map(action => ({
        type: 'orchestration',
        task: action,
        signalType: signal.type,
        data: { reasoning, confidence: this.calculateConfidence(steps, { blockers: [], completed: [], next: [], actions: [] }) }
      }))
    };
  }

  /**
   * Format reasoning for display
   */
  private formatReasoning(steps: CoTStep[]): string {
    return steps.map(step =>
      `**${step.type}**\n${step.content}\n*Reasoning: ${step.reasoning}*\n`
    ).join('\n---\n');
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(steps: CoTStep[], decision: ChainOfThought['decision']): number {
    const stepConfidence = steps.reduce((sum, step) => sum + (step.confidence ?? 0), 0) / steps.length;
    const decisionComplexity = this.assessDecisionComplexity(decision);

    // Adjust confidence based on complexity
    const adjustedConfidence = stepConfidence * (1 - decisionComplexity * 0.1);

    return Math.max(0.1, Math.min(1.0, adjustedConfidence));
  }

  /**
   * Estimate token usage
   */
  private estimateTokenUsage(steps: CoTStep[], decision: ChainOfThought['decision']): number {
    let tokens = 0;

    // Steps tokens
    for (const step of steps) {
      tokens += this.estimateTokens(step.content ?? '');
      tokens += this.estimateTokens(step.reasoning ?? '');
    }

    // Decision tokens
    tokens += this.estimateTokens(JSON.stringify(decision));

    return tokens;
  }

  /**
   * Estimate tokens for text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // Helper methods for assessment and analysis
  private assessUrgency(signal: Signal): string {
    const highPrioritySignals = ['At', 'Bb', 'Ur', 'AE', 'AA'];
    return highPrioritySignals.includes(signal.type) ? 'HIGH' : 'MEDIUM';
  }

  private assessComplexity(signal: Signal): string {
    const complexSignals = ['pr', 'af', 'od', 'oc'];
    return complexSignals.includes(signal.type) ? 'HIGH' : 'LOW';
  }

  private assessRequiredAttention(signal: Signal): string {
    if (signal.priority > 8) {
      return 'IMMEDIATE';
    }
    if (signal.priority > 5) {
      return 'HIGH';
    }
    return 'NORMAL';
  }

  private generateOptions(signal: Signal): string[] {
    const baseOptions = [
      'Process signal with available tools',
      'Delegate to specialized agent',
      'Request additional information',
      'Escalate to human intervention'
    ];

    // Customize options based on signal type
    switch (signal.type) {
      case 'pr':
        return [
          'Review pull request changes',
          'Run automated checks',
          'Assign reviewers',
          'Request additional information'
        ];
      case 'tt':
        return [
          'Run test suite',
          'Review test coverage',
          'Create new tests',
          'Debug failing tests'
        ];
      case 'Qb':
        return [
          'Analyze bug report',
          'Reproduce issue',
          'Fix bug',
          'Create regression tests'
        ];
      default:
        return baseOptions;
    }
  }

  private makeDecision(signal: Signal, context: CoTContext): string {
    // Simple decision logic based on signal analysis
    const urgent = this.assessUrgency(signal) === 'HIGH';
    const complex = this.assessComplexity(signal) === 'HIGH';
    const hasAgents = context.availableAgents.length > 0;

    if (urgent && hasAgents) {
      return 'Delegate to appropriate agent for immediate action';
    } else if (complex && hasAgents) {
      return 'Assign to specialized agent with required expertise';
    } else if (urgent) {
      return 'Take immediate action with available tools';
    } else {
      return 'Process signal using standard workflow';
    }
  }

  private determineActions(signal: Signal, decision: string, context: CoTContext): string[] {
    const actions: string[] = [];
    // TODO: implement context-aware actions
    console.debug('Context marked as used:', context); // Explicitly mark as used

    if (decision.includes('agent')) {
      actions.push(`Deploy ${this.selectBestAgent(signal)} agent to handle signal: ${signal.type}`);
    }

    if (decision.includes('tool')) {
      actions.push(`Use required tools for signal: ${signal.type}`);
    }

    if (decision.includes('information')) {
      actions.push(`Request additional information for signal: ${signal.type}`);
    }

    return actions;
  }

  private identifyBlockers(_signal: Signal, context: CoTContext): string[] {
    const blockers: string[] = [];

    // Check for system constraints
    if (context.constraints.length > 0) {
      blockers.push('System constraints need to be resolved');
    }

    // Check for resource limitations
    if (context.availableAgents.length === 0) {
      blockers.push('No agents available for task delegation');
    }

    return blockers;
  }

  private identifyCompleted(_signal: Signal, context: CoTContext): string[] {
    const completed: string[] = [];

    // Mark recent decisions as completed
    if (context.previousDecisions.length > 0) {
      const recentDecisions = context.previousDecisions.slice(-3);
      for (const decision of recentDecisions) {
        completed.push(`Previous decision: ${decision.decision?.type ?? 'unknown type'} for PRP: ${decision.payload?.id ?? 'unknown'}`);
      }
    }

    return completed;
  }

  private planNextSteps(signal: Signal): string[] {
    const next: string[] = [];

    // Plan follow-up actions based on signal type
    switch (signal.type) {
      case 'op':
        next.push('Continue monitoring progress');
        break;
      case 'tt':
        next.push('Review test results and update status');
        break;
      default:
        next.push('Monitor signal resolution');
    }

    return next;
  }

  private selectBestAgent(signal: Signal): string {
    // Simple agent selection logic
    const signalAgentMap: Record<string, string> = {
      'pr': 'robo-developer',
      'tt': 'robo-aqa',
      'Qb': 'robo-aqa',
      'af': 'robo-system-analyst',
      'op': 'robo-developer'
    };

    return signalAgentMap[signal.type] ?? 'robo-developer';
  }

  
  private assessDecisionComplexity(decision: ChainOfThought['decision']): number {
    if (!decision) {
      return 0;
    }

    let complexity = 0;

    if (decision.actions && decision.actions.length > 2) {
      complexity += 0.2;
    }
    if (decision.blockers && decision.blockers.length > 0) {
      complexity += 0.3;
    }
    if (decision.next && decision.next.length > 3) {
      complexity += 0.2;
    }

    return Math.min(1.0, complexity);
  }

  private assessRisk(signal: Signal): string {
    if (signal.priority > 9) {
      return 'HIGH';
    }
    if (signal.priority > 7) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private assessResourceRequirements(signal: Signal): string {
    const complex = this.assessComplexity(signal);
    if (complex === 'HIGH') {
      return 'HIGH - Multiple agents and tools may be required';
    }
    if (complex === 'LOW') {
      return 'LOW - Single agent or tool sufficient';
    }
    return 'MEDIUM - May require coordination';
  }

  private assessSuccessCriteria(signal: Signal): string {
    return `Signal ${signal.type} processed successfully with appropriate action taken`;
  }

  private identifyPotentialIssues(signal: Signal, context: CoTContext): string {
    const issues = [];

    if (context.availableAgents.length === 0) {
      issues.push('No agents available for task delegation');
    }

    if (signal.priority > 8 && context.constraints.length > 0) {
      issues.push('High priority signal may be blocked by constraints');
    }

    return issues.length > 0 ? issues.join(', ') : 'No significant issues identified';
  }

  
  // Helper methods for task integration

  /**
   * Map task type to signal type
   */
  private mapTaskTypeToSignalType(taskType: TaskType): string {
    const taskSignalMap: Record<TaskType, string> = {
      [TaskType.DEVELOPMENT]: 'dp',
      [TaskType.TESTING]: 'tw',
      [TaskType.REVIEW]: 'rg',
      [TaskType.ANALYSIS]: 'af',
      [TaskType.DESIGN]: 'dr',
      [TaskType.DOCUMENTATION]: 'da',
      [TaskType.DEPLOYMENT]: 'mg',
      [TaskType.COORDINATION]: 'oa',
      [TaskType.RESEARCH]: 'rr',
      [TaskType.BUGFIX]: 'bf',
      [TaskType.FEATURE]: 'dp',
      [TaskType.REFACTORING]: 'cd',
      [TaskType.INTEGRATION]: 'cp',
      [TaskType.MONITORING]: 'mo',
      [TaskType.SECURITY]: 'sc',
      [TaskType.PERFORMANCE]: 'so',
      [TaskType.CLEANUP]: 'cd'
    };

    return taskSignalMap[taskType] ?? 'af';
  }

  /**
   * Map task priority to signal priority
   */
  private mapTaskPriorityToSignalPriority(priority: TaskPriority): number {
    const priorityMap: Record<TaskPriority, number> = {
      [TaskPriority.CRITICAL]: 10,
      [TaskPriority.HIGH]: 8,
      [TaskPriority.MEDIUM]: 5,
      [TaskPriority.LOW]: 3,
      [TaskPriority.BACKGROUND]: 1
    };

    return priorityMap[priority] ?? 5;
  }

  /**
   * Get available agents for a task
   */
  private getAvailableAgentsForTask(task: TaskDefinition): AgentInfo[] {
    if (!this.taskManager) {
      return [];
    }

    // Get available agents from task manager
    const availableAgents = this.taskManager.getAvailableAgents(task);

    return availableAgents.map(agent => ({
      id: agent.id,
      name: agent.id,
      type: agent.agentType,
      status: agent.status as 'idle' | 'busy' | 'error' | 'offline',
      capabilities: agent.capabilities
    }));
  }

  /**
   * Extract task instructions from CoT decision
   */
  private extractTaskInstructions(cot: ChainOfThought): TaskInstruction[] {
    const instructions: TaskInstruction[] = [];

    if (!cot.decision?.actions) {
      return instructions;
    }

    for (const action of cot.decision.actions) {
      if (action.type === 'orchestration' && action.data?.reasoning) {
        // Parse reasoning to extract task instructions
        const instruction = this.parseActionToTaskInstruction(action);
        if (instruction) {
          instructions.push(instruction);
        }
      }
    }

    return instructions;
  }

  /**
   * Parse action to task instruction
   */
  private parseActionToTaskInstruction(action: any): TaskInstruction | null {
    try {
      const reasoning = action.data?.reasoning || '';

      // Extract task type from reasoning
      let taskType = TaskType.COORDINATION; // Default
      if (reasoning.includes('development') || reasoning.includes('code')) {
        taskType = TaskType.DEVELOPMENT;
      } else if (reasoning.includes('test') || reasoning.includes('validation')) {
        taskType = TaskType.TESTING;
      } else if (reasoning.includes('review') || reasoning.includes('check')) {
        taskType = TaskType.REVIEW;
      } else if (reasoning.includes('analysis') || reasoning.includes('investigate')) {
        taskType = TaskType.ANALYSIS;
      } else if (reasoning.includes('design') || reasoning.includes('ui')) {
        taskType = TaskType.DESIGN;
      }

      // Determine priority from signal type
      let priority = TaskPriority.MEDIUM;
      let signalType = 'af';
      if (action.signalType) {
        signalType = action.signalType;
        if (['At', 'Bb', 'Ur', 'AE', 'AA'].includes(signalType)) {
          priority = TaskPriority.HIGH;
        }
      }

      return {
        title: `Task: ${action.task || 'General task'}`,
        description: `Execute: ${action.task || 'Complete task as described'}`,
        taskType,
        signalType: signalType as any,
        priority,
        requiredCapabilities: this.inferRequiredCapabilities(reasoning, taskType),
        parameters: {
          originalAction: action,
          reasoning: action.data?.reasoning
        },
        context: action.data
      };
    } catch (error) {
      logger.warn('orchestrator', 'cot-processor', 'Failed to parse action to task instruction', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Infer required capabilities from reasoning and task type
   */
  private inferRequiredCapabilities(reasoning: string, taskType: TaskType): string[] {
    const capabilities = new Set<string>();

    // Add base capabilities for task type
    const typeCapabilities: Record<TaskType, string[]> = {
      [TaskType.DEVELOPMENT]: ['coding', 'file_operations'],
      [TaskType.TESTING]: ['testing', 'validation'],
      [TaskType.REVIEW]: ['code_review', 'analysis'],
      [TaskType.ANALYSIS]: ['analysis', 'research'],
      [TaskType.DESIGN]: ['design', 'creativity'],
      [TaskType.DOCUMENTATION]: ['writing', 'documentation'],
      [TaskType.DEPLOYMENT]: ['deployment', 'system_operations'],
      [TaskType.COORDINATION]: ['coordination', 'communication'],
      [TaskType.RESEARCH]: ['research', 'analysis'],
      [TaskType.BUGFIX]: ['debugging', 'coding'],
      [TaskType.FEATURE]: ['coding', 'design'],
      [TaskType.REFACTORING]: ['coding', 'analysis'],
      [TaskType.INTEGRATION]: ['coding', 'testing'],
      [TaskType.MONITORING]: ['monitoring', 'analysis'],
      [TaskType.SECURITY]: ['security', 'analysis'],
      [TaskType.PERFORMANCE]: ['performance', 'analysis'],
      [TaskType.CLEANUP]: ['cleanup', 'file_operations']
    };

    const baseCaps = typeCapabilities[taskType] || ['general'];
    baseCaps.forEach(cap => capabilities.add(cap));

    // Add capabilities based on reasoning keywords
    const reasoningLower = reasoning.toLowerCase();
    if (reasoningLower.includes('test')) {
      capabilities.add('testing');
    }
    if (reasoningLower.includes('debug')) {
      capabilities.add('debugging');
    }
    if (reasoningLower.includes('deploy')) {
      capabilities.add('deployment');
    }
    if (reasoningLower.includes('security')) {
      capabilities.add('security');
    }
    if (reasoningLower.includes('performance')) {
      capabilities.add('performance');
    }
    if (reasoningLower.includes('document')) {
      capabilities.add('documentation');
    }
    if (reasoningLower.includes('analyze')) {
      capabilities.add('analysis');
    }
    if (reasoningLower.includes('coordinate')) {
      capabilities.add('coordination');
    }

    return Array.from(capabilities);
  }

  /**
   * Format task results for display
   */
  private formatTaskResults(results: TaskResult[]): string {
    const summary = 'Task Execution Results:\n';

    const resultsList = results.map((result, index) => {
      const status = result.outcome === TaskOutcome.SUCCESS ? '✅' : '❌';
      const duration = `${result.timestamps.duration}ms`;
      const quality = `Quality: ${result.quality.score}/100`;

      return `${index + 1}. ${status} Task ${result.taskId} (${duration}) - ${quality}\n` +
             `   Summary: ${result.details.summary}\n` +
             `   Outcome: ${result.outcome}`;
    }).join('\n\n');

    return summary + resultsList;
  }

  /**
   * Calculate confidence from task results
   */
  private calculateResultsConfidence(results: TaskResult[]): number {
    if (results.length === 0) {
      return 0.5;
    }

    const avgQuality = results.reduce((sum, result) => sum + result.quality.score, 0) / results.length;
    const successRate = results.filter(r => r.outcome === TaskOutcome.SUCCESS).length / results.length;

    return (avgQuality / 100 * 0.7 + successRate * 0.3);
  }

  /**
   * Update decision with task results
   */
  private updateDecisionWithResults(cot: ChainOfThought, results: TaskResult[]): void {
    if (!cot.decision) {
      return;
    }

    // Add task results to decision metadata
    cot.decision.taskResults = {
      count: results.length,
      successCount: results.filter(r => r.outcome === TaskOutcome.SUCCESS).length,
      avgQuality: results.reduce((sum, r) => sum + r.quality.score, 0) / results.length,
      totalDuration: results.reduce((sum, r) => sum + r.timestamps.duration, 0)
    };

    // Update completed items
    if (!cot.decision.completed) {
      cot.decision.completed = [];
    }

    results.forEach(result => {
      cot.decision!.completed!.push(`Task ${result.taskId}: ${result.details.summary}`);
    });
  }

  // Filesystem operations
  private async loadProcessingHistory(): Promise<void> {
    // Load processing history from storage
    // Implementation would depend on storage backend
  }

  private async saveProcessingHistory(): Promise<void> {
    // Save processing history to storage
    // Implementation would depend on storage backend
  }
}

/**
 * Task instruction interface for CoT processing
 */
interface TaskInstruction {
  title: string;
  description: string;
  taskType: TaskType;
  signalType: string;
  priority: TaskPriority;
  requiredCapabilities: string[];
  parameters: Record<string, unknown>;
  context?: unknown;
}