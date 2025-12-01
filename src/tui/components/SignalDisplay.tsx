/**
 * ♫ Signal Display Component
 *
 * Individual signal visualization component with animations, colors, and TypeScript strict compliance
 * Integrates with the signal system for real-time updates and performance optimization
 */

import React, { useMemo, useCallback } from 'react';
import { Text, Box } from 'ink';

import { getSignalColor } from '../config/TUIConfig';
import { useSignalDisplay } from '../hooks/useSignalSubscription';

import type { JSX } from 'react';
import type {
  SignalEvent,
  SignalDisplay as SignalDisplayType,
  SignalPriority,
  TUIConfig,
} from '../../types';

export interface SignalDisplayProps {
  signal: SignalEvent | SignalDisplayType | string;
  compact?: boolean;
  animated?: boolean;
  showTimestamp?: boolean;
  showDescription?: boolean;
  showSource?: boolean;
  config?: TUIConfig;
  animationFrame?: number;
  customColor?: string;
  backgroundColor?: string;
  maxWidth?: number;
};

interface PriorityIndicatorProps {
  priority: SignalPriority;
  compact?: boolean;
};

function PriorityIndicator({ priority, compact = false }: PriorityIndicatorProps) {
  const getPrioritySymbol = (): string => {
    switch (priority) {
      case 'critical':
        return '!';
      case 'high':
        return '▲';
      case 'medium':
        return '■';
      case 'low':
        return '○';
      default:
        return '?';
    }
  };

  const getPriorityColor = (): string => {
    switch (priority) {
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#6B7280';
      case 'low':
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  };

  if (compact) {
    return <Text color={getPriorityColor()}>{getPrioritySymbol()}</Text>;
  }

  return (
    <Text color={getPriorityColor()} bold>
      [{getPrioritySymbol()}]
    </Text>
  );
};

interface StateIndicatorProps {
  state: SignalEvent['state'];
  animated?: boolean;
};

function StateIndicator({ state, animated = false }: StateIndicatorProps) {
  const getStateSymbol = (): string => {
    switch (state) {
      case 'active':
        return animated ? '⟳' : '●';
      case 'resolved':
        return '✓';
      case 'pending':
        return '⏳';
      case 'failed':
        return '✗';
      default:
        return '?';
    }
  };

  const getStateColor = (): string => {
    switch (state) {
      case 'active':
        return '#10B981';
      case 'resolved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return <Text color={getStateColor()}>{getStateSymbol()}</Text>;
};

interface TimestampDisplayProps {
  timestamp: Date;
  compact?: boolean;
};

function TimestampDisplay({ timestamp, compact = false }: TimestampDisplayProps) {
  const formatTime = useCallback((date: Date): string => {
    if (compact) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return (
    <Text color="#9CA3AF" dimColor>
      {formatTime(timestamp)}
    </Text>
  );
};

/**
 * Main Signal Display Component
 */
export const SignalDisplay = ({
  signal,
  compact = false,
  animated = true,
  showTimestamp = false,
  showDescription = false,
  showSource = false,
  config,
  animationFrame = 0,
  customColor,
  backgroundColor,
  maxWidth = 80,
}: SignalDisplayProps): JSX.Element => {
  const { getSignalDisplay } = useSignalDisplay();

  // Convert signal to consistent format
  const normalizedSignal = useMemo((): {
    code: string;
    title: string;
    description: string;
    source?: string;
    priority: SignalPriority;
    state: SignalEvent['state'];
    timestamp?: Date;
  } => {
    if (typeof signal === 'string') {
      const display = getSignalDisplay(signal);
      return {
        code: signal,
        title: display?.description ?? signal,
        description: display?.description ?? '',
        priority: display?.priority ?? 'medium',
        state: 'active' as const,
      };
    }

    if ('signal' in signal) {
      // SignalEvent
      return {
        code: signal.signal,
        title: signal.title,
        description: signal.description,
        source: signal.source,
        priority: signal.priority,
        state: signal.state,
        timestamp: signal.timestamp,
      };
    }

    // SignalDisplayType
    return {
      code: signal.signal,
      title: signal.description,
      description: signal.description,
      priority: signal.priority,
      state: 'active' as const,
    };
  }, [signal, getSignalDisplay]);

  // Get display configuration
  const displayConfig = useMemo((): SignalDisplayType | null => {
    return getSignalDisplay(normalizedSignal.code);
  }, [normalizedSignal.code, getSignalDisplay]);

  // Determine colors
  const colors = useMemo(() => {
    if (customColor) {
      return { color: customColor, backgroundColor: backgroundColor ?? undefined };
    }

    if (displayConfig && config) {
      return { color: displayConfig.color, backgroundColor: displayConfig.backgroundColor };
    }

    if (config) {
      const signalColor = getSignalColor(normalizedSignal.code, 'active', config.colors);
      return { color: signalColor, backgroundColor: undefined };
    }

    return { color: '#9CA3AF', backgroundColor: undefined };
  }, [customColor, backgroundColor, displayConfig, config, normalizedSignal.code]);

  // Animation handling
  const animatedContent = useMemo(() => {
    if (!animated || !displayConfig?.animation) {
      return normalizedSignal.code;
    }

    switch (displayConfig.animation) {
      case 'flash':
        return animationFrame % 2 === 0 ? normalizedSignal.code : '   ';
      case 'pulse':
        return animationFrame % 3 === 0
          ? normalizedSignal.code.toUpperCase()
          : normalizedSignal.code;
      case 'bounce': {
        const bounce = Math.sin(animationFrame * 0.3) > 0;
        return bounce ? normalizedSignal.code : normalizedSignal.code.toLowerCase();
      }
      case 'wave': {
        const waveOffset = Math.floor(animationFrame / 3) % normalizedSignal.code.length;
        const chars = normalizedSignal.code.split('');
        const waveChar = chars[waveOffset];
        return waveChar ? waveChar.toUpperCase() : normalizedSignal.code;
      }
      default:
        return normalizedSignal.code;
    }
  }, [animated, displayConfig?.animation, animationFrame, normalizedSignal.code]);

  // Format signal content
  const signalContent = useMemo(() => {
    const content = animated ? animatedContent : normalizedSignal.code;

    if (compact) {
      return content;
    }

    // Extract content from brackets
    const match = content.match(/^\[(.+)\]$/);
    return match ? match[1] : content;
  }, [animated, animatedContent, normalizedSignal.code, compact]);

  // Build display elements
  const displayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    if (!compact) {
      elements.push(<PriorityIndicator key="priority" priority={normalizedSignal.priority} />);
      elements.push(<Text key="space"> </Text>);
    }

    // Main signal display
    if (backgroundColor && !compact) {
      elements.push(
        <Text key="signal" backgroundColor={backgroundColor} color={colors.color}>
          <Text color={colors.color}>[</Text>
          <Text color={colors.color} bold={normalizedSignal.state === 'active'}>
            {signalContent}
          </Text>
          <Text color={colors.color}>]</Text>
        </Text>,
      );
    } else {
      elements.push(
        <Text key="signal" color={colors.color} bold={normalizedSignal.state === 'active'}>
          [{signalContent}]
        </Text>,
      );
    }

    if (!compact && showDescription && normalizedSignal.description) {
      elements.push(<Text key="desc-space"> </Text>);
      elements.push(
        <Text key="description" color="#E5E7EB">
          {normalizedSignal.description}
        </Text>,
      );
    }

    if (!compact && showSource && normalizedSignal.source) {
      elements.push(<Text key="source-space"> </Text>);
      elements.push(
        <Text key="source" color="#9CA3AF" dimColor>
          ({normalizedSignal.source})
        </Text>,
      );
    }

    if (!compact && showTimestamp && normalizedSignal.timestamp) {
      elements.push(<Text key="time-space"> </Text>);
      elements.push(
        <TimestampDisplay
          key="timestamp"
          timestamp={normalizedSignal.timestamp}
          compact={compact}
        />,
      );
    }

    if (!compact) {
      elements.push(<Text key="state-space"> </Text>);
      elements.push(
        <StateIndicator key="state" state={normalizedSignal.state} animated={animated} />,
      );
    }

    return elements;
  }, [
    compact,
    normalizedSignal.priority,
    backgroundColor,
    colors.color,
    signalContent,
    normalizedSignal.state,
    showDescription,
    normalizedSignal.description,
    showSource,
    normalizedSignal.source,
    showTimestamp,
    normalizedSignal.timestamp,
    animated,
  ]);

  // Handle text overflow
  const content = useMemo(() => {
    const fullText = displayElements
      .map((el) =>
        typeof el === 'string'
          ? el
          : React.isValidElement(el)
            ? ((el.props.children as string | undefined) ?? '')
            : '',
      )
      .join('');

    if (fullText.length <= maxWidth) {
      return displayElements;
    }

    const truncated = `${fullText.substring(0, maxWidth - 3)  }...`;
    return <Text color={colors.color}>{truncated}</Text>;
  }, [displayElements, maxWidth, colors.color]);

  if (compact) {
    return <>{content}</>;
  }

  return (
    <Box flexDirection="row" alignItems="center">
      {content}
    </Box>
  );
};

/**
 * Signal Badge Component for compact display
 */
interface SignalBadgeProps {
  signal: string;
  count?: number;
  color?: string;
  compact?: boolean;
};

export const SignalBadge = ({
  signal,
  count,
  color,
  compact = false,
}: SignalBadgeProps): JSX.Element => {
  const { getSignalDisplay } = useSignalDisplay();

  const displayConfig = useMemo(() => getSignalDisplay(signal), [signal, getSignalDisplay]);

  const badgeColor = color ?? displayConfig?.color ?? '#9CA3AF';
  const signalText = displayConfig?.description ?? signal;

  if (compact) {
    return (
      <Text color={badgeColor} bold>
        {signal}
      </Text>
    );
  }

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={badgeColor} backgroundColor="#1F2937">
        {' '}
        {signal}{' '}
      </Text>
      {count !== undefined && count > 1 && (
        <>
          <Text color={badgeColor}>×</Text>
          <Text color={badgeColor} bold>
            {count}
          </Text>
        </>
      )}
      <Text color="#9CA3AF"> {signalText}</Text>
    </Box>
  );
};

/**
 * Signal List Component for displaying multiple signals
 */
interface SignalListProps {
  signals: Array<SignalEvent | SignalDisplayType | string>;
  maxItems?: number;
  sortBy?: 'timestamp' | 'priority' | 'signal';
  sortOrder?: 'asc' | 'desc';
  filter?: {
    priorities?: SignalPriority[];
    states?: SignalEvent['state'][];
    sources?: string[];
  };
  compact?: boolean;
  showTimestamp?: boolean;
  showDescription?: boolean;
  showSource?: boolean;
  config?: TUIConfig;
};

export const SignalList = ({
  signals,
  maxItems = 10,
  sortBy = 'timestamp',
  sortOrder = 'desc',
  filter,
  compact = false,
  showTimestamp = false,
  showDescription = false,
  showSource = false,
  config,
}: SignalListProps): JSX.Element => {
  const { getSignalDisplay } = useSignalDisplay();

  // Sort and filter signals
  const processedSignals = useMemo(() => {
    const filtered = signals.filter((signal) => {
      if (!filter) {
        return true;
      }

      // Extract signal data for filtering
      let signalData: {
        priority: SignalPriority;
        state: SignalEvent['state'];
        source?: string;
      };

      if (typeof signal === 'string') {
        const display = getSignalDisplay(signal);
        signalData = {
          priority: display?.priority ?? 'medium',
          state: 'active' as const,
        };
      } else if ('signal' in signal) {
        signalData = {
          priority: signal.priority,
          state: signal.state,
          source: signal.source,
        };
      } else {
        signalData = {
          priority: signal.priority,
          state: 'active' as const,
        };
      }

      // Apply filters
      if (filter.priorities && !filter.priorities.includes(signalData.priority)) {
        return false;
      }

      if (filter.states && !filter.states.includes(signalData.state)) {
        return false;
      }

      if (filter.sources && signalData.source && !filter.sources.includes(signalData.source)) {
        return false;
      }

      return true;
    });

    // Sort signals
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp': {
          const getTimestamp = (signal: typeof a): number => {
            if (typeof signal === 'string') {
              return Date.now();
            }
            return 'timestamp' in signal ? signal.timestamp.getTime() : Date.now();
          };
          comparison = getTimestamp(a) - getTimestamp(b);
          break;
        }

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
          const getPriority = (signal: typeof a): SignalPriority => {
            if (typeof signal === 'string') {
              const display = getSignalDisplay(signal);
              return display?.priority ?? 'medium';
            }
            return 'priority' in signal ? signal.priority : 'medium';
          };
          comparison = getPriorityValue(getPriority(b)) - getPriorityValue(getPriority(a));
          break;
        }

        case 'signal': {
          const getSignalCode = (signal: typeof a): string => {
            if (typeof signal === 'string') {
              return signal;
            }
            return 'signal' in signal ? signal.signal : signal.signal;
          };
          comparison = getSignalCode(a).localeCompare(getSignalCode(b));
          break;
        }

        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered.slice(0, maxItems);
  }, [signals, maxItems, sortBy, sortOrder, filter, getSignalDisplay]);

  if (processedSignals.length === 0) {
    return (
      <Text color="#9CA3AF" dimColor italic>
        No signals to display
      </Text>
    );
  }

  return (
    <Box flexDirection="column" gap={compact ? 0 : 1}>
      {processedSignals.map((signal, index) => (
        <SignalDisplay
          key={`signal-${index}-${typeof signal === 'string' ? signal : signal.signal}`}
          signal={signal}
          compact={compact}
          animated={true}
          showTimestamp={showTimestamp}
          showDescription={showDescription}
          showSource={showSource}
          config={config}
        />
      ))}
    </Box>
  );
};

// Export memoized version for performance
export const OptimizedSignalDisplay = React.memo(SignalDisplay);
export const OptimizedSignalBadge = React.memo(SignalBadge);
export const OptimizedSignalList = React.memo(SignalList);
