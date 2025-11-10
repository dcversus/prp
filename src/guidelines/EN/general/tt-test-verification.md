# Test Verification Guideline

## Overview
Handles [Tt] signals when developers write tests and need AQA verification before implementation.

## Configuration
```yaml
guideline:
  name: tt-test-verification
  enabled: true
  priority: high
  signalPattern: "\\[Tt\\]"
  targetAgent: robo-aqa
  sourceAgent: robo-developer

  rules:
    - id: "test-coverage"
      description: "Ensure test coverage meets minimum requirements"
      threshold: 90
      mandatory: true
    - id: "prp-mapping"
      description: "Validate tests map to PRP requirements"
      mandatory: true
    - id: "test-quality"
      description: "Check test structure and best practices"
      mandatory: true

  customRules:
    - "Ensure test coverage > 90%"
    - "Validate PRP requirement mapping"
    - "Check for business scenario coverage"

  timeouts:
    verification: 300000  # 5 minutes
    improvement: 600000   # 10 minutes

  outputs:
    - "test-coverage-report"
    - "prp-mapping-validation"
    - "improvement-recommendations"
```

## Signal Protocol
- **Signal**: [Tt] - Test Verification Required
- **Source**: robo-developer
- **Target**: robo-aqa
- **Trigger**: Tests written, need AQA verification

## Workflow Steps

### 1. Receive [Tt] Signal
When developer emits [Tt] signal with test information:
- Extract test file path and test cases
- Identify associated PRP requirements
- Load current test implementation
- Verify test structure and coverage

### 2. Verify Test Coverage
Check that tests cover:
- 100% of PRP functional requirements
- All acceptance criteria from PRP
- Business rules and edge cases
- Error conditions and validation
- Success scenarios

### 3. Improve Test Quality
Enhance tests to be:
- Business-focused rather than implementation-focused
- Behavior-driven rather than technical
- Readable and maintainable
- Comprehensive yet concise

### 4. Emit Response Signal
Based on verification results:
- **[Ta] with approval**: Tests are comprehensive and ready
- **[Ta] with improvements**: Tests need adjustments before implementation

## Validation Checklist
- [ ] All PRP requirements have corresponding tests
- [ ] Tests focus on behavior, not implementation
- [ ] Test descriptions are clear and business-oriented
- [ ] Edge cases are covered without being overly technical
- [ ] Error scenarios are properly tested
- [ ] Test structure follows best practices

## Expected Outcomes
- Developer receives clear feedback on test quality
- Tests are improved to be business-focused
- 100% PRP requirement coverage is ensured
- Implementation can proceed with confidence

## Related Signals
- **[Ta]**: Test Assessment response to developer
- **[Ti]**: Implementation Ready signal from developer
- **[Qb]**: Quality Bug report if inconsistencies found