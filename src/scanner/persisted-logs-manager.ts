/**
 * ♫ Persisted Logs Manager with Search for @dcversus/prp Scanner
 *
 * Comprehensive log management with persistent storage, advanced search,
 * session summaries, and agent activity tracking capabilities.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

import { createLayerLogger, TimeUtils, HashUtils, FileUtils, ConfigUtils } from '../shared';

import type { EventBus } from '../shared/events';

const logger = createLayerLogger('scanner');
// Log entry structure
interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string; // agent, orchestrator, inspector, scanner, system
  agentId?: string;
  sessionId?: string;
  prpId?: string;
  message: string;
  data?: Record<string, unknown>;
  tags: string[];
  metadata: {
    duration?: number;
    tokens?: number;
    cost?: number;
    operation?: string;
    error?: string;
    stack?: string;
  };
}
// Session summary
interface SessionSummary {
  sessionId: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  totalLogs: number;
  logsByLevel: Record<string, number>;
  operations: Array<{
    operation: string;
    count: number;
    totalDuration: number;
    averageDuration: number;
  }>;
  tokensUsed: number;
  totalCost: number;
  errors: number;
  status: 'active' | 'completed' | 'error' | 'timeout';
  lastActivity: Date;
}
// Search query interface
interface SearchQuery {
  text?: string;
  level?: LogEntry['level'][];
  source?: string[];
  agentId?: string[];
  sessionId?: string[];
  prpId?: string[];
  tags?: string[];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'level' | 'source';
  sortOrder?: 'asc' | 'desc';
}
// Search result
interface SearchResult {
  entries: LogEntry[];
  total: number;
  hasMore: boolean;
  query: SearchQuery;
  processingTime: number;
}
// Log storage configuration
interface LogStorageConfig {
  basePath: string;
  maxFileSize: number; // bytes
  maxFilesPerSource: number;
  compressionEnabled: boolean;
  retentionDays: number;
  indexingEnabled: boolean;
  searchIndex: {
    enabled: boolean;
    updateInterval: number; // minutes
    maxResults: number;
  };
}
// Storage metrics
interface StorageMetrics {
  totalEntries: number;
  totalSize: number;
  filesCount: number;
  averageEntrySize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  sessionsCount: number;
  activeSessions: number;
}
/**
 * Persisted Logs Manager with Search Capabilities
 */
export class PersistedLogsManager extends EventEmitter {
  private readonly eventBus: EventBus;
  private readonly config: LogStorageConfig;
  private readonly basePath: string;
  private readonly logBuffer: LogEntry[] = [];
  private readonly activeSessions = new Map<string, SessionSummary>();
  private readonly searchIndex = new Map<string, Set<string>>(); // keyword -> entry IDs
  // Performance metrics
  private readonly metrics: StorageMetrics;
  private indexingTimer: NodeJS.Timeout | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  constructor(eventBus: EventBus, config: Partial<LogStorageConfig> = {}) {
    super();
    this.eventBus = eventBus;
    // Default configuration
    this.config = {
      basePath: '.prp/logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFilesPerSource: 100,
      compressionEnabled: false,
      retentionDays: 30,
      indexingEnabled: true,
      searchIndex: {
        enabled: true,
        updateInterval: 5, // 5 minutes
        maxResults: 1000,
      },
      ...config,
    };
    this.basePath = resolve(this.config.basePath);
    // Initialize metrics
    this.metrics = {
      totalEntries: 0,
      totalSize: 0,
      filesCount: 0,
      averageEntrySize: 0,
      oldestEntry: null,
      newestEntry: null,
      sessionsCount: 0,
      activeSessions: 0,
    };
  }
  /**
   * Initialize the logs manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('PersistedLogsManager', 'Initializing persisted logs manager...');
      // Ensure base directory exists
      await this.ensureDirectoryStructure();
      // Load existing sessions
      await this.loadActiveSessions();
      // Load search index
      if (this.config.searchIndex.enabled) {
        await this.loadSearchIndex();
        this.startIndexing();
      }
      // Start periodic flushing
      this.startPeriodicFlush();
      logger.info('PersistedLogsManager', '✅ Persisted logs manager initialized', {
        basePath: this.basePath,
        activeSessions: this.activeSessions.size,
      });
      this.emit('manager:initialized', {
        basePath: this.basePath,
        activeSessions: this.activeSessions.size,
        timestamp: TimeUtils.now(),
      });
    } catch (error) {
      logger.error(
        'PersistedLogsManager',
        'Failed to initialize logs manager',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Log an entry
   */
  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logEntry: LogEntry = {
      id: randomUUID(),
      timestamp: TimeUtils.now(),
      ...entry,
    };
    // Add to buffer
    this.logBuffer.push(logEntry);
    // Update session if applicable
    if (logEntry.sessionId) {
      this.updateSessionActivity(logEntry.sessionId, logEntry);
    }
    // Update metrics
    this.metrics.totalEntries++;
    if (!this.metrics.oldestEntry || logEntry.timestamp < this.metrics.oldestEntry) {
      this.metrics.oldestEntry = logEntry.timestamp;
    }
    if (!this.metrics.newestEntry || logEntry.timestamp > this.metrics.newestEntry) {
      this.metrics.newestEntry = logEntry.timestamp;
    }
    // Add to search index if enabled
    if (this.config.searchIndex.enabled) {
      this.addToSearchIndex(logEntry);
    }
    // Flush buffer if it's getting large
    if (this.logBuffer.length >= 100) {
      this.flushBuffer();
    }
    // Emit log event
    this.emit('log:added', {
      entry: logEntry,
      bufferSize: this.logBuffer.length,
      timestamp: TimeUtils.now(),
    });
  }
  /**
   * Search logs with advanced filtering
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    try {
      // Validate query
      const validatedQuery = this.validateSearchQuery(query);
      // Search in memory buffer first
      const bufferResults = this.searchBuffer(validatedQuery);
      // Search in persisted files
      const fileResults = await this.searchFiles(validatedQuery);
      // Combine and sort results
      const allResults = [...bufferResults, ...fileResults];
      const sortedResults = this.sortResults(allResults, validatedQuery);
      // Apply pagination
      const offset = validatedQuery.offset ?? 0;
      const limit = validatedQuery.limit ?? 100;
      const paginatedResults = sortedResults.slice(offset, offset + limit);
      const result: SearchResult = {
        entries: paginatedResults,
        total: sortedResults.length,
        hasMore: offset + limit < sortedResults.length,
        query: validatedQuery,
        processingTime: Date.now() - startTime,
      };
      logger.debug('PersistedLogsManager', 'Search completed', {
        query: validatedQuery,
        resultsFound: result.total,
        processingTime: result.processingTime,
      });
      return result;
    } catch (error) {
      logger.error(
        'PersistedLogsManager',
        'Search failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          query,
        },
      );
      return {
        entries: [],
        total: 0,
        hasMore: false,
        query,
        processingTime: Date.now() - startTime,
      };
    }
  }
  /**
   * Get logs for a specific session
   */
  async getSessionLogs(
    sessionId: string,
    options: {
      limit?: number;
      level?: LogEntry['level'][];
    } = {},
  ): Promise<LogEntry[]> {
    return this.search({
      sessionId: [sessionId],
      level: options.level,
      limit: options.limit ?? 1000,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    }).then((result) => result.entries);
  }
  /**
   * Get logs for a specific agent
   */
  async getAgentLogs(
    agentId: string,
    options: {
      limit?: number;
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): Promise<LogEntry[]> {
    return this.search({
      agentId: [agentId],
      startTime: options.startTime,
      endTime: options.endTime,
      limit: options.limit ?? 1000,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    }).then((result) => result.entries);
  }
  /**
   * Get logs for a specific PRP
   */
  async getPRPLogs(
    prpId: string,
    options: {
      limit?: number;
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): Promise<LogEntry[]> {
    return this.search({
      prpId: [prpId],
      startTime: options.startTime,
      endTime: options.endTime,
      limit: options.limit ?? 1000,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    }).then((result) => result.entries);
  }
  /**
   * Get recent logs (last N entries)
   */
  async getRecentLogs(limit = 100, level?: LogEntry['level'][]): Promise<LogEntry[]> {
    return this.search({
      level,
      limit,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    }).then((result) => result.entries);
  }
  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): SessionSummary | null {
    return this.activeSessions.get(sessionId) ?? null;
  }
  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionSummary[] {
    return Array.from(this.activeSessions.values());
  }
  /**
   * Start a new session
   */
  startSession(agentId: string, prpId?: string): string {
    const sessionId = randomUUID();
    const summary: SessionSummary = {
      sessionId,
      agentId,
      startTime: TimeUtils.now(),
      totalLogs: 0,
      logsByLevel: {},
      operations: [],
      tokensUsed: 0,
      totalCost: 0,
      errors: 0,
      status: 'active',
      lastActivity: TimeUtils.now(),
    };
    this.activeSessions.set(sessionId, summary);
    this.metrics.sessionsCount++;
    this.metrics.activeSessions++;
    logger.info('PersistedLogsManager', 'Session started', {
      sessionId,
      agentId,
      prpId,
    });
    this.emit('session:started', {
      sessionId,
      agentId,
      prpId,
      timestamp: TimeUtils.now(),
    });
    return sessionId;
  }
  /**
   * End a session
   */
  endSession(sessionId: string, status: SessionSummary['status'] = 'completed'): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }
    session.endTime = TimeUtils.now();
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    session.status = status;
    this.activeSessions.delete(sessionId);
    this.metrics.activeSessions--;
    // Persist session summary
    this.persistSessionSummary(session);
    logger.info('PersistedLogsManager', 'Session ended', {
      sessionId,
      agentId: session.agentId,
      duration: session.duration,
      status,
      totalLogs: session.totalLogs,
    });
    this.emit('session:ended', {
      sessionId,
      session,
      timestamp: TimeUtils.now(),
    });
  }
  /**
   * Get storage metrics
   */
  getMetrics(): StorageMetrics {
    return {
      ...this.metrics,
      averageEntrySize:
        this.metrics.totalEntries > 0 ? this.metrics.totalSize / this.metrics.totalEntries : 0,
    };
  }
  /**
   * Force flush buffer to disk
   */
  async flushBuffer(): Promise<void> {
    if (this.isFlushing || this.logBuffer.length === 0) {
      return;
    }
    this.isFlushing = true;
    try {
      const entriesToFlush = this.logBuffer.splice(0);
      // Group by source for efficient storage
      const entriesBySource = new Map<string, LogEntry[]>();
      for (const entry of entriesToFlush) {
        const {source} = entry;
        if (!entriesBySource.has(source)) {
          entriesBySource.set(source, []);
        }
        entriesBySource.get(source)!.push(entry);
      }
      // Flush each source group
      for (const [source, entries] of entriesBySource.entries()) {
        await this.persistLogEntries(source, entries);
      }
      this.metrics.totalSize += entriesToFlush.reduce(
        (sum, entry) => sum + JSON.stringify(entry).length,
        0,
      );
      logger.debug('PersistedLogsManager', 'Buffer flushed', {
        entriesCount: entriesToFlush.length,
        sources: entriesBySource.size,
      });
      this.emit('buffer:flushed', {
        entriesCount: entriesToFlush.length,
        timestamp: TimeUtils.now(),
      });
    } catch (error) {
      logger.error(
        'PersistedLogsManager',
        'Failed to flush buffer',
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      this.isFlushing = false;
    }
  }
  /**
   * Stop logs manager and cleanup
   */
  async stop(): Promise<void> {
    logger.info('PersistedLogsManager', 'Stopping persisted logs manager...');
    // Stop timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.indexingTimer) {
      clearInterval(this.indexingTimer);
      this.indexingTimer = null;
    }
    // Flush remaining buffer
    await this.flushBuffer();
    // End active sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      this.endSession(sessionId, 'completed');
    }
    // Persist search index
    if (this.config.searchIndex.enabled) {
      await this.persistSearchIndex();
    }
    logger.info('PersistedLogsManager', '✅ Persisted logs manager stopped');
  }
  // Private methods
  private async ensureDirectoryStructure(): Promise<void> {
    const directories = [
      this.basePath,
      resolve(this.basePath, 'sources'),
      resolve(this.basePath, 'sessions'),
      resolve(this.basePath, 'index'),
    ];
    for (const dir of directories) {
      await mkdir(dir, { recursive: true });
    }
  }
  private async loadActiveSessions(): Promise<void> {
    try {
      const sessionsPath = resolve(this.basePath, 'sessions', 'active.json');
      if (!existsSync(sessionsPath)) {
        return;
      }
      const data = await ConfigUtils.loadConfigFile<{ sessions: SessionSummary[] }>(sessionsPath);
      if (!data?.sessions) {
        return;
      }
      for (const session of data.sessions) {
        this.activeSessions.set(session.sessionId, session);
        this.metrics.sessionsCount++;
      }
      logger.debug('PersistedLogsManager', 'Active sessions loaded', {
        count: this.activeSessions.size,
      });
    } catch (error) {
      logger.warn('PersistedLogsManager', 'Failed to load active sessions', { error });
    }
  }
  private async loadSearchIndex(): Promise<void> {
    try {
      const indexPath = resolve(this.basePath, 'index', 'search.json');
      if (!existsSync(indexPath)) {
        return;
      }
      const data = await ConfigUtils.loadConfigFile<{ index: Record<string, string[]> }>(indexPath);
      if (!data?.index) {
        return;
      }
      for (const [keyword, entryIds] of Object.entries(data.index)) {
        this.searchIndex.set(keyword, new Set(entryIds));
      }
      logger.debug('PersistedLogsManager', 'Search index loaded', {
        keywords: this.searchIndex.size,
      });
    } catch (error) {
      logger.warn('PersistedLogsManager', 'Failed to load search index', { error });
    }
  }
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, 5000); // Flush every 5 seconds
  }
  private startIndexing(): void {
    if (!this.config.searchIndex.enabled) {
      return;
    }
    this.indexingTimer = setInterval(
      async () => {
        await this.persistSearchIndex();
      },
      this.config.searchIndex.updateInterval * 60 * 1000,
    );
  }
  private updateSessionActivity(sessionId: string, logEntry: LogEntry): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }
    session.lastActivity = logEntry.timestamp;
    session.totalLogs++;
    // Update level counts
    const {level} = logEntry;
    session.logsByLevel[level] = (session.logsByLevel[level] ?? 0) + 1;
    // Update operation tracking
    if (logEntry.metadata.operation) {
      const existing = session.operations.find(
        (op) => op.operation === logEntry.metadata.operation!,
      );
      if (existing) {
        existing.count++;
        existing.totalDuration += logEntry.metadata.duration ?? 0;
        existing.averageDuration = existing.totalDuration / existing.count;
      } else {
        session.operations.push({
          operation: logEntry.metadata.operation,
          count: 1,
          totalDuration: logEntry.metadata.duration ?? 0,
          averageDuration: logEntry.metadata.duration ?? 0,
        });
      }
    }
    // Update tokens and cost
    if (logEntry.metadata.tokens) {
      session.tokensUsed += logEntry.metadata.tokens;
    }
    if (logEntry.metadata.cost) {
      session.totalCost += logEntry.metadata.cost;
    }
    // Update error count
    if (logEntry.level === 'error' || logEntry.level === 'fatal') {
      session.errors++;
    }
  }
  private addToSearchIndex(logEntry: LogEntry): void {
    const keywords = this.extractKeywords(logEntry);
    for (const keyword of keywords) {
      if (!this.searchIndex.has(keyword)) {
        this.searchIndex.set(keyword, new Set());
      }
      this.searchIndex.get(keyword)!.add(logEntry.id);
    }
  }
  private extractKeywords(logEntry: LogEntry): string[] {
    const keywords = new Set<string>();
    // Add basic fields
    keywords.add(logEntry.level);
    keywords.add(logEntry.source);
    if (logEntry.agentId) {
      keywords.add(logEntry.agentId);
    }
    if (logEntry.sessionId) {
      keywords.add(logEntry.sessionId);
    }
    if (logEntry.prpId) {
      keywords.add(logEntry.prpId);
    }
    // Add tags
    for (const tag of logEntry.tags) {
      keywords.add(tag);
    }
    // Extract words from message
    const words = logEntry.message.toLowerCase().split(/\W+/);
    for (const word of words) {
      if (word.length >= 3) {
        // Only index words 3+ characters
        keywords.add(word);
      }
    }
    // Extract operation
    if (logEntry.metadata.operation) {
      keywords.add(logEntry.metadata.operation);
    }
    return Array.from(keywords);
  }
  private validateSearchQuery(query: SearchQuery): SearchQuery {
    return {
      limit: Math.min(query.limit ?? 100, this.config.searchIndex.maxResults),
      offset: Math.max(query.offset ?? 0, 0),
      sortBy: query.sortBy ?? 'timestamp',
      sortOrder: query.sortOrder ?? 'desc',
      ...query,
    };
  }
  private searchBuffer(query: SearchQuery): LogEntry[] {
    return this.logBuffer.filter((entry) => this.matchesQuery(entry, query));
  }
  private async searchFiles(query: SearchQuery): Promise<LogEntry[]> {
    const results: LogEntry[] = [];
    try {
      const sourcesDir = resolve(this.basePath, 'sources');
      const { glob } = await import('glob');
      // Find all log files
      const logFiles = glob.sync('*.jsonl', {
        cwd: sourcesDir,
        absolute: true,
      });
      for (const filePath of logFiles) {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n');
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          try {
            const entry = JSON.parse(line) as LogEntry;
            if (this.matchesQuery(entry, query)) {
              results.push(entry);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      logger.warn('PersistedLogsManager', 'Error searching files', { error });
    }
    return results;
  }
  private matchesQuery(entry: LogEntry, query: SearchQuery): boolean {
    // Text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      const entryText =
        `${entry.message} ${entry.data ? JSON.stringify(entry.data) : ''}`.toLowerCase();
      if (!entryText.includes(searchText)) {
        return false;
      }
    }
    // Level filter
    if (query.level && query.level.length > 0) {
      if (!query.level.includes(entry.level)) {
        return false;
      }
    }
    // Source filter
    if (query.source && query.source.length > 0) {
      if (!query.source.includes(entry.source)) {
        return false;
      }
    }
    // Agent filter
    if (query.agentId && query.agentId.length > 0) {
      if (!entry.agentId || !query.agentId.includes(entry.agentId)) {
        return false;
      }
    }
    // Session filter
    if (query.sessionId && query.sessionId.length > 0) {
      if (!entry.sessionId || !query.sessionId.includes(entry.sessionId)) {
        return false;
      }
    }
    // PRP filter
    if (query.prpId && query.prpId.length > 0) {
      if (!entry.prpId || !query.prpId.includes(entry.prpId)) {
        return false;
      }
    }
    // Time range filter
    if (query.startTime && entry.timestamp < query.startTime) {
      return false;
    }
    if (query.endTime && entry.timestamp > query.endTime) {
      return false;
    }
    // Tags filter
    if (query.tags && query.tags.length > 0) {
      const hasAllTags = query.tags.every((tag) => entry.tags.includes(tag));
      if (!hasAllTags) {
        return false;
      }
    }
    return true;
  }
  private sortResults(results: LogEntry[], query: SearchQuery): LogEntry[] {
    const multiplier = query.sortOrder === 'asc' ? 1 : -1;
    return results.sort((a, b) => {
      switch (query.sortBy) {
        case 'timestamp':
          return (a.timestamp.getTime() - b.timestamp.getTime()) * multiplier;
        case 'level': {
          const levelOrder = { debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
          const aLevel = levelOrder[a.level] ?? 0;
          const bLevel = levelOrder[b.level] ?? 0;
          return (aLevel - bLevel) * multiplier;
        }
        case 'source':
          return a.source.localeCompare(b.source) * multiplier;
        default:
          return 0;
      }
    });
  }
  private async persistLogEntries(source: string, entries: LogEntry[]): Promise<void> {
    const sourceDir = resolve(this.basePath, 'sources');
    const filePath = resolve(sourceDir, `${source}.jsonl`);
    const lines = entries.map((entry) => JSON.stringify(entry)).join('\n');
    await FileUtils.appendTextFile(filePath, `${lines  }\n`);
  }
  private async persistSessionSummary(session: SessionSummary): Promise<void> {
    const sessionsDir = resolve(this.basePath, 'sessions');
    const filePath = resolve(sessionsDir, `${session.sessionId}.json`);
    await FileUtils.writeTextFile(filePath, JSON.stringify(session, null, 2));
  }
  private async persistSearchIndex(): Promise<void> {
    if (!this.config.searchIndex.enabled) {
      return;
    }
    try {
      const indexPath = resolve(this.basePath, 'index', 'search.json');
      const indexData: Record<string, string[]> = {};
      for (const [keyword, entryIds] of this.searchIndex.entries()) {
        indexData[keyword] = Array.from(entryIds);
      }
      const data = {
        index: indexData,
        lastUpdated: TimeUtils.now().toISOString(),
        version: '1.0.0',
      };
      await FileUtils.writeTextFile(indexPath, JSON.stringify(data, null, 2));
      logger.debug('PersistedLogsManager', 'Search index persisted', {
        keywords: this.searchIndex.size,
      });
    } catch (error) {
      logger.error(
        'PersistedLogsManager',
        'Failed to persist search index',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
