/**
 * ♫ InputBar Component
 *
 * Fixed bottom input with paste support and token counting
 * implements the exact format from the PRP specification
 */

import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { InputBarProps } from '../types/TUIConfig.js';
import {
  PasteHandler,
  PasteMetadata,
  defaultPasteHandler,
  processPaste
} from '../utils/paste-handler.js';

export function InputBar({ value, onChange, config, terminalLayout }: InputBarProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [pasteInfo, setPasteInfo] = useState<PasteMetadata | null>(null);
  const [pasteHandler] = useState(() => new PasteHandler({
    maxTokens: 200000, // Default from orchestrator caps
    reservePercentage: 5,
    enableHashing: true
  }));
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Expose paste handling method for external integration
  const handleExternalPaste = useCallback((content: string) => {
    handlePaste(content);
  }, [handlePaste]);

  // Update max tokens dynamically based on system caps
  const updateTokenCaps = useCallback(async () => {
    try {
      // This would integrate with the existing token tracking system
      // For now, we'll use the default values
      // In a full implementation, this would fetch real-time caps
    } catch (error) {
      console.warn('Failed to update token caps:', error);
    }
  }, []);

  // Initialize token caps on mount
  useEffect(() => {
    updateTokenCaps();
  }, [updateTokenCaps]);

  // Sync with external value
  useEffect(() => {
    setInternalValue(value);
    // Clear paste info when value is externally changed
    if (value !== internalValue) {
      setPasteInfo(null);
      setErrorMessage('');
    }
  }, [value]);

  // Handle paste processing
  const handlePaste = useCallback((pastedContent: string) => {
    try {
      // Clear any existing error message
      setErrorMessage('');

      // Validate paste before processing
      const validation = pasteHandler.validatePaste(pastedContent, internalValue);

      if (!validation.canAccept) {
        setErrorMessage(validation.reason || 'Paste exceeds token limit');
        return;
      }

      // Process the paste
      const metadata = pasteHandler.processPaste(pastedContent, internalValue);

      // Update internal value with processed content
      const newValue = internalValue + metadata.processedContent;
      setInternalValue(newValue);
      setPasteInfo(metadata);

      // Notify parent of change
      onChange(newValue);

      // Clear paste info after 3 seconds
      setTimeout(() => {
        setPasteInfo(null);
      }, 3000);

    } catch (error) {
      setErrorMessage(`Paste processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pasteHandler, internalValue, onChange]);

  // Handle input changes
  useInput((input, key) => {
    // Clear error message on any new input
    if (errorMessage && (input || key.return || key.backspace || key.delete)) {
      setErrorMessage('');
    }

    if (key.ctrl) {
      // Handle Ctrl key combinations
      switch (input) {
        case 's': // Ctrl+S - submit
          if (internalValue.trim()) {
            onChange(internalValue);
          }
          return;
        case 'v': // Ctrl+V - paste (simulated for terminal)
          // In terminal environments, we simulate paste detection
          // Real clipboard access would require terminal-specific APIs
          const simulatedPaste = getSimulatedPasteContent();
          if (simulatedPaste) {
            handlePaste(simulatedPaste);
          }
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
      const newValue = internalValue.slice(0, -1);
      setInternalValue(newValue);
      onChange(newValue);
      return;
    }

    if (key.ctrl || key.meta) {
      // Ignore other control keys
      return;
    }

    // Regular character input
    if (input.length === 1) {
      const newValue = internalValue + input;
      setInternalValue(newValue);
      onChange(newValue);
    }
  });

  // Simulated paste content for testing purposes
  // In a real implementation, this would integrate with terminal clipboard APIs
  const getSimulatedPasteContent = (): string | null => {
    // This is a placeholder for actual clipboard integration
    // Terminal clipboard access varies by platform and terminal
    return null;
  };

  // Render delimiter lines
  const renderDelimiter = () => (
    <Text color={config.colors.gray}>
      {'─'.repeat(terminalLayout.columns)}
    </Text>
  );

  // Render input with paste info and error messages
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
      {errorMessage && (
        <Box marginTop={1}>
          <Text color={config.colors.error}>
            ⚠️  {errorMessage}
          </Text>
        </Box>
      )}
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

// Export component with additional methods for external integration
export type InputBarRef = {
  handlePaste: (content: string) => void;
  clearError: () => void;
  getCurrentValue: () => string;
};