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
  VisualRegression,
} from './TUITestEnvironment';
export type {
  MockTerminalConfig,
  MockTerminalDimensions,
  TUITestRenderOptions,
  TUITestInstance,
  TUITestFrame,
} from './TUITestEnvironment';
// Component testing helpers
export {
  ComponentAssertions,
  MockComponents,
  TestDataGenerators,
  PerformanceTester,
  IntegrationTester,
  renderComponentForTesting,
  expectComponent,
} from './ComponentTestHelpers';
export type { ComponentTestResult } from './ComponentTestHelpers';
// Re-export commonly used types - TUIConfig types may not exist yet, commenting out
// export type {
//   TUIConfig,
//   SignalTag,
//   AgentCard,
//   AgentStatus,
//   Theme,
//   LayoutMode
// } from ../../shared/types/TUIConfig.js';
/**
 * Default export with all utilities
 */
import {
  TUITestEnvironment,
  MockTerminal,
  AnimationController,
  defaultTestEnvironment,
  renderTUI,
  VisualRegression,
} from './TUITestEnvironment';
import {
  ComponentAssertions,
  MockComponents,
  TestDataGenerators,
  PerformanceTester,
  IntegrationTester,
  renderComponentForTesting,
  expectComponent,
} from './ComponentTestHelpers';

export default {
  // Environment
  TUITestEnvironment,
  MockTerminal,
  AnimationController,
  defaultTestEnvironment,
  renderTUI,
  VisualRegression,
  // Helpers
  ComponentAssertions,
  MockComponents,
  TestDataGenerators,
  PerformanceTester,
  IntegrationTester,
  renderComponentForTesting,
  expectComponent,
};
