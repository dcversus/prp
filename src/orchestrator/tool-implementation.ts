/**
 * ♫ Tool Implementation for @dcversus/prp
 *
 * Concrete implementations of tools that the orchestrator can use
 * to interact with the system and external resources.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolUsage } from './types';

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

const execAsync = promisify(exec);

/**
 * Implements all available tools for orchestrator operations
 */
export class ToolImplementation {
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * File operations tools
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.resolve(this.workingDirectory, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.resolve(this.workingDirectory, filePath);
      const dir = path.dirname(fullPath);

      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(fullPath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${(error as Error).message}`);
    }
  }

  async listFiles(directoryPath: string, pattern?: string): Promise<string[]> {
    try {
      const fullPath = path.resolve(this.workingDirectory, directoryPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      let files: string[] = [];

      for (const entry of entries) {
        const relativePath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(relativePath, pattern);
          files = files.concat(subFiles);
        } else if (entry.isFile()) {
          if (!pattern || entry.name.includes(pattern)) {
            files.push(relativePath);
          }
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to list files in ${directoryPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Git operations tools
   */
  async gitStatus(repositoryPath?: string): Promise<string> {
    try {
      const cwd = repositoryPath ? path.resolve(this.workingDirectory, repositoryPath) : this.workingDirectory;
      const { stdout } = await execAsync('git status --porcelain', { cwd });
      return stdout;
    } catch (error) {
      throw new Error(`Git status failed: ${(error as Error).message}`);
    }
  }

  async gitDiff(repositoryPath?: string, file?: string): Promise<string> {
    try {
      const cwd = repositoryPath ? path.resolve(this.workingDirectory, repositoryPath) : this.workingDirectory;
      const command = file ? `git diff -- ${file}` : 'git diff';
      const { stdout } = await execAsync(command, { cwd });
      return stdout;
    } catch (error) {
      throw new Error(`Git diff failed: ${(error as Error).message}`);
    }
  }

  async gitLog(repositoryPath?: string, limit: number = 10): Promise<string> {
    try {
      const cwd = repositoryPath ? path.resolve(this.workingDirectory, repositoryPath) : this.workingDirectory;
      const { stdout } = await execAsync(`git log --oneline -n ${limit}`, { cwd });
      return stdout;
    } catch (error) {
      throw new Error(`Git log failed: ${(error as Error).message}`);
    }
  }

  async gitAdd(files: string[], repositoryPath?: string): Promise<string> {
    try {
      const cwd = repositoryPath ? path.resolve(this.workingDirectory, repositoryPath) : this.workingDirectory;
      const { stdout } = await execAsync(`git add ${files.join(' ')}`, { cwd });
      return stdout;
    } catch (error) {
      throw new Error(`Git add failed: ${(error as Error).message}`);
    }
  }

  async gitCommit(message: string, repositoryPath?: string): Promise<string> {
    try {
      const cwd = repositoryPath ? path.resolve(this.workingDirectory, repositoryPath) : this.workingDirectory;
      const { stdout } = await execAsync(`git commit -m "${message}"`, { cwd });
      return stdout;
    } catch (error) {
      throw new Error(`Git commit failed: ${(error as Error).message}`);
    }
  }

  async gitPush(repositoryPath?: string): Promise<string> {
    try {
      const cwd = repositoryPath ? path.resolve(this.workingDirectory, repositoryPath) : this.workingDirectory;
      const { stdout } = await execAsync('git push', { cwd });
      return stdout;
    } catch (error) {
      throw new Error(`Git push failed: ${(error as Error).message}`);
    }
  }

  /**
   * Bash execution tools
   */
  async executeCommand(command: string, workingDir?: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const cwd = workingDir ? path.resolve(this.workingDirectory, workingDir) : this.workingDirectory;
      const result = await execAsync(command, {
        cwd,
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB max buffer
      });
      return {
        stdout: result.stdout,
        stderr: result.stderr
      };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || (error as Error).message
      };
    }
  }

  /**
   * HTTP request tools
   */
  async makeRequest(url: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  }> {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        timeout: options.timeout || 30000
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });

      const body = await response.text();

      return {
        status: response.status,
        statusText: response.statusText,
        headers,
        body
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Utility method to execute a tool and create a ToolUsage record
   */
  async executeTool(toolName: string, parameters: unknown): Promise<ToolUsage> {
    const startTime = Date.now();
    const params = parameters as Record<string, unknown>;

    try {
      let result: unknown;

      switch (toolName) {
        case 'readFile':
          result = await this.readFile(params['filePath'] as string);
          break;

        case 'writeFile':
          result = await this.writeFile(params['filePath'] as string, params['content'] as string);
          break;

        case 'listFiles':
          result = await this.listFiles(params['directoryPath'] as string, params['pattern'] as string);
          break;

        case 'gitStatus':
          result = await this.gitStatus(params['repositoryPath'] as string);
          break;

        case 'gitDiff':
          result = await this.gitDiff(params['repositoryPath'] as string, params['file'] as string);
          break;

        case 'gitLog':
          result = await this.gitLog(params['repositoryPath'] as string, params['limit'] as number);
          break;

        case 'gitAdd':
          result = await this.gitAdd(params['files'] as string[], params['repositoryPath'] as string);
          break;

        case 'gitCommit':
          result = await this.gitCommit(params['message'] as string, params['repositoryPath'] as string);
          break;

        case 'gitPush':
          result = await this.gitPush(params['repositoryPath'] as string);
          break;

        case 'executeCommand':
          result = await this.executeCommand(params['command'] as string, params['workingDir'] as string);
          break;

        case 'makeRequest':
          result = await this.makeRequest(params['url'] as string, params['options'] as {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
            headers?: Record<string, string>;
            body?: string;
            timeout?: number;
          });
          break;

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        toolName,
        parameters,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        toolName,
        parameters,
        error: (error as Error).message,
        executionTime
      };
    }
  }

  /**
   * Generic execute method for tool compatibility
   */
  async execute(parameters: unknown): Promise<unknown> {
    // Default implementation that can dispatch based on parameters
    if (typeof parameters === 'object' && parameters !== null) {
      const params = parameters as { toolName?: string; [key: string]: unknown };

      // If toolName is specified, use executeTool
      if (params.toolName) {
        return await this.executeTool(params.toolName, params);
      }

      // Otherwise, try to infer the tool from parameters
      if (params['filePath']) {
        return await this.readFile(params['filePath'] as string);
      }
      if (params['content'] && params['filePath']) {
        return await this.writeFile(params['filePath'] as string, params['content'] as string);
      }
      if (params['directoryPath']) {
        return await this.listFiles(params['directoryPath'] as string, params['pattern'] as string);
      }
      if (params['command']) {
        return await this.executeCommand(params['command'] as string, params['workingDir'] as string);
      }
      if (params['url']) {
        return await this.makeRequest(
          params['url'] as string,
          {
            method: params['method'] as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
            headers: params['headers'] as Record<string, string>,
            body: params['body'] as string,
            timeout: params['timeout'] as number
          }
        );
      }
    }

    throw new Error('Invalid execute parameters or unable to infer tool');
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): string[] {
    return [
      'readFile',
      'writeFile',
      'listFiles',
      'gitStatus',
      'gitDiff',
      'gitLog',
      'gitAdd',
      'gitCommit',
      'gitPush',
      'executeCommand',
      'makeRequest'
    ];
  }

  /**
   * Get tool definition for prompting
   */
  getToolDefinition(toolName: string) : unknown {
    const definitions: Record<string, ToolDefinition> = {
      readFile: {
        name: 'readFile',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to the file to read' }
          },
          required: ['filePath']
        }
      },

      writeFile: {
        name: 'writeFile',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to the file to write' },
            content: { type: 'string', description: 'Content to write to the file' }
          },
          required: ['filePath', 'content']
        }
      },

      listFiles: {
        name: 'listFiles',
        description: 'List files in a directory',
        parameters: {
          type: 'object',
          properties: {
            directoryPath: { type: 'string', description: 'Path to the directory to list' },
            pattern: { type: 'string', description: 'Optional pattern to filter files' }
          },
          required: ['directoryPath']
        }
      },

      gitStatus: {
        name: 'gitStatus',
        description: 'Get git repository status',
        parameters: {
          type: 'object',
          properties: {
            repositoryPath: { type: 'string', description: 'Path to git repository (optional)' }
          }
        }
      },

      executeCommand: {
        name: 'executeCommand',
        description: 'Execute a shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            workingDir: { type: 'string', description: 'Working directory for command (optional)' }
          },
          required: ['command']
        }
      },

      makeRequest: {
        name: 'makeRequest',
        description: 'Make an HTTP request',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to request' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method' },
            headers: { type: 'object', description: 'Request headers' },
            body: { type: 'string', description: 'Request body' },
            timeout: { type: 'number', description: 'Request timeout in milliseconds' }
          },
          required: ['url']
        }
      }
    };

    return definitions[toolName];
  }
}