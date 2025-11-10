/**
 * Scanner Integration Layer - Connects Scanner to Inspector and Orchestrator
 * Part of PRP-007-F: Signal Sensor Inspector Implementation
 */

import { ScannerCore, ScannerOptions } from './ScannerCore';
import { ScannerEvent } from '../shared/scanner/event-bus.js';
import { GitAdapter } from './adapters/GitAdapter';
import { TmuxAdapter } from './adapters/TmuxAdapter';
import * as path from 'path';

export interface InspectorPayload {
  signal: string;
  source: 'file' | 'git' | 'tmux' | 'adapter';
  context: {
    filePath?: string;
    line?: number;
    column?: number;
    surroundingText?: string;
    gitInfo?: {
      commitHash?: string;
      author?: string;
      branch?: string;
      message?: string;
      files?: string[];
    };
    tmuxInfo?: {
      sessionId?: string;
      sessionName?: string;
      windowId?: number;
      command?: string;
    };
    metadata?: Record<string, unknown>;
  };
  timestamp: Date;
  priority: number;
}

export interface IntegrationOptions extends ScannerOptions {
  enableGitAdapter?: boolean;
  enableTmuxAdapter?: boolean;
  gitRepoPath?: string;
  tmuxLogPath?: string;
  inspectorEndpoint?: string;
  maxPayloadSize?: number; // Default 40K as per Inspector limit
}

export class ScannerIntegration {
  private scanner: ScannerCore;
  private gitAdapter: GitAdapter;
  private tmuxAdapter: TmuxAdapter;
  private options: IntegrationOptions;
  private pendingSignals: Map<string, InspectorPayload> = new Map();
  private signalDeduplication: Set<string> = new Set();

  constructor(options: IntegrationOptions) {
    this.options = {
      enableGitAdapter: true,
      enableTmuxAdapter: true,
      maxPayloadSize: 40960, // 40K bytes
      ...options
    };

    // Initialize scanner
    this.scanner = new ScannerCore({
      watchPaths: options.watchPaths,
      filePatterns: options.filePatterns,
      ignorePatterns: options.ignorePatterns,
      pollInterval: options.pollInterval
    });

    // Initialize adapters
    this.gitAdapter = new GitAdapter(
      this.options.gitRepoPath ?? options.watchPaths[0] ?? process.cwd()
    );
    this.tmuxAdapter = new TmuxAdapter(this.options.tmuxLogPath);

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Start the integrated scanner system
   */
  async start(): Promise<void> {
    logger.info('🚀 Starting Scanner Integration...');

    // Start core scanner
    await this.scanner.start();

    // Start adapter watchers if enabled
    if (this.options.enableGitAdapter) {
      logger.info('📦 Starting Git adapter...');
      this.gitAdapter.watchGitActivity((event) => {
        this.handleGitSignal(event as unknown as Record<string, unknown>);
      });
    }

    if (this.options.enableTmuxAdapter) {
      logger.info('📺 Starting Tmux adapter...');
      await this.tmuxAdapter.watchSessions((event) => {
        this.handleTmuxSignal(event as unknown as Record<string, unknown>);
      });
    }

    logger.info('✅ Scanner Integration started successfully');
  }

  /**
   * Stop the integrated scanner system
   */
  stop(): void {
    logger.info('🛑 Stopping Scanner Integration...');
    this.scanner.stop();
    this.tmuxAdapter.stopWatching();
    logger.info('✅ Scanner Integration stopped');
  }

  /**
   * Setup event handlers for scanner events
   */
  private setupEventHandlers(): void {
    // Handle file-based signals
    this.scanner.subscribe('signal_detected', (event: ScannerEvent) => {
      if (event.data && typeof event.data === 'object') {
        const data = event.data as Record<string, unknown>;

        const payload: InspectorPayload = {
          signal: data.signal as string,
          source: 'file',
          context: {
            filePath: data.filePath as string,
            line: data.line as number | undefined,
            column: data.column as number | undefined,
            surroundingText: data.context as string
          },
          timestamp: event.timestamp,
          priority: this.calculatePriority(data.signal as string)
        };

        this.sendToInspector(payload);
      }
    });
  }

  /**
   * Handle Git adapter signals
   */
  private handleGitSignal(event: Record<string, unknown>): void {
    const payload: InspectorPayload = {
      signal: event.signal as string,
      source: 'git',
      context: {
        gitInfo: {
          commitHash: event.commitHash as string | undefined,
          author: event.author as string | undefined,
          branch: event.branch as string | undefined,
          message: event.message as string,
          files: event.files as string[] | undefined
        }
      },
      timestamp: event.timestamp as Date,
      priority: this.calculatePriority(event.signal as string)
    };

    this.sendToInspector(payload);
  }

  /**
   * Handle Tmux adapter signals
   */
  private handleTmuxSignal(event: Record<string, unknown>): void {
    const payload: InspectorPayload = {
      signal: event.signal as string,
      source: 'tmux',
      context: {
        tmuxInfo: {
          sessionId: event.sessionId as string | undefined,
          sessionName: event.sessionName as string | undefined,
          windowId: event.windowId as number | undefined,
          command: event.command as string | undefined
        }
      },
      timestamp: event.timestamp as Date,
      priority: this.calculatePriority(event.signal as string)
    };

    this.sendToInspector(payload);
  }

  /**
   * Send payload to Inspector with size limit
   */
  private async sendToInspector(payload: InspectorPayload): Promise<void> {
    // Create deduplication key
    const dedupeKey = `${payload.source}-${payload.signal}-${payload.context.filePath ?? payload.context.gitInfo?.commitHash ?? payload.context.tmuxInfo?.sessionId}`;

    // Check for duplicates
    if (this.signalDeduplication.has(dedupeKey)) {
      return;
    }

    // Add to deduplication set
    this.signalDeduplication.add(dedupeKey);

    // Clean old deduplication entries (keep last 1000)
    if (this.signalDeduplication.size > 1000) {
      const entries = Array.from(this.signalDeduplication);
      this.signalDeduplication = new Set(entries.slice(-500));
    }

    // Calculate payload size
    const payloadSize = JSON.stringify(payload).length;

    if (payloadSize > (this.options.maxPayloadSize ?? 40960)) {
      logger.warning(`Payload size (${payloadSize}) exceeds limit (${this.options.maxPayloadSize}), truncating...`);

      // Truncate context if too large
      if (payload.context.surroundingText) {
        const maxContextLength = (this.options.maxPayloadSize ?? 40960) - payloadSize + payload.context.surroundingText.length;
        payload.context.surroundingText = payload.context.surroundingText.substring(0, maxContextLength) + '...';
      }
    }

    // Store in pending signals
    this.pendingSignals.set(dedupeKey, payload);

    // Emit event for processing would go here
    // Note: emitEvent is private in ScannerCore, so we'll add a public method in the future
    logger.info(`📤 Ready to emit event: inspector_payload_ready with payload size: ${JSON.stringify(payload).length}`);

    // In a real implementation, this would send to the Inspector service
    // For now, we'll just log it
    logger.info(`📤 Sending to Inspector: [${payload.signal}] from ${payload.source}`);
  }

  /**
   * Calculate signal priority based on type and source
   */
  private calculatePriority(signal: string): number {
    // High priority signals (system critical)
    const highPrioritySignals = ['FF', 'IC', 'FM', 'BB', 'JC'];
    if (highPrioritySignals.includes(signal.toUpperCase())) {
      return 10;
    }

    // Medium priority (development progress)
    const mediumPrioritySignals = ['DP', 'TP', 'CP', 'MG'];
    if (mediumPrioritySignals.includes(signal.toUpperCase())) {
      return 5;
    }

    // Low priority (informational)
    return 1;
  }

  /**
   * Get pending signals for Inspector
   */
  getPendingSignals(count = 10): InspectorPayload[] {
    const signals = Array.from(this.pendingSignals.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, count);

    // Clear retrieved signals
    signals.forEach(payload => {
      const dedupeKey = `${payload.source}-${payload.signal}-${payload.context.filePath ?? payload.context.gitInfo?.commitHash ?? payload.context.tmuxInfo?.sessionId}`;
      this.pendingSignals.delete(dedupeKey);
    });

    return signals;
  }

  /**
   * Get integration statistics
   */
  getStats(): {
    scanner: Record<string, unknown>;
    git: Record<string, unknown>;
    tmux: Record<string, unknown>;
    pendingSignals: number;
    deduplicationCacheSize: number;
    } {
    return {
      scanner: this.scanner.getStats(),
      git: {
        enabled: this.options.enableGitAdapter
      },
      tmux: {
        enabled: this.options.enableTmuxAdapter
      },
      pendingSignals: this.pendingSignals.size,
      deduplicationCacheSize: this.signalDeduplication.size
    };
  }

  /**
   * Create adapter configuration
   */
  static createConfig(overrides: Partial<IntegrationOptions> = {}): IntegrationOptions {
    const repoPath = process.cwd();

    return {
      watchPaths: [path.join(repoPath, 'PRPs'), path.join(repoPath, 'src')],
      filePatterns: ['.md', '.ts', '.tsx', '.js', '.json'],
      ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
      pollInterval: 2000,
      enableGitAdapter: true,
      enableTmuxAdapter: true,
      gitRepoPath: repoPath,
      tmuxLogPath: path.join(process.env.HOME ?? '', '.tmux/logs'),
      maxPayloadSize: 40960,
      ...overrides
    };
  }
}