/**
 * ♫ Dynamic Context Updater for @dcversus/prp Orchestrator
 *
 * Handles real-time context synchronization, updates, and subscriptions
 * with conflict resolution and version management.
 */

import {
  DynamicContextUpdater,
  ContextUpdate,
  UpdateCallback,
  Subscription,
  SyncResult,
  ContextConflict,
  EnhancedContextSection
} from './types';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('orchestrator');

interface ContextVersion {
  version: number;
  content: string;
  timestamp: Date;
  source: string;
  checksum: string;
}

interface PendingUpdate {
  update: ContextUpdate;
  dependencies: string[];
  conflicts: string[];
  retryCount: number;
  maxRetries: number;
}

/**
 * Dynamic Context Updater - Manages real-time context synchronization
 */
export class DynamicContextUpdaterImpl implements DynamicContextUpdater {
  private contexts: Map<string, EnhancedContextSection> = new Map();
  private contextVersions: Map<string, ContextVersion[]> = new Map();
  private subscriptions: Map<string, Subscription[]> = new Map(); // contextId -> subscriptions
  private pendingUpdates: Map<string, PendingUpdate> = new Map();
  private updateQueue: ContextUpdate[] = [];
  private isProcessingQueue = false;
  private conflictResolver: ConflictResolver;
  private maxVersions = 50; // Keep last 50 versions per context

  constructor() {
    this.conflictResolver = new ConflictResolver();
    this.startQueueProcessor();
  }

  /**
   * Update a context with new content
   */
  async updateContext(contextId: string, updates: ContextUpdate): Promise<void> {
    logger.debug('updateContext', `Updating context ${contextId}`);

    try {
      // Validate the update
      this.validateUpdate(updates);

      // Get current context
      const currentContext = this.contexts.get(contextId);
      if (!currentContext && updates.updateType === 'update') {
        throw new Error(`Context ${contextId} not found for update`);
      }

      // Detect conflicts
      const conflicts = await this.detectConflicts(contextId, updates);
      if (conflicts.length > 0) {
        logger.warn('updateContext', `Conflicts detected for context ${contextId}`, {
          conflicts: conflicts.length
        });

        // Try to resolve conflicts automatically
        const resolutions = await this.conflictResolver.resolve(conflicts);
        if (resolutions.some(r => r.requiresManual)) {
          // Add to pending updates for manual resolution
          this.addPendingUpdate(contextId, updates, conflicts);
          return;
        }
      }

      // Apply the update
      await this.applyUpdate(contextId, updates);

      // Notify subscribers
      await this.notifySubscribers(contextId, updates);

      logger.info('updateContext', `Context ${contextId} updated successfully`, {
        updateType: updates.updateType,
        source: updates.source
      });

    } catch (error) {
      logger.error('updateContext', `Failed to update context ${contextId}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Subscribe to context updates
   */
  async subscribeToContextUpdates(
    contextId: string,
    callback: UpdateCallback
  ): Promise<Subscription> {
    logger.debug('subscribeToContextUpdates', `Subscribing to updates for context ${contextId}`);

    try {
      const subscription: Subscription = {
        id: this.generateSubscriptionId(),
        contextId,
        callback,
        createdAt: new Date(),
        active: true
      };

      // Add to subscriptions map
      if (!this.subscriptions.has(contextId)) {
        this.subscriptions.set(contextId, []);
      }
      const subscriptions = this.subscriptions.get(contextId);
      if (subscriptions) {
        subscriptions.push(subscription);
      }

      logger.info('subscribeToContextUpdates', 'Subscription created', {
        subscriptionId: subscription.id,
        contextId
      });

      return subscription;

    } catch (error) {
      logger.error('subscribeToContextUpdates', `Failed to create subscription for context ${contextId}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Synchronize multiple contexts
   */
  async synchronizeContexts(contextIds: string[]): Promise<SyncResult> {
    logger.debug('synchronizeContexts', `Synchronizing ${contextIds.length} contexts`);

    try {
      const syncResult: SyncResult = {
        success: true,
        syncedContexts: [],
        conflicts: [],
        errors: []
      };

      // Group contexts by dependencies
      const contextGroups = this.groupContextsByDependencies(contextIds);

      // Sync each group in order
      for (const group of contextGroups) {
        try {
          await this.syncContextGroup(group);
          syncResult.syncedContexts.push(...group);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          syncResult.errors.push(`Failed to sync group ${group.join(', ')}: ${errorMessage}`);
          syncResult.success = false;
        }
      }

      // Check for cross-context conflicts
      const crossContextConflicts = await this.detectCrossContextConflicts(contextIds);
      syncResult.conflicts.push(...crossContextConflicts);

      if (crossContextConflicts.length > 0) {
        syncResult.success = false;
      }

      logger.info('synchronizeContexts', 'Synchronization completed', {
        totalContexts: contextIds.length,
        syncedContexts: syncResult.syncedContexts.length,
        conflicts: syncResult.conflicts.length,
        errors: syncResult.errors.length,
        success: syncResult.success
      });

      return syncResult;

    } catch (error) {
      logger.error('synchronizeContexts', 'Failed to synchronize contexts',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Broadcast update to all relevant contexts
   */
  async broadcastUpdate(update: ContextUpdate): Promise<void> {
    logger.debug('broadcastUpdate', `Broadcasting update from ${update.source}`);

    try {
      // Find all contexts that should receive this update
      const relevantContexts = this.findRelevantContexts(update);

      // Create update tasks for each context
      const updateTasks = relevantContexts.map(contextId =>
        this.updateContext(contextId, { ...update, contextId }).catch(error => {
          logger.warn('broadcastUpdate', `Failed to update context ${contextId}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        })
      );

      // Execute all updates in parallel
      await Promise.allSettled(updateTasks);

      logger.info('broadcastUpdate', 'Broadcast completed', {
        source: update.source,
        contextsUpdated: relevantContexts.length
      });

    } catch (error) {
      logger.error('broadcastUpdate', `Failed to broadcast update from ${update.source}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get context history
   */
  getContextHistory(contextId: string): ContextVersion[] {
    return this.contextVersions.get(contextId) || [];
  }

  /**
   * Rollback context to a specific version
   */
  async rollbackContext(contextId: string, version: number): Promise<void> {
    logger.debug('rollbackContext', `Rolling back context ${contextId} to version ${version}`);

    try {
      const versions = this.contextVersions.get(contextId);
      if (!versions) {
        throw new Error(`No version history found for context ${contextId}`);
      }

      const targetVersion = versions.find(v => v.version === version);
      if (!targetVersion) {
        throw new Error(`Version ${version} not found for context ${contextId}`);
      }

      const currentContext = this.contexts.get(contextId);
      if (!currentContext) {
        throw new Error(`Context ${contextId} not found`);
      }

      // Create rollback update
      const rollbackUpdate: ContextUpdate = {
        contextId,
        updateType: 'update',
        section: {
          ...currentContext,
          content: targetVersion.content,
          version: targetVersion.version,
          lastUpdated: new Date()
        },
        timestamp: new Date(),
        source: 'rollback'
      };

      await this.applyUpdate(contextId, rollbackUpdate);
      await this.notifySubscribers(contextId, rollbackUpdate);

      logger.info('rollbackContext', 'Context rolled back successfully', {
        contextId,
        toVersion: version
      });

    } catch (error) {
      logger.error('rollbackContext', `Failed to rollback context ${contextId} to version ${version}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Unsubscribe from context updates
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    logger.debug('unsubscribe', `Unsubscribing ${subscriptionId}`);

    for (const [contextId, subscriptions] of this.subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(contextId);
        }
        logger.info('unsubscribe', 'Unsubscribed successfully', { subscriptionId, contextId });
        return;
      }
    }

    logger.warn('unsubscribe', `Subscription ${subscriptionId} not found`);
  }

  /**
   * Get pending updates
   */
  getPendingUpdates(): Map<string, PendingUpdate> {
    return new Map(this.pendingUpdates);
  }

  /**
   * Resolve pending update manually
   */
  async resolvePendingUpdate(contextId: string, resolution: 'accept' | 'reject' | 'merge'): Promise<void> {
    const pending = this.pendingUpdates.get(contextId);
    if (!pending) {
      throw new Error(`No pending update found for context ${contextId}`);
    }

    logger.debug('resolvePendingUpdate', `Resolving pending update for context ${contextId} with ${resolution}`);

    try {
      switch (resolution) {
        case 'accept':
          await this.applyUpdate(contextId, pending.update);
          await this.notifySubscribers(contextId, pending.update);
          break;
        case 'reject':
          // Do nothing, just remove from pending
          break;
        case 'merge':
          // Apply merge logic here
          await this.applyMergedUpdate(contextId, pending);
          break;
      }

      this.pendingUpdates.delete(contextId);

      logger.info('resolvePendingUpdate', 'Pending update resolved', {
        contextId,
        resolution
      });

    } catch (error) {
      logger.error('resolvePendingUpdate', `Failed to resolve pending update for context ${contextId}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Private methods

  private validateUpdate(update: ContextUpdate): void {
    if (!update.contextId) {
      throw new Error('Context ID is required');
    }

    if (!update.source) {
      throw new Error('Update source is required');
    }

    if (!update.section) {
      throw new Error('Update section is required');
    }

    if (!Object.values(['create', 'update', 'delete']).includes(update.updateType)) {
      throw new Error(`Invalid update type: ${update.updateType}`);
    }
  }

  private async detectConflicts(contextId: string, update: ContextUpdate): Promise<ContextConflict[]> {
    const conflicts: ContextConflict[] = [];
    const currentContext = this.contexts.get(contextId);

    if (!currentContext) {
      return conflicts;
    }

    // Check for content conflicts
    if (update.updateType === 'update') {
      const currentVersion = this.getLatestVersion(contextId);
      if (currentVersion && currentVersion.checksum !== this.calculateChecksum(update.section.content)) {
        conflicts.push({
          sectionId: contextId,
          conflictType: 'content',
          conflictingSections: [currentContext, update.section]
        });
      }
    }

    // Check for priority conflicts
    if (update.section.priority !== currentContext.priority) {
      conflicts.push({
        sectionId: contextId,
        conflictType: 'priority',
        conflictingSections: [currentContext, update.section]
      });
    }

    return conflicts;
  }

  private async applyUpdate(contextId: string, update: ContextUpdate): Promise<void> {
    const currentContext = this.contexts.get(contextId);

    switch (update.updateType) {
      case 'create':
        if (currentContext) {
          throw new Error(`Context ${contextId} already exists`);
        }
        this.contexts.set(contextId, update.section);
        break;

      case 'update': {
        if (!currentContext) {
          throw new Error(`Context ${contextId} not found for update`);
        }

        // Save current version
        this.saveVersion(contextId, currentContext);

        // Update context
        const updatedSection = {
          ...currentContext,
          ...update.section,
          version: currentContext.version + 1,
          lastUpdated: new Date()
        };
        this.contexts.set(contextId, updatedSection);
        break;
      }

      case 'delete':
        if (!currentContext) {
          throw new Error(`Context ${contextId} not found for deletion`);
        }

        // Save current version before deletion
        this.saveVersion(contextId, currentContext);

        this.contexts.delete(contextId);
        break;
    }
  }

  private async notifySubscribers(contextId: string, update: ContextUpdate): Promise<void> {
    const subscriptions = this.subscriptions.get(contextId) || [];

    const notificationTasks = subscriptions
      .filter(sub => sub.active)
      .map(async (subscription) => {
        try {
          await subscription.callback(update);
        } catch (error) {
          logger.warn('notifySubscribers', 'Subscriber callback failed', {
            subscriptionId: subscription.id,
            contextId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

    await Promise.allSettled(notificationTasks);
  }

  private saveVersion(contextId: string, context: EnhancedContextSection): void {
    if (!this.contextVersions.has(contextId)) {
      this.contextVersions.set(contextId, []);
    }

    const versions = this.contextVersions.get(contextId);
    if (!versions) {
      throw new Error(`No versions array found for context ${contextId}`);
    }

    const version: ContextVersion = {
      version: context.version,
      content: context.content,
      timestamp: context.lastUpdated,
      source: 'system',
      checksum: this.calculateChecksum(context.content)
    };

    versions.push(version);

    // Keep only the latest versions
    if (versions.length > this.maxVersions) {
      versions.splice(0, versions.length - this.maxVersions);
    }
  }

  private getLatestVersion(contextId: string): ContextVersion | undefined {
    const versions = this.contextVersions.get(contextId);
    return versions && versions.length > 0 ? versions[versions.length - 1] : undefined;
  }

  private calculateChecksum(content: string): string {
    // Simple checksum calculation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private addPendingUpdate(contextId: string, update: ContextUpdate, conflicts: ContextConflict[]): void {
    const pending: PendingUpdate = {
      update,
      dependencies: [],
      conflicts: conflicts.map(c => c.sectionId),
      retryCount: 0,
      maxRetries: 3
    };

    this.pendingUpdates.set(contextId, pending);
    logger.warn('addPendingUpdate', 'Update added to pending queue', {
      contextId,
      conflicts: conflicts.length
    });
  }

  private async applyMergedUpdate(contextId: string, pending: PendingUpdate): Promise<void> {
    // Simple merge strategy - combine content
    const currentContext = this.contexts.get(contextId);
    if (!currentContext) {
      throw new Error(`Context ${contextId} not found for merge`);
    }

    const mergedContent = `${currentContext.content}\n\n---MERGED---\n\n${pending.update.section.content}`;

    const mergedSection: EnhancedContextSection = {
      ...currentContext,
      content: mergedContent,
      tokens: this.estimateTokens(mergedContent),
      version: currentContext.version + 1,
      lastUpdated: new Date()
    };

    const mergedUpdate: ContextUpdate = {
      ...pending.update,
      updateType: 'update',
      section: mergedSection
    };

    await this.applyUpdate(contextId, mergedUpdate);
    await this.notifySubscribers(contextId, mergedUpdate);
  }

  private findRelevantContexts(update: ContextUpdate): string[] {
    const relevantContexts: string[] = [];

    for (const [contextId, context] of this.contexts) {
      if (this.isContextRelevantToUpdate(context, update)) {
        relevantContexts.push(contextId);
      }
    }

    return relevantContexts;
  }

  private isContextRelevantToUpdate(context: EnhancedContextSection, update: ContextUpdate): boolean {
    // Simple relevance check - can be made more sophisticated
    return context.tags.some(tag =>
      update.section.tags.includes(tag)
    ) || context.source === update.source;
  }

  private groupContextsByDependencies(contextIds: string[]): string[][] {
    // Simple grouping - can be enhanced with proper dependency resolution
    const groups: string[][] = [];
    const remaining = [...contextIds];

    while (remaining.length > 0) {
      const groupSize = Math.min(5, remaining.length); // Process in groups of 5
      const group = remaining.splice(0, groupSize);
      groups.push(group);
    }

    return groups;
  }

  private async syncContextGroup(contextIds: string[]): Promise<void> {
    // Simple synchronization - ensure all contexts are up to date
    for (const contextId of contextIds) {
      const context = this.contexts.get(contextId);
      if (context) {
        // Trigger any pending synchronizations
        await this.notifySubscribers(contextId, {
          contextId,
          updateType: 'update',
          section: context,
          timestamp: new Date(),
          source: 'sync'
        });
      }
    }
  }

  private async detectCrossContextConflicts(contextIds: string[]): Promise<ContextConflict[]> {
    const conflicts: ContextConflict[] = [];

    // Check for conflicts between contexts
    for (let i = 0; i < contextIds.length; i++) {
      for (let j = i + 1; j < contextIds.length; j++) {
        const id1 = contextIds[i];
        const id2 = contextIds[j];
        if (!id1 || !id2) {
          continue;
        }
        const context1 = this.contexts.get(id1);
        const context2 = this.contexts.get(id2);

        if (context1 && context2 && this.haveConflictingDependencies(context1, context2)) {
          conflicts.push({
            sectionId: `${contextIds[i]}_${contextIds[j]}`,
            conflictType: 'content',
            conflictingSections: [context1, context2]
          });
        }
      }
    }

    return conflicts;
  }

  private haveConflictingDependencies(context1: EnhancedContextSection, context2: EnhancedContextSection): boolean {
    // Simple check for overlapping dependencies
    return context1.dependencies.some(dep => context2.dependencies.includes(dep));
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.updateQueue.length > 0) {
        this.processQueue();
      }
    }, 1000); // Process queue every second
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift();
        if (!update) {
          break; // Queue is empty
        }
        try {
          await this.updateContext(update.contextId, update);
        } catch (error) {
          logger.warn('processQueue', 'Failed to process queued update', {
            contextId: update.contextId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Cleanup resources and stop background processes
   */
  cleanup(): void {
    logger.info('cleanup', 'Cleaning up dynamic context updater');

    try {
      // Clear all subscriptions
      this.subscriptions.clear();

      // Clear all contexts
      this.contexts.clear();

      // Clear all version history
      this.contextVersions.clear();

      // Clear pending updates
      this.pendingUpdates.clear();

      // Clear update queue
      this.updateQueue = [];

      // Set flag to stop queue processor
      this.isProcessingQueue = false;

      logger.info('cleanup', 'Dynamic context updater cleaned up successfully');

    } catch (error) {
      logger.error('cleanup', 'Error during cleanup',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

/**
 * Conflict Resolver - Handles automatic conflict resolution
 */
class ConflictResolver {
  async resolve(conflicts: ContextConflict[]): Promise<Array<{ requiresManual: boolean }>> {
    return conflicts.map(conflict => ({
      requiresManual: conflict.conflictType === 'content'
    }));
  }
}