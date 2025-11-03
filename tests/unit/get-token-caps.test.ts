/**
 * Unit Tests for Get Token Caps Tool
 */

import { getTokenCapsTool } from '../../src/orchestrator/tools/get-token-caps';
import type { GetTokenCapsParams, TokenCapsData } from '../../src/orchestrator/tools/get-token-caps';

describe('Get Token Caps Tool', () => {
  describe('getTokenCapsTool', () => {
    test('should return complete token caps data for all agents', async () => {
      const result = await getTokenCapsTool.execute({});

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const tokenCapsData = result.data as TokenCapsData;

      // Check inspector caps (PRP-007 specs)
      expect(tokenCapsData.inspector.total).toBe(1000000);
      expect(tokenCapsData.inspector.breakdown.base).toBe(20000);
      expect(tokenCapsData.inspector.breakdown.guidelines).toBe(20000);
      expect(tokenCapsData.inspector.breakdown.context).toBe(960000);

      // Check orchestrator caps (PRP-007 specs)
      expect(tokenCapsData.orchestrator.total).toBe(200000);
      expect(tokenCapsData.orchestrator.breakdown.base).toBe(50000);
      expect(tokenCapsData.orchestrator.breakdown.chainOfThought).toBe(40000);
      expect(tokenCapsData.orchestrator.breakdown.toolContext).toBe(30000);
      expect(tokenCapsData.orchestrator.breakdown.agentCoordination).toBe(50000);
      expect(tokenCapsData.orchestrator.breakdown.decisionHistory).toBe(30000);

      // Check system summary
      expect(tokenCapsData.system.totalLimit).toBe(1200000); // 1M + 200K
      expect(tokenCapsData.system.totalUsed).toBe(170000);   // 125K + 45K
      expect(tokenCapsData.system.totalAvailable).toBe(1030000); // 1.2M - 170K
      expect(tokenCapsData.system.overallUsage).toBeCloseTo(14.17, 1);

      // Check timestamp
      expect(tokenCapsData.timestamp).toBeDefined();
      expect(new Date(tokenCapsData.timestamp)).toBeInstanceOf(Date);
    });

    test('should return only inspector token caps when requested', async () => {
      const params: GetTokenCapsParams = { agentType: 'inspector' };
      const result = await getTokenCapsTool.execute(params);

      expect(result.success).toBe(true);

      const tokenCapsData = result.data as TokenCapsData;

      // Check inspector data is populated
      expect(tokenCapsData.inspector.total).toBe(1000000);
      expect(tokenCapsData.inspector.usage.current).toBe(125000);
      expect(tokenCapsData.inspector.usage.available).toBe(875000);
      expect(tokenCapsData.inspector.usage.percentage).toBe(12.5);

      // Check orchestrator data is zeroed out
      expect(tokenCapsData.orchestrator.total).toBe(0);
      expect(tokenCapsData.orchestrator.usage.current).toBe(0);
      expect(tokenCapsData.orchestrator.usage.available).toBe(0);
      expect(tokenCapsData.orchestrator.usage.percentage).toBe(0);

      // Check system summary reflects only inspector
      expect(tokenCapsData.system.totalLimit).toBe(1000000);
      expect(tokenCapsData.system.totalUsed).toBe(125000);
      expect(tokenCapsData.system.totalAvailable).toBe(875000);
      expect(tokenCapsData.system.overallUsage).toBe(12.5);
    });

    test('should return only orchestrator token caps when requested', async () => {
      const params: GetTokenCapsParams = { agentType: 'orchestrator' };
      const result = await getTokenCapsTool.execute(params);

      expect(result.success).toBe(true);

      const tokenCapsData = result.data as TokenCapsData;

      // Check orchestrator data is populated
      expect(tokenCapsData.orchestrator.total).toBe(200000);
      expect(tokenCapsData.orchestrator.breakdown.base).toBe(50000);
      expect(tokenCapsData.orchestrator.breakdown.chainOfThought).toBe(40000);
      expect(tokenCapsData.orchestrator.breakdown.toolContext).toBe(30000);
      expect(tokenCapsData.orchestrator.breakdown.agentCoordination).toBe(50000);
      expect(tokenCapsData.orchestrator.breakdown.decisionHistory).toBe(30000);
      expect(tokenCapsData.orchestrator.usage.current).toBe(45000);
      expect(tokenCapsData.orchestrator.usage.available).toBe(155000);
      expect(tokenCapsData.orchestrator.usage.percentage).toBe(22.5);

      // Check inspector data is zeroed out
      expect(tokenCapsData.inspector.total).toBe(0);
      expect(tokenCapsData.inspector.usage.current).toBe(0);
      expect(tokenCapsData.inspector.usage.available).toBe(0);
      expect(tokenCapsData.inspector.usage.percentage).toBe(0);

      // Check system summary reflects only orchestrator
      expect(tokenCapsData.system.totalLimit).toBe(200000);
      expect(tokenCapsData.system.totalUsed).toBe(45000);
      expect(tokenCapsData.system.totalAvailable).toBe(155000);
      expect(tokenCapsData.system.overallUsage).toBe(22.5);
    });

    test('should validate tool metadata', () => {
      expect(getTokenCapsTool.id).toBe('get_token_caps');
      expect(getTokenCapsTool.name).toBe('get_token_caps');
      expect(getTokenCapsTool.description).toContain('token limits');
      expect(getTokenCapsTool.category).toBe('monitoring');
      expect(getTokenCapsTool.enabled).toBe(true);
    });

    test('should validate parameter definitions', () => {
      const params = getTokenCapsTool.parameters;
      expect(params).toHaveProperty('agentType');

      const agentTypeParam = params.agentType;
      expect(agentTypeParam.type).toBe('string');
      expect(agentTypeParam.description).toContain('Agent type');
      expect(agentTypeParam.required).toBe(false);
      expect(agentTypeParam.enum).toEqual(['inspector', 'orchestrator', 'all']);
    });

    test('should handle missing parameters gracefully', async () => {
      const result = await getTokenCapsTool.execute({});

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const tokenCapsData = result.data as TokenCapsData;
      // Should return all data when no agentType specified
      expect(tokenCapsData.inspector.total).toBe(1000000);
      expect(tokenCapsData.orchestrator.total).toBe(200000);
    });

    test('should handle execution errors gracefully', async () => {
      // Mock a scenario where the tool might fail
      const originalExecute = getTokenCapsTool.execute;
      let executionCount = 0;

      getTokenCapsTool.execute = async (params: unknown) => {
        executionCount++;
        if (executionCount === 1) {
          throw new Error('Simulated execution error');
        }
        return originalExecute(params);
      };

      // First call should fail
      await expect(getTokenCapsTool.execute({})).rejects.toThrow('Simulated execution error');

      // Restore original function for subsequent tests
      getTokenCapsTool.execute = originalExecute;
    });

    test('should return consistent data structure', async () => {
      const result1 = await getTokenCapsTool.execute({ agentType: 'inspector' });
      const result2 = await getTokenCapsTool.execute({ agentType: 'inspector' });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const data1 = result1.data as TokenCapsData;
      const data2 = result2.data as TokenCapsData;

      // Data should be consistent between calls
      expect(data1.inspector.total).toBe(data2.inspector.total);
      expect(data1.inspector.breakdown).toEqual(data2.inspector.breakdown);
      expect(data1.system.totalLimit).toBe(data2.system.totalLimit);
    });

    test('should include all required fields in response', async () => {
      const result = await getTokenCapsTool.execute({});

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('executionTime');

      const tokenCapsData = result.data as TokenCapsData;

      // Check inspector structure
      expect(tokenCapsData.inspector).toHaveProperty('total');
      expect(tokenCapsData.inspector).toHaveProperty('breakdown');
      expect(tokenCapsData.inspector).toHaveProperty('usage');
      expect(tokenCapsData.inspector.breakdown).toHaveProperty('base');
      expect(tokenCapsData.inspector.breakdown).toHaveProperty('guidelines');
      expect(tokenCapsData.inspector.breakdown).toHaveProperty('context');
      expect(tokenCapsData.inspector.usage).toHaveProperty('current');
      expect(tokenCapsData.inspector.usage).toHaveProperty('available');
      expect(tokenCapsData.inspector.usage).toHaveProperty('percentage');

      // Check orchestrator structure
      expect(tokenCapsData.orchestrator).toHaveProperty('total');
      expect(tokenCapsData.orchestrator).toHaveProperty('breakdown');
      expect(tokenCapsData.orchestrator).toHaveProperty('usage');
      expect(tokenCapsData.orchestrator.breakdown).toHaveProperty('base');
      expect(tokenCapsData.orchestrator.breakdown).toHaveProperty('chainOfThought');
      expect(tokenCapsData.orchestrator.breakdown).toHaveProperty('toolContext');
      expect(tokenCapsData.orchestrator.breakdown).toHaveProperty('agentCoordination');
      expect(tokenCapsData.orchestrator.breakdown).toHaveProperty('decisionHistory');
      expect(tokenCapsData.orchestrator.usage).toHaveProperty('current');
      expect(tokenCapsData.orchestrator.usage).toHaveProperty('available');
      expect(tokenCapsData.orchestrator.usage).toHaveProperty('percentage');

      // Check system structure
      expect(tokenCapsData.system).toHaveProperty('totalLimit');
      expect(tokenCapsData.system).toHaveProperty('totalUsed');
      expect(tokenCapsData.system).toHaveProperty('totalAvailable');
      expect(tokenCapsData.system).toHaveProperty('overallUsage');

      // Check metadata
      expect(tokenCapsData).toHaveProperty('timestamp');
    });
  });
});