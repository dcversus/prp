/**
 * ♫ Signal Attribution Engine for @dcversus/prp
 *
 * Advanced signal attribution system using multiple strategies and
 * machine learning techniques to accurately attribute signals to agents.
 */

import { EventEmitter } from 'events';

import { createLayerLogger, HashUtils } from '../shared';

import type {
  AgentActivityTracker,
  AgentSignalRegistry,
  SignalAttribution,
  AttributedSignal,
  AgentActivity,
  AttributionConfidence,
  ActivityCorrelation
} from './agent-activity-tracker';
import type { Signal, FileChange, PRPFile } from '../shared/types';
import type { BaseAgent } from './base-agent';

const logger = createLayerLogger('signal-attribution-engine');

/**
 * Attribution strategy configuration
 */
export interface AttributionStrategy {
  name: string;
  enabled: boolean;
  weight: number; // Importance weight for final decision
  confidenceThreshold: number; // Minimum confidence to consider
  parameters: Record<string, unknown>;
}

/**
 * Machine learning model interface for signal attribution
 */
export interface AttributionModel {
  predict(features: AttributionFeatures): Promise<{
    agentId: string;
    confidence: number;
    features: Record<string, number>;
  }>;
  train(trainingData: Array<{
    signalCode: string;
    contextFeatures: AttributionFeatures;
    actualAgentId: string;
  }>): Promise<void>;
  getModelMetrics(): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

/**
 * Feature extraction result for ML attribution
 */
export interface AttributionFeatures {
  // Temporal features
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  timeSinceLastActivity: number; // milliseconds
  activityFrequency: number; // activities per hour

  // Contextual features
  filePath: string;
  fileExtension: string;
  prpContext: string;
  signalCode: string;
  signalCategory: string;

  // Agent features
  agentSpecializations: string[];
  agentCapabilities: string[];
  agentHistory: {
    totalActivities: number;
    signalGenerationRate: number;
    averageActivityDuration: number;
  };

  // Content features
  contentLength: number;
  contentComplexity: number; // Simple metric 0-1
  technicalTerms: string[];
  sentimentScore: number; // -1 to 1
  urgencyLevel: number; // 0-1

  // Interaction features
  recentCollaborators: string[];
  dependencyGraph: Array<{
    agentId: string;
    strength: number;
  }>;
}

/**
 * Attribution engine configuration
 */
export interface SignalAttributionEngineConfig {
  enableMLAttribution: boolean;
  enableEnsembleAttribution: boolean;
  strategies: AttributionStrategy[];
  mlModel?: AttributionModel;
  featureExtraction: {
    enableContentAnalysis: boolean;
    enableSentimentAnalysis: boolean;
    enableTechnicalTermExtraction: boolean;
    maxFeatures: number;
  };
  ensemble: {
    votingMethod: 'weighted' | 'majority' | 'confidence_weighted';
    minimumAgreement: number; // 0.0-1.0
    conflictResolution: 'highest_confidence' | 'most_recent' | 'ml_override';
  };
  learning: {
    enableOnlineLearning: boolean;
    learningRate: number;
    feedbackIntegration: boolean;
    modelRetrainingThreshold: number; // Minimum new samples before retraining
  };
}

/**
 * Attribution result with detailed reasoning
 */
export interface DetailedAttributionResult extends SignalAttribution {
  ensembleResults: Array<{
    strategy: string;
    agentId?: string;
    confidence: AttributionConfidence;
    reasoning: string;
    evidence: string[];
    features?: AttributionFeatures;
  }>;
  conflictResolution: string;
  ensembleConfidence: number;
  featureImportance?: Record<string, number>;
  modelMetrics?: any;
}

/**
 * Training data for ML model
 */
export interface AttributionTrainingData {
  signalId: string;
  signalCode: string;
  contextFeatures: AttributionFeatures;
  actualAgentId: string;
  verifiedAttribution: boolean;
  timestamp: Date;
}

/**
 * Signal Attribution Engine implementation
 */
export class SignalAttributionEngine extends EventEmitter {
  private readonly config: SignalAttributionEngineConfig;
  private readonly activityTracker: AgentActivityTracker;
  private readonly signalRegistry: AgentSignalRegistry;

  // State management
  private readonly attributionHistory = new Map<string, DetailedAttributionResult>();
  private readonly trainingData: AttributionTrainingData[] = [];
  private readonly featureCache = new Map<string, AttributionFeatures>();

  // Performance metrics
  private readonly metrics = {
    attributionsAttempted: 0,
    attributionsSuccessful: 0,
    averageAttributionTime: 0,
    strategyPerformance: new Map<string, {
      attempts: number;
      successes: number;
      averageConfidence: number;
    }>(),
    modelAccuracy: 0,
    featureExtractionTime: 0
  };

  constructor(
    activityTracker: AgentActivityTracker,
    signalRegistry: AgentSignalRegistry,
    config: Partial<SignalAttributionEngineConfig> = {}
  ) {
    super();

    this.activityTracker = activityTracker;
    this.signalRegistry = signalRegistry;

    this.config = {
      enableMLAttribution: true,
      enableEnsembleAttribution: true,
      strategies: [
        {
          name: 'temporal',
          enabled: true,
          weight: 0.2,
          confidenceThreshold: 0.6,
          parameters: {
            timeWindow: 30000, // 30 seconds
            decayFactor: 0.9
          }
        },
        {
          name: 'contextual',
          enabled: true,
          weight: 0.3,
          confidenceThreshold: 0.7,
          parameters: {
            filePathWeight: 0.8,
            prpContextWeight: 0.6
          }
        },
        {
          name: 'pattern_match',
          enabled: true,
          weight: 0.25,
          confidenceThreshold: 0.8,
          parameters: {
            minPatternFrequency: 3,
            patternDecay: 0.95
          }
        },
        {
          name: 'signature',
          enabled: true,
          weight: 0.15,
          confidenceThreshold: 0.9,
          parameters: {
            strictMatching: true,
            fuzzyThreshold: 0.8
          }
        },
        {
          name: 'ml_model',
          enabled: true,
          weight: 0.1,
          confidenceThreshold: 0.7,
          parameters: {
            featureNormalization: true,
            ensembleVoting: true
          }
        }
      ],
      featureExtraction: {
        enableContentAnalysis: true,
        enableSentimentAnalysis: true,
        enableTechnicalTermExtraction: true,
        maxFeatures: 100
      },
      ensemble: {
        votingMethod: 'confidence_weighted',
        minimumAgreement: 0.6,
        conflictResolution: 'highest_confidence'
      },
      learning: {
        enableOnlineLearning: true,
        learningRate: 0.01,
        feedbackIntegration: true,
        modelRetrainingThreshold: 50
      },
      ...config
    };

    // Initialize strategy performance tracking
    for (const strategy of this.config.strategies) {
      this.metrics.strategyPerformance.set(strategy.name, {
        attempts: 0,
        successes: 0,
        averageConfidence: 0
      });
    }

    logger.info('Signal Attribution Engine initialized', {
      strategies: this.config.strategies.filter(s => s.enabled).map(s => s.name),
      mlEnabled: this.config.enableMLAttribution,
      ensembleEnabled: this.config.enableEnsembleAttribution
    });
  }

  /**
   * Attribute a signal to an agent with comprehensive analysis
   */
  async attributeSignal(
    signal: Signal,
    context: {
      timestamp: Date;
      content: string;
      filePath?: string;
      prpContext?: string;
      relatedFiles?: FileChange[];
      relatedPRPs?: PRPFile[];
      agentSession?: any;
    }
  ): Promise<DetailedAttributionResult> {
    const startTime = Date.now();
    this.metrics.attributionsAttempted++;

    logger.info('Starting comprehensive signal attribution', {
      signalId: signal.id,
      signalCode: signal.code,
      timestamp: context.timestamp
    });

    try {
      // Extract features for ML and other strategies
      const features = await this.extractAttributionFeatures(signal, context);

      // Apply all enabled attribution strategies
      const strategyResults = await this.applyAttributionStrategies(signal, context, features);

      // Apply ensemble method to combine results
      const ensembleResult = await this.applyEnsembleMethod(strategyResults);

      // Create detailed attribution result
      const detailedResult: DetailedAttributionResult = {
        signalId: signal.id,
        signalCode: signal.code,
        detectedAt: context.timestamp,
        attributedAgent: ensembleResult.agentId ? {
          agentId: ensembleResult.agentId,
          agentType: await this.getAgentType(ensembleResult.agentId),
          confidence: ensembleResult.confidence,
          evidence: ensembleResult.evidence,
          reasoning: ensembleResult.reasoning
        } : undefined,
        attributionMethod: 'ensemble',
        metadata: {
          features: features,
          strategyResults: strategyResults,
          ensembleMethod: this.config.ensemble.votingMethod,
          processingTime: Date.now() - startTime
        },
        ensembleResults: strategyResults,
        conflictResolution: ensembleResult.conflictResolution,
        ensembleConfidence: ensembleResult.ensembleConfidence,
        featureImportance: features ? this.calculateFeatureImportance(features) : undefined
      };

      // Store attribution result
      this.attributionHistory.set(signal.id, detailedResult);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateAttributionMetrics(duration, true, strategyResults);

      // Update strategy-specific metrics
      for (const result of strategyResults) {
        this.updateStrategyMetrics(result);
      }

      // Online learning update
      if (this.config.learning.enableOnlineLearning && detailedResult.attributedAgent) {
        await this.updateLearningModel(detailedResult, features);
      }

      logger.info('Signal attribution completed', {
        signalId: signal.id,
        attributedAgent: detailedResult.attributedAgent?.agentId,
        confidence: detailedResult.attributedAgent?.confidence,
        ensembleConfidence: detailedResult.ensembleConfidence,
        duration
      });

      // Emit attribution event
      this.emit('signalAttributed', detailedResult);

      return detailedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateAttributionMetrics(duration, false, []);

      logger.error('Signal attribution failed', {
        signalId: signal.id,
        error: error.message,
        duration
      });

      // Return fallback attribution
      const fallbackResult: DetailedAttributionResult = {
        signalId: signal.id,
        signalCode: signal.code,
        detectedAt: context.timestamp,
        attributionMethod: 'fallback',
        metadata: {
          error: error.message,
          processingTime: duration
        },
        ensembleResults: [],
        conflictResolution: 'error_fallback',
        ensembleConfidence: 0
      };

      return fallbackResult;
    }
  }

  /**
   * Provide feedback on attribution accuracy for learning
   */
  async provideAttributionFeedback(
    signalId: string,
    correctAgentId: string,
    feedback: 'correct' | 'incorrect' | 'partially_correct',
    comments?: string
  ): Promise<void> {
    const attribution = this.attributionHistory.get(signalId);
    if (!attribution) {
      logger.warn('Cannot provide feedback on unknown attribution', { signalId });
      return;
    }

    logger.info('Processing attribution feedback', {
      signalId,
      correctAgentId,
      feedback,
      currentAttribution: attribution.attributedAgent?.agentId
    });

    // Create training data entry
    const trainingEntry: AttributionTrainingData = {
      signalId,
      signalCode: attribution.signalCode,
      contextFeatures: attribution.metadata.features as AttributionFeatures,
      actualAgentId: correctAgentId,
      verifiedAttribution: feedback === 'correct',
      timestamp: new Date()
    };

    this.trainingData.push(trainingEntry);

    // Update model metrics
    if (this.config.enableMLAttribution && this.config.mlModel) {
      await this.updateModelMetrics();
    }

    // Trigger model retraining if threshold reached
    if (this.trainingData.length >= this.config.learning.modelRetrainingThreshold) {
      await this.retrainModel();
    }

    // Emit feedback event
    this.emit('attributionFeedback', {
      signalId,
      attribution,
      feedback,
      correctAgentId,
      comments
    });
  }

  /**
   * Get attribution performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      attributionSuccessRate: this.metrics.attributionsAttempted > 0
        ? this.metrics.attributionsSuccessful / this.metrics.attributionsAttempted
        : 0,
      averageAttributionTime: this.metrics.averageAttributionTime,
      strategyBreakdown: Object.fromEntries(this.metrics.strategyPerformance),
      trainingDataSize: this.trainingData.length,
      attributionHistorySize: this.attributionHistory.size,
      featureCacheSize: this.featureCache.size
    };
  }

  /**
   * Get attribution history for analysis
   */
  getAttributionHistory(signalId?: string, timeRange?: { start: Date; end: Date }): DetailedAttributionResult[] {
    const history = Array.from(this.attributionHistory.values());

    return history.filter(attribution => {
      if (signalId && attribution.signalId !== signalId) return false;
      if (timeRange) {
        const attributionTime = attribution.detectedAt;
        if (attributionTime < timeRange.start || attributionTime > timeRange.end) return false;
      }
      return true;
    });
  }

  // Private helper methods

  private async extractAttributionFeatures(
    signal: Signal,
    context: any
  ): Promise<AttributionFeatures> {
    const cacheKey = HashUtils.sha256(signal.id + JSON.stringify(context));

    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey)!;
    }

    const startTime = Date.now();

    // Temporal features
    const signalTime = context.timestamp || new Date();
    const timeOfDay = signalTime.getHours();
    const dayOfWeek = signalTime.getDay();

    // Content features
    const content = context.content || '';
    const contentLength = content.length;
    const technicalTerms = this.config.featureExtraction.enableTechnicalTermExtraction
      ? this.extractTechnicalTerms(content)
      : [];
    const contentComplexity = this.calculateContentComplexity(content);

    // Get agent history and recent activities
    const recentActivities = await this.getRecentActivities(context.timestamp);
    const agentHistories = await this.getAgentHistories();

    const features: AttributionFeatures = {
      timeOfDay,
      dayOfWeek,
      timeSinceLastActivity: 0, // Would calculate from recent activities
      activityFrequency: recentActivities.length / 24, // Activities per hour

      // Contextual features
      filePath: context.filePath || '',
      fileExtension: context.filePath ? context.filePath.split('.').pop() || '' : '',
      prpContext: context.prpContext || '',
      signalCode: signal.code,
      signalCategory: this.getSignalCategory(signal.code),

      // Agent features (simplified)
      agentSpecializations: [],
      agentCapabilities: [],
      agentHistory: {
        totalActivities: 0,
        signalGenerationRate: 0,
        averageActivityDuration: 0
      },

      // Content features
      contentLength,
      contentComplexity,
      technicalTerms,
      sentimentScore: this.config.featureExtraction.enableSentimentAnalysis
        ? this.calculateSentimentScore(content)
        : 0,
      urgencyLevel: this.calculateUrgencyLevel(content),

      // Interaction features
      recentCollaborators: [],
      dependencyGraph: []
    };

    // Cache features
    this.featureCache.set(cacheKey, features);
    this.metrics.featureExtractionTime = Date.now() - startTime;

    // Cleanup cache if too large
    if (this.featureCache.size > this.config.featureExtraction.maxFeatures) {
      const keysToDelete = Array.from(this.featureCache.keys()).slice(
        0,
        this.featureCache.size - this.config.featureExtraction.maxFeatures
      );
      for (const key of keysToDelete) {
        this.featureCache.delete(key);
      }
    }

    return features;
  }

  private async applyAttributionStrategies(
    signal: Signal,
    context: any,
    features: AttributionFeatures
  ): Promise<any[]> {
    const results = [];

    for (const strategy of this.config.strategies) {
      if (!strategy.enabled) continue;

      try {
        const result = await this.applyAttributionStrategy(strategy, signal, context, features);
        if (result) {
          results.push({
            strategy: strategy.name,
            agentId: result.agentId,
            confidence: result.confidence,
            reasoning: result.reasoning,
            evidence: result.evidence,
            features
          });
        }
      } catch (error) {
        logger.warn(`Attribution strategy ${strategy.name} failed`, {
          signalId: signal.id,
          error: error.message
        });
      }
    }

    return results;
  }

  private async applyAttributionStrategy(
    strategy: AttributionStrategy,
    signal: Signal,
    context: any,
    features: AttributionFeatures
  ): Promise<any> {
    switch (strategy.name) {
      case 'temporal':
        return this.applyTemporalStrategy(signal, context, strategy);
      case 'contextual':
        return this.applyContextualStrategy(signal, context, strategy);
      case 'pattern_match':
        return this.applyPatternMatchStrategy(signal, context, strategy);
      case 'signature':
        return this.applySignatureStrategy(signal, context, strategy);
      case 'ml_model':
        return this.applyMLModelStrategy(signal, context, strategy, features);
      default:
        throw new Error(`Unknown attribution strategy: ${strategy.name}`);
    }
  }

  private async applyTemporalStrategy(
    signal: Signal,
    context: any,
    strategy: AttributionStrategy
  ): Promise<any> {
    // Get recent agent activities within time window
    const timeWindow = (strategy.parameters.timeWindow as number) || 30000;
    const recentActivities = await this.getRecentActivities(context.timestamp, timeWindow);

    if (recentActivities.length === 0) {
      return null;
    }

    // Find the most recent activity
    const mostRecent = recentActivities.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    const timeDiff = Math.abs(
      context.timestamp.getTime() - mostRecent.timestamp.getTime()
    );

    const confidence = timeDiff <= timeWindow / 2 ? AttributionConfidence.HIGH :
                     timeDiff <= timeWindow ? AttributionConfidence.MEDIUM :
                     AttributionConfidence.LOW;

    return {
      agentId: mostRecent.agentId,
      confidence,
      reasoning: `Temporal correlation: ${timeDiff}ms time delta`,
      evidence: [`Most recent activity: ${mostRecent.description}`, `Time delta: ${timeDiff}ms`]
    };
  }

  private async applyContextualStrategy(
    signal: Signal,
    context: any,
    strategy: AttributionStrategy
  ): Promise<any> {
    const {filePath} = context;
    const {prpContext} = context;

    if (!filePath && !prpContext) {
      return null;
    }

    // Get activities matching context
    const contextMatches = await this.getContextualActivities(filePath, prpContext);

    if (contextMatches.length === 0) {
      return null;
    }

    const activity = contextMatches[0];

    return {
      agentId: activity.agentId,
      confidence: AttributionConfidence.HIGH,
      reasoning: 'Contextual match found',
      evidence: [`File/PRP context: ${filePath || prpContext}`, `Activity: ${activity.description}`]
    };
  }

  private async applyPatternMatchStrategy(
    signal: Signal,
    context: any,
    strategy: AttributionStrategy
  ): Promise<any> {
    const signalPatterns = await this.signalRegistry.getSignalPatterns('all_agents');
    const patternMatches = signalPatterns.filter(p => p.signalCode === signal.code);

    if (patternMatches.length === 0) {
      return null;
    }

    // Sort by frequency and confidence
    patternMatches.sort((a, b) => (b.frequency * b.confidence) - (a.frequency * a.confidence));

    const bestMatch = patternMatches[0];
    const confidence = bestMatch.confidence > 0.8 ? AttributionConfidence.HIGH :
                     bestMatch.confidence > 0.6 ? AttributionConfidence.MEDIUM :
                     AttributionConfidence.LOW;

    return {
      agentId: bestMatch.agentId, // Would need to get agent ID from patterns
      confidence,
      reasoning: `Pattern match: frequency ${bestMatch.frequency}, confidence ${bestMatch.confidence}`,
      evidence: [`Signal pattern frequency: ${bestMatch.frequency}`, `Pattern confidence: ${bestMatch.confidence}`]
    };
  }

  private async applySignatureStrategy(
    signal: Signal,
    context: any,
    strategy: AttributionStrategy
  ): Promise<any> {
    const content = context.content || '';
    const agentSignatures = [
      { pattern: /robo-developer/i, agentType: 'robo-developer' },
      { pattern: /robo-aqa/i, agentType: 'robo-aqa' },
      { pattern: /robo-system-analyst/i, agentType: 'robo-system-analyst' },
      // ... other signatures
    ];

    for (const signature of agentSignatures) {
      if (signature.pattern.test(content)) {
        return {
          agentId: signature.agentType,
          confidence: AttributionConfidence.HIGH,
          reasoning: 'Agent signature detected in content',
          evidence: [`Signature match: ${signature.pattern.source}`]
        };
      }
    }

    return null;
  }

  private async applyMLModelStrategy(
    signal: Signal,
    context: any,
    strategy: AttributionStrategy,
    features: AttributionFeatures
  ): Promise<any> {
    if (!this.config.mlModel) {
      return null;
    }

    try {
      const prediction = await this.config.mlModel.predict(features);

      const confidence = prediction.confidence > 0.8 ? AttributionConfidence.HIGH :
                       prediction.confidence > 0.6 ? AttributionConfidence.MEDIUM :
                       prediction.confidence > 0.4 ? AttributionConfidence.LOW :
                       AttributionConfidence.UNKNOWN;

      return {
        agentId: prediction.agentId,
        confidence,
        reasoning: 'Machine learning model prediction',
        evidence: [`Model confidence: ${prediction.confidence}`, `Features: ${JSON.stringify(prediction.features)}`]
      };
    } catch (error) {
      logger.warn('ML model prediction failed', { error: error.message });
      return null;
    }
  }

  private async applyEnsembleMethod(strategyResults: any[]): Promise<any> {
    if (strategyResults.length === 0) {
      return {
        agentId: undefined,
        confidence: AttributionConfidence.UNKNOWN,
        evidence: [],
        reasoning: 'No strategy results',
        conflictResolution: 'no_results',
        ensembleConfidence: 0
      };
    }

    if (strategyResults.length === 1) {
      const result = strategyResults[0];
      return {
        agentId: result.agentId,
        confidence: result.confidence,
        evidence: result.evidence,
        reasoning: `Single strategy: ${result.strategy}`,
        conflictResolution: 'single_strategy',
        ensembleConfidence: this.confidenceToNumeric(result.confidence)
      };
    }

    // Apply voting method
    const votes = new Map<string, { count: number; totalWeight: number; confidences: AttributionConfidence[] }>();

    for (const result of strategyResults) {
      if (!result.agentId) continue;

      const weight = this.config.strategies.find(s => s.name === result.strategy)?.weight || 1;
      const existing = votes.get(result.agentId) || { count: 0, totalWeight: 0, confidences: [] };

      existing.count++;
      existing.totalWeight += weight;
      existing.confidences.push(result.confidence);

      votes.set(result.agentId, existing);
    }

    if (votes.size === 0) {
      return {
        agentId: undefined,
        confidence: AttributionConfidence.UNKNOWN,
        evidence: [],
        reasoning: 'No agent votes',
        conflictResolution: 'no_votes',
        ensembleConfidence: 0
      };
    }

    // Find best agent based on voting method
    let bestAgent: { agentId: string; score: number } | null = null;

    for (const [agentId, voteData] of votes.entries()) {
      let score = 0;

      switch (this.config.ensemble.votingMethod) {
        case 'majority':
          score = voteData.count;
          break;
        case 'weighted':
          score = voteData.totalWeight;
          break;
        case 'confidence_weighted':
          const avgConfidence = voteData.confidences.reduce((sum, conf) =>
            sum + this.confidenceToNumeric(conf), 0) / voteData.confidences.length;
          score = voteData.totalWeight * avgConfidence;
          break;
      }

      if (!bestAgent || score > bestAgent.score) {
        bestAgent = { agentId, score };
      }
    }

    if (!bestAgent) {
      return {
        agentId: undefined,
        confidence: AttributionConfidence.UNKNOWN,
        evidence: [],
        reasoning: 'Failed to determine best agent',
        conflictResolution: 'determination_failed',
        ensembleConfidence: 0
      };
    }

    // Calculate ensemble confidence
    const winningVotes = votes.get(bestAgent.agentId)!;
    const totalVotes = Array.from(votes.values()).reduce((sum, v) => sum + v.count, 0);
    const agreementRatio = winningVotes.count / totalVotes;

    const ensembleConfidence = agreementRatio >= 0.8 ? AttributionConfidence.HIGH :
                                agreementRatio >= 0.6 ? AttributionConfidence.MEDIUM :
                                agreementRatio >= 0.4 ? AttributionConfidence.LOW :
                                AttributionConfidence.UNKNOWN;

    return {
      agentId: bestAgent.agentId,
      confidence: ensembleConfidence,
      evidence: [`Agreement ratio: ${agreementRatio.toFixed(2)}`, `Weighted score: ${bestAgent.score.toFixed(2)}`],
      reasoning: `Ensemble decision using ${this.config.ensemble.votingMethod} voting`,
      conflictResolution: agreementRatio >= this.config.ensemble.minimumAgreement ? 'consensus' : 'plurality',
      ensembleConfidence: agreementRatio
    };
  }

  // Additional private helper methods would be implemented here
  // For brevity, I'm including method signatures for the key ones:

  private async getRecentActivities(timestamp?: Date, timeWindow?: number): Promise<AgentActivity[]> {
    // Implementation would query activity tracker for recent activities
    return [];
  }

  private async getContextualActivities(filePath?: string, prpContext?: string): Promise<AgentActivity[]> {
    // Implementation would find activities matching the context
    return [];
  }

  private async getAgentHistories(): Promise<Map<string, any>> {
    // Implementation would return agent histories
    return new Map();
  }

  private extractTechnicalTerms(content: string): string[] {
    // Implementation would extract technical terms from content
    const technicalTerms = ['function', 'class', 'import', 'export', 'async', 'await', 'interface', 'type'];
    return technicalTerms.filter(term => content.toLowerCase().includes(term));
  }

  private calculateContentComplexity(content: string): number {
    // Simple complexity calculation based on length and unique words
    const words = content.split(/\s+/).length;
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
    return Math.min((uniqueWords / Math.max(words, 1)) * 2, 1);
  }

  private calculateSentimentScore(content: string): number {
    // Simple sentiment analysis (placeholder)
    const positiveWords = ['good', 'great', 'excellent', 'success', 'complete'];
    const negativeWords = ['error', 'fail', 'issue', 'problem', 'bug'];

    const positiveCount = positiveWords.filter(word => content.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.toLowerCase().includes(word)).length;

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 0;

    return (positiveCount - negativeCount) / totalSentimentWords;
  }

  private calculateUrgencyLevel(content: string): number {
    const urgentWords = ['urgent', 'asap', 'immediate', 'critical', 'blocker', 'emergency'];
    const urgentCount = urgentWords.filter(word => content.toLowerCase().includes(word)).length;
    return Math.min(urgentCount / 3, 1); // Normalize to 0-1
  }

  private getSignalCategory(signalCode: string): string {
    // Categorize signals based on AGENTS.md taxonomy
    if (['bb', 'af'].includes(signalCode)) return 'blocking';
    if (['gg', 'ff', 'rp', 'vr'].includes(signalCode)) return 'analysis';
    if (['da', 'no', 'rr'].includes(signalCode)) return 'development';
    if (['aa', 'ap', 'oa'].includes(signalCode)) return 'coordination';
    if (['FF', 'TF', 'TC', 'TI'].includes(signalCode)) return 'system';
    return 'general';
  }

  private calculateFeatureImportance(features: AttributionFeatures): Record<string, number> {
    // Simple feature importance calculation
    return {
      timeOfDay: 0.1,
      filePath: 0.3,
      signalCode: 0.4,
      contentLength: 0.1,
      sentimentScore: 0.1
    };
  }

  private confidenceToNumeric(confidence: AttributionConfidence): number {
    switch (confidence) {
      case AttributionConfidence.HIGH: return 1.0;
      case AttributionConfidence.MEDIUM: return 0.7;
      case AttributionConfidence.LOW: return 0.4;
      case AttributionConfidence.UNKNOWN: return 0.1;
      default: return 0.0;
    }
  }

  private updateAttributionMetrics(duration: number, success: boolean, strategyResults: any[]): void {
    if (success) {
      this.metrics.attributionsSuccessful++;
    }

    const alpha = 0.1;
    this.metrics.averageAttributionTime =
      this.metrics.averageAttributionTime * (1 - alpha) + duration * alpha;
  }

  private updateStrategyMetrics(result: any): void {
    const current = this.metrics.strategyPerformance.get(result.strategy);
    if (current) {
      current.attempts++;
      if (result.confidence !== AttributionConfidence.UNKNOWN) {
        current.successes++;
      }
      const numericConfidence = this.confidenceToNumeric(result.confidence);
      current.averageConfidence = current.averageConfidence * 0.9 + numericConfidence * 0.1;
    }
  }

  private async updateLearningModel(attribution: DetailedAttributionResult, features: AttributionFeatures): Promise<void> {
    // Implementation would update ML model with new attribution data
    if (attribution.attributedAgent && this.config.mlModel) {
      // Add to training data for online learning
      const trainingEntry: AttributionTrainingData = {
        signalId: attribution.signalId,
        signalCode: attribution.signalCode,
        contextFeatures: features,
        actualAgentId: attribution.attributedAgent.agentId,
        verifiedAttribution: false, // Would be true with explicit feedback
        timestamp: new Date()
      };

      this.trainingData.push(trainingEntry);
    }
  }

  private async updateModelMetrics(): Promise<void> {
    if (this.config.mlModel) {
      try {
        const metrics = this.config.mlModel.getModelMetrics();
        this.metrics.modelAccuracy = metrics.accuracy;
      } catch (error) {
        logger.warn('Failed to update model metrics', { error: error.message });
      }
    }
  }

  private async retrainModel(): Promise<void> {
    if (!this.config.mlModel || this.trainingData.length === 0) {
      return;
    }

    try {
      logger.info('Retraining attribution model', { trainingDataSize: this.trainingData.length });
      await this.config.mlModel.train(this.trainingData);

      // Clear training data after retraining
      this.trainingData.length = 0;

      logger.info('Model retraining completed');
    } catch (error) {
      logger.error('Model retraining failed', { error: error.message });
    }
  }

  private async getAgentType(agentId: string): Promise<string> {
    // Similar to implementation in AgentScannerBridge
    if (agentId.includes('developer')) return 'robo-developer';
    if (agentId.includes('aqa')) return 'robo-aqa';
    if (agentId.includes('system-analyst')) return 'robo-system-analyst';
    if (agentId.includes('ux-ui')) return 'robo-ux-ui-designer';
    if (agentId.includes('devops')) return 'robo-devops-sre';
    if (agentId.includes('quality')) return 'robo-quality-control';
    if (agentId.includes('orchestrator')) return 'orchestrator';
    return 'unknown';
  }
}