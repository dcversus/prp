import { FileHasher } from '../file-hasher.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileHasher', () => {
  let fileHasher: FileHasher;
  let testDir: string;
  let testFile: string;

  beforeEach(() => {
    fileHasher = new FileHasher(10); // Small cache for testing
    testDir = join(tmpdir(), `file-hasher-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testFile = join(testDir, 'test.txt');
    writeFileSync(testFile, 'test content');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('hashFile', () => {
    it('should calculate SHA-256 hash by default', async () => {
      const result = await fileHasher.hashFile(testFile);

      expect(result.path).toBe(testFile);
      expect(result.algorithm).toBe('sha256');
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.size).toBeGreaterThan(0);
      expect(result.lastModified).toBeInstanceOf(Date);
    });

    it('should use specified algorithm', async () => {
      const result = await fileHasher.hashFile(testFile, 'md5');

      expect(result.algorithm).toBe('md5');
      expect(result.hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should cache hash results', async () => {
      const hash1 = await fileHasher.hashFile(testFile);
      const hash2 = await fileHasher.hashFile(testFile);

      expect(hash1.hash).toBe(hash2.hash);
      expect(hash1.lastModified).toBe(hash2.lastModified);
    });

    it('should recalculate if file is modified', async () => {
      const hash1 = await fileHasher.hashFile(testFile);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify file
      writeFileSync(testFile, 'modified content');

      const hash2 = await fileHasher.hashFile(testFile);

      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash2.hash).not.toBe(hash1.hash);
    });

    it('should throw error for non-existent file', async () => {
      await expect(fileHasher.hashFile('/non/existent/file.txt'))
        .rejects.toThrow('Failed to hash file');
    });
  });

  describe('hasFileChanged', () => {
    it('should return true for new files', async () => {
      const hasChanged = await fileHasher.hasFileChanged(testFile);
      expect(hasChanged).toBe(true);
    });

    it('should return false for unchanged files', async () => {
      await fileHasher.hashFile(testFile);
      const hasChanged = await fileHasher.hasFileChanged(testFile);
      expect(hasChanged).toBe(false);
    });

    it('should return true for modified files', async () => {
      await fileHasher.hashFile(testFile);

      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      writeFileSync(testFile, 'modified content');

      const hasChanged = await fileHasher.hasFileChanged(testFile);
      expect(hasChanged).toBe(true);
    });

    it('should return true for non-existent files', async () => {
      const hasChanged = await fileHasher.hasFileChanged('/non/existent/file.txt');
      expect(hasChanged).toBe(true);
    });
  });

  describe('getCachedHash', () => {
    it('should return null for uncached files', () => {
      const cached = fileHasher.getCachedHash(testFile);
      expect(cached).toBeNull();
    });

    it('should return cached hash for cached files', async () => {
      const hash = await fileHasher.hashFile(testFile);
      const cached = fileHasher.getCachedHash(testFile);

      expect(cached).not.toBeNull();
      expect(cached!.hash).toBe(hash.hash);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await fileHasher.hashFile(testFile);
      expect(fileHasher.getCachedHash(testFile)).not.toBeNull();

      fileHasher.clearCache();
      expect(fileHasher.getCachedHash(testFile)).toBeNull();
    });

    it('should provide cache statistics', async () => {
      expect(fileHasher.getCacheStats().size).toBe(0);

      await fileHasher.hashFile(testFile);
      const stats = fileHasher.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(10);
    });

    it('should evict LRU entries when cache is full', async () => {
      const smallHasher = new FileHasher(2);

      // Fill cache
      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'file2.txt');
      const file3 = join(testDir, 'file3.txt');

      writeFileSync(file1, 'content1');
      writeFileSync(file2, 'content2');
      writeFileSync(file3, 'content3');

      await smallHasher.hashFile(file1);
      await smallHasher.hashFile(file2);

      expect(smallHasher.getCachedHash(file1)).not.toBeNull();
      expect(smallHasher.getCachedHash(file2)).not.toBeNull();

      // Add third file, should evict first
      await smallHasher.hashFile(file3);

      expect(smallHasher.getCachedHash(file1)).toBeNull();
      expect(smallHasher.getCachedHash(file2)).not.toBeNull();
      expect(smallHasher.getCachedHash(file3)).not.toBeNull();
    });
  });
});