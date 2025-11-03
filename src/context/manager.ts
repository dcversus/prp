/**
 * 🎵 Context Management System for ♫ @dcversus/prp
 *
 * Manages LLM context caps with musical orchestration theme:
 * - Conductor (Orchestrator): 200k+ tokens for full system oversight
 * - Performers (Agents): 120k+ tokens for individual performances
 */

export interface ContextCaps {
  maxTokens: number;
  compressionLevel: 'low' | 'medium' | 'high';
  retentionPriority: 'high' | 'medium' | 'low';
}

export interface ContextState {
  id: string;
  type: 'conductor' | 'performer';
  currentTokens: number;
  maxTokens: number;
  lastActivity: Date;
  compressionHistory: CompressionEntry[];
}

export interface CompressionEntry {
  timestamp: Date;
  originalTokens: number;
  compressedTokens: number;
  method: string;
  retainedSignals: string[];
}

export interface ContextSegment {
  id: string;
  content: string;
  tokens: number;
  priority: number;
  signals: string[];
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export interface ProgressCallback {
  onProgress?: (stage: string, progress: number) => void;
  onStatusChange?: (oldStatus: ContextStatus, newStatus: ContextStatus) => void;
  onCompression?: (segment: ContextSegment, ratio: number) => void;
}

export enum ContextStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  ACTIVE = 'active',
  COMPRESSING = 'compressing',
  ERROR = 'error'
}

/**
 * 🎵 Context Manager - The Conductor of Context Orchestration
 */
export class ContextManager {
  private contexts: Map<string, ContextState> = new Map();
  private segments: Map<string, ContextSegment[]> = new Map();
  private callbacks: ProgressCallback = {};

  // Context caps configuration
  private readonly CONDUCTOR_CAPS: ContextCaps = {
    maxTokens: 200_000,
    compressionLevel: 'low',
    retentionPriority: 'high'
  };

  private readonly PERFORMER_CAPS: ContextCaps = {
    maxTokens: 120_000,
    compressionLevel: 'medium',
    retentionPriority: 'medium'
  };

  /**
   * 🎼 Initialize a new context session
   */
  initializeContext(id: string, type: 'conductor' | 'performer'): ContextState {
    const caps = type === 'conductor' ? this.CONDUCTOR_CAPS : this.PERFORMER_CAPS;

    const context: ContextState = {
      id,
      type,
      currentTokens: 0,
      maxTokens: caps.maxTokens,
      lastActivity: new Date(),
      compressionHistory: []
    };

    this.contexts.set(id, context);
    this.segments.set(id, []);

    this.callbacks.onStatusChange?.(ContextStatus.IDLE, ContextStatus.ACTIVE);

    return context;
  }

  /**
   * 📝 Add content to context with intelligent management
   */
  async addContent(
    contextId: string,
    content: string,
    priority: number = 5,
    signals: string[] = []
  ): Promise<void> {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    // Estimate tokens (rough estimation: ~4 characters per token)
    const estimatedTokens = Math.ceil(content.length / 4);

    // Check if compression is needed
    if (context.currentTokens + estimatedTokens > context.maxTokens) {
      await this.compressContext(contextId);
    }

    // Create new segment
    const segment: ContextSegment = {
      id: this.generateSegmentId(),
      content,
      tokens: estimatedTokens,
      priority,
      signals,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1
    };

    // Add segment
    const segments = this.segments.get(contextId) || [];
    segments.push(segment);
    this.segments.set(contextId, segments);

    // Update context state
    context.currentTokens += estimatedTokens;
    context.lastActivity = new Date();

    this.callbacks.onProgress?.('Content Added', this.calculateUsageRatio(context));
  }

  /**
   * 🗜️ Intelligent context compression
   */
  private async compressContext(contextId: string): Promise<void> {
    const context = this.contexts.get(contextId);
    const segments = this.segments.get(contextId) || [];

    if (!context || segments.length === 0) return;

    this.callbacks.onStatusChange?.(ContextStatus.ACTIVE, ContextStatus.COMPRESSING);

    // Sort segments by priority and access patterns
    const sortedSegments = segments.sort((a, b) => {
      // High priority segments come first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Then by recency (more recently accessed)
      return b.lastAccessed.getTime() - a.lastAccessed.getTime();
    });

    // Calculate target size (80% of max to leave room)
    const targetTokens = Math.floor(context.maxTokens * 0.8);
    let currentTokens = 0;
    const retainedSegments: ContextSegment[] = [];

    // Keep segments until we reach target
    for (const segment of sortedSegments) {
      if (currentTokens + segment.tokens <= targetTokens) {
        retainedSegments.push(segment);
        currentTokens += segment.tokens;
      } else {
        break;
      }
    }

    // Calculate compression metrics
    const originalTokens = context.currentTokens;
    const compressedTokens = currentTokens;
    const compressionRatio = compressedTokens / originalTokens;

    // Record compression history
    const compressionEntry: CompressionEntry = {
      timestamp: new Date(),
      originalTokens,
      compressedTokens,
      method: 'priority-based',
      retainedSignals: this.extractSignals(retainedSegments)
    };

    context.compressionHistory.push(compressionEntry);

    // Update segments and context
    this.segments.set(contextId, retainedSegments);
    context.currentTokens = compressedTokens;

    // Notify about compression
    retainedSegments.forEach(segment => {
      this.callbacks.onCompression?.(segment, compressionRatio);
    });

    this.callbacks.onStatusChange?.(ContextStatus.COMPRESSING, ContextStatus.ACTIVE);
    this.callbacks.onProgress?.('Context Compressed', this.calculateUsageRatio(context));
  }

  /**
   * 🎯 Get context usage ratio
   */
  getUsageRatio(contextId: string): number {
    const context = this.contexts.get(contextId);
    if (!context) return 0;

    return this.calculateUsageRatio(context);
  }

  /**
   * 📊 Get context statistics
   */
  getContextStats(contextId: string): {
    currentTokens: number;
    maxTokens: number;
    usageRatio: number;
    segmentCount: number;
    compressionCount: number;
    status: ContextStatus;
  } | null {
    const context = this.contexts.get(contextId);
    const segments = this.segments.get(contextId) || [];

    if (!context) return null;

    return {
      currentTokens: context.currentTokens,
      maxTokens: context.maxTokens,
      usageRatio: this.calculateUsageRatio(context),
      segmentCount: segments.length,
      compressionCount: context.compressionHistory.length,
      status: this.determineStatus(context)
    };
  }

  /**
   * 🎵 Set progress callbacks
   */
  setCallbacks(callbacks: ProgressCallback): void {
    this.callbacks = callbacks;
  }

  /**
   * 🧹 Clean up inactive contexts
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const inactiveContexts: string[] = [];

    for (const [id, context] of this.contexts) {
      if (now.getTime() - context.lastActivity.getTime() > maxAge) {
        inactiveContexts.push(id);
      }
    }

    inactiveContexts.forEach(id => {
      this.contexts.delete(id);
      this.segments.delete(id);
    });
  }

  // Private helper methods

  private calculateUsageRatio(context: ContextState): number {
    return context.currentTokens / context.maxTokens;
  }

  private determineStatus(context: ContextState): ContextStatus {
    const now = new Date();
    const timeSinceActivity = now.getTime() - context.lastActivity.getTime();

    if (timeSinceActivity > 5 * 60 * 1000) return ContextStatus.IDLE;
    if (this.calculateUsageRatio(context) > 0.9) return ContextStatus.COMPRESSING;
    return ContextStatus.ACTIVE;
  }

  private extractSignals(segments: ContextSegment[]): string[] {
    const signalSet = new Set<string>();

    segments.forEach(segment => {
      segment.signals.forEach(signal => signalSet.add(signal));
    });

    return Array.from(signalSet);
  }

  private generateSegmentId(): string {
    return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 🎵 Global context manager instance
 */
export const contextManager = new ContextManager();

/**
 * 🎵 Utility function to create context with automatic type detection
 */
export function createContext(id: string, type?: 'conductor' | 'performer'): ContextState {
  const detectedType = type || (id.includes('conductor') || id.includes('orchestrator') ? 'conductor' : 'performer');
  return contextManager.initializeContext(id, detectedType);
}