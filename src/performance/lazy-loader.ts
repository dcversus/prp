/**
 * Lazy loading utilities for optimizing CLI startup performance
 */

export interface LazyModule<T> {
  load(): Promise<T>;
  isLoaded(): boolean;
  getValue(): T | undefined;
}

export class LazyImport<T> implements LazyModule<T> {
  private module: T | undefined;
  private loading: Promise<T> | undefined;
  private importFn: () => Promise<T>;

  constructor(importFn: () => Promise<T>) {
    this.importFn = importFn;
  }

  async load(): Promise<T> {
    if (this.module) {
      return this.module;
    }

    if (this.loading) {
      return this.loading;
    }

    this.loading = this.importFn();
    this.module = await this.loading;
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
export function lazy<T>(importFn: () => Promise<T>): LazyImport<T> {
  return new LazyImport(importFn);
}

// Lazy-loaded command modules
export const lazyCommands = {
  init: () => lazy(() => import('../commands/init.js')),
  build: () => lazy(() => import('../commands/build.js')),
  test: () => lazy(() => import('../commands/test.js')),
  lint: () => lazy(() => import('../commands/lint.js')),
  quality: () => lazy(() => import('../commands/quality.js')),
  status: () => lazy(() => import('../commands/status.js')),
  config: () => lazy(() => import('../commands/config.js')),
  ci: () => lazy(() => import('../commands/ci.js')),
  deploy: () => lazy(() => import('../commands/deploy.js')),
  nudge: () => lazy(() => import('../commands/nudge.js')),
  tui: () => lazy(() => import('../commands/tui.js')),
  debug: () => lazy(() => import('../commands/debug.js'))
};

// Lazy-loaded UI components
export const lazyUI = {
  App: () => lazy(() => import('../ui/App.js')),
  NonInteractive: () => lazy(() => import('../nonInteractive.js'))
};

// Lazy-loaded heavy dependencies (excluding React to avoid type issues)
const lazyDependencies = {
  ink: () => lazy(() => import('ink')),
  commander: () => lazy(() => import('commander')),
  chokidar: () => lazy(() => import('chokidar')),
  handlebars: () => lazy(() => import('handlebars')),
  figlet: () => lazy(() => import('figlet')),
  ora: () => lazy(() => import('ora'))
};

// Export a wrapper function to avoid type issues
export const getLazyDependency = (name: keyof typeof lazyDependencies) => {
  return lazyDependencies[name];
};

// Preload strategy for critical modules
export class ModulePreloader {
  private static preloadQueue: Set<() => Promise<any>> = new Set();
  private static isPreloading: boolean = false;

  static addToPreload(loadFn: () => Promise<any>): void {
    this.preloadQueue.add(loadFn);
  }

  static async preloadCritical(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.size === 0) {
      return;
    }

    this.isPreloading = true;

    try {
      // Preload modules in parallel
      const preloadPromises = Array.from(this.preloadQueue).map(async (loadFn) => {
        try {
          await loadFn();
        } catch (error) {
          console.warn('Failed to preload module:', error);
        }
      });

      await Promise.allSettled(preloadPromises);
      this.preloadQueue.clear();
    } finally {
      this.isPreloading = false;
    }
  }

  static getPreloadStatus(): { isPreloading: boolean; queueSize: number } {
    return {
      isPreloading: this.isPreloading,
      queueSize: this.preloadQueue.size
    };
  }
}

// Conditional loading based on command
export class ConditionalLoader {
  private static loadedModules: Map<string, any> = new Map();

  static async loadCommand(commandName: string): Promise<any> {
    if (this.loadedModules.has(commandName)) {
      return this.loadedModules.get(commandName);
    }

    const commandLoader = lazyCommands[commandName as keyof typeof lazyCommands];
    if (!commandLoader) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    const module = await commandLoader().load();
    this.loadedModules.set(commandName, module);
    return module;
  }

  static async loadUI(uiName: string): Promise<any> {
    if (this.loadedModules.has(uiName)) {
      return this.loadedModules.get(uiName);
    }

    const uiLoader = lazyUI[uiName as keyof typeof lazyUI];
    if (!uiLoader) {
      throw new Error(`Unknown UI component: ${uiName}`);
    }

    const module = await uiLoader().load();
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