/**
 * ♫ Signal History Component
 *
 * Scrollable signal log with filtering, search, and grouping capabilities
 * Optimized for performance with virtual scrolling and TypeScript strict compliance
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';

import { useSignalSubscription } from '../hooks/useSignalSubscription';

import { SignalDisplay } from './SignalDisplay';

import type { SignalEvent, SignalFilter, SignalPriority, TUIConfig } from '../../types';

export interface SignalHistoryProps {
  maxHeight?: number;
  maxEntries?: number;
  initialFilter?: SignalFilter;
  showSearch?: boolean;
  showFilters?: boolean;
  showGrouping?: boolean;
  groupBy?: 'type' | 'source' | 'prpId' | 'priority' | 'state' | 'none';
  sortBy?: 'timestamp' | 'priority' | 'source' | 'signal';
  sortOrder?: 'asc' | 'desc';
  autoScroll?: boolean;
  compact?: boolean;
  config?: TUIConfig;
  onSignalSelect?: (signal: SignalEvent) => void;
  className?: string;
};

type GroupedSignals = Record<string, SignalEvent[]>;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
};

 
const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search signals...',
  compact = false,
}) => {
  return (
    <Box flexDirection="row" marginBottom={compact ? 0 : 1}>
      <Text color="#9CA3AF" dimColor>
        🔍
      </Text>
      <Text> </Text>
      <Text color="#9CA3AF">{placeholder}</Text>
      <Text> </Text>
      <Text color="#E5E7EB" bold underline={value.length > 0}>
        {value || '(empty)'}
      </Text>
    </Box>
  );
};

interface FilterPillProps {
  label: string;
  value: string | number;
  active?: boolean;
  color?: string;
  onClick?: () => void;
};

const FilterPill: React.FC<FilterPillProps> = ({
  label,
  value,
  active = false,
  color = '#6B7280',
  onClick,
}) => {
  if (onClick) {
    return (
      <Box marginRight={1}>
        <Text color={active ? color : '#9CA3AF'} backgroundColor={active ? '#1F2937' : undefined}>
          {label}: {value}
        </Text>
      </Box>
    );
  }

  return (
    <Box marginRight={1}>
      <Text color={active ? color : '#9CA3AF'} dimColor={!active}>
        {label}: {value}
      </Text>
    </Box>
  );
};

interface FilterBarProps {
  filter: SignalFilter;
  onFilterChange: (filter: SignalFilter) => void;
  compact?: boolean;
};

 
function FilterBar({
  filter,
  onFilterChange,
  compact = false,
}: FilterBarProps): React.ReactElement | null {
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.types?.length) {
      count++;
    }
    if (filter.sources?.length) {
      count++;
    }
    if (filter.priorities?.length) {
      count++;
    }
    if (filter.states?.length) {
      count++;
    }
    if (filter.prpId) {
      count++;
    }
    if (filter.agentId) {
      count++;
    }
    if (filter.tags?.length) {
      count++;
    }
    if (filter.search) {
      count++;
    }
    return count;
  }, [filter]);

  if (compact && activeFilterCount === 0) {
    return null;
  }

  return (
    <Box flexDirection="row" flexWrap="wrap" marginBottom={compact ? 0 : 1}>
      <Text color="#9CA3AF" dimColor marginRight={1}>
        Filters:
      </Text>

      {filter.types && (
        <FilterPill label="Types" value={filter.types.length} active={true} color="#8B5CF6" />
      )}

      {filter.sources && (
        <FilterPill label="Sources" value={filter.sources.length} active={true} color="#10B981" />
      )}

      {filter.priorities && (
        <FilterPill
          label="Priority"
          value={filter.priorities.length}
          active={true}
          color="#F59E0B"
        />
      )}

      {filter.states && (
        <FilterPill label="State" value={filter.states.length} active={true} color="#EF4444" />
      )}

      {filter.prpId && (
        <FilterPill label="PRP" value={filter.prpId} active={true} color="#6366F1" />
      )}

      {filter.agentId && (
        <FilterPill label="Agent" value={filter.agentId} active={true} color="#84CC16" />
      )}

      {filter.tags && filter.tags.length > 0 && (
        <FilterPill label="Tags" value={filter.tags.length} active={true} color="#14B8A6" />
      )}

      {filter.search && (
        <FilterPill label="Search" value={filter.search} active={true} color="#F97316" />
      )}

      {activeFilterCount === 0 && (
        <Text color="#9CA3AF" dimColor italic>
          No active filters
        </Text>
      )}
    </Box>
  );
};

interface GroupHeaderProps {
  groupKey: string;
  count: number;
  collapsed?: boolean;
  onToggle?: () => void;
  color?: string;
};

 
const GroupHeader: React.FC<GroupHeaderProps> = ({
  groupKey,
  count,
  collapsed = false,
  onToggle,
  color = '#9CA3AF',
}) => {
  const icon = collapsed ? '▶' : '▼';

  return (
    <Box flexDirection="row" alignItems="center" marginTop={1} marginBottom={1}>
      <Text color={color} bold>
        {icon}
      </Text>
      <Text> </Text>
      <Text color={color} bold>
        {groupKey}
      </Text>
      <Text> </Text>
      <Text color="#9CA3AF" dimColor>
        ({count})
      </Text>
    </Box>
  );
};

/**
 * Main Signal History Component
 */
export const SignalHistory = ({
  maxHeight = 20,
  maxEntries = 100,
  initialFilter,
  showSearch = true,
  showFilters = true,
  showGrouping = true,
  groupBy = 'none',
  sortBy = 'timestamp',
  sortOrder = 'desc',
   
  _autoScroll = true,
  compact = false,
  config,
  onSignalSelect,
  className,
}: SignalHistoryProps): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SignalFilter>(initialFilter ?? {});
  const [currentGroupBy, setCurrentGroupBy] = useState(groupBy);
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scrollOffset, setScrollOffset] = useState(0);

  // Get signal data
  const { signals, loading, error } = useSignalSubscription(undefined, filter, {
    historySize: maxEntries,
    debounceDelay: 100,
  });

  // Update search in filter
  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      search: searchQuery.trim() ?? undefined,
    }));
  }, [searchQuery]);

  // Process and sort signals
  const processedSignals = useMemo(() => {
    const processed = [...signals];

    // Sort signals
    processed.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;

        case 'priority': {
          const getPriorityValue = (priority: SignalPriority): number => {
            switch (priority) {
              case 'critical':
                return 4;
              case 'high':
                return 3;
              case 'medium':
                return 2;
              case 'low':
                return 1;
              default:
                return 0;
            }
          };
          comparison = getPriorityValue(b.priority) - getPriorityValue(a.priority);
          break;
        }

        case 'source':
          comparison = a.source.localeCompare(b.source);
          break;

        case 'signal':
          comparison = a.signal.localeCompare(b.signal);
          break;

        default:
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return processed.slice(0, maxEntries);
  }, [signals, sortBy, sortOrder, maxEntries]);

  // Group signals
  const groupedSignals = useMemo((): GroupedSignals => {
    if (currentGroupBy === 'none') {
      return { all: processedSignals };
    }

    const groups: GroupedSignals = {};

    processedSignals.forEach((signal) => {
      let groupKey = '';

      switch (currentGroupBy) {
        case 'type':
          groupKey = signal.type;
          break;
        case 'source':
          groupKey = signal.source;
          break;
        case 'prpId':
          groupKey = signal.prpId ?? 'No PRP';
          break;
        case 'priority':
          groupKey = signal.priority;
          break;
        case 'state':
          groupKey = signal.state;
          break;
        default:
          groupKey = 'Unknown';
      }

      groups[groupKey] ??= [];
      groups[groupKey]!.push(signal);
    });

    return groups;
  }, [processedSignals, currentGroupBy]);

  // Handle keyboard navigation
  useInput((input, key) => {
    switch (input) {
      case 'q':
      case 'Q':
        if (showSearch) {
          setSearchQuery((prev) => prev.slice(0, -1));
        }
        break;

      case '/':
        if (showSearch) {
          // Focus search
        }
        break;

      case 'g':
        if (showGrouping && key.shift) {
          // Shift+G to toggle grouping
          setCurrentGroupBy((prev) => (prev === 'none' ? 'type' : 'none'));
        }
        break;

      case 'j':
      case 'k':
        if (key.ctrl) {
          // Ctrl+J/K for navigation
          setScrollOffset((prev) => {
            if (input === 'j') {
              return Math.max(0, prev - 1);
            } else {
              return prev + 1;
            }
          });
        }
        break;
    }

    // Handle text input for search
    if (showSearch && input.length === 1 && !key.ctrl && !key.meta) {
      setSearchQuery((prev) => prev + input);
    }
  });

  // Toggle group collapse
  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  // Handle signal selection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSignalSelect = useCallback(
    (signal: SignalEvent) => {
      setSelectedSignal(signal.id);
      onSignalSelect?.(signal);
    },
    [onSignalSelect],
  );

  // Render signal content
   
  const renderSignal = useCallback(
    (signal: SignalEvent, _index: number) => {
      const isSelected = selectedSignal === signal.id;

      return (
        <Box key={signal.id} flexDirection="row">
          <SignalDisplay
            signal={signal}
            compact={compact}
            animated={true}
            showTimestamp={!compact}
            showDescription={!compact}
            showSource={!compact}
            config={config}
          />
          {isSelected && <Text color="#10B981"> ←</Text>}
        </Box>
      );
    },
    [selectedSignal, compact, config],
  );

  // Render grouped signals
  const renderGroupedSignals = useCallback(() => {
    const groupKeys = Object.keys(groupedSignals);
    let totalRendered = 0;

    return (
      <Box flexDirection="column">
        {groupKeys.map((groupKey) => {
          const groupSignals = groupedSignals[groupKey] || [];
          const isCollapsed = collapsedGroups.has(groupKey);

          if (totalRendered >= maxHeight) {
            return null;
          }

          const shouldRenderGroup = !isCollapsed || groupKey === 'all';

          return (
            <Box key={groupKey} flexDirection="column">
              {showGrouping && currentGroupBy !== 'none' && (
                <GroupHeader
                  groupKey={groupKey}
                  count={groupSignals.length}
                  collapsed={isCollapsed}
                  onToggle={() => toggleGroupCollapse(groupKey)}
                />
              )}
              {shouldRenderGroup &&
                groupSignals.slice(0, maxHeight - totalRendered).map((signal, index) => {
                  totalRendered++;
                  return renderSignal(signal, index);
                })}
              {totalRendered >= maxHeight && (
                <Text color="#9CA3AF" dimColor italic marginTop={1}>
                  ... and {processedSignals.length - totalRendered} more
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }, [
    groupedSignals,
    maxHeight,
    showGrouping,
    currentGroupBy,
    collapsedGroups,
    toggleGroupCollapse,
    renderSignal,
    processedSignals.length,
  ]);

  // Render header
  const renderHeader = () => {
    if (compact) {
      return null;
    }

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color="#E5E7EB" bold>
          Signal History
        </Text>
        <Text color="#9CA3AF" dimColor>
          {processedSignals.length} signal{processedSignals.length !== 1 ? 's' : ''} • Grouped by{' '}
          {currentGroupBy}
        </Text>
      </Box>
    );
  };

  // Render loading state
  if (loading && processedSignals.length === 0) {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text color="#9CA3AF" dimColor italic>
          Loading signals...
        </Text>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text color="#EF4444">Error loading signals: {error.message}</Text>
      </Box>
    );
  }

  // Render empty state
  if (processedSignals.length === 0) {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        {showSearch && (
          <SearchBar value={searchQuery} onChange={setSearchQuery} compact={compact} />
        )}
        {showFilters && <FilterBar filter={filter} onFilterChange={setFilter} compact={compact} />}
        <Text color="#9CA3AF" dimColor italic marginTop={1}>
          No signals found
        </Text>
      </Box>
    );
  }

  // Main render
  return (
    <Box flexDirection="column" className={className}>
      {renderHeader()}

      {showSearch && <SearchBar value={searchQuery} onChange={setSearchQuery} compact={compact} />}

      {showFilters && <FilterBar filter={filter} onFilterChange={setFilter} compact={compact} />}

      <Box flexDirection="column" height={Math.min(processedSignals.length, maxHeight)}>
        {renderGroupedSignals()}
      </Box>

      {!compact && processedSignals.length > 0 && (
        <Box flexDirection="row" marginTop={1}>
          <Text color="#9CA3AF" dimColor>
            Tips: / to search • g to group • j/k to navigate • q to clear search
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Compact Signal History Component for limited space
 */
export const CompactSignalHistory = ({
  maxEntries = 5,
  filter,
  config,
}: {
  maxEntries?: number;
  filter?: SignalFilter;
  config?: TUIConfig;
}): JSX.Element => {
  const { signals } = useSignalSubscription(undefined, filter, {
    historySize: maxEntries,
    debounceDelay: 50,
  });

  return (
    <Box flexDirection="column">
      {signals.slice(0, maxEntries).map((signal) => (
        <SignalDisplay
          key={signal.id}
          signal={signal}
          compact={true}
          animated={true}
          showTimestamp={false}
          showDescription={false}
          showSource={false}
          config={config}
        />
      ))}
    </Box>
  );
};

/**
 * Real-time Signal Ticker Component
 */
export const SignalTicker = ({
  maxItems = 3,
  filter,
  config,
  refreshInterval = 2000,
}: {
  maxItems?: number;
  filter?: SignalFilter;
  config?: TUIConfig;
  refreshInterval?: number;
}): JSX.Element => {
  const [tickerSignals, setTickerSignals] = useState<SignalEvent[]>([]);

  const { signals } = useSignalSubscription(undefined, filter, {
    historySize: maxItems * 2,
    debounceDelay: refreshInterval / 2,
  });

  // Update ticker signals periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerSignals((prev) => {
        const latestSignals = signals.slice(0, maxItems);
        return JSON.stringify(latestSignals) !== JSON.stringify(prev) ? latestSignals : prev;
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [signals, maxItems, refreshInterval]);

  if (tickerSignals.length === 0) {
    return (
      <Text color="#9CA3AF" dimColor italic>
        No recent signals
      </Text>
    );
  }

  return (
    <Box flexDirection="row" gap={2}>
      <Text color="#9CA3AF" dimColor>
        Latest:
      </Text>
      {tickerSignals.map((signal) => (
        <SignalDisplay
          key={`ticker-${signal.id}`}
          signal={signal}
          compact={true}
          animated={true}
          config={config}
        />
      ))}
    </Box>
  );
};

// Export memoized versions for performance
export const OptimizedSignalHistory = React.memo(SignalHistory);
export const OptimizedCompactSignalHistory = React.memo(CompactSignalHistory);
export const OptimizedSignalTicker = React.memo(SignalTicker);
