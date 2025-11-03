# E2E Tests Complete Guideline

## Overview
Handles [Td] signals when AQA completes story-driven E2E tests and notifies developers.

## Signal Protocol
- **Signal**: [Td] - E2E Tests Complete
- **Source**: robo-aqa
- **Target**: robo-developer
- **Trigger**: E2E tests written and passing

## Workflow Steps

### 1. Complete E2E Test Creation
After receiving [Te] signal:
- Create comprehensive story-driven tests
- Cover all user journeys from PRP
- Ensure business workflow validation
- Validate accessibility and usability

### 2. Verify Test Coverage
Confirm complete coverage:
- All user stories have corresponding E2E tests
- Business workflows are thoroughly tested
- Success scenarios and edge cases covered
- Visual and accessibility validation included

### 3. Execute Test Suite
Run complete E2E test suite:
- Validate all tests pass consistently
- Check for flaky tests or instability
- Verify test execution time is reasonable
- Ensure cross-browser compatibility if applicable

### 4. Generate Completion Report
Create comprehensive summary:
- List of all E2E test files created
- Business journeys covered
- Test coverage metrics
- Any issues or limitations found

### 5. Emit Completion Signal
Send [Td] signal with:
- E2E test file locations
- Business journey coverage details
- Test coverage percentages
- Any recommendations or concerns

## Test Organization Structure
```
tests/e2e/
├── journeys/
│   ├── feature-name/
│   │   ├── user-story-1.test.ts
│   │   ├── user-story-2.test.ts
│   │   └── edge-scenarios.test.ts
├── scenarios/
│   ├── complex-workflows.test.ts
│   └── business-scenarios.test.ts
├── regression/
│   └── all-acceptance-criteria.test.ts
└── visual/
    ├── accessibility-journeys.test.ts
    └── mobile-journeys.test.ts
```

## Quality Assurance Checklist
- [ ] All PRP user stories have E2E tests
- [ ] Tests are story-driven and business-focused
- [ ] No technical implementation testing in E2E
- [ ] All tests pass consistently
- [ ] Cross-browser/device compatibility verified
- [ ] Accessibility validated in user context
- [ ] Performance meets expectations
- [ ] Error scenarios tested from user perspective

## Expected Outcomes
- Developer receives notification of E2E test completion
- Complete test coverage for all business journeys
- Story-driven tests validating user experience
- Ready for feature integration and release

## Related Signals
- **[Te]**: Original E2E test request
- **[Ti]**: Implementation ready for testing
- **[Qb]**: Quality bugs found during E2E testing
- **[Do]**: Definition of Done validation