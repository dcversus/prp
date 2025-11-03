import { Command } from 'commander';
import inquirer from 'inquirer';
// import chalk from 'chalk'; // Temporarily commented for linting
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';
import { PRPCli } from '../core/cli';
import { ConfigurationManager } from '../config/manager';
import { ValidationError, FileSystemError } from '../utils/error-handler';
import type { CommandResult, PRPConfig } from '../types';

/**
 * Available project templates
 */
const PROJECT_TEMPLATES = [
  {
    name: 'node-typescript',
    description: 'Node.js with TypeScript',
    language: 'JavaScript',
    framework: 'Node.js'
  },
  {
    name: 'react-typescript',
    description: 'React with TypeScript',
    language: 'JavaScript',
    framework: 'React'
  },
  {
    name: 'nextjs',
    description: 'Next.js full-stack application',
    language: 'JavaScript',
    framework: 'Next.js'
  },
  {
    name: 'express',
    description: 'Express.js server',
    language: 'JavaScript',
    framework: 'Express'
  },
  {
    name: 'python',
    description: 'Python application',
    language: 'Python',
    framework: 'Python'
  },
  {
    name: 'django',
    description: 'Django web application',
    language: 'Python',
    framework: 'Django'
  },
  {
    name: 'fastapi',
    description: 'FastAPI web application',
    language: 'Python',
    framework: 'FastAPI'
  },
  {
    name: 'go',
    description: 'Go application',
    language: 'Go',
    framework: 'Go'
  },
  {
    name: 'cli',
    description: 'CLI tool',
    language: 'JavaScript',
    framework: 'CLI'
  },
  {
    name: 'library',
    description: 'Library project',
    language: 'JavaScript',
    framework: 'Library'
  }
];

/**
 * Init command
 */
export class InitCommand {
  private cli: PRPCli;
  private configManager: ConfigurationManager;

  constructor(cli: PRPCli) {
    this.cli = cli;
    this.configManager = cli.getConfigManager();
  }

  /**
   * Register command with Commander
   */
  register(): Command {
    const command = new Command('init')
      .description('Initialize a new PRP project or upgrade existing project')
      .option('-t, --template <template>', 'Project template to use')
      .option('-n, --name <name>', 'Project name')
      .option('-d, --description <description>', 'Project description')
      .option('-a, --author <author>', 'Project author')
      .option('-l, --license <license>', 'Project license', 'MIT')
      .option('--existing', 'Initialize existing project')
      .option('--no-interactive', 'Non-interactive mode')
      .option('--skip-git', 'Skip Git initialization')
      .option('--no-install', 'Skip dependency installation')
      .option('-p, --package-manager <manager>', 'Package manager (npm, yarn, pnpm)', 'npm')
      .action(async (options, command) => {
        const result = await this.execute(options);
        if (!result.success) {
          process.exit(result.exitCode);
        }
      });

    return command;
  }

  /**
   * Execute init command
   */
  async execute(options: any): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      logger.info('🚀 Initializing PRP project...');

      // Determine if this is an existing project
      const isExisting = options.existing || await this.detectExistingProject();

      if (isExisting) {
        return await this.initializeExistingProject(options);
      } else {
        return await this.initializeNewProject(options);
      }

    } catch (error) {
      const result = await this.cli['errorHandler'].handle(error as Error);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Initialize new project
   */
  private async initializeNewProject(options: any): Promise<CommandResult> {
    logger.info('Creating new project...');

    // Collect project information
    const projectInfo = await this.collectProjectInfo(options);

    // Validate project name
    this.validateProjectName(projectInfo.name);

    // Create project directory
    const projectPath = path.resolve(projectInfo.name);
    if (fs.existsSync(projectPath)) {
      throw new FileSystemError(`Directory '${projectInfo.name}' already exists`);
    }

    await fs.ensureDir(projectPath);
    logger.debug(`Created project directory: ${projectPath}`);

    // Create configuration
    const config = await this.createConfiguration(projectInfo);

    // Initialize project structure
    await this.initializeProjectStructure(projectPath, config, projectInfo);

    // Initialize Git repository
    if (!options.skipGit) {
      await this.initializeGit(projectPath);
    }

    // Install dependencies
    if (options.install !== false) {
      await this.installDependencies(projectPath, projectInfo.packageManager);
    }

    logger.success(`✅ Project '${projectInfo.name}' initialized successfully!`);
    logger.info('\nNext steps:');
    logger.info(`  cd ${projectInfo.name}`);
    logger.info('  prp dev          # Start development server');
    logger.info('  prp test         # Run tests');
    logger.info('  prp build        # Build for production');
    logger.info('  prp quality      # Run quality gates');

    return {
      success: true,
      exitCode: 0,
      stdout: `Project '${projectInfo.name}' initialized successfully`,
      stderr: '',
      duration: Date.now() - Date.now(),
      data: { projectPath, config }
    };
  }

  /**
   * Initialize existing project
   */
  private async initializeExistingProject(options: any): Promise<CommandResult> {
    logger.info('Upgrading existing project...');

    // Detect project type and configuration
    const projectInfo = await this.analyzeExistingProject();

    // Create or update configuration
    const config = await this.createConfiguration({
      ...projectInfo,
      ...options
    });

    // Save configuration
    await this.configManager.save(config, '.prprc');

    // Update package.json scripts
    await this.updatePackageScripts(config);

    // Setup quality gates
    await this.setupQualityGates(config);

    logger.success('✅ Existing project upgraded successfully!');
    logger.info('\nNew commands available:');
    logger.info('  prp dev          # Start development server');
    logger.info('  prp test         # Run tests');
    logger.info('  prp quality      # Run quality gates');
    logger.info('  prp build        # Build for production');

    return {
      success: true,
      exitCode: 0,
      stdout: 'Existing project upgraded successfully',
      stderr: '',
      duration: Date.now() - Date.now(),
      data: { config }
    };
  }

  /**
   * Collect project information from user
   */
  private async collectProjectInfo(options: any): Promise<any> {
    if (options.noInteractive) {
      // Non-interactive mode - use provided options or defaults
      return {
        name: options.name || 'my-prp-project',
        description: options.description || 'A PRP project',
        author: options.author || process.env.USER || 'Developer',
        license: options.license || 'MIT',
        template: options.template || 'node-typescript',
        packageManager: options.packageManager || 'npm'
      };
    }

    // Interactive mode
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: options.name || 'my-prp-project',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Project name is required';
          }
          if (!/^[a-z0-9-_]+$/.test(input)) {
            return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: options.description || 'A PRP project'
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author:',
        default: options.author || process.env.USER || 'Developer'
      },
      {
        type: 'list',
        name: 'template',
        message: 'Choose project template:',
        choices: PROJECT_TEMPLATES.map(t => ({
          name: `${t.name.padEnd(20)} - ${t.description}`,
          value: t.name
        })),
        default: options.template || 'node-typescript'
      },
      {
        type: 'list',
        name: 'packageManager',
        message: 'Choose package manager:',
        choices: [
          { name: 'npm', value: 'npm' },
          { name: 'yarn', value: 'yarn' },
          { name: 'pnpm', value: 'pnpm' }
        ],
        default: options.packageManager || 'npm'
      }
    ];

    return await inquirer.prompt(questions);
  }

  /**
   * Detect if this is an existing project
   */
  private async detectExistingProject(): Promise<boolean> {
    const indicators = [
      'package.json',
      'requirements.txt',
      'go.mod',
      'Cargo.toml',
      '.git'
    ];

    for (const indicator of indicators) {
      if (fs.existsSync(indicator)) {
        logger.debug(`Found existing project indicator: ${indicator}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze existing project
   */
  private async analyzeExistingProject(): Promise<any> {
    const projectInfo: any = {
      name: path.basename(process.cwd()),
      description: '',
      author: '',
      template: 'node-typescript',
      packageManager: 'npm'
    };

    // Try to read package.json
    if (fs.existsSync('package.json')) {
      try {
        const packageJson = await fs.readJson('package.json');
        projectInfo.name = packageJson.name || projectInfo.name;
        projectInfo.description = packageJson.description || projectInfo.description;
        projectInfo.author = packageJson.author || projectInfo.author;
        projectInfo.packageManager = this.detectPackageManager(packageJson);
        projectInfo.template = this.detectTemplate(packageJson);
      } catch (error) {
        logger.warn('Failed to read package.json:', error);
      }
    }

    return projectInfo;
  }

  /**
   * Detect package manager from package.json
   */
  private detectPackageManager(packageJson: any): string {
    if (packageJson.packageManager) {
      const manager = packageJson.packageManager.split('@')[0];
      if (['npm', 'yarn', 'pnpm'].includes(manager)) {
        return manager;
      }
    }

    // Check for lock files
    if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (fs.existsSync('yarn.lock')) return 'yarn';
    if (fs.existsSync('package-lock.json')) return 'npm';

    return 'npm';
  }

  /**
   * Detect project template from package.json
   */
  private detectTemplate(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.react && deps.next) return 'nextjs';
    if (deps.react) return 'react-typescript';
    if (deps.express) return 'express';
    if (deps.django) return 'django';
    if (deps.fastapi) return 'fastapi';
    if (deps.commander || deps.yargs) return 'cli';

    return 'node-typescript';
  }

  /**
   * Create project configuration
   */
  private async createConfiguration(projectInfo: any): Promise<PRPConfig> {
    const config: PRPConfig = {
      name: projectInfo.name,
      version: '1.0.0',
      description: projectInfo.description,
      type: projectInfo.template,
      author: projectInfo.author,
      license: projectInfo.license || 'MIT',
      settings: {
        debug: {
          enabled: true,
          level: 'info',
          output: 'console',
          components: {
            cli: true,
            build: true,
            test: true,
            lint: true,
            deploy: true
          }
        },
        quality: {
          enabled: true,
          strict: false,
          gates: {
            lint: {
              enabled: true,
              tools: this.getLintingTools(projectInfo.template),
              failOnWarnings: false,
              maxWarnings: 5
            },
            test: {
              enabled: true,
              coverage: {
                enabled: true,
                minimum: 80,
                threshold: 5
              },
              failures: {
                maximum: 0
              }
            },
            security: {
              enabled: true,
              tools: ['npm-audit'],
              failOnHigh: true,
              failOnMedium: false
            }
          },
          preCommitHooks: true,
          prePushHooks: true
        },
        build: {
          mode: 'production',
          output: this.getOutputDirectory(projectInfo.template),
          clean: true,
          sourcemap: true,
          minify: true,
          incremental: true,
          parallel: true
        },
        test: {
          type: 'all',
          framework: this.getTestFramework(projectInfo.template),
          coverage: true,
          parallel: true,
          testEnvironment: this.getTestEnvironment(projectInfo.template)
        },
        ci: {
          provider: 'github',
          enabled: false,
          workflows: {}
        },
        development: {
          port: this.getDevPort(projectInfo.template),
          hotReload: true,
          open: true
        },
        packageManager: {
          type: projectInfo.packageManager,
          cache: true,
          audit: true
        }
      },
      scripts: this.getDefaultScripts(projectInfo.template)
    };

    return config;
  }

  /**
   * Validate project name
   */
  private validateProjectName(name: string): void {
    if (!name || !name.trim()) {
      throw new ValidationError('Project name is required');
    }

    if (!/^[a-z0-9-_]+$/.test(name)) {
      throw new ValidationError('Project name can only contain lowercase letters, numbers, hyphens, and underscores');
    }

    if (name.length > 214) {
      throw new ValidationError('Project name is too long (max 214 characters)');
    }
  }

  /**
   * Initialize project structure
   */
  private async initializeProjectStructure(
    projectPath: string,
    config: PRPConfig,
    projectInfo: any
  ): Promise<void> {
    // Create basic directory structure
    const directories = [
      'src',
      'tests',
      'docs',
      '.github/workflows'
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(projectPath, dir));
    }

    // Create basic files
    await this.createBasicFiles(projectPath, config, projectInfo);
  }

  /**
   * Create basic project files
   */
  private async createBasicFiles(
    projectPath: string,
    config: PRPConfig,
    projectInfo: any
  ): Promise<void> {
    // Create .prprc
    await this.configManager.save(config, path.join(projectPath, '.prprc'));

    // Create package.json for Node.js projects
    if (projectInfo.template.startsWith('node') ||
        projectInfo.template.includes('react') ||
        projectInfo.template === 'cli') {
      await this.createPackageJson(projectPath, config, projectInfo);
    }

    // Create README.md
    await this.createReadme(projectPath, config);

    // Create .gitignore
    await this.createGitignore(projectPath, projectInfo.template);

    // Create basic source files
    await this.createSourceFiles(projectPath, projectInfo.template);
  }

  /**
   * Create package.json
   */
  private async createPackageJson(
    projectPath: string,
    config: PRPConfig,
    projectInfo: any
  ): Promise<void> {
    const packageJson = {
      name: config.name,
      version: config.version,
      description: config.description,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: config.scripts,
      keywords: ['prp', 'cli', 'bootstrap'],
      author: config.author,
      license: config.license,
      engines: {
        node: '>=16.0.0'
      },
      devDependencies: this.getDevDependencies(projectInfo.template)
    };

    await fs.writeJson(
      path.join(projectPath, 'package.json'),
      packageJson,
      { spaces: 2 }
    );
  }

  /**
   * Create README.md
   */
  private async createReadme(projectPath: string, config: PRPConfig): Promise<void> {
    const readme = `# ${config.name}

${config.description || 'A PRP project'}

## Getting Started

\`\`\`bash
# Install dependencies
${this.getInstallCommand(config.settings.packageManager?.type || 'npm')}

# Start development
prp dev

# Run tests
prp test

# Build for production
prp build

# Run quality gates
prp quality
\`\`\`

## Features

- ✅ TypeScript support
- ✅ Automated testing
- ✅ Code quality gates
- ✅ CI/CD pipeline
- ✅ Hot reload development
- ✅ Production builds

## Configuration

Project configuration is managed through \`.prprc\` file.

## Scripts

${Object.entries(config.scripts || {})
  .map(([script, command]) => `- \`${script}\`: ${command}`)
  .join('\n')}

## License

${config.license}
`;

    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
  }

  /**
   * Create .gitignore
   */
  private async createGitignore(projectPath: string, template: string): Promise<void> {
    const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
`;

    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
  }

  /**
   * Create basic source files
   */
  private async createSourceFiles(projectPath: string, template: string): Promise<void> {
    const srcPath = path.join(projectPath, 'src');

    if (template.includes('typescript') || template === 'node-typescript') {
      // Create TypeScript files
      await fs.writeFile(
        path.join(srcPath, 'index.ts'),
        `/**
 * Main entry point
 */

console.log('Hello from ${path.basename(projectPath)}!');

export function hello(name: string = 'World'): string {
  return 'Hello, ' + name + '!';
}

if (require.main === module) {
  console.log(hello());
}
`
      );

      // Create test file
      await fs.writeFile(
        path.join(projectPath, 'tests', 'index.test.ts'),
        `import { hello } from '../src/index';

describe('hello function', () => {
  it('should return greeting with default name', () => {
    expect(hello()).toBe('Hello, World!');
  });

  it('should return greeting with custom name', () => {
    expect(hello('PRP')).toBe('Hello, PRP!');
  });
});
`
      );
    }
  }

  /**
   * Initialize Git repository
   */
  private async initializeGit(projectPath: string): Promise<void> {
    try {
      const { execSync } = require('child_process');

      execSync('git init', { cwd: projectPath, stdio: 'ignore' });
      execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
      execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'ignore' });

      logger.debug('Git repository initialized');
    } catch (error) {
      logger.warn('Failed to initialize Git repository:', error);
    }
  }

  /**
   * Install dependencies
   */
  private async installDependencies(projectPath: string, packageManager: string): Promise<void> {
    try {
      const { execSync } = require('child_process');

      logger.info('Installing dependencies...');

      const installCommand = packageManager === 'yarn' ? 'yarn' :
                           packageManager === 'pnpm' ? 'pnpm install' :
                           'npm install';

      execSync(installCommand, { cwd: projectPath, stdio: 'inherit' });

      logger.success('Dependencies installed successfully');
    } catch (error) {
      logger.warn('Failed to install dependencies:', error);
      logger.info('You can install dependencies manually with:');
      logger.info(`  cd ${projectPath}`);
      logger.info(`  ${packageManager} install`);
    }
  }

  // Helper methods for getting template-specific values
  private getLintingTools(template: string): string[] {
    const tools = ['eslint'];
    if (template.includes('typescript')) {
      tools.push('@typescript-eslint/eslint-plugin');
    }
    return tools;
  }

  private getOutputDirectory(template: string): string {
    if (template.includes('react') || template === 'nextjs') return 'build';
    if (template.includes('python')) return 'build';
    return 'dist';
  }

  private getTestFramework(template: string): string {
    if (template.includes('python')) return 'pytest';
    return 'jest';
  }

  private getTestEnvironment(template: string): string {
    if (template.includes('react')) return 'jsdom';
    return 'node';
  }

  private getDevPort(template: string): number {
    if (template.includes('react') || template === 'nextjs') return 3000;
    if (template.includes('express')) return 8000;
    return 3000;
  }

  private getDefaultScripts(template: string): Record<string, string> {
    const scripts: Record<string, string> = {
      dev: 'prp dev',
      build: 'prp build',
      test: 'prp test',
      'test:watch': 'prp test --watch',
      'test:coverage': 'prp test --coverage',
      lint: 'prp lint',
      'lint:fix': 'prp lint --fix',
      quality: 'prp quality',
      start: 'node dist/index.js'
    };

    if (template.includes('typescript')) {
      scripts.typecheck = 'tsc --noEmit';
    }

    return scripts;
  }

  private getDevDependencies(template: string): Record<string, string> {
    const deps: Record<string, string> = {};
    deps['@dcversus/prp'] = '^1.0.0';
    deps['typescript'] = '^5.0.0';
    deps['@types/node'] = '^20.0.0';
    deps['jest'] = '^29.0.0';
    deps['@types/jest'] = '^29.0.0';
    deps['ts-jest'] = '^29.0.0';
    deps['eslint'] = '^8.0.0';
    deps['prettier'] = '^3.0.0';

    if (template.includes('typescript')) {
      deps['@typescript-eslint/eslint-plugin'] = '^6.0.0';
      deps['@typescript-eslint/parser'] = '^6.0.0';
    }

    return deps;
  }

  private getInstallCommand(packageManager: string): string {
    switch (packageManager) {
      case 'yarn':
        return 'yarn';
      case 'pnpm':
        return 'pnpm install';
      default:
        return 'npm install';
    }
  }

  private async updatePackageScripts(config: PRPConfig): Promise<void> {
    if (!fs.existsSync('package.json')) {
      return;
    }

    try {
      const packageJson = await fs.readJson('package.json');
      packageJson.scripts = {
        ...packageJson.scripts,
        ...config.scripts
      };

      await fs.writeJson('package.json', packageJson, { spaces: 2 });
      logger.debug('Updated package.json scripts');
    } catch (error) {
      logger.warn('Failed to update package.json scripts:', error);
    }
  }

  private async setupQualityGates(config: PRPConfig): Promise<void> {
    // This would setup linting config files, test configs, etc.
    logger.debug('Setting up quality gates');
    // Implementation details would depend on the specific tools
  }
}