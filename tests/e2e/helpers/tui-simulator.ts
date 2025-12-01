/**
 * TUI Simulator - Advanced simulation framework for Ink-based React TUI interactions
 * Provides realistic user interaction simulation with screen capture and state inspection
 */

import { EventEmitter } from 'events';
import { PRPTerminalRunner } from './terminal-runner';

export interface ScreenElement {
  text: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  type?: 'text' | 'button' | 'input' | 'select' | 'checkbox';
  focused?: boolean;
  visible?: boolean;
}

export interface TUIState {
  screen: string[][];
  cursor: { x: number; y: number };
  elements: ScreenElement[];
  currentScreen?: string;
  prompt?: string;
  choices?: string[];
  selectedChoice?: number;
}

export class TUISimulator extends EventEmitter {
  private terminal: PRPTerminalRunner;
  private screenBuffer: string[][] = [];
  private cursor = { x: 0, y: 0 };
  private currentScreen = '';
  private lastOutput = '';

  constructor(terminal: PRPTerminalRunner) {
    super();
    this.terminal = terminal;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.terminal.on('output', (data: string) => {
      this.lastOutput += data;
      this.parseScreen(data);
      this.emit('screenUpdate', this.getState());
    });
  }

  private parseScreen(data: string): void {
    // Parse ANSI escape sequences to build screen representation
    const lines = data.split('\n');

    // Update cursor position from ANSI codes
    const cursorMatch = data.match(/\x1b\[(\d+);(\d+)H/);
    if (cursorMatch) {
      this.cursor.y = parseInt(cursorMatch[1]) - 1;
      this.cursor.x = parseInt(cursorMatch[2]) - 1;
    }

    // Build screen buffer
    lines.forEach((line, index) => {
      // Strip ANSI codes for clean text
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      if (!this.screenBuffer[index]) {
        this.screenBuffer[index] = [];
      }
      this.screenBuffer[index] = cleanLine.split('');
    });

    // Detect current screen type
    this.detectScreenType();
  }

  private detectScreenType(): void {
    const output = this.lastOutput.toLowerCase();

    if (output.includes('welcome') || output.includes('getting started')) {
      this.currentScreen = 'welcome';
    } else if (output.includes('project name')) {
      this.currentScreen = 'project-name';
    } else if (output.includes('template') || output.includes('choose template')) {
      this.currentScreen = 'template-selection';
    } else if (output.includes('agents') || output.includes('configure agents')) {
      this.currentScreen = 'agent-configuration';
    } else if (output.includes('integrations') || output.includes('connect')) {
      this.currentScreen = 'integrations';
    } else if (output.includes('confirm') || output.includes('ready to create')) {
      this.currentScreen = 'confirmation';
    } else if (output.includes('success') || output.includes('created')) {
      this.currentScreen = 'success';
    }
  }

  getState(): TUIState {
    return {
      screen: this.screenBuffer,
      cursor: { ...this.cursor },
      elements: this.getElements(),
      currentScreen: this.currentScreen,
      prompt: this.extractPrompt(),
      choices: this.extractChoices(),
      selectedChoice: this.getSelectedChoice()
    };
  }

  private getElements(): ScreenElement[] {
    const elements: ScreenElement[] = [];
    const output = this.lastOutput;

    // Detect buttons
    const buttonMatches = output.matchAll(/\[([^\]]+)\]/g);
    for (const match of buttonMatches) {
      elements.push({
        text: match[1],
        position: { x: 0, y: 0 }, // Would need more sophisticated parsing
        type: 'button'
      });
    }

    // Detect input fields
    if (output.includes('›') || output.includes('>')) {
      elements.push({
        text: 'input',
        position: { x: 0, y: 0 },
        type: 'input',
        focused: true
      });
    }

    // Detect select/options
    const choiceMatches = output.matchAll(/^[·◉○]\s+(.+)$/gm);
    const choices: string[] = [];
    let selectedIndex = -1;
    let index = 0;

    for (const match of choiceMatches) {
      const isSelected = match[0].includes('◉');
      choices.push(match[1]);
      if (isSelected) selectedIndex = index;
      index++;
    }

    if (choices.length > 0) {
      elements.push({
        text: 'choices',
        position: { x: 0, y: 0 },
        type: 'select',
        visible: true
      });
    }

    return elements;
  }

  private extractPrompt(): string | undefined {
    const promptMatch = this.lastOutput.match(/\?(.*?)(?:\n|$)/);
    return promptMatch ? promptMatch[1].trim() : undefined;
  }

  private extractChoices(): string[] | undefined {
    const choices: string[] = [];
    const choiceMatches = this.lastOutput.matchAll(/^[·◉○]\s+(.+)$/gm);

    for (const match of choiceMatches) {
      choices.push(match[1]);
    }

    return choices.length > 0 ? choices : undefined;
  }

  private getSelectedChoice(): number | undefined {
    const choiceMatches = this.lastOutput.matchAll(/^[·◉○]\s+(.+)$/gm);
    let index = 0;

    for (const match of choiceMatches) {
      if (match[0].includes('◉')) {
        return index;
      }
      index++;
    }

    return undefined;
  }

  // Navigation methods
  async waitForScreen(screenName: string, timeout = 10000): Promise<TUIState> {
    return new Promise((resolve, reject) => {
      const checkScreen = (state: TUIState) => {
        if (state.currentScreen === screenName) {
          this.off('screenUpdate', checkScreen);
          resolve(state);
        }
      };

      this.on('screenUpdate', checkScreen);

      setTimeout(() => {
        this.off('screenUpdate', checkScreen);
        reject(new Error(`Screen "${screenName}" not detected within timeout`));
      }, timeout);
    });
  }

  async navigateToNextScreen(): Promise<TUIState> {
    this.terminal.sendKey('enter');
    await this.delay(200);
    return this.getState();
  }

  async selectChoice(choiceText: string | number): Promise<void> {
    const state = this.getState();

    if (!state.choices) {
      throw new Error('No choices available on current screen');
    }

    let targetIndex: number;
    if (typeof choiceText === 'number') {
      targetIndex = choiceText;
    } else {
      targetIndex = state.choices.findIndex(c => c.toLowerCase().includes(choiceText.toLowerCase()));
      if (targetIndex === -1) {
        throw new Error(`Choice "${choiceText}" not found`);
      }
    }

    // Navigate to the choice
    const currentIndex = state.selectedChoice || 0;
    const steps = targetIndex - currentIndex;

    if (steps > 0) {
      for (let i = 0; i < steps; i++) {
        this.terminal.sendKey('down');
        await this.delay(100);
      }
    } else if (steps < 0) {
      for (let i = 0; i < Math.abs(steps); i++) {
        this.terminal.sendKey('up');
        await this.delay(100);
      }
    }

    // Confirm selection
    this.terminal.sendKey('enter');
    await this.delay(200);
  }

  async fillInput(text: string): Promise<void> {
    // Clear existing input first
    this.terminal.sendKey('home');
    await this.delay(50);

    // Select all and delete
    this.terminal.sendKey('end', true); // Ctrl+End to select to end
    this.terminal.sendKey('backspace');
    await this.delay(50);

    // Type new text
    this.terminal.writeInput(text);
    await this.delay(100);
  }

  async confirm(): Promise<void> {
    this.terminal.sendKey('enter');
    await this.delay(200);
  }

  async cancel(): Promise<void> {
    this.terminal.sendKey('escape');
    await this.delay(200);
  }

  async goBack(): Promise<void> {
    this.terminal.sendKey('left');
    await this.delay(100);
    this.terminal.sendKey('enter');
    await this.delay(200);
  }

  // Preset navigation flows
  async runWelcomeFlow(): Promise<void> {
    await this.waitForScreen('welcome');
    await this.confirm();
  }

  async runProjectSetupFlow(projectName: string): Promise<void> {
    await this.waitForScreen('project-name');
    await this.fillInput(projectName);
    await this.confirm();
  }

  async runTemplateSelectionFlow(templateName: string): Promise<void> {
    await this.waitForScreen('template-selection');
    await this.selectChoice(templateName);
  }

  async runAgentConfigurationFlow(): Promise<void> {
    await this.waitForScreen('agent-configuration');

    // Configure agents with default settings
    const agents = ['robo-developer', 'robo-quality-control', 'robo-ux-ui-designer', 'robo-devops-sre'];

    for (const agent of agents) {
      // Select agent
      await this.selectChoice(agent);
      await this.delay(200);

      // Enable with default settings
      await this.confirm();
      await this.delay(200);

      // Go back to agent list
      await this.goBack();
      await this.delay(200);
    }

    // Continue to next step
    await this.confirm();
  }

  async runIntegrationsFlow(): Promise<void> {
    await this.waitForScreen('integrations');

    // Skip integrations for now
    await this.selectChoice('skip');
  }

  async runConfirmationFlow(): Promise<void> {
    await this.waitForScreen('confirmation');

    // Confirm project creation
    await this.selectChoice('create project');
  }

  async runCompleteInitFlow(projectName: string, templateName: string = 'typescript'): Promise<void> {
    try {
      // Welcome screen
      await this.runWelcomeFlow();

      // Project setup
      await this.runProjectSetupFlow(projectName);

      // Template selection
      await this.runTemplateSelectionFlow(templateName);

      // Agent configuration
      await this.runAgentConfigurationFlow();

      // Integrations
      await this.runIntegrationsFlow();

      // Confirmation
      await this.runConfirmationFlow();

      // Wait for success
      await this.waitForScreen('success');

    } catch (error) {
      console.error('TUI Flow Error:', error);
      console.log('Last Output:', this.lastOutput);
      throw error;
    }
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  takeScreenSnapshot(): TUIState {
    return this.getState();
  }

  saveScreenSnapshot(filepath?: string): string {
    const state = this.takeScreenSnapshot();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = filepath || `/tmp/tui-snapshot-${timestamp}.json`;

    require('fs').writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      screen: state.screen.map(row => row.join('')),
      cursor: state.cursor,
      elements: state.elements,
      currentScreen: state.currentScreen,
      rawOutput: this.lastOutput
    }, null, 2));

    return filename;
  }

  getCurrentOutput(): string {
    return this.lastOutput;
  }

  reset(): void {
    this.screenBuffer = [];
    this.cursor = { x: 0, y: 0 };
    this.currentScreen = '';
    this.lastOutput = '';
  }
}

/**
 * Utility to create TUI simulator with terminal runner
 */
export function createTUISimulator(cwd: string, mode: 'tui' | 'ci' = 'tui'): {
  terminal: PRPTerminalRunner;
  simulator: TUISimulator;
} {
  const terminal = new PRPTerminalRunner(cwd, mode);
  const simulator = new TUISimulator(terminal);

  return { terminal, simulator };
}