/**
 * ♫ Signal Ticker Component for @dcversus/prp TUI
 *
 * Animated ticker display for real-time signal flow visualization.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text } from 'ink';
import { SignalEvent, SignalPriority, SignalPriorityEnum } from '../../types';

export interface SignalTickerProps {
  signals: SignalEvent[];
  maxVisible?: number;
  speed?: number;
  pauseOnHover?: boolean;
  showPriority?: boolean;
  colorCodePriority?: boolean;
  animation?: 'scroll' | 'fade' | 'typewriter';
}

export const SignalTicker: React.FC<SignalTickerProps> = ({
  signals,
  maxVisible = 5,
  speed = 100,
  pauseOnHover = true,
  showPriority = true,
  colorCodePriority = true,
  animation = 'scroll'
}) => {
  const [visibleSignals, setVisibleSignals] = useState<SignalEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Priority color mapping
  const getPriorityColor = useCallback((priority: SignalPriority): string => {
    if (!colorCodePriority) {
      return 'white';
    }

    switch (priority) {
      case SignalPriorityEnum.CRITICAL:
        return '#FF4444'; // Red
      case SignalPriorityEnum.HIGH:
        return '#FF8800'; // Orange
      case SignalPriorityEnum.MEDIUM:
        return '#FFAA00'; // Yellow
      case SignalPriorityEnum.LOW:
        return '#00AA00'; // Green
      default:
        return 'white';
    }
  }, [colorCodePriority]);

  // Filter and sort signals by priority and timestamp
  const getSortedSignals = useCallback(() => {
    return signals
      .filter(signal => signal.state === 'active')
      .sort((a, b) => {
        // First by priority (critical first)
        const priorityOrder = {
          [SignalPriorityEnum.CRITICAL]: 0,
          [SignalPriorityEnum.HIGH]: 1,
          [SignalPriorityEnum.MEDIUM]: 2,
          [SignalPriorityEnum.LOW]: 3
        };

        const aPriority = priorityOrder[a.priority] ?? 999;
        const bPriority = priorityOrder[b.priority] ?? 999;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Then by timestamp (newest first)
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }, [signals]);

  // Update visible signals based on current index
  useEffect(() => {
    const sortedSignals = getSortedSignals();
    const start = currentIndex;
    const end = Math.min(start + maxVisible, sortedSignals.length);
    setVisibleSignals(sortedSignals.slice(start, end));
  }, [currentIndex, getSortedSignals, maxVisible]);

  // Auto-scroll animation
  useEffect(() => {
    if (isPaused || signals.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const totalSignals = getSortedSignals().length;
        if (totalSignals === 0) {
          return 0;
        }
        return (prev + 1) % totalSignals;
      });
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, signals.length, speed, getSortedSignals]);

  // Animation rendering
  const renderSignal = useCallback((signal: SignalEvent, index: number) => {
    const priorityColor = getPriorityColor(signal.priority);
    const prioritySymbol = showPriority ? `[${signal.priority.toUpperCase()[0]}] ` : '';

    return (
      <Box key={signal.id}>
        <Text
          color={priorityColor}
          bold={signal.priority === SignalPriorityEnum.CRITICAL}
        >
          {prioritySymbol}[{signal.signal}] {signal.title}
        </Text>
        {signal.source && (
          <Text color="gray" dimColor>
            {' '}({signal.source})
          </Text>
        )}
      </Box>
    );
  }, [getPriorityColor, showPriority]);

  if (visibleSignals.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray" dimColor>
          No active signals
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🎵 Signal Ticker {isPaused && '(Paused)'}
        </Text>
      </Box>

      {/* Signal List */}
      <Box flexDirection="column">
        {visibleSignals.map((signal, index) => (
          <Box key={`${signal.id}-${index}`}>
            {renderSignal(signal, index)}
          </Box>
        ))}
      </Box>

      {/* Progress indicator */}
      {signals.length > maxVisible && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Showing {visibleSignals.length} of {signals.length} signals
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default SignalTicker;