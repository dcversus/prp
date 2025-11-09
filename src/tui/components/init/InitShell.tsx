/**
 * ♫ InitShell - Main Init Flow Container Component
 *
 * Init step container with day/night gradient background,
 * breathing animations, responsive layout, and step header
 * following exact PRP-003 specifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useStdout } from 'ink';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

// Props interface for InitShell
export interface InitShellProps {
  title: string;
  stepIndex: number;
  totalSteps: number;
  children: React.ReactNode;
  footerKeys?: string[];
  config?: TUIConfig;
  mode?: 'day' | 'night';
  onBack?: () => void;
  onCancel?: () => void;
}

// Music note states for animation
const MUSIC_NOTES = {
  awaiting: '♪',
  validating: '♬',
  confirmed: '♫'
};

export type MusicNoteState = keyof typeof MUSIC_NOTES;

// Gradient colors for day/night modes
const GRADIENT_COLORS = {
  day: {
    bg1: '#111315',
    bg2: '#1a1f24',
    bg3: '#21262d'
  },
  night: {
    bg1: '#0b0c0d',
    bg2: '#121416',
    bg3: '#171a1d'
  }
};

// Animated Background Component with breathing effect
const AnimatedBackground: React.FC<{
  mode: 'day' | 'night';
  config?: TUIConfig;
}> = ({ mode, config }) => {
  const { stdout } = useStdout();
  const { width = 80, height = 24 } = stdout || {};
  const [alpha, setAlpha] = useState(1.0);
  const [frame, setFrame] = useState(0);

  // Breathing animation - +/- 5% every 2 seconds when idle
  useEffect(() => {
    const interval = setInterval(() => {
      setAlpha(prev => {
        const next = 1.0 + 0.05 * Math.sin(Date.now() / 1000);
        return Math.max(0.8, Math.min(1.2, next));
      });
      setFrame(prev => (prev + 1) % 60);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // TrueColor detection
  const hasTrueColor = process.env.COLORTERM === 'truecolor' ||
    process.env.TERM_PROGRAM?.includes('truecolor') ||
    config?.colors?.accent_orange;

  if (!hasTrueColor || !width || !height) {
    // Fallback to simple background
    return (
      <Box position="absolute" height={height} width={width} flexDirection="column">
        <Box height={height} width={width}>
          <Text color={mode === 'day' ? GRADIENT_COLORS.day.bg2 : GRADIENT_COLORS.night.bg2}>
            {'░'.repeat(width * height)}
          </Text>
        </Box>
      </Box>
    );
  }

  // Create gradient pattern
  const colors = mode === 'day' ? GRADIENT_COLORS.day : GRADIENT_COLORS.night;
  const gradientLines = [];

  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const gradientValue = Math.floor(
      interpolateColor(colors.bg1, colors.bg2, colors.bg3, progress, alpha)
    );

    gradientLines.push(
      <Box key={y} width={width}>
        <Text color={`#${gradientValue.toString(16).padStart(6, '0')}`}>
          {' '.repeat(width)}
        </Text>
      </Box>
    );
  }

  return (
    <Box position="absolute" height={height} width={width} flexDirection="column">
      {gradientLines}
    </Box>
  );
};

// Color interpolation for gradient
function interpolateColor(color1: string, color2: string, color3: string, progress: number, alpha: number): number {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  const c3 = parseInt(color3.slice(1), 16);

  let startColor, endColor;
  if (progress < 0.5) {
    startColor = c1;
    endColor = c2;
    progress = progress * 2;
  } else {
    startColor = c2;
    endColor = c3;
    progress = (progress - 0.5) * 2;
  }

  const r1 = (startColor >> 16) & 0xff;
  const g1 = (startColor >> 8) & 0xff;
  const b1 = startColor & 0xff;

  const r2 = (endColor >> 16) & 0xff;
  const g2 = (endColor >> 8) & 0xff;
  const b2 = endColor & 0xff;

  const r = Math.floor(r1 + (r2 - r1) * progress * alpha);
  const g = Math.floor(g1 + (g2 - g1) * progress * alpha);
  const b = Math.floor(b1 + (b2 - b1) * progress * alpha);

  return (r << 16) | (g << 8) | b;
}

// Step Header with animated music note
const StepHeader: React.FC<{
  icon: MusicNoteState;
  title: string;
  stepIndex: number;
  totalSteps: number;
  config?: TUIConfig;
}> = ({ icon, title, stepIndex, totalSteps, config }) => {
  const [currentNote, setCurrentNote] = useState(0);
  const [animating, setAnimating] = useState(false);
  const notes = Object.values(MUSIC_NOTES);
  const targetNote = notes.indexOf(MUSIC_NOTES[icon]);

  // Animate music note at 4-6 fps
  useEffect(() => {
    if (currentNote !== targetNote) {
      setAnimating(true);
      const interval = setInterval(() => {
        setCurrentNote(prev => {
          const next = (prev + 1) % notes.length;
          if (next === targetNote) {
            clearInterval(interval);
            setAnimating(false);
          }
          return next;
        });
      }, 200); // 5 fps

      return () => clearInterval(interval);
    }
  }, [currentNote, targetNote]);

  const accentColor = config?.colors?.accent_orange || '#FF9A38';

  return (
    <Box flexDirection="column" marginBottom={2}>
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color={accentColor} bold>
          {notes[currentNote]}  {title}
        </Text>
        <Box flexGrow={1} />
        <Text color={config?.colors?.muted || '#666666'}>
          {stepIndex + 1}/{totalSteps}
        </Text>
      </Box>
    </Box>
  );
};

// Bottom input delimiter with keys
const BottomInput: React.FC<{
  keys?: string[];
  context?: string;
  config?: TUIConfig;
}> = ({ keys = [], context, config }) => {
  const { stdout } = useStdout();
  const { width = 80 } = stdout || {};
  const mutedColor = config?.colors?.muted || '#666666';

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box width={width - 4}>
        <Text color={mutedColor}>
          {'─'.repeat(width - 4)}
        </Text>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Box flexDirection="row">
          {keys.map((key, index) => (
            <Text key={index} color={mutedColor} marginRight={2}>
              {key}
            </Text>
          ))}
        </Box>

        {context && (
          <Text color={mutedColor}>
            {context}
          </Text>
        )}
      </Box>

      <Box width={width - 4} marginTop={1}>
        <Text color={mutedColor}>
          {'─'.repeat(width - 4)}
        </Text>
      </Box>
    </Box>
  );
};

// Main InitShell Component
export const InitShell: React.FC<InitShellProps> = ({
  title,
  stepIndex,
  totalSteps,
  children,
  footerKeys = [],
  config,
  mode = 'day',
  onBack,
  onCancel
}) => {
  const [musicState, setMusicState] = useState<MusicNoteState>('awaiting');
  const { stdout } = useStdout();
  const { width = 80, height = 24 } = stdout || {};

  // Determine music state based on step progress
  useEffect(() => {
    if (stepIndex === 0) {
      setMusicState('awaiting');
    } else {
      setMusicState('confirmed');
    }
  }, [stepIndex]);

  // Use full terminal width
  const containerWidth = width;
  const leftMargin = 0;

  return (
    <Box flexDirection="column" height={height} width={width}>
      {/* Simple background */}
      <Box flexGrow={1}>
        <Text backgroundColor="#111315">
          {'\n'.repeat(height)}
        </Text>
      </Box>

      {/* Main content - overlay */}
      <Box
        position="absolute"
        left={leftMargin}
        top={0}
        width={containerWidth}
        height={height}
        flexDirection="column"
      >
        {/* Step header */}
        <StepHeader
          icon={musicState}
          title={title}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          config={config}
        />

        {/* Main content area */}
        <Box flexDirection="column" flexGrow={1} marginBottom={1}>
          {children}
        </Box>

        {/* Bottom input area */}
        <BottomInput
          keys={footerKeys}
          context={`step ${stepIndex + 1}/${totalSteps}`}
          config={config}
        />
      </Box>
    </Box>
  );
};

export default InitShell;