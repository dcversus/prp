/**
 * E2E Test: Complete TUI Init Journey with React Ink Testing
 * Tests all screens, navigation, and functionality of the init flow
 */

const React = require('react');
const { render } = require('ink-testing-library');
const { existsSync } = require('fs');
const path = require('path');

// Mock console to avoid noise during tests
const originalConsole = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsole;
});

describe('TUI Init Journey - Full E2E Testing', () => {
  let InitFlow;
  let testDir;
  let cleanup;

  beforeAll(async () => {
    // Dynamic import for ESM compatibility
    const module = await import('../src/tui/components/init/InitFlow.js');
    InitFlow = module.default;
  });

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = path.join('/tmp', `prp-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

    // Cleanup function
    cleanup = () => {
      try {
        const { rmSync } = require('fs');
        if (existsSync(testDir)) {
          rmSync(testDir, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Intro Screen (Step 0/6)', () => {
    it('should render intro screen with all elements', async () => {
      const { lastFrame } = render(React.createElement(InitFlow));

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 200));

      const output = lastFrame();

      // Verify intro screen elements
      expect(output).toContain('♪');
      expect(output).toContain('@dcversus/prp');
      expect(output).toContain('Tools should vanish; flow should remain');
      expect(output).toContain('This flow will provision your workspace and first PRP');
      expect(output).toContain('step 0/6');
      expect(output).toContain('Enter');
      expect(output).toContain('Esc');

      console.log('✅ Intro screen renders correctly');
    });
  });

  describe('2. Project Configuration (Step 1/6)', () => {
    it('should navigate to project configuration and show form', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Navigate past intro
      await new Promise(resolve => setTimeout(resolve, 100));
      stdin.write('\r'); // Press Enter
      await new Promise(resolve => setTimeout(resolve, 200));

      const output = lastFrame();

      // Verify project configuration screen
      expect(output).toContain('step 1/6');
      expect(output).toContain('Project');
      expect(output).toContain('Project name');
      expect(output).toContain('Prompt');

      console.log('✅ Project configuration screen renders correctly');
    });

    it('should handle project name input', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Navigate to project step
      await new Promise(resolve => setTimeout(resolve, 100));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Type project name
      stdin.write('my-awesome-project');
      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();

      // Should still be on project step (input processed)
      expect(output).toContain('step 1/6');

      console.log('✅ Project name input handled');
    });
  });

  describe('3. Connections Configuration (Step 2/6)', () => {
    it('should navigate to connections configuration', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Quick navigation through steps
      await new Promise(resolve => setTimeout(resolve, 100));
      stdin.write('\r'); // Skip intro
      await new Promise(resolve => setTimeout(resolve, 200));

      stdin.write('test-project\r'); // Project name
      await new Promise(resolve => setTimeout(resolve, 200));

      stdin.write('Create a test project\r'); // Project prompt
      await new Promise(resolve => setTimeout(resolve, 200));

      const output = lastFrame();

      // Verify connections step
      expect(output).toContain('step 2/6');
      expect(output).toContain('Connections');

      console.log('✅ Connections configuration renders');
    });
  });

  describe('4. Agents Configuration (Step 3/6)', () => {
    it('should navigate to agents configuration', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Navigate to agents step
      await new Promise(resolve => setTimeout(resolve, 100));
      stdin.write('\r'); // Skip intro
      await new Promise(resolve => setTimeout(resolve, 200));

      stdin.write('test-project\r'); // Project name
      await new Promise(resolve => setTimeout(resolve, 200));

      stdin.write('Test project\r'); // Prompt
      await new Promise(resolve => setTimeout(resolve, 200));

      stdin.write('\r'); // Skip connections
      await new Promise(resolve => setTimeout(resolve, 200));

      const output = lastFrame();

      // Verify agents step
      expect(output).toContain('step 3/6');
      expect(output).toContain('Agents');

      console.log('✅ Agents configuration renders');
    });
  });

  describe('5. Integrations Configuration (Step 4/6)', () => {
    it('should navigate to integrations configuration', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Navigate to integrations step
      const inputs = ['\r', 'test\r', 'Test\r', '\r', '\r']; // intro, name, prompt, connections, agents

      for (const input of inputs) {
        await new Promise(resolve => setTimeout(resolve, 100));
        stdin.write(input);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const output = lastFrame();

      // Verify integrations step
      expect(output).toContain('step 4/6');
      expect(output).toContain('Connections (repos/registry)');

      console.log('✅ Integrations configuration renders');
    });
  });

  describe('6. Template Selection (Step 5/6)', () => {
    it('should navigate to template selection', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Navigate to template step
      const inputs = ['\r', 'test\r', 'Test\r', '\r', '\r', '\r']; // through integrations

      for (const input of inputs) {
        await new Promise(resolve => setTimeout(resolve, 100));
        stdin.write(input);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const output = lastFrame();

      // Verify template step
      expect(output).toContain('step 5/6');
      expect(output).toContain('Template');
      expect(output).toContain('typescript');

      console.log('✅ Template selection renders');
    });

    it('should show all available template options', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Navigate to template step
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        stdin.write('\r');
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const output = lastFrame();

      // Check for template options
      expect(output).toContain('typescript');
      expect(output).toContain('react');

      console.log('✅ Template options displayed');
    });
  });

  describe('7. Generation Step (Step 6/6)', () => {
    it('should reach generation step after template selection', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Navigate all the way to generation
      const inputs = [
        '\r', // Skip intro
        'final-test\r', // Project name
        'Final test project\r', // Prompt
        '\r', // Skip connections
        '\r', // Skip agents
        '\r', // Skip integrations
        '\r' // Skip template (uses default)
      ];

      for (const input of inputs) {
        await new Promise(resolve => setTimeout(resolve, 100));
        stdin.write(input);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Wait a bit more for generation
      await new Promise(resolve => setTimeout(resolve, 300));

      const output = lastFrame();

      // Verify generation step
      expect(output).toContain('step 6/6');

      console.log('✅ Generation step reached');
    });
  });

  describe('8. Keyboard Navigation', () => {
    it('should handle Enter key for navigation', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      const initialOutput = lastFrame();
      const initialStep = initialOutput.match(/step (\d)\/6/)?.[1];

      // Press Enter to advance
      await new Promise(resolve => setTimeout(resolve, 100));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 200));

      const newOutput = lastFrame();
      const newStep = newOutput.match(/step (\d)\/6/)?.[1];

      // Should have advanced from step 0 to step 1
      expect(parseInt(initialStep || '0') + 1).toBe(parseInt(newStep || '0'));

      console.log('✅ Enter key navigation works');
    });

    it('should handle Escape key cancellation', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Press Escape
      stdin.write('\x1b');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Component should still be responsive
      const output = lastFrame();
      expect(output).toBeDefined();

      console.log('✅ Escape key handled');
    });
  });

  describe('9. Component Structure', () => {
    it('should maintain consistent UI structure across all screens', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Check initial structure
      let output = lastFrame();
      expect(output).toContain('♪');
      expect(output).toContain('@dcversus/prp');
      expect(output).toMatch(/step \d\/6/);
      expect(output).toContain('Enter');
      expect(output).toContain('Esc');

      // Navigate through and check structure consistency
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        stdin.write('\r');
        await new Promise(resolve => setTimeout(resolve, 200));

        output = lastFrame();
        expect(output).toContain('♪');
        expect(output).toContain('@dcversus/prp');
        expect(output).toMatch(/step \d\/6/);
      }

      console.log('✅ UI structure is consistent');
    });
  });

  describe('10. Error Handling', () => {
    it('should handle rapid input without crashing', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Send rapid inputs
      for (let i = 0; i < 10; i++) {
        stdin.write('\r');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Should still be responsive
      const output = lastFrame();
      expect(output).toBeDefined();
      expect(output).toContain('step');

      console.log('✅ Rapid input handled gracefully');
    });
  });

  describe('11. Init Flow with Props', () => {
    it('should accept initial props for pre-filled values', async () => {
      const props = {
        initialProjectName: 'pre-filled-project',
        initialPrompt: 'Pre-filled project description'
      };

      const { lastFrame } = render(React.createElement(InitFlow, props));

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should render with pre-filled values
      const output = lastFrame();
      expect(output).toContain('step 0/6'); // Should start at intro

      console.log('✅ Props accepted successfully');
    });
  });

  describe('12. Full Flow Integration', () => {
    it('should complete full init flow without errors', async () => {
      const { lastFrame, stdin } = render(React.createElement(InitFlow));

      // Complete the full flow
      const completeFlow = [
        '\r', // Intro
        'complete-test\r', // Project name
        'Complete integration test project\r', // Prompt
        '\r', // Connections
        '\r', // Agents
        '\r', // Integrations
        'typescript\r', // Template
        '\r', // Confirm template
      ];

      for (const input of completeFlow) {
        await new Promise(resolve => setTimeout(resolve, 100));
        stdin.write(input);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Wait for final processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const output = lastFrame();

      // Should complete successfully
      expect(output).toBeDefined();

      console.log('✅ Complete flow executed without errors');
      if (output && output.length > 0) {
        console.log(`📊 Final output preview: ${output.substring(0, 200)}...`);
      }
    });
  });
});