/**
 * ♫ Get Token Caps Tool for @dcversus/prp Orchestrator
 *
 * Tool for retrieving current token limits and usage for inspector and orchestrator
 * based on PRP-007 specifications.
 */

import { Tool } from '../types';
import { createLayerLogger } from '../../shared';

const logger = createLayerLogger('orchestrator');

// Interface for token caps parameters
export interface GetTokenCapsParams {
  agentType?: 'inspector' | 'orchestrator' | 'all';
}

// Interface for token caps data
export interface TokenCapsData {
  inspector: {
    total: number;
    breakdown: {
      base: number;
      guidelines: number;
      context: number;
    };
    usage: {
      current: number;
      available: number;
      percentage: number;
    };
  };
  orchestrator: {
    total: number;
    breakdown: {
      base: number;
      chainOfThought: number;
      toolContext: number;
      agentCoordination: number;
      decisionHistory: number;
    };
    usage: {
      current: number;
      available: number;
      percentage: number;
    };
  };
  system: {
    totalLimit: number;
    totalUsed: number;
    totalAvailable: number;
    overallUsage: number;
  };
  timestamp: string;
}

/**
 * Get Token Caps Tool - Returns token limits based on PRP-007 specifications
 */
export const getTokenCapsTool: Tool = {
  id: 'get_token_caps',
  name: 'get_token_caps',
  description: 'Get current token limits and usage for inspector and orchestrator based on PRP-007 specifications',
  category: 'monitoring',
  enabled: true,
  parameters: {
    agentType: {
      type: 'string',
      description: 'Agent type to get token caps for (inspector, orchestrator, or all)',
      required: false,
      enum: ['inspector', 'orchestrator', 'all']
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as GetTokenCapsParams;

    try {
      logger.info('get_token_caps', `Retrieving token caps for ${typedParams.agentType || 'all'}`);

      // Get token caps data based on PRP-007 specifications
      const tokenCapsData = getTokenCapsData(typedParams.agentType);

      logger.info('get_token_caps', `Retrieved token caps data`, {
        inspectorTotal: tokenCapsData.inspector.total,
        orchestratorTotal: tokenCapsData.orchestrator.total,
        systemUsage: `${tokenCapsData.system.overallUsage}%`
      });

      return {
        success: true,
        data: tokenCapsData,
        executionTime: 0
      };

    } catch (error) {
      logger.error('get_token_caps', `Failed to retrieve token caps`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * Get token caps data based on PRP-007 specifications
 */
function getTokenCapsData(agentType?: 'inspector' | 'orchestrator' | 'all'): TokenCapsData {
  // PRP-007 specifications for token limits
  const inspectorCaps = {
    total: 1000000, // 1M total tokens
    breakdown: {
      base: 20000,      // 20K base tokens
      guidelines: 20000, // 20K guidelines tokens
      context: 960000   // 960K context tokens
    },
    usage: {
      current: 125000,  // Mock current usage
      available: 875000, // 1M - 125K
      percentage: 12.5   // 12.5% used
    }
  };

  const orchestratorCaps = {
    total: 200000, // 200K total tokens
    breakdown: {
      base: 50000,           // 50K base tokens
      chainOfThought: 40000, // 40K chain of thought tokens
      toolContext: 30000,    // 30K tool context tokens
      agentCoordination: 50000, // 50K agent coordination tokens
      decisionHistory: 30000   // 30K decision history tokens
    },
    usage: {
      current: 45000,  // Mock current usage
      available: 155000, // 200K - 45K
      percentage: 22.5   // 22.5% used
    }
  };

  const systemCaps = {
    totalLimit: inspectorCaps.total + orchestratorCaps.total, // 1.2M total
    totalUsed: inspectorCaps.usage.current + orchestratorCaps.usage.current, // 170K used
    totalAvailable: inspectorCaps.usage.available + orchestratorCaps.usage.available, // 1.03M available
    overallUsage: ((inspectorCaps.usage.current + orchestratorCaps.usage.current) /
                   (inspectorCaps.total + orchestratorCaps.total)) * 100 // ~14.2%
  };

  const fullData: TokenCapsData = {
    inspector: inspectorCaps,
    orchestrator: orchestratorCaps,
    system: systemCaps,
    timestamp: new Date().toISOString()
  };

  // Filter data based on agent type parameter
  if (agentType === 'inspector') {
    return {
      inspector: fullData.inspector,
      orchestrator: {
        total: 0,
        breakdown: {
          base: 0,
          chainOfThought: 0,
          toolContext: 0,
          agentCoordination: 0,
          decisionHistory: 0
        },
        usage: {
          current: 0,
          available: 0,
          percentage: 0
        }
      },
      system: {
        totalLimit: fullData.inspector.total,
        totalUsed: fullData.inspector.usage.current,
        totalAvailable: fullData.inspector.usage.available,
        overallUsage: fullData.inspector.usage.percentage
      },
      timestamp: fullData.timestamp
    };
  }

  if (agentType === 'orchestrator') {
    return {
      inspector: {
        total: 0,
        breakdown: {
          base: 0,
          guidelines: 0,
          context: 0
        },
        usage: {
          current: 0,
          available: 0,
          percentage: 0
        }
      },
      orchestrator: fullData.orchestrator,
      system: {
        totalLimit: fullData.orchestrator.total,
        totalUsed: fullData.orchestrator.usage.current,
        totalAvailable: fullData.orchestrator.usage.available,
        overallUsage: fullData.orchestrator.usage.percentage
      },
      timestamp: fullData.timestamp
    };
  }

  // Default: return all data
  return fullData;
}

// Export the tool for registration
export { getTokenCapsTool as default };