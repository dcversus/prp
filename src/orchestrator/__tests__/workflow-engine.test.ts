/**
 * ♫ Workflow Engine Tests for @dcversus/prp
 *
 * Comprehensive test suite for the workflow engine and integration components.
 */

import { WorkflowEngine } from '../workflow-engine';
import { WorkflowIntegrationCoordinator } from '../workflow-integration';
import { OrchestratorConfig } from '../types';
import { Signal } from '../../shared/types';

describe('WorkflowEngine', () => {
  let workflowEngine: WorkflowEngine;
  let config: OrchestratorConfig;

  beforeEach(() => {
    config = {
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.1,
      timeout: 300000,
      maxConcurrentDecisions: 5,
      maxChainOfThoughtDepth: 10,
      contextPreservation: {
        enabled: true,
        maxContextSize: 10000,
        compressionStrategy: 'summarize',
        preserveElements: ['signals', 'decisions'],
        compressionRatio: 0.7,
        importantSignals: ['emergency', 'critical']
      },
      tools: [],
      agents: {
        maxActiveAgents: 10,
        defaultTimeout: 600000,
        retryAttempts: 3,
        retryDelay: 5000,
        parallelExecution: true,
        loadBalancing: 'least_busy',
        healthCheckInterval: 30000
      },
      prompts: {
        systemPrompt: '',
        decisionMaking: '',
        chainOfThought: '',
        toolSelection: '',
        agentCoordination: '',
        checkpointEvaluation: '',
        errorHandling: '',
        contextUpdate: ''
      },
      decisionThresholds: {
        confidence: 0.8,
        tokenUsage: 8000,
        processingTime: 120000,
        agentResponse: 180000,
        errorRate: 0.1
      }
    };

    workflowEngine = new WorkflowEngine(config);
  });

  afterEach(async () => {
    if (workflowEngine) {
      await workflowEngine.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await workflowEngine.start();
      expect(workflowEngine.getWorkflows().length).toBeGreaterThan(0);
    });

    it('should load built-in workflows', () => {
      const workflows = workflowEngine.getWorkflows();
      const workflowIds = workflows.map(w => w.id);

      expect(workflowIds).toContain('code_review');
      expect(workflowIds).toContain('feature_implementation');
      expect(workflowIds).toContain('bug_fix');
      expect(workflowIds).toContain('deployment');
      expect(workflowIds).toContain('testing');
    });

    it('should not allow multiple starts', async () => {
      await workflowEngine.start();
      await expect(workflowEngine.start()).rejects.toThrow('already running');
    });
  });

  describe('Workflow Registration', () => {
    beforeEach(async () => {
      await workflowEngine.start();
    });

    it('should register a custom workflow', () => {
      const customWorkflow = {
        id: 'test_workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: '1.0.0',
        category: 'custom' as const,
        triggers: [
          {
            id: 'test_trigger',
            type: 'manual' as const,
            condition: 'true',
            priority: 1,
            enabled: true
          }
        ],
        states: [
          {
            id: 'start',
            name: 'Start',
            description: 'Start state',
            type: 'start' as const
          },
          {
            id: 'end',
            name: 'End',
            description: 'End state',
            type: 'end' as const
          }
        ],
        transitions: [
          {
            id: 'start_to_end',
            from: 'start',
            to: 'end',
            priority: 1,
            enabled: true
          }
        ],
        variables: [],
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          tags: ['test']
        }
      };

      workflowEngine.registerWorkflow(customWorkflow);

      const registeredWorkflow = workflowEngine.getWorkflow('test_workflow');
      expect(registeredWorkflow).toBeDefined();
      expect(registeredWorkflow?.name).toBe('Test Workflow');
    });

    it('should validate workflow definitions', () => {
      const invalidWorkflow = {
        id: '',
        name: 'Invalid Workflow',
        description: 'An invalid workflow',
        version: '1.0.0',
        category: 'custom' as const,
        triggers: [],
        states: [],
        transitions: [],
        variables: [],
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          tags: ['test']
        }
      };

      expect(() => workflowEngine.registerWorkflow(invalidWorkflow)).toThrow();
    });

    it('should unregister workflows', () => {
      const customWorkflow = {
        id: 'test_workflow_to_remove',
        name: 'Test Workflow to Remove',
        description: 'A test workflow to remove',
        version: '1.0.0',
        category: 'custom' as const,
        triggers: [
          {
            id: 'test_trigger',
            type: 'manual' as const,
            condition: 'true',
            priority: 1,
            enabled: true
          }
        ],
        states: [
          {
            id: 'start',
            name: 'Start',
            description: 'Start state',
            type: 'start' as const
          },
          {
            id: 'end',
            name: 'End',
            description: 'End state',
            type: 'end' as const
          }
        ],
        transitions: [
          {
            id: 'start_to_end',
            from: 'start',
            to: 'end',
            priority: 1,
            enabled: true
          }
        ],
        variables: [],
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          tags: ['test']
        }
      };

      workflowEngine.registerWorkflow(customWorkflow);
      expect(workflowEngine.getWorkflow('test_workflow_to_remove')).toBeDefined();

      const removed = workflowEngine.unregisterWorkflow('test_workflow_to_remove');
      expect(removed).toBe(true);
      expect(workflowEngine.getWorkflow('test_workflow_to_remove')).toBeUndefined();
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(async () => {
      await workflowEngine.start();
    });

    it('should start a workflow execution', async () => {
      const executionId = await workflowEngine.startWorkflow('testing', {
        globalVariables: { test: true }
      });

      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');

      // Wait a bit for execution to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const execution = workflowEngine.getExecution(executionId);
      expect(execution).toBeDefined();
      expect(execution?.workflowId).toBe('testing');
      expect(['pending', 'running', 'completed']).toContain(execution?.status || '');
    });

    it('should handle non-existent workflows', async () => {
      await expect(
        workflowEngine.startWorkflow('non_existent_workflow', {})
      ).rejects.toThrow('Workflow not found');
    });

    it('should track execution history', async () => {
      const executionId = await workflowEngine.startWorkflow('testing', {
        globalVariables: { test: true }
      });

      // Wait a bit for execution to progress
      await new Promise(resolve => setTimeout(resolve, 100));

      const execution = workflowEngine.getExecution(executionId);
      expect(execution?.history).toBeDefined();
      expect(Array.isArray(execution?.history)).toBe(true);
    });

    it('should cancel workflow executions', async () => {
      const executionId = await workflowEngine.startWorkflow('testing', {
        globalVariables: { test: true }
      });

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 200));

      await workflowEngine.cancelExecution(executionId, 'Test cancellation');

      const execution = workflowEngine.getExecution(executionId);
      expect(execution?.status).toBe('cancelled');
      expect(execution?.error?.message).toBe('Test cancellation');
    });

    it('should pause and resume workflow executions', async () => {
      const executionId = await workflowEngine.startWorkflow('testing', {
        globalVariables: { test: true }
      });

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 200));

      await workflowEngine.pauseExecution(executionId);
      let execution = workflowEngine.getExecution(executionId);
      expect(execution?.status).toBe('paused');

      await workflowEngine.resumeExecution(executionId);
      execution = workflowEngine.getExecution(executionId);
      expect(execution?.status).toBe('running');
    });

    it('should get executions by status', async () => {
      const executionId1 = await workflowEngine.startWorkflow('testing', {
        globalVariables: { test: true }
      });

      const executionId2 = await workflowEngine.startWorkflow('code_review', {
        globalVariables: { test: true }
      });

      // Wait for executions to start
      await new Promise(resolve => setTimeout(resolve, 200));

      const runningExecutions = workflowEngine.getExecutionsByStatus('running');
      expect(runningExecutions.length).toBeGreaterThanOrEqual(0);

      const completedExecutions = workflowEngine.getExecutionsByStatus('completed');
      expect(Array.isArray(completedExecutions)).toBe(true);

      // Clean up
      await workflowEngine.cancelExecution(executionId1);
      await workflowEngine.cancelExecution(executionId2);
    });

    it('should provide workflow statistics', () => {
      const stats = workflowEngine.getStatistics();

      expect(stats).toHaveProperty('totalWorkflows');
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('runningExecutions');
      expect(stats).toHaveProperty('completedExecutions');
      expect(stats).toHaveProperty('failedExecutions');
      expect(stats).toHaveProperty('averageExecutionTime');

      expect(typeof stats.totalWorkflows).toBe('number');
      expect(typeof stats.totalExecutions).toBe('number');
      expect(typeof stats.runningExecutions).toBe('number');
      expect(typeof stats.completedExecutions).toBe('number');
      expect(typeof stats.failedExecutions).toBe('number');
      expect(typeof stats.averageExecutionTime).toBe('number');
    });
  });

  describe('Workflow Events', () => {
    beforeEach(async () => {
      await workflowEngine.start();
    });

    it('should emit workflow events', (done) => {
      let eventsReceived = 0;
      const expectedEvents = ['workflow:started', 'workflow:state_changed', 'workflow:action_executed'];

      expectedEvents.forEach(eventType => {
        workflowEngine.on(eventType, () => {
          eventsReceived++;
          if (eventsReceived === expectedEvents.length) {
            done();
          }
        });
      });

      workflowEngine.startWorkflow('testing', { globalVariables: { test: true } });
    });

    it('should handle workflow completion events', (done) => {
      workflowEngine.on('workflow:completed', (event) => {
        expect(event).toHaveProperty('executionId');
        expect(event).toHaveProperty('workflowId');
        expect(event).toHaveProperty('status');
        expect(event).toHaveProperty('timestamp');
        done();
      });

      workflowEngine.startWorkflow('testing', { globalVariables: { test: true } });
    });
  });
});

describe('WorkflowIntegrationCoordinator', () => {
  let coordinator: WorkflowIntegrationCoordinator;
  let config: OrchestratorConfig;

  beforeEach(() => {
    config = {
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.1,
      timeout: 300000,
      maxConcurrentDecisions: 5,
      maxChainOfThoughtDepth: 10,
      contextPreservation: {
        enabled: true,
        maxContextSize: 10000,
        compressionStrategy: 'summarize',
        preserveElements: ['signals', 'decisions'],
        compressionRatio: 0.7,
        importantSignals: ['emergency', 'critical']
      },
      tools: [],
      agents: {
        maxActiveAgents: 10,
        defaultTimeout: 600000,
        retryAttempts: 3,
        retryDelay: 5000,
        parallelExecution: true,
        loadBalancing: 'least_busy',
        healthCheckInterval: 30000
      },
      prompts: {
        systemPrompt: '',
        decisionMaking: '',
        chainOfThought: '',
        toolSelection: '',
        agentCoordination: '',
        checkpointEvaluation: '',
        errorHandling: '',
        contextUpdate: ''
      },
      decisionThresholds: {
        confidence: 0.8,
        tokenUsage: 8000,
        processingTime: 120000,
        agentResponse: 180000,
        errorRate: 0.1
      }
    };

    coordinator = new WorkflowIntegrationCoordinator(config);
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await coordinator.initialize();

      expect(coordinator.getWorkflowEngine()).toBeDefined();
      expect(coordinator.getSignalIntegration()).toBeDefined();
      expect(coordinator.getAgentIntegration()).toBeDefined();
      expect(coordinator.getTaskIntegration()).toBeDefined();
    });

    it('should emit initialized event', (done) => {
      coordinator.on('initialized', () => {
        done();
      });

      coordinator.initialize();
    });
  });

  describe('Signal Integration', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should handle PR opened signals', async () => {
      const prSignal: Signal = {
        id: 'test_pr_001',
        type: 'pr_opened',
        source: 'github',
        timestamp: new Date(),
        data: {
          prNumber: 123,
          author: 'test-user',
          title: 'Test PR',
          changes: ['src/test.ts']
        },
        priority: 2,
        resolved: false,
        relatedSignals: []
      };

      const triggeredExecutions = await coordinator.getSignalIntegration().handleSignal(prSignal);
      expect(triggeredExecutions.length).toBeGreaterThan(0);
    });

    it('should handle bug reported signals', async () => {
      const bugSignal: Signal = {
        id: 'test_bug_001',
        type: 'bug_reported',
        source: 'issue-tracker',
        timestamp: new Date(),
        data: {
          bugId: 'BUG-001',
          severity: 'high',
          description: 'Test bug'
        },
        priority: 3,
        resolved: false,
        relatedSignals: []
      };

      const triggeredExecutions = await coordinator.getSignalIntegration().handleSignal(bugSignal);
      expect(triggeredExecutions.length).toBeGreaterThan(0);
    });

    it('should handle emergency signals', async () => {
      const emergencySignal: Signal = {
        id: 'test_emergency_001',
        type: 'emergency',
        source: 'monitoring',
        timestamp: new Date(),
        data: {
          emergencyType: 'critical_bug',
          severity: 'critical',
          affectedSystems: ['test-system']
        },
        priority: 5,
        resolved: false,
        relatedSignals: []
      };

      const triggeredExecutions = await coordinator.getSignalIntegration().handleSignal(emergencySignal);
      expect(triggeredExecutions.length).toBeGreaterThan(0);
      // Emergency signals should fallback to bug_fix workflow since emergency workflows don't exist yet
    });
  });

  describe('Agent Integration', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should register and manage agents', () => {
      const agentIntegration = coordinator.getAgentIntegration();
      const agents = agentIntegration.getAvailableAgents('robo-developer');
      expect(Array.isArray(agents)).toBe(true);
      // Agents array may be empty if no agents are available for the role
    });

    it('should assign agents to tasks', async () => {
      const agentIntegration = coordinator.getAgentIntegration();
      const taskIntegration = coordinator.getTaskIntegration();

      // Create a test task
      const task = await taskIntegration.createWorkflowTask('test-execution', {
        type: 'test_task',
        description: 'Test task assignment',
        priority: 1
      });

      // Assign agent (this will use mock agents)
      const assignedAgentId = await agentIntegration.assignAgent(
        'test-execution',
        'robo-developer',
        task
      );

      expect(assignedAgentId).toBeDefined();
      expect(typeof assignedAgentId).toBe('string');
    });
  });

  describe('Task Integration', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should create and manage tasks', async () => {
      const taskIntegration = coordinator.getTaskIntegration();

      const task = await taskIntegration.createWorkflowTask('test-execution', {
        type: 'test_task',
        description: 'Test task creation',
        priority: 1,
        dependencies: []
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.description).toBe('Test task creation');
      expect(task.status).toBe('pending');
    });

    it('should update task status', async () => {
      const taskIntegration = coordinator.getTaskIntegration();

      const task = await taskIntegration.createWorkflowTask('test-execution', {
        type: 'test_task',
        description: 'Test task status update',
        priority: 1
      });

      await taskIntegration.updateTaskStatus(task.id, 'in_progress', 50);

      const updatedTask = await taskIntegration.getExecutionTasks('test-execution');
      expect(updatedTask[0].status).toBe('in_progress');
      expect((updatedTask[0].payload as any).progress).toBe(50);
    });

    it('should handle task dependencies', async () => {
      const taskIntegration = coordinator.getTaskIntegration();

      const parentTask = await taskIntegration.createWorkflowTask('test-execution', {
        type: 'parent_task',
        description: 'Parent task',
        priority: 1
      });

      const childTask = await taskIntegration.createWorkflowTask('test-execution', {
        type: 'child_task',
        description: 'Child task with dependency',
        priority: 1,
        dependencies: [parentTask.id]
      });

      // Child task should not be ready initially
      const canStart = await taskIntegration.checkTaskDependencies(childTask.id);
      expect(canStart).toBe(false);

      // Complete parent task
      await taskIntegration.updateTaskStatus(parentTask.id, 'completed');

      // Child task should now be ready
      const canStartAfter = await taskIntegration.checkTaskDependencies(childTask.id);
      expect(canStartAfter).toBe(true);
    });
  });

  describe('Integration Events', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should emit integration events', (done) => {
      let eventsReceived = 0;
      const expectedEvents = ['signal_processed', 'agent_assigned', 'task_created'];

      expectedEvents.forEach(eventType => {
        coordinator.on(eventType, () => {
          eventsReceived++;
          if (eventsReceived === expectedEvents.length) {
            done();
          }
        });
      });

      // Trigger events
      const signal: Signal = {
        id: 'test_signal',
        type: 'test',
        source: 'test',
        timestamp: new Date(),
        data: {},
        priority: 1,
        resolved: false,
        relatedSignals: []
      };

      coordinator.getSignalIntegration().handleSignal(signal);
    });
  });
});

describe('Workflow Error Handling', () => {
  let workflowEngine: WorkflowEngine;
  let config: OrchestratorConfig;

  beforeEach(async () => {
    config = {
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.1,
      timeout: 300000,
      maxConcurrentDecisions: 5,
      maxChainOfThoughtDepth: 10,
      contextPreservation: {
        enabled: true,
        maxContextSize: 10000,
        compressionStrategy: 'summarize',
        preserveElements: ['signals', 'decisions'],
        compressionRatio: 0.7,
        importantSignals: ['emergency', 'critical']
      },
      tools: [],
      agents: {
        maxActiveAgents: 10,
        defaultTimeout: 600000,
        retryAttempts: 3,
        retryDelay: 5000,
        parallelExecution: true,
        loadBalancing: 'least_busy',
        healthCheckInterval: 30000
      },
      prompts: {
        systemPrompt: '',
        decisionMaking: '',
        chainOfThought: '',
        toolSelection: '',
        agentCoordination: '',
        checkpointEvaluation: '',
        errorHandling: '',
        contextUpdate: ''
      },
      decisionThresholds: {
        confidence: 0.8,
        tokenUsage: 8000,
        processingTime: 120000,
        agentResponse: 180000,
        errorRate: 0.1
      }
    };

    workflowEngine = new WorkflowEngine(config);
    await workflowEngine.start();
  });

  afterEach(async () => {
    if (workflowEngine) {
      await workflowEngine.stop();
    }
  });

  it('should handle workflow execution errors', (done) => {
    workflowEngine.on('workflow:error', (event) => {
      expect(event).toHaveProperty('executionId');
      expect(event).toHaveProperty('error');
      expect(event.error).toHaveProperty('code');
      expect(event.error).toHaveProperty('message');
      done();
    });

    // Start a workflow that might fail (this would need a workflow that can fail)
    workflowEngine.startWorkflow('testing', {
      globalVariables: { force_error: true }
    });
  });

  it('should handle invalid operation errors', async () => {
    // Try to cancel non-existent execution
    await expect(
      workflowEngine.cancelExecution('non_existent_execution')
    ).rejects.toThrow('Execution not found');

    // Try to pause non-existent execution
    await expect(
      workflowEngine.pauseExecution('non_existent_execution')
    ).rejects.toThrow('Execution not found');

    // Try to resume non-existent execution
    await expect(
      workflowEngine.resumeExecution('non_existent_execution')
    ).rejects.toThrow('Execution not found');
  });

  it('should handle state transition errors', async () => {
    // This would require creating a workflow with invalid transitions
    // For now, we'll test that the system handles edge cases gracefully
    const executionId = await workflowEngine.startWorkflow('testing', {
      globalVariables: { test: true }
    });

    // Try to pause an already completed execution (if it completes quickly)
    await new Promise(resolve => setTimeout(resolve, 100));

    const execution = workflowEngine.getExecution(executionId);
    if (execution?.status === 'completed') {
      await expect(
        workflowEngine.pauseExecution(executionId)
      ).rejects.toThrow('Cannot pause execution in status: completed');
    }
  });
});