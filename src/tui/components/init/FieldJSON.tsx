/**
 * ♫ FieldJSON - JSON input field with validation
 *
 * JSON editor with real-time validation, visual feedback,
 * pulse animations for success/error states
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface FieldJSONProps {
  label: string;
  text: string;
  onChange: (text: string) => void;
  config?: TUIConfig;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  validate?: (json: any) => string | null; // Custom validation
  show?: boolean;
  multiline?: boolean;
}

export const FieldJSON: React.FC<FieldJSONProps> = ({
  label,
  text,
  onChange,
  config,
  disabled = false,
  placeholder = '{}',
  onFocus,
  onBlur,
  validate,
  show = true,
  multiline = true
}) => {
  const [focused, setFocused] = useState(false);
  const [valid, setValid] = useState(true);
  const [parsedJSON, setParsedJSON] = useState<any>(null);
  const [showFlash, setShowFlash] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Validate JSON with debouncing
  const validateJSON = useCallback((jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText || '{}');
      setParsedJSON(parsed);

      // Custom validation if provided
      if (validate) {
        const customError = validate(parsed);
        if (customError) {
          setValid(false);
          setErrorMessage(customError);
          return false;
        }
      }

      setValid(true);
      setErrorMessage(null);
      return true;
    } catch (error) {
      setValid(false);
      setParsedJSON(null);
      setErrorMessage(error instanceof Error ? error.message : 'Invalid JSON');
      return false;
    }
  }, [validate]);

  // Debounced validation
  const debouncedValidate = useCallback((jsonText: string) => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    const timeout = setTimeout(() => {
      const isValid = validateJSON(jsonText);

      // Show flash animation
      if (jsonText.length > 0) {
        setShowFlash(isValid ? 'success' : 'error');
        setTimeout(() => setShowFlash(null), 300);
      }
    }, 150); // 150ms debounce

    setValidationTimeout(timeout);
  }, [validationTimeout, validateJSON]);

  // Handle focus changes
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setFocused(true);
    onFocus?.();
  }, [disabled, onFocus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();

    // Validate immediately on blur
    const isValid = validateJSON(text);
    if (isValid && text.length > 0) {
      setShowFlash('success');
      setTimeout(() => setShowFlash(null), 500);
    }
  }, [text, validateJSON, onBlur]);

  // Handle text changes
  const handleChange = useCallback((newText: string) => {
    if (disabled) return;

    onChange(newText);

    // Clear flash when typing
    if (showFlash) {
      setShowFlash(null);
    }

    // Debounced validation
    debouncedValidate(newText);
  }, [disabled, onChange, showFlash, debouncedValidate]);

  // Handle validation request
  const handleValidate = useCallback(() => {
    const isValid = validateJSON(text);
    if (isValid) {
      setShowFlash('success');
      setTimeout(() => setShowFlash(null), 300);
    } else {
      setShowFlash('error');
      setTimeout(() => setShowFlash(null), 300);
    }
  }, [text, validateJSON]);

  // Keyboard navigation
  useInput((input, key) => {
    if (!focused || disabled) return;

    if (key.return) {
      handleValidate();
    } else if (key.tab) {
      handleBlur();
    } else if (key.ctrl && input === 'v') {
      // Paste support
      // In a real implementation, this would handle clipboard paste
      handleFocus();
    } else if (input === 'D') {
      // Show/hide raw JSON
      handleFocus();
    }
  }, { isActive: focused && !disabled });

  // Initial validation
  useEffect(() => {
    if (text) {
      validateJSON(text);
    }
  }, []);

  // Cleanup validation timeout
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

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

  const successColor = colors?.ok || '#00FF00';
  const errorColor = colors?.error;

  if (!show) {
    return null;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label with status indicator */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color={labelColor} bold={focused}>
          {label}
        </Text>

        {/* Validation status */}
        {text.length > 0 && (
          <Box marginLeft={1}>
            {valid ? (
              <Text color={successColor}>
                ✓
              </Text>
            ) : (
              <Text color={errorColor}>
                ✗
              </Text>
            )}
          </Box>
        )}

        {/* Flash animation */}
        {showFlash && (
          <Box marginLeft={1}>
            <Text
              color={showFlash === 'success' ? successColor : errorColor}
              backgroundColor={showFlash === 'success' ? `${successColor}20` : `${errorColor}20`}
            >
              {showFlash === 'success' ? ' ✓' : ' ✗'}
            </Text>
          </Box>
        )}
      </Box>

      {/* JSON input field */}
      <Box flexDirection="column">
        <Box flexDirection="row" alignItems="flex-start">
          <Text color={inputColor}>
            [
          </Text>

          <Box flexDirection="column" flexGrow={1}>
            {multiline ? (
              // Multi-line JSON editor
              <Box flexDirection="column">
                {text.split('\n').map((line, index) => (
                  <Box key={index} flexDirection="row">
                    <Text color={colors?.gray} marginRight={1}>
                      {(index + 1).toString().padStart(2, ' ')} │
                    </Text>
                    <Text color={inputColor}>
                      {line || ' '}
                    </Text>
                  </Box>
                ))}

                {/* Input line */}
                <Box flexDirection="row">
                  <Text color={colors?.gray} marginRight={1}>
                    {(text.split('\n').length + 1).toString().padStart(2, ' ')} │
                  </Text>
                  <TextInput
                    value=""
                    onChange={handleChange}
                    placeholder=""
                    focus={focused}
                    disabled={disabled}
                  />
                </Box>
              </Box>
            ) : (
              // Single-line JSON editor
              <TextInput
                value={text}
                onChange={handleChange}
                placeholder={placeholder}
                focus={focused}
                disabled={disabled}
              />
            )}
          </Box>

          <Text color={inputColor}>
            ]
          </Text>
        </Box>

        {/* Error message */}
        {errorMessage && !valid && text.length > 0 && (
          <Box flexDirection="row" marginTop={1}>
            <Text color={errorColor} marginRight={1}>
              ✗
            </Text>
            <Text color={errorColor} dimColor>
              {errorMessage}
            </Text>
          </Box>
        )}

        {/* Success message */}
        {valid && text.length > 0 && parsedJSON && (
          <Box flexDirection="row" marginTop={1}>
            <Text color={successColor} marginRight={1}>
              ✓
            </Text>
            <Text color={successColor} dimColor>
              Valid JSON{parsedJSON && Object.keys(parsedJSON).length > 0 ? ` (${Object.keys(parsedJSON).length} key${Object.keys(parsedJSON).length !== 1 ? 's' : ''})` : ''}
            </Text>
          </Box>
        )}
      </Box>

      {/* Status indicators */}
      {focused && (
        <Text color={colors?.muted} dimColor>
          [Enter] validate • [Tab] next field • [Ctrl+V] paste • [D] view raw
        </Text>
      )}

      {!focused && parsedJSON && (
        <Text color={colors?.muted} dimColor>
          JSON: {typeof parsedJSON} {Array.isArray(parsedJSON) ? `(${parsedJSON.length} items)` : ''}
        </Text>
      )}
    </Box>
  );
};

export default FieldJSON;