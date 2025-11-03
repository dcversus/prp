/**
 * ♫ Signal Processor for @dcversus/prp
 *
 * Handles signal processing, escalation, and metrics
 * following the oo → aa → OO → AA hierarchy.
 */

import { EventBus } from '../shared/events';
import { Logger } from '../shared/logger';
import { Signal } from '../shared/types';
import { SignalRegistry, SignalDefinition } from './registry';

export interface SignalProcessingResult {
  signal: Signal;
  processed: boolean;
  handler: string;
  action: string;
  escalation?: string;
  timestamp: Date;
}

export interface SignalMetrics {
  totalSignals: number;
  byCategory: Record<string, number>;
  byHandler: Record<string, number>;
  byPriority: Record<string, number>;
  escalationRate: number;
  averageResolutionTime: number;
  pendingSignals: number;
}

/**
 * Processes signals according to hierarchy and handles escalation
 */
export class SignalProcessor {
  private eventBus: EventBus;
  private logger: Logger;
  private signalRegistry: SignalRegistry;
  private pendingSignals: Map<string, Signal> = new Map();
  private signalHistory: SignalProcessingResult[] = [];
  
  constructor(eventBus: EventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.signalRegistry = SignalRegistry.getInstance();
  }

  /**
   * Process a signal according to its definition
   */
  async processSignal(signal: Signal): Promise<SignalProcessingResult> {
    const signalCode = signal.type.replace(/[[\]]/g, '');
    const definition = this.signalRegistry.getDefinition(signalCode);
    if (!definition) {
      return this.createResult(signal, false, 'unknown', 'invalid_signal_type');
    }

    this.logger.info('shared', 'signal-processor', `Processing signal ${signal.type} with handler ${definition.handler}`, {
      type: signal.type,
      priority: signal.priority,
      handler: definition.handler
    });

    try {
      // Add to pending signals
      this.pendingSignals.set(signal.id, signal);

      // Setup escalation timer if defined
      this.setupEscalation(signal, definition);

      // Route to appropriate handler
      const result = await this.routeToHandler(signal, definition);

      // Record processing result
      this.signalHistory.push(result);

      // Remove from pending if successfully processed
      if (result.processed) {
        this.pendingSignals.delete(signal.id);
        this.signalRegistry.cancelEscalation(signal.id);
      }

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('orchestrator', 'SignalProcessor', `Failed to process signal ${signal.type}: ${errorMsg}`, new Error(`Failed to process signal ${signal.type}: ${errorMsg}`), {
        signalId: signal.id,
        type: signal.type
      });

      return this.createResult(signal, false, definition.handler, 'processing_error');
    }
  }

  /**
   * Escalate signal to higher priority
   */
  async escalateSignal(signalId: string, escalateTo: string): Promise<SignalProcessingResult> {
    const signal = this.pendingSignals.get(signalId);
    if (!signal) {
      throw new Error(`Signal not found: ${signalId}`);
    }

    const escalateDefinition = this.signalRegistry.getDefinition(escalateTo);
    if (!escalateDefinition) {
      throw new Error(`Escalation target not found: ${escalateTo}`);
    }

    this.logger.info('shared', 'Escalating signal', `Escalating signal from ${signal.type} to [${escalateTo}]`, {
      from: signal.type,
      to: `[${escalateTo}]`,
      signalId
    });

    // Cancel current escalation timer
    this.signalRegistry.cancelEscalation(signalId);

    // Create escalated signal
    const escalatedSignal: Signal = {
      ...signal,
      id: `${escalateTo}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: `[${escalateTo}]`,
      priority: escalateDefinition.priority,
      metadata: {
        ...signal.metadata,
        guideline: signal.metadata.guideline || signal.type, // store escalation info in existing field
        agent: signal.metadata.agent || `escalated_from_${signal.type}`
      }
    };

    // Remove original from pending
    this.pendingSignals.delete(signalId);

    // Process escalated signal
    return await this.processSignal(escalatedSignal);
  }

  /**
   * Mark signal as resolved
   */
  resolveSignal(signalId: string, resolution: string): void {
    const signal = this.pendingSignals.get(signalId);
    if (!signal) {
      return;
    }

    this.logger.info('shared', 'Signal resolved', `Signal ${signal.type} resolved: ${resolution}`, {
      signalId,
      type: signal.type,
      resolution
    });

    this.pendingSignals.delete(signalId);
    this.signalRegistry.cancelEscalation(signalId);

    // Emit resolution event
    this.eventBus.publishToChannel('signals', {
      id: `resolved_${signalId}_${Date.now()}`,
      type: 'signal.resolved',
      timestamp: new Date(),
      source: 'processor',
      data: {
        signalId,
        signal,
        resolution,
        timestamp: new Date()
      },
      metadata: {
        originalSignalType: signal.type
      }
    });
  }

  /**
   * Get processing metrics
   */
  getMetrics(): SignalMetrics {
    const byCategory: Record<string, number> = {};
    const byHandler: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    // Count signals by various dimensions
    for (const result of this.signalHistory) {
      const definition = this.signalRegistry.getDefinition(result.signal.type.replace(/[[\]]/g, ''));
      if (definition) {
        byCategory[definition.category] = (byCategory[definition.category] || 0) + 1;
        byHandler[definition.handler] = (byHandler[definition.handler] || 0) + 1;
      }
      byPriority[result.signal.priority] = (byPriority[result.signal.priority] || 0) + 1;
    }

    // Calculate escalation rate
    const escalatedSignals = this.signalHistory.filter(r => r.escalation).length;
    const escalationRate = this.signalHistory.length > 0 ? escalatedSignals / this.signalHistory.length : 0;

    // Calculate average resolution time
    const resolvedSignals = this.signalHistory.filter(r => r.processed);
    const averageResolutionTime = resolvedSignals.length > 0 ?
      resolvedSignals.reduce((sum, r) => sum + (r.timestamp.getTime() - r.signal.timestamp.getTime()), 0) / resolvedSignals.length : 0;

    return {
      totalSignals: this.signalHistory.length,
      byCategory,
      byHandler,
      byPriority,
      escalationRate,
      averageResolutionTime,
      pendingSignals: this.pendingSignals.size
    };
  }

  /**
   * Get pending signals
   */
  getPendingSignals(): Signal[] {
    return Array.from(this.pendingSignals.values());
  }

  /**
   * Get signal history
   */
  getSignalHistory(limit?: number): SignalProcessingResult[] {
    return limit ? this.signalHistory.slice(-limit) : this.signalHistory;
  }

  // Private methods

  private async routeToHandler(signal: Signal, definition: SignalDefinition): Promise<SignalProcessingResult> {
    switch (definition.handler) {
      case 'orchestrator':
        return await this.handleOrchestratorSignal(signal, definition);
      case 'admin':
        return await this.handleAdminSignal(signal, definition);
      default:
        return this.createResult(signal, false, definition.handler, 'unknown_handler');
    }
  }

  private async handleOrchestratorSignal(signal: Signal, definition: SignalDefinition): Promise<SignalProcessingResult> {
    this.logger.debug('shared', 'signal-processor', `Handling orchestrator signal: ${signal.type}`);

    // Emit signal to orchestrator channel
    this.eventBus.publishToChannel('orchestrator', {
      id: `orchestrator_signal_${Date.now()}`,
      type: 'orchestrator.signal.received',
      timestamp: new Date(),
      source: 'signal-processor',
      data: {
        signal,
        definition,
        timestamp: new Date()
      },
      metadata: {}
    });

    // For information signals, mark as processed immediately
    if (definition.category === 'orchestrator_info') {
      return this.createResult(signal, true, 'orchestrator', 'logged_and_acknowledged');
    }

    // For action signals, orchestrator will need to process
    return this.createResult(signal, false, 'orchestrator', 'awaiting_processing');
  }

  private async handleAdminSignal(signal: Signal, definition: SignalDefinition): Promise<SignalProcessingResult> {
    this.logger.debug('shared', 'signal-processor', `Handling admin signal: ${signal.type}`);

    // Emit signal to admin channel
    this.eventBus.publishToChannel('admin', {
      id: `admin_signal_${Date.now()}`,
      type: 'admin.signal.received',
      timestamp: new Date(),
      source: 'signal-processor',
      data: {
        signal,
        definition,
        timestamp: new Date()
      },
      metadata: {}
    });

    // Admin signals always require human action, so mark as awaiting
    return this.createResult(signal, false, 'admin', 'awaiting_admin_action');
  }

  private setupEscalation(signal: Signal, definition: SignalDefinition): void {
    if (definition.escalationRules) {
      this.signalRegistry.setupEscalation(signal, (originalSignal, escalateTo) => {
        this.logger.info('orchestrator', 'SignalProcessor', `Signal escalation triggered for ${originalSignal.id} to ${escalateTo}`, {
          originalSignal: originalSignal.id,
          escalateTo
        });

        this.escalateSignal(originalSignal.id, escalateTo).catch(error => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error('orchestrator', 'SignalProcessor', `Signal escalation failed for ${originalSignal.id} to ${escalateTo}: ${errorMsg}`, new Error(`Signal escalation failed for ${originalSignal.id} to ${escalateTo}: ${errorMsg}`), {
            signalId: originalSignal.id,
            escalateTo
          });
        });
      });
    }
  }

  private createResult(signal: Signal, processed: boolean, handler: string, action: string, escalation?: string): SignalProcessingResult {
    return {
      signal,
      processed,
      handler,
      action,
      escalation,
      timestamp: new Date()
    };
  }
}

/**
 * Manages signal escalation logic and timing
 */
export class SignalEscalationManager {
  // TODO: Implement escalation management functionality
  // private _eventBus: EventBus;
  // private _logger: Logger;
  // private _signalRegistry: SignalRegistry;
  private escalationRules: Map<string, { condition: string; escalateTo: string; timeout?: number }> = new Map();

  constructor(_eventBus: EventBus, _logger: Logger) {
    // TODO: Implement escalation management functionality
    // this._eventBus = _eventBus;
    // this._logger = _logger;
    // this._signalRegistry = SignalRegistry.getInstance();
    // this.setupDefaultEscalationRules();
  }

  /**
   * Setup default escalation rules
   */
  // private setupDefaultEscalationRules(): void {
    // TODO: Implement escalation rules
    // // oo → OO after 10 minutes if not acknowledged
    // this.escalationRules.set('oo', {
    //   timeout: 600000, // 10 minutes
    //   escalateTo: 'OO',
    //   condition: 'not_acknowledged'
    // });

    // // aa → AA after 30 minutes if not acknowledged
    // this.escalationRules.set('aa', {
    //   timeout: 1800000, // 30 minutes
    //   escalateTo: 'AA',
    //   condition: 'not_acknowledged'
    // });

    // // OO → AA after 5 minutes if not resolved
    // this.escalationRules.set('OO', {
    //   timeout: 300000, // 5 minutes
    //   escalateTo: 'AA',
    //   condition: 'not_resolved'
    // });
  // }

  /**
   * Check if signal should escalate
   */
  shouldEscalate(signal: Signal, condition: string): boolean {
    const baseTag = signal.type.replace(/[[\]]/g, '');
    const rule = this.escalationRules.get(baseTag);

    if (!rule) {
      return false;
    }

    return rule.condition === condition;
  }

  /**
   * Get escalation target for signal
   */
  getEscalationTarget(signalType: string): string | null {
    const baseTag = signalType.replace(/[[\]]/g, '');
    const rule = this.escalationRules.get(baseTag);

    return rule?.escalateTo || null;
  }
}

/**
 * Tracks and analyzes signal metrics
 */
export class SignalMetricsTracker {
  private signals: Signal[] = [];
  private resolutions: Array<{ signalId: string; resolutionTime: number; handler: string }> = [];

  /**
   * Record a signal
   */
  recordSignal(signal: Signal): void {
    this.signals.push(signal);
  }

  /**
   * Record signal resolution
   */
  recordResolution(signalId: string, resolutionTime: number, handler: string): void {
    this.resolutions.push({ signalId, resolutionTime, handler });
  }

  /**
   * Get metrics report
   */
  getReport(): SignalMetrics {
    const totalSignals = this.signals.length;
    const totalResolutions = this.resolutions.length;

    const byCategory = this.signals.reduce((acc, signal) => {
      const category = signal.type || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byHandler = this.signals.reduce((acc, signal) => {
      const handler = signal.source || 'unknown';
      acc[handler] = (acc[handler] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageResolutionTime = totalResolutions > 0 ?
      this.resolutions.reduce((sum, r) => sum + r.resolutionTime, 0) / totalResolutions : 0;

    return {
      totalSignals,
      byCategory,
      byHandler,
      byPriority: {}, // Add empty object since it's required by interface
      escalationRate: totalSignals > 0 ? totalResolutions / totalSignals : 0,
      averageResolutionTime,
      pendingSignals: 0
    };
  }
}