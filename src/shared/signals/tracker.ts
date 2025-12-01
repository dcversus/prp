/**
 * ♫ Signal Tracking and Lifecycle Management for @dcversus/prp
 *
 * Comprehensive signal lifecycle tracking with metrics, analytics,
 * and historical analysis capabilities.
 */
import { EventEmitter } from 'events';

import type { Signal } from '../types/common';
import type { Logger } from '../logger';

export interface SignalLifecycleEvent {
  signalId: string;
  signalType: string;
  event: 'detected' | 'queued' | 'processing' | 'completed' | 'failed' | 'escalated' | 'expired';
  timestamp: Date;
  source: string;
  metadata?: Record<string, unknown>;
  duration?: number;
  error?: string;
}
export interface SignalMetrics {
  totalSignals: number;
  activeSignals: number;
  completedSignals: number;
  failedSignals: number;
  averageProcessingTime: number;
  signalsByType: Record<string, number>;
  signalsByPriority: Record<number, number>;
  processingRate: number; // signals per hour
  errorRate: number; // percentage
  escalationRate: number; // percentage
}
export interface SignalAnalytics {
  hourlyVolume: Array<{ hour: number; count: number }>;
  dailyVolume: Array<{ date: string; count: number }>;
  typeDistribution: Record<string, number>;
  priorityDistribution: Record<number, number>;
  processingTimes: Array<{ type: string; min: number; max: number; avg: number }>;
  errorPatterns: Array<{ type: string; count: number; lastOccurrence: Date }>;
  escalationPaths: Array<{ from: string; to: string; count: number }>;
}
export interface SignalFilter {
  type?: string;
  priority?: number | { min?: number; max?: number };
  source?: string;
  status?: 'active' | 'completed' | 'failed';
  dateRange?: { start: Date; end: Date };
  metadata?: Record<string, unknown>;
}
/**
 * Signal lifecycle tracking and analytics
 */
export class SignalTracker extends EventEmitter {
  private readonly activeSignals = new Map<string, SignalLifecycleEvent[]>();
  private completedSignals: SignalLifecycleEvent[] = [];
  private readonly maxHistory = 10000;
  private readonly logger: Logger;
  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }
  /**
   * Track signal lifecycle event
   */
  trackEvent(event: Omit<SignalLifecycleEvent, 'timestamp'>): void {
    const lifecycleEvent: SignalLifecycleEvent = {
      ...event,
      timestamp: new Date(),
    };
    // Add to active signals tracking
    if (!this.activeSignals.has(event.signalId)) {
      this.activeSignals.set(event.signalId, []);
    }
    const signalEvents = this.activeSignals.get(event.signalId)!;
    signalEvents.push(lifecycleEvent);
    // Handle completion events
    if (event.event === 'completed' || event.event === 'failed') {
      this._completeSignal(event.signalId, lifecycleEvent);
    }
    // Emit event for listeners
    this.emit('signalEvent', lifecycleEvent);
    this.emit(`signal:${event.event}`, lifecycleEvent);
    this.logger.debug('orchestrator', 'SignalTracker', `Signal event tracked: ${event.event}`, {
      signalId: event.signalId,
      signalType: event.signalType,
      event: event.event,
    });
  }
  /**
   * Get signal metrics
   */
  getMetrics(): SignalMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    let totalSignals = 0;
    let completedSignals = 0;
    let failedSignals = 0;
    let totalProcessingTime = 0;
    const signalsByType: Record<string, number> = {};
    const signalsByPriority: Record<number, number> = {};
    let signalsInLastHour = 0;
    // Count completed signals
    for (const signal of this.completedSignals) {
      if (signal.event === 'completed') {
        completedSignals++;
        if (signal.duration) {
          totalProcessingTime += signal.duration;
        }
      } else if (signal.event === 'failed') {
        failedSignals++;
      }
      // Count by type and priority
      signalsByType[signal.signalType] = (signalsByType[signal.signalType] ?? 0) + 1;
      // Count signals in last hour for processing rate
      if (signal.timestamp >= oneHourAgo) {
        signalsInLastHour++;
      }
    }
    // Count active signals
    const activeSignals = this.activeSignals.size;
    totalSignals = completedSignals + failedSignals + activeSignals;
    const averageProcessingTime = completedSignals > 0 ? totalProcessingTime / completedSignals : 0;
    const processingRate = signalsInLastHour; // signals per hour
    const errorRate = totalSignals > 0 ? (failedSignals / totalSignals) * 100 : 0;
    return {
      totalSignals,
      activeSignals,
      completedSignals,
      failedSignals,
      averageProcessingTime,
      signalsByType,
      signalsByPriority,
      processingRate,
      errorRate,
      escalationRate: 0, // TODO: Track escalations
    };
  }
  /**
   * Get signal analytics
   */
  getAnalytics(days = 7): SignalAnalytics {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentEvents = this.completedSignals.filter((e) => e.timestamp >= cutoffDate);
    // Hourly volume
    const hourlyVolume = this._calculateHourlyVolume(recentEvents);
    // Daily volume
    const dailyVolume = this._calculateDailyVolume(recentEvents);
    // Type distribution
    const typeDistribution = this._calculateTypeDistribution(recentEvents);
    // Priority distribution
    const priorityDistribution = this._calculatePriorityDistribution(recentEvents);
    // Processing times
    const processingTimes = this._calculateProcessingTimes(recentEvents);
    // Error patterns
    const errorPatterns = this._calculateErrorPatterns(recentEvents);
    // Escalation paths
    const escalationPaths: Array<{ from: string; to: string; count: number }> = [];
    return {
      hourlyVolume,
      dailyVolume,
      typeDistribution,
      priorityDistribution,
      processingTimes,
      errorPatterns,
      escalationPaths,
    };
  }
  /**
   * Get signal history with filtering
   */
  getHistory(filter?: SignalFilter, limit = 100): SignalLifecycleEvent[] {
    let events = [...this.completedSignals];
    // Apply filters
    if (filter) {
      if (filter.type) {
        events = events.filter((e) => e.signalType === filter.type);
      }
      if (filter.priority) {
        if (typeof filter.priority === 'number') {
          // This would need priority info from the signal - simplified for now
        } else {
          // Range filtering would need more complex implementation
        }
      }
      if (filter.source) {
        events = events.filter((e) => e.source === filter.source);
      }
      if (filter.dateRange) {
        events = events.filter(
          (e) => e.timestamp >= filter.dateRange!.start && e.timestamp <= filter.dateRange!.end,
        );
      }
    }
    // Sort by timestamp (newest first) and limit
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }
  /**
   * Get active signals
   */
  getActiveSignals(): Array<{ signalId: string; events: SignalLifecycleEvent[] }> {
    const result: Array<{ signalId: string; events: SignalLifecycleEvent[] }> = [];
    for (const [signalId, events] of Array.from(this.activeSignals.entries())) {
      result.push({
        signalId,
        events: [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      });
    }
    return result;
  }
  /**
   * Get signal details by ID
   */
  getSignalDetails(signalId: string): SignalLifecycleEvent[] | null {
    const events = this.activeSignals.get(signalId);
    if (events) {
      return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    // Check in completed signals
    const completedEvents = this.completedSignals.filter((e) => e.signalId === signalId);
    if (completedEvents.length > 0) {
      return completedEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    return null;
  }
  /**
   * Clear old history
   */
  clearHistory(olderThanDays = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.completedSignals.length;
    this.completedSignals = this.completedSignals.filter((e) => e.timestamp >= cutoffDate);
    const removedCount = beforeCount - this.completedSignals.length;
    if (removedCount > 0) {
      this.logger.info(
        'orchestrator',
        'SignalTracker',
        `Cleared ${removedCount} old signal events`,
        {
          olderThanDays,
          remainingEvents: this.completedSignals.length,
        },
      );
    }
  }
  /**
   * Export signal data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      metrics: this.getMetrics(),
      analytics: this.getAnalytics(30),
      activeSignals: this.getActiveSignals(),
      recentHistory: this.getHistory(undefined, 1000),
    };
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV export would need more complex implementation
      return JSON.stringify(data, null, 2);
    }
  }
  // Private methods
  private _completeSignal(signalId: string, finalEvent: SignalLifecycleEvent): void {
    const signalEvents = this.activeSignals.get(signalId);
    if (!signalEvents) {
      return;
    }
    // Calculate processing duration
    const firstEvent = signalEvents[0];
    if (firstEvent) {
      finalEvent.duration = finalEvent.timestamp.getTime() - firstEvent.timestamp.getTime();
    }
    // Move to completed signals
    this.completedSignals.push(...signalEvents);
    this.activeSignals.delete(signalId);
    // Trim history if needed
    if (this.completedSignals.length > this.maxHistory) {
      const toRemove = this.completedSignals.length - this.maxHistory;
      this.completedSignals = this.completedSignals.slice(toRemove);
    }
  }
  private _calculateHourlyVolume(
    events: SignalLifecycleEvent[],
  ): Array<{ hour: number; count: number }> {
    const hourlyData: Record<number, number> = {};
    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = 0;
    }
    for (const event of events) {
      const hour = event.timestamp.getHours();
      hourlyData[hour]!++;
    }
    return Object.entries(hourlyData).map(([hour, count]) => ({
      hour: parseInt(hour, 10),
      count,
    }));
  }
  private _calculateDailyVolume(
    events: SignalLifecycleEvent[],
  ): Array<{ date: string; count: number }> {
    const dailyData: Record<string, number> = {};
    for (const event of events) {
      const date = event.timestamp.toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] ?? 0) + 1;
    }
    return Object.entries(dailyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  private _calculateTypeDistribution(events: SignalLifecycleEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const event of events) {
      distribution[event.signalType] = (distribution[event.signalType] ?? 0) + 1;
    }
    return distribution;
  }
  private _calculatePriorityDistribution(events: SignalLifecycleEvent[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    for (const event of events) {
      // This would need priority info from the signal - simplified
      const priority = 5; // Default
      distribution[priority] = (distribution[priority] ?? 0) + 1;
    }
    return distribution;
  }
  private _calculateProcessingTimes(
    events: SignalLifecycleEvent[],
  ): Array<{ type: string; min: number; max: number; avg: number }> {
    const timesByType: Record<string, number[]> = {};
    for (const event of events) {
      if (event.duration && event.event === 'completed') {
        const type = event.signalType;
        if (!timesByType[type]) {
          timesByType[type] = [];
        }
        timesByType[type].push(event.duration);
      }
    }
    return Object.entries(timesByType).map(([type, times]) => ({
      type,
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((sum, time) => sum + time, 0) / times.length,
    }));
  }
  private _calculateErrorPatterns(
    events: SignalLifecycleEvent[],
  ): Array<{ type: string; count: number; lastOccurrence: Date }> {
    const errorsByType: Record<string, { count: number; lastOccurrence: Date }> = {};
    for (const event of events) {
      if (event.event === 'failed' && event.error) {
        const errorType = event.error;
        if (!errorsByType[errorType]) {
          errorsByType[errorType] = { count: 0, lastOccurrence: event.timestamp };
        }
        errorsByType[errorType].count++;
        if (event.timestamp > errorsByType[errorType].lastOccurrence) {
          errorsByType[errorType].lastOccurrence = event.timestamp;
        }
      }
    }
    return Object.entries(errorsByType).map(([type, data]) => ({
      type,
      count: data.count,
      lastOccurrence: data.lastOccurrence,
    }));
  }
}
