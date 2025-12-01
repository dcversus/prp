/**
 * ♫ Enhanced Unified Signal Detector for @dcversus/prp
 *
 * Enhanced version of the unified signal detector with comprehensive
 * agent tracking, signal attribution, and correlation capabilities.
 *
 * New Features:
 * - Agent activity correlation and attribution
 * - Real-time signal-agent mapping
 * - Advanced pattern recognition for agent signatures
 * - Performance optimization for high-throughput scenarios
 * - Comprehensive signal lifecycle tracking
 */

import { EventEmitter } from 'events';

import { createLayerLogger, HashUtils } from '../shared';
import { SignalCategory } from '../shared/types/signals';

import type { Signal } from '../shared/types/common';
import type { SignalPattern, ScanResult, FileChange, PRPFile } from './types';
import type {
  AgentActivityTracker,
  AgentSignalRegistry,
  AttributedSignal,
  AgentActivity,
  AgentActivityType
} from '../agents/agent-activity-tracker';

const logger = createLayerLogger('enhanced-scanner');

/**
 * Enhanced signal detection result with agent attribution
 */
export interface EnhancedSignalDetectionResult {
  signals: AttributedSignal[];
  detectionContext: {
    timestamp: Date;
    source: {
      component: string;
      method: string;
      filePath?: string;
      prpContext?: string;
    };
    metadata: Record<string, unknown>;
  };
  agentAttribution: {
    attributedSignals: string[]; // Signal IDs with agent attribution
    unattributedSignals: string[]; // Signal IDs without attribution
    attributionConfidence: number; // Overall confidence in attributions
  };
  performance: {
    detectionTime: number;
    attributionTime: number;
    cacheHitRate: number;
    patternsMatched: number;
  };
}

/**
 * Agent signature pattern for signal attribution
 */
export interface AgentSignaturePattern {
  agentId: string;
  agentType: string;
  patterns: Array<{
    signalCode: string;
    contentPatterns: RegExp[];
    temporalPatterns: Array<{
      timeOfDay: number;
      dayOfWeek: number;
      frequency: number;
    }>;
    contextualPatterns: Array<{
      filePath: string;
      prpContext: string;
      weight: number;
    }>;
    confidence: number;
    strength: number; // How strong the signature is
  }>;
}

/**
 * Enhanced signal detection configuration
 */
export interface EnhancedSignalDetectorConfig {
  // Base signal detection
  enableCache: boolean;
  cacheSize: number;
  cacheTTL: number;
  enableBatchProcessing: boolean;
  batchSize: number;
  debounceTime: number;

  // Agent attribution
  enableAgentAttribution: boolean;
  attributionConfidenceThreshold: number;
  maxAttributionTime: number; // milliseconds
  agentSignatureLearning: boolean;

  // Pattern recognition
  enableAdvancedPatternMatching: boolean;
  contextAwareMatching: boolean;
  temporalPatternAnalysis: boolean;
  contentAnalysisDepth: 'basic' | 'advanced' | 'comprehensive';

  // Performance optimization
  enableParallelProcessing: boolean;
  maxConcurrentDetections: number;
  priorityQueueEnabled: boolean;
  performanceMonitoring: boolean;

  // Integration
  activityTracker?: AgentActivityTracker;
  signalRegistry?: AgentSignalRegistry;
}

/**
 * Enhanced Unified Signal Detector with agent attribution
 */
export class EnhancedUnifiedSignalDetector extends EventEmitter {
  private readonly config: EnhancedSignalDetectorConfig;

  // Core detection components
  private readonly signalPatterns = new Map<string, SignalPattern>();
  private readonly agentSignatures = new Map<string, AgentSignaturePattern>();
  private readonly detectionQueue: Array<{
    id: string;
    data: any;
    timestamp: Date;
    priority: number;
  }> = [];

  // Caching and performance
  private readonly signalCache = new Map<string, {
    result: EnhancedSignalDetectionResult;
    timestamp: number;
    accessCount: number;
  }>();
  private readonly patternCache = new Map<string, RegExp[]>();

  // State management
  private isProcessing = false;
  private processingQueue: Promise<void> = Promise.resolve();

  // Performance metrics
  private metrics = {
    signalsDetected: 0,
    signalsAttributed: 0,
    averageDetectionTime: 0,
    averageAttributionTime: 0,
    cacheHitRate: 0,
    queueLength: 0,
    processingErrors: 0,
    agentSignaturesLearned: 0,
    patternMatches: 0
  };

  constructor(config: Partial<EnhancedSignalDetectorConfig> = {}) {
    super();

    this.config = {
      enableCache: true,
      cacheSize: 10000,
      cacheTTL: 60000,
      enableBatchProcessing: true,
      batchSize: 50,
      debounceTime: 100,

      enableAgentAttribution: true,
      attributionConfidenceThreshold: 0.6,
      maxAttributionTime: 5000,
      agentSignatureLearning: true,

      enableAdvancedPatternMatching: true,
      contextAwareMatching: true,
      temporalPatternAnalysis: true,
      contentAnalysisDepth: 'advanced',

      enableParallelProcessing: true,
      maxConcurrentDetections: 4,
      priorityQueueEnabled: true,
      performanceMonitoring: true,

      ...config
    };

    // Initialize signal patterns from AGENTS.md
    this.initializeSignalPatterns();

    // Setup performance monitoring if enabled
    if (this.config.performanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Setup queue processing
    this.setupQueueProcessing();

    logger.info('Enhanced Unified Signal Detector initialized', {
      config: this.config,
      signalPatternsCount: this.signalPatterns.size,
      agentSignaturesCount: this.agentSignatures.size
    });
  }

  /**
   * Detect signals in content with agent attribution
   */
  async detectSignals(
    content: string,
    context: {
      filePath?: string;
      prpContext?: string;
      timestamp?: Date;
      source?: {
        component: string;
        method: string;
      };
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<EnhancedSignalDetectionResult> {
    const startTime = Date.now();
    const timestamp = context.timestamp || new Date();

    logger.debug('Starting enhanced signal detection', {
      contentLength: content.length,
      filePath: context.filePath,
      prpContext: context.prpContext
    });

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(content, context);
      if (this.config.enableCache) {
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          this.updateCacheHitRate(true);
          logger.debug('Signal detection cache hit', { cacheKey });
          return cachedResult;
        }
        this.updateCacheHitRate(false);
      }

      // Core signal detection
      const detectionStart = Date.now();
      const detectedSignals = await this.performSignalDetection(content, context);
      const detectionTime = Date.now() - detectionStart;

      // Agent attribution
      let attributedSignals: AttributedSignal[] = [];
      let attributionTime = 0;

      if (this.config.enableAgentAttribution && this.config.activityTracker) {
        const attributionStart = Date.now();
        attributedSignals = await this.attributeSignalsToAgents(detectedSignals, context);
        attributionTime = Date.now() - attributionStart;
      } else {
        attributedSignals = detectedSignals.map(signal => ({
          ...signal,
          detectionSource: {
            component: context.source?.component || 'unknown',
            method: context.source?.method || 'unknown'
          }
        }));
      }

      // Learn agent signatures if enabled
      if (this.config.agentSignatureLearning) {
        await this.learnAgentSignatures(attributedSignals, context);
      }

      // Create enhanced result
      const result: EnhancedSignalDetectionResult = {
        signals: attributedSignals,
        detectionContext: {
          timestamp,
          source: context.source || { component: 'unknown', method: 'unknown' },
          metadata: context.metadata || {}
        },
        agentAttribution: {
          attributedSignals: attributedSignals
            .filter(s => s.attribution)
            .map(s => s.id),
          unattributedSignals: attributedSignals
            .filter(s => !s.attribution)
            .map(s => s.id),
          attributionConfidence: this.calculateAttributionConfidence(attributedSignals)
        },
        performance: {
          detectionTime,
          attributionTime,
          cacheHitRate: this.metrics.cacheHitRate,
          patternsMatched: this.metrics.patternMatches
        }
      };

      // Cache result
      if (this.config.enableCache) {
        this.cacheResult(cacheKey, result);
      }

      // Update metrics
      this.updateDetectionMetrics(detectionTime, attributionTime, detectedSignals.length);

      logger.debug('Enhanced signal detection completed', {
        signalsDetected: detectedSignals.length,
        signalsAttributed: result.agentAttribution.attributedSignals.length,
        detectionTime,
        attributionTime,
        totalTime: Date.now() - startTime
      });

      // Emit detection event
      this.emit('signalsDetected', result);

      return result;

    } catch (error) {
      this.metrics.processingErrors++;

      logger.error('Enhanced signal detection failed', {
        error: error.message,
        contentLength: content.length,
        context
      });

      // Return fallback result
      return {
        signals: [],
        detectionContext: {
          timestamp,
          source: context.source || { component: 'unknown', method: 'unknown' },
          metadata: { error: error.message }
        },
        agentAttribution: {
          attributedSignals: [],
          unattributedSignals: [],
          attributionConfidence: 0
        },
        performance: {
          detectionTime: Date.now() - startTime,
          attributionTime: 0,
          cacheHitRate: this.metrics.cacheHitRate,
          patternsMatched: 0
        }
      };
    }
  }

  /**
   * Batch detect signals for multiple content items
   */
  async detectSignalsBatch(
    items: Array<{
      content: string;
      context?: any;
    }>
  ): Promise<EnhancedSignalDetectionResult[]> {
    if (!this.config.enableBatchProcessing) {
      // Process sequentially
      const results = [];
      for (const item of items) {
        const result = await this.detectSignals(item.content, item.context);
        results.push(result);
      }
      return results;
    }

    // Process in batches
    const results: EnhancedSignalDetectionResult[] = [];
    const batches = this.createBatches(items, this.config.batchSize);

    if (this.config.enableParallelProcessing) {
      // Process batches in parallel
      const batchPromises = batches.map(batch => this.processBatch(batch));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    } else {
      // Process batches sequentially
      for (const batch of batches) {
        const batchResults = await this.processBatch(batch);
        results.push(...batchResults);
      }
    }

    return results;
  }

  /**
   * Add custom signal pattern
   */
  addSignalPattern(pattern: SignalPattern): void {
    this.signalPatterns.set(pattern.code, pattern);

    // Clear pattern cache
    this.patternCache.clear();

    logger.debug('Custom signal pattern added', {
      signalCode: pattern.code,
      patternsCount: this.signalPatterns.size
    });
  }

  /**
   * Add agent signature pattern
   */
  addAgentSignature(signature: AgentSignaturePattern): void {
    this.agentSignatures.set(signature.agentId, signature);
    this.metrics.agentSignaturesLearned++;

    logger.debug('Agent signature added', {
      agentId: signature.agentId,
      agentType: signature.agentType,
      patternsCount: signature.patterns.length
    });
  }

  /**
   * Get detection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      signalsAttributedRate: this.metrics.signalsDetected > 0
        ? this.metrics.signalsAttributed / this.metrics.signalsDetected
        : 0,
      averageProcessingTime: this.metrics.averageDetectionTime + this.metrics.averageAttributionTime,
      cacheSize: this.signalCache.size,
      queueLength: this.detectionQueue.length,
      patternMatches: this.metrics.patternMatches,
      agentSignaturesCount: this.agentSignatures.size
    };
  }

  /**
   * Clear cache and reset metrics
   */
  reset(): void {
    this.signalCache.clear();
    this.patternCache.clear();
    this.detectionQueue.length = 0;

    this.metrics = {
      signalsDetected: 0,
      signalsAttributed: 0,
      averageDetectionTime: 0,
      averageAttributionTime: 0,
      cacheHitRate: 0,
      queueLength: 0,
      processingErrors: 0,
      agentSignaturesLearned: this.metrics.agentSignaturesLearned,
      patternMatches: 0
    };

    logger.info('Enhanced signal detector reset');
  }

  // Private helper methods

  private initializeSignalPatterns(): void {
    // Initialize with signal patterns from AGENTS.md
    const signalsFromAGENTS = [
      '[bb]', '[af]', '[gg]', '[ff]', '[da]', '[no]', '[rp]', '[vr]', '[rr]',
      '[vp]', '[ip]', '[er]', '[tp]', '[dp]', '[br]', '[rc]', '[tw]', '[bf]',
      '[cq]', '[cp]', '[tr]', '[tg]', '[cf]', '[pc]', '[rg]', '[cd]', '[rv]',
      '[iv]', '[ra]', '[mg]', '[rl]', '[ps]', '[ic]', '[pm]', '[oa]', '[aa]',
      '[ap]', '[du]', '[ds]', '[dr]', '[dh]', '[da]', '[dc]', '[df]', '[dt]',
      '[dp]', '[id]', '[cd]', '[mo]', '[ir]', '[so]', '[sc]', '[pb]', '[dr]',
      '[cu]', '[ac]', '[sl]', '[eb]', '[rc]', '[rt]', '[ao]', '[ts]', '[er]',
      '[pc]', '[fo]', '[cc]', '[as]', '[pt]', '[pe]', '[fs]', '[ds]', '[rb]',
      '[HF]', '[HS]', '[pr]', '[PR]', '[FF]', '[TF]', '[TC]', '[TI]'
    ];

    for (const signalCode of signalsFromAGENTS) {
      this.signalPatterns.set(signalCode, {
        code: signalCode,
        pattern: new RegExp(`\\${signalCode.replace('[', '\\[').replace(']', '\\]')}`, 'g'),
        description: `Signal ${signalCode}`,
        category: this.getSignalCategory(signalCode),
        priority: this.getSignalPriority(signalCode)
      });
    }

    logger.debug('Signal patterns initialized', {
      count: this.signalPatterns.size
    });
  }

  private async performSignalDetection(
    content: string,
    context: any
  ): Promise<Signal[]> {
    const signals: Signal[] = [];

    for (const [code, pattern] of this.signalPatterns.entries()) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        signals.push({
          id: HashUtils.sha256(code + content + Date.now().toString()),
          code,
          data: this.extractSignalData(content, code, matches),
          timestamp: context.timestamp || new Date(),
          category: pattern.category,
          priority: pattern.priority,
          source: context.source || 'unknown'
        });

        this.metrics.patternMatches++;
      }
    }

    this.metrics.signalsDetected += signals.length;
    return signals;
  }

  private async attributeSignalsToAgents(
    signals: Signal[],
    context: any
  ): Promise<AttributedSignal[]> {
    const attributedSignals: AttributedSignal[] = [];

    for (const signal of signals) {
      const attributedSignal: AttributedSignal = {
        ...signal,
        detectionSource: {
          component: context.source?.component || 'scanner',
          method: context.source?.method || 'pattern_match'
        }
      };

      // Try agent signature matching first
      const signatureMatch = this.matchAgentSignature(signal, context);
      if (signatureMatch) {
        attributedSignal.attribution = {
          signalId: signal.id,
          signalCode: signal.code,
          detectedAt: signal.timestamp,
          attributedAgent: signatureMatch,
          attributionMethod: 'signature',
          metadata: {
            confidence: signatureMatch.confidence,
            evidence: signatureMatch.evidence
          }
        };

        this.metrics.signalsAttributed++;
      }
      // Fall back to activity tracker correlation
      else if (this.config.activityTracker) {
        try {
          const attribution = await this.config.activityTracker.attributeSignalToAgent(
            signal.id,
            signal.code,
            {
              timestamp: signal.timestamp,
              content: JSON.stringify(signal.data),
              filePath: context.filePath,
              prpContext: context.prpContext
            }
          );

          if (attribution.attributedAgent) {
            attributedSignal.attribution = attribution;
            this.metrics.signalsAttributed++;
          }
        } catch (error) {
          logger.warn('Signal attribution via activity tracker failed', {
            signalId: signal.id,
            error: error.message
          });
        }
      }

      attributedSignals.push(attributedSignal);
    }

    return attributedSignals;
  }

  private matchAgentSignature(
    signal: Signal,
    context: any
  ): { agentId: string; agentType: string; confidence: AttributionConfidence; evidence: string[] } | null {
    const signalContent = JSON.stringify(signal.data);
    const filePath = context.filePath || '';
    const prpContext = context.prpContext || '';

    let bestMatch: {
      agentId: string;
      agentType: string;
      confidence: number;
      evidence: string[];
    } | null = null;

    for (const [agentId, signature] of this.agentSignatures.entries()) {
      let matchScore = 0;
      const evidence: string[] = [];

      // Check content patterns
      for (const pattern of signature.patterns) {
        if (pattern.signalCode === signal.code) {
          for (const contentPattern of pattern.contentPatterns) {
            if (contentPattern.test(signalContent)) {
              matchScore += pattern.confidence * 0.4;
              evidence.push(`Content pattern match: ${contentPattern.source}`);
            }
          }

          // Check contextual patterns
          for (const contextualPattern of pattern.contextualPatterns) {
            if (contextualPattern.filePath && filePath.includes(contextualPattern.filePath)) {
              matchScore += contextualPattern.weight * 0.3;
              evidence.push(`File path match: ${contextualPattern.filePath}`);
            }
            if (contextualPattern.prpContext && prpContext.includes(contextualPattern.prpContext)) {
              matchScore += contextualPattern.weight * 0.3;
              evidence.push(`PRP context match: ${contextualPattern.prpContext}`);
            }
          }
        }
      }

      if (matchScore > (bestMatch?.confidence || 0)) {
        bestMatch = {
          agentId,
          agentType: signature.agentType,
          confidence: matchScore,
          evidence
        };
      }
    }

    if (!bestMatch || bestMatch.confidence < this.config.attributionConfidenceThreshold) {
      return null;
    }

    const confidenceLevel = bestMatch.confidence > 0.8 ? 'high' as const :
                           bestMatch.confidence > 0.6 ? 'medium' as const :
                           'low' as const;

    return {
      ...bestMatch,
      confidence: confidenceLevel
    };
  }

  private async learnAgentSignatures(
    attributedSignals: AttributedSignal[],
    context: any
  ): Promise<void> {
    if (!this.config.signalRegistry) {
      return;
    }

    for (const signal of attributedSignals) {
      if (signal.attribution?.attributedAgent) {
        const {agentId} = signal.attribution.attributedAgent;
        const signalCode = signal.code;

        // Update signal registry with pattern learning
        try {
          await this.config.signalRegistry.learnSignalPatterns(agentId, [{
            signalCode,
            context: JSON.stringify(context),
            frequency: 1
          }]);

          logger.debug('Agent signature pattern learned', {
            agentId,
            signalCode
          });
        } catch (error) {
          logger.warn('Failed to learn agent signature pattern', {
            agentId,
            signalCode,
            error: error.message
          });
        }
      }
    }
  }

  private generateCacheKey(content: string, context: any): string {
    const keyData = {
      content: HashUtils.sha256(content),
      filePath: context.filePath || '',
      prpContext: context.prpContext || '',
      source: context.source || {}
    };
    return HashUtils.sha256(JSON.stringify(keyData));
  }

  private getCachedResult(cacheKey: string): EnhancedSignalDetectionResult | null {
    const cached = this.signalCache.get(cacheKey);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.signalCache.delete(cacheKey);
      return null;
    }

    cached.accessCount++;
    return cached.result;
  }

  private cacheResult(cacheKey: string, result: EnhancedSignalDetectionResult): void {
    if (this.signalCache.size >= this.config.cacheSize) {
      // Evict oldest entry
      const oldestKey = this.signalCache.keys().next().value;
      this.signalCache.delete(oldestKey);
    }

    this.signalCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  private calculateAttributionConfidence(signals: AttributedSignal[]): number {
    if (signals.length === 0) return 0;

    const attributedCount = signals.filter(s => s.attribution).length;
    return attributedCount / signals.length;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(batch: Array<{ content: string; context?: any }>): Promise<EnhancedSignalDetectionResult[]> {
    const results = await Promise.all(
      batch.map(item => this.detectSignals(item.content, item.context))
    );
    return results;
  }

  private updateDetectionMetrics(detectionTime: number, attributionTime: number, signalCount: number): void {
    // Update detection time (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageDetectionTime =
      this.metrics.averageDetectionTime * (1 - alpha) + detectionTime * alpha;

    // Update attribution time
    this.metrics.averageAttributionTime =
      this.metrics.averageAttributionTime * (1 - alpha) + attributionTime * alpha;
  }

  private updateCacheHitRate(hit: boolean): void {
    const total = this.metrics.cacheHitRate * 100 + 1; // Approximate total requests
    this.metrics.cacheHitRate = this.metrics.cacheHitRate * (total - 1) / total + (hit ? 1 : 0) / total;
  }

  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      this.emit('metricsUpdate', this.getMetrics());
    }, 30000); // Every 30 seconds
  }

  private setupQueueProcessing(): void {
    // Process queue periodically
    setInterval(() => {
      if (!this.isProcessing && this.detectionQueue.length > 0) {
        this.processQueue();
      }
    }, this.config.debounceTime);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingQueue = this.processingQueue.then(async () => {
      try {
        while (this.detectionQueue.length > 0) {
          const item = this.detectionQueue.shift();
          if (item) {
            await this.detectSignals(item.data.content, item.data.context);
          }
        }
      } catch (error) {
        logger.error('Queue processing failed', { error: error.message });
      } finally {
        this.isProcessing = false;
      }
    });
  }

  private extractSignalData(content: string, signalCode: string, matches: RegExpMatchArray): unknown {
    // Extract relevant context around the signal
    const matchIndex = content.indexOf(matches[0]);
    const contextStart = Math.max(0, matchIndex - 100);
    const contextEnd = Math.min(content.length, matchIndex + matches[0].length + 100);
    const context = content.substring(contextStart, contextEnd);

    return {
      signalCode,
      match: matches[0],
      context: context.trim(),
      position: matchIndex,
      metadata: {
        matchCount: matches.length,
        contentLength: content.length
      }
    };
  }

  private getSignalCategory(signalCode: string): SignalCategory {
    // Categorize signals based on AGENTS.md
    if (['bb', 'af'].includes(signalCode)) return SignalCategory.BLOCKING;
    if (['gg', 'ff', 'rp', 'vr'].includes(signalCode)) return SignalCategory.ANALYSIS;
    if (['da', 'no', 'rr'].includes(signalCode)) return SignalCategory.DEVELOPMENT;
    if (['aa', 'ap', 'oa'].includes(signalCode)) return SignalCategory.COORDINATION;
    if (['FF', 'TF', 'TC', 'TI'].includes(signalCode)) return SignalCategory.SYSTEM;
    return SignalCategory.GENERAL;
  }

  private getSignalPriority(signalCode: string): number {
    // Assign priority based on signal importance
    const highPriority = ['FF', 'bb', 'aa', 'TF'];
    const mediumPriority = ['gg', 'ff', 'rp', 'vr', 'da', 'no'];

    if (highPriority.includes(signalCode)) return 10;
    if (mediumPriority.includes(signalCode)) return 7;
    return 5;
  }
}