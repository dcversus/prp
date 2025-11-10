# Signal-Specific Guideline: [tp] - Tests Prepared

**Signal**: [tp] - Tests Prepared
**Guideline ID**: signal-tp-tests-prepared
**Version**: 1.0.0
**Category**: testing
**Priority**: high
**Enabled**: true

## Overview

This guideline defines the systematic approach for validating that tests are properly prepared, comprehensive, and ready for execution. It ensures test quality, coverage adequacy, and alignment with requirements before development begins.

## Signal Triggers

- **Test Suite Ready**: `[tp]` signal when test suite is prepared
- **Test Coverage Request**: `[tp]` signal when test coverage validation needed
- **TDD Initiation**: `[tp]` signal when starting TDD cycle
- **Test Quality Check**: `[tp]` signal when test quality validation required
- **Development Readiness**: `[tp]` signal when validating test readiness for development

## Response Protocol

### Phase 1: Test Suite Analysis & Validation

#### Scanner Component
**File**: `scanner.py`
**Purpose**: Detect test preparation signals and collect test suite information

```python
def detect_tp_signals(project_events, test_database):
    """
    Detect Tests Prepared signals and collect test information
    """
    tp_signals = []

    for event in project_events:
        if event.type in ['tests_prepared', 'test_suite_ready', 'tdd_initiation', 'test_quality_check']:
            test_data = collect_test_data(event.test_suite_id)
            signal = {
                'type': '[tp]',
                'test_suite_id': event.test_suite_id,
                'action': event.action,
                'timestamp': event.timestamp,
                'data': test_data
            }
            tp_signals.append(signal)

    return tp_signals

def collect_test_data(test_suite_id):
    """
    Collect comprehensive test data for validation
    """
    return {
        'test_suite_details': get_test_suite_details(test_suite_id),
        'test_files': get_test_files(test_suite_id),
        'test_coverage': get_test_coverage(test_suite_id),
        'test_structure': get_test_structure(test_suite_id),
        'test_dependencies': get_test_dependencies(test_suite_id),
        'related_requirements': get_related_requirements(test_suite_id),
        'test_environment': get_test_environment(test_suite_id),
        'quality_metrics': get_test_quality_metrics(test_suite_id)
    }
```

#### Inspector Component
**File**: `inspector.md`
**Purpose**: Analyze test suite quality and completeness

You are a Test Quality Inspector. Your role is to thoroughly validate that test suites are properly prepared, comprehensive, and ready for execution before development begins.

**TASK**: Comprehensive test preparation validation and quality assessment.

**CONTEXT**:
{{context}}

**TEST DATA**:
- **Test Suite Details**: {{testSuiteDetails}}
- **Test Files**: {{testFiles}}
- **Test Coverage**: {{testCoverage}}
- **Test Structure**: {{testStructure}}
- **Test Dependencies**: {{testDependencies}}
- **Related Requirements**: {{relatedRequirements}}
- **Test Environment**: {{testEnvironment}}
- **Quality Metrics**: {{qualityMetrics}}

**VALIDATION FRAMEWORK**:

1. **Test Structure and Organization**
   - Review test file organization and naming
   - Validate test structure follows best practices
   - Assess test grouping and categorization
   - Review test hierarchy and relationships

2. **Test Coverage Analysis**
   - Analyze code coverage across different metrics
   - Assess requirement coverage completeness
   - Review edge case and boundary testing
   - Validate integration and system test coverage

3. **Test Quality Assessment**
   - Review test clarity and readability
   - Assess test assertion quality and completeness
   - Validate test data management and setup
   - Review test isolation and independence

4. **TDD Compliance Validation**
   - Validate red-green-refactor cycle implementation
   - Assess test-first development approach
   - Review test-driven design quality
   - Validate TDD best practices adherence

5. **Test Environment and Dependencies**
   - Validate test environment setup and configuration
   - Review test dependency management
   - Assess test data and fixture management
   - Validate test isolation and cleanup

6. **Requirements Traceability**
   - Validate traceability from requirements to tests
   - Assess test alignment with acceptance criteria
   - Review user story and use case coverage
   - Validate business logic test coverage

**RESPONSE FORMAT**:
```json
{
  "test_validation": {
    "structure_organization": {
      "file_organization_score": number (0-100),
      "naming_conventions_followed": boolean,
      "test_grouping_appropriate": boolean,
      "structural_issues": string[],
      "organization_improvements": string[]
    },
    "coverage_analysis": {
      "statement_coverage": number (0-100),
      "branch_coverage": number (0-100),
      "function_coverage": number (0-100),
      "requirement_coverage": number (0-100),
      "edge_cases_covered": boolean,
      "integration_coverage": number (0-100),
      "coverage_gaps": string[]
    },
    "quality_assessment": {
      "test_clarity_score": number (0-100),
      "assertion_quality_score": number (0-100),
      "test_data_management": "excellent" | "good" | "fair" | "poor",
      "test_isolation_score": number (0-100),
      "quality_issues": string[],
      "improvement_recommendations": string[]
    },
    "tdd_compliance": {
      "tdd_cycle_followed": boolean,
      "test_first_approach": boolean,
      "design_driven_by_tests": boolean,
      "refactoring_quality": "excellent" | "good" | "fair" | "poor",
      "tdd_violations": string[],
      "tdd_improvements": string[]
    },
    "environment_dependencies": {
      "environment_setup_valid": boolean,
      "dependency_management_appropriate": boolean,
      "fixture_management_quality": "excellent" | "good" | "fair" | "poor",
      "cleanup_adequate": boolean,
      "environment_issues": string[],
      "dependency_improvements": string[]
    },
    "requirements_traceability": {
      "traceability_matrix_complete": boolean,
      "acceptance_criteria_covered": number (0-100),
      "user_stories_tested": number (0-100),
      "business_logic_covered": number (0-100),
      "traceability_gaps": string[],
      "requirement_alignment_issues": string[]
    }
  },
  "critical_issues": [
    {
      "category": "structure" | "coverage" | "quality" | "tdd" | "environment" | "traceability",
      "severity": "critical" | "high" | "medium" | "low",
      "description": string,
      "impact": string,
      "resolution_required": string,
      "estimated_effort": string
    }
  ],
  "readiness_assessment": {
    "overall_readiness_score": number (0-100),
    "ready_for_development": boolean,
    "blocking_issues_count": number,
    "additional_preparation_needed": string[],
    "estimated_preparation_time": string,
    "confidence_level": number (0-100)
  }
}
```

#### Inspector Schema
**File**: `inspector.py`
**Purpose**: Define structured output schema for test validation

```python
TEST_VALIDATION_SCHEMA = {
    "type": "object",
    "properties": {
        "test_validation": {
            "type": "object",
            "properties": {
                "structure_organization": {
                    "type": "object",
                    "properties": {
                        "file_organization_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "naming_conventions_followed": {"type": "boolean"},
                        "test_grouping_appropriate": {"type": "boolean"},
                        "structural_issues": {"type": "array", "items": {"type": "string"}},
                        "organization_improvements": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "coverage_analysis": {
                    "type": "object",
                    "properties": {
                        "statement_coverage": {"type": "number", "minimum": 0, "maximum": 100},
                        "branch_coverage": {"type": "number", "minimum": 0, "maximum": 100},
                        "function_coverage": {"type": "number", "minimum": 0, "maximum": 100},
                        "requirement_coverage": {"type": "number", "minimum": 0, "maximum": 100},
                        "edge_cases_covered": {"type": "boolean"},
                        "integration_coverage": {"type": "number", "minimum": 0, "maximum": 100},
                        "coverage_gaps": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "quality_assessment": {
                    "type": "object",
                    "properties": {
                        "test_clarity_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "assertion_quality_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "test_data_management": {"enum": ["excellent", "good", "fair", "poor"]},
                        "test_isolation_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "quality_issues": {"type": "array", "items": {"type": "string"}},
                        "improvement_recommendations": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        },
        "critical_issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"enum": ["structure", "coverage", "quality", "tdd", "environment", "traceability"]},
                    "severity": {"enum": ["critical", "high", "medium", "low"]},
                    "description": {"type": "string"},
                    "impact": {"type": "string"},
                    "resolution_required": {"type": "string"},
                    "estimated_effort": {"type": "string"}
                }
            }
        },
        "readiness_assessment": {
            "type": "object",
            "properties": {
                "overall_readiness_score": {"type": "number", "minimum": 0, "maximum": 100},
                "ready_for_development": {"type": "boolean"},
                "blocking_issues_count": {"type": "number", "minimum": 0},
                "additional_preparation_needed": {"type": "array", "items": {"type": "string"}},
                "estimated_preparation_time": {"type": "string"},
                "confidence_level": {"type": "number", "minimum": 0, "maximum": 100}
            }
        }
    }
}
```

### Phase 2: Readiness Decision & Action Planning

#### Orchestrator Component
**File**: `orchestrator.md`
**Purpose**: Make test readiness decisions and plan improvement actions

You are a Test Readiness Orchestrator. Based on the Inspector's comprehensive test validation, make final decisions about test readiness and plan appropriate actions for improvement.

**INSPECTOR ANALYSIS**:
{{inspectorAnalysis}}

**TEST CONTEXT**:
{{context}}

**DECISION FRAMEWORK**:

1. **Critical Issues Assessment**
   - Evaluate critical and high-severity test issues
   - Assess impact on development quality
   - Determine if issues prevent development start
   - Estimate effort required for resolution

2. **Coverage Adequacy Evaluation**
   - Review overall coverage metrics against standards
   - Assess requirement coverage completeness
   - Evaluate edge case and boundary testing
   - Consider integration and system test coverage

3. **Quality Standards Compliance**
   - Review test quality against best practices
   - Assess TDD compliance and methodology
   - Evaluate test environment and dependency management
   - Consider maintainability and scalability

4. **Development Readiness Assessment**
   - Evaluate readiness for development phase
   - Assess risk of proceeding with current test suite
   - Consider impact on development velocity
   - Evaluate downstream implications

5. **Decision Determination**
   - **Approve for Development**: Tests ready, no blocking issues
   - **Request Test Improvements**: Has issues that need resolution
   - **Conditional Approval**: Minor issues acceptable for development start
   - **Escalate**: Complex issues requiring expert review

**ACTION PLANNING**:
1. **Immediate Test Improvements**: Critical fixes before development
2. **Parallel Development Actions**: Improvements during development
3. **Quality Assurance Actions**: Ongoing quality monitoring
4. **Documentation Actions**: Test documentation updates

**RESPONSE FORMAT**:
```json
{
  "decision_analysis": {
    "critical_issues_assessment": {
      "critical_issues_count": number,
      "high_issues_count": number,
      "development_blocking": boolean,
      "resolution_complexity": "simple" | "moderate" | "complex",
      "quality_risk": "low" | "medium" | "high" | "critical"
    },
    "coverage_evaluation": {
      "coverage_adequacy_score": number (0-100),
      "meets_minimum_standards": boolean,
      "coverage_gaps_critical": boolean,
      "improvement_priority": "low" | "medium" | "high",
      "coverage_improvements_needed": string[]
    },
    "quality_compliance": {
      "quality_standards_met": boolean,
      "tdd_compliance_score": number (0-100),
      "maintainability_rating": "excellent" | "good" | "fair" | "poor",
      "quality_improvement_opportunities": string[]
    },
    "development_readiness": {
      "ready_for_development": boolean,
      "development_risk": "low" | "medium" | "high",
      "velocity_impact": "minimal" | "moderate" | "significant",
      "downstream_implications": string[]
    }
  },
  "final_decision": {
    "action": "approve_for_development" | "request_test_improvements" | "conditional_approval" | "escalate",
    "reasoning": string,
    "confidence_level": number (0-100),
    "development_conditions": string[],
    "timeline_impact": string
  },
  "action_plan": {
    "improvements_before_development": [
      {
        "category": "structure" | "coverage" | "quality" | "environment",
        "action": string,
        "description": string,
        "priority": "critical" | "high" | "medium" | "low",
        "estimated_time": string,
        "assigned_to": string
      }
    ],
    "parallel_improvements": [
      {
        "action": string,
        "description": string,
        "timeline": string,
        "responsible": string,
        "integration_point": string
      }
    ],
    "quality_assurance_actions": [
      {
        "action": string,
        "description": string,
        "frequency": "continuous" | "periodic" | "milestone",
        "responsible": string,
        "success_criteria": string
      }
    ],
    "documentation_actions": [
      {
        "document_type": string,
        "updates_required": string[],
        "responsible": string,
        "deadline": string,
        "review_required": boolean
      }
    ]
  }
}
```

#### Orchestrator Schema
**File**: `orchestrator.py`
**Purpose**: Define structured output schema for test readiness decisions

```python
TEST_READINESS_DECISION_SCHEMA = {
    "type": "object",
    "properties": {
        "decision_analysis": {
            "type": "object",
            "properties": {
                "critical_issues_assessment": {
                    "type": "object",
                    "properties": {
                        "critical_issues_count": {"type": "number", "minimum": 0},
                        "high_issues_count": {"type": "number", "minimum": 0},
                        "development_blocking": {"type": "boolean"},
                        "resolution_complexity": {"enum": ["simple", "moderate", "complex"]},
                        "quality_risk": {"enum": ["low", "medium", "high", "critical"]}
                    }
                },
                "coverage_evaluation": {
                    "type": "object",
                    "properties": {
                        "coverage_adequacy_score": {"type": "number", "minimum": 0, "maximum": 100},
                        "meets_minimum_standards": {"type": "boolean"},
                        "coverage_gaps_critical": {"type": "boolean"},
                        "improvement_priority": {"enum": ["low", "medium", "high"]},
                        "coverage_improvements_needed": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        },
        "final_decision": {
            "type": "object",
            "properties": {
                "action": {"enum": ["approve_for_development", "request_test_improvements", "conditional_approval", "escalate"]},
                "reasoning": {"type": "string"},
                "confidence_level": {"type": "number", "minimum": 0, "maximum": 100},
                "development_conditions": {"type": "array", "items": {"type": "string"}},
                "timeline_impact": {"type": "string"}
            }
        },
        "action_plan": {
            "type": "object",
            "properties": {
                "improvements_before_development": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "category": {"enum": ["structure", "coverage", "quality", "environment"]},
                            "action": {"type": "string"},
                            "description": {"type": "string"},
                            "priority": {"enum": ["critical", "high", "medium", "low"]},
                            "estimated_time": {"type": "string"},
                            "assigned_to": {"type": "string"}
                        }
                    }
                }
            }
        }
    }
}
```

## Token Limits

- **Inspector**: 30,000 tokens
- **Orchestrator**: 20,000 tokens

## Required Tools

- **Test Framework Access**: Access test files and configurations
- **Coverage Analysis Tools**: Code coverage analysis and reporting
- **Quality Metrics**: Test quality assessment tools
- **Requirements Management**: Access to requirements and user stories
- **Documentation System**: Test documentation review and updates
- **Project Management**: Task assignment and tracking

## Quality Gates

### Inspector Quality Gates
- **Validation Completeness**: 100% of test aspects validated
- **Issue Identification**: All critical test issues identified
- **Assessment Accuracy**: Validation accuracy score ≥90/100
- **Coverage Analysis**: Comprehensive coverage analysis completed

### Orchestrator Quality Gates
- **Decision Justification**: Clear reasoning for readiness decisions
- **Action Appropriateness**: Actions match test validation findings
- **Risk Assessment**: Comprehensive development risk evaluation
- **Planning Quality**: Action plans are specific and achievable

## Success Criteria

1. **Comprehensive Test Validation**: All test aspects thoroughly validated
2. **Quality Assurance**: High test quality standards maintained
3. **Coverage Adequacy**: Sufficient coverage for development confidence
4. **Development Readiness**: Tests ready to support development phase
5. **Action Planning**: Clear improvement plans when needed
6. **Documentation**: Test preparation properly documented

## Failure Modes & Recovery

### Failure Mode: Incomplete Test Validation
**Recovery**: Conduct additional validation, focus on critical aspects

### Failure Mode: Coverage Analysis Incomplete
**Recovery**: Expand coverage analysis, use additional tools

### Failure Mode: Quality Issues Missed
**Recovery**: Implement additional quality checks, improve validation process

### Failure Mode: Readiness Decision Incorrect
**Recovery**: Monitor development progress, adjust decisions as needed

## Integration Points

- **Scanner Integration**: Test management system integration for test preparation signals
- **Inspector Integration**: Comprehensive test validation pipeline
- **Orchestrator Integration**: Readiness decision-making framework
- **Development System Integration**: Transition to development phase
- **Quality System Integration**: Ongoing quality monitoring and assurance

## Monitoring & Metrics

### Performance Metrics
- **Validation Time**: Time from test preparation to validation completion
- **Decision Time**: Time from validation to readiness decision
- **Preparation Efficiency**: Time to prepare tests for development
- **Quality Score**: Overall test preparation quality score

### Quality Metrics
- **Test Readiness Rate**: Percentage of test suites ready for development
- **Issue Detection Rate**: Percentage of test issues identified before development
- **Coverage Achievement**: Test coverage targets met
- **Development Impact**: Impact of test preparation on development quality

---

*This guideline ensures comprehensive test preparation validation with automated analysis and informed decision-making for development readiness.*