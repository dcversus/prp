/**
 * ♫ TUI Theme Provider
 *
 * Provides design tokens and theme context to all TUI components.
 * Implements day/night theme switching and responsive breakpoints.
 */

import React, { createContext, useContext, useEffect, useState, JSX } from 'react';
import { Box } from 'ink';

import { tokens } from './design-tokens';

import type { DesignTokens } from './design-tokens';
import type { ReactNode } from 'react';

export interface ThemeContextValue {
  tokens: DesignTokens;
  mode: 'day' | 'night';
  breakpoint: 'compact' | 'standard' | 'wide' | 'ultra_wide';
  columns: number;
  rows: number;
  colors: DesignTokens['colors'];
  spacing: DesignTokens['spacing'];
  fonts: DesignTokens['fonts'];
  animations: DesignTokens['animations'];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  mode?: 'day' | 'night';
  autoDetect?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  mode: initialMode = 'day',
  autoDetect = true,
}) => {
  const [mode, setMode] = useState<'day' | 'night'>(initialMode);
  const [breakpoint, setBreakpoint] = useState<ThemeContextValue['breakpoint']>('standard');
  const [dimensions, setDimensions] = useState({ columns: 100, rows: 30 });

  // Auto-detect terminal capabilities
  useEffect(() => {
    if (!autoDetect) {
      return;
    }

    // Detect TrueColor support
    const _trueColorSupported =
      process.env.COLORTERM === 'truecolor' ||
      process.env.TERM_PROGRAM === 'vscode' ||
      process.env.TERM_PROGRAM === 'Hyper' ||
      process.env.TERM === 'xterm-256color';

    // Auto-switch to night mode based on system time or terminal theme
    const hour = new Date().getHours();
    const shouldNight = hour < 6 || hour > 20;

    if (shouldNight && mode === 'day') {
      setMode('night');
    }

    // Detect terminal size and set breakpoints
    const updateDimensions = () => {
      const cols = process.stdout.columns || 100;
      const rows = process.stdout.rows || 30;

      setDimensions({ columns: cols, rows: rows });

      if (cols < tokens.layout.breakpoints.standard) {
        setBreakpoint('compact');
      } else if (cols < tokens.layout.breakpoints.wide) {
        setBreakpoint('standard');
      } else if (cols < tokens.layout.breakpoints.ultra_wide) {
        setBreakpoint('wide');
      } else {
        setBreakpoint('ultra_wide');
      }
    };

    updateDimensions();

    // Listen for resize events
    process.stdout.on('resize', updateDimensions);

    return () => {
      process.stdout.off('resize', updateDimensions);
    };
  }, [mode, autoDetect]);

  // Apply theme colors based on mode
  const themeColors = {
    ...tokens.colors,
    background: mode === 'day' ? tokens.colors.gradients.day : tokens.colors.gradients.night,
    primary: mode === 'day' ? tokens.colors.neutrals.text : tokens.colors.neutrals.text_dim,
    secondary: mode === 'day' ? tokens.colors.neutrals.muted : tokens.colors.neutrals.muted_hover,
  };

  const themeValue: ThemeContextValue = {
    tokens,
    mode,
    breakpoint,
    columns: dimensions.columns,
    rows: dimensions.rows,
    colors: themeColors,
    spacing: tokens.spacing,
    fonts: tokens.fonts,
    animations: tokens.animations,
  };

  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper components for common styling
export const ThemedBox: React.FC<{
  children?: ReactNode;
  role?: keyof DesignTokens['colors']['role'];
  status?: keyof DesignTokens['colors']['status'];
  gradient?: boolean;
  accent?: boolean;
  flexDirection?: 'row' | 'column';
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  flexGrow?: number | string;
  height?: number | string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}> = ({ children, role, status, gradient = false, accent = false, color: propColor, ...props }) => {
  const theme = useTheme();
  let color = propColor ?? theme.colors.neutrals.text;

  if (role && theme.colors.role[role]) {
    color = theme.colors.role[role].active;
  }

  if (status && theme.colors.status[status]) {
    color = theme.colors.status[status];
  }

  if (accent) {
    color = theme.colors.accent.orange;
  }

  if (gradient) {
    // Apply gradient background using colorama or chalk
    // This would require a custom implementation
  }

  return (
    <Box {...props} color={color}>
      {children}
    </Box>
  );
};

// Color helper functions
export const getRoleColor = (role: string, theme: ThemeContextValue, dim = false) => {
  const roleKey = role as keyof DesignTokens['colors']['role'];
  if (theme.colors.role[roleKey]) {
    return dim ? theme.colors.role[roleKey].dim : theme.colors.role[roleKey].active;
  }
  return theme.colors.neutrals.text;
};

export const getStatusColor = (status: string, theme: ThemeContextValue) => {
  const statusKey = status as keyof DesignTokens['colors']['status'];
  return theme.colors.status[statusKey] || theme.colors.neutrals.text;
};

export default ThemeProvider;
