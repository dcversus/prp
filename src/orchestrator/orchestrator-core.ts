/**
 * ♫ Orchestrator Core for @dcversus/prp
 *
 * LLM-based orchestration with chain of thought reasoning, tool execution,
 * and shared context management across PRPs.
 *
 * Token Distribution Configuration (200k total cap):
 * - Inspector payload: 40k
 * - Agents.md: 10k
 * - PRP content: 20k
 * - Shared context: 10k
 * - PRP context (CoT/tools): 70k
 * - Base/guideline prompts: 40k
 */
import { EventEmitter } from 'events';

import { EventBus } from '../shared/events';
import { createLayerLogger, HashUtils } from '../shared';
import { UnifiedSignalPipeline } from '../shared/signal-pipeline';

import { ToolRegistry } from './tool-registry';
import { EnhancedContextManager } from './enhanced-context-manager';
import { CoTProcessor } from './cot-processor';
import { AgentManager } from './agent-manager';
import { SignalResolutionEngine } from './signal-resolution-engine';
import { TokenMonitoringTools } from './tools/token-monitoring-tools';
import { CodemapOrchestratorAdapter } from './codemap-adapter';

import type { OrchestrationPlan, AgentRelevantInfo } from './codemap-adapter';
import type { ProcessingContext } from './cot-processor';
import type { OrchestratorConfig, OrchestratorState, Tool, ChainOfThought, AgentTask } from './types';
import type { CodemapData } from '../scanner/types';
import type { Signal, PRPFile, InspectorPayload, AgentState} from '../shared/types';

const logger = createLayerLogger('orchestrator');
// Token distribution caps per PRP requirements
export const TOKEN_DISTRIBUTION_CAPS = {
  TOTAL: 200000,
  INSPECTOR_PAYLOAD: 40000,
  AGENTS_MD: 10000,
  PRP_CONTENT: 20000,
  SHARED_CONTEXT: 10000,
  PRP_CONTEXT: 70000,
  BASE_PROMPT: 20000,
  GUIDELINE_PROMPT: 20000,
} as const;
// Token monitoring thresholds
export const TOKEN_THRESHOLDS = {
  WARNING: 0.8, // 80% of cap
  CRITICAL: 0.95, // 95% of cap
  COMPACTION: 0.85, // 85% triggers compaction
} as const;
/**
 * Orchestrator Core - Central coordination with LLM-based decision making
 */
export class OrchestratorCore extends EventEmitter {
  private readonly state: OrchestratorState;
  private readonly toolRegistry: ToolRegistry;
  private readonly tokenDistribution: {
    inspectorPayload: { used: number; cap: number };
    agentsMd: { used: number; cap: number };
    prpContent: { used: number; cap: number };
    sharedContext: { used: number; cap: number };
    prpContext: { used: number; cap: number };
    basePrompt: { used: number; cap: number };
    guidelinePrompt: { used: number; cap: number };
  };
  private readonly contextManager: EnhancedContextManager;
  private readonly cotProcessor: CoTProcessor;
  private readonly agentManager: AgentManager;
  private readonly signalResolutionEngine: SignalResolutionEngine;
  private readonly codemapAdapter: CodemapOrchestratorAdapter;
  private readonly eventBus: EventBus;
  private readonly pipeline: UnifiedSignalPipeline;
  private isRunning = false;
  private readonly activePRPs = new Map<string, PRPFile>();
  private readonly orchestrationPlans = new Map<string, OrchestrationPlan>();
  private readonly codemapCache = new Map<string, CodemapData>();
  private readonly signalQueue: Signal[] = [];
  private readonly processingHistory: Array<{
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
        maxSize: TOKEN_DISTRIBUTION_CAPS.TOTAL,
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
          constraints: [],
        },
        status: 'active',
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
          cost: 0,
        },
        agentUtilization: {
          active: 0,
          total: 0,
          averageTasksPerAgent: 0,
          successRate: 0,
        },
        toolUsage: {},
        checkpointStats: {
          total: 0,
          passed: 0,
          failed: 0,
          averageTime: 0,
        },
        chainOfThoughtStats: {
          averageDepth: 0,
          averageTime: 0,
          successRate: 0,
        },
      },
      sharedContext: {
        warzone: {
          blockers: [],
          completed: [],
          next: [],
        },
        systemMetrics: {
          tokensUsed: 0,
          activeAgents: 0,
          processingSignals: 0,
        },
      },
    };
    this.toolRegistry = new ToolRegistry();
    // Initialize token distribution tracking
    this.tokenDistribution = {
      inspectorPayload: { used: 0, cap: TOKEN_DISTRIBUTION_CAPS.INSPECTOR_PAYLOAD },
      agentsMd: { used: 0, cap: TOKEN_DISTRIBUTION_CAPS.AGENTS_MD },
      prpContent: { used: 0, cap: TOKEN_DISTRIBUTION_CAPS.PRP_CONTENT },
      sharedContext: { used: 0, cap: TOKEN_DISTRIBUTION_CAPS.SHARED_CONTEXT },
      prpContext: { used: 0, cap: TOKEN_DISTRIBUTION_CAPS.PRP_CONTEXT },
      basePrompt: { used: 0, cap: TOKEN_DISTRIBUTION_CAPS.BASE_PROMPT },
      guidelinePrompt: { used: 0, cap: TOKEN_DISTRIBUTION_CAPS.GUIDELINE_PROMPT },
    };
    this.contextManager = new EnhancedContextManager({ total: 100000 });
    this.cotProcessor = new CoTProcessor();
    this.eventBus = new EventBus();
    this.agentManager = new AgentManager(_config, this.eventBus);
    this.signalResolutionEngine = new SignalResolutionEngine(this);
    this.codemapAdapter = new CodemapOrchestratorAdapter(this.eventBus);
    // Initialize unified signal pipeline
    this.pipeline = new UnifiedSignalPipeline({
      inspectorQueue: {
        maxSize: 1000,
        batchSize: 10,
        flushInterval: 5000,
      },
      orchestratorQueue: {
        maxSize: 500,
        flushInterval: 1000,
      },
      tokenTracking: {
        inspectorCap: 1000000,
        orchestratorCap: 200000,
      },
    });
    // Set up pipeline listeners
    this.setupPipelineListeners();
    // Register token monitoring tools
    const tokenMonitoring = new TokenMonitoringTools();
    this.toolRegistry.registerTool(tokenMonitoring.get_current_token_caps());
    this.toolRegistry.registerTool(tokenMonitoring.get_latest_scanner_metrics());
    this.toolRegistry.registerTool(tokenMonitoring.track_token_distribution());
    this.toolRegistry.registerTool(tokenMonitoring.real_time_token_monitoring());
  }
  /**
   * Set up pipeline event listeners
   */
  private setupPipelineListeners(): void {
    // Listen for enhanced signals from inspector
    this.pipeline.on('orchestrator:queued', (data) => {
      logger.debug('orchestrator', 'Received enhanced signal from pipeline', data);
      // Convert enhanced signal back to regular signal for processing
      const { signal } = data;
      if (signal && typeof signal === 'object' && signal.id) {
        const regularSignal: Signal = {
          id: signal.id,
          type: signal.type || 'unknown',
          priority: signal.priority || 5,
          source: signal.source || 'inspector',
          timestamp: signal.timestamp || new Date(),
          data: signal.data || {},
        };
        // Process the signal
        void this.processSignal(regularSignal);
      }
    });

    this.pipeline.on('error', (error) => {
      logger.error('orchestrator', 'Pipeline error', error);
      this.emit('orchestrator:pipeline_error', error);
    });
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
      logger.error(
        'start',
        'Failed to start orchestrator',
        error instanceof Error ? error : new Error(String(error)),
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
      // Stop pipeline
      this.pipeline.stop();
      this.isRunning = false;
      this.state.status = 'stopped';
      logger.info('stop', 'Orchestrator stopped successfully');
      this.emit('orchestrator:stopped', { timestamp: new Date() });
    } catch (error) {
      logger.error(
        'stop',
        'Error stopping orchestrator',
        error instanceof Error ? error : new Error(String(error)),
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
      signalId: signal.id,
    });
    try {
      // Add to signal queue
      this.signalQueue.push(signal);
      // Update state
      if (this.state.lastActivity) {
        this.state.lastActivity = new Date();
      }
      if (this.state.processingCount !== undefined && this.state.processingCount !== null) {
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
        tokenUsage: resultWithTokenUsage.tokenUsage ?? 0,
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
      const prpId =
        typeof signal.data === 'object' && 'prpId' in signal.data
          ? (signal.data as { prpId: string }).prpId
          : undefined;
      const prp = prpId
        ? this.activePRPs.get(prpId)
        : Array.from(this.activePRPs.values()).find((p) => p.content?.includes(`[${signal.type}]`));
      // 2. Use signal resolution engine for comprehensive processing
      const resolutionResult = await this.signalResolutionEngine.processSignal(signal, prp);
      // 3. Build context for the signal
      const context = await this.contextManager.buildContext(signal, this.state);
      // 4. Get codemap analysis for intelligent agent selection
      const codemapAnalysis = await this.getCodemapAnalysisForSignal(signal, prp);

      // 5. Determine appropriate guideline and tools (fallback for complex scenarios)
      await this.determineGuideline(signal);
      const requiredTools = await this.determineRequiredTools(signal);

      // 6. Generate Chain of Thought for complex decisions with codemap insights
      const processingContext: ProcessingContext = {
        signals: [signal],
        availableAgents: await this.getEnhancedAvailableAgents(codemapAnalysis),
        systemState: {
          status: this.state.status,
          metrics: this.state.metrics,
          resolutionResult, // Include resolution result in systemState
          codemapAnalysis, // Include codemap analysis in system state
        },
        previousDecisions: [],
        constraints: [],
      };
      const cot = await this.cotProcessor.generateCoT(
        signal,
        processingContext,
        'general-guideline',
      );
      // Track token usage for CoT (part of PRP context)
      const cotTokens = cot.tokenUsage || 0;
      this.trackTokenUsage('PRP_CONTEXT', cotTokens);
      // 6. Execute tool calls based on CoT (for additional processing)
      const toolResults = await this.executeToolCalls(cot, requiredTools);
      // Track token usage for tools (part of PRP context)
      const toolTokens = toolResults.tokenUsage || 0;
      this.trackTokenUsage('PRP_CONTEXT', toolTokens);
      // 7. Update shared context based on results
      await this.updateSharedContext(signal, cot);
      // 8. Determine next actions (from both resolution engine and CoT)
      const nextActions = await this.determineNextActions(signal, cot);

      // 9. Execute agent tasks with codemap-enhanced coordination
      if (nextActions.agentTasks.length > 0) {
        await this.executeAgentTasksWithCodemap(nextActions.agentTasks, codemapAnalysis);
      }
      // Track token usage for inspector payload processing
      const inspectorTokens = Math.ceil(JSON.stringify(resolutionResult).length / 4); // Rough estimate
      this.trackTokenUsage('INSPECTOR_PAYLOAD', inspectorTokens);
      // Track token usage for PRP content (signal data)
      const prpTokens = Math.ceil(JSON.stringify(signal).length / 4);
      this.trackTokenUsage('PRP_CONTENT', prpTokens);
      const processingTime = Date.now() - startTime;
      const totalTokens = cotTokens + toolTokens + inspectorTokens + prpTokens;
      return {
        success: resolutionResult.success,
        processingTime,
        tokenUsage: totalTokens,
        tokenBreakdown: {
          cot: cotTokens,
          tools: toolTokens,
          inspector: inspectorTokens,
          prp: prpTokens,
        },
        resolutionResult,
        chainOfThought: cot,
        toolResults,
        nextActions,
        context: context,
        actions: resolutionResult.actions,
        escalation: resolutionResult.escalation,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'executeSignalProcessing',
        'Signal processing failed',
        error instanceof Error ? error : new Error(errorMessage),
        {
          signalType: signal.type,
        },
      );
      return {
        success: false,
        processingTime,
        error: errorMessage,
        signal,
      };
    }
  }
  /**
   * Determine appropriate guideline for signal
   */
  private async determineGuideline(_signal: Signal): Promise<string> {
    // Map signal types to guidelines
    const signalGuidelines: Record<string, string> = {
      pr: 'github-pr-guideline',
      op: 'progress-update-guideline',
      tt: 'testing-guideline',
      Qb: 'quality-bug-guideline',
      af: 'question-guideline',
      At: 'attention-guideline',
      Bb: 'blocker-guideline',
    };
    return signalGuidelines[_signal.type] ?? 'general-guideline';
  }
  /**
   * Determine required tools for signal processing
   */
  private async determineRequiredTools(_signal: Signal): Promise<Tool[]> {
    const baseTools = ['read_file', 'write_file', 'list_directory'];
    const signalSpecificTools: Record<string, string[]> = {
      pr: ['github_api', 'git_commands'],
      tt: ['test_runner', 'coverage_analyzer'],
      Qb: ['code_analyzer', 'lint_checker'],
      af: ['web_search', 'documentation_reader'],
    };
    const toolNames = [...baseTools, ...(signalSpecificTools[_signal.type] ?? [])];
    return toolNames.map((name) => this.toolRegistry.getTool(name)).filter((tool) => tool !== null);
  }
  /**
   * Execute tool calls based on Chain of Thought
   */
  private async executeToolCalls(
    cot: ChainOfThought,
    tools: Tool[],
  ): Promise<{
    results: unknown[];
    tokenUsage: number;
  }> {
    const results: unknown[] = [];
    let totalTokenUsage = 0;
    for (const step of cot.steps) {
      if (step.toolCall) {
        const tool = tools.find((t) => t.name === step.toolCall?.toolName);
        if (tool) {
          try {
            const result = await this.toolRegistry.executeTool(tool.name, step.toolCall.parameters);
            results.push({
              step: step.id,
              tool: tool.name,
              result,
              success: true,
            });
            totalTokenUsage += result.tokenUsage ?? 0;
          } catch (error) {
            logger.error('executeToolCalls', 'Tool execution failed');
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({
              step: step.id,
              tool: tool.name,
              error: errorMessage,
              success: false,
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
  private async updateSharedContext(_signal: Signal, cot: ChainOfThought): Promise<void> {
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
    cot: ChainOfThought,
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
            context: action.context ?? ({} as Record<string, unknown>),
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
            metadata: {} as Record<string, unknown>,
            resolved: false,
            relatedSignals: [],
          });
        } else if (action.type === 'notification') {
          userNotifications.push({
            message: action.message ?? 'unknown',
            priority: String(action.priority ?? 'medium'),
            channel: action.channel ?? 'default',
          });
        }
      }
    }
    return { agentTasks, followUpSignals, userNotifications };
  }
  /**
   * Execute agent tasks
   */
  private async executeAgentTasks(
    tasks: Array<{
      agentType: string;
      task: string;
      priority: number;
      context: unknown;
    }>,
  ): Promise<void> {
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
          status: 'pending',
        };
        await this.agentManager.executeTask(agentTask);
        logger.info('executeAgentTasks', 'Agent task executed', {
          agentType: task.agentType,
          task: task.task,
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
      processingHistoryCount: this.processingHistory.length,
    };
  }
  /**
   * Get processing history
   */
  getProcessingHistory(limit = 50): Array<{
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
      parameters,
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
          timestamp: new Date(),
        },
        metadata: {},
        resolved: false,
        relatedSignals: [],
      };
      return await this.executeSignalProcessing(signal);
    } catch (error) {
      logger.error('executeCommand', 'Command execution failed');
      throw error;
    }
  }
  /**
   * Token Management Methods
   */
  /**
   * Get current token distribution status
   */
  getTokenDistributionStatus() {
    const distribution = this.tokenDistribution;
    if (!distribution) {
      return null;
    }
    const total = Object.values(distribution).reduce((sum, cat) => sum + cat.used, 0);
    const totalCap = Object.values(distribution).reduce((sum, cat) => sum + cat.cap, 0);
    return {
      distribution: Object.entries(distribution).map(([key, value]) => ({
        category: key,
        used: value.used,
        cap: value.cap,
        percentage: Math.round((value.used / value.cap) * 100),
        status: this.getThresholdStatus(value.used, value.cap),
      })),
      total: {
        used: total,
        cap: totalCap,
        percentage: Math.round((total / totalCap) * 100),
        status: this.getThresholdStatus(total, totalCap),
      },
    };
  }
  /**
   * Get threshold status for token usage
   */
  private getThresholdStatus(used: number, cap: number): 'normal' | 'warning' | 'critical' {
    const percentage = used / cap;
    if (percentage >= TOKEN_THRESHOLDS.CRITICAL) {
      return 'critical';
    }
    if (percentage >= TOKEN_THRESHOLDS.WARNING) {
      return 'warning';
    }
    return 'normal';
  }
  /**
   * Track token usage for specific category
   */
  trackTokenUsage(category: keyof typeof TOKEN_DISTRIBUTION_CAPS, tokens: number): boolean {
    const distribution = this.tokenDistribution;
    const categoryMap: Record<
      keyof typeof TOKEN_DISTRIBUTION_CAPS,
      keyof typeof this.tokenDistribution
    > = {
      INSPECTOR_PAYLOAD: 'inspectorPayload',
      AGENTS_MD: 'agentsMd',
      PRP_CONTENT: 'prpContent',
      SHARED_CONTEXT: 'sharedContext',
      PRP_CONTEXT: 'prpContext',
      BASE_PROMPT: 'basePrompt',
      GUIDELINE_PROMPT: 'guidelinePrompt',
      TOTAL: 'inspectorPayload', // Fallback for TOTAL
    };

    const mappedCategory = categoryMap[category];
    if (!distribution || !(mappedCategory in distribution)) {
      return false;
    }
    const categoryUsage = distribution[mappedCategory];
    const newTotal = categoryUsage.used + tokens;
    if (newTotal > categoryUsage.cap) {
      logger.warn('trackTokenUsage', 'Token cap exceeded', {
        category,
        used: categoryUsage.used,
        additional: tokens,
        cap: categoryUsage.cap,
      });
      return false;
    }
    categoryUsage.used = newTotal;
    // Update system metrics
    if (this.state.sharedContext?.systemMetrics) {
      this.state.sharedContext.systemMetrics.tokensUsed = Object.values(distribution).reduce(
        (sum, cat) => sum + cat.used,
        0,
      );
    }
    // Check if we need to trigger compaction
    if (newTotal >= categoryUsage.cap * TOKEN_THRESHOLDS.COMPACTION) {
      this.emit('token_compaction_needed', { category, usage: categoryUsage });
    }
    // Check thresholds
    const status = this.getThresholdStatus(newTotal, categoryUsage.cap);
    if (status === 'critical') {
      this.emit('token_critical', { category, usage: categoryUsage });
    } else if (status === 'warning') {
      this.emit('token_warning', { category, usage: categoryUsage });
    }
    return true;
  }
  /**
   * Compact context to free up tokens
   */
  async compactContext(category?: keyof typeof TOKEN_DISTRIBUTION_CAPS): Promise<boolean> {
    try {
      logger.info('compactContext', 'Starting context compaction', { category });
      if (category) {
        // Compact specific category
        const distribution = this.tokenDistribution;
        const categoryMap: Record<
          keyof typeof TOKEN_DISTRIBUTION_CAPS,
          keyof typeof this.tokenDistribution
        > = {
          INSPECTOR_PAYLOAD: 'inspectorPayload',
          AGENTS_MD: 'agentsMd',
          PRP_CONTENT: 'prpContent',
          SHARED_CONTEXT: 'sharedContext',
          PRP_CONTEXT: 'prpContext',
          BASE_PROMPT: 'basePrompt',
          GUIDELINE_PROMPT: 'guidelinePrompt',
          TOTAL: 'inspectorPayload', // Fallback for TOTAL
        };

        const mappedCategory = categoryMap[category];
        if (distribution && mappedCategory in distribution) {
          const categoryUsage = distribution[mappedCategory];
          const targetSize = Math.floor(categoryUsage.cap * 0.7); // Compact to 70%
          if (category === 'PRP_CONTEXT') {
            // Compact PRP context while preserving CoT and tool history
            // TODO: Implement context compaction
            // await this.contextManager.compactContext(targetSize, {
            //   preserveChainOfThought: true,
            //   preserveToolHistory: true
            // });
          } else if (category === 'SHARED_CONTEXT') {
            // Compact shared context while preserving war-room memo format
            await this.compactSharedContext(targetSize);
          }
        }
      } else {
        // Compact all categories approaching limits
        const distribution = this.tokenDistribution;
        if (distribution) {
          for (const [cat, usage] of Object.entries(distribution)) {
            if (usage.used >= usage.cap * TOKEN_THRESHOLDS.COMPACTION) {
              await this.compactContext(cat as keyof typeof TOKEN_DISTRIBUTION_CAPS);
            }
          }
        }
      }
      logger.info('compactContext', 'Context compaction completed');
      this.emit('context_compacted', { category });
      return true;
    } catch (error) {
      logger.error('compactContext', 'Context compaction failed');
      this.emit('compaction_failed', { category, error });
      return false;
    }
  }
  /**
   * Compact shared context while preserving war-room memo format
   */
  private async compactSharedContext(targetSize: number): Promise<void> {
    if (!this.state.sharedContext?.warzone) {
      return;
    }
    const {warzone} = this.state.sharedContext;
    // Preserve recent items, compact older ones
    const maxItems = Math.floor(targetSize / 100); // Rough estimate of tokens per item
    warzone.blockers = warzone.blockers.slice(-maxItems);
    warzone.completed = warzone.completed.slice(-maxItems * 2); // Keep more completed items
    warzone.next = warzone.next.slice(-maxItems);
    // Emit compaction signal for agents to see
    this.emit('signal_generated', {
      type: 'co',
      message: 'Context compacted to maintain token limits',
      category: 'system',
      timestamp: new Date(),
    });
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
  getAgentStatees(): Map<string, AgentState> {
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
      actions: [
        {
          type: 'agent_task' as const,
          priority: resolution.priority,
          description: resolution.action,
          agentType: resolution.agent,
          context: { customContext: resolution.context, requirements: resolution.requirements },
        },
      ],
      successCriteria: resolution.successCriteria,
    };
    this.signalResolutionEngine.addResolution(signalResolution);
  }
  /**
   * Get token monitoring status
   */
  getTokenMonitoringStatus() {
    return this.toolRegistry.executeTool('get_current_token_caps', { component: 'all' });
  }

  /**
   * Codemap Integration Methods
   */

  /**
   * Get codemap analysis for signal processing
   */
  private async getCodemapAnalysisForSignal(
    signal: Signal,
    prp?: PRPFile,
  ): Promise<{
    relevantAgents: Map<string, AgentRelevantInfo>;
    orchestrationPlan?: OrchestrationPlan;
    dependencies: Map<string, string[]>;
    coordination: Array<{
      type: string;
      agents: string[];
      details: string;
    }>;
  }> {
    try {
      // Get or generate codemap data for the project
      const codemapData = await this.getProjectCodemap(prp);

      // Analyze which agents are relevant for this signal
      const relevantAgents = new Map<string, AgentRelevantInfo>();

      // Get relevant info for each agent type
      const agentTypes = [
        'robo-developer',
        'robo-quality-control',
        'robo-ux-ui-designer',
        'robo-devops-sre',
        'robo-system-analyst',
      ];

      for (const agentType of agentTypes) {
        try {
          const agentInfo = await this.codemapAdapter.getAgentRelevantInfo(codemapData, agentType);
          // Filter relevance based on signal type and content
          if (this.isSignalRelevantToAgent(signal, agentInfo)) {
            relevantAgents.set(agentType, agentInfo);
          }
        } catch (error) {
          logger.debug('getCodemapAnalysisForSignal', `Failed to get agent info for ${agentType}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Generate orchestration plan if we have relevant files
      let orchestrationPlan: OrchestrationPlan | undefined;
      if (relevantAgents.size > 0) {
        try {
          orchestrationPlan = await this.codemapAdapter.convertCodemapForOrchestration(
            codemapData,
            {
              includeRealTimeUpdates: true,
              optimizeForParallelExecution: true,
            },
          );
        } catch (error) {
          logger.debug('getCodemapAnalysisForSignal', 'Failed to create orchestration plan', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Extract dependencies from codemap
      const dependencies = new Map<string, string[]>();
      for (const [filePath, analysis] of Array.from(codemapData.files.entries())) {
        const deps = analysis.dependencies
          .filter((dep) => !dep.isExternal)
          .map((dep) => dep.module);
        dependencies.set(filePath, deps);
      }

      // Identify coordination needs
      const coordination = this.identifyCoordinationNeeds(relevantAgents, signal);

      return {
        relevantAgents,
        orchestrationPlan,
        dependencies,
        coordination,
      };
    } catch (error) {
      logger.error('getCodemapAnalysisForSignal', 'Failed to get codemap analysis', {
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // Return empty analysis on failure
      return {
        relevantAgents: new Map(),
        dependencies: new Map(),
        coordination: [],
      };
    }
  }

  /**
   * Get enhanced available agents with codemap insights
   */
  private async getEnhancedAvailableAgents(codemapAnalysis: {
    relevantAgents: Map<string, AgentRelevantInfo>;
  }): Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      relevance?: number;
      workload?: number;
      capabilities?: string[];
    }>
  > {
    const baseAgents = Array.from(this.state.activeAgents.values()).map((agent) => ({
      id: agent.id,
      name: agent.agentConfig.name,
      type: agent.agentConfig.type as string,
      status: agent.status,
      ...(agent.capabilities?.availableTools && {
        capabilities: agent.capabilities.availableTools,
      }),
    }));

    // Enhance with codemap relevance data
    return baseAgents
      .map((agent) => {
        const agentInfo = codemapAnalysis.relevantAgents.get(agent.type);
        return {
          ...agent,
          relevance: agentInfo ? this.calculateAgentRelevance(agentInfo) : 0,
          workload: agentInfo ? agentInfo.estimatedWorkload.complexity : 0,
        };
      })
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0)); // Sort by relevance
  }

  /**
   * Execute agent tasks with codemap-enhanced coordination
   */
  private async executeAgentTasksWithCodemap(
    tasks: Array<{
      agentType: string;
      task: string;
      priority: number;
      context: unknown;
    }>,
    codemapAnalysis: {
      relevantAgents: Map<string, AgentRelevantInfo>;
      orchestrationPlan?: OrchestrationPlan;
      coordination: Array<{
        type: string;
        agents: string[];
        details: string;
      }>;
    },
  ): Promise<void> {
    logger.info('executeAgentTasksWithCodemap', 'Executing tasks with codemap coordination', {
      taskCount: tasks.length,
      relevantAgents: codemapAnalysis.relevantAgents.size,
      coordinationNeeds: codemapAnalysis.coordination.length,
    });

    // Group tasks by coordination requirements
    const coordinatedTasks = this.groupTasksByCoordination(tasks, codemapAnalysis.coordination);

    // Execute tasks in coordination order
    for (const [coordinationType, taskGroup] of Array.from(coordinatedTasks.entries())) {
      if (coordinationType === 'parallel') {
        // Execute parallel tasks
        await Promise.all(
          taskGroup.map((task) => this.executeAgentTaskWithCodemapContext(task, codemapAnalysis)),
        );
      } else {
        // Execute sequential tasks
        for (const task of taskGroup) {
          await this.executeAgentTaskWithCodemapContext(task, codemapAnalysis);
        }
      }
    }
  }

  /**
   * Execute single agent task with codemap context
   */
  private async executeAgentTaskWithCodemapContext(
    task: {
      agentType: string;
      task: string;
      priority: number;
      context: unknown;
    },
    codemapAnalysis: {
      relevantAgents: Map<string, AgentRelevantInfo>;
      orchestrationPlan?: OrchestrationPlan;
    },
  ): Promise<void> {
    const agentTask: AgentTask = {
      id: HashUtils.generateId(),
      type: task.agentType,
      description: task.task,
      priority: task.priority,
      payload: {
        ...task.context,
        codemapContext: {
          relevantFiles: codemapAnalysis.relevantAgents.get(task.agentType)?.relevantFiles || [],
          dependencies: codemapAnalysis.relevantAgents.get(task.agentType)?.dependencies || [],
          coordinationNeeds:
            codemapAnalysis.relevantAgents.get(task.agentType)?.coordinationNeeds || [],
          workload: codemapAnalysis.relevantAgents.get(task.agentType)?.estimatedWorkload,
        },
      },
      assignedAt: new Date(),
      dependencies: [],
      status: 'pending',
    };

    await this.agentManager.executeTask(agentTask);

    logger.info('executeAgentTaskWithCodemapContext', 'Agent task executed with codemap context', {
      agentType: task.agentType,
      task: task.task,
      relevantFiles: agentTask.payload?.codemapContext?.relevantFiles?.length || 0,
    });
  }

  /**
   * Get project codemap data
   */
  private async getProjectCodemap(prp?: PRPFile): Promise<CodemapData> {
    // For now, return a basic codemap structure
    // In a real implementation, this would:
    // 1. Check if we have recent codemap data in cache
    // 2. Generate new codemap data using tree-sitter scanner
    // 3. Cache the result

    const cacheKey = prp?.name || 'default-project';

    if (this.codemapCache.has(cacheKey)) {
      const cached = this.codemapCache.get(cacheKey)!;
      // Check if cache is still fresh (less than 5 minutes old)
      if (Date.now() - cached.generatedAt.getTime() < 5 * 60 * 1000) {
        return cached;
      }
    }

    // Generate basic codemap structure
    const basicCodemap: CodemapData = {
      version: '1.0.0',
      generatedAt: new Date(),
      rootPath: process.cwd(),
      files: new Map(),
      dependencies: new Map(),
      metrics: {
        totalFiles: 0,
        totalLines: 0,
        totalFunctions: 0,
        totalClasses: 0,
        averageComplexity: 0,
        languageDistribution: new Map(),
        issueCount: 0,
        duplicateCodeBlocks: 0,
      },
      crossFileReferences: [],
    };

    this.codemapCache.set(cacheKey, basicCodemap);
    return basicCodemap;
  }

  /**
   * Check if signal is relevant to agent based on agent info
   */
  private isSignalRelevantToAgent(signal: Signal, agentInfo: AgentRelevantInfo): boolean {
    // Check if signal type matches agent expertise
    const signalTypeRelevance = {
      'robo-developer': ['dp', 'bf', 'tp', 'tw'],
      'robo-quality-control': ['tg', 'tr', 'cq', 'cp'],
      'robo-ux-ui-designer': ['du', 'ds', 'dh', 'dt'],
      'robo-devops-sre': ['id', 'ir', 'so', 'sc'],
      'robo-system-analyst': ['gg', 'ff', 'rp', 'vr'],
    };

    const relevantSignals =
      signalTypeRelevance[agentInfo.agentType as keyof typeof signalTypeRelevance] || [];

    // Check if agent has relevant files
    const hasRelevantFiles = agentInfo.relevantFiles.length > 0;

    // Check if signal type is in relevant signals
    const isSignalTypeRelevant = relevantSignals.includes(signal.type);

    return hasRelevantFiles || isSignalTypeRelevant;
  }

  /**
   * Calculate agent relevance score
   */
  private calculateAgentRelevance(agentInfo: AgentRelevantInfo): number {
    // Calculate relevance based on file count, complexity, and coordination needs
    const fileRelevance = Math.min(agentInfo.relevantFiles.length / 10, 1.0) * 0.4;
    const complexityRelevance = Math.min(agentInfo.estimatedWorkload.complexity / 100, 1.0) * 0.3;
    const coordinationRelevance = Math.min(agentInfo.coordinationNeeds.length / 5, 1.0) * 0.3;

    return fileRelevance + complexityRelevance + coordinationRelevance;
  }

  /**
   * Group tasks by coordination requirements
   */
  private groupTasksByCoordination(
    tasks: Array<{
      agentType: string;
      task: string;
      priority: number;
      context: unknown;
    }>,
    coordination: Array<{
      type: string;
      agents: string[];
      details: string;
    }>,
  ): Map<string, Array<(typeof tasks)[0]>> {
    const grouped = new Map<string, Array<(typeof tasks)[0]>>();

    // Default to parallel execution
    grouped.set('parallel', [...tasks]);

    // Apply coordination constraints
    for (const coord of coordination) {
      if (coord.type === 'sequence') {
        // Tasks that must be executed in sequence
        const sequentialTasks = tasks.filter((task) => coord.agents.includes(task.agentType));
        if (sequentialTasks.length > 0) {
          grouped.set('sequence', sequentialTasks);
          // Remove from parallel group
          const parallelTasks = grouped.get('parallel') || [];
          grouped.set(
            'parallel',
            parallelTasks.filter((task) => !coord.agents.includes(task.agentType)),
          );
        }
      }
    }

    return grouped;
  }

  /**
   * Identify coordination needs between agents
   */
  private identifyCoordinationNeeds(
    relevantAgents: Map<string, AgentRelevantInfo>,
    signal: Signal,
  ): Array<{
    type: string;
    agents: string[];
    details: string;
  }> {
    const coordination = [];

    // Check for shared files between agents
    const agentFiles = new Map<string, Set<string>>();
    for (const [agentType, agentInfo] of Array.from(relevantAgents.entries())) {
      const files = new Set(agentInfo.relevantFiles.map((f) => f.path));
      agentFiles.set(agentType, files);
    }

    // Find file overlaps
    const agentTypes = Array.from(agentFiles.keys());
    for (let i = 0; i < agentTypes.length; i++) {
      for (let j = i + 1; j < agentTypes.length; j++) {
        const agent1 = agentTypes[i] ?? '';
        const agent2 = agentTypes[j] ?? '';
        const files1 = agentFiles.get(agent1)!;
        const files2 = agentFiles.get(agent2)!;

        const sharedFiles = Array.from(files1).filter((file) => files2.has(file));
        if (sharedFiles.length > 0) {
          coordination.push({
            type: 'shared_file',
            agents: [agent1, agent2],
            details: `Shared files: ${sharedFiles.join(', ')}`,
          });
        }
      }
    }

    return coordination;
  }

  /**
   * Get orchestration plan by ID
   */
  getOrchestrationPlan(planId: string): OrchestrationPlan | null {
    return this.codemapAdapter.getOrchestrationPlan(planId);
  }

  /**
   * Get all orchestration plans
   */
  getOrchestrationPlans(): Map<string, OrchestrationPlan> {
    return new Map(this.orchestrationPlans);
  }

  /**
   * Handle codemap updates
   */
  async handleCodemapUpdate(
    updateType:
      | 'file_added'
      | 'file_modified'
      | 'file_deleted'
      | 'dependency_changed'
      | 'signal_detected',
    filePath: string,
  ): Promise<void> {
    try {
      const update = await this.codemapAdapter.handleCodemapUpdate(
        updateType,
        filePath,
        Array.from(this.orchestrationPlans.keys()),
      );

      logger.info('handleCodemapUpdate', 'Codemap update processed', {
        updateType,
        filePath,
        affectedAgents: update.affectedAgents.length,
      });

      // Invalidate codemap cache if needed
      this.codemapCache.clear();

      // Emit update event
      this.emit('codemap_updated', {
        update,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('handleCodemapUpdate', 'Failed to handle codemap update', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}
