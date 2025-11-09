/**
 * Orchestrator Message Handling Guidelines
 *
 * Comprehensive message handling system with admin read status tracking,
 * message prioritization, and orchestrator coordination protocols.
 */

import { createAgentNudgeIntegration } from '../nudge/agent-integration';
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('orchestrator');

/**
 * Message priority levels
 */
export enum MessagePriority {
  CRITICAL = 'critical',    // System failures, security incidents
  HIGH = 'high',           // Blockers, decisions needed
  MEDIUM = 'medium',       // Feedback requests, coordination
  LOW = 'low',             // Updates, information
  INFO = 'info'            // Logs, progress updates
}

/**
 * Message status tracking
 */
export enum MessageStatus {
  PENDING = 'pending',     // Created, not sent yet
  SENT = 'sent',          // Delivered to admin
  READ = 'read',          // Admin has read the message
  ACKNOWLEDGED = 'acknowledged', // Admin confirmed receipt
  ACTIONED = 'actioned',  // Admin took action on message
  FAILED = 'failed',      // Delivery failed
  EXPIRED = 'expired'     // Message expired without response
}

/**
 * Admin message interface
 */
export interface AdminMessage {
  id: string;
  type: 'orchestrator-coordination' | 'agent-feedback' | 'system-alert' | 'approval-request';
  priority: MessagePriority;
  status: MessageStatus;
  prpId: string;
  agentType: string;
  subject: string;
  content: string;
  actionRequired?: string;
  expectedResponse?: string;
  metadata: {
    createdAt: Date;
    sentAt?: Date;
    readAt?: Date;
    acknowledgedAt?: Date;
    actionedAt?: Date;
    expiresAt?: Date;
    retryCount: number;
    maxRetries: number;
    escalationLevel: number;
    requiresFollowUp: boolean;
    followUpInterval?: number; // minutes
    lastFollowUpAt?: Date;
  };
  context: {
    signal?: string;
    relatedFiles?: string[];
    dependentTasks?: string[];
    blockingIssues?: string[];
    options?: string[];
    recommendation?: string;
  };
}

/**
 * Message queue configuration
 */
export interface MessageQueueConfig {
  maxConcurrent: number;
  batchSize: number;
  batchInterval: number; // milliseconds
  retryDelay: number; // milliseconds
  maxRetries: number;
  expirationTime: number; // milliseconds
  escalationThresholds: {
    low: number;    // minutes
    medium: number; // minutes
    high: number;   // minutes
    critical: number; // minutes
    info: number;   // minutes
  };
}

/**
 * Orchestrator Message Handling Guidelines
 */
export class OrchestratorMessageHandlingGuidelines {
  private agentNudge: ReturnType<typeof createAgentNudgeIntegration>;
  private messageQueue: Map<string, AdminMessage> = new Map();
  private readStatusTracker: Map<string, {
    messageId: string;
    adminId: string;
    readAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }> = new Map();
  private config: MessageQueueConfig;
  private processingInterval?: NodeJS.Timeout;
  private followUpInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MessageQueueConfig>) {
    this.agentNudge = createAgentNudgeIntegration();
    this.config = {
      maxConcurrent: 5,
      batchSize: 10,
      batchInterval: 30000, // 30 seconds
      retryDelay: 60000,    // 1 minute
      maxRetries: 3,
      expirationTime: 86400000, // 24 hours
      escalationThresholds: {
        low: 240,    // 4 hours
        medium: 60,  // 1 hour
        high: 30,    // 30 minutes
        critical: 10, // 10 minutes
        info: 480    // 8 hours
      },
      ...config
    };

    this.initializeMessageProcessing();
  }

  /**
   * Initialize message processing scheduler
   */
  private initializeMessageProcessing(): void {
    // Main message processing interval
    this.processingInterval = setInterval(() => {
      this.processMessageQueue();
    }, this.config.batchInterval);

    // Follow-up processing interval
    this.followUpInterval = setInterval(() => {
      this.processFollowUps();
    }, this.config.batchInterval * 2); // Less frequent than main processing

    logger.info('OrchestratorMessageHandler', 'Message processing initialized', {
      batchInterval: this.config.batchInterval,
      batchSize: this.config.batchSize,
      maxRetries: this.config.maxRetries
    });
  }

  /**
   * Create and queue admin message
   */
  async createAdminMessage(data: {
    type: AdminMessage['type'];
    priority: MessagePriority;
    prpId: string;
    agentType: string;
    subject: string;
    content: string;
    actionRequired?: string;
    expectedResponse?: string;
    context?: AdminMessage['context'];
    expirationMinutes?: number;
    requiresFollowUp?: boolean;
    followUpInterval?: number;
  }): Promise<string> {
    const messageId = this.generateMessageId();
    const expiresAt = data.expirationMinutes
      ? new Date(Date.now() + data.expirationMinutes * 60000)
      : new Date(Date.now() + this.config.expirationTime);

    const message: AdminMessage = {
      id: messageId,
      type: data.type,
      priority: data.priority,
      status: MessageStatus.PENDING,
      prpId: data.prpId,
      agentType: data.agentType,
      subject: data.subject,
      content: data.content,
      actionRequired: data.actionRequired,
      expectedResponse: data.expectedResponse,
      metadata: {
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        escalationLevel: 0,
        requiresFollowUp: data.requiresFollowUp ?? true,
        followUpInterval: data.followUpInterval,
        expiresAt
      },
      context: {
        ...data.context,
        relatedFiles: data.context?.relatedFiles || [],
        dependentTasks: data.context?.dependentTasks || [],
        blockingIssues: data.context?.blockingIssues || [],
        options: data.context?.options || [],
        recommendation: data.context?.recommendation
      }
    };

    this.messageQueue.set(messageId, message);

    logger.info('OrchestratorMessageHandler', 'Admin message created', {
      messageId,
      type: data.type,
      priority: data.priority,
      prpId: data.prpId,
      expiresAt
    });

    // Trigger immediate processing for high/critical priority messages
    if (data.priority === MessagePriority.HIGH || data.priority === MessagePriority.CRITICAL) {
      this.processMessageQueue();
    }

    return messageId;
  }

  /**
   * Process message queue with priority handling
   */
  private async processMessageQueue(): Promise<void> {
    const pendingMessages = Array.from(this.messageQueue.values())
      .filter(msg => msg.status === MessageStatus.PENDING)
      .sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a))
      .slice(0, this.config.batchSize);

    if (pendingMessages.length === 0) {
      return;
    }

    logger.info('OrchestratorMessageHandler', `Processing ${pendingMessages.length} pending messages`);

    const promises = pendingMessages.map(message => this.processMessage(message));
    await Promise.allSettled(promises);
  }

  /**
   * Process individual message
   */
  private async processMessage(message: AdminMessage): Promise<void> {
    try {
      // Check if message has expired
      if (this.isMessageExpired(message)) {
        message.status = MessageStatus.EXPIRED;
        logger.warn('OrchestratorMessageHandler', 'Message expired', { messageId: message.id });
        return;
      }

      // Check escalation requirements
      if (this.shouldEscalate(message)) {
        await this.escalateMessage(message);
        return;
      }

      // Send message via nudge
      await this.sendMessageViaNudge(message);

      // Update message status
      message.status = MessageStatus.SENT;
      message.metadata.sentAt = new Date();

      logger.info('OrchestratorMessageHandler', 'Message sent successfully', {
        messageId: message.id,
        type: message.type,
        priority: message.priority
      });

    } catch (error) {
      await this.handleMessageFailure(message, error);
    }
  }

  /**
   * Send message via nudge integration
   */
  private async sendMessageViaNudge(message: AdminMessage): Promise<void> {
    switch (message.type) {
      case 'orchestrator-coordination':
        await this.agentNudge.sendOrchestratorCoordination({
          prpId: message.prpId,
          agentType: message.agentType,
          issue: message.subject,
          involvedAgents: ['orchestrator', 'admin'],
          conflictDescription: message.content,
          proposedResolution: message.context.recommendation,
          urgency: this.mapPriorityToUrgency(message.priority)
        });
        break;

      case 'agent-feedback':
        await this.agentNudge.sendFeedbackRequest({
          prpId: message.prpId,
          agentType: message.agentType,
          topic: message.subject,
          proposal: message.content,
          alternatives: message.context.options,
          questions: message.actionRequired ? [message.actionRequired] : undefined,
          urgency: this.mapPriorityToUrgency(message.priority)
        });
        break;

      case 'system-alert':
        await this.agentNudge.sendBlockerNotification({
          prpId: message.prpId,
          agentType: message.agentType,
          blockerDescription: message.subject,
          impact: message.content,
          neededAction: message.actionRequired || 'Immediate attention required',
          attemptedSolutions: message.context.dependentTasks,
          urgency: this.mapPriorityToUrgency(message.priority)
        });
        break;

      case 'approval-request':
        await this.agentNudge.sendAdminAttention({
          prpId: message.prpId,
          agentType: message.agentType,
          topic: message.subject,
          summary: message.content,
          details: message.context.recommendation || 'No additional details',
          actionRequired: message.actionRequired || 'Please review and approve',
          priority: this.mapPriorityToUrgency(message.priority)
        });
        break;

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  
  /**
   * Handle message delivery failure
   */
  private async handleMessageFailure(message: AdminMessage, error: unknown): Promise<void> {
    message.metadata.retryCount++;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('OrchestratorMessageHandler', 'Message delivery failed', error instanceof Error ? error : new Error(errorMessage), {
      messageId: message.id,
      retryCount: message.metadata.retryCount,
      maxRetries: message.metadata.maxRetries
    });

    if (message.metadata.retryCount >= message.metadata.maxRetries) {
      message.status = MessageStatus.FAILED;
      logger.error('OrchestratorMessageHandler', 'Message failed after max retries', error instanceof Error ? error : new Error(errorMessage), {
        messageId: message.id,
        retryCount: message.metadata.retryCount
      });
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = this.config.retryDelay * Math.pow(2, message.metadata.retryCount - 1);
      setTimeout(() => {
        message.status = MessageStatus.PENDING; // Reset to pending for retry
        this.processMessage(message);
      }, retryDelay);
    }
  }

  /**
   * Update message read status
   */
  updateMessageReadStatus(messageId: string, adminId: string, metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const message = this.messageQueue.get(messageId);
    if (!message) {
      logger.warn('OrchestratorMessageHandler', 'Attempted to update read status for unknown message', {
        messageId
      });
      return;
    }

    const readTimestamp = new Date();

    // Update message status
    message.status = MessageStatus.READ;
    message.metadata.readAt = readTimestamp;

    // Track read status
    this.readStatusTracker.set(`${messageId}:${adminId}`, {
      messageId,
      adminId,
      readAt: readTimestamp,
      ...metadata
    });

    logger.info('OrchestratorMessageHandler', 'Message read status updated', {
      messageId,
      adminId,
      readAt: readTimestamp,
      status: message.status
    });
  }

  /**
   * Acknowledge message receipt
   */
  acknowledgeMessage(messageId: string, adminId: string): void {
    const message = this.messageQueue.get(messageId);
    if (!message) {
      logger.warn('OrchestratorMessageHandler', 'Attempted to acknowledge unknown message', {
        messageId
      });
      return;
    }

    message.status = MessageStatus.ACKNOWLEDGED;
    message.metadata.acknowledgedAt = new Date();

    logger.info('OrchestratorMessageHandler', 'Message acknowledged', {
      messageId,
      adminId,
      acknowledgedAt: message.metadata.acknowledgedAt
    });
  }

  /**
   * Mark message as actioned
   */
  markMessageActioned(messageId: string, adminId: string, action: string): void {
    const message = this.messageQueue.get(messageId);
    if (!message) {
      logger.warn('OrchestratorMessageHandler', 'Attempted to mark unknown message as actioned', {
        messageId
      });
      return;
    }

    message.status = MessageStatus.ACTIONED;
    message.metadata.actionedAt = new Date();

    logger.info('OrchestratorMessageHandler', 'Message marked as actioned', {
      messageId,
      adminId,
      action,
      actionedAt: message.metadata.actionedAt
    });
  }

  /**
   * Process follow-ups for sent messages
   */
  private async processFollowUps(): Promise<void> {
    const sentMessages = Array.from(this.messageQueue.values())
      .filter(msg =>
        msg.status === MessageStatus.SENT &&
        msg.metadata.requiresFollowUp &&
        this.shouldSendFollowUp(msg)
      );

    if (sentMessages.length === 0) {
      return;
    }

    logger.info('OrchestratorMessageHandler', `Processing follow-ups for ${sentMessages.length} messages`);

    for (const message of sentMessages) {
      await this.sendFollowUp(message);
    }
  }

  /**
   * Check if follow-up should be sent
   */
  private shouldSendFollowUp(message: AdminMessage): boolean {
    if (!message.metadata.sentAt) {
      return false;
    }

    const followUpInterval = message.metadata.followUpInterval ||
      this.config.escalationThresholds[message.priority] * 60000; // convert to milliseconds

    const timeSinceSent = Date.now() - message.metadata.sentAt.getTime();
    const lastFollowUpTime = message.metadata.lastFollowUpAt?.getTime() || 0;

    return timeSinceSent > followUpInterval && (Date.now() - lastFollowUpTime) > followUpInterval;
  }

  /**
   * Send follow-up message
   */
  private async sendFollowUp(message: AdminMessage): Promise<void> {
    try {
      const followUpMessage = `🔄 Follow-up: ${message.subject}

This message requires your attention and was sent on ${message.metadata.sentAt?.toISOString()}.

Original message: ${message.content}

Please review and take the required action: ${message.actionRequired || 'Please respond to this message'}`;

      await this.agentNudge.sendAdminAttention({
        prpId: message.prpId,
        agentType: 'orchestrator-follow-up',
        topic: `Follow-up: ${message.subject}`,
        summary: 'Follow-up reminder for pending admin attention',
        details: followUpMessage,
        actionRequired: 'Please review original message and respond',
        priority: 'medium'
      });

      message.metadata.lastFollowUpAt = new Date();
      message.metadata.escalationLevel++;

      logger.info('OrchestratorMessageHandler', 'Follow-up sent', {
        messageId: message.id,
        escalationLevel: message.metadata.escalationLevel
      });

    } catch (error) {
      logger.error('OrchestratorMessageHandler', 'Failed to send follow-up', error instanceof Error ? error : new Error(error instanceof Error ? error.message : 'Unknown error'), {
        messageId: message.id
      });
    }
  }

  /**
   * Check if message should be escalated
   */
  private shouldEscalate(message: AdminMessage): boolean {
    if (!message.metadata.sentAt) {
      return false;
    }

    const escalationThreshold = this.config.escalationThresholds[message.priority] * 60000;
    const timeSinceSent = Date.now() - message.metadata.sentAt.getTime();

    return timeSinceSent > escalationThreshold && message.metadata.escalationLevel < 3;
  }

  /**
   * Escalate message
   */
  private async escalateMessage(message: AdminMessage): Promise<void> {
    message.metadata.escalationLevel++;

    const escalationContent = `🚨 ESCALATION (Level ${message.metadata.escalationLevel}): ${message.subject}

This message has been escalated due to lack of response.

Original message sent: ${message.metadata.sentAt?.toISOString()}
Current escalation level: ${message.metadata.escalationLevel}

${message.content}

URGENT ACTION REQUIRED: ${message.actionRequired || 'Immediate admin attention required'}`;

    await this.agentNudge.sendAdminAttention({
      prpId: message.prpId,
      agentType: 'orchestrator-escalation',
      topic: `ESCALATION (${message.metadata.escalationLevel}): ${message.subject}`,
      summary: 'Message escalated due to lack of response',
      details: escalationContent,
      actionRequired: 'URGENT: Immediate attention required',
      priority: 'high'
    });

    logger.warn('OrchestratorMessageHandler', 'Message escalated', {
      messageId: message.id,
      escalationLevel: message.metadata.escalationLevel
    });
  }

  /**
   * Get message statistics
   */
  getMessageStats(): {
    total: number;
    byStatus: Record<MessageStatus, number>;
    byPriority: Record<MessagePriority, number>;
    pendingCritical: number;
    overdue: number;
    averageResponseTime?: number;
  } {
    const messages = Array.from(this.messageQueue.values());

    const byStatus: Record<MessageStatus, number> = {
      [MessageStatus.PENDING]: 0,
      [MessageStatus.SENT]: 0,
      [MessageStatus.READ]: 0,
      [MessageStatus.ACKNOWLEDGED]: 0,
      [MessageStatus.ACTIONED]: 0,
      [MessageStatus.FAILED]: 0,
      [MessageStatus.EXPIRED]: 0
    };

    const byPriority: Record<MessagePriority, number> = {
      [MessagePriority.CRITICAL]: 0,
      [MessagePriority.HIGH]: 0,
      [MessagePriority.MEDIUM]: 0,
      [MessagePriority.LOW]: 0,
      [MessagePriority.INFO]: 0
    };

    let pendingCritical = 0;
    let overdue = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    messages.forEach(message => {
      byStatus[message.status]++;
      byPriority[message.priority]++;

      if (message.status === MessageStatus.PENDING && message.priority === MessagePriority.CRITICAL) {
        pendingCritical++;
      }

      if (this.isMessageOverdue(message)) {
        overdue++;
      }

      if (message.metadata.readAt && message.metadata.sentAt) {
        totalResponseTime += message.metadata.readAt.getTime() - message.metadata.sentAt.getTime();
        responseCount++;
      }
    });

    return {
      total: messages.length,
      byStatus,
      byPriority,
      pendingCritical,
      overdue,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : undefined
    };
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): AdminMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  /**
   * Get messages by PRP
   */
  getMessagesByPrp(prpId: string): AdminMessage[] {
    return Array.from(this.messageQueue.values()).filter(msg => msg.prpId === prpId);
  }

  /**
   * Helper methods
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPriorityScore(message: AdminMessage): number {
    const priorityScores = {
      [MessagePriority.CRITICAL]: 100,
      [MessagePriority.HIGH]: 80,
      [MessagePriority.MEDIUM]: 60,
      [MessagePriority.LOW]: 40,
      [MessagePriority.INFO]: 20
    };

    let score = priorityScores[message.priority];

    // Add urgency based on time since creation
    const ageMinutes = (Date.now() - message.metadata.createdAt.getTime()) / 60000;
    score += Math.min(ageMinutes, 60); // Add up to 60 points based on age

    return score;
  }

  private isMessageExpired(message: AdminMessage): boolean {
    return message.metadata.expiresAt ?
      Date.now() > message.metadata.expiresAt.getTime() : false;
  }

  private isMessageOverdue(message: AdminMessage): boolean {
    if (!message.metadata.sentAt) {
      return false;
    }

    const thresholdMinutes = this.config.escalationThresholds[message.priority];
    const overdueTime = Date.now() - (message.metadata.sentAt.getTime() + thresholdMinutes * 60000);

    return overdueTime > 0;
  }

  private mapPriorityToUrgency(priority: MessagePriority): 'high' | 'medium' | 'low' {
    switch (priority) {
      case MessagePriority.CRITICAL:
      case MessagePriority.HIGH:
        return 'high';
      case MessagePriority.MEDIUM:
        return 'medium';
      case MessagePriority.LOW:
      case MessagePriority.INFO:
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    if (this.followUpInterval) {
      clearInterval(this.followUpInterval);
      this.followUpInterval = undefined;
    }

    logger.info('OrchestratorMessageHandler', 'Message handling guidelines shutdown completed');
  }
}

/**
 * Create orchestrator message handling guidelines instance
 */
export const createOrchestratorMessageHandlingGuidelines = (
  config?: Partial<MessageQueueConfig>
): OrchestratorMessageHandlingGuidelines => {
  return new OrchestratorMessageHandlingGuidelines(config);
};