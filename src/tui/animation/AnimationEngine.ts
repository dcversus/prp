/**
 * ♫ TUI Animation Engine
 *
 * Core animation system for terminal-based animations with
 * frame management, timing control, and performance optimization
 */

import { EventEmitter } from 'events';

export interface AnimationFrame {
  content: string;
  duration: number; // ms
  timestamp?: number;
}

export interface AnimationConfig {
  frames: AnimationFrame[];
  loop?: boolean;
  fps?: number;
  onComplete?: () => void;
  onFrame?: (frame: AnimationFrame, index: number) => void;
}

export interface MelodyConfig {
  bpm: number;
  steps: number[]; // 0/1 for blink pattern
  name: string;
  composer: string;
  duration: number; // ms
}

export interface MelodyBeat {
  index: number;
  isOnBeat: boolean;
  timestamp: number;
  nextBeat: number;
}

export interface SignalAnimationState {
  code: string;
  currentFrame: number;
  frames: string[];
  isAnimating: boolean;
  startTime?: number;
  lastUpdate?: number;
  direction?: 'forward' | 'backward';
}

export type AnimationType =
  | 'progress'      // [F ] → [  ] → [ F] → [FF]
  | 'dispatch'      // [  ] → [ ♫] → [♫♫] → [♫ ] → [  ]
  | 'wave'          // Scanner wave animation
  | 'blink'         // Simple blink effect
  | 'melody'        // Beat-synchronized animation
  | 'idle'          // Idle state animation
  | 'error'         // Error state animation
  | 'spawn'         // Agent spawning animation
  | 'done'          // Completion animation (2x brace flash);

/**
 * Core Animation Engine class
 */
export class AnimationEngine extends EventEmitter {
  private animations: Map<string, SignalAnimationState> = new Map();
  private melody?: MelodyConfig;
  private melodyInterval?: NodeJS.Timeout;
  private currentBeat: MelodyBeat | null = null;
  private globalFPS: number;
  private isRunning: boolean = false;

  constructor(globalFPS: number = 8) {
    super();
    this.globalFPS = globalFPS;
    this.startEngine();
  }

  /**
   * Start the animation engine
   */
  private startEngine(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    // Main animation loop
    const frameInterval = 1000 / this.globalFPS;
    let lastFrame = 0;

    const animationLoop = () => {
      const now = Date.now();

      if (now - lastFrame >= frameInterval) {
        this.updateAnimations(now);
        lastFrame = now;
      }

      if (this.isRunning) {
        setImmediate(animationLoop);
      }
    };

    setImmediate(animationLoop);
  }

  /**
   * Stop the animation engine
   */
  stopEngine(): void {
    this.isRunning = false;
    this.clearAllAnimations();
    this.stopMelody();
  }

  /**
   * Update all active animations
   */
  private updateAnimations(now: number): void {
    this.animations.forEach((state, id) => {
      if (!state.isAnimating) {
        return;
      }

      const frameDuration = 1000 / this.globalFPS;

      if (now - (state.lastUpdate ?? 0) >= frameDuration) {
        this.updateAnimation(id, now);
      }
    });
  }

  /**
   * Update a single animation frame
   */
  private updateAnimation(id: string, now: number): void {
    const state = this.animations.get(id);
    if (!state?.isAnimating) {
      return;
    }

    const { frames, currentFrame, direction = 'forward' } = state;

    // Calculate next frame
    let nextFrame = currentFrame;

    if (direction === 'forward') {
      nextFrame = (currentFrame + 1) % frames.length;
    } else {
      nextFrame = currentFrame > 0 ? currentFrame - 1 : frames.length - 1;
    }

    // Update state
    state.currentFrame = nextFrame;
    state.lastUpdate = now;

    // Emit frame change event
    this.emit('animationFrame', {
      id,
      frame: frames[nextFrame],
      frameIndex: nextFrame,
      state
    });

    // Check for completion
    if (this.shouldCompleteAnimation(state)) {
      this.completeAnimation(id);
    }
  }

  /**
   * Check if animation should complete
   */
  private shouldCompleteAnimation(state: SignalAnimationState): boolean {
    // Non-looping animations complete after one cycle
    if (state.frames.length > 0) {
      return state.currentFrame === state.frames.length - 1 && state.direction === 'forward';
    }
    return false;
  }

  /**
   * Complete an animation
   */
  private completeAnimation(id: string): void {
    const state = this.animations.get(id);
    if (!state) {
      return;
    }

    state.isAnimating = false;
    this.emit('animationComplete', { id, state });

    // Auto-remove non-looping animations
    if (!this.isLoopingAnimation(state.code)) {
      this.animations.delete(id);
    }
  }

  /**
   * Check if animation should loop
   */
  private isLoopingAnimation(code: string): boolean {
    // Melody sync, idle states, and certain signals loop
    const loopingSignals = ['[  ]', '[ ♫]', '[♫♫]', '[♫ ]'];
    return loopingSignals.includes(code);
  }

  /**
   * Register a signal animation
   */
  registerSignalAnimation(
    id: string,
    code: string,
    type: AnimationType
  ): void {
    const frames = this.generateFrames(code, type);

    const state: SignalAnimationState = {
      code,
      currentFrame: 0,
      frames,
      isAnimating: true,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      direction: 'forward'
    };

    this.animations.set(id, state);
    this.emit('animationStart', { id, code, type, state });
  }

  /**
   * Generate animation frames based on signal code and type
   */
  private generateFrames(code: string, type: AnimationType): string[] {
    switch (type) {
      case 'progress':
        return this.generateProgressFrames(code);
      case 'dispatch':
        return this.generateDispatchFrames();
      case 'wave':
        return this.generateWaveFrames(code);
      case 'blink':
        return this.generateBlinkFrames(code);
      case 'melody':
        return this.generateMelodyFrames(code);
      case 'idle':
        return this.generateIdleFrames();
      case 'error':
        return this.generateErrorFrames();
      case 'spawn':
        return this.generateSpawnFrames();
      case 'done':
        return this.generateDoneFrames();
      default:
        return [code];
    }
  }

  /**
   * Generate progress animation frames (8fps = 125ms per frame)
   */
  private generateProgressFrames(code: string): string[] {
    if (code === '[FF]') {
      return ['[F ]', '[  ]', '[ F]', '[FF]'];
    }
    return [code];
  }

  /**
   * Generate dispatch loop animation frames
   */
  private generateDispatchFrames(): string[] {
    return ['[  ]', '[ ♫]', '[♫♫]', '[♫ ]', '[  ]'];
  }

  /**
   * Generate scanner wave animation frames
   */
  private generateWaveFrames(code: string): string[] {
    // Wave effect: underline progresses through the signal
    const chars = code.split('');
    const frames: string[] = [];

    for (let i = 0; i < chars.length + 2; i++) {
      const frame = chars.map((char, index) => {
        if (index === i - 1 && char !== '[' && char !== ']') {
          return `\x1b[4m${char}\x1b[0m`; // Underlined
        }
        return char;
      }).join('');

      frames.push(frame);
    }

    return frames;
  }

  /**
   * Generate simple blink animation frames
   */
  private generateBlinkFrames(code: string): string[] {
    return [code, '   ', code];
  }

  /**
   * Generate melody-synchronized frames
   */
  private generateMelodyFrames(code: string): string[] {
    // Sync with melody beats - will be updated by melody system
    return [code, `${code}`.replace(/♫/g, ' ')];
  }

  /**
   * Generate idle animation frames
   */
  private generateIdleFrames(): string[] {
    return ['♫', ' ♫', '  ', ' ♫', '♫'];
  }

  /**
   * Generate error animation frames
   */
  private generateErrorFrames(): string[] {
    return ['⚠ ', ' ⚠', '  ', ' ⚠', '⚠ '];
  }

  /**
   * Generate spawning animation frames
   */
  private generateSpawnFrames(): string[] {
    return ['♪', ' ♪', '  ♪', '   ♪', '♪'];
  }

  /**
   * Generate completion animation frames (2x brace flash)
   */
  private generateDoneFrames(): string[] {
    return ['[  ]', '[!!]', '[  ]', '[!!]', '[  ]'];
  }

  /**
   * Load and start melody synchronization
   */
  loadMelody(melody: MelodyConfig): void {
    this.melody = melody;
    this.startMelodySync();
  }

  /**
   * Start melody beat synchronization
   */
  private startMelodySync(): void {
    if (!this.melody || this.melodyInterval) {
      return;
    }

    const beatInterval = 60000 / (this.melody.bpm * 2); // 8th notes
    let currentStep = 0;

    this.melodyInterval = setInterval(() => {
      const melody = this.melody;
      if (!melody) {
        return;
      }

      const isOnBeat = melody.steps[currentStep % melody.steps.length] === 1;

      this.currentBeat = {
        index: currentStep,
        isOnBeat,
        timestamp: Date.now(),
        nextBeat: currentStep + 1
      };

      this.emit('melodyBeat', this.currentBeat);

      // Update melody-synchronized animations
      this.updateMelodyAnimations(isOnBeat);

      currentStep++;
    }, beatInterval);
  }

  /**
   * Update animations that sync with melody
   */
  private updateMelodyAnimations(isOnBeat: boolean): void {
    this.animations.forEach((state, id) => {
      if (state.code.includes('♫') && state.isAnimating) {
        const targetFrame = isOnBeat ? 0 : 1; // Show/hide based on beat

        if (state.currentFrame !== targetFrame) {
          state.currentFrame = targetFrame;
          state.lastUpdate = Date.now();

          this.emit('animationFrame', {
            id,
            frame: state.frames[targetFrame],
            frameIndex: targetFrame,
            state
          });
        }
      }
    });
  }

  /**
   * Stop melody synchronization
   */
  stopMelody(): void {
    if (this.melodyInterval) {
      clearInterval(this.melodyInterval);
      this.melodyInterval = undefined;
    }
    this.currentBeat = null;
  }

  /**
   * Get current melody beat information
   */
  getCurrentBeat(): MelodyBeat | null {
    return this.currentBeat;
  }

  /**
   * Pause a specific animation
   */
  pauseAnimation(id: string): void {
    const state = this.animations.get(id);
    if (state) {
      state.isAnimating = false;
      this.emit('animationPause', { id, state });
    }
  }

  /**
   * Resume a paused animation
   */
  resumeAnimation(id: string): void {
    const state = this.animations.get(id);
    if (state) {
      state.isAnimating = true;
      state.lastUpdate = Date.now();
      this.emit('animationResume', { id, state });
    }
  }

  /**
   * Stop and remove an animation
   */
  removeAnimation(id: string): void {
    const state = this.animations.get(id);
    if (state) {
      state.isAnimating = false;
      this.animations.delete(id);
      this.emit('animationRemove', { id, state });
    }
  }

  /**
   * Clear all animations
   */
  clearAllAnimations(): void {
    this.animations.forEach((_state, id) => {
      this.removeAnimation(id);
    });
  }

  /**
   * Get animation state by ID
   */
  getAnimation(id: string): SignalAnimationState | undefined {
    return this.animations.get(id);
  }

  /**
   * Get all active animations
   */
  getAllAnimations(): Map<string, SignalAnimationState> {
    return new Map(this.animations);
  }

  /**
   * Get animation statistics
   */
  getStats(): {
    totalAnimations: number;
    activeAnimations: number;
    melodySync: boolean;
    currentBeat: MelodyBeat | null;
    } {
    const totalAnimations = this.animations.size;
    const activeAnimations = Array.from(this.animations.values())
      .filter(state => state.isAnimating).length;

    return {
      totalAnimations,
      activeAnimations,
      melodySync: !!this.melodyInterval,
      currentBeat: this.currentBeat
    };
  }

  /**
   * Set global animation speed (FPS)
   */
  setGlobalFPS(fps: number): void {
    this.globalFPS = Math.max(1, Math.min(60, fps));
  }

  /**
   * Get current global FPS
   */
  getGlobalFPS(): number {
    return this.globalFPS;
  }

  /**
   * Cleanup method for graceful shutdown
   */
  dispose(): void {
    this.stopEngine();
    this.removeAllListeners();
  }
}

// Global animation engine instance
export const globalAnimationEngine = new AnimationEngine();

/**
 * Hook for using animations in React components
 */
export function useAnimationEngine() {
  return {
    engine: globalAnimationEngine,
    registerSignalAnimation: globalAnimationEngine.registerSignalAnimation.bind(globalAnimationEngine),
    pauseAnimation: globalAnimationEngine.pauseAnimation.bind(globalAnimationEngine),
    resumeAnimation: globalAnimationEngine.resumeAnimation.bind(globalAnimationEngine),
    removeAnimation: globalAnimationEngine.removeAnimation.bind(globalAnimationEngine),
    getCurrentBeat: globalAnimationEngine.getCurrentBeat.bind(globalAnimationEngine),
    loadMelody: globalAnimationEngine.loadMelody.bind(globalAnimationEngine),
    getStats: globalAnimationEngine.getStats.bind(globalAnimationEngine)
  };
}

/**
 * Utility functions for common animation patterns
 */
export const AnimationUtils = {
  /**
   * Create a delay promise
   */
  delay: (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create a repeating timer with cleanup
   */
  createTimer: (callback: () => void, interval: number) => {
    const timerId = setInterval(callback, interval);
    return () => clearInterval(timerId);
  },

  /**
   * Debounce rapid function calls
   */
  debounce: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function calls to max frequency
   */
  throttle: <T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false; 
        }, limit);
      }
    };
  }
};

export default AnimationEngine;