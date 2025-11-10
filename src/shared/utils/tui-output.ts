/**
 * TUI Output Formatter
 *
 * Provides beautiful terminal UI for interactive initialization using React Ink
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { runInitWizard } from '../tui/init-wizard.js';

export interface TUIOptions {
  showProgress: boolean;
  showColors: boolean;
  showIcons: boolean;
}

export class TUIOutput {
  private options: TUIOptions;
  private steps: string[] = [];
  private isRunning = false;

  constructor(options: Partial<TUIOptions> = {}) {
    this.options = {
      showProgress: true,
      showColors: true,
      showIcons: true,
      ...options
    };
  }

  /**
   * Display welcome header
   */
  showHeader(): void {
    // Using console.log for TUI output is intentional - these are user-facing terminal displays
    process.stdout.write('\n');
    process.stdout.write('╭─────────────────────────────────────────────────────────────────────────────╮\n');
    process.stdout.write('│                             🚀 PRP INITIALIZER                              │\n');
    process.stdout.write('│                     Interactive Project Bootstrap                          │\n');
    process.stdout.write('╰─────────────────────────────────────────────────────────────────────────────╯\n');
    process.stdout.write('\n');
  }

  /**
   * Run the React Ink wizard from PRP-003
   */
  async runWizard(): Promise<any> {
    if (this.isRunning) {
      throw new Error('Wizard is already running');
    }

    this.isRunning = true;

    try {
      // Run the React Ink wizard
      const result = await runInitWizard();
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Display wizard intro screen from PRP-003 (legacy)
   * @deprecated Use runWizard() instead
   */
  showWizardIntro(): void {
    console.log('♫ @dcversus/prp                                                     ⧗ 2025-11-05 04:12:00');
    console.log();
    if (this.options.showColors) {
      console.log('\x1b[90m"Tools should vanish; flow should remain." — workshop note\x1b[0m');
    } else {
      console.log('"Tools should vanish; flow should remain." — workshop note');
    }
    console.log();
    console.log('     This wizard will provision your workspace and first PRP.');
    console.log('     One input at a time. Minimal. Reversible.');
    console.log();
    console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────');
    console.log('> press Enter');
    console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────');
    if (this.options.showColors) {
      console.log('Enter    Esc');
    } else {
      console.log('Enter    Esc');
    }
  }

  /**
   * Show wizard step header
   */
  showWizardStep(_step: number, icon: string, title: string): void {
    console.log();
    console.log(`${icon}  ${title}`);
    console.log();
  }

  /**
   * Add initialization step
   */
  addStep(description: string): void {
    this.steps.push(description);
  }

  /**
   * Mark current step as active
   */
  showStep(stepNumber: number, description: string): void {
    const icon = this.options.showIcons ? '⏳' : '→';
    const step = `${stepNumber.toString().padStart(2, ' ')}. ${icon} ${description}`;

    if (this.options.showColors) {
      console.log(`\x1b[36m${step}\x1b[0m`);
    } else {
      console.log(step);
    }
  }

  /**
   * Mark step as completed
   */
  completeStep(stepNumber: number, description: string): void {
    const icon = this.options.showIcons ? '✅' : '✓';
    const step = `${stepNumber.toString().padStart(2, ' ')}. ${icon} ${description}`;

    // Move cursor up and rewrite the line
    process.stdout.write('\x1b[1A\x1b[K');

    if (this.options.showColors) {
      console.log(`\x1b[32m${step}\x1b[0m`);
    } else {
      console.log(step);
    }
  }

  /**
   * Mark step as failed
   */
  failStep(stepNumber: number, description: string, error?: string): void {
    const icon = this.options.showIcons ? '❌' : '✗';
    const step = `${stepNumber.toString().padStart(2, ' ')}. ${icon} ${description}`;

    // Move cursor up and rewrite the line
    process.stdout.write('\x1b[1A\x1b[K');

    if (this.options.showColors) {
      console.log(`\x1b[31m${step}\x1b[0m`);
    } else {
      console.log(step);
    }

    if (error) {
      console.log(`   ${error}`);
    }
  }

  /**
   * Show progress spinner for long operations
   */
  showProgress(description: string): () => void {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    const interval = setInterval(() => {
      process.stdout.write(`\r\x1b[K${this.options.showColors ? '\x1b[36m' : ''}${spinner[i]} ${description}${this.options.showColors ? '\x1b[0m' : ''}`);
      i = (i + 1) % spinner.length;
    }, 100);

    return () => {
      clearInterval(interval);
      process.stdout.write(`\r\x1b[K${this.options.showColors ? '\x1b[32m' : ''}✅ ${description}${this.options.showColors ? '\x1b[0m' : ''}\n`);
    };
  }

  /**
   * Show file creation
   */
  showFileCreated(filePath: string): void {
    const icon = this.options.showIcons ? '📝' : '+';
    console.log(`   ${icon} Created: ${filePath}`);
  }

  /**
   * Show directory creation
   */
  showDirectoryCreated(dirPath: string): void {
    const icon = this.options.showIcons ? '📁' : '+';
    console.log(`   ${icon} Created directory: ${dirPath}`);
  }

  /**
   * Show LLM generation
   */
  showLLMGeneration(prompt: string): void {
    console.log();
    console.log('🤖 Generating project files with AI...');
    console.log(`   Prompt: "${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}"`);
    console.log();
  }

  /**
   * Show LLM generated files
   */
  showLLMGenerated(files: { readme?: string; firstPrp?: string; agentsUserSection?: string }): void {
    if (files.readme) {
      console.log('   📖 Generated: README.md');
    }
    if (files.firstPrp) {
      console.log('   📋 Generated: First PRP file');
    }
    if (files.agentsUserSection) {
      console.log('   🤝 Generated: Agents.md user section');
    }
    console.log();
  }

  /**
   * Show success message
   */
  showSuccess(projectName: string, projectPath: string): void {
    console.log();
    console.log('╭─────────────────────────────────────────────────────────────────────────────╮');
    console.log('│                          ✅ INITIALIZATION COMPLETE                        │');
    console.log('╰─────────────────────────────────────────────────────────────────────────────╯');
    console.log();
    console.log(`🎉 Project "${projectName}" initialized successfully!`);
    console.log();
    console.log('📂 Project location:');
    console.log(`   ${projectPath}`);
    console.log();
    console.log('🚀 Next steps:');
    console.log(`   cd ${projectPath}`);
    console.log('   npx prp                    # Start orchestrator');
    console.log('   npx prp orchestrator       # Direct orchestrator start');
    console.log();
  }

  /**
   * Show error message
   */
  showError(error: Error | string): void {
    console.log();
    console.log('╭─────────────────────────────────────────────────────────────────────────────╮');
    console.log('│                           ❌ INITIALIZATION FAILED                           │');
    console.log('╰─────────────────────────────────────────────────────────────────────────────╯');
    console.log();

    const errorMessage = error instanceof Error ? error.message : error;
    console.log('Error details:');
    console.log(`   ${errorMessage}`);
    console.log();

    if (error instanceof Error && error.stack) {
      console.log('Stack trace:');
      console.log(`   ${error.stack.split('\n').join('\n   ')}`);
      console.log();
    }
  }

  /**
   * Show warning
   */
  showWarning(message: string): void {
    const icon = this.options.showIcons ? '⚠️' : '!';
    console.log(`${icon} Warning: ${message}`);
  }

  /**
   * Show info
   */
  showInfo(message: string): void {
    const icon = this.options.showIcons ? 'ℹ️' : 'i';
    console.log(`${icon} ${message}`);
  }

  /**
   * Ask user a question
   */
  askQuestion(question: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
      const prompt = defaultValue
        ? `${question} (${defaultValue}): `
        : `${question}: `;

      process.stdout.write(prompt);

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      let input = '';

      const onData = (data: string) => {
        if (data === '\r' || data === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log();
          resolve(input || defaultValue || '');
        } else if (data === '\u0003') { // Ctrl+C
          process.exit(130);
        } else if (data === '\u007F') { // Backspace
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        } else if (data >= ' ' && data <= '~') {
          input += data;
          process.stdout.write(data);
        }
      };

      process.stdin.on('data', onData);
    });
  }

  /**
   * Ask yes/no question
   */
  askYesNo(question: string, defaultValue: boolean = true): Promise<boolean> {
    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    return new Promise((resolve) => {
      const prompt = `${question} (${defaultText}): `;

      process.stdout.write(prompt);

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (data: string) => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);

        const answer = data.toLowerCase();
        let result: boolean;

        if (answer === 'y' || answer === '\r' || answer === '\n') {
          result = answer === 'y' || defaultValue;
        } else if (answer === 'n') {
          result = false;
        } else {
          result = defaultValue;
        }

        console.log(result ? 'Yes' : 'No');
        resolve(result);
      };

      process.stdin.on('data', onData);
    });
  }
}

/**
 * Check if we should use TUI (not in CI/silent mode)
 */
export function shouldUseTUI(options: { ci?: boolean; silent?: boolean }): boolean {
  return !options.ci && !options.silent && process.stdout.isTTY;
}