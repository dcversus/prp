/**
 * ♫ TUI Testing Framework
 *
 * Complete testing framework for TUI components with
 * mock environments, animation control, and utilities
 */

// Core testing environment
export {
  TUITestEnvironment,
  MockTerminal,
  AnimationController,
  defaultTestEnvironment,
  renderTUI,
  VisualRegression
} from './TUITestEnvironment.js';

export type {
  MockTerminalConfig,
  MockTerminalDimensions,
  TUITestRenderOptions,
  TUITestInstance,
  TUITestFrame
} from './TUITestEnvironment.js';

// Component testing helpers
export {
  ComponentAssertions,
  MockComponents,
  TestDataGenerators,
  PerformanceTester,
  IntegrationTester,
  renderComponentForTesting,
  expectComponent
} from './ComponentTestHelpers.js';

export type {
  ComponentTestResult
} from './ComponentTestHelpers.js';

// Re-export commonly used types
export type {
  TUIConfig,
  SignalTag,
  AgentCard,
  AgentStatus,
  Theme,
  LayoutMode
} from '../types/TUIConfig.js';

/**
 * Default export with all utilities
 */
export default {
  // Environment
  TUITestEnvironment,
  MockTerminal,
  AnimationController,
  renderTUI,
  VisualRegression,

  // Helpers
  ComponentAssertions,
  MockComponents,
  TestDataGenerators,
  PerformanceTester,
  IntegrationTester,
  renderComponentForTesting,
  expectComponent
};