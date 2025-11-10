# [HF] Health Feedback Signal Inspector

## Overview
The Health Feedback signal [HF] is emitted when orchestration cycles start or when system health feedback is available. This signal indicates the beginning of orchestration processes or provides updates on system health status.

## Signal Characteristics
- **Signal Code**: HF
- **Priority**: Medium (3/10)
- **Category**: System Information
- **Handler**: Orchestrator
- **Escalation**: To higher priority signals if critical health issues detected

## Processing Logic

### Classification Metrics (0-100)
- **Priority**: Based on critical health indicators (error, failure, down)
- **Accuracy**: Increased for clear [HF] patterns and health/feedback keywords
- **Acceptance**: High (85+) as health feedback is generally well-accepted
- **Complexity**: Low to medium based on detail level

### Analysis Points
1. **Health Indicators Extraction**
   - System status (healthy/unhealthy/unknown)
   - Component health mentions
   - Metrics or data references
   - Error indicators

2. **Cycle Stage Determination**
   - Initialization: "start" keywords detected
   - Active: "running" keywords detected
   - Completed: "complete" keywords detected

3. **Action Requirements**
   - High priority (>70) or low accuracy (<50) requires orchestrator action
   - System unhealthy status triggers escalation
   - Cycle start requires orchestration initialization

## Payload Structure
```json
{
  "signal_id": "string",
  "signal_type": "[HF]",
  "classification": {
    "priority": 0-100,
    "accuracy": 0-100,
    "acceptance": 0-100,
    "complexity": 0-100,
    "confidence": 0-100
  },
  "analysis": {
    "raw_signal": "string",
    "context": "string",
    "source": "string",
    "timestamp": "ISO8601",
    "health_indicators": {
      "system_status": "healthy|unhealthy|unknown",
      "component_health": ["string"],
      "metrics_mentioned": boolean,
      "error_indicators": ["string"]
    },
    "cycle_stage": "initialization|active|completed|unknown"
  },
  "recommendations": ["string"],
  "requires_action": boolean,
  "escalation_threshold": 7,
  "processing_time": "ISO8601"
}
```

## Orchestrator Response Patterns

### High Priority Health Feedback (>70)
- Initiate immediate system health check
- Consider escalation to admin for critical issues
- Monitor system components
- Provide 5-10 minute resolution estimate

### Cycle Start (initialization stage)
- Create new orchestration cycle
- Initialize scanner, inspector, and agents
- Monitor component initialization
- Provide 2-5 minute initialization estimate

### Regular Health Feedback
- Log and track health metrics
- Monitor trends over time
- Alert on significant health changes
- No immediate action required

## Escalation Rules
- Critical system health issues → [AA] Admin Attention
- Persistent unhealthy status → [OO] Orchestrator Action
- Component failures → [OO-failure] System Failure

## Integration Points
- Scanner: Detects [HF] patterns and health-related keywords
- Inspector: Analyzes health context and prepares detailed payload
- Orchestrator: Coordinates responses based on health status and cycle stage
- Admin: Receives escalations for critical health issues