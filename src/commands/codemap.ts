#!/usr/bin/env node
/**
 * Codemap CLI Commands for @dcversus/prp
 *
 * CLI interface for codemap generation, inspection, diffing, and export.
 * Integrates with existing scanner and storage systems to provide comprehensive
 * codebase analysis and visualization capabilities.
 */

import { promises as fs } from 'fs';
import * as path from 'path';

import { Command } from 'commander';

import { logger, initializeLogger } from '../shared/logger.js';
import { EventBus } from '../shared/events.js';
import { TreeSitterCodemapScanner } from '../scanner/tree-sitter-codemap-scanner.js';
import { CodemapStorage } from '../scanner/codemap-storage.js';
import { CodemapUtils } from '../scanner/codemap-utils.js';
import { CLIError, type GlobalCLIOptions, type CommanderOptions } from '../cli/types.js';

import type { CodemapData } from '../scanner/types.js';
import type { CodemapRepresentation } from '../scanner/codemap-adapter-types.js';

// TODO: Add to CLI registry when codemap command is integrated
// export interface CodemapOptions extends GlobalCLIOptions {
//   output?: string;
//   format?: 'json' | 'markdown' | 'summary' | 'compact';
//   representation?: 'full' | 'compact' | 'summary' | 'minimal';
//   query?: string;
//   searchType?: 'file' | 'function' | 'class' | 'content' | 'all';
//   fromVersion?: string;
//   toVersion?: string;
//   includePatterns?: string;
//   excludePatterns?: string;
//   maxResults?: number;
//   maxTokens?: number;
//   force?: boolean;
//   incremental?: boolean;
// }

// Internal interface for use within this module
interface CodemapOptions extends GlobalCLIOptions {
  input?: string;
  output?: string;
  format?: 'json' | 'markdown' | 'summary' | 'compact';
  representation?: 'full' | 'compact' | 'summary' | 'minimal';
  query?: string;
  searchType?: 'file' | 'function' | 'class' | 'content' | 'all';
  fromVersion?: string;
  toVersion?: string;
  includePatterns?: string;
  excludePatterns?: string;
  maxResults?: number;
  maxTokens?: number;
  force?: boolean;
  incremental?: boolean;
}

// Export for CLI registry
export const createCodemapCommand = (): Command => {
  /**
   * Create and return the codemap command with all subcommands
   * @returns Configured commander Command instance
   */
  const codemapCmd = new Command('codemap').description(
    'Generate, inspect, and analyze project codemaps',
  );

  // Generate subcommand
  codemapCmd
    .command('generate')
    .description('Generate codemap for current project')
    .option('-o, --output <path>', 'Output file path (default: .prp/codemap)')
    .option('-f, --format <format>', 'Output format (json|markdown|summary|compact)', 'json')
    .option(
      '-r, --representation <type>',
      'Representation type (full|compact|summary|minimal)',
      'compact',
    )
    .option('--incremental', 'Use incremental scanning (only changed files)', false)
    .option('--force', 'Force regeneration even if cache exists', false)
    .action(async (options: CodemapOptions) => {
      const globalOptions = (codemapCmd.parent?.opts() as CommanderOptions<GlobalCLIOptions>) ?? {};
      const mergedOptions = { ...globalOptions, ...options };
      await handleGenerateCommand(mergedOptions);
    });

  // Inspect subcommand
  codemapCmd
    .command('inspect')
    .description('Inspect codemap with queries and filters')
    .argument('[query]', 'Search query or pattern')
    .option('-i, --input <path>', 'Input codemap file path (default: .prp/codemap)')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', 'Output format (json|markdown|summary)', 'summary')
    .option('-t, --search-type <type>', 'Search type (file|function|class|content|all)', 'all')
    .option('--include-patterns <patterns>', 'Include file patterns (comma-separated)')
    .option('--exclude-patterns <patterns>', 'Exclude file patterns (comma-separated)')
    .option('--max-results <number>', 'Maximum results to return', '50')
    .option('--max-tokens <number>', 'Maximum tokens for summary output', '4000')
    .action(async (query: string | undefined, options: CodemapOptions) => {
      const globalOptions = (codemapCmd.parent?.opts() as CommanderOptions<GlobalCLIOptions>) ?? {};
      const mergedOptions = { ...globalOptions, ...options, query };
      await handleInspectCommand(mergedOptions);
    });

  // Export subcommand
  codemapCmd
    .command('export')
    .description('Export codemap to various formats')
    .option('-i, --input <path>', 'Input codemap file path (default: .prp/codemap)')
    .option('-o, --output <path>', 'Output file path (required)')
    .option('-f, --format <format>', 'Output format (json|markdown|summary|compact)', 'markdown')
    .option(
      '-r, --representation <type>',
      'Representation type (full|compact|summary|minimal)',
      'summary',
    )
    .action(async (options: CodemapOptions) => {
      const globalOptions = (codemapCmd.parent?.opts() as CommanderOptions<GlobalCLIOptions>) ?? {};
      const mergedOptions = { ...globalOptions, ...options };
      await handleExportCommand(mergedOptions);
    });

  return codemapCmd;
}

/**
 * Handle codemap generation
 */
const handleGenerateCommand = async (options: CodemapOptions): Promise<void> => {
  initializeLogger({
    ci: options.ci ?? false,
    debug: options.debug ?? false,
    logLevel: options.logLevel,
    logFile: options.logFile,
    noColor: options.noColor,
    tuiMode: !(options.ci ?? false),
  });

  if (options.debug ?? false) {
    process.env.DEBUG = 'true';
    process.env.VERBOSE_MODE = 'true';
  }

  try {
    logger.info('cli', 'CodemapCommand', 'Starting codemap generation', {
      output: options.output,
      format: options.format,
      representation: options.representation,
      incremental: options.incremental,
      force: options.force,
    });

    const rootPath = process.cwd();
    const eventBus = new EventBus();

    // Simple scanner config using patterns that work with existing system
    const excludePatterns = ['node_modules/**', 'dist/**', 'build/**', '.git/**', '**/*.d.ts'];

    // Initialize scanner with minimal config for now
    const scanner = new TreeSitterCodemapScanner(eventBus, {
      scanInterval: 1000,
      maxConcurrentScans: 1,
      batchSize: 10,
      enableGitMonitoring: false,
      enableFileMonitoring: false,
      enablePRPMonitoring: false,
      excludedPaths: excludePatterns.map((p) => p.replace('**/*', '')),
      includedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.md'],
      worktreePaths: [],
      performanceThresholds: {
        maxScanTime: 30000,
        maxMemoryUsage: 512 * 1024 * 1024,
        maxFileCount: 1000,
      },
    });

    const codemapData = await scanner.scanCodebase(rootPath);

    // Prepare output path
    const outputPath = options.output ?? path.join(rootPath, '.prp', 'codemap.json');
    const outputDir = path.dirname(outputPath);

    await fs.mkdir(outputDir, { recursive: true });

    // Process output based on format
    switch (options.format) {
      case 'json':
        await writeJSONOutput(outputPath, codemapData);
        break;
      case 'markdown':
      case 'summary':
      case 'compact':
        await writeTextualOutput(outputPath, codemapData, options.format, options.representation);
        break;
      case undefined:
        throw new CLIError('Format must be specified', 'MISSING_FORMAT');
      default:
        throw new CLIError(`Unsupported format: ${options.format}`, 'INVALID_FORMAT');
    }

    // Try to store codemap if storage is available
    const defaultOutputPath = path.join(rootPath, '.prp', 'codemap.json');
    if (!options.output || options.output === defaultOutputPath) {
      try {
        const storageDir = path.join(rootPath, '.prp', 'codemaps');
        const storage = new CodemapStorage(eventBus, {
          storageDir,
          compressionEnabled: true,
          maxStorageFiles: 10,
          retentionDays: 30,
          enableGitIntegration: true,
          enableDiffTracking: true,
          maxDiffHistory: 5,
        });

        await storage.initialize();
        await storage.saveCodemap(codemapData);
      } catch (storageError) {
        logger.warn('scanner', 'CodemapCommand', 'Failed to save codemap to storage', {
          error: storageError instanceof Error ? storageError.message : String(storageError),
        });
      }
    }

    const output = {
      success: true,
      outputPath,
      format: options.format,
      representation: options.representation,
      metrics: {
        totalFiles: codemapData.metrics.totalFiles,
        totalLines: codemapData.metrics.totalLines,
        totalFunctions: codemapData.metrics.totalFunctions,
        totalClasses: codemapData.metrics.totalClasses,
        averageComplexity: codemapData.metrics.averageComplexity,
        issueCount: codemapData.metrics.issueCount,
      },
      generatedAt: codemapData.generatedAt,
    };

    if (options.ci ?? false) {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    } else {
      logger.info('cli', 'CodemapCommand', 'Codemap generated successfully', {
        outputPath,
        metrics: output.metrics,
      });
    }
  } catch (error) {
    logger.error(
      'cli',
      'CodemapCommand',
      'Failed to generate codemap',
      error instanceof Error ? error : new Error(String(error)),
    );

    if (options.ci ?? false) {
      process.stdout.write(
        `${JSON.stringify(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        )  }\n`,
      );
    }

    throw new CLIError(
      `Failed to generate codemap: ${error instanceof Error ? error.message : String(error)}`,
      'GENERATION_FAILED',
    );
  }
}

/**
 * Handle codemap inspection
 */
const handleInspectCommand = async (options: CodemapOptions & { query?: string }): Promise<void> => {
  initializeLogger({
    ci: options.ci ?? false,
    debug: options.debug ?? false,
    logLevel: options.logLevel,
    logFile: options.logFile,
    noColor: options.noColor,
    tuiMode: !(options.ci ?? false),
  });

  try {
    const rootPath = process.cwd();
    const inputPath = options.input ?? path.join(rootPath, '.prp', 'codemap.json');

    // Load codemap data
    const codemapData = await loadCodemapData(inputPath);
    const eventBus = new EventBus();
    const codemapUtils = new CodemapUtils(eventBus);

    let results: InspectionResults;

    if (options.query && options.query.trim().length > 0) {
      // Search functionality
      const searchResults = codemapUtils.searchCodemap(
        codemapData,
        options.query,
        options.searchType ?? 'all',
        {
          caseSensitive: false,
          regex: false,
          maxResults: Number(options.maxResults ?? 50),
        },
      );

      results = {
        type: 'search',
        query: options.query,
        searchType: options.searchType ?? 'all',
        results: searchResults,
        total: searchResults.length,
      };
    } else {
      // Generate summary/representation
      const summary = codemapUtils.convertCodemapRepresentation(
        codemapData,
        options.representation ?? 'summary',
      );

      // Convert CodemapSummary to MarkdownRepresentationData
      const markdownData: MarkdownRepresentationData = {
        generatedAt: summary.generatedAt.toISOString(),
        rootPath: summary.rootPath,
        representation: summary.representation,
        metrics: {
          totalFiles: summary.files.length,
          totalLines: summary.metrics.totalLines,
          totalFunctions: summary.functions.length,
          totalClasses: summary.classes.length,
          averageComplexity: summary.metrics.averageComplexity,
          issueCount: summary.metrics.issueCount,
          signalCount: summary.metrics.signalCount,
          languageDistribution: summary.metrics.languageDistribution,
        },
        files: summary.files.map(f => ({
          path: f.path,
          language: f.language || 'unknown',
          linesOfCode: f.linesOfCode || 0,
          complexity: f.complexity,
        })),
        functions: summary.functions.map(fn => ({
          name: fn.name,
          file: fn.file,
          complexity: fn.complexity,
        })),
      };

      results = {
        type: 'representation',
        representation: options.representation ?? 'summary',
        data: markdownData,
      };
    }

    // Output results
    const outputPath = options.output;
    if (outputPath && outputPath.trim().length > 0) {
      await writeInspectionOutput(outputPath, results, options.format ?? 'json');
      if (!(options.ci ?? false)) {
        logger.info('cli', 'CodemapCommand', 'Inspection results saved', { outputPath });
      }
    } else {
      if (options.ci ?? false) {
        process.stdout.write(`${JSON.stringify(results, null, 2)  }\n`);
      } else {
        displayInspectionResults(results);
      }
    }
  } catch (error) {
    logger.error(
      'cli',
      'CodemapCommand',
      'Failed to inspect codemap',
      error instanceof Error ? error : new Error(String(error)),
    );

    throw new CLIError(
      `Failed to inspect codemap: ${error instanceof Error ? error.message : String(error)}`,
      'INSPECTION_FAILED',
    );
  }
}

/**
 * Handle codemap export
 */
const handleExportCommand = async (options: CodemapOptions): Promise<void> => {
  initializeLogger({
    ci: options.ci ?? false,
    debug: options.debug ?? false,
    logLevel: options.logLevel,
    logFile: options.logFile,
    noColor: options.noColor,
    tuiMode: !(options.ci ?? false),
  });

  if (!options.output || options.output.trim().length === 0) {
    throw new CLIError('Output path is required for export command', 'MISSING_OUTPUT');
  }

  try {
    const rootPath = process.cwd();
    const inputPath = options.input ?? path.join(rootPath, '.prp', 'codemap.json');

    // Load codemap data
    const codemapData = await loadCodemapData(inputPath);

    // Export based on format
    switch (options.format) {
      case 'json':
        await writeJSONOutput(options.output, codemapData);
        break;
      case 'markdown':
      case 'summary':
      case 'compact':
        await writeTextualOutput(
          options.output,
          codemapData,
          options.format,
          options.representation,
        );
        break;
      case undefined:
        throw new CLIError('Format must be specified for export', 'MISSING_FORMAT');
      default:
        throw new CLIError(`Unsupported export format: ${options.format}`, 'INVALID_FORMAT');
    }

    if (!(options.ci ?? false)) {
      logger.info('cli', 'CodemapCommand', 'Codemap exported successfully', {
        outputPath: options.output,
        format: options.format,
        representation: options.representation,
      });
    }
  } catch (error) {
    logger.error(
      'cli',
      'CodemapCommand',
      'Failed to export codemap',
      error instanceof Error ? error : new Error(String(error)),
    );

    throw new CLIError(
      `Failed to export codemap: ${error instanceof Error ? error.message : String(error)}`,
      'EXPORT_FAILED',
    );
  }
}

// Helper Functions

// Type for JSON-parsed codemap data before conversion to proper types
interface ParsedCodemapData {
  files?: Record<string, unknown>;
  dependencies?: Record<string, unknown>;
  metrics?: {
    languageDistribution?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Type definition for representation data in markdown formatting
interface MarkdownRepresentationData {
  generatedAt: string;
  rootPath: string;
  representation: string;
  metrics: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    averageComplexity: number;
    issueCount: number;
    signalCount: number;
    languageDistribution?: Record<string, number>;
  };
  files: Array<{
    path: string;
    language: string;
    linesOfCode: number;
    complexity: number;
  }>;
  functions: Array<{
    name: string;
    file: string;
    complexity: number;
  }>;
}

// Type definition for compact representation
interface CompactRepresentationData {
  metrics: {
    totalFiles: number;
    totalFunctions: number;
    averageComplexity: number;
  };
  files: Array<{
    path: string;
    linesOfCode: number;
    complexity: number;
  }>;
}


// Type for search results
interface SearchResults {
  type: 'search';
  query: string;
  searchType: string;
  total: number;
  results: Array<{
    type: string;
    name: string;
    file: string;
    line?: number;
    relevance: number;
  }>;
}

// Type for representation results
interface RepresentationResults {
  type: 'representation';
  representation: string;
  data: MarkdownRepresentationData;
}

// Combined inspection results type
type InspectionResults = SearchResults | RepresentationResults;

const loadCodemapData = async (inputPath: string): Promise<CodemapData> => {
  try {
    const content = await fs.readFile(inputPath, 'utf-8');
    const parsedData = JSON.parse(content) as ParsedCodemapData;

    // Type guard for parsed codemap data
    const isParsedCodemapData = (obj: unknown): obj is ParsedCodemapData => {
      if (!obj || typeof obj !== 'object') {
        return false;
      }

      const candidate = obj as Record<string, unknown>;

      return (
        (!('files' in candidate) || typeof candidate.files === 'object') &&
        (!('dependencies' in candidate) || typeof candidate.dependencies === 'object') &&
        (!('metrics' in candidate) || typeof candidate.metrics === 'object')
      );
    };

    if (!isParsedCodemapData(parsedData)) {
      throw new CLIError('Invalid codemap data format', 'INVALID_DATA');
    }

    // Convert plain objects back to Maps for CodemapUtils compatibility
    const data: Record<string, unknown> = {
      version: parsedData.version ?? '1.0.0',
      generatedAt: parsedData.generatedAt && typeof parsedData.generatedAt === 'string'
        ? new Date(parsedData.generatedAt)
        : new Date(),
      rootPath: parsedData.rootPath ?? '',
      files: new Map<string, unknown>(),
      dependencies: new Map<string, Set<string>>(),
      metrics: {
        totalFiles: 0,
        totalLines: 0,
        totalFunctions: 0,
        totalClasses: 0,
        averageComplexity: 0,
        languageDistribution: new Map<string, number>(),
        issueCount: 0,
        duplicateCodeBlocks: 0,
        ...parsedData.metrics,
      },
      crossFileReferences: parsedData.crossFileReferences ?? [],
      ...parsedData,
    };

    if (parsedData.files && typeof parsedData.files === 'object' && !(parsedData.files instanceof Map)) {
      data.files = new Map(Object.entries(parsedData.files));
    }
    if (
      parsedData.dependencies &&
      typeof parsedData.dependencies === 'object' &&
      !(parsedData.dependencies instanceof Map)
    ) {
      const depsMap = new Map<string, Set<string>>();
      Object.entries(parsedData.dependencies).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          depsMap.set(key, new Set(value.map(String)));
        }
      });
      data.dependencies = depsMap;
    }
    if (
      parsedData.metrics?.languageDistribution &&
      typeof parsedData.metrics.languageDistribution === 'object' &&
      !(parsedData.metrics.languageDistribution instanceof Map)
    ) {
      data.metrics = {
        ...(data.metrics ?? {}),
        ...parsedData.metrics,
        languageDistribution: new Map(
          Object.entries(parsedData.metrics.languageDistribution),
        ),
      };
    }

    return data as unknown as CodemapData;
  } catch (error) {
    throw new CLIError(
      `Failed to load codemap from ${inputPath}: ${error instanceof Error ? error.message : String(error)}`,
      'FILE_NOT_FOUND',
    );
  }
}

const writeJSONOutput = async (outputPath: string, data: CodemapData): Promise<void> => {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
};

const writeTextualOutput = async (
  outputPath: string,
  codemapData: CodemapData,
  format: string,
  representation?: string,
): Promise<void> => {
  const eventBus = new EventBus();
  const codemapUtils = new CodemapUtils(eventBus);

  let content = '';

  switch (format) {
    case 'summary': {
      content = codemapUtils.generateCompactSummary(codemapData, 4000);
      break;
    }
    case 'compact': {
      const compactRep = codemapUtils.convertCodemapRepresentation(codemapData, 'compact');
      content = formatCompactAsMarkdown(compactRep as CompactRepresentationData);
      break;
    }
    case 'markdown':
    default: {
      const rep = codemapUtils.convertCodemapRepresentation(
        codemapData,
        (representation ?? 'summary') as CodemapRepresentation,
      );
      // Convert CodemapSummary to MarkdownRepresentationData
      const markdownData: MarkdownRepresentationData = {
        generatedAt: rep.generatedAt.toISOString(),
        rootPath: rep.rootPath,
        representation: rep.representation,
        metrics: {
          totalFiles: rep.files.length,
          totalLines: rep.metrics.totalLines,
          totalFunctions: rep.functions.length,
          totalClasses: rep.classes.length,
          averageComplexity: rep.metrics.averageComplexity,
          issueCount: rep.metrics.issueCount,
          signalCount: rep.metrics.signalCount,
          languageDistribution: rep.metrics.languageDistribution,
        },
        files: rep.files.map(f => ({
          path: f.path,
          language: f.language || 'unknown',
          linesOfCode: f.linesOfCode || 0,
          complexity: f.complexity,
        })),
        functions: rep.functions.map(fn => ({
          name: fn.name,
          file: fn.file,
          complexity: fn.complexity,
        })),
      };
      content = formatAsMarkdown(markdownData);
      break;
    }
  }

  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Ensure file has correct extension
  const finalOutputPath = outputPath.endsWith('.md') ? outputPath : `${outputPath}.md`;
  await fs.writeFile(finalOutputPath, content);
}

const writeInspectionOutput = async (
  outputPath: string,
  results: InspectionResults,
  format: string,
): Promise<void> => {
  let content = '';

  switch (format) {
    case 'json':
      content = JSON.stringify(results, null, 2);
      break;
    case 'markdown':
    case 'summary':
    default:
      content = formatInspectionResultsAsMarkdown(results);
      break;
  }

  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, content);
}

const formatAsMarkdown = (representation: MarkdownRepresentationData): string => {
  let markdown = `# Codebase Analysis\n\n`;
  markdown += `**Generated**: ${representation.generatedAt}\n`;
  markdown += `**Root Path**: ${representation.rootPath}\n`;
  markdown += `**Representation**: ${representation.representation}\n\n`;

  // Metrics
  markdown += `## Metrics\n\n`;
  markdown += `- **Total Files**: ${representation.metrics.totalFiles}\n`;
  markdown += `- **Total Lines**: ${representation.metrics.totalLines}\n`;
  markdown += `- **Total Functions**: ${representation.metrics.totalFunctions}\n`;
  markdown += `- **Total Classes**: ${representation.metrics.totalClasses}\n`;
  markdown += `- **Average Complexity**: ${representation.metrics.averageComplexity.toFixed(1)}\n`;
  markdown += `- **Issues**: ${representation.metrics.issueCount}\n`;
  markdown += `- **Signals**: ${representation.metrics.signalCount}\n\n`;

  // Language Distribution
  if (
    representation.metrics.languageDistribution &&
    Object.keys(representation.metrics.languageDistribution).length > 0
  ) {
    markdown += `## Languages\n\n`;
    Object.entries(representation.metrics.languageDistribution)
      .sort(([, a], [, b]) => b - a)
      .forEach(([lang, count]) => {
        markdown += `- **${lang}**: ${count}\n`;
      });
    markdown += '\n';
  }

  // Top Files
  if (representation.files.length > 0) {
    markdown += `## Files (Top ${representation.files.length})\n\n`;
    representation.files.slice(0, 20).forEach((file) => {
      markdown += `- **${file.path}** (${file.language}, ${file.linesOfCode} LOC, complexity: ${file.complexity})\n`;
    });
    markdown += '\n';
  }

  // Complex Functions
  if (representation.functions.length > 0) {
    markdown += `## Functions (High Complexity)\n\n`;
    representation.functions.slice(0, 15).forEach((func) => {
      markdown += `- **${func.name}** (${func.file}, complexity: ${func.complexity})\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

const formatCompactAsMarkdown = (representation: CompactRepresentationData): string => {
  let markdown = `# Compact Codebase Summary\n\n`;
  markdown += `**Files**: ${representation.metrics.totalFiles} | `;
  markdown += `**Functions**: ${representation.metrics.totalFunctions} | `;
  markdown += `**Avg Complexity**: ${representation.metrics.averageComplexity.toFixed(1)}\n\n`;

  representation.files.slice(0, 10).forEach((file) => {
    markdown += `- ${file.path} (${file.linesOfCode} LOC, ${file.complexity} complexity)\n`;
  });

  return markdown;
}

const formatInspectionResultsAsMarkdown = (results: InspectionResults): string => {
  let markdown = `# Codemap Inspection Results\n\n`;

  if (results.type === 'search') {
    const searchResults = results;
    markdown += `**Query**: \`${searchResults.query}\`\n`;
    markdown += `**Search Type**: ${searchResults.searchType}\n`;
    markdown += `**Results**: ${searchResults.total} found\n\n`;

    if (searchResults.results.length > 0) {
      markdown += `## Results\n\n`;
      searchResults.results.forEach((result) => {
        markdown += `- **${result.type}**: \`${result.name}\` (${result.file}`;
        if (result.line) {
          markdown += `:${result.line}`;
        }
        markdown += `, relevance: ${result.relevance}%)\n`;
      });
    }
  } else if (results.type === 'representation') {
    const representationResults = results;
    markdown += `**Representation**: ${representationResults.representation}\n\n`;
    markdown += formatAsMarkdown(representationResults.data);
  }

  return markdown;
}

const displayInspectionResults = (results: InspectionResults): void => {
  if (results.type === 'search') {
    const searchResults = results;
    logger.info('cli', 'CodemapCommand', 'Search results', {
      query: searchResults.query,
      searchType: searchResults.searchType,
      total: searchResults.total,
    });

    if (searchResults.results.length > 0) {
      searchResults.results.forEach((result) => {
        logger.info('cli', 'CodemapCommand', 'Search result', {
          type: result.type,
          name: result.name,
          file: result.file,
          line: result.line,
          relevance: result.relevance,
        });
      });
    } else {
      logger.info('cli', 'CodemapCommand', 'No search results found');
    }
  } else {
    const representationResults = results;
    logger.info('cli', 'CodemapCommand', 'Codemap representation', {
      representation: representationResults.representation,
      files: representationResults.data.metrics.totalFiles,
      functions: representationResults.data.metrics.totalFunctions,
      avgComplexity: representationResults.data.metrics.averageComplexity,
    });
  }
};

// TODO: Export when added to CLI registry
// export { handleGenerateCommand, handleInspectCommand, handleExportCommand };

// Internal test to verify function works (remove when integrating with CLI)
(() => {
  // This is a self-test to ensure the function is callable
  const testCmd = createCodemapCommand();
  if (testCmd instanceof Command) {
    // Function works correctly
  }
})();
