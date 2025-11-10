/**
 * ♫ Ephemeral Signal System
 *
 * Handles [HF] ephemeral signals and orchestration cycles
 */

import { EventEmitter } from 'events';
import { HashUtils, createLayerLogger } from '../shared';

const logger = createLayerLogger('orchestrator');

export interface EphemeralSignal {
  id: string;
  type: string; // Always [XX] format
  timestamp: Date;
  priority: number;
  source: string;
  data: unknown;
  ephemeral: boolean;
}

export interface SystemStatus {
  activeAgents: AgentStatus[];
  activePRPs: PRPStatus[];
  systemHealth: {
    scanner: 'online' | 'offline' | 'error';
    inspector: 'online' | 'offline' | 'error';
    orchestrator: 'online' | 'offline' | 'error';
  };
  resourceStatus: {
    tokens: TokenStatus;
    disk: DiskStatus;
    memory: MemoryStatus;
  };
}

export interface AgentStatus {
  id: string;
  type: string;
  status: 'idle' | 'working' | 'crashed' | 'terminated';
  currentPRP?: string;
  currentTask?: string;
  lastActivity: Date;
  terminalSession?: string;
  pid?: number;
}

export interface PRPStatus {
  id: string;
  name: string;
  branch: string;
  status: 'planning' | 'implementation' | 'testing' | 'review' | 'completed' | 'blocked';
  currentAgent?: string;
  currentSignal?: string;
  progress: number;
  lastUpdate: Date;
  doDMet: boolean;
  blockers: string[];
}

export interface TokenStatus {
  used: number;
  limit: number;
  percentage: number;
  approachingLimit: boolean;
}

export interface DiskStatus {
  used: number;
  limit: number;
  percentage: number;
  approachingLimit: boolean;
}

export interface MemoryStatus {
  used: number;
  limit: number;
  percentage: number;
  approachingLimit: boolean;
}

/**
 * Ephemeral Signal System Manager
 */
export class EphemeralSignalSystem extends EventEmitter {
  private currentStatus: SystemStatus;
  private signalHistory: EphemeralSignal[] = [];
  private activeCycles: Map<string, CycleState> = new Map();

  constructor() {
    super();
    this.currentStatus = {
      activeAgents: [],
      activePRPs: [],
      systemHealth: {
        scanner: 'online',
        inspector: 'online',
        orchestrator: 'online'
      },
      resourceStatus: {
        tokens: { used: 0, limit: 1000000, percentage: 0, approachingLimit: false },
        disk: { used: 0, limit: 100, percentage: 0, approachingLimit: false },
        memory: { used: 0, limit: 8192, percentage: 0, approachingLimit: false }
      }
    };
  }

  /**
   * Generate [HF] ephemeral signal with current system status
   */
  generateEphemeralSignal(): EphemeralSignal {
    const signal: EphemeralSignal = {
      id: HashUtils.generateId(),
      type: '[HF]', // Health Feedback ephemeral signal
      timestamp: new Date(),
      priority: 1, // Highest priority for system status
      source: 'system_monitor',
      data: {
        ...this.currentStatus,
        cycleContext: this.getCycleContext(),
        recommendations: this.generateRecommendations()
      },
      ephemeral: true
    };

    this.signalHistory.push(signal);
    logger.debug('EphemeralSignalSystem',
      `Generated [HF] signal with ${this.currentStatus.activePRPs.length} active PRPs`);

    return signal;
  }

  /**
   * Get current cycle context
   */
  private getCycleContext(): Record<string, unknown> {
    return {
      totalActivePRPs: this.currentStatus.activePRPs.length,
      workingAgents: this.currentStatus.activeAgents.filter(a => a.status === 'working').length,
      blockedPRPs: this.currentStatus.activePRPs.filter(p => p.blockers.length > 0).length,
      resourcePressure: this.calculateResourcePressure(),
      timeInCurrentCycle: this.getTimeInCurrentCycle()
    };
  }

  /**
   * Generate system recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Resource-based recommendations
    if (this.currentStatus.resourceStatus.tokens.approachingLimit) {
      recommendations.push('Token limit approaching - consider agent task redistribution');
    }

    if (this.currentStatus.resourceStatus.disk.approachingLimit) {
      recommendations.push('Disk space low - clean up temporary files and artifacts');
    }

    // Agent-based recommendations
    const crashedAgents = this.currentStatus.activeAgents.filter(a => a.status === 'crashed');
    if (crashedAgents.length > 0) {
      recommendations.push(`${crashedAgents.length} crashed agents need investigation`);
    }

    const idleAgents = this.currentStatus.activeAgents.filter(a => a.status === 'idle');
    if (idleAgents.length > 0 && this.currentStatus.activePRPs.length > 0) {
      recommendations.push(`${idleAgents.length} idle agents available for task assignment`);
    }

    // PRP-based recommendations
    const blockedPRPs = this.currentStatus.activePRPs.filter(p => p.blockers.length > 0);
    if (blockedPRPs.length > 0) {
      recommendations.push(`${blockedPRPs.length} PRPs blocked - prioritize blocker resolution`);
    }

    return recommendations;
  }

  /**
   * Calculate overall resource pressure
   */
  private calculateResourcePressure(): number {
    const tokenPressure = this.currentStatus.resourceStatus.tokens.percentage;
    const diskPressure = this.currentStatus.resourceStatus.disk.percentage;
    const memoryPressure = this.currentStatus.resourceStatus.memory.percentage;

    return Math.max(tokenPressure, diskPressure, memoryPressure);
  }

  /**
   * Get time in current cycle
   */
  private getTimeInCurrentCycle(): number {
    // This would track how long we've been in the current orchestration cycle
    return Date.now() - (this.activeCycles.get('main')?.startTime || Date.now());
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: Partial<AgentStatus>): void {
    const existingAgent = this.currentStatus.activeAgents.find(a => a.id === agentId);

    if (existingAgent) {
      Object.assign(existingAgent, status);
    } else {
      this.currentStatus.activeAgents.push({
        id: agentId,
        type: status.type || 'unknown',
        status: status.status || 'idle',
        lastActivity: new Date(),
        ...status
      });
    }

    logger.debug('EphemeralSignalSystem',
      `Agent ${agentId} status updated to ${status.status}`);
  }

  /**
   * Update PRP status
   */
  updatePRPStatus(prpId: string, status: Partial<PRPStatus>): void {
    const existingPRP = this.currentStatus.activePRPs.find(p => p.id === prpId);

    if (existingPRP) {
      Object.assign(existingPRP, status);
    } else {
      this.currentStatus.activePRPs.push({
        id: prpId,
        name: status.name || prpId,
        branch: status.branch || 'main',
        status: status.status || 'planning',
        progress: 0,
        lastUpdate: new Date(),
        doDMet: false,
        blockers: [],
        ...status
      });
    }

    logger.debug('EphemeralSignalSystem',
      `PRP ${prpId} status updated to ${status.status}`);
  }

  /**
   * Update system health
   */
  updateSystemHealth(component: 'scanner' | 'inspector' | 'orchestrator', status: 'online' | 'offline' | 'error'): void {
    this.currentStatus.systemHealth[component] = status;

    logger.info('EphemeralSignalSystem',
      `System health updated: ${component} is ${status}`);
  }

  /**
   * Update resource status
   */
  updateResourceStatus(type: 'tokens' | 'disk' | 'memory', status: Partial<TokenStatus | DiskStatus | MemoryStatus>): void {
    Object.assign(this.currentStatus.resourceStatus[type], status);

    logger.debug('EphemeralSignalSystem',
      `Resource ${type} status updated`);
  }

  /**
   * Process signal from scanner/agent
   */
  processSignal(signal: EphemeralSignal): void {
    // Update internal state based on signal
    this.updateStateFromSignal(signal);

    // Emit for orchestrator processing
    this.emit('signal_received', signal);

    logger.info('EphemeralSignalSystem',
      `Processed signal ${signal.type} from ${signal.source}`);
  }

  /**
   * Update system state from signal
   */
  private updateStateFromSignal(signal: EphemeralSignal): void {
    switch (signal.type) {
      case '[HF]':
        // Health feedback - already handled in generation
        break;

      case '[AS]':
        // User signal - direct to orchestrator
        this.emit('user_signal', signal);
        break;

      case '[AE]':
        // Emergency signal - high priority
        this.emit('emergency_signal', signal);
        break;

      case '[AA]':
        // Admin critical signal
        this.emit('admin_signal', signal);
        break;

      default:
        // Development cycle signals
        this.emit('development_signal', signal);
        break;
    }
  }

  /**
   * Get current system status
   */
  getCurrentStatus(): SystemStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get signal history
   */
  getSignalHistory(limit?: number): EphemeralSignal[] {
    const history = [...this.signalHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clean up old signals
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = new Date(Date.now() - maxAge);
    this.signalHistory = this.signalHistory.filter(signal => signal.timestamp > cutoff);

    logger.debug('EphemeralSignalSystem',
      `Cleaned up signals older than ${maxAge}ms`);
  }

  /**
   * Start cycle tracking
   */
  startCycle(cycleId: string = 'main'): void {
    this.activeCycles.set(cycleId, {
      id: cycleId,
      startTime: Date.now(),
      signalsProcessed: 0,
      tasksCompleted: 0
    });

    logger.info('EphemeralSignalSystem',
      `Started cycle ${cycleId}`);
  }

  /**
   * End cycle tracking
   */
  endCycle(cycleId: string = 'main'): CycleState | undefined {
    const cycle = this.activeCycles.get(cycleId);
    if (cycle) {
      cycle.endTime = Date.now();
      cycle.duration = cycle.endTime - cycle.startTime;

      this.activeCycles.delete(cycleId);

      logger.info('EphemeralSignalSystem',
        `Ended cycle ${cycleId} in ${cycle.duration}ms`);
    }

    return cycle;
  }

  /**
   * Get cycle statistics
   */
  getCycleStats(): Map<string, CycleState> {
    return new Map(this.activeCycles);
  }
}

export interface CycleState {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  signalsProcessed: number;
  tasksCompleted: number;
}

// Global instance
export const ephemeralSignalSystem = new EphemeralSignalSystem();