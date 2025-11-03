# ♫ Integration Tests for @dcversus/prp

This directory contains comprehensive integration tests that verify the complete flow of the three-layer architecture system.

## Test Structure

### 🎯 **Core Integration Tests**

1. **Scanner → Inspector Flow** (`scanner-inspector-flow.test.ts`)
   - Tests signal detection and classification pipeline
   - Verifies data flow between Scanner and Inspector layers
   - Validates token accounting integration
   - Tests guideline triggering mechanisms

2. **End-to-End System Integration** (`end-to-end-flow.test.ts`)
   - Complete system tests covering all layers
   - Tests data consistency across all components
   - Validates performance under various conditions
   - Tests error handling and recovery mechanisms

3. **Guidelines System Integration** (`guidelines-flow.test.ts`)
   - Tests guideline triggering and execution
   - Validates protocol-based signal resolution
   - Tests enable/disable functionality
   - Verifies dependency management

4. **Token Accounting Integration** (`token-accounting.test.ts`)
   - Tests token usage tracking across all layers
   - Validates limit enforcement and alerting
   - Tests cost calculation and reporting
   - Verifies persistence of token data

5. **Performance and Scalability** (`performance.test.ts`)
   - Tests system performance under load
   - Validates concurrent processing capabilities
   - Tests memory usage and resource management
   - Measures response times and throughput

## 🚀 **Running Tests**

### Quick Start

```bash
# Run all integration tests with coverage
npm run test:integration

# Run tests with verbose output
npm run test:integration -- --verbose

# Run specific test pattern
npm run test:integration -- --pattern "scanner"
```

### Using the Test Runner

```bash
# Run with the custom test runner
node tests/integration/test-runner.js

# Run with coverage
node tests/integration/test-runner.js --coverage

# Run specific test suites
node tests/integration/test-runner.js --pattern "end-to-end"

# Run with custom timeout
node tests/integration/test-runner.js --timeout 60000
```

### Individual Test Suites

```bash
# Run specific test file
npx jest tests/integration/scanner-inspector-flow.test.ts

# Run with coverage
npx jest tests/integration/scanner-inspector-flow.test.ts --coverage

# Run in verbose mode
npx jest tests/integration/scanner-inspector-flow.test.ts --verbose
```

## 📊 **Test Coverage**

Integration tests cover:

- ✅ **Signal Processing Pipeline**: Complete flow from detection to payload generation
- ✅ **Cross-Layer Communication**: Event system and data consistency
- ✅ **Guideline Integration**: Protocol-based signal resolution
- ✅ **Token Accounting**: Usage tracking and limit enforcement
- ✅ **Storage Persistence**: Data consistency and recovery
- ✅ **Error Handling**: Graceful failure recovery
- ✅ **Performance**: System behavior under load
- ✅ **Configuration**: Runtime configuration changes

## 🔧 **Test Environment Setup**

### Prerequisites

1. **Node.js 20+** with npm
2. **Jest** testing framework
3. **Test workspace** for temporary files
4. **Git repository** (optional for git-related tests)

### Environment Variables

- `NODE_ENV=test` - Sets test environment
- `INTEGRATION_TEST=true` - Enables integration test mode
- `DEBUG_MODE=true` - Enables verbose logging
- `TEST_TIMEOUT=30000` - Custom timeout in milliseconds

### Test Data

Tests create temporary files and directories in `tests/temp/`:
- Test worktrees for file monitoring
- Sample PRP files for signal detection
- Configuration files for various scenarios
- Mock data for performance testing

## 📋 **Test Scenarios**

### Signal Processing Flow

1. **Basic Signal Detection**
   - Scanner detects signals in PRP files
   - Signals are forwarded to Inspector
   - Inspector classifies and processes signals
   - Results are stored in persistent storage

2. **Multiple Signal Types**
   - Tests different signal patterns ([At], [Bb], [Ur], etc.)
   - Validates classification accuracy
   - Tests priority handling
   - Verifies token usage tracking

3. **Concurrent Processing**
   - Multiple signals processed simultaneously
   - Tests queue management
   - Validates resource allocation
   - Measures performance under load

### Guidelines Integration

1. **Guideline Triggering**
   - Signals trigger appropriate guidelines
   - Validates enable/disable functionality
   - Tests dependency resolution
   - Verifies protocol execution

2. **Custom Guidelines**
   - Tests registration of custom guidelines
   - Validates prompt customization
   - Tests tool integration
   - Verifies result handling

### System Reliability

1. **Error Handling**
   - Component failures don't crash system
   - Graceful degradation
   - Recovery mechanisms
   - Error reporting and logging

2. **Data Persistence**
   - Results survive system restarts
   - Data consistency verification
   - Storage system resilience
   - Backup and restore functionality

## 📈 **Performance Metrics**

Tests measure and validate:

- **Response Times**: Signal processing < 5 seconds
- **Throughput**: Handle 10+ concurrent signals
- **Memory Usage**: < 512MB for normal operation
- **Token Efficiency**: Optimal token usage for classification
- **Success Rate**: > 95% successful processing
- **Coverage**: > 80% code coverage for integration paths

## 🐛 **Troubleshooting**

### Common Issues

1. **Test Timeouts**
   - Increase timeout: `--timeout 60000`
   - Check system resources
   - Verify test environment setup

2. **File Permission Errors**
   - Ensure test directory permissions
   - Check antivirus interference
   - Verify workspace accessibility

3. **Memory Issues**
   - Increase Node.js memory limit: `--max-old-space-size=4096`
   - Check for memory leaks in tests
   - Monitor system resources

4. **Port Conflicts**
   - Tests use random ports when possible
   - Kill lingering processes
   - Check network configuration

### Debug Mode

```bash
# Run tests with debug logging
DEBUG=integration:* npm run test:integration

# Run specific test with debugging
DEBUG=integration:* npx jest tests/integration/scanner-inspector-flow.test.ts

# Enable all debug logging
DEBUG=* npm run test:integration
```

## 📝 **Adding New Tests**

### Test File Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Scanner } from '../../src/scanner/scanner';
import { Inspector } from '../../src/inspector/inspector';

describe('New Integration Test', () => {
  let scanner: Scanner;
  let inspector: Inspector;

  beforeEach(async () => {
    // Setup test environment
  });

  afterEach(async () => {
    // Cleanup test environment
  });

  it('should test new functionality', async () => {
    // Test implementation
  });
});
```

### Best Practices

1. **Isolation**: Tests should not interfere with each other
2. **Cleanup**: Always cleanup temporary files and resources
3. **Time Management**: Use appropriate timeouts and async handling
4. **Error Handling**: Test both success and failure scenarios
5. **Assertions**: Be specific about expected outcomes
6. **Documentation**: Explain what each test validates

## 📊 **Reporting**

Test results include:

- **Executive Summary**: Overall pass/fail status
- **Performance Metrics**: Response times and throughput
- **Coverage Report**: Code coverage percentage
- **Error Details**: Failure reasons and stack traces
- **Recommendations**: Areas for improvement

Results are saved to:
- Console output (real-time)
- JSON report file (`test-results-*.json`)
- Coverage HTML report (`coverage/html-report/`)

---

*For more information about the testing approach or to contribute new tests, please refer to the main project documentation.*