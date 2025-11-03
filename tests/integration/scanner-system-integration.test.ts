/**
 * Integration Tests for Complete Scanner System
 */

import { Scanner } from '../../src/scanner/scanner';
import { SignalDetectorImpl } from '../../src/scanner/signal-detector';
import { EnhancedGitMonitor } from '../../src/scanner/enhanced-git-monitor';
import { EnhancedPRPParser } from '../../src/scanner/enhanced-prp-parser';
import { RealTimeEventEmitter } from '../../src/scanner/realtime-event-emitter';
import { TokenAccountingManager } from '../../src/scanner/token-accounting';

// Mock external dependencies
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

const mockExecSync = require('child_process').execSync as jest.MockedFunction<typeof require('child_process').execSync>;
const mockReadFile = require('fs/promises').readFile as jest.MockedFunction<typeof require('fs/promises').readFile>;
const mockReaddir = require('fs/promises').readdir as jest.MockedFunction<typeof require('fs/promises').readdir>;
const mockStat = require('fs/promises').stat as jest.MockedFunction<typeof require('fs/promises').stat>;
const mockExistsSync = require('fs').existsSync as jest.MockedFunction<typeof require('fs').existsSync;

// Mock shared utilities
jest.mock('../../src/shared/utils', () => ({
  createLayerLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    tokenUsage: jest.fn()
  })),
  HashUtils: {
    generateId: jest.fn(() => 'test-id'),
    hashString: jest.fn((str: string) => `hash-${str}`),
    hashFile: jest.fn(() => Promise.resolve('file-hash'))
  },
  TimeUtils: {
    now: jest.fn(() => new Date('2024-01-01T00:00:00Z')),
    daysAgo: jest.fn((days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000))
  },
  FileUtils: {
    readTextFile: jest.fn(),
    readFileStats: jest.fn(),
    ensureDir: jest.fn(),
    writeTextFile: jest.fn(),
    pathExists: jest.fn(),
    isPRPFile: jest.fn((path: string) =>
      path.includes('PRP') || path.includes('PRP-') || path.includes('-prp-')
    )
  },
  ConfigUtils: {
    loadConfigFile: jest.fn(() => Promise.resolve(null))
  },
  GitUtils: {
    getRepoStatus: jest.fn()
  },
  SignalParser: {
    extractSignals: jest.fn(() => ['[dp] Development progress', '[bf] Bug fixed'])
  },
  eventBus: {
    subscribeToChannel: jest.fn(),
    publishToChannel: jest.fn()
  }
}));

// Mock config manager
jest.mock('../../src/shared/config', () => ({
  configManager: {
    get: jest.fn(() => ({
      agents: [
        {
          id: 'test-agent',
          tokenLimits: {
            daily: 10000,
            weekly: 50000,
            monthly: 200000,
            maxPrice: 100
          }
        }
      ]
    }))
  }
}));

describe('Scanner System Integration', () => {
  let scanner: Scanner;
  let signalDetector: SignalDetectorImpl;
  let gitMonitor: EnhancedGitMonitor;
  let prpParser: EnhancedPRPParser;
  let eventEmitter: RealTimeEventEmitter;

  const testRepoPath = '/test/repo';
  const testCacheDir = '.prp/test-integration-cache';

  beforeEach(async () => {
    // Setup default mocks
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockResolvedValue([]);
    mockStat.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date('2024-01-01T00:00:00Z'),
      size: 1000
    } as any);

    mockReadFile.mockResolvedValue('');
    mockExecSync
      .mockReturnValueOnce('main') // branch
      .mockReturnValueOnce('abc123') // commit
      .mockReturnValueOnce('') // status
      .mockReturnValueOnce('0\t0'); // divergence

    // Initialize components
    signalDetector = new SignalDetectorImpl();
    gitMonitor = new EnhancedGitMonitor();
    prpParser = new EnhancedPRPParser(testCacheDir);
    eventEmitter = new RealTimeEventEmitter();

    scanner = new Scanner({
      scanInterval: 1000, // 1 second for faster tests
      maxConcurrentScans: 2,
      enableGitMonitoring: true,
      enableFileMonitoring: true,
      enablePRPMonitoring: true
    });
  });

  afterEach(async () => {
    if (scanner) {
      await scanner.shutdown();
    }
    if (eventEmitter) {
      await eventEmitter.shutdown();
    }
  });

  describe('Complete Signal Detection Pipeline', () => {
    test('should detect signals from all sources in a single scan', async () => {
      // Setup test data
      const testPRPContent = `# PRP-001: Test Feature

## Progress

| Signal | Comment | Time | Role |
|--------|---------|------|------|
| [dp] Development progress | Core implementation complete | 2024-01-01 | Developer |
| [bf] Bug fixed | Authentication issue resolved | 2024-01-01 | Developer |
| [tp] Tests prepared | Unit tests written | 2024-01-01 | Developer |

## Requirements
- [ ] Feature implemented
- [ ] Tests passing
`;

      const testGitLog = `def456|[dp] Development progress made|John Doe|2024-01-01`;

      // Mock PRP file discovery and content
      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(true);
      mockReaddir.mockResolvedValueOnce(['PRPs']);
      mockReaddir.mockResolvedValueOnce(['PRP-001.md']);
      mockStat.mockImplementation((path: string) => ({
        isFile: () => path.includes('.md'),
        isDirectory: () => path.includes('PRPs'),
        mtime: new Date('2024-01-01T00:00:00Z'),
        size: 1000
      } as any));

      mockReadFile.mockResolvedValue(testPRPContent);
      mockExecSync.mockReturnValueOnce(testGitLog); // git log

      // Add worktree and perform scan
      await scanner.addWorktree(testRepoPath, 'test-repo');

      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = scanner.getStatus();

      expect(status.status).toBe('idle');
      expect(status.metrics.totalScans).toBeGreaterThan(0);
      expect(status.metrics.totalSignalsDetected).toBeGreaterThan(0);
    });

    test('should integrate signal detection with real-time events', (done) => {
      let signalEventsReceived = 0;
      const expectedSignals = 3;

      // Subscribe to signal events
      eventEmitter.subscribeToSignals(() => {
        signalEventsReceived++;
        if (signalEventsReceived === expectedSignals) {
          expect(signalEventsReceived).toBe(expectedSignals);
          done();
        }
      });

      // Setup test content with multiple signals
      const testContent = `
        # Test PRP

        [dp] Development progress made
        [bf] Bug fixed in authentication
        [tp] Tests prepared for review
      `;

      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(true);
      mockReadFile.mockResolvedValue(testContent);

      // Parse PRP file to trigger signal detection
      prpParser.parsePRPFile('/test/PRP-001.md').then(() => {
        // Signals should be detected and events emitted
      });
    });

    test('should integrate git monitoring with signal detection', async () => {
      // Mock git status with commit containing signals
      mockExecSync
        .mockReturnValueOnce('feature/test-branch') // branch
        .mockReturnValueOnce('abc123') // commit
        .mockReturnValueOnce('') // status
        .mockReturnValueOnce('0\t0') // divergence
        .mockReturnValueOnce('def456|[dp] Development progress|John Doe|2024-01-01'); // git log

      const gitStatus = await gitMonitor.getEnhancedGitStatus(testRepoPath);

      expect(gitStatus.commitSignals).toHaveLength(1);
      expect(gitStatus.commitSignals[0].type).toBe('dp');
      expect(gitStatus.commitSignals[0].metadata.author).toBe('John Doe');
    });

    test('should integrate PRP parsing with token accounting', async () => {
      // Setup token accounting manager
      const tokenAccounting = new TokenAccountingManager(
        { scanInterval: 30000, maxConcurrentScans: 5 },
        '.prp/test-token-accounting.json'
      );

      const testContent = `# Test PRP with ${'A'.repeat(4000)} content

This is a test PRP with substantial content that should result in significant token usage when processed.

[dp] Development progress made
`;

      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(true);
      mockReadFile.mockResolvedValue(testContent);

      // Record token usage for PRP parsing
      tokenAccounting.recordUsage(
        'test-agent',
        'prp-parser',
        'parse-prp-file',
        'gpt-4',
        100, // input tokens
        50,  // output tokens
        'scanner',
        { filePath: '/test/PRP-001.md' }
      );

      const usage = tokenAccounting.getUsage('test-agent', 'day');
      expect(usage.tokens).toBe(150);
      expect(usage.cost).toBeGreaterThan(0);

      const limitStatus = tokenAccounting.getLimitStatus('test-agent');
      expect(limitStatus).toBeDefined();
      expect(limitStatus?.current.tokens).toBe(150);
    });
  });

  describe('Multi-Component Workflow', () => {
    test('should handle complete workflow from file change to signal detection', async () => {
      let workflowCompleted = false;

      // Subscribe to scanner events
      eventEmitter.subscribe('scan_completed', () => {
        workflowCompleted = true;
      });

      // Setup test scenario: PRP file with signals
      const testPRPPath = `${testRepoPath}/PRPs/feature-prp.md`;
      const testContent = `# Feature PRP

## Progress
[dp] Development progress - core features implemented
[bf] Bug fixed - authentication issue resolved
[tp] Tests prepared - unit tests covering main scenarios

## Status
This PRP contains multiple signals that should be detected by the scanner system.
`;

      // Mock file system
      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(true);
      mockReaddir.mockResolvedValueOnce(['PRPs']);
      mockReaddir.mockResolvedValueOnce(['feature-prp.md']);
      mockStat.mockImplementation((path: string) => ({
        isFile: () => path.includes('.md'),
        isDirectory: () => path.includes('PRPs'),
        mtime: new Date('2024-01-01T00:00:00Z'),
        size: 500
      } as any));

      mockReadFile.mockResolvedValue(testContent);

      // Add worktree and wait for scan
      await scanner.addWorktree(testRepoPath, 'feature-worktree');

      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(workflowCompleted).toBe(true);

      // Verify signals were detected
      const detectedSignals = await signalDetector.detectSignals(testContent);
      expect(detectedSignals).toHaveLength(3);
      expect(detectedSignals.map(s => s.type)).toContain('dp');
      expect(detectedSignals.map(s => s.type)).toContain('bf');
      expect(detectedSignals.map(s => s.type)).toContain('tp');
    });

    test('should handle parallel signal detection from multiple sources', async () => {
      // Setup multiple PRP files with different signals
      const prpFiles = [
        { path: '/test/PRP-001.md', content: '# PRP-001\n[dp] Development progress' },
        { path: '/test/PRP-002.md', content: '# PRP-002\n[bf] Bug fixed' },
        { path: '/test/PRP-003.md', content: '# PRP-003\n[tp] Tests prepared' }
      ];

      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['PRP-001.md', 'PRP-002.md', 'PRP-003.md']);
      mockStat.mockImplementation((path: string) => ({
        isFile: () => path.includes('.md'),
        isDirectory: () => false,
        mtime: new Date('2024-01-01T00:00:00Z'),
        size: 200
      } as any));

      mockReadFile
        .mockResolvedValueOnce(prpFiles[0].content)
        .mockResolvedValueOnce(prpFiles[1].content)
        .mockResolvedValueOnce(prpFiles[2].content);

      // Parse all PRP files in parallel
      const filePaths = prpFiles.map(f => f.path);
      const parsedPRPs = await prpParser.parseMultiplePRPFiles(filePaths);

      expect(parsedPRPs).toHaveLength(3);

      // Verify all signals were detected
      const allSignals = parsedPRPs.flatMap(prp => prp.signals);
      expect(allSignals).toHaveLength(3);
      expect(allSignals.some(s => s.type === 'dp')).toBe(true);
      expect(allSignals.some(s => s.type === 'bf')).toBe(true);
      expect(allSignals.some(s => s.type === 'tp')).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle file system errors gracefully', async () => {
      // Mock file system error
      mockReaddir.mockRejectedValueOnce(new Error('Permission denied'));

      // Scanner should handle the error without crashing
      await expect(scanner.addWorktree(testRepoPath, 'error-test')).rejects.toThrow();

      // Scanner should still be functional for other operations
      const status = scanner.getStatus();
      expect(status).toBeDefined();
    });

    test('should handle signal detection errors gracefully', async () => {
      // Mock malformed content that might cause parsing errors
      const malformedContent = null;
      mockReadFile.mockResolvedValue(malformedContent as any);

      // Should handle gracefully and not crash
      const prpFile = await prpParser.parsePRPFile('/test/malformed.md');
      expect(prpFile).toBeNull();
    });

    test('should handle git monitoring errors gracefully', async () => {
      // Mock git error
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('fatal: not a git repository');
      });

      // Should handle gracefully and return null or appropriate error
      await expect(gitMonitor.getEnhancedGitStatus('/invalid/repo')).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large number of signals efficiently', async () => {
      // Create content with many signals
      const signals = Array(100).fill(0).map((_, i) => `[dp] Development progress ${i}`);
      const largeContent = `# Large PRP\n\n${signals.join('\n')}`;

      const startTime = Date.now();
      const detectedSignals = await signalDetector.detectSignals(largeContent);
      const endTime = Date.now();

      expect(detectedSignals).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent operations', async () => {
      // Setup multiple concurrent operations
      const operations = [];

      for (let i = 0; i < 5; i++) {
        operations.push(
          signalDetector.detectSignals(`# Test PRP ${i}\n[dp] Development progress ${i}`)
        );
      }

      const results = await Promise.all(operations);

      expect(results).toHaveLength(5);
      results.forEach((signals, index) => {
        expect(signals).toHaveLength(1);
        expect(signals[0].data.rawSignal).toContain(`Development progress ${index}`);
      });
    });
  });

  describe('Component Integration', () => {
    test('should integrate all scanner components', async () => {
      // This test ensures all components work together properly

      // Setup comprehensive test data
      const testPRPContent = `# Comprehensive Test PRP

## Progress
[dp] Development progress - implementation complete
[bf] Bug fixed - critical issues resolved
[tp] Tests prepared - comprehensive test suite
[tg] Tests green - all tests passing
[rv] Review passed - code review complete

## Status
This PRP demonstrates full signal system integration.
`;

      // Mock all file operations
      const mockFileUtils = require('../../src/shared/utils').FileUtils;
      mockFileUtils.isPRPFile.mockReturnValue(true);
      mockReaddir.mockResolvedValueOnce(['comprehensive-test.md']);
      mockStat.mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date('2024-01-01T00:00:00Z'),
        size: 1000
      } as any);

      mockReadFile.mockResolvedValue(testPRPContent);

      // Test signal detection
      const signals = await signalDetector.detectSignals(testPRPContent);
      expect(signals.length).toBeGreaterThan(0);

      // Test PRP parsing
      const prpFile = await prpParser.parsePRPFile('/test/comprehensive-test.md');
      expect(prpFile).toBeDefined();
      expect(prpFile?.signals.length).toBeGreaterThan(0);

      // Test git monitoring
      mockExecSync
        .mockReturnValueOnce('main')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('0\t0');

      const gitStatus = await gitMonitor.getEnhancedGitStatus(testRepoPath);
      expect(gitStatus).toBeDefined();

      // Test event emission
      let eventReceived = false;
      eventEmitter.subscribeToPRP(() => {
        eventReceived = true;
      });

      eventEmitter.emitPRPEvent('prp_modified', '/test/comprehensive-test.md', {
        version: 1,
        changes: ['Initial implementation']
      });

      expect(eventReceived).toBe(true);
    });
  });
});