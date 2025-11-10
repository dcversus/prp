/**
 * ♫ Workflow Engine Usage Example for @dcversus/prp
 *
 * This file demonstrates how to use the workflow engine for common orchestration scenarios.
 */

import { WorkflowIntegrationCoordinator } from './workflow-integration';
import { OrchestratorConfig } from './types';
import { Signal } from '../shared/types';

// Example configuration for the workflow engine
const exampleConfig: OrchestratorConfig = {
  model: 'gpt-4',
  maxTokens: 4000,
  temperature: 0.1,
  timeout: 300000, // 5 minutes
  maxConcurrentDecisions: 5,
  maxChainOfThoughtDepth: 10,
  contextPreservation: {
    enabled: true,
    maxContextSize: 10000,
    compressionStrategy: 'summarize',
    preserveElements: ['signals', 'decisions'],
    compressionRatio: 0.7,
    importantSignals: ['emergency', 'critical']
  },
  tools: [],
  agents: {
    maxActiveAgents: 10,
    defaultTimeout: 600000, // 10 minutes
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
    parallelExecution: true,
    loadBalancing: 'least_busy',
    healthCheckInterval: 30000 // 30 seconds
  },
  prompts: {
    systemPrompt: '',
    decisionMaking: '',
    chainOfThought: '',
    toolSelection: '',
    agentCoordination: '',
    checkpointEvaluation: '',
    errorHandling: '',
    contextUpdate: ''
  },
  decisionThresholds: {
    confidence: 0.8,
    tokenUsage: 8000,
    processingTime: 120000, // 2 minutes
    agentResponse: 180000, // 3 minutes
    errorRate: 0.1
  }
};

/**
 * Example 1: Starting a code review workflow from a PR signal
 */
export async function exampleCodeReviewWorkflow() {
  console.log('=== Example 1: Code Review Workflow ===');

  // Initialize the workflow integration coordinator
  const coordinator = new WorkflowIntegrationCoordinator(exampleConfig);
  await coordinator.initialize();

  // Create a signal for a PR being opened
  const prSignal: Signal = {
    id: 'pr_opened_001',
    type: 'pr_opened',
    source: 'github',
    timestamp: new Date(),
    data: {
      prNumber: 123,
      author: 'john.doe',
      title: 'Add user authentication feature',
      changes: [
        'src/auth/login.ts',
        'src/auth/register.ts',
        'src/components/LoginForm.tsx',
        'src/components/RegisterForm.tsx'
      ],
      repository: 'my-app',
      branch: 'feature/auth'
    },
    priority: 2,
    resolved: false,
    relatedSignals: []
  };

  // Handle the signal, which will trigger the code review workflow
  const triggeredExecutions = await coordinator.getSignalIntegration().handleSignal(prSignal);

  console.log(`Triggered ${triggeredExecutions.length} workflow executions:`);
  triggeredExecutions.forEach(execId => {
    console.log(`  - Execution: ${execId}`);
  });

  // Wait a bit and check the execution status
  setTimeout(() => {
    const execution = coordinator.getWorkflowEngine().getExecution(triggeredExecutions[0]);
    if (execution) {
      console.log(`Execution status: ${execution.status}`);
      console.log(`Current state: ${execution.currentState}`);
      console.log(`Tasks created: ${execution.tasks.length}`);
    }
  }, 2000);

  // Clean up
  await coordinator.shutdown();
}

/**
 * Example 2: Starting a feature implementation workflow
 */
export async function exampleFeatureImplementationWorkflow() {
  console.log('\n=== Example 2: Feature Implementation Workflow ===');

  const coordinator = new WorkflowIntegrationCoordinator(exampleConfig);
  await coordinator.initialize();

  // Create a signal for an approved feature
  const featureSignal: Signal = {
    id: 'feature_approved_001',
    type: 'feature_approved',
    source: 'project_management',
    timestamp: new Date(),
    data: {
      featureId: 'feat-user-dashboard',
      featureName: 'User Dashboard',
      approvedBy: 'product-manager',
      description: 'Create a comprehensive user dashboard with analytics and settings',
      requirements: [
        'Display user profile information',
        'Show usage analytics',
        'Provide settings management',
        'Include notification center'
      ],
      estimatedStoryPoints: 13,
      priority: 'high'
    },
    priority: 1,
    resolved: false,
    relatedSignals: []
  };

  const triggeredExecutions = await coordinator.getSignalIntegration().handleSignal(featureSignal);

  console.log(`Started feature implementation workflow: ${triggeredExecutions[0]}`);

  // Monitor the workflow progress
  const monitorProgress = () => {
    const execution = coordinator.getWorkflowEngine().getExecution(triggeredExecutions[0]);
    if (execution) {
      console.log(`Progress: ${execution.history.length} steps completed`);
      console.log(`Current state: ${execution.currentState}`);
      console.log(`Status: ${execution.status}`);

      if (execution.status === 'completed') {
        console.log('Feature implementation workflow completed successfully!');
        console.log(`Duration: ${execution.endTime!.getTime() - execution.startTime.getTime()}ms`);
      } else if (execution.status === 'failed') {
        console.error('Feature implementation workflow failed:', execution.error);
      } else {
        setTimeout(monitorProgress, 1000);
      }
    }
  };

  setTimeout(monitorProgress, 1000);

  // Clean up after a reasonable time
  setTimeout(() => {
    coordinator.shutdown();
  }, 10000);
}

/**
 * Example 3: Emergency bug fix workflow
 */
export async function exampleEmergencyBugFix() {
  console.log('\n=== Example 3: Emergency Bug Fix Workflow ===');

  const coordinator = new WorkflowIntegrationCoordinator(exampleConfig);
  await coordinator.initialize();

  // Create an emergency signal
  const emergencySignal: Signal = {
    id: 'emergency_001',
    type: 'emergency',
    source: 'monitoring',
    timestamp: new Date(),
    data: {
      emergencyType: 'critical_bug',
      severity: 'critical',
      affectedSystems: ['authentication-service', 'user-api'],
      description: 'Users unable to login due to authentication service failure',
      firstDetected: new Date(Date.now() - 300000), // 5 minutes ago
      impact: 'All users affected',
      errorRate: 100,
      errorCode: 'AUTH_001'
    },
    priority: 5, // Highest priority
    resolved: false,
    relatedSignals: []
  };

  const triggeredExecutions = await coordinator.getSignalIntegration().handleSignal(emergencySignal);

  console.log(`Emergency bug fix workflow started: ${triggeredExecutions[0]}`);

  // Emergency workflows should be processed immediately
  setTimeout(() => {
    const execution = coordinator.getWorkflowEngine().getExecution(triggeredExecutions[0]);
    if (execution) {
      console.log(`Emergency workflow status: ${execution.status}`);
      console.log(`Priority processing: ${execution.metadata.triggerData?.emergencyType}`);
    }
  }, 500);

  await coordinator.shutdown();
}

/**
 * Example 4: Custom workflow registration
 */
export async function exampleCustomWorkflow() {
  console.log('\n=== Example 4: Custom Workflow Registration ===');

  const coordinator = new WorkflowIntegrationCoordinator(exampleConfig);
  await coordinator.initialize();

  // Register a custom workflow
  const customWorkflow = {
    id: 'custom_notification_workflow',
    name: 'Custom Notification Workflow',
    description: 'Sends notifications to multiple channels',
    version: '1.0.0',
    category: 'custom' as const,
    triggers: [
      {
        id: 'manual_trigger',
        type: 'manual' as const,
        condition: 'true',
        priority: 1,
        enabled: true
      }
    ],
    states: [
      {
        id: 'start',
        name: 'Start',
        description: 'Begin notification process',
        type: 'start' as const
      },
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send email notification',
        type: 'task' as const,
        agentRole: 'robo-developer' as const,
        taskDescription: 'Send email notification to stakeholders',
        taskInstructions: '1. Compose email message\n2. Send to recipients\n3. Log delivery status'
      },
      {
        id: 'send_slack',
        name: 'Send Slack',
        description: 'Send Slack notification',
        type: 'task' as const,
        agentRole: 'robo-developer' as const,
        taskDescription: 'Send Slack notification to team',
        taskInstructions: '1. Format Slack message\n2. Post to channel\n3. Confirm delivery'
      },
      {
        id: 'complete',
        name: 'Complete',
        description: 'Notification process completed',
        type: 'end' as const
      }
    ],
    transitions: [
      { id: 'start_to_email', from: 'start', to: 'send_email', priority: 1, enabled: true },
      { id: 'email_to_slack', from: 'send_email', to: 'send_slack', priority: 1, enabled: true },
      { id: 'slack_to_complete', from: 'send_slack', to: 'complete', priority: 1, enabled: true }
    ],
    variables: [
      {
        name: 'message',
        type: 'string' as const,
        required: true,
        description: 'Notification message content'
      },
      {
        name: 'recipients',
        type: 'array' as const,
        required: true,
        description: 'List of notification recipients'
      }
    ],
    metadata: {
      createdBy: 'custom-user',
      createdAt: new Date(),
      tags: ['notification', 'communication']
    }
  };

  // Register the custom workflow
  coordinator.getWorkflowEngine().registerWorkflow(customWorkflow);
  console.log('Custom workflow registered successfully');

  // Start the custom workflow
  const context = {
    globalVariables: {
      message: 'Deployment completed successfully for version 2.1.0',
      recipients: ['team@company.com', '#deployments']
    }
  };

  const executionId = await coordinator.getWorkflowEngine().startWorkflow(
    customWorkflow.id,
    context,
    { triggeredBy: 'example' }
  );

  console.log(`Custom workflow started: ${executionId}`);

  // Monitor progress
  setTimeout(() => {
    const execution = coordinator.getWorkflowEngine().getExecution(executionId);
    if (execution) {
      console.log(`Custom workflow status: ${execution.status}`);
      console.log(`Current state: ${execution.currentState}`);
    }
  }, 1000);

  await coordinator.shutdown();
}

/**
 * Example 5: Workflow statistics and monitoring
 */
export async function exampleWorkflowMonitoring() {
  console.log('\n=== Example 5: Workflow Monitoring ===');

  const coordinator = new WorkflowIntegrationCoordinator(exampleConfig);
  await coordinator.initialize();

  // Start multiple workflows to demonstrate monitoring
  const workflows = ['code_review', 'testing', 'deployment'];
  const executionIds: string[] = [];

  for (const workflowId of workflows) {
    const executionId = await coordinator.getWorkflowEngine().startWorkflow(
      workflowId,
      { globalVariables: { example: true } },
      { batch: 'monitoring_example' }
    );
    executionIds.push(executionId);
  }

  console.log(`Started ${executionIds.length} workflows for monitoring`);

  // Monitor workflow statistics
  const monitorStats = () => {
    const stats = coordinator.getWorkflowEngine().getStatistics();
    const executions = coordinator.getWorkflowEngine().getExecutions();

    console.log('\n=== Workflow Statistics ===');
    console.log(`Total workflows: ${stats.totalWorkflows}`);
    console.log(`Total executions: ${stats.totalExecutions}`);
    console.log(`Running executions: ${stats.runningExecutions}`);
    console.log(`Completed executions: ${stats.completedExecutions}`);
    console.log(`Failed executions: ${stats.failedExecutions}`);
    console.log(`Average execution time: ${stats.averageExecutionTime}ms`);

    console.log('\n=== Execution Details ===');
    executions.forEach(exec => {
      console.log(`${exec.id}: ${exec.status} (state: ${exec.currentState})`);
    });

    // Check if all workflows are completed
    if (stats.runningExecutions === 0) {
      console.log('\nAll workflows completed!');
      coordinator.shutdown();
    } else {
      setTimeout(monitorStats, 2000);
    }
  };

  setTimeout(monitorStats, 1000);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running Workflow Engine Examples\n');

  try {
    await exampleCodeReviewWorkflow();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await exampleFeatureImplementationWorkflow();
    await new Promise(resolve => setTimeout(resolve, 12000));

    await exampleEmergencyBugFix();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await exampleCustomWorkflow();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await exampleWorkflowMonitoring();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Export examples for individual testing
export default {
  exampleCodeReviewWorkflow,
  exampleFeatureImplementationWorkflow,
  exampleEmergencyBugFix,
  exampleCustomWorkflow,
  exampleWorkflowMonitoring,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}