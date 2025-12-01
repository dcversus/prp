/**
 * ♫ Paste Handler Utility for TUI InputBar
 *
 * Provides paste detection, token counting, and metadata generation
 * for terminal UI paste events with 5% reserve enforcement
 */
import crypto from 'crypto';

import { logger } from '../../shared/logger';
// Interface for paste metadata
export interface PasteMetadata {
  tokens: number;
  hash: string;
  cut?: number;
  originalLength: number;
  processedContent: string;
}
// Interface for paste handler options
export interface PasteHandlerOptions {
  maxTokens?: number;
  reservePercentage?: number;
  enableHashing?: boolean;
}
/**
 * Paste Handler Class
 *
 * Handles paste events in terminal environments with token counting
 * and 5% reserve enforcement as specified in PRP-004
 */
export class PasteHandler {
  private maxTokens: number;
  private reservePercentage: number;
  private readonly enableHashing: boolean;
  constructor(options: PasteHandlerOptions = {}) {
    this.maxTokens = options.maxTokens ?? 200000; // Default from orchestrator caps
    this.reservePercentage = options.reservePercentage ?? 5; // 5% reserve requirement
    this.enableHashing = options.enableHashing ?? true;
  }
  /**
   * Process pasted content and generate metadata
   *
   * @param content The pasted content to process
   * @param currentInput Current input value (for available token calculation)
   * @returns PasteMetadata with processed content and metadata
   */
  processPaste(content: string, currentInput = ''): PasteMetadata {
    // Calculate tokens for pasted content
    const pastedTokens = this.countTokens(content);
    const currentTokens = this.countTokens(currentInput);
    // Calculate available tokens with reserve
    const usableTokens = this.calculateUsableTokens();
    const remainingBudget = usableTokens - currentTokens;
    let processedContent = content;
    let cut: number | undefined;
    if (pastedTokens > remainingBudget && remainingBudget > 0) {
      // Cut content to fit within budget
      const allowedTokens = Math.max(0, remainingBudget - 10); // Small buffer
      processedContent = this.truncateToTokenCount(content, allowedTokens);
      const actualTokens = this.countTokens(processedContent);
      cut = pastedTokens - actualTokens;
    } else if (remainingBudget <= 0) {
      // No budget remaining, return empty
      processedContent = '';
      cut = pastedTokens;
    }
    // Generate hash for the paste
    const hash = this.enableHashing ? this.generateHash(processedContent) : '';
    return {
      tokens: this.countTokens(processedContent),
      hash,
      cut,
      originalLength: content.length,
      processedContent,
    };
  }
  /**
   * Count tokens in text using simple estimation
   *
   * @param text Text to count tokens for
   * @returns Estimated token count
   */
  countTokens(text: string): number {
    // Simple token estimation: ~1 token per 4 characters
    // This matches the estimateTokens function used elsewhere in the codebase
    return Math.ceil(text.length / 4);
  }
  /**
   * Calculate available tokens based on current caps
   *
   * @returns Available token count
   */
  private calculateAvailableTokens(): number {
    try {
      // For now, use the configured max tokens
      // In a real implementation, this could fetch from the token caps system
      // Since we need synchronous operation for paste validation
      return this.maxTokens;
    } catch (error) {
      // Fallback to default if token caps retrieval fails
      logger.debug(
        'Failed to get token caps, using default:',
        { error },
        'PasteHandler.getMaxTokens',
      );
      return this.maxTokens;
    }
  }
  /**
   * Calculate available tokens for paste validation
   *
   * @returns Usable token count (excluding reserve)
   */
  private calculateUsableTokens(): number {
    const totalTokens = this.calculateAvailableTokens();
    const reserveTokens = Math.floor(totalTokens * (this.reservePercentage / 100));
    return totalTokens - reserveTokens;
  }
  /**
   * Truncate content to fit within specified token count
   *
   * @param content Content to truncate
   * @param maxTokens Maximum tokens allowed
   * @returns Truncated content
   */
  private truncateToTokenCount(content: string, maxTokens: number): string {
    if (maxTokens <= 0) {
      return '';
    }
    // Calculate approximate character limit
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) {
      return content;
    }
    // Try to truncate at word boundary
    let truncated = content.substring(0, maxChars);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxChars * 0.8) {
      // Only cut at word if it's not too far back
      truncated = truncated.substring(0, lastSpaceIndex);
    }
    return truncated;
  }
  /**
   * Generate hash for content
   *
   * @param content Content to hash
   * @returns 8-character hash
   */
  private generateHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }
  /**
   * Format paste metadata for display
   *
   * @param metadata Paste metadata to format
   * @returns Formatted string for display
   */
  formatMetadata(metadata: PasteMetadata): string {
    if (metadata.cut) {
      return `-- pasted ${metadata.tokens} tokens | ${metadata.hash} | cut_limit --`;
    } else {
      return `-- pasted ${metadata.tokens} tokens | ${metadata.hash} --`;
    }
  }
  /**
   * Validate if paste can be accepted
   *
   * @param content Content to validate
   * @param currentInput Current input value
   * @returns Validation result
   */
  validatePaste(
    content: string,
    currentInput = '',
  ): {
    canAccept: boolean;
    reason?: string;
    estimatedTokens: number;
  } {
    const estimatedTokens = this.countTokens(content);
    const currentTokens = this.countTokens(currentInput);
    // Get available tokens (synchronous version for validation)
    const usableTokens = this.calculateUsableTokens();
    const remainingBudget = usableTokens - currentTokens;
    if (estimatedTokens > remainingBudget) {
      return {
        canAccept: false,
        reason: `Paste exceeds token limit. Available: ${remainingBudget}, Required: ${estimatedTokens}`,
        estimatedTokens,
      };
    }
    return {
      canAccept: true,
      estimatedTokens,
    };
  }
  /**
   * Update max tokens limit
   *
   * @param newMaxTokens New maximum token limit
   */
  setMaxTokens(newMaxTokens: number): void {
    this.maxTokens = newMaxTokens;
  }
  /**
   * Update reserve percentage
   *
   * @param newReservePercentage New reserve percentage (0-100)
   */
  setReservePercentage(newReservePercentage: number): void {
    if (newReservePercentage < 0 || newReservePercentage > 100) {
      throw new Error('Reserve percentage must be between 0 and 100');
    }
    this.reservePercentage = newReservePercentage;
  }
}
/**
 * Default paste handler instance
 */
export const defaultPasteHandler = new PasteHandler();
/**
 * Convenience function to process paste
 *
 * @param content Content to process
 * @param currentInput Current input value
 * @returns Paste metadata
 */
export function processPaste(content: string, currentInput = ''): PasteMetadata {
  return defaultPasteHandler.processPaste(content, currentInput);
}
/**
 * Convenience function to validate paste
 *
 * @param content Content to validate
 * @param currentInput Current input value
 * @returns Validation result
 */
export function validatePaste(content: string, currentInput = '') {
  return defaultPasteHandler.validatePaste(content, currentInput);
}
/**
 * Convenience function to format metadata
 *
 * @param metadata Paste metadata
 * @returns Formatted string
 */
export function formatPasteMetadata(metadata: PasteMetadata): string {
  return defaultPasteHandler.formatMetadata(metadata);
}
