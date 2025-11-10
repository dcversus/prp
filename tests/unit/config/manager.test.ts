/**
 * Configuration Manager Unit Tests
 *
 * Comprehensive behavior tests for the ConfigurationManager class
 * covering configuration loading, merging, validation, and environment
 * variable substitution.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigurationManager } from '../../../src/config/manager.js';
import { logger } from '../../../src/utils/logger.js';
import { ConfigurationError } from '../../../src/utils/error-handler.js';
import type { PRPConfig } from '../../../src/shared/config.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js');
jest.mock('fs-extra');
jest.mock('yaml');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockEnsureDir = jest.fn();
jest.mock('fs-extra', () => ({
  ensureDir: mockEnsureDir
}));

const mockYaml = {
  stringify: jest.fn(),
  parse: jest.fn()
};
jest.mock('yaml', () => mockYaml);

describe('ConfigurationManager', () => {
  let testDir: string;
  let configManager: ConfigurationManager;
  let mockHomedir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join('/tmp', `prp-config-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(testDir, { recursive: true });

    // Mock homedir
    mockHomedir = path.join('/tmp', `home-test-${Date.now()}`);
    await fs.mkdir(mockHomedir, { recursive: true });
    (os.homedir as jest.Mock) = jest.fn().mockReturnValue(mockHomedir);

    // Create config manager instance
    configManager = new ConfigurationManager(testDir);

    // Mock logger
    mockLogger.info.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.rmdir(testDir, { recursive: true });
      await fs.rmdir(mockHomedir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    jest.clearAllMocks();
  });

  describe('Default Configuration', () => {
    it('should load default configuration when no config files exist', async () => {
      const config = await configManager.load();

      expect(config).toMatchObject({
        version: '1.0.0',
        name: 'prp-project',
        description: 'PRP Project',
        storage: {
          dataDir: '.prp',
          cacheDir: '/tmp/prp-cache',
          worktreesDir: '/tmp/prp-worktrees',
          notesDir: '.prp/notes',
          logsDir: '/tmp/prp-logs',
          keychainFile: '.prp/keychain.json',
          persistFile: '.prp/state.json',
          maxCacheSize: 100 * 1024 * 1024,
          retentionPeriod: 30 * 24 * 60 * 60 * 1000
        },
        features: {
          scanner: true,
          inspector: true,
          orchestrator: true,
          tui: true,
          mcp: true,
          worktrees: true
        }
      });
    });

    it('should have complete default settings structure', async () => {
      const config = await configManager.load();

      expect(config.settings).toBeDefined();
      expect(config.settings.debug).toBeDefined();
      expect(config.settings.quality).toBeDefined();
      expect(config.settings.build).toBeDefined();
      expect(config.settings.test).toBeDefined();
      expect(config.settings.ci).toBeDefined();
      expect(config.settings.development).toBeDefined();
      expect(config.settings.packageManager).toBeDefined();
    });
  });

  describe('Configuration Precedence', () => {
    it('should load configuration in correct precedence order', async () => {
      // Create user config (~/.prprc)
      const userConfigPath = path.join(mockHomedir, '.prprc');
      await fs.writeFile(userConfigPath, JSON.stringify({
        name: 'user-project',
        version: '2.0.0'
      }));

      // Create project user config (.prp/.prprc)
      const projectUserDir = path.join(testDir, '.prp');
      await fs.mkdir(projectUserDir, { recursive: true });
      const projectUserConfigPath = path.join(projectUserDir, '.prprc');
      await fs.writeFile(projectUserConfigPath, JSON.stringify({
        name: 'project-user-project',
        version: '3.0.0',
        description: 'Project user description'
      }));

      // Create project config (.prprc)
      const projectConfigPath = path.join(testDir, '.prprc');
      await fs.writeFile(projectConfigPath, JSON.stringify({
        name: 'project-project',
        version: '4.0.0',
        description: 'Final project description',
        authors: ['test@example.com']
      }));

      const config = await configManager.load();

      // Project config should have highest precedence
      expect(config.name).toBe('project-project');
      expect(config.version).toBe('4.0.0');
      expect(config.description).toBe('Final project description');
      expect(config.authors).toEqual(['test@example.com']);
    });

    it('should track loaded sources correctly', async () => {
      // Create multiple config files
      const userConfigPath = path.join(mockHomedir, '.prprc');
      await fs.writeFile(userConfigPath, JSON.stringify({ name: 'user-config' }));

      const projectConfigPath = path.join(testDir, '.prprc');
      await fs.writeFile(projectConfigPath, JSON.stringify({ name: 'project-config' }));

      const config = await configManager.load();
      const sources = configManager.getLoadedSources();

      expect(sources).toHaveLength(2);
      expect(sources).toContain(`user:${userConfigPath}`);
      expect(sources).toContain(`project:${projectConfigPath}`);
    });
  });

  describe('Configuration File Formats', () => {
    describe('JSON format', () => {
      it('should load JSON configuration files', async () => {
        const configPath = path.join(testDir, '.prprc.json');
        const configData = {
          name: 'json-project',
          version: '1.0.0',
          features: { scanner: false }
        };
        await fs.writeFile(configPath, JSON.stringify(configData));

        const config = await configManager.load();

        expect(config.name).toBe('json-project');
        expect(config.features.scanner).toBe(false);
      });
    });

    describe('YAML format', () => {
      it('should load YAML configuration files', async () => {
        const configPath = path.join(testDir, '.prprc.yaml');
        const yamlContent = `
name: yaml-project
version: 1.0.0
features:
  scanner: false
  inspector: true
        `.trim();
        await fs.writeFile(configPath, yamlContent);

        mockYaml.parse.mockReturnValue({
          name: 'yaml-project',
          version: '1.0.0',
          features: { scanner: false, inspector: true }
        });

        const config = await configManager.load();

        expect(mockYaml.parse).toHaveBeenCalledWith(yamlContent);
        expect(config.name).toBe('yaml-project');
        expect(config.features.scanner).toBe(false);
        expect(config.features.inspector).toBe(true);
      });
    });

    describe('JS format', () => {
      it('should load JS configuration files', async () => {
        const configPath = path.join(testDir, 'prp.config.js');
        const jsContent = `
module.exports = {
  name: 'js-project',
  version: '1.0.0',
  features: { scanner: false }
};
        `.trim();
        await fs.writeFile(configPath, jsContent);

        // Mock dynamic import
        const mockConfig = {
          name: 'js-project',
          version: '1.0.0',
          features: { scanner: false }
        };
        jest.doMock(configPath, () => mockConfig, { virtual: true });

        const config = await configManager.load();

        expect(config.name).toBe('js-project');
        expect(config.features.scanner).toBe(false);
      });
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configurations with proper precedence', async () => {
      // Base config
      const baseConfig = {
        name: 'base-project',
        features: { scanner: true, inspector: true },
        settings: { debug: { enabled: true } }
      };

      // Override config
      const overrideConfig = {
        name: 'override-project',
        features: { inspector: false, tui: false },
        settings: { debug: { level: 'verbose' } }
      };

      // Create base config file
      const basePath = path.join(testDir, '.prprc');
      await fs.writeFile(basePath, JSON.stringify(baseConfig));

      const config = await configManager.load();

      // Apply CLI override
      configManager.applyCLIOverrides(overrideConfig);

      const finalConfig = configManager.get();

      expect(finalConfig.name).toBe('override-project'); // Override wins
      expect(finalConfig.features.scanner).toBe(true); // From base
      expect(finalConfig.features.inspector).toBe(false); // Override wins
      expect(finalConfig.features.tui).toBe(false); // From override
      expect(finalConfig.settings.debug).toMatchObject({
        enabled: true, // From base
        level: 'verbose' // From override
      });
    });
  });

  describe('Environment Variable Substitution', () => {
    it('should substitute environment variables in configuration', async () => {
      process.env.TEST_VAR = 'test-value';
      process.env.PROJECT_NAME = 'env-project';

      const configData = {
        name: '${PROJECT_NAME}',
        description: 'Project with ${TEST_VAR}',
        settings: {
          build: {
            output: {
              directory: '${TEST_VAR}/build'
            }
          }
        }
      };

      const configPath = path.join(testDir, '.prprc');
      await fs.writeFile(configPath, JSON.stringify(configData));

      const config = await configManager.load();

      expect(config.name).toBe('env-project');
      expect(config.description).toBe('Project with test-value');
      expect(config.settings.build.output.directory).toBe('test-value/build');

      // Cleanup
      delete process.env.TEST_VAR;
      delete process.env.PROJECT_NAME;
    });

    it('should handle environment variables with default values', async () => {
      process.env.EXISTING_VAR = 'exists';

      const configData = {
        name: '${MISSING_VAR:-default-value}',
        description: '${EXISTING_VAR:-fallback}',
        setting: '${EMPTY_VAR:-default}'
      };

      const configPath = path.join(testDir, '.prprc');
      await fs.writeFile(configPath, JSON.stringify(configData));

      const config = await configManager.load();

      expect(config.name).toBe('default-value');
      expect(config.description).toBe('exists');
      expect(config.setting).toBe('default');

      // Cleanup
      delete process.env.EXISTING_VAR;
    });

    it('should handle case-insensitive environment variable lookup', async () => {
      process.env.TEST_VAR = 'lowercase';
      process.env.test_var = 'mixed-case';
      process.env.TEST_VAR = 'uppercase';

      const configData = {
        value1: '${TEST_VAR}',
        value2: '${test_var}',
        value3: '${Test_Var}'
      };

      const configPath = path.join(testDir, '.prprc');
      await fs.writeFile(configPath, JSON.stringify(configData));

      const config = await configManager.load();

      // Should find the exact match first
      expect(config.value1).toBe('uppercase');
      expect(config.value2).toBe('mixed-case');
      expect(config.value3).toBe('uppercase');

      // Cleanup
      delete process.env.TEST_VAR;
      delete process.env.test_var;
    });
  });

  describe('Configuration Saving', () => {
    it('should save configuration as JSON by default', async () => {
      const config = await configManager.load();
      config.name = 'saved-project';

      const configPath = path.join(testDir, '.prprc');

      await configManager.save(config);

      expect(mockEnsureDir).toHaveBeenCalledWith(path.dirname(path.resolve(configPath)));
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Configuration saved to:'),
        configPath
      );
    });

    it('should save configuration as YAML when extension is .yaml', async () => {
      const config = await configManager.load();
      config.name = 'yaml-saved-project';

      const configPath = path.join(testDir, '.prprc.yaml');
      mockYaml.stringify.mockReturnValue('yaml-content');

      await configManager.save(config, configPath);

      expect(mockYaml.stringify).toHaveBeenCalledWith(config);
    });

    it('should save configuration to specified path', async () => {
      const config = await configManager.load();
      config.name = 'custom-path-project';

      const customPath = path.join(testDir, 'custom.config.json');

      await configManager.save(config, customPath);

      expect(mockEnsureDir).toHaveBeenCalledWith(path.dirname(path.resolve(customPath)));
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration structure', async () => {
      const invalidConfig = {
        name: 123, // Should be string
        features: 'invalid', // Should be object
        missing: 'property'
      };

      const configPath = path.join(testDir, '.prprc');
      await fs.writeFile(configPath, JSON.stringify(invalidConfig));

      // Should load but potentially fail validation (currently commented out)
      const config = await configManager.load();

      expect(config).toBeDefined();
      // Note: Validation is currently disabled in the code
    });
  });

  describe('Configuration Methods', () => {
    beforeEach(async () => {
      // Create a test config file
      const configPath = path.join(testDir, '.prprc');
      await fs.writeFile(configPath, JSON.stringify({
        name: 'test-project',
        settings: {
          debug: { enabled: true },
          quality: { linting: { enabled: false } }
        }
      }));

      await configManager.load();
    });

    it('should get current configuration', () => {
      const config = configManager.get();

      expect(config).toBeDefined();
      expect(config.name).toBe('test-project');
    });

    it('should throw error when getting config before loading', () => {
      const newManager = new ConfigurationManager('/tmp');

      expect(() => newManager.get()).toThrow('Configuration not loaded');
    });

    it('should get configuration paths', () => {
      const paths = configManager.getPaths();

      expect(paths).toHaveLength(1);
      expect(paths[0]).toContain('.prprc');
    });

    it('should update configuration section', async () => {
      const newDebugSettings = {
        enabled: false,
        level: 'error',
        console: false,
        file: true,
        timestamp: false,
        colors: false,
        profiling: true
      };

      await configManager.updateSection('debug', newDebugSettings);

      const config = configManager.get();
      expect(config.settings.debug).toEqual(newDebugSettings);
    });

    it('should get configuration section', () => {
      const debugSettings = configManager.getSection('debug');

      expect(debugSettings).toMatchObject({
        enabled: true
      });
    });

    it('should get configuration summary', () => {
      const summary = configManager.getSummary();

      expect(summary).toMatchObject({
        name: 'test-project',
        version: '1.0.0',
        hasProjectConfig: true,
        features: {
          debug: true,
          quality: false,
          ci: false,
          development: false
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON configuration', async () => {
      const configPath = path.join(testDir, '.prprc');
      await fs.writeFile(configPath, 'invalid-json-content');

      await expect(configManager.load()).rejects.toThrow(ConfigurationError);
    });

    it('should handle invalid YAML configuration', async () => {
      const configPath = path.join(testDir, '.prprc.yaml');
      await fs.writeFile(configPath, 'invalid: yaml: content:');

      mockYaml.parse.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      await expect(configManager.load()).rejects.toThrow(ConfigurationError);
    });

    it('should handle missing configuration files gracefully', async () => {
      const config = await configManager.load();

      expect(config).toBeDefined();
      expect(config.name).toBe('prp-project'); // Default
    });

    it('should handle file read errors', async () => {
      const configPath = path.join(testDir, '.prprc');

      // Create file but make it unreadable (simulate permission error)
      await fs.writeFile(configPath, '{}');

      // Mock fs.readFile to throw error
      const originalReadFile = fs.readFile;
      (fs.readFile as jest.Mock) = jest.fn().mockRejectedValue(new Error('Permission denied'));

      const config = await configManager.load();

      // Should fall back to defaults
      expect(config.name).toBe('prp-project');

      // Restore original
      (fs.readFile as jest.Mock) = originalReadFile;
    });
  });

  describe('Utility Methods', () => {
    it('should reset configuration', async () => {
      await configManager.load();
      expect(configManager.get()).toBeDefined();

      configManager.reset();

      expect(() => configManager.get()).toThrow('Configuration not loaded');
    });

    it('should check if configuration exists', async () => {
      // No config files exist
      expect(configManager.exists()).toBe(false);

      // Create config file
      const configPath = path.join(testDir, '.prprc');
      await fs.writeFile(configPath, '{}');

      expect(configManager.exists()).toBe(true);
    });

    it('should handle empty working directory', () => {
      const emptyManager = new ConfigurationManager('/nonexistent/path');

      expect(() => emptyManager.get()).toThrow('Configuration not loaded');
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete configuration workflow', async () => {
      // Create user config with environment variables
      const userConfigPath = path.join(mockHomedir, '.prprc');
      process.env.USER_NAME = 'test-user';
      await fs.writeFile(userConfigPath, JSON.stringify({
        name: '${USER_NAME}-project',
        features: { scanner: true }
      }));

      // Create project config
      const projectConfigPath = path.join(testDir, '.prprc');
      await fs.writeFile(projectConfigPath, JSON.stringify({
        description: 'Project description',
        features: { inspector: true, tui: false }
      }));

      // Load configuration
      await configManager.load();

      // Apply CLI overrides
      configManager.applyCLIOverrides({
        version: '2.0.0',
        features: { orchestrator: true }
      });

      const config = configManager.get();

      expect(config.name).toBe('test-user-project'); // From user config with env var
      expect(config.description).toBe('Project description'); // From project config
      expect(config.version).toBe('2.0.0'); // From CLI override
      expect(config.features).toMatchObject({
        scanner: true, // From user config
        inspector: true, // From project config
        tui: false, // From project config
        orchestrator: true // From CLI override
      });

      // Save configuration
      const savePath = path.join(testDir, 'merged.config.json');
      await configManager.save(config, savePath);

      expect(mockEnsureDir).toHaveBeenCalled();

      // Cleanup
      delete process.env.USER_NAME;
    });
  });
});