/**
 * ♫ Tmux Integration Exports for @dcversus/prp
 *
 * Complete tmux management system for agent terminal
 * orchestration, monitoring, and TUI interface.
 */
import type { TmuxConfig } from './types/tmux';

// Import actual implementation classes (will be created later)
// For now, we'll use placeholder types
export class TmuxManager {
  constructor(config: TmuxConfig, eventBus: any) {}
  async initialize(): Promise<void> {}
  async createAgentSession(agentId: string, agentConfig: any, instructions: string, workingDirectory: string): Promise<any> { return null; }
  async sendInstructionsToAgent(sessionId: string, instructions: string): Promise<void> {}
  async terminateSession(sessionId: string, reason?: any): Promise<void> {}
  async cleanup(): Promise<void> {}
}

export type { TmuxConfig } from './types/tmux';
export type {
  TmuxSession,
  AgentTerminalSession,
  TmuxCommand,
  TmuxCommandResult,
  TerminalActivity,
  ResourceMetrics,
  AgentMessage,
  TmuxManagerConfig,
  TmuxManagerAPI,
  TmuxSessionCreatedEvent,
  TmuxSessionTerminatedEvent,
  TmuxActivityDetectedEvent,
  TmuxIdleDetectedEvent,
  TmuxResourceAlertEvent,
  TmuxAgentMessageEvent,
  TmuxErrorEvent,
  TabInfo,
  AgentTaskResult,
} from './types/tmux';

// Configuration utilities
export const createDefaultTmuxConfig = (): TmuxConfig => ({
  socketName: 'prp-tmux',
  baseSessionName: 'prp-main',
  maxSessions: 10,
  defaultShell: process.env.SHELL || '/bin/bash',
  sessionTimeout: 3600000, // 1 hour
  idleTimeout: 300000, // 5 minutes
  logLevel: 'info',
  resourceMonitoring: {
    enabled: true,
    intervalMs: 5000, // 5 seconds
    retentionHours: 24,
  },
  terminal: {
    defaultProfile: 'default',
    historyLimit: 10000,
    scrollbackLines: 5000,
  },
});
