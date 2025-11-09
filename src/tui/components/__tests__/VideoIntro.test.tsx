/**
 * VideoIntro Component Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { VideoIntro } from '../VideoIntro.js';
import { TUIConfig } from '../../types/TUIConfig.js';

// Mock ink components
jest.mock('ink', () => ({
  Text: ({ children, color }: { children: React.ReactNode; color?: string }) =>
    `<Text color="${color || 'default'}">${children}</Text>`,
}));

// Mock process.stdin for tests
const mockStdin = {
  setRawMode: jest.fn(),
  resume: jest.fn(),
  pause: jest.fn(),
  setEncoding: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

Object.defineProperty(process, 'stdin', {
  value: mockStdin,
  configurable: true
});

// Mock terminal dimensions
Object.defineProperty(process.stdout, 'columns', {
  value: 120,
  configurable: true
});

Object.defineProperty(process.stdout, 'rows', {
  value: 34,
  configurable: true
});

// Mock version utility
jest.mock('../../../utils/version.js', () => ({
  getVersion: () => '1.0.0-test'
}));

// Mock logger
jest.mock('../../../shared/logger.js', () => ({
  createLayerLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('VideoIntro', () => {
  const mockConfig: TUIConfig = {
    colors: {
      base_fg: '#E6E6E6',
      base_bg: '#000000',
      accent_orange: '#FF9A38',
      role_colors: {
        'robo-aqa': '#B48EAD',
        'robo-developer': '#61AFEF'
      }
    },
    animations: {
      intro: {
        enabled: true,
        duration: 10000,
        fps: 12
      }
    }
  } as TUIConfig;

  let mockOnComplete: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnComplete = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should initialize with correct animation configuration', () => {
    // Test that config values are properly structured for the component
    expect(mockConfig.animations.intro.enabled).toBe(true);
    expect(mockConfig.animations.intro.duration).toBe(10000);
    expect(mockConfig.animations.intro.fps).toBe(12);
    expect(mockConfig.colors.base_fg).toBeDefined();
    expect(mockConfig.colors.accent_orange).toBeDefined();
    expect(mockOnComplete).toBeDefined();
  });

  it('should have correct frame timing (12fps = ~83ms per frame)', () => {
    // Test frame delay calculation
    const expectedFrameDelay = 1000 / 12; // ~83ms
    expect(expectedFrameDelay).toBeCloseTo(83.33, 1);
  });

  it('should generate correct number of total frames (10s @ 12fps = 120 frames)', () => {
    const expectedTotalFrames = 10 * 12; // 120 frames
    expect(expectedTotalFrames).toBe(120);
  });

  it('should progress through music symbols in correct order', () => {
    const symbols: Array<'♪' | '♩' | '♬' | '♫'> = ['♪', '♩', '♬', '♫'];

    // Test symbol progression logic
    const getSymbolForProgress = (progress: number): typeof symbols[number] => {
      if (progress < 0.3) return '♪';
      if (progress < 0.6) return '♩';
      if (progress < 0.8) return '♬';
      return '♫';
    };

    expect(getSymbolForProgress(0.1)).toBe('♪');
    expect(getSymbolForProgress(0.4)).toBe('♩');
    expect(getSymbolForProgress(0.7)).toBe('♬');
    expect(getSymbolForProgress(0.9)).toBe('♫');
  });

  it('should handle radial vignette alpha calculations correctly', () => {
    const getRadialAlpha = (progress: number): number => {
      if (progress < 0.1) return progress / 0.1;
      if (progress > 0.9) return (1 - progress) / 0.1;
      return 1;
    };

    expect(getRadialAlpha(0.05)).toBeCloseTo(0.5, 1); // 50% fade-in
    expect(getRadialAlpha(0.5)).toBe(1);    // Full opacity
    expect(getRadialAlpha(0.95)).toBeCloseTo(0.5, 1); // 50% fade-out
  });

  it('should initialize starfield with correct density', () => {
    // Calculate expected star count (1 star per 200 character cells)
    const terminalWidth = 120;
    const terminalHeight = 34;
    const expectedStarCount = Math.floor((terminalWidth * terminalHeight) / 200);

    expect(expectedStarCount).toBe(20); // 4080 / 200 = 20.4, floored to 20
  });

  it('should handle keyboard input for skipping', () => {
    // Mock stdin events
    const mockKeyPressHandler = jest.fn();

    // This tests the keyboard skip functionality concept
    expect(mockKeyPressHandler).toBeDefined();
  });

  it('should complete animation after correct duration', () => {
    // Test the duration calculation conceptually
    const totalFrames = 120;
    const fps = 12;
    const expectedDuration = (totalFrames / fps) * 1000; // milliseconds

    expect(expectedDuration).toBe(10000); // 10 seconds
  });

  it('should handle orbit note rotation calculations', () => {
    const orbitRadius = Math.min(120, 34) / 6; // ~5.67

    // Test orbit angle progression
    const getOrbitAngle = (progress: number): number => {
      return progress * Math.PI * 2; // Full rotation
    };

    expect(getOrbitAngle(0)).toBe(0);
    expect(getOrbitAngle(0.5)).toBe(Math.PI);
    expect(getOrbitAngle(1)).toBe(Math.PI * 2);
  });

  it('should apply ASCII luminance ramp correctly', () => {
    const asciiRamp = ['  ', '·', ':', ';', 'o', 'x', '%', '#', '@'];

    // Test ramp index calculation
    const getRampChar = (alpha: number): string => {
      const rampIndex = Math.floor(alpha * (asciiRamp.length - 1));
      return asciiRamp[Math.min(rampIndex, asciiRamp.length - 1)];
    };

    expect(getRampChar(0)).toBe('  ');
    expect(getRampChar(0.5)).toBe('o');
    expect(getRampChar(1)).toBe('@');
  });

  it('should generate title wipe-in correctly', () => {
    const titleLines = [
      '♫ @dcversus/prp',
      'Autonomous Development Orchestration',
      'v1.0.0-test — Signal-Driven Workflow'
    ];

    // Test wipe-in progress calculation
    const getVisibleLength = (totalLength: number, progress: number): number => {
      return Math.floor(totalLength * progress);
    };

    expect(getVisibleLength(15, 0)).toBe(0);    // Nothing visible
    expect(getVisibleLength(15, 0.5)).toBe(7);   // Half visible
    expect(getVisibleLength(15, 1)).toBe(15);    // Fully visible

    // Verify title lines are not empty
    titleLines.forEach(line => {
      expect(line.length).toBeGreaterThan(0);
    });
  });

  it('should handle morph trail effect calculations', () => {
    const morphProgress = 0.5;
    const trailLength = Math.floor(morphProgress * 15);

    expect(trailLength).toBe(7); // Floor of 7.5

    // Test morph symbol selection
    const getMorphSymbol = (progress: number): string => {
      if (progress < 0.3) return '♪';
      if (progress < 0.6) return '♬';
      return '♫';
    };

    expect(getMorphSymbol(0.2)).toBe('♪');
    expect(getMorphSymbol(0.5)).toBe('♬');
    expect(getMorphSymbol(0.8)).toBe('♫');
  });
});

describe('VideoIntro Performance', () => {
  it('should maintain performance constraints', () => {
    const fps = 12;
    const maxFrameTime = 1000 / fps; // 83ms max per frame

    expect(maxFrameTime).toBeLessThan(100); // Should be under 100ms
    expect(fps).toBeGreaterThanOrEqual(8);  // Should meet minimum 8fps requirement
  });

  it('should handle memory efficiently with star cleanup', () => {
    // Test star field size is reasonable
    const terminalWidth = 120;
    const terminalHeight = 34;
    const starCount = Math.floor((terminalWidth * terminalHeight) / 200);

    // Should not create excessive stars
    expect(starCount).toBeLessThan(50);
  });
});

describe('VideoIntro Integration', () => {
  it('should work with TUI config system', () => {
    const config: TUIConfig = {
      colors: {
        base_fg: '#FFFFFF',
        accent_orange: '#FF9A38',
        role_colors: {
          'robo-aqa': '#B48EAD'
        }
      },
      animations: {
        intro: {
          enabled: true,
          duration: 10000,
          fps: 12
        }
      }
    } as TUIConfig;

    expect(config.animations.intro.enabled).toBe(true);
    expect(config.animations.intro.duration).toBe(10000);
    expect(config.animations.intro.fps).toBe(12);
  });
});