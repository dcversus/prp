# Admin Attention Signal Guideline

**Signal Code**: `aa`
**Signal Name**: Admin Attention
**Version**: 1.0.0
**Last Updated**: 2025-01-22

## Purpose

Admin Attention signals are used when administrative oversight, intervention, or decision-making is required. This signal indicates that automated processes have reached their limits and human administrative action is necessary to proceed with resolution.

## Signal Context

### When to Use

- **Decision Required**: When critical decisions need administrative approval
- **Resource Allocation**: When additional resources need administrative authorization
- **Escalation Point**: When standard resolution procedures have been exhausted
- **Policy Violations**: When potential policy or compliance violations are detected
- **System Configuration**: When system-level configuration changes are required
- **External Dependencies**: When external factors require administrative intervention

### Signal Pattern

```
[aa] Admin Attention - {decision_needed} | Options: {options} | Context: {context}
```

## Components

### 1. Scanner Component (`scanner.py`)

**Purpose**: Detect admin attention signals and collect relevant context

**Detection Patterns**:
- Explicit `[aa]` signal in PRP files
- Automated escalation from lower-priority signals
- Resource limit violations requiring admin approval
- Policy violation detections
- Critical decision points in workflows

**Data Collection**:
- PRP context and current status
- Resource utilization metrics
- Policy compliance status
- Decision options and consequences
- Historical similar scenarios
- Stakeholder impact assessment

### 2. Inspector Component (`inspector.md`)

**Purpose**: Analyze admin attention requests and prepare comprehensive analysis

**Analysis Framework**:
- **Urgency Assessment**: Evaluate time sensitivity and impact
- **Decision Complexity**: Analyze decision complexity and required expertise
- **Resource Requirements**: Assess resource needs and allocation options
- **Policy Compliance**: Evaluate against organizational policies
- **Stakeholder Impact**: Identify affected stakeholders and impact levels
- **Risk Assessment**: Analyze risks of different decision options

**Output Schema**:
- Priority classification (1-100)
- Decision complexity score
- Resource requirement analysis
- Policy compliance status
- Stakeholder impact matrix
- Risk assessment for each option
- Recommended decision path

### 3. Inspector Schema (`inspector.py`)

**Purpose**: Validate and structure inspector analysis output

**Validation Rules**:
- Priority scores must be between 1-100
- Decision options must be clearly defined
- Risk assessments must include probability and impact
- Resource requirements must be quantified
- Stakeholder impacts must be categorized

### 4. Orchestrator Component (`orchestrator.md`)

**Purpose**: Prepare and send admin notification with comprehensive context

**Notification Framework**:
- **Executive Summary**: Clear problem statement and urgency
- **Context Overview**: Relevant background and current status
- **Decision Options**: Clear options with pros/cons
- **Impact Analysis**: Detailed impact assessment
- **Recommendation**: Data-driven recommendation
- **Action Required**: Specific action needed from admin

**Message Structure**:
1. **Header**: Signal type, priority, and urgency
2. **Problem Statement**: Clear description of what needs attention
3. **Context**: Relevant background and current situation
4. **Options**: Available decision paths with analysis
5. **Impact**: Consequences of each option
6. **Recommendation**: Recommended course of action
7. **Action Required**: Specific next steps for admin

### 5. Orchestrator Schema (`orchestrator.py`)

**Purpose**: Validate orchestrator notification output

**Validation Rules**:
- Messages must include all required sections
- Options must be clearly distinguishable
- Impact analysis must be quantified
- Recommendations must be justified
- Action items must be specific and actionable

## Response Protocol

### Immediate Actions

1. **Signal Classification**: Classify urgency and priority
2. **Context Collection**: Gather all relevant information
3. **Option Analysis**: Develop clear decision options
4. **Impact Assessment**: Analyze consequences of each option
5. **Notification Preparation**: Prepare comprehensive admin notification

### Notification Process

1. **Format Message**: Structure according to message framework
2. **Validate Content**: Ensure all required elements present
3. **Send Notification**: Deliver through appropriate channels
4. **Track Response**: Monitor admin response and follow-up

### Follow-up Procedures

1. **Response Tracking**: Monitor admin response time and decision
2. **Action Implementation**: Execute admin decision
3. **Result Communication**: Communicate results back to admin
4. **Process Documentation**: Document decision and outcomes

## Quality Gates

### Pre-Notification Gates
- [ ] Signal urgency properly classified
- [ ] All relevant context collected
- [ ] Decision options clearly defined
- [ ] Impact analysis completed
- [ ] Recommendation justified with data

### Post-Notification Gates
- [ ] Admin response received and documented
- [ ] Decision implemented correctly
- [ ] Results communicated to stakeholders
- [ ] Process documented for future reference

## Integration Points

### Scanner Integration
- **PRP Monitoring**: Continuous monitoring of PRP files for signals
- **Resource Monitoring**: System resource utilization tracking
- **Policy Monitoring**: Compliance and policy violation detection
- **Workflow Monitoring**: Critical decision point identification

### Inspector Integration
- **Context API**: Access to comprehensive PRP and system context
- **Resource API**: Resource utilization and allocation data
- **Policy API**: Organizational policy and compliance information
- **Stakeholder API**: Stakeholder identification and impact assessment

### Orchestrator Integration
- **Notification API**: Multi-channel notification delivery
- **Decision API**: Decision tracking and implementation
- **Action API**: Action execution and tracking
- **Documentation API**: Decision and outcome documentation

## Success Criteria

### Effectiveness Metrics
- **Response Time**: Admin response time < 24 hours
- **Decision Quality**: Decisions lead to successful resolution
- **Implementation Success**: Admin decisions implemented correctly
- **Stakeholder Satisfaction**: Stakeholders satisfied with outcomes

### Quality Metrics
- **Information Completeness**: All required information included
- **Decision Clarity**: Options and impacts clearly communicated
- **Actionability**: Action items specific and executable
- **Documentation Quality**: Complete documentation of process

## Failure Modes & Recovery

### Common Failure Modes
1. **Incomplete Context**: Missing relevant information for decision
2. **Unclear Options**: Decision options not clearly defined
3. **Delayed Response**: Admin response takes too long
4. **Implementation Issues**: Decision not implemented correctly
5. **Communication Gaps**: Stakeholders not properly informed

### Recovery Strategies
1. **Context Enhancement**: Additional research and data collection
2. **Option Refinement**: Clarify and expand decision options
3. **Escalation**: Escalate to higher authority if needed
4. **Implementation Support**: Provide additional support for implementation
5. **Communication Improvement**: Enhance stakeholder communication

## Maintenance

### Regular Reviews
- Monthly review of signal effectiveness
- Quarterly update of decision frameworks
- Annual assessment of integration effectiveness
- Continuous improvement of notification quality

### Updates Required
- Update decision frameworks based on feedback
- Enhance integration capabilities
- Improve quality gates and validation
- Optimize notification templates and processes

---

*This Admin Attention Signal Guideline provides a comprehensive framework for handling administrative escalations with proper analysis, notification, and follow-up procedures.*