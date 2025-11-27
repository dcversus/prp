/**
 * Lazy loading utilities for optimizing CLI startup performance
 */
import { createLayerLogger } from '../logger';

const logger = createLayerLogger('shared');
export interface LazyModule<T> {
  load(): Promise<T>;
  isLoaded(): boolean;
  getValue(): T | undefined;
}
export class LazyImport<T> implements LazyModule<T> {
  private module: T | undefined;
  private loading: Promise<T> | undefined;
  private readonly importFn: () => Promise<T>;
  constructor(importFn: () => Promise<T>) {
    this.importFn = importFn;
  }
  async load(): Promise<T> {
    if (this.module) {
      logger.debug('LazyLoader', 'Module already loaded, returning cached module');
      return this.module;
    }
    if (this.loading) {
      logger.debug('LazyLoader', 'Module currently loading, waiting for load to complete');
      return this.loading;
    }
    logger.debug('LazyLoader', 'Starting module load');
    this.loading = this.importFn();
    this.module = await this.loading;
    logger.debug('LazyLoader', 'Module loaded successfully');
    return this.module;
  }
  isLoaded(): boolean {
    return this.module !== undefined;
  }
  getValue(): T | undefined {
    return this.module;
  }
}
// Factory function for creating lazy imports
export const lazy = <T>(importFn: () => Promise<T>): LazyImport<T> => {
  return new LazyImport(importFn);
};
// Lazy-loaded command modules
export const lazyCommands = {
  init: () => lazy(() => import('../../commands/init')),
  orchestrator: () => lazy(() => import('../../commands/orchestrator')),
};
// Lazy-loaded UI components
export const lazyUI = {
  App: () => lazy(() => import('../../ui/App')),
  NonInteractive: () => lazy(() => import('../cli/nonInteractive')),
};
// Lazy-loaded heavy dependencies (excluding React to avoid type issues)
const lazyDependencies = {
  ink: () => lazy(() => import('ink')),
  commander: () => lazy(() => import('commander')),
  chokidar: () => lazy(() => import('chokidar')),
  handlebars: () => lazy(() => import('handlebars')),
  figlet: () => lazy(() => import('figlet')),
  ora: () => lazy(() => import('ora')),
};
// Export a wrapper function to avoid type issues
export const getLazyDependency = (name: keyof typeof lazyDependencies) => {
  return lazyDependencies[name];
};
// Preload strategy for critical modules
export class ModulePreloader {
  private static readonly preloadQueue = new Set<() => Promise<unknown>>();
  private static isPreloading = false;
  static addToPreload(loadFn: () => Promise<unknown>): void {
    this.preloadQueue.add(loadFn);
    logger.debug('ModulePreloader', 'Added module to preload queue', {
      queueSize: this.preloadQueue.size,
    });
  }
  static async preloadCritical(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.size === 0) {
      logger.debug('ModulePreloader', 'Preload skipped', {
        isPreloading: this.isPreloading,
        queueSize: this.preloadQueue.size,
      });
      return;
    }
    this.isPreloading = true;
    logger.debug('ModulePreloader', 'Starting critical module preloading', {
      moduleCount: this.preloadQueue.size,
    });
    try {
      // Preload modules in parallel
      const preloadPromises = Array.from(this.preloadQueue).map(async (loadFn, index) => {
        try {
          await loadFn();
          logger.debug('ModulePreloader', `Module ${index} preloaded successfully`);
        } catch (error) {
          logger.error('ModulePreloader', `Failed to preload module ${index}`, error as Error);
        }
      });
      await Promise.allSettled(preloadPromises);
      this.preloadQueue.clear();
      logger.debug('ModulePreloader', 'Critical module preloading completed');
    } finally {
      this.isPreloading = false;
    }
  }
  static getPreloadStatus(): { isPreloading: boolean; queueSize: number } {
    return {
      isPreloading: this.isPreloading,
      queueSize: this.preloadQueue.size,
    };
  }
}
// Conditional loading based on command
export class ConditionalLoader {
  private static readonly loadedModules = new Map<string, unknown>();
  static async loadCommand(commandName: string): Promise<unknown> {
    if (this.loadedModules.has(commandName)) {
      logger.debug(
        'ConditionalLoader',
        `Command ${commandName} already loaded, returning cached module`,
      );
      return this.loadedModules.get(commandName);
    }
    const commandKey = commandName as keyof typeof lazyCommands;
    if (!(commandKey in lazyCommands)) {
      logger.error('ConditionalLoader', `Unknown command: ${commandName}`);
      throw new Error(`Unknown command: ${commandName}`);
    }
    logger.debug('ConditionalLoader', `Loading command: ${commandName}`);
    const module = await lazyCommands[commandKey]().load();
    this.loadedModules.set(commandName, module);
    logger.debug('ConditionalLoader', `Command ${commandName} loaded successfully`);
    return module;
  }
  static async loadUI(uiName: string): Promise<unknown> {
    if (this.loadedModules.has(uiName)) {
      return this.loadedModules.get(uiName);
    }
    const uiKey = uiName as keyof typeof lazyUI;
    if (!(uiKey in lazyUI)) {
      throw new Error(`Unknown UI component: ${uiName}`);
    }
    const module = await lazyUI[uiKey]().load();
    this.loadedModules.set(uiName, module);
    return module;
  }
  static getLoadedModules(): string[] {
    return Array.from(this.loadedModules.keys());
  }
  static clearCache(): void {
    this.loadedModules.clear();
  }
}
