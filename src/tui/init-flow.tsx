/**
 * PRP Init Wizard - React Ink Implementation
 *
 * Updated to use modular wizard components system
 * with comprehensive form components, validation, and animations
 * following PRP-003 specifications
 */

// [da] Init wizard TUI flow implemented - 6-step wizard with animations and validation - robo-ux-ui-designer

import React from 'react';
import { render } from 'ink';

// Import init components
import { InitFlow } from './components/init/InitFlow';

import type { WizardState } from './components/init/types';

// Export the wizard for external use
export const runInitWizard = async (): Promise<{ success: boolean; state?: WizardState }> => {
  return new Promise((resolve) => {
    const { waitUntilExit } = render(
      <InitFlow
        onComplete={(state) => {
          resolve({ success: true, state });
        }}
        onCancel={() => {
          resolve({ success: false });
        }}
      />,
    );

    waitUntilExit().catch(() => {
      resolve({ success: false });
    });
  });
};

// Export the wizard component directly
export { InitFlow };
export type { WizardState } from './components/init/types';

export default InitFlow;
