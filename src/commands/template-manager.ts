/**
 * ♫ Template Manager for @dcversus/prp
 *
 * Manages project templates, template discovery, and application
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLayerLogger } from '../shared';
import { ProjectTemplate } from './types';
import { getDependencyVersion, getVersionBanner } from '../utils/version';

const logger = createLayerLogger('config');

interface TemplateRegistry {
  templates: Record<string, ProjectTemplate>;
  categories: Record<string, string[]>;
  lastUpdated: Date;
}

/**
 * Template Manager - Handles project templates
 */
export class TemplateManager {
  private registry: TemplateRegistry;
  private cache: Map<string, ProjectTemplate> = new Map();
  constructor() {
    this.registry = {
      templates: {},
      categories: {},
      lastUpdated: new Date()
    };
    // Store config for potential future use
  }

  /**
   * Initialize template manager
   */
  async initialize(): Promise<void> {
    logger.info('initialize', 'Initializing template manager');

    try {
      // Load built-in templates
      await this.loadBuiltinTemplates();

      // Load external templates from registry
      await this.loadExternalTemplates();

      // Build category index
      this.buildCategoryIndex();

      logger.info('initialize', `Loaded ${Object.keys(this.registry.templates).length} templates`);

    } catch (error) {
      logger.error('initialize', 'Failed to initialize template manager', error instanceof Error ? error : new Error(String(error)), {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<ProjectTemplate[]> {
    return Object.values(this.registry.templates);
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ProjectTemplate> {
    let template = this.cache.get(templateId);

    if (!template) {
      template = this.registry.templates[templateId];
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Cache the template
      this.cache.set(templateId, template);
    }

    return template;
  }

  /**
   * Apply template to project directory
   */
  async applyTemplate(template: ProjectTemplate, projectPath: string, projectName?: string, projectDescription?: string): Promise<void> {
    logger.info('applyTemplate', `Applying template ${template.name} to ${projectPath}`, {
      templateId: template.id
    });

    try {
      // Create project structure
      await this.createProjectStructure(template, projectPath);

      // Write template files
      await this.writeTemplateFiles(template, projectPath);

      // Setup package.json
      await this.setupPackageJson(template, projectPath, projectName, projectDescription);

      // Create .gitignore
      await this.createGitignore(template, projectPath);

      // Execute post-setup actions
      await this.executePostSetup(template);

      logger.info('applyTemplate', 'Template applied successfully');

    } catch (error) {
      logger.error('applyTemplate', 'Failed to apply template', error instanceof Error ? error : new Error(String(error)), {
        templateId: template.id,
        projectPath
      });
      throw error;
    }
  }

  /**
   * Load built-in templates
   */
  private async loadBuiltinTemplates(): Promise<void> {
    const builtinTemplates = this.createBuiltinTemplates();

    for (const template of builtinTemplates) {
      this.registry.templates[template.id] = template;
    }

    logger.debug('loadBuiltinTemplates', `Loaded ${builtinTemplates.length} built-in templates`);
  }

  /**
   * Load external templates from registry
   */
  private async loadExternalTemplates(): Promise<void> {
    // In a real implementation, this would fetch templates from external registry
    // For now, we'll use local templates directory
    try {
      const templatesDir = join(__dirname, '../../templates');
      const templateDirs = await fs.readdir(templatesDir);

      for (const templateDir of templateDirs) {
        const templatePath = join(templatesDir, templateDir, 'template.json');
        try {
          const templateData = await fs.readFile(templatePath, 'utf8');
          const template = JSON.parse(templateData) as ProjectTemplate;
          this.registry.templates[template.id] = template;
        } catch (error) {
          logger.warn('loadExternalTemplates', `Failed to load template: ${templateDir}`, {
            error: error instanceof Error ? error.message : String(error),
            templateDir
          });
        }
      }
    } catch {
      logger.debug('loadExternalTemplates', 'No external templates directory found');
    }
  }

  /**
   * Create built-in templates
   */
  private createBuiltinTemplates(): ProjectTemplate[] {
    return [
      this.createFastTemplate(),
      this.createMinimalTemplate(),
      this.createAllTemplate(),
      this.createLandingPageTemplate()
    ];
  }

  /**
   * Create fast template
   */
  private createFastTemplate(): ProjectTemplate {
    return {
      id: 'fast',
      name: 'Fast Setup',
      description: 'Quick setup with essential PRP CLI files and agent configuration',
      category: 'cli',
      features: [
        'AGENTS.md with basic agent setup',
        'PRPs/ directory structure',
        '.prprc configuration file',
        'Basic README.md',
        'Git initialization',
        'Node.js project setup'
      ],
      files: [
        {
          path: 'AGENTS.md',
          content: this.getAgentsMdContent(),
          encoding: 'utf8'
        },
        {
          path: '.prprc',
          content: this.getPrprcContent('fast'),
          encoding: 'utf8'
        },
        {
          path: 'README.md',
          content: this.getReadmeContent('fast'),
          encoding: 'utf8'
        },
        {
          path: '.gitignore',
          content: this.getGitignoreContent('node'),
          encoding: 'utf8'
        }
      ],
      dependencies: {
        production: {},
        development: {
          '@dcversus/prp': getDependencyVersion(),
          'typescript': '^5.0.0',
          '@types/node': '^20.0.0',
          'tsx': '^4.0.0'
        }
      },
      scripts: {
        'dev': 'tsx src/index.ts',
        'build': 'tsc',
        'start': 'node dist/index.js',
        'test': 'echo "No tests specified" && exit 0'
      },
      gitignore: ['node_modules', 'dist', '.env', '*.log'],
      postSetup: [
        {
          type: 'git',
          action: 'init',
          description: 'Initialize git repository'
        },
        {
          type: 'npm',
          action: 'install',
          description: 'Install dependencies'
        }
      ]
    };
  }

  /**
   * Create minimal template
   */
  private createMinimalTemplate(): ProjectTemplate {
    return {
      id: 'minimal',
      name: 'Minimal Setup',
      description: 'Bare minimum setup with just PRP CLI configuration',
      category: 'cli',
      features: [
        '.prprc configuration file',
        'Basic project structure',
        'Git initialization'
      ],
      files: [
        {
          path: '.prprc',
          content: this.getPrprcContent('minimal'),
          encoding: 'utf8'
        },
        {
          path: 'README.md',
          content: this.getReadmeContent('minimal'),
          encoding: 'utf8'
        }
      ],
      dependencies: {
        production: {},
        development: {
          '@dcversus/prp': getDependencyVersion()
        }
      },
      scripts: {
        'test': 'echo "No tests specified" && exit 0'
      },
      gitignore: ['node_modules', '.env', '*.log'],
      postSetup: [
        {
          type: 'git',
          action: 'init',
          description: 'Initialize git repository'
        }
      ]
    };
  }

  /**
   * Create all template
   */
  private createAllTemplate(): ProjectTemplate {
    return {
      id: 'all',
      name: 'Complete Setup',
      description: 'Full-featured setup with all PRP CLI components and configurations',
      category: 'fullstack',
      features: [
        'Complete AGENTS.md with all agents',
        'Comprehensive PRP templates',
        'Full .prprc configuration',
        'CI/CD pipeline setup',
        'Testing framework',
        'Development tools',
        'Documentation templates',
        'Multi-provider authentication'
      ],
      files: [
        {
          path: 'AGENTS.md',
          content: this.getAgentsMdContent('full'),
          encoding: 'utf8'
        },
        {
          path: '.prprc',
          content: this.getPrprcContent('all'),
          encoding: 'utf8'
        },
        {
          path: 'README.md',
          content: this.getReadmeContent('all'),
          encoding: 'utf8'
        },
        {
          path: '.github/workflows/ci.yml',
          content: this.getCIWorkflowContent(),
          encoding: 'utf8'
        },
        {
          path: '.gitignore',
          content: this.getGitignoreContent('full'),
          encoding: 'utf8'
        }
      ],
      dependencies: {
        production: {},
        development: {
          '@dcversus/prp': getDependencyVersion(),
          'typescript': '^5.0.0',
          '@types/node': '^20.0.0',
          'tsx': '^4.0.0',
          'jest': '^29.0.0',
          '@types/jest': '^29.0.0',
          'eslint': '^8.0.0',
          'prettier': '^3.0.0'
        }
      },
      scripts: {
        'dev': 'tsx src/index.ts',
        'build': 'tsc',
        'start': 'node dist/index.js',
        'test': 'jest',
        'lint': 'eslint src --ext .ts',
        'format': 'prettier --write src/**/*.ts'
      },
      gitignore: [
        'node_modules', 'dist', '.env', '*.log',
        'coverage', '.nyc_output', 'junit.xml'
      ],
      postSetup: [
        {
          type: 'git',
          action: 'init',
          description: 'Initialize git repository'
        },
        {
          type: 'npm',
          action: 'install',
          description: 'Install dependencies'
        }
      ]
    };
  }

  /**
   * Create landing page template
   */
  private createLandingPageTemplate(): ProjectTemplate {
    return {
      id: 'landing-page',
      name: 'Landing Page',
      description: 'Static landing page with deployment configuration and optional dancing monkeys',
      category: 'landing-page',
      features: [
        'Modern HTML5 landing page',
        'Responsive design with CSS Grid',
        'Animated dancing monkeys (optional)',
        'GitHub Pages deployment',
        'SEO optimization',
        'Performance optimization'
      ],
      files: [
        {
          path: 'index.html',
          content: this.getLandingPageHtmlContent(),
          encoding: 'utf8'
        },
        {
          path: 'style.css',
          content: this.getLandingPageCssContent(),
          encoding: 'utf8'
        },
        {
          path: 'script.js',
          content: this.getLandingPageJsContent(),
          encoding: 'utf8'
        },
        {
          path: 'README.md',
          content: this.getReadmeContent('landing-page'),
          encoding: 'utf8'
        },
        {
          path: '.prprc',
          content: this.getPrprcContent('landing-page'),
          encoding: 'utf8'
        }
      ],
      dependencies: {
        production: {},
        development: {
          '@dcversus/prp': getDependencyVersion()
        }
      },
      scripts: {
        'dev': 'python3 -m http.server 8000',
        'deploy': 'prp deploy --landing-page',
        'deploy:monkeys': 'prp deploy --dancing-monkeys'
      },
      gitignore: ['.DS_Store', '*.log'],
      postSetup: [
        {
          type: 'git',
          action: 'init',
          description: 'Initialize git repository'
        }
      ]
    };
  }

  /**
   * Build category index
   */
  private buildCategoryIndex(): void {
    this.registry.categories = {};

    for (const template of Object.values(this.registry.templates)) {
      const category = template.category;
      this.registry.categories[category] ??= [];
      this.registry.categories[category].push(template.id);
    }

    logger.debug('buildCategoryIndex', 'Built category index');
  }

  /**
   * Create project structure
   */
  private async createProjectStructure(template: ProjectTemplate, projectPath: string): Promise<void> {
    const directories = new Set<string>();

    // Extract directories from file paths
    for (const file of template.files) {
      const dir = file.path.split('/').slice(0, -1).join('/');
      if (dir) {
        directories.add(dir);
      }
    }

    // Create directories
    for (const dir of Array.from(directories)) {
      const fullPath = join(projectPath, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }

    logger.debug('createProjectStructure', `Created ${directories.size} directories`);
  }

  /**
   * Write template files
   */
  private async writeTemplateFiles(template: ProjectTemplate, projectPath: string): Promise<void> {
    for (const file of template.files) {
      const filePath = join(projectPath, file.path);
      await fs.writeFile(filePath, file.content, file.encoding ?? 'utf8');

      if (file.executable) {
        await fs.chmod(filePath, 0o755);
      }
    }

    logger.debug('writeTemplateFiles', `Wrote ${template.files.length} files`);
  }

  /**
   * Setup package.json
   */
  private async setupPackageJson(template: ProjectTemplate, projectPath: string, projectName?: string, projectDescription?: string): Promise<void> {
    const packageJsonPath = join(projectPath, 'package.json');
    const packageJson = {
      name: projectName ?? 'prp-project',
      version: '1.0.0',
      description: projectDescription ?? 'PRP CLI powered project',
      main: 'src/index.ts',
      scripts: template.scripts,
      dependencies: template.dependencies.production,
      devDependencies: template.dependencies.development,
      engines: {
        node: '>=18.0.0'
      }
    };

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    logger.debug('setupPackageJson', 'Created package.json');
  }

  /**
   * Create gitignore
   */
  private async createGitignore(template: ProjectTemplate, projectPath: string): Promise<void> {
    const gitignorePath = join(projectPath, '.gitignore');
    await fs.writeFile(gitignorePath, template.gitignore.join('\n'), 'utf8');
    logger.debug('createGitignore', 'Created .gitignore');
  }

  /**
   * Execute post-setup actions
   */
  private async executePostSetup(template: ProjectTemplate): Promise<void> {
    for (const action of template.postSetup) {
      logger.debug('executePostSetup', `Executing: ${action.type} - ${action.action}`);

      switch (action.type) {
        case 'npm':
          // Handled by the wizard
          break;
        case 'git':
          // Handled by the wizard
          break;
        case 'command':
          // Execute custom commands
          break;
        case 'file':
          // Create additional files
          break;
      }
    }
  }

  // Template content generators
  private getAgentsMdContent(mode: 'basic' | 'full' = 'basic'): string {
    if (mode === 'full') {
      return `# AGENTS.md - AI Agent Workflow System

**Project**: PRP Project
**Version**: 1.0

## 🤖 Available Agents

### robo-developer
- Role: Software development and implementation
- Capabilities: Code writing, debugging, testing
- Model: gpt-4

### robo-aqa
- Role: Quality assurance and testing
- Capabilities: Test creation, validation, bug detection
- Model: gpt-4

### robo-ux-ui-designer
- Role: User experience and interface design
- Capabilities: UI design, UX research, accessibility
- Model: gpt-4

### robo-system-analyst
- Role: System analysis and requirements
- Capabilities: Requirements gathering, system design
- Model: gpt-4

### robo-devops-sre
- Role: DevOps and site reliability
- Capabilities: Deployment, monitoring, infrastructure
- Model: gpt-4

### robo-orchestrator
- Role: Project orchestration and coordination
- Capabilities: Task coordination, signal management
- Model: gpt-4

## 🎵 Signal Workflow

This project uses the PRP CLI signal system for agent coordination.

---

*${getVersionBanner()}*
`;
    }

    return `# AGENTS.md - AI Agent Workflow System

**Project**: PRP Project
**Version**: 1.0

## 🤖 Basic Agent Setup

This project is configured with basic agent support for PRP CLI.

## 🎵 Signal Workflow

This project uses the PRP CLI signal system for agent coordination.

---

*${getVersionBanner()}*
`;
  }

  private getPrprcContent(mode: string): string {
    const baseConfig = {
      version: '1.0.0',
      agents: {
        enabled: ['robo-developer', 'robo-aqa']
      },
      templates: {
        default: mode
      }
    };

    if (mode === 'all') {
      baseConfig.agents.enabled = ['robo-developer', 'robo-aqa', 'robo-ux-ui-designer', 'robo-system-analyst', 'robo-devops-sre', 'robo-orchestrator'];
    }

    return JSON.stringify(baseConfig, null, 2);
  }

  private getReadmeContent(mode: string): string {
    const baseContent = `# PRP Project

This project was created using [PRP CLI](https://github.com/dcversus/prp) - Interactive Project Bootstrap CLI.

## 🚀 Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test
\`\`\`

## 🤖 AI Agents

This project is configured with AI agents for autonomous development.

`;

    if (mode === 'landing-page') {
      return `# Landing Page

A modern landing page created with PRP CLI.

## 🚀 Deployment

\`\`\`bash
# Deploy to GitHub Pages
npm run deploy

# Deploy with dancing monkeys
npm run deploy:monkeys
\`\`\`

## 🎨 Features

- Responsive design
- Modern CSS Grid layout
- SEO optimized
- Fast loading
- Optional dancing monkeys 🐵

---

*${getVersionBanner('Created with PRP CLI v{version}')}*
`;
    }

    return baseContent + `## 📚 Documentation

- [PRP CLI Documentation](https://github.com/dcversus/prp)
- [Agent Configuration](./AGENTS.md)

---

*${getVersionBanner('Created with PRP CLI v{version}')}*
`;
  }

  private getGitignoreContent(mode: string): string {
    const baseIgnores = [
      'node_modules',
      '.env',
      '*.log',
      'dist',
      '.DS_Store'
    ];

    if (mode === 'full') {
      baseIgnores.push(
        'coverage',
        '.nyc_output',
        'junit.xml',
        '.eslintcache',
        '.vscode/settings.json'
      );
    }

    return baseIgnores.join('\n');
  }

  private getCIWorkflowContent(): string {
    return `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Run linting
      run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build project
      run: npm run build
`;
  }

  private getLandingPageHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRP CLI - Landing Page</title>
    <link rel="stylesheet" href="style.css">
    <meta name="description" content="Created with PRP CLI - Interactive Project Bootstrap">
</head>
<body>
    <header class="hero">
        <div class="container">
            <h1 class="title">Welcome to PRP CLI</h1>
            <p class="subtitle">Interactive Project Bootstrap CLI</p>
            <div class="cta">
                <button class="btn btn-primary">Get Started</button>
                <button class="btn btn-secondary">Learn More</button>
            </div>
        </div>
    </header>

    <main>
        <section class="features">
            <div class="container">
                <h2>Features</h2>
                <div class="grid">
                    <div class="feature-card">
                        <h3>🤖 AI Agents</h3>
                        <p>Autonomous development with AI agents</p>
                    </div>
                    <div class="feature-card">
                        <h3>📋 PRP System</h3>
                        <p>Product Requirement Prompts for clear goals</p>
                    </div>
                    <div class="feature-card">
                        <h3>🎵 Signals</h3>
                        <p>Signal-based workflow coordination</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="showcase">
            <div class="container">
                <h2>Showcase</h2>
                <div class="demo-area">
                    <div id="monkey-container" class="monkey-container" style="display: none;">
                        <!-- Dancing monkeys will appear here -->
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2024 PRP CLI. Created with ♫ and 🐵</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>`;
  }

  private getLandingPageCssContent(): string {
    return `:root {
    --primary-color: #0ea5e9;
    --secondary-color: #64748b;
    --accent-color: #f59e0b;
    --text-color: #1f2937;
    --light-text: #6b7280;
    --background: #ffffff;
    --light-bg: #f8fafc;
    --border: #e2e8f0;
    --border-radius: 8px;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    background: var(--background);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Hero Section */
.hero {
    background: linear-gradient(135deg, var(--primary-color), #0891b2);
    color: white;
    padding: 80px 0;
    text-align: center;
}

.title {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 16px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
    font-size: 1.25rem;
    margin-bottom: 32px;
    opacity: 0.9;
}

.cta {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
}

.btn-primary {
    background: white;
    color: var(--primary-color);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
}

.btn-secondary:hover {
    background: white;
    color: var(--primary-color);
}

/* Features Section */
.features {
    padding: 80px 0;
    background: var(--light-bg);
}

.features h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 48px;
    color: var(--text-color);
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 32px;
}

.feature-card {
    background: white;
    padding: 32px;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    text-align: center;
    transition: transform 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

.feature-card h3 {
    font-size: 1.5rem;
    margin-bottom: 16px;
    color: var(--text-color);
}

.feature-card p {
    color: var(--light-text);
    line-height: 1.6;
}

/* Showcase Section */
.showcase {
    padding: 80px 0;
}

.showcase h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 48px;
    color: var(--text-color);
}

.demo-area {
    background: var(--light-bg);
    border-radius: var(--border-radius);
    padding: 48px;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.monkey-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    align-items: center;
}

.monkey {
    font-size: 3rem;
    animation: dance 2s ease-in-out infinite;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.monkey:hover {
    transform: scale(1.2);
}

@keyframes dance {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-20px) rotate(-5deg); }
    50% { transform: translateY(0px) rotate(5deg); }
    75% { transform: translateY(-10px) rotate(-3deg); }
}

/* Footer */
footer {
    background: var(--text-color);
    color: white;
    padding: 32px 0;
    text-align: center;
}

/* Responsive Design */
@media (max-width: 768px) {
    .title {
        font-size: 2.5rem;
    }

    .subtitle {
        font-size: 1.1rem;
    }

    .cta {
        flex-direction: column;
        align-items: center;
    }

    .grid {
        grid-template-columns: 1fr;
    }

    .container {
        padding: 0 16px;
    }
}`;
  }

  private getLandingPageJsContent(): string {
    return `// PRP CLI Landing Page Script

document.addEventListener('DOMContentLoaded', function() {
    logger.info('🎵 PRP CLI Landing Page loaded');

    // Initialize interactive elements
    initializeButtons();
    initializeMonkeys();
    initializeAnimations();
});

function initializeButtons() {
    const primaryBtn = document.querySelector('.btn-primary');
    const secondaryBtn = document.querySelector('.btn-secondary');

    if (primaryBtn) {
        primaryBtn.addEventListener('click', function() {
            alert('🚀 Getting started with PRP CLI!');
            logger.info('Primary button clicked');
        });
    }

    if (secondaryBtn) {
        secondaryBtn.addEventListener('click', function() {
            alert('📚 Learn more about PRP CLI at github.com/dcversus/prp');
            logger.info('Secondary button clicked');
        });
    }
}

function initializeMonkeys() {
    // Check if dancing monkeys are enabled
    const urlParams = new URLSearchParams(window.location.search);
    const monkeysEnabled = urlParams.get('monkeys') === 'true' ||
                          window.location.hash === '#monkeys' ||
                          Math.random() > 0.7; // 30% chance for monkeys

    if (monkeysEnabled) {
        showDancingMonkeys();
    }
}

function showDancingMonkeys() {
    const monkeyContainer = document.getElementById('monkey-container');
    if (!monkeyContainer) return;

    monkeyContainer.style.display = 'flex';

    const monkeyEmojis = ['🐵', '🙈', '🙉', '🙊', '🐒'];
    const numberOfMonkeys = 5 + Math.floor(Math.random() * 5); // 5-10 monkeys

    for (let i = 0; i < numberOfMonkeys; i++) {
        const monkey = document.createElement('div');
        monkey.className = 'monkey';
        monkey.textContent = monkeyEmojis[Math.floor(Math.random() * monkeyEmojis.length)];
        monkey.style.animationDelay = \`\${Math.random() * 2}s\`;

        monkey.addEventListener('click', function() {
            makeMonkeyDance(this);
        });

        monkeyContainer.appendChild(monkey);
    }

    logger.info(\`🐵 Spawned \${numberOfMonkeys} dancing monkeys!\`);
}

function makeMonkeyDance(monkey) {
    monkey.style.animation = 'none';
    setTimeout(() => {
        monkey.style.animation = 'dance 0.5s ease-in-out';
    }, 10);

    // Create sparkles
    createSparkles(monkey);
}

function createSparkles(element) {
    const rect = element.getBoundingClientRect();
    const sparkleCount = 8;

    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.textContent = '✨';
        sparkle.style.position = 'fixed';
        sparkle.style.left = \`\${rect.left + rect.width / 2}px\`;
        sparkle.style.top = \`\${rect.top + rect.height / 2}px\`;
        sparkle.style.fontSize = '1.5rem';
        sparkle.style.pointerEvents = 'none';
        sparkle.style.zIndex = '1000';

        const angle = (i / sparkleCount) * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const duration = 1000 + Math.random() * 1000;

        sparkle.animate([
            {
                transform: 'translate(-50%, -50%) scale(0)',
                opacity: 1
            },
            {
                transform: \`translate(\${Math.cos(angle) * distance - 50}px, \${Math.sin(angle) * distance - 50}px) scale(1)\`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        }).onfinish = () => sparkle.remove();

        document.body.appendChild(sparkle);
    }
}

function initializeAnimations() {
    // Add scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Console Easter eggs
logger.info('%c🎵 PRP CLI Landing Page', 'color: #0ea5e9; font-size: 20px; font-weight: bold;');
logger.info('%c🐵 Try adding ?monkeys=true or #monkeys to the URL!', 'color: #f59e0b; font-size: 14px;');
logger.info('%cCreated with PRP CLI - Interactive Project Bootstrap', 'color: #64748b; font-size: 12px;');`;
  }
}