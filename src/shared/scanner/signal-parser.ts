import { createLayerLogger } from '../logger.js';

const logger = createLayerLogger('signal-parser');

/**
 * Signal Parser - Detects and parses [XX] signals from text content
 * Part of PRP-007-F: Signal Sensor Inspector Implementation
 */

export interface ParsedSignal {
  signal: string;
  context: string;
  line?: number;
  column?: number;
  timestamp: Date;
  type: 'new' | 'resolved' | 'need-check' | 'unknown';
}

export interface SignalParseResult {
  signals: ParsedSignal[];
  totalCount: number;
  byType: Record<string, number>;
}

export class SignalParser {
  private readonly signalPattern = /\[([a-zA-Z]{2})\]/g;
  private readonly resolvedPattern = /\[([a-z]{2})\]/g;
  private readonly needCheckPattern = /\[([A-Z])[a-z]\]/g;

  /**
   * Parse signals from content
   */
  parse(content: string): SignalParseResult {
    logger.debug('SignalParser', 'Starting signal parsing', { contentLength: content.length });

    const lines = content.split('\n');
    const signals: ParsedSignal[] = [];
    let match;

    // Reset regex lastIndex
    this.signalPattern.lastIndex = 0;

    while ((match = this.signalPattern.exec(content)) !== null) {
      const signal = match[1];
      const position = this.getPosition(content, match.index || 0);
      const lineIndex = position.line;
      const lineContent = lines[lineIndex] ?? '';

      // Extract context (50 chars before and after)
      const startContext = Math.max(0, position.column - 50);
      const endContext = Math.min(lineContent.length, position.column + (signal?.length ?? 0) + 50);
      const context = lineContent.substring(startContext, endContext);

      // Determine signal type
      const type = signal ? this.determineSignalType(signal, lineContent) : 'unknown';

      signals.push({
        signal: signal ?? '',
        context: context.trim(),
        line: lineIndex + 1,
        column: position.column,
        timestamp: new Date(),
        type
      });
    }

    // Group by type
    const byType: Record<string, number> = {};
    signals.forEach(sig => {
      byType[sig.signal] = (byType[sig.signal] ?? 0) + 1;
    });

    const result = {
      signals,
      totalCount: signals.length,
      byType
    };

    logger.debug('SignalParser', 'Parsing complete', {
      totalSignals: result.totalCount,
      uniqueSignals: Object.keys(result.byType).length
    });

    return result;
  }

  /**
   * Parse signals from multiple files
   */
  parseFromFiles(files: Array<{ path: string; content: string }>): SignalParseResult {
    logger.debug('SignalParser', 'Parsing signals from multiple files', { fileCount: files.length });

    const allSignals: ParsedSignal[] = [];
    const byType: Record<string, number> = {};

    for (const file of files) {
      const result = this.parse(file.content);
      allSignals.push(...result.signals);

      // Update counts
      Object.entries(result.byType).forEach(([signal, count]) => {
        byType[signal] = (byType[signal] ?? 0) + count;
      });
    }

    const result = {
      signals: allSignals,
      totalCount: allSignals.length,
      byType
    };

    logger.debug('SignalParser', 'Multi-file parsing complete', {
      totalSignals: result.totalCount,
      uniqueSignals: Object.keys(result.byType).length
    });

    return result;
  }

  /**
   * Validate if a signal is properly formatted
   */
  validateSignal(signal: string): boolean {
    const isValid = /^[a-zA-Z]{2}$/.test(signal);
    logger.debug('SignalParser', `Validating signal: ${signal} - ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
  }

  /**
   * Check if signal indicates resolution
   */
  isResolvedSignal(signal: string): boolean {
    const isResolved = this.resolvedPattern.test(`[${signal}]`);
    logger.debug('SignalParser', `Checking if signal is resolved: ${signal} - ${isResolved}`);
    return isResolved;
  }

  /**
   * Get line and column position from index
   */
  private getPosition(content: string, index: number): { line: number; column: number } {
    const beforeIndex = content.substring(0, index);
    const lines = beforeIndex.split('\n');
    const line = lines.length - 1;
    const lastLine = lines[lines.length - 1];
    const column = lastLine ? lastLine.length : 0;
    return { line, column };
  }

  /**
   * Determine signal type based on context
   */
  private determineSignalType(signal: string, lineContent: string): 'new' | 'resolved' | 'need-check' | 'unknown' {
    // Check if resolved (lowercase)
    if (signal === signal.toLowerCase()) {
      return 'resolved';
    }

    // Check if needs checking (pattern like [Xx])
    if (this.needCheckPattern.test(lineContent)) {
      return 'need-check';
    }

    // Check for indicators of new signal
    const newIndicators = ['TODO:', 'FIXME:', 'new signal', 'add signal', 'create signal'];
    if (newIndicators.some(indicator => lineContent.toLowerCase().includes(indicator))) {
      return 'new';
    }

    // Check for resolved indicators
    const resolvedIndicators = ['done:', 'complete:', 'fixed:', 'resolved:', 'finished:'];
    if (resolvedIndicators.some(indicator => lineContent.toLowerCase().includes(indicator))) {
      return 'resolved';
    }

    return 'unknown';
  }

  /**
   * Extract unique signals from content
   */
  extractUniqueSignals(content: string): string[] {
    logger.debug('SignalParser', 'Extracting unique signals');

    const signals = new Set<string>();
    let match;

    this.signalPattern.lastIndex = 0;
    while ((match = this.signalPattern.exec(content)) !== null) {
      if (match[1]) {
        signals.add(match[1]);
      }
    }

    const uniqueSignals = Array.from(signals);
    logger.debug('SignalParser', `Found ${uniqueSignals.length} unique signals`);
    return uniqueSignals;
  }

  /**
   * Count signal occurrences
   */
  countSignals(content: string): Record<string, number> {
    logger.debug('SignalParser', 'Counting signal occurrences');

    const counts: Record<string, number> = {};
    let match;

    this.signalPattern.lastIndex = 0;
    while ((match = this.signalPattern.exec(content)) !== null) {
      const signal = match[1];
      if (signal) { // Ensure signal is not undefined
        counts[signal] = (counts[signal] ?? 0) + 1;
      }
    }

    logger.debug('SignalParser', `Counted signals for ${Object.keys(counts).length} types`);
    return counts;
  }
}