/**
 * ♫ Signal Classifier for @dcversus/prp Inspector
 *
 * Advanced signal classification with priority scoring, confidence assessment,
 * complexity evaluation, and risk scoring for the Critic inspector system.
 */

import { EventEmitter } from 'events';
import { Signal, AgentRole } from '../shared/types';
import {
  SignalClassification,
  EnhancedSignalClassification,
  SignalFeatures,
  ConfidenceCalibration,
  ClassificationFeatures,
  TokenAnalysis,
  ProcessingContext
} from './types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

/**
 * Classification confidence levels
 */
export enum ConfidenceLevel {
  VERY_LOW = 20,
  LOW = 40,
  MEDIUM = 60,
  HIGH = 80,
  VERY_HIGH = 95
}

/**
 * Priority levels (1-10 scale)
 */
export enum PriorityLevel {
  LOWEST = 1,
  LOW = 3,
  MEDIUM = 5,
  HIGH = 7,
  HIGHEST = 10
}

/**
 * Complexity levels
 */
export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Risk scoring factors
 */
export interface RiskFactors {
  technicalComplexity: number;      // 0-10
  impactScope: number;             // 0-10
  dependencyCount: number;         // 0-10
  urgencyLevel: number;            // 0-10
  resourceRequirements: number;   // 0-10
  uncertaintyLevel: number;        // 0-10
}

/**
 * Classification weights for scoring
 */
export interface ClassificationWeights {
  priorityWeight: number;          // Weight for priority calculation
  confidenceWeight: number;        // Weight for confidence calculation
  complexityWeight: number;        // Weight for complexity assessment
  riskWeight: number;              // Weight for risk evaluation
  urgencyWeight: number;           // Weight for urgency assessment
}

/**
 * Signal pattern database entry
 */
export interface SignalPattern {
  pattern: string;
  category: string;
  subcategory: string;
  agentRole: AgentRole;
  priorityRange: [number, number];
  confidenceBaseline: number;
  complexityLevel: ComplexityLevel;
  riskFactors: Partial<RiskFactors>;
  commonFeatures: string[];
  recommendedActions: string[];
}

/**
 * Classification result with detailed analysis
 */
export interface ClassificationResult {
  classification: EnhancedSignalClassification;
  riskAssessment: {
    overallRisk: number;           // 0-100
    riskFactors: RiskFactors;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    mitigationStrategies: string[];
  };
  tokenAnalysis: TokenAnalysis;
  features: ClassificationFeatures;
  calibration: ConfidenceCalibration;
  processingMetadata: {
    processingTime: number;
    matchedPatterns: string[];
    confidenceFactors: Record<string, number>;
    uncertaintyFactors: string[];
  };
}

/**
 * Signal Classifier - Advanced classification engine for the Inspector
 */
export class SignalClassifier extends EventEmitter {
  private weights: ClassificationWeights;
  private patterns: Map<string, SignalPattern> = new Map();
  private calibrationHistory: ConfidenceCalibration[] = [];

  constructor(weights?: Partial<ClassificationWeights>) {
    super();

    // Default weights for classification scoring
    this.weights = {
      priorityWeight: 0.25,
      confidenceWeight: 0.30,
      complexityWeight: 0.20,
      riskWeight: 0.15,
      urgencyWeight: 0.10,
      ...weights
    };

    this.initializeSignalPatterns();
    this.loadCalibrationHistory();

    logger.info('SignalClassifier', 'Signal Classifier initialized', {
      weights: this.weights,
      patternsCount: this.patterns.size
    });
  }

  /**
   * Classify signal with comprehensive analysis
   */
  async classifySignal(
    signal: Signal,
    context?: ProcessingContext
  ): Promise<ClassificationResult> {
    const startTime = Date.now();
    const classificationId = HashUtils.generateId();

    try {
      logger.debug('SignalClassifier', `Classifying signal ${signal.type}`, {
        signalId: signal.id,
        classificationId
      });

      // Extract signal features
      const features = await this.extractSignalFeatures(signal, context);

      // Find matching patterns
      const matchedPatterns = this.findMatchingPatterns(features);

      // Calculate base classification
      const baseClassification = await this.calculateBaseClassification(features, matchedPatterns);

      // Assess risk factors
      const riskAssessment = await this.assessRisk(signal, features, context);

      // Analyze token implications
      const tokenAnalysis = await this.analyzeTokenImplications(signal, context);

      // Calibrate confidence
      const calibration = await this.calibrateConfidence(baseClassification, matchedPatterns);

      // Create enhanced classification
      const enhancedClassification: EnhancedSignalClassification = {
        ...baseClassification,
        signalId: signal.id,
        complexity: this.assessComplexity(features, riskAssessment),
        urgency: this.assessUrgency(features, riskAssessment),
        primary: baseClassification.agentRole,
        context: context ? JSON.stringify(context).substring(0, 500) + '...' : undefined,
        metadata: {
          features,
          matchedPatterns: matchedPatterns.map(p => p.pattern),
          riskFactors: riskAssessment.riskFactors,
          tokenImplications: tokenAnalysis
        },
        historicalMatches: this.findHistoricalMatches(features)
      };

      const processingTime = Date.now() - startTime;

      const result: ClassificationResult = {
        classification: enhancedClassification,
        riskAssessment,
        tokenAnalysis,
        features: {
          category: enhancedClassification.category,
          urgency: enhancedClassification.urgency,
          complexity: enhancedClassification.complexity,
          agentRole: enhancedClassification.agentRole,
          priority: enhancedClassification.priority,
          context: enhancedClassification.context || ''
        },
        calibration,
        processingMetadata: {
          processingTime,
          matchedPatterns: matchedPatterns.map(p => p.pattern),
          confidenceFactors: this.calculateConfidenceFactors(features, matchedPatterns),
          uncertaintyFactors: this.identifyUncertaintyFactors(features, matchedPatterns)
        }
      };

      // Update calibration history
      this.updateCalibrationHistory(calibration);

      // Emit classification completed event
      this.emit('classification:completed', {
        classificationId,
        signalId: signal.id,
        result
      });

      logger.debug('SignalClassifier', 'Signal classification completed', {
        classificationId,
        processingTime,
        confidence: enhancedClassification.confidence,
        priority: enhancedClassification.priority
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('SignalClassifier', 'Signal classification failed', error instanceof Error ? error : new Error(errorMessage));

      // Emit classification failed event
      this.emit('classification:failed', {
        classificationId,
        signalId: signal.id,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Extract signal features for classification
   */
  private async extractSignalFeatures(
    signal: Signal,
    context?: ProcessingContext
  ): Promise<SignalFeatures> {
    return {
      type: signal.type,
      priority: signal.priority || 5,
      source: signal.source,
      timestamp: signal.timestamp,
      data: signal.data,
      metadata: {
        hasContext: !!context,
        contextSize: context ? JSON.stringify(context).length : 0,
        dataComplexity: this.assessDataComplexity(signal.data),
        signalAge: Date.now() - signal.timestamp.getTime(),
        sourceReliability: this.assessSourceReliability(signal.source)
      }
    };
  }

  /**
   * Find patterns matching signal features
   */
  private findMatchingPatterns(features: SignalFeatures): SignalPattern[] {
    const matches: SignalPattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (this.patternMatches(features, pattern)) {
        matches.push(pattern);
      }
    }

    // Sort by confidence baseline (highest first)
    return matches.sort((a, b) => b.confidenceBaseline - a.confidenceBaseline);
  }

  /**
   * Check if pattern matches signal features
   */
  private patternMatches(features: SignalFeatures, pattern: SignalPattern): boolean {
    // Simple pattern matching - in a real implementation, this would be more sophisticated
    const signalType = features.type.toLowerCase();
    const patternType = pattern.pattern.toLowerCase();

    return signalType.includes(patternType) || patternType.includes(signalType);
  }

  /**
   * Calculate base classification from features and patterns
   */
  private async calculateBaseClassification(
    features: SignalFeatures,
    matchedPatterns: SignalPattern[]
  ): Promise<SignalClassification> {
    // Use best matching pattern or defaults
    const bestPattern = matchedPatterns[0];

    // Calculate priority score (1-10)
    const priorityScore = this.calculatePriorityScore(features, matchedPatterns);

    // Calculate confidence score (0-100)
    const confidenceScore = this.calculateConfidenceScore(features, matchedPatterns);

    // Determine agent role
    const agentRole = bestPattern?.agentRole || this.inferAgentRole(features);

    // Determine escalation level
    const escalationLevel = this.calculateEscalationLevel(features, priorityScore);

    // Set deadline
    const deadline = this.calculateDeadline(features, priorityScore, escalationLevel);

    return {
      category: bestPattern?.category || this.inferCategory(features),
      subcategory: bestPattern?.subcategory || this.inferSubcategory(features),
      priority: priorityScore,
      agentRole,
      escalationLevel,
      deadline,
      dependencies: this.identifyDependencies(features),
      confidence: confidenceScore
    };
  }

  /**
   * Calculate priority score (1-10)
   */
  private calculatePriorityScore(features: SignalFeatures, patterns: SignalPattern[]): number {
    let score = features.priority;

    // Adjust based on signal age
    const signalAge = features.metadata?.signalAge as number ?? 0;
    const ageHours = signalAge / (1000 * 60 * 60);
    if (ageHours > 24) {
      score += 1; // Older signals get higher priority
    }

    // Adjust based on data complexity
    const dataComplexity = features.metadata?.dataComplexity as number ?? 0;
    if (dataComplexity > 7) {
      score += 1;
    }

    // Adjust based on matching patterns
    if (patterns.length > 0 && patterns[0]) {
      const patternPriority = patterns[0].priorityRange[1];
      score = Math.max(score, patternPriority);
    }

    // Normalize to 1-10 range
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidenceScore(features: SignalFeatures, patterns: SignalPattern[]): number {
    let confidence = 50; // Base confidence

    // Adjust based on pattern matches
    if (patterns.length > 0 && patterns[0]) {
      const bestPattern = patterns[0];
      confidence = bestPattern.confidenceBaseline;

      // Increase confidence with multiple matching patterns
      if (patterns.length > 1) {
        confidence += Math.min(10, patterns.length * 2);
      }
    }

    // Adjust based on source reliability
    const sourceReliability = features.metadata?.sourceReliability as number ?? 0;
    confidence += sourceReliability * 10;

    // Adjust based on data completeness
    if (features.data && Object.keys(features.data).length > 0) {
      confidence += 5;
    }

    // Adjust based on historical accuracy
    const historicalAccuracy = this.getHistoricalAccuracy(features);
    confidence += (historicalAccuracy - 50) * 0.2;

    // Normalize to 0-100 range
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Assess risk factors
   */
  private async assessRisk(
    signal: Signal,
    features: SignalFeatures,
    context?: ProcessingContext
  ): Promise<{
    overallRisk: number;
    riskFactors: RiskFactors;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    mitigationStrategies: string[];
  }> {
    // Find matching patterns for risk assessment
    const matchedPatterns = await this.findMatchingPatterns(features);

    const riskFactors: RiskFactors = {
      technicalComplexity: this.assessTechnicalComplexity(features, context),
      impactScope: this.assessImpactScope(signal, context),
      dependencyCount: this.assessDependencyCount(signal, context),
      urgencyLevel: this.assessUrgencyLevel(features),
      resourceRequirements: this.assessResourceRequirements(features, context),
      uncertaintyLevel: this.assessUncertaintyLevel(features, matchedPatterns as any[])
    };

    // Calculate overall risk score (0-100)
    const overallRisk = Math.round(
      (riskFactors.technicalComplexity * 0.25 +
       riskFactors.impactScope * 0.20 +
       riskFactors.dependencyCount * 0.15 +
       riskFactors.urgencyLevel * 0.20 +
       riskFactors.resourceRequirements * 0.10 +
       riskFactors.uncertaintyLevel * 0.10) * 10
    );

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallRisk >= 80) {
      riskLevel = 'critical';
    } else if (overallRisk >= 60) {
      riskLevel = 'high';
    } else if (overallRisk >= 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Generate mitigation strategies
    const mitigationStrategies = this.generateMitigationStrategies(riskFactors, riskLevel);

    return {
      overallRisk,
      riskFactors,
      riskLevel,
      mitigationStrategies
    };
  }

  /**
   * Analyze token implications
   */
  private async analyzeTokenImplications(
    signal: Signal,
    context?: ProcessingContext
  ): Promise<TokenAnalysis> {
    // Estimate token usage for processing this signal
    const inputTokens = this.estimateInputTokens(signal, context);
    const outputTokens = this.estimateOutputTokens(signal);
    const totalTokens = inputTokens + outputTokens;

    // Calculate efficiency metrics
    const efficiency = this.calculateTokenEfficiency(signal, totalTokens);

    return {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
      estimated: totalTokens,
      efficiency
    };
  }

  /**
   * Calibrate confidence based on historical accuracy
   */
  private async calibrateConfidence(
    classification: SignalClassification,
    _patterns: SignalPattern[]
  ): Promise<ConfidenceCalibration> {
    const baseline = classification.confidence;

    // Get historical accuracy for similar signals
    const historicalAccuracy = this.getHistoricalAccuracyForClassification(classification);

    // Calculate adjustment
    const adjustment = (historicalAccuracy - baseline) * 0.3; // 30% adjustment

    // Apply adjustment
    const calibratedConfidence = Math.max(0, Math.min(100, baseline + adjustment));

    return {
      baseline,
      adjustment,
      confidence: Math.round(calibratedConfidence),
      timestamp: new Date()
    };
  }

  /**
   * Assess complexity level
   */
  private assessComplexity(
    features: SignalFeatures,
    riskAssessment: { riskFactors: RiskFactors }
  ): ComplexityLevel {
    const dataComplexity = features.metadata?.dataComplexity as number ?? 0;
    const complexityScore = (
      dataComplexity * 0.3 +
      riskAssessment.riskFactors.technicalComplexity * 0.4 +
      riskAssessment.riskFactors.dependencyCount * 0.3
    );

    if (complexityScore >= 8) {
      return ComplexityLevel.CRITICAL;
    }
    if (complexityScore >= 6) {
      return ComplexityLevel.HIGH;
    }
    if (complexityScore >= 4) {
      return ComplexityLevel.MEDIUM;
    }
    return ComplexityLevel.LOW;
  }

  /**
   * Assess urgency level
   */
  private assessUrgency(
    features: SignalFeatures,
    riskAssessment: { riskFactors: RiskFactors }
  ): 'low' | 'medium' | 'high' | 'urgent' {
    const signalAge = features.metadata?.signalAge as number ?? 0;
    const urgencyScore = (
      riskAssessment.riskFactors.urgencyLevel * 0.4 +
      (signalAge > 86400000 ? 8 : 2) * 0.3 + // Older than 24h
      features.priority * 0.3
    );

    if (urgencyScore >= 8) {
      return 'urgent';
    }
    if (urgencyScore >= 6) {
      return 'high';
    }
    if (urgencyScore >= 4) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Find historical matches for similar signals
   */
  private findHistoricalMatches(_features: SignalFeatures): Array<{
    id: string;
    confidence: number;
    timestamp: Date;
  }> {
    // This would query a database of past classifications
    // For now, return empty array
    return [];
  }

  /**
   * Initialize signal patterns database
   */
  private initializeSignalPatterns(): void {
    // Development patterns
    this.addPattern({
      pattern: 'dp',
      category: 'development',
      subcategory: 'progress',
      agentRole: 'robo-developer',
      priorityRange: [5, 7],
      confidenceBaseline: 85,
      complexityLevel: ComplexityLevel.MEDIUM,
      riskFactors: {
        technicalComplexity: 4,
        impactScope: 5,
        urgencyLevel: 6
      },
      commonFeatures: ['progress', 'implementation', 'completion'],
      recommendedActions: ['review', 'validate', 'document']
    });

    // Testing patterns
    this.addPattern({
      pattern: 'tg',
      category: 'testing',
      subcategory: 'test_results',
      agentRole: 'robo-aqa',
      priorityRange: [6, 8],
      confidenceBaseline: 90,
      complexityLevel: ComplexityLevel.MEDIUM,
      riskFactors: {
        technicalComplexity: 5,
        impactScope: 6,
        urgencyLevel: 7
      },
      commonFeatures: ['test', 'validation', 'quality'],
      recommendedActions: ['analyze', 'report', 'fix']
    });

    // Bug fix patterns
    this.addPattern({
      pattern: 'bf',
      category: 'development',
      subcategory: 'bug_fix',
      agentRole: 'robo-developer',
      priorityRange: [7, 9],
      confidenceBaseline: 95,
      complexityLevel: ComplexityLevel.HIGH,
      riskFactors: {
        technicalComplexity: 7,
        impactScope: 6,
        urgencyLevel: 8
      },
      commonFeatures: ['bug', 'fix', 'error', 'issue'],
      recommendedActions: ['prioritize', 'fix', 'test', 'verify']
    });

    // Blocker patterns
    this.addPattern({
      pattern: 'bb',
      category: 'development',
      subcategory: 'blocker',
      agentRole: 'robo-developer',
      priorityRange: [9, 10],
      confidenceBaseline: 98,
      complexityLevel: ComplexityLevel.CRITICAL,
      riskFactors: {
        technicalComplexity: 8,
        impactScope: 9,
        urgencyLevel: 10
      },
      commonFeatures: ['blocked', 'stuck', 'dependency', 'waiting'],
      recommendedActions: ['escalate', 'unblock', 'prioritize']
    });

    // Code quality patterns
    this.addPattern({
      pattern: 'cq',
      category: 'development',
      subcategory: 'code_quality',
      agentRole: 'robo-aqa',
      priorityRange: [4, 6],
      confidenceBaseline: 80,
      complexityLevel: ComplexityLevel.LOW,
      riskFactors: {
        technicalComplexity: 3,
        impactScope: 4,
        urgencyLevel: 5
      },
      commonFeatures: ['quality', 'standards', 'linting', 'style'],
      recommendedActions: ['review', 'improve', 'document']
    });
  }

  /**
   * Add pattern to database
   */
  private addPattern(pattern: SignalPattern): void {
    this.patterns.set(pattern.pattern, pattern);
  }

  /**
   * Helper methods for assessment
   */
  private assessDataComplexity(data: unknown): number {
    if (!data) {
      return 1;
    }
    if (typeof data === 'string') {
      return Math.min(10, data.length / 100);
    }
    if (typeof data === 'object') {
      return Math.min(10, Object.keys(data).length);
    }
    return 5;
  }

  private assessSourceReliability(source: string): number {
    // Higher reliability for known sources
    const reliableSources = ['scanner', 'orchestrator', 'agent', 'system'];
    return reliableSources.some(s => source.toLowerCase().includes(s)) ? 8 : 5;
  }

  private inferAgentRole(features: SignalFeatures): AgentRole {
    // Simple inference based on signal type
    const signalType = features.type.toLowerCase();
    if (signalType.includes('test') || signalType.includes('quality')) {
      return 'robo-aqa';
    }
    if (signalType.includes('deploy') || signalType.includes('ops')) {
      return 'robo-devops';
    }
    if (signalType.includes('design') || signalType.includes('ui')) {
      return 'robo-ui-designer';
    }
    if (signalType.includes('analyze') || signalType.includes('system')) {
      return 'robo-system-analyst';
    }
    return 'robo-developer';
  }

  private inferCategory(features: SignalFeatures): string {
    const signalType = features.type.toLowerCase();
    if (signalType.includes('test')) {
      return 'testing';
    }
    if (signalType.includes('deploy')) {
      return 'deployment';
    }
    if (signalType.includes('bug')) {
      return 'development';
    }
    if (signalType.includes('security')) {
      return 'security';
    }
    return 'general';
  }

  private inferSubcategory(features: SignalFeatures): string {
    return features.type;
  }

  private calculateEscalationLevel(_features: SignalFeatures, priority: number): number {
    if (priority >= 9) {
      return 5;
    }
    if (priority >= 7) {
      return 4;
    }
    if (priority >= 5) {
      return 3;
    }
    if (priority >= 3) {
      return 2;
    }
    return 1;
  }

  private calculateDeadline(_features: SignalFeatures, priority: number, _escalationLevel: number): Date {
    const baseTime = Date.now();
    let hoursToAdd = 24; // Default 24 hours

    if (priority >= 9) {
      hoursToAdd = 2;
    } else if (priority >= 7) {
      hoursToAdd = 6;
    } else if (priority >= 5) {
      hoursToAdd = 12;
    }

    return new Date(baseTime + hoursToAdd * 60 * 60 * 1000);
  }

  private identifyDependencies(_features: SignalFeatures): string[] {
    // This would analyze the signal data for dependencies
    return [];
  }

  private assessTechnicalComplexity(features: SignalFeatures, _context?: ProcessingContext): number {
    return (features.metadata?.dataComplexity as number) ?? 5;
  }

  private assessImpactScope(signal: Signal, _context?: ProcessingContext): number {
    // Simple assessment based on signal data
    return signal.priority || 5;
  }

  private assessDependencyCount(_signal: Signal, _context?: ProcessingContext): number {
    // This would analyze dependencies in the signal
    return 3;
  }

  private assessUrgencyLevel(features: SignalFeatures): number {
    return features.priority;
  }

  private assessResourceRequirements(features: SignalFeatures, _context?: ProcessingContext): number {
    return (features.metadata?.dataComplexity as number) ?? 5;
  }

  private assessUncertaintyLevel(_features: SignalFeatures, patterns: SignalPattern[]): number {
    if (patterns.length === 0) {
      return 8;
    }
    return Math.max(1, 10 - patterns.length * 2);
  }

  private generateMitigationStrategies(riskFactors: RiskFactors, riskLevel: string): string[] {
    const strategies: string[] = [];

    if (riskFactors.technicalComplexity >= 7) {
      strategies.push('Allocate senior developer resources');
      strategies.push('Schedule technical review');
    }

    if (riskFactors.impactScope >= 7) {
      strategies.push('Coordinate with affected teams');
      strategies.push('Plan phased rollout');
    }

    if (riskFactors.urgencyLevel >= 7) {
      strategies.push('Prioritize in current sprint');
      strategies.push('Allocate additional resources');
    }

    if (riskLevel === 'critical') {
      strategies.push('Escalate to management');
      strategies.push('Create incident response plan');
    }

    return strategies;
  }

  private estimateInputTokens(signal: Signal, context?: ProcessingContext): number {
    let tokens = JSON.stringify(signal).length / 4;
    if (context) {
      tokens += JSON.stringify(context).length / 4;
    }
    return Math.round(tokens);
  }

  private estimateOutputTokens(_signal: Signal): number {
    // Estimate based on signal complexity
    return 1000 + 5 * 100;
  }

  private calculateTokenEfficiency(_signal: Signal, totalTokens: number): number {
    // Simple efficiency calculation
    return Math.max(0, 100 - totalTokens / 100);
  }

  private getHistoricalAccuracy(_features: SignalFeatures): number {
    // This would query historical data
    return 75; // Default 75% accuracy
  }

  private getHistoricalAccuracyForClassification(_classification: SignalClassification): number {
    // This would query historical accuracy for similar classifications
    return 80; // Default 80% accuracy
  }

  private calculateConfidenceFactors(features: SignalFeatures, patterns: SignalPattern[]): Record<string, number> {
    return {
      patternMatch: patterns.length > 0 ? 20 : 0,
      sourceReliability: ((features.metadata?.sourceReliability as number) ?? 5) * 2,
      dataCompleteness: features.data ? 10 : 0,
      historicalAccuracy: 15
    };
  }

  private identifyUncertaintyFactors(features: SignalFeatures, patterns: SignalPattern[]): string[] {
    const factors: string[] = [];

    if (patterns.length === 0) {
      factors.push('No matching patterns found');
    }

    const sourceReliability = (features.metadata?.sourceReliability as number) ?? 5;
    if (sourceReliability < 5) {
      factors.push('Low source reliability');
    }

    if (!features.data || Object.keys(features.data).length === 0) {
      factors.push('Missing signal data');
    }

    return factors;
  }

  private loadCalibrationHistory(): void {
    // This would load from persistent storage
    this.calibrationHistory = [];
  }

  private updateCalibrationHistory(calibration: ConfidenceCalibration): void {
    this.calibrationHistory.push(calibration);

    // Keep only recent history (last 1000 entries)
    if (this.calibrationHistory.length > 1000) {
      this.calibrationHistory = this.calibrationHistory.slice(-1000);
    }
  }

  /**
   * Get classifier statistics
   */
  getStatistics(): {
    patternsCount: number;
    calibrationHistorySize: number;
    averageConfidence: number;
    recentAccuracy: number;
    } {
    const avgConfidence = this.calibrationHistory.length > 0
      ? this.calibrationHistory.reduce((sum, c) => sum + c.confidence, 0) / this.calibrationHistory.length
      : 0;

    return {
      patternsCount: this.patterns.size,
      calibrationHistorySize: this.calibrationHistory.length,
      averageConfidence: Math.round(avgConfidence),
      recentAccuracy: this.getHistoricalAccuracy({} as SignalFeatures)
    };
  }

  /**
   * Add custom pattern
   */
  addCustomPattern(pattern: SignalPattern): void {
    this.addPattern(pattern);
    logger.info('SignalClassifier', `Custom pattern added: ${pattern.pattern}`);
  }

  /**
   * Remove pattern
   */
  removePattern(patternId: string): boolean {
    const removed = this.patterns.delete(patternId);
    if (removed) {
      logger.info('SignalClassifier', `Pattern removed: ${patternId}`);
    }
    return removed;
  }

  /**
   * Get all patterns
   */
  getPatterns(): SignalPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Clear calibration history
   */
  clearCalibrationHistory(): void {
    this.calibrationHistory = [];
    logger.info('SignalClassifier', 'Calibration history cleared');
  }
}