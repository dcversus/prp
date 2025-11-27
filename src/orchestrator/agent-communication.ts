/**
 * ♫ Enhanced Agent Communication System for @dcversus/prp Orchestrator
 *
 * Multi-pattern agent communication with:
 * - Communication patterns: Broadcast, Direct, Topic-based, Request-response
 * - Message queuing, retry, and persistence
 * - Capability-based routing
 * - Communication metrics and monitoring
 * - Communication protocols for different interaction types
 */
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';


import { createLayerLogger, HashUtils } from '../shared';

import type { OrchestratorConfig, AgentTask, AgentSession } from './types';
import type { AgentRole, AgentCapabilities } from '../shared/types';

const logger = createLayerLogger('orchestrator');
export interface AgentMessage {
  id: string;
  from: string; // orchestrator or agent id
  to: string; // agent id or role
  type: 'task_assignment' | 'request' | 'response' | 'notification' | 'escalation';
  priority: number;
  subject: string;
  content: string;
  instructions?: string;
  context?: Record<string, unknown>;
  tools?: string[];
  deadline?: Date;
  subAgents?: SubAgentConfig[];
  worktree?: WorktreeConfig;
  metadata: {
    timestamp: Date;
    threadId?: string;
    replyTo?: string;
    correlationId: string;
    protocol?: string;
    topic?: string;
  };
}
export interface SubAgentConfig {
  id: string;
  role: AgentRole;
  task: string;
  instructions: string;
  context: Record<string, unknown>;
  dependencies: string[]; // Other sub-agent IDs this depends on
  parallel: boolean;
}
export interface WorktreeConfig {
  path: string;
  branch?: string;
  files?: string[];
  readOnly?: boolean;
  cleanupAfter?: boolean;
}
export interface AgentCommunicationStats {
  totalMessages: number;
  messagesByType: Record<string, number>;
  messagesByAgent: Record<string, number>;
  averageResponseTime: number;
  activeSubAgents: number;
  parallelExecutions: number;
  failedMessages: number;
  queueSize: number;
}
export interface MessageDeliveryResult {
  success: boolean;
  messageId: string;
  agentId: string;
  deliveredAt?: Date;
  response?: unknown;
  error?: string;
  executionTime: number;
  tokenUsage?: number;
}
// Communication Patterns
export type CommunicationPattern = 'broadcast' | 'direct' | 'topic' | 'request_response';
export interface MessageTopic {
  name: string;
  subscribers: Set<string>;
  persistMessages: boolean;
  maxSubscribers?: number;
}
export interface QueuedMessage {
  message: AgentMessage;
  attempts: number;
  maxAttempts: number;
  nextRetryTime: Date;
  priority: number;
  pattern: CommunicationPattern;
  originalRecipients: string[];
}
export interface MessageRoutingInfo {
  targetAgents: string[];
  routingStrategy: 'role_based' | 'capability_based' | 'load_balanced' | 'priority_based';
  estimatedDeliveryTime: number;
  requiresPersistence: boolean;
}
// Communication Protocols
export interface TaskAssignmentProtocol {
  protocol: 'task_assignment';
  taskId: string;
  assignedAgent: string;
  taskType: string;
  deadline: Date;
  dependencies: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiredCapabilities: string[];
}
export interface StatusUpdateProtocol {
  protocol: 'status_update';
  agentId: string;
  taskId?: string;
  status: 'idle' | 'busy' | 'error' | 'completed' | 'blocked';
  progress: number;
  details?: Record<string, unknown>;
  blockedReason?: string;
}
export interface CollaborationRequestProtocol {
  protocol: 'collaboration_request';
  requestingAgent: string;
  targetAgents: string[];
  collaborationType: 'review' | 'assistance' | 'coordination' | 'validation';
  taskDescription: string;
  urgency: 'low' | 'medium' | 'high';
  expectedDuration?: number;
}
export interface EmergencyStopProtocol {
  protocol: 'emergency_stop';
  reason: string;
  affectedAgents: string[];
  stopType: 'pause' | 'terminate' | 'abort';
  initiatedBy: string;
  timestamp: Date;
}
// Enhanced Communication Stats
export interface EnhancedCommunicationStats extends AgentCommunicationStats {
  patterns: {
    broadcast: number;
    direct: number;
    topic: number;
    request_response: number;
  };
  queueMetrics: {
    queueSize: number;
    averageQueueTime: number;
    retryRate: number;
    droppedMessages: number;
  };
  topicMetrics: Record<
    string,
    {
      subscriberCount: number;
      messageCount: number;
      lastActivity: Date;
    }
  >;
  routingMetrics: {
    averageRoutingTime: number;
    routingSuccessRate: number;
    capabilityMatches: number;
  };
  persistenceMetrics: {
    persistedMessages: number;
    retrievalSuccess: number;
    storageSize: number;
  };
}
// Message Persistence
export interface MessagePersistenceConfig {
  enabled: boolean;
  storagePath: string;
  maxFileSize: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  retentionPeriod: number; // days
}
// Agent Capability Matching
export interface CapabilityMatch {
  agentId: string;
  matchScore: number;
  matchedCapabilities: string[];
  missingCapabilities: string[];
  currentLoad: number;
}
/**
 * Enhanced Agent Communication System
 */
export class AgentCommunication extends EventEmitter {
  private readonly activeAgents = new Map<string, AgentSession>();
  private readonly subAgents = new Map<string, AgentSession>();
  private readonly worktrees = new Map<string, WorktreeConfig>();
  private readonly messageThreads = new Map<string, AgentMessage[]>();
  // Enhanced communication features
  private readonly messageQueue: QueuedMessage[] = [];
  private readonly topics = new Map<string, MessageTopic>();
  private readonly pendingRequests = new Map<
    string,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  >();
  private readonly persistenceConfig: MessagePersistenceConfig;
  private readonly enhancedStats: EnhancedCommunicationStats = {
    totalMessages: 0,
    messagesByType: {},
    messagesByAgent: {},
    averageResponseTime: 0,
    activeSubAgents: 0,
    parallelExecutions: 0,
    failedMessages: 0,
    queueSize: 0,
    patterns: {
      broadcast: 0,
      direct: 0,
      topic: 0,
      request_response: 0,
    },
    queueMetrics: {
      queueSize: 0,
      averageQueueTime: 0,
      retryRate: 0,
      droppedMessages: 0,
    },
    topicMetrics: {},
    routingMetrics: {
      averageRoutingTime: 0,
      routingSuccessRate: 0,
      capabilityMatches: 0,
    },
    persistenceMetrics: {
      persistedMessages: 0,
      retrievalSuccess: 0,
      storageSize: 0,
    },
  };
  private retryTimer: NodeJS.Timeout | null = null;
  private isProcessingQueue = false;
  constructor(config: OrchestratorConfig, persistenceConfig?: Partial<MessagePersistenceConfig>) {
    super();
    // Initialize persistence configuration
    this.persistenceConfig = {
      enabled: persistenceConfig?.enabled ?? false,
      storagePath: persistenceConfig?.storagePath ?? './data/communication',
      maxFileSize: persistenceConfig?.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      compressionEnabled: persistenceConfig?.compressionEnabled ?? true,
      encryptionEnabled: persistenceConfig?.encryptionEnabled ?? false,
      retentionPeriod: persistenceConfig?.retentionPeriod ?? 30, // 30 days
    };
    // Initialize storage if persistence is enabled
    if (this.persistenceConfig.enabled) {
      this.initializePersistence();
    }
    // Start queue processing
    this.startQueueProcessor();
    // Set up default topics
    this.initializeDefaultTopics();
  }
  /**
   * Register an agent with the communication system
   */
  registerAgent(agentSession: AgentSession): void {
    this.activeAgents.set(agentSession.id, agentSession);
    this.enhancedStats.messagesByAgent[agentSession.id] = 0;
    logger.info('registerAgent', 'Agent registered', {
      agentId: agentSession.id,
      agentType: agentSession.agentConfig.type,
      role: agentSession.agentConfig.role,
    });
    this.emit('agent_registered', { agentId: agentSession.id, agentSession });
  }
  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      this.activeAgents.delete(agentId);
      this.enhancedStats.messagesByAgent[agentId] = 0;
      logger.info('unregisterAgent', 'Agent unregistered', { agentId });
      this.emit('agent_unregistered', { agentId, agent });
    }
  }
  // Communication Pattern Methods
  /**
   * Send broadcast message to all active agents
   */
  async broadcastMessage(message: Omit<AgentMessage, 'to'>): Promise<MessageDeliveryResult[]> {
    const agentIds = Array.from(this.activeAgents.keys());
    const results: MessageDeliveryResult[] = [];
    logger.info('broadcastMessage', 'Broadcasting message', {
      messageId: message.id,
      recipientCount: agentIds.length,
    });
    for (const agentId of agentIds) {
      const agentMessage: AgentMessage = { ...message, to: agentId };
      const result = await this.sendMessageWithPattern(agentMessage, 'broadcast');
      results.push(...result);
    }
    this.enhancedStats.patterns.broadcast++;
    return results;
  }
  /**
   * Send direct message to specific agent
   */
  async sendDirectMessage(message: AgentMessage): Promise<MessageDeliveryResult[]> {
    logger.info('sendDirectMessage', 'Sending direct message', {
      messageId: message.id,
      to: message.to,
    });
    this.enhancedStats.patterns.direct++;
    return this.sendMessageWithPattern(message, 'direct');
  }
  /**
   * Publish message to topic
   */
  async publishToTopic(
    topicName: string,
    message: Omit<AgentMessage, 'to'>,
  ): Promise<MessageDeliveryResult[]> {
    const topic = this.topics.get(topicName);
    if (!topic) {
      throw new Error(`Topic not found: ${topicName}`);
    }
    const subscriberIds = Array.from(topic.subscribers);
    const results: MessageDeliveryResult[] = [];
    logger.info('publishToTopic', 'Publishing to topic', {
      messageId: message.id,
      topic: topicName,
      subscriberCount: subscriberIds.length,
    });
    // Update topic metrics
    this.enhancedStats.topicMetrics[topicName] = {
      subscriberCount: subscriberIds.length,
      messageCount: (this.enhancedStats.topicMetrics[topicName]?.messageCount || 0) + 1,
      lastActivity: new Date(),
    };
    for (const subscriberId of subscriberIds) {
      const agentMessage: AgentMessage = { ...message, to: subscriberId };
      const result = await this.sendMessageWithPattern(agentMessage, 'topic');
      results.push(...result);
    }
    this.enhancedStats.patterns.topic++;
    // Persist message if topic requires it
    if (topic.persistMessages && this.persistenceConfig.enabled) {
      await this.persistMessage({
        ...message,
        to: topicName,
        metadata: { ...message.metadata },
      });
    }
    return results;
  }
  /**
   * Send request-response message with timeout
   */
  async sendRequest(
    message: AgentMessage,
    timeoutMs = 30000,
  ): Promise<MessageDeliveryResult & { response: unknown }> {
    const requestId = message.metadata.correlationId || message.id;
    logger.info('sendRequest', 'Sending request', {
      messageId: message.id,
      requestId,
      timeout: timeoutMs,
    });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${requestId}`));
      }, timeoutMs);
      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      this.sendMessageWithPattern(message, 'request_response')
        .then((results) => {
          const successResult = results.find((r) => r.success);
          if (!successResult) {
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);
            reject(new Error('Request delivery failed'));
          }
          // Response will be handled by handleResponse method
        })
        .catch((error) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(error);
        });
    });
  }
  /**
   * Handle response for request-response pattern
   */
  async handleResponse(responseMessage: AgentMessage): Promise<void> {
    const correlationId =
      responseMessage.metadata.correlationId || responseMessage.metadata.replyTo;
    if (!correlationId) {
      logger.warn('handleResponse', 'Response missing correlation ID', {
        messageId: responseMessage.id,
      });
      return;
    }
    const pendingRequest = this.pendingRequests.get(correlationId);
    if (!pendingRequest) {
      logger.warn('handleResponse', 'No pending request found', {
        correlationId,
        messageId: responseMessage.id,
      });
      return;
    }
    clearTimeout(pendingRequest.timeout);
    this.pendingRequests.delete(correlationId);
    const result: MessageDeliveryResult & { response: unknown } = {
      success: true,
      messageId: responseMessage.id,
      agentId: responseMessage.from,
      deliveredAt: new Date(),
      response: responseMessage.content,
      executionTime: 0,
    };
    pendingRequest.resolve(result);
    this.enhancedStats.patterns.request_response++;
  }
  /**
   * Subscribe to topic
   */
  subscribeToTopic(topicName: string, agentId: string): void {
    let topic = this.topics.get(topicName);
    if (!topic) {
      topic = {
        name: topicName,
        subscribers: new Set(),
        persistMessages: false,
        maxSubscribers: 100,
      };
      this.topics.set(topicName, topic);
    }
    if (topic.maxSubscribers && topic.subscribers.size >= topic.maxSubscribers) {
      throw new Error(`Topic ${topicName} has reached maximum subscribers`);
    }
    topic.subscribers.add(agentId);
    logger.info('subscribeToTopic', 'Agent subscribed to topic', {
      topicName,
      agentId,
      subscriberCount: topic.subscribers.size,
    });
    this.emit('topic_subscribed', { topicName, agentId });
  }
  /**
   * Unsubscribe from topic
   */
  unsubscribeFromTopic(topicName: string, agentId: string): void {
    const topic = this.topics.get(topicName);
    if (!topic) {
      return;
    }
    topic.subscribers.delete(agentId);
    logger.info('unsubscribeFromTopic', 'Agent unsubscribed from topic', {
      topicName,
      agentId,
      subscriberCount: topic.subscribers.size,
    });
    // Clean up empty topics
    if (topic.subscribers.size === 0) {
      this.topics.delete(topicName);
    }
    this.emit('topic_unsubscribed', { topicName, agentId });
  }
  /**
   * Send message to agent with sub-agent support
   */
  async sendMessage(message: AgentMessage): Promise<MessageDeliveryResult[]> {
    const startTime = Date.now();
    const results: MessageDeliveryResult[] = [];
    try {
      logger.info('sendMessage', 'Sending message', {
        messageId: message.id,
        type: message.type,
        to: message.to,
        priority: message.priority,
      });
      // Add to message thread if this is a reply
      if (message.metadata.replyTo || message.metadata.threadId) {
        const threadId = message.metadata.threadId || message.metadata.replyTo;
        if (threadId) {
          if (!this.messageThreads.has(threadId)) {
            this.messageThreads.set(threadId, []);
          }
          this.messageThreads.get(threadId)!.push(message);
        }
      } else {
        // Start new thread
        this.messageThreads.set(message.id, [message]);
        message.metadata.threadId = message.id;
      }
      // Handle sub-agent dispatch
      if (message.subAgents && message.subAgents.length > 0) {
        const subAgentResults = await this.dispatchSubAgents(message);
        results.push(...subAgentResults);
      }
      // Handle primary agent dispatch
      const primaryResult = await this.dispatchToPrimaryAgent(message);
      results.push(primaryResult);
      // Update statistics
      this.updateStats(message, results, Date.now() - startTime);
      this.emit('message_sent', {
        messageId: message.id,
        results,
        executionTime: Date.now() - startTime,
      });
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        messageId: message.id,
        error: errorMessage,
      };
      logger.error('sendMessage', 'Message sending failed', new Error(errorMessage), errorDetails);
      const errorResult: MessageDeliveryResult = {
        success: false,
        messageId: message.id,
        agentId: message.to,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      };
      this.enhancedStats.failedMessages++;
      return [errorResult];
    }
  }
  /**
   * Dispatch message to primary agent
   */
  private async dispatchToPrimaryAgent(message: AgentMessage): Promise<MessageDeliveryResult> {
    const startTime = Date.now();
    const agent = this.findAgent(message.to);
    if (!agent) {
      return {
        success: false,
        messageId: message.id,
        agentId: message.to,
        error: `Agent not found: ${message.to}`,
        executionTime: Date.now() - startTime,
      };
    }
    try {
      // Prepare worktree if specified
      let worktreePath: string | undefined;
      if (message.worktree) {
        worktreePath = await this.prepareWorktree(message.worktree);
      }
      // Adapt instructions based on agent role
      const adaptedInstructions = this.adaptInstructionsForRole(
        message.instructions || message.content,
        agent.agentConfig.role,
      );
      // Create task for agent
      const task: AgentTask = {
        id: message.id,
        type: message.type,
        description: message.subject,
        priority: message.priority,
        payload: {
          ...message.context,
          instructions: adaptedInstructions,
          worktree: worktreePath,
          ...(message.tools && { tools: message.tools }),
          ...(message.metadata.threadId && { threadId: message.metadata.threadId }),
        },
        assignedAt: new Date(),
        ...(message.deadline && { deadline: message.deadline }),
        dependencies: [],
        status: 'pending',
      };
      // Execute task based on agent implementation
      const result = await this.executeAgentTask(agent, task);
      return {
        success: true,
        messageId: message.id,
        agentId: agent.id,
        deliveredAt: new Date(),
        response: result,
        executionTime: Date.now() - startTime,
        ...(task.tokenUsage?.total && {
          tokenUsage: task.tokenUsage.total,
        }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        agentId: agent.id,
        error: errorMessage,
      };
      logger.error(
        'dispatchToPrimaryAgent',
        'Agent task execution failed',
        new Error(errorMessage),
        errorDetails,
      );
      return {
        success: false,
        messageId: message.id,
        agentId: agent.id,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      };
    }
  }
  /**
   * Dispatch sub-agents for parallel execution
   */
  private async dispatchSubAgents(message: AgentMessage): Promise<MessageDeliveryResult[]> {
    const results: MessageDeliveryResult[] = [];
    const subAgentConfigs = message.subAgents || [];
    if (subAgentConfigs.length === 0) {
      return results;
    }
    logger.info('dispatchSubAgents', 'Dispatching sub-agents', {
      messageId: message.id,
      subAgentCount: subAgentConfigs.length,
    });
    // Create sub-agent sessions
    const subAgentSessions: AgentSession[] = [];
    for (const config of subAgentConfigs) {
      const subAgent = await this.createSubAgent(config, message);
      if (subAgent) {
        subAgentSessions.push(subAgent);
        this.subAgents.set(config.id, subAgent);
      }
    }
    // Group sub-agents by parallel execution
    const parallelGroups = this.groupSubAgentsByParallel(subAgentConfigs);
    // Execute groups sequentially, agents within groups in parallel
    let totalExecutionTime = 0;
    for (const group of parallelGroups) {
      const groupStartTime = Date.now();
      const groupPromises = group.map((config) => {
        const subAgent = subAgentSessions.find((sa) => sa.id === config.id);
        if (!subAgent) {
          return Promise.resolve(null);
        }
        const subMessage: AgentMessage = {
          id: HashUtils.generateId(),
          from: message.from,
          to: config.id,
          type: 'task_assignment',
          priority: message.priority,
          subject: config.task,
          content: config.task,
          instructions: config.instructions,
          context: {
            ...config.context,
            parentMessageId: message.id,
            parentCorrelationId: message.metadata.correlationId,
          },
          worktree: message.worktree,
          metadata: {
            timestamp: new Date(),
            ...(message.metadata.threadId && { threadId: message.metadata.threadId }),
            correlationId: message.metadata.correlationId,
          },
        };
        return this.dispatchToPrimaryAgent(subMessage);
      });
      const groupResults = await Promise.all(groupPromises);
      results.push(...groupResults.filter((r) => r !== null));
      totalExecutionTime += Date.now() - groupStartTime;
    }
    // Cleanup sub-agents
    for (const subAgent of subAgentSessions) {
      this.subAgents.delete(subAgent.id);
      await this.cleanupSubAgent(subAgent);
    }
    this.enhancedStats.parallelExecutions++;
    return results;
  }
  /**
   * Create sub-agent session
   */
  private async createSubAgent(
    config: SubAgentConfig,
    parentMessage: AgentMessage,
  ): Promise<AgentSession | null> {
    try {
      // Find base agent configuration for this role
      const baseAgent = Array.from(this.activeAgents.values()).find(
        (agent) => agent.agentConfig.role === config.role,
      );
      if (!baseAgent) {
        logger.warn('createSubAgent', 'No base agent found for role', { role: config.role });
        return null;
      }
      // Create sub-agent session
      const subAgentSession: AgentSession = {
        id: config.id,
        agentId: config.id,
        agentConfig: {
          ...baseAgent.agentConfig,
          name: `${baseAgent.agentConfig.name} (sub-agent)`,
          type: 'custom' as const,
        },
        status: 'idle',
        lastActivity: new Date(),
        tokenUsage: {
          total: 0,
          cost: 0,
          lastUpdated: new Date(),
        },
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 0,
          errorCount: 0,
        },
        capabilities: baseAgent.capabilities,
      };
      logger.info('createSubAgent', 'Sub-agent created', {
        subAgentId: config.id,
        role: config.role,
        parentMessageId: parentMessage.id,
      });
      return subAgentSession;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        subAgentId: config.id,
        error: errorMessage,
      };
      logger.error(
        'createSubAgent',
        'Failed to create sub-agent',
        new Error(errorMessage),
        errorDetails,
      );
      return null;
    }
  }
  /**
   * Cleanup sub-agent session
   */
  private async cleanupSubAgent(subAgent: AgentSession): Promise<void> {
    try {
      // Any cleanup needed for sub-agent
      logger.info('cleanupSubAgent', 'Sub-agent cleaned up', {
        subAgentId: subAgent.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        subAgentId: subAgent.id,
        error: errorMessage,
      };
      logger.error(
        'cleanupSubAgent',
        'Failed to cleanup sub-agent',
        new Error(errorMessage),
        errorDetails,
      );
    }
  }
  /**
   * Group sub-agents by parallel execution
   */
  private groupSubAgentsByParallel(subAgents: SubAgentConfig[]): SubAgentConfig[][] {
    const groups: SubAgentConfig[][] = [];
    const processed = new Set<string>();
    // Find agents that can run in parallel (no dependencies)
    const parallelGroup = subAgents.filter((config) => {
      if (processed.has(config.id)) {
        return false;
      }
      const hasDependencies = config.dependencies.length > 0;
      if (!hasDependencies && config.parallel) {
        processed.add(config.id);
        return true;
      }
      return false;
    });
    if (parallelGroup.length > 0) {
      groups.push(parallelGroup);
    }
    // Process remaining agents with dependencies sequentially
    for (const config of subAgents) {
      if (!processed.has(config.id)) {
        groups.push([config]);
        processed.add(config.id);
      }
    }
    return groups;
  }
  /**
   * Adapt instructions based on agent role
   */
  private adaptInstructionsForRole(instructions: string, role: AgentRole): string {
    const roleAdaptations: Record<AgentRole, string> = {
      'robo-system-analyst': `As a System Analyst, focus on requirements analysis, research, and goal clarification.\n\n${instructions}`,
      'robo-developer': `As a Developer, focus on implementation, code quality, and technical solutions.\n\n${instructions}`,
      'robo-aqa': `As QA, focus on testing, quality assurance, and validation.\n\n${instructions}`,
      'robo-security-expert': `As Security Expert, focus on security analysis, vulnerabilities, and compliance.\n\n${instructions}`,
      'robo-performance-engineer': `As Performance Engineer, focus on optimization, metrics, and efficiency.\n\n${instructions}`,
      'robo-ui-designer': `As UI Designer, focus on user interface, design patterns, and usability.\n\n${instructions}`,
      'robo-devops': `As DevOps, focus on infrastructure, deployment, and operations.\n\n${instructions}`,
      'robo-documenter': `As Documenter, focus on documentation, knowledge management, and clarity.\n\n${instructions}`,
      'orchestrator-agent': `As Orchestrator Agent, focus on coordination, workflow management, and decision making.\n\n${instructions}`,
      'task-agent': `As Task Agent, focus on task execution, delivery, and results.\n\n${instructions}`,
      'specialist-agent': `As Specialist Agent, focus on domain expertise and specialized solutions.\n\n${instructions}`,
      conductor: `As Conductor, focus on orchestration, harmony, and system coordination.\n\n${instructions}`,
    };
    return roleAdaptations[role] || instructions;
  }
  /**
   * Find agent by ID or role
   */
  private findAgent(identifier: string): AgentSession | null {
    // Try to find by ID first
    let agent = this.activeAgents.get(identifier);
    // If not found, try to find by role
    if (!agent) {
      agent = Array.from(this.activeAgents.values()).find((a) => a.agentConfig.role === identifier);
    }
    return agent ?? null;
  }
  /**
   * Prepare worktree for agent
   */
  private async prepareWorktree(config: WorktreeConfig): Promise<string> {
    const worktreeId = HashUtils.generateId();
    this.worktrees.set(worktreeId, config);
    logger.info('prepareWorktree', 'Worktree prepared', {
      worktreeId,
      path: config.path,
      branch: config.branch,
      files: config.files?.length || 0,
    });
    // In a real implementation, this would create/checkout the worktree
    // For now, return the path
    return config.path;
  }
  /**
   * Execute agent task
   */
  private async executeAgentTask(agent: AgentSession, task: AgentTask): Promise<unknown> {
    // Update agent status
    agent.status = 'busy';
    agent.currentTask = task;
    agent.lastActivity = new Date();
    try {
      // This would integrate with the actual agent execution system
      // For now, simulate task execution
      logger.info('executeAgentTask', 'Executing agent task', {
        agentId: agent.id,
        taskId: task.id,
        taskType: task.type,
      });
      // Simulate task execution time
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Update agent performance metrics
      agent.performance.tasksCompleted++;
      agent.status = 'idle';
      delete agent.currentTask;
      return {
        taskId: task.id,
        status: 'completed',
        result: `Task ${task.description} completed by ${agent.agentConfig.name}`,
        timestamp: new Date(),
      };
    } catch (error) {
      agent.performance.errorCount++;
      agent.status = 'error';
      throw error;
    }
  }
  /**
   * Update communication statistics
   */
  private updateStats(
    message: AgentMessage,
    results: MessageDeliveryResult[],
    executionTime: number,
  ): void {
    this.enhancedStats.totalMessages++;
    this.enhancedStats.messagesByType[message.type] =
      (this.enhancedStats.messagesByType[message.type] || 0) + 1;
    this.enhancedStats.messagesByAgent[message.to] =
      (this.enhancedStats.messagesByAgent[message.to] || 0) + 1;
    // Update average response time
    const totalTime =
      this.enhancedStats.averageResponseTime * (this.enhancedStats.totalMessages - 1) +
      executionTime;
    this.enhancedStats.averageResponseTime = totalTime / this.enhancedStats.totalMessages;
    // Count failed messages
    const failedCount = results.filter((r) => !r.success).length;
    this.enhancedStats.failedMessages += failedCount;
  }
  // Enhanced Communication Helper Methods
  /**
   * Send message with communication pattern
   */
  private async sendMessageWithPattern(
    message: AgentMessage,
    pattern: CommunicationPattern,
  ): Promise<MessageDeliveryResult[]> {
    const routingInfo = await this.routeMessage(message, pattern);
    if (routingInfo.requiresPersistence && this.persistenceConfig.enabled) {
      await this.persistMessage(message);
    }
    return this.sendMessage(message);
  }
  /**
   * Route message based on pattern and agent capabilities
   */
  private async routeMessage(
    message: AgentMessage,
    pattern: CommunicationPattern,
  ): Promise<MessageRoutingInfo> {
    const startTime = Date.now();
    let targetAgents: string[] = [];
    let routingStrategy: MessageRoutingInfo['routingStrategy'] = 'role_based';
    switch (pattern) {
      case 'broadcast':
        targetAgents = Array.from(this.activeAgents.keys());
        routingStrategy = 'load_balanced';
        break;
      case 'direct':
        targetAgents = [message.to];
        routingStrategy = 'priority_based';
        break;
      case 'topic':
        const topic = this.topics.get(message.to);
        if (topic) {
          targetAgents = Array.from(topic.subscribers);
        }
        routingStrategy = 'capability_based';
        break;
      case 'request_response':
        targetAgents = [message.to];
        routingStrategy = 'priority_based';
        break;
    }
    // Apply capability-based routing if needed
    if (message.context?.requiredCapabilities) {
      targetAgents = await this.filterAgentsByCapabilities(
        targetAgents,
        message.context.requiredCapabilities as string[],
      );
      routingStrategy = 'capability_based';
    }
    const routingTime = Date.now() - startTime;
    // Update routing metrics
    this.enhancedStats.routingMetrics.averageRoutingTime =
      (this.enhancedStats.routingMetrics.averageRoutingTime + routingTime) / 2;
    this.enhancedStats.routingMetrics.routingSuccessRate =
      targetAgents.length > 0
        ? (this.enhancedStats.routingMetrics.routingSuccessRate + 100) / 2
        : (this.enhancedStats.routingMetrics.routingSuccessRate + 0) / 2;
    return {
      targetAgents,
      routingStrategy,
      estimatedDeliveryTime: routingTime + 1000, // Base delivery time
      requiresPersistence: message.priority > 8 || pattern === 'topic',
    };
  }
  /**
   * Filter agents by capabilities
   */
  private async filterAgentsByCapabilities(
    agentIds: string[],
    requiredCapabilities: string[],
  ): Promise<string[]> {
    const capableAgents: string[] = [];
    for (const agentId of agentIds) {
      const agent = this.activeAgents.get(agentId);
      if (!agent) {
        continue;
      }
      const match = this.calculateCapabilityMatch(agent, requiredCapabilities);
      if (match.matchScore > 0.5) {
        // 50% capability match threshold
        capableAgents.push(agentId);
        this.enhancedStats.routingMetrics.capabilityMatches++;
      }
    }
    return capableAgents;
  }
  /**
   * Calculate capability match score
   */
  private calculateCapabilityMatch(
    agent: AgentSession,
    requiredCapabilities: string[],
  ): CapabilityMatch {
    const agentCapabilities = agent.capabilities;
    const matchedCapabilities: string[] = [];
    const missingCapabilities: string[] = [];
    for (const capability of requiredCapabilities) {
      if (this.hasCapability(agentCapabilities as any, capability)) {
        matchedCapabilities.push(capability);
      } else {
        missingCapabilities.push(capability);
      }
    }
    const matchScore =
      requiredCapabilities.length > 0
        ? matchedCapabilities.length / requiredCapabilities.length
        : 1;
    return {
      agentId: agent.id,
      matchScore,
      matchedCapabilities,
      missingCapabilities,
      currentLoad: agent.performance?.tasksCompleted || 0,
    };
  }

  /**
   * Check if agent has a specific capability
   */
  private hasCapability(capabilities: AgentCapabilities, capability: string): boolean {
    // Handle boolean capabilities
    if (typeof (capabilities as any)[capability] === 'boolean') {
      return (capabilities as any)[capability];
    }
    // Handle array capabilities
    if (Array.isArray((capabilities as any)[capability])) {
      return (capabilities as any)[capability].length > 0;
    }
    // Handle other capability types
    return (
      (capabilities as any)[capability] !== undefined && (capabilities as any)[capability] !== null
    );
  }
  /**
   * Queue message for retry
   */
  private async queueMessage(
    message: AgentMessage,
    pattern: CommunicationPattern,
    originalRecipients: string[],
    maxAttempts = 3,
  ): Promise<void> {
    const queuedMessage: QueuedMessage = {
      message,
      attempts: 0,
      maxAttempts,
      nextRetryTime: new Date(Date.now() + 1000), // 1 second from now
      priority: message.priority,
      pattern,
      originalRecipients,
    };
    this.messageQueue.push(queuedMessage);
    this.messageQueue.sort((a, b) => b.priority - a.priority); // Sort by priority (high first)
    this.enhancedStats.queueMetrics.queueSize = this.messageQueue.length;
    this.enhancedStats.queueSize = this.messageQueue.length;
    logger.info('queueMessage', 'Message queued for retry', {
      messageId: message.id,
      priority: message.priority,
      queueSize: this.messageQueue.length,
    });
  }
  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    if (this.retryTimer) {
      return;
    }
    this.retryTimer = setInterval(async () => {
      if (this.isProcessingQueue || this.messageQueue.length === 0) {
        return;
      }
      this.isProcessingQueue = true;
      try {
        await this.processMessageQueue();
      } catch (error) {
        logger.error('startQueueProcessor', 'Queue processing error', error as Error);
      } finally {
        this.isProcessingQueue = false;
      }
    }, 1000); // Process every second
  }
  /**
   * Process message queue
   */
  private async processMessageQueue(): Promise<void> {
    const now = new Date();
    const messagesToProcess: QueuedMessage[] = [];
    // Find messages ready for retry
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue[0];
      if (message && message.nextRetryTime <= now) {
        messagesToProcess.push(this.messageQueue.shift()!);
      } else {
        break;
      }
    }
    for (const queuedMessage of messagesToProcess) {
      queuedMessage.attempts++;
      try {
        const results = await this.sendMessageWithPattern(
          queuedMessage.message,
          queuedMessage.pattern,
        );
        const successCount = results.filter((r) => r.success).length;
        if (successCount > 0 || queuedMessage.attempts >= queuedMessage.maxAttempts) {
          // Message succeeded or max attempts reached
          if (queuedMessage.attempts >= queuedMessage.maxAttempts) {
            this.enhancedStats.queueMetrics.droppedMessages++;
            logger.warn('processMessageQueue', 'Message dropped after max retries', {
              messageId: queuedMessage.message.id,
              attempts: queuedMessage.attempts,
            });
          } else {
            this.enhancedStats.queueMetrics.retryRate =
              (this.enhancedStats.queueMetrics.retryRate + (queuedMessage.attempts - 1)) / 2;
          }
        } else {
          // Queue for retry
          queuedMessage.nextRetryTime = new Date(
            Date.now() + Math.pow(2, queuedMessage.attempts) * 1000, // Exponential backoff
          );
          this.messageQueue.push(queuedMessage);
        }
      } catch (error) {
        if (queuedMessage.attempts < queuedMessage.maxAttempts) {
          queuedMessage.nextRetryTime = new Date(
            Date.now() + Math.pow(2, queuedMessage.attempts) * 1000,
          );
          this.messageQueue.push(queuedMessage);
        } else {
          this.enhancedStats.queueMetrics.droppedMessages++;
        }
      }
    }
    this.enhancedStats.queueMetrics.queueSize = this.messageQueue.length;
    this.enhancedStats.queueSize = this.messageQueue.length;
  }
  /**
   * Initialize persistence
   */
  private async initializePersistence(): Promise<void> {
    try {
      await fs.mkdir(this.persistenceConfig.storagePath, { recursive: true });
      logger.info('initializePersistence', 'Persistence storage initialized', {
        path: this.persistenceConfig.storagePath,
      });
    } catch (error) {
      logger.error('initializePersistence', 'Failed to initialize persistence', error as Error);
      this.persistenceConfig.enabled = false;
    }
  }
  /**
   * Persist message
   */
  private async persistMessage(message: AgentMessage): Promise<void> {
    if (!this.persistenceConfig.enabled) {
      return;
    }
    try {
      const fileName = `message_${message.id}_${Date.now()}.json`;
      const filePath = path.join(this.persistenceConfig.storagePath, fileName);
      const messageData = JSON.stringify(message, null, 2);
      await fs.writeFile(filePath, messageData, 'utf-8');
      this.enhancedStats.persistenceMetrics.persistedMessages++;
      this.enhancedStats.persistenceMetrics.storageSize += messageData.length;
      logger.debug('persistMessage', 'Message persisted', {
        messageId: message.id,
        filePath,
      });
    } catch (error) {
      logger.error('persistMessage', 'Failed to persist message', error as Error);
    }
  }
  /**
   * Initialize default topics
   */
  private initializeDefaultTopics(): void {
    const defaultTopics = [
      { name: 'status_updates', persistMessages: true },
      { name: 'alerts', persistMessages: true },
      { name: 'collaboration', persistMessages: false },
      { name: 'emergency', persistMessages: true, maxSubscribers: 50 },
      { name: 'performance', persistMessages: false },
      { name: 'announcements', persistMessages: true },
    ];
    for (const topicConfig of defaultTopics) {
      const topic: MessageTopic = {
        name: topicConfig.name,
        subscribers: new Set(),
        persistMessages: topicConfig.persistMessages,
        ...(topicConfig.maxSubscribers && {
          maxSubscribers: topicConfig.maxSubscribers,
        }),
      };
      this.topics.set(topicConfig.name, topic);
    }
    logger.info('initializeDefaultTopics', 'Default topics initialized', {
      topicCount: defaultTopics.length,
    });
  }
  /**
   * Get enhanced communication statistics
   */
  getEnhancedStats(): EnhancedCommunicationStats {
    return { ...this.enhancedStats };
  }
  /**
   * Get communication statistics
   */
  getStats(): AgentCommunicationStats {
    return { ...this.enhancedStats };
  }
  /**
   * Get active agents
   */
  getActiveAgents(): Map<string, AgentSession> {
    return new Map(this.activeAgents);
  }
  /**
   * Get message thread
   */
  getMessageThread(threadId: string): AgentMessage[] {
    return this.messageThreads.get(threadId) || [];
  }
  /**
   * Get active worktrees
   */
  getActiveWorktrees(): Map<string, WorktreeConfig> {
    return new Map(this.worktrees);
  }
  // Communication Protocol Methods
  /**
   * Send task assignment protocol message
   */
  async sendTaskAssignment(protocol: TaskAssignmentProtocol): Promise<MessageDeliveryResult[]> {
    const message: AgentMessage = {
      id: HashUtils.generateId(),
      from: 'orchestrator',
      to: protocol.assignedAgent,
      type: 'task_assignment',
      priority: protocol.priority === 'critical' ? 10 : protocol.priority === 'high' ? 8 : 5,
      subject: `Task Assignment: ${protocol.taskType}`,
      content: `You have been assigned a new task: ${protocol.taskType}`,
      instructions: `Execute task ${protocol.taskType} with ID ${protocol.taskId}`,
      context: {
        ...protocol,
        protocol: 'task_assignment',
        requiredCapabilities: protocol.requiredCapabilities,
      },
      metadata: {
        timestamp: new Date(),
        correlationId: protocol.taskId,
        protocol: 'task_assignment',
      },
      deadline: protocol.deadline,
    };
    logger.info('sendTaskAssignment', 'Task assignment sent', {
      taskId: protocol.taskId,
      assignedAgent: protocol.assignedAgent,
      taskType: protocol.taskType,
      priority: protocol.priority,
    });
    return this.sendDirectMessage(message);
  }
  /**
   * Send status update protocol message
   */
  async sendStatusUpdate(protocol: StatusUpdateProtocol): Promise<MessageDeliveryResult[]> {
    const message: AgentMessage = {
      id: HashUtils.generateId(),
      from: protocol.agentId,
      to: 'orchestrator',
      type: 'notification',
      priority: protocol.status === 'error' ? 9 : 3,
      subject: `Status Update: ${protocol.status}`,
      content: `Agent ${protocol.agentId} status: ${protocol.status} (${protocol.progress}%)`,
      context: {
        ...protocol,
        protocol: 'status_update',
      },
      metadata: {
        timestamp: new Date(),
        correlationId: protocol.taskId || protocol.agentId,
        protocol: 'status_update',
      },
    };
    // Also publish to status_updates topic for monitoring
    const statusMessage: Omit<AgentMessage, 'to'> = {
      id: HashUtils.generateId(),
      from: message.from,
      type: message.type,
      priority: message.priority,
      subject: message.subject,
      content: message.content,
      instructions: message.instructions,
      context: message.context,
      tools: message.tools,
      deadline: message.deadline,
      subAgents: message.subAgents,
      worktree: message.worktree,
      metadata: {
        ...message.metadata,
      },
    };
    await this.publishToTopic('status_updates', statusMessage);
    logger.info('sendStatusUpdate', 'Status update sent', {
      agentId: protocol.agentId,
      status: protocol.status,
      progress: protocol.progress,
      taskId: protocol.taskId,
    });
    return this.sendDirectMessage(message);
  }
  /**
   * Send collaboration request protocol message
   */
  async sendCollaborationRequest(
    protocol: CollaborationRequestProtocol,
  ): Promise<MessageDeliveryResult[]> {
    const priorityMap = { low: 4, medium: 6, high: 8 };
    const message: AgentMessage = {
      id: HashUtils.generateId(),
      from: protocol.requestingAgent,
      to: protocol.targetAgents[0], // Primary target
      type: 'request',
      priority: priorityMap[protocol.urgency],
      subject: `Collaboration Request: ${protocol.collaborationType}`,
      content: `Requesting ${protocol.collaborationType} for: ${protocol.taskDescription}`,
      instructions: `Please provide ${protocol.collaborationType} for the specified task`,
      context: {
        ...protocol,
        protocol: 'collaboration_request',
        expectedDuration: protocol.expectedDuration,
      },
      metadata: {
        timestamp: new Date(),
        correlationId: HashUtils.generateId(),
        protocol: 'collaboration_request',
      },
    };
    logger.info('sendCollaborationRequest', 'Collaboration request sent', {
      requestingAgent: protocol.requestingAgent,
      targetAgents: protocol.targetAgents,
      collaborationType: protocol.collaborationType,
      urgency: protocol.urgency,
    });
    const results: MessageDeliveryResult[] = [];
    // Send to all target agents
    for (const targetAgent of protocol.targetAgents) {
      const targetMessage = { ...message, to: targetAgent };
      const result = await this.sendDirectMessage(targetMessage);
      results.push(...result);
    }
    return results;
  }
  /**
   * Send emergency stop protocol message
   */
  async sendEmergencyStop(protocol: EmergencyStopProtocol): Promise<MessageDeliveryResult[]> {
    const message: AgentMessage = {
      id: HashUtils.generateId(),
      from: protocol.initiatedBy,
      to: 'all',
      type: 'escalation',
      priority: 10, // Highest priority
      subject: `EMERGENCY STOP: ${protocol.stopType.toUpperCase()}`,
      content: `Emergency ${protocol.stopType} initiated: ${protocol.reason}`,
      instructions: `Immediately ${protocol.stopType} all operations due to: ${protocol.reason}`,
      context: {
        ...protocol,
        protocol: 'emergency_stop',
      },
      metadata: {
        timestamp: protocol.timestamp,
        correlationId: `emergency_${protocol.timestamp.getTime()}`,
        protocol: 'emergency_stop',
      },
    };
    logger.warn('sendEmergencyStop', 'Emergency stop sent', {
      initiatedBy: protocol.initiatedBy,
      stopType: protocol.stopType,
      reason: protocol.reason,
      affectedAgents: protocol.affectedAgents.length,
    });
    // Broadcast to all agents and publish to emergency topic
    const broadcastResults = await this.broadcastMessage(message);
    const topicResults = await this.publishToTopic('emergency', message);
    return [...broadcastResults, ...topicResults];
  }
  /**
   * Handle protocol message
   */
  async handleProtocolMessage(message: AgentMessage): Promise<void> {
    const protocol = message.metadata?.protocol as string;
    if (!protocol) {
      logger.warn('handleProtocolMessage', 'Message missing protocol', {
        messageId: message.id,
      });
      return;
    }
    logger.info('handleProtocolMessage', 'Processing protocol message', {
      protocol,
      messageId: message.id,
      from: message.from,
    });
    switch (protocol) {
      case 'task_assignment':
        await this.handleTaskAssignment(message);
        break;
      case 'status_update':
        await this.handleStatusUpdate(message);
        break;
      case 'collaboration_request':
        await this.handleCollaborationRequest(message);
        break;
      case 'emergency_stop':
        await this.handleEmergencyStop(message);
        break;
      default:
        logger.warn('handleProtocolMessage', 'Unknown protocol', { protocol });
    }
  }
  /**
   * Handle task assignment protocol
   */
  private async handleTaskAssignment(message: AgentMessage): Promise<void> {
    const protocol = message.context as TaskAssignmentProtocol;
    // Update agent status
    const agent = this.activeAgents.get(protocol.assignedAgent);
    if (agent) {
      agent.status = 'busy';
      logger.info('handleTaskAssignment', 'Agent task assigned', {
        agentId: protocol.assignedAgent,
        taskId: protocol.taskId,
      });
    }
    this.emit('task_assigned', { protocol, message });
  }
  /**
   * Handle status update protocol
   */
  private async handleStatusUpdate(message: AgentMessage): Promise<void> {
    const protocol = message.context as StatusUpdateProtocol;
    // Update agent status
    const agent = this.activeAgents.get(protocol.agentId);
    if (agent) {
      // Map protocol status to agent session status
      const mappedStatus =
        protocol.status === 'completed'
          ? 'idle'
          : protocol.status === 'blocked'
            ? 'error'
            : protocol.status;
      agent.status = mappedStatus;
      agent.lastActivity = new Date();
      logger.info('handleStatusUpdate', 'Agent status updated', {
        agentId: protocol.agentId,
        status: protocol.status,
        mappedStatus,
        progress: protocol.progress,
      });
    }
    this.emit('status_updated', { protocol, message });
  }
  /**
   * Handle collaboration request protocol
   */
  private async handleCollaborationRequest(message: AgentMessage): Promise<void> {
    const protocol = message.context as CollaborationRequestProtocol;
    logger.info('handleCollaborationRequest', 'Collaboration request received', {
      requestingAgent: protocol.requestingAgent,
      collaborationType: protocol.collaborationType,
    });
    this.emit('collaboration_requested', { protocol, message });
  }
  /**
   * Handle emergency stop protocol
   */
  private async handleEmergencyStop(message: AgentMessage): Promise<void> {
    const protocol = message.context as EmergencyStopProtocol;
    logger.error('handleEmergencyStop', 'Emergency stop received', {
      initiatedBy: protocol.initiatedBy,
      stopType: protocol.stopType,
      reason: protocol.reason,
    });
    // Pause/stop all agents
    for (const agentId of protocol.affectedAgents) {
      const agent = this.activeAgents.get(agentId);
      if (agent) {
        agent.status = protocol.stopType === 'terminate' ? 'error' : 'idle';
      }
    }
    this.emit('emergency_stop', { protocol, message });
  }
  /**
   * Get topics information
   */
  getTopics(): Map<string, MessageTopic> {
    return new Map(this.topics);
  }
  /**
   * Get pending requests count
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }
  /**
   * Get queue information
   */
  getQueueInfo(): {
    size: number;
    messages: Array<{
      messageId: string;
      attempts: number;
      nextRetryTime: Date;
      priority: number;
    }>;
  } {
    return {
      size: this.messageQueue.length,
      messages: this.messageQueue.map((qm) => ({
        messageId: qm.message.id,
        attempts: qm.attempts,
        nextRetryTime: qm.nextRetryTime,
        priority: qm.priority,
      })),
    };
  }
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('cleanup', 'Cleaning up enhanced agent communication');
    // Stop queue processor
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    // Clear pending requests
    for (const [requestId, request] of Array.from(this.pendingRequests.entries())) {
      clearTimeout(request.timeout);
      request.reject(new Error('Communication system shutting down'));
    }
    this.pendingRequests.clear();
    // Cleanup message queue
    this.messageQueue.length = 0;
    // Cleanup topics
    this.topics.clear();
    // Cleanup worktrees
    for (const [worktreeId, config] of Array.from(this.worktrees.entries())) {
      if (config.cleanupAfter) {
        // Cleanup worktree
        logger.info('cleanup', 'Cleaning up worktree', { worktreeId, path: config.path });
      }
    }
    this.worktrees.clear();
    // Cleanup sub-agents
    for (const [subAgentId, subAgent] of Array.from(this.subAgents.entries())) {
      await this.cleanupSubAgent(subAgent);
    }
    this.subAgents.clear();
    // Clear message threads
    this.messageThreads.clear();
    // Cleanup persistence files if needed
    if (this.persistenceConfig.enabled) {
      await this.cleanupPersistence();
    }
    this.emit('cleanup_completed');
  }
  /**
   * Cleanup persistence files
   */
  private async cleanupPersistence(): Promise<void> {
    try {
      // Clean up old message files based on retention period
      const files = await fs.readdir(this.persistenceConfig.storagePath);
      const cutoffDate = new Date(
        Date.now() - this.persistenceConfig.retentionPeriod * 24 * 60 * 60 * 1000,
      );
      for (const file of files) {
        if (file.startsWith('message_') && file.endsWith('.json')) {
          const filePath = path.join(this.persistenceConfig.storagePath, file);
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            logger.debug('cleanupPersistence', 'Removed old message file', { filePath });
          }
        }
      }
    } catch (error) {
      logger.error('cleanupPersistence', 'Failed to cleanup persistence files', error as Error);
    }
  }
}
