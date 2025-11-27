# PRP Comprehensive Test Suite

## Overview

This test suite provides comprehensive end-to-end testing for the PRP (Product Requirement Prompts) CLI tool, covering all 4 init journeys, CLI command integration, performance benchmarking, and parallel execution optimization.

## Test Structure

```
tests/
├── helpers/                    # Test utilities and frameworks
│   ├── cli-runner.ts          # CLI execution helper
│   ├── project-validator.ts   # Project validation utilities
│   ├── llm-judge.ts           # AI-powered test evaluation
│   ├── parallel-execution.ts  # Parallel test orchestration
│   └── e2e/                    # E2E-specific helpers
│       ├── terminal-runner.ts  # Terminal simulation
│       ├── tui-simulator.ts     # TUI interaction simulation
│       ├── business-validator.ts # Business logic validation
│       └── cli-tools.ts        # CLI testing utilities
├── e2e/                        # End-to-end tests
│   ├── comprehensive-init-journeys.test.ts  # All 4 init journeys
│   ├── init-command.test.ts    # Basic init command tests
│   ├── init-empty-journey.test.ts # Empty directory bootstrap
│   ├── init-exist-journey.test.ts  # Existing project integration
│   ├── init-upgrade-journey.test.ts # PRP upgrade tests
│   └── init-repair-journey.test.ts  # Broken project repair tests
├── integration/               # Integration tests
│   └── cli-commands.test.ts   # CLI command integration tests
├── performance/               # Performance tests
│   └── cli-performance.test.ts # CLI performance benchmarks
└── README.md                  # This file
```

## Test Categories

### 1. End-to-End (E2E) Tests

**Purpose**: Validate complete user workflows and business scenarios

#### 4 Init Journeys

1. **Empty Journey** (`tests/e2e/init-empty-journey.test.ts`)
   - Bootstrap PRP from scratch in empty directory
   - Test all templates (typescript, react, nestjs, fastapi, wikijs, none)
   - Validate TUI (interactive) and CI (automated) modes
   - Business validation of governance and structure

2. **Existing Journey** (`tests/e2e/init-exist-journey.test.ts`)
   - Add PRP to existing codebases (React, Node.js, Python projects)
   - Preserve existing functionality while adding PRP governance
   - Handle different project types and structures

3. **Upgrade Journey** (`tests/e2e/comprehensive-init-journeys.test.ts`)
   - Upgrade older PRP projects to latest version
   - Handle configuration migration and structure updates
   - Maintain backward compatibility

4. **Repair Journey** (`tests/e2e/comprehensive-init-journeys.test.ts`)
   - Fix broken/corrupted PRP projects
   - Handle missing files, corrupted configurations
   - Restore project to working state

#### Comprehensive Journey Tests (`tests/e2e/comprehensive-init-journeys.test.ts`)
- Complete validation of all 4 journeys
- Cross-journey consistency checks
- Performance limits enforcement
- LLM Judge evaluation for business logic validation

### 2. Integration Tests

**Purpose**: Test CLI command integration and system interactions

#### CLI Commands (`tests/integration/cli-commands.test.ts`)
- `init` command with all flags and options
- `orchestrator` command startup and configuration
- `config` command (show, validate)
- `status` command with different project states
- `build` command execution
- Error handling and edge cases
- Cross-platform compatibility
- Command chaining and workflows

### 3. Performance Tests

**Purpose**: Benchmark performance and detect regressions

#### CLI Performance (`tests/performance/cli-performance.test.ts`)
- CLI startup time measurement
- Memory usage tracking and leak detection
- Command execution benchmarking
- Resource utilization monitoring
- Performance regression detection
- Stress testing with high-frequency operations
- Baseline establishment and comparison

### 4. Parallel Execution Framework

**Purpose**: Optimize test execution with parallel processing

#### Framework Components (`tests/helpers/parallel-execution.ts`)
- Intelligent test scheduling and dependency resolution
- Resource management and isolation
- Load balancing across test workers
- Comprehensive cleanup and resource monitoring
- Detailed reporting and metrics

## Running Tests

### Quick Start

```bash
# Run all tests with optimal parallel configuration
npm run test

# Run specific test categories
npm run test:e2e          # End-to-end tests only
npm run test:integration  # Integration tests only
npm run test:performance  # Performance tests only

# Run with coverage
npm run test:coverage

# Run with verbose output
npm run test -- --verbose
```

### Advanced Execution

```bash
# Use enhanced parallel configuration
npx jest --config jest.parallel.config.js

# Run specific test suites
npx jest tests/e2e/comprehensive-init-journeys.test.ts
npx jest tests/integration/cli-commands.test.ts
npx jest tests/performance/cli-performance.test.ts

# Run with custom worker configuration
TEST_WORKERS=4 npm run test

# Run with performance monitoring enabled
ENABLE_PERFORMANCE_MONITORING=true npm run test

# Run with test result archiving
ARCHIVE_TEST_RESULTS=true npm run test
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `test` | Environment for test execution |
| `PRP_TEST_MODE` | `true` | Enable test-specific features |
| `AI_PROVIDER` | `anthropic` | LLM provider for test evaluation |
| `ANTHROPIC_API_KEY` | - | API key for Claude evaluation |
| `OPENAI_API_KEY` | - | API key for GPT evaluation |
| `TEST_WORKERS` | `auto` | Number of test workers |
| `ENABLE_PERFORMANCE_MONITORING` | `false` | Enable performance metrics |
| `ARCHIVE_TEST_RESULTS` | `false` | Archive test results |
| `CLEANUP_TEST_DB` | `false` | Clean up test databases |

## Test Configuration

### Jest Configuration (`jest.parallel.config.js`)

**Optimized Settings:**
- **Max Workers**: Automatically calculated based on CPU cores and available memory
- **Test Timeout**: 120 seconds (configurable per test type)
- **Resource Monitoring**: Memory usage tracking and leak detection
- **Parallel Execution**: Intelligent test scheduling and dependency resolution
- **Comprehensive Reporting**: JUnit, HTML, and custom JSON reports

**Project Configuration:**
- **Unit Tests**: Fast, isolated, maximum concurrency
- **Integration Tests**: Moderate concurrency, longer timeouts
- **E2E Tests**: Limited concurrency, longest timeouts
- **Performance Tests**: Single worker for accurate measurement

### Parallel Execution Features

**Resource Management:**
- Memory usage monitoring per worker
- CPU load balancing
- Temporary directory isolation
- Automatic cleanup of test resources

**Test Scheduling:**
- Priority-based execution (unit → integration → E2E → performance)
- Dependency resolution between test suites
- Load balancing strategies (least-memory, least-cpu, round-robin)
- Intelligent retry mechanisms

**Isolation and Cleanup:**
- Separate temp directories for each test
- Worker-specific resource limits
- Comprehensive cleanup on completion/failure
- Process and thread management

## Test Helpers and Utilities

### CLI Runner (`tests/helpers/cli-runner.ts`)

Advanced CLI execution framework with:
- **Performance Monitoring**: Startup time, memory usage, duration tracking
- **Session Recording**: Complete test session logs for debugging
- **Input Simulation**: Automated keyboard and input handling
- **Error Handling**: Comprehensive error capture and reporting
- **Process Management**: Proper cleanup and resource management

**Usage Example:**
```typescript
import { CLIRunner } from '../helpers/cli-runner';

const cli = new CLIRunner();

// Simple command execution
const result = await cli.run(['--version'], {
  cwd: testDir,
  timeout: 5000,
  measurePerformance: true
});

// Complex journey execution
const journeyResult = await cli.runFullUserJourney({
  projectDir: testDir,
  projectName: 'test-project',
  template: 'typescript',
  captureSession: true
});
```

### Project Validator (`tests/helpers/project-validator.ts`)

Comprehensive project validation with:
- **Template-specific validation**: TypeScript, React, NestJS, FastAPI, Wiki.js
- **PRP compliance checks**: .prprc, AGENTS.md, PRPs directory structure
- **Business logic validation**: Governance, signals, agent configuration
- **Build verification**: Project buildability testing

**Usage Example:**
```typescript
import { ProjectValidator } from '../helpers/project-validator';

const validator = new ProjectValidator(projectDir);

// Validate complete project
const validation = validator.validateCompleteProject();
expect(validation.valid).toBe(true);

// Validate specific template
const reactValidation = validator.validateReact();
expect(reactValidation.valid).toBe(true);

// Validate PRP compliance
const compliance = validator.validatePRPCompliance('typescript');
expect(compliance.structureValid).toBe(true);
```

### LLM Judge (`tests/e2e/helpers/llm-judge.ts`)

AI-powered test evaluation with:
- **Multi-provider support**: OpenAI GPT, Anthropic Claude, Google Gemini
- **Comprehensive scoring**: Code quality, functionality, performance, documentation
- **Business logic validation**: Real-world scenario testing
- **Regression detection**: Performance and quality trend analysis

**Usage Example:**
```typescript
import { judgeOutput, JudgeInput } from '../helpers/llm-judge';

const input: JudgeInput = {
  action: 'Initialize TypeScript project',
  input: 'Project name: test-project',
  output: result.output,
  context: 'E2E test validation',
  expectations: ['Complete structure created', 'Valid configuration'],
  evaluationType: 'tui',
  sourceCode: validator.getProjectSourceCode()
};

const judgment = await judgeOutput(input);
expect(judgment.success).toBe(true);
expect(judgment.overallScore).toBeGreaterThan(70);
```

## Test Results and Reporting

### Output Directory Structure

```
test-results/
├── final-report.json          # Comprehensive test results
├── test-insights.json         # AI-generated insights
├── test-summary.json          # Executive summary
├── test-report.md             # Human-readable report
├── junit.xml                  # CI/CD integration
├── report.html                # Visual report
├── performance-summary.json   # Performance metrics
└── test-results-{timestamp}.tar.gz  # Archived results
```

### Report Types

1. **Executive Summary** (`test-summary.json`)
   - Pass/fail statistics
   - Performance metrics
   - Critical issues and recommendations

2. **Technical Report** (`final-report.json`)
   - Detailed test results
   - Performance benchmarks
   - Resource utilization data
   - Error details and stack traces

3. **Visual Report** (`report.html`)
   - Interactive charts and graphs
   - Test execution timeline
   - Performance trends
   - Filterable test results

4. **CI/CD Integration** (`junit.xml`)
   - Standard JUnit format
   - Integration with GitHub Actions, GitLab CI, etc.
   - Test result parsing and reporting

### Performance Metrics

**CLI Performance:**
- Startup time (target: < 2 seconds)
- Memory usage (target: < 50MB)
- Command execution time
- Resource utilization

**Test Execution:**
- Parallel efficiency metrics
- Worker utilization
- Test completion rates
- Resource cleanup success

## Best Practices

### Test Development

1. **Isolation**: Each test should be completely isolated with its own temp directory
2. **Cleanup**: Always clean up resources, even on test failure
3. **Performance**: Set appropriate timeouts and avoid unnecessary delays
4. **Validation**: Use comprehensive validation, not just success/failure checks
5. **Documentation**: Document test purpose, expected behavior, and edge cases

### Test Execution

1. **Environment**: Use consistent test environments with proper cleanup
2. **Resources**: Monitor resource usage to avoid test interference
3. **Parallel**: Use parallel execution for faster test cycles
4. **Coverage**: Maintain good test coverage across all components
5. **Trends**: Track test performance trends over time

### CI/CD Integration

1. **Reporting**: Use standardized report formats for CI integration
2. **Artifacts**: Archive test results for historical analysis
3. **Failures**: Implement proper failure handling and notification
4. **Performance**: Monitor CI test execution performance
5. **Resources**: Optimize CI resource usage and costs

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Increase timeout values for complex tests
   - Check for infinite loops or blocking operations
   - Verify system resources are adequate

2. **Memory Leaks**
   - Use memory monitoring in tests
   - Ensure proper cleanup of resources
   - Check for unclosed file handles or network connections

3. **Parallel Test Conflicts**
   - Verify test isolation
   - Check for shared resource usage
   - Use proper dependency resolution

4. **CLI Build Issues**
   - Ensure CLI is built before running tests
   - Check for compilation errors
   - Verify dependencies are installed

### Debug Mode

Enable debug mode for detailed troubleshooting:

```bash
# Enable verbose output
DEBUG=prp:* npm run test

# Enable performance monitoring
ENABLE_PERFORMANCE_MONITORING=true npm run test

# Run single test for debugging
npx jest tests/e2e/init-command.test.ts --verbose

# Run with debugging breakpoints
node --inspect-brk node_modules/.bin/jest tests/e2e/init-command.test.ts
```

## Contributing

### Adding New Tests

1. **Choose Test Type**: Unit, Integration, E2E, or Performance
2. **Follow Patterns**: Use existing test patterns and helpers
3. **Add Documentation**: Document test purpose and expected behavior
4. **Validate Coverage**: Ensure test coverage meets requirements
5. **Update Configuration**: Add new test patterns to Jest config if needed

### Test Maintenance

1. **Regular Updates**: Keep tests updated with feature changes
2. **Performance Monitoring**: Track test execution performance
3. **Flaky Test Detection**: Identify and fix unstable tests
4. **Documentation**: Keep documentation current with test changes
5. **Refactoring**: Refactor tests for better maintainability

## Future Enhancements

### Planned Features

1. **Visual Testing**: Automated screenshot comparison
2. **Mobile Testing**: CLI testing on mobile environments
3. **Distributed Testing**: Multi-machine test execution
4. **AI Test Generation**: AI-powered test case generation
5. **Real-time Monitoring**: Live test execution dashboard

### Performance Optimizations

1. **Smart Caching**: Intelligent test result caching
2. **Selective Execution**: Run only affected tests
3. **Resource Pooling**: Reuse test resources efficiently
4. **Load Balancing**: Advanced test load balancing
5. **Predictive Analytics**: ML-based test failure prediction

---

## Support

For questions, issues, or contributions:
- **Documentation**: Refer to inline code documentation
- **Issues**: Create GitHub issues with detailed reproduction steps
- **Contributions**: Follow established patterns and testing guidelines
- **Discussions**: Use GitHub discussions for questions and ideas

This comprehensive test suite ensures the reliability, performance, and quality of the PRP CLI tool across all user scenarios and environments.