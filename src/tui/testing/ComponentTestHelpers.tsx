/**
 * ♫ TUI Component Test Helpers
 *
 * Utility functions and helpers for testing TUI components
 * with common patterns and assertions
 */

import React from 'react';
import { Text, Box } from 'ink';
import { renderTUI, TUITestInstance, TUITestRenderOptions } from './TUITestEnvironment.js';

/**
 * Test result interface
 */
export interface ComponentTestResult {
  instance: TUITestInstance;
  content: string;
  cleanContent: string;
  colorCodes: string[];
  dimensions: { columns: number; rows: number };
}

/**
 * Helper function to render and test components
 */
export function renderComponentForTesting(
  component: React.ReactElement,
  options?: TUITestRenderOptions
): ComponentTestResult {
  const instance = renderTUI(component, options);
  const lastFrame = instance.lastFrame();

  return {
    instance,
    content: lastFrame.content,
    // eslint-disable-next-line no-control-regex
    cleanContent: lastFrame.content.replace(/\x1b\[[0-9;]*m/g, ''),
    // eslint-disable-next-line no-control-regex
    colorCodes: (lastFrame.content.match(/\x1b\[[0-9;]*m/g) ?? []),
    dimensions: lastFrame.dimensions
  };
}

/**
 * Assertion helpers for component testing
 */
export class ComponentAssertions {
  private result: ComponentTestResult;

  constructor(result: ComponentTestResult) {
    this.result = result;
  }

  /**
   * Assert that content contains specific text
   */
  containsText(text: string): this {
    expect(this.result.cleanContent).toContain(text);
    return this;
  }

  /**
   * Assert that content does not contain specific text
   */
  doesNotContainText(text: string): this {
    expect(this.result.cleanContent).not.toContain(text);
    return this;
  }

  /**
   * Assert that content matches regex pattern
   */
  matchesPattern(pattern: RegExp): this {
    expect(this.result.cleanContent).toMatch(pattern);
    return this;
  }

  /**
   * Assert that component contains specific color code
   */
  hasColorCode(colorCode: string): this {
    expect(this.result.colorCodes).toContain(colorCode);
    return this;
  }

  /**
   * Assert that component does not contain specific color code
   */
  doesNotHaveColorCode(colorCode: string): this {
    expect(this.result.colorCodes).not.toContain(colorCode);
    return this;
  }

  /**
   * Assert component dimensions
   */
  hasDimensions(columns: number, rows: number): this {
    expect(this.result.dimensions.columns).toBe(columns);
    expect(this.result.dimensions.rows).toBe(rows);
    return this;
  }

  /**
   * Assert that content contains exact text count
   */
  containsTextCount(text: string, count: number): this {
    const matches = this.result.cleanContent.match(new RegExp(text, 'g'));
    const actualCount = matches ? matches.length : 0;
    expect(actualCount).toBe(count);
    return this;
  }

  /**
   * Assert that component renders multiline content
   */
  hasLineCount(expectedCount: number): this {
    const lines = this.result.cleanContent.split('\n').filter(line => line.trim() !== '');
    expect(lines.length).toBe(expectedCount);
    return this;
  }

  /**
   * Assert that component has specific text structure
   */
  hasStructure(expectedStructure: string[]): this {
    const lines = this.result.cleanContent.split('\n').filter(line => line.trim() !== '');

    expectedStructure.forEach((expectedLine, index) => {
      if (index < lines.length) {
        expect(lines[index]).toContain(expectedLine);
      }
    });

    return this;
  }

  /**
   * Get assertion result summary
   */
  getSummary(): {
    content: string;
    cleanContent: string;
    colorCodes: string[];
    dimensions: { columns: number; rows: number };
    lineCount: number;
    } {
    return {
      content: this.result.content,
      cleanContent: this.result.cleanContent,
      colorCodes: this.result.colorCodes,
      dimensions: this.result.dimensions,
      lineCount: this.result.cleanContent.split('\n').filter(line => line.trim() !== '').length
    };
  }
}
 

/**
 * Helper function to create assertions
 */
export function expectComponent(
  component: React.ReactElement,
  options?: TUITestRenderOptions
): ComponentAssertions {
  const result = renderComponentForTesting(component, options);
  return new ComponentAssertions(result);
}

/**
 * Mock component generators for testing
 */
export class MockComponents {
  /**
   * Create a mock Text component
   */
  static Text({ children, color, bold = false }: {
    children: React.ReactNode;
    color?: string;
    bold?: boolean;
  }) {
    return <Text color={color} bold={bold}>{children}</Text>;
  }

  /**
   * Create a mock Box component
   */
  static Box({ children, flexDirection = 'column', padding = 0 }: {
    children: React.ReactNode;
    flexDirection?: 'row' | 'column';
    padding?: number;
  }) {
    return (
      <Box flexDirection={flexDirection} paddingX={padding}>
        {children}
      </Box>
    );
  }

  /**
   * Create a mock layout component
   */
  static Layout({ children, showHeader = true, showFooter = true }: {
    children: React.ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
  }) {
    return (
      <Box flexDirection="column" height="100%">
        {showHeader && <Text>Header</Text>}
        <Box flexGrow={1}>{children}</Box>
        {showFooter && <Text>Footer</Text>}
      </Box>
    );
  }

  /**
   * Create a mock agent card component
   */
  static AgentCard({
    status = 'IDLE',
    role = 'robo-developer',
    task = 'Test task',
    progress = 50
  }: {
    status?: string;
    role?: string;
    task?: string;
    progress?: number;
  }) {
    return (
      <Box flexDirection="column">
        <Text>Status: {status}</Text>
        <Text>Role: {role}</Text>
        <Text>Task: {task}</Text>
        <Text>Progress: {progress}%</Text>
      </Box>
    );
  }

  /**
   * Create a mock signal bar component
   */
  static SignalBar({ signals = ['[aa]', '[bb]', '[cc]'] }: {
    signals?: string[];
  }) {
    return (
      <Text>
        {' '}
        {signals.map((signal, index) => (
          <Text key={index}>{signal} </Text>
        ))}
        {' '}
      </Text>
    );
  }

  /**
   * Create a mock music icon component
   */
  static MusicIcon({ status = 'IDLE' }: {
    status?: string;
  }) {
    const icons = {
      SPAWNING: '♪',
      RUNNING: '♬',
      IDLE: '♫',
      ERROR: '⚠'
    };

    return <Text>{icons[status as keyof typeof icons] || '♫'}</Text>;
  }
}

/**
 * Test data generators
 */
export class TestDataGenerators {
  /**
   * Generate mock signal data
   */
  static generateSignals(count: number = 5): Array<{
    code: string;
    state: string;
    latest: boolean;
  }> {
    const signalCodes = ['[aa]', '[bb]', '[cc]', '[dd]', '[ee]', '[ff]', '[gg]'];
    const states = ['placeholder', 'active', 'progress', 'resolved'];

    return Array.from({ length: count }, (_, index) => ({
      code: signalCodes[index % signalCodes.length],
      state: states[Math.floor(Math.random() * states.length)] as string,
      latest: index === count - 1
    }));
  }

  /**
   * Generate mock agent data
   */
  static generateAgents(count: number = 3): Array<{
    id: string;
    status: string;
    role: string;
    task: string;
    progress: number;
  }> {
    const statuses = ['SPAWNING', 'RUNNING', 'IDLE', 'ERROR'];
    const roles = ['robo-developer', 'robo-aqa', 'robo-system-analyst', 'robo-ux-ui'];
    const tasks = ['Test task 1', 'Test task 2', 'Test task 3', 'Test task 4'];

    return Array.from({ length: count }, (_, index) => ({
      id: `agent-${index + 1}`,
      status: statuses[Math.floor(Math.random() * statuses.length)] as string,
      role: roles[Math.floor(Math.random() * roles.length)] as string,
      task: tasks[Math.floor(Math.random() * tasks.length)] as string,
      progress: Math.floor(Math.random() * 100)
    }));
  }

  /**
   * Generate mock PRP data
   */
  static generatePRPs(count: number = 5): Array<{
    name: string;
    status: string;
    role?: string;
    signals: Array<{ code: string; state: string; latest: boolean }>;
  }> {
    return Array.from({ length: count }, (_, index) => ({
      name: `PRP-${String(index + 1).padStart(3, '0')}: Test PRP ${index + 1}`,
      status: 'active',
      role: 'robo-system-analyst',
      signals: this.generateSignals(Math.floor(Math.random() * 3) + 1)
    }));
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  /**
   * Measure component render time
   */
  static async measureRenderTime(
    component: React.ReactElement,
    iterations: number = 10
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const instance = renderTUI(component);
      const endTime = performance.now();

      times.push(endTime - startTime);
      instance.unmount();
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime
    };
  }

  /**
   * Measure memory usage
   */
  static measureMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
    } {
    if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
      const usage = process.memoryUsage();
      const used = usage.heapUsed;
      const total = usage.heapTotal;
      const percentage = total > 0 ? (used / total) * 100 : 0;

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * Measure component update performance
   */
  static async measureUpdatePerformance(
    initialComponent: React.ReactElement,
    updatedComponent: React.ReactElement,
    updates: number = 5
  ): Promise<{
    averageUpdateTime: number;
    minUpdateTime: number;
    maxUpdateTime: number;
  }> {
    const times: number[] = [];

    const instance = renderTUI(initialComponent);

    for (let i = 0; i < updates; i++) {
      const startTime = performance.now();
      instance.rerender(updatedComponent);
      const endTime = performance.now();

      times.push(endTime - startTime);
    }

    instance.unmount();

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageUpdateTime = totalTime / updates;
    const minUpdateTime = Math.min(...times);
    const maxUpdateTime = Math.max(...times);

    return {
      averageUpdateTime,
      minUpdateTime,
      maxUpdateTime
    };
  }
}

/**
 * Integration testing utilities
 */
export class IntegrationTester {
  /**
   * Test component with different terminal sizes
   */
  static testResponsiveBehavior(
    component: React.ReactElement,
    sizes: Array<{ columns: number; rows: number }> = [
      { columns: 80, rows: 24 },
      { columns: 100, rows: 30 },
      { columns: 120, rows: 40 }
    ]
  ): Array<{ size: { columns: number; rows: number }; result: ComponentTestResult }> {
    return sizes.map(size => {
      const result = renderComponentForTesting(component, {
        mockTerminal: { dimensions: size }
      });

      return {
        size,
        result
      };
    });
  }

  /**
   * Test component animations
   */
  static async testAnimations(
    component: React.ReactElement,
    duration: number = 2000
  ): Promise<{
    frames: Array<{ timestamp: number; content: string }>;
    frameCount: number;
    duration: number;
  }> {
    const instance = renderTUI(component, {
      captureFrames: true,
      mockAnimations: false
    });

    const startTime = Date.now();
    const frames: Array<{ timestamp: number; content: string }> = [];

    const captureFrame = () => {
      const frame = instance.lastFrame();
      frames.push({
        timestamp: Date.now() - startTime,
        content: frame.content
      });
    };

    // Capture initial frame
    captureFrame();

    // Capture frames during animation
    const interval = setInterval(captureFrame, 50);

    // Wait for animation duration
    await new Promise(resolve => setTimeout(resolve, duration));

    clearInterval(interval);
    captureFrame(); // Final frame
    instance.unmount();

    return {
      frames,
      frameCount: frames.length,
      duration
    };
  }

  /**
   * Test component with real-time data updates
   */
  static async testRealtimeUpdates(
    createComponent: (data: unknown) => React.ReactElement,
    updates: Array<{ delay: number; data: unknown }> = []
  ): Promise<{
    frames: Array<{ timestamp: number; data: unknown; content: string }>;
    updateCount: number;
  }> {
    const initialComponent = createComponent(updates[0]?.data ?? {});
    const instance = renderTUI(initialComponent, { captureFrames: true });

    const frames: Array<{ timestamp: number; data: unknown; content: string }> = [];
    let updateCount = 0;

    // Capture initial frame
    frames.push({
      timestamp: 0,
      data: updates[0]?.data ?? {},
      content: instance.lastFrame().content
    });

    // Apply updates
    for (const update of updates) {
      await new Promise(resolve => setTimeout(resolve, update.delay));

      instance.rerender(createComponent(update.data));
      updateCount++;

      frames.push({
        timestamp: Date.now(),
        data: update.data,
        content: instance.lastFrame().content
      });
    }

    instance.unmount();

    return {
      frames,
      updateCount
    };
  }
}

export default {
  renderComponentForTesting,
  ComponentAssertions,
  expectComponent,
  MockComponents,
  TestDataGenerators,
  PerformanceTester,
  IntegrationTester
};