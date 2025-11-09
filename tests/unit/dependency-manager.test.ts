/**
 * Dependency Manager Tests
 *
 * Tests for intelligent dependency resolution, conflict detection,
 * and package management features
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DependencyManager } from '../../src/generators/dependency-manager.js';
import axios from 'axios';
import semver from 'semver';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';

// Mock external dependencies
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('semver');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockSemver = semver as jest.Mocked<typeof semver>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('DependencyManager', () => {
  let dependencyManager: DependencyManager;
  let tempDir: tmp.DirResult;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = tmp.dirSync({ unsafeCleanup: true });

    // Mock fs operations
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');

    // Mock semver operations
    mockSemver.valid.mockReturnValue('1.0.0');
    mockSemver.validRange.mockReturnValue('^1.0.0');
    mockSemver.satisfies.mockReturnValue(true);
    mockSemver.maxSatisfying.mockReturnValue('1.2.0');
    mockSemver.parse.mockReturnValue({
      major: 1,
      minor: 2,
      patch: 0
    } as any);

    // Mock axios responses
    mockAxios.create = jest.fn(() => mockAxios);
    mockAxios.get.mockResolvedValue({
      data: {
        version: '1.0.0',
        description: 'Test package',
        keywords: ['test'],
        license: 'MIT',
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        engines: { node: '>=14.0.0' },
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            description: 'Test package v1.0.0'
          },
          '1.1.0': {
            description: 'Test package v1.1.0'
          },
          '1.2.0': {
            description: 'Test package v1.2.0'
          }
        },
        time: {
          modified: '2023-01-01T00:00:00.000Z'
        }
      }
    });

    dependencyManager = new DependencyManager();
  });

  afterEach(() => {
    if (tempDir) {
      tempDir.removeCallback();
    }
    dependencyManager.clearCache();
  });

  describe('Version Resolution', () => {
    it('should resolve latest versions', async () => {
      const dependencies = {
        'test-package': 'latest'
      };

      const resolved = await dependencyManager.resolveVersions(dependencies);
      expect(resolved['test-package']).toMatch(/^\^\d+\.\d+\.\d+$/);
    });

    it('should handle wildcard versions', async () => {
      const dependencies = {
        'test-package': '*'
      };

      const resolved = await dependencyManager.resolveVersions(dependencies);
      expect(resolved['test-package']).toMatch(/^\^\d+\.\d+\.\d+$/);
    });

    it('should preserve exact versions with caret', async () => {
      const dependencies = {
        'test-package': '1.2.3'
      };

      mockSemver.valid.mockReturnValue('1.2.3');

      const resolved = await dependencyManager.resolveVersions(dependencies);
      expect(resolved['test-package']).toBe('^1.2.3');
    });

    it('should preserve range specifications', async () => {
      const dependencies = {
        'test-package': '^1.0.0',
        'other-package': '~2.0.0',
        'range-package': '>=1.0.0 <2.0.0'
      };

      const resolved = await dependencyManager.resolveVersions(dependencies);
      expect(resolved['test-package']).toBe('^1.0.0');
      expect(resolved['other-package']).toBe('~2.0.0');
      expect(resolved['range-package']).toBe('>=1.0.0 <2.0.0');
    });

    it('should handle resolution failures gracefully', async () => {
      const dependencies = {
        'nonexistent-package': 'latest'
      };

      mockAxios.get.mockRejectedValue(new Error('Package not found'));

      const resolved = await dependencyManager.resolveVersions(dependencies);
      expect(resolved['nonexistent-package']).toBe('latest');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect peer dependency conflicts', async () => {
      const dependencies = {
        'react': '^16.0.0',
        'react-dom': '^18.0.0'
      };

      // Mock react-dom peer dependency requiring react ^17.0.0 || ^18.0.0
      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('react-dom')) {
          return Promise.resolve({
            data: {
              version: '18.0.0',
              peerDependencies: {
                'react': '^17.0.0 || ^18.0.0'
              }
            }
          });
        }
        return Promise.resolve({
          data: { version: '16.0.0' }
        });
      });

      mockSemver.satisfies.mockReturnValue(false);

      const conflicts = await dependencyManager.detectConflicts(dependencies);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('peer');
      expect(conflicts[0].package).toBe('react-dom');
    });

    it('should detect deprecated packages', async () => {
      const dependencies = {
        'deprecated-package': '^1.0.0'
      };

      mockAxios.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          deprecated: 'This package is deprecated. Use new-package instead.'
        }
      });

      const conflicts = await dependencyManager.detectConflicts(dependencies);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('version');
      expect(conflicts[0].severity).toBe('warning');
    });

    it('should detect known conflicting packages', async () => {
      const dependencies = {
        'webpack': '^5.0.0',
        'vite': '^4.0.0'
      };

      mockAxios.get.mockResolvedValue({
        data: { version: '1.0.0' }
      });

      const conflicts = await dependencyManager.detectConflicts(dependencies);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.package === 'webpack')).toBe(true);
      expect(conflicts.some(c => c.package === 'vite')).toBe(true);
    });
  });

  describe('Package Information', () => {
    it('should get package information from npm registry', async () => {
      const packageName = 'test-package';

      mockAxios.get.mockResolvedValue({
        data: {
          name: packageName,
          version: '1.0.0',
          description: 'Test package description',
          keywords: ['test', 'example'],
          license: 'MIT',
          repository: { url: 'https://github.com/test/test-package' },
          dependencies: { 'lodash': '^4.17.21' },
          devDependencies: { 'jest': '^27.0.0' },
          peerDependencies: {},
          engines: { node: '>=14.0.0' },
          maintainers: [
            { name: 'Test Author', email: 'test@example.com' }
          ],
          time: { modified: '2023-01-01T00:00:00.000Z' },
          downloads: { lastMonth: 10000 }
        }
      });

      const packageInfo = await dependencyManager.getPackageInfo(packageName);

      expect(packageInfo.name).toBe(packageName);
      expect(packageInfo.version).toBe('1.0.0');
      expect(packageInfo.description).toBe('Test package description');
      expect(packageInfo.keywords).toEqual(['test', 'example']);
      expect(packageInfo.license).toBe('MIT');
      expect(packageInfo.dependencies).toEqual({ 'lodash': '^4.17.21' });
    });

    it('should cache package information', async () => {
      const packageName = 'cache-test-package';

      mockAxios.get.mockResolvedValue({
        data: {
          name: packageName,
          version: '1.0.0',
          description: 'Cache test package'
        }
      });

      // First call should hit the network
      const info1 = await dependencyManager.getPackageInfo(packageName);
      expect(mockAxios.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const info2 = await dependencyManager.getPackageInfo(packageName);
      expect(mockAxios.get).toHaveBeenCalledTimes(1);

      expect(info1).toEqual(info2);
    });

    it('should handle package not found errors', async () => {
      const packageName = 'nonexistent-package';

      mockAxios.get.mockRejectedValue(new Error('Not Found'));

      await expect(dependencyManager.getPackageInfo(packageName))
        .rejects.toThrow('Failed to get package information for nonexistent-package');
    });

    it('should get latest version efficiently', async () => {
      const packageName = 'test-package';
      const latestVersion = '1.2.0';

      mockAxios.get.mockResolvedValue({
        data: {
          version: latestVersion,
          description: 'Latest test package'
        }
      });

      const version = await dependencyManager.getLatestVersion(packageName);
      expect(version).toBe(latestVersion);
    });
  });

  describe('Package Manager Detection', () => {
    it('should detect npm from package-lock.json', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith('package-lock.json');
      });

      const packageManager = dependencyManager.detectPackageManager('/test/project');
      expect(packageManager).toBe('npm');
    });

    it('should detect yarn from yarn.lock', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith('yarn.lock');
      });

      const packageManager = dependencyManager.detectPackageManager('/test/project');
      expect(packageManager).toBe('yarn');
    });

    it('should detect pnpm from pnpm-lock.yaml', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith('pnpm-lock.yaml');
      });

      const packageManager = dependencyManager.detectPackageManager('/test/project');
      expect(packageManager).toBe('pnpm');
    });

    it('should detect bun from bun.lockb', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith('bun.lockb');
      });

      const packageManager = dependencyManager.detectPackageManager('/test/project');
      expect(packageManager).toBe('bun');
    });

    it('should default to npm when no lock file found', () => {
      mockFs.existsSync.mockReturnValue(false);

      const packageManager = dependencyManager.detectPackageManager('/test/project');
      expect(packageManager).toBe('npm');
    });

    it('should cache package manager detection', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith('yarn.lock');
      });

      const projectPath = '/test/project';
      const pm1 = dependencyManager.detectPackageManager(projectPath);
      const pm2 = dependencyManager.detectPackageManager(projectPath);

      expect(pm1).toBe('yarn');
      expect(pm2).toBe('yarn');
      expect(mockFs.existsSync).toHaveBeenCalledTimes(2); // Called for each lock file type
    });
  });

  describe('Dependency Installation', () => {
    it('should install dependencies with npm', async () => {
      const dependencies = { 'test-package': '^1.0.0' };

      const mockExeca = { execa: jest.fn() };
      jest.doMock('execa', () => mockExeca);
      mockExeca.execa.mockResolvedValue({ exitCode: 0 });

      await dependencyManager.installDependencies(dependencies, 'npm');

      expect(mockExeca.execa).toHaveBeenCalledWith('npm', ['install'], { stdio: 'inherit' });
    });

    it('should install dependencies with yarn', async () => {
      const dependencies = { 'test-package': '^1.0.0' };

      const mockExeca = { execa: jest.fn() };
      jest.doMock('execa', () => mockExeca);
      mockExeca.execa.mockResolvedValue({ exitCode: 0 });

      await dependencyManager.installDependencies(dependencies, 'yarn');

      expect(mockExeca.execa).toHaveBeenCalledWith('yarn', ['install'], { stdio: 'inherit' });
    });

    it('should install dependencies with pnpm', async () => {
      const dependencies = { 'test-package': '^1.0.0' };

      const mockExeca = { execa: jest.fn() };
      jest.doMock('execa', () => mockExeca);
      mockExeca.execa.mockResolvedValue({ exitCode: 0 });

      await dependencyManager.installDependencies(dependencies, 'pnpm');

      expect(mockExeca.execa).toHaveBeenCalledWith('pnpm', ['install'], { stdio: 'inherit' });
    });

    it('should install dependencies with bun', async () => {
      const dependencies = { 'test-package': '^1.0.0' };

      const mockExeca = { execa: jest.fn() };
      jest.doMock('execa', () => mockExeca);
      mockExeca.execa.mockResolvedValue({ exitCode: 0 });

      await dependencyManager.installDependencies(dependencies, 'bun');

      expect(mockExeca.execa).toHaveBeenCalledWith('bun', ['install'], { stdio: 'inherit' });
    });

    it('should default to npm when no package manager specified', async () => {
      const dependencies = { 'test-package': '^1.0.0' };

      const mockExeca = { execa: jest.fn() };
      jest.doMock('execa', () => mockExeca);
      mockExeca.execa.mockResolvedValue({ exitCode: 0 });

      await dependencyManager.installDependencies(dependencies);

      expect(mockExeca.execa).toHaveBeenCalledWith('npm', ['install'], { stdio: 'inherit' });
    });
  });

  describe('Version Range Operations', () => {
    it('should get compatible versions for a range', async () => {
      const packageName = 'test-package';
      const range = '^1.0.0';

      mockAxios.get.mockResolvedValue({
        data: {
          versions: {
            '1.0.0': { version: '1.0.0' },
            '1.1.0': { version: '1.1.0' },
            '1.2.0': { version: '1.2.0' },
            '2.0.0': { version: '2.0.0' }
          }
        }
      });

      mockSemver.satisfies.mockImplementation((version: string, range: string) => {
        return version.startsWith('1.');
      });

      const versions = await dependencyManager.getVersionRange(packageName, range);
      expect(versions).toContain('1.0.0');
      expect(versions).toContain('1.1.0');
      expect(versions).toContain('1.2.0');
      expect(versions).not.toContain('2.0.0');
    });

    it('should limit number of returned versions', async () => {
      const packageName = 'test-package';
      const range = '*';

      const versions: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        versions[`1.${i}.0`] = { version: `1.${i}.0` };
      }

      mockAxios.get.mockResolvedValue({
        data: { versions }
      });

      mockSemver.satisfies.mockReturnValue(true);

      const result = await dependencyManager.getVersionRange(packageName, range);
      expect(result.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Dependency Optimization', () => {
    it('should suggest common dependencies for frontend templates', async () => {
      const dependencies = { 'react': '^18.0.0' };
      const template = {
        name: 'react',
        category: 'frontend' as const,
        tags: ['react', 'frontend'],
        dependencies: { required: {}, optional: {}, dev: {} }
      };

      mockAxios.get.mockResolvedValue({
        data: { version: '1.0.0' }
      });

      const result = await dependencyManager.optimizeDependencies(dependencies, template);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('ESLint'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('Prettier'))).toBe(true);
    });

    it('should remove deprecated packages', async () => {
      const dependencies = { 'deprecated-package': '^1.0.0' };

      mockAxios.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          deprecated: 'This package is deprecated'
        }
      });

      const template = {
        name: 'test',
        category: 'library' as const,
        tags: [],
        dependencies: { required: {}, optional: {}, dev: {} }
      };

      const result = await dependencyManager.optimizeDependencies(dependencies, template);

      expect(result.removed).toContain('deprecated-package');
      expect(result.optimized).not.toHaveProperty('deprecated-package');
    });

    it('should warn about packages with low download counts', async () => {
      const dependencies = { 'obscure-package': '^1.0.0' };

      mockAxios.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          downloads: { lastMonth: 500 } // Low download count
        }
      });

      const template = {
        name: 'test',
        category: 'library' as const,
        tags: [],
        dependencies: { required: {}, optional: {}, dev: {} }
      };

      const result = await dependencyManager.optimizeDependencies(dependencies, template);

      expect(result.suggestions.some(s => s.includes('low download count'))).toBe(true);
    });

    it('should warn about packages not updated recently', async () => {
      const dependencies = { 'stale-package': '^1.0.0' };

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 7);

      mockAxios.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          time: { modified: sixMonthsAgo.toISOString() }
        }
      });

      const template = {
        name: 'test',
        category: 'library' as const,
        tags: [],
        dependencies: { required: {}, optional: {}, dev: {} }
      };

      const result = await dependencyManager.optimizeDependencies(dependencies, template);

      expect(result.suggestions.some(s => s.includes('over 6 months'))).toBe(true);
    });
  });

  describe('Dependency Validation', () => {
    it('should validate dependency versions', async () => {
      const dependencies = {
        'test-package': '^1.0.0',
        'exact-package': '1.2.3'
      };

      mockAxios.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          engines: { node: '>=14.0.0' }
        }
      });

      mockSemver.valid.mockImplementation((version: string) => {
        return version === '1.2.3' ? '1.2.3' : null;
      });

      const result = await dependencyManager.validateDependencies(dependencies);

      expect(result.isValid).toBe(true);
      expect(result.suggestions).toContain(
        'Consider using a flexible version range for exact-package instead of exact version 1.2.3'
      );
    });

    it('should check Node.js engine compatibility', async () => {
      const dependencies = { 'node-requiring-package': '^1.0.0' };

      mockAxios.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          engines: { node: '>=20.0.0' }
        }
      });

      mockSemver.satisfies.mockReturnValue(false);

      const result = await dependencyManager.validateDependencies(dependencies);

      expect(result.warnings).toContain(
        expect.stringContaining('requires Node.js >=20.0.0, but you have')
      );
    });

    it('should warn about significantly older versions', async () => {
      const dependencies = { 'outdated-package': '^1.0.0' };

      mockAxios.get
        .mockResolvedValueOnce({
          data: { version: '1.0.0' }
        })
        .mockResolvedValueOnce({
          data: { version: '5.0.0' }
        });

      mockSemver.parse.mockImplementation((version: string) => ({
        major: version === '1.0.0' ? 1 : 5,
        minor: 0,
        patch: 0
      } as any));

      mockSemver.compare.mockReturnValue(-1);

      const result = await dependencyManager.validateDependencies(dependencies);

      expect(result.warnings).toContain(
        expect.stringContaining('significantly older than the latest version')
      );
    });
  });

  describe('Cache Management', () => {
    it('should cache package information', async () => {
      const packageName = 'cache-test-package';

      mockAxios.get.mockResolvedValue({
        data: {
          name: packageName,
          version: '1.0.0'
        }
      });

      // First call
      await dependencyManager.getPackageInfo(packageName);
      let stats = dependencyManager.getCacheStats();
      expect(stats.packageInfo).toBe(1);

      // Second call should use cache
      await dependencyManager.getPackageInfo(packageName);
      stats = dependencyManager.getCacheStats();
      expect(stats.packageInfo).toBe(1);
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should cache package manager detection', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith('package-lock.json');
      });

      const projectPath = '/test/project';

      // First call
      dependencyManager.detectPackageManager(projectPath);
      let stats = dependencyManager.getCacheStats();
      expect(stats.packageManager).toBe(1);

      // Second call should use cache
      dependencyManager.detectPackageManager(projectPath);
      stats = dependencyManager.getCacheStats();
      expect(stats.packageManager).toBe(1);
    });

    it('should clear cache completely', () => {
      mockFs.existsSync.mockReturnValue(true);

      // Add some data to cache
      dependencyManager.detectPackageManager('/test1');
      dependencyManager.detectPackageManager('/test2');

      let stats = dependencyManager.getCacheStats();
      expect(stats.packageManager).toBe(2);

      // Clear cache
      dependencyManager.clearCache();

      stats = dependencyManager.getCacheStats();
      expect(stats.packageManager).toBe(0);
      expect(stats.packageInfo).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(dependencyManager.getLatestVersion('test-package'))
        .rejects.toThrow('Failed to get latest version for test-package');
    });

    it('should handle malformed registry responses', async () => {
      mockAxios.get.mockResolvedValue({
        data: null // Malformed response
      });

      await expect(dependencyManager.getPackageInfo('test-package'))
        .rejects.toThrow('Failed to get package information for test-package');
    });

    it('should handle missing version information', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          name: 'test-package'
          // Missing version
        }
      });

      const packageInfo = await dependencyManager.getPackageInfo('test-package');
      expect(packageInfo.version).toBe('0.0.0'); // Fallback version
    });

    it('should handle installation failures', async () => {
      const dependencies = { 'test-package': '^1.0.0' };

      const mockExeca = { execa: jest.fn() };
      jest.doMock('execa', () => mockExeca);
      mockExeca.execa.mockRejectedValue(new Error('Installation failed'));

      await expect(dependencyManager.installDependencies(dependencies))
        .rejects.toThrow('Failed to install dependencies using npm');
    });
  });
});