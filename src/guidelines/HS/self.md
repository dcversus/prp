# Self Identity Reasoning

## Purpose
Process the orchestrator's self identity and context based on the provided --self parameter or default configuration.

## Instructions

### Input
You will receive:
1. **selfInput**: The raw string provided via --self CLI parameter
2. **sharedContext**: Current shared context across all PRPs
3. **prpSummary**: Summary of active PRPs

### Task
Analyze the input and generate a structured self identity response with three components:

#### 1. **selfName**
- If selfInput is provided: Extract a concise identity name from the selfInput
- If no selfInput: Use "prp-orchestrator"

#### 2. **selfSummary**
- If selfInput is provided: Create a brief summary based on selfInput
- If no selfInput: Use the sharedContext

#### 3. **selfGoal**
- If selfInput is provided: Extract the primary goal from selfInput
- If no selfInput: Combine all PRP summaries with " -- ANOTHER PRP -- " separator

### Output Format
```json
{
  "selfName": "string",
  "selfSummary": "string",
  "selfGoal": "string"
}
```

### Examples

#### With --self parameter:
Input: "I am a senior full-stack developer working on e-commerce platform optimization"
Output:
```json
{
  "selfName": "senior full-stack developer",
  "selfSummary": "I am a senior full-stack developer focused on e-commerce platform optimization",
  "selfGoal": "Optimize e-commerce platform performance and user experience"
}
```

#### Without --self parameter:
Input: null/undefined
Output:
```json
{
  "selfName": "prp-orchestrator",
  "selfSummary": "Managing autonomous development workflow with signal-driven orchestration",
  "selfGoal": "Implement user authentication system -- ANOTHER PRP -- Optimize database queries -- ANOTHER PRP -- Deploy CI/CD pipeline"
}
```

## Storage
Store the result in the orchestrator's self configuration for API access across all system layers.