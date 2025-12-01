/**
 * ♫ Enhanced Signal Ticker Component
 *
 * Advanced signal display with music-themed animations:
 * - Melody-synchronized signal scrolling
 * - Wave animations across signal placeholders
 * - Classical music integration
 * - Performance-optimized rendering
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';

import { useAnimationEngine } from '../animation/AnimationEngine';

import { CompactMusicIndicator } from './MusicVisualizer';

import type { JSX } from 'react';

interface EnhancedSignalTickerProps {
  signals: string[];
  width?: number;
  height?: number;
  showMusicIndicator?: boolean;
  animationSpeed?: number;
  compact?: boolean;
  scrollSpeed?: number;
}

interface SignalSlot {
  id: string;
  signal: string;
  position: number;
  state: 'empty' | 'filling' | 'filled' | 'emptying';
  intensity: number;
  color: string;
}

/**
 * Individual signal slot with wave animation
 */
const SignalSlot = ({
  signal,
  position,
  intensity,
  color,
  wavePosition
}: {
  signal: string;
  position: number;
  intensity: number;
  color: string;
  wavePosition: number;
}): JSX.Element => {
  const distance = Math.abs(position - wavePosition);
  const waveIntensity = distance === 0 ? 1.0 : distance === 1 ? 0.7 : distance === 2 ? 0.3 : 0.1;
  const finalIntensity = intensity * waveIntensity;

  const getSignalDisplay = (): string => {
    if (signal === '[  ]' || signal.trim() === '') {
      return finalIntensity > 0.5 ? '♪' : ' ';
    }
    return signal;
  };

  const getSignalColor = (): string => {
    if (finalIntensity > 0.8) return '#10B981'; // Bright green
    if (finalIntensity > 0.6) return '#34D399'; // Medium green
    if (finalIntensity > 0.4) return '#6EE7B7'; // Light green
    if (finalIntensity > 0.2) return '#A7F3D0'; // Very light green
    return color || '#6B7280'; // Default gray
  };

  return (
    <Text color={getSignalColor()} bold={finalIntensity > 0.6}>
      {getSignalDisplay()}
    </Text>
  );
};

/**
 * Wave animation across signal slots
 */
const SignalWave = ({
  slotCount,
  isActive,
  onWaveComplete
}: {
  slotCount: number;
  isActive: boolean;
  onWaveComplete?: () => void;
}): JSX.Element => {
  const [wavePosition, setWavePosition] = useState(-1);
  const { engine } = useAnimationEngine();

  useEffect(() => {
    if (!isActive) {
      setWavePosition(-1);
      return;
    }

    const interval = setInterval(() => {
      setWavePosition(prev => {
        const next = prev + 1;
        if (next >= slotCount) {
          onWaveComplete?.();
          return -1;
        }
        return next;
      });
    }, 50); // 50ms per slot for smooth wave

    return () => clearInterval(interval);
  }, [isActive, slotCount, onWaveComplete]);

  const createWaveDisplay = (): string[] => {
    const display: string[] = [];
    for (let i = 0; i < slotCount; i++) {
      if (i === wavePosition) {
        display.push('♫');
      } else if (Math.abs(i - wavePosition) === 1) {
        display.push('♪');
      } else if (Math.abs(i - wavePosition) === 2) {
        display.push('♩');
      } else {
        display.push(' ');
      }
    }
    return display;
  };

  return (
    <Box flexDirection="row">
      {createWaveDisplay().map((char, i) => (
        <Text key={i} color={char === '♫' ? '#10B981' : char === '♪' ? '#34D399' : '#6B7280'}>
          {char}
        </Text>
      ))}
    </Box>
  );
};

/**
 * Classical music melody display
 */
const MelodyDisplay = ({
  melodyName,
  currentBeat
}: {
  melodyName: string;
  currentBeat: number;
}): JSX.Element => {
  const melodyInfo: Record<string, { symbol: string; color: string }> = {
    'AGENT_SPAWNING': { symbol: '🎹', color: '#60A5FA' },
    'TASK_SUCCESS': { symbol: '🎻', color: '#34D399' },
    'TASK_ERROR': { symbol: '🎺', color: '#F87171' },
    'SYSTEM_READY': { symbol: '🎷', color: '#A78BFA' },
    'COMPLETION_FANFARE': { symbol: '🎸', color: '#FBBF24' },
    'MOZART_SONATA': { symbol: '🎼', color: '#60A5FA' },
    'BEETHOVEN_ODE': { symbol: '🎶', color: '#34D399' },
    'BACH_FUGUE': { symbol: '🎵', color: '#8B5CF6' },
    'VIVALDI_SPRING': { symbol: '🌸', color: '#F472B6' },
    'DEBUSSY_CLAIR': { symbol: '💎', color: '#06B6D4' },
  };

  const info = melodyInfo[melodyName] || { symbol: '♪', color: '#6B7280' };

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={info.color}>
        {info.symbol}
      </Text>
      <Text color="#9CA3AF">
        {' '}{melodyName.replace(/_/g, ' ').toLowerCase()}
      </Text>
      <Text color="#6B7280">
        {' '}[♫.♩.♪.♬][(currentBeat % 4) + 1]/4]
      </Text>
    </Box>
  );
};

/**
 * Main Enhanced Signal Ticker Component
 */
export const EnhancedSignalTicker = ({
  signals,
  width = 60,
  height = 6,
  showMusicIndicator = true,
  animationSpeed = 8,
  compact = false,
  scrollSpeed = 3000
}: EnhancedSignalTickerProps): JSX.Element => {
  const { engine, getCurrentBeat } = useAnimationEngine();
  const [signalSlots, setSignalSlots] = useState<SignalSlot[]>([]);
  const [currentMelody, setCurrentMelody] = useState('SYSTEM_READY');
  const [waveActive, setWaveActive] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  const beat = getCurrentBeat();
  const slotCount = Math.floor(width / 4) - 2; // Account for brackets and spacing

  // Initialize signal slots
  useEffect(() => {
    const slots: SignalSlot[] = Array.from({ length: slotCount }, (_, i) => ({
      id: `slot-${i}`,
      signal: '[  ]',
      position: i,
      state: 'empty',
      intensity: 0,
      color: '#6B7280',
    }));
    setSignalSlots(slots);
  }, [slotCount]);

  // Handle scrolling signals
  useEffect(() => {
    if (signals.length === 0) return;

    const interval = setInterval(() => {
      setScrollOffset(prev => (prev + 1) % signals.length);
    }, scrollSpeed);

    return () => clearInterval(interval);
  }, [signals, scrollSpeed]);

  // Update signal slots with current signals
  useEffect(() => {
    setSignalSlots(prev => {
      const updated = [...prev];
      const availableSignals = [...signals];

      // Distribute signals across slots
      availableSignals.forEach((signal, signalIndex) => {
        const slotIndex = (scrollOffset + signalIndex) % slotCount;
        if (updated[slotIndex]) {
          const intensity = beat?.isOnBeat ? 1.0 : 0.6;

          updated[slotIndex] = {
            ...updated[slotIndex],
            signal,
            intensity,
            state: signal === '[  ]' || signal.trim() === '' ? 'empty' : 'filled',
            color: getSignalColor(signal),
          };
        }
      });

      return updated;
    });
  }, [signals, scrollOffset, beat, slotCount]);

  // Trigger wave animation on beat
  useEffect(() => {
    if (beat?.isOnBeat) {
      setWaveActive(true);
      const timeout = setTimeout(() => setWaveActive(false), slotCount * 50 + 200);
      return () => clearTimeout(timeout);
    }
  }, [beat?.isOnBeat, slotCount]);

  // Get signal color based on type
  const getSignalColor = useCallback((signal: string): string => {
    const colorMap: Record<string, string> = {
      '[dp]': '#10B981', // Development progress - green
      '[tw]': '#34D399', // Tests written - light green
      '[bf]': '#F59E0B', // Bug fixed - amber
      '[cq]': '#60A5FA', // Code quality - blue
      '[tg]': '#10B981', // Tests green - green
      '[cp]': '#F59E0B', // CI passed - amber
      '[cf]': '#EF4444', // CI failed - red
      '[rv]': '#8B5CF6', // Review passed - purple
      '[ra]': '#10B981', // Release approved - green
      '[rl]': '#34D399', // Released - green
      '[mg]': '#F59E0B', // Merged - amber
      '[aa]': '#EF4444', // Admin attention - red
      '[ic]': '#EF4444', // Incident - red
      '[ff]': '#DC2626', // Fatal error - red
    };
    return colorMap[signal] || '#6B7280';
  }, []);

  // Determine current melody based on active signals
  useEffect(() => {
    const melodyMap: Record<string, string> = {
      '[aa]': 'MISSION_IMPOSSIBLE',
      '[ic]': 'STAR_WARS',
      '[ff]': 'BACH_FUGUE',
      '[mg]': 'COMPLETION_FANFARE',
      '[rl]': 'VIVALDI_SPRING',
      '[bf]': 'DEBUSSY_CLAIR',
    };

    const activeMelody = signals.find(signal => melodyMap[signal]);
    if (activeMelody) {
      setCurrentMelody(melodyMap[activeMelody]);
    } else {
      setCurrentMelody('SYSTEM_READY');
    }
  }, [signals]);

  if (compact) {
    return (
      <Box flexDirection="row" alignItems="center" width={width}>
        {showMusicIndicator && <CompactMusicIndicator active signals={signals} />}
        <Text color="#9CA3AF"> {signals.slice(0, 3).join(' ')}{signals.length > 3 ? '...' : ''}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color="#10B981" bold>
          ♫ Signal Ticker
        </Text>
        {showMusicIndicator && <CompactMusicIndicator active={beat?.isOnBeat} signals={signals} />}
      </Box>

      {/* Signal Display Area */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color="#6B7280">[</Text>

        {signalSlots.map((slot, index) => (
          <Box key={slot.id} flexDirection="row">
            {waveActive && index <= wavePosition + 2 && index >= wavePosition - 2 ? (
              <SignalWave
                slotCount={1}
                isActive={index === wavePosition}
              />
            ) : (
              <SignalSlot
                signal={slot.signal}
                position={index}
                intensity={slot.intensity}
                color={slot.color}
                wavePosition={wavePosition}
              />
            )}
          </Box>
        ))}

        <Text color="#6B7280">]</Text>
      </Box>

      {/* Melody Display */}
      <Box flexDirection="row" justifyContent="center" marginBottom={1}>
        <MelodyDisplay melodyName={currentMelody} currentBeat={beat?.index ?? 0} />
      </Box>

      {/* Status Line */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="#6B7280" dimColor>
          Active: {signals.filter(s => s !== '[  ]').length}/{signals.length}
        </Text>
        <Text color="#6B7280" dimColor>
          {beat?.isOnBeat ? '🎵' : '♪'} Beat {beat?.index ?? 0}
        </Text>
      </Box>
    </Box>
  );
};

/**
 * Signal ticker for header display
 */
export const HeaderSignalTicker = ({
  signals,
  width = 40
}: {
  signals: string[];
  width?: number;
}): JSX.Element => {
  const { getCurrentBeat } = useAnimationEngine();
  const beat = getCurrentBeat();

  return (
    <Box flexDirection="row" alignItems="center" width={width}>
      <Text color={beat?.isOnBeat ? '#10B981' : '#6B7280'}>
        {beat?.isOnBeat ? '🎵' : '♪'}
      </Text>
      <Text color="#9CA3AF"> </Text>
      <Text color="#10B981">
        {signals.slice(0, 2).join(' ')}
      </Text>
      {signals.length > 2 && (
        <Text color="#6B7280"> +{signals.length - 2} more</Text>
      )}
    </Box>
  );
};

export default EnhancedSignalTicker;