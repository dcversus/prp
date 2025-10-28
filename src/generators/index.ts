/**
 * Project generators
 */

import { GeneratorContext, FileToGenerate, TemplateData } from '../types.js';
import { fileGenerator } from '../utils/index.js';
import {
  generateLicense,
  generateReadme,
  generateGitignore,
  generateChangelog,
  generateEditorConfig,
  generateContributing,
  generateCodeOfConduct,
  generateSecurityPolicy,
} from './common.js';

export async function generateProject(context: GeneratorContext): Promise<void> {
  const files: FileToGenerate[] = [];

  // Generate common files
  const commonFiles = await generateCommonFiles(context);
  files.push(...commonFiles);

  // Generate template-specific files
  const templateFiles = await generateTemplateFiles(context);
  files.push(...templateFiles);

  // Write all files
  await fileGenerator.generateFiles(files, context.targetPath);
}

export async function generateCommonFiles(context: GeneratorContext): Promise<FileToGenerate[]> {
  const { options } = context;
  const files: FileToGenerate[] = [];

  // Convert ProjectOptions to TemplateData
  const data: TemplateData = {
    projectName: options.name,
    description: options.description,
    author: options.author,
    email: options.email,
    telegram: options.telegram,
    license: options.license,
    year: new Date().getFullYear(),
    template: options.template,
    hasCodeOfConduct: options.includeCodeOfConduct,
    hasContributing: options.includeContributing,
    hasCLA: options.includeCLA,
    hasSecurityPolicy: options.includeSecurityPolicy,
    hasIssueTemplates: options.includeIssueTemplates,
    hasPRTemplate: options.includePRTemplate,
    hasGitHubActions: options.includeGitHubActions,
    hasEditorConfig: options.includeEditorConfig,
    hasESLint: options.includeESLint,
    hasPrettier: options.includePrettier,
    hasDocker: options.includeDocker,
  };

  // Always generate these files
  files.push(generateLicense(data));
  files.push(generateReadme(data));
  files.push(generateGitignore(data));
  files.push(generateChangelog(data));

  // Optional files
  if (options.includeEditorConfig) {
    files.push(generateEditorConfig());
  }

  if (options.includeContributing) {
    files.push(generateContributing(data));
  }

  if (options.includeCodeOfConduct) {
    files.push(generateCodeOfConduct(data));
  }

  if (options.includeSecurityPolicy) {
    files.push(generateSecurityPolicy(data));
  }

  return files;
}

export async function generateTemplateFiles(context: GeneratorContext): Promise<FileToGenerate[]> {
  const { options } = context;

  switch (options.template) {
    case 'typescript-lib':
      return generateTypeScriptLib(context);
    case 'react':
      return generateReact(context);
    case 'fastapi':
      return generateFastAPI(context);
    case 'nestjs':
      return generateNestJS(context);
    case 'none':
      return [];
    default:
      console.warn(`Template "${options.template}" not yet implemented`);
      return [];
  }
}

// Template-specific generators (to be implemented)
async function generateTypeScriptLib(_context: GeneratorContext): Promise<FileToGenerate[]> {
  // TODO: Implement TypeScript library template
  return [];
}

async function generateReact(_context: GeneratorContext): Promise<FileToGenerate[]> {
  // TODO: Implement React app template
  return [];
}

async function generateFastAPI(_context: GeneratorContext): Promise<FileToGenerate[]> {
  // TODO: Implement FastAPI template
  return [];
}

async function generateNestJS(_context: GeneratorContext): Promise<FileToGenerate[]> {
  // TODO: Implement NestJS template
  return [];
}
