/**
 * Terminal Runner - Real terminal process execution for E2E testing
 * Supports both PTY (interactive) and non-PTY modes with proper isolation
 */

import { spawn } from 'child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { EventEmitter } from 'events';

export interface TerminalOptions {
  cwd: string;
  env?: Record<string, string>;
  timeout?: number;
  interactive?: boolean;
  captureOutput?: boolean;
  columns?: number;
  rows?: number;
}

export interface TerminalResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  output: string; // Combined output for TUI interactions
  duration: number;
  killed: boolean;
}

export class TerminalRunner extends EventEmitter {
  private process: any;
  private stdout: string[] = [];
  private stderr: string[] = [];
  private output: string[] = [];
  private startTime: number = 0;
  private timeoutHandle?: NodeJS.Timeout;
  private outputBuffer: string = '';
  private pty?: any;

  constructor(private options: TerminalOptions) {
    super();
    this.setupEnvironment();
  }

  private setupEnvironment(): void {
    // Ensure working directory exists
    if (!existsSync(this.options.cwd)) {
      mkdirSync(this.options.cwd, { recursive: true });
    }

    // Set up environment variables
    this.options.env = {
      ...process.env,
      NODE_ENV: 'test',
      CI: 'true',
      ...this.options.env,
      TERM: this.options.interactive ? 'xterm-256color' : 'dumb',
      COLUMNS: this.options.columns?.toString() || '80',
      LINES: this.options.rows?.toString() || '24'
    };
  }

  async run(command: string, args: string[] = []): Promise<TerminalResult> {
    return new Promise((resolve, reject) => {
      this.startTime = Date.now();
      this.stdout = [];
      this.stderr = [];
      this.output = [];
      this.outputBuffer = '';

      try {
        if (this.options.interactive) {
          this.runInteractive(command, args, resolve, reject);
        } else {
          this.runNonInteractive(command, args, resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private async runInteractive(
    command: string,
    args: string[],
    resolve: (result: TerminalResult) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    try {
      // Try to use node-pty for interactive sessions
      const { spawn } = await import('node-pty');

      this.pty = spawn(command, args, {
        cwd: this.options.cwd,
        env: this.options.env,
        cols: this.options.columns || 80,
        rows: this.options.rows || 24,
        name: 'xterm-256color'
      });

      this.pty.on('data', (data: string) => {
        this.outputBuffer += data;
        this.output.push(data);
        this.emit('output', data);

        // Detect prompt or completion
        if (this.detectPrompt(data)) {
          this.emit('prompt');
        }
      });

      this.pty.on('exit', (exitCode: number) => {
        this.cleanup();
        resolve(this.createResult(exitCode));
      });

      // Set up timeout
      if (this.options.timeout) {
        this.timeoutHandle = setTimeout(() => {
          this.kill();
          reject(new Error(`Command timed out after ${this.options.timeout}ms`));
        }, this.options.timeout);
      }

    } catch (error) {
      // Fallback to non-interactive mode if node-pty not available
      console.warn('node-pty not available, falling back to non-interactive mode');
      this.options.interactive = false;
      this.runNonInteractive(command, args, resolve, reject);
    }
  }

  private runNonInteractive(
    command: string,
    args: string[],
    resolve: (result: TerminalResult) => void,
    reject: (error: Error) => void
  ): void {
    this.process = spawn(command, args, {
      cwd: this.options.cwd,
      env: this.options.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.stdout.push(output);
      this.output.push(output);
      this.emit('output', output);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.stderr.push(output);
      this.output.push(output);
      this.emit('output', output);
    });

    this.process.on('close', (exitCode: number | null) => {
      this.cleanup();
      resolve(this.createResult(exitCode));
    });

    this.process.on('error', (error: Error) => {
      this.cleanup();
      reject(error);
    });

    // Set up timeout
    if (this.options.timeout) {
      this.timeoutHandle = setTimeout(() => {
        this.kill();
        reject(new Error(`Command timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);
    }
  }

  writeInput(data: string): void {
    if (this.pty) {
      this.pty.write(data);
    } else if (this.process?.stdin) {
      this.process.stdin.write(data);
    }
  }

  sendKey(key: string, ctrl = false, alt = false, shift = false): void {
    let sequence = '';

    if (ctrl) sequence += '\x1b[1;5';
    else if (alt) sequence += '\x1b[1;9';
    else if (shift) sequence += '\x1b[1;2';
    else sequence += '\x1b[';

    // Map common keys to their escape sequences
    const keyMap: Record<string, string> = {
      'up': 'A',
      'down': 'B',
      'right': 'C',
      'left': 'D',
      'home': 'H',
      'end': 'F',
      'pgup': '5~',
      'pgdn': '6~',
      'space': ' ',
      'tab': '\t',
      'enter': '\r',
      'escape': '\x1b',
      'backspace': '\x7f',
      'delete': '\x7f'
    };

    if (keyMap[key.toLowerCase()]) {
      if (key.length === 1 && !ctrl && !alt && !shift) {
        sequence = key;
      } else {
        sequence += keyMap[key.toLowerCase()];
        if (!ctrl && !alt && !shift) sequence = '\x1b[' + keyMap[key.toLowerCase()];
      }
    } else {
      // Single character
      sequence = key;
    }

    this.writeInput(sequence);
  }

  waitForPrompt(pattern?: RegExp, timeout = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkPrompt = (data: string) => {
        if (pattern && pattern.test(data)) {
          this.off('output', checkPrompt);
          resolve(data);
        } else if (!pattern && this.detectPrompt(data)) {
          this.off('output', checkPrompt);
          resolve(data);
        }
      };

      this.on('output', checkPrompt);

      setTimeout(() => {
        this.off('output', checkPrompt);
        reject(new Error('Prompt not detected within timeout'));
      }, timeout);
    });
  }

  private detectPrompt(data: string): boolean {
    // Common prompt patterns
    const promptPatterns = [
      /\$/,               // Bash prompt
      />/,               // Generic prompt
      /\?/,              // Choice prompt
      /→/,               // Arrow prompt
      /✓/,               // Success indicator
      /Input:/,          // Input field
      /Select:/,         // Selection field
    ];

    return promptPatterns.some(pattern => pattern.test(data));
  }

  private createResult(exitCode: number | null): TerminalResult {
    const duration = Date.now() - this.startTime;

    return {
      exitCode,
      stdout: this.stdout.join(''),
      stderr: this.stderr.join(''),
      output: this.output.join(''),
      duration,
      killed: false
    };
  }

  kill(): void {
    if (this.pty) {
      this.pty.kill();
    } else if (this.process) {
      this.process.kill('SIGKILL');
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
    this.removeAllListeners();
  }

  getScreenContent(): string {
    return this.outputBuffer;
  }

  saveScreenCapture(filepath?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = filepath || join(tmpdir(), `terminal-capture-${timestamp}.txt`);
    writeFileSync(filename, this.outputBuffer);
    return filename;
  }
}

/**
 * Utility function to run a command in temporary directory
 */
export async function runInTempDir<T>(
  testFn: (runner: TerminalRunner, tempDir: string) => Promise<T>
): Promise<{ result: T; tempDir: string; captures: string[] }> {
  const tempDir = join(tmpdir(), `prp-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  mkdirSync(tempDir, { recursive: true });

  const captures: string[] = [];
  const runner = new TerminalRunner({
    cwd: tempDir,
    timeout: 30000,
    interactive: false,
    captureOutput: true
  });

  try {
    const result = await testFn(runner, tempDir);

    // Save captures
    if (runner.getScreenContent()) {
      captures.push(runner.saveScreenCapture());
    }

    return { result, tempDir, captures };
  } finally {
    // Cleanup temp dir
    try {
      // Note: In real tests, you might want to keep temp dirs for debugging
      // require('rimraf').sync(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Business-specific terminal runners for different scenarios
 */
export class PRPTerminalRunner extends TerminalRunner {
  constructor(cwd: string, mode: 'tui' | 'ci' = 'tui') {
    super({
      cwd,
      interactive: mode === 'tui',
      timeout: 60000, // 1 minute timeout for PRP operations
      columns: 120,
      rows: 40,
      env: {
        PRP_TEST_MODE: 'true',
        PRP_MODE: mode
      }
    });
  }

  async runInit(args: string[] = []): Promise<TerminalResult> {
    const cliPath = join(process.cwd(), 'dist', 'cli.mjs');
    return this.run('node', [cliPath, 'init', ...args]);
  }

  async runCommand(command: string, args: string[] = []): Promise<TerminalResult> {
    const cliPath = join(process.cwd(), 'dist', 'cli.mjs');
    return this.run('node', [cliPath, command, ...args]);
  }

  async navigateTUI(navigationSteps: Array<{ key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }>): Promise<void> {
    for (const step of navigationSteps) {
      this.sendKey(step.key, step.ctrl, step.alt, step.shift);
      // Small delay between keypresses for realistic interaction
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async selectChoice(choiceIndex: number): Promise<void> {
    // Navigate to choice
    for (let i = 0; i < choiceIndex; i++) {
      this.sendKey('down');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    // Confirm selection
    this.sendKey('enter');
  }

  async fillForm(inputs: string[]): Promise<void> {
    for (const input of inputs) {
      this.writeInput(input);
      this.sendKey('enter');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}