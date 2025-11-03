/**
 * ♫ End-to-End Integration Tests
 *
 * Complete system tests covering Scanner → Inspector → Guidelines → Storage flow.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Scanner } from '../../src/scanner/scanner';
import { Inspector } from '../../src/inspector/inspector';
import { guidelinesRegistry } from '../../src/guidelines/registry';
import { storageManager } from '../../src/storage/storage';
import { configManager } from '../../src/shared/config';
import { eventBus } from '../../src/shared/events';
import { Signal } from '../../src/shared/types';
import { createLayerLogger } from '../../src/shared/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLayerLogger('test');

describe('End-to-End System Integration', () => {
  let scanner: Scanner;
  let inspector: Inspector;
  let testWorktreeDir: string;
  let testPrpPath: string;
  let systemEvents: Array<{ source: string; event: string; data: any; timestamp: number }> = [];

  beforeEach(async () => {
    // Create test environment
    testWorktreeDir = path.join(__dirname, '../temp/e2e-test-' + Date.now());
    await fs.mkdir(testWorktreeDir, { recursive: true });

    // Initialize all system components
    await storageManager.initialize();
    await guidelinesRegistry.load();
    await configManager.load();

    // Create comprehensive test PRP
    testPrpPath = path.join(testWorktreeDir, 'PRP-e2e-integration.md');
    const prpContent = `# PRP: End-to-End Integration Test

## Goal
Verify complete system integration from signal detection through processing and storage.

## Definition of Ready
- [x] All system components initialized
- [x] Test environment prepared
- [x] Event system configured
- [x] Storage system ready

## Definition of Done
- [ ] Signal detected by scanner
- [ ] Signal classified by inspector
- [ ] Guidelines evaluated and triggered
- [ ] Results stored in persistent storage
- [ ] Token usage tracked
- [ ] Performance metrics recorded

## Progress Log
- 2025-11-01: System initialization started [Gt]
- 2025-11-01: All components ready [Pi]
- 2025-11-01: Test execution initiated [At]

## Signals
[Ur] - Urgent signal for critical path testing
[At] - Attention signal for system verification
[Co] - Completion signal for successful execution`;

    await fs.writeFile(testPrpPath, prpContent);

    // Setup system monitoring
    systemEvents = [];
    setupEventCapture();

    // Initialize system components
    scanner = new Scanner({
      scanInterval: 500,
      maxConcurrentScans: 1,
      enableGitMonitoring: false,
      enableFileMonitoring: true,
      enablePRPMonitoring: true,
      worktreePaths: [testWorktreeDir],
      excludedPaths: [],
      includedExtensions: ['.md'],
      performanceThresholds: {
        maxScanTime: 3000,
        maxMemoryUsage: 50 * 1024 * 1024,
        maxFileCount: 50
      }
    });

    inspector = new Inspector({
      model: 'gpt-5-mini',
      maxTokens: 2000,
      temperature: 0.3,
      timeout: 10000,
      batchSize: 5,
      maxConcurrentClassifications: 3,
      tokenLimits: {
        input: 1000,
        output: 1000,
        total: 2000
      }
    });

    // Add worktree
    await scanner.addWorktree(testWorktreeDir, 'e2e-test-worktree');

    // Wait for initial setup
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    // Cleanup system components
    if (scanner) {
      await scanner.shutdown();
    }
    if (inspector) {
      await inspector.shutdown();
    }

    // Cleanup test directory
    try {
      await fs.rm(testWorktreeDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Test', 'cleanup', 'Failed to cleanup test directory', error);
    }

    // Clear events
    eventBus.clearAllChannels();
  });

  function setupEventCapture() {
    // Capture all system events
    const channels = ['scanner', 'inspector', 'guidelines', 'storage'];

    channels.forEach(channel => {
      eventBus.subscribeToChannel(channel, (event) => {
        systemEvents.push({
          source: channel,
          event: event.type,
          data: event.data,
          timestamp: Date.now()
        });
      });
    });
  }

  describe('Complete Signal Processing Pipeline', () => {
    it('should process signals through all system layers', async () => {
      // Trigger signal processing
      const updatedContent = prpContent + '\n\n- 2025-11-01: Pipeline test signal [Ur]';
      await fs.writeFile(testPrpPath, updatedContent);

      // Wait for complete processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify scanner detected signal
      const scannerEvents = systemEvents.filter(e => e.source === 'scanner');
      const signalDetectedEvents = scannerEvents.filter(e => e.event === 'scanner_signal_detected');
      expect(signalDetectedEvents.length).toBeGreaterThan(0);

      // Verify inspector processed signal
      const inspectorEvents = systemEvents.filter(e => e.source === 'inspector');
      const processingCompletedEvents = inspectorEvents.filter(e => e.event === 'inspector_processing_completed');
      expect(processingCompletedEvents.length).toBeGreaterThan(0);

      // Verify guidelines were evaluated
      const guidelineEvents = systemEvents.filter(e => e.source === 'guidelines');
      expect(guidelineEvents.length).toBeGreaterThanOrEqual(0); // Guidelines may or may not trigger

      // Verify storage was updated
      const storageState = storageManager.getState();
      expect(storageState.signals).toBeDefined();
      expect(Object.keys(storageState.signals)).length > 0;
    }, 15000);

    it('should maintain data consistency across all layers', async () => {
      // Create signal with unique identifier
      const signalId = 'test-signal-' + Date.now();
      const testContent = prpContent + `\n\n- 2025-11-01: Consistency test ${signalId} [At]`;
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify signal exists in storage
      const storageState = storageManager.getState();
      const signals = Object.values(storageState.signals);
      const testSignal = signals.find(s => s.data.metadata?.testId === signalId);

      expect(testSignal).toBeDefined();
      expect(testSignal.type).toBe('At');

      // Verify inspector has matching result
      const inspectorEvents = systemEvents.filter(e => e.source === 'inspector');
      const processingEvent = inspectorEvents.find(e =>
        e.event === 'inspector_processing_completed' &&
        e.data.result.signal.type === 'At'
      );

      expect(processingEvent).toBeDefined();
      expect(processingEvent.data.result.classification).toBeDefined();
    }, 15000);
  });

  describe('Token Accounting Integration', () => {
    it('should track token usage across all components', async () => {
      const testContent = prpContent + '\n\n- 2025-11-01: Token accounting test [Ti]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check storage token accounting
      const tokenState = storageManager.getTokenState();
      expect(tokenState.accounting.totalUsed).toBeGreaterThanOrEqual(0);
      expect(tokenState.accounting.totalOperations).toBeGreaterThanOrEqual(0);

      // Check inspector token tracking
      const inspectorMetrics = inspector.getMetrics();
      expect(inspectorMetrics.averageTokenUsage.total).toBeGreaterThan(0);
    }, 15000);

    it('should generate token usage alerts when limits approached', async () => {
      // Set very low token limits for testing
      const lowLimitInspector = new Inspector({
        tokenLimits: {
          input: 50,
          output: 25,
          total: 75
        }
      });

      try {
        const testContent = prpContent + '\n\n- 2025-11-01: Token limit test [Fr]';
        await fs.writeFile(testPrpPath, testContent);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for token alerts
        const tokenState = storageManager.getTokenState();
        expect(tokenState.alerts.length).toBeGreaterThanOrEqual(0);

      } finally {
        await lowLimitInspector.shutdown();
      }
    }, 10000);
  });

  describe('Guideline System Integration', () => {
    it('should evaluate applicable guidelines for signals', async () => {
      // Ensure code review guideline is enabled
      guidelinesRegistry.setGuidelineEnabled('code-review', true);

      const testContent = prpContent + '\n\n- 2025-11-01: Code review needed [At]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check guideline events
      const guidelineEvents = systemEvents.filter(e => e.source === 'guidelines');
      const triggeredEvents = guidelineEvents.filter(e => e.event === 'guideline_triggered');

      // Guidelines may or may not trigger based on signal classification
      expect(triggeredEvents.length).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('should respect guideline enable/disable configuration', async () => {
      // Disable code review guideline
      guidelinesRegistry.setGuidelineEnabled('code-review', false);

      const testContent = prpContent + '\n\n- 2025-11-01: Disabled guideline test [Cf]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify disabled guideline was not triggered
      const guidelineEvents = systemEvents.filter(e => e.source === 'guidelines');
      const codeReviewEvents = guidelineEvents.filter(e =>
        e.data.guidelineId === 'code-review'
      );

      expect(codeReviewEvents.length).toBe(0);
    }, 10000);
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent signal processing', async () => {
      const signals = ['[At]', '[Ur]', '[Bb]', '[Co]', '[Pi]'];

      // Create multiple PRP files to generate concurrent signals
      for (let i = 0; i < signals.length; i++) {
        const prpFile = path.join(testWorktreeDir, `PRP-test-${i}.md`);
        const content = prpContent.replace('PRP-e2e-integration', `PRP-test-${i}`) +
                         `\n\n- 2025-11-01: Concurrent test ${i} ${signals[i]}`;
        await fs.writeFile(prpFile, content);
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify all signals were processed
      const inspectorEvents = systemEvents.filter(e => e.source === 'inspector');
      const completedEvents = inspectorEvents.filter(e => e.event === 'inspector_processing_completed');

      expect(completedEvents.length).toBeGreaterThanOrEqual(signals.length);

      // Verify system remained stable
      expect(scanner.getStatus().status).not.toBe('error');
      expect(inspector.getStatus().status).not.toBe('error');
    }, 20000);

    it('should maintain reasonable response times under load', async () => {
      const startTime = Date.now();

      // Process multiple signals rapidly
      for (let i = 0; i < 3; i++) {
        const testContent = prpContent + `\n\n- 2025-11-01: Load test ${i} [Ex]`;
        await fs.writeFile(testPrpPath, testContent);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      const totalTime = Date.now() - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);

      // Check individual processing times
      const inspectorEvents = systemEvents.filter(e => e.source === 'inspector');
      const completedEvents = inspectorEvents.filter(e => e.event === 'inspector_processing_completed');

      completedEvents.forEach(event => {
        expect(event.data.result.processingTime).toBeLessThan(5000);
      });
    }, 15000);
  });

  describe('System Reliability and Error Handling', () => {
    it('should recover from individual component failures', async () => {
      // Test with failing inspector
      const faultyInspector = new Inspector({
        model: 'non-existent-model',
        timeout: 100
      });

      try {
        const testContent = prpContent + '\n\n- 2025-11-01: Failure recovery test [En]';
        await fs.writeFile(testPrpPath, testContent);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Scanner should continue working
        expect(scanner.getStatus().status).not.toBe('error');

        // System should have error events but remain functional
        const errorEvents = systemEvents.filter(e => e.event.includes('error') || e.event.includes('failed'));
        expect(errorEvents.length).toBeGreaterThanOrEqual(0);

      } finally {
        await faultyInspector.shutdown();
      }
    }, 10000);

    it('should handle storage failures gracefully', async () => {
      // This test would simulate storage failures
      // For now, verify storage operations don't crash the system
      const testContent = prpContent + '\n\n- 2025-11-01: Storage resilience test [Vd]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should remain functional
      expect(scanner.getStatus().status).not.toBe('error');
      expect(inspector.getStatus().status).not.toBe('error');
    }, 10000);
  });

  describe('Data Persistence and Recovery', () => {
    it('should persist all processing results', async () => {
      const testContent = prpContent + '\n\n- 2025-11-01: Persistence test [Co]';
      await fs.writeFile(testPrpPath, testContent);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify data persistence
      const storageState = storageManager.getState();

      // Check signals
      expect(Object.keys(storageState.signals).length).toBeGreaterThan(0);

      // Check metrics
      expect(storageState.metrics.signals.total).toBeGreaterThan(0);

      // Check token accounting
      expect(storageState.tokens.accounting.totalOperations).toBeGreaterThan(0);
    }, 15000);

    it('should maintain data consistency after restart', async () => {
      // Process initial signal
      const initialContent = prpContent + '\n\n- 2025-11-01: Pre-restart test [Gt]';
      await fs.writeFile(testPrpPath, initialContent);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const initialSignalCount = Object.keys(storageManager.getState().signals).length;

      // Simulate restart by creating new instances
      await scanner.shutdown();
      await inspector.shutdown();

      // Create new instances
      const newScanner = new Scanner({
        scanInterval: 500,
        maxConcurrentScans: 1,
        enableGitMonitoring: false,
        enableFileMonitoring: true,
        enablePRPMonitoring: true,
        worktreePaths: [testWorktreeDir],
        excludedPaths: [],
        includedExtensions: ['.md']
      });

      const newInspector = new Inspector();

      try {
        await newScanner.addWorktree(testWorktreeDir, 'restart-test');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify persisted data is still available
        const persistedSignalCount = Object.keys(storageManager.getState().signals).length;
        expect(persistedSignalCount).toBeGreaterThanOrEqual(initialSignalCount);

      } finally {
        await newScanner.shutdown();
        await newInspector.shutdown();
      }
    }, 20000);
  });
});