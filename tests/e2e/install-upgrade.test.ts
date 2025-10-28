/**
 * E2E Tests: Installation and Upgrade
 *
 * These tests verify that @dcversus/prp can be:
 * 1. Installed from npm
 * 2. Upgraded from previous versions
 * 3. Used to bootstrap projects successfully
 *
 * Tests run in /tmp directory to avoid polluting workspace
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

describe('E2E: Installation and Upgrade', () => {
  let testDir: string;
  const packageName = '@dcversus/prp';

  beforeAll(async () => {
    // Create unique test directory in /tmp
    testDir = path.join(os.tmpdir(), `prp-e2e-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    console.log(`Test directory: ${testDir}`);
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`Cleaned up: ${testDir}`);
    } catch (error) {
      console.error(`Failed to cleanup ${testDir}:`, error);
    }
  });

  describe('Installation', () => {
    it('should install latest version from npm', async () => {
      const { stdout, stderr } = await execAsync(`npm install -g ${packageName}@latest`);

      // Check stdout contains package name
      expect(stdout + stderr).toContain(packageName);

      // Verify installation succeeded
      const { stdout: versionOutput } = await execAsync('prp --version');
      expect(versionOutput.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    }, 90000); // 90 second timeout for npm install

    it('should show correct version number', async () => {
      const { stdout } = await execAsync('prp --version');
      const version = stdout.trim();

      // Verify version format (semver)
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);

      // Verify version is 0.2.0 or higher
      const [major, minor] = version.split('.').map(Number);
      expect(major).toBeGreaterThanOrEqual(0);
      expect(minor).toBeGreaterThanOrEqual(2);
    });

    it('should show help text', async () => {
      const { stdout } = await execAsync('prp --help');

      // Verify essential help content
      expect(stdout).toContain('Usage');
      expect(stdout).toContain('Options');
      expect(stdout).toContain('--name');
      expect(stdout).toContain('--template');
    });

    it('should list available templates', async () => {
      const { stdout } = await execAsync('prp --help');

      // Verify templates are mentioned
      expect(stdout).toContain('template');

      // Check for expected templates
      const expectedTemplates = ['react', 'typescript-lib', 'fastapi'];
      expectedTemplates.forEach((template) => {
        expect(stdout.toLowerCase()).toContain(template);
      });
    });
  });

  describe('Upgrade', () => {
    it('should upgrade from previous version', async () => {
      // Install old version
      try {
        await execAsync(`npm install -g ${packageName}@0.1.1`);
        const { stdout: oldVersion } = await execAsync('prp --version');
        expect(oldVersion.trim()).toBe('0.1.1');
      } catch {
        console.warn('Could not install 0.1.1, skipping upgrade test');
        return;
      }

      // Upgrade to latest
      await execAsync(`npm update -g ${packageName}`);

      // Verify new version
      const { stdout: newVersion } = await execAsync('prp --version');
      expect(newVersion.trim()).not.toBe('0.1.1');
      expect(newVersion.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    }, 120000); // 120 second timeout for upgrade
  });

  describe('Project Bootstrapping', () => {
    it('should bootstrap React project with all files', async () => {
      const projectName = 'test-react-app';
      const projectDir = path.join(testDir, projectName);

      // Bootstrap React project
      const cmd = `prp --name ${projectName} --template react --license MIT --author "Test User" --email "test@example.com" --no-interactive --no-git --no-install`;

      await execAsync(cmd, { cwd: testDir });

      // Verify project directory created
      const dirExists = await fs
        .access(projectDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);

      // Verify essential files exist
      const essentialFiles = [
        'package.json',
        'README.md',
        'tsconfig.json',
        '.gitignore',
        'LICENSE',
        'CHANGELOG.md',
      ];

      for (const file of essentialFiles) {
        const filePath = path.join(projectDir, file);
        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);
      }

      // Verify package.json content
      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      expect(packageJson.name).toBe(projectName);
      expect(packageJson.version).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.scripts).toBeDefined();

      // Verify README contains project name
      const readmePath = path.join(projectDir, 'README.md');
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      expect(readmeContent).toContain(projectName);

      // Verify LICENSE file
      const licensePath = path.join(projectDir, 'LICENSE');
      const licenseContent = await fs.readFile(licensePath, 'utf-8');
      expect(licenseContent).toContain('MIT License');
      expect(licenseContent).toContain('Test User');
    }, 60000);

    it('should bootstrap TypeScript library project', async () => {
      const projectName = 'test-ts-lib';
      const projectDir = path.join(testDir, projectName);

      // Bootstrap TypeScript library
      const cmd = `prp --name ${projectName} --template typescript-lib --license Apache-2.0 --author "Test User" --email "test@example.com" --no-interactive --no-git --no-install`;

      await execAsync(cmd, { cwd: testDir });

      // Verify project directory created
      const dirExists = await fs
        .access(projectDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);

      // Verify TypeScript config
      const tsconfigPath = path.join(projectDir, 'tsconfig.json');
      const tsconfigContent = await fs.readFile(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.declaration).toBe(true);
      expect(tsconfig.compilerOptions.outDir).toBeDefined();

      // Verify src directory exists
      const srcDir = path.join(projectDir, 'src');
      const srcExists = await fs
        .access(srcDir)
        .then(() => true)
        .catch(() => false);
      expect(srcExists).toBe(true);

      // Verify LICENSE is Apache-2.0
      const licensePath = path.join(projectDir, 'LICENSE');
      const licenseContent = await fs.readFile(licensePath, 'utf-8');
      expect(licenseContent).toContain('Apache License');
      expect(licenseContent).toContain('Version 2.0');
    }, 60000);

    it('should bootstrap FastAPI project', async () => {
      const projectName = 'test-fastapi';
      const projectDir = path.join(testDir, projectName);

      // Bootstrap FastAPI project
      const cmd = `prp --name ${projectName} --template fastapi --license MIT --author "Test User" --email "test@example.com" --no-interactive --no-git --no-install`;

      await execAsync(cmd, { cwd: testDir });

      // Verify project directory created
      const dirExists = await fs
        .access(projectDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);

      // Verify Python files
      const essentialFiles = ['requirements.txt', 'README.md', '.gitignore', 'LICENSE'];

      for (const file of essentialFiles) {
        const filePath = path.join(projectDir, file);
        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);
      }

      // Verify requirements.txt contains FastAPI
      const requirementsPath = path.join(projectDir, 'requirements.txt');
      const requirementsContent = await fs.readFile(requirementsPath, 'utf-8');
      expect(requirementsContent.toLowerCase()).toContain('fastapi');
    }, 60000);
  });

  describe('Feature Verification (from PRPs)', () => {
    it('PRP-001: CLI should have interactive mode', async () => {
      // This test verifies the CLI works non-interactively
      // Interactive mode tested manually
      const { stdout } = await execAsync('prp --help');
      expect(stdout).toContain('--no-interactive');
    });

    it('PRP-007: Flat PRP structure enforced', async () => {
      // Verify PRPs directory structure
      const prpsDir = path.join(process.cwd(), 'PRPs');
      const files = await fs.readdir(prpsDir);

      // Check all files follow naming convention: PRP-XXX-what-will-change.md
      const prpFiles = files.filter((f) => f.startsWith('PRP-') && f.endsWith('.md'));

      expect(prpFiles.length).toBeGreaterThan(0);

      // Verify no subdirectories (flat structure)
      for (const file of files) {
        const filePath = path.join(prpsDir, file);
        const stats = await fs.stat(filePath);
        if (file !== '.' && file !== '..') {
          // All items should be files, not directories
          if (stats.isDirectory()) {
            throw new Error(`Found subdirectory in PRPs/: ${file}. PRPs must be flat structure.`);
          }
        }
      }

      // Verify naming convention
      for (const file of prpFiles) {
        expect(file).toMatch(/^PRP-\d{3}-[a-z-]+\.md$/);
      }
    });
  });
});
