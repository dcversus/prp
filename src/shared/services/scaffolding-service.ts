/**
 * Scaffolding Service - Simple template-based project scaffolding
 *
 * Copies files from template directories to new project root
 * Handles default files, optional files, and template selection
 */

import { promises as fs, existsSync } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { validateProjectName } from '../validators.js';
import { Logger } from '../logger.js';
import { InitGenerationService, GenerationRequest } from './init-generation-service.js';
import { PathResolver } from '../path-resolver.js';
import { MCPConfigurator } from '../../config/mcp-configurator.js';

export interface TemplateConfig {
  name: string;
  description: string;
  default: boolean;
  files: TemplateFileConfig[];
}

export interface TemplateFileConfig {
  path: string;
  type: 'default' | 'optional';
  description?: string;
  condition?: string; // Feature flag condition
}

export interface ScaffoldOptions {
  projectName: string;
  template: string;
  targetPath: string;
  default?: boolean;
  selectedFiles?: string[];
  variables?: Record<string, string>;
  description?: string;
  author?: string;
  email?: string;
  license?: string;
  prompt?: string;
  gitInit?: boolean;
  installDeps?: boolean;
  ci?: boolean;
  force?: boolean;
  upgrade?: boolean;
  // MCP configuration
  mcpConfig?: {
    enabled: boolean;
    servers: string[];
    configPath: string;
  };
  // Agent file linking
  agentFileLink?: {
    enabled: boolean;
    sourceFile: string;
    targetFile: string;
  };
}

export class ScaffoldingService {
  private templatesPath: string;
  private initGenerationService: InitGenerationService;
  private mcpConfigurator: MCPConfigurator;
  private logger = new Logger({});

  constructor() {
    // Use the robust PathResolver to find the package root
    // This ensures templates are found regardless of execution context
    this.templatesPath = PathResolver.getPackagePath('templates');
    this.initGenerationService = new InitGenerationService();
    this.mcpConfigurator = new MCPConfigurator();

    // Validate that templates directory exists
    if (!existsSync(this.templatesPath)) {
      const validation = PathResolver.validatePackageStructure();
      throw new Error(`Templates directory not found at ${this.templatesPath}. Missing: ${validation.missing.join(', ')}. Execution: ${PathResolver.getExecutionInfo().type}`);
    }

    this.logger.info('shared', 'ScaffoldingService', `ScaffoldingService initialized with templates path: ${this.templatesPath}`);
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<TemplateConfig[]> {
    try {
      const templateDirs = await fs.readdir(this.templatesPath);
      const templates: TemplateConfig[] = [];

      for (const dir of templateDirs) {
        const configPath = path.join(this.templatesPath, dir, 'template.json');

        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configContent) as TemplateConfig;
          config.name = dir;
          templates.push(config);
        } catch (error) {
          this.logger.warn('shared', 'ScaffoldingService', `Failed to load template config for ${dir}:`, { error: error instanceof Error ? error.message : String(error) });
          // Create basic config for templates without config
          templates.push({
            name: dir,
            description: `${dir} template`,
            default: dir === 'none',
            files: []
          });
        }
      }

      return templates;
    } catch (error) {
      this.logger.error('shared', 'ScaffoldingService', 'Failed to read templates directory:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Scaffold a new project from template
   */
  async scaffold(options: ScaffoldOptions): Promise<void> {
    const {
      projectName,
      template,
      targetPath,
      default: useDefault = false,
      selectedFiles = [],
      variables = {},
      description = '',
      author = '',
      email = '',
      prompt = ''
    } = options;

    // Validate project name
    const validation = validateProjectName(projectName);
    if (!validation.isValid) {
      throw new Error(`Invalid project name: ${validation.error}`);
    }

    // Get template path
    const templatePath = useDefault
      ? path.join(this.templatesPath, 'none')
      : path.join(this.templatesPath, template);

    // Verify template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      throw new Error(`Template not found: ${template}`);
    }

    // Create target directory if it doesn't exist
    if (!targetPath) {
      throw new Error('Target path is required');
    }
    await fs.mkdir(targetPath, { recursive: true });

    // Prepare variables
    const templateVariables = {
      PROJECT_NAME: projectName,
      PROJECT_NAME_KEBAB: projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      PROJECT_NAME_PASCAL: this.toPascalCase(projectName),
      PROJECT_NAME_CAMEL: this.toCamelCase(projectName),
      DESCRIPTION: variables.description || '',
      AUTHOR: variables.author || '',
      EMAIL: variables.email || '',
      YEAR: new Date().getFullYear().toString(),
      ...variables
    };

    // Copy default files
    await this.copyDefaultFiles(templatePath, targetPath, templateVariables);

    // Copy optional selected files
    await this.copyOptionalFiles(templatePath, targetPath, selectedFiles, templateVariables);

    // Copy governance files from PRP root using InitGenerationService
    await this.copyGovernanceFiles(targetPath, templateVariables, {
      projectName,
      template,
      description,
      author,
      email,
      prompt
    });

    // Generate initial PRP using InitGenerationService
    await this.generateInitialPRP(targetPath, projectName, templateVariables, {
      projectName,
      template,
      description,
      author,
      email,
      prompt
    });

    // Configure MCP servers if enabled
    if (options.mcpConfig?.enabled) {
      await this.mcpConfigurator.generateMCPConfig({
        enabled: options.mcpConfig.enabled,
        servers: options.mcpConfig.servers,
        configPath: options.mcpConfig.configPath,
        targetPath
      });

      // Setup environment variables for MCP servers
      await this.mcpConfigurator.setupEnvironmentVariables(
        options.mcpConfig.servers,
        targetPath
      );
    }

    // Create symbolic link for agent files if enabled
    if (options.agentFileLink?.enabled) {
      await this.createAgentFileSymlink(
        targetPath,
        options.agentFileLink.sourceFile,
        options.agentFileLink.targetFile
      );
    }

    this.logger.info('shared', 'ScaffoldingService', `Successfully scaffolded ${projectName} from ${template} template`);
  }

  /**
   * Load template configuration
   */
  private async loadTemplateConfig(templatePath: string): Promise<TemplateConfig> {
    try {
      const configPath = path.join(templatePath, 'template.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent) as TemplateConfig;
    } catch (error) {
      // Return default config if no config file exists
      return {
        name: path.basename(templatePath),
        description: `${path.basename(templatePath)} template`,
        default: false,
        files: []
      };
    }
  }

  /**
   * Copy default files from template
   */
  private async copyDefaultFiles(
    templatePath: string,
    targetPath: string,
    variables: Record<string, string>
  ): Promise<void> {
    // Get all files in template
    const files = await glob('**/*', {
      cwd: templatePath,
      dot: true,
      ignore: ['template.json', 'PRPs/**', '.git/**']
    });

    // Load template config to check which files are default
    const templateConfig = await this.loadTemplateConfig(templatePath);

    for (const file of files) {
      const fullPath = path.join(templatePath, file);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        continue;
      }

      // Check if file is default (no config means all files are default)
      const fileConfig = templateConfig.files.find(f => f.path === file);
      const isDefault = !fileConfig || fileConfig.type === 'default';

      if (isDefault) {
        await this.copyFile(fullPath, path.join(targetPath, file), variables);
      }
    }
  }

  /**
   * Copy optional selected files
   */
  private async copyOptionalFiles(
    templatePath: string,
    targetPath: string,
    selectedFiles: string[],
    variables: Record<string, string>
  ): Promise<void> {
    for (const file of selectedFiles) {
      const sourcePath = path.join(templatePath, file);
      const targetFilePath = path.join(targetPath, file);

      try {
        await fs.access(sourcePath);
        await this.copyFile(sourcePath, targetFilePath, variables);
      } catch (error) {
        this.logger.warn('shared', 'ScaffoldingService', `Failed to copy optional file ${file}:`, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * Copy governance files from PRP root using InitGenerationService
   */
  private async copyGovernanceFiles(
    targetPath: string,
    variables: Record<string, string>,
    options: { projectName: string; template: string; description: string; author: string; email: string; prompt: string }
  ): Promise<void> {
    try {
      // Generate governance files using InitGenerationService
      const generationRequest: GenerationRequest = {
        projectName: options.projectName,
        projectDescription: options.description,
        author: options.author,
        projectPath: targetPath,
        template: options.template,
        prompt: options.prompt
      };

      const generatedContent = await this.initGenerationService.generateGovernanceFiles(generationRequest);

      // Write AGENTS.md
      if (generatedContent.agentsMd) {
        await fs.writeFile(path.join(targetPath, 'AGENTS.md'), generatedContent.agentsMd);
        this.logger.info('shared', 'ScaffoldingService', 'Generated AGENTS.md with project-specific user section');
      }

      // Write README.md
      if (generatedContent.readmeMd) {
        await fs.writeFile(path.join(targetPath, 'README.md'), generatedContent.readmeMd);
        this.logger.info('shared', 'ScaffoldingService', 'Generated README.md for project');
      }

      // Copy additional governance files from PRP root
      const additionalFiles = [
        { source: '.github', target: '.github', process: false },
        { source: '.gitignore', target: '.gitignore', process: false },
        { source: 'LICENSE', target: 'LICENSE', process: false },
        { source: 'CONTRIBUTING.md', target: 'CONTRIBUTING.md', process: false },
        { source: 'CODE_OF_CONDUCT.md', target: 'CODE_OF_CONDUCT.md', process: false }
      ];

      const prpRoot = path.resolve(path.join(this.templatesPath, '..'));

      for (const file of additionalFiles) {
        const sourcePath = path.join(prpRoot, file.source);

        try {
          await fs.access(sourcePath);

          if (file.process) {
            await this.copyFile(sourcePath, path.join(targetPath, file.target), variables);
          } else {
            await this.copyFile(sourcePath, path.join(targetPath, file.target), {});
          }
          this.logger.info('shared', 'ScaffoldingService', `Copied governance file: ${file.source}`);
        } catch (error) {
          this.logger.warn('shared', 'ScaffoldingService', `Failed to copy governance file ${file.source}:`, { error: error instanceof Error ? error.message : String(error) });
        }
      }

    } catch (error) {
      this.logger.error('shared', 'ScaffoldingService', 'Failed to generate governance files:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to generate governance files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate initial PRP using InitGenerationService
   */
  private async generateInitialPRP(
    targetPath: string,
    projectName: string,
    variables: Record<string, string>,
    options: { projectName: string; template: string; description: string; author: string; email: string; prompt: string }
  ): Promise<void> {
    const prpsDir = path.join(targetPath, 'PRPs');
    await fs.mkdir(prpsDir, { recursive: true });

    try {
      // Use InitGenerationService to generate initial PRP if prompt is provided
      if (options.prompt) {
        const generationRequest: GenerationRequest = {
          projectName: options.projectName,
          projectDescription: options.description,
          author: options.author,
          projectPath: targetPath,
          template: options.template,
          prompt: options.prompt
        };

        const generatedContent = await this.initGenerationService.generateGovernanceFiles(generationRequest);

        if (generatedContent.initialPrp) {
          const prpPath = path.join(prpsDir, `PRP-001-bootstrap-${variables.PROJECT_NAME_KEBAB}.md`);
          await fs.writeFile(prpPath, generatedContent.initialPrp);
          this.logger.info('shared', 'ScaffoldingService', 'Generated initial PRP from user prompt');
          return;
        }
      }

      // Fallback to default PRP if no prompt provided
      const prpContent = `# PRP-001: Bootstrap ${projectName}

> our goal of user quote: Initialize ${projectName} project with proper structure and governance

## progress
[da] Initial project scaffolding completed | robo-developer | ${new Date().toISOString()}

## description
Initial bootstrap of ${projectName} project created from template with PRP governance structure.

## dor
- [x] Project structure created from template
- [x] Governance files copied from PRP root
- [x] Initial PRP created
- [x] Basic project setup completed

## dod
- [x] Project files generated
- [x] README.md created and customized
- [x] AGENTS.md with user section generated
- [x] Project ready for development

## pre-release checklist
- [ ] Review generated files
- [ ] Customize project description
- [ ] Set up development environment
- [ ] Run initial tests if available

## post-release checklist
- [ ] Verify project builds successfully
- [ ] Confirm all dependencies installed
- [ ] Test basic functionality
- [ ] Update documentation as needed

## plan
- [x] Create project directory structure
- [x] Copy template files
- [x] Generate governance files
- [x] Create initial PRP
- [ ] Customize project configuration
`;

      const prpPath = path.join(prpsDir, `PRP-001-bootstrap-${variables.PROJECT_NAME_KEBAB}.md`);
      await fs.writeFile(prpPath, prpContent);
      this.logger.info('shared', 'ScaffoldingService', 'Generated default initial PRP');

    } catch (error) {
      this.logger.error('shared', 'ScaffoldingService', 'Failed to generate initial PRP:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to generate initial PRP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Copy a single file with variable substitution
   */
  private async copyFile(
    sourcePath: string,
    targetPath: string,
    variables: Record<string, string>
  ): Promise<void> {
    // Create target directory if it doesn't exist
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // Read source file
    const content = await fs.readFile(sourcePath, 'utf-8');

    // Substitute variables
    let processedContent = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    }

    // Write target file
    await fs.writeFile(targetPath, processedContent);
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[\s-_])+(.)/g, (_, char) => char.toUpperCase());
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Create symbolic link for agent files
   */
  private async createAgentFileSymlink(
    targetPath: string,
    sourceFile: string,
    targetFile: string
  ): Promise<void> {
    try {
      const sourcePath = path.join(targetPath, sourceFile);
      const targetPathSymlink = path.join(targetPath, targetFile);

      // Check if source file exists
      try {
        await fs.access(sourcePath);
      } catch (error) {
        this.logger.warn('shared', 'ScaffoldingService', `Source file ${sourceFile} does not exist, skipping symlink creation`);
        return;
      }

      // Remove existing symlink or file
      try {
        const stat = await fs.stat(targetPathSymlink);
        if (stat.isSymbolicLink() || stat.isFile()) {
          await fs.unlink(targetPathSymlink);
        }
      } catch {
        // File doesn't exist, continue
      }

      // Create symbolic link
      await fs.symlink(sourceFile, targetPathSymlink);
      this.logger.info('shared', 'ScaffoldingService', `✅ Created symbolic link: ${targetFile} -> ${sourceFile}`);

    } catch (error) {
      this.logger.warn('shared', 'ScaffoldingService', `Failed to create symbolic link ${targetFile} -> ${sourceFile}:`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Get template files by type
   */
  async getTemplateFiles(templateName: string): Promise<TemplateFileConfig[]> {
    const templatePath = path.join(this.templatesPath, templateName);
    const config = await this.loadTemplateConfig(templatePath);

    // If no config, scan for all files and mark as default
    if (config.files.length === 0) {
      const files = await glob('**/*', {
        cwd: templatePath,
        dot: true,
        ignore: ['template.json', 'PRPs/**', '.git/**']
      });

      return files
        .filter(file => !file.includes('/')) // Only top-level files
        .map(file => ({
          path: file,
          type: 'default' as const,
          description: `${file} file`
        }));
    }

    return config.files;
  }
}