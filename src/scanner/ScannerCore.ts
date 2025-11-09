/**
 * Scanner Core - Main scanner implementation
 * Combines event bus, signal parser, and file watching
 * Part of PRP-007-F: Signal Sensor Inspector Implementation
 */

import { ScannerEventBus, ScannerEvent } from './event-bus/EventBus';
import { SignalParser, ParsedSignal } from './signal-parser/SignalParser';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface ScannerOptions {
  watchPaths: string[];
  filePatterns: string[];
  ignorePatterns: string[];
  pollInterval?: number;
}

export interface ScanResult {
  path: string;
  signals: ParsedSignal[];
  modified: Date;
  size: number;
}

export class ScannerCore {
  private eventBus: ScannerEventBus;
  private signalParser: SignalParser;
  private options: ScannerOptions;
  private watchedFiles: Map<string, Date> = new Map();
  private isRunning = false;
  private scanInterval?: NodeJS.Timeout;

  constructor(options: ScannerOptions) {
    this.eventBus = new ScannerEventBus();
    this.signalParser = new SignalParser();
    this.options = {
      pollInterval: 1000,
      ...options
    };
  }

  /**
   * Start the scanner
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warning('Scanner is already running');
      return;
    }

    logger.info('🔍 Starting Scanner...');
    this.isRunning = true;

    // Initial scan
    await this.scanAllFiles();

    // Start periodic scanning
    this.scanInterval = setInterval(() => {
      this.scanAllFiles().catch(error => {
        logger.error('Scanner error:', error);
      });
    }, this.options.pollInterval);

    this.emitEvent({
      type: 'scanner_started',
      data: {
        watchPaths: this.options.watchPaths,
        filePatterns: this.options.filePatterns
      }
    });
  }

  /**
   * Stop the scanner
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping Scanner...');
    this.isRunning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }

    this.emitEvent({
      type: 'scanner_stopped'
    });
  }

  /**
   * Scan all watched files for changes
   */
  async scanAllFiles(): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    for (const watchPath of this.options.watchPaths) {
      const files = await this.getFilesToScan(watchPath);

      for (const filePath of files) {
        const result = await this.scanFile(filePath);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Scan a single file for signals
   */
  async scanFile(filePath: string): Promise<ScanResult | null> {
    try {
      const stats = await fs.promises.stat(filePath);
      const lastModified = this.watchedFiles.get(filePath);

      // Skip if file hasn't changed
      if (lastModified && stats.mtime.getTime() === lastModified.getTime()) {
        return null;
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      const parseResult = this.signalParser.parse(content);

      // Update watched files
      this.watchedFiles.set(filePath, stats.mtime);

      const result: ScanResult = {
        path: filePath,
        signals: parseResult.signals,
        modified: stats.mtime,
        size: stats.size
      };

      // Emit events for each signal found
      parseResult.signals.forEach(signal => {
        this.emitEvent({
          type: 'signal_detected',
          signal: signal.signal,
          data: {
            filePath,
            signal,
            context: signal.context,
            line: signal.line,
            type: signal.type
          }
        });
      });

      // Emit file scanned event
      this.emitEvent({
        type: 'file_scanned',
        data: {
          filePath,
          signalCount: parseResult.signals.length,
          signals: parseResult.byType
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error scanning file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get all files that should be scanned
   */
  private async getFilesToScan(watchPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walkDirectory(dir: string): Promise<void> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip ignored patterns
        if (shouldIgnore(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDirectory(fullPath);
        } else if (entry.isFile() && shouldScan(fullPath)) {
          files.push(fullPath);
        }
      }
    }

    function shouldIgnore(filePath: string): boolean {
      const basename = path.basename(filePath);
      return options.ignorePatterns.some(pattern =>
        basename.includes(pattern) || filePath.includes(pattern)
      );
    }

    function shouldScan(filePath: string): boolean {
      const basename = path.basename(filePath);
      return options.filePatterns.some(pattern =>
        basename.endsWith(pattern) || basename.includes(pattern)
      );
    }

    const options = this.options;

    try {
      const stats = await fs.promises.stat(watchPath);
      if (stats.isDirectory()) {
        await walkDirectory(watchPath);
      } else if (stats.isFile() && shouldScan(watchPath)) {
        files.push(watchPath);
      }
    } catch (error) {
      logger.error(`Error accessing ${watchPath}:`, error);
    }

    return files;
  }

  /**
   * Emit an event to the event bus
   */
  private emitEvent(event: Partial<ScannerEvent>): void {
    this.eventBus.emit({
      timestamp: new Date(),
      source: 'scanner',
      priority: 1,
      ...event
    } as ScannerEvent);
  }

  /**
   * Subscribe to scanner events
   */
  subscribe(eventType: string, handler: (event: ScannerEvent) => void): string {
    return this.eventBus.subscribe(eventType, handler);
  }

  /**
   * Get recent scanner events
   */
  getRecentEvents(count = 10): ScannerEvent[] {
    return this.eventBus.getRecentEvents(count);
  }

  /**
   * Get scan statistics
   */
  getStats(): {
    filesWatched: number;
    signalsDetected: number;
    lastScan: Date | null;
    isRunning: boolean;
  } {
    const recentEvents = this.eventBus.getRecentEvents(100);
    const lastScanEvent = recentEvents
      .filter(e => e.type === 'scanner_started' || e.type === 'file_scanned')
      .pop();

    return {
      filesWatched: this.watchedFiles.size,
      signalsDetected: recentEvents.filter(e => e.type === 'signal_detected').length,
      lastScan: lastScanEvent ? lastScanEvent.timestamp : null,
      isRunning: this.isRunning
    };
  }
}