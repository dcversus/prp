/**
 * ♫ Signal Subscription Hook
 *
 * Real-time signal subscription and management hook for TUI components
 * Provides filtered signal updates with performance optimizations and TypeScript strict compliance
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  SignalEvent,
  SignalFilter,
  SignalSubscription,
  SignalAggregation,
  UseSignalSubscriptionReturn,
  UseSignalDisplayReturn,
  EventBusIntegration,
  SignalPerformanceMetrics,
  SignalDisplay
} from '../../types.js';
import {
  SignalTypeEnum,
  SignalSourceEnum,
  SignalPriorityEnum
} from '../../types.js';

// Default configuration
const DEFAULT_CONFIG = {
  historySize: 100,
  debounceDelay: 100,
  refreshInterval: 1000,
  maxRetries: 3,
  retryDelay: 1000
} as const;

// Type guard functions
function isValidSignalEvent(event: unknown): event is SignalEvent {
  return (
    event !== null &&
    typeof event === 'object' &&
    'id' in event &&
    'type' in event &&
    'signal' in event &&
    'timestamp' in event &&
    'source' in event &&
    'priority' in event &&
    'state' in event
  );
}

function isValidSignalFilter(filter: unknown): filter is SignalFilter {
  return (
    filter === null ||
    (typeof filter === 'object' && !Array.isArray(filter))
  );
}

// Utility functions
const createSignalId = (): string => `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const aggregateSignals = (signals: SignalEvent[]): SignalAggregation => {
  const aggregation: SignalAggregation = {
    total: signals.length,
    byType: {} as Record<SignalTypeEnum, number>,
    bySource: {} as Record<SignalSourceEnum, number>,
    byPriority: {} as Record<SignalPriorityEnum, number>,
    byState: { active: 0, resolved: 0, pending: 0, failed: 0 },
    recent: [],
    critical: []
  };

  // Initialize counters
  const signalTypes: SignalTypeEnum[] = Object.values(SignalTypeEnum);
  const signalSources: SignalSourceEnum[] = Object.values(SignalSourceEnum);
  const signalPriorities: SignalPriorityEnum[] = Object.values(SignalPriorityEnum);

  signalTypes.forEach(type => {
    aggregation.byType[type] = 0; 
  });
  signalSources.forEach(source => {
    aggregation.bySource[source] = 0; 
  });
  signalPriorities.forEach(priority => {
    aggregation.byPriority[priority] = 0; 
  });

  // Aggregate signals
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  signals.forEach(signal => {
    // Count by type
    aggregation.byType[signal.type] = (aggregation.byType[signal.type] ?? 0) + 1;

    // Count by source
    aggregation.bySource[signal.source] = (aggregation.bySource[signal.source] ?? 0) + 1;

    // Count by priority
    aggregation.byPriority[signal.priority] = (aggregation.byPriority[signal.priority] ?? 0) + 1;

    // Count by state
    aggregation.byState[signal.state] = (aggregation.byState[signal.state] ?? 0) + 1;

    // Recent signals (last hour)
    if (signal.timestamp >= oneHourAgo) {
      aggregation.recent.push(signal);
    }

    // Critical signals
    if (signal.priority === 'critical') {
      aggregation.critical.push(signal);
    }
  });

  // Sort recent and critical by timestamp (newest first)
  aggregation.recent.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  aggregation.critical.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return aggregation;
};

const filterSignal = (signal: SignalEvent, filter?: SignalFilter): boolean => {
  if (!filter) {
    return true;
  }

  // Type filter
  if (filter.types && !filter.types.includes(signal.type)) {
    return false;
  }

  // Source filter
  if (filter.sources && !filter.sources.includes(signal.source)) {
    return false;
  }

  // Priority filter
  if (filter.priorities && !filter.priorities.includes(signal.priority)) {
    return false;
  }

  // State filter
  if (filter.states && !filter.states.includes(signal.state)) {
    return false;
  }

  // PRP ID filter
  if (filter.prpId && signal.prpId !== filter.prpId) {
    return false;
  }

  // Agent ID filter
  if (filter.agentId && signal.agentId !== filter.agentId) {
    return false;
  }

  // Tags filter
  if (filter.tags && filter.tags.length > 0) {
    const signalTags = signal.tags ?? [];
    const hasMatchingTag = filter.tags.some(tag => signalTags.includes(tag));
    if (!hasMatchingTag) {
      return false;
    }
  }

  // Date range filter
  if (filter.dateRange) {
    const signalTime = signal.timestamp.getTime();
    const startTime = filter.dateRange.start.getTime();
    const endTime = filter.dateRange.end.getTime();
    if (signalTime < startTime || signalTime > endTime) {
      return false;
    }
  }

  // Search filter
  if (filter.search?.trim()) {
    const searchTerm = filter.search.toLowerCase();
    const searchableText = [
      signal.signal,
      signal.title,
      signal.description,
      signal.source,
      signal.prpId ?? '',
      signal.agentId ?? '',
      ...(signal.tags ?? [])
    ].join(' ').toLowerCase();

    if (!searchableText.includes(searchTerm)) {
      return false;
    }
  }

  return true;
};

/**
 * Main signal subscription hook
 */
export function useSignalSubscription(
  eventBus?: EventBusIntegration,
  initialFilter?: SignalFilter,
  config: Partial<typeof DEFAULT_CONFIG> = {}
): UseSignalSubscriptionReturn {
  const [signals, setSignals] = useState<SignalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Merge configuration
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // Refs for performance and cleanup
  const subscriptionsRef = useRef<Map<string, SignalSubscription>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const signalHistoryRef = useRef<SignalEvent[]>([]);

  // Memoized aggregation
  const aggregation = useMemo(() => aggregateSignals(signals), [signals]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }

    // Unsubscribe all subscriptions
    subscriptionsRef.current.forEach(subscription => {
      try {
        eventBus?.unsubscribe(subscription.id);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error unsubscribing from event bus:', err);
      }
    });
    subscriptionsRef.current.clear();

    // Reset retry count
    retryCountRef.current = 0;
  }, [eventBus]);

  // Apply filters to signals
  const applyFilters = useCallback((allSignals: SignalEvent[], filter?: SignalFilter): SignalEvent[] => {
    if (!filter) {
      return allSignals;
    }

    return allSignals.filter(signal => filterSignal(signal, filter));
  }, []);

  // Debounced signal update
  const updateSignalsDebounced = useCallback((newSignals: SignalEvent[], filter?: SignalFilter) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        const filteredSignals = applyFilters(newSignals, filter);
        setSignals(filteredSignals.slice(-finalConfig.historySize));
        setError(null);
        retryCountRef.current = 0;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error updating signals'));
      }
    }, finalConfig.debounceDelay);
  }, [applyFilters, finalConfig]);

  // Handle incoming signal events
  const handleSignalEvent = useCallback((event: unknown) => {
    if (!isValidSignalEvent(event)) {
      // eslint-disable-next-line no-console
      console.warn('Received invalid signal event:', event);
      return;
    }

    try {
      // Add to history
      signalHistoryRef.current = [...signalHistoryRef.current, event].slice(-finalConfig.historySize);

      // Update debounced
      updateSignalsDebounced(signalHistoryRef.current, initialFilter);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error handling signal event:', err);
      setError(err instanceof Error ? err : new Error('Error handling signal event'));
    }
  }, [updateSignalsDebounced, initialFilter, finalConfig.historySize]);

  // Initialize subscriptions
  useEffect(() => {
    if (!eventBus) {
      setLoading(false);
      return;
    }

    const initializeSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Subscribe to all signal events
        const subscriptionId = eventBus.subscribe('*', handleSignalEvent);

        const subscription: SignalSubscription = {
          id: subscriptionId,
          filter: initialFilter,
          handler: handleSignalEvent,
          createdAt: new Date()
        };

        subscriptionsRef.current.set(subscriptionId, subscription);

        // Load initial signals
        const recentEvents = eventBus.getRecentEvents(finalConfig.historySize);
        const validEvents = recentEvents.filter(isValidSignalEvent);

        signalHistoryRef.current = validEvents;
        const filteredSignals = applyFilters(validEvents, initialFilter);
        setSignals(filteredSignals);

        setLoading(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize signal subscriptions');
        setError(error);

        // Retry logic
        if (retryCountRef.current < finalConfig.maxRetries) {
          retryCountRef.current++;
          setTimeout(initializeSubscriptions, finalConfig.retryDelay * retryCountRef.current);
        } else {
          setLoading(false);
        }
      }
    };

    initializeSubscriptions();

    return cleanup;
  }, [eventBus, handleSignalEvent, applyFilters, initialFilter, finalConfig, cleanup]);

  // Update filter when it changes
  useEffect(() => {
    const filteredSignals = applyFilters(signalHistoryRef.current, initialFilter);
    setSignals(filteredSignals.slice(-finalConfig.historySize));
  }, [initialFilter, applyFilters, finalConfig.historySize]);

  // Subscribe to specific filter
  const subscribe = useCallback((filter?: SignalFilter): string => {
    if (!eventBus) {
      throw new Error('EventBus not available for subscription');
    }

    if (!isValidSignalFilter(filter)) {
      throw new Error('Invalid filter provided');
    }

    const subscriptionId = createSignalId();
    const subscription: SignalSubscription = {
      id: subscriptionId,
      filter,
      handler: handleSignalEvent,
      createdAt: new Date()
    };

    subscriptionsRef.current.set(subscriptionId, subscription);

    // Apply new filter immediately
    const filteredSignals = applyFilters(signalHistoryRef.current, filter);
    setSignals(filteredSignals.slice(-finalConfig.historySize));

    return subscriptionId;
  }, [eventBus, handleSignalEvent, applyFilters, finalConfig.historySize]);

  // Unsubscribe from specific filter
  const unsubscribe = useCallback((subscriptionId: string) => {
    const subscription = subscriptionsRef.current.get(subscriptionId);
    if (subscription) {
      try {
        eventBus?.unsubscribe(subscriptionId);
        subscriptionsRef.current.delete(subscriptionId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error unsubscribing:', err);
      }
    }
  }, [eventBus]);

  // Clear all signals
  const clearSignals = useCallback(() => {
    signalHistoryRef.current = [];
    setSignals([]);
  }, []);

  // Refetch signals
  const refetch = useCallback(async () => {
    if (!eventBus) {
      return;
    }

    try {
      setLoading(true);
      const recentEvents = eventBus.getRecentEvents(finalConfig.historySize);
      const validEvents = recentEvents.filter(isValidSignalEvent);

      signalHistoryRef.current = validEvents;
      const filteredSignals = applyFilters(validEvents, initialFilter);
      setSignals(filteredSignals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refetch signals'));
    } finally {
      setLoading(false);
    }
  }, [eventBus, applyFilters, initialFilter, finalConfig.historySize]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    signals,
    loading,
    error,
    subscribe,
    unsubscribe,
    clearSignals,
    refetch,
    aggregation
  };
}

/**
 * Hook for signal display mapping and search
 */
export function useSignalDisplay(): UseSignalDisplayReturn {
  const getSignalDisplay = useCallback((signal: string): SignalDisplay | null => {
    const signalMapping: Record<string, SignalDisplay> = {
      // Agent Signals
      '[bb]': {
        signal: '[bb]',
        color: '#EF4444',
        animation: 'pulse',
        description: 'Blocker',
        priority: SignalPriorityEnum.HIGH,
        category: 'blocker',
        role: SignalSourceEnum.SYSTEM
      },
      '[af]': {
        signal: '[af]',
        color: '#F59E0B',
        animation: 'bounce',
        description: 'Feedback Request',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'feedback',
        role: SignalSourceEnum.SYSTEM
      },
      '[da]': {
        signal: '[da]',
        color: '#10B981',
        animation: 'flash',
        description: 'Done Assessment',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'quality',
        role: SignalSourceEnum.SYSTEM
      },
      '[no]': {
        signal: '[no]',
        color: '#F59E0B',
        animation: 'wave',
        description: 'Not Obvious',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'feedback'
      },

      // System Analyst Signals
      '[gg]': {
        signal: '[gg]',
        color: '#C7A16B',
        animation: 'pulse',
        description: 'Goal Clarification',
        priority: SignalPriorityEnum.HIGH,
        category: 'feedback',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[ff]': {
        signal: '[ff]',
        color: '#EF4444',
        animation: 'flash',
        description: 'Goal Not Achievable',
        priority: SignalPriorityEnum.CRITICAL,
        category: 'blocker',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[rp]': {
        signal: '[rp]',
        color: '#10B981',
        animation: 'bounce',
        description: 'Ready for Preparation',
        priority: SignalPriorityEnum.HIGH,
        category: 'coordination',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[vr]': {
        signal: '[vr]',
        color: '#F59E0B',
        animation: 'wave',
        description: 'Validation Required',
        priority: SignalPriorityEnum.HIGH,
        category: 'coordination',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[rr]': {
        signal: '[rr]',
        color: '#6366F1',
        animation: 'flash',
        description: 'Research Request',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'coordination',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[vp]': {
        signal: '[vp]',
        color: '#8B5CF6',
        animation: 'pulse',
        description: 'Verification Plan',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'quality',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[ip]': {
        signal: '[ip]',
        color: '#10B981',
        animation: 'bounce',
        description: 'Implementation Plan',
        priority: SignalPriorityEnum.HIGH,
        category: 'coordination',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[er]': {
        signal: '[er]',
        color: '#6366F1',
        animation: 'wave',
        description: 'Experiment Required',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'coordination',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[rc]': {
        signal: '[rc]',
        color: '#10B981',
        animation: 'flash',
        description: 'Research Complete',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'progress',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },

      // Developer Signals
      '[tp]': {
        signal: '[tp]',
        color: '#61AFEF',
        animation: 'bounce',
        description: 'Tests Prepared',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'quality',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },
      '[dp]': {
        signal: '[dp]',
        color: '#61AFEF',
        animation: 'flash',
        description: 'Development Progress',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'progress',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },
      '[br]': {
        signal: '[br]',
        color: '#10B981',
        animation: 'bounce',
        description: 'Blocker Resolved',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'progress',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },
      '[tw]': {
        signal: '[tw]',
        color: '#61AFEF',
        animation: 'pulse',
        description: 'Tests Written',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'quality',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },
      '[bf]': {
        signal: '[bf]',
        color: '#EF4444',
        animation: 'flash',
        description: 'Bug Fixed',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'progress',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },
      '[mg]': {
        signal: '[mg]',
        color: '#10B981',
        animation: 'bounce',
        description: 'Merged',
        priority: SignalPriorityEnum.HIGH,
        category: 'progress',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },
      '[rl]': {
        signal: '[rl]',
        color: '#10B981',
        animation: 'flash',
        description: 'Released',
        priority: SignalPriorityEnum.HIGH,
        category: 'progress',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },
      '[cc]': {
        signal: '[cc]',
        color: '#6B7280',
        animation: 'none',
        description: 'Cleanup Complete',
        priority: SignalPriorityEnum.LOW,
        category: 'system',
        role: SignalSourceEnum.ROBO_DEVELOPER
      },

      // QA Signals
      '[cq]': {
        signal: '[cq]',
        color: '#B48EAD',
        animation: 'pulse',
        description: 'Code Quality',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'quality',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[cp]': {
        signal: '[cp]',
        color: '#10B981',
        animation: 'bounce',
        description: 'CI Passed',
        priority: SignalPriorityEnum.HIGH,
        category: 'quality',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[tr]': {
        signal: '[tr]',
        color: '#EF4444',
        animation: 'flash',
        description: 'Tests Red',
        priority: SignalPriorityEnum.HIGH,
        category: 'quality',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[tg]': {
        signal: '[tg]',
        color: '#10B981',
        animation: 'bounce',
        description: 'Tests Green',
        priority: SignalPriorityEnum.HIGH,
        category: 'quality',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[cf]': {
        signal: '[cf]',
        color: '#EF4444',
        animation: 'flash',
        description: 'CI Failed',
        priority: SignalPriorityEnum.CRITICAL,
        category: 'blocker',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[pc]': {
        signal: '[pc]',
        color: '#10B981',
        animation: 'flash',
        description: 'Pre-release Complete',
        priority: SignalPriorityEnum.HIGH,
        category: 'quality',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[rg]': {
        signal: '[rg]',
        color: '#6B7280',
        animation: 'pulse',
        description: 'Review Progress',
        priority: SignalPriorityEnum.LOW,
        category: 'coordination',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[rv]': {
        signal: '[rv]',
        color: '#10B981',
        animation: 'bounce',
        description: 'Review Passed',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'quality',
        role: SignalSourceEnum.ROBO_AQA
      },
      '[iv]': {
        signal: '[iv]',
        color: '#10B981',
        animation: 'flash',
        description: 'Implementation Verified',
        priority: SignalPriorityEnum.HIGH,
        category: 'quality',
        role: SignalSourceEnum.ROBO_QUALITY_CONTROL
      },

      // System/Coordination Signals
      '[oa]': {
        signal: '[oa]',
        color: '#FF9A38',
        animation: 'pulse',
        description: 'Orchestrator Attention',
        priority: SignalPriorityEnum.HIGH,
        category: 'coordination',
        role: SignalSourceEnum.ORCHESTRATOR
      },
      '[aa]': {
        signal: '[aa]',
        color: '#6B7280',
        animation: 'none',
        description: 'Admin Attention',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'coordination'
      },
      '[ap]': {
        signal: '[ap]',
        color: '#8B5CF6',
        animation: 'bounce',
        description: 'Admin Preview Ready',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'coordination'
      },

      // Release and Post-release
      '[ra]': {
        signal: '[ra]',
        color: '#10B981',
        animation: 'flash',
        description: 'Release Approved',
        priority: SignalPriorityEnum.CRITICAL,
        category: 'coordination',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[ps]': {
        signal: '[ps]',
        color: '#6B7280',
        animation: 'none',
        description: 'Post-release Status',
        priority: SignalPriorityEnum.LOW,
        category: 'system',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      },
      '[ic]': {
        signal: '[ic]',
        color: '#EF4444',
        animation: 'flash',
        description: 'Incident',
        priority: SignalPriorityEnum.CRITICAL,
        category: 'blocker'
      },
      '[JC]': {
        signal: '[JC]',
        color: '#10B981',
        animation: 'bounce',
        description: 'Jesus Christ (Incident Resolved)',
        priority: SignalPriorityEnum.CRITICAL,
        category: 'progress'
      },
      '[pm]': {
        signal: '[pm]',
        color: '#F59E0B',
        animation: 'wave',
        description: 'Post-mortem',
        priority: SignalPriorityEnum.MEDIUM,
        category: 'system',
        role: SignalSourceEnum.ROBO_SYSTEM_ANALYST
      }
    };

    return signalMapping[signal] ?? null;
  }, []);

  const getAllSignals = useCallback((): SignalDisplay[] => {
    return Object.values({
      // Agent Signals
      '[bb]': getSignalDisplay('[bb]'),
      '[af]': getSignalDisplay('[af]'),
      '[da]': getSignalDisplay('[da]'),
      '[no]': getSignalDisplay('[no]'),

      // System Analyst Signals
      '[gg]': getSignalDisplay('[gg]'),
      '[ff]': getSignalDisplay('[ff]'),
      '[rp]': getSignalDisplay('[rp]'),
      '[vr]': getSignalDisplay('[vr]'),
      '[rr]': getSignalDisplay('[rr]'),
      '[vp]': getSignalDisplay('[vp]'),
      '[ip]': getSignalDisplay('[ip]'),
      '[er]': getSignalDisplay('[er]'),
      '[rc]': getSignalDisplay('[rc]'),

      // Developer Signals
      '[tp]': getSignalDisplay('[tp]'),
      '[dp]': getSignalDisplay('[dp]'),
      '[br]': getSignalDisplay('[br]'),
      '[tw]': getSignalDisplay('[tw]'),
      '[bf]': getSignalDisplay('[bf]'),
      '[mg]': getSignalDisplay('[mg]'),
      '[rl]': getSignalDisplay('[rl]'),
      '[cc]': getSignalDisplay('[cc]'),

      // QA Signals
      '[cq]': getSignalDisplay('[cq]'),
      '[cp]': getSignalDisplay('[cp]'),
      '[tr]': getSignalDisplay('[tr]'),
      '[tg]': getSignalDisplay('[tg]'),
      '[cf]': getSignalDisplay('[cf]'),
      '[pc]': getSignalDisplay('[pc]'),
      '[rg]': getSignalDisplay('[rg]'),
      '[rv]': getSignalDisplay('[rv]'),
      '[iv]': getSignalDisplay('[iv]'),

      // System/Coordination Signals
      '[oa]': getSignalDisplay('[oa]'),
      '[aa]': getSignalDisplay('[aa]'),
      '[ap]': getSignalDisplay('[ap]'),

      // Release and Post-release
      '[ra]': getSignalDisplay('[ra]'),
      '[ps]': getSignalDisplay('[ps]'),
      '[ic]': getSignalDisplay('[ic]'),
      '[JC]': getSignalDisplay('[JC]'),
      '[pm]': getSignalDisplay('[pm]')
    }).filter((display): display is SignalDisplay => display !== null);
  }, [getSignalDisplay]);

  const getSignalsByCategory = useCallback((category: SignalDisplay['category']): SignalDisplay[] => {
    return getAllSignals().filter(display => display.category === category);
  }, [getAllSignals]);

  const getSignalsByPriority = useCallback((priority: SignalPriorityEnum): SignalDisplay[] => {
    return getAllSignals().filter(display => display.priority === priority);
  }, [getAllSignals]);

  const searchSignals = useCallback((query: string): SignalDisplay[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) {
      return [];
    }

    return getAllSignals().filter(display =>
      display.signal.toLowerCase().includes(searchTerm) ||
      (display.description?.toLowerCase() ?? '').includes(searchTerm) ||
      (display.category?.toLowerCase() ?? '').includes(searchTerm) ||
      (display.role?.toLowerCase() ?? '').includes(searchTerm)
    );
  }, [getAllSignals]);

  return {
    getSignalDisplay,
    getAllSignals,
    getSignalsByCategory,
    getSignalsByPriority,
    searchSignals
  };
}

/**
 * Hook for signal performance monitoring
 */
export function useSignalPerformance(): SignalPerformanceMetrics {
  const [metrics] = useState<SignalPerformanceMetrics>({
    totalSignals: 0,
    signalsPerSecond: 0,
    averageProcessingTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    errorRate: 0,
    lastUpdate: new Date()
  });

  // This would integrate with actual performance monitoring
  // For now, return mock metrics
  return metrics;
}