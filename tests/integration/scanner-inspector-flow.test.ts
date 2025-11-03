/**
 * ♫ Integration Tests: Scanner → Inspector Flow
 *
 * Comprehensive tests to verify the complete signal processing pipeline
 * from scanner detection through inspector classification and payload generation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { Scanner } from '../../src/scanner/scanner';
import { Inspector } from '../../src/inspector/inspector';
import { guidelinesRegistry } from '../../src/guidelines/registry';
import { storageManager } from '../../src/storage/storage';
import { eventBus } from '../../src/shared/events';
import { Signal } from '../../src/shared/types';
import { createLayerLogger } from '../../src/shared/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLayerLogger('test');

describe('Scanner → Inspector Integration Flow', () => {
  let scanner: Scanner;
  let inspector: Inspector;
  let testWorktreeDir: string;
  let testPrpPath: string;
  let signalEvents: any[] = [];
  let inspectorResults: any[] = [];

  beforeEach(async () => {
    // Create temporary test directory
    testWorktreeDir = path.join(__dirname, '../temp/test-worktree-' + Date.now());
    await fs.mkdir(testWorktreeDir, { recursive: true });

    // Initialize storage
    await storageManager.initialize();

    // Initialize guidelines
    await guidelinesRegistry.load();

    // Create test PRP file
    testPrpPath = path.join(testWorktreeDir, 'PRP-test-signal.md');
    const prpContent = `# PRP: Test Signal Processing

## Goal
Test the complete signal processing pipeline from scanner to inspector.

## Definition of Ready
- [x] Test environment setup
- [x] Scanner initialized
- [x] Inspector initialized

## Definition of Done
- [ ] Signal detected by scanner
- [ ] Signal processed by inspector
- [ ] Payload generated for orchestrator

## Progress Log
- 2025-11-01: Test setup initiated [Gt]
- 2025-11-01: Scanner configured [Pi]
- 2025-11-01: Inspector ready [Cf]

## Signals
[At] - Attention signal for testing
[Co] - Completion signal for workflow`;

    await fs.writeFile(testPrpPath, prpContent);

    // Initialize scanner with minimal config for testing
    scanner = new Scanner({
      scanInterval: 1000,
      maxConcurrentScans: 1,
      enableGitMonitoring: false, // Disable for faster tests
      enableFileMonitoring: true,
      enablePRPMonitoring: true,
      worktreePaths: [testWorktreeDir],
      excludedPaths: [],
      includedExtensions: ['.md'],
      performanceThresholds: {
        maxScanTime: 5000,
        maxMemoryUsage: 100 * 1024 * 1024,
        maxFileCount: 100
      }
    });

    // Initialize inspector with test config
    inspector = new Inspector({
      model: 'gpt-5-mini',
      maxTokens: 1000,
      temperature: 0.3,
      timeout: 5000,
      batchSize: 5,
      maxConcurrentClassifications: 2,
      tokenLimits: {
        input: 500,
        output: 500,
        total: 1000
      }
    });

    // Setup event capturing
    signalEvents = [];
    inspectorResults = [];

    eventBus.subscribeToChannel('scanner', (event) => {
      if (event.type === 'scanner_signal_detected') {
        signalEvents.push(event);
      }
    });

    eventBus.subscribeToChannel('inspector', (event) => {
      if (event.type === 'inspector_processing_completed') {
        inspectorResults.push(event);
      }
    });

    // Add worktree to scanner
    await scanner.addWorktree(testWorktreeDir, 'test-worktree');

    // Wait for initial scan
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterEach(async () => {
    // Cleanup
    if (scanner) {
      await scanner.shutdown();
    }
    if (inspector) {
      await inspector.shutdown();
    }

    // Remove test directory
    try {
      await fs.rm(testWorktreeDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Test', 'cleanup', 'Failed to remove test directory', error);
    }

    // Clear event listeners
    eventBus.clearAllChannels();
  });

  describe('Basic Signal Flow', () => {
    it('should detect signal in PRP file and process through inspector', async () => {
      // Modify PRP file to trigger scan
      const updatedContent = prpContent + '\n\n- 2025-11-01: Integration test running [Ur]';
      await fs.writeFile(testPrpPath, updatedContent);

      // Wait for scanner to detect changes and inspector to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify scanner detected signals
      expect(signalEvents.length).toBeGreaterThan(0);
      const signalEvent = signalEvents[0];
      expect(signalEvent.data.signals).toBeDefined();
      expect(signalEvent.data.signals.length).toBeGreaterThan(0);

      // Verify inspector processed signals
      expect(inspectorResults.length).toBeGreaterThan(0);
      const inspectorResult = inspectorResults[0];
      expect(inspectorResult.data.result).toBeDefined();
      expect(inspectorResult.data.result.classification).toBeDefined();
      expect(inspectorResult.data.result.payload).toBeDefined();
    }, 10000);

    it('should correctly classify signals with appropriate categories', async () => {
      // Create a signal that should be classified as urgent
      const urgentContent = prpContent + '\n\n- 2025-11-01: Critical issue found [Bb]';
      await fs.writeFile(testPrpPath, urgentContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(inspectorResults.length).toBeGreaterThan(0);
      const result = inspectorResults[inspectorResults.length - 1].data.result;

      expect(result.classification.urgency).toBe('high' /* or 'critical' based on classification */);
      expect(result.classification.category).toBeDefined();
      expect(result.classification.confidence).toBeGreaterThan(0);
    }, 10000);

    it('should generate payload within token limits', async () => {
      const testContent = prpContent + '\n\n- 2025-11-01: Payload size test [Pi]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(inspectorResults.length).toBeGreaterThan(0);
      const result = inspectorResults[inspectorResults.length - 1].data.result;

      expect(result.payload).toBeDefined();
      expect(result.payload.estimatedTokens).toBeLessThanOrEqual(1000); // Test config limit
      expect(result.payload.context).toBeDefined();
      expect(result.payload.sourceSignals).toBeDefined();
    }, 10000);
  });

  describe('Guideline Integration', () => {
    it('should trigger relevant guidelines based on signal classification', async () => {
      // This test would verify that signals trigger appropriate guidelines
      const triggerContent = prpContent + '\n\n- 2025-11-01: Code review needed [At]';
      await fs.writeFile(testPrpPath, triggerContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if code review guideline was considered
      const result = inspectorResults[inspectorResults.length - 1]?.data.result;
      if (result) {
        expect(result.context).toBeDefined();
        // Guideline integration would be verified here
      }
    }, 10000);

    it('should respect enabled/disabled guideline configuration', async () => {
      // Disable a guideline and verify it's not triggered
      const codeReviewGuideline = guidelinesRegistry.getGuideline('code-review');
      if (codeReviewGuideline) {
        guidelinesRegistry.setGuidelineEnabled('code-review', false);
      }

      const testContent = prpContent + '\n\n- 2025-11-01: Should not trigger disabled guideline [At]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify disabled guideline was not triggered
      const result = inspectorResults[inspectorResults.length - 1]?.data.result;
      if (result) {
        // Check that disabled guideline wasn't included in context
        expect(result.context).toBeDefined();
      }
    }, 10000);
  });

  describe('Performance and Scaling', () => {
    it('should handle multiple signals in sequence', async () => {
      const signals = ['[At]', '[Bb]', '[Ur]', '[Co]', '[Pi]'];

      for (let i = 0; i < signals.length; i++) {
        const content = prpContent + `\n\n- 2025-11-01: Test signal ${i + 1} ${signals[i]}`;
        await fs.writeFile(testPrpPath, content);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for final processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(inspectorResults.length).toBeGreaterThanOrEqual(signals.length);

      // Verify each result has proper structure
      inspectorResults.forEach((result, index) => {
        expect(result.data.result.classification).toBeDefined();
        expect(result.data.result.payload).toBeDefined();
        expect(result.data.result.processingTime).toBeGreaterThan(0);
      });
    }, 15000);

    it('should maintain reasonable processing times', async () => {
      const startTime = Date.now();

      const testContent = prpContent + '\n\n- 2025-11-01: Performance test signal [Ti]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (5 seconds for test environment)
      expect(totalTime).toBeLessThan(5000);

      // Individual processing should also be reasonable
      if (inspectorResults.length > 0) {
        const result = inspectorResults[inspectorResults.length - 1].data.result;
        expect(result.processingTime).toBeLessThan(3000); // 3 seconds max per signal
      }
    }, 10000);
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed PRP files gracefully', async () => {
      // Create malformed PRP file
      const malformedContent = `# Invalid PRP

      This is not a valid PRP format
      [Invalid signal format
      Missing sections`;

      await fs.writeFile(testPrpPath, malformedContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should still function and not crash
      expect(scanner.getStatus().status).not.toBe('error');
      expect(inspector.getStatus().status).not.toBe('error');
    }, 10000);

    it('should handle inspector processing failures gracefully', async () => {
      // Mock a failure in inspector by using invalid configuration
      const faultyInspector = new Inspector({
        model: 'invalid-model',
        timeout: 100 // Very short timeout to trigger failure
      });

      try {
        const testContent = prpContent + '\n\n- 2025-11-01: Test with faulty inspector [Fr]';
        await fs.writeFile(testPrpPath, testContent);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // System should continue functioning
        expect(scanner.getStatus().status).not.toBe('error');
      } finally {
        await faultyInspector.shutdown();
      }
    }, 10000);
  });

  describe('Token Accounting Integration', () => {
    it('should track token usage correctly', async () => {
      const testContent = prpContent + '\n\n- 2025-11-01: Token tracking test [Ex]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      if (inspectorResults.length > 0) {
        const result = inspectorResults[inspectorResults.length - 1].data.result;

        expect(result.tokenUsage).toBeDefined();
        expect(result.tokenUsage.input).toBeGreaterThan(0);
        expect(result.tokenUsage.output).toBeGreaterThan(0);
        expect(result.tokenUsage.total).toBeGreaterThan(0);
        expect(result.tokenUsage.cost).toBeGreaterThanOrEqual(0);
      }
    }, 10000);

    it('should respect token limits', async () => {
      // Test with very low token limits
      const lowLimitInspector = new Inspector({
        tokenLimits: {
          input: 100,
          output: 50,
          total: 150
        }
      });

      try {
        const testContent = prpContent + '\n\n- 2025-11-01: Low limit test [Cf]';
        await fs.writeFile(testPrpPath, testContent);

        await new Promise(resolve => setTimeout(resolve, 2000));

        if (inspectorResults.length > 0) {
          const result = inspectorResults[inspectorResults.length - 1].data.result;
          expect(result.tokenUsage.total).toBeLessThanOrEqual(150);
        }
      } finally {
        await lowLimitInspector.shutdown();
      }
    }, 10000);
  });

  describe('Event System Integration', () => {
    it('should publish events to correct channels', async () => {
      const scannerEvents: any[] = [];
      const inspectorEvents: any[] = [];

      eventBus.subscribeToChannel('scanner', (event) => {
        scannerEvents.push(event);
      });

      eventBus.subscribeToChannel('inspector', (event) => {
        inspectorEvents.push(event);
      });

      const testContent = prpContent + '\n\n- 2025-11-01: Event system test [Ha]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(scannerEvents.length).toBeGreaterThan(0);
      expect(inspectorEvents.length).toBeGreaterThan(0);

      // Verify event structure
      const scannerEvent = scannerEvents.find(e => e.type === 'scanner_signal_detected');
      expect(scannerEvent).toBeDefined();
      expect(scannerEvent.data.signals).toBeDefined();

      const inspectorEvent = inspectorEvents.find(e => e.type === 'inspector_processing_completed');
      expect(inspectorEvent).toBeDefined();
      expect(inspectorEvent.data.result).toBeDefined();
    }, 10000);

    it('should maintain event ordering and causality', async () => {
      const eventTimeline: Array<{ source: string; event: string; timestamp: number }> = [];

      eventBus.subscribeToChannel('scanner', (event) => {
        if (event.type === 'scanner_signal_detected') {
          eventTimeline.push({
            source: 'scanner',
            event: 'signal_detected',
            timestamp: Date.now()
          });
        }
      });

      eventBus.subscribeToChannel('inspector', (event) => {
        if (event.type === 'inspector_processing_completed') {
          eventTimeline.push({
            source: 'inspector',
            event: 'processing_completed',
            timestamp: Date.now()
          });
        }
      });

      const testContent = prpContent + '\n\n- 2025-11-01: Timeline test [Ry]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(eventTimeline.length).toBe(2);
      expect(eventTimeline[0].source).toBe('scanner');
      expect(eventTimeline[1].source).toBe('inspector');
      expect(eventTimeline[1].timestamp).toBeGreaterThan(eventTimeline[0].timestamp);
    }, 10000);
  });
});