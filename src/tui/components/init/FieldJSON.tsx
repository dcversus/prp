/**
 * ♫ Field JSON - JSON input component
 *
 * Text input with JSON validation and visual feedback.
 * Follows PRP-003 specifications for JSON field interactions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../config/theme-provider.js';
import type { FieldJSONProps } from './types.js';

const FieldJSON: React.FC<FieldJSONProps> = ({
  label,
  text,
  onChange,
  placeholder = '',
  focused = false
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(focused);
  const [internalText, setInternalText] = useState(text);
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Sync external text changes
  useEffect(() => {
    setInternalText(text);
    validateJSON(text);
  }, [text]);

  // Sync focus state
  useEffect(() => {
    setIsFocused(focused);
  }, [focused]);

  // Validate JSON
  const validateJSON = useCallback((jsonText: string) => {
    if (!jsonText.trim()) {
      setIsValid(true);
      setValidationError('');
      return true;
    }

    try {
      JSON.parse(jsonText);
      setIsValid(true);
      setValidationError('');
      return true;
    } catch (error) {
      setIsValid(false);
      setValidationError(error instanceof Error ? error.message : 'Invalid JSON');
      return false;
    }
  }, []);

  // Handle input
  useInput((input, key) => {
    if (!isFocused) {
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
      const newText = internalText.slice(0, -1);
      setInternalText(newText);
      onChange(newText);
      validateJSON(newText);
      return;
    }

    if (input) {
      const newText = internalText + input;
      setInternalText(newText);
      onChange(newText);
      validateJSON(newText);
    }
  }, { isActive: isFocused });

  // const handleFocus = useCallback(() => {
  //   setIsFocused(true);
  // }, []); // TODO: Handle focus events

  const displayText = internalText || (isFocused ? '' : placeholder);
  const isEmpty = !internalText && !isFocused;
  const hasError = !isValid && internalText.length > 0;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label with validation indicator */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={theme.colors.neutrals.text} bold>
          {label}
        </Text>

        {/* Validation indicator */}
        {internalText.length > 0 && (
          <Box marginLeft={1}>
            <Text color={isValid ? (theme.colors.status as any)?.ok : (theme.colors.status as any)?.error}>
              {isValid ? '✓' : '✗'}
            </Text>
          </Box>
        )}
      </Box>

      {/* Input field */}
      <Box flexDirection="row" alignItems="flex-start">
        <Box
          flexDirection="column"
          paddingX={1}
          paddingY={0}
          flexGrow={1}
          minHeight={3}
        >
          {/* Multi-line display */}
          {displayText.split('\n').map((line, index) => (
            <Text
              key={index}
              color={
                hasError
                  ? (theme.colors.status as any)?.error ?? theme.colors.status.error
                  : isEmpty
                    ? theme.colors.neutrals.muted
                    : theme.colors.neutrals.text
              }
              dimColor={isEmpty}
            >
              {line || ' '}
              {isFocused && index === displayText.split('\n').length - 1 && (
                <Text color={(theme.colors.accent as any)?.orange ?? theme.colors.accent.orange}>█</Text>
              )}
            </Text>
          ))}
        </Box>
      </Box>

      {/* Validation feedback */}
      {hasError && (
        <Box marginTop={0}>
          <Text color={(theme.colors.status as any)?.error ?? theme.colors.status.error}>
            {validationError}
          </Text>
        </Box>
      )}

      {/* Success feedback */}
      {isValid && internalText.length > 0 && (
        <Box marginTop={0}>
          <Text color={(theme.colors.status as any)?.ok ?? theme.colors.status.ok} italic>
            Valid JSON
          </Text>
        </Box>
      )}

      {/* Help text when focused */}
      {isFocused && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals.muted}>
            [Enter] done • [Esc] cancel • [D] see raw JSON
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FieldJSON;