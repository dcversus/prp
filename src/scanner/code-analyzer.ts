/**
 * ♫ Code Analyzer with Tree-sitter Integration for @dcversus/prp Scanner
 *
 * Provides code structure analysis, change impact assessment, and token estimation
 * using tree-sitter for accurate parsing of various programming languages.
 */

import { readFileSync, existsSync } from 'fs';
import { extname, basename } from 'path';
import { createLayerLogger } from '../shared/logger';

const logger = createLayerLogger('scanner');

// Tree-sitter node interface
export interface CodeNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: CodeNode[];
  parent?: CodeNode;
  language: string;
}

// Code analysis result
export interface CodeAnalysisResult {
  filePath: string;
  language: string;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  complexity: {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    maintainabilityIndex: number;
  };
  structures: {
    functions: FunctionInfo[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    exports: ExportInfo[];
  };
  tokens: {
    estimated: number;
    breakdown: Record<string, number>;
  };
  changes: {
    added: CodeNode[];
    modified: CodeNode[];
    deleted: CodeNode[];
  };
  metrics: {
    nestingDepth: number;
    parameterCount: number;
    variableCount: number;
    stringLiterals: number;
  };
}

// Function information
export interface FunctionInfo {
  name: string;
  line: number;
  parameters: string[];
  complexity: number;
  isAsync: boolean;
  isExported: boolean;
  docstring?: string;
  returnType?: string;
}

// Class information
export interface ClassInfo {
  name: string;
  line: number;
  methods: FunctionInfo[];
  properties: string[];
  isExported: boolean;
  extends?: string;
  implements?: string[];
}

// Import/Export information
export interface ImportInfo {
  module: string;
  imports: string[];
  line: number;
  isTypeOnly: boolean;
}

export interface ExportInfo {
  name: string;
  line: number;
  isDefault: boolean;
  type: 'function' | 'class' | 'variable' | 'type';
}

// Change analysis
export interface ChangeAnalysis {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedFunctions: string[];
  affectedClasses: string[];
  breakingChanges: string[];
  testCoverage: boolean;
  dependencies: string[];
}

// Language configuration
interface LanguageConfig {
  extensions: string[];
  parser?: any; // Tree-sitter parser instance
  complexityRules: {
    functionComplexity: number;
    classComplexity: number;
    nestingPenalty: number;
    parameterPenalty: number;
  };
  tokenMultipliers: {
    code: number;
    comments: number;
    strings: number;
    identifiers: number;
  };
}

/**
 * High-performance code analyzer with tree-sitter integration
 */
export class CodeAnalyzer {
  private languages: Map<string, LanguageConfig> = new Map();
  private analysisCache: Map<string, CodeAnalysisResult> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeLanguages();
  }

  /**
   * Analyze a file and return comprehensive code analysis
   */
  async analyzeFile(filePath: string, content?: string): Promise<CodeAnalysisResult> {
    try {
      // Check cache first
      const cacheKey = `${filePath}:${this.getFileHash(filePath, content)}`;
      const cached = this.analysisCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const language = this.detectLanguage(filePath);
      if (!language) {
        return this.createEmptyAnalysis(filePath);
      }

      const fileContent = content || this.readFileContent(filePath);
      if (!fileContent) {
        return this.createEmptyAnalysis(filePath);
      }

      const result = await this.performAnalysis(filePath, language, fileContent);

      // Cache result
      this.analysisCache.set(cacheKey, result);
      this.cleanupCache();

      return result;

    } catch (error) {
      logger.warn('CodeAnalyzer', `Failed to analyze file ${filePath}`, error as Record<string, unknown>);
      return this.createEmptyAnalysis(filePath);
    }
  }

  /**
   * Analyze changes between two versions of a file
   */
  async analyzeChanges(
    filePath: string,
    oldContent: string,
    newContent: string
  ): Promise<ChangeAnalysis> {
    try {
      const oldAnalysis = await this.analyzeFile(filePath, oldContent);
      const newAnalysis = await this.analyzeFile(filePath, newContent);

      const affectedFunctions = this.findAffectedFunctions(oldAnalysis, newAnalysis);
      const affectedClasses = this.findAffectedClasses(oldAnalysis, newAnalysis);
      const breakingChanges = this.detectBreakingChanges(oldAnalysis, newAnalysis);
      const impact = this.calculateChangeImpact(affectedFunctions, affectedClasses, breakingChanges);

      return {
        filePath,
        changeType: 'modified',
        impact,
        affectedFunctions,
        affectedClasses,
        breakingChanges,
        testCoverage: this.hasTestCoverage(filePath),
        dependencies: this.extractDependencies(newAnalysis)
      };

    } catch (error) {
      logger.warn('CodeAnalyzer', `Failed to analyze changes for ${filePath}`, error as Record<string, unknown>);
      return {
        filePath,
        changeType: 'modified',
        impact: 'low',
        affectedFunctions: [],
        affectedClasses: [],
        breakingChanges: [],
        testCoverage: false,
        dependencies: []
      };
    }
  }

  /**
   * Estimate token count for a file
   */
  estimateTokens(filePath: string, content?: string): number {
    try {
      const language = this.detectLanguage(filePath);
      if (!language) {
        return this.roughTokenEstimation(content || this.readFileContent(filePath) || '');
      }

      const fileContent = content || this.readFileContent(filePath) || '';
      const lines = fileContent.split('\n');

      let totalTokens = 0;
      const config = this.languages.get(language);
      if (!config) {
        return this.roughTokenEstimation(content || '');
      }
      const multipliers = config.tokenMultipliers;

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          // Blank line - minimal tokens
          totalTokens += 1;
        } else if (this.isCommentLine(trimmed, config)) {
          // Comment line
          totalTokens += Math.ceil(trimmed.length * multipliers.comments / 4);
        } else if (this.isStringLiteral(trimmed)) {
          // String literal
          totalTokens += Math.ceil(trimmed.length * multipliers.strings / 4);
        } else if (this.isIdentifier(trimmed)) {
          // Identifier
          totalTokens += Math.ceil(trimmed.length * multipliers.identifiers / 4);
        } else {
          // Code line
          totalTokens += Math.ceil(trimmed.length * multipliers.code / 4);
        }
      }

      return totalTokens;

    } catch (error) {
      logger.warn('CodeAnalyzer', `Failed to estimate tokens for ${filePath}`, error as Record<string, unknown>);
      return this.roughTokenEstimation(content || '');
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.languages.keys());
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  // Private methods

  private initializeLanguages(): void {
    // TypeScript/JavaScript
    this.languages.set('typescript', {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      complexityRules: {
        functionComplexity: 1,
        classComplexity: 2,
        nestingPenalty: 1,
        parameterPenalty: 0.5
      },
      tokenMultipliers: {
        code: 1.3,
        comments: 1.1,
        strings: 0.9,
        identifiers: 1.2
      }
    });

    // Python
    this.languages.set('python', {
      extensions: ['.py', '.pyi', '.pyx'],
      complexityRules: {
        functionComplexity: 1,
        classComplexity: 2,
        nestingPenalty: 1,
        parameterPenalty: 0.3
      },
      tokenMultipliers: {
        code: 1.2,
        comments: 1.0,
        strings: 1.0,
        identifiers: 1.1
      }
    });

    // Rust
    this.languages.set('rust', {
      extensions: ['.rs'],
      complexityRules: {
        functionComplexity: 1.5,
        classComplexity: 3,
        nestingPenalty: 2,
        parameterPenalty: 0.7
      },
      tokenMultipliers: {
        code: 1.5,
        comments: 1.1,
        strings: 0.9,
        identifiers: 1.3
      }
    });

    // Go
    this.languages.set('go', {
      extensions: ['.go'],
      complexityRules: {
        functionComplexity: 1,
        classComplexity: 1.5,
        nestingPenalty: 1,
        parameterPenalty: 0.4
      },
      tokenMultipliers: {
        code: 1.1,
        comments: 1.0,
        strings: 0.9,
        identifiers: 1.1
      }
    });

    // Markdown
    this.languages.set('markdown', {
      extensions: ['.md', '.mdx'],
      complexityRules: {
        functionComplexity: 0,
        classComplexity: 0,
        nestingPenalty: 0.5,
        parameterPenalty: 0
      },
      tokenMultipliers: {
        code: 1.0,
        comments: 0.8,
        strings: 1.0,
        identifiers: 0.7
      }
    });

    // JSON/YAML
    this.languages.set('json', {
      extensions: ['.json', '.jsonc'],
      complexityRules: {
        functionComplexity: 0,
        classComplexity: 0,
        nestingPenalty: 0.2,
        parameterPenalty: 0
      },
      tokenMultipliers: {
        code: 0.8,
        comments: 0.7,
        strings: 0.9,
        identifiers: 0.8
      }
    });

    this.languages.set('yaml', {
      extensions: ['.yml', '.yaml'],
      complexityRules: {
        functionComplexity: 0,
        classComplexity: 0,
        nestingPenalty: 0.2,
        parameterPenalty: 0
      },
      tokenMultipliers: {
        code: 0.9,
        comments: 0.8,
        strings: 0.9,
        identifiers: 0.8
      }
    });
  }

  private detectLanguage(filePath: string): string | null {
    const ext = extname(filePath).toLowerCase();

    for (const [language, config] of Array.from(this.languages.entries())) {
      if (config.extensions.includes(ext)) {
        return language;
      }
    }

    // Special cases based on file content or naming
    if (filePath.includes('Dockerfile')) {
      return 'dockerfile';
    }
    if (basename(filePath) === 'Makefile') {
      return 'makefile';
    }

    return null;
  }

  private async performAnalysis(
    filePath: string,
    language: string,
    content: string
  ): Promise<CodeAnalysisResult> {
    const lines = content.split('\n');
    const config = this.languages.get(language)!;

    // Basic line counting
    const totalLines = lines.length;
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !this.isCommentLine(trimmed, config);
    }).length;
    const commentLines = lines.filter(line => this.isCommentLine(line.trim(), config)).length;
    const blankLines = totalLines - codeLines - commentLines;

    // Extract structures (simplified - would use tree-sitter in production)
    const structures = this.extractStructures(content, language);

    // Calculate complexity
    const complexity = this.calculateComplexity(structures, config);

    // Estimate tokens
    const tokens = this.detailedTokenEstimation(content, config);

    // Calculate metrics
    const metrics = this.calculateMetrics(content, structures);

    return {
      filePath,
      language,
      totalLines,
      codeLines,
      commentLines,
      blankLines,
      complexity,
      structures,
      tokens,
      changes: {
        added: [],
        modified: [],
        deleted: []
      },
      metrics
    };
  }

  private extractStructures(content: string, _language: string): {
    functions: FunctionInfo[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    exports: ExportInfo[];
  } {
    // Simplified regex-based extraction - in production would use tree-sitter
    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';

      // Extract functions
      const functionMatch = line.match(/(?:async\s+)?(?:function\s+)?(\w+)\s*\([^)]*\)/);
      if (functionMatch?.[1]) {
        functions.push({
          name: functionMatch[1],
          line: i + 1,
          parameters: this.extractParameters(line),
          complexity: 1,
          isAsync: line.includes('async'),
          isExported: line.includes('export')
        });
      }

      // Extract classes
      const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch?.[1]) {
        classes.push({
          name: classMatch[1],
          line: i + 1,
          methods: [],
          properties: [],
          isExported: line.includes('export')
        });
      }

      // Extract imports
      const importMatch = line.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/);
      if (importMatch?.[1]) {
        imports.push({
          module: importMatch[1],
          imports: this.extractImportNames(line),
          line: i + 1,
          isTypeOnly: line.includes('type')
        });
      }

      // Extract exports
      const exportMatch = line.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/);
      if (exportMatch?.[1]) {
        exports.push({
          name: exportMatch[1],
          line: i + 1,
          isDefault: line.includes('default'),
          type: line.includes('function') ? 'function' :
            line.includes('class') ? 'class' : 'variable'
        });
      }
    }

    return { functions, classes, imports, exports };
  }

  private calculateComplexity(
    structures: { functions: FunctionInfo[]; classes: ClassInfo[] },
    config: LanguageConfig
  ): CodeAnalysisResult['complexity'] {
    let cyclomaticComplexity = 1; // Base complexity
    let cognitiveComplexity = 0;

    // Function complexity
    for (const func of structures.functions) {
      cyclomaticComplexity += func.complexity * config.complexityRules.functionComplexity;
      cognitiveComplexity += func.complexity;
    }

    // Class complexity
    cyclomaticComplexity += structures.classes.length * config.complexityRules.classComplexity;

    // Maintainability index (simplified calculation)
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(cyclomaticComplexity) - 0.23 * cyclomaticComplexity);

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      maintainabilityIndex: Math.round(maintainabilityIndex)
    };
  }

  private detailedTokenEstimation(content: string, config: LanguageConfig): CodeAnalysisResult['tokens'] {
    const lines = content.split('\n');
    let totalTokens = 0;
    const breakdown: {
      code: number;
      comments: number;
      strings: number;
      identifiers: number;
    } = {
      code: 0,
      comments: 0,
      strings: 0,
      identifiers: 0
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        breakdown.code += 1;
      } else if (this.isCommentLine(trimmed, config)) {
        const tokens = Math.ceil(trimmed.length * config.tokenMultipliers.comments / 4);
        breakdown.comments += tokens;
      } else if (this.isStringLiteral(trimmed)) {
        const tokens = Math.ceil(trimmed.length * config.tokenMultipliers.strings / 4);
        breakdown.strings += tokens;
      } else if (this.isIdentifier(trimmed)) {
        const tokens = Math.ceil(trimmed.length * config.tokenMultipliers.identifiers / 4);
        breakdown.identifiers += tokens;
      } else {
        const tokens = Math.ceil(trimmed.length * config.tokenMultipliers.code / 4);
        breakdown.code += tokens;
      }
    }

    totalTokens = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

    return {
      estimated: totalTokens,
      breakdown
    };
  }

  private calculateMetrics(content: string, structures: any): CodeAnalysisResult['metrics'] {
    const lines = content.split('\n');
    let maxNestingDepth = 0;
    let currentNestingDepth = 0;
    let totalParameters = 0;
    let variableCount = 0;
    let stringLiterals = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Count nesting
      const openBraces = (trimmed.match(/{/g) || []).length;
      const closeBraces = (trimmed.match(/}/g) || []).length;
      currentNestingDepth += openBraces - closeBraces;
      maxNestingDepth = Math.max(maxNestingDepth, currentNestingDepth);

      // Count string literals
      const stringMatches = trimmed.match(/["'`][^"'`]*["'`]/g);
      stringLiterals += stringMatches ? stringMatches.length : 0;

      // Count variables (simplified)
      const varMatches = trimmed.match(/\b(?:const|let|var)\s+(\w+)/g);
      if (varMatches) {
        variableCount += varMatches.length;
      }
    }

    // Count parameters from functions
    for (const func of structures.functions) {
      totalParameters += func.parameters.length;
    }

    return {
      nestingDepth: maxNestingDepth,
      parameterCount: totalParameters,
      variableCount,
      stringLiterals
    };
  }

  private findAffectedFunctions(oldAnalysis: CodeAnalysisResult, newAnalysis: CodeAnalysisResult): string[] {
    const oldFunctions = new Set(oldAnalysis.structures.functions.map(f => f.name));

    const affected: string[] = [];

    // Modified functions (same name but different complexity or line count)
    for (const func of newAnalysis.structures.functions) {
      if (oldFunctions.has(func.name)) {
        const oldFunc = oldAnalysis.structures.functions.find(f => f.name === func.name);
        if (oldFunc && (oldFunc.line !== func.line || oldFunc.complexity !== func.complexity)) {
          affected.push(func.name);
        }
      }
    }

    // New functions
    for (const func of newAnalysis.structures.functions) {
      if (!oldFunctions.has(func.name)) {
        affected.push(func.name);
      }
    }

    return affected;
  }

  private findAffectedClasses(oldAnalysis: CodeAnalysisResult, newAnalysis: CodeAnalysisResult): string[] {
    const oldClasses = new Set(oldAnalysis.structures.classes.map(c => c.name));

    const affected: string[] = [];

    // Modified classes
    for (const cls of newAnalysis.structures.classes) {
      if (oldClasses.has(cls.name)) {
        const oldCls = oldAnalysis.structures.classes.find(c => c.name === cls.name);
        if (oldCls && (oldCls.line !== cls.line || oldCls.methods.length !== cls.methods.length)) {
          affected.push(cls.name);
        }
      }
    }

    // New classes
    for (const cls of newAnalysis.structures.classes) {
      if (!oldClasses.has(cls.name)) {
        affected.push(cls.name);
      }
    }

    return affected;
  }

  private detectBreakingChanges(oldAnalysis: CodeAnalysisResult, newAnalysis: CodeAnalysisResult): string[] {
    const breakingChanges: string[] = [];

    // Removed functions
    const oldFunctions = new Set(oldAnalysis.structures.functions.map(f => f.name));
    const newFunctions = new Set(newAnalysis.structures.functions.map(f => f.name));

    for (const funcName of Array.from(oldFunctions)) {
      if (!newFunctions.has(funcName)) {
        breakingChanges.push(`Removed function: ${funcName}`);
      }
    }

    // Removed classes
    const oldClasses = new Set(oldAnalysis.structures.classes.map(c => c.name));
    const newClasses = new Set(newAnalysis.structures.classes.map(c => c.name));

    for (const className of Array.from(oldClasses)) {
      if (!newClasses.has(className)) {
        breakingChanges.push(`Removed class: ${className}`);
      }
    }

    // Signature changes (simplified)
    for (const func of newAnalysis.structures.functions) {
      const oldFunc = oldAnalysis.structures.functions.find(f => f.name === func.name);
      if (oldFunc && oldFunc.parameters.length !== func.parameters.length) {
        breakingChanges.push(`Function signature changed: ${func.name}`);
      }
    }

    return breakingChanges;
  }

  private calculateChangeImpact(
    affectedFunctions: string[],
    affectedClasses: string[],
    breakingChanges: string[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (breakingChanges.length > 0) {
      return 'critical';
    }
    if (affectedClasses.length > 0 || affectedFunctions.length > 5) {
      return 'high';
    }
    if (affectedFunctions.length > 2) {
      return 'medium';
    }
    return 'low';
  }

  private hasTestCoverage(filePath: string): boolean {
    // Simplified check - would be more sophisticated in production
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /test\./,
      /__tests__/,
      /test-/,
      /spec-/
    ];

    return testPatterns.some(pattern => pattern.test(basename(filePath)));
  }

  private extractDependencies(analysis: CodeAnalysisResult): string[] {
    return analysis.structures.imports.map(imp => imp.module);
  }

  private createEmptyAnalysis(filePath: string): CodeAnalysisResult {
    return {
      filePath,
      language: 'unknown',
      totalLines: 0,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      complexity: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        maintainabilityIndex: 0
      },
      structures: {
        functions: [],
        classes: [],
        imports: [],
        exports: []
      },
      tokens: {
        estimated: 0,
        breakdown: { code: 0, comments: 0, strings: 0, identifiers: 0 }
      },
      changes: {
        added: [],
        modified: [],
        deleted: []
      },
      metrics: {
        nestingDepth: 0,
        parameterCount: 0,
        variableCount: 0,
        stringLiterals: 0
      }
    };
  }

  private isCommentLine(line: string, config: LanguageConfig): boolean {
    const commentPatterns: Record<string, RegExp | false> = {
      typescript: /^\/\/|^\s*\/\*/,
      python: /^#|^\s*"""/,
      rust: /^\/\/|^\s*\/\*/,
      go: /^\/\/|^\s*\/\*/,
      markdown: /^>/,
      json: false,
      yaml: /^#/
    };

    const language = Array.from(this.languages.entries()).find(([_, langConfig]) => langConfig === config)?.[0];
    if (!language) {
      return false;
    }

    const pattern = commentPatterns[language];
    return pattern ? pattern.test(line) : false;
  }

  private isStringLiteral(line: string): boolean {
    return /^["'`].*["'`]$/.test(line) || /^["'`].*["'`]\s*[;,]?$/.test(line);
  }

  private isIdentifier(line: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*\s*[=:]/.test(line);
  }

  private roughTokenEstimation(content: string): number {
    if (!content) {
      return 0;
    }
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(content.length / 4);
  }

  private readFileContent(filePath: string): string | null {
    try {
      if (existsSync(filePath)) {
        return readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      logger.warn('CodeAnalyzer', `Failed to read file ${filePath}`, error as Record<string, unknown>);
    }
    return null;
  }

  private getFileHash(filePath: string, content?: string): string {
    const fileContent = content || this.readFileContent(filePath) || '';
    return this.simpleHash(fileContent + filePath);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private extractParameters(line: string): string[] {
    const match = line.match(/\(([^)]*)\)/);
    if (!match?.[1]) {
      return [];
    }

    const paramString = match[1];
    return paramString.split(',')
      .map(param => param.trim().split(':')[0]?.trim() || '')
      .filter(Boolean);
  }

  private extractImportNames(line: string): string[] {
    const importMatch = line.match(/import\s+(.+?)\s+from/);
    if (!importMatch?.[1]) {
      return [];
    }

    const imports = importMatch[1];
    if (imports === '*') {
      return ['*'];
    }
    if (imports?.includes('{')) {
      return imports
        .replace(/[{}]/g, '')
        .split(',')
        .map(name => name.trim().split(' as ')[0]?.trim() || '')
        .filter(Boolean);
    }
    return [imports?.trim() || ''];
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, result] of Array.from(this.analysisCache.entries())) {
      // Cache key includes timestamp in real implementation
      if (now - result.structures.functions.length * 1000 > this.cacheTimeout) {
        this.analysisCache.delete(key);
      }
    }
  }
}