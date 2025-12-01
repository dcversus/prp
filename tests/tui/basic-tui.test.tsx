/**
 * Basic TUI Component Tests
 *
 * Simple tests to verify that TUI components can render without TypeScript errors
 */

import { render } from '@testing-library/react';
import React from 'react';

// Mock the ink library completely
jest.mock('ink', () => ({
  render: jest.fn(),
  useApp: () => ({
    exit: jest.fn()
  }),
  Box: ({ children }: { children: React.ReactNode }) => <div data-testid="box">{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <div data-testid="text">{children}</div>
}));

// Mock the version utility that uses import.meta
jest.mock('../../src/shared/utils/version', () => ({
  getVersion: jest.fn(() => '0.4.9-test')
}));

// Mock git utilities that use execa
jest.mock('../../src/shared/utils/gitUtils', () => ({
  GitUtils: class MockGitUtils {
    static getCurrentBranch = jest.fn(() => Promise.resolve('main'));
    static getRepositoryInfo = jest.fn(() => Promise.resolve({ name: 'test', owner: 'test' }));
    static hasUncommittedChanges = jest.fn(() => Promise.resolve(false));
  }
}));

// Mock package manager utilities that also use execa
jest.mock('../../src/shared/utils/packageManager', () => ({
  PackageManagerUtils: class MockPackageManagerUtils {
    static detectPackageManager = jest.fn(() => 'npm');
    static installDependencies = jest.fn(() => Promise.resolve());
    static runScript = jest.fn(() => Promise.resolve({ stdout: 'success' }));
  }
}));

// Mock the event bus and logger
jest.mock('../../src/shared/events.js', () => ({
  EventBus: class MockEventBus {
    on = jest.fn();
    off = jest.fn();
    emit = jest.fn();
    subscribeToChannel = jest.fn(() => jest.fn());
  }
}));

jest.mock('../../src/shared/logger.js', () => ({
  createLayerLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

// Mock the animation engine
jest.mock('../../src/tui/animation/AnimationEngine.js', () => ({
  useAnimationEngine: () => ({
    engine: {
      on: jest.fn(),
      off: jest.fn(),
      removeAnimation: jest.fn()
    },
    registerSignalAnimation: jest.fn(),
    pauseAnimation: jest.fn(),
    resumeAnimation: jest.fn(),
    removeAnimation: jest.fn(),
    getCurrentBeat: jest.fn(),
    loadMelody: jest.fn(),
    getStats: jest.fn()
  })
}));

describe('TUI Components', () => {
  test('SignalBar renders without errors', () => {
    const {SignalBar} = require('../../src/tui/components/SignalBar.js');

    const mockSignals = [
      { code: '[dp]', state: 'active', latest: true },
      { code: '[br]', state: 'resolved', latest: false }
    ];

    const mockConfig = {
      enabled: true,
      theme: 'dark' as const,
      colors: {
        base_fg: '#E6E6E6',
        signal_braces: '#FFB56B',
        signal_placeholder: '#6C7078'
      },
      animations: { enabled: false, intro: { enabled: false, duration: 10000, fps: 12 }, status: { enabled: false, fps: 4 }, signals: { enabled: false, waveSpeed: 50, blinkSpeed: 1000 } },
      layout: { responsive: true, breakpoints: { compact: 100, normal: 160, wide: 240, ultrawide: 240 }, padding: { horizontal: 2, vertical: 1 } },
      input: { maxTokens: 100000, tokenReserve: 0.05, pasteTimeout: 1000 },
      debug: { enabled: false, maxLogLines: 100, showFullJSON: false }
    };

    expect(() => {
      render(<SignalBar signals={mockSignals} config={mockConfig} />);
    }).not.toThrow();
  });

  test('MusicIcon renders without errors', () => {
    const MusicComponents = require('../../src/tui/components/MusicComponents');

    expect(() => {
      render(<MusicComponents.MusicIcon status="RUNNING" animate={false} />);
    }).not.toThrow();
  });

  test('TUIApp structure is valid', () => {
    // Check that TUIApp can be imported and has expected structure
    const TUIAppModule = require('../../src/tui/components/TUIApp.js');

    expect(TUIAppModule).toHaveProperty('TUIApp');
    expect(typeof TUIAppModule.TUIApp).toBe('function');
  });
});