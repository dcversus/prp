/**
 * CLI Runner Helper
 *
 * Utilities for running PRP CLI commands in automated tests
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { createInterface } from 'readline';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

export interface PerformanceMetrics {
  startupTime: number;
  peakMemoryUsage: number;
  totalDuration: number;
  commandsExecuted?: number;
  errorCount?: number;
}

export interface CLIRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
  performance?: PerformanceMetrics;
  sessionLog?: string[];
}

export interface CLIRunOptions {
  cwd: string;
  inputs?: string[];
  env?: Record<string, string>;
  timeout?: number;
  captureSession?: boolean;
  measurePerformance?: boolean;
  recordSession?: boolean;
}

export class CLIRunner {
  private cliPath: string;
  private sessionLog: string[] = [];
  private startTime: number = 0;
  private performanceMetrics: PerformanceMetrics = {
    startupTime: 0,
    peakMemoryUsage: 0,
    totalDuration: 0
  };

  constructor(cliPath?: string) {
    // Default to dist/cli.mjs in the project root
    this.cliPath = cliPath || join(process.cwd(), 'dist', 'cli.mjs');

    // Verify CLI exists
    if (!require('fs').existsSync(this.cliPath)) {
      throw new Error(`CLI not found at ${this.cliPath}. Please run 'npm run build' first.`);
    }
  }

  /**
   * Get performance metrics from the last run
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get session log for LLM judgment
   */
  getSessionLog(): string[] {
    return [...this.sessionLog];
  }

  /**
   * Clear session log
   */
  clearSessionLog(): void {
    this.sessionLog = [];
  }

  /**
   * Log session event
   */
  private logSession(event: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, event, data });
    this.sessionLog.push(logEntry);
  }

  /**
   * Run a CLI command with CI mode enabled
   */
  async runCI(args: string[], options: CLIRunOptions): Promise<CLIRunResult> {
    const fullArgs = ['--ci', ...args];
    return this.run(fullArgs, options);
  }

  /**
   * Run a CLI command with automated inputs
   */
  async run(args: string[], options: CLIRunOptions): Promise<CLIRunResult> {
    this.startTime = Date.now();
    this.logSession('command_start', { args, options });

    // Reset performance metrics for this run
    this.performanceMetrics = {
      startupTime: 0,
      peakMemoryUsage: 0,
      totalDuration: 0,
      commandsExecuted: 1,
      errorCount: 0
    };

    return new Promise((resolve) => {
      // Use full node path with shell option to avoid ENOENT errors
      const nodePath = process.execPath;
      const cliProcess = spawn(nodePath, [this.cliPath, ...args], {
        cwd: options.cwd,
        stdio: options.captureSession ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PRP_TEST_MODE: 'true',
          CI: 'true', // Force CI mode
          ...options.env
        },
        shell: true // Use shell to resolve the path properly
      });

      let stdout = '';
      let stderr = '';
      let firstOutputTime = 0;
      let memoryMonitorInterval: NodeJS.Timeout | null = null;
      let processPid = cliProcess.pid;

      // Performance monitoring setup
      if (options.measurePerformance && processPid) {
        const startMemory = process.memoryUsage();
        memoryMonitorInterval = setInterval(() => {
          if (processPid) {
            try {
              // Try to get memory usage (this is a simplified approach)
              const currentMemory = process.memoryUsage();
              this.performanceMetrics.peakMemoryUsage = Math.max(
                this.performanceMetrics.peakMemoryUsage,
                currentMemory.heapUsed
              );
            } catch (error) {
              // Process might have ended
            }
          }
        }, 100);
      }

      // Capture stdout with session logging
      cliProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;

        if (firstOutputTime === 0) {
          firstOutputTime = Date.now();
          this.performanceMetrics.startupTime = firstOutputTime - this.startTime;
        }

        if (options.captureSession) {
          this.logSession('stdout', { text, timestamp: Date.now() });
        }
      });

      // Capture stderr with session logging
      cliProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        this.performanceMetrics.errorCount = (this.performanceMetrics.errorCount || 0) + 1;

        if (options.captureSession) {
          this.logSession('stderr', { text, timestamp: Date.now() });
        }
      });

      // Handle process completion with performance metrics
      cliProcess.on('close', (code) => {
        if (memoryMonitorInterval) {
          clearInterval(memoryMonitorInterval);
        }

        this.performanceMetrics.totalDuration = Date.now() - this.startTime;
        this.logSession('command_end', {
          exitCode: code,
          duration: this.performanceMetrics.totalDuration,
          success: (code || 0) === 0
        });

        const result: CLIRunResult = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          success: (code || 0) === 0
        };

        if (options.measurePerformance) {
          result.performance = { ...this.performanceMetrics };
        }

        if (options.captureSession) {
          result.sessionLog = [...this.sessionLog];
        }

        // Save session recording if requested
        if (options.recordSession) {
          this.saveSessionRecording(args, result);
        }

        resolve(result);
      });

      cliProcess.on('error', (error) => {
        if (memoryMonitorInterval) {
          clearInterval(memoryMonitorInterval);
        }

        this.performanceMetrics.errorCount = (this.performanceMetrics.errorCount || 0) + 1;
        this.logSession('error', { error: error.message, timestamp: Date.now() });

        const result: CLIRunResult = {
          stdout: '',
          stderr: error.message,
          exitCode: 1,
          success: false
        };

        if (options.measurePerformance) {
          result.performance = { ...this.performanceMetrics };
        }

        if (options.captureSession) {
          result.sessionLog = [...this.sessionLog];
        }

        resolve(result);
      });

      // Enhanced input handling with better timing
      if (options.inputs && options.inputs.length > 0 && cliProcess.stdin) {
        const rl = createInterface({
          input: process.stdin, // Use process stdin for reading
          output: cliProcess.stdin,
          terminal: false
        });

        let inputIndex = 0;
        const sendNextInput = () => {
          if (inputIndex < options.inputs!.length) {
            const input = options.inputs![inputIndex];
            this.logSession('input_sent', { input, index: inputIndex });

            if (input && cliProcess.stdin) {
              cliProcess.stdin.write(input + '\n');
            }
            inputIndex++;

            // Dynamic delay based on input type
            const delay = this.calculateInputDelay(input);
            if (inputIndex < options.inputs!.length) {
              setTimeout(sendNextInput, delay);
            } else {
              rl.close();
              cliProcess.stdin.end();
            }
          }
        };

        // Wait for initial prompt
        setTimeout(sendNextInput, 1000);
      } else if (cliProcess.stdin) {
        cliProcess.stdin.end();
      }

      // Enhanced timeout handling
      if (options.timeout) {
        setTimeout(() => {
          cliProcess.kill('SIGTERM');
          this.logSession('timeout', { timeout: options.timeout });

          if (memoryMonitorInterval) {
            clearInterval(memoryMonitorInterval);
          }

          const result: CLIRunResult = {
            stdout: stdout.trim(),
            stderr: `Process timed out after ${options.timeout}ms`,
            exitCode: 124,
            success: false
          };

          if (options.measurePerformance) {
            result.performance = { ...this.performanceMetrics };
          }

          if (options.captureSession) {
            result.sessionLog = [...this.sessionLog];
          }

          resolve(result);
        }, options.timeout);
      }
    });
  }

  /**
   * Calculate intelligent delay between inputs based on content
   */
  private calculateInputDelay(input: string): number {
    // Shorter delays for simple inputs
    if (input.length < 10) return 300;
    // Longer delays for complex inputs
    if (input.length > 50) return 800;
    // Default delay
    return 500;
  }

  /**
   * Save session recording to file for analysis
   */
  private saveSessionRecording(args: string[], result: CLIRunResult): void {
    try {
      const recordingDir = join(tmpdir(), 'prp-test-recordings');
      mkdirSync(recordingDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${args.join('-')}-${timestamp}.json`;
      const filepath = join(recordingDir, filename);

      const recording = {
        command: args.join(' '),
        timestamp: new Date().toISOString(),
        result,
        performanceMetrics: this.performanceMetrics,
        sessionLog: this.sessionLog
      };

      writeFileSync(filepath, JSON.stringify(recording, null, 2));
      this.logSession('recording_saved', { filepath });
    } catch (error) {
      this.logSession('recording_error', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Run init command with CI mode
   */
  async runInit(options: {
    projectDir: string;
    projectName?: string;
    template?: string;
    inputs?: string[];
  }): Promise<CLIRunResult> {
    const args = ['init'];

    if (options.projectName) {
      args.push('--project-name', options.projectName);
    }

    if (options.template) {
      args.push('--template', options.template);
    }

    return this.runCI(args, {
      cwd: options.projectDir,
      inputs: options.inputs || [],
      timeout: 30000 // 30 second timeout
    });
  }

  /**
   * Run orchestrator command with CI mode
   */
  async runOrchestrator(projectDir: string, timeout = 10000): Promise<CLIRunResult> {
    return this.runCI(['orchestrator'], {
      cwd: projectDir,
      timeout
    });
  }

  /**
   * Run init command in TUI mode (interactive)
   */
  async runTUIInit(options: {
    projectDir: string;
    projectName?: string;
    template?: string;
    timeout?: number;
    captureSession?: boolean;
  }): Promise<CLIRunResult> {
    const args = ['init'];

    if (options.projectName) {
      args.push(options.projectName);
    }

    if (options.template) {
      args.push('--template', options.template);
    }

    return this.run(args, {
      cwd: options.projectDir,
      timeout: options.timeout || 60000, // Longer timeout for TUI
      captureSession: options.captureSession ?? true,
      measurePerformance: true,
      recordSession: true,
      env: {
        // Disable CI mode for TUI
        CI: 'false',
        TUI_TEST_MODE: 'true'
      }
    });
  }

  /**
   * Run full user journey: init → orchestrator → Ctrl+C
   */
  async runFullUserJourney(options: {
    projectDir: string;
    projectName: string;
    template?: string;
    initTimeout?: number;
    orchestratorTimeout?: number;
    captureSession?: boolean;
  }): Promise<{
    initResult: CLIRunResult;
    orchestratorResult: CLIRunResult;
    combinedSession: string[];
    totalPerformance: PerformanceMetrics;
  }> {
    const startTime = Date.now();
    const combinedSession: string[] = [];

    // Step 1: Run init command
    this.logSession('journey_start', { step: 'init', projectName: options.projectName });
    const initResult = await this.runTUIInit({
      projectDir: options.projectDir,
      projectName: options.projectName,
      template: options.template,
      timeout: options.initTimeout,
      captureSession: options.captureSession
    });

    combinedSession.push(...this.sessionLog);

    if (!initResult.success) {
      this.logSession('journey_failed', { step: 'init', error: initResult.stderr });
      throw new Error(`Init failed: ${initResult.stderr}`);
    }

    // Step 2: Start orchestrator
    this.logSession('journey_continue', { step: 'orchestrator' });
    const orchestratorResult = await this.runOrchestrator(
      options.projectDir,
      options.orchestratorTimeout
    );

    combinedSession.push(...this.sessionLog);

    // Step 3: Send Ctrl+C to gracefully stop orchestrator
    this.logSession('journey_end', { step: 'cleanup', action: 'Ctrl+C' });

    const totalDuration = Date.now() - startTime;
    const totalPerformance: PerformanceMetrics = {
      startupTime: initResult.performance?.startupTime || 0,
      peakMemoryUsage: Math.max(
        initResult.performance?.peakMemoryUsage || 0,
        orchestratorResult.performance?.peakMemoryUsage || 0
      ),
      totalDuration,
      commandsExecuted: 2,
      errorCount: (initResult.performance?.errorCount || 0) + (orchestratorResult.performance?.errorCount || 0)
    };

    return {
      initResult,
      orchestratorResult,
      combinedSession,
      totalPerformance
    };
  }

  /**
   * Run complete CI journey: init → orchestrator
   */
  async runCIJourney(options: {
    projectDir: string;
    projectName: string;
    template?: string;
    prompt?: string;
    description?: string;
    timeout?: number;
  }): Promise<CLIRunResult> {
    const args = ['init', options.projectName];

    if (options.template) {
      args.push('--template', options.template);
    }

    if (options.prompt) {
      args.push('--prompt', options.prompt);
    }

    if (options.description) {
      args.push('--description', options.description);
    }

    return this.runCI(args, {
      cwd: options.projectDir,
      timeout: options.timeout || 45000,
      captureSession: true,
      measurePerformance: true,
      recordSession: true
    });
  }

  /**
   * Validate CLI bundle exists and is executable
   */
  async validateCLI(): Promise<{ valid: boolean; error?: string; version?: string }> {
    try {
      const result = await this.run(['--version'], {
        cwd: process.cwd(),
        timeout: 5000,
        captureSession: false,
        measurePerformance: false
      });

      if (result.success) {
        return {
          valid: true,
          version: result.stdout.trim()
        };
      } else {
        return {
          valid: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run command with real keyboard simulation for TUI testing
   */
  async runWithKeyboardSimulation(
    args: string[],
    keyboardActions: Array<{
      key: string;
      delay?: number;
      ctrl?: boolean;
      alt?: boolean;
      shift?: boolean;
    }>,
    options: Omit<CLIRunOptions, 'inputs'> = {}
  ): Promise<CLIRunResult> {
    this.startTime = Date.now();
    this.logSession('keyboard_simulation_start', { args, actionCount: keyboardActions.length });

    return new Promise((resolve) => {
      // Use 'node' from PATH to avoid ENOENT errors with full paths
      const cliProcess = spawn('node', [this.cliPath, ...args], {
        cwd: options.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PRP_TEST_MODE: 'true',
          CI: 'false', // Ensure CI mode is disabled for TUI
          ...options.env
        }
      });

      let stdout = '';
      let stderr = '';
      let actionIndex = 0;

      // Capture output
      cliProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        this.logSession('stdout', { text, timestamp: Date.now() });
      });

      cliProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        this.logSession('stderr', { text, timestamp: Date.now() });
      });

      // Send keyboard actions
      const sendNextAction = () => {
        if (actionIndex < keyboardActions.length && cliProcess.stdin) {
          const action = keyboardActions[actionIndex];
          this.logSession('keyboard_action', { action, index: actionIndex });

          // Convert keyboard action to appropriate input
          let input = action.key;
          if (action.ctrl && action.key === 'c') {
            // Send Ctrl+C
            cliProcess.stdin.write('\x03');
          } else if (action.ctrl && action.key === 'v') {
            // Send Ctrl+V
            cliProcess.stdin.write('\x16');
          } else {
            // Regular key input
            cliProcess.stdin.write(input);
          }

          actionIndex++;

          const delay = action.delay || 200;
          if (actionIndex < keyboardActions.length) {
            setTimeout(sendNextAction, delay);
          } else {
            cliProcess.stdin.end();
          }
        }
      };

      // Wait for TUI to initialize
      setTimeout(sendNextAction, 2000);

      // Handle completion
      cliProcess.on('close', (code) => {
        this.performanceMetrics.totalDuration = Date.now() - this.startTime;
        this.logSession('keyboard_simulation_end', { exitCode: code });

        const result: CLIRunResult = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          success: (code || 0) === 0,
          performance: { ...this.performanceMetrics },
          sessionLog: [...this.sessionLog]
        };

        resolve(result);
      });

      cliProcess.on('error', (error) => {
        this.logSession('error', { error: error.message });
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: 1,
          success: false
        });
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          cliProcess.kill('SIGTERM');
          this.logSession('timeout', { timeout: options.timeout });
          resolve({
            stdout: stdout.trim(),
            stderr: `Process timed out after ${options.timeout}ms`,
            exitCode: 124,
            success: false
          });
        }, options.timeout);
      }
    });
  }
}