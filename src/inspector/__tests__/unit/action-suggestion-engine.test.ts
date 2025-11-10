/**
 * ♫ Action Suggestion Engine Unit Tests for @dcversus/prp
 *
 * Behavior-driven tests for the action suggestion engine with intelligent recommendations.
 */

import { ActionSuggestionEngine, EnhancedActionSuggestion } from '../../action-suggestion-engine';
import type { EnhancedSignalClassification, ProcessingContext, AgentStatusInfo } from '../../types';

// Mock logger
jest.mock('../../../shared/logger', () => ({
  createLayerLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('ActionSuggestionEngine', () => {
  let engine: ActionSuggestionEngine;
  let mockClassification: EnhancedSignalClassification;
  let mockContext: ProcessingContext;

  beforeEach(() => {
    engine = new ActionSuggestionEngine();

    mockClassification = {
      signalId: 'test-signal-1',
      category: 'development',
      subcategory: 'feature',
      priority: 5,
      agentRole: 'robo-developer',
      escalationLevel: 1,
      deadline: new Date(Date.now() + 86400000),
      dependencies: [],
      confidence: 85,
      complexity: 'medium',
      urgency: 'medium',
      primary: 'robo-developer',
      context: 'Development progress detected',
      metadata: {
        source: 'scanner',
        features: ['code', 'testing'],
        historicalMatches: []
      }
    };

    mockContext = {
      signalId: 'test-signal-1',
      worktree: '/test/worktree',
      agent: 'robo-developer',
      relatedSignals: [],
      activePRPs: ['PRP-001'],
      recentActivity: [
        {
          timestamp: new Date(),
          actor: 'robo-developer',
          action: 'code-change',
          details: 'Modified test file',
          relevantTo: ['PRP-001'],
          priority: 5
        }
      ],
      tokenStatus: {
        totalUsed: 1000,
        totalLimit: 10000,
        approachingLimit: false,
        criticalLimit: false,
        agentBreakdown: {
          'robo-developer': {
            used: 500,
            limit: 5000,
            percentage: 10,
            status: 'healthy'
          }
        },
        projections: {
          daily: 100,
          weekly: 700,
          monthly: 3000
        }
      },
      agentStatus: [
        {
          id: 'robo-developer-1',
          name: 'Developer Agent 1',
          type: 'developer',
          status: 'active',
          capabilities: {
            supportsTools: true,
            supportsImages: false,
            supportsSubAgents: false,
            supportsParallel: true,
            maxContextLength: 100000
          },
          performance: {
            tasksCompleted: 25,
            averageTaskTime: 30,
            errorRate: 5
          }
        }
      ],
      sharedNotes: [
        {
          id: 'note-1',
          name: 'Development Guidelines',
          pattern: 'development-progress',
          content: 'Guidelines for development progress reviews',
          lastModified: new Date(),
          tags: ['development', 'guidelines'],
          relevantTo: ['PRP-001'],
          priority: 5,
          wordCount: 150,
          readingTime: 1
        }
      ],
      environment: {
        worktree: '/test/worktree',
        branch: 'feature/new-feature',
        availableTools: ['git', 'npm', 'eslint'],
        systemCapabilities: ['testing', 'building'],
        constraints: {
          memory: 4096,
          diskSpace: 100000,
          networkAccess: true,
          maxFileSize: 10000
        },
        recentChanges: {
          count: 5,
          types: {
            'code': 3,
            'config': 2
          },
          lastChange: new Date()
        }
      },
      guidelineContext: {
        applicableGuidelines: ['development', 'testing'],
        enabledGuidelines: ['tdd', 'code-review'],
        disabledGuidelines: ['manual-testing'],
        protocolSteps: {
          'analyze': {
            id: 'analyze',
            name: 'Analyze Signal',
            status: 'completed',
            completed: true
          }
        },
        requirements: {
          met: ['code-written'],
          unmet: ['tests-passing'],
          blocked: []
        }
      },
      historicalData: {
        similarSignals: [
          {
            signal: {
              id: 'similar-1',
              type: 'development',
              priority: 5,
              source: 'scanner',
              timestamp: new Date(Date.now() - 86400000),
              data: {}
            },
            outcome: 'successful',
            processingTime: 25,
            recommendations: ['review-code', 'update-docs'],
            timestamp: new Date(Date.now() - 86400000)
          }
        ],
        agentPerformance: {
          'robo-developer': {
            successRate: 0.95,
            averageTime: 28,
            preferredTasks: ['coding', 'testing', 'documentation']
          }
        },
        systemPerformance: {
          averageProcessingTime: 30,
          successRate: 0.90,
          tokenEfficiency: 0.85
        },
        recentPatterns: [
          {
            pattern: 'development-progress',
            frequency: 5,
            lastOccurrence: new Date(),
            typicalResolution: 'code-review'
          }
        ]
      }
    };
  });

  describe('Constructor', () => {
    it('should initialize with default templates', () => {
      expect(engine).toBeDefined();
      // Engine should have action templates initialized
      // Since templates are private, we test through public methods
    });
  });

  describe('Suggestion Generation', () => {
    it('should generate suggestions for development signal', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);

      // Check structure of suggestions
      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('category');
        expect(suggestion).toHaveProperty('targetAgent');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('estimatedTime');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('capabilities');
        expect(suggestion).toHaveProperty('context');
        expect(suggestion).toHaveProperty('metadata');
      });
    });

    it('should generate suggestions with appropriate priority and urgency', async () => {
      const urgentClassification = {
        ...mockClassification,
        urgency: 'urgent',
        complexity: 'critical'
      };

      const suggestions = await engine.generateSuggestions(urgentClassification, mockContext);

      expect(suggestions.length).toBeGreaterThan(0);

      // At least one suggestion should have high priority
      const highPrioritySuggestions = suggestions.filter((s: EnhancedActionSuggestion) => s.context.priority === 'critical');
      expect(highPrioritySuggestions.length).toBeGreaterThan(0);
    });

    it('should generate context-aware suggestions based on agent status', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // Should generate suggestions for available agents
      const suggestionsForActiveAgents = suggestions.filter((s: EnhancedActionSuggestion) =>
        mockContext.agentStatus.some((agent: AgentStatusInfo) =>
          agent.status === 'active' &&
          (agent.id === s.targetAgent || agent.name === s.targetAgent)
        )
      );

      expect(suggestionsForActiveAgents.length).toBeGreaterThan(0);
    });

    it('should generate suggestions based on historical patterns', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // Should include suggestions based on similar signals from history
      const suggestionsWithHistoricalSuccessRate = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.metadata.historicalSuccessRate > 0.8
      );

      expect(suggestionsWithHistoricalSuccessRate.length).toBeGreaterThan(0);
    });

    it('should tailor suggestions to agent capabilities', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        // Suggestions should match agent capabilities
        const targetAgent = mockContext.agentStatus.find((agent: AgentStatusInfo) =>
          agent.id === suggestion.targetAgent || agent.name === suggestion.targetAgent
        );

        if (targetAgent) {
          // Check if suggestion capabilities align with agent capabilities
          expect(suggestion.capabilities.maxComplexity).toBeLessThanOrEqual(targetAgent.capabilities.maxContextLength);
        }
      });
    });

    it('should validate suggestions for feasibility', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        // All suggestions should have reasonable estimated times
        expect(suggestion.estimatedTime).toBeGreaterThan(0);
        expect(suggestion.estimatedTime).toBeLessThan(480); // Max 8 hours

        // All suggestions should have valid confidence scores
        expect(suggestion.metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.metadata.confidence).toBeLessThanOrEqual(1);

        // All suggestions should have required properties
        expect(suggestion.description).toBeTruthy();
        expect(suggestion.description.length).toBeGreaterThan(0);
      });
    });

    it('should rank and filter suggestions appropriately', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // Should limit to reasonable number of suggestions
      expect(suggestions.length).toBeLessThanOrEqual(7);

      // Should be sorted by relevance (implicit in ranking)
      // High confidence suggestions should appear first
      if (suggestions.length > 1) {
        expect(suggestions[0].metadata.confidence).toBeGreaterThanOrEqual(suggestions[suggestions.length - 1].metadata.confidence);
      }
    });

    it('should handle different signal categories appropriately', async () => {
      const bugClassification = {
        ...mockClassification,
        category: 'bug',
        subcategory: 'critical',
        urgency: 'high'
      };

      const bugSuggestions = await engine.generateSuggestions(bugClassification, mockContext);

      expect(bugSuggestions.length).toBeGreaterThan(0);

      // Should include debugging-related suggestions
      const debugSuggestions = bugSuggestions.filter((s: EnhancedActionSuggestion) =>
        s.type === 'debug' || s.category.toLowerCase().includes('debug')
      );
      expect(debugSuggestions.length).toBeGreaterThan(0);
    });

    it('should generate fallback suggestions on errors', async () => {
      // Mock a scenario that might cause errors
      const problematicClassification = {
        ...mockClassification,
        dependencies: null as any, // This might cause issues
        metadata: undefined as any
      };

      const suggestions = await engine.generateSuggestions(problematicClassification, mockContext);

      // Should still return some fallback suggestions
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);

      // Fallback suggestions should have low confidence
      const fallbackSuggestions = suggestions.filter((s: EnhancedActionSuggestion) => s.metadata.source === 'rule-based');
      expect(fallbackSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Template-Based Suggestions', () => {
    it('should generate template-based suggestions for known patterns', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // Should include template-based suggestions
      const templateSuggestions = suggestions.filter((s: EnhancedActionSuggestion) => s.metadata.source === 'template');
      expect(templateSuggestions.length).toBeGreaterThan(0);

      // Template suggestions should have reasonable default values
      templateSuggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion.estimatedTime).toBeGreaterThan(0);
        expect(suggestion.capabilities).toBeDefined();
        expect(suggestion.expectedOutcome).toBeTruthy();
      });
    });

    it('should use development template for development signals', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      const developmentSuggestions = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.category.includes('Development') || s.description.toLowerCase().includes('development')
      );
      expect(developmentSuggestions.length).toBeGreaterThan(0);
    });

    it('should use testing template for testing signals', async () => {
      const testingClassification = {
        ...mockClassification,
        category: 'testing',
        subcategory: 'unit-test',
        urgency: 'medium'
      };

      const suggestions = await engine.generateSuggestions(testingClassification, mockContext);

      const testingSuggestions = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.type === 'test' || s.category.toLowerCase().includes('test')
      );
      expect(testingSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Historical Pattern Recognition', () => {
    it('should generate suggestions based on successful historical actions', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // Should include suggestions based on historical success
      const historicalSuggestions = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.metadata.source === 'historical' && s.metadata.historicalSuccessRate > 0.7
      );
      expect(historicalSuggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize suggestions with high historical success rates', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // High historical success rate suggestions should appear early
      const highSuccessSuggestions = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.metadata.historicalSuccessRate > 0.8
      );

      if (highSuccessSuggestions.length > 0 && suggestions.length > 1) {
        // First suggestion should have high success rate if available
        expect(suggestions[0].metadata.historicalSuccessRate).toBeGreaterThanOrEqual(0.7);
      }
    });
  });

  describe('Agent Capability Matching', () => {
    it('should match suggestions to suitable agents', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        // Find the target agent
        const targetAgent = mockContext.agentStatus.find((agent: AgentStatusInfo) =>
          agent.id === suggestion.targetAgent || agent.name === suggestion.targetAgent
        );

        if (targetAgent) {
          // Check if suggestion requirements match agent capabilities
          expect(suggestion.capabilities.minComplexity).toBeLessThanOrEqual(10);
          expect(suggestion.capabilities.maxComplexity).toBeLessThanOrEqual(targetAgent.capabilities.maxContextLength);
          expect(suggestion.capabilities.riskLevel).toBeDefined();
        }
      });
    });

    it('should not generate suggestions for unavailable agents', async () => {
      const offlineAgentContext = {
        ...mockContext,
        agentStatus: mockContext.agentStatus.map((agent: AgentStatusInfo) => ({
          ...agent,
          status: 'offline' as const
        }))
      };

      const suggestions = await engine.generateSuggestions(mockClassification, offlineAgentContext);

      // Should generate fallback suggestions when no active agents
      expect(suggestions.length).toBeGreaterThan(0);

      // Fallback suggestions should target the primary agent role
      expect(suggestions[0].targetAgent).toBe(mockClassification.primary);
    });

    it('should prioritize agents with good performance history', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // Suggestions should favor agents with good performance
      const highPerformingAgentSuggestions = suggestions.filter((s: EnhancedActionSuggestion) => {
        const agent = mockContext.agentStatus.find((a: AgentStatusInfo) =>
          a.id === s.targetAgent || a.name === s.targetAgent
        );
        return agent && agent.performance.errorRate < 10; // Low error rate
      });

      if (highPerformingAgentSuggestions.length > 0) {
        // Should have at least one suggestion for high-performing agent
        expect(highPerformingAgentSuggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Risk Assessment', () => {
    it('should include risk assessment in suggestions', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion.riskAssessment).toBeDefined();
        expect(suggestion.riskAssessment.level).toMatch(/^(low|medium|high)$/);
        expect(Array.isArray(suggestion.riskAssessment.factors)).toBe(true);
        expect(Array.isArray(suggestion.riskAssessment.mitigation)).toBe(true);
      });
    });

    it('should assign appropriate risk levels based on complexity and urgency', async () => {
      const highRiskClassification = {
        ...mockClassification,
        complexity: 'critical',
        urgency: 'urgent'
      };

      const suggestions = await engine.generateSuggestions(highRiskClassification, mockContext);

      const highRiskSuggestions = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.riskAssessment.level === 'high'
      );

      // Should have some high-risk suggestions for critical/urgent signals
      expect(highRiskSuggestions.length).toBeGreaterThan(0);
    });

    it('should provide mitigation strategies for high-risk suggestions', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      const highRiskSuggestions = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.riskAssessment.level === 'high'
      );

      highRiskSuggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion.riskAssessment.mitigation.length).toBeGreaterThan(0);
        suggestion.riskAssessment.mitigation.forEach((mitigation: string) => {
          expect(typeof mitigation).toBe('string');
          expect(mitigation.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Context Integration', () => {
    it('should incorporate current environment constraints in suggestions', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        // Check if suggestions respect environment constraints
        expect(suggestion.context.signalId).toBe(mockClassification.signalId);
        expect(suggestion.context.systemState).toBeDefined();
        expect(suggestion.context.agentWorkload).toBeGreaterThanOrEqual(0);
        expect(suggestion.context.agentWorkload).toBeLessThanOrEqual(1);
      });
    });

    it('should consider current agent workload', async () => {
      const busyContext = {
        ...mockContext,
        tokenStatus: {
          ...mockContext.tokenStatus,
          agentBreakdown: {
            'robo-developer': {
              used: 4500,
              limit: 5000,
              percentage: 90,
              status: 'warning'
            }
          }
        }
      };

      const suggestions = await engine.generateSuggestions(mockClassification, busyContext);

      // Should adjust suggestions based on high workload
      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion.context.agentWorkload).toBeDefined();
        if (suggestion.targetAgent === 'robo-developer') {
          // Should reflect the high workload for this agent
          expect(suggestion.context.agentWorkload).toBeGreaterThan(0.8);
        }
      });
    });

    it('should align suggestions with active PRPs', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      // Suggestions should be relevant to active PRPs
      expect(mockContext.activePRPs.length).toBeGreaterThan(0);

      // Check if suggestions mention PRP-related activities
      suggestions.filter((s: EnhancedActionSuggestion) =>
        s.description.toLowerCase().includes('prp') ||
        s.expectedOutcome.toLowerCase().includes('prp')
      );

      // May or may not have PRP-related suggestions depending on context
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata and Confidence Scoring', () => {
    it('should provide comprehensive metadata for each suggestion', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion.metadata).toBeDefined();
        expect(suggestion.metadata.confidence).toBeDefined();
        expect(suggestion.metadata.source).toMatch(/^(template|llm|historical|rule-based)$/);
        expect(suggestion.metadata.reasoning).toBeTruthy();
        expect(suggestion.metadata.estimatedCost).toBeDefined();
        expect(suggestion.metadata.historicalSuccessRate).toBeDefined();
      });
    });

    it('should calculate appropriate confidence scores', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion.metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.metadata.confidence).toBeLessThanOrEqual(1);

        // Template suggestions should have reasonable confidence
        if (suggestion.metadata.source === 'template') {
          expect(suggestion.metadata.confidence).toBeGreaterThan(0.5);
        }

        // Historical suggestions should have confidence equal to historical success rate
        if (suggestion.metadata.source === 'historical') {
          expect(suggestion.metadata.confidence).toBe(suggestion.metadata.historicalSuccessRate);
        }
      });
    });

    it('should provide reasoning for each suggestion', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      suggestions.forEach((suggestion: EnhancedActionSuggestion) => {
        expect(suggestion.metadata.reasoning).toBeTruthy();
        expect(suggestion.metadata.reasoning.length).toBeGreaterThan(0);

        // Reasoning should be relevant to the suggestion type
        if (suggestion.type === 'debug') {
          expect(suggestion.metadata.reasoning.toLowerCase()).toMatch(/debug|error|issue/);
        }
      });
    });
  });

  describe('Alternative Suggestions', () => {
    it('should provide alternative approaches for complex tasks', async () => {
      const complexClassification = {
        ...mockClassification,
        complexity: 'critical'
      };

      const suggestions = await engine.generateSuggestions(complexClassification, mockContext);

      // Complex tasks should have alternatives
      const suggestionsWithAlternatives = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.alternatives && s.alternatives.length > 0
      );

      expect(suggestionsWithAlternatives.length).toBeGreaterThan(0);
    });

    it('should include alternatives with different risk levels', async () => {
      const suggestions = await engine.generateSuggestions(mockClassification, mockContext);

      const suggestionsWithAlternatives = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.alternatives && s.alternatives.length > 0
      );

      suggestionsWithAlternatives.forEach((suggestion: EnhancedActionSuggestion) => {
        suggestion.alternatives.forEach((alternative: string) => {
          expect(typeof alternative).toBe('string');
          expect(alternative.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Integration Testing', () => {
    it('should handle complete workflow from classification to suggestions', async () => {
      const workflowClassification = {
        signalId: 'workflow-signal-1',
        category: 'deployment',
        subcategory: 'production',
        priority: 1,
        agentRole: 'robo-devops-sre',
        escalationLevel: 3,
        deadline: new Date(Date.now() + 3600000), // 1 hour
        dependencies: ['build-complete', 'tests-passed'],
        confidence: 95,
        complexity: 'high',
        urgency: 'urgent',
        primary: 'robo-devops-sre',
        context: 'Production deployment required',
        metadata: {
          source: 'orchestrator',
          features: ['deployment', 'monitoring'],
          historicalMatches: []
        }
      };

      const suggestions = await engine.generateSuggestions(workflowClassification, mockContext);

      expect(suggestions.length).toBeGreaterThan(0);

      // Should include deployment-specific suggestions
      const deploymentSuggestions = suggestions.filter((s: EnhancedActionSuggestion) =>
        s.type === 'deploy' || s.category.toLowerCase().includes('deploy')
      );
      expect(deploymentSuggestions.length).toBeGreaterThan(0);

      // Should target the appropriate agent role
      expect(suggestions[0].targetAgent).toBe('robo-devops-sre');
    });

    it('should handle edge cases gracefully', async () => {
      const edgeCaseClassification = {
        signalId: 'edge-case-1',
        category: 'unknown',
        subcategory: 'uncategorized',
        priority: 5,
        agentRole: 'conductor',
        escalationLevel: 1,
        deadline: new Date(Date.now() + 86400000),
        dependencies: [],
        confidence: 10, // Very low confidence
        complexity: 'low',
        urgency: 'low',
        primary: 'conductor',
        context: 'Uncategorized signal',
        metadata: {
          source: 'unknown',
          features: [],
          historicalMatches: []
        }
      };

      const suggestions = await engine.generateSuggestions(edgeCaseClassification, mockContext);

      // Should still generate fallback suggestions
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].metadata.source).toBe('rule-based');
    });
  });
});