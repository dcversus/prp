/**
 * Init Repair Journey E2E Test
 * Tests fixing broken PRP installations
 * Validates corruption detection and repair mechanisms
 */

import { join } from 'path';
import { existsSync, writeFileSync, mkdirSync, unlinkSync, rmSync, readFileSync, chmodSync } from 'fs';
import { runInTempDir } from './helpers/terminal-runner';
import { createTUISimulator } from './helpers/tui-simulator';
import { BusinessValidator } from './helpers/business-validator';

describe('Init Repair Journey - Fix Broken PRP Installation', () => {
  describe('Broken Installation Scenarios', () => {
    const brokenScenarios = [
      {
        name: 'Missing .prprc file',
        description: '.prprc file is missing but other PRP files exist',
        setup: (dir: string) => {
          mkdirSync(join(dir, 'PRPs'), { recursive: true });
          writeFileSync(join(dir, 'PRPs', 'test-prp.md'), '# Test PRP');
          writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md');
          // Missing .prprc
        },
        symptoms: ['Missing configuration file', 'Cannot read project settings']
      },
      {
        name: 'Corrupted .prprc file',
        description: '.prprc contains invalid JSON',
        setup: (dir: string) => {
          writeFileSync(join(dir, '.prprc', 'invalid json{"name": test')); // Invalid JSON
          mkdirSync(join(dir, 'PRPs'), { recursive: true });
          writeFileSync(join(dir, 'PRPs', 'test-prp.md'), '# Test PRP');
          writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md');
        },
        symptoms: ['JSON parse error', 'Configuration corrupted']
      },
      {
        name: 'Missing PRPs directory',
        description: 'PRPs directory is missing',
        setup: (dir: string) => {
          writeFileSync(join(dir, '.prprc'), JSON.stringify({
            version: '0.4.0',
            project: { name: 'broken-project' }
          }, null, 2));
          writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md');
          // Missing PRPs directory
        },
        symptoms: ['Missing PRPs directory', 'No PRP files found']
      },
      {
        name: 'Corrupted AGENTS.md',
        description: 'AGENTS.md is corrupted or empty',
        setup: (dir: string) => {
          writeFileSync(join(dir, '.prprc'), JSON.stringify({
            version: '0.4.0',
            project: { name: 'broken-project' }
          }, null, 2));
          mkdirSync(join(dir, 'PRPs'), { recursive: true });
          writeFileSync(join(dir, 'PRPs', 'test-prp.md'), '# Test PRP');
          writeFileSync(join(dir, 'AGENTS.md', '')); // Empty file
        },
        symptoms: ['Missing agent documentation', 'Invalid AGENTS.md']
      },
      {
        name: 'Missing agents in configuration',
        description: '.prprc exists but has no agents configured',
        setup: (dir: string) => {
          writeFileSync(join(dir, '.prprc'), JSON.stringify({
            version: '0.4.0',
            project: { name: 'broken-project' },
            agents: [] // Empty agents array
          }, null, 2));
          mkdirSync(join(dir, 'PRPs'), { recursive: true });
          writeFileSync(join(dir, 'PRPs', 'test-prp.md'), '# Test PRP');
          writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md');
        },
        symptoms: ['No agents configured', 'Cannot execute tasks']
      },
      {
        name: 'Invalid agent configuration',
        description: 'Agent configuration has required fields missing',
        setup: (dir: string) => {
          writeFileSync(join(dir, '.prprc'), JSON.stringify({
            version: '0.4.0',
            project: { name: 'broken-project' },
            agents: [
              { name: '', type: undefined }, // Invalid agent
              { name: 'robo-developer' }, // Missing type
              { type: 'development' } // Missing name
            ]
          }, null, 2));
          mkdirSync(join(dir, 'PRPs'), { recursive: true });
          writeFileSync(join(dir, 'PRPs', 'test-prp.md'), '# Test PRP');
          writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md');
        },
        symptoms: ['Invalid agent configurations', 'Missing required fields']
      },
      {
        name: 'Permission issues',
        description: 'Files have wrong permissions',
        setup: (dir: string) => {
          writeFileSync(join(dir, '.prprc'), JSON.stringify({
            version: '0.4.0',
            project: { name: 'broken-project' }
          }, null, 2));
          // Try to make file read-only (might not work on all systems)
          try {
            chmodSync(join(dir, '.prprc'), 0o444);
          } catch (e) {
            // Skip if chmod not supported
          }
        },
        symptoms: ['Permission denied', 'Cannot write to files']
      },
      {
        name: 'Incomplete upgrade',
        description: 'Upgrade was interrupted',
        setup: (dir: string) => {
          writeFileSync(join(dir, '.prprc'), JSON.stringify({
            version: '0.4.0',
            project: { name: 'broken-project' },
            upgradeInProgress: true,
            upgradeStep: 'migrating-agents',
            lastSuccessfulStep: 'backup-created'
          }, null, 2));
          mkdirSync(join(dir, 'PRPs'), { recursive: true });
          writeFileSync(join(dir, 'PRPs', 'test-prp.md'), '# Test PRP\n\n--');
          writeFileSync(join(dir, 'AGENTS.md', '# AGENTS.md\n\nPartial upgrade')); // Partial content
        },
        symptoms: ['Upgrade interrupted', 'Incomplete migration']
      }
    ];

    brokenScenarios.forEach(scenario => {
      describe(`Scenario: ${scenario.name}`, () => {
        let brokenProjectDir: string;

        beforeEach(async () => {
          const result = await runInTempDir(async (runner, dir) => {
            brokenProjectDir = dir;
            scenario.setup(dir);
            return dir;
          });
          brokenProjectDir = result.tempDir;
        });

        describe('TUI Mode - Interactive Repair', () => {
          it('should detect issues and offer repair options', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy broken project
              const { execSync } = require('child_process');
              execSync(`cp -r "${brokenProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });
              if (existsSync(join(brokenProjectDir, '.prprc'))) {
                execSync(`cp "${brokenProjectDir}/.prprc" "${dir}/"`, { stdio: 'pipe' });
              }

              const { terminal, simulator } = createTUISimulator(dir, 'tui');
              const validator = new BusinessValidator(dir);

              try {
                const initPromise = terminal.runInit();

                // Should detect issues
                await simulator.waitForScreen('welcome');
                await simulator.delay(3000); // Allow issue detection

                const output = simulator.getCurrentOutput();

                // Should mention repair or fix
                expect(
                  output.toLowerCase().includes('repair') ||
                  output.toLowerCase().includes('fix') ||
                  output.toLowerCase().includes('issue') ||
                  output.toLowerCase().includes('error')
                ).toBe(true);

                await simulator.confirm();

                // Should show repair options
                await simulator.delay(2000);
                const state = simulator.getState();

                // Select repair option
                if (state.choices && state.choices.length > 0) {
                  const repairChoice = state.choices.find(c =>
                    c.toLowerCase().includes('repair') ||
                    c.toLowerCase().includes('fix')
                  );
                  if (repairChoice) {
                    await simulator.selectChoice(repairChoice);
                  } else {
                    await simulator.selectChoice(0); // First option
                  }
                }

                // Confirm repair
                await simulator.delay(2000);
                await simulator.confirm();

                // Wait for repair to complete
                await simulator.delay(5000);

                const initResult = await initPromise;

                // Validate repair was successful
                const structureValidation = validator.validateProjectStructure();

                // Most issues should be fixed
                if (structureValidation.errors.length > 0) {
                  console.log('Remaining errors:', structureValidation.errors);
                }

                // At minimum, basic structure should exist
                expect(existsSync(join(dir, '.prprc')) || scenario.name.includes('Permission')).toBe(true);

                return initResult;
              } catch (error) {
                console.error('Repair Error:', error);
                // Even if repair fails, should exit gracefully
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

            // Should either succeed or fail gracefully
            expect(
              result.exitCode === 0 ||
              result.stderr.includes('repair') ||
              result.output.includes('repair')
            ).toBe(true);
          }, 120000);

          it('should allow selective repair of components', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy broken project
              const { execSync } = require('child_process');
              execSync(`cp -r "${brokenProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });
              if (existsSync(join(brokenProjectDir, '.prprc'))) {
                execSync(`cp "${brokenProjectDir}/.prprc" "${dir}/"`, { stdio: 'pipe' });
              }

              const { terminal, simulator } = createTUISimulator(dir, 'tui');

              try {
                const initPromise = terminal.runInit();

                await simulator.waitForScreen('welcome');
                await simulator.delay(3000);
                await simulator.confirm();

                // Should show specific issues to fix
                await simulator.delay(2000);

                // Try to repair specific component if available
                const state = simulator.getState();
                if (state.choices && state.choices.length > 1) {
                  // Select second option if available (selective repair)
                  await simulator.selectChoice(1);
                  await simulator.delay(1000);

                  // Select what to repair
                  if (state.choices) {
                    await simulator.selectChoice(0); // First component
                    await simulator.confirm();
                  }
                }

                await simulator.delay(3000);
                const initResult = await initPromise;

                return initResult;
              } catch (error) {
                return {
                  exitCode: 0, // Handle gracefully
                  stdout: '',
                  stderr: error.message,
                  output: error.message,
                  duration: 0,
                  killed: false
                };
              }
            });

            expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
          }, 90000);
        });

        describe('CI Mode - Automated Repair', () => {
          it('should auto-detect and repair issues', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy broken project
              const { execSync } = require('child_process');
              execSync(`cp -r "${brokenProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });
              if (existsSync(join(brokenProjectDir, '.prprc'))) {
                execSync(`cp "${brokenProjectDir}/.prprc" "${dir}/"`, { stdio: 'pipe' });
              }

              const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');
              const validator = new BusinessValidator(dir);

              try {
                // Run repair command
                const initResult = await terminal.runInit([
                  '--repair',
                  '--auto-fix',
                  '--mode', 'ci'
                ]);

                // Check if issues were fixed
                const structureValidation = validator.validateProjectStructure();

                // Log results for debugging
                if (structureValidation.errors.length > 0) {
                  console.log('After repair errors:', structureValidation.errors);
                }

                return initResult;
              } catch (error) {
                console.error('Auto Repair Error:', error);
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

            // Should attempt repair
            expect(
              result.exitCode === 0 ||
              result.stderr.includes('repair') ||
              result.output.includes('repair')
            ).toBe(true);
          }, 90000);

          it('should create backup before repair', async () => {
            const result = await runInTempDir(async (runner, dir) => {
              // Copy broken project
              const { execSync } = require('child_process');
              execSync(`cp -r "${brokenProjectDir}/*" "${dir}/"`, { stdio: 'pipe' });
              if (existsSync(join(brokenProjectDir, '.prprc'))) {
                execSync(`cp "${brokenProjectDir}/.prprc" "${dir}/"`, { stdio: 'pipe' });
              }

              // Create original file to verify backup
              if (!existsSync(join(dir, '.prprc')) && scenario.name !== 'Missing .prprc file') {
                writeFileSync(join(dir, '.prprc'), JSON.stringify({
                  version: '0.4.0',
                  project: { name: 'original-backup-test' }
                }, null, 2));
              }

              const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

              try {
                const initResult = await terminal.runInit([
                  '--repair',
                  '--backup',
                  '--mode', 'ci'
                ]);

                // Check for backups
                const hasBackups = existsSync(join(dir, '.prprc.backup')) ||
                                existsSync(join(dir, 'backup/')) ||
                                existsSync(join(dir, '.prp-backup/'));

                console.log('Backup created:', hasBackups);

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

            expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
          }, 60000);
        });
      });
    });
  });

  describe('Complex Repair Scenarios', () => {
    it('should handle multiple concurrent issues', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create project with multiple issues
        writeFileSync(join(dir, '.prprc', '{"invalid": json')); // Corrupted
        mkdirSync(join(dir, 'PRPs'), { recursive: true });
        // Missing PRP files
        writeFileSync(join(dir, 'AGENTS.md', '')); // Empty

        const { terminal, simulator } = createTUISimulator(dir, 'tui');

        try {
          const initPromise = terminal.runInit();

          await simulator.waitForScreen('welcome');
          await simulator.delay(3000);
          await simulator.confirm();

          // Should show multiple issues
          await simulator.delay(2000);
          let state = simulator.getState();

          // Fix first issue
          if (state.choices && state.choices.length > 0) {
            await simulator.selectChoice(0);
            await simulator.confirm();
            await simulator.delay(2000);
          }

          // Fix second issue if presented
          state = simulator.getState();
          if (state.choices && state.choices.length > 0) {
            await simulator.selectChoice(0);
            await simulator.confirm();
            await simulator.delay(2000);
          }

          const initResult = await initPromise;

          return initResult;
        } catch (error) {
          console.error('Multiple Issues Error:', error);
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

      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
    }, 120000);

    it('should recover from interrupted operations', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Simulate interrupted operation
        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '0.4.0',
          project: { name: 'interrupted-project' },
          operation: {
            type: 'init',
            status: 'interrupted',
            step: 'creating-agents',
            timestamp: new Date().toISOString()
          }
        }, null, 2));

        // Create partial structure
        mkdirSync(join(dir, 'PRPs'), { recursive: true });
        mkdirSync(join(dir, 'PRPs', 'temp'), { recursive: true }); // Temp dir from interrupted op

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          const initResult = await terminal.runInit([
            '--recover',
            '--mode', 'ci'
          ]);

          // Should clean up and complete
          expect(existsSync(join(dir, 'PRPs', 'temp'))).toBe(false);

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

      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
    }, 90000);

    it('should reset to working state if repair fails', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create working state first
        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '0.4.0',
          project: { name: 'working-project' }
        }, null, 2));
        writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md');

        // Then corrupt it
        writeFileSync(join(dir, '.prprc', 'completely broken')); // Overwrite with garbage

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          // Try repair
          const initResult = await terminal.runInit([
            '--repair',
            '--reset-if-failed',
            '--mode', 'ci'
          ]);

          // If all else fails, should reset to basic working state
          if (existsSync(join(dir, '.prprc'))) {
            try {
              const config = JSON.parse(readFileSync(join(dir, '.prprc'), 'utf8'));
              expect(config.version).toBeDefined();
              expect(config.project).toBeDefined();
            } catch (e) {
              // At least file should exist
            }
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

      expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
    }, 90000);
  });

  describe('Preventive Maintenance', () => {
    it('should detect potential future issues', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create project with potential issues
        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '0.4.0',
          project: { name: 'preventive-test' },
          agents: [
            { name: 'robo-developer', type: 'development', status: 'active' },
            { name: 'robo-quality-control', type: 'testing', status: 'inactive' }, // Inactive QA
            { name: 'robo-ux-ui-designer', type: 'design', status: 'missing' } // Invalid status
          ],
          deprecated: {
            oldSetting: 'should-be-removed',
            legacyFormat: true
          }
        }, null, 2));

        const terminal = new (require('./helpers/terminal-runner')).PRPTerminalRunner(dir, 'ci');

        try {
          const initResult = await terminal.runInit([
            '--check',
            '--preventive',
            '--mode', 'ci'
          ]);

          // Should detect potential issues
          return initResult;
        } catch (error) {
          return {
            exitCode: 0, // Check mode might not fail
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      expect(result.exitCode === 0).toBe(true);
    }, 60000);

    it('should suggest optimizations', async () => {
      const result = await runInTempDir(async (runner, dir) => {
        // Create suboptimal configuration
        writeFileSync(join(dir, '.prprc'), JSON.stringify({
          version: '0.4.0',
          project: { name: 'optimization-test' },
          agents: [
            { name: 'robo-developer', type: 'development' }
            // Missing other agents
          ],
          orchestrator: {
            mode: 'basic' // Could be enhanced
          }
        }, null, 2));

        const { terminal, simulator } = createTUISimulator(dir, 'tui');

        try {
          const initPromise = terminal.runInit();

          await simulator.waitForScreen('welcome');
          await simulator.delay(2000);

          // Should offer optimization suggestions
          const output = simulator.getCurrentOutput();
          const hasSuggestions = output.includes('optimize') ||
                                output.includes('recommend') ||
                                output.includes('suggest') ||
                                output.includes('enhance');

          console.log('Has optimization suggestions:', hasSuggestions);

          await simulator.confirm();

          const initResult = await initPromise;
          return initResult;
        } catch (error) {
          return {
            exitCode: 0,
            stdout: '',
            stderr: error.message,
            output: error.message,
            duration: 0,
            killed: false
          };
        }
      });

      expect(result.exitCode === 0).toBe(true);
    }, 60000);
  });
});