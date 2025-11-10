/**
 * ♫ TUI Test Environment
 *
 * Specialized testing environment for TUI components with
 * mock terminal, animation control, and visual regression support
 */

import React from 'react';
import { EventEmitter } from 'events';
import { render } from 'ink-testing-library';

export interface MockTerminalDimensions {
  columns: number;
  rows: number;
}

export interface MockTerminalConfig {
  dimensions: MockTerminalDimensions;
  colors: boolean;
  interactive: boolean;
  supportsUnicode: boolean;
  supportsTrueColor: boolean;
}

export interface TUITestRenderOptions extends Omit<RenderOptions, 'stdin' | 'stdout' | 'stderr'> {
  mockTerminal?: Partial<MockTerminalConfig>;
  mockAnimations?: boolean;
  animationSpeed?: number;
  captureFrames?: boolean;
}

export interface TUITestFrame {
  timestamp: number;
  content: string;
  dimensions: MockTerminalDimensions;
}

export interface TUITestInstance {
  unmount: () => void;
  rerender: (element: React.ReactElement) => void;
  frames: TUITestFrame[];
  lastFrame: () => TUITestFrame;
  getInput: () => string;
  setInputs: (inputs: string[]) => void;
  press: (key: string) => void;
  wait: (ms?: number) => Promise<void>;
  waitFor: (matcher: (frame: TUITestFrame) => boolean, timeout?: number) => Promise<TUITestFrame>;
}

/**
 * Mock terminal implementation for testing
 */
export class MockTerminal extends EventEmitter {
  private config: MockTerminalConfig;
  private input: string[] = [];
  private inputIndex: number = 0;
  private output: string[] = [];
  private dimensions: MockTerminalDimensions;

  constructor(config: Partial<MockTerminalConfig> = {}) {
    super();

    this.config = {
      dimensions: { columns: 80, rows: 24 },
      colors: true,
      interactive: true,
      supportsUnicode: true,
      supportsTrueColor: true,
      ...config
    };

    this.dimensions = this.config.dimensions;
  }

  get columns(): number {
    return this.dimensions.columns;
  }

  get rows(): number {
    return this.dimensions.rows;
  }

  get isTTY(): boolean {
    return this.config.interactive;
  }

  write(data: string): void {
    this.output.push(data);
    this.emit('data', data);
  }

  setRawMode(_enable: boolean): void {
    // Mock implementation
  }

  resume(): void {
    // Mock implementation
  }

  pause(): void {
    // Mock implementation
  }

  // EventEmitter methods are already available from parent class
  // No need to override them

  // Test-specific methods
  setDimensions(columns: number, rows: number): void {
    this.dimensions = { columns, rows };
    this.emit('resize', columns, rows);
  }

  setInput(inputs: string[]): void {
    this.input = inputs;
    this.inputIndex = 0;
  }

  readInput(): string | null {
    if (this.inputIndex < this.input.length) {
      const input = this.input[this.inputIndex++];
      return input ?? null;
    }
    return null;
  }

  getOutput(): string[] {
    return [...this.output];
  }

  clearOutput(): void {
    this.output = [];
  }
}

/**
 * Animation controller for testing
 */
export class AnimationController {
  private isPaused: boolean = false;
  private speed: number = 1.0;
  private frameCallbacks: Map<string, () => void> = new Map();
  private currentFrame: number = 0;

  constructor(speed: number = 1.0) {
    this.speed = speed;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
  }

  nextFrame(): void {
    if (!this.isPaused) {
      this.currentFrame++;
      this.frameCallbacks.forEach(callback => callback());
    }
  }

  registerCallback(id: string, callback: () => void): void {
    this.frameCallbacks.set(id, callback);
  }

  unregisterCallback(id: string): void {
    this.frameCallbacks.delete(id);
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  isAnimationPaused(): boolean {
    return this.isPaused;
  }
}

/**
 * TUI Test Environment
 */
export class TUITestEnvironment {
  private mockTerminal: MockTerminal;
  private animationController: AnimationController | null = null;
  private options: TUITestRenderOptions;

  constructor(options: TUITestRenderOptions = {}) {
    this.options = {
      mockTerminal: {},
      mockAnimations: true,
      animationSpeed: 1.0,
      captureFrames: true,
      ...options
    };

    this.mockTerminal = new MockTerminal(this.options.mockTerminal);
    this.animationController = new AnimationController(this.options.animationSpeed);
  }

  /**
   * Render a TUI component for testing
   */
  render(element: React.ReactElement): TUITestInstance {
    const frames: TUITestFrame[] = [];
    const startTime = Date.now();

    const mockStdin = {
      isTTY: true,
      setRawMode: () => {},
      resume: () => {},
      pause: () => {},
      on: () => {},
      off: () => {},
      removeListener: () => {},
      write: () => {},
      destroy: () => {}
    };

    const mockStdout = {
      isTTY: this.mockTerminal.isTTY,
      columns: this.mockTerminal.columns,
      rows: this.mockTerminal.rows,
      write: (data: string) => this.mockTerminal.write(data)
    };

    const { lastFrame, unmount, rerender } = render(element);

    // Capture frames if enabled
    if (this.options.captureFrames) {
      const captureInterval = setInterval(() => {
        const content = lastFrame() ?? '';
        frames.push({
          timestamp: Date.now() - startTime,
          content,
          dimensions: {
            columns: this.mockTerminal.columns,
            rows: this.mockTerminal.rows
          }
        });
      }, 16); // ~60fps

      // Cleanup function to be called on unmount
      const originalUnmount = unmount;
      return {
        unmount: () => {
          clearInterval(captureInterval);
          originalUnmount();
        },
        rerender,
        frames,
        lastFrame: () => {
          const content = lastFrame() ?? '';
          return {
            timestamp: Date.now() - startTime,
            content,
            dimensions: {
              columns: this.mockTerminal.columns,
              rows: this.mockTerminal.rows
            }
          };
        },
        getInput: () => this.mockTerminal.getOutput().join(''),
        setInputs: (inputs: string[]) => this.mockTerminal.setInput(inputs),
        press: (key: string) => {
          // Simulate key press
          this.mockTerminal.emit('keypress', key);
        },
        wait: async (ms: number = 100) => {
          await new Promise(resolve => setTimeout(resolve, ms));
          if (!this.animationController.isAnimationPaused()) {
            this.animationController.nextFrame();
          }
        },
        waitFor: async (matcher: (frame: TUITestFrame) => boolean, timeout: number = 5000) => {
          const startTime = Date.now();
          return new Promise((resolve, reject) => {
            const checkFrame = () => {
              const frame = {
                timestamp: Date.now() - startTime,
                content: lastFrame(),
                dimensions: {
                  columns: this.mockTerminal.columns,
                  rows: this.mockTerminal.rows
                }
              };

              if (matcher(frame)) {
                resolve(frame);
              } else if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout waiting for frame matcher after ${timeout}ms`));
              } else {
                setTimeout(checkFrame, 16);
              }
            };

            checkFrame();
          });
        }
      };
    }

    return {
      unmount,
      rerender,
      frames: [],
      lastFrame: () => {
        const content = lastFrame() ?? '';
        return {
          timestamp: Date.now() - startTime,
          content,
          dimensions: {
            columns: this.mockTerminal.columns,
            rows: this.mockTerminal.rows
          }
        };
      },
      getInput: () => this.mockTerminal.getOutput().join(''),
      setInputs: (inputs: string[]) => this.mockTerminal.setInput(inputs),
      press: (key: string) => {
        this.mockTerminal.emit('keypress', key);
      },
      wait: async (ms: number = 100) => {
        await new Promise(resolve => setTimeout(resolve, ms));
      },
      waitFor: async (_matcher: (frame: TUITestFrame) => boolean, _timeout: number = 5000) => {
        throw new Error('Frame capture not enabled');
      }
    };
  }

  /**
   * Get mock terminal instance
   */
  getTerminal(): MockTerminal {
    return this.mockTerminal;
  }

  /**
   * Get animation controller
   */
  getAnimationController(): AnimationController {
    return this.animationController;
  }

  /**
   * Set terminal dimensions
   */
  setDimensions(columns: number, rows: number): void {
    this.mockTerminal.setDimensions(columns, rows);
  }

  /**
   * Test utility functions
   */
  getUtils() {
    return {
      /**
       * Wait for text to appear in output
       */
      waitForText: async (text: string, timeout: number = 5000): Promise<boolean> => {
        const startTime = Date.now();
        return new Promise(resolve => {
          const checkText = () => {
            const output = this.mockTerminal.getOutput().join('');
            if (output.includes(text)) {
              resolve(true);
            } else if (Date.now() - startTime > timeout) {
              resolve(false);
            } else {
              setTimeout(checkText, 50);
            }
          };
          checkText();
        });
      },

      /**
       * Count occurrences of text in output
       */
      countTextOccurrences: (text: string): number => {
        const output = this.mockTerminal.getOutput().join('');
        const matches = output.match(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
        return matches ? matches.length : 0;
      },

      /**
       * Extract color codes from output
       */
      extractColorCodes: (): string[] => {
        const output = this.mockTerminal.getOutput().join('');
        // eslint-disable-next-line no-control-regex
        const colorRegex = /\x1b\[[0-9;]*m/g;
        const matches = output.match(colorRegex);
        return matches ?? [];
      },

      /**
       * Check if output contains specific color
       */
      hasColorCode: (colorCode: string): boolean => {
        const output = this.mockTerminal.getOutput().join('');
        // eslint-disable-next-line no-control-regex
        const colorRegex = /\x1b\[[0-9;]*m/g;
        const matches = output.match(colorRegex);
        const codes = matches ?? [];
        return codes.includes(colorCode);
      },

      /**
       * Get clean text without ANSI codes
       */
      getCleanText: (): string => {
        const output = this.mockTerminal.getOutput().join('');
        // eslint-disable-next-line no-control-regex
        return output.replace(/\x1b\[[0-9;]*m/g, '');
      },

      /**
       * Simulate resize event
       */
      simulateResize: (columns: number, rows: number) => {
        this.setDimensions(columns, rows);
      },

      /**
       * Clear terminal output
       */
      clearTerminal: () => {
        this.mockTerminal.clearOutput();
      }
    };
  }

  /**
   * Cleanup test environment
   */
  dispose(): void {
    this.mockTerminal.removeAllListeners();
    this.animationController = null;
  }
}

/**
 * Default test environment instance
 */
export const defaultTestEnvironment = new TUITestEnvironment();

/**
 * Convenience function to render TUI components
 */
export function renderTUI(element: React.ReactElement, options?: TUITestRenderOptions): TUITestInstance {
  const environment = new TUITestEnvironment(options);
  return environment.render(element);
}

/**
 * Visual regression utilities
 */
export class VisualRegression {
  private baselineFrames: Map<string, TUITestFrame[]> = new Map();

  /**
   * Capture baseline frames for comparison
   */
  captureBaseline(name: string, frames: TUITestFrame[]): void {
    this.baselineFrames.set(name, frames);
  }

  /**
   * Compare frames against baseline
   */
  compareAgainstBaseline(name: string, frames: TUITestFrame[]): {
    matches: boolean;
    differences: Array<{
      frameIndex: number;
      baselineFrame: TUITestFrame;
      currentFrame: TUITestFrame;
      diff: string;
    }>;
  } {
    const baseline = this.baselineFrames.get(name);
    if (!baseline) {
      throw new Error(`No baseline found for test: ${name}`);
    }

    const differences: Array<{
      frameIndex: number;
      baselineFrame: TUITestFrame;
      currentFrame: TUITestFrame;
      diff: string;
    }> = [];

    const maxFrames = Math.max(baseline.length, frames.length);

    for (let i = 0; i < maxFrames; i++) {
      const baselineFrame = baseline[i];
      const currentFrame = frames[i];

      if (!baselineFrame || !currentFrame || baselineFrame.content !== currentFrame.content) {
        differences.push({
          frameIndex: i,
          baselineFrame: baselineFrame ?? { timestamp: 0, content: '', dimensions: { columns: 0, rows: 0 } },
          currentFrame: currentFrame ?? { timestamp: 0, content: '', dimensions: { columns: 0, rows: 0 } },
          diff: this.generateDiff(baselineFrame?.content ?? '', currentFrame?.content ?? '')
        });
      }
    }

    return {
      matches: differences.length === 0,
      differences
    };
  }

  /**
   * Generate diff between two strings
   */
  private generateDiff(baseline: string, current: string): string {
    // Simple character-by-character diff
    const lines1 = baseline.split('\n');
    const lines2 = current.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    const diff: string[] = [];

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] ?? '';
      const line2 = lines2[i] ?? '';

      if (line1 !== line2) {
        diff.push(`Line ${i + 1}: "${line1}" -> "${line2}"`);
      }
    }

    return diff.join('\n');
  }

  /**
   * Save baseline frames to file
   */
  saveBaseline(name: string, _frames: TUITestFrame[], filePath: string): void {
    // In a real implementation, this would write to file system
    // eslint-disable-next-line no-console
    console.log(`Would save baseline ${name} to ${filePath}`);
  }

  /**
   * Load baseline frames from file
   */
  loadBaseline(name: string, filePath: string): TUITestFrame[] | null {
    // In a real implementation, this would read from file system
    // eslint-disable-next-line no-console
    console.log(`Would load baseline ${name} from ${filePath}`);
    return null;
  }
}

export default TUITestEnvironment;