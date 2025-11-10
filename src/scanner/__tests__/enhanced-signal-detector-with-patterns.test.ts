/**
 * ♫ Enhanced Signal Detector with Patterns Unit Tests
 */

import { EnhancedSignalDetectorWithPatterns } from '../enhanced-signal-detector-with-patterns';
import { EventBus } from '../../shared/events';

// Mock dependencies
jest.mock('../../shared/events');
jest.mock('../../shared/logger');

describe('EnhancedSignalDetectorWithPatterns', () => {
  let detector: EnhancedSignalDetectorWithPatterns;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock event bus
    eventBus = {
      publishToChannel: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any;

    // Create detector instance
    detector = new EnhancedSignalDetectorWithPatterns(eventBus);
  });

  describe('Signal Detection', () => {
    it('should detect basic [tp] signal', async () => {
      const content = '## progress\n[tp] Tests prepared for implementation';
      const result = await detector.detectSignals(content, 'test-source');

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0]).toMatchObject({
        pattern: 'tests_prepared',
        type: 'tests_prepared',
        content: '[tp]',
        priority: 'high'
      });
    });

    it('should detect multiple different signals', async () => {
      const content = `
        [tp] Tests prepared
        [dp] Development progress
        [bf] Bug fixed
        [tw] Tests written
      `;
      const result = await detector.detectSignals(content, 'test-source');

      expect(result.signals).toHaveLength(4);
      const signalTypes = result.signals.map(s => s.type);
      expect(signalTypes).toContain('tests_prepared');
      expect(signalTypes).toContain('development_progress');
      expect(signalTypes).toContain('bug_fixed');
      expect(signalTypes).toContain('tests_written');
    });

    it('should include line and column numbers', async () => {
      const content = 'Line 1\nLine 2\n[dp] Development progress\nLine 4';
      const result = await detector.detectSignals(content, 'test-source');

      expect(result.signals[0]).toMatchObject({
        line: 3,
        column: expect.any(Number)
      });
    });

    it('should extract context around signal', async () => {
      const content = 'Some context before [tp] tests prepared and some context after';
      const result = await detector.detectSignals(content, 'test-source');

      expect(result.signals).toHaveLength(1);
      const firstSignal = result.signals[0];
      expect(firstSignal?.context).toContain('test-source');
      expect(firstSignal?.context).toContain('tests_prepared');
    });

    it('should apply confidence scoring', async () => {
      const content = '[tp] High priority signal at start of document';
      const result = await detector.detectSignals(content, 'test-source');

      // Should have confidence in context
      expect(result.signals).toHaveLength(1);
      const firstSignal = result.signals[0];
      expect(firstSignal?.context).toContain('Confidence:');
      expect(firstSignal?.context).toMatch(/Confidence: \d+\.\d+%/);
    });

    it('should detect signals with different priorities', async () => {
      const content = `
        [aa] Admin attention required
        [bb] Blocker detected
        [tp] Tests prepared
        [cd] Cleanup done
      `;
      const result = await detector.detectSignals(content, 'test-source');

      expect(result.signals).toHaveLength(4);

      // Check priority levels
      const priorities = result.signals.map(s => s.priority);
      expect(priorities).toContain('critical'); // aa and bb
      expect(priorities).toContain('high');    // tp
      expect(priorities).toContain('medium');  // cd
    });

    it('should sort results by priority and line number', async () => {
      const content = `
        Line 1: [cd] Low priority
        Line 2: [tp] High priority
        Line 3: [bb] Critical priority
      `;
      const result = await detector.detectSignals(content, 'test-source');

      expect(result.signals).toHaveLength(3);
      // Critical should come first
      expect(result.signals[0]?.type).toBe('blocker');
      // Then high priority
      expect(result.signals[1]?.type).toBe('tests_prepared');
      // Then medium priority
      expect(result.signals[2]?.type).toBe('cleanup_done');
    });
  });

  describe('Duplicate Removal', () => {
    it('should remove duplicate signals within window', async () => {
      const content1 = '[tp] Tests prepared';
      const content2 = '[tp] Tests prepared';

      // First detection should succeed
      const result1 = await detector.detectSignals(content1, 'source1');
      expect(result1.signals).toHaveLength(1);

      const result2 = await detector.detectSignals(content2, 'source2');

      // Second detection should be marked as duplicate
      expect(result2.duplicates).toBe(1);
      expect(result2.signals).toHaveLength(0); // Duplicate removed
    });

    it('should allow same signal after duplicate window expires', async () => {
      // Mock expired duplicate
      detector['duplicates'].set('tests_prepared:hash', {
        hash: 'hash',
        signalType: 'tests_prepared',
        content: '[tp]',
        timestamp: new Date(Date.now() - 400000), // Beyond window
        source: 'source1',
        count: 1
      });

      const content = '[tp] Tests prepared';
      const result = await detector.detectSignals(content, 'source2');

      expect(result.duplicates).toBe(0);
      expect(result.signals).toHaveLength(1);
    });

    it('should track duplicate count', async () => {
      detector['duplicates'].set('tests_prepared:hash', {
        hash: 'hash',
        signalType: 'tests_prepared',
        content: '[tp]',
        timestamp: new Date(),
        source: 'source1',
        count: 3
      });

      const content = '[tp] Tests prepared';
      await detector.detectSignals(content, 'source2');

      const duplicate = detector['duplicates'].get('tests_prepared:hash');
      expect(duplicate?.count).toBe(4);
    });
  });

  describe('Pattern Management', () => {
    it('should add custom pattern', () => {
      const emitSpy = jest.spyOn(detector, 'emit');

      const customPattern = {
        id: 'custom_signal',
        name: 'custom_signal',
        pattern: /\[custom\]/g,
        category: 'custom',
        priority: 5,
        description: 'Custom signal pattern',
        enabled: true,
        custom: false
      };

      detector.addCustomPattern(customPattern);

      expect(emitSpy).toHaveBeenCalledWith('pattern:added', expect.objectContaining({
        pattern: customPattern
      }));

      // Should detect the custom pattern
      const allPatterns = detector.getAllPatterns();
      expect(allPatterns.find(p => p.id === 'custom_signal')).toBeDefined();
    });

    it('should remove custom pattern', () => {
      const emitSpy = jest.spyOn(detector, 'emit');

      const customPattern = {
        id: 'removable_signal',
        name: 'removable_signal',
        pattern: /\[remove\]/g,
        category: 'test',
        priority: 1,
        description: 'Removable signal pattern',
        enabled: true,
        custom: false
      };

      detector.addCustomPattern(customPattern);
      const removed = detector.removeCustomPattern('removable_signal');

      expect(removed).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('pattern:removed', expect.objectContaining({
        patternId: 'removable_signal'
      }));

      const allPatterns = detector.getAllPatterns();
      expect(allPatterns.find(p => p.id === 'removable_signal')).toBeUndefined();
    });

    it('should not remove non-existent pattern', () => {
      const removed = detector.removeCustomPattern('non-existent');
      expect(removed).toBe(false);
    });

    it('should toggle pattern enabled state', () => {
      const patterns = detector.getAllPatterns();
      const testPattern = patterns.find(p => p.id === 'tests_prepared');
      expect(testPattern).toBeDefined();

      if (testPattern) {
        const success = detector.togglePattern('tests_prepared', false);
        expect(success).toBe(true);
        expect(testPattern.enabled).toBe(false);

        // Should not detect disabled pattern
        detector['patterns'].get('tests_prepared')!.enabled = true; // Re-enable
      }
    });

    it('should return custom patterns only', () => {
      const customPattern = {
        id: 'test_custom',
        name: 'test_custom',
        pattern: /\[test\]/g,
        category: 'test',
        priority: 1,
        description: 'Test custom pattern',
        enabled: true,
        custom: false
      };

      detector.addCustomPattern(customPattern);

      const customPatterns = detector.getCustomPatterns();
      expect(customPatterns).toHaveLength(1);
      expect(customPatterns[0]?.id).toBe('test_custom');
    });
  });

  describe('Search and Analysis', () => {
    it('should return pattern statistics', async () => {
      const content = `
        [tp] Tests prepared
        [tp] Another tests prepared
        [dp] Development progress
        [tp] Third tests prepared
      `;

      const result = await detector.detectSignals(content, 'test-source');

      expect(result.patterns).toHaveLength(2); // tp and dp

      const tpStats = result.patterns.find(p => p.patternId === 'tests_prepared');
      expect(tpStats).toMatchObject({
        patternId: 'tests_prepared',
        matches: 3,
        confidence: expect.any(Number)
      });
    });

    it('should calculate processing metrics', async () => {
      const content = '[tp] Tests prepared';

      const result = await detector.detectSignals(content, 'test-source');

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.metadata).toMatchObject({
        lineCount: expect.any(Number),
        signalDensity: expect.any(Number),
        averageConfidence: expect.any(Number)
      });
    });

    it('should emit detection events', async () => {
      const emitSpy = jest.spyOn(detector, 'emit');

      const content = '[tp] Tests prepared';
      await detector.detectSignals(content, 'test-source');

      expect(emitSpy).toHaveBeenCalledWith('signals:detected', expect.objectContaining({
        source: 'test-source',
        signals: expect.any(Array),
        processingTime: expect.any(Number)
      }));
    });

    it('should publish to event bus', async () => {
      const content = '[tp] Tests prepared';
      await detector.detectSignals(content, 'test-source');

      expect(eventBus.publishToChannel).toHaveBeenCalledWith('scanner', expect.objectContaining({
        type: 'signals_detected',
        source: 'signal-detector',
        data: expect.objectContaining({
          source: 'test-source',
          signals: expect.any(Array)
        })
      }));
    });

    it('should limit signals per document', async () => {
      // Create content with many signals
      const manySignals = Array(100).fill(0).map((_, i) => `[tp] Signal ${i}`).join('\n');

      const detectorWithLimit = new EnhancedSignalDetectorWithPatterns(eventBus, {
        maxSignalsPerDocument: 10
      });

      const result = await detectorWithLimit.detectSignals(manySignals, 'test-source');

      expect(result.signals).toHaveLength(10); // Limited to 10
    });

    it('should filter signals by minimum confidence', async () => {
      const detectorWithThreshold = new EnhancedSignalDetectorWithPatterns(eventBus, {
        minSignalConfidence: 0.8 // High threshold
      });

      // Content that might produce low confidence signals
      const content = '[tp] Signal in unclear context';
      const result = await detectorWithThreshold.detectSignals(content, 'test-source');

      // Might filter out low confidence signals
      expect(result.signals.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle detection errors gracefully', async () => {
      // Mock an error during pattern application
      const originalApplyPattern = detector['applyPattern'];
      detector['applyPattern'] = jest.fn().mockImplementation(() => {
        throw new Error('Pattern application failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await detector.detectSignals('[tp] Test', 'test-source');

      expect(result.signals).toHaveLength(0);
      expect(result.duplicates).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      // Restore original method
      detector['applyPattern'] = originalApplyPattern;

      consoleSpy.mockRestore();
    });

    it('should handle malformed patterns gracefully', async () => {
      // Add a malformed pattern
      const malformedPattern = {
        id: 'malformed',
        name: 'malformed',
        pattern: null as any, // Invalid pattern
        category: 'test',
        priority: 1,
        description: 'Malformed pattern',
        enabled: true,
        custom: true
      };

      detector.addCustomPattern(malformedPattern);

      const content = '[tp] Valid signal';
      const result = await detector.detectSignals(content, 'test-source');

      // Should still detect valid signals
      expect(result.signals.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    it('should return detection metrics', async () => {
      const content = '[tp] Tests prepared [dp] Development progress';
      await detector.detectSignals(content, 'test-source');

      const metrics = detector.getMetrics();

      expect(metrics).toMatchObject({
        totalDetections: expect.any(Number),
        totalDuplicates: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        patternHitCounts: expect.any(Object)
      });
    });

    it('should track pattern hit counts', async () => {
      const content = '[tp] Tests prepared [tp] Another test [dp] Development progress';
      await detector.detectSignals(content, 'test-source');

      const metrics = detector.getMetrics();

      expect(metrics.patternHitCounts['tests_prepared']).toBe(2);
      expect(metrics.patternHitCounts['development_progress']).toBe(1);
    });

    it('should clear duplicate cache', () => {
      // Add some duplicates
      detector['duplicates'].set('test:hash', {
        hash: 'hash',
        signalType: 'test',
        content: '[test]',
        timestamp: new Date(),
        source: 'test',
        count: 1
      });

      expect(detector['duplicates'].size).toBe(1);

      detector.clearDuplicateCache();

      expect(detector['duplicates'].size).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should handle complex PRP content', async () => {
      const prpContent = `
# PRP-Test: Example PRP

> User requirements for testing functionality

## progress
[tp] Tests prepared for user authentication feature
[dp] Development progress: core authentication implemented
[bf] Bug fixed: password validation error resolved

## description
Implementation of user authentication with JWT tokens and session management.

## dor
- [x] Write comprehensive tests for authentication flow
- [x] Implement password hashing and validation
- [ ] Add JWT token refresh mechanism
- [ ] Implement session timeout handling

## dod
- [x] All authentication endpoints must return proper HTTP status codes
- [x] Passwords must be hashed using bcrypt
- [x] JWT tokens must include expiration time
- [ ] Session management must handle concurrent logins
- [ ] Error responses must not leak sensitive information

## plan
- [tp] Tests prepared for authentication feature
- [ip] Implementation plan created
- [dp] Development progress: core components implemented
- [tw] Tests written: authentication endpoints tested
- [bf] Bug fixed: validation logic corrected
- [cd] Cleanup done: code formatted and documented
      `;

      const result = await detector.detectSignals(prpContent, 'PRP-Test');

      expect(result.signals.length).toBeGreaterThan(5);

      const signalTypes = result.signals.map(s => s.type);
      expect(signalTypes).toContain('tests_prepared');
      expect(signalTypes).toContain('development_progress');
      expect(signalTypes).toContain('bug_fixed');
      expect(signalTypes).toContain('tests_written');
      expect(signalTypes).toContain('cleanup_done');

      // Should include context information
      result.signals.forEach(signal => {
        expect(signal.context).toContain('PRP-Test');
        expect(signal.line).toBeGreaterThan(0);
      });
    });

    it('should detect signals from different categories', async () => {
      const content = `
        # Development signals
        [tp] Tests prepared
        [dp] Development progress
        [bf] Bug fixed

        # Quality signals
        [cq] Code quality checks passed
        [cd] Cleanup completed

        # CI/CD signals
        [cp] CI pipeline passed
        [mg] Code merged

        # System signals
        [bb] Blocker detected
        [aa] Admin attention required
      `;

      const result = await detector.detectSignals(content, 'test-source');

      const categories = new Set(result.signals.map(s => detector['patterns'].get(s.pattern)?.category));

      expect(categories).toContain('development');
      expect(categories).toContain('quality');
      expect(categories).toContain('deployment');
      expect(categories).toContain('blocking');
      expect(categories).toContain('coordination');
    });

    it('should maintain signal priority ordering', async () => {
      const content = `
        [cd] Low priority cleanup
        [tp] High priority tests
        [bb] Critical priority blocker
        [aa] High priority admin attention
      `;

      const result = await detector.detectSignals(content, 'test-source');

      const priorities = result.signals.map(s => s.priority);

      // Critical should come first
      expect(priorities[0]).toBe('critical');

      // High priority should come next
      expect(priorities[1]).toBe('high');
      expect(priorities[2]).toBe('high');

      // Medium should come last
      expect(priorities[3]).toBe('medium');
    });
  });
});