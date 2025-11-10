"""
Development Progress Signal Inspector Schema

This schema defines the expected output format for analyzing [dp] development progress signals.
"""

# @version: 2.0.0
# @author: system
# @tags: ["development", "progress", "implementation"]
# @dependencies: []
# @required_tools: ["file-reader", "git-tools", "diff-analyzer"]
# @token_limits: {"inspector": 35000, "orchestrator": 25000}

schema = {
    "type": "object",
    "properties": {
        "implementation_analysis": {
            "type": "object",
            "properties": {
                "completion_percentage": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Overall percentage of work completed"
                },
                "completed_components": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "component": {"type": "string"},
                            "status": {"type": "string"},
                            "quality_score": {"type": "number", "minimum": 0, "maximum": 10}
                        }
                    }
                },
                "incomplete_components": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "component": {"type": "string"},
                            "reason": {"type": "string"},
                            "estimated_completion": {"type": "string"}
                        }
                    }
                },
                "blocked_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "item": {"type": "string"},
                            "blocker": {"type": "string"},
                            "unblocking_required": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["completion_percentage", "completed_components", "incomplete_components"]
        },
        "quality_assessment": {
            "type": "object",
            "properties": {
                "overall_rating": {
                    "type": "string",
                    "enum": ["excellent", "good", "fair", "poor"]
                },
                "code_quality": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number", "minimum": 0, "maximum": 10},
                        "maintainability": {"type": "string", "enum": ["high", "medium", "low"]},
                        "readability": {"type": "string", "enum": ["excellent", "good", "fair", "poor"]},
                        "complexity": {"type": "string", "enum": ["low", "medium", "high", "critical"]}
                    }
                },
                "test_coverage": {
                    "type": "object",
                    "properties": {
                        "percentage": {"type": "number", "minimum": 0, "maximum": 100},
                        "unit_tests": {"type": "boolean"},
                        "integration_tests": {"type": "boolean"},
                        "e2e_tests": {"type": "boolean"},
                        "quality_rating": {"type": "string", "enum": ["comprehensive", "adequate", "minimal", "none"]}
                    }
                },
                "documentation": {
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "enum": ["complete", "partial", "missing"]},
                        "quality": {"type": "string", "enum": ["excellent", "good", "fair", "poor"]},
                        "coverage": {"type": "number", "minimum": 0, "maximum": 100}
                    }
                },
                "standards_compliance": {
                    "type": "object",
                    "properties": {
                        "linter_passed": {"type": "boolean"},
                        "type_checking": {"type": "boolean"},
                        "security_scan": {"type": "boolean"},
                        "performance_check": {"type": "boolean"}
                    }
                }
            },
            "required": ["overall_rating", "code_quality", "test_coverage"]
        },
        "risk_evaluation": {
            "type": "object",
            "properties": {
                "overall_risk": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"]
                },
                "technical_risks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "risk": {"type": "string"},
                            "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                            "impact": {"type": "string"},
                            "mitigation": {"type": "string"}
                        }
                    }
                },
                "integration_risks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "area": {"type": "string"},
                            "risk": {"type": "string"},
                            "mitigation": {"type": "string"}
                        }
                    }
                },
                "performance_implications": {
                    "type": "object",
                    "properties": {
                        "impact": {"type": "string", "enum": ["positive", "negative", "neutral"]},
                        "concerns": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "security_considerations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "concern": {"type": "string"},
                            "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                            "recommendation": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["overall_risk", "technical_risks"]
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["implementation", "testing", "documentation", "quality", "integration", "security"]
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["critical", "high", "medium", "low"]
                    },
                    "description": {"type": "string"},
                    "action_items": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "estimated_time": {
                        "type": "number",
                        "description": "Estimated time in minutes"
                    },
                    "confidence": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "Confidence in this recommendation"
                    }
                },
                "required": ["type", "priority", "description", "estimated_time", "confidence"]
            }
        },
        "confidence_assessment": {
            "type": "object",
            "properties": {
                "overall_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100
                },
                "analysis_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100
                },
                "recommendation_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100
                },
                "uncertainty_factors": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["overall_confidence", "analysis_confidence"]
        }
    },
    "required": [
        "implementation_analysis",
        "quality_assessment",
        "risk_evaluation",
        "recommendations",
        "confidence_assessment"
    ]
}

# Validation function
def validate_analysis_output(data: dict) -> bool:
    """
    Validate that the analysis output conforms to the schema.

    Args:
        data: The analysis output to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        # Check required top-level fields
        required_fields = [
            "implementation_analysis",
            "quality_assessment",
            "risk_evaluation",
            "recommendations",
            "confidence_assessment"
        ]

        for field in required_fields:
            if field not in data:
                return False

        # Validate implementation analysis
        impl = data["implementation_analysis"]
        if not isinstance(impl.get("completion_percentage"), (int, float)):
            return False
        if not 0 <= impl["completion_percentage"] <= 100:
            return False

        # Validate quality assessment
        quality = data["quality_assessment"]
        if quality.get("overall_rating") not in ["excellent", "good", "fair", "poor"]:
            return False

        # Validate risk evaluation
        risk = data["risk_evaluation"]
        if risk.get("overall_risk") not in ["low", "medium", "high", "critical"]:
            return False

        # Validate recommendations
        recs = data["recommendations"]
        if not isinstance(recs, list):
            return False

        for rec in recs:
            if rec.get("type") not in ["implementation", "testing", "documentation", "quality", "integration", "security"]:
                return False
            if rec.get("priority") not in ["critical", "high", "medium", "low"]:
                return False

        # Validate confidence assessment
        conf = data["confidence_assessment"]
        if not isinstance(conf.get("overall_confidence"), (int, float)):
            return False
        if not 0 <= conf["overall_confidence"] <= 100:
            return False

        return True

    except Exception:
        return False