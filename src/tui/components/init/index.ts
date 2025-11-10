/**
 * ♫ Init Components Index
 *
 * Exports all init flow components and types for easy importing
 * following the modular architecture established in PRP-003
 */

// Main init flow component
export { default as InitFlow } from './InitFlow.js';

// Core init shell and layout
export { default as InitShell } from './InitShell.js';

// Form field components
export { default as FieldText } from './FieldText.js';
export { default as FieldTextBlock } from './FieldTextBlock.js';
export { default as FieldSelectCarousel } from './FieldSelectCarousel.js';
export { default as FieldSecret } from './FieldSecret.js';
export { default as FieldJSON } from './FieldJSON.js';
export { default as FieldToggle } from './FieldToggle.js';
export { default as FileTreeChecks, type TreeNode } from './FileTreeChecks.js';

// Specialized components
export { default as AgentEditor } from './AgentEditor.js';
export { default as GenerationProgress } from './GenerationProgress.js';

// Export all types from types.ts
export type {
  InitState,
  InitShellProps,
  FieldProps,
  FieldTextProps,
  FieldTextBlockProps,
  FieldSecretProps,
  FieldSelectCarouselProps,
  FieldToggleProps,
  FieldJSONProps,
  FileTreeChecksProps,
  TemplateFile,
  AgentConfig,
  AgentEditorProps,
  GenerationEvent,
  GenerationProgressProps,
  StepHeaderProps
} from './types.js';

// Animation and intro components
export { default as IntroSequence, MiniIntro } from './IntroSequence.js';
export type { IntroSequenceProps } from './IntroSequence.js';

// Configuration integration
export {
  generatePRPConfig,
  generateAgentsMD,
  generateInitialPRP,
  convertAgentConfig,
  TEMPLATE_CONFIGS,
  type PRPConfig,
  type PRPAgentConfig
} from './ConfigIntegration.js';

// Re-export for backward compatibility
