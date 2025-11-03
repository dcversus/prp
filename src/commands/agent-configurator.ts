/**
 * ♫ Agent Configurator for @dcversus/prp
 *
 * Manages agent configurations, capabilities, and setup
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLayerLogger } from '../shared';
import { AgentConfig, AgentConfigConfig } from './types';
import { AgentCapabilities } from '../config/agent-config';

const logger = createLayerLogger('config');

/**
 * Helper function to convert old capabilities array to new AgentCapabilities format
 */
function createAgentCapabilities(capabilities: string[]): AgentCapabilities {
  return {
    supportsTools: capabilities.some(c => c.toLowerCase().includes('tool') || c.toLowerCase().includes('code')),
    supportsImages: capabilities.some(c => c.toLowerCase().includes('image') || c.toLowerCase().includes('visual')),
    supportsSubAgents: capabilities.some(c => c.toLowerCase().includes('agent') || c.toLowerCase().includes('orchestrate')),
    supportsParallel: capabilities.some(c => c.toLowerCase().includes('parallel') || c.toLowerCase().includes('multi')),
    supportsCodeExecution: capabilities.some(c => c.toLowerCase().includes('execute') || c.toLowerCase().includes('run')),
    maxContextLength: 4000,
    supportedModels: [],
    supportedFileTypes: ['*'],
    canAccessInternet: true,
    canAccessFileSystem: true,
    canExecuteCommands: capabilities.some(c => c.toLowerCase().includes('execute') || c.toLowerCase().includes('command'))
  };
}

/**
 * Helper function to create a complete AgentConfig from partial old-style config
 */
function createCompleteAgentConfig(partial: Partial<AgentConfig>): AgentConfig {
  const now = new Date();
  return {
    // Required properties
    id: partial.id || `agent-${Date.now()}`,
    name: partial.name || 'Unknown Agent',
    type: partial.type || 'claude-code-anthropic',
    role: partial.role || 'orchestrator-agent',
    provider: partial.provider || 'anthropic',
    enabled: partial.enabled ?? true,
    capabilities: partial.capabilities || createAgentCapabilities([]),
    limits: {
      maxTokensPerRequest: partial.defaultMaxTokens || 4000,
      maxRequestsPerHour: 100,
      maxRequestsPerDay: 1000,
      maxCostPerDay: 10.0,
      maxExecutionTime: 300000,
      maxMemoryUsage: 1024,
      maxConcurrentTasks: 1,
      cooldownPeriod: 1000
    },
    authentication: {
      type: 'api-key',
      encrypted: true
    },
    personality: {
      tone: 'professional',
      language: 'en',
      responseStyle: 'detailed',
      verbosity: 'balanced',
      creativity: 0.7,
      strictness: 0.5,
      proactivity: 0.3,
      communicationStyle: {
        useEmojis: false,
        useFormatting: true,
        includeCodeBlocks: true,
        includeExplanations: true
      }
    },
    tools: [],
    environment: {
      workingDirectory: process.cwd(),
      shell: '/bin/bash',
      envVars: {},
      nodeVersion: '18',
      pythonVersion: '3.9',
      allowedCommands: ['git', 'npm', 'node', 'python', 'ls', 'cat', 'grep'],
      blockedCommands: ['rm -rf', 'sudo', 'chmod 777'],
      networkAccess: {
        allowedDomains: [],
        blockedDomains: [],
        allowExternalRequests: true
      },
      fileSystem: {
        allowedPaths: [],
        blockedPaths: ['/etc', '/usr/bin', '/bin'],
        maxFileSize: 10485760,
        allowWrite: true,
        allowDelete: false
      }
    },
    preferences: {
      autoSave: true,
      autoCommit: false,
      preferAsync: true,
      useCache: true,
      debugMode: false,
      logLevel: 'info',
      notifications: {
        enabled: true,
        types: ['error', 'warning'],
        channels: ['console']
      },
      git: {
        autoStage: true,
        commitMessageFormat: 'feat: {description}',
        branchNaming: 'feature/{name}'
      }
    },
    metadata: {
      version: '1.0.0',
      author: 'system',
      createdAt: now,
      lastModified: now,
      tags: [],
      category: 'ai-assistant',
      description: partial.description || '',
      documentation: '',
      examples: [],
      dependencies: [],
      compatibility: {
        platforms: ['linux', 'macos', 'windows'],
        nodeVersions: ['16', '18', '20'],
        pythonVersions: ['3.8', '3.9', '3.10', '3.11']
      }
    },

    // Backwards compatibility properties
    description: partial.description,
    category: partial.category,
    enabledByDefault: partial.enabledByDefault,
    availableModels: partial.availableModels,
    defaultModel: partial.defaultModel,
    defaultMaxTokens: partial.defaultMaxTokens,
    configuration: partial.configuration
  };
}

interface AgentRegistry {
  agents: Record<string, AgentConfig>;
  categories: Record<string, string[]>;
  lastUpdated: Date;
}

/**
 * Agent Configurator - Manages agent configurations
 */
export class AgentConfigurator {
  private registry: AgentRegistry;
  private cache: Map<string, AgentConfig> = new Map();

  constructor(_config: AgentConfigConfig) {
    this.registry = {
      agents: {},
      categories: {},
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize agent configurator
   */
  async initialize(): Promise<void> {
    logger.info('initialize', 'Initializing agent configurator');

    try {
      // Load built-in agent configurations
      await this.loadBuiltinConfigs();

      // Load external agent configurations
      await this.loadExternalConfigs();

      // Build category index
      this.buildCategoryIndex();

      logger.info('initialize', `Loaded ${Object.keys(this.registry.agents).length} agent configurations`);

    } catch (error) {
      logger.error('initialize', 'Failed to initialize agent configurator', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get available agent configurations
   */
  async getAvailableConfigs(): Promise<AgentConfig[]> {
    return Object.values(this.registry.agents);
  }

  /**
   * Get agent configuration by ID
   */
  async getConfig(agentId: string): Promise<AgentConfig> {
    let config = this.cache.get(agentId);

    if (!config) {
      config = this.registry.agents[agentId];
      if (!config) {
        throw new Error(`Agent configuration not found: ${agentId}`);
      }

      // Cache the configuration
      this.cache.set(agentId, config);
    }

    return config;
  }

  /**
   * Write configuration to project
   */
  async writeConfiguration(configData: Record<string, unknown>): Promise<void> {
    logger.info('writeConfiguration', `Writing agent configuration for project: ${configData['projectId']}`);
    logger.info('writeConfiguration', `Agents: ${configData['agents'] ? JSON.stringify(configData['agents']) : 'none'}`);

    try {
      const configPath = join(process.cwd(), '.prprc');
      const existingConfig = await this.loadExistingConfig(configPath);

      // Merge configurations
      const mergedConfig = this.mergeConfigurations(existingConfig, configData);

      // Write configuration
      await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');

      // Create AGENTS.md symlink if it doesn't exist
      await this.createAgentsMdSymlink();

      logger.info('writeConfiguration', 'Configuration written successfully');

    } catch (error) {
      logger.error('writeConfiguration', 'Failed to write configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Load built-in agent configurations
   */
  private async loadBuiltinConfigs(): Promise<void> {
    const builtinConfigs = this.createBuiltinConfigs();

    for (const config of builtinConfigs) {
      this.registry.agents[config.id] = config;
    }

    logger.debug('loadBuiltinConfigs', `Loaded ${builtinConfigs.length} built-in configurations`);
  }

  /**
   * Load external agent configurations
   */
  private async loadExternalConfigs(): Promise<void> {
    try {
      const agentsDir = join(__dirname, '../../agents');
      const agentFiles = await fs.readdir(agentsDir);

      for (const agentFile of agentFiles) {
        if (agentFile.endsWith('.json')) {
          try {
            const agentPath = join(agentsDir, agentFile);
            const agentData = await fs.readFile(agentPath, 'utf-8');
            const config = JSON.parse(agentData) as AgentConfig;
            this.registry.agents[config.id] = config;
          } catch (error) {
            logger.warn('loadExternalConfigs', `Failed to load agent: ${agentFile} - ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } catch (error) {
      logger.debug('loadExternalConfigs', `No external agents directory found: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create built-in agent configurations
   */
  private createBuiltinConfigs(): AgentConfig[] {
    return [
      this.createDeveloperConfig(),
      this.createAQAConfig(),
      this.createUXUIConfig(),
      this.createSystemAnalystConfig(),
      this.createDevOpsConfig(),
      this.createOrchestratorConfig()
    ];
  }

  /**
   * Create developer configuration
   */
  private createDeveloperConfig(): AgentConfig {
    return createCompleteAgentConfig({
      id: 'robo-developer',
      name: 'Robo Developer',
      description: 'Software development and implementation specialist',
      category: 'development',
      enabledByDefault: true,
      availableModels: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
      defaultModel: 'gpt-4',
      defaultMaxTokens: 8000,
      capabilities: {
        supportsTools: true,
        supportsImages: false,
        supportsSubAgents: false,
        supportsParallel: false,
        supportsCodeExecution: false,
        maxContextLength: 4000,
        supportedModels: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
        supportedFileTypes: ['*.js', '*.ts', '*.jsx', '*.tsx', '*.py', '*.md'],
        canAccessInternet: true,
        canAccessFileSystem: true,
        canExecuteCommands: false
      },
      configuration: {
        codingStyle: 'modern',
        testFramework: 'jest',
        language: 'typescript',
        libraries: ['react', 'node.js', 'express'],
        tools: ['git', 'npm', 'docker']
      }
    });
  }

  /**
   * Create AQA configuration
   */
  private createAQAConfig(): AgentConfig {
    return createCompleteAgentConfig({
      id: 'robo-aqa',
      name: 'Robo AQA',
      description: 'Automated Quality Assurance and testing specialist',
      category: 'quality',
      enabledByDefault: true,
      availableModels: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
      defaultModel: 'gpt-4',
      defaultMaxTokens: 6000,
      capabilities: createAgentCapabilities([
        'Test strategy and planning',
        'Unit test creation and enhancement',
        'Integration testing',
        'End-to-end test development',
        'Test automation setup',
        'Quality gate enforcement',
        'Bug detection and reporting',
        'Performance testing'
      ]),
      configuration: {
        testingFrameworks: ['jest', 'cypress', 'playwright'],
        coverageTarget: 80,
        testTypes: ['unit', 'integration', 'e2e', 'performance'],
        reporting: ['junit', 'html', 'coverage'],
        qualityGates: true
      }
    });
  }

  /**
   * Create UX/UI configuration
   */
  private createUXUIConfig(): AgentConfig {
    return createCompleteAgentConfig({
      id: 'robo-ux-ui-designer',
      name: 'Robo UX/UI Designer',
      description: 'User experience and interface design specialist',
      category: 'design',
      enabledByDefault: false,
      availableModels: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
      defaultModel: 'gpt-4',
      defaultMaxTokens: 6000,
      capabilities: createAgentCapabilities([
        'User interface design',
        'User experience research',
        'Design system creation',
        'Accessibility compliance',
        'Responsive design',
        'Prototype creation',
        'User journey mapping',
        'Visual design optimization'
      ]),
      configuration: {
        designTools: ['figma', 'sketch', 'adobe xd'],
        frameworks: ['react', 'vue', 'angular'],
        cssFrameworks: ['tailwind', 'bootstrap', 'material-ui'],
        accessibilityStandards: ['wcag-2.1-aa'],
        designSystems: true
      }
    });
  }

  /**
   * Create system analyst configuration
   */
  private createSystemAnalystConfig(): AgentConfig {
    return createCompleteAgentConfig({
      id: 'robo-system-analyst',
      name: 'Robo System Analyst',
      description: 'System analysis and requirements engineering specialist',
      category: 'analysis',
      enabledByDefault: false,
      availableModels: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
      defaultModel: 'gpt-4',
      defaultMaxTokens: 8000,
      capabilities: createAgentCapabilities([
        'Requirements gathering and analysis',
        'System architecture design',
        'Business process modeling',
        'Competitive analysis',
        'Technical specification writing',
        'Risk assessment',
        'Stakeholder management',
        'Project planning'
      ]),
      configuration: {
        analysisMethods: ['use-cases', 'user-stories', 'data-flow'],
        documentationStandards: ['ieee-830', 'iso-29148'],
        modelingTools: ['uml', 'bpmn', 'flowcharts'],
        researchTechniques: ['surveys', 'interviews', 'observation']
      }
    });
  }

  /**
   * Create DevOps configuration
   */
  private createDevOpsConfig(): AgentConfig {
    return createCompleteAgentConfig({
      id: 'robo-devops-sre',
      name: 'Robo DevOps/SRE',
      description: 'DevOps and Site Reliability Engineering specialist',
      category: 'operations',
      enabledByDefault: false,
      availableModels: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
      defaultModel: 'gpt-4',
      defaultMaxTokens: 6000,
      capabilities: createAgentCapabilities([
        'CI/CD pipeline setup',
        'Infrastructure as code',
        'Monitoring and observability',
        'Security and compliance',
        'Performance optimization',
        'Disaster recovery planning',
        'Scaling strategies',
        'Incident response'
      ]),
      configuration: {
        platforms: ['aws', 'azure', 'gcp', 'kubernetes'],
        tools: ['docker', 'terraform', 'ansible', 'jenkins'],
        monitoring: ['prometheus', 'grafana', 'datadog'],
        scripting: ['bash', 'python', 'powershell']
      }
    });
  }

  /**
   * Create orchestrator configuration
   */
  private createOrchestratorConfig(): AgentConfig {
    return createCompleteAgentConfig({
      id: 'robo-orchestrator',
      name: 'Robo Orchestrator',
      description: 'Project orchestration and agent coordination specialist',
      category: 'orchestration',
      enabledByDefault: false,
      availableModels: ['gpt-4', 'claude-3-opus', 'gemini-pro'],
      defaultModel: 'gpt-4',
      defaultMaxTokens: 12000,
      capabilities: createAgentCapabilities([
        'Agent task coordination',
        'Signal workflow management',
        'Project scheduling',
        'Resource allocation',
        'Progress tracking',
        'Decision making',
        'Conflict resolution',
        'Quality control'
      ]),
      configuration: {
        coordinationMethod: 'signal-based',
        decisionFramework: 'chain-of-thought',
        schedulingAlgorithm: 'priority-based',
        monitoringLevel: 'comprehensive'
      }
    });
  }

  /**
   * Build category index
   */
  private buildCategoryIndex(): void {
    this.registry.categories = {};

    for (const config of Object.values(this.registry.agents)) {
      if (!config) continue;
      const category = config.category || 'uncategorized';
      if (!this.registry.categories[category]) {
        this.registry.categories[category] = [];
      }
      this.registry.categories[category].push(config.id);
    }

    logger.debug('buildCategoryIndex', 'Built category index');
  }

  /**
   * Load existing configuration
   */
  private async loadExistingConfig(configPath: string): Promise<Record<string, unknown>> {
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configData);
    } catch {
      // File doesn't exist or is invalid, return empty config
      return {
        version: '1.0.0',
        agents: { enabled: [] },
        templates: { default: 'fast' }
      };
    }
  }

  /**
   * Merge configurations
   */
  private mergeConfigurations(existing: Record<string, unknown>, newData: Record<string, unknown>): Record<string, unknown> {
    const existingAgents = existing['agents'] as Record<string, unknown> || {};
    const newAgents = newData['agents'] as string[] || [];
    const agentConfigs = newData['agentConfigs'] as Record<string, unknown> || {};

    return {
      ...existing,
      version: '1.0.0',
      'projectId': newData['projectId'] || existing['projectId'],
      'agents': {
        ...existingAgents,
        'enabled': newAgents || (existingAgents['enabled'] as string[] || []),
        'configurations': {
          ...(existingAgents['configurations'] as Record<string, unknown> || {}),
          ...agentConfigs
        }
      },
      'templates': {
        ...(existing['templates'] as Record<string, unknown> || {}),
        'default': newData['template'] || (existing['templates'] as Record<string, unknown>)?.['default'] || 'fast'
      },
      'features': {
        ...(existing['features'] as Record<string, unknown> || {}),
        'git': true,
        'npm': true,
        'testing': newAgents.includes('robo-aqa'),
        'design': newAgents.includes('robo-ux-ui-designer'),
        'devops': newAgents.includes('robo-devops-sre')
      },
      'createdAt': existing['createdAt'] || new Date().toISOString(),
      'updatedAt': new Date().toISOString()
    };
  }

  /**
   * Create AGENTS.md symlink
   */
  private async createAgentsMdSymlink(): Promise<void> {
    const agentsMdPath = join(process.cwd(), 'AGENTS.md');

    try {
      // Check if AGENTS.md already exists
      await fs.access(agentsMdPath);
      logger.debug('createAgentsMdSymlink', 'AGENTS.md already exists');
    } catch {
      // Create symlink from AGENTS.md to claude.md
      try {
        await fs.symlink('claude.md', agentsMdPath);
        logger.info('createAgentsMdSymlink', 'Created AGENTS.md symlink');
      } catch {
        // Fallback: copy the content instead of creating symlink
        const claudeContent = `# AGENTS.md

This file serves as a symlink to claude.md for agent configurations.

## 🤖 Configured Agents

${Object.keys(this.registry.agents).map(agentId => {
  const config = this.registry.agents[agentId];
  if (config) {
    return `### ${config.name} (${config.id})
- **Category**: ${config.category}
- **Description**: ${config.description}
- **Default Model**: ${config.defaultModel}
- **Max Tokens**: ${config.defaultMaxTokens}
- **Capabilities**: ${Object.entries(config.capabilities).filter(([_, v]) => v).map(([k]) => k).join(', ')}
`;
  }
  return '';
}).join('\n')}

---

*Generated by PRP CLI v0.5.0*
*Last Updated: ${new Date().toISOString()}*
`;

        await fs.writeFile(agentsMdPath, claudeContent, 'utf-8');
        logger.info('createAgentsMdSymlink', 'Created AGENTS.md file');
      }
    }
  }

  /**
   * Validate agent configuration
   */
  async validateConfiguration(config: Record<string, unknown>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check required fields
    if (!config['version']) {
      errors.push('Missing version field');
    }

    const agents = config['agents'] as Record<string, unknown>;
    const enabledAgents = agents?.['enabled'] as string[];

    if (!agents || !Array.isArray(enabledAgents)) {
      errors.push('Invalid or missing agents.enabled field');
    }

    // Validate agent IDs
    if (agents && Array.isArray(enabledAgents)) {
      for (const agentId of enabledAgents) {
        if (!this.registry.agents[agentId]) {
          errors.push(`Unknown agent ID: ${agentId}`);
        }
      }
    }

    // Check for duplicate agents
    if (agents && Array.isArray(enabledAgents)) {
      const uniqueAgents = new Set(enabledAgents);
      if (uniqueAgents.size !== enabledAgents.length) {
        errors.push('Duplicate agent IDs found');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get agent recommendations based on project type
   */
  getAgentRecommendations(projectType: string): string[] {
    const recommendations: Record<string, string[]> = {
      'web-app': ['robo-developer', 'robo-aqa', 'robo-ux-ui-designer'],
      'api': ['robo-developer', 'robo-aqa', 'robo-devops-sre'],
      'cli': ['robo-developer', 'robo-aqa'],
      'landing-page': ['robo-ux-ui-designer', 'robo-developer'],
      'fullstack': ['robo-developer', 'robo-aqa', 'robo-ux-ui-designer', 'robo-devops-sre'],
      'research': ['robo-system-analyst', 'robo-developer'],
      'enterprise': ['robo-developer', 'robo-aqa', 'robo-system-analyst', 'robo-devops-sre', 'robo-orchestrator']
    };

    return recommendations[projectType] || ['robo-developer', 'robo-aqa'];
  }

  /**
   * Get configuration summary
   */
  async getConfigurationSummary(): Promise<Record<string, unknown>> {
    return {
      totalAgents: Object.keys(this.registry.agents).length,
      categories: Object.keys(this.registry.categories),
      agents: Object.values(this.registry.agents).map(config => ({
        id: config.id,
        name: config.name,
        category: config.category,
        enabledByDefault: config.enabledByDefault
      }))
    };
  }
}