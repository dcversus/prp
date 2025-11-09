/**
 * Tests for Enhanced PRP Parser
 */

import { EnhancedPRPParser } from '../../src/scanner/enhanced-prp-parser';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';

// Mock file system operations
jest.mock('fs');
jest.mock('fs/promises');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
import { readFile, readdir, stat } from 'fs/promises';
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;
const mockStat = stat as jest.MockedFunction<typeof stat>;

// Mock shared utilities
jest.mock('../../src/shared/utils', () => ({
  createLayerLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  HashUtils: {
    hashString: jest.fn((str: string) => `hash-${str}`),
    hashFile: jest.fn(() => Promise.resolve('file-hash')),
    generateId: jest.fn(() => 'test-id')
  },
  FileUtils: {
    readTextFile: jest.fn(),
    isPRPFile: jest.fn((path: string) =>
      path.includes('PRP') || path.includes('PRP-') || path.includes('-prp-')
    )
  }
}));

describe('Enhanced PRP Parser', () => {
  let parser: EnhancedPRPParser;
  const testCacheDir = '.prp/test-cache';
  const testRepoPath = '/test/repo';

  beforeEach(() => {
    parser = new EnhancedPRPParser(testCacheDir);
    jest.clearAllMocks();

    // Setup default mocks
    mockExistsSync.mockReturnValue(true);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('');
    mockReaddir.mockResolvedValue([]);
    mockStat.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date('2024-01-01T00:00:00Z'),
      size: 1000
    } as any);
  });

  describe('PRP Discovery', () => {
    test('should discover PRP files in directory', async () => {
      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockImplementation((path: string) =>
        path.includes('PRP') || path.includes('PRP-') || path.includes('-prp-')
      );

      mockReaddir.mockResolvedValueOnce(['PRPs', 'src', 'tests']);
      mockReaddir.mockResolvedValueOnce(['PRP-001.md', 'PRP-002.md', 'other.txt']);
      mockReaddir.mockResolvedValueOnce(['file.ts', 'test-prp-feature.md']);

      mockStat.mockImplementation((path: string) => ({
        isFile: () => !path.includes('PRPs') && !path.includes('src'),
        isDirectory: () => path.includes('PRPs') || path.includes('src'),
        mtime: new Date('2024-01-01T00:00:00Z'),
        size: 1000
      } as any));

      const prpFiles = await parser.discoverPRPFiles(testRepoPath);

      expect(prpFiles).toContain('PRPs/PRP-001.md');
      expect(prpFiles).toContain('PRPs/PRP-002.md');
      expect(prpFiles).toContain('src/test-prp-feature.md');
      expect(prpFiles).not.toContain('other.txt');
    });

    test('should handle empty directory', async () => {
      mockReaddir.mockResolvedValue([]);

      const prpFiles = await parser.discoverPRPFiles(testRepoPath);

      expect(prpFiles).toHaveLength(0);
    });

    test('should handle directory access errors gracefully', async () => {
      mockReaddir.mockRejectedValueOnce(new Error('Permission denied'));

      const prpFiles = await parser.discoverPRPFiles(testRepoPath);

      expect(prpFiles).toHaveLength(0);
    });
  });

  describe('PRP Parsing', () => {
    const testPRPContent = `# PRP-001: Test Feature

**Status**: 🔄 IN PROGRESS
**Priority**: HIGH

## Main Goal
Implement a test feature for the signal system.

## Progress

| Signal | Comment | Time | Role |
|--------|---------|------|------|
| [dp] Development progress | Core implementation complete | 2024-01-01 | Developer |
| [tp] Tests prepared | Unit tests written | 2024-01-01 | Developer |

## Definition of Done
- [ ] Feature implemented
- [ ] Tests passing
- [ ] Documentation updated

## Requirements
- REQ-001: Implement core functionality
- REQ-002: Add comprehensive tests

## Acceptance Criteria
- AC-001: Feature works as expected
- AC-002: Tests achieve 90% coverage

Tags: signal-system, development
Dependencies: PRP-002
Blockers: API credentials needed

`;

    test('should parse PRP file with enhanced metadata', async () => {
      mockReadFile.mockResolvedValueOnce(testPRPContent);

      const prpFile = await parser.parsePRPFile('/test/PRP-001.md');

      expect(prpFile).toBeDefined();
      expect(prpFile?.name).toBe('PRP-001');
      expect(prpFile?.metadata.title).toBe('PRP-001: Test Feature');
      expect(prpFile?.metadata.status).toBe('active');
      expect(prpFile?.metadata.priority).toBe('high');
      expect(prpFile?.signals).toHaveLength(2);
      expect(prpFile?.metadata.requirements).toHaveLength(2);
      expect(prpFile?.metadata.acceptanceCriteria).toHaveLength(2);
      expect(prpFile?.metadata.tags).toContain('signal-system');
      expect(prpFile?.metadata.tags).toContain('development');
      expect(prpFile?.metadata.dependencies).toContain('PRP-002');
      expect(prpFile?.metadata.blockers).toContain('API credentials needed');
    });

    test('should detect signals in PRP content', async () => {
      mockReadFile.mockResolvedValueOnce(testPRPContent);

      const prpFile = await parser.parsePRPFile('/test/PRP-001.md');

      expect(prpFile?.signals).toHaveLength(2);

      const dpSignal = prpFile?.signals.find(s => s.type === 'dp');
      expect(dpSignal).toBeDefined();
      expect(dpSignal?.priority).toBe(6); // medium priority for [dp]

      const tpSignal = prpFile?.signals.find(s => s.type === 'tp');
      expect(tpSignal).toBeDefined();
      expect(tpSignal?.priority).toBe(4); // medium priority for [tp]
    });

    test('should handle non-existent file', async () => {
      mockExistsSync.mockReturnValueOnce(false);

      const prpFile = await parser.parsePRPFile('/test/non-existent.md');

      expect(prpFile).toBeNull();
    });

    test('should handle file reading errors', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('Permission denied'));

      const prpFile = await parser.parsePRPFile('/test/PRP-001.md');

      expect(prpFile).toBeNull();
    });

    test('should calculate version correctly', async () => {
      mockReadFile.mockResolvedValueOnce(testPRPContent);

      // First parse
      const prpFile1 = await parser.parsePRPFile('/test/PRP-001.md');
      expect(prpFile1?.version).toBe(1);

      // Second parse with same content should have same version
      const prpFile2 = await parser.parsePRPFile('/test/PRP-001.md');
      expect(prpFile2?.version).toBe(1);

      // Third parse with different content should increment version
      mockReadFile.mockResolvedValueOnce(testPRPContent + '\n[bf] Bug fixed');
      const prpFile3 = await parser.parsePRPFile('/test/PRP-001.md');
      expect(prpFile3?.version).toBe(2);
    });

    test('should detect changes between versions', async () => {
      mockReadFile.mockResolvedValueOnce(testPRPContent);

      const prpFile = await parser.parsePRPFile('/test/PRP-001.md');

      expect(prpFile?.changes).toHaveLength(1);
      expect(prpFile?.changes[0].type).toBe('created');
      expect(prpFile?.changes[0].changes.content).toBe(true);
      expect(prpFile?.changes[0].changes.metadata).toBe(true);
      expect(prpFile?.changes[0].changes.signals).toBe(true);
    });
  });

  describe('Multiple PRP Parsing', () => {
    test('should parse multiple PRP files in parallel', async () => {
      const filePaths = [
        '/test/PRP-001.md',
        '/test/PRP-002.md',
        '/test/PRP-003.md'
      ];

      const testContent1 = '# PRP-001\n[dp] Development progress';
      const testContent2 = '# PRP-002\n[tp] Tests prepared';
      const testContent3 = '# PRP-003\n[bf] Bug fixed';

      mockReadFile
        .mockResolvedValueOnce(testContent1)
        .mockResolvedValueOnce(testContent2)
        .mockResolvedValueOnce(testContent3);

      const prpFiles = await parser.parseMultiplePRPFiles(filePaths);

      expect(prpFiles).toHaveLength(3);
      expect(prpFiles[0].signals[0].type).toBe('dp');
      expect(prpFiles[1].signals[0].type).toBe('tp');
      expect(prpFiles[2].signals[0].type).toBe('bf');
    });

    test('should handle mixed success/failure in batch processing', async () => {
      const filePaths = [
        '/test/PRP-001.md',
        '/test/non-existent.md',
        '/test/PRP-002.md'
      ];

      mockExistsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      mockReadFile
        .mockResolvedValueOnce('# PRP-001\n[dp] Development progress')
        .mockResolvedValueOnce('# PRP-002\n[tp] Tests prepared');

      const prpFiles = await parser.parseMultiplePRPFiles(filePaths);

      expect(prpFiles).toHaveLength(2); // Should skip non-existent file
    });
  });

  describe('Version Management', () => {
    test('should maintain version history', async () => {
      const filePath = '/test/PRP-001.md';

      // Parse first version
      mockReadFile.mockResolvedValueOnce('# PRP-001 v1\n[dp] Development progress');
      await parser.parsePRPFile(filePath);

      // Parse second version
      mockReadFile.mockResolvedValueOnce('# PRP-001 v2\n[dp] Development progress\n[bf] Bug fixed');
      await parser.parsePRPFile(filePath);

      // Parse third version
      mockReadFile.mockResolvedValueOnce('# PRP-001 v3\n[dp] Development progress\n[bf] Bug fixed\n[rv] Review passed');
      await parser.parsePRPFile(filePath);

      const history = await parser.getVersionHistory(filePath);

      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(3);
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(1);
    });

    test('should get PRP by specific version', async () => {
      const filePath = '/test/PRP-001.md';

      mockReadFile.mockResolvedValueOnce('# PRP-001 v1\n[dp] Development progress');
      await parser.parsePRPFile(filePath);

      mockReadFile.mockResolvedValueOnce('# PRP-001 v2\n[dp] Development progress\n[bf] Bug fixed');
      await parser.parsePRPFile(filePath);

      const version1 = await parser.getPRPByVersion(filePath, 1);
      const version2 = await parser.getPRPByVersion(filePath, 2);
      const version3 = await parser.getPRPByVersion(filePath, 3);

      expect(version1).toBeDefined();
      expect(version1?.version).toBe(1);

      expect(version2).toBeDefined();
      expect(version2?.version).toBe(2);

      expect(version3).toBeNull(); // Version 3 doesn't exist
    });

    test('should compare versions', async () => {
      const filePath = '/test/PRP-001.md';

      mockReadFile.mockResolvedValueOnce('# PRP-001 v1\n[dp] Development progress');
      await parser.parsePRPFile(filePath);

      mockReadFile.mockResolvedValueOnce('# PRP-001 v2\n[dp] Development progress\n[bf] Bug fixed');
      await parser.parsePRPFile(filePath);

      const comparison = await parser.compareVersions(filePath, 1, 2);

      expect(comparison).toBeDefined();
      expect(comparison?.version1.version).toBe(1);
      expect(comparison?.version2.version).toBe(2);
      expect(comparison?.differences.type).toBe('modified');
      expect(comparison?.differences.changes.content).toBe(true);
      expect(comparison?.differences.changes.signals).toBe(true);
    });

    test('should limit version history size', async () => {
      const filePath = '/test/PRP-001.md';
      const parserWithSmallCache = new EnhancedPRPParser(testCacheDir);
      (parserWithSmallCache as any).maxVersionsPerPRP = 3;

      // Create more versions than the limit
      for (let i = 1; i <= 5; i++) {
        mockReadFile.mockResolvedValueOnce(`# PRP-001 v${i}\n[dp] Development progress v${i}`);
        await parserWithSmallCache.parsePRPFile(filePath);
      }

      const history = await parserWithSmallCache.getVersionHistory(filePath);

      // Should keep only the most recent versions
      expect(history.length).toBeLessThanOrEqual(3);
      expect(history[0].version).toBe(5); // Most recent
    });
  });

  describe('Synchronization', () => {
    test('should sync PRP files and detect changes', async () => {
      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(true);

      // Setup current files
      mockReaddir.mockResolvedValueOnce(['PRP-001.md', 'PRP-002.md']);
      mockStat.mockImplementation((path: string) => ({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date('2024-01-01T00:00:00Z'),
        size: 1000
      } as any));

      mockReadFile
        .mockResolvedValueOnce('# PRP-001\n[dp] Development progress')
        .mockResolvedValueOnce('# PRP-002\n[tp] Tests prepared');

      const syncResult = await parser.syncPRPFiles(testRepoPath);

      expect(syncResult.added).toHaveLength(2);
      expect(syncResult.updated).toHaveLength(0);
      expect(syncResult.deleted).toHaveLength(0);
    });

    test('should detect deleted files', async () => {
      // Simulate cached file that no longer exists
      const filePath = '/test/PRP-old.md';
      await parser.parsePRPFile(filePath); // Add to cache

      mockReaddir.mockResolvedValueOnce([]); // No files in directory

      const syncResult = await parser.syncPRPFiles(testRepoPath);

      expect(syncResult.deleted).toContain(filePath);
    });

    test('should detect updated files', async () => {
      const filePath = '/test/PRP-001.md';
      const oldMtime = new Date('2024-01-01T00:00:00Z');
      const newMtime = new Date('2024-01-02T00:00:00Z');

      // Add file to cache
      mockReadFile.mockResolvedValueOnce('# PRP-001 v1\n[dp] Development progress');
      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: oldMtime,
        size: 1000
      } as any);
      await parser.parsePRPFile(filePath);

      // Simulate file modification
      mockReaddir.mockResolvedValueOnce(['PRP-001.md']);
      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: newMtime,
        size: 1100
      } as any);
      mockReadFile.mockResolvedValueOnce('# PRP-001 v2\n[dp] Development progress\n[bf] Bug fixed');

      const syncResult = await parser.syncPRPFiles(testRepoPath);

      expect(syncResult.updated).toContain(filePath);
    });
  });

  describe('Cache Management', () => {
    test('should get cache statistics', () => {
      const stats = parser.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('totalVersions');
      expect(stats).toHaveProperty('averageVersionsPerPRP');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });

    test('should clear cache', () => {
      parser.clearCache();
      const stats = parser.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.totalVersions).toBe(0);
    });

    test('should limit cache size', async () => {
      const parserWithSmallCache = new EnhancedPRPParser(testCacheDir);
      (parserWithSmallCache as any).maxCacheSize = 2;

      // Add more files than cache limit
      for (let i = 1; i <= 4; i++) {
        mockReadFile.mockResolvedValueOnce(`# PRP-${i}\n[dp] Development progress`);
        await parserWithSmallCache.parsePRPFile(`/test/PRP-${i}.md`);
      }

      const stats = parserWithSmallCache.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Metadata Extraction', () => {
    test('should extract status from content', async () => {
      const content = `
        # Test PRP

        **Status**: ACTIVE
        Priority: CRITICAL
      `;

      mockReadFile.mockResolvedValueOnce(content);
      const prpFile = await parser.parsePRPFile('/test/PRP-test.md');

      expect(prpFile?.metadata.status).toBe('active');
      expect(prpFile?.metadata.priority).toBe('critical');
    });

    test('should extract requirements', async () => {
      const content = `
        # Test PRP

        ## Requirements
        - REQ-001: Implement user authentication
        - REQ-002: Add password validation
        1. REQ-003: Create user dashboard
      `;

      mockReadFile.mockResolvedValueOnce(content);
      const prpFile = await parser.parsePRPFile('/test/PRP-test.md');

      expect(prpFile?.metadata.requirements).toHaveLength(3);
      expect(prpFile?.metadata.requirements[0].id).toBe('REQ-1');
      expect(prpFile?.metadata.requirements[0].title).toBe('REQ-001: Implement user authentication');
    });

    test('should extract acceptance criteria', async () => {
      const content = `
        # Test PRP

        ## Acceptance Criteria
        - User can log in with valid credentials
        - Password must be at least 8 characters
        1. Dashboard displays user profile
      `;

      mockReadFile.mockResolvedValueOnce(content);
      const prpFile = await parser.parsePRPFile('/test/PRP-test.md');

      expect(prpFile?.metadata.acceptanceCriteria).toHaveLength(3);
      expect(prpFile?.metadata.acceptanceCriteria[0].id).toBe('AC-1');
      expect(prpFile?.metadata.acceptanceCriteria[0].description).toBe('User can log in with valid credentials');
    });

    test('should extract tags', async () => {
      const content = `
        # Test PRP

        Tags: authentication, security, user-management
        tags: backend, api
      `;

      mockReadFile.mockResolvedValueOnce(content);
      const prpFile = await parser.parsePRPFile('/test/PRP-test.md');

      expect(prpFile?.metadata.tags).toContain('authentication');
      expect(prpFile?.metadata.tags).toContain('security');
      expect(prpFile?.metadata.tags).toContain('user-management');
      expect(prpFile?.metadata.tags).toContain('backend');
      expect(prpFile?.metadata.tags).toContain('api');
    });

    test('should estimate tokens', async () => {
      const content = 'A'.repeat(1000); // 1000 characters

      mockReadFile.mockResolvedValueOnce(content);
      const prpFile = await parser.parsePRPFile('/test/PRP-test.md');

      expect(prpFile?.metadata.estimatedTokens).toBe(250); // 1000 / 4
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid PRP content gracefully', async () => {
      mockReadFile.mockResolvedValueOnce('Invalid content without proper structure');

      const prpFile = await parser.parsePRPFile('/test/invalid.md');

      expect(prpFile).toBeDefined();
      expect(prpFile?.metadata.title).toBe('Untitled PRP');
      expect(prpFile?.metadata.status).toBe('planning');
    });

    test('should handle cache directory creation failure', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      // Should not throw, just log warning
      expect(() => new EnhancedPRPParser('/invalid/path')).not.toThrow();
    });

    test('should handle cache persistence failure', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));

      mockReadFile.mockResolvedValueOnce('# Test PRP\n[dp] Development progress');

      // Should not throw, just log warning
      const prpFile = await parser.parsePRPFile('/test/PRP-test.md');
      expect(prpFile).toBeDefined();
    });
  });
});