/**
 * ♫ Agent Discovery System
 *
 * Dynamic agent discovery, registration, and monitoring system
 * for detecting and managing available agents in the ecosystem
 */

import { EventEmitter } from 'events';
import { createLayerLogger, FileUtils } from '../shared';
import {
  AgentConfig,
  AgentType,
  AgentRole,
  ProviderType,
  agentConfigManager
} from './agent-config';
import { ConfigValidator } from './config-validator';

const logger = createLayerLogger('config');

export interface DiscoveredAgent {
  config: AgentConfig;
  status: AgentStatus;
  health: AgentHealth;
  capabilities: RuntimeCapabilities;
  runtimeCapabilities: RuntimeCapabilities;
  lastSeen: Date;
  registrationTime: Date;
  source: AgentSource;
}

export interface AgentStatus {
  state: 'online' | 'offline' | 'busy' | 'error' | 'maintenance';
  currentTasks: number;
  maxTasks: number;
  uptime: number; // milliseconds
  lastActivity: Date;
}

export interface AgentHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  score: number; // 0-100
  issues: HealthIssue[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  duration: number; // milliseconds
  message: string;
  timestamp: Date;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'security' | 'connectivity' | 'resource' | 'authentication';
  message: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface RuntimeCapabilities {
  actualCapabilities: RuntimeCapability[];
  performanceMetrics: PerformanceMetrics;
  resourceUtilization: ResourceUtilization;
  supportedFeatures: string[];
  experimentalFeatures: string[];
}

export interface RuntimeCapability {
  name: string;
  supported: boolean;
  confidence: number; // 0-1
  lastTested: Date;
  testResults: CapabilityTest[];
}

export interface CapabilityTest {
  testName: string;
  passed: boolean;
  duration: number;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface PerformanceMetrics {
  averageResponseTime: number; // milliseconds
  successRate: number; // percentage
  throughput: number; // requests per minute
  errorRate: number; // percentage
  lastUpdated: Date;
}

export interface ResourceUtilization {
  cpu: number; // percentage
  memory: number; // percentage
  disk: number; // percentage
  network: number; // percentage
  tokensUsed: number;
  tokensLimit: number;
  costUsed: number; // USD
  costLimit: number; // USD
}

export interface AgentSource {
  type: 'config' | 'registry' | 'network' | 'plugin' | 'discovered';
  location: string;
  metadata: Record<string, unknown>;
}

export interface DiscoveryFilter {
  type?: AgentType[];
  role?: AgentRole[];
  provider?: ProviderType[];
  status?: AgentStatus['state'][];
  health?: AgentHealth['overall'][];
  tags?: string[];
  capabilities?: string[];
  minScore?: number;
  onlineOnly?: boolean;
}

export interface DiscoveryOptions {
  includeOffline?: boolean;
  includeUnhealthy?: boolean;
  validateConfigs?: boolean;
  testCapabilities?: boolean;
  updateCache?: boolean;
  timeout?: number; // milliseconds
}

export interface AgentRegistry {
  agents: Map<string, DiscoveredAgent>;
  indexes: {
    byType: Map<AgentType, Set<string>>;
    byRole: Map<AgentRole, Set<string>>;
    byProvider: Map<ProviderType, Set<string>>;
    byStatus: Map<AgentStatus['state'], Set<string>>;
    byHealth: Map<AgentHealth['overall'], Set<string>>;
    byCapability: Map<string, Set<string>>;
  };
  lastUpdated: Date;
}

/**
 * Agent Discovery System
 */
export class AgentDiscovery extends EventEmitter {
  private registry: AgentRegistry;
  private validator: ConfigValidator;
  private discoveryInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private configWatcher?: NodeJS.Timeout;

  constructor() {
    super();
    this.registry = {
      agents: new Map(),
      indexes: {
        byType: new Map(),
        byRole: new Map(),
        byProvider: new Map(),
        byStatus: new Map(),
        byHealth: new Map(),
        byCapability: new Map()
      },
      lastUpdated: new Date()
    };
    this.validator = new ConfigValidator();
    this.initializeIndexes();
  }

  /**
   * Start the discovery system
   */
  async start(
    options: {
      discoveryInterval?: number; // milliseconds
      healthCheckInterval?: number; // milliseconds
      configWatchInterval?: number; // milliseconds
    } = {}
  ): Promise<void> {
    logger.info('AgentDiscovery', 'Starting agent discovery system');

    const {
      discoveryInterval = 60000, // 1 minute
      healthCheckInterval = 30000, // 30 seconds
      configWatchInterval = 10000 // 10 seconds
    } = options;

    // Initial discovery
    await this.discoverAgents();

    // Start periodic discovery
    this.discoveryInterval = setInterval(() => {
      this.discoverAgents().catch((error) => {
        logger.error('AgentDiscovery', 'Periodic discovery failed', error);
      });
    }, discoveryInterval);

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch((error) => {
        logger.error('AgentDiscovery', 'Health check failed', error);
      });
    }, healthCheckInterval);

    // Start config watching
    this.configWatcher = setInterval(() => {
      this.checkConfigChanges().catch((error) => {
        logger.error('AgentDiscovery', 'Config watch failed', error);
      });
    }, configWatchInterval);

    this.emit('discovery-started', {
      intervals: { discoveryInterval, healthCheckInterval, configWatchInterval }
    });
  }

  /**
   * Stop the discovery system
   */
  async stop(): Promise<void> {
    logger.info('AgentDiscovery', 'Stopping agent discovery system');

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (this.configWatcher) {
      clearInterval(this.configWatcher);
      this.configWatcher = undefined;
    }

    this.emit('discovery-stopped');
  }

  /**
   * Discover all available agents
   */
  async discoverAgents(options: DiscoveryOptions = {}): Promise<DiscoveredAgent[]> {
    logger.info('AgentDiscovery', 'Starting agent discovery', options as Record<string, unknown>);

    const startTime = Date.now();
    const discoveredAgents: DiscoveredAgent[] = [];

    try {
      // Discover from configuration files
      const configAgents = await this.discoverFromConfig();
      discoveredAgents.push(...configAgents);

      // Discover from network/registry sources
      const networkAgents = await this.discoverFromNetwork();
      discoveredAgents.push(...networkAgents);

      // Discover from plugins
      const pluginAgents = await this.discoverFromPlugins();
      discoveredAgents.push(...pluginAgents);

      // Process discovered agents
      for (const agent of discoveredAgents) {
        await this.processDiscoveredAgent(agent, options);
      }

      // Update registry
      this.updateRegistry(discoveredAgents);

      const duration = Date.now() - startTime;
      logger.info('AgentDiscovery', 'Discovery completed', {
        duration,
        totalAgents: discoveredAgents.length,
        registeredAgents: this.registry.agents.size
      });

      this.emit('discovery-completed', {
        agents: discoveredAgents,
        duration,
        totalDiscovered: discoveredAgents.length,
        totalRegistered: this.registry.agents.size
      });

      return Array.from(this.registry.agents.values());
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        'AgentDiscovery',
        'Discovery failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          duration
        }
      );
      this.emit('discovery-failed', { error, duration });
      throw error;
    }
  }

  /**
   * Get discovered agents with filtering
   */
  getAgents(filter?: DiscoveryFilter): DiscoveredAgent[] {
    let agents = Array.from(this.registry.agents.values());

    if (!filter) {
      return agents;
    }

    // Apply filters
    if (filter.type && filter.type.length > 0) {
      agents = agents.filter((agent) => filter.type!.includes(agent.config.type));
    }

    if (filter.role && filter.role.length > 0) {
      agents = agents.filter((agent) => filter.role!.includes(agent.config.role));
    }

    if (filter.provider && filter.provider.length > 0) {
      agents = agents.filter((agent) => filter.provider!.includes(agent.config.provider));
    }

    if (filter.status && filter.status.length > 0) {
      agents = agents.filter((agent) => filter.status!.includes(agent.status.state));
    }

    if (filter.health && filter.health.length > 0) {
      agents = agents.filter((agent) => filter.health!.includes(agent.health.overall));
    }

    if (filter.tags && filter.tags.length > 0) {
      agents = agents.filter((agent) =>
        filter.tags!.some((tag) => agent.config.metadata.tags.includes(tag))
      );
    }

    if (filter.capabilities && filter.capabilities.length > 0) {
      agents = agents.filter((agent) =>
        filter.capabilities!.some((cap) =>
          agent.runtimeCapabilities.supportedFeatures.includes(cap)
        )
      );
    }

    if (filter.minScore !== undefined) {
      agents = agents.filter((agent) => agent.health.score >= filter.minScore!);
    }

    if (filter.onlineOnly) {
      agents = agents.filter((agent) => agent.status.state === 'online');
    }

    return agents;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): DiscoveredAgent | undefined {
    return this.registry.agents.get(agentId);
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): DiscoveredAgent[] {
    const agentIds = this.registry.indexes.byType.get(type);
    if (!agentIds) {
      return [];
    }
    return Array.from(agentIds)
      .map((id) => this.registry.agents.get(id))
      .filter((agent): agent is DiscoveredAgent => agent !== undefined);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: AgentRole): DiscoveredAgent[] {
    const agentIds = this.registry.indexes.byRole.get(role);
    if (!agentIds) {
      return [];
    }
    return Array.from(agentIds)
      .map((id) => this.registry.agents.get(id))
      .filter((agent): agent is DiscoveredAgent => agent !== undefined);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): DiscoveredAgent[] {
    const agentIds = this.registry.indexes.byCapability.get(capability);
    if (!agentIds) {
      return [];
    }
    return Array.from(agentIds)
      .map((id) => this.registry.agents.get(id))
      .filter((agent): agent is DiscoveredAgent => agent !== undefined);
  }

  /**
   * Find best agent for task
   */
  async findBestAgent(requirements: {
    requiredCapabilities: string[];
    preferredRole?: AgentRole;
    maxCost?: number;
    minHealth?: number;
    excludeBusy?: boolean;
  }): Promise<DiscoveredAgent | null> {
    const {
      requiredCapabilities,
      preferredRole,
      maxCost,
      minHealth = 80,
      excludeBusy = true
    } = requirements;

    // Filter agents by capabilities
    let candidates = this.getAgents().filter((agent) =>
      requiredCapabilities.every((cap) => agent.runtimeCapabilities.supportedFeatures.includes(cap))
    );

    // Filter by role if specified
    if (preferredRole) {
      candidates = candidates.filter((agent) => agent.config.role === preferredRole);
    }

    // Filter by health
    candidates = candidates.filter((agent) => agent.health.score >= minHealth);

    // Filter by cost if specified
    if (maxCost !== undefined) {
      candidates = candidates.filter((agent) => agent.config.limits.maxCostPerDay <= maxCost);
    }

    // Exclude busy agents if specified
    if (excludeBusy) {
      candidates = candidates.filter(
        (agent) =>
          agent.status.state !== 'busy' && agent.status.currentTasks < agent.status.maxTasks
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    // Score candidates
    const scoredCandidates = candidates.map((agent) => ({
      agent,
      score: this.calculateAgentScore(agent, requirements)
    }));

    // Sort by score (descending)
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.length > 0 && scoredCandidates[0]?.agent
      ? scoredCandidates[0].agent
      : null;
  }

  /**
   * Register an external agent
   */
  async registerAgent(agent: AgentConfig, source: AgentSource): Promise<DiscoveredAgent> {
    logger.info('AgentDiscovery', `Registering external agent: ${agent.id}`);

    const discoveredAgent: DiscoveredAgent = {
      config: agent,
      status: {
        state: 'offline',
        currentTasks: 0,
        maxTasks: agent.limits.maxConcurrentTasks,
        uptime: 0,
        lastActivity: new Date()
      },
      health: {
        overall: 'unhealthy',
        checks: [],
        score: 0,
        issues: []
      },
      capabilities: {
        actualCapabilities: [],
        performanceMetrics: {
          averageResponseTime: 0,
          successRate: 0,
          throughput: 0,
          errorRate: 100,
          lastUpdated: new Date()
        },
        resourceUtilization: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0,
          tokensUsed: 0,
          tokensLimit: agent.limits.maxTokensPerRequest * agent.limits.maxRequestsPerDay,
          costUsed: 0,
          costLimit: agent.limits.maxCostPerDay
        },
        supportedFeatures: [],
        experimentalFeatures: []
      },
      runtimeCapabilities: {
        actualCapabilities: [],
        performanceMetrics: {
          averageResponseTime: 0,
          successRate: 0,
          errorRate: 0,
          throughput: 0,
          lastUpdated: new Date()
        },
        resourceUtilization: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0,
          tokensUsed: 0,
          tokensLimit: agent.limits.maxTokensPerRequest * agent.limits.maxRequestsPerDay,
          costUsed: 0,
          costLimit: agent.limits.maxCostPerDay
        },
        supportedFeatures: [],
        experimentalFeatures: []
      },
      lastSeen: new Date(),
      registrationTime: new Date(),
      source
    };

    // Add to registry
    this.registry.agents.set(agent.id, discoveredAgent);
    this.updateIndexes(discoveredAgent);

    // Test capabilities if requested
    await this.testAgentCapabilities(discoveredAgent);

    this.emit('agent-registered', { agent: discoveredAgent });

    return discoveredAgent;
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<boolean> {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      return false;
    }

    this.registry.agents.delete(agentId);
    this.removeFromIndexes(agent);

    this.emit('agent-unregistered', { agentId, agent });

    return true;
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: Partial<AgentStatus>): Promise<boolean> {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = { ...agent.status, ...status };
    agent.lastSeen = new Date();

    this.emit('agent-status-updated', { agentId, status: agent.status });

    return true;
  }

  /**
   * Perform health checks on all agents
   */
  async performHealthChecks(): Promise<Map<string, HealthCheck[]>> {
    const results = new Map<string, HealthCheck[]>();

    for (const [agentId, agent] of this.registry.agents) {
      const checks = await this.performAgentHealthCheck(agent);
      results.set(agentId, checks);

      // Update agent health
      agent.health.checks = checks;
      agent.health.score = this.calculateHealthScore(checks);
      agent.health.overall = this.getOverallHealthStatus(agent.health.score);
      agent.health.issues = this.extractHealthIssues(checks);
    }

    this.emit('health-checks-completed', { results });

    return results;
  }

  /**
   * Get discovery statistics
   */
  getStatistics(): {
    totalAgents: number;
    onlineAgents: number;
    healthyAgents: number;
    byType: Record<AgentType, number>;
    byRole: Record<AgentRole, number>;
    byProvider: Record<ProviderType, number>;
    averageHealthScore: number;
    lastUpdated: Date;
    } {
    const agents = Array.from(this.registry.agents.values());

    const stats = {
      totalAgents: agents.length,
      onlineAgents: agents.filter((a) => a.status.state === 'online').length,
      healthyAgents: agents.filter((a) => a.health.overall === 'healthy').length,
      byType: {} as Record<AgentType, number>,
      byRole: {} as Record<AgentRole, number>,
      byProvider: {} as Record<ProviderType, number>,
      averageHealthScore:
        agents.length > 0 ? agents.reduce((sum, a) => sum + a.health.score, 0) / agents.length : 0,
      lastUpdated: this.registry.lastUpdated
    };

    // Count by type
    for (const agent of agents) {
      stats.byType[agent.config.type] = (stats.byType[agent.config.type] || 0) + 1;
      stats.byRole[agent.config.role] = (stats.byRole[agent.config.role] || 0) + 1;
      stats.byProvider[agent.config.provider] = (stats.byProvider[agent.config.provider] || 0) + 1;
    }

    return stats;
  }

  /**
   * Private methods
   */

  private async discoverFromConfig(): Promise<DiscoveredAgent[]> {
    const agents: DiscoveredAgent[] = [];

    try {
      const configAgents = await agentConfigManager.loadConfig();

      for (const config of configAgents) {
        const discoveredAgent: DiscoveredAgent = {
          config,
          status: {
            state: 'offline',
            currentTasks: 0,
            maxTasks: config.limits.maxConcurrentTasks,
            uptime: 0,
            lastActivity: new Date()
          },
          health: {
            overall: 'unhealthy',
            checks: [],
            score: 0,
            issues: []
          },
          capabilities: {
            actualCapabilities: [],
            performanceMetrics: {
              averageResponseTime: 0,
              successRate: 0,
              throughput: 0,
              errorRate: 100,
              lastUpdated: new Date()
            },
            resourceUtilization: {
              cpu: 0,
              memory: 0,
              disk: 0,
              network: 0,
              tokensUsed: 0,
              tokensLimit: config.limits.maxTokensPerRequest * config.limits.maxRequestsPerDay,
              costUsed: 0,
              costLimit: config.limits.maxCostPerDay
            },
            supportedFeatures: this.extractSupportedFeatures(config),
            experimentalFeatures: []
          },
          runtimeCapabilities: {
            actualCapabilities: [],
            performanceMetrics: {
              averageResponseTime: 0,
              successRate: 0,
              errorRate: 100,
              throughput: 0,
              lastUpdated: new Date()
            },
            resourceUtilization: {
              cpu: 0,
              memory: 0,
              disk: 0,
              network: 0,
              tokensUsed: 0,
              tokensLimit: config.limits.maxTokensPerRequest * config.limits.maxRequestsPerDay,
              costUsed: 0,
              costLimit: config.limits.maxCostPerDay
            },
            supportedFeatures: [],
            experimentalFeatures: []
          },
          lastSeen: new Date(),
          registrationTime: new Date(),
          source: {
            type: 'config',
            location: '.prprc',
            metadata: { version: '1.0.0' }
          }
        };

        agents.push(discoveredAgent);
      }

      logger.debug('AgentDiscovery', `Discovered ${agents.length} agents from config`);
    } catch (error) {
      logger.error(
        'AgentDiscovery',
        'Failed to discover from config',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return agents;
  }

  private async discoverFromNetwork(): Promise<DiscoveredAgent[]> {
    // Placeholder for network discovery
    // In a real implementation, this would:
    // - Scan for agent services on the network
    // - Query agent registries
    // - Check for mDNS/Bonjour services
    // - Connect to cloud-based agent directories

    const agents: DiscoveredAgent[] = [];

    try {
      // Example: Discover from environment variables
      if (process.env.AGENT_REGISTRY_URL) {
        // Query external registry
        logger.debug('AgentDiscovery', 'Discovering agents from external registry');
      }

      // Example: Discover from Docker/Kubernetes
      if (process.env.KUBERNETES_SERVICE_HOST) {
        // Query Kubernetes API for agent pods
        logger.debug('AgentDiscovery', 'Discovering agents from Kubernetes');
      }
    } catch (error) {
      logger.error(
        'AgentDiscovery',
        'Failed to discover from network',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return agents;
  }

  private async discoverFromPlugins(): Promise<DiscoveredAgent[]> {
    // Placeholder for plugin discovery
    // In a real implementation, this would:
    // - Scan for agent plugins in directories
    // - Load plugin manifests
    // - Initialize plugin agents

    const agents: DiscoveredAgent[] = [];

    try {
      const pluginDirs = ['./plugins', './node_modules/@dcversus/agents', './agents'];

      for (const dir of pluginDirs) {
        if (await FileUtils.pathExists(dir)) {
          logger.debug('AgentDiscovery', `Scanning for plugins in ${dir}`);
          // Scan for plugin manifests
        }
      }
    } catch (error) {
      logger.error(
        'AgentDiscovery',
        'Failed to discover from plugins',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return agents;
  }

  private async processDiscoveredAgent(
    agent: DiscoveredAgent,
    options: DiscoveryOptions
  ): Promise<void> {
    // Validate configuration if requested
    if (options.validateConfigs) {
      const validation = await this.validator.validateAgent(agent.config);
      if (!validation.valid) {
        logger.warn('AgentDiscovery', `Agent ${agent.config.id} failed validation`, {
          errors: validation.errors.map((e) => e.message)
        });
      }
    }

    // Test capabilities if requested
    if (options.testCapabilities) {
      await this.testAgentCapabilities(agent);
    }

    // Perform initial health check
    const healthChecks = await this.performAgentHealthCheck(agent);
    agent.health.checks = healthChecks;
    agent.health.score = this.calculateHealthScore(healthChecks);
    agent.health.overall = this.getOverallHealthStatus(agent.health.score);
  }

  private async testAgentCapabilities(agent: DiscoveredAgent): Promise<void> {
    const capabilities: RuntimeCapability[] = [];

    // Test file system access
    if (agent.config.capabilities.canAccessFileSystem) {
      const fsCapability: RuntimeCapability = {
        name: 'file-system-access',
        supported: false,
        confidence: 0,
        lastTested: new Date(),
        testResults: []
      };

      try {
        const startTime = Date.now();
        await FileUtils.pathExists(process.cwd());
        const duration = Date.now() - startTime;

        fsCapability.supported = true;
        fsCapability.confidence = 0.9;
        fsCapability.testResults.push({
          testName: 'file-read-test',
          passed: true,
          duration,
          details: { path: process.cwd() },
          timestamp: new Date()
        });
      } catch (error) {
        fsCapability.testResults.push({
          testName: 'file-read-test',
          passed: false,
          duration: 0,
          details: { error: error instanceof Error ? error.message : String(error) },
          timestamp: new Date()
        });
      }

      capabilities.push(fsCapability);
    }

    // Test tool support
    if (agent.config.capabilities.supportsTools && agent.config.tools.length > 0) {
      const toolCapability: RuntimeCapability = {
        name: 'tool-execution',
        supported: false,
        confidence: 0,
        lastTested: new Date(),
        testResults: []
      };

      // Test tool availability
      const availableTools = agent.config.tools.filter((tool) => tool.enabled);
      toolCapability.supported = availableTools.length > 0;
      toolCapability.confidence = availableTools.length / agent.config.tools.length;

      toolCapability.testResults.push({
        testName: 'tool-availability-test',
        passed: availableTools.length > 0,
        duration: 1,
        details: {
          totalTools: agent.config.tools.length,
          availableTools: availableTools.length
        },
        timestamp: new Date()
      });

      capabilities.push(toolCapability);
    }

    agent.runtimeCapabilities.actualCapabilities = capabilities;
  }

  private async performAgentHealthCheck(agent: DiscoveredAgent): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Configuration check
    const configCheck: HealthCheck = {
      name: 'configuration',
      status: 'pass',
      duration: 0,
      message: 'Configuration is valid',
      timestamp: new Date()
    };

    try {
      const validation = await this.validator.validateAgent(agent.config);
      if (!validation.valid) {
        configCheck.status = 'fail';
        configCheck.message = `Configuration has ${validation.errors.length} error(s)`;
      }
    } catch (error) {
      configCheck.status = 'fail';
      configCheck.message = `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    checks.push(configCheck);

    // Authentication check
    if (agent.config.authentication.credentials?.apiKey) {
      const authCheck: HealthCheck = {
        name: 'authentication',
        status: 'pass',
        duration: 0,
        message: 'Authentication credentials are present',
        timestamp: new Date()
      };

      // In a real implementation, this would test the API key
      // For now, just check that it exists and looks valid
      const apiKey = agent.config.authentication.credentials.apiKey;
      if (apiKey.length < 10) {
        authCheck.status = 'fail';
        authCheck.message = 'API key appears to be invalid';
      }

      checks.push(authCheck);
    }

    // Resource check
    const resourceCheck: HealthCheck = {
      name: 'resources',
      status: 'pass',
      duration: 0,
      message: 'Resource limits are reasonable',
      timestamp: new Date()
    };

    const utilization = agent.runtimeCapabilities.resourceUtilization;
    if (utilization.memory > 90 || utilization.cpu > 90) {
      resourceCheck.status = 'warn';
      resourceCheck.message = 'Resource utilization is high';
    }

    checks.push(resourceCheck);

    return checks;
  }

  private calculateHealthScore(checks: HealthCheck[]): number {
    if (checks.length === 0) {
      return 0;
    }

    let score = 100;
    for (const check of checks) {
      if (check.status === 'fail') {
        score -= 25;
      } else if (check.status === 'warn') {
        score -= 10;
      }
    }

    return Math.max(0, score);
  }

  private getOverallHealthStatus(score: number): AgentHealth['overall'] {
    if (score >= 90) {
      return 'healthy';
    }
    if (score >= 70) {
      return 'degraded';
    }
    return 'unhealthy';
  }

  private extractHealthIssues(checks: HealthCheck[]): HealthIssue[] {
    return checks
      .filter((check) => check.status !== 'pass')
      .map((check) => ({
        severity: check.status === 'fail' ? 'high' : 'medium',
        category: 'connectivity' as const,
        message: check.message,
        detectedAt: check.timestamp
      }));
  }

  private extractSupportedFeatures(config: AgentConfig): string[] {
    const features: string[] = [];

    if (config.capabilities.supportsTools) {
      features.push('tools');
    }
    if (config.capabilities.supportsImages) {
      features.push('images');
    }
    if (config.capabilities.supportsSubAgents) {
      features.push('sub-agents');
    }
    if (config.capabilities.supportsParallel) {
      features.push('parallel');
    }
    if (config.capabilities.supportsCodeExecution) {
      features.push('code-execution');
    }
    if (config.capabilities.canAccessInternet) {
      features.push('internet-access');
    }
    if (config.capabilities.canAccessFileSystem) {
      features.push('file-system');
    }

    return features;
  }

  private calculateAgentScore(
    agent: DiscoveredAgent,
    requirements: {
      requiredCapabilities: string[];
      preferredRole?: AgentRole;
      maxCost?: number;
      minHealth?: number;
    }
  ): number {
    let score = 0;

    // Health score (40% weight)
    score += (agent.health.score / 100) * 40;

    // Capability matching (30% weight)
    const matchingCapabilities = requirements.requiredCapabilities.filter((cap) =>
      agent.runtimeCapabilities.supportedFeatures.includes(cap)
    );
    const capabilityScore = matchingCapabilities.length / requirements.requiredCapabilities.length;
    score += capabilityScore * 30;

    // Performance (20% weight)
    const performanceScore = (100 - agent.runtimeCapabilities.performanceMetrics.errorRate) / 100;
    score += performanceScore * 20;

    // Availability (10% weight)
    const availabilityScore = agent.status.state === 'online' ? 1 : 0;
    score += availabilityScore * 10;

    return score;
  }

  private updateRegistry(agents: DiscoveredAgent[]): void {
    // Update existing agents and add new ones
    for (const agent of agents) {
      const existing = this.registry.agents.get(agent.config.id);
      if (existing) {
        // Update existing agent
        this.registry.agents.set(agent.config.id, agent);
      } else {
        // Add new agent
        this.registry.agents.set(agent.config.id, agent);
        this.updateIndexes(agent);
      }
    }

    // Remove agents that are no longer discovered
    const discoveredIds = new Set(agents.map((a) => a.config.id));
    for (const [agentId, agent] of this.registry.agents) {
      if (!discoveredIds.has(agentId)) {
        this.registry.agents.delete(agentId);
        this.removeFromIndexes(agent);
      }
    }

    this.registry.lastUpdated = new Date();
  }

  private initializeIndexes(): void {
    const types: AgentType[] = [
      'claude-code-anthropic',
      'claude-code-glm',
      'codex',
      'gemini',
      'amp',
      'aider',
      'github-copilot',
      'custom'
    ];
    const roles: AgentRole[] = [
      'robo-developer',
      'robo-system-analyst',
      'robo-aqa',
      'robo-security-expert',
      'robo-performance-engineer',
      'robo-ui-designer',
      'robo-devops',
      'robo-documenter',
      'orchestrator-agent',
      'task-agent',
      'specialist-agent',
      'conductor'
    ];
    const providers: ProviderType[] = [
      'anthropic',
      'openai',
      'google',
      'groq',
      'ollama',
      'github',
      'custom'
    ];
    const statuses: AgentStatus['state'][] = ['online', 'offline', 'busy', 'error', 'maintenance'];
    const healthStates: AgentHealth['overall'][] = ['healthy', 'degraded', 'unhealthy'];

    for (const type of types) {
      this.registry.indexes.byType.set(type, new Set());
    }
    for (const role of roles) {
      this.registry.indexes.byRole.set(role, new Set());
    }
    for (const provider of providers) {
      this.registry.indexes.byProvider.set(provider, new Set());
    }
    for (const status of statuses) {
      this.registry.indexes.byStatus.set(status, new Set());
    }
    for (const health of healthStates) {
      this.registry.indexes.byHealth.set(health, new Set());
    }
  }

  private updateIndexes(agent: DiscoveredAgent): void {
    this.registry.indexes.byType.get(agent.config.type)?.add(agent.config.id);
    this.registry.indexes.byRole.get(agent.config.role)?.add(agent.config.id);
    this.registry.indexes.byProvider.get(agent.config.provider)?.add(agent.config.id);
    this.registry.indexes.byStatus.get(agent.status.state)?.add(agent.config.id);
    this.registry.indexes.byHealth.get(agent.health.overall)?.add(agent.config.id);

    for (const capability of agent.runtimeCapabilities.supportedFeatures) {
      if (!this.registry.indexes.byCapability.has(capability)) {
        this.registry.indexes.byCapability.set(capability, new Set());
      }
      this.registry.indexes.byCapability.get(capability)?.add(agent.config.id);
    }
  }

  private removeFromIndexes(agent: DiscoveredAgent): void {
    this.registry.indexes.byType.get(agent.config.type)?.delete(agent.config.id);
    this.registry.indexes.byRole.get(agent.config.role)?.delete(agent.config.id);
    this.registry.indexes.byProvider.get(agent.config.provider)?.delete(agent.config.id);
    this.registry.indexes.byStatus.get(agent.status.state)?.delete(agent.config.id);
    this.registry.indexes.byHealth.get(agent.health.overall)?.delete(agent.config.id);

    for (const capability of agent.runtimeCapabilities.supportedFeatures) {
      this.registry.indexes.byCapability.get(capability)?.delete(agent.config.id);
    }
  }

  private async checkConfigChanges(): Promise<void> {
    // Check if configuration file has been modified
    try {
      const configPath = '.prprc';
      if (await FileUtils.pathExists(configPath)) {
        const stats = await FileUtils.readFileStats(configPath);
        const lastModified = new Date(stats.modified);

        if (lastModified > this.registry.lastUpdated) {
          logger.info('AgentDiscovery', 'Configuration file changed, triggering discovery');
          await this.discoverAgents();
        }
      }
    } catch (error) {
      logger.error(
        'AgentDiscovery',
        'Failed to check config changes',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Global instance
export const agentDiscovery = new AgentDiscovery();

export default AgentDiscovery;
