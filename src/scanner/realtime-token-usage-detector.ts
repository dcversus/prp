/**
 * ♫ Real-time Token Usage Detector for @dcversus/prp
 *
 * Detects and tracks token usage in real-time from various sources including
 * terminal logs, agent outputs, and API responses to provide immediate
 * accounting and enforcement integration.
 */
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { createInterface, Interface as ReadlineInterface } from 'readline';

import { createLayerLogger, TimeUtils, FileUtils } from '../shared';

import type { ChildProcess } from 'child_process';
import type {
  TokenUsageEvent,
  TokenDataPoint,
} from '../shared/types/token-metrics';
import type {
  MultiProviderTokenAccounting,
} from './multi-provider-token-accounting';
import type {
  TokenCapEnforcementManager,
} from './token-cap-enforcement';

const logger = createLayerLogger('scanner');

// Detection patterns for different token sources
export interface TokenDetectionPattern {
  id: string;
  name: string;
  description: string;
  patterns: RegExp[];
  tokenExtraction: {
    input?: RegExp;
    output?: RegExp;
    total?: RegExp;
    cost?: RegExp;
  };
  metadataExtraction: {
    model?: RegExp;
    provider?: RegExp;
    operation?: RegExp;
    agent?: RegExp;
    timestamp?: RegExp;
  };
  confidence: number; // 0-1 confidence level
}

// Configuration for detection
export interface TokenDetectionConfig {
  enableTerminalMonitoring: boolean;
  enableFileMonitoring: boolean;
  enableProcessMonitoring: boolean;
  monitoredFiles: string[];
  monitoredProcesses: string[];
  updateInterval: number; // milliseconds
  debounceTime: number; // milliseconds
  maxCacheSize: number;
}

// Detection event
export interface TokenDetectionEvent {
  id: string;
  timestamp: Date;
  source: 'terminal' | 'file' | 'process' | 'api';
  rawText: string;
  extracted: {
    tokens: number;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    provider?: string;
    model?: string;
    operation?: string;
    agent?: string;
  };
  confidence: number;
  pattern: TokenDetectionPattern;
}

/**
 * Real-time Token Usage Detector
 */
export class RealtimeTokenUsageDetector extends EventEmitter {
  private readonly config: TokenDetectionConfig;
  private readonly multiProviderAccounting: MultiProviderTokenAccounting;
  private readonly capEnforcement: TokenCapEnforcementManager;

  // Detection state
  private detectionPatterns: TokenDetectionPattern[] = [];
  private readonly activeMonitors = new Map<string, ChildProcess>();
  private readonly fileWatchers = new Map<string, any>(); // fs.watch instances
  private eventCache: TokenDetectionEvent[] = [];
  private readonly lastActivity = new Map<string, Date>();

  // Debouncing
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

  // Performance tracking
  private readonly detectionStats = {
    totalDetections: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    averageProcessingTime: 0,
  };

  constructor(
    multiProviderAccounting: MultiProviderTokenAccounting,
    capEnforcement: TokenCapEnforcementManager,
    config: Partial<TokenDetectionConfig> = {}
  ) {
    super();

    this.multiProviderAccounting = multiProviderAccounting;
    this.capEnforcement = capEnforcement;

    this.config = {
      enableTerminalMonitoring: true,
      enableFileMonitoring: true,
      enableProcessMonitoring: true,
      monitoredFiles: [
        '.prp/logs/*.log',
        '.prp/agent-logs/*.log',
        '.prp/inspector/*.log',
        '.prp/orchestrator/*.log',
      ],
      monitoredProcesses: [
        'claude',
        'claude-code',
        'node',
        'python',
        'tmux',
      ],
      updateInterval: 1000, // 1 second
      debounceTime: 500, // 500ms
      maxCacheSize: 1000,
      ...config,
    };

    this.initializeDetectionPatterns();
    this.startMonitoring();
  }

  /**
   * Initialize detection patterns for various token sources
   */
  private initializeDetectionPatterns(): void {
    this.detectionPatterns = [
      // Claude/Anthropic patterns
      {
        id: 'claude_tokens',
        name: 'Claude Token Usage',
        description: 'Detects token usage from Claude/Anthropic outputs',
        patterns: [
          /tokens:\s*(\d+)/i,
          /usage:\s*(\d+)/i,
          /(\d+)\s*tokens/i,
        ],
        tokenExtraction: {
          input: /input:\s*(\d+)/i,
          output: /output:\s*(\d+)/i,
          total: /tokens?:\s*(\d+)/i,
          cost: /\$([\d.]+)/,
        },
        metadataExtraction: {
          model: /claude-[\w.-]+/i,
          provider: /anthropic|claude/i,
          operation: /(request|response|completion)/i,
          agent: /(inspector|orchestrator|scanner|developer)/i,
        },
        confidence: 0.9,
      },

      // OpenAI patterns
      {
        id: 'openai_tokens',
        name: 'OpenAI Token Usage',
        description: 'Detects token usage from OpenAI API responses',
        patterns: [
          /"prompt_tokens":\s*(\d+)/,
          /"completion_tokens":\s*(\d+)/,
          /"total_tokens":\s*(\d+)/,
        ],
        tokenExtraction: {
          input: /"prompt_tokens":\s*(\d+)/,
          output: /"completion_tokens":\s*(\d+)/,
          total: /"total_tokens":\s*(\d+)/,
          cost: /"cost":\s*([\d.]+)/,
        },
        metadataExtraction: {
          model: /"model":\s*"([^"]+)"/,
          provider: /openai/i,
          operation: /"object":\s*"([^"]+)"/,
        },
        confidence: 0.95,
      },

      // Generic patterns
      {
        id: 'generic_tokens',
        name: 'Generic Token Usage',
        description: 'Generic token usage detection patterns',
        patterns: [
          /(\d+)\s*(?:tokens|token)/i,
          /usage:\s*(\d+)/i,
          /processed:\s*(\d+)/i,
        ],
        tokenExtraction: {
          total: /(\d+)(?=\s*(?:tokens|token))/i,
        },
        metadataExtraction: {
          operation: /(process|analyze|generate|complete)/i,
        },
        confidence: 0.6,
      },

      // Log file patterns
      {
        id: 'log_file_tokens',
        name: 'Log File Token Usage',
        description: 'Detects tokens from structured log files',
        patterns: [
          /\[TOKEN\]\s*(\d+)/,
          /token_usage:\s*(\d+)/,
          /llm_tokens:\s*(\d+)/,
        ],
        tokenExtraction: {
          total: /(?:\[TOKEN\]|token_usage|llm_tokens):\s*(\d+)/i,
          cost: /cost:\s*\$?([\d.]+)/i,
        },
        metadataExtraction: {
          model: /model:\s*([\w.-]+)/i,
          operation: /op:\s*(\w+)/i,
          agent: /agent:\s*(\w+)/i,
          timestamp: /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/,
        },
        confidence: 0.8,
      },

      // Cost patterns
      {
        id: 'cost_detection',
        name: 'Cost Detection',
        description: 'Detects costs and infers token usage',
        patterns: [
          /\$([\d.]+)\s*(?:cost|fee|charge)/i,
          /cost:\s*\$?([\d.]+)/i,
          /charged:\s*\$?([\d.]+)/i,
        ],
        tokenExtraction: {
          cost: /\$([\d.]+)/,
        },
        metadataExtraction: {
          model: /model:\s*([\w.-]+)/i,
          provider: /(openai|anthropic|claude|gemini)/i,
        },
        confidence: 0.7,
      },
    ];

    logger.info('RealtimeTokenUsageDetector', 'Initialized detection patterns', {
      patternCount: this.detectionPatterns.length,
    });
  }

  /**
   * Start monitoring all configured sources
   */
  private startMonitoring(): void {
    logger.info('RealtimeTokenUsageDetector', 'Starting token usage detection...');

    if (this.config.enableTerminalMonitoring) {
      this.startTerminalMonitoring();
    }

    if (this.config.enableFileMonitoring) {
      this.startFileMonitoring();
    }

    if (this.config.enableProcessMonitoring) {
      this.startProcessMonitoring();
    }

    // Start periodic cleanup
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 1000); // Every minute

    logger.info('RealtimeTokenUsageDetector', '✅ Token usage detection started', {
      terminalMonitoring: this.config.enableTerminalMonitoring,
      fileMonitoring: this.config.enableFileMonitoring,
      processMonitoring: this.config.enableProcessMonitoring,
    });
  }

  /**
   * Start terminal monitoring
   */
  private startTerminalMonitoring(): void {
    try {
      // Monitor tmux sessions and active processes
      const tmuxMonitor = spawn('tmux', ['list-sessions', '-F', '#{session_name}']);

      tmuxMonitor.stdout?.on('data', (data: Buffer) => {
        const sessions = data.toString().trim().split('\n').filter(s => s.length > 0);

        sessions.forEach(session => {
          this.monitorTmuxSession(session);
        });
      });

      tmuxMonitor.on('error', (error: Error) => {
        logger.warn('RealtimeTokenUsageDetector', 'Failed to monitor tmux sessions', { error: error.message });
      });

    } catch (error) {
      logger.warn('RealtimeTokenUsageDetector', 'Could not start terminal monitoring', { error });
    }
  }

  /**
   * Monitor a specific tmux session
   */
  private monitorTmuxSession(sessionName: string): void {
    if (this.activeMonitors.has(`tmux_${sessionName}`)) {
      return; // Already monitoring
    }

    try {
      const monitor = spawn('tmux', ['capture-pane', '-t', sessionName, '-p']);
      const rl = createInterface({
        input: monitor.stdout ?? process.stdin,
        crlfDelay: Infinity,
      });

      rl.on('line', (line: string) => {
        this.processTextLine(line, 'terminal', `tmux_${sessionName}`);
      });

      monitor.on('error', (error: Error) => {
        logger.warn('RealtimeTokenUsageDetector', `Failed to monitor tmux session ${sessionName}`, { error: error.message });
      });

      this.activeMonitors.set(`tmux_${sessionName}`, monitor);

      // Set up periodic capture
      const captureInterval = setInterval(() => {
        if (this.activeMonitors.has(`tmux_${sessionName}`)) {
          const newMonitor = spawn('tmux', ['capture-pane', '-t', sessionName, '-p']);
          const newRl = createInterface({
            input: newMonitor.stdout ?? process.stdin,
            crlfDelay: Infinity,
          });

          newRl.on('line', (line: string) => {
            this.processTextLine(line, 'terminal', `tmux_${sessionName}`);
          });

          newRl.on('close', () => {
            clearInterval(captureInterval);
          });
        } else {
          clearInterval(captureInterval);
        }
      }, 5000); // Every 5 seconds

    } catch (error) {
      logger.warn('RealtimeTokenUsageDetector', `Could not monitor tmux session ${sessionName}`, { error });
    }
  }

  /**
   * Start file monitoring
   */
  private startFileMonitoring(): void {
    const { chokidar } = require('chokidar');

    // Create watcher for log files
    const watcher = chokidar.watch(this.config.monitoredFiles, {
      persistent: true,
      ignoreInitial: false,
    });

    watcher.on('change', (filePath: string) => {
      this.monitorFile(filePath);
    });

    watcher.on('add', (filePath: string) => {
      this.monitorFile(filePath);
    });

    this.fileWatchers.set('main', watcher);

    logger.info('RealtimeTokenUsageDetector', 'Started file monitoring', {
      files: this.config.monitoredFiles,
    });
  }

  /**
   * Monitor a specific file
   */
  private monitorFile(filePath: string): void {
    try {
      const stat = FileUtils.statSync(filePath);
      const lastModified = stat.mtime;
      const lastSeen = this.lastActivity.get(filePath);

      // Skip if we've recently processed this file
      if (lastSeen && (lastModified.getTime() - lastSeen.getTime()) < 1000) {
        return;
      }

      // Read the last few lines of the file
      const content = FileUtils.readTextFileSync(filePath);
      const lines = content.split('\n').slice(-10); // Last 10 lines

      lines.forEach(line => {
        this.processTextLine(line, 'file', filePath);
      });

      this.lastActivity.set(filePath, lastModified);

    } catch (error) {
      logger.warn('RealtimeTokenUsageDetector', `Failed to monitor file ${filePath}`, { error });
    }
  }

  /**
   * Start process monitoring
   */
  private startProcessMonitoring(): void {
    // Monitor running processes for token-related activity
    try {
      const ps = spawn('ps', ['aux']);
      let output = '';

      ps.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      ps.on('close', () => {
        const lines = output.split('\n');

        lines.forEach(line => {
          const hasRelevantProcess = this.config.monitoredProcesses.some(process =>
            line.toLowerCase().includes(process.toLowerCase())
          );

          if (hasRelevantProcess) {
            this.processTextLine(line, 'process', 'ps');
          }
        });
      });

    } catch (error) {
      logger.warn('RealtimeTokenUsageDetector', 'Failed to start process monitoring', { error });
    }
  }

  /**
   * Process a line of text for token usage
   */
  private processTextLine(text: string, source: TokenDetectionEvent['source'], sourceId: string): void {
    const startTime = Date.now();

    try {
      // Debounce rapid detections from the same source
      if (this.shouldDebounce(sourceId)) {
        return;
      }

      // Try each detection pattern
      for (const pattern of this.detectionPatterns) {
        const match = this.testPattern(text, pattern);

        if (match) {
          const detection: TokenDetectionEvent = {
            id: `detect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: TimeUtils.now(),
            source,
            rawText: text,
            extracted: match,
            confidence: pattern.confidence,
            pattern,
          };

          // Add to cache
          this.eventCache.push(detection);
          if (this.eventCache.length > this.config.maxCacheSize) {
            this.eventCache = this.eventCache.slice(-Math.floor(this.config.maxCacheSize * 0.8));
          }

          // Update statistics
          this.detectionStats.totalDetections++;
          if (match.tokens > 0) {
            this.detectionStats.successfulExtractions++;
          } else {
            this.detectionStats.failedExtractions++;
          }

          // Update processing time
          const processingTime = Date.now() - startTime;
          this.detectionStats.averageProcessingTime =
            (this.detectionStats.averageProcessingTime + processingTime) / 2;

          // Emit detection event
          this.emit('detected', detection);

          // Forward to accounting and enforcement systems
          this.forwardToAccounting(detection);
          this.forwardToEnforcement(detection);

          // Update last activity
          this.lastActivity.set(sourceId, TimeUtils.now());

          logger.debug('RealtimeTokenUsageDetector', 'Token usage detected', {
            source,
            sourceId,
            tokens: match.tokens,
            provider: match.provider,
            confidence: pattern.confidence,
          });

          break; // Stop after first successful match
        }
      }

    } catch (error) {
      logger.warn('RealtimeTokenUsageDetector', 'Error processing text line', {
        text: text.substring(0, 100),
        source,
        sourceId,
        error,
      });
    }
  }

  /**
   * Test if text matches a detection pattern
   */
  private testPattern(text: string, pattern: TokenDetectionPattern): TokenDetectionEvent['extracted'] | null {
    // Check if any pattern matches
    const hasMatch = pattern.patterns.some(p => p.test(text));
    if (!hasMatch) {
      return null;
    }

    const extracted: TokenDetectionEvent['extracted'] = { tokens: 0 };

    // Extract token counts
    if (pattern.tokenExtraction.total) {
      const totalMatch = text.match(pattern.tokenExtraction.total);
      if (totalMatch) {
        extracted.tokens = parseInt(totalMatch[1], 10);
      }
    }

    if (pattern.tokenExtraction.input) {
      const inputMatch = text.match(pattern.tokenExtraction.input);
      if (inputMatch) {
        extracted.inputTokens = parseInt(inputMatch[1], 10);
        // If we have input but no total, estimate total
        if (!extracted.tokens) {
          extracted.tokens = extracted.inputTokens;
        }
      }
    }

    if (pattern.tokenExtraction.output) {
      const outputMatch = text.match(pattern.tokenExtraction.output);
      if (outputMatch) {
        extracted.outputTokens = parseInt(outputMatch[1], 10);
        // If we have both input and output, calculate total
        if (extracted.inputTokens) {
          extracted.tokens = extracted.inputTokens + extracted.outputTokens;
        }
      }
    }

    // Extract cost
    if (pattern.tokenExtraction.cost) {
      const costMatch = text.match(pattern.tokenExtraction.cost);
      if (costMatch) {
        extracted.cost = parseFloat(costMatch[1]);
      }
    }

    // Extract metadata
    if (pattern.metadataExtraction.model) {
      const modelMatch = text.match(pattern.metadataExtraction.model);
      if (modelMatch) {
        extracted.model = modelMatch[1];
      }
    }

    if (pattern.metadataExtraction.provider) {
      const providerMatch = text.match(pattern.metadataExtraction.provider);
      if (providerMatch) {
        extracted.provider = providerMatch[1];
      }
    }

    if (pattern.metadataExtraction.operation) {
      const operationMatch = text.match(pattern.metadataExtraction.operation);
      if (operationMatch) {
        extracted.operation = operationMatch[1];
      }
    }

    if (pattern.metadataExtraction.agent) {
      const agentMatch = text.match(pattern.metadataExtraction.agent);
      if (agentMatch) {
        extracted.agent = agentMatch[1];
      }
    }

    return extracted.tokens > 0 ? extracted : null;
  }

  /**
   * Check if detection should be debounced
   */
  private shouldDebounce(sourceId: string): boolean {
    const lastSeen = this.lastActivity.get(sourceId);
    if (!lastSeen) {
      return false;
    }

    const timeSinceLast = TimeUtils.now().getTime() - lastSeen.getTime();
    if (timeSinceLast < this.config.debounceTime) {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(sourceId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.lastActivity.delete(sourceId);
        this.debounceTimers.delete(sourceId);
      }, this.config.debounceTime);

      this.debounceTimers.set(sourceId, timer);
      return true;
    }

    return false;
  }

  /**
   * Forward detection to accounting system
   */
  private forwardToAccounting(detection: TokenDetectionEvent): void {
    if (detection.extracted.tokens > 0) {
      // Determine agent type and operation
      const agentId = detection.extracted.agent || detection.source;
      const operation = detection.extracted.operation || 'unknown';

      this.multiProviderAccounting.recordUsage(
        agentId,
        operation,
        detection.extracted.inputTokens || detection.extracted.tokens,
        detection.extracted.outputTokens || 0,
        {
          source: detection.source,
          model: detection.extracted.model,
          provider: detection.extracted.provider,
          confidence: detection.confidence,
          rawText: detection.rawText,
        }
      );
    }
  }

  /**
   * Forward detection to enforcement system
   */
  private forwardToEnforcement(detection: TokenDetectionEvent): void {
    if (detection.extracted.agent) {
      const agent = detection.extracted.agent.toLowerCase();

      // Check if this is an inspector or orchestrator agent
      if (agent.includes('inspector')) {
        this.capEnforcement.recordUsage('inspector', detection.extracted.tokens, {
          source: detection.source,
          model: detection.extracted.model,
          confidence: detection.confidence,
        });
      } else if (agent.includes('orchestrator')) {
        this.capEnforcement.recordUsage('orchestrator', detection.extracted.tokens, {
          source: detection.source,
          model: detection.extracted.model,
          confidence: detection.confidence,
        });
      }
    }
  }

  /**
   * Get recent detection events
   */
  getRecentDetections(minutes = 10): TokenDetectionEvent[] {
    const cutoff = TimeUtils.minutesAgo(minutes);
    return this.eventCache.filter(d => d.timestamp >= cutoff);
  }

  /**
   * Get detection statistics
   */
  getDetectionStats() {
    return {
      ...this.detectionStats,
      successRate: this.detectionStats.totalDetections > 0
        ? (this.detectionStats.successfulExtractions / this.detectionStats.totalDetections) * 100
        : 0,
      cacheSize: this.eventCache.length,
      activeMonitors: this.activeMonitors.size,
      lastUpdate: this.lastUpdate,
    };
  }

  /**
   * Add custom detection pattern
   */
  addDetectionPattern(pattern: TokenDetectionPattern): void {
    this.detectionPatterns.push(pattern);
    logger.info('RealtimeTokenUsageDetector', 'Added custom detection pattern', {
      id: pattern.id,
      name: pattern.name,
    });
  }

  /**
   * Remove detection pattern
   */
  removeDetectionPattern(patternId: string): boolean {
    const initialLength = this.detectionPatterns.length;
    this.detectionPatterns = this.detectionPatterns.filter(p => p.id !== patternId);

    if (this.detectionPatterns.length < initialLength) {
      logger.info('RealtimeTokenUsageDetector', 'Removed detection pattern', { patternId });
      return true;
    }

    return false;
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const cutoff = TimeUtils.hoursAgo(1);
    const initialSize = this.eventCache.length;

    this.eventCache = this.eventCache.filter(d => d.timestamp >= cutoff);

    // Clean up old activity records
    for (const [sourceId, lastSeen] of Array.from(this.lastActivity.entries())) {
      if (TimeUtils.now().getTime() - lastSeen.getTime() > 30 * 60 * 1000) { // 30 minutes
        this.lastActivity.delete(sourceId);
      }
    }

    // Clean up old debounce timers
    for (const [sourceId, timer] of Array.from(this.debounceTimers.entries())) {
      clearTimeout(timer);
      this.debounceTimers.delete(sourceId);
    }

    if (this.eventCache.length < initialSize) {
      logger.debug('RealtimeTokenUsageDetector', 'Cache cleanup completed', {
        removed: initialSize - this.eventCache.length,
        remaining: this.eventCache.length,
      });
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    // Stop all active monitors
    for (const [id, monitor] of Array.from(this.activeMonitors.entries())) {
      monitor.kill();
      logger.debug('RealtimeTokenUsageDetector', `Stopped monitor: ${id}`);
    }
    this.activeMonitors.clear();

    // Stop file watchers
    for (const [id, watcher] of Array.from(this.fileWatchers.entries())) {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
      logger.debug('RealtimeTokenUsageDetector', `Stopped file watcher: ${id}`);
    }
    this.fileWatchers.clear();

    // Clear debounce timers
    for (const timer of Array.from(this.debounceTimers.values())) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.removeAllListeners();

    logger.info('RealtimeTokenUsageDetector', 'Token usage detection stopped');
  }
}