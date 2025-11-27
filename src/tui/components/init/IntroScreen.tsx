/**
 * ♫ Intro Screen - Welcome screen component
 *
 * Step 0 of the init flow with welcome message, quote, and music animations.
 * Follows PRP-003 specifications for the intro experience.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

import { useTheme } from '../../config/theme-provider';

interface IntroScreenProps {
  onNext: () => void;
  onCancel: () => void;
};

const IntroScreen: React.FC<IntroScreenProps> = (
  {
    /* onNext, onCancel */
  },
) => {
  const theme = useTheme();
  const [currentNote, setCurrentNote] = useState(0);
  const [showQuote, setShowQuote] = useState(false);

  // Music animation notes
  const musicNotes = ['♪', '♩', '♬', '♫'];
  const motivationalQuote = '"Tools should vanish; flow should remain." — workshop note';

  // Animate music notes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNote((prev) => (prev + 1) % musicNotes.length);
    }, 600); // ~6 fps

    return () => clearInterval(interval);
  }, []);

  // Show quote after a brief delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowQuote(true);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Box flexDirection="column" justifyContent="center" alignItems="center">
      {/* Header with animated music note */}
      <Box flexDirection="row" alignItems="center" marginBottom={2}>
        <Text
          color={(theme.colors as any).accentOrange ?? (theme.colors as any).orange ?? '#FF9A38'}
          bold
        >
          {musicNotes[currentNote]} @dcversus/prp
        </Text>
        <Box marginLeft={2}>
          <Text color={theme.colors.neutrals.muted}>
            ⧗ {new Date().toISOString().slice(0, 19).replace('T', ' ')}
          </Text>
        </Box>
      </Box>

      {/* Motivational quote */}
      {showQuote && (
        <Box flexDirection="column" alignItems="center" marginBottom={3}>
          <Text color={theme.colors.neutrals.muted} italic>
            {motivationalQuote}
          </Text>
        </Box>
      )}

      {/* Welcome message */}
      <Box flexDirection="column" alignItems="center" marginBottom={3}>
        <Text color={theme.colors.neutrals.text} bold>
          This wizard will provision your workspace and first PRP.
        </Text>
        <Text color={theme.colors.neutrals.text}>One input at a time. Minimal. Reversible.</Text>
      </Box>

      {/* Decorative elements */}
      <Box flexDirection="row" alignItems="center" marginTop={2}>
        <Text color={theme.colors.neutrals.muted}>
          {Array.from({ length: 3 })
            .map((_, i) => musicNotes[(currentNote + i) % musicNotes.length])
            .join(' ')}
        </Text>
      </Box>

      {/* Call to action hint */}
      <Box flexDirection="column" alignItems="center" marginTop={4}>
        <Text color={(theme.colors as any).textDim ?? (theme.colors as any).muted} italic>
          Ready to begin your journey?
        </Text>
        <Text
          color={(theme.colors as any).accentOrange ?? (theme.colors as any).orange ?? '#FF9A38'}
        >
          Press Enter to continue
        </Text>
      </Box>
    </Box>
  );
};

export default IntroScreen;
