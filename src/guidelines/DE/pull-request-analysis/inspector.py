"""
Schema for Pull Request Analysis Inspector
Defines the expected output structure for PR analysis results
"""

import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum

class PriorityLevel(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class RecommendationType(Enum):
    IMPLEMENT = "implement"
    REVIEW = "review"
    TEST = "test"
    DEPLOY = "deploy"
    DOCUMENT = "document"

class AgentRole(Enum):
    ROBO_DEVELOPER = "robo-developer"
    ROBO_AQA = "robo-aqa"
    ROBO_DEVOPS_SRE = "robo-devops-sre"
    ROBO_SYSTEM_ANALYST = "robo-system-analyst"

# Main schema definition
schema = {
    "type": "object",
    "properties": {
        "classification": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["development", "testing", "security", "performance", "documentation"],
                    "description": "Primary classification category"
                },
                "subcategory": {
                    "type": "string",
                    "enum": ["pull-request-analysis", "code-review", "quality-assessment", "security-review"],
                    "description": "Specific classification subcategory"
                },
                "priority": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "description": "Priority level (1-10, where 10 is highest)"
                },
                "agentRole": {
                    "type": "string",
                    "enum": [role.value for role in AgentRole],
                    "description": "Assigned agent role"
                },
                "escalationLevel": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5,
                    "description": "Escalation urgency (1-5)"
                },
                "deadline": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Recommended deadline for resolution"
                },
                "dependencies": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Required dependencies or prerequisites"
                },
                "confidence": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Confidence score (0-100)"
                }
            },
            "required": ["category", "priority", "agentRole", "confidence"]
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [t.value for t in RecommendationType],
                        "description": "Recommendation type"
                    },
                    "priority": {
                        "type": "string",
                        "enum": [p.value for p in PriorityLevel],
                        "description": "Priority level"
                    },
                    "description": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 500,
                        "description": "Clear, actionable description"
                    },
                    "estimatedTime": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 480,
                        "description": "Estimated time in minutes"
                    },
                    "prerequisites": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Required prerequisites"
                    },
                    "reasoning": {
                        "type": "string",
                        "maxLength": 300,
                        "description": "Why this recommendation is needed"
                    }
                },
                "required": ["type", "description", "estimatedTime"]
            }
        }
    },
    "required": ["classification", "recommendations"]
}

def validate_inspector_output(data: Dict[str, Any]) -> List[str]:
    """
    Validate inspector output against schema

    Args:
        data: Dictionary containing inspector output

    Returns:
        List of validation errors
    """
    errors = []

    # Check required top-level fields
    if "classification" not in data:
        errors.append("Missing required field: classification")

    if "recommendations" not in data:
        errors.append("Missing required field: recommendations")

    # Validate classification
    if "classification" in data:
        classification = data["classification"]

        required_fields = ["category", "priority", "agentRole", "confidence"]
        for field in required_fields:
            if field not in classification:
                errors.append(f"Missing required field in classification: {field}")

        # Validate priority range
        if "priority" in classification:
            priority = classification["priority"]
            if not isinstance(priority, int) or priority < 1 or priority > 10:
                errors.append("Priority must be an integer between 1 and 10")

        # Validate confidence range
        if "confidence" in classification:
            confidence = classification["confidence"]
            if not isinstance(confidence, int) or confidence < 0 or confidence > 100:
                errors.append("Confidence must be an integer between 0 and 100")

    # Validate recommendations
    if "recommendations" in data:
        recommendations = data["recommendations"]

        if not isinstance(recommendations, list):
            errors.append("Recommendations must be an array")
        else:
            for i, rec in enumerate(recommendations):
                if not isinstance(rec, dict):
                    errors.append(f"Recommendation {i} must be an object")
                    continue

                required_fields = ["type", "description", "estimatedTime"]
                for field in required_fields:
                    if field not in rec:
                        errors.append(f"Recommendation {i} missing required field: {field}")

                # Validate estimated time
                if "estimatedTime" in rec:
                    time = rec["estimatedTime"]
                    if not isinstance(time, int) or time < 1 or time > 480:
                        errors.append(f"Recommendation {i} estimatedTime must be between 1 and 480 minutes")

    return errors

def generate_default_deadline(priority: int) -> str:
    """
    Generate default deadline based on priority

    Args:
        priority: Priority level (1-10)

    Returns:
        ISO date string for deadline
    """
    if priority >= 8:
        hours = 2
    elif priority >= 6:
        hours = 8
    elif priority >= 4:
        hours = 24
    else:
        hours = 72

    deadline = datetime.now() + timedelta(hours=hours)
    return deadline.isoformat()

# Example usage and test data
example_output = {
    "classification": {
        "category": "development",
        "subcategory": "pull-request-analysis",
        "priority": 7,
        "agentRole": "robo-developer",
        "escalationLevel": 2,
        "deadline": generate_default_deadline(7),
        "dependencies": [],
        "confidence": 85
    },
    "recommendations": [
        {
            "type": "review",
            "priority": "high",
            "description": "Review the implementation for completeness and add missing test cases",
            "estimatedTime": 60,
            "prerequisites": ["Complete code review"],
            "reasoning": "Implementation looks good but needs more comprehensive testing"
        },
        {
            "type": "test",
            "priority": "medium",
            "description": "Add integration tests for the new functionality",
            "estimatedTime": 120,
            "prerequisites": ["Unit tests completed"],
            "reasoning": "Integration tests are needed to verify component interactions"
        }
    ]
}

if __name__ == "__main__":
    # Validate example output
    errors = validate_inspector_output(example_output)
    if errors:
        print("Validation errors:")
        for error in errors:
            print(f"  - {error}")
    else:
        print("Example output is valid!")

    # Print schema
    print("\nSchema definition:")
    print(json.dumps(schema, indent=2))