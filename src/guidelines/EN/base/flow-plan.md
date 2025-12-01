# Base Flow Template: Plan

**Phase**: plan
**Flow ID**: base-flow-plan
**Version**: 1.0.0
**Description**: Comprehensive planning phase that transforms analyzed requirements into actionable implementation plans with detailed task breakdown, resource allocation, and timeline management.

## Overview

This flow template defines the systematic process for creating detailed implementation plans, breaking down work into manageable tasks, allocating resources, establishing timelines, and preparing for development execution. It ensures all aspects of the project are properly planned before implementation begins.

## Entry Criteria

- [ ] Analysis phase completed and approved
- [ ] Requirements clarified and validated
- [ ] Technical approach defined
- [ ] Dependencies identified and validated
- [ ] Risks assessed with mitigation plans
- [ ] Quality strategy defined

## Exit Criteria

- [ ] Comprehensive implementation plan created
- [ ] Tasks broken down and prioritized
- [ ] Resources allocated and scheduled
- [ ] Timeline established with milestones
- [ ] Testing strategy integrated
- [ ] Quality gates defined
- [ ] Team roles and responsibilities assigned

## Success Metrics

- **Plan Completeness**: 100% (all implementation aspects planned)
- **Task Granularity**: Appropriate task size (4-16 hours per task)
- **Resource Utilization**: ≥85% efficient resource allocation
- **Timeline Accuracy**: ±10% variance from actual implementation time
- **Risk Coverage**: All major risks have mitigation plans
- **Quality Integration**: Quality activities fully integrated into plan

## Flow Steps

### Step 1: Task Breakdown & Definition
**ID**: breakdown-tasks
**Type**: planning
**Duration**: 60-180 minutes
**Required**: true
**Sequential**: true

**Description**: Break down implementation into manageable, well-defined tasks.

**Triggers**:
- [ip] Implementation Plan Ready signal
- Analysis phase completed
- Requirements approved for implementation

**Actions**:
1. Decompose requirements into implementation tasks
2. Define task scope and deliverables
3. Ensure tasks are appropriately sized (4-16 hours)
4. Identify task dependencies and relationships
5. Define task acceptance criteria
6. Categorize tasks by type and priority

**Outputs**:
- Task breakdown structure (WBS)
- Task definitions with scope
- Task dependency map
- Task acceptance criteria
- Task categorization matrix

**Resources**:
- Work breakdown structure templates
- Task definition guidelines
- Dependency analysis tools
- Estimation frameworks

### Step 2: Effort Estimation & Sizing
**ID**: estimate-effort
**Type**: estimation
**Duration**: 45-120 minutes
**Required**: true
**Sequential**: true

**Description**: Estimate effort required for each task using multiple estimation techniques.

**Triggers**:
- Task breakdown completed
- Task scope clearly defined

**Actions**:
1. Estimate effort for each task (story points, hours, or days)
2. Apply multiple estimation techniques for validation
3. Account for complexity and uncertainty
4. Include buffer for contingencies
5. Validate estimates with technical team
6. Document estimation rationale

**Outputs**:
- Task effort estimates
- Estimation methodology documentation
- Complexity assessments
- Contingency buffers
- Estimation validation results

**Resources**:
- Estimation templates and tools
- Story point guidelines
- Complexity assessment frameworks
- Historical data for calibration

### Step 3: Resource Planning & Allocation
**ID**: plan-resources
**Type**: resource
**Duration**: 60-90 minutes
**Required**: true
**Sequential**: true

**Description**: Plan and allocate resources required for implementation.

**Triggers**:
- Effort estimates completed
- Task requirements understood

**Actions**:
1. Identify required skills and expertise
2. Allocate team members to tasks
3. Plan resource availability and capacity
4. Identify resource constraints and conflicts
5. Plan external resource needs
6. Define team roles and responsibilities

**Outputs**:
- Resource allocation plan
- Team role definitions
- Resource capacity analysis
- Constraint identification
- External resource requirements

**Resources**:
- Resource planning templates
- Team skill matrices
- Capacity planning tools
- Role definition frameworks

### Step 4: Timeline & Milestone Planning
**ID**: plan-timeline
**Type**: scheduling
**Duration**: 45-90 minutes
**Required**: true
**Sequential**: true

**Description**: Create detailed project timeline with milestones and checkpoints.

**Triggers**:
- Resource allocation completed
- Task dependencies understood

**Actions**:
1. Create project timeline based on task dependencies
2. Define major milestones and deliverables
3. Establish checkpoints and review points
4. Account for resource availability
5. Include buffer time for uncertainties
6. Validate timeline feasibility

**Outputs**:
- Project timeline/Gantt chart
- Milestone definitions
- Checkpoint schedule
- Critical path identification
- Timeline validation results

**Resources**:
- Timeline planning tools
- Gantt chart templates
- Critical path analysis tools
- Milestone planning frameworks

### Step 5: Risk & Contingency Planning
**ID**: plan-contingencies
**Type**: risk
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Develop detailed contingency plans for identified risks.

**Triggers**:
- Timeline established
- Risk assessment completed

**Actions**:
1. Prioritize risks by probability and impact
2. Develop specific contingency plans
3. Define risk triggers and monitoring
4. Allocate contingency resources
5. Establish risk response protocols
6. Plan communication for risk events

**Outputs**:
- Contingency plan documentation
- Risk monitoring framework
- Resource contingency allocation
- Risk response protocols
- Communication plans

**Resources**:
- Contingency planning templates
- Risk monitoring frameworks
- Response protocol guidelines

### Step 6: Testing & Quality Planning Integration
**ID**: integrate-testing
**Type**: quality
**Duration**: 45-90 minutes
**Required**: true
**Sequential**: true

**Description**: Integrate testing and quality activities into the implementation plan.

**Triggers**:
- Implementation timeline created
- Quality strategy defined

**Actions**:
1. Define testing activities for each development phase
2. Schedule quality gates and reviews
3. Plan automated testing implementation
4. Define code review processes and schedule
5. Plan user acceptance testing
6. Integrate continuous quality checks

**Outputs**:
- Integrated testing schedule
- Quality gate timeline
- Code review plan
- UAT schedule
- Quality monitoring plan

**Resources**:
- Testing planning templates
- Quality gate frameworks
- Code review guidelines
- UAT planning tools

### Step 7: Communication & Coordination Planning
**ID**: plan-communication
**Type**: communication
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Plan communication and coordination activities for the project.

**Triggers**:
- Team roles defined
- Timeline established

**Actions**:
1. Define communication channels and protocols
2. Plan stakeholder updates and reviews
3. Establish team coordination mechanisms
4. Define progress reporting requirements
5. Plan knowledge sharing and documentation
6. Establish escalation procedures

**Outputs**:
- Communication plan
- Stakeholder update schedule
- Team coordination framework
- Progress reporting templates
- Escalation procedures

**Resources**:
- Communication planning templates
- Stakeholder management frameworks
- Progress reporting templates

### Step 8: Tool & Infrastructure Planning
**ID**: plan-infrastructure
**Type**: infrastructure
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Plan tools, environments, and infrastructure required for implementation.

**Triggers**:
- Development approach defined
- Team requirements understood

**Actions**:
1. Identify required development tools
2. Plan development and testing environments
3. Define build and deployment infrastructure
4. Plan monitoring and logging systems
5. Establish tool access and permissions
6. Plan infrastructure setup and maintenance

**Outputs**:
- Tool requirements documentation
- Environment setup plan
- Infrastructure requirements
- Monitoring and logging plan
- Access and permission matrix

**Resources**:
- Tool evaluation frameworks
- Infrastructure planning templates
- Environment setup guidelines
- Security access templates

### Step 9: Plan Validation & Review
**ID**: validate-plan
**Type**: validation
**Duration**: 60-120 minutes
**Required**: true
**Sequential**: true

**Description**: Comprehensive review and validation of the complete implementation plan.

**Triggers**:
- All planning components completed
- Plan ready for stakeholder review

**Actions**:
1. Review plan completeness and consistency
2. Validate timeline and resource feasibility
3. Check risk coverage and mitigation plans
4. Validate quality integration
5. Conduct stakeholder plan review
6. Incorporate feedback and finalize plan

**Outputs**:
- Plan validation report
- Stakeholder review feedback
- Finalized implementation plan
- Plan approval documentation

**Resources**:
- Plan validation checklists
- Stakeholder review templates
- Plan approval workflows

## Dependencies

- **Task Breakdown**: Clear requirements, technical understanding
- **Effort Estimation**: Task definitions, historical data
- **Resource Planning**: Team availability, skill requirements
- **Timeline Planning**: Task dependencies, resource constraints
- **Contingency Planning**: Risk assessment, resource availability
- **Testing Integration**: Quality strategy, development approach
- **Communication Planning**: Stakeholder requirements, team structure
- **Infrastructure Planning**: Technical requirements, tool availability
- **Plan Validation**: Complete plan components, stakeholder access

## Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| Effort underestimation | High | High | Multiple estimation techniques, buffer allocation |
| Resource constraints | Medium | High | Early resource planning, alternative resources |
| Timeline slippage | Medium | Medium | Buffer time, critical path monitoring |
| Quality issues | Medium | Medium | Integrated quality planning, continuous monitoring |
| Communication breakdown | Low | High | Clear communication protocols, regular updates |

## Integration Points

- **Scanner Integration**: Monitor plan execution progress and changes
- **Inspector Integration**: Validate plan quality and completeness
- **Orchestrator Integration**: Trigger implementation workflows
- **Agent Integration**: Assign tasks to appropriate development agents
- **Quality System Integration**: Ensure quality gates are enforced

## Signal Flow

```
[ip] → breakdown-tasks → estimate-effort → plan-resources
→ plan-timeline → plan-contingencies → integrate-testing
→ plan-communication → plan-infrastructure → validate-plan
→ [tp] (Tests Prepared) or [dp] (Development Progress)
```

## Parallel Execution

The following steps can be executed in parallel to optimize planning time:
- **Resource Planning** and **Timeline Planning** (after Effort Estimation)
- **Contingency Planning** and **Testing Integration** (after Timeline Planning)
- **Communication Planning** and **Infrastructure Planning** (after Team Roles defined)

## Templates & Resources

### Planning Templates
- Work breakdown structure template
- Effort estimation template
- Resource allocation template
- Timeline planning template
- Risk and contingency template

### Documentation Resources
- Planning guidelines and best practices
- Quality integration frameworks
- Communication planning templates
- Infrastructure planning guidelines

### Tools & Frameworks
- Project management tools
- Estimation software
- Timeline visualization tools
- Resource planning software

## Success Indicators

- Comprehensive implementation plan created
- All tasks properly sized and defined
- Resources efficiently allocated
- Realistic timeline with milestones
- Quality activities fully integrated
- Plan validated and approved by stakeholders

## Failure Modes & Recovery

### Failure Mode: Tasks Too Large/Small
**Recovery**: Task decomposition/composition, re-estimation, timeline adjustment

### Failure Mode: Resource Constraints Discovered
**Recovery**: Resource re-allocation, timeline adjustment, scope modification

### Failure Mode: Timeline Unrealistic
**Recovery**: Task re-prioritization, resource adjustment, scope reduction

### Failure Mode: Quality Not Integrated
**Recovery**: Quality planning revision, timeline adjustment, stakeholder communication

---

*This template ensures comprehensive planning that transforms analyzed requirements into actionable, well-structured implementation plans ready for development execution.*