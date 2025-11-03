/**
 * Orchestrator Scanner Guidelines
 *
 * Special handling for [*A] and [A*] signal patterns that trigger immediate
 * nudge execution for orchestrator coordination and admin communication.
 */

import { createAgentNudgeIntegration } from '../nudge/agent-integration';
import { Signal } from '../shared/types';
import { createLayerLogger } from '../shared';
// import type { NodeJS } from 'node'; // Not needed

// Base interface for signal patterns
interface SignalPattern {
  code: string;
  description?: string;
  id?: string; // Adding id property to match usage
  name?: string; // Adding name property to match usage
  pattern?: RegExp; // Adding pattern property to match usage
  category?: string; // Adding category property to match usage
  priority?: number; // Adding priority property to match usage
  enabled?: boolean; // Adding enabled property to match usage
  custom?: boolean; // Adding custom property to match usage
}

const logger = createLayerLogger('scanner');

/**
 * Special signal patterns for orchestrator coordination
 *
 * [*A] - Admin communication pending (needs immediate nudge)
 * [A*] - Admin message read/received (status update)
 */
export interface OrchestratorSignalPattern extends SignalPattern {
  nudgeUrgency: 'immediate' | 'high' | 'medium' | 'low';
  autoExecute: boolean;
  adminReadTracking: boolean;
}

/**
 * Orchestrator Scanner Guidelines Implementation
 */
export class OrchestratorScannerGuidelines {
  private agentNudge: ReturnType<typeof createAgentNudgeIntegration>;
  private messageReadStatus: Map<string, { timestamp: Date; readBy: string }> = new Map();
  private pendingNudges: Map<string, Signal[]> = new Map();
  private bulkDeliveryInterval: number = 30000; // 30 seconds
  private bulkDeliveryTimer?: NodeJS.Timeout;

  constructor() {
    this.agentNudge = createAgentNudgeIntegration();
    this.initializeOrchestratorPatterns();
    this.startBulkDeliveryScheduler();
  }

  /**
   * Initialize special orchestrator signal patterns
   */
  private initializeOrchestratorPatterns(): void {
    logger.info('OrchestratorScanner', 'Initializing orchestrator signal patterns');

    // Pattern for admin communication pending [*A]
    const adminPendingPattern: OrchestratorSignalPattern = {
      code: '[*A]',
      id: 'admin-pending',
      name: 'Admin Communication Pending',
      pattern: /\[\*A\]/gi,
      category: 'orchestrator',
      priority: 9,
      description: 'Admin communication pending - requires immediate nudge execution',
      enabled: true,
      custom: false,
      nudgeUrgency: 'immediate',
      autoExecute: true,
      adminReadTracking: true
    };

    // Pattern for admin message read [A*]
    const adminReadPattern: OrchestratorSignalPattern = {
      code: '[A*]',
      id: 'admin-read',
      name: 'Admin Message Read',
      pattern: /\[A\*\]/gi,
      category: 'orchestrator',
      priority: 7,
      description: 'Admin message read/received - update read status',
      enabled: true,
      custom: false,
      nudgeUrgency: 'medium',
      autoExecute: true,
      adminReadTracking: true
    };

    // Register these patterns with the signal detector
    this.registerOrchestratorPatterns([adminPendingPattern, adminReadPattern]);
  }

  /**
   * Register orchestrator patterns with signal detector
   */
  private registerOrchestratorPatterns(patterns: OrchestratorSignalPattern[]): void {
    // This would integrate with the existing SignalDetectorImpl
    patterns.forEach(pattern => {
      logger.info('OrchestratorScanner', `Registered pattern: ${pattern.name}`, {
        patternId: pattern.id,
        urgency: pattern.nudgeUrgency,
        autoExecute: pattern.autoExecute
      });
    });
  }

  /**
   * Process orchestrator signals with special handling
   */
  async processOrchestratorSignals(signals: Signal[], source?: string): Promise<{
    processed: Signal[];
    nudgesSent: number;
    readStatusUpdated: number;
    errors: string[];
  }> {
    const processed: Signal[] = [];
    let nudgesSent = 0;
    let readStatusUpdated = 0;
    const errors: string[] = [];

    logger.info('OrchestratorScanner', `Processing ${signals.length} signals for orchestrator patterns`);

    for (const signal of signals) {
      try {
        if (this.isOrchestratorSignal(signal)) {
          const result = await this.handleOrchestratorSignal(signal);

          if (result.nudgeSent) {
            nudgesSent++;
          }

          if (result.readStatusUpdated) {
            readStatusUpdated++;
          }

          if (result.error) {
            errors.push(result.error);
          }
        }

        processed.push(signal);
      } catch (error) {
        const errorMsg = `Failed to process signal ${signal.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.error('OrchestratorScanner', errorMsg);
        processed.push(signal);
      }
    }

    logger.info('OrchestratorScanner', `Processed orchestrator signals`, {
      totalProcessed: processed.length,
      nudgesSent,
      readStatusUpdated,
      errors: errors.length
    });

    return {
      processed,
      nudgesSent,
      readStatusUpdated,
      errors
    };
  }

  /**
   * Check if signal is an orchestrator pattern
   */
  private isOrchestratorSignal(signal: Signal): boolean {
    const signalType = signal.type.toLowerCase();
    return signalType === '*a' || signalType === 'a*';
  }

  /**
   * Handle orchestrator signal with appropriate action
   */
  private async handleOrchestratorSignal(signal: Signal): Promise<{
    nudgeSent: boolean;
    readStatusUpdated: boolean;
    error?: string;
  }> {
    const signalType = signal.type.toLowerCase();
    const context = signal.data as Record<string, unknown>;

    if (signalType === '*a') {
      // Admin communication pending - immediate nudge
      return await this.handleAdminPendingSignal(signal, context);
    } else if (signalType === 'a*') {
      // Admin message read - update status
      return await this.handleAdminReadSignal(signal, context);
    }

    return {
      nudgeSent: false,
      readStatusUpdated: false,
      error: `Unknown orchestrator signal type: ${signalType}`
    };
  }

  /**
   * Handle [*A] Admin Communication Pending signal
   */
  private async handleAdminPendingSignal(signal: Signal, context: Record<string, unknown>): Promise<{
    nudgeSent: boolean;
    readStatusUpdated: boolean;
    error?: string;
  }> {
    try {
      logger.info('OrchestratorScanner', 'Processing admin pending signal', {
        signalId: signal.id,
        context
      });

      // Extract PRP and agent information from context
      const prpId = typeof context.prpId === 'string' ? context.prpId : 'unknown';
      const agentType = typeof context.agentType === 'string' ? context.agentType : 'unknown-agent';
      const message = typeof context.message === 'string' ? context.message : 'Admin attention required - orchestrator coordination needed';

      // Send immediate nudge to admin
      const nudgeResponse = await this.agentNudge.sendAdminAttention({
        prpId,
        agentType,
        topic: 'Orchestrator Coordination',
        summary: 'Immediate admin attention required',
        details: message,
        actionRequired: 'Please review and respond to coordinator request',
        priority: 'high'
      });

      // Track nudge delivery
      this.trackNudgeDelivery(signal.id, nudgeResponse as unknown as Record<string, unknown>);

      logger.info('OrchestratorScanner', 'Admin pending nudge sent successfully', {
        signalId: signal.id,
        nudgeResponse
      });

      return {
        nudgeSent: true,
        readStatusUpdated: false
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorMsg = `Failed to send admin pending nudge: ${errorMessage}`;
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      logger.error('OrchestratorScanner', errorMsg, errorObj);

      return {
        nudgeSent: false,
        readStatusUpdated: false,
        error: errorMsg
      };
    }
  }

  /**
   * Handle [A*] Admin Message Read signal
   */
  private async handleAdminReadSignal(signal: Signal, context: Record<string, unknown>): Promise<{
    nudgeSent: boolean;
    readStatusUpdated: boolean;
    error?: string;
  }> {
    try {
      logger.info('OrchestratorScanner', 'Processing admin read signal', {
        signalId: signal.id,
        context
      });

      // Update read status tracking
      const adminId = typeof context.adminId === 'string' ? context.adminId : 'admin';
      const messageId = typeof context.messageId === 'string' ? context.messageId : signal.id;
      const readTimestamp = new Date();

      this.messageReadStatus.set(messageId, {
        timestamp: readTimestamp,
        readBy: adminId
      });

      // Update signal metadata with read status
      signal.metadata = {
        ...signal.metadata,
        readStatus: 'read',
        readBy: adminId,
        readAt: readTimestamp.toISOString()
      };

      logger.info('OrchestratorScanner', 'Admin read status updated', {
        signalId: signal.id,
        messageId,
        readBy: adminId,
        readAt: readTimestamp
      });

      return {
        nudgeSent: false,
        readStatusUpdated: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorMsg = `Failed to update admin read status: ${errorMessage}`;
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      logger.error('OrchestratorScanner', errorMsg, errorObj);

      return {
        nudgeSent: false,
        readStatusUpdated: false,
        error: errorMsg
      };
    }
  }

  /**
   * Track nudge delivery for follow-up
   */
  private trackNudgeDelivery(signalId: string, nudgeResponse: Record<string, unknown>): void {
    // Store nudge delivery information for follow-up tracking
    this.pendingNudges.set(signalId, [{
      id: signalId,
      type: 'nudge-delivery',
      priority: 7,
      source: 'orchestrator-scanner',
      timestamp: new Date(),
      data: {
        nudgeResponse,
        deliveredAt: new Date().toISOString(),
        followUpRequired: true
      },
      metadata: {
        agent: 'orchestrator-scanner',
        signalId
      }
    }]);
  }

  /**
   * Start bulk delivery scheduler for aggregated signals
   */
  private startBulkDeliveryScheduler(): void {
    if (this.bulkDeliveryTimer) {
      clearInterval(this.bulkDeliveryTimer);
    }

    this.bulkDeliveryTimer = setInterval(() => {
      this.processBulkDelivery();
    }, this.bulkDeliveryInterval);

    logger.info('OrchestratorScanner', 'Bulk delivery scheduler started', {
      interval: this.bulkDeliveryInterval
    });
  }

  /**
   * Process bulk delivery of aggregated signals
   */
  private async processBulkDelivery(): Promise<void> {
    if (this.pendingNudges.size === 0) {
      return;
    }

    logger.info('OrchestratorScanner', `Processing bulk delivery for ${this.pendingNudges.size} pending nudges`);

    const allPendingSignals: Signal[] = [];

    // Collect all pending signals
    this.pendingNudges.forEach((signals) => {
      allPendingSignals.push(...signals);
    });

    // Group signals by PRP for bulk processing
    const signalsByPrp = new Map<string, Signal[]>();

    allPendingSignals.forEach(signal => {
      const prpId = typeof signal.data?.prpId === 'string' ? signal.data.prpId : 'unknown';
      if (!signalsByPrp.has(prpId)) {
        signalsByPrp.set(prpId, []);
      }
      signalsByPrp.get(prpId)!.push(signal);
    });

    // Process each PRP group
    for (const [prpId, signals] of signalsByPrp) {
      await this.sendBulkNudgeSummary(prpId, signals);
    }

    // Clear processed signals
    this.pendingNudges.clear();
  }

  /**
   * Send bulk nudge summary for aggregated signals
   */
  private async sendBulkNudgeSummary(prpId: string, signals: Signal[]): Promise<void> {
    try {
      if (signals.length === 0) {
        return;
      }

      const signalTypes = signals.map(s => s.type).join(', ');
      const oldestSignal = signals.reduce((oldest, current) =>
        current.timestamp < oldest.timestamp ? current : oldest
      );

      const summaryMessage = `Bulk Orchestrator Update

PRP: ${prpId}
Signals: ${signalTypes}
Count: ${signals.length}
Oldest: ${oldestSignal.timestamp.toISOString()}

Aggregated orchestrator coordination items requiring attention.`;

      await this.agentNudge.sendAdminAttention({
        prpId,
        agentType: 'orchestrator-scanner',
        topic: 'Bulk Coordination Update',
        summary: `${signals.length} orchestrator signals aggregated`,
        details: summaryMessage,
        actionRequired: 'Review aggregated coordination items',
        priority: 'medium'
      });

      logger.info('OrchestratorScanner', 'Bulk nudge summary sent', {
        prpId,
        signalCount: signals.length,
        signalTypes
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      logger.error('OrchestratorScanner', 'Failed to send bulk nudge summary', errorObj, {
        prpId,
        signalCount: signals.length,
        error: errorMessage
      });
    }
  }

  /**
   * Get message read status
   */
  getMessageReadStatus(messageId: string): {
    timestamp?: Date;
    readBy?: string;
    isRead: boolean;
  } {
    const status = this.messageReadStatus.get(messageId);
    return {
      timestamp: status?.timestamp,
      readBy: status?.readBy,
      isRead: !!status
    };
  }

  /**
   * Get pending nudge statistics
   */
  getPendingNudgeStats(): {
    pendingCount: number;
    byPrp: Record<string, number>;
    oldestPending?: Date;
  } {
    const byPrp: Record<string, number> = {};
    let oldestPending: Date | undefined;

    this.pendingNudges.forEach((signals) => {
      signals.forEach(signal => {
        const prpId = signal.data?.prpId || 'unknown';
        byPrp[prpId as string] = (byPrp[prpId as string] || 0) + 1;

        if (!oldestPending || signal.timestamp < oldestPending) {
          oldestPending = signal.timestamp;
        }
      });
    });

    return {
      pendingCount: this.pendingNudges.size,
      byPrp,
      oldestPending
    };
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.bulkDeliveryTimer) {
      clearInterval(this.bulkDeliveryTimer);
      this.bulkDeliveryTimer = undefined;
    }

    // Process any remaining pending nudges before shutdown
    if (this.pendingNudges.size > 0) {
      this.processBulkDelivery().catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorObj = error instanceof Error ? error : new Error(errorMessage);
        logger.error('OrchestratorScanner', 'Failed to process final bulk delivery', errorObj, {});
      });
    }

    logger.info('OrchestratorScanner', 'Orchestrator scanner guidelines shutdown completed');
  }
}

/**
 * Create orchestrator scanner guidelines instance
 */
export const createOrchestratorScannerGuidelines = (): OrchestratorScannerGuidelines => {
  return new OrchestratorScannerGuidelines();
};