/**
 * Shared Tool System Types
 *
 * Common type definitions for tools that can be used across
 * orchestrator, agents, and other components.
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
}
export type ParameterDefinition = Record<string, ToolParameter>;
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  parameters:
    | ParameterDefinition
    | { type: string; properties?: Record<string, ToolParameter>; required?: string[] };
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    calls: number;
    period: number;
  };
}
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  executionTime?: number;
  usage?: {
    tokens?: number;
    cost?: number;
  };
}
export interface ExecutionStats {
  calls: number;
  successes: number;
  failures: number;
  averageExecutionTime: number;
  lastUsed: Date;
  totalTokensUsed: number;
  totalCost: number;
}
export interface RateLimit {
  calls: number;
  period: number; // in milliseconds
  currentCalls: number;
  resetTime: number;
}
