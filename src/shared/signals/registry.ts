/**
 * ♫ Signal Registry for @dcversus/prp
 *
 * Comprehensive signal definitions following the hierarchy:
 * oo → aa → OO → AA (ascending urgency)
 */
import type { Signal, SignalType } from '../types';

export interface ExtendedSignal extends Signal {
  tag?: string;
}
export interface SignalDefinition {
  tag: string;
  type: SignalType;
  category:
    | 'admin_action'
    | 'admin_info'
    | 'agent_action'
    | 'agent_info'
    | 'analysis'
    | 'communication'
    | 'coordination'
    | 'deployment'
    | 'design'
    | 'development'
    | 'incident'
    | 'orchestrator_action'
    | 'orchestrator_info'
    | 'system_action'
    | 'system_info'
    | 'testing';
  priority: number;
  description: string;
  handler: 'orchestrator' | 'admin';
  escalationRules?: {
    timeout?: number; // milliseconds
    escalateTo?: string; // signal tag to escalate to
    conditions?: string[]; // conditions for escalation
  };
  metadataSchema?: Record<string, unknown>;
  examples?: string[];
}
/**
 * Signal Registry containing all defined signals
 */
export const SIGNAL_REGISTRY: Record<string, SignalDefinition> = {
  // Orchestrator Information Signals (oo)
  oo: {
    tag: 'oo',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'General orchestrator status update',
    handler: 'orchestrator',
    escalationRules: {
      timeout: 600000, // 10 minutes
      escalateTo: 'OO',
    },
  },
  'oo-init': {
    tag: 'oo-init',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'Initialization progress update',
    handler: 'orchestrator',
    metadataSchema: {
      component: 'string',
      progress: 'number',
      status: 'string',
    },
  },
  'oo-scan': {
    tag: 'oo-scan',
    type: 'info',
    category: 'orchestrator_info',
    priority: 3,
    description: 'Scan completion report',
    handler: 'orchestrator',
    metadataSchema: {
      scanType: 'string',
      signalsFound: 'number',
      duration: 'number',
    },
  },
  'oo-agent': {
    tag: 'oo-agent',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'Agent activity summary',
    handler: 'orchestrator',
    metadataSchema: {
      agentId: 'string',
      activity: 'string',
      status: 'string',
    },
  },
  'oo-resource': {
    tag: 'oo-resource',
    type: 'info',
    category: 'orchestrator_info',
    priority: 3,
    description: 'Resource usage report',
    handler: 'orchestrator',
    metadataSchema: {
      resource: 'string',
      usage: 'number',
      threshold: 'number',
    },
  },
  'oo-progress': {
    tag: 'oo-progress',
    type: 'info',
    category: 'orchestrator_info',
    priority: 2,
    description: 'Orchestrator task progress',
    handler: 'orchestrator',
    metadataSchema: {
      taskId: 'string',
      progress: 'number',
      status: 'string',
    },
  },
  'oo-analysis': {
    tag: 'oo-analysis',
    type: 'info',
    category: 'orchestrator_info',
    priority: 3,
    description: 'Analysis complete',
    handler: 'orchestrator',
    metadataSchema: {
      analysisType: 'string',
      result: 'string',
      recommendations: 'array',
    },
  },
  // Admin Information Signals (aa)
  aa: {
    tag: 'aa',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'General admin notification',
    handler: 'admin',
    escalationRules: {
      timeout: 1800000, // 30 minutes
      escalateTo: 'AA',
    },
  },
  'aa-progress': {
    tag: 'aa-progress',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Task progress update',
    handler: 'admin',
    metadataSchema: {
      taskId: 'string',
      progress: 'number',
      eta: 'string',
    },
  },
  'aa-preview': {
    tag: 'aa-preview',
    type: 'info',
    category: 'admin_info',
    priority: 5,
    description: 'Preview available for review',
    handler: 'admin',
    metadataSchema: {
      previewUrl: 'string',
      contentType: 'string',
      expiresAt: 'string',
    },
    examples: [
      'Preview available: https://example.com/preview',
      'Report ready for review: https://example.com/report',
    ],
  },
  'aa-summary': {
    tag: 'aa-summary',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Daily/weekly summary',
    handler: 'admin',
    metadataSchema: {
      period: 'string',
      metrics: 'object',
      highlights: 'array',
    },
  },
  'aa-reminder': {
    tag: 'aa-reminder',
    type: 'info',
    category: 'admin_info',
    priority: 3,
    description: 'Gentle reminder for admin',
    handler: 'admin',
    metadataSchema: {
      reminderType: 'string',
      action: 'string',
      dueDate: 'string',
    },
  },
  'aa-analysis': {
    tag: 'aa-analysis',
    type: 'info',
    category: 'admin_info',
    priority: 5,
    description: 'Analysis ready for review',
    handler: 'admin',
    metadataSchema: {
      analysisId: 'string',
      summary: 'string',
      recommendations: 'array',
    },
  },
  'aa-share': {
    tag: 'aa-share',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Content ready to share',
    handler: 'admin',
    metadataSchema: {
      shareUrl: 'string',
      contentType: 'string',
      audience: 'string',
    },
  },
  'aa-report': {
    tag: 'aa-report',
    type: 'info',
    category: 'admin_info',
    priority: 5,
    description: 'Report generated for review',
    handler: 'admin',
    metadataSchema: {
      reportType: 'string',
      reportUrl: 'string',
      period: 'string',
    },
  },
  'aa-feedback': {
    tag: 'aa-feedback',
    type: 'info',
    category: 'admin_info',
    priority: 4,
    description: 'Feedback requested',
    handler: 'admin',
    metadataSchema: {
      feedbackType: 'string',
      context: 'string',
      deadline: 'string',
    },
  },
  // Orchestrator Action Signals (OO)
  OO: {
    tag: 'OO',
    type: 'action',
    category: 'orchestrator_action',
    priority: 7,
    description: 'New situation requiring resolution',
    handler: 'orchestrator',
    escalationRules: {
      timeout: 300000, // 5 minutes
      escalateTo: 'AA',
      conditions: ['resolution_failed', 'timeout_exceeded'],
    },
  },
  'OO-signal': {
    tag: 'OO-signal',
    type: 'action',
    category: 'orchestrator_action',
    priority: 8,
    description: 'New signal pattern detected',
    handler: 'orchestrator',
    metadataSchema: {
      signalPattern: 'string',
      frequency: 'number',
      impact: 'string',
    },
  },
  'OO-conflict': {
    tag: 'OO-conflict',
    type: 'action',
    category: 'orchestrator_action',
    priority: 8,
    description: 'Conflict resolution needed',
    handler: 'orchestrator',
    metadataSchema: {
      conflictType: 'string',
      parties: 'array',
      resolution: 'string',
    },
  },
  'OO-resource': {
    tag: 'OO-resource',
    type: 'action',
    category: 'orchestrator_action',
    priority: 9,
    description: 'Resource threshold exceeded',
    handler: 'orchestrator',
    metadataSchema: {
      resource: 'string',
      currentUsage: 'number',
      threshold: 'number',
      impact: 'string',
    },
  },
  'OO-failure': {
    tag: 'OO-failure',
    type: 'action',
    category: 'orchestrator_action',
    priority: 9,
    description: 'System failure recovery needed',
    handler: 'orchestrator',
    metadataSchema: {
      failureType: 'string',
      component: 'string',
      recovery: 'string',
    },
  },
  'OO-decision': {
    tag: 'OO-decision',
    type: 'action',
    category: 'orchestrator_action',
    priority: 8,
    description: 'Decision point reached',
    handler: 'orchestrator',
    metadataSchema: {
      decisionType: 'string',
      options: 'array',
      criteria: 'string',
    },
  },
  'OO-agent': {
    tag: 'OO-agent',
    type: 'action',
    category: 'orchestrator_action',
    priority: 7,
    description: 'Agent needs orchestrator intervention',
    handler: 'orchestrator',
    metadataSchema: {
      agentId: 'string',
      issue: 'string',
      requiredAction: 'string',
    },
  },
  // Admin Action Signals (AA)
  AA: {
    tag: 'AA',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Critical admin intervention required',
    handler: 'admin',
  },
  'AA-error': {
    tag: 'AA-error',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Unrecoverable system error',
    handler: 'admin',
    metadataSchema: {
      errorType: 'string',
      component: 'string',
      impact: 'string',
      stackTrace: 'string',
    },
  },
  'AA-security': {
    tag: 'AA-security',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Security issue detected',
    handler: 'admin',
    metadataSchema: {
      securityLevel: 'string',
      threat: 'string',
      affectedSystems: 'array',
      immediateAction: 'string',
    },
  },
  'AA-decision': {
    tag: 'AA-decision',
    type: 'action',
    category: 'admin_action',
    priority: 9,
    description: 'Critical decision point reached',
    handler: 'admin',
    metadataSchema: {
      decisionType: 'string',
      urgency: 'string',
      impact: 'string',
      deadline: 'string',
    },
  },
  'AA-emergency': {
    tag: 'AA-emergency',
    type: 'action',
    category: 'admin_action',
    priority: 10,
    description: 'Emergency situation',
    handler: 'admin',
    metadataSchema: {
      emergencyType: 'string',
      severity: 'string',
      immediateAction: 'string',
      affectedSystems: 'array',
    },
  },
  'AA-agent': {
    tag: 'AA-agent',
    type: 'action',
    category: 'admin_action',
    priority: 9,
    description: 'Agent critical failure',
    handler: 'admin',
    metadataSchema: {
      agentId: 'string',
      failureType: 'string',
      impact: 'string',
      requiredAction: 'string',
    },
  },
  // === SYSTEM SIGNALS ===
  HF: {
    tag: 'HF',
    type: 'info',
    category: 'system_info',
    priority: 3,
    description: 'Health Feedback (orchestration cycle start)',
    handler: 'orchestrator',
    metadataSchema: {
      cycleStatus: 'string',
      healthMetrics: 'object',
      systemStatus: 'string',
    },
  },
  pr: {
    tag: 'pr',
    type: 'info',
    category: 'development',
    priority: 4,
    description: 'Pull Request Preparation (optimization pre-catch)',
    handler: 'orchestrator',
    metadataSchema: {
      prNumber: 'number',
      preparationStatus: 'string',
      optimizationApplied: 'boolean',
    },
  },
  PR: {
    tag: 'PR',
    type: 'info',
    category: 'development',
    priority: 5,
    description: 'Pull Request Created (PR activity detected)',
    handler: 'orchestrator',
    metadataSchema: {
      prNumber: 'number',
      prUrl: 'string',
      changedFiles: 'number',
    },
  },
  FF: {
    tag: 'FF',
    type: 'action',
    category: 'system_action',
    priority: 10,
    description: 'System Fatal Error (corruption/unrecoverable errors)',
    handler: 'admin',
    escalationRules: {
      timeout: 0, // Immediate escalation
      escalateTo: 'AA',
    },
    metadataSchema: {
      errorType: 'string',
      affectedComponents: 'array',
      systemImpact: 'string',
    },
  },
  TF: {
    tag: 'TF',
    type: 'info',
    category: 'system_info',
    priority: 1,
    description: 'Terminal Closed (graceful session end)',
    handler: 'orchestrator',
    metadataSchema: {
      sessionId: 'string',
      sessionDuration: 'number',
      exitCode: 'number',
    },
  },
  // === AGENT SIGNALS ===
  // Blocker & Feedback
  bb: {
    tag: 'bb',
    type: 'action',
    category: 'agent_action',
    priority: 8,
    description: 'Blocker',
    handler: 'orchestrator',
    metadataSchema: {
      blockerType: 'string',
      blockingTask: 'string',
      unblockingRequired: 'string',
    },
  },
  af: {
    tag: 'af',
    type: 'info',
    category: 'agent_info',
    priority: 4,
    description: 'Feedback Request',
    handler: 'orchestrator',
    metadataSchema: {
      feedbackType: 'string',
      context: 'string',
      deadline: 'string',
    },
  },
  gg: {
    tag: 'gg',
    type: 'info',
    category: 'agent_info',
    priority: 6,
    description: 'Goal Clarification',
    handler: 'orchestrator',
    metadataSchema: {
      goalId: 'string',
      clarificationNeeded: 'string',
      proposedChanges: 'array',
    },
  },
  ff: {
    tag: 'ff',
    type: 'action',
    category: 'agent_action',
    priority: 7,
    description: 'Goal Not Achievable',
    handler: 'orchestrator',
    metadataSchema: {
      goalId: 'string',
      reason: 'string',
      alternatives: 'array',
    },
  },
  da: {
    tag: 'da',
    type: 'info',
    category: 'agent_info',
    priority: 5,
    description: 'Done Assessment',
    handler: 'orchestrator',
    metadataSchema: {
      taskId: 'string',
      completionEvidence: 'string',
      assessor: 'string',
    },
  },
  no: {
    tag: 'no',
    type: 'info',
    category: 'agent_info',
    priority: 6,
    description: 'Not Obvious',
    handler: 'orchestrator',
    metadataSchema: {
      complexity: 'string',
      unknownFactors: 'array',
      researchNeeded: 'boolean',
    },
  },
  // System Analysis
  rp: {
    tag: 'rp',
    type: 'info',
    category: 'agent_info',
    priority: 4,
    description: 'Ready for Preparation',
    handler: 'orchestrator',
    metadataSchema: {
      analysisComplete: 'boolean',
      requirementsClear: 'boolean',
      readyForPlanning: 'boolean',
    },
  },
  vr: {
    tag: 'vr',
    type: 'action',
    category: 'agent_action',
    priority: 7,
    description: 'Validation Required',
    handler: 'orchestrator',
    metadataSchema: {
      validationType: 'string',
      validator: 'string',
      deadline: 'string',
    },
  },
  rr: {
    tag: 'rr',
    type: 'action',
    category: 'agent_action',
    priority: 6,
    description: 'Research Request',
    handler: 'orchestrator',
    metadataSchema: {
      researchTopic: 'string',
      researchQuestions: 'array',
      timeframe: 'string',
    },
  },
  vp: {
    tag: 'vp',
    type: 'info',
    category: 'agent_info',
    priority: 5,
    description: 'Verification Plan',
    handler: 'orchestrator',
    metadataSchema: {
      planId: 'string',
      verificationSteps: 'array',
      successCriteria: 'array',
    },
  },
  ip: {
    tag: 'ip',
    type: 'info',
    category: 'agent_info',
    priority: 5,
    description: 'Implementation Plan',
    handler: 'orchestrator',
    metadataSchema: {
      planId: 'string',
      tasks: 'array',
      estimatedDuration: 'string',
    },
  },
  er: {
    tag: 'er',
    type: 'action',
    category: 'agent_action',
    priority: 6,
    description: 'Experiment Required',
    handler: 'orchestrator',
    metadataSchema: {
      experimentId: 'string',
      hypothesis: 'string',
      successMetrics: 'array',
    },
  },
  // Development & Testing
  tp: {
    tag: 'tp',
    type: 'info',
    category: 'testing',
    priority: 4,
    description: 'Tests Prepared',
    handler: 'orchestrator',
    metadataSchema: {
      testSuite: 'string',
      testCount: 'number',
      coverageTarget: 'number',
    },
  },
  dp: {
    tag: 'dp',
    type: 'info',
    category: 'development',
    priority: 4,
    description: 'Development Progress',
    handler: 'orchestrator',
    metadataSchema: {
      featureId: 'string',
      progressPercent: 'number',
      nextMilestone: 'string',
    },
  },
  br: {
    tag: 'br',
    type: 'info',
    category: 'coordination',
    priority: 3,
    description: 'Blocker Resolved',
    handler: 'orchestrator',
    metadataSchema: {
      blockerId: 'string',
      resolutionMethod: 'string',
      timeToResolve: 'number',
    },
  },
  rc: {
    tag: 'rc',
    type: 'info',
    category: 'analysis',
    priority: 3,
    description: 'Research Complete',
    handler: 'orchestrator',
    metadataSchema: {
      researchId: 'string',
      findings: 'string',
      recommendations: 'array',
    },
  },
  tw: {
    tag: 'tw',
    type: 'info',
    category: 'testing',
    priority: 4,
    description: 'Tests Written',
    handler: 'orchestrator',
    metadataSchema: {
      testSuite: 'string',
      testCount: 'number',
      coverageAchieved: 'number',
    },
  },
  bf: {
    tag: 'bf',
    type: 'info',
    category: 'development',
    priority: 5,
    description: 'Bug Fixed',
    handler: 'orchestrator',
    metadataSchema: {
      bugId: 'string',
      fixMethod: 'string',
      verificationComplete: 'boolean',
    },
  },
  // Quality & CI/CD
  cq: {
    tag: 'cq',
    type: 'info',
    category: 'testing',
    priority: 3,
    description: 'Code Quality',
    handler: 'orchestrator',
    metadataSchema: {
      qualityScore: 'number',
      issuesFound: 'number',
      recommendations: 'array',
    },
  },
  cp: {
    tag: 'cp',
    type: 'info',
    category: 'deployment',
    priority: 3,
    description: 'CI Passed',
    handler: 'orchestrator',
    metadataSchema: {
      buildId: 'string',
      buildNumber: 'string',
      testResults: 'object',
    },
  },
  tr: {
    tag: 'tr',
    type: 'action',
    category: 'testing',
    priority: 7,
    description: 'Tests Red',
    handler: 'orchestrator',
    metadataSchema: {
      testSuite: 'string',
      failingTests: 'number',
      errors: 'array',
    },
  },
  tg: {
    tag: 'tg',
    type: 'info',
    category: 'testing',
    priority: 2,
    description: 'Tests Green',
    handler: 'orchestrator',
    metadataSchema: {
      testSuite: 'string',
      passingTests: 'number',
      coverage: 'number',
    },
  },
  cf: {
    tag: 'cf',
    type: 'action',
    category: 'deployment',
    priority: 8,
    description: 'CI Failed',
    handler: 'orchestrator',
    metadataSchema: {
      buildId: 'string',
      failureReason: 'string',
      errorLogs: 'string',
    },
  },
  pc: {
    tag: 'pc',
    type: 'info',
    category: 'deployment',
    priority: 4,
    description: 'Pre-release Complete',
    handler: 'orchestrator',
    metadataSchema: {
      releaseVersion: 'string',
      checklistComplete: 'boolean',
      approvalStatus: 'string',
    },
  },
  rg: {
    tag: 'rg',
    type: 'info',
    category: 'coordination',
    priority: 4,
    description: 'Review Progress',
    handler: 'orchestrator',
    metadataSchema: {
      reviewId: 'string',
      progressPercent: 'number',
      reviewer: 'string',
    },
  },
  // Release & Deployment
  cd: {
    tag: 'cd',
    type: 'info',
    category: 'deployment',
    priority: 2,
    description: 'Cleanup Done',
    handler: 'orchestrator',
    metadataSchema: {
      cleanupType: 'string',
      itemsRemoved: 'array',
      spaceFreed: 'number',
    },
  },
  rv: {
    tag: 'rv',
    type: 'info',
    category: 'testing',
    priority: 3,
    description: 'Review Passed',
    handler: 'orchestrator',
    metadataSchema: {
      reviewId: 'string',
      reviewer: 'string',
      feedback: 'string',
    },
  },
  iv: {
    tag: 'iv',
    type: 'info',
    category: 'testing',
    priority: 4,
    description: 'Implementation Verified',
    handler: 'orchestrator',
    metadataSchema: {
      implementationId: 'string',
      verificationMethod: 'string',
      result: 'string',
    },
  },
  ra: {
    tag: 'ra',
    type: 'action',
    category: 'deployment',
    priority: 6,
    description: 'Release Approved',
    handler: 'admin',
    metadataSchema: {
      releaseVersion: 'string',
      approver: 'string',
      approvalDate: 'string',
    },
  },
  mg: {
    tag: 'mg',
    type: 'info',
    category: 'deployment',
    priority: 3,
    description: 'Merged',
    handler: 'orchestrator',
    metadataSchema: {
      prNumber: 'number',
      mergeCommit: 'string',
      mergeDate: 'string',
    },
  },
  rl: {
    tag: 'rl',
    type: 'info',
    category: 'deployment',
    priority: 4,
    description: 'Released',
    handler: 'orchestrator',
    metadataSchema: {
      releaseVersion: 'string',
      deploymentId: 'string',
      releaseDate: 'string',
    },
  },
  // Post-Release & Incidents
  ps: {
    tag: 'ps',
    type: 'info',
    category: 'deployment',
    priority: 3,
    description: 'Post-release Status',
    handler: 'orchestrator',
    metadataSchema: {
      releaseVersion: 'string',
      status: 'string',
      metrics: 'object',
    },
  },
  ic: {
    tag: 'ic',
    type: 'action',
    category: 'incident',
    priority: 9,
    description: 'Incident',
    handler: 'admin',
    escalationRules: {
      timeout: 300000, // 5 minutes
      escalateTo: 'AA',
    },
    metadataSchema: {
      incidentId: 'string',
      severity: 'string',
      impact: 'string',
    },
  },
  JC: {
    tag: 'JC',
    type: 'info',
    category: 'incident',
    priority: 10,
    description: 'Jesus Christ (Incident Resolved)',
    handler: 'admin',
    metadataSchema: {
      incidentId: 'string',
      resolutionMethod: 'string',
      resolutionTime: 'number',
    },
  },
  pm: {
    tag: 'pm',
    type: 'info',
    category: 'incident',
    priority: 5,
    description: 'Post-mortem',
    handler: 'orchestrator',
    metadataSchema: {
      incidentId: 'string',
      lessonsLearned: 'array',
      preventionMeasures: 'array',
    },
  },
  oa: {
    tag: 'oa',
    type: 'action',
    category: 'coordination',
    priority: 7,
    description: 'Orchestrator Attention',
    handler: 'orchestrator',
    metadataSchema: {
      attentionType: 'string',
      context: 'string',
      urgency: 'string',
    },
  },
  ap: {
    tag: 'ap',
    type: 'info',
    category: 'communication',
    priority: 5,
    description: 'Admin Preview Ready',
    handler: 'admin',
    metadataSchema: {
      previewType: 'string',
      previewUrl: 'string',
      expiresAt: 'string',
    },
  },
  // UX/UI Design Signals
  du: {
    tag: 'du',
    type: 'info',
    category: 'design',
    priority: 3,
    description: 'Design Update',
    handler: 'orchestrator',
    metadataSchema: {
      componentId: 'string',
      changeType: 'string',
      description: 'string',
    },
  },
  ds: {
    tag: 'ds',
    type: 'info',
    category: 'design',
    priority: 4,
    description: 'Design System Updated',
    handler: 'orchestrator',
    metadataSchema: {
      systemVersion: 'string',
      componentsUpdated: 'array',
      breakingChanges: 'boolean',
    },
  },
  dr: {
    tag: 'dr',
    type: 'action',
    category: 'design',
    priority: 5,
    description: 'Design Review Requested',
    handler: 'orchestrator',
    metadataSchema: {
      designId: 'string',
      reviewType: 'string',
      deadline: 'string',
    },
  },
  dh: {
    tag: 'dh',
    type: 'info',
    category: 'design',
    priority: 4,
    description: 'Design Handoff Ready',
    handler: 'orchestrator',
    metadataSchema: {
      designId: 'string',
      deliverables: 'array',
      handoffDate: 'string',
    },
  },
  df: {
    tag: 'df',
    type: 'info',
    category: 'design',
    priority: 4,
    description: 'Design Feedback Received',
    handler: 'orchestrator',
    metadataSchema: {
      designId: 'string',
      feedback: 'string',
      actionItems: 'array',
    },
  },
  di: {
    tag: 'di',
    type: 'action',
    category: 'design',
    priority: 6,
    description: 'Design Issue Identified',
    handler: 'orchestrator',
    metadataSchema: {
      issueId: 'string',
      severity: 'string',
      description: 'string',
    },
  },
  dt: {
    tag: 'dt',
    type: 'info',
    category: 'testing',
    priority: 3,
    description: 'Design Testing Complete',
    handler: 'orchestrator',
    metadataSchema: {
      testId: 'string',
      testResults: 'object',
      recommendations: 'array',
    },
  },
};
/**
 * Signal Registry Manager
 */
export class SignalRegistry {
  private static instance: SignalRegistry;
  private readonly escalationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  static getInstance(): SignalRegistry {
    if (!SignalRegistry.instance) {
      SignalRegistry.instance = new SignalRegistry();
    }
    return SignalRegistry.instance;
  }
  /**
   * Get signal definition by tag
   */
  getDefinition(tag: string): SignalDefinition | undefined {
    return SIGNAL_REGISTRY[tag];
  }
  /**
   * Get all signals by category
   */
  getByCategory(category: SignalDefinition['category']): SignalDefinition[] {
    return Object.values(SIGNAL_REGISTRY).filter((signal) => signal.category === category);
  }
  /**
   * Get all signals by handler
   */
  getByHandler(handler: 'orchestrator' | 'admin'): SignalDefinition[] {
    return Object.values(SIGNAL_REGISTRY).filter((signal) => signal.handler === handler);
  }
  /**
   * Check if signal tag is valid
   */
  isValidTag(tag: string): boolean {
    return tag in SIGNAL_REGISTRY;
  }
  /**
   * Create signal from definition
   */
  createSignal(tag: string, content: string, metadata?: Record<string, unknown>): Signal | null {
    const definition = this.getDefinition(tag);
    if (!definition) {
      return null;
    }
    return {
      id: `${tag}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: `[${tag}]`,
      priority: definition.priority,
      source: 'system',
      timestamp: new Date(),
      data: {
        content,
        definitionTag: definition.tag,
        category: definition.category,
        handler: definition.handler,
        createdAt: new Date().toISOString(),
      },
      resolved: false,
      relatedSignals: [],
      metadata: {
        ...metadata,
      },
    };
  }
  /**
   * Setup escalation timer for signal
   */
  setupEscalation(
    signal: Signal,
    escalateCallback: (signal: Signal, escalateTo: string) => void,
  ): void {
    const extendedSignal = signal as ExtendedSignal;
    const tag = extendedSignal.tag?.replace(/[[\]]/g, '') || signal.type;
    const definition = this.getDefinition(tag);
    if (!definition?.escalationRules) {
      return;
    }
    const { timeout, escalateTo } = definition.escalationRules;
    if (timeout && escalateTo) {
      const timer = setTimeout(() => {
        escalateCallback(signal, escalateTo);
      }, timeout);
      this.escalationTimers.set(signal.id, timer);
    }
  }
  /**
   * Cancel escalation timer for signal
   */
  cancelEscalation(signalId: string): void {
    const timer = this.escalationTimers.get(signalId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(signalId);
    }
  }
  /**
   * Get all registered signal tags
   */
  getAllTags(): string[] {
    return Object.keys(SIGNAL_REGISTRY);
  }
  /**
   * Get signals by priority range
   */
  getByPriorityRange(minPriority: number, maxPriority: number): SignalDefinition[] {
    return Object.values(SIGNAL_REGISTRY).filter(
      (signal) => signal.priority >= minPriority && signal.priority <= maxPriority,
    );
  }
}
// Export singleton instance
export const signalRegistry = SignalRegistry.getInstance();
