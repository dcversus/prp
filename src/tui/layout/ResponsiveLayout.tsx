/**
 * ♫ Enhanced TUI Responsive Layout Engine
 *
 * Core layout system implementing exact PRP-000-agents05.md specifications:
 * - Responsive from ~80 cols to 8K with automatic reflow
 * - Compact mode (agent logs only) to ultrawide (all screens visible)
 * - Dynamic panel sizing and multi-screen layouts
 * - Integration with design tokens and animation system
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, BoxProps } from 'ink';

import type { TUIConfig, ScreenType, LayoutMode } from '../../shared/types/TUIConfig';

interface TerminalLayout {
  columns: number;
  rows: number;
  layoutMode: LayoutMode;
  availableWidth: number;
  availableHeight: number;
  padding: {
    horizontal: number;
    vertical: number;
  };
}

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
  // Enhanced PRP-specific responsive properties
  responsive: {
    agentCardsMax: number;
    historyLines: number;
    infoColumns: number;
    allScreensVisible: boolean;
    leftPanelWidth: number;
  };
}

/**
 * Calculate layout dimensions based on terminal size and breakpoints
 * Enhanced with exact PRP-000-agents05.md responsive specifications
 */
export function calculateLayout(
  terminalWidth: number,
  terminalHeight: number,
  config: TUIConfig,
): ScreenLayout {
  // Use exact PRP breakpoints: ~80, 120, 160, 240 columns
  let mode: LayoutMode;
  if (terminalWidth < 80) {
    mode = 'compact';
  } else if (terminalWidth < 120) {
    mode = 'normal';
  } else if (terminalWidth < 160) {
    mode = 'wide';
  } else {
    mode = 'ultrawide';
  }

  // Calculate base dimensions using PRP panel specifications
  const leftMargin = 2; // From design tokens
  const rightMargin = 2;
  const headerHeight = 4; // From design tokens
  const footerHeight = 4; // From design tokens
  const contentHeight = terminalHeight - headerHeight - footerHeight - 2; // Vertical padding

  // Calculate panel widths based on exact PRP responsive strategies
  let mainWidth: number;
  let rightPanelWidth: number;
  let leftPanelWidth = 0;
  let showRightPanel: boolean;
  let showLeftPanel: boolean;
  let multiScreen: boolean;
  let agentCardsMax: number;
  let historyLines: number;
  let infoColumns: number;
  let allScreensVisible: boolean;

  switch (mode) {
    case 'compact':
      // PRP: Compact orchestrator with ONLY agents-logs
      mainWidth = terminalWidth - (leftMargin + rightMargin);
      rightPanelWidth = 0;
      showRightPanel = false;
      showLeftPanel = false;
      multiScreen = false;
      agentCardsMax = 3;
      historyLines = 3;
      infoColumns = 1;
      allScreensVisible = false;
      break;

    case 'normal':
      // PRP: Main + compressed right panel
      rightPanelWidth = 35; // Fixed from PRP spec
      mainWidth = terminalWidth - rightPanelWidth - (leftMargin + rightMargin);
      showRightPanel = true;
      showLeftPanel = false;
      multiScreen = false;
      agentCardsMax = 5;
      historyLines = 5;
      infoColumns = 1;
      allScreensVisible = false;
      break;

    case 'wide':
      // PRP: Main + right always visible
      rightPanelWidth = 40; // Fixed from PRP spec
      mainWidth = terminalWidth - rightPanelWidth - (leftMargin + rightMargin);
      showRightPanel = true;
      showLeftPanel = false;
      multiScreen = false;
      agentCardsMax = 8;
      historyLines = 8;
      infoColumns = 2; // 2 columns for info screen
      allScreensVisible = false;
      break;

    case 'ultrawide':
      // PRP: All screens + agent logs in single layout
      // Three-column layout: Orchestrator | Info | Agent
      leftPanelWidth = Math.floor(terminalWidth * 0.35);
      rightPanelWidth = Math.floor(terminalWidth * 0.35);
      mainWidth = terminalWidth - leftPanelWidth - rightPanelWidth - (leftMargin + rightMargin + 4); // 4 for gutters
      showLeftPanel = true;
      showRightPanel = true;
      multiScreen = true;
      agentCardsMax = 12;
      historyLines = 10;
      infoColumns = 3; // 3 columns for info screen
      allScreensVisible = true;
      break;

    default:
      // Fallback to compact
      mainWidth = terminalWidth - (leftMargin + rightMargin);
      rightPanelWidth = 0;
      leftPanelWidth = 0;
      showRightPanel = false;
      showLeftPanel = false;
      multiScreen = false;
      agentCardsMax = 3;
      historyLines = 3;
      infoColumns = 1;
      allScreensVisible = false;
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
      contentHeight,
    },
    showRightPanel,
    showLeftPanel,
    multiScreen,
    // Enhanced PRP-specific layout properties
    responsive: {
      agentCardsMax,
      historyLines,
      infoColumns,
      allScreensVisible,
      leftPanelWidth,
    },
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
      availableWidth: columns - config.layout.padding.horizontal * 2,
      availableHeight: rows - config.layout.padding.vertical * 2 - 7, // header + footer + margins
      padding: config.layout.padding,
    };
  });

  const [screenLayout, setScreenLayout] = useState<ScreenLayout>(() =>
    calculateLayout(process.stdout.columns, process.stdout.rows, config),
  );

  const handleResize = useCallback(() => {
    const { columns: newWidth, rows: newHeight } = process.stdout;

    setTerminalLayout((prev) => ({
      ...prev,
      columns: newWidth,
      rows: newHeight,
      layoutMode: screenLayout.mode,
      availableWidth: newWidth - config.layout.padding.horizontal * 2,
      availableHeight: newHeight - config.layout.padding.vertical * 2 - 7,
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
    handleResize,
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
  onScreenChange,
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

  const { dimensions, showLeftPanel, showRightPanel, multiScreen, responsive } = screenLayout;
  const {
    mainWidth,
    rightPanelWidth,
    leftMargin,
    rightMargin,
    headerHeight,
    footerHeight,
    contentHeight,
  } = dimensions;

  // For ultrawide mode with all screens visible, create three-column layout
  if (responsive.allScreensVisible && multiScreen) {
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

        {/* Three-Column Content Area for Ultrawide */}
        <Box flexGrow={1} flexDirection="row" paddingLeft={leftMargin} paddingRight={rightMargin}>
          {/* Left Panel - Orchestrator Screen */}
          <Box
            width={responsive.leftPanelWidth}
            paddingRight={1}
            flexDirection="column"
            borderStyle="single"
            borderColor={config.colors.neutrals.subtle}
          >
            <Box height={1} flexDirection="row" justifyContent="center" marginBottom={1}>
              <Text color={config.colors.accent.orange} bold>
                ♫ Orchestrator
              </Text>
            </Box>
            {/* Orchestrator content */}
          </Box>

          {/* Center Panel - Info Screen */}
          <Box
            width={mainWidth}
            paddingLeft={1}
            paddingRight={1}
            flexDirection="column"
            borderStyle="single"
            borderColor={config.colors.neutrals.subtle}
          >
            <Box height={1} flexDirection="row" justifyContent="center" marginBottom={1}>
              <Text color={config.colors.accent.orange} bold>
                ♫ Info
              </Text>
            </Box>
            {/* Info screen content - 3 column layout */}
            <Box flexDirection="row" flexGrow={1}>
              {/* PRP Context, Signals, Shared Context columns */}
              {[1, 2, 3].map((colIndex) => (
                <Box
                  key={colIndex}
                  flexGrow={1}
                  paddingRight={colIndex < 3 ? 1 : 0}
                  flexDirection="column"
                >
                  {/* Column content */}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right Panel - Agent Logs */}
          <Box
            width={rightPanelWidth}
            paddingLeft={1}
            flexDirection="column"
            borderStyle="single"
            borderColor={config.colors.neutrals.subtle}
          >
            <Box height={1} flexDirection="row" justifyContent="center" marginBottom={1}>
              <Text color={config.colors.accent.orange} bold>
                ♫ Agents
              </Text>
            </Box>
            {/* Agent logs content */}
          </Box>
        </Box>

        {/* Footer */}
        <Box
          height={footerHeight}
          paddingLeft={leftMargin}
          paddingRight={rightMargin}
          justifyContent="space-between"
          alignItems="center"
          borderTop={true}
          borderColor={config.colors.neutrals.subtle}
        >
          {/* Footer content will be passed as children */}
        </Box>
      </Box>
    );
  }

  // Standard layout for compact, normal, and wide modes
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
      <Box flexGrow={1} flexDirection="row" paddingLeft={leftMargin} paddingRight={rightMargin}>
        {/* Left Panel (ultrawide mode, non-all-screens) */}
        {showLeftPanel && (
          <Box width={responsive.leftPanelWidth} paddingRight={1} flexDirection="column">
            {/* Left panel content */}
          </Box>
        )}

        {/* Main Content */}
        <Box flexGrow={1} flexDirection="column" height={contentHeight}>
          {children}
        </Box>

        {/* Right Panel */}
        {showRightPanel && (
          <Box width={rightPanelWidth} paddingLeft={1} flexDirection="column">
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
        borderTop={true}
        borderColor={config.colors.neutrals.subtle}
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
      <Box flexGrow={1} flexDirection="row" paddingLeft={leftMargin} paddingRight={rightMargin}>
        {/* Main Content */}
        <Box flexGrow={1} flexDirection="column">
          {children}
        </Box>

        {/* Right Panel - PRP List */}
        {showRightPanel && rightPanelContent && (
          <Box width={dimensions.rightPanelWidth} paddingLeft={1} flexDirection="column">
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
      <Box flexGrow={1} flexDirection="row" paddingLeft={leftMargin} paddingRight={rightMargin}>
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
  getTruncateLength: (availableWidth: number, reserveWidth = 10) => {
    return Math.max(20, availableWidth - reserveWidth);
  },

  /**
   * Determine if multi-screen layout is appropriate
   */
  shouldUseMultiScreen: (terminalWidth: number, minMainWidth = 80) => {
    return terminalWidth >= minMainWidth * 2 + 20; // Main + Main + Gutters
  },

  /**
   * Get optimal panel sizing for given terminal dimensions
   */
  getOptimalPanelSize: (terminalWidth: number, minMainWidth = 80, maxPanelWidth = 60) => {
    const availableWidth = terminalWidth - minMainWidth;
    const panelWidth = Math.min(maxPanelWidth, Math.floor(availableWidth / 2));

    return {
      mainWidth: terminalWidth - panelWidth,
      panelWidth: Math.max(20, panelWidth),
    };
  },
};

export default ResponsiveLayout;
