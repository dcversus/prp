/**
 * ♫ Orchestrator for @dcversus/prp
 *
 * LLM-based decision making system with chain-of-thought reasoning,
 * agent coordination, and comprehensive tool access.
 */

import { EventEmitter } from 'events';
import {
  OrchestratorConfig,
  OrchestratorState,
  AgentSession,
  DecisionRecord,
  OrchestratorDecision,
  DecisionAction,
  AgentTask,
  ActionResult,
  DecisionOutcome,
  ContextMemory,
  ExecutionPlan,
  OrchestratorError,
  OrchestratorMetrics,
  ChainOfThoughtResult,
  CoTContext,
  ExecutionStep,
  SharedNote
} from './types';
import {
  InspectorPayload,
  Signal,
  AgentConfig,
  Recommendation,
  eventBus,
  createLayerLogger,
  TokenCounter,
  TimeUtils,
  HashUtils
} from '../shared';
import type { ToolImplementation } from './tool-implementation';
import { guidelinesRegistry } from '../guidelines';
import { storageManager } from '../storage';
// import { TmuxManager, createDefaultTmuxConfig } from '../tmux'; // Temporarily disabled
// import { AgentTerminalSession } from '../tmux/types'; // Temporarily disabled

// Model call interfaces
interface ModelCallOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  [key: string]: unknown;
}

interface ModelResponse {
  content: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  model?: string;
  finishReason?: string;
}

interface ActionResultWithTool {
  success: boolean;
  result: unknown;
  toolUsed?: string;
  duration?: number;
  error?: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  dependencies?: string[];
  assignedTo?: string;
  dueDate?: Date;
  tags?: string[];
}

interface Constraint {
  id: string;
  type: 'resource' | 'dependency' | 'environmental' | 'security' | 'performance';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'mitigated' | 'ignored';
  affectedComponents?: string[];
  resolution?: string;
}

interface Guideline {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: string[];
  applicable: boolean;
}

const logger = createLayerLogger('orchestrator');

/**
 * ♫ Orchestrator - The conductor of AI agents
 */
export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private state: OrchestratorState;
  private agents: Map<string, AgentSession> = new Map();
  // private agentTerminals: Map<string, AgentTerminalSession> = new Map(); // Unused - commented out
  private decisions: Map<string, DecisionRecord> = new Map();
  private executionPlans: Map<string, ExecutionPlan> = new Map();
  private tools: Map<string, ToolImplementation> = new Map();
  private contextMemory: ContextMemory;
  private activeDecisions: Map<string, Promise<DecisionOutcome>> = new Map();
  // private tmuxManager: TmuxManager; // Temporarily disabled
  private isInitialized = false;

  constructor(config?: Partial<OrchestratorConfig>) {
    super();
    this.config = this.createConfig(config);
    this.state = this.createInitialState();
    this.contextMemory = this.createInitialContextMemory();

    // Initialize tmux manager - temporarily disabled to fix core TypeScript errors
    // this.tmuxManager = new TmuxManager(
    //   createDefaultTmuxConfig(),
    //   createLayerLogger('shared')
    // );
    // this.tmuxManager = null as any; // Temporarily disabled

    this.initializeTools();
    this.setupEventHandlers();
    // this.setupTmuxEventHandlers();
  }

  /**
   * Initialize orchestrator and tmux system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize tmux manager - temporarily disabled
      // await this.tmuxManager.initialize();
      // this.setupTmuxEventHandlers();

      this.isInitialized = true;
      logger.info('orchestrator', 'Orchestrator initialized');

      // Spawn initial agent for PRP analysis - temporarily disabled
      // await this.spawnInitialAgent();

      this.emit('orchestrator.initialized', { timestamp: Date.now() });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('orchestrator', 'Failed to initialize orchestrator', error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Spawn initial agent to analyze current PRP status
   */
  // private async spawnInitialAgent(): Promise<void> {
  //   try {
  //     const agentId = 'initial-analyzer';
  //     const instructions = `🎵 ♫ @dcversus/prp Initial Analysis

  // You are the initial analyzer agent. Please analyze the current state of the PRP project:

  // 1. **Project Structure**: Examine the codebase structure and identify key components
  // 2. **Recent Changes**: Look for recent modifications and activities
  // 3. **Current Status**: Assess the overall health and state of the project
  // 4. **Signal Detection**: Identify any immediate signals or issues that need attention
  // 5. **Recommendations**: Provide initial recommendations for next steps

  // Please provide a comprehensive analysis in markdown format, including:
  // - Summary of current state
  // - Identified signals and their priorities
  // - Recommended actions
  // - Any immediate concerns

  // Start your analysis now and provide regular updates on your progress.`;

  //     const agentConfig = {
  //       id: agentId,
  //       type: 'analyzer',
  //       role: 'initial_assessment',
  //       model: 'gpt-5',
  //       capabilities: ['file_analysis', 'git_analysis', 'signal_detection', 'status_reporting'],
  //       priority: 10,
  //       maxTokens: 50000,
  //       temperature: 0.3
  //     };

  //     const terminalSession = await this.tmuxManager.createAgentSession(
  //       agentId,
  //       agentConfig,
  //       instructions,
  //       process['cwd']()
  //     );

  //     this.agentTerminals.set(agentId, terminalSession);

  //     logger.info('Initial agent spawned', {
  //       agentId,
  //       sessionId: terminalSession.id
  //     });

  //     this.emit('agent.spawned', {
  //       agentId,
  //       sessionId: terminalSession.id,
  //       purpose: 'initial_analysis',
  //       timestamp: Date.now()
  //     });

  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : String(error);
  //     logger.error(errorMessage, 'Failed to spawn initial agent');
  //     // Don't throw - orchestrator can still work without initial agent
  //   }
  // }

  /**
   * Create orchestrator configuration
   */
  private createConfig(overrides?: Partial<OrchestratorConfig>): OrchestratorConfig {
    const defaultConfig: OrchestratorConfig = {
      model: 'gpt-5',
      maxTokens: 100000,
      temperature: 0.7,
      timeout: 180000, // 3 minutes
      maxConcurrentDecisions: 3,
      maxChainOfThoughtDepth: 10,
      contextPreservation: {
        enabled: true,
        maxContextSize: 50000,
        compressionStrategy: 'summarize',
        preserveElements: ['signals', 'active_tasks', 'agent_status'],
        compressionRatio: 0.3,
        importantSignals: ['At', 'Bb', 'Ur', 'Co'],
      },
      tools: [
        {
          name: 'file_reader',
          description: 'Read files from the filesystem',
          enabled: true,
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to read' },
              encoding: { type: 'string', description: 'File encoding', enum: ['utf8', 'ascii'] },
              start_line: { type: 'number', description: 'Starting line number' },
              end_line: { type: 'number', description: 'Ending line number' }
            },
            required: ['path']
          },
          required: false,
          category: 'file',
          permissions: ['read']
        },
        {
          name: 'git_operations',
          description: 'Execute git commands',
          enabled: true,
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Git command to execute' },
              repository: { type: 'string', description: 'Repository path' },
              args: { type: 'array', description: 'Command arguments' }
            },
            required: ['command']
          },
          required: false,
          category: 'git',
          permissions: ['read', 'execute']
        },
        {
          name: 'bash_command',
          description: 'Execute bash commands',
          enabled: true,
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to execute' },
              working_directory: { type: 'string', description: 'Working directory' },
              timeout: { type: 'number', description: 'Timeout in seconds' }
            },
            required: ['command']
          },
          required: false,
          category: 'system',
          permissions: ['read', 'execute']
        },
        {
          name: 'http_request',
          description: 'Make HTTP requests',
          enabled: true,
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Request URL' },
              method: { type: 'string', description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
              headers: { type: 'object', description: 'Request headers' },
              body: { type: 'object', description: 'Request body' },
              timeout: { type: 'number', description: 'Timeout in milliseconds' }
            },
            required: ['url', 'method']
          },
          required: false,
          category: 'network',
          permissions: ['read', 'write']
        }
      ],
      agents: {
        maxActiveAgents: 5,
        defaultTimeout: 60000, // 1 minute
        retryAttempts: 3,
        retryDelay: 5000,
        parallelExecution: true,
        loadBalancing: 'least_busy',
        healthCheckInterval: 30000
      },
      prompts: {
        systemPrompt: this.getSystemPrompt(),
        decisionMaking: this.getDecisionMakingPrompt(),
        chainOfThought: this.getChainOfThoughtPrompt(),
        toolSelection: this.getToolSelectionPrompt(),
        agentCoordination: this.getAgentCoordinationPrompt(),
        checkpointEvaluation: this.getCheckpointEvaluationPrompt(),
        errorHandling: this.getErrorHandlingPrompt(),
        contextUpdate: this.getContextUpdatePrompt()
      },
      decisionThresholds: {
        confidence: 0.7,
        tokenUsage: 50000,
        processingTime: 120000,
        agentResponse: 30000,
        errorRate: 0.2
      }
    };

    return { ...defaultConfig, ...overrides };
  }

  /**
   * Create initial state
   */
  private createInitialState(): OrchestratorState {
    return {
      status: 'idle',
      activeAgents: new Map(),
      decisionHistory: [],
      contextMemory: this.contextMemory,
      chainOfThought: {
        id: HashUtils.generateId(),
        depth: 0,
        currentStep: 0,
        steps: [],
        context: {
          originalPayload: {
            id: 'init-' + HashUtils.generateId(),
            timestamp: new Date(),
            sourceSignals: [],
            classification: [],
            recommendations: [],
            context: {
              summary: 'initialization',
              activePRPs: [],
              blockedItems: [],
              recentActivity: [],
              tokenStatus: { used: 0, totalUsed: 0, totalLimit: 100000, approachingLimit: false, criticalLimit: false, agentBreakdown: {} },
              agentStatus: [],
              sharedNotes: []
            },
            estimatedTokens: 0,
            priority: 5
          },
          signals: [],
          activeGuidelines: [],
          availableAgents: [],
          systemState: this.getSystemState(),
          constraints: [],
          previousDecisions: []
        },
        status: 'active'
      },
      metrics: {
        startTime: TimeUtils.now(),
        totalDecisions: 0,
        successfulDecisions: 0,
        failedDecisions: 0,
        averageDecisionTime: 0,
        averageTokenUsage: {
          input: 0,
          output: 0,
          total: 0,
          cost: 0
        },
        agentUtilization: {
          active: 0,
          total: 0,
          averageTasksPerAgent: 0,
          successRate: 0
        },
        toolUsage: {},
        checkpointStats: {
          total: 0,
          passed: 0,
          failed: 0,
          averageTime: 0
        },
        chainOfThoughtStats: {
          averageDepth: 0,
          averageTime: 0,
          successRate: 0
        }
      }
    };
  }

  /**
   * Create initial context memory
   */
  private createInitialContextMemory(): ContextMemory {
    return {
      signals: new Map(),
      decisions: new Map(),
      agentStates: new Map(),
      systemMetrics: new Map(),
      conversationHistory: [],
      sharedNotes: new Map(),
      lastUpdate: TimeUtils.now(),
      size: 0,
      maxSize: this.config.contextPreservation.maxContextSize
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to inspector payloads
    eventBus.subscribeToChannel('orchestrator', (event) => {
      if (event.type === 'orchestrator_payload_ready') {
        this.handlePayloadReceived(event.data as { payload: InspectorPayload });
      }
    });

    // Listen to guideline events
    eventBus.subscribeToChannel('guidelines', (event) => {
      if (event.type === 'guideline_completed') {
        this.handleGuidelineCompleted(event.data as { result: { success: boolean; }; guidelineId: string; });
      }
    });

    // Listen to agent responses
    eventBus.subscribeToChannel('agents', (event) => {
      if (event.type === 'agent_task_completed') {
        this.handleAgentTaskCompleted(event.data as { agentId: string; taskId: string; result: { success: boolean; duration?: number; }; });
      }
    });
  }

  /**
   * Setup tmux event handlers
   */
  // private setupTmuxEventHandlers(): void {
  //   // Listen to tmux session events
  //   eventBus.subscribeToChannel('tmux', (event) => {
  //     switch (event.type) {
  //       case 'tmux.session.created':
  //         this.handleTmuxSessionCreated(event.data);
  //         break;
  //       case 'tmux.session.terminated':
  //         this.handleTmuxSessionTerminated(event.data);
  //         break;
  //       case 'tmux.agent.message':
  //         this.handleAgentMessage(event.data);
  //         break;
  //       case 'tmux.idle.detected':
  //         this.handleTerminalIdle(event.data);
  //         break;
  //       case 'tmux.resource.alert':
  //         this.handleResourceAlert(event.data);
  //         break;
  //       case 'tmux.error':
  //         this.handleTmuxError(event.data);
  //         break;
  //     }
  //   });
  // }

  /**
   * Process payload from inspector
   */
  async processPayload(payload: InspectorPayload): Promise<string> {
    const decisionId = HashUtils.generateId();

    // Check if already processing
    if (this.activeDecisions.has(decisionId)) {
      return decisionId;
    }

    const decisionPromise = this.executeDecisionProcess(payload, decisionId);
    this.activeDecisions.set(decisionId, decisionPromise);

    try {
      await decisionPromise; // Wait for completion but don't need the outcome
      return decisionId;
    } finally {
      this.activeDecisions.delete(decisionId);
    }
  }

  /**
   * Execute the complete decision process
   */
  private async executeDecisionProcess(payload: InspectorPayload, decisionId: string): Promise<DecisionOutcome> {
    const startTime = Date.now();

    try {
      logger.info('orchestrator', `Starting decision process ${decisionId}`, {
        decisionId,
        payloadId: payload.id
      });

      this.state.status = 'thinking';
      this.state.currentDecision = decisionId;

      // Emit decision started event
      this.emit('decision_started', { decisionId, payload, timestamp: TimeUtils.now() });

      // Step 1: Chain of Thought Analysis
      const chainOfThought = await this.performChainOfThought(payload, decisionId);

      // Step 2: Make Decision
      const decision = await this.makeDecision(payload, chainOfThought, decisionId);

      // Step 3: Create Execution Plan
      const executionPlan = await this.createExecutionPlan(decision, decisionId);

      // Step 4: Execute Plan
      const outcome = await this.executePlan(executionPlan, decisionId);

      // Step 5: Record Decision
      await this.recordDecision(decisionId, payload, decision, chainOfThought, outcome);

      // Update metrics
      this.updateMetrics(outcome, Date.now() - startTime);

      // Emit completion event
      this.emit('decision_completed', { decisionId, decision, outcome, timestamp: TimeUtils.now() });

      logger.info('orchestrator', 'Decision process completed', {
        decisionId,
        success: outcome.success,
        duration: Date.now() - startTime
      });

      return outcome;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const orchestratorError: OrchestratorError = {
        id: HashUtils.generateId(),
        type: 'decision_error',
        message: errorMessage,
        details: error,
        stack: error instanceof Error ? error.stack : undefined,
        decisionId,
        timestamp: TimeUtils.now(),
        recoverable: this.isRecoverableError(error),
        suggestions: this.getErrorSuggestions(error)
      };

      this.state.lastError = orchestratorError;

      // Emit error event
      this.emit('error', { error: orchestratorError, timestamp: TimeUtils.now() });

      logger.error('orchestrator', 'Decision process failed', error instanceof Error ? error : new Error(String(error)), {
        decisionId,
        recoverable: orchestratorError.recoverable
      });

      throw error;
    } finally {
      this.state.status = 'idle';
      this.state.currentDecision = undefined;
    }
  }

  /**
   * Perform chain of thought analysis
   */
  private async performChainOfThought(payload: InspectorPayload, decisionId: string): Promise<ChainOfThoughtResult> {
    this.state.status = 'thinking';
    this.state.chainOfThought.status = 'active';

    const context = await this.buildChainOfThoughtContext(payload);
    const prompt = this.buildChainOfThoughtPrompt(context);

    try {
      const response = await this.callModel(prompt, {
        maxTokens: this.config.maxTokens / 2, // Reserve tokens for decision making
        temperature: 0.7,
        timeout: this.config.timeout / 2
      });

      const chainOfThoughtResult = this.parseChainOfThoughtResponse(response);

      // Update chain of thought state
      this.state.chainOfThought.status = 'completed';

      logger.debug('orchestrator', 'Chain of thought completed', {
        decisionId,
        depth: chainOfThoughtResult.steps?.length || 0,
        confidence: chainOfThoughtResult.confidence || 0
      });

      return chainOfThoughtResult;

    } catch (error) {
      this.state.chainOfThought.status = 'failed';
      throw error;
    }
  }

  /**
   * Make the actual decision
   */
  private async makeDecision(payload: InspectorPayload, chainOfThought: ChainOfThoughtResult, decisionId: string): Promise<OrchestratorDecision> {
    this.state.status = 'deciding';

    const context = await this.buildDecisionContext(payload, chainOfThought);
    const prompt = this.buildDecisionMakingPrompt(context);

    const response = await this.callModel(prompt, {
      maxTokens: this.config.maxTokens / 2,
      temperature: this.config.temperature,
      timeout: this.config.timeout / 2
    });

    const decision = this.parseDecisionResponse(response);

    // Validate decision
    if (decision.confidence < this.config.decisionThresholds.confidence) {
      throw new Error(`Decision confidence ${decision.confidence} below threshold ${this.config.decisionThresholds.confidence}`);
    }

    logger.info('orchestrator', 'Decision made', {
      decisionId,
      type: decision.type,
      confidence: decision.confidence,
      actionsCount: decision.actions.length
    });

    return decision;
  }

  /**
   * Create execution plan
   */
  private async createExecutionPlan(decision: OrchestratorDecision, decisionId: string): Promise<ExecutionPlan> {
    this.state.status = 'coordinating';

    const plan: ExecutionPlan = {
      id: HashUtils.generateId(),
      decisionId,
      steps: [],
      dependencies: new Map(),
      status: 'pending',
      progress: 0
    };

    // Create steps for each action
    for (const action of decision.actions) {
      const step = await this.createExecutionStep(action, decision);
      plan.steps.push(step);

      // Add dependencies
      if (action.dependencies && action.dependencies.length > 0) {
        plan.dependencies.set(step.id, action.dependencies);
      }
    }

    // Calculate execution order
    this.calculateExecutionOrder(plan);

    logger.info('orchestrator', 'Execution plan created', {
      decisionId,
      stepsCount: plan.steps.length,
      estimatedDuration: decision.estimatedDuration
    });

    return plan;
  }

  /**
   * Execute the plan
   */
  private async executePlan(plan: ExecutionPlan, decisionId: string): Promise<DecisionOutcome> {
    this.state.status = 'executing';
    this.executionPlans.set(plan.id, plan);

    const results: ActionResult[] = [];
    const startTime = Date.now();

    try {
      plan.status = 'in_progress';

      // Execute steps in dependency order
      for (const step of plan.steps) {
        if (!this.canExecuteStep(step, plan)) {
          continue;
        }

        const result = await this.executeStep(step, decisionId);
        results.push(result);

        // Update progress
        plan.progress = Math.round((results.filter(r => r.status === 'completed').length / plan.steps.length) * 100);

        // Check if any critical step failed
        if (result.status === 'failed' && this.isCriticalStep(step)) {
          throw new Error(`Critical step ${step.name} failed: ${result.error}`);
        }
      }

      plan.status = 'completed';
      plan.endTime = new Date();

      // Create outcome
      const outcome: DecisionOutcome = {
        success: results.every(r => r.status === 'completed'),
        summary: this.generateOutcomeSummary(results),
        achievedGoals: results.filter(r => r.status === 'completed').map(r => {
          const result = r.result;
          return result?.goal || 'Task completed';
        }),
        blockedItems: results.filter(r => r.status === 'failed').map(r => r.error || 'Task failed'),
        nextActions: this.getNextActions(results),
        recommendations: this.generateRecommendations(results),
        lessons: this.extractLessons(results),
        metrics: {
          decisionsMade: 1,
          agentsCoordinated: this.getActiveAgentCount(),
          toolsUsed: this.countToolsUsed(results),
          tokenConsumed: this.calculateTokenUsage(results),
          timeSpent: Date.now() - startTime
        }
      };

      logger.info('orchestrator', 'Execution plan completed', {
        decisionId,
        planId: plan.id,
        success: outcome.success,
        duration: outcome.metrics.timeSpent
      });

      return outcome;

    } catch (error) {
      plan.status = 'failed';
      plan.endTime = new Date();

      throw error;
    } finally {
      this.executionPlans.delete(plan.id);
    }
  }

  /**
   * Initialize available tools
   */
  private initializeTools(): void {
    for (const toolConfig of this.config.tools) {
      if (toolConfig.enabled) {
        this.tools.set(toolConfig.name, new ToolImplementationClass(toolConfig) as unknown as ToolImplementation);
      }
    }
  }

  /**
   * Handle payload received from inspector
   */
  private async handlePayloadReceived(data: { payload: InspectorPayload }): Promise<void> {
    const { payload } = data;
    await this.processPayload(payload);
  }

  /**
   * Handle guideline completion
   */
  private async handleGuidelineCompleted(data: { result: { success: boolean }, guidelineId: string }): Promise<void> {
    // Update context memory with guideline results
    const { result, guidelineId } = data;

    logger.info('orchestrator', 'Guideline execution completed', {
      guidelineId,
      success: result.success
    });
  }

  /**
   * Handle agent task completion
   */
  private async handleAgentTaskCompleted(data: { agentId: string, taskId: string, result: { success: boolean, duration?: number } }): Promise<void> {
    const { agentId, taskId, result } = data;

    // Update agent session
    const agentSession = this.agents.get(agentId);
    if (agentSession) {
      agentSession.lastActivity = TimeUtils.now();
      agentSession.currentTask = undefined;
      agentSession.status = 'idle';

      // Update performance metrics
      agentSession.performance.tasksCompleted++;
      if (result.success) {
        // Calculate average task time
        const totalTime = agentSession.performance.averageTaskTime * (agentSession.performance.tasksCompleted - 1) + (result.duration || 0);
        agentSession.performance.averageTaskTime = totalTime / agentSession.performance.tasksCompleted;
      } else {
        agentSession.performance.errorCount++;
      }
    }

    logger.debug('orchestrator', 'Agent task completed', {
      agentId,
      taskId,
      success: result.success
    });
  }

  /**
   * Build chain of thought context
   */
  private async buildChainOfThoughtContext(payload: InspectorPayload): Promise<CoTContext> {
    return {
      originalPayload: payload,
      signals: payload.sourceSignals,
      activeGuidelines: [],
      availableAgents: Array.from(this.agents.keys()),
      systemState: this.getSystemState(),
      previousDecisions: Array.from(this.decisions.values()).slice(-5),
      constraints: await this.getCurrentConstraints(),
    } as CoTContext;
  }

  /**
   * Build decision making context
   */
  private async buildDecisionContext(payload: InspectorPayload, chainOfThought: ChainOfThoughtResult): Promise<unknown> {
    return {
      payload,
      chainOfThought,
      availableAgents: Array.from(this.agents.values()),
      availableTools: Array.from(this.tools.keys()),
      systemState: this.getSystemState(),
      guidelines: await this.getApplicableGuidelines(),
      contextMemory: this.contextMemory,
      tokenBudget: this.calculateTokenBudget()
    };
  }

  /**
   * Call the model (GPT-5)
   */
  private async callModel(prompt: string, options: ModelCallOptions = {}): Promise<unknown> {
    const startTime = Date.now();

    try {
      // This would integrate with the actual GPT-5 API
      // For now, simulate a response
      const response = await this.simulateModelCall(prompt, options) as ModelResponse;

      return {
        content: response.content,
        usage: response.usage,
        finish_reason: response.finish_reason,
        processing_time: Date.now() - startTime
      };

    } catch (error) {
      logger.error('orchestrator', 'Model call failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Simulate model call (placeholder for actual implementation)
   */
  private async simulateModelCall(prompt: string, _options: unknown): Promise<unknown> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    // Generate mock response based on prompt content
    if (prompt.includes('chain of thought')) {
      return {
        content: JSON.stringify({
          steps: [
            {
              id: '1',
              type: 'analyze',
              content: 'Analyzing the signal payload and context',
              reasoning: 'I need to understand what needs to be decided based on the signals and context provided.',
              confidence: 0.8
            },
            {
              id: '2',
              type: 'consider',
              content: 'Considering available options and resources',
              reasoning: 'Based on the available agents and tools, I can coordinate multiple approaches.',
              confidence: 0.85
            },
            {
              id: '3',
              type: 'decide',
              content: 'Making final decision based on analysis',
              reasoning: 'The optimal approach is to coordinate agents with specific tasks while monitoring progress.',
              confidence: 0.9,
              decision: 'coordinate_agents'
            }
          ],
          confidence: 0.85,
          reasoning: 'After analyzing the payload and available resources, coordination is the best approach.',
          decision: 'coordinate_agents'
        }),
        usage: {
          prompt_tokens: TokenCounter.estimateTokens(prompt),
          completion_tokens: 500,
          total_tokens: TokenCounter.estimateTokens(prompt) + 500
        },
        finish_reason: 'stop'
      };
    }

    if (prompt.includes('decision making')) {
      return {
        content: JSON.stringify({
          type: 'coordinate',
          priority: 8,
          reasoning: 'This requires coordination between multiple agents to handle different aspects of the signal.',
          confidence: 0.9,
          actions: [
            {
              id: '1',
              type: 'spawn_agent',
              description: 'Assign code review task to developer agent',
              priority: 8,
              payload: { task: 'review_code', files: [] }, // placeholder - payload not available here
              target: 'developer',
              estimated_duration: 30000
            },
            {
              id: '2',
              type: 'send_message',
              description: 'Notify user about progress',
              priority: 5,
              payload: { message: 'Started coordination process' }
            }
          ],
          agents: [
            {
              agentId: 'claude-code-developer',
              role: 'developer',
              task: 'Review and address the signal requirements',
              tools: ['file_reader', 'git_operations'],
              priority: 8,
              estimated_duration: 30000
            }
          ],
          estimatedDuration: 45000,
          tokenEstimate: 25000
        }),
        usage: {
          prompt_tokens: TokenCounter.estimateTokens(prompt),
          completion_tokens: 800,
          total_tokens: TokenCounter.estimateTokens(prompt) + 800
        },
        finish_reason: 'stop'
      };
    }

    // Default response
    return {
      content: 'Analysis complete. Ready to coordinate agents.',
      usage: {
        prompt_tokens: TokenCounter.estimateTokens(prompt),
        completion_tokens: 100,
        total_tokens: TokenCounter.estimateTokens(prompt) + 100
      },
      finish_reason: 'stop'
    };
  }

  /**
   * Parse chain of thought response
   */
  private parseChainOfThoughtResponse(response: unknown): ChainOfThoughtResult {
    try {
      const content = (response as ModelResponse).content || '{}';
      const parsed = JSON.parse(content);
      return {
        reasoning: parsed.reasoning || 'Chain of thought analysis completed',
        steps: parsed.steps || [],
        decision: parsed.decision || 'analyze',
        confidence: parsed.confidence || 0.5,
        alternatives: parsed.alternatives || [],
        risks: parsed.risks || [],
        nextSteps: parsed.nextSteps || []
      };
    } catch (error) {
      logger.warn('orchestrator', 'Failed to parse chain of thought response', { error: error instanceof Error ? error.message : String(error) });
      return {
        reasoning: 'Failed to parse chain of thought response',
        steps: [],
        decision: 'analyze',
        confidence: 0.5,
        alternatives: [],
        risks: [],
        nextSteps: []
      };
    }
  }

  /**
   * Parse decision response
   */
  private parseDecisionResponse(response: unknown): OrchestratorDecision {
    try {
      const content = (response as ModelResponse).content || '{}';
      const parsed = JSON.parse(content);
      return {
        id: HashUtils.generateId(),
        type: parsed.type || 'coordinate',
        priority: parsed.priority || 5,
        reasoning: parsed.reasoning || 'Default reasoning',
        confidence: parsed.confidence || 0.5,
        actions: parsed.actions || [],
        agents: parsed.agents || [],
        tools: parsed.tools || [],
        checkpoints: parsed.checkpoints || [],
        estimatedDuration: parsed.estimatedDuration || 30000,
        tokenEstimate: parsed.tokenEstimate || 20000
      };
    } catch (error) {
      logger.warn('orchestrator', 'Failed to parse decision response', { error: error instanceof Error ? error.message : String(error) });
      return {
        id: HashUtils.generateId(),
        type: 'coordinate',
        priority: 5,
        reasoning: 'Failed to parse decision response',
        confidence: 0.3,
        actions: [],
        agents: [],
        tools: [],
        checkpoints: [],
        estimatedDuration: 30000,
        tokenEstimate: 20000
      };
    }
  }

  /**
   * Create execution step from action
   */
  private async createExecutionStep(action: DecisionAction, _decision: OrchestratorDecision): Promise<ExecutionStep> {
    return {
      id: HashUtils.generateId(),
      name: action.description || action.type,
      description: action.description,
      type: this.getActionType(action.type),
      status: 'pending',
      assignedTo: this.getStepAssignee(action),
      payload: action.payload,
      result: undefined,
      error: undefined,
      startTime: undefined,
      endTime: undefined,
      duration: undefined,
      tokenUsage: undefined,
      retryCount: 0,
      maxRetries: 3
    };
  }

  /**
   * Get action type from string
   */
  private getActionType(type: string): ExecutionStep['type'] {
    const typeMap: Record<string, ExecutionStep['type']> = {
      'spawn_agent': 'agent_task',
      'send_message': 'tool_call',
      'execute_command': 'tool_call',
      'call_tool': 'tool_call',
      'create_note': 'tool_call',
      'update_prp': 'tool_call',
      'create_signal': 'tool_call',
      'wait': 'wait',
      'escalate': 'decision'
    };
    return typeMap[type] || 'tool_call';
  }

  /**
   * Get step assignee (agent or tool)
   */
  private getStepAssignee(action: DecisionAction): string | undefined {
    const payload = action.payload;
    if (action.type === 'spawn_agent' && payload?.agentId) {
      return payload.agentId;
    }
    if (action.type === 'call_tool' && payload?.toolName) {
      return payload.toolName;
    }
    return undefined;
  }

  /**
   * Calculate execution order based on dependencies
   */
  private calculateExecutionOrder(plan: ExecutionPlan): void {
    // Simple topological sort
    const visited = new Set<string>();
    const sorted: ExecutionStep[] = [];

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      visited.add(stepId);

      const dependencies = plan.dependencies.get(stepId) || [];
      for (const dep of dependencies) {
        visit(dep);
      }

      const step = plan.steps.find(s => s.id === stepId);
      if (step) {
        sorted.push(step);
      }
    };

    for (const step of plan.steps) {
      visit(step.id);
    }

    // Reorder steps
    plan.steps = sorted;
  }

  /**
   * Check if step can be executed
   */
  private canExecuteStep(step: ExecutionStep, plan: ExecutionPlan): boolean {
    if (step.status !== 'pending') return false;

    const dependencies = plan.dependencies.get(step.id) || [];
    for (const depId of dependencies) {
      const depStep = plan.steps.find(s => s.id === depId);
      if (!depStep || depStep.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: ExecutionStep, _decisionId: string): Promise<ActionResult> {
    const startTime = Date.now();
    const result: ActionResult = {
      id: HashUtils.generateId(),
      actionId: step.id,
      status: 'in_progress',
      startTime: new Date(),
      duration: 0
    };

    try {
      step.status = 'in_progress';
      step.startTime = new Date();

      if (step.type === 'agent_task' && step.assignedTo) {
        // Execute agent task
        result.result = await this.executeAgentTask(step.assignedTo, step);
      } else if (step.type === 'tool_call' && step.assignedTo) {
        // Execute tool call
        result.result = await this.executeToolCall(step.assignedTo, step);
      } else {
        // Execute generic action
        result.result = await this.executeGenericAction(step);
      }

      result.status = 'completed';
      step.status = 'completed';

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      step.status = 'failed';

      // Check if should retry
      if (step.retryCount < step.maxRetries && this.isRecoverableError(error)) {
        result.status = 'pending';
        step.retryCount++;
        logger.info('orchestrator', 'Step failed, will retry', {
          stepId: step.id,
          retryCount: step.retryCount,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    step.endTime = new Date();
    step.duration = Date.now() - startTime;
    result.duration = step.duration;
    result.endTime = step.endTime;

    return result;
  }

  /**
   * Execute agent task
   */
  private async executeAgentTask(agentId: string, step: ExecutionStep): Promise<unknown> {
    const agentSession = this.agents.get(agentId);
    if (!agentSession) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const task: AgentTask = {
      id: step.id,
      type: step.type,
      description: step.description,
      priority: 5, // Default priority
      payload: step.payload,
      assignedAt: new Date(),
      dependencies: [],
      status: 'in_progress'
    };

    agentSession.currentTask = task;
    agentSession.status = 'busy';

    // This would coordinate with the actual agent
    // For now, simulate task execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return {
      success: true,
      goal: task.description,
      duration: Math.random() * 5000
    };
  }

  /**
   * Execute tool call
   */
  private async executeToolCall(toolName: string, step: ExecutionStep): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return await tool.execute(step.payload);
  }

  /**
   * Execute generic action
   */
  private async executeGenericAction(step: ExecutionStep): Promise<unknown> {
    // Handle other action types
    switch (step.type) {
      case 'tool_call':
        // Handle notifications and other tool calls
        if (step.name.includes('notification') || step.name.includes('signal')) {
          return { message: 'Notification sent', recipients: [] };
        }
        return { result: 'Tool call executed', tool: step.name };
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { waited: true };
      default:
        return { executed: true };
    }
  }

  /**
   * Check if step is critical
   */
  private isCriticalStep(step: ExecutionStep): boolean {
    // Since ExecutionStep doesn't have priority, use a default approach
    return step.type === 'agent_task' || step.type === 'decision';
  }

  /**
   * Generate outcome summary
   */
  private generateOutcomeSummary(results: ActionResult[]): string {
    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return `Execution completed: ${completed} successful, ${failed} failed`;
  }

  /**
   * Get next actions
   */
  private getNextActions(results: ActionResult[]): string[] {
    return results
      .filter(r => r.status === 'failed')
      .map(r => `Retry failed action: ${r.error}`);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(results: ActionResult[]): Recommendation[] {
    return results
      .filter(r => r.status === 'failed')
      .map(r => ({
        type: 'spawn_agent' as const,
        target: 'developer',
        payload: { retryAction: r.actionId, error: r.error },
        reasoning: `Consider retrying the failed action: ${r.error}`,
        priority: 5
      }));
  }

  /**
   * Extract lessons from results
   */
  private extractLessons(results: ActionResult[]): string[] {
    const lessons: string[] = [];

    if (results.some(r => r.status === 'failed')) {
      lessons.push('Some actions failed - review error handling');
    }

    if (results.some(r => r.duration && r.duration > 10000)) {
      lessons.push('Some actions took longer than expected - consider optimization');
    }

    return lessons;
  }

  /**
   * Get active agent count
   */
  private getActiveAgentCount(): number {
    return Array.from(this.agents.values()).filter(a => a.status === 'busy').length;
  }

  /**
   * Count tools used
   */
  private countToolsUsed(results: ActionResult[]): number {
    return results.filter(r =>
      r.result &&
      typeof r.result === 'object' &&
      (r.result as ActionResultWithTool).toolUsed
    ).length;
  }

  /**
   * Calculate token usage
   */
  private calculateTokenUsage(results: ActionResult[]): number {
    return results.reduce((total, r) => total + (r.tokenUsage || 0), 0);
  }

  /**
   * Record decision in memory
   */
  private async recordDecision(decisionId: string, payload: InspectorPayload, decision: OrchestratorDecision, chainOfThought: ChainOfThoughtResult, outcome: DecisionOutcome): Promise<void> {
    const record: DecisionRecord = {
      id: decisionId,
      timestamp: new Date(),
      payload,
      decision,
      reasoning: chainOfThought,
      actions: [],
      outcome,
      tokenUsage: {
        input: 0,
        output: 0,
        total: 0,
        cost: 0
      },
      processingTime: 0,
      confidence: decision.confidence,
      agentsInvolved: decision.agents.map(a => a.agentId),
      checkpoints: []
    };

    this.decisions.set(decisionId, record);
    this.state.decisionHistory.push(record);

    // Store in persistent storage - temporarily disabled due to type issues
    // await storageManager.saveSignal({
    //   id: decisionId,
    //   type: 'decision',
    //   priority: decision.priority,
    //   source: 'orchestrator',
    //   timestamp: record.timestamp,
    //   data: {
    //     decision,
    //     outcome: outcome.success
    //   },
    //   metadata: {
    //     resolved: false,
    //     agent: 'orchestrator'
    //   }
    // });
  }

  /**
   * Update metrics
   */
  private updateMetrics(outcome: DecisionOutcome, processingTime: number): void {
    const metrics = this.state.metrics;

    metrics.totalDecisions++;
    if (outcome.success) {
      metrics.successfulDecisions++;
    } else {
      metrics.failedDecisions++;
    }

    // Update average processing time
    const totalTime = metrics.averageDecisionTime * (metrics.totalDecisions - 1) + processingTime;
    metrics.averageDecisionTime = totalTime / metrics.totalDecisions;

    // Update token usage
    metrics.averageTokenUsage.total += outcome.metrics.tokenConsumed;
    metrics.averageTokenUsage.cost += outcome.metrics.tokenConsumed * 0.0001; // Simplified cost calculation

    // Update agent utilization
    metrics.agentUtilization.active = this.getActiveAgentCount();
    metrics.agentUtilization.total = this.agents.size;
  }

  /**
   * Get system state
   */
  private getSystemState() : unknown {
    return {
      status: this.state.status,
      activeDecisions: this.activeDecisions.size,
      agentCount: this.agents.size,
      queueLength: this.decisions.size,
      memoryUsage: process['memoryUsage']?.() || {},
      uptime: Date.now() - this.state.metrics.startTime.getTime()
    };
  }

  /**
   * Get current constraints
   */
  private async getCurrentConstraints(): Promise<Constraint[]> {
    const constraints = [];

    // Token budget constraint
    const tokenState = storageManager.getTokenState();
    if (tokenState.limits.globalLimits?.daily && tokenState.accounting.totalUsed > tokenState.limits.globalLimits.daily * 0.9) {
      constraints.push({
        type: 'token_budget',
        description: 'Approaching token usage limit',
        severity: 'warning'
      });
    }

    return constraints;
  }

  /**
   * Get current goals
   */
  private async _getCurrentGoals(): Promise<Goal[]> {
    const goals: unknown[] = [];

    // Get active PRPs as goals
    const prps = storageManager.getAllPRPs();
    prps
      .filter(prp => prp.status === 'active')
      .forEach(prp => {
        goals.push({
          type: 'prp_completion',
          description: `Complete PRP: ${prp.name}`,
          priority: prp.metadata.priority || 5,
          deadline: null
        });
      });

    return goals;
  }

  /**
   * Get current goals (public wrapper)
   */
  async getCurrentGoals(): Promise<Goal[]> {
    return await this._getCurrentGoals();
  }

  /**
   * Get applicable guidelines
   */
  private async getApplicableGuidelines(): Promise<Guideline[]> {
    return guidelinesRegistry.getEnabledGuidelines();
  }

  /**
   * Calculate token budget
   */
  private calculateTokenBudget(): number {
    const tokenState = storageManager.getTokenState();
    return Math.max(0, (tokenState.limits.globalLimits?.daily || 0) - tokenState.accounting.totalUsed);
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return !message.includes('authentication') &&
           !message.includes('permission') &&
           !message.includes('invalid') &&
           !message.includes('quota');
  }

  /**
   * Get error suggestions
   */
  private getErrorSuggestions(error: unknown): string[] {
    const suggestions = [];
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('timeout')) {
      suggestions.push('Consider increasing timeout or breaking down the task');
    }

    if (message.includes('token')) {
      suggestions.push('Check token budget and optimize prompts');
    }

    if (message.includes('network')) {
      suggestions.push('Check network connectivity and retry');
    }

    return suggestions;
  }

  /**
   * Prompt templates
   */
  private getSystemPrompt(): string {
    return `You are the Orchestrator for the PRP system, a musical metaphor for project management and AI agent coordination.

Your role is to:
1. Make intelligent decisions based on signals and context
2. Coordinate multiple AI agents using chain-of-thought reasoning
3. Use available tools to gather information and execute actions
4. Ensure smooth progression toward project goals
5. Maintain harmony in the "orchestra" of agents

You have access to:
- Multiple AI agents (Claude, Codex, Gemini, etc.)
- File system tools (read files, git operations)
- System tools (execute commands)
- Network tools (HTTP requests)
- Database tools (if configured)
- Communication tools (send messages, create notes)

Follow these principles:
- Use chain-of-thought reasoning for complex decisions
- Consider the musical metaphor: coordination, harmony, rhythm
- Prioritize based on signal priority and project impact
- Maintain context awareness and learn from patterns
- Escalate when uncertain or when human input is needed

Always provide reasoning for your decisions and be transparent about your confidence level.`;
  }

  private getDecisionMakingPrompt(): string {
    return `Based on the provided context and chain-of-thought analysis, make a decision about how to handle the current situation.

Consider:
1. The urgency and priority of signals
2. Available agents and their capabilities
3. Current project state and constraints
4. Token budget and resource limits
5. Potential risks and mitigation strategies

Provide:
- Decision type (coordinate, analyze, execute, delegate, escalate, wait)
- Specific actions to be taken
- Agent assignments if coordination is needed
- Tools to be used
- Estimated duration and token usage
- Confidence level in your decision

Format your response as JSON with this structure:
{
  "type": "coordinate|analyze|execute|delegate|escalate|wait",
  "priority": number (1-10),
  "reasoning": "Detailed reasoning for your decision",
  "confidence": number (0-1),
  "actions": [...],
  "agents": [...],
  "tools": [...],
  "estimatedDuration": number (ms),
  "tokenEstimate": number
}`;
  }

  private getChainOfThoughtPrompt(): string {
    return `Think through this step by step, considering all relevant information before making a decision.

1. **Analyze**: What is the core issue or need?
2. **Consider**: What resources and options are available?
3. **Evaluate**: What are the pros and cons of different approaches?
4. **Decide**: What is the optimal course of action?

Context:
{{context}}

Provide your chain of thought analysis as JSON:
{
  "steps": [
    {
      "type": "analyze|consider|evaluate|decide",
      "content": "Your reasoning for this step",
      "reasoning": "Detailed explanation",
      "confidence": number (0-1)
    }
  ],
  "confidence": number (0-1),
  "reasoning": "Overall reasoning summary",
  "decision": "Your final decision"
}`;
  }

  private getToolSelectionPrompt(): string {
    return `Select the appropriate tools to accomplish your decision.

Available tools:
{{availableTools}}

For each tool, consider:
- Is it necessary for this task?
- Do we have the required permissions?
- What are the token costs?
- Are there any dependencies?

Format your response as JSON:
{
  "tools": [...],
  "reasoning": "Why these tools were selected"
}`;
  }

  private getAgentCoordinationPrompt(): string {
    return `Coordinate with AI agents to execute your decision.

Available agents:
{{availableAgents}}

For coordination:
- Match agent capabilities to task requirements
- Consider agent workload and availability
- Provide clear instructions and context
- Set appropriate timeouts and checkpoints

Format your response as JSON:
{
  "agents": [
    {
      "agentId": "string",
      "role": "string",
      "task": "string",
      "instructions": "string",
      "tools": ["string"],
      "priority": number,
      "estimatedDuration": number
    }
  ]
}`;
  }

  private getCheckpointEvaluationPrompt(): string {
    return `Evaluate whether checkpoints have been reached successfully.

Checkpoints to evaluate:
{{checkpoints}}

For each checkpoint, provide:
- Status: passed/failed/warning/skipped
- Evidence collected
- Any concerns or issues
- Next steps needed

Format your response as JSON:
{
  "checkpoints": [
    {
      "checkpointId": "string",
      "status": "passed|failed|warning|skipped",
      "evidence": ["string"],
      "notes": "string",
      "agentId": "string"
    }
  ]
}`;
  }

  private getErrorHandlingPrompt(): string {
    return `Handle errors and exceptions that occurred during execution.

Errors encountered:
{{errors}}

For each error:
- Determine if it's recoverable
- Suggest recovery actions
- Decide whether to retry, escalate, or work around
- Document lessons learned

Format your response as JSON:
{
  "errors": [
    {
      "errorId": "string",
      "type": "type",
      "message": "string",
      "recoverable": boolean,
      "actions": ["string"],
      "lessons": ["string"]
    }
  ]
}`;
  }

  private getContextUpdatePrompt(): string {
    return `Update the context memory with new information.

New information to process:
{{updates}}

For each update:
- Assess relevance to current context
- Update memory appropriately
- Consider impact on ongoing decisions
- Maintain token budget constraints

Format your response as JSON:
{
  "updates": {
    "signals": [...],
    "decisions": [...],
    "notes": [...]
  },
  "summary": "Description of changes made"
}`;
  }

  /**
   * Build prompts with context substitution
   */
  private buildChainOfThoughtPrompt(context: unknown): string {
    let prompt = this.config.prompts.chainOfThought;
    prompt = prompt.replace('{{context}}', JSON.stringify(context, null, 2));
    return prompt;
  }

  private buildDecisionMakingPrompt(context: unknown): string {
    let prompt = this.config.prompts.decisionMaking;
    prompt = prompt.replace('{{context}}', JSON.stringify(context, null, 2));
    return prompt;
  }

  /**
   * Get current status
   */
  getStatus(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * Get metrics
   */
  getMetrics(): OrchestratorMetrics {
    return { ...this.state.metrics };
  }

  /**
   * Get agent session
   */
  getAgentSession(agentId: string): AgentSession | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agent sessions
   */
  getAllAgentSessions(): AgentSession[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get decision record
   */
  getDecision(decisionId: string): DecisionRecord | undefined {
    return this.decisions.get(decisionId);
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit?: number): DecisionRecord[] {
    const history = Array.from(this.decisions.values());
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get context memory
   */
  getContextMemory(): ContextMemory {
    return { ...this.contextMemory };
  }

  /**
   * Add agent to orchestrator
   */
  async addAgent(agentConfig: AgentConfig): Promise<void> {
    if (this.agents.size >= this.config.agents.maxActiveAgents) {
      throw new Error(`Maximum active agents (${this.config.agents.maxActiveAgents}) reached`);
    }

    const session: AgentSession = {
      id: agentConfig.id,
      agentId: agentConfig.id,
      agentConfig,
      status: 'idle',
      lastActivity: new Date(),
      tokenUsage: {
        total: 0,
        cost: 0,
        lastUpdated: new Date()
      },
      performance: {
        tasksCompleted: 0,
        averageTaskTime: 0,
        successRate: 0,
        errorCount: 0
      },
      capabilities: {
        supportsTools: agentConfig.capabilities.supportsTools,
        supportsImages: agentConfig.capabilities.supportsImages,
        supportsSubAgents: agentConfig.capabilities.supportsSubAgents,
        supportsParallel: agentConfig.capabilities.supportsParallel,
        maxContextLength: agentConfig.capabilities.maxContextLength,
        supportedModels: agentConfig.capabilities.supportedModels,
        availableTools: [], // placeholder - agentConfig.capabilities may not have availableTools
        specializations: agentConfig.roles || []
      }
    };

    this.agents.set(agentConfig.id, session);
    this.state.activeAgents.set(agentConfig.id, session);

    logger.info('addAgent', 'Agent added to orchestrator', {
      agentId: agentConfig.id,
      type: agentConfig.type
    });
  }

  /**
   * Remove agent from orchestrator
   */
  async removeAgent(agentId: string): Promise<boolean> {
    const session = this.agents.get(agentId);
    if (!session) {
      return false;
    }

    // Clean up active tasks
    if (session.currentTask) {
      // Cancel task or mark as failed
      logger.warn('removeAgent', 'Removing agent with active task', {
        agentId,
        taskId: session.currentTask.id
      });
    }

    this.agents.delete(agentId);
    this.state.activeAgents.delete(agentId);

    logger.info('removeAgent', 'Agent removed from orchestrator', {
      agentId
    });

    return true;
  }

  /**
   * Update context memory
   */
  async updateContextMemory(updates: {
    signals?: Signal[];
    decisions?: DecisionRecord[];
    notes?: unknown[];
  }): Promise<void> {
    if (updates.signals) {
      updates.signals.forEach(signal => {
        this.contextMemory.signals.set(signal.id, signal);
      });
    }

    if (updates.decisions) {
      updates.decisions.forEach(decision => {
        this.contextMemory.decisions.set(decision.id, decision);
      });
    }

    if (updates.notes) {
      updates.notes.forEach(note => {
        this.contextMemory.sharedNotes.set((note as { id?: string }).id || 'unknown', note as SharedNote);
      });
    }

    this.contextMemory.lastUpdate = new Date();
    this.contextMemory.size = TokenCounter.estimateTokensFromObject(this.contextMemory);

    // Compress if needed
    if (this.contextMemory.size > this.contextMemory.maxSize) {
      await this.compressContextMemory();
    }
  }

  /**
   * Compress context memory
   */
  private async compressContextMemory(): Promise<void> {
    // Implement context compression strategy
    // For now, remove old items
    const cutoffDate = TimeUtils.hoursAgo(2);

    // Remove old signals
    Array.from(this.contextMemory.signals.entries()).forEach(([id, signal]) => {
      if (new Date(signal.timestamp) < cutoffDate) {
        this.contextMemory.signals.delete(id);
      }
    });

    // Remove old decisions
    Array.from(this.contextMemory.decisions.entries()).forEach(([id, decision]) => {
      if (new Date(decision.timestamp) < cutoffDate) {
        this.contextMemory.decisions.delete(id);
      }
    });

    // Update size
    this.contextMemory.size = TokenCounter.estimateTokensFromObject(this.contextMemory);
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    logger.info('shutdown', 'Shutting down orchestrator');

    // Cancel active decisions
    Array.from(this.activeDecisions.entries()).forEach(([id, _promise]) => {
      try {
        // Cancel the promise
        logger.info('shutdown', 'Cancelling active decision', { decisionId: id });
      } catch (error) {
        logger.warn('shutdown', 'Failed to cancel decision', { decisionId: id, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Cleanup agents
    Array.from(this.agents.entries()).forEach(([id, session]) => {
      if (session.currentTask) {
        logger.info('shutdown', 'Cleaning up agent session', { agentId: id });
      }
    });

    this.agents.clear();
    this.state.activeAgents.clear();
    this.decisions.clear();
    this.executionPlans.clear();

    this.removeAllListeners();
    logger.info('shutdown', 'Orchestrator shutdown complete');
  }
}

/**
 * Tool Implementation Class
 */
class ToolImplementationClass {
  private config: unknown;

  constructor(config: unknown) {
    this.config = config;
  }

  async execute(parameters: unknown): Promise<unknown> {
    // This would implement the actual tool functionality
    // For now, return mock results
    switch ((this.config as { name?: string }).name as string) {
      case 'file_reader':
        return this.executeFileReader(parameters);
      case 'git_operations':
        return this.executeGitOperations(parameters);
      case 'bash_command':
        return this.executeBashCommand(parameters);
      case 'http_request':
        return this.executeHttpRequest(parameters);
      default:
        throw new Error(`Tool not implemented: ${(this.config as { name?: string }).name}`);
    }
  }

  private async executeFileReader(parameters: unknown): Promise<unknown> {
    // Mock implementation
    const params = parameters as { path?: string };
    return {
      content: `File content from ${params.path || 'unknown'}`,
      size: 1024,
      lines: 10
    };
  }

  private async executeGitOperations(parameters: unknown): Promise<unknown> {
    // Mock implementation
    const params = parameters as { command?: string };
    return {
      output: `Git command executed: ${params.command || 'unknown'}`,
      status: 'success'
    };
  }

  private async executeBashCommand(parameters: unknown): Promise<unknown> {
    // Mock implementation
    const params = parameters as { command?: string };
    return {
      output: `Command executed: ${params.command || 'unknown'}`,
      exitCode: 0,
      duration: 1000
    };
  }

  private async executeHttpRequest(parameters: unknown): Promise<unknown> {
    // Mock implementation
    const params = parameters as { url?: string };
    return {
      status: 200,
      body: `Response from ${params.url || 'unknown'}`,
      headers: {}
    };
  }
}


// Global orchestrator instance
export const orchestrator = new Orchestrator();

/**
 * Initialize orchestrator system
 */
export async function initializeOrchestrator(_config?: Partial<OrchestratorConfig>): Promise<Orchestrator> {
  // Initialize storage and guidelines if needed
  await storageManager.initialize();
  await guidelinesRegistry.load();

  // Initialize global orchestrator (includes tmux system)
  await orchestrator.initialize();

  return orchestrator;
}