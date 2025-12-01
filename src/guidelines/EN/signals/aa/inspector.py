"""
Admin Attention Signal Inspector Implementation

Processes [aa] - Admin Attention signals for administrative escalation and decision support.
"""

import asyncio
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from enum import Enum

class UrgencyLevel(Enum):
    IMMEDIATE = "immediate"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ComplexityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AAInspector:
    """Inspector for admin attention signals"""

    def __init__(self):
        self.signal_code = 'aa'
        self.default_priority = 75

    async def process_signal(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """Process admin attention signal and prepare comprehensive analysis"""

        # Extract signal data
        raw_signal = signal.get('data', {}).get('raw_signal', '')
        context = signal.get('data', {}).get('context', '')
        prp_info = signal.get('data', {}).get('prp_info', {})

        # Parse signal components
        decision_needed = self._extract_decision_needed(raw_signal, context)
        options_provided = self._extract_options(raw_signal, context)
        current_situation = self._extract_current_situation(context, prp_info)

        # Classify signal
        priority = self._calculate_priority(raw_signal, context, decision_needed)
        urgency = self._determine_urgency(raw_signal, context)
        complexity = self._assess_complexity(decision_needed, current_situation)

        # Generate decision options
        decision_options = self._generate_decision_options(
            decision_needed,
            current_situation,
            options_provided
        )

        # Analyze each option
        analyzed_options = []
        for option in decision_options:
            analyzed_option = await self._analyze_option(option, current_situation)
            analyzed_options.append(analyzed_option)

        # Determine recommendation
        recommendation = self._generate_recommendation(analyzed_options, urgency, complexity)

        # Prepare comprehensive payload
        payload = {
            'signal_id': signal['id'],
            'signal_type': signal['type'],
            'classification': {
                'priority': priority,
                'urgency': urgency.value,
                'complexity': complexity.value,
                'accuracy': self._calculate_accuracy(raw_signal, context),
                'acceptance': self._calculate_acceptance(analyzed_options, recommendation),
                'confidence': self._calculate_confidence(analyzed_options, complexity)
            },
            'analysis': {
                'decision_required': decision_needed,
                'current_situation': current_situation,
                'context_available': self._assess_context_availability(context, prp_info),
                'stakeholder_impact': self._analyze_stakeholder_impact(decision_needed, analyzed_options),
                'resource_implications': self._analyze_resource_implications(analyzed_options),
                'policy_considerations': self._analyze_policy_considerations(decision_needed, context)
            },
            'decision_options': analyzed_options,
            'recommendation': recommendation,
            'requires_action': True,
            'escalation_threshold': 2,  # Escalate if no response within threshold
            'processing_time': datetime.now().isoformat(),
            'metadata': {
                'signal_source': signal.get('source', 'unknown'),
                'extraction_quality': self._assess_extraction_quality(raw_signal, context),
                'option_count': len(analyzed_options),
                'has_clear_recommendation': bool(recommendation.get('recommended_option'))
            }
        }

        return payload

    def _extract_decision_needed(self, raw_signal: str, context: str) -> str:
        """Extract the specific decision needed from the signal"""

        # Look for decision patterns in signal
        decision_patterns = [
            r'\[aa\]\s*Admin\s*Attention\s*-\s*([^|]+)',
            r'decision\s*needed[:\s]+([^|]+)',
            r'need\s*decision[:\s]+([^|]+)',
            r'admin\s*decision[:\s]+([^|]+)',
            r'approval\s*needed[:\s]+([^|]+)'
        ]

        for pattern in decision_patterns:
            match = re.search(pattern, raw_signal + ' ' + context, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        # Extract from context if not found in signal
        context_patterns = [
            r'decision\s*about\s+([^.!?]+)',
            r'need\s*to\s+decide\s+([^.!?]+)',
            r'admin\s+input\s+on\s+([^.!?]+)'
        ]

        for pattern in context_patterns:
            match = re.search(pattern, context, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return "Administrative decision required - specific decision unclear"

    def _extract_options(self, raw_signal: str, context: str) -> List[str]:
        """Extract provided options from signal and context"""

        options = []

        # Look for option patterns
        option_patterns = [
            r'options?[:\s]+([^|]+)',
            r'choices?[:\s]+([^|]+)',
            r'alternatives?[:\s]+([^|]+)'
        ]

        for pattern in option_patterns:
            match = re.search(pattern, raw_signal + ' ' + context, re.IGNORECASE)
            if match:
                option_text = match.group(1).strip()
                # Split by common separators
                separated_options = re.split(r'[,;]|\s+or\s+', option_text)
                options.extend([opt.strip() for opt in separated_options if opt.strip()])

        return options[:4]  # Limit to 4 options

    def _extract_current_situation(self, context: str, prp_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract current situation from context and PRP info"""

        situation = {
            'description': '',
            'prp_status': prp_info.get('status', 'unknown'),
            'current_progress': prp_info.get('progress', 0),
            'blockers': [],
            'dependencies': [],
            'timeline_pressure': False,
            'resource_constraints': False
        }

        # Extract situation description
        situation_patterns = [
            r'current\s*situation[:\s]+([^.!?]+)',
            r'status[:\s]+([^.!?]+)',
            r'progress[:\s]+([^.!?]+)'
        ]

        for pattern in situation_patterns:
            match = re.search(pattern, context, re.IGNORECASE)
            if match:
                situation['description'] = match.group(1).strip()
                break

        # Check for pressure indicators
        if any(word in context.lower() for word in ['urgent', 'deadline', 'critical', 'blocked']):
            situation['timeline_pressure'] = True

        if any(word in context.lower() for word in ['resource', 'budget', 'capacity', 'limited']):
            situation['resource_constraints'] = True

        return situation

    def _calculate_priority(self, raw_signal: str, context: str, decision_needed: str) -> int:
        """Calculate priority score (1-100)"""

        priority = 50  # Base priority for admin attention

        # Increase priority for urgent indicators
        urgent_words = ['urgent', 'emergency', 'critical', 'immediate', 'blocked']
        if any(word in (raw_signal + ' ' + context).lower() for word in urgent_words):
            priority += 25

        # Increase priority for system-wide impact
        system_impact_words = ['system', 'production', 'all users', 'entire', 'organization']
        if any(word in (raw_signal + ' ' + context).lower() for word in system_impact_words):
            priority += 20

        # Increase priority for security/compliance issues
        security_words = ['security', 'compliance', 'policy', 'legal', 'audit']
        if any(word in (raw_signal + ' ' + context).lower() for word in security_words):
            priority += 15

        # Increase priority for resource allocation
        if any(word in (raw_signal + ' ' + context).lower() for word in ['budget', 'resource', 'cost', 'financial']):
            priority += 10

        return min(100, priority)

    def _determine_urgency(self, raw_signal: str, context: str) -> UrgencyLevel:
        """Determine urgency level"""

        combined_text = (raw_signal + ' ' + context).lower()

        # Check for immediate urgency indicators
        immediate_words = ['immediate', 'emergency', 'asap', 'right now', 'critical']
        if any(word in combined_text for word in immediate_words):
            return UrgencyLevel.IMMEDIATE

        # Check for high urgency indicators
        high_words = ['urgent', 'soon', 'today', 'deadline', 'high priority']
        if any(word in combined_text for word in high_words):
            return UrgencyLevel.HIGH

        # Check for medium urgency indicators
        medium_words = ['this week', 'soon', 'next few days', 'moderate']
        if any(word in combined_text for word in medium_words):
            return UrgencyLevel.MEDIUM

        return UrgencyLevel.LOW

    def _assess_complexity(self, decision_needed: str, current_situation: Dict[str, Any]) -> ComplexityLevel:
        """Assess decision complexity"""

        complexity_score = 30  # Base complexity

        # Increase complexity for multiple stakeholders
        if 'stakeholder' in decision_needed.lower() or 'multiple' in decision_needed.lower():
            complexity_score += 20

        # Increase complexity for system-wide impact
        if current_situation.get('timeline_pressure') or current_situation.get('resource_constraints'):
            complexity_score += 15

        # Increase complexity for policy/compliance considerations
        if any(word in decision_needed.lower() for word in ['policy', 'compliance', 'legal', 'security']):
            complexity_score += 15

        # Increase complexity for resource allocation
        if any(word in decision_needed.lower() for word in ['budget', 'resource', 'allocation', 'investment']):
            complexity_score += 20

        if complexity_score >= 80:
            return ComplexityLevel.CRITICAL
        elif complexity_score >= 60:
            return ComplexityLevel.HIGH
        elif complexity_score >= 40:
            return ComplexityLevel.MEDIUM
        else:
            return ComplexityLevel.LOW

    def _generate_decision_options(self, decision_needed: str, current_situation: Dict[str, Any],
                                  provided_options: List[str]) -> List[Dict[str, Any]]:
        """Generate decision options"""

        options = []

        # Use provided options if available
        if provided_options:
            for i, option_text in enumerate(provided_options):
                options.append({
                    'option_id': chr(65 + i),  # A, B, C, D
                    'description': option_text,
                    'source': 'provided'
                })
        else:
            # Generate default options based on common patterns
            options = self._generate_default_options(decision_needed, current_situation)

        # Ensure we have at least 2 options
        if len(options) < 2:
            options.extend(self._generate_default_options(decision_needed, current_situation))

        return options[:4]  # Limit to 4 options

    def _generate_default_options(self, decision_needed: str, current_situation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate default options when none are provided"""

        options = []

        # Common option patterns based on decision type
        if 'approve' in decision_needed.lower() or 'authorization' in decision_needed.lower():
            options.extend([
                {'option_id': 'A', 'description': 'Approve the request', 'source': 'generated'},
                {'option_id': 'B', 'description': 'Request additional information', 'source': 'generated'},
                {'option_id': 'C', 'description': 'Deny the request', 'source': 'generated'}
            ])
        elif 'resource' in decision_needed.lower() or 'budget' in decision_needed.lower():
            options.extend([
                {'option_id': 'A', 'description': 'Allocate requested resources', 'source': 'generated'},
                {'option_id': 'B', 'description': 'Allocate partial resources', 'source': 'generated'},
                {'option_id': 'C', 'description': 'Postpone resource allocation', 'source': 'generated'},
                {'option_id': 'D', 'description': 'Deny resource request', 'source': 'generated'}
            ])
        elif 'policy' in decision_needed.lower() or 'compliance' in decision_needed.lower():
            options.extend([
                {'option_id': 'A', 'description': 'Grant policy exception', 'source': 'generated'},
                {'option_id': 'B', 'description': 'Request policy modification', 'source': 'generated'},
                {'option_id': 'C', 'description': 'Deny policy exception', 'source': 'generated'}
            ])
        else:
            # Generic options
            options.extend([
                {'option_id': 'A', 'description': 'Proceed with proposed action', 'source': 'generated'},
                {'option_id': 'B', 'description': 'Request additional analysis', 'source': 'generated'},
                {'option_id': 'C', 'description': 'Modify approach', 'source': 'generated'}
            ])

        return options

    async def _analyze_option(self, option: Dict[str, Any], current_situation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a specific decision option"""

        description = option['description']

        # Determine pros and cons based on common patterns
        pros, cons = self._extract_pros_cons(description)

        # Assess resource requirements
        resource_requirements = self._assess_resource_requirements(description)

        # Determine implementation complexity
        impl_complexity = self._assess_implementation_complexity(description)

        # Analyze stakeholder impact
        stakeholder_impact = self._analyze_stakeholder_impact_for_option(description)

        # Assess risk
        risk_assessment = self._assess_option_risk(description, current_situation)

        return {
            'option_id': option['option_id'],
            'description': description,
            'source': option.get('source', 'unknown'),
            'pros': pros,
            'cons': cons,
            'resource_requirements': resource_requirements,
            'implementation_complexity': impl_complexity,
            'stakeholder_impact': stakeholder_impact,
            'risk_assessment': risk_assessment,
            'estimated_outcome': self._estimate_outcome(description, current_situation)
        }

    def _extract_pros_cons(self, description: str) -> Tuple[List[str], List[str]]:
        """Extract pros and cons from option description"""

        pros = []
        cons = []

        description_lower = description.lower()

        # Positive indicators
        positive_words = ['approve', 'enable', 'allow', 'grant', 'increase', 'expand', 'improve']
        for word in positive_words:
            if word in description_lower:
                pros.append(f"Supports {word} action")

        # Negative indicators
        negative_words = ['deny', 'restrict', 'limit', 'reduce', 'postpone', 'delay']
        for word in negative_words:
            if word in description_lower:
                cons.append(f"Implements {word} action")

        # Resource indicators
        if any(word in description_lower for word in ['allocate', 'provide', 'budget', 'resource']):
            pros.append("Addresses resource needs")

        if any(word in description_lower for word in ['cost', 'expense', 'investment']):
            cons.append("Requires financial expenditure")

        return pros, cons

    def _assess_resource_requirements(self, description: str) -> Dict[str, Any]:
        """Assess resource requirements for an option"""

        requirements = {
            'human_resources': 'unknown',
            'technical_resources': 'unknown',
            'financial_resources': 'unknown',
            'time_required': 'unknown'
        }

        description_lower = description.lower()

        # Financial resources
        if any(word in description_lower for word in ['budget', 'cost', 'financial', 'investment']):
            if 'high' in description_lower or 'significant' in description_lower:
                requirements['financial_resources'] = 'high'
            elif 'low' in description_lower or 'minimal' in description_lower:
                requirements['financial_resources'] = 'low'
            else:
                requirements['financial_resources'] = 'medium'

        # Time resources
        if any(word in description_lower for word in ['immediate', 'quick', 'fast']):
            requirements['time_required'] = 'minimal'
        elif any(word in description_lower for word in ['postpone', 'delay', 'extend']):
            requirements['time_required'] = 'extended'
        else:
            requirements['time_required'] = 'standard'

        # Human resources
        if any(word in description_lower for word in ['team', 'staff', 'personnel']):
            requirements['human_resources'] = 'required'

        # Technical resources
        if any(word in description_lower for word in ['system', 'infrastructure', 'technology']):
            requirements['technical_resources'] = 'required'

        return requirements

    def _assess_implementation_complexity(self, description: str) -> str:
        """Assess implementation complexity"""

        description_lower = description.lower()

        # High complexity indicators
        if any(word in description_lower for word in ['complex', 'comprehensive', 'extensive', 'system-wide']):
            return 'high'

        # Low complexity indicators
        if any(word in description_lower for word in ['simple', 'minimal', 'straightforward', 'easy']):
            return 'low'

        # Medium complexity indicators
        if any(word in description_lower for word in ['moderate', 'standard', 'normal']):
            return 'medium'

        return 'medium'  # Default

    def _analyze_stakeholder_impact_for_option(self, description: str) -> Dict[str, Any]:
        """Analyze stakeholder impact for a specific option"""

        impact = {
            'affected_groups': [],
            'impact_level': 'moderate',
            'impact_description': 'Stakeholder impact assessment not available'
        }

        description_lower = description.lower()

        # Identify affected groups
        stakeholder_groups = {
            'users': ['user', 'customer', 'client'],
            'team': ['team', 'staff', 'employee'],
            'management': ['management', 'leadership', 'executive'],
            'system': ['system', 'infrastructure', 'platform']
        }

        for group, keywords in stakeholder_groups.items():
            if any(keyword in description_lower for keyword in keywords):
                impact['affected_groups'].append(group)

        # Determine impact level
        if any(word in description_lower for word in ['significant', 'major', 'critical', 'extensive']):
            impact['impact_level'] = 'significant'
        elif any(word in description_lower for word in ['minimal', 'minor', 'limited']):
            impact['impact_level'] = 'minimal'

        return impact

    def _assess_option_risk(self, description: str, current_situation: Dict[str, Any]) -> Dict[str, Any]:
        """Assess risk for a specific option"""

        risk = {
            'risk_level': RiskLevel.MEDIUM.value,
            'probability': 50,
            'impact': 'Moderate risk level',
            'mitigation_strategies': []
        }

        description_lower = description.lower()

        # High risk indicators
        if any(word in description_lower for word in ['critical', 'dangerous', 'unstable', 'experimental']):
            risk['risk_level'] = RiskLevel.HIGH.value
            risk['probability'] = 70
            risk['impact'] = 'High risk with significant potential negative impact'

        # Low risk indicators
        elif any(word in description_lower for word in ['safe', 'stable', 'proven', 'tested']):
            risk['risk_level'] = RiskLevel.LOW.value
            risk['probability'] = 20
            risk['impact'] = 'Low risk with minimal potential negative impact'

        # Add mitigation strategies
        if risk['risk_level'] in [RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]:
            risk['mitigation_strategies'] = [
                'Implement additional monitoring',
                'Prepare rollback procedures',
                'Conduct thorough testing'
            ]

        return risk

    def _estimate_outcome(self, description: str, current_situation: Dict[str, Any]) -> str:
        """Estimate the outcome of implementing an option"""

        description_lower = description.lower()

        if 'approve' in description_lower or 'enable' in description_lower:
            return "Proceed with requested action or resource allocation"
        elif 'deny' in description_lower or 'reject' in description_lower:
            return "Maintain current status quo, request not approved"
        elif 'postpone' in description_lower or 'delay' in description_lower:
            return "Decision deferred to later date"
        elif 'modify' in description_lower or 'change' in description_lower:
            return "Implement modified approach or solution"
        else:
            return "Outcome depends on implementation details"

    def _analyze_stakeholder_impact(self, decision_needed: str, analyzed_options: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze overall stakeholder impact"""

        all_affected_groups = set()
        max_impact_level = 'minimal'

        for option in analyzed_options:
            stakeholder_impact = option.get('stakeholder_impact', {})
            groups = stakeholder_impact.get('affected_groups', [])
            all_affected_groups.update(groups)

            impact_level = stakeholder_impact.get('impact_level', 'minimal')
            if impact_level == 'significant':
                max_impact_level = 'significant'
            elif impact_level == 'moderate' and max_impact_level != 'significant':
                max_impact_level = 'moderate'

        return {
            'affected_groups': list(all_affected_groups),
            'max_impact_level': max_impact_level,
            'total_options': len(analyzed_options)
        }

    def _analyze_resource_implications(self, analyzed_options: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze resource implications across all options"""

        resource_needs = {
            'requires_financial_resources': False,
            'requires_human_resources': False,
            'requires_technical_resources': False,
            'max_time_required': 'standard'
        }

        for option in analyzed_options:
            resource_req = option.get('resource_requirements', {})

            if resource_req.get('financial_resources') not in ['unknown', 'none']:
                resource_needs['requires_financial_resources'] = True

            if resource_req.get('human_resources') == 'required':
                resource_needs['requires_human_resources'] = True

            if resource_req.get('technical_resources') == 'required':
                resource_needs['requires_technical_resources'] = True

        return resource_needs

    def _analyze_policy_considerations(self, decision_needed: str, context: str) -> List[str]:
        """Analyze policy and compliance considerations"""

        considerations = []

        combined_text = (decision_needed + ' ' + context).lower()

        if 'policy' in combined_text:
            considerations.append('Policy compliance and exception procedures')

        if 'security' in combined_text:
            considerations.append('Security policy and risk assessment')

        if 'compliance' in combined_text:
            considerations.append('Regulatory compliance requirements')

        if 'legal' in combined_text:
            considerations.append('Legal implications and requirements')

        if 'budget' in combined_text or 'financial' in combined_text:
            considerations.append('Financial policies and budget constraints')

        return considerations or ['Standard organizational policies apply']

    def _generate_recommendation(self, analyzed_options: List[Dict[str, Any]],
                                urgency: UrgencyLevel, complexity: ComplexityLevel) -> Dict[str, Any]:
        """Generate recommendation based on option analysis"""

        if not analyzed_options:
            return {
                'recommended_option': None,
                'justification': 'Insufficient options for recommendation',
                'expected_outcomes': [],
                'success_metrics': [],
                'implementation_timeline': 'unknown'
            }

        # Simple recommendation logic - can be enhanced
        # For now, recommend the option with lowest risk
        best_option = min(analyzed_options, key=lambda x: self._get_risk_score(x.get('risk_assessment', {})))

        return {
            'recommended_option': best_option['option_id'],
            'justification': f"Recommended based on risk assessment and complexity analysis",
            'expected_outcomes': [best_option.get('estimated_outcome', 'Outcome to be determined')],
            'success_metrics': ['Successful implementation of recommended option'],
            'implementation_timeline': self._estimate_timeline(best_option, urgency)
        }

    def _get_risk_score(self, risk_assessment: Dict[str, Any]) -> int:
        """Get numerical risk score for comparison"""

        risk_level = risk_assessment.get('risk_level', 'medium')
        probability = risk_assessment.get('probability', 50)

        risk_scores = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        }

        return risk_scores.get(risk_level, 2) * (probability / 100)

    def _estimate_timeline(self, option: Dict[str, Any], urgency: UrgencyLevel) -> str:
        """Estimate implementation timeline"""

        complexity = option.get('implementation_complexity', 'medium')

        if urgency == UrgencyLevel.IMMEDIATE:
            return 'Within 1 hour'
        elif urgency == UrgencyLevel.HIGH:
            return 'Within 4 hours'
        elif complexity == 'high':
            return '1-2 days'
        else:
            return 'Within 24 hours'

    def _calculate_accuracy(self, raw_signal: str, context: str) -> int:
        """Calculate accuracy score (0-100)"""

        accuracy = 80  # Base accuracy for structured analysis

        # Increase accuracy for clear signals
        if '[aa]' in raw_signal:
            accuracy += 10

        # Increase accuracy for detailed context
        if len(context) > 200:
            accuracy += 5

        # Increase accuracy for decision clarity
        if 'decision' in raw_signal.lower() or 'decision' in context.lower():
            accuracy += 5

        return min(100, accuracy)

    def _calculate_acceptance(self, analyzed_options: List[Dict[str, Any]],
                             recommendation: Dict[str, Any]) -> int:
        """Calculate acceptance score (0-100)"""

        acceptance = 70  # Base acceptance

        # Increase for multiple options
        if len(analyzed_options) >= 3:
            acceptance += 15

        # Increase for clear recommendation
        if recommendation.get('recommended_option'):
            acceptance += 10

        # Increase for risk analysis
        if any(option.get('risk_assessment') for option in analyzed_options):
            acceptance += 5

        return min(100, acceptance)

    def _calculate_confidence(self, analyzed_options: List[Dict[str, Any]],
                             complexity: ComplexityLevel) -> int:
        """Calculate confidence score (0-100)"""

        confidence = 75  # Base confidence

        # Adjust based on complexity
        complexity_factors = {
            ComplexityLevel.LOW: 15,
            ComplexityLevel.MEDIUM: 0,
            ComplexityLevel.HIGH: -10,
            ComplexityLevel.CRITICAL: -20
        }

        confidence += complexity_factors.get(complexity, 0)

        # Increase with option quality
        if len(analyzed_options) >= 2:
            confidence += 10

        return max(30, min(100, confidence))

    def _assess_context_availability(self, context: str, prp_info: Dict[str, Any]) -> str:
        """Assess availability of context information"""

        if len(context) > 500 and prp_info:
            return 'comprehensive'
        elif len(context) > 100 or prp_info:
            return 'adequate'
        else:
            return 'limited'

    def _assess_extraction_quality(self, raw_signal: str, context: str) -> str:
        """Assess quality of information extraction"""

        quality = 'medium'

        if '[aa]' in raw_signal and len(context) > 200:
            quality = 'high'
        elif len(context) < 50:
            quality = 'low'

        return quality