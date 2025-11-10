/**
 * ♫ Tmux Integration Exports for @dcversus/prp
 *
 * Complete tmux management system for agent terminal
 * orchestration, monitoring, and TUI interface.
 */

import type {
  TmuxConfig
} from './types';
import type { TUIConfig } from './tui';
import type { TerminalMonitorConfig } from './terminal-monitor';

export { TmuxManager } from './tmux-manager';
export { TerminalMonitor } from './terminal-monitor';
export { TabbedTUI } from './tui';
export type { TUIConfig } from './tui';
export type { TerminalMonitorConfig } from './terminal-monitor';
export type {
  // Types
  TmuxConfig,
  TmuxSession,
  AgentTerminalSession,
  TmuxCommand,
  TmuxCommandResult,
  TerminalActivity,
  ResourceMetrics,
  AgentMessage,
  TmuxManagerConfig,
  TmuxSessionCreatedEvent,
  TmuxSessionTerminatedEvent,
  TmuxActivityDetectedEvent,
  TmuxIdleDetectedEvent,
  TmuxResourceAlertEvent,
  TmuxAgentMessageEvent,
  TmuxErrorEvent,
  TabInfo
} from './types';

// Configuration utilities
export const createDefaultTmuxConfig = (): TmuxConfig => ({
  socketName: 'prp-tmux',
  baseSessionName: 'prp-main',
  maxSessions: 10,
  defaultShell: process['env']['SHELL'] || '/bin/bash',
  sessionTimeout: 3600000, // 1 hour
  idleTimeout: 300000, // 5 minutes
  logLevel: 'info',
  resourceMonitoring: {
    enabled: true,
    intervalMs: 5000, // 5 seconds
    retentionHours: 24
  },
  terminal: {
    defaultProfile: 'default',
    historyLimit: 10000,
    scrollbackLines: 5000
  }
});

export const createDefaultTUIConfig = (): TUIConfig => ({
  enabled: true,
  refreshInterval: 1000, // 1 second
  maxTabs: 10,
  keyBindings: {
    nextTab: '\t', // Tab
    prevTab: '\x1b[Z', // Shift+Tab
    closeTab: '\x0f', // Ctrl+O
    switchToMain: '\x01', // Ctrl+A
    switchToOrchestrator: '\x0f', // Ctrl+O
    switchToInfo: '\x09', // Ctrl+I
    refresh: '\x12', // Ctrl+R
    quit: '\x03' // Ctrl+C
  },
  colors: {
    active: '\x1b[36m', // Cyan
    inactive: '\x1b[37m', // White
    error: '\x1b[31m', // Red
    warning: '\x1b[33m', // Yellow
    success: '\x1b[32m', // Green
    text: '\x1b[37m', // White
    border: '\x1b[90m' // Bright black (gray)
  },
  layout: {
    tabBar: {
      height: 1,
      position: 'top'
    },
    content: {
      padding: 1,
      showLineNumbers: false
    },
    status: {
      height: 1,
      position: 'bottom'
    }
  }
});

export const createDefaultTerminalMonitorConfig = (): TerminalMonitorConfig => ({
  enabled: true,
  checkInterval: 2000, // 2 seconds
  idleThreshold: 60000, // 1 minute
  activityWindowSize: 100,
  logActivities: true,
  signalGeneration: {
    enabled: true,
    idleSignal: 'oo-idle', // Terminal Idle - Orchestrator Info
    errorSignal: 'OO-error', // Terminal Error - Orchestrator Action
    resourceSignal: 'OO-resource', // Terminal Resource - Orchestrator Action
    thresholds: {
      idleTime: 300000, // 5 minutes
      memoryUsage: 1000, // 1GB
      cpuUsage: 80, // 80%
      errorRate: 5 // 5 errors per minute
    }
  }
});