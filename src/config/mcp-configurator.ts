/**
 * MCP Configuration Service
 *
 * Manages Model Context Protocol (MCP) server configuration
 * Provides template-based MCP server setup for context7, chrome-mcp, etc.
 */
import { promises as fs } from 'fs';
import * as path from 'path';

import { Logger } from '../shared/logger';

export interface MCPServerConfig {
  name: string;
  description: string;
  enabled: boolean;
  config: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    timeout?: number;
    retries?: number;
  };
}
export interface MCPConfiguration {
  version: string;
  servers: Record<string, MCPServerConfig>;
}
export interface MCPConfigOptions {
  enabled: boolean;
  servers: string[];
  configPath: string;
  targetPath: string;
}
export class MCPConfigurator {
  private readonly logger = new Logger({});
  private readonly DEFAULT_CONFIG: MCPConfiguration = {
    version: '1.0.0',
    servers: {
      context7: {
        name: 'Context7',
        description: 'Context management and storage service',
        enabled: true,
        config: {
          command: 'npx',
          args: ['-y', '@context7/context7-mcp-server'],
          env: {
            CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}',
            CONTEXT7_URL: 'https://api.context7.ai',
          },
          timeout: 30000,
          retries: 3,
        },
      },
      'chrome-mcp': {
        name: 'Chrome DevTools MCP',
        description: 'Browser automation and debugging tools',
        enabled: true,
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-chrome-devtools'],
          env: {
            CHROME_HEADLESS: 'true',
          },
          timeout: 60000,
          retries: 2,
        },
      },
      github: {
        name: 'GitHub MCP',
        description: 'GitHub repository management and CI/CD integration',
        enabled: false,
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: {
            GITHUB_TOKEN: '${GITHUB_TOKEN}',
            GITHUB_API_URL: 'https://api.github.com',
          },
          timeout: 30000,
          retries: 3,
        },
      },
      filesystem: {
        name: 'Filesystem MCP',
        description: 'Local file system access and management',
        enabled: false,
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem'],
          env: {},
          timeout: 15000,
          retries: 2,
        },
      },
    },
  };
  /**
   * Generate MCP configuration file
   */
  async generateMCPConfig(options: MCPConfigOptions): Promise<void> {
    const { enabled, servers, configPath, targetPath } = options;
    if (!enabled) {
      this.logger.info('shared', 'MCPConfigurator', 'MCP configuration disabled');
      return;
    }
    this.logger.info('shared', 'MCPConfigurator', `Generating MCP config at: ${configPath}`);
    // Filter and enable only selected servers
    const mcpConfig: MCPConfiguration = {
      ...this.DEFAULT_CONFIG,
      servers: {},
    };
    for (const serverName of servers) {
      if (this.DEFAULT_CONFIG.servers[serverName]) {
        mcpConfig.servers[serverName] = {
          ...this.DEFAULT_CONFIG.servers[serverName],
          enabled: true,
        };
      }
    }
    // Ensure target directory exists
    const configDir = path.dirname(path.join(targetPath, configPath));
    await fs.mkdir(configDir, { recursive: true });
    // Write MCP configuration
    const configContent = JSON.stringify(mcpConfig, null, 2);
    await fs.writeFile(path.join(targetPath, configPath), configContent, 'utf-8');
    this.logger.info(
      'shared',
      'MCPConfigurator',
      `✅ MCP configuration created with ${servers.length} servers`,
    );
  }
  /**
   * Validate MCP configuration
   */
  async validateMCPConfig(configPath: string): Promise<ValidationResult> {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent) as MCPConfiguration;
      // Basic validation
      if (!config.version || !config.servers) {
        return {
          isValid: false,
          errors: ['Missing required fields: version or servers'],
        };
      }
      // Validate server configurations
      const errors: string[] = [];
      for (const [serverName, serverConfig] of Object.entries(config.servers)) {
        if (!serverConfig.name) {
          errors.push(`Server ${serverName}: missing name`);
        }
        if (serverConfig.enabled && !serverConfig.config?.command) {
          errors.push(`Server ${serverName}: missing command for enabled server`);
        }
      }
      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Failed to read or parse MCP config: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }
  /**
   * Get available MCP servers
   */
  getAvailableServers(): MCPServerConfig[] {
    return Object.values(this.DEFAULT_CONFIG.servers);
  }
  /**
   * Get MCP server by name
   */
  getServerConfig(serverName: string): MCPServerConfig | undefined {
    return this.DEFAULT_CONFIG.servers[serverName];
  }
  /**
   * Setup environment variables for MCP servers
   */
  async setupEnvironmentVariables(servers: string[], targetPath: string): Promise<void> {
    const envVars: string[] = [];
    // Context7 setup
    if (servers.includes('context7')) {
      envVars.push('# Context7 MCP Server');
      envVars.push('# Get your API key from: https://context7.ai');
      envVars.push('export CONTEXT7_API_KEY=""');
      envVars.push('');
    }
    // GitHub setup
    if (servers.includes('github')) {
      envVars.push('# GitHub MCP Server');
      envVars.push('# Create a personal access token at: https://github.com/settings/tokens');
      envVars.push('export GITHUB_TOKEN=""');
      envVars.push('');
    }
    // Write .env file with MCP variables
    if (envVars.length > 0) {
      const envContent = [
        '# MCP Server Environment Variables',
        '# Copy these to your .env file and fill in your API keys',
        '',
        ...envVars,
      ].join('\n');
      await fs.writeFile(path.join(targetPath, '.env.mcp'), envContent, 'utf-8');
      this.logger.info(
        'shared',
        'MCPConfigurator',
        'Created .env.mcp with environment variable templates',
      );
    }
  }
}
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
