---
{
  "version": "2.0.0",
  "author": "system",
  "createdAt": "2025-11-09T00:00:00.000Z",
  "lastModified": "2025-11-09T00:00:00.000Z",
  "tags": ["development", "progress", "implementation"],
  "dependencies": [],
  "requiredTools": ["file-reader", "git-tools", "diff-analyzer"],
  "tokenLimits": {
    "inspector": 35000,
    "orchestrator": 25000
  },
  "validationSchema": "schema.json"
}
---

# Development Progress Analysis Guideline

## Overview
Analyze [dp] Development Progress signals to assess implementation status, quality, and completeness of development work.

## Signal Focus
[dp] signals indicate development progress updates from robo-developer agents. These signals typically include:
- Implementation completion status
- Code quality assessments
- Test coverage reports
- Documentation updates
- Feature completion metrics

## Analysis Criteria

### Implementation Assessment
1. **Completeness**: Evaluate how much of the intended feature/work has been implemented
2. **Quality**: Assess code quality, adherence to standards, and maintainability
3. **Testing**: Review test coverage, test quality, and test results
4. **Documentation**: Check if appropriate documentation has been created/updated
5. **Integration**: Verify integration with existing systems

### Progress Metrics
- Percentage of work completed
- Code quality scores
- Test coverage percentages
- Documentation completeness
- Integration status

### Risk Assessment
- Technical debt incurred
- Integration risks
- Performance implications
- Security considerations
- Maintainability impact

## Required Analysis
For each [dp] signal, provide:

1. **Implementation Status**
   - Overall completion percentage
   - Completed components
   - Incomplete components
   - Blocked items

2. **Quality Assessment**
   - Code quality rating (excellent/good/fair/poor)
   - Test coverage analysis
   - Documentation status
   - Standards compliance

3. **Risk Evaluation**
   - Technical risks identified
   - Integration concerns
   - Performance implications
   - Security considerations

4. **Recommendations**
   - Next steps required
   - Quality improvements needed
   - Additional testing requirements
   - Documentation tasks

## Output Requirements
Respond with structured JSON including:
- Implementation analysis with metrics
- Quality assessment with scores
- Risk evaluation with severity levels
- Actionable recommendations with priorities
- Confidence scores for all assessments

## Quality Standards
- Provide evidence-based assessments
- Include specific metrics and measurements
- Reference actual code/files when possible
- Consider broader project impact
- Maintain objectivity and consistency