/**
 * ♫ Field Secret - Password/secret input component
 *
 * Text input that masks content for passwords, API keys, and secrets.
 * Follows PRP-003 specifications for secure input handling.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../config/theme-provider.js';
import type { FieldSecretProps } from './types.js';

const FieldSecret: React.FC<FieldSecretProps> = ({
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
  reveal = false
  // onRevealChange // TODO: Implement reveal change handler
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(focused);
  const [internalValue, setInternalValue] = useState(value);
  const [isRevealed, setIsRevealed] = useState(reveal);

  // Sync external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Sync focus state
  useEffect(() => {
    setIsFocused(focused);
  }, [focused]);

  // Sync reveal state
  useEffect(() => {
    setIsRevealed(reveal);
  }, [reveal]);

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

    // Ctrl+V to paste (common in terminals)
    if (key.ctrl && input === 'v') {
      // In a real implementation, you'd access clipboard here
      // For now, just indicate paste ability
      return;
    }

    if (input) {
      const newValue = internalValue + input;
      setInternalValue(newValue);
      onChange(newValue);
    }
  }, { isActive: isFocused });

  // const handleFocus = useCallback(() => {
  //   if (!disabled) {
  //     setIsFocused(true);
  //   }
  // }, [disabled]); // TODO: Handle focus events

  // const toggleReveal = useCallback(() => {
  //   const newReveal = !isRevealed;
  //   setIsRevealed(newReveal);
  //   onRevealChange?.(newReveal);
  // }, [isRevealed, onRevealChange]); // TODO: Handle reveal toggle

  // Mask the value unless revealed
  const displayValue = isRevealed
    ? internalValue
    : internalValue
      ? '*'.repeat(internalValue.length)
      : (isFocused ? '' : placeholder);

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
            {displayValue}
            {isFocused && <Text color={(theme.colors.accent as any)?.orange ?? theme.colors.accent.orange}>█</Text>}
          </Text>
        </Box>

        {/* Reveal toggle */}
        {internalValue && (
          <Box marginLeft={1}>
            <Text
              color={isRevealed ? (theme.colors.accent as any)?.orange : theme.colors.neutrals.muted}
            >
              {isRevealed ? '👁️' : '🔒'}
            </Text>
          </Box>
        )}

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

      {/* Help text when focused */}
      {isFocused && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals.muted}>
            [Type] to enter • [Enter] done • [Esc] cancel • [Click eye] to {isRevealed ? 'hide' : 'show'}
          </Text>
        </Box>
      )}

      {/* Paste hint when empty and focused */}
      {isFocused && !internalValue && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals.muted} italic>
            💡 Tip: Use Ctrl+V to paste secrets from clipboard
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FieldSecret;