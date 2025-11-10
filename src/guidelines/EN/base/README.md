# Base Flow Templates

**Version**: 1.0.0
**Last Updated**: 2025-01-09
**Purpose**: Complete workflow templates for end-to-end project lifecycle

## Overview

The Base Flow Templates provide comprehensive, systematic workflows for each phase of the project lifecycle. These templates ensure consistent, high-quality execution across all projects while allowing for customization based on specific requirements.

## Flow Architecture

The templates follow a complete project lifecycle:

```
create-prp → analyse → plan → implement → test → review → release → reflect
```

Each flow template includes:
- **Entry Criteria**: Conditions required to start the phase
- **Exit Criteria**: Conditions required to complete the phase
- **Success Metrics**: Measurable criteria for success
- **Flow Steps**: Detailed step-by-step processes
- **Quality Gates**: Validation checkpoints
- **Dependencies**: Required inputs and resources
- **Risk Mitigation**: Strategies for handling risks
- **Signal Flow**: Integration with signal system

## Available Templates

### 1. Create PRP Flow (`flow-create-prp.md`)
**Phase**: Project Initiation
**Purpose**: Transform user requests into comprehensive Product Requirement Prompts

**Key Activities**:
- Problem analysis and research
- Requirements elicitation
- PRP structure creation
- Requirements documentation
- Success criteria definition
- Implementation planning
- Stakeholder review and approval
- Quality validation

**Entry Signals**: `[rr]` Research Request
**Exit Signals**: `[rp]` Ready for Preparation

---

### 2. Analyse Flow (`flow-analyse.md`)
**Phase**: Analysis
**Purpose**: Deep analysis of requirements and technical feasibility

**Key Activities**:
- Requirements deep dive
- Technical architecture analysis
- Data analysis and modeling
- User experience analysis
- Risk assessment and analysis
- Dependency analysis
- Implementation strategy definition
- Quality planning

**Entry Signals**: `[rp]` Ready for Preparation
**Exit Signals**: `[ip]` Implementation Plan Ready

---

### 3. Plan Flow (`flow-plan.md`)
**Phase**: Planning
**Purpose**: Create detailed implementation plans with task breakdown and resource allocation

**Key Activities**:
- Task breakdown and definition
- Effort estimation and sizing
- Resource planning and allocation
- Timeline and milestone planning
- Risk and contingency planning
- Testing and quality planning integration
- Communication and coordination planning
- Tool and infrastructure planning
- Plan validation and review

**Entry Signals**: `[ip]` Implementation Plan Ready
**Exit Signals**: `[tp]` Tests Prepared or `[dp]` Development Progress

---

### 4. Implement Flow (`flow-implement.md`)
**Phase**: Implementation
**Purpose**: Execute planned tasks following TDD principles and quality standards

**Key Activities**:
- Development environment setup
- Test-driven development initiation
- Code implementation and development
- Code review process
- Integration and testing
- Quality gates validation
- Documentation updates
- Progress tracking and reporting

**Entry Signals**: `[tp]` Tests Prepared
**Exit Signals**: `[dp]` Development Progress or `[cq]` Code Quality

---

### 5. Test Flow (`flow-test.md`)
**Phase**: Testing
**Purpose**: Comprehensive testing to validate implementation quality and readiness

**Key Activities**:
- Test planning and strategy finalization
- Test environment preparation
- Unit test execution and validation
- Integration test execution
- System and end-to-end testing
- Performance and scalability testing
- Security and compliance testing
- User acceptance testing (UAT)
- Test results analysis and reporting
- Release readiness assessment

**Entry Signals**: `[cq]` Code Quality
**Exit Signals**: `[tg]` Tests Green or `[tr]` Tests Red

---

### 6. Review Flow (`flow-review.md`)
**Phase**: Review
**Purpose**: Comprehensive review to validate implementation completeness and quality

**Key Activities**:
- Review planning and preparation
- Code review and quality assessment
- Architecture and design review
- Functional and requirements review
- Performance and scalability review
- Security and compliance review
- Documentation review
- Stakeholder review and validation
- Review findings consolidation
- Release readiness decision

**Entry Signals**: `[tg]` Tests Green
**Exit Signals**: `[rv]` Review Passed or `[aa]` Admin Attention

---

### 7. Release Flow (`flow-release.md`)
**Phase**: Release
**Purpose**: Coordinate deployment and ensure successful transition to production

**Key Activities**:
- Release preparation and planning
- Pre-release validation
- Release communication and coordination
- Deployment execution
- Post-release validation
- User acceptance and training
- Monitoring and health verification
- Issue management and resolution
- Release documentation and closure
- Post-release monitoring

**Entry Signals**: `[rv]` Review Passed
**Exit Signals**: `[rl]` Released or `[ps]` Post-release Status

---

### 8. Reflect Flow (`flow-reflect.md`)
**Phase**: Reflection
**Purpose**: Capture lessons learned and drive continuous improvement

**Key Activities**:
- Reflection planning and preparation
- Data collection and analysis
- Success criteria analysis
- Process effectiveness review
- Team performance and collaboration review
- Technical review and innovation assessment
- Stakeholder satisfaction analysis
- Lessons learned identification
- Improvement planning and action items
- Knowledge preservation and sharing
- Reflection closure and celebration

**Entry Signals**: `[ps]` Post-release Status
**Exit Signals**: `[pm]` Post-mortem or `[aa]` Admin Attention

## Integration with Signal System

Each flow template integrates with the PRP signal system:

### Signal Flow Mapping
```
[rr] → flow-create-prp → [rp] → flow-analyse → [ip] → flow-plan
→ [tp] → flow-implement → [dp] → [cq] → flow-test → [tg]
→ flow-review → [rv] → flow-release → [rl] → [ps] → flow-reflect → [pm]
```

### Key Signal Points
- **Entry Signals**: Trigger flow initiation
- **Decision Points**: Create branches based on outcomes
- **Quality Gates**: Validate phase completion
- **Exit Signals**: Trigger next phase or escalation

## Quality Gates Framework

Each flow includes quality gates that must be passed before progression:

### Common Quality Gate Types
- **Coverage Gates**: Ensure all required areas are addressed
- **Quality Gates**: Validate work meets quality standards
- **Compliance Gates**: Ensure adherence to processes and standards
- **Readiness Gates**: Confirm readiness for next phase

### Quality Gate Validation
- Automated checks where possible
- Manual validation for subjective criteria
- Evidence-based validation
- Documentation of validation results

## Customization Guidelines

### Template Customization
1. **Assess Project Needs**: Determine template adaptation requirements
2. **Modify Entry/Exit Criteria**: Adjust based on project context
3. **Customize Success Metrics**: Align with project goals
4. **Adapt Flow Steps**: Add/remove steps as needed
5. **Update Quality Gates**: Adjust criteria to match project standards
6. **Maintain Core Structure**: Preserve fundamental flow integrity

### Scaling Templates
- **Small Projects**: Combine phases, reduce formalism
- **Large Projects**: Add detail, additional checkpoints
- **Complex Projects**: Add specialized flows, expert reviews
- **Simple Projects**: Streamline processes, reduce documentation

## Best Practices

### Flow Execution
1. **Follow Sequential Progression**: Complete each phase before moving to next
2. **Validate Entry Criteria**: Ensure prerequisites are met
3. **Meet Exit Criteria**: Confirm all requirements satisfied
4. **Document Progress**: Maintain records of decisions and outcomes
5. **Handle Exceptions**: Follow escalation procedures for issues

### Quality Assurance
1. **Validate at Each Gate**: Ensure quality before progression
2. **Collect Evidence**: Document validation results
3. **Address Issues**: Resolve problems before continuation
4. **Learn from Experience**: Capture lessons for improvement

### Continuous Improvement
1. **Track Performance**: Monitor flow effectiveness
2. **Collect Feedback**: Gather input from participants
3. **Update Templates**: Incorporate improvements
4. **Share Knowledge**: Distribute lessons learned

## Usage Instructions

### Starting a Flow
1. **Verify Entry Criteria**: Confirm all prerequisites met
2. **Review Flow Template**: Understand required activities
3. **Prepare Resources**: Ensure tools and people available
4. **Execute First Step**: Begin with first sequential step
5. **Track Progress**: Monitor completion of each step

### Managing Flow Execution
1. **Follow Dependencies**: Respect step dependencies and order
2. **Validate Quality Gates**: Ensure criteria met before progression
3. **Handle Blockers**: Address issues preventing progress
4. **Document Decisions**: Record choices and rationale
5. **Communicate Status**: Keep stakeholders informed

### Completing a Flow
1. **Verify Exit Criteria**: Confirm all requirements satisfied
2. **Generate Outputs**: Create required deliverables
3. **Document Completion**: Record flow completion
4. **Trigger Next Phase**: Initiate subsequent flow if needed
5. **Archive Materials**: Store documentation and artifacts

## Maintenance and Updates

### Template Maintenance
- **Regular Reviews**: Assess template effectiveness quarterly
- **Feedback Integration**: Incorporate user feedback
- **Best Practice Updates**: Incorporate industry improvements
- **Version Control**: Maintain version history and changes

### Change Management
- **Impact Assessment**: Evaluate changes before implementation
- **Stakeholder Communication**: Inform users of changes
- **Training and Support**: Provide guidance for updates
- **Rollback Planning**: Prepare for change reversals if needed

---

## Support and Resources

### Documentation
- **Individual Flow Templates**: Detailed phase-specific guidance
- **Quality Gate Framework**: Quality standards and criteria
- **Signal System Documentation**: Signal integration and usage
- **Best Practice Guides**: Industry-standard approaches

### Tools and Templates
- **Checklists**: Phase-specific validation checklists
- **Templates**: Standardized document formats
- **Automation Scripts**: Quality gate validation automation
- **Reporting Tools**: Progress and status reporting

### Training and Support
- **Flow Training**: Guidance on flow execution
- **Quality Gate Training**: Validation and verification techniques
- **Tool Training**: Software and platform usage
- **Best Practice Workshops**: Industry standards and approaches

---

*These Base Flow Templates provide a comprehensive foundation for consistent, high-quality project execution while maintaining flexibility for customization and continuous improvement.*