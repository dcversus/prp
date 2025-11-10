# Base Flow Template: Create PRP

**Phase**: create-prp
**Flow ID**: base-flow-create-prp
**Version**: 1.0.0
**Description**: Complete workflow for creating comprehensive Product Requirement Prompts with proper structure, validation, and stakeholder alignment.

## Overview

This flow template defines the end-to-end process for creating high-quality PRPs that serve as the single source of truth for development work. It ensures all requirements are captured, validated, and properly structured before implementation begins.

## Entry Criteria

- [ ] Clear user request or problem statement identified
- [ ] Initial research conducted on problem domain
- [ ] Stakeholder availability confirmed
- [ ] Scope boundaries defined
- [ ] Success criteria established

## Exit Criteria

- [ ] PRP document created with all mandatory sections
- [ ] All requirements validated and prioritized
- [ ] DoR (Definition of Ready) checklist completed
- [ ] DoD (Definition of Done) criteria established
- [ ] Stakeholder approval obtained
- [ ] Implementation plan created
- [ ] Quality gates passed

## Success Metrics

- **Requirement Completeness**: 100% (all user requirements captured)
- **Stakeholder Alignment**: ≥90% agreement on requirements
- **PRP Quality Score**: ≥85/100
- **Time to Creation**: ≤2 business days for simple PRPs, ≤5 days for complex
- **Revision Count**: ≤2 major revisions after initial draft

## Flow Steps

### Step 1: Problem Analysis & Research
**ID**: research-problem
**Type**: action
**Duration**: 30-90 minutes
**Required**: true
**Sequential**: true

**Description**: Comprehensive analysis of the problem domain, user needs, and technical constraints.

**Triggers**:
- [rr] Research Request signal
- New project request
- Feature request with unclear requirements

**Actions**:
1. Analyze user request and identify core problem
2. Research problem domain and existing solutions
3. Identify key stakeholders and their needs
4. Gather technical constraints and requirements
5. Document initial findings and assumptions

**Outputs**:
- Problem statement document
- Stakeholder analysis
- Technical requirements summary
- Research findings report

**Resources**:
- Research templates (competitor, market, technical)
- Stakeholder interview scripts
- Domain knowledge base

### Step 2: Requirements Elicitation
**ID**: elicit-requirements
**Type**: communication
**Duration**: 60-120 minutes
**Required**: true
**Sequential**: true

**Description**: Systematic gathering and documentation of all requirements from stakeholders.

**Triggers**:
- Problem analysis completed
- Stakeholder availability confirmed

**Actions**:
1. Conduct stakeholder interviews
2. Facilitate requirements workshops
3. Document functional requirements
4. Document non-functional requirements
5. Identify constraints and assumptions
6. Prioritize requirements (MoSCoW)

**Outputs**:
- Stakeholder interview notes
- Functional requirements list
- Non-functional requirements list
- Requirements prioritization matrix
- Constraints and assumptions document

**Resources**:
- Interview guides
- Requirements templates
- Prioritization frameworks

### Step 3: PRP Structure Creation
**ID**: create-prp-structure
**Type**: action
**Duration**: 45-90 minutes
**Required**: true
**Sequential**: true

**Description**: Create the formal PRP document structure with all mandatory sections.

**Triggers**:
- Requirements elicitation completed
- Requirements validated by stakeholders

**Actions**:
1. Create PRP document with standard template
2. Fill in all mandatory sections:
   - Progress tracking
   - Description
   - DoR checklist
   - DoD checklist
   - Pre-release checklist
   - Post-release checklist
   - Implementation plan
3. Add supporting sections as needed
4. Validate structure completeness

**Outputs**:
- PRP document with complete structure
- Section completion checklist
- Structure validation report

**Resources**:
- PRP template
- Structure validation checklist
- Quality guidelines

### Step 4: Requirements Documentation
**ID**: document-requirements
**Type**: action
**Duration**: 60-180 minutes
**Required**: true
**Sequential**: true

**Description**: Document all requirements in the PRP with clear acceptance criteria.

**Triggers**:
- PRP structure created
- Requirements prioritized

**Actions**:
1. Write comprehensive problem description
2. Document all functional requirements
3. Document all non-functional requirements
4. Define acceptance criteria for each requirement
5. Create user stories or use cases
6. Add technical specifications
7. Include mockups or prototypes if applicable

**Outputs**:
- Complete requirements documentation
- Acceptance criteria matrix
- User stories/use cases
- Technical specifications

**Resources**:
- Requirements documentation templates
- Acceptance criteria guidelines
- User story templates

### Step 5: Success Criteria Definition
**ID**: define-success-criteria
**Type**: validation
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Define clear, measurable success criteria and DoD requirements.

**Triggers**:
- Requirements documented
- Technical specifications complete

**Actions**:
1. Define measurable success criteria
2. Create DoD checklist items
3. Establish quality gates
4. Define performance requirements
5. Set testing requirements
6. Define acceptance testing criteria

**Outputs**:
- Success criteria document
- DoD checklist
- Quality gate definitions
- Performance requirements
- Testing requirements

**Resources**:
- Success criteria templates
- DoD guidelines
- Quality gate frameworks

### Step 6: Implementation Planning
**ID**: plan-implementation
**Type**: decision
**Duration**: 45-90 minutes
**Required**: true
**Sequential**: true

**Description**: Create detailed implementation plan with task breakdown and resource allocation.

**Triggers**:
- Success criteria defined
- Technical requirements understood

**Actions**:
1. Break down requirements into tasks
2. Estimate effort and timeline
3. Identify dependencies
4. Allocate resources
5. Create project schedule
6. Define milestones and checkpoints
7. Plan testing and validation activities

**Outputs**:
- Task breakdown structure
- Effort estimates
- Project timeline
- Resource allocation plan
- Risk assessment
- Milestone definitions

**Resources**:
- Project planning templates
- Estimation guidelines
- Risk assessment frameworks

### Step 7: Stakeholder Review & Approval
**ID**: stakeholder-review
**Type**: communication
**Duration**: 60-120 minutes
**Required**: true
**Sequential**: true

**Description**: Present PRP to stakeholders for review and obtain approval.

**Triggers**:
- Implementation plan created
- PRP document complete

**Actions**:
1. Present PRP to stakeholders
2. Facilitate review discussion
3. Address questions and concerns
4. Incorporate feedback
5. Obtain stakeholder approval
6. Document approval decisions

**Outputs**:
- Stakeholder presentation
- Review feedback documentation
- Approved PRP document
- Approval sign-offs

**Resources**:
- Presentation templates
- Review checklists
- Approval workflows

### Step 8: Quality Validation
**ID**: validate-quality
**Type**: validation
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Comprehensive quality validation of the PRP against established standards.

**Triggers**:
- Stakeholder approval obtained
- Final PRP document ready

**Actions**:
1. Validate PRP structure completeness
2. Check requirements clarity and testability
3. Verify DoR/DoD criteria completeness
4. Assess implementation feasibility
5. Validate risk assessment completeness
6. Conduct quality gate review

**Outputs**:
- Quality validation report
- Compliance checklist
- Risk assessment validation
- Quality gate results

**Resources**:
- Quality validation checklists
- Compliance guidelines
- Quality gate criteria

## Dependencies

- **Problem Analysis**: Research templates, stakeholder access
- **Requirements Elicitation**: Stakeholder availability, interview guides
- **PRP Structure**: PRP templates, structure guidelines
- **Requirements Documentation**: Documentation templates, examples
- **Success Criteria**: Quality standards, measurement frameworks
- **Implementation Planning**: Planning tools, estimation guidelines
- **Stakeholder Review**: Presentation tools, approval workflows
- **Quality Validation**: Quality standards, validation checklists

## Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| Requirements unclear | Medium | High | Conduct additional stakeholder interviews |
| Scope creep | High | Medium | Clear scope boundaries and change control |
| Stakeholder disagreement | Medium | High | Facilitated workshops and mediation |
| Technical infeasibility | Low | High | Early technical validation |
| Incomplete documentation | Medium | Medium | Quality gates and validation checks |

## Integration Points

- **Scanner Integration**: Monitor for new problem signals and requirement changes
- **Inspector Integration**: Validate requirement quality and completeness
- **Orchestrator Integration**: Trigger implementation workflows
- **Agent Integration**: Assign to appropriate development agents
- **Quality System Integration**: Ensure quality gates are enforced

## Signal Flow

```
[rr] → research-problem → elicit-requirements → create-prp-structure
→ document-requirements → define-success-criteria → plan-implementation
→ stakeholder-review → validate-quality → [rp] (Ready for Preparation)
```

## Templates & Resources

### Research Templates
- Competitor analysis template
- Market research template
- Technical investigation guide
- User interview script

### Documentation Templates
- PRP structure template
- Requirements documentation template
- Acceptance criteria template
- DoD/DoR checklist template

### Planning Resources
- Task breakdown template
- Estimation guidelines
- Risk assessment template
- Project timeline template

### Quality Resources
- Quality validation checklist
- Compliance guidelines
- Quality gate definitions
- Review criteria template

## Success Indicators

- PRP created within time expectations
- All stakeholder requirements captured
- Clear acceptance criteria defined
- Implementation plan approved
- Quality gates passed
- No major blocking issues identified

## Failure Modes & Recovery

### Failure Mode: Requirements Ambiguity
**Recovery**: Conduct additional stakeholder workshops, refine requirements, add acceptance criteria

### Failure Mode: Technical Infeasibility
**Recovery**: Reassess technical approach, break down into smaller components, consider alternatives

### Failure Mode: Stakeholder Disagreement
**Recovery**: Facilitated mediation, prioritize requirements, document decisions, escalate if needed

### Failure Mode: Quality Gate Failure
**Recovery**: Address quality issues, refine documentation, re-validate, improve processes

---

*This template provides the foundation for creating high-quality PRPs that serve as effective single sources of truth for development work.*