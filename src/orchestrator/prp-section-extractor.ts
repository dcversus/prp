/**
 * ♫ PRP Section Extractor for @dcversus/prp Orchestrator
 *
 * Extracts specific sections from PRP files with intelligent parsing,
 * signal relevance matching, and context optimization.
 */

import {
  PRPSectionType,
  EnhancedContextSection,
  ParsedPRP,
  SignalEntry
} from './types';
import { PRPFile, Signal } from '../shared/types';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('orchestrator');

/**
 * PRP Section Extractor - Parses and extracts specific sections from PRP files
 */
export class PRPSectionExtractor {
  private sectionPatterns!: Map<PRPSectionType, RegExp>;
  private signalPattern!: RegExp;

  constructor() {
    this.initializePatterns();
  }

  /**
   * Extract a specific section from a PRP file
   */
  async extractSection(prp: PRPFile, sectionType: PRPSectionType): Promise<EnhancedContextSection> {
    logger.debug('extractSection', `Extracting ${sectionType} from ${prp.name}`);

    try {
      const parsed = await this.parsePRPStructure(prp.content || '');
      const sectionContent = parsed.sections.get(sectionType) || '';

      if (!sectionContent.trim()) {
        logger.warn('extractSection', `Section ${sectionType} not found in ${prp.name}`);
        throw new Error(`Section ${sectionType} not found in PRP ${prp.name}`);
      }

      const section: EnhancedContextSection = {
        id: this.generateSectionId(prp.name, sectionType),
        name: `${prp.name}_${sectionType}`,
        content: sectionContent,
        tokens: this.estimateTokens(sectionContent),
        priority: this.getSectionPriority(sectionType),
        required: this.isSectionRequired(sectionType),
        compressible: this.isSectionCompressible(sectionType),
        lastUpdated: prp.lastModified,
        source: prp.name,
        version: 1,
        tags: this.generateSectionTags(prp, sectionType),
        permissions: this.generateSectionPermissions(sectionType),
        dependencies: this.generateSectionDependencies(sectionType),
        lastAccessed: new Date(),
        accessCount: 0
      };

      logger.debug('extractSection', `Section extracted successfully`, {
        prp: prp.name,
        section: sectionType,
        tokens: section.tokens,
        priority: section.priority
      });

      return section;

    } catch (error) {
      logger.error('extractSection', `Failed to extract section ${sectionType} from ${prp.name}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Parse the complete structure of a PRP file
   */
  async parsePRPStructure(content: string): Promise<ParsedPRP> {
    logger.debug('parsePRPStructure', 'Parsing PRP structure');

    try {
      const sections = new Map<PRPSectionType, string>();
      let totalTokens = 0;

      // Extract each section type
      for (const sectionType of Object.values(PRPSectionType)) {
        const pattern = this.sectionPatterns.get(sectionType);
        if (pattern) {
          const match = content.match(pattern);
          if (match?.[1]) {
            sections.set(sectionType, match[1].trim());
            totalTokens += this.estimateTokens(match[1]);
          }
        }
      }

      const parsed: ParsedPRP = {
        id: this.generatePRPId(content),
        sections,
        metadata: {
          parsedAt: new Date(),
          sectionCount: sections.size,
          totalTokens
        }
      };

      logger.debug('parsePRPStructure', `PRP structure parsed`, {
        sections: parsed.metadata.sectionCount,
        totalTokens: parsed.metadata.totalTokens
      });

      return parsed;

    } catch (error) {
      logger.error('parsePRPStructure', 'Failed to parse PRP structure',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Extract signal history from a PRP file
   */
  async extractSignalHistory(prp: PRPFile): Promise<SignalEntry[]> {
    logger.debug('extractSignalHistory', `Extracting signal history from ${prp.name}`);

    try {
      const signalEntries: SignalEntry[] = [];
      const progressSection = await this.extractSection(prp, PRPSectionType.PROGRESS);
      const progressLines = progressSection.content.split('\n');

      for (const line of progressLines) {
        const signalMatch = line.match(this.signalPattern);
        if (signalMatch) {
            const signalType = signalMatch[1];
          const timestamp = signalMatch[2];
          const comment = signalMatch[3];
          const agent = signalMatch[4];

          if (!signalType || !timestamp || !comment || !agent) {
            continue; // Skip invalid signal entries
          }

          // Create a basic signal object
          const signal: Signal = {
            id: this.generateSignalId(),
            type: signalType as any, // Type assertion for simplicity
            priority: 5, // Default priority
            source: prp.name,
            timestamp: new Date(timestamp),
            data: {
              comment: comment.trim(),
              agent: agent.trim()
            },
            metadata: {
              agent: agent.trim(),
              guideline: prp.name
            }
          };

          signalEntries.push({
            signal,
            timestamp: signal.timestamp,
            context: comment.trim(),
            agent: agent?.trim()
          });
        }
      }

      logger.debug('extractSignalHistory', `Extracted ${signalEntries.length} signal entries`);

      return signalEntries;

    } catch (error) {
      logger.error('extractSignalHistory', `Failed to extract signal history from ${prp.name}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Extract sections relevant to a specific signal
   */
  async extractRelevantSections(prp: PRPFile, signal: Signal): Promise<EnhancedContextSection[]> {
    logger.debug('extractRelevantSections', `Extracting relevant sections from ${prp.name} for signal ${signal.type}`);

    try {
      const relevantSections: EnhancedContextSection[] = [];
      const parsed = await this.parsePRPStructure(prp.content || '');

      // Calculate relevance scores for each section
      const sectionScores: Array<{ type: PRPSectionType; score: number }> = [];

      for (const [sectionType, content] of parsed.sections) {
        const score = this.calculateRelevanceScore(sectionType, content, signal);
        sectionScores.push({ type: sectionType, score });
      }

      // Sort by relevance score (descending)
      sectionScores.sort((a, b) => b.score - a.score);

      // Extract top relevant sections
      for (const { type, score } of sectionScores) {
        if (score > 0) { // Only include sections with positive relevance
          try {
            const section = await this.extractSection(prp, type);
            section.relevanceScore = score;
            relevantSections.push(section);
          } catch (error) {
            logger.warn('extractRelevantSections', `Failed to extract section ${type} from ${prp.name}`);
          }
        }
      }

      logger.debug('extractRelevantSections', `Extracted ${relevantSections.length} relevant sections`, {
        signalType: signal.type,
        sections: relevantSections.map(s => s.name)
      });

      return relevantSections;

    } catch (error) {
      logger.error('extractRelevantSections', `Failed to extract relevant sections from ${prp.name}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Extract all available sections from a PRP
   */
  async extractAllSections(prp: PRPFile): Promise<EnhancedContextSection[]> {
    logger.debug('extractAllSections', `Extracting all sections from ${prp.name}`);

    try {
      const allSections: EnhancedContextSection[] = [];
      const parsed = await this.parsePRPStructure(prp.content || '');

      for (const sectionType of parsed.sections.keys()) {
        try {
          const section = await this.extractSection(prp, sectionType);
          allSections.push(section);
        } catch (error) {
          logger.warn('extractAllSections', `Failed to extract section ${sectionType} from ${prp.name}`);
        }
      }

      logger.debug('extractAllSections', `Extracted ${allSections.length} sections from ${prp.name}`);

      return allSections;

    } catch (error) {
      logger.error('extractAllSections', `Failed to extract sections from ${prp.name}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  // Private methods

  private initializePatterns(): void {
    // Initialize section patterns for extracting different PRP sections
    this.sectionPatterns = new Map([
      [PRPSectionType.GOAL, /> our goal of user quote with all user req: all prp always should be aligned with all req:\s*\n([^#]+)/],
      [PRPSectionType.PROGRESS, /## progress\s*\n([^#]+)/],
      [PRPSectionType.PLAN, /## plan\s*\n([^#]+)/],
      [PRPSectionType.DOR, /## dor\s*\n([^#]+)/],
      [PRPSectionType.DOD, /## dod\s*\n([^#]+)/],
      [PRPSectionType.SIGNALS, /## signals?\s*\n([^#]+)/i],
      [PRPSectionType.RESEARCH, /## research\s*\n([^#]+)/i],
      [PRPSectionType.IMPLEMENTATION, /## implementation\s*\n([^#]+)/i]
    ]);

    // Pattern for extracting signal entries from progress log
    this.signalPattern = /\[([^\]]+)\]\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)\s*([^|]+)\|\s*([^|]+)\|\s*(.+)/;
  }

  private calculateRelevanceScore(sectionType: PRPSectionType, content: string, signal: Signal): number {
    let score = 0;

    // Base relevance scores by section type
    const baseScores: Record<PRPSectionType, number> = {
      [PRPSectionType.GOAL]: 8,
      [PRPSectionType.PROGRESS]: 7,
      [PRPSectionType.PLAN]: 6,
      [PRPSectionType.DOR]: 5,
      [PRPSectionType.DOD]: 5,
      [PRPSectionType.SIGNALS]: 9,
      [PRPSectionType.RESEARCH]: 4,
      [PRPSectionType.IMPLEMENTATION]: 6
    };

    score += baseScores[sectionType] || 0;

    // Content-based relevance
    const contentLower = content.toLowerCase();
    const signalTypeLower = signal.type.toLowerCase();

    // Direct signal type matches
    if (contentLower.includes(signalTypeLower)) {
      score += 10;
    }

    // Signal data relevance
    if (signal.data && typeof signal.data === 'object') {
      const dataString = JSON.stringify(signal.data).toLowerCase();
      const words = dataString.split(/\s+/);

      for (const word of words) {
        if (word.length > 3 && contentLower.includes(word)) {
          score += 2;
        }
      }
    }

    // Section-specific relevance logic
    switch (sectionType) {
      case PRPSectionType.PROGRESS:
        if (contentLower.includes(signalTypeLower)) {
          score += 5;
        }
        break;
      case PRPSectionType.PLAN:
        if (signalTypeLower.includes('implement') || signalTypeLower.includes('develop')) {
          score += 5;
        }
        break;
      case PRPSectionType.SIGNALS:
        score += 15; // Always highly relevant for signal processing
        break;
    }

    return score;
  }

  private getSectionPriority(sectionType: PRPSectionType): number {
    const priorities: Record<PRPSectionType, number> = {
      [PRPSectionType.GOAL]: 10,
      [PRPSectionType.PROGRESS]: 8,
      [PRPSectionType.PLAN]: 7,
      [PRPSectionType.DOR]: 6,
      [PRPSectionType.DOD]: 6,
      [PRPSectionType.SIGNALS]: 9,
      [PRPSectionType.RESEARCH]: 5,
      [PRPSectionType.IMPLEMENTATION]: 7
    };

    return priorities[sectionType] || 5;
  }

  private isSectionRequired(sectionType: PRPSectionType): boolean {
    const required: Record<PRPSectionType, boolean> = {
      [PRPSectionType.GOAL]: true,
      [PRPSectionType.PROGRESS]: false,
      [PRPSectionType.PLAN]: false,
      [PRPSectionType.DOR]: false,
      [PRPSectionType.DOD]: false,
      [PRPSectionType.SIGNALS]: false,
      [PRPSectionType.RESEARCH]: false,
      [PRPSectionType.IMPLEMENTATION]: false
    };

    return required[sectionType] || false;
  }

  private isSectionCompressible(sectionType: PRPSectionType): boolean {
    const compressible: Record<PRPSectionType, boolean> = {
      [PRPSectionType.GOAL]: false,
      [PRPSectionType.PROGRESS]: true,
      [PRPSectionType.PLAN]: true,
      [PRPSectionType.DOR]: true,
      [PRPSectionType.DOD]: true,
      [PRPSectionType.SIGNALS]: true,
      [PRPSectionType.RESEARCH]: true,
      [PRPSectionType.IMPLEMENTATION]: true
    };

    return compressible[sectionType] || true;
  }

  private generateSectionTags(prp: PRPFile, sectionType: PRPSectionType): string[] {
    const tags = [`prp:${prp.name}`, `section:${sectionType}`];

    // Add additional tags based on content
    if (prp.name.includes('bootstrap')) {
      tags.push('category:setup');
    } else if (prp.name.includes('deploy')) {
      tags.push('category:deployment');
    } else if (prp.name.includes('test')) {
      tags.push('category:testing');
    }

    return tags;
  }

  private generateSectionPermissions(sectionType: PRPSectionType): string[] {
    const basePermissions = ['read', 'context'];

    switch (sectionType) {
      case PRPSectionType.GOAL:
        return [...basePermissions, 'goal_access'];
      case PRPSectionType.PROGRESS:
        return [...basePermissions, 'progress_access'];
      case PRPSectionType.PLAN:
        return [...basePermissions, 'plan_access'];
      default:
        return basePermissions;
    }
  }

  private generateSectionDependencies(sectionType: PRPSectionType): string[] {
    const dependencies: string[] = [];

    // Some sections depend on others
    switch (sectionType) {
      case PRPSectionType.PROGRESS:
        dependencies.push('goal');
        break;
      case PRPSectionType.PLAN:
        dependencies.push('goal', 'dor');
        break;
      case PRPSectionType.DOD:
        dependencies.push('goal', 'plan');
        break;
    }

    return dependencies;
  }

  private generateSectionId(prpName: string, sectionType: PRPSectionType): string {
    const timestamp = Date.now();
    return `${prpName}_${sectionType}_${timestamp}`;
  }

  private generatePRPId(content: string): string {
    // Generate a hash-based ID from content
    const hash = this.simpleHash(content.substring(0, 200));
    return `prp_${hash}`;
  }

  private generateSignalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `signal_${timestamp}_${random}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}