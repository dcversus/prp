/**
 * ♫ Terminal Monitor for @dcversus/prp
 *
 * Monitors terminal activity, detects idle states,
 * and generates signals for the scanner system.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs, constants } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { createLayerLogger } from '../../shared/logger.js';

import type { Timeout } from '../shared/types';
import type { ChildProcess} from 'child_process';
import type { EventBus } from '../../shared/events.js';
import type { Signal } from '../../shared/types.js';
import type { TerminalActivity, ResourceMetrics } from './types';
import type { setTimeout } from 'timers';

export interface TerminalMonitorConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  idleThreshold: number; // milliseconds of inactivity
  activityWindowSize: number; // number of recent activities to track
  logActivities: boolean;
  signalGeneration: {
    enabled: boolean;
    idleSignal: string;
    errorSignal: string;
    resourceSignal: string;
    thresholds: {
      idleTime: number; // milliseconds
      memoryUsage: number; // MB
      cpuUsage: number; // percentage
      errorRate: number; // errors per minute
    };
  };
}
export interface ActivityWindow {
  activities: TerminalActivity[];
  windowStart: Date;
  windowEnd: Date;
  totalKeystrokes: number;
  totalCommands: number;
  totalErrors: number;
  idlePeriods: Array<{ start: Date; end: Date; duration: number }>;
}
/**
 * Monitors terminal sessions and generates signals based on activity patterns
 */
export class TerminalMonitor {
  private readonly config: TerminalMonitorConfig;
  private readonly eventBus: EventBus;
  private readonly logger: ReturnType<typeof createLayerLogger>;
  private readonly activityBuffers = new Map<string, TerminalActivity[]>();
  private readonly lastActivities = new Map<string, Date>();
  private readonly monitoringProcesses = new Map<string, ChildProcess>();
  private readonly resourceTrackers = new Map<string, Timeout>();
  // private _isRunning = false; // Unused - commented out
  constructor(config: TerminalMonitorConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.logger = createLayerLogger('scanner-terminal-monitor');
  }
  /**
   * Start monitoring a terminal session
   */
  async startMonitoring(sessionId: string, paneId: string, pid?: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
    try {
      // Initialize activity buffer
      this.activityBuffers.set(sessionId, []);
      this.lastActivities.set(sessionId, new Date());
      // Start tmux activity monitoring
      await this.startTmuxMonitoring(sessionId, paneId);
      // Start resource monitoring if PID available
      if (pid) {
        this.startResourceMonitoring(sessionId, pid);
      }
      this.logger.info('startMonitoring', `Terminal monitoring started for session ${sessionId}`, {
        sessionId,
        paneId,
        pid,
      });
    } catch (error) {
      this.logger.error(
        'startMonitoring',
        'Failed to start terminal monitoring',
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId,
          paneId,
        },
      );
      this.eventBus.publishToChannel('tui', {
        id: `tmux_error_${Date.now()}`,
        type: 'tmux.error',
        timestamp: new Date(),
        source: 'terminal-monitor',
        data: {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          context: 'start_monitoring',
          recoverable: true,
        },
        metadata: {},
      });
      throw error;
    }
  }
  /**
   * Stop monitoring a terminal session
   */
  async stopMonitoring(sessionId: string): Promise<void> {
    try {
      // Stop tmux monitoring
      const tmuxProcess = this.monitoringProcesses.get(sessionId);
      if (tmuxProcess) {
        tmuxProcess.kill('SIGTERM');
        this.monitoringProcesses.delete(sessionId);
      }
      // Stop resource monitoring
      const resourceTracker = this.resourceTrackers.get(sessionId);
      if (resourceTracker) {
        clearInterval(resourceTracker);
        this.resourceTrackers.delete(sessionId);
      }
      // Clean up buffers
      this.activityBuffers.delete(sessionId);
      this.lastActivities.delete(sessionId);
      this.logger.info('stopMonitoring', `Terminal monitoring stopped for session ${sessionId}`, {
        sessionId,
      });
    } catch (error) {
      this.logger.error(
        'stopMonitoring',
        'Failed to stop terminal monitoring',
        error instanceof Error ? error : new Error(String(error)),
        { sessionId },
      );
    }
  }
  /**
   * Get activity statistics for a session
   */
  getActivityStats(sessionId: string): ActivityWindow | null {
    const activities = this.activityBuffers.get(sessionId);
    if (!activities || activities.length === 0) {
      return null;
    }
    const windowStart = activities[0]?.timestamp ?? new Date();
    const windowEnd = activities[activities.length - 1]?.timestamp ?? new Date();
    const stats: ActivityWindow = {
      activities: activities.slice(-this.config.activityWindowSize),
      windowStart,
      windowEnd,
      totalKeystrokes: activities.filter((a) => a.type === 'keystroke').length,
      totalCommands: activities.filter((a) => a.type === 'command').length,
      totalErrors: activities.filter((a) => a.type === 'error').length,
      idlePeriods: this.calculateIdlePeriods(activities),
    };
    return stats;
  }
  /**
   * Force check for idle state and generate signal if needed
   */
  async checkIdleState(sessionId: string): Promise<void> {
    const lastActivity = this.lastActivities.get(sessionId);
    if (!lastActivity) {
      return;
    }
    const now = new Date();
    const idleTime = now.getTime() - lastActivity.getTime();
    if (idleTime > this.config.idleThreshold) {
      await this.generateIdleSignal(sessionId, idleTime);
    }
  }
  /**
   * Manually record an activity event
   */
  recordActivity(
    sessionId: string,
    activity: Omit<TerminalActivity, 'sessionId' | 'timestamp'>,
  ): void {
    const fullActivity: TerminalActivity = {
      sessionId,
      timestamp: new Date(),
      ...activity,
    };
    this.addActivityToBuffer(sessionId, fullActivity);
    this.lastActivities.set(sessionId, fullActivity.timestamp);
    // Emit activity event
    this.eventBus.publishToChannel('tui', {
      id: `tmux_activity_${Date.now()}`,
      type: 'tmux.activity.detected',
      timestamp: new Date(),
      source: 'terminal-monitor',
      data: {
        sessionId,
        activity: fullActivity,
      },
      metadata: {},
    });
  }
  /**
   * Get recent activities for a session
   */
  getRecentActivities(sessionId: string, limit = 50): TerminalActivity[] {
    const activities = this.activityBuffers.get(sessionId);
    if (!activities) {
      return [];
    }
    return activities.slice(-limit);
  }
  // Private methods
  private async startTmuxMonitoring(sessionId: string, paneId: string): Promise<void> {
    const monitorScript = `
      #!/bin/bash
      # Monitor tmux pane activity
      PANE_ID="${paneId}"
      SESSION_ID="${sessionId}"
      CHECK_INTERVAL=${Math.floor(this.config.checkInterval / 1000)}
      # Monitor pane activity
      while true; do
        # Capture current pane content
        CONTENT=$(tmux capture-pane -t "$PANE_ID" -p)
        # Check for activity indicators
        if [[ -n "$CONTENT" ]]; then
          # Detect command prompts
          if echo "$CONTENT" | grep -E "[$%#]\\s*$" > /dev/null; then
            echo "ACTIVITY:COMMAND:$(date +%s):$(echo "$CONTENT" | tail -1)"
          fi
          # Detect error indicators
          if echo "$CONTENT" | grep -E "(error|Error|ERROR|failed|Failed|FAILED)" > /dev/null; then
            echo "ACTIVITY:ERROR:$(date +%s):$(echo "$CONTENT" | tail -1)"
          fi
          # Detect output (non-empty content)
          if [[ -n "$CONTENT" ]]; then
            echo "ACTIVITY:OUTPUT:$(date +%s):$CONTENT"
          fi
        fi
        sleep $CHECK_INTERVAL
      done
    `;
    // Create temporary monitor script
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'prp-monitor-'));
    const scriptPath = join(tempDir, `monitor-${sessionId}.sh`);
    await fs.writeFile(scriptPath, monitorScript);
    await fs.chmod(scriptPath, constants.S_IRWXU | constants.S_IRGRP | constants.S_IROTH);
    // Start monitoring process
    const monitorProcess = spawn('bash', [scriptPath], {
      stdio: 'pipe',
      env: { ...process.env },
    });
    this.monitoringProcesses.set(sessionId, monitorProcess);
    // Process monitoring output
    monitorProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (line.startsWith('ACTIVITY:')) {
          this.processActivityLine(sessionId, line);
        }
      }
    });
    monitorProcess.stderr.on('data', (data) => {
      this.logger.error(
        'startTmuxMonitoring',
        'Terminal monitor error',
        new Error(data.toString()),
        {
          sessionId,
        },
      );
    });
    monitorProcess.on('exit', (code) => {
      this.logger.warn('startTmuxMonitoring', `Terminal monitor exited with code ${code}`, {
        sessionId,
        code,
      });
      this.monitoringProcesses.delete(sessionId);
      // Clean up temp file
      fs.unlink(scriptPath).catch(() => {});
      fs.rmdir(tempDir).catch(() => {});
    });
  }
  private processActivityLine(sessionId: string, line: string): void {
    const parts = line.split(':', 4);
    if (parts.length < 4) {
      return;
    }
    const [, activityType, timestampStr, content] = parts;
    const timestamp = new Date(parseInt(timestampStr ?? '0', 10) * 1000);
    const activity: TerminalActivity = {
      sessionId,
      timestamp,
      type: this.mapActivityType(activityType ?? ''),
      content:
        content && content.length > 200 ? `${content.substring(0, 200)  }...` : (content ?? ''),
    };
    this.addActivityToBuffer(sessionId, activity);
    this.lastActivities.set(sessionId, timestamp);
    // Emit activity event
    this.eventBus.publishToChannel('tui', {
      id: `tmux_activity_${Date.now()}`,
      type: 'tmux.activity.detected',
      timestamp: new Date(),
      source: 'terminal-monitor',
      data: {
        sessionId,
        activity,
      },
      metadata: {},
    });
    // Check for immediate signal generation
    if (activity.type === 'error' && this.config.signalGeneration.enabled) {
      this.generateErrorSignal(sessionId, activity);
    }
  }
  private mapActivityType(type: string): TerminalActivity['type'] {
    const typeMap: Record<string, TerminalActivity['type']> = {
      COMMAND: 'command',
      ERROR: 'error',
      OUTPUT: 'output',
      KEYSTROKE: 'keystroke',
    };
    return typeMap[type] ?? 'output';
  }
  private addActivityToBuffer(sessionId: string, activity: TerminalActivity): void {
    const buffer = this.activityBuffers.get(sessionId) ?? [];
    buffer.push(activity);
    // Keep only recent activities
    if (buffer.length > this.config.activityWindowSize * 2) {
      buffer.splice(0, buffer.length - this.config.activityWindowSize);
    }
    this.activityBuffers.set(sessionId, buffer);
  }
  private startResourceMonitoring(sessionId: string, pid: number): void {
    const interval = setInterval(async () => {
      try {
        const metrics = await this.captureResourceMetrics(pid);
        // Check resource thresholds
        if (metrics.memory.used > this.config.signalGeneration.thresholds.memoryUsage) {
          await this.generateResourceSignal(sessionId, 'memory', metrics.memory.used);
        }
        if (metrics.cpu.percentage > this.config.signalGeneration.thresholds.cpuUsage) {
          await this.generateResourceSignal(sessionId, 'cpu', metrics.cpu.percentage);
        }
      } catch (error) {
        this.logger.debug(
          'Resource monitoring error',
          error instanceof Error ? error.message : String(error),
        );
      }
    }, this.config.checkInterval);
    this.resourceTrackers.set(sessionId, interval);
  }
  private async captureResourceMetrics(pid: number): Promise<ResourceMetrics> {
    const execAsync = promisify(exec);
    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o pid,pcpu,pmem,rss,vsz --no-headers`);
      const [, cpu, memPercent, rss] = stdout.trim().split(/\s+/);
      return {
        sessionId: '', // Will be filled by caller
        timestamp: new Date(),
        memory: {
          used: parseInt(rss ?? '0', 10) / 1024, // MB
          peak: 0,
          average: 0,
          percentage: parseFloat(memPercent ?? '0'),
        },
        cpu: {
          usage: parseFloat(cpu ?? '0'),
          peak: 0,
          average: 0,
          percentage: parseFloat(cpu ?? '0'),
        },
        processes: 1,
        fileDescriptors: 0,
        networkConnections: 0,
      };
    } catch (error) {
      throw new Error(`Failed to capture metrics for PID ${pid}: ${error}`);
    }
  }
  private calculateIdlePeriods(
    activities: TerminalActivity[],
  ): Array<{ start: Date; end: Date; duration: number }> {
    const idlePeriods: Array<{ start: Date; end: Date; duration: number }> = [];
    for (let i = 1; i < activities.length; i++) {
      const currentActivity = activities[i];
      const previousActivity = activities[i - 1];
      if (!currentActivity || !previousActivity) {
        continue;
      }
      const gap = currentActivity.timestamp.getTime() - previousActivity.timestamp.getTime();
      if (gap > this.config.idleThreshold) {
        idlePeriods.push({
          start: previousActivity.timestamp,
          end: currentActivity.timestamp,
          duration: gap,
        });
      }
    }
    return idlePeriods;
  }
  private async generateIdleSignal(sessionId: string, idleTime: number): Promise<void> {
    if (!this.config.signalGeneration.enabled) {
      return;
    }
    const signal: Signal = {
      id: `idle_${sessionId}_${Date.now()}`,
      type: 'info',
      priority: idleTime > 300000 ? 8 : 3, // Higher priority for extended idle
      source: 'terminal-monitor',
      timestamp: new Date(),
      data: {
        tag: `[${this.config.signalGeneration.idleSignal}]`,
        content: `Terminal session ${sessionId} has been idle for ${Math.round(idleTime / 1000)}s`,
        sessionId,
        idleTime,
        threshold: this.config.idleThreshold,
        signalDefinition: this.config.signalGeneration.idleSignal,
        category: 'orchestrator_info',
        handler: 'orchestrator',
      },
      metadata: {},
    };
    // Emit signal for scanner to pick up
    this.eventBus.publishToChannel('signals', {
      id: `signal_${Date.now()}`,
      type: 'signal.detected',
      timestamp: new Date(),
      source: 'terminal-monitor',
      data: signal,
      metadata: {},
    });
    // Emit idle detection event
    this.eventBus.publishToChannel('tui', {
      id: `tmux_idle_${Date.now()}`,
      type: 'tmux.idle.detected',
      timestamp: new Date(),
      source: 'terminal-monitor',
      data: {
        sessionId,
        idleDuration: idleTime,
        lastActivity: this.lastActivities.get(sessionId) ?? new Date(),
      },
      metadata: {},
    });
    this.logger.info('generateIdleSignal', `Idle signal generated for session ${sessionId}`, {
      sessionId,
      idleTime: Math.round(idleTime / 1000),
    });
  }
  private async generateErrorSignal(sessionId: string, activity: TerminalActivity): Promise<void> {
    if (!this.config.signalGeneration.enabled) {
      return;
    }
    const signal: Signal = {
      id: `error_${sessionId}_${Date.now()}`,
      type: 'action',
      priority: 9,
      source: 'terminal-monitor',
      timestamp: new Date(),
      data: {
        tag: `[${this.config.signalGeneration.errorSignal}]`,
        content: `Error detected in terminal session ${sessionId}: ${activity.content}`,
        sessionId,
        activityType: activity.type,
        signalDefinition: this.config.signalGeneration.errorSignal,
        category: 'orchestrator_action',
        handler: 'orchestrator',
        activityTimestamp: activity.timestamp.toISOString(),
      },
      metadata: {},
    };
    this.eventBus.publishToChannel('signals', {
      id: `signal_${Date.now()}`,
      type: 'signal.detected',
      timestamp: new Date(),
      source: 'terminal-monitor',
      data: signal,
      metadata: {},
    });
    this.logger.warn('generateErrorSignal', 'Error signal generated', {
      sessionId,
      content: activity.content,
    });
  }
  private async generateResourceSignal(
    sessionId: string,
    resourceType: string,
    value: number,
  ): Promise<void> {
    if (!this.config.signalGeneration.enabled) {
      return;
    }
    const signal: Signal = {
      id: `resource_${resourceType}_${sessionId}_${Date.now()}`,
      type: 'action',
      priority: value > (resourceType === 'memory' ? 2000 : 90) ? 9 : 7,
      source: 'terminal-monitor',
      timestamp: new Date(),
      data: {
        tag: `[${this.config.signalGeneration.resourceSignal}]`,
        content: `High ${resourceType} usage detected in session ${sessionId}: ${value}${resourceType === 'memory' ? 'MB' : '%'}`,
        sessionId,
        resourceType,
        value,
        threshold:
          resourceType === 'memory'
            ? this.config.signalGeneration.thresholds.memoryUsage
            : this.config.signalGeneration.thresholds.cpuUsage,
        signalDefinition: this.config.signalGeneration.resourceSignal,
        category: 'orchestrator_action',
        handler: 'orchestrator',
      },
      metadata: {},
    };
    this.eventBus.publishToChannel('signals', {
      id: `signal_${Date.now()}`,
      type: 'signal.detected',
      timestamp: new Date(),
      source: 'terminal-monitor',
      data: signal,
      metadata: {},
    });
    this.logger.warn('generateResourceSignal', 'Resource signal generated', {
      sessionId,
      resourceType,
      value,
    });
  }
}
