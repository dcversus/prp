/**
 * ♫ GenerationProgress - Real-time generation progress component
 *
 * Tracks file copying, generation steps, diff snapshots,
 * and CoT (Chain of Thought) progress with visual feedback
 */
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Import types
import type { GenerationProgressProps, GenerationEvent } from './types';

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  isActive,
  events,
  onCancel,
  config,
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animation frame updates
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 200);

    return () => clearInterval(interval);
  }, [isActive]);

  // Get latest event
  const latestEvent = events[events.length - 1];
  const isComplete = latestEvent?.type === 'complete';
  const hasError = latestEvent?.type === 'error';

  // Animation characters
  const spinner = ['⠋', '⠙', '⠹', '⠸'][animationFrame];

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text {...(config?.colors?.accent_orange && { color: config.colors.accent_orange })} bold>
          {isComplete ? '✓' : hasError ? '✗' : spinner} Generation Progress
        </Text>
        {onCancel && !isComplete && !hasError && (
          <Text {...(config?.colors?.muted && { color: config.colors.muted })}>
            [Ctrl+C] Cancel
          </Text>
        )}
      </Box>

      {/* Progress visualization */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={config?.colors?.gray}
        padding={1}
      >
        {/* Current status */}
        <Box flexDirection="row" marginBottom={1}>
          <Text
            {...({
              color: isComplete
                ? config?.colors?.ok
                : hasError
                  ? config?.colors?.error
                  : config?.colors?.accent_orange,
            } as { color?: string })}
          >
            {isComplete
              ? '✓ Generation Complete'
              : hasError
                ? '✗ Generation Failed'
                : `${spinner} Generating files...`}
          </Text>
        </Box>

        {/* Recent events */}
        <Box flexDirection="column">
          <Text {...(config?.colors?.muted && { color: config.colors.muted })} dimColor>
            Recent Activity:
          </Text>
          {events.slice(-5).map((event: GenerationEvent, index: number) => (
            <Box key={index} flexDirection="row" marginTop={1}>
              <Text
                {...({
                  color:
                    event.type === 'complete'
                      ? config?.colors?.ok
                      : event.type === 'error'
                        ? config?.colors?.error
                        : event.type === 'copy'
                          ? config?.colors?.accent_orange
                          : config?.colors?.muted,
                } as { color?: string })}
              >
                {event.type === 'complete'
                  ? '✓'
                  : event.type === 'error'
                    ? '✗'
                    : event.type === 'copy'
                      ? '⚙'
                      : '○'}{' '}
                {event.path || event.content?.substring(0, 30) || 'Processing...'}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Footer */}
      {isComplete && (
        <Box flexDirection="row" justifyContent="center" marginTop={1}>
          <Text {...(config?.colors?.ok && { color: config.colors.ok })}>
            ✓ Project generation completed successfully
          </Text>
        </Box>
      )}

      {hasError && (
        <Box flexDirection="row" justifyContent="center" marginTop={1}>
          <Text {...(config?.colors?.error && { color: config.colors.error })}>
            ✗ Generation failed. Check the error details above.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default GenerationProgress;
