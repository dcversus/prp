/**
 * Unit Tests: Agent Configuration System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AgentConfigManager, AgentConfig } from '../../src/config/agent-config';
import { FileUtils } from '../../src/shared';
import { resolve } from 'path';
import * as fs from 'fs-extra';

describe('AgentConfigManager', () => {
  let manager: AgentConfigManager;
  const testConfigPath = resolve(__dirname, '../temp/test-prprc.json');

  beforeEach(async () => {
    // Ensure temp directory exists
    await fs.ensureDir(resolve(__dirname, '../temp'));
    manager = new AgentConfigManager();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await FileUtils.removeFile(testConfigPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Agent Validation', () => {
    it('should validate a correct agent configuration', () => {
      const validAgent: AgentConfig = {
        id: 'test-agent-1',
        name: 'Test Agent',
        type: 'claude-code-anthropic',
        role: 'orchestrator-agent',
        provider: 'anthropic',
        enabled: true,
        capabilities: {
          supportsTools: true,
          supportsImages: true,
          supportsSubAgents: false,
          supportsParallel: false,
          supportsCodeExecution: false,
          maxContextLength: 200000,
          supportedModels: ['claude-3-5-sonnet-20241022'],
          supportedFileTypes: ['*'],
          canAccessInternet: true,
          canAccessFileSystem: true,
          canExecuteCommands: false
        },
        limits: {
          maxTokensPerRequest: 100000,
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 500,
          maxCostPerDay: 50.0,
          maxExecutionTime: 600000,
          maxMemoryUsage: 2048,
          maxConcurrentTasks: 3,
          cooldownPeriod: 2000
        },
        authentication: {
          type: 'api-key',
          credentials: {
            apiKey: 'test-key'
          },
          encrypted: false
        },
        personality: {
          tone: 'professional',
          language: 'en',
          responseStyle: 'detailed',
          verbosity: 'balanced',
          creativity: 0.7,
          strictness: 0.6,
          proactivity: 0.4,
          communicationStyle: {
            useEmojis: false,
            useFormatting: true,
            includeCodeBlocks: true,
            includeExplanations: true
          }
        },
        tools: [],
        environment: {
          workingDirectory: '/test',
          shell: '/bin/bash',
          envVars: {},
          nodeVersion: '18',
          pythonVersion: '3.9',
          allowedCommands: ['git', 'npm'],
          blockedCommands: ['rm -rf'],
          networkAccess: {
            allowExternalRequests: true
          },
          fileSystem: {
            allowWrite: true,
            allowDelete: false,
            maxFileSize: 10485760
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
          author: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['test'],
          category: 'test',
          description: 'Test agent',
          dependencies: [],
          compatibility: {
            platforms: ['linux', 'macos'],
            nodeVersions: ['18', '20']
          }
        }
      };

      const validation = manager.validateAgentConfig(validAgent);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid agent configuration', () => {
      const invalidAgent = {
        // Missing required fields
        name: 'Invalid Agent',
        type: 'invalid-type',
        role: 'invalid-role',
        provider: 'invalid-provider'
      };

      const validation = manager.validateAgentConfig(invalidAgent);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Check for specific errors
      const errorFields = validation.errors.map(e => e.field);
      expect(errorFields).toContain('id');
      expect(errorFields).toContain('type');
      expect(errorFields).toContain('role');
      expect(errorFields).toContain('provider');
    });

    it('should provide warnings for suboptimal configurations', () => {
      const agentWithWarnings = {
        id: 'test-agent-2',
        name: 'Test Agent',
        type: 'claude-code-anthropic',
        role: 'orchestrator-agent',
        provider: 'anthropic',
        enabled: true,
        capabilities: {
          supportsTools: true,
          supportsImages: true,
          supportsSubAgents: false,
          supportsParallel: false,
          supportsCodeExecution: false,
          maxContextLength: 200000,
          supportedModels: ['claude-3-5-sonnet-20241022'],
          supportedFileTypes: ['*'],
          canAccessInternet: true,
          canAccessFileSystem: true,
          canExecuteCommands: false
        },
        limits: {
          maxTokensPerRequest: 100000,
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 500,
          maxCostPerDay: 50.0,
          maxExecutionTime: 600000,
          maxMemoryUsage: 2048,
          maxConcurrentTasks: 3,
          cooldownPeriod: 2000
        },
        authentication: {
          type: 'api-key',
          credentials: {
            apiKey: 'test-key'
          },
          encrypted: true // But no encryption key available
        },
        personality: {
          tone: 'professional',
          language: 'en',
          responseStyle: 'detailed',
          verbosity: 'balanced',
          creativity: 0.7,
          strictness: 0.6,
          proactivity: 0.4,
          communicationStyle: {
            useEmojis: false,
            useFormatting: true,
            includeCodeBlocks: true,
            includeExplanations: true
          }
        },
        tools: [], // Agent supports tools but no tools configured
        environment: {
          workingDirectory: '/test',
          shell: '/bin/bash',
          envVars: {},
          nodeVersion: '18',
          pythonVersion: '3.9',
          allowedCommands: ['git', 'npm'],
          blockedCommands: ['rm -rf'],
          networkAccess: {
            allowExternalRequests: true
          },
          fileSystem: {
            allowWrite: true,
            allowDelete: false,
            maxFileSize: 10485760
          }
        },
        preferences: {
          autoSave: false, // Developer agent with autoSave disabled
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
          author: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['test'],
          category: 'test',
          description: 'Test agent',
          dependencies: [],
          compatibility: {
            platforms: ['linux', 'macos'],
            nodeVersions: ['18', '20']
          }
        }
      };

      const validation = manager.validateAgentConfig(agentWithWarnings);
      expect(validation.warnings.length).toBeGreaterThan(0);

      const warningMessages = validation.warnings.map(w => w.message);
      expect(warningMessages.some(msg => msg.includes('tools'))).toBe(true);
    });

    it('should provide suggestions for improvement', () => {
      const agentWithoutInstructions = {
        id: 'test-agent-3',
        name: 'Test Agent',
        type: 'claude-code-anthropic',
        role: 'orchestrator-agent',
        provider: 'anthropic',
        enabled: true,
        capabilities: {
          supportsTools: true,
          supportsImages: true,
          supportsSubAgents: false,
          supportsParallel: false,
          supportsCodeExecution: false,
          maxContextLength: 200000,
          supportedModels: ['claude-3-5-sonnet-20241022'],
          supportedFileTypes: ['*'],
          canAccessInternet: true,
          canAccessFileSystem: true,
          canExecuteCommands: false
        },
        limits: {
          maxTokensPerRequest: 100000,
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 500,
          maxCostPerDay: 50.0,
          maxExecutionTime: 600000,
          maxMemoryUsage: 2048,
          maxConcurrentTasks: 3,
          cooldownPeriod: 2000
        },
        authentication: {
          type: 'api-key',
          credentials: {
            apiKey: 'test-key'
          },
          encrypted: false
        },
        personality: {
          tone: 'professional',
          language: 'en',
          responseStyle: 'detailed',
          verbosity: 'balanced',
          creativity: 0.7,
          strictness: 0.6,
          proactivity: 0.4,
          communicationStyle: {
            useEmojis: false,
            useFormatting: true,
            includeCodeBlocks: true,
            includeExplanations: true
          }
          // No customInstructions
        },
        tools: [],
        environment: {
          workingDirectory: '/test',
          shell: '/bin/bash',
          envVars: {},
          nodeVersion: '18',
          pythonVersion: '3.9',
          allowedCommands: ['git', 'npm'],
          blockedCommands: ['rm -rf'],
          networkAccess: {
            allowExternalRequests: true
          },
          fileSystem: {
            allowWrite: true,
            allowDelete: false,
            maxFileSize: 10485760
          }
        },
        preferences: {
          autoSave: false,
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
          author: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['test'],
          category: 'test',
          description: 'Test agent',
          dependencies: [],
          compatibility: {
            platforms: ['linux', 'macos'],
            nodeVersions: ['18', '20']
          }
        }
      };

      const validation = manager.validateAgentConfig(agentWithoutInstructions);
      expect(validation.suggestions.length).toBeGreaterThan(0);
      expect(validation.suggestions.some(s => s.includes('custom instructions'))).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should create and save default configuration', async () => {
      const agents = await manager.loadConfig(testConfigPath);
      expect(agents.length).toBeGreaterThan(0);

      // Check that default agent has expected properties
      const defaultAgent = agents[0];
      expect(defaultAgent.type).toBe('claude-code-anthropic');
      expect(defaultAgent.role).toBe('orchestrator-agent');
      expect(defaultAgent.provider).toBe('anthropic');
      expect(defaultAgent.enabled).toBe(true);
    });

    it('should save and load configuration', async () => {
      // Create a test agent
      const testAgent: AgentConfig = {
        id: 'test-save-load',
        name: 'Test Save Load',
        type: 'claude-code-anthropic',
        role: 'robo-developer',
        provider: 'anthropic',
        enabled: true,
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: false,
          supportsParallel: false,
          supportsCodeExecution: false,
          maxContextLength: 100000,
          supportedModels: ['claude-3-5-sonnet-20241022'],
          supportedFileTypes: ['ts', 'js'],
          canAccessInternet: true,
          canAccessFileSystem: true,
          canExecuteCommands: false
        },
        limits: {
          maxTokensPerRequest: 50000,
          maxRequestsPerHour: 25,
          maxRequestsPerDay: 250,
          maxCostPerDay: 25.0,
          maxExecutionTime: 300000,
          maxMemoryUsage: 1024,
          maxConcurrentTasks: 1,
          cooldownPeriod: 1000
        },
        authentication: {
          type: 'api-key',
          credentials: {
            apiKey: 'test-key-save-load'
          },
          encrypted: false
        },
        personality: {
          tone: 'friendly',
          language: 'en',
          responseStyle: 'conversational',
          verbosity: 'minimal',
          creativity: 0.8,
          strictness: 0.4,
          proactivity: 0.6,
          communicationStyle: {
            useEmojis: true,
            useFormatting: true,
            includeCodeBlocks: true,
            includeExplanations: false
          }
        },
        tools: [],
        environment: {
          workingDirectory: '/test',
          shell: '/bin/bash',
          envVars: {},
          nodeVersion: '18',
          pythonVersion: '3.9',
          allowedCommands: ['git'],
          blockedCommands: ['rm'],
          networkAccess: {
            allowExternalRequests: false
          },
          fileSystem: {
            allowWrite: false,
            allowDelete: false,
            maxFileSize: 5242880
          }
        },
        preferences: {
          autoSave: true,
          autoCommit: true,
          preferAsync: true,
          useCache: false,
          debugMode: true,
          logLevel: 'debug',
          notifications: {
            enabled: false,
            types: ['error'],
            channels: ['console']
          },
          git: {
            autoStage: false,
            commitMessageFormat: 'fix: {description}',
            branchNaming: 'hotfix/{name}'
          }
        },
        metadata: {
          version: '1.0.0',
          author: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['test', 'save-load'],
          category: 'test',
          description: 'Test save/load functionality',
          dependencies: [],
          compatibility: {
            platforms: ['linux'],
            nodeVersions: ['18']
          }
        }
      };

      // Save the agent
      await manager.setAgentConfig(testAgent);
      await manager.saveConfig(manager.getAllAgentConfigs(), testConfigPath);

      // Create a new manager instance and load
      const newManager = new AgentConfigManager();
      const loadedAgents = await newManager.loadConfig(testConfigPath);

      // Find our test agent
      const loadedAgent = loadedAgents.find(a => a.id === 'test-save-load');
      expect(loadedAgent).toBeDefined();
      expect(loadedAgent!.name).toBe('Test Save Load');
      expect(loadedAgent!.role).toBe('robo-developer');
      expect(loadedAgent!.personality.tone).toBe('friendly');
      expect(loadedAgent!.preferences.debugMode).toBe(true);
    });

    it('should enable and disable agents', async () => {
      // Load default config
      await manager.loadConfig(testConfigPath);

      // If no agents exist, create a test one first
      const agents = manager.getAllAgentConfigs();
      if (agents.length === 0) {
        const testAgent: AgentConfig = {
          id: 'test-toggle',
          name: 'Test Toggle Agent',
          type: 'claude-code-anthropic',
          role: 'robo-developer',
          provider: 'anthropic',
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: false,
            supportsParallel: false,
            supportsCodeExecution: false,
            maxContextLength: 100000,
            supportedModels: ['claude-3-5-sonnet-20241022'],
            supportedFileTypes: ['*'],
            canAccessInternet: true,
            canAccessFileSystem: true,
            canExecuteCommands: false
          },
          limits: {
            maxTokensPerRequest: 10000,
            maxRequestsPerHour: 10,
            maxRequestsPerDay: 100,
            maxCostPerDay: 1.0,
            maxExecutionTime: 60000,
            maxMemoryUsage: 512,
            maxConcurrentTasks: 1,
            cooldownPeriod: 5000
          },
          authentication: {
            type: 'api-key',
            credentials: { apiKey: 'test-key' },
            encrypted: false
          },
          personality: {
            tone: 'professional',
            language: 'en',
            responseStyle: 'detailed',
            verbosity: 'balanced',
            creativity: 0.5,
            strictness: 0.5,
            proactivity: 0.5,
            communicationStyle: {
              useEmojis: false,
              useFormatting: true,
              includeCodeBlocks: true,
              includeExplanations: true
            }
          },
          tools: [],
          environment: {
            workingDirectory: '/test',
            shell: '/bin/bash',
            envVars: {},
            networkAccess: { allowExternalRequests: true },
            fileSystem: { allowWrite: true, allowDelete: false, maxFileSize: 10485760 }
          },
          preferences: {
            autoSave: true,
            autoCommit: true,
            preferAsync: true,
            useCache: false,
            debugMode: false,
            logLevel: 'info',
            notifications: { enabled: false, types: ['error'], channels: ['console'] },
            git: { autoStage: false, commitMessageFormat: 'fix: {description}', branchNaming: 'hotfix/{name}' }
          },
          metadata: {
            version: '1.0.0',
            author: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            tags: ['test'],
            category: 'test',
            description: 'Test toggle functionality',
            dependencies: [],
            compatibility: { platforms: ['linux'], nodeVersions: ['18'] }
          }
        };
        await manager.setAgentConfig(testAgent);
        await manager.saveConfig(manager.getAllAgentConfigs(), testConfigPath);
      }

      agents = manager.getAllAgentConfigs();
      expect(agents.length).toBeGreaterThan(0);

      const testAgent = agents[0];
      const originalEnabled = testAgent.enabled;

      // Toggle
      await manager.setAgentEnabled(testAgent.id, !originalEnabled);

      // Verify change
      const updatedAgent = manager.getAgentConfig(testAgent.id);
      expect(updatedAgent!.enabled).toBe(!originalEnabled);
    });

    it('should remove agents', async () => {
      // Load default config
      await manager.loadConfig(testConfigPath);

      // If no agents exist, create a test one first
      const agents = manager.getAllAgentConfigs();
      if (agents.length === 0) {
        const testAgent: AgentConfig = {
          id: 'test-remove',
          name: 'Test Remove Agent',
          type: 'claude-code-anthropic',
          role: 'robo-developer',
          provider: 'anthropic',
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: false,
            supportsParallel: false,
            supportsCodeExecution: false,
            maxContextLength: 100000,
            supportedModels: ['claude-3-5-sonnet-20241022'],
            supportedFileTypes: ['*'],
            canAccessInternet: true,
            canAccessFileSystem: true,
            canExecuteCommands: false
          },
          limits: {
            maxTokensPerRequest: 10000,
            maxRequestsPerHour: 10,
            maxRequestsPerDay: 100,
            maxCostPerDay: 1.0,
            maxExecutionTime: 60000,
            maxMemoryUsage: 512,
            maxConcurrentTasks: 1,
            cooldownPeriod: 5000
          },
          authentication: {
            type: 'api-key',
            credentials: { apiKey: 'test-key' },
            encrypted: false
          },
          personality: {
            tone: 'professional',
            language: 'en',
            responseStyle: 'detailed',
            verbosity: 'balanced',
            creativity: 0.5,
            strictness: 0.5,
            proactivity: 0.5,
            communicationStyle: {
              useEmojis: false,
              useFormatting: true,
              includeCodeBlocks: true,
              includeExplanations: true
            }
          },
          tools: [],
          environment: {
            workingDirectory: '/test',
            shell: '/bin/bash',
            envVars: {},
            networkAccess: { allowExternalRequests: true },
            fileSystem: { allowWrite: true, allowDelete: false, maxFileSize: 10485760 }
          },
          preferences: {
            autoSave: true,
            autoCommit: true,
            preferAsync: true,
            useCache: false,
            debugMode: false,
            logLevel: 'info',
            notifications: { enabled: false, types: ['error'], channels: ['console'] },
            git: { autoStage: false, commitMessageFormat: 'fix: {description}', branchNaming: 'hotfix/{name}' }
          },
          metadata: {
            version: '1.0.0',
            author: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            tags: ['test'],
            category: 'test',
            description: 'Test remove functionality',
            dependencies: [],
            compatibility: { platforms: ['linux'], nodeVersions: ['18'] }
          }
        };
        await manager.setAgentConfig(testAgent);
        await manager.saveConfig(manager.getAllAgentConfigs(), testConfigPath);
      }

      const originalCount = manager.getAllAgentConfigs().length;
      expect(originalCount).toBeGreaterThan(0);

      const testAgent = manager.getAllAgentConfigs()[0];

      // Remove agent
      const removed = await manager.removeAgentConfig(testAgent.id);
      expect(removed).toBe(true);

      // Verify removal
      expect(manager.getAllAgentConfigs().length).toBe(originalCount - 1);
      expect(manager.getAgentConfig(testAgent.id)).toBeUndefined();
    });
  });

  describe('Agent Filtering', () => {
    beforeEach(async () => {
      // Setup test data
      await manager.loadConfig(testConfigPath);

      // Add test agents with different properties
      const testAgents: Partial<AgentConfig>[] = [
        {
          id: 'claude-test',
          type: 'claude-code-anthropic',
          role: 'robo-developer',
          provider: 'anthropic',
          enabled: true
        },
        {
          id: 'openai-test',
          type: 'codex',
          role: 'robo-aqa',
          provider: 'openai',
          enabled: false
        },
        {
          id: 'google-test',
          type: 'gemini',
          role: 'robo-security-expert',
          provider: 'google',
          enabled: true
        }
      ];

      for (const agentData of testAgents) {
        await manager.setAgentConfig({
          id: agentData.id!,
          name: `Test ${agentData.id}`,
          type: agentData.type!,
          role: agentData.role!,
          provider: agentData.provider!,
          enabled: agentData.enabled!,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: false,
            supportsParallel: false,
            supportsCodeExecution: false,
            maxContextLength: 100000,
            supportedModels: ['claude-3-5-sonnet-20241022'],
            supportedFileTypes: ['*'],
            canAccessInternet: true,
            canAccessFileSystem: true,
            canExecuteCommands: false
          },
          limits: {
            maxTokensPerRequest: 10000,
            maxRequestsPerHour: 10,
            maxRequestsPerDay: 100,
            maxCostPerDay: 1.0,
            maxExecutionTime: 60000,
            maxMemoryUsage: 512,
            maxConcurrentTasks: 1,
            cooldownPeriod: 5000
          },
          authentication: {
            type: 'api-key',
            credentials: { apiKey: 'test-key' },
            encrypted: false
          },
          personality: {
            tone: 'professional',
            language: 'en',
            responseStyle: 'detailed',
            verbosity: 'balanced',
            creativity: 0.5,
            strictness: 0.5,
            proactivity: 0.5,
            communicationStyle: {
              useEmojis: false,
              useFormatting: true,
              includeCodeBlocks: true,
              includeExplanations: true
            }
          },
          tools: [],
          environment: {
            workingDirectory: '/test',
            shell: '/bin/bash',
            networkAccess: { allowExternalRequests: false },
            fileSystem: { allowWrite: true, allowDelete: false, maxFileSize: 1048576 }
          },
          preferences: {
            autoSave: true,
            autoCommit: false,
            preferAsync: true,
            useCache: true,
            debugMode: false,
            logLevel: 'info',
            notifications: { enabled: true, types: ['error'], channels: ['console'] },
            git: { autoStage: true, commitMessageFormat: 'feat: {description}', branchNaming: 'feature/{name}' }
          },
          metadata: {
            version: '1.0.0',
            author: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            tags: ['test'],
            category: 'test',
            description: 'Test agent',
            dependencies: [],
            compatibility: { platforms: ['linux'], nodeVersions: ['18'] }
          }
        });
      }
    });

    it('should filter agents by type', () => {
      const claudeAgents = manager.getAgentsByType('claude-code-anthropic');
      expect(claudeAgents.length).toBeGreaterThan(0);
      expect(claudeAgents.every(agent => agent.type === 'claude-code-anthropic')).toBe(true);
    });

    it('should filter agents by role', () => {
      const developerAgents = manager.getAgentsByRole('robo-developer');
      expect(developerAgents.length).toBeGreaterThan(0);
      expect(developerAgents.every(agent => agent.role === 'robo-developer')).toBe(true);
    });

    it('should filter agents by enabled status', () => {
      const enabledAgents = manager.getEnabledAgents();
      const disabledAgents = manager.getAllAgentConfigs().filter(agent => !agent.enabled);

      expect(enabledAgents.every(agent => agent.enabled)).toBe(true);
      expect(disabledAgents.every(agent => !agent.enabled)).toBe(true);
      expect(enabledAgents.length + disabledAgents.length).toBe(manager.getAllAgentConfigs().length);
    });

    it('should filter by provider', () => {
      const anthropicAgents = manager.getAllAgentConfigs().filter(agent => agent.provider === 'anthropic');
      expect(anthropicAgents.every(agent => agent.provider === 'anthropic')).toBe(true);
    });
  });

  describe('Templates', () => {
    it('should have default templates', () => {
      const templates = manager.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);

      const claudeTemplate = manager.getTemplate('claude-code-anthropic');
      expect(claudeTemplate).toBeDefined();
      expect(claudeTemplate!.name).toBe('Claude Code Anthropic Template');
    });

    it('should create agent from template', () => {
      const variables = {
        apiKey: 'test-api-key',
        role: 'robo-developer'
      };

      const agent = manager.createAgentFromTemplate('claude-code-anthropic', variables);
      expect(agent).toBeDefined();
      expect(agent!.type).toBe('claude-code-anthropic');
      expect(agent!.provider).toBe('anthropic');
      expect(agent!.role).toBe('robo-developer');
    });

    it('should handle missing template', () => {
      const agent = manager.createAgentFromTemplate('non-existent-template', {});
      expect(agent).toBeNull();
    });

    it('should validate required template variables', () => {
      const agent = manager.createAgentFromTemplate('claude-code-anthropic', {}); // Missing required apiKey
      expect(agent).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration file', async () => {
      // Create invalid config file
      await FileUtils.writeTextFile(testConfigPath, '{ "invalid": "json" }');

      const agents = await manager.loadConfig(testConfigPath);
      // Should fall back to default configuration
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should handle missing configuration file', async () => {
      const agents = await manager.loadConfig('/nonexistent/path/.prprc');
      // Should create default configuration
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should handle save failures gracefully', async () => {
      const invalidAgent = {
        id: 'invalid-agent',
        name: 'Invalid Agent',
        type: 'invalid-type',
        role: 'invalid-role',
        provider: 'invalid-provider',
        enabled: true,
        capabilities: {},
        limits: {},
        authentication: {},
        personality: {},
        tools: [],
        environment: {},
        preferences: {},
        metadata: {}
      };

      await expect(manager.setAgentConfig(invalidAgent as unknown)).rejects.toThrow();
    });
  });
});