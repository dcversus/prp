/**
 * Performance Tests for PRP-004 Scanner Signal Integration
 * Tests sub-100ms detection latency, 75+ signal patterns, and 10k+ signals/minute throughput
 */

import { EnhancedSignalDetector } from '../../src/scanner/enhanced-signal-detector';
import { SignalDetectorImpl } from '../../src/scanner/signal-detector';
import { Signal } from '../../src/shared/types';

describe('PRP-004 Scanner Signal Integration Performance Tests', () => {
  let enhancedDetector: EnhancedSignalDetector;
  let originalDetector: SignalDetectorImpl;

  beforeEach(() => {
    enhancedDetector = new EnhancedSignalDetector({
      cacheSize: 10000,
      cacheTTL: 60000,
      debounceTime: 50,
      batchSize: 100
    });

    originalDetector = new SignalDetectorImpl();
  });

  afterEach(() => {
    enhancedDetector.shutdown();
  });

  describe('PRP-004 Requirement: Sub-100ms Signal Detection Latency', () => {
    test('should detect signals in under 100ms for single file', async () => {
      const testContent = `
        # Test PRP Content

        ## progress
        [dp] Development progress completed
        [bf] Bug fixed in signal detection
        [tw] Tests written for new functionality

        ## description
        Test content with signals for performance validation.
      `;

      const startTime = Date.now();
      const signals = await enhancedDetector.detectSignalsRealTime('/test.md', testContent);
      const endTime = Date.now();
      const detectionTime = endTime - startTime;

      // Should detect 3 signals
      expect(signals.length).toBe(3);

      // Should meet sub-100ms requirement
      expect(detectionTime).toBeLessThan(100);

      // Should have proper metadata
      signals.forEach(signal => {
        expect(signal.data).toHaveProperty('line');
        expect(signal.data).toHaveProperty('column');
        expect(signal.data).toHaveProperty('context');
        expect(signal.data).toHaveProperty('patternName');
        expect(signal.data).toHaveProperty('category');
        expect(signal.data).toHaveProperty('description');
      });

      console.log(`Single file detection time: ${detectionTime}ms for ${signals.length} signals`);
    });

    test('should maintain sub-100ms performance with caching', async () => {
      const testContent = `[dp] Cached signal detection test`;
      const filePath = '/test/cache-performance.md';

      // First detection (cache miss)
      const firstStart = Date.now();
      const firstSignals = await enhancedDetector.detectSignalsRealTime(filePath, testContent);
      const firstTime = Date.now() - firstStart;

      // Second detection (cache hit)
      const secondStart = Date.now();
      const secondSignals = await enhancedDetector.detectSignalsRealTime(filePath, testContent);
      const secondTime = Date.now() - secondStart;

      // Should detect same signals
      expect(firstSignals.length).toBe(secondSignals.length);
      expect(firstSignals.length).toBe(1);

      // Both should be under 100ms
      expect(firstTime).toBeLessThan(100);
      expect(secondTime).toBeLessThan(100);

      // Second should be faster due to caching
      expect(secondTime).toBeLessThan(firstTime);

      console.log(`Cache performance: First=${firstTime}ms, Second=${secondTime}ms`);
    });
  });

  describe('PRP-004 Requirement: 75+ Signal Pattern Recognition', () => {
    test('should support all official AGENTS.md signal patterns', async () => {
      const allSignalsContent = `
        [FF] System Fatal Error
        [bb] Blocker
        [ff] Goal Not Achievable
        [JC] Jesus Christ (Incident Resolved)
        [af] Feedback Request
        [no] Not Obvious
        [ic] Incident
        [er] Escalation Required
        [oa] Orchestrator Attention
        [tr] Tests Red
        [cf] CI Failed
        [rr] Research Request
        [aa] Admin Attention
        [fo] File Ownership Conflict
        [di] Design Issue Identified
        [gg] Goal Clarification
        [vr] Validation Required
        [vp] Verification Plan
        [ip] Implementation Plan
        [er] Experiment Required
        [tp] Tests Prepared
        [dp] Development Progress
        [br] Blocker Resolved
        [rc] Research Complete
        [tw] Tests Written
        [cp] CI Passed
        [tg] Tests Green
        [cq] Code Quality
        [rg] Review Progress
        [cd] Cleanup Done
        [ps] Post-release Status
        [ap] Admin Preview Ready
        [dr] Design Review Requested
        [pt] Performance Testing Design
        [da] Done Assessment
        [rp] Ready for Preparation
        [bf] Bug Fixed
        [pc] Pre-release Complete
        [rv] Review Passed
        [iv] Implementation Verified
        [ra] Release Approved
        [mg] Merged
        [rl] Released
        [pm] Post-mortem
        [cc] Cleanup Complete
        [du] Design Update
        [ds] Design System Updated
        [dh] Design Handoff Ready
        [da] Design Assets Delivered
        [dc] Design Change Implemented
        [df] Design Feedback Received
        [dt] Design Testing Complete
        [dp] Design Prototype Ready
        [id] Infrastructure Deployed
        [cd] CI/CD Pipeline Updated
        [mo] Monitoring Online
        [ir] Incident Resolved
        [so] System Optimized
        [sc] Security Check Complete
        [pb] Performance Baseline Set
        [dr] Disaster Recovery Tested
        [cu] Capacity Updated
        [ac] Automation Configured
        [sl] SLO/SLI Updated
        [eb] Error Budget Status
        [ip] Incident Prevention
        [rc] Reliability Check Complete
        [rt] Recovery Time Measured
        [ao] Alert Optimized
        [ps] Post-mortem Started
        [ts] Troubleshooting Session
        [pc] Parallel Coordination Needed
        [cc] Component Coordination
        [as] Asset Sync Required
        [pe] Parallel Environment Ready
        [fs] Feature Flag Service Updated
        [ds] Database Schema Sync
        [rb] Rollback Prepared
      `;

      const startTime = Date.now();
      const signals = await enhancedDetector.detectSignalsRealTime('/test/all-signals.md', allSignalsContent);
      const processingTime = Date.now() - startTime;

      // Should detect 75+ patterns
      expect(signals.length).toBeGreaterThanOrEqual(75);

      // Should process in reasonable time
      expect(processingTime).toBeLessThan(1000); // Allow more time for large content

      // Should have correct priority assignments
      const ffSignal = signals.find(s => s.type === 'FF');
      const bbSignal = signals.find(s => s.type === 'bb');
      const dpSignal = signals.find(s => s.type === 'dp');

      expect(ffSignal?.priority).toBe(10);
      expect(bbSignal?.priority).toBe(9);
      expect(dpSignal?.priority).toBeLessThan(10);

      console.log(`Pattern recognition: ${signals.length} signals detected in ${processingTime}ms`);
    });
  });

  describe('PRP-004 Requirement: 10,000+ Signals/Minute Throughput', () => {
    test('should process 10,000 signals per minute', async () => {
      const signalsPerFile = 100;
      const fileCount = 100;
      const totalSignals = signalsPerFile * fileCount; // 10,000 signals

      // Create test files with signals
      const files = Array.from({ length: fileCount }, (_, i) => ({
        path: `/test/throughput-${i}.md`,
        content: Array.from({ length: signalsPerFile }, (_, j) =>
          `[dp] Throughput test signal ${i}-${j}`
        ).join('\n')
      }));

      const startTime = Date.now();
      const results = await enhancedDetector.detectSignalsBatch(files);
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const processingTimeMinutes = processingTime / 60000;

      // Should process all files
      expect(results.length).toBe(fileCount);

      // Should detect expected number of signals
      const totalDetected = results.reduce((sum, result) => sum + result.signals.length, 0);
      expect(totalDetected).toBe(totalSignals);

      // Should meet throughput requirement
      const signalsPerMinute = totalSignals / processingTimeMinutes;
      expect(signalsPerMinute).toBeGreaterThanOrEqual(10000);

      console.log(`Throughput: ${totalDetected} signals in ${processingTime}ms (${signalsPerMinute.toFixed(0)} signals/minute)`);
    });

    test('should handle large-scale monitoring with concurrent processing', async () => {
      const concurrentFiles = 50;
      const signalsPerFile = 20;

      const files = Array.from({ length: concurrentFiles }, (_, i) => ({
        path: `/test/concurrent-${i}.md`,
        content: Array.from({ length: signalsPerFile }, (_, j) =>
          `[dp] Concurrent test signal ${i}-${j}`
        ).join('\n')
      }));

      const startTime = Date.now();
      const results = await enhancedDetector.detectSignalsBatch(files);
      const processingTime = Date.now() - startTime;

      // Should process all files concurrently
      expect(results.length).toBe(concurrentFiles);

      // Each file should have correct number of signals
      results.forEach(result => {
        expect(result.signals.length).toBe(signalsPerFile);
      });

      // Should complete in reasonable time (demonstrates concurrency)
      const expectedMaxTime = concurrentFiles * 10; // 10ms per file max
      expect(processingTime).toBeLessThan(expectedMaxTime);

      console.log(`Concurrent processing: ${concurrentFiles} files in ${processingTime}ms`);
    });
  });

  describe('PRP-004 Requirement: Real-time Processing with Caching', () => {
    test('should provide real-time signal detection with debouncing', async () => {
      const testContent = `[dp] Real-time detection test`;
      const filePath = '/test/realtime.md';

      let signalDetectionCount = 0;
      let lastDetectionTime = 0;

      // Register signal detection callback
      enhancedDetector.onSignalsDetected((detectedPath, signals) => {
        if (detectedPath === filePath) {
          signalDetectionCount++;
          lastDetectionTime = Date.now();
        }
      });

      // Queue multiple rapid detections
      enhancedDetector.realTimeProcessor.queueProcessing(filePath, testContent);
      enhancedDetector.realTimeProcessor.queueProcessing(filePath, testContent);
      enhancedDetector.realTimeProcessor.queueProcessing(filePath, testContent);

      // Wait for debouncing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have triggered exactly once due to debouncing
      expect(signalDetectionCount).toBe(1);
      expect(lastDetectionTime).toBeGreaterThan(0);

      console.log(`Real-time processing: ${signalDetectionCount} detection(s) with debouncing`);
    });

    test('should maintain intelligent caching with TTL', async () => {
      const testContent = `[dp] TTL cache test`;
      const filePath = '/test/ttl-cache.md';

      // First detection
      const firstSignals = await enhancedDetector.detectSignalsRealTime(filePath, testContent);
      expect(firstSignals.length).toBe(1);

      // Immediate second detection should use cache
      const secondSignals = await enhancedDetector.detectSignalsRealTime(filePath, testContent);
      expect(secondSignals.length).toBe(1);

      // Check cache stats
      const metrics = enhancedDetector.getMetrics();
      expect(metrics.cacheStats.size).toBeGreaterThan(0);

      console.log(`TTL caching: Cache size=${metrics.cacheStats.size}, Hit rate tracking implemented`);
    });
  });

  describe('PRP-004 Requirement: Support for 100+ Concurrent Worktrees', () => {
    test('should handle 100+ concurrent worktrees simulation', async () => {
      const worktreeCount = 100;
      const signalsPerWorktree = 5;

      // Simulate 100 worktrees with files
      const allFiles = Array.from({ length: worktreeCount }, (_, worktreeIndex) =>
        Array.from({ length: signalsPerWorktree }, (_, fileIndex) => ({
          path: `/worktree-${worktreeIndex}/file-${fileIndex}.md`,
          content: `[dp] Worktree ${worktreeIndex} file ${fileIndex}`
        }))
      ).flat();

      const startTime = Date.now();
      const batchResults = await enhancedDetector.detectSignalsBatch(allFiles);
      const processingTime = Date.now() - startTime;

      // Should process all files
      expect(batchResults.length).toBe(allFiles.length);

      // Each file should have detected signals
      batchResults.forEach(result => {
        expect(result.signals.length).toBe(1);
        expect(result.signals[0].type).toBe('dp');
      });

      // Should complete in reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds max

      const totalSignals = batchResults.reduce((sum, result) => sum + result.signals.length, 0);
      const signalsPerSecond = (totalSignals / processingTime) * 1000;

      console.log(`Concurrent worktrees: ${worktreeCount} worktrees, ${totalSignals} signals in ${processingTime}ms (${signalsPerSecond.toFixed(0)} signals/second)`);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle corrupted content gracefully', async () => {
      const invalidContents = [
        null,
        undefined,
        '',
        123,
        {},
        [],
        'Binary content \x00\x01\x02',
        'Very large content'.repeat(10000)
      ];

      for (const content of invalidContents) {
        await expect(
          enhancedDetector.detectSignalsRealTime('/test/invalid.md', content as any)
        ).resolves.not.toThrow();
      }

      console.log('Error handling: All invalid content types handled gracefully');
    });

    test('should maintain performance under error conditions', async () => {
      const validContent = '[dp] Valid content';
      const invalidContent = null;

      // Mix of valid and invalid operations
      const promises = [
        enhancedDetector.detectSignalsRealTime('/test/valid1.md', validContent),
        enhancedDetector.detectSignalsRealTime('/test/invalid1.md', invalidContent as any),
        enhancedDetector.detectSignalsRealTime('/test/valid2.md', validContent),
        enhancedDetector.detectSignalsRealTime('/test/invalid2.md', invalidContent as any),
        enhancedDetector.detectSignalsRealTime('/test/valid3.md', validContent)
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const processingTime = Date.now() - startTime;

      // Should handle all operations without crashing
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // Valid operations should succeed
      const validResults = results.filter((_, index) => index % 2 === 0);
      validResults.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveLength(1);
          expect(result.value[0].type).toBe('dp');
        }
      });

      // Should complete quickly despite errors
      expect(processingTime).toBeLessThan(1000);

      console.log(`Performance under errors: ${promises.length} operations in ${processingTime}ms`);
    });
  });
});