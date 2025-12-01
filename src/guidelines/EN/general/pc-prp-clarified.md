# PRP Clarified Guideline

## Overview
Handles [Pc] signals when system analysts complete PRP clarifications and notify AQA to update tests.

## Signal Protocol
- **Signal**: [Pc] - PRP Clarified
- **Source**: robo-system-analyst
- **Target**: robo-aqa
- **Trigger**: System analyst clarifies PRP requirements

## Workflow Steps

### 1. Receive [Pc] Signal
When system analyst emits [Pc] signal:
- Extract PRP ID and clarification details
- Load updated requirements and acceptance criteria
- Understand what changed from original requirements
- Identify impact on existing tests

### 2. Analyze Clarification Impact
Assess how clarifications affect:
- Existing unit tests coverage
- E2E test scenarios
- Test data and fixtures
- Validation logic

### 3. Update Test Suite
Apply clarifications to tests:
- Update unit tests to match clarified requirements
- Modify E2E scenarios to reflect new understanding
- Add missing test coverage for newly clarified requirements
- Remove tests for obsolete interpretations

### 4. Validate Updated Tests
Ensure test updates:
- Accurately reflect clarified requirements
- Maintain comprehensive coverage
- Pass consistently with updated requirements
- Align with business intent

### 5. Communicate Test Updates
Notify development team of test changes:
- Document test modifications
- Explain impact on implementation
- Provide guidance for any code updates needed

## Update Types and Actions

### Ambiguous Requirements Clarified
- **Action**: Update tests to match specific clarified behavior
- **Impact**: May require implementation changes
- **Example**: "Password must be strong" → Tests validate specific complexity rules

### Missing Acceptance Criteria Added
- **Action**: Add new test cases for new criteria
- **Impact**: Implementation may need additional features
- **Example**: Add test for user role validation if new criteria added

### Contradictions Resolved
- **Action**: Update tests to reflect resolved requirements
- **Impact**: May require code changes to match resolution
- **Example**: Performance vs security trade-off resolved

### Business Rules Completed
- **Action**: Add comprehensive edge case testing
- **Impact**: Implementation may need additional error handling
- **Example**: Add tests for all error scenarios now specified

## Test Update Process
```typescript
interface TestUpdatePlan {
  prpId: string;
  clarifications: Clarification[];
  unitTestUpdates: TestUpdate[];
  e2eTestUpdates: TestUpdate[];
  newTestsRequired: TestRequirement[];
  obsoleteTests: string[];
}

class TestUpdateManager {
  static processClarifications(clarifications: Clarification[]): TestUpdatePlan {
    const updates: TestUpdatePlan = {
      prpId: clarifications[0].prpId,
      clarifications,
      unitTestUpdates: [],
      e2eTestUpdates: [],
      newTestsRequired: [],
      obsoleteTests: []
    };

    // Analyze each clarification for test impact
    clarifications.forEach(clarification => {
      const impact = this.analyzeTestImpact(clarification);
      updates.unitTestUpdates.push(...impact.unitTests);
      updates.e2eTestUpdates.push(...impact.e2eTests);
      updates.newTestsRequired.push(...impact.newTests);
      updates.obsoleteTests.push(...impact.obsolete);
    });

    return updates;
  }
}
```

## Validation Checklist
- [ ] All clarifications reflected in test updates
- [ ] New acceptance criteria have corresponding tests
- [ ] Test descriptions match clarified requirements
- [ ] No tests contradict clarified requirements
- [ ] Edge cases properly covered
- [ ] Implementation implications documented

## Expected Outcomes
- Tests accurately reflect clarified PRP requirements
- Comprehensive test coverage maintained
- Development team notified of test changes
- Clear guidance for implementation updates

## Related Signals
- **[Qp]**: Original clarification request
- **[Ta]**: Updated test assessment to developer
- **[Ti]**: Implementation may need updates
- **[Td]**: E2E tests updated if needed