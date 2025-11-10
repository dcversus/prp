/**
 * ♫ Multi-Provider Token Accounting Unit Tests
 */

import { MultiProviderTokenAccounting } from '../multi-provider-token-accounting';
import { TimeUtils } from '../../shared/utils';

// Mock dependencies
jest.mock('../../shared/logger');
jest.mock('../../shared/utils');

describe('MultiProviderTokenAccounting', () => {
  let accounting: MultiProviderTokenAccounting;
  const testPersistPath = '.prp/test-token-accounting.json';

  // Helper function to mock accounting methods without signature issues
  function mockAccountingMethods(accountingInstance: MultiProviderTokenAccounting) {
    const mockLoadPersistedData = jest.fn().mockResolvedValue(undefined);
    const mockStartPriceUpdates = jest.fn().mockReturnValue(undefined);
    const mockStartLimitMonitoring = jest.fn().mockReturnValue(undefined);
    const mockStopPriceUpdates = jest.fn().mockReturnValue(undefined);
    const mockStopLimitMonitoring = jest.fn().mockReturnValue(undefined);

    // Replace methods with mocks
    (accountingInstance as any).loadPersistedData = mockLoadPersistedData;
    (accountingInstance as any).startPriceUpdates = mockStartPriceUpdates;
    (accountingInstance as any).startLimitMonitoring = mockStartLimitMonitoring;
    (accountingInstance as any).stopPriceUpdates = mockStopPriceUpdates;
    (accountingInstance as any).stopLimitMonitoring = mockStopLimitMonitoring;

    return {
      mockLoadPersistedData,
      mockStartPriceUpdates,
      mockStartLimitMonitoring,
      mockStopPriceUpdates,
      mockStopLimitMonitoring
    };
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    accounting = new MultiProviderTokenAccounting(testPersistPath);
  });

  afterEach(async () => {
    if (accounting) {
      await accounting.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      // Mock accounting methods using helper
      mockAccountingMethods(accounting);

      await expect(accounting.initialize()).resolves.not.toThrow();

      expect(accounting['isInitialized']).toBe(true);
    });

    it('should emit initialization event', async () => {
      const emitSpy = jest.spyOn(accounting, 'emit');

      // Mock accounting methods using helper
      mockAccountingMethods(accounting);

      await accounting.initialize();

      expect(emitSpy).toHaveBeenCalledWith('accounting:initialized', expect.objectContaining({
        providersCount: expect.any(Number),
        recordsCount: expect.any(Number),
        timestamp: expect.any(Date)
      }));
    });

    it('should not initialize twice', async () => {
      // Mocked via helper
      // Mocked via helper
      // Mocked via helper

      await accounting.initialize();

      const loadSpy = jest.spyOn(accounting as any, 'loadPersistedData');
      await accounting.initialize();

      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe('Provider Detection', () => {
    it('should detect Claude Code provider', () => {
      const detection = accounting['detectProviderAndModel']({
        'model': 'claude-3-5-sonnet',
        'provider': 'anthropic'
      });

      expect(detection.provider).toBe('claude-code');
      expect(detection.model).toBe('claude-3-5-sonnet');
    });

    it('should detect OpenAI provider', () => {
      const detection = accounting['detectProviderAndModel']({
        'model': 'gpt-4',
        'openai': true
      });

      expect(detection.provider).toBe('openai');
      expect(detection.model).toBe('gpt-4');
    });

    it('should detect Gemini provider', () => {
      const detection = accounting['detectProviderAndModel']({
        'model': 'gemini-pro',
        'google': true
      });

      expect(detection.provider).toBe('gemini');
      expect(detection.model).toBe('gemini-pro');
    });

    it('should return empty result for unknown provider', () => {
      const detection = accounting['detectProviderAndModel']({
        'model': 'unknown-model'
      });

      expect(detection.provider).toBeUndefined();
      expect(detection.model).toBeUndefined();
    });
  });

  describe('Token Usage Recording', () => {
    beforeEach(async () => {
      // Mocked via helper
      // Mocked via helper
      // Mocked via helper

      await accounting.initialize();
    });

    it('should record token usage for known provider', () => {
      const emitSpy = jest.spyOn(accounting, 'emit');

      accounting.recordUsage(
        'test-agent',
        'test-operation',
        1000,
        500,
        {
          model: 'claude-3-5-sonnet',
          provider: 'anthropic'
        }
      );

      expect(emitSpy).toHaveBeenCalledWith('usage:recorded', expect.objectContaining({
        record: expect.objectContaining({
          agentId: 'test-agent',
          operation: 'test-operation',
          totalTokens: 1500
        }),
        provider: 'Claude Code',
        model: 'Claude 3.5 Sonnet'
      }));
    });

    it('should calculate cost correctly', () => {
      const costSpy = jest.spyOn(accounting as any, 'calculateCost').mockReturnValue(0.045);

      accounting.recordUsage(
        'test-agent',
        'test-operation',
        1000,
        500,
        {
          model: 'claude-3-5-sonnet',
          provider: 'anthropic'
        }
      );

      expect(costSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'claude-code' }),
        expect.objectContaining({ id: 'claude-3-5-sonnet' }),
        1000,
        500
      );
    });

    it('should emit warning for unknown provider', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      accounting.recordUsage(
        'test-agent',
        'test-operation',
        1000,
        500,
        {
          model: 'unknown-model'
        }
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not detect provider'),
        expect.objectContaining({ agentId: 'test-agent' })
      );

      warnSpy.mockRestore();
    });

    it('should emit limit warning when approaching limits', () => {
      const emitSpy = jest.spyOn(accounting, 'emit');

      // Mock high usage
      jest.spyOn(accounting, 'calculateUsageInPeriod' as any).mockReturnValue(950000); // 95% of limit

      accounting.recordUsage(
        'test-agent',
        'test-operation',
        1000,
        500,
        {
          model: 'claude-3-5-sonnet',
          provider: 'anthropic'
        }
      );

      expect(emitSpy).toHaveBeenCalledWith('limit:warning', expect.objectContaining({
        percentage: expect.any(Number)
      }));
    });

    it('should emit limit exceeded event when over limits', () => {
      const emitSpy = jest.spyOn(accounting, 'emit');

      // Mock exceeded usage
      jest.spyOn(accounting, 'calculateUsageInPeriod' as any).mockReturnValue(1050000); // Over limit

      accounting.recordUsage(
        'test-agent',
        'test-operation',
        1000,
        500,
        {
          model: 'claude-3-5-sonnet',
          provider: 'anthropic'
        }
      );

      expect(emitSpy).toHaveBeenCalledWith('limit:exceeded', expect.objectContaining({
        percentage: expect.any(Number)
      }));
    });
  });

  describe('Usage Statistics', () => {
    beforeEach(async () => {
      // Mocked via helper
      // Mocked via helper
      // Mocked via helper

      await accounting.initialize();

      // Add some test records
      accounting.recordUsage('agent1', 'op1', 1000, 500, { model: 'claude-3-5-sonnet', provider: 'anthropic' });
      accounting.recordUsage('agent2', 'op2', 2000, 1000, { model: 'gpt-4', openai: true });
    });

    it('should return provider usage statistics', () => {
      const usage = accounting.getProviderUsage();

      expect(Array.isArray(usage)).toBe(true);
      expect(usage.length).toBeGreaterThan(0);

      // Should include Claude Code and OpenAI providers
      const claudeUsage = usage.find(u => u.providerName === 'Claude Code');
      const openaiUsage = usage.find(u => u.providerName === 'OpenAI');

      expect(claudeUsage).toBeDefined();
      expect(openaiUsage).toBeDefined();

      expect(claudeUsage).toMatchObject({
        providerId: 'claude-code',
        providerName: 'Claude Code',
        totalTokens: 1500,
        totalCost: expect.any(Number),
        requestCount: 1,
        status: expect.stringMatching(/healthy|warning|critical|exceeded/)
      });

      expect(openaiUsage).toMatchObject({
        providerId: 'openai',
        providerName: 'OpenAI',
        totalTokens: 3000,
        totalCost: expect.any(Number),
        requestCount: 1
      });
    });

    it('should calculate percentages correctly', () => {
      jest.spyOn(accounting, 'calculateUsageInPeriod' as any)
        .mockImplementation((...args: any[]) => {
          const records = args[0] as any[];
          if (records[0]?.providerId === 'claude-code') {
            return 600000;
          } // 60%
          if (records[0]?.providerId === 'openai') {
            return 800000;
          } // 80%
          return 0;
        });

      const usage = accounting.getProviderUsage();

      const claudeUsage = usage.find(u => u.providerId === 'claude-code');
      const openaiUsage = usage.find(u => u.providerId === 'openai');

      expect(claudeUsage?.percentages.daily).toBe(60);
      expect(openaiUsage?.percentages.daily).toBe(80);
    });

    it('should determine status correctly based on percentages', () => {
      // Test exceeded status (> 95%)
      jest.spyOn(accounting, 'calculateUsageInPeriod' as any).mockReturnValue(960000);

      const exceededUsage = accounting.getProviderUsage();
      const claudeExceeded = exceededUsage.find(u => u.providerId === 'claude-code');
      expect(claudeExceeded?.status).toBe('exceeded');

      // Test critical status (80-95%)
      jest.spyOn(accounting, 'calculateUsageInPeriod' as any).mockReturnValue(850000);

      const criticalUsage = accounting.getProviderUsage();
      const claudeCritical = criticalUsage.find(u => u.providerId === 'claude-code');
      expect(claudeCritical?.status).toBe('critical');

      // Test warning status (60-80%)
      jest.spyOn(accounting, 'calculateUsageInPeriod' as any).mockReturnValue(700000);

      const warningUsage = accounting.getProviderUsage();
      const claudeWarning = warningUsage.find(u => u.providerId === 'claude-code');
      expect(claudeWarning?.status).toBe('warning');

      // Test healthy status (< 60%)
      jest.spyOn(accounting as any, 'calculateUsageInPeriod').mockReturnValue(500000);

      const healthyUsage = accounting.getProviderUsage();
      const claudeHealthy = healthyUsage.find(u => u.providerId === 'claude-code');
      expect(claudeHealthy?.status).toBe('healthy');
    });
  });

  describe('Limit Predictions', () => {
    beforeEach(async () => {
      // Mocked via helper
      // Mocked via helper
      // Mocked via helper

      await accounting.initialize();

      // Add test records with hourly usage pattern
      const hourlyPattern = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: new Date(Date.now() - (9 - i) * 3600000), // Last 10 hours
        providerId: 'claude-code',
        modelId: 'claude-3-5-sonnet',
        agentId: 'test-agent',
        operation: 'test',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        cost: 0.045,
        currency: 'USD',
        layer: 'scanner',
        metadata: {}
      }));

      accounting['usageRecords'] = new Map(hourlyPattern.map(record => [record.id, record]));
    });

    it('should generate limit predictions', () => {
      const predictions = accounting.getLimitPredictions();

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);

      const prediction = predictions[0];
      expect(prediction).toMatchObject({
        providerId: expect.any(String),
        currentUsage: expect.any(Number),
        predictedUsage: expect.any(Number),
        timeToLimit: expect.any(Number),
        confidence: expect.any(Number),
        recommendation: expect.stringMatching(/continue|caution|stop|upgrade/)
      });
    });

    it('should calculate confidence based on usage consistency', () => {
      const predictions = accounting.getLimitPredictions();
      const prediction = predictions.find(p => p.providerId === 'claude-code');

      expect(prediction?.confidence).toBeGreaterThan(0);
      expect(prediction?.confidence).toBeLessThanOrEqual(1);
    });

    it('should recommend stop when time to limit is very low', () => {
      // Mock very low time to limit
      jest.spyOn(accounting as any, 'calculateHourlyUsage').mockReturnValue([10000]); // High usage
      jest.spyOn(accounting as any, 'calculateUsageInPeriod').mockReturnValue(950000); // Near limit

      const predictions = accounting.getLimitPredictions();
      const prediction = predictions.find(p => p.providerId === 'claude-code');

      expect(prediction?.recommendation).toBe('stop');
      expect(prediction?.timeToLimit).toBeLessThan(2);
    });

    it('should recommend upgrade when time is moderate but confidence is low', () => {
      // Mock moderate time to limit but low confidence
      jest.spyOn(accounting as any, 'calculateHourlyUsage').mockReturnValue([1000, 5000, 2000]); // Inconsistent usage
      jest.spyOn(accounting as any, 'calculateUsageInPeriod').mockReturnValue(500000); // Moderate usage
      jest.spyOn(accounting as any, 'calculateVariance').mockReturnValue(1000000); // High variance

      const predictions = accounting.getLimitPredictions();
      const prediction = predictions.find(p => p.providerId === 'claude-code');

      expect(prediction?.recommendation).toBe('upgrade');
      expect(prediction?.confidence).toBeLessThan(0.5);
    });
  });

  describe('Provider Management', () => {
    it('should add custom provider', () => {
      const emitSpy = jest.spyOn(accounting, 'emit');

      const customProvider = {
        id: 'custom-provider',
        name: 'Custom Provider',
        models: [{
          id: 'custom-model',
          name: 'Custom Model',
          contextWindow: 100000,
          maxOutputTokens: 4000,
          pricing: {
            input: 0.001,
            output: 0.002,
            currency: 'USD',
            effectiveDate: new Date()
          },
          capabilities: ['text']
        }],
        rateLimits: {
          requestsPerMinute: 60,
          tokensPerMinute: 30000,
          tokensPerDay: 500000
        },
        pricing: {
          currency: 'USD',
          updateInterval: 60,
          lastUpdated: new Date(),
          autoUpdate: true
        },
        enabled: true
      };

      accounting.addProvider(customProvider);

      expect(emitSpy).toHaveBeenCalledWith('provider:added', expect.objectContaining({
        providerId: 'custom-provider',
        name: 'Custom Provider'
      }));

      const usage = accounting.getProviderUsage();
      expect(usage.find(u => u.providerId === 'custom-provider')).toBeDefined();
    });

    it('should remove provider', () => {
      const emitSpy = jest.spyOn(accounting, 'emit');

      // Add provider first
      accounting.addProvider({
        id: 'temp-provider',
        name: 'Temp Provider',
        models: [],
        rateLimits: { requestsPerMinute: 0, tokensPerMinute: 0, tokensPerDay: 0 },
        pricing: { currency: 'USD', updateInterval: 60, lastUpdated: new Date(), autoUpdate: false },
        enabled: true
      });

      expect(accounting.removeProvider('temp-provider')).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('provider:removed', expect.objectContaining({
        providerId: 'temp-provider'
      }));

      expect(accounting.removeProvider('non-existent')).toBe(false);
    });
  });

  describe('Price Updates', () => {
    beforeEach(async () => {
      // Mocked via helper
      // Mocked via helper
      // Mocked via helper

      await accounting.initialize();
    });

    it('should update pricing for enabled providers', async () => {
      const updateSpy = jest.spyOn(accounting as any, 'updateProviderPricing').mockResolvedValue(undefined);
      const persistSpy = jest.spyOn(accounting as any, 'persistData').mockResolvedValue(undefined);
      const emitSpy = jest.spyOn(accounting, 'emit');

      await accounting.updatePricing();

      // Should update for all enabled providers
      expect(updateSpy).toHaveBeenCalledTimes(accounting['providers'].size);
      expect(persistSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith('pricing:updated', expect.objectContaining({
        providersCount: expect.any(Number)
      }));
    });

    it('should handle pricing update errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const persistSpy = jest.spyOn(accounting as any, 'persistData').mockResolvedValue(undefined);

      // Mock error for one provider
      jest.spyOn(accounting as any, 'updateProviderPricing').mockImplementation((provider: any) => {
        if (provider.id === 'claude-code') {
          throw new Error('Update failed');
        }
      });

      await accounting.updatePricing();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update pricing'),
        expect.objectContaining({ provider: 'Claude Code' })
      );

      expect(persistSpy).toHaveBeenCalled(); // Should still persist other updates

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      // Mocked via helper
      // Mocked via helper
      // Mocked via helper

      await accounting.initialize();

      // Add some test records
      accounting.recordUsage('test-agent', 'test-operation', 1000, 500, {
        model: 'claude-3-5-sonnet',
        provider: 'anthropic'
      });
    });

    it('should stop and cleanup resources', async () => {
      const persistSpy = jest.spyOn(accounting as any, 'persistData').mockResolvedValue(undefined);
      const cleanupSpy = jest.spyOn(accounting as any, 'cleanup').mockResolvedValue(undefined);

      await accounting.stop();

      expect(accounting['isInitialized']).toBe(false);
      expect(persistSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should remove old records during cleanup', async () => {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldRecord = {
        id: 'old-record',
        timestamp: new Date(cutoffDate.getTime() - 86400000), // 31 days ago
        providerId: 'claude-code',
        modelId: 'claude-3-5-sonnet',
        agentId: 'old-agent',
        operation: 'old-operation',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        cost: 0.045,
        currency: 'USD',
        layer: 'scanner',
        metadata: {}
      };

      accounting['usageRecords'].set('old-record', oldRecord);

      await accounting['cleanup']();

      expect(accounting['usageRecords'].has('old-record')).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should calculate cost correctly', () => {
      const claudeProvider = accounting['providers'].get('claude-code');
      const claudeModel = claudeProvider?.models.find(m => m.id === 'claude-3-5-sonnet');

      if (claudeProvider && claudeModel) {
        const cost = accounting['calculateCost'](claudeProvider, claudeModel, 1000, 500);
        expect(cost).toBeCloseTo(0.00975); // (1000 * 0.003 + 500 * 0.015) / 1000
      }
    });

    it('should calculate usage in period correctly', () => {
      const now = TimeUtils.now();
      const records = [
        {
          id: '1',
          timestamp: new Date(now.getTime() - 3600000), // 1 hour ago
          totalTokens: 1000,
          providerId: 'claude-code',
          modelId: 'claude-3-sonnet',
          agentId: 'test-agent',
          operation: 'test-operation',
          inputTokens: 500,
          outputTokens: 500,
          cost: 0.01,
          currency: 'USD',
          metadata: {}
        },
        {
          id: '2',
          timestamp: new Date(now.getTime() - 7200000), // 2 hours ago
          totalTokens: 2000,
          providerId: 'claude-code',
          modelId: 'claude-3-sonnet',
          agentId: 'test-agent',
          operation: 'test-operation',
          inputTokens: 1000,
          outputTokens: 1000,
          cost: 0.02,
          currency: 'USD',
          metadata: {}
        },
        {
          id: '3',
          timestamp: new Date(now.getTime() - 86400000), // 1 day ago
          totalTokens: 1500,
          providerId: 'openai',
          modelId: 'gpt-4',
          agentId: 'test-agent',
          operation: 'test-operation',
          inputTokens: 750,
          outputTokens: 750,
          cost: 0.03,
          currency: 'USD',
          metadata: {}
        }
      ];

      accounting['usageRecords'] = new Map(records.map(r => [r.id, r]));

      const last24Hours = accounting['calculateUsageInPeriod'](
        records,
        TimeUtils.daysAgo(1),
        now
      );

      expect(last24Hours).toBe(3000); // Only claude-code records from last 24h
    });

    it('should calculate hourly usage correctly', () => {
      const now = TimeUtils.now();
      const records = [
        {
          id: '1',
          timestamp: new Date(now.getTime() - 3600000), // 1 hour ago, hour 22
          totalTokens: 1000,
          providerId: 'claude-code',
          modelId: 'claude-3-sonnet',
          agentId: 'test-agent',
          operation: 'test-operation',
          inputTokens: 500,
          outputTokens: 500,
          cost: 0.01,
          currency: 'USD',
          metadata: {}
        },
        {
          id: '2',
          timestamp: new Date(now.getTime() - 7200000), // 2 hours ago, hour 21
          totalTokens: 2000,
          providerId: 'claude-code',
          modelId: 'claude-3-sonnet',
          agentId: 'test-agent',
          operation: 'test-operation',
          inputTokens: 1000,
          outputTokens: 1000,
          cost: 0.02,
          currency: 'USD',
          metadata: {}
        },
        {
          id: '3',
          timestamp: new Date(now.getTime() - 3600000), // 1 hour ago, hour 22
          totalTokens: 1500,
          providerId: 'claude-code',
          modelId: 'claude-3-sonnet',
          agentId: 'test-agent',
          operation: 'test-operation',
          inputTokens: 750,
          outputTokens: 750,
          cost: 0.015,
          currency: 'USD',
          metadata: {}
        }
      ];

      accounting['usageRecords'] = new Map(records.map(r => [r.id, r]));

      const hourlyUsage = accounting['calculateHourlyUsage'](records);

      expect(hourlyUsage).toHaveLength(24);
      expect(hourlyUsage[22]).toBe(2500); // Hour 22: 1000 + 1500
      expect(hourlyUsage[21]).toBe(2000); // Hour 21: 2000
    });

    it('should calculate variance correctly', () => {
      const values = [10, 15, 20, 25, 30];
      const variance = accounting['calculateVariance'](values);

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const expectedVariance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

      expect(variance).toBeCloseTo(expectedVariance);
    });
  });
});