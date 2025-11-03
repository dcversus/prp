/**
 * ♫ Agent Configuration CLI Commands
 *
 * CLI commands for managing agent configurations
 */

import { Command } from 'commander';
import { agentConfigManager, AgentConfig } from '../config/agent-config';
import { createLayerLogger, FileUtils } from '../shared';
import inquirer, { type Question } from 'inquirer';

const logger = createLayerLogger('config');

// Template variable answer interface
interface TemplateVariableAnswers {
  [key: string]: string | number | boolean;
}

// Interactive agent creation answers interface
interface InteractiveAgentAnswers {
  name: string;
  type: string;
  role: string;
  provider: string;
  apiKey?: string;
  enabled: boolean;
}

// Agent editing answers interface
interface EditAgentAnswers {
  name: string;
  enabled: boolean;
  tone: string;
  maxTokens: number;
  creativity: number;
}

// Toggle agent answers interface
interface ToggleAgentAnswers {
  enabled: boolean;
}

// Remove agent answers interface
interface RemoveAgentAnswers {
  confirm: boolean;
}

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
    .action(async (file, options) => {
      await importConfig(file, options);
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
      console.log('No agents found matching the criteria.');
      return;
    }

    console.log('\n🤖 Agent Configurations:');
    console.log('─'.repeat(80));

    for (const agent of agents) {
      const status = agent.enabled ? '✅' : '❌';
      const roleBadge = getRoleBadge(agent.role);
      const providerBadge = getProviderBadge(agent.provider);

      console.log(`${status} ${agent.id}`);
      console.log(`   Name: ${agent.name}`);
      console.log(`   Type: ${agent.type} | Role: ${roleBadge} | Provider: ${providerBadge}`);
      console.log(`   Context: ${agent.capabilities.maxContextLength.toLocaleString()} tokens`);
      console.log(`   Created: ${agent.metadata.createdAt.toLocaleDateString()}`);
      console.log(`   Tags: ${agent.metadata.tags.join(', ') || 'none'}`);
      console.log('');
    }

    console.log(`Total: ${agents.length} agent(s) shown`);

  } catch (error) {
    logger.error('listAgents', 'Failed to list agents', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to list agents:', error instanceof Error ? error.message : String(error));
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
      console.error(`❌ Agent not found: ${agentId}`);
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(agent, null, 2));
      return;
    }

    console.log(`\n🤖 Agent Configuration: ${agent.name}`);
    console.log('─'.repeat(80));

    console.log(`ID: ${agent.id}`);
    console.log(`Status: ${agent.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Type: ${agent.type}`);
    console.log(`Role: ${getRoleBadge(agent.role)}`);
    console.log(`Provider: ${getProviderBadge(agent.provider)}`);

    console.log('\n📊 Capabilities:');
    console.log(`  Max Context: ${agent.capabilities.maxContextLength.toLocaleString()} tokens`);
    console.log(`  Supports Tools: ${agent.capabilities.supportsTools ? '✅' : '❌'}`);
    console.log(`  Supports Images: ${agent.capabilities.supportsImages ? '✅' : '❌'}`);
    console.log(`  Supports Sub-agents: ${agent.capabilities.supportsSubAgents ? '✅' : '❌'}`);
    console.log(`  Can Execute Commands: ${agent.capabilities.canExecuteCommands ? '✅' : '❌'}`);

    console.log('\n⚡ Limits:');
    console.log(`  Max Tokens/Request: ${agent.limits.maxTokensPerRequest.toLocaleString()}`);
    console.log(`  Max Requests/Hour: ${agent.limits.maxRequestsPerHour}`);
    console.log(`  Max Requests/Day: ${agent.limits.maxRequestsPerDay}`);
    console.log(`  Max Cost/Day: $${agent.limits.maxCostPerDay.toFixed(2)}`);
    console.log(`  Max Execution Time: ${formatDuration(agent.limits.maxExecutionTime)}`);

    console.log('\n🎨 Personality:');
    console.log(`  Tone: ${agent.personality.tone}`);
    console.log(`  Response Style: ${agent.personality.responseStyle}`);
    console.log(`  Creativity: ${(agent.personality.creativity * 100).toFixed(0)}%`);
    console.log(`  Strictness: ${(agent.personality.strictness * 100).toFixed(0)}%`);
    console.log(`  Proactivity: ${(agent.personality.proactivity * 100).toFixed(0)}%`);

    if (agent.personality.customInstructions) {
      console.log(`  Custom Instructions: ${agent.personality.customInstructions}`);
    }

    console.log('\n🔧 Tools:');
    if (agent.tools.length === 0) {
      console.log('  No tools configured');
    } else {
      for (const tool of agent.tools) {
        const status = tool.enabled ? '✅' : '❌';
        console.log(`  ${status} ${tool.name} (${tool.type})`);
      }
    }

    console.log('\n📁 Environment:');
    console.log(`  Working Directory: ${agent.environment.workingDirectory}`);
    console.log(`  Shell: ${agent.environment.shell}`);
    console.log(`  Node Version: ${agent.environment.nodeVersion}`);
    console.log(`  File System Access: ${agent.environment.fileSystem.allowWrite ? '✅ Read/Write' : '✅ Read Only'}`);

    console.log('\n📋 Metadata:');
    console.log(`  Version: ${agent.metadata.version}`);
    console.log(`  Author: ${agent.metadata.author}`);
    console.log(`  Category: ${agent.metadata.category}`);
    console.log(`  Created: ${agent.metadata.createdAt.toLocaleString()}`);
    console.log(`  Modified: ${agent.metadata.lastModified.toLocaleString()}`);
    console.log(`  Tags: ${agent.metadata.tags.join(', ') || 'none'}`);

  } catch (error) {
    logger.error('showAgent', 'Failed to show agent', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to show agent:', error instanceof Error ? error.message : String(error));
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
        console.error(`❌ Template not found: ${options.template}`);
        console.log('Available templates:');
        await listTemplates();
        return;
      }

      console.log(`\n📝 Creating agent from template: ${template.name}`);

      const questions: any[] = template.variables.map(variable => ({
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
      console.log('\n📝 Interactive Agent Creation');

      const interactiveQuestions: any[] = [
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
          when: (answers: Record<string, string>) => ['anthropic', 'openai', 'google', 'groq'].includes(answers['provider']),
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
        agent.name = answers['name'];
        agent.type = answers['type'];
        agent.role = answers['role'];
        agent.provider = answers['provider'];
        agent.enabled = answers['enabled'];
        if (answers['apiKey'] && agent.authentication.credentials) {
          agent.authentication.credentials.apiKey = answers['apiKey'];
        }
      }
    } else {
      console.error('❌ Please specify either --template or --interactive');
      return;
    }

    if (!agent) {
      console.error('❌ Failed to create agent');
      return;
    }

    // Validate and save
    await agentConfigManager.setAgentConfig(agent);
    console.log(`✅ Agent created: ${agent.name} (${agent.id})`);

  } catch (error) {
    logger.error('createAgent', 'Failed to create agent', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to create agent:', error instanceof Error ? error.message : String(error));
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
      console.error(`❌ Agent not found: ${agentId}`);
      return;
    }

    if (options.editor) {
      // Open in editor
      const tempFile = `/tmp/agent-${agentId}.json`;
      await FileUtils.writeTextFile(tempFile, JSON.stringify(agent, null, 2));

      const editor = process.env['EDITOR'] || 'nano';
      const { spawn } = await import('child_process');
      spawn(editor, [tempFile], { stdio: 'inherit' }).on('exit', async () => {
        const updatedData = await FileUtils.readTextFile(tempFile);
        const updatedAgent = JSON.parse(updatedData);
        await agentConfigManager.setAgentConfig(updatedAgent);
        console.log(`✅ Agent ${agentId} updated`);
      });
    } else {
      // Interactive editing
      console.log(`\n✏️ Editing agent: ${agent.name}`);

      const editQuestions: any[] = [
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
      console.log(`✅ Agent ${agentId} updated`);
    }

  } catch (error) {
    logger.error('editAgent', 'Failed to edit agent', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to edit agent:', error instanceof Error ? error.message : String(error));
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
      console.error(`❌ Agent not found: ${agentId}`);
      return;
    }

    let enabled: boolean;
    if (options.enable) {
      enabled = true;
    } else if (options.disable) {
      enabled = false;
    } else {
      // Interactive toggle
      const toggleQuestions: any[] = [
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
    console.log(`✅ Agent ${agentId} ${enabled ? 'enabled' : 'disabled'}`);

  } catch (error) {
    logger.error('toggleAgent', 'Failed to toggle agent', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to toggle agent:', error instanceof Error ? error.message : String(error));
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
      console.error(`❌ Agent not found: ${agentId}`);
      return;
    }

    if (!options.force) {
      const removeQuestions: any[] = [
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove agent "${agent.name}"?`,
          default: false
        }
      ];

      const answers = await inquirer.prompt(removeQuestions);

      if (!answers['confirm']) {
        console.log('Operation cancelled');
        return;
      }
    }

    const removed = await agentConfigManager.removeAgentConfig(agentId);
    if (removed) {
      console.log(`✅ Agent ${agentId} removed`);
    } else {
      console.error(`❌ Failed to remove agent ${agentId}`);
    }

  } catch (error) {
    logger.error('removeAgent', 'Failed to remove agent', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to remove agent:', error instanceof Error ? error.message : String(error));
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
      console.log(`\n🔍 Validating ${agents.length} agent(s)...`);

      let validCount = 0;
      let errorCount = 0;

      for (const agent of agents) {
        const validation = agentConfigManager.validateAgentConfig(agent);
        const status = validation.valid ? '✅' : '❌';

        console.log(`${status} ${agent.name} (${agent.id})`);

        if (!validation.valid) {
          errorCount++;
          for (const error of validation.errors) {
            console.log(`   ❌ ${error.field}: ${error.message}`);
          }
        } else {
          validCount++;
        }

        for (const warning of validation.warnings) {
          console.log(`   ⚠️ ${warning.field}: ${warning.message}`);
        }

        if (validation.suggestions.length > 0) {
          console.log(`   💡 Suggestions: ${validation.suggestions.join(', ')}`);
        }
      }

      console.log(`\n📊 Validation Summary:`);
      console.log(`  ✅ Valid: ${validCount}`);
      console.log(`  ❌ Invalid: ${errorCount}`);
      console.log(`  📊 Total: ${agents.length}`);

    } else {
      // Validate specific agent
      const agent = agentConfigManager.getAgentConfig(agentId);
      if (!agent) {
        console.error(`❌ Agent not found: ${agentId}`);
        return;
      }

      const validation = agentConfigManager.validateAgentConfig(agent);
      const status = validation.valid ? '✅' : '❌';

      console.log(`\n🔍 Validation Results for ${agent.name}:`);
      console.log(`${status} Overall: ${validation.valid ? 'Valid' : 'Invalid'}`);

      if (validation.errors.length > 0) {
        console.log('\n❌ Errors:');
        for (const error of validation.errors) {
          console.log(`  ${error.field}: ${error.message}`);
        }
      }

      if (validation.warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        for (const warning of validation.warnings) {
          console.log(`  ${warning.field}: ${warning.message}`);
          console.log(`    💡 ${warning.recommendation}`);
        }
      }

      if (validation.suggestions.length > 0) {
        console.log('\n💡 Suggestions:');
        for (const suggestion of validation.suggestions) {
          console.log(`  • ${suggestion}`);
        }
      }
    }

  } catch (error) {
    logger.error('validateConfig', 'Failed to validate configuration', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to validate configuration:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Import configuration
 */
async function importConfig(file: string, _options: CLIOptions): Promise<void> {
  try {
    if (!await FileUtils.pathExists(file)) {
      console.error(`❌ File not found: ${file}`);
      return;
    }

    const configData = JSON.parse(await FileUtils.readTextFile(file));

    if (!configData.agents || !Array.isArray(configData.agents)) {
      console.error('❌ Invalid configuration file format');
      return;
    }

    await agentConfigManager.loadConfig();

    let importedCount = 0;
    for (const agentData of configData.agents) {
      try {
        await agentConfigManager.setAgentConfig(agentData);
        importedCount++;
      } catch (error) {
        console.error(`❌ Failed to import agent: ${agentData.id || agentData.name}`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`✅ Imported ${importedCount} agent(s) from ${file}`);

  } catch (error) {
    logger.error('importConfig', 'Failed to import configuration', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to import configuration:', error instanceof Error ? error.message : String(error));
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

    const filename = file || '.prprc.export';
    const content = options?.format === 'yaml'
      ? await convertToYaml(configData)
      : JSON.stringify(configData, null, 2);

    await FileUtils.writeTextFile(filename, content);
    console.log(`✅ Exported ${agents.length} agent(s) to ${filename}`);

  } catch (error) {
    logger.error('exportConfig', 'Failed to export configuration', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to export configuration:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * List templates
 */
async function listTemplates(): Promise<void> {
  try {
    const templates = agentConfigManager.getAllTemplates();

    if (templates.length === 0) {
      console.log('No templates available.');
      return;
    }

    console.log('\n📋 Available Templates:');
    console.log('─'.repeat(80));

    for (const template of templates) {
      console.log(`📄 ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Description: ${template.description}`);
      console.log(`   Variables: ${template.variables.length}`);
      console.log(`   Required Features: ${template.requiredFeatures.join(', ') || 'none'}`);
      console.log('');
    }

    console.log(`Total: ${templates.length} template(s)`);

  } catch (error) {
    logger.error('listTemplates', 'Failed to list templates', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Failed to list templates:', error instanceof Error ? error.message : String(error));
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
  return badges[role] || role;
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
  return badges[provider] || provider;
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