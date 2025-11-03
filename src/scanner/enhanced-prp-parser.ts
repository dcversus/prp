/**
 * ♫ Enhanced PRP Parser for @dcversus/prp Signal System
 *
 * Advanced PRP parsing with version caching, synchronization, and real-time updates.
 * Provides comprehensive PRP analysis with signal detection and change tracking.
 */

import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { Signal } from '../shared/types';
import { SignalDetectorImpl } from './signal-detector';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('scanner');

export interface EnhancedPRPFile {
  path: string;
  name: string;
  content: string;
  lastModified: Date;
  size: number;
  hash: string;
  version: number;
  metadata: EnhancedPRPMetadata;
  changes: PRPChange[];
  signals: Signal[];
}

export interface EnhancedPRPMetadata {
  title: string;
  status: 'planning' | 'active' | 'testing' | 'review' | 'completed' | 'blocked' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  signals: PRPSignal[];
  requirements: PRPRequirement[];
  acceptanceCriteria: PRPAcceptanceCriterion[];
  lastUpdated: Date;
  estimatedTokens: number;
  version: number;
  createdAt: Date;
  completedAt?: Date;
  tags: string[];
  dependencies: string[];
  blockers: string[];
}

export interface PRPRequirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'deferred';
  assignedTo?: string;
  estimatedTokens: number;
  dependencies: string[];
  acceptanceCriteria: string[];
  progress: number;
}

export interface PRPAcceptanceCriterion {
  id: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  testEvidence?: string;
  linkedRequirement?: string;
  automated: boolean;
}

export interface PRPSignal {
  id: string;
  code: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  content: string;
  line: number;
  column: number;
  context: string;
  timestamp: Date;
  agent?: string;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface PRPChange {
  id: string;
  type: 'created' | 'modified' | 'deleted' | 'moved';
  timestamp: Date;
  previousVersion?: number;
  currentVersion: number;
  changes: {
    content: boolean;
    metadata: boolean;
    signals: boolean;
    requirements: boolean;
  };
  agent?: string;
  commit?: string;
}

export interface PRPVersion {
  version: number;
  timestamp: Date;
  hash: string;
  changes: PRPChange[];
  content: string;
  metadata: EnhancedPRPMetadata;
  signals: Signal[];
}

export interface PRPCacheEntry {
  file: EnhancedPRPFile;
  versions: PRPVersion[];
  lastScanned: Date;
  lastModified: Date;
  hash: string;
}

/**
 * Enhanced PRP Parser with version caching and synchronization
 */
export class EnhancedPRPParser {
  private signalDetector: SignalDetectorImpl;
  private cache: Map<string, PRPCacheEntry> = new Map();
  private cacheDirectory: string;
  private maxCacheSize = 1000;
  private maxVersionsPerPRP = 50;
  private cacheTimeout = 300000; // 5 minutes

  constructor(cacheDirectory = '.prp/prp-cache') {
    this.signalDetector = new SignalDetectorImpl();
    this.cacheDirectory = cacheDirectory;
    this.initializeCacheDirectory();
  }

  /**
   * Initialize cache directory
   */
  private async initializeCacheDirectory(): Promise<void> {
    try {
      if (!existsSync(this.cacheDirectory)) {
        await mkdir(this.cacheDirectory, { recursive: true });
        logger.info('EnhancedPRPParser', `Created cache directory: ${this.cacheDirectory}`);
      }
    } catch (error) {
      logger.warn('EnhancedPRPParser', `Failed to create cache directory: ${this.cacheDirectory}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Discover PRP files in a directory
   */
  async discoverPRPFiles(rootDir: string): Promise<string[]> {
    const prpFiles: string[] = [];

    try {
      await this.scanDirectory(rootDir, prpFiles);
      logger.debug('EnhancedPRPParser', `Discovered ${prpFiles.length} PRP files in ${rootDir}`);
    } catch (error) {
      logger.error('EnhancedPRPParser', `Error scanning directory ${rootDir}`, error instanceof Error ? error : new Error(String(error)));
    }

    return prpFiles;
  }

  /**
   * Parse a PRP file with caching and version tracking
   */
  async parsePRPFile(filePath: string, forceRefresh = false): Promise<EnhancedPRPFile | null> {
    try {
      if (!existsSync(filePath)) {
        logger.warn('EnhancedPRPParser', `PRP file does not exist: ${filePath}`);
        return null;
      }

      const stats = await stat(filePath);
      const content = await readFile(filePath, 'utf8');
      const fileHash = await HashUtils.hashString(content);
      const cacheKey = (await HashUtils.hashString(filePath)).substring(0, 16);

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (!forceRefresh && cached && this.isCacheValid(cached, stats, fileHash)) {
        logger.debug('EnhancedPRPParser', `Using cached version for ${filePath}`);
        return cached.file;
      }

      // Hash the content (already read above)
      const contentHash = await HashUtils.hashString(content);

      // Detect signals in content
      const signals = await this.signalDetector.detectSignals(content, filePath);

      // Extract enhanced metadata
      const metadata = this.extractEnhancedMetadata(content, filePath, signals);

      // Determine changes
      const changes = this.detectChanges(cached?.file, content, metadata, signals);

      // Create enhanced PRP file
      const prpFile: EnhancedPRPFile = {
        path: filePath,
        name: this.extractPRPName(filePath),
        content,
        lastModified: stats.mtime,
        size: stats.size,
        hash: contentHash,
        version: this.calculateVersion(cached?.file, contentHash),
        metadata,
        changes,
        signals
      };

      // Update cache
      await this.updateCache(cacheKey, prpFile, changes);

      logger.debug('EnhancedPRPParser', `Parsed PRP file: ${filePath}`, {
        version: prpFile.version,
        signals: signals.length,
        changes: changes.length
      });

      return prpFile;

    } catch (error) {
      logger.error('EnhancedPRPParser', `Error parsing PRP file ${filePath}`, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Parse multiple PRP files with parallel processing
   */
  async parseMultiplePRPFiles(filePaths: string[], forceRefresh = false): Promise<EnhancedPRPFile[]> {
    const results: EnhancedPRPFile[] = [];

    // Process files in parallel batches
    const batchSize = 10;
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchPromises = batch.map(filePath =>
        this.parsePRPFile(filePath, forceRefresh)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((result): result is EnhancedPRPFile => result !== null));
    }

    logger.debug('EnhancedPRPParser', `Parsed ${results.length} PRP files from ${filePaths.length} paths`);
    return results;
  }

  /**
   * Get PRP file version history
   */
  async getVersionHistory(filePath: string): Promise<PRPVersion[]> {
    const cacheKey = (await HashUtils.hashString(filePath)).substring(0, 16);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return [];
    }

    return cached.versions.sort((a, b) => b.version - a.version);
  }

  /**
   * Get PRP file by version
   */
  async getPRPByVersion(filePath: string, version: number): Promise<PRPVersion | null> {
    const history = await this.getVersionHistory(filePath);
    return history.find(v => v.version === version) || null;
  }

  /**
   * Compare two versions of a PRP file
   */
  async compareVersions(filePath: string, version1: number, version2: number): Promise<{
    version1: PRPVersion;
    version2: PRPVersion;
    differences: PRPChange[];
  } | null> {
    const v1 = await this.getPRPByVersion(filePath, version1);
    const v2 = await this.getPRPByVersion(filePath, version2);

    if (!v1 || !v2) {
      return null;
    }

    const oldFile: EnhancedPRPFile = {
      path: filePath,
      name: `v${v1.version}`,
      content: v1.content,
      lastModified: v1.timestamp,
      size: v1.content.length,
      hash: v1.hash,
      version: v1.version,
      metadata: v1.metadata,
      changes: v1.changes,
      signals: v1.signals
    };

    const differences = this.detectChanges(
      oldFile,
      v2.content,
      v2.metadata,
      v2.signals
    );

    return {
      version1: v1,
      version2: v2,
      differences
    };
  }

  /**
   * Sync PRP files with remote changes
   */
  async syncPRPFiles(worktreePath: string): Promise<{
    updated: string[];
    added: string[];
    deleted: string[];
  }> {
    const result = {
      updated: [] as string[],
      added: [] as string[],
      deleted: [] as string[]
    };

    try {
      // Discover current PRP files
      const currentFiles = await this.discoverPRPFiles(worktreePath);
      const currentFileSet = new Set(currentFiles);

      // Get cached files
      const cachedFiles = Array.from(this.cache.keys())
        .map(key => this.cache.get(key)?.file.path)
        .filter((path): path is string => path !== undefined && path.startsWith(worktreePath));

      const cachedFileSet = new Set(cachedFiles);

      // Find added files
      for (const filePath of currentFiles) {
        if (!cachedFileSet.has(filePath)) {
          result.added.push(filePath);
          await this.parsePRPFile(filePath, true);
        }
      }

      // Find deleted files
      for (const filePath of cachedFiles) {
        if (!currentFileSet.has(filePath)) {
          result.deleted.push(filePath);
          const cacheKey = (await HashUtils.hashString(filePath)).substring(0, 16);
          this.cache.delete(cacheKey);
        }
      }

      // Find updated files
      for (const filePath of currentFiles) {
        const cacheKey = (await HashUtils.hashString(filePath)).substring(0, 16);
        const cached = this.cache.get(cacheKey);

        if (cached) {
          const stats = await stat(filePath);
          if (stats.mtime > cached.lastModified) {
            result.updated.push(filePath);
            await this.parsePRPFile(filePath, true);
          }
        }
      }

      logger.info('EnhancedPRPParser', `Sync completed for ${worktreePath}`, result);

    } catch (error) {
      logger.error('EnhancedPRPParser', `Error syncing PRP files in ${worktreePath}`, error instanceof Error ? error : new Error(String(error)));
    }

    return result;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(cached: PRPCacheEntry, stats: any, fileHash: string): boolean {
    return (
      cached.lastModified.getTime() === stats.mtime.getTime() &&
      cached.hash === fileHash &&
      (Date.now() - cached.lastScanned.getTime()) < this.cacheTimeout
    );
  }

  /**
   * Detect changes between old and new PRP versions
   */
  private detectChanges(
    oldFile: EnhancedPRPFile | undefined,
    newContent: string,
    newMetadata: EnhancedPRPMetadata,
    newSignals: Signal[]
  ): PRPChange[] {
    const changes: PRPChange[] = [];

    if (!oldFile) {
      // New file
      changes.push({
        id: HashUtils.generateId(),
        type: 'created',
        timestamp: new Date(),
        currentVersion: 1,
        changes: {
          content: true,
          metadata: true,
          signals: true,
          requirements: true
        }
      });
      return changes;
    }

    const hasContentChanges = oldFile.content !== newContent;
    const hasMetadataChanges = JSON.stringify(oldFile.metadata) !== JSON.stringify(newMetadata);
    const hasSignalChanges = oldFile.signals.length !== newSignals.length ||
      !oldFile.signals.every(s => newSignals.some(ns => ns.id === s.id));
    const hasRequirementChanges = oldFile.metadata.requirements.length !== newMetadata.requirements.length ||
      !oldFile.metadata.requirements.every(r => newMetadata.requirements.some(nr => nr.id === r.id));

    if (hasContentChanges || hasMetadataChanges || hasSignalChanges || hasRequirementChanges) {
      changes.push({
        id: HashUtils.generateId(),
        type: 'modified',
        timestamp: new Date(),
        previousVersion: oldFile.version,
        currentVersion: oldFile.version + 1,
        changes: {
          content: hasContentChanges,
          metadata: hasMetadataChanges,
          signals: hasSignalChanges,
          requirements: hasRequirementChanges
        }
      });
    }

    return changes;
  }

  /**
   * Calculate version number for PRP file
   */
  private calculateVersion(oldFile: EnhancedPRPFile | undefined, newHash: string): number {
    if (!oldFile) {
      return 1;
    }

    return oldFile.hash === newHash ? oldFile.version : oldFile.version + 1;
  }

  /**
   * Update cache with new PRP file data
   */
  private async updateCache(cacheKey: string, prpFile: EnhancedPRPFile, changes: PRPChange[]): Promise<void> {
    try {
      const cached = this.cache.get(cacheKey);

      const version: PRPVersion = {
        version: prpFile.version,
        timestamp: new Date(),
        hash: prpFile.hash,
        changes: changes,
        content: prpFile.content,
        metadata: prpFile.metadata,
        signals: prpFile.signals
      };

      const cacheEntry: PRPCacheEntry = {
        file: prpFile,
        versions: cached ? [...cached.versions, version] : [version],
        lastScanned: new Date(),
        lastModified: prpFile.lastModified,
        hash: prpFile.hash
      };

      // Limit version history
      if (cacheEntry.versions.length > this.maxVersionsPerPRP) {
        cacheEntry.versions = cacheEntry.versions
          .sort((a, b) => b.version - a.version)
          .slice(0, this.maxVersionsPerPRP);
      }

      this.cache.set(cacheKey, cacheEntry);

      // Trim cache if needed
      if (this.cache.size > this.maxCacheSize) {
        this.trimCache();
      }

      // Persist cache to disk
      await this.persistCache();

    } catch (error) {
      logger.warn('EnhancedPRPParser', `Failed to update cache for ${cacheKey}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Trim cache to prevent memory issues
   */
  private trimCache(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastScanned.getTime() - b[1].lastScanned.getTime());

    const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
    toRemove.forEach(([key]) => this.cache.delete(key));

    logger.debug('EnhancedPRPParser', `Trimmed cache, removed ${toRemove.length} entries`);
  }

  /**
   * Persist cache to disk
   */
  private async persistCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.cache);
      const cacheFile = join(this.cacheDirectory, 'prp-cache.json');
      await writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      logger.warn('EnhancedPRPParser', 'Failed to persist cache to disk', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Recursively scan directory for PRP files
   */
  private async scanDirectory(dir: string, prpFiles: string[]): Promise<void> {
    try {
      const items = await readdir(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          await this.scanDirectory(fullPath, prpFiles);
        } else if (stats.isFile() && this.isPRPFile(fullPath)) {
          prpFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Check if a file is a PRP file
   */
  private isPRPFile(filePath: string): boolean {
    const patterns = [
      /^PRPs\/.*\.md$/,
      /^PRP-.*\.md$/,
      /.*-prp-.*\.md$/,
      /.*prp.*\.md$/i
    ];

    return patterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Extract PRP name from file path
   */
  private extractPRPName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] || '';
    return fileName.replace('.md', '');
  }

  /**
   * Extract enhanced metadata from PRP content
   */
  private extractEnhancedMetadata(content: string, _filePath: string, signals: Signal[]): EnhancedPRPMetadata {
    const lines = content.split('\n');

    // Extract basic metadata
    const title = this.extractTitle(lines);
    const status = this.extractStatus(lines);
    const priority = this.extractPriority(lines);
    const assignedAgent = this.extractAssignedAgent(lines);
    const requirements = this.extractEnhancedRequirements(lines);
    const acceptanceCriteria = this.extractEnhancedAcceptanceCriteria(lines);
    const estimatedTokens = this.estimateTokens(content);
    const tags = this.extractTags(lines);
    const dependencies = this.extractDependencies(lines);
    const blockers = this.extractBlockers(lines);

    // Extract signal information
    const prpSignals: PRPSignal[] = signals.map(signal => ({
      id: signal.id,
      code: signal.type,
      priority: this.mapSignalPriority(signal.priority),
      category: (signal.data?.category as string) || 'general',
      content: (signal.data?.rawSignal as string) || '',
      line: 0, // Would need line number from parsing
      column: 0,
      context: '',
      timestamp: signal.timestamp,
      agent: signal.metadata?.agent,
      resolved: false
    }));

    const now = new Date();
    const metadata: EnhancedPRPMetadata = {
      title,
      status,
      priority,
      assignedAgent,
      signals: prpSignals,
      requirements,
      acceptanceCriteria,
      lastUpdated: now,
      estimatedTokens,
      version: 1,
      createdAt: now,
      tags,
      dependencies,
      blockers
    };

    return metadata;
  }

  /**
   * Extract title from PRP content
   */
  private extractTitle(lines: string[]): string {
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return 'Untitled PRP';
  }

  /**
   * Extract status from PRP content
   */
  private extractStatus(lines: string[]): EnhancedPRPMetadata['status'] {
    const content = lines.join(' ').toLowerCase();

    if (content.includes('status: planning') || content.includes('## planning')) {
      return 'planning';
    } else if (content.includes('status: active') || content.includes('## active')) {
      return 'active';
    } else if (content.includes('status: testing') || content.includes('## testing')) {
      return 'testing';
    } else if (content.includes('status: review') || content.includes('## review')) {
      return 'review';
    } else if (content.includes('status: completed') || content.includes('## completed')) {
      return 'completed';
    } else if (content.includes('status: blocked') || content.includes('## blocked')) {
      return 'blocked';
    } else if (content.includes('status: archived') || content.includes('## archived')) {
      return 'archived';
    }

    return 'planning';
  }

  /**
   * Extract priority from PRP content
   */
  private extractPriority(lines: string[]): EnhancedPRPMetadata['priority'] {
    const content = lines.join(' ').toLowerCase();

    if (content.includes('priority: critical') || content.includes('## critical')) {
      return 'critical';
    } else if (content.includes('priority: high') || content.includes('## high')) {
      return 'high';
    } else if (content.includes('priority: medium') || content.includes('## medium')) {
      return 'medium';
    } else if (content.includes('priority: low') || content.includes('## low')) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Extract assigned agent from PRP content
   */
  private extractAssignedAgent(lines: string[]): string | undefined {
    const content = lines.join(' ');

    const match = content.match(/assigned agent[:\s]+([^\n\r]+)/i);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract enhanced requirements from PRP content
   */
  private extractEnhancedRequirements(lines: string[]): PRPRequirement[] {
    const requirements: PRPRequirement[] = [];
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || '').trim();

      if (line.startsWith('##')) {
        currentSection = line.toLowerCase();
        continue;
      }

      if (currentSection.includes('requirement') && (line.startsWith('-') || line.match(/^\d+\./))) {
        const reqMatch = line.match(/^[-\d.]+\s*(.+)$/);
        if (reqMatch) {
          requirements.push({
            id: `REQ-${requirements.length + 1}`,
            title: (reqMatch[1] || '').trim(),
            description: (reqMatch[1] || '').trim(),
            status: 'pending',
            estimatedTokens: Math.ceil((reqMatch[1] || '').length / 4),
            dependencies: [],
            acceptanceCriteria: [],
            progress: 0
          });
        }
      }
    }

    return requirements;
  }

  /**
   * Extract enhanced acceptance criteria from PRP content
   */
  private extractEnhancedAcceptanceCriteria(lines: string[]): PRPAcceptanceCriterion[] {
    const criteria: PRPAcceptanceCriterion[] = [];
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || '').trim();

      if (line.startsWith('##')) {
        currentSection = line.toLowerCase();
        continue;
      }

      if (currentSection.includes('acceptance') && (line.startsWith('-') || line.match(/^\d+\./))) {
        criteria.push({
          id: `AC-${criteria.length + 1}`,
          description: line.replace(/^[-\d.]+\s*/, '').trim(),
          status: 'pending',
          automated: false
        });
      }
    }

    return criteria;
  }

  /**
   * Extract tags from PRP content
   */
  private extractTags(lines: string[]): string[] {
    const content = lines.join(' ');
    const tags: string[] = [];

    // Extract tags from various formats
    const tagMatch = content.match(/tags?[:\s]+([^\n\r]+)/i);
    if (tagMatch) {
      const tagString = tagMatch[1];
      const tagList = tagString.split(/[,;\s]+/).map(tag => tag.trim().replace('#', ''));
      tags.push(...tagList.filter(tag => tag.length > 0));
    }

    return tags;
  }

  /**
   * Extract dependencies from PRP content
   */
  private extractDependencies(lines: string[]): string[] {
    const content = lines.join(' ');
    const dependencies: string[] = [];

    const depMatch = content.match(/dependencies?[:\s]+([^\n\r]+)/i);
    if (depMatch) {
      const depString = depMatch[1];
      const depList = depString.split(/[,;\s]+/).map(dep => dep.trim());
      dependencies.push(...depList.filter(dep => dep.length > 0));
    }

    return dependencies;
  }

  /**
   * Extract blockers from PRP content
   */
  private extractBlockers(lines: string[]): string[] {
    const content = lines.join(' ');
    const blockers: string[] = [];

    const blockMatch = content.match(/blockers?[:\s]+([^\n\r]+)/i);
    if (blockMatch) {
      const blockString = blockMatch[1];
      const blockList = blockString.split(/[,;\s]+/).map(block => block.trim());
      blockers.push(...blockList.filter(block => block.length > 0));
    }

    return blockers;
  }

  /**
   * Map signal priority to PRP priority
   */
  private mapSignalPriority(priority: number): PRPSignal['priority'] {
    if (priority >= 9) return 'critical';
    if (priority >= 7) return 'high';
    if (priority >= 4) return 'medium';
    return 'low';
  }

  /**
   * Estimate token count for content
   */
  private estimateTokens(content: string): number {
    // Rough estimation: ~1 token per 4 characters
    return Math.ceil(content.length / 4);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    totalVersions: number;
    averageVersionsPerPRP: number;
  } {
    const totalVersions = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.versions.length, 0);

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      totalVersions,
      averageVersionsPerPRP: this.cache.size > 0 ? totalVersions / this.cache.size : 0
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('EnhancedPRPParser', 'Cache cleared');
  }
}