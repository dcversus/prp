#!/usr/bin/env node

/**
 * CI/CD Command Implementation
 *
 * Provides comprehensive CI/CD pipeline management and validation functionality
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';
import { ConfigurationManager } from '../config/manager';
import { ValidationError, FileSystemError } from '../utils/error-handler';
import type { CommandResult } from '../types';

interface CIOptions {
  validate?: boolean;
  setup?: boolean;
  provider?: string;
  workflow?: string;
  dryRun?: boolean;
  force?: boolean;
  list?: boolean;
}

interface CIWorkflow {
  name: string;
  description: string;
  triggers: string[];
  jobs: CIJob[];
  enabled: boolean;
  provider: string;
}

interface CIJob {
  name: string;
  runsOn: string[];
  steps: CIStep[];
  environment?: string;
  timeout?: number;
}

interface CIStep {
  name: string;
  action: string;
  with?: Record<string, any>;
  run?: string;
  uses?: string;
}

interface CIValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  workflows: CIWorkflow[];
  provider: string;
}

/**
 * Create CI command for CLI
 */
export function createCICommand(): Command {
  const ciCmd = new Command('ci')
    .description('Manage CI/CD pipelines and workflows')
    .option('-v, --validate', 'validate CI/CD configuration')
    .option('-s, --setup', 'setup CI/CD pipeline')
    .option('-l, --list', 'list available workflows')
    .option('-p, --provider <provider>', 'CI/CD provider (github, gitlab, circleci)', 'github')
    .option('-w, --workflow <workflow>', 'specific workflow to manage')
    .option('--dry-run', 'show what would be done without making changes')
    .option('-f, --force', 'overwrite existing configurations')
    .action(async (options: CIOptions) => {
      await handleCICommand(options);
    });

  return ciCmd;
}

/**
 * Handle CI command execution
 */
async function handleCICommand(options: CIOptions): Promise<void> {
  logger.info('🔄 Managing CI/CD pipeline');

  try {
    const cli = new PRPCli({
      debug: false,
    });

    await cli.initialize();
    const configManager = cli.getConfigManager();
    const config = cli.getConfiguration();

    const ciManager = new CIManager(configManager, config);

    if (options.list) {
      await ciManager.listWorkflows();
      return;
    }

    if (options.setup) {
      const result = await ciManager.setupPipeline(options.provider!, options.force, options.dryRun);
      if (result.success) {
        logger.success('✅ CI/CD pipeline setup completed successfully');
      } else {
        logger.error('❌ CI/CD pipeline setup failed');
        if (result.stderr) {
          logger.error(result.stderr);
        }
        process.exit(1);
      }
      return;
    }

    if (options.validate) {
      const result = await ciManager.validateConfiguration();
      if (result.valid) {
        logger.success('✅ CI/CD configuration is valid');
      } else {
        logger.error('❌ CI/CD configuration validation failed');
        result.errors.forEach(error => logger.error(`  ${error}`));
        if (result.warnings.length > 0) {
          logger.warn('Warnings:');
          result.warnings.forEach(warning => logger.warn(`  ${warning}`));
        }
        process.exit(1);
      }
      return;
    }

    // Default: show CI/CD status
    await ciManager.showStatus();

  } catch (error) {
    logger.error('CI/CD command failed:', error);
    process.exit(1);
  }
}

/**
 * CI/CD Pipeline Manager
 */
class CIManager {
  private configManager: ConfigurationManager;
  private config: any;
  private workflowsPath: string;

  constructor(configManager: ConfigurationManager, config: any) {
    this.configManager = configManager;
    this.config = config;
    this.workflowsPath = path.join(process.cwd(), '.github', 'workflows');
  }

  /**
   * Setup CI/CD pipeline
   */
  async setupPipeline(provider: string, force: boolean = false, dryRun: boolean = false): Promise<CommandResult> {
    logger.info(`Setting up ${provider} CI/CD pipeline...`);

    try {
      // Validate provider
      if (!['github', 'gitlab', 'circleci'].includes(provider)) {
        throw new ValidationError(`Unsupported CI/CD provider: ${provider}`);
      }

      // Create workflows directory
      if (!dryRun) {
        await fs.ensureDir(this.workflowsPath);
      }

      // Generate workflows based on project type
      const workflows = await this.generateWorkflows(provider);

      // Write workflow files
      for (const workflow of workflows) {
        const workflowPath = path.join(this.workflowsPath, `${workflow.name}.yml`);

        if (fs.existsSync(workflowPath) && !force) {
          logger.warn(`Workflow file already exists: ${workflow.name}.yml (use --force to overwrite)`);
          continue;
        }

        if (!dryRun) {
          await fs.writeFile(workflowPath, this.generateWorkflowYAML(workflow));
          logger.debug(`Created workflow: ${workflow.name}.yml`);
        } else {
          logger.info(`[DRY RUN] Would create: ${workflowPath}`);
        }
      }

      // Update configuration
      if (!dryRun) {
        this.config.settings.ci = {
          ...this.config.settings.ci,
          provider,
          enabled: true,
          workflows: workflows.reduce((acc, w) => {
            acc[w.name] = w;
            return acc;
          }, {} as Record<string, CIWorkflow>)
        };

        await this.configManager.save(this.config, '.prprc');
      }

      logger.success(`✅ ${provider} CI/CD pipeline setup complete`);
      logger.info('📁 Workflows created in: .github/workflows/');
      logger.info('🔧 Configuration updated in: .prprc');

      return {
        success: true,
        exitCode: 0,
        stdout: `CI/CD pipeline setup completed for ${provider}`,
        stderr: '',
        duration: 0
      };

    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: 0
      };
    }
  }

  /**
   * Validate CI/CD configuration
   */
  async validateConfiguration(): Promise<CIValidationResult> {
    const result: CIValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      workflows: [],
      provider: this.config.settings.ci?.provider || 'github'
    };

    try {
      // Check if workflows directory exists
      if (!fs.existsSync(this.workflowsPath)) {
        result.errors.push('CI/CD workflows directory does not exist: .github/workflows/');
        result.valid = false;
        return result;
      }

      // Read workflow files
      const workflowFiles = await fs.readdir(this.workflowsPath);
      const yamlFiles = workflowFiles.filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

      if (yamlFiles.length === 0) {
        result.errors.push('No workflow files found in .github/workflows/');
        result.valid = false;
        return result;
      }

      // Validate each workflow
      for (const file of yamlFiles) {
        const filePath = path.join(this.workflowsPath, file);
        const content = await fs.readFile(filePath, 'utf8');

        try {
          const workflow = this.parseWorkflowYAML(content);
          if (workflow) {
            result.workflows.push(workflow);
            await this.validateWorkflow(workflow, result);
          }
        } catch (error) {
          result.errors.push(`Failed to parse workflow file ${file}: ${error instanceof Error ? error.message : String(error)}`);
          result.valid = false;
        }
      }

      // Check for essential workflows
      const essentialWorkflows = ['ci', 'cd', 'quality'];
      const workflowNames = result.workflows.map(w => w.name);

      for (const essential of essentialWorkflows) {
        if (!workflowNames.includes(essential)) {
          result.warnings.push(`Missing essential workflow: ${essential}`);
        }
      }

      // Validate provider-specific requirements
      await this.validateProviderRequirements(result);

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * List available workflows
   */
  async listWorkflows(): Promise<void> {
    logger.info('📋 Available CI/CD Workflows');

    if (!fs.existsSync(this.workflowsPath)) {
      logger.warn('No CI/CD workflows directory found. Use --setup to create workflows.');
      return;
    }

    const workflowFiles = await fs.readdir(this.workflowsPath);
    const yamlFiles = workflowFiles.filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    if (yamlFiles.length === 0) {
      logger.warn('No workflow files found.');
      return;
    }

    for (const file of yamlFiles) {
      const filePath = path.join(this.workflowsPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      try {
        const workflow = this.parseWorkflowYAML(content);
        if (workflow) {
          const status = workflow.enabled ? '✅' : '❌';
          logger.info(`${status} ${workflow.name} - ${workflow.description}`);
          logger.info(`   Triggers: ${workflow.triggers.join(', ')}`);
          logger.info(`   Jobs: ${workflow.jobs.length} job(s)`);
          logger.info('');
        }
      } catch (error) {
        logger.warn(`❌ ${file} - Failed to parse: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Show CI/CD status
   */
  async showStatus(): Promise<void> {
    logger.info('📊 CI/CD Status');

    const config = this.config.settings.ci;
    logger.info(`Provider: ${config?.provider || 'Not configured'}`);
    logger.info(`Status: ${config?.enabled ? '✅ Enabled' : '❌ Disabled'}`);

    if (config?.enabled) {
      logger.info(`Workflows: ${Object.keys(config.workflows || {}).length} configured`);

      // Check GitHub Actions status if configured
      if (config.provider === 'github') {
        try {
          const { execSync } = require('child_process');
          const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
          logger.info(`Current branch: ${branch}`);

          // Check if GitHub Actions is enabled in repo
          const repoUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
          if (repoUrl.includes('github.com')) {
            logger.info('✅ GitHub repository detected');
          } else {
            logger.warn('⚠️  Not a GitHub repository - GitHub Actions may not work');
          }
        } catch (error) {
          logger.warn('Could not determine Git status');
        }
      }
    }

    logger.info('');
    logger.info('Use --list to see available workflows');
    logger.info('Use --validate to check configuration');
    logger.info('Use --setup to configure CI/CD pipeline');
  }

  /**
   * Generate workflows based on project configuration
   */
  private async generateWorkflows(provider: string): Promise<CIWorkflow[]> {
    const workflows: CIWorkflow[] = [];

    // CI Workflow
    workflows.push({
      name: 'ci',
      description: 'Continuous Integration',
      triggers: ['push', 'pull_request'],
      provider,
      enabled: true,
      jobs: [
        {
          name: 'test',
          runsOn: ['ubuntu-latest'],
          timeout: 30,
          steps: [
            {
              name: 'Checkout code',
              action: 'checkout',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup Node.js',
              action: 'setup-node',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': '20',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              action: 'install',
              run: 'npm ci'
            },
            {
              name: 'Run tests',
              action: 'test',
              run: 'npm test'
            },
            {
              name: 'Run linting',
              action: 'lint',
              run: 'npm run lint'
            },
            {
              name: 'Build project',
              action: 'build',
              run: 'npm run build'
            }
          ]
        }
      ]
    });

    // Quality Gates Workflow
    workflows.push({
      name: 'quality',
      description: 'Code Quality Gates',
      triggers: ['pull_request'],
      provider,
      enabled: true,
      jobs: [
        {
          name: 'quality-check',
          runsOn: ['ubuntu-latest'],
          timeout: 20,
          steps: [
            {
              name: 'Checkout code',
              action: 'checkout',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup Node.js',
              action: 'setup-node',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': '20',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              action: 'install',
              run: 'npm ci'
            },
            {
              name: 'Security audit',
              action: 'security',
              run: 'npm audit --audit-level=high'
            },
            {
              name: 'Code coverage',
              action: 'coverage',
              run: 'npm run test:coverage'
            }
          ]
        }
      ]
    });

    // CD Workflow (Release)
    workflows.push({
      name: 'release',
      description: 'Continuous Deployment',
      triggers: ['push'],
      provider,
      enabled: false, // Disabled by default
      jobs: [
        {
          name: 'release',
          runsOn: ['ubuntu-latest'],
          timeout: 30,
          environment: 'production',
          steps: [
            {
              name: 'Checkout code',
              action: 'checkout',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup Node.js',
              action: 'setup-node',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': '20',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              action: 'install',
              run: 'npm ci'
            },
            {
              name: 'Run tests',
              action: 'test',
              run: 'npm test'
            },
            {
              name: 'Build project',
              action: 'build',
              run: 'npm run build'
            },
            {
              name: 'Publish to NPM',
              action: 'publish',
              run: 'npm publish'
            }
          ]
        }
      ]
    });

    return workflows;
  }

  /**
   * Generate workflow YAML content
   */
  private generateWorkflowYAML(workflow: CIWorkflow): string {
    const yaml = [
      `name: ${workflow.description}`,
      '',
      'on:',
      ...workflow.triggers.map(trigger => {
        if (trigger === 'push') {
          return '  push:';
          return '    branches: [ main, master ]';
        } else if (trigger === 'pull_request') {
          return '  pull_request:';
          return '    branches: [ main, master ]';
        }
        return `  ${trigger}:`;
      }),
      '',
      'jobs:'
    ];

    for (const job of workflow.jobs) {
      yaml.push(
        `  ${job.name}:`,
        `    runs-on: ${job.runsOn.join(', ')}`
      );

      if (job.timeout) {
        yaml.push(`    timeout-minutes: ${job.timeout}`);
      }

      if (job.environment) {
        yaml.push(`    environment: ${job.environment}`);
      }

      yaml.push('    steps:');

      for (const step of job.steps) {
        yaml.push(`      - name: ${step.name}`);

        if (step.uses) {
          yaml.push(`        uses: ${step.uses}`);
        }

        if (step.with) {
          yaml.push('        with:');
          Object.entries(step.with).forEach(([key, value]) => {
            yaml.push(`          ${key}: ${value}`);
          });
        }

        if (step.run) {
          yaml.push(`        run: ${step.run}`);
        }
      }

      yaml.push('');
    }

    return yaml.join('\n');
  }

  /**
   * Parse workflow YAML (simplified parser)
   */
  private parseWorkflowYAML(content: string): CIWorkflow | null {
    // This is a simplified YAML parser for demonstration
    // In production, use a proper YAML library like js-yaml
    const lines = content.split('\n');
    const workflow: Partial<CIWorkflow> = {
      jobs: [],
      triggers: [],
      provider: 'github',
      enabled: true
    };

    let currentJob: Partial<CIJob> | null = null;
    let currentStep: Partial<CIStep> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('name:')) {
        workflow.name = trimmed.split(':')[1].trim().toLowerCase().replace(/\s+/g, '-');
        workflow.description = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('on:')) {
        // Parse triggers
        continue;
      } else if (trimmed.startsWith('push:') || trimmed.startsWith('pull_request:')) {
        const trigger = trimmed.split(':')[0];
        if (!workflow.triggers!.includes(trigger)) {
          workflow.triggers!.push(trigger);
        }
      } else if (trimmed.startsWith('jobs:')) {
        continue;
      } else if (trimmed.match(/^\s+[a-zA-Z0-9_-]+:$/)) {
        // New job
        if (currentJob) {
          workflow.jobs!.push(currentJob as CIJob);
        }
        currentJob = {
          name: trimmed.trim().replace(':', ''),
          runsOn: ['ubuntu-latest'],
          steps: []
        };
      } else if (trimmed.includes('runs-on:') && currentJob) {
        const runsOn = trimmed.split(':')[1].trim();
        currentJob.runsOn = [runsOn];
      } else if (trimmed.includes('timeout-minutes:') && currentJob) {
        const timeout = parseInt(trimmed.split(':')[1].trim());
        currentJob.timeout = timeout;
      } else if (trimmed.includes('environment:') && currentJob) {
        currentJob.environment = trimmed.split(':')[1].trim();
      } else if (trimmed.includes('steps:') && currentJob) {
        continue;
      } else if (trimmed.includes('- name:') && currentJob) {
        if (currentStep) {
          currentJob.steps!.push(currentStep as CIStep);
        }
        currentStep = {
          name: trimmed.split(':')[1].trim().replace(/['"]/g, ''),
          action: ''
        };
      } else if (trimmed.includes('uses:') && currentStep) {
        currentStep.uses = trimmed.split(':')[1].trim();
        currentStep.action = trimmed.split(':')[1].split('@')[0];
      } else if (trimmed.includes('run:') && currentStep) {
        currentStep.run = trimmed.split(':')[1].trim().replace(/['"]/g, '');
        currentStep.action = 'run';
      }
    }

    // Add final job and step
    if (currentJob && currentStep) {
      currentJob.steps!.push(currentStep as CIStep);
      workflow.jobs!.push(currentJob as CIJob);
    }

    return workflow.name ? workflow as CIWorkflow : null;
  }

  /**
   * Validate individual workflow
   */
  private async validateWorkflow(workflow: CIWorkflow, result: CIValidationResult): Promise<void> {
    // Check required fields
    if (!workflow.name) {
      result.errors.push('Workflow missing name');
      result.valid = false;
    }

    if (!workflow.triggers || workflow.triggers.length === 0) {
      result.errors.push(`Workflow ${workflow.name} has no triggers`);
      result.valid = false;
    }

    if (!workflow.jobs || workflow.jobs.length === 0) {
      result.errors.push(`Workflow ${workflow.name} has no jobs`);
      result.valid = false;
    }

    // Validate jobs
    for (const job of workflow.jobs) {
      if (!job.name) {
        result.errors.push(`Workflow ${workflow.name} has job without name`);
        result.valid = false;
      }

      if (!job.runsOn || job.runsOn.length === 0) {
        result.errors.push(`Workflow ${workflow.name} job ${job.name} has no runs-on configuration`);
        result.valid = false;
      }

      if (!job.steps || job.steps.length === 0) {
        result.warnings.push(`Workflow ${workflow.name} job ${job.name} has no steps`);
      }

      // Validate steps
      for (const step of job.steps) {
        if (!step.name) {
          result.errors.push(`Workflow ${workflow.name} job ${job.name} has step without name`);
          result.valid = false;
        }

        if (!step.uses && !step.run) {
          result.errors.push(`Workflow ${workflow.name} job ${job.name} step ${step.name} has no action`);
          result.valid = false;
        }
      }

      // Check timeout
      if (job.timeout && job.timeout > 60) {
        result.warnings.push(`Workflow ${workflow.name} job ${job.name} has long timeout (${job.timeout} minutes)`);
      }
    }
  }

  /**
   * Validate provider-specific requirements
   */
  private async validateProviderRequirements(result: CIValidationResult): Promise<void> {
    const provider = result.provider;

    if (provider === 'github') {
      // Check if this is a GitHub repository
      try {
        const { execSync } = require('child_process');
        const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();

        if (!remoteUrl.includes('github.com')) {
          result.warnings.push('GitHub Actions configured but not in a GitHub repository');
        }
      } catch (error) {
        result.warnings.push('Could not verify GitHub repository status');
      }

      // Check for GitHub token in environment (for local testing)
      if (!process.env.GITHUB_TOKEN) {
        result.warnings.push('GITHUB_TOKEN not found in environment - some GitHub Actions features may not work');
      }
    }

    if (provider === 'gitlab') {
      // Check for GitLab CI file
      if (!fs.existsSync('.gitlab-ci.yml')) {
        result.warnings.push('GitLab CI configured but .gitlab-ci.yml not found');
      }
    }

    if (provider === 'circleci') {
      // Check for CircleCI config directory
      if (!fs.existsSync('.circleci')) {
        result.warnings.push('CircleCI configured but .circleci directory not found');
      }
    }
  }
}

// Export for use in main CLI
export { createCICommand as default };