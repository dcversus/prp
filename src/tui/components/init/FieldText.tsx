/**
 * ♫ Field Text - Single line text input component
 *
 * Reusable text input field with validation and focus management.
 * Follows PRP-003 specifications for minimal form interactions.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

import { useTheme } from '../../config/theme-provider';

import type { FieldTextProps } from './types';

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
  focused = false,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(focused);
  const [internalValue, setInternalValue] = useState(value);
  const [cursorPosition, setCursorPosition] = useState(value.length);

  // Sync external value changes
  useEffect(() => {
    setInternalValue(value);
    setCursorPosition(value.length);
  }, [value]);

  // Sync focus state
  useEffect(() => {
    setIsFocused(focused);
  }, [focused]);

  // Handle input
  useInput(
    (input, key) => {
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

      // Handle arrow key navigation
      if (key.leftArrow) {
        setCursorPosition((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPosition((prev) => Math.min(internalValue.length, prev + 1));
        return;
      }

      // Handle Home key (Ctrl+A)
      if (key.ctrl && input === 'a') {
        setCursorPosition(0);
        return;
      }

      // Handle End key (Ctrl+E)
      if (key.ctrl && input === 'e') {
        setCursorPosition(internalValue.length);
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newValue =
            internalValue.slice(0, cursorPosition - 1) + internalValue.slice(cursorPosition);
          setInternalValue(newValue);
          setCursorPosition(cursorPosition - 1);
          onChange(newValue);
        }
        return;
      }

      // Handle regular character input
      if (input) {
        const newValue =
          internalValue.slice(0, cursorPosition) + input + internalValue.slice(cursorPosition);
        setInternalValue(newValue);
        setCursorPosition(cursorPosition + input.length);
        onChange(newValue);
      }
    },
    { isActive: isFocused },
  );

  // Handle mouse focus - click detection for field activation
  const handleFocus = () => {
    if (!disabled) {
      setIsFocused(true);
    }
  };

  // Create display value with cursor at correct position
  const createDisplayValue = () => {
    if (!internalValue && !isFocused) {
      return placeholder;
    }

    if (!isFocused) {
      return internalValue;
    }

    // Show cursor at cursor position when focused
    const beforeCursor = internalValue.slice(0, cursorPosition);
    const afterCursor = internalValue.slice(cursorPosition);
    return (
      <>
        {beforeCursor}
        <Text color={theme.colors.accent?.orange || theme.colors.status.error}>█</Text>
        {afterCursor}
      </>
    );
  };

  const isEmpty = !internalValue && !isFocused;
  const hasError = !!error;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={theme.colors.neutrals?.text || theme.colors.neutrals.white} bold>
          {label}
        </Text>
        {required && <Text color={theme.colors.status?.error || theme.colors.status.error}> *</Text>}
      </Box>

      {/* Input field */}
      <Box flexDirection="row" alignItems="center">
        <Box
          flexDirection="row"
          alignItems="center"
          borderStyle={isFocused ? 'single' : undefined}
          borderColor={
            isFocused
              ? theme.colors.accent?.orange || theme.colors.status.warn
              : hasError
                ? theme.colors.status?.error || theme.colors.status.error
                : undefined
          }
          backgroundColor={
            hasError ? undefined : undefined
          }
          paddingX={1}
          paddingY={0}
          minHeight={1}
          flexGrow={1}
          onClick={handleFocus}
        >
          <Text
            color={
              hasError
                ? theme.colors.status?.error || theme.colors.status.error
                : isEmpty
                  ? theme.colors.neutrals?.muted_hover || theme.colors.neutrals.muted_hover
                  : disabled
                    ? theme.colors.neutrals?.muted_hover || theme.colors.neutrals.muted_hover
                    : theme.colors.neutrals?.text || theme.colors.neutrals.text
            }
            dimColor={isEmpty || disabled}
          >
            {createDisplayValue()}
          </Text>
        </Box>

        {/* Notice */}
        {notice && !isFocused && (
          <Box marginLeft={1}>
            <Text color={theme.colors.neutrals?.muted_hover || theme.colors.neutrals.muted_hover} italic>
              {notice}
            </Text>
          </Box>
        )}
      </Box>

      {/* Error message */}
      {hasError && (
        <Box marginTop={0}>
          <Text color={theme.colors.status?.error || theme.colors.status.error}>{error}</Text>
        </Box>
      )}

      {/* Tip */}
      {tip && !hasError && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals?.muted_hover || theme.colors.neutrals.muted_hover} italic>
            {tip}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FieldText;
