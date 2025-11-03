/**
 * ♫ Storage Manager for @dcversus/prp
 *
 * Manages the .prp/ directory with persistent storage, state management,
 * and data persistence across all system components.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import type { setTimeout } from 'timers';

type Timeout = ReturnType<typeof setTimeout>;
import {
  PersistentState,
  StorageConfig,
  WorktreeState,
  AgentState,
  PRPState,
  SignalState,
  TokenState,
  NoteState,
  SystemMetrics,
  UserPreferences,
  StorageStats,
  BackupMetadata,
  KeychainData
} from './types';
import {
  createLayerLogger,
  FileUtils,
  TimeUtils,
  HashUtils
} from '../shared';

const logger = createLayerLogger('shared');

/**
 * ♫ Storage Manager - The orchestra's memory keeper
 */
export class StorageManager {
  private config: StorageConfig;
  private state: PersistentState;
  private statePath: string;
  private keychainPath: string;
  private isInitialized: boolean = false;
  private saveTimer?: Timeout;
  private autoSave: boolean = true;

  constructor(config?: Partial<StorageConfig>) {
    this.config = this.createConfig(config);
    this.statePath = this.config.persistFile;
    this.keychainPath = this.config.keychainFile;
    this.state = this.createInitialState();
  }

  /**
   * Create storage configuration
   */
  private createConfig(overrides?: Partial<StorageConfig>): StorageConfig {
    const defaultConfig: StorageConfig = {
      dataDir: '.prp',
      cacheDir: '/tmp/prp-cache',
      worktreesDir: '/tmp/prp-worktrees',
      notesDir: '.prp/notes',
      logsDir: '/tmp/prp-logs',
      keychainFile: '.prp/keychain.json',
      persistFile: '.prp/state.json',
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    return { ...defaultConfig, ...overrides };
  }

  /**
   * Create initial state
   */
  private createInitialState(): PersistentState {
    return {
      version: '1.0.0',
      createdAt: TimeUtils.now(),
      lastModified: TimeUtils.now(),
      worktrees: {},
      agents: {},
      prps: {},
      signals: {},
      tokens: {
        accounting: {
          totalUsed: 0,
          totalCost: 0,
          totalOperations: 0,
          byAgent: {},
          byLayer: {},
          byModel: {},
          byTime: [],
          lastUpdated: TimeUtils.now()
        },
        limits: {
          enabled: true,
          agentLimits: {},
          globalLimits: {
            daily: 1000000,
            weekly: 5000000,
            monthly: 15000000
          },
          alertThresholds: {
            warning: 80,
            critical: 95
          }
        },
        alerts: [],
        reports: []
      },
      guidelines: {
        enabled: [],
        disabled: [],
        configurations: {},
        executionHistory: [],
        activeExecutions: {}
      },
      notes: {},
      metrics: {
        uptime: 0,
        scans: {
          total: 0,
          successful: 0,
          failed: 0,
          averageDuration: 0
        },
        agents: {
          total: 0,
          active: 0,
          busy: 0,
          error: 0
        },
        prps: {
          total: 0,
          active: 0,
          completed: 0,
          blocked: 0
        },
        signals: {
          total: 0,
          resolved: 0,
          pending: 0,
          averageResolutionTime: 0
        },
        performance: {
          memoryUsage: 0,
          diskUsage: 0,
          cpuUsage: 0
        },
        errors: {
          total: 0,
          byType: {},
          recent: []
        }
      },
      userPreferences: {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          enabled: true,
          types: ['error', 'warning', 'completion'],
          quietHours: {
            start: '22:00',
            end: '08:00'
          }
        },
        ui: {
          showLineNumbers: true,
          wordWrap: true,
          fontSize: 14,
          fontFamily: 'monospace'
        },
        features: {
          autoSave: true,
          autoScan: true,
          tokenAlerts: true,
          performanceMonitoring: true
        },
        privacy: {
          analytics: false,
          crashReports: true,
          dataRetention: 90
        }
      }
    };
  }

  /**
   * Initialize storage system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('StorageManager', 'Storage already initialized');
      return;
    }

    try {
      logger.info('StorageManager', 'Initializing storage system');

      // Create directory structure
      await this.createDirectoryStructure();

      // Load existing state if available
      await this.loadState();

      // Load keychain
      await this.loadKeychain();

      // Setup auto-save
      this.setupAutoSave();

      // Cleanup old data
      await this.performCleanup();

      this.isInitialized = true;
      logger.info('StorageManager', 'Storage system initialized successfully');

    } catch (error) {
      logger.error('StorageManager', 'Failed to initialize storage', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create directory structure
   */
  private async createDirectoryStructure(): Promise<void> {
    const directories = [
      this.config.dataDir,
      this.config.cacheDir,
      this.config.worktreesDir,
      this.config.notesDir,
      this.config.logsDir,
      join(this.config.dataDir, 'backups'),
      join(this.config.dataDir, 'temp'),
      join(this.config.cacheDir, 'signals'),
      join(this.config.cacheDir, 'prps'),
      join(this.config.cacheDir, 'worktrees')
    ];

    for (const dir of directories) {
      await FileUtils.ensureDir(dir);
    }

    logger.debug('StorageManager', 'Directory structure created');
  }

  /**
   * Load persistent state
   */
  private async loadState(): Promise<void> {
    try {
      const exists = await FileUtils.pathExists(this.statePath);
      if (!exists) {
        logger.info('StorageManager', 'No existing state found, starting fresh');
        return;
      }

      const content = await FileUtils.readTextFile(this.statePath);
      const loadedState = JSON.parse(content) as PersistentState;

      // Validate state
      if (!this.validateState(loadedState)) {
        throw new Error('Invalid state format');
      }

      // Merge with current state to handle new fields
      this.state = this.mergeStates(this.state, loadedState);

      logger.info('StorageManager', `State loaded successfully: v${loadedState.version}, ${Object.keys(loadedState.worktrees).length} worktrees, ${Object.keys(loadedState.agents).length} agents, ${Object.keys(loadedState.prps).length} PRPs`);

    } catch (error) {
      logger.error('StorageManager', 'Failed to load state', error instanceof Error ? error : new Error(String(error)));
      // Continue with fresh state
    }
  }

  /**
   * Load keychain
   */
  private async loadKeychain(): Promise<void> {
    try {
      const exists = await FileUtils.pathExists(this.keychainPath);
      if (!exists) {
        logger.info('StorageManager', 'No existing keychain found');
        return;
      }

      const content = await FileUtils.readTextFile(this.keychainPath);
      const keychainData = JSON.parse(content) as KeychainData;

      // TODO: Handle keychain decryption if needed
      logger.info('StorageManager', `Keychain loaded successfully: ${keychainData.entries.length} entries, encrypted: ${keychainData.encrypted}`);

    } catch (error) {
      logger.error('StorageManager', 'Failed to load keychain', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate state structure
   */
  private validateState(state: unknown): state is PersistentState {
    try {
      if (!state || typeof state !== 'object' || state === null) {
        return false;
      }

      const s = state as Record<string, unknown>;
      return (
        typeof s['version'] === 'string' &&
        typeof s['worktrees'] === 'object' &&
        typeof s['agents'] === 'object' &&
        typeof s['prps'] === 'object' &&
        typeof s['signals'] === 'object' &&
        typeof s['tokens'] === 'object' &&
        typeof s['guidelines'] === 'object' &&
        typeof s['notes'] === 'object' &&
        typeof s['metrics'] === 'object' &&
        typeof s['userPreferences'] === 'object'
      );
    } catch {
      return false;
    }
  }

  /**
   * Merge states (current with loaded)
   */
  private mergeStates(current: PersistentState, loaded: PersistentState): PersistentState {
    return {
      ...current,
      ...loaded,
      // Preserve current version if newer
      version: loaded.version,
      // Merge nested objects
      worktrees: { ...current.worktrees, ...loaded.worktrees },
      agents: { ...current.agents, ...loaded.agents },
      prps: { ...current.prps, ...loaded.prps },
      signals: { ...current.signals, ...loaded.signals },
      userPreferences: { ...current.userPreferences, ...loaded.userPreferences },
      // Keep loaded timestamps
      createdAt: loaded.createdAt,
      lastModified: loaded.lastModified
    };
  }

  /**
   * Setup auto-save mechanism
   */
  private setupAutoSave(): void {
    if (!this.autoSave) return;

    this.saveTimer = setInterval(() => {
      this.save().catch(error => {
        logger.error('StorageManager', 'Auto-save failed', error);
      });
    }, 60000); // Save every minute

    logger.debug('StorageManager', 'Auto-save configured');
  }

  /**
   * Save persistent state
   */
  async save(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('StorageManager', 'Storage not initialized');
      return;
    }

    try {
      this.state.lastModified = TimeUtils.now();

      const content = JSON.stringify(this.state, null, 2);
      await FileUtils.writeTextFile(this.statePath, content);

      logger.debug('StorageManager', 'State saved successfully');

    } catch (error) {
      logger.error('StorageManager', 'Failed to save state', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Worktree management
   */
  async saveWorktree(worktree: WorktreeState): Promise<void> {
    this.state.worktrees[worktree.id] = worktree;
    await this.save();
  }

  getWorktree(id: string): WorktreeState | undefined {
    return this.state.worktrees[id];
  }

  getAllWorktrees(): WorktreeState[] {
    return Object.values(this.state.worktrees);
  }

  deleteWorktree(id: string): boolean {
    if (this.state.worktrees[id]) {
      delete this.state.worktrees[id];
      return true;
    }
    return false;
  }

  /**
   * Agent management
   */
  async saveAgent(agent: AgentState): Promise<void> {
    this.state.agents[agent.id] = agent;
    await this.save();
  }

  getAgent(id: string): AgentState | undefined {
    return this.state.agents[id];
  }

  getAllAgents(): AgentState[] {
    return Object.values(this.state.agents);
  }

  deleteAgent(id: string): boolean {
    if (this.state.agents[id]) {
      delete this.state.agents[id];
      return true;
    }
    return false;
  }

  /**
   * PRP management
   */
  async savePRP(prp: PRPState): Promise<void> {
    this.state.prps[prp.id] = prp;
    await this.save();
  }

  getPRP(id: string): PRPState | undefined {
    return this.state.prps[id];
  }

  getAllPRPs(): PRPState[] {
    return Object.values(this.state.prps);
  }

  deletePRP(id: string): boolean {
    if (this.state.prps[id]) {
      delete this.state.prps[id];
      return true;
    }
    return false;
  }

  /**
   * Signal management
   */
  async saveSignal(signal: SignalState): Promise<void> {
    this.state.signals[signal.id] = signal;
    await this.save();
  }

  getSignal(id: string): SignalState | undefined {
    return this.state.signals[id];
  }

  getAllSignals(): SignalState[] {
    return Object.values(this.state.signals);
  }

  getSignalsByPriority(minPriority: number): SignalState[] {
    return Object.values(this.state.signals).filter(s => s.priority >= minPriority);
  }

  deleteSignal(id: string): boolean {
    if (this.state.signals[id]) {
      delete this.state.signals[id];
      return true;
    }
    return false;
  }

  /**
   * Token management
   */
  async updateTokenUsage(agentId: string, tokens: number, cost: number, layer: string, model: string): Promise<void> {
    const accounting = this.state.tokens.accounting;

    // Update totals
    accounting.totalUsed += tokens;
    accounting.totalCost += cost;
    accounting.totalOperations += 1;
    accounting.lastUpdated = TimeUtils.now();

    // Update by agent
    if (!accounting.byAgent[agentId]) {
      accounting.byAgent[agentId] = {
        agentId,
        tokens: 0,
        cost: 0,
        operations: 0,
        lastUsed: TimeUtils.now(),
        dailyUsage: 0,
        weeklyUsage: 0,
        monthlyUsage: 0
      };
    }
    const agentUsage = accounting.byAgent[agentId];
    agentUsage.tokens += tokens;
    agentUsage.cost += cost;
    agentUsage.operations += 1;
    agentUsage.lastUsed = TimeUtils.now();

    // Update by layer
    if (!accounting.byLayer[layer]) {
      accounting.byLayer[layer] = {
        layer,
        tokens: 0,
        cost: 0,
        operations: 0,
        lastUsed: TimeUtils.now()
      };
    }
    const layerUsage = accounting.byLayer[layer];
    layerUsage.tokens += tokens;
    layerUsage.cost += cost;
    layerUsage.operations += 1;
    layerUsage.lastUsed = TimeUtils.now();

    // Update by model
    if (!accounting.byModel[model]) {
      accounting.byModel[model] = {
        model,
        tokens: 0,
        cost: 0,
        operations: 0,
        lastUsed: TimeUtils.now()
      };
    }
    const modelUsage = accounting.byModel[model];
    modelUsage.tokens += tokens;
    modelUsage.cost += cost;
    modelUsage.operations += 1;
    modelUsage.lastUsed = TimeUtils.now();

    // Add time series data
    accounting.byTime.push({
      timestamp: TimeUtils.now(),
      tokens,
      cost,
      operations: 1
    });

    // Trim time series data (keep last 1000 entries)
    if (accounting.byTime.length > 1000) {
      accounting.byTime = accounting.byTime.slice(-1000);
    }

    await this.save();
  }

  getTokenState(): TokenState {
    return this.state.tokens;
  }

  /**
   * Note management
   */
  async saveNote(note: NoteState): Promise<void> {
    this.state.notes[note.id] = note;
    await this.save();
  }

  getNote(id: string): NoteState | undefined {
    return this.state.notes[id];
  }

  getAllNotes(): NoteState[] {
    return Object.values(this.state.notes);
  }

  getNotesByPattern(pattern: string): NoteState[] {
    return Object.values(this.state.notes).filter(note =>
      note.pattern === pattern || note.name.includes(pattern)
    );
  }

  deleteNote(id: string): boolean {
    if (this.state.notes[id]) {
      delete this.state.notes[id];
      return true;
    }
    return false;
  }

  /**
   * Metrics management
   */
  updateMetrics(updates: Partial<SystemMetrics>): void {
    this.state.metrics = { ...this.state.metrics, ...updates };
  }

  getMetrics(): SystemMetrics {
    return this.state.metrics;
  }

  /**
   * User preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    this.state.userPreferences = { ...this.state.userPreferences, ...preferences };
    await this.save();
  }

  getUserPreferences(): UserPreferences {
    return this.state.userPreferences;
  }

  /**
   * Storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalSize: 0,
      fileCount: 0,
      directoryCount: 0,
      lastModified: new Date(0),
      byType: {}
    };

    try {
      await this.calculateDirectoryStats(this.config.dataDir, stats);
    } catch (error) {
      logger.warn('StorageManager', 'Failed to calculate storage stats', { error: error instanceof Error ? error.message : String(error) });
    }

    return stats;
  }

  /**
   * Calculate directory statistics recursively
   */
  private async calculateDirectoryStats(dirPath: string, stats: StorageStats): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          stats.directoryCount++;
          await this.calculateDirectoryStats(fullPath, stats);
        } else {
          const fileStats = await fs.stat(fullPath);
          const ext = FileUtils.getFileExtension(entry.name);
          const type = ext || 'unknown';

          stats.fileCount++;
          stats.totalSize += fileStats.size;

          if (fileStats.mtime > stats.lastModified) {
            stats.lastModified = fileStats.mtime;
          }

          if (!stats.byType[type]) {
            stats.byType[type] = { count: 0, size: 0 };
          }
          stats.byType[type].count++;
          stats.byType[type].size += fileStats.size;
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  /**
   * Backup management
   */
  async createBackup(description?: string): Promise<string> {
    const backupId = HashUtils.generateId();
    const backupPath = join(this.config.dataDir, 'backups', `backup-${backupId}.json`);

    const backup: {
      state: PersistentState;
      metadata: BackupMetadata;
    } = {
      state: this.state,
      metadata: {
        id: backupId,
        createdAt: TimeUtils.now(),
        version: this.state.version,
        description,
        includes: ['state', 'keychain'],
        size: 0,
        compressed: false,
        encrypted: false,
        checksum: ''
      }
    };

    const content = JSON.stringify(backup, null, 2);
    backup.metadata.size = Buffer.byteLength(content, 'utf8');
    backup.metadata.checksum = createHash('sha256').update(content).digest('hex');

    await FileUtils.writeTextFile(backupPath, content);

    logger.info('StorageManager', `Backup created: ${backupId} (${backup.metadata.size} bytes) -> ${backupPath}`);

    return backupId;
  }

  async restoreBackup(backupId: string): Promise<void> {
    const backupPath = join(this.config.dataDir, 'backups', `backup-${backupId}.json`);

    try {
      const content = await FileUtils.readTextFile(backupPath);
      const backup = JSON.parse(content);

      // Verify checksum
      const calculatedChecksum = createHash('sha256').update(JSON.stringify(backup.state)).digest('hex');
      if (calculatedChecksum !== backup.metadata.checksum) {
        throw new Error('Backup checksum verification failed');
      }

      // Restore state
      this.state = backup.state;
      await this.save();

      logger.info('StorageManager', `Backup restored: ${backupId} (v${backup.metadata.version} from ${backup.metadata.createdAt})`);

    } catch (error) {
      logger.error('StorageManager', 'Failed to restore backup', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Cleanup old data
   */
  private async performCleanup(): Promise<void> {
    const cutoffDate = TimeUtils.daysAgo(this.config.retentionPeriod);

    try {
      // Clean old signals
      let signalsCleaned = 0;
      for (const [id, signal] of Object.entries(this.state.signals)) {
        if (new Date(signal.timestamp) < cutoffDate && signal.metadata.resolved) {
          delete this.state.signals[id];
          signalsCleaned++;
        }
      }

      // Clean old time series data
      const originalLength = this.state.tokens.accounting.byTime.length;
      this.state.tokens.accounting.byTime = this.state.tokens.accounting.byTime.filter(
        entry => new Date(entry.timestamp) > cutoffDate
      );
      const timeSeriesCleaned = originalLength - this.state.tokens.accounting.byTime.length;

      // Clean old error entries
      const originalErrors = this.state.metrics.errors.recent.length;
      this.state.metrics.errors.recent = this.state.metrics.errors.recent.filter(
        error => new Date(error.timestamp) > cutoffDate
      );
      const errorsCleaned = originalErrors - this.state.metrics.errors.recent.length;

      await this.save();

      logger.info('StorageManager', `Cleanup completed: ${signalsCleaned} signals, ${timeSeriesCleaned} time series, ${errorsCleaned} errors (cutoff: ${cutoffDate.toISOString()})`);

    } catch (error) {
      logger.error('StorageManager', 'Cleanup failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Get full state
   */
  getState(): PersistentState {
    return { ...this.state };
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown storage manager
   */
  async shutdown(): Promise<void> {
    logger.info('StorageManager', 'Shutting down storage manager');

    // Clear auto-save timer
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    // Final save
    await this.save();

    this.isInitialized = false;
    logger.info('StorageManager', 'Storage manager shutdown complete');
  }
}

// Global storage manager instance
export const storageManager = new StorageManager();

/**
 * Initialize storage system
 */
export async function initializeStorage(_config?: Partial<StorageConfig>): Promise<StorageManager> {
  await storageManager.initialize();
  return storageManager;
}