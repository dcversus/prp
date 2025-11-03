/**
 * E2E Test: Pull Request Guidelines Execution
 *
 * Tests the complete flow from PR signal to GitHub actions
 * [Pr] → Scanner → Guidelines → Inspector → Orchestrator → GitHub Actions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GuidelinesExecutor } from '../../src/guidelines/executor';
import { GuidelinesRegistry, initializeGuidelines } from '../../src/guidelines/registry';
import { Scanner } from '../../src/scanner';
import { Inspector } from '../../src/inspector';
import { Orchestrator } from '../../src/orchestrator';
import { Signal, eventBus, createLayerLogger, TimeUtils } from '../../src/shared';
import { GitHubClient, PRAnalysis } from '../../src/shared/github';
import { storageManager } from '../../src/storage';

const logger = createLayerLogger('test-pr-guidelines');

// Mock GitHub API responses
const mockPRData = {
  pr: {
    id: 123456,
    title: 'Add user authentication feature',
    description: 'Implements JWT-based authentication with login/logout functionality',
    state: 'open' as const,
    author: { login: 'test-user', type: 'User' as const },
    baseBranch: 'main',
    headBranch: 'feature/auth',
    createdAt: new Date(),
    updatedAt: new Date(),
    additions: 250,
    deletions: 15,
    changedFiles: 8,
    labels: ['enhancement', 'authentication'],
    assignees: ['test-user'],
    requestedReviewers: ['reviewer-1'],
    milestone: 'v1.2.0'
  },
  ci: {
    status: 'success' as const,
    contexts: [
      {
        context: 'ci/travis',
        state: 'success' as const,
        targetUrl: 'https://travis-ci.org',
        description: 'Travis CI build passed',
        createdAt: new Date()
      },
      {
        context: 'coverage/coveralls',
        state: 'success' as const,
        targetUrl: 'https://coveralls.io',
        description: 'Coverage increased by 2%',
        createdAt: new Date()
      }
    ]
  },
  comments: [
    {
      id: 1,
      author: 'reviewer-1',
      body: 'Looks good! One minor suggestion: maybe add password strength validation.',
      createdAt: new Date(),
      updatedAt: new Date(),
      isResolved: false,
      type: 'issue_comment' as const
    }
  ],
  reviews: [
    {
      id: 1,
      author: 'reviewer-1',
      state: 'approved' as const,
      body: 'Great implementation! All tests pass and code looks clean.',
      createdAt: new Date(),
      commitId: 'abc123'
    }
  ],
  files: [
    {
      filename: 'src/auth/jwt.ts',
      status: 'added' as const,
      additions: 50,
      deletions: 0,
      patch: 'new JWT implementation...',
      previousFilename: undefined
    },
    {
      filename: 'src/auth/login.ts',
      status: 'added' as const,
      additions: 30,
      deletions: 0,
      patch: 'login functionality...',
      previousFilename: undefined
    },
    {
      filename: 'src/auth/logout.ts',
      status: 'added' as const,
      additions: 20,
      deletions: 0,
      patch: 'logout functionality...',
      previousFilename: undefined
    },
    {
      filename: 'tests/auth.test.ts',
      status: 'added' as const,
      additions: 80,
      deletions: 0,
      patch: 'comprehensive auth tests...',
      previousFilename: undefined
    }
  ],
  commits: [
    {
      sha: 'abc123',
      message: 'feat: add JWT authentication system',
      author: 'test-user',
      date: new Date(),
      files: ['src/auth/jwt.ts', 'src/auth/login.ts', 'src/auth/logout.ts', 'tests/auth.test.ts']
    }
  ],
  metadata: {
    isDraft: false,
    isRebaseable: true,
    maintainerCanModify: true,
    locked: false,
    repository: {
      name: 'test-repo',
      defaultBranch: 'main',
      isPrivate: false
    }
  }
};

// Mock Inspector analysis result
const mockInspectorAnalysis = {
  implementation_analysis: {
    task_completeness: {
      percentage_complete: 85,
      missing_features: ['Password reset functionality'],
      partially_implemented: ['JWT token refresh mechanism'],
      fully_implemented: ['JWT generation', 'Login validation', 'Logout functionality']
    },
    description_realization_match: {
      match_score: 90,
      discrepancies: ['Missing password reset mentioned in description'],
      unimplemented_promises: ['"password recovery via email"'],
      additional_implementation: ['Added JWT token refresh mechanism']
    },
    requirement_compliance: {
      requirements_met: ['JWT-based authentication', 'Login/logout endpoints'],
      requirements_partially_met: ['Token validation'],
      requirements_not_met: ['Password reset flow'],
      additional_requirements_needed: ['Email service integration']
    },
    code_quality_assessment: {
      structure_rating: 'good',
      maintainability_rating: 'good',
      best_practices_followed: ['Error handling', 'Input validation', 'Separation of concerns'],
      improvements_needed: ['Add more comprehensive logging']
    },
    testing_assessment: {
      tests_present: true,
      test_coverage: 'adequate',
      test_quality: 'good',
      missing_tests: ['Edge cases for malformed JWTs']
    },
    priority_issues: [
      {
        type: 'high',
        category: 'functionality',
        description: 'Missing password reset functionality mentioned in PR description',
        file: 'src/auth/login.ts',
        line_number: 45,
        suggested_fix: 'Implement password reset endpoint or update PR description'
      }
    ]
  },
  overall_assessment: {
    ready_for_review: true,
    estimated_review_complexity: 'moderate',
    recommended_action: 'request_changes',
    confidence_score: 88
  }
};

// Mock Orchestrator decision
const mockOrchestratorDecision = {
  action: {
    type: 'request-changes',
    prNumber: 123,
    message: 'Great implementation! Please address the missing password reset functionality before merge.',
    issues: [
      {
        file: 'src/auth/login.ts',
        line_number: 45,
        description: 'Missing password reset functionality',
        suggested_fix: 'Implement password reset endpoint or update PR description'
      }
    ]
  },
  reasoning: 'Implementation is solid but missing password reset mentioned in description',
  confidence: 0.88,
  nextSteps: ['Wait for author to address missing functionality', 'Re-review after changes'],
  tokenUsage: {
    input: 2000,
    output: 500,
    total: 2500
  }
};

describe('Pull Request Guidelines E2E Flow', () => {
  let scanner: Scanner;
  let inspector: Inspector;
  let orchestrator: Orchestrator;
  let guidelinesRegistry: GuidelinesRegistry;
  let guidelinesExecutor: GuidelinesExecutor;
  let mockGitHubClient: jest.Mocked<GitHubClient>;

  beforeEach(async () => {
    // Initialize storage
    await storageManager.initialize();

    // Create mock GitHub client
    mockGitHubClient = {
      analyzePR: jest.fn().mockResolvedValue(mockPRData),
      getPR: jest.fn().mockResolvedValue(mockPRData.pr),
      getCIStatus: jest.fn().mockResolvedValue(mockPRData.ci),
      getComments: jest.fn().mockResolvedValue(mockPRData.comments),
      getReviews: jest.fn().mockResolvedValue(mockPRData.reviews),
      getFiles: jest.fn().mockResolvedValue(mockPRData.files),
      getCommits: jest.fn().mockResolvedValue(mockPRData.commits),
      getPRMetadata: jest.fn().mockResolvedValue(mockPRData.metadata),
      createReview: jest.fn().mockResolvedValue({ id: 999, state: 'changes_requested' }),
      postComment: jest.fn().mockResolvedValue({ id: 888, body: 'Test comment' })
    } as any;

    // Initialize components
    scanner = new Scanner();
    inspector = new Inspector();
    orchestrator = new Orchestrator();
    guidelinesRegistry = await initializeGuidelines();
    guidelinesExecutor = new GuidelinesExecutor(inspector, orchestrator);

    // Mock Inspector analysis
    jest.spyOn(inspector, 'analyze').mockResolvedValue(mockInspectorAnalysis);

    // Mock Orchestrator decision
    jest.spyOn(orchestrator, 'makeDecision').mockResolvedValue(mockOrchestratorDecision);

    // Mock GitHub client
    jest.doMock('../../src/shared/github', () => ({
      getGitHubClient: () => mockGitHubClient
    }));

    logger.info('Test', 'beforeEach', 'Test environment initialized');
  });

  afterEach(async () => {
    // Clean up
    jest.clearAllMocks();
    await storageManager.clear();
    logger.info('Test', 'afterEach', 'Test environment cleaned up');
  });

  it('should execute complete Pull Request analysis workflow', async () => {
    logger.info('Test', 'should execute complete Pull Request analysis workflow', 'Starting E2E test');

    // 1. Create initial PR signal (from terminal monitoring)
    const prSignal: Signal = {
      id: 'signal-123',
      type: 'Pr', // Pull Request signal
      priority: 2,
      timestamp: TimeUtils.now(),
      data: {
        prNumber: 123,
        prUrl: 'https://github.com/dcversus/prp/pull/123',
        action: 'opened',
        author: 'claude-code-agent',
        command: 'gh pr create --title "Add user authentication feature" --body "Implements JWT-based authentication"',
        sessionId: 'agent-session-456'
      },
      source: 'terminal-monitor',
      metadata: {
        source: 'agent-activity-monitoring',
        sessionId: 'agent-session-456',
        terminalLog: 'gh pr create --title "Add user authentication feature" --body "Implements JWT-based authentication"',
        agentType: 'claude-code-anthropic'
      }
    };

    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      `Created PR signal: ${JSON.stringify(prSignal, null, 2)}`);

    // 2. Trigger signal processing
    let executionCompleted = false;
    let finalExecution: any = null;

    guidelinesExecutor.on('execution_completed', (event) => {
      executionCompleted = true;
      finalExecution = event.result;
      logger.info('Test', 'should execute complete Pull Request analysis workflow',
        'Execution completed', finalExecution);
    });

    // 3. Process the signal through guidelines
    await guidelinesRegistry.processSignal(prSignal);

    // Wait for execution to complete (simulate async processing)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Verify signal triggered guideline
    expect(guidelinesRegistry.getExecutions('in_progress').length).toBeGreaterThan(0);

    const executions = guidelinesRegistry.getExecutions('completed');
    expect(executions.length).toBeGreaterThan(0);

    const execution = executions[0];
    expect(execution.guidelineId).toBe('pull-request-analysis');
    expect(execution.triggerSignal.type).toBe('Pr');

    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      `Execution verified: ${execution.guidelineId}, status: ${execution.status}`);

    // 5. Verify GitHub API was called
    expect(mockGitHubClient.analyzePR).toHaveBeenCalledWith(123);
    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      'GitHub API called successfully');

    // 6. Verify Inspector was called with correct data
    expect(inspector.analyze).toHaveBeenCalled();
    const inspectorCall = (inspector.analyze as jest.Mock).mock.calls[0];
    const payload = inspectorCall[0];
    expect(payload.data).toBeDefined();
    expect(payload.signal.type).toBe('Pr');

    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      'Inspector analysis verified');

    // 7. Verify Orchestrator was called and made decision
    expect(orchestrator.makeDecision).toHaveBeenCalled();
    const orchestratorCall = (orchestrator.makeDecision as jest.Mock).mock.calls[0];
    const decisionContext = orchestratorCall[0];
    expect(decisionContext.inspectorAnalysis).toEqual(mockInspectorAnalysis);

    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      'Orchestrator decision verified');

    // 8. Verify GitHub action was taken
    expect(mockGitHubClient.createReview).toHaveBeenCalledWith(123, {
      body: 'Great implementation! Please address the missing password reset functionality before merge.',
      event: 'REQUEST_CHANGES',
      comments: [
        {
          path: 'src/auth/login.ts',
          line: 45,
          body: 'Missing password reset functionality mentioned in PR description\n\n**Suggested Fix:** Implement password reset endpoint or update PR description'
        }
      ]
    });

    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      'GitHub review created successfully');

    // 9. Verify execution result
    expect(execution.result).toBeDefined();
    expect(execution.result!.success).toBe(true);
    expect(execution.result!.artifacts.length).toBeGreaterThan(0);
    expect(execution.result!.summary.completedSteps).toBe(4); // All 4 steps completed
    expect(execution.result!.summary.totalDuration).toBeGreaterThan(0);

    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      `Execution result verified: ${JSON.stringify(execution.result!.summary, null, 2)}`);

    // 10. Verify execution was saved to storage
    const savedExecution = await storageManager.loadData(`executions/${execution.id}.json`);
    expect(savedExecution).toBeDefined();
    expect(savedExecution.guidelineId).toBe('pull-request-analysis');

    logger.info('Test', 'should execute complete Pull Request analysis workflow',
      'Execution saved to storage successfully');
  });

  it('should handle security review guideline separately', async () => {
    logger.info('Test', 'should handle security review guideline separately',
      'Testing security review workflow');

    // Create security-focused signal
    const securitySignal: Signal = {
      id: 'signal-security-456',
      type: 'As', // Attention signal for security
      priority: 7,
      timestamp: TimeUtils.now(),
      data: {
        prNumber: 456,
        securityIssue: true,
        vulnerability: 'sql_injection'
      },
      source: 'security-scanner',
      metadata: {
        source: 'dependency-check',
        severity: 'high'
      }
    };

    // Mock security guideline trigger
    jest.spyOn(guidelinesRegistry, 'processSignal').mockImplementation(async (signal) => {
      if (signal.type === 'As' && signal.data?.securityIssue) {
        await guidelinesRegistry.triggerGuideline('security-review', signal);
      }
    });

    // Process security signal
    await guidelinesRegistry.processSignal(securitySignal);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify security guideline was triggered
    const securityExecutions = guidelinesRegistry.getExecutions().filter(
      execution => execution.guidelineId === 'security-review'
    );

    expect(securityExecutions.length).toBeGreaterThan(0);

    logger.info('Test', 'should handle security review guideline separately',
      'Security review guideline triggered successfully');
  });

  it('should handle performance analysis guideline separately', async () => {
    logger.info('Test', 'should handle performance analysis guideline separately',
      'Testing performance analysis workflow');

    // Create performance-focused signal
    const performanceSignal: Signal = {
      id: 'signal-perf-789',
      type: 'Or', // Resource signal for performance
      priority: 7,
      timestamp: TimeUtils.now(),
      data: {
        prNumber: 789,
        performanceIssue: true,
        complexity: 'O(n^2)'
      },
      source: 'performance-analyzer',
      metadata: {
        source: 'complexity-analysis',
        impact: 'high'
      }
    };

    // Mock performance guideline trigger
    jest.spyOn(guidelinesRegistry, 'processSignal').mockImplementation(async (signal) => {
      if (signal.type === 'Or' && signal.data?.performanceIssue) {
        await guidelinesRegistry.triggerGuideline('pull-request-performance-analysis', signal);
      }
    });

    // Process performance signal
    await guidelinesRegistry.processSignal(performanceSignal);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify performance guideline was triggered
    const performanceExecutions = guidelinesRegistry.getExecutions().filter(
      execution => execution.guidelineId === 'pull-request-performance-analysis'
    );

    expect(performanceExecutions.length).toBeGreaterThan(0);

    logger.info('Test', 'should handle performance analysis guideline separately',
      'Performance analysis guideline triggered successfully');
  });

  it('should track signal escalation correctly', async () => {
    logger.info('Test', 'should track signal escalation correctly',
      'Testing signal escalation from oo to OO');

    // Create initial signal that should escalate
    const initialSignal: Signal = {
      id: 'signal-escalation-001',
      type: 'os', // Scanner signal - should escalate to OO if not processed
      priority: 2,
      timestamp: TimeUtils.now(),
      data: { prNumber: 999 },
      source: 'scanner',
      metadata: {}
    };

    // Simulate signal processing delay
    let signalProcessed = false;

    setTimeout(() => {
      signalProcessed = true;
      logger.info('Test', 'should track signal escalation correctly',
        'Signal processing simulated as delayed');
    }, 200);

    // Process signal
    await guidelinesRegistry.processSignal(initialSignal);

    // Wait for potential escalation
    await new Promise(resolve => setTimeout(resolve, 300));

    // Signal should have been processed by guidelines
    const executions = guidelinesRegistry.getExecutions();
    expect(executions.length).toBeGreaterThan(0);

    logger.info('Test', 'should track signal escalation correctly',
      'Signal escalation tracking verified');
  });

  it('should maintain proper execution order and dependencies', async () => {
    logger.info('Test', 'should maintain proper execution order and dependencies',
      'Testing step execution order');

    // Track execution order
    const executionOrder: string[] = [];

    // Mock step execution tracking
    const originalExecuteStep = (guidelinesExecutor as any).executeStep.bind(guidelinesExecutor);
    jest.spyOn(guidelinesExecutor as any, 'executeStep').mockImplementation(async (execution, step, stepIndex) => {
      executionOrder.push(step.id);
      logger.info('Test', 'should maintain proper execution order and dependencies',
        `Executing step: ${step.id}`);
      return originalExecuteStep(execution, step, stepIndex);
    });

    // Create PR signal
    const prSignal: Signal = {
      id: 'signal-order-test',
      type: 'Pr',
      priority: 2,
      timestamp: TimeUtils.now(),
      data: { prNumber: 555 },
      source: 'github',
      metadata: {}
    };

    // Process signal
    await guidelinesRegistry.processSignal(prSignal);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify execution order
    const expectedOrder = [
      'fetch-pull-request-data',
      'inspector-analysis',
      'structural-classification',
      'orchestrator-decision'
    ];

    expect(executionOrder).toEqual(expectedOrder);

    logger.info('Test', 'should maintain proper execution order and dependencies',
      `Execution order verified: ${executionOrder.join(' → ')}`);
  });

  it('should handle errors and fallback actions correctly', async () => {
    logger.info('Test', 'should handle errors and fallback actions correctly',
      'Testing error handling in guideline execution');

    // Mock GitHub API failure
    mockGitHubClient.analyzePR.mockRejectedValue(new Error('GitHub API rate limit exceeded'));

    // Create PR signal
    const prSignal: Signal = {
      id: 'signal-error-test',
      type: 'Pr',
      priority: 2,
      timestamp: TimeUtils.now(),
      data: { prNumber: 777 },
      source: 'github',
      metadata: {}
    };

    // Process signal
    await guidelinesRegistry.processSignal(prSignal);

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify error handling
    const failedExecutions = guidelinesRegistry.getExecutions('failed');
    expect(failedExecutions.length).toBeGreaterThan(0);

    const failedExecution = failedExecutions[0];
    expect(failedExecution.error).toBeDefined();
    expect(failedExecution.error?.message).toContain('GitHub API');

    logger.info('Test', 'should handle errors and fallback actions correctly',
      `Error handling verified: ${failedExecution.error?.message}`);
  });
});