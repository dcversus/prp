"""
Admin Preview Ready Signal Inspector Implementation

Processes [ap] - Admin Preview Ready signals for comprehensive package validation.
"""

import asyncio
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from enum import Enum

class ReadinessLevel(Enum):
    READY = "ready"
    NEEDS_IMPROVEMENT = "needs_improvement"
    NOT_READY = "not_ready"

class QualityLevel(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ADEQUATE = "adequate"
    POOR = "poor")

class APInspector:
    """Inspector for admin preview ready signals"""

    def __init__(self):
        self.signal_code = 'ap'
        self.default_completeness_score = 75

    async def process_signal(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """Process admin preview ready signal and validate package"""

        # Extract signal data
        raw_signal = signal.get('data', {}).get('raw_signal', '')
        context = signal.get('data', {}).get('context', '')
        prp_info = signal.get('data', {}).get('prp_info', {})
        preview_data = signal.get('data', {}).get('preview_data', {})

        # Parse signal components
        preview_type = self._extract_preview_type(raw_signal, context)
        how_to_guide = self._extract_how_to_guide(raw_signal, context)
        admin_instructions = self._extract_admin_instructions(raw_signal, context)

        # Analyze package completeness
        package_analysis = await self._analyze_package_completeness(preview_data, preview_type)

        # Validate content quality
        content_quality = await self._validate_content_quality(preview_data, preview_type)

        # Assess visual elements
        visual_elements = await self._assess_visual_elements(preview_data)

        # Review documentation quality
        documentation_quality = await self._review_documentation_quality(how_to_guide, admin_instructions)

        # Analyze stakeholder impact
        stakeholder_impact = await self._analyze_stakeholder_impact(preview_data, preview_type)

        # Calculate overall scores
        completeness_score = self._calculate_completeness_score(package_analysis)
        quality_score = self._calculate_quality_score(content_quality)
        actionability_score = self._calculate_actionability_score(documentation_quality, preview_data)
        stakeholder_relevance_score = self._calculate_stakeholder_relevance_score(stakeholder_impact)

        # Determine overall readiness
        overall_readiness = self._determine_overall_readiness(
            completeness_score, quality_score, actionability_score, stakeholder_relevance_score
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            package_analysis, content_quality, visual_elements, documentation_quality
        )

        # Prepare comprehensive payload
        payload = {
            'signal_id': signal['id'],
            'signal_type': signal['type'],
            'validation': {
                'preview_id': f"preview_{signal['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'completeness_score': completeness_score,
                'quality_score': quality_score,
                'actionability_score': actionability_score,
                'stakeholder_relevance_score': stakeholder_relevance_score,
                'overall_readiness': overall_readiness.value,
                'accuracy': self._calculate_accuracy(raw_signal, context, preview_data),
                'acceptance': self._calculate_acceptance(completeness_score, quality_score),
                'confidence': self._calculate_confidence(completeness_score, quality_score)
            },
            'package_analysis': package_analysis,
            'content_quality': content_quality,
            'visual_elements': visual_elements,
            'documentation_quality': documentation_quality,
            'stakeholder_impact': stakeholder_impact,
            'recommendations': recommendations,
            'preview_metadata': {
                'preview_type': preview_type,
                'how_to_guide_available': bool(how_to_guide),
                'admin_instructions_available': bool(admin_instructions),
                'estimated_admin_review_time': self._estimate_admin_review_time(preview_data),
                'decision_complexity': self._assess_decision_complexity(preview_data)
            },
            'requires_action': overall_readiness != ReadinessLevel.READY,
            'escalation_threshold': 3,  # Escalate if not ready after improvements
            'processing_time': datetime.now().isoformat(),
            'metadata': {
                'signal_source': signal.get('source', 'unknown'),
                'preview_components_count': len(package_analysis.get('components_present', [])),
                'missing_components_count': len(package_analysis.get('components_missing', [])),
                'quality_issues_count': len(content_quality.get('quality_issues', [])),
                'visual_improvements_needed': len(visual_elements.get('visual_improvements', []))
            }
        }

        return payload

    def _extract_preview_type(self, raw_signal: str, context: str) -> str:
        """Extract the type of preview from signal and context"""

        combined_text = (raw_signal + ' ' + context).lower()

        # Common preview types
        preview_types = {
            'implementation': ['implementation', 'feature', 'development', 'code'],
            'analysis': ['analysis', 'report', 'research', 'study'],
            'design': ['design', 'mockup', 'prototype', 'ui', 'ux'],
            'quality': ['quality', 'testing', 'qa', 'validation'],
            'deployment': ['deployment', 'release', 'production', 'launch'],
            'security': ['security', 'audit', 'vulnerability', 'compliance']
        }

        for preview_type, keywords in preview_types.items():
            if any(keyword in combined_text for keyword in keywords):
                return preview_type

        return 'general'

    def _extract_how_to_guide(self, raw_signal: str, context: str) -> str:
        """Extract how-to guide information"""

        guide_patterns = [
            r'guide[:\s]+([^|]+)',
            r'how[-\s]?to[:\s]+([^|]+)',
            r'instructions[:\s]+([^|]+)',
            r'steps[:\s]+([^|]+)'
        ]

        for pattern in guide_patterns:
            match = re.search(pattern, raw_signal + ' ' + context, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return ""

    def _extract_admin_instructions(self, raw_signal: str, context: str) -> str:
        """Extract admin-specific instructions"""

        instruction_patterns = [
            r'admin\s+instructions?[:\s]+([^|]+)',
            r'for\s+admin[:\s]+([^|]+)',
            r'admin\s+to[:\s]+([^|]+)',
            r'admin\s+should[:\s]+([^|]+)'
        ]

        for pattern in instruction_patterns:
            match = re.search(pattern, raw_signal + ' ' + context, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return ""

    async def _analyze_package_completeness(self, preview_data: Dict[str, Any], preview_type: str) -> Dict[str, Any]:
        """Analyze package completeness based on preview type"""

        # Define required components for each preview type
        required_components = self._get_required_components(preview_type)

        components_present = []
        components_missing = []

        # Check for executive summary
        if preview_data.get('executive_summary'):
            components_present.append('executive_summary')
        else:
            components_missing.append('executive_summary')

        # Check for detailed content
        if preview_data.get('detailed_content'):
            components_present.append('detailed_content')
        else:
            components_missing.append('detailed_content')

        # Check for visual elements
        if preview_data.get('visual_elements'):
            components_present.append('visual_elements')
        else:
            components_missing.append('visual_elements')

        # Check for success metrics
        if preview_data.get('success_metrics'):
            components_present.append('success_metrics')
        else:
            components_missing.append('success_metrics')

        # Check for recommendations
        if preview_data.get('recommendations'):
            components_present.append('recommendations')
        else:
            components_missing.append('recommendations')

        # Check type-specific components
        for component in required_components:
            if preview_data.get(component):
                if component not in components_present:
                    components_present.append(component)
            else:
                if component not in components_missing:
                    components_missing.append(component)

        # Assess structure quality
        structure_quality = self._assess_structure_quality(components_present, components_missing)
        organization_score = self._calculate_organization_score(components_present, preview_data)
        format_consistency = self._assess_format_consistency(preview_data)

        return {
            'components_present': components_present,
            'components_missing': components_missing,
            'structure_quality': structure_quality.value,
            'organization_score': organization_score,
            'format_consistency': format_consistency,
            'total_required': len(required_components),
            'completion_percentage': (len(components_present) / len(required_components)) * 100 if required_components else 0
        }

    def _get_required_components(self, preview_type: str) -> List[str]:
        """Get required components for preview type"""

        common_components = ['executive_summary', 'detailed_content', 'success_metrics']

        type_specific = {
            'implementation': [
                'feature_demonstration', 'performance_metrics', 'quality_assurance',
                'deployment_procedures', 'rollback_procedures'
            ],
            'analysis': [
                'methodology', 'data_sources', 'findings', 'visualizations',
                'recommendations'
            ],
            'design': [
                'design_mockups', 'user_experience_flows', 'design_system',
                'accessibility_compliance', 'technical_specifications'
            ],
            'quality': [
                'test_coverage', 'quality_metrics', 'defect_analysis',
                'performance_results', 'security_assessment'
            ],
            'deployment': [
                'deployment_plan', 'infrastructure_requirements', 'rollback_strategy',
                'monitoring_setup', 'success_criteria'
            ]
        }

        return common_components + type_specific.get(preview_type, [])

    def _assess_structure_quality(self, present: List[str], missing: List[str]) -> QualityLevel:
        """Assess overall structure quality"""

        if not missing:
            return QualityLevel.EXCELLENT
        elif len(missing) <= 1:
            return QualityLevel.GOOD
        elif len(missing) <= 3:
            return QualityLevel.ADEQUATE
        else:
            return QualityLevel.POOR

    def _calculate_organization_score(self, components: List[str], preview_data: Dict[str, Any]) -> int:
        """Calculate organization score (1-100)"""

        base_score = 60

        # Add points for logical organization
        if 'executive_summary' in components:
            base_score += 15
        if 'detailed_content' in components:
            base_score += 15
        if preview_data.get('logical_flow'):
            base_score += 10

        return min(100, base_score)

    def _assess_format_consistency(self, preview_data: Dict[str, Any]) -> str:
        """Assess format consistency"""

        # Check for consistent formatting indicators
        has_consistent_formatting = (
            preview_data.get('format_template') and
            preview_data.get('style_guide') and
            preview_data.get('brand_consistency')
        )

        if has_consistent_formatting:
            return 'consistent'
        elif preview_data.get('format_template'):
            return 'inconsistent'
        else:
            return 'poor'

    async def _validate_content_quality(self, preview_data: Dict[str, Any], preview_type: str) -> Dict[str, Any]:
        """Validate content quality"""

        accuracy_score = self._assess_content_accuracy(preview_data)
        completeness_score = self._assess_content_completeness(preview_data, preview_type)
        clarity_score = self._assess_content_clarity(preview_data)
        relevance_score = self._assess_content_relevance(preview_data, preview_type)
        consistency_score = self._assess_content_consistency(preview_data)

        # Identify quality issues
        quality_issues = self._identify_quality_issues(
            accuracy_score, completeness_score, clarity_score, relevance_score, consistency_score
        )

        return {
            'accuracy_score': accuracy_score,
            'completeness_score': completeness_score,
            'clarity_score': clarity_score,
            'relevance_score': relevance_score,
            'consistency_score': consistency_score,
            'quality_issues': quality_issues,
            'overall_quality_score': (accuracy_score + completeness_score + clarity_score + relevance_score + consistency_score) / 5
        }

    def _assess_content_accuracy(self, preview_data: Dict[str, Any]) -> int:
        """Assess content accuracy"""

        accuracy_score = 70  # Base score

        # Check for data sources and validation
        if preview_data.get('data_sources'):
            accuracy_score += 15
        if preview_data.get('data_validation'):
            accuracy_score += 10
        if preview_data.get('cross_validation'):
            accuracy_score += 5

        return min(100, accuracy_score)

    def _assess_content_completeness(self, preview_data: Dict[str, Any], preview_type: str) -> int:
        """Assess content completeness"""

        completeness_score = 60  # Base score

        content_sections = [
            'background', 'methodology', 'findings', 'analysis',
            'recommendations', 'impact_assessment', 'next_steps'
        ]

        present_sections = sum(1 for section in content_sections if preview_data.get(section))
        completeness_score += (present_sections / len(content_sections)) * 30

        # Type-specific completeness
        type_specific_content = self._get_type_specific_content(preview_type)
        present_type_specific = sum(1 for content in type_specific_content if preview_data.get(content))
        completeness_score += (present_type_specific / len(type_specific_content)) * 10

        return min(100, int(completeness_score))

    def _get_type_specific_content(self, preview_type: str) -> List[str]:
        """Get type-specific content requirements"""

        type_content = {
            'implementation': ['features', 'technical_details', 'integration_points'],
            'analysis': ['hypothesis', 'data_analysis', 'insights'],
            'design': ['user_research', 'design_rationale', 'accessibility'],
            'quality': ['test_results', 'defect_analysis', 'coverage'],
            'deployment': ['infrastructure', 'monitoring', 'rollback']
        }

        return type_content.get(preview_type, [])

    def _assess_content_clarity(self, preview_data: Dict[str, Any]) -> int:
        """Assess content clarity"""

        clarity_score = 65  # Base score

        # Check for clarity indicators
        if preview_data.get('clear_objectives'):
            clarity_score += 10
        if preview_data.get('simple_language'):
            clarity_score += 10
        if preview_data.get('logical_structure'):
            clarity_score += 10
        if preview_data.get('examples'):
            clarity_score += 5

        return min(100, clarity_score)

    def _assess_content_relevance(self, preview_data: Dict[str, Any], preview_type: str) -> int:
        """Assess content relevance to admin needs"""

        relevance_score = 70  # Base score

        # Check for relevance indicators
        if preview_data.get('stakeholder_needs'):
            relevance_score += 10
        if preview_data.get('business_impact'):
            relevance_score += 10
        if preview_data.get('decision_support'):
            relevance_score += 10

        return min(100, relevance_score)

    def _assess_content_consistency(self, preview_data: Dict[str, Any]) -> int:
        """Assess content consistency"""

        consistency_score = 75  # Base score

        # Check for consistency indicators
        if preview_data.get('consistent_messaging'):
            consistency_score += 10
        if preview_data.get('data_consistency'):
            consistency_score += 10
        if preview_data.get('format_consistency'):
            consistency_score += 5

        return min(100, consistency_score)

    def _identify_quality_issues(self, *scores: int) -> List[str]:
        """Identify quality issues based on scores"""

        issues = []

        for score in scores:
            if score < 60:
                issues.append("Content quality below acceptable threshold")
            elif score < 75:
                issues.append("Content quality needs improvement")

        return list(set(issues))

    async def _assess_visual_elements(self, preview_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess visual elements quality"""

        visual_quality_score = self._assess_visual_quality(preview_data)
        information_density = self._assess_information_density(preview_data)
        design_effectiveness = self._assess_design_effectiveness(preview_data)
        data_visualization_quality = self._assess_data_visualization_quality(preview_data)
        accessibility_score = self._assess_visual_accessibility(preview_data)

        visual_improvements = self._identify_visual_improvements(
            visual_quality_score, information_density, design_effectiveness
        )

        return {
            'visual_quality_score': visual_quality_score,
            'information_density': information_density,
            'design_effectiveness': design_effectiveness.value,
            'data_visualization_quality': data_visualization_quality,
            'accessibility_score': accessibility_score,
            'visual_improvements': visual_improvements
        }

    def _assess_visual_quality(self, preview_data: Dict[str, Any]) -> int:
        """Assess visual quality"""

        visual_quality = 70  # Base score

        if preview_data.get('professional_design'):
            visual_quality += 15
        if preview_data.get('high_resolution'):
            visual_quality += 10
        if preview_data.get('clear_typography'):
            visual_quality += 5

        return min(100, visual_quality)

    def _assess_information_density(self, preview_data: Dict[str, Any]) -> str:
        """Assess information density"""

        # This would analyze the balance of information vs white space
        if preview_data.get('optimal_density'):
            return 'optimal'
        elif preview_data.get('too_much_info'):
            return 'too_high'
        elif preview_data.get('too_little_info'):
            return 'too_low'
        else:
            return 'optimal'

    def _assess_design_effectiveness(self, preview_data: Dict[str, Any]) -> QualityLevel:
        """Assess design effectiveness"""

        effectiveness_indicators = [
            preview_data.get('clear_hierarchy'),
            preview_data.get('intuitive_layout'),
            preview_data.get('effective_use_of_color'),
            preview_data.get('readable_fonts')
        ]

        effectiveness_score = sum(1 for indicator in effectiveness_indicators if indicator)

        if effectiveness_score >= 4:
            return QualityLevel.EXCELLENT
        elif effectiveness_score >= 3:
            return QualityLevel.GOOD
        elif effectiveness_score >= 2:
            return QualityLevel.ADEQUATE
        else:
            return QualityLevel.POOR

    def _assess_data_visualization_quality(self, preview_data: Dict[str, Any]) -> int:
        """Assess data visualization quality"""

        viz_score = 70  # Base score

        if preview_data.get('clear_charts'):
            viz_score += 15
        if preview_data.get('accurate_data'):
            viz_score += 10
        if preview_data.get('appropriate_chart_types'):
            viz_score += 5

        return min(100, viz_score)

    def _assess_visual_accessibility(self, preview_data: Dict[str, Any]) -> int:
        """Assess visual accessibility"""

        accessibility_score = 75  # Base score

        if preview_data.get('color_contrast'):
            accessibility_score += 10
        if preview_data.get('alt_text'):
            accessibility_score += 10
        if preview_data.get('screen_reader_compatible'):
            accessibility_score += 5

        return min(100, accessibility_score)

    def _identify_visual_improvements(self, *scores_and_assessments) -> List[str]:
        """Identify needed visual improvements"""

        improvements = []

        # Analyze scores and identify areas for improvement
        for item in scores_and_assessments:
            if isinstance(item, int) and item < 75:
                improvements.append("Improve visual quality and clarity")
            elif isinstance(item, QualityLevel) and item in [QualityLevel.ADEQUATE, QualityLevel.POOR]:
                improvements.append("Enhance design effectiveness")

        if not improvements:
            improvements.append("Minor visual enhancements recommended")

        return list(set(improvements))

    async def _review_documentation_quality(self, how_to_guide: str, admin_instructions: str) -> Dict[str, Any]:
        """Review documentation quality"""

        instruction_clarity = self._assess_instruction_clarity(how_to_guide, admin_instructions)
        instruction_completeness = self._assess_instruction_completeness(how_to_guide, admin_instructions)
        actionability_score = self._assess_actionability_score(how_to_guide, admin_instructions)
        technical_accuracy = self._assess_technical_accuracy(how_to_guide, admin_instructions)
        user_experience_score = self._assess_documentation_user_experience(how_to_guide, admin_instructions)

        documentation_gaps = self._identify_documentation_gaps(how_to_guide, admin_instructions)

        return {
            'instruction_clarity': instruction_clarity,
            'instruction_completeness': instruction_completeness,
            'actionability_score': actionability_score,
            'technical_accuracy': technical_accuracy,
            'user_experience_score': user_experience_score,
            'documentation_gaps': documentation_gaps
        }

    def _assess_instruction_clarity(self, how_to_guide: str, admin_instructions: str) -> int:
        """Assess instruction clarity"""

        clarity_score = 60  # Base score

        combined_text = (how_to_guide + ' ' + admin_instructions).lower()

        # Check for clarity indicators
        clarity_words = ['step', 'first', 'next', 'then', 'finally', 'click', 'navigate', 'select']
        clarity_count = sum(1 for word in clarity_words if word in combined_text)

        clarity_score += min(20, clarity_count * 4)

        # Check for numbered or bulleted lists
        if re.search(r'\d+\.', combined_text) or re.search(r'[-*•]', combined_text):
            clarity_score += 10

        # Check for action verbs
        action_verbs = ['please', 'you should', 'we recommend', 'consider', 'review']
        action_count = sum(1 for verb in action_verbs if verb in combined_text)
        clarity_score += min(10, action_count * 2)

        return min(100, clarity_score)

    def _assess_instruction_completeness(self, how_to_guide: str, admin_instructions: str) -> int:
        """Assess instruction completeness"""

        completeness_score = 70  # Base score

        combined_text = (how_to_guide + ' ' + admin_instructions)

        # Check for completeness indicators
        required_elements = [
            'access', 'review', 'decision', 'feedback', 'contact', 'timeline'
        ]

        present_elements = sum(1 for element in required_elements if element.lower() in combined_text.lower())
        completeness_score += (present_elements / len(required_elements)) * 20

        # Check length - very short instructions are likely incomplete
        if len(combined_text) > 500:
            completeness_score += 10
        elif len(combined_text) < 100:
            completeness_score -= 20

        return min(100, max(0, completeness_score))

    def _assess_actionability_score(self, how_to_guide: str, admin_instructions: str) -> int:
        """Assess instruction actionability"""

        actionability_score = 65  # Base score

        combined_text = (how_to_guide + ' ' + admin_instructions).lower()

        # Check for actionable elements
        actionable_words = [
            'click', 'select', 'choose', 'decide', 'approve', 'reject',
            'review', 'provide', 'send', 'complete', 'submit'
        ]

        actionable_count = sum(1 for word in actionable_words if word in combined_text)
        actionability_score += min(25, actionable_count * 5)

        # Check for specific next steps
        if 'next step' in combined_text or 'following' in combined_text:
            actionability_score += 10

        return min(100, actionability_score)

    def _assess_technical_accuracy(self, how_to_guide: str, admin_instructions: str) -> int:
        """Assess technical accuracy"""

        # This is a simplified assessment
        accuracy_score = 85  # Assume good technical accuracy unless issues detected

        combined_text = (how_to_guide + ' ' + admin_instructions).lower()

        # Look for potential accuracy issues
        error_indicators = ['error', 'issue', 'problem', 'incorrect', 'fix']
        error_count = sum(1 for indicator in error_indicators if indicator in combined_text)

        if error_count > 0:
            accuracy_score -= error_count * 10

        return max(0, accuracy_score)

    def _assess_documentation_user_experience(self, how_to_guide: str, admin_instructions: str) -> int:
        """Assess documentation user experience"""

        ux_score = 70  # Base score

        combined_text = (how_to_guide + ' ' + admin_instructions)

        # Check for UX-friendly elements
        ux_indicators = [
            'easy', 'simple', 'clear', 'quick', 'straightforward',
            'follow', 'guide', 'help', 'support'
        ]

        ux_count = sum(1 for indicator in ux_indicators if indicator.lower() in combined_text.lower())
        ux_score += min(20, ux_count * 4)

        # Check for negative UX indicators
        negative_ux = ['difficult', 'confusing', 'complex', 'unclear']
        negative_count = sum(1 for indicator in negative_ux if indicator.lower() in combined_text.lower())

        if negative_count > 0:
            ux_score -= negative_count * 10

        return max(0, min(100, ux_score))

    def _identify_documentation_gaps(self, how_to_guide: str, admin_instructions: str) -> List[str]:
        """Identify documentation gaps"""

        gaps = []

        combined_text = (how_to_guide + ' ' + admin_instructions).lower()

        if 'access' not in combined_text:
            gaps.append("Missing access instructions")
        if 'review' not in combined_text:
            gaps.append("Missing review guidelines")
        if 'decision' not in combined_text:
            gaps.append("Missing decision instructions")
        if 'feedback' not in combined_text:
            gaps.append("Missing feedback mechanism")
        if 'contact' not in combined_text:
            gaps.append("Missing contact information")
        if len(combined_text) < 200:
            gaps.append("Insufficient detail in instructions")

        return gaps

    async def _analyze_stakeholder_impact(self, preview_data: Dict[str, Any], preview_type: str) -> Dict[str, Any]:
        """Analyze stakeholder impact"""

        impact_demonstration = self._assess_impact_demonstration(preview_data)
        benefit_communication = self._assess_benefit_communication(preview_data)
        risk_presentation = self._assess_risk_presentation(preview_data)
        resource_clarity = self._assess_resource_clarity(preview_data)
        strategic_alignment = self._assess_strategic_alignment(preview_data, preview_type)

        stakeholder_concerns = self._identify_stakeholder_concerns(preview_data)

        return {
            'impact_demonstration': impact_demonstration,
            'benefit_communication': benefit_communication,
            'risk_presentation': risk_presentation,
            'resource_clarity': resource_clarity,
            'strategic_alignment': strategic_alignment,
            'stakeholder_concerns': stakeholder_concerns
        }

    def _assess_impact_demonstration(self, preview_data: Dict[str, Any]) -> int:
        """Assess impact demonstration quality"""

        impact_score = 65  # Base score

        impact_indicators = preview_data.get('impact_metrics', [])

        if preview_data.get('quantified_impact'):
            impact_score += 15
        if preview_data.get('before_after'):
            impact_score += 10
        if len(impact_indicators) >= 3:
            impact_score += 10

        return min(100, impact_score)

    def _assess_benefit_communication(self, preview_data: Dict[str, Any]) -> int:
        """Assess benefit communication quality"""

        benefit_score = 70  # Base score

        if preview_data.get('clear_benefits'):
            benefit_score += 15
        if preview_data.get('stakeholder_value'):
            benefit_score += 10
        if preview_data.get('business_case'):
            benefit_score += 5

        return min(100, benefit_score)

    def _assess_risk_presentation(self, preview_data: Dict[str, Any]) -> int:
        """Assess risk presentation quality"""

        risk_score = 75  # Base score

        if preview_data.get('risk_assessment'):
            risk_score += 10
        if preview_data.get('mitigation_strategies'):
            risk_score += 10
        if preview_data.get('probability_impact'):
            risk_score += 5

        return min(100, risk_score)

    def _assess_resource_clarity(self, preview_data: Dict[str, Any]) -> int:
        """Assess resource clarity"""

        resource_score = 70  # Base score

        if preview_data.get('resource_requirements'):
            resource_score += 15
        if preview_data.get('budget_impact'):
            resource_score += 10
        if preview_data.get('timeline_impact'):
            resource_score += 5

        return min(100, resource_score)

    def _assess_strategic_alignment(self, preview_data: Dict[str, Any], preview_type: str) -> int:
        """Assess strategic alignment"""

        alignment_score = 75  # Base score

        if preview_data.get('strategic_goals'):
            alignment_score += 15
        if preview_data.get('organizational_benefits'):
            alignment_score += 10

        return min(100, alignment_score)

    def _identify_stakeholder_concerns(self, preview_data: Dict[str, Any]) -> List[str]:
        """Identify potential stakeholder concerns"""

        concerns = []

        if not preview_data.get('impact_demonstrated'):
            concerns.append("Impact not clearly demonstrated")
        if not preview_data.get('benefits_communicated'):
            concerns.append("Benefits not clearly communicated")
        if not preview_data.get('risks_addressed'):
            concerns.append("Risks not adequately addressed")
        if not preview_data.get('resource_impact'):
            concerns.append("Resource impact unclear")

        return concerns

    def _calculate_completeness_score(self, package_analysis: Dict[str, Any]) -> int:
        """Calculate overall completeness score"""

        return package_analysis.get('completion_percentage', 0)

    def _calculate_quality_score(self, content_quality: Dict[str, Any]) -> int:
        """Calculate overall quality score"""

        return int(content_quality.get('overall_quality_score', 0))

    def _calculate_actionability_score(self, documentation_quality: Dict[str, Any], preview_data: Dict[str, Any]) -> int:
        """Calculate overall actionability score"""

        doc_score = documentation_quality.get('actionability_score', 0)
        preview_actionability = 50  # Base score for preview actionability

        if preview_data.get('clear_next_steps'):
            preview_actionability += 25
        if preview_data.get('decision_points'):
            preview_actionability += 25

        return int((doc_score + preview_actionability) / 2)

    def _calculate_stakeholder_relevance_score(self, stakeholder_impact: Dict[str, Any]) -> int:
        """Calculate stakeholder relevance score"""

        scores = [
            stakeholder_impact.get('impact_demonstration', 0),
            stakeholder_impact.get('benefit_communication', 0),
            stakeholder_impact.get('risk_presentation', 0),
            stakeholder_impact.get('resource_clarity', 0),
            stakeholder_impact.get('strategic_alignment', 0)
        ]

        return int(sum(scores) / len(scores))

    def _determine_overall_readiness(self, *scores: int) -> ReadinessLevel:
        """Determine overall readiness level"""

        average_score = sum(scores) / len(scores)

        if average_score >= 85:
            return ReadinessLevel.READY
        elif average_score >= 70:
            return ReadinessLevel.NEEDS_IMPROVEMENT
        else:
            return ReadinessLevel.NOT_READY

    def _generate_recommendations(self, package_analysis: Dict[str, Any],
                                content_quality: Dict[str, Any],
                                visual_elements: Dict[str, Any],
                                documentation_quality: Dict[str, Any]) -> Dict[str, Any]:
        """Generate improvement recommendations"""

        improvements_needed = []
        critical_fixes = []
        enhancement_suggestions = []
        delivery_recommendations = []

        # Package improvements
        missing_components = package_analysis.get('components_missing', [])
        if missing_components:
            improvements_needed.append(f"Add missing components: {', '.join(missing_components)}")

        # Content quality improvements
        quality_issues = content_quality.get('quality_issues', [])
        improvements_needed.extend(quality_issues)

        # Visual improvements
        visual_improvements = visual_elements.get('visual_improvements', [])
        enhancement_suggestions.extend(visual_improvements)

        # Documentation improvements
        doc_gaps = documentation_quality.get('documentation_gaps', [])
        if doc_gaps:
            critical_fixes.extend(doc_gaps)

        # Delivery recommendations
        delivery_recommendations.extend([
            "Ensure all access links are working",
            "Test admin preview on multiple devices",
            "Provide clear timeline for admin review"
        ])

        return {
            'improvements_needed': improvements_needed,
            'critical_fixes': critical_fixes,
            'enhancement_suggestions': enhancement_suggestions,
            'delivery_recommendations': delivery_recommendations
        }

    def _calculate_accuracy(self, raw_signal: str, context: str, preview_data: Dict[str, Any]) -> int:
        """Calculate accuracy score (0-100)"""

        accuracy = 85  # Base accuracy for structured signals

        # Increase accuracy for clear signals
        if '[ap]' in raw_signal:
            accuracy += 10

        # Increase accuracy for detailed context
        if len(context) > 200:
            accuracy += 5

        return min(100, accuracy)

    def _calculate_acceptance(self, completeness_score: int, quality_score: int) -> int:
        """Calculate acceptance score (0-100)"""

        return int((completeness_score + quality_score) / 2)

    def _calculate_confidence(self, completeness_score: int, quality_score: int) -> int:
        """Calculate confidence score (0-100)"""

        base_confidence = 75

        # Adjust based on scores
        if completeness_score >= 80 and quality_score >= 80:
            base_confidence += 15
        elif completeness_score >= 60 and quality_score >= 60:
            base_confidence += 5
        else:
            base_confidence -= 10

        return max(30, min(100, base_confidence))

    def _estimate_admin_review_time(self, preview_data: Dict[str, Any]) -> str:
        """Estimate admin review time"""

        complexity = preview_data.get('complexity', 'medium')

        time_estimates = {
            'simple': '15-30 minutes',
            'medium': '30-60 minutes',
            'complex': '1-2 hours',
            'comprehensive': '2+ hours'
        }

        return time_estimates.get(complexity, '30-60 minutes')

    def _assess_decision_complexity(self, preview_data: Dict[str, Any]) -> str:
        """Assess decision complexity"""

        complexity_indicators = [
            preview_data.get('multiple_options', False),
            preview_data.get('significant_impact', False),
            preview_data.get('resource_intensive', False),
            preview_data.get('strategic_importance', False)
        ]

        complexity_score = sum(complexity_indicators)

        if complexity_score >= 3:
            return 'high'
        elif complexity_score >= 2:
            return 'medium'
        else:
            return 'low'