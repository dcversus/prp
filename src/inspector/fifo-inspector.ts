/**
 * ♫ FIFO Inspector for @dcversus/prp
 *
 * Simplified FIFO inspector implementation for PRP-000-agents05
 * - Uses cheapest model with largest context window
 * - 1M token cap with 40K output limit
 * - FIFO queue processing
 * - Structured output with schema validation
 * - Dynamic guideline loading from /src/guidelines/XX/
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import { HashUtils, createLayerLogger } from '../shared';
import { GuidelineAdapter } from './guideline-adapter';

const logger = createLayerLogger('inspector');

/**
 * Inspector configuration matching PRP requirements
 */
export interface FIFOInspectorConfig {
  // LLM Configuration - cheapest model with largest context
  model: {
    provider: 'openai' | 'anthropic' | 'local';
    name: string;                    // e.g., 'gpt-4o-mini', 'claude-instant'
    maxContext: number;              // e.g., 128000, 200000
    costPerToken: number;            // cheapest available
  };

  // Token limits from PRP
  tokenLimits: {
    inspectorCap: number;            // 1M tokens
    outputLimit: number;             // 40K output limit
    basePrompt: number;              // Base prompt tokens
    guidelinePrompt: number;         // Guideline tokens
    contextWindow: number;           // Dynamic calculation
    safetyMargin: number;            // 5% safety margin
  };

  // Processing configuration
  processing: {
    maxConcurrent: number;           // Default 2 inspectors
    queueTimeout: number;            // Queue timeout in ms
    requestTimeout: number;          // Single request timeout
    retryAttempts: number;           // Retry attempts
    retryDelay: number;              // Retry delay in ms
  };

  // Feature flags
  features: {
    enableCache: boolean;
    enableMetrics: boolean;
    enableCompression: boolean;
  };
}

/**
 * FIFO queue item
 */
interface QueueItem {
  id: string;
  signal: Signal;
  guideline: string;
  context: Record<string, unknown>;
  priority: number;
  addedAt: Date;
  timeout?: NodeJS.Timeout;
}

/**
 * Inspector analysis result with structured output
 */
export interface InspectorAnalysisResult {
  id: string;
  signalId: string;
  success: boolean;
  classification: {
    category: string;
    subcategory: string;
    priority: number;               // 1-10
    agentRole: string;
    escalationLevel: number;        // 1-5
    deadline: string;               // ISO date
    dependencies: string[];
    confidence: number;             // 0-100
  };
  payload: {
    id: string;
    signalId: string;
    classification: InspectorAnalysisResult['classification'];
    context: Record<string, unknown>;
    recommendations: Array<{
      type: string;
      priority: string;
      description: string;
      estimatedTime: number;
      prerequisites: string[];
      reasoning?: string;
    }>;
    timestamp: string;
    size: number;
    compressed: boolean;
  };
  processingTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  model: string;
  timestamp: string;
  error?: string;
}

/**
 * FIFO Inspector - PRP-000-agents05 Implementation
 */
export class FIFOInspector extends EventEmitter {
  private config: FIFOInspectorConfig;
  private guidelineAdapter: GuidelineAdapter;
  private queue: QueueItem[] = [];
  private processing: Map<string, QueueItem> = new Map();
  private activeRequests: Map<string, NodeJS.Timeout> = new Map();
  private cache: Map<string, InspectorAnalysisResult> = new Map();
  private isProcessing = false;
  private metrics = {
    totalProcessed: 0,
    successfulAnalysis: 0,
    failedAnalysis: 0,
    averageProcessingTime: 0,
    totalTokensUsed: 0,
    totalCost: 0,
    queueLength: 0,
    processingRate: 0
  };

  constructor(config?: Partial<FIFOInspectorConfig>) {
    super();

    // Default configuration - cheapest model with largest context
    this.config = {
      model: {
        provider: 'openai',
        name: 'gpt-4o-mini',         // Cheapest with 128K context
        maxContext: 128000,
        costPerToken: 0.00000015     // GPT-4o-mini pricing
      },
      tokenLimits: {
        inspectorCap: 1000000,      // 1M tokens inspector cap
        outputLimit: 40000,         // 40K output limit
        basePrompt: 20000,          // 20K base prompt
        guidelinePrompt: 20000,     // 20K guidelines
        contextWindow: 0,           // Will be calculated
        safetyMargin: 0.05          // 5% safety margin
      },
      processing: {
        maxConcurrent: 2,           // Default 2 inspectors
        queueTimeout: 300000,       // 5 minutes
        requestTimeout: 60000,      // 1 minute per request
        retryAttempts: 3,
        retryDelay: 1000
      },
      features: {
        enableCache: true,
        enableMetrics: true,
        enableCompression: true
      },
      ...config
    };

    // Calculate dynamic context window
    this.config.tokenLimits.contextWindow =
      this.config.tokenLimits.inspectorCap -
      this.config.tokenLimits.basePrompt -
      this.config.tokenLimits.guidelinePrompt -
      Math.floor(this.config.tokenLimits.inspectorCap * this.config.tokenLimits.safetyMargin);

    this.guidelineAdapter = new GuidelineAdapter();

    logger.info('FIFOInspector', 'Initialized FIFO Inspector', {
      model: this.config.model.name,
      inspectorCap: this.config.tokenLimits.inspectorCap,
      outputLimit: this.config.tokenLimits.outputLimit,
      contextWindow: this.config.tokenLimits.contextWindow,
      maxConcurrent: this.config.processing.maxConcurrent
    });
  }

  /**
   * Add signal to FIFO queue for processing
   */
  async addToQueue(signal: Signal, context?: Record<string, unknown>): Promise<string> {
    const queueId = HashUtils.generateId();

    // Get appropriate guideline for this signal
    const guideline = await this.guidelineAdapter.getGuidelineForSignal(signal);

    if (!guideline) {
      logger.warn('FIFOInspector', `No guideline found for signal type: ${signal.type}`);
      throw new Error(`No guideline found for signal type: ${signal.type}`);
    }

    const queueItem: QueueItem = {
      id: queueId,
      signal,
      guideline,
      context: context || {},
      priority: signal.priority || 5,
      addedAt: new Date()
    };

    // Add to queue (FIFO order, but priority can override)
    if (queueItem.priority >= 8) {
      // High priority items go to front
      this.queue.unshift(queueItem);
    } else {
      // Normal FIFO order
      this.queue.push(queueItem);
    }

    // Set queue timeout
    queueItem.timeout = setTimeout(() => {
      this.removeFromQueue(queueId, 'Queue timeout');
    }, this.config.processing.queueTimeout);

    // Update metrics
    this.metrics.queueLength = this.queue.length;

    logger.info('FIFOInspector', `Signal added to queue: ${signal.type}`, {
      queueId,
      signalId: signal.id,
      queueLength: this.queue.length,
      priority: queueItem.priority
    });

    // Start processing if not already running
    setImmediate(() => this.processQueue());

    return queueId;
  }

  /**
   * Process FIFO queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    if (this.processing.size >= this.config.processing.maxConcurrent) {
      return; // Max concurrent requests reached
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.processing.size < this.config.processing.maxConcurrent) {
        const queueItem = this.queue.shift()!;
        await this.processSignal(queueItem);
      }
    } catch (error) {
      logger.error('FIFOInspector', 'Queue processing error', error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isProcessing = false;
      this.metrics.queueLength = this.queue.length;
    }
  }

  /**
   * Process individual signal
   */
  private async processSignal(queueItem: QueueItem): Promise<void> {
    const { id, signal, guideline, context } = queueItem;

    // Clear queue timeout
    if (queueItem.timeout) {
      clearTimeout(queueItem.timeout);
    }

    // Add to processing map
    this.processing.set(id, queueItem);

    // Set request timeout
    const requestTimeout = setTimeout(() => {
      this.removeFromProcessing(id, 'Request timeout');
    }, this.config.processing.requestTimeout);

    this.activeRequests.set(id, requestTimeout);

    try {
      logger.info('FIFOInspector', `Processing signal: ${signal.type}`, {
        queueId: id,
        signalId: signal.id
      });

      // Check cache first
      if (this.config.features.enableCache) {
        const cacheKey = await this.generateCacheKey(signal, guideline);
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.handleResult(id, cached);
          return;
        }
      }

      // Prepare analysis components within token limits
      const components = await this.prepareAnalysisComponents(signal, guideline, context);

      // Build optimized prompt within token limits
      const prompt = await this.buildAnalysisPrompt(components, signal, guideline);

      // Execute LLM analysis with structured output
      const result = await this.executeLLMAnalysis(prompt, signal);

      // Validate and store result
      const validatedResult = await this.validateAndStructureResult(result, signal);

      // Cache result if enabled
      if (this.config.features.enableCache) {
        const cacheKey = await this.generateCacheKey(signal, guideline);
        this.cache.set(cacheKey, validatedResult);
      }

      // Handle successful result
      this.handleResult(id, validatedResult);

    } catch (error) {
      logger.error('FIFOInspector', `Signal processing failed: ${signal.type}`, error instanceof Error ? error : new Error(String(error)));

      // Create error result
      const errorResult: InspectorAnalysisResult = {
        id: HashUtils.generateId(),
        signalId: signal.id,
        success: false,
        classification: {
          category: 'error',
          subcategory: 'processing_failed',
          priority: 1,
          agentRole: 'robo-developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 0
        },
        payload: {
          id: HashUtils.generateId(),
          signalId: signal.id,
          classification: {
            category: 'error',
            subcategory: 'processing_failed',
            priority: 1,
            agentRole: 'robo-developer',
            escalationLevel: 1,
            deadline: new Date(Date.now() + 86400000).toISOString(),
            dependencies: [],
            confidence: 0
          },
          context: {},
          recommendations: [{
            type: 'review',
            priority: 'high',
            description: 'Manual review required due to processing failure',
            estimatedTime: 15,
            prerequisites: []
          }],
          timestamp: new Date().toISOString(),
          size: 0,
          compressed: false
        },
        processingTime: 0,
        tokenUsage: { input: 0, output: 0, total: 0, cost: 0 },
        model: this.config.model.name,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };

      this.handleResult(id, errorResult);
    }
  }

  /**
   * Prepare analysis components within token limits
   */
  private async prepareAnalysisComponents(
    signal: Signal,
    guideline: string,
    context: Record<string, unknown>
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
    // Generate base prompt
    const basePrompt = this.generateBasePrompt(signal);

    // Prepare guideline within token limit
    const guidelinePrompt = await this.truncateToTokenLimit(
      guideline,
      this.config.tokenLimits.guidelinePrompt
    );

    // Prepare context within token limit
    const contextPrompt = await this.truncateToTokenLimit(
      JSON.stringify(context, null, 2),
      this.config.tokenLimits.contextWindow
    );

    const tokenDistribution = {
      base: this.estimateTokens(basePrompt),
      guideline: this.estimateTokens(guidelinePrompt),
      context: this.estimateTokens(contextPrompt),
      total: 0
    };

    tokenDistribution.total = tokenDistribution.base + tokenDistribution.guideline + tokenDistribution.context;

    // Verify within inspector cap
    if (tokenDistribution.total > this.config.tokenLimits.inspectorCap) {
      logger.warn('FIFOInspector', `Prompt exceeds inspector cap: ${tokenDistribution.total}/${this.config.tokenLimits.inspectorCap}`);

      // Apply aggressive compression
      const compressedContext = await this.truncateToTokenLimit(
        contextPrompt,
        Math.floor(this.config.tokenLimits.contextWindow * 0.5)
      );

      tokenDistribution.context = this.estimateTokens(compressedContext);
      tokenDistribution.total = tokenDistribution.base + tokenDistribution.guideline + tokenDistribution.context;
    }

    return {
      basePrompt,
      guidelinePrompt,
      contextPrompt,
      tokenDistribution
    };
  }

  /**
   * Generate base prompt for signal analysis
   */
  private generateBasePrompt(signal: Signal): string {
    return `You are an expert Inspector analyzing signals for the PRP (Product Requirement Prompts) workflow system.

TASK: Analyze the provided signal and generate comprehensive classification and actionable recommendations.

SIGNAL DETAILS:
- Type: ${signal.type}
- ID: ${signal.id}
- Source: ${signal.source}
- Priority: ${signal.priority}
- Timestamp: ${signal.timestamp.toISOString()}
- Data: ${JSON.stringify(signal.data, null, 2)}

CLASSIFICATION CRITERIA:
1. **Category**: Primary classification (development, testing, deployment, security, performance, etc.)
2. **Subcategory**: Specific classification within category
3. **Priority**: Numerical priority (1-10, where 10 is highest)
4. **Agent Role**: Appropriate agent role (robo-developer, robo-aqa, robo-devops-sre, etc.)
5. **Escalation Level**: Escalation urgency (1-5)
6. **Deadline**: Recommended deadline for resolution (ISO date string)
7. **Dependencies**: Required dependencies or prerequisites
8. **Confidence**: Confidence in classification (0-100)

RECOMMENDATION CRITERIA:
1. **Type**: Action type (implement, review, test, deploy, etc.)
2. **Priority**: Priority level (high, medium, low)
3. **Description**: Clear, actionable description
4. **Time Estimate**: Estimated time in minutes
5. **Prerequisites**: Required prerequisites
6. **Reasoning**: Why this recommendation is needed

Provide specific, actionable recommendations with clear time estimates and prerequisites.

RESPONSE FORMAT:
Respond with valid JSON following this exact structure:
{
  "classification": {
    "category": "string",
    "subcategory": "string",
    "priority": number,
    "agentRole": "string",
    "escalationLevel": number,
    "deadline": "ISO date string",
    "dependencies": ["string"],
    "confidence": number
  },
  "recommendations": [
    {
      "type": "string",
      "priority": "high|medium|low",
      "description": "string",
      "estimatedTime": number,
      "prerequisites": ["string"],
      "reasoning": "string"
    }
  ]
}

IMPORTANT: Ensure all required fields are included and values are properly typed. The deadline must be a valid ISO date string.`;
  }

  /**
   * Build analysis prompt with all components
   */
  private async buildAnalysisPrompt(
    components: {
      basePrompt: string;
      guidelinePrompt: string;
      contextPrompt: string;
      tokenDistribution: { base: number; guideline: number; context: number; total: number };
    },
    _signal: Signal,
    _guideline: string
  ): Promise<string> {
    const prompt = [
      '# INSPECTOR SIGNAL ANALYSIS',
      '',
      'You are an expert Inspector analyzing signals for the PRP workflow system.',
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
      '4. Risk assessment and escalation level',
      '5. Specific recommendations with time estimates',
      '6. Context implications and dependencies',
      '',
      '## OUTPUT FORMAT',
      'Respond with valid JSON following the exact structure specified in the base instructions.',
      '',
      'IMPORTANT: Ensure all required fields are included and values are properly typed.'
    ].join('\n');

    return prompt;
  }

  /**
   * Execute LLM analysis with structured output
   */
  private async executeLLMAnalysis(prompt: string, signal: Signal): Promise<any> {
    // This would integrate with actual LLM providers
    // For now, generate a mock response that matches the expected structure

    logger.debug('FIFOInspector', 'Executing LLM analysis', {
      signalId: signal.id,
      promptLength: prompt.length,
      estimatedTokens: this.estimateTokens(prompt)
    });

    // Mock response - replace with actual LLM integration
    const mockResponse = {
      classification: {
        category: 'development',
        subcategory: 'implementation',
        priority: signal.priority || 5,
        agentRole: 'robo-developer',
        escalationLevel: 2,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        dependencies: [],
        confidence: 85
      },
      recommendations: [
        {
          type: 'implement',
          priority: 'high',
          description: 'Implement the required functionality based on signal analysis',
          estimatedTime: 120,
          prerequisites: [],
          reasoning: 'Signal indicates implementation need with medium complexity'
        }
      ]
    };

    return mockResponse;
  }

  /**
   * Validate and structure result
   */
  private async validateAndStructureResult(
    result: any,
    signal: Signal
  ): Promise<InspectorAnalysisResult> {
    // Validate required fields
    if (!result.classification || !result.recommendations) {
      throw new Error('Invalid LLM response: missing required fields');
    }

    // Create structured result
    const structuredResult: InspectorAnalysisResult = {
      id: HashUtils.generateId(),
      signalId: signal.id,
      success: true,
      classification: {
        category: result.classification.category || 'unknown',
        subcategory: result.classification.subcategory || 'general',
        priority: Math.max(1, Math.min(10, result.classification.priority || 5)),
        agentRole: result.classification.agentRole || 'robo-developer',
        escalationLevel: Math.max(1, Math.min(5, result.classification.escalationLevel || 1)),
        deadline: result.classification.deadline || new Date(Date.now() + 86400000).toISOString(),
        dependencies: Array.isArray(result.classification.dependencies) ? result.classification.dependencies : [],
        confidence: Math.max(0, Math.min(100, result.classification.confidence || 50))
      },
      payload: {
        id: HashUtils.generateId(),
        signalId: signal.id,
        classification: {
          category: result.classification.category || 'unknown',
          subcategory: result.classification.subcategory || 'general',
          priority: Math.max(1, Math.min(10, result.classification.priority || 5)),
          agentRole: result.classification.agentRole || 'robo-developer',
          escalationLevel: Math.max(1, Math.min(5, result.classification.escalationLevel || 1)),
          deadline: result.classification.deadline || new Date(Date.now() + 86400000).toISOString(),
          dependencies: Array.isArray(result.classification.dependencies) ? result.classification.dependencies : [],
          confidence: Math.max(0, Math.min(100, result.classification.confidence || 50))
        },
        context: {},
        recommendations: Array.isArray(result.recommendations) ? result.recommendations.map((rec: any) => ({
          type: rec.type || 'action',
          priority: rec.priority || 'medium',
          description: rec.description || 'No description provided',
          estimatedTime: Math.max(1, rec.estimatedTime || 30),
          prerequisites: Array.isArray(rec.prerequisites) ? rec.prerequisites : [],
          reasoning: rec.reasoning
        })) : [],
        timestamp: new Date().toISOString(),
        size: JSON.stringify(result).length,
        compressed: false
      },
      processingTime: 0, // Would be calculated from actual LLM call
      tokenUsage: {
        input: 0, // Would be calculated from actual LLM call
        output: 0,
        total: 0,
        cost: 0
      },
      model: this.config.model.name,
      timestamp: new Date().toISOString()
    };

    return structuredResult;
  }

  /**
   * Handle successful or error result
   */
  private handleResult(queueId: string, result: InspectorAnalysisResult): void {
    // Clear timeout
    const timeout = this.activeRequests.get(queueId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeRequests.delete(queueId);
    }

    // Remove from processing
    this.processing.delete(queueId);

    // Update metrics
    if (result.success) {
      this.metrics.successfulAnalysis++;
    } else {
      this.metrics.failedAnalysis++;
    }
    this.metrics.totalProcessed++;
    this.metrics.totalTokensUsed += result.tokenUsage.total;
    this.metrics.totalCost += result.tokenUsage.cost;

    // Calculate average processing time
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + result.processingTime) /
      this.metrics.totalProcessed;

    // Emit result
    this.emit('result', { queueId, result });

    logger.info('FIFOInspector', `Signal analysis completed: ${result.signalId}`, {
      queueId,
      success: result.success,
      processingTime: result.processingTime,
      tokenUsage: result.tokenUsage.total
    });

    // Continue processing queue
    setImmediate(() => this.processQueue());
  }

  /**
   * Remove item from queue (timeout or error)
   */
  private removeFromQueue(queueId: string, reason: string): void {
    const index = this.queue.findIndex(item => item.id === queueId);
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];

      if (item) {
        if (item.timeout) {
          clearTimeout(item.timeout);
        }

        logger.warn('FIFOInspector', `Item removed from queue: ${reason}`, {
          queueId,
          signalId: item.signal.id,
          reason
        });
      }

      this.metrics.queueLength = this.queue.length;
    }
  }

  /**
   * Remove item from processing (timeout or error)
   */
  private removeFromProcessing(queueId: string, reason: string): void {
    const item = this.processing.get(queueId);
    if (item) {
      this.processing.delete(queueId);

      const timeout = this.activeRequests.get(queueId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeRequests.delete(queueId);
      }

      logger.warn('FIFOInspector', `Item removed from processing: ${reason}`, {
        queueId,
        signalId: item.signal.id,
        reason
      });

      // Create error result
      const errorResult: InspectorAnalysisResult = {
        id: HashUtils.generateId(),
        signalId: item.signal.id,
        success: false,
        classification: {
          category: 'error',
          subcategory: 'timeout',
          priority: 1,
          agentRole: 'robo-developer',
          escalationLevel: 1,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          dependencies: [],
          confidence: 0
        },
        payload: {
          id: HashUtils.generateId(),
          signalId: item.signal.id,
          classification: {
            category: 'error',
            subcategory: 'timeout',
            priority: 1,
            agentRole: 'robo-developer',
            escalationLevel: 1,
            deadline: new Date(Date.now() + 86400000).toISOString(),
            dependencies: [],
            confidence: 0
          },
          context: {},
          recommendations: [{
            type: 'review',
            priority: 'high',
            description: `Processing failed: ${reason}`,
            estimatedTime: 15,
            prerequisites: []
          }],
          timestamp: new Date().toISOString(),
          size: 0,
          compressed: false
        },
        processingTime: this.config.processing.requestTimeout,
        tokenUsage: { input: 0, output: 0, total: 0, cost: 0 },
        model: this.config.model.name,
        timestamp: new Date().toISOString(),
        error: reason
      };

      this.handleResult(queueId, errorResult);
    }
  }

  /**
   * Generate cache key for signal
   */
  private async generateCacheKey(signal: Signal, guideline: string): Promise<string> {
    const hash = await HashUtils.hashString(guideline);
    return `${signal.type}-${signal.id}-${hash.substring(0, 8)}`;
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
  private async truncateToTokenLimit(text: string, targetTokens: number): Promise<string> {
    const targetChars = targetTokens * 4;
    if (text.length <= targetChars) {
      return text;
    }
    return text.substring(0, targetChars - 3) + '...';
  }

  /**
   * Get inspector status and metrics
   */
  getStatus() {
    return {
      isRunning: true,
      config: this.config,
      metrics: { ...this.metrics },
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear cache and reset metrics
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('FIFOInspector', 'Cache cleared');
    this.emit('cache:cleared');
  }

  /**
   * Stop inspector and clean up
   */
  stop(): void {
    // Clear all timeouts
    for (const timeout of this.activeRequests.values()) {
      clearTimeout(timeout);
    }
    this.activeRequests.clear();

    // Clear queue timeouts
    for (const item of this.queue) {
      if (item.timeout) {
        clearTimeout(item.timeout);
      }
    }

    // Clear all collections
    this.queue = [];
    this.processing.clear();
    this.cache.clear();

    logger.info('FIFOInspector', 'Inspector stopped');
    this.emit('stopped');
  }
}