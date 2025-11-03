/**
 * ♫ MusicIcon Component
 *
 * Animated music symbol status indicators using Unicode symbols
 * with animation support for different agent states
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { MusicIconProps } from '../types/TUIConfig.js';

export function MusicIcon({ status, animate = true, size = 'normal' }: MusicIconProps) {
  const [frame, setFrame] = useState(0);
  const [currentSymbol, setCurrentSymbol] = useState(getInitialSymbol(status));

  // Animation frames for different states
  const getAnimationFrames = (agentStatus: string): string[] => {
    switch (agentStatus) {
      case 'SPAWNING':
        return ['♪  ', '♩  ', '♪  ']; // 2 Hz animation
      case 'RUNNING':
        return ['♪', '♬', '♫', '♬']; // 4 fps loop
      case 'IDLE':
        return ['♫', ' ']; // Blink at beat frequency
      case 'ERROR':
        return ['♫', ' ']; // 1 Hz blink with error
      default:
        return ['♫'];
    }
  };

  function getInitialSymbol(agentStatus: string): string {
    switch (agentStatus) {
      case 'SPAWNING':
        return '♪';
      case 'RUNNING':
        return '♪';
      case 'IDLE':
        return '♫';
      case 'ERROR':
        return '♫';
      default:
        return '♫';
    }
  }

  // Animation loop
  useEffect(() => {
    if (!animate) {
      setCurrentSymbol(getInitialSymbol(status));
      return;
    }

    const frames = getAnimationFrames(status);
    const fps = status === 'SPAWNING' ? 2 : (status === 'RUNNING' ? 4 : 1);
    const interval = 1000 / fps;

    const timer = setInterval(() => {
      setFrame((prev) => {
        const nextFrame = (prev + 1) % frames.length;
        setCurrentSymbol(frames[nextFrame]);
        return nextFrame;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [status, animate]);

  // Size variations
  const getSizeStyling = (iconSize: string) => {
    switch (iconSize) {
      case 'small':
        return currentSymbol;
      case 'large':
        return `${currentSymbol} `;
      default:
        return currentSymbol;
    }
  };

  // Color based on status
  const getColor = () => {
    switch (status) {
      case 'ERROR':
        return '#FF5555';
      case 'SPAWNING':
        return '#FFCC66';
      case 'RUNNING':
        return '#B8F28E';
      case 'IDLE':
        return '#9AA0A6';
      default:
        return '#E6E6E6';
    }
  };

  return (
    <Text color={getColor()} bold={status === 'RUNNING'}>
      {getSizeStyling(size)}
    </Text>
  );
}