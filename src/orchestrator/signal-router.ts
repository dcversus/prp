/**
 * ♫ Signal Router for @dcversus/prp Orchestrator
 *
 * Advanced signal routing and processing system with pattern matching,
 * priority handling, and intelligent signal distribution.
 */

import { EventEmitter } from 'events';
import { logger } from '../shared/logger.js';
import { SignalEvent, SignalSource } from '../types';

// Enhanced interfaces for cross-system routing
export interface EnhancedSignalData {
  id: string;
  type: string;
  priority: number;
  source: string;
  timestamp: Date;
  originalData: Record<string, any>;

  // Enrichment data
  context: {
    prpId?: string;
    agentId?: string;
    fileId?: string;
    systemState: Record<string, any>;
    historicalContext: SignalHistoryEntry[];
    relatedSignals: string[];
    metadata: Record<string, any>;
  };

  // Routing information
  routing: {
    assignedAgent?: string;
    routingDecision: SignalRoutingDecision;
    routingHistory: RoutingStep[];
    priority: number;
    escalationLevel: number;
  };
}

export interface SignalRoutingDecision {
  targetAgent: string;
  confidence: number;
  reasoning: string;
  alternativeAgents: Array<{
    agent: string;
    confidence: number;
    reasoning: string;
  }>;
  estimatedDuration: number;
  requiredCapabilities: string[];
}

export interface SignalHistoryEntry {
  timestamp: Date;
  action: string;
  agent?: string;
  result: 'success' | 'failure' | 'pending';
  details: Record<string, any>;
  duration?: number;
}

export interface RoutingStep {
  timestamp: Date;
  from: string;
  to: string;
  decision: string;
  reason: string;
  duration: number;
}

export interface AgentCapability {
  agent: string;
  capabilities: string[];
  currentLoad: number;
  maxCapacity: number;
  specialization: string[];
  averageResponseTime: number;
  successRate: number;
}

export interface CrossSystemRoutingRule {
  id: string;
  name: string;
  signalPattern: RegExp;
  priorityRange: { min: number; max: number };
  targetAgents: string[];
  fallbackAgents: string[];
  requiredCapabilities: string[];
  conditions: {
    systemState?: Record<string, any>;
    timeWindow?: { start: string; end: string };
    agentLoad?: { max: number };
    escalationLevel?: number;
  };
  enabled: boolean;
}

export interface SignalRoute {
  id: string;
  pattern: RegExp;
  handler: SignalHandler;
  priority: number;
  enabled: boolean;
  metadata?: {
    name?: string;
    description?: string;
    source?: SignalSource;
    category?: string;
  };
}

export interface SignalHandler {
  (signal: SignalEvent): Promise<void> | void;
}

export interface SignalRouterOptions {
  maxRoutes?: number;
  enableLogging?: boolean;
  bufferSize?: number;
  processingTimeout?: number;
}

export interface SignalRouterStats {
  totalRoutes: number;
  activeRoutes: number;
  signalsProcessed: number;
  signalsRouted: number;
  averageRoutingTime: number;
  errors: number;
  lastProcessed?: Date;
}

/**
 * Signal Router - Advanced signal distribution system
 */
export class SignalRouter extends EventEmitter {
  private routes: Map<string, SignalRoute> = new Map();
  private processingQueue: SignalEvent[] = [];
  private isProcessing = false;
  private stats: SignalRouterStats = {
    totalRoutes: 0,
    activeRoutes: 0,
    signalsProcessed: 0,
    signalsRouted: 0,
    averageRoutingTime: 0,
    errors: 0
  };

  private options: Required<SignalRouterOptions>;

  constructor(options: SignalRouterOptions = {}) {
    super();
    this.options = {
      maxRoutes: options.maxRoutes ?? 100,
      enableLogging: options.enableLogging ?? true,
      bufferSize: options.bufferSize ?? 1000,
      processingTimeout: options.processingTimeout ?? 5000
    };

    // Start processing loop
    this.startProcessingLoop();
  }

  /**
   * Add a new signal route
   */
  addRoute(pattern: RegExp, handler: SignalHandler, options: Partial<SignalRoute> = {}): string {
    const routeId = this.generateRouteId();

    if (this.routes.size >= this.options.maxRoutes) {
      throw new Error(`Maximum number of routes (${this.options.maxRoutes}) reached`);
    }

    const route: SignalRoute = {
      id: routeId,
      pattern,
      handler,
      priority: options.priority ?? 5,
      enabled: options.enabled ?? true,
      metadata: options.metadata
    };

    this.routes.set(routeId, route);
    this.updateStats();

    if (this.options.enableLogging) {
      logger.info('orchestrator', 'SignalRouter', `Route added: ${routeId} (${route.metadata?.name ?? 'Unnamed'})`);
    }

    this.emit('routeAdded', route);
    return routeId;
  }

  /**
   * Remove a signal route
   */
  removeRoute(routeId: string): boolean {
    const route = this.routes.get(routeId);
    if (!route) {
      return false;
    }

    this.routes.delete(routeId);
    this.updateStats();

    if (this.options.enableLogging) {
      logger.info('orchestrator', 'SignalRouter', `Route removed: ${routeId} (${route.metadata?.name ?? 'Unnamed'})`);
    }

    this.emit('routeRemoved', route);
    return true;
  }

  /**
   * Route a signal through the system
   */
  async route(signal: SignalEvent): Promise<number> {
    const startTime = Date.now();
    let routesMatched = 0;

    try {
      // Find matching routes
      const matchingRoutes = this.findMatchingRoutes(signal);

      // Execute handlers
      for (const route of matchingRoutes) {
        if (!route.enabled) {
          continue;
        }

        try {
          await Promise.race([
            Promise.resolve(route.handler(signal)),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Handler timeout')), this.options.processingTimeout)
            )
          ]);
          routesMatched++;
        } catch (error) {
          this.stats.errors++;
          this.emit('handlerError', { route, signal, error });

          if (this.options.enableLogging) {
            logger.error('orchestrator', 'SignalRouter', `Handler error for route ${route.id}`, error instanceof Error ? error : new Error(String(error)));
          }
        }
      }

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);

      if (this.options.enableLogging && routesMatched > 0) {
        logger.info('orchestrator', 'SignalRouter', `Signal [${signal.signal}] routed to ${routesMatched} handlers in ${processingTime}ms`);
      }

      this.emit('signalRouted', { signal, routesMatched, processingTime });
      return routesMatched;

    } catch (error) {
      this.stats.errors++;
      this.emit('routingError', { signal, error });

      if (this.options.enableLogging) {
        logger.error('orchestrator', 'SignalRouter', `Routing error for signal [${signal.signal}]`, error instanceof Error ? error : new Error(String(error)));
      }

      return 0;
    }
  }

  /**
   * Add signal to processing queue
   */
  addSignalToQueue(signal: SignalEvent): void {
    if (this.processingQueue.length >= this.options.bufferSize) {
      // Remove oldest signal to prevent memory issues
      const dropped = this.processingQueue.shift();
      this.emit('signalDropped', dropped);
    }

    this.processingQueue.push(signal);
    this.emit('signalQueued', signal);
  }

  /**
   * Batch route multiple signals
   */
  async routeBatch(signals: SignalEvent[]): Promise<number[]> {
    const results: number[] = [];

    for (const signal of signals) {
      const routesMatched = await this.route(signal);
      results.push(routesMatched);
    }

    return results;
  }

  /**
   * Find routes that match the given signal
   */
  private findMatchingRoutes(signal: SignalEvent): SignalRoute[] {
    const matchingRoutes: SignalRoute[] = [];

    for (const route of this.routes.values()) {
      if (!route.enabled) {
        continue;
      }

      // Test pattern against signal code and metadata
      const signalText = `[${signal.signal}] ${signal.title} ${signal.description}`;
      if (route.pattern.test(signalText)) {
        matchingRoutes.push(route);
      }
    }

    // Sort by priority (higher priority first)
    return matchingRoutes.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start the background processing loop
   */
  private startProcessingLoop(): void {
    setInterval(async () => {
      if (this.isProcessing || this.processingQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const signal = this.processingQueue.shift();
        if (signal) {
          await this.route(signal);
        }
      } catch (error) {
        logger.error('orchestrator', 'SignalRouter', 'Processing loop error', error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.isProcessing = false;
      }
    }, 10); // Process every 10ms
  }

  /**
   * Update router statistics
   */
  private updateStats(): void {
    this.stats.totalRoutes = this.routes.size;
    this.stats.activeRoutes = Array.from(this.routes.values()).filter(route => route.enabled).length;
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(processingTime: number): void {
    this.stats.signalsProcessed++;
    this.stats.signalsRouted += Math.max(0, this.findMatchingRoutes({} as SignalEvent).length);
    this.stats.averageRoutingTime =
      (this.stats.averageRoutingTime + processingTime) / 2;
    this.stats.lastProcessed = new Date();
  }

  /**
   * Generate unique route ID
   */
  private generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get router statistics
   */
  getStats(): SignalRouterStats {
    return { ...this.stats };
  }

  /**
   * Get all routes
   */
  getAllRoutes(): SignalRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get route by ID
   */
  getRoute(routeId: string): SignalRoute | undefined {
    return this.routes.get(routeId);
  }

  /**
   * Enable/disable a route
   */
  setRouteEnabled(routeId: string, enabled: boolean): boolean {
    const route = this.routes.get(routeId);
    if (!route) {
      return false;
    }

    route.enabled = enabled;
    this.updateStats();
    this.emit('routeToggled', { route, enabled });
    return true;
  }

  /**
   * Clear all routes
   */
  clearRoutes(): void {
    const routeCount = this.routes.size;
    this.routes.clear();
    this.updateStats();

    if (this.options.enableLogging) {
      logger.info('orchestrator', 'SignalRouter', `Cleared ${routeCount} routes`);
    }

    this.emit('routesCleared', routeCount);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    size: number;
    isProcessing: boolean;
    bufferSize: number;
    } {
    return {
      size: this.processingQueue.length,
      isProcessing: this.isProcessing,
      bufferSize: this.options.bufferSize
    };
  }

  /**
   * Enhanced cross-system routing with intelligent agent selection
   */
  async routeEnhancedSignal(signal: EnhancedSignalData, agentCapabilities: AgentCapability[]): Promise<SignalRoutingDecision> {
    const startTime = Date.now();

    try {
      // Find applicable routing rules
      const applicableRules = this.findCrossSystemRules(signal);

      // Get available agents based on capabilities
      const availableAgents = this.filterAvailableAgents(agentCapabilities, signal);

      // Make intelligent routing decision
      const decision = this.makeRoutingDecision(signal, applicableRules, availableAgents);

      // Add routing step to history
      this.addRoutingStep(signal, {
        timestamp: new Date(),
        from: 'enhanced-router',
        to: decision.targetAgent,
        decision: `Enhanced routing ${signal.type} to ${decision.targetAgent}`,
        reason: decision.reasoning,
        duration: Date.now() - startTime
      });

      // Update routing information on signal
      signal.routing.assignedAgent = decision.targetAgent;
      signal.routing.routingDecision = decision;
      signal.routing.escalationLevel = this.calculateEscalationLevel(signal);

      // Update statistics
      this.stats.signalsProcessed++;
      this.stats.signalsRouted++;
      const processingTime = Date.now() - startTime;
      this.stats.averageRoutingTime = (this.stats.averageRoutingTime + processingTime) / 2;
      this.stats.lastProcessed = new Date();

      if (this.options.enableLogging) {
        logger.info('orchestrator', 'SignalRouter', `Enhanced signal routed: ${signal.type} -> ${decision.targetAgent} in ${processingTime}ms`);
      }

      this.emit('enhancedSignalRouted', { signal, decision, processingTime });

      return decision;

    } catch (error) {
      this.stats.errors++;
      logger.error('orchestrator', 'SignalRouter', 'Enhanced routing error', error instanceof Error ? error : new Error(String(error)));

      // Fallback to default routing
      return this.getDefaultRoutingDecision(signal);
    }
  }

  /**
   * Find cross-system routing rules applicable to the signal
   */
  private findCrossSystemRules(signal: EnhancedSignalData): CrossSystemRoutingRule[] {
    const rules = this.getDefaultCrossSystemRules();

    return rules.filter(rule => {
      if (!rule.enabled) {
        return false;
      }

      // Check signal pattern
      const signalText = `${signal.type} ${signal.originalData.content || ''}`;
      if (!rule.signalPattern.test(signalText)) {
        return false;
      }

      // Check priority range
      if (signal.priority < rule.priorityRange.min || signal.priority > rule.priorityRange.max) {
        return false;
      }

      // Check escalation level
      if (rule.conditions.escalationLevel && signal.routing.escalationLevel !== rule.conditions.escalationLevel) {
        return false;
      }

      // Check system state conditions
      if (rule.conditions.systemState) {
        const systemState = signal.context.systemState;
        for (const [key, value] of Object.entries(rule.conditions.systemState)) {
          if (systemState[key] !== value) {
            return false;
          }
        }
      }

      // Check time window
      if (rule.conditions.timeWindow) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const { start, end } = rule.conditions.timeWindow;
        if (currentTime < start || currentTime > end) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.priorityRange.max - a.priorityRange.max);
  }

  /**
   * Filter available agents based on capabilities and current load
   */
  private filterAvailableAgents(agents: AgentCapability[], signal: EnhancedSignalData): AgentCapability[] {
    return agents.filter(agent => {
      // Check if agent has required capabilities
      const requiredCapabilities = this.getRequiredCapabilities(signal);
      const hasAllCapabilities = requiredCapabilities.every(cap =>
        agent.capabilities.includes(cap)
      );

      if (!hasAllCapabilities) {
        return false;
      }

      // Check agent load
      const loadPercentage = (agent.currentLoad / agent.maxCapacity) * 100;
      return loadPercentage < 90; // Don't assign to agents at >90% capacity
    }).sort((a, b) => {
      // Sort by load (least loaded first) and success rate
      const loadA = (a.currentLoad / a.maxCapacity);
      const loadB = (b.currentLoad / b.maxCapacity);

      if (Math.abs(loadA - loadB) < 0.1) {
        return b.successRate - a.successRate; // Higher success rate first
      }

      return loadA - loadB; // Lower load first
    });
  }

  /**
   * Make intelligent routing decision
   */
  private makeRoutingDecision(
    signal: EnhancedSignalData,
    rules: CrossSystemRoutingRule[],
    availableAgents: AgentCapability[]
  ): SignalRoutingDecision {
    if (availableAgents.length === 0) {
      return this.getDefaultRoutingDecision(signal);
    }

    // Use the first applicable rule
    const rule = rules[0];
    if (rule) {
      // Find best agent from rule's target agents
      const targetAgent = availableAgents.find(agent =>
        rule.targetAgents.includes(agent.agent)
      );

      if (targetAgent) {
        return {
          targetAgent: targetAgent.agent,
          confidence: 0.9,
          reasoning: `Matched rule: ${rule.name}. Agent has required capabilities and availability.`,
          alternativeAgents: this.getAlternativeAgents(availableAgents, targetAgent.agent, rule),
          estimatedDuration: targetAgent.averageResponseTime,
          requiredCapabilities: rule.requiredCapabilities
        };
      }

      // Try fallback agents
      const fallbackAgent = availableAgents.find(agent =>
        rule.fallbackAgents.includes(agent.agent)
      );

      if (fallbackAgent) {
        return {
          targetAgent: fallbackAgent.agent,
          confidence: 0.7,
          reasoning: `Using fallback agent for rule: ${rule.name}. Primary targets unavailable.`,
          alternativeAgents: this.getAlternativeAgents(availableAgents, fallbackAgent.agent, rule),
          estimatedDuration: fallbackAgent.averageResponseTime,
          requiredCapabilities: rule.requiredCapabilities
        };
      }
    }

    // Default: pick the best available agent
    const bestAgent = availableAgents[0];
    return {
      targetAgent: bestAgent.agent,
      confidence: 0.6,
      reasoning: 'Selected best available agent based on load and success rate.',
      alternativeAgents: availableAgents.slice(1, 3).map(agent => ({
        agent: agent.agent,
        confidence: 0.5,
        reasoning: 'Available alternative with sufficient capacity.'
      })),
      estimatedDuration: bestAgent.averageResponseTime,
      requiredCapabilities: this.getRequiredCapabilities(signal)
    };
  }

  /**
   * Get required capabilities for signal type
   */
  private getRequiredCapabilities(signal: EnhancedSignalData): string[] {
    const signalType = signal.type.toLowerCase();
    const priority = signal.priority;

    // Critical signals require admin capabilities
    if (priority >= 9) {
      return ['admin_access', 'escalation_handling', 'decision_making'];
    }

    // Development signals
    if (['dp', 'bf', 'tp', 'tw', 'cd'].includes(signalType)) {
      return ['coding', 'testing', 'debugging', 'file_operations'];
    }

    // Analysis signals
    if (['gg', 'vp', 'ip', 'rc', 'no'].includes(signalType)) {
      return ['analysis', 'requirements_gathering', 'system_design', 'research'];
    }

    // Quality signals
    if (['cq', 'tg', 'tr', 'rv', 'iv'].includes(signalType)) {
      return ['testing', 'quality_assurance', 'code_review', 'validation'];
    }

    // Default capabilities
    return ['coordination', 'task_distribution', 'basic_processing'];
  }

  /**
   * Get alternative agents for routing decision
   */
  private getAlternativeAgents(
    availableAgents: AgentCapability[],
    primaryAgent: string,
    rule?: CrossSystemRoutingRule
  ): Array<{ agent: string; confidence: number; reasoning: string }> {
    return availableAgents
      .filter(agent => agent.agent !== primaryAgent)
      .slice(0, 2)
      .map(agent => ({
        agent: agent.agent,
        confidence: 0.5,
        reasoning: `Available alternative with ${((agent.maxCapacity - agent.currentLoad) / agent.maxCapacity * 100).toFixed(1)}% capacity.`
      }));
  }

  /**
   * Add routing step to signal history
   */
  private addRoutingStep(signal: EnhancedSignalData, step: RoutingStep): void {
    signal.routing.routingHistory.push(step);

    // Keep only last 10 routing steps
    if (signal.routing.routingHistory.length > 10) {
      signal.routing.routingHistory = signal.routing.routingHistory.slice(-10);
    }
  }

  /**
   * Calculate escalation level for signal
   */
  private calculateEscalationLevel(signal: EnhancedSignalData): number {
    const priority = signal.priority;

    if (priority >= 9) {
      return 3;
    } // Critical escalation
    if (priority >= 7) {
      return 2;
    } // High escalation
    if (priority >= 5) {
      return 1;
    } // Medium escalation
    return 0; // Normal escalation
  }

  /**
   * Get default routing decision
   */
  private getDefaultRoutingDecision(signal: EnhancedSignalData): SignalRoutingDecision {
    return {
      targetAgent: 'orchestrator',
      confidence: 0.4,
      reasoning: 'No specific routing rules matched. Using default orchestrator routing.',
      alternativeAgents: [],
      estimatedDuration: 5000,
      requiredCapabilities: ['coordination', 'task_distribution']
    };
  }

  /**
   * Get default cross-system routing rules
   */
  private getDefaultCrossSystemRules(): CrossSystemRoutingRule[] {
    return [
      {
        id: 'critical-admin',
        name: 'Critical Signals to Admin',
        signalPattern: /^(AA|FF|ic|JC)/i,
        priorityRange: { min: 8, max: 10 },
        targetAgents: ['admin'],
        fallbackAgents: ['orchestrator'],
        requiredCapabilities: ['admin_access', 'escalation_handling'],
        conditions: { escalationLevel: 3 },
        enabled: true
      },
      {
        id: 'development-robo-developer',
        name: 'Development to Robo-developer',
        signalPattern: /^(dp|bf|tp|tw|cd)/i,
        priorityRange: { min: 1, max: 7 },
        targetAgents: ['robo-developer'],
        fallbackAgents: ['robo-system-analyst', 'orchestrator'],
        requiredCapabilities: ['coding', 'testing', 'debugging'],
        conditions: { agentLoad: { max: 0.8 } },
        enabled: true
      },
      {
        id: 'analysis-robo-system-analyst',
        name: 'Analysis to Robo-system-analyst',
        signalPattern: /^(gg|vp|ip|rc|no)/i,
        priorityRange: { min: 1, max: 7 },
        targetAgents: ['robo-system-analyst'],
        fallbackAgents: ['robo-developer', 'orchestrator'],
        requiredCapabilities: ['analysis', 'requirements_gathering'],
        conditions: { agentLoad: { max: 0.7 } },
        enabled: true
      },
      {
        id: 'quality-robo-quality-control',
        name: 'Quality to Robo-quality-control',
        signalPattern: /^(cq|tg|tr|rv|iv)/i,
        priorityRange: { min: 1, max: 7 },
        targetAgents: ['robo-quality-control'],
        fallbackAgents: ['robo-developer', 'orchestrator'],
        requiredCapabilities: ['testing', 'quality_assurance'],
        conditions: { agentLoad: { max: 0.6 } },
        enabled: true
      },
      {
        id: 'orchestrator-coordination',
        name: 'Orchestrator Coordination',
        signalPattern: /^(oa|aa|ap)/i,
        priorityRange: { min: 1, max: 10 },
        targetAgents: ['orchestrator'],
        fallbackAgents: ['admin'],
        requiredCapabilities: ['coordination', 'task_distribution'],
        conditions: {},
        enabled: true
      }
    ];
  }

  /**
   * Batch route multiple enhanced signals
   */
  async routeEnhancedBatch(signals: EnhancedSignalData[], agentCapabilities: AgentCapability[]): Promise<SignalRoutingDecision[]> {
    const results: SignalRoutingDecision[] = [];

    for (const signal of signals) {
      const decision = await this.routeEnhancedSignal(signal, agentCapabilities);
      results.push(decision);
    }

    return results;
  }

  /**
   * Shutdown the router
   */
  shutdown(): void {
    this.clearRoutes();
    this.processingQueue.length = 0;
    this.removeAllListeners();

    if (this.options.enableLogging) {
      logger.info('orchestrator', 'SignalRouter', 'Shutdown complete');
    }
  }
}

// Singleton instance for global use
let globalSignalRouter: SignalRouter | null = null;

export function getSignalRouter(options?: SignalRouterOptions): SignalRouter {
  globalSignalRouter ??= new SignalRouter(options);
  return globalSignalRouter;
}

export function resetSignalRouter(): void {
  if (globalSignalRouter) {
    globalSignalRouter.shutdown();
    globalSignalRouter = null;
  }
}