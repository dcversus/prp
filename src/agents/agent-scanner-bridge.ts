/**
 * ♫ Agent-Scanner Bridge for @dcversus/prp
 *
 * Bridges the gap between scanner signal detection and agent activities,
 * providing real-time correlation and attribution capabilities.
 */

import { EventEmitter } from 'events';

import { createLayerLogger, HashUtils } from '../shared';

import type {
  AgentActivityTracker,
  AgentSignalRegistry,
  AgentActivity,
  SignalAttribution,
  AttributedSignal,
  AgentActivityType,
  AttributionConfidence
} from './agent-activity-tracker';
import type { BaseAgent } from './base-agent';
import type { Signal, FileChange, PRPFile } from '../shared/types';
import type { ScannerConfig, ScanResult } from '../scanner/types';

const logger = createLayerLogger('agent-scanner-bridge');

/**
 * Bridge configuration options
 */
export interface AgentScannerBridgeConfig {
  enableRealTimeCorrelation: boolean;
  correlationTimeWindow: number; // milliseconds
  minConfidenceThreshold: number; // 0.0-1.0
  maxCorrelationCache: number;
  enableActivityChaining: boolean;
  attributionStrategies: Array<'temporal' | 'contextual' | 'pattern_match' | 'signature'>;
  sessionTracking: {
    enabled: boolean;
    sessionTimeout: number; // milliseconds
    maxSessionsPerAgent: number;
  };
}

/**
 * Activity correlation result
 */
export interface CorrelationResult {
  activityId: string;
  signalId: string;
  correlationScore: number;
  correlationMethod: string;
  evidence: string[];
  timestamp: Date;
}

/**
 * Agent session information
 */
export interface AgentSession {
  sessionId: string;
  agentId: string;
  agentType: string;
  startTime: Date;
  lastActivity: Date;
  activePRP?: string;
  currentTasks: string[];
  signalHistory: string[];
  activityCount: number;
  isActive: boolean;
}

/**
 * Agent-Scanner Bridge implementation
 */
export class AgentScannerBridge extends EventEmitter {
  private readonly config: AgentScannerBridgeConfig;
  private readonly activityTracker: AgentActivityTracker;
  private readonly signalRegistry: AgentSignalRegistry;

  // State management
  private readonly activeSessions = new Map<string, AgentSession>();
  private readonly correlationCache = new Map<string, CorrelationResult>();
  private readonly agentSignalPatterns = new Map<string, Map<string, number>>();

  // Performance tracking
  private readonly metrics = {
    correlationsAttempted: 0,
    correlationsSuccessful: 0,
    averageCorrelationTime: 0,
    sessionCount: 0,
    activityCount: 0
  };

  constructor(
    activityTracker: AgentActivityTracker,
    signalRegistry: AgentSignalRegistry,
    config: Partial<AgentScannerBridgeConfig> = {}
  ) {
    super();

    this.activityTracker = activityTracker;
    this.signalRegistry = signalRegistry;

    this.config = {
      enableRealTimeCorrelation: true,
      correlationTimeWindow: 30000, // 30 seconds
      minConfidenceThreshold: 0.6,
      maxCorrelationCache: 10000,
      enableActivityChaining: true,
      attributionStrategies: ['temporal', 'contextual', 'pattern_match', 'signature'],
      sessionTracking: {
        enabled: true,
        sessionTimeout: 300000, // 5 minutes
        maxSessionsPerAgent: 5
      },
      ...config
    };

    // Setup cleanup interval
    setInterval(() => {
      this.performCleanup().catch(error => {
        logger.error('Bridge cleanup failed', { error: error.message });
      });
    }, 60000); // Every minute
  }

  /**
   * Initialize the bridge and set up event listeners
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Agent-Scanner Bridge');

    // Set up scanner event listeners if available
    this.setupScannerListeners();

    // Set up agent event listeners
    this.setupAgentListeners();

    logger.info('Agent-Scanner Bridge initialized', {
      config: this.config,
      sessions: this.activeSessions.size
    });
  }

  /**
   * Correlate a detected signal with agent activities
   */
  async correlateSignalWithAgents(
    signal: Signal,
    scanContext?: {
      timestamp: Date;
      filePath?: string;
      prpContext?: string;
      relatedFiles?: FileChange[];
      relatedPRPs?: PRPFile[];
    }
  ): Promise<SignalAttribution> {
    const startTime = Date.now();
    this.metrics.correlationsAttempted++;

    logger.debug('Correlating signal with agents', {
      signalId: signal.id,
      signalCode: signal.code,
      timestamp: scanContext?.timestamp
    });

    try {
      // Get recent activities from all active agents
      const recentActivities = await this.getRecentAgentActivities(
        scanContext?.timestamp || new Date()
      );

      // Apply correlation strategies
      const attributions = await this.applyCorrelationStrategies(
        signal,
        recentActivities,
        scanContext
      );

      // Determine best attribution
      const bestAttribution = this.selectBestAttribution(attributions);

      // Update agent signal patterns for learning
      if (bestAttribution.attributedAgent) {
        await this.updateSignalPatterns(
          bestAttribution.attributedAgent.agentId,
          signal.code,
          scanContext
        );
      }

      // Cache correlation result
      const correlationResult: CorrelationResult = {
        activityId: bestAttribution.attributedAgent?.agentId || '',
        signalId: signal.id,
        correlationScore: bestAttribution.attributedAgent?.confidence === 'high' ? 1.0 : 0.5,
        correlationMethod: bestAttribution.attributionMethod,
        evidence: bestAttribution.attributedAgent?.evidence || [],
        timestamp: new Date()
      };

      this.cacheCorrelationResult(correlationResult);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateCorrelationMetrics(duration, true);

      logger.info('Signal correlation completed', {
        signalId: signal.id,
        attributedAgent: bestAttribution.attributedAgent?.agentId,
        confidence: bestAttribution.attributedAgent?.confidence,
        duration
      });

      // Emit correlation event
      this.emit('signalCorrelated', bestAttribution);

      return bestAttribution;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateCorrelationMetrics(duration, false);

      logger.error('Signal correlation failed', {
        signalId: signal.id,
        error: error.message,
        duration
      });

      // Return unknown attribution on failure
      return {
        signalId: signal.id,
        signalCode: signal.code,
        detectedAt: scanContext?.timestamp || new Date(),
        attributionMethod: 'pattern_match',
        metadata: {
          error: error.message,
          fallbackAttribution: true
        }
      };
    }
  }

  /**
   * Track agent activity and correlate with signals
   */
  async trackAgentActivity(
    agentId: string,
    activityType: AgentActivityType,
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    // Ensure agent session exists
    await this.ensureAgentSession(agentId);

    // Create activity record
    const activityId = await this.activityTracker.trackActivity({
      agentId,
      agentType: await this.getAgentType(agentId),
      activityType,
      description,
      metadata,
      relatedSignals: [],
      signalConfidence: AttributionConfidence.UNKNOWN,
      sessionId: this.getActiveSessionId(agentId),
      childActivityIds: []
    });

    // Update session
    this.updateAgentSession(agentId, activityType, description);

    // Try to correlate with recent signals
    if (this.config.enableRealTimeCorrelation) {
      await this.correlateActivityWithSignals(activityId);
    }

    // Update metrics
    this.metrics.activityCount++;

    logger.debug('Agent activity tracked', {
      activityId,
      agentId,
      activityType,
      description
    });

    this.emit('activityTracked', { activityId, agentId, activityType });

    return activityId;
  }

  /**
   * Get agent session information
   */
  getAgentSession(agentId: string): AgentSession | null {
    for (const session of this.activeSessions.values()) {
      if (session.agentId === agentId && session.isActive) {
        return session;
      }
    }
    return null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.isActive);
  }

  /**
   * Get bridge performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      correlationSuccessRate: this.metrics.correlationsAttempted > 0
        ? this.metrics.correlationsSuccessful / this.metrics.correlationsAttempted
        : 0,
      activeSessions: this.activeSessions.size,
      cachedCorrelations: this.correlationCache.size,
      averageSessionDuration: this.calculateAverageSessionDuration()
    };
  }

  /**
   * Cleanup expired sessions and cache entries
   */
  async performCleanup(): Promise<void> {
    const now = Date.now();

    // Cleanup expired sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity.getTime() > this.config.sessionTracking.sessionTimeout) {
        session.isActive = false;
        this.activeSessions.delete(sessionId);
        logger.debug('Expired agent session cleaned up', { sessionId, agentId: session.agentId });
      }
    }

    // Cleanup old correlation cache entries
    if (this.correlationCache.size > this.config.maxCorrelationCache) {
      const entriesToDelete = this.correlationCache.size - this.config.maxCorrelationCache;
      const keysToDelete = Array.from(this.correlationCache.keys()).slice(0, entriesToDelete);

      for (const key of keysToDelete) {
        this.correlationCache.delete(key);
      }
    }

    logger.debug('Bridge cleanup completed', {
      activeSessions: this.activeSessions.size,
      cacheSize: this.correlationCache.size
    });
  }

  // Private helper methods

  private setupScannerListeners(): void {
    // This would integrate with the actual scanner event system
    // For now, we'll emit placeholder events
    logger.debug('Scanner listeners would be set up here');
  }

  private setupAgentListeners(): void {
    // This would integrate with the actual agent event system
    logger.debug('Agent listeners would be set up here');
  }

  private async getRecentAgentActivities(timestamp: Date): Promise<AgentActivity[]> {
    // Get activities from the last correlation time window
    const timeWindow = this.config.correlationTimeWindow;
    const cutoffTime = new Date(timestamp.getTime() - timeWindow);

    // This would query the activity tracker for recent activities
    // For now, return empty array
    return [];
  }

  private async applyCorrelationStrategies(
    signal: Signal,
    activities: AgentActivity[],
    context?: any
  ): Promise<SignalAttribution[]> {
    const attributions: SignalAttribution[] = [];

    for (const strategy of this.config.attributionStrategies) {
      try {
        const attribution = await this.applyCorrelationStrategy(
          strategy,
          signal,
          activities,
          context
        );

        if (attribution) {
          attributions.push(attribution);
        }
      } catch (error) {
        logger.warn(`Correlation strategy ${strategy} failed`, {
          signalId: signal.id,
          error: error.message
        });
      }
    }

    return attributions;
  }

  private async applyCorrelationStrategy(
    strategy: string,
    signal: Signal,
    activities: AgentActivity[],
    context?: any
  ): Promise<SignalAttribution | null> {
    switch (strategy) {
      case 'temporal':
        return this.applyTemporalCorrelation(signal, activities, context);
      case 'contextual':
        return this.applyContextualCorrelation(signal, activities, context);
      case 'pattern_match':
        return this.applyPatternMatchCorrelation(signal, activities, context);
      case 'signature':
        return this.applySignatureCorrelation(signal, activities, context);
      default:
        return null;
    }
  }

  private async applyTemporalCorrelation(
    signal: Signal,
    activities: AgentActivity[],
    context?: any
  ): Promise<SignalAttribution | null> {
    // Find activities within time window
    const timeWindow = this.config.correlationTimeWindow;
    const signalTime = context?.timestamp || new Date();

    const recentActivities = activities.filter(activity => {
      const timeDiff = Math.abs(signalTime.getTime() - activity.timestamp.getTime());
      return timeDiff <= timeWindow;
    });

    if (recentActivities.length === 0) {
      return null;
    }

    // Select most recent activity
    const mostRecent = recentActivities.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    return {
      signalId: signal.id,
      signalCode: signal.code,
      detectedAt: signalTime,
      attributedAgent: {
        agentId: mostRecent.agentId,
        agentType: mostRecent.agentType,
        confidence: AttributionConfidence.MEDIUM,
        evidence: [`Temporal correlation: ${Math.abs(signalTime.getTime() - mostRecent.timestamp.getTime())}ms delta`],
        reasoning: 'Signal detected shortly after agent activity'
      },
      attributionMethod: 'temporal',
      metadata: {
        timeDelta: Math.abs(signalTime.getTime() - mostRecent.timestamp.getTime()),
        activityType: mostRecent.activityType
      }
    };
  }

  private async applyContextualCorrelation(
    signal: Signal,
    activities: AgentActivity[],
    context?: any
  ): Promise<SignalAttribution | null> {
    // Contextual correlation based on file paths, PRP context, etc.
    const filePath = context?.filePath;
    const prpContext = context?.prpContext;

    if (!filePath && !prpContext) {
      return null;
    }

    const matchingActivities = activities.filter(activity => {
      if (filePath && activity.filePath === filePath) return true;
      if (prpContext && activity.prpContext === prpContext) return true;
      return false;
    });

    if (matchingActivities.length === 0) {
      return null;
    }

    const activity = matchingActivities[0]; // Take first match

    return {
      signalId: signal.id,
      signalCode: signal.code,
      detectedAt: context?.timestamp || new Date(),
      attributedAgent: {
        agentId: activity.agentId,
        agentType: activity.agentType,
        confidence: AttributionConfidence.HIGH,
        evidence: [`Context match: ${filePath || prpContext}`],
        reasoning: 'Signal context matches agent activity context'
      },
      attributionMethod: 'contextual',
      metadata: {
        contextMatch: filePath || prpContext,
        activityType: activity.activityType
      }
    };
  }

  private async applyPatternMatchCorrelation(
    signal: Signal,
    activities: AgentActivity[],
    context?: any
  ): Promise<SignalAttribution | null> {
    // Pattern matching based on learned agent-signal patterns
    const signalCode = signal.code;
    let bestMatch: { agentId: string; confidence: number; frequency: number } | null = null;

    for (const [agentId, patterns] of this.agentSignalPatterns.entries()) {
      const frequency = patterns.get(signalCode) || 0;
      if (frequency > 0 && (!bestMatch || frequency > bestMatch.frequency)) {
        bestMatch = { agentId, confidence: Math.min(frequency / 10, 1.0), frequency };
      }
    }

    if (!bestMatch || bestMatch.confidence < this.config.minConfidenceThreshold) {
      return null;
    }

    return {
      signalId: signal.id,
      signalCode: signal.code,
      detectedAt: context?.timestamp || new Date(),
      attributedAgent: {
        agentId: bestMatch.agentId,
        agentType: await this.getAgentType(bestMatch.agentId),
        confidence: bestMatch.confidence > 0.8 ? AttributionConfidence.HIGH : AttributionConfidence.MEDIUM,
        evidence: [`Pattern match: ${signalCode} seen ${bestMatch.frequency} times`],
        reasoning: 'Historical pattern matching indicates likely agent'
      },
      attributionMethod: 'pattern_match',
      metadata: {
        frequency: bestMatch.frequency,
        confidence: bestMatch.confidence
      }
    };
  }

  private async applySignatureCorrelation(
    signal: Signal,
    activities: AgentActivity[],
    context?: any
  ): Promise<SignalAttribution | null> {
    // Signature-based correlation using unique agent identifiers in signal content
    const signalContent = typeof signal.data === 'string' ? signal.data : JSON.stringify(signal.data);

    // Look for agent signatures in signal content
    const agentSignatures = [
      { pattern: /robo-developer/i, agentType: 'robo-developer' },
      { pattern: /robo-aqa/i, agentType: 'robo-aqa' },
      { pattern: /robo-system-analyst/i, agentType: 'robo-system-analyst' },
      { pattern: /robo-ux-ui-designer/i, agentType: 'robo-ux-ui-designer' },
      { pattern: /robo-devops-sre/i, agentType: 'robo-devops-sre' },
      { pattern: /robo-quality-control/i, agentType: 'robo-quality-control' },
      { pattern: /orchestrator/i, agentType: 'orchestrator' }
    ];

    for (const signature of agentSignatures) {
      if (signature.pattern.test(signalContent)) {
        return {
          signalId: signal.id,
          signalCode: signal.code,
          detectedAt: context?.timestamp || new Date(),
          attributedAgent: {
            agentId: signature.agentType, // Use agentType as ID for signature matches
            agentType: signature.agentType,
            confidence: AttributionConfidence.HIGH,
            evidence: [`Signature match: ${signature.pattern.source}`],
            reasoning: 'Agent signature found in signal content'
          },
          attributionMethod: 'signature',
          metadata: {
            signatureMatch: signature.pattern.source,
            signalContent: signalContent.substring(0, 200) // First 200 chars
          }
        };
      }
    }

    return null;
  }

  private selectBestAttribution(attributions: SignalAttribution[]): SignalAttribution {
    if (attributions.length === 0) {
      return {
        signalId: '',
        signalCode: '',
        detectedAt: new Date(),
        attributionMethod: 'pattern_match',
        metadata: { noAttribution: true }
      };
    }

    // Sort by confidence level and method priority
    const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1, 'unknown': 0 };
    const methodOrder = { 'signature': 4, 'contextual': 3, 'pattern_match': 2, 'temporal': 1 };

    return attributions.sort((a, b) => {
      const aConfidence = a.attributedAgent?.confidence || 'unknown';
      const bConfidence = b.attributedAgent?.confidence || 'unknown';

      const confidenceDiff = confidenceOrder[bConfidence] - confidenceOrder[aConfidence];
      if (confidenceDiff !== 0) return confidenceDiff;

      return methodOrder[b.attributionMethod] - methodOrder[a.attributionMethod];
    })[0];
  }

  private async updateSignalPatterns(
    agentId: string,
    signalCode: string,
    context?: any
  ): Promise<void> {
    if (!this.agentSignalPatterns.has(agentId)) {
      this.agentSignalPatterns.set(agentId, new Map());
    }

    const patterns = this.agentSignalPatterns.get(agentId)!;
    const currentCount = patterns.get(signalCode) || 0;
    patterns.set(signalCode, currentCount + 1);

    // Update signal registry with learned patterns
    await this.signalRegistry.learnSignalPatterns(agentId, [{
      signalCode,
      context: JSON.stringify(context),
      frequency: currentCount + 1
    }]);
  }

  private cacheCorrelationResult(result: CorrelationResult): void {
    const key = HashUtils.sha256(result.signalId + result.activityId);
    this.correlationCache.set(key, result);

    // Cleanup old entries if cache is full
    if (this.correlationCache.size > this.config.maxCorrelationCache) {
      const firstKey = this.correlationCache.keys().next().value;
      this.correlationCache.delete(firstKey);
    }
  }

  private updateCorrelationMetrics(duration: number, success: boolean): void {
    if (success) {
      this.metrics.correlationsSuccessful++;
    }

    // Update average correlation time (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageCorrelationTime =
      this.metrics.averageCorrelationTime * (1 - alpha) + duration * alpha;
  }

  private async ensureAgentSession(agentId: string): Promise<void> {
    const existingSession = this.getAgentSession(agentId);

    if (!existingSession && this.config.sessionTracking.enabled) {
      const sessionId = HashUtils.sha256(agentId + Date.now().toString());
      const session: AgentSession = {
        sessionId,
        agentId,
        agentType: await this.getAgentType(agentId),
        startTime: new Date(),
        lastActivity: new Date(),
        currentTasks: [],
        signalHistory: [],
        activityCount: 0,
        isActive: true
      };

      this.activeSessions.set(sessionId, session);
      this.metrics.sessionCount++;
    }
  }

  private updateAgentSession(agentId: string, activityType: AgentActivityType, description: string): void {
    const session = this.getAgentSession(agentId);
    if (session) {
      session.lastActivity = new Date();
      session.activityCount++;

      // Update current tasks based on activity type
      if (activityType === AgentActivityType.TASK_STARTED) {
        session.currentTasks.push(description);
      } else if (activityType === AgentActivityType.TASK_COMPLETED) {
        session.currentTasks = session.currentTasks.filter(task => task !== description);
      }
    }
  }

  private async correlateActivityWithSignals(activityId: string): Promise<void> {
    // This would query recent signals and try to correlate them with the activity
    // Implementation depends on having access to signal storage/query system
    logger.debug('Activity-signal correlation would happen here', { activityId });
  }

  private getActiveSessionId(agentId: string): string | undefined {
    const session = this.getAgentSession(agentId);
    return session?.sessionId;
  }

  private async getAgentType(agentId: string): Promise<string> {
    // Extract agent type from agent ID or query agent registry
    if (agentId.includes('developer')) return 'robo-developer';
    if (agentId.includes('aqa')) return 'robo-aqa';
    if (agentId.includes('system-analyst')) return 'robo-system-analyst';
    if (agentId.includes('ux-ui')) return 'robo-ux-ui-designer';
    if (agentId.includes('devops')) return 'robo-devops-sre';
    if (agentId.includes('quality')) return 'robo-quality-control';
    if (agentId.includes('orchestrator')) return 'orchestrator';

    return 'unknown';
  }

  private calculateAverageSessionDuration(): number {
    const activeSessions = this.getActiveSessions();
    if (activeSessions.length === 0) return 0;

    const totalDuration = activeSessions.reduce((sum, session) => {
      return sum + (Date.now() - session.startTime.getTime());
    }, 0);

    return totalDuration / activeSessions.length;
  }
}