/**
 * ♫ LLM Executor for @dcversus/prp Inspector
 *
 * LLM integration with cheapest model, largest context, and structured output.
 * Token management with 1M token cap and 40K output limit.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import {
  InspectorConfig,
  ModelResponse,
  ProcessingContext,
  SignalClassification,
  Recommendation,
  InspectorPayload,
  PreparedContext
} from './types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

/**
 * LLM Provider configuration
 */
export interface LLMProviderConfig {
  name: string;
  model: string;
  maxTokens: number;
  costPerToken: number;
  apiKey?: string;
  baseURL?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Token accounting configuration
 */
export interface TokenAccountingConfig {
  inspectorCap: number;        // 1M tokens for inspector
  outputLimit: number;         // 40K tokens output limit
  basePrompt: number;          // 20K tokens for base prompt
  guidelinePrompt: number;     // 20K tokens for guidelines
  contextWindow: number;       // Remaining for context
  safetyMargin: number;        // 5% safety margin
}

/**
 * Structured output schema
 */
export interface StructuredOutputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    items?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    required?: string[];
  }>;
  required: string[];
  additionalProperties?: boolean;
}

/**
 * LLM execution result
 */
export interface LLMExecutionResult {
  id: string;
  signalId: string;
  classification: SignalClassification;
  payload: InspectorPayload;
  recommendations: Recommendation[];
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  confidence: number;
  processingTime: number;
  model: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

/**
 * LLM Executor analysis request
 */
export interface LLMExecutorRequest {
  id: string;
  signal: Signal;
  context: ProcessingContext;
  guideline: string;
  guidelineId: string;
  priority: number;
  createdAt: Date;
}

/**
 * LLM Executor - Main execution engine for Inspector
 */
export class LLMExecutor extends EventEmitter {
  private config: InspectorConfig;
  private providerConfig: LLMProviderConfig;
  private tokenConfig: TokenAccountingConfig;
  private requestQueue: LLMExecutorRequest[] = [];
  private processing: Map<string, LLMExecutionResult> = new Map();
  private cache: Map<string, unknown> = new Map();
  private isProcessing = false;

  constructor(config: InspectorConfig, providerConfig?: Partial<LLMProviderConfig>) {
    super();
    this.config = config;

    // Initialize provider config with cheapest model preferences
    this.providerConfig = {
      name: 'openai', // Default to Openai
      model: 'gpt-4o-mini', // Cheapest model with large context
      maxTokens: 128000, // 128K context window
      costPerToken: 0.00000015, // GPT-4o-mini pricing
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      ...providerConfig
    };

    // Initialize token accounting for inspector limits
    this.tokenConfig = {
      inspectorCap: 1000000,  // 1M tokens inspector cap
      outputLimit: 40000,     // 40K output limit
      basePrompt: 20000,      // 20K base prompt
      guidelinePrompt: 20000, // 20K guidelines
      contextWindow: 0,       // Calculated dynamically
      safetyMargin: 0.05      // 5% safety margin
    };

    // Calculate available context window
    this.tokenConfig.contextWindow = this.tokenConfig.inspectorCap -
      this.tokenConfig.basePrompt -
      this.tokenConfig.guidelinePrompt -
      Math.floor(this.tokenConfig.inspectorCap * this.tokenConfig.safetyMargin);

    logger.info('LLMExecutor', 'LLM Executor initialized', {
      provider: this.providerConfig.name,
      model: this.providerConfig.model,
      inspectorCap: this.tokenConfig.inspectorCap,
      outputLimit: this.tokenConfig.outputLimit,
      contextWindow: this.tokenConfig.contextWindow
    });
  }

  /**
   * Execute analysis for a signal
   */
  async executeAnalysis(request: LLMExecutorRequest): Promise<LLMExecutionResult> {
    const startTime = Date.now();
    const executionId = HashUtils.generateId();

    try {
      logger.info('LLMExecutor', `Starting analysis for signal ${request.signal.type}`, {
        signalId: request.signal.id,
        executionId,
        guidelineId: request.guidelineId
      });

      // Add to processing map
      this.processing.set(executionId, {
        id: executionId,
        signalId: request.signal.id,
        classification: {} as SignalClassification,
        payload: {} as InspectorPayload,
        recommendations: [],
        tokenUsage: { input: 0, output: 0, total: 0, cost: 0 },
        confidence: 0,
        processingTime: 0,
        model: this.providerConfig.model,
        timestamp: new Date(),
        success: false
      });

      // Prepare analysis components within token limits
      const components = await this.prepareAnalysisComponents(request);

      // Build optimized prompt
      const prompt = await this.buildAnalysisPrompt(components);

      // Execute LLM with structured output
      const response = await this.executeLLM(prompt, {
        temperature: this.config.temperature,
        maxTokens: Math.min(this.config.maxTokens, this.tokenConfig.outputLimit),
        structuredOutput: {
          enabled: true,
          schema: this.getAnalysisSchema()
        }
      });

      // Parse and validate response
      const result = await this.parseAnalysisResponse(request, response, Date.now() - startTime);

      // Update processing result
      this.processing.set(executionId, result);

      // Update metrics
      this.updateMetrics(result);

      // Emit completion event
      this.emit('analysis:completed', { executionId, result });

      logger.info('LLMExecutor', `Analysis completed for signal ${request.signal.type}`, {
        executionId,
        tokenUsage: result.tokenUsage.total,
        confidence: result.confidence,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('LLMExecutor', `Analysis failed for signal ${request.signal.type}`, error instanceof Error ? error : new Error(errorMessage));

      const errorResult: LLMExecutionResult = {
        id: executionId,
        signalId: request.signal.id,
        classification: this.createFallbackClassification(request.signal),
        payload: this.createFallbackPayload(request.signal),
        recommendations: this.createFallbackRecommendations(),
        tokenUsage: { input: 0, output: 0, total: 0, cost: 0 },
        confidence: 0,
        processingTime: Date.now() - startTime,
        model: this.providerConfig.model,
        timestamp: new Date(),
        success: false,
        error: errorMessage
      };

      this.processing.set(executionId, errorResult);
      this.emit('analysis:failed', { executionId, error: errorResult });

      throw error;
    }
  }

  /**
   * Process analysis queue (FIFO)
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift()!;
        try {
          await this.executeAnalysis(request);
        } catch (error) {
          logger.error('LLMExecutor', 'Queue processing error', error instanceof Error ? error : new Error(String(error)));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Add request to processing queue
   */
  addToQueue(request: LLMExecutorRequest): void {
    this.requestQueue.push(request);
    this.emit('queue:updated', { queueSize: this.requestQueue.length });

    // Start processing if not already running
    setImmediate(() => this.processQueue());
  }

  /**
   * Prepare analysis components within token limits
   */
  private async prepareAnalysisComponents(request: LLMExecutorRequest): Promise<{
    basePrompt: string;
    guidelinePrompt: string;
    contextPrompt: string;
    tokenDistribution: {
      base: number;
      guideline: number;
      context: number;
      total: number;
    };
  }> {
    // Generate base prompt
    const basePrompt = await this.generateBasePrompt(request.signal);

    // Prepare guideline within token limit
    const guidelinePrompt = await this.prepareGuidelinePrompt(
      request.guideline,
      this.tokenConfig.guidelinePrompt
    );

    // Prepare context within token limit
    const contextPrompt = await this.prepareContextPrompt(
      request.context,
      this.tokenConfig.contextWindow
    );

    const tokenDistribution = {
      base: this.estimateTokens(basePrompt),
      guideline: this.estimateTokens(guidelinePrompt),
      context: this.estimateTokens(contextPrompt),
      total: 0
    };

    tokenDistribution.total = tokenDistribution.base + tokenDistribution.guideline + tokenDistribution.context;

    // Verify within inspector cap
    if (tokenDistribution.total > this.tokenConfig.inspectorCap) {
      logger.warn('LLMExecutor', `Prompt exceeds inspector cap: ${tokenDistribution.total}/${this.tokenConfig.inspectorCap}`);
      // Apply compression to fit within limits
      return this.compressComponents(basePrompt, guidelinePrompt, contextPrompt);
    }

    return {
      basePrompt,
      guidelinePrompt,
      contextPrompt,
      tokenDistribution
    };
  }

  /**
   * Build analysis prompt with structured output requirements
   */
  private async buildAnalysisPrompt(components: {
    basePrompt: string;
    guidelinePrompt: string;
    contextPrompt: string;
    tokenDistribution: {
      base: number;
      guideline: number;
      context: number;
      total: number;
    };
  }): Promise<string> {
    const prompt = [
      '# INSPECTOR SIGNAL ANALYSIS',
      '',
      'You are an expert Inspector analyzing signals for the PRP (Product Requirement Prompts) workflow system.',
      '',
      '## TASK',
      'Analyze the provided signal and generate a comprehensive classification and actionable recommendations.',
      '',
      '## BASE INSTRUCTIONS',
      components.basePrompt,
      '',
      '## ANALYSIS GUIDELINES',
      components.guidelinePrompt,
      '',
      '## CONTEXT INFORMATION',
      components.contextPrompt,
      '',
      '## ANALYSIS REQUIREMENTS',
      'Provide structured analysis including:',
      '1. Signal classification with confidence scoring (0-100)',
      '2. Priority assessment (1-10)',
      '3. Agent role assignment',
      '4. Risk scoring',
      '5. Specific recommendations with time estimates',
      '6. Context implications and dependencies',
      '',
      '## OUTPUT FORMAT',
      'Respond with valid JSON following this exact structure:',
      JSON.stringify(this.getAnalysisSchema(), null, 2),
      '',
      'IMPORTANT: Ensure all required fields are included and values are properly typed.'
    ].join('\n');

    return prompt;
  }

  /**
   * Generate base prompt for signal analysis
   */
  private async generateBasePrompt(signal: Signal): Promise<string> {
    return `Analyze this signal and provide comprehensive classification and recommendations.

SIGNAL DETAILS:
- Type: ${signal.type}
- ID: ${signal.id}
- Source: ${signal.source}
- Priority: ${signal.priority}
- Timestamp: ${signal.timestamp.toISOString()}
- Data: ${JSON.stringify(signal.data, null, 2)}

CLASSIFICATION CRITERIA:
1. **Category**: Primary classification (development, testing, deployment, security, etc.)
2. **Subcategory**: Specific classification within category
3. **Priority**: Numerical priority (1-10, where 10 is highest)
4. **Agent Role**: Appropriate agent role (robo-developer, robo-aqa, robo-devops-sre, etc.)
5. **Escalation Level**: Escalation urgency (1-5)
6. **Deadline**: Recommended deadline for resolution
7. **Dependencies**: Required dependencies or prerequisites
8. **Confidence**: Confidence in classification (0-100)

RECOMMENDATION CRITERIA:
1. **Type**: Action type (implement, review, test, deploy, etc.)
2. **Priority**: Priority level (high, medium, low)
3. **Description**: Clear, actionable description
4. **Time Estimate**: Estimated time in minutes
5. **Prerequisites**: Required prerequisites
6. **Reasoning**: Why this recommendation is needed

RISK ASSESSMENT:
- Technical complexity (low, medium, high, critical)
- Impact on current work (minimal, moderate, significant, blocking)
- Resource requirements (low, medium, high)
- Dependencies (none, minimal, moderate, extensive)

Provide specific, actionable recommendations with clear time estimates and prerequisites.`;
  }

  /**
   * Prepare guideline prompt within token limit
   */
  private async prepareGuidelinePrompt(guideline: string, maxTokens: number): Promise<string> {
    const guidelineTokens = this.estimateTokens(guideline);

    if (guidelineTokens <= maxTokens) {
      return guideline;
    }

    // Truncate guideline to fit within limit
    return this.truncateText(guideline, maxTokens) + '\n\n[Guideline truncated to fit token limits]';
  }

  /**
   * Prepare context prompt within token limit
   */
  private async prepareContextPrompt(context: ProcessingContext, maxTokens: number): Promise<string> {
    // Serialize context with priority to important information
    const contextSections = [
      { key: 'signalId', value: context.signalId, priority: 1 },
      { key: 'activePRPs', value: context.activePRPs, priority: 2 },
      { key: 'relatedSignals', value: context.relatedSignals, priority: 3 },
      { key: 'agentStatus', value: context.agentStatus, priority: 4 },
      { key: 'tokenStatus', value: context.tokenStatus, priority: 5 },
      { key: 'recentActivity', value: context.recentActivity, priority: 6 },
      { key: 'guidelineContext', value: context.guidelineContext, priority: 7 },
      { key: 'historicalData', value: context.historicalData, priority: 8 },
      { key: 'environment', value: context.environment, priority: 9 }
    ];

    let contextText = '';
    let remainingTokens = maxTokens;

    // Add sections by priority
    for (const section of contextSections) {
      if (remainingTokens <= 0) {
        break;
      }

      const sectionText = this.serializeContextSection(section.key, section.value);
      const sectionTokens = this.estimateTokens(sectionText);

      if (sectionTokens <= remainingTokens) {
        contextText += sectionText + '\n';
        remainingTokens -= sectionTokens;
      } else {
        // Truncate this section to fit
        const truncated = this.truncateText(sectionText, remainingTokens);
        contextText += truncated + '\n';
        break;
      }
    }

    return contextText.trim();
  }

  /**
   * Execute LLM with retry logic
   */
  private async executeLLM(prompt: string, options: {
    temperature?: number;
    maxTokens?: number;
    structuredOutput?: {
      enabled: boolean;
      schema?: StructuredOutputSchema;
    };
  }): Promise<ModelResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.providerConfig.retryAttempts; attempt++) {
      try {
        logger.debug('LLMExecutor', `LLM execution attempt ${attempt}/${this.providerConfig.retryAttempts}`, {
          promptLength: prompt.length,
          estimatedTokens: this.estimateTokens(prompt),
          options
        });

        const response = await this.makeLLMRequest(prompt, options);

        logger.debug('LLMExecutor', `LLM execution successful on attempt ${attempt}`, {
          tokenUsage: response.usage.totalTokens,
          finishReason: response.finishReason
        });

        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('LLMExecutor', `LLM execution attempt ${attempt} failed`, { error: lastError.message, stack: lastError.stack });

        if (attempt < this.providerConfig.retryAttempts) {
          await this.delay(this.providerConfig.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error('LLM execution failed after all retry attempts');
  }

  /**
   * Make LLM request to provider
   */
  private async makeLLMRequest(prompt: string, options: {
    temperature?: number;
    maxTokens?: number;
    structuredOutput?: {
      enabled: boolean;
      schema?: StructuredOutputSchema;
    };
  }): Promise<ModelResponse> {
    // This would integrate with actual LLM providers
    // For now, return a mock response
    const mockResponse = {
      id: HashUtils.generateId(),
      model: this.providerConfig.model,
      prompt,
      response: {
        type: 'llm-response',
        payload: this.generateMockResponse(options.structuredOutput?.schema),
        timestamp: new Date(),
        source: this.providerConfig.name,
        severity: 'low' as const
      },
      usage: {
        promptTokens: this.estimateTokens(prompt),
        completionTokens: 1000,
        totalTokens: this.estimateTokens(prompt) + 1000
      },
      finishReason: 'stop',
      timestamp: new Date(),
      processingTime: 1000
    };

    return mockResponse;
  }

  /**
   * Generate mock response (temporary)
   */
  private generateMockResponse(schema?: StructuredOutputSchema): string {
    if (!schema) {
      return JSON.stringify({
        classification: {
          category: 'development',
          subcategory: 'implementation',
          priority: 5,
          agentRole: 'robo-developer',
          escalationLevel: 2,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 85
        },
        recommendations: [{
          type: 'implement',
          priority: 'high',
          description: 'Implement the required functionality',
          estimatedTime: 120,
          prerequisites: []
        }]
      });
    }

    // Generate response matching schema
    const response: Record<string, unknown> = {};

    for (const [key, prop] of Object.entries(schema.properties)) {
      switch (prop.type) {
        case 'string':
          response[key] = 'Sample response';
          break;
        case 'number':
          response[key] = 5;
          break;
        case 'boolean':
          response[key] = true;
          break;
        case 'array':
          response[key] = [];
          break;
        case 'object':
          response[key] = {};
          break;
      }
    }

    return JSON.stringify(response);
  }

  /**
   * Parse and validate analysis response
   */
  private async parseAnalysisResponse(
    request: LLMExecutorRequest,
    response: ModelResponse,
    processingTime: number
  ): Promise<LLMExecutionResult> {
    try {
      // Parse response
      const responseData = typeof response.response === 'string'
        ? JSON.parse(response.response)
        : response.response;

      // Extract classification
      const classification: SignalClassification = {
        category: responseData.classification?.category ?? 'unknown',
        subcategory: responseData.classification?.subcategory ?? 'general',
        priority: responseData.classification?.priority ?? request.signal.priority ?? 5,
        agentRole: responseData.classification?.agentRole ?? 'robo-developer',
        escalationLevel: responseData.classification?.escalationLevel ?? 1,
        deadline: responseData.classification?.deadline
          ? new Date(responseData.classification.deadline)
          : new Date(Date.now() + 86400000),
        dependencies: responseData.classification?.dependencies ?? [],
        confidence: responseData.classification?.confidence ?? 50
      };

      // Create prepared context
      const preparedContext: PreparedContext = {
        id: HashUtils.generateId(),
        signalId: request.signal.id,
        content: {
          signalContent: JSON.stringify(request.signal),
          agentContext: request.context.agent ? { agent: request.context.agent } : {},
          worktreeState: request.context.worktree ? { worktree: request.context.worktree } : {}
        },
        size: JSON.stringify(request.context).length,
        compressed: false,
        tokenCount: response.usage.promptTokens
      };

      // Create payload
      const payload: InspectorPayload = {
        id: HashUtils.generateId(),
        signalId: request.signal.id,
        classification,
        context: preparedContext,
        recommendations: responseData.recommendations ?? [],
        timestamp: new Date(),
        size: JSON.stringify(responseData).length,
        compressed: false
      };

      // Extract recommendations
      const recommendations: Recommendation[] = (responseData.recommendations ?? []).map((rec: any) => ({
        type: rec.type ?? 'action',
        priority: rec.priority ?? 'medium',
        description: rec.description ?? 'No description provided',
        estimatedTime: rec.estimatedTime ?? 30,
        prerequisites: rec.prerequisites ?? [],
        reasoning: rec.reasoning
      }));

      // Calculate cost
      const cost = this.calculateCost(response.usage.totalTokens);

      return {
        id: HashUtils.generateId(),
        signalId: request.signal.id,
        classification,
        payload,
        recommendations,
        tokenUsage: {
          input: response.usage.promptTokens,
          output: response.usage.completionTokens,
          total: response.usage.totalTokens,
          cost
        },
        confidence: classification.confidence,
        processingTime,
        model: this.providerConfig.model,
        timestamp: new Date(),
        success: true
      };

    } catch (error) {
      logger.error('LLMExecutor', 'Failed to parse analysis response', error instanceof Error ? error : new Error(String(error)));

      // Return fallback result
      return {
        id: HashUtils.generateId(),
        signalId: request.signal.id,
        classification: this.createFallbackClassification(request.signal),
        payload: this.createFallbackPayload(request.signal),
        recommendations: this.createFallbackRecommendations(),
        tokenUsage: {
          input: response.usage.promptTokens,
          output: response.usage.completionTokens,
          total: response.usage.totalTokens,
          cost: this.calculateCost(response.usage.totalTokens)
        },
        confidence: 25,
        processingTime,
        model: this.providerConfig.model,
        timestamp: new Date(),
        success: false,
        error: 'Failed to parse response'
      };
    }
  }

  /**
   * Create fallback classification
   */
  private createFallbackClassification(signal: Signal): SignalClassification {
    return {
      category: 'unknown',
      subcategory: 'general',
      priority: signal.priority ?? 5,
      agentRole: 'robo-developer',
      escalationLevel: 1,
      deadline: new Date(Date.now() + 86400000),
      dependencies: [],
      confidence: 25
    };
  }

  /**
   * Create fallback payload
   */
  private createFallbackPayload(signal: Signal): InspectorPayload {
    return {
      id: HashUtils.generateId(),
      signalId: signal.id,
      classification: this.createFallbackClassification(signal),
      context: {
        id: HashUtils.generateId(),
        signalId: signal.id,
        content: {},
        size: 0,
        compressed: false,
        tokenCount: 0
      },
      recommendations: [],
      timestamp: new Date(),
      size: 0,
      compressed: false
    };
  }

  /**
   * Create fallback recommendations
   */
  private createFallbackRecommendations(): Recommendation[] {
    return [{
      type: 'review',
      priority: 'high',
      description: 'Manual review required due to analysis failure',
      estimatedTime: 15,
      prerequisites: []
    }];
  }

  /**
   * Get analysis schema for structured output
   */
  private getAnalysisSchema(): StructuredOutputSchema {
    return {
      type: 'object',
      properties: {
        classification: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Primary classification category' },
            subcategory: { type: 'string', description: 'Specific classification subcategory' },
            priority: { type: 'number', description: 'Priority level (1-10)' },
            agentRole: { type: 'string', description: 'Assigned agent role' },
            escalationLevel: { type: 'number', description: 'Escalation urgency (1-5)' },
            deadline: { type: 'string', description: 'ISO date string for deadline' },
            dependencies: { type: 'array', items: { type: 'string' }, description: 'Required dependencies' },
            confidence: { type: 'number', description: 'Confidence score (0-100)' }
          },
          required: ['category', 'priority', 'agentRole', 'confidence']
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Recommendation type' },
              priority: { type: 'string', description: 'Priority level' },
              description: { type: 'string', description: 'Action description' },
              estimatedTime: { type: 'number', description: 'Time in minutes' },
              prerequisites: { type: 'array', items: { type: 'string' }, description: 'Required prerequisites' },
              reasoning: { type: 'string', description: 'Reasoning for recommendation' }
            },
            required: ['type', 'description', 'estimatedTime']
          }
        }
      },
      required: ['classification', 'recommendations']
    };
  }

  /**
   * Compress components to fit within token limits
   */
  private async compressComponents(
    basePrompt: string,
    guidelinePrompt: string,
    contextPrompt: string
  ): Promise<{
    basePrompt: string;
    guidelinePrompt: string;
    contextPrompt: string;
    tokenDistribution: {
      base: number;
      guideline: number;
      context: number;
      total: number;
    };
  }> {
    // Compress context first, then guideline if needed
    const maxContextTokens = Math.floor(this.tokenConfig.contextWindow * 0.7);
    const maxGuidelineTokens = Math.floor(this.tokenConfig.guidelinePrompt * 0.8);

    const compressedContext = this.truncateText(contextPrompt, maxContextTokens);
    const compressedGuideline = this.truncateText(guidelinePrompt, maxGuidelineTokens);

    const tokenDistribution = {
      base: this.estimateTokens(basePrompt),
      guideline: this.estimateTokens(compressedGuideline),
      context: this.estimateTokens(compressedContext),
      total: 0
    };

    tokenDistribution.total = tokenDistribution.base + tokenDistribution.guideline + tokenDistribution.context;

    return {
      basePrompt,
      guidelinePrompt: compressedGuideline,
      contextPrompt: compressedContext,
      tokenDistribution
    };
  }

  /**
   * Serialize context section
   */
  private serializeContextSection(key: string, value: unknown): string {
    switch (key) {
      case 'signalId':
        return `**Signal ID:** ${value}`;
      case 'activePRPs':
        return `**Active PRPs:** ${(value as string[]).join(', ')}`;
      case 'relatedSignals':
        return `**Related Signals:** ${(value as unknown[]).length} signals`;
      case 'agentStatus':
        return `**Agent Status:** ${(value as unknown[]).length} agents active`;
      case 'tokenStatus':
        return `**Token Status:** ${(value as any).totalUsed}/${(value as any).totalLimit} used`;
      case 'recentActivity':
        return `**Recent Activity:** ${(value as any[]).slice(0, 3).map((a: any) => `${a.action}`).join(', ')}`;
      default:
        return `**${key}:** ${JSON.stringify(value).substring(0, 200)}...`;
    }
  }

  /**
   * Estimate token count (rough estimation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to target token count
   */
  private truncateText(text: string, targetTokens: number): string {
    const targetChars = targetTokens * 4;
    if (text.length <= targetChars) {
      return text;
    }
    return text.substring(0, targetChars - 3) + '...';
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(tokens: number): number {
    return tokens * this.providerConfig.costPerToken;
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update metrics
   */
  private updateMetrics(result: LLMExecutionResult): void {
    // Emit metrics event
    this.emit('metrics:updated', {
      tokenUsage: result.tokenUsage,
      processingTime: result.processingTime,
      confidence: result.confidence,
      success: result.success
    });
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    size: number;
    processing: number;
    isProcessing: boolean;
    } {
    return {
      size: this.requestQueue.length,
      processing: this.processing.size,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Get processing results
   */
  getProcessingResults(): Map<string, LLMExecutionResult> {
    return new Map(this.processing);
  }

  /**
   * Clear cache and processing history
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('LLMExecutor', 'Cache cleared');
  }
}