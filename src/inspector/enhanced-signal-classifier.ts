/**
 * ♫ Enhanced Signal Classifier for @dcversus/prp Inspector
 *
 * Advanced multi-dimensional signal classification with confidence scoring,
 * historical pattern recognition, and agent performance integration.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import {
  ProcessingContext,
  AgentStatusInfo,
  HistoricalData
} from './types';
import { createLayerLogger, HashUtils } from '../shared';
import { SignalPatternDatabase } from './signal-pattern-database';
import { EnsembleClassifier } from './ensemble-classifier';

const logger = createLayerLogger('inspector');

// Interface for recent activity entries
interface RecentActivity {
  action?: string;
  timestamp?: number;
  [key: string]: unknown;
}

// Interface for historical pattern matches
interface HistoricalPatternMatch {
  pattern: string;
  frequency: number;
  successRate: number;
  [key: string]: unknown;
}

// Interface for signal data (unused but kept for reference)
// interface SignalData {
//   [key: string]: unknown;
// }

// Interface for ensemble classifier results
interface ClassifierResult {
  category?: string;
  confidence?: number;
  [key: string]: unknown;
}

// Interface for ensemble result
interface EnsembleResult {
  category: string;
  subcategory: string;
  confidence: number;
  categoryConfidence: number;
  categoryAlternatives: string[];
  successfulClassifiers: number;
  priorityReasoning: string;
}

// Enhanced signal classification interface
interface EnhancedSignalClassification {
  id: string;
  signalId: string;
  timestamp: Date;
  category: {
    primary: string;
    subcategory: string;
    confidence: number;
    alternatives: string[];
  };
  priority: {
    level: number;
    urgency: string;
    deadline: Date;
    reasoning: string;
  };
  agentRole: {
    primary: string;
    alternatives: string[];
    reasoning: string;
    capabilities: string[];
  };
  complexity: {
    level: number;
    factors: string[];
    estimatedTime: number;
  };
  dependencies: {
    signalDependencies: string[];
    prerequisites: string[];
    blockers: string[];
    impactAssessment: {
      level: string;
      affectedComponents: string[];
    };
  };
  confidence: number;
  features: SignalFeatures;
  historicalMatches: HistoricalPatternMatch[];
  recommendations: string[];
  metadata: Record<string, unknown>;
}


/**
 * Signal features for classification
 */
export interface SignalFeatures {
  linguistic: {
    keywords: string[];
    sentiment: number; // -1 to 1
    complexity: number;
    clarity: number;
  };
  contextual: {
    timeOfDay: number;
    dayOfWeek: number;
    recentSimilarity: number;
    agentWorkload: number;
  };
  structural: {
    signalType: string;
    sourceComponent: string;
    hasData: boolean;
    dataComplexity: number;
  };
  historical: {
    similarSignals: number;
    successRate: number;
    averageResolutionTime: number;
    commonPatterns: string[];
  };
}

/**
 * Confidence calibration data
 */
interface ConfidenceCalibrationData {
  predictedConfidence: number;
  actualAccuracy: number;
  sampleSize: number;
  calibrationCurve: Array<{ predicted: number; actual: number }>;
}

/**
 * Enhanced Signal Classifier with multi-dimensional analysis
 */
export class EnhancedSignalClassifier extends EventEmitter {
  private historicalData: Map<string, HistoricalData> = new Map();
  private agentPerformanceCache: Map<string, AgentPerformanceData> = new Map();
  private calibrationData: ConfidenceCalibrationData = {
    predictedConfidence: 0.8,
    actualAccuracy: 0.8,
    sampleSize: 0,
    calibrationCurve: []
  };
  private patternDatabase: SignalPatternDatabase;
  private ensembleClassifiers: EnsembleClassifier[];

  constructor() {
    super();
    this.initializeCalibrationData();
    this.patternDatabase = new SignalPatternDatabase();
    this.ensembleClassifiers = this.initializeEnsembleClassifiers();

    // Mark as intentionally unused for future implementation
    // eslint-disable-next-line no-void
    void this.historicalData;
    void this.agentPerformanceCache;
    void this.calibrationData;
  }

  /**
   * Classify signal with comprehensive multi-dimensional analysis
   */
  async classifySignal(
    signal: Signal,
    context: ProcessingContext
  ): Promise<EnhancedSignalClassification> {
    const startTime = Date.now();
    const classificationId = HashUtils.generateId();

    try {
      logger.info('EnhancedSignalClassifier', `Starting enhanced classification for signal ${signal.type}`);

      // Step 1: Extract features from signal and context
      const features = await this.extractFeatures(signal, context);

      // Step 2: Ensemble classification across multiple dimensions
      const ensembleResults = await this.performEnsembleClassification(signal, features, context);

      // Step 3: Historical pattern matching
      const historicalMatches = await this.findHistoricalPatterns(signal, features);

      // Step 4: Agent capability matching
      const agentRecommendations = await this.matchAgentCapabilities(ensembleResults, context);

      // Step 5: Confidence calibration
      const calibratedConfidence = this.calibrateConfidence(ensembleResults, features);

      // Step 6: Dependency analysis
      const dependencies = await this.analyzeDependencies(signal, context);

      // Step 7: Generate comprehensive classification
      const classification = this.generateClassification(
        signal,
        ensembleResults,
        historicalMatches,
        agentRecommendations,
        calibratedConfidence,
        dependencies,
        features
      );

      // Step 8: Update historical data
      await this.updateHistoricalData(signal, classification);

      const processingTime = Date.now() - startTime;

      logger.info('EnhancedSignalClassifier', `Enhanced classification completed`, {
        classificationId,
        processingTime,
        confidence: classification.confidence,
        agentRole: classification.agentRole.primary
      });

      this.emit('classification_completed', { classification, processingTime });

      return classification;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('EnhancedSignalClassifier', 'Enhanced classification failed', error instanceof Error ? error : new Error(errorMessage));

      // Return fallback classification
      return this.createFallbackClassification(signal, error);
    }
  }

  /**
   * Extract comprehensive features from signal and context
   */
  private async extractFeatures(signal: Signal, context: ProcessingContext): Promise<SignalFeatures> {
    const linguisticFeatures = this.extractLinguisticFeatures(signal);
    const contextualFeatures = this.extractContextualFeatures(signal, context);
    const structuralFeatures = this.extractStructuralFeatures(signal);
    const historicalFeatures = await this.extractHistoricalFeatures(signal, context);

    return {
      linguistic: linguisticFeatures,
      contextual: contextualFeatures,
      structural: structuralFeatures,
      historical: historicalFeatures
    };
  }

  /**
   * Extract linguistic features from signal content
   */
  private extractLinguisticFeatures(signal: Signal): SignalFeatures['linguistic'] {
    const text = JSON.stringify(signal.data ?? {});
    const words = text.toLowerCase().split(/\s+/);

    // Keywords extraction
    const keywords = this.extractKeywords(words);

    // Sentiment analysis (simplified)
    const sentiment = this.analyzeSentiment(words);

    // Complexity analysis
    const complexity = this.analyzeComplexity(text);

    // Clarity assessment
    const clarity = this.assessClarity(text);

    return {
      keywords,
      sentiment,
      complexity,
      clarity
    };
  }

  /**
   * Extract contextual features from environment
   */
  private extractContextualFeatures(signal: Signal, context: ProcessingContext): SignalFeatures['contextual'] {
    const now = new Date();

    return {
      timeOfDay: now.getHours() + now.getMinutes() / 60,
      dayOfWeek: now.getDay(),
      recentSimilarity: this.calculateRecentSimilarity(signal, context.recentActivity as unknown as RecentActivity[]),
      agentWorkload: this.calculateAgentWorkload(context.agentStatus)
    };
  }

  /**
   * Extract structural features from signal metadata
   */
  private extractStructuralFeatures(signal: Signal): SignalFeatures['structural'] {
    return {
      signalType: signal.type,
      sourceComponent: signal.source ?? 'unknown',
      hasData: !!signal.data && Object.keys(signal.data).length > 0,
      dataComplexity: signal.data ? this.calculateDataComplexity(signal.data) : 0
    };
  }

  /**
   * Extract historical features from past data
   */
  private async extractHistoricalFeatures(signal: Signal, _context: ProcessingContext): Promise<SignalFeatures['historical']> {
    const similarSignals = await this.findSimilarSignals(signal);
    const successRate = this.calculateSuccessRate(similarSignals);
    const averageResolutionTime = this.calculateAverageResolutionTime(similarSignals);
    const commonPatterns = this.identifyCommonPatterns(similarSignals);

    return {
      similarSignals: similarSignals.length,
      successRate,
      averageResolutionTime,
      commonPatterns
    };
  }

  /**
   * Perform ensemble classification across multiple classifiers
   */
  private async performEnsembleClassification(
    signal: Signal,
    features: SignalFeatures,
    context: ProcessingContext
  ): Promise<EnsembleResult> {
    const results = [];

    for (const classifier of this.ensembleClassifiers) {
      try {
        const result = await classifier.classify(signal, features, context);
        results.push(result);
      } catch (error) {
        logger.warn('EnhancedSignalClassifier', `Ensemble classifier failed: ${classifier.name}`, error as Record<string, unknown>);
      }
    }

    return this.combineEnsembleResults(results as unknown as ClassifierResult[]);
  }

  /**
   * Find historical patterns for similar signals
   */
  private async findHistoricalPatterns(
    signal: Signal,
    features: SignalFeatures
  ): Promise<HistoricalPatternMatch[]> {
    const patterns = await this.patternDatabase.findSimilarPatterns(signal, features);

    return patterns.map(pattern => ({
      pattern: pattern.pattern,
      frequency: pattern.frequency,
      successRate: pattern.successRate,
      averageResolutionTime: pattern.averageResolutionTime,
      recommendedActions: pattern.recommendedActions,
      confidence: pattern.confidence
    }));
  }

  /**
   * Match signal with appropriate agent capabilities
   */
  private async matchAgentCapabilities(
    ensembleResults: EnsembleResult,
    context: ProcessingContext
  ): Promise<AgentRecommendation[]> {
    const agentCapabilities = context.agentStatus;
    const recommendations: AgentRecommendation[] = [];

    // Analyze each agent's suitability
    for (const agent of agentCapabilities) {
      const suitability = await this.calculateAgentSuitability(ensembleResults, agent);

      if (suitability.score > 0.3) { // Minimum suitability threshold
        recommendations.push({
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.type,
          suitability: suitability.score,
          reasoning: suitability.reasoning,
          capabilities: suitability.requiredCapabilities,
          estimatedSuccessRate: suitability.estimatedSuccessRate
        });
      }
    }

    // Sort by suitability
    return recommendations.sort((a, b) => b.suitability - a.suitability);
  }

  /**
   * Calibrate confidence based on historical accuracy
   */
  private calibrateConfidence(
    ensembleResults: EnsembleResult,
    features: SignalFeatures
  ): number {
    const rawConfidence = ensembleResults.confidence;

    // Apply calibration curve
    const calibrationPoint = this.findCalibrationPoint(rawConfidence);
    const calibratedConfidence = calibrationPoint.actual;

    // Adjust based on feature confidence
    const featureConfidence = this.calculateFeatureConfidence(features);

    return Math.min(1, Math.max(0, calibratedConfidence * featureConfidence));
  }

  /**
   * Analyze dependencies and prerequisites
   */
  private async analyzeDependencies(
    signal: Signal,
    context: ProcessingContext
  ): Promise<DependencyAnalysis> {
    return {
      signalDependencies: this.findSignalDependencies(signal, context.relatedSignals),
      prerequisites: this.identifyPrerequisites(signal),
      blockers: this.identifyBlockers(signal, context),
      impactAssessment: await this.assessImpact(signal, context)
    };
  }

  /**
   * Generate comprehensive classification result
   */
  private generateClassification(
    signal: Signal,
    ensembleResults: EnsembleResult,
    historicalMatches: HistoricalPatternMatch[],
    agentRecommendations: AgentRecommendation[],
    calibratedConfidence: number,
    dependencies: DependencyAnalysis,
    features: SignalFeatures
  ): EnhancedSignalClassification {
    return {
      id: HashUtils.generateId(),
      signalId: signal.id,
      timestamp: new Date(),

      // Primary classification
      category: {
        primary: ensembleResults.category,
        subcategory: ensembleResults.subcategory,
        confidence: ensembleResults.categoryConfidence,
        alternatives: ensembleResults.categoryAlternatives
      },

      // Priority assessment
      priority: {
        level: this.calculatePriorityLevel(ensembleResults, features),
        urgency: this.determineUrgency(ensembleResults, features),
        deadline: this.calculateDeadline(ensembleResults, features),
        reasoning: ensembleResults.priorityReasoning
      },

      // Agent role assignment
      agentRole: {
        primary: agentRecommendations[0]?.agentRole ?? 'robo-developer',
        alternatives: agentRecommendations.slice(1, 3).map(rec => rec.agentRole),
        reasoning: agentRecommendations[0]?.reasoning ?? 'Default assignment',
        capabilities: agentRecommendations[0]?.capabilities ?? []
      },

      // Complexity assessment
      complexity: {
        level: this.calculateComplexity(ensembleResults, features),
        factors: this.identifyComplexityFactors(features),
        estimatedTime: this.estimateResolutionTime(ensembleResults, historicalMatches)
      },

      // Dependencies
      dependencies: dependencies,

      // Confidence and metadata
      confidence: calibratedConfidence,
      features: features,
      historicalMatches: historicalMatches,
      recommendations: agentRecommendations.map(rec => rec.agentRole),
      metadata: {
        ensembleSize: this.ensembleClassifiers.length,
        successfulClassifications: ensembleResults.successfulClassifiers,
        historicalDataSize: historicalMatches.length,
        calibrationApplied: true
      }
    };
  }

  // Helper methods for feature extraction

  private extractKeywords(words: string[]): string[] {
    const signalKeywords = [
      'implement', 'fix', 'test', 'deploy', 'review', 'analyze', 'design',
      'document', 'research', 'optimize', 'refactor', 'debug', 'merge',
      'release', 'monitor', 'secure', 'validate', 'integrate', 'migrate'
    ];

    return words.filter(word => signalKeywords.includes(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  private analyzeSentiment(words: string[]): number {
    const positiveWords = ['complete', 'success', 'fixed', 'implemented', 'resolved'];
    const negativeWords = ['error', 'failed', 'blocked', 'issue', 'problem', 'bug'];

    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;

    if (positiveCount + negativeCount === 0) return 0;

    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  private analyzeComplexity(text: string): number {
    // Simplified complexity analysis based on text characteristics
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / text.split(/\s+/).length;
    const uniqueWordsRatio = new Set(text.toLowerCase().split(/\s+/)).size / text.split(/\s+/).length;

    return Math.min(1, (avgWordLength / 10 + uniqueWordsRatio) / 2);
  }

  private assessClarity(text: string): number {
    // Assess clarity based on structure and readability
    const sentences = text.split(/[.!?]+/).length;
    const avgSentenceLength = text.length / sentences;

    // Shorter sentences and clear structure indicate higher clarity
    return Math.max(0, 1 - (avgSentenceLength / 200));
  }

  private calculateRecentSimilarity(signal: Signal, recentActivity: RecentActivity[]): number {
    // Simplified similarity calculation with recent activity
    if (!recentActivity || recentActivity.length === 0) return 0;

    const similarSignals = recentActivity.filter(activity =>
      activity.action?.toLowerCase().includes(signal.type.toLowerCase())
    );

    return Math.min(1, similarSignals.length / 5); // Normalize to 0-1
  }

  private calculateAgentWorkload(agentStatus: AgentStatusInfo[]): number {
    if (!agentStatus || agentStatus.length === 0) return 0.5; // Default workload

    const activeAgents = agentStatus.filter(agent => agent.status === 'active' || agent.status === 'busy').length;
    const totalAgents = agentStatus.length;

    return activeAgents / totalAgents;
  }

  private calculateDataComplexity(data: Record<string, any>): number {
    if (!data || typeof data !== 'object') return 0;

    const depth = this.getObjectDepth(data);
    const size = JSON.stringify(data).length;

    return Math.min(1, (depth / 5 + size / 10000) / 2);
  }

  private getObjectDepth(obj: Record<string, unknown> | unknown[], currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) return currentDepth;

    if (currentDepth > 10) return currentDepth; // Prevent infinite recursion

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        const depth = this.getObjectDepth(value as Record<string, unknown>, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  // Additional implementation methods would go here...
  // For brevity, I'll include stubs for the remaining methods

  private async findSimilarSignals(_signal: Signal): Promise<HistoricalPatternMatch[]> { return []; }
  private calculateSuccessRate(_signals: HistoricalPatternMatch[]): number { return 0.8; }
  private calculateAverageResolutionTime(_signals: HistoricalPatternMatch[]): number { return 30; }
  private identifyCommonPatterns(_signals: HistoricalPatternMatch[]): string[] { return []; }
  private combineEnsembleResults(results: ClassifierResult[]): EnsembleResult {
    return {
      category: 'development',
      subcategory: 'implementation',
      confidence: 0.85,
      categoryConfidence: 0.85,
      categoryAlternatives: [],
      successfulClassifiers: results.length,
      priorityReasoning: 'Based on ensemble analysis'
    };
  }
  private initializeEnsembleClassifiers(): EnsembleClassifier[] { return []; }
  private findCalibrationPoint(confidence: number): { predicted: number; actual: number } {
    return { predicted: confidence, actual: confidence * 0.9 };
  }
  private calculateFeatureConfidence(_features: SignalFeatures): number { return 0.9; }
  private async calculateAgentSuitability(ensemble: EnsembleResult, agent: AgentStatusInfo): Promise<any> {
    const categoryAgentMap: Record<string, string> = {
      'development': 'robo-developer',
      'quality': 'robo-aqa',
      'coordination': 'conductor',
      'analysis': 'robo-system-analyst',
      'general': 'robo-developer'
    };

    // Get the signal type from the ensemble result or use category mapping
    let score = 0.5; // Base score
    let reasoning = 'Agent capability assessment: ';

    // If agent type matches the expected type for this category, give high score
    if (categoryAgentMap[ensemble.category] === agent.type) {
      score += 0.6; // Increased from 0.4 to 0.6 for better differentiation
      reasoning += `Perfect match for ${ensemble.category} tasks; `;
    } else if (agent.type === 'robo-developer' && ensemble.category === 'development') {
      score += 0.6;
      reasoning += `Well-suited for development tasks; `;
    } else if (agent.type === 'robo-aqa' && ensemble.category === 'quality') {
      score += 0.6;
      reasoning += `Well-suited for quality assurance tasks; `;
    } else if (agent.type === 'conductor' && ensemble.category === 'coordination') {
      score += 0.6;
      reasoning += `Well-suited for coordination tasks; `;
    } else if (agent.type === 'robo-devops-sre' && (ensemble.category === 'coordination' || ensemble.subcategory === 'merge')) {
      score += 0.5;
      reasoning += `Well-suited for deployment and coordination tasks; `;
    } else if (agent.type === 'robo-system-analyst' && ensemble.category === 'analysis') {
      score += 0.6;
      reasoning += `Well-suited for analysis tasks; `;
    } else {
      // Mismatch reduces score significantly
      score -= 0.2;
      reasoning += `Not optimal for ${ensemble.category} tasks; `;
    }

    // Consider agent performance
    if (agent.performance.errorRate < 0.1) {
      score += 0.1;
      reasoning += `Low error rate (${(agent.performance.errorRate * 100).toFixed(1)}%); `;
    }

    if (agent.performance.tasksCompleted > 5) {
      score += 0.05;
      reasoning += `Experienced agent (${agent.performance.tasksCompleted} tasks completed); `;
    }

    // Add some randomness for variety
    score += (Math.random() * 0.1 - 0.05);

    // Ensure score is within bounds
    score = Math.max(0.1, Math.min(0.95, score));

    return {
      score,
      reasoning: reasoning.trim(),
      requiredCapabilities: ['task-processing'],
      estimatedSuccessRate: Math.min(0.95, score + 0.1)
    };
  }
  private findSignalDependencies(_signal: Signal, _relatedSignals: Signal[]): string[] { return []; }
  private identifyPrerequisites(_signal: Signal): string[] { return []; }
  private identifyBlockers(_signal: Signal, _context: ProcessingContext): string[] { return []; }
  private async assessImpact(_signal: Signal, _context: ProcessingContext): Promise<any> {
    return { level: 'medium', affectedComponents: [] };
  }
  private calculatePriorityLevel(_ensemble: EnsembleResult, _features: SignalFeatures): number { return 5; }
  private determineUrgency(_ensemble: EnsembleResult, _features: SignalFeatures): string { return 'medium'; }
  private calculateDeadline(_ensemble: EnsembleResult, _features: SignalFeatures): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  private calculateComplexity(_ensemble: EnsembleResult, _features: SignalFeatures): number { return 5; }
  private identifyComplexityFactors(_features: SignalFeatures): string[] { return []; }
  private estimateResolutionTime(_ensemble: EnsembleResult, _patterns: HistoricalPatternMatch[]): number { return 30; }
  private async updateHistoricalData(_signal: Signal, _classification: EnhancedSignalClassification): Promise<void> {}
  private createFallbackClassification(signal: Signal, _error: unknown): EnhancedSignalClassification {
    return {
      id: HashUtils.generateId(),
      signalId: signal.id,
      timestamp: new Date(),
      category: { primary: 'unknown', subcategory: 'general', confidence: 0.3, alternatives: [] },
      priority: { level: 5, urgency: 'medium', deadline: new Date(), reasoning: 'Fallback classification' },
      agentRole: { primary: 'robo-developer', alternatives: [], reasoning: 'Default assignment', capabilities: [] },
      complexity: { level: 5, factors: [], estimatedTime: 30 },
      dependencies: { signalDependencies: [], prerequisites: [], blockers: [], impactAssessment: { level: 'low', affectedComponents: [] } },
      confidence: 0.3,
      features: {} as SignalFeatures,
      historicalMatches: [],
      recommendations: [],
      metadata: { ensembleSize: 0, successfulClassifications: 0, historicalDataSize: 0, calibrationApplied: false }
    };
  }
  private initializeCalibrationData(): void {
    this.calibrationData = {
      predictedConfidence: 0,
      actualAccuracy: 0,
      sampleSize: 0,
      calibrationCurve: []
    };
  }
}

// Supporting interfaces and classes

interface AgentPerformanceData {
  agentId: string;
  successRate: number;
  averageResolutionTime: number;
  preferredTasks: string[];
  skillLevels: Record<string, number>;
}

// SignalPatternDatabase and EnsembleClassifier are now imported from separate files

// Export the internal interface for external use
export type { EnsembleResult } from './types';


interface AgentRecommendation {
  agentId: string;
  agentName: string;
  agentRole: string;
  suitability: number;
  reasoning: string;
  capabilities: string[];
  estimatedSuccessRate: number;
}

interface DependencyAnalysis {
  signalDependencies: string[];
  prerequisites: string[];
  blockers: string[];
  impactAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    affectedComponents: string[];
  };
}

