/**
 * ♫ InputBar Component
 *
 * Fixed bottom input with paste support and token counting
 * implements the exact format from the PRP specification
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { InputBarProps } from '../types/TUIConfig.js';

export function InputBar({ value, onChange, config, terminalLayout }: InputBarProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [pasteInfo, setPasteInfo] = useState<{ tokens: number; hash: string; cut?: number } | null>(null);

  // Sync with external value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Handle input changes
  useInput((input, key) => {
    if (key.ctrl) {
      // Handle Ctrl key combinations
      switch (input) {
        case 's': // Ctrl+S - submit
          if (internalValue.trim()) {
            onChange(internalValue);
          }
          return;
        case 'v': // Ctrl+V - paste (simulated)
          // In a real implementation, this would handle clipboard paste
          return;
      }
    }

    if (key.return) {
      // Submit on Enter
      if (internalValue.trim()) {
        onChange(internalValue);
      }
      return;
    }

    if (key.backspace || key.delete) {
      // Handle backspace
      setInternalValue(prev => prev.slice(0, -1));
      onChange(internalValue.slice(0, -1));
      return;
    }

    if (key.ctrl || key.meta) {
      // Ignore other control keys
      return;
    }

    // Regular character input
    if (input && input.length === 1) {
      const newValue = internalValue + input;
      setInternalValue(newValue);
      onChange(newValue);
    }
  });

  // Simulate paste detection (in real implementation, this would come from clipboard)
  const handleSimulatedPaste = (text: string) => {
    // Simple token counting (rough estimate)
    const tokens = Math.ceil(text.length / 4); // Rough approximation
    const hash = Math.random().toString(36).substring(2, 8);

    // Check against token limit
    const maxTokens = config.input.maxTokens;
    const reserve = maxTokens * config.input.tokenReserve;
    const availableTokens = maxTokens - reserve;

    let finalText = text;
    let cut: number | undefined;

    if (tokens > availableTokens) {
      // Cut text to fit within available tokens
      const maxChars = Math.floor((availableTokens / tokens) * text.length);
      finalText = text.substring(0, maxChars);
      cut = tokens - availableTokens;
    }

    setPasteInfo({ tokens: Math.ceil(finalText.length / 4), hash, cut });
    onChange(finalText);
  };

  // Render delimiter lines
  const renderDelimiter = () => (
    <Text color={config.colors.gray}>
      {'─'.repeat(terminalLayout.columns)}
    </Text>
  );

  // Render input with paste info
  const renderInput = () => (
    <Box flexDirection="column">
      <Box>
        <Text color={config.colors.base_fg}>{'>'} </Text>
        <Text color={config.colors.base_fg}>
          {internalValue || 'paste or type here …'}
        </Text>
        {pasteInfo && (
          <Text color={config.colors.muted}>
            {' '}{pasteInfo.cut ?
              `-- pasted ${pasteInfo.tokens} tokens | ${pasteInfo.hash} | cut_limit --` :
              `-- pasted ${pasteInfo.tokens} tokens | ${pasteInfo.hash} --`
            }
          </Text>
        )}
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" width={terminalLayout.columns}>
      {renderDelimiter()}
      {renderInput()}
      {renderDelimiter()}
    </Box>
  );
}