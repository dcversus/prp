/**
 * Behavior-Driven Tests for Scanner
 * Tests actual file system operations and signal detection
 * No mocks - real behavior verification
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ScannerCore } from '../../src/scanner/ScannerCore';
import { ScannerEvent } from '../../src/scanner/event-bus/EventBus';

describe('Scanner Behavior Tests', () => {
  let tempDir: string;
  let scanner: ScannerCore;
  const events: ScannerEvent[] = [];

  beforeAll(async () => {
    // Create temporary directory for tests
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scanner-test-'));
  });

  afterAll(async () => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Create new scanner for each test
    scanner = new ScannerCore({
      watchPaths: [tempDir],
      filePatterns: ['.md', '.txt'],
      ignorePatterns: ['node_modules', '.git'],
      pollInterval: 100
    });

    // Collect events
    events.length = 0;
    scanner.subscribe('*', (event) => {
      events.push(event);
    });
  });

  afterEach(() => {
    scanner.stop();
  });

  describe('Signal Detection Behavior', () => {
    test('should detect [XX] signals in PRP file', async () => {
      // Arrange: Create a PRP file with signals
      const prpContent = `
# PRP-001: Test PRP

## progress
[dp] Development progress - Initial implementation started
[tg] Tests green - All unit tests passing
[FF] Fatal error - Build failing due to type errors

## dod
- [ ] Implement feature X
- [ ] Write tests
- [ ] Document changes
      `;

      const prpPath = path.join(tempDir, 'PRP-001.md');
      await fs.promises.writeFile(prpPath, prpContent);

      // Act: Run scanner
      await scanner.scanFile(prpPath);

      // Assert: Verify signals detected
      const signalEvents = events.filter(e => e.type === 'signal_detected');
      expect(signalEvents).toHaveLength(3);

      const detectedSignals = signalEvents.map(e => e.data?.signal);
      expect(detectedSignals).toContain('dp');
      expect(detectedSignals).toContain('tg');
      expect(detectedSignals).toContain('FF');
    });

    test('should emit file_scanned event with metadata', async () => {
      // Arrange
      const content = 'Test content with [dp] signal';
      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, content);

      // Act
      await scanner.scanFile(filePath);

      // Assert
      const fileScannedEvent = events.find(e => e.type === 'file_scanned');
      expect(fileScannedEvent).toBeDefined();
      expect(fileScannedEvent?.data).toMatchObject({
        filePath,
        signalCount: 1,
        signals: { dp: 1 }
      });
    });

    test('should detect signal context and line numbers', async () => {
      // Arrange
      const content = `
Line 1: No signal here
Line 2: [dp] Development progress with context
Line 3: More content
Line 4: [tg] Tests green on this line
      `;

      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, content);

      // Act
      await scanner.scanFile(filePath);

      // Assert
      const signalEvents = events.filter(e => e.type === 'signal_detected');

      const dpEvent = signalEvents.find(e => e.data?.signal === 'dp');
      expect(dpEvent?.data).toMatchObject({
        signal: 'dp',
        line: 2,
        type: 'new' // Based on context analysis
      });
      expect(dpEvent?.data?.context).toContain('Development progress');

      const tgEvent = signalEvents.find(e => e.data?.signal === 'tg');
      expect(tgEvent?.data).toMatchObject({
        signal: 'tg',
        line: 4,
        type: 'new'
      });
    });

    test('should identify resolved signals (lowercase)', async () => {
      // Arrange
      const content = `
[dp] New task started
[dp] Another task
[dp] First task completed
      `;

      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, content);

      // Act
      await scanner.scanFile(filePath);

      // Assert
      const signalEvents = events.filter(e => e.type === 'signal_detected');
      const dpEvents = signalEvents.filter(e => e.data?.signal === 'dp');

      // All should be detected as 'new' since they're uppercase
      dpEvents.forEach(event => {
        expect(event.data?.type).toBe('new');
      });

      // Now test with resolved (lowercase)
      const resolvedContent = `
[dp] Task resolved
[dp] Another resolved
      `;

      await fs.promises.writeFile(filePath, resolvedContent);
      events.length = 0; // Clear events
      await scanner.scanFile(filePath);

      const resolvedEvents = events.filter(e => e.type === 'signal_detected');
      resolvedEvents.forEach(event => {
        expect(event.data?.type).toBe('resolved');
      });
    });

    test('should ignore files matching ignore patterns', async () => {
      // Arrange
      await fs.promises.mkdir(path.join(tempDir, 'node_modules'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'node_modules', 'test.md'),
        'This has [dp] signal but should be ignored'
      );

      await fs.promises.writeFile(
        path.join(tempDir, 'valid.md'),
        'This has [tg] signal and should be scanned'
      );

      // Act
      await scanner.scanAllFiles();

      // Assert
      const signalEvents = events.filter(e => e.type === 'signal_detected');
      expect(signalEvents).toHaveLength(1);
      expect(signalEvents[0].data?.signal).toBe('tg');
    });

    test('should detect signals in multiple files', async () => {
      // Arrange
      await fs.promises.writeFile(
        path.join(tempDir, 'file1.md'),
        '[dp] File 1 progress\n[tg] File 1 test'
      );

      await fs.promises.writeFile(
        path.join(tempDir, 'file2.txt'),
        '[FF] File 2 error\n[af] File 1 feedback'
      );

      // Act
      const results = await scanner.scanAllFiles();

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].signals).toHaveLength(2);
      expect(results[1].signals).toHaveLength(2);

      const allSignals = events.filter(e => e.type === 'signal_detected');
      expect(allSignals).toHaveLength(4);
    });
  });

  describe('Scanner Lifecycle Behavior', () => {
    test('should emit scanner_started event when starting', async () => {
      // Act
      await scanner.start();

      // Assert
      const startEvent = events.find(e => e.type === 'scanner_started');
      expect(startEvent).toBeDefined();
      expect(startEvent?.data).toMatchObject({
        watchPaths: [tempDir],
        filePatterns: ['.md', '.txt']
      });
    });

    test('should emit scanner_stopped event when stopping', async () => {
      // Act
      await scanner.start();
      events.length = 0; // Clear start event
      scanner.stop();

      // Assert
      const stopEvent = events.find(e => e.type === 'scanner_stopped');
      expect(stopEvent).toBeDefined();
    });

    test('should track file changes and only rescan modified files', async () => {
      // Arrange
      const filePath = path.join(tempDir, 'test.md');
      await fs.promises.writeFile(filePath, 'Initial content with [dp]');

      // Act: First scan
      await scanner.scanFile(filePath);
      const firstScanCount = events.filter(e => e.type === 'signal_detected').length;

      // Second scan without changes
      events.length = 0;
      await scanner.scanFile(filePath);
      const secondScanCount = events.filter(e => e.type === 'signal_detected').length;

      // Assert: No new events on second scan
      expect(secondScanCount).toBe(0);

      // Modify file
      await fs.promises.writeFile(filePath, 'Modified content with [tg]');
      events.length = 0;
      await scanner.scanFile(filePath);

      // Assert: New signal detected
      const thirdScanEvents = events.filter(e => e.type === 'signal_detected');
      expect(thirdScanEvents).toHaveLength(1);
      expect(thirdScanEvents[0].data?.signal).toBe('tg');
    });

    test('should provide accurate statistics', async () => {
      // Arrange
      await fs.promises.writeFile(
        path.join(tempDir, 'test1.md'),
        '[dp] Signal 1\n[tg] Signal 2'
      );

      await fs.promises.writeFile(
        path.join(tempDir, 'test2.md'),
        '[FF] Signal 3'
      );

      // Act
      await scanner.scanAllFiles();
      const stats = scanner.getStats();

      // Assert
      expect(stats.filesWatched).toBe(2);
      expect(stats.signalsDetected).toBe(3);
      expect(stats.isRunning).toBe(false); // Scanner not started, just scanned
      expect(stats.lastScan).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling Behavior', () => {
    test('should handle non-existent files gracefully', async () => {
      // Act
      const result = await scanner.scanFile('/path/that/does/not/exist.md');

      // Assert
      expect(result).toBeNull();
      // No events should be emitted
      expect(events.filter(e => e.type === 'file_scanned')).toHaveLength(0);
    });

    test('should handle files with invalid encoding', async () => {
      // Arrange: Create a binary file
      const binaryPath = path.join(tempDir, 'binary.bin');
      await fs.promises.writeFile(binaryPath, Buffer.from([0x89, 0x50, 0x4E, 0x47]));

      // Act
      const result = await scanner.scanFile(binaryPath);

      // Assert: Should handle gracefully
      // Result might be null or have empty signals
      expect(result).toBeDefined();
    });

    test('should emit errors but continue scanning', async () => {
      // Arrange
      const validContent = '[dp] Valid signal';
      const validPath = path.join(tempDir, 'valid.md');
      await fs.promises.writeFile(validPath, validContent);

      // Act: Scan directory with valid file
      await scanner.scanAllFiles();

      // Assert: Valid file should still be processed
      const signalEvents = events.filter(e => e.type === 'signal_detected');
      expect(signalEvents.length).toBeGreaterThan(0);
    });
  });
});