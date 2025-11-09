/**
 * ♫ FieldTextBlock - Multi-line text input component
 *
 * Multi-line text area that grows to 6-10 lines in focus,
 * dims when unfocused, with tip support and visual feedback
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTerminalDimensionsWithColumns } from '../../hooks/useTerminalDimensions.js';
import TextInput from 'ink-text-input';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface FieldTextBlockProps {
  label: string;
  value: string;
  rows?: number;
  minHeight?: number;
  maxHeight?: number;
  tip?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  config?: TUIConfig;
  disabled?: boolean;
  validate?: (value: string) => string | null;
  autoFocus?: boolean;
  expandOnFocus?: boolean;
  multiline?: boolean;
}

export const FieldTextBlock: React.FC<FieldTextBlockProps> = ({
  label,
  value,
  rows = 3,
  minHeight = 3,
  maxHeight = 10,
  tip,
  placeholder = '',
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  config,
  disabled = false,
  validate,
  autoFocus = false,
  expandOnFocus = true,
  multiline = true
}) => {
  const { columns } = useTerminalDimensionsWithColumns();
  const [focused, setFocused] = useState(autoFocus);
  const [error, setError] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const [lines, setLines] = useState<string[]>(value.split('\n'));

  // Calculate display height based on focus and content
  const calculateHeight = useCallback(() => {
    if (!expandOnFocus) return rows;

    const contentLines = lines.length;
    let displayHeight = contentLines;

    if (focused) {
      // Expand when focused (6-10 lines)
      displayHeight = Math.max(minHeight, Math.min(maxHeight, contentLines + 2));
    } else {
      // Compact when unfocused
      displayHeight = Math.min(rows, contentLines);
    }

    return displayHeight;
  }, [focused, lines.length, rows, minHeight, maxHeight, expandOnFocus]);

  // Update lines when value changes
  useEffect(() => {
    setLines(value.split('\n'));
  }, [value]);

  // Handle focus changes
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setFocused(true);
    setCurrentLine(lines.length - 1);
    onFocus?.();
  }, [disabled, onFocus, lines.length]);

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

    const newLines = newValue.split('\n');
    setLines(newLines);
    onChange(newValue);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  }, [disabled, onChange, error]);

  // Handle line navigation
  const handleLineUp = useCallback(() => {
    if (currentLine > 0) {
      setCurrentLine(currentLine - 1);
    }
  }, [currentLine]);

  const handleLineDown = useCallback(() => {
    if (currentLine < lines.length - 1) {
      setCurrentLine(currentLine + 1);
    }
  }, [currentLine, lines.length]);

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
    if (!focused || disabled) return;

    if (key.return) {
      if (multiline && key.shift) {
        // Shift+Enter: new line
        const newLines = [...lines];
        newLines.splice(currentLine + 1, 0, '');
        setLines(newLines);
        setCurrentLine(currentLine + 1);
        handleChange(newLines.join('\n'));
      } else if (multiline) {
        // Enter: move to next line or submit if at end
        if (currentLine === lines.length - 1) {
          handleSubmit();
        } else {
          handleLineDown();
        }
      } else {
        // Single line: submit
        handleSubmit();
      }
    } else if (key.upArrow) {
      handleLineUp();
    } else if (key.downArrow) {
      handleLineDown();
    } else if (key.tab) {
      handleBlur();
    } else if (input === ' ') {
      // Space key in focused block
      handleFocus();
    }
  }, { isActive: focused && !disabled });

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

  const blockColor = disabled
    ? colors?.gray
    : focused
      ? colors?.base_fg
      : colors?.muted;

  const errorColor = colors?.error;
  const tipColor = colors?.muted;

  // Display height
  const displayHeight = calculateHeight();

  // Prepare content for display
  const displayLines = lines.slice(0, displayHeight);
  const maxWidth = columns - 4; // Use almost full width

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <Text color={labelColor} bold={focused}>
        {label}
      </Text>

      {/* Text block */}
      <Box flexDirection="column">
        {displayLines.map((line, index) => (
          <Box key={index} flexDirection="row">
            {/* Line content */}
            <Text color={blockColor}>
              {line || (focused && index === currentLine ? placeholder : '')}
            </Text>

            {/* Cursor indicator for focused line */}
            {focused && index === currentLine && (
              <Text color={colors?.accent_orange} backgroundColor={colors?.accent_orange_bg}>
                ▏
              </Text>
            )}
          </Box>
        ))}

        {/* Fill empty lines */}
        {Array.from({ length: displayHeight - displayLines.length }).map((_, index) => (
          <Box key={`empty-${index}`} flexDirection="row">
            {focused && index === 0 && displayLines.length === 0 && (
              <Text color={tipColor} dimColor>
                {placeholder}
              </Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Tip */}
      {tip && !error && (
        <Text color={tipColor} italic>
          {tip}
        </Text>
      )}

      {/* Error message */}
      {error && (
        <Text color={errorColor}>
          ✗ {error}
        </Text>
      )}

      {/* Status indicators */}
      {focused && (
        <Text color={colors?.muted} dimColor>
          [↑/↓] navigate • [Enter] {multiline ? 'new line/submit' : 'submit'} • [Shift+Enter] new line • [Tab] next field • [Space] multiline toggle
        </Text>
      )}

      {/* Content info */}
      {!focused && (
        <Text color={colors?.muted} dimColor>
          {lines.length} line{lines.length !== 1 ? 's' : ''} • {value.length} character{value.length !== 1 ? 's' : ''}
        </Text>
      )}
    </Box>
  );
};

export default FieldTextBlock;