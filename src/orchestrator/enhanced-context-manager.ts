/**
 * ♫ Enhanced Context Manager for @dcversus/prp Orchestrator
 *
 * Integrates context aggregation, PRP section extraction, agent context sharing,
 * and dynamic updates into a unified context management system.
 */

import { ContextManager } from './context-manager';
import {
  AggregationStrategy,
  ContextSession,
  EnhancedContextManager as IEnhancedContextManager,
  AggregatedContext,
  PRPSectionType,
  EnhancedContextSection,
  ContextUpdate
} from './types';
import { ContextAggregator } from './context-aggregator';
import { PRPSectionExtractor } from './prp-section-extractor';
import { ContextBrokerImpl } from './agent-context-broker';
import { DynamicContextUpdaterImpl } from './dynamic-context-updater';
import { PRPFile, Signal } from '../shared/types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('orchestrator');

/**
 * Enhanced Context Manager - Unified context management system
 */
export class EnhancedContextManager extends ContextManager implements IEnhancedContextManager {
  public readonly aggregator: ContextAggregator;
  public readonly extractor: PRPSectionExtractor;
  public readonly broker: ContextBrokerImpl;
  public readonly updater: DynamicContextUpdaterImpl;

  // Additional state for enhanced features
  private activeSessions: Map<string, ContextSession> = new Map();
  private prpRegistry: Map<string, PRPFile> = new Map();
  private contexts: Map<string, EnhancedContextSection> = new Map();
  private contextMetrics: {
    aggregationsCreated: number;
    sectionsExtracted: number;
    contextsShared: number;
    updatesProcessed: number;
    conflictsResolved: number;
  };

  constructor(contextLimits: Record<string, unknown> = {}) {
    super(contextLimits);

    // Initialize enhanced components
    this.aggregator = new ContextAggregator((contextLimits.total as number) ?? 200000);
    this.extractor = new PRPSectionExtractor();
    this.broker = new ContextBrokerImpl();
    this.updater = new DynamicContextUpdaterImpl();

    // Initialize metrics
    this.contextMetrics = {
      aggregationsCreated: 0,
      sectionsExtracted: 0,
      contextsShared: 0,
      updatesProcessed: 0,
      conflictsResolved: 0
    };

    logger.info('EnhancedContextManager', 'Enhanced context manager initialized');
  }

  /**
   * Aggregate and share contexts between multiple PRPs and agents
   */
  async aggregateAndShareContexts(
    prpIds: string[],
    agents: string[],
    strategy: AggregationStrategy = AggregationStrategy.TOKEN_OPTIMIZED
  ): Promise<AggregatedContext> {
    logger.debug('aggregateAndShareContexts', `Aggregating ${prpIds.length} PRPs for ${agents.length} agents`);

    try {
      // Create aggregated context
      const aggregatedContext = await this.aggregator.aggregateContexts(prpIds, strategy);

      // Create sharing session
      const session = await this.broker.establishContextSession(agents);
      this.activeSessions.set(session.id, session);

      // Share aggregated sections with all agents
      for (const agent of agents) {
        for (const section of aggregatedContext.sections) {
          await this.broker.shareContext('system', agent, section);
          this.contextMetrics.contextsShared++;
        }
      }

      // Subscribe agents to context updates
      for (const agent of agents) {
        await this.updater.subscribeToContextUpdates(
          aggregatedContext.id,
          async (update: ContextUpdate) => {
            logger.debug('contextUpdate', `Broadcasting update to agent ${agent}`, {
              updateType: update.updateType,
              source: update.source
            });
          }
        );
      }

      this.contextMetrics.aggregationsCreated++;

      logger.info('aggregateAndShareContexts', 'Context aggregation and sharing completed', {
        sessionId: session.id,
        sections: aggregatedContext.sections.length,
        agents: agents.length,
        strategy
      });

      return aggregatedContext;

    } catch (error) {
      logger.error('aggregateAndShareContexts', 'Failed to aggregate and share contexts',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Extract and share specific PRP section with target agent
   */
  async extractAndSharePRPSection(
    prpId: string,
    sectionType: PRPSectionType,
    targetAgent: string
  ): Promise<void> {
    logger.debug('extractAndSharePRPSection', `Extracting ${sectionType} from ${prpId} for ${targetAgent}`);

    try {
      // Get PRP from registry
      const prp = this.prpRegistry.get(prpId);
      if (!prp) {
        throw new Error(`PRP ${prpId} not found in registry`);
      }

      // Extract section
      const section = await this.extractor.extractSection(prp, sectionType);
      this.contextMetrics.sectionsExtracted++;

      // Share with target agent
      await this.broker.shareContext('system', targetAgent, section);
      this.contextMetrics.contextsShared++;

      logger.info('extractAndSharePRPSection', 'Section extracted and shared successfully', {
        prpId,
        sectionType,
        targetAgent,
        sectionId: section.id
      });

    } catch (error) {
      logger.error('extractAndSharePRPSection', 'Failed to extract and share section',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Create context session for multiple agents
   */
  async createContextSession(participants: string[]): Promise<ContextSession> {
    logger.debug('createContextSession', `Creating context session for ${participants.length} agents`);

    try {
      const session = await this.broker.establishContextSession(participants);
      this.activeSessions.set(session.id, session);

      logger.info('createContextSession', 'Context session created', {
        sessionId: session.id,
        participants: participants.length
      });

      return session;

    } catch (error) {
      logger.error('createContextSession', 'Failed to create context session',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Enable real-time synchronization for contexts
   */
  async enableRealTimeSync(contextIds: string[]): Promise<void> {
    logger.debug('enableRealTimeSync', `Enabling real-time sync for ${contextIds.length} contexts`);

    try {
      // Subscribe to updates for all specified contexts
      for (const contextId of contextIds) {
        await this.updater.subscribeToContextUpdates(contextId, async (update: ContextUpdate) => {
          // Broadcast update to all relevant agents
          await this.broker.broadcastUpdate(update);
          this.contextMetrics.updatesProcessed++;
        });
      }

      // Set up synchronization
      const syncResult = await this.updater.synchronizeContexts(contextIds);

      if (!syncResult.success) {
        logger.warn('enableRealTimeSync', 'Synchronization completed with issues', {
          conflicts: syncResult.conflicts.length,
          errors: syncResult.errors.length
        });
      }

      logger.info('enableRealTimeSync', 'Real-time sync enabled', {
        contexts: contextIds.length,
        success: syncResult.success
      });

    } catch (error) {
      logger.error('enableRealTimeSync', 'Failed to enable real-time sync',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Register PRP in the enhanced context manager
   */
  async registerPRP(prp: PRPFile): Promise<void> {
    logger.debug('registerPRP', `Registering PRP ${prp.name}`);

    try {
      // Store in registry
      this.prpRegistry.set(prp.name, prp);

      // Update base context manager
      await this.updatePRPContext(prp);

      // Extract all sections for enhanced features
      const sections = await this.extractor.extractAllSections(prp);
      this.contextMetrics.sectionsExtracted += sections.length;

      logger.info('registerPRP', 'PRP registered successfully', {
        prpName: prp.name,
        sectionsExtracted: sections.length
      });

    } catch (error) {
      logger.error('registerPRP', `Failed to register PRP ${prp.name}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get context insights and analytics
   */
  getContextInsights(): {
    metrics: {
      aggregationsCreated: number;
      sectionsExtracted: number;
      contextsShared: number;
      updatesProcessed: number;
      conflictsResolved: number;
    };
    activeSessions: number;
    registeredPRPs: number;
    sharedContexts: number;
    pendingUpdates: number;
    } {
    return {
      metrics: { ...this.contextMetrics },
      activeSessions: this.activeSessions.size,
      registeredPRPs: this.prpRegistry.size,
      sharedContexts: this.broker.getSharedContexts('system').length,
      pendingUpdates: this.updater.getPendingUpdates().size
    };
  }

  /**
   * Enhanced context building with aggregation and sharing
   */
  async buildEnhancedContext(
    signal: Signal,
    orchestratorState: unknown,
    options: {
      includeAggregated?: boolean;
      includeShared?: boolean;
      aggregationStrategy?: AggregationStrategy;
      relevantPRPs?: string[];
    } = {}
  ): Promise<{
    prompt: string;
    contextWindow: {
      total: number;
      used: number;
      available: number;
      sections: {
        agents: number;
        shared: number;
        prp: number;
        tools: number;
        system: number;
      };
    };
    sections: {
      id: string;
      type: string;
      content: string;
      tokens: number;
      compressible: boolean;
    }[];
    aggregatedContext?: AggregatedContext;
    sharedContexts: unknown[];
  }> {
    logger.debug('buildEnhancedContext', `Building enhanced context for signal ${signal.type}`);

    try {
      // Build base context
      const baseContext = await this.buildContext(signal, orchestratorState);

      let aggregatedContext: AggregatedContext | undefined;
      let sharedContexts: unknown[] = [];

      // Add aggregated context if requested
      if (options.includeAggregated && options.relevantPRPs) {
        aggregatedContext = await this.aggregator.aggregateContexts(
          options.relevantPRPs,
          options.aggregationStrategy ?? AggregationStrategy.TOKEN_OPTIMIZED
        );
      }

      // Add shared contexts if requested
      if (options.includeShared) {
        // This would get shared contexts relevant to the signal
        sharedContexts = this.broker.getSharedContexts('system');
      }

      logger.info('buildEnhancedContext', 'Enhanced context built successfully', {
        baseSections: baseContext.sections.length,
        hasAggregated: !!aggregatedContext,
        sharedContexts: sharedContexts.length
      });

      return {
        ...baseContext,
        aggregatedContext,
        sharedContexts
      };

    } catch (error) {
      logger.error('buildEnhancedContext', 'Failed to build enhanced context',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Cleanup enhanced context manager resources
   */
  override async cleanup(): Promise<void> {
    logger.info('cleanup', 'Cleaning up enhanced context manager');

    try {
      // Cleanup base context manager
      await super.cleanup();

      // Cleanup enhanced components
      this.broker.cleanup();
      this.updater.cleanup();

      // Clear registries
      this.activeSessions.clear();
      this.prpRegistry.clear();

      logger.info('cleanup', 'Enhanced context manager cleaned up successfully');

    } catch (error) {
      logger.error('cleanup', 'Error during cleanup',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get comprehensive context summary
   */
  getEnhancedContextSummary(): {
    base: unknown;
    enhanced: {
      sessions: Array<{ id: string; participants: string[]; createdAt: Date }>;
      prps: Array<{ name: string; lastModified: Date }>;
      metrics: {
        aggregationsCreated: number;
        sectionsExtracted: number;
        contextsShared: number;
        updatesProcessed: number;
        conflictsResolved: number;
      };
    };
    } {
    const base = super.getContextSummary();

    const sessions = Array.from(this.activeSessions.values()).map((session: ContextSession) => ({
      id: session.id,
      participants: session.participants,
      createdAt: session.createdAt
    }));

    const prps = Array.from(this.prpRegistry.values()).map((prp: PRPFile) => ({
      name: prp.name,
      lastModified: prp.lastModified
    }));

    return {
      base,
      enhanced: {
        sessions,
        prps,
        metrics: { ...this.contextMetrics }
      }
    };
  }

  /**
   * Handle signal with enhanced context features
   */
  async handleSignal(signal: Signal): Promise<{
    processed: boolean;
    contextUsed: boolean;
    actions: string[];
  }> {
    logger.debug('handleSignal', `Processing signal ${signal.type}`);

    const actions: string[] = [];
    let contextUsed = false;

    try {
      // Extract relevant sections from PRPs based on signal
      for (const [prpName, prp] of this.prpRegistry) {
        try {
          const relevantSections = await this.extractor.extractRelevantSections(prp, signal);
          if (relevantSections.length > 0) {
            actions.push(`Extracted ${relevantSections.length} relevant sections from ${prpName}`);
            contextUsed = true;

            // Update context usage metrics
            relevantSections.forEach((section: EnhancedContextSection) => {
              section.accessCount++;
              section.lastAccessed = new Date();
            });
          }
        } catch (error) {
          logger.warn('handleSignal', `Failed to extract sections from ${prpName}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Broadcast signal to relevant agents if needed
       
      if (typeof signal.data === 'object' && signal.data !== null) {
        const targetAgents = (signal.data as { targetAgents?: unknown[] }).targetAgents;
        if (Array.isArray(targetAgents)) {
          for (const agent of targetAgents) {
            if (typeof agent === 'string') {
              const sharedContexts = this.broker.getSharedContexts(agent);
              if (sharedContexts.length > 0) {
                actions.push(`Shared context available for agent ${agent}`);
                contextUsed = true;
              }
            }
          }
        }
      }

      logger.info('handleSignal', 'Signal processed successfully', {
        signalType: signal.type,
        actionsCount: actions.length,
        contextUsed
      });

      return {
        processed: true,
        contextUsed,
        actions
      };

    } catch (error) {
      logger.error('handleSignal', `Failed to process signal ${signal.type}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        processed: false,
        contextUsed: false,
        actions: []
      };
    }
  }

  /**
   * Monitor and optimize context performance
   */
  async optimizeContextPerformance(): Promise<{
    optimizationsApplied: string[];
    performanceGains: {
      tokenReduction: number;
      accessImprovement: number;
      conflictReduction: number;
    };
  }> {
    logger.debug('optimizeContextPerformance', 'Starting context performance optimization');

    const optimizationsApplied: string[] = [];
    let tokenReduction = 0;
    let accessImprovement = 0;
    let conflictReduction = 0;

    try {
      // Optimize shared contexts
      const sharedContexts = this.broker.getSharedContexts('system');
      for (const context of sharedContexts) {
        if (context.accessCount === 0 && context.lastAccessed < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          // Remove unused old contexts
          await this.broker.revokeContext(context.id, 'system');
          optimizationsApplied.push(`Removed unused context ${context.id}`);
          tokenReduction += context.tokens;
        }
      }

      // Resolve pending updates
      const pendingUpdates = this.updater.getPendingUpdates();
      for (const [contextId, pending] of pendingUpdates) {
        if (pending.retryCount >= pending.maxRetries) {
          await this.updater.resolvePendingUpdate(contextId, 'reject');
          optimizationsApplied.push(`Rejected stale pending update for ${contextId}`);
          conflictReduction++;
        }
      }

      // Clean up inactive sessions
      const sessionsToClean: string[] = [];
      for (const [sessionId, session] of this.activeSessions) {
        const hoursSinceActivity = (Date.now() - session.lastActivity.getTime()) / (1000 * 60 * 60);
        if (hoursSinceActivity > 48) {
          sessionsToClean.push(sessionId);
        }
      }

      for (const sessionId of sessionsToClean) {
        this.activeSessions.delete(sessionId);
        optimizationsApplied.push(`Cleaned up inactive session ${sessionId}`);
        accessImprovement++;
      }

      logger.info('optimizeContextPerformance', 'Context optimization completed', {
        optimizationsApplied: optimizationsApplied.length,
        tokenReduction,
        accessImprovement,
        conflictReduction
      });

      return {
        optimizationsApplied,
        performanceGains: {
          tokenReduction,
          accessImprovement,
          conflictReduction
        }
      };

    } catch (error) {
      logger.error('optimizeContextPerformance', 'Failed to optimize context performance',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        optimizationsApplied: [],
        performanceGains: {
          tokenReduction: 0,
          accessImprovement: 0,
          conflictReduction: 0
        }
      };
    }
  }

  // Implement required interface methods
  async getContext(signalId: string): Promise<EnhancedContextSection | null> {
    // Implementation for getting context by signal ID
    const context = this.contexts.get(signalId);
    return context ?? null;
  }

  async updateContext(signalId: string, context: EnhancedContextSection): Promise<void> {
    // Implementation for updating context
    this.contexts.set(signalId, context);
    logger.debug('updateContext', `Context updated for signal ${signalId}`);
  }

  async deleteContext(signalId: string): Promise<void> {
    // Implementation for deleting context
    this.contexts.delete(signalId);
    logger.debug('deleteContext', `Context deleted for signal ${signalId}`);
  }

  async optimizeContexts(contextIds: string[]): Promise<EnhancedContextSection[]> {
    // Implementation for optimizing multiple contexts
    const optimizedContexts: EnhancedContextSection[] = [];

    for (const contextId of contextIds) {
      const context = this.contexts.get(contextId);
      if (context) {
        // Apply optimization logic (placeholder)
        optimizedContexts.push(context);
      }
    }

    logger.debug('optimizeContexts', `Optimized ${optimizedContexts.length} contexts`);
    return optimizedContexts;
  }

  async mergeContexts(contexts: EnhancedContextSection[]): Promise<EnhancedContextSection> {
    // Implementation for merging multiple contexts
    if (contexts.length === 0) {
      throw new Error('Cannot merge empty context list');
    }

    if (contexts.length === 1) {
      const context = contexts[0];
      if (!context) {
        throw new Error('Context array contains undefined element');
      }
      return context;
    }

    // Simple merge strategy - combine data and update metadata
    const merged: EnhancedContextSection = {
      id: HashUtils.generateId(),
      name: `Merged-${contexts[0]?.name ?? 'unknown'}`,
      content: contexts.map((c: EnhancedContextSection) => c.content).join('\n\n'),
      tokens: contexts.reduce((sum: number, c: EnhancedContextSection) => sum + c.tokens, 0),
      priority: Math.max(...contexts.map((c: EnhancedContextSection) => c.priority)),
      required: contexts.some((c: EnhancedContextSection) => c.required),
      compressible: contexts.every((c: EnhancedContextSection) => c.compressible),
      lastUpdated: new Date(),
      source: 'merged',
      version: 1,
      tags: [...new Set(contexts.flatMap((c: EnhancedContextSection) => c.tags))],
      permissions: [...new Set(contexts.flatMap((c: EnhancedContextSection) => c.permissions))],
      dependencies: [...new Set(contexts.flatMap((c: EnhancedContextSection) => c.dependencies))],
      relevanceScore: Math.max(...contexts.map((c: EnhancedContextSection) => c.relevanceScore ?? 0)),
      lastAccessed: new Date(),
      accessCount: 0
    };

    logger.debug('mergeContexts', `Merged ${contexts.length} contexts into one`);
    return merged;
  }
}