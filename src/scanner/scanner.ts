/**
 * ♫ High-Performance Scanner for @dcversus/prp
 *
 * Handles hundreds of worktrees and thousands of changes with efficient
 * token counting, git monitoring, and PRP parsing capabilities.
 */

import { EventEmitter } from 'events';
import { watch } from 'chokidar';
import {
  ScannerConfig,
  ScanResult,
  WorktreeMonitor,
  FileWatcher,
  PRPParser,
  ScannerState,
  ScannerStartedEvent,
  ScannerCompletedEvent,
  ScannerErrorEvent,
  FileChangeEvent,
  TokenAlertEvent,
  FileWatcherChangeEvent,
  PRPScanResult,
  WatcherInstance
} from './types';
import {
  TokenAccountingManager
} from './token-accounting';
import {
  FileChange,
  Signal,
  EventBus,
  createLayerLogger,
  PerformanceMonitor,
  TimeUtils,
  FileUtils,
  GitUtils,
  SignalParser,
  HashUtils
} from '../shared';
import { join, basename } from 'path';

const logger = createLayerLogger('scanner');

/**
 * ♫ Main Scanner - The conductor's eyes and ears
 */
export class Scanner extends EventEmitter {
  private state: ScannerState;
  private tokenAccounting: TokenAccountingManager;
  private worktreeMonitors: Map<string, WorktreeMonitor> = new Map();
  private fileWatchers: Map<string, FileWatcher> = new Map();
  private prpParsers: Map<string, PRPParser> = new Map();
  private scanQueue: Array<{ worktree: string; type: 'full' | 'incremental' }> = [];
  private isScanning: boolean = false;
  private scanTimer?: ReturnType<typeof setTimeout>;

  constructor(config: Partial<ScannerConfig> = {}) {
    super();

    this.state = this.initializeState(config);
    this.tokenAccounting = new TokenAccountingManager(
      this.state.config,
      '.prp/token-accounting.json'
    );
    
    this.setupEventHandlers();
    this.startPeriodicScanning();
  }

  /**
   * Initialize scanner state with configuration
   */
  private initializeState(config: Partial<ScannerConfig>): ScannerState {
    const defaultConfig: ScannerConfig = {
      scanInterval: 30000, // 30 seconds
      maxConcurrentScans: 5,
      batchSize: 50,
      enableGitMonitoring: true,
      enableFileMonitoring: true,
      enablePRPMonitoring: true,
      excludedPaths: [
        'node_modules',
        '.git',
        '.prp',
        'dist',
        'build',
        '.next',
        '.nuxt',
        'coverage',
        '.cache'
      ],
      includedExtensions: ['.md', '.ts', '.js', '.tsx', '.jsx', '.json', '.yml', '.yaml'],
      worktreePaths: [],
      performanceThresholds: {
        maxScanTime: 10000, // 10 seconds
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB
        maxFileCount: 10000
      }
    };

    const finalConfig = { ...defaultConfig, ...config };

    return {
      status: 'idle',
      config: finalConfig,
      monitors: new Map(),
      metrics: {
        startTime: TimeUtils.now(),
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
      },
      alerts: []
    };
  }

  
  /**
   * Setup event handlers for the scanner
   */
  private setupEventHandlers(): void {
    this.on('scanStarted', (event: ScannerStartedEvent) => {
      logger.info('Scanner', `Scan started for ${event.worktree}`, { event });
      EventBus.publishToChannel('scanner', {
        id: HashUtils.generateId(),
        type: 'scanner_scan_started',
        timestamp: TimeUtils.now(),
        source: 'scanner',
        data: event,
        metadata: {}
      });
    });

    this.on('scanCompleted', (event: ScannerCompletedEvent) => {
      logger.info('Scanner', `Scan completed for ${event.result.worktree}`, {
        scanId: event.result.id,
        changes: event.result.changes.length,
        prpUpdates: event.result.prpUpdates.length,
        signals: event.result.signals.length,
        duration: event.result.performance.duration
      });

      this.updateMetrics(event.result);
      EventBus.publishToChannel('scanner', {
        id: HashUtils.generateId(),
        type: 'scanner_scan_completed',
        timestamp: TimeUtils.now(),
        source: 'scanner',
        data: event,
        metadata: {}
      });
    });

    this.on('scanError', (event: ScannerErrorEvent) => {
      logger.error('Scanner', `Scan error in ${event.worktree}: ${event.error instanceof Error ? event.error.message : String(event.error)}`);
      EventBus.publishToChannel('scanner', {
        id: HashUtils.generateId(),
        type: 'scanner_scan_error',
        timestamp: TimeUtils.now(),
        source: 'scanner',
        data: event,
        metadata: {}
      });
    });

    // Handle token accounting alerts
    EventBus.subscribeToChannel('scanner', (event) => {
      if (event.type === 'token_alert') {
        this.emit('tokenAlert', event.data as TokenAlertEvent);
        EventBus.publishToChannel('scanner', {
          id: HashUtils.generateId(),
          type: 'scanner_token_alert',
          timestamp: TimeUtils.now(),
          source: 'scanner',
          data: event.data,
          metadata: {}
        });
      }
    });
  }

  /**
   * Add a worktree to monitor
   */
  async addWorktree(path: string, name?: string): Promise<void> {
    const worktreeName = name || path.split('/').pop() || path;

    if (this.worktreeMonitors.has(worktreeName)) {
      logger.warn('Scanner', `Worktree ${worktreeName} already exists`);
      return;
    }

    try {
      // Validate worktree path
      if (!await FileUtils.pathExists(path)) {
        throw new Error(`Worktree path does not exist: ${path}`);
      }

      // Create monitor
      const monitor: WorktreeMonitor = {
        path,
        name: worktreeName,
        status: 'active',
        scanInterval: this.state.config.scanInterval,
        metrics: {
          totalScans: 0,
          totalChanges: 0,
          averageScanTime: 0,
          errorCount: 0
        }
      };

      this.worktreeMonitors.set(worktreeName, monitor);
      this.state.monitors.set(worktreeName, monitor);

      // Initialize subsystems for this worktree
      await this.initializeWorktreeSubsystems(worktreeName, path);

      // Perform initial scan
      this.queueScan(worktreeName, 'full');

      logger.info('Scanner', `Worktree ${worktreeName} added successfully`, { path });

    } catch (error) {
      logger.error('Scanner', `Failed to add worktree ${worktreeName}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Remove a worktree from monitoring
   */
  async removeWorktree(name: string): Promise<void> {
    const monitor = this.worktreeMonitors.get(name);
    if (!monitor) {
      logger.warn('Scanner', `Worktree ${name} not found`);
      return;
    }

    try {
      // Cleanup subsystems
      await this.cleanupWorktreeSubsystems(name);

      // Remove from monitors
      this.worktreeMonitors.delete(name);
      this.state.monitors.delete(name);

      logger.info('Scanner', `Worktree ${name} removed successfully`);

    } catch (error) {
      logger.error('Scanner', `Failed to remove worktree ${name}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Initialize subsystems for a worktree
   */
  private async initializeWorktreeSubsystems(name: string, path: string): Promise<void> {
    // Initialize file watcher
    if (this.state.config.enableFileMonitoring) {
      await this.initializeFileWatcher(name, path);
    }

    // Initialize PRP parser
    this.prpParsers.set(name, {
      worktreePath: path,
      cache: new Map(),
      maxCacheSize: 1000,
      cacheTimeout: 60000, // 1 minute
      parseErrors: []
    });
  }

  /**
   * Initialize file watcher for a worktree
   */
  private async initializeFileWatcher(name: string, path: string): Promise<void> {
    const watcher = watch(path, {
      ignored: this.state.config.excludedPaths,
      persistent: true,
      ignoreInitial: true,
      depth: 10
    });

    const fileWatcher: FileWatcher = {
      worktreePath: path,
      patterns: this.state.config.includedExtensions.map(ext => `**/*${ext}`),
      ignored: this.state.config.excludedPaths,
      watcher,
      events: [],
      maxEvents: 1000
    };

    watcher
      .on('add', (filePath) => this.handleFileChange(name, filePath, 'add'))
      .on('change', (filePath) => this.handleFileChange(name, filePath, 'change'))
      .on('unlink', (filePath) => this.handleFileChange(name, filePath, 'unlink'))
      .on('addDir', (dirPath) => this.handleFileChange(name, dirPath, 'addDir'))
      .on('unlinkDir', (dirPath) => this.handleFileChange(name, dirPath, 'unlinkDir'))
      .on('error', (error) => {
        logger.error('Scanner', `File watcher error in ${name}: ${error instanceof Error ? error.message : String(error)}`);
      });

    this.fileWatchers.set(name, fileWatcher);
    logger.info('Scanner', `File watcher initialized for ${name}`);
  }

  /**
   * Handle file change events
   */
  private handleFileChange(worktree: string, filePath: string, type: string): void {
    const event = {
      id: HashUtils.generateId(),
      timestamp: TimeUtils.now(),
      path: filePath,
      type: type as FileWatcherChangeEvent['type'],
      processed: false
    };

    this.emit('fileChange', { worktree, event } as FileChangeEvent);
    EventBus.publishToChannel('scanner', {
      id: HashUtils.generateId(),
      type: 'scanner_file_change',
      timestamp: TimeUtils.now(),
      source: 'scanner',
      data: { worktree, event },
      metadata: {}
    });

    // Queue scan if this is a relevant file
    if (this.isRelevantFile(filePath)) {
      this.queueScan(worktree, 'incremental');
    }
  }

  /**
   * Check if file is relevant for scanning
   */
  private isRelevantFile(filePath: string): boolean {
    const ext = FileUtils.getFileExtension(filePath);
    return this.state.config.includedExtensions.includes(`.${ext}`);
  }

  /**
   * Queue a scan for a worktree
   */
  private queueScan(worktree: string, type: 'full' | 'incremental'): void {
    // Check if already queued
    const existingIndex = this.scanQueue.findIndex(item => item.worktree === worktree);
    if (existingIndex >= 0) {
      // Upgrade to full scan if needed
      if (type === 'full') {
        const item = this.scanQueue[existingIndex];
        if (item) {
          item.type = 'full';
        }
      }
      return;
    }

    this.scanQueue.push({ worktree, type });

    // Process queue if not already scanning
    if (!this.isScanning) {
      this.processScanQueue();
    }
  }

  /**
   * Process the scan queue
   */
  private async processScanQueue(): Promise<void> {
    if (this.isScanning || this.scanQueue.length === 0) {
      return;
    }

    this.isScanning = true;

    while (this.scanQueue.length > 0) {
      const { worktree, type } = this.scanQueue.shift()!;

      try {
        await this.performScan(worktree, type);
      } catch (error) {
        logger.error('Scanner', `Failed to scan ${worktree}: ${error instanceof Error ? error.message : String(error)}`);
        this.emit('scanError', {
          worktree,
          error: error instanceof Error ? error : new Error(String(error))
        } as ScannerErrorEvent);
      }

      // Small delay between scans to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isScanning = false;
  }

  /**
   * Perform a scan of a worktree
   */
  private async performScan(worktree: string, scanType: 'full' | 'incremental'): Promise<ScanResult> {
    const monitor = this.worktreeMonitors.get(worktree);
    if (!monitor) {
      throw new Error(`Worktree ${worktree} not found`);
    }

    const scanId = HashUtils.generateId();
    const startTime = Date.now();

    monitor.status = 'scanning';
    this.state.status = 'scanning';
    this.state.currentScan = scanId;

    this.emit('scanStarted', {
      scanId,
      worktree,
      scanType
    } as ScannerStartedEvent);

    logger.info('Scanner', `Starting ${scanType} scan for ${worktree}`, { scanId });

    try {
      const result = await this.executeScan(worktree, scanType, scanId);

      const duration = Date.now() - startTime;
      result.performance.duration = duration;

      monitor.status = 'active';
      this.state.status = 'idle';
      this.state.currentScan = undefined;

      this.emit('scanCompleted', {
        scanId,
        result
      } as ScannerCompletedEvent);

      return result;

    } catch (error) {
      monitor.status = 'error';
      monitor.metrics.errorCount++;
      this.state.status = 'error';
      this.state.currentScan = undefined;

      throw error;
    }
  }

  /**
   * Execute the actual scan operation
   */
  private async executeScan(worktree: string, scanType: 'full' | 'incremental', scanId: string): Promise<ScanResult> {
    const startTime = Date.now();

    PerformanceMonitor.startTimer('scan_execution');

    const result: ScanResult = {
      id: scanId,
      timestamp: TimeUtils.now(),
      worktree,
      scanType,
      changes: [],
      prpUpdates: [],
      signals: [],
      performance: {
        duration: 0,
        memoryUsage: PerformanceMonitor.getMemoryUsage().heapUsed,
        filesScanned: 0,
        changesFound: 0
      }
    };

    try {
      // Git monitoring
      if (this.state.config.enableGitMonitoring) {
        const gitChanges = await this.scanGitChanges(worktree);
        result.changes.push(...gitChanges);
      }

      // File monitoring
      if (this.state.config.enableFileMonitoring) {
        const fileChanges = await this.scanFileChanges(worktree, scanType);
        result.changes.push(...fileChanges);
      }

      // PRP monitoring
      if (this.state.config.enablePRPMonitoring) {
        const prpUpdates = await this.scanPRPFiles(worktree);
        result.prpUpdates.push(...prpUpdates);

        // Extract signals from PRP updates
        for (const update of prpUpdates) {
          result.signals.push(...update.detectedSignals);
        }
      }

      // Scan for signals in other files
      const additionalSignals = await this.scanForSignals(worktree);
      result.signals.push(...additionalSignals);

      // Update performance metrics
      result.performance.duration = Date.now() - startTime;
      result.performance.filesScanned = this.countScannedFiles(worktree);
      result.performance.changesFound = result.changes.length;

      logger.info('Scanner', `Scan completed for ${worktree}`, {
        scanId,
        changes: result.changes.length,
        prpUpdates: result.prpUpdates.length,
        signals: result.signals.length,
        duration: result.performance.duration
      });

      return result;

    } finally {
      PerformanceMonitor.endTimer('scan_execution');
    }
  }

  /**
   * Scan for git changes in a worktree
   */
  private async scanGitChanges(worktree: string): Promise<FileChange[]> {
    const monitor = this.worktreeMonitors.get(worktree)!;
    const changes: FileChange[] = [];

    try {
      const status = await GitUtils.getRepoStatus(monitor.path);

      // Process modified files
      for (const file of status.modified) {
        const fullPath = join(monitor.path, file);
        const stats = await FileUtils.readFileStats(fullPath);

        changes.push({
          path: file,
          type: 'modified',
          size: stats.size,
          timestamp: stats.modified
        });
      }

      // Process added files
      for (const file of status.added) {
        const fullPath = join(monitor.path, file);
        const stats = await FileUtils.readFileStats(fullPath);

        changes.push({
          path: file,
          type: 'added',
          size: stats.size,
          timestamp: stats.modified
        });
      }

      // Process deleted files
      for (const file of status.deleted) {
        changes.push({
          path: file,
          type: 'deleted',
          size: 0,
          timestamp: TimeUtils.now()
        });
      }

    } catch (error) {
      logger.warn('Scanner', `Failed to scan git changes in ${worktree}`, { error: error instanceof Error ? error.message : String(error) });
    }

    return changes;
  }

  /**
   * Scan for file changes (excluding git)
   */
  private async scanFileChanges(_worktree: string, _scanType: 'full' | 'incremental'): Promise<FileChange[]> {
    // This would implement custom file change detection
    // For now, we rely on git monitoring and file watcher events
    return [];
  }

  /**
   * Scan PRP files for updates and signals
   */
  private async scanPRPFiles(worktree: string): Promise<PRPScanResult[]> {
    const monitor = this.worktreeMonitors.get(worktree)!;
    const parser = this.prpParsers.get(worktree);
    if (!parser) return [];

    const updates: PRPScanResult[] = [];

    try {
      // Find all PRP files
      const prpFiles = await this.findPRPFiles(monitor.path);

      for (const prpFile of prpFiles) {
        const update = await this.parsePRPFile(worktree, prpFile, parser);
        if (update) {
          updates.push(update as PRPScanResult);
        }
      }

    } catch (error) {
      logger.warn('Scanner', `Failed to scan PRP files in ${worktree}`, { error: error instanceof Error ? error.message : String(error) });
    }

    return updates;
  }

  /**
   * Find all PRP files in a directory
   */
  private async findPRPFiles(dirPath: string): Promise<string[]> {
    const fs = await import('fs/promises');
    const prpFiles: string[] = [];

    const scanDirectory = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name);

          if (entry.isDirectory()) {
            // Skip excluded directories
            if (this.state.config.excludedPaths.includes(entry.name)) {
              continue;
            }
            await scanDirectory(fullPath);
          } else if (entry.isFile() && FileUtils.isPRPFile(entry.name)) {
            prpFiles.push(fullPath);
          }
        }
      } catch {
        // Ignore permission errors
      }
    }

    await scanDirectory(dirPath);
    return prpFiles;
  }

  /**
   * Parse a PRP file and extract signals
   */
  private async parsePRPFile(_worktree: string, filePath: string, parser: PRPParser): Promise<unknown> {
    try {
      const stats = await FileUtils.readFileStats(filePath);
      const cacheKey = filePath;

      // Check cache
      const cached = parser.cache.get(cacheKey);
      if (cached && cached.lastModified >= stats.modified) {
        return null; // No changes
      }

      const content = await FileUtils.readTextFile(filePath);
      const signals = this.extractSignalsFromContent(content);

      // Update cache
      parser.cache.set(cacheKey, {
        content,
        lastModified: stats.modified,
        signals
      });

      // Trim cache if needed
      if (parser.cache.size > parser.maxCacheSize) {
        const entries = Array.from(parser.cache.entries());
        entries.sort((a, b) => a[1].lastModified.getTime() - b[1].lastModified.getTime());
        entries.slice(0, Math.floor(parser.maxCacheSize * 0.2)).forEach(([key]) => {
          parser.cache.delete(key);
        });
      }

      return {
        path: filePath,
        changeType: 'modified',
        newVersion: {
          path: filePath,
          name: basename(filePath),
          signals,
          lastModified: stats.modified
        },
        detectedSignals: signals,
        lastModified: stats.modified
      };

    } catch (error) {
      parser.parseErrors.push({
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
        timestamp: TimeUtils.now()
      });

      logger.warn('Scanner', `Failed to parse PRP file ${filePath}`, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Extract signals from content
   */
  private extractSignalsFromContent(content: string): Signal[] {
    const signalMatches = SignalParser.extractSignals(content);
    const signals: Signal[] = [];

    for (const signalText of signalMatches) {
      const parsed = SignalParser.parseSignal(signalText);
      if (parsed) {
        signals.push({
          id: HashUtils.generateId(),
          type: parsed.code,
          priority: parsed.priority,
          source: 'scanner',
          timestamp: TimeUtils.now(),
          data: { rawSignal: signalText },
          metadata: {
            worktree: 'unknown'
          }
        });
      }
    }

    return signals;
  }

  /**
   * Scan for signals in all files
   */
  private async scanForSignals(worktree: string): Promise<Signal[]> {
    const monitor = this.worktreeMonitors.get(worktree)!;
    const allSignals: Signal[] = [];

    try {
      // Scan through relevant files for signals
      const relevantFiles = await this.findRelevantFiles(monitor.path);

      for (const filePath of relevantFiles) {
        try {
          const content = await FileUtils.readTextFile(filePath);
          const signals = this.extractSignalsFromContent(content);

          // Add file path metadata
          signals.forEach(signal => {
            signal.metadata.worktree = filePath;
          });

          allSignals.push(...signals);
        } catch {
          // Ignore files that can't be read
        }
      }

    } catch (error) {
      logger.warn('Scanner', `Failed to scan for signals in ${worktree}`, { error: error instanceof Error ? error.message : String(error) });
    }

    return allSignals;
  }

  /**
   * Find relevant files for signal scanning
   */
  private async findRelevantFiles(dirPath: string): Promise<string[]> {
    const fs = await import('fs/promises');
    const relevantFiles: string[] = [];

    const scanDirectory = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name);

          if (entry.isDirectory()) {
            if (this.state.config.excludedPaths.includes(entry.name)) {
              continue;
            }
            await scanDirectory(fullPath);
          } else if (entry.isFile() && this.isRelevantFile(fullPath)) {
            relevantFiles.push(fullPath);
          }
        }
      } catch {
        // Ignore permission errors
      }
    }

    await scanDirectory(dirPath);
    return relevantFiles;
  }

  /**
   * Count scanned files for metrics
   */
  private countScannedFiles(_worktree: string): number {
    // This would be implemented with actual file counting logic
    return 0;
  }

  /**
   * Update scanner metrics
   */
  private updateMetrics(result: ScanResult): void {
    this.state.metrics.totalScans++;
    this.state.metrics.totalChanges += result.changes.length;
    this.state.metrics.totalPRPUpdates += result.prpUpdates.length;
    this.state.metrics.totalSignalsDetected += result.signals.length;

    // Update performance metrics
    const duration = result.performance.duration;
    this.state.metrics.performance.fastestScan = Math.min(this.state.metrics.performance.fastestScan, duration);
    this.state.metrics.performance.slowestScan = Math.max(this.state.metrics.performance.slowestScan, duration);

    // Update average scan time
    const totalScans = this.state.metrics.totalScans;
    this.state.metrics.averageScanTime =
      (this.state.metrics.averageScanTime * (totalScans - 1) + duration) / totalScans;

    // Update memory usage
    const currentMemory = PerformanceMonitor.getMemoryUsage().heapUsed;
    this.state.metrics.memoryUsage.current = currentMemory;
    this.state.metrics.memoryUsage.peak = Math.max(this.state.metrics.memoryUsage.peak, currentMemory);
  }

  /**
   * Start periodic scanning
   */
  private startPeriodicScanning(): void {
    this.scanTimer = setInterval(() => {
      // Queue full scans for all active worktrees
      for (const [name, monitor] of Array.from(this.worktreeMonitors.entries())) {
        if (monitor.status === 'active') {
          this.queueScan(name, 'full');
        }
      }
    }, this.state.config.scanInterval);
  }

  /**
   * Cleanup subsystems for a worktree
   */
  private async cleanupWorktreeSubsystems(name: string): Promise<void> {
    // Cleanup file watcher
    const fileWatcher = this.fileWatchers.get(name);
    if (fileWatcher) {
      await (fileWatcher.watcher as WatcherInstance)?.close?.();
      this.fileWatchers.delete(name);
    }

    // Cleanup PRP parser
    this.prpParsers.delete(name);
  }

  /**
   * Get current scanner status
   */
  getStatus(): ScannerState {
    return { ...this.state };
  }

  /**
   * Get token accounting manager
   */
  getTokenAccounting(): TokenAccountingManager {
    return this.tokenAccounting;
  }

  /**
   * Pause scanning
   */
  pause(): void {
    this.state.status = 'paused';
    logger.info('Scanner', 'Scanner paused');
  }

  /**
   * Resume scanning
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'idle';
      logger.info('Scanner', 'Scanner resumed');
    }
  }

  /**
   * Shutdown the scanner
   */
  async shutdown(): Promise<void> {
    logger.info('Scanner', 'Shutting down scanner');

    // Clear scan timer
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }

    // Cleanup all worktrees
    for (const name of Array.from(this.worktreeMonitors.keys())) {
      await this.removeWorktree(name);
    }

    // Cleanup token accounting
    await this.tokenAccounting.cleanup();

    // Remove all listeners
    this.removeAllListeners();

    logger.info('Scanner', 'Scanner shutdown complete');
  }
}