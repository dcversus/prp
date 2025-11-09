/**
 * ♫ FieldSecret - Secret input field with masking
 *
 * Password/secret field with masking, paste support,
 * and visual feedback according to PRP-003 specifications
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface FieldSecretProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  config?: TUIConfig;
  disabled?: boolean;
  placeholder?: string;
  notice?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  mask?: (value: string) => string;
  reveal?: boolean;
  showToggle?: boolean;
}

export const FieldSecret: React.FC<FieldSecretProps> = ({
  label,
  value,
  onChange,
  config,
  disabled = false,
  placeholder = '',
  notice,
  onFocus,
  onBlur,
  onSubmit,
  mask = (val) => val.replace(/./g, '*'),
  reveal = false,
  showToggle = true
}) => {
  const [focused, setFocused] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [pasted, setPasted] = useState(false);
  const inputRef = useRef<any>(null);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setFocused(true);
    onFocus?.();
  }, [disabled, onFocus]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Handle value change
  const handleChange = useCallback((newValue: string) => {
    if (disabled) return;
    onChange(newValue);

    // Clear paste indicator after a delay
    if (pasted) {
      setTimeout(() => setPasted(false), 1000);
    }
  }, [disabled, onChange, pasted]);

  // Handle paste (Ctrl+V)
  const handlePaste = useCallback(() => {
    // In a real implementation, this would read from clipboard
    // For now, just show that paste was attempted
    setPasted(true);
    handleFocus();
  }, [handleFocus]);

  // Toggle visibility
  const handleToggleVisibility = useCallback(() => {
    setShowValue(!showValue);
    handleFocus();
  }, [showValue, handleFocus]);

  // Handle input submission
  const handleSubmit = useCallback(() => {
    onSubmit?.();
  }, [onSubmit]);

  // Keyboard navigation
  useInput((input, key) => {
    if (!focused || disabled) return;

    if (key.return) {
      handleSubmit();
    } else if (key.tab) {
      handleBlur();
    } else if (key.ctrl && input === 'v') {
      handlePaste();
    } else if (input === ' ') {
      handleToggleVisibility();
    }
  }, { isActive: focused && !disabled });

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

  const placeholderColor = colors?.muted;
  const noticeColor = colors?.gray;
  const indicatorColor = colors?.accent_orange;

  // Display value (masked or revealed)
  const displayValue = reveal || showValue ? value : mask(value);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label with notice */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color={labelColor} bold={focused}>
          {label}
        </Text>

        {notice && (
          <Box marginLeft={1}>
            <Text color={noticeColor} dimColor italic>
              {notice}
            </Text>
          </Box>
        )}
      </Box>

      {/* Input field */}
      <Box flexDirection="row" alignItems="center">
        <Text color={inputColor}>
          [
        </Text>

        <TextInput
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          focus={focused}
          disabled={disabled}
          mask={reveal || showValue ? undefined : mask}
          onSubmit={handleSubmit}
        />

        <Text color={inputColor}>
          ]
        </Text>

        {/* Visibility toggle */}
        {showToggle && !disabled && (
          <Box marginLeft={1}>
            <Text
              color={focused ? indicatorColor : colors?.muted}
              dimColor={!focused}
              backgroundColor={focused ? `${indicatorColor}20` : undefined}
            >
              {showValue ? '👁' : '🔒'}
            </Text>
          </Box>
        )}

        {/* Paste indicator */}
        {pasted && (
          <Box marginLeft={1}>
            <Text color={indicatorColor}>
              Pasted!
            </Text>
          </Box>
        )}
      </Box>

      {/* Status indicators */}
      {focused && (
        <Text color={colors?.muted} dimColor>
          [Space] toggle visibility • [Ctrl+V] paste • [Enter] submit • [Tab] next field
        </Text>
      )}

      {/* Helper text when not focused */}
      {!focused && value.length > 0 && (
        <Text color={colors?.muted} dimColor>
          Secret: {'*'.repeat(Math.min(value.length, 8))}${value.length > 8 ? '...' : ''}
        </Text>
      )}
    </Box>
  );
};

export default FieldSecret;