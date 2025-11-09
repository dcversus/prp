/**
 * Token Accounting CLI Utilities
 *
 * Provides CLI commands and utilities for token accounting integration
 * with real-time monitoring and verbose output capabilities.
 */

import { TokenAccountant } from '../scanner/token-accountant.js';
import { TokenMetricsStream } from '../monitoring/TokenMetricsStream.js';
import { TokenUsageEvent, AgentTokenStatus, TokenAlert } from '../types/token-metrics.js';
import { logger } from './logger.js';

export interface TokenAccountingOptions {
  verbose?: boolean;
  quiet?: boolean;
  dryRun?: boolean;
  format?: 'text' | 'json' | 'table';
}

export interface TokenTrackingContext {
  commandName: string;
  agentId?: string;
  prpId?: string;
  startTime: Date;
}

/**
 * CLI Token Accounting Manager
 * Integrates token tracking into CLI commands with real-time monitoring
 */
export class CLITokenAccounting {
  private tokenAccountant: TokenAccountant;
  private tokenStream: TokenMetricsStream;
  private activeSessions: Map<string, TokenTrackingContext> = new Map();

  constructor() {
    this.tokenAccountant = new TokenAccountant();
    this.tokenStream = new TokenMetricsStream({
      bufferSize: 100,
      backpressureThreshold: 500,
      maxSubscribers: 10
    });
  }

  /**
   * Start tracking a CLI command execution
   */
  startTracking(sessionId: string, context: TokenTrackingContext): void {
    this.activeSessions.set(sessionId, context);

    if (process.env.VERBOSE_MODE === 'true') {
      logger.info('token-accounting', `🔍 Started token tracking for ${context.commandName} (session: ${sessionId})`);
    }

    // Subscribe to real-time token updates for this session
    this.tokenStream.subscribe(context.agentId || 'cli', (dataPoint) => {
      this.handleTokenUpdate(sessionId, dataPoint);
    });
  }

  /**
   * Stop tracking a CLI command execution
   */
  stopTracking(sessionId: string, options: TokenAccountingOptions = {}): void {
    const context = this.activeSessions.get(sessionId);
    if (!context) {
      logger.warn('token-accounting', `No active tracking session found for ${sessionId}`);
      return;
    }

    const duration = Date.now() - context.startTime.getTime();

    if (options.verbose && !options.quiet) {
      const summary = this.getTokenSummary(sessionId);
      logger.info('token-accounting', `📊 Token tracking summary for ${context.commandName}:`);
      logger.info('token-accounting', `   Duration: ${Math.round(duration / 1000)}s`);
      logger.info('token-accounting', `   Tokens Used: ${summary.totalTokensUsed}`);
      logger.info('token-accounting', `   Cost: $${summary.totalCost.toFixed(4)}`);
      logger.info('token-accounting', `   Operations: ${summary.operationCount}`);
    }

    this.activeSessions.delete(sessionId);

    if (options.verbose) {
      logger.info('token-accounting', `✅ Stopped token tracking for ${context.commandName} (session: ${sessionId})`);
    }
  }

  /**
   * Track a token usage event
   */
  trackTokenUsage(sessionId: string, event: Omit<TokenUsageEvent, 'timestamp'>): void {
    const context = this.activeSessions.get(sessionId);
    if (!context) {
      logger.warn('token-accounting', `Cannot track token usage - no active session for ${sessionId}`);
      return;
    }

    const fullEvent: TokenUsageEvent = {
      ...event,
      timestamp: new Date(),
      agentId: event.agentId || context.agentId || 'cli',
      prpId: event.prpId || context.prpId,
    };

    // Record in token accountant
    this.tokenAccountant.recordUsage({
      agentId: fullEvent.agentId,
      agentType: fullEvent.agentType,
      tokens: fullEvent.tokensUsed,
      operation: fullEvent.operation,
      prpId: fullEvent.prpId,
      signal: fullEvent.signal,
      model: fullEvent.model
    });

    // Emit event for real-time monitoring
    this.tokenStream.emit('tokenUsage', {
      timestamp: fullEvent.timestamp,
      agentId: fullEvent.agentId,
      tokensUsed: fullEvent.tokensUsed,
      limit: this.getTokenLimit(fullEvent.agentId),
      remaining: this.getRemainingTokens(fullEvent.agentId),
      cost: fullEvent.cost
    });

    if (process.env.VERBOSE_MODE === 'true') {
      logger.info('token-accounting', `💰 Token usage: ${fullEvent.tokensUsed} tokens (${fullEvent.operation})`);

      if (fullEvent.cost) {
        logger.info('token-accounting', `💵 Cost: $${fullEvent.cost.toFixed(6)} (${fullEvent.model || 'unknown model'})`);
      }
    }
  }

  /**
   * Get current token status for display
   */
  getTokenStatus(agentId?: string): AgentTokenStatus[] {
    // For now, return a basic status since the TokenAccountant doesn't have getAllLimits/getAllUsage
    return [{
      agentId: agentId || 'cli',
      agentType: 'cli',
      currentUsage: 0,
      limit: 10000, // Default limit
      percentage: 0,
      cost: 0,
      status: 'normal',
      lastActivity: new Date(),
      efficiency: 0
    }];
  }

  /**
   * Get token alerts
   */
  getTokenAlerts(): TokenAlert[] {
    // For now, return empty array - will implement when TokenAccountant has getActiveAlerts
    return [];
  }

  /**
   * Get comprehensive token summary
   */
  getTokenSummary(_sessionId?: string): {
    totalTokensUsed: number;
    totalCost: number;
    operationCount: number;
    agentStatuses: AgentTokenStatus[];
    alerts: TokenAlert[];
  } {
    const agentStatuses = this.getTokenStatus();
    const alerts = this.getTokenAlerts();

    const totalTokensUsed = agentStatuses.reduce((sum, status) => sum + status.currentUsage, 0);
    const totalCost = agentStatuses.reduce((sum, status) => sum + status.cost, 0);
    const operationCount = 0; // Will implement when TokenAccountant has getEventCount

    return {
      totalTokensUsed,
      totalCost,
      operationCount,
      agentStatuses,
      alerts
    };
  }

  /**
   * Display token accounting information in various formats
   */
  displayTokenInfo(options: TokenAccountingOptions = {}): void {
    const summary = this.getTokenSummary();
    const format = options.format || 'text';

    if (options.quiet) {
      return;
    }

    switch (format) {
      case 'json':
        console.log(JSON.stringify(summary, null, 2));
        break;

      case 'table':
        this.displayTokenTable(summary);
        break;

      case 'text':
      default:
        this.displayTokenText(summary, options.verbose);
        break;
    }
  }

  /**
   * Check if agent is approaching token limits
   */
  checkTokenLimits(agentId?: string): boolean {
    const alerts = this.getTokenAlerts();
    const relevantAlerts = agentId
      ? alerts.filter(alert => alert.agentId === agentId)
      : alerts;

    return relevantAlerts.length > 0;
  }

  /**
   * Get token limit for agent
   */
  private getTokenLimit(_agentId: string): number {
    // For now, return default limit - will implement when TokenAccountant has getLimit
    return 10000;
  }

  /**
   * Get remaining tokens for agent
   */
  private getRemainingTokens(agentId: string): number {
    const limit = this.getTokenLimit(agentId);
    // For now, return full limit - will implement when TokenAccountant has getUsage
    return limit;
  }

  
  
  /**
   * Handle real-time token updates
   */
  private handleTokenUpdate(sessionId: string, dataPoint: any): void {
    const context = this.activeSessions.get(sessionId);
    if (!context) return;

    // Check for limit warnings
    const percentage = (dataPoint.tokensUsed / dataPoint.limit) * 100;
    if (percentage >= 90 && process.env.VERBOSE_MODE === 'true') {
      logger.warn('token-accounting',
        `⚠️  ${dataPoint.agentId} approaching token limit: ${Math.round(percentage)}% used`);
    }
  }

  /**
   * Display token information in text format
   */
  private displayTokenText(summary: any, verbose: boolean = false): void {
    console.log('\n📊 Token Accounting Summary');
    console.log('═'.repeat(50));
    console.log(`Total Tokens Used: ${summary.totalTokensUsed.toLocaleString()}`);
    console.log(`Total Cost: $${summary.totalCost.toFixed(4)}`);
    console.log(`Total Operations: ${summary.operationCount}`);

    if (summary.agentStatuses.length > 0) {
      console.log('\n🤖 Agent Status:');
      summary.agentStatuses.forEach((status: AgentTokenStatus) => {
        const statusIcon = this.getStatusIcon(status.status);
        console.log(`  ${statusIcon} ${status.agentId} (${status.agentType})`);
        console.log(`     Tokens: ${status.currentUsage.toLocaleString()} / ${status.limit.toLocaleString()} (${status.percentage}%)`);
        console.log(`     Cost: $${status.cost.toFixed(4)} | Efficiency: ${status.efficiency.toFixed(1)} tokens/op`);
      });
    }

    if (summary.alerts.length > 0) {
      console.log('\n🚨 Active Alerts:');
      summary.alerts.forEach((alert: TokenAlert) => {
        console.log(`  ${alert.type.toUpperCase()}: ${alert.message} (${alert.agentId})`);
      });
    }

    if (verbose) {
      console.log('\n📈 Detailed Metrics:');
      console.log(`   Average tokens per operation: ${summary.operationCount > 0 ? Math.round(summary.totalTokensUsed / summary.operationCount) : 0}`);
      console.log(`   Average cost per operation: $${summary.operationCount > 0 ? (summary.totalCost / summary.operationCount).toFixed(6) : '0.000000'}`);
    }

    console.log('');
  }

  /**
   * Display token information in table format
   */
  private displayTokenTable(summary: any): void {
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│                    TOKEN SUMMARY                       │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│ Total Tokens: ${summary.totalTokensUsed.toString().padEnd(15)} Cost: $${summary.totalCost.toFixed(4).padEnd(10)} │`);
    console.log(`│ Operations: ${summary.operationCount.toString().padEnd(14)} Avg: ${summary.operationCount > 0 ? Math.round(summary.totalTokensUsed / summary.operationCount).toString() : '0'.padEnd(12)} │`);
    console.log('└─────────────────────────────────────────────────────────┘');

    if (summary.agentStatuses.length > 0) {
      console.log('\n┌─────────────────────────────────────────────────────────┐');
      console.log('│                    AGENT STATUS                         │');
      console.log('├─────────────────────────────────────────────────────────┤');
      summary.agentStatuses.forEach((status: AgentTokenStatus) => {
        console.log(`│ ${status.agentId.padEnd(20)} ${status.percentage.toString().padEnd(3)}% $${status.cost.toFixed(4).padEnd(10)} │`);
      });
      console.log('└─────────────────────────────────────────────────────────┘');
    }
  }

  /**
   * Get status icon for agent status
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'normal': return '✅';
      case 'warning': return '⚠️ ';
      case 'critical': return '🔥';
      case 'blocked': return '🚫';
      default: return '❓';
    }
  }
}

/**
 * Global token accounting instance for CLI usage
 */
export const cliTokenAccounting = new CLITokenAccounting();

/**
 * Utility function to create a tracking session for CLI commands
 */
export function createTokenSession(
  commandName: string,
  agentId?: string,
  prpId?: string
): string {
  const sessionId = `${commandName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  cliTokenAccounting.startTracking(sessionId, {
    commandName,
    agentId,
    prpId,
    startTime: new Date()
  });

  return sessionId;
}

/**
 * Utility function to end a tracking session
 */
export function endTokenSession(sessionId: string, options: TokenAccountingOptions = {}): void {
  cliTokenAccounting.stopTracking(sessionId, options);
}

/**
 * Utility function to track token usage in CLI commands
 */
export function trackTokens(
  sessionId: string,
  tokensUsed: number,
  operation: 'request' | 'response' | 'tool_call',
  model?: string,
  cost?: number
): void {
  cliTokenAccounting.trackTokenUsage(sessionId, {
    tokensUsed,
    operation,
    model,
    cost,
    agentType: 'cli',
    agentId: 'cli',
    limit: 10000,
    remaining: 10000 - tokensUsed
  });
}