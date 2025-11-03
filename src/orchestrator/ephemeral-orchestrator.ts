/**
 * ♫ Ephemeral Orchestrator
 *
 * Handles ephemeral signal cycles and agent orchestration
 */

import { EventEmitter } from 'events';
import { ephemeralSignalSystem, EphemeralSignal, SystemStatus, AgentStatus, PRPStatus } from '../signals/ephemeral-signal-system';
import { createLayerLogger, HashUtils } from '../shared';
import { ToolRegistry } from './tool-registry';
import { AgentManager } from './agent-manager';

const logger = createLayerLogger('orchestrator');

export interface TaskPriority {
  prpId: string;
  priority: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: number;
  dependencies: string[];
  agentRequirements: string[];
}

export interface CycleContext {
  cycleId: string;
  startTime: Date;
  currentTask?: TaskPriority;
  activeAgents: AgentStatus[];
  completedTasks: string[];
  systemStatus: SystemStatus;
  userInterruptions: UserInterruption[];
}

export interface UserInterruption {
  id: string;
  timestamp: Date;
  type: 'direct_command' | 'new_instruction' | 'cancellation' | 'query';
  message: string;
  responseRequired: boolean;
  responded?: boolean;
}

export interface ExecutionPlan {
  prpId: string;
  worktree: string;
  branch: string;
  tasks: TaskExecution[];
  requiredAgents: string[];
  estimatedDuration: number;
  tokenBudget: number;
}

export interface TaskExecution {
  id: string;
  description: string;
  agentType: string;
  tools: string[];
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: unknown;
}

/**
 * Ephemeral Orchestrator for signal-driven agent coordination
 */
export class EphemeralOrchestrator extends EventEmitter {
  private toolRegistry: ToolRegistry;
  private _agentManager: AgentManager;
  private currentCycle: CycleContext | null = null;
  private _executionPlans: Map<string, ExecutionPlan> = new Map();
  private isRunning = false;

  constructor(toolRegistry: ToolRegistry, agentManager: AgentManager) {
    super();
    this.toolRegistry = toolRegistry;
    this._agentManager = agentManager;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for ephemeral signals
   */
  private setupEventHandlers(): void {
    ephemeralSignalSystem.on('signal_received', (signal: EphemeralSignal) => {
      this.handleSignal(signal);
    });

    // Individual signal handlers are now called from handleSignal method
  }

  /**
   * Start orchestration cycle
   */
  async startCycle(): Promise<void> {
    if (this.isRunning) {
      logger.warn('EphemeralOrchestrator', 'Cycle already running');
      return;
    }

    this.isRunning = true;
    const cycleId = HashUtils.generateId();

    this.currentCycle = {
      cycleId,
      startTime: new Date(),
      activeAgents: ephemeralSignalSystem.getCurrentStatus().activeAgents,
      completedTasks: [],
      systemStatus: ephemeralSignalSystem.getCurrentStatus(),
      userInterruptions: []
    };

    ephemeralSignalSystem.startCycle(cycleId);

    logger.info('EphemeralOrchestrator', `Started orchestration cycle ${cycleId}`);

    // Generate initial [HF] signal and start processing
    await this.processEphemeralSignal();

    this.emit('cycle_started', this.currentCycle);
  }

  /**
   * Handle ephemeral [HF] signal
   */
  private async processEphemeralSignal(): Promise<void> {
    if (!this.currentCycle) return;

    // Generate [HF] signal with current status
    const hfSignal = ephemeralSignalSystem.generateEphemeralSignal();

    // Extract priorities and task statuses from signal data
    const systemStatus = hfSignal.data as SystemStatus;
    const priorities = this.extractPriorities(systemStatus);
    const nextTask = this.selectNextTask(priorities);

    if (nextTask) {
      await this.executeTask(nextTask, systemStatus);
    } else {
      // No tasks - wait for next signal
      logger.info('orchestrator', 'No tasks to execute');
    }
  }

  /**
   * Extract priorities from system status
   */
  private extractPriorities(systemStatus: SystemStatus): TaskPriority[] {
    const priorities: TaskPriority[] = [];

    // Prioritize blocked PRPs
    systemStatus.activePRPs
      .filter(prp => prp.blockers.length > 0)
      .forEach(prp => {
        priorities.push({
          prpId: prp.id,
          priority: 100 + prp.blockers.length, // High priority for blocked
          urgency: 'critical',
          estimatedTime: 30, // 30 minutes for unblocking
          dependencies: [],
          agentRequirements: this.getRequiredAgentsForBlockers(prp.blockers)
        });
      });

    // Prioritize PRPs with active agents that are not making progress
    systemStatus.activePRPs
      .filter(prp => prp.currentAgent && !this.isMakingProgress(prp))
      .forEach(prp => {
        priorities.push({
          prpId: prp.id,
          priority: 80,
          urgency: 'high',
          estimatedTime: 60,
          dependencies: [],
          agentRequirements: [prp.currentAgent!]
        });
      });

    // Add regular PRP tasks
    systemStatus.activePRPs
      .filter(prp => prp.status === 'implementation' && !prp.currentAgent)
      .forEach(prp => {
        priorities.push({
          prpId: prp.id,
          priority: 50,
          urgency: 'medium',
          estimatedTime: 120,
          dependencies: [],
          agentRequirements: this.getAgentRequirementsForPRP(prp)
        });
      });

    // Sort by priority (highest first)
    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Select next task from priorities
   */
  private selectNextTask(priorities: TaskPriority[]): TaskPriority | null {
    if (priorities.length === 0) return null;

    // Check for resource constraints
    const availableAgents = this.getAvailableAgents();
    const tokenStatus = ephemeralSignalSystem.getCurrentStatus().resourceStatus.tokens;

    // Filter tasks that can be executed with current resources
    const executableTasks = priorities.filter(task => {
      // Check if required agents are available
      const hasAgents = task.agentRequirements.every(req =>
        availableAgents.some(agent => agent.type === req)
      );

      // Check if we have enough tokens
      const hasTokens = tokenStatus.percentage < 90;

      return hasAgents && hasTokens;
    });

    return executableTasks.length > 0 ? (executableTasks[0] ?? null) : null;
  }

  /**
   * Execute selected task
   */
  private async executeTask(task: TaskPriority, systemStatus: SystemStatus): Promise<void> {
    if (!this.currentCycle) return;

    logger.info('EphemeralOrchestrator', `Executing task for PRP ${task.prpId} with priority ${task.priority}`);

    try {
      // Step 1: Checkout to worktree
      await this.checkoutWorktree(task.prpId);

      // Step 2: Checkout to PRP-named branch
      await this.checkoutPRPBranch(task.prpId);

      // Step 3: Prepare execution prompt
      const executionPrompt = this.prepareExecutionPrompt(task, systemStatus);

      // Step 4: Select and spawn most suitable agent
      const agentType = this.selectBestAgent(task);
      const agent = await this.spawnAgent(agentType, task.prpId, executionPrompt);

      // Step 5: Await agent completion with signal monitoring
      await this.monitorAgentExecution(agent as { id: string; terminalSession?: string; pid?: number }, task.prpId);

      // Update current cycle
      this.currentCycle.currentTask = task;
      this.currentCycle.completedTasks.push(task.prpId);

      logger.info('orchestrator', `Task completed for PRP ${task.prpId}`);

    } catch (error) {
      logger.error('orchestrator', `Task execution failed for PRP ${task.prpId}`, error instanceof Error ? error : new Error(String(error)), {
        prpId: task.prpId
      });

      // Handle task failure
      await this.handleTaskFailure(task, error as Error);
    }
  }

  /**
   * Checkout to worktree
   */
  private async checkoutWorktree(prpId: string): Promise<void> {
    const worktreeTool = this.toolRegistry.getTool('worktree_checkout');
    if (!worktreeTool) {
      throw new Error('Worktree checkout tool not available');
    }

    await worktreeTool.execute({
      prpId,
      createIfMissing: true
    });

    logger.debug('EphemeralOrchestrator', `Checked out worktree for PRP ${prpId}`);
  }

  /**
   * Checkout to PRP-named branch
   */
  private async checkoutPRPBranch(prpId: string): Promise<void> {
    const gitTool = this.toolRegistry.getTool('git_checkout');
    if (!gitTool) {
      throw new Error('Git checkout tool not available');
    }

    const branchName = `prp-${prpId}`;

    await gitTool.execute({
      branch: branchName,
      create: true,
      source: 'main'
    });

    logger.debug('EphemeralOrchestrator', `Checked out branch ${branchName}`);
  }

  /**
   * Prepare execution prompt for agent
   */
  private prepareExecutionPrompt(task: TaskPriority, systemStatus: SystemStatus): string {
    return `
You are working on PRP ${task.prpId} with the following context:

CURRENT SYSTEM STATUS:
- Active agents: ${systemStatus.activeAgents.length}
- Resource usage: ${systemStatus.resourceStatus.tokens.percentage}% tokens
- System health: ${JSON.stringify(systemStatus.systemHealth)}

TASK REQUIREMENTS:
- Priority: ${task.priority} (${task.urgency})
- Estimated time: ${task.estimatedTime} minutes
- Dependencies: ${task.dependencies.join(', ')}

INSTRUCTIONS:
1. Work on the PRP ${task.prpId}
2. Follow the DoD criteria in the PRP
3. Use parallel execution when possible with sub-agents
4. Emit signals when you encounter blockers, complete milestones, or need decisions
5. Update PRP progress as you work
6. Signal when DoD criteria are met

RESOURCES:
- Available tools: ${this.toolRegistry.getAllTools().map(t => t.id).join(', ')}
- Token budget: Monitor your usage
- Sub-agent coordination: Use parallel execution when beneficial

Execute this task efficiently and report progress through signals.
`;
  }

  /**
   * Select best agent for task
   */
  private selectBestAgent(task: TaskPriority): string {
    const availableAgents = this.getAvailableAgents();

    // Match agent requirements with available agents
    for (const requirement of task.agentRequirements) {
      const matchingAgent = availableAgents.find(agent => agent.type === requirement);
      if (matchingAgent) {
        return matchingAgent.type;
      }
    }

    // Default to robo-developer for implementation tasks
    return 'robo-developer';
  }

  /**
   * Spawn agent for task
   */
  private async spawnAgent(agentType: string, prpId: string, prompt: string): Promise<unknown> {
    const spawnTool = this.toolRegistry.getTool('spawn_agent');
    if (!spawnTool) {
      throw new Error('Spawn agent tool not available');
    }

    const agent = await spawnTool.execute({
      agentType,
      prpId,
      prompt,
      worktree: `/tmp/prp-worktrees/${prpId}`,
      parallelExecution: true,
      tokenBudget: 50000
    });

    // Update agent status
    const agentResult = agent as unknown as { id: string; terminalSession?: string; pid?: number };
    ephemeralSignalSystem.updateAgentStatus(agentResult.id, {
      type: agentType,
      status: 'working',
      currentPRP: prpId,
      currentTask: `Execute task for ${prpId}`,
      terminalSession: agentResult.terminalSession,
      pid: agentResult.pid
    });

    logger.info('orchestrator', `Spawned ${agentType} agent ${agentResult.id} for PRP ${prpId}`);

    return agentResult;
  }

  /**
   * Monitor agent execution
   */
  private async monitorAgentExecution(agent: { id: string; terminalSession?: string; pid?: number }, prpId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent execution timeout for PRP ${prpId}`));
      }, 3600000); // 1 hour timeout

      // Listen for agent signals
      const signalHandler = (signal: EphemeralSignal) => {
        if (signal.source === agent.id) {
          switch (signal.type) {
            case '[Cc]': // Complete
              clearTimeout(timeout);
              ephemeralSignalSystem.updateAgentStatus(agent.id, { status: 'idle' });
              ephemeralSignalSystem.updatePRPStatus(prpId, { status: 'completed' });
              resolve();
              break;

            case '[Bb]': // Blocker
              logger.warn('orchestrator', `Agent ${agent.id} encountered blocker for PRP ${prpId}`);
              // Continue monitoring - orchestrator will handle blockers in next cycle
              break;

            case '[crash]': // Crash
              clearTimeout(timeout);
              ephemeralSignalSystem.updateAgentStatus(agent.id, { status: 'crashed' });
              reject(new Error(`Agent ${agent.id} crashed during PRP ${prpId}`));
              break;
          }
        }
      };

      ephemeralSignalSystem.on('development_signal', signalHandler);
    });
  }

  /**
   * Handle generic signal
   */
  private handleSignal(signal: EphemeralSignal): void {
    if (!this.currentCycle) return;

    logger.info('orchestrator', `Handling signal: ${signal.type}`, {
      signalId: signal.id,
      type: signal.type,
      priority: signal.priority
    });

    // Route to appropriate handler based on signal type
    switch (signal.type) {
      case 'user':
        this.handleUserSignal(signal);
        break;
      case 'emergency':
        this.handleEmergencySignal(signal);
        break;
      case 'admin':
        this.handleAdminSignal(signal);
        break;
      case 'development':
        this.handleDevelopmentSignal(signal);
        break;
      default:
        logger.warn('orchestrator', `Unknown signal type: ${signal.type}`, {
          signalId: signal.id,
          type: signal.type
        });
    }
  }

  /**
   * Handle user signal
   */
  private handleUserSignal(signal: EphemeralSignal): void {
    if (!this.currentCycle) return;

    const signalData = signal.data as { message: string };
    const interruption: UserInterruption = {
      id: HashUtils.generateId(),
      timestamp: new Date(),
      type: 'direct_command',
      message: signalData.message,
      responseRequired: false
    };

    this.currentCycle.userInterruptions.push(interruption);

    // Process user command directly
    this.processUserCommand(signalData.message);

    logger.info('orchestrator', `Processed user command: ${signalData.message}`);
  }

  /**
   * Process user command directly
   */
  private async processUserCommand(command: string): Promise<void> {
    // Parse and execute user command
    // This would involve command parsing and tool execution
    logger.debug('EphemeralOrchestrator', `Executing user command: ${command}`);
  }

  /**
   * Handle emergency signal
   */
  private handleEmergencySignal(signal: EphemeralSignal): void {
    const signalData = signal.data as { message: string };
    logger.error('orchestrator', `Emergency signal received: ${JSON.stringify(signal.data)}`);

    // Trigger immediate user notification
    this.notifyAdmin('Emergency', signalData.message, true);
  }

  /**
   * Handle admin signal
   */
  private handleAdminSignal(signal: EphemeralSignal): void {
    const signalData = signal.data as { message: string };
    logger.warn('orchestrator', `Admin signal received: ${JSON.stringify(signal.data)}`);

    // Trigger admin notification
    this.notifyAdmin('Admin Action Required', signalData.message, true);
  }

  /**
   * Handle development signal
   */
  private handleDevelopmentSignal(signal: EphemeralSignal): void {
    logger.debug('EphemeralOrchestrator', `Development signal: ${signal.type} from ${signal.source}`);

    // Update system status and continue cycle
    this.updateSystemStatusFromSignal(signal);

    // Continue orchestration cycle
    setTimeout(() => this.processEphemeralSignal(), 1000);
  }

  /**
   * Notify admin via nudge tool
   */
  private async notifyAdmin(title: string, message: string, urgent: boolean): Promise<void> {
    const nudgeTool = this.toolRegistry.getTool('send_nudge');
    if (nudgeTool) {
      await nudgeTool.execute({
        title,
        message,
        priority: urgent ? 'critical' : 'normal',
        expectsReply: urgent
      });
    }
  }

  /**
   * Update system status from signal
   */
  private updateSystemStatusFromSignal(signal: EphemeralSignal): void {
    // Update agent or PRP status based on signal
    if (signal.source.startsWith('agent_')) {
      // Update agent status
      const agentStatus = this.extractAgentStatusFromSignal(signal);
      ephemeralSignalSystem.updateAgentStatus(signal.source, agentStatus);
    }
  }

  /**
   * Helper methods
   */
  private getAvailableAgents(): AgentStatus[] {
    return ephemeralSignalSystem.getCurrentStatus().activeAgents
      .filter(agent => agent.status === 'idle');
  }

  private isMakingProgress(prp: PRPStatus): boolean {
    // Check if PRP is making progress based on last update and progress percentage
    const timeSinceUpdate = Date.now() - prp.lastUpdate.getTime();
    return timeSinceUpdate < 300000 && prp.progress > 0; // 5 minutes
  }

  private getRequiredAgentsForBlockers(blockers: string[]): string[] {
    // Analyze blockers and determine required agent types
    const agentTypes: string[] = [];

    if (blockers.some(b => b.includes('technical') || b.includes('implementation'))) {
      agentTypes.push('robo-developer');
    }

    if (blockers.some(b => b.includes('test') || b.includes('quality'))) {
      agentTypes.push('robo-aqa');
    }

    if (blockers.some(b => b.includes('analysis') || b.includes('research'))) {
      agentTypes.push('robo-system-analyst');
    }

    return agentTypes;
  }

  private getAgentRequirementsForPRP(prp: PRPStatus): string[] {
    // Determine agent requirements based on PRP status
    switch (prp.status) {
      case 'planning':
        return ['robo-system-analyst'];
      case 'implementation':
        return ['robo-developer'];
      case 'testing':
        return ['robo-aqa'];
      case 'review':
        return ['robo-system-analyst', 'robo-aqa'];
      default:
        return ['robo-developer'];
    }
  }

  private extractAgentStatusFromSignal(signal: EphemeralSignal): Partial<AgentStatus> {
    // Extract agent status information from signal data
    return {
      lastActivity: signal.timestamp,
      // Add more status extraction logic based on signal type
    };
  }

  private async handleTaskFailure(task: TaskPriority, error: Error): Promise<void> {
    // Handle task failure - update PRP status, notify if needed
    ephemeralSignalSystem.updatePRPStatus(task.prpId, {
      status: 'blocked',
      blockers: [`Task execution failed: ${error.message}`]
    });

    // Consider admin notification for critical failures
    if (task.urgency === 'critical') {
      await this.notifyAdmin('Task Failure',
        `Critical task failed for PRP ${task.prpId}: ${error.message}`, true);
    }
  }

  /**
   * Stop orchestration cycle
   */
  async stopCycle(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.currentCycle) {
      const cycleId = this.currentCycle.cycleId;
      ephemeralSignalSystem.endCycle(cycleId);

      this.emit('cycle_ended', this.currentCycle);
      this.currentCycle = null;
    }

    logger.info('EphemeralOrchestrator', 'Orchestration cycle stopped');
  }

  /**
   * Get current cycle context
   */
  getCurrentCycle(): CycleContext | null {
    return this.currentCycle;
  }

  /**
   * Check if orchestrator is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get agent manager
   */
  getAgentManager(): AgentManager {
    return this._agentManager;
  }

  /**
   * Get execution plans
   */
  getExecutionPlans(): Map<string, ExecutionPlan> {
    return this._executionPlans;
  }
}