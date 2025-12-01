/**
 * Project Validator Helper
 *
 * Utilities for validating generated PRP projects
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProjectStructure {
  requiredFiles: string[];
  requiredDirs: string[];
  optionalFiles: string[];
}

export class ProjectValidator {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Validate a TypeScript project
   */
  validateTypeScript(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required files
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      '.prprc',
      'src/index.ts'
    ];

    for (const file of requiredFiles) {
      if (!existsSync(join(this.projectDir, file))) {
        errors.push(`Missing required file: ${file}`);
      }
    }

    // Validate package.json
    if (existsSync(join(this.projectDir, 'package.json'))) {
      try {
        const pkg = JSON.parse(readFileSync(join(this.projectDir, 'package.json'), 'utf8'));

        if (!pkg.name) errors.push('package.json missing name');
        if (!pkg.version) errors.push('package.json missing version');
        if (!pkg.scripts) errors.push('package.json missing scripts');
        if (!pkg.dependencies && !pkg.devDependencies) {
          errors.push('package.json has no dependencies');
        }

        // Check for TypeScript dependencies
        if (!pkg.devDependencies?.typescript) {
          warnings.push('TypeScript dependency missing');
        }
      } catch (e) {
        errors.push(`Invalid package.json: ${e}`);
      }
    }

    // Validate tsconfig.json
    if (existsSync(join(this.projectDir, 'tsconfig.json'))) {
      try {
        const tsconfig = JSON.parse(readFileSync(join(this.projectDir, 'tsconfig.json'), 'utf8'));

        if (!tsconfig.compilerOptions) {
          errors.push('tsconfig.json missing compilerOptions');
        }
      } catch (e) {
        errors.push(`Invalid tsconfig.json: ${e}`);
      }
    }

    // Validate .prprc
    if (existsSync(join(this.projectDir, '.prprc'))) {
      try {
        const prprc = JSON.parse(readFileSync(join(this.projectDir, '.prprc'), 'utf8'));

        if (!prprc.name) errors.push('.prprc missing name');
        if (!prprc.template) errors.push('.prprc missing template');
      } catch (e) {
        errors.push(`Invalid .prprc: ${e}`);
      }
    }

    // Validate source file
    if (existsSync(join(this.projectDir, 'src/index.ts'))) {
      const content = readFileSync(join(this.projectDir, 'src/index.ts'), 'utf8');
      if (content.length < 10) {
        warnings.push('src/index.ts appears to be empty');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a React project
   */
  validateReact(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // First validate as TypeScript
    const tsResult = this.validateTypeScript();
    errors.push(...tsResult.errors);
    warnings.push(...tsResult.warnings);

    // Check React-specific files
    const reactFiles = [
      'src/App.tsx',
      'src/index.tsx',
      'public/index.html'
    ];

    for (const file of reactFiles) {
      if (!existsSync(join(this.projectDir, file))) {
        errors.push(`Missing React file: ${file}`);
      }
    }

    // Validate package.json for React dependencies
    if (existsSync(join(this.projectDir, 'package.json'))) {
      try {
        const pkg = JSON.parse(readFileSync(join(this.projectDir, 'package.json'), 'utf8'));

        const reactDeps = ['react', 'react-dom'];
        for (const dep of reactDeps) {
          if (!pkg.dependencies?.[dep]) {
            errors.push(`Missing React dependency: ${dep}`);
          }
        }

        // Check for build scripts
        if (!pkg.scripts?.build) {
          warnings.push('No build script found');
        }
      } catch (e) {
        errors.push(`Invalid package.json: ${e}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a NestJS project
   */
  validateNestJS(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredFiles = [
      'package.json',
      'nest-cli.json',
      'src/main.ts',
      'src/app.module.ts'
    ];

    for (const file of requiredFiles) {
      if (!existsSync(join(this.projectDir, file))) {
        errors.push(`Missing NestJS file: ${file}`);
      }
    }

    // Validate NestJS dependencies
    if (existsSync(join(this.projectDir, 'package.json'))) {
      try {
        const pkg = JSON.parse(readFileSync(join(this.projectDir, 'package.json'), 'utf8'));

        if (!pkg.dependencies?.['@nestjs/core']) {
          errors.push('Missing @nestjs/core dependency');
        }
        if (!pkg.dependencies?.['@nestjs/common']) {
          errors.push('Missing @nestjs/common dependency');
        }
      } catch (e) {
        errors.push(`Invalid package.json: ${e}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a FastAPI project
   */
  validateFastAPI(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredFiles = [
      'main.py',
      'requirements.txt'
    ];

    for (const file of requiredFiles) {
      if (!existsSync(join(this.projectDir, file))) {
        errors.push(`Missing FastAPI file: ${file}`);
      }
    }

    // Validate requirements.txt
    if (existsSync(join(this.projectDir, 'requirements.txt'))) {
      const content = readFileSync(join(this.projectDir, 'requirements.txt'), 'utf8');
      if (!content.includes('fastapi')) {
        errors.push('FastAPI not in requirements.txt');
      }
    }

    // Validate main.py
    if (existsSync(join(this.projectDir, 'main.py'))) {
      const content = readFileSync(join(this.projectDir, 'main.py'), 'utf8');
      if (!content.includes('FastAPI')) {
        errors.push('main.py does not contain FastAPI code');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a Wiki.js project
   */
  validateWikiJS(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredFiles = [
      'docker-compose.yml',
      'package.json'
    ];

    for (const file of requiredFiles) {
      if (!existsSync(join(this.projectDir, file))) {
        errors.push(`Missing Wiki.js file: ${file}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a minimal (none) project
   */
  validateNone(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredFiles = [
      '.prprc',
      'README.md',
      'AGENTS.md'
    ];

    for (const file of requiredFiles) {
      if (!existsSync(join(this.projectDir, file))) {
        errors.push(`Missing required file: ${file}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Try to build the project
   */
  canBuild(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if package.json exists and has build script
    const packageJsonPath = join(this.projectDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      errors.push('No package.json found');
      return { valid: false, errors, warnings };
    }

    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (!pkg.scripts?.build) {
        warnings.push('No build script in package.json');
        return { valid: true, errors, warnings };
      }

      // Try to run npm install
      try {
        execSync('npm install', { cwd: this.projectDir, stdio: 'pipe' });
      } catch (e) {
        errors.push(`npm install failed: ${e}`);
        return { valid: false, errors, warnings };
      }

      // Try to run npm run build
      try {
        execSync('npm run build', { cwd: this.projectDir, stdio: 'pipe' });
      } catch (e) {
        errors.push(`Build failed: ${e}`);
      }
    } catch (e) {
      errors.push(`Failed to parse package.json: ${e}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get project template type from .prprc
   */
  getTemplateType(): string | null {
    try {
      const prprc = JSON.parse(readFileSync(join(this.projectDir, '.prprc'), 'utf8'));
      return prprc.template || null;
    } catch {
      return null;
    }
  }

  /**
   * Validate complete project structure after init
   */
  validateCompleteProject(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // First validate based on template type
    const templateType = this.getTemplateType();
    if (!templateType) {
      errors.push('Could not determine project template type');
      return { valid: false, errors, warnings };
    }

    let templateResult: ValidationResult;
    switch (templateType) {
      case 'typescript':
        templateResult = this.validateTypeScript();
        break;
      case 'react':
        templateResult = this.validateReact();
        break;
      case 'nestjs':
        templateResult = this.validateNestJS();
        break;
      case 'fastapi':
        templateResult = this.validateFastAPI();
        break;
      case 'wikijs':
        templateResult = this.validateWikiJS();
        break;
      case 'none':
        templateResult = this.validateNone();
        break;
      default:
        errors.push(`Unknown template type: ${templateType}`);
        templateResult = { valid: false, errors, warnings };
    }

    errors.push(...templateResult.errors);
    warnings.push(...templateResult.warnings);

    // Additional E2E specific validations
    this.validateGitRepository(errors, warnings);
    this.validateDocumentation(errors, warnings);
    this.validatePRPConfiguration(errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate Git repository initialization
   */
  private validateGitRepository(errors: string[], warnings: string[]): void {
    const gitDir = join(this.projectDir, '.git');
    if (!existsSync(gitDir)) {
      warnings.push('Git repository not initialized');
    } else {
      // Check for .gitignore
      if (!existsSync(join(this.projectDir, '.gitignore'))) {
        warnings.push('.gitignore file missing');
      }
    }
  }

  /**
   * Validate documentation files
   */
  private validateDocumentation(errors: string[], warnings: string[]): void {
    const docFiles = ['README.md'];
    for (const file of docFiles) {
      if (!existsSync(join(this.projectDir, file))) {
        warnings.push(`Documentation file missing: ${file}`);
      }
    }

    // Check README content
    const readmePath = join(this.projectDir, 'README.md');
    if (existsSync(readmePath)) {
      const content = readFileSync(readmePath, 'utf8');
      if (content.length < 50) {
        warnings.push('README.md appears to be empty or minimal');
      }
    }
  }

  /**
   * Validate PRP-specific configuration
   */
  private validatePRPConfiguration(errors: string[], warnings: string[]): void {
    const prprcPath = join(this.projectDir, '.prprc');
    if (!existsSync(prprcPath)) {
      errors.push('.prprc configuration file missing');
      return;
    }

    try {
      const prprc = JSON.parse(readFileSync(prprcPath, 'utf8'));

      // Validate required PRP fields
      if (!prprc.name) errors.push('.prprc missing project name');
      if (!prprc.template) errors.push('.prprc missing template');
      if (!prprc.project) errors.push('.prprc missing project configuration');

      // Validate agent configuration
      if (prprc.agents && Array.isArray(prprc.agents)) {
        if (prprc.agents.length === 0) {
          warnings.push('No agents configured in .prprc');
        }
      } else if (!prprc.agents) {
        warnings.push('No agents section in .prprc');
      }

      // Validate provider configuration
      if (!prprc.provider) {
        warnings.push('No AI provider configured in .prprc');
      }

      // Validate auth configuration
      if (!prprc.auth || !prprc.auth.type) {
        warnings.push('No authentication configuration in .prprc');
      }
    } catch (e) {
      errors.push(`Invalid .prprc JSON: ${e}`);
    }
  }

  /**
   * Get comprehensive project report for LLM judgment
   */
  getProjectReport(): {
    template: string | null;
    structure: {
      files: string[];
      directories: string[];
    };
    validation: ValidationResult;
    size: {
      totalFiles: number;
      totalSize: number;
    };
    dependencies: {
      production: Record<string, string>;
      development: Record<string, string>;
    } | null;
  } {
    const template = this.getTemplateType();
    const structure = this.getProjectStructure();
    const validation = this.validateCompleteProject();
    const size = this.getProjectSize();
    const dependencies = this.getProjectDependencies();

    return {
      template,
      structure,
      validation,
      size,
      dependencies
    };
  }

  /**
   * Get project file structure
   */
  private getProjectStructure(): { files: string[]; directories: string[] } {
    const files: string[] = [];
    const directories: string[] = [];

    const scanDir = (dir: string, relativePath: string = '') => {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const relativeItemPath = relativePath ? join(relativePath, item) : item;

        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          directories.push(relativeItemPath);
          scanDir(fullPath, relativeItemPath);
        } else {
          files.push(relativeItemPath);
        }
      }
    };

    try {
      scanDir(this.projectDir);
    } catch (e) {
      // Directory scanning failed
    }

    return { files, directories };
  }

  /**
   * Get project size metrics
   */
  private getProjectSize(): { totalFiles: number; totalSize: number } {
    let totalFiles = 0;
    let totalSize = 0;

    const calculateSize = (dir: string) => {
      try {
        const items = readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            calculateSize(fullPath);
          } else {
            totalFiles++;
            totalSize += stat.size;
          }
        }
      } catch (e) {
        // Skip files that can't be accessed
      }
    };

    calculateSize(this.projectDir);
    return { totalFiles, totalSize };
  }

  /**
   * Get project dependencies from package.json
   */
  private getProjectDependencies(): { production: Record<string, string>; development: Record<string, string> } | null {
    const packageJsonPath = join(this.projectDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return {
        production: pkg.dependencies || {},
        development: pkg.devDependencies || {}
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Validate that orchestrator can be started in this project
   */
  validateOrchestratorReady(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for .prprc (required for orchestrator)
    if (!existsSync(join(this.projectDir, '.prprc'))) {
      errors.push('.prprc file required for orchestrator');
    }

    // Check for PRPs directory (will be created by orchestrator)
    const prpsDir = join(this.projectDir, 'PRPs');
    if (existsSync(prpsDir)) {
      const prps = readdirSync(prpsDir);
      if (prps.length === 0) {
        warnings.push('PRPs directory exists but is empty');
      }
    }

    // Check for basic project structure
    const templateType = this.getTemplateType();
    if (!templateType) {
      warnings.push('No template type set - orchestrator may not work properly');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}