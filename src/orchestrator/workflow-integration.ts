/**
 * ♫ Workflow Integration Layer for @dcversus/prp
 *
 * Integration adapters that connect the workflow engine with existing orchestration systems
 * including signal processing, agent management, and task coordination.
 */
import { EventEmitter } from 'events';

import { InspectorPayload, Recommendation } from '../shared/types';
import { createLayerLogger } from '../shared/logger';

import {
  WorkflowEngine,
  WorkflowExecution
} from './workflow-engine';

import type { OrchestratorConfig } from './types';
import type {
  WorkflowDefinition,
  WorkflowContext} from './workflow-engine';
import type { Signal, AgentTask, AgentSession} from '../shared/types';

const workflowLogger = createLayerLogger('orchestrator');
// ===== SIGNAL INTEGRATION =====
export interface WorkflowSignalIntegration {
  /**
   * Handle incoming signals and trigger appropriate workflows
   */
  handleSignal(signal: Signal): Promise<string[]>;
  /**
   * Register signal handlers for workflow triggers
   */
  registerSignalHandlers(): void;
  /**
   * Emit workflow-related signals
   */
  emitWorkflowSignal(
    executionId: string,
    signalType: string,
    data: Record<string, string | number | boolean | Record<string, unknown>>,
  ): Promise<void>;
}
export class SignalIntegration extends EventEmitter implements WorkflowSignalIntegration {
  private readonly workflowEngine: WorkflowEngine;
  private readonly config: OrchestratorConfig;
  private readonly signalHandlers = new Map<string, (signal: Signal) => Promise<string[]>>();
  constructor(workflowEngine: WorkflowEngine, config: OrchestratorConfig) {
    super();
    this.workflowEngine = workflowEngine;
    this.config = config;
  }
  async handleSignal(signal: Signal): Promise<string[]> {
    const triggeredExecutions: string[] = [];
    try {
      // Find workflows triggered by this signal
      const triggeredWorkflows = this.findWorkflowsForSignal(signal);
      for (const workflow of triggeredWorkflows) {
        const context = this.createContextFromSignal(signal);
        const executionId = await this.workflowEngine.startWorkflow(workflow.id, context, {
          triggeringSignal: signal,
        });
        triggeredExecutions.push(executionId);
        workflowLogger.debug(
          'WorkflowIntegration',
          `[SignalIntegration] Triggered workflow ${workflow.id} by signal ${signal.type} (execution: ${executionId})`,
        );
      }
      // Update any existing executions waiting for this signal
      await this.updateWaitingExecutions(signal);
      this.emit('signal_processed', { signal, triggeredExecutions });
      return triggeredExecutions;
    } catch (error) {
      console.error(`[SignalIntegration] Error handling signal ${signal.type}:`, error);
      this.emit('signal_error', { signal, error });
      throw error;
    }
  }
  registerSignalHandlers(): void {
    // Register common signal handlers
    this.signalHandlers.set('pr_opened', this.handlePROpenedSignal.bind(this));
    this.signalHandlers.set('feature_approved', this.handleFeatureApprovedSignal.bind(this));
    this.signalHandlers.set('bug_reported', this.handleBugReportedSignal.bind(this));
    this.signalHandlers.set('deploy_request', this.handleDeployRequestSignal.bind(this));
    this.signalHandlers.set('test_request', this.handleTestRequestSignal.bind(this));
    this.signalHandlers.set(
      'code_review_requested',
      this.handleCodeReviewRequestedSignal.bind(this),
    );
    this.signalHandlers.set('emergency', this.handleEmergencySignal.bind(this));
    // Listen to workflow engine events
    this.workflowEngine.on('workflow:started', this.handleWorkflowStarted.bind(this));
    this.workflowEngine.on('workflow:completed', this.handleWorkflowCompleted.bind(this));
    this.workflowEngine.on('workflow:error', this.handleWorkflowError.bind(this));
  }
  async emitWorkflowSignal(
    executionId: string,
    signalType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const signal: Signal = {
      id: this.generateId(),
      type: signalType,
      source: `workflow:${executionId}`,
      timestamp: new Date(),
      data,
      priority: typeof data.priority === 'number' ? data.priority : 1,
      resolved: false,
      relatedSignals: [],
    };
    this.emit('workflow_signal', signal);
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Emitted workflow signal: ${signalType} from execution ${executionId}`,
    );
  }
  // ===== PRIVATE METHODS =====
  private findWorkflowsForSignal(signal: Signal): WorkflowDefinition[] {
    const workflows = this.workflowEngine.getWorkflows();
    const triggeredWorkflows: WorkflowDefinition[] = [];
    for (const workflow of workflows) {
      for (const trigger of workflow.triggers) {
        if (trigger.type === 'signal' && trigger.enabled) {
          const conditionMet =
            typeof trigger.condition === 'string'
              ? this.evaluateSignalCondition(trigger.condition, signal)
              : trigger.condition({ signal } as WorkflowContext);
          if (conditionMet) {
            triggeredWorkflows.push(workflow);
            break;
          }
        }
      }
    }
    // Sort by trigger priority
    triggeredWorkflows.sort((a, b) => {
      const aPriority = Math.max(
        ...a.triggers.filter((t) => t.type === 'signal').map((t) => t.priority),
      );
      const bPriority = Math.max(
        ...b.triggers.filter((t) => t.type === 'signal').map((t) => t.priority),
      );
      return bPriority - aPriority;
    });
    return triggeredWorkflows;
  }
  private evaluateSignalCondition(condition: string, signal: Signal): boolean {
    try {
      return new Function(
        'signal',
        `
        return ${condition};
      `,
      )(signal);
    } catch (error) {
      console.error(`[SignalIntegration] Error evaluating signal condition: ${condition}`, error);
      return false;
    }
  }
  private createContextFromSignal(signal: Signal): any {
    return {
      signal,
      globalVariables: {
        signalType: signal.type,
        signalData: JSON.stringify(signal.data),
        signalPriority: signal.priority,
      },
    };
  }
  private async updateWaitingExecutions(signal: Signal): Promise<void> {
    const executions = this.workflowEngine.getExecutionsByStatus('running');
    for (const execution of executions) {
      const workflow = this.workflowEngine.getWorkflow(execution.workflowId);
      if (!workflow) {
        continue;
      }
      // Check if execution is waiting for this signal
      const currentState = workflow.states.find((s) => s.id === execution.currentState);
      if (currentState?.type === 'wait' && currentState.waitEvent === signal.type) {
        // Resume execution by re-executing the state
        setImmediate(() => this.workflowEngine['executeWorkflow'](execution.id));
      }
    }
  }
  // ===== SIGNAL HANDLERS =====
  private async handlePROpenedSignal(signal: Signal): Promise<string[]> {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Handling PR opened signal: ${signal.data.prNumber}`,
    );
    // Trigger code review workflow
    const context: Partial<WorkflowContext> = {
      signal,
      globalVariables: {
        prNumber:
          typeof signal.data.prNumber === 'number'
            ? signal.data.prNumber
            : String(signal.data.prNumber),
        author:
          typeof signal.data.author === 'string' ? signal.data.author : String(signal.data.author),
        changes:
          typeof signal.data.changes === 'string'
            ? signal.data.changes
            : JSON.stringify(signal.data.changes),
      },
    };
    const executionId = await this.workflowEngine.startWorkflow(
      'code_review',
      context,
      signal.data,
    );
    return [executionId];
  }
  private async handleFeatureApprovedSignal(signal: Signal): Promise<string[]> {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Handling feature approved signal: ${signal.data.featureId}`,
    );
    // Trigger feature implementation workflow
    const context = {
      signal,
      globalVariables: {
        featureId: signal.data.featureId,
        featureName: signal.data.featureName,
        approvedBy: signal.data.approvedBy,
      },
    };
    const executionId = await this.workflowEngine.startWorkflow(
      'feature_implementation',
      context,
      signal.data,
    );
    return [executionId];
  }
  private async handleBugReportedSignal(signal: Signal): Promise<string[]> {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Handling bug reported signal: ${signal.data.bugId}`,
    );
    // Trigger bug fix workflow
    const context = {
      signal,
      globalVariables: {
        bugId: signal.data.bugId,
        bugSeverity: signal.data.severity,
        reporter: signal.data.reporter,
      },
    };
    const executionId = await this.workflowEngine.startWorkflow('bug_fix', context, signal.data);
    return [executionId];
  }
  private async handleDeployRequestSignal(signal: Signal): Promise<string[]> {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Handling deploy request signal: ${signal.data.deploymentId}`,
    );
    // Trigger deployment workflow
    const context = {
      signal,
      globalVariables: {
        deploymentId: signal.data.deploymentId,
        version: signal.data.version,
        environment: signal.data.environment,
      },
    };
    const executionId = await this.workflowEngine.startWorkflow('deployment', context, signal.data);
    return [executionId];
  }
  private async handleTestRequestSignal(signal: Signal): Promise<string[]> {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Handling test request signal: ${signal.data.testSuite}`,
    );
    // Trigger testing workflow
    const context = {
      signal,
      globalVariables: {
        testSuite: signal.data.testSuite,
        environment: signal.data.environment,
        testType: signal.data.testType,
      },
    };
    const executionId = await this.workflowEngine.startWorkflow('testing', context, signal.data);
    return [executionId];
  }
  private async handleCodeReviewRequestedSignal(signal: Signal): Promise<string[]> {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Handling code review requested signal: ${signal.data.prNumber}`,
    );
    // Trigger code review workflow
    const context = {
      signal,
      globalVariables: {
        prNumber: signal.data.prNumber,
        requestedBy: signal.data.requestedBy,
        reviewType: signal.data.reviewType,
      },
    };
    const executionId = await this.workflowEngine.startWorkflow(
      'code_review',
      context,
      signal.data,
    );
    return [executionId];
  }
  private async handleEmergencySignal(signal: Signal): Promise<string[]> {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Handling emergency signal: ${signal.data.emergencyType}`,
    );
    // For emergencies, trigger appropriate workflows based on type
    const {emergencyType} = signal.data;
    let workflowId = 'bug_fix'; // default
    switch (emergencyType) {
      case 'security_breach':
        workflowId = 'security_incident';
        break;
      case 'production_down':
        workflowId = 'incident_response';
        break;
      case 'critical_bug':
        workflowId = 'emergency_fix';
        break;
      default:
        workflowId = 'bug_fix';
    }
    const context = {
      signal,
      globalVariables: {
        emergencyType,
        severity: 'critical',
        affectedSystems: signal.data.affectedSystems,
      },
    };
    try {
      const executionId = await this.workflowEngine.startWorkflow(workflowId, context, signal.data);
      return [executionId];
    } catch (error) {
      console.warn(
        `[SignalIntegration] Emergency workflow ${workflowId} not found, falling back to bug_fix`,
      );
      const fallbackExecutionId = await this.workflowEngine.startWorkflow(
        'bug_fix',
        context,
        signal.data,
      );
      return [fallbackExecutionId];
    }
  }
  // ===== WORKFLOW EVENT HANDLERS =====
  private handleWorkflowStarted(event: WorkflowExecutionStartedEvent): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Workflow started: ${event.executionId}`,
    );
    this.emit('workflow_started', event);
  }
  private handleWorkflowCompleted(event: WorkflowExecutionCompletedEvent): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      `[SignalIntegration] Workflow completed: ${event.executionId} (${event.status})`,
    );
    this.emit('workflow_completed', event);
    // Emit completion signal for other workflows to react to
    this.emitWorkflowSignal(event.executionId, 'workflow_completed', {
      workflowId: event.workflowId,
      status: event.status,
      result: event.result,
    });
  }
  private handleWorkflowError(event: WorkflowErrorEvent): void {
    console.error(`[SignalIntegration] Workflow error: ${event.executionId}`, event.error);
    this.emit('workflow_error', event);
    // Emit error signal for error handling workflows
    this.emitWorkflowSignal(event.executionId, 'workflow_error', {
      workflowId: event.executionId,
      error: event.error,
      severity: event.error.recoverable ? 'medium' : 'high',
    });
  }
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
// ===== AGENT INTEGRATION =====
export interface WorkflowAgentIntegration {
  /**
   * Assign agents to workflow tasks
   */
  assignAgent(executionId: string, agentRole: string, task: AgentTask): Promise<string>;
  /**
   * Get available agents for a role
   */
  getAvailableAgents(role: string): Promise<AgentSession[]>;
  /**
   * Handle agent task completion
   */
  handleTaskCompletion(
    agentId: string,
    taskId: string,
    result: Record<string, string | number | boolean | Record<string, unknown>>,
  ): Promise<void>;
  /**
   * Monitor agent availability and performance
   */
  monitorAgents(): void;
}
export class AgentIntegration extends EventEmitter implements WorkflowAgentIntegration {
  private readonly workflowEngine: WorkflowEngine;
  private readonly config: OrchestratorConfig;
  private readonly agentRegistry = new Map<string, AgentSession>();
  private readonly taskAssignments = new Map<string, string>(); // taskId -> agentId
  constructor(workflowEngine: WorkflowEngine, config: OrchestratorConfig) {
    super();
    this.workflowEngine = workflowEngine;
    this.config = config;
  }
  async assignAgent(executionId: string, agentRole: string, task: AgentTask): Promise<string> {
    try {
      // Find available agent for the role
      const availableAgents = await this.getAvailableAgents(agentRole);
      if (availableAgents.length === 0) {
        throw new Error(`No available agents for role: ${agentRole}`);
      }
      // Select best agent (currently picks the least busy)
      const selectedAgent = this.selectBestAgent(availableAgents);
      // Assign task to agent
      selectedAgent.currentTask = task;
      selectedAgent.lastActivity = new Date();
      selectedAgent.status = 'busy';
      this.taskAssignments.set(task.id, selectedAgent.id);
      workflowLogger.debug(
        'WorkflowIntegration',
        `[AgentIntegration] Assigned task ${task.id} to agent ${selectedAgent.id} (${agentRole})`,
      );
      // Update execution context
      const execution = this.workflowEngine.getExecution(executionId);
      if (execution) {
        execution.agents.push(selectedAgent.id);
        execution.tasks.push(task.id);
      }
      this.emit('agent_assigned', {
        executionId,
        agentId: selectedAgent.id,
        taskId: task.id,
        role: agentRole,
      });
      // Simulate task assignment (in real implementation, this would communicate with the agent)
      setTimeout(() => this.simulateTaskExecution(selectedAgent.id, task), 0);
      return selectedAgent.id;
    } catch (error) {
      console.error(`[AgentIntegration] Error assigning agent for role ${agentRole}:`, error);
      this.emit('agent_assignment_error', { executionId, role: agentRole, error });
      throw error;
    }
  }
  async getAvailableAgents(role: string): Promise<AgentSession[]> {
    const allAgents = Array.from(this.agentRegistry.values());
    return allAgents.filter(
      (agent) =>
        agent.status === 'idle' ||
        (agent.status === 'active' && this.isAgentCompatible(agent, role)),
    );
  }
  async handleTaskCompletion(
    agentId: string,
    taskId: string,
    result: Record<string, string | number | boolean | Record<string, unknown>>,
  ): Promise<void> {
    try {
      const agent = this.agentRegistry.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      // Update agent status
      agent.currentTask = undefined;
      agent.status = 'idle';
      agent.lastActivity = new Date();
      agent.performance.tasksCompleted++;
      // Remove task assignment
      this.taskAssignments.delete(taskId);
      workflowLogger.debug(
        'WorkflowIntegration',
        `[AgentIntegration] Agent ${agentId} completed task ${taskId}`,
      );
      this.emit('task_completed', { agentId, taskId, result });
      // Find the execution this task belongs to and potentially advance it
      await this.advanceExecutionForTask(taskId, result);
    } catch (error) {
      console.error('[AgentIntegration] Error handling task completion:', error);
      this.emit('task_completion_error', { agentId, taskId, error });
    }
  }
  monitorAgents(): void {
    setInterval(() => {
      const agents = Array.from(this.agentRegistry.values());
      const activeAgents = agents.filter((a) => a.status === 'busy').length;
      const idleAgents = agents.filter((a) => a.status === 'idle').length;
      workflowLogger.debug(
        'WorkflowIntegration',
        `[AgentIntegration] Agent status: ${activeAgents} active, ${idleAgents} idle`,
      );
      // Check for stuck agents
      this.checkForStuckAgents();
      this.emit('agent_status_update', { activeAgents, idleAgents, totalAgents: agents.length });
    }, 30000); // Check every 30 seconds
  }
  // ===== AGENT REGISTRATION =====
  registerAgent(agent: AgentSession): void {
    this.agentRegistry.set(agent.id, agent);
    workflowLogger.debug(
      'WorkflowIntegration',
      `[AgentIntegration] Registered agent: ${agent.id} (${agent.agentConfig.role})`,
    );
    this.emit('agent_registered', agent);
  }
  unregisterAgent(agentId: string): boolean {
    const deleted = this.agentRegistry.delete(agentId);
    if (deleted) {
      workflowLogger.debug(
        'WorkflowIntegration',
        `[AgentIntegration] Unregistered agent: ${agentId}`,
      );
      this.emit('agent_unregistered', { agentId });
    }
    return deleted;
  }
  // ===== PRIVATE METHODS =====
  private isAgentCompatible(agent: AgentSession, role: string): boolean {
    // Check if agent role matches or if agent has the required capability
    return (
      agent.agentConfig.role === role ||
      agent.capabilities?.some((cap) => cap.toLowerCase().includes(role.toLowerCase()))
    );
  }
  private selectBestAgent(agents: AgentSession[]): AgentSession {
    // Select agent with best performance metrics
    return agents.reduce((best, current) => {
      const bestScore = best.performance.successRate / (best.performance.averageTaskTime || 1);
      const currentScore =
        current.performance.successRate / (current.performance.averageTaskTime || 1);
      return currentScore > bestScore ? current : best;
    });
  }
  private async simulateTaskExecution(agentId: string, task: AgentTask): Promise<void> {
    // Simulate task execution time
    const executionTime = Math.random() * 10000 + 5000; // 5-15 seconds
    const success = Math.random() > 0.1; // 90% success rate
    setTimeout(async () => {
      const result = {
        success,
        output: success ? `Task ${task.id} completed successfully` : `Task ${task.id} failed`,
        executionTime,
        agentId,
      };
      await this.handleTaskCompletion(agentId, task.id, result);
    }, executionTime);
  }
  private async advanceExecutionForTask(taskId: string, result: any): Promise<void> {
    // Find executions that have this task
    const executions = this.workflowEngine
      .getExecutions()
      .filter((exec) => exec.tasks.includes(taskId) && exec.status === 'running');
    for (const execution of executions) {
      // Update execution context with task result
      execution.context.globalVariables[`task_${taskId}_result`] = result;
      execution.context.lastUpdated = new Date();
      // Resume execution if it was waiting for this task
      const workflow = this.workflowEngine.getWorkflow(execution.workflowId);
      if (workflow) {
        const currentState = workflow.states.find((s) => s.id === execution.currentState);
        if (currentState?.type === 'task') {
          // Resume execution
          setImmediate(() => this.workflowEngine['executeWorkflow'](execution.id));
        }
      }
    }
  }
  private checkForStuckAgents(): void {
    const stuckThreshold = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    for (const agent of this.agentRegistry.values()) {
      if (agent.status === 'busy' && agent.lastActivity.getTime() < now - stuckThreshold) {
        console.warn(`[AgentIntegration] Agent ${agent.id} appears to be stuck`);
        this.emit('agent_stuck', { agentId: agent.id, lastActivity: agent.lastActivity });
        // Reset agent status
        agent.status = 'idle';
        agent.currentTask = undefined;
      }
    }
  }
  // Initialize some mock agents for demonstration
  initializeMockAgents(): void {
    const mockAgents: AgentSession[] = [
      {
        id: 'agent_dev_001',
        agentId: 'dev-001',
        agentConfig: {
          id: 'dev-001',
          name: 'Robo Developer 1',
          role: 'robo-developer' as any,
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.1,
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: false,
            supportsParallel: true,
          },
        },
        status: 'idle',
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 1.0,
          errorCount: 0,
        },
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: false,
          supportsParallel: true,
        },
      },
      {
        id: 'agent_qa_001',
        agentId: 'qa-001',
        agentConfig: {
          id: 'qa-001',
          name: 'Robo QA 1',
          role: 'robo-quality-control' as any,
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.1,
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: false,
            supportsParallel: true,
          },
        },
        status: 'idle',
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 1.0,
          errorCount: 0,
        },
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: false,
          supportsParallel: true,
        },
      },
      {
        id: 'agent_design_001',
        agentId: 'design-001',
        agentConfig: {
          id: 'design-001',
          name: 'Robo Designer 1',
          role: 'robo-ux-ui-designer' as any,
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.2,
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: true,
            supportsSubAgents: false,
            supportsParallel: true,
          },
        },
        status: 'idle',
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 1.0,
          errorCount: 0,
        },
        capabilities: {
          supportsTools: true,
          supportsImages: true,
          supportsSubAgents: false,
          supportsParallel: true,
        },
      },
      {
        id: 'agent_sre_001',
        agentId: 'sre-001',
        agentConfig: {
          id: 'sre-001',
          name: 'Robo SRE 1',
          role: 'robo-devops-sre' as any,
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.1,
          enabled: true,
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: false,
            supportsParallel: true,
          },
        },
        status: 'idle',
        lastActivity: new Date(),
        tokenUsage: { total: 0, cost: 0, lastUpdated: new Date() },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 1.0,
          errorCount: 0,
        },
        capabilities: {
          supportsTools: true,
          supportsImages: false,
          supportsSubAgents: false,
          supportsParallel: true,
        },
      },
    ];
    mockAgents.forEach((agent) => this.registerAgent(agent));
    workflowLogger.debug(
      'WorkflowIntegration',
      `[AgentIntegration] Initialized ${mockAgents.length} mock agents`,
    );
  }
}
// ===== TASK INTEGRATION =====
export interface WorkflowTaskIntegration {
  /**
   * Create and manage workflow tasks
   */
  createWorkflowTask(
    executionId: string,
    taskData: {
      type?: string;
      description: string;
      priority?: number;
      payload?: Record<string, string | number | boolean | Record<string, unknown>>;
      dependencies?: string[];
    },
  ): Promise<AgentTask>;
  /**
   * Track task progress and status
   */
  updateTaskStatus(taskId: string, status: string, progress?: number): Promise<void>;
  /**
   * Handle task dependencies
   */
  checkTaskDependencies(taskId: string): Promise<boolean>;
  /**
   * Get tasks for execution
   */
  getExecutionTasks(executionId: string): Promise<AgentTask[]>;
}
export class TaskIntegration extends EventEmitter implements WorkflowTaskIntegration {
  private readonly workflowEngine: WorkflowEngine;
  private readonly tasks = new Map<string, AgentTask>();
  private readonly taskDependencies = new Map<string, string[]>();
  constructor(workflowEngine: WorkflowEngine) {
    super();
    this.workflowEngine = workflowEngine;
  }
  async createWorkflowTask(
    executionId: string,
    taskData: {
      type?: string;
      description: string;
      priority?: number;
      payload?: Record<string, string | number | boolean | Record<string, unknown>>;
      dependencies?: string[];
    },
  ): Promise<AgentTask> {
    const task: AgentTask = {
      id: this.generateId(),
      type: taskData.type || 'workflow_task',
      description: taskData.description,
      priority: taskData.priority || 1,
      payload: {
        ...taskData.payload,
        executionId,
        createdAt: new Date(),
      },
      assignedAt: new Date(),
      dependencies: taskData.dependencies || [],
      status: 'pending',
    };
    this.tasks.set(task.id, task);
    if (task.dependencies.length > 0) {
      this.taskDependencies.set(task.id, task.dependencies);
    }
    workflowLogger.debug(
      'WorkflowIntegration',
      `[TaskIntegration] Created workflow task: ${task.id} for execution ${executionId}`,
    );
    this.emit('task_created', { executionId, task });
    return task;
  }
  async updateTaskStatus(taskId: string, status: string, progress?: number): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    const oldStatus = task.status;
    task.status = status as AgentTask['status'];
    if (progress !== undefined) {
      (
        task.payload as Record<string, string | number | boolean | Record<string, unknown>>
      ).progress = progress;
    }
    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date();
    }
    workflowLogger.debug(
      'WorkflowIntegration',
      `[TaskIntegration] Updated task ${taskId} status: ${oldStatus} -> ${status}`,
    );
    this.emit('task_status_updated', { taskId, oldStatus, newStatus: status, progress });
    // Check if this enables other tasks
    if (status === 'completed') {
      await this.checkDependentTasks(taskId);
    }
  }
  async checkTaskDependencies(taskId: string): Promise<boolean> {
    const dependencies = this.taskDependencies.get(taskId) || [];
    if (dependencies.length === 0) {
      return true;
    }
    const allDependenciesCompleted = dependencies.every((depId) => {
      const depTask = this.tasks.get(depId);
      return depTask?.status === 'completed';
    });
    return allDependenciesCompleted;
  }
  async getExecutionTasks(executionId: string): Promise<AgentTask[]> {
    return Array.from(this.tasks.values()).filter(
      (task) =>
        (task.payload as Record<string, string | number | boolean | Record<string, unknown>>)
          .executionId === executionId,
    );
  }
  // ===== PRIVATE METHODS =====
  private async checkDependentTasks(completedTaskId: string): Promise<void> {
    // Find tasks that depend on the completed task
    for (const [taskId, dependencies] of this.taskDependencies.entries()) {
      if (dependencies.includes(completedTaskId)) {
        const canStart = await this.checkTaskDependencies(taskId);
        if (canStart) {
          const task = this.tasks.get(taskId);
          if (task?.status === 'pending') {
            this.emit('task_ready', { taskId, task });
            workflowLogger.debug(
              'WorkflowIntegration',
              `[TaskIntegration] Task ${taskId} is now ready to start`,
            );
          }
        }
      }
    }
  }
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
// ===== MAIN INTEGRATION COORDINATOR =====
export class WorkflowIntegrationCoordinator extends EventEmitter {
  private readonly workflowEngine: WorkflowEngine;
  private readonly signalIntegration: SignalIntegration;
  private readonly agentIntegration: AgentIntegration;
  private readonly taskIntegration: TaskIntegration;
  private readonly config: OrchestratorConfig;
  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.workflowEngine = new WorkflowEngine(config);
    this.signalIntegration = new SignalIntegration(this.workflowEngine, config);
    this.agentIntegration = new AgentIntegration(this.workflowEngine, config);
    this.taskIntegration = new TaskIntegration(this.workflowEngine);
    this.setupIntegrationEventHandlers();
  }
  async initialize(): Promise<void> {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Initializing workflow integration...',
    );
    // Start workflow engine
    await this.workflowEngine.start();
    // Register signal handlers
    this.signalIntegration.registerSignalHandlers();
    // Initialize mock agents
    this.agentIntegration.initializeMockAgents();
    // Start agent monitoring
    this.agentIntegration.monitorAgents();
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Workflow integration initialized successfully',
    );
    this.emit('initialized');
  }
  async shutdown(): Promise<void> {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Shutting down workflow integration...',
    );
    await this.workflowEngine.stop();
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Workflow integration shut down successfully',
    );
  }
  // ===== PUBLIC API =====
  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }
  getSignalIntegration(): SignalIntegration {
    return this.signalIntegration;
  }
  getAgentIntegration(): AgentIntegration {
    return this.agentIntegration;
  }
  getTaskIntegration(): TaskIntegration {
    return this.taskIntegration;
  }
  // ===== EVENT HANDLERS =====
  private setupIntegrationEventHandlers(): void {
    // Signal integration events
    this.signalIntegration.on('signal_processed', this.handleSignalProcessed.bind(this));
    this.signalIntegration.on('workflow_started', this.handleWorkflowStarted.bind(this));
    this.signalIntegration.on('workflow_completed', this.handleWorkflowCompleted.bind(this));
    // Agent integration events
    this.agentIntegration.on('agent_assigned', this.handleAgentAssigned.bind(this));
    this.agentIntegration.on('task_completed', this.handleTaskCompleted.bind(this));
    this.agentIntegration.on('agent_stuck', this.handleAgentStuck.bind(this));
    // Task integration events
    this.taskIntegration.on('task_created', this.handleTaskCreated.bind(this));
    this.taskIntegration.on('task_ready', this.handleTaskReady.bind(this));
    // Workflow engine events
    this.workflowEngine.on(
      'workflow:action_executed',
      this.handleWorkflowActionExecuted.bind(this),
    );
  }
  private handleSignalProcessed(event: { signal: Signal; triggeredExecutions: string[] }): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Signal processed:',
      event,
    );
    this.emit('signal_processed', event);
  }
  private handleWorkflowStarted(event: WorkflowExecutionStartedEvent): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Workflow started:',
      event,
    );
    this.emit('workflow_started', event);
  }
  private handleWorkflowCompleted(event: WorkflowExecutionCompletedEvent): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Workflow completed:',
      event,
    );
    this.emit('workflow_completed', event);
  }
  private handleAgentAssigned(event: {
    executionId: string;
    agentId: string;
    taskId: string;
    role: string;
  }): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Agent assigned:',
      event,
    );
    this.emit('agent_assigned', event);
  }
  private handleTaskCompleted(event: {
    agentId: string;
    taskId: string;
    result: Record<string, string | number | boolean | Record<string, unknown>>;
  }): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Task completed:',
      event,
    );
    this.emit('task_completed', event);
  }
  private handleAgentStuck(event: { agentId: string; lastActivity: Date }): void {
    console.warn('[WorkflowIntegrationCoordinator] Agent stuck:', event);
    this.emit('agent_stuck', event);
  }
  private handleTaskCreated(event: { executionId: string; task: AgentTask }): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Task created:',
      event,
    );
    this.emit('task_created', event);
  }
  private handleTaskReady(event: { taskId: string; task: AgentTask }): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Task ready:',
      event,
    );
    this.emit('task_ready', event);
  }
  private handleWorkflowActionExecuted(event: WorkflowActionExecutedEvent): void {
    workflowLogger.debug(
      'WorkflowIntegration',
      '[WorkflowIntegrationCoordinator] Workflow action executed:',
      event,
    );
    this.emit('workflow_action_executed', event);
  }
}
