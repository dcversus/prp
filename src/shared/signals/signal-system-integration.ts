/**
 * ♫ Main Signal System Integration for @dcversus/prp
 *
 * This is the main entry point that connects all signal system components:
 * - Signal detection (Scanner)
 * - Event distribution (EventBus)
 * - Agent log streaming (Tmux)
 * - TUI signal subscription
 * - Pipeline processing (Orchestrator)
 *
 * Usage:
 * ```typescript
 * import { signalSystemIntegration } from './signal-system-integration';
 *
 * // Initialize the complete signal system
 * await signalSystemIntegration.initialize();
 *
 * // Start signal processing
 * await signalSystemIntegration.start();
 *
 * // Process a file for signals
 * const signals = await signalSystemIntegration.processFile(filePath, content);
 *
 * // Get current status
 * const status = signalSystemIntegration.getStatus();
 * ```
 */

import { createLayerLogger } from '../index';
import { unifiedSignalDetector } from '../../scanner/unified-signal-detector';
import { createAgentLogStreamingManager } from '../../orchestrator/agent-log-streaming';

import { EventBusIntegrationManager } from './event-bus-integration';
import { SignalFlowCoordinator } from './signal-flow-coordinator';

import type { TmuxManagerAPI } from '../types/tmux';
import type { SignalEvent, SignalStatus } from '../types/signals';

const logger = createLayerLogger('signals');

/**
 * Signal System Integration Configuration
 */
export interface SignalSystemConfig {
  // Core components
  eventBus: {
    enabled: boolean;
    maxHistorySize: number;
  };
  signalDetector: {
    enabled: boolean;
    cacheSize: number;
    debounceTime: number;
  };
  signalFlow: {
    enabled: boolean;
    batchSize: number;
    processingInterval: number;
  };
  agentStreaming: {
    enabled: boolean;
    autoDiscovery: boolean;
    monitorInterval: number;
  };
  // Performance settings
  performance: {
    enableMetrics: boolean;
    metricsInterval: number;
    alertThresholds: {
      latency: number;
      errorRate: number;
      queueSize: number;
    };
  };
}

/**
 * System Status Information
 */
export interface SignalSystemStatus {
  initialized: boolean;
  running: boolean;
  components: {
    eventBus: {
      initialized: boolean;
      subscribers: number;
      eventHistory: number;
    };
    signalDetector: {
      connected: boolean;
      patterns: number;
      metrics: any;
    };
    signalFlow: {
      initialized: boolean;
      processing: boolean;
      queueSize: number;
    };
    agentStreaming: {
      enabled: boolean;
      activeAgents: number;
      activeStreams: number;
    };
  };
  performance: {
    totalSignals: number;
    processingRate: number;
    averageLatency: number;
    errorRate: number;
  };
}

/**
 * Main Signal System Integration Class
 *
 * Provides a unified interface for the complete signal system
 * with automatic component initialization and lifecycle management.
 */
export class SignalSystemIntegration {
  private static instance: SignalSystemIntegration | null = null;

  private readonly config: SignalSystemConfig;
  private isInitialized = false;
  private isRunning = false;

  // Component instances
  private readonly eventBus: EventBusIntegrationManager;
  private readonly signalFlow: SignalFlowCoordinator;
  private agentLogStreaming: any;

  constructor(config: Partial<SignalSystemConfig> = {}) {
    // Default configuration
    this.config = {
      eventBus: {
        enabled: true,
        maxHistorySize: 1000,
        ...config.eventBus,
      },
      signalDetector: {
        enabled: true,
        cacheSize: 10000,
        debounceTime: 50,
        ...config.signalDetector,
      },
      signalFlow: {
        enabled: true,
        batchSize: 50,
        processingInterval: 100,
        ...config.signalFlow,
      },
      agentStreaming: {
        enabled: true,
        autoDiscovery: true,
        monitorInterval: 5000,
        ...config.agentStreaming,
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 5000,
        alertThresholds: {
          latency: 1000,
          errorRate: 5,
          queueSize: 1000,
        },
        ...config.performance?.alertThresholds,
      },
      ...config,
    };

    // Initialize components
    this.eventBus = EventBusIntegrationManager.getInstance();
    this.signalFlow = SignalFlowCoordinator.getInstance({
      scanner: this.config.signalDetector,
      eventProcessing: {
        batchSize: this.config.signalFlow.batchSize,
        processingInterval: this.config.signalFlow.processingInterval,
        maxConcurrency: 10,
      },
      routing: {
        enableFiltering: true,
        enableDeduplication: true,
        enablePrioritization: true,
      },
      monitoring: {
        enabled: this.config.performance.enableMetrics,
        metricsInterval: this.config.performance.metricsInterval,
        alertThresholds: this.config.performance.alertThresholds,
      },
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<SignalSystemConfig>): SignalSystemIntegration {
    if (!SignalSystemIntegration.instance) {
      SignalSystemIntegration.instance = new SignalSystemIntegration(config);
    }
    return SignalSystemIntegration.instance;
  }

  /**
   * Initialize all signal system components
   */
  async initialize(tmuxManager?: TmuxManagerAPI): Promise<void> {
    if (this.isInitialized) {
      logger.warn('SignalSystemIntegration', 'Signal system already initialized');
      return;
    }

    try {
      logger.info('SignalSystemIntegration', 'Initializing signal system...');

      // Initialize EventBus
      if (this.config.eventBus.enabled) {
        await this.eventBus.initialize();
        logger.info('SignalSystemIntegration', '✅ EventBus initialized');
      }

      // Initialize signal flow coordinator
      if (this.config.signalFlow.enabled) {
        await this.signalFlow.initialize();
        logger.info('SignalSystemIntegration', '✅ Signal flow coordinator initialized');
      }

      // Initialize agent log streaming
      if (this.config.agentStreaming.enabled && tmuxManager) {
        this.agentLogStreaming = createAgentLogStreamingManager(tmuxManager, {
          autoDiscovery: this.config.agentStreaming.autoDiscovery,
          monitorInterval: this.config.agentStreaming.monitorInterval,
        });
        await this.agentLogStreaming.initialize();
        logger.info('SignalSystemIntegration', '✅ Agent log streaming initialized');
      }

      this.isInitialized = true;
      logger.info('SignalSystemIntegration', '✅ Signal system initialization complete');

    } catch (error) {
      logger.error('SignalSystemIntegration', 'Failed to initialize signal system', error as Error);
      throw error;
    }
  }

  /**
   * Start the signal system
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Signal system not initialized');
    }

    if (this.isRunning) {
      logger.warn('SignalSystemIntegration', 'Signal system already running');
      return;
    }

    try {
      logger.info('SignalSystemIntegration', 'Starting signal system...');

      // Start signal flow coordinator
      if (this.config.signalFlow.enabled) {
        await this.signalFlow.start();
      }

      // Start agent log streaming
      if (this.config.agentStreaming.enabled && this.agentLogStreaming) {
        // Agent log streaming is started automatically during initialization
      }

      this.isRunning = true;
      logger.info('SignalSystemIntegration', '✅ Signal system started successfully');

    } catch (error) {
      logger.error('SignalSystemIntegration', 'Failed to start signal system', error as Error);
      throw error;
    }
  }

  /**
   * Stop the signal system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('SignalSystemIntegration', 'Stopping signal system...');

      // Stop signal flow coordinator
      await this.signalFlow.stop();

      // Stop agent log streaming
      if (this.agentLogStreaming) {
        await this.agentLogStreaming.cleanup();
      }

      this.isRunning = false;
      logger.info('SignalSystemIntegration', '✅ Signal system stopped');

    } catch (error) {
      logger.error('SignalSystemIntegration', 'Failed to stop signal system', error as Error);
    }
  }

  /**
   * Process a file for signal detection
   */
  async processFile(filePath: string, content: string): Promise<SignalEvent[]> {
    if (!this.isInitialized) {
      throw new Error('Signal system not initialized');
    }

    try {
      // Detect signals in content
      const signals = await this.eventBus.detectSignalsInContent(filePath, content);

      // Process through signal flow coordinator
      await this.signalFlow.processSignal(filePath, content);

      return signals;

    } catch (error) {
      logger.error('SignalSystemIntegration', 'Failed to process file', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Process agent log entry for signal detection
   */
  async processAgentLog(agentId: string, logEntry: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Signal system not initialized');
    }

    try {
      await this.eventBus.processAgentLogEntry(agentId, logEntry);

    } catch (error) {
      logger.error('SignalSystemIntegration', 'Failed to process agent log', error as Error, { agentId });
    }
  }

  /**
   * Start streaming logs for a specific agent
   */
  async startAgentStreaming(sessionId: string, agentId: string): Promise<void> {
    if (!this.isInitialized || !this.agentLogStreaming) {
      throw new Error('Agent log streaming not available');
    }

    await this.agentLogStreaming.startAgentStreaming(sessionId, agentId);
  }

  /**
   * Stop streaming logs for a specific agent
   */
  async stopAgentStreaming(sessionId: string): Promise<void> {
    if (!this.agentLogStreaming) {
      return;
    }

    await this.agentLogStreaming.stopAgentStreaming(sessionId);
  }

  /**
   * Get EventBus instance for TUI integration
   */
  getEventBus() {
    return this.eventBus;
  }

  /**
   * Get recent signal events
   */
  getRecentSignals(count = 10): SignalEvent[] {
    return this.eventBus.getRecentEvents(count);
  }

  /**
   * Get signals by type
   */
  getSignalsByType(type: string, count = 50): SignalEvent[] {
    return this.eventBus.getEventsByType(type, count);
  }

  /**
   * Get system status
   */
  getStatus(): SignalSystemStatus {
    const eventBusStatus = this.eventBus.getIntegrationStatus();
    const signalDetectorMetrics = this.eventBus.getSignalDetectorMetrics();
    const signalFlowMetrics = this.signalFlow.getMetrics();
    const signalFlowQueue = this.signalFlow.getQueueStatus();

    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      components: {
        eventBus: {
          initialized: eventBusStatus.initialized,
          subscribers: eventBusStatus.subscribers.total,
          eventHistory: eventBusStatus.eventHistory.total,
        },
        signalDetector: {
          connected: eventBusStatus.signalDetector.connected,
          patterns: signalDetectorMetrics.patternCount,
          metrics: signalDetectorMetrics,
        },
        signalFlow: {
          initialized: true, // Assumed if we have metrics
          processing: this.isRunning,
          queueSize: signalFlowQueue.queueSize,
        },
        agentStreaming: {
          enabled: this.config.agentStreaming.enabled,
          activeAgents: eventBusStatus.agentStreaming.totalStreams,
          activeStreams: eventBusStatus.agentStreaming.totalStreams,
        },
      },
      performance: {
        totalSignals: signalFlowMetrics.totalSignals,
        processingRate: signalFlowMetrics.throughput,
        averageLatency: signalFlowMetrics.averageLatency,
        errorRate: signalFlowMetrics.errorRate,
      },
    };
  }

  /**
   * Add custom signal pattern
   */
  addCustomSignalPattern(pattern: {
    id: string;
    name: string;
    pattern: RegExp;
    priority: number;
  }): void {
    this.eventBus.addCustomSignalPattern(pattern);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      eventBus: this.eventBus.getIntegrationStatus(),
      signalDetector: this.eventBus.getSignalDetectorMetrics(),
      signalFlow: this.signalFlow.getMetrics(),
      agentStreaming: this.agentLogStreaming ? {
        activeStreams: this.agentLogStreaming.getActiveStreams(),
        activeSessions: this.agentLogStreaming.getActiveSessions(),
      } : null,
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stop();

      if (this.eventBus) {
        await this.eventBus.cleanup();
      }

      if (this.agentLogStreaming) {
        await this.agentLogStreaming.cleanup();
      }

      if (this.signalFlow) {
        await this.signalFlow.cleanup();
      }

      this.isInitialized = false;
      logger.info('SignalSystemIntegration', '✅ Signal system cleaned up');

    } catch (error) {
      logger.error('SignalSystemIntegration', 'Failed to cleanup signal system', error as Error);
    }
  }
}

// Export singleton instance
export const signalSystemIntegration = SignalSystemIntegration.getInstance();

// Export convenience functions
export async function initializeSignalSystem(config?: Partial<SignalSystemConfig>, tmuxManager?: TmuxManagerAPI): Promise<SignalSystemIntegration> {
  const system = SignalSystemIntegration.getInstance(config);
  await system.initialize(tmuxManager);
  return system;
}

export async function startSignalSystem(config?: Partial<SignalSystemConfig>, tmuxManager?: TmuxManagerAPI): Promise<SignalSystemIntegration> {
  const system = await initializeSignalSystem(config, tmuxManager);
  await system.start();
  return system;
}