/**
 * ♫ Tool Registry for @dcversus/prp Orchestrator
 *
 * Registry and management system for orchestrator tools with execution
 * capabilities and security controls.
 */

import { EventEmitter } from 'events';
import { Tool, ToolResult, ParameterDefinition } from './types';
import { createLayerLogger } from '../shared';
import { httpTools } from './tools/http-tools';
import { agentTools } from './tools/agent-tools';
import { tokenTrackingTools } from './tools/token-tracking-tools';

const logger = createLayerLogger('orchestrator');

// Interface for tool execution parameters
interface ToolParameters {
  [key: string]: unknown;
}

/**
 * Tool Registry - Manages tool registration, execution, and security
 */
export class ToolRegistry extends EventEmitter {
  private tools: Map<string, Tool> = new Map();
  private categories: Map<string, Set<string>> = new Map();
  private rateLimits: Map<string, RateLimit> = new Map();
  private executionStats: Map<string, ExecutionStats> = new Map();

  constructor() {
    super();
    this.initializeBuiltinTools();
  }

  /**
   * Initialize the tool registry
   */
  async initialize(): Promise<void> {
    logger.info('ToolRegistry', 'Initializing tool registry');

    // Load tool configurations
    await this.loadToolConfigurations();

    // Validate tools
    await this.validateTools();

    logger.info('ToolRegistry', `Initialized with ${this.tools.size} tools`);
    this.emit('registry:initialized', { toolCount: this.tools.size });
  }

  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }

    // Validate tool
    this.validateTool(tool);

    // Register tool
    this.tools.set(tool.name, tool);

    // Update category mapping
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, new Set());
    }
    this.categories.get(tool.category)!.add(tool.name);

    // Initialize rate limiting
    this.rateLimits.set(tool.name, {
      calls: [],
      lastReset: Date.now()
    });

    // Initialize stats
    this.executionStats.set(tool.name, {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      lastUsed: new Date()
    });

    logger.info('ToolRegistry', `Registered tool: ${tool.name}`, {
      category: tool.category,
      parameters: Object.keys(tool.parameters).length
    });

    this.emit('tool:registered', { tool });
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }

    // Remove from tools map
    this.tools.delete(toolName);

    // Remove from category
    this.categories.get(tool.category)?.delete(toolName);

    // Clean up rate limits and stats
    this.rateLimits.delete(toolName);
    this.executionStats.delete(toolName);

    logger.info('ToolRegistry', `Unregistered tool: ${toolName}`);
    this.emit('tool:unregistered', { toolName });

    return true;
  }

  /**
   * Get a tool by name
   */
  getTool(toolName: string): Tool | null {
    return this.tools.get(toolName) || null;
  }

  /**
   * Get all tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): Tool[] {
    const toolNames = this.categories.get(category) || new Set();
    return Array.from(toolNames).map(name => this.tools.get(name)!).filter(Boolean);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName: string, parameters: unknown): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    if (!tool.enabled) {
      throw new Error(`Tool '${toolName}' is disabled`);
    }

    // Check rate limiting
    await this.checkRateLimit(tool);

    // Validate parameters
    const validationResult = this.validateParameters(tool, parameters);
    if (!validationResult.valid) {
      throw new Error(`Invalid parameters for tool '${toolName}': ${validationResult.errors.join(', ')}`);
    }

    const startTime = Date.now();
    let result: ToolResult;

    try {
      logger.info('ToolRegistry', `Executing tool: ${toolName}`, {
        parameters: Object.keys(parameters as Record<string, unknown>)
      });

      // Execute the tool
      const toolResult = await Promise.race([
        tool.execute(parameters),
        this.createTimeoutPromise(30000)
      ]);

      result = {
        success: true,
        data: toolResult,
        executionTime: Date.now() - startTime
      };

      // Update stats
      this.updateExecutionStats(toolName, result, true);

      logger.info('ToolRegistry', `Tool executed successfully: ${toolName}`, {
        executionTime: result.executionTime
      });

      this.emit('tool:executed', { toolName, result });

    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };

      // Update stats
      this.updateExecutionStats(toolName, result, false);

      logger.error('ToolRegistry', `Tool execution failed: ${toolName}`, error instanceof Error ? error : new Error(String(error)));

      this.emit('tool:execution_failed', { toolName, error, result });
    }

    return result;
  }

  /**
   * Enable or disable a tool
   */
  setToolEnabled(toolName: string, enabled: boolean): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }

    tool.enabled = enabled;

    logger.info('ToolRegistry', `${enabled ? 'Enabled' : 'Disabled'} tool: ${toolName}`);
    this.emit('tool:status_changed', { toolName, enabled });

    return true;
  }

  /**
   * Get tool execution statistics
   */
  getToolStats(toolName?: string) : unknown {
    if (toolName) {
      return this.executionStats.get(toolName) || null;
    }

    const stats: Record<string, unknown> = {};
    for (const [name, stat] of this.executionStats) {
      stats[name] = stat;
    }
    return stats;
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    for (const stats of this.executionStats.values()) {
      stats.totalCalls = 0;
      stats.successfulCalls = 0;
      stats.failedCalls = 0;
      stats.averageExecutionTime = 0;
      stats.totalExecutionTime = 0;
      stats.lastUsed = new Date();
    }

    logger.info('ToolRegistry', 'Cleared all execution statistics');
    this.emit('stats:cleared');
  }

  /**
   * Initialize built-in tools
   */
  private initializeBuiltinTools(): void {
    // File operations
    this.registerTool({
      id: 'read_file',
      name: 'read_file',
      description: 'Read contents of a file',
      category: 'file',
      enabled: true,
      parameters: {
        filepath: {
          type: 'string',
          description: 'Path to the file to read',
          required: true
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf8)',
          required: false
        }
      },
      execute: async (params: ToolParameters) => {
        const { readFileSync } = require('fs');
        const content = readFileSync(params.filepath, params.encoding || 'utf8');
        return {
          success: true,
          data: { content, size: content.length },
          executionTime: 0
        };
      }
    });

    this.registerTool({
      id: 'write_file',
      name: 'write_file',
      description: 'Write content to a file',
      category: 'file',
      enabled: true,
      parameters: {
        filepath: {
          type: 'string',
          description: 'Path to the file to write',
          required: true
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
          required: true
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf8)',
          required: false
        }
      },
      execute: async (params: ToolParameters) => {
        const { writeFileSync } = require('fs');
        writeFileSync(params.filepath, params.content, params.encoding || 'utf8');
        return {
          success: true,
          data: { bytesWritten: params.content.length },
          executionTime: 0
        };
      }
    });

    this.registerTool({
      id: 'list_directory',
      name: 'list_directory',
      description: 'List contents of a directory',
      category: 'file',
      enabled: true,
      parameters: {
        path: {
          type: 'string',
          description: 'Directory path to list',
          required: true
        },
        recursive: {
          type: 'boolean',
          description: 'List recursively',
          required: false
        }
      },
      execute: async (params: ToolParameters) => {
        const { readdirSync, statSync } = require('fs');
        const { join } = require('path');

        const listDirectory = (dir: string, recursive: boolean = false): unknown[] => {
          const items = readdirSync(dir);
          const result = [];

          for (const item of items) {
            const fullPath = join(dir, item);
            const stats = statSync(fullPath);

            const entry = {
              name: item,
              path: fullPath,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime
            };

            result.push(entry);

            if (recursive && stats.isDirectory()) {
              result.push(...listDirectory(fullPath, true));
            }
          }

          return result;
        };

        return {
          success: true,
          data: { items: listDirectory(params.path, params.recursive) },
          executionTime: 0
        };
      }
    });

    // System operations
    this.registerTool({
      id: 'execute_command',
      name: 'execute_command',
      description: 'Execute a shell command',
      category: 'system',
      enabled: true,
      parameters: {
        command: {
          type: 'string',
          description: 'Command to execute',
          required: true
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
          required: false
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          required: false
        }
      },
      execute: async (params: ToolParameters) => {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
          const child = spawn(params.command, {
            shell: true,
            cwd: params.cwd || process.cwd(),
            stdio: 'pipe'
          });

          let stdout = '';
          let stderr = '';

          child.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          child.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString();
          });

          const timer = setTimeout(() => {
            child.kill();
            reject(new Error('Command execution timeout'));
          }, params.timeout || 30000);

          child.on('close', (code: number | null) => {
            clearTimeout(timer);
            resolve({
              success: true,
              data: {
                exitCode: code,
                stdout,
                stderr,
                success: code === 0
              },
              executionTime: 0
            });
          });

          child.on('error', (error: Error) => {
            clearTimeout(timer);
            reject(error);
          });
        });
      }
    });

    // Git operations
    this.registerTool({
      id: 'git_status',
      name: 'git_status',
      description: 'Get git repository status',
      category: 'git',
      enabled: true,
      parameters: {
        path: {
          type: 'string',
          description: 'Git repository path',
          required: false
        }
      },
      execute: async (params: ToolParameters) => {
        const { execSync } = require('child_process');
        const status = execSync('git status --porcelain', {
          cwd: params.path || '.',
          encoding: 'utf8'
        });
        return {
          success: true,
          data: { status: status.trim() },
          executionTime: 0
        };
      }
    });

    // Network operations
    this.registerTool({
      id: 'http_request',
      name: 'http_request',
      description: 'Make HTTP request',
      category: 'network',
      enabled: true,
      parameters: {
        url: {
          type: 'string',
          description: 'URL to request',
          required: true
        },
        method: {
          type: 'string',
          description: 'HTTP method',
          required: false,
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
        },
        headers: {
          type: 'object',
          description: 'HTTP headers',
          required: false
        },
        body: {
          type: 'string',
          description: 'Request body',
          required: false
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds',
          required: false
        }
      },
      execute: async (params: ToolParameters) => {
        // Simple HTTP request implementation
        // In production, would use a proper HTTP client
        const response = await fetch(params.url, {
          method: params.method || 'GET',
          headers: params.headers || {},
          body: params.body,
          signal: AbortSignal.timeout(params.timeout || 30000)
        });

        const text = await response.text();

        return {
          success: true,
          data: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: text,
            success: response.ok
          },
          executionTime: 0
        };
      }
    });

    // Register additional HTTP/network tools (excluding duplicates)
    httpTools.forEach(tool => {
      if (!this.tools.has(tool.name)) {
        this.registerTool(tool);
      }
    });

    // Register agent management tools (excluding duplicates)
    agentTools.forEach(tool => {
      if (!this.tools.has(tool.name)) {
        this.registerTool(tool);
      }
    });

    // Register token tracking tools (excluding duplicates)
    tokenTrackingTools.forEach(tool => {
      if (!this.tools.has(tool.name)) {
        this.registerTool(tool);
      }
    });

    logger.info('ToolRegistry', `Registered ${this.tools.size} tools total`);
  }

  /**
   * Load tool configurations from external sources
   */
  private async loadToolConfigurations(): Promise<void> {
    // This would load tool configurations from config files
    // For now, using built-in tools only
  }

  /**
   * Validate all registered tools
   */
  private async validateTools(): Promise<void> {
    for (const tool of this.tools.values()) {
      this.validateTool(tool);
    }
  }

  /**
   * Validate a single tool
   */
  private validateTool(tool: Tool): void {
    if (!tool.name || tool.name.trim().length === 0) {
      throw new Error('Tool must have a valid name');
    }

    if (!tool.description || tool.description.trim().length === 0) {
      throw new Error('Tool must have a valid description');
    }

    if (!tool.category || tool.category.trim().length === 0) {
      throw new Error('Tool must have a valid category');
    }

    if (typeof tool.execute !== 'function') {
      throw new Error('Tool must have a valid execute function');
    }
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(tool: Tool, parameters: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!parameters || typeof parameters !== 'object') {
      errors.push('Parameters must be an object');
      return { valid: false, errors };
    }

    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.required && !(paramName in (parameters as Record<string, unknown>))) {
        errors.push(`Required parameter '${paramName}' is missing`);
      }

      if (paramName in (parameters as Record<string, unknown>)) {
        const value = (parameters as Record<string, unknown>)[paramName];
        const typeValidation = this.validateParameterType(value, paramDef);
        if (!typeValidation.valid) {
          errors.push(`Parameter '${paramName}': ${typeValidation.error}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: unknown, paramDef: ParameterDefinition): { valid: boolean; error?: string } {
    const expectedType = paramDef.type;

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: `Expected string, got ${typeof value}` };
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return { valid: false, error: `Expected number, got ${typeof value}` };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: `Expected boolean, got ${typeof value}` };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: `Expected array, got ${typeof value}` };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { valid: false, error: `Expected object, got ${typeof value}` };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Check rate limiting for a tool
   */
  private async checkRateLimit(_tool: Tool): Promise<void> {
    // This would implement actual rate limiting
    // For now, allowing all calls
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(toolName: string, result: ToolResult, success: boolean): void {
    const stats = this.executionStats.get(toolName);
    if (!stats) {
      return;
    }

    stats.totalCalls++;
    stats.lastUsed = new Date();

    if (success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }

    stats.totalExecutionTime += result.executionTime;
    stats.averageExecutionTime = stats.totalExecutionTime / stats.totalCalls;
  }
}

interface RateLimit {
  calls: number[];
  lastReset: number;
}

interface ExecutionStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  lastUsed: Date;
}