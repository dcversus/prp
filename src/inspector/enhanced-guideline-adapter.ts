/**
 * ♫ Enhanced Guideline Adapter for @dcversus/prp Inspector
 *
 * Loads and adapts guidelines from /src/guidelines/XX/ directory structure
 * with dynamic loading, caching, and signal matching per PRP-000-agents05 requirements.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

import { createLayerLogger } from '../shared';

import type { Signal } from '../shared/types';

const logger = createLayerLogger('inspector');
/**
 * Guideline definition loaded from /src/guidelines/XX/inspector.md
 */
export interface InspectorGuideline {
  id: string;
  category: string;
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: Date;
  lastModified: Date;
  enabled: boolean;
  signalPatterns: Array<{
    pattern: string;
    description: string;
    priority: number;
  }>;
  content: string; // Raw content from inspector.md
  schema?: Record<string, unknown>; // Optional JSON schema from inspector.py
  tokenLimits: {
    maxInput: number;
    maxOutput: number;
  };
  tools: string[];
  dependencies: string[];
  tags: string[];
}
/**
 * Guideline loading result
 */
export interface GuidelineLoadResult {
  loaded: number;
  failed: number;
  errors: Array<{
    guidelineId: string;
    error: string;
    path: string;
  }>;
}
/**
 * Enhanced Guideline Adapter - PRP-000-agents05 Implementation
 */
export class EnhancedGuidelineAdapter {
  private readonly guidelines = new Map<string, InspectorGuideline>();
  private readonly signalToGuidelineMap = new Map<string, string[]>();
  private readonly guidelinesPath: string;
  private readonly lastScanTime: Date = new Date(0);
  private readonly metrics = {
    totalGuidelines: 0,
    loadedGuidelines: 0,
    failedLoads: 0,
    cacheHits: 0,
    lastScanTime: new Date(),
  };
  constructor(guidelinesPath?: string) {
    // Default to /src/guidelines/XX/ directory structure
    this.guidelinesPath = guidelinesPath ?? resolve(__dirname, '../guidelines');

    logger.info('EnhancedGuidelineAdapter', 'Initialized', {
      guidelinesPath: this.guidelinesPath,
    });
  }
  /**
   * Load all guidelines from /src/guidelines/XX/ directories
   */
  async loadGuidelines(): Promise<GuidelineLoadResult> {
    const startTime = Date.now();
    const result: GuidelineLoadResult = {
      loaded: 0,
      failed: 0,
      errors: [],
    };
    try {
      if (!existsSync(this.guidelinesPath)) {
        logger.warn('EnhancedGuidelineAdapter', 'Guidelines directory not found', {
          path: this.guidelinesPath,
        });
        return result;
      }
      // Scan for category directories (XX patterns)
      const categories = readdirSync(this.guidelinesPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => /^[A-Z]{2}$/.test(name)); // Match XX pattern
      logger.info('EnhancedGuidelineAdapter', 'Found guideline categories', {
        categories,
        count: categories.length,
      });
      // Load guidelines from each category directory
      for (const category of categories) {
        const categoryPath = join(this.guidelinesPath, category);
        const categoryResult = await this.loadGuidelinesFromCategory(category, categoryPath);
        result.loaded += categoryResult.loaded;
        result.failed += categoryResult.failed;
        result.errors.push(...categoryResult.errors);
      }
      // Build signal-to-guideline mapping
      this.buildSignalMapping();
      // Update metrics
      this.metrics.totalGuidelines = result.loaded + result.failed;
      this.metrics.loadedGuidelines = result.loaded;
      this.metrics.failedLoads = result.failed;
      this.metrics.lastScanTime = new Date();
      const duration = Date.now() - startTime;
      logger.info('EnhancedGuidelineAdapter', 'Guideline loading completed', {
        loaded: result.loaded,
        failed: result.failed,
        duration: `${duration}ms`,
        totalCategories: categories.length,
      });
      return result;
    } catch (error) {
      logger.error(
        'EnhancedGuidelineAdapter',
        'Failed to load guidelines',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Load guidelines from a specific category directory
   */
  private async loadGuidelinesFromCategory(
    category: string,
    categoryPath: string,
  ): Promise<GuidelineLoadResult> {
    const result: GuidelineLoadResult = {
      loaded: 0,
      failed: 0,
      errors: [],
    };
    try {
      const entries = readdirSync(categoryPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const guidelinePath = join(categoryPath, entry.name);
        // Look for inspector.md file
        const inspectorMdPath = join(guidelinePath, 'inspector.md');
        if (!existsSync(inspectorMdPath)) {
          continue; // Skip directories without inspector.md
        }
        try {
          const guideline = await this.loadGuidelineFromPath(entry.name, category, guidelinePath);
          if (guideline) {
            this.guidelines.set(guideline.id, guideline);
            result.loaded++;
            logger.debug('EnhancedGuidelineAdapter', `Loaded guideline: ${guideline.id}`, {
              category,
              signalPatterns: guideline.signalPatterns.length,
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            guidelineId: entry.name,
            error: error instanceof Error ? error.message : String(error),
            path: guidelinePath,
          });
          logger.warn('EnhancedGuidelineAdapter', `Failed to load guideline: ${entry.name}`, {
            category,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return result;
    } catch (error) {
      logger.error(
        'EnhancedGuidelineAdapter',
        `Failed to load category: ${category}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Load a single guideline from its directory path
   */
  private loadGuidelineFromPath(
    guidelineId: string,
    category: string,
    guidelinePath: string,
  ): Promise<InspectorGuideline | null> {
    // Load inspector.md content
    const inspectorMdPath = join(guidelinePath, 'inspector.md');
    const inspectorContent = readFileSync(inspectorMdPath, 'utf-8');
    // Load optional inspector.py schema
    let schema = null;
    const inspectorPyPath = join(guidelinePath, 'inspector.py');
    if (existsSync(inspectorPyPath)) {
      try {
        const pyContent = readFileSync(inspectorPyPath, 'utf-8');
        schema = this.parsePythonSchema(pyContent);
      } catch (error) {
        logger.warn(
          'EnhancedGuidelineAdapter',
          `Failed to parse schema from inspector.py: ${guidelineId}`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
    // Parse metadata from markdown content
    const metadata = this.parseMarkdownMetadata(inspectorContent);
    // Parse signal patterns from content
    const signalPatterns = this.parseSignalPatterns(inspectorContent);
    // Create guideline object
    const guideline: InspectorGuideline = {
      id: guidelineId,
      category,
      name: (metadata.name as string) || guidelineId,
      description: (metadata.description as string) || '',
      version: (metadata.version as string) || '1.0.0',
      author: (metadata.author as string) || 'system',
      createdAt: (metadata.createdAt as Date) || new Date(),
      lastModified: this.getFileModificationTime(inspectorMdPath),
      enabled: (metadata.enabled as boolean) !== false,
      signalPatterns,
      content: inspectorContent,
      schema: schema as Record<string, unknown> | undefined,
      tokenLimits: {
        maxInput: Number(metadata.maxInputTokens) || 35000,
        maxOutput: Number(metadata.maxOutputTokens) || 40000,
      },
      tools: (metadata.tools as string[]) || [],
      dependencies: (metadata.dependencies as string[]) || [],
      tags: (metadata.tags as string[]) || [],
    };
    return Promise.resolve(guideline);
  }
  /**
   * Parse metadata from markdown frontmatter or content
   */
  private parseMarkdownMetadata(content: string): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    // Try to parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        // Simple YAML parsing (basic implementation)
        const yamlContent = frontmatterMatch[1];
        if (!yamlContent) {
          return metadata;
        }
        const lines = yamlContent.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            if (value && key) {
              metadata[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
            }
          }
        }
      } catch (error) {
        logger.warn('EnhancedGuidelineAdapter', 'Failed to parse YAML frontmatter', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    // Extract metadata from content if no frontmatter
    if (Object.keys(metadata).length === 0) {
      // Look for metadata patterns in content
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch?.[1]) {
        metadata.name = titleMatch[1].trim();
      }
      const descriptionMatch = content.match(/(?:Description|Summary):\s*(.+)$/im);
      if (descriptionMatch?.[1]) {
        metadata.description = descriptionMatch[1].trim();
      }
      // Look for token limits
      const tokenMatch = content.match(/(?:Max|Token)\s*(?:Limit|Limit):\s*(\d+)/im);
      if (tokenMatch?.[1]) {
        metadata.maxInputTokens = parseInt(tokenMatch[1], 10);
      }
    }
    return metadata;
  }
  /**
   * Parse signal patterns from guideline content
   */
  private parseSignalPatterns(content: string): Array<{
    pattern: string;
    description: string;
    priority: number;
  }> {
    const patterns: Array<{
      pattern: string;
      description: string;
      priority: number;
    }> = [];
    // Look for signal pattern specifications
    const signalPatternRegex = /(?:Signal\s*(?:Pattern|Type)s?):\s*([^\n]+)/gi;
    let match;
    while ((match = signalPatternRegex.exec(content)) !== null) {
      if (!match[1]) {
        continue;
      }
      const patternText = match[1].trim();
      const signalList = patternText.split(/[,;]/).map((s) => s.trim());
      for (const signal of signalList) {
        if (signal) {
          patterns.push({
            pattern: signal,
            description: `Signal pattern: ${signal}`,
            priority: 5,
          });
        }
      }
    }
    // Look for individual signal mentions
    const individualSignals = content.match(/\b[A-Z][a-z]+\b/g) || [];
    for (const signal of individualSignals) {
      if (!patterns.some((p) => p.pattern === signal)) {
        patterns.push({
          pattern: signal,
          description: `Mentioned signal: ${signal}`,
          priority: 3,
        });
      }
    }
    // Default to common signals if no patterns found
    if (patterns.length === 0) {
      const commonSignals = ['At', 'Bb', 'Ur', 'Co', 'Gt', 'Vd', 'aa', 'bb', 'cc', 'dd'];
      for (const signal of commonSignals) {
        patterns.push({
          pattern: signal,
          description: `Common signal: ${signal}`,
          priority: 1,
        });
      }
    }
    return patterns;
  }
  /**
   * Parse Python schema file (basic implementation)
   */
  private parsePythonSchema(content: string): unknown {
    try {
      // Look for schema definition patterns
      const schemaMatch = content.match(/schema\s*=\s*({[\s\S]*?})/);
      if (schemaMatch?.[1]) {
        // Simple JSON-like parsing (very basic)
        const schemaText = schemaMatch[1];
        return JSON.parse(schemaText.replace(/'/g, '"'));
      }
      // Look for class definitions that might be schema
      const classMatch = content.match(/class\s+(\w+)[\s\S]*?def\s+__init__/);
      if (classMatch) {
        return {
          type: 'object',
          className: classMatch[1],
          description: `Schema class: ${classMatch[1]}`,
        };
      }
      return null;
    } catch (error) {
      logger.warn('EnhancedGuidelineAdapter', 'Failed to parse Python schema', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
  /**
   * Get file modification time
   */
  private getFileModificationTime(filePath: string): Date {
    try {
      const stats = statSync(filePath);
      return stats.mtime;
    } catch {
      return new Date();
    }
  }
  /**
   * Build signal-to-guideline mapping for quick lookup
   */
  private buildSignalMapping(): void {
    this.signalToGuidelineMap.clear();
    for (const [guidelineId, guideline] of this.guidelines) {
      if (!guideline.enabled) {
        continue;
      }
      for (const pattern of guideline.signalPatterns) {
        const normalizedPattern = (pattern.pattern || pattern).toString().toLowerCase().trim();
        if (!this.signalToGuidelineMap.has(normalizedPattern)) {
          this.signalToGuidelineMap.set(normalizedPattern, []);
        }
        const guidelines = this.signalToGuidelineMap.get(normalizedPattern);
        if (guidelines !== undefined) {
          guidelines.push(guidelineId);
        }
      }
    }
    logger.info('EnhancedGuidelineAdapter', 'Built signal mapping', {
      totalSignals: this.signalToGuidelineMap.size,
      totalMappings: Array.from(this.signalToGuidelineMap.values()).reduce(
        (sum, guidelines) => sum + guidelines.length,
        0,
      ),
    });
  }
  /**
   * Get appropriate guideline for a signal
   */
  getGuidelineForSignal(signal: Signal): string | null {
    const signalType = signal.type.toLowerCase().trim();
    // Check exact matches first
    const exactMatches = this.signalToGuidelineMap.get(signalType);
    if (exactMatches && exactMatches.length > 0) {
      // Return the highest priority guideline
      const sortedGuidelines = exactMatches
        .map((id) => this.guidelines.get(id))
        .filter(Boolean)
        .sort((a, b) => {
          const aPriority =
            a?.signalPatterns.find((p) => p.pattern.toLowerCase() === signalType)?.priority || 0;
          const bPriority =
            b?.signalPatterns.find((p) => p.pattern.toLowerCase() === signalType)?.priority || 0;
          return bPriority - aPriority;
        });
      if (sortedGuidelines.length > 0) {
        const guideline = sortedGuidelines[0];
        if (guideline) {
          this.metrics.cacheHits++;
          logger.debug('EnhancedGuidelineAdapter', `Found exact match guideline: ${guideline.id}`, {
            signalType,
            guidelineId: guideline.id,
            priority: guideline.signalPatterns.find((p) => p.pattern.toLowerCase() === signalType)
              ?.priority,
          });
          return guideline.content;
        }
      }
    }
    // Check partial matches
    for (const [pattern, guidelineIds] of this.signalToGuidelineMap) {
      if (signalType.includes(pattern) || pattern.includes(signalType)) {
        const sortedGuidelines = guidelineIds
          .map((id) => this.guidelines.get(id))
          .filter(Boolean)
          .sort((a, b) => {
            const aPriority =
              a?.signalPatterns.find((p) => p.pattern.toLowerCase() === pattern)?.priority || 0;
            const bPriority =
              b?.signalPatterns.find((p) => p.pattern.toLowerCase() === pattern)?.priority || 0;
            return bPriority - aPriority;
          });
        if (sortedGuidelines.length > 0) {
          const guideline = sortedGuidelines[0];
          if (guideline) {
            logger.debug(
              'EnhancedGuidelineAdapter',
              `Found partial match guideline: ${guideline.id}`,
              {
                signalType,
                pattern,
                guidelineId: guideline.id,
              },
            );
            return guideline.content;
          }
        }
      }
    }
    // Return default guideline if no match found
    const defaultGuideline = this.getDefaultGuideline();
    if (defaultGuideline) {
      logger.debug('EnhancedGuidelineAdapter', 'Using default guideline', {
        signalType,
      });
      return defaultGuideline;
    }
    logger.warn('EnhancedGuidelineAdapter', `No guideline found for signal: ${signalType}`, {
      signalType,
      availablePatterns: Array.from(this.signalToGuidelineMap.keys()),
    });
    return null;
  }
  /**
   * Get default guideline for fallback
   */
  private getDefaultGuideline(): string {
    return `# Default Inspector Guideline
You are an expert Inspector analyzing signals for the PRP (Product Requirement Prompts) workflow system.
## TASK
Analyze the provided signal and generate comprehensive classification and actionable recommendations.
## ANALYSIS FOCUS
1. **Signal Classification**: Categorize the signal type and determine appropriate response
2. **Priority Assessment**: Evaluate urgency and importance (1-10 scale)
3. **Agent Assignment**: Determine which agent role should handle this signal
4. **Risk Assessment**: Identify potential risks and escalation needs
5. **Action Recommendations**: Provide specific, actionable recommendations
## OUTPUT FORMAT
Respond with JSON containing:
- classification (category, subcategory, priority, agentRole, escalationLevel, deadline, dependencies, confidence)
- recommendations (array of actions with type, priority, description, estimatedTime, prerequisites)
Provide specific, actionable recommendations with clear time estimates and prerequisites.`;
  }
  /**
   * Get all loaded guidelines
   */
  getAllGuidelines(): InspectorGuideline[] {
    return Array.from(this.guidelines.values());
  }
  /**
   * Get guideline by ID
   */
  getGuideline(guidelineId: string): InspectorGuideline | undefined {
    return this.guidelines.get(guidelineId);
  }
  /**
   * Get guidelines by category
   */
  getGuidelinesByCategory(category: string): InspectorGuideline[] {
    return Array.from(this.guidelines.values()).filter((g) => g.category === category);
  }
  /**
   * Get guidelines by tag
   */
  getGuidelinesByTag(tag: string): InspectorGuideline[] {
    return Array.from(this.guidelines.values()).filter((g) => g.tags.includes(tag));
  }
  /**
   * Get adapter metrics
   */
  getMetrics(): typeof this.metrics {
    return {
      ...this.metrics,
      totalGuidelines: this.guidelines.size,
    };
  }
  /**
   * Reload guidelines from disk
   */
  async reloadGuidelines(): Promise<GuidelineLoadResult> {
    this.guidelines.clear();
    this.signalToGuidelineMap.clear();
    this.metrics.cacheHits = 0;
    logger.info('EnhancedGuidelineAdapter', 'Reloading guidelines');
    return this.loadGuidelines();
  }
  /**
   * Check if guidelines need reloading
   */
  needsReload(): boolean {
    try {
      if (!existsSync(this.guidelinesPath)) {
        return false;
      }
      const stats = statSync(this.guidelinesPath);
      return stats.mtime > this.lastScanTime;
    } catch {
      return false;
    }
  }
}
