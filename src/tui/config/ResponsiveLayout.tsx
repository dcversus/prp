/**
 * Responsive Layout Configuration
 *
 * Defines layout breakpoints and configurations for different terminal sizes
 */

import type { TUIConfig } from '../../shared/types/TUIConfig';

export interface LayoutBreakpoint {
  name: string;
  minWidth: number;
  minHeight: number;
  maxSingleScreenWidth: number;
  multiScreenMode: boolean;
  features: {
    navigationBar: boolean;
    signalTicker: boolean;
    signalHistory: boolean;
    footer: boolean;
    sidePanel: boolean;
    compactMode: boolean;
  };
}

export const LAYOUT_BREAKPOINTS: LayoutBreakpoint[] = [
  {
    name: 'compact',
    minWidth: 80,
    minHeight: 24,
    maxSingleScreenWidth: 80,
    multiScreenMode: false,
    features: {
      navigationBar: true,
      signalTicker: true,
      signalHistory: false,
      footer: true,
      sidePanel: false,
      compactMode: true,
    },
  },
  {
    name: 'normal',
    minWidth: 100,
    minHeight: 30,
    maxSingleScreenWidth: 100,
    multiScreenMode: false,
    features: {
      navigationBar: true,
      signalTicker: true,
      signalHistory: true,
      footer: true,
      sidePanel: false,
      compactMode: false,
    },
  },
  {
    name: 'wide',
    minWidth: 120,
    minHeight: 35,
    maxSingleScreenWidth: 120,
    multiScreenMode: true,
    features: {
      navigationBar: true,
      signalTicker: true,
      signalHistory: true,
      footer: true,
      sidePanel: true,
      compactMode: false,
    },
  },
  {
    name: 'ultrawide',
    minWidth: 160,
    minHeight: 40,
    maxSingleScreenWidth: 100,
    multiScreenMode: true,
    features: {
      navigationBar: true,
      signalTicker: true,
      signalHistory: true,
      footer: true,
      sidePanel: true,
      compactMode: false,
    },
  },
  {
    name: 'extreme',
    minWidth: 240,
    minHeight: 50,
    maxSingleScreenWidth: 100,
    multiScreenMode: true,
    features: {
      navigationBar: true,
      signalTicker: true,
      signalHistory: true,
      footer: true,
      sidePanel: true,
      compactMode: false,
    },
  },
];

export class ResponsiveLayout {
  private currentBreakpoint: LayoutBreakpoint;

  constructor() {
    this.currentBreakpoint = LAYOUT_BREAKPOINTS[0];
  }

  /**
   * Get current breakpoint based on terminal size
   */
  getBreakpoint(columns: number, rows: number): LayoutBreakpoint {
    // Find the largest breakpoint that fits
    for (let i = LAYOUT_BREAKPOINTS.length - 1; i >= 0; i--) {
      const bp = LAYOUT_BREAKPOINTS[i];
      if (columns >= bp.minWidth && rows >= bp.minHeight) {
        return bp;
      }
    }
    return LAYOUT_BREAKPOINTS[0];
  }

  /**
   * Update configuration based on terminal size
   */
  updateConfig(config: TUIConfig, columns: number, rows: number): TUIConfig {
    const breakpoint = this.getBreakpoint(columns, rows);
    this.currentBreakpoint = breakpoint;

    // Update layout settings
    const updatedConfig = { ...config };

    // Adjust breakpoints
    updatedConfig.layout.breakpoints = {
      compact: 80,
      normal: 100,
      wide: 120,
      ultrawide: 160,
    };

    // Adjust padding based on screen size
    const paddingScale = Math.min(2, Math.floor(columns / 60));
    updatedConfig.layout.padding = {
      horizontal: paddingScale,
      vertical: Math.floor(paddingScale / 2),
    };

    // Enable/disable features based on breakpoint
    updatedConfig.animations.intro.enabled = breakpoint.features.navigationBar;
    updatedConfig.animations.status.enabled = breakpoint.features.signalTicker;
    updatedConfig.animations.signals.enabled = breakpoint.features.signalHistory;

    // Adjust animation FPS based on screen size (reduce on smaller screens)
    if (columns < 100) {
      updatedConfig.animations.status.fps = 4;
      updatedConfig.animations.signals.fps = 2;
    } else if (columns > 200) {
      updatedConfig.animations.status.fps = 8;
      updatedConfig.animations.signals.fps = 4;
    }

    return updatedConfig;
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint(): LayoutBreakpoint {
    return this.currentBreakpoint;
  }

  /**
   * Check if multi-screen mode should be used
   */
  shouldUseMultiScreen(columns: number, rows: number): boolean {
    const breakpoint = this.getBreakpoint(columns, rows);
    return breakpoint.multiScreenMode;
  }

  /**
   * Calculate optimal screen dimensions for a given screen
   */
  calculateScreenDimensions(
    screenType: 'main' | 'side' | 'panel',
    totalColumns: number,
    totalRows: number
  ): { width: number; height: number } {
    const breakpoint = this.getBreakpoint(totalColumns, totalRows);

    switch (screenType) {
      case 'main':
        return {
          width: Math.min(breakpoint.maxSingleScreenWidth, totalColumns - 20),
          height: totalRows - 10,
        };
      case 'side':
        if (!breakpoint.multiScreenMode) {
          return { width: 0, height: 0 };
        }
        return {
          width: Math.min(60, totalColumns - breakpoint.maxSingleScreenWidth - 10),
          height: Math.floor(totalRows / 2),
        };
      case 'panel':
        return {
          width: totalColumns,
          height: Math.min(10, Math.floor(totalRows * 0.2)),
        };
      default:
        return { width: totalColumns, height: totalRows };
    }
  }

  /**
   * Get layout grid configuration
   */
  getGridLayout(columns: number, rows: number): {
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
  } {
    const breakpoint = this.getBreakpoint(columns, rows);

    if (!breakpoint.multiScreenMode) {
      return {
        rows: 1,
        cols: 1,
        cellWidth: columns,
        cellHeight: rows,
      };
    }

    // Calculate optimal grid for multi-screen
    let cols = 2;
    let gridRows = 1;

    // Adjust based on screen size
    if (columns >= 240) {
      cols = 3;
    } else if (columns >= 160) {
      cols = 2;
    }

    if (rows >= 50) {
      gridRows = 2;
    }

    // Calculate cell dimensions
    const cellWidth = Math.floor(columns / cols);
    const cellHeight = Math.floor(rows / gridRows);

    return { rows: gridRows, cols, cellWidth, cellHeight };
  }
}

export const responsiveLayout = new ResponsiveLayout();