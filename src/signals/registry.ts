/**
 * ♫ Signal Registry for @dcversus/prp
 *
 * Comprehensive signal definitions following the hierarchy:
 * oo → aa → OO → AA (ascending urgency)
 */

import { Signal, SignalType } from '../shared/types';

export interface ExtendedSignal extends Signal {
  tag?: string;
}

export interface SignalDefinition {
  tag: string;
  type: SignalType;
  category: 'orchestrator_info' | 'admin_info' | 'orchestrator_action' | 'admin_action';
  priority: number;
  description: string;
  handler: 'orchestrator' | 'admin';
  escalationRules?: {
    timeout?: number; // milliseconds
    escalateTo?: string; // signal tag to escalate to
    conditions?: string[]; // conditions for escalation
  };
  metadataSchema?: Record<string, unknown>;
  examples?: string[];
}

/**
 * Signal Registry containing all defined signals
 */
export const SIGNAL_REGISTRY: Record<string, SignalDefinition> = {
  // Orchestrator Information Signals (oo)
  'oo': {
    tag: 'oo',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'General orchestrator status update',
    handler: 'orchestrator',
    escalationRules: {
      timeout: 600000, // 10 minutes
      escalateTo: 'OO'
    }
  },

  'oo-init': {
    tag: 'oo-init',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'Initialization progress update',
    handler: 'orchestrator',
    metadataSchema: {
      component: 'string',
      progress: 'number',
      status: 'string'
    }
  },

  'oo-scan': {
    tag: 'oo-scan',
    type: 'info',
    category: 'orchestrator_info',
    priority: 3,
    description: 'Scan completion report',
    handler: 'orchestrator',
    metadataSchema: {
      scanType: 'string',
      signalsFound: 'number',
      duration: 'number'
    }
  },

  'oo-agent': {
    tag: 'oo-agent',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'Agent activity summary',
    handler: 'orchestrator',
    metadataSchema: {
      agentId: 'string',
      activity: 'string',
      status: 'string'
    }
  },

  'oo-resource': {
    tag: 'oo-resource',
    type: 'info',
    category: 'orchestrator_info',
    priority: 3,
    description: 'Resource usage report',
    handler: 'orchestrator',
    metadataSchema: {
      resource: 'string',
      usage: 'number',
      threshold: 'number'
    }
  },

  'oo-progress': {
    tag: 'oo-progress',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'Orchestrator task progress',
    handler: 'orchestrator',
    metadataSchema: {
      taskId: 'string',
      progress: 'number',
      status: 'string'
    }
  },

  'oo-analysis': {
    tag: 'oo-analysis',
    type: 'info',
    category: 'orchestrator_info',
    priority: 3,
    description: 'Analysis complete',
    handler: 'orchestrator',
    metadataSchema: {
      analysisType: 'string',
      result: 'string',
      recommendations: 'array'
    }
  },

  // Admin Information Signals (aa)
  'aa': {
    tag: 'aa',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'General admin notification',
    handler: 'admin',
    escalationRules: {
      timeout: 1800000, // 30 minutes
      escalateTo: 'AA'
    }
  },

  'aa-progress': {
    tag: 'aa-progress',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Task progress update',
    handler: 'admin',
    metadataSchema: {
      taskId: 'string',
      progress: 'number',
      eta: 'string'
    }
  },

  'aa-preview': {
    tag: 'aa-preview',
    type: 'info',
    category: 'admin_info',
    priority: 5,
    description: 'Preview available for review',
    handler: 'admin',
    metadataSchema: {
      previewUrl: 'string',
      contentType: 'string',
      expiresAt: 'string'
    },
    examples: [
      'Preview available: https://example.com/preview',
      'Report ready for review: https://example.com/report'
    ]
  },

  'aa-summary': {
    tag: 'aa-summary',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Daily/weekly summary',
    handler: 'admin',
    metadataSchema: {
      period: 'string',
      metrics: 'object',
      highlights: 'array'
    }
  },

  'aa-reminder': {
    tag: 'aa-reminder',
    type: 'info',
    category: 'admin_info',
    priority: 3,
    description: 'Gentle reminder for admin',
    handler: 'admin',
    metadataSchema: {
      reminderType: 'string',
      action: 'string',
      dueDate: 'string'
    }
  },

  'aa-analysis': {
    tag: 'aa-analysis',
    type: 'info',
    category: 'admin_info',
    priority: 5,
    description: 'Analysis ready for review',
    handler: 'admin',
    metadataSchema: {
      analysisId: 'string',
      summary: 'string',
      recommendations: 'array'
    }
  },

  'aa-share': {
    tag: 'aa-share',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Content ready to share',
    handler: 'admin',
    metadataSchema: {
      shareUrl: 'string',
      contentType: 'string',
      audience: 'string'
    }
  },

  'aa-report': {
    tag: 'aa-report',
    type: 'info',
    category: 'admin_info',
    priority: 5,
    description: 'Report generated for review',
    handler: 'admin',
    metadataSchema: {
      reportType: 'string',
      reportUrl: 'string',
      period: 'string'
    }
  },

  'aa-feedback': {
    tag: 'aa-feedback',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Feedback requested',
    handler: 'admin',
    metadataSchema: {
      feedbackType: 'string',
      context: 'string',
      deadline: 'string'
    }
  },

  // Orchestrator Action Signals (OO)
  'OO': {
    tag: 'OO',
    type: 'action',
    category: 'orchestrator_action',
    priority: 7,
    description: 'New situation requiring resolution',
    handler: 'orchestrator',
    escalationRules: {
      timeout: 300000, // 5 minutes
      escalateTo: 'AA',
      conditions: ['resolution_failed', 'timeout_exceeded']
    }
  },

  'OO-signal': {
    tag: 'OO-signal',
    type: 'action',
    category: 'orchestrator_action',
    priority: 8,
    description: 'New signal pattern detected',
    handler: 'orchestrator',
    metadataSchema: {
      signalPattern: 'string',
      frequency: 'number',
      impact: 'string'
    }
  },

  'OO-conflict': {
    tag: 'OO-conflict',
    type: 'action',
    category: 'orchestrator_action',
    priority: 8,
    description: 'Conflict resolution needed',
    handler: 'orchestrator',
    metadataSchema: {
      conflictType: 'string',
      parties: 'array',
      resolution: 'string'
    }
  },

  'OO-resource': {
    tag: 'OO-resource',
    type: 'action',
    category: 'orchestrator_action',
    priority: 9,
    description: 'Resource threshold exceeded',
    handler: 'orchestrator',
    metadataSchema: {
      resource: 'string',
      currentUsage: 'number',
      threshold: 'number',
      impact: 'string'
    }
  },

  'OO-failure': {
    tag: 'OO-failure',
    type: 'action',
    category: 'orchestrator_action',
    priority: 9,
    description: 'System failure recovery needed',
    handler: 'orchestrator',
    metadataSchema: {
      failureType: 'string',
      component: 'string',
      recovery: 'string'
    }
  },

  'OO-decision': {
    tag: 'OO-decision',
    type: 'action',
    category: 'orchestrator_action',
    priority: 8,
    description: 'Decision point reached',
    handler: 'orchestrator',
    metadataSchema: {
      decisionType: 'string',
      options: 'array',
      criteria: 'string'
    }
  },

  'OO-agent': {
    tag: 'OO-agent',
    type: 'action',
    category: 'orchestrator_action',
    priority: 7,
    description: 'Agent needs orchestrator intervention',
    handler: 'orchestrator',
    metadataSchema: {
      agentId: 'string',
      issue: 'string',
      requiredAction: 'string'
    }
  },

  // Admin Action Signals (AA)
  'AA': {
    tag: 'AA',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Critical admin intervention required',
    handler: 'admin'
  },

  'AA-error': {
    tag: 'AA-error',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Unrecoverable system error',
    handler: 'admin',
    metadataSchema: {
      errorType: 'string',
      component: 'string',
      impact: 'string',
      stackTrace: 'string'
    }
  },

  'AA-security': {
    tag: 'AA-security',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Security issue detected',
    handler: 'admin',
    metadataSchema: {
      securityLevel: 'string',
      threat: 'string',
      affectedSystems: 'array',
      immediateAction: 'string'
    }
  },

  'AA-decision': {
    tag: 'AA-decision',
    type: 'action',
    category: 'admin_action',
    priority: 9,
    description: 'Critical decision point reached',
    handler: 'admin',
    metadataSchema: {
      decisionType: 'string',
      urgency: 'string',
      impact: 'string',
      deadline: 'string'
    }
  },

  'AA-emergency': {
    tag: 'AA-emergency',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Emergency situation',
    handler: 'admin',
    metadataSchema: {
      emergencyType: 'string',
      severity: 'string',
      immediateAction: 'string',
      affectedSystems: 'array'
    }
  },

  'AA-agent': {
    tag: 'AA-agent',
    type: 'action',
    category: 'admin_action',
    priority: 9,
    description: 'Agent critical failure',
    handler: 'admin',
    metadataSchema: {
      agentId: 'string',
      failureType: 'string',
      impact: 'string',
      requiredAction: 'string'
    }
  }
};

/**
 * Signal Registry Manager
 */
export class SignalRegistry {
  private static instance: SignalRegistry;
  private escalationTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  static getInstance(): SignalRegistry {
    if (!SignalRegistry.instance) {
      SignalRegistry.instance = new SignalRegistry();
    }
    return SignalRegistry.instance;
  }

  /**
   * Get signal definition by tag
   */
  getDefinition(tag: string): SignalDefinition | undefined {
    return SIGNAL_REGISTRY[tag];
  }

  /**
   * Get all signals by category
   */
  getByCategory(category: SignalDefinition['category']): SignalDefinition[] {
    return Object.values(SIGNAL_REGISTRY).filter(signal => signal.category === category);
  }

  /**
   * Get all signals by handler
   */
  getByHandler(handler: 'orchestrator' | 'admin'): SignalDefinition[] {
    return Object.values(SIGNAL_REGISTRY).filter(signal => signal.handler === handler);
  }

  /**
   * Check if signal tag is valid
   */
  isValidTag(tag: string): boolean {
    return tag in SIGNAL_REGISTRY;
  }

  /**
   * Create signal from definition
   */
  createSignal(tag: string, content: string, metadata?: Record<string, unknown>): Signal | null {
    const definition = this.getDefinition(tag);
    if (!definition) {
      return null;
    }

    return {
      id: `${tag}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: `[${tag}]`,
      priority: definition.priority,
      source: 'system',
      timestamp: new Date(),
      data: {
        content,
        definitionTag: definition.tag,
        category: definition.category,
        handler: definition.handler,
        createdAt: new Date().toISOString()
      },
      metadata: {
        ...metadata
      }
    };
  }

  /**
   * Setup escalation timer for signal
   */
  setupEscalation(signal: Signal, escalateCallback: (signal: Signal, escalateTo: string) => void): void {
    const extendedSignal = signal as ExtendedSignal;
    const tag = extendedSignal.tag?.replace(/[[\]]/g, '') || signal.type;
    const definition = this.getDefinition(tag);
    if (!definition?.escalationRules) {
      return;
    }

    const { timeout, escalateTo } = definition.escalationRules;
    if (timeout && escalateTo) {
      const timer = setTimeout(() => {
        escalateCallback(signal, escalateTo);
      }, timeout);

      this.escalationTimers.set(signal.id, timer);
    }
  }

  /**
   * Cancel escalation timer for signal
   */
  cancelEscalation(signalId: string): void {
    const timer = this.escalationTimers.get(signalId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(signalId);
    }
  }

  /**
   * Get all registered signal tags
   */
  getAllTags(): string[] {
    return Object.keys(SIGNAL_REGISTRY);
  }

  /**
   * Get signals by priority range
   */
  getByPriorityRange(minPriority: number, maxPriority: number): SignalDefinition[] {
    return Object.values(SIGNAL_REGISTRY).filter(
      signal => signal.priority >= minPriority && signal.priority <= maxPriority
    );
  }
}

// Export singleton instance
export const signalRegistry = SignalRegistry.getInstance();