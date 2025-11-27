/**
 * ♫ Text Processing Utilities for @dcversus/prp
 *
 * Shared utilities for text compression, summarization, and processing.
 */
export interface CompressionStrategy {
  strategy: 'semantic' | 'summary' | 'truncate' | 'cluster';
  level: 'low' | 'medium' | 'high';
  preserveKeyInfo: boolean;
  targetSize: number; // tokens
}
export interface TextProcessingOptions {
  maxLength?: number;
  preserveStructure?: boolean;
  preserveKeywords?: string[];
  removeWhitespace?: boolean;
  normalizeText?: boolean;
}
/**
 * Text Processing Utility Class
 */
export class TextProcessor {
  /**
   * Compress text using various strategies
   */
  static async compressText(
    text: string,
    compression: CompressionStrategy,
    options?: TextProcessingOptions,
  ): Promise<string> {
    if (!text || text.length === 0) {
      return text;
    }
    const {targetSize} = compression;
    const currentTokens = this.estimateTokens(text);
    if (currentTokens <= targetSize) {
      return text;
    }
    switch (compression.strategy) {
      case 'truncate':
        return this.truncateText(text, targetSize, options);
      case 'summary':
        return this.summarizeText(text, targetSize, options);
      case 'semantic':
        return this.semanticCompress(text, compression, options);
      case 'cluster':
        return this.clusterCompress(text, compression, options);
      default:
        return this.truncateText(text, targetSize, options);
    }
  }
  /**
   * Truncate text to target token count
   */
  static truncateText(text: string, targetTokens: number, options?: TextProcessingOptions): string {
    if (!text) {
      return text;
    }
    const words = text.split(/\s+/);
    const avgTokensPerWord = 1.3; // Average estimation
    const targetWords = Math.floor(targetTokens / avgTokensPerWord);
    if (words.length <= targetWords) {
      return text;
    }
    const truncated = words.slice(0, targetWords).join(' ');
    return `${truncated  }... [truncated]`;
  }
  /**
   * Summarize text using extractive summarization
   */
  static async summarizeText(
    text: string,
    targetTokens: number,
    options?: TextProcessingOptions,
  ): Promise<string> {
    // Extractive summarization implementation
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length <= 3) {
      return this.truncateText(text, targetTokens, options);
    }
    // Score sentences based on length and keywords
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence: sentence.trim(),
      score: this.scoreSentence(sentence, options?.preserveKeywords),
      index,
    }));
    // Sort by score and select top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    let summary = '';
    let tokenCount = 0;
    const selectedSentences: string[] = [];
    for (const { sentence } of scoredSentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      if (tokenCount + sentenceTokens <= targetTokens) {
        selectedSentences.push(sentence);
        tokenCount += sentenceTokens;
      } else {
        break;
      }
    }
    // Reorder sentences to original order
    selectedSentences.sort((a, b) => {
      const aIndex = sentences.findIndex((s) => s.trim() === a);
      const bIndex = sentences.findIndex((s) => s.trim() === b);
      return aIndex - bIndex;
    });
    summary = `${selectedSentences.join('. ')  }.`;
    if (tokenCount > targetTokens * 0.9) {
      summary = this.truncateText(summary, targetTokens, options);
    }
    return summary;
  }
  /**
   * Semantic compression (placeholder for advanced implementation)
   */
  static async semanticCompress(
    text: string,
    compression: CompressionStrategy,
    options?: TextProcessingOptions,
  ): Promise<string> {
    // For now, use intelligent summarization
    // In a real implementation, this would use semantic analysis
    return this.summarizeText(text, compression.targetSize, options);
  }
  /**
   * Cluster compression (placeholder for advanced implementation)
   */
  static async clusterCompress(
    text: string,
    compression: CompressionStrategy,
    options?: TextProcessingOptions,
  ): Promise<string> {
    // For now, use semantic compression
    // In a real implementation, this would cluster similar content
    return this.semanticCompress(text, compression, options);
  }
  /**
   * Score a sentence for summarization
   */
  private static scoreSentence(sentence: string, keywords?: string[]): number {
    let score = 0;
    // Length score - prefer medium-length sentences
    const {length} = sentence.split(/\s+/);
    if (length >= 5 && length <= 20) {
      score += 2;
    } else if (length >= 3 && length <= 30) {
      score += 1;
    }
    // Keyword score
    if (keywords && keywords.length > 0) {
      const lowerSentence = sentence.toLowerCase();
      for (const keyword of keywords) {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          score += 3;
        }
      }
    }
    // Position score - sentences at beginning and end get higher scores
    // This would be calculated at a higher level
    return score;
  }
  /**
   * Estimate token count (rough estimation)
   */
  static estimateTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }
  /**
   * Clean and normalize text
   */
  static cleanText(text: string, options?: TextProcessingOptions): string {
    if (!text) {
      return text;
    }
    let cleaned = text;
    // Remove extra whitespace
    if (options?.removeWhitespace) {
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
    }
    // Normalize text
    if (options?.normalizeText) {
      cleaned = cleaned
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
    return cleaned;
  }
  /**
   * Extract key information from text
   */
  static extractKeyInfo(
    text: string,
    preserveStructure?: boolean,
  ): {
    headings: string[];
    lists: string[];
    codeBlocks: string[];
    keyPhrases: string[];
  } {
    const result = {
      headings: [] as string[],
      lists: [] as string[],
      codeBlocks: [] as string[],
      keyPhrases: [] as string[],
    };
    if (!text) {
      return result;
    }
    if (preserveStructure) {
      // Extract markdown headings
      const headingRegex = /^(#{1,6})\s+(.+)$/gm;
      let match;
      while ((match = headingRegex.exec(text)) !== null) {
        result.headings.push(match[2]);
      }
      // Extract code blocks
      const codeRegex = /```[\s\S]*?```/g;
      while ((match = codeRegex.exec(text)) !== null) {
        result.codeBlocks.push(match[0]);
      }
      // Extract lists
      const listRegex = /^\s*[-*+]\s+(.+)$/gm;
      while ((match = listRegex.exec(text)) !== null) {
        result.lists.push(match[1]);
      }
    }
    // Extract key phrases (simple implementation)
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
    ]);
    const phraseFreq: Record<string, number> = {};
    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      if (!commonWords.has(word) && word.length > 3) {
        const phrase = `${word} ${nextWord}`;
        phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
      }
    }
    // Get top phrases
    result.keyPhrases = Object.entries(phraseFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([phrase]) => phrase);
    return result;
  }
  /**
   * Intelligent text chunking for large content
   */
  static chunkText(text: string, maxChunkTokens: number, overlap = 50): string[] {
    if (!text) {
      return [];
    }
    const tokens = this.estimateTokens(text);
    if (tokens <= maxChunkTokens) {
      return [text];
    }
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    const tokensPerWord = tokens / words.length;
    const wordsPerChunk = Math.floor(maxChunkTokens / tokensPerWord);
    const overlapWords = Math.floor(overlap / tokensPerWord);
    let startIndex = 0;
    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + wordsPerChunk, words.length);
      const chunk = words.slice(startIndex, endIndex).join(' ');
      chunks.push(chunk);
      startIndex = endIndex - overlapWords;
      if (startIndex < 0) {
        startIndex = 0;
      }
    }
    return chunks;
  }
  /**
   * Merge overlapping text chunks
   */
  static mergeChunks(chunks: string[], overlap = 50): string {
    if (!chunks || chunks.length === 0) {
      return '';
    }
    if (chunks.length === 1) {
      return chunks[0];
    }
    let merged = chunks[0];
    for (let i = 1; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      const overlapChars = Math.floor(overlap * 4); // Rough char estimate
      // Find overlapping portion
      let bestOverlap = 0;
      let bestOverlapPos = -1;
      for (let j = Math.max(0, merged.length - overlapChars * 2); j < merged.length; j++) {
        const suffix = merged.substring(j);
        if (currentChunk.startsWith(suffix)) {
          bestOverlap = suffix.length;
          bestOverlapPos = j;
          break;
        }
      }
      if (bestOverlap > 0) {
        merged = merged.substring(0, bestOverlapPos) + currentChunk;
      } else {
        merged += ` ${  currentChunk}`;
      }
    }
    return merged;
  }
}
