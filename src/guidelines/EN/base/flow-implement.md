# Base Flow Template: Implement

**Phase**: implement
**Flow ID**: base-flow-implement
**Version**: 1.0.0
**Description**: Implementation phase that executes the detailed plan, develops code, conducts reviews, and ensures quality throughout the development process.

## Overview

This flow template defines the systematic process for implementing planned tasks, following TDD principles, conducting code reviews, managing quality, and tracking progress toward completion.

## Entry Criteria

- [ ] Implementation plan approved and finalized
- [ ] Tasks broken down and prioritized
- [ ] Resources allocated and available
- [ ] Development environment prepared
- [ ] Quality gates and testing strategy defined
- [ ] Team roles and responsibilities assigned

## Exit Criteria

- [ ] All planned tasks completed according to DoD
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Quality gates passed
- [ ] Documentation updated
- [ ] Implementation verified against requirements

## Success Metrics

- **Task Completion**: 100% of tasks completed per DoD
- **Code Quality**: ≥90% code coverage, no critical issues
- **Review Completion**: 100% code review coverage
- **Test Success**: 100% tests passing
- **Timeline Adherence**: ±10% variance from planned timeline
- **Quality Score**: ≥85/100 overall implementation quality

## Flow Steps

### Step 1: Development Environment Setup
**ID**: setup-environment
**Type**: preparation
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Prepare and validate development environments for implementation.

**Triggers**:
- Implementation plan approved
- Resources assigned to project

**Actions**:
1. Set up development workspaces
2. Configure development tools and IDEs
3. Establish version control workflows
4. Set up build and deployment pipelines
5. Configure testing frameworks
6. Validate environment functionality

**Outputs**:
- Ready development environments
- Tool configurations
- Build pipeline setup
- Testing framework configuration

### Step 2: Test-Driven Development (TDD) Initiation
**ID**: initiate-tdd
**Type**: development
**Duration**: Variable (per task)
**Required**: true
**Sequential**: true

**Description**: Follow TDD methodology for each implementation task.

**Triggers**:
- Environment setup completed
- Task ready for development

**Actions**:
1. Write failing tests for task requirements
2. Run tests to confirm they fail
3. Implement minimal code to pass tests
4. Refactor code for quality and maintainability
5. Ensure all tests pass
6. Repeat for all task components

**Outputs**:
- Failing tests (Red phase)
- Working implementation (Green phase)
- Refactored quality code (Refactor phase)
- Test coverage reports

### Step 3: Code Implementation & Development
**ID**: implement-code
**Type**: development
**Duration**: Variable (per task size)
**Required**: true
**Sequential**: true

**Description**: Implement code according to specifications and requirements.

**Triggers**:
- TDD cycle initiated
- Tests defined for functionality

**Actions**:
1. Implement code following TDD principles
2. Follow coding standards and best practices
3. Write clear, maintainable code
4. Add appropriate documentation and comments
5. Handle edge cases and error conditions
6. Integrate with existing codebase

**Outputs**:
- Implemented code modules
- Unit tests
- Integration points
- Code documentation

### Step 4: Code Review Process
**ID**: conduct-code-review
**Type**: quality
**Duration**: 30-90 minutes per review
**Required**: true
**Sequential**: true

**Description**: Conduct thorough code reviews for quality and standards compliance.

**Triggers**:
- Code implementation completed
- Tests passing for implemented features

**Actions**:
1. Submit code for peer review
2. Review code for functionality and quality
3. Check adherence to coding standards
4. Validate test coverage and quality
5. Review documentation completeness
6. Approve or request changes

**Outputs**:
- Code review feedback
- Approved code changes
- Review documentation
- Quality assessment reports

### Step 5: Integration & Testing
**ID**: integrate-and-test
**Type**: testing
**Duration**: 60-180 minutes
**Required**: true
**Sequential**: true

**Description**: Integrate implemented code and conduct comprehensive testing.

**Triggers**:
- Code review completed and approved
- Individual components tested

**Actions**:
1. Integrate new code with existing system
2. Run integration tests
3. Conduct system testing
4. Perform regression testing
5. Validate performance requirements
6. Test error handling and edge cases

**Outputs**:
- Integrated codebase
- Integration test results
- System test reports
- Performance validation
- Regression test outcomes

### Step 6: Quality Gates Validation
**ID**: validate-quality-gates
**Type**: quality
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Validate that all quality gates have been successfully passed.

**Triggers**:
- Integration and testing completed
- Code review approved

**Actions**:
1. Validate code quality metrics
2. Check test coverage thresholds
3. Verify performance benchmarks
4. Confirm security requirements met
5. Validate documentation completeness
6. Confirm DoD criteria satisfied

**Outputs**:
- Quality gate validation report
- Code quality metrics
- Test coverage reports
- Performance benchmarks
- DoD completion confirmation

### Step 7: Documentation Updates
**ID**: update-documentation
**Type**: documentation
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Update all relevant documentation to reflect implementation changes.

**Triggers**:
- Quality gates validated
- Implementation ready for delivery

**Actions**:
1. Update technical documentation
2. Update user documentation
3. Update API documentation
4. Document configuration changes
5. Update deployment instructions
6. Update changelog and release notes

**Outputs**:
- Updated technical documentation
- User documentation updates
- API documentation changes
- Configuration documentation
- Deployment guides
- Changelog entries

### Step 8: Progress Tracking & Reporting
**ID**: track-progress
**Type**: monitoring
**Duration**: 15-30 minutes (ongoing)
**Required**: true
**Sequential**: false (continuous)

**Description**: Track implementation progress and report status.

**Triggers**:
- Task completion
- Milestone achievements
- Progress review points

**Actions**:
1. Update task completion status
2. Track progress against timeline
3. Monitor resource utilization
4. Identify and address blockers
5. Generate progress reports
6. Communicate status to stakeholders

**Outputs**:
- Progress tracking reports
- Milestone completion status
- Resource utilization metrics
- Blocker identification
- Stakeholder communications

## Quality Gates

### Code Quality Gates
- **Code Coverage**: ≥80% unit test coverage
- **Code Review**: 100% peer review coverage
- **Static Analysis**: No critical or high-severity issues
- **Documentation**: All public APIs documented

### Functional Quality Gates
- **Test Success**: 100% tests passing
- **Integration**: All integration tests passing
- **Performance**: Meets defined performance criteria
- **Security**: Passes security validation

### Process Quality Gates
- **DoD Compliance**: All DoD criteria met
- **Timeline Adherence**: Within 10% of planned timeline
- **Quality Standards**: Adheres to defined quality standards
- **Documentation**: All required documentation complete

## Dependencies

- **Environment Setup**: Infrastructure access, tool availability
- **TDD Initiation**: Clear requirements, testing framework
- **Code Implementation**: Technical specifications, development resources
- **Code Review**: Peer availability, review guidelines
- **Integration Testing**: Test environment, test data
- **Quality Validation**: Quality metrics, benchmarks
- **Documentation**: Documentation tools, templates
- **Progress Tracking**: Tracking tools, reporting frameworks

## Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| Technical challenges | Medium | High | Technical spikes, expert consultation |
| Quality issues | Medium | Medium | Continuous quality monitoring, peer reviews |
| Timeline delays | Medium | Medium | Buffer time, priority adjustment |
| Resource constraints | Low | High | Resource planning, cross-training |
| Integration failures | Medium | High | Early integration testing, rollback plans |

## Signal Flow

```
[tp] → setup-environment → initiate-tdd → implement-code
→ conduct-code-review → integrate-and-test → validate-quality-gates
→ update-documentation → [dp] (Development Progress) or [cq] (Code Quality)
```

## Success Indicators

- All tasks completed according to DoD
- High code quality maintained throughout
- Comprehensive test coverage achieved
- Quality gates consistently passed
- Documentation kept up to date
- Progress tracked and reported effectively

## Integration Points

- **Scanner Integration**: Monitor code changes and progress
- **Inspector Integration**: Validate code quality and completeness
- **Orchestrator Integration**: Coordinate task assignments and dependencies
- **Quality System Integration**: Enforce quality gates and standards
- **Documentation System Integration**: Maintain documentation同步

---

*This template ensures high-quality implementation following TDD principles with comprehensive quality gates and continuous progress tracking.*