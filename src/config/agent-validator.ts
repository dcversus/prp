/**
 * ♫ Advanced Agent Configuration Validator
 *
 * Comprehensive validation system for agent configurations with
 * schema validation, security checks, and performance validation
 */

import { EventEmitter } from 'events';
import { createLayerLogger } from '../shared';
import {
  AgentConfig,
  AgentConfigValidation,
  ValidationError,
  ValidationWarning,
  AgentType,
  AgentRole,
  ProviderType
} from './agent-config';

const logger = createLayerLogger('config');

export interface ValidationResult extends AgentConfigValidation {
  securityScore: number; // 0-100
  performanceScore: number; // 0-100
  compatibilityScore: number; // 0-100
  recommendations: ValidationRecommendation[];
  estimatedCosts: CostEstimation;
  resourceUsage: ResourceEstimation;
}

export interface ValidationRecommendation {
  type: 'security' | 'performance' | 'usability' | 'compatibility';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  impact: string;
}

export interface CostEstimation {
  perRequest: {
    min: number;
    max: number;
    average: number;
  };
  perDay: {
    min: number;
    max: number;
    average: number;
  };
  perMonth: {
    min: number;
    max: number;
    average: number;
  };
  currency: string;
}

export interface ResourceEstimation {
  memory: {
    min: number; // MB
    max: number; // MB
    recommended: number; // MB
  };
  cpu: {
    min: number; // percentage
    max: number; // percentage
    recommended: number; // percentage
  };
  storage: {
    temp: number; // MB
    persistent: number; // MB
  };
  network: {
    bandwidth: number; // MB/hour
    requests: number; // requests/hour
  };
}

export interface SecurityValidationRules {
  allowedDomains: string[];
  blockedDomains: string[];
  allowedCommands: string[];
  blockedCommands: string[];
  maxApiKeyLength: number;
  requireHttps: boolean;
  allowFileSystemAccess: boolean;
  allowCommandExecution: boolean;
}

export interface PerformanceThresholds {
  maxResponseTime: number; // ms
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
  maxTokensPerMinute: number;
  maxRequestsPerMinute: number;
  minSuccessRate: number; // percentage
}

/**
 * Advanced Agent Configuration Validator
 */
export class AgentValidator extends EventEmitter {
  private securityRules: SecurityValidationRules = {
    allowedDomains: [],
    blockedDomains: [],
    allowedCommands: [],
    blockedCommands: [],
    maxApiKeyLength: 1000,
    requireHttps: true,
    allowFileSystemAccess: false,
    allowCommandExecution: false
  };
  private performanceThresholds: PerformanceThresholds = {
    maxResponseTime: 30000,
    maxMemoryUsage: 1024,
    maxCpuUsage: 80,
    maxTokensPerMinute: 10000,
    maxRequestsPerMinute: 100,
    minSuccessRate: 95
  };
  private providerCosts: Map<string, number> = new Map(); // cost per 1M tokens
  private modelContexts: Map<string, number> = new Map(); // max context length

  constructor() {
    super();
    this.initializeSecurityRules();
    this.initializePerformanceThresholds();
    this.initializeProviderData();
  }

  /**
   * Comprehensive validation of agent configuration
   */
  async validateAgent(agent: AgentConfig): Promise<ValidationResult> {
    logger.info('AgentValidator', `Starting comprehensive validation for agent: ${agent.id}`);

    const startTime = Date.now();

    // Basic validation (from existing system)
    const basicValidation = this.validateBasicConfiguration(agent);

    // Advanced validations
    const securityValidation = await this.validateSecurity(agent);
    const performanceValidation = await this.validatePerformance(agent);
    const compatibilityValidation = await this.validateCompatibility(agent);
    const costValidation = await this.validateCosts(agent);
    const resourceValidation = await this.validateResources(agent);

    // Calculate scores
    const securityScore = this.calculateSecurityScore(securityValidation);
    const performanceScore = this.calculatePerformanceScore(performanceValidation);
    const compatibilityScore = this.calculateCompatibilityScore(compatibilityValidation);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      securityValidation,
      performanceValidation,
      compatibilityValidation,
      agent
    );

    // Combine all errors and warnings
    const allErrors = [
      ...basicValidation.errors,
      ...securityValidation.errors,
      ...performanceValidation.errors,
      ...compatibilityValidation.errors
    ];

    const allWarnings = [
      ...basicValidation.warnings,
      ...securityValidation.warnings,
      ...performanceValidation.warnings,
      ...compatibilityValidation.warnings
    ];

    const allSuggestions = [
      ...basicValidation.suggestions,
      ...securityValidation.suggestions,
      ...performanceValidation.suggestions,
      ...compatibilityValidation.suggestions
    ];

    const result: ValidationResult = {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      securityScore,
      performanceScore,
      compatibilityScore,
      recommendations,
      estimatedCosts: costValidation,
      resourceUsage: resourceValidation
    };

    const duration = Date.now() - startTime;
    logger.info('AgentValidator', `Validation completed for ${agent.id}`, {
      duration,
      valid: result.valid,
      errorCount: allErrors.length,
      warningCount: allWarnings.length,
      securityScore,
      performanceScore,
      compatibilityScore
    });

    this.emit('validation-completed', { agentId: agent.id, result });

    return result;
  }

  /**
   * Validate multiple agents
   */
  async validateAgents(agents: AgentConfig[]): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    logger.info('AgentValidator', `Starting batch validation for ${agents.length} agents`);

    // Validate in parallel for better performance
    const validationPromises = agents.map(async (agent) => {
      const result = await this.validateAgent(agent);
      return { agentId: agent.id, result };
    });

    const validationResults = await Promise.allSettled(validationPromises);

    for (const promiseResult of validationResults) {
      if (promiseResult.status === 'fulfilled') {
        const { agentId, result } = promiseResult.value;
        results.set(agentId, result);
      } else {
        logger.error('AgentValidator', 'Agent validation failed', promiseResult.reason);
      }
    }

    this.emit('batch-validation-completed', {
      totalAgents: agents.length,
      successfulValidations: results.size
    });

    return results;
  }

  /**
   * Basic configuration validation (enhanced from existing system)
   */
  private validateBasicConfiguration(agent: AgentConfig): AgentConfigValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // ID validation
    if (!agent.id || typeof agent.id !== 'string' || agent.id.length < 3) {
      errors.push({
        field: 'id',
        message: 'Agent ID must be a string with at least 3 characters',
        code: 'INVALID_ID',
        severity: 'error'
      });
    }

    if (agent.id && !/^[a-zA-Z0-9-_]+$/.test(agent.id)) {
      errors.push({
        field: 'id',
        message: 'Agent ID can only contain alphanumeric characters, hyphens, and underscores',
        code: 'INVALID_ID_FORMAT',
        severity: 'error'
      });
    }

    // Name validation
    if (!agent.name || typeof agent.name !== 'string' || agent.name.length < 2) {
      errors.push({
        field: 'name',
        message: 'Agent name must be a string with at least 2 characters',
        code: 'INVALID_NAME',
        severity: 'error'
      });
    }

    // Type validation
    if (!this.isValidAgentType(agent.type)) {
      errors.push({
        field: 'type',
        message: `Invalid agent type: ${agent.type}`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }

    // Role validation
    if (!this.isValidAgentRole(agent.role)) {
      errors.push({
        field: 'role',
        message: `Invalid agent role: ${agent.role}`,
        code: 'INVALID_ROLE',
        severity: 'error'
      });
    }

    // Provider validation
    if (!this.isValidProviderType(agent.provider)) {
      errors.push({
        field: 'provider',
        message: `Invalid provider type: ${agent.provider}`,
        code: 'INVALID_PROVIDER',
        severity: 'error'
      });
    }

    // Capability validation
    if (agent.capabilities?.maxContextLength !== undefined &&
        typeof agent.capabilities.maxContextLength === 'number' &&
        agent.capabilities.maxContextLength <= 0) {
      errors.push({
        field: 'capabilities.maxContextLength',
        message: 'Max context length must be a positive number',
        code: 'INVALID_CONTEXT_LENGTH',
        severity: 'error'
      });
    }

    // Check if context length is realistic for the provider
    const maxSupportedContext = this.modelContexts.get(`${agent.provider}-${agent.type}`);
    if (maxSupportedContext && agent.capabilities && agent.capabilities.maxContextLength && agent.capabilities.maxContextLength > maxSupportedContext) {
      warnings.push({
        field: 'capabilities.maxContextLength',
        message: `Context length exceeds provider's maximum (${maxSupportedContext})`,
        recommendation: `Reduce context length to ${maxSupportedContext} or lower`
      });
    }

    if (agent.capabilities && agent.capabilities.supportsTools && (!agent.tools || agent.tools.length === 0)) {
      warnings.push({
        field: 'tools',
        message: 'Agent supports tools but no tools are configured',
        recommendation: 'Configure tools or disable tool support'
      });
    }

    // Limits validation
    if (agent.limits && (typeof agent.limits.maxTokensPerRequest !== 'number' ||
        agent.limits.maxTokensPerRequest <= 0)) {
      errors.push({
        field: 'limits.maxTokensPerRequest',
        message: 'Max tokens per request must be greater than 0',
        code: 'INVALID_TOKEN_LIMIT',
        severity: 'error'
      });
    }

    if (agent.capabilities?.maxContextLength && agent.limits?.maxTokensPerRequest > agent.capabilities.maxContextLength) {
      warnings.push({
        field: 'limits.maxTokensPerRequest',
        message: 'Token limit exceeds context length',
        recommendation: 'Reduce maxTokensPerRequest to be less than or equal to maxContextLength'
      });
    }

    if (agent.limits && (typeof agent.limits.maxCostPerDay !== 'number' ||
        agent.limits.maxCostPerDay < 0)) {
      errors.push({
        field: 'limits.maxCostPerDay',
        message: 'Max cost per day cannot be negative',
        code: 'INVALID_COST_LIMIT',
        severity: 'error'
      });
    }

    if (agent.limits?.maxCostPerDay === 0) {
      suggestions.push('Consider setting a daily cost limit to prevent unexpected charges');
    }

    // Authentication validation
    if (agent.authentication) {
      if (agent.authentication.type === 'api-key') {
        const credentials = agent.authentication.credentials;
        if (!credentials?.apiKey) {
          errors.push({
            field: 'authentication.credentials.apiKey',
            message: 'API key is required for api-key authentication',
            code: 'MISSING_API_KEY',
            severity: 'error'
          });
        }

        if (credentials?.apiKey && credentials.apiKey.length < 10) {
          errors.push({
            field: 'authentication.credentials.apiKey',
            message: 'API key appears to be too short',
            code: 'INVALID_API_KEY',
            severity: 'error'
          });
        }

        if (credentials?.apiKey && credentials.apiKey.length > this.securityRules.maxApiKeyLength) {
          errors.push({
            field: 'authentication.credentials.apiKey',
            message: `API key exceeds maximum length of ${this.securityRules.maxApiKeyLength}`,
            code: 'API_KEY_TOO_LONG',
            severity: 'error'
          });
        }
      }

      if (agent.authentication.encrypted && !process.env.ENCRYPTION_KEY) {
        warnings.push({
          field: 'authentication.encrypted',
          message: 'Authentication is marked as encrypted but no encryption key is available',
          recommendation: 'Set ENCRYPTION_KEY environment variable'
        });
      }
    }

    // Suggestions based on role
    if (agent.role === 'robo-developer') {
      if (!agent.environment?.allowedCommands || agent.environment.allowedCommands.length === 0) {
        suggestions.push('Consider allowing specific commands for developer agents');
      }
      if (!agent.capabilities?.canAccessFileSystem) {
        suggestions.push('Developer agents typically need file system access');
      }
    }

    if (agent.role === 'robo-security-expert' && agent.capabilities?.canExecuteCommands) {
      warnings.push({
        field: 'capabilities.canExecuteCommands',
        message: 'Security expert agents with command execution access may pose security risks',
        recommendation: 'Consider limiting command execution capabilities'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Security validation
   */
  private async validateSecurity(agent: AgentConfig): Promise<AgentConfigValidation> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Ensure capabilities exist
    if (!agent.capabilities) {
      errors.push({
        field: 'capabilities',
        message: 'Agent capabilities are required for security validation',
        code: 'MISSING_CAPABILITIES',
        severity: 'error'
      });
      return { valid: false, errors, warnings, suggestions };
    }

    // Network security
    if (agent.environment?.networkAccess) {
      const { networkAccess } = agent.environment;

      if (networkAccess.allowExternalRequests && this.securityRules.requireHttps) {
        // Check if only HTTPS domains are allowed
        if (networkAccess.allowedDomains && networkAccess.allowedDomains.length > 0) {
          const httpDomains = networkAccess.allowedDomains.filter(domain =>
            domain.startsWith('http://')
          );
          if (httpDomains.length > 0) {
            errors.push({
              field: 'environment.networkAccess.allowedDomains',
              message: 'HTTP domains are not allowed for security reasons',
              code: 'INSECURE_PROTOCOL',
              severity: 'error'
            });
          }
        }
      }

      // Check against blocked domains
      if (networkAccess.allowedDomains) {
        const blockedFound = networkAccess.allowedDomains.filter(domain =>
          this.securityRules.blockedDomains.some(blocked => domain.includes(blocked))
        );
        if (blockedFound.length > 0) {
          errors.push({
            field: 'environment.networkAccess.allowedDomains',
            message: `Blocked domains found: ${blockedFound.join(', ')}`,
            code: 'BLOCKED_DOMAINS',
            severity: 'error'
          });
        }
      }
    }

    // Command execution security
    if (agent.capabilities?.canExecuteCommands) {
      if (!this.securityRules.allowCommandExecution) {
        errors.push({
          field: 'capabilities.canExecuteCommands',
          message: 'Command execution is not allowed in this environment',
          code: 'COMMAND_EXECUTION_FORBIDDEN',
          severity: 'error'
        });
      }

      // Check allowed commands
      if (agent.environment?.allowedCommands) {
        const dangerousCommands = agent.environment?.allowedCommands?.filter(cmd =>
          this.securityRules.blockedCommands.some(blocked => cmd.includes(blocked))
        );
        if (dangerousCommands.length > 0) {
          errors.push({
            field: 'environment.allowedCommands',
            message: `Dangerous commands found: ${dangerousCommands.join(', ')}`,
            code: 'DANGEROUS_COMMANDS',
            severity: 'error'
          });
        }
      }

      if (!agent.environment?.blockedCommands || agent.environment.blockedCommands.length === 0) {
        warnings.push({
          field: 'environment.blockedCommands',
          message: 'No blocked commands configured for agent with command execution',
          recommendation: 'Configure blocked commands for security'
        });
      }
    }

    // File system security
    if (agent.capabilities?.canAccessFileSystem) {
      if (!this.securityRules.allowFileSystemAccess) {
        errors.push({
          field: 'capabilities.canAccessFileSystem',
          message: 'File system access is not allowed in this environment',
          code: 'FILE_ACCESS_FORBIDDEN',
          severity: 'error'
        });
      }

      // Check for dangerous file paths
      if (agent.environment?.fileSystem?.allowedPaths) {
        const dangerousPaths = agent.environment?.fileSystem?.allowedPaths?.filter(path =>
          this.securityRules.blockedDomains.some(blocked => path.includes(blocked))
        );
        if (dangerousPaths.length > 0) {
          errors.push({
            field: 'environment.fileSystem.allowedPaths',
            message: `Dangerous file paths found: ${dangerousPaths.join(', ')}`,
            code: 'DANGEROUS_PATHS',
            severity: 'error'
          });
        }
      }

      if (agent.environment?.fileSystem?.allowDelete && agent.role !== 'robo-developer') {
        warnings.push({
          field: 'environment.fileSystem.allowDelete',
          message: 'File deletion enabled for non-developer agent',
          recommendation: 'Consider disabling file deletion for security'
        });
      }
    }

    // API key security
    if (agent.authentication?.credentials?.apiKey) {
      const apiKey = agent.authentication.credentials.apiKey;

      // Check for common test/dev keys
      const testKeys = ['sk-test', 'test_', 'demo_', 'fake_', 'mock_'];
      if (testKeys.some(testKey => apiKey.toLowerCase().startsWith(testKey))) {
        warnings.push({
          field: 'authentication.credentials.apiKey',
          message: 'Test or demo API key detected',
          recommendation: 'Use production API keys for production agents'
        });
      }

      // Check for weak API key patterns
      if (apiKey.length < 20 || /^(.)\1{10,}$/.test(apiKey)) {
        errors.push({
          field: 'authentication.credentials.apiKey',
          message: 'API key appears to be weak or invalid',
          code: 'WEAK_API_KEY',
          severity: 'error'
        });
      }
    }

    // Role-based security checks
    if (agent.role === 'robo-security-expert') {
      // Security experts should have limited access to prevent privilege escalation
      if (agent.capabilities?.canExecuteCommands && agent.environment?.allowedCommands?.includes('sudo')) {
        errors.push({
          field: 'environment.allowedCommands',
          message: 'Security expert should not have sudo access',
          code: 'PRIVILEGE_ESCALATION_RISK',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Performance validation
   */
  private async validatePerformance(agent: AgentConfig): Promise<AgentConfigValidation> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Response time validation
    if (agent.limits?.maxExecutionTime) {
      if (agent.limits.maxExecutionTime > this.performanceThresholds.maxResponseTime) {
        warnings.push({
          field: 'limits.maxExecutionTime',
          message: `Max execution time exceeds recommended threshold (${this.performanceThresholds.maxResponseTime}ms)`,
          recommendation: 'Consider reducing max execution time for better responsiveness'
        });
      }

      if (agent.limits.maxExecutionTime < 5000) { // 5 seconds
        warnings.push({
          field: 'limits.maxExecutionTime',
          message: 'Max execution time might be too short for complex tasks',
          recommendation: 'Consider increasing max execution time for complex operations'
        });
      }
    }

    // Memory usage validation
    if (agent.limits?.maxMemoryUsage) {
      if (agent.limits.maxMemoryUsage > this.performanceThresholds.maxMemoryUsage) {
        warnings.push({
          field: 'limits.maxMemoryUsage',
          message: `Memory limit exceeds recommended threshold (${this.performanceThresholds.maxMemoryUsage}MB)`,
          recommendation: 'Consider reducing memory limit to prevent resource exhaustion'
        });
      }

      if (agent.limits.maxMemoryUsage < 128) { // 128MB minimum
        warnings.push({
          field: 'limits.maxMemoryUsage',
          message: 'Memory limit might be too low for effective operation',
          recommendation: 'Consider increasing memory limit to at least 128MB'
        });
      }
    }

    // Token rate validation
    if (agent.limits?.maxRequestsPerHour) {
      const hourlyTokens = agent.limits.maxRequestsPerHour * (agent.limits.maxTokensPerRequest || 1000);
      if (hourlyTokens > this.performanceThresholds.maxTokensPerMinute * 60) {
        warnings.push({
          field: 'limits.maxRequestsPerHour',
          message: 'Token rate might exceed provider limits',
          recommendation: 'Consider reducing request rate to avoid rate limiting'
        });
      }
    }

    // Concurrent task validation
    if (agent.limits?.maxConcurrentTasks) {
      if (agent.limits.maxConcurrentTasks > 10) {
        warnings.push({
          field: 'limits.maxConcurrentTasks',
          message: 'High concurrent task limit may impact performance',
          recommendation: 'Consider limiting concurrent tasks to 10 or fewer'
        });
      }

      if (agent.capabilities?.supportsParallel === false && agent.limits.maxConcurrentTasks > 1) {
        errors.push({
          field: 'limits.maxConcurrentTasks',
          message: 'Agent does not support parallel execution but concurrent tasks > 1',
          code: 'PARALLEL_MISMATCH',
          severity: 'error'
        });
      }
    }

    // Tool performance impact
    if (agent.tools && agent.tools.length > 20) {
      warnings.push({
        field: 'tools',
        message: 'Large number of tools may impact performance',
        recommendation: 'Consider organizing tools into specialized agents'
      });
    }

    // Context length optimization
    if (agent.capabilities?.maxContextLength && agent.capabilities.maxContextLength > 100000) { // 100k tokens
      suggestions.push('Consider implementing context compression for large contexts');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Compatibility validation
   */
  private async validateCompatibility(agent: AgentConfig): Promise<AgentConfigValidation> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Ensure metadata exists
    if (!agent.metadata) {
      errors.push({
        field: 'metadata',
        message: 'Agent metadata are required for compatibility validation',
        code: 'MISSING_METADATA',
        severity: 'error'
      });
      return { valid: false, errors, warnings, suggestions };
    }

    // Provider-role compatibility
    const incompatibleCombinations = [
      { provider: 'anthropic', role: 'robo-ui-designer', reason: 'Limited visual capabilities' },
      { provider: 'openai', role: 'robo-security-expert', reason: 'Security concerns with external APIs' },
      { provider: 'google', role: 'robo-documenter', reason: 'Documentation quality variations' }
    ];

    for (const combo of incompatibleCombinations) {
      if (agent.provider === combo.provider && agent.role === combo.role) {
        warnings.push({
          field: 'provider-role-compatibility',
          message: `${combo.provider} may not be optimal for ${combo.role}`,
          recommendation: `Consider alternative provider. Reason: ${combo.reason}`
        });
      }
    }

    // Model capability compatibility
    if (agent.type === 'claude-code-anthropic' && agent.capabilities?.supportsImages) {
      // Claude Code has limited image support
      warnings.push({
        field: 'capabilities.supportsImages',
        message: 'Claude Code has limited image processing capabilities',
        recommendation: 'Consider using Claude 3 Vision for advanced image tasks'
      });
    }

    // Environment compatibility
    if (agent.environment?.nodeVersion) {
      const nodeVersion = parseInt(agent.environment?.nodeVersion || '18', 10);
      if (nodeVersion < 16) {
        errors.push({
          field: 'environment.nodeVersion',
          message: 'Node.js version 16 or higher is required',
          code: 'OUTDATED_NODE_VERSION',
          severity: 'error'
        });
      }
    }

    if (agent.environment?.pythonVersion) {
      const pythonVersion = parseFloat(agent.environment?.pythonVersion || '3.9');
      if (pythonVersion < 3.8) {
        errors.push({
          field: 'environment.pythonVersion',
          message: 'Python 3.8 or higher is required',
          code: 'OUTDATED_PYTHON_VERSION',
          severity: 'error'
        });
      }
    }

    // Platform compatibility
    if (agent.metadata?.compatibility) {
      const currentPlatform = process.platform;
      if (!agent.metadata.compatibility.platforms.includes(currentPlatform)) {
        warnings.push({
          field: 'metadata.compatibility.platforms',
          message: `Agent may not be fully compatible with ${currentPlatform}`,
          recommendation: 'Test agent functionality on current platform'
        });
      }
    }

    // Feature compatibility
    if (agent.capabilities?.supportsSubAgents && !agent.capabilities?.supportsParallel) {
      warnings.push({
        field: 'capabilities.supportsSubAgents',
        message: 'Sub-agents support without parallel execution may limit effectiveness',
        recommendation: 'Enable parallel execution for optimal sub-agent performance'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Cost estimation
   */
  private async validateCosts(agent: AgentConfig): Promise<CostEstimation> {
    const providerKey = `${agent.provider}-${agent.type}`;
    const costPerMillionTokens = this.providerCosts.get(providerKey) || 0.01; // Default fallback
    const maxTokens = agent.limits?.maxTokensPerRequest || 1000;
    const requestsPerDay = agent.limits?.maxRequestsPerDay || 100;

    const costPerToken = costPerMillionTokens / 1000000;

    // Calculate cost ranges based on actual usage vs limits
    const utilizationRate = 0.3; // Assume 30% average utilization

    return {
      perRequest: {
        min: costPerToken * (maxTokens * 0.1), // 10% of max
        max: costPerToken * maxTokens,
        average: costPerToken * (maxTokens * utilizationRate)
      },
      perDay: {
        min: costPerToken * (maxTokens * 0.1) * (requestsPerDay * 0.1),
        max: costPerToken * maxTokens * requestsPerDay,
        average: costPerToken * (maxTokens * utilizationRate) * (requestsPerDay * utilizationRate)
      },
      perMonth: {
        min: costPerToken * (maxTokens * 0.1) * (requestsPerDay * 0.1) * 30,
        max: costPerToken * maxTokens * requestsPerDay * 30,
        average: costPerToken * (maxTokens * utilizationRate) * (requestsPerDay * utilizationRate) * 30
      },
      currency: 'USD'
    };
  }

  /**
   * Resource estimation
   */
  private async validateResources(agent: AgentConfig): Promise<ResourceEstimation> {
    const maxTokens = agent.limits?.maxTokensPerRequest || 1000;
    const hasTools = agent.tools && agent.tools.length > 0;
    const hasCodeExecution = agent.capabilities?.canExecuteCommands || false;

    // Base memory calculation: ~2MB per 1000 tokens + overhead
    const baseMemory = (maxTokens / 1000) * 2;
    const toolMemory = hasTools ? agent.tools.length * 5 : 0; // 5MB per tool
    const codeExecutionMemory = hasCodeExecution ? 128 : 0; // 128MB for code execution

    return {
      memory: {
        min: Math.max(64, baseMemory + 32), // Minimum 64MB
        max: baseMemory + toolMemory + codeExecutionMemory + 256,
        recommended: baseMemory + toolMemory + codeExecutionMemory + 128
      },
      cpu: {
        min: 5, // 5% minimum
        max: hasCodeExecution ? 80 : 40, // Higher for code execution
        recommended: hasCodeExecution ? 50 : 20
      },
      storage: {
        temp: hasCodeExecution ? 100 : 50, // MB for temporary files
        persistent: 10 // MB for logs and cache
      },
      network: {
        bandwidth: Math.max(1, (maxTokens / 1000) * 0.5), // MB per hour
        requests: agent.limits?.maxRequestsPerHour || 10
      }
    };
  }

  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(validation: AgentConfigValidation): number {
    let score = 100;

    // Deduct points for security issues
    score -= validation.errors.filter(e => e.code.includes('SECURITY') || e.code.includes('FORBIDDEN')).length * 25;
    score -= validation.warnings.filter(w => w.field.includes('security') || w.field.includes('authentication')).length * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(validation: AgentConfigValidation): number {
    let score = 100;

    // Deduct points for performance issues
    score -= validation.errors.filter(e => e.field.includes('performance') || e.field.includes('limits')).length * 25;
    score -= validation.warnings.filter(w => w.field.includes('performance') || w.field.includes('limits')).length * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate compatibility score (0-100)
   */
  private calculateCompatibilityScore(validation: AgentConfigValidation): number {
    let score = 100;

    // Deduct points for compatibility issues
    score -= validation.errors.filter(e => e.code.includes('COMPATIBILITY') || e.field.includes('version')).length * 25;
    score -= validation.warnings.filter(w => w.field.includes('compatibility') || w.field.includes('version')).length * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    security: AgentConfigValidation,
    performance: AgentConfigValidation,
    compatibility: AgentConfigValidation,
    agent: AgentConfig
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];

    // Security recommendations
    if (security.errors.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        title: 'Fix Security Issues',
        description: `Agent has ${security.errors.length} security error(s) that must be resolved`,
        action: 'Review and fix all security validation errors',
        impact: 'Prevents security vulnerabilities and unauthorized access'
      });
    }

    if (agent.authentication && !agent.authentication.encrypted) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        title: 'Enable Credential Encryption',
        description: 'API keys and credentials are stored in plain text',
        action: 'Enable authentication encryption and set ENCRYPTION_KEY environment variable',
        impact: 'Protects sensitive credentials from unauthorized access'
      });
    }

    // Performance recommendations
    if (performance.warnings.some(w => w.field.includes('executionTime'))) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Optimize Execution Time',
        description: 'Agent execution time limits may impact performance',
        action: 'Review and optimize max execution time based on task complexity',
        impact: 'Improves agent responsiveness and user experience'
      });
    }

    // Compatibility recommendations
    if (compatibility.warnings.some(w => w.field.includes('compatibility'))) {
      recommendations.push({
        type: 'compatibility',
        priority: 'medium',
        title: 'Improve Platform Compatibility',
        description: 'Agent may have compatibility issues with current platform',
        action: 'Test agent functionality and update compatibility settings',
        impact: 'Ensures reliable operation across different environments'
      });
    }

    // Usability recommendations
    if (!agent.personality?.customInstructions) {
      recommendations.push({
        type: 'usability',
        priority: 'low',
        title: 'Add Custom Instructions',
        description: 'Agent lacks custom personality instructions',
        action: 'Add custom instructions to tailor agent behavior',
        impact: 'Improves agent performance and user experience'
      });
    }

    return recommendations;
  }

  /**
   * Initialize security rules
   */
  private initializeSecurityRules(): void {
    this.securityRules = {
      allowedDomains: [],
      blockedDomains: ['malware.com', 'phishing.com', 'suspicious.net'],
      allowedCommands: ['git', 'npm', 'node', 'python', 'ls', 'cat', 'grep'],
      blockedCommands: ['rm -rf', 'sudo', 'chmod 777', 'dd', 'mkfs', 'format'],
      maxApiKeyLength: 200,
      requireHttps: true,
      allowFileSystemAccess: true,
      allowCommandExecution: true
    };
  }

  /**
   * Initialize performance thresholds
   */
  private initializePerformanceThresholds(): void {
    this.performanceThresholds = {
      maxResponseTime: 300000, // 5 minutes
      maxMemoryUsage: 4096, // 4GB
      maxCpuUsage: 80, // 80%
      maxTokensPerMinute: 60000, // 60k tokens/min
      maxRequestsPerMinute: 100,
      minSuccessRate: 95 // 95%
    };
  }

  /**
   * Initialize provider cost and context data
   */
  private initializeProviderData(): void {
    // Cost per 1M tokens (approximate values)
    this.providerCosts.set('anthropic-claude-code-anthropic', 15.0);
    this.providerCosts.set('openai-codex', 20.0);
    this.providerCosts.set('google-gemini', 10.0);
    this.providerCosts.set('groq-codex', 5.0);

    // Max context lengths
    this.modelContexts.set('anthropic-claude-code-anthropic', 200000);
    this.modelContexts.set('openai-codex', 128000);
    this.modelContexts.set('google-gemini', 1048576);
    this.modelContexts.set('groq-codex', 32768);
  }

  /**
   * Helper methods
   */
  private isValidAgentType(type: unknown): type is AgentType {
    if (typeof type !== 'string') return false;
    const validTypes: AgentType[] = [
      'claude-code-anthropic',
      'claude-code-glm',
      'codex',
      'gemini',
      'amp',
      'aider',
      'github-copilot',
      'custom'
    ];
    return validTypes.includes(type as AgentType);
  }

  private isValidAgentRole(role: unknown): role is AgentRole {
    if (typeof role !== 'string') return false;
    const validRoles: AgentRole[] = [
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
    return validRoles.includes(role as AgentRole);
  }

  private isValidProviderType(provider: unknown): provider is ProviderType {
    if (typeof provider !== 'string') return false;
    const validProviders: ProviderType[] = [
      'anthropic',
      'openai',
      'google',
      'groq',
      'ollama',
      'github',
      'custom'
    ];
    return validProviders.includes(provider as ProviderType);
  }

  /**
   * Update security rules
   */
  updateSecurityRules(rules: Partial<SecurityValidationRules>): void {
    this.securityRules = { ...this.securityRules, ...rules };
    this.emit('security-rules-updated', this.securityRules);
  }

  /**
   * Update performance thresholds
   */
  updatePerformanceThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.performanceThresholds = { ...this.performanceThresholds, ...thresholds };
    this.emit('performance-thresholds-updated', this.performanceThresholds);
  }

  /**
   * Add provider cost data
   */
  addProviderCost(provider: string, model: string, costPerMillionTokens: number): void {
    this.providerCosts.set(`${provider}-${model}`, costPerMillionTokens);
    this.emit('provider-cost-added', { provider, model, costPerMillionTokens });
  }

  /**
   * Add model context data
   */
  addModelContext(provider: string, model: string, maxContextLength: number): void {
    this.modelContexts.set(`${provider}-${model}`, maxContextLength);
    this.emit('model-context-added', { provider, model, maxContextLength });
  }
}

// Global instance
export const agentValidator = new AgentValidator();

export default AgentValidator;