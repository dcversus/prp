/**
 * ♫ Merge Prompt Utility
 *
 * Critical utility for merging markdown content and resolving file references.
 * Used throughout the PRP system for building comprehensive prompts for agents.
 *
 * Features:
 * - Merges multiple markdown content strings
 * - Resolves .md file references and replaces with actual content
 * - Minifies JSON parameters using TOON (Token-Optimized Notation)
 * - Handles different merge orders for different agent types
 * - Caches resolved content for performance
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
/**
 * TOON - Token Optimized Notation
 * Minifies JSON objects to reduce token usage while maintaining readability
 */
export class TOON {
  /**
   * Minify JSON object using token-optimized notation
   */
  static minify(obj: Record<string, unknown>): string {
    const processValue = (value: unknown): unknown => {
      if (value === null || value === undefined) {
        return value;
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(processValue);
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = processValue(val);
        }
        return result;
      }
      return value;
    };
    const minified = processValue(obj);
    return JSON.stringify(minified)
      .replace(/,\s*}/g, '}') // Remove trailing commas in objects
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      .replace(/:\s*{\s*}/g, ':{}') // Empty objects
      .replace(/:\s*\[\s*\]/g, ':[]'); // Empty arrays
  }
  /**
   * Parse TOON string back to object
   */
  static parse(toonString: string): Record<string, unknown> {
    return JSON.parse(toonString) as Record<string, unknown>;
  }
}
/**
 * Content cache for performance optimization
 */
class ContentCache {
  private readonly cache = new Map<string, { content: string; timestamp: number }>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes
  private getFileKey(filePath: string): string {
    try {
      const stats = require('fs').statSync(filePath);
      return `${filePath}:${stats.mtime.getTime()}`;
    } catch {
      return filePath;
    }
  }
  get(filePath: string): string | null {
    const key = this.getFileKey(filePath);
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return cached.content;
  }
  set(filePath: string, content: string): void {
    const key = this.getFileKey(filePath);
    this.cache.set(key, { content, timestamp: Date.now() });
  }
  clear(): void {
    this.cache.clear();
  }
}
const contentCache = new ContentCache();
/**
 * Merge configuration for different agent types
 */
export interface MergeConfig {
  agent?: {
    includeOrchestratorInstructions?: boolean;
  };
  inspector?: {
    includeScannerJson?: boolean;
    includePreviousContext?: boolean;
  };
  orchestrator?: {
    includeInspectorPayload?: boolean;
    includePRPContext?: boolean;
    includeSharedContext?: boolean;
  };
}
/**
 * Merge options for customizing behavior
 */
export interface MergeOptions {
  cache?: boolean;
  throwOnMissingFile?: boolean;
  maxDepth?: number;
  preserveFormatting?: boolean;
  baseDirectory?: string;
}
/**
 * Default merge options
 */
const DEFAULT_OPTIONS: MergeOptions = {
  cache: true,
  throwOnMissingFile: false,
  maxDepth: 10,
  preserveFormatting: true,
};
/**
 * Main merge prompt utility class
 */
export class MergePrompt {
  /**
   * Merge multiple markdown contents with parameter minification
   */
  static async merge(
    contents: string[],
    params?: Record<string, unknown>,
    options: MergeOptions = {},
  ): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let result = '';
    // Process each content piece
    for (const content of contents) {
      if (!content) {
        continue;
      }
      // Check if content is a file path or actual content
      let processedContent: string;
      if (await this.isFilePath(content)) {
        // It's a file path, read the file content
        try {
          processedContent = await fs.readFile(path.resolve(content), 'utf-8');
        } catch (error) {
          if (opts.throwOnMissingFile) {
            throw new Error(
              `Failed to read file: ${content} - ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          processedContent = `<!-- ERROR: Could not read file ${content}: ${error instanceof Error ? error.message : String(error)} -->`;
        }
      } else {
        // It's actual content
        processedContent = content;
      }
      // Resolve markdown links in the content
      const baseDirectory = opts.baseDirectory || process.cwd();
      const resolvedContent = await this.resolveMarkdownLinks(
        processedContent,
        {
          cache: opts.cache,
          maxDepth: opts.maxDepth,
          throwOnMissingFile: opts.throwOnMissingFile,
        },
        0,
        baseDirectory,
      );
      result += `${resolvedContent  }\n\n`;
    }
    // Add parameters in TOON format if provided
    if (params && Object.keys(params).length > 0) {
      result += '\n--- PARAMETERS ---\n';
      result += '```json\n';
      result += TOON.minify(params);
      result += '\n```\n';
    }
    return result.trim();
  }
  /**
   * Check if a string is likely a file path
   */
  private static async isFilePath(content: string): Promise<boolean> {
    // If it contains newlines, it's definitely content, not a path
    if (content.includes('\n')) {
      return false;
    }
    // If it looks like a path (contains / or \ and has .md extension)
    const normalizedPath = content.replace(/\\/g, '/');
    if (normalizedPath.includes('/') && normalizedPath.endsWith('.md')) {
      try {
        const stats = await fs.stat(path.resolve(content));
        return stats.isFile();
      } catch {
        return false;
      }
    }
    return false;
  }
  /**
   * Build agent prompt with specific merge order
   */
  static async buildAgentPrompt(
    prprcInstructionsPath: string,
    agentInstructionsPaths: string[],
    additionalParams?: Record<string, unknown>,
    options: MergeOptions = {},
  ): Promise<string> {
    const contents = [
      prprcInstructionsPath,
      ...agentInstructionsPaths,
      './src/prompts/agent.md',
      './src/guidelines/EN/agent.md',
    ];
    return this.merge(contents, additionalParams, options);
  }
  /**
   * Build inspector prompt with specific merge order
   */
  static async buildInspectorPrompt(
    prprcInstructionsPath: string,
    inspectorInstructionsPath: string,
    scannerJson?: Record<string, unknown>,
    previousContext?: string,
    additionalParams?: Record<string, unknown>,
    options: MergeOptions = {},
  ): Promise<string> {
    const contents = [
      prprcInstructionsPath,
      inspectorInstructionsPath,
      './src/prompts/inspector.md',
      './src/guidelines/EN/inspector.md',
    ];
    // Add scanner JSON if provided
    if (scannerJson) {
      contents.push(`\n--- SCANNER DATA ---\n\`\`\`json\n${  TOON.minify(scannerJson)  }\n\`\`\`\n`);
    }
    // Add previous context if provided
    if (previousContext) {
      contents.push(`\n--- PREVIOUS CONTEXT ---\n${  previousContext}`);
    }
    return this.merge(contents, additionalParams, options);
  }
  /**
   * Build orchestrator prompt with specific merge order
   */
  static async buildOrchestratorPrompt(
    prprcInstructionsPath: string,
    orchestratorInstructionsPath: string,
    inspectorPayload?: Record<string, unknown>,
    prpContext?: string,
    sharedContext?: string,
    additionalParams?: Record<string, unknown>,
    options: MergeOptions = {},
  ): Promise<string> {
    const contents = [
      prprcInstructionsPath,
      orchestratorInstructionsPath,
      './src/prompts/orchestrator.md',
      './src/guidelines/EN/orchestrator.md',
    ];
    // Add inspector payload if provided
    if (inspectorPayload) {
      contents.push(
        `\n--- INSPECTOR PAYLOAD ---\n\`\`\`json\n${  TOON.minify(inspectorPayload)  }\n\`\`\`\n`,
      );
    }
    // Add PRP context if provided
    if (prpContext) {
      contents.push(`\n--- PRP CONTEXT ---\n${  prpContext}`);
    }
    // Add shared context if provided
    if (sharedContext) {
      contents.push(`\n--- SHARED CONTEXT ---\n${  sharedContext}`);
    }
    return this.merge(contents, additionalParams, options);
  }
  /**
   * Resolve markdown file references in content
   */
  private static async resolveMarkdownLinks(
    content: string,
    options: MergeOptions = {},
    depth = 0,
    basePath: string = process.cwd(),
  ): Promise<string> {
    if (depth > (options.maxDepth || 10)) {
      throw new Error('Maximum recursion depth exceeded while resolving markdown links');
    }
    // Pattern to match markdown links: [text](path.md)
    const linkPattern = /\[([^\]]*)\]\(([^)]+\.md)\)/g;
    let resolved = content;
    const matches = Array.from(content.matchAll(linkPattern));
    for (const match of matches) {
      const [fullMatch, linkText, filePath] = match;
      try {
        // Skip external URLs
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          continue;
        }
        // Resolve relative paths from the base path
        let absolutePath: string;
        if (path.isAbsolute(filePath)) {
          absolutePath = filePath;
        } else {
          absolutePath = path.resolve(basePath, filePath);
        }
        // Try to get from cache first
        let fileContent = '';
        if (options.cache !== false) {
          fileContent = contentCache.get(absolutePath) || '';
        }
        if (!fileContent) {
          // Read file content
          fileContent = await fs.readFile(absolutePath, 'utf-8');
          if (options.cache !== false) {
            contentCache.set(absolutePath, fileContent);
          }
        }
        // Recursively resolve links in the included file, using the directory of the current file as the new base
        const newBasePath = path.dirname(absolutePath);
        const nestedContent = await this.resolveMarkdownLinks(
          fileContent,
          options,
          depth + 1,
          newBasePath,
        );
        // Replace the link with the actual content
        resolved = resolved.replace(fullMatch, nestedContent);
      } catch (error) {
        if (options.throwOnMissingFile) {
          throw new Error(
            `Failed to resolve markdown link: ${filePath} - ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        // If file doesn't exist and we're not throwing, replace with error comment
        const errorMsg = `<!-- ERROR: Could not resolve ${filePath}: ${error instanceof Error ? error.message : String(error)} -->`;
        resolved = resolved.replace(fullMatch, errorMsg);
      }
    }
    return resolved;
  }
  /**
   * Clear content cache
   */
  static clearCache(): void {
    contentCache.clear();
  }
  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: contentCache['cache'].size,
      keys: Array.from(contentCache['cache'].keys()),
    };
  }
}
/**
 * Convenience function for merging prompts
 */
export async function mergePrompt(
  ...args: (string | Record<string, unknown> | MergeOptions)[]
): Promise<string> {
  const lastArg = args[args.length - 1];
  const secondLastArg = args[args.length - 2];
  let contents: string[];
  let params: Record<string, unknown> | undefined;
  let options: MergeOptions = {};
  // Determine if last arguments are params/options
  if (typeof lastArg === 'object' && !Array.isArray(lastArg)) {
    if (typeof secondLastArg === 'object' && !Array.isArray(secondLastArg)) {
      // Both params and options provided
      contents = args.slice(0, -2) as string[];
      params = secondLastArg as Record<string, unknown>;
      options = lastArg as MergeOptions;
    } else {
      // Only params provided
      contents = args.slice(0, -1) as string[];
      params = lastArg as Record<string, unknown>;
    }
  } else {
    // Only contents provided
    contents = args as string[];
  }
  return MergePrompt.merge(contents, params, options);
}
/**
 * Convenience function for building agent prompts
 */
export async function buildAgentPrompt(
  prprcInstructionsPath: string,
  agentConfig: { instructions_path: string }[],
  additionalParams?: Record<string, unknown>,
  options?: MergeOptions,
): Promise<string> {
  const agentPaths = agentConfig.map((agent) => agent.instructions_path);
  return MergePrompt.buildAgentPrompt(prprcInstructionsPath, agentPaths, additionalParams, options);
}
/**
 * Convenience function for building inspector prompts
 */
export async function buildInspectorPrompt(
  prprcInstructionsPath: string,
  inspectorConfig: { instructions_path: string },
  scannerJson?: Record<string, unknown>,
  previousContext?: string,
  additionalParams?: Record<string, unknown>,
  options?: MergeOptions,
): Promise<string> {
  return MergePrompt.buildInspectorPrompt(
    prprcInstructionsPath,
    inspectorConfig.instructions_path,
    scannerJson,
    previousContext,
    additionalParams,
    options,
  );
}
/**
 * Convenience function for building orchestrator prompts
 */
export async function buildOrchestratorPrompt(
  prprcInstructionsPath: string,
  orchestratorConfig: { instructions_path: string },
  inspectorPayload?: Record<string, unknown>,
  prpContext?: string,
  sharedContext?: string,
  additionalParams?: Record<string, unknown>,
  options?: MergeOptions,
): Promise<string> {
  return MergePrompt.buildOrchestratorPrompt(
    prprcInstructionsPath,
    orchestratorConfig.instructions_path,
    inspectorPayload,
    prpContext,
    sharedContext,
    additionalParams,
    options,
  );
}
export default MergePrompt;
