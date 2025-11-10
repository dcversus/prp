/**
 * ♫ Signal Pattern Database for @dcversus/prp Inspector
 *
 * Simple implementation of signal pattern database for classification.
 */

import { Signal } from '../shared/types';
import { SignalFeatures } from './enhanced-signal-classifier';

/**
 * Interface for signal pattern definition
 */
export interface SignalPattern {
  signalType: string;
  keywords: string[];
  category: string;
  subcategory: string;
  agentRole: string;
  priority: number;
  confidence: number;
  context: string[];
  examples: string[];
}

/**
 * Basic Signal Pattern Database implementation
 */
export class SignalPatternDatabase {
  private patterns: Map<string, SignalPattern> = new Map();

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize basic signal patterns
   */
  private initializePatterns(): void {
    // Common development patterns
    this.patterns.set('dp-development-progress', {
      signalType: 'dp',
      keywords: ['progress', 'completed', 'implemented', 'finished'],
      category: 'development',
      subcategory: 'progress',
      agentRole: 'robo-developer',
      priority: 5,
      confidence: 0.85,
      context: ['development', 'implementation'],
      examples: ['Development progress completed successfully']
    });

    // Quality assurance patterns
    this.patterns.set('tg-tests-green', {
      signalType: 'tg',
      keywords: ['passing', 'green', 'success', 'completed'],
      category: 'quality',
      subcategory: 'testing',
      agentRole: 'robo-aqa',
      priority: 7,
      confidence: 0.9,
      context: ['testing', 'quality'],
      examples: ['All tests are green']
    });

    // Blocker patterns
    this.patterns.set('bb-blocker', {
      signalType: 'bb',
      keywords: ['blocked', 'stuck', 'blocked', 'blocked'],
      category: 'coordination',
      subcategory: 'blocker',
      agentRole: 'conductor',
      priority: 9,
      confidence: 0.95,
      context: ['coordination', 'blocking'],
      examples: ['Development is blocked by dependency']
    });

    // Bug fix patterns
    this.patterns.set('bf-bug-fixed', {
      signalType: 'bf',
      keywords: ['fixed', 'resolved', 'corrected', 'patched'],
      category: 'development',
      subcategory: 'bug-fix',
      agentRole: 'robo-developer',
      priority: 6,
      confidence: 0.88,
      context: ['development', 'bug-fix'],
      examples: ['Bug has been fixed and tested']
    });

    // Merge patterns
    this.patterns.set('mg-merged', {
      signalType: 'mg',
      keywords: ['merged', 'integrated', 'combined'],
      category: 'coordination',
      subcategory: 'merge',
      agentRole: 'robo-devops-sre',
      priority: 8,
      confidence: 0.92,
      context: ['coordination', 'merge'],
      examples: ['Code has been merged to main branch']
    });
  }

  /**
   * Find similar patterns for a signal
   */
  async findSimilarPatterns(signal: Signal, features: SignalFeatures): Promise<{pattern: string, match: SignalPattern, confidence: number}[]> {
    const patterns: {pattern: string, match: SignalPattern, confidence: number}[] = [];

    // Find matching patterns based on signal type
    const typePattern = Array.from(this.patterns.entries()).find(([key, pattern]) =>
      key.startsWith(signal.type) || pattern.signalType === signal.type
    );

    if (typePattern) {
      patterns.push({
        pattern: typePattern[0],
        match: typePattern[1],
        confidence: typePattern[1].confidence
      });
    }

    // Add linguistic matches
    for (const keyword of features.linguistic.keywords) {
      const keywordPattern = Array.from(this.patterns.entries()).find(([, pattern]) =>
        pattern.keywords.includes(keyword.toLowerCase())
      );

      if (keywordPattern && !patterns.find(p => p.pattern === keywordPattern[0])) {
        patterns.push({
          pattern: keywordPattern[0],
          match: keywordPattern[1],
          confidence: keywordPattern[1].confidence * 0.8 // Slightly lower confidence for keyword matches
        });
      }
    }

    return patterns.slice(0, 5); // Return top 5 matches
  }

  /**
   * Add a new pattern to the database
   */
  addPattern(key: string, pattern: SignalPattern): void {
    this.patterns.set(key, pattern);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): Map<string, SignalPattern> {
    return new Map(this.patterns);
  }
}