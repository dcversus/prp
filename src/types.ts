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
export interface ValidationResultBase {
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

// Generic types for prompt validation and transformation
export type PromptValidationFunction<T = string> = (input: T) => boolean | string;
export type PromptFilterFunction<T = string> = (input: T) => T;
export type PromptConditionFunction = (answers: Record<string, unknown>) => boolean;
export type PromptTransformerFunction<T = string> = (input: T, answers: Record<string, unknown>, flags: Record<string, unknown>) => string;

export interface PromptConfig {
  name: string;
  type: PromptType;
  message: string;
  description?: string;
  default?: unknown;
  choices?: PromptChoice[] | (() => PromptChoice[]);
  validate?: PromptValidationFunction;
  filter?: PromptFilterFunction;
  when?: PromptConditionFunction;
  transformer?: PromptTransformerFunction;
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
  value: string | number | boolean;
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
  userAnswers: Record<string, unknown>;
  templateConfig: TemplateConfig;
  targetPath: string;
  startTime: number;
  progress: ProgressTracker;
}

export interface HookResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
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
  defaults?: Record<string, unknown>;
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
  features: Record<string, unknown>;
  configuration: Record<string, unknown>;
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
  data?: Record<string, unknown>;
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

// Type definitions for ESLint/Prettier configurations
export type ESLintConfig = Record<string, unknown>;
export type ESLintRule = Record<string, unknown>;
export type PrettierConfig = Record<string, unknown>;
export type TypeScriptConfig = Record<string, unknown>;

export interface CodeQualityConfig {
  eslint?: {
    enabled: boolean;
    config?: ESLintConfig;
    rules?: Record<string, ESLintRule>;
  };
  prettier?: {
    enabled: boolean;
    config?: PrettierConfig;
  };
  typescript?: {
    enabled: boolean;
    strict?: boolean;
    config?: TypeScriptConfig;
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

// Signal System Types for PRP-007 Integration

// Signal Type Enum for type safety
export enum SignalTypeEnum {
  AGENT = 'agent',
  SYSTEM = 'system',
  SCANNER = 'scanner',
  INSPECTOR = 'inspector',
  ORCHESTRATOR = 'orchestrator'
}

export type SignalType = SignalTypeEnum;

// Signal Source Enum for all agent types
export enum SignalSourceEnum {
  ROBO_SYSTEM_ANALYST = 'robo-system-analyst',
  ROBO_DEVELOPER = 'robo-developer',
  ROBO_AQA = 'robo-aqa',
  ROBO_QUALITY_CONTROL = 'robo-quality-control',
  ROBO_UX_UI_DESIGNER = 'robo-ux-ui-designer',
  ROBO_DEVOPS_SRE = 'robo-devops-sre',
  ORCHESTRATOR = 'orchestrator',
  SYSTEM = 'system',
  SCANNER = 'scanner'
}

export type SignalSource = SignalSourceEnum;

// Signal Priority Enum
export enum SignalPriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export type SignalPriority = SignalPriorityEnum;

// Signal Code Enum - All signals from AGENTS.md
export enum SignalCodeEnum {
  // Critical Priority (9-10)
  SYSTEM_FATAL_ERROR = 'FF',
  BLOCKER = 'bb',
  GOAL_NOT_ACHIEVABLE = 'ff',
  JESUS_CHRIST = 'JC',

  // High Priority (7-8)
  FEEDBACK_REQUEST = 'af',
  NOT_OBVIOUS = 'no',
  INCIDENT = 'ic',
  ESCALATION_REQUIRED = 'er',
  ORCHESTRATOR_ATTENTION = 'oa',

  // Medium-High Priority (5-6)
  TESTS_RED = 'tr',
  CI_FAILED = 'cf',
  RESEARCH_REQUEST = 'rr',
  ADMIN_ATTENTION = 'aa',
  FILE_OWNERSHIP_CONFLICT = 'fo',
  DESIGN_ISSUE_IDENTIFIED = 'di',

  // Medium Priority (3-4)
  GOAL_CLARIFICATION = 'gg',
  VALIDATION_REQUIRED = 'vr',
  VERIFICATION_PLAN = 'vp',
  IMPLEMENTATION_PLAN = 'ip',
  EXPERIMENT_REQUIRED = 'exp',
  TESTS_PREPARED = 'tp',
  BUG_FIXED = 'bf',
  CODE_QUALITY = 'cq',
  REVIEW_PROGRESS = 'rg',
  CLEANUP_DONE = 'cd',
  POST_RELEASE_STATUS = 'ps',
  ADMIN_PREVIEW_READY = 'ap',
  DESIGN_REVIEW_REQUESTED = 'dr',
  PERFORMANCE_TESTING_DESIGN = 'pt',

  // Medium-Low Priority (2-3)
  DONE_ASSESSMENT = 'da',
  READY_FOR_PREPARATION = 'rp',
  DEVELOPMENT_PROGRESS = 'dp',
  BLOCKER_RESOLVED = 'br',
  RESEARCH_COMPLETE = 'rc',
  TESTS_WRITTEN = 'tw',
  CI_PASSED = 'cp',
  TESTS_GREEN = 'tg',
  PRE_RELEASE_COMPLETE = 'pc',
  REVIEW_PASSED = 'rv',
  IMPLEMENTATION_VERIFIED = 'iv',
  RELEASE_APPROVED = 'ra',
  MERGED = 'mg',
  RELEASED = 'rl',
  POST_MORTEM = 'pm',
  CLEANUP_COMPLETE = 'cc',

  // Design Signals
  DESIGN_UPDATE = 'du',
  DESIGN_SYSTEM_UPDATED = 'ds',
  DESIGN_HANDOFF_READY = 'dh',
  DESIGN_ASSETS_DELIVERED = 'da_delivered',
  DESIGN_CHANGE_IMPLEMENTED = 'dc',
  DESIGN_FEEDBACK_RECEIVED = 'df',
  DESIGN_TESTING_COMPLETE = 'dt',
  DESIGN_PROTOTYPE_READY = 'dp_proto',

  // DevOps Signals
  INFRASTRUCTURE_DEPLOYED = 'id',
  CI_CD_PIPELINE_UPDATED = 'cd_pipeline',
  MONITORING_ONLINE = 'mo',
  INCIDENT_RESOLVED = 'ir',
  SYSTEM_OPTIMIZED = 'so',
  SECURITY_CHECK_COMPLETE = 'sc',
  PERFORMANCE_BASELINE_SET = 'pb',
  DISASTER_RECOVERY_TESTED = 'dr_tested',
  CAPACITY_UPDATED = 'cu',
  AUTOMATION_CONFIGURED = 'ac',
  SLO_SLI_UPDATED = 'sl',
  ERROR_BUDGET_STATUS = 'eb',
  INCIDENT_PREVENTION = 'ip_prevention',
  RELIABILITY_CHECK_COMPLETE = 'rc_check',
  RECOVERY_TIME_MEASURED = 'rt',
  ALERT_OPTIMIZED = 'ao',
  POST_MORTEM_STARTED = 'ps_started',
  TROUBLESHOOTING_SESSION = 'ts',

  // Coordination Signals
  PARALLEL_COORDINATION_NEEDED = 'pc_coord',
  COMPONENT_COORDINATION = 'cc_coord',
  ASSET_SYNC_REQUIRED = 'as',
  PARALLEL_ENVIRONMENT_READY = 'pe',
  FEATURE_FLAG_SERVICE_UPDATED = 'fs',
  DATABASE_SCHEMA_SYNC = 'ds_sync',
  ROLLBACK_PREPARED = 'rb'
}

export type SignalCode = SignalCodeEnum;

export interface SignalEvent {
  id: string;
  type: SignalType;
  signal: SignalCode; // e.g., '[dp]', '[bb]', '[af]' - now using enum
  title: string;
  description: string;
  timestamp: Date;
  source: SignalSource;
  prpId?: string;
  agentId?: string;
  data?: Record<string, unknown>;
  priority: SignalPriority;
  state: 'active' | 'resolved' | 'pending' | 'failed';
  tags?: string[];
  metadata?: {
    fileName?: string;
    lineNumber?: number;
    context?: string;
    duration?: number;
    error?: Error;
  };
}

export interface SignalDisplay {
  signal: string;
  color: string;
  backgroundColor?: string;
  animation?: 'none' | 'flash' | 'pulse' | 'bounce' | 'wave';
  description: string;
  priority: SignalPriority;
  category: 'progress' | 'blocker' | 'feedback' | 'quality' | 'coordination' | 'system';
  role?: SignalSource;
}

export interface SignalFilter {
  types?: SignalType[];
  sources?: SignalSource[];
  priorities?: SignalPriority[];
  states?: SignalEvent['state'][];
  prpId?: string;
  agentId?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface SignalSubscription {
  id: string;
  filter?: SignalFilter;
  handler: (signal: SignalEvent) => void;
  createdAt: Date;
}

export interface SignalAggregation {
  total: number;
  byType: Record<SignalType, number>;
  bySource: Record<SignalSource, number>;
  byPriority: Record<SignalPriority, number>;
  byState: Record<SignalEvent['state'], number>;
  recent: SignalEvent[];
  critical: SignalEvent[];
}

export interface SignalHistoryOptions {
  maxEntries: number;
  sortBy: 'timestamp' | 'priority' | 'source';
  sortOrder: 'asc' | 'desc';
  groupBy?: 'type' | 'source' | 'prpId' | 'none';
  filter?: SignalFilter;
}

// Signal System Configuration
export interface SignalSystemConfig {
  enabled: boolean;
  historySize: number;
  refreshInterval: number; // milliseconds
  debounceDelay: number; // milliseconds
  animations: {
    enabled: boolean;
    speed: number; // milliseconds
    types: Record<string, string>;
  };
  filters: {
    default: SignalFilter;
    presets: Record<string, SignalFilter>;
  };
  notifications: {
    enabled: boolean;
    priorities: SignalPriority[];
    sound: boolean;
    visual: boolean;
  };
}

// EventBus Integration Types
export interface EventBusIntegration {
  subscribe: (eventType: string, handler: (event: SignalEvent) => void) => string;
  unsubscribe: (subscriptionId: string) => void;
  emit: (event: SignalEvent) => void;
  getRecentEvents: (count?: number) => SignalEvent[];
  getEventsByType: (type: string, count?: number) => SignalEvent[];
  clearHistory: () => void;
}

// Signal Hook Return Types
export interface UseSignalSubscriptionReturn {
  signals: SignalEvent[];
  loading: boolean;
  error: Error | null;
  subscribe: (filter?: SignalFilter) => string;
  unsubscribe: (subscriptionId: string) => void;
  clearSignals: () => void;
  refetch: () => Promise<void>;
  aggregation: SignalAggregation;
}

export interface UseSignalDisplayReturn {
  getSignalDisplay: (signal: string) => SignalDisplay | null;
  getAllSignals: () => SignalDisplay[];
  getSignalsByCategory: (category: SignalDisplay['category']) => SignalDisplay[];
  getSignalsByPriority: (priority: SignalPriority) => SignalDisplay[];
  searchSignals: (query: string) => SignalDisplay[];
}

// Performance Monitoring Types
export interface SignalPerformanceMetrics {
  totalSignals: number;
  signalsPerSecond: number;
  averageProcessingTime: number; // milliseconds
  memoryUsage: number; // bytes
  cacheHitRate: number; // percentage
  errorRate: number; // percentage
  lastUpdate: Date;
}
