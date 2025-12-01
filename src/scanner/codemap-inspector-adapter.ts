/**
 * ♫ Codemap Inspector Adapter for @dcversus/prp
 *
 * Converts tree-sitter AST codemap data to inspector-friendly format.
 * Extracts relevant information for signal analysis with token optimization
 * and filtering capabilities for efficient inspector processing.
 */

import { createLayerLogger, HashUtils } from '../shared';

import {
  ClassInfo,
  FileStructure,
} from './types';

import type { EventBus } from '../shared/events';
import type {
  CodemapData,
  CodeAnalysisResult,
  FunctionInfo,
  ImportInfo,
  ExportInfo,
  VariableInfo,
  CodeIssue,
  Dependency,
  CrossFileReference,
  Position} from './types';


const logger = createLayerLogger('scanner');

/**
 * Inspector-specific codemap interfaces
 */
export interface InspectorFunctionInfo {
  id: string;
  name: string;
  type: string;
  file: string;
  position: Position;
  signature: string;
  complexity: {
    cyclomatic: number;
    cognitive: number;
    nestingDepth: number;
  };
  metrics: {
    size: number;
    parameterCount: number;
    isAsync: boolean;
    isExported: boolean;
  };
  signals: string[]; // Pre-detected signals in function
  issues: CodeIssue[];
}

export interface InspectorClassInfo {
  id: string;
  name: string;
  type: string;
  file: string;
  position: Position;
  size: number;
  methods: InspectorFunctionInfo[];
  properties: Array<{
    name: string;
    type?: string;
    visibility: string;
    isStatic: boolean;
  }>;
  inheritance: string[];
  decorators: string[];
  signals: string[];
  issues: CodeIssue[];
}

export interface InspectorFileInfo {
  id: string;
  path: string;
  language: string;
  size: number;
  linesOfCode: number;
  lastModified: Date;
  structure: {
    functions: InspectorFunctionInfo[];
    classes: InspectorClassInfo[];
    imports: ImportInfo[];
    exports: ExportInfo[];
    variables: VariableInfo[];
  };
  dependencies: Dependency[];
  issues: CodeIssue[];
  signals: string[]; // File-level signals
  quality: {
    maintainabilityIndex: number;
    issueCount: number;
    complexityScore: number;
  };
}

export interface InspectorCodemapSummary {
  id: string;
  generatedAt: Date;
  rootPath: string;
  files: InspectorFileInfo[];
  metrics: {
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
    totalLines: number;
    averageComplexity: number;
    languageDistribution: Record<string, number>;
    issueCount: number;
    signalCount: number;
  };
  crossFileReferences: CrossFileReference[];
  dependencies: Map<string, string[]>;
}

export interface InspectorQueryOptions {
  files?: string[];
  functions?: string[];
  classes?: string[];
  patterns?: string[];
  complexityThreshold?: number;
  issueSeverity?: 'low' | 'medium' | 'high' | 'critical';
  languages?: string[];
  includeSignals?: boolean;
  includeIssues?: boolean;
  maxResults?: number;
  tokenOptimized?: boolean; // Compact representation for LLM efficiency
}

export interface InspectorQueryResult {
  queryId: string;
  timestamp: Date;
  options: InspectorQueryOptions;
  results: {
    files: InspectorFileInfo[];
    functions: InspectorFunctionInfo[];
    classes: InspectorClassInfo[];
    issues: CodeIssue[];
    signals: string[];
  };
  metrics: {
    totalResults: number;
    processingTime: number;
    tokenCount: number; // Estimated token usage
  };
}

/**
 * Codemap Inspector Adapter
 *
 * Converts tree-sitter codemap data to inspector-friendly format with:
 * - Compact representations for token optimization
 * - Signal extraction and analysis
 * - Query capabilities for focused analysis
 * - Filtering based on relevance and scope
 */
export class CodemapInspectorAdapter {
  private readonly eventBus: EventBus;
  private readonly signalPatterns = new Map<string, RegExp[]>();
  private readonly cache = new Map<string, InspectorCodemapSummary>();
  private readonly cacheTimeoutMs = 60000; // 1 minute cache

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeSignalPatterns();
  }

  /**
   * Convert full codemap to inspector format
   */
  async convertCodemap(
    codemapData: CodemapData,
    options: Partial<InspectorQueryOptions> = {},
  ): Promise<InspectorCodemapSummary> {
    const startTime = Date.now();
    const summaryId = HashUtils.generateId();

    logger.debug('CodemapInspectorAdapter', 'Converting codemap to inspector format', {
      fileCount: codemapData.files.size,
      options,
    });

    try {
      // Convert files
      const inspectorFiles: InspectorFileInfo[] = [];
      const allSignals = new Set<string>();

      for (const [filePath, analysis] of Array.from(codemapData.files.entries())) {
        // Apply file filtering if specified
        if (options.files && options.files.length > 0) {
          if (!options.files.some((pattern) => filePath.includes(pattern))) {
            continue;
          }
        }

        // Apply language filtering if specified
        if (options.languages && options.languages.length > 0) {
          if (!options.languages.includes(analysis.language)) {
            continue;
          }
        }

        const inspectorFile = await this.convertFileAnalysis(filePath, analysis, options);
        inspectorFiles.push(inspectorFile);

        // Collect all signals
        Array.from(inspectorFile.signals).forEach((signal) => allSignals.add(signal));
      }

      // Create summary
      const summary: InspectorCodemapSummary = {
        id: summaryId,
        generatedAt: new Date(),
        rootPath: codemapData.rootPath,
        files: options.tokenOptimized
          ? this.createCompactRepresentation(inspectorFiles)
          : inspectorFiles,
        metrics: {
          totalFiles: inspectorFiles.length,
          totalFunctions: inspectorFiles.reduce(
            (sum, file) => sum + file.structure.functions.length,
            0,
          ),
          totalClasses: inspectorFiles.reduce(
            (sum, file) => sum + file.structure.classes.length,
            0,
          ),
          totalLines: inspectorFiles.reduce((sum, file) => sum + file.linesOfCode, 0),
          averageComplexity: this.calculateAverageComplexity(inspectorFiles),
          languageDistribution: this.getLanguageDistribution(inspectorFiles),
          issueCount: inspectorFiles.reduce((sum, file) => sum + file.issues.length, 0),
          signalCount: allSignals.size,
        },
        crossFileReferences: this.filterCrossFileReferences(
          codemapData.crossFileReferences,
          options,
        ),
        dependencies: new Map(
          Array.from(codemapData.dependencies.entries()).map(([k, v]) => [k, Array.from(v)]),
        ),
      };

      // Cache the result
      this.cache.set(summaryId, summary);
      this.cleanupCache();

      const conversionTime = Date.now() - startTime;
      logger.info('CodemapInspectorAdapter', 'Codemap conversion completed', {
        summaryId,
        fileCount: summary.metrics.totalFiles,
        functionCount: summary.metrics.totalFunctions,
        classCount: summary.metrics.totalClasses,
        signalCount: summary.metrics.signalCount,
        conversionTime: `${conversionTime}ms`,
        tokenOptimized: options.tokenOptimized || false,
      });

      // Emit conversion event
      this.eventBus.publishToChannel('inspector', {
        id: HashUtils.generateId(),
        type: 'codemap_converted',
        timestamp: new Date(),
        source: 'codemap-inspector-adapter',
        data: {
          summaryId,
          metrics: summary.metrics,
          options,
        },
        metadata: { priority: 'low' },
      });

      return summary;
    } catch (error) {
      logger.error(
        'CodemapInspectorAdapter',
        'Failed to convert codemap',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Query inspector codemap with specific criteria
   */
  async queryCodemap(
    summaryId: string,
    queryOptions: InspectorQueryOptions,
  ): Promise<InspectorQueryResult> {
    const startTime = Date.now();
    const queryId = HashUtils.generateId();

    logger.debug('CodemapInspectorAdapter', 'Querying inspector codemap', {
      summaryId,
      queryOptions,
    });

    try {
      const summary = this.cache.get(summaryId);
      if (!summary) {
        throw new Error(`Inspector codemap summary not found: ${summaryId}`);
      }

      const result: InspectorQueryResult = {
        queryId,
        timestamp: new Date(),
        options: queryOptions,
        results: {
          files: [],
          functions: [],
          classes: [],
          issues: [],
          signals: [],
        },
        metrics: {
          totalResults: 0,
          processingTime: 0,
          tokenCount: 0,
        },
      };

      // Apply filters
      let filteredFiles = summary.files;

      // File path filter
      if (queryOptions.files && queryOptions.files.length > 0) {
        filteredFiles = filteredFiles.filter((file) =>
          queryOptions.files!.some((pattern) => file.path.includes(pattern)),
        );
      }

      // Language filter
      if (queryOptions.languages && queryOptions.languages.length > 0) {
        filteredFiles = filteredFiles.filter((file) =>
          queryOptions.languages!.includes(file.language),
        );
      }

      // Complexity threshold filter
      if (queryOptions.complexityThreshold) {
        filteredFiles = filteredFiles.filter(
          (file) => file.quality.complexityScore >= queryOptions.complexityThreshold!,
        );
      }

      // Extract functions
      if (queryOptions.functions) {
        for (const file of filteredFiles) {
          const matchingFunctions = file.structure.functions.filter((fn) =>
            queryOptions.functions!.some(
              (pattern) => fn.name.includes(pattern) || fn.signature.includes(pattern),
            ),
          );
          result.results.functions.push(...matchingFunctions);
        }
      }

      // Extract classes
      if (queryOptions.classes) {
        for (const file of filteredFiles) {
          const matchingClasses = file.structure.classes.filter((cls) =>
            queryOptions.classes!.some(
              (pattern) => cls.name.includes(pattern) || cls.type.includes(pattern),
            ),
          );
          result.results.classes.push(...matchingClasses);
        }
      }

      // Pattern matching
      if (queryOptions.patterns) {
        for (const file of filteredFiles) {
          // Search in function signatures
          const matchingFunctions = file.structure.functions.filter((fn) =>
            queryOptions.patterns!.some(
              (pattern) => fn.name.includes(pattern) || fn.signature.includes(pattern),
            ),
          );

          // Search in class names and methods
          const matchingClasses = file.structure.classes.filter((cls) =>
            queryOptions.patterns!.some(
              (pattern) =>
                cls.name.includes(pattern) ||
                cls.methods.some((method) => method.name.includes(pattern)),
            ),
          );

          result.results.functions.push(...matchingFunctions);
          result.results.classes.push(...matchingClasses);
        }
      }

      // Extract issues by severity
      if (queryOptions.issueSeverity) {
        for (const file of filteredFiles) {
          const matchingIssues = file.issues.filter(
            (issue) => issue.severity === queryOptions.issueSeverity,
          );
          result.results.issues.push(...matchingIssues);
        }
      }

      // Collect files
      result.results.files = queryOptions.tokenOptimized
        ? this.createCompactRepresentation(filteredFiles)
        : filteredFiles;

      // Collect signals
      if (queryOptions.includeSignals) {
        for (const file of result.results.files) {
          result.results.signals.push(...file.signals);
          for (const fn of file.structure.functions) {
            result.results.signals.push(...fn.signals);
          }
          for (const cls of file.structure.classes) {
            result.results.signals.push(...cls.signals);
          }
        }
        result.results.signals = Array.from(new Set(result.results.signals)); // Remove duplicates
      }

      // Collect issues
      if (queryOptions.includeIssues) {
        for (const file of result.results.files) {
          result.results.issues.push(...file.issues);
          for (const fn of file.structure.functions) {
            result.results.issues.push(...fn.issues);
          }
          for (const cls of file.structure.classes) {
            result.results.issues.push(...cls.issues);
          }
        }
      }

      // Apply max results limit
      if (queryOptions.maxResults) {
        result.results.files = result.results.files.slice(0, queryOptions.maxResults);
        result.results.functions = result.results.functions.slice(0, queryOptions.maxResults);
        result.results.classes = result.results.classes.slice(0, queryOptions.maxResults);
        result.results.issues = result.results.issues.slice(0, queryOptions.maxResults);
        result.results.signals = result.results.signals.slice(0, queryOptions.maxResults);
      }

      // Calculate metrics
      const processingTime = Date.now() - startTime;
      result.metrics.totalResults =
        result.results.files.length +
        result.results.functions.length +
        result.results.classes.length +
        result.results.issues.length +
        result.results.signals.length;
      result.metrics.processingTime = processingTime;
      result.metrics.tokenCount = this.estimateTokenCount(result);

      logger.debug('CodemapInspectorAdapter', 'Query completed', {
        queryId,
        totalResults: result.metrics.totalResults,
        processingTime: `${processingTime}ms`,
        estimatedTokens: result.metrics.tokenCount,
      });

      return result;
    } catch (error) {
      logger.error(
        'CodemapInspectorAdapter',
        'Query failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          summaryId,
          queryOptions,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Get cached inspector summary
   */
  getCachedSummary(summaryId: string): InspectorCodemapSummary | null {
    return this.cache.get(summaryId) ?? null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('CodemapInspectorAdapter', 'Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; memoryUsage: number } {
    const {size} = this.cache;
    const hitRate = size > 0 ? 0.8 : 0; // Placeholder
    const memoryUsage = size * 50 * 1024; // Rough estimate

    return { size, hitRate, memoryUsage };
  }

  // Private Methods

  /**
   * Convert file analysis to inspector format
   */
  private async convertFileAnalysis(
    filePath: string,
    analysis: CodeAnalysisResult,
    options: Partial<InspectorQueryOptions>,
  ): Promise<InspectorFileInfo> {
    // Convert functions
    const functions: InspectorFunctionInfo[] = analysis.structure.functions.map((fn) => ({
      id: HashUtils.generateId(),
      name: fn.name,
      type: fn.type,
      file: analysis.filePath,
      position: fn.position,
      signature: this.generateFunctionSignature(fn),
      complexity: {
        cyclomatic: fn.complexity,
        cognitive: fn.complexity, // Use same value for now
        nestingDepth: fn.nestingDepth,
      },
      metrics: {
        size: fn.size,
        parameterCount: fn.parameters.length,
        isAsync: fn.isAsync,
        isExported: fn.isExported,
      },
      signals: this.detectSignals(fn.name, fn),
      issues: analysis.issues.filter((issue) => this.isIssueInFunction(issue, fn.position)),
    }));

    // Convert classes
    const classes: InspectorClassInfo[] = analysis.structure.classes.map((cls) => ({
      id: HashUtils.generateId(),
      name: cls.name,
      type: cls.type,
      file: analysis.filePath,
      position: cls.position,
      size: cls.size,
      methods: cls.methods.map((method) => ({
        id: HashUtils.generateId(),
        name: method.name,
        type: method.type,
        file: analysis.filePath,
        position: method.position,
        signature: this.generateFunctionSignature(method),
        complexity: {
          cyclomatic: method.complexity,
          cognitive: method.complexity,
          nestingDepth: method.nestingDepth,
        },
        metrics: {
          size: method.size,
          parameterCount: method.parameters.length,
          isAsync: method.isAsync,
          isExported: method.isExported,
        },
        signals: this.detectSignals(method.name, method),
        issues: analysis.issues.filter((issue) => this.isIssueInFunction(issue, method.position)),
      })),
      properties: cls.properties,
      inheritance: cls.inheritance,
      decorators: cls.decorators,
      signals: this.detectSignals(cls.name, cls),
      issues: analysis.issues.filter((issue) => this.isIssueInClass(issue, cls.position)),
    }));

    // Detect file-level signals
    const fileSignals = this.detectSignals(analysis.filePath, analysis);

    return {
      id: HashUtils.generateId(),
      path: analysis.filePath,
      language: analysis.language,
      size: analysis.size,
      linesOfCode: analysis.metrics.linesOfCode,
      lastModified: analysis.lastModified,
      structure: {
        functions: options.tokenOptimized
          ? this.createCompactFunctionRepresentation(functions)
          : functions,
        classes: options.tokenOptimized ? this.createCompactClassRepresentation(classes) : classes,
        imports: analysis.structure.imports,
        exports: analysis.structure.exports,
        variables: analysis.structure.variables,
      },
      dependencies: analysis.dependencies,
      issues: analysis.issues,
      signals: fileSignals,
      quality: {
        maintainabilityIndex: analysis.complexity.maintainabilityIndex,
        issueCount: analysis.issues.length,
        complexityScore: analysis.complexity.cyclomaticComplexity,
      },
    };
  }

  /**
   * Generate function signature for display
   */
  private generateFunctionSignature(fn: FunctionInfo): string {
    const params = fn.parameters.map((p) => p.name + (p.optional ? '?' : '')).join(', ');
    return `${fn.name}(${params})${fn.returnType ? `: ${  fn.returnType}` : ''}`;
  }

  /**
   * Detect signals in code elements
   */
  private detectSignals(name: string, element: any): string[] {
    const signals: string[] = [];

    // Check against signal patterns
    for (const [category, patterns] of Array.from(this.signalPatterns.entries())) {
      for (const pattern of patterns) {
        if (pattern.test(name) || pattern.test(JSON.stringify(element))) {
          signals.push(`${category}:${pattern.source}`);
        }
      }
    }

    // Check for common signal indicators
    const signalIndicators = [
      /\[bb\]/, // Blocker
      /\[af\]/, // Feedback Request
      /\[gg\]/, // Goal Clarification
      /\[rr\]/, // Research Request
      /\[tp\]/, // Tests Prepared
      /\[dp\]/, // Development Progress
      /\[bf\]/, // Bug Fixed
      /\[tw\]/, // Tests Written
      /\[cd\]/, // Cleanup Done
      /\[cc\]/, // Cleanup Complete
      /\[mg\]/, // Merged
      /\[rl\]/, // Released
    ];

    for (const indicator of signalIndicators) {
      if (indicator.test(JSON.stringify(element))) {
        signals.push(`signal:${indicator.source}`);
      }
    }

    return signals;
  }

  /**
   * Check if issue is within function bounds
   */
  private isIssueInFunction(issue: CodeIssue, fnPosition: Position): boolean {
    // Simplified check - would need proper range comparison in production
    return issue.position.line >= fnPosition.line;
  }

  /**
   * Check if issue is within class bounds
   */
  private isIssueInClass(issue: CodeIssue, classPosition: Position): boolean {
    // Simplified check - would need proper range comparison in production
    return issue.position.line >= classPosition.line;
  }

  /**
   * Create compact representation for token optimization
   */
  private createCompactRepresentation(files: InspectorFileInfo[]): InspectorFileInfo[] {
    return files.map((file) => ({
      ...file,
      structure: {
        ...file.structure,
        functions: this.createCompactFunctionRepresentation(file.structure.functions),
        classes: this.createCompactClassRepresentation(file.structure.classes),
      },
      issues: file.issues.slice(0, 5), // Limit issues
      signals: file.signals.slice(0, 10), // Limit signals
    }));
  }

  private createCompactFunctionRepresentation(
    functions: InspectorFunctionInfo[],
  ): InspectorFunctionInfo[] {
    return functions.map((fn) => ({
      ...fn,
      signature: fn.name, // Only name to save tokens
      metrics: {
        size: fn.metrics.size,
        parameterCount: fn.metrics.parameterCount,
        isAsync: fn.metrics.isAsync,
        isExported: fn.metrics.isExported,
      },
    }));
  }

  private createCompactClassRepresentation(classes: InspectorClassInfo[]): InspectorClassInfo[] {
    return classes.map((cls) => ({
      ...cls,
      methods: cls.methods.slice(0, 3), // Limit methods
      properties: cls.properties.slice(0, 3), // Limit properties
    }));
  }

  /**
   * Filter cross-file references based on query options
   */
  private filterCrossFileReferences(
    references: CrossFileReference[],
    options: Partial<InspectorQueryOptions>,
  ): CrossFileReference[] {
    if (!options.files || options.files.length === 0) {
      return references;
    }

    return references.filter((ref) =>
      options.files!.some(
        (pattern) => ref.sourceFile.includes(pattern) || ref.targetFile.includes(pattern),
      ),
    );
  }

  /**
   * Calculate average complexity across files
   */
  private calculateAverageComplexity(files: InspectorFileInfo[]): number {
    if (files.length === 0) {
      return 0;
    }

    const totalComplexity = files.reduce((sum, file) => sum + file.quality.complexityScore, 0);
    return Math.round(totalComplexity / files.length);
  }

  /**
   * Get language distribution
   */
  private getLanguageDistribution(files: InspectorFileInfo[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const file of files) {
      distribution[file.language] = (distribution[file.language] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Estimate token count for query result
   */
  private estimateTokenCount(result: InspectorQueryResult): number {
    let tokenCount = 0;

    // Estimate tokens for each result type
    tokenCount += result.results.files.length * 50; // Approximate tokens per file
    tokenCount += result.results.functions.length * 20; // Approximate tokens per function
    tokenCount += result.results.classes.length * 30; // Approximate tokens per class
    tokenCount += result.results.issues.length * 15; // Approximate tokens per issue
    tokenCount += result.results.signals.length * 5; // Approximate tokens per signal

    return tokenCount;
  }

  /**
   * Initialize signal detection patterns
   */
  private initializeSignalPatterns(): void {
    // Agent coordination signals
    this.signalPatterns.set('coordination', [
      /\[oa\]/, // Orchestrator Attention
      /\[pc\]/, // Parallel Coordination
      /\[fo\]/, // File Ownership Conflict
    ]);

    // Quality assurance signals
    this.signalPatterns.set('quality', [
      /\[cq\]/, // Code Quality
      /\[cp\]/, // CI Passed
      /\[cf\]/, // CI Failed
      /\[tg\]/, // Tests Green
      /\[tr\]/, // Tests Red
    ]);

    // Development progress signals
    this.signalPatterns.set('development', [
      /\[dp\]/, // Development Progress
      /\[tp\]/, // Tests Prepared
      /\[tw\]/, // Tests Written
      /\[bf\]/, // Bug Fixed
      /\[br\]/, // Blocker Resolved
    ]);

    // Incident handling signals
    this.signalPatterns.set('incident', [
      /\[ic\]/, // Incident
      /\[JC\]/, // Jesus Christ (Incident Resolved)
      /\[pm\]/, // Post-mortem
      /\[ts\]/, // Troubleshooting Session
    ]);
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    if (this.cache.size > 50) {
      // Prevent memory leaks
      const entries = Array.from(this.cache.entries());
      // Keep most recent entries
      entries.sort((a, b) => b[1].generatedAt.getTime() - a[1].generatedAt.getTime());

      // Remove oldest 25%
      const toRemove = Math.floor(entries.length * 0.25);
      for (let i = entries.length - toRemove; i < entries.length; i++) {
        this.cache.delete(entries[i]![0]);
      }
    }
  }
}
