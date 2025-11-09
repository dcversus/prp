/**
 * ♫ TUI Responsive Layout Engine
 *
 * Core layout system with breakpoint-based responsive design
 * and adaptive screen management for different terminal sizes
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, BoxProps } from 'ink';
import type { TUIConfig, TerminalLayout, LayoutMode, ScreenType } from '../types/TUIConfig.js';

export interface ResponsiveLayoutProps {
  config: TUIConfig;
  currentScreen: ScreenType;
  children: React.ReactNode;
  onResize?: (layout: TerminalLayout) => void;
  onScreenChange?: (screen: ScreenType) => void;
}

export interface LayoutDimensions {
  mainWidth: number;
  rightPanelWidth: number;
  leftMargin: number;
  rightMargin: number;
  headerHeight: number;
  footerHeight: number;
  contentHeight: number;
}

export interface ScreenLayout {
  mode: LayoutMode;
  dimensions: LayoutDimensions;
  showRightPanel: boolean;
  showLeftPanel: boolean;
  multiScreen: boolean;
}

/**
 * Calculate layout dimensions based on terminal size and breakpoints
 */
export function calculateLayout(
  terminalWidth: number,
  terminalHeight: number,
  config: TUIConfig
): ScreenLayout {
  const { breakpoints, padding } = config.layout;

  // Determine layout mode
  let mode: LayoutMode;
  if (terminalWidth < breakpoints.compact) {
    mode = 'compact';
  } else if (terminalWidth < breakpoints.normal) {
    mode = 'normal';
  } else if (terminalWidth < breakpoints.wide) {
    mode = 'wide';
  } else {
    mode = 'ultrawide';
  }

  // Calculate base dimensions
  const leftMargin = padding.horizontal;
  const rightMargin = padding.horizontal;
  const headerHeight = 3;
  const footerHeight = 3;
  const contentHeight = terminalHeight - headerHeight - footerHeight - (padding.vertical * 2);

  // Calculate panel widths based on mode
  let mainWidth: number;
  let rightPanelWidth: number;
  let showRightPanel: boolean;
  let showLeftPanel: boolean;
  let multiScreen: boolean;

  switch (mode) {
    case 'compact':
      // Single column layout
      mainWidth = terminalWidth - (leftMargin + rightMargin);
      rightPanelWidth = 0;
      showRightPanel = false;
      showLeftPanel = false;
      multiScreen = false;
      break;

    case 'normal':
      // Main + compressed right panel
      rightPanelWidth = Math.min(30, Math.floor(terminalWidth * 0.2));
      mainWidth = terminalWidth - rightPanelWidth - (leftMargin + rightMargin);
      showRightPanel = true;
      showLeftPanel = false;
      multiScreen = false;
      break;

    case 'wide':
      // Main + full right panel
      rightPanelWidth = Math.min(40, Math.floor(terminalWidth * 0.25));
      mainWidth = terminalWidth - rightPanelWidth - (leftMargin + rightMargin);
      showRightPanel = true;
      showLeftPanel = false;
      multiScreen = false;
      break;

    case 'ultrawide':
      // Multi-screen layout: left | main | right
      const leftPanelWidth = Math.min(50, Math.floor(terminalWidth * 0.2));
      rightPanelWidth = Math.min(50, Math.floor(terminalWidth * 0.2));
      mainWidth = terminalWidth - leftPanelWidth - rightPanelWidth - (leftMargin + rightMargin);
      showLeftPanel = true;
      showRightPanel = true;
      multiScreen = true;
      break;

    default:
      // Fallback to compact
      mainWidth = terminalWidth - (leftMargin + rightMargin);
      rightPanelWidth = 0;
      showRightPanel = false;
      showLeftPanel = false;
      multiScreen = false;
      break;
  }

  return {
    mode,
    dimensions: {
      mainWidth,
      rightPanelWidth,
      leftMargin,
      rightMargin,
      headerHeight,
      footerHeight,
      contentHeight
    },
    showRightPanel,
    showLeftPanel,
    multiScreen
  };
}

/**
 * Hook for responsive layout management
 */
export function useResponsiveLayout(config: TUIConfig) {
  const [terminalLayout, setTerminalLayout] = useState<TerminalLayout>(() => {
    const { columns, rows } = process.stdout;
    return {
      columns,
      rows,
      layoutMode: 'compact',
      availableWidth: columns - (config.layout.padding.horizontal * 2),
      availableHeight: rows - (config.layout.padding.vertical * 2) - 7, // header + footer + margins
      padding: config.layout.padding
    };
  });

  const [screenLayout, setScreenLayout] = useState<ScreenLayout>(() =>
    calculateLayout(process.stdout.columns, process.stdout.rows, config)
  );

  const handleResize = useCallback(() => {
    const { columns: newWidth, rows: newHeight } = process.stdout;

    setTerminalLayout(prev => ({
      ...prev,
      columns: newWidth,
      rows: newHeight,
      layoutMode: screenLayout.mode,
      availableWidth: newWidth - (config.layout.padding.horizontal * 2),
      availableHeight: newHeight - (config.layout.padding.vertical * 2) - 7
    }));

    setScreenLayout(calculateLayout(newWidth, newHeight, config));
  }, [config, screenLayout.mode]);

  // Listen for terminal resize events
  useEffect(() => {
    if (process.stdout.isTTY) {
      process.stdout.on('resize', handleResize);
      return () => {
        process.stdout.off('resize', handleResize);
      };
    }
  }, [handleResize]);

  return {
    terminalLayout,
    screenLayout,
    handleResize
  };
}

/**
 * Responsive layout container component
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  config,
  currentScreen,
  children,
  onResize,
  onScreenChange
}) => {
  const { terminalLayout, screenLayout, handleResize } = useResponsiveLayout(config);

  // Trigger resize callback
  useEffect(() => {
    onResize?.(terminalLayout);
  }, [terminalLayout, onResize]);

  // Handle screen changes
  useEffect(() => {
    onScreenChange?.(currentScreen);
  }, [currentScreen, onScreenChange]);

  const { dimensions, showLeftPanel, showRightPanel, multiScreen } = screenLayout;
  const {
    mainWidth,
    rightPanelWidth,
    leftMargin,
    rightMargin,
    headerHeight,
    footerHeight,
    contentHeight
  } = dimensions;

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Header */}
      <Box
        height={headerHeight}
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Header content will be passed as children */}
      </Box>

      {/* Main Content Area */}
      <Box
        flexGrow={1}
        flexDirection="row"
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
      >
        {/* Left Panel (ultrawide mode) */}
        {showLeftPanel && (
          <Box
            width={mainWidth * 0.3}
            paddingRight={1}
            flexDirection="column"
          >
            {/* Left panel content */}
          </Box>
        )}

        {/* Main Content */}
        <Box
          flexGrow={1}
          flexDirection="column"
          height={contentHeight}
        >
          {children}
        </Box>

        {/* Right Panel */}
        {showRightPanel && (
          <Box
            width={rightPanelWidth}
            paddingLeft={1}
            flexDirection="column"
          >
            {/* Right panel content (PRP list) */}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        height={footerHeight}
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Footer content will be passed as children */}
      </Box>
    </Box>
  );
};

/**
 * Layout component for orchestrator screen
 */
export const OrchestratorLayout: React.FC<{
  config: TUIConfig;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  rightPanelContent?: React.ReactNode;
}> = ({ config, children, headerContent, footerContent, rightPanelContent }) => {
  const { screenLayout } = useResponsiveLayout(config);
  const { dimensions, showRightPanel } = screenLayout;
  const { leftMargin, rightMargin } = dimensions;

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Header with branding */}
      <Box
        height={3}
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
        justifyContent="space-between"
        alignItems="center"
        borderColor={config.colors.signal_braces}
        borderStyle="round"
      >
        {headerContent}
      </Box>

      {/* Main Content Area */}
      <Box
        flexGrow={1}
        flexDirection="row"
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
      >
        {/* Main Content */}
        <Box
          flexGrow={1}
          flexDirection="column"
        >
          {children}
        </Box>

        {/* Right Panel - PRP List */}
        {showRightPanel && rightPanelContent && (
          <Box
            width={dimensions.rightPanelWidth}
            paddingLeft={1}
            flexDirection="column"
          >
            {rightPanelContent}
          </Box>
        )}
      </Box>

      {/* Footer with input and status */}
      <Box
        height={3}
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
        justifyContent="space-between"
        alignItems="center"
        borderTop={true}
        borderColor={config.colors.signal_braces}
      >
        {footerContent}
      </Box>
    </Box>
  );
};

/**
 * Layout component for split screens (PRP Context, Agent, Token Metrics)
 */
export const SplitLayout: React.FC<{
  config: TUIConfig;
  leftContent: React.ReactNode;
  rightContent?: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}> = ({ config, leftContent, rightContent, headerContent, footerContent }) => {
  const { screenLayout } = useResponsiveLayout(config);
  const { dimensions } = screenLayout;
  const { leftMargin, rightMargin, mainWidth, rightPanelWidth } = dimensions;

  const hasRightContent = rightContent && rightPanelWidth > 0;

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Header */}
      <Box
        height={3}
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
        justifyContent="space-between"
        alignItems="center"
      >
        {headerContent}
      </Box>

      {/* Split Content */}
      <Box
        flexGrow={1}
        flexDirection="row"
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
      >
        {/* Left/Primary Content */}
        <Box
          width={hasRightContent ? mainWidth : '100%'}
          flexDirection="column"
          paddingRight={hasRightContent ? 1 : 0}
        >
          {leftContent}
        </Box>

        {/* Right/Secondary Content */}
        {hasRightContent && (
          <Box
            width={rightPanelWidth}
            flexDirection="column"
            borderLeft={true}
            borderColor={config.colors.signal_placeholder}
          >
            {rightContent}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        height={3}
        paddingLeft={leftMargin}
        paddingRight={rightMargin}
        justifyContent="space-between"
        alignItems="center"
        borderTop={true}
        borderColor={config.colors.signal_braces}
      >
        {footerContent}
      </Box>
    </Box>
  );
};

/**
 * Layout utilities for responsive design
 */
export const LayoutUtils = {
  /**
   * Get responsive class names for different breakpoints
   */
  getResponsiveClass: (mode: LayoutMode) => {
    const baseClass = 'tui-layout';
    return `${baseClass} ${baseClass}--${mode}`;
  },

  /**
   * Calculate optimal text truncation based on available width
   */
  getTruncateLength: (availableWidth: number, reserveWidth: number = 10) => {
    return Math.max(20, availableWidth - reserveWidth);
  },

  /**
   * Determine if multi-screen layout is appropriate
   */
  shouldUseMultiScreen: (terminalWidth: number, minMainWidth: number = 80) => {
    return terminalWidth >= (minMainWidth * 2) + 20; // Main + Main + Gutters
  },

  /**
   * Get optimal panel sizing for given terminal dimensions
   */
  getOptimalPanelSize: (
    terminalWidth: number,
    minMainWidth: number = 80,
    maxPanelWidth: number = 60
  ) => {
    const availableWidth = terminalWidth - minMainWidth;
    const panelWidth = Math.min(maxPanelWidth, Math.floor(availableWidth / 2));

    return {
      mainWidth: terminalWidth - panelWidth,
      panelWidth: Math.max(20, panelWidth)
    };
  }
};

export default ResponsiveLayout;