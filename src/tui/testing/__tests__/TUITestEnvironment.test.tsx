/**
 * ♫ TUI Test Environment Tests
 *
 * Tests for the TUI testing framework
 */

import React from 'react';
import { Text } from 'ink';
import { TUITestEnvironment, renderTUI, MockTerminal } from '../TUITestEnvironment.js';

describe('TUITestEnvironment', () => {
  let environment: TUITestEnvironment;

  beforeEach(() => {
    environment = new TUITestEnvironment({
      mockAnimations: true,
      captureFrames: true
    });
  });

  afterEach(() => {
    environment.dispose();
  });

  describe('Mock Terminal', () => {
    test('should create mock terminal with default dimensions', () => {
      const terminal = environment.getTerminal();
      expect(terminal.columns).toBe(80);
      expect(terminal.rows).toBe(24);
    });

    test('should allow custom terminal dimensions', () => {
      const customEnvironment = new TUITestEnvironment({
        mockTerminal: {
          dimensions: { columns: 120, rows: 40 }
        }
      });

      const terminal = customEnvironment.getTerminal();
      expect(terminal.columns).toBe(120);
      expect(terminal.rows).toBe(40);

      customEnvironment.dispose();
    });

    test('should handle resize events', () => {
      const terminal = environment.getTerminal();
      const resizeSpy = jest.fn();

      terminal.on('resize', resizeSpy);
      terminal.setDimensions(100, 30);

      expect(resizeSpy).toHaveBeenCalledWith(100, 30);
      expect(terminal.columns).toBe(100);
      expect(terminal.rows).toBe(30);
    });

    test('should handle input and output', () => {
      const terminal = environment.getTerminal();

      terminal.setInput(['hello', 'world']);
      expect(terminal.readInput()).toBe('hello');
      expect(terminal.readInput()).toBe('world');
      expect(terminal.readInput()).toBeNull();

      terminal.write('test output');
      expect(terminal.getOutput()).toContain('test output');

      terminal.clearOutput();
      expect(terminal.getOutput()).toHaveLength(0);
    });
  });

  describe('TUI Rendering', () => {
    test('should render simple text component', () => {
      const TestComponent = () => <Text>Hello World</Text>;
      const instance = environment.render(<TestComponent />);

      const lastFrame = instance.lastFrame();
      expect(lastFrame.content).toContain('Hello World');

      instance.unmount();
    });

    test('should handle component rerendering', () => {
      const TestComponent = ({ message }: { message: string }) => <Text>{message}</Text>;

      const instance = environment.render(<TestComponent message="Initial" />);
      expect(instance.lastFrame().content).toContain('Initial');

      instance.rerender(<TestComponent message="Updated" />);
      expect(instance.lastFrame().content).toContain('Updated');

      instance.unmount();
    });

    test('should capture frames when enabled', () => {
      const TestComponent = () => <Text>Test Content</Text>;

      const frameCaptureEnvironment = new TUITestEnvironment({
        captureFrames: true
      });

      const instance = frameCaptureEnvironment.render(<TestComponent />);

      // Wait a bit for frame capture
      setTimeout(() => {
        expect(instance.frames.length).toBeGreaterThan(0);
        expect(instance.frames[0].content).toContain('Test Content');
        instance.unmount();
        frameCaptureEnvironment.dispose();
      }, 100);
    });

    test('should wait for specific text', async () => {
      const TestComponent = () => <Text>Expected Text</Text>;
      const instance = environment.render(<TestComponent />);

      // Since we're rendering synchronously, the text should already be there
      await instance.wait(100);

      const utils = environment.getUtils();
      const hasText = await utils.waitForText('Expected Text');
      expect(hasText).toBe(true);

      instance.unmount();
    });

    test('should count text occurrences', () => {
      const TestComponent = () => (
        <Text>
          Repeat Repeat Repeat
        </Text>
      );

      const instance = environment.render(<TestComponent />);
      const utils = environment.getUtils();

      const count = utils.countTextOccurrences('Repeat');
      expect(count).toBe(3);

      instance.unmount();
    });
  });

  describe('Animation Control', () => {
    test('should control animation speed', () => {
      const animationController = environment.getAnimationController();

      expect(animationController.getCurrentFrame()).toBe(0);

      animationController.nextFrame();
      expect(animationController.getCurrentFrame()).toBe(1);

      animationController.pause();
      expect(animationController.isAnimationPaused()).toBe(true);

      animationController.resume();
      expect(animationController.isAnimationPaused()).toBe(false);
    });

    test('should register and unregister animation callbacks', () => {
      const animationController = environment.getAnimationController();
      const callback = jest.fn();

      animationController.registerCallback('test', callback);
      animationController.nextFrame();
      expect(callback).toHaveBeenCalledTimes(1);

      animationController.unregisterCallback('test');
      animationController.nextFrame();
      expect(callback).toHaveBeenCalledTimes(1); // Should not increase
    });
  });

  describe('Visual Regression', () => {
    test('should capture and compare baselines', () => {
      const { VisualRegression } = require('../TUITestEnvironment.js');
      const regression = new VisualRegression();

      const baselineFrames = [
        {
          timestamp: 0,
          content: 'Hello World',
          dimensions: { columns: 80, rows: 24 }
        }
      ];

      regression.captureBaseline('test', baselineFrames);

      const currentFrames = [
        {
          timestamp: 0,
          content: 'Hello World',
          dimensions: { columns: 80, rows: 24 }
        }
      ];

      const result = regression.compareAgainstBaseline('test', currentFrames);
      expect(result.matches).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    test('should detect differences in frames', () => {
      const { VisualRegression } = require('../TUITestEnvironment.js');
      const regression = new VisualRegression();

      const baselineFrames = [
        {
          timestamp: 0,
          content: 'Hello World',
          dimensions: { columns: 80, rows: 24 }
        }
      ];

      regression.captureBaseline('test', baselineFrames);

      const currentFrames = [
        {
          timestamp: 0,
          content: 'Hello Different',
          dimensions: { columns: 80, rows: 24 }
        }
      ];

      const result = regression.compareAgainstBaseline('test', currentFrames);
      expect(result.matches).toBe(false);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].diff).toContain('Hello World');
      expect(result.differences[0].diff).toContain('Hello Different');
    });
  });

  describe('Test Utilities', () => {
    test('should extract color codes', () => {
      const terminal = environment.getTerminal();
      const utils = environment.getUtils();

      terminal.write('\x1b[31mRed Text\x1b[0m Normal Text');

      const colorCodes = utils.extractColorCodes();
      expect(colorCodes).toContain('\x1b[31m');
      expect(colorCodes).toContain('\x1b[0m');
    });

    test('should check for specific color codes', () => {
      const terminal = environment.getTerminal();
      const utils = environment.getUtils();

      terminal.write('\x1b[31mRed Text\x1b[0m');

      expect(utils.hasColorCode('\x1b[31m')).toBe(true);
      expect(utils.hasColorCode('\x1b[32m')).toBe(false);
    });

    test('should get clean text without ANSI codes', () => {
      const terminal = environment.getTerminal();
      const utils = environment.getUtils();

      terminal.write('\x1b[31mRed Text\x1b[0m Normal Text');

      const cleanText = utils.getCleanText();
      expect(cleanText).toBe('Red Text Normal Text');
      expect(cleanText).not.toContain('\x1b');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid component gracefully', () => {
      expect(() => {
        const instance = environment.render(null as any);
        instance.unmount();
      }).not.toThrow();
    });

    test('should handle missing baseline gracefully', () => {
      const { VisualRegression } = require('../TUITestEnvironment.js');
      const regression = new VisualRegression();

      expect(() => {
        regression.compareAgainstBaseline('nonexistent', []);
      }).toThrow('No baseline found for test: nonexistent');
    });
  });

  describe('Performance', () => {
    test('should handle multiple render operations', () => {
      const TestComponent = ({ index }: { index: number }) => <Text>Item {index}</Text>;

      const instances = [];
      for (let i = 0; i < 10; i++) {
        const instance = environment.render(<TestComponent index={i} />);
        instances.push(instance);
      }

      // Verify all instances rendered correctly
      instances.forEach((instance, index) => {
        const frame = instance.lastFrame();
        expect(frame.content).toContain(`Item ${index}`);
        instance.unmount();
      });
    });

    test('should handle rapid animation frames', () => {
      const animationController = environment.getAnimationController();
      const callback = jest.fn();

      animationController.registerCallback('perf-test', callback);

      // Generate many frames quickly
      for (let i = 0; i < 1000; i++) {
        animationController.nextFrame();
      }

      expect(callback).toHaveBeenCalledTimes(1000);
    });
  });
});

describe('renderTUI convenience function', () => {
  test('should render component using default environment', () => {
    const TestComponent = () => <Text>Convenience Test</Text>;
    const instance = renderTUI(<TestComponent />);

    expect(instance.lastFrame().content).toContain('Convenience Test');
    instance.unmount();
  });

  test('should accept custom options', () => {
    const TestComponent = () => <Text>Custom Options</Text>;
    const instance = renderTUI(<TestComponent />, {
      mockTerminal: {
        dimensions: { columns: 100, rows: 30 }
      }
    });

    const frame = instance.lastFrame();
    expect(frame.content).toContain('Custom Options');
    expect(frame.dimensions.columns).toBe(100);
    expect(frame.dimensions.rows).toBe(30);

    instance.unmount();
  });
});