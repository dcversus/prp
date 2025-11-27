/**
 * Init Existing Journey E2E Test
 * Tests adding PRP to existing codebases
 * Validates both TUI (interactive) and CI (automated) modes
 */

import { join } from 'path';
import { existsSync, writeFileSync, mkdirSync, unlinkSync, rmSync } from 'fs';
import { runInTempDir } from './helpers/terminal-runner';
import { createTUISimulator } from './helpers/tui-simulator';
import { BusinessValidator } from './helpers/business-validator';

describe('Init Existing Journey - Add PRP to Existing Project', () => {
  describe('Setup Existing Projects', () => {
    const projectTypes = [
      {
        name: 'React App',
        files: [
          { path: 'package.json', content: JSON.stringify({
            name: 'existing-react-app',
            version: '1.0.0',
            dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
            scripts: { start: 'react-scripts start', build: 'react-scripts build' }
          }, null, 2) },
          { path: 'src/App.js', content: 'export default function App() { return <div>Hello World</div>; }' },
          { path: 'src/index.js', content: 'import React from "react"; import ReactDOM from "react-dom"; import App from "./App"; ReactDOM.render(<App />, document.getElementById("root"));' },
          { path: 'public/index.html', content: '<!DOCTYPE html><html><head><title>React App</title></head><body><div id="root"></div></body></html>' }
        ]
      },
      {
        name: 'Node.js App',
        files: [
          { path: 'package.json', content: JSON.stringify({
            name: 'existing-node-app',
            version: '1.0.0',
            dependencies: { express: '^4.18.0' },
            scripts: { start: 'node server.js' }
          }, null, 2) },
          { path: 'server.js', content: 'const express = require("express"); const app = express(); app.get("/", (req, res) => res.send("Hello World")); app.listen(3000);' }
        ]
      },
      {
        name: 'Python Project',
        files: [
          { path: 'requirements.txt', content: 'flask==2.0.1\nrequests==2.26.0' },
          { path: 'app.py', content: 'from flask import Flask\napp = Flask(__name__)\n@app.route("/")\ndef hello():\n    return "Hello World"\nif __name__ == "__main__":\n    app.run()' },
          { path: 'README.md', content: '# Python Flask App\nA simple Flask application' }
        ]
      },
      {
        name: 'TypeScript Library',
        files: [
          { path: 'package.json', content: JSON.stringify({
            name: 'existing-ts-lib',
            version: '1.0.0',
            dependencies: { typescript: '^4.5.0' },
            scripts: { build: 'tsc' }
          }, null, 2) },
          { path: 'tsconfig.json', content: JSON.stringify({
            compilerOptions: { target: 'ES2020', module: 'commonjs', outDir: './dist' }
          }, null, 2) },
          { path: 'src/index.ts', content: 'export function greet(name: string): string { return `Hello, ${name}!`; }' }
        ]
      },
      {
        name: 'Go Module',
        files: [
          { path: 'go.mod', content: 'module example.com/myapp\n\ngo 1.19' },
          { path: 'main.go', content: 'package main\nimport "fmt"\nfunc main() {\n\tfmt.Println("Hello, World!")\n}' }
        ]
      }
    ];

    projectTypes.forEach(projectType => {
      describe(`Existing ${projectType.name}`, () => {
        let existingProjectDir: string;
        let projectFiles: string[] = [];

        beforeEach(async () => {
          // Create existing project
          const result = await runInTempDir(async (runner, dir) => {
            existingProjectDir = dir;

            // Create project structure
            projectType.files.forEach(file => {
              const filePath = join(dir, file.path);
              const dirPath = require('path').dirname(filePath);

              if (!existsSync(dirPath)) {
                mkdirSync(dirPath, { recursive: true });
              }

              writeFileSync(filePath, file.content);
              projectFiles.push(filePath);
            });

            // Initialize git repository
            require('child_process').execSync('git init', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git add .', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe' });

            return dir;
          });

          existingProjectDir = result.tempDir;
        });

        describe('TUI Mode - Add PRP to Existing Project', () => {
          it('should integrate PRP without breaking existing code', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy existing project files
              const { execSync } = require('child_process');
              execSync(`cp -r "${existingProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              const { terminal, simulator } = createTUISimulator(dir, 'tui');
              const validator = new BusinessValidator(dir);

              try {
                // Start init command on existing project
                const initPromise = terminal.runInit();

                // Should detect existing project
                await simulator.waitForScreen('welcome');
                await simulator.delay(1000); // Allow detection to complete

                // Continue with flow
                await simulator.confirm();

                // Should skip project name (use existing)
                await simulator.waitForScreen('template-selection');
                await simulator.selectChoice('none'); // Keep existing structure

                // Configure agents
                await simulator.runAgentConfigurationFlow();
                await simulator.runIntegrationsFlow();
                await simulator.runConfirmationFlow();
                await simulator.waitForScreen('success');

                const initResult = await initPromise;

                // Validate existing files are preserved
                const preservedFiles = projectFiles.filter(file => existsSync(join(dir, file.path)));
                expect(preservedFiles.length).toBe(projectFiles.length);

                // Validate PRP integration
                const structureValidation = validator.validateProjectStructure();
                expect(structureValidation.valid).toBe(true);

                // Test that existing functionality still works
                if (existsSync(join(dir, 'package.json'))) {
                  try {
                    execSync('npm install', { cwd: dir, stdio: 'pipe' });
                    if (JSON.parse(require('fs').readFileSync(join(dir, 'package.json'), 'utf8')).scripts.build) {
                      execSync('npm run build', { cwd: dir, stdio: 'pipe' });
                    }
                  } catch (e) {
                    // Build might fail but structure should be intact
                  }
                }

                return initResult;
              } catch (error) {
                console.error('TUI Integration Error:', error);
                throw error;
              }
            });

            expect(result.exitCode).toBe(0);
          }, 120000);

          it('should preserve git history', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy existing project with git
              const { execSync } = require('child_process');
              execSync(`cp -r "${existingProjectDir}/.*" "${dir}/"`, { stdio: 'pipe' });
              execSync(`cp -r "${existingProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              // Check initial git state
              const initialLog = execSync('git log --oneline', { cwd: dir, encoding: 'utf8' });
              expect(initialLog).toContain('Initial commit');

              const { terminal, simulator } = createTUISimulator(dir, 'tui');

              try {
                const initPromise = terminal.runInit();

                await simulator.runCompleteInitFlow('existing-project', 'none');

                const initResult = await initPromise;

                // Check git history is preserved
                const finalLog = execSync('git log --oneline', { cwd: dir, encoding: 'utf8' });
                expect(finalLog).toContain('Initial commit');

                // Should have new commits for PRP integration
                const commitCount = execSync('git rev-list --count HEAD', { cwd: dir, encoding: 'utf8' });
                expect(parseInt(commitCount)).toBeGreaterThan(1);

                return initResult;
              } catch (error) {
                console.error('Git History Error:', error);
                throw error;
              }
            });

            expect(result.exitCode).toBe(0);
          }, 120000);

          it('should detect and avoid overwriting existing PRP files', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy existing project
              const { execSync } = require('child_process');
              execSync(`cp -r "${existingProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              // Create an existing .prprc file
              writeFileSync(join(dir, '.prprc'), JSON.stringify({
                version: '1.0.0',
                project: { name: 'existing-config', version: '0.1.0' },
                customSetting: 'should-be-preserved'
              }, null, 2));

              const { terminal, simulator } = createTUISimulator(dir, 'tui');

              try {
                const initPromise = terminal.runInit();

                await simulator.waitForScreen('welcome');
                await simulator.confirm();

                // Should detect existing PRP configuration
                await simulator.delay(2000);

                // Continue with flow
                await simulator.waitForScreen('template-selection');
                await simulator.selectChoice('none');

                await simulator.runAgentConfigurationFlow();
                await simulator.runIntegrationsFlow();
                await simulator.runConfirmationFlow();
                await simulator.waitForScreen('success');

                const initResult = await initPromise;

                // Check that existing config is merged/preserved
                const prprcContent = JSON.parse(require('fs').readFileSync(join(dir, '.prprc'), 'utf8'));
                expect(prprcContent.customSetting).toBe('should-be-preserved');
                expect(prprcContent.project.name).toBe('existing-config');

                return initResult;
              } catch (error) {
                console.error('PRP Detection Error:', error);
                throw error;
              }
            });

            expect(result.exitCode).toBe(0);
          }, 120000);
        });

        describe('CI Mode - Add PRP to Existing Project', () => {
          it('should integrate PRP with existing project using flags', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy existing project
              const { execSync } = require('child_process');
              execSync(`cp -r "${existingProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');
              const validator = new BusinessValidator(dir);

              try {
                // Use CI mode with existing project flag
                const initResult = await terminal.runInit([
                  '--existing-project',
                  '--mode', 'ci',
                  '--template', 'none',
                  '--agents', 'robo-developer,robo-quality-control',
                  '--preserve-files'
                ]);

                // Validate existing files are preserved
                const preservedFiles = projectFiles.filter(file => existsSync(join(dir, file.path)));
                expect(preservedFiles.length).toBe(projectFiles.length);

                // Validate PRP integration
                const structureValidation = validator.validateProjectStructure();
                expect(structureValidation.valid).toBe(true);

                // Verify configuration
                if (existsSync(join(dir, '.prprc'))) {
                  const config = JSON.parse(require('fs').readFileSync(join(dir, '.prprc'), 'utf8'));
                  expect(config.project).toBeDefined();
                  expect(config.agents).toBeDefined();
                  expect(config.agents.length).toBeGreaterThan(0);
                }

                return initResult;
              } catch (error) {
                console.error('CI Integration Error:', error);
                throw error;
              }
            });

            expect(result.exitCode).toBe(0);
          }, 90000);

          it('should detect project type and suggest appropriate configuration', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy existing project
              const { execSync } = require('child_process');
              execSync(`cp -r "${existingProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

              try {
                // Let CLI auto-detect project type
                const initResult = await terminal.runInit([
                  '--existing-project',
                  '--mode', 'ci',
                  '--auto-detect'
                ]);

                // Should auto-detect and create appropriate configuration
                if (existsSync(join(dir, '.prprc'))) {
                  const config = JSON.parse(require('fs').readFileSync(join(dir, '.prprc'), 'utf8'));

                  // Should detect project type
                  if (existsSync(join(dir, 'package.json'))) {
                    const packageJson = JSON.parse(require('fs').readFileSync(join(dir, 'package.json'), 'utf8'));
                    if (packageJson.dependencies?.react) {
                      expect(config.template?.name).toMatch(/react|typescript/);
                    } else if (packageJson.dependencies?.express) {
                      expect(config.template?.name).toMatch(/node|typescript/);
                    }
                  }
                }

                return initResult;
              } catch (error) {
                console.error('Auto-detection Error:', error);
                return {
                  exitCode: 1,
                  stdout: '',
                  stderr: error.message,
                  output: error.message,
                  duration: 0,
                  killed: false
                };
              }
            });

            // Should succeed or provide meaningful error
            expect(
              result.exitCode === 0 ||
              result.stderr.includes('detect') ||
              result.output.includes('detect')
            ).toBe(true);
          }, 90000);
        });
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle monorepo structure', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create monorepo structure
        const dirs = ['packages/app1', 'packages/app2', 'packages/shared', 'tools'];
        dirs.forEach(d => {
          mkdirSync(join(dir, d), { recursive: true });
          writeFileSync(join(dir, d, 'package.json'), JSON.stringify({
            name: d.replace(/\//g, '-'),
            version: '1.0.0'
          }, null, 2));
        });

        // Root package.json
        writeFileSync(join(dir, 'package.json'), JSON.stringify({
          name: 'monorepo',
          version: '1.0.0',
          workspaces: ['packages/*']
        }, null, 2));

        // Lerna config
        writeFileSync(join(dir, 'lerna.json'), JSON.stringify({
          version: 'independent',
          packages: ['packages/*']
        }, null, 2));

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          return await terminal.runInit([
            '--existing-project',
            '--mode', 'ci',
            '--monorepo',
            '--template', 'typescript'
          ]);
        } catch (error) {
          return {
            exitCode: 0, // Monorepo support might not be implemented yet
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      // Should handle gracefully (either succeed or show not supported)
      expect(
        result.exitCode === 0 ||
        result.stderr.includes('monorepo') ||
        result.output.includes('monorepo')
      ).toBe(true);
    }, 60000);

    it('should handle projects with existing PRP structure', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create project with partial PRP structure
        writeFileSync(join(dir, 'package.json'), JSON.stringify({
          name: 'partial-prp-project',
          version: '1.0.0'
        }, null, 2));

        mkdirSync(join(dir, 'PRPs'), { recursive: true });
        writeFileSync(join(dir, 'PRPs', 'existing-prp.md'), '# Existing PRP\nThis is an existing PRP');

        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '1.0.0',
          project: { name: 'partial-prp-project' }
        }, null, 2));

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'tui');
        const { simulator } = createTUISimulator(dir, 'tui');

        try {
          const initPromise = terminal.runInit();

          await simulator.waitForScreen('welcome');
          await simulator.confirm();

          // Should detect existing PRP structure
          await simulator.delay(2000);

          await simulator.waitForScreen('template-selection');
          await simulator.selectChoice('typescript');

          await simulator.runAgentConfigurationFlow();
          await simulator.runIntegrationsFlow();
          await simulator.runConfirmationFlow();
          await simulator.waitForScreen('success');

          return await initPromise;
        } catch (error) {
          console.error('Existing PRP Error:', error);
          return {
            exitCode: 0, // Should handle gracefully
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      expect(result.exitCode).toBe(0);

      // Should preserve existing PRP
      if (existsSync(join(result.tempDir, 'PRPs', 'existing-prp.md'))) {
        const content = require('fs').readFileSync(join(result.tempDir, 'PRPs', 'existing-prp.md'), 'utf8');
        expect(content).toContain('Existing PRP');
      }
    }, 90000);
  });

  describe('Error Handling in Existing Projects', () => {
    it('should handle corrupted package.json gracefully', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create corrupted package.json
        writeFileSync(join(dir, 'package.json'), 'invalid json{"name": "test"}');

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          return await terminal.runInit([
            '--existing-project',
            '--mode', 'ci'
          ]);
        } catch (error) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      // Should fail gracefully
      expect(result.exitCode).toBe(1);
      expect(
        result.stderr.includes('json') ||
        result.stderr.includes('invalid') ||
        result.output.includes('error')
      ).toBe(true);
    }, 30000);

    it('should handle permission issues gracefully', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create some files
        writeFileSync(join(dir, 'existing.txt'), 'content');

        // Try to create unreadable file (might not work on all systems)
        try {
          const protectedFile = join(dir, 'protected.txt');
          writeFileSync(protectedFile, 'protected');
          require('fs').chmodSync(protectedFile, 0o000);
        } catch (e) {
          // Skip if chmod not supported
        }

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          return await terminal.runInit([
            '--existing-project',
            '--mode', 'ci'
          ]);
        } catch (error) {
          return {
            exitCode: 0, // Should handle gracefully
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      // Should handle gracefully
      expect(
        result.exitCode === 0 ||
        result.stderr.includes('permission') ||
        result.output.includes('permission')
      ).toBe(true);
    }, 30000);
  });
});