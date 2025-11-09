/**
 * ♫ FieldToggle - Toggle switch component
 *
 * Simple on/off toggle with visual feedback,
 * keyboard navigation, and accessibility support
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface FieldToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  config?: TUIConfig;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onValue?: string;
  offValue?: string;
  autoFocus?: boolean;
}

export const FieldToggle: React.FC<FieldToggleProps> = ({
  label,
  value,
  onChange,
  config,
  disabled = false,
  onFocus,
  onBlur,
  onValue = 'ON',
  offValue = 'OFF',
  autoFocus = false
}) => {
  const [focused, setFocused] = useState(autoFocus);

  // Handle toggle
  const handleToggle = useCallback(() => {
    if (disabled) return;
    onChange(!value);
  }, [disabled, value, onChange]);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setFocused(true);
    onFocus?.();
  }, [disabled, onFocus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Keyboard navigation
  useInput((input, key) => {
    if (!focused || disabled) return;

    if (key.return || input === ' ') {
      handleToggle();
    } else if (key.tab) {
      handleBlur();
    } else if (input === 't') {
      handleToggle();
    }
  }, { isActive: !disabled });

  // Auto-focus if requested
  React.useEffect(() => {
    if (autoFocus && !disabled) {
      handleFocus();
    }
  }, [autoFocus, disabled, handleFocus]);

  // Color scheme
  const colors = config?.colors;
  const labelColor = disabled
    ? colors?.gray
    : focused
      ? colors?.accent_orange
      : colors?.muted;

  const toggleColor = disabled
    ? colors?.gray
    : value
      ? colors?.ok || '#00FF00'
      : colors?.muted;

  const toggleBgColor = disabled
    ? undefined
    : value
      ? `${toggleColor}20`
      : undefined;

  const focusColor = focused ? colors?.accent_orange : colors?.muted;

  return (
    <Box flexDirection="row" alignItems="center" marginBottom={1}>
      {/* Label */}
      <Text color={labelColor} bold={focused}>
        {label}
      </Text>

      {/* Spacer */}
      <Box flexGrow={1} />

      {/* Toggle switch */}
      <Box flexDirection="row" alignItems="center">
        <Text color={focusColor} marginRight={1}>
          [
        </Text>

        <Text
          color={toggleColor}
          backgroundColor={toggleBgColor}
          bold={value}
          onClick={handleToggle}
        >
          {value ? onValue : offValue}
        </Text>

        <Text color={focusColor} marginLeft={1}>
          ]
        </Text>

        {/* Status indicator */}
        {focused && (
          <Text color={colors?.accent_orange} marginLeft={1}>
            ◀
          </Text>
        )}
      </Box>

      {/* Status indicators */}
      {focused && (
        <Text color={colors?.muted} dimColor marginLeft={2}>
          [Space/T/Enter] toggle • [Tab] next field
        </Text>
      )}
    </Box>
  );
};

export default FieldToggle;