# Signal-Specific Guideline: [pr] - Pull Request Events

**Signal**: [pr] - Pull Request events
**Guideline ID**: signal-pr-pull-request-events
**Version**: 1.0.0
**Category**: development
**Priority**: high
**Enabled**: true

## Overview

This guideline defines the systematic approach for handling Pull Request events, conducting comprehensive PR analysis, validating implementation quality, and making informed decisions about PR approval, requests for changes, or escalation.

## Signal Triggers

- **New Pull Request Created**: `[pr]` signal when new PR is opened
- **Pull Request Updated**: `[pr]` signal when PR is updated with new commits
- **Pull Request Ready for Review**: `[pr]` signal when PR marked as ready for review
- **Pull Request Review Requested**: `[pr]` signal when review is specifically requested
- **Pull Request Status Change**: `[pr]` signal when PR status changes

## Response Protocol

### Phase 1: PR Data Collection & Analysis

#### Scanner Component
**File**: `scanner.py`
**Purpose**: Detect PR events and collect comprehensive PR data

```python
def detect_pr_signals(git_events, pr_database):
    """
    Detect PR-related signals and collect comprehensive data
    """
    pr_signals = []

    for event in git_events:
        if event.type == 'pull_request':
            pr_data = collect_pr_data(event.pr_number)
            signal = {
                'type': '[pr]',
                'pr_number': event.pr_number,
                'action': event.action,
                'timestamp': event.timestamp,
                'data': pr_data
            }
            pr_signals.append(signal)

    return pr_signals

def collect_pr_data(pr_number):
    """
    Collect comprehensive PR data from GitHub API
    """
    return {
        'pr_details': get_pr_details(pr_number),
        'commits': get_pr_commits(pr_number),
        'files_changed': get_pr_files(pr_number),
        'reviews': get_pr_reviews(pr_number),
        'comments': get_pr_comments(pr_number),
        'ci_status': get_ci_status(pr_number),
        'checks': get_pr_checks(pr_number)
    }
```

#### Inspector Component
**File**: `inspector.md`
**Purpose**: Analyze PR implementation completeness and quality

You are a PR Implementation Inspector. Your role is to analyze how completely and effectively the Pull Request implements the requested task.

**TASK**: Comprehensive PR analysis focusing on implementation completeness, quality, and alignment with requirements.

**CONTEXT**:
{{context}}

**PR DATA**:
- **PR Details**: {{prDetails}}
- **Commits**: {{commits}}
- **Files Changed**: {{filesChanged}}
- **Reviews**: {{reviews}}
- **Comments**: {{comments}}
- **CI Status**: {{ciStatus}}
- **Checks**: {{checks}}

**ANALYSIS FRAMEWORK**:

1. **Implementation Completeness Assessment**
   - Review PR description against actual changes
   - Identify missing requirements or features
   - Assess partial implementations
   - Validate requirement satisfaction

2. **Code Quality Evaluation**
   - Review code structure and organization
   - Assess coding standards compliance
   - Evaluate error handling and edge cases
   - Review documentation and comments

3. **Testing Coverage Analysis**
   - Assess test inclusion and coverage
   - Evaluate test quality and effectiveness
   - Review test scenarios and edge cases
   - Validate test assertions and coverage

4. **Integration and Compatibility**
   - Review integration with existing codebase
   - Assess breaking changes and compatibility
   - Evaluate dependency impacts
   - Review API changes and effects

5. **Performance and Security**
   - Identify performance implications
   - Assess security considerations
   - Review resource usage impacts
   - Evaluate scalability effects

**RESPONSE FORMAT**:
```json
{
  "implementation_analysis": {
    "task_completeness": {
      "percentage_complete": number (0-100),
      "missing_features": string[],
      "partially_implemented": string[],
      "fully_implemented": string[]
    },
    "description_alignment": {
      "match_score": number (0-100),
      "discrepancies": string[],
      "unimplemented_promises": string[],
      "additional_implementation": string[]
    },
    "code_quality": {
      "structure_rating": "excellent" | "good" | "fair" | "poor",
      "maintainability_rating": "excellent" | "good" | "fair" | "poor",
      "best_practices_followed": string[],
      "improvements_needed": string[]
    },
    "testing_assessment": {
      "tests_present": boolean,
      "test_coverage": "none" | "minimal" | "adequate" | "comprehensive",
      "test_quality": "poor" | "fair" | "good" | "excellent",
      "missing_tests": string[]
    },
    "integration_analysis": {
      "breaking_changes": string[],
      "compatibility_issues": string[],
      "integration_points": string[],
      "dependency_impacts": string[]
    },
    "performance_security": {
      "performance_implications": string[],
      "security_considerations": string[],
      "resource_impacts": string[]
    }
  },
  "priority_issues": [
    {
      "type": "critical" | "high" | "medium" | "low",
      "category": "functionality" | "quality" | "security" | "performance" | "integration",
      "description": string,
      "file": string,
      "line_number": number,
      "suggested_fix": string
    }
  ],
  "overall_assessment": {
    "ready_for_review": boolean,
    "estimated_review_complexity": "simple" | "moderate" | "complex",
    "recommended_action": "approve" | "request_changes" | "needs_discussion" | "escalate",
    "confidence_score": number (0-100)
  }
}
```

#### Inspector Schema
**File**: `inspector.py`
**Purpose**: Define structured output schema for PR analysis

```python
PR_INSPECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "implementation_analysis": {
            "type": "object",
            "properties": {
                "task_completeness": {
                    "type": "object",
                    "properties": {
                        "percentage_complete": {"type": "number", "minimum": 0, "maximum": 100},
                        "missing_features": {"type": "array", "items": {"type": "string"}},
                        "partially_implemented": {"type": "array", "items": {"type": "string"}},
                        "fully_implemented": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "description_alignment": {
                    "type": "object",
                    "properties": {
                        "match_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "discrepancies": {"type": "array", "items": {"type": "string"}},
                        "unimplemented_promises": {"type": "array", "items": {"type": "string"}},
                        "additional_implementation": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "code_quality": {
                    "type": "object",
                    "properties": {
                        "structure_rating": {"enum": ["excellent", "good", "fair", "poor"]},
                        "maintainability_rating": {"enum": ["excellent", "good", "fair", "poor"]},
                        "best_practices_followed": {"type": "array", "items": {"type": "string"}},
                        "improvements_needed": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "testing_assessment": {
                    "type": "object",
                    "properties": {
                        "tests_present": {"type": "boolean"},
                        "test_coverage": {"enum": ["none", "minimal", "adequate", "comprehensive"]},
                        "test_quality": {"enum": ["poor", "fair", "good", "excellent"]},
                        "missing_tests": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        },
        "priority_issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"enum": ["critical", "high", "medium", "low"]},
                    "category": {"enum": ["functionality", "quality", "security", "performance", "integration"]},
                    "description": {"type": "string"},
                    "file": {"type": "string"},
                    "line_number": {"type": "number"},
                    "suggested_fix": {"type": "string"}
                }
            }
        },
        "overall_assessment": {
            "type": "object",
            "properties": {
                "ready_for_review": {"type": "boolean"},
                "estimated_review_complexity": {"enum": ["simple", "moderate", "complex"]},
                "recommended_action": {"enum": ["approve", "request_changes", "needs_discussion", "escalate"]},
                "confidence_score": {"type": "number", "minimum": 0, "maximum": 100}
            }
        }
    }
}
```

### Phase 2: Structural Classification & Decision Making

#### Orchestrator Component
**File**: `orchestrator.md`
**Purpose**: Make informed decisions about PR disposition based on inspector analysis

You are a PR Review Orchestrator. Based on the Inspector's comprehensive analysis, make final decisions about the Pull Request and take appropriate actions.

**INSPECTOR ANALYSIS**:
{{inspectorAnalysis}}

**PR CONTEXT**:
{{context}}

**DECISION FRAMEWORK**:

1. **Risk Assessment**
   - Evaluate critical and high-priority issues
   - Assess impact on system stability
   - Consider breaking changes and compatibility
   - Evaluate security implications

2. **Quality Evaluation**
   - Review code quality and maintainability
   - Assess testing coverage and quality
   - Evaluate documentation completeness
   - Consider performance implications

3. **Business Value Assessment**
   - Evaluate requirement satisfaction
   - Assess user value delivered
   - Consider timeline and urgency
   - Evaluate strategic alignment

4. **Action Determination**
   - **Approve**: PR ready for merge, no blocking issues
   - **Request Changes**: Has blocking issues that need fixing
   - **Comment**: Minor issues only, can merge with suggestions
   - **Escalate**: Complex issues requiring human judgment

**EXECUTION ACTIONS**:
1. **Post Review Comments**: Provide detailed feedback
2. **Create Review**: Formal review with approval/rejection
3. **Request Changes**: Specific change requests
4. **Escalate**: Request human review when needed

**RESPONSE FORMAT**:
```json
{
  "decision_analysis": {
    "risk_assessment": {
      "overall_risk": "low" | "medium" | "high" | "critical",
      "critical_issues_count": number,
      "blocking_issues": string[],
      "impact_assessment": string
    },
    "quality_evaluation": {
      "code_quality_score": number (0-100),
      "testing_adequacy": "insufficient" | "adequate" | "comprehensive",
      "documentation_quality": "poor" | "fair" | "good" | "excellent",
      "overall_quality_score": number (0-100)
    },
    "business_value": {
      "requirement_satisfaction": number (0-100),
      "user_value_delivered": "low" | "medium" | "high",
      "strategic_alignment": "low" | "medium" | "high",
      "urgency_level": "low" | "medium" | "high"
    }
  },
  "final_decision": {
    "action": "approve" | "request_changes" | "comment" | "escalate",
    "reasoning": string,
    "confidence_level": number (0-100),
    "next_steps": string[],
    "estimated_merge_timeline": string
  },
  "execution_plan": {
    "comments_to_post": [
      {
        "type": "general" | "code_review" | "suggestion",
        "body": string,
        "file?: string,
        "line?: number"
      }
    ],
    "review_action": {
      "type": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      "body": string,
      "comments?: Array<{
        "path": string,
        "line": number,
        "body": string
      }>
    },
    "additional_actions": string[]
  }
}
```

#### Orchestrator Schema
**File**: `orchestrator.py`
**Purpose**: Define structured output schema for PR decisions

```python
PR_DECISION_SCHEMA = {
    "type": "object",
    "properties": {
        "decision_analysis": {
            "type": "object",
            "properties": {
                "risk_assessment": {
                    "type": "object",
                    "properties": {
                        "overall_risk": {"enum": ["low", "medium", "high", "critical"]},
                        "critical_issues_count": {"type": "number", "minimum": 0},
                        "blocking_issues": {"type": "array", "items": {"type": "string"}},
                        "impact_assessment": {"type": "string"}
                    }
                },
                "quality_evaluation": {
                    "type": "object",
                    "properties": {
                        "code_quality_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "testing_adequacy": {"enum": ["insufficient", "adequate", "comprehensive"]},
                        "documentation_quality": {"enum": ["poor", "fair", "good", "excellent"]},
                        "overall_quality_score": {"type": "number", "minimum": 0, "maximum": 100}
                    }
                },
                "business_value": {
                    "type": "object",
                    "properties": {
                        "requirement_satisfaction": {"type": "number", "minimum": 0, "maximum": 100},
                        "user_value_delivered": {"enum": ["low", "medium", "high"]},
                        "strategic_alignment": {"enum": ["low", "medium", "high"]},
                        "urgency_level": {"enum": ["low", "medium", "high"]}
                    }
                }
            }
        },
        "final_decision": {
            "type": "object",
            "properties": {
                "action": {"enum": ["approve", "request_changes", "comment", "escalate"]},
                "reasoning": {"type": "string"},
                "confidence_level": {"type": "number", "minimum": 0, "maximum": 100},
                "next_steps": {"type": "array", "items": {"type": "string"}},
                "estimated_merge_timeline": {"type": "string"}
            }
        },
        "execution_plan": {
            "type": "object",
            "properties": {
                "comments_to_post": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"enum": ["general", "code_review", "suggestion"]},
                            "body": {"type": "string"},
                            "file": {"type": "string"},
                            "line": {"type": "number"}
                        }
                    }
                },
                "review_action": {
                    "type": "object",
                    "properties": {
                        "type": {"enum": ["APPROVE", "REQUEST_CHANGES", "COMMENT"]},
                        "body": {"type": "string"},
                        "comments": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "path": {"type": "string"},
                                    "line": {"type": "number"},
                                    "body": {"type": "string"}
                                }
                            }
                        }
                    }
                },
                "additional_actions": {"type": "array", "items": {"type": "string"}}
            }
        }
    }
}
```

## Token Limits

- **Inspector**: 40,000 tokens
- **Orchestrator**: 30,000 tokens

## Required Tools

- **GitHub API**: Access PR data and metadata
- **File Reader**: Analyze code changes
- **Comment Generator**: Create review comments
- **Review Creator**: Submit formal reviews
- **PR Analyzer**: Comprehensive PR analysis tools

## Quality Gates

### Inspector Quality Gates
- **Data Completeness**: 100% of required PR data collected
- **Analysis Coverage**: All required analysis areas addressed
- **Issue Identification**: All critical and high issues identified
- **Clarity Score**: Analysis clarity score ≥85/100

### Orchestrator Quality Gates
- **Decision Justification**: Clear reasoning for all decisions
- **Action Appropriateness**: Actions match analysis findings
- **Risk Assessment**: Comprehensive risk evaluation completed
- **Execution Feasibility**: Planned actions are executable

## Success Criteria

1. **Comprehensive Analysis**: All aspects of PR thoroughly analyzed
2. **Quality Assessment**: Accurate evaluation of implementation quality
3. **Risk Identification**: All critical risks identified and assessed
4. **Informed Decisions**: Decisions based on thorough analysis
5. **Action Execution**: Appropriate actions taken based on decisions
6. **Documentation**: All analysis and decisions documented

## Failure Modes & Recovery

### Failure Mode: Insufficient PR Data
**Recovery**: Request additional data, use available data for preliminary analysis

### Failure Mode: Analysis Incomplete
**Recovery**: Request additional analysis time, focus on critical areas

### Failure Mode: Decision Unclear
**Recovery**: Escalate for human review, provide analysis findings

### Failure Mode: Action Execution Failed
**Recovery**: Retry action execution, escalate if needed

## Integration Points

- **Scanner Integration**: GitHub webhook integration for PR event detection
- **Inspector Integration**: Structured analysis pipeline with quality validation
- **Orchestrator Integration**: Decision-making framework with action execution
- **GitHub API Integration**: PR data collection and action execution
- **Quality System Integration**: Quality gate validation and enforcement

## Monitoring & Metrics

### Performance Metrics
- **Analysis Time**: Time from PR detection to analysis completion
- **Decision Time**: Time from analysis to decision
- **Action Time**: Time from decision to action execution
- **Accuracy Rate**: Percentage of decisions that prove correct

### Quality Metrics
- **Issue Detection Rate**: Percentage of actual issues identified
- **Decision Quality Score**: Accuracy of PR disposition decisions
- **Action Effectiveness**: Success rate of executed actions
- **User Satisfaction**: PR author satisfaction with reviews

---

*This guideline ensures comprehensive, consistent, and high-quality handling of Pull Request events with automated analysis and informed decision-making.*