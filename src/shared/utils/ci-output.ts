/**
 * CI Output Formatter
 *
 * Provides JSON output for CI/CD environments and structured results
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

export interface CIResult {
  success: boolean;
  project: {
    name: string;
    path: string;
    type: string;
    description?: string;
  };
  files: {
    created: string[];
    updated: string[];
    generated?: {
      readme?: string;
      firstPrp?: string;
      agentsUserSection?: string;
    };
  };
  directories: string[];
  template?: {
    id: string;
    name: string;
  };
  llm?: {
    used: boolean;
    model?: string;
    requests: number;
    generated: string[];
  };
  metadata: {
    timestamp: string;
    duration: number;
    git: boolean;
    ci: boolean;
  };
  errors?: string[];
  warnings?: string[];
}

export class CIOutput {
  private startTime: number;
  private result: CIResult;

  constructor(projectName: string, projectPath: string) {
    this.startTime = Date.now();
    this.result = {
      success: false,
      project: {
        name: projectName,
        path: projectPath,
        type: 'unknown'
      },
      files: {
        created: [],
        updated: []
      },
      directories: [],
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0,
        git: false,
        ci: true
      }
    };
  }

  setProjectType(type: string): void {
    this.result.project.type = type;
  }

  setProjectDescription(description: string): void {
    this.result.project.description = description;
  }

  setTemplate(template: { id: string; name: string }): void {
    this.result.template = template;
  }

  addFileCreated(filePath: string): void {
    this.result.files.created.push(filePath);
  }

  addFileUpdated(filePath: string): void {
    this.result.files.updated.push(filePath);
  }

  addDirectory(dirPath: string): void {
    this.result.directories.push(dirPath);
  }

  setLLMGenerated(files: { readme?: string; firstPrp?: string; agentsUserSection?: string }, model: string = 'gpt-5'): void {
    this.result.llm = {
      used: true,
      model,
      requests: 3,
      generated: Object.values(files).filter(Boolean)
    };
    this.result.files.generated = files;
  }

  setGitInitialized(enabled: boolean): void {
    this.result.metadata.git = enabled;
  }

  addError(error: string): void {
    if (!this.result.errors) {
      this.result.errors = [];
    }
    this.result.errors.push(error);
  }

  addWarning(warning: string): void {
    if (!this.result.warnings) {
      this.result.warnings = [];
    }
    this.result.warnings.push(warning);
  }

  markSuccess(): void {
    this.result.success = true;
    this.result.metadata.duration = Date.now() - this.startTime;
  }

  markFailure(): void {
    this.result.success = false;
    this.result.metadata.duration = Date.now() - this.startTime;
  }

  toJSON(): string {
    return JSON.stringify(this.result, null, 2);
  }

  getResult(): CIResult {
    return this.result;
  }

  async writeToFile(projectPath: string): Promise<void> {
    const reportPath = join(projectPath, '.prp', 'init-report.json');
    await fs.writeFile(reportPath, this.toJSON());
  }
}

/**
 * Check if we're in CI mode and should output JSON
 */
export function shouldOutputJSON(options: { ci?: boolean; silent?: boolean }): boolean {
  return !!options.ci || !!options.silent;
}

/**
 * Output JSON result for CI environments
 */
export function outputCIResult(result: CIResult): void {
  logger.debug('CI Result:', JSON.stringify(result, null, 2));

  // Set exit code but don't exit immediately
  process.exitCode = result.success ? 0 : 1;
}