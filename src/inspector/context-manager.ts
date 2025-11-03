/**
 * ♫ Context Manager for @dcversus/prp Inspector
 *
 * Context management system with rolling window approach and semantic summarization.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import {
  ProcessingContext,
  ActivityEntry,
  TokenStatusInfo,
  AgentStatusInfo,
  SharedNoteInfo,
  EnvironmentInfo,
  GuidelineContext,
  HistoricalData
} from './types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

/**
 * Context window configuration
 */
export interface ContextWindowConfig {
  maxSize: number;           // Maximum context size in tokens
  windowSize: number;        // Rolling window size (time-based)
  compressionThreshold: number; // When to compress (percentage)
  summaryInterval: number;   // How often to generate summaries (ms)
  maxAge: number;           // Maximum age for context entries (ms)
  priorityLevels: number;    // Number of priority levels
}

/**
 * Context entry with metadata
 */
export interface ContextEntry {
  id: string;
  type: 'signal' | 'activity' | 'agent_status' | 'environment' | 'note' | 'summary';
  timestamp: Date;
  priority: number;
  data: any;
  tokenCount: number;
  compressed: boolean;
  referenced: boolean;
  tags: string[];
  relationships: string[]; // IDs of related entries
}

/**
 * Semantic summary
 */
export interface SemanticSummary {
  id: string;
  period: {
    start: Date;
    end: Date;
  };
  type: 'signal_summary' | 'activity_summary' | 'agent_summary' | 'comprehensive';
  content: string;
  keyPoints: string[];
  trends: string[];
  anomalies: string[];
  confidence: number;
  tokenCount: number;
  generatedAt: Date;
  entriesSummarized: string[];
}

/**
 * Context compression result
 */
export interface ContextCompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  entriesRemoved: number;
  summariesGenerated: number;
  processingTime: number;
}

/**
 * Context Manager - Manages rolling context window with intelligent compression
 */
export class ContextManager extends EventEmitter {
  private config: ContextWindowConfig;
  private entries: Map<string, ContextEntry> = new Map();
  private summaries: Map<string, SemanticSummary> = new Map();
  private lastCompression: Date = new Date();
  private lastSummary: Date = new Date();
  private totalTokens: number = 0;

  constructor(config: Partial<ContextWindowConfig> = {}) {
    super();

    // Default configuration optimized for 40K token limit
    this.config = {
      maxSize: 40000,        // 40K tokens total
      windowSize: 3600000,   // 1 hour rolling window
      compressionThreshold: 0.8, // Compress at 80% capacity
      summaryInterval: 900000,   // Generate summaries every 15 minutes
      maxAge: 7200000,       // 2 hours maximum age
      priorityLevels: 5,     // 5 priority levels
      ...config
    };

    // Start periodic maintenance
    this.startMaintenanceTimer();
  }

  /**
   * Add context entry
   */
  addEntry(entry: Omit<ContextEntry, 'id' | 'tokenCount' | 'compressed' | 'referenced'>): string {
    const id = HashUtils.generateId();
    const tokenCount = this.estimateTokens(entry.data);

    const contextEntry: ContextEntry = {
      ...entry,
      id,
      tokenCount,
      compressed: false,
      referenced: false
    };

    this.entries.set(id, contextEntry);
    this.totalTokens += tokenCount;

    // Check if compression is needed
    if (this.shouldCompress()) {
      this.scheduleCompression();
    }

    logger.debug('ContextManager', `Added context entry: ${entry.type}`, {
      id,
      tokenCount,
      totalTokens: this.totalTokens
    });

    this.emit('entry:added', { entry: contextEntry });

    return id;
  }

  /**
   * Add signal to context
   */
  addSignal(signal: Signal): string {
    return this.addEntry({
      type: 'signal',
      timestamp: signal.timestamp,
      priority: signal.priority || 5,
      data: signal,
      tags: ['signal', signal.type],
      relationships: []
    });
  }

  /**
   * Add activity to context
   */
  addActivity(activity: ActivityEntry): string {
    return this.addEntry({
      type: 'activity',
      timestamp: activity.timestamp,
      priority: activity.priority || 3,
      data: activity,
      tags: ['activity', activity.action],
      relationships: []
    });
  }

  /**
   * Update agent status
   */
  updateAgentStatus(status: AgentStatusInfo): string {
    return this.addEntry({
      type: 'agent_status',
      timestamp: status.lastActivity,
      priority: 4,
      data: status,
      tags: ['agent', status.status],
      relationships: []
    });
  }

  /**
   * Update environment info
   */
  updateEnvironment(environment: EnvironmentInfo): string {
    return this.addEntry({
      type: 'environment',
      timestamp: new Date(),
      priority: 2,
      data: environment,
      tags: ['environment'],
      relationships: []
    });
  }

  /**
   * Add shared note
   */
  addSharedNote(note: SharedNoteInfo): string {
    return this.addEntry({
      type: 'note',
      timestamp: note.lastModified,
      priority: note.priority || 3,
      data: note,
      tags: ['note', ...note.tags],
      relationships: []
    });
  }

  /**
   * Get processing context for signal analysis
   */
  getProcessingContext(signalId: string): ProcessingContext {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowSize);

    // Get entries within the rolling window
    const recentEntries = Array.from(this.entries.values())
      .filter(entry => entry.timestamp >= windowStart)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Build processing context
    const context: ProcessingContext = {
      signalId,
      worktree: this.extractWorktree(recentEntries),
      agent: this.extractCurrentAgent(recentEntries),
      relatedSignals: this.extractRelatedSignals(recentEntries, signalId),
      activePRPs: this.extractActivePRPs(recentEntries),
      recentActivity: this.extractRecentActivities(recentEntries),
      tokenStatus: this.buildTokenStatus(),
      agentStatus: this.extractAgentStatus(recentEntries),
      sharedNotes: this.extractSharedNotes(recentEntries),
      environment: this.extractEnvironment(recentEntries),
      guidelineContext: this.buildGuidelineContext(recentEntries),
      historicalData: this.buildHistoricalData(recentEntries)
    };

    return context;
  }

  /**
   * Get context summary
   */
  async getContextSummary(timeRange?: { start: Date; end: Date }): Promise<SemanticSummary | null> {
    const now = new Date();
    const start = timeRange?.start || new Date(now.getTime() - this.config.windowSize);
    const end = timeRange?.end || now;

    // Check if we have a recent summary for this range
    const existingSummary = Array.from(this.summaries.values())
      .find(summary =>
        summary.period.start <= start && summary.period.end >= end &&
        (now.getTime() - summary.generatedAt.getTime()) < this.config.summaryInterval
      );

    if (existingSummary) {
      return existingSummary;
    }

    // Generate new summary
    return await this.generateSummary(start, end);
  }

  /**
   * Compress context to fit within token limits
   */
  async compressContext(): Promise<ContextCompressionResult> {
    const startTime = Date.now();
    const originalSize = this.totalTokens;

    logger.info('ContextManager', 'Starting context compression', {
      currentSize: this.totalTokens,
      maxSize: this.config.maxSize,
      threshold: this.config.maxSize * this.config.compressionThreshold
    });

    // Remove old entries
    const removedOld = this.removeOldEntries();

    // Remove low priority entries
    const removedLowPriority = this.removeLowPriorityEntries();

    // Generate summaries for removed entries
    const summariesGenerated = await this.generateSummaries();

    // Apply semantic compression
    await this.applySemanticCompression();

    const finalSize = this.totalTokens;
    const processingTime = Date.now() - startTime;

    const result: ContextCompressionResult = {
      originalSize,
      compressedSize: finalSize,
      compressionRatio: finalSize / originalSize,
      entriesRemoved: removedOld + removedLowPriority,
      summariesGenerated,
      processingTime
    };

    this.lastCompression = new Date();

    logger.info('ContextManager', 'Context compression completed', {
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio,
      processingTime: result.processingTime
    });

    this.emit('context:compressed', result);

    return result;
  }

  /**
   * Get context statistics
   */
  getStatistics(): {
    totalEntries: number;
    totalTokens: number;
    entriesByType: Record<string, number>;
    entriesByPriority: Record<string, number>;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    compressionHistory: Array<{
      timestamp: Date;
      sizeBefore: number;
      sizeAfter: number;
      ratio: number;
    }>;
    summaryCount: number;
  } {
    const entries = Array.from(this.entries.values());
    const entriesByType: Record<string, number> = {};
    const entriesByPriority: Record<string, number> = {};

    entries.forEach(entry => {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
      const priorityRange = this.getPriorityRange(entry.priority);
      entriesByPriority[priorityRange] = (entriesByPriority[priorityRange] || 0) + 1;
    });

    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null;

    return {
      totalEntries: entries.length,
      totalTokens: this.totalTokens,
      entriesByType,
      entriesByPriority,
      oldestEntry,
      newestEntry,
      compressionHistory: [], // Would track compression history
      summaryCount: this.summaries.size
    };
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.entries.clear();
    this.summaries.clear();
    this.totalTokens = 0;

    logger.info('ContextManager', 'Context cleared');

    this.emit('context:cleared');
  }

  /**
   * Check if compression should be triggered
   */
  private shouldCompress(): boolean {
    return this.totalTokens > (this.config.maxSize * this.config.compressionThreshold);
  }

  /**
   * Schedule compression
   */
  private scheduleCompression(): void {
    // Use setImmediate to avoid blocking
    setImmediate(() => {
      this.compressContext().catch(error => {
        logger.error('ContextManager', 'Scheduled compression failed', error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  /**
   * Remove old entries beyond max age
   */
  private removeOldEntries(): number {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.config.maxAge);
    let removed = 0;

    for (const [id, entry] of this.entries) {
      if (entry.timestamp < cutoffTime && entry.type !== 'summary') {
        this.entries.delete(id);
        this.totalTokens -= entry.tokenCount;
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('ContextManager', `Removed ${removed} old entries`);
    }

    return removed;
  }

  /**
   * Remove low priority entries when over capacity
   */
  private removeLowPriorityEntries(): number {
    const entries = Array.from(this.entries.values())
      .filter(entry => entry.type !== 'summary')
      .sort((a, b) => {
        // Sort by priority (ascending), then by timestamp (descending)
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

    let removed = 0;
    const targetSize = this.config.maxSize * 0.7; // Target 70% of max size

    for (const entry of entries) {
      if (this.totalTokens <= targetSize) break;

      // Don't remove high priority or recent entries
      if (entry.priority >= 4 ||
          (Date.now() - entry.timestamp.getTime()) < 300000) { // 5 minutes
        continue;
      }

      this.entries.delete(entry.id);
      this.totalTokens -= entry.tokenCount;
      removed++;
    }

    if (removed > 0) {
      logger.debug('ContextManager', `Removed ${removed} low priority entries`);
    }

    return removed;
  }

  /**
   * Generate summaries for removed entries
   */
  private async generateSummaries(): Promise<number> {
    // In a real implementation, this would use LLM to generate semantic summaries
    // For now, create basic summaries
    const summaryCount = Math.floor(this.entries.size / 10); // One summary per 10 entries

    for (let i = 0; i < summaryCount; i++) {
      const summary: SemanticSummary = {
        id: HashUtils.generateId(),
        period: {
          start: new Date(Date.now() - this.config.windowSize),
          end: new Date()
        },
        type: 'comprehensive',
        content: 'Generated summary of recent context activity',
        keyPoints: [],
        trends: [],
        anomalies: [],
        confidence: 0.8,
        tokenCount: 500,
        generatedAt: new Date(),
        entriesSummarized: []
      };

      this.summaries.set(summary.id, summary);
    }

    return summaryCount;
  }

  /**
   * Apply semantic compression to entries
   */
  private async applySemanticCompression(): Promise<number> {
    let compressed = 0;

    for (const [id, entry] of this.entries) {
      if (entry.compressed) continue;

      // Compress text-based entries
      if (typeof entry.data === 'string' && entry.data.length > 1000) {
        const originalTokens = entry.tokenCount;
        const compressedData = this.truncateText(entry.data, Math.floor(entry.tokenCount * 0.6));
        entry.data = compressedData;
        entry.tokenCount = this.estimateTokens(compressedData);
        entry.compressed = true;

        this.totalTokens -= (originalTokens - entry.tokenCount);
        compressed++;
      }
    }

    return compressed;
  }

  /**
   * Generate semantic summary for time range
   */
  private async generateSummary(start: Date, end: Date): Promise<SemanticSummary> {
    // Get entries in time range
    const entries = Array.from(this.entries.values())
      .filter(entry => entry.timestamp >= start && entry.timestamp <= end);

    // Generate summary content
    const summary: SemanticSummary = {
      id: HashUtils.generateId(),
      period: { start, end },
      type: 'comprehensive',
      content: this.generateBasicSummary(entries),
      keyPoints: this.extractKeyPoints(entries),
      trends: this.extractTrends(entries),
      anomalies: this.extractAnomalies(entries),
      confidence: 0.7,
      tokenCount: 800,
      generatedAt: new Date(),
      entriesSummarized: entries.map(e => e.id)
    };

    this.summaries.set(summary.id, summary);
    this.lastSummary = new Date();

    return summary;
  }

  /**
   * Generate basic summary text
   */
  private generateBasicSummary(entries: ContextEntry[]): string {
    const signalCount = entries.filter(e => e.type === 'signal').length;
    const activityCount = entries.filter(e => e.type === 'activity').length;
    const agentCount = entries.filter(e => e.type === 'agent_status').length;

    return `Summary period includes ${signalCount} signals, ${activityCount} activities, and ${agentCount} agent status updates.`;
  }

  /**
   * Extract key points from entries
   */
  private extractKeyPoints(entries: ContextEntry[]): string[] {
    // In a real implementation, this would use NLP to extract key points
    return [];
  }

  /**
   * Extract trends from entries
   */
  private extractTrends(entries: ContextEntry[]): string[] {
    // In a real implementation, this would analyze trends
    return [];
  }

  /**
   * Extract anomalies from entries
   */
  private extractAnomalies(entries: ContextEntry[]): string[] {
    // In a real implementation, this would detect anomalies
    return [];
  }

  /**
   * Extract worktree from entries
   */
  private extractWorktree(entries: ContextEntry[]): string | undefined {
    const envEntry = entries.find(e => e.type === 'environment');
    return envEntry?.data?.worktree;
  }

  /**
   * Extract current agent from entries
   */
  private extractCurrentAgent(entries: ContextEntry[]): string | undefined {
    const agentEntry = entries.find(e => e.type === 'agent_status' && e.data?.status === 'active');
    return agentEntry?.data?.name;
  }

  /**
   * Extract related signals
   */
  private extractRelatedSignals(entries: ContextEntry[], currentSignalId: string): Signal[] {
    return entries
      .filter(e => e.type === 'signal' && e.data?.id !== currentSignalId)
      .slice(0, 10) // Limit to 10 recent signals
      .map(e => e.data);
  }

  /**
   * Extract active PRPs
   */
  private extractActivePRPs(entries: ContextEntry[]): string[] {
    const prpRefs = entries
      .filter(e => e.data?.prpId)
      .map(e => e.data.prpId);

    return [...new Set(prpRefs)]; // Remove duplicates
  }

  /**
   * Extract recent activities
   */
  private extractRecentActivities(entries: ContextEntry[]): ActivityEntry[] {
    return entries
      .filter(e => e.type === 'activity')
      .slice(0, 20) // Limit to 20 recent activities
      .map(e => e.data);
  }

  /**
   * Build token status
   */
  private buildTokenStatus(): TokenStatusInfo {
    return {
      totalUsed: this.totalTokens,
      totalLimit: this.config.maxSize,
      approachingLimit: this.totalTokens > (this.config.maxSize * 0.8),
      criticalLimit: this.totalTokens > (this.config.maxSize * 0.95),
      agentBreakdown: {},
      projections: {
        daily: 0,
        weekly: 0,
        monthly: 0
      }
    };
  }

  /**
   * Extract agent status
   */
  private extractAgentStatus(entries: ContextEntry[]): AgentStatusInfo[] {
    return entries
      .filter(e => e.type === 'agent_status')
      .slice(0, 10) // Limit to 10 agents
      .map(e => e.data);
  }

  /**
   * Extract shared notes
   */
  private extractSharedNotes(entries: ContextEntry[]): SharedNoteInfo[] {
    return entries
      .filter(e => e.type === 'note')
      .slice(0, 15) // Limit to 15 notes
      .map(e => e.data);
  }

  /**
   * Extract environment info
   */
  private extractEnvironment(entries: ContextEntry[]): EnvironmentInfo {
    const envEntry = entries.find(e => e.type === 'environment');
    return envEntry?.data || {
      worktree: '',
      branch: '',
      availableTools: [],
      systemCapabilities: [],
      constraints: {},
      recentChanges: { count: 0, types: {}, lastChange: new Date() }
    };
  }

  /**
   * Build guideline context
   */
  private buildGuidelineContext(entries: ContextEntry[]): GuidelineContext {
    return {
      applicableGuidelines: [],
      enabledGuidelines: [],
      disabledGuidelines: [],
      protocolSteps: {},
      requirements: {
        met: [],
        unmet: [],
        blocked: []
      }
    };
  }

  /**
   * Build historical data
   */
  private buildHistoricalData(entries: ContextEntry[]): HistoricalData {
    return {
      similarSignals: [],
      agentPerformance: {},
      systemPerformance: {
        averageProcessingTime: 0,
        successRate: 0,
        tokenEfficiency: 0
      },
      recentPatterns: []
    };
  }

  /**
   * Get priority range string
   */
  private getPriorityRange(priority: number): string {
    if (priority >= 9) return 'critical';
    if (priority >= 7) return 'high';
    if (priority >= 5) return 'medium';
    if (priority >= 3) return 'low';
    return 'info';
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: any): number {
    if (typeof text === 'string') {
      return Math.ceil(text.length / 4);
    } else if (typeof text === 'object') {
      return Math.ceil(JSON.stringify(text).length / 4);
    }
    return 10; // Base estimation for other types
  }

  /**
   * Truncate text to target token count
   */
  private truncateText(text: string, targetTokens: number): string {
    const targetChars = targetTokens * 4; // Rough conversion
    if (text.length <= targetChars) {
      return text;
    }
    return text.substring(0, targetChars - 3) + '...';
  }

  /**
   * Start maintenance timer
   */
  private startMaintenanceTimer(): void {
    setInterval(() => {
      this.performMaintenance().catch(error => {
        logger.error('ContextManager', 'Maintenance failed', error instanceof Error ? error : new Error(String(error)));
      });
    }, this.config.summaryInterval);
  }

  /**
   * Perform periodic maintenance
   */
  private async performMaintenance(): Promise<void> {
    const now = new Date();

    // Check if compression is needed
    if (this.shouldCompress()) {
      await this.compressContext();
    }

    // Generate periodic summary if needed
    if (now.getTime() - this.lastSummary.getTime() > this.config.summaryInterval) {
      await this.getContextSummary();
    }

    // Emit maintenance event
    this.emit('maintenance:completed', {
      timestamp: now,
      entriesCount: this.entries.size,
      tokensUsed: this.totalTokens
    });
  }
}