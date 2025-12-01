# Signal-Specific Guideline: [dd] - Done/Definition of Done

**Signal**: [dd] - Done/Definition of Done
**Guideline ID**: signal-dd-definition-of-done
**Version**: 1.0.0
**Category**: quality
**Priority**: critical
**Enabled**: true

## Overview

This guideline defines the systematic approach for validating Definition of Done (DoD) criteria, assessing task completion quality, and ensuring all requirements are met before marking work as done. It provides comprehensive validation frameworks and quality assurance processes.

## Signal Triggers

- **Task Completion Claim**: `[dd]` signal when team claims task is done
- **DoD Validation Request**: `[dd]` signal when DoD validation is needed
- **Quality Gate Check**: `[dd]` signal when quality gates need validation
- **Readiness Assessment**: `[dd]` signal when assessing readiness for next phase
- **Completion Verification**: `[dd]` signal when verifying completion status

## Response Protocol

### Phase 1: DoD Criteria Collection & Analysis

#### Scanner Component
**File**: `scanner.py`
**Purpose**: Detect DoD validation requests and collect task information

```python
def detect_dd_signals(project_events, task_database):
    """
    Detect Done/DoD signals and collect task information
    """
    dd_signals = []

    for event in project_events:
        if event.type in ['task_completed', 'dod_validation', 'quality_gate']:
            task_data = collect_task_data(event.task_id)
            signal = {
                'type': '[dd]',
                'task_id': event.task_id,
                'action': event.action,
                'timestamp': event.timestamp,
                'data': task_data
            }
            dd_signals.append(signal)

    return dd_signals

def collect_task_data(task_id):
    """
    Collect comprehensive task data for DoD validation
    """
    return {
        'task_details': get_task_details(task_id),
        'prp_context': get_prp_context(task_id),
        'implementation_artifacts': get_implementation_artifacts(task_id),
        'test_results': get_test_results(task_id),
        'code_changes': get_code_changes(task_id),
        'documentation': get_documentation(task_id),
        'quality_metrics': get_quality_metrics(task_id),
        'dod_criteria': get_dod_criteria(task_id)
    }
```

#### Inspector Component
**File**: `inspector.md`
**Purpose**: Analyze task completion against DoD criteria

You are a DoD Validation Inspector. Your role is to thoroughly validate that a task meets all Definition of Done criteria and quality standards before it can be marked as complete.

**TASK**: Comprehensive DoD validation and completion assessment.

**CONTEXT**:
{{context}}

**TASK DATA**:
- **Task Details**: {{taskDetails}}
- **PRP Context**: {{prpContext}}
- **Implementation Artifacts**: {{implementationArtifacts}}
- **Test Results**: {{testResults}}
- **Code Changes**: {{codeChanges}}
- **Documentation**: {{documentation}}
- **Quality Metrics**: {{qualityMetrics}}
- **DoD Criteria**: {{dodCriteria}}

**VALIDATION FRAMEWORK**:

1. **Functional Requirements Validation**
   - Verify all functional requirements implemented
   - Validate requirement satisfaction completeness
   - Assess functionality against specifications
   - Review edge cases and error handling

2. **Quality Standards Compliance**
   - Review code quality and maintainability
   - Assess coding standards adherence
   - Validate documentation completeness
   - Review test coverage and quality

3. **Testing and Validation**
   - Verify all required tests are written and passing
   - Assess test coverage adequacy
   - Review test quality and effectiveness
   - Validate integration and system testing

4. **Documentation Completeness**
   - Review technical documentation completeness
   - Validate user documentation accuracy
   - Assess API documentation quality
   - Review deployment and maintenance documentation

5. **Integration and Compatibility**
   - Verify integration with existing systems
   - Assess compatibility with current environment
   - Review breaking changes and impacts
   - Validate data migration and updates

6. **Performance and Security**
   - Assess performance against requirements
   - Validate security considerations
   - Review resource utilization
   - Assess scalability implications

**RESPONSE FORMAT**:
```json
{
  "dod_validation": {
    "functional_requirements": {
      "requirements_met": number (0-100),
      "missing_requirements": string[],
      "partially_met_requirements": string[],
      "edge_cases_covered": boolean,
      "error_handling_adequate": boolean
    },
    "quality_standards": {
      "code_quality_score": number (0-100),
      "coding_standards_compliance": number (0-100),
      "maintainability_rating": "excellent" | "good" | "fair" | "poor",
      "best_practices_followed": string[],
      "quality_issues_found": string[]
    },
    "testing_validation": {
      "test_coverage_percentage": number (0-100),
      "unit_tests_passing": boolean,
      "integration_tests_passing": boolean,
      "system_tests_passing": boolean,
      "test_quality_score": number (0-100),
      "missing_tests": string[]
    },
    "documentation_review": {
      "technical_documentation_complete": boolean,
      "user_documentation_accurate": boolean,
      "api_documentation_quality": "excellent" | "good" | "fair" | "poor",
      "missing_documentation": string[],
      "documentation_issues": string[]
    },
    "integration_compatibility": {
      "integration_successful": boolean,
      "compatibility_issues": string[],
      "breaking_changes_identified": string[],
      "migration_required": boolean,
      "rollback_capability": boolean
    },
    "performance_security": {
      "performance_requirements_met": boolean,
      "security_considerations_addressed": boolean,
      "performance_issues": string[],
      "security_concerns": string[],
      "resource_utilization_acceptable": boolean
    }
  },
  "critical_blocking_issues": [
    {
      "category": "functional" | "quality" | "testing" | "documentation" | "integration" | "performance" | "security",
      "severity": "critical" | "high" | "medium" | "low",
      "description": string,
      "impact": string,
      "resolution_required": string,
      "estimated_effort": string
    }
  ],
  "overall_assessment": {
    "dod_satisfaction_percentage": number (0-100),
    "ready_for_completion": boolean,
    "additional_work_required": string[],
    "estimated_completion_time": string,
    "confidence_level": number (0-100)
  }
}
```

#### Inspector Schema
**File**: `inspector.py`
**Purpose**: Define structured output schema for DoD validation

```python
DOD_VALIDATION_SCHEMA = {
    "type": "object",
    "properties": {
        "dod_validation": {
            "type": "object",
            "properties": {
                "functional_requirements": {
                    "type": "object",
                    "properties": {
                        "requirements_met": {"type": "number", "minimum": 0, "maximum": 100},
                        "missing_requirements": {"type": "array", "items": {"type": "string"}},
                        "partially_met_requirements": {"type": "array", "items": {"type": "string"}},
                        "edge_cases_covered": {"type": "boolean"},
                        "error_handling_adequate": {"type": "boolean"}
                    }
                },
                "quality_standards": {
                    "type": "object",
                    "properties": {
                        "code_quality_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "coding_standards_compliance": {"type": "number", "minimum": 0, "maximum": 100},
                        "maintainability_rating": {"enum": ["excellent", "good", "fair", "poor"]},
                        "best_practices_followed": {"type": "array", "items": {"type": "string"}},
                        "quality_issues_found": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "testing_validation": {
                    "type": "object",
                    "properties": {
                        "test_coverage_percentage": {"type": "number", "minimum": 0, "maximum": 100},
                        "unit_tests_passing": {"type": "boolean"},
                        "integration_tests_passing": {"type": "boolean"},
                        "system_tests_passing": {"type": "boolean"},
                        "test_quality_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "missing_tests": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        },
        "critical_blocking_issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"enum": ["functional", "quality", "testing", "documentation", "integration", "performance", "security"]},
                    "severity": {"enum": ["critical", "high", "medium", "low"]},
                    "description": {"type": "string"},
                    "impact": {"type": "string"},
                    "resolution_required": {"type": "string"},
                    "estimated_effort": {"type": "string"}
                }
            }
        },
        "overall_assessment": {
            "type": "object",
            "properties": {
                "dod_satisfaction_percentage": {"type": "number", "minimum": 0, "maximum": 100},
                "ready_for_completion": {"type": "boolean"},
                "additional_work_required": {"type": "array", "items": {"type": "string"}},
                "estimated_completion_time": {"type": "string"},
                "confidence_level": {"type": "number", "minimum": 0, "maximum": 100}
            }
        }
    }
}
```

### Phase 2: Decision Making & Action Planning

#### Orchestrator Component
**File**: `orchestrator.md`
**Purpose**: Make completion decisions and plan necessary actions

You are a DoD Assessment Orchestrator. Based on the Inspector's comprehensive DoD validation, make final decisions about task completion and plan appropriate actions.

**INSPECTOR ANALYSIS**:
{{inspectorAnalysis}}

**TASK CONTEXT**:
{{context}}

**DECISION FRAMEWORK**:

1. **Blocking Issues Assessment**
   - Evaluate critical and high-severity issues
   - Assess impact on task completion
   - Determine if issues prevent completion
   - Estimate effort required for resolution

2. **Quality Standards Evaluation**
   - Review overall quality assessment
   - Assess adherence to DoD criteria
   - Evaluate quality gate compliance
   - Consider quality improvement opportunities

3. **Risk Assessment**
   - Evaluate risks of marking task complete
   - Assess impact on dependent tasks
   - Consider system stability implications
   - Evaluate user experience impact

4. **Decision Determination**
   - **Mark Done**: Task meets all DoD criteria, no blocking issues
   - **Request Additional Work**: Has blocking issues that need resolution
   - **Conditional Approval**: Minor issues that can be addressed post-completion
   - **Escalate**: Complex issues requiring expert review

**ACTION PLANNING**:
1. **Immediate Actions**: Tasks to complete before marking done
2. **Follow-up Actions**: Items to address after completion
3. **Communication Actions**: Stakeholder notifications and updates
4. **Documentation Actions**: Updates required in documentation

**RESPONSE FORMAT**:
```json
{
  "decision_analysis": {
    "blocking_issues_assessment": {
      "critical_issues_count": number,
      "high_issues_count": number,
      "total_blocking_issues": number,
      "completion_blocking": boolean,
      "resolution_complexity": "simple" | "moderate" | "complex"
    },
    "quality_evaluation": {
      "overall_dod_satisfaction": number (0-100),
      "quality_gates_passed": boolean,
      "quality_score": number (0-100),
      "improvement_opportunities": string[]
    },
    "risk_assessment": {
      "completion_risk": "low" | "medium" | "high" | "critical",
      "system_impact": "minimal" | "moderate" | "significant",
      "user_experience_impact": "none" | "minor" | "moderate" | "major",
      "dependent_task_impact": string[]
    }
  },
  "final_decision": {
    "action": "mark_done" | "request_additional_work" | "conditional_approval" | "escalate",
    "reasoning": string,
    "confidence_level": number (0-100),
    "completion_conditions": string[]
  },
  "action_plan": {
    "immediate_actions": [
      {
        "action": string,
        "description": string,
        "assigned_to": string,
        "estimated_time": string,
        "priority": "critical" | "high" | "medium" | "low"
      }
    ],
    "follow_up_actions": [
      {
        "action": string,
        "description": string,
        "timeline": string,
        "responsible": string
      }
    ],
    "communication_actions": [
      {
        "type": "notification" | "report" | "meeting",
        "audience": string,
        "message": string,
        "timing": string
      }
    ],
    "documentation_actions": [
      {
        "document_type": string,
        "updates_required": string[],
        "responsible": string,
        "deadline": string
      }
    ]
  }
}
```

#### Orchestrator Schema
**File**: `orchestrator.py`
**Purpose**: Define structured output schema for DoD decisions

```python
DOD_DECISION_SCHEMA = {
    "type": "object",
    "properties": {
        "decision_analysis": {
            "type": "object",
            "properties": {
                "blocking_issues_assessment": {
                    "type": "object",
                    "properties": {
                        "critical_issues_count": {"type": "number", "minimum": 0},
                        "high_issues_count": {"type": "number", "minimum": 0},
                        "total_blocking_issues": {"type": "number", "minimum": 0},
                        "completion_blocking": {"type": "boolean"},
                        "resolution_complexity": {"enum": ["simple", "moderate", "complex"]}
                    }
                },
                "quality_evaluation": {
                    "type": "object",
                    "properties": {
                        "overall_dod_satisfaction": {"type": "number", "minimum": 0, "maximum": 100},
                        "quality_gates_passed": {"type": "boolean"},
                        "quality_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "improvement_opportunities": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "risk_assessment": {
                    "type": "object",
                    "properties": {
                        "completion_risk": {"enum": ["low", "medium", "high", "critical"]},
                        "system_impact": {"enum": ["minimal", "moderate", "significant"]},
                        "user_experience_impact": {"enum": ["none", "minor", "moderate", "major"]},
                        "dependent_task_impact": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        },
        "final_decision": {
            "type": "object",
            "properties": {
                "action": {"enum": ["mark_done", "request_additional_work", "conditional_approval", "escalate"]},
                "reasoning": {"type": "string"},
                "confidence_level": {"type": "number", "minimum": 0, "maximum": 100},
                "completion_conditions": {"type": "array", "items": {"type": "string"}}
            }
        },
        "action_plan": {
            "type": "object",
            "properties": {
                "immediate_actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string"},
                            "description": {"type": "string"},
                            "assigned_to": {"type": "string"},
                            "estimated_time": {"type": "string"},
                            "priority": {"enum": ["critical", "high", "medium", "low"]}
                        }
                    }
                },
                "follow_up_actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string"},
                            "description": {"type": "string"},
                            "timeline": {"type": "string"},
                            "responsible": {"type": "string"}
                        }
                    }
                }
            }
        }
    }
}
```

## Token Limits

- **Inspector**: 35,000 tokens
- **Orchestrator**: 25,000 tokens

## Required Tools

- **Task Management System**: Access task details and status
- **Code Repository**: Analyze code changes and commits
- **Test Framework**: Access test results and coverage
- **Documentation System**: Review documentation completeness
- **Quality Metrics**: Access code quality and performance metrics
- **Communication Tools**: Send notifications and updates

## Quality Gates

### Inspector Quality Gates
- **Validation Completeness**: 100% of DoD criteria validated
- **Issue Identification**: All blocking issues identified
- **Assessment Accuracy**: Validation accuracy score ≥90/100
- **Documentation Quality**: All findings properly documented

### Orchestrator Quality Gates
- **Decision Justification**: Clear reasoning for all decisions
- **Action Appropriateness**: Actions match validation findings
- **Risk Assessment**: Comprehensive risk evaluation completed
- **Action Feasibility**: Planned actions are achievable

## Success Criteria

1. **Comprehensive Validation**: All DoD criteria thoroughly validated
2. **Quality Assurance**: High quality standards maintained
3. **Issue Resolution**: All blocking issues identified and addressed
4. **Informed Decisions**: Decisions based on thorough validation
5. **Action Execution**: Appropriate actions planned and executed
6. **Stakeholder Communication**: Clear communication of completion status

## Failure Modes & Recovery

### Failure Mode: Incomplete DoD Validation
**Recovery**: Conduct additional validation, focus on critical criteria

### Failure Mode: Unclear Completion Status
**Recovery**: Seek additional clarification, gather more evidence

### Failure Mode: Blocking Issues Missed
**Recovery**: Re-conduct validation, implement quality improvements

### Failure Mode: Decision Inappropriate
**Recovery**: Re-evaluate decision, consult additional experts

## Integration Points

- **Scanner Integration**: Task management system integration for DoD requests
- **Inspector Integration**: Comprehensive validation pipeline with quality checks
- **Orchestrator Integration**: Decision-making framework with action planning
- **Quality System Integration**: Quality gate validation and enforcement
- **Communication Integration**: Stakeholder notification and update systems

## Monitoring & Metrics

### Performance Metrics
- **Validation Time**: Time from request to validation completion
- **Decision Time**: Time from validation to decision
- **Action Completion**: Time from decision to action completion
- **Accuracy Rate**: Percentage of correct completion decisions

### Quality Metrics
- **DoD Satisfaction Rate**: Percentage of tasks meeting DoD criteria
- **Issue Detection Rate**: Percentage of actual issues identified
- **Quality Gate Pass Rate**: Percentage of quality gates passed
- **Stakeholder Satisfaction**: Satisfaction with completion process

---

*This guideline ensures comprehensive and consistent validation of Definition of Done criteria with automated analysis and informed decision-making for task completion.*