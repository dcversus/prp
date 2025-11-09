/**
 * ♫ Agent Configuration CLI Commands
 *
 * CLI commands for managing agent configurations
 */

import { Command } from 'commander';
import { agentConfigManager, AgentConfig, AgentType, AgentRole, ProviderType } from '../config/agent-config';
import { createLayerLogger, FileUtils } from '../shared';
import inquirer from 'inquirer';

const logger = createLayerLogger('config');


interface CLIOptions {
  enabled?: boolean;
  enable?: boolean;
  disable?: boolean;
  type?: string;
  role?: string;
  provider?: string;
  json?: boolean;
  template?: string;
  format?: string;
  force?: boolean;
  all?: boolean;
}

interface AgentConfigOptions extends CLIOptions {
  id?: string;
  name?: string;
  model?: string;
  provider?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  interactive?: boolean;
  editor?: boolean;
}

/**
 * Create agent configuration commands
 */
export function createAgentConfigCommands(): Command {
  const agentConfigCmd = new Command('agent-config')
    .alias('ac')
    .description('Manage agent configurations (.prprc)');

  // List agents
  agentConfigCmd
    .command('list')
    .alias('ls')
    .description('List all configured agents')
    .option('-e, --enabled', 'Show only enabled agents')
    .option('-t, --type <type>', 'Filter by agent type')
    .option('-r, --role <role>', 'Filter by agent role')
    .option('-p, --provider <provider>', 'Filter by provider')
    .action(async (options) => {
      await listAgents(options);
    });

  // Show agent details
  agentConfigCmd
    .command('show <agent-id>')
    .alias('info')
    .description('Show detailed agent configuration')
    .option('-j, --json', 'Output as JSON')
    .action(async (agentId, options) => {
      await showAgent(agentId, options);
    });

  // Create new agent
  agentConfigCmd
    .command('create')
    .alias('new')
    .description('Create a new agent configuration')
    .option('-t, --template <template>', 'Use a configuration template')
    .option('-i, --interactive', 'Interactive agent creation')
    .action(async (options) => {
      await createAgent(options);
    });

  // Edit agent
  agentConfigCmd
    .command('edit <agent-id>')
    .alias('update')
    .description('Edit an existing agent configuration')
    .option('-e, --editor', 'Open in editor')
    .action(async (agentId, options) => {
      await editAgent(agentId, options);
    });

  // Enable/disable agent
  agentConfigCmd
    .command('toggle <agent-id>')
    .description('Enable or disable an agent')
    .option('-e, --enable', 'Enable the agent')
    .option('-d, --disable', 'Disable the agent')
    .action(async (agentId, options) => {
      await toggleAgent(agentId, options);
    });

  // Remove agent
  agentConfigCmd
    .command('remove <agent-id>')
    .alias('rm')
    .description('Remove an agent configuration')
    .option('-f, --force', 'Force removal without confirmation')
    .action(async (agentId, options) => {
      await removeAgent(agentId, options);
    });

  // Validate configuration
  agentConfigCmd
    .command('validate [agent-id]')
    .description('Validate agent configuration(s)')
    .option('-a, --all', 'Validate all agents')
    .action(async (agentId, options) => {
      await validateConfig(agentId, options);
    });

  // Import configuration
  agentConfigCmd
    .command('import <file>')
    .description('Import agent configuration from file')
    .option('-m, --merge', 'Merge with existing configuration')
    .action(async (file) => {
      await importConfig(file);
    });

  // Export configuration
  agentConfigCmd
    .command('export [file]')
    .description('Export agent configuration to file')
    .option('-a, --all', 'Export all agents')
    .option('-f, --format <format>', 'Output format (json|yaml)', 'json')
    .action(async (file, options) => {
      await exportConfig(file, options);
    });

  // List templates
  agentConfigCmd
    .command('templates')
    .alias('tpl')
    .description('List available configuration templates')
    .action(async () => {
      await listTemplates();
    });

  return agentConfigCmd;
}

/**
 * List agents
 */
async function listAgents(options: CLIOptions): Promise<void> {
  try {
    await agentConfigManager.loadConfig();

    let agents = agentConfigManager.getAllAgentConfigs();

    // Apply filters
    if (options.enabled) {
      agents = agents.filter(agent => agent.enabled);
    }
    if (options.type) {
      agents = agents.filter(agent => agent.type === options.type);
    }
    if (options.role) {
      agents = agents.filter(agent => agent.role === options.role);
    }
    if (options.provider) {
      agents = agents.filter(agent => agent.provider === options.provider);
    }

    if (agents.length === 0) {
      logger.info('config', 'No agents found matching the criteria.');
      return;
    }

    logger.info('config', '\n🤖 Agent Configurations:');
    logger.info('config', '─'.repeat(80));

    for (const agent of agents) {
      const status = agent.enabled ? '✅' : '❌';
      const roleBadge = getRoleBadge(agent.role);
      const providerBadge = getProviderBadge(agent.provider);

      logger.info('config', `${status} ${agent.id}`);
      logger.info('config', `   Name: ${agent.name}`);
      logger.info('config', `   Type: ${agent.type} | Role: ${roleBadge} | Provider: ${providerBadge}`);
      logger.info('config', `   Context: ${agent.capabilities.maxContextLength.toLocaleString()} tokens`);
      logger.info('config', `   Created: ${agent.metadata.createdAt.toLocaleDateString()}`);
      logger.info('config', `   Tags: ${agent.metadata.tags.join(', ') || 'none'}`);
      logger.info('config', '');
    }

    logger.info('config', `Total: ${agents.length} agent(s) shown`);

  } catch (error) {
    logger.error('listAgents', 'Failed to list agents', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to list agents', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Show agent details
 */
async function showAgent(agentId: string, options: CLIOptions): Promise<void> {
  try {
    await agentConfigManager.loadConfig();

    const agent = agentConfigManager.getAgentConfig(agentId);
    if (!agent) {
      logger.error('showAgent', `Agent not found: ${agentId}`);
      return;
    }

    if (options.json) {
      logger.info('config', JSON.stringify(agent, null, 2));
      return;
    }

    logger.info('config', `\n🤖 Agent Configuration: ${agent.name}`);
    logger.info('config', '─'.repeat(80));

    logger.info("config", `ID: ${agent.id}`);
    logger.info("config", `Status: ${agent.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    logger.info("config", `Type: ${agent.type}`);
    logger.info("config", `Role: ${getRoleBadge(agent.role)}`);
    logger.info("config", `Provider: ${getProviderBadge(agent.provider)}`);

    logger.info("config", '\n📊 Capabilities:');
    logger.info("config", `  Max Context: ${agent.capabilities.maxContextLength.toLocaleString()} tokens`);
    logger.info("config", `  Supports Tools: ${agent.capabilities.supportsTools ? '✅' : '❌'}`);
    logger.info("config", `  Supports Images: ${agent.capabilities.supportsImages ? '✅' : '❌'}`);
    logger.info("config", `  Supports Sub-agents: ${agent.capabilities.supportsSubAgents ? '✅' : '❌'}`);
    logger.info("config", `  Can Execute Commands: ${agent.capabilities.canExecuteCommands ? '✅' : '❌'}`);

    logger.info("config", '\n⚡ Limits:');
    logger.info("config", `  Max Tokens/Request: ${agent.limits.maxTokensPerRequest.toLocaleString()}`);
    logger.info("config", `  Max Requests/Hour: ${agent.limits.maxRequestsPerHour}`);
    logger.info("config", `  Max Requests/Day: ${agent.limits.maxRequestsPerDay}`);
    logger.info("config", `  Max Cost/Day: $${agent.limits.maxCostPerDay.toFixed(2)}`);
    logger.info("config", `  Max Execution Time: ${formatDuration(agent.limits.maxExecutionTime)}`);

    logger.info("config", '\n🎨 Personality:');
    logger.info("config", `  Tone: ${agent.personality.tone}`);
    logger.info("config", `  Response Style: ${agent.personality.responseStyle}`);
    logger.info("config", `  Creativity: ${(agent.personality.creativity * 100).toFixed(0)}%`);
    logger.info("config", `  Strictness: ${(agent.personality.strictness * 100).toFixed(0)}%`);
    logger.info("config", `  Proactivity: ${(agent.personality.proactivity * 100).toFixed(0)}%`);

    if (agent.personality.customInstructions) {
      logger.info("config", `  Custom Instructions: ${agent.personality.customInstructions}`);
    }

    logger.info("config", '\n🔧 Tools:');
    if (agent.tools.length === 0) {
      logger.info("config", '  No tools configured');
    } else {
      for (const tool of agent.tools) {
        const status = tool.enabled ? '✅' : '❌';
        logger.info("config", `  ${status} ${tool.name} (${tool.type})`);
      }
    }

    logger.info("config", '\n📁 Environment:');
    logger.info("config", `  Working Directory: ${agent.environment.workingDirectory}`);
    logger.info("config", `  Shell: ${agent.environment.shell}`);
    logger.info("config", `  Node Version: ${agent.environment.nodeVersion}`);
    logger.info("config", `  File System Access: ${agent.environment.fileSystem.allowWrite ? '✅ Read/Write' : '✅ Read Only'}`);

    logger.info("config", '\n📋 Metadata:');
    logger.info("config", `  Version: ${agent.metadata.version}`);
    logger.info("config", `  Author: ${agent.metadata.author}`);
    logger.info("config", `  Category: ${agent.metadata.category}`);
    logger.info("config", `  Created: ${agent.metadata.createdAt.toLocaleString()}`);
    logger.info("config", `  Modified: ${agent.metadata.lastModified.toLocaleString()}`);
    logger.info("config", `  Tags: ${agent.metadata.tags.join(', ') || 'none'}`);

  } catch (error) {
    logger.error('showAgent', 'Failed to show agent', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to show agent:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Create new agent
 */
async function createAgent(options: AgentConfigOptions): Promise<void> {
  try {
    let agent: AgentConfig | null = null;

    if (options.template) {
      // Create from template
      const template = agentConfigManager.getTemplate(options.template);
      if (!template) {
        logger.error('config', `❌ Template not found: ${options.template}`);
        logger.info("config", 'Available templates:');
        await listTemplates();
        return;
      }

      logger.info("config", `\n📝 Creating agent from template: ${template.name}`);

      const questions = template.variables.map(variable => ({
        type: variable.type === 'secret' ? 'password' :
              variable.type === 'boolean' ? 'confirm' :
              variable.validation?.options ? 'list' : 'input',
        name: variable.name,
        message: variable.description,
        default: variable.defaultValue,
        choices: variable.validation?.options,
        validate: (input: string) => {
          if (variable.required && !input) {
            return `${variable.name} is required`;
          }
          return true;
        }
      }));

      const answers = await inquirer.prompt(questions);

      agent = agentConfigManager.createAgentFromTemplate(options.template, answers);
    } else if (options.interactive) {
      // Interactive creation
      logger.info("config", '\n📝 Interactive Agent Creation');

      const interactiveQuestions = [
        {
          type: 'input',
          name: 'name',
          message: 'Agent name:',
          validate: (input: string) => input.trim() !== '' || 'Name is required'
        },
        {
          type: 'list',
          name: 'type',
          message: 'Agent type:',
          choices: [
            'claude-code-anthropic',
            'claude-code-glm',
            'codex',
            'gemini',
            'amp',
            'aider',
            'github-copilot',
            'custom'
          ]
        },
        {
          type: 'list',
          name: 'role',
          message: 'Agent role:',
          choices: [
            'orchestrator-agent',
            'task-agent',
            'specialist-agent',
            'robo-developer',
            'robo-system-analyst',
            'robo-aqa',
            'robo-security-expert',
            'robo-performance-engineer',
            'robo-ui-designer',
            'robo-devops',
            'robo-documenter'
          ]
        },
        {
          type: 'list',
          name: 'provider',
          message: 'Provider:',
          choices: [
            'anthropic',
            'openai',
            'google',
            'groq',
            'ollama',
            'github',
            'custom'
          ]
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'API Key:',
          when: (answers: Record<string, string>) => {
            const provider = answers['provider'];
            return provider ? ['anthropic', 'openai', 'google', 'groq'].includes(provider) : false;
          },
          validate: (input: string) => input.trim() !== '' || 'API Key is required'
        },
        {
          type: 'confirm',
          name: 'enabled',
          message: 'Enable this agent?',
          default: true
        }
      ];

      const answers = await inquirer.prompt(interactiveQuestions);

      agent = agentConfigManager.createAgentFromTemplate('claude-code-anthropic', answers);
      if (agent) {
        agent.name = answers['name'] as string;
        agent.type = answers['type'] as AgentType;
        agent.role = answers['role'] as AgentRole;
        agent.provider = answers['provider'] as ProviderType;
        agent.enabled = Boolean(answers['enabled']);
        if (answers['apiKey'] && agent.authentication.credentials) {
          agent.authentication.credentials.apiKey = answers['apiKey'];
        }
      }
    } else {
      logger.error('config', '❌ Please specify either --template or --interactive');
      return;
    }

    if (!agent) {
      logger.error('config', '❌ Failed to create agent');
      return;
    }

    // Validate and save
    await agentConfigManager.setAgentConfig(agent);
    logger.info("config", `✅ Agent created: ${agent.name} (${agent.id})`);

  } catch (error) {
    logger.error('createAgent', 'Failed to create agent', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to create agent:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Edit agent
 */
async function editAgent(agentId: string, options: AgentConfigOptions): Promise<void> {
  try {
    await agentConfigManager.loadConfig();

    const agent = agentConfigManager.getAgentConfig(agentId);
    if (!agent) {
      logger.error('config', `❌ Agent not found: ${agentId}`);
      return;
    }

    if (options.editor) {
      // Open in editor
      const tempFile = `/tmp/agent-${agentId}.json`;
      await FileUtils.writeTextFile(tempFile, JSON.stringify(agent, null, 2));

      const editor = process.env['EDITOR'] ?? 'nano';
      const { spawn } = await import('child_process');
      spawn(editor, [tempFile], { stdio: 'inherit' }).on('exit', async () => {
        const updatedData = await FileUtils.readTextFile(tempFile);
        const updatedAgent = JSON.parse(updatedData);
        await agentConfigManager.setAgentConfig(updatedAgent);
        logger.info("config", `✅ Agent ${agentId} updated`);
      });
    } else {
      // Interactive editing
      logger.info("config", `\n✏️ Editing agent: ${agent.name}`);

      const editQuestions = [
        {
          type: 'input',
          name: 'name',
          message: 'Agent name:',
          default: agent.name
        },
        {
          type: 'confirm',
          name: 'enabled',
          message: 'Enable this agent?',
          default: agent.enabled
        },
        {
          type: 'list',
          name: 'tone',
          message: 'Personality tone:',
          default: agent.personality.tone,
          choices: ['professional', 'friendly', 'casual', 'technical', 'creative']
        },
        {
          type: 'number',
          name: 'maxTokens',
          message: 'Max tokens per request:',
          default: agent.limits.maxTokensPerRequest
        },
        {
          type: 'number',
          name: 'creativity',
          message: 'Creativity (0-1):',
          default: agent.personality.creativity
        }
      ];

      const answers = await inquirer.prompt(editQuestions);

      // Apply updates
      agent.name = answers['name'];
      agent.enabled = answers['enabled'];
      agent.personality.tone = answers['tone'];
      agent.limits.maxTokensPerRequest = answers['maxTokens'];
      agent.personality.creativity = answers['creativity'];
      agent.metadata.lastModified = new Date();

      await agentConfigManager.setAgentConfig(agent);
      logger.info("config", `✅ Agent ${agentId} updated`);
    }

  } catch (error) {
    logger.error('editAgent', 'Failed to edit agent', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to edit agent:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Toggle agent enabled/disabled
 */
async function toggleAgent(agentId: string, options: CLIOptions): Promise<void> {
  try {
    await agentConfigManager.loadConfig();

    const agent = agentConfigManager.getAgentConfig(agentId);
    if (!agent) {
      logger.error('config', `❌ Agent not found: ${agentId}`);
      return;
    }

    let enabled: boolean;
    if (options.enable) {
      enabled = true;
    } else if (options.disable) {
      enabled = false;
    } else {
      // Interactive toggle
      const toggleQuestions = [
        {
          type: 'confirm',
          name: 'enabled',
          message: `Enable agent "${agent.name}"?`,
          default: !agent.enabled
        }
      ];
      const answers = await inquirer.prompt(toggleQuestions);
      enabled = answers['enabled'];
    }

    await agentConfigManager.setAgentEnabled(agentId, enabled);
    logger.info("config", `✅ Agent ${agentId} ${enabled ? 'enabled' : 'disabled'}`);

  } catch (error) {
    logger.error('toggleAgent', 'Failed to toggle agent', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to toggle agent:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Remove agent
 */
async function removeAgent(agentId: string, options: CLIOptions): Promise<void> {
  try {
    await agentConfigManager.loadConfig();

    const agent = agentConfigManager.getAgentConfig(agentId);
    if (!agent) {
      logger.error('config', `❌ Agent not found: ${agentId}`);
      return;
    }

    if (!options.force) {
      const removeQuestions = [
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove agent "${agent.name}"?`,
          default: false
        }
      ];

      const answers = await inquirer.prompt(removeQuestions);

      if (!answers['confirm']) {
        logger.info("config", 'Operation cancelled');
        return;
      }
    }

    const removed = await agentConfigManager.removeAgentConfig(agentId);
    if (removed) {
      logger.info("config", `✅ Agent ${agentId} removed`);
    } else {
      logger.error('config', `❌ Failed to remove agent ${agentId}`);
    }

  } catch (error) {
    logger.error('removeAgent', 'Failed to remove agent', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to remove agent:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Validate configuration
 */
async function validateConfig(agentId?: string, options?: CLIOptions): Promise<void> {
  try {
    await agentConfigManager.loadConfig();

    if (options?.all || !agentId) {
      // Validate all agents
      const agents = agentConfigManager.getAllAgentConfigs();
      logger.info("config", `\n🔍 Validating ${agents.length} agent(s)...`);

      let validCount = 0;
      let errorCount = 0;

      for (const agent of agents) {
        const validation = agentConfigManager.validateAgentConfig(agent);
        const status = validation.valid ? '✅' : '❌';

        logger.info("config", `${status} ${agent.name} (${agent.id})`);

        if (!validation.valid) {
          errorCount++;
          for (const error of validation.errors) {
            logger.info("config", `   ❌ ${error.field}: ${error.message}`);
          }
        } else {
          validCount++;
        }

        for (const warning of validation.warnings) {
          logger.info("config", `   ⚠️ ${warning.field}: ${warning.message}`);
        }

        if (validation.suggestions.length > 0) {
          logger.info("config", `   💡 Suggestions: ${validation.suggestions.join(', ')}`);
        }
      }

      logger.info("config", `\n📊 Validation Summary:`);
      logger.info("config", `  ✅ Valid: ${validCount}`);
      logger.info("config", `  ❌ Invalid: ${errorCount}`);
      logger.info("config", `  📊 Total: ${agents.length}`);

    } else {
      // Validate specific agent
      const agent = agentConfigManager.getAgentConfig(agentId);
      if (!agent) {
        logger.error('config', `❌ Agent not found: ${agentId}`);
        return;
      }

      const validation = agentConfigManager.validateAgentConfig(agent);
      const status = validation.valid ? '✅' : '❌';

      logger.info("config", `\n🔍 Validation Results for ${agent.name}:`);
      logger.info("config", `${status} Overall: ${validation.valid ? 'Valid' : 'Invalid'}`);

      if (validation.errors.length > 0) {
        logger.info("config", '\n❌ Errors:');
        for (const error of validation.errors) {
          logger.info("config", `  ${error.field}: ${error.message}`);
        }
      }

      if (validation.warnings.length > 0) {
        logger.info("config", '\n⚠️ Warnings:');
        for (const warning of validation.warnings) {
          logger.info("config", `  ${warning.field}: ${warning.message}`);
          logger.info("config", `    💡 ${warning.recommendation}`);
        }
      }

      if (validation.suggestions.length > 0) {
        logger.info("config", '\n💡 Suggestions:');
        for (const suggestion of validation.suggestions) {
          logger.info("config", `  • ${suggestion}`);
        }
      }
    }

  } catch (error) {
    logger.error('validateConfig', 'Failed to validate configuration', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to validate configuration:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Import configuration
 */
async function importConfig(file: string): Promise<void> {
  try {
    if (!await FileUtils.pathExists(file)) {
      logger.error('config', `❌ File not found: ${file}`);
      return;
    }

    const configData = JSON.parse(await FileUtils.readTextFile(file));

    if (!configData.agents || !Array.isArray(configData.agents)) {
      logger.error('config', '❌ Invalid configuration file format');
      return;
    }

    await agentConfigManager.loadConfig();

    let importedCount = 0;
    for (const agentData of configData.agents) {
      try {
        await agentConfigManager.setAgentConfig(agentData);
        importedCount++;
      } catch (error) {
        logger.error('config', `❌ Failed to import agent: ${agentData.id ?? agentData.name}`, error instanceof Error ? error : new Error(String(error)));
      }
    }

    logger.info("config", `✅ Imported ${importedCount} agent(s) from ${file}`);

  } catch (error) {
    logger.error('importConfig', 'Failed to import configuration', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to import configuration:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Export configuration
 */
async function exportConfig(file?: string, options?: CLIOptions): Promise<void> {
  try {
    await agentConfigManager.loadConfig();

    const agents = options?.all
      ? agentConfigManager.getAllAgentConfigs()
      : agentConfigManager.getEnabledAgents();

    const configData = {
      version: '1.0.0',
      agents,
      exportedAt: new Date().toISOString(),
      totalAgents: agents.length
    };

    const filename = file ?? '.prprc.export';
    const content = options?.format === 'yaml'
      ? await convertToYaml(configData)
      : JSON.stringify(configData, null, 2);

    await FileUtils.writeTextFile(filename, content);
    logger.info("config", `✅ Exported ${agents.length} agent(s) to ${filename}`);

  } catch (error) {
    logger.error('exportConfig', 'Failed to export configuration', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to export configuration:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * List templates
 */
async function listTemplates(): Promise<void> {
  try {
    const templates = agentConfigManager.getAllTemplates();

    if (templates.length === 0) {
      logger.info("config", 'No templates available.');
      return;
    }

    logger.info("config", '\n📋 Available Templates:');
    logger.info("config", '─'.repeat(80));

    for (const template of templates) {
      logger.info("config", `📄 ${template.name}`);
      logger.info("config", `   ID: ${template.id}`);
      logger.info("config", `   Category: ${template.category}`);
      logger.info("config", `   Description: ${template.description}`);
      logger.info("config", `   Variables: ${template.variables.length}`);
      logger.info("config", `   Required Features: ${template.requiredFeatures.join(', ') || 'none'}`);
      logger.info("config", '');
    }

    logger.info("config", `Total: ${templates.length} template(s)`);

  } catch (error) {
    logger.error('listTemplates', 'Failed to list templates', error instanceof Error ? error : new Error(String(error)));
    logger.error('config', '❌ Failed to list templates:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Helper functions
 */
function getRoleBadge(role: string): string {
  const badges: Record<string, string> = {
    'orchestrator-agent': '🎯 Orchestrator',
    'task-agent': '⚡ Task Agent',
    'specialist-agent': '🔧 Specialist',
    'robo-developer': '💻 Developer',
    'robo-system-analyst': '📊 Analyst',
    'robo-aqa': '🧪 QA',
    'robo-security-expert': '🔒 Security',
    'robo-performance-engineer': '🚀 Performance',
    'robo-ui-designer': '🎨 Designer',
    'robo-devops': '🔧 DevOps',
    'robo-documenter': '📝 Documenter'
  };
  return badges[role] ?? role;
}

function getProviderBadge(provider: string): string {
  const badges: Record<string, string> = {
    'anthropic': '🤖 Anthropic',
    'openai': '🧠 OpenAI',
    'google': '🔍 Google',
    'groq': '⚡ Groq',
    'ollama': '🦙 Ollama',
    'github': '🐙 GitHub',
    'custom': '⚙️ Custom'
  };
  return badges[provider] ?? provider;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

async function convertToYaml(data: Record<string, unknown>): Promise<string> {
  // Simple JSON to YAML conversion (in real implementation, use a proper YAML library)
  return JSON.stringify(data, null, 2)
    .replace(/"/g, '')
    .replace(/,/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '');
}