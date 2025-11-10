/**
 * ♫ WizardShell - Enhanced PRP Wizard Container
 *
 * Asymmetric center-left layout with radial gradient background and breathing animation.
 * Enhanced with PRP-000-agents05.md specifications for day/night detection and TrueColor support.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../config/theme-provider.js';
import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import type { InitShellProps } from './types.js';

// Music note states for animation
const MUSIC_NOTES = {
  awaiting: '♪',
  validating: '♬',
  confirmed: '♫',
  error: '⚠'
} as const;

export type MusicNoteState = keyof typeof MUSIC_NOTES;

// Step Header component removed - unused

// Bottom input delimiter with keys
const BottomInput: React.FC<{
  keys?: string[];
  onCancel?: () => void;
}> = ({ keys = [], onCancel }) => {
  const theme = useTheme();
  const { width } = useTerminalDimensions();

  return (
    <Box flexDirection="column" marginTop={2}>
      <Text color={theme.colors.neutrals.muted}>
        {'─'.repeat(Math.min(width - 10, 100))}
      </Text>
      <Box flexDirection="row" justifyContent="space-between" marginTop={0} paddingX={1}>
        <Box flexGrow={1}>
          {onCancel && (
            <Text color={(theme.colors as any).textDim ?? (theme.colors as any).muted}>
              cancel (Esc)
            </Text>
          )}
        </Box>
        <Box flexDirection="row" gap={2}>
          {keys.map((key, index) => (
            <Text key={index} color={theme.colors.neutrals.text}>
              {key}
            </Text>
          ))}
        </Box>
      </Box>
      <Text color={theme.colors.neutrals.muted}>
        {'─'.repeat(Math.min(width - 10, 100))}
      </Text>
    </Box>
  );
};

// Main WizardShell Component (Enhanced InitShell)
const WizardShell: React.FC<InitShellProps> = ({
  stepIndex,
  totalSteps,
  title,
  icon,
  children,
  footerKeys,
  onCancel
}) => {
  const theme = useTheme();
  const { width, height } = useTerminalDimensions();

  // TrueColor detection and day/night mode detection
  const [trueColorSupported, setTrueColorSupported] = useState(false);
  const [isDayMode, setIsDayMode] = useState(true);

  // Detect TrueColor support and day/night mode
  useEffect(() => {
    // Check for TrueColor support via environment variables
    const colorterm = process.env.COLORTERM?.toLowerCase();
    const term = process.env.TERM?.toLowerCase();

    const hasTrueColor = colorterm?.includes('truecolor') ||
                       colorterm?.includes('24bit') ||
                       term?.includes('24bit') ||
                       process.env.TMUX !== undefined; // tmux often supports TrueColor

    setTrueColorSupported(hasTrueColor);

    // Detect day/night mode based on time (6am-6pm = day)
    const hour = new Date().getHours();
    setIsDayMode(hour >= 6 && hour < 18);
  }, []);

  // Animated background with breathing effect
  // const [bgAlpha, setBgAlpha] = useState(0.95); // Unused for now

  // Breathing animation for idle background (5% amplitude, 4s period) - Disabled
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const time = Date.now() / 4000; // 4 second period from PRP spec
  //     const breathing = Math.sin(time * Math.PI * 2) * 0.05; // 5% amplitude
  //     setBgAlpha(0.95 + breathing);
  //   }, 50);

  //   return () => clearInterval(interval);
  // }, []);

  // Get gradient colors based on day/night mode and TrueColor support
  const getGradientColors = () => {
    if (isDayMode) {
      return {
        bg1: '#111315',  // Day bg1
        bg2: '#1a1f24',  // Day bg2
        bg3: '#21262d'  // Day bg3
      };
    } else {
      return {
        bg1: '#0b0c0d',  // Night bg1
        bg2: '#121416',  // Night bg2
        bg3: '#171a1d'  // Night bg3
      };
    }
  };

  const gradientColors = getGradientColors();

  // Calculate layout - asymmetric center-left
  // const containerWidth = width < 160
  //   ? Math.min(width - 8, 80)   // Compact: use most of width but with margin
  //   : Math.min(width - 20, 120); // Standard/Wide: fixed max width // Unused

  // const leftMargin = width < 160 ? 4 : Math.floor((width - containerWidth) * 0.3); // Unused
  // const topMargin = Math.max(2, Math.floor(height * 0.1)); // Unused

  // Create radial gradient background
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

    // Create radial gradient effect using character density
    const gradientRows = [];
    // const centerX = width / 2; // Unused
    // const centerY = height / 2; // Unused
    // const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY); // Unused

    for (let y = 0; y < height; y++) {
      let rowText = '';
      for (let x = 0; x < width; x++) {
        // Simplified gradient background - just fill with spaces
        rowText += ' ';
      }

      // Apply background color to the entire row
      gradientRows.push(
        <Text key={y} backgroundColor={gradientColors.bg1} color={gradientColors.bg1}>
          {rowText}
        </Text>
      );
    }

    return <Box flexDirection="column">{gradientRows}</Box>;
  };

  return (
    <Box flexDirection="column" height={height} width={width}>
      {/* Radial gradient background */}
      {renderRadialGradient()}

      {/* Main content container */}
      <Box
        flexDirection="column"
        flexGrow={1}
      >
        {/* Header with music icon */}
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row" alignItems="center">
            <Text
              color={icon === '⚠' ? (theme.colors as any).warn ?? (theme.colors as any).error : (theme.colors as any).accentOrange ?? (theme.colors as any).orange}
              bold={icon !== '⚠'}
            >
              {icon} {title}
            </Text>
          </Box>
          <Text color={theme.colors.neutrals.muted}>
            {stepIndex + 1}/{totalSteps}
          </Text>
        </Box>

        {/* Content area - single scroll column */}
        <Box flexGrow={1} flexDirection="column" justifyContent="center">
          {children}
        </Box>

        {/* Bottom input with delimiters */}
        <BottomInput keys={footerKeys} onCancel={onCancel} />
      </Box>
    </Box>
  );
};

export default WizardShell;
export { WizardShell };
// Maintain backward compatibility
export { WizardShell as InitShell };