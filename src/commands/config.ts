#!/usr/bin/env node

/**
 * Config Command Implementation
 * PRP-000: Enhanced configuration management with multi-location support
 */

import { Command } from 'commander';
import { execSync } from 'child_process';
import { logger } from '../utils/logger';
import { ConfigurationManager } from '../config/manager';

interface ConfigOptions {
  get?: string;
  set?: string;
  delete?: string;
  list?: boolean;
  edit?: boolean;
  show?: boolean;
  reset?: boolean;
  validate?: boolean;
}

/**
 * Create config command for CLI
 * PRP-000: Enhanced config command with multi-location support
 */
export function createConfigCommand(): Command {
  const configCmd = new Command('config')
    .description('Manage project configuration with multi-location support')
    .option('-g, --get <key>', 'get configuration value (e.g., settings.debug.enabled)')
    .option('-s, --set <key=value>', 'set configuration value (e.g., settings.debug.enabled=true)')
    .option('-d, --delete <key>', 'delete configuration key')
    .option('-l, --list', 'list all configuration values')
    .option('--show', 'show current configuration sources and summary')
    .option('--edit', 'open configuration file in default editor')
    .option('--reset', 'reset configuration to defaults')
    .option('--validate', 'validate current configuration')
    .action(async (options: ConfigOptions) => {
      await handleConfigCommand(options);
    });

  return configCmd;
}

/**
 * Handle config command execution
 * PRP-000: Enhanced configuration management with multi-location support
 */
async function handleConfigCommand(options: ConfigOptions): Promise<void> {
  try {
    const configManager = new ConfigurationManager();

    // Load configuration from all sources
    await configManager.load();

    // Handle different config operations
    if (options.get) {
      await getConfigValue(configManager, options.get);
    } else if (options.set) {
      await setConfigValue(configManager, options.set);
    } else if (options.delete) {
      await deleteConfigValue(configManager, options.delete);
    } else if (options.list) {
      await listConfigValues(configManager);
    } else if (options.show) {
      await showConfigSummary(configManager);
    } else if (options.edit) {
      await editConfigFile(configManager);
    } else if (options.reset) {
      await resetConfig();
    } else if (options.validate) {
      await validateConfig(configManager);
    } else {
      // Default: show configuration summary
      await showConfigSummary(configManager);
    }

  } catch (error) {
    logger.error('Config command failed:', error);
    process.exit(1);
  }
}

/**
 * Get configuration value by key
 */
async function getConfigValue(configManager: ConfigurationManager, key: string): Promise<void> {
  const config = configManager.get();
  const value = getNestedValue(config, key);

  if (value !== undefined) {
    logger.info('config', `${key}: ${JSON.stringify(value, null, 2)}`);
  } else {
    logger.warn(`Configuration key '${key}' not found`);
    process.exit(1);
  }
}

/**
 * Set configuration value by key
 */
async function setConfigValue(configManager: ConfigurationManager, keyValue: string): Promise<void> {
  const [key, ...valueParts] = keyValue.split('=');
  if (!key || valueParts.length === 0) {
    logger.error('config', 'Invalid format. Use: key=value');
    process.exit(1);
  }

  const value = valueParts.join('=');
  const config = configManager.get();

  // Parse value as JSON if possible, otherwise use as string
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }

  setNestedValue(config, key, parsedValue);
  await configManager.save(config);

  logger.info('config', `✅ Set ${key} = ${JSON.stringify(parsedValue)}`);
}

/**
 * Delete configuration value by key
 */
async function deleteConfigValue(configManager: ConfigurationManager, key: string): Promise<void> {
  const config = configManager.get();

  if (deleteNestedValue(config, key)) {
    await configManager.save(config);
    logger.info('config', `✅ Deleted configuration key '${key}'`);
  } else {
    logger.warn(`Configuration key '${key}' not found`);
  }
}

/**
 * List all configuration values
 */
async function listConfigValues(configManager: ConfigurationManager): Promise<void> {
  const config = configManager.get();
  const sources = configManager.getLoadedSources();

  logger.info('config', 'Configuration sources:');
  sources.forEach(source => logger.info('config', `  - ${source}`));
  logger.info('config', );

  logger.info('config', 'Configuration values:');
  logger.info('config', JSON.stringify(config, null, 2));
}

/**
 * Show configuration summary
 */
async function showConfigSummary(configManager: ConfigurationManager): Promise<void> {
  const summary = configManager.getSummary();

  logger.info('config', 'Configuration Summary:');
  logger.info('config', `  Name: ${summary.name}`);
  logger.info('config', `  Version: ${summary.version}`);
  logger.info('config', `  Project Config: ${summary.hasProjectConfig ? '✅' : '❌'}`);
  logger.info('config', `  Project User Config: ${summary.hasProjectUserConfig ? '✅' : '❌'}`);
  logger.info('config', `  User Config: ${summary.hasUserConfig ? '✅' : '❌'}`);
  logger.info('config', );

  logger.info('config', 'Features:');
  const features = summary.features as Record<string, boolean>;
  Object.entries(features).forEach(([feature, enabled]) => {
    logger.info('config', `  ${feature}: ${enabled ? '✅' : '❌'}`);
  });

  const loadedSources = summary.loadedSources as string[];
  if (loadedSources.length > 0) {
    logger.info('config', );
    logger.info('config', 'Loaded sources:');
    loadedSources.forEach((source: string) => logger.info('config', `  - ${source}`));
  }
}

/**
 * Edit configuration file
 */
async function editConfigFile(configManager: ConfigurationManager): Promise<void> {
  const configPaths = configManager.getPaths();

  if (configPaths.length === 0) {
    logger.error('No configuration file found. Create one first with: prp init');
    process.exit(1);
  }

  const editor = process.env.EDITOR ?? 'nano';

  try {
    execSync(`${editor} "${configPaths[0]}"`, { stdio: 'inherit' });
    logger.info('config', `✅ Edited configuration file: ${configPaths[0]}`);
  } catch (error) {
    logger.error(`Failed to open editor: ${error}`);
    process.exit(1);
  }
}

/**
 * Reset configuration to defaults
 */
async function resetConfig(): Promise<void> {
  logger.warn('This will reset your configuration to defaults. Continue? (y/N)');

  // For now, just show what would happen
  logger.info('config', 'Configuration reset requested. This would reset all settings to defaults.');
  logger.info('config', 'To implement: Save default configuration to project .prprc file');
}

/**
 * Validate configuration
 */
async function validateConfig(configManager: ConfigurationManager): Promise<void> {
  const validation = configManager.validate();

  if (validation.isValid) {
    logger.info('config', '✅ Configuration is valid');
  } else {
    logger.info('config', '❌ Configuration validation failed:');
    validation.errors?.forEach(error => logger.info('config', `  - ${error}`));

    if (validation.warnings && validation.warnings.length > 0) {
      logger.info('config', );
      logger.info('config', 'Warnings:');
      validation.warnings.forEach(warning => logger.info('config', `  - ${warning}`));
    }

    process.exit(1);
  }
}

/**
 * Helper function to get nested value from object
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Helper function to set nested value in object
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return;

  const target = keys.reduce((current: Record<string, unknown>, key: string) => {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    return current[key] as Record<string, unknown>;
  }, obj);

  target[lastKey] = value;
}

/**
 * Helper function to delete nested value from object
 */
function deleteNestedValue(obj: Record<string, unknown>, path: string): boolean {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return false;

  const target = keys.reduce((current: Record<string, unknown> | undefined, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key] as Record<string, unknown>;
    }
    return undefined;
  }, obj);

  if (target && typeof target === 'object' && lastKey in target) {
    delete target[lastKey];
    return true;
  }

  return false;
}

// Export for use in main CLI
export { createConfigCommand as default };