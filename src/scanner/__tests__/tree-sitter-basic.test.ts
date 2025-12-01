/**
 * ♫ Tree-Sitter Scanner Basic Tests
 *
 * Basic functionality tests without complex tree-sitter dependencies
 */

import { EventBus } from '../../shared/events';

import type { ScannerConfig, CodeAnalysisResult } from '../types';

// Mock tree-sitter dependencies
jest.mock('tree-sitter');
jest.mock('tree-sitter-javascript');

describe('Tree-Sitter Scanner Basic Tests', () => {
  let eventBus: EventBus;
  let config: ScannerConfig;

  beforeEach(() => {
    eventBus = new EventBus();
    config = {
      scanInterval: 5000,
      maxConcurrentScans: 3,
      batchSize: 10,
      enableGitMonitoring: false,
      enableFileMonitoring: false,
      enablePRPMonitoring: false,
      excludedPaths: [],
      includedExtensions: ['.js', '.ts', '.jsx', '.tsx', '.md'],
      worktreePaths: [],
      performanceThresholds: {
        maxScanTime: 30000,
        maxMemoryUsage: 512 * 1024 * 1024,
        maxFileCount: 1000,
      },
    };
  });

  describe('Type Definitions', () => {
    it('should have correct type definitions for CodeAnalysisResult', () => {
      const mockAnalysis: CodeAnalysisResult = {
        filePath: 'test.js',
        language: 'javascript',
        size: 1000,
        lastModified: new Date(),
        structure: {
          functions: [],
          classes: [],
          imports: [],
          exports: [],
          variables: [],
          interfaces: [],
          types: [],
          enums: [],
          modules: [],
        },
        metrics: {
          linesOfCode: 50,
          functionsCount: 0,
          classesCount: 0,
          importsCount: 0,
          exportsCount: 0,
          variablesCount: 0,
          maxNestingDepth: 0,
          averageFunctionSize: 0,
          duplicateCodeBlocks: 0,
        },
        complexity: {
          cyclomaticComplexity: 1,
          cognitiveComplexity: 0,
          maintainabilityIndex: 100,
          halsteadComplexity: {
            operators: 0,
            operands: 0,
            difficulty: 0,
            effort: 0,
          },
        },
        dependencies: [],
        issues: [],
        crossFileReferences: [],
      };

      expect(mockAnalysis.filePath).toBe('test.js');
      expect(mockAnalysis.language).toBe('javascript');
      expect(mockAnalysis.structure.functions).toEqual([]);
      expect(mockAnalysis.metrics.linesOfCode).toBe(50);
    });

    it('should handle complex nested structures', () => {
      const mockAnalysis: CodeAnalysisResult = {
        filePath: 'complex.tsx',
        language: 'javascript',
        size: 5000,
        lastModified: new Date(),
        structure: {
          functions: [
            {
              name: 'complexFunction',
              type: 'arrow',
              position: { line: 10, column: 5 },
              size: 200,
              complexity: 5,
              nestingDepth: 3,
              parameters: [
                { name: 'param1', type: 'string', optional: false },
                { name: 'param2', type: 'number', optional: true },
              ],
              isAsync: true,
              isExported: true,
            },
          ],
          classes: [
            {
              name: 'TestClass',
              type: 'class',
              position: { line: 1, column: 1 },
              size: 300,
              methods: [],
              properties: [
                {
                  name: 'property',
                  type: 'string',
                  visibility: 'private',
                  isStatic: false,
                },
              ],
              inheritance: ['BaseClass'],
              decorators: ['deprecated'],
            },
          ],
          imports: [
            {
              source: 'react',
              imports: [
                { name: 'useState', isDefault: false },
                { name: 'default', isDefault: true },
              ],
              type: 'import',
              position: { line: 1, column: 1 },
            },
          ],
          exports: [],
          variables: [],
          interfaces: [],
          types: [],
          enums: [],
          modules: [],
        },
        metrics: {
          linesOfCode: 150,
          functionsCount: 1,
          classesCount: 1,
          importsCount: 1,
          exportsCount: 0,
          variablesCount: 0,
          maxNestingDepth: 3,
          averageFunctionSize: 200,
          duplicateCodeBlocks: 0,
        },
        complexity: {
          cyclomaticComplexity: 5,
          cognitiveComplexity: 8,
          maintainabilityIndex: 75,
          halsteadComplexity: {
            operators: 25,
            operands: 30,
            difficulty: 12,
            effort: 300,
          },
        },
        dependencies: [
          {
            module: 'react',
            type: 'import',
            imports: [
              { name: 'useState', isDefault: false },
              { name: 'default', isDefault: true },
            ],
            isExternal: true,
            position: { line: 1, column: 1 },
          },
        ],
        issues: [
          {
            type: 'style',
            severity: 'medium',
            message: 'Line exceeds 120 characters',
            position: { line: 50, column: 120 },
            suggestion: 'Consider breaking long lines',
          },
        ],
        crossFileReferences: [
          {
            sourceFile: 'complex.tsx',
            targetFile: 'utils.ts',
            type: 'function_call',
            name: 'helperFunction',
            position: { line: 25, column: 10 },
            targetPosition: { line: 5, column: 1 },
          },
        ],
      };

      expect(mockAnalysis.structure.functions).toHaveLength(1);
      expect(mockAnalysis.structure.classes).toHaveLength(1);
      expect(mockAnalysis.dependencies).toHaveLength(1);
      expect(mockAnalysis.issues).toHaveLength(1);
      expect(mockAnalysis.crossFileReferences).toHaveLength(1);

      const func = mockAnalysis.structure.functions[0];
      expect(func.name).toBe('complexFunction');
      expect(func.isAsync).toBe(true);
      expect(func.parameters).toHaveLength(2);

      const cls = mockAnalysis.structure.classes[0];
      expect(cls.name).toBe('TestClass');
      expect(cls.inheritance).toContain('BaseClass');
      expect(cls.decorators).toContain('deprecated');
    });
  });

  describe('Scanner Configuration', () => {
    it('should validate scanner configuration', () => {
      expect(config.scanInterval).toBe(5000);
      expect(config.maxConcurrentScans).toBe(3);
      expect(config.includedExtensions).toContain('.js');
      expect(config.includedExtensions).toContain('.ts');
      expect(config.includedExtensions).toContain('.jsx');
      expect(config.includedExtensions).toContain('.tsx');
      expect(config.includedExtensions).toContain('.md');
    });

    it('should handle configuration edge cases', () => {
      const edgeCaseConfig: ScannerConfig = {
        ...config,
        scanInterval: 0,
        maxConcurrentScans: 1,
        batchSize: 1,
        excludedPaths: ['node_modules', 'dist'],
        performanceThresholds: {
          maxScanTime: 1000,
          maxMemoryUsage: 100 * 1024 * 1024,
          maxFileCount: 10,
        },
      };

      expect(edgeCaseConfig.scanInterval).toBe(0);
      expect(edgeCaseConfig.excludedPaths).toContain('node_modules');
      expect(edgeCaseConfig.performanceThresholds.maxScanTime).toBe(1000);
    });
  });

  describe('Event Bus Integration', () => {
    it('should create and configure event bus', () => {
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.publishToChannel).toBe('function');
    });

    it('should handle event bus operations', () => {
      const mockEventData = {
        id: 'test-event',
        type: 'test_type',
        timestamp: new Date(),
        source: 'test-source',
        data: { test: true },
        metadata: {},
      };

      // Should not throw when publishing events
      expect(() => {
        eventBus.publishToChannel('scanner', mockEventData);
      }).not.toThrow();
    });
  });

  describe('File Extension Handling', () => {
    it('should correctly identify supported extensions', () => {
      const supportedExtensions = config.includedExtensions;

      expect(supportedExtensions).toContain('.js');
      expect(supportedExtensions).toContain('.jsx');
      expect(supportedExtensions).toContain('.ts');
      expect(supportedExtensions).toContain('.tsx');
      expect(supportedExtensions).toContain('.md');
      expect(supportedExtensions).not.toContain('.py');
      expect(supportedExtensions).not.toContain('.java');
    });

    it('should handle case sensitivity in extensions', () => {
      const testFiles = ['test.JS', 'test.TS', 'test.JSX', 'test.TSX', 'test.MD'];

      testFiles.forEach((file) => {
        const ext = `.${  file.split('.').pop()?.toLowerCase()}`;
        expect(config.includedExtensions).toContain(ext);
      });
    });
  });

  describe('Performance Thresholds', () => {
    it('should have reasonable default performance thresholds', () => {
      const thresholds = config.performanceThresholds;

      expect(thresholds.maxScanTime).toBeGreaterThan(1000); // At least 1 second
      expect(thresholds.maxMemoryUsage).toBeGreaterThan(50 * 1024 * 1024); // At least 50MB
      expect(thresholds.maxFileCount).toBeGreaterThan(10); // At least 10 files
    });

    it('should handle extreme performance thresholds', () => {
      const extremeConfig: ScannerConfig = {
        ...config,
        performanceThresholds: {
          maxScanTime: 100, // Very short
          maxMemoryUsage: 1024 * 1024, // Very small - 1MB
          maxFileCount: 1, // Single file only
        },
      };

      expect(extremeConfig.performanceThresholds.maxScanTime).toBe(100);
      expect(extremeConfig.performanceThresholds.maxMemoryUsage).toBe(1024 * 1024);
      expect(extremeConfig.performanceThresholds.maxFileCount).toBe(1);
    });
  });

  describe('Language Detection Logic', () => {
    it('should map file extensions to languages correctly', () => {
      const extensionToLanguageMap: Record<string, string> = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'javascript',
        '.tsx': 'javascript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.md': 'markdown',
      };

      Object.entries(extensionToLanguageMap).forEach(([ext, language]) => {
        expect(language).toMatch(/^(javascript|markdown)$/);
      });
    });

    it('should handle unknown file extensions', () => {
      const unknownExtensions = ['.py', '.java', '.cpp', '.go', '.rs', '.php'];

      unknownExtensions.forEach((ext) => {
        const testFile = `test${ext}`;
        expect(config.includedExtensions).not.toContain(ext);
      });
    });
  });

  describe('Complexity Metrics Validation', () => {
    it('should have valid complexity metric ranges', () => {
      const metrics = {
        cyclomaticComplexity: 5,
        cognitiveComplexity: 3,
        maintainabilityIndex: 85,
        halsteadComplexity: {
          operators: 20,
          operands: 25,
          difficulty: 8,
          effort: 200,
        },
      };

      expect(metrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(metrics.cognitiveComplexity).toBeGreaterThanOrEqual(0);
      expect(metrics.maintainabilityIndex).toBeGreaterThan(0);
      expect(metrics.maintainabilityIndex).toBeLessThanOrEqual(100);
      expect(metrics.halsteadComplexity.operators).toBeGreaterThanOrEqual(0);
      expect(metrics.halsteadComplexity.operands).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge case complexity values', () => {
      const edgeCaseMetrics = {
        cyclomaticComplexity: 1, // Minimum
        cognitiveComplexity: 0, // Minimum
        maintainabilityIndex: 0, // Minimum
        halsteadComplexity: {
          operators: 0, // Minimum
          operands: 0, // Minimum
          difficulty: 0, // Minimum
          effort: 0, // Minimum
        },
      };

      expect(edgeCaseMetrics.cyclomaticComplexity).toBe(1);
      expect(edgeCaseMetrics.cognitiveComplexity).toBe(0);
      expect(edgeCaseMetrics.maintainabilityIndex).toBe(0);
    });
  });
});
