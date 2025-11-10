/**
 * Signal Aggregation and Bulk Delivery System
 *
 * Aggregates multiple signals and delivers them in bulk to optimize
 * orchestrator coordination and reduce notification noise.
 */

import { Signal } from '../shared/types';
import { createAgentNudgeIntegration } from '../shared/nudge/agent-integration';
import { createLayerLogger } from '../shared';
import { EnhancedSignalData, SignalHistoryEntry } from './signal-router.js';

const logger = createLayerLogger('signal-aggregation');

/**
 * Signal aggregation strategy
 */
export enum AggregationStrategy {
  BY_PRP = 'by-prp',           // Group signals by PRP
  BY_AGENT = 'by-agent',       // Group signals by agent type
  BY_PRIORITY = 'by-priority', // Group signals by priority
  BY_TIME = 'by-time',         // Group signals by time window
  BY_TYPE = 'by-type',         // Group signals by signal type
  BY_ESCALATION = 'by-escalation', // Group by escalation level
  BY_SYSTEM = 'by-system',     // Group by originating system
  BY_CONTEXT = 'by-context'    // Group by context similarity
}

/**
 * Enhanced aggregation result with multi-source support
 */
export interface SignalAggregationResult {
  batchId: string;
  signals: EnhancedSignalData[];
  aggregationStrategy: string;
  metadata: {
    totalSignals: number;
    prpIds: string[];
    agentTypes: string[];
    signalTypes: string[];
    priorities: number[];
    timeWindow: {
      start: Date;
      end: Date;
    };
    requiresAction: boolean;
    escalationLevel: number;
    sources: string[];
    contextSummary: Record<string, any>;
    enrichmentMetrics: {
      enrichedSignals: number;
      totalContextEntries: number;
      averageHistoryEntries: number;
    };
  };
  delivery: {
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'expired';
    attempts: number;
    lastAttempt?: Date;
    sentAt?: Date;
    error?: string;
    response?: unknown;
  };
}

/**
 * Multi-source aggregation rule
 */
export interface MultiSourceAggregationRule {
  id: string;
  name: string;
  strategy: AggregationStrategy;
  sources: string[]; // Which systems can contribute signals
  timeWindow: number;
  maxSignals: number;
  maxWaitTime: number;
  priority: number;
  contextEnrichment: {
    enabled: boolean;
    enrichRelatedSignals: boolean;
    includeSystemState: boolean;
    includeHistoricalContext: boolean;
    aggregationLevel: 'basic' | 'detailed' | 'comprehensive';
  };
  conditions: {
    signalTypes?: string[];
    agentTypes?: string[];
    prpIds?: string[];
    minPriority?: number;
    escalationLevel?: number;
    systemState?: Record<string, any>;
  };
  enabled: boolean;
}

/**
 * Aggregation rule configuration
 */
export interface AggregationRule {
  id: string;
  name: string;
  strategy: AggregationStrategy;
  timeWindow: number; // milliseconds
  maxSignals: number;
  maxWaitTime: number; // milliseconds
  priority: number; // Higher priority rules are applied first
  conditions: {
    signalTypes?: string[];
    agentTypes?: string[];
    prpIds?: string[];
    minPriority?: number;
  };
  enabled: boolean;
}

/**
 * Signal batch for bulk delivery
 */
export interface SignalBatch {
  id: string;
  strategy: AggregationStrategy;
  ruleId: string;
  signals: Signal[];
  metadata: {
    createdAt: Date;
    signalCount: number;
    prpIds: string[];
    agentTypes: string[];
    signalTypes: string[];
    priorities: number[];
    oldestSignal: Date;
    newestSignal: Date;
    requiresAction: boolean;
    escalationLevel: number;
  };
  delivery: {
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'expired';
    attempts: number;
    maxAttempts: number;
    lastAttempt?: Date;
    sentAt?: Date;
    error?: string;
    response?: unknown;
  };
}

/**
 * Bulk delivery configuration
 */
export interface BulkDeliveryConfig {
  maxBatchSize: number;
  deliveryInterval: number;
  maxRetries: number;
  retryDelay: number;
  expirationTime: number;
  enableCompression: boolean;
  enableDeduplication: boolean;
  aggregationRules: AggregationRule[];
}

/**
 * Signal Aggregation and Bulk Delivery System
 */
export class SignalAggregationSystem {
  private agentNudge: ReturnType<typeof createAgentNudgeIntegration>;
  private config: BulkDeliveryConfig;
  private signalBatches: Map<string, SignalBatch> = new Map();
  private aggregationBuffers: Map<string, Signal[]> = new Map();
  private processingTimer?: ReturnType<typeof setInterval>;
  private deliveryTimer?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<BulkDeliveryConfig>) {
    this.agentNudge = createAgentNudgeIntegration();
    this.config = {
      maxBatchSize: 20,
      deliveryInterval: 60000, // 1 minute
      maxRetries: 3,
      retryDelay: 30000, // 30 seconds
      expirationTime: 300000, // 5 minutes
      enableCompression: true,
      enableDeduplication: true,
      aggregationRules: this.getDefaultAggregationRules(),
      ...config
    };

    this.initializeAggregationSystem();
  }

  /**
   * Get default aggregation rules
   */
  private getDefaultAggregationRules(): AggregationRule[] {
    return [
      // Critical signals - immediate delivery, no aggregation
      {
        id: 'critical-immediate',
        name: 'Critical Immediate Delivery',
        strategy: AggregationStrategy.BY_PRIORITY,
        timeWindow: 0, // No waiting
        maxSignals: 1,
        maxWaitTime: 0,
        priority: 100,
        conditions: {
          minPriority: 8,
          signalTypes: ['FF', 'bb', 'ic', 'JC', 'er']
        },
        enabled: true
      },

      // High priority signals - small batches, short wait
      {
        id: 'high-priority-batch',
        name: 'High Priority Batch',
        strategy: AggregationStrategy.BY_PRP,
        timeWindow: 30000, // 30 seconds
        maxSignals: 5,
        maxWaitTime: 60000, // 1 minute max
        priority: 80,
        conditions: {
          minPriority: 7
        },
        enabled: true
      },

      // Medium priority signals - medium batches
      {
        id: 'medium-priority-batch',
        name: 'Medium Priority Batch',
        strategy: AggregationStrategy.BY_PRP,
        timeWindow: 60000, // 1 minute
        maxSignals: 10,
        maxWaitTime: 120000, // 2 minutes max
        priority: 60,
        conditions: {
          minPriority: 5
        },
        enabled: true
      },

      // Low priority signals - larger batches, longer wait
      {
        id: 'low-priority-batch',
        name: 'Low Priority Batch',
        strategy: AggregationStrategy.BY_AGENT,
        timeWindow: 120000, // 2 minutes
        maxSignals: 15,
        maxWaitTime: 300000, // 5 minutes max
        priority: 40,
        conditions: {
          minPriority: 3
        },
        enabled: true
      },

      // Orchestrator coordination signals - special handling
      {
        id: 'orchestrator-coordination',
        name: 'Orchestrator Coordination',
        strategy: AggregationStrategy.BY_TYPE,
        timeWindow: 45000, // 45 seconds
        maxSignals: 8,
        maxWaitTime: 90000, // 1.5 minutes max
        priority: 90,
        conditions: {
          signalTypes: ['oa', 'aa', 'ap', '*A', 'A*'],
          agentTypes: ['orchestrator', 'system-analyst', 'robo-orchestrator']
        },
        enabled: true
      }
    ];
  }

  /**
   * Initialize aggregation system
   */
  private initializeAggregationSystem(): void {
    // Start processing timer
    this.processingTimer = setInterval(() => {
      this.processAggregationBuffers();
    }, this.config.deliveryInterval);

    // Start delivery timer
    this.deliveryTimer = setInterval(() => {
      this.processBatchDelivery();
    }, this.config.deliveryInterval / 2); // More frequent than processing

    logger.info('SignalAggregation', 'Signal aggregation system initialized', {
      rules: this.config.aggregationRules.length,
      deliveryInterval: this.config.deliveryInterval,
      maxBatchSize: this.config.maxBatchSize
    });
  }

  /**
   * Add signal to aggregation system
   */
  addSignal(signal: Signal): {
    batchId?: string;
    immediateDelivery: boolean;
    ruleApplied?: string;
  } {
    logger.debug('SignalAggregation', 'Adding signal to aggregation', {
      signalId: signal.id,
      type: signal.type,
      priority: signal.priority
    });

    // Find applicable aggregation rule
    const applicableRule = this.findApplicableRule(signal);

    if (!applicableRule) {
      logger.debug('SignalAggregation', 'No applicable rule found, using default');
      return { immediateDelivery: false };
    }

    // Handle immediate delivery for critical signals
    if (applicableRule.timeWindow === 0 || applicableRule.maxSignals === 1) {
      return this.handleImmediateDelivery(signal, applicableRule);
    }

    // Add to aggregation buffer
    return this.addToAggregationBuffer(signal, applicableRule);
  }

  /**
   * Find applicable aggregation rule for signal
   */
  private findApplicableRule(signal: Signal): AggregationRule | null {
    const applicableRules = this.config.aggregationRules
      .filter(rule => rule.enabled)
      .filter(rule => this.matchesRuleConditions(signal, rule))
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    return applicableRules[0] ?? null;
  }

  /**
   * Check if signal matches rule conditions
   */
  private matchesRuleConditions(signal: Signal, rule: AggregationRule): boolean {
    const conditions = rule.conditions;

    // Check signal types
    if (conditions.signalTypes && !conditions.signalTypes.includes(signal.type)) {
      return false;
    }

    // Check priority range
    if (conditions.minPriority && signal.priority < conditions.minPriority) {
      return false;
    }

    if (conditions.minPriority && signal.priority > conditions.minPriority) {
      return false;
    }

    // Check agent types
    const agentType = signal.metadata?.['agent'] as string;
    if (conditions.agentTypes && agentType && !conditions.agentTypes.includes(agentType)) {
      return false;
    }

    // Check PRP IDs
    const prpId = (signal.data)['prpId'] as string;
    if (conditions.prpIds && prpId && !conditions.prpIds.includes(prpId)) {
      return false;
    }

    return true;
  }

  /**
   * Handle immediate delivery for critical signals
   */
  private handleImmediateDelivery(signal: Signal, rule: AggregationRule): {
    batchId: string;
    immediateDelivery: boolean;
    ruleApplied: string;
  } {
    const batchId = this.createBatchId(rule.strategy, signal);
    const batch: SignalBatch = {
      id: batchId,
      strategy: rule.strategy,
      ruleId: rule.id,
      signals: [signal],
      metadata: this.createBatchMetadata([signal]),
      delivery: {
        status: 'pending',
        attempts: 0,
        maxAttempts: this.config.maxRetries
      }
    };

    this.signalBatches.set(batchId, batch);

    // Trigger immediate delivery
    this.deliverBatch(batch);

    logger.info('SignalAggregation', 'Immediate delivery triggered', {
      batchId,
      signalId: signal.id,
      rule: rule.name
    });

    return {
      batchId,
      immediateDelivery: true,
      ruleApplied: rule.name
    };
  }

  /**
   * Add signal to aggregation buffer
   */
  private addToAggregationBuffer(signal: Signal, rule: AggregationRule): {
    batchId?: string;
    immediateDelivery: boolean;
    ruleApplied: string;
  } {
    const bufferKey = this.getBufferKey(signal, rule);

    if (!this.aggregationBuffers.has(bufferKey)) {
      this.aggregationBuffers.set(bufferKey, []);
    }

    const buffer = this.aggregationBuffers.get(bufferKey);
    if (!buffer) {
      return {
        immediateDelivery: false,
        ruleApplied: rule.name
      };
    }

    // Check for deduplication
    if (this.config.enableDeduplication && this.isDuplicateSignal(signal, buffer)) {
      logger.debug('SignalAggregation', 'Duplicate signal filtered', {
        signalId: signal.id,
        bufferKey
      });
      return {
        immediateDelivery: false,
        ruleApplied: rule.name
      };
    }

    buffer.push(signal);

    logger.debug('SignalAggregation', 'Signal added to buffer', {
      signalId: signal.id,
      bufferKey,
      bufferSize: buffer.length,
      rule: rule.name
    });

    // Check if buffer should be processed immediately
    if (buffer.length >= rule.maxSignals) {
      const batch = this.createBatchFromBuffer(bufferKey, rule);
      if (batch) {
        this.deliverBatch(batch);
        return {
          batchId: batch.id,
          immediateDelivery: true,
          ruleApplied: rule.name
        };
      }
    }

    return {
      immediateDelivery: false,
      ruleApplied: rule.name
    };
  }

  /**
   * Get buffer key for signal aggregation
   */
  private getBufferKey(signal: Signal, rule: AggregationRule): string {
    switch (rule.strategy) {
      case AggregationStrategy.BY_PRP:
        return `prp:${(signal.data)['prpId'] ?? 'unknown'}`;
      case AggregationStrategy.BY_AGENT:
        return `agent:${signal.metadata?.['agent'] ?? 'unknown'}`;
      case AggregationStrategy.BY_PRIORITY:
        return `priority:${signal.priority}`;
      case AggregationStrategy.BY_TYPE:
        return `type:${signal.type}`;
      case AggregationStrategy.BY_TIME: {
        const timeWindow = Math.floor(Date.now() / rule.timeWindow);
        return `time:${timeWindow}`;
      }
      default:
        return `default:${rule.id}`;
    }
  }

  /**
   * Check if signal is duplicate in buffer
   */
  private isDuplicateSignal(signal: Signal, buffer: Signal[]): boolean {
    return buffer.some(existingSignal =>
      existingSignal.type === signal.type &&
      existingSignal.source === signal.source &&
      existingSignal.priority === signal.priority &&
      JSON.stringify(existingSignal.data) === JSON.stringify(signal.data)
    );
  }

  /**
   * Process aggregation buffers
   */
  private async processAggregationBuffers(): Promise<void> {
    logger.debug('SignalAggregation', 'Processing aggregation buffers', {
      bufferCount: this.aggregationBuffers.size
    });

    const now = Date.now();
    const buffersToProcess: string[] = [];

    // Find buffers that need processing
    for (const [bufferKey, buffer] of Array.from(this.aggregationBuffers.entries())) {
      if (buffer.length === 0) {
        continue;
      }

      // Find applicable rule for this buffer
      const sampleSignal = buffer[0];
      if (!sampleSignal) {
        continue;
      }
      const rule = this.findApplicableRule(sampleSignal);

      if (!rule) {
        continue;
      }

      // Check if buffer should be processed based on time
      const oldestSignal = buffer.reduce((oldest, current) =>
        current.timestamp < oldest.timestamp ? current : oldest
      );
      const timeInBuffer = now - oldestSignal.timestamp.getTime();

      if (timeInBuffer >= rule.maxWaitTime || buffer.length >= rule.maxSignals) {
        buffersToProcess.push(bufferKey);
      }
    }

    // Process identified buffers
    for (const bufferKey of buffersToProcess) {
      const buffer = this.aggregationBuffers.get(bufferKey);
      if (buffer && buffer.length > 0) {
        const sampleSignal = buffer[0];
        if (!sampleSignal) {
          continue;
        }
        const rule = this.findApplicableRule(sampleSignal);

        if (rule) {
          const batch = this.createBatchFromBuffer(bufferKey, rule);
          if (batch) {
            await this.deliverBatch(batch);
          }
        }
      }
    }

    // Clean up empty buffers
    for (const [bufferKey, buffer] of Array.from(this.aggregationBuffers.entries())) {
      if (buffer.length === 0) {
        this.aggregationBuffers.delete(bufferKey);
      }
    }

    logger.debug('SignalAggregation', 'Buffer processing completed', {
      processedBuffers: buffersToProcess.length,
      remainingBuffers: this.aggregationBuffers.size
    });
  }

  /**
   * Create batch from aggregation buffer
   */
  private createBatchFromBuffer(bufferKey: string, rule: AggregationRule): SignalBatch | null {
    const buffer = this.aggregationBuffers.get(bufferKey);
    if (!buffer || buffer.length === 0) {
      return null;
    }

    const sampleSignal = buffer[0];
    if (!sampleSignal) {
      return null;
    }
    const batchId = this.createBatchId(rule.strategy, sampleSignal);
    const batch: SignalBatch = {
      id: batchId,
      strategy: rule.strategy,
      ruleId: rule.id,
      signals: [...buffer], // Copy signals
      metadata: this.createBatchMetadata(buffer),
      delivery: {
        status: 'pending',
        attempts: 0,
        maxAttempts: this.config.maxRetries
      }
    };

    // Clear buffer
    this.aggregationBuffers.delete(bufferKey);

    // Store batch
    this.signalBatches.set(batchId, batch);

    logger.info('SignalAggregation', 'Batch created from buffer', {
      batchId,
      signalCount: buffer.length,
      strategy: rule.strategy,
      bufferKey
    });

    return batch;
  }

  /**
   * Create batch ID
   */
  private createBatchId(strategy: AggregationStrategy, signal: Signal): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    const type = signal.type;
    const prpId = (signal.data)['prpId'] ?? 'unknown';

    return `batch_${strategy}_${prpId}_${type}_${timestamp}_${random}`;
  }

  /**
   * Create batch metadata
   */
  private createBatchMetadata(signals: Signal[]): SignalBatch['metadata'] {
    const prpIds = [...new Set(signals.map(s => (s.data)['prpId']).filter(Boolean))];
    const agentTypes = [...new Set(signals.map(s => s.metadata?.['agent']).filter(Boolean))];
    const signalTypes = [...new Set(signals.map(s => s.type))];
    const priorities = signals.map(s => s.priority);
    const timestamps = signals.map(s => s.timestamp);

    const oldestSignal = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const newestSignal = new Date(Math.max(...timestamps.map(t => t.getTime())));

    // Check if batch requires action
    const requiresAction = signals.some(s =>
      ['bb', 'af', 'gg', 'oa', 'aa', 'ic', 'er'].includes(s.type)
    );

    // Calculate escalation level
    const minPriority = Math.max(...priorities);
    const escalationLevel = minPriority >= 8 ? 3 : minPriority >= 6 ? 2 : minPriority >= 4 ? 1 : 0;

    return {
      createdAt: new Date(),
      signalCount: signals.length,
      prpIds: prpIds as string[],
      agentTypes: agentTypes as string[],
      signalTypes,
      priorities,
      oldestSignal,
      newestSignal,
      requiresAction,
      escalationLevel
    };
  }

  /**
   * Deliver signal batch
   */
  private async deliverBatch(batch: SignalBatch): Promise<void> {
    if (batch.delivery.status !== 'pending') {
      logger.debug('SignalAggregation', 'Batch already processed', { batchId: batch.id });
      return;
    }

    batch.delivery.status = 'processing';
    batch.delivery.lastAttempt = new Date();
    batch.delivery.attempts++;

    logger.info('SignalAggregation', 'Delivering signal batch', {
      batchId: batch.id,
      signalCount: batch.signals.length,
      strategy: batch.strategy,
      attempt: batch.delivery.attempts
    });

    try {
      const result = await this.sendBatchToNudge(batch);

      batch.delivery.status = 'sent';
      batch.delivery.sentAt = new Date();
      batch.delivery.response = result;

      logger.info('SignalAggregation', 'Batch delivered successfully', {
        batchId: batch.id,
        deliveryTime: Date.now() - batch.delivery.lastAttempt.getTime()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      batch.delivery.error = errorMessage;

      if (batch.delivery.attempts >= batch.delivery.maxAttempts) {
        batch.delivery.status = 'failed';
        logger.error('SignalAggregation', 'Batch delivery failed permanently', error instanceof Error ? error : new Error(errorMessage), {
          batchId: batch.id,
          attempts: batch.delivery.attempts
        });
      } else {
        batch.delivery.status = 'pending';
        logger.warn('SignalAggregation', 'Batch delivery failed, will retry', {
          batchId: batch.id,
          attempts: batch.delivery.attempts,
          maxAttempts: batch.delivery.maxAttempts,
          error: errorMessage
        });

        // Schedule retry
        setTimeout(() => {
          this.deliverBatch(batch);
        }, this.config.retryDelay);
      }
    }
  }

  /**
   * Send batch to nudge system
   */
  private async sendBatchToNudge(batch: SignalBatch): Promise<unknown> {
    const message = this.formatBatchMessage(batch);
    const prpId = batch.metadata.prpIds[0] ?? 'BATCH-SIGNALS';
    const urgency = this.mapEscalationToUrgency(batch.metadata.escalationLevel);

    if (batch.metadata.requiresAction) {
      return this.agentNudge.sendAdminAttention({
        prpId,
        agentType: 'signal-aggregator',
        topic: `Batch Signal Update (${batch.signals.length} signals)`,
        summary: `Aggregated signals from ${batch.metadata.prpIds.join(', ')}`,
        details: message,
        actionRequired: 'Review aggregated signals and provide guidance',
        priority: urgency
      });
    } else {
      return this.agentNudge.sendCustomNudge({
        prpId,
        agentType: 'signal-aggregator',
        message,
        urgency
      });
    }
  }

  /**
   * Format batch message for delivery
   */
  private formatBatchMessage(batch: SignalBatch): string {
    let message = '📊 Signal Batch Report\n\n';
    message += `Strategy: ${batch.strategy}\n`;
    message += `Signals: ${batch.metadata.signalCount}\n`;
    message += `Time Window: ${batch.metadata.oldestSignal.toISOString()} - ${batch.metadata.newestSignal.toISOString()}\n`;

    if (batch.metadata.prpIds.length > 0) {
      message += `PRPs: ${batch.metadata.prpIds.join(', ')}\n`;
    }

    if (batch.metadata.agentTypes.length > 0) {
      message += `Agents: ${batch.metadata.agentTypes.join(', ')}\n`;
    }

    message += '\n--- Signal Details ---\n';

    // Group signals by type for better readability
    const signalsByType = new Map<string, Signal[]>();
    batch.signals.forEach(signal => {
      const signalList = signalsByType.get(signal.type) ?? [];
      signalList.push(signal);
      signalsByType.set(signal.type, signalList);
    });

    for (const [signalType, signals] of Array.from(signalsByType.entries())) {
      message += `\n🔸 ${signalType} (${signals.length} signals):\n`;
      signals.forEach((signal, index) => {
        const prpId = signal.data.prpId ?? 'unknown';
        const agent = signal.metadata.agent ?? 'unknown';
        const time = signal.timestamp.toLocaleTimeString();
        message += `  ${index + 1}. [${time}] ${agent} - ${prpId}\n`;
      });
    }

    if (batch.metadata.requiresAction) {
      message += '\n🎯 Action Required: Please review these signals and provide necessary guidance or decisions.\n';
    }

    return message;
  }

  /**
   * Map escalation level to nudge urgency
   */
  private mapEscalationToUrgency(escalationLevel: number): 'high' | 'medium' | 'low' {
    if (escalationLevel >= 3) {
      return 'high';
    }
    if (escalationLevel >= 2) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Process batch delivery for retries and expired batches
   */
  private async processBatchDelivery(): Promise<void> {
    const now = Date.now();
    const batchesToProcess: SignalBatch[] = [];

    // Find batches that need processing
    for (const batch of Array.from(this.signalBatches.values())) {
      if (batch.delivery.status === 'pending') {
        batchesToProcess.push(batch);
      } else if (batch.delivery.status === 'sent' &&
                 batch.delivery.sentAt &&
                 (now - batch.delivery.sentAt.getTime()) > this.config.expirationTime) {
        // Mark as expired for cleanup
        batch.delivery.status = 'expired';
      }
    }

    // Process pending batches
    for (const batch of batchesToProcess) {
      await this.deliverBatch(batch);
    }

    // Clean up old batches
    this.cleanupOldBatches();
  }

  /**
   * Clean up old batches
   */
  private cleanupOldBatches(): void {
    const cutoffTime = Date.now() - this.config.expirationTime * 2; // Keep for 2x expiration time
    let cleanedCount = 0;

    for (const [batchId, batch] of Array.from(this.signalBatches.entries())) {
      const createdAt = batch.metadata.createdAt.getTime();
      if (createdAt < cutoffTime &&
          (batch.delivery.status === 'sent' || batch.delivery.status === 'failed')) {
        this.signalBatches.delete(batchId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('SignalAggregation', 'Cleaned up old batches', { cleanedCount });
    }
  }

  /**
   * Get aggregation statistics
   */
  getAggregationStats(): {
    buffers: {
      count: number;
      totalSignals: number;
      byStrategy: Record<AggregationStrategy, number>;
    };
    batches: {
      pending: number;
      processing: number;
      sent: number;
      failed: number;
      expired: number;
      total: number;
    };
    rules: {
      enabled: number;
      disabled: number;
      total: number;
    };
    } {
    const buffers = Array.from(this.aggregationBuffers.values());
    const batches = Array.from(this.signalBatches.values());

    const buffersByStrategy: Record<AggregationStrategy, number> = {
      [AggregationStrategy.BY_PRP]: 0,
      [AggregationStrategy.BY_AGENT]: 0,
      [AggregationStrategy.BY_PRIORITY]: 0,
      [AggregationStrategy.BY_TIME]: 0,
      [AggregationStrategy.BY_TYPE]: 0
    };

    // Count signals by strategy (simplified - would need tracking)
    buffers.forEach(buffer => {
      // Just assign to a default for counting
      buffersByStrategy[AggregationStrategy.BY_PRP] += buffer.length;
    });

    const batchStatusCounts = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      expired: 0,
      total: batches.length
    };

    batches.forEach(batch => {
      batchStatusCounts[batch.delivery.status]++;
    });

    const ruleCounts = {
      enabled: this.config.aggregationRules.filter(r => r.enabled).length,
      disabled: this.config.aggregationRules.filter(r => !r.enabled).length,
      total: this.config.aggregationRules.length
    };

    return {
      buffers: {
        count: this.aggregationBuffers.size,
        totalSignals: buffers.reduce((sum, buffer) => sum + buffer.length, 0),
        byStrategy: buffersByStrategy
      },
      batches: batchStatusCounts,
      rules: ruleCounts
    };
  }

  /**
   * Update aggregation rules
   */
  updateAggregationRules(rules: AggregationRule[]): void {
    this.config.aggregationRules = rules;
    logger.info('SignalAggregation', 'Aggregation rules updated', {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length
    });
  }

  /**
   * Enable/disable aggregation rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.config.aggregationRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info('SignalAggregation', `Rule ${enabled ? 'enabled' : 'disabled'}`, { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get all batches
   */
  getBatches(): SignalBatch[] {
    return Array.from(this.signalBatches.values());
  }

  /**
   * Get batch by ID
   */
  getBatch(batchId: string): SignalBatch | undefined {
    return this.signalBatches.get(batchId);
  }

  /**
   * Force process all buffers
   */
  async forceProcessAllBuffers(): Promise<void> {
    logger.info('SignalAggregation', 'Force processing all buffers');
    await this.processAggregationBuffers();
  }

  /**
   * Enhanced multi-source signal aggregation with context enrichment
   */
  async addEnhancedSignal(signal: EnhancedSignalData, sourceSystem: string): Promise<{
    batchId?: string;
    immediateDelivery: boolean;
    ruleApplied?: string;
    enriched: boolean;
  }> {
    logger.debug('SignalAggregation', 'Adding enhanced signal to aggregation', {
      signalId: signal.id,
      type: signal.type,
      priority: signal.priority,
      sourceSystem
    });

    // Find applicable multi-source aggregation rule
    const applicableRule = this.findMultiSourceRule(signal, sourceSystem);

    if (!applicableRule) {
      logger.debug('SignalAggregation', 'No applicable multi-source rule found, using default');
      return { immediateDelivery: false, enriched: false };
    }

    // Handle immediate delivery for critical signals
    if (applicableRule.timeWindow === 0 || applicableRule.maxSignals === 1) {
      return this.handleImmediateEnhancedDelivery(signal, applicableRule);
    }

    // Enrich signal if enabled
    let enriched = false;
    if (applicableRule.contextEnrichment.enabled) {
      await this.enrichSignalContext(signal, applicableRule.contextEnrichment);
      enriched = true;
    }

    // Add to enhanced aggregation buffer
    return this.addToEnhancedAggregationBuffer(signal, applicableRule, sourceSystem);
  }

  /**
   * Find applicable multi-source aggregation rule
   */
  private findMultiSourceRule(signal: EnhancedSignalData, sourceSystem: string): MultiSourceAggregationRule | null {
    const rules = this.getDefaultMultiSourceRules();

    return rules.find(rule => {
      if (!rule.enabled) {
        return false;
      }

      // Check if source system is allowed
      if (!rule.sources.includes(sourceSystem) && !rule.sources.includes('*')) {
        return false;
      }

      // Check signal types
      if (rule.conditions.signalTypes && !rule.conditions.signalTypes.includes(signal.type)) {
        return false;
      }

      // Check priority
      if (rule.conditions.minPriority && signal.priority < rule.conditions.minPriority) {
        return false;
      }

      // Check escalation level
      if (rule.conditions.escalationLevel && signal.routing.escalationLevel !== rule.conditions.escalationLevel) {
        return false;
      }

      // Check PRP IDs
      const prpId = signal.context.prpId;
      if (rule.conditions.prpIds && prpId && !rule.conditions.prpIds.includes(prpId)) {
        return false;
      }

      // Check system state conditions
      if (rule.conditions.systemState) {
        const systemState = signal.context.systemState;
        for (const [key, value] of Object.entries(rule.conditions.systemState)) {
          if (systemState[key] !== value) {
            return false;
          }
        }
      }

      return true;
    }) || null;
  }

  /**
   * Handle immediate delivery for enhanced signals
   */
  private handleImmediateEnhancedDelivery(signal: EnhancedSignalData, rule: MultiSourceAggregationRule): {
    batchId: string;
    immediateDelivery: boolean;
    ruleApplied: string;
    enriched: boolean;
  } {
    const batchId = this.createEnhancedBatchId(rule.strategy, signal);

    const result: SignalAggregationResult = {
      batchId,
      signals: [signal],
      aggregationStrategy: rule.strategy,
      metadata: this.createEnhancedBatchMetadata([signal], rule.strategy),
      delivery: {
        status: 'pending',
        attempts: 0,
        maxAttempts: this.config.maxRetries
      }
    };

    // Store in enhanced batches map
    this.enhancedSignalBatches.set(batchId, result);

    // Trigger immediate delivery
    this.deliverEnhancedBatch(result);

    logger.info('SignalAggregation', 'Immediate enhanced delivery triggered', {
      batchId,
      signalId: signal.id,
      rule: rule.name,
      enriched: true
    });

    return {
      batchId,
      immediateDelivery: true,
      ruleApplied: rule.name,
      enriched: true
    };
  }

  /**
   * Add signal to enhanced aggregation buffer
   */
  private addToEnhancedAggregationBuffer(
    signal: EnhancedSignalData,
    rule: MultiSourceAggregationRule,
    sourceSystem: string
  ): {
    batchId?: string;
    immediateDelivery: boolean;
    ruleApplied: string;
    enriched: boolean;
  } {
    const bufferKey = this.getEnhancedBufferKey(signal, rule, sourceSystem);

    if (!this.enhancedAggregationBuffers.has(bufferKey)) {
      this.enhancedAggregationBuffers.set(bufferKey, {
        signals: [],
        rule,
        sources: new Set([sourceSystem]),
        createdAt: new Date()
      });
    }

    const buffer = this.enhancedAggregationBuffers.get(bufferKey)!;

    // Check for deduplication
    if (this.config.enableDeduplication && this.isDuplicateEnhancedSignal(signal, buffer.signals)) {
      logger.debug('SignalAggregation', 'Duplicate enhanced signal filtered', {
        signalId: signal.id,
        bufferKey
      });
      return {
        immediateDelivery: false,
        ruleApplied: rule.name,
        enriched: true
      };
    }

    buffer.signals.push(signal);
    buffer.sources.add(sourceSystem);

    logger.debug('SignalAggregation', 'Enhanced signal added to buffer', {
      signalId: signal.id,
      bufferKey,
      bufferSize: buffer.signals.length,
      sources: Array.from(buffer.sources),
      rule: rule.name
    });

    // Check if buffer should be processed immediately
    if (buffer.signals.length >= rule.maxSignals) {
      const batch = this.createEnhancedBatchFromBuffer(bufferKey);
      if (batch) {
        this.deliverEnhancedBatch(batch);
        return {
          batchId: batch.batchId,
          immediateDelivery: true,
          ruleApplied: rule.name,
          enriched: true
        };
      }
    }

    return {
      immediateDelivery: false,
      ruleApplied: rule.name,
      enriched: true
    };
  }

  /**
   * Enrich signal context based on rule configuration
   */
  private async enrichSignalContext(signal: EnhancedSignalData, config: {
    enabled: boolean;
    enrichRelatedSignals: boolean;
    includeSystemState: boolean;
    includeHistoricalContext: boolean;
    aggregationLevel: 'basic' | 'detailed' | 'comprehensive';
  }): Promise<void> {
    if (!config.enabled) {
      return;
    }

    // Add system state context
    if (config.includeSystemState) {
      signal.context.systemState = {
        ...signal.context.systemState,
        aggregationTimestamp: new Date().toISOString(),
        aggregationLevel: config.aggregationLevel
      };
    }

    // Add historical context
    if (config.includeHistoricalContext && config.aggregationLevel !== 'basic') {
      const historicalEntry: SignalHistoryEntry = {
        timestamp: new Date(),
        action: 'signal_enriched_for_aggregation',
        result: 'success',
        details: {
          enrichmentLevel: config.aggregationLevel,
          aggregationTimestamp: new Date().toISOString()
        }
      };

      signal.context.historicalContext.push(historicalEntry);
    }

    // Add related signals information
    if (config.enrichRelatedSignals && config.aggregationLevel === 'comprehensive') {
      // This would normally query related signals from the signal registry
      // For now, we'll add placeholder related signals
      signal.context.relatedSignals = [
        `related_${signal.id}_1`,
        `related_${signal.id}_2`
      ];
    }

    // Add enrichment metadata
    signal.context.metadata = {
      ...signal.context.metadata,
      enrichedForAggregation: true,
      enrichmentConfig: config,
      enrichedAt: new Date().toISOString()
    };
  }

  /**
   * Get enhanced buffer key for aggregation
   */
  private getEnhancedBufferKey(signal: EnhancedSignalData, rule: MultiSourceAggregationRule, sourceSystem: string): string {
    switch (rule.strategy) {
      case AggregationStrategy.BY_PRP:
        return `${rule.strategy}:${signal.context.prpId || 'unknown'}`;

      case AggregationStrategy.BY_AGENT:
        return `${rule.strategy}:${signal.routing.assignedAgent || 'unassigned'}`;

      case AggregationStrategy.BY_PRIORITY:
        return `${rule.strategy}:${signal.routing.escalationLevel}`;

      case AggregationStrategy.BY_TYPE:
        return `${rule.strategy}:${signal.type}`;

      case AggregationStrategy.BY_ESCALATION:
        return `${rule.strategy}:${signal.routing.escalationLevel}`;

      case AggregationStrategy.BY_SYSTEM:
        return `${rule.strategy}:${sourceSystem}`;

      case AggregationStrategy.BY_CONTEXT:
        return `${rule.strategy}:${JSON.stringify(signal.context.metadata).slice(0, 50)}`;

      case AggregationStrategy.BY_TIME:
        const timeWindow = Math.floor(Date.now() / rule.timeWindow);
        return `${rule.strategy}:${timeWindow}`;

      default:
        return `${rule.strategy}:default_${rule.id}`;
    }
  }

  /**
   * Check if enhanced signal is duplicate in buffer
   */
  private isDuplicateEnhancedSignal(signal: EnhancedSignalData, bufferSignals: EnhancedSignalData[]): boolean {
    return bufferSignals.some(existingSignal =>
      existingSignal.type === signal.type &&
      existingSignal.source === signal.source &&
      existingSignal.priority === signal.priority &&
      existingSignal.context.prpId === signal.context.prpId &&
      JSON.stringify(existingSignal.originalData) === JSON.stringify(signal.originalData)
    );
  }

  /**
   * Create enhanced batch ID
   */
  private createEnhancedBatchId(strategy: AggregationStrategy, signal: EnhancedSignalData): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    const type = signal.type;
    const prpId = signal.context.prpId || 'unknown';

    return `enhanced_batch_${strategy}_${prpId}_${type}_${timestamp}_${random}`;
  }

  /**
   * Create enhanced batch from buffer
   */
  private createEnhancedBatchFromBuffer(bufferKey: string): SignalAggregationResult | null {
    const buffer = this.enhancedAggregationBuffers.get(bufferKey);
    if (!buffer || buffer.signals.length === 0) {
      return null;
    }

    const sampleSignal = buffer.signals[0];
    if (!sampleSignal) {
      return null;
    }

    const batchId = this.createEnhancedBatchId(buffer.rule.strategy, sampleSignal);

    const result: SignalAggregationResult = {
      batchId,
      signals: [...buffer.signals],
      aggregationStrategy: buffer.rule.strategy,
      metadata: this.createEnhancedBatchMetadata(buffer.signals, buffer.rule.strategy),
      delivery: {
        status: 'pending',
        attempts: 0,
        maxAttempts: this.config.maxRetries
      }
    };

    // Clear buffer
    this.enhancedAggregationBuffers.delete(bufferKey);

    // Store in enhanced batches map
    this.enhancedSignalBatches.set(batchId, result);

    logger.info('SignalAggregation', 'Enhanced batch created from buffer', {
      batchId,
      signalCount: buffer.signals.length,
      strategy: buffer.rule.strategy,
      sources: Array.from(buffer.sources),
      bufferKey
    });

    return result;
  }

  /**
   * Create enhanced batch metadata
   */
  private createEnhancedBatchMetadata(signals: EnhancedSignalData[], strategy: string): SignalAggregationResult['metadata'] {
    const prpIds = [...new Set(signals.map(s => s.context.prpId).filter(Boolean))];
    const agentTypes = [...new Set(signals.map(s => s.routing.assignedAgent).filter(Boolean))];
    const signalTypes = [...new Set(signals.map(s => s.type))];
    const priorities = signals.map(s => s.priority);
    const timestamps = signals.map(s => s.timestamp);
    const sources = [...new Set(signals.map(s => s.source))];

    const oldestSignal = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const newestSignal = new Date(Math.max(...timestamps.map(t => t.getTime())));

    // Calculate enrichment metrics
    const enrichedSignals = signals.filter(s =>
      Object.keys(s.context.systemState).length > 0 ||
      s.context.historicalContext.length > 0
    ).length;

    const totalContextEntries = signals.reduce((sum, s) =>
      sum + s.context.historicalContext.length, 0
    );

    const averageHistoryEntries = signals.length > 0 ?
      totalContextEntries / signals.length : 0;

    // Create context summary
    const contextSummary = {
      systemStateEntries: signals.filter(s => Object.keys(s.context.systemState).length > 0).length,
      historicalContextEntries: totalContextEntries,
      relatedSignalsFound: signals.reduce((sum, s) => sum + s.context.relatedSignals.length, 0),
      enrichmentLevels: [...new Set(signals.map(s => s.context.metadata.enrichmentLevel).filter(Boolean))]
    };

    return {
      totalSignals: signals.length,
      prpIds: prpIds as string[],
      agentTypes: agentTypes as string[],
      signalTypes,
      priorities,
      timeWindow: {
        start: oldestSignal,
        end: newestSignal
      },
      requiresAction: signals.some(s => s.priority >= 7),
      escalationLevel: Math.max(...priorities) >= 9 ? 3 : Math.max(...priorities) >= 7 ? 2 : 1,
      sources,
      contextSummary,
      enrichmentMetrics: {
        enrichedSignals,
        totalContextEntries,
        averageHistoryEntries
      }
    };
  }

  /**
   * Deliver enhanced signal batch
   */
  private async deliverEnhancedBatch(batch: SignalAggregationResult): Promise<void> {
    if (batch.delivery.status !== 'pending') {
      logger.debug('SignalAggregation', 'Enhanced batch already processed', { batchId: batch.batchId });
      return;
    }

    batch.delivery.status = 'processing';
    batch.delivery.lastAttempt = new Date();
    batch.delivery.attempts++;

    logger.info('SignalAggregation', 'Delivering enhanced signal batch', {
      batchId: batch.batchId,
      signalCount: batch.signals.length,
      strategy: batch.aggregationStrategy,
      sources: batch.metadata.sources,
      enrichmentMetrics: batch.metadata.enrichmentMetrics,
      attempt: batch.delivery.attempts
    });

    try {
      const result = await this.sendEnhancedBatchToNudge(batch);

      batch.delivery.status = 'sent';
      batch.delivery.sentAt = new Date();
      batch.delivery.response = result;

      logger.info('SignalAggregation', 'Enhanced batch delivered successfully', {
        batchId: batch.batchId,
        deliveryTime: Date.now() - batch.delivery.lastAttempt.getTime()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      batch.delivery.error = errorMessage;

      if (batch.delivery.attempts >= batch.delivery.maxAttempts) {
        batch.delivery.status = 'failed';
        logger.error('SignalAggregation', 'Enhanced batch delivery failed permanently', error instanceof Error ? error : new Error(errorMessage), {
          batchId: batch.batchId,
          attempts: batch.delivery.attempts
        });
      } else {
        batch.delivery.status = 'pending';
        logger.warn('SignalAggregation', 'Enhanced batch delivery failed, will retry', {
          batchId: batch.batchId,
          attempts: batch.delivery.attempts,
          maxAttempts: batch.delivery.maxAttempts,
          error: errorMessage
        });

        // Schedule retry
        setTimeout(() => {
          this.deliverEnhancedBatch(batch);
        }, this.config.retryDelay);
      }
    }
  }

  /**
   * Send enhanced batch to nudge system
   */
  private async sendEnhancedBatchToNudge(batch: SignalAggregationResult): Promise<unknown> {
    const message = this.formatEnhancedBatchMessage(batch);
    const prpId = batch.metadata.prpIds[0] ?? 'ENHANCED-BATCH-SIGNALS';
    const urgency = this.mapEscalationToUrgency(batch.metadata.escalationLevel);

    if (batch.metadata.requiresAction) {
      return this.agentNudge.sendAdminAttention({
        prpId,
        agentType: 'enhanced-signal-aggregator',
        topic: `Enhanced Batch Signal Update (${batch.signals.length} signals)`,
        summary: `Multi-source aggregated signals from ${batch.metadata.sources.join(', ')}`,
        details: message,
        actionRequired: 'Review enriched signals and provide guidance',
        priority: urgency
      });
    } else {
      return this.agentNudge.sendCustomNudge({
        prpId,
        agentType: 'enhanced-signal-aggregator',
        message,
        urgency
      });
    }
  }

  /**
   * Format enhanced batch message for delivery
   */
  private formatEnhancedBatchMessage(batch: SignalAggregationResult): string {
    let message = '📊 Enhanced Signal Batch Report\n\n';
    message += `Strategy: ${batch.aggregationStrategy}\n`;
    message += `Signals: ${batch.metadata.totalSignals}\n`;
    message += `Sources: ${batch.metadata.sources.join(', ')}\n`;
    message += `Time Window: ${batch.metadata.timeWindow.start.toISOString()} - ${batch.metadata.timeWindow.end.toISOString()}\n`;

    if (batch.metadata.prpIds.length > 0) {
      message += `PRPs: ${batch.metadata.prpIds.join(', ')}\n`;
    }

    // Add enrichment metrics
    const metrics = batch.metadata.enrichmentMetrics;
    message += '\n--- Enrichment Metrics ---\n';
    message += `Enriched Signals: ${metrics.enrichedSignals}/${batch.metadata.totalSignals}\n`;
    message += `Total Context Entries: ${metrics.totalContextEntries}\n`;
    message += `Average History Entries: ${metrics.averageHistoryEntries.toFixed(2)}\n`;

    // Add context summary
    const context = batch.metadata.contextSummary;
    message += '\n--- Context Summary ---\n';
    message += `System State Entries: ${context.systemStateEntries}\n`;
    message += `Historical Context Entries: ${context.historicalContextEntries}\n`;
    message += `Related Signals Found: ${context.relatedSignalsFound}\n`;
    if (context.enrichmentLevels.length > 0) {
      message += `Enrichment Levels: ${context.enrichmentLevels.join(', ')}\n`;
    }

    message += '\n--- Signal Details ---\n';

    // Group signals by type for better readability
    const signalsByType = new Map<string, EnhancedSignalData[]>();
    batch.signals.forEach(signal => {
      const signalList = signalsByType.get(signal.type) ?? [];
      signalList.push(signal);
      signalsByType.set(signal.type, signalList);
    });

    for (const [signalType, signals] of Array.from(signalsByType.entries())) {
      message += `\n🔸 ${signalType} (${signals.length} signals):\n`;
      signals.forEach((signal, index) => {
        const prpId = signal.context.prpId || 'unknown';
        const agent = signal.routing.assignedAgent || 'unassigned';
        const time = signal.timestamp.toLocaleTimeString();
        const source = signal.source;
        const escalation = signal.routing.escalationLevel;
        message += `  ${index + 1}. [${time}] ${agent} - ${prpId} (${source}) [Escalation: ${escalation}]\n`;
      });
    }

    if (batch.metadata.requiresAction) {
      message += '\n🎯 Action Required: Please review these enriched signals and provide necessary guidance or decisions.\n';
    }

    return message;
  }

  /**
   * Map escalation level to nudge urgency
   */
  private mapEscalationToUrgency(escalationLevel: number): 'high' | 'medium' | 'low' {
    if (escalationLevel >= 3) {
      return 'high';
    }
    if (escalationLevel >= 2) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get default multi-source aggregation rules
   */
  private getDefaultMultiSourceRules(): MultiSourceAggregationRule[] {
    return [
      // Critical signals - immediate delivery, no aggregation
      {
        id: 'critical-immediate-enhanced',
        name: 'Critical Immediate Enhanced Delivery',
        strategy: AggregationStrategy.BY_ESCALATION,
        sources: ['scanner', 'inspector', 'orchestrator', '*'],
        timeWindow: 0, // No waiting
        maxSignals: 1,
        maxWaitTime: 0,
        priority: 100,
        contextEnrichment: {
          enabled: true,
          enrichRelatedSignals: true,
          includeSystemState: true,
          includeHistoricalContext: true,
          aggregationLevel: 'comprehensive'
        },
        conditions: {
          minPriority: 8,
          escalationLevel: 3
        },
        enabled: true
      },

      // High priority PRP aggregation with full enrichment
      {
        id: 'prp-enhanced-high-priority',
        name: 'High Priority PRP Enhanced Batch',
        strategy: AggregationStrategy.BY_PRP,
        sources: ['scanner', 'inspector', 'orchestrator'],
        timeWindow: 30000, // 30 seconds
        maxSignals: 5,
        maxWaitTime: 60000, // 1 minute max
        priority: 90,
        contextEnrichment: {
          enabled: true,
          enrichRelatedSignals: true,
          includeSystemState: true,
          includeHistoricalContext: true,
          aggregationLevel: 'detailed'
        },
        conditions: {
          minPriority: 7
        },
        enabled: true
      },

      // Multi-source system aggregation
      {
        id: 'multi-source-system-enhanced',
        name: 'Multi-Source System Enhanced Batch',
        strategy: AggregationStrategy.BY_SYSTEM,
        sources: ['scanner', 'inspector', 'orchestrator'],
        timeWindow: 45000, // 45 seconds
        maxSignals: 8,
        maxWaitTime: 90000, // 1.5 minutes max
        priority: 85,
        contextEnrichment: {
          enabled: true,
          enrichRelatedSignals: false,
          includeSystemState: true,
          includeHistoricalContext: true,
          aggregationLevel: 'detailed'
        },
        conditions: {
          minPriority: 5
        },
        enabled: true
      },

      // Agent-based aggregation with basic enrichment
      {
        id: 'agent-enhanced-medium-priority',
        name: 'Agent Enhanced Medium Priority Batch',
        strategy: AggregationStrategy.BY_AGENT,
        sources: ['orchestrator', 'scanner'],
        timeWindow: 60000, // 1 minute
        maxSignals: 10,
        maxWaitTime: 120000, // 2 minutes max
        priority: 70,
        contextEnrichment: {
          enabled: true,
          enrichRelatedSignals: false,
          includeSystemState: true,
          includeHistoricalContext: false,
          aggregationLevel: 'basic'
        },
        conditions: {
          minPriority: 5
        },
        enabled: true
      },

      // Low priority aggregation with minimal enrichment
      {
        id: 'low-priority-enhanced-batch',
        name: 'Low Priority Enhanced Batch',
        strategy: AggregationStrategy.BY_TYPE,
        sources: ['*'],
        timeWindow: 120000, // 2 minutes
        maxSignals: 15,
        maxWaitTime: 300000, // 5 minutes max
        priority: 50,
        contextEnrichment: {
          enabled: true,
          enrichRelatedSignals: false,
          includeSystemState: false,
          includeHistoricalContext: false,
          aggregationLevel: 'basic'
        },
        conditions: {
          minPriority: 3
        },
        enabled: true
      }
    ];
  }

  /**
   * Batch route multiple enhanced signals
   */
  async routeEnhancedBatch(signals: EnhancedSignalData[], sourceSystem: string): Promise<SignalAggregationResult[]> {
    const results: SignalAggregationResult[] = [];
    const processingPromises: Promise<any>[] = [];

    for (const signal of signals) {
      const promise = this.addEnhancedSignal(signal, sourceSystem);
      processingPromises.push(promise);
    }

    await Promise.all(processingPromises);

    return results;
  }

  /**
   * Get enhanced aggregation statistics
   */
  getEnhancedAggregationStats(): {
    buffers: {
      count: number;
      totalSignals: number;
      byStrategy: Record<string, number>;
      sources: string[];
    };
    batches: {
      pending: number;
      processing: number;
      sent: number;
      failed: number;
      expired: number;
      total: number;
    };
    enrichment: {
      enrichedSignals: number;
      totalContextEntries: number;
      averageEnrichmentLevel: string;
    };
    } {
    const buffers = Array.from(this.enhancedAggregationBuffers.values());
    const batches = Array.from(this.enhancedSignalBatches.values());

    const buffersByStrategy: Record<string, number> = {};
    const allSources = new Set<string>();
    let totalEnrichedSignals = 0;
    let totalContextEntries = 0;
    const enrichmentLevels: string[] = [];

    buffers.forEach(buffer => {
      const strategy = buffer.rule.strategy;
      buffersByStrategy[strategy] = (buffersByStrategy[strategy] || 0) + buffer.signals.length;

      buffer.sources.forEach(source => allSources.add(source));

      buffer.signals.forEach(signal => {
        if (signal.context.systemState && Object.keys(signal.context.systemState).length > 0) {
          totalEnrichedSignals++;
        }
        totalContextEntries += signal.context.historicalContext.length;

        const level = signal.context.metadata.enrichmentLevel;
        if (level) {
          enrichmentLevels.push(level);
        }
      });
    });

    const batchStatusCounts = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      expired: 0,
      total: batches.length
    };

    batches.forEach(batch => {
      batchStatusCounts[batch.delivery.status]++;
    });

    // Calculate average enrichment level
    const averageEnrichmentLevel = enrichmentLevels.length > 0
      ? enrichmentLevels[Math.floor(enrichmentLevels.length / 2)]
      : 'none';

    return {
      buffers: {
        count: this.enhancedAggregationBuffers.size,
        totalSignals: buffers.reduce((sum, buffer) => sum + buffer.signals.length, 0),
        byStrategy: buffersByStrategy,
        sources: Array.from(allSources)
      },
      batches: batchStatusCounts,
      enrichment: {
        enrichedSignals: totalEnrichedSignals,
        totalContextEntries,
        averageEnrichmentLevel
      }
    };
  }

  // Enhanced aggregation data structures
  private enhancedSignalBatches: Map<string, SignalAggregationResult> = new Map();
  private enhancedAggregationBuffers: Map<string, {
    signals: EnhancedSignalData[];
    rule: MultiSourceAggregationRule;
    sources: Set<string>;
    createdAt: Date;
  }> = new Map();

  /**
   * Shutdown aggregation system
   */
  shutdown(): void {
    logger.info('SignalAggregation', 'Shutting down signal aggregation system');

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }

    if (this.deliveryTimer) {
      clearInterval(this.deliveryTimer);
      this.deliveryTimer = undefined;
    }

    // Process remaining buffers
    this.forceProcessAllBuffers().then(() => {
      logger.info('SignalAggregation', 'Final buffer processing completed');
    });

    logger.info('SignalAggregation', 'Signal aggregation system shutdown completed');
  }
}

/**
 * Create signal aggregation system instance
 */
export const createSignalAggregationSystem = (
  config?: Partial<BulkDeliveryConfig>
): SignalAggregationSystem => {
  return new SignalAggregationSystem(config);
};