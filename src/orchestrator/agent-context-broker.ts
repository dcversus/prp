/**
 * ♫ Agent Context Broker for @dcversus/prp Orchestrator
 *
 * Manages secure context sharing between agents with access control,
 * session management, and context versioning.
 */
import { createLayerLogger } from '../shared';

import {
  ContextType
} from './types';

import type {
  AgentContextBroker,
  ContextSession,
  EnhancedContextSection,
  ContextUpdate} from './types';


const logger = createLayerLogger('orchestrator');
interface ContextShareRecord {
  id: string;
  fromAgent: string;
  toAgent: string;
  contextId: string;
  sharedAt: Date;
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  permissions: string[];
}
interface AgentPermissions {
  agentId: string;
  canReceive: ContextType[];
  canShare: ContextType[];
  trustedAgents: string[];
  restrictions: string[];
}
/**
 * Agent Context Broker - Handles secure context sharing between agents
 */
export class ContextBrokerImpl implements AgentContextBroker {
  private readonly activeSessions = new Map<string, ContextSession>();
  private readonly shareRecords = new Map<string, ContextShareRecord>();
  private readonly agentPermissions = new Map<string, AgentPermissions>();
  private readonly contextStore = new Map<string, EnhancedContextSection>();
  constructor() {
    this.initializeDefaultPermissions();
  }
  /**
   * Share context from one agent to another
   */
  async shareContext(
    fromAgent: string,
    toAgent: string,
    context: EnhancedContextSection,
  ): Promise<void> {
    logger.debug('shareContext', `Agent ${fromAgent} sharing context with ${toAgent}`);
    try {
      // Validate permissions
      this.validateSharePermissions(fromAgent, toAgent, context);
      // Store the context
      const contextId = this.storeContext(context);
      // Create share record
      const shareRecord: ContextShareRecord = {
        id: this.generateShareId(),
        fromAgent,
        toAgent,
        contextId,
        sharedAt: new Date(),
        accessCount: 0,
        maxAccess: this.getMaxAccessForContext(context),
        permissions: this.getRequiredPermissions(context),
      };
      this.shareRecords.set(shareRecord.id, shareRecord);
      // Check if there's an active session
      const session = this.findActiveSession([fromAgent, toAgent]);
      if (session) {
        session.sharedContexts.set(contextId, context);
        session.lastActivity = new Date();
      }
      logger.info('shareContext', 'Context shared successfully', {
        fromAgent,
        toAgent,
        contextId,
        shareRecordId: shareRecord.id,
      });
    } catch (error) {
      logger.error(
        'shareContext',
        `Failed to share context from ${fromAgent} to ${toAgent}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Request context from another agent
   */
  async requestContext(agent: string, contextType: ContextType): Promise<EnhancedContextSection> {
    logger.debug('requestContext', `Agent ${agent} requesting context of type ${contextType}`);
    try {
      // Check if agent has permission to request this context type
      this.validateRequestPermissions(agent, contextType);
      // Find available contexts of this type
      const availableContexts = this.findContextsByType(contextType, agent);
      if (availableContexts.length === 0) {
        throw new Error(`No contexts of type ${contextType} available for agent ${agent}`);
      }
      // Select the most relevant context
      const selectedContext = this.selectMostRelevantContext(availableContexts);
      // Record the access
      this.recordContextAccess(selectedContext.id, agent);
      // Update access statistics
      selectedContext.accessCount++;
      selectedContext.lastAccessed = new Date();
      logger.info('requestContext', 'Context provided to agent', {
        agent,
        contextType,
        contextId: selectedContext.id,
      });
      return selectedContext;
    } catch (error) {
      logger.error(
        'requestContext',
        `Failed to provide context to agent ${agent}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Establish a context sharing session between multiple agents
   */
  async establishContextSession(participants: string[]): Promise<ContextSession> {
    logger.debug(
      'establishContextSession',
      `Establishing context session for ${participants.length} agents`,
    );
    try {
      // Validate participants
      this.validateSessionParticipants(participants);
      // Create session
      const session: ContextSession = {
        id: this.generateSessionId(),
        participants: [...participants],
        sharedContexts: new Map(),
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      // Store session
      this.activeSessions.set(session.id, session);
      logger.info('establishContextSession', 'Context session established', {
        sessionId: session.id,
        participants: participants.length,
      });
      return session;
    } catch (error) {
      logger.error(
        'establishContextSession',
        'Failed to establish context session',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get active sessions for an agent
   */
  getActiveSessions(agentId: string): ContextSession[] {
    return Array.from(this.activeSessions.values()).filter((session) =>
      session.participants.includes(agentId),
    );
  }
  /**
   * Get shared contexts for an agent
   */
  getSharedContexts(agentId: string): EnhancedContextSection[] {
    const sharedContexts: EnhancedContextSection[] = [];
    // Get from share records where agent is recipient
    for (const record of this.shareRecords.values()) {
      if (record.toAgent === agentId && this.isShareRecordValid(record)) {
        const context = this.contextStore.get(record.contextId);
        if (context) {
          sharedContexts.push(context);
        }
      }
    }
    // Get from active sessions
    for (const session of this.activeSessions.values()) {
      if (session.participants.includes(agentId)) {
        for (const context of session.sharedContexts.values()) {
          if (!sharedContexts.find((c) => c.id === context.id)) {
            sharedContexts.push(context);
          }
        }
      }
    }
    return sharedContexts;
  }
  /**
   * Revoke context sharing
   */
  async revokeContext(shareRecordId: string, revokingAgent: string): Promise<void> {
    logger.debug('revokeContext', `Agent ${revokingAgent} revoking context share ${shareRecordId}`);
    try {
      const shareRecord = this.shareRecords.get(shareRecordId);
      if (!shareRecord) {
        throw new Error(`Share record ${shareRecordId} not found`);
      }
      // Validate permissions
      if (shareRecord.fromAgent !== revokingAgent) {
        throw new Error(`Agent ${revokingAgent} does not have permission to revoke this share`);
      }
      // Remove from sessions
      this.removeFromSessions(shareRecord.contextId);
      // Mark as expired
      shareRecord.expiresAt = new Date();
      logger.info('revokeContext', 'Context share revoked', {
        shareRecordId,
        revokingAgent,
        contextId: shareRecord.contextId,
      });
    } catch (error) {
      logger.error(
        'revokeContext',
        `Failed to revoke context share ${shareRecordId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Set agent permissions
   */
  setAgentPermissions(agentId: string, permissions: AgentPermissions): void {
    this.agentPermissions.set(agentId, permissions);
    logger.debug('setAgentPermissions', `Permissions updated for agent ${agentId}`);
  }
  /**
   * Get agent permissions
   */
  getAgentPermissions(agentId: string): AgentPermissions {
    return this.agentPermissions.get(agentId) ?? this.getDefaultPermissions(agentId);
  }
  /**
   * Cleanup expired sessions and share records
   */
  cleanup(): void {
    const now = new Date();
    let cleanedSessions = 0;
    let cleanedShares = 0;
    // Clean up expired sessions
    for (const [sessionId, session] of this.activeSessions) {
      const hoursSinceActivity =
        (now.getTime() - session.lastActivity.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActivity > 24) {
        // 24 hour timeout
        this.activeSessions.delete(sessionId);
        cleanedSessions++;
      }
    }
    // Clean up expired share records
    for (const [shareId, record] of this.shareRecords) {
      if (record.expiresAt && record.expiresAt < now) {
        this.shareRecords.delete(shareId);
        cleanedShares++;
      } else if (record.maxAccess && record.accessCount >= record.maxAccess) {
        this.shareRecords.delete(shareId);
        cleanedShares++;
      }
    }
    if (cleanedSessions > 0 || cleanedShares > 0) {
      logger.info('cleanup', 'Cleanup completed', {
        cleanedSessions,
        cleanedShares,
      });
    }
  }
  /**
   * Broadcast update to all agents in relevant sessions
   */
  async broadcastUpdate(update: ContextUpdate): Promise<void> {
    logger.debug('broadcastUpdate', `Broadcasting update from ${update.source}`);
    try {
      // Find all sessions that contain this context
      const relevantSessions = Array.from(this.activeSessions.values()).filter((session) =>
        session.sharedContexts.has(update.contextId),
      );
      // Update the context in all relevant sessions
      for (const session of relevantSessions) {
        const existingContext = session.sharedContexts.get(update.contextId);
        if (existingContext) {
          // Update the context based on update type
          switch (update.updateType) {
            case 'update':
              session.sharedContexts.set(update.contextId, update.section);
              break;
            case 'delete':
              session.sharedContexts.delete(update.contextId);
              break;
            case 'create':
              session.sharedContexts.set(update.contextId, update.section);
              break;
          }
          session.lastActivity = new Date();
        }
      }
      logger.info('broadcastUpdate', `Update broadcasted to ${relevantSessions.length} sessions`, {
        source: update.source,
        updateType: update.updateType,
        contextId: update.contextId,
      });
    } catch (error) {
      logger.error(
        'broadcastUpdate',
        `Failed to broadcast update from ${update.source}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  // Private methods
  private initializeDefaultPermissions(): void {
    // Set default permissions for different agent types
    const defaultPermissions: AgentPermissions = {
      agentId: 'default',
      canReceive: [ContextType.SHARED_MEMORY, ContextType.SIGNAL_HISTORY],
      canShare: [ContextType.AGENT_STATUS],
      trustedAgents: [],
      restrictions: [],
    };
    this.agentPermissions.set('default', defaultPermissions);
  }
  private getDefaultPermissions(agentId: string): AgentPermissions {
    return {
      agentId,
      canReceive: [ContextType.SHARED_MEMORY, ContextType.SIGNAL_HISTORY],
      canShare: [ContextType.AGENT_STATUS],
      trustedAgents: [],
      restrictions: [],
    };
  }
  private validateSharePermissions(
    fromAgent: string,
    toAgent: string,
    context: EnhancedContextSection,
  ): void {
    const fromPerms = this.getAgentPermissions(fromAgent);
    const toPerms = this.getAgentPermissions(toAgent);
    // Check if fromAgent can share this context type
    const contextType = this.inferContextType(context);
    if (!fromPerms.canShare.includes(contextType)) {
      throw new Error(
        `Agent ${fromAgent} does not have permission to share ${contextType} contexts`,
      );
    }
    // Check if toAgent is trusted
    if (!fromPerms.trustedAgents.includes(toAgent) && !fromPerms.trustedAgents.includes('*')) {
      throw new Error(`Agent ${toAgent} is not in trusted list of ${fromAgent}`);
    }
    // Check if toAgent can receive this context type
    if (!toPerms.canReceive.includes(contextType)) {
      throw new Error(
        `Agent ${toAgent} does not have permission to receive ${contextType} contexts`,
      );
    }
  }
  private validateRequestPermissions(agent: string, contextType: ContextType): void {
    const perms = this.getAgentPermissions(agent);
    if (!perms.canReceive.includes(contextType)) {
      throw new Error(`Agent ${agent} does not have permission to request ${contextType} contexts`);
    }
  }
  private validateSessionParticipants(participants: string[]): void {
    if (participants.length < 2) {
      throw new Error('Context session requires at least 2 participants');
    }
    // Check if all participants have valid permissions
    for (const participant of participants) {
      const perms = this.getAgentPermissions(participant);
      if (perms.restrictions.includes('no_sessions')) {
        throw new Error(`Agent ${participant} is restricted from participating in sessions`);
      }
    }
  }
  private storeContext(context: EnhancedContextSection): string {
    const contextId = context.id || this.generateContextId();
    const storedContext = { ...context, id: contextId };
    this.contextStore.set(contextId, storedContext);
    return contextId;
  }
  private findContextsByType(
    contextType: ContextType,
    requestingAgent: string,
  ): EnhancedContextSection[] {
    const contexts: EnhancedContextSection[] = [];
    for (const context of this.contextStore.values()) {
      if (this.inferContextType(context) === contextType) {
        // Check if agent has access to this context
        if (this.canAgentAccessContext(requestingAgent, context)) {
          contexts.push(context);
        }
      }
    }
    return contexts;
  }
  private selectMostRelevantContext(contexts: EnhancedContextSection[]): EnhancedContextSection {
    if (contexts.length === 0) {
      throw new Error('No contexts provided to select from');
    }
    // Sort by relevance score and access recency
    const sorted = contexts.sort((a, b) => {
      const scoreA = (a.relevanceScore ?? 0) + a.accessCount * 0.1;
      const scoreB = (b.relevanceScore ?? 0) + b.accessCount * 0.1;
      return scoreB - scoreA;
    });
    const selected = sorted[0];
    if (!selected) {
      throw new Error('Failed to select context after sorting');
    }
    return selected;
  }
  private canAgentAccessContext(agent: string, context: EnhancedContextSection): boolean {
    // Check share records
    for (const record of this.shareRecords.values()) {
      if (record.contextId === context.id && record.toAgent === agent) {
        return this.isShareRecordValid(record);
      }
    }
    // Check sessions
    for (const session of this.activeSessions.values()) {
      if (session.participants.includes(agent) && session.sharedContexts.has(context.id)) {
        return true;
      }
    }
    return false;
  }
  private isShareRecordValid(record: ContextShareRecord): boolean {
    if (record.expiresAt && record.expiresAt < new Date()) {
      return false;
    }
    if (record.maxAccess && record.accessCount >= record.maxAccess) {
      return false;
    }
    return true;
  }
  private recordContextAccess(contextId: string, agentId: string): void {
    for (const record of this.shareRecords.values()) {
      if (record.contextId === contextId && record.toAgent === agentId) {
        record.accessCount++;
        break;
      }
    }
  }
  private findActiveSession(participants: string[]): ContextSession | undefined {
    for (const session of this.activeSessions.values()) {
      if (participants.every((p) => session.participants.includes(p))) {
        return session;
      }
    }
    return undefined;
  }
  private removeFromSessions(contextId: string): void {
    for (const session of this.activeSessions.values()) {
      session.sharedContexts.delete(contextId);
    }
  }
  private inferContextType(context: EnhancedContextSection): ContextType {
    // Simple inference based on content and tags
    if (context.name.includes('prp') || context.tags.includes('prp')) {
      return ContextType.PRP_CONTEXT;
    }
    if (context.name.includes('agent') || context.tags.includes('agent')) {
      return ContextType.AGENT_STATUS;
    }
    if (context.name.includes('signal') || context.tags.includes('signal')) {
      return ContextType.SIGNAL_HISTORY;
    }
    if (context.name.includes('tool') || context.tags.includes('tool')) {
      return ContextType.TOOL_CONTEXT;
    }
    return ContextType.SHARED_MEMORY;
  }
  private getMaxAccessForContext(context: EnhancedContextSection): number {
    // Different contexts have different access limits
    if (context.required) {
      return 1000; // High limit for required contexts
    }
    if (context.priority > 8) {
      return 100; // Medium limit for high priority contexts
    }
    return 50; // Default limit
  }
  private getRequiredPermissions(context: EnhancedContextSection): string[] {
    const permissions = ['read'];
    if (context.permissions.length > 0) {
      permissions.push(...context.permissions);
    }
    return permissions;
  }
  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  private generateContextId(): string {
    return `context_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
