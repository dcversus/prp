# Master Signal Template Framework

**Purpose**: Comprehensive template framework for implementing all 44 signals in the PRP system
**Version**: 1.0.0
**Last Updated**: 2025-01-22
**Template Type**: Universal Signal Implementation Framework

## 📋 COMPLETE SIGNAL TAXONOMY

### System Signals (Internal)
- `[HF]` - Health Feedback (orchestration cycle start)
- `[HS]` - Start with self (cycle to prepare selfName and selfSummary and selfGoal)
- `[pr]` - Pull Request Preparation (optimization pre-catch)
- `[PR]` - Pull Request Created (PR activity detected)
- `[FF]` - System Fatal Error (corruption/unrecoverable errors)
- `[TF]` - Terminal Closed (graceful session end)
- `[TC]` - Terminal Crushed (process crash)
- `[TI]` - Terminal Idle (inactivity timeout)

### Agent Signals (Implementation Workflow)

#### Planning & Analysis Signals
- `[gg]` - Goal Clarification (robo-system-analyst)
- `[ff]` - Goal Not Achievable (robo-system-analyst)
- `[rp]` - Ready for Preparation (robo-system-analyst)
- `[vr]` - Validation Required (robo-system-analyst)
- `[rr]` - Research Request (Any agent)
- `[vp]` - Verification Plan (robo-system-analyst)
- `[ip]` - Implementation Plan (robo-system-analyst)
- `[er]` - Experiment Required (robo-system-analyst)

#### Development Signals
- `[tp]` - Tests Prepared (robo-developer)
- `[dp]` - Development Progress (robo-developer)
- `[tw]` - Tests Written (robo-developer)
- `[bf]` - Bug Fixed (robo-developer)
- `[cd]` - Cleanup Done (robo-developer)
- `[mg]` - Merged (robo-developer)
- `[rl]` - Released (robo-developer)

#### Quality & Testing Signals
- `[cq]` - Code Quality (robo-aqa)
- `[cp]` - CI Passed (robo-aqa)
- `[tr]` - Tests Red (robo-aqa)
- `[tg]` - Tests Green (robo-aqa)
- `[cf]` - CI Failed (robo-aqa)
- `[pc]` - Pre-release Complete (robo-aqa)
- `[rv]` - Review Passed (robo-aqa)

#### Blocker & Issue Management
- `[bb]` - Blocker (Any agent)
- `[br]` - Blocker Resolved (Any agent)
- `[no]` - Not Obvious (Any agent)
- `[af]` - Feedback Request (Any agent)

#### Completion & Validation Signals
- `[da]` - Done Assessment (Any agent)
- `[rc]` - Research Complete (robo-system-analyst)
- `[iv]` - Implementation Verified (robo-quality-control)
- `[cc]` - Cleanup Complete (robo-developer)

#### Release & Deployment Signals
- `[ra]` - Release Approved (robo-system-analyst)
- `[ps]` - Post-release Status (robo-system-analyst)
- `[rg]` - Review Progress (Any agent)

#### Incident Management Signals
- `[ic]` - Incident (System Monitor/Any Agent)
- `[JC]` - Jesus Christ (Incident Resolved) (robo-developer/robo-devops-sre)
- `[pm]` - Post-mortem (robo-system-analyst)

#### Coordination & Admin Signals
- `[oa]` - Orchestrator Attention (Any agent)
- `[aa]` - Admin Attention (Any agent/PRP)
- `[ap]` - Admin Preview Ready (robo-system-analyst/robo-aqa)

## 🏗️ UNIVERSAL SIGNAL TEMPLATE STRUCTURE

### Signal Implementation Framework
Every signal MUST implement the following component structure:

```
src/guidelines/EN/signals/{signal_code}/
├── guideline.md          # Complete signal documentation
├── inspector.md          # Inspector analysis prompt
├── inspector.py          # Python implementation (async)
├── orchestrator.md       # Orchestrator response prompt
└── orchestrator.py       # Python implementation (async)
```

### 1. Guideline Template (`guideline.md`)

```markdown
# {Signal Name} Signal Guideline

**Signal Code**: `{signal_code}`
**Signal Name**: {Signal Full Name}
**Version**: 1.0.0
**Last Updated**: {current_date}

## Purpose

[Brief description of signal purpose and when it's used]

## Signal Context

### When to Use

- **Use Case 1**: Clear description of when signal is appropriate
- **Use Case 2**: Another clear use case
- **Use Case 3**: Additional use cases as needed

### Signal Pattern

```
[{signal_code}] {Signal Name} - {context} | {key_information} | {action_required}
```

## Components

### 1. Scanner Component (`scanner.py`)
**Purpose**: [What scanner detects and captures]
**Detection Patterns**: [List of detection methods]
**Data Collection**: [What data is collected]

### 2. Inspector Component (`inspector.md`)
**Purpose**: [What inspector analyzes]
**Analysis Framework**: [Analysis approach]
**Output Schema**: [Expected output format]

### 3. Inspector Schema (`inspector.py`)
**Purpose**: [What schema validates]
**Validation Rules**: [Specific validation rules]

### 4. Orchestrator Component (`orchestrator.md`)
**Purpose**: [What orchestrator coordinates]
**Response Framework**: [Response approach]
**Response Structure**: [Detailed structure]

### 5. Orchestrator Schema (`orchestrator.py`)
**Purpose**: [What orchestrator schema validates]
**Validation Rules**: [Specific validation rules]

## Response Protocol

### Immediate Actions
1. [Action 1]
2. [Action 2]
3. [Action 3]

### Response Phases
- **Phase 1**: [Description and timeline]
- **Phase 2**: [Description and timeline]
- **Phase 3**: [Description and timeline]

### Post-Response Procedures
1. [Procedure 1]
2. [Procedure 2]
3. [Procedure 3]

## Quality Gates

### Pre-Response Gates
- [ ] [Gate 1 requirement]
- [ ] [Gate 2 requirement]
- [ ] [Gate 3 requirement]

### Post-Response Gates
- [ ] [Gate 1 requirement]
- [ ] [Gate 2 requirement]
- [ ] [Gate 3 requirement]

## Integration Points

### Scanner Integration
- [Integration point 1]
- [Integration point 2]

### Inspector Integration
- [Integration point 1]
- [Integration point 2]

### Orchestrator Integration
- [Integration point 1]
- [Integration point 2]

## Success Criteria

### Effectiveness Metrics
- **Metric 1**: [Description and target]
- **Metric 2**: [Description and target]
- **Metric 3**: [Description and target]

### Process Quality Metrics
- **Metric 1**: [Description and target]
- **Metric 2**: [Description and target]
- **Metric 3**: [Description and target]

## Failure Modes & Recovery

### Critical Failure Modes
1. [Failure mode 1]
2. [Failure mode 2]
3. [Failure mode 3]

### Recovery Strategies
1. [Recovery strategy 1]
2. [Recovery strategy 2]
3. [Recovery strategy 3]

## Maintenance

### Regular Reviews
- [Review type 1]: [Frequency]
- [Review type 2]: [Frequency]
- [Review type 3]: [Frequency]

### Updates Required
- [Update requirement 1]
- [Update requirement 2]
- [Update requirement 3]
```

### 2. Inspector Template (`inspector.md`)

```markdown
# {Signal Name} Signal Inspector Prompt

**Signal Code**: `{signal_code}`
**Inspector Role**: [Primary inspector responsibility]
**Version**: 1.0.0

## Analysis Instructions

You are an AI Inspector analyzing {Signal Name} (`[{signal_code}]`) signals. Your role is to [primary objective] with [key characteristics].

### Analysis Framework

#### 1. [Analysis Category 1]
**Classification**:
- **Level 1**: [Description]
- **Level 2**: [Description]
- **Level 3**: [Description]

**Criteria**:
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

#### 2. [Analysis Category 2]
**Analysis Focus**:
- [Focus area 1]
- [Focus area 2]
- [Focus area 3]

**Critical Information Required**:
- [Information 1]
- [Information 2]
- [Information 3]

#### 3. [Analysis Category 3]
**Assessment Requirements**:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

### Analysis Process

#### Step 1: [Step 1 Title]
1. [Action 1]
2. [Action 2]
3. [Action 3]

#### Step 2: [Step 2 Title]
1. [Action 1]
2. [Action 2]
3. [Action 3]

#### Step 3: [Step 3 Title]
1. [Action 1]
2. [Action 2]
3. [Action 3]

### Output Requirements

#### Structured Analysis Format

```json
{
  "analysis_assessment": {
    "signal_id": "unique_identifier",
    "analysis_timestamp": "ISO timestamp",
    "analysis_type": "analysis_category",
    "confidence_level": 1-100,
    "priority_level": "low|medium|high|critical"
  },
  "detailed_analysis": {
    "category_1_analysis": {
      "classification": "classification_result",
      "confidence": 1-100,
      "supporting_evidence": ["evidence_1", "evidence_2"]
    },
    "category_2_analysis": {
      "assessment": "assessment_result",
      "impact_level": "low|medium|high|critical",
      "key_factors": ["factor_1", "factor_2"]
    },
    "category_3_analysis": {
      "evaluation": "evaluation_result",
      "effectiveness": 1-100,
      "recommendations": ["recommendation_1", "recommendation_2"]
    }
  },
  "recommendations": {
    "immediate_actions": [
      "Action 1",
      "Action 2"
    ],
    "follow_up_actions": [
      "Follow-up 1",
      "Follow-up 2"
    ],
    "prevention_measures": [
      "Prevention 1",
      "Prevention 2"
    ]
  }
}
```

### Scoring Framework

#### Score Calculation (1-100)
**Base Score Components**:
- **Component 1** (0-XX points): [Description]
- **Component 2** (0-XX points): [Description]
- **Component 3** (0-XX points): [Description]
- **Component 4** (0-XX points): [Description]

**Score Mapping**:
- **Excellent (90-100)**: [Description]
- **Good (75-89)**: [Description]
- **Satisfactory (60-74)**: [Description]
- **Needs Improvement (45-59)**: [Description]
- **Poor (1-44)**: [Description]

### Common Analysis Types and Patterns

#### [Type 1] Analysis
**Analysis Focus**:
- [Focus area 1]
- [Focus area 2]
- [Focus area 3]

**Critical Information Required**:
- [Information 1]
- [Information 2]
- [Information 3]

#### [Type 2] Analysis
**Analysis Focus**:
- [Focus area 1]
- [Focus area 2]
- [Focus area 3]

**Critical Information Required**:
- [Information 1]
- [Information 2]
- [Information 3]

### Inspector Guidelines

#### Analysis Best Practices
1. [Best practice 1]
2. [Best practice 2]
3. [Best practice 3]

#### Analysis Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

#### Avoid These Pitfalls
1. [Pitfall 1]
2. [Pitfall 2]
3. [Pitfall 3]

### Integration Points

#### [Integration Type 1] Integration
- [Integration point 1]
- [Integration point 2]
- [Integration point 3]

#### [Integration Type 2] Integration
- [Integration point 1]
- [Integration point 2]
- [Integration point 3]

### Continuous Improvement

#### Learning from Analysis
1. [Learning approach 1]
2. [Learning approach 2]
3. [Learning approach 3]

#### Analysis Enhancement
- [Enhancement 1]
- [Enhancement 2]
- [Enhancement 3]

### Quality Assurance

#### Analysis Quality Standards
- **Completeness**: [Completeness standard]
- **Accuracy**: [Accuracy standard]
- **Actionability**: [Actionability standard]
- **Timeliness**: [Timeliness standard]
- **Clarity**: [Clarity standard]

#### Validation Procedures
- [Validation procedure 1]
- [Validation procedure 2]
- [Validation procedure 3]
```

### 3. Inspector Python Template (`inspector.py`)

```python
"""
{Signal Name} Signal Inspector Implementation

[Brief description of inspector functionality and responsibilities]
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logger = logging.getLogger(__name__)

class {SignalName}Status(Enum):
    STATUS_1 = "status_1"
    STATUS_2 = "status_2"
    STATUS_3 = "status_3"

class PriorityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AnalysisResult:
    """Structure for analysis results"""
    classification: str
    confidence_level: float
    supporting_evidence: List[str]
    recommendations: List[str]
    priority_level: str

class {SignalName}Analyzer:
    """Analyzes {Signal Name} signals and provides comprehensive assessments"""

    def __init__(self):
        self.logger = logger
        self.start_time = datetime.now(timezone.utc)

    async def analyze_{signal_name_lower}(
        self,
        signal_context: Dict[str, Any],
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive analysis of {Signal Name} signal

        Args:
            signal_context: Context and metadata about the signal
            additional_data: Additional data for analysis (optional)

        Returns:
            Comprehensive analysis results and recommendations
        """
        try:
            self.logger.info(f"Starting {signal_name_lower} analysis for signal: {signal_context.get('signal_id', 'unknown')}")

            # Step 1: Analyze signal characteristics
            signal_analysis = await self._analyze_signal_characteristics(signal_context)

            # Step 2: Assess impact and priority
            impact_assessment = await self._assess_impact_and_priority(signal_context, signal_analysis)

            # Step 3: Generate recommendations
            recommendations = await self._generate_recommendations(signal_analysis, impact_assessment)

            # Step 4: Create analysis summary
            analysis_summary = await self._create_analysis_summary(signal_analysis, impact_assessment)

            # Compile complete analysis
            analysis_result = {
                "analysis_assessment": {
                    "signal_id": signal_context.get('signal_id', 'unknown'),
                    "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
                    "analysis_type": "{signal_name_lower}_analysis",
                    "confidence_level": impact_assessment.get('confidence_level', 0.0),
                    "priority_level": impact_assessment.get('priority_level', PriorityLevel.MEDIUM.value)
                },
                "signal_analysis": signal_analysis,
                "impact_assessment": impact_assessment,
                "recommendations": recommendations,
                "analysis_summary": analysis_summary
            }

            self.logger.info(f"{signal_name_lower} analysis completed with confidence: {impact_assessment.get('confidence_level', 0.0)}")
            return analysis_result

        except Exception as e:
            self.logger.error(f"Error in {signal_name_lower} analysis: {str(e)}")
            raise

    async def _analyze_signal_characteristics(self, signal_context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze signal characteristics and properties"""

        # Implement signal-specific analysis logic
        analysis_result = AnalysisResult(
            classification="analyzed",
            confidence_level=0.0,
            supporting_evidence=[],
            recommendations=[],
            priority_level=PriorityLevel.MEDIUM.value
        )

        return {
            "classification": analysis_result.classification,
            "characteristics": {
                "signal_type": signal_context.get('signal_type', 'unknown'),
                "source": signal_context.get('source', 'unknown'),
                "timestamp": signal_context.get('timestamp', datetime.now(timezone.utc).isoformat())
            },
            "analysis_details": {
                "confidence_score": analysis_result.confidence_level,
                "evidence_count": len(analysis_result.supporting_evidence),
                "recommendation_count": len(analysis_result.recommendations)
            }
        }

    async def _assess_impact_and_priority(
        self,
        signal_context: Dict[str, Any],
        signal_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess impact level and priority"""

        # Implement impact assessment logic
        confidence_level = 0.0
        priority_level = PriorityLevel.MEDIUM.value

        # Calculate confidence based on signal characteristics
        confidence_level = min(100.0, len(str(signal_context)) * 2)  # Basic calculation

        # Determine priority based on signal characteristics
        if signal_context.get('urgency', 'normal') == 'high':
            priority_level = PriorityLevel.HIGH.value
        elif signal_context.get('urgency', 'normal') == 'critical':
            priority_level = PriorityLevel.CRITICAL.value

        return {
            "confidence_level": confidence_level,
            "priority_level": priority_level,
            "impact_assessment": {
                "scope": "determined",
                "urgency": signal_context.get('urgency', 'normal'),
                "stakeholders_affected": [],
                "estimated_effort": "medium"
            }
        }

    async def _generate_recommendations(
        self,
        signal_analysis: Dict[str, Any],
        impact_assessment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate actionable recommendations based on analysis"""

        priority = impact_assessment.get('priority_level', PriorityLevel.MEDIUM.value)

        recommendations = []

        if priority == PriorityLevel.CRITICAL.value:
            recommendations.append("Immediate attention required")
            recommendations.append("Escalate to leadership")
        elif priority == PriorityLevel.HIGH.value:
            recommendations.append("Prioritize for next available slot")
            recommendations.append("Allocate additional resources")
        else:
            recommendations.append("Process according to standard procedures")
            recommendations.append("Monitor for changes")

        return {
            "immediate_actions": recommendations[:2],
            "follow_up_actions": recommendations[2:],
            "prevention_measures": [
                "Implement monitoring for similar signals",
                "Document lessons learned",
                "Update procedures based on findings"
            ],
            "resource_requirements": self._assess_resource_requirements(priority)
        }

    async def _create_analysis_summary(
        self,
        signal_analysis: Dict[str, Any],
        impact_assessment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create comprehensive analysis summary"""

        return {
            "analysis_complete": True,
            "summary_highlights": [
                f"Priority: {impact_assessment.get('priority_level', 'unknown')}",
                f"Confidence: {impact_assessment.get('confidence_level', 0.0)}%",
                f"Classification: {signal_analysis.get('classification', 'unknown')}"
            ],
            "next_steps": [
                "Review analysis results",
                "Implement recommended actions",
                "Monitor progress",
                "Document outcomes"
            ],
            "quality_indicators": {
                "analysis_depth": "comprehensive",
                "evidence_quality": "validated",
                "recommendation_actionability": "high"
            }
        }

    def _assess_resource_requirements(self, priority_level: str) -> List[str]:
        """Assess resource requirements based on priority"""

        requirements = ["Standard analysis resources"]

        if priority_level in [PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value]:
            requirements.extend([
                "Additional analyst time",
                "Priority processing",
                "Leadership oversight"
            ])

        if priority_level == PriorityLevel.CRITICAL.value:
            requirements.extend([
                "Emergency response team",
                "Dedicated resources",
                "Real-time monitoring"
            ])

        return requirements

async def main():
    """Main function for standalone execution"""
    analyzer = {SignalName}Analyzer()

    # Example usage
    signal_context = {
        "signal_id": "SIGNAL-001",
        "signal_type": "{signal_name_lower}",
        "source": "system",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "urgency": "normal"
    }

    result = await analyzer.analyze_{signal_name_lower}(signal_context)

    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

### 4. Orchestrator Template (`orchestrator.md`)

```markdown
# {Signal Name} Signal Orchestrator Prompt

**Signal Code**: `{signal_code}`
**Orchestrator Role**: [Primary orchestrator responsibility]
**Version**: 1.0.0

## Response Instructions

You are an AI Orchestrator processing {Signal Name} (`[{signal_code}]`) signals. Your role is to [primary objective] with [key characteristics].

### Response Framework

#### 1. [Response Category 1]
**Immediate Actions**:
- **Action 1**: [Description]
- **Action 2**: [Description]
- **Action 3**: [Description]

**Classification**:
- **Level 1**: [Description]
- **Level 2**: [Description]
- **Level 3**: [Description]

#### 2. [Response Category 2]
**Response Matrix**:
- **Stakeholder 1**: [Response approach]
- **Stakeholder 2**: [Response approach]
- **Stakeholder 3**: [Response approach]

**Communication Content**:
- **Initial Response**: [Content description]
- **Progress Updates**: [Content description]
- **Final Resolution**: [Content description]

#### 3. [Response Category 3]
**Response Coordination**:
- **Phase 1**: [Description and timeline]
- **Phase 2**: [Description and timeline]
- **Phase 3**: [Description and timeline]

**Coordination Commands**:
- [Command 1]
- [Command 2]
- [Command 3]

### Response Structure

#### Response Command System
**Command Hierarchy**:
1. **[Role 1]**: [Responsibility]
2. **[Role 2]**: [Responsibility]
3. **[Role 3]**: [Responsibility]
4. **[Role 4]**: [Responsibility]
5. **[Role 5]**: [Responsibility]

**Decision Authority**:
- [Authority 1]
- [Authority 2]
- [Authority 3]
- [Authority 4]
- [Authority 5]

#### Resource Framework
**Response Resources**:
- **Resource Type 1**: [Description]
- **Resource Type 2**: [Description]
- **Resource Type 3**: [Description]
- **Resource Type 4**: [Description]
- **Resource Type 5**: [Description]

### Response Action Protocols

#### Immediate Response Actions
**Response Procedures**:
1. [Procedure 1]
2. [Procedure 2]
3. [Procedure 3]
4. [Procedure 4]
5. [Procedure 5]

**Response Measures**:
- [Measure 1]
- [Measure 2]
- [Measure 3]
- [Measure 4]
- [Measure 5]

#### Response Implementation
**Response Strategy**:
- **Strategy 1**: [Description]
- **Strategy 2**: [Description]
- **Strategy 3**: [Description]
- **Strategy 4**: [Description]
- **Strategy 5**: [Description]

**Response Execution**:
- [Execution step 1]
- [Execution step 2]
- [Execution step 3]
- [Execution step 4]
- [Execution step 5]

### Response Communication Management

#### Communication Strategy
**Primary Channels**:
- **Channel 1**: [Description]
- **Channel 2**: [Description]
- **Channel 3**: [Description]
- **Channel 4**: [Description]
- **Channel 5**: [Description]

**Communication Cadence**:
- **Initial Response**: [Timeline]
- **Progress Updates**: [Timeline]
- **Status Changes**: [Timeline]
- **Final Resolution**: [Timeline]

#### Message Content Standards
**Initial Response Format**:
```
RESPONSE INITIATED - [{signal_code}] - [TIMESTAMP]

Status: [Current Status]
Context: [Signal Context]
Immediate Actions: [Actions Being Taken]

Response Team Activated
Contact: [Contact Information]
```

**Status Update Format**:
```
RESPONSE UPDATE - [SIGNAL ID] - [TIMESTAMP]

Status: [Current Status]
Progress: [Progress Made Since Last Update]
Next Steps: [Immediate Next Steps]
Estimated Completion: [Revised Timeline]

Response in progress
Team in coordination
```

### Response Documentation Requirements

#### Real-Time Documentation
**Documentation Components**:
- **Response Timeline**: [Description]
- **Actions Taken**: [Description]
- **Decisions Made**: [Description]
- **Communication Logs**: [Description]
- **Resource Allocation**: [Description]

**Documentation Standards**:
- **Timestamp Accuracy**: [Standard]
- **Factual Accuracy**: [Standard]
- **Completeness**: [Standard]
- **Clarity**: [Standard]
- **Accessibility**: [Standard]

### Quality Assurance Framework

#### Response Quality Metrics
**Effectiveness Metrics**:
- **Response Time**: [Metric description]
- **Resolution Quality**: [Metric description]
- **Stakeholder Satisfaction**: [Metric description]
- **Process Compliance**: [Metric description]
- **Communication Quality**: [Metric description]

**Process Quality Metrics**:
- **Protocol Adherence**: [Metric description]
- **Documentation Quality**: [Metric description]
- **Coordination Effectiveness**: [Metric description]
- **Decision Quality**: [Metric description]
- **Stakeholder Satisfaction**: [Metric description]

#### Quality Assurance Procedures
**Real-Time QA**:
- [Procedure 1]
- [Procedure 2]
- [Procedure 3]
- [Procedure 4]
- [Procedure 5]

**Post-Response QA**:
- [Procedure 1]
- [Procedure 2]
- [Procedure 3]
- [Procedure 4]
- [Procedure 5]

### Error Handling and Escalation

#### Common Response Issues
1. [Issue 1]
2. [Issue 2]
3. [Issue 3]
4. [Issue 4]
5. [Issue 5]
6. [Issue 6]

#### Escalation Procedures
**Automatic Escalation Triggers**:
- [Trigger 1]
- [Trigger 2]
- [Trigger 3]
- [Trigger 4]
- [Trigger 5]

**Escalation Protocol**:
1. [Escalation step 1]
2. [Escalation step 2]
3. [Escalation step 3]
4. [Escalation step 4]
5. [Escalation step 5]

### Integration with Response Systems

#### [Integration Type 1] Integration
- [Integration point 1]
- [Integration point 2]
- [Integration point 3]
- [Integration point 4]
- [Integration point 5]

#### [Integration Type 2] Integration
- [Integration point 1]
- [Integration point 2]
- [Integration point 3]
- [Integration point 4]
- [Integration point 5]

### Continuous Improvement

#### Learning from Responses
1. [Learning approach 1]
2. [Learning approach 2]
3. [Learning approach 3]
4. [Learning approach 4]
5. [Learning approach 5]

#### Response Enhancement
- [Enhancement 1]
- [Enhancement 2]
- [Enhancement 3]
- [Enhancement 4]
- [Enhancement 5]
```

### 5. Orchestrator Python Template (`orchestrator.py`)

```python
"""
{Signal Name} Signal Orchestrator Implementation

[Brief description of orchestrator functionality and responsibilities]
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logger = logging.getLogger(__name__)

class ResponseStatus(Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ESCALATED = "escalated"

class PriorityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ResponseAction:
    """Structure for response actions"""
    action_type: str
    description: str
    assigned_to: str
    due_time: str
    priority: str
    status: str

class {SignalName}Orchestrator:
    """Orchestrates responses to {Signal Name} signals"""

    def __init__(self):
        self.logger = logger
        self.start_time = datetime.now(timezone.utc)
        self.active_responses = {}

    async def orchestrate_response(
        self,
        signal_id: str,
        signal_analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Orchestrate comprehensive response to {Signal Name} signal

        Args:
            signal_id: Unique identifier for the signal
            signal_analysis: Analysis results from inspector
            context: Additional context and requirements

        Returns:
            Comprehensive response orchestration plan and execution status
        """
        try:
            self.logger.info(f"Starting response orchestration for signal: {signal_id}")

            # Step 1: Initialize response
            response_initialization = await self._initialize_response(signal_id, signal_analysis)

            # Step 2: Plan response actions
            response_actions = await self._plan_response_actions(signal_analysis, context)

            # Step 3: Coordinate resources
            resource_coordination = await self._coordinate_resources(response_actions)

            # Step 4: Create communication plan
            communication_plan = await self._create_communication_plan(response_initialization, response_actions)

            # Step 5: Execute response
            response_execution = await self._execute_response(response_actions, resource_coordination)

            # Compile complete orchestration
            orchestration_result = {
                "orchestration_assessment": {
                    "signal_id": signal_id,
                    "orchestration_start_time": datetime.now(timezone.utc).isoformat(),
                    "response_status": ResponseStatus.INITIATED.value,
                    "orchestration_lead": "{SignalName} Orchestrator",
                    "priority_level": self._determine_priority(signal_analysis)
                },
                "response_initialization": response_initialization,
                "response_actions": response_actions,
                "resource_coordination": resource_coordination,
                "communication_plan": communication_plan,
                "response_execution": response_execution
            }

            self.logger.info(f"Response orchestration completed for signal: {signal_id}")
            return orchestration_result

        except Exception as e:
            self.logger.error(f"Error in response orchestration: {str(e)}")
            raise

    async def _initialize_response(
        self,
        signal_id: str,
        signal_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Initialize response framework"""

        priority = self._determine_priority(signal_analysis)
        urgency = signal_analysis.get('impact_assessment', {}).get('urgency', 'normal')

        return {
            "response_id": f"RESP-{signal_id}",
            "initialization_timestamp": datetime.now(timezone.utc).isoformat(),
            "priority_level": priority,
            "urgency": urgency,
            "response_protocol": "standard" if urgency == "normal" else "expedited",
            "scope": self._determine_response_scope(signal_analysis),
            "estimated_completion": self._estimate_completion_time(priority, urgency)
        }

    async def _plan_response_actions(
        self,
        signal_analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Plan specific response actions"""

        priority = self._determine_priority(signal_analysis)
        actions = []

        # Standard actions for all signals
        actions.append(ResponseAction(
            action_type="analysis_review",
            description="Review signal analysis and findings",
            assigned_to="analyst",
            due_time="immediate",
            priority=priority.value,
            status="pending"
        ))

        actions.append(ResponseAction(
            action_type="response_planning",
            description="Develop detailed response plan",
            assigned_to="orchestrator",
            due_time="2_hours",
            priority=priority.value,
            status="pending"
        ))

        # Priority-specific actions
        if priority in [PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value]:
            actions.append(ResponseAction(
                action_type="leadership_notification",
                description="Notify leadership of high-priority signal",
                assigned_to="coordinator",
                due_time="immediate",
                priority=priority.value,
                status="pending"
            ))

        if priority == PriorityLevel.CRITICAL.value:
            actions.append(ResponseAction(
                action_type="emergency_response",
                description="Initiate emergency response procedures",
                assigned_to="emergency_team",
                due_time="immediate",
                priority=priority.value,
                status="pending"
            ))

        return {
            "planned_actions": [asdict(action) for action in actions],
            "action_count": len(actions),
            "high_priority_actions": len([a for a in actions if a.priority in [PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value]]),
            "estimated_effort": self._estimate_response_effort(actions),
            "dependencies": self._identify_action_dependencies(actions)
        }

    async def _coordinate_resources(self, response_actions: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate resources for response actions"""

        actions = response_actions.get('planned_actions', [])
        resource_requirements = self._analyze_resource_requirements(actions)

        return {
            "required_resources": resource_requirements,
            "resource_availability": self._check_resource_availability(resource_requirements),
            "allocation_plan": self._create_resource_allocation_plan(resource_requirements),
            "resource_shortages": self._identify_resource_shortages(resource_requirements),
            "escalation_needs": self._identify_escalation_needs(resource_requirements)
        }

    async def _create_communication_plan(
        self,
        response_initialization: Dict[str, Any],
        response_actions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create comprehensive communication plan"""

        priority = response_initialization.get('priority_level', PriorityLevel.MEDIUM.value)
        urgency = response_initialization.get('urgency', 'normal')

        communications = []

        # Standard communications
        communications.append({
            "type": "initial_response",
            "audience": "stakeholders",
            "timing": "immediate",
            "channel": "email",
            "template": "initial_response_template"
        })

        # Priority-specific communications
        if priority in [PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value]:
            communications.append({
                "type": "leadership_alert",
                "audience": "leadership",
                "timing": "immediate",
                "channel": "direct_communication",
                "template": "leadership_alert_template"
            })

        return {
            "communications": communications,
            "communication_schedule": self._create_communication_schedule(communications),
            "stakeholder_matrix": self._create_stakeholder_matrix(priority),
            "message_templates": self._prepare_message_templates(priority),
            "escalation_communications": self._plan_escalation_communications(priority)
        }

    async def _execute_response(
        self,
        response_actions: Dict[str, Any],
        resource_coordination: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute planned response actions"""

        execution_status = {
            "execution_start_time": datetime.now(timezone.utc).isoformat(),
            "actions_completed": [],
            "actions_in_progress": [],
            "issues_encountered": [],
            "overall_status": ResponseStatus.IN_PROGRESS.value
        }

        # Execute actions based on priority and dependencies
        actions = response_actions.get('planned_actions', [])
        available_resources = resource_coordination.get('resource_availability', {})

        for action in actions:
            try:
                # Simulate action execution
                await self._execute_action(action, available_resources)
                execution_status["actions_completed"].append(action['action_type'])
                self.logger.info(f"Completed action: {action['action_type']}")

            except Exception as e:
                error_msg = f"Error executing action {action['action_type']}: {str(e)}"
                self.logger.error(error_msg)
                execution_status["issues_encountered"].append(error_msg)

        execution_status["overall_status"] = "completed" if not execution_status["issues_encountered"] else "completed_with_issues"
        execution_status["execution_end_time"] = datetime.now(timezone.utc).isoformat()

        return {
            "execution_status": execution_status,
            "response_outcome": await self._assess_response_outcome(execution_status),
            "lessons_learned": await self._capture_lessons_learned(execution_status),
            "follow_up_actions": await self._identify_follow_up_actions(execution_status)
        }

    def _determine_priority(self, signal_analysis: Dict[str, Any]) -> PriorityLevel:
        """Determine response priority based on signal analysis"""

        priority_str = signal_analysis.get('analysis_assessment', {}).get('priority_level', PriorityLevel.MEDIUM.value)

        if priority_str == PriorityLevel.CRITICAL.value:
            return PriorityLevel.CRITICAL
        elif priority_str == PriorityLevel.HIGH.value:
            return PriorityLevel.HIGH
        elif priority_str == PriorityLevel.LOW.value:
            return PriorityLevel.LOW
        else:
            return PriorityLevel.MEDIUM

    def _determine_response_scope(self, signal_analysis: Dict[str, Any]) -> str:
        """Determine scope of response required"""

        # Implement scope determination logic
        priority = self._determine_priority(signal_analysis)

        if priority == PriorityLevel.CRITICAL:
            return "emergency_response"
        elif priority == PriorityLevel.HIGH:
            return "expedited_response"
        else:
            return "standard_response"

    def _estimate_completion_time(self, priority: PriorityLevel, urgency: str) -> str:
        """Estimate response completion time"""

        if priority == PriorityLevel.CRITICAL or urgency == "critical":
            return "1-2 hours"
        elif priority == PriorityLevel.HIGH:
            return "4-8 hours"
        elif urgency == "high":
            return "8-24 hours"
        else:
            return "1-3 days"

    def _estimate_response_effort(self, actions: List[ResponseAction]) -> str:
        """Estimate total effort required for response"""

        total_effort = len(actions)
        high_priority_count = len([a for a in actions if a.priority in [PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value]])

        if high_priority_count > 0:
            return "high_effort"
        elif total_effort > 5:
            return "medium_effort"
        else:
            return "low_effort"

    def _identify_action_dependencies(self, actions: List[ResponseAction]) -> List[str]:
        """Identify dependencies between actions"""

        # Implement dependency identification logic
        dependencies = []

        # Example dependency rules
        action_types = [a.action_type for a in actions]
        if "response_planning" in action_types and "analysis_review" in action_types:
            dependencies.append("response_planning depends on analysis_review")

        return dependencies

    def _analyze_resource_requirements(self, actions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze resource requirements for actions"""

        requirements = {
            "personnel": [],
            "tools": [],
            "systems": [],
            "external_resources": []
        }

        for action in actions:
            assigned_to = action.get('assigned_to', '')

            if assigned_to == "analyst":
                requirements["personnel"].append("technical_analyst")
            elif assigned_to == "emergency_team":
                requirements["personnel"].append("emergency_response_team")
            elif assigned_to == "leadership":
                requirements["personnel"].append("leadership_team")

        return requirements

    def _check_resource_availability(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Check availability of required resources"""

        # Implement resource availability checking
        return {
            "personnel_available": True,
            "tools_available": True,
            "systems_available": True,
            "external_resources_available": True,
            "overall_availability": "sufficient"
        }

    def _create_resource_allocation_plan(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Create resource allocation plan"""

        return {
            "allocation_strategy": "priority_based",
            "personnel_allocation": {
                "technical_analyst": 1,
                "emergency_team": 1 if "emergency_response_team" in requirements.get("personnel", []) else 0
            },
            "tool_allocation": ["standard_toolkit"],
            "system_access": ["standard_access"],
            "backup_resources": ["backup_personnel"]
        }

    def _identify_resource_shortages(self, requirements: Dict[str, Any]) -> List[str]:
        """Identify potential resource shortages"""

        # Implement resource shortage identification
        shortages = []

        # Example shortage logic
        if "emergency_response_team" in requirements.get("personnel", []):
            # Check if emergency team is available
            shortages.append("emergency_team_availability_needs_verification")

        return shortages

    def _identify_escalation_needs(self, requirements: Dict[str, Any]) -> List[str]:
        """Identify escalation needs based on resource requirements"""

        needs = []

        if "emergency_response_team" in requirements.get("personnel", []):
            needs.append("emergency_response_escalation")

        return needs

    def _create_communication_schedule(self, communications: List[Dict[str, Any]]) -> Dict[str, str]:
        """Create communication schedule"""

        schedule = {}
        for comm in communications:
            timing = comm.get('timing', 'standard')
            comm_type = comm.get('type', 'unknown')
            schedule[comm_type] = timing

        return schedule

    def _create_stakeholder_matrix(self, priority: PriorityLevel) -> Dict[str, List[str]]:
        """Create stakeholder communication matrix"""

        stakeholders = {
            "primary": ["team_members", "direct_supervisor"],
            "secondary": ["department_head", "related_teams"],
            "leadership": ["executive_leadership"]
        }

        if priority in [PriorityLevel.HIGH.value, PriorityLevel.CRITICAL.value]:
            stakeholders["primary"].extend(["emergency_coordinator", "crisis_management_team"])

        return stakeholders

    def _prepare_message_templates(self, priority: PriorityLevel) -> Dict[str, str]:
        """Prepare message templates based on priority"""

        templates = {
            "standard": "Standard response initiated for signal {signal_id}",
            "expedited": "Expedited response initiated for high-priority signal {signal_id}",
            "emergency": "EMERGENCY: Critical response initiated for signal {signal_id}"
        }

        return {
            "initial_response": templates.get(priority.value, templates["standard"]),
            "progress_update": "Progress update on signal {signal_id}: {status}",
            "resolution": "Signal {signal_id} response completed: {outcome}"
        }

    def _plan_escalation_communications(self, priority: PriorityLevel) -> List[Dict[str, Any]]:
        """Plan escalation communication paths"""

        escalations = []

        if priority == PriorityLevel.CRITICAL:
            escalations.append({
                "trigger": "immediate",
                "audience": ["emergency_management", "executive_leadership"],
                "method": "direct_communication"
            })
        elif priority == PriorityLevel.HIGH:
            escalations.append({
                "trigger": "if_resolution_delayed",
                "audience": ["department_head", "crisis_coordinator"],
                "method": "email_and_phone"
            })

        return escalations

    async def _execute_action(self, action: Dict[str, Any], available_resources: Dict[str, Any]) -> None:
        """Execute a specific response action"""

        # Simulate action execution
        action_type = action.get('action_type', '')
        assigned_to = action.get('assigned_to', '')

        # Check if required resources are available
        if not available_resources.get('overall_availability') == 'sufficient':
            raise Exception(f"Insufficient resources for action: {action_type}")

        # Simulate execution time
        await asyncio.sleep(0.1)

        # Update action status
        action['status'] = 'completed'

    async def _assess_response_outcome(self, execution_status: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall response outcome"""

        completed_actions = len(execution_status.get('actions_completed', []))
        issues = len(execution_status.get('issues_encountered', []))

        success_rate = (completed_actions / max(completed_actions + issues, 1)) * 100

        return {
            "actions_completed": completed_actions,
            "issues_encountered": issues,
            "success_rate": success_rate,
            "overall_outcome": "successful" if success_rate >= 90 else "partially_successful" if success_rate >= 70 else "needs_improvement",
            "quality_score": min(100, success_rate + 10)  # Add quality bonus
        }

    async def _capture_lessons_learned(self, execution_status: Dict[str, Any]) -> List[str]:
        """Capture lessons learned from response execution"""

        lessons = []

        issues = execution_status.get('issues_encountered', [])
        if issues:
            lessons.append("Review resource availability and allocation procedures")

        success_rate = (len(execution_status.get('actions_completed', [])) /
                      max(len(execution_status.get('actions_completed', [])) + len(issues), 1)) * 100

        if success_rate < 100:
            lessons.append("Improve action execution and dependency management")

        return lessons

    async def _identify_follow_up_actions(self, execution_status: Dict[str, Any]) -> List[str]:
        """Identify follow-up actions required"""

        follow_up = []

        issues = execution_status.get('issues_encountered', [])
        if issues:
            follow_up.append("Address execution issues and implement corrective measures")

        follow_up.extend([
            "Document response execution outcomes",
            "Update response procedures based on lessons learned",
            "Review and improve resource allocation processes"
        ])

        return follow_up

async def main():
    """Main function for standalone execution"""
    orchestrator = {SignalName}Orchestrator()

    # Example usage
    signal_id = "SIGNAL-001"
    signal_analysis = {
        "analysis_assessment": {
            "signal_id": signal_id,
            "priority_level": PriorityLevel.HIGH.value,
            "confidence_level": 85.0
        },
        "impact_assessment": {
            "urgency": "high",
            "scope": "department_wide"
        }
    }

    context = {
        "additional_requirements": [],
        "constraints": [],
        "stakeholders": ["team", "leadership"]
    }

    result = await orchestrator.orchestrate_response(signal_id, signal_analysis, context)

    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

## 🔧 IMPLEMENTATION GUIDELINES

### Signal Implementation Process

1. **Create Signal Directory**: `mkdir -p src/guidelines/EN/signals/{signal_code}/`
2. **Implement All Components**: Create all 5 required files using templates
3. **Customize for Signal**: Adapt templates to signal-specific requirements
4. **Validate Implementation**: Ensure all components work together
5. **Test Integration**: Test with Scanner → Inspector → Orchestrator flow
6. **Document Customization**: Document any signal-specific customizations

### Quality Standards

- **Completeness**: All 5 components must be implemented
- **Consistency**: Follow established patterns and naming conventions
- **Functionality**: All components must be functional and tested
- **Documentation**: All components must be thoroughly documented
- **Integration**: All components must integrate properly with the system

### Maintenance Guidelines

- **Regular Updates**: Review and update signals annually
- **Version Control**: Use semantic versioning for all components
- **Testing**: Maintain comprehensive test coverage
- **Documentation**: Keep documentation current with implementation
- **Performance**: Monitor and optimize performance regularly

---

*This Master Signal Template Framework provides a comprehensive foundation for implementing consistent, high-quality signal processing across the entire PRP system.*