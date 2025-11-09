/**
 * E2E Test: CLI Init Integration Tests
 * Tests the actual CLI init command and verifies file creation and content
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Init Integration Tests', () => {
  const cliPath = path.resolve(__dirname, '../../dist/cli.js');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prp-test-'));

  beforeAll(() => {
    // Ensure CLI is built
    if (!fs.existsSync(cliPath)) {
      execSync('npm run build', { cwd: path.resolve(__dirname, '../..') });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Basic Init with Defaults', () => {
    const projectDir = path.join(tempDir, 'basic-test');

    it('should initialize project with TypeScript template', () => {
      execSync(`node ${cliPath} init basic-test --prompt "Test TypeScript project"`, {
        cwd: tempDir,
        stdio: 'inherit'
      });

      // Verify project directory was created
      expect(fs.existsSync(projectDir)).toBe(true);

      // Verify expected files are created
      const expectedFiles = [
        'package.json',
        'tsconfig.json',
        '.prprc',
        'AGENTS.md',
        'CLAUDE.md',
        '.mcp.json'
      ];

      expectedFiles.forEach(file => {
        const filePath = path.join(projectDir, file);
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
      });

      // Verify .prprc content
      const prprcContent = fs.readFileSync(path.join(projectDir, '.prprc'), 'utf-8');
      expect(prprcContent).toContain('"projectName": "basic-test"');
      expect(prprcContent).toContain('"template": "typescript"');
      expect(prprcContent).toContain('"prompt": "Test TypeScript project"');

      // Verify package.json has correct structure
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      expect(packageJson.name).toBe('basic-test');
      expect(packageJson.version).toBe('0.1.0');
      expect(packageJson.scripts?.build).toBeDefined();
      expect(packageJson.scripts?.test).toBeDefined();

      // Verify tsconfig.json
      const tsconfig = JSON.parse(fs.readFileSync(path.join(projectDir, 'tsconfig.json'), 'utf-8'));
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions?.module).toBe('ESNext');

      // Verify CLAUDE.md is symlink to AGENTS.md
      const claudePath = path.join(projectDir, 'CLAUDE.md');
      const agentsPath = path.join(projectDir, 'AGENTS.md');
      expect(fs.lstatSync(claudePath).isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(claudePath)).toBe('./AGENTS.md');
    });
  });

  describe('React Template', () => {
    const projectDir = path.join(tempDir, 'react-test');

    it('should initialize React project with correct files', () => {
      execSync(`node ${cliPath} init react-test --template react --prompt "Test React app"`, {
        cwd: tempDir,
        stdio: 'inherit'
      });

      // Verify React-specific files
      const reactFiles = [
        'src/App.tsx',
        'src/index.tsx',
        'src/index.html',
        'src/components/',
        'package.json',
        'vite.config.ts',
        '.prprc',
        'AGENTS.md'
      ];

      reactFiles.forEach(file => {
        const filePath = path.join(projectDir, file);
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
      });

      // Verify package.json has React dependencies
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.dependencies).toHaveProperty('react-dom');
      expect(packageJson.devDependencies).toHaveProperty('@types/react');
      expect(packageJson.devDependencies).toHaveProperty('@types/react-dom');

      // Verify Vite config
      const viteConfig = fs.readFileSync(path.join(projectDir, 'vite.config.ts'), 'utf-8');
      expect(viteConfig).toContain('@vitejs/plugin-react');

      // Verify App.tsx content
      const appContent = fs.readFileSync(path.join(projectDir, 'src/App.tsx'), 'utf-8');
      expect(appContent).toContain('export function App()');
      expect(appContent).toContain('<div');
    });
  });

  describe('FastAPI Template', () => {
    const projectDir = path.join(tempDir, 'fastapi-test');

    it('should initialize FastAPI project with correct files', () => {
      execSync(`node ${cliPath} init fastapi-test --template fastapi --prompt "Test FastAPI backend"`, {
        cwd: tempDir,
        stdio: 'inherit'
      });

      // Verify FastAPI-specific files
      const fastapiFiles = [
        'main.py',
        'requirements.txt',
        'app/',
        'app/api/',
        'app/core/',
        'app/models/',
        'tests/',
        '.prprc',
        'AGENTS.md'
      ];

      fastapiFiles.forEach(file => {
        const filePath = path.join(projectDir, file);
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
      });

      // Verify requirements.txt
      const requirements = fs.readFileSync(path.join(projectDir, 'requirements.txt'), 'utf-8');
      expect(requirements).toContain('fastapi');
      expect(requirements).toContain('uvicorn');

      // Verify main.py
      const mainPy = fs.readFileSync(path.join(projectDir, 'main.py'), 'utf-8');
      expect(mainPy).toContain('from fastapi import FastAPI');
      expect(mainPy).toContain('app = FastAPI()');
    });
  });

  describe('Wiki.js Template', () => {
    const projectDir = path.join(tempDir, 'wikijs-test');

    it('should initialize Wiki.js project with correct files', () => {
      execSync(`node ${cliPath} init wikijs-test --template wikijs --prompt "Test Wiki.js site"`, {
        cwd: tempDir,
        stdio: 'inherit'
      });

      // Verify Wiki.js-specific files
      const wikijsFiles = [
        'wiki/',
        'wiki/articles/',
        'wiki/templates/',
        'package.json',
        'vite.config.ts',
        '.prprc',
        'AGENTS.md'
      ];

      wikijsFiles.forEach(file => {
        const filePath = path.join(projectDir, file);
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
      });

      // Verify .prprc has wikijs template
      const prprcContent = fs.readFileSync(path.join(projectDir, '.prprc'), 'utf-8');
      expect(prprcContent).toContain('"template": "wikijs"');
    });
  });

  describe('NestJS Template', () => {
    const projectDir = path.join(tempDir, 'nestjs-test');

    it('should initialize NestJS project with correct files', () => {
      execSync(`node ${cliPath} init nestjs-test --template nestjs --prompt "Test NestJS API"`, {
        cwd: tempDir,
        stdio: 'inherit'
      });

      // Verify NestJS-specific files
      const nestjsFiles = [
        'src/main.ts',
        'src/app.module.ts',
        'src/common/',
        'src/modules/',
        'package.json',
        'nest-cli.json',
        '.prprc',
        'AGENTS.md'
      ];

      nestjsFiles.forEach(file => {
        const filePath = path.join(projectDir, file);
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
      });

      // Verify package.json has NestJS dependencies
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      expect(packageJson.dependencies).toHaveProperty('@nestjs/core');
      expect(packageJson.dependencies).toHaveProperty('@nestjs/common');
      expect(packageJson.devDependencies).toHaveProperty('@nestjs/cli');

      // Verify nest-cli.json
      const nestCli = JSON.parse(fs.readFileSync(path.join(projectDir, 'nest-cli.json'), 'utf-8'));
      expect(nestCli.collection).toContain('@nestjs/schematics');
    });
  });

  describe('None Template (Minimal)', () => {
    const projectDir = path.join(tempDir, 'minimal-test');

    it('should initialize minimal project with only required files', () => {
      execSync(`node ${cliPath} init minimal-test --template none --prompt "Test minimal project"`, {
        cwd: tempDir,
        stdio: 'inherit'
      });

      // Verify only core files exist
      const coreFiles = [
        '.prprc',
        'AGENTS.md',
        'CLAUDE.md',
        '.mcp.json'
      ];

      coreFiles.forEach(file => {
        const filePath = path.join(projectDir, file);
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
      });

      // Verify no package.json or other template files
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should fail on existing directory without --force', () => {
      const projectDir = path.join(tempDir, 'existing-dir');
      fs.mkdirSync(projectDir);
      fs.writeFileSync(path.join(projectDir, 'some-file.txt'), 'content');

      expect(() => {
        execSync(`node ${cliPath} init existing-dir`, {
          cwd: tempDir,
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should succeed with --force on existing directory', () => {
      const projectDir = path.join(tempDir, 'force-dir');
      fs.mkdirSync(projectDir);
      fs.writeFileSync(path.join(projectDir, 'old-file.txt'), 'content');

      execSync(`node ${cliPath} init force-dir --force --prompt "Force init test"`, {
        cwd: tempDir,
        stdio: 'pipe'
      });

      // Should have created PRP files
      expect(fs.existsSync(path.join(projectDir, '.prprc'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'AGENTS.md'))).toBe(true);
    });

    it('should handle invalid template gracefully', () => {
      expect(() => {
        execSync(`node ${cliPath} init invalid-test --template invalid-template`, {
          cwd: tempDir,
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });

  describe('File Content Verification', () => {
    const projectDir = path.join(tempDir, 'content-test');

    it('should create .prprc with correct structure', () => {
      execSync(`node ${cliPath} init content-test --prompt "Verify content structure" --template typescript`, {
        cwd: tempDir,
        stdio: 'pipe'
      });

      const prprcPath = path.join(projectDir, '.prprc');
      const prprcContent = fs.readFileSync(prprcPath, 'utf-8');

      // Parse and verify structure
      const prprc = JSON.parse(prprcContent);
      expect(prprc).toHaveProperty('projectName', 'content-test');
      expect(prprc).toHaveProperty('prompt', 'Verify content structure');
      expect(prprc).toHaveProperty('template', 'typescript');
      expect(prprc).toHaveProperty('agents');
      expect(prprc).toHaveProperty('integrations');
      expect(prprc).toHaveProperty('created');
      expect(prprc).toHaveProperty('version');
    });

    it('should create AGENTS.md with proper content', () => {
      const agentsPath = path.join(projectDir, 'AGENTS.md');
      const agentsContent = fs.readFileSync(agentsPath, 'utf-8');

      expect(agentsContent).toContain('# AGENTS.md');
      expect(agentsContent).toContain('AI Agent Guidelines for PRP');
      expect(agentsContent).toContain('## 🚀 SACRED RULES');
      expect(agentsContent).toContain('[bb] Blocker');
      expect(agentsContent).toContain('[gg] Goal Clarification');
    });

    it('should create .mcp.json with correct configuration', () => {
      const mcpPath = path.join(projectDir, '.mcp.json');
      const mcpContent = fs.readFileSync(mcpPath, 'utf-8');

      const mcpConfig = JSON.parse(mcpContent);
      expect(mcpConfig).toHaveProperty('mcpServers');
      expect(Array.isArray(mcpConfig.mcpServers)).toBe(true);
    });
  });
});

// Helper function to recursively check if directory exists with some files
function directoryHasContent(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) return false;

  const items = fs.readdirSync(dirPath);
  return items.length > 0;
}

// Export for Jest
export default {};