/**
 * ♫ RoboRolePill Component
 *
 * Colored pill component for agent roles with background color effect
 * where text matches background color for visual "cutout" effect
 */

import React from 'react';
import { Text } from 'ink';
import { RoboRolePillProps } from '../types/TUIConfig.js';
import { getRoleColors } from '../config/TUIConfig.js';

export function RoboRolePill({ role, state = 'idle', size = 'normal' }: RoboRolePillProps) {
  const colors = getRoleColors(role, {} as any); // Will be replaced with actual config

  // Determine colors based on state
  let textColor: string;
  let backgroundColor: string;

  switch (state) {
    case 'active':
      textColor = colors.active;
      backgroundColor = colors.bg;
      break;
    case 'resolved':
      textColor = colors.dim;
      backgroundColor = colors.bg;
      break;
    default: // idle
      textColor = colors.dim;
      backgroundColor = colors.bg;
  }

  // Size variations
  const padding = size === 'small' ? ' ' : '  ';
  const content = role.toUpperCase().replace(/-/g, '-');

  return (
    <Text backgroundColor={backgroundColor} color={textColor}>
      {padding}{content}{padding}
    </Text>
  );
}