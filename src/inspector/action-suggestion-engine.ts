/**
 * ♫ Action Suggestion Engine for @dcversus/prp Inspector
 *
 * Intelligent action suggestion system with role-specific recommendations,
 * capability matching, and success prediction.
 */

import { EventEmitter } from 'events';
import {
  EnhancedSignalClassification,
  ProcessingContext,
  AgentStatusInfo,
  Recommendation
} from './types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

/**
 * Action suggestion types
 */
enum ActionType {
  ANALYZE = 'analyze',
  IMPLEMENT = 'implement',
  TEST = 'test',
  REVIEW = 'review',
  DEPLOY = 'deploy',
  COORDINATE = 'coordinate',
  RESEARCH = 'research',
  DOCUMENT = 'document',
  OPTIMIZE = 'optimize',
  DEBUG = 'debug'
}

/**
 * Priority levels
 */
enum ActionPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  BACKGROUND = 'background'
}

/**
 * Agent capability requirements
 */
interface CapabilityRequirements {
  skills: string[];
  tools: string[];
  permissions: string[];
  minComplexity: number;
  maxComplexity: number;
  estimatedTime: number; // minutes
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Action suggestion with enhanced metadata
 */
interface EnhancedActionSuggestion extends Recommendation {
  id: string;
  type: ActionType;
  category: string;
  targetAgent: string;
  capabilities: CapabilityRequirements;
  prerequisites: string[];
  dependencies: string[];
  expectedOutcome: string;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };
  successMetrics: string[];
  alternatives: string[];
  context: {
    signalId: string;
    agentWorkload: number;
    systemState: string;
    priority: ActionPriority;
  };
  metadata: {
    confidence: number;
    source: 'template' | 'llm' | 'historical' | 'rule-based';
    reasoning: string;
    estimatedCost: number;
    historicalSuccessRate: number;
  };
}

/**
 * Historical action data
 */
interface HistoricalAction {
  signalType: string;
  action: string;
  agentRole: string;
  success: boolean;
  duration: number;
  outcome: string;
  factors: string[];
}

/**
 * Action template for common scenarios
 */
interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  applicableSignals: string[];
  targetRoles: string[];
  action: string;
  requirements: CapabilityRequirements;
  expectedOutcome: string;
  successRate: number;
  priority: ActionPriority;
}

interface LLMSuggestionResponse {
  suggestions: Array<{
    action: string;
    target: string;
    reasoning: string;
    estimatedTime: number;
    priority: string;
  }>;
}

/**
 * Action Suggestion Engine
 */
export class ActionSuggestionEngine extends EventEmitter {
  private historicalData: Map<string, HistoricalAction[]> = new Map();
  private actionTemplates: Map<string, ActionTemplate> = new Map();
  private successPredictor: SuccessPredictor;
  private capabilityMatcher: CapabilityMatcher;

  constructor() {
    super();
    this.successPredictor = new SuccessPredictor();
    this.capabilityMatcher = new CapabilityMatcher();
    this.initializeActionTemplates();
    this.loadHistoricalData();

    // Mark as intentionally unused for future implementation
  }

  /**
   * Generate intelligent action suggestions
   */
  async generateSuggestions(
    classification: EnhancedSignalClassification,
    context: ProcessingContext
  ): Promise<EnhancedActionSuggestion[]> {
    const startTime = Date.now();

    try {
      logger.info('ActionSuggestionEngine', `Generating suggestions for signal ${classification.signalId}`);

      // Step 1: Analyze action requirements
      const actionRequirements = await this.analyzeActionRequirements(classification, context);

      // Step 2: Generate base suggestions from templates
      const templateSuggestions = await this.generateFromTemplates(classification, actionRequirements);

      // Step 3: Generate contextual suggestions using LLM
      const contextualSuggestions = await this.generateContextualSuggestions(
        classification,
        context,
        actionRequirements
      );

      // Step 4: Generate suggestions based on historical patterns
      const historicalSuggestions = await this.generateFromHistory(classification, context);

      // Step 5: Combine and prioritize suggestions
      const combinedSuggestions = [
        ...templateSuggestions,
        ...contextualSuggestions,
        ...historicalSuggestions
      ];

      // Step 6: Tailor suggestions to specific agents
      const tailoredSuggestions = await this.tailorToAgents(combinedSuggestions, context);

      // Step 7: Predict success rates and validate feasibility
      const validatedSuggestions = await this.validateAndPredict(tailoredSuggestions, context);

      // Step 8: Rank and filter final suggestions
      const finalSuggestions = this.rankAndFilter(validatedSuggestions, classification);

      const processingTime = Date.now() - startTime;

      logger.info('ActionSuggestionEngine', `Generated ${finalSuggestions.length} suggestions`, {
        processingTime,
        averageConfidence: finalSuggestions.reduce((sum, s) => sum + s.metadata.confidence, 0) / finalSuggestions.length
      });

      this.emit('suggestions_generated', {
        signalId: classification.signalId,
        suggestions: finalSuggestions,
        processingTime
      });

      return finalSuggestions;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ActionSuggestionEngine', 'Failed to generate suggestions', error instanceof Error ? error : new Error(errorMessage));

      return this.createFallbackSuggestions(classification);
    }
  }

  /**
   * Analyze action requirements based on classification
   */
  private async analyzeActionRequirements(
    classification: EnhancedSignalClassification,
    context: ProcessingContext
  ): Promise<ActionRequirements> {
    const immediateActions = this.identifyImmediateActions();
    const backgroundTasks = this.identifyBackgroundTasks();
    const dependencies = this.identifyDependencies(classification);
    const constraints = this.identifyConstraints(classification, context);

    return {
      immediateActions,
      backgroundTasks,
      dependencies,
      constraints,
      complexity: this.convertComplexityToNumber(classification.complexity),
      urgency: classification.urgency,
      targetRole: classification.primary,
      estimatedTime: 30, // Default estimated time in minutes
      riskLevel: this.assessRiskLevel(classification, context)
    };
  }

  /**
   * Generate suggestions from predefined templates
   */
  private async generateFromTemplates(
    classification: EnhancedSignalClassification,
    requirements: ActionRequirements
  ): Promise<EnhancedActionSuggestion[]> {
    const applicableTemplates = Array.from(this.actionTemplates.values())
      .filter(template => {
        const signalBase = classification.signalId.split('-')[0];
        return template.applicableSignals.includes(classification.category) ||
          (signalBase && template.applicableSignals.includes(signalBase));
      })
      .filter(template =>
        template.targetRoles.includes(requirements.targetRole) ||
        template.targetRoles.includes('any')
      );

    return applicableTemplates.map(template => this.createSuggestionFromTemplate(
      template,
      classification,
      requirements
    ));
  }

  /**
   * Generate contextual suggestions using LLM analysis
   */
  private async generateContextualSuggestions(
    classification: EnhancedSignalClassification,
    context: ProcessingContext,
    requirements: ActionRequirements
  ): Promise<EnhancedActionSuggestion[]> {
    const prompt = this.buildContextualPrompt(classification, context, requirements);

    try {
      // This would integrate with an actual LLM service
      const llmResponse = await this.callLLMForSuggestions(prompt);
      return this.parseLLMSuggestions(llmResponse, classification, context);

    } catch (error) {
      logger.warn('ActionSuggestionEngine', 'LLM suggestion generation failed', error as Record<string, unknown>);
      return [];
    }
  }

  /**
   * Generate suggestions based on historical patterns
   */
  private async generateFromHistory(
    classification: EnhancedSignalClassification,
    context: ProcessingContext
  ): Promise<EnhancedActionSuggestion[]> {
    const signalType = classification.category;
    const historicalActions = this.historicalData.get(signalType) ?? [];

    // Find successful similar actions
    const successfulActions = historicalActions
      .filter(action => action.success && action.agentRole === classification.primary)
      .sort((a, b) => b.duration - a.duration) // Prefer shorter successful actions
      .slice(0, 3);

    return successfulActions.map(action => this.createSuggestionFromHistory(
      action,
      classification,
      context
    ));
  }

  /**
   * Tailor suggestions to specific agents based on capabilities
   */
  private async tailorToAgents(
    suggestions: EnhancedActionSuggestion[],
    context: ProcessingContext
  ): Promise<EnhancedActionSuggestion[]> {
    const tailoredSuggestions: EnhancedActionSuggestion[] = [];

    for (const suggestion of suggestions) {
      const suitableAgents = await this.findSuitableAgents(suggestion, context.agentStatus);

      for (const agent of suitableAgents) {
        const tailoredSuggestion = await this.tailorSuggestionForAgent(suggestion, agent, context);
        tailoredSuggestions.push(tailoredSuggestion);
      }
    }

    return tailoredSuggestions;
  }

  /**
   * Validate suggestions and predict success rates
   */
  private async validateAndPredict(
    suggestions: EnhancedActionSuggestion[],
    context: ProcessingContext
  ): Promise<EnhancedActionSuggestion[]> {
    const validatedSuggestions: EnhancedActionSuggestion[] = [];

    for (const suggestion of suggestions) {
      // Validate feasibility
      const isFeasible = await this.validateFeasibility(suggestion, context);
      if (!isFeasible) {
        continue;
      }

      // Predict success rate
      const successRate = await this.successPredictor.predict(suggestion, context);

      // Update suggestion with predicted success rate
      const updatedSuggestion = {
        ...suggestion,
        metadata: {
          ...suggestion.metadata,
          historicalSuccessRate: successRate
        }
      };

      validatedSuggestions.push(updatedSuggestion);
    }

    return validatedSuggestions;
  }

  /**
   * Rank and filter suggestions based on multiple factors
   */
  private rankAndFilter(
    suggestions: EnhancedActionSuggestion[],
    classification: EnhancedSignalClassification
  ): EnhancedActionSuggestion[] {
    // Score suggestions based on multiple factors
    const scoredSuggestions = suggestions.map(suggestion => ({
      suggestion,
      score: this.calculateSuggestionScore(suggestion, classification)
    }));

    // Sort by score (highest first)
    scoredSuggestions.sort((a, b) => b.score - a.score);

    // Filter top suggestions and remove duplicates
    const uniqueSuggestions = this.removeDuplicates(
      scoredSuggestions.slice(0, 7).map(item => item.suggestion)
    );

    return uniqueSuggestions;
  }

  /**
   * Initialize action templates for common scenarios
   */
  private initializeActionTemplates(): void {
    // Development signal template
    this.actionTemplates.set('dev-progress', {
      id: 'dev-progress',
      name: 'Development Progress Review',
      description: 'Review and validate development progress',
      applicableSignals: ['development', 'implementation', 'coding'],
      targetRoles: ['robo-developer', 'robo-reviewer'],
      action: 'Review development progress, validate implementation, and update project status',
      requirements: {
        skills: ['code-review', 'development', 'testing'],
        tools: ['git', 'ide', 'testing-frameworks'],
        permissions: ['read-code', 'write-code', 'run-tests'],
        minComplexity: 3,
        maxComplexity: 8,
        estimatedTime: 30,
        riskLevel: 'low'
      },
      expectedOutcome: 'Validated development progress with identified issues or improvements',
      successRate: 0.85,
      priority: ActionPriority.HIGH
    });

    // Bug fix template
    this.actionTemplates.set('bug-fix', {
      id: 'bug-fix',
      name: 'Bug Investigation and Fix',
      description: 'Investigate reported bug and implement fix',
      applicableSignals: ['bug', 'error', 'issue', 'problem'],
      targetRoles: ['robo-developer', 'robo-aqa'],
      action: 'Analyze bug report, reproduce issue, implement fix, and validate solution',
      requirements: {
        skills: ['debugging', 'problem-solving', 'testing'],
        tools: ['debugger', 'git', 'testing-tools'],
        permissions: ['read-code', 'write-code', 'run-tests'],
        minComplexity: 4,
        maxComplexity: 9,
        estimatedTime: 60,
        riskLevel: 'medium'
      },
      expectedOutcome: 'Bug fixed with proper testing and validation',
      successRate: 0.78,
      priority: ActionPriority.CRITICAL
    });

    // Testing template
    this.actionTemplates.set('testing', {
      id: 'testing',
      name: 'Comprehensive Testing',
      description: 'Design and execute comprehensive tests',
      applicableSignals: ['test', 'quality', 'validation', 'verification'],
      targetRoles: ['robo-aqa', 'robo-developer'],
      action: 'Design test cases, implement tests, and execute test suite',
      requirements: {
        skills: ['testing', 'quality-assurance', 'automation'],
        tools: ['testing-frameworks', 'ci-cd-tools'],
        permissions: ['run-tests', 'write-tests', 'access-ci'],
        minComplexity: 3,
        maxComplexity: 7,
        estimatedTime: 45,
        riskLevel: 'low'
      },
      expectedOutcome: 'Comprehensive test coverage with passing tests',
      successRate: 0.92,
      priority: ActionPriority.HIGH
    });

    // Research template
    this.actionTemplates.set('research', {
      id: 'research',
      name: 'Research and Analysis',
      description: 'Conduct research on specific topic or problem',
      applicableSignals: ['research', 'analysis', 'investigation', 'study'],
      targetRoles: ['robo-system-analyst', 'robo-researcher'],
      action: 'Research topic, analyze findings, and provide recommendations',
      requirements: {
        skills: ['research', 'analysis', 'documentation'],
        tools: ['research-tools', 'documentation-systems'],
        permissions: ['access-external', 'write-docs'],
        minComplexity: 2,
        maxComplexity: 6,
        estimatedTime: 90,
        riskLevel: 'low'
      },
      expectedOutcome: 'Comprehensive research findings with actionable recommendations',
      successRate: 0.88,
      priority: ActionPriority.MEDIUM
    });

    // Deployment template
    this.actionTemplates.set('deployment', {
      id: 'deployment',
      name: 'Deployment Preparation',
      description: 'Prepare and execute deployment',
      applicableSignals: ['deploy', 'release', 'production', 'deployment'],
      targetRoles: ['robo-devops-sre', 'robo-developer'],
      action: 'Prepare deployment package, execute deployment, and monitor results',
      requirements: {
        skills: ['deployment', 'monitoring', 'troubleshooting'],
        tools: ['deployment-tools', 'monitoring-systems'],
        permissions: ['deploy', 'access-production', 'monitor'],
        minComplexity: 5,
        maxComplexity: 10,
        estimatedTime: 120,
        riskLevel: 'high'
      },
      expectedOutcome: 'Successful deployment with monitoring and rollback capability',
      successRate: 0.81,
      priority: ActionPriority.CRITICAL
    });
  }

  // Helper methods (implementations would go here)

  private async loadHistoricalData(): Promise<void> {
    // Load historical action data from storage
    // This is a placeholder implementation
  }

  private identifyImmediateActions(): string[] {
    return ['analyze-signal', 'assess-impact'];
  }

  private identifyBackgroundTasks(): string[] {
    return ['update-documentation', 'monitor-progress'];
  }

  private identifyDependencies(classification: EnhancedSignalClassification): string[] {
    // Handle dependencies as string array with proper type checking
    const deps = classification.dependencies;
    if (Array.isArray(deps)) {
      return deps.filter((dep): dep is string => typeof dep === 'string');
    }

    // Handle case where dependencies might be structured differently
    const structuredDeps = classification.dependencies as unknown;
    if (structuredDeps && typeof structuredDeps === 'object' && 'signalDependencies' in structuredDeps) {
      const signalDeps = (structuredDeps as { signalDependencies?: unknown }).signalDependencies;
      if (Array.isArray(signalDeps)) {
        return signalDeps.filter((dep): dep is string => typeof dep === 'string');
      }
    }

    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private identifyConstraints(classification: EnhancedSignalClassification, _context: ProcessingContext): string[] {
    const constraints = [];
    if (classification.urgency === 'urgent') {
      constraints.push('urgent');
    }
    return constraints;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private assessRiskLevel(classification: EnhancedSignalClassification, _context: ProcessingContext): 'low' | 'medium' | 'high' {
    if (classification.complexity === 'critical') {
      return 'high';
    }
    if (classification.complexity === 'high') {
      return 'medium';
    }
    return 'low';
  }

  private buildContextualPrompt(_classification: EnhancedSignalClassification, _context: ProcessingContext, requirements: ActionRequirements): string {
    return `Generate action suggestions for signal classification:

Requirements: ${JSON.stringify(requirements, null, 2)}

Provide 3-5 specific, actionable suggestions with details on implementation, requirements, and expected outcomes.`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async callLLMForSuggestions(_prompt: string): Promise<LLMSuggestionResponse> {
    // This would integrate with an actual LLM service
    // For now, return mock response
    return {
      suggestions: [
        {
          action: 'Review and validate the current implementation',
          target: 'robo-developer',
          reasoning: 'Development progress needs validation',
          estimatedTime: 30,
          priority: 'high'
        }
      ]
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private parseLLMSuggestions(_response: LLMSuggestionResponse, _classification: EnhancedSignalClassification, _context: ProcessingContext): EnhancedActionSuggestion[] {
    // Parse LLM response into suggestion objects
    return [];
  }

  private createSuggestionFromTemplate(template: ActionTemplate, classification: EnhancedSignalClassification, requirements: ActionRequirements): EnhancedActionSuggestion {
    return {
      id: HashUtils.generateId(),
      type: this.mapStringToActionType(template.id),
      category: template.name,
      targetAgent: requirements.targetRole,
      capabilities: template.requirements,
      prerequisites: [],
      dependencies: requirements.dependencies,
      expectedOutcome: template.expectedOutcome,
      riskAssessment: {
        level: template.requirements.riskLevel,
        factors: [],
        mitigation: []
      },
      successMetrics: [],
      alternatives: [],
      context: {
        signalId: classification.signalId,
        agentWorkload: 0.5,
        systemState: 'normal',
        priority: this.mapUrgencyToPriority(classification.urgency)
      },
      metadata: {
        confidence: 0.8,
        source: 'template',
        reasoning: `Template-based suggestion for ${classification.category}`,
        estimatedCost: template.requirements.estimatedTime,
        historicalSuccessRate: template.successRate
      },
      priority: template.priority,
      description: template.description,
      estimatedTime: template.requirements.estimatedTime
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private createSuggestionFromHistory(action: HistoricalAction, _classification: EnhancedSignalClassification, _context: ProcessingContext): EnhancedActionSuggestion {
    return {
      id: HashUtils.generateId(),
      type: this.mapStringToActionType(action.action),
      category: 'Historical Pattern',
      targetAgent: action.agentRole,
      capabilities: {
        skills: [],
        tools: [],
        permissions: [],
        minComplexity: 1,
        maxComplexity: 10,
        estimatedTime: action.duration,
        riskLevel: 'low'
      },
      prerequisites: [],
      dependencies: [],
      expectedOutcome: action.outcome,
      riskAssessment: {
        level: 'low',
        factors: [],
        mitigation: []
      },
      successMetrics: [],
      alternatives: [],
      context: {
        signalId: _classification.signalId,
        agentWorkload: 0.5,
        systemState: 'normal',
        priority: ActionPriority.MEDIUM
      },
      metadata: {
        confidence: 0.7,
        source: 'historical',
        reasoning: 'Based on historical success with similar signals',
        estimatedCost: action.duration,
        historicalSuccessRate: 1.0
      },
      priority: ActionPriority.MEDIUM,
      description: `Historical action: ${action.action}`,
      estimatedTime: action.duration
    };
  }

  private async findSuitableAgents(suggestion: EnhancedActionSuggestion, agentStatus: AgentStatusInfo[]): Promise<AgentStatusInfo[]> {
    return agentStatus.filter(agent =>
      agent.status === 'active' &&
      this.capabilityMatcher.matchCapabilities(suggestion.capabilities, agent)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async tailorSuggestionForAgent(_suggestion: EnhancedActionSuggestion, agent: AgentStatusInfo, _context: ProcessingContext): Promise<EnhancedActionSuggestion> {
    return {
      ..._suggestion,
      targetAgent: agent.id,
      metadata: {
        ..._suggestion.metadata,
        reasoning: `${_suggestion.metadata.reasoning} (Tailored for ${agent.name})`
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateFeasibility(_suggestion: EnhancedActionSuggestion, _context: ProcessingContext): Promise<boolean> {
    // Check if suggestion is feasible given current context
    return true; // Placeholder
  }

  private calculateSuggestionScore(suggestion: EnhancedActionSuggestion, classification: EnhancedSignalClassification): number {
    let score = 0;

    // Base score from confidence
    score += suggestion.metadata.confidence * 30;

    // Historical success rate
    score += suggestion.metadata.historicalSuccessRate * 25;

    // Priority alignment
    if (suggestion.context.priority === this.mapUrgencyToPriority(classification.urgency)) {
      score += 20;
    }

    // Role alignment
    if (suggestion.targetAgent === classification.primary) {
      score += 15;
    }

    // Complexity alignment
    const complexityDiff = Math.abs(suggestion.capabilities.maxComplexity - this.convertComplexityToNumber(classification.complexity));
    score += Math.max(0, 10 - complexityDiff);

    return Math.min(100, score);
  }

  private removeDuplicates(suggestions: EnhancedActionSuggestion[]): EnhancedActionSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.type}-${suggestion.targetAgent}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private createFallbackSuggestions(classification: EnhancedSignalClassification): EnhancedActionSuggestion[] {
    return [{
      id: HashUtils.generateId(),
      type: ActionType.ANALYZE,
      category: 'Fallback Analysis',
      targetAgent: classification.primary,
      capabilities: {
        skills: ['analysis'],
        tools: [],
        permissions: [],
        minComplexity: 1,
        maxComplexity: 10,
        estimatedTime: 30,
        riskLevel: 'low'
      },
      prerequisites: [],
      dependencies: [],
      expectedOutcome: 'Basic analysis of the signal',
      riskAssessment: {
        level: 'low',
        factors: [],
        mitigation: []
      },
      successMetrics: [],
      alternatives: [],
      context: {
        signalId: classification.signalId,
        agentWorkload: 0.5,
        systemState: 'normal',
        priority: ActionPriority.MEDIUM
      },
      metadata: {
        confidence: 0.3,
        source: 'rule-based',
        reasoning: 'Fallback suggestion due to generation error',
        estimatedCost: 30,
        historicalSuccessRate: 0.5
      },
      priority: ActionPriority.MEDIUM,
      description: 'Analyze the signal and provide basic assessment',
      estimatedTime: 30
    }];
  }

  private convertComplexityToNumber(complexity: 'low' | 'medium' | 'high' | 'critical'): number {
    const mapping: Record<string, number> = {
      'low': 2,
      'medium': 5,
      'high': 8,
      'critical': 10
    };
    return mapping[complexity] ?? 5; // Default to medium if unknown
  }

  private mapStringToActionType(action: string): ActionType {
    const mapping: Record<string, ActionType> = {
      'dev-progress': ActionType.REVIEW,
      'bug-fix': ActionType.DEBUG,
      'testing': ActionType.TEST,
      'research': ActionType.RESEARCH,
      'deployment': ActionType.DEPLOY,
      'default': ActionType.ANALYZE
    };
    return mapping[action] ?? ActionType.ANALYZE;
  }

  private mapUrgencyToPriority(urgency: string): ActionPriority {
    const mapping: Record<string, ActionPriority> = {
      'immediate': ActionPriority.CRITICAL,
      'high': ActionPriority.HIGH,
      'medium': ActionPriority.MEDIUM,
      'low': ActionPriority.LOW,
      'background': ActionPriority.BACKGROUND
    };
    return mapping[urgency] ?? ActionPriority.MEDIUM;
  }
}

// Supporting classes

class SuccessPredictor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async predict(suggestion: EnhancedActionSuggestion, _context: ProcessingContext): Promise<number> {
    // Simple prediction based on historical data and context
    let successRate = suggestion.metadata.historicalSuccessRate;

    // Adjust based on agent workload
    if (suggestion.context.agentWorkload > 0.8) {
      successRate *= 0.8; // Reduce success rate for busy agents
    }

    // Adjust based on system state
    if (suggestion.context.systemState !== 'normal') {
      successRate *= 0.9;
    }

    return Math.min(1, Math.max(0, successRate));
  }
}

class CapabilityMatcher {
  matchCapabilities(_requirements: CapabilityRequirements, agent: AgentStatusInfo): boolean {
    // Simple capability matching - real implementation would be more sophisticated
    return agent.capabilities.supportsTools && agent.status === 'active';
  }
}

// Export types for testing
export type { EnhancedActionSuggestion, ActionTemplate, HistoricalAction, CapabilityRequirements };
export { ActionType, ActionPriority };

interface ActionRequirements {
  immediateActions: string[];
  backgroundTasks: string[];
  dependencies: string[];
  constraints: string[];
  complexity: number;
  urgency: string;
  targetRole: string;
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}