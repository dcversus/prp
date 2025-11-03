/**
 * ♫ SignalBar Component
 *
 * Displays signal tags with proper coloring and animations
 * supports progress animations and latest signal highlighting
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { SignalBarProps, ColorScheme } from '../types/TUIConfig.js';
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
  const getSignalContent = (signal: { state: string; code: string; message?: string }): string => {
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
              // Use default color scheme since config is not available
        const defaultColors: ColorScheme = {
          // Accent / Orchestrator colors
          accent_orange: '#FF9A38',
          accent_orange_dim: '#C77A2C',
          accent_orange_bg: '#3A2B1F',

          // Role colors (active versions)
          robo_aqa: '#B48EAD',
          robo_quality_control: '#E06C75',
          robo_system_analyst: '#C7A16B',
          robo_developer: '#61AFEF',
          robo_devops_sre: '#98C379',
          robo_ux_ui: '#D19A66',
          robo_legal_compliance: '#C5A3FF',
          orchestrator: '#FF9A38',

          // Role colors (dim versions)
          robo_aqa_dim: '#6E5C69',
          robo_quality_control_dim: '#7C3B40',
          robo_system_analyst_dim: '#7A6445',
          robo_developer_dim: '#3B6D90',
          robo_devops_sre_dim: '#5F7B52',
          robo_ux_ui_dim: '#8A5667',
          robo_legal_compliance_dim: '#705E93',
          orchestrator_dim: '#C77A2C',

          // Role background colors
          robo_aqa_bg: '#2F2830',
          robo_quality_control_bg: '#321E20',
          robo_system_analyst_bg: '#2C2419',
          robo_developer_bg: '#1D2730',
          robo_devops_sre_bg: '#1F2A1F',
          robo_ux_ui_bg: '#2E2328',
          robo_legal_compliance_bg: '#281F35',
          orchestrator_bg: '#3A2B1F',

          // Neutral colors
          base_fg: '#E6E6E6',
          base_bg: '#000000',
          muted: '#9AA0A6',
          error: '#FF5555',
          warn: '#FFCC66',
          ok: '#B8F28E',
          gray: '#6C7078',

          // Signal colors
          signal_braces: '#FFB56B',
          signal_placeholder: '#6C7078'
        };
        const letterColor = getSignalColor(signal.code, signal.state, defaultColors);
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