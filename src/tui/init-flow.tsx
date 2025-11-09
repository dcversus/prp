/**
 * PRP Init Wizard - React Ink Implementation
 *
 * Updated to use modular wizard components system
 * with comprehensive form components, validation, and animations
 * following PRP-003 specifications
 */

import React from 'react';
import { render } from 'ink';

// Import new wizard system
import { InitWizard } from './components/wizard/index.js';
import type { WizardState } from './components/wizard/index.js';

// Import TUI config
import { createTUIConfig } from './config/TUIConfig.js';

// Export the wizard for external use
export const runInitWizard = async (): Promise<{ success: boolean; state?: WizardState }> => {
  const config = createTUIConfig();

  return new Promise((resolve) => {
    const { waitUntilExit } = render(
      <InitWizard
        config={config}
        onComplete={(state) => {
          resolve({ success: true, state });
        }}
        onCancel={() => {
          resolve({ success: false });
        }}
      />
    );

    waitUntilExit().catch(() => {
      resolve({ success: false });
    });
  });
};

// Export the wizard component directly
export { InitWizard };
export type { WizardState } from './components/wizard/index.js';

export default InitWizard;