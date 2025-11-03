/**
 * Type definitions for PRP
 */

export interface ProjectOptions {
  name: string;
  description: string;
  author: string;
  email: string;
  telegram?: string;
  template: Template;
  license: LicenseType;
  includeCodeOfConduct: boolean;
  includeContributing: boolean;
  includeCLA: boolean;
  includeSecurityPolicy: boolean;
  includeIssueTemplates: boolean;
  includePRTemplate: boolean;
  includeGitHubActions: boolean;
  includeEditorConfig: boolean;
  includeESLint: boolean;
  includePrettier: boolean;
  includeDocker: boolean;
  initGit: boolean;
  installDependencies: boolean;
  useAI: boolean;
  aiProvider?: AIProvider;
}

export type Template =
  | 'none'
  | 'fastapi'
  | 'nestjs'
  | 'react'
  | 'typescript-lib'
  | 'vue'
  | 'svelte'
  | 'express'
  | 'wikijs';

export type LicenseType = 'MIT' | 'Apache-2.0' | 'GPL-3.0' | 'BSD-3-Clause' | 'ISC' | 'Unlicense';

export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface CLIOptions {
  name?: string;
  description?: string;
  author?: string;
  email?: string;
  template?: string;
  interactive?: boolean;
  yes?: boolean;
  license?: string;
  git?: boolean;
  install?: boolean;
}

export interface GeneratorContext {
  options: ProjectOptions;
  targetPath: string;
  templatePath: string;
}

export interface FileToGenerate {
  path: string;
  content: string;
  executable?: boolean;
}

export interface TemplateData {
  projectName: string;
  description: string;
  author: string;
  email: string;
  telegram?: string;
  license: LicenseType;
  year: number;
  template: Template;
  hasCodeOfConduct: boolean;
  hasContributing: boolean;
  hasCLA: boolean;
  hasSecurityPolicy: boolean;
  hasIssueTemplates: boolean;
  hasPRTemplate: boolean;
  hasGitHubActions: boolean;
  hasEditorConfig: boolean;
  hasESLint: boolean;
  hasPrettier: boolean;
  hasDocker: boolean;
}

export interface GeneratorOptions {
  templatePath: string;
  targetPath: string;
  data: TemplateData;
}

export interface TemplateEngine {
  render(template: string, data: TemplateData): string;
  renderFile(filePath: string, data: TemplateData): Promise<string>;
}

// Additional types for CLI and logging
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration?: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'verbose';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// CLI event interface
export interface CLIEvent {
  type: string;
  timestamp: Date;
  data?: any;
  source?: string;
}

// PRPConfig is imported from src/shared/config.ts to avoid duplication
export type PRPConfig = import('./shared/config.js').PRPConfig;

// Configuration settings interfaces
export interface DebugSettings {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  console: boolean;
  file: boolean;
  timestamp: boolean;
  colors: boolean;
  profiling: boolean;
}

export interface QualitySettings {
  linting: {
    enabled: boolean;
    rules: Record<string, any>;
    fixOnSave: boolean;
  };
  testing: {
    enabled: boolean;
    coverage: number;
    frameworks: string[];
  };
  security: {
    enabled: boolean;
    tools: string[];
    rules: Record<string, any>;
  };
  performance: {
    enabled: boolean;
    thresholds: Record<string, number>;
  };
}

export interface BuildSettings {
  tool: 'webpack' | 'vite' | 'rollup' | 'esbuild' | 'tsc';
  optimization: boolean;
  minification: boolean;
  sourceMap: boolean;
  target: string[];
  output: {
    directory: string;
    filename: string;
    format: string[];
  };
}

export interface TestSettings {
  framework: 'jest' | 'vitest' | 'mocha' | 'jasmine';
  coverage: {
    enabled: boolean;
    threshold: number;
    reporters: string[];
  };
  environment: string;
  setupFiles: string[];
  testMatch: string[];
}

export interface CISettings {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'azure';
  workflows: {
    build: boolean;
    test: boolean;
    deploy: boolean;
    security: boolean;
  };
  triggers: {
    onPush: boolean;
    onPR: boolean;
    onSchedule: boolean;
  };
  environment: Record<string, string>;
}

export interface DevelopmentSettings {
  watch: boolean;
  hotReload: boolean;
  port: number;
  host: string;
  proxy: Record<string, string>;
  server: string;
}

export interface PackageManagerSettings {
  manager: 'npm' | 'yarn' | 'pnpm';
  registry?: string;
  autoInstall: boolean;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// Settings config interface that contains all settings
export interface SettingsConfig {
  debug: DebugSettings;
  quality: QualitySettings;
  build: BuildSettings;
  test: TestSettings;
  ci: CISettings;
  development: DevelopmentSettings;
  packageManager: PackageManagerSettings;
}
