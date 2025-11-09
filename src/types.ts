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
  data?: Record<string, unknown>;
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
  data?: Record<string, unknown>;
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
    rules: Record<string, unknown>;
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
    rules: Record<string, unknown>;
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

// Interactive Template System Types

export interface TemplateConfig {
  name: string;
  displayName: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  featured?: boolean;
  dependencies: TemplateDependencies;
  prompts?: PromptConfig[];
  hooks?: GenerationHook[];
  estimatedTime?: number; // in seconds
}

export type TemplateCategory =
  | 'frontend'
  | 'backend'
  | 'full-stack'
  | 'mobile'
  | 'desktop'
  | 'cli'
  | 'library'
  | 'ml/ai'
  | 'devops'
  | 'static';

export interface TemplateDependencies {
  required: Record<string, string>;
  optional: Record<string, string>;
  dev: Record<string, string>;
  peer?: Record<string, string>;
}

export interface PromptConfig {
  name: string;
  type: PromptType;
  message: string;
  description?: string;
  default?: any;
  choices?: PromptChoice[] | (() => PromptChoice[]);
  validate?: (input: any) => boolean | string;
  filter?: (input: any) => any;
  when?: (answers: Record<string, any>) => boolean;
  transformer?: (input: any, answers: Record<string, any>, flags: any) => string;
}

export type PromptType =
  | 'input'
  | 'confirm'
  | 'list'
  | 'rawlist'
  | 'expand'
  | 'checkbox'
  | 'password'
  | 'editor'
  | 'number';

export interface PromptChoice {
  name: string;
  value: any;
  short?: string;
  description?: string;
  disabled?: boolean | string;
  checked?: boolean;
}

export interface GenerationHook {
  name: string;
  type: HookType;
  priority: number;
  description?: string;
  execute: (context: HookContext) => Promise<HookResult>;
}

export type HookType = 'pre' | 'generation' | 'post';

export interface HookContext {
  generatorOptions: GeneratorContext;
  userAnswers: Record<string, any>;
  templateConfig: TemplateConfig;
  targetPath: string;
  startTime: number;
  progress: ProgressTracker;
}

export interface HookResult {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  warnings?: string[];
  errors?: string[];
}

export interface ProgressTracker {
  current: number;
  total: number;
  step: string;
  startTime: number;
  update: (step: string, increment?: number) => void;
  getProgress: () => { percent: number; elapsed: number; eta: number };
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface TemplateRegistry {
  templates: Map<string, TemplateConfig>;
  categories: Map<TemplateCategory, TemplateConfig[]>;
  featured: TemplateConfig[];
  search: (query: string, filters?: SearchFilters) => TemplateConfig[];
  getByCategory: (category: TemplateCategory) => TemplateConfig[];
  getFeatured: () => TemplateConfig[];
}

export interface SearchFilters {
  category?: TemplateCategory;
  tags?: string[];
  featured?: boolean;
  hasTypeScript?: boolean;
  hasTesting?: boolean;
  hasDocker?: boolean;
  hasCI?: boolean;
}

export interface InteractiveScaffoldingOptions {
  skipPrompts?: boolean;
  defaults?: Record<string, any>;
  template?: string;
  outputPath?: string;
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface UserAnswers {
  projectName: string;
  description: string;
  author: string;
  email: string;
  telegram?: string;
  template: string;
  license: LicenseType;
  features: Record<string, any>;
  configuration: Record<string, any>;
  postGeneration: {
    initGit: boolean;
    installDependencies: boolean;
    startDevServer?: boolean;
    openEditor?: boolean;
  };
}

export interface DependencyManager {
  resolveVersions: (dependencies: Record<string, string>) => Promise<Record<string, string>>;
  detectConflicts: (dependencies: Record<string, string>) => DependencyConflict[];
  getLatestVersion: (packageName: string) => Promise<string>;
  getVersionRange: (packageName: string, range: string) => Promise<string[]>;
  detectPackageManager: (projectPath: string) => PackageManagerType;
  installDependencies: (dependencies: Record<string, string>, packageManager?: PackageManagerType) => Promise<void>;
  getPackageInfo: (packageName: string) => Promise<PackageInfo>;
}

export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface DependencyConflict {
  package: string;
  type: 'version' | 'peer' | 'optional';
  current: string;
  required: string;
  severity: 'error' | 'warning' | 'info';
  resolution?: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  repository?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  deprecated?: boolean;
  maintainers?: Array<{ name: string; email?: string }>;
  lastModified?: string;
  downloadCount?: number;
}

export interface ScaffoldingSession {
  id: string;
  startTime: number;
  endTime?: number;
  template?: string;
  outputPath?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: ProgressTracker;
  answers: Partial<UserAnswers>;
  logs: ScaffoldingLog[];
}

export interface ScaffoldingLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}

export interface FeatureConfig {
  name: string;
  description: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  files?: FileToGenerate[];
  prompts?: PromptConfig[];
  hooks?: GenerationHook[];
  enabled: boolean;
}

export interface TemplateFeatures {
  typescript: FeatureConfig;
  testing: FeatureConfig;
  linting: FeatureConfig;
  formatting: FeatureConfig;
  docker: FeatureConfig;
  ci: FeatureConfig;
  authentication: FeatureConfig;
  database: FeatureConfig;
  stateManagement: FeatureConfig;
  routing: FeatureConfig;
  api: FeatureConfig;
  monitoring: FeatureConfig;
  deployment: FeatureConfig;
}

export interface CodeQualityConfig {
  eslint?: {
    enabled: boolean;
    config?: Record<string, any>;
    rules?: Record<string, any>;
  };
  prettier?: {
    enabled: boolean;
    config?: Record<string, any>;
  };
  typescript?: {
    enabled: boolean;
    strict?: boolean;
    config?: Record<string, any>;
  };
  testing?: {
    framework: 'jest' | 'vitest' | 'mocha' | 'jasmine';
    coverage: boolean;
    threshold?: number;
    e2e?: boolean;
  };
}

export interface ProjectStructure {
  src: string[];
  public?: string[];
  tests?: string[];
  docs?: string[];
  config: string[];
  scripts?: string[];
  build?: string[];
}

export interface GenerationMetrics {
  template: string;
  startTime: number;
  endTime: number;
  duration: number;
  filesGenerated: number;
  dependenciesInstalled: number;
  hooksExecuted: number;
  errors: string[];
  warnings: string[];
  userSatisfaction?: number; // 1-5 scale
}
