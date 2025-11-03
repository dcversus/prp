# PRP Clarification Guideline

## Overview
Handles [Qp] signals when AQA identifies unclear, incomplete, or contradictory PRP requirements during testing.

## Signal Protocol
- **Signal**: [Qp] - PRP Clarification Needed
- **Source**: robo-aqa
- **Target**: robo-system-analyst
- **Trigger**: PRP requirements unclear or conflicting

## Workflow Steps

### 1. Identify Requirement Issues
During test implementation or execution:
- Note ambiguous or unclear requirements
- Identify missing acceptance criteria
- Document contradictions between requirements
- Recognize incomplete business rules

### 2. Analyze Impact
Assess how requirement issues affect:
- Test coverage and validation
- Implementation decisions
- Business value delivery
- User experience

### 3. Generate Clarification Request
Create specific, actionable requests:
- Quote exact problematic requirement text
- Explain why it's unclear or insufficient
- Suggest specific clarifications needed
- Provide context from testing perspective

### 4. Emit Clarification Signal
Send comprehensive signal with:
- PRP ID and requirement references
- Specific clarification needs
- Testing context and constraints
- Suggested improvements

## Common Clarification Scenarios

### Ambiguous Requirements
- **Issue**: Requirement can be interpreted multiple ways
- **Request**: Specify exact expected behavior
- **Example**: "Password must be strong" → Define strength criteria

### Missing Acceptance Criteria
- **Issue**: No clear way to validate requirement completion
- **Request**: Add specific, measurable acceptance criteria
- **Example**: "User should be able to login" → Define login process steps

### Contradictory Requirements
- **Issue**: Two requirements conflict with each other
- **Request**: Resolve conflict or specify precedence
- **Example**: "Load instantly" vs "Must be secure"

### Incomplete Business Rules
- **Issue**: Edge cases or error conditions not specified
- **Request**: Define behavior for all scenarios
- **Example**: What happens when user tries to register with existing email

## Signal Payload Structure
```typescript
interface PRPClarificationRequest {
  prpId: string;
  requirementIds: string[];
  issues: ClarificationIssue[];
  testingContext: string;
  suggestedClarifications: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
}
```

## Expected Outcomes
- System analyst clarifies ambiguous requirements
- PRP is updated with missing information
- Testing can proceed with clear criteria
- Implementation aligns with business intent

## Related Signals
- **[Qb]**: Quality Bug if implementation also affected
- **[Tt]**: New test verification after PRP updates
- **[Ta]**: Test assessment with updated requirements