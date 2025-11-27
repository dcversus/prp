/**
 * ♫ EventBus Integration Layer for @dcversus/prp Signal System
 *
 * This module provides the bridge between:
 * - Scanner signal detection
 * - TUI signal subscriptions
 * - Agent log streaming
 * - Real-time signal processing
 *
 * Features:
 * - Real-time signal event routing
 * - Filtered signal subscriptions
 * - Agent log stream integration
 * - Performance monitoring
 */

import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils } from '../index';
import { unifiedSignalDetector } from '../../scanner/unified-signal-detector';
import { RealTimeEventStreamAdapter } from '../../scanner/realtime-event-stream-adapter';

import type { Signal } from '../types/common';
import type { EventBusIntegration, SignalEvent, SignalFilter } from '../types/signals';

const logger = createLayerLogger('signals');

/**
 * EventBus Integration Manager
 *
 * Connects all signal system components to a unified event bus
 * for real-time signal distribution and processing.
 */
export class EventBusIntegrationManager extends EventEmitter implements EventBusIntegration {
  private static instance: EventBusIntegrationManager | null = null;

  private isInitialized = false;
  private readonly subscribers = new Map<string, Array<{ id: string; handler: (event: SignalEvent) => void }>>();
  private eventHistory: SignalEvent[] = [];
  private readonly maxHistorySize = 1000;
  private subscriptionIdCounter = 0;

  // Scanner integration
  private signalDetectorSubscriptions: string[] = [];

  // Agent log streaming
  private readonly agentLogStreams = new Map<string, RealTimeEventStreamAdapter>();
  private readonly activeAgentSessions = new Set<string>();

  constructor() {
    super();
    this.setupSignalDetectorIntegration();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBusIntegrationManager {
    if (!EventBusIntegrationManager.instance) {
      EventBusIntegrationManager.instance = new EventBusIntegrationManager();
    }
    return EventBusIntegrationManager.instance;
  }

  /**
   * Initialize the EventBus integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('EventBusIntegrationManager', 'EventBus integration already initialized');
      return;
    }

    try {
      logger.info('EventBusIntegrationManager', 'Initializing EventBus integration...');

      // Initialize signal detector integration
      this.setupSignalDetectorIntegration();

      // Setup agent log streaming
      await this.setupAgentLogStreaming();

      // Setup bidirectional communication with signal detector
      this.setupBidirectionalCommunication();

      // Start event processing
      this.startEventProcessing();

      this.isInitialized = true;
      logger.info('EventBusIntegrationManager', '✅ EventBus integration initialized successfully');

      this.emit('integration:initialized', {
        timestamp: TimeUtils.now(),
        activeAgents: Array.from(this.activeAgentSessions),
      });

    } catch (error) {
      logger.error('EventBusIntegrationManager', 'Failed to initialize EventBus integration', error as Error);
      throw error;
    }
  }

  /**
   * Subscribe to signal events
   */
  subscribe(eventType: string, handler: (event: SignalEvent) => void): string {
    const subscriptionId = `sub-${this.subscriptionIdCounter++}`;

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType)!.push({ id: subscriptionId, handler });

    logger.debug('EventBusIntegrationManager', 'Subscription created', {
      subscriptionId,
      eventType,
      totalSubscriptions: this.subscribers.get(eventType)?.length,
    });

    return subscriptionId;
  }

  /**
   * Subscribe to all signal events
   */
  subscribeToAll(handler: (event: SignalEvent) => void): string {
    return this.subscribe('*', handler);
  }

  /**
   * Unsubscribe from signal events
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of Array.from(this.subscribers.entries())) {
      const filtered = subscriptions.filter((sub) => sub.id !== subscriptionId);
      if (filtered.length === 0) {
        this.subscribers.delete(eventType);
      } else {
        this.subscribers.set(eventType, filtered);
      }
    }

    logger.debug('EventBusIntegrationManager', 'Subscription removed', { subscriptionId });
  }

  /**
   * Publish signal event
   */
  publishToChannel(channel: string, event: SignalEvent): void {
    const signalEvent: SignalEvent = {
      id: event.id,
      type: event.type,
      signal: event.signal,
      timestamp: event.timestamp,
      source: event.source,
      priority: event.priority ?? 'medium',
      state: 'active',
      metadata: event.metadata ?? {},
    };

    // Add to history
    this.eventHistory.push(signalEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit event
    this.emit('signal:event', signalEvent);

    // Notify subscribers
    this.notifySubscribers(channel, signalEvent);
    this.notifySubscribers('*', signalEvent);

    logger.debug('EventBusIntegrationManager', 'Signal event published', {
      id: signalEvent.id,
      type: signalEvent.type,
      signal: signalEvent.signal,
      channel,
      source: signalEvent.source,
    });
  }

  /**
   * Get recent signal events
   */
  getRecentEvents(count = 10): SignalEvent[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string, count = 50): SignalEvent[] {
    return this.eventHistory
      .filter((event) => event.type === type)
      .slice(-count);
  }

  /**
   * Get events by signal
   */
  getEventsBySignal(signal: string, count = 50): SignalEvent[] {
    return this.eventHistory
      .filter((event) => event.signal === signal)
      .slice(-count);
  }

  /**
   * Get filtered events
   */
  getFilteredEvents(filter: SignalFilter, count = 50): SignalEvent[] {
    let filtered = [...this.eventHistory];

    // Apply type filter
    if (filter.types) {
      filtered = filtered.filter((event) => filter.types!.includes(event.type));
    }

    // Apply source filter
    if (filter.sources) {
      filtered = filtered.filter((event) => filter.sources!.includes(event.source));
    }

    // Apply priority filter
    if (filter.priorities) {
      filtered = filtered.filter((event) => filter.priorities!.includes(event.priority));
    }

    // Apply search filter
    if (filter.search?.trim()) {
      const searchTerm = filter.search.toLowerCase();
      filtered = filtered.filter((event) =>
        event.signal.toLowerCase().includes(searchTerm) ||
        event.type.toLowerCase().includes(searchTerm) ||
        event.source.toLowerCase().includes(searchTerm)
      );
    }

    return filtered.slice(-count);
  }

  /**
   * Start agent log streaming
   */
  async startAgentLogStreaming(agentId: string, sessionId: string): Promise<void> {
    if (this.agentLogStreams.has(agentId)) {
      logger.warn('EventBusIntegrationManager', 'Agent log streaming already active', { agentId });
      return;
    }

    try {
      logger.info('EventBusIntegrationManager', 'Starting agent log streaming', { agentId, sessionId });

      // Create event stream adapter for agent logs
      const streamAdapter = new RealTimeEventStreamAdapter({
        maxBufferSize: 500,
        flushInterval: 50, // Fast response for TUI
        enableFiltering: true,
        enableDeduplication: true,
      }, this);

      await streamAdapter.initialize();

      // Set up signal detection from agent logs
      streamAdapter.on('signals:detected', (data) => {
        for (const detectedSignal of data.signals) {
          this.publishToChannel('agent-logs', {
            id: `${agentId}-${data.eventId}`,
            type: 'agent_log_signal',
            signal: `[${detectedSignal.type.toUpperCase()}]`,
            timestamp: TimeUtils.now(),
            source: `agent:${agentId}`,
            priority: this.mapSignalPriority(detectedSignal.priority),
            metadata: {
              agentId,
              sessionId,
              originalSignal: detectedSignal.content,
              context: detectedSignal.context,
              line: detectedSignal.line,
              column: detectedSignal.column,
            },
          });
        }
      });

      // Store the stream adapter
      this.agentLogStreams.set(agentId, streamAdapter);
      this.activeAgentSessions.add(agentId);

      logger.info('EventBusIntegrationManager', '✅ Agent log streaming started', { agentId });

      this.emit('agent:streaming:started', { agentId, sessionId });

    } catch (error) {
      logger.error('EventBusIntegrationManager', 'Failed to start agent log streaming', error as Error, { agentId });
      throw error;
    }
  }

  /**
   * Stop agent log streaming
   */
  async stopAgentLogStreaming(agentId: string): Promise<void> {
    const streamAdapter = this.agentLogStreams.get(agentId);
    if (!streamAdapter) {
      logger.warn('EventBusIntegrationManager', 'Agent log streaming not active', { agentId });
      return;
    }

    try {
      logger.info('EventBusIntegrationManager', 'Stopping agent log streaming', { agentId });

      await streamAdapter.stop();
      this.agentLogStreams.delete(agentId);
      this.activeAgentSessions.delete(agentId);

      logger.info('EventBusIntegrationManager', '✅ Agent log streaming stopped', { agentId });

      this.emit('agent:streaming:stopped', { agentId });

    } catch (error) {
      logger.error('EventBusIntegrationManager', 'Failed to stop agent log streaming', error as Error, { agentId });
    }
  }

  /**
   * Process agent log entry for signal detection
   */
  async processAgentLogEntry(agentId: string, logEntry: string): Promise<void> {
    const streamAdapter = this.agentLogStreams.get(agentId);
    if (!streamAdapter) {
      logger.debug('EventBusIntegrationManager', 'No active stream for agent', { agentId });
      return;
    }

    try {
      await streamAdapter.processEvent({
        type: 'agent_log',
        source: `agent:${agentId}`,
        data: { content: logEntry, timestamp: TimeUtils.now() },
        priority: this.detectLogPriority(logEntry),
      });

    } catch (error) {
      logger.error('EventBusIntegrationManager', 'Failed to process agent log entry', error as Error, { agentId });
    }
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      initialized: this.isInitialized,
      subscribers: {
        total: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
        byEventType: Array.from(this.subscribers.entries()).reduce((obj, [type, subs]) => {
          obj[type] = subs.length;
          return obj;
        }, {} as Record<string, number>),
      },
      eventHistory: {
        total: this.eventHistory.length,
        maxSize: this.maxHistorySize,
        utilization: (this.eventHistory.length / this.maxHistorySize) * 100,
      },
      agentStreaming: {
        activeAgents: Array.from(this.activeAgentSessions),
        totalStreams: this.agentLogStreams.size,
      },
      signalDetector: {
        connected: this.signalDetectorSubscriptions.length > 0,
        subscriptions: this.signalDetectorSubscriptions.length,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('EventBusIntegrationManager', 'Cleaning up EventBus integration...');

    // Stop all agent log streaming
    for (const agentId of Array.from(this.agentLogStreams.keys())) {
      await this.stopAgentLogStreaming(agentId);
    }

    // Clear all subscriptions
    this.subscribers.clear();
    this.signalDetectorSubscriptions = [];

    // Clear history
    this.eventHistory = [];

    // Remove all listeners
    this.removeAllListeners();

    this.isInitialized = false;
    logger.info('EventBusIntegrationManager', '✅ EventBus integration cleaned up');
  }

  /**
   * Direct signal detection for file content
   */
  async detectSignalsInContent(filePath: string, content: string): Promise<SignalEvent[]> {
    const detectedSignals = await unifiedSignalDetector.detectSignals(filePath, content);
    const signalEvents: SignalEvent[] = [];

    for (const signal of detectedSignals) {
      const signalEvent: SignalEvent = {
        id: signal.id,
        type: 'file_signal_detected',
        signal: `[${signal.type.toUpperCase()}]`,
        timestamp: signal.timestamp,
        source: 'scanner:file_system',
        priority: this.mapSignalPriority(signal.priority),
        state: 'active',
        metadata: {
          filePath,
          originalSignal: signal.data?.rawSignal,
          line: signal.data?.line,
          column: signal.data?.column,
          context: signal.data?.context,
          confidence: signal.metadata?.confidence,
        },
      };

      signalEvents.push(signalEvent);
      this.publishToChannel('scanner', signalEvent);
    }

    return signalEvents;
  }

  /**
   * Register custom signal detector callback
   */
  registerSignalDetectorCallback(callback: (filePath: string, signals: Signal[]) => void): void {
    unifiedSignalDetector.onSignalsDetected(callback);
  }

  /**
   * Get signal detector metrics
   */
  getSignalDetectorMetrics() {
    return unifiedSignalDetector.getMetrics();
  }

  /**
   * Add custom signal pattern
   */
  addCustomSignalPattern(pattern: { id: string; name: string; pattern: RegExp; priority: number }): void {
    unifiedSignalDetector.addPattern({
      id: pattern.id,
      name: pattern.name,
      pattern: pattern.pattern,
      category: 'custom',
      priority: pattern.priority,
      description: `Custom pattern: ${pattern.name}`,
      enabled: true,
      custom: true,
    });
  }

  // Private methods

  private setupSignalDetectorIntegration(): void {
    // Subscribe to signal detector events
    unifiedSignalDetector.on('signalsDetected', (data: { filePath: string; signals: Signal[] }) => {
      for (const signal of data.signals) {
        this.publishToChannel('scanner', {
          id: signal.id,
          type: 'file_signal_detected',
          signal: `[${signal.type.toUpperCase()}]`,
          timestamp: signal.timestamp,
          source: 'scanner:file_system',
          priority: this.mapSignalPriority(signal.priority),
          metadata: {
            filePath: data.filePath,
            originalSignal: signal.data?.rawSignal,
            line: signal.data?.line,
            column: signal.data?.column,
            context: signal.data?.context,
            confidence: signal.metadata?.confidence,
          },
        });
      }
    });

    // Subscribe to real-time processing events
    unifiedSignalDetector.on('signalsDetected', (data) => {
      this.emit('detector:signals', data);
    });

    // Store subscription reference
    this.signalDetectorSubscriptions.push('main');
  }

  private setupBidirectionalCommunication(): void {
    // Listen for external signal detection requests
    this.on('detect:signals', async (data: { filePath: string; content: string }) => {
      try {
        const signals = await this.detectSignalsInContent(data.filePath, data.content);
        this.emit('detect:signals:response', {
          filePath: data.filePath,
          signals,
          timestamp: TimeUtils.now(),
        });
      } catch (error) {
        this.emit('detect:signals:error', {
          filePath: data.filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Listen for pattern management requests
    this.on('pattern:add', (data: { pattern: any }) => {
      this.addCustomSignalPattern(data.pattern);
      this.emit('pattern:added', { patternId: data.pattern.id });
    });

    // Listen for metric requests
    this.on('metrics:detector', () => {
      const metrics = this.getSignalDetectorMetrics();
      this.emit('metrics:detector:response', metrics);
    });
  }

  private async setupAgentLogStreaming(): Promise<void> {
    // Agent log streaming will be started on-demand
    logger.debug('EventBusIntegrationManager', 'Agent log streaming setup complete');
  }

  private startEventProcessing(): void {
    logger.debug('EventBusIntegrationManager', 'Event processing started');
  }

  private notifySubscribers(channel: string, event: SignalEvent): void {
    const channelSubscribers = this.subscribers.get(channel) ?? [];
    const allSubscribers = this.subscribers.get('*') ?? [];

    [...channelSubscribers, ...allSubscribers].forEach((subscriber) => {
      try {
        subscriber.handler(event);
      } catch (error) {
        logger.error('EventBusIntegrationManager', 'Error in subscriber handler', error as Error, {
          subscriberId: subscriber.id,
          eventType: event.type,
        });
      }
    });
  }

  private mapSignalPriority(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority >= 9) return 'critical';
    if (priority >= 7) return 'high';
    if (priority >= 5) return 'medium';
    return 'low';
  }

  private detectLogPriority(logEntry: string): 'low' | 'medium' | 'high' | 'critical' {
    const entry = logEntry.toLowerCase();

    if (entry.includes('error') || entry.includes('fatal') || entry.includes('[ff]') || entry.includes('[bb]')) {
      return 'critical';
    }
    if (entry.includes('warn') || entry.includes('exception') || entry.includes('[af]') || entry.includes('[no]')) {
      return 'high';
    }
    if (entry.includes('info') || entry.includes('[da]') || entry.includes('[dp]')) {
      return 'medium';
    }
    return 'low';
  }
}

// Export singleton instance
export const eventBusIntegration = EventBusIntegrationManager.getInstance();