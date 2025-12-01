/**
 * ♫ Shared Tool Registry for @dcversus/prp
 *
 * Generic registry and management system for tools with execution
 * capabilities and security controls. Can be used by orchestrator,
 * agents, and other components.
 */
import { EventEmitter } from 'events';

import { createLayerLogger } from '../logger.js';

import type { Tool, ToolResult, ExecutionStats, RateLimit } from './types';

const logger = createLayerLogger('shared');
// Interface for tool execution parameters
type ToolParameters = Record<string, unknown>;
/**
 * Generic Tool Registry - Manages tool registration, execution, and security
 */
export class ToolRegistry extends EventEmitter {
  private readonly tools = new Map<string, Tool>();
  private readonly categories = new Map<string, Set<string>>();
  private readonly rateLimits = new Map<string, RateLimit>();
  private readonly executionStats = new Map<string, ExecutionStats>();
  constructor() {
    super();
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
    this.emit('initialized', { toolCount: this.tools.size });
  }
  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    logger.debug('ToolRegistry', `Registering tool: ${tool.id}`);
    // Validate tool structure
    this.validateTool(tool);
    // Store tool
    this.tools.set(tool.id, tool);
    // Register category
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, new Set());
    }
    this.categories.get(tool.category)!.add(tool.id);
    // Initialize rate limiting
    if (tool.rateLimit) {
      this.rateLimits.set(tool.id, {
        calls: tool.rateLimit.calls,
        period: tool.rateLimit.period,
        currentCalls: 0,
        resetTime: Date.now() + tool.rateLimit.period,
      });
    }
    // Initialize execution stats
    this.executionStats.set(tool.id, {
      calls: 0,
      successes: 0,
      failures: 0,
      averageExecutionTime: 0,
      lastUsed: new Date(),
      totalTokensUsed: 0,
      totalCost: 0,
    });
    logger.info('ToolRegistry', `Tool registered: ${tool.id} in category ${tool.category}`);
    this.emit('tool-registered', { toolId: tool.id, category: tool.category });
  }
  /**
   * Get a tool by ID
   */
  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
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
    const toolIds = this.categories.get(category);
    if (!toolIds) {
      return [];
    }
    return Array.from(toolIds)
      .map((id) => this.tools.get(id))
      .filter((tool) => tool !== undefined);
  }
  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }
  /**
   * Execute a tool with parameters
   */
  async executeTool(toolId: string, parameters: ToolParameters): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      const error = `Tool not found: ${toolId}`;
      logger.error('ToolRegistry', error);
      return { success: false, error };
    }
    if (!tool.enabled) {
      const error = `Tool disabled: ${toolId}`;
      logger.warn('ToolRegistry', error);
      return { success: false, error };
    }
    // Check rate limiting
    if (!this.checkRateLimit(toolId)) {
      const error = `Rate limit exceeded for tool: ${toolId}`;
      logger.warn('ToolRegistry', error);
      return { success: false, error };
    }
    // Validate parameters
    const validationError = this.validateParameters(tool, parameters);
    if (validationError) {
      logger.warn('ToolRegistry', `Parameter validation failed for ${toolId}: ${validationError}`);
      return { success: false, error: validationError };
    }
    const startTime = Date.now();
    const stats = this.executionStats.get(toolId)!;
    try {
      logger.debug('ToolRegistry', `Executing tool: ${toolId}`);
      // Update stats
      stats.calls++;
      stats.lastUsed = new Date();
      // Execute tool with timeout
      const result = await this.executeWithTimeout(tool, parameters, tool.timeout || 30000);
      const executionTime = Date.now() - startTime;
      stats.averageExecutionTime =
        (stats.averageExecutionTime * (stats.calls - 1) + executionTime) / stats.calls;
      stats.successes++;
      if (result.success) {
        stats.totalTokensUsed += result.usage?.tokens || 0;
        stats.totalCost += result.usage?.cost || 0;
      } else {
        stats.failures++;
      }
      logger.info(
        'ToolRegistry',
        `Tool executed: ${toolId} in ${executionTime}ms - Success: ${result.success}`,
      );
      this.emit('tool-executed', { toolId, result, executionTime });
      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      stats.averageExecutionTime =
        (stats.averageExecutionTime * (stats.calls - 1) + executionTime) / stats.calls;
      stats.failures++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ToolRegistry', `Tool execution failed: ${toolId} - ${errorMessage}`);
      this.emit('tool-execution-failed', { toolId, error: errorMessage, executionTime });
      return {
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }
  /**
   * Enable or disable a tool
   */
  setToolEnabled(toolId: string, enabled: boolean): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }
    tool.enabled = enabled;
    logger.info('ToolRegistry', `Tool ${toolId} ${enabled ? 'enabled' : 'disabled'}`);
    this.emit('tool-status-changed', { toolId, enabled });
    return true;
  }
  /**
   * Get execution statistics for a tool
   */
  getExecutionStats(toolId: string): ExecutionStats | undefined {
    return this.executionStats.get(toolId);
  }
  /**
   * Get execution statistics for all tools
   */
  getAllExecutionStats(): Record<string, ExecutionStats> {
    const result: Record<string, ExecutionStats> = {};
    for (const [toolId, stats] of this.executionStats.entries()) {
      result[toolId] = { ...stats };
    }
    return result;
  }
  /**
   * Validate tool structure
   */
  private validateTool(tool: Tool): void {
    const requiredFields = [
      'id',
      'name',
      'description',
      'category',
      'enabled',
      'parameters',
      'execute',
    ];
    for (const field of requiredFields) {
      if (!(field in tool)) {
        throw new Error(`Tool missing required field: ${field}`);
      }
    }
    if (typeof tool.execute !== 'function') {
      throw new Error('Tool execute must be a function');
    }
    // Validate tool ID uniqueness
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool ID already exists: ${tool.id}`);
    }
  }
  /**
   * Validate parameters against tool definition
   */
  private validateParameters(tool: Tool, parameters: ToolParameters): string | null {
    const paramDefs = tool.parameters;
    // Handle both object-style and JSON schema style parameters
    if ('type' in paramDefs && paramDefs.type === 'object') {
      const required = paramDefs.required || [];
      const properties = paramDefs.properties || {};
      // Check required parameters
      for (const requiredParam of required) {
        if (!(requiredParam in parameters)) {
          return `Missing required parameter: ${requiredParam}`;
        }
      }
      // Check parameter types
      for (const [paramName, paramValue] of Object.entries(parameters)) {
        const paramDef = properties[paramName];
        if (paramDef && !this.validateParameterType(paramValue, paramDef)) {
          return `Invalid type for parameter ${paramName}: expected ${paramDef.type}`;
        }
      }
    } else {
      // Handle simple parameter definition format
      if (Array.isArray(paramDefs)) {
        for (const paramDef of paramDefs) {
          // Handle array format
        }
      } else {
        for (const [paramName, paramDef] of Object.entries(paramDefs)) {
          if (paramDef.required && !(paramName in parameters)) {
            return `Missing required parameter: ${paramName}`;
          }
          if (
            paramName in parameters &&
            !this.validateParameterType(parameters[paramName], paramDef)
          ) {
            return `Invalid type for parameter ${paramName}: expected ${paramDef.type}`;
          }
        }
      }
    }
    return null;
  }
  /**
   * Validate individual parameter type
   */
  private validateParameterType(
    value: unknown,
    paramDef: { type: string; [key: string]: unknown },
  ): boolean {
    if (!('type' in paramDef)) {
      return true;
    }
    switch (paramDef.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, assume valid
    }
  }
  /**
   * Check rate limiting for tool
   */
  private checkRateLimit(toolId: string): boolean {
    const rateLimit = this.rateLimits.get(toolId);
    if (!rateLimit) {
      return true;
    }
    const now = Date.now();
    // Reset if period has passed
    if (now >= rateLimit.resetTime) {
      rateLimit.currentCalls = 0;
      rateLimit.resetTime = now + rateLimit.period;
    }
    // Check if under limit
    if (rateLimit.currentCalls < rateLimit.calls) {
      rateLimit.currentCalls++;
      return true;
    }
    return false;
  }
  /**
   * Execute tool with timeout
   */
  private async executeWithTimeout(
    tool: Tool,
    parameters: ToolParameters,
    timeout: number,
  ): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timeout: ${tool.id} after ${timeout}ms`));
      }, timeout);
      tool
        .execute(parameters)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
  /**
   * Load tool configurations from files
   */
  private async loadToolConfigurations(): Promise<void> {
    // This can be extended to load tools from configuration files
    logger.debug('ToolRegistry', 'Loading tool configurations');
  }
  /**
   * Validate all registered tools
   */
  private async validateTools(): Promise<void> {
    logger.debug('ToolRegistry', 'Validating registered tools');
    for (const [toolId, tool] of this.tools.entries()) {
      try {
        this.validateTool(tool);
      } catch (error) {
        logger.error('ToolRegistry', `Tool validation failed: ${toolId} - ${error}`);
        throw error;
      }
    }
  }
}
/**
 * Create a default tool registry instance
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
