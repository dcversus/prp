/**
 * Navigation Bar Component
 *
 * Displays current navigation mode and available keyboard shortcuts
 */

import { Box, Text, useApp } from 'ink';
import { useMemo } from 'react';

import { KeyboardNavigation, type NavigationMode } from '../utils/keyboard-navigation';

import type { TUIConfig } from '../shared/types/TUIConfig';

interface NavigationBarProps {
  mode: NavigationMode;
  config: TUIConfig;
  selectedCount?: number;
  totalCount?: number;
  selectedItem?: string;
}

export const NavigationBar = ({
  mode,
  config,
  selectedCount = 0,
  totalCount = 0,
  selectedItem,
}: NavigationBarProps) => {
  const { exit } = useApp();

  const shortcuts = useMemo(() => {
    const nav = new KeyboardNavigation({ mode });
    return nav.getShortcuts();
  }, [mode]);

  const modeColors: Record<NavigationMode, string> = {
    global: config.colors.base_fg,
    list: config.colors.accent_orange,
    agent: config.colors.role_colors['robo-developer'],
    input: config.colors.role_colors['robo-system-analyst'],
    filter: config.colors.role_colors['robo-aqa'],
  };

  const modeLabels: Record<NavigationMode, string> = {
    global: 'Global',
    list: 'List Navigation',
    agent: 'Agent Control',
    input: 'Input Mode',
    filter: 'Filter Mode',
  };

  const formatShortcuts = () => {
    const entries = Object.entries(shortcuts);
    if (entries.length === 0) return '';

    return entries
      .slice(0, 5) // Show max 5 shortcuts
      .map(([key, desc]) => `${key}:${desc}`)
      .join(' | ');
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={modeColors[mode]}>
      {/* Header */}
      <Box>
        <Text color={modeColors[mode]} bold>
          [{modeLabels[mode]}]
        </Text>
        {mode === 'list' && totalCount > 0 && (
          <Text color={config.colors.muted}>
            {' '}({selectedCount + 1}/{totalCount})
            {selectedItem && ` - ${selectedItem}`}
          </Text>
        )}
      </Box>

      {/* Shortcuts */}
      {formatShortcuts() && (
        <Box>
          <Text color={config.colors.muted} dimColor>
            {formatShortcuts()}
          </Text>
        </Box>
      )}

      {/* Exit hint */}
      <Box justifyContent="flex-end">
        <Text color={config.colors.muted} dimColor>
          Press Q or Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
};