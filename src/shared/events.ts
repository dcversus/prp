/**
 * ♫ Event System for @dcversus/prp
 *
 * Implements the event channels for communication between layers.
 */

import { EventEmitter } from 'events';
import { logger } from './logger.js';
import {
  ChannelEvent,
  ScannerEvent,
  InspectorEvent,
  OrchestratorEvent,
  Signal
} from './types';

export interface ChannelStats {
  totalEvents: number;
  activeSubscribers: number;
  oldestEvent?: Date;
  newestEvent?: Date;
}

export interface EventChannel<T = Record<string, unknown>> {
  name: string;
  subscribe(callback: (event: ChannelEvent<T>) => void): () => void;
  publish(event: ChannelEvent<T>): void;
  unsubscribe(callback: (event: ChannelEvent<T>) => void): void;
  clear(): void;
  getRecent(count?: number): ChannelEvent<T>[];
  getStats(): ChannelStats;
}

export class EventChannelImpl<T = Record<string, unknown>> implements EventChannel<T> {
  private events: ChannelEvent<T>[] = [];
  private subscribers: Set<(event: ChannelEvent<T>) => void> = new Set();
  private maxEvents: number = 1000;

  constructor(
    public readonly name: string,
    maxEvents: number = 1000
  ) {
    this.maxEvents = maxEvents;
  }

  subscribe(callback: (event: ChannelEvent<T>) => void): () => void {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  publish(event: ChannelEvent<T>): void {
    // Ensure metadata exists
    const eventWithMetadata = {
      ...event,
      metadata: event.metadata || {}
    };

    // Add to history
    this.events.push(eventWithMetadata);

    // Trim history if needed
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(eventWithMetadata);
      } catch (error) {
        logger.error('shared', 'EventChannel', `Error in event subscriber for channel ${this.name}`, error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  unsubscribe(callback: (event: ChannelEvent<T>) => void): void {
    this.subscribers.delete(callback);
  }

  clear(): void {
    this.events = [];
    this.subscribers.clear();
  }

  getRecent(count: number = 100): ChannelEvent<T>[] {
    return this.events.slice(-count);
  }

  getStats(): ChannelStats {
    const totalEvents = this.events.length;
    const activeSubscribers = this.subscribers.size;

    return {
      totalEvents,
      activeSubscribers,
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp
    };
  }
}

/**
 * ♫ Event Bus Interface
 */
export interface IEventBus {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  createChannel<T>(name: string, maxEvents?: number): EventChannel<T>;
  getChannel<T>(name: string): EventChannel<T> | undefined;
  publishToChannel<T>(channelName: string, event: ChannelEvent<T>): void;
  subscribeToChannel<T>(channelName: string, callback: (event: ChannelEvent<T>) => void): () => void;
}

/**
 * ♫ Event Bus - Central coordinator for all event channels
 */
export class EventBus implements IEventBus {
  private channels: Map<string, EventChannel<Record<string, unknown>>> = new Map();
  private globalEmitter = new EventEmitter();

  constructor() {
    // Initialize standard channels
    this.createChannel('scanner');
    this.createChannel('inspector');
    this.createChannel('orchestrator');
    this.createChannel('signals');
    this.createChannel('agents');
    this.createChannel('storage');
    this.createChannel('tui');
  }

  createChannel<T>(name: string, maxEvents: number = 1000): EventChannel<T> {
    const channel = new EventChannelImpl<T>(name, maxEvents);
    this.channels.set(name, channel as EventChannel<Record<string, unknown>>);
    return channel;
  }

  getChannel<T>(name: string): EventChannel<T> | undefined {
    return this.channels.get(name) as EventChannel<T>;
  }

  publishToChannel<T>(channelName: string, event: ChannelEvent<T>): void {
    const channel = this.getChannel<T>(channelName);
    if (channel) {
      channel.publish(event);
    } else {
      logger.warn('shared', 'EventBus', `Channel ${channelName} not found`);
    }

    // Also emit globally for cross-channel listeners
    this.globalEmitter.emit(`${channelName}:${event.type}`, event);
    this.globalEmitter.emit('any', { channel: channelName, event });
  }

  subscribeToChannel<T>(
    channelName: string,
    callback: (event: ChannelEvent<T>) => void
  ): () => void {
    const channel = this.getChannel<T>(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }
    return channel.subscribe(callback);
  }

  // Convenience methods for standard channels
  publishScannerEvent(event: Omit<ScannerEvent, 'id' | 'timestamp'>): void {
    this.publishToChannel('scanner', {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    } as ScannerEvent);
  }

  publishInspectorEvent(event: Omit<InspectorEvent, 'id' | 'timestamp'>): void {
    this.publishToChannel('inspector', {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    } as InspectorEvent);
  }

  publishOrchestratorEvent(event: Omit<OrchestratorEvent, 'id' | 'timestamp'>): void {
    this.publishToChannel('orchestrator', {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    } as OrchestratorEvent);
  }

  publishSignal(signal: Signal): void {
    this.publishToChannel('signals', {
      id: this.generateEventId(),
      type: 'signal',
      timestamp: new Date(),
      source: signal.source,
      data: signal,
      metadata: signal.metadata
    });
  }

  // Standard EventEmitter interface methods
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.globalEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.globalEmitter.off(event, listener);
  }

  emit(event: string, ...args: unknown[]): void {
    this.globalEmitter.emit(event, ...args);
  }

  // Cross-channel event listening
  onAny(callback: (data: { channel: string; event: ChannelEvent }) => void): () => void {
    this.globalEmitter.on('any', callback);
    return () => this.globalEmitter.off('any', callback);
  }

  onChannelEvent(
    channelName: string,
    eventType: string,
    callback: (event: ChannelEvent) => void
  ): () => void {
    const eventName = `${channelName}:${eventType}`;
    this.globalEmitter.on(eventName, callback);
    return () => this.globalEmitter.off(eventName, callback);
  }

  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getChannelStats(): Record<string, ChannelStats> {
    const stats: Record<string, ChannelStats> = {};

    const channelEntries = Array.from(this.channels.entries());
    for (const [name, channel] of channelEntries) {
      // Use type assertion to access getStats method since it's defined in the interface
      stats[name] = ('getStats' in channel && typeof channel.getStats === 'function')
        ? channel.getStats()
        : { totalEvents: 0, activeSubscribers: 0 };
    }

    return stats;
  }

  clearAllChannels(): void {
    const channelValues = Array.from(this.channels.values());
    for (const channel of channelValues) {
      channel.clear();
    }
    this.globalEmitter.removeAllListeners();
  }

  shutdown(): void {
    this.clearAllChannels();
    this.channels.clear();
  }
}

/**
 * Global event bus instance
 */
export const eventBus = new EventBus();

/**
 * Event type guards
 */
export function isScannerEvent(event: ChannelEvent): event is ScannerEvent {
  return event.type.startsWith('scanner_');
}

export function isInspectorEvent(event: ChannelEvent): event is InspectorEvent {
  return event.type.startsWith('inspector_');
}

export function isOrchestratorEvent(event: ChannelEvent): event is OrchestratorEvent {
  return event.type.startsWith('orchestrator_');
}

export function isSignalEvent(event: ChannelEvent): boolean {
  return event.type === 'signal';
}

/**
 * Event filtering utilities
 */
export function createEventFilter<T extends ChannelEvent>(
  predicate: (event: T) => boolean
) {
  return (event: T): boolean => predicate(event);
}

export const eventFilters = {
  bySource: (source: string) => createEventFilter((event) => event.source === source),
  byType: (type: string) => createEventFilter((event) => event.type === type),
  byTimeRange: (start: Date, end: Date) =>
    createEventFilter((event) => event.timestamp >= start && event.timestamp <= end),
  byPriority: (minPriority: number) =>
    createEventFilter((event) =>
      typeof event.data === 'object' &&
      event.data !== null &&
      'priority' in event.data &&
      typeof (event.data).priority === 'number' &&
      ((event.data).priority) >= minPriority
    )
};