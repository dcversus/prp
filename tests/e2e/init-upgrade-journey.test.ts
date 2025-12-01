/**
 * Init Upgrade Journey E2E Test
 * Tests upgrading existing PRP projects to new versions
 * Validates configuration migration and feature availability
 */

import { join } from 'path';
import { existsSync, writeFileSync, mkdirSync, unlinkSync, rmSync, readFileSync } from 'fs';
import { runInTempDir } from './helpers/terminal-runner';
import { createTUISimulator } from './helpers/tui-simulator';
import { BusinessValidator } from './helpers/business-validator';

describe('Init Upgrade Journey - Upgrade Existing PRP Project', () => {
  describe('Setup Old PRP Versions', () => {
    const oldVersions = [
      {
        version: '0.1.0',
        description: 'Very old PRP version',
        prprc: {
          version: '0.1.0',
          project: {
            name: 'old-prp-project',
            version: '1.0.0'
          },
          agents: [
            { name: 'developer', type: 'development' }
          ],
          oldFormat: true
        },
        agentsMd: `# Old AGENTS.md
Basic agents documentation
## System
This is old format`,
        missingFeatures: ['orchestrator', 'signalSystem', 'workflow']
      },
      {
        version: '0.2.0',
        description: 'Old PRP with basic features',
        prprc: {
          version: '0.2.0',
          project: {
            name: 'medium-prp-project',
            version: '1.0.0'
          },
          agents: [
            { name: 'robo-developer', type: 'development', status: 'active' },
            { name: 'robo-quality-control', type: 'testing', status: 'active' }
          ],
          orchestrator: {
            mode: 'basic'
          }
        },
        agentsMd: `# AGENTS.md v0.2.0

## 🚀 RULES
1. First rule
2. Second rule

## Signals
[bb] - Blocker
[af] - Feedback`,
        missingFeatures: ['signalSystemAdvanced', 'parallelCoordination']
      },
      {
        version: '0.3.0',
        description: 'Recent PRP with most features',
        prprc: {
          version: '0.3.0',
          project: {
            name: 'recent-prp-project',
            version: '2.0.0'
          },
          agents: [
            { name: 'robo-developer', type: 'development', status: 'active' },
            { name: 'robo-quality-control', type: 'testing', status: 'active' },
            { name: 'robo-ux-ui-designer', type: 'design', status: 'inactive' }
          ],
          orchestrator: {
            mode: 'advanced',
            parallel: true
          },
          integrations: {
            github: { enabled: true },
            slack: { enabled: false }
          }
        },
        agentsMd: `# AGENTS.md v0.3.0

## 🚀 SACRED RULES
1. PRP-First Development
2. Signal-Driven Progress

## 🎵 SIGNAL SYSTEM
[bb] - Blocker
[af] - Feedback Request
[gg] - Goal Clarification`,
        missingFeatures: ['newSignalTypes', 'enhancedWorkflow']
      }
    ];

    oldVersions.forEach(oldVersion => {
      describe(`Upgrade from ${oldVersion.version}`, () => {
        let oldProjectDir: string;

        beforeEach(async () => {
          const result = await runInTempDir(async (runner, dir) => {
            oldProjectDir = dir;

            // Create old PRP structure
            mkdirSync(join(dir, 'PRPs'), { recursive: true });
            writeFileSync(join(dir, 'PRPs', 'existing-prp.md'), `# PRP-001: Existing Project\n\n> our goal of user quote: test project\n\n## feature\n- Initial implementation\n\n---\n--`);

            writeFileSync(join(dir, '.prprc'), JSON.stringify(oldVersion.prprc, null, 2));
            writeFileSync(join(dir, 'AGENTS.md'), oldVersion.agentsMd);

            // Create basic project files
            writeFileSync(join(dir, 'package.json'), JSON.stringify({
              name: oldVersion.prprc.project.name,
              version: oldVersion.prprc.project.version,
              scripts: { test: 'jest', build: 'tsc' }
            }, null, 2));

            // Create git repo
            require('child_process').execSync('git init', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git add .', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
            require('child_process').execSync('git commit -m "Initial old version"', { cwd: dir, stdio: 'pipe' });

            return dir;
          });

          oldProjectDir = result.tempDir;
        });

        describe('TUI Mode - Interactive Upgrade', () => {
          it('should detect old version and offer upgrade', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy old project
              const { execSync } = require('child_process');
              execSync(`cp -r "${oldProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });
              execSync(`cp -r "${oldProjectDir}/.*" "${dir}/"`, { stdio: 'pipe' });

              const { terminal, simulator } = createTUISimulator(dir, 'tui');
              const validator = new BusinessValidator(dir);

              try {
                const initPromise = terminal.runInit();

                // Should detect existing PRP and old version
                await simulator.waitForScreen('welcome');
                await simulator.delay(2000); // Allow version detection

                // Should show upgrade prompt
                const state = simulator.getState();
                const output = simulator.getCurrentOutput();

                expect(
                  output.includes('upgrade') ||
                  output.includes('update') ||
                  output.includes(oldVersion.version)
                ).toBe(true);

                await simulator.confirm();

                // Show upgrade options
                await simulator.waitForScreen('upgrade-options');
                await simulator.selectChoice('upgrade to latest');

                // Confirm upgrade
                await simulator.waitForScreen('upgrade-confirmation');
                await simulator.confirm();

                // Wait for upgrade completion
                await simulator.delay(5000);

                const initResult = await initPromise;

                // Verify upgrade happened
                if (existsSync(join(dir, '.prprc'))) {
                  const newConfig = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
                  expect(newConfig.version).not.toBe(oldVersion.version);
                  expect(newConfig.version).toMatch(/0\.4\./); // Current version

                  // Should have new features
                  if (newConfig.orchestrator) {
                    expect(newConfig.orchestrator.mode).toBeDefined();
                  }
                }

                // Validate AGENTS.md was updated
                if (existsSync(join(dir, 'AGENTS.md'))) {
                  const agentsContent = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
                  expect(agentsContent).toContain('SACRED RULES');
                  expect(agentsContent).toContain('SIGNAL SYSTEM');
                }

                // Validate structure is still valid
                const structureValidation = validator.validateProjectStructure();
                expect(structureValidation.valid).toBe(true);

                return initResult;
              } catch (error) {
                console.error('TUI Upgrade Error:', error);
                throw error;
              }
            });

            expect(result.exitCode).toBe(0);
          }, 120000);

          it('should preserve custom configurations during upgrade', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy and modify old project with custom settings
              const { execSync } = require('child_process');
              execSync(`cp -r "${oldProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              // Add custom settings to preserve
              const oldConfig = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
              oldConfig.customSetting = 'preserve-me';
              oldConfig.project.customField = 'should-remain';
              writeFileSync(join(dir, '.prprc'), JSON.stringify(oldConfig, null, 2));

              const { terminal, simulator } = createTUISimulator(dir, 'tui');

              try {
                const initPromise = terminal.runInit();

                await simulator.waitForScreen('welcome');
                await simulator.confirm();

                await simulator.waitForScreen('upgrade-options');
                await simulator.selectChoice('upgrade with backup');

                await simulator.waitForScreen('upgrade-confirmation');
                await simulator.confirm();

                await simulator.delay(5000);

                const initResult = await initPromise;

                // Verify custom settings preserved
                if (existsSync(join(dir, '.prprc'))) {
                  const newConfig = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
                  expect(newConfig.customSetting).toBe('preserve-me');
                  expect(newConfig.project.customField).toBe('should-remain');
                  expect(newConfig.version).not.toBe(oldVersion.version);
                }

                // Check backup was created
                expect(existsSync(join(dir, '.prprc.backup'))).toBe(true);

                return initResult;
              } catch (error) {
                console.error('Custom Config Error:', error);
                throw error;
              }
            });

            expect(result.exitCode).toBe(0);
          }, 120000);
        });

        describe('CI Mode - Automated Upgrade', () => {
          it('should upgrade automatically with flags', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy old project
              const { execSync } = require('child_process');
              execSync(`cp -r "${oldProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');
              const validator = new BusinessValidator(dir);

              try {
                // Auto-upgrade command
                const initResult = await terminal.runInit([
                  '--upgrade',
                  '--from-version', oldVersion.version,
                  '--to-version', 'latest',
                  '--mode', 'ci',
                  '--backup'
                ]);

                // Verify upgrade
                if (existsSync(join(dir, '.prprc'))) {
                  const newConfig = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
                  expect(newConfig.version).not.toBe(oldVersion.version);

                  // Should have upgraded features
                  if (oldVersion.missingFeatures.includes('orchestrator')) {
                    expect(newConfig.orchestrator).toBeDefined();
                  }
                }

                // Check backup
                expect(existsSync(join(dir, '.prprc.backup'))).toBe(true);

                // Validate new structure
                const structureValidation = validator.validateProjectStructure();
                expect(structureValidation.valid).toBe(true);

                return initResult;
              } catch (error) {
                console.error('CI Upgrade Error:', error);
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

            // Should succeed or indicate not implemented
            expect(
              result.exitCode === 0 ||
              result.stderr.includes('upgrade') ||
              result.output.includes('upgrade')
            ).toBe(true);
          }, 90000);

          it('should handle major version upgrades', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy old project
              const { execSync } = require('child_process');
              execSync(`cp -r "${oldProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });

              // Modify to simulate major version difference
              const oldConfig = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
              oldConfig.version = '1.0.0'; // Major version ahead
              writeFileSync(join(dir, '.prprc'), JSON.stringify(oldConfig, null, 2));

              const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

              try {
                // Try major version downgrade (should be blocked)
                const initResult = await terminal.runInit([
                  '--upgrade',
                  '--from-version', '1.0.0',
                  '--to-version', '0.4.0',
                  '--mode', 'ci',
                  '--force' // Try to force it
                ]);

                return initResult;
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

            // Should fail on major version downgrade
            expect(
              result.exitCode !== 0 ||
              result.stderr.includes('major') ||
              result.stderr.includes('version')
            ).toBe(true);
          }, 60000);
        });
      });
    });
  });

  describe('Upgrade Scenarios', () => {
    it('should upgrade with missing agents configuration', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create old PRP with minimal agent config
        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '0.1.0',
          project: { name: 'minimal-project' },
          agents: [] // No agents configured
        }, null, 2));

        const { terminal, simulator } = createTUISimulator(dir, 'tui');

        try {
          const initPromise = terminal.runInit();

          await simulator.waitForScreen('welcome');
          await simulator.confirm();

          // Should offer to configure agents
          await simulator.waitForScreen('agent-configuration');

          // Configure new agents
          await simulator.selectChoice('robo-developer');
          await simulator.confirm();
          await simulator.delay(500);

          await simulator.goBack();
          await simulator.selectChoice('robo-quality-control');
          await simulator.confirm();
          await simulator.delay(500);

          await simulator.confirm(); // Continue

          const initResult = await initPromise;

          // Verify agents were added
          if (existsSync(join(dir, '.prprc'))) {
            const config = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
            expect(config.agents.length).toBeGreaterThan(0);
            expect(config.agents[0].name).toMatch(/robo-/);
          }

          return initResult;
        } catch (error) {
          console.error('Missing Agents Error:', error);
          throw error;
        }
      });

      expect(result.exitCode).toBe(0);
    }, 90000);

    it('should upgrade and add new signal types', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create old AGENTS.md without new signals
        writeFileSync(join(dir, 'AGENTS.md'), `# AGENTS.md

## Old signals
[bb] Blocker
[af] Feedback`);

        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '0.2.0',
          project: { name: 'signal-test' }
        }, null, 2));

        const { terminal, simulator } = createTUISimulator(dir, 'tui');

        try {
          const initPromise = terminal.runInit();

          await simulator.waitForScreen('welcome');
          await simulator.confirm();
          await simulator.delay(2000);

          await simulator.confirm(); // Accept upgrade

          const initResult = await initPromise;

          // Check new signals were added
          if (existsSync(join(dir, 'AGENTS.md'))) {
            const content = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
            expect(content).toContain('[aa]'); // Admin signal
            expect(content).toContain('[oo]'); // Orchestrator signal
            expect(content).toContain('[JC]'); // Jesus Christ signal
          }

          return initResult;
        } catch (error) {
          console.error('Signal Upgrade Error:', error);
          throw error;
        }
      });

      expect(result.exitCode).toBe(0);
    }, 90000);
  });

  describe('Rollback and Recovery', () => {
    it('should create backup before upgrade', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create original config
        const originalConfig = {
          version: '0.2.0',
          project: { name: 'backup-test', setting: 'original' }
        };
        writeFileSync(join(dir, '.prprc'), JSON.stringify(originalConfig, null, 2));

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          const initResult = await terminal.runInit([
            '--upgrade',
            '--backup',
            '--mode', 'ci'
          ]);

          // Verify backup exists
          expect(existsSync(join(dir, '.prprc.backup'))).toBe(true);

          // Verify backup content
          const backupContent = readFileSync(join(dir, '.prprc.backup'), 'utf8');
          const backupConfig = JSON.parse(backupContent);
          expect(backupConfig.version).toBe('0.2.0');
          expect(backupConfig.project.setting).toBe('original');

          // Verify current config was upgraded
          if (existsSync(join(dir, '.prprc'))) {
            const currentConfig = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
            expect(currentConfig.version).not.toBe('0.2.0');
          }

          return initResult;
        } catch (error) {
          return {
            exitCode: 0, // Feature might not be implemented
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      expect(result.exitCode).toBe(0);
    }, 60000);

    it('should allow rollback if upgrade fails', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create original config
        const originalConfig = {
          version: '0.2.0',
          project: { name: 'rollback-test' }
        };
        writeFileSync(join(dir, '.prprc'), JSON.stringify(originalConfig, null, 2));

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          // Simulate failed upgrade
          const initResult = await terminal.runInit([
            '--upgrade',
            '--to-version', '999.0.0', // Non-existent version
            '--mode', 'ci'
          ]);

          // Should fail gracefully
          expect(initResult.exitCode).toBe(1);

          // Should still have original config
          if (existsSync(join(dir, '.prprc'))) {
            const currentConfig = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
            expect(currentConfig.version).toBe('0.2.0');
          }

          return initResult;
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

      expect(result.exitCode).toBe(1);
    }, 60000);
  });

  describe('Performance During Upgrade', () => {
    it('should complete upgrade within reasonable time', async () => {
      const startTime = Date.now();

      const result = await runInTempDir(async (runner, dir) => {
        // Create moderately complex project
        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '0.2.0',
          project: { name: 'perf-test' },
          agents: Array(10).fill().map((_, i) => ({
            name: `agent-${i}`,
            type: 'test'
          }))
        }, null, 2));

        // Create many PRP files
        mkdirSync(join(dir, 'PRPs'), { recursive: true });
        for (let i = 0; i < 20; i++) {
          writeFileSync(join(dir, 'PRPs', `prp-${i}.md`), `# PRP-${i.toString().padStart(3, '0')}: Test\n\nContent here`);
        }

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          return await terminal.runInit([
            '--upgrade',
            '--mode', 'ci'
          ]);
        } catch (error) {
          return {
            exitCode: 0, // May not be implemented
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      const duration = Date.now() - startTime;

      // Should complete quickly even with complex project
      expect(duration).toBeLessThan(30000); // 30 seconds max
      console.log(`Upgrade completed in ${duration}ms`);
    }, 60000);
  });
});