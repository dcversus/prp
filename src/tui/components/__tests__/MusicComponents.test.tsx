/**
 * ♫ Music Components Test Suite
 *
 * Comprehensive testing for music-themed TUI components:
 * - Music visualizer functionality
 * - Signal ticker animations
 * - Agent monitoring enhancements
 * - Orchestration display integration
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock ink components for testing
jest.mock('ink', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  useApp: () => ({ exit: jest.fn() }),
  useTerminalDimensionsWithColumns: () => ({ columns: 80, rows: 24, width: 80, height: 24 }),
}));

// Mock animation engine
jest.mock('../../animation/AnimationEngine', () => ({
  useAnimationEngine: () => ({
    engine: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      removeAnimation: jest.fn(),
      registerSignalAnimation: jest.fn(),
      loadMelody: jest.fn(),
    },
    getCurrentBeat: () => ({ index: 0, isOnBeat: true }),
    registerSignalAnimation: jest.fn(),
    pauseAnimation: jest.fn(),
    resumeAnimation: jest.fn(),
    removeAnimation: jest.fn(),
    getStats: () => ({
      totalAnimations: 2,
      activeAnimations: 1,
      melodySync: true,
      currentBeat: { index: 0, isOnBeat: true },
    }),
  }),
  AnimationEngine: class MockAnimationEngine {
    constructor() {}
    on() {}
    off() {}
    emit() {}
  },
  globalAnimationEngine: new (class MockAnimationEngine {
    on() {}
    off() {}
    emit() {}
  })(),
}));

import {
  MusicVisualizer,
  CompactMusicIndicator,
  MusicStatusBar,
  EnhancedSignalTicker,
  SignalOrchestrationDisplay,
  setupMusicComponents,
  MusicComponentUtils,
} from '../MusicComponents';

describe('Music Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MusicVisualizer', () => {
    it('should render with default props', () => {
      const { getByText } = render(
        <MusicVisualizer width={60} height={8} />
      );

      expect(getByText('🎵 Music Visualizer')).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(
        <MusicVisualizer compact={true} width={40} />
      );

      expect(container.querySelector('.compact')).toBeTruthy();
    });

    it('should display beat indicator when enabled', () => {
      const { container } = render(
        <MusicVisualizer showBeatIndicator={true} />
      );

      // Should contain beat display elements
      expect(container.textContent).toContain('BPM');
    });

    it('should display classical theme when enabled', () => {
      const { container } = render(
        <MusicVisualizer showClassicalTheme={true} />
      );

      expect(container.textContent).toContain('🎼');
    });
  });

  describe('CompactMusicIndicator', () => {
    it('should render compact music indicator', () => {
      const { container } = render(
        <CompactMusicIndicator active={true} signal="[dp]" />
      );

      expect(container.textContent).toContain('🎵');
      expect(container.textContent).toContain('[dp]');
    });

    it('should show inactive state', () => {
      const { container } = render(
        <CompactMusicIndicator active={false} signal="[cq]" />
      );

      expect(container.textContent).toContain('♪');
    });
  });

  describe('MusicStatusBar', () => {
    it('should render music status bar', () => {
      const { container } = render(
        <MusicStatusBar
          activeSignals={['[dp]', '[tw]', '[bf]']}
          currentMelody="SYSTEM_READY"
          bpm={120}
        />
      );

      expect(container.textContent).toContain('120 BPM');
      expect(container.textContent).toContain('Signals: 3');
      expect(container.textContent).toContain('SYSTEM READY');
    });

    it('should handle empty signals', () => {
      const { container } = render(
        <MusicStatusBar
          activeSignals={[]}
          bpm={100}
        />
      );

      expect(container.textContent).toContain('Signals: 0');
    });
  });

  describe('EnhancedSignalTicker', () => {
    it('should render signal ticker with signals', () => {
      const { container } = render(
        <EnhancedSignalTicker
          signals={['[dp]', '[tw]', '[bf]']}
          width={60}
          height={6}
        />
      );

      expect(container.textContent).toContain('♫ Signal Ticker');
      expect(container.textContent).toContain('Active: 3/3');
    });

    it('should render in compact mode', () => {
      const { container } = render(
        <EnhancedSignalTicker
          signals={['[dp]', '[tw]']}
          compact={true}
          width={40}
        />
      );

      // Compact mode should not show full title
      expect(container.textContent).not.toContain('♫ Signal Ticker');
    });

    it('should show music indicator when enabled', () => {
      const { container } = render(
        <EnhancedSignalTicker
          signals={['[dp]']}
          showMusicIndicator={true}
        />
      );

      expect(container.textContent).toContain('🎵');
    });
  });

  describe('SignalOrchestrationDisplay', () => {
    it('should render orchestration display', () => {
      const { container } = render(
        <SignalOrchestrationDisplay
          width={80}
          height={20}
          focusMode="orchestra"
        />
      );

      expect(container.textContent).toContain('🎼 Signal Orchestration');
      expect(container.textContent).toContain('Beat 0');
    });

    it('should render signal focus mode', () => {
      const { container } = render(
        <SignalOrchestrationDisplay
          focusMode="signals"
          showVisualizer={false}
          showTicker={true}
        />
      );

      expect(container.textContent).toContain('Signal Ticker');
    });

    it('should render melody focus mode', () => {
      const { container } = render(
        <SignalOrchestrationDisplay
          focusMode="melody"
          showVisualizer={true}
          showTicker={false}
        />
      );

      expect(container.textContent).toContain('Music Visualizer');
    });

    it('should render compact mode', () => {
      const { container } = render(
        <SignalOrchestrationDisplay
          compact={true}
          width={60}
        />
      );

      expect(container.textContent).toContain('🎵 Signal Orchestration');
      expect(container.textContent).toContain('signals');
    });
  });

  describe('setupMusicComponents', () => {
    it('should setup with default options', () => {
      const result = setupMusicComponents({});

      expect(result.config).toEqual({
        melodyEnabled: true,
        baseBPM: 120,
        visualTheme: 'classical',
        beatSyncAnimations: true,
        classicalIntegration: true,
      });

      expect(result.components).toHaveProperty('MusicVisualizer');
      expect(result.components).toHaveProperty('EnhancedSignalTicker');
      expect(result.components).toHaveProperty('SignalOrchestrationDisplay');
    });

    it('should setup with custom options', () => {
      const result = setupMusicComponents({
        enableMelody: false,
        bpm: 140,
        theme: 'modern',
      });

      expect(result.config).toEqual({
        melodyEnabled: false,
        baseBPM: 140,
        visualTheme: 'modern',
        beatSyncAnimations: true,
        classicalIntegration: false,
      });
    });
  });

  describe('MusicComponentUtils', () => {
    describe('getMelodyForSignal', () => {
      it('should return appropriate melody for signals', () => {
        expect(MusicComponentUtils.getMelodyForSignal('[aa]')).toBe('MISSION_IMPOSSIBLE');
        expect(MusicComponentUtils.getMelodyForSignal('[mg]')).toBe('COMPLETION_FANFARE');
        expect(MusicComponentUtils.getMelodyForSignal('[dp]')).toBe('SYSTEM_READY');
        expect(MusicComponentUtils.getMelodyForSignal('[unknown]')).toBe('SYSTEM_READY');
      });
    });

    describe('getSignalColor', () => {
      it('should return appropriate colors for signals', () => {
        expect(MusicComponentUtils.getSignalColor('[dp]')).toBe('#10B981');
        expect(MusicComponentUtils.getSignalColor('[ff]')).toBe('#DC2626');
        expect(MusicComponentUtils.getSignalColor('[unknown]')).toBe('#6B7280');
      });
    });

    describe('formatAgentStatus', () => {
      it('should format agent status correctly', () => {
        expect(MusicComponentUtils.formatAgentStatus('SPAWNING')).toEqual({
          icon: '🎵',
          color: '#FBBF24',
          signal: '[dp]',
        });
        expect(MusicComponentUtils.formatAgentStatus('RUNNING')).toEqual({
          icon: '🎶',
          color: '#10B981',
          signal: '[tw]',
        });
        expect(MusicComponentUtils.formatAgentStatus('ERROR')).toEqual({
          icon: '⚠️',
          color: '#EF4444',
          signal: '[cf]',
        });
      });
    });

    describe('createStatusIndicator', () => {
      it('should create status indicator based on activity', () => {
        expect(MusicComponentUtils.createStatusIndicator(true, '[dp]')).toBe('🎵');
        expect(MusicComponentUtils.createStatusIndicator(false, '[cq]')).toBe('♪');
      });
    });
  });
});

describe('Music Component Integration', () => {
  it('should integrate multiple components', () => {
    const signals = ['[dp]', '[tw]', '[bf]'];
    const { container } = render(
      <div>
        <MusicStatusBar activeSignals={signals} bpm={120} />
        <EnhancedSignalTicker signals={signals} compact={true} />
        <CompactMusicIndicator active={true} signal="[dp]" />
      </div>
    );

    expect(container.textContent).toContain('Signals: 3');
    expect(container.textContent).toContain('120 BPM');
    expect(container.textContent).toContain('🎵');
  });

  it('should handle empty signal arrays', () => {
    const { container } = render(
      <div>
        <MusicStatusBar activeSignals={[]} />
        <EnhancedSignalTicker signals={[]} />
      </div>
    );

    expect(container.textContent).toContain('Signals: 0');
  });

  it('should handle error states gracefully', () => {
    const { container } = render(
      <SignalOrchestrationDisplay
        width={20}
        height={10}
        compact={true}
      />
    );

    // Should still render basic structure even with small dimensions
    expect(container.textContent).toContain('🎵');
  });
});

describe('Performance Tests', () => {
  it('should render large signal lists efficiently', () => {
    const manySignals = Array.from({ length: 100 }, (_, i) => `[${i}]`);

    const startTime = performance.now();
    const { container } = render(
      <EnhancedSignalTicker
        signals={manySignals}
        compact={true}
        width={80}
      />
    );
    const endTime = performance.now();

    // Should render quickly even with many signals
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should handle rapid animation updates', () => {
    const { rerender } = render(
      <CompactMusicIndicator active={false} signal="[dp]" />
    );

    // Rapidly toggle active state
    for (let i = 0; i < 10; i++) {
      rerender(<CompactMusicIndicator active={i % 2 === 0} signal="[dp]" />);
    }

    // Should complete without errors
    expect(true).toBe(true);
  });
});