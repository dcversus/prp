/**
 * ♫ Guidelines Registry for @dcversus/prp
 *
 * Central registry for managing guidelines, their dependencies,
 * and signal mappings with enable/disable functionality.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { EventEmitter } from 'events';
import {
  GuidelineDefinition,
  GuidelineRegistry,
  GuidelineExecution,
  GuidelineContext,
  GuidelineMetrics,
  GuidelineTemplate,
  SignalPattern,
  ActivityEntry,
  TokenStatusInfo,
  AgentStatusInfo,
  SharedNoteInfo,
  EnvironmentInfo,
  ExecutionError,
  GuidelineResult
} from './types';
import {
  Signal,
  eventBus,
  logger,
  FileUtils,
  ConfigUtils,
  TimeUtils,
  HashUtils,
  Validator,
  AgentRole
} from '../shared';
import { configManager } from '../shared/config';

// Interface for GitHub agent with credentials
interface GitHubAgentConfig {
  type: string;
  credentials?: {
    token?: string;
  };
}

// Event data interfaces
interface GuidelineCompletedEventData {
  executionId: string;
  guidelineId: string;
  result: unknown;
  performance: unknown;
}

interface GuidelineFailedEventData {
  executionId: string;
  guidelineId: string;
  error: ExecutionError;
  context: GuidelineContext;
}

/**
 * ♫ Guidelines Registry - The conductor's rulebook
 */
export class GuidelinesRegistry extends EventEmitter {
  private registry: GuidelineRegistry;
  private executions: Map<string, GuidelineExecution> = new Map();
  private metrics: Map<string, GuidelineMetrics> = new Map();
  private templates: Map<string, GuidelineTemplate> = new Map();
  private signalPatterns: Map<string, SignalPattern> = new Map();
  private configPath: string = '.prp/guidelines.json';

  constructor() {
    super();
    this.registry = {
      guidelines: new Map(),
      categories: new Map(),
      dependencies: new Map(),
      dependents: new Map(),
      signalMappings: new Map()
    };
    this.initializeDefaultGuidelines();
    this.setupEventHandlers();
  }

  /**
   * Initialize default guidelines
   */
  private initializeDefaultGuidelines(): void {
    // Pull Request Analysis Guideline - Main guideline for comprehensive Pull Request review
    this.registerGuideline({
      id: 'pull-request-analysis',
      name: 'Comprehensive Pull Request Analysis',
      description: 'GitHub-integrated analysis of Pull Requests with implementation completeness assessment',
      category: 'development',
      priority: 'critical',
      enabled: true,
      protocol: {
        id: 'pull-request-analysis-protocol',
        description: 'Complete Pull Request analysis workflow with GitHub data fetching and implementation assessment',
        steps: [
          {
            id: 'fetch-pull-request-data',
            name: 'Fetch Pull Request Data from GitHub',
            description: 'Gather comprehensive Pull Request information including status, CI checks, comments, reviews, and files',
            type: 'action_execution' as const,
            required: true,
            outputs: ['pr-data', 'ci-status', 'comments', 'reviews', 'files-changed'],
            nextSteps: ['inspector-analysis']
          },
          {
            id: 'inspector-analysis',
            name: 'Inspector: Implementation Analysis',
            description: 'Analyze how completely the Pull Request implements the requested task, match description vs actual code changes',
            type: 'inspector_analysis' as const,
            required: true,
            outputs: ['implementation-analysis', 'task-completeness', 'requirement-compliance'],
            nextSteps: ['structural-classification']
          },
          {
            id: 'structural-classification',
            name: 'Structural Classification',
            description: 'Classify findings by priority/importance and create structured assessment',
            type: 'orchestrator_decision' as const,
            required: true,
            outputs: ['priority-classification', 'risk-assessment', 'next-actions'],
            nextSteps: ['orchestrator-decision']
          },
          {
            id: 'orchestrator-decision',
            name: 'Orchestrator: Decision & Action',
            description: 'Make final Pull Request decision and take appropriate actions (approve, request changes, comment)',
            type: 'orchestrator_decision' as const,
            required: true,
            outputs: ['final-decision', 'action-plan', 'feedback-generated'],
            nextSteps: []
          }
        ],
        decisionPoints: [
          {
            id: 'approval-decision',
            question: 'Based on the analysis, what is the appropriate action for this Pull Request?',
            options: [
              {
                id: 'approve',
                label: 'Approve Pull Request - Ready to merge',
                action: 'approve-pr',
                nextSteps: []
              },
              {
                id: 'changes',
                label: 'Request Changes - Not ready yet',
                action: 'request-changes',
                nextSteps: []
              },
              {
                id: 'comment',
                label: 'Add Comments - Minor issues only',
                action: 'add-comments',
                nextSteps: []
              },
              {
                id: 'escalate',
                label: 'Escalate - Requires human review',
                action: 'escalate-review',
                nextSteps: []
              }
            ],
            requiresInput: true
          }
        ],
        successCriteria: [
          'PR data fully fetched from GitHub',
          'Implementation completeness assessed',
          'Description vs realization analyzed',
          'Structural classification completed',
          'Action taken (approve/changes/comments)',
          'Feedback generated and posted'
        ],
        fallbackActions: [
          'Escalate to human reviewer',
          'Request more context from PR author',
          'Schedule follow-up review',
          'Mark PR as needing additional work'
        ]
      },
      requirements: [
        {
          type: 'service',
          name: 'GitHub API Access',
          required: true,
          check: async () => {
            try {
              const config = configManager.get();
              const hasGitHubAgent = config.agents.some(a => a.type.includes('github'));
              const githubAgent = config.agents.find(a => a.type.includes('github')) as GitHubAgentConfig | undefined;
              const hasToken = process.env.GITHUB_TOKEN ||
                githubAgent?.credentials?.token;
              return Boolean(hasGitHubAgent && hasToken);
            } catch {
              return false;
            }
          },
          errorMessage: 'GitHub API access with valid token required for PR analysis'
        }
      ],
      prompts: {
        inspector: `You are a PR Implementation Inspector. Your role is to analyze how completely the PR implements the requested task.

TASK: Assess implementation completeness and description vs realization match

CONTEXT:
{{context}}

PR DATA:
{{prData}}
CI STATUS: {{ciStatus}}
COMMENTS: {{comments}}
REVIEWS: {{reviews}}
FILES CHANGED: {{filesChanged}}

ANALYSIS FOCUS:
1. **Task Implementation**: How much of the requested task/feature is actually implemented?
2. **Description Match**: Does the actual implementation match the PR description?
3. **Requirements Compliance**: Are all requirements from the description implemented?
4. **Code Quality**: Is the implementation well-structured and maintainable?
5. **Testing**: Are appropriate tests included?
6. **Edge Cases**: Are edge cases handled appropriately?

RESPOND WITH STRUCTURED JSON:
{
  "implementation_analysis": {
    "task_completeness": {
      "percentage_complete": number (0-100),
      "missing_features": string[],
      "partially_implemented": string[],
      "fully_implemented": string[]
    },
    "description_realization_match": {
      "match_score": number (0-100),
      "discrepancies": string[],
      "unimplemented_promises": string[],
      "additional_implementation": string[]
    },
    "requirement_compliance": {
      "requirements_met": string[],
      "requirements_partially_met": string[],
      "requirements_not_met": string[],
      "additional_requirements_needed": string[]
    },
    "code_quality_assessment": {
      "structure_rating": "excellent" | "good" | "fair" | "poor",
      "maintainability_rating": "excellent" | "good" | "fair" | "poor",
      "best_practices_followed": string[],
      "improvements_needed": string[]
    },
    "testing_assessment": {
      "tests_present": boolean,
      "test_coverage": "none" | "minimal" | "adequate" | "comprehensive",
      "test_quality": "poor" | "fair" | "good" | "excellent",
      "missing_tests": string[]
    },
    "priority_issues": [
      {
        "type": "critical" | "high" | "medium" | "low",
        "category": "functionality" | "security" | "performance" | "maintainability" | "testing",
        "description": string,
        "file": string,
        "line_number": number,
        "suggested_fix": string
      }
    ]
  },
  "overall_assessment": {
    "ready_for_review": boolean,
    "estimated_review_complexity": "simple" | "moderate" | "complex",
    "recommended_action": "approve" | "request_changes" | "needs_discussion" | "escalate",
    "confidence_score": number (0-100)
  }
}`,
        orchestrator: `You are a PR Review Orchestrator. Based on the Inspector's analysis, make final decisions and take actions.

INSPECTOR ANALYSIS:
{{inspectorAnalysis}}

PR CONTEXT:
{{context}}

YOUR ROLE:
1. **Evaluate Inspector Findings**: Review the implementation analysis
2. **Structural Classification**: Organize issues by priority and importance
3. **Decision Making**: Choose appropriate action (approve/request changes/comment)
4. **Action Execution**: Use GitHub tools to post comments, reviews, or approvals

CLASSIFICATION FRAMEWORK:
- **Critical**: Must fix before merge (security, functionality, major bugs)
- **High**: Should fix before merge (performance, important edge cases)
- **Medium**: Nice to have (code quality, documentation)
- **Low**: Cosmetic issues (style, minor improvements)

ACTION OPTIONS:
- **Approve**: PR is ready, no blocking issues
- **Request Changes**: Has blocking issues that need fixing
- **Comment**: Minor issues only, can merge with suggestions
- **Escalate**: Complex issues requiring human judgment

EXECUTE APPROPRIATE ACTIONS using GitHub API tools.

RESPOND WITH:
1. Final decision with reasoning
2. Action taken (comment posted, review created, etc.)
3. Next steps for PR author
4. Any follow-up needed`
      },
      tokenLimits: {
        inspector: 35000,
        orchestrator: 25000
      },
      tools: [
        'github-api',
        'file-reader',
        'comment-generator',
        'review-creator',
        'pr-analyzer'
      ],
      metadata: {
        version: '2.0.0',
        author: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        tags: ['pr-analysis', 'github', 'implementation-review', 'quality-assessment'],
        dependencies: []
      }
    });

    // Security Review Guideline - Specialized for security analysis
    this.registerGuideline({
      id: 'security-review',
      name: 'Security Vulnerability Assessment',
      description: 'Specialized security analysis for PRs with focus on vulnerabilities and best practices',
      category: 'security',
      priority: 'critical',
      enabled: true,
      protocol: {
        id: 'pull-request-security-analysis-protocol',
        description: 'Comprehensive security analysis of code changes',
        steps: [
          {
            id: 'fetch-pr-security-data',
            name: 'Fetch PR Data for Security Analysis',
            description: 'Gather PR data with focus on security-relevant changes',
            type: 'inspector_analysis',
            required: true,
            outputs: ['security-pr-data', 'changed-files', 'dependencies'],
            nextSteps: ['vulnerability-scan']
          },
          {
            id: 'vulnerability-scan',
            name: 'Inspector: Vulnerability Scan',
            description: 'Scan for common security vulnerabilities and issues',
            type: 'inspector_analysis',
            required: true,
            outputs: ['vulnerability-findings', 'risk-assessment', 'security-issues'],
            nextSteps: ['security-classification']
          },
          {
            id: 'security-classification',
            name: 'Security Risk Classification',
            description: 'Classify security issues by severity and impact',
            type: 'orchestrator_decision',
            required: true,
            outputs: ['severity-classification', 'security-recommendations'],
            nextSteps: ['orchestrator-security-decision']
          },
          {
            id: 'orchestrator-security-decision',
            name: 'Orchestrator: Security Decision',
            description: 'Make security-focused decisions and generate security reports',
            type: 'orchestrator_decision',
            required: true,
            outputs: ['security-decision', 'security-report', 'blocking-issues'],
            nextSteps: []
          }
        ],
        decisionPoints: [
          {
            id: 'security-decision',
            question: 'What is the appropriate security action?',
            options: [
              {
                id: 'approve-secure',
                label: 'Approve - No security issues',
                action: 'security-approve',
                nextSteps: []
              },
              {
                id: 'request-fixes',
                label: 'Request Security Fixes',
                action: 'security-changes',
                nextSteps: []
              },
              {
              id: 'block-merge',
                label: 'Block Merge - Critical Issues',
                action: 'security-block',
                nextSteps: []
              }
            ],
            requiresInput: true
          }
        ],
        successCriteria: [
          'Security vulnerabilities identified',
          'Risk assessment completed',
          'Severity classification done',
          'Security recommendations provided',
          'Decision made on security grounds'
        ],
        fallbackActions: [
          'Escalate to security expert',
          'Request security audit',
          'Mark as security-sensitive'
        ]
      },
      requirements: [
        {
          type: 'service',
          name: 'GitHub API Access',
          required: true,
          check: async () => {
            const config = configManager.get();
            const hasGitHubAgent = config.agents.some(a => a.type.includes('github'));
            const githubAgent = config.agents.find(a => a.type.includes('github')) as GitHubAgentConfig | undefined;
            const hasToken = process.env.GITHUB_TOKEN ||
              githubAgent?.credentials?.token;
            return Boolean(hasGitHubAgent && hasToken);
          },
          errorMessage: 'GitHub API access required for security review'
        }
      ],
      prompts: {
        inspector: `You are a Security Inspector. Analyze the PR for security vulnerabilities.

TASK: Comprehensive security vulnerability assessment

CONTEXT:
{{context}}

PR DATA:
{{prData}}
FILES CHANGED:
{{filesChanged}}

SECURITY ANALYSIS FOCUS:
1. **Common Vulnerabilities**: SQL injection, XSS, CSRF, authentication bypass
2. **Dependency Security**: Check for vulnerable dependencies
3. **Input Validation**: Proper sanitization and validation
4. **Authentication/Authorization**: Proper access controls
5. **Data Protection**: Sensitive data handling, encryption
6. **Configuration Security**: Hardcoded secrets, insecure configs
7. **API Security**: Proper authentication, rate limiting
8. **Infrastructure Security**: Docker, CI/CD security

RESPOND WITH STRUCTURED JSON:
{
  "security_analysis": {
    "vulnerabilities_found": [
      {
        "severity": "critical" | "high" | "medium" | "low",
        "type": "sql_injection" | "xss" | "csrf" | "auth_bypass" | "data_leak" | "dependency" | "config",
        "description": string,
        "file": string,
        "line_number": number,
        "code_snippet": string,
        "impact": string,
        "remediation": string,
        "cve_mappable": boolean
      }
    ],
    "risk_assessment": {
      "overall_risk": "critical" | "high" | "medium" | "low",
      "data_exposure_risk": "high" | "medium" | "low",
      "authentication_risk": "high" | "medium" | "low",
      "authorization_risk": "high" | "medium" | "low"
    },
    "security_best_practices": {
      "followed": string[],
      "violated": string[],
      "missing": string[]
    },
    "dependency_scan": {
      "vulnerable_dependencies": [
        {
          "package": string,
          "version": string,
          "vulnerability": string,
          "severity": "high" | "medium" | "low",
          "fixed_version": string
        }
      ]
    }
  },
  "security_recommendation": {
    "action_required": boolean,
    "block_merge": boolean,
    "priority_fixes": string[],
    "additional_checks_needed": string[],
    "security_score": number (0-100)
  }
}`,
        orchestrator: `You are a Security Review Orchestrator. Based on security analysis, make security-focused decisions.

SECURITY ANALYSIS:
{{inspectorAnalysis}}

PR CONTEXT:
{{context}}

SECURITY DECISION FRAMEWORK:
- **Critical**: Block merge, immediate fixes required
- **High**: Request changes before merge
- **Medium**: Can merge with security comments
- **Low**: Merge with recommendations

EXECUTE SECURITY-ACTIONS:
1. Post security-focused review
2. Create security bug reports if needed
3. Request additional security scans
4. Coordinate with security team

RESPOND WITH:
1. Security decision and reasoning
2. Security review posted (if applicable)
3. Security recommendations for team
4. Follow-up security actions needed`
      },
      tokenLimits: {
        inspector: 30000,
        orchestrator: 20000
      },
      tools: [
        'github-api',
        'security-scanner',
        'dependency-checker',
        'file-reader',
        'vulnerability-database'
      ],
      metadata: {
        version: '1.0.0',
        author: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        tags: ['security', 'vulnerability', 'security-review'],
        dependencies: []
      }
    });

    // Pull Request Performance Analysis Guideline - Specialized for performance impact in Pull Requests
    this.registerGuideline({
      id: 'pull-request-performance-analysis',
      name: 'Pull Request Performance Analysis',
      description: 'Analyzes performance implications of code changes in Pull Requests',
      category: 'performance',
      priority: 'high',
      enabled: true,
      protocol: {
        id: 'pull-request-performance-analysis-protocol',
        description: 'Comprehensive performance analysis of code changes',
        steps: [
          {
            id: 'fetch-performance-data',
            name: 'Fetch PR Data for Performance Analysis',
            description: 'Gather PR data with focus on performance-relevant changes',
            type: 'inspector_analysis',
            required: true,
            outputs: ['performance-pr-data', 'performance-files'],
            nextSteps: ['performance-analysis']
          },
          {
            id: 'performance-analysis',
            name: 'Inspector: Performance Analysis',
            description: 'Analyze performance implications of code changes',
            type: 'inspector_analysis',
            required: true,
            outputs: ['performance-findings', 'bottlenecks', 'optimization-opportunities'],
            nextSteps: ['performance-classification']
          },
          {
            id: 'performance-classification',
            name: 'Performance Impact Classification',
            description: 'Classify performance issues by impact and priority',
            type: 'orchestrator_decision',
            required: true,
            outputs: ['impact-classification', 'performance-recommendations'],
            nextSteps: ['orchestrator-performance-decision']
          },
          {
            id: 'orchestrator-performance-decision',
            name: 'Orchestrator: Performance Decision',
            description: 'Make performance-focused decisions and recommendations',
            type: 'orchestrator_decision',
            required: true,
            outputs: ['performance-decision', 'optimization-plan'],
            nextSteps: []
          }
        ],
        decisionPoints: [
          {
            id: 'performance-decision',
            question: 'What is the appropriate performance action?',
            options: [
              {
                id: 'approve-performant',
                label: 'Approve - No performance issues',
                action: 'performance-approve',
                nextSteps: []
              },
              {
                id: 'request-optimizations',
                label: 'Request Performance Optimizations',
                action: 'performance-changes',
                nextSteps: []
              },
              {
                id: 'requires-benchmarks',
                label: 'Requires Performance Benchmarks',
                action: 'performance-benchmarks',
                nextSteps: []
              }
            ],
            requiresInput: true
          }
        ],
        successCriteria: [
          'Performance implications analyzed',
          'Bottlenecks identified',
          'Optimization opportunities found',
          'Performance recommendations provided',
          'Decision made on performance grounds'
        ],
        fallbackActions: [
          'Request performance benchmarks',
          'Escalate to performance expert',
          'Add performance monitoring'
        ]
      },
      requirements: [
        {
          type: 'service',
          name: 'GitHub API Access',
          required: true,
          check: async () => {
            const config = configManager.get();
            const hasGitHubAgent = config.agents.some(a => a.type.includes('github'));
            const githubAgent = config.agents.find(a => a.type.includes('github')) as GitHubAgentConfig | undefined;
            const hasToken = process.env.GITHUB_TOKEN ||
              githubAgent?.credentials?.token;
            return Boolean(hasGitHubAgent && hasToken);
          },
          errorMessage: 'GitHub API access required for performance review'
        }
      ],
      prompts: {
        inspector: `You are a Performance Inspector. Analyze the PR for performance implications.

TASK: Comprehensive performance impact assessment

CONTEXT:
{{context}}

PR DATA:
{{prData}}
FILES CHANGED:
{{filesChanged}}

PERFORMANCE ANALYSIS FOCUS:
1. **Algorithm Complexity**: Big O analysis, efficiency considerations
2. **Database Queries**: N+1 queries, missing indexes, query optimization
3. **Memory Usage**: Memory leaks, large object allocations
4. **API Performance**: Response times, rate limiting, caching
5. **Frontend Performance**: Bundle size, rendering performance
6. **Scalability**: Load handling, concurrent operations
7. **Resource Usage**: CPU, I/O, network efficiency
8. **Caching Strategy**: Cache invalidation, hit rates

RESPOND WITH STRUCTURED JSON:
{
  "performance_analysis": {
    "algorithm_analysis": [
      {
        "function": string,
        "complexity": string,
        "performance_impact": "high" | "medium" | "low",
        "optimization_suggestion": string
      }
    ],
    "database_analysis": {
      "query_issues": [
        {
          "type": "n_plus_1" | "missing_index" | "inefficient_join",
          "file": string,
          "description": string,
          "impact": string,
          "solution": string
        }
      ],
      "index_recommendations": string[]
    },
    "memory_analysis": {
      "potential_leaks": string[],
      "large_allocations": string[],
      "optimization_opportunities": string[]
    },
    "api_performance": {
      "endpoint_changes": [
        {
          "endpoint": string,
          "change_type": "added" | "modified" | "removed",
          "performance_impact": "positive" | "negative" | "neutral",
          "caching_needs": boolean
        }
      ]
    },
    "scalability_concerns": [
      {
        "area": string,
        "concern": string,
        "impact": "high" | "medium" | "low",
        "mitigation": string
      }
    ]
  },
  "performance_recommendation": {
    "overall_impact": "positive" | "negative" | "neutral",
    "optimization_priority": "high" | "medium" | "low",
    "benchmarks_needed": string[],
    "performance_score": number (0-100)
  }
}`,
        orchestrator: `You are a Performance Review Orchestrator. Based on performance analysis, make performance-focused decisions.

PERFORMANCE ANALYSIS:
{{inspectorAnalysis}}

PR CONTEXT:
{{context}}

PERFORMANCE DECISION FRAMEWORK:
- **High Impact**: Block or request optimization
- **Medium Impact**: Can merge with performance comments
- **Low Impact**: Merge with recommendations

EXECUTE PERFORMANCE-ACTIONS:
1. Post performance-focused review
2. Request performance benchmarks if needed
3. Suggest optimization strategies
4. Coordinate with performance team

RESPOND WITH:
1. Performance decision and reasoning
2. Performance review posted (if applicable)
3. Optimization recommendations
4. Performance monitoring suggestions`
      },
      tokenLimits: {
        inspector: 25000,
        orchestrator: 20000
      },
      tools: [
        'github-api',
        'performance-analyzer',
        'file-reader',
        'complexity-analyzer',
        'benchmark-runner'
      ],
      metadata: {
        version: '1.0.0',
        author: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        tags: ['performance', 'optimization', 'scalability'],
        dependencies: []
      }
    });

    logger.info('shared', 'GuidelinesRegistry', 'Default guidelines registered', { guidelinesCount: this.registry.guidelines.size });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to signals from scanner
    eventBus.subscribeToChannel('signals', (event) => {
      if (event.type === 'signal') {
        this.processSignal(event.data as Signal);
      }
    });

    // Listen to guideline completion events
    eventBus.subscribeToChannel('guidelines', (event) => {
      if (event.type === 'guideline_completed') {
        this.handleGuidelineCompleted(event.data as GuidelineCompletedEventData);
      } else if (event.type === 'guideline_failed') {
        this.handleGuidelineFailed(event.data as GuidelineFailedEventData);
      }
    });
  }

  /**
   * Register a new guideline
   */
  registerGuideline(guideline: GuidelineDefinition): void {
    // Validate guideline
    if (!this.validateGuideline(guideline)) {
      throw new Error(`Invalid guideline: ${guideline.id}`);
    }

    // Check for conflicts
    if (this.registry.guidelines.has(guideline.id)) {
      logger.warn('shared', 'GuidelinesRegistry', `Guideline ${guideline.id} already exists, updating`, { guidelineId: guideline.id });
    }

    // Register guideline
    this.registry.guidelines.set(guideline.id, guideline);

    // Update category mapping
    if (!this.registry.categories.has(guideline.category)) {
      this.registry.categories.set(guideline.category, new Set());
    }
    this.registry.categories.get(guideline.category)!.add(guideline.id);

    // Update dependencies
    this.registry.dependencies.set(guideline.id, new Set(guideline.metadata.dependencies));
    for (const dep of guideline.metadata.dependencies) {
      if (!this.registry.dependents.has(dep)) {
        this.registry.dependents.set(dep, new Set());
      }
      this.registry.dependents.get(dep)!.add(guideline.id);
    }

    // Initialize metrics
    if (!this.metrics.has(guideline.id)) {
      this.metrics.set(guideline.id, {
        guidelineId: guideline.id,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        averageTokenCost: 0,
        successRate: 0,
        popularSteps: {},
        commonErrors: {}
      });
    }

    logger.info('shared', 'GuidelinesRegistry', `Guideline registered: ${guideline.id}`, { guidelineId: guideline.id });
    this.emit('guideline_registered', guideline);
  }

  /**
   * Unregister a guideline
   */
  unregisterGuideline(guidelineId: string): boolean {
    const guideline = this.registry.guidelines.get(guidelineId);
    if (!guideline) {
      return false;
    }

    // Check for dependents
    const dependents = this.registry.dependents.get(guidelineId);
    if (dependents && dependents.size > 0) {
      throw new Error(`Cannot unregister guideline ${guidelineId} - it has dependents: ${Array.from(dependents).join(', ')}`);
    }

    // Remove from registry
    this.registry.guidelines.delete(guidelineId);

    // Update category mapping
    const categoryGuidelines = this.registry.categories.get(guideline.category);
    if (categoryGuidelines) {
      categoryGuidelines.delete(guidelineId);
      if (categoryGuidelines.size === 0) {
        this.registry.categories.delete(guideline.category);
      }
    }

    // Remove dependencies
    this.registry.dependencies.delete(guidelineId);
    for (const dep of guideline.metadata.dependencies) {
      const depDependents = this.registry.dependents.get(dep);
      if (depDependents) {
        depDependents.delete(guidelineId);
        if (depDependents.size === 0) {
          this.registry.dependents.delete(dep);
        }
      }
    }

    // Remove metrics
    this.metrics.delete(guidelineId);

    logger.info('shared', 'GuidelinesRegistry', `Guideline unregistered: ${guidelineId}`, { guidelineId });
    this.emit('guideline_unregistered', guidelineId);
    return true;
  }

  /**
   * Enable/disable a guideline
   */
  setGuidelineEnabled(guidelineId: string, enabled: boolean): boolean {
    const guideline = this.registry.guidelines.get(guidelineId);
    if (!guideline) {
      return false;
    }

    const wasEnabled = guideline.enabled;
    guideline.enabled = enabled;
    guideline.metadata.lastModified = new Date();

    if (wasEnabled !== enabled) {
      logger.info('shared', 'GuidelinesRegistry',
        `Guideline ${guidelineId} ${enabled ? 'enabled' : 'disabled'}`, { guidelineId, enabled });
      this.emit('guideline_toggled', { guidelineId, enabled });
    }

    return true;
  }

  /**
   * Process a signal and trigger relevant guidelines
   */
  async processSignal(signal: Signal): Promise<void> {
    const triggeredGuidelines: string[] = [];

    // Find guidelines that match this signal
    for (const [guidelineId, guideline] of Array.from(this.registry.guidelines.entries())) {
      if (!guideline.enabled) {
        continue;
      }

      // Check if signal matches guideline patterns
      if (this.signalMatchesGuideline(signal, guideline)) {
        triggeredGuidelines.push(guidelineId);
      }
    }

    // Trigger guidelines
    for (const guidelineId of triggeredGuidelines) {
      try {
        await this.triggerGuideline(guidelineId, signal);
      } catch (error) {
        logger.error('shared', 'GuidelinesRegistry',
          `Failed to trigger guideline ${guidelineId}`, error instanceof Error ? error : new Error(String(error)), { guidelineId, signalType: signal.type });
      }
    }

    if (triggeredGuidelines.length > 0) {
      logger.info('shared', 'GuidelinesRegistry',
        `Signal ${signal.type} triggered guidelines: ${triggeredGuidelines.join(', ')}`, { signalType: signal.type, triggeredGuidelines });
    }
  }

  /**
   * Check if a signal matches a guideline
   */
  private signalMatchesGuideline(signal: Signal, guideline: GuidelineDefinition): boolean {
    // Check signal type against protocol triggers
    // This is a simplified implementation - in reality, you'd have more sophisticated matching
    const protocolTriggers = this.extractProtocolTriggers(guideline.protocol);
    return protocolTriggers.includes(signal.type);
  }

  /**
   * Extract trigger signals from protocol
   */
  private extractProtocolTriggers(_protocol: unknown): string[] {
    // This would parse the protocol to extract what signals trigger it
    // For now, return common signals
    return ['At', 'Bb', 'Ur', 'Co', 'Gt', 'Vd'];
  }

  /**
   * Trigger a guideline execution
   */
  async triggerGuideline(guidelineId: string, triggerSignal: Signal, context?: unknown): Promise<string> {
    const guideline = this.registry.guidelines.get(guidelineId);
    if (!guideline) {
      throw new Error(`Guideline not found: ${guidelineId}`);
    }

    if (!guideline.enabled) {
      throw new Error(`Guideline not enabled: ${guidelineId}`);
    }

    // Check dependencies
    await this.checkDependencies(guideline);

    // Create execution
    const executionId = HashUtils.generateId();
    const execution: GuidelineExecution = {
      id: executionId,
      guidelineId,
      triggerSignal,
      status: 'pending',
      startedAt: TimeUtils.now(),
      context: this.createExecutionContext(guideline, triggerSignal, context as Record<string, unknown>),
      steps: [],
      performance: {
        totalDuration: 0,
        tokenUsage: {
          inspector: 0,
          orchestrator: 0,
          total: 0
        },
        stepBreakdown: {}
      }
    };

    this.executions.set(executionId, execution);

    // Update metrics
    this.updateMetrics(guidelineId, 'execution_started');

    // Emit event
    this.emit('guideline_triggered', {
      guidelineId,
      executionId,
      triggerSignal,
      context: execution.context
    });

    logger.info('shared', 'GuidelinesRegistry',
      `Guideline ${guidelineId} triggered by signal ${triggerSignal.type}`,
      { executionId });

    return executionId;
  }

  /**
   * Check guideline dependencies
   */
  private async checkDependencies(guideline: GuidelineDefinition): Promise<void> {
    for (const depId of guideline.metadata.dependencies) {
      const depGuideline = this.registry.guidelines.get(depId);
      if (!depGuideline) {
        throw new Error(`Dependency not found: ${depId}`);
      }

      if (!depGuideline.enabled) {
        throw new Error(`Dependency not enabled: ${depId}`);
      }
    }

    // Check requirements
    for (const requirement of guideline.requirements) {
      if (requirement.required) {
        const satisfied = await requirement.check();
        if (!satisfied) {
          throw new Error(`Requirement not satisfied: ${requirement.name} - ${requirement.errorMessage}`);
        }
      }
    }
  }

  /**
   * Create execution context
   */
  private createExecutionContext(
    guideline: GuidelineDefinition,
    triggerSignal: Signal,
    additionalContext?: Record<string, unknown>
  ): GuidelineContext {
    return {
      guidelineId: guideline.id,
      executionId: HashUtils.generateId(),
      triggerSignal,
      worktree: additionalContext?.['worktree'] as string | undefined,
      agent: additionalContext?.['agent'] as AgentRole | undefined,
      additionalContext: {
        activePRPs: (additionalContext?.['activePRPs'] as string[]) || [],
        recentActivity: (additionalContext?.['recentActivity'] as ActivityEntry[]) || [],
        tokenStatus: (additionalContext?.['tokenStatus'] as TokenStatusInfo) || {
          totalUsed: 0,
          totalLimit: 1000000,
          approachingLimit: false,
          criticalLimit: false,
          agentBreakdown: {}
        },
        agentStatus: (additionalContext?.['agentStatus'] as AgentStatusInfo[]) || [],
        sharedNotes: (additionalContext?.['sharedNotes'] as SharedNoteInfo[]) || [],
        environment: (additionalContext?.['environment'] as EnvironmentInfo) || {
          worktree: '.',
          branch: 'main',
          availableTools: guideline.tools,
          systemCapabilities: [],
          constraints: {}
        }
      },
      configuration: {
        enabled: true,
        settings: {},
        requiredFeatures: [],
        tokenLimits: guideline.tokenLimits,
        customPrompts: {},
        executionSettings: {
          timeout: 300000, // 5 minutes
          retryAttempts: 3,
          parallelExecution: false,
          requireApproval: false
        }
      }
    };
  }

  /**
   * Get guideline execution
   */
  getExecution(executionId: string): GuidelineExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Update execution status
   */
  updateExecution(executionId: string, updates: Partial<GuidelineExecution>): void {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return;
    }

    Object.assign(execution, updates);
    this.emit('execution_updated', { executionId, execution, updates });
  }

  /**
   * Handle guideline completion
   */
  private handleGuidelineCompleted(data: GuidelineCompletedEventData): void {
    const { executionId, result, performance } = data;
    const execution = this.executions.get(executionId);

    if (execution) {
      execution.status = 'completed';
      execution.completedAt = TimeUtils.now();
      execution.result = result as GuidelineResult;
      execution.performance = performance as {
        totalDuration: number;
        tokenUsage: {
          inspector: number;
          orchestrator: number;
          total: number;
        };
        stepBreakdown: Record<string, number>;
      };

      this.updateMetrics(execution.guidelineId, 'execution_completed', performance as {
        totalDuration?: number;
        tokenUsage?: { total?: number };
      });
      logger.info('shared', 'GuidelinesRegistry',
        `Guideline execution completed: ${execution.guidelineId}`, { executionId });
    }
  }

  /**
   * Handle guideline failure
   */
  private handleGuidelineFailed(data: GuidelineFailedEventData): void {
    const { executionId, error } = data;
    const execution = this.executions.get(executionId);

    if (execution) {
      execution.status = 'failed';
      execution.completedAt = TimeUtils.now();
      execution.error = {
        code: error.code,
        message: error.message,
        details: error.details,
        stack: error.stack,
        stepId: error.stepId,
        recoverable: error.recoverable,
        suggestions: error.suggestions
      };

      this.updateMetrics(execution.guidelineId, 'execution_failed');
      logger.error('shared', 'GuidelinesRegistry',
        `Guideline execution failed: ${execution.guidelineId}`, new Error(error.message), { executionId });
    }
  }

  /**
   * Update guideline metrics
   */
  private updateMetrics(guidelineId: string, event: string, performance?: { totalDuration?: number; tokenUsage?: { total?: number } }): void {
    let metrics = this.metrics.get(guidelineId);
    if (!metrics) {
      metrics = {
        guidelineId,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        averageTokenCost: 0,
        successRate: 0,
        popularSteps: {},
        commonErrors: {}
      };
      this.metrics.set(guidelineId, metrics);
    }

    switch (event) {
      case 'execution_started':
        metrics.totalExecutions++;
        break;

      case 'execution_completed':
        metrics.successfulExecutions++;
        if (performance) {
          // Update averages
          const totalTime = metrics.averageExecutionTime * (metrics.successfulExecutions - 1) + (performance?.totalDuration || 0);
          metrics.averageExecutionTime = totalTime / metrics.successfulExecutions;

          const totalCost = metrics.averageTokenCost * (metrics.successfulExecutions - 1) + (performance?.tokenUsage?.total || 0);
          metrics.averageTokenCost = totalCost / metrics.successfulExecutions;
        }
        break;

      case 'execution_failed':
        metrics.failedExecutions++;
        break;
    }

    // Update success rate
    metrics.successRate = metrics.totalExecutions > 0 ? metrics.successfulExecutions / metrics.totalExecutions : 0;
  }

  /**
   * Get all guidelines
   */
  getAllGuidelines(): GuidelineDefinition[] {
    return Array.from(this.registry.guidelines.values());
  }

  /**
   * Get guideline by ID
   */
  getGuideline(guidelineId: string): GuidelineDefinition | undefined {
    return this.registry.guidelines.get(guidelineId);
  }

  /**
   * Get guidelines by category
   */
  getGuidelinesByCategory(category: string): GuidelineDefinition[] {
    const guidelineIds = this.registry.categories.get(category);
    if (!guidelineIds) {
      return [];
    }

    return Array.from(guidelineIds)
      .map(id => this.registry.guidelines.get(id))
      .filter(Boolean) as GuidelineDefinition[];
  }

  /**
   * Get enabled guidelines
   */
  getEnabledGuidelines(): GuidelineDefinition[] {
    return this.getAllGuidelines().filter(g => g.enabled);
  }

  /**
   * Get guideline metrics
   */
  getMetrics(guidelineId?: string): Map<string, GuidelineMetrics> | GuidelineMetrics | undefined {
    if (guidelineId) {
      return this.metrics.get(guidelineId);
    }
    return this.metrics;
  }

  /**
   * Get executions
   */
  getExecutions(status?: string): GuidelineExecution[] {
    const executions = Array.from(this.executions.values());
    if (status) {
      return executions.filter(e => e.status === status);
    }
    return executions;
  }

  /**
   * Validate guideline definition
   */
  private validateGuideline(guideline: GuidelineDefinition): boolean {
    try {
      return (
        Validator.isValidAgentId(guideline.id) &&
        guideline.name.length > 0 &&
        guideline.description.length > 0 &&
        ['development', 'testing', 'deployment', 'security', 'performance', 'documentation', 'communication'].includes(guideline.category) &&
        ['critical', 'high', 'medium', 'low'].includes(guideline.priority) &&
        guideline.protocol &&
        guideline.protocol.steps &&
        guideline.protocol.steps.length > 0 &&
        guideline.prompts.inspector.length > 0 &&
        guideline.prompts.orchestrator.length > 0 &&
        guideline.tokenLimits.inspector > 0 &&
        guideline.tokenLimits.orchestrator > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * Save registry to disk
   */
  async save(): Promise<void> {
    try {
      const data = {
        guidelines: Array.from(this.registry.guidelines.entries()),
        metrics: Array.from(this.metrics.entries()),
        templates: Array.from(this.templates.entries()),
        signalPatterns: Array.from(this.signalPatterns.entries()),
        lastSaved: TimeUtils.now().toISOString()
      };

      await FileUtils.writeTextFile(this.configPath, JSON.stringify(data, null, 2));
      logger.debug('shared', 'GuidelinesRegistry', 'Guidelines registry saved', { guidelinesCount: this.registry.guidelines.size });
    } catch (error) {
      logger.error('shared', 'GuidelinesRegistry', 'Failed to save guidelines registry', error instanceof Error ? error : new Error(String(error)), { configPath: this.configPath });
    }
  }

  /**
   * Load registry from disk
   */
  async load(): Promise<void> {
    try {
      const exists = await FileUtils.pathExists(this.configPath);
      if (!exists) {
        logger.info('shared', 'GuidelinesRegistry', 'No saved registry found, using defaults', { configPath: this.configPath });
        return;
      }

      const data = await ConfigUtils.loadConfigFile<Record<string, unknown>>(this.configPath);
      if (!data) return;

      // Load guidelines
      if (data['guidelines']) {
        for (const [id, guideline] of Object.entries(data['guidelines'])) {
          this.registry.guidelines.set(id, guideline as GuidelineDefinition);
        }
      }

      // Load metrics
      if (data['metrics']) {
        for (const [id, metrics] of Object.entries(data['metrics'])) {
          this.metrics.set(id, metrics as GuidelineMetrics);
        }
      }

      logger.info('shared', 'GuidelinesRegistry', 'Guidelines registry loaded successfully', { guidelinesCount: this.registry.guidelines.size });
    } catch (error) {
      logger.error('shared', 'GuidelinesRegistry', 'Failed to load guidelines registry', error instanceof Error ? error : new Error(String(error)), { configPath: this.configPath });
    }
  }
}

// Global guidelines registry instance
export const guidelinesRegistry = new GuidelinesRegistry();

/**
 * Initialize guidelines system
 */
export async function initializeGuidelines(): Promise<GuidelinesRegistry> {
  await guidelinesRegistry.load();
  return guidelinesRegistry;
}