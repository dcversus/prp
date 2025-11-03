/**
 * Full System Integration Tests for Scanner-Inspector-Orchestrator
 * Tests actual behavior without mocks
 * Validates PRP-007-F DoD requirements
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ScannerIntegration } from '../../src/scanner/ScannerIntegration';
import { ScannerEvent } from '../../src/scanner/event-bus/EventBus';

describe('Scanner Full System Integration Tests', () => {
  let tempDir: string;
  let scanner: ScannerIntegration;
  const events: ScannerEvent[] = [];
  const inspectorPayloads: Record<string, unknown>[] = [];

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scanner-system-test-'));
  });

  afterAll(async () => {
    scanner?.stop();
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Initialize git repo for testing
    await execAsync('git init', { cwd: tempDir });
    await execAsync('git config user.name "Test User"', { cwd: tempDir });
    await execAsync('git config user.email "test@example.com"', { cwd: tempDir });

    scanner = new ScannerIntegration(
      ScannerIntegration.createConfig({
        watchPaths: [tempDir],
        filePatterns: ['.md'],
        ignorePatterns: ['.git'],
        enableGitAdapter: true,
        enableTmuxAdapter: false // Disable for CI tests
      })
    );

    // Collect events
    events.length = 0;
    inspectorPayloads.length = 0;

    scanner.subscribe('*', (event) => {
      events.push(event);
    });

    scanner.subscribe('inspector_payload_ready', (event) => {
      if (event.data && event.data.payload) {
        inspectorPayloads.push(event.data.payload);
      }
    });
  });

  describe('DoD Requirement: Signal Detection', () => {
    test('✅ Detects [XX] signals in PRP files', async () => {
      // Arrange: Create a PRP file with various signals
      const prpContent = `
# PRP-001: Example PRP

## progress
[dp] Development progress - Initial implementation complete
[tg] Tests green - All unit tests passing
[rc] Research complete - Market analysis done

## dor
- [ ] Define requirements
- [ ] Design solution
- [ ] Implement feature

## plan
- [ ] Create architecture
- [ ] Write code
- [ ] Test implementation
      `;

      const prpPath = path.join(tempDir, 'PRP-001.md');
      await fs.promises.writeFile(prpPath, prpContent);

      // Act: Scan file
      await scanner.scanFile(prpPath);

      // Assert: Verify all signals detected
      const signalEvents = events.filter(e => e.type === 'signal_detected');
      expect(signalEvents.length).toBeGreaterThanOrEqual(3);

      const detectedSignals = signalEvents.map(e => e.data?.signal);
      expect(detectedSignals).toContain('dp');
      expect(detectedSignals).toContain('tg');
      expect(detectedSignals).toContain('rc');

      // Verify Inspector payloads generated
      expect(inspectorPayloads.length).toBeGreaterThan(0);
      const dpPayload = inspectorPayloads.find(p => p.signal === 'dp');
      expect(dpPayload).toBeDefined();
      expect(dpPayload.source).toBe('file');
      expect(dpPayload.context.filePath).toContain('PRP-001.md');
    });

    test('✅ Handles signal deduplication correctly', async () => {
      // Arrange
      const content = '[dp] Signal here';
      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, content);

      // Act: Scan multiple times
      await scanner.scanFile(filePath);
      await scanner.scanFile(filePath);
      await scanner.scanFile(filePath);

      // Assert: Should only emit once due to deduplication
      const dpPayloads = inspectorPayloads.filter(p => p.signal === 'dp');
      expect(dpPayloads.length).toBe(1);
    });

    test('✅ Extracts context and line numbers', async () => {
      // Arrange
      const content = `
Line 1: No signal
Line 2: [dp] Development progress with important context
Line 3: More content
      `;

      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, content);

      // Act
      await scanner.scanFile(filePath);

      // Assert
      const payload = inspectorPayloads.find(p => p.signal === 'dp');
      expect(payload).toBeDefined();
      expect(payload.context.line).toBe(2);
      expect(payload.context.surroundingText).toContain('Development progress');
    });
  });

  describe('DoD Requirement: Event Bus Integration', () => {
    test('✅ Emits events to event bus', async () => {
      // Arrange
      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, '[FF] Fatal error');

      // Act
      await scanner.start();
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for scan

      // Assert
      expect(events.some(e => e.type === 'scanner_started')).toBe(true);
      expect(events.some(e => e.type === 'signal_detected')).toBe(true);
      expect(events.some(e => e.type === 'file_scanned')).toBe(true);

      scanner.stop();
    });

    test('✅ Tracks event history', async () => {
      // Arrange
      await fs.promises.writeFile(path.join(tempDir, 'test1.md'), '[dp] Signal 1');
      await fs.promises.writeFile(path.join(tempDir, 'test2.md'), '[tg] Signal 2');

      // Act
      await scanner.scanAllFiles();

      // Assert
      const recentEvents = scanner.getPendingSignals(10);
      expect(recentEvents.length).toBe(2);
      expect(recentEvents.map(p => p.signal)).toContain('dp');
      expect(recentEvents.map(p => p.signal)).toContain('tg');
    });
  });

  describe('DoD Requirement: Git Integration', () => {
    test('✅ Detects signals in Git commits', async () => {
      // Arrange: Create and commit with signal
      const commitContent = '[dp] Initial commit with signal';
      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, commitContent);
      await execAsync('git add .', { cwd: tempDir });
      await execAsync('git commit -m "feat: [dp] Initial commit"', { cwd: tempDir });

      // Act: Check Git adapter
      const gitSignals = await scanner.gitAdapter.detectCommitSignals();

      // Assert
      expect(gitSignals.length).toBeGreaterThan(0);
      const dpSignal = gitSignals.find(s => s.signal === 'dp');
      expect(dpSignal).toBeDefined();
      expect(dpSignal.message).toContain('Initial commit');
      expect(dpSignal.files).toContain('test.md');
    });

    test('✅ Tracks Git repository status', async () => {
      // Act
      const status = await scanner.gitAdapter.getStatus();

      // Assert
      expect(status.branch).toBeDefined();
      expect(typeof status.clean).toBe('boolean');
      expect(status.staged).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DoD Requirement: Performance', () => {
    test('✅ Handles large files efficiently', async () => {
      // Arrange: Create large file with many signals
      const largeContent = Array(1000).fill(0).map((_, i) =>
        `Line ${i}: [dp] Progress signal ${i}\n[tg] Test signal ${i}\n[FF] Error signal ${i}\n`
      ).join('\n');

      const filePath = path.join(tempDir, 'large.md');
      await fs.promises.writeFile(filePath, largeContent);

      // Act: Time the scan
      const startTime = Date.now();
      const result = await scanner.scanFile(filePath);
      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(result.signals.length).toBe(3000); // 1000 lines * 3 signals each
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('✅ Manages memory with event history', async () => {
      // Act: Get scanner stats
      const stats = scanner.getStats();

      // Assert
      expect(stats.pendingSignals).toBeDefined();
      expect(stats.deduplicationCacheSize).toBeDefined();
      expect(typeof stats.pendingSignals).toBe('number');
      expect(typeof stats.deduplicationCacheSize).toBe('number');
    });
  });

  describe('DoD Requirement: Inspector Integration', () => {
    test('✅ Formats payloads for 40K limit', async () => {
      // Arrange: Create signal with large context
      const largeContext = 'A'.repeat(50000); // 50KB of text
      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, `[dp] ${largeContext}`);

      // Act
      await scanner.scanFile(filePath);

      // Assert
      const payload = inspectorPayloads.find(p => p.signal === 'dp');
      expect(payload).toBeDefined();
      const payloadSize = JSON.stringify(payload).length;
      expect(payloadSize).toBeLessThanOrEqual(40960); // 40KB limit
    });

    test('✅ Calculates signal priority correctly', async () => {
      // Arrange: Create files with different signal types
      await fs.promises.writeFile(path.join(tempDir, 'critical.md'), '[FF] Critical error');
      await fs.promises.writeFile(path.join(tempDir, 'normal.md'), '[dp] Normal progress');
      await fs.promises.writeFile(path.join(tempDir, 'info.md'), '[ip] Information');

      // Act
      await scanner.scanAllFiles();

      // Assert
      const criticalPayload = inspectorPayloads.find(p => p.signal === 'FF');
      const normalPayload = inspectorPayloads.find(p => p.signal === 'dp');
      const infoPayload = inspectorPayloads.find(p => p.signal === 'ip');

      expect(criticalPayload?.priority).toBe(10); // High priority
      expect(normalPayload?.priority).toBe(5);  // Medium priority
      expect(infoPayload?.priority).toBe(1);    // Low priority
    });
  });

  describe('System Behavior Validation', () => {
    test('✅ Maintains consistency across multiple scans', async () => {
      // Arrange
      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, '[dp] Consistent signal');

      // Act: Scan multiple times
      await scanner.scanFile(filePath);
      const firstPayload = inspectorPayloads.find(p => p.signal === 'dp');
      inspectorPayloads.length = 0; // Clear

      await scanner.scanFile(filePath);
      const secondPayload = inspectorPayloads.find(p => p.signal === 'dp');

      // Assert
      expect(firstPayload?.signal).toBe(secondPayload?.signal);
      expect(firstPayload?.source).toBe(secondPayload?.source);
      expect(firstPayload?.context.filePath).toBe(secondPayload?.context.filePath);
    });

    test('✅ Handles concurrent file changes', async () => {
      // Arrange
      const files = Array(5).fill(0).map((_, i) =>
        path.join(tempDir, `test${i}.md`)
      );

      // Act: Create files concurrently
      await Promise.all(files.map(async (file, index) => {
        await fs.promises.writeFile(file, `[dp] Concurrent signal ${index}`);
      }));

      await scanner.scanAllFiles();

      // Assert: All signals detected
      expect(inspectorPayloads.length).toBe(5);
      inspectorPayloads.forEach((payload, index) => {
        expect(payload.signal).toBe('dp');
        expect(payload.context.filePath).toContain(`test${index}.md`);
      });
    });
  });
});

/**
 * Helper function to execute commands
 */
async function execAsync(command: string, options: Record<string, unknown> = {}): Promise<{ stdout: string; stderr: string }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);
  return execPromise(command, options);
}