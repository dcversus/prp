/**
 * ♫ Orchestrator Core for @dcversus/prp
 *
 * LLM-based orchestration with chain of thought reasoning, tool execution,
 * and shared context management across PRPs.
 */

import { EventEmitter } from 'events';
import { Signal, PRPFile, InspectorPayload, AgentStatus } from '../shared/types';
import { OrchestratorConfig, OrchestratorState, Tool, ChainOfThought, AgentTask } from './types';
import { ToolRegistry } from './tool-registry';
import { ContextManager } from './context-manager';
import { CoTProcessor, ProcessingContext } from './cot-processor';
import { AgentManager } from './agent-manager';
import { SignalResolutionEngine } from './signal-resolution-engine';
import { TokenMonitoringTools } from './tools/token-monitoring-tools';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('orchestrator');

/**
 * Orchestrator Core - Central coordination with LLM-based decision making
 */
export class OrchestratorCore extends EventEmitter {
  private state: OrchestratorState;
  private toolRegistry: ToolRegistry;
  private contextManager: ContextManager;
  private cotProcessor: CoTProcessor;
  private agentManager: AgentManager;
  private signalResolutionEngine: SignalResolutionEngine;
  private isRunning = false;
  private activePRPs: Map<string, PRPFile> = new Map();
  private signalQueue: Signal[] = [];
  private processingHistory: Array<{
    timestamp: Date;
    signal: Signal;
    action: string;
    result: unknown;
    tokenUsage: number;
  }> = [];

  constructor(_config: OrchestratorConfig) {
    super();

    this.state = {
      status: 'idle',
      activeAgents: new Map(),
      decisionHistory: [],
      contextMemory: {
        signals: new Map(),
        decisions: new Map(),
        agentStates: new Map(),
        systemMetrics: new Map(),
        conversationHistory: [],
        sharedNotes: new Map(),
        lastUpdate: new Date(),
        size: 0,
        maxSize: 1000000
      },
      chainOfThought: {
        id: '',
        depth: 0,
        currentStep: 0,
        steps: [],
        context: {
          originalPayload: {} as InspectorPayload,
          signals: [],
          activeGuidelines: [],
          availableAgents: [],
          systemState: {},
          previousDecisions: [],
          constraints: []
        },
        status: 'active'
      },
      metrics: {
        startTime: new Date(),
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

    this.toolRegistry = new ToolRegistry();
    this.contextManager = new ContextManager({ total: 100000 });
    this.cotProcessor = new CoTProcessor();
    this.agentManager = new AgentManager(_config);
    this.signalResolutionEngine = new SignalResolutionEngine(this);

    // Register token monitoring tools
    const tokenMonitoring = new TokenMonitoringTools();
    this.toolRegistry.registerTool(tokenMonitoring.get_current_token_caps());
    this.toolRegistry.registerTool(tokenMonitoring.get_latest_scanner_metrics());
    this.toolRegistry.registerTool(tokenMonitoring.track_token_distribution());
    this.toolRegistry.registerTool(tokenMonitoring.real_time_token_monitoring());
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Orchestrator is already running');
    }

    logger.info('start', 'Starting orchestrator');

    try {
      // Initialize components
      await this.toolRegistry.initialize();
      await this.contextManager.initialize();
      await this.cotProcessor.initialize();
      await this.agentManager.initialize();

      // Load active PRPs
      await this.loadActivePRPs();

      // Start signal processing loop
      this.startSignalProcessing();

      this.isRunning = true;
      this.state.status = 'thinking';
      this.state.lastActivity = new Date();

      logger.info('start', 'Orchestrator started successfully');
      this.emit('orchestrator:started', { timestamp: new Date() });

    } catch (error) {
      logger.error('start', 'Failed to start orchestrator',
        error instanceof Error ? error : new Error(String(error))
      );
      this.emit('orchestrator:error', error);
      throw error;
    }
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('stop', 'Stopping orchestrator...');

    try {
      // Stop all components
      await this.agentManager.stopAll();
      await this.cotProcessor.cleanup();
      await this.contextManager.cleanup();

      this.isRunning = false;
      this.state.status = 'stopped';

      logger.info('stop', 'Orchestrator stopped successfully');
      this.emit('orchestrator:stopped', { timestamp: new Date() });

    } catch (error) {
      logger.error('stop', 'Error stopping orchestrator',
        error instanceof Error ? error : new Error(String(error))
      );
      this.emit('orchestrator:error', error);
    }
  }

  /**
   * Process a signal through the orchestrator
   */
  async processSignal(signal: Signal): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Orchestrator is not running');
    }

    logger.info('processSignal', 'Processing signal', {
      signalType: signal.type,
      signalId: signal.id
    });

    try {
      // Add to signal queue
      this.signalQueue.push(signal);

      // Update state
      if (this.state.lastActivity) {
        this.state.lastActivity = new Date();
      }
      if (this.state.processingCount) {
        this.state.processingCount++;
      }

      // Process the signal
      const result = await this.executeSignalProcessing(signal);

      // Record processing history
      const resultWithTokenUsage = result as { tokenUsage?: number; [key: string]: unknown };
      this.processingHistory.push({
        timestamp: new Date(),
        signal,
        action: 'processed',
        result,
        tokenUsage: resultWithTokenUsage.tokenUsage ?? 0
      });

      // Update token usage
      if (this.state.sharedContext?.systemMetrics) {
        this.state.sharedContext.systemMetrics.tokensUsed += resultWithTokenUsage.tokenUsage ?? 0;
      }

      this.emit('orchestrator:signal_processed', { signal, result });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('processSignal', 'Error processing signal');

      this.emit('orchestrator:signal_error', { signal, error: errorMessage });
    }
  }

  /**
   * Execute signal processing with resolution engine
   */
  private async executeSignalProcessing(signal: Signal): Promise<unknown> {
    const startTime = Date.now();

    try {
      // 1. Get the PRP context for this signal if available
      const prpId = typeof signal.data === 'object' && 'prpId' in signal.data
        ? (signal.data as { prpId: string }).prpId
        : undefined;
      const prp = prpId ? this.activePRPs.get(prpId) :
                 Array.from(this.activePRPs.values()).find(p =>
                   p.content?.includes(`[${signal.type}]`)
                 );

      // 2. Use signal resolution engine for comprehensive processing
      const resolutionResult = await this.signalResolutionEngine.processSignal(signal, prp);

      // 3. Build context for the signal
      const context = await this.contextManager.buildContext(signal, this.state);

      // 4. Determine appropriate guideline and tools (fallback for complex scenarios)
      await this.determineGuideline(signal);
      const requiredTools = await this.determineRequiredTools(signal);

      // 5. Generate Chain of Thought for complex decisions
      const processingContext: ProcessingContext = {
        signals: [signal],
        availableAgents: Array.from(this.state.activeAgents.values()).map(agent => ({
          id: agent.id,
          name: agent.agentConfig.name,
          type: agent.agentConfig.type,
          status: agent.status,
          capabilities: agent.capabilities.availableTools
        })) ?? [],
        systemState: {
          status: this.state.status,
          metrics: this.state.metrics,
          resolutionResult // Include resolution result in systemState
        },
        previousDecisions: [],
        constraints: []
      };

      const cot = await this.cotProcessor.generateCoT(signal, processingContext, 'general-guideline');

      // 6. Execute tool calls based on CoT (for additional processing)
      const toolResults = await this.executeToolCalls(cot, requiredTools);

      // 7. Update shared context based on results
      await this.updateSharedContext(signal, cot);

      // 8. Determine next actions (from both resolution engine and CoT)
      const nextActions = await this.determineNextActions(signal, cot);

      // 9. Execute agent tasks if needed
      if (nextActions.agentTasks.length > 0) {
        await this.executeAgentTasks(nextActions.agentTasks);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: resolutionResult.success,
        processingTime,
        tokenUsage: (cot.tokenUsage || 0) + (toolResults.tokenUsage || 0),
        resolutionResult,
        chainOfThought: cot,
        toolResults,
        nextActions,
        context: context,
        actions: resolutionResult.actions,
        escalation: resolutionResult.escalation
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('executeSignalProcessing', 'Signal processing failed',
        error instanceof Error ? error : new Error(errorMessage),
        {
          signalType: signal.type
        }
      );

      return {
        success: false,
        processingTime,
        error: errorMessage,
        signal
      };
    }
  }

  /**
   * Determine appropriate guideline for signal
   */
  private async determineGuideline(_signal: Signal): Promise<string> {
    // Map signal types to guidelines
    const signalGuidelines: Record<string, string> = {
      'pr': 'github-pr-guideline',
      'op': 'progress-update-guideline',
      'tt': 'testing-guideline',
      'Qb': 'quality-bug-guideline',
      'af': 'question-guideline',
      'At': 'attention-guideline',
      'Bb': 'blocker-guideline'
    };

    return signalGuidelines[_signal.type] ?? 'general-guideline';
  }

  /**
   * Determine required tools for signal processing
   */
  private async determineRequiredTools(_signal: Signal): Promise<Tool[]> {
    const baseTools = ['read_file', 'write_file', 'list_directory'];

    const signalSpecificTools: Record<string, string[]> = {
      'pr': ['github_api', 'git_commands'],
      'tt': ['test_runner', 'coverage_analyzer'],
      'Qb': ['code_analyzer', 'lint_checker'],
      'af': ['web_search', 'documentation_reader']
    };

    const toolNames = [...baseTools, ...(signalSpecificTools[_signal.type] ?? [])];

    return toolNames
      .map(name => this.toolRegistry.getTool(name))
      .filter(tool => tool !== null);
  }

  /**
   * Execute tool calls based on Chain of Thought
   */
  private async executeToolCalls(cot: ChainOfThought, tools: Tool[]): Promise<{
    results: unknown[];
    tokenUsage: number;
  }> {
    const results: unknown[] = [];
    let totalTokenUsage = 0;

    for (const step of cot.steps) {
      if (step.toolCall) {
        const tool = tools.find(t => t.name === step.toolCall?.toolName);
        if (tool) {
          try {
            const result = await this.toolRegistry.executeTool(
              tool.name,
              step.toolCall.parameters
            );

            results.push({
              step: step.id,
              tool: tool.name,
              result,
              success: true
            });

            totalTokenUsage += result.tokenUsage ?? 0;

          } catch (error) {
              logger.error('executeToolCalls', 'Tool execution failed');

            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({
              step: step.id,
              tool: tool.name,
              error: errorMessage,
              success: false
            });
          }
        }
      }
    }

    return { results, tokenUsage: totalTokenUsage };
  }

  /**
   * Update shared context based on processing results
   */
  private async updateSharedContext(
    _signal: Signal,
    cot: ChainOfThought
  ): Promise<void> {
    // Update warzone context if available
    if (this.state.sharedContext?.warzone) {
      if (cot.decision?.blockers) {
        this.state.sharedContext.warzone.blockers.push(...cot.decision.blockers);
      }

      if (cot.decision?.completed) {
        this.state.sharedContext.warzone.completed.push(...cot.decision.completed);
      }

      if (cot.decision?.next) {
        this.state.sharedContext.warzone.next.push(...cot.decision.next);
      }
    }

    // Update system metrics if available
    if (this.state.sharedContext?.systemMetrics) {
      this.state.sharedContext.systemMetrics.activeAgents = this.agentManager.getActiveAgentCount();
      this.state.sharedContext.systemMetrics.processingSignals = this.signalQueue.length;
    }

    // Note: persistContext needs to be implemented in ContextManager
    // await this.contextManager.persistContext(this.state.sharedContext);
  }

  /**
   * Determine next actions based on processing results
   */
  private async determineNextActions(
    _signal: Signal,
    cot: ChainOfThought
  ): Promise<{
    agentTasks: Array<{
      agentType: string;
      task: string;
      priority: number;
      context: unknown;
    }>;
    followUpSignals: Signal[];
    userNotifications: Array<{
      message: string;
      priority: string;
      channel: string;
    }>;
  }> {
    const agentTasks: Array<{
      agentType: string;
      task: string;
      priority: number;
      context: unknown;
    }> = [];
    const followUpSignals: Signal[] = [];
    const userNotifications: Array<{
      message: string;
      priority: string;
      channel: string;
    }> = [];

    // Extract actions from CoT decision
    if (cot.decision?.actions) {
      for (const action of cot.decision.actions) {
        if (action.type === 'agent_task') {
          agentTasks.push({
            agentType: action.agentType ?? 'unknown',
            task: action.task ?? 'unknown',
            priority: action.priority ?? 5,
            context: action.context ?? {} as Record<string, unknown>
          });
        } else if (action.type === 'signal') {
          const signalType = action.signalType ?? 'default';
          followUpSignals.push({
            id: HashUtils.generateId(),
            type: signalType,
            priority: action.priority ?? 5,
            source: 'orchestrator',
            timestamp: new Date(),
            data: (action.data ?? {}) as Record<string, unknown>,
            metadata: {} as Record<string, unknown>
          });
        } else if (action.type === 'notification') {
          userNotifications.push({
            message: action.message ?? 'unknown',
            priority: String(action.priority ?? 'medium'),
            channel: action.channel ?? 'default'
          });
        }
      }
    }

    return { agentTasks, followUpSignals, userNotifications };
  }

  /**
   * Execute agent tasks
   */
  private async executeAgentTasks(tasks: Array<{
    agentType: string;
    task: string;
    priority: number;
    context: unknown;
  }>): Promise<void> {
    for (const task of tasks) {
      try {
        const agentTask: AgentTask = {
          id: HashUtils.generateId(),
          type: task.agentType,
          description: task.task,
          priority: task.priority,
          payload: task.context,
          assignedAt: new Date(),
          dependencies: [],
          status: 'pending'
        };
        await this.agentManager.executeTask(agentTask);

        logger.info('executeAgentTasks', 'Agent task executed', {
          agentType: task.agentType,
          task: task.task
        });

      } catch {
        logger.error('executeAgentTasks', 'Agent task failed');
      }
    }
  }

  /**
   * Load active PRPs from storage
   */
  private async loadActivePRPs(): Promise<void> {
    // This would load PRPs from storage
    // For now, initialize with empty map
    this.activePRPs.clear();
  }

  /**
   * Start signal processing loop
   */
  private startSignalProcessing(): void {
    // Process signals from queue
    setInterval(async () => {
      if (this.signalQueue.length > 0 && this.state.status === 'thinking') {
        const signal = this.signalQueue.shift();
        if (signal) {
          await this.processSignal(signal);
        }
      }
    }, 1000); // Default 1 second interval
  }

  /**
   * Get current orchestrator status
   */
  getStatus(): OrchestratorState & {
    signalQueueLength: number;
    activePRPsCount: number;
    processingHistoryCount: number;
  } {
    return {
      ...this.state,
      signalQueueLength: this.signalQueue.length,
      activePRPsCount: this.activePRPs.size,
      processingHistoryCount: this.processingHistory.length
    };
  }

  /**
   * Get processing history
   */
  getProcessingHistory(limit: number = 50): Array<{
    timestamp: Date;
    signal: Signal;
    action: string;
    result: unknown;
    tokenUsage: number;
  }> {
    return this.processingHistory.slice(-limit);
  }

  /**
   * Get active PRPs
   */
  getActivePRPs(): Map<string, PRPFile> {
    return new Map(this.activePRPs);
  }

  /**
   * Add or update PRP
   */
  async updatePRP(prp: PRPFile): Promise<void> {
    this.activePRPs.set(prp.name, prp);

    // Update context with PRP information
    await this.contextManager.updatePRPContext(prp);

    this.emit('orchestrator:prp_updated', { prp });
  }

  /**
   * Execute direct command
   */
  async executeCommand(command: string, parameters: unknown = {}): Promise<unknown> {
    logger.info('executeCommand', 'Executing direct command', {
      command,
      parameters
    });

    try {
      // Create a synthetic signal for command execution
      const signal: Signal = {
        id: HashUtils.generateId(),
        type: 'cmd',
        priority: 10, // High priority for direct commands
        source: 'user',
        timestamp: new Date(),
        data: {
          command,
          parameters,
          timestamp: new Date()
        },
        metadata: {}
      };

      return await this.executeSignalProcessing(signal);

    } catch (error) {
      logger.error('executeCommand', 'Command execution failed');
      throw error;
    }
  }

  /**
   * Get available tools
   */
  getAvailableTools(): Tool[] {
    return this.toolRegistry.getAllTools();
  }

  /**
   * Get agent statuses
   */
  getAgentStatuses(): Map<string, AgentStatus> {
    return this.agentManager.getAllStatuses();
  }

  /**
   * Get signal resolution engine
   */
  getSignalResolutionEngine(): SignalResolutionEngine {
    return this.signalResolutionEngine;
  }

  /**
   * Get active signal workflows
   */
  getActiveWorkflows() {
    return this.signalResolutionEngine.getActiveWorkflows();
  }

  /**
   * Get all available signal resolutions
   */
  getAllSignalResolutions() {
    return this.signalResolutionEngine.getAllResolutions();
  }

  /**
   * Add custom signal resolution
   */
  addSignalResolution(resolution: {
    signal: string;
    agent: string;
    action: string;
    context: string;
    priority: number;
    requirements: string[];
    expectedOutcome: string;
    successCriteria: string[];
  }): void {
    // Convert to SignalResolution format
    const signalResolution = {
      signalType: resolution.signal,
      category: 'custom',
      priority: resolution.priority,
      actions: [{
        type: 'agent_task' as const,
        priority: resolution.priority,
        description: resolution.action,
        agentType: resolution.agent,
        context: { customContext: resolution.context, requirements: resolution.requirements }
      }],
      successCriteria: resolution.successCriteria
    };
    this.signalResolutionEngine.addResolution(signalResolution);
  }

  /**
   * Get token monitoring status
   */
  getTokenMonitoringStatus() {
    return this.toolRegistry.executeTool('get_current_token_caps', { component: 'all' });
  }
}