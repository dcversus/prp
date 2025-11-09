/**
 * ♫ TUI .prprc Configuration Manager
 *
 * Manages TUI configuration through .prprc files with real-time updates,
 * validation, and migration support
 */

import { readFileSync, writeFileSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join, dirname } from 'path';
import React, { useState, useEffect, useCallback } from 'react';
import { createTUIConfig, TUIConfig, Theme } from './TUIConfig.js';
import { TUIConfig as TUIConfigType } from '../types/TUIConfig.js';

export interface PRCConfig {
  version: string;
  name: string;
  description: string;
  tui: {
    enabled: boolean;
    theme: Theme;
    animations: {
      enabled: boolean;
      intro: {
        enabled: boolean;
        duration: number;
        fps: number;
      };
      status: {
        enabled: boolean;
        fps: number;
      };
      signals: {
        enabled: boolean;
        waveSpeed: number;
        blinkSpeed: number;
      };
    };
    layout: {
      responsive: boolean;
      breakpoints: {
        compact: number;
        normal: number;
        wide: number;
        ultrawide: number;
      };
      padding: {
        horizontal: number;
        vertical: number;
      };
    };
    input: {
      maxTokens: number;
      tokenReserve: number;
      pasteTimeout: number;
    };
    debug: {
      enabled: boolean;
      maxLogLines: number;
      showFullJSON: boolean;
    };
    melody?: {
      enabled: boolean;
      bpm: number;
      autoLoad: boolean;
      filePath?: string;
    };
  };
  // Allow merging with existing .prprc structure
  [key: string]: unknown;
}

export interface ConfigChangeEvent {
  type: 'load' | 'save' | 'update' | 'error';
  config?: TUIConfig;
  error?: Error;
  timestamp: Date;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: PRCConfig;
}

/**
 * Configuration manager for .prprc files
 */
export class PRCConfigManager {
  private configPath: string;
  private config: TUIConfig;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private changeListeners: Set<(event: ConfigChangeEvent) => void> = new Set();
  private lastModified: number = 0;

  constructor(configPath: string = '.prprc') {
    this.configPath = this.resolveConfigPath(configPath);
    this.config = this.loadConfiguration();
    this.startWatching();
  }

  /**
   * Resolve configuration file path
   */
  private resolveConfigPath(configPath: string): string {
    if (configPath.startsWith('/')) {
      return configPath;
    }

    // Try current directory first
    const currentDir = join(process.cwd(), configPath);
    if (existsSync(currentDir)) {
      return currentDir;
    }

    // Try project root
    const projectRoot = this.findProjectRoot(process.cwd());
    return join(projectRoot, configPath);
  }

  /**
   * Find project root directory
   */
  private findProjectRoot(startDir: string): string {
    let current = startDir;
    const maxDepth = 10;
    let depth = 0;

    while (depth < maxDepth) {
      const prcPath = join(current, '.prprc');
      if (existsSync(prcPath)) {
        return current;
      }

      const parent = dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
      depth++;
    }

    return startDir;
  }

  /**
   * Load configuration from .prprc file
   */
  private loadConfiguration(): TUIConfig {
    try {
      if (!existsSync(this.configPath)) {
        const defaultConfig = this.createDefaultPRCConfig();
        this.saveConfiguration(defaultConfig);
        return this.convertPRCToTUI(defaultConfig);
      }

      const fileContent = readFileSync(this.configPath, 'utf-8');
      const prcConfig: PRCConfig = JSON.parse(fileContent);

      const validation = this.validateConfiguration(prcConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      const normalizedConfig = validation.normalized || prcConfig;
      const tuiConfig = this.convertPRCToTUI(normalizedConfig);

      this.emitChange({
        type: 'load',
        config: tuiConfig,
        timestamp: new Date()
      });

      return tuiConfig;
    } catch (error) {
      const configError = error instanceof Error ? error : new Error(String(error));

      this.emitChange({
        type: 'error',
        error: configError,
        timestamp: new Date()
      });

      // Return default configuration on error
      return createTUIConfig();
    }
  }

  /**
   * Create default .prprc configuration
   */
  private createDefaultPRCConfig(): PRCConfig {
    const tuiConfig = createTUIConfig();
    return {
      version: '1.0.0',
      name: 'prp-project',
      description: 'PRP Project with TUI',
      tui: {
        enabled: tuiConfig.enabled,
        theme: tuiConfig.theme,
        animations: tuiConfig.animations,
        layout: tuiConfig.layout,
        input: tuiConfig.input,
        debug: tuiConfig.debug,
        melody: {
          enabled: true,
          bpm: 120,
          autoLoad: true,
          filePath: undefined
        }
      }
    };
  }

  /**
   * Validate .prprc configuration
   */
  private validateConfiguration(config: PRCConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.version) {
      errors.push('Missing version field');
    }

    if (!config.tui) {
      errors.push('Missing tui configuration section');
      return { valid: false, errors, warnings };
    }

    const tui = config.tui;

    // Validate theme
    if (tui.theme && !['dark', 'light'].includes(tui.theme)) {
      warnings.push(`Invalid theme "${tui.theme}", using "dark"`);
      tui.theme = 'dark';
    }

    // Validate animation FPS
    if (tui.animations?.status?.fps) {
      if (tui.animations.status.fps < 1 || tui.animations.status.fps > 60) {
        warnings.push(`Invalid status FPS "${tui.animations.status.fps}", using 4`);
        tui.animations.status.fps = 4;
      }
    }

    if (tui.animations?.intro?.fps) {
      if (tui.animations.intro.fps < 1 || tui.animations.intro.fps > 60) {
        warnings.push(`Invalid intro FPS "${tui.animations.intro.fps}", using 12`);
        tui.animations.intro.fps = 12;
      }
    }

    // Validate breakpoints
    if (tui.layout?.breakpoints) {
      const { compact, normal, wide, ultrawide } = tui.layout.breakpoints;

      if (compact >= normal) {
        warnings.push('Compact breakpoint should be less than normal');
        tui.layout.breakpoints.compact = 100;
      }

      if (normal >= wide) {
        warnings.push('Normal breakpoint should be less than wide');
        tui.layout.breakpoints.normal = 160;
      }

      if (wide >= ultrawide) {
        warnings.push('Wide breakpoint should be less than ultrawide');
        tui.layout.breakpoints.wide = 240;
      }
    }

    // Validate input settings
    if (tui.input?.maxTokens && tui.input.maxTokens < 1000) {
      warnings.push('Max tokens should be at least 1000');
      tui.input.maxTokens = 100000;
    }

    if (tui.input?.tokenReserve && (tui.input.tokenReserve < 0 || tui.input.tokenReserve > 1)) {
      warnings.push('Token reserve should be between 0 and 1');
      tui.input.tokenReserve = 0.05;
    }

    // Validate melody settings
    if (tui.melody?.bpm) {
      if (tui.melody.bpm < 60 || tui.melody.bpm > 200) {
        warnings.push('Melody BPM should be between 60 and 200');
        tui.melody.bpm = 120;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      normalized: config
    };
  }

  /**
   * Convert .prprc configuration to TUI configuration
   */
  private convertPRCToTUI(prcConfig: PRCConfig): TUIConfig {
    const tuiSection = prcConfig.tui || {};

    return createTUIConfig({
      enabled: tuiSection.enabled ?? true,
      theme: tuiSection.theme ?? 'dark',
      animations: {
        enabled: tuiSection.animations?.enabled ?? true,
        intro: {
          enabled: tuiSection.animations?.intro?.enabled ?? true,
          duration: tuiSection.animations?.intro?.duration ?? 10000,
          fps: tuiSection.animations?.intro?.fps ?? 12
        },
        status: {
          enabled: tuiSection.animations?.status?.enabled ?? true,
          fps: tuiSection.animations?.status?.fps ?? 4
        },
        signals: {
          enabled: tuiSection.animations?.signals?.enabled ?? true,
          waveSpeed: tuiSection.animations?.signals?.waveSpeed ?? 50,
          blinkSpeed: tuiSection.animations?.signals?.blinkSpeed ?? 1000
        }
      },
      layout: {
        responsive: tuiSection.layout?.responsive ?? true,
        breakpoints: {
          compact: tuiSection.layout?.breakpoints?.compact ?? 100,
          normal: tuiSection.layout?.breakpoints?.normal ?? 160,
          wide: tuiSection.layout?.breakpoints?.wide ?? 240,
          ultrawide: tuiSection.layout?.breakpoints?.ultrawide ?? 240
        },
        padding: {
          horizontal: tuiSection.layout?.padding?.horizontal ?? 2,
          vertical: tuiSection.layout?.padding?.vertical ?? 1
        }
      },
      input: {
        maxTokens: tuiSection.input?.maxTokens ?? 100000,
        tokenReserve: tuiSection.input?.tokenReserve ?? 0.05,
        pasteTimeout: tuiSection.input?.pasteTimeout ?? 1000
      },
      debug: {
        enabled: tuiSection.debug?.enabled ?? false,
        maxLogLines: tuiSection.debug?.maxLogLines ?? 100,
        showFullJSON: tuiSection.debug?.showFullJSON ?? false
      }
    });
  }

  /**
   * Convert TUI configuration to .prprc format
   */
  private convertTUIToPRC(tuiConfig: TUIConfig): PRCConfig {
    let existingPRC: PRCConfig;

    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf-8');
        existingPRC = JSON.parse(content);
      } else {
        existingPRC = this.createDefaultPRCConfig();
      }
    } catch {
      existingPRC = this.createDefaultPRCConfig();
    }

    // Update only the TUI section
    existingPRC.tui = {
      enabled: tuiConfig.enabled,
      theme: tuiConfig.theme,
      animations: tuiConfig.animations,
      layout: tuiConfig.layout,
      input: tuiConfig.input,
      debug: tuiConfig.debug
    };

    return existingPRC;
  }

  /**
   * Save configuration to .prprc file
   */
  private saveConfiguration(prcConfig: PRCConfig): void {
    try {
      const jsonContent = JSON.stringify(prcConfig, null, 2);
      writeFileSync(this.configPath, jsonContent, 'utf-8');
      this.lastModified = Date.now();
    } catch (error) {
      const configError = error instanceof Error ? error : new Error(String(error));

      this.emitChange({
        type: 'error',
        error: configError,
        timestamp: new Date()
      });

      throw configError;
    }
  }

  /**
   * Start watching configuration file for changes
   */
  private startWatching(): void {
    if (!existsSync(this.configPath)) {
      return;
    }

    try {
      watchFile(this.configPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          this.reloadConfiguration();
        }
      });
    } catch (error) {
      console.warn('Failed to watch configuration file:', error);
    }
  }

  /**
   * Reload configuration from file
   */
  private reloadConfiguration(): void {
    try {
      const newConfig = this.loadConfiguration();
      const oldConfig = this.config;
      this.config = newConfig;

      this.emitChange({
        type: 'update',
        config: newConfig,
        timestamp: new Date()
      });
    } catch (error) {
      const configError = error instanceof Error ? error : new Error(String(error));

      this.emitChange({
        type: 'error',
        error: configError,
        timestamp: new Date()
      });
    }
  }

  /**
   * Emit configuration change event
   */
  private emitChange(event: ConfigChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    });
  }

  /**
   * Get current configuration
   */
  public getConfig(): TUIConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<TUIConfig>): void {
    try {
      const newConfig = { ...this.config, ...updates };
      const prcConfig = this.convertTUIToPRC(newConfig);
      this.saveConfiguration(prcConfig);
      this.config = newConfig;

      this.emitChange({
        type: 'save',
        config: newConfig,
        timestamp: new Date()
      });
    } catch (error) {
      const configError = error instanceof Error ? error : new Error(String(error));

      this.emitChange({
        type: 'error',
        error: configError,
        timestamp: new Date()
      });

      throw configError;
    }
  }

  /**
   * Update specific TUI section
   */
  public updateTUISection(section: keyof TUIConfig, value: unknown): void {
    this.updateConfig({ [section]: value } as Partial<TUIConfig>);
  }

  /**
   * Add configuration change listener
   */
  public addChangeListener(listener: (event: ConfigChangeEvent) => void): () => void {
    this.changeListeners.add(listener);

    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * Remove configuration change listener
   */
  public removeChangeListener(listener: (event: ConfigChangeEvent) => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Reset configuration to defaults
   */
  public resetToDefaults(): void {
    const defaultPRCConfig = this.createDefaultPRCConfig();
    const defaultTUIConfig = this.convertPRCToTUI(defaultPRCConfig);

    this.saveConfiguration(defaultPRCConfig);
    this.config = defaultTUIConfig;

    this.emitChange({
      type: 'save',
      config: defaultTUIConfig,
      timestamp: new Date()
    });
  }

  /**
   * Export configuration to JSON string
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  public importConfig(jsonString: string): void {
    try {
      const importedConfig: TUIConfigType = JSON.parse(jsonString);
      const validation = this.validateTUIConfig(importedConfig);

      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      this.updateConfig(importedConfig);
    } catch (error) {
      const configError = error instanceof Error ? error : new Error(String(error));

      this.emitChange({
        type: 'error',
        error: configError,
        timestamp: new Date()
      });

      throw configError;
    }
  }

  /**
   * Validate TUI configuration
   */
  private validateTUIConfig(config: TUIConfigType): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.theme || !['dark', 'light'].includes(config.theme)) {
      errors.push('Invalid theme');
    }

    if (config.animations?.status?.fps && (config.animations.status.fps < 1 || config.animations.status.fps > 60)) {
      errors.push('Invalid status FPS');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    try {
      unwatchFile(this.configPath);
    } catch {
      // Ignore errors
    }

    this.changeListeners.clear();
  }
}

// Global configuration manager instance
let globalConfigManager: PRCConfigManager | null = null;

/**
 * Get global configuration manager instance
 */
export function getConfigManager(configPath?: string): PRCConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new PRCConfigManager(configPath);
  }
  return globalConfigManager;
}

/**
 * Hook for using configuration in React components
 */
export function useTUIConfig(configPath?: string) {
  const [config, setConfig] = useState<TUIConfig>(() => {
    const manager = getConfigManager(configPath);
    return manager.getConfig();
  });

  const [, forceUpdate] = useState({});

  useEffect(() => {
    const manager = getConfigManager(configPath);

    const handleChange = (event: ConfigChangeEvent) => {
      if (event.type === 'load' || event.type === 'update' || event.type === 'save') {
        if (event.config) {
          setConfig(event.config);
          forceUpdate({});
        }
      }
    };

    manager.addChangeListener(handleChange);

    return () => {
      manager.removeChangeListener(handleChange);
    };
  }, [configPath]);

  const updateConfig = useCallback((updates: Partial<TUIConfig>) => {
    const manager = getConfigManager(configPath);
    manager.updateConfig(updates);
  }, [configPath]);

  return {
    config,
    updateConfig,
    resetToDefaults: () => {
      const manager = getConfigManager(configPath);
      manager.resetToDefaults();
    },
    export: () => {
      const manager = getConfigManager(configPath);
      return manager.exportConfig();
    },
    import: (jsonString: string) => {
      const manager = getConfigManager(configPath);
      manager.importConfig(jsonString);
    }
  };
}

export default PRCConfigManager;