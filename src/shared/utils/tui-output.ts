/**
 * TUI Output Formatter
 *
 * Provides beautiful terminal UI for interactive initialization using React Ink
 */

 
 

import { runInitWizard } from '../tui/init-wizard.js';
import { logger } from '../shared/logger';

export interface TUIOptions {
  showProgress: boolean;
  showColors: boolean;
  showIcons: boolean;
}

export class TUIOutput {
  private readonly options: TUIOptions;
  private readonly steps: string[] = [];
  private isRunning = false;

  constructor(options: Partial<TUIOptions> = {}) {
    this.options = {
      showProgress: true,
      showColors: true,
      showIcons: true,
      ...options,
    };
  }

  /**
   * Display welcome header
   */
  showHeader(): void {
    // Using console.log for TUI output is intentional - these are user-facing terminal displays
    process.stdout.write('\n');
    process.stdout.write(
      '╭─────────────────────────────────────────────────────────────────────────────╮\n',
    );
    process.stdout.write(
      '│                             🚀 PRP INITIALIZER                              │\n',
    );
    process.stdout.write(
      '│                     Interactive Project Bootstrap                          │\n',
    );
    process.stdout.write(
      '╰─────────────────────────────────────────────────────────────────────────────╯\n',
    );
    process.stdout.write('\n');
  }

  /**
   * Run the React Ink wizard from PRP-003
   */
  async runWizard(): Promise<unknown> {
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
    logger.debug(
      '♫ @dcversus/prp                                                     ⧗ 2025-11-05 04:12:00',
    );
    logger.debug();
    if (this.options.showColors) {
      logger.debug('\x1b[90m"Tools should vanish; flow should remain." — workshop note\x1b[0m');
    } else {
      logger.debug('"Tools should vanish; flow should remain." — workshop note');
    }
    logger.debug();
    logger.debug('     This wizard will provision your workspace and first PRP.');
    logger.debug('     One input at a time. Minimal. Reversible.');
    logger.debug();
    logger.debug(
      '───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────',
    );
    logger.debug('> press Enter');
    logger.debug(
      '───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────',
    );
    if (this.options.showColors) {
      logger.debug('Enter    Esc');
    } else {
      logger.debug('Enter    Esc');
    }
  }

  /**
   * Show wizard step header
   */
  showWizardStep(_step: number, icon: string, title: string): void {
    logger.debug();
    logger.debug(`${icon}  ${title}`);
    logger.debug();
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
      logger.debug(`\x1b[36m${step}\x1b[0m`);
    } else {
      logger.debug(step);
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
      logger.debug(`\x1b[32m${step}\x1b[0m`);
    } else {
      logger.debug(step);
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
      logger.debug(`\x1b[31m${step}\x1b[0m`);
    } else {
      logger.debug(step);
    }

    if (error) {
      logger.debug(`   ${error}`);
    }
  }

  /**
   * Show progress spinner for long operations
   */
  showProgress(description: string): () => void {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    const interval = setInterval(() => {
      process.stdout.write(
        `\r\x1b[K${this.options.showColors ? '\x1b[36m' : ''}${spinner[i]} ${description}${this.options.showColors ? '\x1b[0m' : ''}`,
      );
      i = (i + 1) % spinner.length;
    }, 100);

    return () => {
      clearInterval(interval);
      process.stdout.write(
        `\r\x1b[K${this.options.showColors ? '\x1b[32m' : ''}✅ ${description}${this.options.showColors ? '\x1b[0m' : ''}\n`,
      );
    };
  }

  /**
   * Show file creation
   */
  showFileCreated(filePath: string): void {
    const icon = this.options.showIcons ? '📝' : '+';
    logger.debug(`   ${icon} Created: ${filePath}`);
  }

  /**
   * Show directory creation
   */
  showDirectoryCreated(dirPath: string): void {
    const icon = this.options.showIcons ? '📁' : '+';
    logger.debug(`   ${icon} Created directory: ${dirPath}`);
  }

  /**
   * Show LLM generation
   */
  showLLMGeneration(prompt: string): void {
    logger.debug();
    logger.debug('🤖 Generating project files with AI...');
    logger.debug(`   Prompt: "${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}"`);
    logger.debug();
  }

  /**
   * Show LLM generated files
   */
  showLLMGenerated(files: {
    readme?: string;
    firstPrp?: string;
    agentsUserSection?: string;
  }): void {
    if (files.readme) {
      logger.debug('   📖 Generated: README.md');
    }
    if (files.firstPrp) {
      logger.debug('   📋 Generated: First PRP file');
    }
    if (files.agentsUserSection) {
      logger.debug('   🤝 Generated: Agents.md user section');
    }
    logger.debug();
  }

  /**
   * Show success message
   */
  showSuccess(projectName: string, projectPath: string): void {
    logger.debug();
    logger.debug('╭─────────────────────────────────────────────────────────────────────────────╮');
    logger.debug('│                          ✅ INITIALIZATION COMPLETE                        │');
    logger.debug('╰─────────────────────────────────────────────────────────────────────────────╯');
    logger.debug();
    logger.debug(`🎉 Project "${projectName}" initialized successfully!`);
    logger.debug();
    logger.debug('📂 Project location:');
    logger.debug(`   ${projectPath}`);
    logger.debug();
    logger.debug('🚀 Next steps:');
    logger.debug(`   cd ${projectPath}`);
    logger.debug('   npx prp                    # Start orchestrator');
    logger.debug('   npx prp orchestrator       # Direct orchestrator start');
    logger.debug();
  }

  /**
   * Show error message
   */
  showError(error: Error | string): void {
    logger.debug();
    logger.debug('╭─────────────────────────────────────────────────────────────────────────────╮');
    logger.debug(
      '│                           ❌ INITIALIZATION FAILED                           │',
    );
    logger.debug('╰─────────────────────────────────────────────────────────────────────────────╯');
    logger.debug();

    const errorMessage = error instanceof Error ? error.message : error;
    logger.debug('Error details:');
    logger.debug(`   ${errorMessage}`);
    logger.debug();

    if (error instanceof Error && error.stack) {
      logger.debug('Stack trace:');
      logger.debug(`   ${error.stack.split('\n').join('\n   ')}`);
      logger.debug();
    }
  }

  /**
   * Show warning
   */
  showWarning(message: string): void {
    const icon = this.options.showIcons ? '⚠️' : '!';
    logger.debug(`${icon} Warning: ${message}`);
  }

  /**
   * Show info
   */
  showInfo(message: string): void {
    const icon = this.options.showIcons ? 'ℹ️' : 'i';
    logger.debug(`${icon} ${message}`);
  }

  /**
   * Ask user a question
   */
  askQuestion(question: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;

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
          logger.debug();
          resolve(input || defaultValue || '');
        } else if (data === '\u0003') {
          // Ctrl+C
          process.exit(130);
        } else if (data === '\u007F') {
          // Backspace
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
  askYesNo(question: string, defaultValue = true): Promise<boolean> {
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

        logger.debug(result ? 'Yes' : 'No');
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
