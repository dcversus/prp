# Base Flow Template: Analyse

**Phase**: analyse
**Flow ID**: base-flow-analyse
**Version**: 1.0.0
**Description**: Comprehensive analysis phase for breaking down PRPs into actionable requirements, identifying dependencies, and assessing feasibility.

## Overview

This flow template defines the systematic process for analyzing PRPs, conducting detailed requirements analysis, identifying technical challenges, and preparing for implementation planning. It ensures thorough understanding of requirements before development begins.

## Entry Criteria

- [ ] PRP approved and ready for preparation
- [ ] All requirements documented and prioritized
- [ ] Stakeholder approval obtained
- [ ] Success criteria defined
- [ ] Initial technical review completed

## Exit Criteria

- [ ] Requirements fully analyzed and clarified
- [ ] Technical feasibility confirmed
- [ ] Dependencies identified and documented
- [ ] Risks assessed and mitigation planned
- [ ] Resource requirements determined
- [ ] Implementation approach defined

## Success Metrics

- **Requirement Clarity**: 100% (all requirements unambiguous)
- **Technical Feasibility**: Confirmed for all requirements
- **Dependency Identification**: 100% of dependencies found
- **Risk Coverage**: All major risks identified with mitigation plans
- **Analysis Completeness**: ≥95% coverage of all requirement aspects
- **Stakeholder Satisfaction**: ≥90% confidence in analysis

## Flow Steps

### Step 1: Requirements Deep Dive
**ID**: analyze-requirements
**Type**: analysis
**Duration**: 60-180 minutes
**Required**: true
**Sequential**: true

**Description**: In-depth analysis of each requirement to ensure clarity, completeness, and testability.

**Triggers**:
- [rp] Ready for Preparation signal
- PRP approved for analysis
- New requirement clarification needed

**Actions**:
1. Review each requirement for clarity and completeness
2. Identify ambiguous or unclear requirements
3. Break down complex requirements into smaller components
4. Define acceptance criteria for each requirement
5. Identify requirement interdependencies
6. Validate requirement feasibility

**Outputs**:
- Detailed requirement analysis
- Clarified requirement specifications
- Acceptance criteria matrix
- Requirement dependency map
- Feasibility assessment

**Resources**:
- Requirement analysis templates
- Acceptance criteria guidelines
- Dependency analysis tools
- Feasibility assessment frameworks

### Step 2: Technical Architecture Analysis
**ID**: analyze-technical-architecture
**Type**: technical
**Duration**: 90-240 minutes
**Required**: true
**Sequential**: true

**Description**: Analyze technical requirements and define architectural approach.

**Triggers**:
- Requirements analysis completed
- Technical feasibility questions identified

**Actions**:
1. Analyze current system architecture
2. Identify integration points and dependencies
3. Define required technical components
4. Assess scalability and performance requirements
5. Identify technical constraints and limitations
6. Design high-level technical approach

**Outputs**:
- Architecture analysis document
- Component identification
- Integration point mapping
- Performance requirements
- Technical constraint documentation
- High-level design approach

**Resources**:
- Architecture documentation
- System design tools
- Performance analysis frameworks
- Integration mapping templates

### Step 3: Data Analysis & Modeling
**ID**: analyze-data-requirements
**Type**: data
**Duration**: 60-180 minutes
**Required**: true
**Sequential**: true

**Description**: Analyze data requirements, model data structures, and identify data flows.

**Triggers**:
- Technical architecture analyzed
- Data-intensive requirements identified

**Actions**:
1. Identify all data entities and relationships
2. Model data structures and schemas
3. Define data flows and transformations
4. Assess data volume and performance requirements
5. Identify data quality requirements
6. Plan data migration or integration needs

**Outputs**:
- Data model documentation
- Entity relationship diagrams
- Data flow diagrams
- Data quality requirements
- Performance specifications
- Migration/integration plans

**Resources**:
- Data modeling tools
- Entity relationship templates
- Data flow documentation
- Performance analysis tools

### Step 4: User Experience Analysis
**ID**: analyze-user-experience
**Type**: ux
**Duration**: 60-120 minutes
**Required**: true
**Sequential**: false (can run in parallel with other analysis steps)

**Description**: Analyze user experience requirements and design user journey.

**Triggers**:
- User interface requirements identified
- User experience considerations needed

**Actions**:
1. Analyze user personas and use cases
2. Design user journey and workflows
3. Identify user interface requirements
4. Assess accessibility needs
5. Define usability criteria
6. Plan user testing approach

**Outputs**:
- User persona documentation
- User journey maps
- UI/UX requirements
- Accessibility requirements
- Usability criteria
- User testing plan

**Resources**:
- UX analysis templates
- User persona frameworks
- Journey mapping tools
- Accessibility guidelines

### Step 5: Risk Assessment & Analysis
**ID**: analyze-risks
**Type**: risk
**Duration**: 45-90 minutes
**Required**: true
**Sequential**: true

**Description**: Comprehensive risk assessment for the project implementation.

**Triggers**:
- Technical analysis completed
- Implementation complexity identified

**Actions**:
1. Identify technical risks and challenges
2. Assess schedule and resource risks
3. Analyze business impact risks
4. Identify external dependencies and risks
5. Evaluate security and compliance risks
6. Develop risk mitigation strategies

**Outputs**:
- Risk register
- Risk assessment matrix
- Mitigation strategies
- Risk monitoring plan
- Contingency plans

**Resources**:
- Risk assessment templates
- Risk matrix frameworks
- Mitigation strategy guidelines

### Step 6: Dependency Analysis
**ID**: analyze-dependencies
**Type**: dependency
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Identify and analyze all dependencies for successful implementation.

**Triggers**:
- Technical architecture analyzed
- External integrations identified

**Actions**:
1. Identify internal system dependencies
2. Analyze external service dependencies
3. Assess third-party library requirements
4. Evaluate team and skill dependencies
5. Identify infrastructure dependencies
6. Plan dependency resolution strategies

**Outputs**:
- Dependency matrix
- Integration requirements
- Resource dependency analysis
- Infrastructure requirements
- Dependency resolution plan

**Resources**:
- Dependency analysis templates
- Integration planning tools
- Resource assessment frameworks

### Step 7: Implementation Strategy Definition
**ID**: define-implementation-strategy
**Type**: strategy
**Duration**: 60-120 minutes
**Required**: true
**Sequential**: true

**Description**: Define overall implementation strategy and approach.

**Triggers**:
- All analysis completed
- Technical approach understood

**Actions**:
1. Define implementation methodology (Agile, Waterfall, Hybrid)
2. Plan development phases and milestones
3. Define testing and validation approach
4. Plan deployment strategy
5. Define team structure and roles
6. Establish communication and reporting protocols

**Outputs**:
- Implementation strategy document
- Development phase plan
- Testing strategy
- Deployment plan
- Team structure definition
- Communication plan

**Resources**:
- Implementation strategy templates
- Methodology frameworks
- Planning tools and templates

### Step 8: Quality Planning
**ID**: plan-quality-assurance
**Type**: quality
**Duration**: 30-60 minutes
**Required**: true
**Sequential**: true

**Description**: Plan comprehensive quality assurance approach for the project.

**Triggers**:
- Implementation strategy defined
- Quality requirements identified

**Actions**:
1. Define quality criteria and standards
2. Plan testing strategy and approach
3. Define code review processes
4. Plan performance and security testing
5. Establish quality metrics and monitoring
6. Define acceptance testing criteria

**Outputs**:
- Quality plan document
- Testing strategy
- Code review guidelines
- Quality metrics definition
- Acceptance testing plan

**Resources**:
- Quality planning templates
- Testing strategy frameworks
- Quality metrics guidelines

## Dependencies

- **Requirements Analysis**: Clear PRP requirements, stakeholder access
- **Technical Architecture**: System documentation, technical expertise
- **Data Analysis**: Data sources, business rules understanding
- **UX Analysis**: User research, design guidelines
- **Risk Assessment**: Business context, technical constraints
- **Dependency Analysis**: System inventory, integration documentation
- **Implementation Strategy**: Project requirements, team capabilities
- **Quality Planning**: Quality standards, testing frameworks

## Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| Requirements misunderstood | Medium | High | Stakeholder validation sessions |
| Technical complexity underestimated | High | High | Technical proof of concepts |
| Dependencies unavailable | Medium | High | Early dependency validation |
| Resource constraints | Medium | Medium | Resource planning and allocation |
| Quality issues | Medium | Medium | Comprehensive quality planning |

## Integration Points

- **Scanner Integration**: Monitor for requirement changes and system updates
- **Inspector Integration**: Validate analysis completeness and quality
- **Orchestrator Integration**: Trigger planning workflows
- **Agent Integration**: Assign analysis tasks to specialist agents
- **Quality System Integration**: Ensure analysis quality standards

## Signal Flow

```
[rp] → analyze-requirements → analyze-technical-architecture
→ analyze-data-requirements → analyze-user-experience
→ analyze-risks → analyze-dependencies
→ define-implementation-strategy → plan-quality-assurance
→ [ip] (Implementation Plan Ready)
```

## Parallel Execution

The following steps can be executed in parallel to optimize analysis time:
- **Data Analysis** and **User Experience Analysis** (after Requirements Analysis)
- **Risk Assessment** and **Dependency Analysis** (after Technical Architecture)

## Templates & Resources

### Analysis Templates
- Requirements analysis template
- Technical architecture analysis template
- Data modeling template
- Risk assessment template
- Dependency analysis template

### Documentation Resources
- Architecture documentation standards
- Data modeling guidelines
- UX analysis frameworks
- Quality planning templates

### Tools & Frameworks
- Dependency mapping tools
- Risk assessment matrices
- Architecture diagram tools
- Data modeling software

## Success Indicators

- All requirements thoroughly analyzed and clarified
- Technical approach validated and approved
- All risks identified with mitigation plans
- Dependencies documented and validated
- Quality planning completed
- Implementation strategy defined

## Failure Modes & Recovery

### Failure Mode: Requirements Still Unclear
**Recovery**: Additional stakeholder workshops, requirement refinement sessions

### Failure Mode: Technical Infeasibility Discovered
**Recovery**: Technical re-architecture, requirement modification, alternative approaches

### Failure Mode: Critical Dependencies Unavailable
**Recovery**: Dependency alternatives, timeline adjustment, scope modification

### Failure Mode: Analysis Incomplete
**Recovery**: Additional analysis cycles, expert consultation, extended timeline

---

*This template ensures comprehensive analysis of PRPs, providing the foundation for successful implementation planning and execution.*