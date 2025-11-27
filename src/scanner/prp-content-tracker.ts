/**
 * ♫ PRP Content Tracker and Version Manager for @dcversus/prp Scanner
 *
 * Comprehensive PRP content tracking, version management, and change detection
 * with caching, diff analysis, and signal extraction capabilities.
 */
import { readFile, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { EventEmitter } from 'events';
import { randomUUID , createHash } from 'crypto';

import { createLayerLogger, TimeUtils, HashUtils, FileUtils, ConfigUtils } from '../shared';
import { Signal, PRPFile } from '../shared/types';

import type { EventBus } from '../shared/events';
import type { DetectedSignal } from './types';

const logger = createLayerLogger('scanner');
// PRP content version
interface PRPVersion {
  id: string;
  timestamp: Date;
  content: string;
  hash: string;
  size: number;
  signals: DetectedSignal[];
  metadata: {
    title?: string;
    status?: string;
    progress?: string;
    lastModified?: Date;
    lineCount?: number;
    wordCount?: number;
  };
  changes?: {
    type: 'created' | 'modified' | 'deleted';
    previousVersionId?: string;
    diffSummary?: string;
    linesAdded?: number;
    linesRemoved?: number;
    signalsAdded?: string[];
    signalsRemoved?: string[];
  };
}
// PRP file state
interface PRPState {
  path: string;
  name: string;
  currentVersion: PRPVersion | null;
  versionHistory: PRPVersion[];
  lastChecked: Date;
  lastModified: Date;
  isMonitored: boolean;
  errorCount: number;
  lastError?: string;
}
// Content diff result
interface ContentDiff {
  hasChanges: boolean;
  linesAdded: number;
  linesRemoved: number;
  signalsAdded: DetectedSignal[];
  signalsRemoved: DetectedSignal[];
  signalsModified: Array<{ old: DetectedSignal; new: DetectedSignal }>;
  contentChanges: Array<{
    lineStart: number;
    lineEnd: number;
    type: 'added' | 'removed' | 'modified';
    content: string;
  }>;
  summary: string;
}
// Cache configuration
interface CacheConfig {
  maxSize: number;
  ttl: number; // milliseconds
  enableCompression: boolean;
  persistToDisk: boolean;
  persistPath: string;
}
// Tracker metrics
interface TrackerMetrics {
  totalPRPs: number;
  totalVersions: number;
  totalSignals: number;
  averageVersionSize: number;
  cacheHitRate: number;
  lastScanTime: number;
  errorCount: number;
}
/**
 * PRP Content Tracker and Version Manager
 */
export class PRPContentTracker extends EventEmitter {
  private readonly worktreePath: string;
  private readonly eventBus: EventBus;
  private readonly prpStates = new Map<string, PRPState>();
  private readonly signalDetector: (content: string) => DetectedSignal[];
  private readonly cacheConfig: CacheConfig;
  private readonly memoryCache = new Map<
    string,
    { content: string; timestamp: Date; version: PRPVersion }
  >();
  // Performance metrics
  private readonly metrics: TrackerMetrics;
  private cacheHits = 0;
  private cacheMisses = 0;
  constructor(
    worktreePath: string,
    eventBus: EventBus,
    signalDetector: (content: string) => DetectedSignal[],
    cacheConfig: Partial<CacheConfig> = {},
  ) {
    super();
    this.worktreePath = resolve(worktreePath);
    this.eventBus = eventBus;
    this.signalDetector = signalDetector;
    // Default cache configuration
    this.cacheConfig = {
      maxSize: 100,
      ttl: 300000, // 5 minutes
      enableCompression: false,
      persistToDisk: true,
      persistPath: '.prp/prp-content-cache.json',
      ...cacheConfig,
    };
    // Initialize metrics
    this.metrics = {
      totalPRPs: 0,
      totalVersions: 0,
      totalSignals: 0,
      averageVersionSize: 0,
      cacheHitRate: 0,
      lastScanTime: 0,
      errorCount: 0,
    };
  }
  /**
   * Initialize the PRP content tracker
   */
  async initialize(): Promise<void> {
    try {
      logger.info('PRPContentTracker', 'Initializing PRP content tracker...');
      // Load cached data
      await this.loadCachedData();
      // Discover PRP files
      await this.discoverPRPFiles();
      // Initial scan
      await this.performInitialScan();
      logger.info(
        'PRPContentTracker',
        `✅ PRP content tracker initialized. Monitoring ${this.prpStates.size} PRPs`,
      );
      this.emit('tracker:initialized', {
        worktreePath: this.worktreePath,
        prpCount: this.prpStates.size,
        timestamp: TimeUtils.now(),
      });
    } catch (error) {
      logger.error(
        'PRPContentTracker',
        'Failed to initialize PRP content tracker',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Scan for changes in all monitored PRPs
   */
  async scanForChanges(): Promise<Array<{ prpPath: string; changes: ContentDiff }>> {
    const startTime = Date.now();
    const results: Array<{ prpPath: string; changes: ContentDiff }> = [];
    logger.debug('PRPContentTracker', 'Starting PRP content scan...');
    for (const [prpPath, prpState] of this.prpStates.entries()) {
      if (!prpState.isMonitored) {
        continue;
      }
      try {
        const changes = await this.checkPRPChanges(prpPath, prpState);
        if (changes.hasChanges) {
          results.push({ prpPath, changes });
        }
      } catch (error) {
        prpState.errorCount++;
        prpState.lastError = error instanceof Error ? error.message : String(error);
        logger.error(
          'PRPContentTracker',
          'Error scanning PRP',
          error instanceof Error ? error : new Error(String(error)),
          {
            prpPath,
            errorCount: prpState.errorCount,
          },
        );
        this.metrics.errorCount++;
      }
    }
    // Update metrics
    this.metrics.lastScanTime = Date.now() - startTime;
    this.updateCacheHitRate();
    // Emit scan completed event
    this.emit('scan:completed', {
      worktreePath: this.worktreePath,
      prpsScanned: this.prpStates.size,
      changesFound: results.length,
      scanTime: this.metrics.lastScanTime,
      timestamp: TimeUtils.now(),
    });
    logger.debug('PRPContentTracker', 'PRP content scan completed', {
      prpsScanned: this.prpStates.size,
      changesFound: results.length,
      scanTime: this.metrics.lastScanTime,
    });
    return results;
  }
  /**
   * Get PRP content by path and version
   */
  async getPRPContent(prpPath: string, versionId?: string): Promise<PRPVersion | null> {
    const prpState = this.prpStates.get(prpPath);
    if (!prpState) {
      return null;
    }
    // If no version specified, return current version
    if (!versionId) {
      return prpState.currentVersion;
    }
    // Find specific version
    return prpState.versionHistory.find((v) => v.id === versionId) ?? null;
  }
  /**
   * Get PRP version history
   */
  getPRPVersionHistory(prpPath: string): PRPVersion[] {
    const prpState = this.prpStates.get(prpPath);
    return prpState ? [...prpState.versionHistory] : [];
  }
  /**
   * Add PRP to monitoring
   */
  async addPRP(prpPath: string): Promise<void> {
    const fullPath = resolve(this.worktreePath, prpPath);
    if (!existsSync(fullPath)) {
      throw new Error(`PRP file does not exist: ${fullPath}`);
    }
    if (!this.isPRPFile(prpPath)) {
      throw new Error(`Not a PRP file: ${prpPath}`);
    }
    // Create PRP state
    const prpState: PRPState = {
      path: prpPath,
      name: this.extractPRPName(prpPath),
      currentVersion: null,
      versionHistory: [],
      lastChecked: new Date(),
      lastModified: new Date(),
      isMonitored: true,
      errorCount: 0,
    };
    this.prpStates.set(prpPath, prpState);
    this.metrics.totalPRPs++;
    // Initial scan
    await this.checkPRPChanges(prpPath, prpState);
    logger.info('PRPContentTracker', 'PRP added to monitoring', {
      prpPath,
      name: prpState.name,
    });
    this.emit('prp:added', {
      prpPath,
      name: prpState.name,
      timestamp: TimeUtils.now(),
    });
  }
  /**
   * Remove PRP from monitoring
   */
  removePRP(prpPath: string): boolean {
    const prpState = this.prpStates.get(prpPath);
    if (!prpState) {
      return false;
    }
    this.prpStates.delete(prpPath);
    this.metrics.totalPRPs--;
    logger.info('PRPContentTracker', 'PRP removed from monitoring', { prpPath });
    this.emit('prp:removed', {
      prpPath,
      name: prpState.name,
      timestamp: TimeUtils.now(),
    });
    return true;
  }
  /**
   * Get all monitored PRPs
   */
  getMonitoredPRPs(): Array<{
    path: string;
    name: string;
    lastModified: Date;
    versionCount: number;
  }> {
    return Array.from(this.prpStates.entries()).map(([path, state]) => ({
      path,
      name: state.name,
      lastModified: state.lastModified,
      versionCount: state.versionHistory.length,
    }));
  }
  /**
   * Get tracker metrics
   */
  getMetrics(): TrackerMetrics {
    return {
      ...this.metrics,
      totalVersions: Array.from(this.prpStates.values()).reduce(
        (sum, state) => sum + state.versionHistory.length,
        0,
      ),
      totalSignals: Array.from(this.prpStates.values()).reduce(
        (sum, state) => sum + (state.currentVersion?.signals.length ?? 0),
        0,
      ),
      averageVersionSize: this.calculateAverageVersionSize(),
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }
  /**
   * Force refresh of PRP content
   */
  async refreshPRP(prpPath: string): Promise<boolean> {
    const prpState = this.prpStates.get(prpPath);
    if (!prpState) {
      return false;
    }
    try {
      // Clear cache for this PRP
      this.clearCacheForPRP(prpPath);
      // Force re-check
      const changes = await this.checkPRPChanges(prpPath, prpState);
      logger.info('PRPContentTracker', 'PRP refreshed', {
        prpPath,
        hasChanges: changes.hasChanges,
      });
      return changes.hasChanges;
    } catch (error) {
      logger.error(
        'PRPContentTracker',
        'Failed to refresh PRP',
        error instanceof Error ? error : new Error(String(error)),
        {
          prpPath,
        },
      );
      return false;
    }
  }
  /**
   * Get signals from PRP
   */
  async getPRPSignals(prpPath: string, versionId?: string): Promise<DetectedSignal[]> {
    const version = await this.getPRPContent(prpPath, versionId);
    return version?.signals ?? [];
  }
  /**
   * Search PRPs by content
   */
  async searchPRPs(
    query: string,
    options: {
      includeContent?: boolean;
      caseSensitive?: boolean;
      maxResults?: number;
    } = {},
  ): Promise<
    Array<{
      prpPath: string;
      name: string;
      matches: Array<{
        versionId: string;
        timestamp: Date;
        context: string;
        lineNumber?: number;
      }>;
    }>
  > {
    const results: Array<{
      prpPath: string;
      name: string;
      matches: Array<{
        versionId: string;
        timestamp: Date;
        context: string;
        lineNumber?: number;
      }>;
    }> = [];
    const searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
    for (const [prpPath, prpState] of this.prpStates.entries()) {
      if (!prpState.isMonitored) {
        continue;
      }
      const matches: Array<{
        versionId: string;
        timestamp: Date;
        context: string;
        lineNumber?: number;
      }> = [];
      // Search in current version and recent history
      const versionsToSearch = [
        prpState.currentVersion,
        ...prpState.versionHistory.slice(-5),
      ].filter((v) => v !== null);
      for (const version of versionsToSearch) {
        const lines = version.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (searchRegex.test(line)) {
            matches.push({
              versionId: version.id,
              timestamp: version.timestamp,
              context: line.trim(),
              lineNumber: i + 1,
            });
            if (options.maxResults && matches.length >= options.maxResults) {
              break;
            }
          }
        }
        if (options.maxResults && matches.length >= options.maxResults) {
          break;
        }
      }
      if (matches.length > 0) {
        results.push({
          prpPath,
          name: prpState.name,
          matches,
        });
      }
    }
    return results;
  }
  /**
   * Stop tracking and cleanup
   */
  async stop(): Promise<void> {
    logger.info('PRPContentTracker', 'Stopping PRP content tracker...');
    // Persist cache data
    if (this.cacheConfig.persistToDisk) {
      await this.persistCacheData();
    }
    // Clear memory cache
    this.memoryCache.clear();
    this.prpStates.clear();
    logger.info('PRPContentTracker', '✅ PRP content tracker stopped');
  }
  // Private methods
  private async discoverPRPFiles(): Promise<void> {
    try {
      const { default: glob } = await import('glob');
      const prpFiles = glob.sync('PRPs/**/*.md', {
        cwd: this.worktreePath,
        absolute: false,
      });
      for (const prpFile of prpFiles) {
        if (this.isPRPFile(prpFile)) {
          await this.addPRP(prpFile);
        }
      }
      logger.info('PRPContentTracker', 'Discovered PRP files', {
        count: prpFiles.length,
        path: this.worktreePath,
      });
    } catch (error) {
      logger.error(
        'PRPContentTracker',
        'Failed to discover PRP files',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  private async performInitialScan(): Promise<void> {
    logger.debug('PRPContentTracker', 'Performing initial PRP scan...');
    for (const [prpPath, prpState] of this.prpStates.entries()) {
      try {
        await this.checkPRPChanges(prpPath, prpState);
      } catch (error) {
        logger.warn('PRPContentTracker', 'Failed to scan PRP during initial scan', {
          prpPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    logger.debug('PRPContentTracker', 'Initial PRP scan completed');
  }
  private async checkPRPChanges(prpPath: string, prpState: PRPState): Promise<ContentDiff> {
    const fullPath = resolve(this.worktreePath, prpPath);
    const fileStats = await stat(fullPath);
    // Check if file was modified
    if (fileStats.mtime <= prpState.lastModified && prpState.currentVersion) {
      return {
        hasChanges: false,
        linesAdded: 0,
        linesRemoved: 0,
        signalsAdded: [],
        signalsRemoved: [],
        signalsModified: [],
        contentChanges: [],
        summary: 'No changes',
      };
    }
    // Get current content (with cache)
    const currentContent = await this.getPRPContentWithCache(fullPath);
    const currentHash = this.calculateContentHash(currentContent);
    // Check if content actually changed
    if (prpState.currentVersion?.hash === currentHash) {
      prpState.lastModified = fileStats.mtime;
      return {
        hasChanges: false,
        linesAdded: 0,
        linesRemoved: 0,
        signalsAdded: [],
        signalsRemoved: [],
        signalsModified: [],
        contentChanges: [],
        summary: 'No content changes',
      };
    }
    // Detect signals in current content
    const currentSignals = this.signalDetector(currentContent);
    // Create new version
    const newVersion: PRPVersion = {
      id: randomUUID(),
      timestamp: new Date(),
      content: currentContent,
      hash: currentHash,
      size: currentContent.length,
      signals: currentSignals,
      metadata: this.extractMetadata(currentContent),
    };
    // Calculate diff
    const diff = prpState.currentVersion
      ? this.calculateDiff(prpState.currentVersion, newVersion)
      : {
          hasChanges: true,
          linesAdded: currentContent.split('\n').length,
          linesRemoved: 0,
          signalsAdded: currentSignals,
          signalsRemoved: [],
          signalsModified: [],
          contentChanges: [],
          summary: 'New PRP created',
        };
    // Update changes metadata
    if (diff.hasChanges) {
      newVersion.changes = {
        type: prpState.currentVersion ? 'modified' : 'created',
        previousVersionId: prpState.currentVersion?.id,
        diffSummary: diff.summary,
        linesAdded: diff.linesAdded,
        linesRemoved: diff.linesRemoved,
        signalsAdded: diff.signalsAdded.map((s) => s.type),
        signalsRemoved: diff.signalsRemoved.map((s) => s.type),
      };
    }
    // Update PRP state
    prpState.currentVersion = newVersion;
    prpState.versionHistory.push(newVersion);
    prpState.lastChecked = new Date();
    prpState.lastModified = fileStats.mtime;
    // Limit history size
    if (prpState.versionHistory.length > 50) {
      prpState.versionHistory = prpState.versionHistory.slice(-50);
    }
    // Update cache
    this.updateCache(fullPath, currentContent, newVersion);
    // Emit change events
    if (diff.hasChanges) {
      this.emit('prp:changed', {
        prpPath,
        name: prpState.name,
        version: newVersion,
        diff,
        timestamp: TimeUtils.now(),
      });
      // Publish to event bus
      this.eventBus.publishToChannel('scanner', {
        id: randomUUID(),
        type: 'prp_content_changed',
        timestamp: TimeUtils.now(),
        source: 'prp-tracker',
        data: {
          prpPath,
          name: prpState.name,
          versionId: newVersion.id,
          changes: diff,
          signals: currentSignals,
        },
        metadata: {},
      });
    }
    return diff;
  }
  private async getPRPContentWithCache(filePath: string): Promise<string> {
    // Check memory cache first
    const cached = this.memoryCache.get(filePath);
    if (cached && TimeUtils.now().getTime() - cached.timestamp.getTime() < this.cacheConfig.ttl) {
      this.cacheHits++;
      return cached.content;
    }
    // Read from disk
    const content = await readFile(filePath, 'utf-8');
    this.cacheMisses++;
    return content;
  }
  private updateCache(filePath: string, content: string, version: PRPVersion): void {
    // Add to memory cache
    this.memoryCache.set(filePath, {
      content,
      timestamp: new Date(),
      version,
    });
    // Limit cache size
    if (this.memoryCache.size > this.cacheConfig.maxSize) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
  }
  private clearCacheForPRP(prpPath: string): void {
    const fullPath = resolve(this.worktreePath, prpPath);
    this.memoryCache.delete(fullPath);
  }
  private calculateDiff(previousVersion: PRPVersion, newVersion: PRPVersion): ContentDiff {
    const previousLines = previousVersion.content.split('\n');
    const newLines = newVersion.content.split('\n');
    // Simple diff implementation (would use a proper diff library in production)
    let linesAdded = 0;
    let linesRemoved = 0;
    const contentChanges: Array<{
      lineStart: number;
      lineEnd: number;
      type: 'added' | 'removed' | 'modified';
      content: string;
    }> = [];
    // Calculate line differences
    if (newLines.length > previousLines.length) {
      linesAdded = newLines.length - previousLines.length;
    } else if (newLines.length < previousLines.length) {
      linesRemoved = previousLines.length - newLines.length;
    }
    // Calculate signal differences
    const previousSignalTypes = new Set(previousVersion.signals.map((s) => s.type));
    const currentSignalTypes = new Set(newVersion.signals.map((s) => s.type));
    const signalsAdded = newVersion.signals.filter((s) => !previousSignalTypes.has(s.type));
    const signalsRemoved = previousVersion.signals.filter((s) => !currentSignalTypes.has(s.type));
    // Find modified signals
    const signalsModified: Array<{ old: DetectedSignal; new: DetectedSignal }> = [];
    for (const currentSignal of newVersion.signals) {
      const previousSignal = previousVersion.signals.find((s) => s.type === currentSignal.type);
      if (previousSignal && previousSignal.content !== currentSignal.content) {
        signalsModified.push({ old: previousSignal, new: currentSignal });
      }
    }
    const hasChanges =
      linesAdded > 0 ||
      linesRemoved > 0 ||
      signalsAdded.length > 0 ||
      signalsRemoved.length > 0 ||
      signalsModified.length > 0;
    const summary = hasChanges
      ? `+${linesAdded} -${linesRemoved} lines, ${signalsAdded.length} signals added, ${signalsRemoved.length} signals removed`
      : 'No changes';
    return {
      hasChanges,
      linesAdded,
      linesRemoved,
      signalsAdded,
      signalsRemoved,
      signalsModified,
      contentChanges,
      summary,
    };
  }
  private calculateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
  private extractMetadata(content: string): PRPVersion['metadata'] {
    const lines = content.split('\n');
    const metadata: PRPVersion['metadata'] = {};
    // Extract title from first heading
    for (const line of lines) {
      const titleMatch = line.match(/^#\s+(.+)$/);
      if (titleMatch) {
        metadata.title = titleMatch[1]!.trim();
        break;
      }
    }
    // Extract progress section
    const progressMatch = content.match(/## progress\s*\n\s*(.+?)(?=\n##|\n$)/s);
    if (progressMatch) {
      metadata.progress = progressMatch[1]!.trim();
    }
    // Extract status
    const statusMatch = content.match(/status:\s*(.+)/i);
    if (statusMatch) {
      metadata.status = statusMatch[1]!.trim();
    }
    // Basic stats
    metadata.lineCount = lines.length;
    metadata.wordCount = content.split(/\s+/).length;
    metadata.lastModified = new Date();
    return metadata;
  }
  private isPRPFile(filePath: string): boolean {
    return filePath.includes('PRPs/') && filePath.endsWith('.md');
  }
  private extractPRPName(filePath: string): string {
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1] ?? filePath;
    return filename.replace('.md', '');
  }
  private calculateAverageVersionSize(): number {
    const allVersions = Array.from(this.prpStates.values()).flatMap(
      (state) => state.versionHistory,
    );
    if (allVersions.length === 0) {
      return 0;
    }
    const totalSize = allVersions.reduce((sum, version) => sum + version.size, 0);
    return totalSize / allVersions.length;
  }
  private calculateCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }
  private updateCacheHitRate(): void {
    this.metrics.cacheHitRate = this.calculateCacheHitRate();
  }
  private async loadCachedData(): Promise<void> {
    if (!this.cacheConfig.persistToDisk) {
      return;
    }
    try {
      const exists = await FileUtils.pathExists(this.cacheConfig.persistPath);
      if (!exists) {
        return;
      }
      const data = await ConfigUtils.loadConfigFile<any>(this.cacheConfig.persistPath);
      if (!data) {
        return;
      }
      // Load cache data
      if (data.cache) {
        for (const [key, entry] of Object.entries(data.cache)) {
          const cacheEntry = entry as any;
          if (
            new Date(cacheEntry.timestamp).getTime() >
            TimeUtils.now().getTime() - this.cacheConfig.ttl
          ) {
            this.memoryCache.set(key, {
              content: cacheEntry.content,
              timestamp: new Date(cacheEntry.timestamp),
              version: cacheEntry.version,
            });
          }
        }
      }
      logger.debug('PRPContentTracker', 'Cached data loaded', {
        cacheEntries: this.memoryCache.size,
      });
    } catch (error) {
      logger.warn('PRPContentTracker', 'Failed to load cached data', { error });
    }
  }
  private async persistCacheData(): Promise<void> {
    if (!this.cacheConfig.persistToDisk) {
      return;
    }
    try {
      const cacheData: Record<string, any> = {};
      for (const [key, entry] of this.memoryCache.entries()) {
        cacheData[key] = {
          content: entry.content,
          timestamp: entry.timestamp.toISOString(),
          version: entry.version,
        };
      }
      const data = {
        cache: cacheData,
        lastSaved: TimeUtils.now().toISOString(),
        version: '1.0.0',
      };
      await FileUtils.ensureDir((await import('path')).dirname(this.cacheConfig.persistPath));
      await FileUtils.writeTextFile(this.cacheConfig.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(
        'PRPContentTracker',
        'Failed to persist cache data',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
