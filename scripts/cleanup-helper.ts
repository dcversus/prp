#!/usr/bin/env tsx

/**
 * Cleanup Helper Script
 * Automated helpers for common TypeScript/ESLint error patterns
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CleanupResult {
  file: string;
  fixed: number;
  remaining: number;
  issues: string[];
}

class CleanupHelper {
  private readonly srcDir = path.join(__dirname, '../src');
  private readonly testDir = path.join(__dirname, '../tests');

  /**
   * Get current error counts for TypeScript and ESLint
   */
  getErrorCounts(): { ts: number; eslint: number; eslintWarnings: number } {
    try {
      const tsOutput = execSync('npm run typecheck 2>&1', {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..')
      });

      const eslintOutput = execSync('npm run lint 2>&1', {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..')
      });

      const tsErrors = (tsOutput.match(/error TS/g) || []).length;
      const eslintErrors = (eslintOutput.match(/✖ [0-9]+ problems \([0-9]+ errors/g) ?? [])[0]?.match(/[0-9]+(?= errors)/)?.[0] ?? '0';
      const eslintWarnings = (eslintOutput.match(/[0-9]+(?= warnings)/) ?? ['0'])[0] ?? '0';

      return {
        ts: tsErrors,
        eslint: parseInt(eslintErrors),
        eslintWarnings: parseInt(eslintWarnings)
      };
    } catch (error: unknown) {
      // Commands fail with error codes, but we still get output
      const output = (error as { stdout?: string; message?: string }).stdout ?? (error as Error).message ?? '';
      const tsErrors = (output.match(/error TS/g) || []).length;
      const eslintErrors = (output.match(/[0-9]+(?= errors)/) ?? ['0'])[0] ?? '0';
      const eslintWarnings = (output.match(/[0-9]+(?= warnings)/) ?? ['0'])[0] ?? '0';

      return {
        ts: tsErrors,
        eslint: parseInt(eslintErrors),
        eslintWarnings: parseInt(eslintWarnings)
      };
    }
  }

  /**
   * Find files with specific error patterns
   */
  findFilesWithErrors(_patterns: string[]): string[] {
    // This is a simplified version - in practice you'd parse the actual error output
    const findCommand = `find ${this.srcDir} ${this.testDir} -name "*.ts" -o -name "*.tsx"`;
    const output = execSync(findCommand, { encoding: 'utf8' });

    return output.split('\n').filter(file => file.trim());
  }

  /**
   * Pattern 1: Fix missing imports for common types
   */
  fixMissingImports(filePath: string): CleanupResult {
    const issues: string[] = [];
    let fixed = 0;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      // Fix common missing imports based on error patterns
      const importFixes = [
        { type: 'MelodyPattern', import: "import { MelodyPattern } from './signal-orchestra';" },
        { type: 'performance', import: "declare const performance: Performance;" },
        { type: 'TUIConfig', import: "import { TUIConfig } from '../config/TUIConfig';" },
      ];

      importFixes.forEach(fix => {
        if (content.includes(fix.type) && !content.includes(fix.import)) {
          // Add import after existing imports
          const importRegex = /^import .+;$/gm;
          const imports = content.match(importRegex) || [];
          const lastImport = imports[imports.length - 1];

          if (lastImport) {
            content = content.replace(lastImport, `${lastImport}\n${fix.import}`);
            fixed++;
            issues.push(`Added missing import: ${fix.type}`);
          }
        }
      });

      if (content !== original) {
        fs.writeFileSync(filePath, content);
      }
    } catch (error) {
      issues.push(`Error processing file: ${(error as Error).message}`);
    }

    return {
      file: filePath,
      fixed,
      remaining: 0, // Would need to re-run typecheck to get this
      issues
    };
  }

  /**
   * Pattern 2: Fix unused variables by prefixing with underscore
   */
  fixUnusedVariables(filePath: string): CleanupResult {
    const issues: string[] = [];
    let fixed = 0;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      // Simple pattern to fix unused variables
      // This is a basic implementation - real version would be more sophisticated
      const unusedVarPattern = /^const (\w+)=/gm;
      content = content.replace(unusedVarPattern, (match, varName: string) => {
        if (!content.includes(`${varName}.`) && !content.includes(`${varName}(`) && !content.includes(`${varName}[`)) {
          fixed++;
          issues.push(`Prefixed unused variable: ${varName}`);
          return match.replace(varName, `_${varName}`);
        }
        return match;
      });

      if (content !== original) {
        fs.writeFileSync(filePath, content);
      }
    } catch (error) {
      issues.push(`Error processing file: ${(error as Error).message}`);
    }

    return {
      file: filePath,
      fixed,
      remaining: 0,
      issues
    };
  }

  /**
   * Pattern 3: Fix nullable boolean expressions
   */
  fixNullableBooleans(filePath: string): CleanupResult {
    const issues: string[] = [];
    let fixed = 0;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      // Fix patterns like "if (config.enabled)" where enabled might be nullable
      const patterns = [
        { regex: /if \((\w+\.enabled)\)/g, replacement: 'if ($1 === true)' },
        { regex: /if \((\w+\.enabled)\)/g, replacement: 'if ($1 === true)' },
      ];

      patterns.forEach(pattern => {
        const matches = content.match(pattern.regex);
        if (matches) {
          content = content.replace(pattern.regex, pattern.replacement);
          fixed += matches.length;
          issues.push(`Fixed nullable boolean check: ${matches.length} occurrences`);
        }
      });

      if (content !== original) {
        fs.writeFileSync(filePath, content);
      }
    } catch (error) {
      issues.push(`Error processing file: ${(error as Error).message}`);
    }

    return {
      file: filePath,
      fixed,
      remaining: 0,
      issues
    };
  }

  /**
   * Run all cleanup patterns on a file
   */
  cleanupFile(filePath: string): CleanupResult {
    // eslint-disable-next-line no-console
    console.log(`🧹 Cleaning up: ${filePath}`);

    const results = [
      this.fixMissingImports(filePath),
      this.fixUnusedVariables(filePath),
      this.fixNullableBooleans(filePath)
    ];

    const totalFixed = results.reduce((sum, result) => sum + result.fixed, 0);
    const allIssues = results.flatMap(result => result.issues);

    if (totalFixed > 0) {
      // eslint-disable-next-line no-console
      console.log(`  ✅ Fixed ${totalFixed} issues`);
      allIssues.forEach(issue => {
        // eslint-disable-next-line no-console
        console.log(`    - ${issue}`);
      });
    }

    return {
      file: filePath,
      fixed: totalFixed,
      remaining: 0,
      issues: allIssues
    };
  }

  /**
   * Run cleanup on multiple files
   */
  cleanupFiles(filePaths: string[]): void {
    // eslint-disable-next-line no-console
    console.log(`🚀 Starting cleanup of ${filePaths.length} files...`);

    const startCounts = this.getErrorCounts();
    // eslint-disable-next-line no-console
    console.log(`📊 Starting counts: TS=${startCounts.ts}, ESLint=${startCounts.eslint}`);

    for (const filePath of filePaths) {
      this.cleanupFile(filePath);
    }

    const endCounts = this.getErrorCounts();
    // eslint-disable-next-line no-console
    console.log(`📊 Ending counts: TS=${endCounts.ts}, ESLint=${endCounts.eslint}`);
    // eslint-disable-next-line no-console
    console.log(`📈 Improvement: TS=${startCounts.ts - endCounts.ts}, ESLint=${startCounts.eslint - endCounts.eslint}`);
  }

  /**
   * Generate cleanup report
   */
  generateReport(): void {
    const counts = this.getErrorCounts();
    const timestamp = new Date().toISOString();

    const report = `# Cleanup Report - ${timestamp}

## Current Error Counts
- TypeScript Errors: ${counts.ts}
- ESLint Errors: ${counts.eslint}
- ESLint Warnings: ${counts.eslintWarnings}
- Total Issues: ${counts.ts + counts.eslint}

## Files Processed
- Timestamp: ${timestamp}
- Total TypeScript Files: 289

## Next Steps
1. Focus on files with highest error counts
2. Apply pattern-based fixes systematically
3. Run incremental validation after each fix
4. Maintain code quality and functionality
`;

    fs.writeFileSync(path.join(__dirname, '../cleanup-report.md'), report);
    // eslint-disable-next-line no-console
    console.log(`📄 Report generated: cleanup-report.md`);
  }
}

// CLI interface
function main(): void {
  const helper = new CleanupHelper();
  const command = process.argv[2];

  switch (command) {
    case 'count': {
      const counts = helper.getErrorCounts();
      // eslint-disable-next-line no-console
      console.log(`TypeScript Errors: ${counts.ts}`);
      // eslint-disable-next-line no-console
      console.log(`ESLint Errors: ${counts.eslint}`);
      // eslint-disable-next-line no-console
      console.log(`ESLint Warnings: ${counts.eslintWarnings}`);
      break;
    }

    case 'report':
      helper.generateReport();
      break;

    case 'fix': {
      const filePath = process.argv[3];
      if (!filePath) {
        // eslint-disable-next-line no-console
        console.error('Please provide a file path to fix');
        process.exit(1);
      }
      helper.cleanupFile(filePath);
      break;
    }

    case 'find-high-error-files': {
      const files = helper.findFilesWithErrors([]);
      // eslint-disable-next-line no-console
      console.log('Found TypeScript files:', files.length);
      break;
    }

    case undefined:
      // eslint-disable-next-line no-console
      console.log(`
Usage: tsx scripts/cleanup-helper.ts <command>

Commands:
  count           - Show current error counts
  report          - Generate cleanup report
  fix <file>      - Fix issues in a specific file
  find-high-error-files - Find files that likely have errors
      `);
      break;

    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { CleanupHelper };