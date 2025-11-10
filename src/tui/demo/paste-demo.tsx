/**
 * ♫ Paste Handling Demo
 *
 * Interactive demonstration of paste handling with token counting
 */

import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface PasteDemoProps {
  maxTokens?: number;
  reservePercentage?: number;
}

export function PasteDemo({ maxTokens = 1000, reservePercentage = 5 }: PasteDemoProps) {
  const [pasteHandler] = useState(() => new PasteHandler({
    maxTokens,
    reservePercentage,
    enableHashing: true
  }));

  const [currentInput, setCurrentInput] = useState('');
  const [pasteHistory, setPasteHistory] = useState<PasteMetadata[]>([]);
  const [lastError, setLastError] = useState<string>('');

  const handleDemoPaste = useCallback((content: string) => {
    try {
      const validation = pasteHandler.validatePaste(content, currentInput);

      if (!validation.canAccept) {
        setLastError(validation.reason || 'Paste rejected');
        return;
      }

      const metadata = pasteHandler.processPaste(content, currentInput);
      setCurrentInput(prev => prev + metadata.processedContent);
      setPasteHistory(prev => [metadata, ...prev].slice(0, 5)); // Keep last 5
      setLastError('');
    } catch (error) {
      setLastError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pasteHandler, currentInput]);

  useInput((input, key) => {
    if (key.ctrl) {
      switch (input) {
        case 'v': { // Ctrl+V - simulate paste
          const sampleTexts = [
            'Short text example',
            'This is a longer text example that demonstrates token counting and reserve enforcement. It contains multiple sentences and should count more tokens.',
            'This is a very long text that demonstrates content truncation when paste exceeds token limits. '.repeat(10),
            `function example() {
  console.log('Code paste example');
  return calculateTokens(text);
}`
          ];

          // Simulate different paste scenarios
          const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
          handleDemoPaste(randomText);
          return;
        }

        case 'c': // Ctrl+C - clear
          setCurrentInput('');
          setPasteHistory([]);
          setLastError('');
          return;
      }
    }

    if (key.return) {
      // Clear current input
      setCurrentInput('');
      return;
    }

    if (key.backspace || key.delete) {
      setCurrentInput(prev => prev.slice(0, -1));
      return;
    }

    if (key.ctrl || key.meta) {
      return;
    }

    if (input.length === 1) {
      setCurrentInput(prev => prev + input);
    }
  });

  const availableTokens = maxTokens - Math.floor(maxTokens * (reservePercentage / 100));
  const currentTokens = Math.ceil(currentInput.length / 4);
  const remainingTokens = availableTokens - currentTokens;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>♫ Paste Handling Demo</Text>
      </Box>

      {/* Configuration Info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">Configuration:</Text>
        <Text>  Max Tokens: {maxTokens}</Text>
        <Text>  Reserve: {reservePercentage}% ({Math.floor(maxTokens * (reservePercentage / 100))} tokens)</Text>
        <Text>  Available: {availableTokens} tokens</Text>
      </Box>

      {/* Current Token Status */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow">Current Status:</Text>
        <Text>  Input length: {currentInput.length} chars</Text>
        <Text>  Input tokens: {currentTokens}</Text>
        <Text color={remainingTokens < 100 ? 'red' : 'green'}>
           Remaining: {remainingTokens} tokens
        </Text>
      </Box>

      {/* Current Input */}
      <Box marginBottom={1}>
        <Text color="white">{'> '} {currentInput || '<empty>'}</Text>
      </Box>

      {/* Paste History */}
      {pasteHistory.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="magenta" bold>Recent Pastes:</Text>
          {pasteHistory.map((paste, index) => (
            <Box key={`${paste.hash}-${index}`} marginLeft={2}>
              <Text color="gray">
                {paste.cut ?
                  `Pasted ${paste.tokens} tokens | ${paste.hash} | cut: -${paste.cut}` :
                  `Pasted ${paste.tokens} tokens | ${paste.hash}`
                }
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Error Messages */}
      {lastError && (
        <Box marginBottom={1}>
          <Text color="red">⚠️  {lastError}</Text>
        </Box>
      )}

      {/* Instructions */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="blue" bold>Controls:</Text>
        <Text>  Ctrl+V - Simulate paste (random content)</Text>
        <Text>  Ctrl+C - Clear everything</Text>
        <Text>  Enter - Clear input</Text>
        <Text>  Type to add text</Text>
        <Text>  Backspace - Remove last character</Text>
      </Box>

      {/* Token Budget Visualization */}
      <Box marginTop={1}>
        <Text color="cyan" bold>Token Budget:</Text>
        <Box>
          <Text color="green">{'█'.repeat(Math.floor((currentTokens / availableTokens) * 20))}</Text>
          <Text color="gray">{'█'.repeat(Math.floor((remainingTokens / availableTokens) * 20))}</Text>
          <Text color="white"> {currentTokens}/{availableTokens}</Text>
        </Box>
      </Box>
    </Box>
  );
}