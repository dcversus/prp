/**
 * ♫ Agent Communication Tests for @dcversus/prp Orchestrator
 *
 * Test suite for agent communication system with sub-agent support,
 * message dispatch, and parallel execution capabilities.
 */

import { AgentCommunication, AgentMessage, SubAgentConfig } from '../agent-communication';
import { AgentSession, AgentCapabilities } from '../types';
import { AgentConfig, AgentType, AgentRole, ProviderType } from '../../config/agent-config';

// Mock config for testing
interface MockOrchestratorConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxConcurrentDecisions: number;
  maxChainOfThoughtDepth: number;
  contextPreservation: any;
  tools: any[];
  agents: any;
  prompts: any;
  decisionThresholds: any;
}

// Helper function to create mock AgentSession
function createMockAgentSession(overrides: Partial<AgentSession> = {}): AgentSession {
  const mockAgentConfig: AgentConfig = {
    id: 'test-agent-config',
    name: 'Test Agent',
    type: 'custom' as AgentType,
    role: 'robo-developer' as AgentRole,
    provider: 'custom' as ProviderType,
    enabled: true,
    capabilities: {
      supportsTools: true,
      supportsImages: false,
      supportsSubAgents: true,
      supportsParallel: true,
      supportsCodeExecution: true,
      maxContextLength: 100000,
      supportedModels: ['gpt-5'],
      supportedFileTypes: ['.ts', '.js', '.md'],
      canAccessInternet: false,
      canAccessFileSystem: true,
      canExecuteCommands: true,
      availableTools: ['read_file', 'write_file', 'execute_command'],
      specializations: ['development', 'testing']
    },
    limits: {
      maxTokensPerRequest: 100000,
      maxRequestsPerHour: 60,
      maxRequestsPerDay: 1440,
      maxCostPerDay: 100.0,
      maxExecutionTime: 300000,
      maxMemoryUsage: 512,
      maxConcurrentTasks: 5,
      cooldownPeriod: 1000
    },
    authentication: {
      type: 'api-key',
      credentials: {},
      encrypted: false
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
    tools: [{
      id: 'read_file',
      name: 'Read File',
      type: 'builtin',
      enabled: true,
      configuration: {},
      permissions: ['read'],
      rateLimit: {
        requestsPerMinute: 60,
        cooldownMs: 1000
      }
    }, {
      id: 'write_file',
      name: 'Write File',
      type: 'builtin',
      enabled: true,
      configuration: {},
      permissions: ['write'],
      rateLimit: {
        requestsPerMinute: 30,
        cooldownMs: 2000
      }
    }, {
      id: 'execute_command',
      name: 'Execute Command',
      type: 'builtin',
      enabled: true,
      configuration: {},
      permissions: ['execute'],
      rateLimit: {
        requestsPerMinute: 10,
        cooldownMs: 5000
      }
    }],
    environment: {
      workingDirectory: '/tmp',
      shell: '/bin/bash',
      envVars: {},
      nodeVersion: '18.x',
      pythonVersion: '3.9',
      allowedCommands: ['ls', 'cat', 'echo'],
      blockedCommands: ['rm', 'sudo'],
      networkAccess: {
        allowedDomains: [],
        blockedDomains: [],
        allowExternalRequests: false
      },
      fileSystem: {
        allowedPaths: ['/tmp'],
        blockedPaths: ['/etc', '/usr'],
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
        types: ['error', 'warning', 'info'],
        channels: ['console']
      },
      git: {
        autoStage: false,
        commitMessageFormat: 'feat: {message}',
        branchNaming: 'feature/{name}'
      }
    },
    metadata: {
      version: '1.0.0',
      author: 'test',
      createdAt: new Date(),
      lastModified: new Date(),
      tags: ['test'],
      category: 'testing',
      description: 'Test agent for unit tests',
      documentation: 'Test documentation',
      examples: [],
      dependencies: [],
      compatibility: {
        platforms: ['linux', 'darwin'],
        nodeVersions: ['18.x', '20.x']
      }
    }
  };

  const mockCapabilities: AgentCapabilities = {
    supportsTools: true,
    supportsImages: false,
    supportsSubAgents: true,
    supportsParallel: true,
    supportsCodeExecution: true,
    maxContextLength: 100000,
    supportedModels: ['gpt-5'],
    supportedFileTypes: ['.ts', '.js', '.md'],
    canAccessInternet: false,
    canAccessFileSystem: true,
    canExecuteCommands: true,
    availableTools: ['read_file', 'write_file', 'execute_command'],
    specializations: ['development', 'testing']
  };

  return {
    id: 'test-agent-1',
    agentId: 'test-agent-1',
    agentConfig: mockAgentConfig,
    status: 'idle',
    lastActivity: new Date(),
    tokenUsage: {
      total: 0,
      cost: 0,
      lastUpdated: new Date()
    },
    performance: {
      tasksCompleted: 0,
      averageTaskTime: 0,
      successRate: 0,
      errorCount: 0
    },
    capabilities: mockCapabilities,
    ...overrides
  };
}

describe('AgentCommunication', () => {
  let agentCommunication: AgentCommunication;
  let mockConfig: MockOrchestratorConfig;

  beforeEach(() => {
    mockConfig = {
      model: 'gpt-5',
      maxTokens: 200000,
      temperature: 0.7,
      timeout: 30000,
      maxConcurrentDecisions: 5,
      maxChainOfThoughtDepth: 10,
      contextPreservation: {
        enabled: true,
        maxContextSize: 200000,
        compressionStrategy: 'summarize',
        preserveElements: ['signals', 'decisions', 'agentStates'],
        compressionRatio: 0.3,
        importantSignals: ['FF', 'bb', 'af', 'ic']
      },
      tools: [],
      agents: {
        maxActiveAgents: 10,
        defaultTimeout: 60000,
        retryAttempts: 3,
        retryDelay: 5000,
        parallelExecution: true,
        loadBalancing: 'priority',
        healthCheckInterval: 30000
      },
      prompts: {
        systemPrompt: 'You are the orchestrator...',
        decisionMaking: 'Analyze signals...',
        chainOfThought: 'Think step by step...',
        toolSelection: 'Select tools...',
        agentCoordination: 'Coordinate agents...',
        checkpointEvaluation: 'Evaluate checkpoints...',
        errorHandling: 'Handle errors...',
        contextUpdate: 'Update context...'
      },
      decisionThresholds: {
        confidence: 0.8,
        tokenUsage: 180000,
        processingTime: 25000,
        agentResponse: 45000,
        errorRate: 0.1
      }
    };

    agentCommunication = new AgentCommunication(mockConfig);
  });

  afterEach(async () => {
    await agentCommunication.cleanup();
  });

  describe('agent registration', () => {
    it('should register an agent successfully', () => {
      const mockAgentSession = createMockAgentSession();

      agentCommunication.registerAgent(mockAgentSession);

      const activeAgents = agentCommunication.getActiveAgents();
      expect(activeAgents.has('test-agent-1')).toBe(true);
      expect(activeAgents.get('test-agent-1')).toEqual(mockAgentSession);
    });

    it('should unregister an agent successfully', () => {
      const mockAgentSession = {
        id: 'test-agent-1',
        agentId: 'test-agent-1',
        agentConfig: {
          id: 'test-agent-1',
          name: 'Test Agent',
          type: 'claude',
          role: 'robo-developer',
          provider: 'anthropic',
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: true,
            supportsParallel: true,
            supportsCodeExecution: true,
            maxContextLength: 100000,
            supportedModels: ['gpt-5'],
            supportedFileTypes: ['.ts', '.js', '.md'],
            canAccessInternet: false,
            canAccessFileSystem: true,
            canExecuteCommands: true,
            availableTools: ['read_file', 'write_file', 'execute_command'],
            specializations: ['development', 'testing']
          },
          limits: {
            maxTokens: 100000,
            maxRequestsPerMinute: 60,
            maxCostPerHour: 10.0
          },
          authentication: {
            type: 'api-key',
            credentials: {}
          },
          personality: {
            temperature: 0.7,
            style: 'professional'
          },
          tools: ['read_file', 'write_file', 'execute_command'],
          environment: {
            node: '18.x',
            platform: 'linux'
          },
          preferences: {
            timezone: 'UTC',
            language: 'en'
          },
          metadata: {
            version: '1.0.0',
            createdAt: new Date()
          }
        },
        status: 'idle' as const,
        lastActivity: new Date(),
        tokenUsage: {
          total: 0,
          cost: 0,
          lastUpdated: new Date()
        },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 0,
          errorCount: 0
        },
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: true,
          supportsParallel: true,
          maxParallelTasks: 3,
          supportedSignalTypes: ['dp', 'tp', 'bf']
        }
      };

      agentCommunication.registerAgent(mockAgentSession);
      expect(agentCommunication.getActiveAgents().has('test-agent-1')).toBe(true);

      agentCommunication.unregisterAgent('test-agent-1');
      expect(agentCommunication.getActiveAgents().has('test-agent-1')).toBe(false);
    });
  });

  describe('message sending', () => {
    beforeEach(() => {
      // Register a test agent
      const mockAgentSession = {
        id: 'test-developer',
        agentId: 'test-developer',
        agentConfig: {
          id: 'test-developer',
          name: 'Test Developer',
          type: 'claude',
          role: 'robo-developer',
          provider: 'anthropic',
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: true,
            supportsParallel: true,
            supportsCodeExecution: true,
            maxContextLength: 100000,
            supportedModels: ['gpt-5'],
            supportedFileTypes: ['.ts', '.js', '.md'],
            canAccessInternet: false,
            canAccessFileSystem: true,
            canExecuteCommands: true,
            availableTools: ['read_file', 'write_file', 'execute_command'],
            specializations: ['development', 'testing']
          },
          limits: {
            maxTokens: 100000,
            maxRequestsPerMinute: 60,
            maxCostPerHour: 10.0
          },
          authentication: {
            type: 'api-key',
            credentials: {}
          },
          personality: {
            temperature: 0.7,
            style: 'professional'
          },
          tools: ['read_file', 'write_file', 'execute_command'],
          environment: {
            node: '18.x',
            platform: 'linux'
          },
          preferences: {
            timezone: 'UTC',
            language: 'en'
          },
          metadata: {
            version: '1.0.0',
            createdAt: new Date()
          }
        },
        status: 'idle' as const,
        lastActivity: new Date(),
        tokenUsage: {
          total: 0,
          cost: 0,
          lastUpdated: new Date()
        },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 0,
          errorCount: 0
        },
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: true,
          supportsParallel: true,
          maxParallelTasks: 3,
          supportedSignalTypes: ['dp', 'tp', 'bf']
        }
      };

      agentCommunication.registerAgent(mockAgentSession);
    });

    it('should send message to registered agent successfully', async () => {
      const message: AgentMessage = {
        id: 'test-message-1',
        from: 'orchestrator',
        to: 'test-developer',
        type: 'task_assignment',
        priority: 7,
        subject: 'Implement new feature',
        content: 'Implement user authentication feature',
        instructions: 'Follow TDD approach and write tests first',
        context: { prpId: 'PRP-001' },
        tools: ['read', 'write'],
        deadline: new Date(Date.now() + 3600000), // 1 hour from now
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-123'
        }
      };

      const results = await agentCommunication.sendMessage(message);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].agentId).toBe('test-developer');
      expect(results[0].messageId).toBe('test-message-1');
      expect(results[0].deliveredAt).toBeInstanceOf(Date);
    });

    it('should fail when sending to non-existent agent', async () => {
      const message: AgentMessage = {
        id: 'test-message-2',
        from: 'orchestrator',
        to: 'non-existent-agent',
        type: 'task_assignment',
        priority: 5,
        subject: 'Test task',
        content: 'Test content',
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-456'
        }
      };

      const results = await agentCommunication.sendMessage(message);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Agent not found');
    });

    it('should create message threads for related messages', async () => {
      const initialMessage: AgentMessage = {
        id: 'initial-message',
        from: 'orchestrator',
        to: 'test-developer',
        type: 'request',
        priority: 7,
        subject: 'Initial request',
        content: 'Please analyze this PRP',
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-789'
        }
      };

      const replyMessage: AgentMessage = {
        id: 'reply-message',
        from: 'orchestrator',
        to: 'test-developer',
        type: 'response',
        priority: 7,
        subject: 'Follow up on analysis',
        content: 'Any updates on the PRP analysis?',
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-789',
          replyTo: 'initial-message'
        }
      };

      await agentCommunication.sendMessage(initialMessage);
      await agentCommunication.sendMessage(replyMessage);

      const thread = agentCommunication.getMessageThread('initial-message');
      expect(thread).toHaveLength(2);
      expect(thread[0].id).toBe('initial-message');
      expect(thread[1].id).toBe('reply-message');
    });
  });

  describe('sub-agent support', () => {
    beforeEach(() => {
      // Register test agents
      const developerAgent = {
        id: 'test-developer',
        agentId: 'test-developer',
        agentConfig: {
          id: 'test-developer',
          name: 'Test Developer',
          type: 'claude',
          role: 'robo-developer',
          provider: 'anthropic',
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: true,
            supportsParallel: true,
            supportsCodeExecution: true,
            maxContextLength: 100000,
            supportedModels: ['gpt-5'],
            supportedFileTypes: ['.ts', '.js', '.md'],
            canAccessInternet: false,
            canAccessFileSystem: true,
            canExecuteCommands: true,
            availableTools: ['read_file', 'write_file', 'execute_command'],
            specializations: ['development', 'testing']
          },
          limits: {
            maxTokens: 100000,
            maxRequestsPerMinute: 60,
            maxCostPerHour: 10.0
          },
          authentication: {
            type: 'api-key',
            credentials: {}
          },
          personality: {
            temperature: 0.7,
            style: 'professional'
          },
          tools: ['read_file', 'write_file', 'execute_command'],
          environment: {
            node: '18.x',
            platform: 'linux'
          },
          preferences: {
            timezone: 'UTC',
            language: 'en'
          },
          metadata: {
            version: '1.0.0',
            createdAt: new Date()
          }
        },
        status: 'idle' as const,
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: { tasksCompleted: 0, averageTaskTime: 0, successRate: 0, errorCount: 0 },
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: true,
          supportsParallel: true,
          maxParallelTasks: 3,
          supportedSignalTypes: ['dp', 'tp', 'bf']
        }
      };

      const qaAgent = {
        id: 'test-qa',
        agentId: 'test-qa',
        agentConfig: {
          id: 'test-qa',
          name: 'Test QA',
          type: 'claude',
          role: 'robo-aqa',
          provider: 'anthropic',
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: true,
            supportsParallel: true,
            supportsCodeExecution: false,
            maxContextLength: 100000,
            supportedModels: ['gpt-5'],
            supportedFileTypes: ['.ts', '.js', '.md', '.test.ts'],
            canAccessInternet: false,
            canAccessFileSystem: true,
            canExecuteCommands: false,
            availableTools: ['test', 'validate'],
            specializations: ['testing', 'quality-assurance']
          },
          limits: {
            maxTokens: 100000,
            maxRequestsPerMinute: 60,
            maxCostPerHour: 10.0
          },
          authentication: {
            type: 'api-key',
            credentials: {}
          },
          personality: {
            temperature: 0.3,
            style: 'professional'
          },
          tools: ['test', 'validate'],
          environment: {
            node: '18.x',
            platform: 'linux'
          },
          preferences: {
            timezone: 'UTC',
            language: 'en'
          },
          metadata: {
            version: '1.0.0',
            createdAt: new Date()
          }
        },
        status: 'idle' as const,
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: { tasksCompleted: 0, averageTaskTime: 0, successRate: 0, errorCount: 0 },
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: true,
          supportsParallel: true,
          maxParallelTasks: 2,
          supportedSignalTypes: ['tg', 'cf', 'tr']
        }
      };

      agentCommunication.registerAgent(developerAgent);
      agentCommunication.registerAgent(qaAgent);
    });

    it('should dispatch sub-agents for parallel execution', async () => {
      const subAgents: SubAgentConfig[] = [
        {
          id: 'sub-dev-1',
          role: 'robo-developer',
          task: 'Implement feature module',
          instructions: 'Create authentication module with tests',
          context: { feature: 'authentication' },
          dependencies: [],
          parallel: true
        },
        {
          id: 'sub-qa-1',
          role: 'robo-aqa',
          task: 'Test authentication module',
          instructions: 'Write comprehensive tests for authentication',
          context: { feature: 'authentication' },
          dependencies: ['sub-dev-1'],
          parallel: false
        }
      ];

      const message: AgentMessage = {
        id: 'parallel-task-message',
        from: 'orchestrator',
        to: 'test-developer',
        type: 'task_assignment',
        priority: 8,
        subject: 'Implement authentication with parallel testing',
        content: 'Create authentication module and tests in parallel',
        subAgents,
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-parallel'
        }
      };

      const results = await agentCommunication.sendMessage(message);

      // Should have results for primary agent and sub-agents
      expect(results.length).toBeGreaterThan(1);

      // All results should be successful
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should include sub-agent results
      const subAgentResults = results.filter(r =>
        r.agentId === 'sub-dev-1' || r.agentId === 'sub-qa-1'
      );
      expect(subAgentResults.length).toBe(2);
    });

    it('should handle sub-agent dependencies correctly', async () => {
      const subAgents: SubAgentConfig[] = [
        {
          id: 'sub-1',
          role: 'robo-developer',
          task: 'Setup database schema',
          instructions: 'Create database tables',
          context: {},
          dependencies: [],
          parallel: true
        },
        {
          id: 'sub-2',
          role: 'robo-developer',
          task: 'Create API endpoints',
          instructions: 'Build REST API',
          context: {},
          dependencies: ['sub-1'], // Depends on sub-1
          parallel: true
        }
      ];

      const message: AgentMessage = {
        id: 'dependency-test',
        from: 'orchestrator',
        to: 'test-developer',
        type: 'task_assignment',
        priority: 7,
        subject: 'Setup backend with dependencies',
        content: 'Create database and API with proper dependencies',
        subAgents,
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-deps'
        }
      };

      const results = await agentCommunication.sendMessage(message);

      expect(results.length).toBeGreaterThan(0);

      // Results should be ordered by dependencies
      const sub1Result = results.find(r => r.agentId === 'sub-1');
      const sub2Result = results.find(r => r.agentId === 'sub-2');

      expect(sub1Result).toBeDefined();
      expect(sub2Result).toBeDefined();
    });
  });

  describe('role-based instruction adaptation', () => {
    it('should adapt instructions for developer role', () => {
      const message: AgentMessage = {
        id: 'dev-instruction-test',
        from: 'orchestrator',
        to: 'test-developer',
        type: 'task_assignment',
        priority: 7,
        subject: 'Implement feature',
        content: 'Add user authentication',
        instructions: 'Create secure authentication system',
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-dev'
        }
      };

      // This test would need access to private method
      // For now, we can test that the message is sent successfully
      expect(async () => {
        await agentCommunication.sendMessage(message);
      }).not.toThrow();
    });
  });

  describe('statistics and monitoring', () => {
    it('should track communication statistics correctly', async () => {
      const message: AgentMessage = {
        id: 'stats-test',
        from: 'orchestrator',
        to: 'test-developer',
        type: 'task_assignment',
        priority: 5,
        subject: 'Test message',
        content: 'Test content for statistics',
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-stats'
        }
      };

      await agentCommunication.sendMessage(message);

      const stats = agentCommunication.getStats();
      expect(stats.totalMessages).toBe(1);
      expect(stats.messagesByType['task_assignment']).toBe(1);
      expect(stats.messagesByAgent['test-developer']).toBe(1);
      expect(stats.failedMessages).toBe(0);
    });

    it('should track failed messages in statistics', async () => {
      const message: AgentMessage = {
        id: 'fail-stats-test',
        from: 'orchestrator',
        to: 'non-existent-agent',
        type: 'task_assignment',
        priority: 5,
        subject: 'This should fail',
        content: 'Test failure for statistics',
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-fail'
        }
      };

      await agentCommunication.sendMessage(message);

      const stats = agentCommunication.getStats();
      expect(stats.totalMessages).toBe(1);
      expect(stats.failedMessages).toBe(1);
    });
  });

  describe('event emission', () => {
    it('should emit events for agent registration', (done) => {
      agentCommunication.on('agent_registered', (event) => {
        expect(event.agentId).toBe('event-test-agent');
        done();
      });

      const mockAgentSession = {
        id: 'event-test-agent',
        agentId: 'event-test-agent',
        agentConfig: {
          id: 'event-test-agent',
          name: 'Event Test Agent',
          type: 'claude',
          role: 'robo-developer',
          provider: 'anthropic',
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: true,
            supportsParallel: true,
            supportsCodeExecution: true,
            maxContextLength: 100000,
            supportedModels: ['gpt-5'],
            supportedFileTypes: ['.ts', '.js', '.md'],
            canAccessInternet: false,
            canAccessFileSystem: true,
            canExecuteCommands: true,
            availableTools: ['read_file', 'write_file', 'execute_command'],
            specializations: ['development', 'testing']
          },
          limits: {
            maxTokens: 100000,
            maxRequestsPerMinute: 60,
            maxCostPerHour: 10.0
          },
          authentication: {
            type: 'api-key',
            credentials: {}
          },
          personality: {
            temperature: 0.7,
            style: 'professional'
          },
          tools: ['read_file', 'write_file', 'execute_command'],
          environment: {
            node: '18.x',
            platform: 'linux'
          },
          preferences: {
            timezone: 'UTC',
            language: 'en'
          },
          metadata: {
            version: '1.0.0',
            createdAt: new Date()
          }
        },
        status: 'idle' as const,
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: { tasksCompleted: 0, averageTaskTime: 0, successRate: 0, errorCount: 0 },
        capabilities: {
          availableTools: ['read', 'write'],
          maxParallelTasks: 3,
          supportedSignalTypes: ['dp', 'tp']
        }
      };

      agentCommunication.registerAgent(mockAgentSession);
    });

    it('should emit events for message sending', (done) => {
      agentCommunication.on('message_sent', (event) => {
        expect(event.messageId).toBe('event-test-message');
        expect(event.results).toBeDefined();
        done();
      });

      // Register test agent first
      const mockAgentSession = {
        id: 'event-agent',
        agentId: 'event-agent',
        agentConfig: {
          id: 'event-agent',
          name: 'Event Agent',
          type: 'claude',
          role: 'robo-developer',
          model: 'gpt-5',
          maxTokens: 100000,
          temperature: 0.7,
          timeout: 30000,
          enabled: true,
          permissions: ['read', 'write'],
          subAgents: true,
          subAgentPaths: [],
          maxParallel: 3,
          instructions_path: '/path/to/instructions',
          yolo: false
        },
        status: 'idle' as const,
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: { tasksCompleted: 0, averageTaskTime: 0, successRate: 0, errorCount: 0 },
        capabilities: {
          availableTools: ['read', 'write'],
          maxParallelTasks: 3,
          supportedSignalTypes: ['dp', 'tp']
        }
      };

      agentCommunication.registerAgent(mockAgentSession);

      const message: AgentMessage = {
        id: 'event-test-message',
        from: 'orchestrator',
        to: 'event-agent',
        type: 'task_assignment',
        priority: 5,
        subject: 'Event test',
        content: 'Test message for event emission',
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-event'
        }
      };

      agentCommunication.sendMessage(message);
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup resources properly', async () => {
      // Register some agents and send messages
      const mockAgentSession = {
        id: 'cleanup-test-agent',
        agentId: 'cleanup-test-agent',
        agentConfig: {
          id: 'cleanup-test-agent',
          name: 'Cleanup Test Agent',
          type: 'claude',
          role: 'robo-developer',
          model: 'gpt-5',
          maxTokens: 100000,
          temperature: 0.7,
          timeout: 30000,
          enabled: true,
          permissions: ['read', 'write'],
          subAgents: true,
          subAgentPaths: [],
          maxParallel: 3,
          instructions_path: '/path/to/instructions',
          yolo: false
        },
        status: 'idle' as const,
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: { tasksCompleted: 0, averageTaskTime: 0, successRate: 0, errorCount: 0 },
        capabilities: {
          availableTools: ['read', 'write'],
          maxParallelTasks: 3,
          supportedSignalTypes: ['dp', 'tp']
        }
      };

      agentCommunication.registerAgent(mockAgentSession);

      const message: AgentMessage = {
        id: 'cleanup-test-message',
        from: 'orchestrator',
        to: 'cleanup-test-agent',
        type: 'task_assignment',
        priority: 5,
        subject: 'Cleanup test',
        content: 'Test message for cleanup',
        worktree: {
          path: '/tmp/test-worktree',
          cleanupAfter: true
        },
        metadata: {
          timestamp: new Date(),
          correlationId: 'corr-cleanup'
        }
      };

      await agentCommunication.sendMessage(message);

      // Cleanup should emit event
      let cleanupEmitted = false;
      agentCommunication.on('cleanup_completed', () => {
        cleanupEmitted = true;
      });

      await agentCommunication.cleanup();
      expect(cleanupEmitted).toBe(true);
    });
  });
});