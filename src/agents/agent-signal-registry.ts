/**
 * ♫ Agent Signal Registry for @dcversus/prp
 *
 * Comprehensive registry for managing agent-signal relationships,
 * lifecycle tracking, and pattern learning capabilities.
 */

import { EventEmitter } from 'events';

import { createLayerLogger, HashUtils } from '../shared';

import type { BaseAgent } from './base-agent';
import type {
  AgentSignalRegistry as IAgentSignalRegistry,
  AgentActivityTracker,
  AttributionConfidence
} from './agent-activity-tracker';
import type { Signal } from '../shared/types';

const logger = createLayerLogger('agent-signal-registry');

/**
 * Agent registration information
 */
export interface AgentRegistration {
  agentId: string;
  agentType: string;
  registeredAt: Date;
  lastActivity: Date;
  isActive: boolean;
  capabilities: string[];
  specializations: string[];
  sessionInfo: {
    sessionId: string;
    startTime: Date;
    currentPRP?: string;
    activeSignals: string[];
  };
  metrics: {
    signalsGenerated: number;
    signalsReceived: number;
    averageConfidence: number;
    patternStrength: number;
  };
}

/**
 * Signal pattern information for learning
 */
export interface SignalPattern {
  signalCode: string;
  context: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  agentPreferences: Map<string, number>; // agentId -> preference score
  contextualFactors: {
    timeOfDay: number;
    dayOfWeek: number;
    filePath?: string;
    prpContext?: string;
    contentType: string;
  };
}

/**
 * Agent-signal relationship tracking
 */
export interface AgentSignalRelationship {
  agentId: string;
  signalId: string;
  signalCode: string;
  relationship: {
    type: 'generated' | 'received' | 'processed' | 'attributed';
    strength: number; // 0.0-1.0
    confidence: AttributionConfidence;
    establishedAt: Date;
    lastInteraction: Date;
    interactionCount: number;
  };
  context: {
    prpContext?: string;
    filePath?: string;
    metadata: Record<string, unknown>;
  };
  verification: {
    verified: boolean;
    verificationCount: number;
    accuracyScore: number;
    lastVerified: Date;
  };
}

/**
 * Signal lifecycle tracking
 */
export interface SignalLifecycle {
  signalId: string;
  signalCode: string;
  createdAt: Date;
  lifecycle: Array<{
    stage: 'detected' | 'attributed' | 'processed' | 'resolved' | 'expired';
    timestamp: Date;
    agentId?: string;
    agentType?: string;
    context: Record<string, unknown>;
    duration?: number; // Time spent in this stage
  }>;
  currentStage: string;
  attributionChain: Array<{
    agentId: string;
    attributedAt: Date;
    confidence: AttributionConfidence;
    method: string;
  }>;
}

/**
 * Registry configuration
 */
export interface AgentSignalRegistryConfig {
  enablePersistence: boolean;
  retentionPeriod: number; // milliseconds
  enableLearning: boolean;
  learningRate: number;
  patternDecayFactor: number;
  minPatternFrequency: number;
  maxRelationshipsPerAgent: number;
  verificationEnabled: boolean;
  autoCleanupEnabled: boolean;
  cleanupInterval: number; // milliseconds
}

/**
 * Agent Signal Registry implementation
 */
export class AgentSignalRegistry extends EventEmitter implements IAgentSignalRegistry {
  private readonly config: AgentSignalRegistryConfig;

  // Core storage
  private readonly agents = new Map<string, AgentRegistration>();
  private readonly signalPatterns = new Map<string, SignalPattern>();
  private readonly agentRelationships = new Map<string, AgentSignalRelationship[]>();
  private readonly signalLifecycles = new Map<string, SignalLifecycle>();

  // Learning and analytics
  private readonly patternLearner = new Map<string, Map<string, number>>(); // agentId -> signalCode -> frequency
  private readonly confidenceTracker = new Map<string, number[]>(); // agentId -> confidence scores

  // Performance metrics
  private readonly metrics = {
    agentsRegistered: 0,
    signalsTracked: 0,
    relationshipsEstablished: 0,
    patternsLearned: 0,
    averageAttributionTime: 0,
    learningUpdates: 0,
    cleanupOperations: 0,
    verificationOperations: 0
  };

  constructor(config: Partial<AgentSignalRegistryConfig> = {}) {
    super();

    this.config = {
      enablePersistence: true,
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableLearning: true,
      learningRate: 0.1,
      patternDecayFactor: 0.95,
      minPatternFrequency: 3,
      maxRelationshipsPerAgent: 1000,
      verificationEnabled: true,
      autoCleanupEnabled: true,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      ...config
    };

    // Setup automatic cleanup if enabled
    if (this.config.autoCleanupEnabled) {
      this.setupAutomaticCleanup();
    }

    logger.info('Agent Signal Registry initialized', {
      config: this.config
    });
  }

  // Registry interface implementation

  async registerAgent(agent: BaseAgent): Promise<void> {
    const agentId = agent.id;
    const now = new Date();

    if (this.agents.has(agentId)) {
      logger.debug('Agent already registered, updating', { agentId });
      await this.updateAgentActivity(agentId);
      return;
    }

    const registration: AgentRegistration = {
      agentId,
      agentType: agent.type,
      registeredAt: now,
      lastActivity: now,
      isActive: true,
      capabilities: agent.capabilities.supportedFileTypes,
      specializations: agent.capabilities.specializations || [],
      sessionInfo: {
        sessionId: HashUtils.sha256(agentId + now.getTime().toString()),
        startTime: now,
        activeSignals: []
      },
      metrics: {
        signalsGenerated: 0,
        signalsReceived: 0,
        averageConfidence: 0,
        patternStrength: 0
      }
    };

    this.agents.set(agentId, registration);
    this.patternLearner.set(agentId, new Map());
    this.confidenceTracker.set(agentId, []);

    this.metrics.agentsRegistered++;

    logger.info('Agent registered', {
      agentId,
      agentType: agent.type,
      capabilities: agent.capabilities.supportedFileTypes
    });

    this.emit('agentRegistered', registration);
  }

  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn('Attempted to unregister unknown agent', { agentId });
      return;
    }

    // Mark as inactive but keep for historical analysis
    agent.isActive = false;
    agent.lastActivity = new Date();

    // Clean up active signals
    if (agent.sessionInfo) {
      agent.sessionInfo.activeSignals = [];
    }

    logger.info('Agent unregistered', { agentId });

    this.emit('agentUnregistered', { agentId, agent });
  }

  async associateSignalWithAgent(
    signalId: string,
    agentId: string,
    confidence: AttributionConfidence,
    evidence: string[]
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn('Cannot associate signal with unknown agent', { signalId, agentId });
      return;
    }

    const now = new Date();

    // Create or update signal lifecycle
    let lifecycle = this.signalLifecycles.get(signalId);
    if (!lifecycle) {
      lifecycle = {
        signalId,
        signalCode: this.extractSignalCode(signalId),
        createdAt: now,
        lifecycle: [{
          stage: 'detected',
          timestamp: now,
          context: {}
        }],
        currentStage: 'detected',
        attributionChain: []
      };
      this.signalLifecycles.set(signalId, lifecycle);
    }

    // Add attribution to lifecycle
    lifecycle.lifecycle.push({
      stage: 'attributed',
      timestamp: now,
      agentId,
      agentType: agent.agentType,
      context: { confidence, evidence }
    });
    lifecycle.currentStage = 'attributed';

    lifecycle.attributionChain.push({
      agentId,
      attributedAt: now,
      confidence,
      method: 'manual_association'
    });

    // Create agent-signal relationship
    const relationship: AgentSignalRelationship = {
      agentId,
      signalId,
      signalCode: lifecycle.signalCode,
      relationship: {
        type: 'attributed',
        strength: this.confidenceToNumeric(confidence),
        confidence,
        establishedAt: now,
        lastInteraction: now,
        interactionCount: 1
      },
      context: {
        metadata: { evidence }
      },
      verification: {
        verified: false,
        verificationCount: 0,
        accuracyScore: 0,
        lastVerified: now
      }
    };

    // Store relationship
    if (!this.agentRelationships.has(agentId)) {
      this.agentRelationships.set(agentId, []);
    }

    const relationships = this.agentRelationships.get(agentId)!;
    relationships.push(relationship);

    // Limit relationships per agent
    if (relationships.length > this.config.maxRelationshipsPerAgent) {
      relationships.shift(); // Remove oldest relationship
    }

    // Update agent metrics
    agent.metrics.signalsReceived++;
    this.updateAgentConfidence(agentId, confidence);

    // Track signal pattern
    await this.trackSignalPattern(agentId, lifecycle.signalCode, 'attribution', {
      confidence: this.confidenceToNumeric(confidence),
      evidence
    });

    this.metrics.relationshipsEstablished++;

    logger.debug('Signal associated with agent', {
      signalId,
      agentId,
      confidence,
      evidenceCount: evidence.length
    });

    this.emit('signalAssociated', { signalId, agentId, confidence, relationship });
  }

  async getAgentForSignal(signalId: string): Promise<string | null> {
    const lifecycle = this.signalLifecycles.get(signalId);
    if (!lifecycle || lifecycle.attributionChain.length === 0) {
      return null;
    }

    // Return the most recent attribution
    const latestAttribution = lifecycle.attributionChain[lifecycle.attributionChain.length - 1];
    return latestAttribution.agentId;
  }

  async getSignalsForAgent(
    agentId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<string[]> {
    const relationships = this.agentRelationships.get(agentId);
    if (!relationships) {
      return [];
    }

    let signals = relationships.map(r => r.signalId);

    // Filter by time range if provided
    if (timeRange) {
      signals = signals.filter(signalId => {
        const lifecycle = this.signalLifecycles.get(signalId);
        return lifecycle && lifecycle.createdAt >= timeRange.start && lifecycle.createdAt <= timeRange.end;
      });
    }

    return signals;
  }

  async getActiveAgents(): Promise<string[]> {
    return Array.from(this.agents.entries())
      .filter(([_, agent]) => agent.isActive)
      .map(([agentId, _]) => agentId);
  }

  async learnSignalPatterns(
    agentId: string,
    signalPatterns: Array<{
      signalCode: string;
      context: string;
      frequency: number;
    }>
  ): Promise<void> {
    if (!this.config.enableLearning) {
      return;
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn('Cannot learn patterns for unknown agent', { agentId });
      return;
    }

    const agentPatternLearner = this.patternLearner.get(agentId);
    if (!agentPatternLearner) {
      return;
    }

    for (const pattern of signalPatterns) {
      const currentFrequency = agentPatternLearner.get(pattern.signalCode) || 0;
      const newFrequency = Math.max(currentFrequency, pattern.frequency);

      // Apply learning rate and decay
      const adjustedFrequency = currentFrequency * (1 - this.config.learningRate) +
                               pattern.frequency * this.config.learningRate;

      agentPatternLearner.set(pattern.signalCode, adjustedFrequency);

      // Update global signal patterns
      await this.updateGlobalSignalPattern(pattern.signalCode, pattern.context, adjustedFrequency);

      logger.debug('Signal pattern learned', {
        agentId,
        signalCode: pattern.signalCode,
        frequency: adjustedFrequency,
        context: pattern.context
      });
    }

    this.metrics.learningUpdates++;
    this.metrics.patternsLearned += signalPatterns.length;

    this.emit('patternsLearned', { agentId, patterns: signalPatterns });
  }

  async getSignalPatterns(agentId: string): Promise<Array<{
    signalCode: string;
    context: string;
    frequency: number;
    confidence: number;
  }>> {
    const agentPatternLearner = this.patternLearner.get(agentId);
    if (!agentPatternLearner) {
      return [];
    }

    const patterns: Array<{
      signalCode: string;
      context: string;
      frequency: number;
      confidence: number;
    }> = [];

    for (const [signalCode, frequency] of agentPatternLearner.entries()) {
      if (frequency >= this.config.minPatternFrequency) {
        const confidence = Math.min(frequency / 10, 1.0); // Normalize to 0-1
        patterns.push({
          signalCode,
          context: 'learned', // Would be more specific in real implementation
          frequency,
          confidence
        });
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  // Additional public methods

  /**
   * Get agent registration information
   */
  getAgentRegistration(agentId: string): AgentRegistration | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get signal lifecycle information
   */
  getSignalLifecycle(signalId: string): SignalLifecycle | null {
    return this.signalLifecycles.get(signalId) || null;
  }

  /**
   * Get all agents with their registration info
   */
  getAllAgents(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get relationships for a specific agent
   */
  getAgentRelationships(agentId: string): AgentSignalRelationship[] {
    return this.agentRelationships.get(agentId) || [];
  }

  /**
   * Verify signal attribution accuracy
   */
  async verifyAttribution(
    signalId: string,
    correctAgentId: string,
    isCorrect: boolean,
    feedback?: string
  ): Promise<void> {
    if (!this.config.verificationEnabled) {
      return;
    }

    const currentAgentId = await this.getAgentForSignal(signalId);
    if (!currentAgentId) {
      logger.warn('Cannot verify unattributed signal', { signalId });
      return;
    }

    // Update lifecycle with verification
    const lifecycle = this.signalLifecycles.get(signalId);
    if (lifecycle) {
      lifecycle.lifecycle.push({
        stage: 'resolved',
        timestamp: new Date(),
        agentId: correctAgentId,
        context: {
          verification: isCorrect,
          feedback,
          originalAttribution: currentAgentId
        }
      });
      lifecycle.currentStage = 'resolved';
    }

    // Update relationship verification
    const relationships = this.agentRelationships.get(currentAgentId);
    if (relationships) {
      const relationship = relationships.find(r => r.signalId === signalId);
      if (relationship) {
        relationship.verification.verified = true;
        relationship.verification.verificationCount++;
        relationship.verification.accuracyScore = isCorrect ? 1.0 : 0.0;
        relationship.verification.lastVerified = new Date();
      }
    }

    this.metrics.verificationOperations++;

    logger.debug('Signal attribution verified', {
      signalId,
      currentAgentId,
      correctAgentId,
      isCorrect
    });

    this.emit('attributionVerified', { signalId, currentAgentId, correctAgentId, isCorrect });
  }

  /**
   * Get registry metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      agentsActive: this.agents.size,
      signalsTracked: this.signalLifecycles.size,
      relationshipsTotal: Array.from(this.agentRelationships.values())
        .reduce((sum, rels) => sum + rels.length, 0),
      patternsTracked: this.signalPatterns.size,
      averageAttributionTime: this.metrics.averageAttributionTime
    };
  }

  /**
   * Cleanup old data
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.config.retentionPeriod;
    let cleanupCount = 0;

    // Cleanup old signal lifecycles
    for (const [signalId, lifecycle] of this.signalLifecycles.entries()) {
      if (lifecycle.createdAt.getTime() < cutoffTime) {
        this.signalLifecycles.delete(signalId);
        cleanupCount++;
      }
    }

    // Cleanup old relationships
    for (const [agentId, relationships] of this.agentRelationships.entries()) {
      const filtered = relationships.filter(r => r.relationship.establishedAt.getTime() > cutoffTime);
      this.agentRelationships.set(agentId, filtered);
      cleanupCount += relationships.length - filtered.length;
    }

    // Decay pattern frequencies
    if (this.config.enableLearning) {
      for (const [agentId, patterns] of this.patternLearner.entries()) {
        for (const [signalCode, frequency] of patterns.entries()) {
          const decayedFrequency = frequency * this.config.patternDecayFactor;
          if (decayedFrequency < this.config.minPatternFrequency) {
            patterns.delete(signalCode);
          } else {
            patterns.set(signalCode, decayedFrequency);
          }
        }
      }
    }

    this.metrics.cleanupOperations++;

    logger.info('Registry cleanup completed', {
      cutoffTime: new Date(cutoffTime),
      itemsCleaned: cleanupCount
    });
  }

  /**
   * Export registry data for backup/analysis
   */
  exportData(): {
    agents: AgentRegistration[];
    signalPatterns: Array<{ id: string; pattern: SignalPattern }>;
    relationships: Array<{ agentId: string; relationships: AgentSignalRelationship[] }>;
    lifecycles: SignalLifecycle[];
    metrics: typeof this.metrics;
  } {
    return {
      agents: Array.from(this.agents.values()),
      signalPatterns: Array.from(this.signalPatterns.entries()).map(([id, pattern]) => ({ id, pattern })),
      relationships: Array.from(this.agentRelationships.entries()).map(([agentId, relationships]) => ({
        agentId,
        relationships
      })),
      lifecycles: Array.from(this.signalLifecycles.values()),
      metrics: { ...this.metrics }
    };
  }

  // Private helper methods

  private async updateAgentActivity(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastActivity = new Date();
      agent.isActive = true;
    }
  }

  private updateAgentConfidence(agentId: string, confidence: AttributionConfidence): void {
    const confidenceScores = this.confidenceTracker.get(agentId);
    if (confidenceScores) {
      confidenceScores.push(this.confidenceToNumeric(confidence));

      // Keep only recent scores (last 100)
      if (confidenceScores.length > 100) {
        confidenceScores.shift();
      }

      // Update agent's average confidence
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.metrics.averageConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
      }
    }
  }

  private async trackSignalPattern(
    agentId: string,
    signalCode: string,
    action: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!this.config.enableLearning) {
      return;
    }

    const agentPatternLearner = this.patternLearner.get(agentId);
    if (!agentPatternLearner) {
      return;
    }

    const currentFrequency = agentPatternLearner.get(signalCode) || 0;
    const newFrequency = currentFrequency + 1;

    agentPatternLearner.set(signalCode, newFrequency);
  }

  private async updateGlobalSignalPattern(
    signalCode: string,
    context: string,
    frequency: number
  ): Promise<void> {
    let pattern = this.signalPatterns.get(signalCode);
    if (!pattern) {
      pattern = {
        signalCode,
        context,
        frequency,
        confidence: 0,
        lastSeen: new Date(),
        agentPreferences: new Map(),
        contextualFactors: {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          contentType: 'unknown'
        }
      };
    } else {
      pattern.frequency = Math.max(pattern.frequency, frequency);
      pattern.lastSeen = new Date();
    }

    this.signalPatterns.set(signalCode, pattern);
  }

  private confidenceToNumeric(confidence: AttributionConfidence): number {
    switch (confidence) {
      case 'high': return 1.0;
      case 'medium': return 0.7;
      case 'low': return 0.4;
      case 'unknown': return 0.1;
      default: return 0.0;
    }
  }

  private extractSignalCode(signalId: string): string {
    // Try to extract signal code from signal ID or return default
    const signalCodeMatch = signalId.match(/\[([^\]]+)\]/);
    return signalCodeMatch ? signalCodeMatch[1] : 'unknown';
  }

  private setupAutomaticCleanup(): void {
    setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Automatic cleanup failed', { error: error.message });
      });
    }, this.config.cleanupInterval);
  }
}