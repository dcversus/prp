/**
 * Multi-Screen Renderer Component
 *
 * Renders multiple TUI screens in a grid layout for wide displays
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Box, Text, useStdoutDimensions } from 'ink';

import { multiScreenLayout, type ScreenId } from '../layout/MultiScreenLayout';

import { NavigationBar } from './NavigationBar';

import type { TUIConfig } from '../../shared/types/TUIConfig';

interface MultiScreenRendererProps {
  config: TUIConfig;
  screens: Map<ScreenId, React.ComponentType<any>>;
  screenProps?: Record<ScreenId, any>;
  showNavigation?: boolean;
  onScreenFocus?: (screenId: ScreenId) => void;
}

export const MultiScreenRenderer = ({
  config,
  screens,
  screenProps = {},
  showNavigation = true,
  onScreenFocus,
}: MultiScreenRendererProps) => {
  const { columns: terminalWidth, rows: terminalHeight } = useStdoutDimensions();
  const [focusedScreen, setFocusedScreen] = useState<ScreenId>('orchestrator');
  const [showLayoutInfo, setShowLayoutInfo] = useState(false);

  // Calculate screen layout
  const screenSlots = useMemo(() => {
    if (!terminalWidth || !terminalHeight) return [];
    return multiScreenLayout.getVisibleScreens(terminalWidth, terminalHeight);
  }, [terminalWidth, terminalHeight]);

  // Get current layout preset
  const currentPreset = useMemo(() => {
    if (!terminalWidth || !terminalHeight) return 'single';
    return multiScreenLayout.calculateLayout(terminalWidth, terminalHeight).name;
  }, [terminalWidth, terminalHeight]);

  // Check if multi-screen is available
  const canUseMultiScreen = useMemo(() => {
    return terminalWidth && terminalHeight
      ? multiScreenLayout.canUseMultiScreen(terminalWidth, terminalHeight)
      : false;
  }, [terminalWidth, terminalHeight]);

  // Render a single screen with border
  const renderScreen = useCallback((slot: any) => {
    const ScreenComponent = screens.get(slot.id);
    if (!ScreenComponent) return null;

    return (
      <Box
        key={slot.id}
        flexDirection="column"
        width={slot.width}
        height={slot.height}
        borderStyle={focusedScreen === slot.id ? 'double' : 'single'}
        borderColor={focusedScreen === slot.id ? config.colors.accent_orange : config.colors.muted}
      >
        {/* Header */}
        <Box paddingX={1} justifyContent="space-between">
          <Text color={focusedScreen === slot.id ? config.colors.accent_orange : config.colors.muted}>
            {slot.title}
          </Text>
          {showLayoutInfo && (
            <Text color={config.colors.muted} dimColor>
              {slot.width}x{slot.height}
            </Text>
          )}
        </Box>

        {/* Screen content */}
        <Box flexGrow={1} paddingX={1}>
          <ScreenComponent
            {...(screenProps[slot.id] || {})}
            config={config}
            focused={focusedScreen === slot.id}
            onFocus={() => {
              setFocusedScreen(slot.id);
              onScreenFocus?.(slot.id);
            }}
          />
        </Box>

        {/* Footer with shortcuts */}
        {focusedScreen === slot.id && (
          <Box paddingX={1}>
            <Text color={config.colors.muted} dimColor>
              Tab to switch | L: Toggle layout | F1-F{screenSlots.length}: Focus screen
            </Text>
          </Box>
        )}
      </Box>
    );
  }, [screens, screenProps, focusedScreen, config, showLayoutInfo, onScreenFocus]);

  // Handle keyboard input for multi-screen navigation
  useEffect(() => {
    const handleKeyPress = (data: Buffer) => {
      const key = data.toString();

      // F1-F9 keys to focus screens
      if (key === '\x1bOP') { // F1
        const firstScreen = screenSlots[0];
        if (firstScreen) {
          setFocusedScreen(firstScreen.id);
          onScreenFocus?.(firstScreen.id);
        }
      } else if (key === '\x1bOQ') { // F2
        if (screenSlots[1]) {
          setFocusedScreen(screenSlots[1].id);
          onScreenFocus?.(screenSlots[1].id);
        }
      } else if (key === '\x1bOR') { // F3
        if (screenSlots[2]) {
          setFocusedScreen(screenSlots[2].id);
          onScreenFocus?.(screenSlots[2].id);
        }
      } else if (key === '\x1bOS') { // F4
        if (screenSlots[3]) {
          setFocusedScreen(screenSlots[3].id);
          onScreenFocus?.(screenSlots[3].id);
        }
      } else if (key === '\x1b[15~') { // F5
        if (screenSlots[4]) {
          setFocusedScreen(screenSlots[4].id);
          onScreenFocus?.(screenSlots[4].id);
        }
      } else if (key === '\x1b[17~') { // F6
        if (screenSlots[5]) {
          setFocusedScreen(screenSlots[5].id);
          onScreenFocus?.(screenSlots[5].id);
        }
      } else if (key === '\x1b[18~') { // F7
        if (screenSlots[6]) {
          setFocusedScreen(screenSlots[6].id);
          onScreenFocus?.(screenSlots[6].id);
        }
      } else if (key === '\x1b[19~') { // F8
        if (screenSlots[7]) {
          setFocusedScreen(screenSlots[7].id);
          onScreenFocus?.(screenSlots[7].id);
        }
      } else if (key === '\x1b[20~') { // F9
        if (screenSlots[8]) {
          setFocusedScreen(screenSlots[8].id);
          onScreenFocus?.(screenSlots[8].id);
        }
      }
      // Tab to cycle through screens
      else if (key === '\t') {
        const currentIndex = screenSlots.findIndex(s => s.id === focusedScreen);
        const nextIndex = (currentIndex + 1) % screenSlots.length;
        const nextScreen = screenSlots[nextIndex];
        if (nextScreen) {
          setFocusedScreen(nextScreen.id);
          onScreenFocus?.(nextScreen.id);
        }
      }
      // L to toggle layout info
      else if (key === 'L' || key === 'l') {
        setShowLayoutInfo(!showLayoutInfo);
      }
    };

    process.stdin.on('data', handleKeyPress);
    return () => {
      process.stdin.off('data', handleKeyPress);
    };
  }, [screenSlots, focusedScreen, onScreenFocus, showLayoutInfo]);

  // If not enough space for multi-screen, fallback to single screen
  if (!canUseMultiScreen) {
    const SingleScreen = screens.get('orchestrator');
    if (!SingleScreen) return null;

    return (
      <Box flexDirection="column" height="100%">
        {showNavigation && (
          <NavigationBar
            mode="global"
            config={config}
            selectedCount={0}
            totalCount={0}
          />
        )}
        <Box flexGrow={1}>
          <SingleScreen {...(screenProps.orchestrator || {})} config={config} />
        </Box>
      </Box>
    );
  }

  // Create layout grid
  const renderLayout = () => {
    // Group screens by row
    const rows = new Map<number, typeof screenSlots>();
    screenSlots.forEach(slot => {
      if (!rows.has(slot.y)) {
        rows.set(slot.y, []);
      }
      rows.get(slot.y)?.push(slot);
    });

    return Array.from(rows.entries()).map(([y, rowScreens]) => (
      <Box key={y} flexDirection="row" flexGrow={1}>
        {rowScreens.map(slot => renderScreen(slot))}
      </Box>
    ));
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between" borderBottom={true}>
        <Text color={config.colors.base_fg} bold>
          Multi-Screen Layout ({currentPreset}) - {terminalWidth}x{terminalHeight}
        </Text>
        <Text color={config.colors.muted}>
          {screenSlots.length} screens | Focused: {focusedScreen}
        </Text>
      </Box>

      {/* Navigation bar */}
      {showNavigation && (
        <NavigationBar
          mode="global"
          config={config}
          selectedCount={screenSlots.findIndex(s => s.id === focusedScreen)}
          totalCount={screenSlots.length}
          selectedItem={focusedScreen}
        />
      )}

      {/* Screen layout */}
      <Box flexGrow={1}>
        {renderLayout()}
      </Box>

      {/* Footer */}
      <Box paddingX={1} borderTop={true}>
        <Text color={config.colors.muted}>
          Press Tab to switch screens | L: Layout info | F1-F{Math.min(screenSlots.length, 9)}: Focus | Q: Exit
        </Text>
      </Box>
    </Box>
  );
};