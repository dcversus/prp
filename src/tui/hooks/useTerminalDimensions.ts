/**
 * ♫ useTerminalDimensions - Custom hook to replace useStdoutDimensions
 *
 * Provides terminal width and height information using Node.js process.stdout
 * Compatible with Ink 5.x and reactive to terminal size changes
 */

import { useState, useEffect, useCallback } from 'react';

export interface TerminalDimensions {
  width: number;
  height: number;
}

export interface TerminalDimensionsWithColumns extends TerminalDimensions {
  columns: number;
}

/**
 * Hook that returns terminal dimensions and updates on terminal resize
 */
export const useTerminalDimensions = (): TerminalDimensions => {
  const [dimensions, setDimensions] = useState<TerminalDimensions>(() => ({
    width: getTerminalWidth(),
    height: getTerminalHeight()
  }));

  const updateDimensions = useCallback(() => {
    const newDimensions = {
      width: getTerminalWidth(),
      height: getTerminalHeight()
    };

    setDimensions(prev => {
      // Only update if dimensions actually changed to prevent unnecessary re-renders
      if (prev.width !== newDimensions.width || prev.height !== newDimensions.height) {
        return newDimensions;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    // Listen for terminal resize events
    if (process.stdout?.on) {
      process.stdout.on('resize', updateDimensions);
      process.stderr.on('resize', updateDimensions);

      return () => {
        process.stdout.off('resize', updateDimensions);
        process.stderr.off('resize', updateDimensions);
      };
    }
  }, [updateDimensions]);

  return dimensions;
};

/**
 * Hook that returns terminal dimensions with columns (for backward compatibility)
 * Returns { width, height, columns } where columns = width
 */
export const useTerminalDimensionsWithColumns = (): TerminalDimensionsWithColumns => {
  const dimensions = useTerminalDimensions();

  return {
    ...dimensions,
    columns: dimensions.width
  };
};

/**
 * Fallback function to get terminal width with reasonable defaults
 */
function getTerminalWidth(): number {
  // Try process.stdout.getWindowSize first (most reliable)
  if (process.stdout && typeof process.stdout.getWindowSize === 'function') {
    try {
      const [width] = process.stdout.getWindowSize();
      if (width && width > 0) {
        return width;
      }
    } catch {
      // Continue to next method
    }
  }

  // Try process.stdout.columns
  if (process.stdout && process.stdout.columns && process.stdout.columns > 0) {
    return process.stdout.columns;
  }

  // Try environment variables
  const cols = process.env.COLUMNS;
  if (cols && !isNaN(parseInt(cols, 10))) {
    return parseInt(cols, 10);
  }

  // Try to parse from tput command (fallback)
  try {
     
    const { execSync } = require('child_process');
    const output = execSync('tput cols 2>/dev/null', {
      encoding: 'utf8',
      timeout: 1000
    }).trim();
    const parsed = parseInt(output, 10);
    if (parsed && parsed > 0) {
      return parsed;
    }
  } catch {
    // Ignore errors from tput
  }

  // Return reasonable default
  return 80;
}

/**
 * Fallback function to get terminal height with reasonable defaults
 */
function getTerminalHeight(): number {
  // Try process.stdout.getWindowSize first (most reliable)
  if (process.stdout && typeof process.stdout.getWindowSize === 'function') {
    try {
      const [, height] = process.stdout.getWindowSize();
      if (height && height > 0) {
        return height;
      }
    } catch {
      // Continue to next method
    }
  }

  // Try process.stdout.rows
  if (process.stdout && process.stdout.rows && process.stdout.rows > 0) {
    return process.stdout.rows;
  }

  // Try environment variables
  const rows = process.env.LINES;
  if (rows && !isNaN(parseInt(rows, 10))) {
    return parseInt(rows, 10);
  }

  // Try to parse from tput command (fallback)
  try {
     
    const { execSync } = require('child_process');
    const output = execSync('tput lines 2>/dev/null', {
      encoding: 'utf8',
      timeout: 1000
    }).trim();
    const parsed = parseInt(output, 10);
    if (parsed && parsed > 0) {
      return parsed;
    }
  } catch {
    // Ignore errors from tput
  }

  // Return reasonable default
  return 24;
}

/**
 * Check if running in a TTY environment
 */
export const isTTY = (): boolean => {
  try {
    return !!(process.stdout && process.stdout.isTTY);
  } catch {
    return false;
  }
};

/**
 * Get terminal dimensions synchronously (for use outside React components)
 */
export const getTerminalDimensionsSync = (): TerminalDimensions => ({
  width: getTerminalWidth(),
  height: getTerminalHeight()
});

export default useTerminalDimensions;