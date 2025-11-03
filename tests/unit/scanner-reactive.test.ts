/**
 * Unit Tests for Reactive Scanner
 */

import { ReactiveScanner } from '../../src/scanner/reactive-scanner';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  statSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

describe('ReactiveScanner', () => {
  let scanner: ReactiveScanner;
  let mockWorktreePath: string;

  beforeEach(() => {
    mockWorktreePath = '/test/worktree';

    const config = {
      worktrees: [mockWorktreePath],
      enableSignalDetection: true,
      enableGitMonitoring: true,
      enableTokenTracking: true,
      fileWatchIgnore: ['**/node_modules/**', '**/.git/**'],
      tokenThreshold: 1000
    };

    scanner = new ReactiveScanner(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(scanner).toBeDefined();
      expect(scanner['config'].worktrees).toEqual([mockWorktreePath]);
      expect(scanner['config'].enableSignalDetection).toBe(true);
      expect(scanner['config'].tokenThreshold).toBe(1000);
    });

    test('should initialize with default metrics', () => {
      const metrics = scanner.getMetrics();
      expect(metrics.fileChanges).toBe(0);
      expect(metrics.signalsDetected).toBe(0);
      expect(metrics.gitEvents).toBe(0);
      expect(metrics.tokenEvents).toBe(0);
    });
  });

  describe('Signal Detection', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        size: 100,
        mtime: new Date()
      });
    });

    test('should detect all signal patterns automatically', async () => {
      const testContent = `
        [os] Scanner operational
        [op] Work in progress
        [Bb] Blocker detected
        [af] Need guidance
        [Cc] Task completed
        [xy] Custom signal
        [zz] Another custom
      `;

      const fileData = {
        path: '/test/file.md',
        action: 'change' as const,
        size: testContent.length,
        hash: 'abc123',
        content: testContent
      };

      const signalDetectedSpy = jest.spyOn(scanner as any, 'emit');

      await scanner['detectSignals'](fileData);

      expect(signalDetectedSpy).toHaveBeenCalledWith('signal_detected', expect.objectContaining({
        type: 'signal_detected',
        source: '/test/file.md',
        data: expect.objectContaining({
          filePath: '/test/file.md',
          signal: expect.stringMatching(/\[[A-Za-z][A-Za-z]\]/),
          lineNumber: expect.any(Number),
          signalData: expect.objectContaining({
            pattern: '\\[[A-Za-z][A-Za-z]\\]',
            match: expect.stringMatching(/\[[A-Za-z][A-Za-z]\]/)
          })
        })
      }));

      // Should detect all 7 signals
      expect(signalDetectedSpy).toHaveBeenCalledTimes(7);
    });

    test('should calculate urgency correctly for different signals', async () => {
      const testContent = `
        [Bb] Critical blocker
        [af] Medium priority question
        [os] Low priority info
      `;

      const fileData = {
        path: '/test/file.md',
        action: 'change' as const,
        size: testContent.length,
        hash: 'abc123',
        content: testContent
      };

      const signalDetectedSpy = jest.spyOn(scanner as any, 'emit');

      await scanner['detectSignals'](fileData);

      const calls = signalDetectedSpy.mock.calls;

      // Find the urgency for each signal
      const bbUrgency = calls.find(call => call[1].data.signal === '[Bb]')?.[1].urgency;
      const afUrgency = calls.find(call => call[1].data.signal === '[af]')?.[1].urgency;
      const osUrgency = calls.find(call => call[1].data.signal === '[os]')?.[1].urgency;

      expect(bbUrgency).toBe('critical');
      expect(afUrgency).toBe('medium');
      expect(osUrgency).toBe('low');
    });

    test('should not detect invalid signal patterns', async () => {
      const testContent = `
        [A] Invalid single letter
        [ABC] Invalid three letters
        [123] Invalid numbers
        [a1] Invalid alphanumeric
        [valid] But not [XX] pattern
        [cd] Valid signal
        [EF] Valid signal
      `;

      const fileData = {
        path: '/test/file.md',
        action: 'change' as const,
        size: testContent.length,
        hash: 'abc123',
        content: testContent
      };

      const signalDetectedSpy = jest.spyOn(scanner as any, 'emit');

      await scanner['detectSignals'](fileData);

      // Should only detect the valid signals [cd] and [EF]
      expect(signalDetectedSpy).toHaveBeenCalledTimes(2);

      const detectedSignals = signalDetectedSpy.mock.calls.map(call => call[1].data.signal);
      expect(detectedSignals).toContain('[cd]');
      expect(detectedSignals).toContain('[EF]');
    });
  });

  describe('File Change Handling', () => {
    test('should handle file addition', async () => {
      const mockFileContent = 'Test content [op] Signal';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockFileContent);
      (fs.statSync as jest.Mock).mockReturnValue({
        size: mockFileContent.length,
        mtime: new Date()
      });

      const fileChangeSpy = jest.spyOn(scanner as any, 'emit');
      const signalDetectionSpy = jest.spyOn(scanner as any, 'detectSignals');
      const tokenTrackingSpy = jest.spyOn(scanner as any, 'updateTokenTracking');

      await scanner['handleFileChange']('add', '/test/newfile.md', mockWorktreePath);

      expect(fileChangeSpy).toHaveBeenCalledWith('file_change', expect.objectContaining({
        type: 'file_change',
        source: mockWorktreePath,
        data: expect.objectContaining({
          path: path.join(mockWorktreePath, 'newfile.md'),
          action: 'add',
          size: mockFileContent.length,
          content: mockFileContent
        })
      }));

      expect(signalDetectionSpy).toHaveBeenCalled();
      expect(tokenTrackingSpy).toHaveBeenCalled();
    });

    test('should handle file deletion', async () => {
      const fileChangeSpy = jest.spyOn(scanner as any, 'emit');

      await scanner['handleFileChange']('unlink', '/test/oldfile.md', mockWorktreePath);

      expect(fileChangeSpy).toHaveBeenCalledWith('file_change', expect.objectContaining({
        data: expect.objectContaining({
          path: path.join(mockWorktreePath, 'oldfile.md'),
          action: 'unlink',
          size: 0,
          hash: ''
        })
      }));
    });

    test('should ignore non-relevant files', async () => {
      const irrelevantFiles = [
        '/test/node_modules/package.json',
        '/test/.git/config',
        '/test/dist/bundle.js'
      ];

      const signalDetectionSpy = jest.spyOn(scanner as any, 'detectSignals');

      for (const filePath of irrelevantFiles) {
        await scanner['handleFileChange']('change', filePath, mockWorktreePath);
      }

      // Should not call signal detection for irrelevant files
      expect(signalDetectionSpy).not.toHaveBeenCalled();
    });
  });

  describe('Token Tracking', () => {
    test('should emit token threshold event when exceeded', async () => {
      const largeContent = 'x'.repeat(2000); // Large enough to exceed 1000 token threshold
      const fileData = {
        path: '/test/large.md',
        action: 'change' as const,
        size: largeContent.length,
        hash: 'large123',
        content: largeContent
      };

      const tokenThresholdSpy = jest.spyOn(scanner as any, 'emit');

      await scanner['updateTokenTracking'](fileData);

      expect(tokenThresholdSpy).toHaveBeenCalledWith('token_threshold', expect.objectContaining({
        type: 'token_threshold',
        source: '/test/large.md',
        data: expect.objectContaining({
          filePath: '/test/large.md',
          tokenCount: expect.any(Number),
          threshold: 1000,
          percentage: expect.stringMatching(/10[0-9]/) // Should be around 200%
        }),
        urgency: expect.stringMatching(/critical|high/)
      }));
    });

    test('should estimate token count correctly', () => {
      const testContent = 'This is a test string for token estimation';
      const estimatedTokens = scanner['estimateTokenCount'](testContent);

      // Should estimate approximately 1 token per 4 characters
      expect(estimatedTokens).toBe(Math.ceil(testContent.length / 4));
    });
  });

  describe('Git Monitoring', () => {
    test('should detect git changes', async () => {
      const mockGitStatus = 'M src/file.ts\nA src/newfile.ts\nD src/oldfile.ts';

      const execSyncSpy = jest.spyOn(require('child_process'), 'execSync')
        .mockImplementation((command: string, options: any) => {
          if (command.startsWith('git status')) {
            return mockGitStatus;
          }
          if (command.startsWith('git rev-parse')) {
            return 'main';
          }
          return '';
        });

      const gitChangeSpy = jest.spyOn(scanner as any, 'emit');

      await scanner['handleGitChange'](mockWorktreePath);

      expect(execSyncSpy).toHaveBeenCalledWith('git status --porcelain', expect.objectContaining({
        cwd: mockWorktreePath,
        encoding: 'utf-8'
      }));

      expect(gitChangeSpy).toHaveBeenCalledWith('git_change', expect.objectContaining({
        type: 'git_change',
        source: mockWorktreePath,
        data: expect.objectContaining({
          repository: mockWorktreePath,
          branch: 'main',
          files: expect.arrayContaining(['src/file.ts', 'src/newfile.ts', 'src/oldfile.ts']),
          status: 'modified'
        })
      }));
    });
  });

  describe('Performance and Metrics', () => {
    test('should track metrics correctly', async () => {
      const testContent = '[op] Test signal';
      const fileData = {
        path: '/test/metrics.md',
        action: 'change' as const,
        size: testContent.length,
        hash: 'metrics123',
        content: testContent
      };

      await scanner['handleFileChange']('change', '/test/metrics.md', mockWorktreePath);

      const metrics = scanner.getMetrics();
      expect(metrics.fileChanges).toBe(1);
      expect(metrics.signalsDetected).toBe(1);
      expect(metrics.isRunning).toBe(false); // Not started yet
    });

    test('should handle large number of signals efficiently', async () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => `[op] Signal ${i}`).join('\n');
      const fileData = {
        path: '/test/large-signals.md',
        action: 'change' as const,
        size: largeContent.length,
        hash: 'largesignals123',
        content: largeContent
      };

      const startTime = Date.now();
      await scanner['detectSignals'](fileData);
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      // Should process 100 signals quickly (under 100ms)
      expect(processingTime).toBeLessThan(100);

      const metrics = scanner.getMetrics();
      expect(metrics.signalsDetected).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle file read errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const fileData = {
        path: '/test/error.md',
        action: 'change' as const,
        size: 100,
        hash: 'error123',
        content: 'test content'
      };

      await scanner['handleFileChange']('change', '/test/error.md', mockWorktreePath);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling file change /test/error.md'),
        expect.any(Error)
      );
    });

    test('should handle git command errors gracefully', async () => {
      const execSyncSpy = jest.spyOn(require('child_process'), 'execSync')
        .mockImplementation(() => {
          throw new Error('Not a git repository');
        });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await scanner['handleGitChange'](mockWorktreePath);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling git change'),
        expect.any(Error)
      );
    });
  });

  describe('Lifecycle Management', () => {
    test('should start and stop correctly', async () => {
      const mockWatcher = {
        on: jest.fn(),
        close: jest.fn()
      };

      // Mock chokidar
      const { watch } = require('chokidar');
      watch.mockReturnValue(mockWatcher);

      // Mock fs.exists for worktree validation
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await scanner.start();

      expect(scanner['isRunning']).toBe(true);
      expect(mockWatcher.on).toHaveBeenCalledWith('all', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));

      await scanner.stop();

      expect(scanner['isRunning']).toBe(false);
      expect(mockWatcher.close).toHaveBeenCalled();
    });

    test('should emit proper events during lifecycle', async () => {
      const mockWatcher = {
        on: jest.fn(),
        close: jest.fn()
      };

      const { watch } = require('chokidar');
      watch.mockReturnValue(mockWatcher);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const startSpy = jest.spyOn(scanner, 'emit');
      const stopSpy = jest.spyOn(scanner, 'emit');

      await scanner.start();
      expect(startSpy).toHaveBeenCalledWith('scanner:started', expect.objectContaining({
        worktreeCount: 1
      }));

      await scanner.stop();
      expect(stopSpy).toHaveBeenCalledWith('scanner:stopped', expect.objectContaining({
        metrics: expect.any(Object)
      }));
    });
  });
});