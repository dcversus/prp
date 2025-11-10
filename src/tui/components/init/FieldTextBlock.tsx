/**
 * ♫ Field Text Block - Multi-line text input component
 *
 * Multi-line text input with expandable height and focus management.
 * Follows PRP-003 specifications for prompt and description inputs.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../config/theme-provider.js';
import type { FieldTextBlockProps } from './types.js';

const FieldTextBlock: React.FC<FieldTextBlockProps> = ({
  label,
  value,
  onChange,
  placeholder = '',
  tip = '',
  error = '',
  required = false,
  disabled = false,
  focused = false,
  rows = 3,
  maxLength
}) => {
  const theme = useTheme();
  // const { columns } = useStdoutDimensions(); // TODO: Get terminal dimensions properly
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

  // Handle input with multi-line support
  useInput((input, key) => {
    if (!isFocused || disabled) {
      return;
    }

    if (key.escape) {
      setIsFocused(false);
      return;
    }

    if (key.return && !key.ctrl) {
      // Add new line on Enter (Ctrl+Enter to submit)
      const newValue = internalValue + '\n';
      setInternalValue(newValue);
      setCursorPosition(newValue.length);
      onChange(newValue);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newValue = internalValue.slice(0, cursorPosition - 1) + internalValue.slice(cursorPosition);
        setInternalValue(newValue);
        setCursorPosition(cursorPosition - 1);
        onChange(newValue);
      }
      return;
    }

    // Handle arrow keys for cursor movement
    if (key.upArrow) {
      const lines = internalValue.substring(0, cursorPosition).split('\n');
      if (lines.length > 1) {
        const currentLineIndex = lines.length - 1;
        const prevLineIndex = currentLineIndex - 1;
        const prevLineLength = lines[prevLineIndex]?.length ?? 0;
        const currentColumn = lines[currentLineIndex]?.length ?? 0;
        const newColumn = Math.min(currentColumn, prevLineLength);
        const newPosition = internalValue.substring(0, cursorPosition).lastIndexOf('\n', cursorPosition - 2);
        setCursorPosition(Math.max(0, newPosition + 1 + newColumn));
      }
      return;
    }

    if (key.downArrow) {
      const lines = internalValue.split('\n');
      const beforeCursor = internalValue.substring(0, cursorPosition);
      const currentLineIndex = beforeCursor.split('\n').length - 1;
      const nextLineIndex = currentLineIndex + 1;

      if (nextLineIndex < lines.length) {
        const currentColumn = beforeCursor.split('\n').pop()?.length ?? 0;
        const nextLineLength = lines[nextLineIndex]?.length ?? 0;
        const newColumn = Math.min(currentColumn, nextLineLength);
        const newPosition = internalValue.indexOf('\n', cursorPosition);
        if (newPosition !== -1) {
          const endOfNextLine = internalValue.indexOf('\n', newPosition + 1);
          const lineEnd = endOfNextLine === -1 ? internalValue.length : endOfNextLine;
          setCursorPosition(Math.min(newPosition + 1 + newColumn, lineEnd));
        }
      }
      return;
    }

    if (key.leftArrow && cursorPosition > 0) {
      setCursorPosition(cursorPosition - 1);
      return;
    }

    if (key.rightArrow && cursorPosition < internalValue.length) {
      setCursorPosition(cursorPosition + 1);
      return;
    }

    if (input && (!maxLength || internalValue.length < maxLength)) {
      const newValue = internalValue.slice(0, cursorPosition) + input + internalValue.slice(cursorPosition);
      setInternalValue(newValue);
      setCursorPosition(cursorPosition + input.length);
      onChange(newValue);
    }
  }, { isActive: isFocused });

  // Display text with cursor
  const displayText = internalValue || (isFocused ? '' : placeholder);
  const isEmpty = !internalValue && !isFocused;
  const hasError = !!error;

  // Calculate visible rows (expand when focused)
  const visibleRows = isFocused ? Math.max(rows, 6) : Math.min(rows, 3);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={theme.colors.neutrals.text} bold>
          {label}
        </Text>
        {required && (
          <Text color={theme.colors.status.error}> *</Text>
        )}
      </Box>

      {/* Input field */}
      <Box
        flexDirection="column"
        borderStyle={hasError ? 'double' : 'single'}
        borderColor={
          hasError
            ? theme.colors.status.error
            : isFocused
              ? theme.colors.accent.orange
              : theme.colors.neutrals.muted
        }
        paddingX={1}
        paddingY={0}
        height={visibleRows}
      >
        {displayText.split('\n').map((line, lineIndex) => (
          <Box key={lineIndex} flexDirection="row">
            <Text
              color={
                hasError
                  ? theme.colors.status.error
                  : isEmpty
                    ? theme.colors.neutrals.muted
                    : disabled
                      ? theme.colors.neutrals.muted
                      : theme.colors.neutrals.text
              }
              dimColor={isEmpty || disabled}
            >
              {line}
            </Text>
            {isFocused && lineIndex === displayText.split('\n').length - 1 && (
              <Text color={theme.colors.accent.orange}>█</Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Character count */}
      {maxLength && (
        <Box flexDirection="row" justifyContent="flex-end" marginTop={0}>
          <Text
            color={
              internalValue.length > maxLength
                ? theme.colors.status.error
                : theme.colors.neutrals.muted
            }
          >
            {internalValue.length}/{maxLength}
          </Text>
        </Box>
      )}

      {/* Error message */}
      {hasError && (
        <Box marginTop={0}>
          <Text color={theme.colors.status.error}>
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

      {/* Help text when focused */}
      {isFocused && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals.muted}>
            [Enter] new line • [Esc] done • [↑↓] navigate • [Space] toggle multiline
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FieldTextBlock;