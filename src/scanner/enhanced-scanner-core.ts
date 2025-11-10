/**
 * ♫ Enhanced Tuner Core - Scanner Singleton with State Management
 *
 * High-performance Tuner (scanner) with singleton pattern, comprehensive state management,
 * and real-time event streaming for monitoring all PRPs and worktrees.
 */

import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'chokidar';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import {
  ScannerConfig,
  WorktreeStatus,
  TokenUsage,
  ScanEvent,
  ScannerState,
  ScannerMetrics
} from './types';
import { TokenAccountingManager } from './token-accounting';
import { EventBus } from '../shared/events';
import { createLayerLogger, TimeUtils } from '../shared';

const logger = createLayerLogger('scanner');

/**
 * Enhanced Tuner Core (Scanner) with singleton pattern and comprehensive state management
 */
export class EnhancedScannerCore extends EventEmitter {
  private static instance: EnhancedScannerCore | null = null;
  private static readonly _singletonLock = Symbol('tuner-lock');

  // Core state
  private state: ScannerState;
  private config: ScannerConfig;
  private eventBus: EventBus;
  private isInitialized = false;
  private isScanning = false;

  // Component instances
  private tokenAccounting: TokenAccountingManager;
  private fileWatcher: FSWatcher | null = null;
  private scanTimer: NodeJS.Timeout | null = null;

  // Performance and monitoring
  private performanceMetrics: ScannerMetrics;
  private _lastScanTime = 0;
  private _scanQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  // Debouncing and throttling
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly defaultDebounceMs = 500;

  private constructor(config: ScannerConfig, eventBus: EventBus) {
    super();
    this.config = config;
    this.eventBus = eventBus;

    // Initialize state
    this.state = {
      status: 'idle',
      config,
      monitors: new Map(),
      metrics: this.createInitialMetrics(),
      alerts: []
    };

    // Initialize performance metrics
    this.performanceMetrics = this.createInitialMetrics();

    // Initialize token accounting
    this.tokenAccounting = new TokenAccountingManager(
      config,
      '.prp/token-accounting.json'
    );

    // Setup token usage event handlers
    this.setupTokenAccountingHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ScannerConfig, eventBus?: EventBus): EnhancedScannerCore {
    if (!EnhancedScannerCore.instance) {
      if (!config || !eventBus) {
        throw new Error('Config and EventBus required for first initialization');
      }
      EnhancedScannerCore.instance = new EnhancedScannerCore(config, eventBus);
    }
    return EnhancedScannerCore.instance;
  }

  /**
   * Initialize the scanner
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Tuner', 'Tuner already initialized');
      return;
    }

    try {
      logger.info('Tuner', 'Initializing enhanced tuner...');

      // Discover and monitor worktrees
      await this.discoverWorktrees();

      // Start file system monitoring with debouncing
      this.startFileSystemMonitoring();

      // Start periodic scanning
      this.startPeriodicScanning();

      // Initialize token accounting data
      await this.loadTokenAccountingData();

      this.isInitialized = true;
      this.state.status = 'idle';

      // Emit initialization event
      this.emitScannerEvent({
        type: 'system_event',
        timestamp: new Date(),
        source: 'scanner',
        data: {
          type: 'scanner_initialized',
          worktreeCount: this.state.monitors.size,
          config: this.config
        },
        priority: 'medium'
      });

      logger.info('Tuner', `♪ Tuner initialized successfully. Monitoring ${this.state.monitors.size} worktrees`);

    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };

      logger.error('Tuner', 'Failed to initialize tuner', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Start scanning operations
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isScanning) {
      logger.warn('Tuner', 'Tuner already running');
      return;
    }

    this.isScanning = true;
    this.state.status = 'scanning';

    logger.info('Tuner', '♪ Starting tuner operations...');

    // Perform initial scan
    await this.performComprehensiveScan();

    // Emit start event
    this.emitScannerEvent({
      type: 'system_event',
      timestamp: new Date(),
      source: 'scanner',
      data: {
        type: 'scanner_started',
        timestamp: new Date()
      },
      priority: 'medium'
    });
  }

  /**
   * Stop scanning operations
   */
  async stop(): Promise<void> {
    logger.info('Tuner', '🛑 Stopping tuner operations...');

    this.isScanning = false;
    this.state.status = 'paused';

    // Clear timers
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Stop file watching
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }

    // Persist token accounting data
    await this.tokenAccounting.cleanup();

    // Emit stop event
    this.emitScannerEvent({
      type: 'system_event',
      timestamp: new Date(),
      source: 'scanner',
      data: {
        type: 'scanner_stopped',
        timestamp: new Date(),
        metrics: this.performanceMetrics
      },
      priority: 'medium'
    });

    logger.info('Tuner', '✅ Tuner stopped successfully');
  }

  /**
   * Get current scanner state
   */
  getState(): ScannerState {
    return {
      ...this.state,
      metrics: { ...this.performanceMetrics }
    };
  }

  /**
   * Get worktree status
   */
  getWorktreeStatus(worktreeName: string): WorktreeStatus | null {
    const monitor = this.state.monitors.get(worktreeName);
    return monitor ? this.convertMonitorToStatus(monitor) : null;
  }

  /**
   * Get all worktree statuses
   */
  getAllWorktreeStatuses(): WorktreeStatus[] {
    return Array.from(this.state.monitors.values())
      .map(monitor => this.convertMonitorToStatus(monitor));
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): Map<string, TokenUsage> {
    const usageMap = new Map<string, TokenUsage>();

    // Get token usage from accounting manager
    const statistics = this.tokenAccounting.getStatistics();

    // Convert to TokenUsage format
    usageMap.set('system', {
      agentId: 'system',
      agentType: 'scanner',
      operation: 'system-scan',
      inputTokens: Math.floor(statistics.totalTokens * 0.6), // Estimate input
      outputTokens: Math.floor(statistics.totalTokens * 0.4), // Estimate output
      totalTokens: statistics.totalTokens,
      cost: 0, // System operations don't have cost
      timestamp: TimeUtils.daysAgo(1)
    });

    return usageMap;
  }

  /**
   * Record token usage
   */
  recordTokenUsage(
    agentId: string,
    agentType: string,
    operation: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.tokenAccounting.recordUsage(
      agentId,
      agentType,
      operation,
      model,
      inputTokens,
      outputTokens,
      'scanner',
      metadata
    );
  }

  /**
   * Get scanner metrics
   */
  getMetrics(): ScannerMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Discover existing worktrees
   */
  private async discoverWorktrees(): Promise<void> {
    try {
      const result = execSync('git worktree list', {
        cwd: process.cwd(),
        encoding: 'utf8'
      });

      const lines = result.trim().split('\n');

      for (const line of lines) {
        const match = line.match(/^(.+?)\s+([a-f0-9]+)\s*\[(.+?)\]$/);
        if (match) {
          const [, path, commit, branch] = match;
          const name = this.extractWorktreeName(path ?? '');

          await this.addWorktreeMonitor(name, path ?? '', commit ?? '', branch ?? '');
        }
      }

      this.performanceMetrics.worktrees.active = this.state.monitors.size;

    } catch (error) {
      logger.warn('Tuner', 'Could not discover worktrees', { error });
    }
  }

  /**
   * Add worktree monitor
   */
  private async addWorktreeMonitor(
    name: string,
    path: string,
    commit: string,
    branch: string
  ): Promise<void> {
    const monitorId = HashUtils.generateId();

    const monitor = {
      id: monitorId,
      name,
      path: resolve(path),
      branch,
      commit,
      status: 'active' as const,
      lastScan: new Date(),
      scanInterval: this.config.scanInterval,
      metrics: {
        totalScans: 0,
        totalChanges: 0,
        averageScanTime: 0,
        errorCount: 0
      }
    };

    this.state.monitors.set(name, monitor);

    // Scan for PRP files
    await this.scanWorktreeForPRPs(monitor);

    logger.debug('Tuner', 'Worktree monitor added', { name, path });
  }

  /**
   * Start file system monitoring with debouncing
   */
  private startFileSystemMonitoring(): void {
    const watchPaths = [
      process.cwd(), // Main repo
      ...Array.from(this.state.monitors.values()).map(m => m.path)
    ];

    this.fileWatcher = watch(watchPaths, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**'
      ],
      persistent: true,
      ignoreInitial: true,
      usePolling: false,
      interval: 100
    });

    this.fileWatcher.on('change', (path) => {
      this.debounceFileChange(path, 'modified');
    });

    this.fileWatcher.on('add', (path) => {
      this.debounceFileChange(path, 'added');
    });

    this.fileWatcher.on('unlink', (path) => {
      this.debounceFileChange(path, 'deleted');
    });

    logger.info('Tuner', 'File system monitoring started', {
      watchPaths: watchPaths.length,
      debounceMs: this.defaultDebounceMs
    });
  }

  /**
   * Debounce file changes to prevent excessive processing
   */
  private debounceFileChange(filePath: string, changeType: 'added' | 'modified' | 'deleted'): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      await this.handleFileChange(filePath, changeType);
    }, this.defaultDebounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Handle file changes
   */
  private async handleFileChange(filePath: string, changeType: 'added' | 'modified' | 'deleted'): Promise<void> {
    try {
      const worktree = this.findWorktreeForFile(filePath);
      if (!worktree) {
        return;
      }

      const relativePath = filePath.replace(worktree.path + '/', '');

      // Create file change object
      const fileChange: FileChange = {
        path: relativePath,
        hash: this.calculateFileHash(filePath),
        size: this.getFileSize(filePath),
        lastModified: new Date(),
        changeType,
        estimatedTokens: this.estimateFileTokens(relativePath)
      };

      // Update worktree monitor
      worktree.metrics.totalChanges++;
      worktree.lastScan = new Date();

      // Emit file change event
      this.emitScannerEvent({
        type: 'worktree_change',
        timestamp: new Date(),
        source: worktree.name,
        data: { fileChange, isPRP: this.isPRPFile(relativePath) },
        priority: 'medium'
      });

      // If PRP file, trigger signal detection
      if (this.isPRPFile(relativePath)) {
        await this.detectSignalsInPRP(worktree, relativePath);
      }

    } catch (error) {
      logger.error('Tuner', 'Error handling file change', error instanceof Error ? error : new Error(String(error)), {
        filePath,
        changeType
      });
    }
  }

  /**
   * Start periodic scanning
   */
  private startPeriodicScanning(): void {
    this.scanTimer = setInterval(async () => {
      if (this.isScanning && !this.isProcessingQueue) {
        await this.performComprehensiveScan();
      }
    }, this.config.scanInterval);
  }

  /**
   * Perform comprehensive scan of all worktrees
   */
  private async performComprehensiveScan(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    const scanId = HashUtils.generateId();
    const startTime = Date.now();

    try {
      this.state.currentScan = scanId;
      this.state.status = 'scanning';

      logger.debug('Tuner', 'Starting comprehensive scan', { scanId });

      // Update git status for all worktrees
      for (const [name, worktree] of this.state.monitors.entries()) {
        await this.updateWorktreeGitStatus(worktree);
      }

      // Check token limits
      await this.checkTokenLimits();

      // Update metrics
      const scanDuration = Date.now() - startTime;
      this.updateScanMetrics(scanDuration);

      // Emit scan completed event
      this.emitScannerEvent({
        type: 'system_event',
        timestamp: new Date(),
        source: 'scanner',
        data: {
          type: 'scan_completed',
          scanId,
          duration: scanDuration,
          worktreesScanned: this.state.monitors.size,
          metrics: this.performanceMetrics
        },
        priority: 'low'
      });

    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };

      logger.error('Tuner', 'Error during comprehensive scan', error instanceof Error ? error : new Error(String(error)));

    } finally {
      this.isProcessingQueue = false;
      this.state.currentScan = undefined;
      this.state.status = this.isScanning ? 'idle' : 'paused';
    }
  }

  /**
   * Emit scanner event
   */
  private emitScannerEvent(event: ScanEvent): void {
    this.performanceMetrics.totalScans++;
    this.emit('scanner:event', event);

    // Also publish to event bus
    this.eventBus.publishToChannel('scanner', {
      id: HashUtils.generateId(),
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      data: event.data,
      metadata: { priority: event.priority }
    });
  }

  /**
   * Setup token accounting event handlers
   */
  private setupTokenAccountingHandlers(): void {
    this.tokenAccounting.onTokenUsage((data) => {
      this.emitScannerEvent({
        type: 'system_event',
        timestamp: new Date(),
        source: 'scanner',
        data: {
          type: 'token_usage',
          agentId: data.agentId,
          tokensUsed: data.tokensUsed,
          cost: data.cost,
          operation: data.operation
        },
        priority: 'low'
      });
    });
  }

  /**
   * Load persisted token accounting data
   */
  private async loadTokenAccountingData(): Promise<void> {
    // Token accounting manager handles this in constructor
    logger.debug('Tuner', 'Token accounting data loaded');
  }

  /**
   * Create initial metrics
   */
  private createInitialMetrics(): ScannerMetrics {
    return {
      startTime: new Date(),
      totalScans: 0,
      totalChanges: 0,
      totalPRPUpdates: 0,
      totalSignalsDetected: 0,
      averageScanTime: 0,
      memoryUsage: {
        current: 0,
        peak: 0,
        average: 0
      },
      performance: {
        fastestScan: Infinity,
        slowestScan: 0,
        errorRate: 0
      },
      worktrees: {
        active: 0,
        inactive: 0,
        error: 0
      }
    };
  }

  // Helper methods
  private extractWorktreeName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] ?? path;
  }

  private findWorktreeForFile(filePath: string): any {
    for (const worktree of this.state.monitors.values()) {
      if (filePath.startsWith(worktree.path)) {
        return worktree;
      }
    }
    return null;
  }

  private calculateFileHash(filePath: string): string {
    // Simple hash implementation - would use crypto in production
    return HashUtils.generateId();
  }

  private getFileSize(filePath: string): number {
    try {
      return existsSync(filePath) ? statSync(filePath).size : 0;
    } catch {
      return 0;
    }
  }

  private estimateFileTokens(filePath: string): number {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const multipliers: Record<string, number> = {
      'md': 1.3,
      'js': 1.2,
      'ts': 1.3,
      'json': 0.8,
      'yml': 0.9,
      'yaml': 0.9,
      'txt': 1.0
    };
    const multiplier = multipliers[extension ?? ''] ?? 1.0;
    return Math.ceil(1000 * multiplier);
  }

  private isPRPFile(filePath: string): boolean {
    return filePath.includes('PRPs/') && filePath.endsWith('.md');
  }

  private async scanWorktreeForPRPs(monitor: any): Promise<void> {
    // Placeholder for PRP scanning implementation
    logger.debug('Tuner', 'Scanning worktree for PRPs', { worktree: monitor.name });
  }

  private async detectSignalsInPRP(worktree: any, filePath: string): Promise<void> {
    // Placeholder for signal detection implementation
    logger.debug('Tuner', 'Detecting signals in PRP', { worktree: worktree.name, filePath });
  }

  private async updateWorktreeGitStatus(worktree: any): Promise<void> {
    // Placeholder for git status update implementation
    worktree.metrics.totalScans++;
    worktree.lastScan = new Date();
  }

  private async checkTokenLimits(): Promise<void> {
    // Placeholder for token limit checking
    const activeAlerts = this.tokenAccounting.getActiveAlerts();
    if (activeAlerts.length > 0) {
      logger.warn('Tuner', 'Active token alerts', { count: activeAlerts.length });
    }
  }

  private updateScanMetrics(duration: number): void {
    this.performanceMetrics.totalScans++;
    this.performanceMetrics.averageScanTime =
      (this.performanceMetrics.averageScanTime * (this.performanceMetrics.totalScans - 1) + duration) /
      this.performanceMetrics.totalScans;
    this.performanceMetrics.performance.fastestScan = Math.min(this.performanceMetrics.performance.fastestScan, duration);
    this.performanceMetrics.performance.slowestScan = Math.max(this.performanceMetrics.performance.slowestScan, duration);
  }

  private convertMonitorToStatus(monitor: any): WorktreeStatus {
    return {
      name: monitor.name,
      path: monitor.path,
      lastModified: monitor.lastScan,
      branch: monitor.branch,
      commit: monitor.commit,
      status: 'clean', // Would be determined by git status
      fileChanges: [],
      prpFiles: [],
      signals: [],
      tokenUsage: {
        agentId: monitor.name,
        agentType: 'worktree',
        totalTokens: 0,
        requestCount: 0,
        lastReset: new Date()
      }
    };
  }
}