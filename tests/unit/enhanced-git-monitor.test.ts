/**
 * Tests for Enhanced Git Monitor
 */

import { EnhancedGitMonitor } from '../../src/scanner/enhanced-git-monitor';
import { Signal } from '../../src/shared/types';

// Mock execSync to avoid actual git operations during tests
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const mockExecSync = require('child_process').execSync as jest.MockedFunction<typeof require('child_process').execSync>;

// Mock file utilities
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
  TimeUtils: {
    now: jest.fn(() => new Date('2024-01-01T00:00:00Z')),
    daysAgo: jest.fn((days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000))
  },
  FileUtils: {
    readTextFile: jest.fn(() => Promise.resolve('test content')),
    readFileStats: jest.fn(() => Promise.resolve({
      size: 100,
      modified: new Date('2024-01-01T00:00:00Z'),
      isFile: () => true,
      isDirectory: () => false
    })),
    isPRPFile: jest.fn((path: string) => path.includes('PRP'))
  }
}));

describe('Enhanced Git Monitor', () => {
  let monitor: EnhancedGitMonitor;
  const testRepoPath = '/test/repo';

  beforeEach(() => {
    monitor = new EnhancedGitMonitor();
    jest.clearAllMocks();
  });

  describe('Basic Git Status', () => {
    test('should get basic git status successfully', async () => {
      mockExecSync
        .mockReturnValueOnce('main') // branch
        .mockReturnValueOnce('abc123') // commit
        .mockReturnValueOnce(' M src/file.ts\n?? new-file.js') // status
        .mockReturnValueOnce('2\t0'); // divergence (2 ahead, 0 behind)

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.branch).toBe('main');
      expect(status.commit).toBe('abc123');
      expect(status.status).toBe('dirty');
      expect(status.ahead).toBe(2);
      expect(status.behind).toBe(0);
      expect(status.fileChanges).toHaveLength(2);
    });

    test('should handle clean repository', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('') // no status changes
        .mockReturnValueOnce('0\t0'); // no divergence

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.status).toBe('clean');
      expect(status.fileChanges).toHaveLength(0);
    });

    test('should handle repository with conflicts', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('UU conflicted-file.js') // merge conflict
        .mockReturnValueOnce('0\t0');

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.status).toBe('conflict');
      expect(status.fileChanges).toHaveLength(1);
    });

    test('should handle diverged repository', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('3\t1'); // 3 ahead, 1 behind

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.status).toBe('diverged');
      expect(status.ahead).toBe(3);
      expect(status.behind).toBe(1);
    });
  });

  describe('Signal Detection', () => {
    test('should detect signals in commit messages', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('0\t0')
        .mockReturnValueOnce('def456|[dp] Development progress made|John Doe|2024-01-01'); // commit log

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.commitSignals).toHaveLength(1);
      expect(status.commitSignals[0].type).toBe('dp');
      expect(status.commitSignals[0].metadata.commit).toBe('def456');
      expect(status.commitSignals[0].metadata.author).toBe('John Doe');
    });

    test('should detect signals in branch names', async () => {
      mockExecSync
        .mockReturnValueOnce('feature/[bb]-blocked-by-api')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('0\t0');

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.branchSignals).toHaveLength(1);
      expect(status.branchSignals[0].type).toBe('bb');
      expect(status.branchSignals[0].metadata.branch).toBe('feature/[bb]-blocked-by-api');
    });

    test('should detect signals in branch descriptions', async () => {
      mockExecSync
        .mockReturnValueOnce('feature/test-branch')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('0\t0')
        .mockReturnValueOnce('[tp] Tests prepared for this feature'); // branch description

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.branchSignals).toHaveLength(1);
      expect(status.branchSignals[0].type).toBe('tp');
      expect(status.branchSignals[0].metadata.source).toBe('git-branch-description');
    });
  });

  describe('PR Detection', () => {
    test('should detect signals in pull requests', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('0\t0');

      // Mock GitHub CLI response
      mockExecSync.mockReturnValueOnce(JSON.stringify([
        {
          number: 123,
          title: '[bf] Bug fixed in authentication',
          body: '[rv] Review passed and ready to merge',
          author: { login: 'testuser' },
          state: 'open',
          headRefName: 'feature/auth-fix',
          baseRefName: 'main',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]));

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.prSignals).toHaveLength(2);
      expect(status.prSignals.some(s => s.type === 'bf')).toBe(true);
      expect(status.prSignals.some(s => s.type === 'rv')).toBe(true);
      expect(status.prSignals[0].metadata.prNumber).toBe(123);
      expect(status.prSignals[0].metadata.prAuthor).toBe('testuser');
    });

    test('should handle missing GitHub CLI gracefully', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('0\t0')
        .mockImplementationOnce(() => {
          throw new Error('GitHub CLI not found');
        });

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.prSignals).toHaveLength(0);
    });
  });

  describe('File Changes Enhancement', () => {
    test('should enhance file changes with signal detection', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('M PRPs/test-prp.md\nA src/file.ts')
        .mockReturnValueOnce('0\t0');

      // Mock PRP file content with signals
      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.readTextFile.mockResolvedValueOnce('# Test PRP\n\n[dp] Development progress made');
      mockFileUtils.readFileStats.mockResolvedValueOnce({
        size: 200,
        modified: new Date('2024-01-01T00:00:00Z'),
        isFile: () => true,
        isDirectory: () => false
      });
      mockFileUtils.isPRPFile.mockReturnValue(true);

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      const prpFileChange = status.fileChanges.find(fc => fc.path === 'PRPs/test-prp.md');
      expect(prpFileChange).toBeDefined();
      expect(prpFileChange?.isPRPFile).toBe(true);
      expect(prpFileChange?.signals).toHaveLength(1);
      expect(prpFileChange?.signals[0].type).toBe('dp');
    });

    test('should handle non-PRP files', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('M src/regular-file.ts')
        .mockReturnValueOnce('0\t0');

      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(false);

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      const fileChange = status.fileChanges[0];
      expect(fileChange.isPRPFile).toBe(false);
      expect(fileChange.signals).toHaveLength(0);
    });

    test('should handle deleted files', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('D src/old-file.ts')
        .mockReturnValueOnce('0\t0');

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      const fileChange = status.fileChanges[0];
      expect(fileChange.status).toBe('deleted');
      expect(fileChange.size).toBe(0);
    });
  });

  describe('Commit Information', () => {
    test('should get commit with signals', async () => {
      mockExecSync.mockReturnValueOnce(
        `abc123\n[bf] Bug fixed in authentication\nJohn Doe\njohn@example.com\n2024-01-01T00:00:00Z\nDeveloper\n\n5\t2\t0\nsrc/file.ts\nsrc/another-file.ts`
      );

      const commit = await monitor.getCommitWithSignals(testRepoPath, 'abc123');

      expect(commit).toBeDefined();
      expect(commit?.commit).toBe('abc123');
      expect(commit?.message).toBe('[bf] Bug fixed in authentication');
      expect(commit?.author).toBe('John Doe');
      expect(commit?.signals).toHaveLength(1);
      expect(commit?.signals[0].type).toBe('bf');
    });

    test('should handle commit not found', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('fatal: not a git repository');
      });

      const commit = await monitor.getCommitWithSignals(testRepoPath, 'invalid-commit');

      expect(commit).toBeNull();
    });
  });

  describe('Branch Information', () => {
    test('should get branches with signals', async () => {
      mockExecSync.mockReturnValueOnce(
        `main|abc123|origin/main\nfeature/test|def456|origin/feature/test\nfeature/[dp]-progress|ghi789|`
      );

      const branches = await monitor.getBranchesWithSignals(testRepoPath);

      expect(branches).toHaveLength(3);

      const featureBranch = branches.find(b => b.name === 'feature/[dp]-progress');
      expect(featureBranch).toBeDefined();
      expect(featureBranch?.signals).toHaveLength(1);
      expect(featureBranch?.signals[0].type).toBe('dp');
    });

    test('should handle empty repository', async () => {
      mockExecSync.mockReturnValueOnce('');

      const branches = await monitor.getBranchesWithSignals(testRepoPath);

      expect(branches).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    test('should use cache for repeated requests', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('0\t0');

      // First call
      await monitor.getEnhancedGitStatus(testRepoPath);

      // Second call should use cached data where possible
      await monitor.getEnhancedGitStatus(testRepoPath);

      // Should not make excessive calls due to caching
      expect(mockExecSync).toHaveBeenCalledTimes(4);
    });

    test('should clear caches', () => {
      const statsBefore = monitor.getCacheStats();
      monitor.clearCaches();
      const statsAfter = monitor.getCacheStats();

      expect(statsAfter.lastScannedCommits).toBe(0);
      expect(statsAfter.commitCache).toBe(0);
      expect(statsAfter.branchCache).toBe(0);
      expect(statsAfter.prCache).toBe(0);
    });

    test('should provide cache statistics', () => {
      const stats = monitor.getCacheStats();

      expect(stats).toHaveProperty('lastScannedCommits');
      expect(stats).toHaveProperty('commitCache');
      expect(stats).toHaveProperty('branchCache');
      expect(stats).toHaveProperty('prCache');
      expect(typeof stats.lastScannedCommits).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should handle git repository errors', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('fatal: not a git repository');
      });

      await expect(monitor.getEnhancedGitStatus(testRepoPath)).rejects.toThrow();
    });

    test('should handle branch parsing errors', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('invalid-divergence-output');

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      expect(status.ahead).toBe(0);
      expect(status.behind).toBe(0);
    });

    test('should handle file reading errors gracefully', async () => {
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('M PRPs/test-prp.md')
        .mockReturnValueOnce('0\t0');

      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.readTextFile.mockRejectedValueOnce(new Error('Permission denied'));
      mockFileUtils.isPRPFile.mockReturnValue(true);

      const status = await monitor.getEnhancedGitStatus(testRepoPath);

      // Should not crash, just continue without signals
      expect(status.fileChanges).toHaveLength(1);
      expect(status.fileChanges[0].signals).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    test('should handle large number of files efficiently', async () => {
      // Mock many file changes
      const manyFiles = Array(1000).fill(0).map((_, i) => `M src/file${i}.ts`).join('\n');

      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce(manyFiles)
        .mockReturnValueOnce('0\t0');

      const startTime = Date.now();
      const status = await monitor.getEnhancedGitStatus(testRepoPath);
      const endTime = Date.now();

      expect(status.fileChanges).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});