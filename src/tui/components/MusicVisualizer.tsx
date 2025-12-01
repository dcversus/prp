/**
 * ♫ Enhanced Music Visualizer Component
 *
 * Real-time music visualization for agent monitoring with:
 * - Beat-synchronized visual feedback
 * - Signal pattern visualization
 * - Classical music themed displays
 * - Performance-optimized rendering
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';

import { useAnimationEngine } from '../animation/AnimationEngine';

import type { JSX } from 'react';

interface MusicVisualizerProps {
  width?: number;
  height?: number;
  showBeatIndicator?: boolean;
  showSignalPattern?: boolean;
  showClassicalTheme?: boolean;
  compact?: boolean;
}

interface BeatIndicatorProps {
  beat: number;
  isActive: boolean;
  bpm: number;
}

interface SignalPatternProps {
  signal: string;
  intensity: number;
  position: number;
}

/**
 * Beat indicator showing current tempo and timing
 */
const BeatIndicator = ({ beat, isActive, bpm }: BeatIndicatorProps): JSX.Element => {
  const beatSymbols = ['♩', '♪', '♫', '♬'];
  const currentSymbol = beatSymbols[beat % beatSymbols.length];

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={isActive ? '#10B981' : '#6B7280'} bold={isActive}>
        {currentSymbol}
      </Text>
      <Text color="#9CA3AF">
        {' '}
        {bpm} BPM
      </Text>
    </Box>
  );
};

/**
 * Signal pattern visualization with wave effects
 */
const SignalPattern = ({ signal, intensity, position }: SignalPatternProps): JSX.Element => {
  const createWavePattern = (): string[] => {
    const chars = signal.split('');
    const pattern: string[] = [];

    for (let i = 0; i < chars.length; i++) {
      const distance = Math.abs(i - position);
      const brightness = Math.max(0, 1 - distance * 0.3);
      const enhancedIntensity = intensity * brightness;

      if (enhancedIntensity > 0.8) {
        pattern.push(`\x1b[1;37m${chars[i]}\x1b[0m`); // Bright white
      } else if (enhancedIntensity > 0.6) {
        pattern.push(`\x1b[1;36m${chars[i]}\x1b[0m`); // Bright cyan
      } else if (enhancedIntensity > 0.4) {
        pattern.push(`\x1b[0;36m${chars[i]}\x1b[0m`); // Cyan
      } else if (enhancedIntensity > 0.2) {
        pattern.push(`\x1b[0;90m${chars[i]}\x1b[0m`); // Dim gray
      } else {
        pattern.push(chars[i]); // Normal
      }
    }

    return pattern;
  };

  return (
    <Text>
      {createWavePattern().join('')}
    </Text>
  );
};

/**
 * Classical music theme display
 */
const ClassicalTheme = ({ melody, currentBeat }: { melody: string; currentBeat: number }): JSX.Element => {
  const classicalInfo: Record<string, { composer: string; key: string; period: string }> = {
    'MOZART_SONATA': { composer: 'Mozart', key: 'C Major', period: 'Classical' },
    'BEETHOVEN_ODE': { composer: 'Beethoven', key: 'D Minor', period: 'Romantic' },
    'BACH_FUGUE': { composer: 'J.S. Bach', key: 'G Minor', period: 'Baroque' },
    'VIVALDI_SPRING': { composer: 'Vivaldi', key: 'E Major', period: 'Baroque' },
    'DEBUSSY_CLAIR': { composer: 'Debussy', key: 'D♭ Major', period: 'Impressionist' },
    'STAR_WARS': { composer: 'Williams', key: 'B♭ Major', period: 'Modern' },
    'MISSION_IMPOSSIBLE': { composer: 'Schifrin', key: 'D Minor', period: 'Modern' },
  };

  const info = classicalInfo[melody] || { composer: 'Unknown', key: 'C', period: 'Unknown' };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="#10B981" bold>
          🎼 {info.composer} - {melody.replace('_', ' ')}
        </Text>
        <Text color="#9CA3AF">
          {info.key} • {info.period}
        </Text>
      </Box>
      <Box flexDirection="row" alignItems="center">
        <Text color="#6B7280">
          Beat: {'●'.repeat(Math.min(currentBeat % 4 + 1, 4))}{'○'.repeat(Math.max(4 - (currentBeat % 4 + 1), 0))}
        </Text>
      </Box>
    </Box>
  );
};

/**
 * Frequency spectrum visualizer
 */
const FrequencySpectrum = ({ bars = 8, width = 40 }: { bars?: number; width?: number }): JSX.Element => {
  const [frequencies, setFrequencies] = useState<number[]>(new Array(bars).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setFrequencies(prev =>
        prev.map(() => Math.random() * 10)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [bars]);

  const barWidth = Math.floor(width / bars);
  const createBar = (height: number): string => {
    const barHeight = Math.max(1, Math.floor(height / 2));
    const blocks = ['█', '▓', '▒', '░', ' '];
    return blocks[Math.min(barHeight, blocks.length - 1)];
  };

  return (
    <Box flexDirection="row" alignItems="flex-end">
      {frequencies.map((freq, i) => (
        <Text key={i} color={freq > 7 ? '#10B981' : freq > 4 ? '#F59E0B' : '#6B7280'}>
          {createBar(freq)}
        </Text>
      ))}
    </Box>
  );
};

/**
 * Main Music Visualizer Component
 */
export const MusicVisualizer = ({
  width = 60,
  height = 8,
  showBeatIndicator = true,
  showSignalPattern = true,
  showClassicalTheme = true,
  compact = false,
}: MusicVisualizerProps): JSX.Element => {
  const { engine, getCurrentBeat, loadMelody } = useAnimationEngine();
  const [currentSignal, setCurrentSignal] = useState<string>('[dp]');
  const [wavePosition, setWavePosition] = useState(0);
  const [classicalMelody, setClassicalMelody] = useState('MOZART_SONATA');

  // Initialize melody from melody.json
  useEffect(() => {
    try {
      const melodyData = require('../../../melody.json');
      if (melodyData?.metadata?.classical?.length > 0) {
        const randomMelody = melodyData.metadata.classical[
          Math.floor(Math.random() * melodyData.metadata.classical.length)
        ];
        setClassicalMelody(randomMelody);

        // Create a simple melody configuration
        loadMelody({
          name: randomMelody,
          composer: 'Various',
          bpm: 120,
          steps: [1, 0, 1, 0, 1, 1, 0, 1], // Simple 8-step pattern
          duration: 4000,
        });
      }
    } catch (error) {
      // Fallback if melody.json is not available
      loadMelody({
        name: 'Default',
        composer: 'System',
        bpm: 120,
        steps: [1, 0, 1, 0, 1, 1, 0, 1],
        duration: 4000,
      });
    }
  }, [loadMelody]);

  // Update wave animation
  useEffect(() => {
    const interval = setInterval(() => {
      setWavePosition(prev => (prev + 1) % currentSignal.length);
    }, 200);

    return () => clearInterval(interval);
  }, [currentSignal]);

  // Simulate signal changes
  useEffect(() => {
    const signals = ['[dp]', '[tw]', '[bf]', '[cq]', '[tg]', '[rv]', '[mg]', '[aa]'];
    const interval = setInterval(() => {
      setCurrentSignal(signals[Math.floor(Math.random() * signals.length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const beat = getCurrentBeat();

  if (compact) {
    return (
      <Box flexDirection="row" alignItems="center">
        <Text color="#10B981">♪</Text>
        <Text color="#9CA3AF"> </Text>
        {showBeatIndicator && beat && (
          <BeatIndicator beat={beat.index} isActive={beat.isOnBeat} bpm={120} />
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color="#10B981" bold>
          🎵 Music Visualizer
        </Text>
        {showBeatIndicator && beat && (
          <BeatIndicator beat={beat.index} isActive={beat.isOnBeat} bpm={120} />
        )}
      </Box>

      {/* Classical Theme Display */}
      {showClassicalTheme && (
        <ClassicalTheme melody={classicalMelody} currentBeat={beat?.index ?? 0} />
      )}

      {/* Signal Pattern Visualization */}
      {showSignalPattern && (
        <Box flexDirection="row" justifyContent="center" marginBottom={1}>
          <SignalPattern
            signal={currentSignal}
            intensity={beat?.isOnBeat ? 1.0 : 0.3}
            position={wavePosition}
          />
        </Box>
      )}

      {/* Frequency Spectrum */}
      <Box flexDirection="row" justifyContent="center">
        <FrequencySpectrum bars={12} width={width - 10} />
      </Box>

      {/* Music Status Line */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Text color="#6B7280" dimColor>
          Signal: {currentSignal}
        </Text>
        <Text color="#6B7280" dimColor>
          {beat?.isOnBeat ? '🎵 ON BEAT' : '♪ off beat'}
        </Text>
      </Box>
    </Box>
  );
};

/**
 * Compact music indicator for use in headers and status bars
 */
export const CompactMusicIndicator = ({
  active = false,
  signal = '[dp]'
}: {
  active?: boolean;
  signal?: string;
}): JSX.Element => {
  const { getCurrentBeat } = useAnimationEngine();
  const beat = getCurrentBeat();

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={active ? '#10B981' : '#6B7280'} bold={active}>
        {beat?.isOnBeat ? '🎵' : '♪'}
      </Text>
      <Text color="#9CA3AF">
        {' '}{signal}
      </Text>
    </Box>
  );
};

/**
 * Music-themed status bar component
 */
export const MusicStatusBar = ({
  activeSignals,
  currentMelody,
  bpm = 120
}: {
  activeSignals: string[];
  currentMelody?: string;
  bpm?: number;
}): JSX.Element => {
  const { getCurrentBeat } = useAnimationEngine();
  const beat = getCurrentBeat();

  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Box flexDirection="row" alignItems="center">
        <Text color={beat?.isOnBeat ? '#10B981' : '#6B7280'}>
          {beat?.isOnBeat ? '🎵' : '♪'} {beat?.index ?? 0}/{beat?.nextBeat ?? 8}
        </Text>
        <Text color="#9CA3AF"> • </Text>
        <Text color="#9CA3AF">
          {bpm} BPM
        </Text>
      </Box>

      <Box flexDirection="row" alignItems="center">
        {currentMelody && (
          <>
            <Text color="#6B7280">
              🎼 {currentMelody.replace('_', ' ')}
            </Text>
            <Text color="#9CA3AF"> • </Text>
          </>
        )}
        <Text color="#9CA3AF">
          Signals: {activeSignals.length}
        </Text>
        {activeSignals.length > 0 && (
          <>
            <Text color="#9CA3AF"> (</Text>
            <Text color="#10B981">
              {activeSignals.slice(0, 3).join(', ')}
              {activeSignals.length > 3 ? '...' : ''}
            </Text>
            <Text color="#9CA3AF">)</Text>
          </>
        )}
      </Box>
    </Box>
  );
};

export default MusicVisualizer;