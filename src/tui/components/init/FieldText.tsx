/**
 * ♫ FieldText - Single-line text input component
 *
 * Single-line text input with focus management,
 * validation feedback, and visual styling following PRP-003 specs
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface FieldTextProps {
  label: string;
  value: string;
  placeholder?: string;
  notice?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  config?: TUIConfig;
  disabled?: boolean;
  validate?: (value: string) => string | null; // Returns error message or null
  mask?: (value: string) => string; // For masking (e.g., passwords)
  width?: number;
  autoFocus?: boolean;
}

export const FieldText: React.FC<FieldTextProps> = ({
  label,
  value,
  placeholder = '',
  notice,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  config,
  disabled = false,
  validate,
  mask,
  width,
  autoFocus = false
}) => {
  const { stdout } = useStdout();
  const { columns = 80 } = stdout || {};
  const dynamicWidth = width || Math.min(80, columns - 20);

  const [focused, setFocused] = useState(autoFocus);
  const [error, setError] = useState<string | null>(null);
  const internalRef = useRef<any>(null);

  // Handle focus changes
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setFocused(true);
    onFocus?.();
  }, [disabled, onFocus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();

    // Validate on blur if validator provided
    if (validate) {
      const validationError = validate(value);
      setError(validationError);
    }
  }, [validate, value, onBlur]);

  // Handle value changes
  const handleChange = useCallback((newValue: string) => {
    if (disabled) return;

    onChange(newValue);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  }, [disabled, onChange, error]);

  // Handle submission
  const handleSubmit = useCallback(() => {
    if (disabled) return;

    // Validate before submission
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onSubmit?.();
  }, [disabled, validate, value, onSubmit]);

  // Keyboard navigation
  useInput((input, key) => {
    if (key.return && focused) {
      handleSubmit();
    } else if (key.tab) {
      handleBlur();
    } else if (!focused && !disabled) {
      handleFocus();
    }
  }, [focused, disabled, handleSubmit, handleBlur, handleFocus]);

  // Auto-focus if requested
  useEffect(() => {
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

  const inputColor = disabled
    ? colors?.gray
    : focused
      ? colors?.base_fg
      : colors?.muted;

  const errorColor = colors?.error;
  const noticeColor = colors?.muted;

  // Display value (masked if mask function provided)
  const displayValue = mask ? mask(value) : value;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <Text color={labelColor} bold={focused}>
        {label}
      </Text>

      {/* Input field */}
      <Box flexDirection="row" alignItems="center">
        <Text color={inputColor}>
          [
        </Text>

        <TextInput
          value={displayValue}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          focus={focused}
          disabled={disabled}
          maxLength={dynamicWidth}
        />

        <Text color={inputColor}>
          ]
        </Text>

        {/* Notice text */}
        {notice && !error && (
          <Text color={noticeColor} marginLeft={1}>
            {notice}
          </Text>
        )}

        {/* Error message */}
        {error && (
          <Text color={errorColor} marginLeft={1}>
            ✗ {error}
          </Text>
        )}
      </Box>

      {/* Status indicators */}
      {focused && (
        <Text color={colors?.muted} dimColor>
          [Enter] submit • [Tab] next field
        </Text>
      )}
    </Box>
  );
};

export default FieldText;