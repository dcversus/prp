import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { CLIOptions } from '../types.js';

interface AppProps {
  options: CLIOptions;
}

const App: React.FC<AppProps> = ({ options: _options }) => {
  const [step, setStep] = useState<'welcome' | 'gathering' | 'generating' | 'complete'>('welcome');

  useEffect(() => {
    // Initialize the app
    setTimeout(() => {
      setStep('gathering');
    }, 2000);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🚀 PRP - Project Bootstrap CLI
        </Text>
      </Box>

      {step === 'welcome' && (
        <Box flexDirection="column">
          <Text>Welcome to PRP! Let's bootstrap your project.</Text>
          <Text dimColor>Starting interactive mode...</Text>
        </Box>
      )}

      {step === 'gathering' && (
        <Box flexDirection="column">
          <Text color="yellow">Gathering project information...</Text>
          <Text dimColor>This feature is under development.</Text>
        </Box>
      )}

      {step === 'generating' && (
        <Box flexDirection="column">
          <Text color="green">Generating project files...</Text>
        </Box>
      )}

      {step === 'complete' && (
        <Box flexDirection="column">
          <Text color="green">✓ Project created successfully!</Text>
        </Box>
      )}
    </Box>
  );
};

export default App;
