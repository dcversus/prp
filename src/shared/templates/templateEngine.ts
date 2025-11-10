/**
 * Template engine using Handlebars
 */

import * as Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import { TemplateData, TemplateEngine } from './types';

// Register Handlebars helpers
Handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());
Handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());
Handlebars.registerHelper('kebabCase', (str: string) =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
);
Handlebars.registerHelper('snakeCase', (str: string) =>
  str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
);
Handlebars.registerHelper('pascalCase', (str: string) =>
  str.replace(/(^|-)([a-z])/g, (_: string, __: string, c: string) => c.toUpperCase())
);
Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

class HandlebarsTemplateEngine implements TemplateEngine {
  render(template: string, data: TemplateData): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }

  async renderFile(filePath: string, data: TemplateData): Promise<string> {
    const template = await fs.readFile(filePath, 'utf-8');
    return this.render(template, data);
  }
}

export const templateEngine = new HandlebarsTemplateEngine();

export function createTemplateData(options: {
  name: string;
  description: string;
  author: string;
  email: string;
  telegram?: string;
  license: string;
  template: string;
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
}): TemplateData {
  return {
    projectName: options.name,
    description: options.description,
    author: options.author,
    email: options.email,
    telegram: options.telegram,
    license: options.license as TemplateData['license'],
    year: new Date().getFullYear(),
    template: options.template as TemplateData['template'],
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
    hasDocker: options.includeDocker
  };
}
