/**
 * ♫ Codemap Utilities for @dcversus/prp
 *
 * Utility functions for converting between different codemap representations,
 * extracting specific code patterns, generating compact summaries for token
 * optimization, and supporting filtering based on relevance or scope.
 */

import { createLayerLogger, HashUtils } from '../shared';

import {
  CodeIssue,
  Dependency,
  CrossFileReference,
  Position,
  FileStructure,
} from './types';

import type { EventBus } from '../shared/events';
import type {
  CodemapData,
  CodeAnalysisResult,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
  VariableInfo} from './types';


const logger = createLayerLogger('scanner');

/**
 * Codemap representation types
 */
export type CodemapRepresentation = 'full' | 'compact' | 'summary' | 'minimal';

export interface CodePattern {
  type: 'function' | 'class' | 'import' | 'export' | 'variable' | 'interface' | 'type';
  name: string;
  pattern: RegExp;
  description: string;
  category: string;
}

export interface CompactFileInfo {
  path: string;
  language: string;
  linesOfCode: number;
  complexity: number;
  functions: number;
  classes: number;
  issues: number;
  signals: string[];
}

export interface CompactFunctionInfo {
  name: string;
  file: string;
  complexity: number;
  line: number;
  signals: string[];
}

export interface CompactClassInfo {
  name: string;
  file: string;
  methods: number;
  properties: number;
  line: number;
  signals: string[];
}

export interface CodemapSummary {
  id: string;
  generatedAt: Date;
  rootPath: string;
  representation: CodemapRepresentation;
  files: CompactFileInfo[];
  functions: CompactFunctionInfo[];
  classes: CompactClassInfo[];
  metrics: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    averageComplexity: number;
    issueCount: number;
    signalCount: number;
    languageDistribution: Record<string, number>;
  };
  dependencies: Array<{
    source: string;
    target: string;
    count: number;
  }>;
}

export interface FilterOptions {
  filePatterns?: string[];
  languages?: string[];
  complexityRange?: { min: number; max: number };
  issueTypes?: string[];
  signalPatterns?: string[];
  includeSignals?: boolean;
  includeIssues?: boolean;
  maxResults?: number;
  sortBy?: 'name' | 'complexity' | 'size' | 'issues' | 'signals';
  sortOrder?: 'asc' | 'desc';
}

export interface ExtractionOptions {
  includePrivate?: boolean;
  includeInternal?: boolean;
  includeExported?: boolean;
  maxDepth?: number;
  includeSignatures?: boolean;
  includeMetadata?: boolean;
  tokenOptimized?: boolean;
}

/**
 * Codemap Utilities
 *
 * Provides utility functions for:
 * - Converting between codemap representations
 * - Extracting specific code patterns
 * - Generating compact summaries for token optimization
 * - Filtering based on relevance or scope
 */
export class CodemapUtils {
  private readonly eventBus: EventBus;
  private readonly codePatterns = new Map<string, CodePattern[]>();
  private readonly cache = new Map<string, any>();
  private readonly cacheTimeoutMs = 300000; // 5 minutes

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeCodePatterns();
  }

  /**
   * Convert codemap to different representation
   */
  convertCodemapRepresentation(
    codemapData: CodemapData,
    representation: CodemapRepresentation,
  ): CodemapSummary {
    const startTime = Date.now();
    const summaryId = HashUtils.generateId();

    logger.debug('CodemapUtils', 'Converting codemap representation', {
      fileCount: codemapData.files.size,
      representation,
    });

    try {
      let files: CompactFileInfo[] = [];
      let functions: CompactFunctionInfo[] = [];
      let classes: CompactClassInfo[] = [];

      switch (representation) {
        case 'full':
          ({ files, functions, classes } = this.createFullRepresentation(codemapData));
          break;
        case 'compact':
          ({ files, functions, classes } = this.createCompactRepresentation(codemapData));
          break;
        case 'summary':
          ({ files, functions, classes } = this.createSummaryRepresentation(codemapData));
          break;
        case 'minimal':
          ({ files, functions, classes } = this.createMinimalRepresentation(codemapData));
          break;
      }

      const summary: CodemapSummary = {
        id: summaryId,
        generatedAt: new Date(),
        rootPath: codemapData.rootPath,
        representation,
        files,
        functions,
        classes,
        metrics: {
          totalFiles: files.length,
          totalLines: files.reduce((sum, file) => sum + file.linesOfCode, 0),
          totalFunctions: functions.length,
          totalClasses: classes.length,
          averageComplexity: this.calculateAverageComplexity(codemapData),
          issueCount: files.reduce((sum, file) => sum + file.issues, 0),
          signalCount: files.reduce((sum, file) => sum + file.signals.length, 0),
          languageDistribution: this.getLanguageDistribution(codemapData),
        },
        dependencies: this.createDependencySummary(codemapData),
      };

      // Cache the result
      this.cache.set(summaryId, summary);
      this.cleanupCache();

      const conversionTime = Date.now() - startTime;
      logger.debug('CodemapUtils', 'Representation conversion completed', {
        summaryId,
        representation,
        fileCount: summary.metrics.totalFiles,
        functionCount: summary.metrics.totalFunctions,
        classCount: summary.metrics.totalClasses,
        conversionTime: `${conversionTime}ms`,
      });

      return summary;
    } catch (error) {
      logger.error(
        'CodemapUtils',
        'Failed to convert representation',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Extract specific code patterns from codemap
   */
  extractCodePatterns(
    codemapData: CodemapData,
    patterns: string[],
    options: ExtractionOptions = {},
  ): {
    functions: FunctionInfo[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    exports: ExportInfo[];
    variables: VariableInfo[];
  } {
    logger.debug('CodemapUtils', 'Extracting code patterns', {
      patterns,
      fileCount: codemapData.files.size,
      options,
    });

    const result = {
      functions: [] as FunctionInfo[],
      classes: [] as ClassInfo[],
      imports: [] as ImportInfo[],
      exports: [] as ExportInfo[],
      variables: [] as VariableInfo[],
    };

    for (const [filePath, analysis] of Array.from(codemapData.files.entries())) {
      // Extract functions
      for (const func of analysis.structure.functions) {
        if (this.matchesPatterns(func.name, patterns)) {
          if (this.shouldIncludeFunction(func, options)) {
            result.functions.push(func);
          }
        }
      }

      // Extract classes
      for (const cls of analysis.structure.classes) {
        if (this.matchesPatterns(cls.name, patterns)) {
          if (this.shouldIncludeClass(cls, options)) {
            result.classes.push(cls);
          }
        }
      }

      // Extract imports
      for (const imp of analysis.structure.imports) {
        if (
          this.matchesPatterns(imp.source, patterns) ||
          imp.imports.some((i) => this.matchesPatterns(i.name, patterns))
        ) {
          result.imports.push(imp);
        }
      }

      // Extract exports
      for (const exp of analysis.structure.exports) {
        if (this.matchesPatterns(exp.name, patterns)) {
          result.exports.push(exp);
        }
      }

      // Extract variables
      for (const variable of analysis.structure.variables) {
        if (this.matchesPatterns(variable.name, patterns)) {
          if (this.shouldIncludeVariable(variable, options)) {
            result.variables.push(variable);
          }
        }
      }
    }

    logger.debug('CodemapUtils', 'Pattern extraction completed', {
      functionsFound: result.functions.length,
      classesFound: result.classes.length,
      importsFound: result.imports.length,
      exportsFound: result.exports.length,
      variablesFound: result.variables.length,
    });

    return result;
  }

  /**
   * Generate compact summary for token optimization
   */
  generateCompactSummary(codemapData: CodemapData, maxTokens = 4000): string {
    logger.debug('CodemapUtils', 'Generating compact summary', {
      fileCount: codemapData.files.size,
      maxTokens,
    });

    let summary = '';
    let tokenCount = 0;

    // Add header
    const header = `# Codebase Summary\n\n**Root**: ${codemapData.rootPath}\n**Files**: ${codemapData.files.size}\n**Generated**: ${new Date().toISOString()}\n\n`;
    summary += header;
    tokenCount += this.estimateTokens(header);

    // Add metrics
    const metrics = `## Metrics\n- Total Lines: ${codemapData.metrics.totalLines}\n- Functions: ${codemapData.metrics.totalFunctions}\n- Classes: ${codemapData.metrics.totalClasses}\n- Avg Complexity: ${codemapData.metrics.averageComplexity.toFixed(1)}\n- Issues: ${codemapData.metrics.issueCount}\n\n`;
    summary += metrics;
    tokenCount += this.estimateTokens(metrics);

    // Add language distribution
    const langDist = Array.from(codemapData.metrics.languageDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const languages = `## Languages (${langDist.length})\n${langDist.map(([lang, count]) => `- ${lang}: ${count}`).join('\n')}\n\n`;
    summary += languages;
    tokenCount += this.estimateTokens(languages);

    // Add file overview
    if (tokenCount < maxTokens * 0.6) {
      summary += `## Files Overview\n\n`;
      const files = Array.from(codemapData.files.entries())
        .sort((a, b) => b[1].metrics.linesOfCode - a[1].metrics.linesOfCode)
        .slice(0, 20); // Limit to top 20 files

      for (const [filePath, analysis] of files) {
        const fileEntry = `- **${filePath}** (${analysis.language}, ${analysis.metrics.linesOfCode} LOC, ${analysis.complexity.cyclomaticComplexity} complexity)\n`;
        const entryTokens = this.estimateTokens(fileEntry);

        if (tokenCount + entryTokens > maxTokens) {
          break;
        }

        summary += fileEntry;
        tokenCount += entryTokens;
      }
      summary += '\n';
    }

    // Add high-complexity functions
    if (tokenCount < maxTokens * 0.8) {
      summary += `## High Complexity Functions\n\n`;
      const allFunctions = Array.from(codemapData.files.values())
        .flatMap((analysis) =>
          analysis.structure.functions.map((fn) => ({ ...fn, file: analysis.filePath })),
        )
        .sort((a, b) => (b as any).complexity - (a as any).complexity)
        .slice(0, 10);

      for (const func of allFunctions) {
        const funcEntry = `- **${func.name}** (${(func as any).file}, complexity: ${(func as any).complexity})\n`;
        const entryTokens = this.estimateTokens(funcEntry);

        if (tokenCount + entryTokens > maxTokens) {
          break;
        }

        summary += funcEntry;
        tokenCount += entryTokens;
      }
      summary += '\n';
    }

    // Add critical issues
    if (tokenCount < maxTokens * 0.9) {
      const allIssues = Array.from(codemapData.files.values())
        .flatMap((analysis) =>
          analysis.issues.map((issue) => ({ ...issue, file: analysis.filePath })),
        )
        .filter(
          (issue) => (issue as any).severity === 'critical' || (issue as any).severity === 'high',
        )
        .slice(0, 5);

      if (allIssues.length > 0) {
        summary += `## Critical Issues\n\n`;
        for (const issue of allIssues) {
          const issueEntry = `- **${(issue as any).file}:${(issue as any).position.line}** [${(issue as any).severity.toUpperCase()}] ${(issue as any).message}\n`;
          const entryTokens = this.estimateTokens(issueEntry);

          if (tokenCount + entryTokens > maxTokens) {
            break;
          }

          summary += issueEntry;
          tokenCount += entryTokens;
        }
      }
    }

    logger.debug('CodemapUtils', 'Compact summary generated', {
      estimatedTokens: tokenCount,
      maxTokens,
      utilizationPercent: Math.round((tokenCount / maxTokens) * 100),
    });

    return summary;
  }

  /**
   * Filter codemap based on options
   */
  filterCodemap(codemapData: CodemapData, filterOptions: FilterOptions): CodemapData {
    logger.debug('CodemapUtils', 'Filtering codemap', {
      fileCount: codemapData.files.size,
      filterOptions,
    });

    // Filter files
    const filteredFiles = new Map<string, CodeAnalysisResult>();

    for (const [filePath, analysis] of Array.from(codemapData.files.entries())) {
      if (this.shouldIncludeFile(filePath, analysis, filterOptions)) {
        filteredFiles.set(filePath, analysis);
      }
    }

    // Filter cross-file references
    const filteredReferences = codemapData.crossFileReferences.filter(
      (ref) => filteredFiles.has(ref.sourceFile) && filteredFiles.has(ref.targetFile),
    );

    // Filter dependencies
    const filteredDependencies = new Map<string, Set<string>>();
    for (const [file, deps] of Array.from(codemapData.dependencies.entries())) {
      if (filteredFiles.has(file)) {
        const filteredDeps = new Set(Array.from(deps).filter((dep: any) => filteredFiles.has(dep)));
        filteredDependencies.set(file, filteredDeps);
      }
    }

    // Recalculate metrics for filtered codemap
    const filteredMetrics = this.calculateMetrics(filteredFiles);

    const filteredCodemap: CodemapData = {
      ...codemapData,
      files: filteredFiles,
      crossFileReferences: filteredReferences,
      dependencies: filteredDependencies,
      metrics: filteredMetrics,
    };

    logger.debug('CodemapUtils', 'Codemap filtered', {
      originalFiles: codemapData.files.size,
      filteredFiles: filteredFiles.size,
      reductionPercent: Math.round(
        ((codemapData.files.size - filteredFiles.size) / codemapData.files.size) * 100,
      ),
    });

    return filteredCodemap;
  }

  /**
   * Search codemap for specific patterns
   */
  searchCodemap(
    codemapData: CodemapData,
    searchTerm: string,
    searchType: 'file' | 'function' | 'class' | 'content' | 'all' = 'all',
    options: { caseSensitive?: boolean; regex?: boolean; maxResults?: number } = {},
  ): Array<{
    type: string;
    file: string;
    name: string;
    line?: number;
    context?: string;
    relevance: number;
  }> {
    logger.debug('CodemapUtils', 'Searching codemap', {
      searchTerm,
      searchType,
      fileCount: codemapData.files.size,
      options,
    });

    const results: Array<{
      type: string;
      file: string;
      name: string;
      line?: number;
      context?: string;
      relevance: number;
    }> = [];

    const searchRegex = options.regex
      ? new RegExp(searchTerm, options.caseSensitive ? 'g' : 'gi')
      : new RegExp(
          searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          options.caseSensitive ? 'g' : 'gi',
        );

    const searchTypes =
      searchType === 'all' ? ['file', 'function', 'class', 'content'] : [searchType];

    for (const [filePath, analysis] of Array.from(codemapData.files.entries())) {
      if (searchTypes.includes('file')) {
        if (searchRegex.test(filePath)) {
          results.push({
            type: 'file',
            file: filePath,
            name: filePath,
            relevance: this.calculateRelevance(searchTerm, filePath),
          });
        }
      }

      if (searchTypes.includes('function')) {
        for (const func of analysis.structure.functions) {
          if (searchRegex.test(func.name)) {
            results.push({
              type: 'function',
              file: filePath,
              name: func.name,
              line: func.position.line,
              relevance: this.calculateRelevance(searchTerm, func.name),
            });
          }
        }
      }

      if (searchTypes.includes('class')) {
        for (const cls of analysis.structure.classes) {
          if (searchRegex.test(cls.name)) {
            results.push({
              type: 'class',
              file: filePath,
              name: cls.name,
              line: cls.position.line,
              relevance: this.calculateRelevance(searchTerm, cls.name),
            });
          }
        }
      }

      if (searchTypes.includes('content')) {
        // This would search within file content if available
        // For now, search in function and class names
        for (const func of analysis.structure.functions) {
          if (searchRegex.test(func.name)) {
            results.push({
              type: 'content',
              file: filePath,
              name: func.name,
              line: func.position.line,
              context: `function ${func.name}`,
              relevance: this.calculateRelevance(searchTerm, func.name),
            });
          }
        }
      }
    }

    // Sort by relevance and limit results
    results.sort((a, b) => b.relevance - a.relevance);

    if (options.maxResults) {
      results.splice(options.maxResults);
    }

    logger.debug('CodemapUtils', 'Search completed', {
      resultsFound: results.length,
      searchTerm,
      searchType,
    });

    return results;
  }

  /**
   * Get cached representation
   */
  getCachedRepresentation(id: string): any | null {
    return this.cache.get(id) ?? null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('CodemapUtils', 'Cache cleared');
  }

  // Private Methods

  /**
   * Initialize code patterns
   */
  private initializeCodePatterns(): void {
    // Function patterns
    this.codePatterns.set('function', [
      {
        type: 'function',
        name: 'async-functions',
        pattern: /^async\s+\w+/,
        description: 'Asynchronous functions',
        category: 'async',
      },
      {
        type: 'function',
        name: 'test-functions',
        pattern: /^(test|it|describe)\s+/,
        description: 'Test functions',
        category: 'testing',
      },
      {
        type: 'function',
        name: 'handler-functions',
        pattern: /(\w+Handler|on\w+|handle\w+)/,
        description: 'Event handler functions',
        category: 'events',
      },
    ]);

    // Class patterns
    this.codePatterns.set('class', [
      {
        type: 'class',
        name: 'test-classes',
        pattern: /\w+Test|Test\w+/,
        description: 'Test classes',
        category: 'testing',
      },
      {
        type: 'class',
        name: 'service-classes',
        pattern: /\w+Service/,
        description: 'Service classes',
        category: 'architecture',
      },
      {
        type: 'class',
        name: 'component-classes',
        pattern: /\w+Component/,
        description: 'React component classes',
        category: 'ui',
      },
    ]);
  }

  /**
   * Create full representation
   */
  private createFullRepresentation(codemapData: CodemapData): {
    files: CompactFileInfo[];
    functions: CompactFunctionInfo[];
    classes: CompactClassInfo[];
  } {
    const files: CompactFileInfo[] = [];
    const functions: CompactFunctionInfo[] = [];
    const classes: CompactClassInfo[] = [];

    for (const [filePath, analysis] of Array.from(codemapData.files.entries())) {
      const fileInfo: CompactFileInfo = {
        path: filePath,
        language: analysis.language,
        linesOfCode: analysis.metrics.linesOfCode,
        complexity: analysis.complexity.cyclomaticComplexity,
        functions: analysis.structure.functions.length,
        classes: analysis.structure.classes.length,
        issues: analysis.issues.length,
        signals: [], // Would extract signals here
      };
      files.push(fileInfo);

      for (const func of analysis.structure.functions) {
        functions.push({
          name: func.name,
          file: filePath,
          complexity: func.complexity,
          line: func.position.line,
          signals: [], // Would extract signals here
        });
      }

      for (const cls of analysis.structure.classes) {
        classes.push({
          name: cls.name,
          file: filePath,
          methods: cls.methods.length,
          properties: cls.properties.length,
          line: cls.position.line,
          signals: [], // Would extract signals here
        });
      }
    }

    return { files, functions, classes };
  }

  /**
   * Create compact representation
   */
  private createCompactRepresentation(codemapData: CodemapData): {
    files: CompactFileInfo[];
    functions: CompactFunctionInfo[];
    classes: CompactClassInfo[];
  } {
    const { files, functions, classes } = this.createFullRepresentation(codemapData);

    return {
      files: files.sort((a, b) => b.linesOfCode - a.linesOfCode).slice(0, 50),
      functions: functions.sort((a, b) => b.complexity - a.complexity).slice(0, 100),
      classes: classes.sort((a, b) => b.methods - a.methods).slice(0, 50),
    };
  }

  /**
   * Create summary representation
   */
  private createSummaryRepresentation(codemapData: CodemapData): {
    files: CompactFileInfo[];
    functions: CompactFunctionInfo[];
    classes: CompactClassInfo[];
  } {
    const { files, functions, classes } = this.createFullRepresentation(codemapData);

    return {
      files: files.sort((a, b) => b.linesOfCode - a.linesOfCode).slice(0, 20),
      functions: functions.sort((a, b) => b.complexity - a.complexity).slice(0, 30),
      classes: classes.sort((a, b) => b.methods - a.methods).slice(0, 20),
    };
  }

  /**
   * Create minimal representation
   */
  private createMinimalRepresentation(codemapData: CodemapData): {
    files: CompactFileInfo[];
    functions: CompactFunctionInfo[];
    classes: CompactClassInfo[];
  } {
    const { files, functions, classes } = this.createFullRepresentation(codemapData);

    return {
      files: files.sort((a, b) => b.linesOfCode - a.linesOfCode).slice(0, 10),
      functions: functions.sort((a, b) => b.complexity - a.complexity).slice(0, 15),
      classes: classes.sort((a, b) => b.methods - a.methods).slice(0, 10),
    };
  }

  /**
   * Helper methods for filtering and processing
   */
  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(text);
      } catch {
        return text.toLowerCase().includes(pattern.toLowerCase());
      }
    });
  }

  private shouldIncludeFile(
    filePath: string,
    analysis: CodeAnalysisResult,
    options: FilterOptions,
  ): boolean {
    // File pattern filter
    if (options.filePatterns && options.filePatterns.length > 0) {
      if (!options.filePatterns.some((pattern) => filePath.includes(pattern))) {
        return false;
      }
    }

    // Language filter
    if (options.languages && options.languages.length > 0) {
      if (!options.languages.includes(analysis.language)) {
        return false;
      }
    }

    // Complexity range filter
    if (options.complexityRange) {
      const complexity = analysis.complexity.cyclomaticComplexity;
      if (complexity < options.complexityRange.min || complexity > options.complexityRange.max) {
        return false;
      }
    }

    // Issue type filter
    if (options.issueTypes && options.issueTypes.length > 0) {
      const hasIssueType = analysis.issues.some((issue) =>
        options.issueTypes!.includes(issue.type),
      );
      if (!hasIssueType) {
        return false;
      }
    }

    return true;
  }

  private shouldIncludeFunction(func: FunctionInfo, options: ExtractionOptions): boolean {
    if (!options.includeExported && func.isExported) {
      return false;
    }
    if (!options.includePrivate && func.name.startsWith('_')) {
      return false;
    }
    if (!options.includeInternal && func.name.startsWith('#')) {
      return false;
    }
    return true;
  }

  private shouldIncludeClass(cls: ClassInfo, options: ExtractionOptions): boolean {
    if (!options.includeExported && cls.decorators.some((dec) => dec.includes('export'))) {
      return false;
    }
    if (!options.includePrivate && cls.name.startsWith('_')) {
      return false;
    }
    return true;
  }

  private shouldIncludeVariable(variable: VariableInfo, options: ExtractionOptions): boolean {
    if (!options.includeExported && variable.isExported) {
      return false;
    }
    if (!options.includePrivate && variable.name.startsWith('_')) {
      return false;
    }
    return true;
  }

  private calculateAverageComplexity(codemapData: CodemapData): number {
    const files = Array.from(codemapData.files.values());
    if (files.length === 0) {
      return 0;
    }

    const totalComplexity = files.reduce(
      (sum, file) => sum + file.complexity.cyclomaticComplexity,
      0,
    );
    return Math.round(totalComplexity / files.length);
  }

  private getLanguageDistribution(codemapData: CodemapData): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const analysis of Array.from(codemapData.files.values())) {
      distribution[analysis.language] = (distribution[analysis.language] || 0) + 1;
    }

    return distribution;
  }

  private createDependencySummary(codemapData: CodemapData): Array<{
    source: string;
    target: string;
    count: number;
  }> {
    const dependencyMap = new Map<string, number>();

    for (const analysis of Array.from(codemapData.files.values())) {
      for (const dep of analysis.dependencies) {
        if (!dep.isExternal) {
          const key = `${analysis.filePath} -> ${dep.module}`;
          dependencyMap.set(key, (dependencyMap.get(key) || 0) + 1);
        }
      }
    }

    return Array.from(dependencyMap.entries())
      .map(([key, count]) => {
        const [source, target] = key.split(' -> ');
        return { source, target, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Limit to top 50 dependencies
  }

  private calculateMetrics(files: Map<string, CodeAnalysisResult>): any {
    const fileArray = Array.from(files.values());

    return {
      totalFiles: fileArray.length,
      totalLines: fileArray.reduce((sum, file) => sum + file.metrics.linesOfCode, 0),
      totalFunctions: fileArray.reduce((sum, file) => sum + file.metrics.functionsCount, 0),
      totalClasses: fileArray.reduce((sum, file) => sum + file.metrics.classesCount, 0),
      averageComplexity: this.calculateAverageComplexity({ files } as any),
      languageDistribution: this.getLanguageDistribution({ files } as any),
      issueCount: fileArray.reduce((sum, file) => sum + file.issues.length, 0),
      duplicateCodeBlocks: fileArray.reduce(
        (sum, file) => sum + file.metrics.duplicateCodeBlocks,
        0,
      ),
    };
  }

  private calculateRelevance(searchTerm: string, text: string): number {
    const lowerSearch = searchTerm.toLowerCase();
    const lowerText = text.toLowerCase();

    if (lowerText === lowerSearch) {
      return 100;
    }
    if (lowerText.startsWith(lowerSearch)) {
      return 90;
    }
    if (lowerText.includes(lowerSearch)) {
      return 70;
    }
    if (this.fuzzyMatch(lowerSearch, lowerText)) {
      return 50;
    }

    return 0;
  }

  private fuzzyMatch(search: string, text: string): boolean {
    let searchIndex = 0;
    for (let i = 0; i < text.length && searchIndex < search.length; i++) {
      if (text[i] === search[searchIndex]) {
        searchIndex++;
      }
    }
    return searchIndex === search.length;
  }

  private estimateTokens(text: string): number {
    // Rough token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private cleanupCache(): void {
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => {
        const aTime = a[1].generatedAt?.getTime() || 0;
        const bTime = b[1].generatedAt?.getTime() || 0;
        return aTime - bTime;
      });

      const toRemove = Math.floor(entries.length * 0.5);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i]![0]);
      }
    }
  }
}
