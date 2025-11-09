/**
 * ♫ Inspector for @dcversus/prp
 *
 * GPT-5 mini classification and signal preparation system that analyzes signals,
 * prepares context, and generates structured 40k payloads for the orchestrator.
 */

import { EventEmitter } from 'events';
import {
  InspectorConfig,
  InspectorState,
  InspectorProcessing,
  DetailedInspectorResult,
  InspectorError,
  ProcessingContext,
  ModelResponse,
  InspectorMetrics,
  AgentStatusInfo,
  SharedNoteInfo,
  JSONSchema
} from './types';
import {
  Signal,
  InspectorPayload,
  SignalClassification,
  Recommendation,
  PreparedContext,
  createLayerLogger,
  TimeUtils,
  HashUtils,
  TokenCounter
} from '../shared';
import type { ActivityEntry } from './types';
import { guidelinesRegistry } from '../guidelines';
import { storageManager } from '../storage';

const logger = createLayerLogger('inspector');

// Interface for model response usage
interface ModelUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// Interface for model response
interface InspectorModelResponse {
  content: string;
  usage?: ModelUsage;
  finish_reason?: string;
}


/**
 * ♫ Inspector - The signal analysis conductor
 */
export class Inspector extends EventEmitter {
  private config: InspectorConfig;
  private state: InspectorState;
  private processingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private activeRequests: Map<string, Promise<unknown>> = new Map();

  constructor(config?: Partial<InspectorConfig>) {
    super();
    this.config = this.createConfig(config);
    this.state = this.createInitialState();
    this.setupEventHandlers();
  }

  /**
   * Create inspector configuration
   */
  private createConfig(overrides?: Partial<InspectorConfig>): InspectorConfig {
    const defaultConfig: InspectorConfig = {
      model: 'gpt-5-mini',
      maxTokens: 40000,
      temperature: 0.3,
      timeout: 60000, // 60 seconds
      batchSize: 10,
      maxConcurrentClassifications: 5,
      tokenLimits: {
        input: 30000,
        output: 10000,
        total: 40000
      },
      prompts: {
        classification: this.getClassificationPrompt(),
        contextPreparation: this.getContextPreparationPrompt(),
        recommendationGeneration: this.getRecommendationPrompt()
      },
      structuredOutput: {
        enabled: true,
        schema: this.getStructuredOutputSchema(),
        validation: true,
        fallbackToText: true
      }
    };

    return { ...defaultConfig, ...overrides };
  }

  /**
   * Create initial state
   */
  private createInitialState(): InspectorState {
    return {
      status: 'idle',
      queue: [],
      processing: new Map(),
      completed: new Map(),
      failed: new Map(),
      metrics: {
        startTime: TimeUtils.now(),
        totalProcessed: 0,
        successfulClassifications: 0,
        failedClassifications: 0,
        averageProcessingTime: 0,
        averageTokenUsage: {
          input: 0,
          output: 0,
          total: 0
        },
        successRate: 0,
        tokenEfficiency: 0,
        queueLength: 0,
        processingRate: 0,
        errorRate: 0,
        byCategory: {},
        byUrgency: {},
        performance: {
          fastestClassification: Infinity,
          slowestClassification: 0,
          peakThroughput: 0,
          memoryUsage: 0
        }
      }
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Event handlers would be set up by the event system
    // eventBus.subscribeToChannel('scanner', (event) => {
    //   if (event.type === 'scanner_signal_detected') {
    //     this.handleSignalDetected(event.data);
    //   }
    // });

    // eventBus.subscribeToChannel('guidelines', (event) => {
    //   if (event.type === 'guideline_triggered') {
    //     this.handleGuidelineTriggered(event.data);
    //   }
    // });
  }

  
  /**
   * Process a signal through the inspector pipeline
   */
  async processSignal(
    signal: Signal,
    _worktree?: string,
    options: { priority?: string; force?: boolean } = {}
  ): Promise<string> {
    const processingId = HashUtils.generateId();

    // Check if already processing
    if (this.activeRequests.has(processingId)) {
      return processingId;
    }

    // Add to queue
    if (options.force || options.priority === 'high') {
      this.state.queue.unshift(signal);
    } else {
      this.state.queue.push(signal);
    }

    // Create processing entry
    const processing: InspectorProcessing = {
      id: processingId,
      signal,
      startedAt: TimeUtils.now(),
      status: 'analyzing',
      tokenUsage: { input: 0, output: 0, total: 0 }
    };

    this.state.processing.set(processingId, processing);
    this.state.status = 'processing';

    // Emit event
    this.emit('signal_received', { signal, processingId, timestamp: TimeUtils.now() });
    // Event publishing would be handled by the event system
    // eventBus.publishToChannel('inspector', {
    //   id: processingId,
    //   type: 'inspector_signal_received',
    //   timestamp: TimeUtils.now(),
    //   source: 'inspector',
    //   metadata: {},
    //   data: { signal, processingId }
    // });

    // Process queue
    this.processQueue();

    return processingId;
  }

  /**
   * Process the signal queue
   */
  private async processQueue(): Promise<void> {
    if (this.state.processing.size >= this.config.maxConcurrentClassifications) {
      return;
    }

    while (this.state.queue.length > 0 && this.state.processing.size < this.config.maxConcurrentClassifications) {
      const signal = this.state.queue.shift()!;

      // Find processing entry
      const processing = Array.from(this.state.processing.values())
        .find(p => p.signal.id === signal.id);

      if (processing) {
        this.processSignalAsync(processing);
      }
    }
  }

  /**
   * Process a single signal asynchronously
   */
  private async processSignalAsync(processing: InspectorProcessing): Promise<void> {
    const request = this.activeRequests.get(processing.id);
    if (request) {
      return;
    }

    const processingPromise = this.executeSignalProcessing(processing);
    this.activeRequests.set(processing.id, processingPromise);

    try {
      await processingPromise;
    } catch (error) {
      logger.error('Inspector', 'Signal processing failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeRequests.delete(processing.id);

      // Continue processing queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Execute the full signal processing pipeline
   */
  private async executeSignalProcessing(processing: InspectorProcessing): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Inspector', 'Starting signal processing', {
        processingId: processing.id,
        signalType: processing.signal.type
      });

      // Step 1: Analyze signal and prepare context
      processing.status = 'analyzing';
      const context = await this.prepareProcessingContext(processing.signal);
      processing.context = context;

      // Step 2: Classify signal
      processing.status = 'classifying';
      const classification = await this.classifySignal(processing.signal, context);

      // Step 3: Prepare context for orchestrator
      processing.status = 'preparing_context';
      const preparedContext = await this.prepareContextForOrchestrator(classification, context);

      // Step 4: Generate payload
      processing.status = 'generating_payload';
      // Generate payload for orchestrator
    await this.generatePayload(classification, preparedContext);

      // Step 5: Generate recommendations
      const recommendations = await this.generateRecommendations(classification, context);

      // Convert to inspector types
      const inspectorClassification: import('./types').SignalClassification = {
        category: classification.category,
        subcategory: classification.category, // Use category as subcategory for now
        priority: classification.urgency === 'critical' ? 1 : classification.urgency === 'high' ? 3 : classification.urgency === 'medium' ? 5 : 7,
        agentRole: classification.suggestedRole,
        escalationLevel: classification.urgency === 'critical' ? 1 : 0,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        dependencies: [],
        confidence: classification.confidence
      };

      // Convert to inspector prepared context
      const inspectorPreparedContext: import('./types').PreparedContext = {
        id: HashUtils.generateId(),
        signalId: processing.signal.id,
        content: preparedContext as import('./types').ContextData,
        size: JSON.stringify(preparedContext).length,
        compressed: false,
        tokenCount: TokenCounter.estimateTokensFromObject(preparedContext)
      };

      // Convert to inspector payload
      const inspectorPayload: import('./types').InspectorPayload = {
        id: HashUtils.generateId(),
        signalId: processing.signal.id,
        classification: inspectorClassification,
        context: inspectorPreparedContext,
        recommendations: recommendations.map(rec => ({
          type: rec.type,
          priority: rec.priority.toString(),
          description: rec.reasoning,
          estimatedTime: 30, // Default 30 minutes
          prerequisites: []
        })),
        timestamp: TimeUtils.now(),
        size: JSON.stringify(preparedContext).length,
        compressed: false
      };

      // Create result
      const result: DetailedInspectorResult = {
        id: processing.id,
        signal: processing.signal,
        classification: inspectorClassification,
        context: inspectorPreparedContext,
        payload: inspectorPayload,
        recommendations: Array.isArray(recommendations) ? recommendations.map((rec: Recommendation) => ({
          type: rec.type ?? 'unknown',
          priority: rec.priority?.toString() ?? 'medium',
          description: rec.reasoning ?? 'No description available',
          estimatedTime: 30,
          prerequisites: []
        })) : [],
        processingTime: Date.now() - startTime,
        tokenUsage: {
          ...processing.tokenUsage,
          cost: this.calculateTokenCost(processing.tokenUsage.total)
        },
        model: this.config.model,
        timestamp: TimeUtils.now(),
        confidence: classification.confidence
      };

      // Store result
      this.state.completed.set(processing.id, result);
      this.state.processing.delete(processing.id);

      // Update metrics
      this.updateMetrics(result);

      // Emit completion event
      this.emit('processing_completed', { processingId: processing.id, result });
      // Event publishing would be handled by the event system
      // eventBus.publishToChannel('inspector', {
      //   id: processing.id,
      //   type: 'inspector_processing_completed',
      //   timestamp: TimeUtils.now(),
      //   source: 'inspector',
      //   metadata: {},
      //   data: { processingId: processing.id, result }
      // });

      // Forward to orchestrator
      // eventBus.publishToChannel('orchestrator', {
      //   id: HashUtils.generateId(),
      //   type: 'orchestrator_payload_ready',
      //   timestamp: TimeUtils.now(),
      //   source: 'inspector',
      //   metadata: {},
      //   data: { payload, signal: processing.signal }
      // });

      logger.info('Inspector', `Signal processing completed for ${processing.id}`, {
        processingId: processing.id,
        processingTime: result.processingTime,
        tokenUsage: result.tokenUsage.total,
        confidence: result.confidence
      });

    } catch (error) {
      // Create error entry
      const inspectorError: InspectorError = {
        id: processing.id,
        signal: processing.signal,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof Error ? {
            type: 'error',
            timestamp: new Date(),
            source: 'inspector',
            payload: { message: error.message, name: error.name }
          } : {
            type: 'error',
            timestamp: new Date(),
            source: 'inspector',
            payload: { message: String(error) }
          },
          stack: error instanceof Error ? error.stack : undefined
        },
        processingTime: Date.now() - startTime,
        tokenUsage: processing.tokenUsage,
        timestamp: TimeUtils.now(),
        retryCount: 0,
        recoverable: this.isRecoverableError(error)
      };

      this.state.failed.set(processing.id, inspectorError);
      this.state.processing.delete(processing.id);

      // Emit error event
      this.emit('processing_failed', { processingId: processing.id, error: inspectorError });
      // Event publishing would be handled by the event system
      // eventBus.publishToChannel('inspector', {
      //   id: processing.id,
      //   type: 'inspector_processing_failed',
      //   timestamp: TimeUtils.now(),
      //   source: 'inspector',
      //   metadata: {},
      //   data: { processingId: processing.id, error: inspectorError }
      // });

      logger.error('Inspector', `Signal processing failed for ${processing.id}`, error instanceof Error ? error : new Error(String(error)), {
        recoverable: inspectorError.recoverable
      });
    }
  }

  /**
   * Prepare processing context
   */
  private async prepareProcessingContext(signal: Signal): Promise<ProcessingContext> {
    const context: ProcessingContext = {
      signalId: signal.id,
      relatedSignals: await this.getRelatedSignals(),
      activePRPs: await this.getActivePRPs(),
      recentActivity: await this.getRecentActivity(),
      tokenStatus: await this.getTokenStatus(),
      agentStatus: await this.getAgentStatus(),
      sharedNotes: await this.getSharedNotes(),
      environment: await this.getEnvironmentInfo(),
      guidelineContext: await this.getGuidelineContext(),
      historicalData: await this.getHistoricalData()
    };

    return context;
  }

  /**
   * Classify signal using GPT-5 mini
   */
  private async classifySignal(signal: Signal, context: ProcessingContext): Promise<SignalClassification> {
    const prompt = this.buildClassificationPrompt(signal, context);

    try {
      const response = await this.callModel(prompt, {
        maxTokens: 2000,
        temperature: this.config.temperature
      });

      const classification = this.parseClassificationResponse(response, signal);

      logger.debug('Inspector', 'Signal classified', {
        signalId: signal.id,
        category: classification.category,
        urgency: classification.urgency,
        confidence: classification.confidence
      });

      return classification;

    } catch (error) {
      logger.error('Inspector', 'Classification failed', error instanceof Error ? error : new Error(String(error)));

      // Return fallback classification
      return {
        signal,
        category: 'general',
        urgency: 'medium',
        requiresAction: true,
        suggestedRole: 'robo-developer',
        confidence: 0.5
      };
    }
  }

  /**
   * Prepare context for orchestrator
   */
  private async prepareContextForOrchestrator(
    classification: SignalClassification,
    context: ProcessingContext
  ): Promise<PreparedContext> {
    return {
      summary: this.generateContextSummary(classification, context),
      activePRPs: context.activePRPs,
      blockedItems: this.identifyBlockedItems(),
      recentActivity: context.recentActivity.slice(0, 10), // Last 10 activities
      tokenStatus: {
          ...context.tokenStatus,
          used: context.tokenStatus.totalUsed
        },
      agentStatus: context.agentStatus.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        currentTask: agent.currentTask ?? undefined,
        lastActivity: agent.lastActivity,
        tokenUsage: {
          used: 0, // Default value since AgentStatusInfo doesn't have this
          limit: 10000 // Default limit
        },
        capabilities: {
          supportsTools: agent.capabilities.supportsTools,
          supportsImages: agent.capabilities.supportsImages,
          supportsSubAgents: agent.capabilities.supportsSubAgents,
          supportsParallel: agent.capabilities.supportsParallel,
          supportsCodeExecution: false,
          maxContextLength: agent.capabilities.maxContextLength,
          supportedModels: [],
          supportedFileTypes: [],
          canAccessInternet: false,
          canAccessFileSystem: false,
          canExecuteCommands: false
        }
      })),
      sharedNotes: context.sharedNotes.filter(note =>
        Array.isArray(note.relevantTo) && note.relevantTo.some(id =>
          [classification.signal.id, ...context.activePRPs].includes(id)
        )
      )
    };
  }

  /**
   * Generate payload for orchestrator
   */
  private async generatePayload(
    classification: SignalClassification,
    preparedContext: PreparedContext
  ): Promise<InspectorPayload> {
    const payload: InspectorPayload = {
      id: HashUtils.generateId(),
      timestamp: TimeUtils.now(),
      sourceSignals: [classification.signal],
      classification: [classification],
      recommendations: [], // Will be filled in next step
      context: preparedContext,
      estimatedTokens: TokenCounter.estimateTokensFromObject(preparedContext),
      priority: this.calculatePayloadPriority(classification)
    };

    // Ensure payload is within size limits
    if (payload.estimatedTokens > this.config.maxTokens) {
      payload.context = this.compressContext(payload.context);
      payload.estimatedTokens = TokenCounter.estimateTokensFromObject(payload.context);
    }

    return payload;
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    classification: SignalClassification,
    context: ProcessingContext
  ): Promise<Recommendation[]> {
    try {
      const prompt = this.buildRecommendationPrompt(classification, context);

      const response = await this.callModel(prompt, {
        maxTokens: 1500,
        temperature: 0.4
      });

      return this.parseRecommendationResponse(response);

    } catch (error) {
      logger.error('Inspector', 'Recommendation generation failed', error instanceof Error ? error : new Error(String(error)));

      // Return fallback recommendations
      return [{
        type: 'create_note',
        target: classification.suggestedRole,
        payload: { signalId: classification.signal.id },
        reasoning: 'Default recommendation due to processing error',
        priority: classification.urgency === 'critical' ? 10 : 5
      }];
    }
  }

  /**
   * Call the model (GPT-5 mini)
   */
  private async callModel(prompt: string, options: Record<string, unknown> = {}): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      // This would integrate with the actual model API
      // For now, simulate a response (options ignored in simulation)
      void options; // Explicitly mark as used to avoid ESLint warning
      const response = await this.simulateModelCall(prompt);

      const modelResponse = response as unknown as InspectorModelResponse;
    return {
        id: HashUtils.generateId(),
        model: this.config.model,
        prompt,
        response: {
        type: 'model_response',
        payload: modelResponse.content,
        timestamp: TimeUtils.now(),
        source: 'inspector'
      },
        usage: {
          promptTokens: modelResponse?.usage?.promptTokens ?? 0,
          completionTokens: modelResponse?.usage?.completionTokens ?? 0,
          totalTokens: modelResponse?.usage?.totalTokens ?? 0
        },
        finishReason: String(modelResponse?.finish_reason ?? 'unknown'),
        timestamp: TimeUtils.now(),
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Inspector', `Model call failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Simulate model call (placeholder for actual implementation)
   */
  private async simulateModelCall(prompt: string): Promise<Record<string, unknown>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Generate mock response based on prompt content
    const isClassification = prompt.includes('Classify the following signal');
    const isRecommendation = prompt.includes('Generate recommendations');

    if (isClassification) {
      return {
        content: JSON.stringify({
          category: 'development',
          urgency: 'medium',
          requiresAction: true,
          suggestedRole: 'robo-developer',
          confidence: 0.85,
          reasoning: 'Signal indicates development task requiring attention'
        }),
        usage: {
          promptTokens: TokenCounter.estimateTokens(prompt),
          completionTokens: 150,
          totalTokens: TokenCounter.estimateTokens(prompt) + 150
        },
        finish_reason: 'stop'
      };
    }

    if (isRecommendation) {
      return {
        content: JSON.stringify([
          {
            type: 'spawn_agent',
            target: 'robo-developer',
            payload: { task: 'address the identified issue' },
            reasoning: 'Developer agent needed to resolve the technical issue',
            priority: 7
          }
        ]),
        usage: {
          promptTokens: TokenCounter.estimateTokens(prompt),
          completionTokens: 200,
          totalTokens: TokenCounter.estimateTokens(prompt) + 200
        },
        finish_reason: 'stop'
      };
    }

    // Default response
    return {
      content: 'Analysis complete. Signal processed successfully.',
      usage: {
        promptTokens: TokenCounter.estimateTokens(prompt),
        completionTokens: 50,
        totalTokens: TokenCounter.estimateTokens(prompt) + 50
      },
      finish_reason: 'stop'
    };
  }

  /**
   * Helper methods for data retrieval
   */
  private async getRelatedSignals(): Promise<Signal[]> {
    // Implementation would query storage for related signals
    return [];
  }

  private async getActivePRPs(): Promise<string[]> {
    const prps = storageManager.getAllPRPs();
    return prps.filter(prp => prp.status === 'active').map(prp => prp.id);
  }

  private async getRecentActivity(): Promise<ActivityEntry[]> {
    // Implementation would get recent activity from storage
    return [];
  }

  private async getTokenStatus(): Promise<import('./types').TokenStatusInfo> {
    const tokenState = storageManager.getTokenState();
    return {
      totalUsed: tokenState.accounting.totalUsed,
      totalLimit: tokenState.limits.globalLimits.daily ?? 1000000,
      approachingLimit: false,
      criticalLimit: false,
      agentBreakdown: {},
      projections: {
        daily: 0,
        weekly: 0,
        monthly: 0
      }
    };
  }

  private async getAgentStatus(): Promise<AgentStatusInfo[]> {
    const agents = storageManager.getAllAgents();
    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status === 'inactive' ? 'idle' : agent.status as AgentStatusInfo['status'],
      lastActivity: agent.lastActivity,
      capabilities: {
        supportsTools: agent.capabilities.supportsTools,
        supportsImages: agent.capabilities.supportsImages,
        supportsSubAgents: agent.capabilities.supportsSubAgents,
        supportsParallel: agent.capabilities.supportsParallel,
        maxContextLength: 4000
      },
      performance: {
        tasksCompleted: 0,
        averageTaskTime: 0,
        errorRate: 0
      }
    }));
  }

  private async getSharedNotes(): Promise<SharedNoteInfo[]> {
    const notes = storageManager.getAllNotes();
    return notes.map(note => ({
      id: note.id,
      name: note.name,
      pattern: note.pattern,
      content: note.content,
      lastModified: note.lastModified,
      tags: note.tags,
      relevantTo: Array.isArray(note.relevantTo) ? note.relevantTo : [],
      priority: 1,
      wordCount: note.content.split(' ').length,
      readingTime: Math.ceil(note.content.split(' ').length / 200)
    }));
  }

  private async getEnvironmentInfo(): Promise<import('./types').EnvironmentInfo> {
    return {
      worktree: '.',
      branch: 'main',
      availableTools: ['file-reader', 'git-diff', 'test-runner'],
      systemCapabilities: ['git', 'npm', 'node'],
      constraints: {
        memory: 1024 * 1024 * 1024, // 1GB
        diskSpace: 10 * 1024 * 1024 * 1024, // 10GB
        networkAccess: true
      },
      recentChanges: {
        count: 0,
        types: {},
        lastChange: new Date()
      }
    };
  }

  private async getGuidelineContext(): Promise<import('./types').GuidelineContext> {
    const guidelines = guidelinesRegistry.getEnabledGuidelines();
    return {
      applicableGuidelines: guidelines.map(g => g.id),
      enabledGuidelines: guidelines.map(g => g.id),
      disabledGuidelines: [],
      protocolSteps: {},
      requirements: {
        met: [],
        unmet: [],
        blocked: []
      }
    };
  }

  private async getHistoricalData(): Promise<import('./types').HistoricalData> {
    return {
      similarSignals: [],
      agentPerformance: {},
      systemPerformance: {
        averageProcessingTime: 5000,
        successRate: 0.95,
        tokenEfficiency: 0.8
      },
      recentPatterns: []
    };
  }

  /**
   * Prompt building methods
   */
  private getClassificationPrompt(): string {
    return `You are a signal classification inspector for the PRP system. Analyze the provided signal and classify it according to the following schema:

Signal: {{signal}}
Context: {{context}}

Respond with a JSON object containing:
- category: string (development, testing, deployment, security, performance, documentation, communication)
- urgency: string (low, medium, high, critical)
- requiresAction: boolean
- suggestedRole: string (conductor, scanner, inspector, developer, tester, reviewer, deployer, analyst, researcher, designer, documenter)
- confidence: number (0-1)
- reasoning: string

Focus on accuracy and provide clear reasoning for your classification.`;
  }

  private getContextPreparationPrompt(): string {
    return `Prepare context for the orchestrator based on the classification and available information.`;
  }

  private getRecommendationPrompt(): string {
    return `Generate specific recommendations for handling the classified signal.`;
  }

  private buildClassificationPrompt(signal: Signal, context: ProcessingContext): string {
    let prompt = this.config.prompts.classification;

    // Replace placeholders
    prompt = prompt.replace('{{signal}}', JSON.stringify(signal, null, 2));
    prompt = prompt.replace('{{context}}', JSON.stringify(context, null, 2));

    return prompt;
  }

  private buildRecommendationPrompt(classification: SignalClassification, context: ProcessingContext): string {
    let prompt = this.config.prompts.recommendationGeneration;

    prompt = prompt.replace('{{classification}}', JSON.stringify(classification, null, 2));
    prompt = prompt.replace('{{context}}', JSON.stringify(context, null, 2));

    return prompt;
  }

  /**
   * Response parsing methods
   */
  private parseClassificationResponse(response: ModelResponse, signal: Signal): SignalClassification {
    try {
      const parsed = JSON.parse(String(response.response));
      return {
        signal,
        category: parsed.category ?? 'general',
        urgency: parsed.urgency ?? 'medium',
        requiresAction: parsed.requiresAction !== false,
        suggestedRole: parsed.suggestedRole ?? 'developer',
        confidence: parsed.confidence ?? 0.5,
        guideline: parsed.guideline
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.warn('Inspector', 'Failed to parse classification response', { error: errorObj.message, stack: errorObj.stack });
      return {
        signal,
        category: 'general',
        urgency: 'medium',
        requiresAction: true,
        suggestedRole: 'robo-developer',
        confidence: 0.3
      };
    }
  }

  private parseRecommendationResponse(response: ModelResponse): Recommendation[] {
    try {
      return JSON.parse(String(response.response));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.warn('Inspector', 'Failed to parse recommendation response', { error: errorObj.message, stack: errorObj.stack });
      return [];
    }
  }

  /**
   * Utility methods
   */
  private generateContextSummary(classification: SignalClassification, context: ProcessingContext): string {
    return `Signal ${classification.signal.type} (${classification.category}) requires ${classification.urgency} attention. ${context.activePRPs.length} active PRPs, ${context.agentStatus.length} agents available.`;
  }

  private identifyBlockedItems(): string[] {
    // Implementation would identify blocked items from context
    return [];
  }

  private calculatePayloadPriority(classification: SignalClassification): number {
    const urgencyMap = { low: 1, medium: 5, high: 8, critical: 10 };
    return urgencyMap[classification.urgency] ?? 5;
  }

  private compressContext(context: PreparedContext): PreparedContext {
    // Implementation would compress context to fit within token limits
    return context;
  }

  private calculateTokenCost(tokens: number): number {
    // Simplified cost calculation for GPT-5 mini
    return (tokens / 1000) * 0.0001; // $0.0001 per 1k tokens
  }

  private isRecoverableError(error: unknown): boolean {
    // Determine if error is recoverable
    const errorMessage = error instanceof Error ? error.message : String(error);
    return !errorMessage.includes('authentication') &&
           !errorMessage.includes('permission') &&
           !errorMessage.includes('invalid');
  }

  private getStructuredOutputSchema() : JSONSchema {
    return {
      type: 'object',
      properties: {
        category: { type: 'string' },
        urgency: { type: 'string' },
        requiresAction: { type: 'boolean' },
        suggestedRole: { type: 'string' },
        confidence: { type: 'number' },
        reasoning: { type: 'string' }
      },
      required: ['category', 'urgency', 'requiresAction', 'suggestedRole', 'confidence']
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(result: DetailedInspectorResult): void {
    const metrics = this.state.metrics;

    metrics.totalProcessed++;
    metrics.successfulClassifications++;

    // Update processing time
    const totalTime = metrics.averageProcessingTime * (metrics.successfulClassifications - 1) + result.processingTime;
    metrics.averageProcessingTime = totalTime / metrics.successfulClassifications;

    // Update token usage
    const totalInput = metrics.averageTokenUsage.input * (metrics.successfulClassifications - 1) + result.tokenUsage.input;
    const totalOutput = metrics.averageTokenUsage.output * (metrics.successfulClassifications - 1) + result.tokenUsage.output;
    const totalTokens = metrics.averageTokenUsage.total * (metrics.successfulClassifications - 1) + result.tokenUsage.total;

    metrics.averageTokenUsage = {
      input: totalInput / metrics.successfulClassifications,
      output: totalOutput / metrics.successfulClassifications,
      total: totalTokens / metrics.successfulClassifications
    };

    // Update success rate
    metrics.successRate = metrics.successfulClassifications / metrics.totalProcessed;

    // Update token efficiency
    metrics.tokenEfficiency = result.payload.context.tokenCount / result.tokenUsage.total;

    // Update performance metrics
    metrics.performance.fastestClassification = Math.min(metrics.performance.fastestClassification, result.processingTime);
    metrics.performance.slowestClassification = Math.max(metrics.performance.slowestClassification, result.processingTime);

    // Update by category
    const category = result.classification.category;
    if (!metrics.byCategory[category]) {
      metrics.byCategory[category] = { count: 0, averageTime: 0, successRate: 1 };
    }
    metrics.byCategory[category].count++;

    // Update by urgency
    // Note: inspector types SignalClassification doesn't have urgency property
    // This would need to be mapped from the original classification if needed
    const urgency = 'medium'; // Default fallback
    if (!metrics.byUrgency[urgency]) {
      metrics.byUrgency[urgency] = { count: 0, averageTime: 0, tokenUsage: 0 };
    }
    metrics.byUrgency[urgency].count++;
    metrics.byUrgency[urgency].tokenUsage += result.tokenUsage.total;
  }

  /**
   * Public API methods
   */
  getStatus(): InspectorState {
    return { ...this.state };
  }

  getMetrics(): InspectorMetrics {
    return { ...this.state.metrics };
  }

  getProcessing(processingId: string): InspectorProcessing | undefined {
    return this.state.processing.get(processingId);
  }

  getResult(processingId: string): DetailedInspectorResult | undefined {
    return this.state.completed.get(processingId);
  }

  getError(processingId: string): InspectorError | undefined {
    return this.state.failed.get(processingId);
  }

  /**
   * Batch processing
   */
  async processBatch(signals: Signal[]): Promise<string> {
    const batchId = HashUtils.generateId();

    for (const signal of signals) {
      await this.processSignal(signal);
    }

    return batchId;
  }

  /**
   * Clear completed and failed results
   */
  clearResults(olderThan?: Date): void {
    const cutoff = olderThan || TimeUtils.hoursAgo(1);

    Array.from(this.state.completed.entries()).forEach(([id, result]) => {
      if (result.timestamp < cutoff) {
        this.state.completed.delete(id);
      }
    });

    Array.from(this.state.failed.entries()).forEach(([id, error]) => {
      if (error.timestamp < cutoff) {
        this.state.failed.delete(id);
      }
    });
  }

  /**
   * Shutdown inspector
   */
  async shutdown(): Promise<void> {
    logger.info('Inspector', 'Shutting down inspector');

    // Cancel all active timers
    Array.from(this.processingTimers.values()).forEach(timer => {
      clearTimeout(timer);
    });
    this.processingTimers.clear();

    // Wait for active requests to complete
    await Promise.all(Array.from(this.activeRequests.values()));

    this.removeAllListeners();
    logger.info('Inspector', 'Inspector shutdown complete');
  }
}