# Inspector-Orchestrator Flow End-to-End Tests

## Overview

Comprehensive test suite for validating the complete inspector->orchestrator workflow with real file system operations and actual PRP files from the project.

## Test File

**Main Test**: `tests/e2e/inspector-orchestrator-flow.test.ts`

## What the Tests Validate

### 1. Complete Signal Processing Workflow
- **Scanner → Inspector**: Signal detection in PRP files
- **Inspector Analysis**: Uses merge-prompt to build comprehensive analysis prompts
- **Inspector → Orchestrator**: Payload creation and transmission
- **Orchestrator Processing**: Decision making and agent coordination

### 2. Real-World Integration Points
- **Actual PRP Files**: Uses real PRP files from the project (PRP-014, PRP-001, PRP-003, PRP-007)
- **Real File System**: No mocking - creates actual files and monitors changes
- **CLI Integration**: Tests actual CLI commands (`inspector analyze`, `orchestrator process`)

### 3. Merge-Prompt Integration Verification
- **Prompt Building**: Verifies inspector uses `buildInspectorPrompt()` with scanner data
- **Context Enrichment**: Validates merge-prompt merges scanner JSON with context
- **Token Optimization**: Confirms TOON (Token Optimized Notation) usage

### 4. Token Usage Tracking
- **Inspector Tokens**: Input/output token counting for signal analysis
- **Orchestrator Distribution**: Token caps tracking (inspector payload: 40k, PRP content: 20k, etc.)
- **Cross-System Totals**: Complete flow token usage measurement

### 5. Performance Requirements (from PRP-014)
- **End-to-End Latency**: < 800ms total
- **Inspector Analysis**: < 500ms per signal batch
- **Orchestrator Processing**: < 100ms for task distribution
- **Signal Processing Rate**: > 2 signals/second
- **Memory Usage**: < 512MB under normal load

### 6. Error Handling and Recovery
- **Invalid Signal Handling**: Tests with invalid signal types
- **System Recovery**: Validates graceful degradation
- **Partial Failures**: Ensures system continues with valid signals

## Test Scenarios

### Test 1: Basic Workflow
- **Signals**: 2 signals (dp, tp)
- **Validation**: End-to-end flow, merge-prompt usage, basic performance
- **Focus**: Core functionality validation

### Test 2: Multiple Signal Types
- **Signals**: 4 different signal types (gg, bb, af, rc)
- **Validation**: Signal classification, agent assignment, confidence scoring
- **Focus**: Signal type diversity handling

### Test 3: Performance Load
- **Signals**: 8 concurrent signals
- **Validation**: Latency, throughput, memory usage
- **Focus**: Performance under stress

### Test 4: Error Handling
- **Signals**: 1 invalid + 1 valid signal
- **Validation**: Error recovery, system stability
- **Focus**: Resilience testing

### Test 5: Real PRP Integration
- **Signals**: Real signals from actual PRP files
- **Validation**: Merge-prompt integration, context enrichment
- **Focus**: Real-world scenario testing

## Test Evidence and Reporting

### HTML Report Generation
- **Location**: `debug/inspector-orchestrator-e2e/inspector-orchestrator-report-{timestamp}.html`
- **Content**: Visual charts, performance metrics, detailed results
- **Features**: Interactive UI, pass/fail indicators, error details

### JSON Data Export
- **Location**: `debug/inspector-orchestrator-e2e/inspector-orchestrator-data-{timestamp}.json`
- **Content**: Raw test data for CI/CD integration
- **Format**: Structured data for automated analysis

### Performance Metrics
- **Latency Tracking**: Signal detection → decision latency
- **Token Efficiency**: Signals processed per K tokens
- **Memory Profiling**: Peak and average memory usage
- **Throughput Analysis**: Signals per second processing rate

## Integration Architecture Tested

```
PRP File Changes
       ↓
Scanner Signal Detection
       ↓
Inspector Analysis (merge-prompt integration)
       ↓
Inspector Payload Creation
       ↓
Orchestrator Processing
       ↓
Agent Task Assignment
       ↓
Decision Making
```

## Key Integration Points Validated

### 1. Scanner→Inspector Bridge
- Signal filtering and preprocessing
- Context building with file metadata
- Performance under file change volume

### 2. Inspector Analysis Pipeline
- Merge-prompt usage verification
- Signal classification accuracy
- Context enrichment with PRP data
- Token usage optimization

### 3. Inspector→Orchestrator Bridge
- Payload creation and transmission
- Decision making logic validation
- Agent task assignment verification
- Token distribution tracking

### 4. Cross-System Coordination
- Real-time signal processing
- Context synchronization
- Performance monitoring
- Error propagation handling

## Performance Thresholds

| Metric | Requirement | Test Validation |
|--------|------------|-----------------|
| End-to-End Latency | < 800ms | ✅ Measured |
| Inspector Analysis | < 500ms | ✅ Measured |
| Orchestrator Processing | < 100ms | ✅ Measured |
| Signal Processing Rate | > 2/sec | ✅ Calculated |
| Memory Usage | < 512MB | ✅ Monitored |
| Success Rate | > 95% | ✅ Validated |

## Usage

```bash
# Run all tests
npm test tests/e2e/inspector-orchestrator-flow.test.ts

# Run with verbose output
npm test -- --verbose tests/e2e/inspector-orchestrator-flow.test.ts

# Run with coverage
npm test -- --coverage tests/e2e/inspector-orchestrator-flow.test.ts
```

## Prerequisites

1. **CLI Built**: Run `npm run build` first
2. **Test Environment**: Creates isolated workspace in `debug/inspector-orchestrator-e2e/`
3. **PRP Files**: Copies real PRP files for testing
4. **Configuration**: Copies essential config files (.prprc, package.json)

## Evidence Collection

The test suite automatically collects:
- **Performance Snapshots**: Memory usage, processing times
- **Output Logs**: CLI stdout/stderr for analysis
- **File Changes**: Created/modified PRP files
- **Error Context**: Detailed error information with stack traces
- **Token Usage**: Complete token accounting across the flow

## CI/CD Integration

- **Exit Codes**: Proper exit codes for automated test failure detection
- **JSON Reports**: Machine-readable results for CI pipelines
- **Performance Gates**: Automated performance threshold validation
- **Error Tracking**: Structured error reporting for bug tracking

## Troubleshooting

### Common Issues
1. **CLI Not Built**: Run `npm run build` first
2. **Permission Errors**: Ensure write access to debug directory
3. **Timeout Issues**: Increase timeout values for slow systems
4. **Memory Issues**: Close other applications to free up memory

### Debug Information
- Test workspace: `debug/inspector-orchestrator-e2e/workspace-{timestamp}/`
- Logs: Check individual test console output
- Reports: HTML and JSON reports in debug directory

## Future Enhancements

1. **Parallel Execution**: Test concurrent signal processing
2. **Load Testing**: Higher signal volumes and sustained load
3. **Integration Scenarios**: More complex multi-signal workflows
4. **Performance Regression**: Automated performance trend tracking
5. **Visual Validation**: Screenshot-based testing for UI components

This comprehensive test suite provides end-to-end validation of the inspector-orchestrator workflow with real-world scenarios, performance requirements, and detailed reporting for production deployment confidence.