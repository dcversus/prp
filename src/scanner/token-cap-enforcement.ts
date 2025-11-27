/**
 * ♫ Token Cap Enforcement System for @dcversus/prp
 *
 * Integrates multi-provider token accounting with inspector cap enforcement
 * to provide real-time limit monitoring and automated enforcement actions.
 */
import { EventEmitter } from 'events';

import { createLayerLogger, TimeUtils } from '../shared';

import type {
  TokenLimitEnforcement,
  TokenUsageEvent,
  TokenDataPoint,
} from '../shared/types/token-metrics';
import type {
  MultiProviderTokenAccounting,
  TokenUsageRecord,
  ProviderUsage,
  LimitPrediction,
} from './multi-provider-token-accounting';

const logger = createLayerLogger('scanner');

// Enhanced interfaces for cap enforcement
export interface CapEnforcementConfig {
  inspector: {
    totalLimit: number;
    basePromptLimit: number;
    guidelinePromptLimit: number;
    contextLimit: number;
  };
  orchestrator: {
    totalLimit: number;
    basePromptLimit: number;
    guidelinePromptLimit: number;
    agentsmdLimit: number;
    notesPromptLimit: number;
    inspectorPayloadLimit: number;
    prpLimit: number;
    sharedContextLimit: number;
    prpContextLimit: number;
  };
  enforcement: {
    enabled: boolean;
    softWarningThreshold: number; // percentage
    moderateWarningThreshold: number; // percentage
    criticalWarningThreshold: number; // percentage
    hardStopThreshold: number; // percentage
  };
  actions: {
    atSoftWarning: 'log_warning' | 'emit_signal';
    atModerateWarning: 'emit_signal' | 'throttle_requests' | 'reduce_context';
    atCriticalWarning: 'throttle_requests' | 'block_new_requests' | 'emergency_compaction';
    atHardStop: 'emergency_stop' | 'force_context_compaction';
  };
}

export interface EnforcementAction {
  id: string;
  timestamp: Date;
  component: 'inspector' | 'orchestrator';
  type: 'warning_logged' | 'signal_emitted' | 'requests_throttled' |
        'requests_blocked' | 'context_compacted' | 'emergency_stopped';
  reason: string;
  threshold: number;
  currentUsage: number;
  limit: number;
  percentage: number;
  details: Record<string, unknown>;
  resolved: boolean;
}

export interface ComponentUsage {
  component: 'inspector' | 'orchestrator';
  currentUsage: number;
  limit: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical' | 'blocked';
  enforcementHistory: EnforcementAction[];
}

export interface CapEnforcementStatus {
  timestamp: Date;
  inspector: ComponentUsage;
  orchestrator: ComponentUsage;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  activeEnforcements: EnforcementAction[];
  recommendations: string[];
}

/**
 * Token Cap Enforcement Manager
 */
export class TokenCapEnforcementManager extends EventEmitter {
  private readonly config: CapEnforcementConfig;
  private readonly multiProviderAccounting: MultiProviderTokenAccounting;

  // Usage tracking
  private readonly currentUsage = new Map<'inspector' | 'orchestrator', number>();
  private readonly enforcementHistory: EnforcementAction[] = [];
  private readonly activeEnforcements = new Map<string, EnforcementAction>();

  // Monitoring
  private monitoringInterval?: NodeJS.Timeout;
  private lastUpdate: Date = new Date();

  constructor(
    multiProviderAccounting: MultiProviderTokenAccounting,
    config: Partial<CapEnforcementConfig> = {}
  ) {
    super();

    this.multiProviderAccounting = multiProviderAccounting;

    // Default configuration
    this.config = {
      inspector: {
        totalLimit: 1000000, // 1M tokens
        basePromptLimit: 20000, // 20K tokens
        guidelinePromptLimit: 20000, // 20K tokens
        contextLimit: 960000, // Remaining for context
      },
      orchestrator: {
        totalLimit: 200000, // 200K tokens
        basePromptLimit: 20000, // 20K tokens
        guidelinePromptLimit: 20000, // 20K tokens
        agentsmdLimit: 10000, // 10K tokens
        notesPromptLimit: 20000, // 20K tokens
        inspectorPayloadLimit: 40000, // 40K tokens
        prpLimit: 20000, // 20K tokens
        sharedContextLimit: 10000, // 10K tokens
        prpContextLimit: 70000, // 70K tokens
      },
      enforcement: {
        enabled: true,
        softWarningThreshold: 70, // 70%
        moderateWarningThreshold: 80, // 80%
        criticalWarningThreshold: 90, // 90%
        hardStopThreshold: 95, // 95%
      },
      actions: {
        atSoftWarning: 'log_warning',
        atModerateWarning: 'emit_signal',
        atCriticalWarning: 'throttle_requests',
        atHardStop: 'emergency_stop',
      },
      ...config,
    };

    this.initializeUsage();
    this.startMonitoring();
  }

  /**
   * Initialize usage tracking
   */
  private initializeUsage(): void {
    this.currentUsage.set('inspector', 0);
    this.currentUsage.set('orchestrator', 0);

    // Listen to multi-provider accounting events
    this.multiProviderAccounting.on('usage:recorded', (data: any) => {
      this.handleUsageRecorded(data);
    });

    logger.info('TokenCapEnforcementManager', 'Token cap enforcement initialized', {
      inspectorLimit: this.config.inspector.totalLimit,
      orchestratorLimit: this.config.orchestrator.totalLimit,
      enforcementEnabled: this.config.enforcement.enabled,
    });
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    if (!this.config.enforcement.enabled) {
      logger.info('TokenCapEnforcementManager', 'Enforcement disabled');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkEnforcement();
    }, 5000); // Check every 5 seconds

    logger.info('TokenCapEnforcementManager', 'Started cap enforcement monitoring');
  }

  /**
   * Handle usage recorded from multi-provider accounting
   */
  private handleUsageRecorded(data: any): void {
    // This would integrate with actual inspector and orchestrator usage tracking
    // For now, we'll simulate usage allocation based on operation types
    const { operation, agentId } = data.record;

    if (agentId.includes('inspector') || operation.includes('inspector')) {
      const current = this.currentUsage.get('inspector') ?? 0;
      this.currentUsage.set('inspector', current + data.record.totalTokens);
    } else if (agentId.includes('orchestrator') || operation.includes('orchestrator')) {
      const current = this.currentUsage.get('orchestrator') ?? 0;
      this.currentUsage.set('orchestrator', current + data.record.totalTokens);
    }

    // Immediate check for critical thresholds
    this.checkImmediateEnforcement();
  }

  /**
   * Check for immediate enforcement (critical thresholds)
   */
  private checkImmediateEnforcement(): void {
    for (const component of ['inspector', 'orchestrator'] as const) {
      const usage = this.currentUsage.get(component) ?? 0;
      const limit = this.config[component].totalLimit;
      const percentage = (usage / limit) * 100;

      if (percentage >= this.config.enforcement.hardStopThreshold) {
        this.performEnforcement(component, 'hard_stop', percentage, usage, limit);
      }
    }
  }

  /**
   * Check enforcement for all components
   */
  private checkEnforcement(): void {
    const status = this.getCurrentStatus();

    // Check inspector
    this.checkComponentEnforcement('inspector', status.inspector);

    // Check orchestrator
    this.checkComponentEnforcement('orchestrator', status.orchestrator);

    // Update system status
    const systemStatus = this.determineSystemStatus(status);
    if (systemStatus !== status.systemStatus) {
      logger.info('TokenCapEnforcementManager', 'System status changed', {
        from: status.systemStatus,
        to: systemStatus,
      });
    }

    // Emit status update
    this.lastUpdate = TimeUtils.now();
    this.emit('status_update', {
      ...status,
      systemStatus,
      timestamp: this.lastUpdate,
    });
  }

  /**
   * Check enforcement for a specific component
   */
  private checkComponentEnforcement(
    component: 'inspector' | 'orchestrator',
    componentUsage: ComponentUsage
  ): void {
    const { percentage } = componentUsage;
    const thresholds = this.config.enforcement;

    // Only perform one enforcement action per check cycle
    if (percentage >= thresholds.hardStopThreshold) {
      this.performEnforcement(component, 'hard_stop', percentage, componentUsage.currentUsage, this.config[component].totalLimit);
    } else if (percentage >= thresholds.criticalWarningThreshold) {
      this.performEnforcement(component, 'critical_warning', percentage, componentUsage.currentUsage, this.config[component].totalLimit);
    } else if (percentage >= thresholds.moderateWarningThreshold) {
      this.performEnforcement(component, 'moderate_warning', percentage, componentUsage.currentUsage, this.config[component].totalLimit);
    } else if (percentage >= thresholds.softWarningThreshold) {
      this.performEnforcement(component, 'soft_warning', percentage, componentUsage.currentUsage, this.config[component].totalLimit);
    }
  }

  /**
   * Perform enforcement action
   */
  private performEnforcement(
    component: 'inspector' | 'orchestrator',
    severity: 'soft_warning' | 'moderate_warning' | 'critical_warning' | 'hard_stop',
    percentage: number,
    currentUsage: number,
    limit: number
  ): void {
    const actionType = this.getActionType(component, severity);

    const enforcement: EnforcementAction = {
      id: `${component}_${severity}_${Date.now()}`,
      timestamp: TimeUtils.now(),
      component,
      type: actionType,
      reason: `${component} usage at ${percentage.toFixed(1)}% (${currentUsage.toLocaleString()}/${limit.toLocaleString()} tokens)`,
      threshold: percentage,
      currentUsage,
      limit,
      percentage,
      details: {
        severity,
        enforcementPolicy: this.config.actions[`at${severity.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}` as keyof typeof this.config.actions],
        componentConfig: this.config[component],
      },
      resolved: false,
    };

    // Add to history and active enforcements
    this.enforcementHistory.push(enforcement);
    this.activeEnforcements.set(enforcement.id, enforcement);

    // Execute the action
    this.executeEnforcementAction(enforcement);

    // Emit enforcement event
    this.emit('enforcement_triggered', enforcement);

    logger.warn('TokenCapEnforcementManager', 'Enforcement action triggered', {
      component,
      actionType,
      percentage: percentage.toFixed(1),
      currentUsage,
      limit,
    });
  }

  /**
   * Get action type for enforcement
   */
  private getActionType(
    component: 'inspector' | 'orchestrator',
    severity: 'soft_warning' | 'moderate_warning' | 'critical_warning' | 'hard_stop'
  ): EnforcementAction['type'] {
    const policyKey = `at${severity.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}` as keyof typeof this.config.actions;
    const policy = this.config.actions[policyKey];

    switch (policy) {
      case 'log_warning':
        return 'warning_logged';
      case 'emit_signal':
        return 'signal_emitted';
      case 'throttle_requests':
        return 'requests_throttled';
      case 'reduce_context':
        return 'context_compacted';
      case 'block_new_requests':
        return 'requests_blocked';
      case 'emergency_compaction':
        return 'context_compacted';
      case 'force_context_compaction':
        return 'context_compacted';
      case 'emergency_stop':
        return 'emergency_stopped';
      default:
        return 'warning_logged';
    }
  }

  /**
   * Execute enforcement action
   */
  private executeEnforcementAction(enforcement: EnforcementAction): void {
    switch (enforcement.type) {
      case 'warning_logged':
        logger.warn('TokenCapEnforcementManager', enforcement.reason);
        break;

      case 'signal_emitted':
        this.emit('limit_warning', {
          component: enforcement.component,
          percentage: enforcement.percentage,
          enforcement,
        });
        break;

      case 'requests_throttled':
        logger.warn('TokenCapEnforcementManager', `Throttling ${enforcement.component} requests`);
        this.emit('requests_throttled', {
          component: enforcement.component,
          throttleLevel: 0.5, // 50% throttling
          enforcement,
        });
        break;

      case 'requests_blocked':
        logger.error('TokenCapEnforcementManager', `Blocking ${enforcement.component} requests`);
        this.emit('requests_blocked', {
          component: enforcement.component,
          enforcement,
        });
        break;

      case 'context_compacted':
        logger.info('TokenCapEnforcementManager', `Compacting ${enforcement.component} context`);
        this.emit('context_compaction_required', {
          component: enforcement.component,
          targetSize: Math.floor(enforcement.limit * 0.8), // Compact to 80% of limit
          enforcement,
        });
        break;

      case 'emergency_stopped':
        logger.error('TokenCapEnforcementManager', `EMERGENCY STOP for ${enforcement.component}`);
        this.emit('emergency_stop', {
          component: enforcement.component,
          enforcement,
        });
        break;
    }
  }

  /**
   * Determine system status
   */
  private determineSystemStatus(status: any): 'healthy' | 'degraded' | 'critical' {
    const inspectorStatus = status.inspector.status;
    const orchestratorStatus = status.orchestrator.status;

    if (inspectorStatus === 'blocked' || orchestratorStatus === 'blocked') {
      return 'critical';
    }

    if (inspectorStatus === 'critical' || orchestratorStatus === 'critical') {
      return 'critical';
    }

    if (inspectorStatus === 'warning' || orchestratorStatus === 'warning') {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get current enforcement status
   */
  getCurrentStatus(): CapEnforcementStatus {
    const inspectorUsage = this.currentUsage.get('inspector') ?? 0;
    const orchestratorUsage = this.currentUsage.get('orchestrator') ?? 0;

    const inspector: ComponentUsage = {
      component: 'inspector',
      currentUsage: inspectorUsage,
      limit: this.config.inspector.totalLimit,
      percentage: (inspectorUsage / this.config.inspector.totalLimit) * 100,
      status: this.getComponentStatus(inspectorUsage, this.config.inspector.totalLimit),
      enforcementHistory: this.enforcementHistory.filter(e => e.component === 'inspector'),
    };

    const orchestrator: ComponentUsage = {
      component: 'orchestrator',
      currentUsage: orchestratorUsage,
      limit: this.config.orchestrator.totalLimit,
      percentage: (orchestratorUsage / this.config.orchestrator.totalLimit) * 100,
      status: this.getComponentStatus(orchestratorUsage, this.config.orchestrator.totalLimit),
      enforcementHistory: this.enforcementHistory.filter(e => e.component === 'orchestrator'),
    };

    return {
      timestamp: TimeUtils.now(),
      inspector,
      orchestrator,
      systemStatus: 'healthy', // Will be updated by caller
      activeEnforcements: Array.from(this.activeEnforcements.values()),
      recommendations: this.generateRecommendations(inspector, orchestrator),
    };
  }

  /**
   * Get component status based on usage percentage
   */
  private getComponentStatus(usage: number, limit: number): ComponentUsage['status'] {
    const percentage = (usage / limit) * 100;

    if (percentage >= this.config.enforcement.hardStopThreshold) {
      return 'blocked';
    }

    if (percentage >= this.config.enforcement.criticalWarningThreshold) {
      return 'critical';
    }

    if (percentage >= this.config.enforcement.moderateWarningThreshold) {
      return 'warning';
    }

    return 'normal';
  }

  /**
   * Generate recommendations based on current usage
   */
  private generateRecommendations(inspector: ComponentUsage, orchestrator: ComponentUsage): string[] {
    const recommendations: string[] = [];

    if (inspector.status === 'warning' || inspector.status === 'critical') {
      recommendations.push('Consider reducing inspector context size');
      recommendations.push('Optimize inspector prompts for token efficiency');
    }

    if (orchestrator.status === 'warning' || orchestrator.status === 'critical') {
      recommendations.push('Limit orchestrator tool calls');
      recommendations.push('Reduce PRP context sent to orchestrator');
    }

    if (inspector.status === 'critical' || orchestrator.status === 'critical') {
      recommendations.push('Enable aggressive context compaction');
      recommendations.push('Consider emergency measures to prevent service interruption');
    }

    return recommendations;
  }

  /**
   * Manually record usage for a component
   */
  recordUsage(component: 'inspector' | 'orchestrator', tokens: number, metadata?: Record<string, unknown>): void {
    const current = this.currentUsage.get(component) ?? 0;
    this.currentUsage.set(component, current + tokens);

    logger.debug('TokenCapEnforcementManager', 'Usage recorded', {
      component,
      tokens,
      total: current + tokens,
      metadata,
    });

    // Check if this usage triggers immediate enforcement
    this.checkImmediateEnforcement();
  }

  /**
   * Reset usage for a component
   */
  resetUsage(component: 'inspector' | 'orchestrator'): void {
    this.currentUsage.set(component, 0);

    // Resolve active enforcements for this component
    for (const [id, enforcement] of Array.from(this.activeEnforcements.entries())) {
      if (enforcement.component === component) {
        enforcement.resolved = true;
        this.activeEnforcements.delete(id);
      }
    }

    logger.info('TokenCapEnforcementManager', 'Usage reset', { component });
  }

  /**
   * Resolve an enforcement action
   */
  resolveEnforcement(enforcementId: string): void {
    const enforcement = this.activeEnforcements.get(enforcementId);
    if (enforcement) {
      enforcement.resolved = true;
      this.activeEnforcements.delete(enforcementId);

      this.emit('enforcement_resolved', { enforcementId, timestamp: TimeUtils.now() });

      logger.info('TokenCapEnforcementManager', 'Enforcement resolved', { enforcementId });
    }
  }

  /**
   * Get enforcement history
   */
  getEnforcementHistory(hours = 24): EnforcementAction[] {
    const cutoff = TimeUtils.hoursAgo(hours);
    return this.enforcementHistory.filter(e => e.timestamp >= cutoff);
  }

  /**
   * Get configuration
   */
  getConfig(): CapEnforcementConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CapEnforcementConfig>): void {
    Object.assign(this.config, updates);
    logger.info('TokenCapEnforcementManager', 'Configuration updated', { updates });
  }

  /**
   * Stop enforcement monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.removeAllListeners();
    logger.info('TokenCapEnforcementManager', 'Token cap enforcement stopped');
  }
}