/**
 * Tests for Enhanced Signal Detector
 */

import { SignalDetectorImpl } from '../../src/scanner/signal-detector';
import { Signal } from '../../src/shared/types';

describe('Enhanced Signal Detector', () => {
  let detector: SignalDetectorImpl;

  beforeEach(() => {
    detector = new SignalDetectorImpl();
  });

  describe('Signal Detection', () => {
    test('should detect critical priority signals', async () => {
      const content = `
        # PRP Test

        [FF] System fatal error detected

        [bb] Blocked by missing API credentials

        [ff] Goal not achievable with current constraints

        [JC] Critical incident resolved
      `;

      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(4);

      const ffSignal = signals.find(s => s.type === 'FF');
      expect(ffSignal).toBeDefined();
      expect(ffSignal?.priority).toBe(10);
      expect(ffSignal?.data.category).toBe('system');

      const bbSignal = signals.find(s => s.type === 'bb');
      expect(bbSignal).toBeDefined();
      expect(bbSignal?.priority).toBe(9);
      expect(bbSignal?.data.category).toBe('development');
    });

    test('should detect high priority signals', async () => {
      const content = `
        # PRP Test

        [af] Need feedback on implementation approach

        [no] Implementation complexity discovered

        [ic] Production issue detected

        [oa] Need orchestrator attention
      `;

      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(4);

      signals.forEach(signal => {
        expect(signal.priority).toBeGreaterThanOrEqual(7);
        expect(signal.priority).toBeLessThanOrEqual(8);
      });
    });

    test('should detect medium priority signals', async () => {
      const content = `
        # PRP Test

        [tr] Tests are failing

        [cf] CI pipeline failed

        [rr] Research request needed

        [aa] Admin attention required
      `;

      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(4);

      signals.forEach(signal => {
        expect(signal.priority).toBeGreaterThanOrEqual(5);
        expect(signal.priority).toBeLessThanOrEqual(6);
      });
    });

    test('should detect low priority signals', async () => {
      const content = `
        # PRP Test

        [dp] Development progress made

        [br] Blocker resolved

        [tw] Tests written

        [rv] Review passed
      `;

      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(4);

      signals.forEach(signal => {
        expect(signal.priority).toBeGreaterThanOrEqual(2);
        expect(signal.priority).toBeLessThanOrEqual(4);
      });
    });

    test('should detect all signal categories', async () => {
      const content = `
        # Development signals
        [dp] Development progress
        [bf] Bug fixed
        [tp] Tests prepared

        # Testing signals
        [tg] Tests green
        [tr] Tests red
        [cq] Code quality

        # Release signals
        [mg] Merged
        [rl] Released
        [rv] Review passed

        # Coordination signals
        [oa] Orchestrator attention
        [aa] Admin attention
        [pc] Parallel coordination

        # Design signals
        [du] Design update
        [ds] Design system updated
        [dr] Design review requested

        # DevOps signals
        [id] Infrastructure deployed
        [mo] Monitoring online
        [so] System optimized
      `;

      const signals = await detector.detectSignals(content);

      expect(signals.length).toBeGreaterThan(15);

      const categories = new Set(signals.map(s => s.data.category));
      expect(categories).toContain('development');
      expect(categories).toContain('testing');
      expect(categories).toContain('release');
      expect(categories).toContain('coordination');
      expect(categories).toContain('design');
      expect(categories).toContain('devops');
    });
  });

  describe('Signal Categories', () => {
    test('should categorize development signals correctly', async () => {
      const content = '[dp] Development progress made';
      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].data.category).toBe('development');
      expect(signals[0].type).toBe('dp');
    });

    test('should categorize testing signals correctly', async () => {
      const content = '[tg] All tests passing';
      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].data.category).toBe('testing');
      expect(signals[0].type).toBe('tg');
    });

    test('should categorize release signals correctly', async () => {
      const content = '[rl] Released to production';
      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].data.category).toBe('release');
      expect(signals[0].type).toBe('rl');
    });

    test('should categorize coordination signals correctly', async () => {
      const content = '[oa] Orchestrator attention needed';
      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].data.category).toBe('coordination');
      expect(signals[0].type).toBe('oa');
    });
  });

  describe('Custom Patterns', () => {
    test('should add custom signal patterns', () => {
      const customPattern = {
        name: 'Custom Signal',
        pattern: /\[CS\]/gi,
        category: 'custom',
        priority: 5,
        description: 'A custom signal for testing',
        enabled: true
      };

      const patternId = detector.addCustomPattern(customPattern);

      expect(patternId).toBeDefined();
      expect(patternId.length).toBeGreaterThan(0);
    });

    test('should detect custom signals', async () => {
      const customPattern = {
        name: 'Custom Signal',
        pattern: /\[CS\]/gi,
        category: 'custom',
        priority: 5,
        description: 'A custom signal for testing',
        enabled: true
      };

      detector.addCustomPattern(customPattern);

      const content = '[CS] This is a custom signal';
      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].type).toBe('CS');
      expect(signals[0].data.category).toBe('custom');
      expect(signals[0].priority).toBe(5);
    });

    test('should remove custom patterns', () => {
      const customPattern = {
        name: 'Custom Signal',
        pattern: /\[CS\]/gi,
        category: 'custom',
        priority: 5,
        description: 'A custom signal for testing',
        enabled: true
      };

      const patternId = detector.addCustomPattern(customPattern);
      const removed = detector.removeCustomPattern(patternId);

      expect(removed).toBe(true);
    });

    test('should not remove non-existent patterns', () => {
      const removed = detector.removeCustomPattern('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Category Management', () => {
    test('should enable and disable categories', () => {
      detector.setCategoryEnabled('development', false);
      detector.setCategoryEnabled('testing', true);

      // The implementation should update internal state
      expect(() => detector.setCategoryEnabled('development', false)).not.toThrow();
      expect(() => detector.setCategoryEnabled('testing', true)).not.toThrow();
    });

    test('should get available categories', () => {
      const categories = detector.getCategories();

      expect(categories).toContain('development');
      expect(categories).toContain('testing');
      expect(categories).toContain('release');
      expect(categories).toContain('coordination');
    });

    test('should get patterns by category', () => {
      const developmentPatterns = detector.getPatternsByCategory('development');

      expect(developmentPatterns.length).toBeGreaterThan(0);
      developmentPatterns.forEach(pattern => {
        expect(pattern.category).toBe('development');
      });
    });

    test('should get enabled patterns only', () => {
      const enabledPatterns = detector.getEnabledPatterns();

      expect(enabledPatterns.length).toBeGreaterThan(0);
      enabledPatterns.forEach(pattern => {
        expect(pattern.enabled).toBe(true);
      });
    });
  });

  describe('Pattern Validation', () => {
    test('should validate correct patterns', () => {
      const validPattern = {
        name: 'Valid Pattern',
        pattern: /\[VP\]/gi,
        category: 'test',
        priority: 5,
        description: 'A valid pattern',
        enabled: true
      };

      const result = SignalDetectorImpl.validatePattern(validPattern);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid patterns', () => {
      const invalidPattern = {
        name: '', // Empty name
        pattern: 'not-a-regex', // Not a RegExp
        category: '', // Empty category
        priority: 15, // Invalid priority
        description: '', // Empty description
        enabled: true
      };

      const result = SignalDetectorImpl.validatePattern(invalidPattern);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should handle large content efficiently', async () => {
      const largeContent = Array(1000).fill('[dp] Development progress made').join('\n');

      const startTime = Date.now();
      const signals = await detector.detectSignals(largeContent);
      const endTime = Date.now();

      expect(signals.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should use cache effectively', async () => {
      const content = '[dp] Development progress made';

      // First call
      const signals1 = await detector.detectSignals(content);

      // Second call should use cache
      const signals2 = await detector.detectSignals(content);

      expect(signals1).toEqual(signals2);
    });

    test('should limit cache size', () => {
      const stats = detector.getCacheStats();

      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content', async () => {
      const signals = await detector.detectSignals('');
      expect(signals).toHaveLength(0);
    });

    test('should handle content without signals', async () => {
      const content = 'This is just regular text without any signals.';
      const signals = await detector.detectSignals(content);
      expect(signals).toHaveLength(0);
    });

    test('should handle malformed signals', async () => {
      const content = `
        [malformed
        []
        [A]  - single character
        [ABC123] - too long
      `;

      const signals = await detector.detectSignals(content);
      // Should not crash and may detect some valid patterns or ignore invalid ones
      expect(Array.isArray(signals)).toBe(true);
    });

    test('should handle unicode characters', async () => {
      const content = '[dp] Développement progressé 🚀';
      const signals = await detector.detectSignals(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].type).toBe('dp');
    });
  });
});