/**
 * ♫ CLI Wizard for @dcversus/prp
 *
 * Interactive project initialization flow with agent configuration
 * and template selection for seamless project setup
 */

import { EventEmitter } from 'events';
import { createInterface, ReadLine } from 'readline';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import inquirer from 'inquirer';
import figlet from 'figlet';
import boxen from 'boxen';
import { createLayerLogger } from '../shared';
import { WizardConfig } from './types';
import { TemplateManager } from './template-manager';
import { AgentConfigurator } from './agent-configurator';

const logger = createLayerLogger('config');

interface WizardOptions {
  projectName?: string;
  template?: string;
  prp?: string;
  default?: boolean;
  skipAuth?: boolean;
  ciMode?: boolean;
  verbose?: boolean;
}


interface WizardState {
  step: string;
  progress: number;
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}


/**
 * CLI Wizard - Interactive project initialization
 */
export class CLIWizard extends EventEmitter {
  private rl: ReadLine;
  private config: WizardConfig;
  private templateManager: TemplateManager;
  private agentConfigurator: AgentConfigurator;
  private state: WizardState;
  private spinner: Ora | undefined;
  private isInteractive: boolean;

  constructor(config: WizardConfig) {
    super();

    this.config = config;
    this.templateManager = new TemplateManager(config.templates);
    this.agentConfigurator = new AgentConfigurator(config.agents);

    this.state = {
      step: 'welcome',
      progress: 0,
      data: {},
      errors: [],
      warnings: []
    };

    this.isInteractive = process.stdout.isTTY && !config.ciMode;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.setupEventHandlers();
  }

  /**
   * Start the wizard
   */
  async start(options: WizardOptions = {}): Promise<void> {
    logger.info('start', 'Starting CLI wizard', {
      options,
      interactive: this.isInteractive
    });

    try {
      // Display welcome banner
      await this.showWelcomeBanner();

      // Handle default mode
      if (options.default) {
        await this.runDefaultMode(options);
        return;
      }

      // Interactive mode
      if (this.isInteractive) {
        await this.runInteractiveMode(options);
      } else {
        await this.runNonInteractiveMode(options);
      }

      logger.info('start', 'Wizard completed successfully');
      this.emit('wizard:completed', this.state.data);

    } catch (error) {
      logger.error('start', 'Wizard failed', error instanceof Error ? error : new Error(String(error)), {
        step: this.state.step
      });

      this.state.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('wizard:error', error);
      throw error;
    }
  }

  /**
   * Run default mode for quick initialization
   */
  private async runDefaultMode(options: WizardOptions): Promise<void> {
    logger.info('runDefaultMode', 'Running in default mode');

    const projectName = options.projectName || 'prp-project';
    const template = options.template || 'fast';
    const prp = options.prp || 'Initialize project with PRP CLI and basic agent setup';

    this.state.data = {
      projectName,
      template,
      prp,
      agents: this.config.agents.default,
      options: {
        gitInit: true,
        npmInstall: true,
        firstCommit: true
      }
    };

    await this.executeProjectSetup();
    await this.generatePRP(prp);
    await this.configureAgents();
    await this.initializeGit();
    await this.installDependencies();
    await this.makeInitialCommit();

    this.displayCompletionMessage();
  }

  /**
   * Run interactive mode
   */
  private async runInteractiveMode(options: WizardOptions): Promise<void> {
    logger.info('runInteractiveMode', 'Running in interactive mode');

    // Step 1: Project name
    await this.askProjectName(options.projectName);

    // Step 2: Template selection
    await this.selectTemplate(options.template);

    // Step 3: PRP definition
    await this.definePRP(options.prp);

    // Step 4: Agent configuration
    await this.configureAgents();

    // Step 5: Additional options
    await this.askAdditionalOptions();

    // Step 6: Confirmation
    await this.confirmConfiguration();

    // Execute setup
    await this.executeProjectSetup();
  }

  /**
   * Run non-interactive mode
   */
  private async runNonInteractiveMode(options: WizardOptions): Promise<void> {
    logger.info('runNonInteractiveMode', 'Running in non-interactive mode');

    if (!options.projectName) {
      throw new Error('Project name is required in non-interactive mode');
    }

    this.state.data = {
      projectName: options.projectName,
      template: options.template || 'minimal',
      prp: options.prp || 'Basic project initialization',
      agents: this.config.agents.default,
      options: {
        gitInit: true,
        npmInstall: true,
        firstCommit: false
      }
    };

    await this.executeProjectSetup();
  }

  /**
   * Show welcome banner
   */
  private async showWelcomeBanner(): Promise<void> {
    if (!this.isInteractive) return;

    const bannerText = await this.getFigletText('PRP CLI');
    const banner = boxen(bannerText, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue',
      backgroundColor: '#1a1a1a'
    });

    console.log(banner);
    console.log(chalk.cyan('♫ Welcome to PRP CLI - Interactive Project Bootstrap'));
    console.log(chalk.gray('Autonomous Development Orchestration\n'));

    if (this.config.showTips) {
      const tip = this.getRandomTip();
      console.log(chalk.yellow('💡 Tip:'), tip);
      console.log();
    }
  }

  /**
   * Get figlet text
   */
  private async getFigletText(text: string): Promise<string> {
    return new Promise((resolve) => {
      figlet.text(text, (error: Error | null, data: string | undefined) => {
        if (error) {
          resolve(text);
        } else {
          resolve(chalk.cyan(data || text));
        }
      });
    });
  }

  /**
   * Get random tip
   */
  private getRandomTip(): string {
    const tips = [
      'Use --default flag for quick initialization with sensible defaults',
      'PRP files are your project\'s north star - keep them updated',
      'Agents work together through signals - check AGENTS.md for details',
      'Use prp agents:start to begin AI-driven development',
      'Configure authentication with prp auth init for full functionality'
    ];

    const randomIndex = Math.floor(Math.random() * tips.length);
    return tips[randomIndex] || tips[0] || '';
  }

  /**
   * Ask for project name
   */
  private async askProjectName(suggestedName?: string): Promise<void> {
    this.state.step = 'project-name';
    this.updateProgress(10);

    const projectNameQuestions = [
      {
        type: 'input' as const,
        name: 'projectName',
        message: 'What is your project name?',
        default: suggestedName || 'my-prp-project',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Project name is required';
          }
          if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      }
      ];

    const answers = await inquirer.prompt(projectNameQuestions);
    this.state.data['projectName'] = answers['projectName'];

    this.emit('wizard:step-completed', { step: 'project-name', data: answers });
  }

  /**
   * Select template
   */
  private async selectTemplate(suggestedTemplate?: string): Promise<void> {
    this.state.step = 'template-selection';
    this.updateProgress(20);

    const templates = await this.templateManager.getAvailableTemplates();

    const choices = templates.map(template => ({
      name: `${template.name} - ${template.description}`,
      value: template.id,
      short: template.name
    }));

    const templateQuestions = [
      {
        type: 'list' as const,
        name: 'template',
        message: 'Choose a template preset:',
        choices,
        default: suggestedTemplate || 'fast'
      }
    ];

    const answers = await inquirer.prompt(templateQuestions);
    this.state.data['template'] = answers['template'];

    // Show template details
    const selectedTemplate = templates.find(t => t.id === answers['template']);
    if (selectedTemplate) {
      console.log(chalk.blue('\nTemplate includes:'));
      selectedTemplate.features.forEach(feature => {
        console.log(chalk.gray(`  • ${feature}`));
      });
      console.log();
    }

    this.emit('wizard:step-completed', { step: 'template-selection', data: answers });
  }

  /**
   * Define PRP
   */
  private async definePRP(suggestedPRP?: string): Promise<void> {
    this.state.step = 'prp-definition';
    this.updateProgress(30);

    console.log(chalk.blue('📋 Define your Product Requirement Prompt (PRP)'));
    console.log(chalk.gray('This will guide the AI agents throughout your project development\n'));

    const prpQuestions = [
      {
        type: 'editor' as const,
        name: 'prp',
        message: 'Describe your project requirements:',
        default: suggestedPRP || this.generateDefaultPRP(),
        validate: (input: string) => {
          if (!input.trim() || input.length < 50) {
            return 'Please provide a more detailed description of your project requirements';
          }
          return true;
        }
      }
    ];

    const answers = await inquirer.prompt(prpQuestions);
    this.state.data['prp'] = answers['prp'];

    this.emit('wizard:step-completed', { step: 'prp-definition', data: answers });
  }

  /**
   * Configure agents
   */
  private async configureAgents(): Promise<void> {
    this.state.step = 'agent-configuration';
    this.updateProgress(50);

    console.log(chalk.blue('🤖 Configure your AI agents'));
    console.log(chalk.gray('Select which agents you want to enable for this project\n'));

    const agentConfigs = await this.agentConfigurator.getAvailableConfigs();

    const agentSelectionQuestions = [
      {
        type: 'checkbox' as const,
        name: 'agents',
        message: 'Select agents to enable:',
        choices: agentConfigs.map(config => ({
          name: `${config.name} - ${(config as any).description || config.role}`,
          value: config.id,
          checked: (config as any).enabledByDefault || false
        }))
      },
      {
        type: 'confirm' as const,
        name: 'customConfig',
        message: 'Do you want to customize agent configurations?',
        default: false
      }
    ];

    const answers = await inquirer.prompt(agentSelectionQuestions);
    this.state.data['agents'] = answers['agents'];

    if (answers['customConfig']) {
      await this.customizeAgentConfiguration(answers['agents']);
    }

    this.emit('wizard:step-completed', { step: 'agent-configuration', data: answers });
  }

  /**
   * Customize agent configuration
   */
  private async customizeAgentConfiguration(selectedAgents: string[]): Promise<void> {
    console.log(chalk.blue('\n⚙️  Customize agent configurations'));

    for (const agentId of selectedAgents) {
      const config = await this.agentConfigurator.getConfig(agentId);

      type AgentConfigAnswers = {
        [key: string]: boolean | string | number;
      };

      const agentQuestions: any[] = [
        {
          type: 'confirm',
          name: `${agentId}_enabled`,
          message: `Enable ${config.name}?`,
          default: true
        },
        {
          type: 'list',
          name: `${agentId}_model`,
          message: `Select model for ${config.name}:`,
          choices: (config as any).availableModels || ['claude-3-sonnet'],
          default: (config as any).defaultModel || 'claude-3-sonnet'
        },
        {
          type: 'number',
          name: `${agentId}_maxTokens`,
          message: `Max tokens for ${config.name}:`,
          default: (config as any).defaultMaxTokens || 100000,
          validate: (input: number) => input > 0 && input <= 200000
        }
      ];

      const answers = await inquirer.prompt(agentQuestions) as AgentConfigAnswers;

      this.state.data['agentConfigs'] = this.state.data['agentConfigs'] || {};
      this.state.data['agentConfigs'][agentId] = {
        enabled: answers[`${agentId}_enabled`],
        model: answers[`${agentId}_model`],
        maxTokens: answers[`${agentId}_maxTokens`]
      };
    }
  }

  /**
   * Ask additional options
   */
  private async askAdditionalOptions(): Promise<void> {
    this.state.step = 'additional-options';
    this.updateProgress(70);

    const additionalOptionsQuestions = [
      {
        type: 'confirm' as const,
        name: 'gitInit',
        message: 'Initialize git repository?',
        default: true
      },
      {
        type: 'confirm' as const,
        name: 'npmInstall',
        message: 'Install dependencies?',
        default: true
      },
      {
        type: 'confirm' as const,
        name: 'firstCommit',
        message: 'Create initial commit?',
        default: true,
        when: (answers: Record<string, boolean>) => answers['gitInit']
      },
      {
        type: 'confirm' as const,
        name: 'githubRepo',
        message: 'Create GitHub repository?',
        default: false
      },
      {
        type: 'confirm' as const,
        name: 'setupCI',
        message: 'Setup CI/CD pipeline?',
        default: false
      }
    ];

    const answers = await inquirer.prompt(additionalOptionsQuestions);
    this.state.data['options'] = answers;

    this.emit('wizard:step-completed', { step: 'additional-options', data: answers });
  }

  /**
   * Confirm configuration
   */
  private async confirmConfiguration(): Promise<void> {
    this.state.step = 'confirmation';
    this.updateProgress(80);

    console.log(chalk.blue('\n📋 Configuration Summary'));
    console.log(chalk.gray('Please review your project configuration\n'));

    const summary = this.generateConfigurationSummary();
    console.log(summary);

    const confirmationQuestions = [
      {
        type: 'confirm' as const,
        name: 'confirmed',
        message: 'Does this configuration look correct?',
        default: true
      }
    ];

    const answers = await inquirer.prompt(confirmationQuestions);

    if (!answers['confirmed']) {
      console.log(chalk.yellow('\nConfiguration cancelled. Please run the wizard again.'));
      process.exit(0);
    }

    this.emit('wizard:step-completed', { step: 'confirmation', data: answers });
  }

  /**
   * Generate configuration summary
   */
  private generateConfigurationSummary(): string {
    const data = this.state.data;

    let summary = boxen(
      `${chalk.bold('Project Configuration:')}\n\n` +
      `${chalk.cyan('Project Name:')} ${data['projectName']}\n` +
      `${chalk.cyan('Template:')} ${data['template']}\n` +
      `${chalk.cyan('PRP:')} ${String(data['prp']).substring(0, 100)}${String(data['prp']).length > 100 ? '...' : ''}\n` +
      `${chalk.cyan('Agents:')} ${(data['agents'] as string[]).join(', ')}\n` +
      `${chalk.cyan('Git Init:')} ${(data['options'] as any)['gitInit'] ? 'Yes' : 'No'}\n` +
      `${chalk.cyan('NPM Install:')} ${(data['options'] as any)['npmInstall'] ? 'Yes' : 'No'}\n` +
      `${chalk.cyan('First Commit:')} ${(data['options'] as any)['firstCommit'] ? 'Yes' : 'No'}\n`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
      }
    );

    return summary;
  }

  /**
   * Execute project setup
   */
  private async executeProjectSetup(): Promise<void> {
    this.state.step = 'setup';
    this.updateProgress(90);

    this.spinner = ora('Setting up your project...').start();

    try {
      // Create project directory
      await this.createProjectDirectory();

      // Apply template
      await this.applyTemplate();

      // Generate PRP file
      await this.generatePRP(String(this.state.data['prp']));

      // Configure agents
      await this.configureAgentsFromData();

      // Initialize git if requested
      if ((this.state.data['options'] as any)['gitInit']) {
        await this.initializeGit();
      }

      // Install dependencies if requested
      if ((this.state.data['options'] as any)['npmInstall']) {
        await this.installDependencies();
      }

      // Create initial commit if requested
      if ((this.state.data['options'] as any)['firstCommit']) {
        await this.makeInitialCommit();
      }

      this.spinner.succeed('Project setup completed successfully!');

    } catch (error) {
      this.spinner.fail('Project setup failed');
      throw error;
    }
  }

  /**
   * Create project directory
   */
  private async createProjectDirectory(): Promise<void> {
    const projectPath = join(process.cwd(), String(this.state.data['projectName']));

    try {
      await fs.mkdir(projectPath, { recursive: true });
      process.chdir(projectPath);

      logger.info('createProjectDirectory', `Created project directory: ${projectPath}`);
      this.emit('wizard:directory-created', { path: projectPath });

    } catch (error) {
      throw new Error(`Failed to create project directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply template
   */
  private async applyTemplate(): Promise<void> {
    if (this.spinner) {
      this.spinner.text = 'Applying template...';
    }

    const template = await this.templateManager.getTemplate(String(this.state.data['template']));
    await this.templateManager.applyTemplate(template, process.cwd(), String(this.state.data['projectName']), String(this.state.data['prp']));

    logger.info('applyTemplate', `Applied template: ${template.name}`);
    this.emit('wizard:template-applied', { template });
  }

  /**
   * Generate PRP file
   */
  private async generatePRP(prpContent: string): Promise<void> {
    if (this.spinner) {
      this.spinner.text = 'Generating PRP file...';
    }

    const prpTemplate = await this.createPRPTemplate(prpContent);
    const prpPath = join(process.cwd(), 'PRPs', `${String(this.state.data['projectName'])}-initial.md`);

    await fs.mkdir(join(process.cwd(), 'PRPs'), { recursive: true });
    await fs.writeFile(prpPath, prpTemplate, 'utf8');

    logger.info('generatePRP', `Generated PRP file: ${prpPath}`);
    this.emit('wizard:prp-generated', { path: prpPath, content: prpTemplate });
  }

  /**
   * Create PRP template
   */
  private async createPRPTemplate(content: string): Promise<string> {
    const timestamp = new Date().toISOString();
    const projectId = `prp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return `# ${String(this.state.data['projectName'])}

**Project ID**: ${projectId}
**Created**: ${timestamp}
**Template**: ${String(this.state.data['template'])}
**Agents**: ${(this.state.data['agents'] as string[]).join(', ')}

## 🎯 Product Requirement Prompt

${content}

## 📋 Definition of Ready (DoR)

- [ ] PRP reviewed and approved by all stakeholders
- [ ] Development environment setup complete
- [ ] Required tools and dependencies installed
- [ ] Team roles and responsibilities defined
- [ ] Success criteria and acceptance criteria defined

## ✅ Definition of Done (DoD)

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests passing with adequate coverage
- [ ] Documentation updated
- [ ] Security and performance requirements met
- [ ] Deployed to staging environment

## 🎵 Signal Workflow

This project will use the following signal workflow:

1. **[oa]** Research and analysis signals
2. **[op]** Progress and implementation signals
3. **[Tt]** Test verification signals
4. **[Qb]** Quality bug signals
5. **[Cc]** Completion signals

## 🤖 Agent Configuration

${(this.state.data['agents'] as string[]).map((agent: string) => {
  const config = (this.state.data['agentConfigs'] as Record<string, unknown>)?.[agent];
  return `- **${agent}**: ${(config as Record<string, unknown>)?.model || 'default model'} (${(config as Record<string, unknown>)?.maxTokens || 'default'} tokens)`;
}).join('\n')}

---

*Generated by PRP CLI v0.5.0*
*Last Updated: ${timestamp}*
`;
  }

  /**
   * Configure agents from data
   */
  private async configureAgentsFromData(): Promise<void> {
    if (this.spinner) {
      this.spinner.text = 'Configuring agents...';
    }

    const config = {
      projectId: String(this.state.data['projectName']),
      agents: this.state.data['agents'] as string[],
      agentConfigs: this.state.data['agentConfigs'] as Record<string, unknown> || {},
      template: String(this.state.data['template'])
    };

    await this.agentConfigurator.writeConfiguration(config);

    logger.info('configureAgentsFromData', 'Agent configuration written');
    this.emit('wizard:agents-configured', config);
  }

  /**
   * Initialize git
   */
  private async initializeGit(): Promise<void> {
    if (this.spinner) {
      this.spinner.text = 'Initializing git repository...';
    }

    await this.executeCommand('git', ['init']);
    await this.executeCommand('git', ['branch', '-M', 'main']);

    logger.info('CLIWizard', 'Git repository initialized');
    this.emit('wizard:git-initialized');
  }

  /**
   * Install dependencies
   */
  private async installDependencies(): Promise<void> {
    if (this.spinner) {
      this.spinner.text = 'Installing dependencies...';
    }

    await this.executeCommand('npm', ['install']);

    logger.info('CLIWizard', 'Dependencies installed');
    this.emit('wizard:dependencies-installed');
  }

  /**
   * Make initial commit
   */
  private async makeInitialCommit(): Promise<void> {
    if (this.spinner) {
      this.spinner.text = 'Creating initial commit...';
    }

    await this.executeCommand('git', ['add', '.']);
    await this.executeCommand('git', ['commit', '-m', 'Initial commit from PRP CLI']);

    logger.info('CLIWizard', 'Initial commit created');
    this.emit('wizard:initial-commit-made');
  }

  /**
   * Execute command
   */
  private async executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }

  /**
   * Generate default PRP
   */
  private generateDefaultPRP(): string {
    const projectName = this.state.data['projectName'] || 'my-project';

    return `Initialize ${projectName} with modern development setup and best practices.

The project should include:
- Clean, maintainable code structure
- Comprehensive testing suite
- Documentation and README
- CI/CD pipeline setup
- Modern development tools and configurations

Focus on creating a solid foundation that can be easily extended and maintained.`;
  }

  /**
   * Display completion message
   */
  private displayCompletionMessage(): void {
    this.updateProgress(100);

    console.log(chalk.green('\n🎉 Project setup completed successfully!\n'));

    console.log(chalk.blue('Next steps:'));
    console.log(chalk.gray(`  cd ${String(this.state.data['projectName'])}`));
    console.log(chalk.gray('  prp auth init                    # Setup authentication'));
    console.log(chalk.gray('  prp agents:start                 # Start AI agents'));
    console.log(chalk.gray('  prp tui                          # Open terminal dashboard'));
    console.log(chalk.gray('  npm run dev                      # Start development'));

    if (String(this.state.data['prp']).includes('gh-page') || String(this.state.data['prp']).includes('dancing monkeys')) {
      console.log(chalk.yellow('\n🎯 Special deployment detected!'));
      console.log(chalk.gray('  prp deploy --landing-page       # Deploy landing page'));
      console.log(chalk.gray('  prp deploy --dancing-monkeys    # Deploy with animated monkeys'));
    }

    console.log(chalk.cyan('\n♫ Happy coding with PRP CLI!'));

    this.emit('wizard:completed', this.state.data);
  }

  /**
   * Update progress
   */
  private updateProgress(progress: number): void {
    this.state.progress = progress;
    this.emit('wizard:progress-updated', progress);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n⚠️  Wizard interrupted by user'));
      this.cleanup();
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n\n⚠️  Wizard terminated'));
      this.cleanup();
      process.exit(1);
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.spinner) {
      this.spinner.stop();
    }

    if (this.rl) {
      this.rl.close();
    }
  }

  /**
   * Get current state
   */
  getState(): WizardState {
    return { ...this.state };
  }

  /**
   * Get configuration data
   */
  getConfigurationData(): Record<string, unknown> {
    return { ...this.state.data };
  }
}