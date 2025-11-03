/**
 * Scanner Event Bus - Core event emission and subscription system
 * Part of PRP-007-F: Signal Sensor Inspector Implementation
 */

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
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: ScannerEvent[] = [];
  private maxHistorySize = 1000;
  private subscriptionIdCounter = 0;

  /**
   * Emit an event to the bus
   */
  emit(event: ScannerEvent): void {
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify subscribers
    const subscribers = this.subscriptions.get(event.type) || [];
    const allSubscribers = this.subscriptions.get('*') || [];

    [...subscribers, ...allSubscribers].forEach(sub => {
      try {
        sub.handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }
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

    this.subscriptions.get(eventType)!.push(subscription);
    return id;
  }

  /**
   * Subscribe to all events
   */
  subscribeToAll(handler: (event: ScannerEvent) => void): string {
    return this.subscribe('*', handler);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const filtered = subscriptions.filter(sub => sub.id !== subscriptionId);
      if (filtered.length === 0) {
        this.subscriptions.delete(eventType);
      } else {
        this.subscriptions.set(eventType, filtered);
      }
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 10): ScannerEvent[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string, count = 50): ScannerEvent[] {
    return this.eventHistory
      .filter(event => event.type === type)
      .slice(-count);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
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
      byEventType: {} as Record<string, number>
    };

    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      metrics.byEventType[eventType] = subscriptions.length;
      metrics.total += subscriptions.length;
    }

    return metrics;
  }
}