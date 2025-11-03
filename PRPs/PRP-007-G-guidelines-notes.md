# PRP-007-G Guidelines & Repository - Scanner Adapters & Inspector Prompts

**Status**: 📚 GUIDELINES DOCUMENT
**Created**: 2025-11-03
**Updated**: 2025-11-03
**Owner**: Robo-System-Analyst
**Priority**: HIGH
**Complexity**: 7/10

## 🎯 Main Goal

Establish the **central repository** for Scanner-Inspector-Orchestrator architecture guidelines, containing scanner adapters, inspector prompts, decision rules, and signal processing guidelines. This horizontal slice provides the foundational knowledge and patterns for implementing the corrected architecture with clear separation of concerns and standardized interfaces.

## 📊 Progress

[dp] Development Progress - Created comprehensive guidelines repository structure with scanner adapters, inspector prompts, and decision rules for the corrected Scanner-Inspector-Orchestrator architecture. This provides the foundational patterns and interfaces needed for successful implementation. | Robo-System-Analyst | 2025-11-03-16:00

## 🏗️ Architecture Guidelines Repository

### Scanner Layer Adapters & Patterns

#### Signal Parsing Adapters
```typescript
// Scanner Signal Parser Interface
interface ScannerSignalAdapter {
  parseSignals(content: string): ParsedSignal[];
  validateSignal(signal: string): boolean;
  enrichSignal(signal: ParsedSignal): EnrichedSignal;
  formatSignalForInspector(signal: EnrichedSignal): InspectorEvent;
}

// AGENTS.md Signal Validation Adapter
class AgentSignalValidator implements ScannerSignalAdapter {
  private officialSignals: Map<string, SignalDefinition>;

  constructor() {
    this.loadOfficialSignals();
  }

  parseSignals(content: string): ParsedSignal[] {
    const signalRegex = /\[(\w{1,3})\]/g;
    const signals: ParsedSignal[] = [];
    let match;

    while ((match = signalRegex.exec(content)) !== null) {
      signals.push({
        raw: match[0],
        type: match[1],
        position: match.index,
        line: this.getLineNumber(content, match.index),
        context: this.extractContext(content, match.index)
      });
    }

    return signals;
  }

  validateSignal(signal: string): boolean {
    return this.officialSignals.has(signal);
  }

  enrichSignal(signal: ParsedSignal): EnrichedSignal {
    const definition = this.officialSignals.get(signal.type);
    return {
      ...signal,
      isValid: definition !== undefined,
      definition: definition || null,
      category: this.categorizeSignal(signal.type),
      priority: this.getSignalPriority(signal.type),
      agent: this.extractAgentFromContext(signal.context)
    };
  }
}
```

#### System Event Monitoring Adapters
```typescript
// Git Event Adapter
class GitEventAdapter implements SystemEventAdapter {
  monitorGitRepository(repoPath: string): void {
    // Git hook integration
    this.setupGitHooks(repoPath);
    this.watchGitEvents(repoPath);
  }

  private setupGitHooks(repoPath: string): void {
    const hooks = {
      'post-commit': this.handleCommit.bind(this),
      'post-merge': this.handleMerge.bind(this),
      'pre-push': this.handlePush.bind(this)
    };

    // Install git hooks for real-time monitoring
  }

  private handleCommit(commit: GitCommit): InspectorEvent {
    return {
      type: 'git_commit',
      timestamp: new Date(),
      data: {
        hash: commit.hash,
        message: commit.message,
        author: commit.author,
        files: commit.files,
        signals: this.extractSignalsFromCommit(commit)
      },
      priority: this.calculateCommitPriority(commit)
    };
  }
}

// Tmux Session Adapter
class TmuxEventAdapter implements SystemEventAdapter {
  monitorTmuxSessions(): void {
    // Monitor tmux socket for session changes
    this.watchTmuxSocket();
    this.trackSessionActivity();
  }

  private handleSessionChange(event: TmuxEvent): InspectorEvent {
    return {
      type: 'tmux_session_change',
      timestamp: new Date(),
      data: {
        sessionId: event.sessionId,
        windowId: event.windowId,
        action: event.action, // create, destroy, rename, etc.
        agent: this.detectAgentFromSession(event.sessionId)
      },
      priority: 'medium'
    };
  }
}
```

### Inspector Layer Prompts & Templates

#### Signal Analysis Prompts
```prompt
SIGNAL_ANALYSIS_PROMPT = """
You are the Inspector layer for the PRP signal system. You have 1M token capacity and must provide concise analysis within 40K output limits.

CONTEXT:
- Current signals: {current_signals}
- Recent signal history: {signal_history}
- Agent status: {agent_status}
- System resources: {system_resources}

TASK:
Analyze the provided signals and provide:
1. Signal pattern recognition
2. Agent coordination assessment
3. Blocker identification
4. Progress evaluation
5. Recommendations for Orchestrator

CONSTRAINTS:
- Maximum 40K tokens output
- Focus on actionable insights
- Prioritize critical signals
- Use musical context if audio enabled (from PRP-007-D/E)

SIGNAL CLASSIFICATION GUIDE:
- [bb], [ff] = Critical blockers requiring immediate attention
- [dp], [tp] = Development progress indicators
- [tg], [cq] = Testing and validation status
- [oa], [pc] = Coordination signals requiring orchestrator attention
- [af], [gg] = Decision requests needing clarification

ANALYSIS FORMAT:
## Signal Summary
[Concise overview of current signal state]

## Critical Issues
[Blockers and urgent concerns]

## Agent Coordination Status
[Agent activity and collaboration status]

## Progress Assessment
[Overall progress and trends]

## Recommendations
[Specific actions for Orchestrator consideration]

## Musical Context (if applicable)
[Audio feedback patterns and musical interpretation]
"""
```

#### Agent Status Assessment Prompts
```prompt
AGENT_STATUS_PROMPT = """
You are analyzing agent status within the Inspector layer (1M token capacity, 40K output limit).

AGENT DATA:
{agent_data}

SYSTEM CONTEXT:
{system_context}

ANALYSIS REQUIREMENTS:
1. Agent health and performance assessment
2. Task completion status evaluation
3. Collaboration and coordination analysis
4. Resource utilization review
5. Bottleneck identification

AGENT TYPES:
- robo-system-analyst: Analysis and requirements work
- robo-developer: Implementation and coding tasks
- robo-aqa: Testing and quality assurance
- robo-ux-ui-designer: Design and user experience
- robo-devops-sre: Infrastructure and deployment
- orchestrator: Coordination and decision-making

STATUS INDICATORS:
- SPAWNING: Agent starting up, initializing
- RUNNING: Agent actively working on tasks
- IDLE: Agent waiting for work or completed tasks
- ERROR: Agent encountered issues needing attention

OUTPUT FORMAT:
## Agent Status Summary
[Overall agent health and activity overview]

## Individual Agent Assessment
[Status and performance for each active agent]

## Coordination Analysis
[Agent collaboration and workflow status]

## Resource Utilization
[System resource usage and optimization opportunities]

## Issues and Blockers
[Problems affecting agent performance]

## Recommendations
[Actions to improve agent efficiency and coordination]
"""
```

#### Orchestrator Decision Support Prompts
```prompt
ORCHESTRATOR_DECISION_PROMPT = """
You are providing decision support for the Orchestrator layer (200K token capacity).

CURRENT STATE:
{current_state}

INSPECTOR ANALYSIS:
{inspector_analysis}

SIGNAL PATTERNS:
{signal_patterns}

DECISION CONTEXT:
The Orchestrator needs to make informed decisions about:
1. Task prioritization and assignment
2. Resource allocation and coordination
3. Workflow optimization
4. Risk mitigation
5. Quality assurance

DECISION FRAMEWORK:
Consider:
- Urgency vs. importance matrix
- Resource availability and constraints
- Dependencies and blocking factors
- Quality and compliance requirements
- Timeline and milestone considerations

OUTPUT REQUIREMENTS:
- Clear recommendation with reasoning
- Risk assessment and mitigation strategies
- Resource requirements and allocation
- Success metrics and validation criteria
- Alternative approaches if primary recommendation fails

FORMAT:
## Recommended Action
[Clear, actionable recommendation]

## Rationale
[Reasoning behind the recommendation]

## Risk Assessment
[Potential risks and mitigation strategies]

## Resource Requirements
[Resources needed for implementation]

## Success Criteria
[Measurable outcomes for validation]

## Alternatives
[Backup plans if primary approach fails]

## Timeline
[Implementation timeline and milestones]
"""
```

### Decision Rules & Logic

#### Signal Prioritization Rules
```typescript
// Signal Priority Decision Matrix
class SignalPriorityRules {
  prioritizeSignals(signals: EnrichedSignal[]): PrioritizedSignal[] {
    return signals.map(signal => ({
      ...signal,
      priority: this.calculatePriority(signal),
      urgency: this.calculateUrgency(signal),
      impact: this.calculateImpact(signal),
      actionRequired: this.determineActionRequired(signal)
    })).sort((a, b) => b.priority - a.priority);
  }

  private calculatePriority(signal: EnrichedSignal): number {
    const basePriorities = {
      'bb': 10, // Blocker - highest priority
      'ff': 10, // Fatal error
      'ic': 9,  // Incident
      'JC': 9,  // Jesus Christ (incident resolved)
      'af': 7,  // Feedback request
      'gg': 7,  // Goal clarification
      'oa': 6,  // Orchestrator attention
      'dp': 5,  // Development progress
      'tg': 5,  // Tests green
      'bf': 4,  // Bug fixed
      'rc': 4,  // Research complete
      'rp': 3,  // Ready for preparation
      'vr': 3,  // Validation required
      'er': 2,  // Experiment required
      'vp': 2,  // Verification plan
      'ip': 2,  // Implementation plan
      'tp': 1,  // Tests prepared
      'cq': 1,  // Code quality
      'cp': 1   // CI passed
    };

    return basePriorities[signal.type] || 1;
  }

  private determineActionRequired(signal: EnrichedSignal): string {
    const actionMap = {
      'bb': 'immediate_resolution_required',
      'ff': 'emergency_response_required',
      'af': 'user_input_needed',
      'gg': 'clarification_needed',
      'oa': 'orchestrator_coordination_needed',
      'dp': 'acknowledge_and_track',
      'tg': 'acknowledge_success',
      'bf': 'update_tracking',
      'rc': 'review_findings',
      'rp': 'prepare_for_implementation',
      'vr': 'schedule_validation',
      'er': 'allocate_research_resources',
      'vp': 'develop_verification_plan',
      'ip': 'create_implementation_plan',
      'tp': 'prepare_test_environment',
      'cq': 'continue_development',
      'cp': 'proceed_to_next_phase'
    };

    return actionMap[signal.type] || 'log_and_monitor';
  }
}
```

#### Agent Coordination Rules
```typescript
// Agent Coordination Decision Logic
class AgentCoordinationRules {
  analyzeAgentCoordination(agents: AgentStatus[], signals: Signal[]): CoordinationAnalysis {
    const activeAgents = agents.filter(a => a.status === 'RUNNING');
    const blockedAgents = agents.filter(a => a.status === 'ERROR');
    const idleAgents = agents.filter(a => a.status === 'IDLE');

    return {
      coordinationHealth: this.calculateCoordinationHealth(activeAgents),
      bottlenecks: this.identifyBottlenecks(signals, agents),
      resourceAllocation: this.optimizeResourceAllocation(activeAgents, signals),
      collaborationOpportunities: this.identifyCollaborationOpportunities(activeAgents),
      recommendedActions: this.generateCoordinationRecommendations(agents, signals)
    };
  }

  private calculateCoordinationHealth(activeAgents: AgentStatus[]): number {
    // Health score based on agent distribution and task balance
    const agentTypes = [...new Set(activeAgents.map(a => a.type))];
    const typeBalance = agentTypes.length / 6; // 6 total agent types
    const workloadBalance = this.calculateWorkloadBalance(activeAgents);

    return (typeBalance + workloadBalance) / 2;
  }

  private identifyBottlenecks(signals: Signal[], agents: AgentStatus[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Look for blocker signals
    const blockerSignals = signals.filter(s => s.type === 'bb');
    blockerSignals.forEach(signal => {
      bottlenecks.push({
        type: 'signal_blocker',
        description: signal.context || 'Blocker detected',
        affectedAgents: this.findAffectedAgents(signal, agents),
        severity: 'high',
        recommendedAction: 'immediate_attention_required'
      });
    });

    // Look for agent errors
    const errorAgents = agents.filter(a => a.status === 'ERROR');
    errorAgents.forEach(agent => {
      bottlenecks.push({
        type: 'agent_error',
        description: `Agent ${agent.type} in error state`,
        affectedAgents: [agent],
        severity: 'medium',
        recommendedAction: 'troubleshoot_agent'
      });
    });

    return bottlenecks;
  }
}
```

### Integration Patterns & Best Practices

#### Event Bus Integration Patterns
```typescript
// Standard Event Bus Integration Pattern
class EventBusIntegration {
  // Standard event format for Scanner → Inspector communication
  createStandardEvent(type: string, data: any, priority: number = 5): InspectorEvent {
    return {
      id: this.generateEventId(),
      type,
      timestamp: new Date(),
      data,
      priority,
      source: 'scanner',
      metadata: {
        version: '1.0',
        schema: 'inspector_event_v1'
      }
    };
  }

  // Event routing based on type and priority
  routeEvent(event: InspectorEvent): string[] {
    const routes = {
      'signal_detected': ['signal_analysis_adapter'],
      'agent_status_change': ['agent_monitoring_adapter'],
      'system_resource_alert': ['resource_monitoring_adapter'],
      'git_commit': ['version_control_adapter'],
      'tmux_session_change': ['session_monitoring_adapter'],
      'critical_error': ['emergency_handler_adapter', 'orchestrator_alert_adapter']
    };

    return routes[event.type] || ['default_adapter'];
  }
}
```

#### Error Handling Patterns
```typescript
// Standardized Error Handling for Scanner Layer
class ScannerErrorHandling {
  handleParsingError(error: Error, context: ParsingContext): void {
    const errorEvent: InspectorEvent = {
      id: this.generateEventId(),
      type: 'scanner_parsing_error',
      timestamp: new Date(),
      data: {
        error: error.message,
        context: context.filePath,
        line: context.lineNumber,
        recovery: this.determineRecoveryStrategy(error)
      },
      priority: 'medium',
      source: 'scanner'
    };

    this.emitEvent(errorEvent);
  }

  private determineRecoveryStrategy(error: Error): string {
    if (error.message.includes('ENOENT')) {
      return 'file_not_found_retry';
    } else if (error.message.includes('EACCES')) {
      return 'permission_error_skip';
    } else if (error.message.includes('regex')) {
      return 'parsing_error_fallback';
    }
    return 'unknown_error_log';
  }
}
```

## 🚨 Critical Anti-Patterns Identified

### 1. False Completion Signals

**Pattern**: Agents marking work as complete without actual implementation

**Example from PRP-007-signal-system-implemented.md**:
```
[oa] Orchestrator Attention - Signal system operational
[rp] Ready for Preparation - Implementation ready
[dA] Done Assessment - Signal detection operational
```

**Reality**: Zero working code, only theoretical frameworks

**Prevention Strategy**:
- Completion signals require demonstrable working code
- Regular validation checkpoints with objective criteria
- "Show me the code" validation for all completion claims

### 2. Architecture-First, Implementation-Never

**Pattern**: Creating extensive theoretical architectures without building actual components

**Example**: 2800+ lines of theoretical signal system with zero implementation

**Prevention Strategy**:
- Start with minimal working implementation
- Build architecture around working code, not vice versa
- Validate architectural decisions with actual code

### 3. Parallel Scope Creep

**Pattern**: Multiple agents working on overlapping problems without clear boundaries

**Example**: 6 PRP files covering similar signal system ground

**Prevention Strategy**:
- Clear, non-overlapping scope definitions
- Regular coordination meetings between parallel agents
- Single source of truth for each major component

### 4. Documentation-Driven Development

**Pattern**: Writing extensive documentation instead of implementing features

**Example**: PRP files with 2000+ lines of documentation and zero lines of working code

**Prevention Strategy**:
- Code-first approach: implement, then document
- Minimal documentation for working features
- Documentation as result, not driver of development

## ✅ Best Practices for Parallel Agent Work

### 1. Clear Scope Definition

**Before starting parallel work, define**:
- Clear boundaries for each agent's responsibilities
- Non-overlapping work packages
- Clear interfaces between components
- Success criteria for each work package

**Template for Scope Definition**:
```markdown
## Agent: [Agent Name]
## Primary Responsibility: [Clear, single focus]
## Boundaries: [What this agent will NOT do]
## Dependencies: [What this agent needs from others]
## Deliverables: [Specific, measurable outcomes]
## Validation Criteria: [How to verify completion]
```

### 2. Coordination Framework

**Establish coordination mechanisms**:
- Daily check-in meetings (15 minutes max)
- Clear communication channels
- Conflict resolution procedures
- Integration testing schedules

**Coordination Signals**:
- `[pc] Parallel Coordination Needed` - When agents need to sync
- `[fo] File Ownership Conflict` - When boundary issues arise
- `[cc] Component Coordination` - When integration is needed

### 3. Validation Strategy

**Implement continuous validation**:
- Daily completion validation
- Weekly integration testing
- End-of-sprint demonstration
- Objective completion criteria

**Validation Checklist**:
- [ ] Working code exists and runs
- [ ] Integration points tested
- [ ] No conflicts with other agents' work
- [ ] Documentation reflects actual implementation
- [ ] Signal claims are verifiable

### 4. Signal Hygiene

**Maintain signal integrity**:
- Signals only for actual, verifiable progress
- No theoretical or planned work signals
- Clear evidence requirements for each signal type
- Regular signal audit and validation

**Signal Evidence Requirements**:
- `[dA] Done Assessment` - Must have working demonstration
- `[rp] Ready for Preparation` - Must have complete, tested implementation
- `[rc] Research Complete` - Must have actionable research findings
- `[dp] Development Progress` - Must have running code components

## 🎯 Guidelines for Future Parallel Work

### Phase 1: Preparation (Never Skip)

1. **Clear Goal Definition**: Single, measurable objective
2. **Scope Breakdown**: Logical, non-overlapping work packages
3. **Agent Assignment**: Clear ownership of each work package
4. **Interface Definition**: Clear contracts between components
5. **Validation Plan**: Objective criteria for success

**Preparation Checklist**:
- [ ] Single, clear project goal defined
- [ ] Work packages have clear boundaries
- [ ] Each agent has specific responsibilities
- [ ] Integration points identified and defined
- [ ] Validation criteria established
- [ ] Communication channels established
- [ ] Conflict resolution process defined

### Phase 2: Execution (With Continuous Validation)

1. **Regular Check-ins**: Daily stand-ups, weekly reviews
2. **Progress Validation**: Objective verification of claims
3. **Integration Testing**: Regular integration of parallel work
4. **Conflict Resolution**: Quick resolution of boundary issues
5. **Signal Hygiene**: Honest, accurate progress reporting

**Execution Checklist**:
- [ ] Daily coordination meetings held
- [ ] Progress claims validated with evidence
- [ ] Integration testing performed regularly
- [ ] Conflicts resolved quickly
- [ ] Signals reflect actual progress only

### Phase 3: Integration (Careful Merging)

1. **Integration Planning**: Detailed plan for combining parallel work
2. **Conflict Resolution**: Final resolution of any remaining conflicts
3. **Testing**: Comprehensive testing of integrated system
4. **Documentation**: Update documentation to reflect actual implementation
5. **Validation**: Final validation that all requirements are met

**Integration Checklist**:
- [ ] Integration plan created and reviewed
- [ ] All conflicts resolved
- [ ] Integrated system tested thoroughly
- [ ] Documentation updated to match implementation
- [ ] Final validation completed successfully

## 📋 Specific Guidelines for PRP Management

### PRP Creation Guidelines

1. **One PRP, One Focus**: Each PRP should address a single, clear objective
2. **Achievable Scope**: Scope should be achievable within a single sprint
3. **Clear Dependencies**: Dependencies on other PRPs should be explicit
4. **Realistic Timeline**: Implementation timeline should account for complexity
5. **Validation Criteria**: Clear, objective criteria for completion

### PRP Progress Guidelines

1. **Honest Reporting**: Progress should reflect actual work completed
2. **Evidence-Based Claims**: All progress claims should have supporting evidence
3. **Regular Updates**: Progress should be updated regularly
4. **Signal Integrity**: Signals should only be used for actual, verifiable progress
5. **Issue Tracking**: Blockers and issues should be documented promptly

### PRP Completion Guidelines

1. **Working Code**: Completion requires working, tested code
2. **Integration Testing**: Components must work together
3. **Documentation**: Documentation must reflect actual implementation
4. **Validation**: All DoD criteria must be met
5. **Clean Handoff**: Clean handoff to next phase or team

## 🚨 Warning Signs to Watch For

### Red Flags in Parallel Work

1. **Extensive Documentation, No Code**: More writing than coding
2. **Theoretical Architecture**: Complex architectures without working examples
3. **Vague Progress Reports**: Progress claims without specific evidence
4. **Boundary Conflicts**: Multiple agents working on same problems
5. **Communication Gaps**: Lack of regular coordination

**When to Intervene**:
- Immediately when false completion signals detected
- When boundary conflicts arise
- When communication breaks down
- When progress stalls without clear explanation
- When integration issues emerge

### Recovery Strategies

1. **Stop and Assess**: Pause work and assess actual progress
2. **Re-scope**: Reduce scope to achievable targets
3. **Consolidate**: Merge related work into single focus
4. **Validate**: Implement strict validation of all claims
5. **Refocus**: Realign on practical, achievable goals

## 🎯 Success Metrics for Parallel Work

### Process Metrics

- **Coordination Efficiency**: Time spent in coordination vs. productive work
- **Conflict Resolution Speed**: Time to resolve boundary issues
- **Validation Success Rate**: Percentage of progress claims that validate
- **Integration Success**: Smooth integration of parallel work

### Quality Metrics

- **Code Quality**: Working, tested code vs. theoretical documentation
- **Signal Accuracy**: Accuracy of completion signals
- **Integration Quality**: Quality of integrated system
- **Documentation Accuracy**: Documentation matches implementation

### Outcome Metrics

- **Goal Achievement**: Primary objectives achieved
- **Timeline Adherence**: Work completed within expected timeframe
- **Stakeholder Satisfaction**: Stakeholders satisfied with results
- **Lessons Learned: Clear documentation of lessons learned**

## 🔗 Related Documents

### Internal References
- **PRP-007-signal-system-implemented-REVIEW.md**: Detailed analysis of what went wrong
- **PRP-007-F-signal-sensor-inspector-orchestrator-tools.md**: Corrected approach to signal system
- **AGENTS.md**: Official signal definitions and usage guidelines

### External References
- **The Mythical Man-Month**: Lessons on team coordination and communication
- **Agile Development Principles**: Iterative development and validation
- **Systems Engineering**: Managing complex system development

## 📈 Continuous Improvement

### Review Process

1. **Weekly Reviews**: Regular review of parallel work effectiveness
2. **Retrospectives**: Post-project analysis of what worked and what didn't
3. **Guideline Updates**: Regular updates to these guidelines based on experience
4. **Training**: Ongoing training on effective parallel work practices

### Knowledge Capture

1. **Document Everything**: Capture all lessons learned and decisions
2. **Share Best Practices**: Share effective patterns and approaches
3. **Update Guidelines**: Keep guidelines current with experience
4. **Mentor Others**: Share knowledge with new team members

---

**Primary Purpose**: Prevent future parallel work failures through clear guidelines and lessons learned.

**Success Criteria**: Future parallel work is coordinated, validated, and produces working results rather than theoretical documentation.

**Key Takeaway**: Parallel work requires more coordination, not less. Clear boundaries, regular validation, and honest progress reporting are essential for success.
