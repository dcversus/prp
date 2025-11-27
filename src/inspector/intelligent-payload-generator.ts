/**
 * ♫ Intelligent Payload Generator for @dcversus/prp Inspector
 *
 * Advanced 40K token payload generation with semantic compression,
 * content prioritization, and intelligent optimization.
 */
import { EventEmitter } from 'events';

import { createLayerLogger, HashUtils, TokenCounter } from '../shared';

import type {
  EnhancedSignalClassification,
  ProcessingContext,
  PreparedContext,
  InspectorPayload,
  PayloadSection,
  Recommendation,
  AgentStatusInfo,
  SignalClassification,
  ContextData,
} from './types';

const logger = createLayerLogger('inspector');
/**
 * Content priority levels for payload generation
 */
enum ContentPriority {
  CRITICAL = 1, // Classification and immediate requirements
  HIGH = 2, // Related signals and active PRPs
  MEDIUM = 3, // Agent status and recent activity
  LOW = 4, // Historical data and patterns
  BACKGROUND = 5, // Optional context and metadata
}
/**
 * Payload generation configuration
 */
interface PayloadConfig {
  targetSize: number; // Target token count (default 40000)
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  includeSections: string[]; // Sections to include
  excludeSections: string[]; // Sections to exclude
  preserveMetadata: boolean;
  optimizeForAgent: string; // Target agent role
}
/**
 * Content analysis result
 */
interface ContentAnalysis {
  sections: Array<{
    id: string;
    name: string;
    content: unknown;
    priority: ContentPriority;
    estimatedTokens: number;
    relevanceScore: number;
    compressibility: number;
  }>;
  totalEstimatedTokens: number;
  criticalSections: string[];
  optionalSections: string[];
}
/**
 * Compression strategy
 */
interface CompressionStrategy {
  name: string;
  description: string;
  applicability: (section: unknown) => boolean;
  compress: (content: unknown, targetSize: number) => Promise<unknown>;
  qualityImpact: number; // 0-1, lower is better
  compressionRatio: number; // Expected compression ratio
}
/**
 * Intelligent Payload Generator
 */
export class IntelligentPayloadGenerator extends EventEmitter {
  private readonly compressionStrategies = new Map<string, CompressionStrategy>();
  private readonly contentPrioritization: ContentPrioritizer;
  private readonly tokenOptimizer: TokenOptimizer;
  private readonly semanticCompressor: SemanticCompressor;
  constructor() {
    super();
    this.initializeCompressionStrategies();
    this.contentPrioritization = new ContentPrioritizer();
    this.tokenOptimizer = new TokenOptimizer();
    this.semanticCompressor = new SemanticCompressor();
  }
  /**
   * Generate optimized payload within 40K token limit
   */
  async generatePayload(
    classification: EnhancedSignalClassification,
    context: ProcessingContext,
    config: Partial<PayloadConfig> = {},
  ): Promise<OptimizedInspectorPayload> {
    const startTime = Date.now();
    const payloadId = HashUtils.generateId();
    try {
      logger.info(
        'IntelligentPayloadGenerator',
        `Starting payload generation for signal ${classification.signalId}`,
      );
      // Step 1: Apply default configuration
      const finalConfig = this.applyDefaultConfig(config);
      // Step 2: Analyze content and estimate sizes
      const contentAnalysis = await this.analyzeContent(classification, context);
      // Step 3: Prioritize content sections
      const prioritizedContent = await this.prioritizeContent(contentAnalysis, finalConfig);
      // Step 4: Optimize token allocation
      const tokenAllocation = this.optimizeTokenAllocation(prioritizedContent, finalConfig);
      // Step 5: Generate payload sections
      const payloadSections = await this.generatePayloadSections(
        classification,
        context,
        tokenAllocation,
      );
      // Step 6: Apply compression if needed
      const optimizedSections = await this.applyCompression(payloadSections, finalConfig);
      // Step 7: Validate and finalize payload
      const finalPayload = await this.finalizePayload(
        classification,
        optimizedSections,
        finalConfig,
        payloadId,
      );
      const processingTime = Date.now() - startTime;
      logger.info('IntelligentPayloadGenerator', 'Payload generation completed', {
        payloadId,
        processingTime,
        totalTokens: finalPayload.estimatedTokens,
        sectionsCount: finalPayload.sections.length,
        compressionApplied: finalPayload.compressionApplied,
      });
      this.emit('payload_generated', { payload: finalPayload, processingTime });
      return finalPayload;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'IntelligentPayloadGenerator',
        'Payload generation failed',
        error instanceof Error ? error : new Error(errorMessage),
      );
      // Return fallback payload
      return this.createFallbackPayload(classification, context, payloadId);
    }
  }
  /**
   * Analyze content and estimate token requirements
   */
  private async analyzeContent(
    classification: EnhancedSignalClassification,
    context: ProcessingContext,
  ): Promise<ContentAnalysis> {
    const sections = [];
    // Classification section (always critical)
    sections.push({
      id: 'classification',
      name: 'Signal Classification',
      content: classification,
      priority: ContentPriority.CRITICAL,
      estimatedTokens: TokenCounter.estimateTokensFromObject(classification),
      relevanceScore: 1.0,
      compressibility: 0.2, // Low compressibility - critical info
    });
    // Signal data section
    if (classification.signalId && context.relatedSignals.length > 0) {
      sections.push({
        id: 'signal_data',
        name: 'Signal Data & Related Signals',
        content: {
          currentSignal: classification,
          relatedSignals: context.relatedSignals.slice(0, 5), // Limit to 5 most recent
        },
        priority: ContentPriority.HIGH,
        estimatedTokens: TokenCounter.estimateTokensFromObject({
          classification,
          relatedSignals: context.relatedSignals.slice(0, 5),
        }),
        relevanceScore: 0.9,
        compressibility: 0.4,
      });
    }
    // Active PRPs section
    if (context.activePRPs.length > 0) {
      sections.push({
        id: 'active_prps',
        name: 'Active Product Requirements',
        content: {
          activePRPs: context.activePRPs,
          prpCount: context.activePRPs.length,
        },
        priority: ContentPriority.HIGH,
        estimatedTokens: TokenCounter.estimateTokensFromObject({
          activePRPs: context.activePRPs,
          prpCount: context.activePRPs.length,
        }),
        relevanceScore: 0.85,
        compressibility: 0.5,
      });
    }
    // Agent status section
    if (context.agentStatus.length > 0) {
      const relevantAgents = this.filterRelevantAgents(context.agentStatus, classification);
      sections.push({
        id: 'agent_status',
        name: 'Agent Status & Capabilities',
        content: {
          agentStatus: relevantAgents,
          totalAgents: context.agentStatus.length,
          activeAgents: context.agentStatus.filter((a) => a.status === 'active').length,
        },
        priority: ContentPriority.MEDIUM,
        estimatedTokens: TokenCounter.estimateTokensFromObject({
          agentStatus: relevantAgents,
          totalAgents: context.agentStatus.length,
        }),
        relevanceScore: 0.7,
        compressibility: 0.6,
      });
    }
    // Recent activity section
    if (context.recentActivity.length > 0) {
      const recentActivity = context.recentActivity.slice(0, 10); // Limit to 10 most recent
      sections.push({
        id: 'recent_activity',
        name: 'Recent System Activity',
        content: {
          recentActivity,
          activityCount: recentActivity.length,
          timeWindow: 'last 24 hours',
        },
        priority: ContentPriority.MEDIUM,
        estimatedTokens: TokenCounter.estimateTokensFromObject(recentActivity),
        relevanceScore: 0.6,
        compressibility: 0.7,
      });
    }
    // Historical patterns section
    if (classification.historicalMatches && classification.historicalMatches.length > 0) {
      sections.push({
        id: 'historical_patterns',
        name: 'Historical Patterns & Similar Signals',
        content: {
          historicalMatches: classification.historicalMatches.slice(0, 3), // Limit to 3 most relevant
          patternCount: classification.historicalMatches.length,
        },
        priority: ContentPriority.LOW,
        estimatedTokens: TokenCounter.estimateTokensFromObject({
          historicalMatches: classification.historicalMatches.slice(0, 3),
        }),
        relevanceScore: 0.5,
        compressibility: 0.8,
      });
    }
    // Token status section
    sections.push({
      id: 'token_status',
      name: 'System Token Status',
      content: context.tokenStatus,
      priority: ContentPriority.MEDIUM,
      estimatedTokens: TokenCounter.estimateTokensFromObject(context.tokenStatus),
      relevanceScore: 0.6,
      compressibility: 0.5,
    });
    // Environment info section
    sections.push({
      id: 'environment',
      name: 'Environment & System Information',
      content: context.environment,
      priority: ContentPriority.BACKGROUND,
      estimatedTokens: TokenCounter.estimateTokensFromObject(context.environment),
      relevanceScore: 0.4,
      compressibility: 0.7,
    });
    const totalEstimatedTokens = sections.reduce(
      (sum, section) => sum + section.estimatedTokens,
      0,
    );
    const criticalSections = sections
      .filter((s) => s.priority === ContentPriority.CRITICAL)
      .map((s) => s.id);
    const optionalSections = sections
      .filter((s) => s.priority === ContentPriority.BACKGROUND)
      .map((s) => s.id);
    return {
      sections,
      totalEstimatedTokens,
      criticalSections,
      optionalSections,
    };
  }
  /**
   * Prioritize content based on relevance and requirements
   */
  private async prioritizeContent(
    contentAnalysis: ContentAnalysis,
    config: PayloadConfig,
  ): Promise<PrioritizedContent[]> {
    const prioritizedSections = await this.contentPrioritization.prioritize(
      contentAnalysis.sections,
    );
    return prioritizedSections.map((section) => ({
      section,
      adjustedPriority: this.calculateAdjustedPriority(section),
      targetTokens: this.calculateTargetTokens(section, config.targetSize),
    }));
  }
  /**
   * Optimize token allocation across sections
   */
  private optimizeTokenAllocation(
    prioritizedContent: PrioritizedContent[],
    config: PayloadConfig,
  ): TokenAllocation {
    return this.tokenOptimizer.optimize(prioritizedContent, {
      totalBudget: config.targetSize,
      reserveForCompression: config.compressionLevel !== 'none' ? 0.1 : 0.05,
      ensureCriticalSections: true,
      priorityWeights: {
        [ContentPriority.CRITICAL]: 1.0,
        [ContentPriority.HIGH]: 0.8,
        [ContentPriority.MEDIUM]: 0.6,
        [ContentPriority.LOW]: 0.4,
        [ContentPriority.BACKGROUND]: 0.2,
      },
    });
  }
  /**
   * Generate payload sections according to token allocation
   */
  private async generatePayloadSections(
    _classification: EnhancedSignalClassification,
    _context: ProcessingContext,
    tokenAllocation: TokenAllocation,
  ): Promise<PayloadSection[]> {
    const sections: PayloadSection[] = [];
    for (const allocation of tokenAllocation.allocations) {
      const originalSection = tokenAllocation.sections.find(
        (s) => s.section.id === allocation.sectionId,
      );
      if (!originalSection) {
        continue;
      }
      const section = await this.createPayloadSection(
        originalSection.section,
        allocation.allocatedTokens,
      );
      if (section) {
        sections.push(section);
      }
    }
    return sections;
  }
  /**
   * Create individual payload section
   */
  private async createPayloadSection(
    section: ContentAnalysis['sections'][0],
    targetTokens: number,
  ): Promise<PayloadSection | null> {
    try {
      let {content} = section;
      let actualTokens = TokenCounter.estimateTokensFromObject(content);
      // Apply initial compression if needed
      if (actualTokens > targetTokens) {
        content = await this.applyInitialCompression(content);
        actualTokens = TokenCounter.estimateTokensFromObject(content);
      }
      return {
        id: section.id,
        name: section.name,
        description: this.generateSectionDescription(section),
        required: section.priority === ContentPriority.CRITICAL,
        maxSize: targetTokens,
        priority: section.priority,
        content: content as ContextData,
        metadata: {
          originalTokens: section.estimatedTokens,
          actualTokens,
          compressionRatio: section.estimatedTokens / actualTokens,
          priority: section.priority,
          relevanceScore: section.relevanceScore,
        },
      };
    } catch (error) {
      logger.warn(
        'IntelligentPayloadGenerator',
        `Failed to create section ${section.id}`,
        error as Record<string, unknown>,
      );
      return null;
    }
  }
  /**
   * Apply compression strategies to reduce payload size
   */
  private async applyCompression(
    sections: PayloadSection[],
    config: PayloadConfig,
  ): Promise<PayloadSection[]> {
    if (config.compressionLevel === 'none') {
      return sections;
    }
    const compressedSections: PayloadSection[] = [];
    for (const section of sections) {
      const compressedSection = await this.compressSection(section);
      compressedSections.push(compressedSection);
    }
    return compressedSections;
  }
  /**
   * Compress individual section
   */
  private async compressSection(section: PayloadSection): Promise<PayloadSection> {
    const applicableStrategies = Array.from(this.compressionStrategies.values())
      .filter((strategy: CompressionStrategy) => strategy.applicability(section.content))
      .sort(
        (a: CompressionStrategy, b: CompressionStrategy) => b.compressionRatio - a.compressionRatio,
      );
    let compressedContent: unknown = section.content;
    let compressedSection = { ...section };
    for (const strategy of applicableStrategies) {
      if (TokenCounter.estimateTokensFromObject(compressedContent) <= section.maxSize) {
        break; // Already within target size
      }
      try {
        compressedContent = await strategy.compress(compressedContent, section.maxSize);
        compressedSection = {
          ...compressedSection,
          content: compressedContent as ContextData,
          metadata: {
            ...compressedSection.metadata,
            compressionStrategy: strategy.name,
            compressionApplied: true,
          },
        };
        logger.debug(
          'IntelligentPayloadGenerator',
          `Applied compression strategy ${strategy.name} to section ${section.id}`,
        );
      } catch (error) {
        logger.warn(
          'IntelligentPayloadGenerator',
          `Compression strategy ${strategy.name} failed for section ${section.id}`,
          error as Record<string, unknown>,
        );
      }
    }
    return compressedSection;
  }
  /**
   * Finalize payload and validate constraints
   */
  private async finalizePayload(
    classification: EnhancedSignalClassification,
    sections: PayloadSection[],
    config: PayloadConfig,
    payloadId: string,
  ): Promise<OptimizedInspectorPayload> {
    const totalTokens = sections.reduce((sum: number, section: PayloadSection) => {
      const actualTokens = section.metadata?.actualTokens;
      const estimatedTokens =
        typeof actualTokens === 'number'
          ? actualTokens
          : TokenCounter.estimateTokensFromObject(section.content);
      return sum + estimatedTokens;
    }, 0);
    const payload: OptimizedInspectorPayload = {
      id: payloadId,
      signalId: classification.signalId,
      classification: this.convertClassificationForPayload(classification),
      context: this.createPreparedContext(classification),
      recommendations: this.generateRecommendations(classification),
      sections,
      timestamp: new Date(),
      size: totalTokens,
      compressed: config.compressionLevel !== 'none',
      estimatedTokens: totalTokens,
      targetSize: config.targetSize,
      compressionApplied: config.compressionLevel !== 'none',
      compressionLevel: config.compressionLevel,
      optimization: {
        sectionsConsidered: sections.length,
        sectionsIncluded: sections.length,
        averageCompressionRatio: this.calculateAverageCompressionRatio(sections),
        tokenEfficiency: totalTokens / config.targetSize,
        criticalSectionsPreserved: sections.filter((s: PayloadSection) => s.required).length,
      },
      metadata: {
        generatorVersion: '1.0',
        processingTime: 0, // Will be set by caller
        confidence: classification.confidence,
        complexity: this.convertComplexityToNumber(classification.complexity),
        agentOptimized: config.optimizeForAgent,
      },
    };
    // Validate payload constraints
    this.validatePayload(payload);
    return payload;
  }
  /**
   * Initialize compression strategies
   */
  private initializeCompressionStrategies(): void {
    // Semantic compression
    this.compressionStrategies.set('semantic', {
      name: 'semantic',
      description: 'Preserve meaning while reducing tokens',
      applicability: (content: unknown) => typeof content === 'object' && content !== null,
      compress: async (content: unknown) => this.semanticCompressor.compress(content),
      qualityImpact: 0.2,
      compressionRatio: 0.7,
    });
    // Array truncation
    this.compressionStrategies.set('array_truncation', {
      name: 'array_truncation',
      description: 'Truncate arrays to most important elements',
      applicability: (content: unknown) => Array.isArray(content),
      compress: async (content: unknown) => this.truncateArray(content as unknown[]),
      qualityImpact: 0.3,
      compressionRatio: 0.8,
    });
    // Key filtering
    this.compressionStrategies.set('key_filtering', {
      name: 'key_filtering',
      description: 'Remove less important object properties',
      applicability: (content: unknown) =>
        typeof content === 'object' && content !== null && !Array.isArray(content),
      compress: async (content: unknown) =>
        this.filterObjectKeys(content as Record<string, unknown>),
      qualityImpact: 0.4,
      compressionRatio: 0.6,
    });
    // Text summarization
    this.compressionStrategies.set('text_summarization', {
      name: 'text_summarization',
      description: 'Summarize long text content',
      applicability: (content: unknown) => typeof content === 'string' && content.length > 1000,
      compress: async (content: unknown) => this.summarizeText(content as string),
      qualityImpact: 0.3,
      compressionRatio: 0.5,
    });
  }
  // Helper methods and stub implementations
  private applyDefaultConfig(config: Partial<PayloadConfig>): PayloadConfig {
    return {
      targetSize: 40000,
      compressionLevel: 'medium',
      includeSections: [],
      excludeSections: [],
      preserveMetadata: true,
      optimizeForAgent: 'general',
      ...config,
    };
  }
  private filterRelevantAgents(
    agents: AgentStatusInfo[],
    classification: EnhancedSignalClassification,
  ): AgentStatusInfo[] {
    // Filter agents based on role relevance and availability
    return agents
      .filter((agent) => agent.status === 'active' || agent.type === classification.primary)
      .slice(0, 10); // Limit to 10 most relevant
  }

  private calculateAdjustedPriority(section: ContentAnalysis['sections'][0]): number {
    return section.priority;
  }
  private calculateTargetTokens(
    section: ContentAnalysis['sections'][0],
    totalTarget: number,
  ): number {
    return Math.min(section.estimatedTokens, Math.floor(totalTarget * 0.2)); // Max 20% per section
  }
  private generateSectionDescription(section: ContentAnalysis['sections'][0]): string {
    return `Critical ${section.name} section for signal analysis`;
  }
  private async applyInitialCompression(content: unknown): Promise<unknown> {
    // Simple initial compression - could be enhanced
    if (Array.isArray(content)) {
      return content.slice(0, Math.floor(content.length * 0.8));
    }
    return content;
  }
  private convertClassificationForPayload(
    classification: EnhancedSignalClassification,
  ): SignalClassification {
    return {
      category: classification.category,
      subcategory: classification.subcategory,
      priority: classification.priority,
      agentRole: classification.primary,
      escalationLevel: this.mapComplexityToEscalationLevel(classification.complexity),
      deadline: classification.deadline,
      dependencies: [], // Default empty dependencies
      confidence: classification.confidence,
    };
  }
  private mapComplexityToEscalationLevel(complexity: string): number {
    switch (complexity) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }
  private calculateAverageCompressionRatio(sections: PayloadSection[]): number {
    const ratios = sections
      .map((s) => s.metadata?.compressionRatio)
      .filter((ratio): ratio is number => ratio !== undefined);
    return ratios.length > 0 ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length : 1;
  }
  private validatePayload(payload: OptimizedInspectorPayload): void {
    if (payload.estimatedTokens > payload.targetSize * 1.1) {
      // Allow 10% tolerance
      logger.warn(
        'IntelligentPayloadGenerator',
        `Payload exceeds target size: ${payload.estimatedTokens} > ${payload.targetSize}`,
      );
    }
    if (payload.sections.length === 0) {
      throw new Error('Payload must contain at least one section');
    }
    const hasClassification = payload.sections.some((s) => s.id === 'classification');
    if (!hasClassification) {
      throw new Error('Payload must contain classification section');
    }
  }
  private createFallbackPayload(
    classification: EnhancedSignalClassification,
    _context: ProcessingContext,
    payloadId: string,
  ): OptimizedInspectorPayload {
    const fallbackSection: PayloadSection = {
      id: 'fallback_classification',
      name: 'Basic Classification',
      description: 'Fallback classification due to generation error',
      required: true,
      maxSize: 5000,
      priority: ContentPriority.CRITICAL,
      content: this.convertClassificationForPayload(classification) as ContextData,
      metadata: {
        originalTokens: 5000,
        actualTokens: 5000,
        compressionRatio: 1,
        priority: ContentPriority.CRITICAL,
        relevanceScore: 1.0,
        fallback: true,
      },
    };
    return {
      id: payloadId,
      signalId: classification.signalId,
      classification: this.convertClassificationForPayload(classification),
      context: this.createPreparedContext(classification),
      recommendations: this.generateRecommendations(classification),
      sections: [fallbackSection],
      timestamp: new Date(),
      size: 5000,
      compressed: false,
      estimatedTokens: 5000,
      targetSize: 40000,
      compressionApplied: false,
      compressionLevel: 'none',
      optimization: {
        sectionsConsidered: 1,
        sectionsIncluded: 1,
        averageCompressionRatio: 1,
        tokenEfficiency: 0.125,
        criticalSectionsPreserved: 1,
      },
      metadata: {
        generatorVersion: '1.0',
        processingTime: 0,
        confidence: classification.confidence * 0.5, // Reduce confidence for fallback
        complexity: this.convertComplexityToNumber(classification.complexity),
        agentOptimized: 'general',
        fallback: true,
      },
    };
  }
  // Stub implementations for compression strategies
  private async truncateArray(array: unknown[]): Promise<unknown[]> {
    const targetLength = Math.max(1, Math.floor(array.length * 0.7));
    return array.slice(0, targetLength);
  }
  private async filterObjectKeys(obj: Record<string, unknown>): Promise<Record<string, unknown>> {
    const keys = Object.keys(obj);
    const targetKeys = keys.slice(0, Math.max(1, Math.floor(keys.length * 0.8)));
    const result: Record<string, unknown> = {};
    for (const key of targetKeys) {
      result[key] = obj[key];
    }
    return result;
  }
  private async summarizeText(text: string): Promise<string> {
    // Simple text truncation - real implementation would use LLM summarization
    const targetLength = Math.max(50, Math.floor(text.length * 0.6));
    return `${text.substring(0, targetLength)  }... [summarized]`;
  }
  private createPreparedContext(classification: EnhancedSignalClassification): PreparedContext {
    // Create a minimal PreparedContext for the payload
    return {
      id: HashUtils.generateId(),
      signalId: classification.signalId,
      content: {
        agentContext: {},
        environment: {
          platform: 'cli',
          version: '1.0.0',
          nodeVersion: process.version,
        },
      },
      size: 1000,
      compressed: false,
      tokenCount: 200,
    };
  }
  private convertComplexityToNumber(complexity: 'low' | 'medium' | 'high' | 'critical'): number {
    const mapping: Record<string, number> = {
      low: 2,
      medium: 5,
      high: 8,
      critical: 10,
    };
    return mapping[complexity] ?? 5; // Default to medium if unknown
  }
  private generateRecommendations(classification: EnhancedSignalClassification): Recommendation[] {
    // Generate basic recommendations based on classification
    const recommendations: Recommendation[] = [];
    if (classification.urgency === 'urgent') {
      recommendations.push({
        type: 'action',
        priority: 'high',
        description: `Urgent signal ${classification.signalId} requires immediate processing`,
        reasoning: 'Immediate attention required',
        estimatedTime: 30,
        prerequisites: [],
      });
    }
    recommendations.push({
      type: 'analysis',
      priority: 'medium',
      description: `Review and validate the classification of signal ${classification.signalId}`,
      reasoning: 'Review signal classification',
      estimatedTime: 15,
      prerequisites: [],
    });
    return recommendations;
  }
}
// Supporting classes and interfaces
class ContentPrioritizer {
  async prioritize(sections: ContentAnalysis['sections']): Promise<ContentAnalysis['sections']> {
    // Simple prioritization - real implementation would be more sophisticated
    return sections.sort((a, b) => a.priority - b.priority);
  }
}
class TokenOptimizer {
  optimize(
    prioritizedContent: PrioritizedContent[],
    options: Record<string, unknown>,
  ): TokenAllocation {
    // Simple optimization - real implementation would use advanced algorithms
    const totalBudget =
      (options.totalBudget as number) * (1 - ((options.reserveForCompression as number) || 0.1));
    const allocations = prioritizedContent.map((pc) => ({
      sectionId: pc.section.id,
      allocatedTokens: Math.min(
        pc.targetTokens,
        Math.floor(totalBudget / prioritizedContent.length),
      ),
    }));
    return {
      totalBudget,
      allocatedTokens: allocations.reduce((sum, a) => sum + a.allocatedTokens, 0),
      allocations,
      sections: prioritizedContent,
    };
  }
}
class SemanticCompressor {
  async compress(content: unknown): Promise<unknown> {
    // Simple compression - real implementation would use semantic analysis
    if (Array.isArray(content)) {
      return content.slice(0, Math.max(1, Math.floor(content.length * 0.7)));
    }
    if (typeof content === 'object' && content !== null) {
      const keys = Object.keys(content);
      const result: Record<string, unknown> = {};
      for (const key of keys.slice(0, Math.max(1, Math.floor(keys.length * 0.8)))) {
        result[key] = (content as Record<string, unknown>)[key];
      }
      return result;
    }
    return content;
  }
}
interface PrioritizedContent {
  section: ContentAnalysis['sections'][0];
  adjustedPriority: number;
  targetTokens: number;
}
interface TokenAllocation {
  totalBudget: number;
  allocatedTokens: number;
  allocations: Array<{
    sectionId: string;
    allocatedTokens: number;
  }>;
  sections: PrioritizedContent[];
}
interface OptimizedInspectorPayload extends InspectorPayload {
  targetSize: number;
  compressionApplied: boolean;
  compressionLevel: string;
  estimatedTokens: number;
  sections: PayloadSection[];
  optimization: {
    sectionsConsidered: number;
    sectionsIncluded: number;
    averageCompressionRatio: number;
    tokenEfficiency: number;
    criticalSectionsPreserved: number;
  };
  metadata: {
    generatorVersion: string;
    processingTime: number;
    confidence: number;
    complexity: number;
    agentOptimized: string;
    fallback?: boolean;
  };
}
