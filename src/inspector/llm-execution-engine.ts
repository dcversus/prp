/**
 * ♫ LLM Execution Engine for @dcversus/prp Inspector
 *
 * LLM-powered signal analysis with 40K token limit management.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import {
  InspectorConfig,
  ModelResponse,
  ProcessingContext,
  SignalClassification,
  Recommendation,
  InspectorMetrics
} from './types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

/**
 * LLM response data interfaces
 */
export interface RecommendationData {
  type?: string;
  priority?: string;
  description?: string;
  estimatedTime?: number;
  reasoning?: string;
  prerequisites?: string[];
}

export interface ActivityData {
  action: string;
  actor: string;
  details?: string;
}

/**
 * Token limit configuration for 40K constraint
 */
export interface TokenLimitConfig {
  totalLimit: number;        // 40K tokens total
  basePrompt: number;        // 20K tokens for base prompt
  guidelinePrompt: number;   // 20K tokens for guidelines
  contextWindow: number;     // Remaining tokens for context
  safetyMargin: number;      // 5% safety margin
  compressionThreshold: number; // When to start compressing
}

/**
 * LLM Provider interface
 */
export interface LLMProvider {
  name: string;
  model: string;
  maxTokens: number;
  costPerToken: number;
  execute(prompt: string, options?: LLMExecuteOptions): Promise<ModelResponse>;
}

/**
 * LLM execution options
 */
export interface LLMExecuteOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  structuredOutput?: {
    enabled: boolean;
    schema?: Record<string, unknown>;
  };
}

/**
 * Context compression strategies
 */
export interface ContextCompression {
  strategy: 'semantic' | 'summary' | 'truncate' | 'cluster';
  level: 'low' | 'medium' | 'high';
  preserveKeyInfo: boolean;
  targetSize: number; // tokens
}

/**
 * Inspector analysis result
 */
export interface InspectorAnalysis {
  signalId: string;
  classification: SignalClassification;
  context: ProcessingContext;
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
}

/**
 * LLM Execution Engine - Manages LLM interactions with token limits
 */
export class LLMExecutionEngine extends EventEmitter {
  private config: InspectorConfig;
  private tokenLimits: TokenLimitConfig;
  private provider: LLMProvider;
  private metrics: InspectorMetrics;
  private contextCache: Map<string, unknown> = new Map();
  private compressionStrategies: Map<string, ContextCompression> = new Map();

  constructor(config: InspectorConfig, provider: LLMProvider) {
    super();
    this.config = config;
    this.provider = provider;

    // Initialize token limits for 40K constraint
    this.tokenLimits = {
      totalLimit: 40000,
      basePrompt: 20000,
      guidelinePrompt: 20000,
      contextWindow: 0, // Calculated dynamically
      safetyMargin: 0.05, // 5%
      compressionThreshold: 0.8 // Start compressing at 80% capacity
    };

    this.metrics = {
      startTime: new Date(),
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
        fastestClassification: 0,
        slowestClassification: 0,
        peakThroughput: 0,
        memoryUsage: 0
      }
    };

    this.setupCompressionStrategies();
  }

  /**
   * Analyze signal with LLM within 40K token limits
   */
  async analyzeSignal(
    signal: Signal,
    context: ProcessingContext,
    guideline: string
  ): Promise<InspectorAnalysis> {
    const startTime = Date.now();
    const analysisId = HashUtils.generateId();

    try {
      logger.info('LLMExecutionEngine', `Analyzing signal ${signal.type} (${signal.id})`);

      // Prepare analysis components within token limits
      const analysisComponents = await this.prepareAnalysisComponents(signal, context, guideline);

      // Build the complete prompt within 40K limit
      const prompt = await this.buildOptimizedPrompt(analysisComponents);

      // Execute LLM analysis
      const response = await this.executeLLM(prompt, {
        temperature: this.config.temperature,
        maxTokens: Math.min(
          this.config.maxTokens,
          this.tokenLimits.contextWindow
        ),
        structuredOutput: this.config.structuredOutput
      });

      // Parse and process the response
      const analysis = await this.parseAnalysisResponse(
        signal,
        context,
        response,
        Date.now() - startTime
      );

      // Update metrics
      this.updateMetrics(analysis, true);

      // Emit completion event
      this.emit('analysis:completed', { analysisId, analysis });

      logger.info('LLMExecutionEngine', `Signal analysis completed: ${signal.type}`, {
        tokenUsage: analysis.tokenUsage.total,
        confidence: analysis.confidence,
        processingTime: analysis.processingTime
      });

      return analysis;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('LLMExecutionEngine', `Signal analysis failed: ${signal.type}`, error instanceof Error ? error : new Error(errorMessage));

      // Update error metrics
      this.updateMetrics({
        signalId: signal.id,
        classification: {} as SignalClassification,
        context,
        recommendations: [],
        tokenUsage: { input: 0, output: 0, total: 0, cost: 0 },
        confidence: 0,
        processingTime: Date.now() - startTime,
        model: this.provider.model
      }, false);

      // Emit error event
      this.emit('analysis:failed', { analysisId, signal, error });

      throw error;
    }
  }

  /**
   * Prepare analysis components within token limits
   */
  private async prepareAnalysisComponents(
    signal: Signal,
    context: ProcessingContext,
    guideline: string
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
    // Calculate available tokens
    const availableTokens = this.tokenLimits.totalLimit - Math.floor(
      this.tokenLimits.totalLimit * this.tokenLimits.safetyMargin
    );

    // Distribute tokens between components
    const baseTokens = Math.min(this.tokenLimits.basePrompt, Math.floor(availableTokens * 0.5));
    const guidelineTokens = Math.min(this.tokenLimits.guidelinePrompt, Math.floor(availableTokens * 0.5));
    const contextTokens = availableTokens - baseTokens - guidelineTokens;

    // Generate base prompt
    const basePrompt = await this.generateBasePrompt(signal);

    // Prepare guideline within token limit
    const guidelinePrompt = await this.prepareGuidelinePrompt(guideline, guidelineTokens);

    // Prepare context within token limit
    const contextPrompt = await this.prepareContextPrompt(context, contextTokens);

    return {
      basePrompt,
      guidelinePrompt,
      contextPrompt,
      tokenDistribution: {
        base: this.estimateTokens(basePrompt),
        guideline: this.estimateTokens(guidelinePrompt),
        context: this.estimateTokens(contextPrompt),
        total: this.estimateTokens(basePrompt + guidelinePrompt + contextPrompt)
      }
    };
  }

  /**
   * Build optimized prompt within 40K limit
   */
  private async buildOptimizedPrompt(components: {
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
    const { basePrompt, guidelinePrompt, contextPrompt, tokenDistribution } = components;

    // Check if we're within limits
    if (tokenDistribution.total > this.tokenLimits.totalLimit) {
      logger.warn('LLMExecutionEngine', `Prompt exceeds token limit: ${tokenDistribution.total}/${this.tokenLimits.totalLimit}`);

      // Apply compression
      return await this.compressPrompt(components);
    }

    // Build complete prompt
    const prompt = [
      '# SIGNAL ANALYSIS TASK',
      '',
      '## Base Instructions',
      basePrompt,
      '',
      '## Analysis Guidelines',
      guidelinePrompt,
      '',
      '## Context Information',
      contextPrompt,
      '',
      '## Analysis Required',
      'Please analyze the signal and provide:',
      '1. Signal classification with confidence score',
      '2. Recommended actions and priorities',
      '3. Context assessment and implications',
      '4. Agent role assignment and escalation needs',
      '',
      'Respond with structured JSON output including all required fields.'
    ].join('\n');

    return prompt;
  }

  /**
   * Generate base prompt for signal analysis
   */
  private async generateBasePrompt(signal: Signal): Promise<string> {
    return `You are an expert signal analysis system for the PRP (Project Requirements and Progress) workflow system.

Your task is to analyze the provided signal and determine:
- Classification and category
- Priority and urgency level
- Appropriate agent role assignment
- Required actions and recommendations
- Context implications and dependencies

Signal Information:
- Type: ${signal.type}
- ID: ${signal.id}
- Source: ${signal.source}
- Priority: ${signal.priority}
- Timestamp: ${signal.timestamp.toISOString()}

Analysis Guidelines:
1. Provide accurate classification with confidence scoring (0-100%)
2. Assign appropriate agent roles from: conductor, scanner, inspector, developer, tester, reviewer, deployer, analyst, researcher, designer, documenter
3. Recommend specific, actionable steps
4. Consider context dependencies and relationships
5. Maintain consistency with previous similar signals

Respond in structured JSON format with all required fields.`;
  }

  /**
   * Prepare guideline prompt within token limit
   */
  private async prepareGuidelinePrompt(guideline: string, maxTokens: number): Promise<string> {
    const guidelineTokens = this.estimateTokens(guideline);

    if (guidelineTokens <= maxTokens) {
      return guideline;
    }

    // Apply semantic compression to guideline
    const compression = this.compressionStrategies.get('guideline') || {
      strategy: 'semantic' as const,
      level: 'medium' as const,
      preserveKeyInfo: true,
      targetSize: maxTokens
    };

    return await this.compressText(guideline, compression);
  }

  /**
   * Prepare context prompt within token limit
   */
  private async prepareContextPrompt(context: ProcessingContext, maxTokens: number): Promise<string> {
    // Serialize context
    const contextText = this.serializeContext(context);
    const contextTokens = this.estimateTokens(contextText);

    if (contextTokens <= maxTokens) {
      return contextText;
    }

    // Apply intelligent context compression
    const compression = this.compressionStrategies.get('context') || {
      strategy: 'semantic' as const,
      level: 'high' as const,
      preserveKeyInfo: true,
      targetSize: maxTokens
    };

    return await this.compressContext(context, compression);
  }

  /**
   * Execute LLM with the provider
   */
  private async executeLLM(prompt: string, options: LLMExecuteOptions): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      logger.debug('LLMExecutionEngine', `Executing LLM with ${this.provider.name}`, {
        promptLength: prompt.length,
        estimatedTokens: this.estimateTokens(prompt),
        options
      });

      const response = await this.provider.execute(prompt, options);

      const processingTime = Date.now() - startTime;

      logger.debug('LLMExecutionEngine', `LLM execution completed`, {
        processingTime,
        tokenUsage: response.usage.totalTokens,
        finishReason: response.finishReason
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('LLMExecutionEngine', 'LLM execution failed', error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Parse analysis response from LLM
   */
  private async parseAnalysisResponse(
    signal: Signal,
    context: ProcessingContext,
    response: ModelResponse,
    processingTime: number
  ): Promise<InspectorAnalysis> {
    try {
      // Parse structured response
      const responseData = typeof response.response === 'string'
        ? JSON.parse(response.response as string)
        : response.response;

      // Extract classification
      const classification: SignalClassification = {
        category: responseData.category || 'unknown',
        subcategory: responseData.subcategory || 'general',
        priority: responseData.priority || signal.priority || 5,
        agentRole: responseData.agentRole || 'developer',
        escalationLevel: responseData.escalationLevel || 1,
        deadline: responseData.deadline ? new Date(responseData.deadline) : new Date(Date.now() + 86400000), // 24h default
        dependencies: responseData.dependencies || [],
        confidence: responseData.confidence || 50
      };

      // Extract recommendations
      const recommendations: Recommendation[] = (responseData.recommendations || []).map((rec: RecommendationData) => ({
        type: rec.type || 'action',
        priority: rec.priority || 'medium',
        description: rec.description || 'No description provided',
        estimatedTime: rec.estimatedTime || 30, // minutes
        prerequisites: rec.prerequisites || []
      }));

      // Calculate cost
      const cost = this.calculateCost(response.usage.totalTokens);

      return {
        signalId: signal.id,
        classification,
        context,
        recommendations,
        tokenUsage: {
          input: response.usage.promptTokens,
          output: response.usage.completionTokens,
          total: response.usage.totalTokens,
          cost
        },
        confidence: classification.confidence,
        processingTime,
        model: this.provider.model
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('LLMExecutionEngine', 'Failed to parse analysis response', error instanceof Error ? error : new Error(errorMessage));

      // Return fallback analysis
      return this.createFallbackAnalysis(signal, context, response, processingTime);
    }
  }

  /**
   * Create fallback analysis when parsing fails
   */
  private createFallbackAnalysis(
    signal: Signal,
    context: ProcessingContext,
    response: ModelResponse,
    processingTime: number
  ): InspectorAnalysis {
    const cost = this.calculateCost(response.usage.totalTokens);

    return {
      signalId: signal.id,
      classification: {
        category: 'unknown',
        subcategory: 'general',
        priority: signal.priority || 5,
        agentRole: 'robo-developer',
        escalationLevel: 1,
        deadline: new Date(Date.now() + 86400000),
        dependencies: [],
        confidence: 25 // Low confidence for fallback
      },
      context,
      recommendations: [{
        type: 'review',
        priority: 'high',
        description: 'Manual review required due to analysis parsing failure',
        estimatedTime: 15,
        prerequisites: []
      }],
      tokenUsage: {
        input: response.usage.promptTokens,
        output: response.usage.completionTokens,
        total: response.usage.totalTokens,
        cost
      },
      confidence: 25,
      processingTime,
      model: this.provider.model
    };
  }

  /**
   * Compress prompt when exceeding token limits
   */
  private async compressPrompt(components: {
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
    logger.warn('LLMExecutionEngine', 'Applying prompt compression to meet token limits');

    // Apply hierarchical compression
    const compressedContext = await this.compressText(components.contextPrompt, {
      strategy: 'semantic',
      level: 'high',
      preserveKeyInfo: true,
      targetSize: Math.floor(this.tokenLimits.contextWindow * 0.7)
    });

    const compressedGuideline = await this.compressText(components.guidelinePrompt, {
      strategy: 'summary',
      level: 'medium',
      preserveKeyInfo: true,
      targetSize: Math.floor(this.tokenLimits.guidelinePrompt * 0.8)
    });

    return [
      '# SIGNAL ANALYSIS TASK (COMPRESSED)',
      '',
      '## Base Instructions',
      components.basePrompt,
      '',
      '## Analysis Guidelines (SUMMARIZED)',
      compressedGuideline,
      '',
      '## Context Information (COMPRESSED)',
      compressedContext,
      '',
      '## Analysis Required',
      'Provide structured analysis with classification and recommendations.'
    ].join('\n');
  }

  /**
   * Compress text using various strategies
   */
  private async compressText(text: string, compression: ContextCompression): Promise<string> {
    const tokens = this.estimateTokens(text);

    if (tokens <= compression.targetSize) {
      return text;
    }

    switch (compression.strategy) {
      case 'truncate':
        return this.truncateText(text, compression.targetSize);

      case 'summary':
        return await this.summarizeText(text, compression.targetSize);

      case 'semantic':
        return await this.semanticCompress(text, compression);

      case 'cluster':
        return await this.clusterCompress(text, compression);

      default:
        return this.truncateText(text, compression.targetSize);
    }
  }

  /**
   * Compress context intelligently
   */
  private async compressContext(context: ProcessingContext, compression: ContextCompression): Promise<string> {
    // Prioritize important context elements
    const priorityOrder = [
      'signalId',
      'relatedSignals',
      'activePRPs',
      'tokenStatus',
      'agentStatus',
      'guidelineContext',
      'recentActivity',
      'historicalData',
      'environment'
    ];

    let contextText = '';
    let remainingTokens = compression.targetSize;

    for (const key of priorityOrder) {
      if (remainingTokens <= 0) break;

      const value = (context as unknown as Record<string, unknown>)[key];
      if (!value) continue;

      const sectionText = this.serializeContextSection(key, value);
      const sectionTokens = this.estimateTokens(sectionText);

      if (sectionTokens <= remainingTokens) {
        contextText += sectionText + '\n';
        remainingTokens -= sectionTokens;
      } else {
        // Compress this section to fit remaining space
        const compressed = await this.compressText(sectionText, {
          ...compression,
          targetSize: Math.floor(remainingTokens * 0.8)
        });
        contextText += compressed + '\n';
        break;
      }
    }

    return contextText.trim();
  }

  /**
   * Truncate text to target token count
   */
  private truncateText(text: string, targetTokens: number): string {
    const words = text.split(/\s+/);
    const avgTokensPerWord = 1.3; // Average estimation
    const targetWords = Math.floor(targetTokens / avgTokensPerWord);

    if (words.length <= targetWords) {
      return text;
    }

    return words.slice(0, targetWords).join(' ') + '... [truncated]';
  }

  /**
   * Summarize text (placeholder for LLM-based summarization)
   */
  private async summarizeText(text: string, targetTokens: number): Promise<string> {
    // In a real implementation, this would use the LLM to summarize
    // For now, use intelligent truncation
    return this.truncateText(text, targetTokens);
  }

  /**
   * Semantic compression (placeholder for advanced implementation)
   */
  private async semanticCompress(text: string, compression: ContextCompression): Promise<string> {
    // In a real implementation, this would use semantic analysis
    // For now, use summary compression
    return await this.summarizeText(text, compression.targetSize);
  }

  /**
   * Cluster compression (placeholder for advanced implementation)
   */
  private async clusterCompress(text: string, compression: ContextCompression): Promise<string> {
    // In a real implementation, this would cluster similar content
    // For now, use semantic compression
    return await this.semanticCompress(text, compression);
  }

  /**
   * Serialize context to text
   */
  private serializeContext(context: ProcessingContext): string {
    const sections = [
      `Signal ID: ${context.signalId}`,
      `Worktree: ${context.worktree || 'N/A'}`,
      `Agent: ${context.agent || 'N/A'}`,
      `Related Signals: ${context.relatedSignals.length}`,
      `Active PRPs: ${context.activePRPs.length}`,
      `Recent Activity: ${context.recentActivity.length} entries`,
      `Agent Status: ${context.agentStatus.length} agents`,
      `Environment: ${context.environment.worktree}@${context.environment.branch}`
    ];

    return sections.join('\n');
  }

  /**
   * Serialize context section
   */
  private serializeContextSection(key: string, value: unknown): string {
    switch (key) {
      case 'signalId':
        return `**Signal ID:** ${value}`;

      case 'relatedSignals':
        return `**Related Signals:** ${(value as unknown[]).length} signals`;

      case 'activePRPs':
        return `**Active PRPs:** ${(value as string[]).join(', ')}`;

      case 'recentActivity':
        return `**Recent Activity:** ${(value as ActivityData[]).slice(0, 5).map((a: ActivityData) => `${a.action} by ${a.actor}`).join(', ')}`;

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
   * Calculate cost based on token usage
   */
  private calculateCost(tokens: number): number {
    return tokens * this.provider.costPerToken;
  }

  /**
   * Setup compression strategies
   */
  private setupCompressionStrategies(): void {
    this.compressionStrategies.set('guideline', {
      strategy: 'summary',
      level: 'medium',
      preserveKeyInfo: true,
      targetSize: this.tokenLimits.guidelinePrompt
    });

    this.compressionStrategies.set('context', {
      strategy: 'semantic',
      level: 'high',
      preserveKeyInfo: true,
      targetSize: this.tokenLimits.contextWindow
    });
  }

  /**
   * Update metrics
   */
  private updateMetrics(analysis: InspectorAnalysis, success: boolean): void {
    this.metrics.totalProcessed++;

    if (success) {
      this.metrics.successfulClassifications++;
    } else {
      this.metrics.failedClassifications++;
    }

    // Update average processing time
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + analysis.processingTime) /
      this.metrics.totalProcessed;

    // Update token usage averages
    this.metrics.averageTokenUsage.input =
      (this.metrics.averageTokenUsage.input * (this.metrics.totalProcessed - 1) + analysis.tokenUsage.input) /
      this.metrics.totalProcessed;

    this.metrics.averageTokenUsage.output =
      (this.metrics.averageTokenUsage.output * (this.metrics.totalProcessed - 1) + analysis.tokenUsage.output) /
      this.metrics.totalProcessed;

    this.metrics.averageTokenUsage.total =
      (this.metrics.averageTokenUsage.total * (this.metrics.totalProcessed - 1) + analysis.tokenUsage.total) /
      this.metrics.totalProcessed;

    // Update success rate
    this.metrics.successRate = (this.metrics.successfulClassifications / this.metrics.totalProcessed) * 100;

    // Update token efficiency
    this.metrics.tokenEfficiency = this.metrics.successRate > 0
      ? (this.metrics.successfulClassifications * this.metrics.averageTokenUsage.total) / 100
      : 0;

    // Update performance metrics
    if (analysis.processingTime > this.metrics.performance.slowestClassification) {
      this.metrics.performance.slowestClassification = analysis.processingTime;
    }

    if (this.metrics.performance.fastestClassification === 0 ||
        analysis.processingTime < this.metrics.performance.fastestClassification) {
      this.metrics.performance.fastestClassification = analysis.processingTime;
    }
  }

  /**
   * Get engine metrics
   */
  getMetrics(): InspectorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get token limit configuration
   */
  getTokenLimits(): TokenLimitConfig {
    return { ...this.tokenLimits };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.contextCache.clear();
    logger.info('LLMExecutionEngine', 'Cache cleared');
  }
}