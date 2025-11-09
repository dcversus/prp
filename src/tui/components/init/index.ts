/**
 * ♫ Init Components Index
 *
 * Exports all init flow components and types for easy importing
 * following the modular architecture established in PRP-003
 */

// Main init flow component
export { default as InitFlow } from './InitFlow.js';
export type { InitFlowProps, InitState } from './InitFlow.js';

// Core init shell and layout
export { default as InitShell, type InitShellProps, type MusicNoteState } from './InitShell.js';

// Form field components
export { default as FieldText, type FieldTextProps } from './FieldText.js';
export { default as FieldTextBlock, type FieldTextBlockProps } from './FieldTextBlock.js';
export { default as FieldSelectCarousel, type FieldSelectCarouselProps } from './FieldSelectCarousel.js';
export { default as FieldSecret, type FieldSecretProps } from './FieldSecret.js';
export { default as FieldJSON, type FieldJSONProps } from './FieldJSON.js';
export { default as FieldToggle, type FieldToggleProps } from './FieldToggle.js';
export { default as FileTreeChecks, type FileTreeChecksProps, type TreeNode } from './FileTreeChecks.js';

// Specialized components
export { default as AgentEditor, type AgentEditorProps, type AgentConfig } from './AgentEditor.js';
export { default as GenerationProgress, type GenerationProgressProps } from './GenerationProgress.js';

// Animation and intro components
export { default as IntroSequence, MiniIntro, type IntroSequenceProps } from './IntroSequence.js';

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
export * from '../../types/TUIConfig.js';