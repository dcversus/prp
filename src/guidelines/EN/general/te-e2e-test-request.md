# E2E Test Request Guideline

## Overview
Handles [Te] signals when developers need story-driven E2E tests for completed features.

## Signal Protocol
- **Signal**: [Te] - E2E Test Request
- **Source**: robo-developer
- **Target**: robo-aqa
- **Trigger**: Feature implemented, needs E2E tests

## Workflow Steps

### 1. Receive [Te] Signal
When developer emits [Te] signal with feature information:
- Extract feature name and PRP ID
- Identify required user journeys
- Load business requirements and context
- Understand feature scope and boundaries

### 2. Design Story-Driven Tests
Create E2E tests that:
- Tell complete user stories from start to finish
- Cover business workflows, not technical implementation
- Focus on user experience and business value
- Include narrative descriptions of user actions

### 3. Generate Business Journey Tests
For each user story in the PRP:
- Create complete journey test
- Include success scenario and edge cases
- Add business verification points
- Ensure accessibility and usability validation

### 4. Organize Test Structure
Structure tests by:
- Business user journeys (registration, authentication, etc.)
- Complex business scenarios
- Regression tests for PRP requirements
- Visual and accessibility validation

### 5. Emit Completion Signal
- **[Td]**: E2E Tests Complete with test file locations and coverage

## Test Design Principles
- **Story-driven**: Each test tells a complete user story
- **Business-focused**: Test business outcomes, not technical details
- **User-centric**: Test from user perspective
- **Comprehensive**: Cover all user journeys from PRP
- **Maintainable**: Clear, readable test descriptions

## Validation Checklist
- [ ] All user stories from PRP have corresponding E2E tests
- [ ] Tests are narrative and story-driven
- [ ] No technical implementation testing in E2E
- [ ] Business workflows are completely covered
- [ ] Accessibility is validated in user context
- [ ] Error scenarios are tested from user perspective

## Expected Outcomes
- Complete E2E test suite covering all PRP user journeys
- Story-driven tests that validate business requirements
- User-focused validation of feature functionality
- Clear documentation of business workflows

## Related Signals
- **[Td]**: E2E Tests Complete notification to developer
- **[Qb]**: Quality Bug if implementation doesn't match PRP
- **[Qp]**: PRP Clarification if requirements are unclear