/**
 * Scanner Event Bus - Core event emission and subscription system
 * Part of [PRP-000-agents05.md](../../../PRPs/PRP-000-agents05.md): Signal Sensor Inspector Implementation
 */
import { createLayerLogger } from '../logger.js';

const logger = createLayerLogger('shared');
export interface ScannerEvent {
  type: string;
  signal?: string;
  data?: unknown;
  timestamp: Date;
  source?: string;
  priority?: number;
}
export interface EventSubscription {
  id: string;
  eventType: string;
  handler: (event: ScannerEvent) => void;
}
export class ScannerEventBus {
  private readonly subscriptions = new Map<string, EventSubscription[]>();
  private eventHistory: ScannerEvent[] = [];
  private maxHistorySize = 1000;
  private subscriptionIdCounter = 0;
  /**
   * Emit an event to the bus
   */
  emit(event: ScannerEvent): void {
    logger.debug('EventBus', 'Emitting event', {
      type: event.type,
      signal: event.signal,
      source: event.source,
      priority: event.priority,
    });
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    // Notify subscribers
    const subscribers = this.subscriptions.get(event.type) ?? [];
    const allSubscribers = this.subscriptions.get('*') ?? [];
    [...subscribers, ...allSubscribers].forEach((sub) => {
      try {
        sub.handler(event);
      } catch (error) {
        logger.error('EventBus', `Error in event handler for ${event.type}`, error as Error);
      }
    });
    logger.debug('EventBus', 'Event emitted successfully', {
      type: event.type,
      subscriberCount: subscribers.length + allSubscribers.length,
    });
  }
  /**
   * Subscribe to specific event types
   */
  subscribe(eventType: string, handler: (event: ScannerEvent) => void): string {
    const id = `sub-${this.subscriptionIdCounter++}`;
    const subscription: EventSubscription = { id, eventType, handler };
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)?.push(subscription);
    logger.debug('EventBus', 'Subscription created', {
      id,
      eventType,
      totalSubscriptions: this.subscriptions.get(eventType)?.length,
    });
    return id;
  }
  /**
   * Subscribe to all events
   */
  subscribeToAll(handler: (event: ScannerEvent) => void): string {
    const id = this.subscribe('*', handler);
    logger.debug('EventBus', 'Wild-card subscription created', { id });
    return id;
  }
  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of Array.from(this.subscriptions.entries())) {
      const filtered = subscriptions.filter((sub) => sub.id !== subscriptionId);
      if (filtered.length === 0) {
        this.subscriptions.delete(eventType);
      } else {
        this.subscriptions.set(eventType, filtered);
      }
    }
    logger.debug('EventBus', 'Subscription removed', { subscriptionId });
  }
  /**
   * Get recent events
   */
  getRecentEvents(count = 10): ScannerEvent[] {
    const recent = this.eventHistory.slice(-count);
    logger.debug('EventBus', 'Retrieving recent events', { count, actualCount: recent.length });
    return recent;
  }
  /**
   * Get events by type
   */
  getEventsByType(type: string, count = 50): ScannerEvent[] {
    const events = this.eventHistory.filter((event) => event.type === type).slice(-count);
    logger.debug('EventBus', 'Retrieving events by type', {
      type,
      count,
      actualCount: events.length,
    });
    return events;
  }
  /**
   * Clear event history
   */
  clearHistory(): void {
    const clearedCount = this.eventHistory.length;
    this.eventHistory = [];
    logger.debug('EventBus', 'Event history cleared', { clearedCount });
  }
  /**
   * Get subscription metrics
   */
  getSubscriptionMetrics(): {
    total: number;
    byEventType: Record<string, number>;
  } {
    const metrics = {
      total: 0,
      byEventType: {} as Record<string, number>,
    };
    for (const [eventType, subscriptions] of Array.from(this.subscriptions.entries())) {
      metrics.byEventType[eventType] = subscriptions.length;
      metrics.total += subscriptions.length;
    }
    logger.debug('EventBus', 'Subscription metrics calculated', metrics);
    return metrics;
  }
  /**
   * Get bus health metrics
   */
  getHealthMetrics() {
    return {
      totalEvents: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize,
      historyUtilization: (this.eventHistory.length / this.maxHistorySize) * 100,
      subscriptionMetrics: this.getSubscriptionMetrics(),
    };
  }
  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    const oldSize = this.maxHistorySize;
    this.maxHistorySize = size;
    // Trim history if needed
    if (this.eventHistory.length > size) {
      const removed = this.eventHistory.length - size;
      this.eventHistory = this.eventHistory.slice(-size);
      logger.debug('EventBus', 'History trimmed due to size reduction', {
        oldSize,
        newSize: size,
        removed,
      });
    }
    logger.debug('EventBus', 'Max history size updated', { oldSize, newSize: size });
  }
}
