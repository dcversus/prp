/**
 * Project generators
 */

import { GeneratorContext, FileToGenerate } from '../types.js';

export async function generateProject(context: GeneratorContext): Promise<void> {
  // TODO: Implement project generation logic
  console.log('Generating project with context:', context);
}

export async function generateCommonFiles(_context: GeneratorContext): Promise<FileToGenerate[]> {
  // TODO: Generate LICENSE, README, .gitignore, etc.
  return [];
}

export async function generateTemplateFiles(_context: GeneratorContext): Promise<FileToGenerate[]> {
  // TODO: Generate template-specific files
  return [];
}
