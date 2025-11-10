/**
 * ♫ Token Tracking Tools for @dcversus/prp Orchestrator
 *
 * Tools for monitoring, managing, and optimizing token usage across agents
 */

import { Tool } from '../types';
import { createLayerLogger } from '../../shared';

const logger = createLayerLogger('orchestrator');

// Type definitions for token tracking tools
export interface GetTokenUsageParams {
  agentId?: string;
  period?: 'current' | 'daily' | 'weekly' | 'monthly';
  includeProjections?: boolean;
}

export interface SetTokenLimitsParams {
  agentId?: string;
  agentType?: 'claude-code' | 'claude-code-glm' | 'codex' | 'gemini' | 'amp' | 'aider';
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  warningThreshold?: number;
  actionThreshold?: number;
}

export interface GetTokenProjectionsParams {
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  agentId?: string;
  includeCostEstimates?: boolean;
}

export interface AnalyzeTokenEfficiencyParams {
  agentId?: string;
  period?: 'daily' | 'weekly' | 'monthly';
  includeRecommendations?: boolean;
}

export interface ConfigureTokenAlertsParams {
  agentId?: string;
  alertType: 'warning' | 'critical' | 'daily_report' | 'weekly_report';
  threshold: number;
  notificationMethod: 'console' | 'signal' | 'nudge' | 'email';
  enabled?: boolean;
  recipients?: string[];
}

export interface TokenUsageData {
  system: {
    totalUsed: number;
    totalLimit: number;
    usagePercentage: number;
  };
  agents: Array<{
    id: string;
    type: string;
    role: string;
    usage: {
      current: number;
      daily: { used: number; limit: number; percentage: number };
      weekly: { used: number; limit: number; percentage: number };
      monthly: { used: number; limit: number; percentage: number };
    };
    lastActivity: string;
    status: string;
  }>;
  costEstimate: {
    current: number;
    daily: number;
    weekly: number;
    monthly: number;
    currency: string;
  };
  projections?: {
    daily: {
      projected: number;
      estimated: string;
    };
    weekly: {
      projected: number;
      estimated: string;
    };
    monthly: {
      projected: number;
      estimated: string;
    };
  };
}

export interface HistoricalDataPoint {
  date: string;
  usage: number;
}

export interface HistoricalTokenUsage {
  timeframe: string;
  dataPoints: HistoricalDataPoint[];
}

// Interface for token caps data
interface TokenCapsData {
  totalLimit: number;
  currentUsage: number;
  percentage: number;
  status: string;
  allocation: Record<string, number>;
}

interface TokenCaps {
  [agentType: string]: TokenCapsData;
}

interface TokenCapsResult {
  agentType: string;
  tokenCaps: TokenCaps;
  summary: {
    totalAgents: number;
    totalLimit: number;
    totalUsed: number;
    averageUsage: number;
  };
  detailedBreakdown?: Record<string, {
    allocation: Record<string, number>;
    utilization: Array<{
      component: string;
      allocated: number;
      utilized: number;
      percentage: number;
    }>;
  }>;
  projections?: Record<string, unknown>;
}

interface TokenBudgetAllocation {
  method: string;
  totalBudget: number;
  reserveAmount: number;
  availableBudget: number;
  allocations: Record<string, number>;
  summary: {
    totalAllocated: number;
    agentCount: number;
    averageAllocation: number;
  };
  recommendations: string[];
}


interface NewLimitsData {
  totalLimit?: number;
  allocation?: Record<string, number>;
  [key: string]: unknown;
}

interface AdjustTokenCapsParams {
  agentId?: string;
  agentType?: string;
  adjustmentStrategy: string;
  scaleFactor?: number;
  newLimits?: NewLimitsData;
  reason?: string;
}

interface AdjustTokenCapsResult {
  success: boolean;
  previousCaps: TokenCaps;
  newCaps: TokenCaps;
  adjustments: Array<{
    agentType: string;
    component: string;
    oldValue: number;
    newValue: number;
  }>;
  reason?: string;
}

export interface ProjectionResult {
  projection: number;
  confidence: string;
  trend: string;
  averageDaily: number;
  method: string;
}

export interface TokenEfficiencyData {
  analyzedAgents: number;
  overallEfficiency: {
    score: number;
    grade: string;
    description: string;
  };
  agentBreakdown: Array<{
    id: string;
    efficiency: number;
    tokensPerTask: number;
    avgResponseTime: number;
    recommendations: string[];
  }>;
  systemRecommendations: string[];
}

/**
 * Token Usage Tracking Tool
 */
export const getTokenUsageTool: Tool = {
  id: 'get_token_usage',
  name: 'get_token_usage',
  description: 'Get current token usage statistics for agents and system',
  category: 'monitoring',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Specific agent ID to check (optional, checks all if not provided)',
      required: false
    },
    period: {
      type: 'string',
      description: 'Time period for usage statistics',
      required: false,
      enum: ['current', 'daily', 'weekly', 'monthly']
    },
    includeProjections: {
      type: 'boolean',
      description: 'Include usage projections and estimates',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as GetTokenUsageParams;
    try {
      const usageData = await collectTokenUsageData(typedParams);

      const typedUsageData = usageData;
      logger.info('get_token_usage', `Collected token usage data for ${typedUsageData.agents.length ?? 0} agents`);

      return {
        success: true,
        data: {
          period: typedParams.period ?? 'current',
          timestamp: new Date().toISOString(),
          ...typedUsageData
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('get_token_usage', 'Failed to get token usage', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * Set Token Limits Tool
 */
export const setTokenLimitsTool: Tool = {
  id: 'set_token_limits',
  name: 'set_token_limits',
  description: 'Set or update token limits for agents',
  category: 'management',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to set limits for (optional, sets default if not provided)',
      required: false
    },
    agentType: {
      type: 'string',
      description: 'Agent type to set limits for',
      required: false,
      enum: ['claude-code', 'claude-code-glm', 'codex', 'gemini', 'amp', 'aider']
    },
    dailyLimit: {
      type: 'number',
      description: 'Daily token limit',
      required: false
    },
    weeklyLimit: {
      type: 'number',
      description: 'Weekly token limit',
      required: false
    },
    monthlyLimit: {
      type: 'number',
      description: 'Monthly token limit',
      required: false
    },
    warningThreshold: {
      type: 'number',
      description: 'Warning threshold as percentage (0-100)',
      required: false
    },
    actionThreshold: {
      type: 'number',
      description: 'Action threshold as percentage (0-100)',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as SetTokenLimitsParams;
    try {
      const limits = {
        agentId: typedParams.agentId,
        agentType: typedParams.agentType,
        daily: typedParams.dailyLimit,
        weekly: typedParams.weeklyLimit,
        monthly: typedParams.monthlyLimit,
        warningThreshold: typedParams.warningThreshold ?? 80,
        actionThreshold: typedParams.actionThreshold ?? 95,
        updatedAt: new Date().toISOString()
      };

      // Store limits in persistent storage
      await storeTokenLimits();

      logger.info('set_token_limits', `Set token limits for ${typedParams.agentId ?? typedParams.agentType ?? 'default'}`);

      return {
        success: true,
        data: {
          limits,
          appliedAt: new Date().toISOString()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('set_token_limits', 'Failed to set token limits', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * Token Usage Projections Tool
 */
export const getTokenProjectionsTool: Tool = {
  id: 'get_token_projections',
  name: 'get_token_projections',
  description: 'Get token usage projections and estimates for cost planning',
  category: 'analytics',
  enabled: true,
  parameters: {
    timeframe: {
      type: 'string',
      description: 'Projection timeframe',
      required: false,
      enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    agentId: {
      type: 'string',
      description: 'Specific agent ID to project (optional, projects all if not provided)',
      required: false
    },
    includeCostEstimates: {
      type: 'boolean',
      description: 'Include cost estimates based on pricing',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as GetTokenProjectionsParams;
    try {
      const historicalData = await getHistoricalTokenUsage(typedParams.timeframe ?? 'daily');
      const projections = calculateProjections(historicalData, typedParams);

      logger.info('get_token_projections', `Generated ${typedParams.timeframe ?? 'daily'} token projections`);

      return {
        success: true,
        data: {
          timeframe: typedParams.timeframe ?? 'daily',
          generatedAt: new Date().toISOString(),
          projections,
          methodology: 'Linear regression based on historical usage patterns'
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('get_token_projections', 'Failed to generate projections', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * Token Efficiency Analysis Tool
 */
export const getTokenEfficiencyTool: Tool = {
  id: 'analyze_token_efficiency',
  name: 'analyze_token_efficiency',
  description: 'Analyze token efficiency and suggest optimizations',
  category: 'analytics',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Specific agent ID to analyze (optional, analyzes all if not provided)',
      required: false
    },
    period: {
      type: 'string',
      description: 'Analysis period',
      required: false,
      enum: ['daily', 'weekly', 'monthly']
    },
    includeRecommendations: {
      type: 'boolean',
      description: 'Include optimization recommendations',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as AnalyzeTokenEfficiencyParams;
    try {
      const efficiencyData = await analyzeTokenEfficiency();

      const typedEfficiencyData = efficiencyData;
      logger.info('analyze_token_efficiency', `Analyzed token efficiency for ${typedEfficiencyData.analyzedAgents ?? 0} agents`);

      return {
        success: true,
        data: {
          period: typedParams.period,
          analyzedAt: new Date().toISOString(),
          ...typedEfficiencyData
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('analyze_token_efficiency', 'Failed to analyze efficiency', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * Token Alert Configuration Tool
 */
export const configureTokenAlertsTool: Tool = {
  id: 'configure_token_alerts',
  name: 'configure_token_alerts',
  description: 'Configure token usage alerts and notifications',
  category: 'management',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Agent ID to configure alerts for (optional, configures default if not provided)',
      required: false
    },
    alertType: {
      type: 'string',
      description: 'Type of alert to configure',
      required: true,
      enum: ['warning', 'critical', 'daily_report', 'weekly_report']
    },
    threshold: {
      type: 'number',
      description: 'Alert threshold (percentage or absolute value)',
      required: true
    },
    notificationMethod: {
      type: 'string',
      description: 'How to send alerts',
      required: true,
      enum: ['console', 'signal', 'nudge', 'email']
    },
    enabled: {
      type: 'boolean',
      description: 'Enable or disable the alert',
      required: false
    },
    recipients: {
      type: 'array',
      description: 'List of alert recipients',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as ConfigureTokenAlertsParams;
    try {
      const alertConfig = {
        agentId: typedParams.agentId,
        alertType: typedParams.alertType,
        threshold: typedParams.threshold,
        notificationMethod: typedParams.notificationMethod,
        enabled: typedParams.enabled !== false,
        recipients: typedParams.recipients ?? [],
        configuredAt: new Date().toISOString()
      };

      // Store alert configuration
      await storeAlertConfiguration();

      logger.info('configure_token_alerts', `Configured ${typedParams.alertType} alert for ${typedParams.agentId ?? 'default'}`);

      return {
        success: true,
        data: {
          alertConfig,
          configuredAt: new Date().toISOString()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('configure_token_alerts', 'Failed to configure alerts', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

// Helper functions
async function collectTokenUsageData(params: GetTokenUsageParams): Promise<TokenUsageData> {
  // This would query actual token usage data from persistent storage
  // For now, we'll return mock data

  const mockData: TokenUsageData = {
    system: {
      totalUsed: 125000,
      totalLimit: 10000000,
      usagePercentage: 1.25
    },
    agents: [
      {
        id: 'agent_1',
        type: 'claude-code',
        role: 'robo-developer',
        usage: {
          current: 45000,
          daily: { used: 45000, limit: 1000000, percentage: 4.5 },
          weekly: { used: 180000, limit: 5000000, percentage: 3.6 },
          monthly: { used: 720000, limit: 20000000, percentage: 3.6 }
        },
        lastActivity: new Date().toISOString(),
        status: 'active'
      },
      {
        id: 'agent_2',
        type: 'claude-code-glm',
        role: 'robo-aqa',
        usage: {
          current: 80000,
          daily: { used: 80000, limit: 2000000, percentage: 4.0 },
          weekly: { used: 320000, limit: 10000000, percentage: 3.2 },
          monthly: { used: 1280000, limit: 40000000, percentage: 3.2 }
        },
        lastActivity: new Date().toISOString(),
        status: 'active'
      }
    ],
    costEstimate: {
      current: 2.50,
      daily: 20.00,
      weekly: 80.00,
      monthly: 320.00,
      currency: 'USD'
    }
  };

  if (params.includeProjections) {
    mockData.projections = {
      daily: {
        projected: 250000,
        estimated: 'Based on current usage patterns'
      },
      weekly: {
        projected: 1000000,
        estimated: 'Linear projection from current trends'
      },
      monthly: {
        projected: 4000000,
        estimated: 'Historical average growth rate applied'
      }
    };
  }

  return mockData;
}

async function storeTokenLimits(): Promise<void> {
  // This would store limits in persistent storage (database, file system, etc.)
  // Implementation depends on chosen storage mechanism
}

async function getHistoricalTokenUsage(timeframe: string): Promise<HistoricalTokenUsage> {
  // This would query historical token usage data
  // For now, return mock historical data
  return {
    timeframe,
    dataPoints: [
      { date: '2025-11-01', usage: 45000 },
      { date: '2025-11-02', usage: 52000 },
      { date: '2025-11-03', usage: 48000 },
      { date: '2025-11-04', usage: 61000 },
      { date: '2025-11-05', usage: 58000 }
    ]
  };
}

function calculateProjections(historicalData: HistoricalTokenUsage, params: GetTokenProjectionsParams): ProjectionResult {
  // Simple linear projection calculation
  const dataPoints = historicalData.dataPoints;
  if (dataPoints.length < 2) {
    return { projection: 0, confidence: 'low', trend: 'stable', averageDaily: 0, method: 'insufficient_data' };
  }

  const usageValues = dataPoints.map((dp: HistoricalDataPoint) => dp.usage);
  const avgUsage = usageValues.reduce((sum: number, val: number) => sum + val, 0) / usageValues.length;

  // Calculate trend
  const trend = usageValues.length >= 2
    ? ((usageValues[usageValues.length - 1] ?? 0) - (usageValues[0] ?? 0)) / usageValues.length
    : 0;

  // Project based on timeframe
  let multiplier = 1;
  switch (params.timeframe) {
    case 'daily': multiplier = 1; break;
    case 'weekly': multiplier = 7; break;
    case 'monthly': multiplier = 30; break;
    case 'quarterly': multiplier = 90; break;
  }

  const projection = Math.round((avgUsage + trend) * multiplier);

  return {
    projection,
    confidence: 'medium',
    trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
    averageDaily: Math.round(avgUsage),
    method: 'linear_regression'
  };
}

async function analyzeTokenEfficiency(): Promise<TokenEfficiencyData> {
  // This would analyze actual token efficiency data
  return {
    analyzedAgents: 2,
    overallEfficiency: {
      score: 87,
      grade: 'B+',
      description: 'Good token efficiency with room for optimization'
    },
    agentBreakdown: [
      {
        id: 'agent_1',
        efficiency: 92,
        tokensPerTask: 1500,
        avgResponseTime: 45000,
        recommendations: [
          'Consider reducing context size for repetitive tasks',
          'Batch similar operations to reduce redundant token usage'
        ]
      },
      {
        id: 'agent_2',
        efficiency: 82,
        tokensPerTask: 2200,
        avgResponseTime: 62000,
        recommendations: [
          'Optimize prompt templates to reduce redundancy',
          'Use more specific instructions to reduce iteration cycles'
        ]
      }
    ],
    systemRecommendations: [
      'Implement context compression for long-running tasks',
      'Consider task batching for similar operations',
      'Monitor agent performance patterns and adjust token limits accordingly'
    ]
  };
}

async function storeAlertConfiguration(): Promise<void> {
  // This would store alert configuration in persistent storage
}

/**
 * Get Token Caps Tool
 */
export const getTokenCapsTool: Tool = {
  id: 'get_token_caps',
  name: 'get_token_caps',
  description: 'Get current token limits and caps for all agents or specific agent types',
  category: 'monitoring',
  enabled: true,
  parameters: {
    agentType: {
      type: 'string',
      description: 'Filter by specific agent type (optional)',
      required: false,
      enum: ['inspector', 'orchestrator', 'scanner', 'all']
    },
    includeProjections: {
      type: 'boolean',
      description: 'Include token limit projections and recommendations',
      required: false
    },
    detailed: {
      type: 'boolean',
      description: 'Include detailed breakdown of token allocation',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as {
      agentType?: string;
      includeProjections?: boolean;
      detailed?: boolean;
    };
    try {
      const tokenCaps = await getTokenCapsData(typedParams);

      logger.info('get_token_caps', `Retrieved token caps for ${typedParams.agentType || 'all agents'}`);

      return {
        success: true,
        data: {
          ...tokenCaps,
          retrievedAt: new Date().toISOString()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('get_token_caps', 'Failed to get token caps', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * Set Dynamic Token Caps Tool
 */
export const setDynamicTokenCapsTool: Tool = {
  id: 'set_dynamic_token_caps',
  name: 'set_dynamic_token_caps',
  description: 'Dynamically adjust token caps based on usage patterns and system load',
  category: 'management',
  enabled: true,
  parameters: {
    agentId: {
      type: 'string',
      description: 'Specific agent ID to adjust (optional)',
      required: false
    },
    agentType: {
      type: 'string',
      description: 'Agent type to adjust caps for',
      required: false,
      enum: ['inspector', 'orchestrator', 'scanner']
    },
    adjustmentStrategy: {
      type: 'string',
      description: 'Strategy for adjusting caps',
      required: true,
      enum: ['performance_based', 'usage_based', 'cost_based', 'manual']
    },
    scaleFactor: {
      type: 'number',
      description: 'Scale factor for adjustment (1.0 = no change, >1.0 = increase, <1.0 = decrease)',
      required: false
    },
    newLimits: {
      type: 'object',
      description: 'Manual limit overrides (only used with manual strategy)',
      required: false
    },
    reason: {
      type: 'string',
      description: 'Reason for adjustment',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as {
      agentId?: string;
      agentType?: string;
      adjustmentStrategy: string;
      scaleFactor?: number;
      newLimits?: NewLimitsData;
      reason?: string;
    };
    try {
      const adjustmentResult = await adjustTokenCaps(typedParams);

      logger.info('set_dynamic_token_caps', `Adjusted token caps using ${typedParams.adjustmentStrategy} strategy`);

      return {
        success: true,
        data: {
          ...adjustmentResult,
          adjustedAt: new Date().toISOString(),
          strategy: typedParams.adjustmentStrategy
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('set_dynamic_token_caps', 'Failed to adjust token caps', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * Token Budget Allocation Tool
 */
export const allocateTokenBudgetTool: Tool = {
  id: 'allocate_token_budget',
  name: 'allocate_token_budget',
  description: 'Allocate token budget across agents based on priorities and usage patterns',
  category: 'management',
  enabled: true,
  parameters: {
    totalBudget: {
      type: 'number',
      description: 'Total token budget to allocate',
      required: true
    },
    allocationMethod: {
      type: 'string',
      description: 'Method for budget allocation',
      required: true,
      enum: ['equal', 'priority_based', 'usage_based', 'performance_based']
    },
    agentWeights: {
      type: 'object',
      description: 'Custom weights for agents (format: {agentId: weight})',
      required: false
    },
    reservePercentage: {
      type: 'number',
      description: 'Percentage to reserve for emergencies (0-100)',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as {
      totalBudget: number;
      allocationMethod: string;
      agentWeights?: Record<string, number>;
      reservePercentage?: number;
    };
    try {
      const allocationResult = await allocateTokenBudget(typedParams);

      logger.info('allocate_token_budget', `Allocated ${typedParams.totalBudget} tokens using ${typedParams.allocationMethod} method`);

      return {
        success: true,
        data: {
          ...allocationResult,
          allocatedAt: new Date().toISOString()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('allocate_token_budget', 'Failed to allocate token budget', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

// Helper functions for enhanced token caps functionality
async function getTokenCapsData(params: {
  agentType?: string;
  includeProjections?: boolean;
  detailed?: boolean;
}): Promise<TokenCapsResult> {
  const filterType = params.agentType || 'all';

  // Define token caps based on PRP-007 specifications
  const tokenCaps = {
    inspector: {
      totalLimit: 1000000,
      allocation: {
        basePrompt: 20000,
        guidelines: 20000,
        context: 960000
      },
      enforcement: {
        thresholds: [70, 80, 90, 95],
        actions: ['log_warning', 'emit_alert', 'throttle_requests', 'block_requests']
      },
      currentUsage: 782340,
      remaining: 217660,
      percentage: 78.23,
      status: 'warning'
    },
    orchestrator: {
      totalLimit: 200000,
      allocation: {
        basePrompt: 20000,
        guidelines: 20000,
        agentContext: 10000,
        notesPrompt: 20000,
        inspectorPayload: 40000,
        prpContext: 70000,
        sharedContext: 10000
      },
      enforcement: {
        thresholds: [70, 80, 90, 95],
        actions: ['log_warning', 'emit_alert', 'throttle_requests', 'block_requests']
      },
      currentUsage: 167890,
      remaining: 32110,
      percentage: 83.95,
      status: 'warning'
    },
    scanner: {
      totalLimit: 50000,
      allocation: {
        toolUsage: 15000,
        apiCalls: 20000,
        logProcessing: 10000,
        eventEmission: 5000
      },
      enforcement: {
        thresholds: [70, 80, 90, 95],
        actions: ['log_warning', 'emit_alert', 'throttle_requests', 'block_requests']
      },
      currentUsage: 15420,
      remaining: 34580,
      percentage: 30.84,
      status: 'normal'
    }
  };

  let filteredCaps: TokenCaps = tokenCaps;
  if (filterType !== 'all') {
    filteredCaps = { [filterType]: tokenCaps[filterType as keyof typeof tokenCaps] };
  }

  const result: TokenCapsResult = {
    agentType: filterType,
    tokenCaps: filteredCaps,
    summary: {
      totalAgents: Object.keys(filteredCaps).length,
      totalLimit: Object.values(filteredCaps).reduce((sum: number, cap: TokenCapsData) => sum + cap.totalLimit, 0),
      totalUsed: Object.values(filteredCaps).reduce((sum: number, cap: TokenCapsData) => sum + cap.currentUsage, 0),
      averageUsage: 0
    },
    detailedBreakdown: {},
    projections: {}
  };

  result.summary.averageUsage = result.summary.totalUsed / result.summary.totalLimit * 100;

  if (params.detailed) {
    result.detailedBreakdown = {};
    Object.entries(filteredCaps).forEach(([agentType, caps]: [string, TokenCapsData]) => {
      if (result.detailedBreakdown) {
        result.detailedBreakdown[agentType] = {
          allocation: caps.allocation,
          utilization: Object.entries(caps.allocation).map(([component, tokens]) => ({
            component,
            allocated: tokens,
            utilized: Math.floor(tokens * caps.percentage / 100),
            percentage: caps.percentage
          }))
        };
      }
    });
  }

  if (params.includeProjections) {
    result.projections = {
      next24Hours: {
        expectedUsage: Math.floor(result.summary.totalUsed * 1.1),
        riskLevel: result.summary.averageUsage > 80 ? 'high' : result.summary.averageUsage > 60 ? 'medium' : 'low',
        recommendations: result.summary.averageUsage > 80 ? [
          'Consider reducing non-essential operations',
          'Monitor agent performance closely',
          'Prepare to scale back if usage continues'
        ] : [
          'Current usage is within acceptable limits',
          'Continue monitoring for trend changes'
        ]
      },
      nextWeek: {
        expectedUsage: Math.floor(result.summary.totalUsed * 7),
        budgetRecommendations: result.summary.averageUsage > 70 ? 'Consider budget adjustments' : 'Current budget appears adequate'
      }
    };
  }

  return result;
}

async function adjustTokenCaps(params: AdjustTokenCapsParams): Promise<AdjustTokenCapsResult> {
  const targetIdentifier = params.agentId ?? params.agentType;

  if (!targetIdentifier) {
    throw new Error('Either agentId or agentType must be specified');
  }

  // Get current caps
  const currentCaps = await getTokenCapsData({
    agentType: params.agentType,
    detailed: true
  });

  let newCaps: TokenCaps = {};
  const adjustmentLog: string[] = [];

  switch (params.adjustmentStrategy) {
    case 'manual':
      if (!params.newLimits) {
        throw new Error('newLimits must be provided for manual adjustment strategy');
      }
      newCaps = params.newLimits as TokenCaps;
      adjustmentLog.push(`Manual adjustment applied: ${JSON.stringify(params.newLimits)}`);
      break;

    case 'performance_based':
      if (params.scaleFactor) {
        Object.entries(currentCaps.tokenCaps).forEach(([agentType, caps]: [string, unknown]) => {
          const typedCaps = caps as TokenCapsData;
          newCaps[agentType] = {
            ...typedCaps,
            totalLimit: Math.floor(typedCaps.totalLimit * (params.scaleFactor ?? 1)),
            allocation: Object.fromEntries(
              Object.entries(typedCaps.allocation).map(([key, value]) => [key, Math.floor(value * (params.scaleFactor ?? 1))])
            )
          };
          adjustmentLog.push(`${agentType}: ${typedCaps.totalLimit} -> ${newCaps[agentType]?.totalLimit} (${params.scaleFactor ?? 1}x)`);
        });
      }
      break;

    case 'usage_based':
      Object.entries(currentCaps.tokenCaps).forEach(([agentType, caps]: [string, unknown]) => {
        const typedCaps = caps as TokenCapsData;
        const usageRatio = typedCaps.currentUsage / typedCaps.totalLimit;
        let adjustmentFactor = 1.0;

        if (usageRatio > 0.9) {
          adjustmentFactor = 1.2;
        } // Increase limit if near capacity
        else if (usageRatio < 0.3) {
          adjustmentFactor = 0.8;
        } // Decrease limit if underutilized

        newCaps[agentType] = {
          ...typedCaps,
          totalLimit: Math.floor(typedCaps.totalLimit * adjustmentFactor),
          allocation: Object.fromEntries(
            Object.entries(typedCaps.allocation).map(([key, value]) => [key, Math.floor(value * adjustmentFactor)])
          )
        };
        adjustmentLog.push(`${agentType}: ${typedCaps.totalLimit} -> ${newCaps[agentType]?.totalLimit} (${adjustmentFactor}x, usage: ${(usageRatio * 100).toFixed(1)}%)`);
      });
      break;

    case 'cost_based':
      // Cost-based adjustment would consider current cost vs budget
      Object.entries(currentCaps.tokenCaps).forEach(([agentType, caps]: [string, unknown]) => {
        const typedCaps = caps as TokenCapsData;
        const estimatedCost = typedCaps.currentUsage * 0.00001; // Simplified cost calculation
        let adjustmentFactor = 1.0;

        if (estimatedCost > 5) {
          adjustmentFactor = 0.9;
        } // Reduce if cost is high
        else if (estimatedCost < 1) {
          adjustmentFactor = 1.1;
        } // Increase if cost is low

        newCaps[agentType] = {
          ...typedCaps,
          totalLimit: Math.floor(typedCaps.totalLimit * adjustmentFactor),
          allocation: Object.fromEntries(
            Object.entries(typedCaps.allocation).map(([key, value]) => [key, Math.floor(value * adjustmentFactor)])
          )
        };
        adjustmentLog.push(`${agentType}: ${typedCaps.totalLimit} -> ${newCaps[agentType]?.totalLimit} (${adjustmentFactor}x, est. cost: $${estimatedCost.toFixed(2)})`);
      });
      break;

    default:
      throw new Error(`Unknown adjustment strategy: ${params.adjustmentStrategy}`);
  }

  return {
    success: true,
    previousCaps: currentCaps.tokenCaps,
    newCaps,
    adjustments: adjustmentLog.map(() => ({
      agentType: 'unknown',
      component: 'unknown',
      oldValue: 0,
      newValue: 0
    })),
    reason: params.reason || 'No reason provided'
  };
}

async function allocateTokenBudget(params: {
  totalBudget: number;
  allocationMethod: string;
  agentWeights?: Record<string, number>;
  reservePercentage?: number;
}): Promise<TokenBudgetAllocation> {
  const reservePercentage = params.reservePercentage ?? 10;
  const reserveAmount = Math.floor(params.totalBudget * reservePercentage / 100);
  const availableBudget = params.totalBudget - reserveAmount;

  // Define agents for allocation
  const agents = ['inspector', 'orchestrator', 'scanner'];
  const allocations: Record<string, number> = {};

  switch (params.allocationMethod) {
    case 'equal': {
      const equalShare = Math.floor(availableBudget / agents.length);
      agents.forEach(agent => {
        allocations[agent] = equalShare;
      });
      break;
    }

    case 'priority_based': {
      // Priority-based: inspector (40%), orchestrator (35%), scanner (25%)
      const priorityWeights = { inspector: 0.4, orchestrator: 0.35, scanner: 0.25 };
      agents.forEach(agent => {
        allocations[agent] = Math.floor(availableBudget * priorityWeights[agent as keyof typeof priorityWeights]);
      });
      break;
    }

    case 'usage_based': {
      // Would use actual usage data, using mock data for now
      const usageWeights = { inspector: 0.5, orchestrator: 0.35, scanner: 0.15 };
      agents.forEach(agent => {
        allocations[agent] = Math.floor(availableBudget * usageWeights[agent as keyof typeof usageWeights]);
      });
      break;
    }

    case 'performance_based': {
      // Would use performance metrics, using mock data for now
      const performanceWeights = { inspector: 0.45, orchestrator: 0.40, scanner: 0.15 };
      agents.forEach(agent => {
        allocations[agent] = Math.floor(availableBudget * performanceWeights[agent as keyof typeof performanceWeights]);
      });
      break;
    }

    case 'custom': {
      if (!params.agentWeights) {
        throw new Error('agentWeights must be provided for custom allocation method');
      }
      const totalWeight = Object.values(params.agentWeights).reduce((sum, weight) => sum + weight, 0);
      Object.entries(params.agentWeights).forEach(([agent, weight]) => {
        allocations[agent] = Math.floor(availableBudget * weight / totalWeight);
      });
      break;
    }

    default:
      throw new Error(`Unknown allocation method: ${params.allocationMethod}`);
  }

  // Add reserve allocation
  allocations.reserve = reserveAmount;

  const allocation = {
    method: params.allocationMethod,
    totalBudget: params.totalBudget,
    reserveAmount,
    availableBudget,
    allocations,
    summary: {
      totalAllocated: Object.values(allocations).reduce((sum, amount) => sum + amount, 0),
      agentCount: agents.length,
      averageAllocation: Math.floor(availableBudget / agents.length)
    },
    recommendations: generateBudgetRecommendations(allocations, availableBudget)
  };

  return allocation;
}

function generateBudgetRecommendations(allocations: Record<string, number>, availableBudget: number): string[] {
  const recommendations: string[] = [];

  const agentAllocations = Object.entries(allocations).filter(([key]) => key !== 'reserve');
  const maxAllocation = Math.max(...agentAllocations.map(([, amount]) => amount));
  const minAllocation = Math.min(...agentAllocations.map(([, amount]) => amount));

  if (maxAllocation > minAllocation * 3) {
    recommendations.push('Consider rebalancing allocations - there is a significant disparity between agent budgets');
  }

  const reserveAmount = allocations.reserve ?? 0;
  const reservePercentage = (reserveAmount / (availableBudget + reserveAmount)) * 100;
  if (reservePercentage < 5) {
    recommendations.push('Consider increasing reserve percentage for unexpected usage spikes');
  } else if (reservePercentage > 20) {
    recommendations.push('Reserve percentage is high - consider allocating more to active agents');
  }

  agentAllocations.forEach(([agent, amount]) => {
    const percentage = (amount / availableBudget) * 100;
    if (percentage > 50) {
      recommendations.push(`${agent} allocation is high (${percentage.toFixed(1)}%) - monitor usage closely`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('Budget allocation appears balanced');
  }

  return recommendations;
}

// Export all token tracking tools including new ones
export const tokenTrackingTools = [
  getTokenUsageTool,
  setTokenLimitsTool,
  getTokenProjectionsTool,
  getTokenEfficiencyTool,
  configureTokenAlertsTool,
  getTokenCapsTool,
  setDynamicTokenCapsTool,
  allocateTokenBudgetTool
];