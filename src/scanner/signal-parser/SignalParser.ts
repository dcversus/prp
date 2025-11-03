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
    const lines = content.split('\n');
    const signals: ParsedSignal[] = [];
    let match;

    // Reset regex lastIndex
    this.signalPattern.lastIndex = 0;

    while ((match = this.signalPattern.exec(content)) !== null) {
      const signal = match[1];
      const position = this.getPosition(content, match.index);
      const lineIndex = position.line;
      const lineContent = lines[lineIndex] || '';

      // Extract context (50 chars before and after)
      const startContext = Math.max(0, position.column - 50);
      const endContext = Math.min(lineContent.length, position.column + signal.length + 50);
      const context = lineContent.substring(startContext, endContext);

      // Determine signal type
      const type = this.determineSignalType(signal, lineContent);

      signals.push({
        signal,
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
      byType[sig.signal] = (byType[sig.signal] || 0) + 1;
    });

    return {
      signals,
      totalCount: signals.length,
      byType
    };
  }

  /**
   * Parse signals from multiple files
   */
  parseFromFiles(files: Array<{ path: string; content: string }>): SignalParseResult {
    const allSignals: ParsedSignal[] = [];
        const byType: Record<string, number> = {};

    for (const file of files) {
      const result = this.parse(file.content);
      allSignals.push(...result.signals);

      // Update counts
      Object.entries(result.byType).forEach(([signal, count]) => {
        byType[signal] = (byType[signal] || 0) + count;
      });
    }

    return {
      signals: allSignals,
      totalCount: allSignals.length,
      byType
    };
  }

  /**
   * Validate if a signal is properly formatted
   */
  validateSignal(signal: string): boolean {
    return /^[a-zA-Z]{2}$/.test(signal);
  }

  /**
   * Check if signal indicates resolution
   */
  isResolvedSignal(signal: string): boolean {
    return this.resolvedPattern.test(`[${signal}]`);
  }

  /**
   * Get line and column position from index
   */
  private getPosition(content: string, index: number): { line: number; column: number } {
    const beforeIndex = content.substring(0, index);
    const lines = beforeIndex.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;
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
    const signals = new Set<string>();
    let match;

    this.signalPattern.lastIndex = 0;
    while ((match = this.signalPattern.exec(content)) !== null) {
      signals.add(match[1]);
    }

    return Array.from(signals);
  }

  /**
   * Count signal occurrences
   */
  countSignals(content: string): Record<string, number> {
    const counts: Record<string, number> = {};
    let match;

    this.signalPattern.lastIndex = 0;
    while ((match = this.signalPattern.exec(content)) !== null) {
      const signal = match[1];
      counts[signal] = (counts[signal] || 0) + 1;
    }

    return counts;
  }
}