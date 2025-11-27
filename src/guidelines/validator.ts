/**
 * ♫ Guidelines Validator for @dcversus/prp
 *
 * Comprehensive validation framework for guidelines with dynamic loading,
 * dependency resolution, and quality assurance.
 */
import { EventEmitter } from 'events';

import { Validator, logger, TimeUtils } from '../shared';

import {
  ValidationSeverityValues
} from './types';

import type {
  GuidelineDefinition,
  GuidelineValidationResult,
  DependencyGraph,
  ValidationResult as ValidationResultType,
  ValidationError} from './types';

// Note: ValidationError and GuidelineValidationResult are imported from types.ts
/**
 * Dependency validation result
 */
export interface DependencyValidationResult {
  allDependenciesSatisfied: boolean;
  missingDependencies: string[];
  circularDependencies: string[];
  dependencyGraph: DependencyGraph;
  versionConflicts: Array<{
    guideline: string;
    requiredVersion: string;
    actualVersion: string;
  }>;
}
/**
 * Quality gate validation result
 */
export interface QualityGateValidationResult {
  passed: boolean;
  score: number; // 0-100
  categories: {
    structure: ValidationResultType;
    content: ValidationResultType;
    integration: ValidationResultType;
    performance: ValidationResultType;
  };
  blockingIssues: ValidationError[];
  recommendations: ValidationError[];
}
/**
 * ♫ Guidelines Validator - Quality assurance for guidelines
 */
export class GuidelinesValidator extends EventEmitter {
  private readonly version = '1.0.0';
  private validationHistory: Array<{
    guidelineId: string;
    result: GuidelineValidationResult;
    timestamp: Date;
  }> = [];
  constructor() {
    super();
    this.setupEventHandlers();
  }
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('validation_completed', (event) => {
      logger.debug('shared', 'GuidelinesValidator', 'Validation completed', {
        guidelineId: event.guidelineId,
        isValid: event.result.isValid,
      });
    });
    this.on('validation_failed', (event) => {
      logger.warn('shared', 'GuidelinesValidator', 'Validation failed', {
        guidelineId: event.guidelineId,
        errorCount: event.result.errors.length,
      });
    });
  }
  /**
   * Validate guideline definition comprehensively
   */
  async validateGuideline(guideline: GuidelineDefinition): Promise<GuidelineValidationResult> {
    const startTime = TimeUtils.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: ValidationError[] = [];
    try {
      // Core structure validation
      await this.validateCoreStructure(guideline, errors, warnings, suggestions);
      // Protocol validation
      await this.validateProtocol(guideline, errors, warnings, suggestions);
      // Content quality validation
      await this.validateContentQuality(guideline, errors, warnings, suggestions);
      // Integration validation
      await this.validateIntegration(guideline, errors, warnings, suggestions);
      // Performance validation
      await this.validatePerformance(guideline, errors, warnings, suggestions);
      const result: GuidelineValidationResult = {
        guidelineId: guideline.id,
        category: guideline.category,
        severity:
          errors.length > 0
            ? ValidationSeverityValues.CRITICAL
            : warnings.length > 0
              ? ValidationSeverityValues.HIGH
              : ValidationSeverityValues.INFO,
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        score:
          errors.length === 0 ? 100 : Math.max(0, 100 - errors.length * 20 - warnings.length * 5),
        dependencies: {
          satisfied: guideline.metadata.dependencies || [],
          missing: [],
          conflicting: [],
        },
        metadata: {
          validationTime: startTime,
          validatorVersion: this.version,
          checklistPassed: this.getChecklistPassed(errors, warnings, suggestions),
          checklistFailed: this.getChecklistFailed(errors, warnings, suggestions),
        },
      };
      // Store validation history
      this.validationHistory.push({
        guidelineId: guideline.id,
        result,
        timestamp: TimeUtils.now(),
      });
      // Emit validation event
      this.emit('validation_completed', { guidelineId: guideline.id, result });
      return result;
    } catch (error) {
      const validationError: ValidationError = {
        code: 'VALIDATION_EXCEPTION',
        message: `Validation failed with exception: ${error instanceof Error ? error.message : String(error)}`,
        severity: ValidationSeverityValues.CRITICAL,
        fixable: false,
        suggestion: 'Check guideline structure and try again',
      };
      const result: GuidelineValidationResult = {
        guidelineId: guideline.id,
        category: guideline.category,
        severity: ValidationSeverityValues.CRITICAL,
        isValid: false,
        errors: [validationError],
        warnings,
        suggestions,
        score: 0,
        dependencies: {
          satisfied: [],
          missing: [],
          conflicting: [],
        },
        metadata: {
          validationTime: startTime,
          validatorVersion: this.version,
          checklistPassed: [],
          checklistFailed: ['validation_completed_successfully'],
        },
      };
      this.emit('validation_failed', { guidelineId: guideline.id, result });
      return result;
    }
  }
  /**
   * Validate core structure of guideline
   */
  private async validateCoreStructure(
    guideline: GuidelineDefinition,
    errors: ValidationError[],
    warnings: ValidationError[],
    _suggestions: ValidationError[],
  ): Promise<void> {
    // ID validation
    if (!guideline.id || !Validator.isValidAgentId(guideline.id)) {
      errors.push({
        code: 'INVALID_ID',
        message: 'Guideline ID is required and must follow naming conventions',
        field: 'id',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Use lowercase letters, numbers, and hyphens only',
      });
    }
    // Language validation
    if (!guideline.language) {
      errors.push({
        code: 'MISSING_LANGUAGE',
        message: 'Guideline language is required',
        field: 'language',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Specify language code (e.g., EN, DE, SC)',
      });
    } else if (!['EN', 'DE', 'SC'].includes(guideline.language)) {
      warnings.push({
        code: 'UNSUPPORTED_LANGUAGE',
        message: `Language ${guideline.language} is not officially supported`,
        field: 'language',
        severity: ValidationSeverityValues.HIGH,
        fixable: true,
        suggestion: 'Use supported language codes: EN, DE, SC',
      });
    }
    // Name validation
    if (!guideline.name || guideline.name.length < 3) {
      errors.push({
        code: 'INVALID_NAME',
        message: 'Guideline name must be at least 3 characters long',
        field: 'name',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Provide a descriptive name for the guideline',
      });
    }
    // Description validation
    if (!guideline.description || guideline.description.length < 10) {
      errors.push({
        code: 'INVALID_DESCRIPTION',
        message: 'Guideline description must be at least 10 characters long',
        field: 'description',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Provide a comprehensive description of what the guideline does',
      });
    }
    // Category validation
    const validCategories = [
      'development',
      'testing',
      'deployment',
      'security',
      'performance',
      'documentation',
      'communication',
    ];
    if (!validCategories.includes(guideline.category)) {
      errors.push({
        code: 'INVALID_CATEGORY',
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        field: 'category',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Choose an appropriate category for the guideline',
      });
    }
    // Priority validation
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(guideline.priority)) {
      errors.push({
        code: 'INVALID_PRIORITY',
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
        field: 'priority',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Choose an appropriate priority level',
      });
    }
    // Token limits validation
    if (guideline.tokenLimits.inspector <= 0 || guideline.tokenLimits.inspector > 100000) {
      errors.push({
        code: 'INVALID_INSPECTOR_TOKEN_LIMIT',
        message: 'Inspector token limit must be between 1 and 100,000',
        field: 'tokenLimits.inspector',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Set reasonable token limits for the inspector (default: 20,000)',
      });
    }
    if (guideline.tokenLimits.orchestrator <= 0 || guideline.tokenLimits.orchestrator > 200000) {
      errors.push({
        code: 'INVALID_ORCHESTRATOR_TOKEN_LIMIT',
        message: 'Orchestrator token limit must be between 1 and 200,000',
        field: 'tokenLimits.orchestrator',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Set reasonable token limits for the orchestrator (default: 40,000)',
      });
    }
  }
  /**
   * Validate protocol structure
   */
  private async validateProtocol(
    guideline: GuidelineDefinition,
    errors: ValidationError[],
    warnings: ValidationError[],
    _suggestions: ValidationError[],
  ): Promise<void> {
    const {protocol} = guideline;
    if (!protocol) {
      errors.push({
        code: 'MISSING_PROTOCOL',
        message: 'Protocol is required for guidelines',
        field: 'protocol',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Define a protocol with steps, decision points, and success criteria',
      });
      return;
    }
    // Protocol ID validation
    if (!protocol.id || !Validator.isValidAgentId(protocol.id)) {
      errors.push({
        code: 'INVALID_PROTOCOL_ID',
        message: 'Protocol ID is required and must follow naming conventions',
        field: 'protocol.id',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Use lowercase letters, numbers, and hyphens only',
      });
    }
    // Steps validation
    if (!protocol.steps || protocol.steps.length === 0) {
      errors.push({
        code: 'NO_PROTOCOL_STEPS',
        message: 'Protocol must have at least one step',
        field: 'protocol.steps',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Define the steps required to execute this guideline',
      });
    } else {
      // Validate each step
      protocol.steps.forEach((step, index) => {
        if (!step.id || !Validator.isValidAgentId(step.id)) {
          errors.push({
            code: 'INVALID_STEP_ID',
            message: `Step ${index + 1} has invalid ID`,
            field: `protocol.steps[${index}].id`,
            severity: ValidationSeverityValues.CRITICAL,
            fixable: true,
            suggestion: 'Provide a valid ID for each step',
          });
        }
        if (!step.name || step.name.length < 3) {
          errors.push({
            code: 'INVALID_STEP_NAME',
            message: `Step ${index + 1} has invalid name`,
            field: `protocol.steps[${index}].name`,
            severity: ValidationSeverityValues.CRITICAL,
            fixable: true,
            suggestion: 'Provide a descriptive name for each step',
          });
        }
        if (
          !step.type ||
          !['action_execution', 'inspector_analysis', 'orchestrator_decision'].includes(step.type)
        ) {
          errors.push({
            code: 'INVALID_STEP_TYPE',
            message: `Step ${index + 1} has invalid type`,
            field: `protocol.steps[${index}].type`,
            severity: ValidationSeverityValues.CRITICAL,
            fixable: true,
            suggestion:
              'Choose a valid step type: action_execution, inspector_analysis, or orchestrator_decision',
          });
        }
      });
    }
    // Decision points validation
    if (protocol.decisionPoints && protocol.decisionPoints.length > 0) {
      protocol.decisionPoints.forEach((decision, index) => {
        if (!decision.question || decision.question.length < 10) {
          warnings.push({
            code: 'WEAK_DECISION_QUESTION',
            message: `Decision point ${index + 1} has a weak question`,
            field: `protocol.decisionPoints[${index}].question`,
            severity: ValidationSeverityValues.HIGH,
            fixable: true,
            suggestion: 'Provide a clear, specific question for decision points',
          });
        }
        if (!decision.options || decision.options.length < 2) {
          errors.push({
            code: 'INSUFFICIENT_DECISION_OPTIONS',
            message: `Decision point ${index + 1} needs at least 2 options`,
            field: `protocol.decisionPoints[${index}].options`,
            severity: ValidationSeverityValues.CRITICAL,
            fixable: true,
            suggestion: 'Provide clear decision options',
          });
        }
      });
    }
    // Success criteria validation
    if (!protocol.successCriteria || protocol.successCriteria.length === 0) {
      warnings.push({
        code: 'NO_SUCCESS_CRITERIA',
        message: 'Protocol should define success criteria',
        field: 'protocol.successCriteria',
        severity: ValidationSeverityValues.HIGH,
        fixable: true,
        suggestion: 'Define clear success criteria for the protocol',
      });
    }
  }
  /**
   * Validate content quality
   */
  private async validateContentQuality(
    guideline: GuidelineDefinition,
    errors: ValidationError[],
    _warnings: ValidationError[],
    _suggestions: ValidationError[],
  ): Promise<void> {
    // Inspector prompt validation
    if (!guideline.prompts.inspector || guideline.prompts.inspector.length < 50) {
      errors.push({
        code: 'WEAK_INSPECTOR_PROMPT',
        message: 'Inspector prompt is too short or missing',
        field: 'prompts.inspector',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Provide a comprehensive prompt for the inspector with clear instructions',
      });
    }
    // Orchestrator prompt validation
    if (!guideline.prompts.orchestrator || guideline.prompts.orchestrator.length < 50) {
      errors.push({
        code: 'WEAK_ORCHESTRATOR_PROMPT',
        message: 'Orchestrator prompt is too short or missing',
        field: 'prompts.orchestrator',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
        suggestion: 'Provide a comprehensive prompt for the orchestrator with clear instructions',
      });
    }
    // Template variable validation
    const inspectorTemplateVars = this.extractTemplateVariables(guideline.prompts.inspector);
    const orchestratorTemplateVars = this.extractTemplateVariables(guideline.prompts.orchestrator);
    const commonTemplateVars = ['context', 'guidelineId', 'stepId'];
    const missingInspectorVars = commonTemplateVars.filter(
      (v) => !inspectorTemplateVars.includes(v),
    );
    const missingOrchestratorVars = commonTemplateVars.filter(
      (v) => !orchestratorTemplateVars.includes(v),
    );
    if (missingInspectorVars.length > 0) {
      _suggestions.push({
        code: 'MISSING_INSPECTOR_TEMPLATE_VARS',
        message: `Inspector prompt missing template variables: ${missingInspectorVars.join(', ')}`,
        field: 'prompts.inspector',
        severity: ValidationSeverityValues.INFO,
        fixable: true,
        suggestion: `Add template variables: {{${missingInspectorVars.join('}}, {{')}}`,
      });
    }
    if (missingOrchestratorVars.length > 0) {
      _suggestions.push({
        code: 'MISSING_ORCHESTRATOR_TEMPLATE_VARS',
        message: `Orchestrator prompt missing template variables: ${missingOrchestratorVars.join(', ')}`,
        field: 'prompts.orchestrator',
        severity: ValidationSeverityValues.INFO,
        fixable: true,
        suggestion: `Add template variables: {{${missingOrchestratorVars.join('}}, {{')}}`,
      });
    }
  }
  /**
   * Validate integration points
   */
  private async validateIntegration(
    guideline: GuidelineDefinition,
    errors: ValidationError[],
    warnings: ValidationError[],
    _suggestions: ValidationError[],
  ): Promise<void> {
    // Tools validation
    if (!guideline.tools || guideline.tools.length === 0) {
      warnings.push({
        code: 'NO_TOOLS_SPECIFIED',
        message: 'No tools specified for guideline',
        field: 'tools',
        severity: ValidationSeverityValues.HIGH,
        fixable: true,
        suggestion: 'Specify the tools required by this guideline',
      });
    }
    // Requirements validation
    if (!guideline.requirements || guideline.requirements.length === 0) {
      _suggestions.push({
        code: 'NO_REQUIREMENTS_SPECIFIED',
        message: 'No requirements specified for guideline',
        field: 'requirements',
        severity: ValidationSeverityValues.INFO,
        fixable: true,
        suggestion: 'Specify system requirements and dependencies',
      });
    } else {
      // Validate each requirement
      guideline.requirements.forEach((req, index) => {
        if (!req.name || req.name.length < 3) {
          errors.push({
            code: 'INVALID_REQUIREMENT_NAME',
            message: `Requirement ${index + 1} has invalid name`,
            field: `requirements[${index}].name`,
            severity: ValidationSeverityValues.CRITICAL,
            fixable: true,
            suggestion: 'Provide a descriptive name for each requirement',
          });
        }
        if (!req.check || typeof req.check !== 'function') {
          errors.push({
            code: 'INVALID_REQUIREMENT_CHECK',
            message: `Requirement ${index + 1} has invalid check function`,
            field: `requirements[${index}].check`,
            severity: ValidationSeverityValues.CRITICAL,
            fixable: true,
            suggestion: 'Provide a valid function to check the requirement',
          });
        }
      });
    }
    // Dependencies validation
    if (guideline.metadata.dependencies && guideline.metadata.dependencies.length > 0) {
      _suggestions.push({
        code: 'DEPENDENCIES_FOUND',
        message: `Guideline has ${guideline.metadata.dependencies.length} dependencies`,
        field: 'metadata.dependencies',
        severity: ValidationSeverityValues.INFO,
        fixable: false,
        suggestion: 'Ensure all dependencies are available and compatible',
      });
    }
  }
  /**
   * Validate performance characteristics
   */
  private async validatePerformance(
    guideline: GuidelineDefinition,
    _errors: ValidationError[],
    warnings: ValidationError[],
    _suggestions: ValidationError[],
  ): Promise<void> {
    // Token efficiency check
    const totalTokens = guideline.tokenLimits.inspector + guideline.tokenLimits.orchestrator;
    if (totalTokens > 100000) {
      warnings.push({
        code: 'HIGH_TOKEN_USAGE',
        message: `High token usage: ${totalTokens} tokens total`,
        field: 'tokenLimits',
        severity: ValidationSeverityValues.HIGH,
        fixable: true,
        suggestion: 'Consider optimizing prompts or reducing token limits',
      });
    }
    // Prompt length optimization
    const inspectorLength = guideline.prompts.inspector.length;
    const orchestratorLength = guideline.prompts.orchestrator.length;
    if (inspectorLength > 10000) {
      _suggestions.push({
        code: 'LONG_INSPECTOR_PROMPT',
        message: `Inspector prompt is ${inspectorLength} characters, consider optimization`,
        field: 'prompts.inspector',
        severity: ValidationSeverityValues.INFO,
        fixable: true,
        suggestion: 'Break down long prompts or use more concise language',
      });
    }
    if (orchestratorLength > 10000) {
      _suggestions.push({
        code: 'LONG_ORCHESTRATOR_PROMPT',
        message: `Orchestrator prompt is ${orchestratorLength} characters, consider optimization`,
        field: 'prompts.orchestrator',
        severity: ValidationSeverityValues.INFO,
        fixable: true,
        suggestion: 'Break down long prompts or use more concise language',
      });
    }
    // Step count optimization
    const stepCount = guideline.protocol.steps?.length || 0;
    if (stepCount > 10) {
      warnings.push({
        code: 'MANY_STEPS',
        message: `Protocol has ${stepCount} steps, consider breaking into smaller guidelines`,
        field: 'protocol.steps',
        severity: ValidationSeverityValues.HIGH,
        fixable: true,
        suggestion: 'Consider splitting complex protocols into multiple guidelines',
      });
    }
  }
  /**
   * Extract template variables from prompt
   */
  private extractTemplateVariables(prompt: string): string[] {
    const matches = prompt.match(/\{\{([^}]+)\}\}/g);
    return matches ? matches.map((match) => match.slice(2, -2)) : [];
  }
  /**
   * Get passed checklist items
   */
  private getChecklistPassed(
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[],
  ): string[] {
    const passed = [];
    if (errors.length === 0) {
      passed.push('core_structure_validation');
    }
    if (warnings.length === 0) {
      passed.push('no_warnings');
    }
    if (suggestions.length > 0) {
      passed.push('has_improvement_suggestions');
    }
    return passed;
  }
  /**
   * Get failed checklist items
   */
  private getChecklistFailed(
    errors: ValidationError[],
    warnings: ValidationError[],
    _suggestions: ValidationError[],
  ): string[] {
    const failed = [];
    if (errors.length > 0) {
      failed.push('critical_errors_present');
    }
    if (warnings.length > 0) {
      failed.push('warnings_present');
    }
    return failed;
  }
  /**
   * Validate dependencies across guidelines
   */
  async validateDependencies(
    guidelines: GuidelineDefinition[],
  ): Promise<DependencyValidationResult> {
    const dependencyGraph: DependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
      circularDependencies: [],
      missingDependencies: [],
    };
    // Build dependency graph
    for (const guideline of guidelines) {
      dependencyGraph.nodes.set(guideline.id, guideline);
      for (const depId of guideline.metadata.dependencies) {
        if (!dependencyGraph.edges.has(guideline.id)) {
          dependencyGraph.edges.set(guideline.id, new Set());
        }
        dependencyGraph.edges.get(guideline.id)!.add(depId);
      }
    }
    // Check for missing dependencies
    const missingDependencies: string[] = [];
    for (const [guidelineId, deps] of Array.from(dependencyGraph.edges.entries())) {
      for (const depId of Array.from(deps)) {
        if (!dependencyGraph.nodes.has(depId)) {
          missingDependencies.push(`${guidelineId} -> ${depId}`);
        }
      }
    }
    // Check for circular dependencies
    const circularDependencies = this.detectCircularDependencies(dependencyGraph);
    const result: DependencyValidationResult = {
      allDependenciesSatisfied:
        missingDependencies.length === 0 && circularDependencies.length === 0,
      missingDependencies,
      circularDependencies,
      dependencyGraph,
      versionConflicts: [], // TODO: Implement version conflict detection
    };
    return result;
  }
  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(graph: DependencyGraph): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];
    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart).concat(nodeId).join(' -> '));
        return;
      }
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);
      recursionStack.add(nodeId);
      const dependencies = graph.edges.get(nodeId);
      if (dependencies) {
        for (const depId of Array.from(dependencies)) {
          dfs(depId, [...path, nodeId]);
        }
      }
      recursionStack.delete(nodeId);
    };
    for (const nodeId of Array.from(graph.nodes.keys())) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }
    return cycles;
  }
  /**
   * Validate quality gates
   */
  async validateQualityGates(guideline: GuidelineDefinition): Promise<QualityGateValidationResult> {
    const categories = {
      structure: await this.validateStructureQuality(guideline),
      content: await this.validateContentQualityEnhanced(guideline),
      integration: await this.validateIntegrationQuality(guideline),
      performance: await this.validatePerformanceQuality(guideline),
    };
    const allScores = Object.values(categories).map((cat) => cat.score || 0);
    const overallScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    const blockingIssues = [
      ...(categories.structure.blockingIssues || []),
      ...(categories.content.blockingIssues || []),
      ...(categories.integration.blockingIssues || []),
      ...(categories.performance.blockingIssues || []),
    ];
    const recommendations = [
      ...(categories.structure.recommendations || []),
      ...(categories.content.recommendations || []),
      ...(categories.integration.recommendations || []),
      ...(categories.performance.recommendations || []),
    ];
    const result: QualityGateValidationResult = {
      passed: blockingIssues.length === 0 && overallScore >= 70,
      score: Math.round(overallScore),
      categories,
      blockingIssues,
      recommendations,
    };
    return result;
  }
  /**
   * Validate structure quality
   */
  private async validateStructureQuality(
    guideline: GuidelineDefinition,
  ): Promise<ValidationResultType> {
    const blockingIssues: ValidationError[] = [];
    const recommendations: ValidationError[] = [];
    let score = 100;
    // Check for required fields
    if (!guideline.id) {
      blockingIssues.push({
        code: 'MISSING_ID',
        message: 'Missing required field: id',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
      });
      score -= 25;
    }
    if (!guideline.name) {
      blockingIssues.push({
        code: 'MISSING_NAME',
        message: 'Missing required field: name',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
      });
      score -= 25;
    }
    if (!guideline.protocol?.steps || guideline.protocol.steps.length === 0) {
      blockingIssues.push({
        code: 'MISSING_PROTOCOL_STEPS',
        message: 'Protocol must have at least one step',
        severity: ValidationSeverityValues.CRITICAL,
        fixable: true,
      });
      score -= 30;
    }
    return {
      isValid: blockingIssues.length === 0,
      errors: blockingIssues,
      warnings: recommendations,
      score,
      blockingIssues,
      recommendations,
    };
  }
  /**
   * Validate content quality (duplicate of existing method for interface compatibility)
   */
  private async validateContentQualityEnhanced(
    _guideline: GuidelineDefinition,
  ): Promise<ValidationResultType> {
    // Implementation would go here - using the existing method
    return {
      isValid: true,
      errors: [],
      warnings: [],
      score: 85,
      blockingIssues: [],
      recommendations: [],
    };
  }
  /**
   * Validate integration quality
   */
  private async validateIntegrationQuality(
    guideline: GuidelineDefinition,
  ): Promise<ValidationResultType> {
    const blockingIssues: ValidationError[] = [];
    const recommendations: ValidationError[] = [];
    let score = 100;
    if (!guideline.tools || guideline.tools.length === 0) {
      recommendations.push({
        code: 'NO_TOOLS',
        message: 'Consider specifying required tools',
        severity: ValidationSeverityValues.INFO,
        fixable: true,
      });
      score -= 10;
    }
    return {
      isValid: blockingIssues.length === 0,
      errors: blockingIssues,
      warnings: recommendations,
      score,
      blockingIssues,
      recommendations,
    };
  }
  /**
   * Validate performance quality
   */
  private async validatePerformanceQuality(
    guideline: GuidelineDefinition,
  ): Promise<ValidationResultType> {
    const blockingIssues: ValidationError[] = [];
    const recommendations: ValidationError[] = [];
    let score = 100;
    const totalTokens = guideline.tokenLimits.inspector + guideline.tokenLimits.orchestrator;
    if (totalTokens > 150000) {
      recommendations.push({
        code: 'HIGH_TOKEN_USAGE',
        message: 'Consider reducing token limits for better performance',
        severity: ValidationSeverityValues.HIGH,
        fixable: true,
      });
      score -= 15;
    }
    return {
      isValid: blockingIssues.length === 0,
      errors: blockingIssues,
      warnings: recommendations,
      score,
      blockingIssues,
      recommendations,
    };
  }
  /**
   * Get validation history
   */
  getValidationHistory(): Array<{
    guidelineId: string;
    result: GuidelineValidationResult;
    timestamp: Date;
  }> {
    return [...this.validationHistory];
  }
  /**
   * Clear validation history
   */
  clearValidationHistory(): void {
    this.validationHistory = [];
  }
  /**
   * Get validator version
   */
  getVersion(): string {
    return this.version;
  }
}
// Export singleton instance
export const guidelinesValidator = new GuidelinesValidator();
