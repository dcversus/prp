/**
 * ♫ SignalBar Component
 *
 * Displays signal tags with proper coloring and animations
 * supports progress animations and latest signal highlighting
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { SignalBarProps } from '../types/TUIConfig.js';
import { getSignalColor } from '../config/TUIConfig.js';

export function SignalBar({ signals, animate = true }: SignalBarProps) {
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animation for progress signals like [FF]
  useEffect(() => {
    if (!animate) return;

    const hasProgressSignals = signals.some(s => s.state === 'progress');
    if (!hasProgressSignals) return;

    const timer = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 125); // 8 fps

    return () => clearInterval(timer);
  }, [signals, animate]);

  // Get animated signal content
  const getSignalContent = (signal: any): string => {
    if (signal.state === 'progress' && signal.code === '[FF]') {
      // Animate [F ] → [  ] → [ F] → [FF]
      const frames = ['[F ]', '[  ]', '[ F]', '[FF]'];
      return frames[animationFrame];
    }

    if (signal.state === 'progress' && signal.code === '[  ]') {
      // Dispatch loop animation: [  ] → [ ♫] → [♫♫] → [♫ ] → [  ]
      const frames = ['[  ]', '[ ♫]', '[♫♫]', '[♫ ]'];
      return frames[animationFrame];
    }

    return signal.code;
  };

  return (
    <Text>
      {' '}
      {signals.map((signal, index) => {
        const content = getSignalContent(signal);
        const letterColor = getSignalColor(signal.code, signal.state, {} as any); // Will be replaced with actual config
        const braceColor = signal.state === 'active' ? '#FFB56B' : '#6C7078';
        const isLatest = signal.latest;

        return (
          <Text key={index} bold={isLatest}>
            <Text color={braceColor}>[</Text>
            <Text color={letterColor}>{content.slice(1, -1)}</Text>
            <Text color={braceColor}>]</Text>
          </Text>
        );
      })}
      {' '}
    </Text>
  );
}