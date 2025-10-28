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
  | 'express';

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
