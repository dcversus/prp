/**
 * TokenMetricsStream - Real-time token data streaming system
 *
 * Provides subscription-based streaming of token usage data for agents
 * with backpressure handling and efficient data management.
 */

import { EventEmitter } from 'events';
import { TokenDataPoint } from '../types/token-metrics';

export interface TokenStreamSubscriber {
  (data: TokenDataPoint): void;
}

export interface TokenStreamOptions {
  bufferSize?: number;
  backpressureThreshold?: number;
  maxSubscribers?: number;
}

/**
 * TokenMetricsStream - Manages real-time token data streaming
 */
export class TokenMetricsStream extends EventEmitter {
  private subscribers: Map<string, Set<TokenStreamSubscriber>> = new Map();
  private buffer: TokenDataPoint[] = [];
  private backpressureThreshold: number;
  private maxBufferSize: number;
  private maxSubscribers: number;

  constructor(options: TokenStreamOptions = {}) {
    super();

    this.backpressureThreshold = options.backpressureThreshold || 5000;
    this.maxBufferSize = options.bufferSize || 1000;
    this.maxSubscribers = options.maxSubscribers || 50;
  }

  /**
   * Subscribe to token data updates for an agent
   */
  subscribe(agentId: string, callback: TokenStreamSubscriber): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Check subscriber limit
    const agentSubscribers = this.subscribers.get(agentId);
    if (agentSubscribers && agentSubscribers.size >= this.maxSubscribers) {
      throw new Error(`Maximum subscribers (${this.maxSubscribers}) reached for agent ${agentId}`);
    }

    // Add subscriber
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }

    const subscribers = this.subscribers.get(agentId)!;
    subscribers.add(callback);

    // Emit subscription event
    this.emit('subscriber_added', { agentId, subscriberCount: subscribers.size });
  }

  /**
   * Unsubscribe from token data updates
   */
  unsubscribe(agentId: string, callback: TokenStreamSubscriber): void {
    const subscribers = this.subscribers.get(agentId);
    if (!subscribers) {
      return; // Nothing to unsubscribe
    }

    const removed = subscribers.delete(callback);

    // Clean up empty subscriber sets
    if (subscribers.size === 0) {
      this.subscribers.delete(agentId);
    }

    if (removed) {
      this.emit('subscriber_removed', {
        agentId,
        subscriberCount: subscribers.size,
        totalSubscribers: this.getTotalSubscriberCount()
      });
    }
  }

  /**
   * Publish new token data to subscribers
   */
  publish(data: TokenDataPoint): void {
    // Validate data
    this.validateDataPoint(data);

    // Add to buffer
    this.buffer.push(data);

    // Maintain buffer size
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift(); // Remove oldest data point
    }

    // Check for backpressure
    if (this.buffer.length > this.backpressureThreshold) {
      this.emit('backpressure', {
        bufferSize: this.buffer.length,
        threshold: this.backpressureThreshold
      });

      // Drop oldest data points if under severe pressure
      if (this.buffer.length > this.backpressureThreshold * 1.5) {
        const dropCount = Math.floor(this.buffer.length * 0.2);
        this.buffer.splice(0, dropCount);

        this.emit('data_dropped', {
          droppedCount: dropCount,
          bufferSize: this.buffer.length
        });
      }
    }

    // Notify subscribers
    const subscribers = this.subscribers.get(data.agentId);
    if (subscribers && subscribers.size > 0) {
      // Use setImmediate for async delivery to avoid blocking
      setImmediate(() => {
        subscribers.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            this.emit('subscriber_error', {
              agentId: data.agentId,
              error: error instanceof Error ? error : new Error(String(error))
            });
          }
        });
      });
    }

    // Emit publish event
    this.emit('data_published', {
      agentId: data.agentId,
      timestamp: data.timestamp,
      bufferSize: this.buffer.length
    });
  }

  /**
   * Get latest data points for an agent
   */
  getLatestData(agentId: string, limit: number = 100): TokenDataPoint[] {
    return this.buffer
      .filter(data => data.agentId === agentId)
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get all latest data points across all agents
   */
  getAllLatestData(limit: number = 100): TokenDataPoint[] {
    return this.buffer
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    totalSubscribers: number;
    subscribersByAgent: Record<string, number>;
    bufferSize: number;
    bufferUtilization: number;
  } {
    const subscribersByAgent: Record<string, number> = {};

    this.subscribers.forEach((subscribers, agentId) => {
      subscribersByAgent[agentId] = subscribers.size;
    });

    return {
      totalSubscribers: this.getTotalSubscriberCount(),
      subscribersByAgent,
      bufferSize: this.buffer.length,
      bufferUtilization: (this.buffer.length / this.maxBufferSize) * 100
    };
  }

  /**
   * Clear buffer for an agent or all agents
   */
  clearBuffer(agentId?: string): void {
    if (agentId) {
      this.buffer = this.buffer.filter(data => data.agentId !== agentId);
    } else {
      this.buffer = [];
    }

    this.emit('buffer_cleared', { agentId });
  }

  /**
   * Check if system is under backpressure
   */
  isUnderBackpressure(): boolean {
    return this.buffer.length > this.backpressureThreshold;
  }

  /**
   * Get total subscriber count across all agents
   */
  private getTotalSubscriberCount(): number {
    let total = 0;
    this.subscribers.forEach(subscribers => {
      total += subscribers.size;
    });
    return total;
  }

  /**
   * Validate token data point
   */
  private validateDataPoint(data: TokenDataPoint): void {
    if (!data) {
      throw new Error('Data point cannot be null or undefined');
    }

    if (!data.agentId || typeof data.agentId !== 'string') {
      throw new Error('Invalid agentId: must be a non-empty string');
    }

    if (!(data.timestamp instanceof Date)) {
      throw new Error('Invalid timestamp: must be a Date object');
    }

    if (typeof data.tokensUsed !== 'number' || data.tokensUsed < 0) {
      throw new Error('Invalid tokensUsed: must be a non-negative number');
    }

    if (typeof data.limit !== 'number' || data.limit < 0) {
      throw new Error('Invalid limit: must be a non-negative number');
    }

    if (typeof data.remaining !== 'number' || data.remaining < 0) {
      throw new Error('Invalid remaining: must be a non-negative number');
    }

    if (data.cost !== undefined && (typeof data.cost !== 'number' || data.cost < 0)) {
      throw new Error('Invalid cost: must be a non-negative number or undefined');
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.subscribers.clear();
    this.buffer = [];
    this.removeAllListeners();
  }
}