/**
 * ♫ Enhanced Signal Detector with [XX] Pattern Parsing for @dcversus/prp Tuner
 *
 * Advanced signal detection with comprehensive [XX] pattern parsing,
 * intelligent duplicate removal, contextual analysis, and confidence scoring.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

import { EventBus } from '../shared/events';
import { createLayerLogger, TimeUtils, HashUtils } from '../shared';
import { DetectedSignal, SignalPattern } from './types';

const logger = createLayerLogger('scanner');

// Signal detection configuration
interface SignalDetectionConfig {
  enableDuplicateRemoval: boolean;
  duplicateWindowMs: number;
  enableContextualAnalysis: boolean;
  enableConfidenceScoring: boolean;
  enableCustomPatterns: boolean;
  maxSignalsPerDocument: number;
  minSignalConfidence: number;
}

// Signal match with context
interface SignalMatch {
  pattern: SignalPattern;
  match: RegExpMatchArray;
  lineNumber: number;
  columnNumber: number;
  context: {
    before: string;
    after: string;
    fullLine: string;
  };
  confidence: number;
  metadata: Record<string, unknown>;
}

// Signal duplicate entry
interface SignalDuplicate {
  hash: string;
  signalType: string;
  content: string;
  timestamp: Date;
  source: string;
  count: number;
}

// Signal analysis result
interface SignalAnalysisResult {
  signals: DetectedSignal[];
  duplicates: number;
  patterns: Array<{
    patternId: string;
    matches: number;
    confidence: number;
  }>;
  processingTime: number;
  metadata: {
    lineCount: number;
    signalDensity: number;
    averageConfidence: number;
  };
}

// AGENTS.md signal patterns database
const AGENTS_SIGNAL_PATTERNS: SignalPattern[] = [
  // Development signals
  {
    id: 'tests_prepared',
    name: 'tests_prepared',
    pattern: /\[tp\]/g,
    category: 'development',
    priority: 7,
    description: 'Tests prepared for implementation phase',
    enabled: true,
    custom: false
  },
  {
    id: 'development_progress',
    name: 'development_progress',
    pattern: /\[dp\]/g,
    category: 'development',
    priority: 6,
    description: 'Development progress milestone achieved',
    enabled: true,
    custom: false
  },
  {
    id: 'tests_written',
    name: 'tests_written',
    pattern: /\[tw\]/g,
    category: 'testing',
    priority: 6,
    description: 'Unit tests or integration tests written',
    enabled: true,
    custom: false
  },
  {
    id: 'bug_fixed',
    name: 'bug_fixed',
    pattern: /\[bf\]/g,
    category: 'development',
    priority: 8,
    description: 'Bug has been identified and resolved',
    enabled: true,
    custom: false
  },

  // Quality and review signals
  {
    id: 'code_quality',
    name: 'code_quality',
    pattern: /\[cq\]/g,
    category: 'quality',
    priority: 5,
    description: 'Code quality checks passed',
    enabled: true,
    custom: false
  },
  {
    id: 'cleanup_done',
    name: 'cleanup_done',
    pattern: /\[cd\]/g,
    category: 'maintenance',
    priority: 4,
    description: 'Code cleanup and polishing completed',
    enabled: true,
    custom: false
  },
  {
    id: 'cleanup_complete',
    name: 'cleanup_complete',
    pattern: /\[cc\]/g,
    category: 'maintenance',
    priority: 4,
    description: 'All cleanup tasks completed before commit',
    enabled: true,
    custom: false
  },

  // CI/CD and deployment signals
  {
    id: 'ci_passed',
    name: 'ci_passed',
    pattern: /\[cp\]/g,
    category: 'deployment',
    priority: 6,
    description: 'Continuous integration pipeline passed',
    enabled: true,
    custom: false
  },
  {
    id: 'ci_failed',
    name: 'ci_failed',
    pattern: /\[cf\]/g,
    category: 'deployment',
    priority: 8,
    description: 'Continuous integration pipeline failed',
    enabled: true,
    custom: false
  },
  {
    id: 'merged',
    name: 'merged',
    pattern: /\[mg\]/g,
    category: 'deployment',
    priority: 5,
    description: 'Code successfully merged to target branch',
    enabled: true,
    custom: false
  },
  {
    id: 'released',
    name: 'released',
    pattern: /\[rl\]/g,
    category: 'deployment',
    priority: 5,
    description: 'Changes deployed to production',
    enabled: true,
    custom: false
  },

  // Review and validation signals
  {
    id: 'tests_green',
    name: 'tests_green',
    pattern: /\[tg\]/g,
    category: 'testing',
    priority: 5,
    description: 'All tests passing',
    enabled: true,
    custom: false
  },
  {
    id: 'tests_red',
    name: 'tests_red',
    pattern: /\[tr\]/g,
    category: 'testing',
    priority: 7,
    description: 'Test failures detected',
    enabled: true,
    custom: false
  },
  {
    id: 'review_progress',
    name: 'review_progress',
    pattern: /\[rg\]/g,
    category: 'review',
    priority: 5,
    description: 'Code review in progress',
    enabled: true,
    custom: false
  },
  {
    id: 'review_passed',
    name: 'review_passed',
    pattern: /\[rv\]/g,
    category: 'review',
    priority: 5,
    description: 'Code review completed successfully',
    enabled: true,
    custom: false
  },

  // System and coordination signals
  {
    id: 'blocker',
    name: 'blocker',
    pattern: /\[bb\]/g,
    category: 'blocking',
    priority: 9,
    description: 'Blocker preventing progress',
    enabled: true,
    custom: false
  },
  {
    id: 'feedback_request',
    name: 'feedback_request',
    pattern: /\[af\]/g,
    category: 'collaboration',
    priority: 6,
    description: 'Feedback requested from team',
    enabled: true,
    custom: false
  },
  {
    id: 'orchestrator_attention',
    name: 'orchestrator_attention',
    pattern: /\[oa\]/g,
    category: 'coordination',
    priority: 7,
    description: 'Orchestrator attention required',
    enabled: true,
    custom: false
  },
  {
    id: 'admin_attention',
    name: 'admin_attention',
    pattern: /\[aa\]/g,
    category: 'coordination',
    priority: 8,
    description: 'Admin attention required',
    enabled: true,
    custom: false
  },

  // Analysis and planning signals
  {
    id: 'goal_clarification',
    name: 'goal_clarification',
    pattern: /\[gg\]/g,
    category: 'analysis',
    priority: 6,
    description: 'Goal clarification needed',
    enabled: true,
    custom: false
  },
  {
    id: 'research_request',
    name: 'research_request',
    pattern: /\[rr\]/g,
    category: 'analysis',
    priority: 5,
    description: 'Research investigation needed',
    enabled: true,
    custom: false
  },
  {
    id: 'validation_required',
    name: 'validation_required',
    pattern: /\[vr\]/g,
    category: 'analysis',
    priority: 6,
    description: 'External validation required',
    enabled: true,
    custom: false
  },
  {
    id: 'implementation_plan',
    name: 'implementation_plan',
    pattern: /\[ip\]/g,
    category: 'planning',
    priority: 5,
    description: 'Implementation plan ready',
    enabled: true,
    custom: false
  },

  // System integrity and incident signals
  {
    id: 'incident',
    name: 'incident',
    pattern: /\[ic\]/g,
    category: 'incident',
    priority: 10,
    description: 'Production incident detected',
    enabled: true,
    custom: false
  },
  {
    id: 'incident_resolved',
    name: 'incident_resolved',
    pattern: /\[JC\]/g,
    category: 'incident',
    priority: 8,
    description: 'Critical incident resolved',
    enabled: true,
    custom: false
  },
  {
    id: 'postmortem',
    name: 'postmortem',
    pattern: /\[pm\]/g,
    category: 'incident',
    priority: 6,
    description: 'Incident post-mortem analysis',
    enabled: true,
    custom: false
  },

  // Design and UX signals
  {
    id: 'design_update',
    name: 'design_update',
    pattern: /\[du\]/g,
    category: 'design',
    priority: 4,
    description: 'Design updates available',
    enabled: true,
    custom: false
  },
  {
    id: 'design_handoff_ready',
    name: 'design_handoff_ready',
    pattern: /\[dh\]/g,
    category: 'design',
    priority: 5,
    description: 'Design assets ready for development',
    enabled: true,
    custom: false
  },

  // DevOps/SRE signals
  {
    id: 'infrastructure_deployed',
    name: 'infrastructure_deployed',
    pattern: /\[id\]/g,
    category: 'infrastructure',
    priority: 5,
    description: 'Infrastructure changes deployed',
    enabled: true,
    custom: false
  },
  {
    id: 'monitoring_online',
    name: 'monitoring_online',
    pattern: /\[mo\]/g,
    category: 'infrastructure',
    priority: 4,
    description: 'Monitoring systems operational',
    enabled: true,
    custom: false
  }
];

/**
 * Enhanced Signal Detector with Pattern Parsing
 */
export class EnhancedSignalDetectorWithPatterns extends EventEmitter {
  private eventBus: EventBus;
  private config: SignalDetectionConfig;
  private patterns: Map<string, SignalPattern> = new Map();
  private duplicates: Map<string, SignalDuplicate> = new Map();
  private customPatterns: Map<string, SignalPattern> = new Map();

  // Performance metrics
  private metrics = {
    totalDetections: 0,
    totalDuplicates: 0,
    averageProcessingTime: 0,
    patternHitCounts: new Map<string, number>()
  };

  constructor(eventBus: EventBus, config: Partial<SignalDetectionConfig> = {}) {
    super();
    this.eventBus = eventBus;

    // Default configuration
    this.config = {
      enableDuplicateRemoval: true,
      duplicateWindowMs: 300000, // 5 minutes
      enableContextualAnalysis: true,
      enableConfidenceScoring: true,
      enableCustomPatterns: true,
      maxSignalsPerDocument: 50,
      minSignalConfidence: 0.3,
      ...config
    };

    // Initialize patterns
    this.initializePatterns();

    // Start cleanup timer
    this.startDuplicateCleanup();
  }

  /**
   * Detect signals in content with comprehensive pattern parsing
   */
  async detectSignals(content: string, source: string = 'unknown'): Promise<SignalAnalysisResult> {
    const startTime = Date.now();

    try {
      const lines = content.split('\n');
      const matches: SignalMatch[] = [];

      // Apply all patterns to content
      for (const [patternId, pattern] of this.patterns.entries()) {
        if (!pattern.enabled) {
          continue;
        }

        const patternMatches = this.applyPattern(content, pattern, lines);
        matches.push(...patternMatches);
      }

      // Analyze and convert matches to detected signals
      const signals = await this.analyzeMatches(matches, source, content);

      // Remove duplicates if enabled
      const uniqueSignals = this.config.enableDuplicateRemoval
        ? this.removeDuplicates(signals, source)
        : signals;

      // Limit signals if configured
      const limitedSignals = uniqueSignals.slice(0, this.config.maxSignalsPerDocument);

      // Calculate pattern statistics
      const patternStats = this.calculatePatternStats(matches);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(matches, uniqueSignals, processingTime);

      // Create analysis result
      const result: SignalAnalysisResult = {
        signals: limitedSignals,
        duplicates: signals.length - uniqueSignals.length,
        patterns: patternStats,
        processingTime,
        metadata: {
          lineCount: lines.length,
          signalDensity: lines.length > 0 ? limitedSignals.length / lines.length : 0,
          averageConfidence: this.calculateAverageConfidence(limitedSignals)
        }
      };

      // Emit detection event
      this.emit('signals:detected', {
        source,
        signals: limitedSignals,
        duplicatesRemoved: result.duplicates,
        processingTime,
        timestamp: TimeUtils.now()
      });

      // Publish to event bus
      this.eventBus.publishToChannel('scanner', {
        id: randomUUID(),
        type: 'signals_detected',
        timestamp: TimeUtils.now(),
        source: 'signal-detector',
        data: {
          source,
          signals: limitedSignals,
          analysis: result
        },
        metadata: {}
      });

      logger.debug('EnhancedSignalDetectorWithPatterns', 'Signals detected', {
        source,
        signalsFound: limitedSignals.length,
        duplicatesRemoved: result.duplicates,
        processingTime
      });

      return result;

    } catch (error) {
      logger.error('EnhancedSignalDetectorWithPatterns', 'Error detecting signals', error instanceof Error ? error : new Error(String(error)), {
        source
      });

      // Return empty result on error
      return {
        signals: [],
        duplicates: 0,
        patterns: [],
        processingTime: Date.now() - startTime,
        metadata: {
          lineCount: content.split('\n').length,
          signalDensity: 0,
          averageConfidence: 0
        }
      };
    }
  }

  /**
   * Add custom signal pattern
   */
  addCustomPattern(pattern: SignalPattern): void {
    if (!this.config.enableCustomPatterns) {
      logger.warn('EnhancedSignalDetectorWithPatterns', 'Custom patterns disabled');
      return;
    }

    pattern.custom = true;
    this.patterns.set(pattern.id, pattern);
    this.customPatterns.set(pattern.id, pattern);

    logger.info('EnhancedSignalDetectorWithPatterns', 'Custom pattern added', {
      patternId: pattern.id,
      name: pattern.name,
      category: pattern.category
    });

    this.emit('pattern:added', {
      pattern,
      timestamp: TimeUtils.now()
    });
  }

  /**
   * Remove custom pattern
   */
  removeCustomPattern(patternId: string): boolean {
    const pattern = this.customPatterns.get(patternId);
    if (!pattern) {
      return false;
    }

    this.patterns.delete(patternId);
    this.customPatterns.delete(patternId);

    logger.info('EnhancedSignalDetectorWithPatterns', 'Custom pattern removed', {
      patternId,
      name: pattern.name
    });

    this.emit('pattern:removed', {
      patternId,
      pattern,
      timestamp: TimeUtils.now()
    });

    return true;
  }

  /**
   * Get all patterns (built-in and custom)
   */
  getAllPatterns(): SignalPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get custom patterns only
   */
  getCustomPatterns(): SignalPattern[] {
    return Array.from(this.customPatterns.values());
  }

  /**
   * Get detection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      patternHitCounts: Object.fromEntries(this.metrics.patternHitCounts)
    };
  }

  /**
   * Enable/disable pattern
   */
  togglePattern(patternId: string, enabled: boolean): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      return false;
    }

    pattern.enabled = enabled;

    logger.debug('EnhancedSignalDetectorWithPatterns', 'Pattern toggled', {
      patternId,
      enabled
    });

    return true;
  }

  /**
   * Clear duplicate cache
   */
  clearDuplicateCache(): void {
    this.duplicates.clear();
    logger.debug('EnhancedSignalDetectorWithPatterns', 'Duplicate cache cleared');
  }

  // Private methods

  private initializePatterns(): void {
    // Load built-in patterns
    for (const pattern of AGENTS_SIGNAL_PATTERNS) {
      this.patterns.set(pattern.id, pattern);
    }

    logger.info('EnhancedSignalDetectorWithPatterns', 'Patterns initialized', {
      builtInCount: AGENTS_SIGNAL_PATTERNS.length,
      totalCount: this.patterns.size
    });
  }

  private applyPattern(content: string, pattern: SignalPattern, lines: string[]): SignalMatch[] {
    const matches: SignalMatch[] = [];
    let match;

    // Reset regex lastIndex
    if (pattern.pattern.global) {
      pattern.pattern.lastIndex = 0;
    }

    while ((match = pattern.pattern.exec(content)) !== null) {
      const lineNumber = this.findLineNumber(content, match.index);
      const context = this.extractContext(content, match.index, match[0]?.length ?? 0);

      const signalMatch: SignalMatch = {
        pattern,
        match,
        lineNumber,
        columnNumber: this.findColumnNumber(content, match.index),
        context,
        confidence: this.calculateMatchConfidence(pattern, match, context),
        metadata: this.extractMatchMetadata(match, pattern)
      };

      matches.push(signalMatch);

      // Update pattern hit count
      const currentCount = this.metrics.patternHitCounts.get(pattern.id) ?? 0;
      this.metrics.patternHitCounts.set(pattern.id, currentCount + 1);
    }

    return matches;
  }

  private findLineNumber(content: string, index: number): number {
    const beforeIndex = content.substring(0, index);
    return beforeIndex.split('\n').length;
  }

  private findColumnNumber(content: string, index: number): number {
    const beforeIndex = content.substring(0, index);
    const lastNewlineIndex = beforeIndex.lastIndexOf('\n');
    return index - lastNewlineIndex;
  }

  private extractContext(content: string, index: number, length: number): SignalMatch['context'] {
    const startIndex = Math.max(0, index - 100);
    const endIndex = Math.min(content.length, index + length + 100);

    const before = content.substring(startIndex, index);
    const after = content.substring(index + length, endIndex);

    // Find full line
    const lineStart = content.lastIndexOf('\n', index) + 1;
    const lineEnd = content.indexOf('\n', index + length);
    const fullLine = content.substring(
      lineStart,
      lineEnd === -1 ? content.length : lineEnd
    ).trim();

    return {
      before: before.trim(),
      after: after.trim(),
      fullLine
    };
  }

  private calculateMatchConfidence(
    pattern: SignalPattern,
    match: RegExpMatchArray,
    context: SignalMatch['context']
  ): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on pattern priority
    confidence += (pattern.priority / 10) * 0.3;

    // Adjust based on context quality
    if (context.fullLine.length > 10) {
      confidence += 0.1;
    }

    // Adjust based on position in document
    if (match.index && match.index < 1000) {
      confidence += 0.1; // Early in document
    }

    // Adjust based on surrounding content
    const contextText = `${context.before} ${context.after}`.toLowerCase();
    if (contextText.includes('progress') || contextText.includes('done') || contextText.includes('complete')) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  private extractMatchMetadata(match: RegExpMatchArray, pattern: SignalPattern): Record<string, unknown> {
    return {
      matchLength: match[0]?.length ?? 0,
      matchIndex: match.index,
      patternCategory: pattern.category,
      patternPriority: pattern.priority,
      groups: match.slice(1), // Capture groups
      hasCaptureGroups: match.length > 1
    };
  }

  private async analyzeMatches(matches: SignalMatch[], source: string, content: string): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];

    for (const match of matches) {
      // Skip low confidence matches
      if (match.confidence < this.config.minSignalConfidence) {
        continue;
      }

      const signal: DetectedSignal = {
        pattern: match.pattern.id,
        type: match.pattern.name,
        content: match.match[0] ?? '',
        line: match.lineNumber,
        column: match.columnNumber,
        context: this.buildSignalContext(match, source),
        priority: this.mapPriorityToLevel(match.pattern.priority)
      };

      // Add additional metadata if contextual analysis enabled
      if (this.config.enableContextualAnalysis) {
        // Would add more sophisticated context analysis here
        signal.context += ` | Confidence: ${(match.confidence * 100).toFixed(1)}%`;
      }

      signals.push(signal);
    }

    // Sort by priority and line number
    return signals.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] ?? 0;
      const bPriority = priorityOrder[b.priority] ?? 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return a.line - b.line; // Then by line number
    });
  }

  private removeDuplicates(signals: DetectedSignal[], source: string): DetectedSignal[] {
    const uniqueSignals: DetectedSignal[] = [];

    for (const signal of signals) {
      const hash = this.calculateSignalHash(signal);
      const duplicateKey = `${signal.type}:${hash}`;

      const existing = this.duplicates.get(duplicateKey);
      if (existing) {
        // Check if within duplicate window
        const timeDiff = TimeUtils.now().getTime() - existing.timestamp.getTime();
        if (timeDiff <= this.config.duplicateWindowMs) {
          existing.count++;
          this.metrics.totalDuplicates++;
          continue; // Skip duplicate
        }
      }

      // Add to unique signals and track duplicate
      uniqueSignals.push(signal);
      this.duplicates.set(duplicateKey, {
        hash,
        signalType: signal.type,
        content: signal.content,
        timestamp: TimeUtils.now(),
        source,
        count: 1
      });
    }

    return uniqueSignals;
  }

  private calculateSignalHash(signal: DetectedSignal): string {
    const content = `${signal.type}:${signal.content}:${signal.context}`;
    return HashUtils.generateId();
  }

  private buildSignalContext(match: SignalMatch, source: string): string {
    return `${source}:${match.pattern.name} - ${match.context.fullLine}`;
  }

  private mapPriorityToLevel(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority >= 9) {
      return 'critical';
    }
    if (priority >= 7) {
      return 'high';
    }
    if (priority >= 4) {
      return 'medium';
    }
    return 'low';
  }

  private calculatePatternStats(matches: SignalMatch[]): Array<{
    patternId: string;
    matches: number;
    confidence: number;
  }> {
    const patternStats = new Map<string, { matches: number; confidenceSum: number }>();

    for (const match of matches) {
      const existing = patternStats.get(match.pattern.id) ?? { matches: 0, confidenceSum: 0 };
      existing.matches++;
      existing.confidenceSum += match.confidence;
      patternStats.set(match.pattern.id, existing);
    }

    return Array.from(patternStats.entries()).map(([patternId, stats]) => ({
      patternId,
      matches: stats.matches,
      confidence: stats.matches > 0 ? stats.confidenceSum / stats.matches : 0
    }));
  }

  private calculateAverageConfidence(signals: DetectedSignal[]): number {
    if (signals.length === 0) {
      return 0;
    }

    // Extract confidence from context if available
    const confidences = signals.map(signal => {
      const confidenceMatch = signal.context.match(/Confidence: (\d+\.?\d*)%/);
      return confidenceMatch ? parseFloat(confidenceMatch[1]) / 100 : 0.5;
    });

    const sum = confidences.reduce((acc, conf) => acc + conf, 0);
    return sum / confidences.length;
  }

  private updateMetrics(matches: SignalMatch[], uniqueSignals: DetectedSignal[], processingTime: number): void {
    this.metrics.totalDetections += uniqueSignals.length;
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime + processingTime) / 2;
  }

  private startDuplicateCleanup(): void {
    // Clean up old duplicates every 10 minutes
    setInterval(() => {
      const cutoffTime = TimeUtils.now().getTime() - this.config.duplicateWindowMs;

      for (const [key, duplicate] of this.duplicates.entries()) {
        if (duplicate.timestamp.getTime() < cutoffTime) {
          this.duplicates.delete(key);
        }
      }

      logger.debug('EnhancedSignalDetectorWithPatterns', 'Duplicate cache cleaned', {
        remaining: this.duplicates.size
      });
    }, 10 * 60 * 1000);
  }
}