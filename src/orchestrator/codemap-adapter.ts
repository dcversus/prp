/**
 * ♫ Codemap Orchestrator Adapter for @dcversus/prp
 *
 * Converts tree-sitter AST codemap data to orchestrator workflow format.
 * Extracts agent-relevant information from codebase and maps code structure
 * to agent capabilities with dependency analysis for coordination.
 */

import { createLayerLogger, HashUtils } from '../shared';
import {
  FunctionInfo,
  ClassInfo,
  ImportInfo,
  ExportInfo,
  CrossFileReference,
  Position,
} from '../scanner/types';

import type { EventBus } from '../shared/events';
import type {
  CodemapData,
  CodeAnalysisResult,
  Dependency} from '../scanner/types';


const logger = createLayerLogger('orchestrator');

/**
 * Agent capability definitions
 */
export interface AgentCapability {
  id: string;
  name: string;
  fileTypes: string[];
  patterns: string[];
  functions: string[];
  classes: string[];
  dependencies: string[];
  expertise: string[];
}

export interface AgentWorkload {
  agentId: string;
  agentType: string;
  assignedFiles: string[];
  estimatedComplexity: number;
  dependencies: string[];
  coordinationRequirements: string[];
  currentCapacity: number;
  maxCapacity: number;
}

export interface OrchestrationTask {
  id: string;
  type: 'analysis' | 'development' | 'testing' | 'documentation' | 'deployment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  agentType: string;
  files: string[];
  requirements: string[];
  dependencies: string[];
  estimatedDuration: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'blocked';
  assignedAgent?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agentType: string;
  inputFiles: string[];
  outputFiles: string[];
  dependencies: string[];
  estimatedDuration: number;
  parallelizable: boolean;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed';
}

export interface OrchestrationPlan {
  id: string;
  createdAt: Date;
  rootPath: string;
  tasks: OrchestrationTask[];
  workflow: WorkflowStep[];
  agentAssignments: Map<string, AgentWorkload>;
  dependencies: Map<string, string[]>;
  criticalPath: string[];
  estimatedTotalDuration: number;
  parallelizationOpportunities: string[];
}

export interface AgentRelevantInfo {
  agentType: string;
  relevantFiles: Array<{
    path: string;
    relevance: number;
    complexity: number;
    signals: string[];
    issues: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
  }>;
  dependencies: Array<{
    source: string;
    target: string;
    type: string;
  }>;
  coordinationNeeds: Array<{
    type: 'shared_file' | 'dependency' | 'sequence' | 'resource';
    details: string;
    agents: string[];
  }>;
  estimatedWorkload: {
    files: number;
    complexity: number;
    duration: number;
  };
}

export interface RealTimeUpdate {
  timestamp: Date;
  type: 'file_added' | 'file_modified' | 'file_deleted' | 'dependency_changed' | 'signal_detected';
  filePath: string;
  affectedAgents: string[];
  impact: {
    workload: number;
    dependencies: string[];
    coordination: string[];
  };
}

/**
 * Codemap Orchestrator Adapter
 *
 * Converts codemap data to orchestrator format with:
 * - Agent capability mapping
 * - Dependency analysis for coordination
 * - Workflow generation and optimization
 * - Real-time update handling
 */
export class CodemapOrchestratorAdapter {
  private readonly eventBus: EventBus;
  private readonly agentCapabilities = new Map<string, AgentCapability>();
  private readonly orchestrationPlans = new Map<string, OrchestrationPlan>();
  private realTimeUpdates: RealTimeUpdate[] = [];
  private readonly maxUpdatesHistory = 1000;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeAgentCapabilities();
  }

  /**
   * Convert codemap to orchestrator workflow format
   */
  async convertCodemapForOrchestration(
    codemapData: CodemapData,
    options: {
      includeRealTimeUpdates?: boolean;
      optimizeForParallelExecution?: boolean;
      agentCapacityLimits?: Record<string, number>;
    } = {},
  ): Promise<OrchestrationPlan> {
    const startTime = Date.now();
    const planId = HashUtils.generateId();

    logger.info('CodemapOrchestratorAdapter', 'Converting codemap for orchestration', {
      fileCount: codemapData.files.size,
      options,
    });

    try {
      // Analyze agent-relevant information
      const agentInfo = await this.analyzeAgentRelevantInformation(codemapData);

      // Generate tasks based on codemap analysis
      const tasks = await this.generateOrchestrationTasks(codemapData, agentInfo);

      // Create workflow steps
      const workflow = await this.createWorkflowSteps(tasks, codemapData, options);

      // Calculate agent assignments
      const agentAssignments = await this.calculateAgentAssignments(tasks, agentInfo, options);

      // Analyze dependencies
      const dependencies = this.analyzeDependencies(codemapData);

      // Find critical path
      const criticalPath = this.calculateCriticalPath(workflow, dependencies);

      // Calculate parallelization opportunities
      const parallelizationOpportunities = options.optimizeForParallelExecution
        ? this.findParallelizationOpportunities(workflow, dependencies)
        : [];

      // Estimate total duration
      const estimatedTotalDuration = this.calculateTotalDuration(workflow, criticalPath);

      const plan: OrchestrationPlan = {
        id: planId,
        createdAt: new Date(),
        rootPath: codemapData.rootPath,
        tasks,
        workflow,
        agentAssignments,
        dependencies,
        criticalPath,
        estimatedTotalDuration,
        parallelizationOpportunities,
      };

      // Cache the plan
      this.orchestrationPlans.set(planId, plan);

      const conversionTime = Date.now() - startTime;
      logger.info('CodemapOrchestratorAdapter', 'Orchestration plan created', {
        planId,
        taskCount: tasks.length,
        workflowSteps: workflow.length,
        agentAssignments: agentAssignments.size,
        estimatedDuration: estimatedTotalDuration,
        conversionTime: `${conversionTime}ms`,
      });

      // Emit orchestration plan created event
      this.eventBus.publishToChannel('orchestrator', {
        id: HashUtils.generateId(),
        type: 'orchestration_plan_created',
        timestamp: new Date(),
        source: 'codemap-orchestrator-adapter',
        data: {
          planId,
          metrics: {
            taskCount: tasks.length,
            workflowSteps: workflow.length,
            agentAssignments: agentAssignments.size,
            estimatedDuration: estimatedTotalDuration,
          },
        },
        metadata: { priority: 'medium' },
      });

      return plan;
    } catch (error) {
      logger.error(
        'CodemapOrchestratorAdapter',
        'Failed to create orchestration plan',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get agent-relevant information from codemap
   */
  async getAgentRelevantInfo(
    codemapData: CodemapData,
    agentType: string,
  ): Promise<AgentRelevantInfo> {
    const capability = this.agentCapabilities.get(agentType);
    if (!capability) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    logger.debug('CodemapOrchestratorAdapter', 'Extracting agent-relevant information', {
      agentType,
      fileCount: codemapData.files.size,
    });

    // Find relevant files based on agent capability
    const relevantFiles = Array.from(codemapData.files.entries())
      .map(([filePath, analysis]) => ({
        path: filePath,
        relevance: this.calculateRelevance(filePath, analysis, capability),
        complexity: analysis.complexity.cyclomaticComplexity,
        signals: this.extractAgentSignals(analysis, agentType),
        issues: this.extractAgentIssues(analysis, agentType),
      }))
      .filter((file) => file.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);

    // Extract dependencies relevant to agent
    const dependencies = Array.from(codemapData.files.entries()).flatMap(([filePath, analysis]) =>
      analysis.dependencies
        .filter((dep) => this.isRelevantDependency(dep, capability))
        .map((dep) => ({
          source: filePath,
          target: dep.module,
          type: dep.type,
        })),
    );

    // Identify coordination needs
    const coordinationNeeds = this.identifyCoordinationNeeds(
      relevantFiles.map((f) => f.path),
      codemapData,
      agentType,
    );

    // Estimate workload
    const estimatedWorkload = {
      files: relevantFiles.length,
      complexity: relevantFiles.reduce((sum, file) => sum + file.complexity, 0),
      duration: this.estimateWorkloadDuration(relevantFiles, capability),
    };

    return {
      agentType,
      relevantFiles,
      dependencies,
      coordinationNeeds,
      estimatedWorkload,
    };
  }

  /**
   * Handle real-time codemap updates
   */
  async handleCodemapUpdate(
    updateType:
      | 'file_added'
      | 'file_modified'
      | 'file_deleted'
      | 'dependency_changed'
      | 'signal_detected',
    filePath: string,
    affectedPlans: string[] = [],
  ): Promise<RealTimeUpdate> {
    const update: RealTimeUpdate = {
      timestamp: new Date(),
      type: updateType,
      filePath,
      affectedAgents: [],
      impact: {
        workload: 0,
        dependencies: [],
        coordination: [],
      },
    };

    // Determine affected agents based on file type and content
    for (const [agentType, capability] of Array.from(this.agentCapabilities.entries())) {
      if (this.isAgentAffectedByUpdate(updateType, filePath, capability)) {
        update.affectedAgents.push(agentType);
      }
    }

    // Calculate impact on orchestration plans
    for (const planId of affectedPlans) {
      const plan = this.orchestrationPlans.get(planId);
      if (plan) {
        const impact = this.calculatePlanImpact(update, plan);
        update.impact.workload += impact.workload;
        update.impact.dependencies.push(...impact.dependencies);
        update.impact.coordination.push(...impact.coordination);
      }
    }

    // Add to updates history
    this.realTimeUpdates.push(update);
    if (this.realTimeUpdates.length > this.maxUpdatesHistory) {
      this.realTimeUpdates = this.realTimeUpdates.slice(-this.maxUpdatesHistory);
    }

    logger.debug('CodemapOrchestratorAdapter', 'Real-time update processed', {
      updateType,
      filePath,
      affectedAgents: update.affectedAgents.length,
      impactScore: update.impact.workload,
    });

    // Emit update event
    this.eventBus.publishToChannel('orchestrator', {
      id: HashUtils.generateId(),
      type: 'codemap_update',
      timestamp: new Date(),
      source: 'codemap-orchestrator-adapter',
      data: {
        update,
        affectedPlans,
      },
      metadata: { priority: update.affectedAgents.length > 0 ? 'medium' : 'low' },
    });

    return update;
  }

  /**
   * Get orchestration plan by ID
   */
  getOrchestrationPlan(planId: string): OrchestrationPlan | null {
    return this.orchestrationPlans.get(planId) ?? null;
  }

  /**
   * Get real-time updates
   */
  getRealTimeUpdates(since?: Date): RealTimeUpdate[] {
    if (!since) {
      return [...this.realTimeUpdates];
    }

    return this.realTimeUpdates.filter((update) => update.timestamp >= since);
  }

  /**
   * Update agent capabilities
   */
  updateAgentCapabilities(agentType: string, capabilities: Partial<AgentCapability>): void {
    const existing = this.agentCapabilities.get(agentType);
    if (existing) {
      this.agentCapabilities.set(agentType, { ...existing, ...capabilities });
      logger.info('CodemapOrchestratorAdapter', 'Agent capabilities updated', { agentType });
    } else {
      this.agentCapabilities.set(agentType, {
        id: HashUtils.generateId(),
        name: agentType,
        fileTypes: [],
        patterns: [],
        functions: [],
        classes: [],
        dependencies: [],
        expertise: [],
        ...capabilities,
      });
    }
  }

  // Private Methods

  /**
   * Initialize agent capabilities
   */
  private initializeAgentCapabilities(): void {
    // Robo-Developer capabilities
    this.agentCapabilities.set('robo-developer', {
      id: 'dev-001',
      name: 'Robo-Developer',
      fileTypes: ['ts', 'tsx', 'js', 'jsx', 'json'],
      patterns: ['function', 'class', 'interface', 'type', 'component'],
      functions: ['create', 'update', 'delete', 'implement', 'refactor'],
      classes: ['Service', 'Component', 'Controller', 'Repository', 'Utility'],
      dependencies: ['implementation', 'testing', 'documentation'],
      expertise: ['typescript', 'react', 'nodejs', 'testing', 'code-quality'],
    });

    // Robo-QA capabilities
    this.agentCapabilities.set('robo-quality-control', {
      id: 'qa-001',
      name: 'Robo-Quality Control',
      fileTypes: ['test.ts', 'test.tsx', 'spec.ts', 'spec.tsx', 'js', 'jsx'],
      patterns: ['test', 'spec', 'describe', 'it', 'expect', 'mock'],
      functions: ['test', 'assert', 'verify', 'validate', 'measure'],
      classes: ['TestCase', 'TestSuite', 'Mock', 'Stub'],
      dependencies: ['code-under-test', 'test-frameworks', 'coverage-reports'],
      expertise: ['testing', 'quality-assurance', 'performance-testing', 'automation'],
    });

    // Robo-UX/UI Designer capabilities
    this.agentCapabilities.set('robo-ux-ui-designer', {
      id: 'ux-001',
      name: 'Robo-UX/UI Designer',
      fileTypes: ['tsx', 'jsx', 'css', 'scss', 'md', 'png', 'svg'],
      patterns: ['component', 'layout', 'style', 'theme', 'design'],
      functions: ['design', 'prototype', 'mockup', 'wireframe', 'usability'],
      classes: ['Component', 'Layout', 'Theme', 'Style'],
      dependencies: ['design-system', 'assets', 'components'],
      expertise: ['ui-design', 'ux-research', 'prototyping', 'accessibility'],
    });

    // Robo-DevOps/SRE capabilities
    this.agentCapabilities.set('robo-devops-sre', {
      id: 'devops-001',
      name: 'Robo-DevOps/SRE',
      fileTypes: ['yml', 'yaml', 'json', 'dockerfile', 'sh', 'md'],
      patterns: ['deploy', 'build', 'ci', 'cd', 'infra', 'monitor'],
      functions: ['deploy', 'monitor', 'scale', 'backup', 'secure'],
      classes: ['Pipeline', 'Deployment', 'Service', 'Infrastructure'],
      dependencies: ['infrastructure', 'monitoring', 'security'],
      expertise: ['devops', 'sre', 'cloud', 'monitoring', 'automation'],
    });

    // Robo-System Analyst capabilities
    this.agentCapabilities.set('robo-system-analyst', {
      id: 'analyst-001',
      name: 'Robo-System Analyst',
      fileTypes: ['md', 'json', 'yml', 'yaml', 'txt'],
      patterns: ['requirement', 'specification', 'analysis', 'documentation', 'plan'],
      functions: ['analyze', 'specify', 'document', 'plan', 'validate'],
      classes: ['Requirement', 'Specification', 'Analysis', 'Plan'],
      dependencies: ['stakeholders', 'requirements', 'documentation'],
      expertise: ['system-analysis', 'requirements', 'documentation', 'planning'],
    });
  }

  /**
   * Analyze agent-relevant information from codemap
   */
  private async analyzeAgentRelevantInformation(
    codemapData: CodemapData,
  ): Promise<Map<string, AgentRelevantInfo>> {
    const agentInfo = new Map<string, AgentRelevantInfo>();

    for (const agentType of Array.from(this.agentCapabilities.keys())) {
      const info = await this.getAgentRelevantInfo(codemapData, agentType);
      agentInfo.set(agentType, info);
    }

    return agentInfo;
  }

  /**
   * Generate orchestration tasks from codemap analysis
   */
  private async generateOrchestrationTasks(
    codemapData: CodemapData,
    agentInfo: Map<string, AgentRelevantInfo>,
  ): Promise<OrchestrationTask[]> {
    const tasks: OrchestrationTask[] = [];

    for (const [agentType, info] of Array.from(agentInfo.entries())) {
      // Group files by complexity and relevance
      const highRelevanceFiles = info.relevantFiles.filter((f) => f.relevance > 0.7);
      const mediumRelevanceFiles = info.relevantFiles.filter(
        (f) => f.relevance > 0.3 && f.relevance <= 0.7,
      );

      // Create high-priority tasks for high relevance files
      if (highRelevanceFiles.length > 0) {
        tasks.push({
          id: HashUtils.generateId(),
          type: this.getTaskType(agentType),
          priority: 'high',
          agentType,
          files: highRelevanceFiles.map((f) => f.path),
          requirements: this.extractRequirements(highRelevanceFiles),
          dependencies: info.dependencies.map((d) => d.target),
          estimatedDuration: this.estimateTaskDuration(highRelevanceFiles),
          status: 'pending',
        });
      }

      // Create medium-priority tasks for medium relevance files
      if (mediumRelevanceFiles.length > 0) {
        tasks.push({
          id: HashUtils.generateId(),
          type: this.getTaskType(agentType),
          priority: 'medium',
          agentType,
          files: mediumRelevanceFiles.map((f) => f.path),
          requirements: this.extractRequirements(mediumRelevanceFiles),
          dependencies: info.dependencies.map((d) => d.target),
          estimatedDuration: this.estimateTaskDuration(mediumRelevanceFiles),
          status: 'pending',
        });
      }
    }

    return tasks;
  }

  /**
   * Create workflow steps from tasks
   */
  private async createWorkflowSteps(
    tasks: OrchestrationTask[],
    codemapData: CodemapData,
    options: any,
  ): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];

    // Analysis phase
    const analysisTasks = tasks.filter((t) => t.agentType === 'robo-system-analyst');
    if (analysisTasks.length > 0) {
      steps.push({
        id: HashUtils.generateId(),
        name: 'System Analysis',
        description: 'Analyze requirements and specifications',
        agentType: 'robo-system-analyst',
        inputFiles: analysisTasks.flatMap((t) => t.files),
        outputFiles: [],
        dependencies: [],
        estimatedDuration: Math.max(...analysisTasks.map((t) => t.estimatedDuration)),
        parallelizable: true,
        status: 'pending',
      });
    }

    // Design phase
    const designTasks = tasks.filter((t) => t.agentType === 'robo-ux-ui-designer');
    if (designTasks.length > 0) {
      steps.push({
        id: HashUtils.generateId(),
        name: 'UI/UX Design',
        description: 'Design user interfaces and experiences',
        agentType: 'robo-ux-ui-designer',
        inputFiles: designTasks.flatMap((t) => t.files),
        outputFiles: [],
        dependencies: steps.length > 0 ? [steps[steps.length - 1]!.id] : [],
        estimatedDuration: Math.max(...designTasks.map((t) => t.estimatedDuration)),
        parallelizable: true,
        status: 'pending',
      });
    }

    // Development phase
    const devTasks = tasks.filter((t) => t.agentType === 'robo-developer');
    if (devTasks.length > 0) {
      steps.push({
        id: HashUtils.generateId(),
        name: 'Development',
        description: 'Implement features and functionality',
        agentType: 'robo-developer',
        inputFiles: devTasks.flatMap((t) => t.files),
        outputFiles: [],
        dependencies: steps.length > 0 ? [steps[steps.length - 1]!.id] : [],
        estimatedDuration: Math.max(...devTasks.map((t) => t.estimatedDuration)),
        parallelizable: options.optimizeForParallelExecution,
        status: 'pending',
      });
    }

    // Testing phase
    const qaTasks = tasks.filter((t) => t.agentType === 'robo-quality-control');
    if (qaTasks.length > 0) {
      steps.push({
        id: HashUtils.generateId(),
        name: 'Quality Assurance',
        description: 'Test and validate implementation',
        agentType: 'robo-quality-control',
        inputFiles: qaTasks.flatMap((t) => t.files),
        outputFiles: [],
        dependencies: steps.length > 0 ? [steps[steps.length - 1]!.id] : [],
        estimatedDuration: Math.max(...qaTasks.map((t) => t.estimatedDuration)),
        parallelizable: true,
        status: 'pending',
      });
    }

    // Deployment phase
    const devOpsTasks = tasks.filter((t) => t.agentType === 'robo-devops-sre');
    if (devOpsTasks.length > 0) {
      steps.push({
        id: HashUtils.generateId(),
        name: 'Deployment',
        description: 'Deploy and monitor application',
        agentType: 'robo-devops-sre',
        inputFiles: devOpsTasks.flatMap((t) => t.files),
        outputFiles: [],
        dependencies: steps.length > 0 ? [steps[steps.length - 1]!.id] : [],
        estimatedDuration: Math.max(...devOpsTasks.map((t) => t.estimatedDuration)),
        parallelizable: false,
        status: 'pending',
      });
    }

    return steps;
  }

  /**
   * Calculate agent assignments
   */
  private async calculateAgentAssignments(
    tasks: OrchestrationTask[],
    agentInfo: Map<string, AgentRelevantInfo>,
    options: any,
  ): Promise<Map<string, AgentWorkload>> {
    const assignments = new Map<string, AgentWorkload>();

    for (const [agentType, info] of Array.from(agentInfo.entries())) {
      const agentTasks = tasks.filter((t) => t.agentType === agentType);
      const maxCapacity = options.agentCapacityLimits?.[agentType] || 100;

      assignments.set(agentType, {
        agentId: agentType,
        agentType,
        assignedFiles: info.relevantFiles.map((f) => f.path),
        estimatedComplexity: info.estimatedWorkload.complexity,
        dependencies: info.dependencies.map((d) => d.target),
        coordinationRequirements: info.coordinationNeeds.map((c) => c.type),
        currentCapacity: 0,
        maxCapacity,
      });
    }

    return assignments;
  }

  /**
   * Analyze dependencies from codemap
   */
  private analyzeDependencies(codemapData: CodemapData): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const [filePath, analysis] of Array.from(codemapData.files.entries())) {
      const deps = analysis.dependencies.filter((dep) => !dep.isExternal).map((dep) => dep.module);
      dependencies.set(filePath, deps);
    }

    return dependencies;
  }

  /**
   * Calculate critical path in workflow
   */
  private calculateCriticalPath(
    workflow: WorkflowStep[],
    dependencies: Map<string, string[]>,
  ): string[] {
    // Simplified critical path calculation
    // In production, this would be more sophisticated
    return workflow.map((step) => step.id);
  }

  /**
   * Find parallelization opportunities
   */
  private findParallelizationOpportunities(
    workflow: WorkflowStep[],
    dependencies: Map<string, string[]>,
  ): string[] {
    return workflow.filter((step) => step.parallelizable).map((step) => step.id);
  }

  /**
   * Calculate total duration estimate
   */
  private calculateTotalDuration(workflow: WorkflowStep[], criticalPath: string[]): number {
    // Sum durations of critical path steps
    const criticalSteps = workflow.filter((step) => criticalPath.includes(step.id));
    return criticalSteps.reduce((total, step) => total + step.estimatedDuration, 0);
  }

  // Helper methods for analysis and calculations

  private calculateRelevance(
    filePath: string,
    analysis: CodeAnalysisResult,
    capability: AgentCapability,
  ): number {
    let relevance = 0;

    // File type relevance
    const ext = filePath.split('.').pop();
    if (ext && capability.fileTypes.includes(ext)) {
      relevance += 0.3;
    }

    // Pattern relevance
    for (const pattern of capability.patterns) {
      if (filePath.includes(pattern) || analysis.language.includes(pattern)) {
        relevance += 0.2;
      }
    }

    // Function relevance
    for (const func of analysis.structure.functions) {
      for (const funcPattern of capability.functions) {
        if (func.name.includes(funcPattern)) {
          relevance += 0.1;
        }
      }
    }

    // Class relevance
    for (const cls of analysis.structure.classes) {
      for (const classPattern of capability.classes) {
        if (cls.name.includes(classPattern)) {
          relevance += 0.1;
        }
      }
    }

    return Math.min(relevance, 1.0);
  }

  private extractAgentSignals(analysis: CodeAnalysisResult, agentType: string): string[] {
    // Extract signals relevant to specific agent type
    const signals: string[] = [];

    // This would analyze the actual content for signals
    // For now, return empty array
    return signals;
  }

  private extractAgentIssues(
    analysis: CodeAnalysisResult,
    agentType: string,
  ): Array<{
    type: string;
    severity: string;
    description: string;
  }> {
    // Extract issues relevant to specific agent type
    return analysis.issues.map((issue) => ({
      type: issue.type,
      severity: issue.severity,
      description: issue.message,
    }));
  }

  private isRelevantDependency(dep: Dependency, capability: AgentCapability): boolean {
    return capability.dependencies.includes(dep.type);
  }

  private identifyCoordinationNeeds(
    files: string[],
    codemapData: CodemapData,
    agentType: string,
  ): Array<{
    type: 'shared_file' | 'dependency' | 'sequence' | 'resource';
    details: string;
    agents: string[];
  }> {
    // Identify where coordination is needed between agents
    const coordinationNeeds: any[] = [];

    // Check for shared files
    for (const file of files) {
      const analysis = codemapData.files.get(file);
      if (analysis && analysis.dependencies.length > 0) {
        coordinationNeeds.push({
          type: 'dependency' as const,
          details: `File ${file} has external dependencies`,
          agents: [agentType],
        });
      }
    }

    return coordinationNeeds;
  }

  private estimateWorkloadDuration(files: any[], capability: AgentCapability): number {
    // Estimate duration based on file complexity and agent expertise
    const avgComplexity = files.reduce((sum, file) => sum + file.complexity, 0) / files.length;
    const expertiseMultiplier = capability.expertise.length > 0 ? 0.8 : 1.2; // Expert agents are faster

    return Math.round(avgComplexity * expertiseMultiplier * 10); // Base 10ms per complexity unit
  }

  private isAgentAffectedByUpdate(
    updateType: string,
    filePath: string,
    capability: AgentCapability,
  ): boolean {
    const ext = filePath.split('.').pop();
    return ext ? capability.fileTypes.includes(ext) : false;
  }

  private calculatePlanImpact(
    update: RealTimeUpdate,
    plan: OrchestrationPlan,
  ): {
    workload: number;
    dependencies: string[];
    coordination: string[];
  } {
    return {
      workload: 1, // Simplified impact calculation
      dependencies: [],
      coordination: [],
    };
  }

  private getTaskType(
    agentType: string,
  ): 'analysis' | 'development' | 'testing' | 'documentation' | 'deployment' {
    switch (agentType) {
      case 'robo-system-analyst':
        return 'analysis';
      case 'robo-developer':
        return 'development';
      case 'robo-quality-control':
        return 'testing';
      case 'robo-ux-ui-designer':
        return 'documentation';
      case 'robo-devops-sre':
        return 'deployment';
      default:
        return 'development';
    }
  }

  private extractRequirements(files: any[]): string[] {
    // Extract requirements from files
    return files.map((file) => `Process ${file.path}`);
  }

  private estimateTaskDuration(files: any[]): number {
    const avgComplexity = files.reduce((sum, file) => sum + file.complexity, 0) / files.length;
    return Math.round(avgComplexity * 15); // 15ms per complexity unit
  }
}
