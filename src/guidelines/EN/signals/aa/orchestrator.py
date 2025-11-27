"""
Admin Attention Signal Orchestrator Implementation

Processes [aa] - Admin Attention signals and prepares comprehensive admin notifications.
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum

class UrgencyLevel(Enum):
    IMMEDIATE = "immediate"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class NotificationChannel(Enum):
    NUDGE = "nudge"
    EMAIL = "email"
    SLACK = "slack"
    TEAMS = "teams"

class AAOrchestrator:
    """Orchestrator for admin attention signals"""

    def __init__(self):
        self.signal_code = 'aa'
        self.default_response_time = 24  # hours

    async def process_signal(self, inspector_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process admin attention signal and prepare notification"""

        # Extract inspector analysis
        signal_analysis = inspector_payload.get('analysis', {})
        decision_options = inspector_payload.get('decision_options', [])
        recommendation = inspector_payload.get('recommendation', {})
        classification = inspector_payload.get('classification', {})

        # Prepare notification components
        executive_summary = self._prepare_executive_summary(signal_analysis, classification)
        context_overview = self._prepare_context_overview(signal_analysis)
        options_analysis = self._prepare_options_analysis(decision_options)
        impact_assessment = self._prepare_impact_assessment(decision_options, signal_analysis)
        recommendation_section = self._prepare_recommendation_section(recommendation)
        action_required = self._prepare_action_required(signal_analysis, classification)

        # Determine communication strategy
        communication_strategy = self._determine_communication_strategy(classification)

        # Prepare notification content
        notification_content = self._prepare_notification_content(
            executive_summary,
            context_overview,
            options_analysis,
            impact_assessment,
            recommendation_section,
            action_required
        )

        # Prepare notification delivery
        notification_delivery = self._prepare_notification_delivery(
            communication_strategy,
            executive_summary,
            signal_analysis
        )

        # Create comprehensive response
        response = {
            'signal_id': inspector_payload.get('signal_id'),
            'signal_type': 'aa',
            'action': 'notify_admin',
            'notification': {
                'subject': self._generate_subject(executive_summary, classification),
                'content': notification_content,
                'delivery': notification_delivery,
                'priority': classification.get('priority', 75),
                'urgency': classification.get('urgency', 'medium'),
                'channels': communication_strategy['channels'],
                'follow_up_required': True
            },
            'decision_tracking': {
                'decision_deadline': self._calculate_deadline(classification),
                'reminder_schedule': self._calculate_reminder_schedule(classification),
                'response_tracking': True,
                'implementation_tracking': True
            },
            'quality_assurance': {
                'completeness_score': self._calculate_completeness_score(notification_content),
                'clarity_score': self._calculate_clarity_score(notification_content),
                'actionability_score': self._calculate_actionability_score(action_required)
            },
            'metadata': {
                'processing_time': datetime.now().isoformat(),
                'option_count': len(decision_options),
                'has_recommendation': bool(recommendation.get('recommended_option')),
                'communication_strategy': communication_strategy['strategy_name']
            }
        }

        return response

    def _prepare_executive_summary(self, signal_analysis: Dict[str, Any],
                                 classification: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare executive summary section"""

        return {
            'problem_statement': signal_analysis.get('decision_required', 'Administrative decision required'),
            'urgency_level': classification.get('urgency', 'medium'),
            'priority_score': classification.get('priority', 75),
            'impact_scope': self._determine_impact_scope(signal_analysis),
            'decision_timeline': self._format_decision_timeline(classification.get('urgency', 'medium')),
            'recommended_action': self._create_recommended_action(signal_analysis, classification)
        }

    def _prepare_context_overview(self, signal_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context overview section"""

        current_situation = signal_analysis.get('current_situation', {})

        return {
            'current_situation': current_situation.get('description', 'No specific situation description provided'),
            'prp_status': current_situation.get('prp_status', 'Unknown'),
            'current_progress': current_situation.get('current_progress', 0),
            'timeline_pressure': current_situation.get('timeline_pressure', False),
            'resource_constraints': current_situation.get('resource_constraints', False),
            'blockers': current_situation.get('blockers', []),
            'dependencies': current_situation.get('dependencies', []),
            'additional_context': signal_analysis.get('context_available', 'unknown')
        }

    def _prepare_options_analysis(self, decision_options: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prepare detailed options analysis"""

        analyzed_options = []

        for option in decision_options:
            option_id = option.get('option_id', 'Unknown')

            analyzed_option = {
                'option_id': option_id,
                'option_title': f"Option {option_id}: {option.get('description', 'No description')}",
                'description': option.get('description', 'No description provided'),
                'pros': option.get('pros', []),
                'cons': option.get('cons', []),
                'resource_requirements': self._format_resource_requirements(option.get('resource_requirements', {})),
                'implementation_complexity': option.get('implementation_complexity', 'medium'),
                'implementation_timeline': self._estimate_implementation_timeline(option),
                'stakeholder_impact': self._format_stakeholder_impact(option.get('stakeholder_impact', {})),
                'risk_assessment': self._format_risk_assessment(option.get('risk_assessment', {})),
                'estimated_outcome': option.get('estimated_outcome', 'Outcome to be determined')
            }

            analyzed_options.append(analyzed_option)

        return analyzed_options

    def _prepare_impact_assessment(self, decision_options: List[Dict[str, Any]],
                                 signal_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare impact assessment section"""

        stakeholder_impact = signal_analysis.get('stakeholder_impact', {})
        resource_implications = signal_analysis.get('resource_implications', {})

        # Analyze positive and negative impacts across options
        positive_impacts = set()
        negative_impacts = set()

        for option in decision_options:
            for pro in option.get('pros', []):
                positive_impacts.add(pro)
            for con in option.get('cons', []):
                negative_impacts.add(con)

        return {
            'positive_impacts': list(positive_impacts),
            'negative_impacts': list(negative_impacts),
            'stakeholder_analysis': {
                'affected_groups': stakeholder_impact.get('affected_groups', []),
                'max_impact_level': stakeholder_impact.get('max_impact_level', 'moderate'),
                'total_stakeholders': len(stakeholder_impact.get('affected_groups', []))
            },
            'system_impact': self._analyze_system_impact(decision_options),
            'timeline_impact': self._analyze_timeline_impact(decision_options),
            'resource_implications': resource_implications
        }

    def _prepare_recommendation_section(self, recommendation: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare recommendation section"""

        if not recommendation.get('recommended_option'):
            return {
                'has_recommendation': False,
                'message': 'Insufficient information to provide a specific recommendation'
            }

        return {
            'has_recommendation': True,
            'recommended_option': recommendation.get('recommended_option'),
            'justification': recommendation.get('justification', 'Recommendation based on analysis'),
            'expected_outcomes': recommendation.get('expected_outcomes', []),
            'success_metrics': recommendation.get('success_metrics', []),
            'implementation_timeline': recommendation.get('implementation_timeline', 'Standard implementation time'),
            'confidence_level': self._calculate_recommendation_confidence(recommendation)
        }

    def _prepare_action_required(self, signal_analysis: Dict[str, Any],
                               classification: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare action required section"""

        return {
            'decision_needed': signal_analysis.get('decision_required', 'Administrative decision required'),
            'decision_deadline': self._calculate_deadline(classification),
            'implementation_steps': self._outline_implementation_steps(signal_analysis),
            'follow_up_required': True,
            'contact_information': self._get_contact_information(),
            'escalation_path': self._get_escalation_path()
        }

    def _determine_communication_strategy(self, classification: Dict[str, Any]) -> Dict[str, Any]:
        """Determine communication strategy based on urgency and priority"""

        urgency = classification.get('urgency', 'medium')
        priority = classification.get('priority', 75)

        if urgency == 'immediate' or priority >= 90:
            return {
                'strategy_name': 'immediate_multi_channel',
                'channels': [NotificationChannel.NUDGE.value, NotificationChannel.SLACK.value],
                'follow_up_interval': 1,  # hours
                'escalation_interval': 2  # hours
            }
        elif urgency == 'high' or priority >= 70:
            return {
                'strategy_name': 'high_priority_email_chat',
                'channels': [NotificationChannel.EMAIL.value, NotificationChannel.SLACK.value],
                'follow_up_interval': 4,  # hours
                'escalation_interval': 8  # hours
            }
        elif urgency == 'medium':
            return {
                'strategy_name': 'standard_email',
                'channels': [NotificationChannel.EMAIL.value],
                'follow_up_interval': 24,  # hours
                'escalation_interval': 48  # hours
            }
        else:  # low urgency
            return {
                'strategy_name': 'low_priority_email',
                'channels': [NotificationChannel.EMAIL.value],
                'follow_up_interval': 72,  # hours
                'escalation_interval': 120  # hours
            }

    def _prepare_notification_content(self, executive_summary: Dict[str, Any],
                                    context_overview: Dict[str, Any],
                                    options_analysis: List[Dict[str, Any]],
                                    impact_assessment: Dict[str, Any],
                                    recommendation_section: Dict[str, Any],
                                    action_required: Dict[str, Any]) -> str:
        """Prepare formatted notification content"""

        content_parts = []

        # Executive Summary
        content_parts.append("## Executive Summary")
        content_parts.append(f"**Problem**: {executive_summary['problem_statement']}")
        content_parts.append(f"**Urgency**: {executive_summary['urgency_level'].title()}")
        content_parts.append(f"**Impact Scope**: {executive_summary['impact_scope']}")
        content_parts.append(f"**Decision Timeline**: {executive_summary['decision_timeline']}")
        content_parts.append(f"**Recommended Action**: {executive_summary['recommended_action']}")
        content_parts.append("")

        # Context Overview
        content_parts.append("## Context Overview")
        content_parts.append(f"**Current Situation**: {context_overview['current_situation']}")
        content_parts.append(f"**PRP Status**: {context_overview['prp_status']}")
        content_parts.append(f"**Progress**: {context_overview['current_progress']}% complete")

        if context_overview['timeline_pressure']:
            content_parts.append("⚠️ **Timeline Pressure**: Yes")
        if context_overview['resource_constraints']:
            content_parts.append("⚠️ **Resource Constraints**: Yes")

        content_parts.append("")

        # Decision Options
        content_parts.append("## Decision Options")
        for option in options_analysis:
            content_parts.append(f"### {option['option_title']}")
            content_parts.append(f"**Description**: {option['description']}")

            if option['pros']:
                content_parts.append("**Pros**:")
                for pro in option['pros']:
                    content_parts.append(f"- {pro}")

            if option['cons']:
                content_parts.append("**Cons**:")
                for con in option['cons']:
                    content_parts.append(f"- {con}")

            content_parts.append(f"**Resource Requirements**: {option['resource_requirements']}")
            content_parts.append(f"**Implementation Complexity**: {option['implementation_complexity'].title()}")
            content_parts.append(f"**Timeline**: {option['implementation_timeline']}")
            content_parts.append("")

        # Impact Assessment
        content_parts.append("## Impact Assessment")
        content_parts.append(f"**Stakeholder Impact**: {', '.join(impact_assessment['stakeholder_analysis']['affected_groups']) or 'General stakeholders'}")
        content_parts.append(f"**Impact Level**: {impact_assessment['stakeholder_analysis']['max_impact_level'].title()}")

        if impact_assessment['system_impact']:
            content_parts.append(f"**System Impact**: {impact_assessment['system_impact']}")
        if impact_assessment['timeline_impact']:
            content_parts.append(f"**Timeline Impact**: {impact_assessment['timeline_impact']}")

        content_parts.append("")

        # Recommendation
        content_parts.append("## Recommendation")
        if recommendation_section['has_recommendation']:
            content_parts.append(f"**Recommended Option**: {recommendation_section['recommended_option']}")
            content_parts.append(f"**Justification**: {recommendation_section['justification']}")

            if recommendation_section['expected_outcomes']:
                content_parts.append("**Expected Outcomes**:")
                for outcome in recommendation_section['expected_outcomes']:
                    content_parts.append(f"- {outcome}")

            content_parts.append(f"**Implementation Timeline**: {recommendation_section['implementation_timeline']}")
            content_parts.append(f"**Confidence Level**: {recommendation_section['confidence_level']}%")
        else:
            content_parts.append(recommendation_section['message'])

        content_parts.append("")

        # Action Required
        content_parts.append("## Action Required")
        content_parts.append(f"**Decision Needed**: {action_required['decision_needed']}")
        content_parts.append(f"**Decision Deadline**: {action_required['decision_deadline']}")
        content_parts.append(f"**Contact**: {action_required['contact_information']}")

        if action_required['escalation_path']:
            content_parts.append(f"**Escalation**: {action_required['escalation_path']}")

        return "\n".join(content_parts)

    def _prepare_notification_delivery(self, communication_strategy: Dict[str, Any],
                                     executive_summary: Dict[str, Any],
                                     signal_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare notification delivery configuration"""

        return {
            'channels': communication_strategy['channels'],
            'delivery_schedule': {
                'initial_notification': datetime.now().isoformat(),
                'follow_up_reminders': self._calculate_follow_up_schedule(communication_strategy),
                'escalation_schedule': self._calculate_escalation_schedule(communication_strategy)
            },
            'delivery_options': {
                'nudge_priority': 'high' if executive_summary['urgency_level'] in ['immediate', 'high'] else 'normal',
                'email_priority': 'high' if executive_summary['urgency_level'] in ['immediate', 'high'] else 'normal',
                'slack_channel': self._determine_slack_channel(executive_summary),
                'template': self._select_notification_template(signal_analysis)
            }
        }

    def _generate_subject(self, executive_summary: Dict[str, Any],
                         classification: Dict[str, Any]) -> str:
        """Generate notification subject line"""

        problem_brief = executive_summary['problem_statement'][:50]
        if len(executive_summary['problem_statement']) > 50:
            problem_brief += "..."

        priority_indicator = ""
        if classification.get('priority', 75) >= 90:
            priority_indicator = " - CRITICAL"
        elif classification.get('priority', 75) >= 70:
            priority_indicator = " - HIGH"

        return f"[AA] Admin Attention Required: {problem_brief}{priority_indicator}"

    def _calculate_deadline(self, classification: Dict[str, Any]) -> str:
        """Calculate decision deadline"""

        urgency = classification.get('urgency', 'medium')
        now = datetime.now()

        if urgency == 'immediate':
            deadline = now + timedelta(hours=1)
        elif urgency == 'high':
            deadline = now + timedelta(hours=4)
        elif urgency == 'medium':
            deadline = now + timedelta(hours=24)
        else:  # low
            deadline = now + timedelta(hours=72)

        return deadline.strftime("%Y-%m-%d %H:%M UTC")

    def _calculate_reminder_schedule(self, classification: Dict[str, Any]) -> List[str]:
        """Calculate reminder schedule"""

        urgency = classification.get('urgency', 'medium')
        now = datetime.now()

        if urgency == 'immediate':
            return [
                (now + timedelta(minutes=30)).isoformat(),
                (now + timedelta(hours=1)).isoformat()
            ]
        elif urgency == 'high':
            return [
                (now + timedelta(hours=2)).isoformat(),
                (now + timedelta(hours=4)).isoformat()
            ]
        else:
            return [
                (now + timedelta(hours=12)).isoformat(),
                (now + timedelta(hours=24)).isoformat()
            ]

    def _calculate_follow_up_schedule(self, communication_strategy: Dict[str, Any]) -> List[str]:
        """Calculate follow-up reminder schedule"""

        interval_hours = communication_strategy.get('follow_up_interval', 24)
        now = datetime.now()

        schedule = []
        for i in range(1, 4):  # 3 follow-up reminders
            follow_up_time = now + timedelta(hours=interval_hours * i)
            schedule.append(follow_up_time.isoformat())

        return schedule

    def _calculate_escalation_schedule(self, communication_strategy: Dict[str, Any]) -> List[str]:
        """Calculate escalation schedule"""

        escalation_interval = communication_strategy.get('escalation_interval', 48)
        now = datetime.now()

        escalation_time = now + timedelta(hours=escalation_interval)
        return [escalation_time.isoformat()]

    def _determine_impact_scope(self, signal_analysis: Dict[str, Any]) -> str:
        """Determine impact scope"""

        stakeholder_impact = signal_analysis.get('stakeholder_impact', {})
        affected_groups = stakeholder_impact.get('affected_groups', [])

        if 'system' in affected_groups or 'users' in affected_groups:
            return "System-wide"
        elif len(affected_groups) >= 3:
            return "Multiple departments"
        elif len(affected_groups) >= 1:
            return f"{', '.join(affected_groups)}"
        else:
            return "Local impact"

    def _format_decision_timeline(self, urgency: str) -> str:
        """Format decision timeline"""

        timelines = {
            'immediate': 'Within 1 hour',
            'high': 'Within 4 hours',
            'medium': 'Within 24 hours',
            'low': 'Within 3 days'
        }

        return timelines.get(urgency, 'Within 24 hours')

    def _create_recommended_action(self, signal_analysis: Dict[str, Any],
                                classification: Dict[str, Any]) -> str:
        """Create recommended action summary"""

        decision_needed = signal_analysis.get('decision_required', 'Administrative decision required')
        urgency = classification.get('urgency', 'medium')

        if urgency == 'immediate':
            return f"Immediate decision required: {decision_needed}"
        elif urgency == 'high':
            return f"Priority decision needed: {decision_needed}"
        else:
            return f"Decision requested: {decision_needed}"

    def _format_resource_requirements(self, resource_requirements: Dict[str, Any]) -> str:
        """Format resource requirements"""

        if not resource_requirements:
            return "No specific resource requirements identified"

        requirements = []

        if resource_requirements.get('human_resources') == 'required':
            requirements.append("Human resources")
        if resource_requirements.get('technical_resources') == 'required':
            requirements.append("Technical resources")
        if resource_requirements.get('financial_resources') not in ['unknown', 'none']:
            requirements.append(f"Financial resources ({resource_requirements['financial_resources']})")

        return ", ".join(requirements) if requirements else "Standard resources"

    def _format_stakeholder_impact(self, stakeholder_impact: Dict[str, Any]) -> str:
        """Format stakeholder impact"""

        affected_groups = stakeholder_impact.get('affected_groups', [])
        impact_level = stakeholder_impact.get('impact_level', 'moderate')

        if not affected_groups:
            return f"{impact_level.title()} impact on general stakeholders"

        return f"{impact_level.title()} impact on: {', '.join(affected_groups)}"

    def _format_risk_assessment(self, risk_assessment: Dict[str, Any]) -> str:
        """Format risk assessment"""

        risk_level = risk_assessment.get('risk_level', 'medium')
        probability = risk_assessment.get('probability', 50)

        return f"{risk_level.title()} risk (probability: {probability}%)"

    def _estimate_implementation_timeline(self, option: Dict[str, Any]) -> str:
        """Estimate implementation timeline"""

        complexity = option.get('implementation_complexity', 'medium')
        resource_requirements = option.get('resource_requirements', {})

        base_timelines = {
            'low': '1-2 hours',
            'medium': '4-8 hours',
            'high': '1-2 days',
            'critical': '3-5 days'
        }

        timeline = base_timelines.get(complexity, '4-8 hours')

        # Adjust for resource requirements
        if resource_requirements.get('financial_resources') == 'high':
            timeline = "Extended timeline due to resource requirements"

        return timeline

    def _analyze_system_impact(self, decision_options: List[Dict[str, Any]]) -> str:
        """Analyze system impact across options"""

        impacts = []

        for option in decision_options:
            description = option.get('description', '').lower()
            if any(word in description for word in ['system', 'infrastructure', 'platform']):
                impacts.append(option.get('option_id', 'Unknown'))

        if impacts:
            return f"System impact from options: {', '.join(impacts)}"

        return "Limited system impact"

    def _analyze_timeline_impact(self, decision_options: List[Dict[str, Any]]) -> str:
        """Analyze timeline impact across options"""

        timeline_impacts = []

        for option in decision_options:
            if option.get('implementation_complexity') in ['high', 'critical']:
                timeline_impacts.append(f"Option {option.get('option_id', 'Unknown')}")

        if timeline_impacts:
            return f"Timeline impact from: {', '.join(timeline_impacts)}"

        return "Minimal timeline impact"

    def _calculate_recommendation_confidence(self, recommendation: Dict[str, Any]) -> int:
        """Calculate confidence in recommendation"""

        base_confidence = 75

        # Increase confidence if justification is provided
        if recommendation.get('justification'):
            base_confidence += 10

        # Increase confidence if success metrics are defined
        if recommendation.get('success_metrics'):
            base_confidence += 10

        # Increase confidence if implementation timeline is specified
        if recommendation.get('implementation_timeline'):
            base_confidence += 5

        return min(100, base_confidence)

    def _outline_implementation_steps(self, signal_analysis: Dict[str, Any]) -> List[str]:
        """Outline implementation steps"""

        steps = [
            "Review and analyze decision options",
            "Make final decision based on analysis",
            "Communicate decision to stakeholders",
            "Allocate necessary resources",
            "Implement chosen option",
            "Monitor implementation progress",
            "Report completion and outcomes"
        ]

        return steps

    def _get_contact_information(self) -> str:
        """Get contact information for follow-up"""

        return "PRP System Administrator or Project Lead"

    def _get_escalation_path(self) -> str:
        """Get escalation path"""

        return " escalate to senior management if no response within deadline"

    def _determine_slack_channel(self, executive_summary: Dict[str, Any]) -> str:
        """Determine appropriate Slack channel"""

        urgency = executive_summary.get('urgency_level', 'medium')

        if urgency in ['immediate', 'high']:
            return "#admin-emergency"
        else:
            return "#admin-decisions"

    def _select_notification_template(self, signal_analysis: Dict[str, Any]) -> str:
        """Select appropriate notification template"""

        decision_needed = signal_analysis.get('decision_required', '').lower()

        if 'resource' in decision_needed or 'budget' in decision_needed:
            return "resource_allocation"
        elif 'policy' in decision_needed or 'compliance' in decision_needed:
            return "policy_exception"
        elif 'system' in decision_needed or 'configuration' in decision_needed:
            return "system_configuration"
        else:
            return "general_decision"

    def _calculate_completeness_score(self, notification_content: str) -> int:
        """Calculate notification completeness score"""

        required_sections = [
            "## Executive Summary",
            "## Context Overview",
            "## Decision Options",
            "## Impact Assessment",
            "## Recommendation",
            "## Action Required"
        ]

        present_sections = sum(1 for section in required_sections if section in notification_content)

        base_score = (present_sections / len(required_sections)) * 80

        # Add points for content quality
        if len(notification_content) > 1000:
            base_score += 10
        if "### Option" in notification_content:
            base_score += 10

        return min(100, int(base_score))

    def _calculate_clarity_score(self, notification_content: str) -> int:
        """Calculate notification clarity score"""

        clarity_score = 80  # Base score

        # Deduct points for potential clarity issues
        if notification_content.count('**') < 10:  # Insufficient formatting
            clarity_score -= 10

        if len(notification_content.split('\n')) < 20:  # Too short
            clarity_score -= 10

        if notification_content.count('###') < 2:  # Insufficient structure
            clarity_score -= 10

        return max(0, clarity_score)

    def _calculate_actionability_score(self, action_required: Dict[str, Any]) -> int:
        """Calculate actionability score"""

        score = 0

        if action_required.get('decision_needed'):
            score += 25
        if action_required.get('decision_deadline'):
            score += 25
        if action_required.get('contact_information'):
            score += 25
        if action_required.get('follow_up_required'):
            score += 25

        return score