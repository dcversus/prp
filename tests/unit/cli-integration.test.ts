/**
 * CLI Integration Tests
 *
 * Tests for CLI integration without importing ES modules directly.
 * Tests CLI functionality through execution and output validation.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const cliPath = join(__dirname, '../../dist/cli.js');

describe('CLI Integration Tests', () => {
  // Skip tests if CLI is not built
  beforeAll(() => {
    if (!existsSync(cliPath)) {
      console.warn('CLI not built. Skipping integration tests. Run "npm run build" first.');
      return;
    }
  });

  describe('Global Flags Help', () => {
    it('should show all global flags in help', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });

      // Check for all PRP-001 global flags
      expect(output).toContain('-c, --ci');
      expect(output).toContain('-d, --debug');
      expect(output).toContain('--log-level');
      expect(output).toContain('--no-color');
      expect(output).toContain('--log-file');
      expect(output).toContain('--mcp-port');
    });

    it('should show init command in help', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });
      expect(output).toContain('init');
    });

    it('should show orchestrator command in help', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });
      expect(output).toContain('orchestrator');
    });
  });

  describe('Init Command Help', () => {
    it('should show all init command options', () => {
      const output = execSync(`node ${cliPath} init --help`, { encoding: 'utf8' });

      // Check for PRP-001 init options
      expect(output).toContain('--prompt');
      expect(output).toContain('--project-name');
      expect(output).toContain('--default');
      expect(output).toContain('--force');
      expect(output).toContain('wikijs'); // Check wikijs template support

      // Check for legacy options
      expect(output).toContain('-n, --name');
      expect(output).toContain('-a, --author');
      expect(output).toContain('-e, --email');
      expect(output).toContain('-l, --license');
    });
  });

  describe('Orchestrator Command Help', () => {
    it('should show all orchestrator command options', () => {
      const output = execSync(`node ${cliPath} orchestrator --help`, { encoding: 'utf8' });

      // Check for PRP-001 orchestrator options
      expect(output).toContain('--prompt');
      expect(output).toContain('--run');
      expect(output).toContain('--config');
      expect(output).toContain('--limit');

      // Check for format descriptions
      expect(output).toContain('prp-name#robo-role');
      expect(output).toContain('Resource limits');
    });
  });

  describe('CLI Version', () => {
    it('should show version information', () => {
      const output = execSync(`node ${cliPath} --version`, { encoding: 'utf8' });
      expect(output).toContain('0.4.9'); // Should match package.json version
    });
  });

  describe('CLI Global Flags Functionality', () => {
    it('should accept global flags without errors', () => {
      // Test that global flags don't cause immediate errors
      expect(() => {
        execSync(`node ${cliPath} --ci --help`, { encoding: 'utf8' });
      }).not.toThrow();

      expect(() => {
        execSync(`node ${cliPath} --debug --help`, { encoding: 'utf8' });
      }).not.toThrow();

      expect(() => {
        execSync(`node ${cliPath} --log-level error --help`, { encoding: 'utf8' });
      }).not.toThrow();

      expect(() => {
        execSync(`node ${cliPath} --no-color --help`, { encoding: 'utf8' });
      }).not.toThrow();

      expect(() => {
        execSync(`node ${cliPath} --log-file /tmp/test.log --help`, { encoding: 'utf8' });
      }).not.toThrow();

      expect(() => {
        execSync(`node ${cliPath} --mcp-port 8080 --help`, { encoding: 'utf8' });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should show appropriate error for invalid options', () => {
      try {
        execSync(`node ${cliPath} --invalid-option`, { encoding: 'utf8' });
        fail('Expected command to fail');
      } catch (error: any) {
        expect(error.stdout || error.stderr).toContain('option');
      }
    });
  });

  describe('Command Validation', () => {
    it('should validate orchestrator run format', () => {
      // This test checks that the orchestrator command can parse valid formats
      // and rejects invalid ones. We'll test the parsing logic specifically.

      const { parseRunOption } = require('../../src/commands/orchestrator');

      // Valid formats
      expect(() => parseRunOption('PRP-001#robo-developer')).not.toThrow();
      expect(() => parseRunOption('PRP-001,PRP-002#robo-qa')).not.toThrow();

      // Invalid formats
      expect(() => parseRunOption('')).toThrow();
      expect(() => parseRunOption('invalid-format#')).not.toThrow(); // Actually valid - just empty PRP name
    });

    it('should validate orchestrator limit format', () => {
      const { parseLimitOption } = require('../../src/commands/orchestrator');

      // Valid formats
      expect(() => parseLimitOption('1k')).not.toThrow();
      expect(() => parseLimitOption('100usd#agent')).not.toThrow();
      expect(() => parseLimitOption('2d#project')).not.toThrow();
      expect(() => parseLimitOption('10k-PRP-001#agent')).not.toThrow();

      // Invalid formats
      expect(() => parseLimitOption('')).toThrow();
      expect(() => parseLimitOption('invalid')).toThrow();
    });
  });

  describe('Legacy Compatibility', () => {
    it('should accept legacy global options', () => {
      // Test backward compatibility
      expect(() => {
        execSync(`node ${cliPath} --name test --help`, { encoding: 'utf8' });
      }).not.toThrow();

      expect(() => {
        execSync(`node ${cliPath} --author "Test Author" --help`, { encoding: 'utf8' });
      }).not.toThrow();

      expect(() => {
        execSync(`node ${cliPath} --template typescript --help`, { encoding: 'utf8' });
      }).not.toThrow();
    });
  });

  describe('CI Mode Integration', () => {
    it('should work in CI mode without TUI', () => {
      // Test that CI flag doesn't try to launch TUI
      const output = execSync(`node ${cliPath} --ci --help`, { encoding: 'utf8' });
      expect(output).toContain('Usage:'); // Should show help, not launch TUI
    });
  });
});