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
  agentType: string;
  tokensUsed: number;
  limit: number;
  remaining: number;
  timestamp: Date;
  operation: 'request' | 'response' | 'tool_call';
  model?: string;
  prpId?: string;
  signal?: string;
  cost?: number;
}
// Enhanced interfaces for real-time token monitoring
export interface TokenLimitEnforcement {
  agentId: string;
  agentType: string;
  thresholds: {
    softWarning: number; // 70%
    moderateWarning: number; // 80%
    criticalWarning: number; // 90%
    hardStop: number; // 95%
  };
  enforcement: {
    at70percent: 'log_warning';
    at80percent: 'emit_alert';
    at90percent: 'throttle_requests';
    at95percent: 'block_requests';
    at100percent: 'emergency_stop';
  };
}
export interface TokenCostCalculation {
  model: string;
  provider: 'openai' | 'anthropic' | 'cohere' | 'custom';
  inputTokenPrice: number; // Price per 1K input tokens
  outputTokenPrice: number; // Price per 1K output tokens
  currency: string;
  lastUpdated: Date;
}
export interface TokenMonitoringConfig {
  agents: Record<
    string,
    {
      tokenLimits: TokenLimits;
      costThresholds: CostThresholds;
      monitoringSettings: MonitoringSettings;
    }
  >;
  system: {
    updateFrequency: number;
    retentionPeriod: number;
    compressionEnabled: boolean;
    performanceMode: 'high' | 'balanced' | 'low';
  };
}
export interface TokenLimits {
  daily?: number;
  weekly?: number;
  monthly?: number;
  total?: number;
}
export interface CostThresholds {
  warningThreshold: number; // 80% default
  criticalThreshold: number; // 95% default
  dailyBudget?: number;
  weeklyBudget?: number;
  monthlyBudget?: number;
}
export interface MonitoringSettings {
  realTimeUpdates: boolean;
  eventBuffering: boolean;
  compressionEnabled: boolean;
  analyticsEnabled: boolean;
  alertingEnabled: boolean;
}
export interface TokenStatistics {
  totalTokens: number;
  totalCost: number;
  averageTokensPerRequest: number;
  requestsPerMinute: number;
  costPerMinute: number;
  efficiency: number; // tokens/cost ratio
  trend: 'increasing' | 'decreasing' | 'stable';
}
export interface TokenProjection {
  timeframe: 'hour' | 'day' | 'week' | 'month';
  projectedUsage: number;
  projectedCost: number;
  confidence: number; // 0-1 confidence level
  recommendations: string[];
}
// Event system interfaces
export type TokenEventCallback = () => void;
export interface TokenEventSubscription {
  id: string;
  agentId: string;
  callback: TokenEventCallback;
  createdAt: Date;
}
// Performance monitoring interfaces
export interface TokenPerformanceMetrics {
  eventProcessingLatency: number; // milliseconds
  memoryUsage: number; // bytes
  cpuUsage: number; // percentage
  eventThroughput: number; // events per second
  subscriberCount: number;
  bufferUtilization: number; // percentage
}
// TUI dashboard interfaces
export interface TUIDashboardData {
  summary: {
    totalAgents: number;
    totalTokensUsed: number;
    totalCost: number;
    activeAlerts: number;
  };
  agents: AgentTokenStatus[];
  alerts: TokenAlert[];
  trends: TokenTrendData[];
  projections: TokenProjection[];
}
export interface AgentTokenStatus {
  agentId: string;
  agentType: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  cost: number;
  status: 'normal' | 'warning' | 'critical' | 'blocked';
  lastActivity: Date;
  efficiency: number;
}
export interface TokenAlert {
  id: string;
  agentId: string;
  type: 'warning' | 'critical' | 'blocked';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}
export interface TokenTrendData {
  timestamp: Date;
  usage: number;
  cost: number;
  agentBreakdown: Record<string, number>;
}
