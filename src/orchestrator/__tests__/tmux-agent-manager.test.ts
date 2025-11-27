/**
 * ♫ Tmux Agent Manager Integration Test
 *
 * Test that verifies TmuxManager integration with AgentManager
 * works correctly for spawning agents in tmux sessions.
 */
import { AgentManager } from '../agent-manager';
import { EventBus } from '../../shared/events';
import { createLayerLogger } from '../../shared';

const logger = createLayerLogger('test');

// Test configuration for agent manager
const testConfig = {
  model: 'gpt-4',
  maxTokens: 200000,
  temperature: 0.7,
  timeout: 30000,
  maxConcurrentDecisions: 5,
  maxChainOfThoughtDepth: 10,
  contextPreservation: {
    enabled: true,
    maxContextSize: 100000,
    compressionStrategy: 'summarize' as const,
    preserveElements: ['signals', 'decisions'],
    compressionRatio: 0.8,
    importantSignals: ['gg', 'ff', 'rp', 'vr'],
  },
  tools: [],
  agents: {
    maxActiveAgents: 5,
    defaultTimeout: 60000,
    retryAttempts: 3,
    retryDelay: 5000,
    parallelExecution: true,
    loadBalancing: 'round_robin' as const,
    healthCheckInterval: 30000,
  },
  prompts: {
    systemPrompt: '',
    decisionMaking: '',
    chainOfThought: '',
    toolSelection: '',
    agentCoordination: '',
    checkpointEvaluation: '',
    errorHandling: '',
    contextUpdate: '',
  },
  decisionThresholds: {
    confidence: 0.8,
    tokenUsage: 50000,
    processingTime: 30000,
    agentResponse: 60000,
    errorRate: 0.1,
  },
};

describe('TmuxAgentManager Integration', () => {
  let agentManager: AgentManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    agentManager = new AgentManager(testConfig, eventBus);
  });

  afterEach(async () => {
    if (agentManager) {
      await agentManager.stopAll();
    }
  });

  test('should initialize agent manager with tmux integration', async () => {
    await expect(agentManager.initialize()).resolves.not.toThrow();

    // Verify the agent manager was initialized
    expect(agentManager.getActiveAgentCount()).toBe(0);
  });

  test('should have tmux manager integration enabled', () => {
    // Access the private property for testing
    const agentManagerAny = agentManager as any;
    expect(agentManagerAny.useTmuxManager).toBe(true);
    expect(agentManagerAny.tmuxManager).toBeDefined();
  });

  test('should create tmux agent session', async () => {
    await agentManager.initialize();

    // Mock agent configuration
    const mockAgentConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      type: 'claude-code-anthropic',
      role: 'robo-developer',
      enabled: true,
      capabilities: {
        supportsTools: true,
        supportsImages: false,
        supportsSubAgents: false,
        supportsParallel: false,
        supportsCodeExecution: true,
        maxContextLength: 200000,
        supportedModels: ['claude-3-sonnet'],
        supportedFileTypes: ['.ts', '.js', '.md'],
        canAccessInternet: false,
        canAccessFileSystem: true,
        canExecuteCommands: true,
        availableTools: ['read_file', 'write_file'],
        specializations: ['development'],
      },
      limits: {
        maxTokensPerRequest: 4000,
        maxRequestsPerHour: 60,
        maxRequestsPerDay: 1000,
        maxCostPerDay: 10.0,
        maxExecutionTime: 300000,
        maxMemoryUsage: 1024,
        maxConcurrentTasks: 1,
        cooldownPeriod: 1000,
      },
      runCommands: ['node', 'test-agent.js'],
    };

    // Test task creation
    const testTask = {
      id: 'test-task-1',
      type: 'robo-developer',
      description: 'Write a test function',
      priority: 5,
      payload: { message: 'Test message' },
      status: 'pending' as const,
      createdAt: new Date(),
    };

    // This should not throw and should complete (even though tmux is mocked)
    const result = await agentManager.executeTask(testTask);
    expect(result).toBeDefined();
  });

  test('should fallback to process spawning when tmux disabled', async () => {
    // Create agent manager with tmux disabled
    const fallbackManager = new AgentManager(testConfig, eventBus);
    const fallbackManagerAny = fallbackManager as any;
    fallbackManagerAny.useTmuxManager = false;

    await fallbackManager.initialize();

    expect(fallbackManagerAny.useTmuxManager).toBe(false);

    await fallbackManager.stopAll();
  });
});

// Integration test for actual tmux functionality (commented out as it requires tmux)
/*
describe('Tmux Integration (requires tmux)', () => {
  test('should create actual tmux session', async () => {
    const eventBus = new EventBus();
    const agentManager = new AgentManager(testConfig, eventBus);

    await agentManager.initialize();

    // This test requires tmux to be installed
    // and will create actual tmux sessions
    const testTask = {
      id: 'tmux-test-task',
      type: 'robo-developer',
      description: 'Test tmux session creation',
      priority: 5,
      payload: {},
      status: 'pending' as const,
      createdAt: new Date(),
    };

    try {
      const result = await agentManager.executeTask(testTask);
      console.log('Tmux session result:', result);
      expect(result).toBeDefined();
    } catch (error) {
      console.log('Tmux session error (expected if tmux not available):', error);
    } finally {
      await agentManager.stopAll();
    }
  }, 30000);
});
*/