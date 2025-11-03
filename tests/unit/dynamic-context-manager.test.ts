/**
 * Unit Tests for Dynamic Context Manager
 */

import { DynamicContextManager } from '../../src/orchestrator/dynamic-context-manager';
import { AgentCapabilities } from '../../src/orchestrator/dynamic-context-manager';

describe('DynamicContextManager', () => {
  let contextManager: DynamicContextManager;

  beforeEach(() => {
    contextManager = new DynamicContextManager();
  });

  describe('Initialization', () => {
    test('should initialize with correct model limits', () => {
      // Access private property through type assertion
      const modelLimits = (contextManager as DynamicContextManager & { modelTokenLimits: Map<string, number> }).modelTokenLimits;

      expect(modelLimits.get('claude-3-5-sonnet-20241022')).toBe(200000);
      expect(modelLimits.get('gpt-4')).toBe(128000);
      expect(modelLimits.get('gemini-1.5-pro')).toBe(2097152);
      expect(modelLimits.get('glm-4.6')).toBe(128000);
    });

    test('should initialize compression strategies', () => {
      const strategies = (contextManager as DynamicContextManager & { compressionStrategies: Array<{ name: string; compressionRatio: number }> }).compressionStrategies;

      expect(strategies).toHaveLength(4);
      expect(strategies[0].name).toBe('summarize_long_conversations');
      expect(strategies[1].name).toBe('truncate_old_context');
      expect(strategies[2].name).toBe('merge_similar_signals');
      expect(strategies[3].name).toBe('compress_code_snippets');

      // Verify compression ratios are valid
      strategies.forEach((strategy: { name: string; compressionRatio: number }) => {
        expect(strategy.compressionRatio).toBeGreaterThan(0);
        expect(strategy.compressionRatio).toBeLessThan(1);
      });
    });
  });

  describe('Dynamic Token Distribution', () => {
    test('should calculate distribution for Claude model with medium complexity', () => {
      const activeAgents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 50000, percentage: 5 },
          signalsHandled: ['[op]', '[Ii]'],
          toolsAvailable: ['file-edit', 'bash'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        }
      ];

      const distribution = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'claude-3-5-sonnet-20241022',
        'medium'
      );

      // Check base allocations from agents05.md
      expect(distribution.inspectorOutput).toBe(40000);
      expect(distribution.agentsMd).toBe(20000);
      expect(distribution.sharedWarzone).toBe(10000); // 10K per active agent
      expect(distribution.prpContent).toBe(30000); // Base allocation
      expect(distribution.userMessages).toBe(20000); // Base allocation

      // Check dynamic allocations
      expect(distribution.cotReasoning).toBe(10000); // Medium complexity
      expect(distribution.toolCalls).toBeGreaterThan(5000); // Should be increased for active agents
      expect(distribution.safetyBuffer).toBeGreaterThan(0); // Should have remaining tokens

      // Verify total doesn't exceed model limit
      const totalUsed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
      expect(totalUsed).toBeLessThanOrEqual(200000); // Claude model limit
    });

    test('should adjust allocation based on signal complexity', () => {
      const activeAgents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 50000, percentage: 5 },
          signalsHandled: ['[op]'],
          toolsAvailable: ['file-edit'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        }
      ];

      const lowComplexity = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'claude-3-5-sonnet-20241022',
        'low'
      );

      const highComplexity = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'claude-3-5-sonnet-20241022',
        'high'
      );

      // High complexity should allocate more tokens
      expect(highComplexity.prpContent).toBeGreaterThan(lowComplexity.prpContent);
      expect(highComplexity.userMessages).toBeGreaterThan(lowComplexity.userMessages);
      expect(highComplexity.cotReasoning).toBeGreaterThan(lowComplexity.cotReasoning);
      expect(highComplexity.toolCalls).toBeGreaterThan(lowComplexity.toolCalls);
    });

    test('should handle multiple active agents', () => {
      const activeAgents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 50000, percentage: 5 },
          signalsHandled: ['[op]'],
          toolsAvailable: ['file-edit'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        },
        {
          id: 'agent_2',
          type: 'claude',
          role: 'robo-aqa',
          tokenLimits: { daily: 2000000, weekly: 10000000, monthly: 40000000, current: 80000, percentage: 4 },
          signalsHandled: ['[Tt]'],
          toolsAvailable: ['file-edit', 'bash'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 35000, successRate: 98, tasksCompleted: 50 },
          contextWindow: 200000
        },
        {
          id: 'agent_3',
          type: 'claude',
          role: 'robo-system-analyst',
          tokenLimits: { daily: 1500000, weekly: 7500000, monthly: 30000000, current: 300000, percentage: 20 },
          signalsHandled: ['[os]'],
          toolsAvailable: ['web-search', 'file-edit'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 60000, successRate: 92, tasksCompleted: 15 },
          contextWindow: 200000
        }
      ];

      const distribution = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'claude-3-5-sonnet-20241022',
        'medium'
      );

      // Shared warzone should scale with active agents (10K per agent)
      expect(distribution.sharedWarzone).toBe(30000); // 3 agents * 10K

      // User messages should increase with more agents (coordination overhead)
      expect(distribution.userMessages).toBeGreaterThan(20000);

      // Tool calls should increase with more agents
      expect(distribution.toolCalls).toBeGreaterThan(5000);
    });

    test('should apply compression when exceeding model limits', () => {
      // Create scenario that would exceed limits
      const activeAgents: AgentCapabilities[] = Array.from({ length: 10 }, (_, i) => ({
        id: `agent_${i}`,
        type: 'claude',
        role: `robo-agent-${i}`,
        tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 900000, percentage: 90 },
        signalsHandled: ['[op]'],
        toolsAvailable: ['file-edit', 'bash'],
        status: 'active',
        lastActivity: new Date(),
        performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
        contextWindow: 200000
      }));

      const distribution = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'claude-3-5-sonnet-20241022',
        'high'
      );

      // Should still be within model limits after compression
      const totalUsed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
      expect(totalUsed).toBeLessThanOrEqual(200000);

      // Safety buffer should exist (might be small after compression)
      expect(distribution.safetyBuffer).toBeGreaterThanOrEqual(0);

      // High compression should be applied to compressible sections
      expect(distribution.prpContent).toBeLessThan(30000);
      expect(distribution.userMessages).toBeLessThan(20000);
    });

    test('should handle different model types with different limits', () => {
      const activeAgents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 50000, percentage: 5 },
          signalsHandled: ['[op]'],
          toolsAvailable: ['file-edit'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        }
      ];

      const claudeDistribution = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'claude-3-5-sonnet-20241022',
        'medium'
      );

      const gptDistribution = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'gpt-4',
        'medium'
      );

      const geminiDistribution = contextManager.calculateDynamicTokenDistribution(
        activeAgents,
        'gemini-1.5-pro',
        'medium'
      );

      // Each model should have different allocations due to different limits
      const claudeTotal = Object.values(claudeDistribution).reduce((sum, val) => sum + val, 0);
      const gptTotal = Object.values(gptDistribution).reduce((sum, val) => sum + val, 0);
      const geminiTotal = Object.values(geminiDistribution).reduce((sum, val) => sum + val, 0);

      expect(claudeTotal).toBeLessThanOrEqual(200000); // Claude limit
      expect(gptTotal).toBeLessThanOrEqual(128000); // GPT-4 limit
      expect(geminiTotal).toBeLessThanOrEqual(2097152); // Gemini limit

      // Gemini should have much more available space
      expect(geminiTotal).toBeGreaterThan(gptTotal);
      expect(geminiTotal).toBeGreaterThan(claudeTotal);
    });
  });

  describe('Agent Capabilities Management', () => {
    test('should update agent capabilities', () => {
      const agentCapabilities: AgentCapabilities = {
        id: 'agent_1',
        type: 'claude',
        role: 'robo-developer',
        tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 100000, percentage: 10 },
        signalsHandled: ['[op]', '[Ii]'],
        toolsAvailable: ['file-edit', 'bash'],
        status: 'active',
        lastActivity: new Date(),
        performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
        contextWindow: 200000
      };

      const eventSpy = jest.spyOn(contextManager, 'emit');

      contextManager.updateAgentCapabilities(agentCapabilities);

      expect(eventSpy).toHaveBeenCalledWith('agent_capabilities_updated', {
        agentId: 'agent_1',
        capabilities: agentCapabilities,
        timestamp: expect.any(Date)
      });

      const retrieved = contextManager.getAgentCapabilities('agent_1');
      expect(retrieved).toEqual([agentCapabilities]);
    });

    test('should get best agent for signal based on capabilities', () => {
      const agents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 100000, percentage: 10 },
          signalsHandled: ['[op]', '[Ii]'],
          toolsAvailable: ['file-edit', 'bash'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        },
        {
          id: 'agent_2',
          type: 'claude',
          role: 'robo-aqa',
          tokenLimits: { daily: 2000000, weekly: 10000000, monthly: 40000000, current: 1800000, percentage: 90 },
          signalsHandled: ['[Tt]', '[Qb]'],
          toolsAvailable: ['file-edit', 'bash'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 35000, successRate: 98, tasksCompleted: 50 },
          contextWindow: 200000
        },
        {
          id: 'agent_3',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 950000, percentage: 95 },
          signalsHandled: ['[op]', '[Ii]'],
          toolsAvailable: ['file-edit'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 55000, successRate: 85, tasksCompleted: 10 },
          contextWindow: 200000
        }
      ];

      // Add all agents to context manager
      agents.forEach(agent => contextManager.updateAgentCapabilities(agent));

      // Test getting best agent for [op] signal
      const bestForOp = contextManager.getBestAgentForSignal('[op]');
      expect(bestForOp).toBeDefined();
      expect(bestForOp?.signalsHandled).toContain('[op]');

      // Should prefer agent with better token availability
      expect(bestForOp?.id).toBe('agent_1'); // 10% usage vs 95%

      // Test getting best agent for [Tt] signal
      const bestForTt = contextManager.getBestAgentForSignal('[Tt]');
      expect(bestForTt?.id).toBe('agent_2');
    });

    test('should return null when no suitable agent found', () => {
      const agents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 999999, percentage: 99.9 },
          signalsHandled: ['[op]'],
          toolsAvailable: ['file-edit'],
          status: 'token_limited',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        }
      ];

      agents.forEach(agent => contextManager.updateAgentCapabilities(agent));

      const bestForUnknownSignal = contextManager.getBestAgentForSignal('[unknown]');
      expect(bestForUnknownSignal).toBeNull();

      const bestForSpecificTools = contextManager.getBestAgentForSignal('[op]', ['git']);
      expect(bestForSpecificTools).toBeNull(); // No agent has git tool
    });
  });

  describe('Token Usage Tracking', () => {
    test('should record token usage and update agent status', () => {
      const agentCapabilities: AgentCapabilities = {
        id: 'agent_1',
        type: 'claude',
        role: 'robo-developer',
        tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 100000, percentage: 10 },
        signalsHandled: ['[op]'],
        toolsAvailable: ['file-edit'],
        status: 'active',
        lastActivity: new Date(),
        performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
        contextWindow: 200000
      };

      contextManager.updateAgentCapabilities(agentCapabilities);

      const eventSpy = jest.spyOn(contextManager, 'emit');

      // Record normal token usage
      contextManager.recordTokenUsage('agent_1', 5000, 'Task completion');

      const updatedAgent = contextManager.getAgentCapabilities('agent_1')[0];
      expect(updatedAgent.tokenLimits.current).toBe(105000);
      expect(updatedAgent.tokenLimits.percentage).toBe(10.5);

      // Record usage approaching limit
      contextManager.recordTokenUsage('agent_1', 850000, 'Large task');

      const approachingAgent = contextManager.getAgentCapabilities('agent_1')[0];
      expect(approachingAgent.tokenLimits.current).toBe(955000);
      expect(approachingAgent.tokenLimits.percentage).toBe(95.5);

      // Should emit approaching limit warning
      expect(eventSpy).toHaveBeenCalledWith('agent_token_limit_approaching', {
        agentId: 'agent_1',
        percentage: 95.5,
        remaining: 45000
      });

      // Record usage exceeding limit
      contextManager.recordTokenUsage('agent_1', 50000, 'Another task');

      const limitedAgent = contextManager.getAgentCapabilities('agent_1')[0];
      expect(limitedAgent.status).toBe('token_limited');

      expect(eventSpy).toHaveBeenCalledWith('agent_token_limit_reached', {
        agentId: 'agent_1',
        limit: 1000000,
        used: 1005000
      });
    });

    test('should provide agent statistics', () => {
      const agents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 100000, percentage: 10 },
          signalsHandled: ['[op]'],
          toolsAvailable: ['file-edit'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        },
        {
          id: 'agent_2',
          type: 'claude',
          role: 'robo-aqa',
          tokenLimits: { daily: 2000000, weekly: 10000000, monthly: 40000000, current: 500000, percentage: 25 },
          signalsHandled: ['[Tt]'],
          toolsAvailable: ['file-edit', 'bash'],
          status: 'idle',
          lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
          performance: { avgResponseTime: 35000, successRate: 98, tasksCompleted: 50 },
          contextWindow: 200000
        },
        {
          id: 'agent_3',
          type: 'claude',
          role: 'robo-system-analyst',
          tokenLimits: { daily: 1500000, weekly: 7500000, monthly: 30000000, current: 1500000, percentage: 100 },
          signalsHandled: ['[os]'],
          toolsAvailable: ['web-search'],
          status: 'token_limited',
          lastActivity: new Date(),
          performance: { avgResponseTime: 60000, successRate: 85, tasksCompleted: 5 },
          contextWindow: 200000
        }
      ];

      agents.forEach(agent => contextManager.updateAgentCapabilities(agent));

      const stats = contextManager.getAgentStatistics();

      expect(stats.totalAgents).toBe(3);
      expect(stats.activeAgents).toBe(1);
      expect(stats.idleAgents).toBe(1);
      expect(stats.tokenLimitedAgents).toBe(1);
      expect(stats.totalTokensUsed).toBe(2100000);
      expect(stats.totalTokenLimit).toBe(4500000);
      expect(stats.averageTokenUsage).toBeCloseTo(46.67, 1); // (10+25+100)/3

      expect(stats.agentBreakdown).toHaveLength(3);
      expect(stats.agentBreakdown[0]).toMatchObject({
        id: 'agent_1',
        type: 'claude',
        role: 'robo-developer',
        status: 'active',
        tokenUsage: { current: 100000, percentage: 10 }
      });
    });
  });

  describe('Warzone Context Generation', () => {
    test('should generate warzone context with active agents', () => {
      const agents: AgentCapabilities[] = [
        {
          id: 'agent_1',
          type: 'claude',
          role: 'robo-developer',
          tokenLimits: { daily: 1000000, weekly: 5000000, monthly: 20000000, current: 100000, percentage: 10 },
          signalsHandled: ['[op]'],
          toolsAvailable: ['file-edit'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 45000, successRate: 95, tasksCompleted: 25 },
          contextWindow: 200000
        },
        {
          id: 'agent_2',
          type: 'claude',
          role: 'robo-aqa',
          tokenLimits: { daily: 2000000, weekly: 10000000, monthly: 40000000, current: 500000, percentage: 25 },
          signalsHandled: ['[Tt]'],
          toolsAvailable: ['file-edit', 'bash'],
          status: 'active',
          lastActivity: new Date(),
          performance: { avgResponseTime: 35000, successRate: 98, tasksCompleted: 50 },
          contextWindow: 200000
        }
      ];

      agents.forEach(agent => contextManager.updateAgentCapabilities(agent));

      const warzoneContext = contextManager.generateWarzoneContext();

      expect(warzoneContext).toContain('# Warzone Shared Context');
      expect(warzoneContext).toContain('## Active Agents (2)');
      expect(warzoneContext).toContain('### robo-developer (claude)');
      expect(warzoneContext).toContain('### robo-aqa (claude)');
      expect(warzoneContext).toContain('**Status**: active');
      expect(warzoneContext).toContain('**Token Usage**:');
      expect(warzoneContext).toContain('**Performance**:');
      expect(warzoneContext).toContain('## Current Blockers');
      expect(warzoneContext).toContain('## What\'s Done');
      expect(warzoneContext).toContain('## What\'s Next');
    });

    test('should handle no active agents gracefully', () => {
      const warzoneContext = contextManager.generateWarzoneContext();

      expect(warzoneContext).toContain('## Active Agents (0)');
      expect(warzoneContext).toContain('System operational with 0 active agents');
    });
  });
});