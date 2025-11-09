/**
 * ♫ Agent Lifecycle Manager Tests
 */

import { AgentLifecycleManager, AgentConfig } from '../agent-lifecycle-manager.js';
import { TokenMetricsStream } from '../../monitoring/TokenMetricsStream.js';

// Mock agent implementation for testing
class MockAgent {
  public id: string;
  public name: string;
  public type: string;
  public role: string;
  public enabled: boolean;
  public capabilities: any;
  public limits: any;
  private shouldFail: boolean = false;

  constructor(config: { id: string; type: string; shouldFail?: boolean }) {
    this.id = config.id;
    this.name = config.id;
    this.type = config.type;
    this.role = config.type;
    this.enabled = true;
    this.shouldFail = config.shouldFail || false;
    this.capabilities = {
      supportsTools: true,
      supportsImages: false,
      supportsSubAgents: false,
      supportsParallel: false,
      supportsCodeExecution: false,
      maxContextLength: 4000,
      supportedModels: ['gpt-4'],
      supportedFileTypes: ['.ts', '.js'],
      canAccessInternet: true,
      canAccessFileSystem: true,
      canExecuteCommands: false
    };
    this.limits = {
      maxTokensPerRequest: 4000,
      maxRequestsPerHour: 100,
      maxRequestsPerDay: 1000,
      maxCostPerDay: 10,
      maxExecutionTime: 30000,
      maxMemoryUsage: 512,
      maxConcurrentTasks: 1,
      cooldownPeriod: 1000
    };
  }

  async initialize(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock agent initialization failed');
    }
  }

  async process(input: any): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Mock agent processing failed');
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      input,
      output: `Processed: ${JSON.stringify(input)}`,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown(): Promise<void> {
    // Simulate shutdown time
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  getStatus(): any {
    return {
      status: 'idle',
      lastActivity: new Date(),
      errorCount: 0,
      uptime: 0
    };
  }

  getMetrics(): any {
    return {
      tasksCompleted: 0,
      averageTaskTime: 0,
      errorRate: 0,
      tokensUsed: 0,
      costIncurred: 0,
      lastReset: new Date()
    };
  }
}

describe('AgentLifecycleManager', () => {
  let manager: AgentLifecycleManager;
  let tokenMetricsStream: TokenMetricsStream;

  beforeEach(() => {
    tokenMetricsStream = new TokenMetricsStream();
    manager = new AgentLifecycleManager(tokenMetricsStream);
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Agent Registration', () => {
    it('should register a new agent successfully', () => {
      const config: AgentConfig = {
        id: 'test-agent-1',
        type: 'robo-developer',
        name: 'Test Developer Agent',
        enabled: true,
        priority: 5,
        resourceRequirements: {
          memoryMB: 512,
          cpuCores: 1,
          maxExecutionTime: 30000,
          requiresNetwork: true,
          requiresFileSystem: true,
          parallelizable: false
        },
        healthCheck: {
          enabled: true,
          intervalMs: 30000,
          timeoutMs: 10000,
          maxFailures: 3
        },
        tokenLimits: {
          dailyLimit: 100000,
          perRequestLimit: 5000,
          costLimit: 10.0,
          alertThresholds: {
            warning: 70,
            critical: 90
          }
        }
      };

      expect(() => manager.registerAgent(config)).not.toThrow();

      const status = manager.getAgentStatus('test-agent-1');
      expect(status).toBeTruthy();
      expect(status!.config.id).toBe('test-agent-1');
      expect(status!.status.state).toBe('stopped');
    });

    it('should throw error when registering duplicate agent', () => {
      const config: AgentConfig = {
        id: 'duplicate-agent',
        type: 'robo-developer',
        name: 'Duplicate Agent',
        enabled: true,
        priority: 5,
        resourceRequirements: {
          memoryMB: 512,
          cpuCores: 1,
          maxExecutionTime: 30000,
          requiresNetwork: true,
          requiresFileSystem: true,
          parallelizable: false
        },
        healthCheck: {
          enabled: true,
          intervalMs: 30000,
          timeoutMs: 10000,
          maxFailures: 3
        },
        tokenLimits: {
          dailyLimit: 100000,
          perRequestLimit: 5000,
          costLimit: 10.0,
          alertThresholds: {
            warning: 70,
            critical: 90
          }
        }
      };

      manager.registerAgent(config);

      expect(() => manager.registerAgent(config)).toThrow(
        'Agent duplicate-agent is already registered'
      );
    });
  });

  describe('Agent Spawning', () => {
    let agentConfig: AgentConfig;

    beforeEach(() => {
      agentConfig = {
        id: 'spawn-test-agent',
        type: 'robo-developer',
        name: 'Spawn Test Agent',
        enabled: true,
        priority: 5,
        resourceRequirements: {
          memoryMB: 512,
          cpuCores: 1,
          maxExecutionTime: 30000,
          requiresNetwork: true,
          requiresFileSystem: true,
          parallelizable: false
        },
        healthCheck: {
          enabled: true,
          intervalMs: 30000,
          timeoutMs: 10000,
          maxFailures: 3
        },
        tokenLimits: {
          dailyLimit: 100000,
          perRequestLimit: 5000,
          costLimit: 10.0,
          alertThresholds: {
            warning: 70,
            critical: 90
          }
        }
      };

      manager.registerAgent(agentConfig);

      // Mock the dynamic import
      jest.doMock('../robo-developer.js', () => ({
        default: MockAgent
      }));
    });

    it('should spawn agent successfully', async () => {
      // Mock the loadAgentClass method
      (manager as any).loadAgentClass = jest.fn().mockResolvedValue(MockAgent);

      await expect(manager.spawnAgent('spawn-test-agent')).resolves.not.toThrow();

      const status = manager.getAgentStatus('spawn-test-agent');
      expect(status!.status.state).toBe('running');
      expect(status!.startTime).toBeInstanceOf(Date);
    }, 10000);

    it('should fail to spawn non-existent agent', async () => {
      await expect(manager.spawnAgent('non-existent-agent')).rejects.toThrow(
        'Agent non-existent-agent is not registered'
      );
    });

    it('should fail to spawn already running agent', async () => {
      (manager as any).loadAgentClass = jest.fn().mockResolvedValue(MockAgent);

      await manager.spawnAgent('spawn-test-agent');

      await expect(manager.spawnAgent('spawn-test-agent')).rejects.toThrow(
        'Agent spawn-test-agent is already running'
      );
    }, 10000);
  });

  describe('Task Execution', () => {
    beforeEach(() => {
      const config: AgentConfig = {
        id: 'task-test-agent',
        type: 'robo-developer',
        name: 'Task Test Agent',
        enabled: true,
        priority: 5,
        resourceRequirements: {
          memoryMB: 512,
          cpuCores: 1,
          maxExecutionTime: 30000,
          requiresNetwork: true,
          requiresFileSystem: true,
          parallelizable: false
        },
        healthCheck: {
          enabled: false, // Disable health checks for testing
          intervalMs: 30000,
          timeoutMs: 10000,
          maxFailures: 3
        },
        tokenLimits: {
          dailyLimit: 100000,
          perRequestLimit: 5000,
          costLimit: 10.0,
          alertThresholds: {
            warning: 70,
            critical: 90
          }
        }
      };

      manager.registerAgent(config);
      (manager as any).loadAgentClass = jest.fn().mockResolvedValue(MockAgent);
    });

    it('should execute task successfully', async () => {
      await manager.spawnAgent('task-test-agent');

      const task = { type: 'test', data: 'test data' };
      const result = await manager.executeTask('task-test-agent', task, {
        timeout: 5000,
        trackTokens: true
      });

      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
      expect(result.cost).toBeGreaterThanOrEqual(0);
      expect(result.output).toBeTruthy();
    }, 10000);

    it('should fail to execute task on non-running agent', async () => {
      const task = { type: 'test', data: 'test data' };

      await expect(manager.executeTask('task-test-agent', task)).rejects.toThrow(
        'Agent task-test-agent is not running'
      );
    });

    it('should handle task timeout', async () => {
      await manager.spawnAgent('task-test-agent');

      const task = { type: 'test', data: 'test data' };

      await expect(
        manager.executeTask('task-test-agent', task, { timeout: 1 })
      ).rejects.toThrow('Task execution timeout');
    }, 10000);
  });

  describe('Agent Status Management', () => {
    beforeEach(() => {
      const configs: AgentConfig[] = [
        {
          id: 'status-test-1',
          type: 'robo-developer',
          name: 'Status Test 1',
          enabled: true,
          priority: 8,
          resourceRequirements: {
            memoryMB: 512,
            cpuCores: 1,
            maxExecutionTime: 30000,
            requiresNetwork: true,
            requiresFileSystem: true,
            parallelizable: false
          },
          healthCheck: {
            enabled: false,
            intervalMs: 30000,
            timeoutMs: 10000,
            maxFailures: 3
          },
          tokenLimits: {
            dailyLimit: 100000,
            perRequestLimit: 5000,
            costLimit: 10.0,
            alertThresholds: {
              warning: 70,
              critical: 90
            }
          }
        },
        {
          id: 'status-test-2',
          type: 'robo-quality-control',
          name: 'Status Test 2',
          enabled: true,
          priority: 3,
          resourceRequirements: {
            memoryMB: 256,
            cpuCores: 1,
            maxExecutionTime: 20000,
            requiresNetwork: false,
            requiresFileSystem: true,
            parallelizable: true
          },
          healthCheck: {
            enabled: false,
            intervalMs: 30000,
            timeoutMs: 10000,
            maxFailures: 3
          },
          tokenLimits: {
            dailyLimit: 50000,
            perRequestLimit: 2000,
            costLimit: 5.0,
            alertThresholds: {
              warning: 70,
              critical: 90
            }
          }
        }
      ];

      configs.forEach(config => manager.registerAgent(config));
      (manager as any).loadAgentClass = jest.fn().mockResolvedValue(MockAgent);
    });

    it('should get all agents status', () => {
      const allStatus = manager.getAllAgentsStatus();
      expect(allStatus.size).toBe(2);
      expect(allStatus.has('status-test-1')).toBe(true);
      expect(allStatus.has('status-test-2')).toBe(true);
    });

    it('should get agents by type', () => {
      const developerAgents = manager.getAgentsByType('robo-developer');
      expect(developerAgents).toHaveLength(1);
      expect(developerAgents[0]!.config.id).toBe('status-test-1');

      const qaAgents = manager.getAgentsByType('robo-quality-control');
      expect(qaAgents).toHaveLength(1);
      expect(qaAgents[0]!.config.id).toBe('status-test-2');
    });

    it('should get best agent based on priority', () => {
      const bestAgent = manager.getBestAgent();
      expect(bestAgent).toBeTruthy();
      expect(bestAgent!.config.id).toBe('status-test-1'); // Higher priority
    });

    it('should get best agent for specific type', () => {
      const bestDeveloper = manager.getBestAgent('robo-developer');
      expect(bestDeveloper).toBeTruthy();
      expect(bestDeveloper!.config.type).toBe('robo-developer');
    });
  });

  describe('Agent Lifecycle', () => {
    let agentConfig: AgentConfig;

    beforeEach(() => {
      agentConfig = {
        id: 'lifecycle-test-agent',
        type: 'robo-developer',
        name: 'Lifecycle Test Agent',
        enabled: true,
        priority: 5,
        resourceRequirements: {
          memoryMB: 512,
          cpuCores: 1,
          maxExecutionTime: 30000,
          requiresNetwork: true,
          requiresFileSystem: true,
          parallelizable: false
        },
        healthCheck: {
          enabled: false,
          intervalMs: 30000,
          timeoutMs: 10000,
          maxFailures: 3
        },
        tokenLimits: {
          dailyLimit: 100000,
          perRequestLimit: 5000,
          costLimit: 10.0,
          alertThresholds: {
            warning: 70,
            critical: 90
          }
        }
      };

      manager.registerAgent(agentConfig);
      (manager as any).loadAgentClass = jest.fn().mockResolvedValue(MockAgent);
    });

    it('should stop agent gracefully', async () => {
      await manager.spawnAgent('lifecycle-test-agent');

      const statusBeforeStop = manager.getAgentStatus('lifecycle-test-agent');
      expect(statusBeforeStop!.status.state).toBe('running');

      await manager.stopAgent('lifecycle-test-agent', true);

      const statusAfterStop = manager.getAgentStatus('lifecycle-test-agent');
      expect(statusAfterStop!.status.state).toBe('stopped');
      expect(statusAfterStop!.startTime).toBeUndefined();
    }, 10000);

    it('should remove agent completely', async () => {
      await manager.spawnAgent('lifecycle-test-agent');

      const statusBeforeRemove = manager.getAgentStatus('lifecycle-test-agent');
      expect(statusBeforeRemove).toBeTruthy();

      await manager.removeAgent('lifecycle-test-agent');

      const statusAfterRemove = manager.getAgentStatus('lifecycle-test-agent');
      expect(statusAfterRemove).toBeNull();
    }, 10000);
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      const config: AgentConfig = {
        id: 'event-test-agent',
        type: 'robo-developer',
        name: 'Event Test Agent',
        enabled: true,
        priority: 5,
        resourceRequirements: {
          memoryMB: 512,
          cpuCores: 1,
          maxExecutionTime: 30000,
          requiresNetwork: true,
          requiresFileSystem: true,
          parallelizable: false
        },
        healthCheck: {
          enabled: false,
          intervalMs: 30000,
          timeoutMs: 10000,
          maxFailures: 3
        },
        tokenLimits: {
          dailyLimit: 100000,
          perRequestLimit: 5000,
          costLimit: 10.0,
          alertThresholds: {
            warning: 70,
            critical: 90
          }
        }
      };

      manager.registerAgent(config);
      (manager as any).loadAgentClass = jest.fn().mockResolvedValue(MockAgent);
    });

    it('should emit events during agent lifecycle', async () => {
      const events: string[] = [];

      manager.on('agent_registered', () => events.push('registered'));
      manager.on('agent_spawning', () => events.push('spawning'));
      manager.on('agent_spawned', () => events.push('spawned'));
      manager.on('task_completed', () => events.push('task_completed'));
      manager.on('agent_stopping', () => events.push('stopping'));
      manager.on('agent_stopped', () => events.push('stopped'));

      await manager.spawnAgent('event-test-agent');
      await manager.executeTask('event-test-agent', { test: 'data' });
      await manager.stopAgent('event-test-agent');

      expect(events).toContain('spawning');
      expect(events).toContain('spawned');
      expect(events).toContain('task_completed');
      expect(events).toContain('stopping');
      expect(events).toContain('stopped');
    }, 15000);
  });
});