/**
 * ♫ Field Text - Single line text input component
 *
 * Reusable text input field with validation and focus management.
 * Follows PRP-003 specifications for minimal form interactions.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../config/theme-provider.js';
import type { FieldTextProps } from './types.js';

const FieldText: React.FC<FieldTextProps> = ({
  label,
  value,
  onChange,
  placeholder = '',
  notice = '',
  tip = '',
  error = '',
  required = false,
  disabled = false,
  focused = false
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(focused);
  const [internalValue, setInternalValue] = useState(value);

  // Sync external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Sync focus state
  useEffect(() => {
    setIsFocused(focused);
  }, [focused]);

  // Handle input
  useInput((input, key) => {
    if (!isFocused || disabled) {
      return;
    }

    if (key.escape) {
      setIsFocused(false);
      return;
    }

    if (key.return) {
      setIsFocused(false);
      return;
    }

    if (key.backspace || key.delete) {
      const newValue = internalValue.slice(0, -1);
      setInternalValue(newValue);
      onChange(newValue);
      return;
    }

    if (input) {
      const newValue = internalValue + input;
      setInternalValue(newValue);
      onChange(newValue);
    }
  }, { isActive: isFocused });

  // const handleFocus = () => {
  //   if (!disabled) {
  //     setIsFocused(true);
  //   }
  // }; // TODO: Handle focus events

  const displayValue = internalValue || (isFocused ? '' : placeholder);
  const isEmpty = !internalValue && !isFocused;
  const hasError = !!error;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={theme.colors.neutrals.text} bold>
          {label}
        </Text>
        {required && (
          <Text color={(theme.colors.status as any)?.error ?? theme.colors.status.error}> *</Text>
        )}
      </Box>

      {/* Input field */}
      <Box flexDirection="row" alignItems="center">
        <Box
          flexDirection="row"
          paddingX={1}
          paddingY={0}
          flexGrow={1}
        >
          <Text
            color={
              hasError
                ? (theme.colors.status as any)?.error ?? theme.colors.status.error
                : isEmpty
                  ? theme.colors.neutrals.muted
                  : disabled
                    ? theme.colors.neutrals.muted
                    : theme.colors.neutrals.text
            }
            dimColor={isEmpty || disabled}
          >
            {isFocused && !internalValue ? '' : displayValue}
            {isFocused && <Text color={(theme.colors.accent as any)?.orange ?? theme.colors.accent.orange}>█</Text>}
          </Text>
        </Box>

        {/* Notice */}
        {notice && !isFocused && (
          <Box marginLeft={1}>
            <Text color={theme.colors.neutrals.muted} italic>
              {notice}
            </Text>
          </Box>
        )}
      </Box>

      {/* Error message */}
      {hasError && (
        <Box marginTop={0}>
          <Text color={(theme.colors.status as any)?.error ?? theme.colors.status.error}>
            {error}
          </Text>
        </Box>
      )}

      {/* Tip */}
      {tip && !hasError && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals.muted} italic>
            {tip}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FieldText;