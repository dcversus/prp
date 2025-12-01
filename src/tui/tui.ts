/**
 * ♫ Tabbed TUI for @dcversus/prp
 *
 * Terminal User Interface with tabbed navigation for
 * main screen, orchestrator, agent terminals, and info views.
 */
/* eslint-disable no-console */
import { EventEmitter } from 'events';

import { createLayerLogger } from '../shared/logger';

// Type definitions will need to be added or imported from shared types
import { getVersion } from '../shared/utils/version';

import { TuiDebugScreen } from "./debug-screen";
import { createDebugConfig } from "./debug-config";

import type {
  AgentTerminalSession,
  TmuxActivityDetectedEvent,
  TmuxResourceAlertEvent,
} from '../shared/tmux-exports';
import type { EventBus } from '../shared/events';
import type { Timeout } from '../shared/types/timeout';

export interface TabInfo {
  id: string;
  type: 'main' | 'orchestrator' | 'agent' | 'debug' | 'info' | 'prp-context' | 'token-metrics';
  title: string;
  isActive: boolean;
  lastUpdate: Date;
  agentId?: string;
  prpId?: string;
}

export interface TUIConfig {
  enabled: boolean;
  refreshInterval: number; // milliseconds
  maxTabs: number;
  keyBindings: {
    nextTab: string;
    prevTab: string;
    closeTab: string;
    switchToMain: string;
    switchToOrchestrator: string;
    switchToInfo: string;
    refresh: string;
    quit: string;
  };
  colors: {
    active: string;
    inactive: string;
    error: string;
    warning: string;
    success: string;
    text: string;
    border: string;
  };
  layout: {
    tabBar: {
      height: number;
      position: 'top' | 'bottom';
    };
    content: {
      padding: number;
      showLineNumbers: boolean;
    };
    status: {
      height: number;
      position: 'top' | 'bottom';
    };
  };
}
export interface ScreenContent {
  type: 'main' | 'orchestrator' | 'agent' | 'info' | 'logs' | 'debug';
  title: string;
  content: string[];
  metadata?: Record<string, unknown>;
  lastUpdate: Date;
}
/**
 * Tabbed Terminal User Interface for managing multiple views
 */
export class TabbedTUI extends EventEmitter {
  private readonly config: TUIConfig;
  private readonly eventBus: EventBus;
  private readonly logger: ReturnType<typeof createLayerLogger>;
  private readonly tabs = new Map<string, TabInfo>();
  private activeTabId: string | null = null;
  private readonly screenContents = new Map<string, ScreenContent>();
  private isRunning = false;
  private refreshInterval: Timeout | null = null;
  private readonly debugScreen: TuiDebugScreen | null = null;
  constructor(config: TUIConfig, eventBus: EventBus) {
    super();
    this.config = config;
    this.eventBus = eventBus;
    this.logger = createLayerLogger('tui');
    this.debugScreen = new TuiDebugScreen(createDebugConfig(), eventBus);
    this.setupEventListeners();
    this.setupDebugScreenListeners();
  }
  /**
   * Initialize and start the TUI
   */
  async start(): Promise<void> {
    if (this.isRunning || !this.config.enabled) {
      return;
    }
    try {
      // Create default tabs
      await this.createDefaultTabs();
      // Set up keyboard input handling
      this.setupKeyboardHandling();
      // Start refresh loop
      this.startRefreshLoop();
      // Start rendering
      this.startRendering();
      this.isRunning = true;
      this.activeTabId = 'main';
      this.logger.info('TabbedTUI', 'Tabbed TUI started', {
        tabCount: this.tabs.size,
        activeTab: this.activeTabId,
      });
      this.emit('tui.started');
    } catch (error) {
      this.logger.error(
        'Failed to start TUI',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
  /**
   * Stop the TUI
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    // Stop refresh loop
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    // Clean up terminal
    this.cleanupTerminal();
    this.logger.info('stop', 'Tabbed TUI stopped');
    this.emit('tui.stopped');
  }
  /**
   * Create a new tab
   */
  createTab(tabInfo: Omit<TabInfo, 'isActive' | 'lastUpdate'>): string {
    const tab: TabInfo = {
      ...tabInfo,
      isActive: false,
      lastUpdate: new Date(),
    };
    this.tabs.set(tab.id, tab);
    // Initialize screen content
    this.screenContents.set(tab.id, {
      type: tab.type,
      title: tab.title,
      content: [],
      lastUpdate: new Date(),
    });
    this.emit('tab.created', tab);
    this.logger.debug('createTab', `Tab created: ${tab.id} (${tab.type})`);
    return tab.id;
  }
  /**
   * Switch to a specific tab
   */
  switchToTab(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return false;
    }
    // Deactivate current tab
    if (this.activeTabId) {
      const currentTab = this.tabs.get(this.activeTabId);
      if (currentTab) {
        currentTab.isActive = false;
      }
    }
    // Activate new tab
    tab.isActive = true;
    tab.lastUpdate = new Date();
    this.activeTabId = tabId;
    this.emit('tab.switched', { from: this.activeTabId, to: tabId });
    this.logger.debug('switchToTab', `Tab switched from ${this.activeTabId} to ${tabId}`);
    return true;
  }
  /**
   * Close a tab
   */
  closeTab(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.type === 'main' || tab.type === 'orchestrator') {
      // Don't allow closing main tabs
      return false;
    }
    // If closing active tab, switch to main
    if (this.activeTabId === tabId) {
      this.switchToTab('main');
    }
    this.tabs.delete(tabId);
    this.screenContents.delete(tabId);
    this.emit('tab.closed', tab);
    this.logger.debug('closeTab', `Tab closed: ${tabId}`);
    return true;
  }
  /**
   * Update tab content
   */
  updateTabContent(tabId: string, content: string[], metadata?: Record<string, unknown>): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }
    const screenContent: ScreenContent = {
      type: tab.type,
      title: tab.title,
      content,
      ...(metadata && { metadata }),
      lastUpdate: new Date(),
    };
    this.screenContents.set(tabId, screenContent);
    tab.lastUpdate = new Date();
    // Update badge if there are errors/warnings
    this.updateTabBadge(tabId, content);
    this.emit('tab.content.updated', { tabId, content, metadata });
  }
  /**
   * Create agent tab for terminal session
   */
  createAgentTab(session: AgentTerminalSession): string {
    const tabId = `agent_${session.agentId}`;
    this.createTab({
      id: tabId,
      title: `Agent: ${session.agentId}`,
      type: 'agent',
      sessionId: session.id,
      agentId: session.agentId,
    });
    // Initialize with session info
    this.updateTabContent(tabId, [
      `🤖 Agent: ${session.agentId}`,
      `📁 Working Directory: ${session.workingDirectory}`,
      `📊 Status: ${session.state}`,
      `⏰ Started: ${session.startTime?.toISOString() || 'N/A'}`,
      `💬 Messages: ${session.messages.length}`,
      '',
      'Loading terminal output...',
    ]);
    return tabId;
  }
  /**
   * Update agent tab with terminal output
   */
  updateAgentTab(agentId: string, output: string): void {
    const tabId = `agent_${agentId}`;
    const content = output.split('\n').slice(-50); // Keep last 50 lines
    this.updateTabContent(tabId, content, {
      lastUpdate: new Date(),
      lines: content.length,
    });
  }
  /**
   * Get current active tab
   */
  getActiveTab(): TabInfo | null {
    return this.activeTabId ? this.tabs.get(this.activeTabId) ?? null : null;
  }
  /**
   * Get all tabs
   */
  getAllTabs(): TabInfo[] {
    return Array.from(this.tabs.values());
  }
  // Private methods
  private async createDefaultTabs(): Promise<void> {
    // Main tab
    this.createTab({
      id: 'main',
      title: '🎵 Main',
      type: 'main',
    });
    // Orchestrator tab
    this.createTab({
      id: 'orchestrator',
      title: '🎼 Orchestrator',
      type: 'orchestrator',
    });
    // Debug tab
    this.createTab({
      id: 'debug',
      title: '🐛 Debug',
      type: 'debug',
    });
    // Info tab
    this.createTab({
      id: 'info',
      title: '📊 Info',
      type: 'info',
    });
    // Initialize main screen content
    this.updateMainScreen();
  }
  private setupEventListeners(): void {
    // Listen to tmux events
    this.eventBus.onChannelEvent('tmux', 'activity.detected', (event: { data: unknown }) => {
      this.handleActivityDetected(event.data as TmuxActivityDetectedEvent);
    });
    this.eventBus.onChannelEvent('tmux', 'idle.detected', () => {
      this.handleIdleDetected();
    });
    this.eventBus.onChannelEvent('tmux', 'resource.alert', (event: { data: unknown }) => {
      this.handleResourceAlert(event.data as TmuxResourceAlertEvent);
    });
    this.eventBus.onChannelEvent('tmux', 'agent.message', (event: { data: unknown }) => {
      this.handleAgentMessage(event.data as TmuxAgentMessageEvent);
    });
  }
  private setupDebugScreenListeners(): void {
    if (!this.debugScreen) {
      return;
    }
    this.debugScreen.on('debug.activated', () => {
      this.logger.debug('debug', 'Debug screen activated');
      this.updateDebugScreen();
    });
    this.debugScreen.on('debug.deactivated', () => {
      this.logger.debug('debug', 'Debug screen deactivated');
    });
    this.debugScreen.on('debug.refresh', () => {
      if (this.activeTabId === 'debug') {
        this.updateDebugScreen();
      }
    });
    this.debugScreen.on('debug.back.to.main', () => {
      this.switchToTab('main');
    });
  }
  private setupKeyboardHandling(): void {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key: string) => {
      // Handle debug mode toggle with Ctrl+D
      if (key === '\x04') {
        // Ctrl+D
        this.toggleDebugMode();
        return;
      }
      // If debug screen is active, let it handle its own keys
      if (this.activeTabId === 'debug' && this.debugScreen) {
        // Debug screen handles its own keys internally
        // Continue to default handling for global keys
      }
      switch (key) {
        case this.config.keyBindings.nextTab:
          this.switchToNextTab();
          break;
        case this.config.keyBindings.prevTab:
          this.switchToPrevTab();
          break;
        case this.config.keyBindings.closeTab:
          this.closeCurrentTab();
          break;
        case this.config.keyBindings.switchToMain:
          this.switchToTab('main');
          break;
        case this.config.keyBindings.switchToOrchestrator:
          this.switchToTab('orchestrator');
          break;
        case this.config.keyBindings.switchToInfo:
          this.switchToTab('info');
          break;
        case this.config.keyBindings.refresh:
          this.refreshCurrentTab();
          break;
        case this.config.keyBindings.quit:
          this.stop();
          process.exit(0);
      }
    });
  }
  private startRefreshLoop(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshAllTabs();
    }, this.config.refreshInterval);
  }
  private startRendering(): void {
    // This would integrate with a terminal rendering library
    // For now, we'll just log updates
    setInterval(() => {
      if (this.isRunning) {
        this.render();
      }
    }, 100); // 10 FPS rendering
  }
  private render(): void {
    // Clear screen and render tab bar + content
    console.clear();
    this.renderTabBar();
    this.renderContent();
    this.renderStatusBar();
    // Move cursor to position for input
    process.stdout.write('\x1b[H');
  }
  private renderTabBar(): void {
    const tabs = Array.from(this.tabs.values());
    const tabWidth = Math.floor(process.stdout.columns / tabs.length) - 1;
    // Build tab bar
    let tabBar = '';
    for (const tab of tabs) {
      const isActive = tab.id === this.activeTabId;
      const color = this.getTabColor(tab);
      const title = tab.title.padEnd(tabWidth - 2, ' ');
      const badge = tab.badge ? ` (${tab.badge.count})` : '';
      tabBar += `${isActive ? '\x1b[7m' : ''}${color}${title}${badge}\x1b[0m|`;
    }
    logger.debug(tabBar);
    logger.debug('─'.repeat(process.stdout.columns));
  }
  private renderContent(): void {
    if (!this.activeTabId) {
      return;
    }
    const content = this.screenContents.get(this.activeTabId);
    if (!content) {
      return;
    }
    const maxLines =
      process.stdout.rows - this.config.layout.tabBar.height - this.config.layout.status.height - 2;
    const lines = content.content.slice(-maxLines);
    for (const line of lines) {
      logger.debug(`${this.config.colors.text}${line}\x1b[0m`);
    }
  }
  private renderStatusBar(): void {
    const activeTab = this.getActiveTab();
    const status = activeTab ? `${activeTab.title} - ${activeTab.type}` : 'No active tab';
    const timestamp = new Date().toLocaleTimeString();
    logger.debug('─'.repeat(process.stdout.columns));
    logger.debug(`${status.padEnd(process.stdout.columns - timestamp.length - 1)}${timestamp}`);
  }
  private getTabColor(tab: TabInfo): string {
    if (tab.isActive) {
      return this.config.colors.active;
    }
    if (tab.badge) {
      switch (tab.badge.type) {
        case 'error':
          return this.config.colors.error;
        case 'warning':
          return this.config.colors.warning;
        case 'success':
          return this.config.colors.success;
        default:
          return this.config.colors.text;
      }
    }
    return this.config.colors.inactive;
  }
  private updateTabBadge(tabId: string, content: string[]): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }
    // Count errors and warnings in content
    const errorCount = content.filter(
      (line) => line.toLowerCase().includes('error') || line.toLowerCase().includes('failed'),
    ).length;
    const warningCount = content.filter(
      (line) => line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn'),
    ).length;
    if (errorCount > 0) {
      tab.badge = { type: 'error', count: errorCount };
    } else if (warningCount > 0) {
      tab.badge = { type: 'warning', count: warningCount };
    } else {
      tab.badge = undefined;
    }
  }
  private switchToNextTab(): void {
    const tabs = Array.from(this.tabs.keys());
    const currentIndex = tabs.indexOf(this.activeTabId ?? '');
    const nextIndex = (currentIndex + 1) % tabs.length;
    this.switchToTab(tabs[nextIndex] ?? '');
  }
  private switchToPrevTab(): void {
    const tabs = Array.from(this.tabs.keys());
    const currentIndex = tabs.indexOf(this.activeTabId ?? '');
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    this.switchToTab(tabs[prevIndex] ?? '');
  }
  private closeCurrentTab(): void {
    if (this.activeTabId) {
      this.closeTab(this.activeTabId);
    }
  }
  private refreshCurrentTab(): void {
    if (this.activeTabId) {
      this.refreshTab(this.activeTabId);
    }
  }
  private refreshAllTabs(): void {
    for (const tabId of this.tabs.keys()) {
      this.refreshTab(tabId);
    }
  }
  private refreshTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }
    switch (tab.type) {
      case 'main':
        this.updateMainScreen();
        break;
      case 'orchestrator':
        this.updateOrchestratorScreen();
        break;
      case 'debug':
        this.updateDebugScreen();
        break;
      case 'info':
        this.updateInfoScreen();
        break;
      case 'agent':
        this.updateAgentScreen(tab.agentId);
        break;
    }
  }
  private updateMainScreen(): void {
    const content = [
      '🎵 ♫ @dcversus/prp - Three-Layer Architecture',
      '',
      '📊 System Status:',
      `   Active Sessions: ${this.tabs.size}`,
      `   Active Agents: ${Array.from(this.tabs.values()).filter((t) => t.type === 'agent').length}`,
      `   Uptime: ${process.uptime().toFixed(0)}s`,
      '',
      '🔥 Recent Activity:',
      '   • System operational',
      '   • All layers running',
      '   • Agents available',
      '',
      '📋 Quick Actions:',
      '   • Press Ctrl+O for Orchestrator',
      '   • Press Ctrl+I for Info',
      '   • Press Tab to switch tabs',
      '   • Press Ctrl+C to quit',
      '',
      `Last updated: ${new Date().toLocaleTimeString()}`,
    ];
    this.updateTabContent('main', content);
  }
  private updateOrchestratorScreen(): void {
    const content = [
      '🎼 Orchestrator - Decision Making Hub',
      '',
      '📊 Current Status:',
      '   • Chain-of-thought reasoning active',
      '   • Agent coordination running',
      '   • Resource monitoring enabled',
      '',
      '🤖 Active Agents:',
      ...Array.from(this.tabs.values())
        .filter((t) => t.type === 'agent')
        .map((t) => `   • ${t.title.replace('Agent: ', '')} - ${t.sessionId}`),
      '',
      '⚡ Recent Decisions:',
      '   • No recent decisions',
      '',
      '💰 Token Usage:',
      '   • Total: 0',
      '   • Cost: $0.00000',
      '',
      `Last updated: ${new Date().toLocaleTimeString()}`,
    ];
    this.updateTabContent('orchestrator', content);
  }
  private updateInfoScreen(): void {
    const content = [
      '📊 System Information',
      '',
      '🖥️  Terminal Info:',
      `   • Dimensions: ${process.stdout.columns}x${process.stdout.rows}`,
      `   • Shell: ${process.env['SHELL'] || 'unknown'}`,
      `   • Tmux: ${process.env['TMUX'] || 'not running'}`,
      '',
      '💾 Resource Usage:',
      `   • Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`,
      `   • CPU: ${process.cpuUsage().user}`,
      `   • Uptime: ${process.uptime().toFixed(0)}s`,
      '',
      '🎵 ♫ @dcversus/prp:',
      `   • Version: ${getVersion()}`,
      '   • Architecture: 3-Layer',
      `   • Active Sessions: ${this.tabs.size}`,
      '',
      '📋 Available Tabs:',
      ...Array.from(this.tabs.values()).map((t) => `   • ${t.title} (${t.type})`),
      '',
      `Last updated: ${new Date().toLocaleTimeString()}`,
    ];
    this.updateTabContent('info', content);
  }
  private updateAgentScreen(agentId: string): void {
    // This would be updated by the tmux manager when new output is available
    // For now, show placeholder
    const content = [
      `🤖 Agent: ${agentId}`,
      '',
      'Loading terminal output...',
      '',
      'Use keyboard shortcuts to interact:',
      '   • Ctrl+S: Send message to agent',
      '   • Ctrl+R: Refresh output',
      '   • Ctrl+K: Kill agent session',
      '',
      `Last updated: ${new Date().toLocaleTimeString()}`,
    ];
    this.updateTabContent(`agent_${agentId}`, content);
  }
  private cleanupTerminal(): void {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    console.clear();
    logger.debug('🎵 ♫ @dcversus/prp TUI stopped. Goodbye! 🎵');
  }
  // Event handlers
  private handleActivityDetected(event: TmuxActivityDetectedEvent): void {
    // Update agent tab if activity is for an agent
    const agentTab = Array.from(this.tabs.values()).find(
      (t) => t.sessionId === event.sessionId && t.type === 'agent',
    );
    if (agentTab) {
      this.refreshTab(agentTab.id);
    }
  }
  private handleIdleDetected(): void {
    // Update info screen with idle detection
    this.updateInfoScreen();
  }
  private handleResourceAlert(event: TmuxResourceAlertEvent): void {
    // Update badge for agent tab with resource alert
    const agentTab = Array.from(this.tabs.values()).find(
      (t) => t.sessionId === event.sessionId && t.type === 'agent',
    );
    if (agentTab) {
      agentTab.badge = {
        type: event.metric === 'memory' ? 'warning' : 'error',
        count: 1,
      };
    }
  }
  private handleAgentMessage(event: TmuxAgentMessageEvent): void {
    // Update agent tab content with new message
    const agentTab = Array.from(this.tabs.values()).find(
      (t) => t.sessionId === event.sessionId && t.type === 'agent',
    );
    if (agentTab) {
      this.refreshTab(agentTab.id);
    }
  }
  private updateDebugScreen(): void {
    if (!this.debugScreen) {
      return;
    }
    const debugContent = this.debugScreen.getDebugContent();
    this.updateTabContent('debug', debugContent, {
      lastUpdate: new Date(),
      active: this.debugScreen['isActive'],
    });
  }
  private toggleDebugMode(): void {
    if (!this.debugScreen) {
      return;
    }
    if (this.activeTabId === 'debug') {
      // Switch away from debug tab
      this.switchToTab('main');
      this.debugScreen.deactivate();
    } else {
      // Switch to debug tab and activate
      this.switchToTab('debug');
      this.debugScreen.activate();
    }
  }
}
