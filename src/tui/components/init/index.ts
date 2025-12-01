/**
 * ♫ Init Components Index
 *
 * Exports all init flow components and types for easy importing
 * following the modular architecture established in PRP-003
 */
// Main init flow component
export { default as InitFlow } from './InitFlow';
// Core init shell and layout
export { default as InitShell } from './InitShell';
// Form field components
export { default as FieldText } from './FieldText';
export { default as FieldTextBlock } from './FieldTextBlock';
export { default as FieldSelectCarousel } from './FieldSelectCarousel';
export { default as FieldSecret } from './FieldSecret';
export { default as FieldJSON } from './FieldJSON';
export { default as FieldToggle } from './FieldToggle';
export { default as FileTreeChecks, type TreeNode } from './FileTreeChecks';
// Specialized components
export { default as AgentEditor } from './AgentEditor';
export { default as GenerationProgress } from './GenerationProgress';
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
  StepHeaderProps,
} from './types';
// Animation and intro components
export { default as IntroSequence, MiniIntro } from './IntroSequence';
export type { IntroSequenceProps } from './IntroSequence';
// Configuration integration
export {
  generatePRPConfig,
  generateAgentsMD,
  generateInitialPRP,
  convertAgentConfig,
  TEMPLATE_CONFIGS,
  type PRPConfig,
  type PRPAgentConfig,
} from './ConfigIntegration';
// Re-export for backward compatibility
