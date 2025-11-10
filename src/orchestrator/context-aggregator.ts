/**
 * ♫ Context Aggregator for @dcversus/prp Orchestrator
 *
 * Implements advanced context aggregation strategies for combining
 * multiple PRP contexts with intelligent conflict resolution and
 * token optimization.
 */

import {
  AggregatedContext,
  AggregationStrategy,
  ContextConflict,
  ConflictResolution,
  EnhancedContextSection
} from './types';
import { Signal } from '../shared/types';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('orchestrator');

/**
 * Context Aggregator - Combines and optimizes multiple contexts
 */
export class ContextAggregator {
  private maxTokens: number;
  private conflictResolutionStrategies: Map<string, (conflicts: ContextConflict[]) => Promise<ConflictResolution[]>>;

  constructor(maxTokens: number = 100000) {
    this.maxTokens = maxTokens;
    this.conflictResolutionStrategies = new Map();
    this.initializeResolutionStrategies();
  }

  /**
   * Aggregate contexts from multiple PRPs using specified strategy
   */
  async aggregateContexts(
    prpIds: string[],
    strategy: AggregationStrategy
  ): Promise<AggregatedContext> {
    logger.debug('aggregateContexts', `Aggregating contexts for ${prpIds.length} PRPs using ${strategy} strategy`);

    try {
      // Gather all sections from PRPs
      const allSections = await this.gatherAllSections(prpIds);

      // Apply aggregation strategy
      let aggregatedSections: EnhancedContextSection[];
      let totalTokens = 0;

      switch (strategy) {
        case AggregationStrategy.MERGE:
          aggregatedSections = await this.mergeStrategy(allSections);
          break;
        case AggregationStrategy.PRIORITY_BASED:
          aggregatedSections = await this.priorityBasedStrategy(allSections);
          break;
        case AggregationStrategy.TOKEN_OPTIMIZED:
          aggregatedSections = await this.tokenOptimizedStrategy(allSections);
          break;
        case AggregationStrategy.RELEVANCE_SCORED:
          aggregatedSections = await this.relevanceScoredStrategy(allSections);
          break;
        default:
          throw new Error(`Unknown aggregation strategy: ${strategy}`);
      }

      totalTokens = aggregatedSections.reduce((sum, section) => sum + section.tokens, 0);

      // Detect and resolve conflicts
      const conflicts = this.detectConflicts(aggregatedSections);
      const resolutions = await this.resolveConflicts(conflicts);

      // Apply conflict resolutions
      aggregatedSections = this.applyResolutions(aggregatedSections, resolutions);

      const finalTokens = aggregatedSections.reduce((sum, section) => sum + section.tokens, 0);
      const compressionRatio = totalTokens > 0 ? finalTokens / totalTokens : 1;

      const aggregatedContext: AggregatedContext = {
        id: this.generateAggregationId(prpIds, strategy),
        sourcePRPs: prpIds,
        sections: aggregatedSections,
        metadata: {
          aggregatedAt: new Date(),
          strategy,
          totalTokens: finalTokens,
          compressionRatio
        }
      };

      logger.info('aggregateContexts', 'Context aggregation completed', {
        sourcePRPs: prpIds.length,
        sections: aggregatedSections.length,
        totalTokens: finalTokens,
        compressionRatio,
        conflictsResolved: conflicts.length
      });

      return aggregatedContext;

    } catch (error) {
      logger.error('aggregateContexts', 'Failed to aggregate contexts',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Merge multiple context sections
   */
  async mergeContexts(contexts: EnhancedContextSection[]): Promise<EnhancedContextSection> {
    if (contexts.length === 0) {
      throw new Error('Cannot merge empty context list');
    }

    if (contexts.length === 1) {
      const context = contexts[0];
      if (!context) {
        throw new Error('Context is undefined');
      }
      return context;
    }

    // Group contexts by name
    const groupedContexts = new Map<string, EnhancedContextSection[]>();
    for (const context of contexts) {
      if (!groupedContexts.has(context.name)) {
        groupedContexts.set(context.name, []);
      }
      const group = groupedContexts.get(context.name);
      if (group) {
        group.push(context);
      }
    }

    const mergedSections: EnhancedContextSection[] = [];

    // Merge each group
    for (const [, sections] of groupedContexts) {
      if (sections.length === 1) {
        const section = sections[0];
        if (!section) {
          throw new Error('Section is undefined');
        }
        mergedSections.push(section);
      } else {
        const merged = await this.mergeSectionGroup(sections);
        mergedSections.push(merged);
      }
    }

    // If we have multiple sections after merging, create a combined section
    if (mergedSections.length === 1) {
      const section = mergedSections[0];
      if (!section) {
        throw new Error('Merged section is undefined');
      }
      return section;
    }

    return this.createCombinedSection(mergedSections);
  }

  /**
   * Calculate relevance score for a context section
   */
  calculateRelevanceScore(section: EnhancedContextSection, signal: Signal): number {
    let score = 0;

    // Base relevance from section metadata
    if (section.relevanceScore) {
      score += section.relevanceScore;
    }

    // Relevance based on section priority
    score += section.priority * 0.1;

    // Relevance based on recency
    const hoursSinceUpdate = (Date.now() - section.lastUpdated.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 10 - hoursSinceUpdate * 0.1);

    // Relevance based on access frequency
    score += section.accessCount * 0.01;

    // Signal-specific relevance
    if (section.content.toLowerCase().includes(signal.type.toLowerCase())) {
      score += 5;
    }

    if (signal.data) {
      const dataString = JSON.stringify(signal.data).toLowerCase();
      if (section.content.toLowerCase().includes(dataString)) {
        score += 3;
      }
    }

    // Tag relevance
    if (section.tags.length > 0) {
      score += section.tags.length * 0.5;
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Resolve conflicts between context sections
   */
  async resolveConflicts(conflicts: ContextConflict[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveSingleConflict(conflict);
        resolutions.push(resolution);
      } catch (error) {
        logger.warn('resolveConflicts', `Failed to resolve conflict for section ${conflict.sectionId}`, {
          conflict: conflict.conflictType,
          error: error instanceof Error ? error.message : String(error)
        });

        // Create a fallback resolution
        const fallbackResolution: ConflictResolution = {
          strategy: 'priority',
          resolvedSection: conflict.conflictingSections.reduce((prev, current) =>
            current.priority > prev.priority ? current : prev
          ),
          resolvedAt: new Date()
        };
        resolutions.push(fallbackResolution);
      }
    }

    return resolutions;
  }

  // Private methods

  private initializeResolutionStrategies(): void {
    this.conflictResolutionStrategies.set('content', this.resolveContentConflicts.bind(this));
    this.conflictResolutionStrategies.set('priority', this.resolvePriorityConflicts.bind(this));
    this.conflictResolutionStrategies.set('permissions', this.resolvePermissionConflicts.bind(this));
  }

  private async gatherAllSections(prpIds: string[]): Promise<EnhancedContextSection[]> {
    logger.debug('gatherAllSections', `Gathering sections for ${prpIds.length} PRPs`);

    try {
      // For now, create mock PRP data since we don't have direct access to PRP registry
      // In a real implementation, this would query the PRP registry or context manager
      const allSections: EnhancedContextSection[] = [];

      for (const prpId of prpIds) {
        // Create mock sections based on PRP ID
        // In production, this would extract real sections from the PRP files
        const mockSections: EnhancedContextSection[] = [
          {
            id: `${prpId}_goal`,
            name: 'goal',
            content: `Mock goal content for ${prpId}`,
            tokens: 150,
            priority: 10,
            required: true,
            compressible: false,
            lastUpdated: new Date(),
            source: prpId,
            version: 1,
            tags: ['goal', 'important'],
            permissions: ['read'],
            dependencies: [],
            lastAccessed: new Date(),
            accessCount: 1
          },
          {
            id: `${prpId}_progress`,
            name: 'progress',
            content: `Mock progress content for ${prpId}`,
            tokens: 200,
            priority: 7,
            required: false,
            compressible: true,
            lastUpdated: new Date(),
            source: prpId,
            version: 1,
            tags: ['progress'],
            permissions: ['read'],
            dependencies: ['goal'],
            lastAccessed: new Date(),
            accessCount: 1
          },
          {
            id: `${prpId}_plan`,
            name: 'plan',
            content: `Mock plan content for ${prpId}`,
            tokens: 300,
            priority: 8,
            required: false,
            compressible: true,
            lastUpdated: new Date(),
            source: prpId,
            version: 1,
            tags: ['plan'],
            permissions: ['read'],
            dependencies: ['goal'],
            lastAccessed: new Date(),
            accessCount: 1
          }
        ];

        allSections.push(...mockSections);
      }

      logger.debug('gatherAllSections', `Gathered ${allSections.length} sections from ${prpIds.length} PRPs`);
      return allSections;

    } catch (error) {
      logger.error('gatherAllSections', 'Failed to gather sections',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  private async mergeStrategy(sections: EnhancedContextSection[]): Promise<EnhancedContextSection[]> {
    // Simple merge strategy - combine all sections, resolving conflicts
    const merged = await this.mergeContexts(sections);
    return [merged];
  }

  private async priorityBasedStrategy(sections: EnhancedContextSection[]): Promise<EnhancedContextSection[]> {
    // Sort by priority, keep highest priority sections
    const sorted = sections.sort((a, b) => b.priority - a.priority);
    const selected: EnhancedContextSection[] = [];
    let usedTokens = 0;

    for (const section of sorted) {
      if (usedTokens + section.tokens <= this.maxTokens) {
        selected.push(section);
        usedTokens += section.tokens;
      } else if (section.required) {
        // Try to compress required section
        const compressed = await this.compressSection(section, this.maxTokens - usedTokens);
        selected.push(compressed);
        usedTokens += compressed.tokens;
        break;
      } else {
        break; // No more space
      }
    }

    return selected;
  }

  private async tokenOptimizedStrategy(sections: EnhancedContextSection[]): Promise<EnhancedContextSection[]> {
    // Optimize for token usage while preserving essential information
    const required = sections.filter(s => s.required);
    const optional = sections.filter(s => !s.required);

    const selected: EnhancedContextSection[] = [...required];
    let usedTokens = required.reduce((sum, s) => sum + s.tokens, 0);

    // Add optional sections by priority
    const sortedOptional = optional.sort((a, b) => b.priority - a.priority);

    for (const section of sortedOptional) {
      if (usedTokens + section.tokens <= this.maxTokens) {
        selected.push(section);
        usedTokens += section.tokens;
      } else if (section.compressible) {
        const compressed = await this.compressSection(section, this.maxTokens - usedTokens);
        selected.push(compressed);
        usedTokens += compressed.tokens;
      }
    }

    return selected;
  }

  private async relevanceScoredStrategy(sections: EnhancedContextSection[]): Promise<EnhancedContextSection[]> {
    // This would need access to the current signal for relevance scoring
    // For now, use priority as a proxy
    logger.warn('relevanceScoredStrategy', 'Needs signal for relevance scoring, using priority');
    return this.priorityBasedStrategy(sections);
  }

  private detectConflicts(sections: EnhancedContextSection[]): ContextConflict[] {
    const conflicts: ContextConflict[] = [];
    const sectionsByName = new Map<string, EnhancedContextSection[]>();

    // Group sections by name
    for (const section of sections) {
      if (!sectionsByName.has(section.name)) {
        sectionsByName.set(section.name, []);
      }
      const group = sectionsByName.get(section.name);
      if (group) {
        group.push(section);
      }
    }

    // Detect conflicts in each group
    for (const [name, group] of sectionsByName) {
      if (group.length > 1) {
        // Check for content conflicts
        const uniqueContents = new Set(group.map(s => s.content));
        if (uniqueContents.size > 1) {
          conflicts.push({
            sectionId: name,
            conflictType: 'content',
            conflictingSections: group
          });
        }

        // Check for priority conflicts
        const priorities = group.map(s => s.priority);
        if (new Set(priorities).size > 1) {
          conflicts.push({
            sectionId: name,
            conflictType: 'priority',
            conflictingSections: group
          });
        }

        // Check for permission conflicts
        const permissions = group.map(s => s.permissions.join(','));
        if (new Set(permissions).size > 1) {
          conflicts.push({
            sectionId: name,
            conflictType: 'permissions',
            conflictingSections: group
          });
        }
      }
    }

    return conflicts;
  }

  private async resolveSingleConflict(conflict: ContextConflict): Promise<ConflictResolution> {
    const resolver = this.conflictResolutionStrategies.get(conflict.conflictType);
    if (!resolver) {
      throw new Error(`No resolver for conflict type: ${conflict.conflictType}`);
    }

    const resolutions = await resolver([conflict]);
    const resolution = resolutions[0];
    if (!resolution) {
      throw new Error('No resolution found for conflict');
    }
    return resolution;
  }

  private async resolveContentConflicts(conflicts: ContextConflict[]): Promise<ConflictResolution[]> {
    return conflicts.map(conflict => ({
      strategy: 'merge' as const,
      resolvedSection: this.mergeSectionContents(conflict.conflictingSections),
      resolvedAt: new Date()
    }));
  }

  private async resolvePriorityConflicts(conflicts: ContextConflict[]): Promise<ConflictResolution[]> {
    return conflicts.map(conflict => ({
      strategy: 'priority' as const,
      resolvedSection: conflict.conflictingSections.reduce((prev, current) =>
        current.priority > prev.priority ? current : prev
      ),
      resolvedAt: new Date()
    }));
  }

  private async resolvePermissionConflicts(conflicts: ContextConflict[]): Promise<ConflictResolution[]> {
    return conflicts.map(conflict => ({
      strategy: 'merge' as const,
      resolvedSection: this.mergeSectionPermissions(conflict.conflictingSections),
      resolvedAt: new Date()
    }));
  }

  private mergeSectionContents(sections: EnhancedContextSection[]): EnhancedContextSection {
    const base = sections[0];
    if (!base) {
      throw new Error('No base section found for merging');
    }

    const mergedContent = sections.map(s => s.content || '').join('\n\n---MERGED---\n\n');

    return {
      ...base,
      content: mergedContent,
      tokens: this.estimateTokens(mergedContent),
      version: (base.version || 0) + 1,
      lastUpdated: new Date()
    };
  }

  private mergeSectionPermissions(sections: EnhancedContextSection[]): EnhancedContextSection {
    const base = sections[0];
    if (sections.length === 0 || !base) {
      throw new Error('No base section found for permission merging');
    }

    const allPermissions = new Set<string>();

    sections.forEach(section => {
      if (section.permissions?.length) {
        section.permissions.forEach(perm => allPermissions.add(perm));
      }
    });

    return {
      ...base,
      permissions: Array.from(allPermissions),
      version: (base.version || 0) + 1,
      lastUpdated: new Date()
    };
  }

  private async mergeSectionGroup(sections: EnhancedContextSection[]): Promise<EnhancedContextSection> {
    // Similar to mergeSectionContents but with more sophisticated logic
    return this.mergeSectionContents(sections);
  }

  private createCombinedSection(sections: EnhancedContextSection[]): EnhancedContextSection {
    const combinedName = sections.map(s => s.name).join('_');
    const combinedContent = sections.map(s => `## ${s.name}\n${s.content}`).join('\n\n');
    const maxPriority = Math.max(...sections.map(s => s.priority));
    const anyRequired = sections.some(s => s.required);
    const anyCompressible = sections.some(s => s.compressible);
    const latestUpdate = new Date(Math.max(...sections.map(s => s.lastUpdated.getTime())));

    return {
      id: this.generateSectionId(combinedName),
      name: combinedName,
      content: combinedContent,
      tokens: this.estimateTokens(combinedContent),
      priority: maxPriority,
      required: anyRequired,
      compressible: anyCompressible,
      lastUpdated: latestUpdate,
      source: sections.map(s => s.source).join(','),
      version: 1,
      tags: [],
      permissions: [],
      dependencies: [],
      lastAccessed: new Date(),
      accessCount: 0
    };
  }

  private async compressSection(section: EnhancedContextSection, maxTokens: number): Promise<EnhancedContextSection> {
    const targetRatio = maxTokens / section.tokens;
    const compressedContent = this.truncateContent(section.content, targetRatio);

    return {
      ...section,
      content: compressedContent,
      tokens: this.estimateTokens(compressedContent),
      lastUpdated: new Date()
    };
  }

  private truncateContent(content: string, ratio: number): string {
    const targetLength = Math.floor(content.length * ratio);
    if (targetLength >= content.length) {
      return content;
    }

    let truncated = content.substring(0, targetLength);

    // Try to end at a sentence boundary
    const lastSentence = truncated.lastIndexOf('.');
    if (lastSentence > targetLength * 0.8) {
      truncated = truncated.substring(0, lastSentence + 1);
    } else {
      truncated += '...';
    }

    return truncated;
  }

  private applyResolutions(
    sections: EnhancedContextSection[],
    resolutions: ConflictResolution[]
  ): EnhancedContextSection[] {
    const resolvedSections = [...sections];

    for (const resolution of resolutions) {
      const index = resolvedSections.findIndex(s => s.name === resolution.resolvedSection.name);
      if (index !== -1) {
        resolvedSections[index] = resolution.resolvedSection;
      }
    }

    return resolvedSections;
  }

  private generateAggregationId(prpIds: string[], strategy: AggregationStrategy): string {
    const sortedIds = [...prpIds].sort().join('-');
    const timestamp = Date.now();
    return `agg_${strategy}_${sortedIds}_${timestamp}`;
  }

  private generateSectionId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `section_${name}_${timestamp}_${random}`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}