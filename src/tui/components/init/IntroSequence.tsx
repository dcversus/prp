/**
 * ♫ IntroSequence - 10-second ASCII art intro animation
 *
 * Logo evolution animation: ♪ → ♩ → ♬ → ♫
 * With smooth transitions, fade effects, and brand presentation
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions';

// Import types
import type { TUIConfig } from '../../../shared/types/TUIConfig';

export interface IntroSequenceProps {
  duration?: number; // ms
  onComplete: () => void;
  config?: TUIConfig;
  showLogo?: boolean;
  showQuote?: boolean;
};

// ASCII art frames for logo evolution
const LOGO_FRAMES = [
  {
    note: '♪',
    ascii: `
┌─────────────────────────────────────────┐
│                                         │
│                  ♪                      │
│                                         │
│           PRP PROJECT                    │
│                                         │
└─────────────────────────────────────────┘`,
    progress: 0,
  },
  {
    note: '♩',
    ascii: `
┌─────────────────────────────────────────┐
│                                         │
│                ♪ ♩                      │
│                                         │
│         PRP PROJECT SYSTEM               │
│                                         │
└─────────────────────────────────────────┘`,
    progress: 25,
  },
  {
    note: '♬',
    ascii: `
┌─────────────────────────────────────────┐
│                                         │
│             ♪ ♩ ♬                      │
│                                         │
│      PRODUCT REQUIREMENT PROMPTS        │
│                                         │
└─────────────────────────────────────────┘`,
    progress: 50,
  },
  {
    note: '♫',
    ascii: `
┌─────────────────────────────────────────┐
│                                         │
│           ♪ ♩ ♬ ♫                      │
│                                         │
│     @dcversus/prp - AUTOMATION          │
│                                         │
└─────────────────────────────────────────┘`,
    progress: 75,
  },
];

const FINAL_FRAME = {
  note: '♫',
  ascii: `
┌─────────────────────────────────────────┐
│                                         │
│     ╔═════════════════════════════════╗   │
│     ║   ♪ ♩ ♬ ♫                      ║   │
│     ║                                 ║   │
│     ║  @dcversus/prp                  ║   │
│     ║  Product Requirements Platform  ║   │
│     ║                                 ║   │
│     ╚═════════════════════════════════╝   │
│                                         │
└─────────────────────────────────────────┘`,
  progress: 100,
};

export const IntroSequence: React.FC<IntroSequenceProps> = ({
  duration = 10000,
  onComplete,
  config,
  showLogo = true,
  showQuote = true,
}) => {
  const { width, height } = useTerminalDimensions();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [alpha, setAlpha] = useState(0);
  const [displayQuote, setDisplayQuote] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Calculate frame timing based on duration
  const frameDuration = duration / (LOGO_FRAMES.length + 2); // +2 for final frame and fade
  const totalFrames = [...LOGO_FRAMES, FINAL_FRAME];

  // Animation sequence
  useEffect(() => {
    let frameIndex = 0;
    let fadeTimeout: NodeJS.Timeout;

    const animateFrame = () => {
      if (frameIndex < totalFrames.length) {
        setCurrentFrame(frameIndex);

        // Fade in effect
        let fadeProgress = 0;
        const fadeInterval = setInterval(() => {
          fadeProgress += 0.1;
          setAlpha(Math.min(fadeProgress, 1.0));

          if (fadeProgress >= 1.0) {
            clearInterval(fadeInterval);

            // Show quote after main logo appears
            if (frameIndex === totalFrames.length - 1 && showQuote) {
              setTimeout(() => setDisplayQuote(true), 500);
            }

            // Move to next frame
            setTimeout(() => {
              frameIndex++;
              setAlpha(0);
              animateFrame();
            }, frameDuration * 0.5);
          }
        }, 50);
      } else {
        // Final fade out
        setFadeOut(true);
        fadeTimeout = setTimeout(() => {
          onComplete();
        }, 1000);
      }
    };

    animateFrame();

    return () => {
      clearTimeout(fadeTimeout);
    };
  }, [duration, onComplete, totalFrames.length, frameDuration, showQuote]);

  // Calculate positioning for centered display
  // const centerX = Math.max(0, Math.floor((width - 50) / 2)); // Unused
  // const centerY = Math.max(0, Math.floor((height - 15) / 2)); // Unused

  // Apply alpha transparency to colors
  const applyAlpha = (color: string, alphaValue: number): string => {
    if (alphaValue >= 1.0) {
      return color;
    }
    return (
      color +
      Math.floor(alphaValue * 255)
        .toString(16)
        .padStart(2, '0')
    );
  };

  const currentFrameData = totalFrames[currentFrame];
  const accentColor = applyAlpha(config?.colors?.accent_orange || '#FF9A38', alpha);
  const textColor = applyAlpha(config?.colors?.base_fg || '#E6E6E6', alpha);
  const borderColor = applyAlpha(config?.colors?.muted || '#9AA0A6', alpha);

  return (
    <Box
      flexDirection="column"
      height={height}
      width={width}
      justifyContent="center"
      alignItems="center"
    >
      {/* ASCII Art Frame */}
      {showLogo && (
        <Box flexDirection="column" alignItems="center">
          <Text color={accentColor} bold>
            {(currentFrameData?.ascii ?? '').split('\n').map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </Text>
        </Box>
      )}

      {/* Quote */}
      {showQuote && displayQuote && !fadeOut && (
        <Box flexDirection="column" alignItems="center" marginTop={2}>
          <Text color={textColor} italic>
            "Tools should vanish; flow should remain."
          </Text>
          <Text color={borderColor} dimColor>
            — workshop note
          </Text>
        </Box>
      )}

      {/* Music note animation at bottom */}
      <Box marginBottom={1}>
        <Text color={accentColor} bold>
          {currentFrameData?.note ?? '♪'}
        </Text>
      </Box>

      {/* Loading indicator */}
      <Box>
        <Text color={borderColor}>
          Loading workspace setup... {Math.round((currentFrame / totalFrames.length) * 100)}%
        </Text>
      </Box>

      {/* Fade out overlay */}
      {fadeOut && (
        <Box flexDirection="column" justifyContent="center" alignItems="center" height={height}>
          <Text {...(config?.colors?.accent_orange && { color: config.colors.accent_orange })} bold>
            ♫ Initializing...
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Simplified mini intro for quick display
export const MiniIntro: React.FC<{
  onComplete: () => void;
  config?: TUIConfig;
}> = ({ onComplete, config }) => {
  const [frame, setFrame] = useState(0);
  const notes = ['♪', '♩', '♬', '♫'];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => {
        const next = (prev + 1) % notes.length;
        if (next === 0) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
        }
        return next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <Box flexDirection="column" justifyContent="center" alignItems="center" minHeight={10}>
      <Text {...(config?.colors?.accent_orange && { color: config.colors.accent_orange })} bold>
        {notes[frame]} @dcversus/prp
      </Text>
      <Text {...(config?.colors?.muted && { color: config.colors.muted })} dimColor>
        Initializing workspace...
      </Text>
    </Box>
  );
};

export default IntroSequence;
