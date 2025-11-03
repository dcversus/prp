# Quality Bug Report Guideline

## Overview
Handles [Qb] signals when AQA discovers inconsistencies between implementation and PRP requirements.

## Signal Protocol
- **Signal**: [Qb] - Quality Bug Report
- **Source**: robo-aqa
- **Target**: robo-developer or robo-system-analyst
- **Trigger**: Implementation-PRP inconsistency found

## Workflow Steps

### 1. Identify Inconsistencies
During testing or verification:
- Compare actual behavior with PRP requirements
- Document specific mismatches
- Assess severity and impact
- Determine root cause

### 2. Classify Bug Type
Determine appropriate target:
- **Implementation Bug**: Send to robo-developer
- **Requirement Issue**: Send to robo-system-analyst
- **Both**: Send to both with clear separation

### 3. Create Bug Report
Include comprehensive information:
- PRP requirement ID and description
- Expected behavior vs actual behavior
- Steps to reproduce
- Severity assessment
- Suggested resolution approach

### 4. Emit Signal with Context
Provide detailed payload:
- Implementation file locations
- PRP references
- Inconsistency details
- Severity and impact assessment

## Bug Classification

### Implementation Bugs (to Developer)
- Functional behavior doesn't match PRP
- Missing features from requirements
- Incorrect business logic implementation
- Performance below PRP specifications

### Requirement Issues (to System Analyst)
- PRP requirements are unclear or contradictory
- Missing acceptance criteria
- Incomplete business rules
- Ambiguous specifications

### Mixed Issues (to Both)
- Implementation reveals requirement gaps
- Technical constraints affect requirements
- PRP needs clarification based on implementation

## Severity Levels
- **Critical**: Blocks core functionality, security issues
- **High**: Major feature gaps, significant UX problems
- **Medium**: Minor inconsistencies, edge case issues
- **Low**: Cosmetic issues, documentation gaps

## Expected Outcomes
- Inconsistencies are clearly documented and communicated
- Appropriate team members take corrective action
- PRP requirements are clarified if needed
- Implementation aligns with business requirements

## Related Signals
- **[Tt]**: May trigger new test verification
- **[Qp]**: PRP clarification request to system analyst
- **[Ti]**: Implementation ready after fixes