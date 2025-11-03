/**
 * Core type definitions for PRP CLI
 */

// Basic types
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';
export type BuildMode = 'development' | 'production';
export type TestType = 'unit' | 'integration' | 'e2e' | 'all';
export type OutputFormat = 'console' | 'json' | 'yaml' | 'html';

// Configuration interfaces
export interface PRPConfig {
  name: string;
  version: string;
  description?: string;
  type?: string;
  author?: string;
  license?: string;
  repository?: string;
  keywords?: string[];
  settings: SettingsConfig;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface SettingsConfig {
  debug?: DebugSettings;
  quality?: QualitySettings;
  build?: BuildSettings;
  test?: TestSettings;
  ci?: CISettings;
  development?: DevelopmentSettings;
  packageManager?: PackageManagerSettings;
  debugging?: DebuggingSettings;
  tokenAccounting?: TokenAccountingSettings;
}

export interface DebugSettings {
  enabled: boolean;
  level: LogLevel;
  output: 'console' | 'file' | 'json';
  file?: string;
  maxFileSize?: string;
  maxFiles?: number;
  timestamp?: boolean;
  colors?: boolean;
  orchestrator?: OrchestratorSettings;
  components?: ComponentDebugSettings;
}

export interface OrchestratorSettings {
  enabled: boolean;
  url?: string;
  apiKey?: string;
  timeout?: number;
}

export interface ComponentDebugSettings {
  cli: boolean;
  build: boolean;
  test: boolean;
  lint: boolean;
  deploy: boolean;
}

export interface QualitySettings {
  enabled: boolean;
  strict?: boolean;
  gates: QualityGates;
  reporting?: ReportingSettings;
  preCommitHooks?: boolean;
  prePushHooks?: boolean;
}

export interface QualityGates {
  lint: LintGate;
  test: TestGate;
  security: SecurityGate;
  performance?: PerformanceGate;
  complexity?: ComplexityGate;
  duplication?: DuplicationGate;
}

export interface LintGate {
  enabled: boolean;
  tools: string[];
  failOnWarnings?: boolean;
  maxWarnings?: number;
  configFile?: string;
  rules?: Record<string, any>;
}

export interface TestGate {
  enabled: boolean;
  coverage: CoverageSettings;
  failures: FailureSettings;
  timeout?: number;
}

export interface CoverageSettings {
  enabled: boolean;
  minimum: number;
  threshold?: number;
  reporters?: string[];
  outputDirectory?: string;
}

export interface FailureSettings {
  maximum: number;
  retry?: number;
}

export interface SecurityGate {
  enabled: boolean;
  tools: string[];
  failOnHigh: boolean;
  failOnMedium?: boolean;
  failOnLow?: boolean;
  excludeDevDependencies?: boolean;
}

export interface PerformanceGate {
  enabled: boolean;
  budget?: PerformanceBudget;
  lighthouse?: LighthouseSettings;
}

export interface PerformanceBudget {
  size?: string;
  loadTime?: string;
  firstContentfulPaint?: string;
}

export interface LighthouseSettings {
  enabled: boolean;
  scores: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
}

export interface ComplexityGate {
  enabled: boolean;
  maxComplexity?: number;
  tools?: string[];
}

export interface DuplicationGate {
  enabled: boolean;
  threshold?: number;
  tools?: string[];
}

export interface ReportingSettings {
  formats: OutputFormat[];
  outputDirectory?: string;
  artifacts?: boolean;
  notifications?: NotificationSettings;
}

export interface NotificationSettings {
  onFailure: boolean;
  onThreshold?: boolean;
}

export interface BuildSettings {
  mode: BuildMode;
  target?: string;
  output?: string;
  clean?: boolean;
  sourcemap?: boolean;
  minify?: boolean;
  compression?: boolean;
  analyze?: boolean;
  incremental?: boolean;
  parallel?: boolean;
  cache?: CacheSettings;
  optimization?: OptimizationSettings;
  environment?: EnvironmentSettings;
  assets?: AssetSettings;
  externals?: Record<string, string>;
}

export interface CacheSettings {
  enabled: boolean;
  directory?: string;
  strategy?: 'content' | 'mtime';
}

export interface OptimizationSettings {
  splitting?: boolean;
  treeShaking?: boolean;
  deadCodeElimination?: boolean;
}

export interface EnvironmentSettings {
  variables?: Record<string, string>;
  files?: string[];
}

export interface AssetSettings {
  inline?: boolean;
  limit?: string;
  publicPath?: string;
}

export interface TestSettings {
  type: TestType;
  framework: string;
  coverage?: boolean;
  watch?: boolean;
  parallel?: boolean;
  maxWorkers?: string | number;
  reporters?: string[];
  testEnvironment?: string;
  testMatch?: string[];
  collectCoverageFrom?: string[];
  coverageThreshold?: CoverageThreshold;
  setupFiles?: string[];
  snapshotSerializers?: string[];
  timeout?: number;
  bail?: boolean;
}

export interface CoverageThreshold {
  global?: {
    branches?: number;
    functions?: number;
    lines?: number;
    statements?: number;
  };
}

export interface CISettings {
  provider: CIProvider;
  enabled: boolean;
  workflows: Record<string, WorkflowConfig>;
  cache?: CacheSettings;
  secrets?: SecretSettings;
  notifications?: NotificationSettings;
  artifacts?: ArtifactSettings;
}

export type CIProvider = 'github' | 'gitlab' | 'circleci' | 'jenkins' | 'azure-devops';

export interface WorkflowConfig {
  enabled: boolean;
  triggers: string[];
  branches?: string[];
  nodeVersions?: number[];
  os?: string[];
  cache?: boolean;
  artifacts?: boolean;
  dependsOn?: string[];
  environment?: Record<string, string>;
}

export interface SecretSettings {
  required: string[];
  optional: string[];
}

export interface ArtifactSettings {
  retention?: number;
  compression?: boolean;
  name?: string;
}

export interface DevelopmentSettings {
  hotReload?: boolean;
  port?: number;
  host?: string;
  proxy?: Record<string, ProxyConfig>;
  https?: boolean;
  open?: boolean;
  browser?: string;
  devServer?: DevServerSettings;
  environment?: EnvironmentSettings;
}

export interface ProxyConfig {
  target: string;
  changeOrigin?: boolean;
  secure?: boolean;
  pathRewrite?: Record<string, string>;
}

export interface DevServerSettings {
  compress?: boolean;
  historyApiFallback?: boolean;
  overlay?: OverlaySettings;
}

export interface OverlaySettings {
  errors?: boolean;
  warnings?: boolean;
}

export interface PackageManagerSettings {
  type: PackageManager;
  version?: string;
  registry?: string;
  cache?: boolean;
  audit?: boolean;
  lockFile?: boolean;
  scripts?: PackageManagerScripts;
  engines?: PackageEngines;
  workspaces?: WorkspaceSettings;
}

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface PackageManagerScripts {
  autoInstall?: boolean;
  updateCheck?: boolean;
  outdated?: boolean;
}

export interface PackageEngines {
  node?: string;
  npm?: string;
  yarn?: string;
  pnpm?: string;
}

export interface WorkspaceSettings {
  enabled?: boolean;
  packages?: string[];
}

export interface DebuggingSettings {
  node?: NodeDebugSettings;
  python?: PythonDebugSettings;
  browser?: BrowserDebugSettings;
}

export interface NodeDebugSettings {
  enabled: boolean;
  port?: number;
  host?: string;
  break?: boolean;
  inspect?: boolean;
  restart?: boolean;
  console?: boolean;
  sourceMaps?: boolean;
  timeout?: number;
}

export interface PythonDebugSettings {
  enabled: boolean;
  port?: number;
  host?: string;
  wait?: boolean;
  break?: boolean;
  console?: boolean;
  venv?: boolean;
  timeout?: number;
}

export interface BrowserDebugSettings {
  enabled: boolean;
  port?: number;
  headless?: boolean;
  devtools?: boolean;
  slowMo?: number;
  timeout?: number;
}

export interface TokenAccountingSettings {
  enabled: boolean;
  provider: string;
  tracking: TrackingSettings;
  pricing: PricingSettings;
  limits: LimitSettings;
  reporting: TokenReportingSettings;
  alerts: AlertSettings;
}

export interface TrackingSettings {
  inputTokens: boolean;
  outputTokens: boolean;
  totalTokens: boolean;
  cost: boolean;
}

export interface PricingSettings {
  input: number;
  output: number;
  currency: string;
}

export interface LimitSettings {
  daily?: number;
  monthly?: number;
  budget?: number;
}

export interface TokenReportingSettings {
  frequency: string;
  format: OutputFormat;
  export?: boolean;
}

export interface AlertSettings {
  threshold?: number;
  notifications?: boolean;
}

// Result types
export interface CommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  data?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface StatusResult {
  project: ProjectStatus;
  system: SystemStatus;
  quality: QualityStatus;
  ci: CIStatus;
}

export interface ProjectStatus {
  name: string;
  version: string;
  type: string;
  configured: boolean;
  healthy: boolean;
  issues: string[];
}

export interface SystemStatus {
  nodeVersion: string;
  platform: string;
  architecture: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
  };
  tools: Record<string, ToolStatus>;
}

export interface ToolStatus {
  installed: boolean;
  version?: string;
  path?: string;
}

export interface QualityStatus {
  enabled: boolean;
  gates: Record<string, GateStatus>;
  score: number;
  lastRun?: Date;
  issues: number;
}

export interface GateStatus {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  score?: number;
  lastRun?: Date;
}

export interface CIStatus {
  enabled: boolean;
  provider: string;
  workflows: Record<string, WorkflowStatus>;
  lastRun?: Date;
  status: 'success' | 'failure' | 'pending' | 'unknown';
}

export interface WorkflowStatus {
  name: string;
  enabled: boolean;
  status: 'success' | 'failure' | 'pending' | 'unknown';
  lastRun?: Date;
  duration?: number;
}

// Event types
export type CLIEvent =
  | 'cli:start'
  | 'cli:command:start'
  | 'cli:command:success'
  | 'cli:command:error'
  | 'cli:config:loaded'
  | 'cli:config:validated'
  | 'cli:shutdown';

export type BuildEvent =
  | 'build:start'
  | 'build:progress'
  | 'build:success'
  | 'build:error'
  | 'build:complete';

export type TestEvent =
  | 'test:start'
  | 'test:suite:start'
  | 'test:suite:end'
  | 'test:pass'
  | 'test:fail'
  | 'test:complete';

export type QualityEvent =
  | 'quality:start'
  | 'quality:gate:start'
  | 'quality:gate:pass'
  | 'quality:gate:fail'
  | 'quality:complete';

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;