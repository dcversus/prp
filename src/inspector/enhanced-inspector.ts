/**
 * ♫ Enhanced Inspector for @dcversus/prp
 *
 * Complete Phase 2 implementation with LLM-powered analysis,
 * parallel execution, and intelligent context management.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import {
  InspectorConfig,
  DetailedInspectorResult,
  InspectorMetrics,
  ProcessingContext,
  Recommendation,
  InspectorPayload,
  PreparedContext
} from './types';
import { LLMExecutionEngine, LLMProvider, TokenLimitConfig } from './llm-execution-engine';
import { ContextManager, ContextWindowConfig } from './context-manager';
import { ParallelExecutor, ParallelExecutionConfig } from './parallel-executor';
import { GuidelineAdapter } from './guideline-adapter';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

/**
 * Enhanced Inspector Configuration
 */
export interface EnhancedInspectorConfig {
  // Inspector base configuration
  inspector: InspectorConfig;

  // LLM execution configuration
  llm: {
    provider: LLMProvider;
    tokenLimits: TokenLimitConfig;
  };

  // Context management configuration
  context: ContextWindowConfig;

  // Parallel execution configuration
  parallel: ParallelExecutionConfig;

  // Feature flags
  features: {
    enableSemanticSummarization: boolean;
    enableParallelProcessing: boolean;
    enableIntelligentCompression: boolean;
    enableHistoricalAnalysis: boolean;
    enablePredictiveProcessing: boolean;
  };
}

/**
 * Inspector Analysis Request
 */
export interface InspectorAnalysisRequest {
  id: string;
  signal: Signal;
  priority: number;
  createdAt: Date;
  context?: ProcessingContext;
  options?: {
    forceReprocess?: boolean;
    useCache?: boolean;
    timeout?: number;
  };
}

/**
 * Inspector Analysis Response
 */
export interface InspectorAnalysisResponse {
  id: string;
  request: InspectorAnalysisRequest;
  result: DetailedInspectorResult;
  processingTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
  confidence: number;
  recommendations: Recommendation[];
  contextUsed: boolean;
  cacheHit: boolean;
}

/**
 * Enhanced Inspector - Complete Phase 2 Implementation
 */
export class EnhancedInspector extends EventEmitter {
  private config: EnhancedInspectorConfig;
  private llmEngine: LLMExecutionEngine;
  private contextManager: ContextManager;
  private parallelExecutor!: ParallelExecutor;
  private guidelineAdapter: GuidelineAdapter;
  private isRunning = false;
  private processingRequests: Map<string, InspectorAnalysisRequest> = new Map();
  private responseCache: Map<string, InspectorAnalysisResponse> = new Map();

  // Performance metrics
  private metrics: InspectorMetrics = {
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

  constructor(config: EnhancedInspectorConfig) {
    super();
    this.config = config;

    // Initialize components
    this.llmEngine = new LLMExecutionEngine(config.inspector, config.llm.provider);
    this.contextManager = new ContextManager(config.context);
    this.guidelineAdapter = new GuidelineAdapter();

    // Initialize parallel executor if enabled
    if (config.features.enableParallelProcessing) {
      this.parallelExecutor = new ParallelExecutor(
        config.parallel,
        this.llmEngine
      );
    }

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Start the enhanced inspector
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Enhanced inspector is already running');
    }

    logger.info('EnhancedInspector', 'Starting Phase 2 Inspector with all features');

    try {
      // Load guidelines
      await this.guidelineAdapter.loadGuidelines();

      // Start parallel executor if enabled
      if (this.parallelExecutor) {
        await this.parallelExecutor.start();
      }

      this.isRunning = true;

      logger.info('EnhancedInspector', 'Started successfully', {
        features: this.config.features,
        parallelProcessing: !!this.parallelExecutor
      });

      this.emit('inspector:started', {
        features: this.config.features,
        startTime: new Date()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('EnhancedInspector', 'Failed to start', error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Stop the enhanced inspector
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('EnhancedInspector', 'Stopping enhanced inspector');

    try {
      // Stop parallel executor if running
      if (this.parallelExecutor) {
        await this.parallelExecutor.stop();
      }

      // Clear caches
      this.responseCache.clear();
      this.processingRequests.clear();

      this.isRunning = false;

      logger.info('EnhancedInspector', 'Stopped successfully');
      this.emit('inspector:stopped');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('EnhancedInspector', 'Error during shutdown', error instanceof Error ? error : new Error(errorMessage));
    }
  }

  /**
   * Analyze signal with complete Phase 2 capabilities
   */
  async analyzeSignal(signal: Signal, options?: {
    forceReprocess?: boolean;
    useCache?: boolean;
    timeout?: number;
  }): Promise<InspectorAnalysisResponse> {
    if (!this.isRunning) {
      throw new Error('Enhanced inspector is not running');
    }

    const requestId = HashUtils.generateId();
    const request: InspectorAnalysisRequest = {
      id: requestId,
      signal,
      priority: signal.priority || 5,
      createdAt: new Date(),
      options: {
        forceReprocess: options?.forceReprocess || false,
        useCache: options?.useCache !== false, // Default to true
        timeout: options?.timeout || 60000 // 1 minute default
      }
    };

    try {
      logger.info('EnhancedInspector', `Analyzing signal: ${signal.type}`, {
        requestId,
        signalId: signal.id,
        priority: signal.priority
      });

      // Add to processing requests
      this.processingRequests.set(requestId, request);

      // Check cache if enabled
      if (request.options?.useCache && !request.options?.forceReprocess) {
        const cachedResponse = this.getCachedResponse(signal);
        if (cachedResponse) {
          logger.debug('EnhancedInspector', `Cache hit for signal: ${signal.type}`);
          this.processingRequests.delete(requestId);
          return cachedResponse;
        }
      }

      // Add signal to context
      this.contextManager.addSignal(signal);

      // Build processing context
      const context = this.contextManager.getProcessingContext(signal.id);

      // Get appropriate guideline
      const guideline = await this.guidelineAdapter.getGuidelineForSignal(signal);

      if (!guideline) {
        throw new Error(`No guideline found for signal type: ${signal.type}`);
      }

      // Process signal
      let result: DetailedInspectorResult;

      if (this.parallelExecutor && this.config.features.enableParallelProcessing) {
        // Use parallel execution
        const processor = {
          signal,
          guideline,
          context,
          priority: signal.priority || 5,
          createdAt: new Date()
        };

        result = await this.parallelExecutor.processSignal(signal, processor);
      } else {
        // Use sequential execution
        result = await this.processSignalSequentially(signal, context, guideline);
      }

      // Create response
      const response: InspectorAnalysisResponse = {
        id: requestId,
        request,
        result,
        processingTime: result.processingTime,
        tokenUsage: this.calculateTokenUsage(result),
        confidence: result.confidence || 0,
        recommendations: result.recommendations || [],
        contextUsed: true,
        cacheHit: false
      };

      // Cache response if caching enabled
      if (request.options?.useCache) {
        this.cacheResponse(signal, response);
      }

      // Update metrics
      this.updateMetrics(response, true);

      // Clean up
      this.processingRequests.delete(requestId);

      logger.info('EnhancedInspector', `Signal analysis completed: ${signal.type}`, {
        requestId,
        processingTime: response.processingTime,
        confidence: response.confidence,
        tokenUsage: response.tokenUsage.total
      });

      this.emit('signal:analyzed', response);

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('EnhancedInspector', `Signal analysis failed: ${signal.type}`, error instanceof Error ? error : new Error(errorMessage));

      // Update error metrics
      this.updateMetrics({
        id: requestId,
        request,
        result: {} as DetailedInspectorResult,
        processingTime: 0,
        tokenUsage: { input: 0, output: 0, total: 0, cost: 0 },
        confidence: 0,
        recommendations: [],
        contextUsed: false,
        cacheHit: false
      }, false);

      // Clean up
      this.processingRequests.delete(requestId);

      this.emit('signal:analysis:failed', { requestId, signal, error });

      throw error;
    }
  }

  /**
   * Process multiple signals in batch
   */
  async analyzeBatch(signals: Signal[], options?: {
    enableParallel?: boolean;
    timeout?: number;
  }): Promise<InspectorAnalysisResponse[]> {
    if (!this.isRunning) {
      throw new Error('Enhanced inspector is not running');
    }

    const enableParallel = options?.enableParallel !== false; // Default to true
    const responses: InspectorAnalysisResponse[] = [];

    if (enableParallel && this.parallelExecutor) {
      // Process in parallel
      const processors = signals.map(signal => ({
        signal,
        guideline: '', // Will be populated by parallel executor
        context: {} as ProcessingContext,
        priority: signal.priority || 5,
        createdAt: new Date()
      }));

      const results = await this.parallelExecutor.processBatch(signals, processors);

      // Convert results to responses
      for (let i = 0; i < signals.length; i++) {
        const signal = signals[i];
        const result = results[i];

        if (result) {
          const response: InspectorAnalysisResponse = {
            id: HashUtils.generateId(),
            request: {
              id: HashUtils.generateId(),
              signal,
              priority: signal.priority || 5,
              createdAt: new Date()
            },
            result,
            processingTime: result.processingTime,
            tokenUsage: this.calculateTokenUsage(result),
            confidence: result.confidence || 0,
            recommendations: result.recommendations || [],
            contextUsed: true,
            cacheHit: false
          };

          responses.push(response);
        }
      }
    } else {
      // Process sequentially
      for (const signal of signals) {
        try {
          const response = await this.analyzeSignal(signal);
          responses.push(response);
        } catch (error) {
          logger.warn('EnhancedInspector', `Failed to analyze signal in batch: ${signal.type}`, { error: error instanceof Error ? error.message : String(error) });
          // Continue with other signals
        }
      }
    }

    return responses;
  }

  /**
   * Get inspector status and metrics
   */
  getStatus(): {
    isRunning: boolean;
    config: EnhancedInspectorConfig;
    metrics: InspectorMetrics;
    queueSize: number;
    cacheSize: number;
    parallelStatus?: Record<string, unknown>;
    contextStats?: Record<string, unknown>;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      metrics: this.getMetrics(),
      queueSize: this.processingRequests.size,
      cacheSize: this.responseCache.size,
      parallelStatus: this.parallelExecutor?.getStatus(),
      contextStats: this.contextManager.getStatistics()
    };
  }

  /**
   * Get enhanced metrics
   */
  getMetrics(): InspectorMetrics {
    // Update dynamic metrics
    this.metrics.queueLength = this.processingRequests.size;

    // Calculate processing rate
    const timeRunning = (Date.now() - this.metrics.startTime.getTime()) / 1000 / 60; // minutes
    this.metrics.processingRate = this.metrics.totalProcessed / timeRunning;

    // Calculate error rate
    this.metrics.errorRate = this.metrics.totalProcessed > 0
      ? (this.metrics.failedClassifications / this.metrics.totalProcessed) * 100
      : 0;

    return { ...this.metrics };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.responseCache.clear();
    this.llmEngine.clearCache();
    this.contextManager.clearContext();

    logger.info('EnhancedInspector', 'All caches cleared');
    this.emit('inspector:cache:cleared');
  }

  /**
   * Process signal sequentially (non-parallel)
   */
  private async processSignalSequentially(
    signal: Signal,
    context: ProcessingContext,
    guideline: string
  ): Promise<DetailedInspectorResult> {
    // Use LLM execution engine directly
    const analysis = await this.llmEngine.analyzeSignal(signal, context, guideline);

    // Convert analysis to inspector result
    const preparedContext: PreparedContext = {
      id: `ctx-${signal.id}`,
      signalId: signal.id,
      content: {
        signalContent: signal.data.content as string || '',
        agentContext: context.agent ? { agent: context.agent } : {},
        worktreeState: context.worktree ? { worktree: context.worktree } : {},
        environment: context.environment as Record<string, string | number | boolean>
      },
      size: this.estimateContextSize(context),
      compressed: false,
      tokenCount: this.estimateTokenUsageFromContext(context)
    };

    const payload: InspectorPayload = {
      id: `payload-${signal.id}`,
      signalId: signal.id,
      classification: analysis.classification,
      context: preparedContext,
      recommendations: analysis.recommendations,
      timestamp: new Date(),
      size: preparedContext.size,
      compressed: preparedContext.compressed
    };

    return {
      id: `result-${signal.id}`,
      signal,
      classification: analysis.classification,
      context: preparedContext,
      payload,
      recommendations: analysis.recommendations,
      processingTime: analysis.processingTime,
      tokenUsage: analysis.tokenUsage,
      model: this.config.inspector.model,
      timestamp: new Date(),
      confidence: analysis.confidence
    };
  }

  /**
   * Get cached response for signal
   */
  private getCachedResponse(signal: Signal): InspectorAnalysisResponse | null {
    const cacheKey = this.generateCacheKey(signal);
    const cached = this.responseCache.get(cacheKey);

    if (cached) {
      const maxAge = 300000; // 5 minutes
      if (Date.now() - cached.request.createdAt.getTime() < maxAge) {
        return cached;
      } else {
        // Remove expired cache entry
        this.responseCache.delete(cacheKey);
      }
    }

    return null;
  }

  /**
   * Cache response for signal
   */
  private cacheResponse(signal: Signal, response: InspectorAnalysisResponse): void {
    const cacheKey = this.generateCacheKey(signal);
    this.responseCache.set(cacheKey, response);

    // Limit cache size
    if (this.responseCache.size > 1000) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }
  }

  /**
   * Generate cache key for signal
   */
  private generateCacheKey(signal: Signal): string {
    return `${signal.type}-${signal.data?.['rawSignal'] || ''}-${signal.priority || 5}`;
  }

  /**
   * Calculate token usage from result
   */
  private calculateTokenUsage(result: DetailedInspectorResult): {
    input: number;
    output: number;
    total: number;
    cost: number;
  } {
    // Extract token usage from result or estimate
    if (result.tokenUsage) {
      return result.tokenUsage;
    }

    // Fallback estimation
    const estimated = this.estimateTokenUsage(result);
    return {
      input: estimated.input,
      output: estimated.output,
      total: estimated.total,
      cost: estimated.total * 0.000002 // $0.002 per 1K tokens (example rate)
    };
  }

  /**
   * Estimate token usage
   */
  private estimateTokenUsage(result: DetailedInspectorResult): {
    input: number;
    output: number;
    total: number;
  } {
    const inputText = JSON.stringify(result.classification) + JSON.stringify(result.context);
    const outputText = JSON.stringify(result.recommendations);

    return {
      input: Math.ceil(inputText.length / 4),
      output: Math.ceil(outputText.length / 4),
      total: Math.ceil((inputText.length + outputText.length) / 4)
    };
  }

  private estimateContextSize(context: ProcessingContext): number {
    return JSON.stringify(context).length;
  }

  private estimateTokenUsageFromContext(context: ProcessingContext): number {
    return Math.ceil(JSON.stringify(context).length / 4);
  }

  
  /**
   * Update metrics
   */
  private updateMetrics(response: InspectorAnalysisResponse, success: boolean): void {
    this.metrics.totalProcessed++;

    if (success) {
      this.metrics.successfulClassifications++;
    } else {
      this.metrics.failedClassifications++;
    }

    // Update average processing time
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + response.processingTime) /
      this.metrics.totalProcessed;

    // Update token usage averages
    this.metrics.averageTokenUsage.input =
      (this.metrics.averageTokenUsage.input * (this.metrics.totalProcessed - 1) + response.tokenUsage.input) /
      this.metrics.totalProcessed;

    this.metrics.averageTokenUsage.output =
      (this.metrics.averageTokenUsage.output * (this.metrics.totalProcessed - 1) + response.tokenUsage.output) /
      this.metrics.totalProcessed;

    this.metrics.averageTokenUsage.total =
      (this.metrics.averageTokenUsage.total * (this.metrics.totalProcessed - 1) + response.tokenUsage.total) /
      this.metrics.totalProcessed;

    // Update success rate
    this.metrics.successRate = (this.metrics.successfulClassifications / this.metrics.totalProcessed) * 100;

    // Update performance metrics
    if (response.processingTime > this.metrics.performance.slowestClassification) {
      this.metrics.performance.slowestClassification = response.processingTime;
    }

    if (this.metrics.performance.fastestClassification === 0 ||
        response.processingTime < this.metrics.performance.fastestClassification) {
      this.metrics.performance.fastestClassification = response.processingTime;
    }

    // Calculate peak throughput
    const currentThroughput = this.metrics.totalProcessed / ((Date.now() - this.metrics.startTime.getTime()) / 1000 / 60);
    if (currentThroughput > this.metrics.performance.peakThroughput) {
      this.metrics.performance.peakThroughput = currentThroughput;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle parallel executor events
    if (this.parallelExecutor) {
      this.parallelExecutor.on('task:completed', (result) => {
        this.emit('executor:task:completed', result);
      });

      this.parallelExecutor.on('task:failed', (error) => {
        this.emit('executor:task:failed', error);
      });

      this.parallelExecutor.on('worker:error', (error) => {
        this.emit('executor:worker:error', error);
      });
    }

    // Handle context manager events
    this.contextManager.on('context:compressed', (result) => {
      this.emit('context:compressed', result);
    });

    this.contextManager.on('maintenance:completed', (stats) => {
      this.emit('context:maintenance:completed', stats);
    });

    // Handle LLM engine events
    this.llmEngine.on('analysis:completed', (analysis) => {
      this.emit('llm:analysis:completed', analysis);
    });

    this.llmEngine.on('analysis:failed', (error) => {
      this.emit('llm:analysis:failed', error);
    });

    // Handle cleanup on process exit
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.stop();
      process.exit(0);
    });
  }
}