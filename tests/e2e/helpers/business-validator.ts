/**
 * Business Validator - Validates PRP governance structure and business rules
 * Ensures created projects comply with PRP methodology and standards
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  passed: string[];
}

export interface ProjectStructure {
  hasPrprc: boolean;
  hasPRPsDir: boolean;
  hasAgentsMd: boolean;
  hasGit: boolean;
  hasNodeModules: boolean;
  hasPackageJson: boolean;
  hasTemplateFiles: boolean;
  hasInitialPRP: boolean;
}

export interface PRPCompliance {
  structureValid: boolean;
  agentsMdValid: boolean;
  prprcValid: boolean;
  initialPRPValid: boolean;
  templateCompliant: boolean;
  governanceIntact: boolean;
}

export class BusinessValidator {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Validates complete project structure according to PRP standards
   */
  validateProjectStructure(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    // Core PRP structure
    if (!existsSync(join(this.projectPath, '.prprc'))) {
      errors.push('Missing .prprc configuration file');
    } else {
      passed.push('.prprc configuration file exists');
    }

    if (!existsSync(join(this.projectPath, 'PRPs'))) {
      errors.push('Missing PRPs directory');
    } else {
      passed.push('PRPs directory exists');

      // Check if PRPs directory has at least one PRP
      try {
        const prpFiles = readdirSync(join(this.projectPath, 'PRPs'))
          .filter(f => f.endsWith('.md'));
        if (prpFiles.length === 0) {
          errors.push('PRPs directory exists but contains no PRP files');
        } else {
          passed.push(`Found ${prpFiles.length} PRP file(s)`);
        }
      } catch (e) {
        errors.push('Cannot read PRPs directory');
      }
    }

    if (!existsSync(join(this.projectPath, 'AGENTS.md'))) {
      errors.push('Missing AGENTS.md file');
    } else {
      passed.push('AGENTS.md file exists');
    }

    // Git repository
    if (!existsSync(join(this.projectPath, '.git'))) {
      warnings.push('Not a git repository (may be intentional for testing)');
    } else {
      passed.push('Git repository initialized');
    }

    // Package management
    if (!existsSync(join(this.projectPath, 'package.json'))) {
      warnings.push('No package.json found (may be non-Node.js project)');
    } else {
      passed.push('package.json exists');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      passed
    };
  }

  /**
   * Validates .prprc configuration schema and content
   */
  validatePrprcConfig(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    const configPath = join(this.projectPath, '.prprc');
    if (!existsSync(configPath)) {
      return {
        valid: false,
        errors: ['.prprc file does not exist'],
        warnings: [],
        passed: []
      };
    }

    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));

      // Required top-level fields
      const requiredFields = ['version', 'project', 'agents', 'orchestrator'];
      for (const field of requiredFields) {
        if (!config[field]) {
          errors.push(`Missing required field: ${field}`);
        } else {
          passed.push(`Field ${field} present`);
        }
      }

      // Project configuration
      if (config.project) {
        if (!config.project.name) {
          errors.push('Project name is required in .prprc');
        } else {
          passed.push('Project name configured');
        }

        if (!config.project.version) {
          warnings.push('Project version not specified');
        } else {
          passed.push('Project version specified');
        }
      }

      // Agent configuration validation
      if (config.agents && Array.isArray(config.agents)) {
        const validAgents = [
          'robo-developer',
          'robo-quality-control',
          'robo-ux-ui-designer',
          'robo-devops-sre',
          'robo-system-analyst'
        ];

        for (const agent of config.agents) {
          if (!agent.name || !validAgents.includes(agent.name)) {
            errors.push(`Invalid agent configuration: ${agent.name || 'unnamed'}`);
          } else {
            passed.push(`Agent ${agent.name} configured`);

            // Check required agent fields
            if (!agent.type) {
              errors.push(`Agent ${agent.name} missing type field`);
            }
            if (!agent.status) {
              warnings.push(`Agent ${agent.name} missing status field`);
            }
          }
        }
      }

      // Orchestrator configuration
      if (config.orchestrator) {
        if (!config.orchestrator.mode) {
          warnings.push('Orchestrator mode not specified');
        } else {
          passed.push('Orchestrator mode configured');
        }
      }

      // Template information
      if (config.template) {
        passed.push('Template information preserved');
      }

    } catch (e) {
      errors.push(`Invalid JSON in .prprc: ${e}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      passed
    };
  }

  /**
   * Validates AGENTS.md structure and content
   */
  validateAgentsMd(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    const agentsPath = join(this.projectPath, 'AGENTS.md');
    if (!existsSync(agentsPath)) {
      return {
        valid: false,
        errors: ['AGENTS.md file does not exist'],
        warnings: [],
        passed: []
      };
    }

    try {
      const content = readFileSync(agentsPath, 'utf8');

      // Check for system section (should not be edited)
      if (!content.includes('SYSTEM PART! NEVER EDIT THIS PART!')) {
        errors.push('AGENTS.md missing system section delimiter');
      } else {
        passed.push('System section properly marked');
      }

      // Check for user section
      if (!content.includes('USER SECTION!')) {
        errors.push('AGENTS.md missing user section delimiter');
      } else {
        passed.push('User section properly marked');
      }

      // Check for sacred rules
      if (!content.includes('# 🚀 SACRED RULES')) {
        errors.push('AGENTS.md missing sacred rules section');
      } else {
        passed.push('Sacred rules section present');
      }

      // Check for signal system
      if (!content.includes('# 🎵 ♫ SIGNAL SYSTEM')) {
        errors.push('AGENTS.md missing signal system documentation');
      } else {
        passed.push('Signal system documented');
      }

      // Check for workflow section
      if (!content.includes('## 🔄 WORKFLOW')) {
        warnings.push('AGENTS.md missing workflow section');
      } else {
        passed.push('Workflow section present');
      }

      // Check for agent signals
      const requiredSignals = ['[bb]', '[af]', '[da]', '[rp]', '[rr]', '[ip]', '[dp]', '[cq]'];
      const missingSignals = requiredSignals.filter(signal => !content.includes(signal));
      if (missingSignals.length > 0) {
        warnings.push(`AGENTS.md missing signal documentation: ${missingSignals.join(', ')}`);
      } else {
        passed.push('All required signals documented');
      }

      // Check file is not empty
      if (content.trim().length === 0) {
        errors.push('AGENTS.md file is empty');
      } else if (content.length < 1000) {
        warnings.push('AGENTS.md seems too short');
      } else {
        passed.push('AGENTS.md has substantial content');
      }

    } catch (e) {
      errors.push(`Cannot read AGENTS.md: ${e}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      passed
    };
  }

  /**
   * Validates initial PRP structure and content
   */
  validateInitialPRP(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    const prpsDir = join(this.projectPath, 'PRPs');
    if (!existsSync(prpsDir)) {
      return {
        valid: false,
        errors: ['PRPs directory does not exist'],
        warnings: [],
        passed: []
      };
    }

    try {
      const prpFiles = readdirSync(prpsDir)
        .filter(f => f.endsWith('.md'));

      if (prpFiles.length === 0) {
        return {
          valid: false,
          errors: ['No PRP files found'],
          warnings: [],
          passed: []
        };
      }

      // Check first PRP file
      const firstPRP = join(prpsDir, prpFiles[0]);
      const content = readFileSync(firstPRP, 'utf8');

      // Check PRP structure
      const requiredSections = ['# PRP-', '## feature name', '---', '--'];
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          errors.push(`PRP missing required section: ${section}`);
        } else {
          passed.push(`PRP has required section: ${section}`);
        }
      }

      // Check for user quote section
      if (!content.includes('> our goal of user quote')) {
        errors.push('PRP missing user quote section');
      } else {
        passed.push('User quote section present');
      }

      // Check for checklist items
      if (!content.includes('- [ ]')) {
        warnings.push('PRP has no checklist items');
      } else {
        passed.push('PRP includes checklist items');
      }

      // Check for signals
      const hasSignals = /\[([a-z]{2})\]/.test(content);
      if (!hasSignals) {
        warnings.push('PRP has no signal indicators');
      } else {
        passed.push('PRP includes signal indicators');
      }

      // Check PRP filename format
      if (!prpFiles[0].match(/^PRP-\d{3}-/)) {
        errors.push('PRP filename does not follow PRP-XXX- format');
      } else {
        passed.push('PRP filename follows correct format');
      }

    } catch (e) {
      errors.push(`Error reading PRP files: ${e}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      passed
    };
  }

  /**
   * Validates template-specific requirements
   */
  validateTemplateCompliance(templateName: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    switch (templateName) {
      case 'react':
        this.validateReactTemplate(errors, warnings, passed);
        break;
      case 'typescript':
        this.validateTypeScriptTemplate(errors, warnings, passed);
        break;
      case 'nestjs':
        this.validateNestJSTemplate(errors, warnings, passed);
        break;
      case 'fastapi':
        this.validateFastAPITemplate(errors, warnings, passed);
        break;
      case 'wikijs':
        this.validateWikiJSTemplate(errors, warnings, passed);
        break;
      case 'none':
        passed.push('No template compliance checks needed');
        break;
      default:
        warnings.push(`Unknown template type: ${templateName}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      passed
    };
  }

  private validateReactTemplate(errors: string[], warnings: string[], passed: string[]): void {
    const checks = [
      { file: 'package.json', contains: '"react"', error: 'Missing React dependency' },
      { file: 'src/App.tsx', exists: true, error: 'Missing App.tsx component' },
      { file: 'src/index.tsx', exists: true, error: 'Missing index.tsx entry point' },
      { file: 'tsconfig.json', exists: true, error: 'Missing TypeScript configuration' },
      { file: 'vite.config.ts', exists: true, error: 'Missing Vite configuration' }
    ];

    for (const check of checks) {
      const filePath = join(this.projectPath, check.file);
      if (!existsSync(filePath)) {
        errors.push(check.error);
      } else {
        if (check.contains) {
          const content = readFileSync(filePath, 'utf8');
          if (content.includes(check.contains)) {
            passed.push(`${check.file} has required content`);
          } else {
            errors.push(check.error);
          }
        } else {
          passed.push(`${check.file} exists`);
        }
      }
    }
  }

  private validateTypeScriptTemplate(errors: string[], warnings: string[], passed: string[]): void {
    const checks = [
      { file: 'package.json', contains: '"typescript"', error: 'Missing TypeScript dependency' },
      { file: 'tsconfig.json', exists: true, error: 'Missing TypeScript configuration' },
      { file: 'src/index.ts', exists: true, error: 'Missing index.ts entry point' }
    ];

    for (const check of checks) {
      const filePath = join(this.projectPath, check.file);
      if (!existsSync(filePath)) {
        errors.push(check.error);
      } else if (check.contains) {
        const content = readFileSync(filePath, 'utf8');
        if (content.includes(check.contains)) {
          passed.push(`${check.file} has required content`);
        } else {
          errors.push(check.error);
        }
      } else {
        passed.push(`${check.file} exists`);
      }
    }
  }

  private validateNestJSTemplate(errors: string[], warnings: string[], passed: string[]): void {
    const checks = [
      { file: 'package.json', contains: '"@nestjs/core"', error: 'Missing NestJS dependency' },
      { file: 'src/main.ts', exists: true, error: 'Missing main.ts entry point' },
      { file: 'nest-cli.json', exists: true, error: 'Missing NestJS CLI configuration' }
    ];

    for (const check of checks) {
      const filePath = join(this.projectPath, check.file);
      if (!existsSync(filePath)) {
        errors.push(check.error);
      } else {
        passed.push(`${check.file} exists`);
      }
    }
  }

  private validateFastAPITemplate(errors: string[], warnings: string[], passed: string[]): void {
    const checks = [
      { file: 'requirements.txt', exists: true, error: 'Missing requirements.txt' },
      { file: 'main.py', exists: true, error: 'Missing main.py entry point' },
      { file: 'docker-compose.yml', exists: true, error: 'Missing docker-compose.yml' }
    ];

    for (const check of checks) {
      const filePath = join(this.projectPath, check.file);
      if (!existsSync(filePath)) {
        errors.push(check.error);
      } else {
        passed.push(`${check.file} exists`);
      }
    }
  }

  private validateWikiJSTemplate(errors: string[], warnings: string[], passed: string[]): void {
    const checks = [
      { file: 'package.json', contains: '"wiki.js"', error: 'Missing Wiki.js dependency' },
      { file: 'docker-compose.yml', exists: true, error: 'Missing docker-compose.yml' },
      { file: 'config.yml', exists: true, error: 'Missing Wiki.js configuration' }
    ];

    for (const check of checks) {
      const filePath = join(this.projectPath, check.file);
      if (!existsSync(filePath)) {
        errors.push(check.error);
      } else {
        passed.push(`${check.file} exists`);
      }
    }
  }

  /**
   * Validates project can be built and runs basic functionality tests
   */
  validateProjectFunctionality(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    // Check if package.json exists and has scripts
    const packageJsonPath = join(this.projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

        if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
          passed.push('Package.json has build scripts defined');

          // Try to install dependencies
          if (!existsSync(join(this.projectPath, 'node_modules'))) {
            try {
              execSync('npm install', { cwd: this.projectPath, stdio: 'pipe' });
              passed.push('Dependencies installed successfully');
            } catch (e) {
              errors.push('Failed to install dependencies');
            }
          } else {
            passed.push('Dependencies already installed');
          }

          // Try to run build if available
          if (packageJson.scripts.build) {
            try {
              execSync('npm run build', { cwd: this.projectPath, stdio: 'pipe' });
              passed.push('Build completed successfully');
            } catch (e) {
              errors.push('Build failed');
            }
          } else {
            warnings.push('No build script defined');
          }

          // Try to run test if available
          if (packageJson.scripts.test) {
            try {
              execSync('npm test', { cwd: this.projectPath, stdio: 'pipe' });
              passed.push('Tests passed');
            } catch (e) {
              warnings.push('Tests failed or not configured');
            }
          }
        } else {
          warnings.push('No scripts defined in package.json');
        }
      } catch (e) {
        errors.push('Invalid package.json');
      }
    } else {
      warnings.push('No package.json found (non-Node.js project)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      passed
    };
  }

  /**
   * Performs comprehensive PRP compliance validation
   */
  validatePRPCompliance(templateName?: string): PRPCompliance {
    const structureValid = this.validateProjectStructure().valid;
    const prprcValid = this.validatePrprcConfig().valid;
    const agentsMdValid = this.validateAgentsMd().valid;
    const initialPRPValid = this.validateInitialPRP().valid;
    const templateCompliant = templateName ?
      this.validateTemplateCompliance(templateName).valid : true;
    const governanceIntact = prprcValid && agentsMdValid && initialPRPValid;

    return {
      structureValid,
      agentsMdValid,
      prprcValid,
      initialPRPValid,
      templateCompliant,
      governanceIntact
    };
  }

  /**
   * Generates comprehensive validation report
   */
  generateValidationReport(templateName?: string): string {
    const structure = this.validateProjectStructure();
    const prprc = this.validatePrprcConfig();
    const agentsMd = this.validateAgentsMd();
    const initialPRP = this.validateInitialPRP();
    const template = templateName ? this.validateTemplateCompliance(templateName) : null;
    const functionality = this.validateProjectFunctionality();

    let report = '# PRP Project Validation Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Project Path: ${this.projectPath}\n\n`;

    // Overall status
    const overallValid = structure.valid && prprc.valid && agentsMd.valid &&
                        initialPRP.valid && (!template || template.valid);
    report += `## Overall Status: ${overallValid ? '✅ VALID' : '❌ INVALID'}\n\n`;

    // Section results
    report += `## Validation Results\n\n`;
    report += `### Project Structure: ${structure.valid ? '✅' : '❌'}\n`;
    if (structure.errors.length > 0) {
      report += '**Errors:**\n';
      structure.errors.forEach(e => report += `- ${e}\n`);
    }
    if (structure.warnings.length > 0) {
      report += '**Warnings:**\n';
      structure.warnings.forEach(e => report += `- ${e}\n`);
    }

    report += `\n### .prprc Configuration: ${prprc.valid ? '✅' : '❌'}\n`;
    if (prprc.errors.length > 0) {
      report += '**Errors:**\n';
      prprc.errors.forEach(e => report += `- ${e}\n`);
    }

    report += `\n### AGENTS.md: ${agentsMd.valid ? '✅' : '❌'}\n`;
    if (agentsMd.errors.length > 0) {
      report += '**Errors:**\n';
      agentsMd.errors.forEach(e => report += `- ${e}\n`);
    }

    report += `\n### Initial PRP: ${initialPRP.valid ? '✅' : '❌'}\n`;
    if (initialPRP.errors.length > 0) {
      report += '**Errors:**\n';
      initialPRP.errors.forEach(e => report += `- ${e}\n`);
    }

    if (template) {
      report += `\n### Template Compliance (${templateName}): ${template.valid ? '✅' : '❌'}\n`;
      if (template.errors.length > 0) {
        report += '**Errors:**\n';
        template.errors.forEach(e => report += `- ${e}\n`);
      }
    }

    report += `\n### Functionality: ${functionality.valid ? '✅' : '❌'}\n`;
    if (functionality.errors.length > 0) {
      report += '**Errors:**\n';
      functionality.errors.forEach(e => report += `- ${e}\n`);
    }

    // Compliance summary
    const compliance = this.validatePRPCompliance(templateName);
    report += `\n## Compliance Summary\n\n`;
    report += `- Structure Valid: ${compliance.structureValid ? '✅' : '❌'}\n`;
    report += `- PRP Configuration Valid: ${compliance.prprcValid ? '✅' : '❌'}\n`;
    report += `- Agents.md Valid: ${compliance.agentsMdValid ? '✅' : '❌'}\n`;
    report += `- Initial PRP Valid: ${compliance.initialPRPValid ? '✅' : '❌'}\n`;
    report += `- Template Compliant: ${compliance.templateCompliant ? '✅' : '❌'}\n`;
    report += `- Governance Intact: ${compliance.governanceIntact ? '✅' : '❌'}\n`;

    return report;
  }
}

/**
 * Utility function to validate a project directory
 */
export function validateProject(projectPath: string, templateName?: string): ValidationResult {
  const validator = new BusinessValidator(projectPath);
  const results = [
    validator.validateProjectStructure(),
    validator.validatePrprcConfig(),
    validator.validateAgentsMd(),
    validator.validateInitialPRP(),
    templateName ? validator.validateTemplateCompliance(templateName) : { valid: true, errors: [], warnings: [], passed: [] }
  ];

  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);
  const allPassed = results.flatMap(r => r.passed);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    passed: allPassed
  };
}