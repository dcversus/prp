/**
 * Signal Aggregation and Bulk Delivery System
 *
 * Aggregates multiple signals and delivers them in bulk to optimize
 * orchestrator coordination and reduce notification noise.
 */

import { Signal } from '../shared/types';
import { createAgentNudgeIntegration } from '../nudge/agent-integration';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('signal-aggregation');

/**
 * Signal aggregation strategy
 */
export enum AggregationStrategy {
  BY_PRP = 'by-prp',           // Group signals by PRP
  BY_AGENT = 'by-agent',       // Group signals by agent type
  BY_PRIORITY = 'by-priority', // Group signals by priority
  BY_TIME = 'by-time',         // Group signals by time window
  BY_TYPE = 'by-type'          // Group signals by signal type
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
    response?: any;
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
  private processingTimer?: NodeJS.Timeout;
  private deliveryTimer?: NodeJS.Timeout;

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
          minPriority: 6,
          maxPriority: 7
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
          minPriority: 4,
          maxPriority: 5
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
          maxPriority: 3
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

    return applicableRules[0] || null;
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

    if (conditions.maxPriority && signal.priority > conditions.maxPriority) {
      return false;
    }

    // Check agent types
    const agentType = signal.metadata?.agent;
    if (conditions.agentTypes && agentType && !conditions.agentTypes.includes(agentType)) {
      return false;
    }

    // Check PRP IDs
    const prpId = signal.data?.prpId;
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
      metadata: this.createBatchMetadata([signal], rule.strategy),
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

    const buffer = this.aggregationBuffers.get(bufferKey)!;

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
        return `prp:${signal.data?.prpId || 'unknown'}`;
      case AggregationStrategy.BY_AGENT:
        return `agent:${signal.metadata?.agent || 'unknown'}`;
      case AggregationStrategy.BY_PRIORITY:
        return `priority:${signal.priority}`;
      case AggregationStrategy.BY_TYPE:
        return `type:${signal.type}`;
      case AggregationStrategy.BY_TIME:
        const timeWindow = Math.floor(Date.now() / rule.timeWindow);
        return `time:${timeWindow}`;
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
    for (const [bufferKey, buffer] of this.aggregationBuffers.entries()) {
      if (buffer.length === 0) {
        continue;
      }

      // Find applicable rule for this buffer
      const sampleSignal = buffer[0];
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
    for (const [bufferKey, buffer] of this.aggregationBuffers.entries()) {
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

    const batchId = this.createBatchId(rule.strategy, buffer[0]);
    const batch: SignalBatch = {
      id: batchId,
      strategy: rule.strategy,
      ruleId: rule.id,
      signals: [...buffer], // Copy signals
      metadata: this.createBatchMetadata(buffer, rule.strategy),
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
    const type = signal.type || 'unknown';
    const prpId = signal.data?.prpId || 'unknown';

    return `batch_${strategy}_${prpId}_${type}_${timestamp}_${random}`;
  }

  /**
   * Create batch metadata
   */
  private createBatchMetadata(signals: Signal[], strategy: AggregationStrategy): SignalBatch['metadata'] {
    const prpIds = [...new Set(signals.map(s => s.data?.prpId).filter(Boolean))];
    const agentTypes = [...new Set(signals.map(s => s.metadata?.agent).filter(Boolean))];
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
    const maxPriority = Math.max(...priorities);
    const escalationLevel = maxPriority >= 8 ? 3 : maxPriority >= 6 ? 2 : maxPriority >= 4 ? 1 : 0;

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
        deliveryTime: Date.now() - batch.delivery.lastAttempt!.getTime()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      batch.delivery.error = errorMessage;

      if (batch.delivery.attempts >= batch.delivery.maxAttempts) {
        batch.delivery.status = 'failed';
        logger.error('SignalAggregation', 'Batch delivery failed permanently', {
          batchId: batch.id,
          attempts: batch.delivery.attempts,
          error: errorMessage
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
  private async sendBatchToNudge(batch: SignalBatch): Promise<any> {
    const message = this.formatBatchMessage(batch);
    const prpId = batch.metadata.prpIds[0] || 'BATCH-SIGNALS';
    const urgency = this.mapEscalationToUrgency(batch.metadata.escalationLevel);

    if (batch.metadata.requiresAction) {
      return await this.agentNudge.sendAdminAttention({
        prpId,
        agentType: 'signal-aggregator',
        topic: `Batch Signal Update (${batch.signals.length} signals)`,
        summary: `Aggregated signals from ${batch.metadata.prpIds.join(', ')}`,
        details: message,
        actionRequired: 'Review aggregated signals and provide guidance',
        priority: urgency
      });
    } else {
      return await this.agentNudge.sendCustomNudge({
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
    let message = `📊 Signal Batch Report\n\n`;
    message += `Strategy: ${batch.strategy}\n`;
    message += `Signals: ${batch.metadata.signalCount}\n`;
    message += `Time Window: ${batch.metadata.oldestSignal.toISOString()} - ${batch.metadata.newestSignal.toISOString()}\n`;

    if (batch.metadata.prpIds.length > 0) {
      message += `PRPs: ${batch.metadata.prpIds.join(', ')}\n`;
    }

    if (batch.metadata.agentTypes.length > 0) {
      message += `Agents: ${batch.metadata.agentTypes.join(', ')}\n`;
    }

    message += `\n--- Signal Details ---\n`;

    // Group signals by type for better readability
    const signalsByType = new Map<string, Signal[]>();
    batch.signals.forEach(signal => {
      if (!signalsByType.has(signal.type)) {
        signalsByType.set(signal.type, []);
      }
      signalsByType.get(signal.type)!.push(signal);
    });

    for (const [signalType, signals] of signalsByType.entries()) {
      message += `\n🔸 ${signalType} (${signals.length} signals):\n`;
      signals.forEach((signal, index) => {
        const prpId = signal.data?.prpId || 'unknown';
        const agent = signal.metadata?.agent || 'unknown';
        const time = signal.timestamp.toLocaleTimeString();
        message += `  ${index + 1}. [${time}] ${agent} - ${prpId}\n`;
      });
    }

    if (batch.metadata.requiresAction) {
      message += `\n🎯 Action Required: Please review these signals and provide necessary guidance or decisions.\n`;
    }

    return message;
  }

  /**
   * Map escalation level to nudge urgency
   */
  private mapEscalationToUrgency(escalationLevel: number): 'high' | 'medium' | 'low' {
    if (escalationLevel >= 3) return 'high';
    if (escalationLevel >= 2) return 'medium';
    return 'low';
  }

  /**
   * Process batch delivery for retries and expired batches
   */
  private async processBatchDelivery(): Promise<void> {
    const now = Date.now();
    const batchesToProcess: SignalBatch[] = [];

    // Find batches that need processing
    for (const batch of this.signalBatches.values()) {
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

    for (const [batchId, batch] of this.signalBatches.entries()) {
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