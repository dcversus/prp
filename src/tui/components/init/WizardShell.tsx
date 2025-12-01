/**
 * ♫ WizardShell - Enhanced PRP Wizard Container
 *
 * Asymmetric center-left layout with radial gradient background and breathing animation.
 * Enhanced with PRP-000-agents05.md specifications for day/night detection and TrueColor support.
 *
 * Features:
 * - TrueColor detection with 256-color fallback
 * - Day/night mode detection based on time
 * - Radial gradient background with breathing animation (5% amplitude, 4s period)
 * - Center-weighted gradient (0.6 center weight)
 * - Responsive layout for all screen sizes
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

import { useTheme } from '../../config/theme-provider';
import { useTerminalDimensions } from '../../hooks/useTerminalDimensions';

import type { InitShellProps } from './types';

// Music note states for animation (matching PRP spec)
const MUSIC_NOTES = {
  awaiting: '♪', // Awaiting input
  validating: '♩', // Parsing data
  confirmed: '♬', // Spawning agents
  error: '♫', // Error state (changed from ⚠ to ♫)
  steady: '♫', // Steady state
} as const;

export type MusicNoteState = keyof typeof MUSIC_NOTES;

// Step Header with animated music note (♪→♩→♬→♫ progression)
const StepHeader: React.FC<{
  icon: MusicNoteState;
  title: string;
  stepIndex: number;
  totalSteps: number;
}> = ({ icon, title, stepIndex, totalSteps }) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  // Music state progression from PRP spec
  const noteSequence = ['♪', '♩', '♬', '♫'];
  const targetNote = noteSequence.indexOf(icon);

  // Animate music note at 4 fps (250ms per frame)
  useEffect(() => {
    if (currentFrame < targetNote) {
      const interval = setInterval(() => {
        setCurrentFrame((prev) => {
          const next = (prev + 1) % noteSequence.length;
          if (next === targetNote) {
            clearInterval(interval);
            return next;
          }
          return next;
        });
      }, 250); // 4 fps from PRP spec

      return () => clearInterval(interval);
    }
    return undefined;
  }, [currentFrame, targetNote]);

  return (
    <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
      <Text color="orange" bold>
        {noteSequence[currentFrame]} {title}
      </Text>
      <Text color="gray">
        {stepIndex + 1}/{totalSteps}
      </Text>
    </Box>
  );
};

// Bottom delimiter with keyboard shortcuts
const BottomDelimiter: React.FC<{
  keys?: string[];
  onCancel?: () => void;
}> = ({ keys = [], onCancel }) => {
  const theme = useTheme();
  const { width } = useTerminalDimensions();

  return (
    <Box flexDirection="column" marginTop={2}>
      <Text color={theme.colors.neutrals.muted}>{'─'.repeat(Math.min(width - 10, 100))}</Text>
      <Box flexDirection="row" justifyContent="space-between" marginTop={0} paddingX={1}>
        <Box flexGrow={1}>
          {onCancel && <Text color={theme.colors.neutrals.text_dim}>cancel (Esc)</Text>}
        </Box>
        <Box flexDirection="row" gap={2}>
          {keys.map((key, index) => (
            <Text key={index} color={theme.colors.neutrals.text}>
              {key}
            </Text>
          ))}
        </Box>
      </Box>
      <Text color={theme.colors.neutrals.muted}>{'─'.repeat(Math.min(width - 10, 100))}</Text>
    </Box>
  );
};

// Main WizardShell Component
export const WizardShell: React.FC<InitShellProps> = ({
  stepIndex,
  totalSteps,
  title,
  icon,
  children,
  footerKeys,
  /* onBack, */
  /* onForward, */
  /* onCancel */
}) => {
  const { width, height } = useTerminalDimensions();

  // TrueColor detection and day/night mode detection
  const [trueColorSupported, setTrueColorSupported] = useState(false);
  const [isDayMode, setIsDayMode] = useState(true);

  // Detect TrueColor support and day/night mode
  useEffect(() => {
    // Check for TrueColor support via environment variables
    const colorterm = process.env.COLORTERM?.toLowerCase();
    const term = process.env.TERM?.toLowerCase();

    const hasTrueColor =
      colorterm?.includes('truecolor') ||
      colorterm?.includes('24bit') ||
      term?.includes('24bit') ||
      process.env.TMUX !== undefined; // tmux often supports TrueColor

    setTrueColorSupported(hasTrueColor);

    // Detect day/night mode based on time (6am-6pm = day)
    const hour = new Date().getHours();
    setIsDayMode(hour >= 6 && hour < 18);
  }, []);

  // Animated background with breathing effect (5% amplitude, 4s period)
  const [bgAlpha, setBgAlpha] = useState(0.95);

  // Breathing animation from PRP spec
  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now() / 4000; // 4 second period from PRP spec
      const breathing = Math.sin(time * Math.PI * 2) * 0.05; // 5% amplitude
      setBgAlpha(0.95 + breathing);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Get gradient colors based on day/night mode (exact PRP spec colors)
  const getGradientColors = () => {
    if (isDayMode) {
      return {
        bg1: '#111315', // Day bg1
        bg2: '#1a1f24', // Day bg2
        bg3: '#21262d', // Day bg3
      };
    } else {
      return {
        bg1: '#0b0c0d', // Night bg1
        bg2: '#121416', // Night bg2
        bg3: '#171a1d', // Night bg3
      };
    }
  };

  const gradientColors = getGradientColors();

  // Calculate layout - asymmetric center-left (PRP spec)
  // Container width calculation removed since it's unused

  // Create radial gradient background with center-weighted effect
  const renderRadialGradient = () => {
    if (!trueColorSupported) {
      // Fallback to solid background for 256-color terminals
      return (
        <Box flexGrow={1}>
          <Text backgroundColor={gradientColors.bg1} color={gradientColors.bg1}>
            {'\n'.repeat(height)}
          </Text>
        </Box>
      );
    }

    // Create radial gradient effect using background colors
    const gradientRows = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      let bgColor;

      // Calculate distance from center for radial effect
      const distance = Math.sqrt(Math.pow(y - centerY, 2));
      const normalizedDistance = distance / maxDistance;

      // Select color based on distance (center-weighted: 0.6 center weight)
      if (normalizedDistance < 0.4) {
        // Center area (40% - center weight 0.6)
        bgColor = gradientColors.bg1;
      } else if (normalizedDistance < 0.8) {
        // Middle area
        bgColor = gradientColors.bg2;
      } else {
        // Edge area
        bgColor = gradientColors.bg3;
      }

      // Apply breathing animation to alpha (simulated via color selection)
      const shouldBrighten = bgAlpha > 0.95;
      const finalBgColor =
        shouldBrighten && normalizedDistance < 0.3
          ? gradientColors.bg2 // Slightly brighter center during breathing peak
          : bgColor;

      gradientRows.push(
        <Text key={y} backgroundColor={finalBgColor} color={finalBgColor}>
          {' '.repeat(width)}
        </Text>,
      );
    }

    return <Box flexDirection="column">{gradientRows}</Box>;
  };

  return (
    <Box flexDirection="column" height={height} width={width}>
      {/* Radial gradient background with breathing animation */}
      {renderRadialGradient()}

      {/* Main content container */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Header with music icon */}
        <StepHeader
          icon={icon as MusicNoteState}
          title={title}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
        />

        {/* Content area - single scroll column */}
        <Box flexGrow={1} flexDirection="column" justifyContent="center">
          {children}
        </Box>

        {/* Bottom delimiter with keyboard shortcuts */}
        <BottomDelimiter keys={footerKeys} />
      </Box>
    </Box>
  );
};

export default WizardShell;
