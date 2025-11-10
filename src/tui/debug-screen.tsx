/**
 * TUI Debug Screen Component
 *
 * Comprehensive debug mode with real-time event logging, JSON syntax highlighting,
 * system status display, agent tracking, and signal monitoring based on tui-implementation.md
 */

import { EventEmitter } from 'events';
import { EventBus } from '../shared/events';
import { createLayerLogger } from '../shared/logger';

export interface DebugEvent {
  id: string;
  timestamp: Date;
  source: 'system' | 'scanner' | 'inspector' | 'orchestrator' | 'guidelines' | 'agent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  data: unknown;
  raw?: string; // Raw log line for display
}

export interface SystemStatus {
  agents: Array<{
    id: string;
    role: string;
    status: 'spawning' | 'running' | 'idle' | 'error';
    task: string;
    progress: number;
    tokens: string;
    activeTime: string;
  }>;
  signals: Array<{
    code: string;
    state: 'placeholder' | 'active' | 'progress' | 'resolved';
    role?: string;
    latest?: boolean;
  }>;
  orchestrator: {
    status: string;
    currentPrp: string;
    CoT: string[];
    toolCall?: string;
  };
  scanner: {
    status: string;
    lastScan?: Date;
  };
  inspector: {
    status: string;
    lastInspection?: Date;
    risk?: number;
  };
}

/**
 * Inspector event data interface
 */
export interface InspectorEventData {
  risk?: number;
  type?: string;
  [key: string]: unknown;
}

/**
 * Agent data interface
 */
export interface AgentData {
  id?: string;
  role?: string;
  status?: string;
  task?: string;
  progress?: number;
  tokens?: string;
  activeTime?: string;
  [key: string]: unknown;
}

export interface DebugConfig {
  maxEvents: number;
  refreshInterval: number;
  showFullJson: boolean;
  colorScheme: {
    system: string;
    scanner: string;
    inspector: string;
    orchestrator: string;
    guidelines: string;
    agent: string;
    high: string;
    medium: string;
    low: string;
    critical: string;
    json: {
      key: string;
      string: string;
      number: string;
      boolean: string;
      null: string;
      bracket: string;
      brace: string;
    };
  };
  keyBindings: {
    toggleFullJson: string;
    clearEvents: string;
    exportLogs: string;
    backToMain: string;
    pauseUpdates: string;
  };
}

export class TuiDebugScreen extends EventEmitter {
  private config: DebugConfig;
  private eventBus: EventBus;
  private logger: ReturnType<typeof createLayerLogger>;
  private events: DebugEvent[] = [];
  private systemStatus: SystemStatus;
  private isActive = false;
  private isPaused = false;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(config: DebugConfig, eventBus: EventBus) {
    super();
    this.config = config;
    this.eventBus = eventBus;
    this.logger = createLayerLogger('tui');

    this.systemStatus = {
      agents: [],
      signals: [],
      orchestrator: {
        status: 'idle',
        currentPrp: 'none',
        CoT: []
      },
      scanner: {
        status: 'idle'
      },
      inspector: {
        status: 'idle'
      }
    };

    this.setupEventListeners();
  }

  /**
   * Activate debug screen
   */
  activate(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.setupKeyboardHandlers();
    this.startRefreshLoop();

    this.logger.info('activate', 'Debug screen activated');
    this.emit('debug.activated');

    // Add initial system event
    this.addEvent({
      timestamp: new Date(),
      source: 'system',
      priority: 'medium',
      type: 'debug_mode_enabled',
      data: { screen: 'debug', timestamp: new Date().toISOString() },
      raw: 'system · Debug mode activated - Real-time event monitoring started'
    });
  }

  /**
   * Deactivate debug screen
   */
  deactivate(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.cleanupKeyboardHandlers();
    this.stopRefreshLoop();

    this.logger.info('deactivate', 'Debug screen deactivated');
    this.emit('debug.deactivated');
  }

  /**
   * Add a debug event
   */
  addEvent(event: Omit<DebugEvent, 'id'>): void {
    if (!this.isActive && event.source !== 'system') {
      return;
    }

    const debugEvent: DebugEvent = {
      id: `${event.source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...event
    };

    this.events.unshift(debugEvent);

    // Trim events if exceeds max
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(0, this.config.maxEvents);
    }

    this.emit('debug.event', debugEvent);

    // Update system status based on event
    this.updateSystemStatus(debugEvent);
  }

  /**
   * Get current debug content for rendering
   */
  getDebugContent(): string[] {
    if (!this.isActive) {
      return [];
    }

    const content: string[] = [];

    // Header
    content.push('⚠️  DEBUG MODE - REAL-TIME EVENT MONITORING');
    content.push('═'.repeat(process.stdout.columns || 80));
    content.push('');

    // System Status Summary
    content.push('📊 SYSTEM STATUS');
    content.push('┌' + '─'.repeat(process.stdout.columns - 2) + '┐');

    // Orchestrator status
    content.push(`│ 🎼 Orchestrator: ${this.systemStatus.orchestrator.status.padEnd(20)} PRP: ${this.systemStatus.orchestrator.currentPrp.padEnd(25)} ${''.padEnd(process.stdout.columns - 67)}│`);

    // Agent count
    const activeAgents = this.systemStatus.agents.filter(a => a.status === 'running').length;
    content.push(`│ 🤖 Active Agents: ${activeAgents.toString().padEnd(15)} Total Events: ${this.events.length.toString().padEnd(15)} Status: ${this.isPaused ? 'PAUSED' : 'RUNNING'.padEnd(10)} ${''.padEnd(process.stdout.columns - 70)}│`);

    content.push('└' + '─'.repeat(process.stdout.columns - 2) + '┘');
    content.push('');

    // Recent Events
    content.push('📋 RECENT EVENTS (NEWEST FIRST)');
    content.push('─'.repeat(process.stdout.columns || 80));

    const displayEvents = this.events.slice(0, 20); // Show last 20 events
    for (const event of displayEvents) {
      const eventLines = this.formatEvent(event);
      content.push(...eventLines);
    }

    content.push('');

    // Active Signals
    if (this.systemStatus.signals.length > 0) {
      content.push('🎯 ACTIVE SIGNALS');
      content.push('─'.repeat(process.stdout.columns || 80));
      const signalLine = this.formatSignals(this.systemStatus.signals);
      content.push(signalLine);
      content.push('');
    }

    // Agent Status
    if (this.systemStatus.agents.length > 0) {
      content.push('🤖 AGENT STATUS');
      content.push('─'.repeat(process.stdout.columns || 80));
      for (const agent of this.systemStatus.agents) {
        const agentLines = this.formatAgent(agent);
        content.push(...agentLines);
      }
      content.push('');
    }

    // Footer with controls
    content.push('─'.repeat(process.stdout.columns || 80));
    content.push(`Controls: ${this.config.keyBindings.toggleFullJson.toUpperCase()} Toggle Full JSON | ${this.config.keyBindings.clearEvents.toUpperCase()} Clear | ${this.config.keyBindings.pauseUpdates.toUpperCase()} Pause | ${this.config.keyBindings.backToMain.toUpperCase()} Back`);
    content.push(`Status: ${this.isPaused ? '⏸️ PAUSED' : '▶️ RUNNING'} | Events: ${this.events.length}/${this.config.maxEvents} | ${new Date().toLocaleTimeString()}`);

    return content;
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
    this.logger.info('clearEvents', 'Debug events cleared');
    this.emit('debug.cleared');

    this.addEvent({
      timestamp: new Date(),
      source: 'system',
      priority: 'low',
      type: 'events_cleared',
      data: { clearedAt: new Date().toISOString() },
      raw: 'system · Debug events cleared by user'
    });
  }

  /**
   * Toggle pause state
   */
  togglePause(): void {
    this.isPaused = !this.isPaused;
    this.logger.info('togglePause', `Debug updates ${this.isPaused ? 'paused' : 'resumed'}`);
    this.emit('debug.pause.toggled', this.isPaused);
  }

  /**
   * Export events to file
   */
  async exportEvents(filePath?: string): Promise<void> {
    const filename = filePath ?? `debug-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEvents: this.events.length,
      systemStatus: this.systemStatus,
      events: this.events
    };

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filename, JSON.stringify(exportData, null, 2));

      this.logger.info('exportEvents', `Debug events exported to ${filename}`);
      this.emit('debug.exported', { filename, count: this.events.length });

      this.addEvent({
        timestamp: new Date(),
        source: 'system',
        priority: 'low',
        type: 'events_exported',
        data: { filename, count: this.events.length },
        raw: `system · Debug events exported to ${filename}`
      });
    } catch (error) {
      this.logger.error('exportEvents', `Failed to export events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private methods

  private setupEventListeners(): void {
    // Listen to system events
    this.eventBus.onChannelEvent('system', '*', (event: { data: unknown }) => {
      this.handleSystemEvent(event);
    });

    this.eventBus.onChannelEvent('scanner', '*', (event: { data: unknown }) => {
      this.handleScannerEvent(event);
    });

    this.eventBus.onChannelEvent('inspector', '*', (event: { data: unknown }) => {
      this.handleInspectorEvent(event);
    });

    this.eventBus.onChannelEvent('orchestrator', '*', (event: { data: unknown }) => {
      this.handleOrchestratorEvent(event);
    });
  }

  private handleSystemEvent(event: { data: unknown }): void {
    const data = event.data as Record<string, unknown>;
    this.addEvent({
      timestamp: new Date(),
      source: 'system',
      priority: 'medium',
      type: (data.type as string) || 'system_event',
      data,
      raw: this.formatRawLogLine('system', data)
    });
  }

  private handleScannerEvent(event: { data: unknown }): void {
    const data = event.data as Record<string, unknown>;
    this.systemStatus.scanner = {
      status: 'scanning',
      lastScan: new Date()
    };

    this.addEvent({
      timestamp: new Date(),
      source: 'scanner',
      priority: 'low',
      type: (data.type as string) || 'scan_event',
      data,
      raw: this.formatRawLogLine('scanner', data)
    });
  }

  private handleInspectorEvent(event: { data: unknown }): void {
    const data = event.data as InspectorEventData;
    this.systemStatus.inspector = {
      status: 'inspecting',
      lastInspection: new Date(),
      risk: data.risk ?? 0
    };

    this.addEvent({
      timestamp: new Date(),
      source: 'inspector',
      priority: data.risk && data.risk > 7 ? 'high' : 'medium',
      type: data.type ?? 'inspection_event',
      data,
      raw: this.formatRawLogLine('inspector', data)
    });
  }

  private handleOrchestratorEvent(event: { data: unknown }): void {
    const data = event.data as Record<string, unknown>;

    if (data.currentPrp) {
      this.systemStatus.orchestrator.currentPrp = data.currentPrp as string;
    }

    if (data.CoT) {
      // CoT should be an array - convert if it's a string
      if (Array.isArray(data.CoT)) {
        this.systemStatus.orchestrator.CoT = data.CoT;
      } else {
        this.systemStatus.orchestrator.CoT = [data.CoT as string];
      }
    }

    this.addEvent({
      timestamp: new Date(),
      source: 'orchestrator',
      priority: 'high',
      type: (data.type as string) || 'orchestrator_event',
      data,
      raw: this.formatRawLogLine('orchestrator', data)
    });
  }

  private updateSystemStatus(event: DebugEvent): void {
    // Update signals based on events
    if (event.data && typeof event.data === 'object' && 'signals' in event.data) {
      const signals = (event.data as Record<string, unknown>).signals as string[];
      this.systemStatus.signals = signals.map(code => ({
        code,
        state: 'active' as const,
        latest: true
      }));
    }

    // Update agent status based on events
    if (event.source === 'agent' && event.data && typeof event.data === 'object') {
      const agentData = event.data as AgentData;
      const existingAgent = this.systemStatus.agents.find(a => a.id === agentData.id);

      if (existingAgent) {
        Object.assign(existingAgent, agentData);
      } else {
        this.systemStatus.agents.push({
          id: agentData.id ?? 'unknown',
          role: agentData.role ?? 'unknown',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          status: (agentData.status as 'spawning' | 'running' | 'idle' | 'error') || 'idle',
          task: agentData.task ?? 'No task',
          progress: agentData.progress ?? 0,
          tokens: agentData.tokens ?? '0',
          activeTime: agentData.activeTime ?? '00:00:00'
        });
      }
    }
  }

  private formatEvent(event: DebugEvent): string[] {
    const lines: string[] = [];
    const color = this.getSourceColor(event.source);
    const priorityColor = this.getPriorityColor(event.priority);
    const timestamp = event.timestamp.toLocaleTimeString();

    if (event.raw) {
      lines.push(`${color}${event.source}\x1b[0m · ${timestamp}`);
      lines.push(`${priorityColor}${event.raw}\x1b[0m`);
    } else {
      lines.push(`${color}${event.source}\x1b[0m · ${timestamp} · ${event.type}`);
      if (this.config.showFullJson && event.data) {
        const jsonLines = this.formatJson(event.data);
        lines.push(...jsonLines.map(line => `  ${line}`));
      } else {
        lines.push(`  ${JSON.stringify(event.data)}`);
      }
    }

    return lines;
  }

  private formatRawLogLine(_source: string, data: unknown): string {
    // Format data like the debug screen examples
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;

      if (record.detected && Array.isArray(record.detected)) {
        return `{ detected: [${(record.detected as string[]).map((d: string) => `"${d}"`).join(', ')}], count: ${record.count ?? record.detected.length} }`;
      }

      if (record.impact || record.risk) {
        const parts = [];
        if (record.impact) {
          parts.push(`impact: "${record.impact}"`);
        }
        if (record.risk) {
          parts.push(`risk: ${record.risk}`);
        }
        if (record.files && Array.isArray(record.files)) {
          parts.push(`files: [${(record.files as string[]).slice(0, 2).map((f: string) => `"${f.length > 10 ? f.substring(0, 10) + '…' : f}"`).join(', ')}]`);
        }
        if (record.why) {
          parts.push(`why: "${record.why}"`);
        }
        return `{ ${parts.join(', ')} }`;
      }
    }

    return JSON.stringify(data);
  }

  private formatJson(data: unknown, indent = 0): string[] {
    const lines: string[] = [];
    const spaces = '  '.repeat(indent);
    const jsonStr = JSON.stringify(data, null, 2);
    const jsonLines = jsonStr.split('\n');

    for (const line of jsonLines) {
      const coloredLine = this.colorizeJsonLine(line);
      lines.push(`${spaces}${coloredLine}`);
    }

    return lines;
  }

  private colorizeJsonLine(line: string): string {
    return line
      .replace(/"([^"]+)":/g, `${this.config.colorScheme.json.key}$1\x1b[0m:`)
      .replace(/: "([^"]+)"/g, `: ${this.config.colorScheme.json.string}"$1"\x1b[0m`)
      .replace(/: (\d+)/g, `: ${this.config.colorScheme.json.number}$1\x1b[0m`)
      .replace(/: (true|false)/g, `: ${this.config.colorScheme.json.boolean}$1\x1b[0m`)
      .replace(/: null/g, `: ${this.config.colorScheme.json.null}null\x1b[0m`)
      .replace(/[[\]]/g, `${this.config.colorScheme.json.bracket}$&\x1b[0m`)
      .replace(/[{}]/g, `${this.config.colorScheme.json.brace}$&\x1b[0m`);
  }

  private formatSignals(signals: SystemStatus['signals']): string {
    return signals.map(signal => {
      let color = '\x1b[90m'; // Default gray for placeholder
      let code = signal.code;

      if (signal.state === 'active') {
        // Determine color based on signal type
        if (signal.code.includes('aA')) {
          color = this.config.colorScheme.agent;
        } else if (signal.code.includes('pr')) {
          color = '\x1b[94m';
        } // Blue
        else if (signal.code.includes('PR')) {
          color = '\x1b[96m';
        } // Cyan
        else if (signal.code.includes('FF')) {
          color = '\x1b[93m';
        } // Yellow
        else {
          color = '\x1b[97m';
        } // White
      } else if (signal.state === 'resolved') {
        color = '\x1b[37m'; // Dim white
      }

      if (signal.latest) {
        code = `${color}${signal.code}\x1b[1m*\x1b[0m`; // Bold asterisk for latest
      } else {
        code = `${color}${signal.code}\x1b[0m`;
      }

      return code;
    }).join(' ');
  }

  private formatAgent(agent: SystemStatus['agents'][0]): string[] {
    const lines: string[] = [];
    const statusIcon = this.getStatusIcon(agent.status);
    const roleColor = this.getRoleColor(agent.role);

    lines.push(`${statusIcon} ${agent.status.padEnd(10)} \x1b[1m${agent.id}\x1b[0m#${roleColor}${agent.role}\x1b[0m`);
    lines.push(`   Task: ${agent.task} | DoD: ${agent.progress}% | Tokens: ${agent.tokens} | Active: ${agent.activeTime}`);

    return lines;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'spawning': return '♪';
      case 'running': return '♬';
      case 'idle': return '♫';
      case 'error': return '✗';
      default: return '•';
    }
  }

  private getSourceColor(source: string): string {
    const color = this.config.colorScheme[source as keyof typeof this.config.colorScheme];
    return typeof color === 'string' ? color : '\x1b[97m';
  }

  private getPriorityColor(priority: string): string {
    const color = this.config.colorScheme[priority as keyof typeof this.config.colorScheme];
    return typeof color === 'string' ? color : '\x1b[97m';
  }

  private getRoleColor(role: string): string {
    // Map role names to colors (simplified version)
    if (role.includes('aqa')) {
      return '\x1b[95m';
    } // Purple
    if (role.includes('developer')) {
      return '\x1b[94m';
    } // Blue
    if (role.includes('system-analyst')) {
      return '\x1b[33m';
    } // Brown/yellow
    if (role.includes('devops') || role.includes('sre')) {
      return '\x1b[92m';
    } // Green
    if (role.includes('ux-ui')) {
      return '\x1b[91m';
    } // Pink/red
    return '\x1b[97m'; // White
  }

  private setupKeyboardHandlers(): void {
    process.stdin.on('data', this.handleKeyPress.bind(this));
  }

  private cleanupKeyboardHandlers(): void {
    process.stdin.removeAllListeners('data');
  }

  private handleKeyPress(key: string): void {
    switch (key) {
      case this.config.keyBindings.toggleFullJson:
        this.config.showFullJson = !this.config.showFullJson;
        this.emit('debug.config.changed', { showFullJson: this.config.showFullJson });
        break;

      case this.config.keyBindings.clearEvents:
        this.clearEvents();
        break;

      case this.config.keyBindings.exportLogs:
        this.exportEvents();
        break;

      case this.config.keyBindings.backToMain:
        this.deactivate();
        this.emit('debug.back.to.main');
        break;

      case this.config.keyBindings.pauseUpdates:
        this.togglePause();
        break;
    }
  }

  private startRefreshLoop(): void {
    this.refreshTimer = setInterval(() => {
      if (!this.isPaused && this.isActive) {
        this.emit('debug.refresh');
      }
    }, this.config.refreshInterval);
  }

  private stopRefreshLoop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}