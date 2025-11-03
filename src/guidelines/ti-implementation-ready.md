# Implementation Ready Guideline

## Overview
Handles [Ti] signals when developers complete implementation and need AQA inspection against PRP requirements.

## Signal Protocol
- **Signal**: [Ti] - Implementation Ready
- **Source**: robo-developer
- **Target**: robo-aqa
- **Trigger**: Implementation complete, tests passing

## Workflow Steps

### 1. Receive [Ti] Signal
When developer emits [Ti] signal:
- Extract implementation file locations
- Identify associated PRP requirements
- Load test status and coverage reports
- Understand feature scope and boundaries

### 2. Validate Implementation Behavior
Test actual implementation against PRP:
- Execute functional tests to verify behavior
- Validate business rules and logic
- Check error handling and edge cases
- Verify performance and security requirements

### 3. Compare with PRP Requirements
Systematically validate:
- All functional requirements implemented correctly
- Acceptance criteria are met
- Business rules are properly enforced
- Non-functional requirements are satisfied

### 4. Identify Inconsistencies
Look for gaps between:
- Expected behavior (PRP) and actual behavior (implementation)
- Required features and implemented features
- Business rules and implemented logic
- User experience requirements and actual UX

### 5. Emit Appropriate Response
Based on validation results:
- **[Td]**: If all good, request E2E tests
- **[Qb]**: If bugs found, report to developer
- **[Qp]**: If PRP unclear, request clarification

## Validation Checklist
- [ ] All PRP functional requirements implemented
- [ ] Acceptance criteria are satisfied
- [ ] Business rules work correctly
- [ ] Error scenarios handled properly
- [ ] Performance meets requirements
- [ ] Security requirements satisfied
- [ ] User experience matches expectations

## Common Findings
- Missing business logic for edge cases
- Incorrect error handling
- Performance below PRP specifications
- Security vulnerabilities
- UX inconsistencies with requirements

## Expected Outcomes
- Implementation is validated against PRP requirements
- Any inconsistencies are identified and reported
- AQA can proceed with E2E test creation
- Quality assurance process continues

## Related Signals
- **[Td]**: E2E test request if implementation validates
- **[Qb]**: Quality bug report if issues found
- **[Qp]**: PRP clarification if requirements unclear
- **[Ta]**: Test assessment if tests need improvement