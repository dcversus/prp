/**
 * JSON to Markdown Converter Utility
 *
 * Converts codemap JSON data to condensed markdown format for token optimization
 * and provides functionality to extract specific parts for focused analysis.
 */

import type { Codemap, FileInfo, FunctionInfo, ClassInfo} from "./types";

export interface ConversionOptions {
  includeMetrics?: boolean;
  includeComplexity?: boolean;
  includeDependencies?: boolean;
  maxDepth?: number;
  sections?: {
    overview?: boolean;
    files?: boolean;
    functions?: boolean;
    classes?: boolean;
    imports?: boolean;
    metrics?: boolean;
  };
}

export interface TokenUsage {
  jsonTokens: number;
  markdownTokens: number;
  compressionRatio: number;
  savings: number;
}

export class MarkdownConverter {
  private readonly defaultOptions: ConversionOptions = {
    includeMetrics: true,
    includeComplexity: true,
    includeDependencies: true,
    maxDepth: 3,
    sections: {
      overview: true,
      files: true,
      functions: true,
      classes: true,
      imports: true,
      metrics: true,
    },
  };

  /**
   * Convert full codemap to markdown format
   */
  convertToMarkdown(codemap: Codemap, options: Partial<ConversionOptions> = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const lines: string[] = [];

    // Header
    lines.push(`# Codemap: ${codemap.metadata.projectName}`);
    lines.push(`**Generated**: ${new Date(codemap.metadata.generatedAt).toLocaleString()}`);
    lines.push(`**Commit**: ${codemap.metadata.commitHash}`);
    lines.push(
      `**Files**: ${codemap.files?.size || 0} | **Functions**: ${this.countFunctions(codemap)} | **Classes**: ${this.countClasses(codemap)}`,
    );
    lines.push('');

    // Overview section
    if (opts.sections?.overview) {
      lines.push('## Overview');
      lines.push('');
      lines.push(
        `**Language Distribution**: ${Object.entries(codemap.metadata.languageDistribution)
          .map(([lang, count]) => `${lang} (${count})`)
          .join(', ')}`,
      );

      if (opts.includeMetrics && codemap.metrics) {
        lines.push('');
        lines.push('**Project Metrics**:');
        lines.push(`- Total Lines: ${codemap.metrics.totalLines}`);
        lines.push(`- Total Functions: ${codemap.metrics.totalFunctions}`);
        lines.push(`- Total Classes: ${codemap.metrics.totalClasses}`);
        lines.push(
          `- Avg Complexity: ${codemap.metrics.averageComplexity.toFixed(2)}`,
        );
      }
      lines.push('');
    }

    // Files section
    if (opts.sections?.files) {
      lines.push('## Files');
      lines.push('');

      for (const file of Array.from(codemap.files.values())) {
        lines.push(this.formatFileMarkdown(file, opts));
        lines.push('');
      }
    }

    // Summary metrics
    if (opts.sections?.metrics && opts.includeMetrics) {
      lines.push('## Summary Metrics');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|-------|');
      lines.push(`| Files | ${codemap.files?.size || 0} |`);
      lines.push(`| Functions | ${this.countFunctions(codemap)} |`);
      lines.push(`| Classes | ${this.countClasses(codemap)} |`);
      lines.push(`| Imports | ${this.countImports(codemap)} |`);

      if (codemap.metadata.metrics) {
        lines.push(`| Total Lines | ${codemap.metadata.metrics.totalLines} |`);
        lines.push(
          `| Avg Complexity | ${codemap.metadata.metrics.averageCyclomaticComplexity.toFixed(2)} |`,
        );
        lines.push(
          `| Maintainability Index | ${codemap.metadata.metrics.maintainabilityIndex.toFixed(1)} |`,
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Extract specific file(s) as focused markdown
   */
  extractFileMarkdown(
    codemap: Codemap,
    filePaths: string | string[],
    options: Partial<ConversionOptions> = {},
  ): string {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const opts = { ...this.defaultOptions, ...options };
    const lines: string[] = [];

    lines.push(`# Focused Codemap: ${paths.join(', ')}`);
    lines.push(`**Project**: ${codemap.metadata.projectName} (${codemap.metadata.commitHash})`);
    lines.push('');

    for (const filePath of paths) {
      const file = Array.from(codemap.files.values()).find((f) => f.path === filePath || f.path.endsWith(filePath));
      if (file) {
        lines.push(this.formatFileMarkdown(file, opts));
        lines.push('');
      } else {
        lines.push(`## File Not Found: ${filePath}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract functions with specific complexity or pattern
   */
  extractFunctionsByCriteria(
    codemap: Codemap,
    criteria: {
      complexity?: 'high' | 'medium' | 'low';
      pattern?: RegExp;
      minComplexity?: number;
    },
    options: Partial<ConversionOptions> = {},
  ): string {
    const opts = { ...this.defaultOptions, ...options };
    const lines: string[] = [];
    const matchingFunctions: { file: FileInfo; func: FunctionInfo }[] = [];

    // Find matching functions
    for (const file of codemap.files.values()) {
      for (const func of file.functions) {
        let matches = true;

        if (criteria.complexity) {
          const threshold =
            criteria.complexity === 'high' ? 10 : criteria.complexity === 'medium' ? 5 : 1;
          if (func.complexity.cyclomatic < threshold) {
            matches = false;
          }
        }

        if (criteria.minComplexity && func.complexity.cyclomatic < criteria.minComplexity) {
          matches = false;
        }

        if (criteria.pattern && !criteria.pattern.test(func.name)) {
          matches = false;
        }

        if (matches) {
          matchingFunctions.push({ file, func });
        }
      }
    }

    // Format output
    lines.push(`# Functions by Criteria`);
    lines.push(
      `**Complexity**: ${criteria.complexity || 'Any'} | **Pattern**: ${criteria.pattern?.source || 'None'}`,
    );
    lines.push(`**Matches**: ${matchingFunctions.length} functions`);
    lines.push('');

    for (const { file, func } of matchingFunctions) {
      lines.push(`## ${func.name} (${file.path})`);
      lines.push(`**Line**: ${func.position.line}-${func.position.line + Math.ceil(func.size / 80)}`);
      lines.push(`**Type**: ${func.type} | **Exported**: ${func.isExported ? 'Yes' : 'No'}`);

      if (opts.includeComplexity) {
        lines.push(
          `**Complexity**: ${func.complexity}`,
        );
      }

      // Generate a simple signature from available info
      const signature = `${func.name}(${(func.parameters || []).map(p => p.name + (p.optional ? '?' : '')).join(', ')})${func.returnType ? `: ${  func.returnType}` : ''}`;
      lines.push('');
      lines.push('```typescript');
      lines.push(signature);
      lines.push('```');

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Extract class hierarchy and relationships
   */
  extractClassHierarchy(codemap: Codemap, options: Partial<ConversionOptions> = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const lines: string[] = [];

    lines.push(`# Class Hierarchy`);
    lines.push(`**Project**: ${codemap.metadata.projectName}`);
    lines.push('');

    // Group classes by inheritance
    const inheritanceMap = new Map<string, ClassInfo[]>();
    const rootClasses: ClassInfo[] = [];

    for (const file of codemap.files.values()) {
      for (const cls of file.classes) {
        if (cls.baseClass) {
          if (!inheritanceMap.has(cls.baseClass)) {
            inheritanceMap.set(cls.baseClass, []);
          }
          inheritanceMap.get(cls.baseClass)!.push(cls);
        } else {
          rootClasses.push(cls);
        }
      }
    }

    // Display hierarchy
    const formatClass = (cls: ClassInfo, indent = 0) => {
      const indentStr = '  '.repeat(indent);
      lines.push(`${indentStr}**${cls.name}** (line ${cls.position.line})`);

      if (cls.methods.length > 0) {
        lines.push(`${indentStr}  Methods: ${cls.methods.map((m) => m.name).join(', ')}`);
      }

      if (cls.properties.length > 0) {
        lines.push(
          `${indentStr}  Properties: ${cls.properties.map((p) => `${p.name}:${p.type}`).join(', ')}`,
        );
      }

      // Show derived classes
      const derived = inheritanceMap.get(cls.name);
      if (derived) {
        for (const derivedClass of derived) {
          formatClass(derivedClass, indent + 1);
        }
      }
    };

    for (const rootClass of rootClasses) {
      formatClass(rootClass);
    }

    return lines.join('\n');
  }

  /**
   * Calculate token usage comparison
   */
  calculateTokenUsage(jsonStr: string, markdownStr: string): TokenUsage {
    // Approximate token calculation (1 token ≈ 4 characters)
    const jsonTokens = Math.ceil(jsonStr.length / 4);
    const markdownTokens = Math.ceil(markdownStr.length / 4);

    return {
      jsonTokens,
      markdownTokens,
      compressionRatio: jsonTokens / markdownTokens,
      savings: jsonTokens - markdownTokens,
    };
  }

  /**
   * Format individual file as markdown
   */
  private formatFileMarkdown(file: FileInfo, options: ConversionOptions): string {
    const lines: string[] = [];

    lines.push(`### ${file.path}`);
    lines.push(
      `**Language**: ${file.language} | **Lines**: ${file.metadata.lines} | **Size**: ${file.metadata.bytes} bytes`,
    );

    if (options.includeDependencies && file.dependencies.length > 0) {
      lines.push('');
      lines.push(`**Dependencies**: ${  file.dependencies.map((d) => `\`${d}\``).join(', ')}`);
    }

    // Classes
    if (options.sections?.classes && file.classes.length > 0) {
      lines.push('');
      lines.push('#### Classes');
      for (const cls of file.classes) {
        lines.push(`- **${cls.name}**${cls.exported ? ' (exported)' : ''}`);
        if (cls.baseClass) {
          lines.push(`  - Extends: ${cls.baseClass}`);
        }
        if (cls.methods.length > 0) {
          lines.push(`  - Methods: ${cls.methods.map((m) => m.name).join(', ')}`);
        }
      }
    }

    // Functions
    if (options.sections?.functions && file.functions.length > 0) {
      lines.push('');
      lines.push('#### Functions');
      for (const func of file.functions) {
        const complexityStr = options.includeComplexity
          ? ` (Complexity: ${func.complexity})`
          : '';
        lines.push(`- **${func.name}**${func.isExported ? ' (exported)' : ''}${complexityStr}`);
        const signature = `${func.name}(${(func.parameters || []).map(p => p.name + (p.optional ? '?' : '')).join(', ')})${func.returnType ? `: ${  func.returnType}` : ''}`;
        lines.push(`  \`${signature.replace(/\s+/g, ' ').trim()}\``);
      }
    }

    // Imports
    if (options.sections?.imports && file.imports.length > 0) {
      lines.push('');
      lines.push('#### Imports');
      for (const imp of file.imports) {
        lines.push(`- \`${imp.path}\` (${imp.source})`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Count total functions in codemap
   */
  private countFunctions(codemap: Codemap): number {
    return Array.from(codemap.files.values()).reduce((total, file) => total + file.functions.length, 0);
  }

  /**
   * Count total classes in codemap
   */
  private countClasses(codemap: Codemap): number {
    return Array.from(codemap.files.values()).reduce((total, file) => total + file.classes.length, 0);
  }

  /**
   * Count total imports in codemap
   */
  private countImports(codemap: Codemap): number {
    return Array.from(codemap.files.values()).reduce((total, file) => total + file.imports.length, 0);
  }
}
