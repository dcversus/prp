/**
 * ♫ Signal Animation System
 *
 * Frame-based animation system for signal progress indicators and state transitions
 * implementing the exact animation specifications from the PRP requirements
 */

import { useEffect, useState, useRef } from 'react';

export interface SignalAnimationProps {
  code: string;
  state: 'placeholder' | 'active' | 'progress' | 'resolved';
  animate?: boolean;
  onAnimationComplete?: () => void;
}

export interface AnimationFrame {
  content: string;
  duration: number; // milliseconds
}

export function SignalAnimation({ code, state, animate = true, onAnimationComplete }: SignalAnimationProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Animation patterns based on signal state
  const getAnimationFrames = (signalState: string, signalCode: string): AnimationFrame[] => {
    switch (signalState) {
      case 'progress':
        // [F ] → [  ] → [ F] → [FF] animation at ~8fps
        if (signalCode === '[FF]') {
          return [
            { content: '[F ]', duration: 125 }, // 8fps = 125ms per frame
            { content: '[  ]', duration: 125 },
            { content: '[ F]', duration: 125 },
            { content: '[FF]', duration: 125 }
          ];
        }
        break;

      case 'active':
        // For signals being processed by orchestrator
        return [
          { content: code, duration: 2000 } // Hold for 2 seconds
        ];

      case 'placeholder':
        // Empty placeholder animation
        return [
          { content: '[  ]', duration: 1000 }
        ];

      case 'resolved':
        // Static resolved state
        return [
          { content: code, duration: 1000 }
        ];

      default:
        return [{ content: code, duration: 1000 }];
    }

    return [{ content: code, duration: 1000 }];
  };

  
  useEffect(() => {
    if (!animate) {
      setCurrentFrame(0);
      setIsAnimating(false);
      return;
    }

    const frames = getAnimationFrames(state, code);
    if (frames.length <= 1) {
      setCurrentFrame(0);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    let frameIndex = 0;

    const runAnimation = () => {
      setCurrentFrame(frameIndex);

      // Move to next frame
      frameIndex = (frameIndex + 1) % frames.length;

      // Check if animation should complete
      if (state !== 'progress' && frameIndex === 0) {
        setIsAnimating(false);
        onAnimationComplete?.();
        return;
      }

      const frameDuration = frames[frameIndex]?.duration;
      if (frameDuration) {
        animationRef.current = setTimeout(runAnimation, frameDuration);
      }
    };

    // Start animation
    const firstFrameDuration = frames[0]?.duration;
    if (firstFrameDuration) {
      animationRef.current = setTimeout(runAnimation, firstFrameDuration);
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [state, code, animate, onAnimationComplete]);

  const frames = getAnimationFrames(state, code);
  const currentContent = frames[currentFrame]?.content ?? code;

  return {
    content: currentContent,
    isAnimating,
    currentFrame,
    totalFrames: frames.length
  };
}

/**
 * Hook for managing signal animations across multiple signals
 */
export function useSignalAnimationSystem() {
  const [animationState, setAnimationState] = useState<Map<string, unknown>>(new Map());

  const updateSignal = (signalId: string, state: string, code: string) => {
    setAnimationState(prev => {
      const newMap = new Map(prev);
      newMap.set(signalId, { state, code, lastUpdate: Date.now() });
      return newMap;
    });
  };

  const triggerScannerWave = (signalIds: string[]) => {
    setAnimationState(prev => {
      const newMap = new Map(prev);
      signalIds.forEach((id, index) => {
        setTimeout(() => {
          setAnimationState(prevMap => {
            const updatedMap = new Map(prevMap);
            const signal = updatedMap.get(id);
            if (signal) {
              updatedMap.set(id, { ...signal, animating: 'wave' });
            }
            return updatedMap;
          });
        }, index * 30); // 30ms stagger for wave effect
      });
      return newMap;
    });
  };

  const triggerInspectorBlink = (signalIds: string[]) => {
    setAnimationState(prev => {
      const newMap = new Map(prev);
      signalIds.forEach(id => {
        const signal = newMap.get(id);
        if (signal) {
          newMap.set(id, { ...signal, animating: 'blink' });
        }
      });
      return newMap;
    });

    // Reset after animation completes
    setTimeout(() => {
      setAnimationState(prev => {
        const newMap = new Map(prev);
        signalIds.forEach(id => {
          const signal = newMap.get(id);
          if (signal) {
            newMap.set(id, { ...signal, animating: false });
          }
        });
        return newMap;
      });
    }, 480); // 4 frames * 120ms
  };

  return {
    animationState,
    updateSignal,
    triggerScannerWave,
    triggerInspectorBlink
  };
}

/**
 * Melody synchronization for idle animations
 */
export function useMelodySync(melodyData: { bpm: number; steps: number[] }) {
  const [beat, setBeat] = useState(0);
  const [isOnBeat, setIsOnBeat] = useState(false);

  useEffect(() => {
    const beatInterval = 60000 / melodyData.bpm; // Convert BPM to milliseconds

    const interval = setInterval(() => {
      setBeat(prev => (prev + 1) % melodyData.steps.length);
      setIsOnBeat(true);

      // Brief flash on beat
      setTimeout(() => setIsOnBeat(false), 100);
    }, beatInterval);

    return () => clearInterval(interval);
  }, [melodyData]);

  return { beat, isOnBeat, currentStep: melodyData.steps[beat] };
}