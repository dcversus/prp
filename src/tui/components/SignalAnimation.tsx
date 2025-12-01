/**
 * ♫ Enhanced Signal Animation System
 *
 * Frame-based animation system implementing exact PRP-000-agents05.md specifications:
 * - State transitions: ♪ (await) → ♩ (parse) → ♬ (spawn) → ♫ (steady)
 * - Wave animation: Sliding pastel wave across signal placeholders
 * - Inspector blink: Double brace blink on completion
 * - Progress cells: [FF] animation at 8fps
 * - Melody blink: Idle ♫ blink synchronized to beat
 */

import { useEffect, useState, useRef } from 'react';

export interface SignalAnimationProps {
  code: string;
  state: 'placeholder' | 'active' | 'progress' | 'resolved';
  animate?: boolean;
  onAnimationComplete?: () => void;
};

export interface AnimationFrame {
  content: string;
  duration: number; // milliseconds
};

export const SignalAnimation = ({
  code,
  state,
  animate = true,
  onAnimationComplete,
}: SignalAnimationProps) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Music state symbols (exact PRP spec)
  const MUSIC_STATES = {
    await: '♪', // Awaiting input
    parse: '♩', // Parsing data
    spawn: '♬', // Spawning agents (pair)
    steady: '♫', // Steady state
  } as const;

  type MusicState = keyof typeof MUSIC_STATES;

  // Animation patterns based on signal state (exact PRP spec)
  const getAnimationFrames = (signalState: string, signalCode: string): AnimationFrame[] => {
    switch (signalState) {
      case 'progress':
        // [F ] → [  ] → [ F] → [FF] animation at ~8fps (exact PRP spec)
        if (signalCode === '[FF]') {
          return [
            { content: '[F ]', duration: 125 }, // 8fps = 125ms per frame
            { content: '[  ]', duration: 125 },
            { content: '[ F]', duration: 125 },
            { content: '[FF]', duration: 125 },
          ];
        }

        // Orchestrator→Agent dispatch animation (PRP spec)
        if (signalCode.includes('♫')) {
          return [
            { content: '[  ]', duration: 50 }, // 50ms per slot for wave
            { content: '[ ♫]', duration: 50 },
            { content: '[♫♫]', duration: 50 },
            { content: '[♫ ]', duration: 50 },
            { content: '[  ]', duration: 50 },
          ];
        }
        break;

      case 'active':
      case 'processing': {
        // For signals being processed - show state progression
        const stateProgression: MusicState[] = ['await', 'parse', 'spawn'];
        return stateProgression.map((state) => ({
          content: MUSIC_STATES[state],
          duration: 500, // 0.5s per state transition
        }));
      }

      case 'scanning':
        // Scanner wave animation (PRP spec - sliding pastel wave)
        return [
          { content: '[', duration: 50 },
          { content: '[♩', duration: 50 },
          { content: '[♩ ', duration: 50 },
          { content: '[♩  ', duration: 50 },
          { content: '[♩   ', duration: 50 },
          { content: '[♩    ', duration: 50 },
          { content: '[♩     ', duration: 50 },
          { content: '[♩      ]', duration: 50 },
        ];

      case 'inspector_done':
        // Inspector double brace blink (PRP spec)
        return [
          { content: '{{ }}', duration: 100 },
          { content: '{{  }}', duration: 100 },
          { content: '{{ }}', duration: 100 },
          { content: '{{  }}', duration: 100 },
          { content: '{{ }}', duration: 100 },
        ];

      case 'steady':
      case 'resolved':
        // Static resolved state with steady symbol
        return [{ content: `${MUSIC_STATES.steady  } ${  code}`, duration: 1000 }];

      case 'idle':
        // Idle melody blink (PRP spec - ♫ blink synchronized to beat)
        return [
          { content: MUSIC_STATES.steady, duration: 500 }, // On beat
          { content: ' ', duration: 500 }, // Off beat
        ];

      case 'placeholder':
        // Empty placeholder [ ] animation
        return [{ content: '[  ]', duration: 1000 }];

      case 'error':
        // Error state animation
        return [
          { content: '♪', duration: 250 },
          { content: '⚠', duration: 250 },
          { content: '♪', duration: 250 },
          { content: '⚠', duration: 250 },
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
    totalFrames: frames.length,
  };
};

/**
 * Hook for managing signal animations across multiple signals
 * Enhanced with PRP-000-agents05.md wave and inspector blink specifications
 */
export const useSignalAnimationSystem = () => {
  const [animationState, setAnimationState] = useState<Map<string, any>>(new Map());

  const updateSignal = (signalId: string, state: string, code: string) => {
    setAnimationState((prev) => {
      const newMap = new Map(prev);
      newMap.set(signalId, {
        state,
        code,
        lastUpdate: Date.now(),
        animationType: null,
      });
      return newMap;
    });
  };

  // Trigger scanner wave animation (exact PRP spec: 50ms per slot)
  const triggerScannerWave = (signalIds: string[]) => {
    setAnimationState((prev) => {
      const newMap = new Map(prev);

      // Create wave effect from left→right across signal placeholders
      signalIds.forEach((id, index) => {
        setTimeout(() => {
          setAnimationState((prevMap) => {
            const updatedMap = new Map(prevMap);
            const signal = updatedMap.get(id);
            if (signal) {
              updatedMap.set(id, {
                ...signal,
                animationType: 'wave',
                wavePosition: index,
                maxWavePosition: signalIds.length,
              });
            }
            return updatedMap;
          });
        }, index * 50); // 50ms per slot for wave animation (PRP spec)
      });
      return newMap;
    });

    // Clear wave animation after completion
    setTimeout(
      () => {
        setAnimationState((prev) => {
          const newMap = new Map(prev);
          signalIds.forEach((id) => {
            const signal = newMap.get(id);
            if (signal?.animationType === 'wave') {
              newMap.set(id, {
                ...signal,
                animationType: null,
                wavePosition: null,
                maxWavePosition: null,
              });
            }
          });
          return newMap;
        });
      },
      signalIds.length * 50 + 200,
    ); // Add 200ms buffer
  };

  // Trigger inspector double brace blink (exact PRP spec)
  const triggerInspectorBlink = (signalIds: string[]) => {
    setAnimationState((prev) => {
      const newMap = new Map(prev);
      signalIds.forEach((id) => {
        const signal = newMap.get(id);
        if (signal) {
          newMap.set(id, {
            ...signal,
            animationType: 'inspector_blink',
            blinkCount: 0,
          });
        }
      });
      return newMap;
    });

    // Blink sequence: pastel → base → pastel → base → pastel (double blink)
    let blinkCount = 0;
    const blinkInterval = setInterval(() => {
      setAnimationState((prev) => {
        const newMap = new Map(prev);
        signalIds.forEach((id) => {
          const signal = newMap.get(id);
          if (signal?.animationType === 'inspector_blink') {
            newMap.set(id, {
              ...signal,
              blinkCount: blinkCount,
            });
          }
        });
        return newMap;
      });

      blinkCount++;
      if (blinkCount >= 5) {
        // Complete 5 frame blink sequence
        clearInterval(blinkInterval);

        // Reset after animation
        setTimeout(() => {
          setAnimationState((prev) => {
            const newMap = new Map(prev);
            signalIds.forEach((id) => {
              const signal = newMap.get(id);
              if (signal?.animationType === 'inspector_blink') {
                newMap.set(id, {
                  ...signal,
                  animationType: null,
                  blinkCount: null,
                });
              }
            });
            return newMap;
          });
        }, 100);
      }
    }, 200); // 200ms per blink frame (PRP spec)
  };

  // Trigger state transition animation (♪ → ♩ → ♬ → ♫)
  const triggerStateTransition = (signalId: string, fromState: string, toState: string) => {
    const stateSequence = ['await', 'parse', 'spawn', 'steady'];
    const fromIndex = stateSequence.indexOf(fromState);
    const toIndex = stateSequence.indexOf(toState);

    if (fromIndex < 0 || toIndex < 0 || fromIndex >= toIndex) {
      return;
    }

    setAnimationState((prev) => {
      const newMap = new Map(prev);
      const signal = newMap.get(signalId);
      if (signal) {
        newMap.set(signalId, {
          ...signal,
          animationType: 'state_transition',
          transitionStates: stateSequence.slice(fromIndex, toIndex + 1),
          currentTransitionIndex: 0,
        });
      }
      return newMap;
    });

    // Animate through state transitions
    let currentIndex = 0;
    const transitionInterval = setInterval(() => {
      setAnimationState((prev) => {
        const newMap = new Map(prev);
        const signal = newMap.get(signalId);
        if (signal?.animationType === 'state_transition') {
          newMap.set(signalId, {
            ...signal,
            currentTransitionIndex: currentIndex,
          });
        }
        return newMap;
      });

      currentIndex++;
      if (currentIndex >= toIndex - fromIndex + 1) {
        clearInterval(transitionInterval);

        // Reset after transition
        setTimeout(() => {
          setAnimationState((prev) => {
            const newMap = new Map(prev);
            const signal = newMap.get(signalId);
            if (signal?.animationType === 'state_transition') {
              newMap.set(signalId, {
                ...signal,
                animationType: null,
                transitionStates: null,
                currentTransitionIndex: null,
                state: toState,
              });
            }
            return newMap;
          });
        }, 500);
      }
    }, 500); // 0.5s per state transition
  };

  return {
    animationState,
    updateSignal,
    triggerScannerWave,
    triggerInspectorBlink,
    triggerStateTransition,
  };
};

/**
 * Enhanced melody synchronization for idle animations
 * Implements PRP-000-agents05.md melody blink specifications
 */
export const useMelodySync = (melodyData: { bpm: number; steps: number[] }) => {
  const [beat, setBeat] = useState(0);
  const [isOnBeat, setIsOnBeat] = useState(false);
  const [melodyBlinkActive, setMelodyBlinkActive] = useState(false);

  useEffect(() => {
    const beatInterval = 60000 / melodyData.bpm; // Convert BPM to milliseconds

    const interval = setInterval(() => {
      const newBeat = (beat + 1) % melodyData.steps.length;
      setBeat(newBeat);

      // Check if current step should trigger melody blink (PRP spec)
      const shouldBlink = melodyData.steps[newBeat] === 1;
      if (shouldBlink) {
        setMelodyBlinkActive(true);

        // Brief ♫ blink on beat (100ms flash)
        setTimeout(() => setMelodyBlinkActive(false), 100);
      }

      setIsOnBeat(shouldBlink);
    }, beatInterval);

    return () => clearInterval(interval);
  }, [melodyData, beat]);

  // Trigger idle melody blink for last signal's associated melody
  const triggerIdleMelodyBlink = (lastSignalMelody: number[]) => {
    if (lastSignalMelody.length === 0) {
      return;
    }

    let stepIndex = 0;
    const melodyInterval = setInterval(() => {
      const shouldBlink = lastSignalMelody[stepIndex] === 1;
      setMelodyBlinkActive(shouldBlink);

      if (shouldBlink) {
        setTimeout(() => setMelodyBlinkActive(false), 100); // 100ms flash
      }

      stepIndex = (stepIndex + 1) % lastSignalMelody.length;
    }, 60000 / melodyData.bpm); // Use configured BPM

    // Return cleanup function
    return () => clearInterval(melodyInterval);
  };

  return {
    beat,
    isOnBeat,
    melodyBlinkActive,
    currentStep: melodyData.steps[beat],
    triggerIdleMelodyBlink,
  };
};

/**
 * Hook for creating wave animation across signal placeholders
 * PRP spec: Sliding pastel wave across [ ] from left→right
 */
export const useSignalWaveAnimation = (signalCount: number) => {
  const [wavePosition, setWavePosition] = useState(-1); // -1 = no wave
  const [isWaveActive, setIsWaveActive] = useState(false);

  const triggerWave = () => {
    setWavePosition(0);
    setIsWaveActive(true);

    // Move wave across positions at 50ms per slot (PRP spec)
    const waveInterval = setInterval(() => {
      setWavePosition((prev) => {
        const next = prev + 1;
        if (next >= signalCount) {
          setIsWaveActive(false);
          clearInterval(waveInterval);
          return -1; // Reset to no wave
        }
        return next;
      });
    }, 50); // 50ms per slot for wave animation

    return () => clearInterval(waveInterval);
  };

  const getWaveIntensity = (position: number): number => {
    if (!isWaveActive || wavePosition === -1) {
      return 0;
    }

    const distance = Math.abs(position - wavePosition);
    if (distance === 0) {
      return 1.0;
    } // Wave center
    if (distance === 1) {
      return 0.7;
    } // Near wave
    if (distance === 2) {
      return 0.4;
    } // Edge of wave
    return 0; // No wave effect
  };

  return {
    wavePosition,
    isWaveActive,
    triggerWave,
    getWaveIntensity,
  };
};
