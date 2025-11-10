# Test Assessment Guideline

## Overview
Handles [Ta] signals when AQA completes test verification and provides feedback to developers.

## Signal Protocol
- **Signal**: [Ta] - Test Assessment
- **Source**: robo-aqa
- **Target**: robo-developer
- **Trigger**: Test verification completed

## Workflow Steps

### 1. Complete Test Verification
After receiving [Tt] signal:
- Analyze test coverage against PRP requirements
- Identify gaps and missing test scenarios
- Suggest improvements for test quality
- Validate test structure and best practices

### 2. Generate Assessment Report
Create comprehensive feedback including:
- Test coverage percentage for PRP requirements
- Missing requirements or acceptance criteria
- Test quality improvements needed
- Best practice recommendations

### 3. Emit Assessment Signal
Based on verification results:
- **Approval**: Tests are comprehensive and ready for implementation
- **Needs Changes**: Specific improvements required with clear guidance

### 4. Provide Actionable Feedback
For each improvement needed:
- Specify exactly what to add or change
- Reference PRP requirements that need coverage
- Provide examples of good test patterns
- Explain business reasoning behind suggestions

## Assessment Criteria

### Approval Requirements
- 100% of PRP requirements covered
- Tests focus on business behavior
- Clear, readable test descriptions
- Proper error scenario coverage
- No implementation detail testing

### Common Improvement Areas
- Missing edge cases from PRP
- Tests too technical/implementation-focused
- Insufficient error condition testing
- Unclear test descriptions
- Missing business rule validation

## Response Format
```typescript
interface TestAssessment {
  testFilePath: string;
  approvalStatus: 'approved' | 'needs-changes';
  prpCoverage: number; // Percentage of PRP requirements covered
  improvements: TestImprovement[];
  missingRequirements: string[];
  suggestions: string[];
}
```

## Expected Outcomes
- Developer receives clear, actionable feedback
- Tests are improved to meet quality standards
- 100% PRP coverage is achieved
- Implementation can proceed with confidence

## Related Signals
- **[Tt]**: Original test verification request
- **[Ti]**: Implementation Ready signal after improvements
- **[Qb]**: Quality Bug if deeper issues found