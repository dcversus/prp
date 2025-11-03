/**
 * ♫ Types for CLI Commands and Wizard
 */

export interface WizardConfig {
  templates: TemplateConfig;
  agents: AgentConfigConfig;
  showTips: boolean;
  ciMode: boolean;
  verbose: boolean;
}

export interface TemplateConfig {
  registry: string;
  cacheDir: string;
  defaultTemplate: string;
}

export interface AgentConfigConfig {
  registry: string;
  default: string[];
  configurations: Record<string, AgentConfig>;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'cli' | 'landing-page';
  features: string[];
  files: TemplateFile[];
  dependencies: TemplateDependencies;
  scripts: TemplateScripts;
  gitignore: string[];
  postSetup: TemplatePostSetup[];
}

export interface TemplateFile {
  path: string;
  content: string;
  encoding?: 'utf8' | 'binary';
  executable?: boolean;
}

export interface TemplateDependencies {
  production: Record<string, string>;
  development: Record<string, string>;
  peer?: Record<string, string>;
  optional?: Record<string, string>;
}

export interface TemplateScripts {
  [key: string]: string;
}

export interface TemplatePostSetup {
  type: 'command' | 'file' | 'git' | 'npm';
  action: string;
  description?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  enabledByDefault: boolean;
  availableModels: string[];
  defaultModel: string;
  defaultMaxTokens: number;
  capabilities: string[];
  configuration: Record<string, unknown>;
}

export interface PRPTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: PRPSection[];
  variables: PRPVariable[];
}

export interface PRPSection {
  id: string;
  title: string;
  required: boolean;
  template: string;
  variables: string[];
}

export interface PRPVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: string | number | boolean | unknown[] | Record<string, unknown>;
  description?: string;
  validation?: PRPValidation;
}

export interface PRPValidation {
  pattern?: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface WizardOptions {
  projectName?: string;
  template?: string;
  prp?: string;
  default?: boolean;
  skipAuth?: boolean;
  ciMode?: boolean;
  verbose?: boolean;
  agents?: string[];
  agentConfigs?: Record<string, unknown>;
  gitInit?: boolean;
  npmInstall?: boolean;
  firstCommit?: boolean;
  githubRepo?: boolean;
  setupCI?: boolean;
}

export interface DeploymentConfig {
  type: 'gh-pages' | 'vercel' | 'netlify' | 'custom';
  domain?: string;
  buildCommand?: string;
  outputDir?: string;
  environment?: Record<string, string>;
}

export interface LandingPageConfig {
  title: string;
  description: string;
  theme: 'default' | 'dark' | 'colorful' | 'minimal';
  animations: boolean;
  dancingMonkeys: boolean;
  sections: LandingPageSection[];
}

export interface LandingPageSection {
  type: 'hero' | 'features' | 'showcase' | 'testimonials' | 'contact';
  title: string;
  content: string;
  order: number;
}

export interface CIConfig {
  platform: 'github' | 'gitlab' | 'bitbucket';
  workflows: CIWorkflow[];
  secrets: CISecret[];
}

export interface CIWorkflow {
  name: string;
  trigger: string[];
  steps: CIStep[];
}

export interface CIStep {
  name: string;
  action: string;
  condition?: string;
}

export interface CISecret {
  name: string;
  description: string;
  required: boolean;
}