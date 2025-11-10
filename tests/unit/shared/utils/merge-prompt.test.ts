/**
 * Tests for merge-prompt utility
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  MergePrompt,
  mergePrompt,
  buildAgentPrompt,
  buildInspectorPrompt,
  buildOrchestratorPrompt,
  TOON
} from '../../../../src/shared/utils/merge-prompt';

describe('TOON (Token Optimized Notation)', () => {
  describe('minify', () => {
    it('should minify simple objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = TOON.minify(obj);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should handle empty objects and arrays', () => {
      const obj = { empty: {}, list: [] };
      const result = TOON.minify(obj);
      expect(result).toBe('{"empty":{},"list":[]}');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      };
      const result = TOON.minify(obj);
      expect(result).toBe('{"user":{"name":"John","settings":{"theme":"dark","notifications":true}}}');
    });

    it('should handle arrays of objects', () => {
      const obj = {
        items: [
          { id: 1, name: 'first' },
          { id: 2, name: 'second' }
        ]
      };
      const result = TOON.minify(obj);
      expect(result).toBe('{"items":[{"id":1,"name":"first"},{"id":2,"name":"second"}]}');
    });

    it('should handle null and undefined values', () => {
      const obj = { name: 'test', value: null, missing: undefined };
      const result = TOON.minify(obj);
      expect(result).toBe('{"name":"test","value":null}');
    });

    it('should handle primitive types', () => {
      const obj = {
        string: 'hello',
        number: 42,
        boolean: true,
        empty: ''
      };
      const result = TOON.minify(obj);
      expect(result).toBe('{"string":"hello","number":42,"boolean":true,"empty":""}');
    });
  });

  describe('parse', () => {
    it('should parse TOON string back to object', () => {
      const original = { name: 'test', value: 123 };
      const toonString = TOON.minify(original);
      const parsed = TOON.parse(toonString);
      expect(parsed).toEqual(original);
    });

    it('should parse complex nested objects', () => {
      const original = {
        users: [
          { id: 1, profile: { name: 'John', active: true } },
          { id: 2, profile: { name: 'Jane', active: false } }
        ]
      };
      const toonString = TOON.minify(original);
      const parsed = TOON.parse(toonString);
      expect(parsed).toEqual(original);
    });
  });
});

describe('MergePrompt', () => {
  let tempDir: string;
  let testFiles: { [key: string]: string };

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'merge-prompt-test-'));

    // Create test markdown files
    testFiles = {
      main: path.join(tempDir, 'main.md'),
      included: path.join(tempDir, 'included.md'),
      nested: path.join(tempDir, 'nested.md'),
      missing: path.join(tempDir, 'missing.md')
    };

    await fs.writeFile(testFiles.main, '# Main Document\n\nThis includes [Included Content](included.md)\n\nEnd of main.');
    await fs.writeFile(testFiles.included, '# Included Content\n\nThis includes [Nested Content](nested.md)\n\nEnd of included.');
    await fs.writeFile(testFiles.nested, '# Nested Content\n\nThis is the deepest level.');
    // Note: missing.md is intentionally not created
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });

  describe('merge', () => {
    it('should merge multiple content strings', async () => {
      const contents = ['# First', '# Second', '# Third'];
      const result = await MergePrompt.merge(contents);

      expect(result).toContain('# First');
      expect(result).toContain('# Second');
      expect(result).toContain('# Third');
    });

    it('should handle empty content strings', async () => {
      const contents = ['# First', '', '# Third'];
      const result = await MergePrompt.merge(contents);

      expect(result).toContain('# First');
      expect(result).toContain('# Third');
      expect(result).not.toContain('\n\n\n');
    });

    it('should include parameters in TOON format', async () => {
      const contents = ['# Main Content'];
      const params = { user: 'John', count: 42 };
      const result = await MergePrompt.merge(contents, params);

      expect(result).toContain('# Main Content');
      expect(result).toContain('--- PARAMETERS ---');
      expect(result).toContain('{"user":"John","count":42}');
    });

    it('should not include parameters section when params are empty', async () => {
      const contents = ['# Main Content'];
      const params = {};
      const result = await MergePrompt.merge(contents, params);

      expect(result).toContain('# Main Content');
      expect(result).not.toContain('--- PARAMETERS ---');
    });
  });

  describe('resolveMarkdownLinks', () => {
    it('should resolve markdown file references', async () => {
      const content = '# Test\n\nThis includes [Content](included.md)\n\nEnd.';
      const result = await MergePrompt.merge([content], undefined, { baseDirectory: tempDir });

      expect(result).toContain('# Test');
      expect(result).toContain('# Included Content');
      expect(result).toContain('This is the deepest level');
      expect(result).not.toContain('[Content](included.md)');
    });

    it('should handle nested file references', async () => {
      const content = '# Start\n\nSee [Main File](main.md)\n\nEnd.';
      const result = await MergePrompt.merge([content], undefined, { baseDirectory: tempDir });

      expect(result).toContain('# Start');
      expect(result).toContain('# Main Document');
      expect(result).toContain('# Included Content');
      expect(result).toContain('# Nested Content');
      expect(result).toContain('This is the deepest level');
    });

    it('should skip external URLs', async () => {
      const content = '# Test\n\nExternal link: [Google](https://google.com)\n\nEnd.';
      const result = await MergePrompt.merge([content]);

      expect(result).toContain('External link: [Google](https://google.com)');
    });

    it('should handle missing files gracefully', async () => {
      const content = '# Test\n\nMissing: [Not Found](missing.md)\n\nEnd.';
      const result = await MergePrompt.merge([content], undefined, { throwOnMissingFile: false });

      expect(result).toContain('<!-- ERROR: Could not resolve missing.md');
    });

    it('should throw error when missing files and throwOnMissingFile is true', async () => {
      const content = '# Test\n\nMissing: [Not Found](missing.md)\n\nEnd.';

      await expect(
        MergePrompt.merge([content], undefined, { throwOnMissingFile: true })
      ).rejects.toThrow('Failed to resolve markdown link: missing.md');
    });

    it('should prevent infinite recursion', async () => {
      // Create circular reference
      const circular1 = path.join(tempDir, 'circular1.md');
      const circular2 = path.join(tempDir, 'circular2.md');

      await fs.writeFile(circular1, '# Circular 1\n\nSee [Circular 2](circular2.md)');
      await fs.writeFile(circular2, '# Circular 2\n\nSee [Circular 1](circular1.md)');

      await expect(
        MergePrompt.merge(['# Start\n\nSee [Circular 1](circular1.md)'], undefined, {
          baseDirectory: tempDir,
          throwOnMissingFile: true
        })
      ).rejects.toThrow('Maximum recursion depth exceeded');
    });
  });

  describe('caching', () => {
    it('should cache resolved content', async () => {
      // Clear cache first
      MergePrompt.clearCache();

      const content = `# Test\n\nInclude: [File](included.md)`;

      // First call should read from file system
      const result1 = await MergePrompt.merge([content], undefined, { baseDirectory: tempDir });
      expect(result1).toContain('# Included Content');

      // Second call should use cache (with caching enabled)
      const result2 = await MergePrompt.merge([content], undefined, { cache: true, baseDirectory: tempDir });
      expect(result2).toContain('# Included Content'); // Should have same content

      // Verify both calls return the same result (proving cache worked)
      expect(result1).toBe(result2);

      // Clear cache to force re-read
      MergePrompt.clearCache();

      // Third call with different content to verify cache was cleared
      const newContent = `# New Test\n\nInclude: [File](included.md)`;
      const result3 = await MergePrompt.merge([newContent], undefined, { cache: true, baseDirectory: tempDir });
      expect(result3).toContain('# Included Content');
      expect(result3).not.toBe(result1); // Should be different due to different input
    });

    it('should provide cache statistics', () => {
      const stats = MergePrompt.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('should clear cache', () => {
      MergePrompt.clearCache();
      const stats = MergePrompt.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toHaveLength(0);
    });
  });

  describe('buildAgentPrompt', () => {
    it('should build agent prompt with correct order', async () => {
      const prprcPath = testFiles.main;
      const agentPaths = [testFiles.included];
      const params = { agentId: 'test-agent' };

      const result = await MergePrompt.buildAgentPrompt(prprcPath, agentPaths, params);

      expect(result).toContain('# Main Document');
      expect(result).toContain('# Included Content');
      expect(result).toContain('agentId');
      expect(result).toContain('test-agent');
    });
  });

  describe('buildInspectorPrompt', () => {
    it('should build inspector prompt with scanner JSON', async () => {
      const prprcPath = testFiles.main;
      const inspectorPath = testFiles.included;
      const scannerJson = { signals: ['[dp]', '[bf]'], count: 2 };
      const context = 'Previous inspection context';

      const result = await MergePrompt.buildInspectorPrompt(
        prprcPath,
        inspectorPath,
        scannerJson,
        context
      );

      expect(result).toContain('# Main Document');
      expect(result).toContain('# Included Content');
      expect(result).toContain('--- SCANNER DATA ---');
      expect(result).toContain('{"signals":["[dp]","[bf]"],"count":2}');
      expect(result).toContain('--- PREVIOUS CONTEXT ---');
      expect(result).toContain('Previous inspection context');
    });
  });

  describe('buildOrchestratorPrompt', () => {
    it('should build orchestrator prompt with all contexts', async () => {
      const prprcPath = testFiles.main;
      const orchestratorPath = testFiles.included;
      const inspectorPayload = { analysis: 'System is healthy' };
      const prpContext = 'PRP status update';
      const sharedContext = 'Shared system context';

      const result = await MergePrompt.buildOrchestratorPrompt(
        prprcPath,
        orchestratorPath,
        inspectorPayload,
        prpContext,
        sharedContext
      );

      expect(result).toContain('# Main Document');
      expect(result).toContain('# Included Content');
      expect(result).toContain('--- INSPECTOR PAYLOAD ---');
      expect(result).toContain('--- PRP CONTEXT ---');
      expect(result).toContain('--- SHARED CONTEXT ---');
      expect(result).toContain('System is healthy');
      expect(result).toContain('PRP status update');
      expect(result).toContain('Shared system context');
    });
  });
});

describe('Convenience Functions', () => {
  let tempDir: string;
  let testFiles: { [key: string]: string };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'merge-prompt-convenience-test-'));

    testFiles = {
      prprc: path.join(tempDir, 'prprc.md'),
      agent: path.join(tempDir, 'agent.md'),
      inspector: path.join(tempDir, 'inspector.md'),
      orchestrator: path.join(tempDir, 'orchestrator.md')
    };

    await fs.writeFile(testFiles.prprc, '# PRPRC Instructions');
    await fs.writeFile(testFiles.agent, '# Agent Instructions');
    await fs.writeFile(testFiles.inspector, '# Inspector Instructions');
    await fs.writeFile(testFiles.orchestrator, '# Orchestrator Instructions');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });

  describe('mergePrompt', () => {
    it('should handle content only', async () => {
      const result = await mergePrompt('# First', '# Second', '# Third');
      expect(result).toContain('# First');
      expect(result).toContain('# Second');
      expect(result).toContain('# Third');
    });

    it('should handle content and params', async () => {
      const result = await mergePrompt('# First', '# Second', { param: 'value' });
      expect(result).toContain('# First');
      expect(result).toContain('# Second');
      expect(result).toContain('{"param":"value"}');
    });

    it('should handle content, params, and options', async () => {
      const result = await mergePrompt(
        '# First',
        '# Second',
        { param: 'value' },
        { cache: false }
      );
      expect(result).toContain('# First');
      expect(result).toContain('# Second');
      expect(result).toContain('{"param":"value"}');
    });
  });

  describe('buildAgentPrompt', () => {
    it('should build agent prompt from config', async () => {
      const agentConfig = [
        { instructions_path: testFiles.agent }
      ];

      const result = await buildAgentPrompt(testFiles.prprc, agentConfig, { agentId: 'test' });

      expect(result).toContain('# PRPRC Instructions');
      expect(result).toContain('# Agent Instructions');
      expect(result).toContain('agentId');
    });
  });

  describe('buildInspectorPrompt', () => {
    it('should build inspector prompt from config', async () => {
      const inspectorConfig = { instructions_path: testFiles.inspector };

      const result = await buildInspectorPrompt(
        testFiles.prprc,
        inspectorConfig,
        { scanner: 'data' },
        'context'
      );

      expect(result).toContain('# PRPRC Instructions');
      expect(result).toContain('# Inspector Instructions');
      expect(result).toContain('scanner');
      expect(result).toContain('context');
    });
  });

  describe('buildOrchestratorPrompt', () => {
    it('should build orchestrator prompt from config', async () => {
      const orchestratorConfig = { instructions_path: testFiles.orchestrator };

      const result = await buildOrchestratorPrompt(
        testFiles.prprc,
        orchestratorConfig,
        { inspector: 'payload' },
        'prp context',
        'shared context'
      );

      expect(result).toContain('# PRPRC Instructions');
      expect(result).toContain('# Orchestrator Instructions');
      expect(result).toContain('inspector');
      expect(result).toContain('prp context');
      expect(result).toContain('shared context');
    });
  });
});