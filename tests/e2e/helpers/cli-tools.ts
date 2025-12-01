/**
 * CLI Testing Utilities
 * Comprehensive tools for spawning, controlling, and testing CLI processes
 * Supports interactive and non-interactive CLI modes with robust error handling
 */

import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Enhanced interfaces for better type safety
export interface CLIOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  input?: string;
  shell?: boolean;
  detached?: boolean;
  uid?: number;
  gid?: number;
  maxBuffer?: number;
  killSignal?: 'SIGTERM' | 'SIGKILL' | 'SIGINT';
}

export interface ProcessControl {
  process: ChildProcess;
  stdout: string[];
  stderr: string[];
  combinedOutput: string[];
  exitCode: number | null;
  pid: number;
  startTime: number;
  endTime?: number;
  isAlive: boolean;
}

export interface TempDirectory {
  path: string;
  cleanup: () => Promise<void>;
}

export interface TestEnvironment {
  tempDir: TempDirectory;
  env: Record<string, string>;
  cleanup: () => Promise<void>;
}

export interface WaitOptions {
  timeout?: number;
  interval?: number;
  caseSensitive?: boolean;
  regex?: boolean;
}

export interface ProcessMetrics {
  pid: number;
  startTime: number;
  endTime?: number;
  duration: number;
  exitCode: number | null;
  stdoutLength: number;
  stderrLength: number;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
}

// Error classes for better error handling
export class ProcessTimeoutError extends Error {
  constructor(command: string, timeout: number) {
    super(`Process timeout after ${timeout}ms: ${command}`);
    this.name = 'ProcessTimeoutError';
  }
}

export class ProcessExitError extends Error {
  public readonly exitCode: number;

  constructor(command: string, exitCode: number, stderr: string) {
    super(`Process exited with code ${exitCode}: ${command}\nStderr: ${stderr}`);
    this.name = 'ProcessExitError';
    this.exitCode = exitCode;
  }
}

export class OutputTimeoutError extends Error {
  constructor(pattern: string, timeout: number) {
    super(`Timeout waiting for pattern "${pattern}" after ${timeout}ms`);
    this.name = 'OutputTimeoutError';
  }
}

export class ProcessHangError extends Error {
  constructor(pid: number) {
    super(`Process ${pid} appears to be hanging`);
    this.name = 'ProcessHangError';
  }
}

/**
 * Execute CLI command and capture output with enhanced error handling
 */
export async function executeCommand(
  command: string,
  options: CLIOptions = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const nodeProcess = getCurrentProcess();
  const env = { ...nodeProcess.env, ...options.env };
  const timeout = options.timeout ?? 30000;
  const cwd = options.cwd ?? nodeProcess.cwd();

  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      shell: true,
      cwd,
      env,
      stdio: 'pipe',
      detached: options.detached ?? false,
      uid: options.uid,
      gid: options.gid,
      killSignal: options.killSignal || 'SIGTERM',
    });

    let stdout = '';
    let stderr = '';
    let isKilled = false;

    const cleanup = () => {
      if (!child.killed && !isKilled) {
        isKilled = true;
        child.kill('SIGKILL');
      }
    };

    const timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new ProcessTimeoutError(command, timeout));
    }, timeout);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (isDebugEnabled()) {
        // eslint-disable-next-line no-console -- Debug logging is acceptable in test utilities
        console.log(`[STDOUT] ${text.trim()}`);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (isDebugEnabled()) {
        // eslint-disable-next-line no-console -- Debug logging is acceptable in test utilities
        console.log(`[STDERR] ${text.trim()}`);
      }
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeoutHandle);

      if (signal === 'SIGKILL' && isKilled) {
        reject(new ProcessTimeoutError(command, timeout));
      } else if (code !== 0) {
        reject(new ProcessExitError(command, code ?? -1, stderr));
      } else {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeoutHandle);
      cleanup();
      reject(error);
    });

    // Send input if provided
    if (options.input) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }
  });
}

/**
 * Spawn a process for interactive testing with enhanced control
 */
export const spawnProcess = async function(
  command: string,
  args: string[] = [],
  options: CLIOptions = {}
): Promise<ProcessControl> {
  const nodeProcess = getCurrentProcess();
  const env = { ...nodeProcess.env, ...options.env };
  const cwd = options.cwd ?? nodeProcess.cwd();

  const childProcess = spawn(command, args, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: options.detached ?? false,
    uid: options.uid,
    gid: options.gid,
  });

  const startTime = Date.now();
  const control: ProcessControl = {
    process: childProcess,
    stdout: [],
    stderr: [],
    combinedOutput: [],
    exitCode: null,
    pid: childProcess.pid || -1,
    startTime,
    isAlive: true,
  };

  childProcess.stdout?.on('data', (data) => {
    const text = data.toString();
    control.stdout.push(text);
    control.combinedOutput.push(text);

    if (isDebugEnabled()) {
      console.log(`[STDOUT:${childProcess.pid}] ${text.trim()}`);
    }
  });

  childProcess.stderr?.on('data', (data) => {
    const text = data.toString();
    control.stderr.push(text);
    control.combinedOutput.push(text);

    if (isDebugEnabled()) {
      console.log(`[STDERR:${childProcess.pid}] ${text.trim()}`);
    }
  });

  childProcess.on('close', (code, signal) => {
    control.exitCode = code;
    control.endTime = Date.now();
    control.isAlive = false;

    if (isDebugEnabled()) {
      console.log(`[CLOSE:${childProcess.pid}] Exit code: ${code}, Signal: ${signal}`);
    }
  });

  childProcess.on('error', (error) => {
    const errorMsg = `Process error: ${error.message}`;
    control.stderr.push(errorMsg);
    control.combinedOutput.push(errorMsg);

    if (isDebugEnabled()) {
      console.error(`[ERROR:${childProcess.pid}] ${error.message}`);
    }
  });

  // Give process a moment to start
  await new Promise((resolve) => setTimeout(resolve, 100));

  return control;
}

/**
 * Wait for specific text to appear in process output with enhanced options
 */
export async function waitForOutput(
  control: ProcessControl,
  pattern: string,
  options: WaitOptions = {}
): Promise<void> {
  const timeout = options.timeout || 10000;
  const interval = options.interval || 100;
  const caseSensitive = options.caseSensitive !== false;
  const useRegex = options.regex || false;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let regex: RegExp | null = null;

    if (useRegex) {
      try {
        regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      } catch (error) {
        reject(new Error(`Invalid regex pattern: ${pattern}`));
        return;
      }
    }

    const checkPattern = () => {
      const allOutput = control.combinedOutput.join('');
      const searchText = caseSensitive ? allOutput : allOutput.toLowerCase();
      const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

      let found = false;
      if (useRegex && regex) {
        regex.lastIndex = 0;
        found = regex.test(allOutput);
      } else {
        found = searchText.includes(searchPattern);
      }

      if (found) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new OutputTimeoutError(pattern, timeout));
        return;
      }

      if (control.exitCode !== null) {
        reject(
          new ProcessExitError(
            `Process ${control.pid}`,
            control.exitCode,
            `Process exited while waiting for pattern: ${pattern}`
          )
        );
        return;
      }

      setTimeout(checkPattern, interval);
    };

    checkPattern();
  });
}

/**
 * Send input to a running process with enhanced error handling
 */
export async function sendInput(
  control: ProcessControl,
  input: string,
  options: { newline?: boolean; encoding?: BufferEncoding } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!control.process.stdin) {
      reject(new Error('Process stdin not available'));
      return;
    }

    if (!control.isAlive) {
      reject(new Error('Process is no longer alive'));
      return;
    }

    const data = input + (options.newline !== false ? '\n' : '');
    const encoding = options.encoding || 'utf8';

    control.process.stdin.write(data, encoding, (error) => {
      if (error) {
        reject(error);
      } else {
        const currentProcess = getCurrentProcess();
        if (
          'env' in currentProcess &&
          (currentProcess.env as Record<string, string | undefined>)?.DEBUG_CLI_TESTS
        ) {
          console.log(`[INPUT:${control.pid}] ${data.trim()}`);
        }
        resolve();
      }
    });
  });
}

/**
 * Kill a process with multiple fallback strategies
 */
export async function killProcess(
  control: ProcessControl,
  options: { timeout?: number; force?: boolean; signal?: NodeJS.Signals } = {}
): Promise<void> {
  const timeout = options.timeout || 5000;
  const force = options.force || false;
  const signal = options.signal || (force ? 'SIGKILL' : 'SIGTERM');

  return new Promise((resolve, reject) => {
    if (!control.isAlive || control.exitCode !== null) {
      resolve();
      return;
    }

    let killed = false;

    const cleanup = () => {
      if (!killed) {
        killed = true;
        try {
          control.process.kill('SIGKILL');
        } catch (error) {
          // Process might already be dead
        }
      }
    };

    const forceKill = setTimeout(() => {
      cleanup();
      resolve();
    }, timeout);

    control.process.on('close', () => {
      clearTimeout(forceKill);
      resolve();
    });

    try {
      control.process.kill(signal);

      const currentProcess = getCurrentProcess();
      if (
        'env' in currentProcess &&
        (currentProcess.env as Record<string, string | undefined>)?.DEBUG_CLI_TESTS
      ) {
        console.log(`[KILL:${control.pid}] Signal: ${signal}, Force: ${force}`);
      }
    } catch (error) {
      clearTimeout(forceKill);
      reject(error);
    }
  });
}

/**
 * Create temporary directory with automatic cleanup tracking
 */
export async function createTempDirectory(prefix = 'prp-test-'): Promise<TempDirectory> {
  const tempPath = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

  const cleanup = async () => {
    try {
      await fs.rm(tempPath, { recursive: true, force: true });
      const currentProcess = getCurrentProcess();
      if (
        'env' in currentProcess &&
        (currentProcess.env as Record<string, string | undefined>)?.DEBUG_CLI_TESTS
      ) {
        console.log(`[CLEANUP] Removed temp directory: ${tempPath}`);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempPath}:`, error);
    }
  };

  // Register cleanup for process exit
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup().then(() => process.exit(130));
  });
  process.on('SIGTERM', () => {
    cleanup().then(() => process.exit(143));
  });

  return {
    path: tempPath,
    cleanup,
  };
}

/**
 * Setup complete test environment with temp directory and environment variables
 */
export async function setupTestEnvironment(
  options: {
    tempDirPrefix?: string;
    env?: Record<string, string>;
    cwd?: string;
  } = {}
): Promise<TestEnvironment> {
  const tempDir = await createTempDirectory(options.tempDirPrefix);
  const nodeProcess = getCurrentProcess();

  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(nodeProcess.env).filter(([_, value]) => value !== undefined)
    ),
    NODE_ENV: 'test',
    CI: 'true',
    ...options.env,
  };

  const cleanup = async () => {
    await tempDir.cleanup();
  };

  return {
    tempDir,
    env,
    cleanup,
  };
}

/**
 * Enhanced wait for file with polling and validation
 */
export async function waitForFile(
  filePath: string,
  options: { timeout?: number; interval?: number; checkContent?: boolean } = {}
): Promise<void> {
  const timeout = options.timeout || 10000;
  const interval = options.interval || 200;
  const checkContent = options.checkContent || false;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkFile = async () => {
      try {
        await fs.stat(filePath);

        if (checkContent) {
          // Check if file has content
          const content = await fs.readFile(filePath, 'utf8');
          if (content.length === 0) {
            throw new Error('File is empty');
          }
        }

        resolve();
        return;
      } catch {
        // File doesn't exist or is empty
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for file: ${filePath}`));
        return;
      }

      setTimeout(checkFile, interval);
    };

    checkFile();
  });
}

/**
 * Run interactive CLI with comprehensive mocking and process control
 */
export async function runInteractiveCLI(
  command: string,
  inputs: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    expectedPatterns?: string[];
    mockStdout?: boolean;
  } = {}
): Promise<{ exitCode: number; output: string; matchedPatterns: string[] }> {
  const cliOptions: CLIOptions = {
    timeout: options.timeout || 30000,
  };

  if (options.cwd !== undefined) {
    cliOptions.cwd = options.cwd;
  }

  if (options.env !== undefined) {
    cliOptions.env = options.env;
  }

  const control = await spawnProcess(command, [], cliOptions);

  const matchedPatterns: string[] = [];

  try {
    for (const input of inputs) {
      if (options.expectedPatterns && options.expectedPatterns.length > 0) {
        const pattern = options.expectedPatterns.shift();
        if (pattern) {
          await waitForOutput(control, pattern, { timeout: 5000 });
          matchedPatterns.push(pattern);
        }
      }

      await sendInput(control, input);
    }

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ProcessTimeoutError(command, options.timeout || 30000));
      }, options.timeout || 30000);

      control.process.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    return {
      exitCode: control.exitCode || 0,
      output: control.combinedOutput.join(''),
      matchedPatterns,
    };
  } finally {
    await killProcess(control);
  }
}

/**
 * Get comprehensive process metrics
 */
export function getProcessMetrics(control: ProcessControl): ProcessMetrics {
  const endTime = control.endTime || Date.now();
  const duration = endTime - control.startTime;

  return {
    pid: control.pid,
    startTime: control.startTime,
    endTime,
    duration,
    exitCode: control.exitCode,
    stdoutLength: control.stdout.join('').length,
    stderrLength: control.stderr.join('').length,
    memoryUsage: getCurrentProcess().memoryUsage?.() || {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
    arrayBuffers: 0,
  },
  };
}

/**
 * Platform-specific utilities
 */
export const PlatformUtils = {
  /**
   * Get platform-specific command executable
   */
  getExecutable(command: string): string {
    const currentProcess = getCurrentProcess();
    if ('platform' in currentProcess && currentProcess.platform === 'win32') {
      return `${command  }.cmd`;
    }
    return command;
  },

  /**
   * Get platform-specific shell
   */
  getShell(): string {
    const currentProcess = getCurrentProcess();
    if ('platform' in currentProcess && currentProcess.platform === 'win32') {
      return (currentProcess.env as Record<string, string | undefined>)?.COMSPEC || 'cmd.exe';
    }
    return '/bin/bash';
  },

  /**
   * Escape arguments for shell
   */
  escapeShellArg(arg: string): string {
    const currentProcess = getCurrentProcess();
    if ('platform' in currentProcess && currentProcess.platform === 'win32') {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return `'${arg.replace(/'/g, "'\"'\"'")}'`;
  },

  /**
   * Check if running on Windows
   */
  isWindows(): boolean {
    const currentProcess = getCurrentProcess();
    return 'platform' in currentProcess && currentProcess.platform === 'win32';
  },

  /**
   * Check if running on macOS
   */
  isMacOS(): boolean {
    const currentProcess = getCurrentProcess();
    return 'platform' in currentProcess && currentProcess.platform === 'darwin';
  },

  /**
   * Check if running on Linux
   */
  isLinux(): boolean {
    const currentProcess = getCurrentProcess();
    return 'platform' in currentProcess && currentProcess.platform === 'linux';
  },
};

/**
 * Mock stdout for testing
 */
export class MockStdout {
  private output: string[] = [];

  write(data: string): boolean {
    this.output.push(data);
    return true;
  }

  getOutput(): string {
    return this.output.join('');
  }

  clear(): void {
    this.output = [];
  }

  toString(): string {
    return this.getOutput();
  }
}

/**
 * Mock stdin for testing
 */
export function createMockStdin(inputs: string[]): NodeJS.ReadableStream {
  const { Readable } = require('stream');
  const inputStream = Readable.from(`${inputs.join('\n')  }\n`);
  return inputStream;
}

/**
 * Create mock stdout for testing
 */
export function createMockStdout(): MockStdout {
  return new MockStdout();
}

/**
 * Utility functions
 */
export const TestUtils = {
  /**
   * Read and parse JSON file safely with type inference
   */
  async readJsonFile<T = any>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  },

  /**
   * Write JSON file with proper formatting
   */
  async writeJsonFile(filePath: string, data: any, indent = 2): Promise<void> {
    const content = JSON.stringify(data, null, indent);
    await fs.writeFile(filePath, content, 'utf8');
  },

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Create directory recursively
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  },

  /**
   * Generate random string for unique test data
   */
  randomString(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Create test project structure
   */
  async createTestProject(projectDir: string, projectName = 'test-project'): Promise<void> {
    await this.ensureDir(path.join(projectDir, projectName));

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'Test project',
      scripts: {
        test: 'echo "No tests specified"',
      },
    };

    await this.writeJsonFile(path.join(projectDir, projectName, 'package.json'), packageJson);

    await fs.writeFile(
      path.join(projectDir, projectName, 'README.md'),
      `# ${projectName}\n\nTest project for e2e testing.\n`
    );
  },

  /**
   * Assert that command succeeds
   */
  async assertCommandSuccess(
    command: string,
    options: CLIOptions = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const result = await executeCommand(command, options);
      return result;
    } catch (error: any) {
      throw new Error(`Command failed: ${command}. Error: ${error.message}`);
    }
  },

  /**
   * Assert that command fails
   */
  async assertCommandFailure(
    command: string,
    options: CLIOptions = {},
    expectedError?: string
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      await executeCommand(command, options);
      throw new Error(`Command succeeded when expected to fail: ${command}`);
    } catch (error: any) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected error containing "${expectedError}", got: ${error.message}`);
      }
      return { stdout: '', stderr: error.message };
    }
  },
};

/**
 * Jest integration utilities
 */
export const JestUtils = {
  /**
   * Extend Jest timeout for long-running tests
   */
  extendTimeout(ms = 30000): void {
    if (typeof jest !== 'undefined') {
      jest.setTimeout(ms);
    }
  },

  /**
   * Setup Jest test environment with automatic cleanup
   */
  setupJestTest(testName: string): TestEnvironment | null {
    if (typeof jest === 'undefined') {
      return null;
    }

    let env: TestEnvironment | null = null;

    beforeAll(async () => {
      env = await setupTestEnvironment({
        tempDirPrefix: `jest-${testName}-`,
        env: {
          JEST_TEST_NAME: testName,
          JEST_WORKER_ID: process.env.JEST_WORKER_ID || 'unknown',
        },
      });
    });

    afterAll(async () => {
      if (env) {
        await env.cleanup();
      }
    });

    return env;
  },
};

/**
 * Helper function to get current process safely
 */
function getCurrentProcess() {
  if (typeof process !== 'undefined') {
    return process;
  }

  return {
    env: {},
    cwd: () => '.',
    pid: -1,
    platform: 'unknown' as NodeJS.Platform,
    on: () => {},
    memoryUsage: () => ({
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
    }),
  };
}

/**
 * Helper function to check debug flag safely
 */
function isDebugEnabled(): boolean {
  const currentProcess = getCurrentProcess();
  return (
    'env' in currentProcess &&
    currentProcess.env &&
    typeof currentProcess.env === 'object' &&
    'DEBUG_CLI_TESTS' in currentProcess.env &&
    Boolean(currentProcess.env.DEBUG_CLI_TESTS)
  );
}

// Backward compatibility aliases
export const tempDir = createTempDirectory;
export const waitForText = waitForOutput;
export const terminateProcess = killProcess;
export const execAsync = executeCommand;
export const {readJsonFile} = TestUtils;
