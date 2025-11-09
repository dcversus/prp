/**
 * ♫ SignalBar Component
 *
 * Displays signal tags with proper coloring and animations
 * supports progress animations, wave effects, and latest signal highlighting
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text } from 'ink';
import { SignalBarProps, SignalTag, SignalState, TUIConfig } from '../types/TUIConfig.js';
import { getSignalColor } from '../config/TUIConfig.js';
import { useAnimationEngine, AnimationType } from '../animation/AnimationEngine.js';

interface AnimatedSignalProps {
  signal: SignalTag;
  index: number;
  config: TUIConfig;
  animate: boolean;
  isActive: boolean;
}

/**
 * Individual animated signal component
 */
function AnimatedSignal({ signal, index, config, animate, isActive }: AnimatedSignalProps) {
  const { engine, registerSignalAnimation, getCurrentBeat } = useAnimationEngine();
  const [currentFrame, setCurrentFrame] = useState(signal.code);
  const animationIdRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);

  // Generate unique animation ID for this signal
  const animationId = useMemo(() =>
    `signal-${signal.code}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    [signal.code, index]
  );

  // Determine animation type based on signal code and state
  const getAnimationType = (): AnimationType => {
    if (signal.state === 'progress') {
      return 'progress';
    }
    if (signal.code === '[  ]' || signal.code.includes('♫')) {
      return 'melody';
    }
    if (signal.state === 'active') {
      return 'wave';
    }
    if (signal.state === 'resolved') {
      return 'done';
    }
    return 'blink';
  };

  // Register animation with the engine
  useEffect(() => {
    if (!isMountedRef.current) return;

    animationIdRef.current = animationId;

    if (animate && signal.state !== 'placeholder') {
      const animationType = getAnimationType();

      registerSignalAnimation(animationId, signal.code, animationType);

      // Listen for frame updates
      const handleFrame = ({ id, frame }: { id: string; frame: string }) => {
        if (id === animationId && isMountedRef.current) {
          setCurrentFrame(frame);
        }
      };

      // Listen for melody beats for melody-synced signals
      const handleMelodyBeat = () => {
        if (signal.code.includes('♫') && isMountedRef.current) {
          const beat = getCurrentBeat();
          if (beat) {
            // Toggle visibility based on beat
            const shouldShow = beat.isOnBeat;
            setCurrentFrame(shouldShow ? signal.code : '   ');
          }
        }
      };

      engine.on('animationFrame', handleFrame);
      engine.on('melodyBeat', handleMelodyBeat);

      return () => {
        engine.off('animationFrame', handleFrame);
        engine.off('melodyBeat', handleMelodyBeat);
        engine.removeAnimation(animationId);
      };
    }
  }, [animate, signal, animationId, engine, registerSignalAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (animationIdRef.current) {
        engine.removeAnimation(animationIdRef.current);
      }
    };
  }, [engine]);

  // Get colors for different parts of the signal
  const letterColor = useMemo(() =>
    getSignalColor(signal.code, signal.state, config.colors),
    [signal.code, signal.state, config.colors]
  );

  const braceColor = useMemo(() =>
    signal.state === 'active' ? config.colors.signal_braces : config.colors.signal_placeholder,
    [signal.state, config.colors]
  );

  // Extract content (remove brackets)
  const content = useMemo(() => {
    const frame = currentFrame || signal.code;
    return frame.slice(1, -1); // Remove [ and ]
  }, [currentFrame, signal.code]);

  // Determine styling
  const isBold = isActive || signal.latest;
  const isDim = signal.state === 'placeholder';
  const hasBackground = signal.state === 'active' && config.colors.signal_braces;

  return (
    <Text bold={isBold} dimColor={isDim}>
      {hasBackground && signal.state === 'active' && (
        <Text backgroundColor={config.colors.orchestrator_bg}>
          <Text color={braceColor}>[</Text>
          <Text color={letterColor}>{content}</Text>
          <Text color={braceColor}>]</Text>
        </Text>
      )}
      {!hasBackground && (
        <>
          <Text color={braceColor}>[</Text>
          <Text color={letterColor}>{content}</Text>
          <Text color={braceColor}>]</Text>
        </>
      )}
    </Text>
  );
}

/**
 * SignalBar component that displays multiple signals with animations
 */
export function SignalBar({
  signals,
  animate = true,
  config
}: SignalBarProps & {
  config?: TUIConfig;
}) {
  // Default configuration fallback
  const defaultConfig = useMemo(() => getDefaultConfig(), []);

  const activeConfig = config ?? defaultConfig;

  // Determine the active/latest signal for highlighting
  const latestSignalIndex = useMemo(() =>
    signals.findIndex(signal => signal.latest),
    [signals]
  );

  const activeSignalIndex = useMemo(() => {
    if (latestSignalIndex >= 0) return latestSignalIndex;

    // Find first active signal
    const activeIndex = signals.findIndex(signal => signal.state === 'active');
    return activeIndex >= 0 ? activeIndex : signals.length - 1;
  }, [latestSignalIndex, signals]);

  // Group signals by state for better visual organization
  const groupedSignals = useMemo(() => {
    const groups = {
      placeholder: [] as SignalTag[],
      active: [] as SignalTag[],
      progress: [] as SignalTag[],
      resolved: [] as SignalTag[]
    };

    signals.forEach(signal => {
      groups[signal.state].push(signal);
    });

    return groups;
  }, [signals]);

  if (signals.length === 0) {
    return (
      <Text color={activeConfig.colors.signal_placeholder}>
        {' ['}{'No signals'}{'] '}
      </Text>
    );
  }

  return (
    <Text>
      {' '}
      {/* Render progress signals first (they're most important) */}
      {groupedSignals.progress.map((signal, index) => (
        <AnimatedSignal
          key={`progress-${index}`}
          signal={signal}
          index={index}
          config={activeConfig}
          animate={animate}
          isActive={true}
        />
      ))}

      {/* Render active signals */}
      {groupedSignals.active.map((signal, index) => (
        <AnimatedSignal
          key={`active-${index}`}
          signal={signal}
          index={index}
          config={activeConfig}
          animate={animate}
          isActive={true}
        />
      ))}

      {/* Render resolved signals */}
      {groupedSignals.resolved.map((signal, index) => (
        <AnimatedSignal
          key={`resolved-${index}`}
          signal={signal}
          index={index}
          config={activeConfig}
          animate={animate}
          isActive={false}
        />
      ))}

      {/* Render placeholder signals last */}
      {groupedSignals.placeholder.map((signal, index) => (
        <AnimatedSignal
          key={`placeholder-${index}`}
          signal={signal}
          index={index}
          config={activeConfig}
          animate={false} // Don't animate placeholders
          isActive={false}
        />
      ))}

      {' '}
    </Text>
  );
}

/**
 * Optimized SignalBar for performance in lists
 */
export const OptimizedSignalBar = React.memo(SignalBar, (prevProps, nextProps) => {
  // Compare signals arrays for equality
  if (prevProps.signals.length !== nextProps.signals.length) {
    return false;
  }

  return prevProps.signals.every((signal, index) => {
    const nextSignal = nextProps.signals[index];
    return (
      signal.code === nextSignal.code &&
      signal.state === nextSignal.state &&
      signal.latest === nextSignal.latest &&
      prevProps.animate === nextProps.animate
    );
  });
});

/**
 * Hook for signal bar with real-time updates
 */
export function useSignalBar(
  initialSignals: SignalTag[],
  config: TUIConfig
) {
  const [signals, setSignals] = useState<SignalTag[]>(initialSignals);
  const { engine } = useAnimationEngine();

  // Add a new signal
  const addSignal = (signal: SignalTag) => {
    setSignals(prev => [...prev, { ...signal, latest: true }]);
  };

  // Update an existing signal
  const updateSignal = (code: string, updates: Partial<SignalTag>) => {
    setSignals(prev =>
      prev.map(signal =>
        signal.code === code
          ? { ...signal, ...updates }
          : signal
      )
    );
  };

  // Remove a signal
  const removeSignal = (code: string) => {
    setSignals(prev => prev.filter(signal => signal.code !== code));
  };

  // Mark signal as latest
  const setLatestSignal = (code: string) => {
    setSignals(prev =>
      prev.map(signal => ({
        ...signal,
        latest: signal.code === code
      }))
    );
  };

  // Start progress animation for a signal
  const startProgressAnimation = (code: string) => {
    updateSignal(code, { state: 'progress' });

    // Auto-complete progress after some time (for demo purposes)
    setTimeout(() => {
      updateSignal(code, { state: 'resolved' });
    }, 3000);
  };

  return {
    signals,
    setSignals,
    addSignal,
    updateSignal,
    removeSignal,
    setLatestSignal,
    startProgressAnimation
  };
}

// Default configuration fallback
function getDefaultConfig(): TUIConfig {
  const colors = {
    accent_orange: '#FF9A38',
    accent_orange_dim: '#C77A2C',
    accent_orange_bg: '#3A2B1F',

    robo_aqa: '#B48EAD',
    robo_quality_control: '#E06C75',
    robo_system_analyst: '#C7A16B',
    robo_developer: '#61AFEF',
    robo_devops_sre: '#98C379',
    robo_ux_ui: '#D19A66',
    robo_legal_compliance: '#C5A3FF',
    orchestrator: '#FF9A38',

    robo_aqa_dim: '#6E5C69',
    robo_quality_control_dim: '#7C3B40',
    robo_system_analyst_dim: '#7A6445',
    robo_developer_dim: '#3B6D90',
    robo_devops_sre_dim: '#5F7B52',
    robo_ux_ui_dim: '#8A5667',
    robo_legal_compliance_dim: '#705E93',
    orchestrator_dim: '#C77A2C',

    robo_aqa_bg: '#2F2830',
    robo_quality_control_bg: '#321E20',
    robo_system_analyst_bg: '#2C2419',
    robo_developer_bg: '#1D2730',
    robo_devops_sre_bg: '#1F2A1F',
    robo_ux_ui_bg: '#2E2328',
    robo_legal_compliance_bg: '#281F35',
    orchestrator_bg: '#3A2B1F',

    base_fg: '#E6E6E6',
    base_bg: '#000000',
    muted: '#9AA0A6',
    error: '#FF5555',
    warn: '#FFCC66',
    ok: '#B8F28E',
    gray: '#6C7078',

    signal_braces: '#FFB56B',
    signal_placeholder: '#6C7078'
  };

  return {
    enabled: true,
    theme: 'dark',
    colors,
    animations: {
      enabled: true,
      intro: { enabled: true, duration: 10000, fps: 12 },
      status: { enabled: true, fps: 4 },
      signals: { enabled: true, waveSpeed: 50, blinkSpeed: 1000 }
    },
    layout: {
      responsive: true,
      breakpoints: { compact: 100, normal: 160, wide: 240, ultrawide: 240 },
      padding: { horizontal: 2, vertical: 1 }
    },
    input: { maxTokens: 100000, tokenReserve: 0.05, pasteTimeout: 1000 },
    debug: { enabled: false, maxLogLines: 100, showFullJSON: false }
  };
}

// Export types and utilities
export type { SignalTag, SignalState, AnimatedSignalProps };