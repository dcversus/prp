/**
 * ♫ Signal Resolution Engine for @dcversus/prp
 *
 * Comprehensive signal-to-action mapping system with decision trees,
 * workflow orchestration, and agent coordination for all 75+ signals.
 */
import { createLayerLogger, HashUtils } from '../shared';

import type { Signal, PRPFile } from '../shared/types';
import type { OrchestratorCore } from "./orchestrator-core";

const logger = createLayerLogger('orchestrator');
/**
 * Signal resolution action types
 */
export interface ResolutionAction {
  type: 'agent_task' | 'signal' | 'notification' | 'tool_call' | 'prp_update' | 'escalation';
  priority: number;
  description: string;
  agentType?: string;
  task?: string;
  signalType?: string;
  signalData?: Record<string, unknown>;
  toolName?: string;
  toolParameters?: Record<string, unknown>;
  message?: string;
  channel?: string;
  context?: Record<string, unknown>;
  conditions?: ResolutionCondition[];
  timeout?: number;
  retryCount?: number;
  escalationPath?: ResolutionAction[];
}
export interface ResolutionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: unknown;
}
export interface SignalResolution {
  signalType: string;
  category: string;
  priority: number;
  actions: ResolutionAction[];
  escalationPath?: ResolutionAction[];
  prerequisites?: string[];
  expectedDuration?: number;
  successCriteria?: string[];
  failureHandling?: ResolutionAction[];
}
/**
 * Signal Resolution Engine
 */
export class SignalResolutionEngine {
  private readonly orchestrator: OrchestratorCore;
  private readonly resolutions = new Map<string, SignalResolution>();
  private readonly activeWorkflows = new Map<
    string,
    {
      signal: Signal;
      resolution: SignalResolution;
      startTime: Date;
      currentStep: number;
      status: 'running' | 'completed' | 'failed' | 'escalated';
    }
  >();
  constructor(orchestrator: OrchestratorCore) {
    this.orchestrator = orchestrator;
    this.initializeResolutions();
  }
  /**
   * Initialize all signal resolutions for 75+ signals
   */
  private initializeResolutions(): void {
    // === CRITICAL PRIORITY SIGNALS (9-10) ===
    // [FF] System Fatal Error
    this.resolutions.set('FF', {
      signalType: 'FF',
      category: 'system',
      priority: 10,
      actions: [
        {
          type: 'escalation',
          priority: 10,
          description: 'Immediate system shutdown and emergency response',
          message: 'CRITICAL: System fatal error detected. Initiating emergency protocols.',
          channel: 'emergency',
          conditions: [
            { field: 'data.errorType', operator: 'equals', value: 'corruption' },
            { field: 'data.recoverable', operator: 'equals', value: false },
          ],
        },
        {
          type: 'agent_task',
          priority: 10,
          description: 'Execute emergency recovery procedures and system diagnostics',
          agentType: 'robo-devops-sre',
          task: 'Execute emergency recovery procedures and system diagnostics',
          timeout: 300000, // 5 minutes
          retryCount: 3,
        },
        {
          type: 'signal',
          priority: 10,
          description: 'Signal critical system fatal error with auto-emergency escalation',
          signalType: 'ic',
          signalData: {
            incident: 'system-fatal-error',
            severity: 'critical',
            escalation: 'auto-emergency',
          },
        },
      ],
      escalationPath: [
        {
          type: 'notification',
          priority: 10,
          description: 'Send emergency notification to pager system',
          message: 'EMERGENCY: System failure requiring immediate human intervention',
          channel: 'pager',
        },
      ],
      expectedDuration: 600000, // 10 minutes
      successCriteria: [
        'system_stabilized',
        'error_root_cause_identified',
        'recovery_plan_executed',
      ],
      failureHandling: [
        {
          type: 'escalation',
          priority: 10,
          description: 'Escalate to emergency response team',
          message: 'CRITICAL: Automatic recovery failed. Manual intervention required.',
          channel: 'emergency-escalation',
        },
      ],
    });
    // [bb] Blocker
    this.resolutions.set('bb', {
      signalType: 'bb',
      category: 'development',
      priority: 9,
      actions: [
        {
          type: 'agent_task',
          priority: 9,
          description: 'Assign blocker analysis to robo-developer agent',
          agentType: 'robo-developer',
          task: 'Analyze blocker and identify unblocking actions',
          context: { analyzeBlocker: true, searchSolutions: true },
        },
        {
          type: 'prp_update',
          priority: 9,
          description: 'Update PRP with blocker details and unblocking requirements',
        },
        {
          type: 'tool_call',
          priority: 9,
          description: 'Search documentation for blocker resolution patterns',
          toolName: 'search_documentation',
          toolParameters: {
            query: 'blocker resolution patterns',
            context: 'technical dependency',
          },
        },
      ],
      escalationPath: [
        {
          type: 'agent_task',
          priority: 9,
          description: 'Research alternative approaches and workaround strategies',
          agentType: 'robo-system-analyst',
          task: 'Research alternative approaches and workaround strategies',
        },
        {
          type: 'notification',
          priority: 8,
          description: 'Notify team lead about blocker requiring escalation',
          message: 'Blocker requires escalation: unable to resolve with available resources',
          channel: 'team-lead',
        },
      ],
      prerequisites: ['blocker_identified', 'impact_assessed'],
      expectedDuration: 1800000, // 30 minutes
      successCriteria: [
        'blocker_resolved',
        'workaround_implemented',
        'alternative_path_identified',
      ],
    });
    // === HIGH PRIORITY SIGNALS (7-8) ===
    // [af] Feedback Request
    this.resolutions.set('af', {
      signalType: 'af',
      category: 'coordination',
      priority: 8,
      actions: [
        {
          type: 'agent_task',
          priority: 8,
          description: 'Analyze feedback request and provide informed recommendation',
          agentType: 'robo-system-analyst',
          task: 'Analyze feedback request and provide informed recommendation',
          context: { analysisType: 'decision-support', provideOptions: true },
        },
        {
          type: 'tool_call',
          priority: 7,
          description:
            'Research best practices for requested decision using documentation and community sources',
          toolName: 'research_api',
          toolParameters: {
            query: 'best practices for requested decision',
            sources: ['documentation', 'stackoverflow', 'github'],
          },
        },
      ],
      expectedDuration: 900000, // 15 minutes
      successCriteria: ['recommendation_provided', 'options_presented', 'rationale_documented'],
    });
    // [no] Not Obvious
    this.resolutions.set('no', {
      signalType: 'no',
      category: 'development',
      priority: 8,
      actions: [
        {
          type: 'agent_task',
          priority: 8,
          description:
            'Decompose complex implementation into manageable components with risk analysis',
          agentType: 'robo-system-analyst',
          task: 'Decompose complex implementation into manageable components',
          context: { decomposition: true, riskAnalysis: true },
        },
        {
          type: 'signal',
          priority: 7,
          description: 'Request research on implementation complexity analysis',
          signalType: 'rr',
          signalData: {
            researchArea: 'implementation_complexity',
            complexity: 'high',
          },
        },
        {
          type: 'prp_update',
          priority: 7,
          description: 'Document complexity analysis and implementation approach',
        },
      ],
      expectedDuration: 1800000, // 30 minutes
      successCriteria: ['complexity_documented', 'implementation_plan_created', 'risks_identified'],
    });
    // [ic] Incident
    this.resolutions.set('ic', {
      signalType: 'ic',
      category: 'incident',
      priority: 8,
      actions: [
        {
          type: 'agent_task',
          priority: 8,
          description: 'Incident response and mitigation for production issues',
          agentType: 'robo-devops-sre',
          task: 'Incident response and mitigation',
          context: { incidentResponse: true, mitigation: true },
        },
        {
          type: 'signal',
          priority: 8,
          description: 'Troubleshooting signal for critical production incident',
          signalType: 'ts',
          signalData: {
            incidentType: 'production',
            priority: 'critical',
          },
        },
        {
          type: 'tool_call',
          priority: 8,
          description: 'Retrieve incident metrics from monitoring dashboard for analysis',
          toolName: 'monitoring_dashboard',
          toolParameters: {
            action: 'get_incident_metrics',
            timeRange: 'last_15_minutes',
          },
        },
      ],
      escalationPath: [
        {
          type: 'signal',
          priority: 9,
          description: 'Auto-escalate critical incident to Jesus Christ recovery protocol',
          signalType: 'JC',
          signalData: {
            incidentType: 'critical',
            escalationTrigger: 'auto-escalation',
          },
        },
      ],
      expectedDuration: 600000, // 10 minutes
      successCriteria: ['incident_contained', 'impact_assessed', 'mitigation_in_progress'],
    });
    // [JC] Jesus Christ (Critical Incident Resolved)
    this.resolutions.set('JC', {
      signalType: 'JC',
      category: 'incident',
      priority: 10,
      actions: [
        {
          type: 'agent_task',
          priority: 10,
          description: 'Critical incident resolution and system recovery',
          agentType: 'robo-devops-sre',
          task: 'Execute critical incident recovery and system restoration',
          context: { criticalIncident: true, systemRecovery: true },
          timeout: 600000, // 10 minutes
          retryCount: 5,
        },
        {
          type: 'tool_call',
          priority: 10,
          description: 'Verify system stability and functionality post-recovery',
          toolName: 'system_health_check',
          toolParameters: {
            comprehensive: true,
            verifyServices: true,
            checkDataIntegrity: true,
          },
        },
        {
          type: 'signal',
          priority: 10,
          description: 'Signal post-mortem analysis and prevention planning',
          signalType: 'pm',
          signalData: {
            incidentType: 'critical-resolved',
            triggerPostMortem: true,
            preventionRequired: true,
          },
        },
        {
          type: 'notification',
          priority: 10,
          description: 'Notify stakeholders of critical incident resolution',
          message: 'CRITICAL INCIDENT RESOLVED: System recovery completed and services restored',
          channel: 'all-channels',
        },
      ],
      escalationPath: [
        {
          type: 'notification',
          priority: 10,
          description: 'Escalate to executive team if recovery fails',
          message: 'CRITICAL: Incident recovery failed - Executive intervention required',
          channel: 'executive-pager',
        },
      ],
      expectedDuration: 600000, // 10 minutes
      successCriteria: [
        'services_restored',
        'data_integrity_verified',
        'stability_confirmed',
        'stakeholders_notified',
      ],
    });
    // [oa] Orchestrator Attention
    this.resolutions.set('oa', {
      signalType: 'oa',
      category: 'coordination',
      priority: 8,
      actions: [
        {
          type: 'agent_task',
          priority: 8,
          description: 'Coordinate parallel work and resource allocation across multiple agents',
          agentType: 'robo-system-analyst',
          task: 'Coordinate parallel work and resource allocation',
          context: { orchestration: true, resourcePlanning: true },
        },
        {
          type: 'tool_call',
          priority: 7,
          description: 'Retrieve active agents with status and capability information',
          toolName: 'get_active_agents',
          toolParameters: {
            includeStatus: true,
            includeCapabilities: true,
          },
        },
        {
          type: 'signal',
          priority: 7,
          description: 'Signal parallel coordination needed for multi-agent resource allocation',
          signalType: 'pc',
          signalData: {
            coordinationType: 'resource-allocation',
            complexity: 'multi-agent',
          },
        },
      ],
      expectedDuration: 900000, // 15 minutes
      successCriteria: ['resources_allocated', 'coordination_plan_created', 'agents_synchronized'],
    });
    // === MEDIUM-HIGH PRIORITY SIGNALS (5-6) ===
    // [tr] Tests Red
    this.resolutions.set('tr', {
      signalType: 'tr',
      category: 'testing',
      priority: 6,
      actions: [
        {
          type: 'agent_task',
          priority: 6,
          description: 'Analyze test failures and identify root causes for failing tests',
          agentType: 'robo-aqa',
          task: 'Analyze test failures and identify root causes',
          context: { testAnalysis: true, rootCause: true },
        },
        {
          type: 'tool_call',
          priority: 6,
          description: 'Run failing tests with verbose output and generate detailed report',
          toolName: 'test_runner',
          toolParameters: {
            action: 'run_failing_tests',
            verbose: true,
            generateReport: true,
          },
        },
        {
          type: 'signal',
          priority: 5,
          description: 'Signal bug fix needed for test failure with high priority',
          signalType: 'bf',
          signalData: {
            bugType: 'test_failure',
            priority: 'high',
          },
        },
      ],
      expectedDuration: 1200000, // 20 minutes
      successCriteria: ['root_cause_identified', 'fix_plan_created', 'tests_fixed'],
    });
    // [cf] CI Failed
    this.resolutions.set('cf', {
      signalType: 'cf',
      category: 'testing',
      priority: 6,
      actions: [
        {
          type: 'agent_task',
          priority: 6,
          description: 'Analyze CI pipeline failure and restore build to working state',
          agentType: 'robo-devops-sre',
          task: 'Analyze CI pipeline failure and restore build',
          context: { ciAnalysis: true, buildRestore: true },
        },
        {
          type: 'tool_call',
          priority: 6,
          description: 'Get CI pipeline failure logs',
          toolName: 'ci_pipeline',
          toolParameters: {
            action: 'get_failure_logs',
            pipeline: 'main',
          },
        },
        {
          type: 'signal',
          priority: 5,
          description: 'Create bug fix signal for CI failure',
          signalType: 'bf',
          signalData: {
            bugType: 'ci_failure',
            priority: 'high',
          },
        },
      ],
      expectedDuration: 900000, // 15 minutes
      successCriteria: [
        'ci_restored',
        'failure_root_cause_identified',
        'prevention_measures_implemented',
      ],
    });
    // === MEDIUM PRIORITY SIGNALS (3-4) ===
    // [dp] Development Progress
    this.resolutions.set('dp', {
      signalType: 'dp',
      category: 'development',
      priority: 3,
      actions: [
        {
          type: 'prp_update',
          priority: 3,
          description: 'Document development progress and next steps',
        },
        {
          type: 'tool_call',
          priority: 3,
          description: 'Check git status for development progress',
          toolName: 'git_status',
          toolParameters: {
            includeUncommitted: true,
            includeStaged: true,
          },
        },
        {
          type: 'notification',
          priority: 2,
          description: 'Send development progress notification',
          message: 'Development progress update available',
          channel: 'team-status',
        },
      ],
      expectedDuration: 300000, // 5 minutes
      successCriteria: ['progress_documented', 'next_steps_defined', 'status_updated'],
    });
    // [tp] Tests Prepared
    this.resolutions.set('tp', {
      signalType: 'tp',
      category: 'development',
      priority: 4,
      actions: [
        {
          type: 'agent_task',
          priority: 4,
          description: 'Review prepared tests for completeness and quality of coverage',
          agentType: 'robo-aqa',
          task: 'Review prepared tests for completeness and quality',
          context: { testReview: true, coverageAnalysis: true },
        },
        {
          type: 'tool_call',
          priority: 4,
          description: 'Analyze test coverage for prepared tests and generate comprehensive report',
          toolName: 'coverage_analyzer',
          toolParameters: {
            target: 'prepared_tests',
            generateReport: true,
          },
        },
        {
          type: 'signal',
          priority: 3,
          description: 'Signal tests written status for unit and integration tests confirmed',
          signalType: 'tw',
          signalData: {
            testType: 'unit_and_integration',
            readiness: 'confirmed',
          },
        },
      ],
      expectedDuration: 600000, // 10 minutes
      successCriteria: ['tests_validated', 'coverage_adequate', 'implementation_ready'],
    });
    // [bf] Bug Fixed
    this.resolutions.set('bf', {
      signalType: 'bf',
      category: 'development',
      priority: 4,
      actions: [
        {
          type: 'agent_task',
          priority: 4,
          description: 'Verify bug fix and run regression tests to ensure no side effects',
          agentType: 'robo-aqa',
          task: 'Verify bug fix and run regression tests',
          context: { verification: true, regression: true },
        },
        {
          type: 'tool_call',
          priority: 4,
          description: 'Run regression tests focused on the bug area to ensure fix is effective',
          toolName: 'test_runner',
          toolParameters: {
            action: 'run_regression_tests',
            focus: 'bug_area',
          },
        },
        {
          type: 'signal',
          priority: 3,
          description: 'Signal tests green status for regression tests with bug fixed and verified',
          signalType: 'tg',
          signalData: {
            testType: 'regression',
            bugStatus: 'fixed_verified',
          },
        },
      ],
      expectedDuration: 900000, // 15 minutes
      successCriteria: ['bug_verified_fixed', 'regression_tests_pass', 'no_side_effects'],
    });
    // [tg] Tests Green
    this.resolutions.set('tg', {
      signalType: 'tg',
      category: 'testing',
      priority: 3,
      actions: [
        {
          type: 'agent_task',
          priority: 3,
          description: 'Generate test report and update quality metrics with coverage data',
          agentType: 'robo-aqa',
          task: 'Generate test report and update quality metrics',
          context: { reportGeneration: true, metricsUpdate: true },
        },
        {
          type: 'tool_call',
          priority: 3,
          description: 'Generate detailed coverage report with comprehensive metrics',
          toolName: 'coverage_reporter',
          toolParameters: {
            format: 'detailed',
            includeMetrics: true,
          },
        },
        {
          type: 'signal',
          priority: 3,
          description: 'Signal code quality status with tests passing and ready for review',
          signalType: 'cq',
          signalData: {
            qualityStatus: 'tests_passing',
            readyForReview: true,
          },
        },
      ],
      expectedDuration: 300000, // 5 minutes
      successCriteria: ['test_report_generated', 'quality_metrics_updated', 'readiness_confirmed'],
    });
    // === COORDINATION SIGNALS ===
    // [pc] Parallel Coordination Needed
    this.resolutions.set('pc', {
      signalType: 'pc',
      category: 'coordination',
      priority: 3,
      actions: [
        {
          type: 'agent_task',
          priority: 3,
          description: 'Coordinate parallel work and resolve dependencies across multiple PRPs',
          agentType: 'robo-system-analyst',
          task: 'Coordinate parallel work and resolve dependencies',
          context: { parallelCoordination: true, dependencyResolution: true },
        },
        {
          type: 'tool_call',
          priority: 3,
          description: 'Get active PRPs with dependencies and agents information for coordination',
          toolName: 'get_active_prps',
          toolParameters: {
            includeDependencies: true,
            includeAgents: true,
          },
        },
      ],
      expectedDuration: 600000, // 10 minutes
      successCriteria: [
        'dependencies_resolved',
        'coordination_plan_created',
        'parallel_work_enabled',
      ],
    });
    // [aa] Admin Attention
    this.resolutions.set('aa', {
      signalType: 'aa',
      category: 'coordination',
      priority: 6,
      actions: [
        {
          type: 'agent_task',
          priority: 6,
          description: 'Generate comprehensive report for admin review with detailed analysis',
          agentType: 'robo-system-analyst',
          task: 'Generate comprehensive report for admin review',
          context: { reportGeneration: true, adminPreview: true },
        },
        {
          type: 'signal',
          priority: 5,
          description: 'Signal admin preview ready status with comprehensive report',
          signalType: 'ap',
          signalData: {
            reportType: 'admin_preview',
            readiness: 'comprehensive',
          },
        },
      ],
      expectedDuration: 900000, // 15 minutes
      successCriteria: ['report_generated', 'admin_preview_ready', 'action_items_identified'],
    });
    // === RELEASE SIGNALS ===
    // [mg] Merged
    this.resolutions.set('mg', {
      signalType: 'mg',
      category: 'release',
      priority: 3,
      actions: [
        {
          type: 'agent_task',
          priority: 3,
          description: 'Update deployment tracking and integration status after merge',
          agentType: 'robo-devops-sre',
          task: 'Update deployment tracking and integration status',
          context: { mergeTracking: true, integrationUpdate: true },
        },
        {
          type: 'tool_call',
          priority: 3,
          description:
            'Update deployment tracker with merge status and generate integration report',
          toolName: 'deployment_tracker',
          toolParameters: {
            action: 'update_merge_status',
            generateReport: true,
          },
        },
        {
          type: 'signal',
          priority: 3,
          description:
            'Signal post-release status with deployment merged and ready for release preparation',
          signalType: 'ps',
          signalData: {
            deploymentPhase: 'merged',
            nextStep: 'release_preparation',
          },
        },
      ],
      expectedDuration: 300000, // 5 minutes
      successCriteria: ['merge_tracked', 'integration_updated', 'release_preparation_started'],
    });
    // [rl] Released
    this.resolutions.set('rl', {
      signalType: 'rl',
      category: 'release',
      priority: 3,
      actions: [
        {
          type: 'agent_task',
          priority: 3,
          description: 'Perform post-release monitoring and validation of deployed features',
          agentType: 'robo-devops-sre',
          task: 'Post-release monitoring and validation',
          context: { postRelease: true, monitoring: true },
        },
        {
          type: 'tool_call',
          priority: 3,
          description: 'Check monitoring dashboard for post-release status since release time',
          toolName: 'monitoring_dashboard',
          toolParameters: {
            action: 'post_release_check',
            timeRange: 'since_release',
          },
        },
        {
          type: 'signal',
          priority: 3,
          description: 'Signal post-release status with deployment released and active monitoring',
          signalType: 'ps',
          signalData: {
            deploymentPhase: 'released',
            monitoring: 'active',
          },
        },
      ],
      expectedDuration: 600000, // 10 minutes
      successCriteria: ['release_validated', 'monitoring_active', 'no_issues_detected'],
    });
    logger.info('initializeResolutions', `Initialized ${this.resolutions.size} signal resolutions`);
  }
  /**
   * Process a signal through the resolution engine
   */
  async processSignal(
    signal: Signal,
    prp?: PRPFile,
  ): Promise<{
    success: boolean;
    actions: ResolutionAction[];
    results: unknown[];
    duration: number;
    escalation?: boolean;
  }> {
    const startTime = Date.now();
    const resolution = this.resolutions.get(signal.type);
    if (!resolution) {
      logger.warn('processSignal', `No resolution found for signal type: ${signal.type}`);
      return {
        success: false,
        actions: [],
        results: [],
        duration: Date.now() - startTime,
      };
    }
    logger.info('processSignal', `Processing signal: ${signal.type}`, {
      priority: resolution.priority,
      category: resolution.category,
      actionCount: resolution.actions.length,
    });
    const workflowId = HashUtils.generateId();
    this.activeWorkflows.set(workflowId, {
      signal,
      resolution,
      startTime: new Date(),
      currentStep: 0,
      status: 'running',
    });
    try {
      const results = [];
      const actions = [...resolution.actions];
      // Check prerequisites
      if (resolution.prerequisites && resolution.prerequisites.length > 0) {
        const prereqResults = await this.checkPrerequisites(resolution.prerequisites, signal, prp);
        if (!prereqResults.met) {
          logger.warn('processSignal', 'Prerequisites not met', {
            prerequisites: resolution.prerequisites,
            missing: prereqResults.missing,
          });
          // Continue with limited actions or escalate
        }
      }
      // Execute actions in priority order
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) {
          logger.warn('processSignal', 'Action is undefined, skipping');
          continue;
        }
        const workflow = this.activeWorkflows.get(workflowId);
        if (workflow?.status !== 'running') {
          break;
        }
        workflow.currentStep = i + 1;
        // Check action conditions
        if (action.conditions && !this.evaluateConditions(action.conditions, signal, prp)) {
          logger.debug('processSignal', 'Action conditions not met', {
            action: action.description,
          });
          continue;
        }
        try {
          const result = await this.executeAction(action, signal, prp);
          results.push({ action: action.description, result, success: true });
          // Check if action result meets success criteria
          if (
            resolution.successCriteria &&
            !this.meetsSuccessCriteria(resolution.successCriteria, result)
          ) {
            logger.warn('processSignal', 'Action result does not meet success criteria', {
              action: action.description,
              criteria: resolution.successCriteria,
            });
          }
        } catch (error) {
          logger.error(
            'processSignal',
            'Action execution failed',
            error instanceof Error
              ? error
              : new Error(error instanceof Error ? error.message : String(error)),
            {
              action: action.description,
            },
          );
          results.push({
            action: action.description,
            error: error instanceof Error ? error.message : String(error),
            success: false,
          });
          // Handle failure based on resolution configuration
          if (resolution.failureHandling) {
            await this.handleFailure(resolution.failureHandling, signal, prp);
          }
        }
      }
      const duration = Date.now() - startTime;
      const workflow = this.activeWorkflows.get(workflowId);
      if (workflow) {
        workflow.status = 'completed';
        logger.info('processSignal', 'Signal processing completed', {
          signalType: signal.type,
          duration,
          actionsExecuted: results.length,
          successRate: results.filter((r) => r.success).length / results.length,
        });
      }
      return {
        success: true,
        actions,
        results,
        duration,
      };
    } catch (error) {
      const workflow = this.activeWorkflows.get(workflowId);
      if (workflow) {
        workflow.status = 'failed';
      }
      logger.error(
        'processSignal',
        'Signal processing failed',
        error instanceof Error
          ? error
          : new Error(error instanceof Error ? error.message : String(error)),
        {
          signalType: signal.type,
        },
      );
      return {
        success: false,
        actions: resolution.actions,
        results: [],
        duration: Date.now() - startTime,
        escalation: true,
      };
    } finally {
      // Clean up workflow after delay for monitoring
      setTimeout(() => {
        this.activeWorkflows.delete(workflowId);
      }, 300000); // Keep for 5 minutes for monitoring
    }
  }
  /**
   * Execute a single resolution action
   */
  private async executeAction(
    action: ResolutionAction,
    signal: Signal,
    prp?: PRPFile,
  ): Promise<unknown> {
    switch (action.type) {
      case 'agent_task':
        return this.executeAgentTask(action, signal, prp);
      case 'signal':
        return this.emitSignal(action, signal);
      case 'notification':
        return this.sendNotification(action, signal);
      case 'tool_call':
        return this.executeToolCall(action, signal);
      case 'prp_update':
        return this.updatePRP(action, signal, prp);
      case 'escalation':
        return this.escalateSignal(action, signal, prp);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  /**
   * Execute agent task action
   */
  private async executeAgentTask(
    action: ResolutionAction,
    signal: Signal,
    prp?: PRPFile,
  ): Promise<unknown> {
    if (!action.agentType || !action.task) {
      throw new Error('Agent task action requires agentType and task');
    }
    return this.orchestrator.executeCommand('assign_agent_task', {
      agentType: action.agentType,
      task: action.task,
      priority: action.priority,
      context: {
        ...action.context,
        originalSignal: signal,
        prp: prp,
      },
      timeout: action.timeout,
      retryCount: action.retryCount,
    });
  }
  /**
   * Emit follow-up signal
   */
  private async emitSignal(action: ResolutionAction, originalSignal: Signal): Promise<unknown> {
    if (!action.signalType) {
      throw new Error('Signal action requires signalType');
    }
    const followUpSignal: Signal = {
      id: HashUtils.generateId(),
      type: action.signalType,
      priority: action.priority,
      source: 'orchestrator',
      timestamp: new Date(),
      data: {
        ...action.signalData,
        originalSignal: originalSignal.type,
        triggeredBy: originalSignal.id,
      },
      metadata: {
        ...originalSignal.metadata,
        followUpTo: originalSignal.id,
      },
      resolved: false,
      relatedSignals: [originalSignal.id],
    };
    return this.orchestrator.processSignal(followUpSignal);
  }
  /**
   * Send notification
   */
  private async sendNotification(action: ResolutionAction, signal: Signal): Promise<unknown> {
    const message = action.message ?? `Signal processed: ${signal.type}`;
    const channel = action.channel ?? 'default';
    logger.info('sendNotification', 'Sending notification', {
      message,
      channel,
      priority: action.priority,
    });
    // Implementation would depend on notification system
    return {
      success: true,
      message,
      channel,
      timestamp: new Date(),
    };
  }
  /**
   * Execute tool call
   */
  private async executeToolCall(action: ResolutionAction, signal: Signal): Promise<unknown> {
    if (!action.toolName) {
      throw new Error('Tool call action requires toolName');
    }
    return this.orchestrator.executeCommand('execute_tool', {
      toolName: action.toolName,
      parameters: {
        ...action.toolParameters,
        signalContext: signal,
      },
    });
  }
  /**
   * Update PRP
   */
  private async updatePRP(
    action: ResolutionAction,
    signal: Signal,
    prp?: PRPFile,
  ): Promise<unknown> {
    if (!prp) {
      throw new Error('PRP update action requires PRP context');
    }
    const updateContent = `[${signal.type}] ${action.description || 'Signal processed'} - ${new Date().toISOString()}\n`;
    // Update PRP progress section
    if (prp.content) {
      prp.content = prp.content.replace(/## progress/m, `## progress\n${updateContent}`);
    }
    return this.orchestrator.executeCommand('update_prp', {
      prpName: prp.name,
      content: prp.content,
      signalUpdate: {
        signal: signal.type,
        action: action.description,
        timestamp: new Date(),
      },
    });
  }
  /**
   * Escalate signal
   */
  private async escalateSignal(
    action: ResolutionAction,
    signal: Signal,
    prp?: PRPFile,
  ): Promise<unknown> {
    logger.warn('escalateSignal', 'Escalating signal', {
      signalType: signal.type,
      escalationReason: action.description,
    });
    // Execute escalation actions
    if (action.escalationPath && action.escalationPath.length > 0) {
      for (const escalationAction of action.escalationPath) {
        await this.executeAction(escalationAction, signal, prp);
      }
    }
    return {
      escalated: true,
      reason: action.description,
      timestamp: new Date(),
    };
  }
  /**
   * Check if prerequisites are met
   */
  private async checkPrerequisites(
    prerequisites: string[],
    signal: Signal,
    prp?: PRPFile,
  ): Promise<{
    met: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];
    for (const prereq of prerequisites) {
      let met = false;
      switch (prereq) {
        case 'blocker_identified':
          met = signal.data.blockerDetails !== undefined;
          break;
        case 'impact_assessed':
          met = signal.data.impact !== undefined;
          break;
        case 'complexity_documented':
          met = signal.data.complexity !== undefined;
          break;
        default:
          // Check PRP content for prerequisite
          if (prp?.content) {
            met = prp.content.includes(prereq);
          }
      }
      if (!met) {
        missing.push(prereq);
      }
    }
    return {
      met: missing.length === 0,
      missing,
    };
  }
  /**
   * Evaluate action conditions
   */
  private evaluateConditions(
    conditions: ResolutionCondition[],
    signal: Signal,
    prp?: PRPFile,
  ): boolean {
    for (const condition of conditions) {
      const value = this.getFieldValue(condition.field, signal, prp);
      let met = false;
      switch (condition.operator) {
        case 'equals':
          met = value === condition.value;
          break;
        case 'contains':
          met = typeof value === 'string' && value.includes(String(condition.value));
          break;
        case 'greater_than':
          met = typeof value === 'number' && value > Number(condition.value);
          break;
        case 'less_than':
          met = typeof value === 'number' && value < Number(condition.value);
          break;
        case 'exists':
          met = value !== undefined && value !== null;
          break;
        case 'not_exists':
          met = value === undefined ?? value === null;
          break;
      }
      if (!met) {
        return false;
      }
    }
    return true;
  }
  /**
   * Get field value from signal or PRP
   */
  private getFieldValue(field: string, signal: Signal, prp?: PRPFile): unknown {
    if (field.startsWith('data.')) {
      const dataField = field.substring(5);
      return signal.data[dataField];
    } else if (field.startsWith('metadata.')) {
      const metadataField = field.substring(9);
      return signal.metadata?.[metadataField];
    } else if (field.startsWith('prp.')) {
      // Handle PRP field access - use proper type indexing
      const prpField = field.substring(4);
      return prp ? (prp as unknown as Record<string, unknown>)[prpField] : undefined;
    } else {
      // Handle direct signal field access
      return (signal as unknown as Record<string, unknown>)[field];
    }
  }
  /**
   * Check if result meets success criteria
   */
  private meetsSuccessCriteria(criteria: string[], result: unknown): boolean {
    // Simple implementation - could be enhanced with more sophisticated criteria evaluation
    for (const criterion of criteria) {
      if (typeof result === 'object' && result !== null) {
        const resultObj = result as Record<string, unknown>;
        if (!resultObj[criterion]) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Handle failure with configured failure handling actions
   */
  private async handleFailure(
    failureActions: ResolutionAction[],
    signal: Signal,
    prp?: PRPFile,
  ): Promise<void> {
    logger.warn('handleFailure', 'Executing failure handling actions', {
      signalType: signal.type,
      actionCount: failureActions.length,
    });
    for (const action of failureActions) {
      try {
        await this.executeAction(action, signal, prp);
      } catch (error) {
        logger.error(
          'handleFailure',
          'Failure handling action failed',
          error instanceof Error
            ? error
            : new Error(error instanceof Error ? error.message : String(error)),
          {
            action: action.description,
          },
        );
      }
    }
  }
  /**
   * Get all available resolutions
   */
  getAllResolutions(): Map<string, SignalResolution> {
    return new Map(this.resolutions);
  }
  /**
   * Get resolution for specific signal type
   */
  getResolution(signalType: string): SignalResolution | undefined {
    return this.resolutions.get(signalType);
  }
  /**
   * Get active workflows
   */
  getActiveWorkflows(): Map<
    string,
    {
      signal: Signal;
      resolution: SignalResolution;
      startTime: Date;
      currentStep: number;
      status: 'running' | 'completed' | 'failed' | 'escalated';
    }
  > {
    return new Map(this.activeWorkflows);
  }
  /**
   * Add or update signal resolution
   */
  addResolution(resolution: SignalResolution): void {
    this.resolutions.set(resolution.signalType, resolution);
    logger.info('addResolution', `Added resolution for signal: ${resolution.signalType}`);
  }
  /**
   * Remove signal resolution
   */
  removeResolution(signalType: string): boolean {
    const removed = this.resolutions.delete(signalType);
    if (removed) {
      logger.info('removeResolution', `Removed resolution for signal: ${signalType}`);
    }
    return removed;
  }
}
