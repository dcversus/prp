/**
 * Orchestrator Self Integration
 * Handles self identity initialization and context management
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { selfStore, type SelfData } from '../shared/self';
import { logger } from '../shared/logger';
import type { SelfConfig } from './types';

export class SelfIntegration {
  private selfConfig?: SelfConfig;
  private initialized = false;

  constructor(selfConfig?: SelfConfig) {
    this.selfConfig = selfConfig;
  }

  /**
   * Initialize self identity based on configuration
   * Generates only once and provides proper fallbacks
   */
  async initialize(): Promise<SelfData> {
    // Check if already initialized
    if (this.initialized) {
      const existing = await selfStore.get();
      if (existing) {
        logger.debug('self-integration', 'initialize', 'Using existing self identity', { selfName: existing.selfName });
        return existing;
      }
    }

    // Check if self data already exists in store
    const existingSelf = await selfStore.get();
    if (existingSelf) {
      this.initialized = true;
      logger.info('self-integration', 'initialize', 'Using stored self identity', { selfName: existingSelf.selfName });
      return existingSelf;
    }

    let selfData: SelfData;

    if (!this.selfConfig?.enabled) {
      // Use default self identity
      selfData = {
        selfName: 'prp-orchestrator',
        selfSummary: 'Managing autonomous development workflow with signal-driven orchestration',
        selfGoal: 'Orchestrate autonomous development across all PRPs',
        lastUpdated: new Date()
      };

      logger.info('self-integration', 'initialize', 'Using default self identity', { selfName: selfData.selfName });
    } else {
      // Process self identity using guideline
      try {
        selfData = await this.processSelfIdentity(this.selfConfig.identity);
        logger.info('self-integration', 'initialize', 'Self identity processed', {
          selfName: selfData.selfName,
          hasIdentity: !!this.selfConfig.identity
        });
      } catch (error) {
        logger.error('self-integration', 'initialize', 'Failed to process self identity, using fallback',
          error instanceof Error ? error : new Error(String(error)));

        // Fallback to basic extraction
        selfData = {
          selfName: this.extractSelfName(this.selfConfig.identity) || 'prp-orchestrator',
          selfSummary: this.extractSelfSummary(this.selfConfig.identity) ||
            'Managing autonomous development workflow with signal-driven orchestration',
          selfGoal: this.extractSelfGoal(this.selfConfig.identity) ||
            'Orchestrate autonomous development across all PRPs',
          identity: this.selfConfig.identity,
          lastUpdated: new Date()
        };
      }
    }

    // Store the self data
    await selfStore.set(selfData);
    this.initialized = true;

    return selfData;
  }

  /**
   * Get current self data
   */
  async getSelf(): Promise<SelfData | null> {
    return selfStore.get();
  }

  /**
   * Update self data
   */
  async updateSelf(partial: Partial<SelfData>): Promise<SelfData> {
    return selfStore.update(partial);
  }

  /**
   * Process self identity using the HS/self.md guideline
   */
  private async processSelfIdentity(selfInput: string): Promise<SelfData> {
    try {
      // Read the self guideline
      const guidelinePath = join(process.cwd(), 'src', 'guidelines', 'HS', 'self.md');
      const guidelineContent = await fs.readFile(guidelinePath, 'utf-8');

      // Get shared context and PRP summary
      const sharedContext = await this.getSharedContext();
      const prpSummary = await this.getPRPSummary();

      // For now, implement basic self reasoning
      // In a full implementation, this would use the LLM to process according to the guideline
      const selfData = this.performBasicSelfReasoning(selfInput, sharedContext, prpSummary);

      return selfData;
    } catch (error) {
      logger.error('self-integration', 'processSelfIdentity', 'Failed to process self identity',
        error instanceof Error ? error : new Error(String(error)));

      // Fallback to basic extraction
      return this.performBasicSelfReasoning(selfInput, '', '');
    }
  }

  /**
   * Basic self reasoning implementation
   * TODO: Replace with actual LLM-based processing according to HS/self.md
   */
  private performBasicSelfReasoning(selfInput: string, sharedContext: string, prpSummary: string): SelfData {
    // Extract selfName from selfInput
    const selfName = this.extractSelfName(selfInput) || 'prp-orchestrator';

    // Extract selfSummary from selfInput or use sharedContext
    const selfSummary = this.extractSelfSummary(selfInput) || sharedContext ||
      'Managing autonomous development workflow with signal-driven orchestration';

    // Extract selfGoal from selfInput or combine PRP summaries
    const selfGoal = this.extractSelfGoal(selfInput) ||
      (prpSummary ? prpSummary.split(' ').join(' -- ANOTHER PRP -- ') : 'Orchestrate autonomous development across all PRPs');

    return {
      selfName,
      selfSummary,
      selfGoal,
      identity: selfInput,
      lastUpdated: new Date()
    };
  }

  /**
   * Extract self name from input
   */
  private extractSelfName(selfInput: string): string | null {
    // Look for patterns like "I am a...", "I am an...", "My name is..."
    const patterns = [
      /I am an? (.+?)(?:\s|$|,|\.)/i,
      /My name is (.+?)(?:\s|$|,|\.)/i,
      /I'm an? (.+?)(?:\s|$|,|\.)/i,
      /Working as (.+?)(?:\s|$|,|\.)/i
    ];

    for (const pattern of patterns) {
      const match = selfInput.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    // If no pattern matches, use first sentence or phrase
    const sentences = selfInput.split(/[.!?]/);
    if (sentences.length > 0 && sentences[0].trim()) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length < 50) {
        return firstSentence;
      }
      // Return first 5 words
      return firstSentence.split(' ').slice(0, 5).join(' ');
    }

    return null;
  }

  /**
   * Extract self summary from input
   */
  private extractSelfSummary(selfInput: string): string | null {
    // Use first meaningful sentence as summary
    const sentences = selfInput.split(/[.!?]/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length < 200) {
        return trimmed;
      }
    }
    return null;
  }

  /**
   * Extract self goal from input
   */
  private extractSelfGoal(selfInput: string): string | null {
    // Look for goal-related keywords
    const patterns = [
      /(?:goal|objective|purpose|aim|focus)(?: is)?\s+(.+?)(?:[.!?]|$)/i,
      /(?:working|focused|aimed|targeted)\s+on\s+(.+?)(?:[.!?]|$)/i,
      /(?:to|for|in order to)\s+(.+?)(?:[.!?]|$)/i
    ];

    for (const pattern of patterns) {
      const match = selfInput.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    // Look for action verbs
    const actionPattern = /(?:building|creating|developing|implementing|optimizing|managing|leading)\s+(.+?)(?:[.!?]|$)/i;
    const actionMatch = selfInput.match(actionPattern);
    if (actionMatch?.[1]) {
      return actionMatch[1].trim();
    }

    return null;
  }

  /**
   * Get shared context
   * TODO: Implement actual shared context retrieval
   */
  private async getSharedContext(): Promise<string> {
    // This would retrieve from shared context manager
    return 'Managing autonomous development workflow with signal-driven orchestration';
  }

  /**
   * Get PRP summary
   * TODO: Implement actual PRP summary retrieval
   */
  private async getPRPSummary(): Promise<string> {
    // This would retrieve from PRP tracker or scanner
    return '';
  }
}