/**
 * 🚀 Optimized Orchestrator for @dcversus/prp
 *
 * Performance optimizations:
 * - Lazy agent loading
 * - Efficient context management
 * - Memory-optimized decision making
 * - Batch processing of signals
 * - Caching of LLM calls
 * - Resource pooling
 */

import { EventEmitter } from 'events';
import { performanceManager, LazyImport } from '../performance/index.js';

// Logger that can be replaced with proper logging implementation
const createLogger = () => {
  // If a proper logger is available, use it; otherwise use process.stdout/stderr
  const logStream = process.stdout;
  const errorStream = process.stderr;

  return {
    info: (message: string) => {
      logStream.write(`${message}\n`);
    },
    warn: (message: string) => {
      logStream.write(`WARNING: ${message}\n`);
    },
    error: (message: string) => {
      errorStream.write(`ERROR: ${message}\n`);
    }
  };
};

const logger = createLogger();

export interface OptimizedOrchestratorConfig {
  maxMemoryMB?: number;
  cacheEnabled?: boolean;
  batchSize?: number;
  agentTimeoutMs?: number;
  decisionCacheSize?: number;
  maxConcurrentAgents?: number;
}

export interface AgentSession {
  id: string;
  type: string;
  status: 'idle' | 'busy' | 'error' | 'stopped';
  startTime: number;
  lastActivity: number;
  memoryUsage?: number;
  taskCount: number;
}

export interface DecisionCache {
  [key: string]: {
    decision: unknown;
    timestamp: number;
    hits: number;
  };
}

export interface ResourcePool {
  agents: Map<string, AgentSession>;
  availableSlots: number;
  maxSlots: number;
}

/**
 * Memory-optimized context manager
 */
class OptimizedContextManager {
  private contexts = new Map<string, { data: unknown; lastAccess: number; size: number }>();
  private maxContexts = 100;
  private maxSizeMB = 50;
  private currentSizeMB = 0;

  set(key: string, data: unknown): void {
    const size = this.estimateSize(data);
    const sizeMB = size / 1024 / 1024;

    // Check memory limits
    if (sizeMB > this.maxSizeMB) {
      logger.warn(`⚠️ Context too large: ${sizeMB.toFixed(2)}MB, skipping`);
      return;
    }

    // Remove old contexts if needed
    while (this.contexts.size >= this.maxContexts || this.currentSizeMB + sizeMB > this.maxSizeMB) {
      this.evictOldestContext();
    }

    this.contexts.set(key, {
      data,
      lastAccess: Date.now(),
      size
    });

    this.currentSizeMB += sizeMB;
  }

  get(key: string): unknown {
    const context = this.contexts.get(key);
    if (context) {
      context.lastAccess = Date.now();
      return context.data;
    }
    return null;
  }

  has(key: string): boolean {
    const context = this.contexts.get(key);
    if (context) {
      context.lastAccess = Date.now();
      return true;
    }
    return false;
  }

  private evictOldestContext(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, context] of this.contexts.entries()) {
      if (context.lastAccess < oldestTime) {
        oldestTime = context.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const context = this.contexts.get(oldestKey);
      if (context) {
        this.currentSizeMB -= context.size / 1024 / 1024;
        this.contexts.delete(oldestKey);
      }
    }
  }

  private estimateSize(obj: unknown): number {
    return JSON.stringify(obj).length * 2; // Rough estimate
  }

  clear(): void {
    this.contexts.clear();
    this.currentSizeMB = 0;
  }

  getStats(): { count: number; sizeMB: number } {
    return {
      count: this.contexts.size,
      sizeMB: this.currentSizeMB
    };
  }
}

/**
 * Lazy agent loader with resource pooling
 */
class LazyAgentLoader {
  private agentLoaders = new Map<string, LazyImport<unknown>>();
  private agentPool = new Map<string, unknown[]>();
  private maxPoolSize = 5;

  constructor() {
    // Pre-configure lazy loaders for common agent types
    this.setupAgentLoaders();
  }

  private setupAgentLoaders(): void {
    this.agentLoaders.set('system-analyst', new LazyImport(
      () => import('../agents/robo-system-analyst.js')
    ));

    this.agentLoaders.set('developer', new LazyImport(
      () => import('../agents/robo-developer.js')
    ));

    this.agentLoaders.set('quality-control', new LazyImport(
      () => import('../agents/robo-quality-control.js')
    ));

    this.agentLoaders.set('ux-ui-designer', new LazyImport(
      () => import('../agents/robo-ux-ui-designer.js')
    ));

    this.agentLoaders.set('devops-sre', new LazyImport(
      () => import('../agents/robo-devops-sre.js')
    ));
  }

  async getAgent(type: string): Promise<unknown> {
    // Check pool first
    const pool = this.agentPool.get(type);
    if (pool && pool.length > 0) {
      return pool.pop();
    }

    // Load agent lazily
    const loader = this.agentLoaders.get(type);
    if (!loader) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    return loader.getValue();
  }

  returnAgent(type: string, agent: unknown): void {
    const pool = this.agentPool.get(type) ?? [];
    if (pool.length < this.maxPoolSize) {
      pool.push(agent);
      this.agentPool.set(type, pool);
    }
  }

  getAvailableTypes(): string[] {
    return Array.from(this.agentLoaders.keys());
  }
}

/**
 * Decision cache with LRU eviction
 */
class DecisionCacheManager {
  private cache: DecisionCache = {};
  private maxSize = 1000;
  private hits = 0;
  private misses = 0;

  get(key: string): unknown {
    const cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes TTL
      cached.hits++;
      this.hits++;
      return cached.decision;
    }

    this.misses++;
    return null;
  }

  set(key: string, decision: unknown): void {
    if (Object.keys(this.cache).length >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache[key] = {
      decision,
      timestamp: Date.now(),
      hits: 0
    };
  }

  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastHits = Infinity;

    for (const [key, entry] of Object.entries(this.cache)) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      delete this.cache[leastUsedKey];
    }
  }

  clear(): void {
    this.cache = {};
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: Object.keys(this.cache).length,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }
}

/**
 * Optimized orchestrator with all performance improvements
 */
export class OptimizedOrchestrator extends EventEmitter {
  private config: OptimizedOrchestratorConfig;
  private contextManager: OptimizedContextManager;
  private agentLoader: LazyAgentLoader;
  private decisionCache: DecisionCacheManager;
  private resourcePool: ResourcePool;
  private isRunning = false;
  private signalQueue: unknown[] = [];

  // Performance metrics
  private metrics = {
    decisionsMade: 0,
    agentsSpawned: 0,
    cacheHits: 0,
    avgDecisionTime: 0,
    memoryUsage: 0
  };

  constructor(config: OptimizedOrchestratorConfig = {}) {
    super();

    this.config = {
      maxMemoryMB: 200,
      cacheEnabled: true,
      batchSize: 10,
      agentTimeoutMs: 30000,
      decisionCacheSize: 1000,
      maxConcurrentAgents: 5,
      ...config
    };

    this.contextManager = new OptimizedContextManager();
    this.agentLoader = new LazyAgentLoader();
    this.decisionCache = new DecisionCacheManager();
    this.resourcePool = {
      agents: new Map(),
      availableSlots: this.config.maxConcurrentAgents ?? 5,
      maxSlots: this.config.maxConcurrentAgents ?? 5
    };

    this.setupMemoryMonitoring();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Orchestrator is already running');
      return;
    }

    performanceManager.startOperation('orchestrator-startup');

    try {
      logger.info('🚀 Starting optimized orchestrator...');

      // Initialize resource pool
      this.initializeResourcePool();

      // Start processing signals in batches
      this.startBatchProcessing();

      this.isRunning = true;
      performanceManager.endOperation('orchestrator-startup');

      logger.info('✅ Optimized orchestrator started successfully');
      this.emit('started');

    } catch (error) {
      performanceManager.endOperation('orchestrator-startup');
      logger.error(`❌ Failed to start orchestrator: ${error}`);
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    performanceManager.startOperation('orchestrator-shutdown');

    try {
      logger.info('🛑 Stopping optimized orchestrator...');

      // Stop all agents
      await this.stopAllAgents();

      // Clear caches
      this.contextManager.clear();
      this.decisionCache.clear();

      // Clear signal queue
      this.signalQueue = [];

      this.isRunning = false;
      performanceManager.endOperation('orchestrator-shutdown');

      logger.info('✅ Optimized orchestrator stopped');
      this.emit('stopped');

    } catch (error) {
      performanceManager.endOperation('orchestrator-shutdown');
      logger.error(`❌ Failed to stop orchestrator: ${error}`);
      this.emit('error', error);
      throw error;
    }
  }

  async processSignal(signal: unknown): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Orchestrator is not running, queuing signal');
      this.signalQueue.push(signal);
      return;
    }

    performanceManager.startOperation('signal-processing');

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(signal);
      if (this.config.cacheEnabled) {
        const cachedDecision = this.decisionCache.get(cacheKey);
        if (cachedDecision) {
          this.metrics.cacheHits++;
          performanceManager.endOperation('signal-processing');
          this.emit('decision', cachedDecision);
          return;
        }
      }

      // Make decision
      const decision = await this.makeDecision(signal);

      // Cache decision
      if (this.config.cacheEnabled) {
        this.decisionCache.set(cacheKey, decision);
      }

      // Update metrics
      this.metrics.decisionsMade++;

      performanceManager.endOperation('signal-processing');
      this.emit('decision', decision);

    } catch (error) {
      performanceManager.endOperation('signal-processing');
      logger.error(`❌ Failed to process signal: ${error}`);
      this.emit('error', error);
    }
  }

  private async makeDecision(signal: unknown): Promise<unknown> {
    performanceManager.startOperation('decision-analysis');

    try {
      // Get context for decision
      const context = this.gatherContext(signal);

      // Check if we need to spawn an agent
      const agentType = this.determineRequiredAgent(signal);
      let agent: unknown | null = null;

      if (agentType && this.resourcePool.availableSlots > 0) {
        agent = await this.spawnAgent(agentType);
      }

      // Make decision (with or without agent)
      const decision = await this.executeDecision(signal, context, agent);

      // Return agent to pool
      if (agent && agentType) {
        this.agentLoader.returnAgent(agentType, agent);
        this.resourcePool.availableSlots++;
      }

      performanceManager.endOperation('decision-analysis');
      return decision;

    } catch (error) {
      performanceManager.endOperation('decision-analysis');
      throw error;
    }
  }

  private gatherContext(signal: unknown): unknown {
    const signalObj = signal as { id?: string };
    const contextKey = `signal-${signalObj.id ?? 'unknown'}`;
    let context = this.contextManager.get(contextKey);

    if (!context) {
      context = {
        signal,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV ?? 'development',
        memory: process.memoryUsage(),
        agentStats: this.getAgentStats()
      };

      this.contextManager.set(contextKey, context);
    }

    return context;
  }

  private determineRequiredAgent(signal: unknown): string | null {
    // Simple heuristic for agent selection
    const signalObj = signal as { type?: string };
    if (signalObj.type === 'dp' || signalObj.type === 'bf') {
      return 'developer';
    } else if (signalObj.type === 'cq' || signalObj.type === 'tg') {
      return 'quality-control';
    } else if (signalObj.type === 'du' || signalObj.type === 'ds') {
      return 'ux-ui-designer';
    } else if (signalObj.type === 'id' || signalObj.type === 'so') {
      return 'devops-sre';
    } else if (signalObj.type === 'gg' || signalObj.type === 'ff') {
      return 'system-analyst';
    }

    return null;
  }

  private async spawnAgent(type: string): Promise<unknown> {
    performanceManager.startOperation('agent-spawn');

    try {
      const agent = await this.agentLoader.getAgent(type);
      const sessionId = this.generateSessionId();

      const session: AgentSession = {
        id: sessionId,
        type,
        status: 'busy',
        startTime: Date.now(),
        lastActivity: Date.now(),
        taskCount: 1
      };

      this.resourcePool.agents.set(sessionId, session);
      this.resourcePool.availableSlots--;

      this.metrics.agentsSpawned++;

      performanceManager.endOperation('agent-spawn');
      return agent;

    } catch (error) {
      performanceManager.endOperation('agent-spawn');
      throw error;
    }
  }

  private async executeDecision(signal: unknown, context: unknown, agent: unknown): Promise<unknown> {
    // Simple decision logic - would be more sophisticated in real implementation
    const signalObj = signal as { type?: string };
    const agentObj = agent as { type?: string } | null;
    const decision = {
      id: this.generateDecisionId(),
      signal: signalObj.type,
      action: 'acknowledge',
      agent: agentObj?.type ?? 'system',
      context,
      timestamp: Date.now(),
      confidence: 0.8
    };

    return decision;
  }

  private startBatchProcessing(): void {
    setInterval(async () => {
      if (this.signalQueue.length === 0) return;

      // Process signals in batches
      const batch = this.signalQueue.splice(0, this.config.batchSize);

      for (const signal of batch) {
        try {
          await this.processSignal(signal);
        } catch (error) {
          logger.error(`Error processing queued signal: ${error}`);
        }
      }
    }, 1000); // Process every second
  }

  private initializeResourcePool(): void {
    this.resourcePool = {
      agents: new Map(),
      availableSlots: this.config.maxConcurrentAgents ?? 5,
      maxSlots: this.config.maxConcurrentAgents ?? 5
    };
  }

  private async stopAllAgents(): Promise<void> {
    const stopPromises = Array.from(this.resourcePool.agents.entries()).map(
      async ([sessionId, session]) => {
        try {
          // Stop agent (implementation dependent on agent type)
          session.status = 'stopped';
          this.resourcePool.agents.delete(sessionId);
        } catch (error) {
          logger.error(`Failed to stop agent ${sessionId}: ${error}`);
        }
      }
    );

    await Promise.allSettled(stopPromises);
    this.resourcePool.availableSlots = this.resourcePool.maxSlots;
  }

  private setupMemoryMonitoring(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      const memoryMB = usage.heapUsed / 1024 / 1024;

      this.metrics.memoryUsage = memoryMB;

      if (memoryMB > (this.config.maxMemoryMB ?? 200)) {
        logger.warn(`🚨 Orchestrator memory usage high: ${memoryMB.toFixed(2)}MB`);

        // Clear caches to free memory
        this.contextManager.clear();
        this.decisionCache.clear();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private generateCacheKey(signal: unknown): string {
    const signalObj = signal as {
      type?: string;
      file?: string;
      line?: number;
      context?: string;
    };
    return `${signalObj.type ?? 'unknown'}-${signalObj.file ?? 'no-file'}-${signalObj.line ?? 0}-${signalObj.context?.substring(0, 100) ?? ''}`;
  }

  private generateSessionId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDecisionId(): string {
    return `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAgentStats(): {
    total: number;
    busy: number;
    idle: number;
    error: number;
  } {
    const agents = Array.from(this.resourcePool.agents.values());
    return {
      total: agents.length,
      busy: agents.filter(a => a.status === 'busy').length,
      idle: agents.filter(a => a.status === 'idle').length,
      error: agents.filter(a => a.status === 'error').length
    };
  }

  getMetrics(): typeof this.metrics & {
    contextStats: { count: number; sizeMB: number };
    cacheStats: { size: number; hitRate: number };
    agentStats: {
      total: number;
      busy: number;
      idle: number;
      error: number;
    };
    resourcePoolStats: { used: number; available: number; total: number };
  } {
    return {
      ...this.metrics,
      contextStats: this.contextManager.getStats(),
      cacheStats: this.decisionCache.getStats(),
      agentStats: this.getAgentStats(),
      resourcePoolStats: {
        used: this.resourcePool.agents.size,
        available: this.resourcePool.availableSlots,
        total: this.resourcePool.maxSlots
      }
    };
  }
}

/**
 * Factory function for creating optimized orchestrator instances
 */
export function createOptimizedOrchestrator(config?: OptimizedOrchestratorConfig): OptimizedOrchestrator {
  return new OptimizedOrchestrator(config);
}