/**
 * ♫ Logs Manager for @dcversus/prp Scanner
 *
 * Provides persisted storage, search, and retrieval of logs from all agents,
 * sessions, and scanner operations. Optimized for fast access to recent logs
 * and efficient historical data management.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { EventEmitter } from 'events';
import { createLayerLogger } from '../shared/logger';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

const logger = createLayerLogger('scanner');

export interface LogEntry {
  id: string;
  timestamp: Date;
  source: 'agent' | 'orchestrator' | 'inspector' | 'scanner' | 'tmux';
  agentId?: string;
  sessionId?: string;
  prpId?: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
  tokens?: number;
  signal?: string;
  tags?: string[];
}

export interface LogSearchQuery {
  sources?: string[];
  agentIds?: string[];
  sessionIds?: string[];
  prpIds?: string[];
  levels?: string[];
  signals?: string[];
  tags?: string[];
  startTime?: Date;
  endTime?: Date;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface LogSearchResult {
  entries: LogEntry[];
  totalCount: number;
  hasMore: boolean;
  query: LogSearchQuery;
  processingTime: number;
}

export interface SessionSummary {
  sessionId: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  totalEntries: number;
  totalTokens: number;
  signalsDetected: string[];
  errorCount: number;
  status: 'active' | 'completed' | 'terminated' | 'error';
}

export interface LogStorageConfig {
  storageDir: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  compressionEnabled: boolean;
  retentionDays: number;
  indexingEnabled: boolean;
}

/**
 * High-performance logs manager with compression and search capabilities
 */
export class LogsManager extends EventEmitter {
  private config: LogStorageConfig;
  private storageDir: string;
  private indexFile: string;
  private sessionsFile: string;
  private logCache: Map<string, LogEntry[]> = new Map();
  private sessionSummaries: Map<string, SessionSummary> = new Map();
  private index: Map<string, Set<string>> = new Map(); // Inverted index for search
  private lastFlush = new Date();
  private flushInterval = 30000; // 30 seconds

  constructor(config?: Partial<LogStorageConfig>) {
    super();

    this.config = {
      storageDir: join(homedir(), '.prp', 'logs'),
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 100,
      compressionEnabled: true,
      retentionDays: 30,
      indexingEnabled: true,
      ...config
    };

    this.storageDir = this.config.storageDir;
    this.indexFile = join(this.storageDir, 'index.json');
    this.sessionsFile = join(this.storageDir, 'sessions.json');

    this.initializeStorage();
    this.loadIndexes();
    this.startPeriodicFlush();
  }

  /**
   * Add a log entry to storage
   */
  async addLog(entry: Omit<LogEntry, 'id'>): Promise<string> {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      ...entry
    };

    // Add to cache
    const cacheKey = this.getCacheKey(logEntry.source, logEntry.agentId, logEntry.sessionId);
    if (!this.logCache.has(cacheKey)) {
      this.logCache.set(cacheKey, []);
    }
    this.logCache.get(cacheKey)!.push(logEntry);

    // Update session summary
    this.updateSessionSummary(logEntry);

    // Update search index
    if (this.config.indexingEnabled) {
      this.updateIndex(logEntry);
    }

    // Emit log added event
    this.emit('log:added', logEntry);

    // Check if we need to flush to disk
    const now = new Date();
    if (now.getTime() - this.lastFlush.getTime() > this.flushInterval) {
      await this.flushToDisk();
    }

    return logEntry.id;
  }

  /**
   * Search logs with advanced filtering
   */
  async searchLogs(query: LogSearchQuery): Promise<LogSearchResult> {
    const startTime = Date.now();
    const entries: LogEntry[] = [];

    // Build search criteria
    const criteria = this.buildSearchCriteria(query);

    // Search through relevant cache entries first
    for (const [cacheKey, logs] of this.logCache.entries()) {
      if (this.matchesCacheKey(cacheKey, criteria)) {
        const matchingLogs = logs.filter(log => this.matchesQuery(log, criteria, query));
        entries.push(...matchingLogs);
      }
    }

    // Search disk files if needed
    if (query.startTime && query.startTime.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      const diskEntries = await this.searchDiskFiles(query);
      entries.push(...diskEntries);
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedEntries = entries.slice(offset, offset + limit);

    const processingTime = Date.now() - startTime;

    return {
      entries: paginatedEntries,
      totalCount: entries.length,
      hasMore: offset + limit < entries.length,
      query,
      processingTime
    };
  }

  /**
   * Get recent logs for an agent or session
   */
  async getRecentLogs(
    source: string,
    agentId?: string,
    sessionId?: string,
    limit: number = 100
  ): Promise<LogEntry[]> {
    const query: LogSearchQuery = {
      sources: [source],
      agentIds: agentId ? [agentId] : undefined,
      sessionIds: sessionId ? [sessionId] : undefined,
      limit,
      searchText: undefined
    };

    const result = await this.searchLogs(query);
    return result.entries;
  }

  /**
   * Get last N log entries for quick access (last 2k tokens mentioned in PRP)
   */
  async getLastLogs(agentId?: string, tokenLimit: number = 2000): Promise<LogEntry[]> {
    const query: LogSearchQuery = {
      agentIds: agentId ? [agentId] : undefined,
      limit: 500, // Start with more entries to filter by tokens
      searchText: undefined
    };

    const result = await this.searchLogs(query);

    // Filter by token limit
    let totalTokens = 0;
    const limitedEntries: LogEntry[] = [];

    for (const entry of result.entries) {
      totalTokens += entry.tokens || 0;
      limitedEntries.push(entry);

      if (totalTokens >= tokenLimit) {
        break;
      }
    }

    return limitedEntries;
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): SessionSummary | null {
    return this.sessionSummaries.get(sessionId) ?? null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionSummary[] {
    return Array.from(this.sessionSummaries.values())
      .filter(session => session.status === 'active');
  }

  /**
   * Get session summaries for an agent
   */
  getAgentSessions(agentId: string): SessionSummary[] {
    return Array.from(this.sessionSummaries.values())
      .filter(session => session.agentId === agentId);
  }

  /**
   * Delete old logs based on retention policy
   */
  async cleanupOldLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    let deletedCount = 0;

    // Clean up cache
    for (const [cacheKey, logs] of this.logCache.entries()) {
      const filteredLogs = logs.filter(log => log.timestamp >= cutoffDate);
      const deleted = logs.length - filteredLogs.length;
      deletedCount += deleted;

      if (filteredLogs.length === 0) {
        this.logCache.delete(cacheKey);
      } else {
        this.logCache.set(cacheKey, filteredLogs);
      }
    }

    // Clean up session summaries
    for (const [sessionId, summary] of this.sessionSummaries.entries()) {
      if (summary.startTime < cutoffDate) {
        this.sessionSummaries.delete(sessionId);
      }
    }

    // Clean up disk files
    deletedCount += await this.cleanupDiskFiles(cutoffDate);

    // Save updated indexes
    await this.saveIndexes();

    logger.info('LogsManager', `Cleaned up ${deletedCount} old log entries`);
    this.emit('logs:cleaned', { deletedCount, cutoffDate });

    return deletedCount;
  }

  /**
   * Force flush all cached logs to disk
   */
  async flushToDisk(): Promise<void> {
    const flushPromises: Promise<void>[] = [];

    for (const [cacheKey, logs] of this.logCache.entries()) {
      if (logs.length > 0) {
        flushPromises.push(this.flushCacheKey(cacheKey, logs));
      }
    }

    await Promise.all(flushPromises);

    // Clear cache after successful flush
    this.logCache.clear();
    this.lastFlush = new Date();

    // Save indexes
    await this.saveIndexes();

    this.emit('logs:flushed');
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalEntries: number;
    totalSessions: number;
    cacheSize: number;
    indexSize: number;
    diskUsage: number;
    } {
    let totalEntries = 0;
    for (const logs of this.logCache.values()) {
      totalEntries += logs.length;
    }

    let indexSize = 0;
    for (const indexedEntries of this.index.values()) {
      indexSize += indexedEntries.size;
    }

    let diskUsage = 0;
    try {
      if (existsSync(this.storageDir)) {
        const files = this.getLogFiles();
        for (const file of files) {
          const stats = statSync(join(this.storageDir, file));
          diskUsage += stats.size;
        }
      }
    } catch (error) {
      logger.warn('LogsManager', 'Failed to calculate disk usage', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    }

    return {
      totalEntries,
      totalSessions: this.sessionSummaries.size,
      cacheSize: this.logCache.size,
      indexSize,
      diskUsage
    };
  }

  // Private methods

  private initializeStorage(): void {
    try {
      if (!existsSync(this.storageDir)) {
        mkdirSync(this.storageDir, { recursive: true });
      }
    } catch (error) {
      logger.error('LogsManager', 'Failed to initialize storage', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private loadIndexes(): void {
    try {
      // Load session summaries
      if (existsSync(this.sessionsFile)) {
        const sessionsData = JSON.parse(readFileSync(this.sessionsFile, 'utf8'));
        this.sessionSummaries = new Map(
          Object.entries(sessionsData).map(([key, value]: [string, unknown]) => {
            const summary = value as any;
            return [
              key,
              {
                ...summary,
                startTime: new Date(summary.startTime),
                endTime: summary.endTime ? new Date(summary.endTime) : undefined
              }
            ];
          })
        );
      }

      // Load search index
      if (existsSync(this.indexFile) && this.config.indexingEnabled) {
        const indexData = JSON.parse(readFileSync(this.indexFile, 'utf8'));
        this.index = new Map(
          Object.entries(indexData).map(([key, value]: [string, unknown]) => [
            key,
            new Set(value as string[])
          ])
        );
      }
    } catch (error) {
      logger.warn('LogsManager', 'Failed to load indexes, starting fresh', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    }
  }

  private async saveIndexes(): Promise<void> {
    try {
      // Save session summaries
      const sessionsData = Object.fromEntries(this.sessionSummaries);
      writeFileSync(this.sessionsFile, JSON.stringify(sessionsData, null, 2));

      // Save search index
      if (this.config.indexingEnabled) {
        const indexData = Object.fromEntries(
          Array.from(this.index.entries()).map(([key, value]) => [key, Array.from(value)])
        );
        writeFileSync(this.indexFile, JSON.stringify(indexData, null, 2));
      }
    } catch (error) {
      logger.error('LogsManager', 'Failed to save indexes', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCacheKey(source: string, agentId?: string, sessionId?: string): string {
    return `${source}:${agentId || 'global'}:${sessionId || 'default'}`;
  }

  private updateSessionSummary(entry: LogEntry): void {
    if (!entry.sessionId) {
      return;
    }

    let summary = this.sessionSummaries.get(entry.sessionId);
    if (!summary) {
      summary = {
        sessionId: entry.sessionId,
        agentId: entry.agentId || 'unknown',
        startTime: entry.timestamp,
        totalEntries: 0,
        totalTokens: 0,
        signalsDetected: [],
        errorCount: 0,
        status: 'active'
      };
      this.sessionSummaries.set(entry.sessionId, summary);
    }

    summary.totalEntries++;
    summary.totalTokens += entry.tokens || 0;

    if (entry.level === 'error' || entry.level === 'critical') {
      summary.errorCount++;
    }

    if (entry.signal && !summary.signalsDetected.includes(entry.signal)) {
      summary.signalsDetected.push(entry.signal);
    }

    // Update status if this is an error log
    if (entry.level === 'critical' && entry.message.includes('terminated')) {
      summary.status = 'terminated';
      summary.endTime = entry.timestamp;
    }
  }

  private updateIndex(entry: LogEntry): void {
    const indexableFields = [
      entry.source,
      entry.agentId,
      entry.sessionId,
      entry.prpId,
      entry.level,
      entry.signal,
      ...(entry.tags || [])
    ];

    const words = entry.message.toLowerCase().split(/\s+/);

    for (const field of indexableFields) {
      if (field) {
        const key = field.toLowerCase();
        if (!this.index.has(key)) {
          this.index.set(key, new Set());
        }
        this.index.get(key)!.add(entry.id);
      }
    }

    for (const word of words) {
      if (word.length > 2) { // Skip very short words
        if (!this.index.has(word)) {
          this.index.set(word, new Set());
        }
        this.index.get(word)!.add(entry.id);
      }
    }
  }

  private buildSearchCriteria(query: LogSearchQuery): Record<string, Set<string>> {
    const criteria: Record<string, Set<string>> = {};

    if (query.sources) {
      criteria.sources = new Set(query.sources.map(s => s.toLowerCase()));
    }
    if (query.agentIds) {
      criteria.agentIds = new Set(query.agentIds.map(a => a.toLowerCase()));
    }
    if (query.sessionIds) {
      criteria.sessionIds = new Set(query.sessionIds);
    }
    if (query.levels) {
      criteria.levels = new Set(query.levels.map(l => l.toLowerCase()));
    }
    if (query.signals) {
      criteria.signals = new Set(query.signals.map(s => s.toLowerCase()));
    }

    return criteria;
  }

  private matchesCacheKey(cacheKey: string, criteria: Record<string, Set<string>>): boolean {
    const [source, agentId] = cacheKey.split(':');

    if (criteria.sources && source && !criteria.sources.has(source.toLowerCase())) {
      return false;
    }
    if (criteria.agentIds && agentId && !criteria.agentIds.has(agentId.toLowerCase())) {
      return false;
    }

    return true;
  }

  private matchesQuery(log: LogEntry, criteria: Record<string, Set<string>>, query: LogSearchQuery): boolean {
    // Check time range
    if (query.startTime && log.timestamp < query.startTime) {
      return false;
    }
    if (query.endTime && log.timestamp > query.endTime) {
      return false;
    }

    // Check criteria
    if (criteria.sources && !criteria.sources.has(log.source.toLowerCase())) {
      return false;
    }
    if (criteria.agentIds && log.agentId && !criteria.agentIds.has(log.agentId.toLowerCase())) {
      return false;
    }
    if (criteria.levels && !criteria.levels.has(log.level.toLowerCase())) {
      return false;
    }
    if (criteria.signals && log.signal && !criteria.signals.has(log.signal.toLowerCase())) {
      return false;
    }
    if (query.tags && log.tags && !query.tags.some(tag => log.tags!.includes(tag))) {
      return false;
    }

    // Check search text
    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      const searchText = `${log.message} ${log.agentId || ''} ${log.signal || ''} ${(log.tags || []).join(' ')}`.toLowerCase();
      if (!searchText.includes(searchLower)) {
        return false;
      }
    }

    return true;
  }

  private async searchDiskFiles(query: LogSearchQuery): Promise<LogEntry[]> {
    // This is a simplified implementation - in production, would use more efficient disk search
    const entries: LogEntry[] = [];
    const files = this.getLogFiles();

    for (const file of files) {
      try {
        const filePath = join(this.storageDir, file);
        const content = readFileSync(filePath, 'utf8');

        let logs: LogEntry[];
        if (file.endsWith('.gz')) {
          const decompressed = decompressFromBase64(content);
          logs = JSON.parse(decompressed);
        } else {
          logs = JSON.parse(content);
        }

        const matchingLogs = logs.filter(log => this.matchesQuery(log, {}, query));
        entries.push(...matchingLogs);
      } catch (error) {
        logger.warn('LogsManager', `Failed to search disk file ${file}`, { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    }

    return entries;
  }

  private async flushCacheKey(cacheKey: string, logs: LogEntry[]): Promise<void> {
    try {
      const [source, agentId] = cacheKey.split(':');
      const fileName = `${source}_${agentId}_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = join(this.storageDir, fileName);

      let existingLogs: LogEntry[] = [];
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        existingLogs = JSON.parse(content);
      }

      // Combine existing and new logs, remove duplicates
      const allLogs = [...existingLogs, ...logs];
      const uniqueLogs = allLogs.filter((log, index, arr) =>
        arr.findIndex(l => l.id === log.id) === index
      );

      // Sort by timestamp
      uniqueLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Save with compression if enabled
      let contentToSave = JSON.stringify(uniqueLogs, null, 2);
      if (this.config.compressionEnabled) {
        contentToSave = compressToBase64(contentToSave);
        const compressedFileName = fileName.replace('.json', '.json.gz');
        writeFileSync(join(this.storageDir, compressedFileName), contentToSave);

        // Remove uncompressed file if it exists
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } else {
        writeFileSync(filePath, contentToSave);
      }

    } catch (error) {
      logger.error('LogsManager', `Failed to flush cache key ${cacheKey}`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private getLogFiles(): string[] {
    try {
      return require('fs').readdirSync(this.storageDir)
        .filter((file: string) => file.endsWith('.json') || file.endsWith('.json.gz'));
    } catch (error) {
      return [];
    }
  }

  private async cleanupDiskFiles(cutoffDate: Date): Promise<number> {
    let deletedCount = 0;
    const files = this.getLogFiles();

    for (const file of files) {
      try {
        const filePath = join(this.storageDir, file);
        const stats = statSync(filePath);

        if (stats.mtime < cutoffDate) {
          unlinkSync(filePath);
          deletedCount++;
        }
      } catch (error) {
        logger.warn('LogsManager', `Failed to clean up disk file ${file}`, { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    }

    return deletedCount;
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushToDisk().catch(error => {
        logger.error('LogsManager', 'Periodic flush failed', error instanceof Error ? error : new Error(String(error)));
      });
    }, this.flushInterval);
  }

  /**
   * Shutdown and cleanup resources
   */
  async shutdown(): Promise<void> {
    await this.flushToDisk();
    this.logCache.clear();
    this.index.clear();
    this.sessionSummaries.clear();
    this.removeAllListeners();

    logger.info('LogsManager', 'Logs manager shutdown complete');
  }
}