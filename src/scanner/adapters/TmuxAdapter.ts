/**
 * Tmux Adapter - Detects signals from tmux sessions
 * Part of [PRP-000-agents05.md](../../../PRPs/PRP-000-agents05.md): Signal Sensor Inspector Implementation
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

import { createLayerLogger } from '../../shared';

const logger = createLayerLogger('scanner');
const execAsync = promisify(exec);
export interface TmuxSession {
  id: string;
  name: string;
  windows: TmuxWindow[];
  created: Date;
  attached: boolean;
}
export interface TmuxWindow {
  id: number;
  name: string;
  paneCount: number;
  currentPane: number;
  active: boolean;
}
export interface TmuxSignalEvent {
  type:
    | 'session_created'
    | 'session_closed'
    | 'window_created'
    | 'window_closed'
    | 'command_executed';
  signal?: string;
  sessionId: string;
  sessionName: string;
  windowId?: number;
  windowName?: string;
  command?: string;
  output?: string;
  timestamp: Date;
}
export class TmuxAdapter {
  private readonly logPath: string;
  private readonly sessions = new Map<string, TmuxSession>();
  private watching = false;
  private watchInterval?: NodeJS.Timeout;
  constructor(logPath?: string) {
    // Default tmux log locations
    this.logPath = logPath ?? path.join(process.env.HOME ?? '', '.tmux/logs');
  }
  /**
   * Check if tmux is available
   */
  async isTmuxAvailable(): Promise<boolean> {
    try {
      await execAsync('which tmux');
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get all active tmux sessions
   */
  async getActiveSessions(): Promise<TmuxSession[]> {
    const sessions: TmuxSession[] = [];
    try {
      const { stdout } = await execAsync(
        'tmux list-sessions -F "#{session_id}|#{session_name}|#{session_created}|#{session_attached}"',
      );
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line) {
          continue;
        }
        const parts = line.split('|');
        if (parts.length < 4) {
          continue;
        }
        const [id, name, createdStr, attachedStr] = parts;
        if (!id || !name || !createdStr || attachedStr === undefined) {
          continue;
        }
        const created = new Date(createdStr);
        const attached = attachedStr === '1';
        // Get windows for this session
        const windows = await this.getSessionWindows(id);
        sessions.push({
          id,
          name,
          windows,
          created,
          attached,
        });
      }
    } catch (error) {
      logger.error(
        'TmuxAdapter',
        'Error getting tmux sessions',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    return sessions;
  }
  /**
   * Get windows for a specific session
   */
  private async getSessionWindows(sessionId: string): Promise<TmuxWindow[]> {
    const windows: TmuxWindow[] = [];
    try {
      const { stdout } = await execAsync(
        `tmux list-windows -t "${sessionId}" -F "#{window_id}|#{window_name}|#{window_flags}|#{pane_current}"`,
        { env: { ...process.env, TMUX: '' } },
      );
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line) {
          continue;
        }
        const parts = line.split('|');
        if (parts.length < 4) {
          continue;
        }
        const [idStr, name, flags, currentPaneStr] = parts;
        if (!idStr || name === undefined ?? flags === undefined ?? currentPaneStr === undefined) {
          continue;
        }
        const id = parseInt(idStr, 10);
        const active = flags.includes('*');
        const currentPane = parseInt(currentPaneStr, 10);
        // Count panes
        const { stdout: paneCountStr } = await execAsync(
          `tmux list-panes -t "${sessionId}:${id}" | wc -l`,
          { env: { ...process.env, TMUX: '' } },
        );
        const paneCount = parseInt(paneCountStr.trim(), 10);
        windows.push({
          id,
          name,
          paneCount,
          currentPane,
          active,
        });
      }
    } catch (error) {
      logger.error(
        'TmuxAdapter',
        `Error getting windows for session ${sessionId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    return windows;
  }
  /**
   * Parse tmux log files for signals
   */
  async parseLogFiles(): Promise<TmuxSignalEvent[]> {
    const events: TmuxSignalEvent[] = [];
    if (!fs.existsSync(this.logPath)) {
      return events;
    }
    try {
      const logFiles = await fs.promises.readdir(this.logPath);
      const today = new Date().toISOString().split('T')[0];
      const todayLogFile = logFiles.find((f) => f.includes(today ?? ''));
      if (!todayLogFile) {
        return events;
      }
      const logContent = await fs.promises.readFile(path.join(this.logPath, todayLogFile), 'utf8');
      const lines = logContent.split('\n');
      const signalPattern = /\[([a-zA-Z]{2})\]/g;
      for (const line of lines) {
        if (!line) {
          continue;
        }
        const signals: string[] = [];
        let match;
        while ((match = signalPattern.exec(line)) !== null) {
          if (match[1]) {
            signals.push(match[1]);
          }
        }
        if (signals.length > 0) {
          // Try to parse tmux session info from line
          const tmuxMatch = line.match(/\[tmux (\d+)\]/);
          const sessionId = tmuxMatch?.[1] ?? 'unknown';
          for (const signal of signals) {
            events.push({
              type: 'command_executed',
              signal,
              sessionId,
              sessionName: await this.getSessionName(sessionId),
              output: line.trim(),
              timestamp: new Date(),
            });
          }
        }
      }
    } catch (error) {
      logger.error(
        'TmuxAdapter',
        'Error parsing tmux log files',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    return events;
  }
  /**
   * Capture tmux session output in real-time
   */
  async captureSessionOutput(sessionId: string, windowId?: number): Promise<string> {
    try {
      const target = windowId ? `${sessionId}:${windowId}` : sessionId;
      const { stdout } = await execAsync(`tmux capture-pane -t "${target}" -p`, {
        env: { ...process.env, TMUX: '' },
      });
      return stdout;
    } catch (error) {
      logger.error(
        'TmuxAdapter',
        `Error capturing tmux output for ${sessionId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return '';
    }
  }
  /**
   * Watch tmux sessions for activity
   */
  async watchSessions(callback: (event: TmuxSignalEvent) => void): Promise<void> {
    if (this.watching) {
      logger.warn('TmuxAdapter', 'Tmux adapter is already watching');
      return;
    }
    this.watching = true;
    logger.info('TmuxAdapter', '📺 Starting tmux session monitoring...');
    // Initial scan
    const currentSessions = await this.getActiveSessions();
    currentSessions.forEach((session) => {
      this.sessions.set(session.id, session);
    });
    // Set up periodic monitoring
    this.watchInterval = setInterval(async () => {
      const newSessions = await this.getActiveSessions();
      // Detect new sessions
      for (const session of newSessions) {
        if (!this.sessions.has(session.id)) {
          callback({
            type: 'session_created',
            sessionId: session.id,
            sessionName: session.name,
            timestamp: new Date(),
          });
        }
        // Check for signals in session output
        const output = await this.captureSessionOutput(session.id);
        const signals = this.extractSignalsFromText(output);
        signals.forEach((signal) => {
          callback({
            type: 'command_executed',
            signal,
            sessionId: session.id,
            sessionName: session.name,
            output: output.substring(0, 200), // Truncate for readability
            timestamp: new Date(),
          });
        });
      }
      // Detect closed sessions
      for (const [oldSessionId] of Array.from(this.sessions.entries())) {
        if (!newSessions.find((s) => s.id === oldSessionId)) {
          callback({
            type: 'session_closed',
            sessionId: oldSessionId,
            sessionName: this.sessions.get(oldSessionId)?.name ?? 'unknown',
            timestamp: new Date(),
          });
        }
      }
      // Update sessions map
      this.sessions.clear();
      newSessions.forEach((session) => {
        this.sessions.set(session.id, session);
      });
    }, 5000); // Check every 5 seconds
  }
  /**
   * Stop watching tmux sessions
   */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
    }
    this.watching = false;
    logger.info('TmuxAdapter', '📺 Stopped tmux session monitoring');
  }
  /**
   * Get session name by ID
   */
  private async getSessionName(sessionId: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `tmux display-message -p "#{session_name}" -t "${sessionId}"`,
      );
      return stdout.trim();
    } catch {
      return sessionId;
    }
  }
  /**
   * Extract [XX] signals from text
   */
  private extractSignalsFromText(text: string): string[] {
    const signalPattern = /\[([a-zA-Z]{2})\]/g;
    const signals: string[] = [];
    let match;
    while ((match = signalPattern.exec(text)) !== null) {
      if (match[1]) {
        signals.push(match[1]);
      }
    }
    return Array.from(new Set(signals)); // Remove duplicates
  }
  /**
   * Send command to tmux session
   */
  async sendCommand(sessionId: string, command: string): Promise<void> {
    try {
      await execAsync(`tmux send-keys -t "${sessionId}" "${command}"`);
    } catch (error) {
      logger.error(
        'TmuxAdapter',
        `Error sending command to tmux session ${sessionId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  /**
   * Create new tmux session
   */
  async createSession(sessionName: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`tmux new-session -d -s "${sessionName}"`);
      // Extract session ID from output
      const match = stdout.match(/session (\d+): created/);
      return match?.[1] ?? sessionName;
    } catch (error) {
      logger.error(
        'TmuxAdapter',
        `Error creating tmux session ${sessionName}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
  /**
   * Get tmux server info
   */
  async getServerInfo(): Promise<{
    version: string;
    socketPath: string;
    pid?: number;
  }> {
    try {
      const { stdout } = await execAsync('tmux info -S');
      const lines = stdout.split('\n');
      const info = {
        version: '',
        socketPath: '',
        pid: undefined as number | undefined,
      };
      for (const line of lines) {
        if (line.includes('version')) {
          const parts = line.split(':');
          if (parts.length > 1 && parts[1]) {
            info.version = parts[1].trim();
          }
        } else if (line.includes('socket_path')) {
          const parts = line.split(':');
          if (parts.length > 1 && parts[1]) {
            info.socketPath = parts[1].trim();
          }
        } else if (line.includes('pid')) {
          const parts = line.split(':');
          if (parts.length > 1 && parts[1]) {
            const pidStr = parts[1].trim();
            if (pidStr) {
              info.pid = parseInt(pidStr, 10);
            }
          }
        }
      }
      return info;
    } catch (error) {
      logger.error(
        'TmuxAdapter',
        'Error getting tmux server info',
        error instanceof Error ? error : new Error(String(error)),
      );
      return { version: '', socketPath: '' };
    }
  }
}
