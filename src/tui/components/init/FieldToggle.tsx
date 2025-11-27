/**
 * ♫ Field Toggle - Toggle switch component
 *
 * Simple on/off toggle with visual feedback and keyboard navigation.
 * Follows PRP-003 specifications for toggle interactions.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

import { useTheme } from '../../config/theme-provider';

import type { FieldToggleProps } from './types';

const FieldToggle: React.FC<FieldToggleProps> = ({
  label,
  value,
  onChange,
  focused = false,
  disabled = false,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(focused);

  // Sync focus state
  useEffect(() => {
    setIsFocused(focused);
  }, [focused]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!isFocused || disabled) {
        return;
      }

      if (key.return || input === ' ') {
        onChange(!value);
        return;
      }

      if (key.escape) {
        setIsFocused(false);
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label with toggle */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <Text color={theme.colors.neutrals.text} bold={isFocused}>
          {label}
        </Text>

        {/* Toggle switch */}
        <Box
          flexDirection="row"
          alignItems="center"
          borderStyle={isFocused ? 'double' : 'single'}
          borderColor={isFocused ? theme.colors.accent.orange : theme.colors.neutrals.muted}
          paddingX={1}
          paddingY={0}
        >
          <Text color={value ? theme.colors.status.ok : theme.colors.neutrals.muted} bold={value}>
            {value ? 'ON' : 'OFF'}
          </Text>
        </Box>
      </Box>

      {/* Help text when focused */}
      {isFocused && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals.muted}>
            [Space/Enter] toggle • [Tab] next field • [Esc] done
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FieldToggle;
