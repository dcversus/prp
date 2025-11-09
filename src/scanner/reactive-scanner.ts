import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'chokidar';
import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { PRPParser } from './prp-parser';
import { TokenAccountant } from './token-accountant';
import { FileHasher } from './file-hasher';
import { logger } from '../utils/logger';
// import { SignalDetectorImpl } from './signal-detector'; // TODO: Use in signal detection logic

/**
 * Reactive Scanner Configuration
 * NO polling intervals - purely event-driven
 */
export interface ReactiveScannerConfig {
  worktrees: string[];
  enableSignalDetection: boolean;
  enableGitMonitoring: boolean;
  enableTokenTracking: boolean;
  fileWatchIgnore: string[];
  tokenThreshold: number; // Emit event when usage crosses this
}

export interface ReactiveEvent {
  type: 'file_change' | 'git_change' | 'signal_detected' | 'token_threshold' | 'prp_updated';
  timestamp: Date;
  source: string;
  data: unknown;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface FileChangeEvent {
  path: string;
  action: 'add' | 'change' | 'unlink';
  size: number;
  hash: string;
  content?: string; // Only for relevant files
}

export interface SignalDetectedEvent {
  filePath: string;
  signal: string;
  context: string;
  lineNumber: number;
  signalData: unknown;
}

export interface GitChangeEvent {
  repository: string;
  branch: string;
  files: string[];
  commit?: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
}

/**
 * Reactive Scanner - Event-driven, NO polling
 * Reacts to file system changes, git events, and signal detection
 */
export class ReactiveScanner extends EventEmitter {
  private config: ReactiveScannerConfig;
  private fileWatcher: FSWatcher | null = null;
  private gitWatchers: Map<string, FSWatcher> = new Map();
  private isRunning = false;

  // Component dependencies
  private prpParser: PRPParser;
  private tokenAccountant: TokenAccountant;
  private fileHasher: FileHasher;
  // private signalDetector: SignalDetectorImpl; // TODO: Use in signal detection logic

  // Performance metrics
  private metrics = {
    fileChanges: 0,
    signalsDetected: 0,
    gitEvents: 0,
    tokenEvents: 0,
    startTime: null as Date | null
  };

  constructor(config: ReactiveScannerConfig) {
    super();
    this.config = config;

    // Initialize components
    this.prpParser = new PRPParser();
    this.tokenAccountant = new TokenAccountant();
    this.fileHasher = new FileHasher(1000);
    // this.signalDetector = new SignalDetectorImpl(); // TODO: Use in signal detection logic
  }

  /**
   * Start the reactive scanner
   */
  async start(): Promise<void> {
    logger.info('🚀 Starting Reactive Scanner (Event-driven, NO polling)');

    try {
      this.metrics.startTime = new Date();

      // Start file system watchers for each worktree
      for (const worktree of this.config.worktrees) {
        await this.setupWorktreeWatcher(worktree);
      }

      // Start git monitoring if enabled
      if (this.config.enableGitMonitoring) {
        this.setupGitMonitoring();
      }

      // Initial scan to establish baseline
      await this.performInitialAnalysis();

      this.isRunning = true;
      logger.success(`✅ Reactive Scanner started. Monitoring ${this.config.worktrees.length} worktrees`);

      this.emit('scanner:started', {
        worktreeCount: this.config.worktrees.length,
        mode: 'reactive',
        message: 'Event-driven monitoring active - NO polling'
      });

    } catch (error) {
      logger.error('❌ Failed to start reactive scanner:', error);
      this.emit('scanner:error', error);
      throw error;
    }
  }

  /**
   * Setup file system watcher for a worktree
   */
  private async setupWorktreeWatcher(worktreePath: string): Promise<void> {
    if (!existsSync(worktreePath)) {
      logger.warning(`⚠️ Worktree path does not exist: ${worktreePath}`);
      return;
    }

    const watcher = watch(worktreePath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.DS_Store',
        ...this.config.fileWatchIgnore
      ],
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    // React to file changes
    watcher.on('all', (event, filePath) => {
      this.handleFileChange(event, filePath, worktreePath);
    });

    // Handle errors
    watcher.on('error', (error) => {
      logger.error(`❌ File watcher error for ${worktreePath}:`, error);
      this.emit('scanner:error', { type: 'file_watcher', path: worktreePath, error });
    });

    logger.info(`📁 File watcher setup for: ${worktreePath}`);
  }

  /**
   * Handle file system changes reactively
   */
  private async handleFileChange(event: string, filePath: string, worktreePath: string): Promise<void> {
    const fullPath = join(worktreePath, filePath);
    this.metrics.fileChanges++;

    try {
      let fileData: FileChangeEvent | null = null;

      // Get file information
      if (event !== 'unlink' && existsSync(fullPath)) {
        const stats = statSync(fullPath);
        const content = readFileSync(fullPath, 'utf8');
        const hashResult = await this.fileHasher.hashFile(fullPath);
        const hash = hashResult.hash;

        fileData = {
          path: fullPath,
          action: event as 'add' | 'change' | 'unlink',
          size: stats.size,
          hash,
          content: this.isRelevantFile(filePath) ? content : undefined
        };
      } else {
        fileData = {
          path: fullPath,
          action: 'unlink',
          size: 0,
          hash: ''
        };
      }

      logger.info(`📁 File ${event}: ${filePath}`);

      // Emit file change event
      this.emit('file_change', {
        type: 'file_change',
        timestamp: new Date(),
        source: worktreePath,
        data: fileData,
        urgency: this.calculateFileUrgency(fileData)
      });

      // Check for signals if enabled
      if (this.config.enableSignalDetection && fileData.content) {
        await this.detectSignals(fileData);
      }

      // Update token tracking if enabled
      if (this.config.enableTokenTracking && fileData.content) {
        await this.updateTokenTracking(fileData);
      }

    } catch (error) {
      logger.error(`❌ Error handling file change ${filePath}:`, error);
      this.emit('scanner:error', { type: 'file_change', path: fullPath, error });
    }
  }

  /**
   * Detect ALL signals in file content
   * Automatically finds any [XX] pattern - no configuration needed
   */
  private async detectSignals(fileData: FileChangeEvent): Promise<void> {
    if (!fileData.content) return;

    try {
      const lines = fileData.content.split('\n');

      // Auto-detect ANY [XX] signal pattern in PRP content
      const universalSignalPattern = /\[[A-Za-z][A-Za-z]\]/g;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;

        while ((match = universalSignalPattern.exec(line ?? '')) !== null) {
          const signal = match[0];

          // Extract signal context
          const contextStart = Math.max(0, i - 2);
          const contextEnd = Math.min(lines.length - 1, i + 2);
          const context = lines.slice(contextStart, contextEnd + 1).join('\n');

          const signalData: SignalDetectedEvent = {
            filePath: fileData.path,
            signal,
            context,
            lineNumber: i + 1,
            signalData: {
              pattern: universalSignalPattern.source,
              match: match[0],
              position: match.index
            }
          };

          this.metrics.signalsDetected++;
          logger.highlight(`🔍 Signal detected: ${signal} in ${fileData.path}`);

          this.emit('signal_detected', {
            type: 'signal_detected',
            timestamp: new Date(),
            source: fileData.path,
            data: signalData,
            urgency: this.calculateSignalUrgency(signal)
          });
        }
      }
    } catch (error) {
      logger.error(`❌ Error detecting signals in ${fileData.path}:`, error);
    }
  }

  /**
   * Setup git monitoring (reactive to git changes)
   */
  private setupGitMonitoring(): void {
    for (const worktree of this.config.worktrees) {
      const gitPath = join(worktree, '.git');

      if (existsSync(gitPath)) {
        // Watch git directory for changes
        const gitWatcher = watch(join(gitPath, 'HEAD'), {
          persistent: true,
          ignoreInitial: true
        });

        gitWatcher.on('change', () => {
          this.handleGitChange(worktree);
        });

        this.gitWatchers.set(worktree, gitWatcher);
        logger.info(`🔧 Git monitoring setup for: ${worktree}`);
      }
    }
  }

  /**
   * Handle git changes reactively
   */
  private async handleGitChange(worktreePath: string): Promise<void> {
    try {
      // Get current git status
      const gitStatus = execSync('git status --porcelain', {
        cwd: worktreePath,
        encoding: 'utf-8'
      });

      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: worktreePath,
        encoding: 'utf-8'
      }).trim();

      const files = gitStatus.split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3).trim());

      if (files.length > 0) {
        this.metrics.gitEvents++;
        logger.info(`🔧 Git changes detected in ${worktreePath}: ${files.length} files`);

        this.emit('git_change', {
          type: 'git_change',
          timestamp: new Date(),
          source: worktreePath,
          data: {
            repository: worktreePath,
            branch: currentBranch,
            files,
            status: 'modified'
          },
          urgency: 'medium'
        });
      }
    } catch (error) {
      logger.error(`❌ Error handling git change in ${worktreePath}:`, error);
    }
  }

  /**
   * Update token tracking and check thresholds
   */
  private async updateTokenTracking(fileData: FileChangeEvent): Promise<void> {
    if (!fileData.content) return;

    try {
      const tokenCount = this.estimateTokenCount(fileData.content);
      this.tokenAccountant.recordUsage({
        agentId: 'scanner',
        agentType: 'file-scanner',
        tokens: tokenCount,
        operation: 'request',
        prpId: fileData.path
      });

      // Check if we've crossed threshold
      if (tokenCount > this.config.tokenThreshold) {
        this.metrics.tokenEvents++;
        logger.warning(`⚠️ Token threshold exceeded: ${tokenCount} tokens in ${fileData.path}`);

        this.emit('token_threshold', {
          type: 'token_threshold',
          timestamp: new Date(),
          source: fileData.path,
          data: {
            filePath: fileData.path,
            tokenCount,
            threshold: this.config.tokenThreshold,
            percentage: ((tokenCount / this.config.tokenThreshold) * 100).toFixed(1)
          },
          urgency: tokenCount > this.config.tokenThreshold * 1.5 ? 'critical' : 'high'
        });
      }
    } catch (error) {
      logger.error(`❌ Error updating token tracking for ${fileData.path}:`, error);
    }
  }

  /**
   * Perform initial analysis to establish baseline
   */
  private async performInitialAnalysis(): Promise<void> {
    logger.info('🔍 Performing initial analysis...');

    for (const worktree of this.config.worktrees) {
      try {
        // Scan for existing PRP files
        const prpFiles = await this.prpParser.discoverPRPFiles(worktree);

        if (prpFiles.length > 0) {
          logger.info(`📋 Found ${prpFiles.length} PRP files in ${worktree}`);

          this.emit('prp_updated', {
            type: 'prp_updated',
            timestamp: new Date(),
            source: worktree,
            data: {
              files: prpFiles,
              action: 'initial_discovery'
            },
            urgency: 'low'
          });
        }
      } catch (error) {
        logger.error(`❌ Error in initial analysis for ${worktree}:`, error);
      }
    }
  }

  /**
   * Helper methods
   */
  private isRelevantFile(filePath: string): boolean {
    const relevantExtensions = ['.md', '.txt', '.js', '.ts', '.json', '.yml', '.yaml'];
    return relevantExtensions.some(ext => filePath.endsWith(ext));
  }

  private estimateTokenCount(content: string): number {
    // Simple token estimation (rough approximation)
    return Math.ceil(content.length / 4);
  }

  private calculateFileUrgency(fileData: FileChangeEvent): 'low' | 'medium' | 'high' | 'critical' {
    if (fileData.action === 'unlink') return 'medium';
    if (fileData.size > 100000) return 'high'; // Large files
    if (fileData.path.includes('package.json') || fileData.path.includes('.prprc')) return 'high';
    return 'low';
  }

  private calculateSignalUrgency(signal: string): 'low' | 'medium' | 'high' | 'critical' {
    const urgentSignals = ['[Bb]', '[AE]', '[OA]'];
    const mediumSignals = ['[af]', '[oa]', '[op]'];

    if (urgentSignals.some(s => signal.includes(s))) return 'critical';
    if (mediumSignals.some(s => signal.includes(s))) return 'medium';
    return 'low';
  }

  /**
   * Get scanner metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.metrics.startTime ? Date.now() - this.metrics.startTime.getTime() : 0,
      isRunning: this.isRunning,
      worktreesCount: this.config.worktrees.length
    };
  }

  /**
   * Stop the reactive scanner
   */
  async stop(): Promise<void> {
    logger.info('🛑 Stopping Reactive Scanner');

    this.isRunning = false;

    // Stop file watchers
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }

    // Stop git watchers
    for (const [, watcher] of Array.from(this.gitWatchers.entries())) {
      await watcher.close();
    }
    this.gitWatchers.clear();

    logger.success('✅ Reactive Scanner stopped');
    this.emit('scanner:stopped', { metrics: this.getMetrics() });
  }
}