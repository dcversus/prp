/**
 * Token metrics data structures for real-time monitoring
 */

export interface TokenMetrics {
  prpId: string;
  agentType: string;
  currentUsage: number;
  limit: number;
  remaining: number;
  lastUpdate: Date;
  signalsProcessed: number;
  cost: number;
}

export interface TokenDataPoint {
  timestamp: Date;
  agentId: string;
  tokensUsed: number;
  limit: number;
  remaining: number;
  cost?: number;
}

export interface TokenUsageEvent {
  agentId: string;
  tokensUsed: number;
  limit: number;
  remaining: number;
  timestamp: Date;
}