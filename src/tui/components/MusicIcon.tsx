/**
 * ♫ MusicIcon Component
 *
 * Animated music symbol status indicators using Unicode symbols
 * with animation support for different agent states and melody synchronization
 */

import React, { useState, useEffect, useRef } from 'react';
import { Text } from 'ink';
import { MusicIconProps, AgentStatus } from '../types/TUIConfig.js';
import { useAnimationEngine, AnimationType } from '../animation/AnimationEngine.js';

// Animation frame definitions for different agent states
const ANIMATION_FRAMES: Record<AgentStatus, string[]> = {
  SPAWNING: ['♪', '♩', '♪', '♬'],    // Spawn animation sequence
  RUNNING: ['♪', '♬', '♫', '♬'],    // Working melody (4 fps loop)
  IDLE: ['♫', ' '],                 // Idle blink at melody beat
  ERROR: ['⚠', '⚠️', ' ']          // Error warning blink
};

// Animation types for engine integration
const ANIMATION_TYPES: Record<AgentStatus, AnimationType> = {
  SPAWNING: 'spawn',
  RUNNING: 'melody',
  IDLE: 'idle',
  ERROR: 'error'
};

// Color mappings for different statuses
const STATUS_COLORS = {
  SPAWNING: '#FFCC66',    // Yellow/orange for spawning
  RUNNING: '#B8F28E',     // Green for active work
  IDLE: '#9AA0A6',        // Gray for idle
  ERROR: '#FF5555'        // Red for errors
} as const;

// Size configurations
const SIZE_CONFIGS = {
  small: { symbol: '', padding: 0 },
  normal: { symbol: '', padding: 1 },
  large: { symbol: '', padding: 2 }
} as const;

export function MusicIcon({ status, animate = true, size = 'normal' }: MusicIconProps) {
  const { engine, registerSignalAnimation, getCurrentBeat } = useAnimationEngine();
  const [currentSymbol, setCurrentSymbol] = useState(ANIMATION_FRAMES[status][0]);
  const animationIdRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);

  // Generate unique animation ID for this component instance
  const animationId = `music-icon-${status}-${Math.random().toString(36).substr(2, 9)}`;

  // Register animation with the global engine
  useEffect(() => {
    if (!isMountedRef.current) return;

    animationIdRef.current = animationId;

    if (animate) {
      const animationType = ANIMATION_TYPES[status];
      const code = `music-${status.toLowerCase()}`;

      registerSignalAnimation(animationId, code, animationType);

      // Listen for frame updates from the animation engine
      const handleFrame = ({ id, frame }: { id: string; frame: string }) => {
        if (id === animationId && isMountedRef.current) {
          setCurrentSymbol(frame);
        }
      };

      const handleMelodyBeat = () => {
        // Special handling for melody-synced animations
        if ((status === 'IDLE' || status === 'RUNNING') && isMountedRef.current) {
          const beat = getCurrentBeat();
          if (beat) {
            const targetFrame = beat.isOnBeat ? 0 : 1;
            const frames = ANIMATION_FRAMES[status];
            if (frames[targetFrame]) {
              setCurrentSymbol(frames[targetFrame]);
            }
          }
        }
      };

      engine.on('animationFrame', handleFrame);
      engine.on('melodyBeat', handleMelodyBeat);

      return () => {
        engine.off('animationFrame', handleFrame);
        engine.off('melodyBeat', handleMelodyBeat);
        engine.removeAnimation(animationId);
      };
    } else {
      // Static display when animation is disabled
      setCurrentSymbol(ANIMATION_FRAMES[status][0]);
    }
  }, [animate, status, animationId, engine, registerSignalAnimation, getCurrentBeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (animationIdRef.current) {
        engine.removeAnimation(animationIdRef.current);
      }
    };
  }, [engine]);

  // Get size-specific styling
  const getSizeStyling = (): string => {
    const config = SIZE_CONFIGS[size];
    const padding = ' '.repeat(config.padding);
    return `${currentSymbol}${padding}`;
  };

  // Get color based on status
  const getStatusColor = (): string => {
    return STATUS_COLORS[status] || STATUS_COLORS.IDLE;
  };

  // Determine if icon should be bold
  const shouldBold = status === 'RUNNING';

  return (
    <Text
      color={getStatusColor()}
      bold={shouldBold}
      dimColor={status === 'IDLE'}
    >
      {getSizeStyling()}
    </Text>
  );
}

/**
 * Optimized MusicIcon component for use in lists with many agents
 * Uses React.memo to prevent unnecessary re-renders
 */
export const OptimizedMusicIcon = React.memo(MusicIcon, (prevProps, nextProps) => {
  return (
    prevProps.status === nextProps.status &&
    prevProps.animate === nextProps.animate &&
    prevProps.size === nextProps.size
  );
});

/**
 * Hook for creating music icon with custom configuration
 */
export function useMusicIcon(
  status: AgentStatus,
  options: {
    animate?: boolean;
    size?: 'small' | 'normal' | 'large';
    customFrames?: string[];
    customColors?: Partial<typeof STATUS_COLORS>;
  } = {}
) {
  const { animate = true, size = 'normal', customFrames, customColors } = options;
  const { engine } = useAnimationEngine();

  // Use custom frames if provided, otherwise use defaults
  const frames = customFrames || ANIMATION_FRAMES[status];
  const color = customColors?.[status] || STATUS_COLORS[status];

  // Register custom animation if needed
  useEffect(() => {
    if (customFrames && animate) {
      const customAnimationId = `custom-music-${Math.random().toString(36).substr(2, 9)}`;

      // Create custom animation with user-defined frames
      const state = {
        code: `custom-${status.toLowerCase()}`,
        currentFrame: 0,
        frames: customFrames,
        isAnimating: true,
        startTime: Date.now(),
        lastUpdate: Date.now(),
        direction: 'forward' as const
      };

      // Manually trigger frame updates for custom animation
      const interval = setInterval(() => {
        state.currentFrame = (state.currentFrame + 1) % state.frames.length;
        // Emit custom frame event
        engine.emit('animationFrame', {
          id: customAnimationId,
          frame: state.frames[state.currentFrame],
          frameIndex: state.currentFrame,
          state
        });
      }, 1000 / 8); // 8 fps for custom animations

      return () => {
        clearInterval(interval);
      };
    }
  }, [status, customFrames, animate, engine]);

  return {
    frames,
    color,
    animate,
    size
  };
}

// Export types for external use
export type { MusicIconProps, AgentStatus };

// Export configuration for other components
export { ANIMATION_FRAMES, ANIMATION_TYPES, STATUS_COLORS };