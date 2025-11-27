"""
System Fatal Error Signal Inspector Implementation

Processes [ff] - System Fatal Error signals for emergency response assessment.
"""

import asyncio
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from enum import Enum

class SeverityLevel(Enum):
    CATASTROPHIC = "catastrophic"
    CRITICAL = "critical"
    SEVERE = "severe"
    HIGH = "high"
    ELEVATED = "elevated"

class IncidentType(Enum):
    SYSTEM_CRASH = "system_crash"
    DATA_CORRUPTION = "data_corruption"
    SECURITY_BREACH = "security_breach"
    INFRASTRUCTURE_FAILURE = "infrastructure_failure"
    SERVICE_OUTAGE = "service_outage"

class FFInspector:
    """Inspector for system fatal error signals"""

    def __init__(self):
        self.signal_code = 'ff'
        self.emergency_priority = 100  # Maximum priority

    async def process_signal(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """Process system fatal error signal and prepare emergency assessment"""

        # Extract signal data
        raw_signal = signal.get('data', {}).get('raw_signal', '')
        context = signal.get('data', {}).get('context', '')
        error_logs = signal.get('data', {}).get('error_logs', '')
        system_state = signal.get('data', {}).get('system_state', {})

        # Parse signal components
        error_type = self._extract_error_type(raw_signal, context, error_logs)
        system_impact = self._extract_system_impact(raw_signal, context)
        initial_detection_time = signal.get('timestamp', datetime.now().isoformat())

        # Classify severity
        severity_level, severity_score = self._classify_severity(error_type, system_impact, error_logs)
        incident_type = self._classify_incident_type(error_type, error_logs)

        # Analyze impact
        impact_analysis = await self._analyze_impact(system_state, error_logs, incident_type)

        # Assess data integrity
        data_integrity = await self._assess_data_integrity(error_logs, system_state, incident_type)

        # Analyze recovery options
        recovery_analysis = await self._analyze_recovery_options(system_state, error_logs, incident_type)

        # Plan emergency response
        emergency_response = await self._plan_emergency_response(
            severity_level, impact_analysis, incident_type
        )

        # Generate recommendations
        recommendations = self._generate_emergency_recommendations(
            severity_level, recovery_analysis, impact_analysis
        )

        # Prepare comprehensive emergency assessment
        emergency_assessment = {
            'incident_id': f"incident_{signal['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'severity_level': severity_level.value,
            'severity_score': severity_score,
            'incident_type': incident_type.value,
            'initial_detection_time': initial_detection_time,
            'assessment_completion_time': datetime.now().isoformat(),
            'accuracy': self._calculate_accuracy(raw_signal, context, error_logs),
            'acceptance': 100,  # Emergency situations require immediate acceptance
            'confidence': self._calculate_confidence(severity_score, impact_analysis)
        }

        # Create comprehensive response
        response = {
            'signal_id': signal['id'],
            'signal_type': 'ff',
            'emergency_assessment': emergency_assessment,
            'impact_analysis': impact_analysis,
            'data_integrity': data_integrity,
            'recovery_analysis': recovery_analysis,
            'emergency_response': emergency_response,
            'recommendations': recommendations,
            'requires_action': True,
            'escalation_threshold': 1,  # Immediate escalation for all FF signals
            'processing_time': datetime.now().isoformat(),
            'metadata': {
                'signal_source': signal.get('source', 'unknown'),
                'error_type': error_type,
                'system_impact_level': system_impact,
                'emergency_team_notified': False,
                'stakeholder_notified': False,
                'recovery_initiated': False
            }
        }

        return response

    def _extract_error_type(self, raw_signal: str, context: str, error_logs: str) -> str:
        """Extract the type of error from signal and logs"""

        combined_text = (raw_signal + ' ' + context + ' ' + error_logs).lower()

        # Common error type patterns
        error_patterns = {
            'memory_exhaustion': ['out of memory', 'memory exhaustion', 'oom', 'heap overflow'],
            'database_corruption': ['database corruption', 'db corruption', 'data corruption', 'sql error'],
            'system_crash': ['system crash', 'kernel panic', 'blue screen', 'fatal error'],
            'security_breach': ['security breach', 'unauthorized access', 'security incident', 'malware'],
            'network_failure': ['network failure', 'connectivity lost', 'network down', 'connection refused'],
            'disk_failure': ['disk failure', 'hard drive error', 'storage failure', 'i/o error'],
            'service_crash': ['service crash', 'application crash', 'process terminated', 'service down'],
            'infrastructure_failure': ['infrastructure failure', 'hardware failure', 'power failure']
        }

        for error_type, patterns in error_patterns.items():
            if any(pattern in combined_text for pattern in patterns):
                return error_type

        return 'unknown_fatal_error'

    def _extract_system_impact(self, raw_signal: str, context: str) -> str:
        """Extract system impact level"""

        combined_text = (raw_signal + ' ' + context).lower()

        # Check for impact indicators
        if any(word in combined_text for word in ['complete', 'total', 'all systems', 'entire']):
            return 'system-wide'
        elif any(word in combined_text for word in ['major', 'significant', 'critical', 'extensive']):
            return 'major-impact'
        elif any(word in combined_text for word in ['partial', 'some', 'limited']):
            return 'partial-impact'
        else:
            return 'unknown-impact'

    def _classify_severity(self, error_type: str, system_impact: str, error_logs: str) -> Tuple[SeverityLevel, int]:
        """Classify severity level and calculate severity score"""

        severity_score = 50  # Base score for all fatal errors

        # Adjust score based on error type
        severity_adjustments = {
            'memory_exhaustion': 15,
            'database_corruption': 25,
            'system_crash': 20,
            'security_breach': 30,
            'network_failure': 10,
            'disk_failure': 20,
            'service_crash': 15,
            'infrastructure_failure': 25
        }

        severity_score += severity_adjustments.get(error_type, 10)

        # Adjust score based on system impact
        if system_impact == 'system-wide':
            severity_score += 25
        elif system_impact == 'major-impact':
            severity_score += 15
        elif system_impact == 'partial-impact':
            severity_score += 5

        # Check for critical indicators in error logs
        critical_indicators = ['critical', 'fatal', 'emergency', 'catastrophic']
        if any(indicator in error_logs.lower() for indicator in critical_indicators):
            severity_score += 15

        # Determine severity level
        if severity_score >= 90:
            return SeverityLevel.CATASTROPHIC, min(100, severity_score)
        elif severity_score >= 75:
            return SeverityLevel.CRITICAL, severity_score
        elif severity_score >= 60:
            return SeverityLevel.SEVERE, severity_score
        elif severity_score >= 45:
            return SeverityLevel.HIGH, severity_score
        else:
            return SeverityLevel.ELEVATED, severity_score

    def _classify_incident_type(self, error_type: str, error_logs: str) -> IncidentType:
        """Classify incident type"""

        if error_type in ['system_crash', 'memory_exhaustion', 'service_crash']:
            return IncidentType.SYSTEM_CRASH
        elif error_type in ['database_corruption', 'data corruption']:
            return IncidentType.DATA_CORRUPTION
        elif error_type in ['security_breach']:
            return IncidentType.SECURITY_BREACH
        elif error_type in ['infrastructure_failure', 'disk_failure', 'network_failure']:
            return IncidentType.INFRASTRUCTURE_FAILURE
        else:
            return IncidentType.SERVICE_OUTAGE

    async def _analyze_impact(self, system_state: Dict[str, Any], error_logs: str,
                           incident_type: IncidentType) -> Dict[str, Any]:
        """Analyze comprehensive impact of the incident"""

        # Analyze systems affected
        systems_affected = self._analyze_systems_affected(system_state, error_logs)

        # Analyze user impact
        user_impact = self._analyze_user_impact(system_state, incident_type)

        # Analyze business impact
        business_impact = self._analyze_business_impact(system_state, incident_type)

        return {
            'systems_affected': systems_affected,
            'user_impact': user_impact,
            'business_impact': business_impact
        }

    def _analyze_systems_affected(self, system_state: Dict[str, Any], error_logs: str) -> Dict[str, List[str]]:
        """Analyze affected systems"""

        systems = {
            'core_systems': [],
            'supporting_systems': [],
            'user_systems': [],
            'external_systems': [],
            'data_systems': []
        }

        # Extract system information from state and logs
        combined_info = str(system_state) + ' ' + error_logs.lower()

        # Identify core systems
        core_indicators = ['database', 'application server', 'web server', 'api server']
        for indicator in core_indicators:
            if indicator in combined_info:
                systems['core_systems'].append(indicator)

        # Identify supporting systems
        supporting_indicators = ['cache', 'message queue', 'load balancer', 'monitoring']
        for indicator in supporting_indicators:
            if indicator in combined_info:
                systems['supporting_systems'].append(indicator)

        # Identify user systems
        user_indicators = ['user interface', 'client application', 'mobile app']
        for indicator in user_indicators:
            if indicator in combined_info:
                systems['user_systems'].append(indicator)

        # Identify external systems
        external_indicators = ['payment gateway', 'third-party api', 'external service']
        for indicator in external_indicators:
            if indicator in combined_info:
                systems['external_systems'].append(indicator)

        # Identify data systems
        data_indicators = ['database', 'storage', 'backup system', 'file system']
        for indicator in data_indicators:
            if indicator in combined_info:
                systems['data_systems'].append(indicator)

        return systems

    def _analyze_user_impact(self, system_state: Dict[str, Any], incident_type: IncidentType) -> Dict[str, Any]:
        """Analyze user impact"""

        # Default user impact - can be enhanced with actual user data
        total_users_affected = system_state.get('total_users', 0)
        critical_functions = []
        services_unavailable = []
        data_access_affected = True

        # Determine impact based on incident type
        if incident_type == IncidentType.SYSTEM_CRASH:
            critical_functions.extend(['user login', 'data access', 'core functionality'])
            services_unavailable.extend(['user interface', 'api services', 'data services'])
        elif incident_type == IncidentType.DATA_CORRUPTION:
            critical_functions.extend(['data access', 'data integrity'])
            services_unavailable.extend(['data services', 'reporting'])
            data_access_affected = True
        elif incident_type == IncidentType.SECURITY_BREACH:
            critical_functions.extend(['user authentication', 'data access'])
            services_unavailable.extend(['login services', 'user data'])
        elif incident_type == IncidentType.INFRASTRUCTURE_FAILURE:
            critical_functions.extend(['system access', 'service availability'])
            services_unavailable.extend(['all services'])

        # Estimate work disruption level
        work_disruption_level = 'severe' if len(services_unavailable) > 3 else 'significant' if len(services_unavailable) > 1 else 'moderate'

        return {
            'total_users_affected': total_users_affected,
            'critical_functions_impacted': critical_functions,
            'services_unavailable': services_unavailable,
            'data_access_affected': data_access_affected,
            'work_disruption_level': work_disruption_level
        }

    def _analyze_business_impact(self, system_state: Dict[str, Any], incident_type: IncidentType) -> Dict[str, Any]:
        """Analyze business impact"""

        business_processes = []
        revenue_impact = 'high'
        customer_impact = 'critical'
        compliance_risk = 'high'

        # Determine business processes affected
        if incident_type == IncidentType.SYSTEM_CRASH:
            business_processes.extend(['order processing', 'customer service', 'data processing'])
            revenue_impact = 'critical'
        elif incident_type == IncidentType.DATA_CORRUPTION:
            business_processes.extend(['reporting', 'analytics', 'data processing'])
            revenue_impact = 'high'
            compliance_risk = 'critical'
        elif incident_type == IncidentType.SECURITY_BREACH:
            business_processes.extend(['user authentication', 'data processing', 'compliance'])
            compliance_risk = 'critical'
        elif incident_type == IncidentType.INFRASTRUCTURE_FAILURE:
            business_processes.extend(['all business processes'])
            revenue_impact = 'critical'

        return {
            'business_processes_affected': business_processes,
            'revenue_impact_estimate': revenue_impact,
            'customer_impact': customer_impact,
            'compliance_risk': compliance_risk
        }

    async def _assess_data_integrity(self, error_logs: str, system_state: Dict[str, Any],
                                 incident_type: IncidentType) -> Dict[str, Any]:
        """Assess data integrity status"""

        corruption_detected = False
        corruption_scope = 'none'
        data_loss_probability = 0
        backup_availability = 'unknown'
        recovery_timeline = 'unknown'
        critical_data_affected = []

        # Check for corruption indicators
        corruption_indicators = ['corruption', 'corrupt', 'damaged', 'inconsistent', 'integrity error']
        if any(indicator in error_logs.lower() for indicator in corruption_indicators):
            corruption_detected = True
            corruption_scope = 'significant' if 'database' in error_logs.lower() else 'limited'
            data_loss_probability = 70 if corruption_scope == 'significant' else 30

        # Adjust based on incident type
        if incident_type == IncidentType.DATA_CORRUPTION:
            corruption_detected = True
            corruption_scope = 'extensive'
            data_loss_probability = 80
        elif incident_type == IncidentType.SYSTEM_CRASH:
            data_loss_probability = max(data_loss_probability, 40)

        # Check backup availability (simplified)
        backup_indicators = ['backup', 'recovery', 'restore point']
        if any(indicator in error_logs.lower() for indicator in backup_indicators):
            backup_availability = 'available'
        elif corruption_detected:
            backup_availability = 'partial'
        else:
            backup_availability = 'unavailable'

        # Estimate recovery timeline
        if backup_availability == 'available':
            recovery_timeline = '2-6 hours'
        elif backup_availability == 'partial':
            recovery_timeline = '6-24 hours'
        else:
            recovery_timeline = '1-3 days'

        # Identify critical data types affected
        if 'database' in error_logs.lower() or 'data' in error_logs.lower():
            critical_data_affected.extend(['user data', 'transaction data', 'configuration data'])

        return {
            'corruption_detected': corruption_detected,
            'corruption_scope': corruption_scope,
            'data_loss_probability': data_loss_probability,
            'backup_availability': backup_availability,
            'recovery_timeline': recovery_timeline,
            'critical_data_affected': critical_data_affected
        }

    async def _analyze_recovery_options(self, system_state: Dict[str, Any], error_logs: str,
                                     incident_type: IncidentType) -> Dict[str, Any]:
        """Analyze recovery options"""

        immediate_recovery_options = []
        long_term_recovery_options = []
        workaround_options = []

        # Generate recovery options based on incident type
        if incident_type == IncidentType.SYSTEM_CRASH:
            immediate_recovery_options.extend([
                {
                    'option': 'System restart and recovery',
                    'timeline': '30 minutes - 2 hours',
                    'success_probability': 70,
                    'resource_requirements': ['technical team', 'system administrator'],
                    'risks': ['potential data loss', 'extended downtime']
                },
                {
                    'option': 'Failover to backup system',
                    'timeline': '1-3 hours',
                    'success_probability': 85,
                    'resource_requirements': ['backup system access', 'technical team'],
                    'risks': ['data synchronization issues', 'performance degradation']
                }
            ])

            workaround_options.extend([
                {
                    'option': 'Manual processing for critical functions',
                    'effectiveness': 'medium',
                    'implementation_time': '1-2 hours',
                    'limitations': ['limited capacity', 'manual errors']
                }
            ])

        elif incident_type == IncidentType.DATA_CORRUPTION:
            immediate_recovery_options.extend([
                {
                    'option': 'Database repair and recovery',
                    'timeline': '4-12 hours',
                    'success_probability': 60,
                    'resource_requirements': ['database administrators', 'recovery tools'],
                    'risks': ['partial data loss', 'extended recovery time']
                },
                {
                    'option': 'Restore from latest backup',
                    'timeline': '2-6 hours',
                    'success_probability': 80,
                    'resource_requirements': ['backup systems', 'technical team'],
                    'risks': ['data loss since backup', 'service interruption']
                }
            ])

        elif incident_type == IncidentType.SECURITY_BREACH:
            immediate_recovery_options.extend([
                {
                    'option': 'System isolation and containment',
                    'timeline': '1-3 hours',
                    'success_probability': 90,
                    'resource_requirements': ['security team', 'network administrators'],
                    'risks': ['service disruption', 'investigation complexity']
                },
                {
                    'option': 'Emergency patch and security update',
                    'timeline': '3-6 hours',
                    'success_probability': 75,
                    'resource_requirements': ['security team', 'development team'],
                    'risks': ['patch compatibility issues', 'regression risk']
                }
            ])

        elif incident_type == IncidentType.INFRASTRUCTURE_FAILURE:
            immediate_recovery_options.extend([
                {
                    'option': 'Hardware replacement and repair',
                    'timeline': '4-12 hours',
                    'success_probability': 85,
                    'resource_requirements': ['hardware team', 'replacement parts'],
                    'risks': ['parts availability', 'installation complexity']
                },
                {
                    'option': 'Activate disaster recovery site',
                    'timeline': '2-8 hours',
                    'success_probability': 80,
                    'resource_requirements': ['disaster recovery team', 'recovery infrastructure'],
                    'risks': ['data synchronization', 'performance issues']
                }
            ])

        # Add common long-term recovery options
        long_term_recovery_options.extend([
            {
                'option': 'Comprehensive system hardening',
                'timeline': '1-3 days',
                'success_probability': 95,
                'resource_requirements': ['engineering team', 'security team'],
                'risks': ['extended downtime', 'compatibility issues']
            },
            {
                'option': 'Complete system rebuild',
                'timeline': '2-5 days',
                'success_probability': 90,
                'resource_requirements': ['development team', 'infrastructure team'],
                'risks': ['configuration errors', 'extended recovery time']
            }
        ])

        return {
            'immediate_recovery_options': immediate_recovery_options,
            'long_term_recovery_options': long_term_recovery_options,
            'workaround_options': workaround_options
        }

    async def _plan_emergency_response(self, severity_level: SeverityLevel,
                                    impact_analysis: Dict[str, Any],
                                    incident_type: IncidentType) -> Dict[str, Any]:
        """Plan emergency response actions"""

        # Determine immediate actions
        immediate_actions = self._determine_immediate_actions(severity_level, incident_type)

        # Plan communication strategy
        communication_strategy = self._plan_communication_strategy(impact_analysis, severity_level)

        # Determine resource requirements
        resource_requirements = self._determine_resource_requirements(severity_level, incident_type)

        # Establish escalation contacts
        escalation_contacts = self._establish_escalation_contacts(severity_level)

        return {
            'immediate_actions': immediate_actions,
            'communication_strategy': communication_strategy,
            'resource_requirements': resource_requirements,
            'escalation_contacts': escalation_contacts
        }

    def _determine_immediate_actions(self, severity_level: SeverityLevel,
                                  incident_type: IncidentType) -> List[str]:
        """Determine immediate emergency actions"""

        actions = [
            'Declare emergency state and mobilize response team',
            'Isolate affected systems to prevent further damage',
            'Initiate system stabilization procedures'
        ]

        # Add severity-specific actions
        if severity_level in [SeverityLevel.CATASTROPHIC, SeverityLevel.CRITICAL]:
            actions.extend([
                'Activate disaster recovery procedures',
                'Notify executive management immediately',
                'Engage external emergency support services'
            ])

        # Add incident-type specific actions
        if incident_type == IncidentType.DATA_CORRUPTION:
            actions.extend([
                'Stop all write operations to affected databases',
                'Preserve system state for forensic analysis',
                'Initiate data integrity verification'
            ])
        elif incident_type == IncidentType.SECURITY_BREACH:
            actions.extend([
                'Disconnect affected systems from network',
                'Preserve forensic evidence',
                'Initiate security incident response plan'
            ])

        return actions

    def _plan_communication_strategy(self, impact_analysis: Dict[str, Any],
                                   severity_level: SeverityLevel) -> Dict[str, Any]:
        """Plan emergency communication strategy"""

        stakeholder_groups = [
            'executive_management',
            'technical_team',
            'customer_support',
            'affected_users',
            'external_partners',
            'regulatory_compliance'
        ]

        communication_channels = ['emergency_notification', 'email', 'slack', 'phone']

        if severity_level in [SeverityLevel.CATASTROPHIC, SeverityLevel.CRITICAL]:
            communication_channels.extend(['press_release', 'customer_portal'])

        message_templates = [
            'emergency_initial_notification',
            'status_update_template',
            'recovery_progress_template',
            'resolution_notification_template'
        ]

        frequency = 'continuous' if severity_level == SeverityLevel.CATASTROPHIC else 'hourly'

        return {
            'stakeholder_groups': stakeholder_groups,
            'communication_channels': communication_channels,
            'message_templates': message_templates,
            'frequency': frequency
        }

    def _determine_resource_requirements(self, severity_level: SeverityLevel,
                                      incident_type: IncidentType) -> Dict[str, Any]:
        """Determine resource requirements for emergency response"""

        technical_team = 3 if severity_level == SeverityLevel.ELEVATED else 5 if severity_level == SeverityLevel.HIGH else 10

        external_support = severity_level in [SeverityLevel.CATASTROPHIC, SeverityLevel.CRITICAL]

        emergency_equipment = []

        if incident_type == IncidentType.INFRASTRUCTURE_FAILURE:
            emergency_equipment.extend(['replacement_hardware', 'diagnostic_tools'])
        elif incident_type == IncidentType.DATA_CORRUPTION:
            emergency_equipment.extend(['data_recovery_tools', 'forensic_equipment'])

        budget_authority = 'senior_management' if severity_level in [SeverityLevel.CATASTROPHIC, SeverityLevel.CRITICAL] else 'department_head'

        return {
            'technical_team': technical_team,
            'external_support': external_support,
            'emergency_equipment': emergency_equipment,
            'budget_authority': budget_authority
        }

    def _establish_escalation_contacts(self, severity_level: SeverityLevel) -> List[Dict[str, Any]]:
        """Establish escalation contacts"""

        contacts = [
            {
                'role': 'Incident Commander',
                'name': 'Technical Lead',
                'contact': 'tech-lead@company.com',
                'authority_level': 'technical'
            },
            {
                'role': 'Business Lead',
                'name': 'Business Manager',
                'contact': 'business-manager@company.com',
                'authority_level': 'business'
            }
        ]

        if severity_level in [SeverityLevel.CATASTROPHIC, SeverityLevel.CRITICAL]:
            contacts.extend([
                {
                    'role': 'Executive Sponsor',
                    'name': 'CTO/CEO',
                    'contact': 'executive@company.com',
                    'authority_level': 'executive'
                },
                {
                    'role': 'Public Relations',
                    'name': 'PR Manager',
                    'contact': 'pr@company.com',
                    'authority_level': 'communications'
                }
            ])

        return contacts

    def _generate_emergency_recommendations(self, severity_level: SeverityLevel,
                                        recovery_analysis: Dict[str, Any],
                                        impact_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate emergency response recommendations"""

        # Select primary recovery approach
        immediate_options = recovery_analysis.get('immediate_recovery_options', [])
        primary_approach = immediate_options[0]['option'] if immediate_options else 'System recovery'

        # Determine immediate priorities
        immediate_priorities = [
            'Stabilize affected systems and prevent further damage',
            'Preserve data integrity and system state',
            'Initiate recovery procedures with highest success probability'
        ]

        if severity_level in [SeverityLevel.CATASTROPHIC, SeverityLevel.CRITICAL]:
            immediate_priorities.extend([
                'Activate disaster recovery and business continuity plans',
                'Notify all critical stakeholders immediately'
            ])

        # Plan resource allocation
        resource_allocation = [
            'Allocate dedicated emergency response team',
            'Secure necessary tools and equipment',
            'Engage external support services if required'
        ]

        # Estimate timeline
        recovery_options = recovery_analysis.get('immediate_recovery_options', [])
        if recovery_options:
            best_option = min(recovery_options, key=lambda x: x.get('timeline', '999'))
            timeline = best_option.get('timeline', 'Unknown')
        else:
            timeline = '2-24 hours'

        # Define success metrics
        success_metrics = [
            'System stabilization achieved',
            'Data integrity preserved',
            'Service recovery completed',
            'User impact minimized',
            'Documentation completed'
        ]

        return {
            'primary_recovery_approach': primary_approach,
            'immediate_priorities': immediate_priorities,
            'resource_allocation': resource_allocation,
            'timeline_estimate': timeline,
            'success_metrics': success_metrics
        }

    def _calculate_accuracy(self, raw_signal: str, context: str, error_logs: str) -> int:
        """Calculate analysis accuracy score"""

        accuracy = 90  # Base accuracy for emergency signals

        # Increase accuracy for detailed error logs
        if len(error_logs) > 500:
            accuracy += 10

        return min(100, accuracy)

    def _calculate_confidence(self, severity_score: int, impact_analysis: Dict[str, Any]) -> int:
        """Calculate confidence in emergency assessment"""

        base_confidence = 85  # High confidence for emergency assessments

        # Adjust based on severity score
        if severity_score >= 80:
            base_confidence += 10

        # Adjust based on impact analysis completeness
        systems_count = sum(len(systems) for systems in impact_analysis.get('systems_affected', {}).values())
        if systems_count >= 5:
            base_confidence += 5

        return min(100, base_confidence)