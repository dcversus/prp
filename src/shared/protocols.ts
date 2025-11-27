/**
 * ♫ Standard Guideline Protocols for @dcversus/prp
 *
 * Commonly used guideline protocol definitions to avoid string assignment errors.
 */
import type { GuidelineProtocol } from './types';
/**
 * Signal Resolution Protocol - Standard protocol for resolving signals through analysis and action
 */
export const SIGNAL_RESOLUTION_PROTOCOL: GuidelineProtocol = {
  id: 'signal_resolution',
  description:
    'Standard protocol for resolving signals through inspector analysis and orchestrator decision-making',
  steps: [
    {
      id: 'signal_analysis',
      name: 'Signal Analysis',
      description: 'Analyze the incoming signal to understand context and requirements',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['decision_making'],
    },
    {
      id: 'decision_making',
      name: 'Decision Making',
      description: 'Make decisions based on signal analysis and available context',
      type: 'orchestrator_decision',
      required: true,
      nextSteps: ['action_execution'],
    },
    {
      id: 'action_execution',
      name: 'Action Execution',
      description: 'Execute the decided actions and coordinate with agents',
      type: 'action_execution',
      required: false,
      nextSteps: ['verification'],
    },
    {
      id: 'verification',
      name: 'Verification',
      description: 'Verify that actions were completed successfully',
      type: 'verification',
      required: false,
      nextSteps: [],
    },
  ],
  decisionPoints: [
    {
      id: 'escalation_needed',
      question: 'Does this signal require escalation to admin?',
      options: [
        {
          id: 'escalate',
          label: 'Yes, escalate to admin',
          action: 'Escalate signal to admin with full context',
          nextSteps: ['admin_notification'],
        },
        {
          id: 'handle',
          label: 'No, handle within system',
          action: 'Process signal through normal workflow',
          nextSteps: ['action_execution'],
        },
      ],
      requiresInput: false,
    },
  ],
  successCriteria: [
    'Signal is fully processed and documented',
    'Required actions are completed or delegated',
    'Context is updated with signal resolution',
    'Stakeholders are notified if necessary',
  ],
  fallbackActions: [
    'Log signal for manual review if automated processing fails',
    'Escalate to admin if resolution cannot be determined',
    'Create note for follow-up if additional information is needed',
  ],
};
/**
 * Resource Report Protocol - Protocol for handling research and analysis reports
 */
export const RESOURCE_REPORT_PROTOCOL: GuidelineProtocol = {
  id: 'resource_report',
  description: 'Protocol for comprehensive research analysis and resource reporting',
  steps: [
    {
      id: 'research_collection',
      name: 'Research Collection',
      description: 'Gather and organize research data and findings',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['analysis_synthesis'],
    },
    {
      id: 'analysis_synthesis',
      name: 'Analysis Synthesis',
      description: 'Synthesize research findings into actionable insights',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['recommendation_generation'],
    },
    {
      id: 'recommendation_generation',
      name: 'Recommendation Generation',
      description: 'Generate specific recommendations based on research',
      type: 'orchestrator_decision',
      required: true,
      nextSteps: ['report_finalization'],
    },
    {
      id: 'report_finalization',
      name: 'Report Finalization',
      description: 'Finalize and distribute research report',
      type: 'action_execution',
      required: false,
      nextSteps: [],
    },
  ],
  decisionPoints: [
    {
      id: 'research_completeness',
      question: 'Is the research sufficiently complete for decision-making?',
      options: [
        {
          id: 'complete',
          label: 'Research is complete',
          action: 'Proceed with recommendations',
          nextSteps: ['recommendation_generation'],
        },
        {
          id: 'incomplete',
          label: 'Additional research needed',
          action: 'Identify research gaps and plan additional work',
          nextSteps: ['research_collection'],
        },
      ],
      requiresInput: false,
    },
  ],
  successCriteria: [
    'All research questions are answered',
    'Findings are clearly documented and organized',
    'Recommendations are actionable and evidence-based',
    'Report is distributed to relevant stakeholders',
  ],
  fallbackActions: [
    'Document research limitations and assumptions',
    'Schedule follow-up research if time-constrained',
    'Escalate critical research gaps to project lead',
  ],
};
/**
 * Operational Status Protocol - Protocol for system status monitoring and reporting
 */
export const OPERATIONAL_STATUS_PROTOCOL: GuidelineProtocol = {
  id: 'operational_status',
  description: 'Protocol for monitoring and reporting system operational status',
  steps: [
    {
      id: 'status_collection',
      name: 'Status Collection',
      description: 'Collect current status from all system components',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['health_assessment'],
    },
    {
      id: 'health_assessment',
      name: 'Health Assessment',
      description: 'Assess overall system health and identify issues',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['status_reporting'],
    },
    {
      id: 'status_reporting',
      name: 'Status Reporting',
      description: 'Generate and distribute status report',
      type: 'action_execution',
      required: false,
      nextSteps: [],
    },
  ],
  decisionPoints: [
    {
      id: 'issue_response',
      question: 'Are there critical issues requiring immediate attention?',
      options: [
        {
          id: 'critical',
          label: 'Critical issues detected',
          action: 'Initiate immediate response procedures',
          nextSteps: ['incident_response'],
        },
        {
          id: 'normal',
          label: 'No critical issues',
          action: 'Continue normal monitoring',
          nextSteps: ['status_reporting'],
        },
      ],
      requiresInput: false,
    },
  ],
  successCriteria: [
    'All system components status is current',
    'Health indicators are within acceptable ranges',
    'Issues are identified and prioritized',
    'Status report is generated and distributed',
  ],
  fallbackActions: [
    'Use cached status data if collection fails',
    'Escalate communication failures to admin',
    'Document status gaps for manual investigation',
  ],
};
/**
 * Test Verification Protocol - Protocol for test verification and quality assurance
 */
export const TEST_VERIFICATION_PROTOCOL: GuidelineProtocol = {
  id: 'test_verification',
  description: 'Protocol for comprehensive test verification and quality assurance',
  steps: [
    {
      id: 'test_analysis',
      name: 'Test Analysis',
      description: 'Analyze test results and coverage',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['quality_assessment'],
    },
    {
      id: 'quality_assessment',
      name: 'Quality Assessment',
      description: 'Assess overall quality based on test results',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['verification_decision'],
    },
    {
      id: 'verification_decision',
      name: 'Verification Decision',
      description: 'Make verification decisions based on quality assessment',
      type: 'orchestrator_decision',
      required: true,
      nextSteps: ['verification_actions'],
    },
    {
      id: 'verification_actions',
      name: 'Verification Actions',
      description: 'Execute verification actions and coordinate next steps',
      type: 'action_execution',
      required: false,
      nextSteps: [],
    },
  ],
  decisionPoints: [
    {
      id: 'test_result_evaluation',
      question: 'Do test results meet quality standards?',
      options: [
        {
          id: 'pass',
          label: 'Tests pass quality standards',
          action: 'Proceed with verification approval',
          nextSteps: ['verification_actions'],
        },
        {
          id: 'fail',
          label: 'Tests do not meet standards',
          action: 'Identify quality issues and improvement actions',
          nextSteps: ['quality_improvement'],
        },
      ],
      requiresInput: false,
    },
  ],
  successCriteria: [
    'All tests are passing or documented failures are understood',
    'Test coverage meets minimum requirements',
    'Quality metrics are within acceptable ranges',
    'Verification decision is documented and communicated',
  ],
  fallbackActions: [
    'Document test failures and create improvement plan',
    'Escalate critical quality issues to development team',
    'Schedule additional testing if coverage is insufficient',
  ],
};
/**
 * Pull Request Protocol - Protocol for handling pull request related signals
 */
export const PULL_REQUEST_PROTOCOL: GuidelineProtocol = {
  id: 'pull_request',
  description: 'Protocol for handling pull request creation, review, and management',
  steps: [
    {
      id: 'pr_analysis',
      name: 'PR Analysis',
      description: 'Analyze pull request content and context',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['review_assessment'],
    },
    {
      id: 'review_assessment',
      name: 'Review Assessment',
      description: 'Assess review status and identify issues',
      type: 'inspector_analysis',
      required: true,
      nextSteps: ['merge_decision'],
    },
    {
      id: 'merge_decision',
      name: 'Merge Decision',
      description: 'Make merge decision based on assessment',
      type: 'orchestrator_decision',
      required: true,
      nextSteps: ['merge_actions'],
    },
    {
      id: 'merge_actions',
      name: 'Merge Actions',
      description: 'Execute merge actions and coordinate post-merge tasks',
      type: 'action_execution',
      required: false,
      nextSteps: [],
    },
  ],
  decisionPoints: [
    {
      id: 'merge_readiness',
      question: 'Is the pull request ready for merge?',
      options: [
        {
          id: 'ready',
          label: 'Ready for merge',
          action: 'Proceed with merge process',
          nextSteps: ['merge_actions'],
        },
        {
          id: 'not_ready',
          label: 'Not ready for merge',
          action: 'Request changes or additional review',
          nextSteps: ['change_request'],
        },
      ],
      requiresInput: false,
    },
  ],
  successCriteria: [
    'Pull request is reviewed and approved',
    'All review comments are addressed',
    'Merge conflicts are resolved',
    'Post-merge tasks are coordinated',
  ],
  fallbackActions: [
    'Document merge blockers and create resolution plan',
    'Escalate merge conflicts to project lead',
    'Schedule additional review if needed',
  ],
};
// Protocol registry for easy access
export const STANDARD_PROTOCOLS = {
  signal_resolution: SIGNAL_RESOLUTION_PROTOCOL,
  resource_report: RESOURCE_REPORT_PROTOCOL,
  operational_status: OPERATIONAL_STATUS_PROTOCOL,
  test_verification: TEST_VERIFICATION_PROTOCOL,
  pull_request: PULL_REQUEST_PROTOCOL,
} as const;
export type StandardProtocolId = keyof typeof STANDARD_PROTOCOLS;
/**
 * Get a standard protocol by ID
 */
export function getStandardProtocol(id: StandardProtocolId): GuidelineProtocol {
  return STANDARD_PROTOCOLS[id];
}
/**
 * Check if a protocol ID is a standard protocol
 */
export function isStandardProtocol(id: string): id is StandardProtocolId {
  return id in STANDARD_PROTOCOLS;
}
