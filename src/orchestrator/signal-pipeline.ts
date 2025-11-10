/**
 * Unified Signal Processing Pipeline
 *
 * Orchestrates the complete flow: Scanner → Inspector → Orchestrator
 * Provides a single interface for managing signal processing workflows.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import { InspectorResult } from '../inspector/types';
import { ScannerInspectorBridge, ScannerInspectorBridgeConfig } from './scanner-inspector-bridge';
import { InspectorOrchestratorBridge, InspectorOrchestratorBridgeConfig } from './inspector-orchestrator-bridge';

export interface SignalPipelineConfig {
  // Bridge configurations
  scannerInspectorBridge?: ScannerInspectorBridgeConfig;
  inspectorOrchestratorBridge?: InspectorOrchestratorBridgeConfig;

  // Pipeline settings
  enableMetrics?: boolean;
  metricsInterval?: number;
  enableTracing?: boolean;

  // Performance settings
  maxConcurrentSignals?: number;
  signalTimeout?: number;
  enableBatching?: boolean;
  batchSize?: number;

  // Health monitoring
  healthCheckInterval?: number;
  enableAutoRecovery?: boolean;
}

export interface PipelineMetrics {
  totalSignals: number;
  processedSignals: number;
  failedSignals: number;
  averageLatency: number;
  throughput: number; // signals per second
  uptime: number;
  scannerMetrics?: any;
  inspectorMetrics?: any;
  orchestratorMetrics?: any;
}

export interface SignalTrace {
  id: string;
  signalId: string;
  stages: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    timestamp: Date;
    latency?: number;
    error?: string;
  }>;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Unified signal processing pipeline
 */
export class SignalPipeline extends EventEmitter {
  private config: Required<SignalPipelineConfig>;
  private metrics: PipelineMetrics;
  private traces: Map<string, SignalTrace> = new Map();
  private isRunning = false;
  private startTime?: Date;
  private metricsTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  // Components
  private scannerInspectorBridge: ScannerInspectorBridge;
  private inspectorOrchestratorBridge: InspectorOrchestratorBridge;

  // Component references
  private scanner?: any;
  private inspector?: any;
  private orchestrator?: any;

  constructor(config: SignalPipelineConfig = {}) {
    super();

    // Default configuration
    this.config = {
      scannerInspectorBridge: config.scannerInspectorBridge ?? {},
      inspectorOrchestratorBridge: config.inspectorOrchestratorBridge ?? {},
      enableMetrics: config.enableMetrics ?? true,
      metricsInterval: config.metricsInterval ?? 10000, // 10 seconds
      enableTracing: config.enableTracing ?? false,
      maxConcurrentSignals: config.maxConcurrentSignals ?? 50,
      signalTimeout: config.signalTimeout ?? 30000, // 30 seconds
      enableBatching: config.enableBatching ?? true,
      batchSize: config.batchSize ?? 10,
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30 seconds
      enableAutoRecovery: config.enableAutoRecovery ?? true
    };

    this.metrics = {
      totalSignals: 0,
      processedSignals: 0,
      failedSignals: 0,
      averageLatency: 0,
      throughput: 0,
      uptime: 0
    };

    // Initialize bridges
    this.scannerInspectorBridge = new ScannerInspectorBridge(this.config.scannerInspectorBridge);
    this.inspectorOrchestratorBridge = new InspectorOrchestratorBridge(this.config.inspectorOrchestratorBridge);

    this.setupBridgeEventHandlers();
  }

  /**
   * Start the signal pipeline
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('SignalPipeline is already running');
    }

    this.startTime = new Date();
    this.isRunning = true;

    try {
      // Start bridges
      await this.scannerInspectorBridge.start();
      await this.inspectorOrchestratorBridge.start();

      // Start monitoring
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }
      this.startHealthMonitoring();

      this.emit('pipeline:started', {
        timestamp: this.startTime,
        config: this.config
      });

      console.log('🚀 Signal Pipeline started successfully');

    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the signal pipeline
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    try {
      // Stop monitoring
      if (this.metricsTimer) {
        clearInterval(this.metricsTimer);
      }
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }

      // Stop bridges
      await this.scannerInspectorBridge.stop();
      await this.inspectorOrchestratorBridge.stop();

      // Clean up
      this.removeAllListeners();
      this.traces.clear();

      this.emit('pipeline:stopped', {
        timestamp: new Date(),
        metrics: this.metrics
      });

      console.log('🛑 Signal Pipeline stopped');

    } catch (error) {
      console.error('Error stopping pipeline:', error);
      throw error;
    }
  }

  /**
   * Connect scanner component
   */
  connectScanner(scanner: any): void {
    this.scanner = scanner;
    this.scannerInspectorBridge.connectScanner(scanner);

    this.emit('pipeline:scanner_connected', { scanner: scanner.constructor.name });
  }

  /**
   * Connect inspector component
   */
  connectInspector(inspector: any): void {
    this.inspector = inspector;
    this.scannerInspectorBridge.connectInspector(inspector);
    this.inspectorOrchestratorBridge.connectInspector(inspector);

    this.emit('pipeline:inspector_connected', { inspector: inspector.constructor.name });
  }

  /**
   * Connect orchestrator component
   */
  connectOrchestrator(orchestrator: any): void {
    this.orchestrator = orchestrator;
    this.inspectorOrchestratorBridge.connectOrchestrator(orchestrator);

    this.emit('pipeline:orchestrator_connected', { orchestrator: orchestrator.constructor.name });
  }

  /**
   * Process signals through the complete pipeline
   */
  async processSignals(signals: Signal[]): Promise<string[]> {
    if (!this.isRunning) {
      throw new Error('SignalPipeline is not running');
    }

    if (signals.length === 0) {
      return [];
    }

    const traceIds: string[] = [];
    const startTime = Date.now();

    try {
      // Create traces if enabled
      if (this.config.enableTracing) {
        for (const signal of signals) {
          const traceId = this.createSignalTrace(signal);
          traceIds.push(traceId);
          this.updateTraceStage(traceId, 'scanner', 'in_progress');
        }
      }

      // Update metrics
      this.metrics.totalSignals += signals.length;

      // Forward signals to scanner-inspector bridge
      // This will trigger the complete pipeline flow
      for (const signal of signals) {
        this.scannerInspectorBridge.emit('signals_detected', [signal], 'pipeline');
      }

      // Calculate latency
      const latency = Date.now() - startTime;
      this.updateMetrics(latency, signals.length);

      this.emit('pipeline:signals_processed', {
        signalCount: signals.length,
        traceIds,
        latency
      });

      return traceIds;

    } catch (error) {
      this.metrics.failedSignals += signals.length;

      // Update traces with error
      if (this.config.enableTracing) {
        for (const traceId of traceIds) {
          this.updateTraceStage(traceId, 'pipeline', 'failed', error instanceof Error ? error.message : String(error));
        }
      }

      this.emit('pipeline:error', {
        error: error instanceof Error ? error : new Error(String(error)),
        signalCount: signals.length
      });

      throw error;
    }
  }

  /**
   * Get pipeline status
   */
  getStatus(): {
    isRunning: boolean;
    connectedComponents: {
      scanner: boolean;
      inspector: boolean;
      orchestrator: boolean;
    };
    metrics: PipelineMetrics;
    bridgeStatus: {
      scannerInspector: any;
      inspectorOrchestrator: any;
    };
    } {
    return {
      isRunning: this.isRunning,
      connectedComponents: {
        scanner: !!this.scanner,
        inspector: !!this.inspector,
        orchestrator: !!this.orchestrator
      },
      metrics: this.getMetrics(),
      bridgeStatus: {
        scannerInspector: this.scannerInspectorBridge.getStatus(),
        inspectorOrchestrator: this.inspectorOrchestratorBridge.getStatus()
      }
    };
  }

  /**
   * Get pipeline metrics
   */
  getMetrics(): PipelineMetrics {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    const throughput = uptime > 0 ? (this.metrics.processedSignals / (uptime / 1000)) : 0;

    return {
      ...this.metrics,
      uptime,
      throughput,
      scannerMetrics: this.scannerInspectorBridge.getMetrics(),
      inspectorMetrics: this.inspectorOrchestratorBridge.getMetrics()
    };
  }

  /**
   * Get signal traces
   */
  getTraces(): SignalTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): SignalTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Clear old traces
   */
  clearTraces(olderThan?: Date): number {
    const cutoff = olderThan || new Date(Date.now() - 3600000); // Default 1 hour
    let cleared = 0;

    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < cutoff) {
        this.traces.delete(traceId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Process dead letter queues
   */
  async processDeadLetterQueues(): Promise<void> {
    console.log('🔄 Processing dead letter queues...');

    try {
      await this.scannerInspectorBridge.processDeadLetterQueue();
      await this.inspectorOrchestratorBridge.processDeadLetterQueue();

      this.emit('pipeline:dead_letter_queues_processed');

    } catch (error) {
      console.error('Failed to process dead letter queues:', error);
      this.emit('pipeline:error', {
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'dead_letter_queue_processing'
      });
    }
  }

  /**
   * Set up event handlers for bridges
   */
  private setupBridgeEventHandlers(): void {
    // Scanner-Inspector Bridge events
    this.scannerInspectorBridge.on('bridge:signals_processed', (data: any) => {
      if (this.config.enableTracing) {
        // Update traces for scanner stage
        this.updateTraceStages('scanner', 'completed', data.latency);
      }

      this.emit('pipeline:stage_completed', {
        stage: 'scanner_inspector',
        data
      });
    });

    this.scannerInspectorBridge.on('bridge:error', (data: any) => {
      if (this.config.enableTracing) {
        this.updateTraceStages('scanner', 'failed', data.error?.message);
      }

      this.metrics.failedSignals++;
      this.emit('pipeline:stage_error', {
        stage: 'scanner_inspector',
        data
      });
    });

    // Inspector-Orchestrator Bridge events
    this.inspectorOrchestratorBridge.on('bridge:payload_forwarded', (data: any) => {
      if (this.config.enableTracing) {
        this.updateTraceStages('inspector', 'completed');
        this.updateTraceStages('orchestrator', 'in_progress');
      }

      this.metrics.processedSignals++;
      this.emit('pipeline:stage_completed', {
        stage: 'inspector_orchestrator',
        data
      });
    });

    this.inspectorOrchestratorBridge.on('bridge:decision_completed', (data: any) => {
      if (this.config.enableTracing) {
        this.updateTraceStages('orchestrator', 'completed');
      }

      this.emit('pipeline:flow_completed', {
        decisionId: data.decisionId,
        outcome: data.outcome
      });
    });

    this.inspectorOrchestratorBridge.on('bridge:error', (data: any) => {
      if (this.config.enableTracing) {
        this.updateTraceStages('orchestrator', 'failed', data.error?.message);
      }

      this.metrics.failedSignals++;
      this.emit('pipeline:stage_error', {
        stage: 'inspector_orchestrator',
        data
      });
    });
  }

  /**
   * Create signal trace
   */
  private createSignalTrace(signal: Signal): string {
    const traceId = `trace-${signal.id}-${Date.now()}`;
    const trace: SignalTrace = {
      id: traceId,
      signalId: signal.id,
      stages: [
        { name: 'pipeline', status: 'in_progress', timestamp: new Date() },
        { name: 'scanner', status: 'pending', timestamp: new Date() },
        { name: 'inspector', status: 'pending', timestamp: new Date() },
        { name: 'orchestrator', status: 'pending', timestamp: new Date() }
      ],
      startTime: new Date(),
      status: 'in_progress'
    };

    this.traces.set(traceId, trace);
    return traceId;
  }

  /**
   * Update trace stage
   */
  private updateTraceStage(traceId: string, stageName: string, status: SignalTrace['status'], error?: string): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      return;
    }

    const stage = trace.stages.find(s => s.name === stageName);
    if (stage) {
      stage.status = status;
      if (error) {
        stage.error = error;
      }
      if (status === 'completed') {
        stage.latency = Date.now() - stage.timestamp.getTime();
      }
    }

    // Update overall trace status
    if (status === 'failed') {
      trace.status = 'failed';
      trace.endTime = new Date();
    } else if (status === 'completed' && stageName === 'orchestrator') {
      trace.status = 'completed';
      trace.endTime = new Date();
    }
  }

  /**
   * Update trace stages by name
   */
  private updateTraceStages(stageName: string, status: SignalTrace['status'], error?: string): void {
    for (const trace of this.traces.values()) {
      this.updateTraceStage(trace.id, stageName, status, error);
    }
  }

  /**
   * Update pipeline metrics
   */
  private updateMetrics(latency: number, signalCount: number = 1): void {
    // Update average latency
    const totalSignals = this.metrics.processedSignals + this.metrics.failedSignals;
    if (totalSignals > 0) {
      this.metrics.averageLatency =
        (this.metrics.averageLatency * (totalSignals - signalCount) + latency) / totalSignals;
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      const metrics = this.getMetrics();
      this.emit('pipeline:metrics', metrics);
    }, this.config.metricsInterval);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const health = {
      pipeline: this.isRunning,
      components: {
        scanner: !!this.scanner,
        inspector: !!this.inspector,
        orchestrator: !!this.orchestrator
      },
      bridges: {
        scannerInspector: this.scannerInspectorBridge.getStatus().isRunning,
        inspectorOrchestrator: this.inspectorOrchestratorBridge.getStatus().isRunning
      },
      metrics: this.getMetrics()
    };

    this.emit('pipeline:health_check', health);

    // Auto-recovery if enabled
    if (this.config.enableAutoRecovery) {
      this.performAutoRecovery(health);
    }
  }

  /**
   * Perform auto-recovery
   */
  private performAutoRecovery(health: any): void {
    // Check for bridge issues
    if (!health.bridges.scannerInspector && this.scannerInspectorBridge) {
      console.warn('⚠️ Scanner-Inspector bridge down, attempting recovery...');
      // Recovery logic would go here
    }

    if (!health.bridges.inspectorOrchestrator && this.inspectorOrchestratorBridge) {
      console.warn('⚠️ Inspector-Orchestrator bridge down, attempting recovery...');
      // Recovery logic would go here
    }
  }
}