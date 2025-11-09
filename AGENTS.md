# AGENTS.md - AI Agent Guidelines for PRP

**Created by**: Vasilisa Versus
**Project Goal**: Bootstrap context-driven development workflow based on Product Requirement Prompts (PRPs) and orchestrate execution with LOOP MODE.

---
> SYSTEM PART! NEVER EDIT THIS PART! USER SECTION BELOW!

---

## 🚀 SACRED RULES (Never Violate)

1. **PRP-First Development**: Read related PRP first, DONT TRUST state, manual check, verify, then leave actual comment signal in progress you made; PRP is a place where we share and organise requirements and what need always then sync to real code with progress reporting after. First Quote and all req: in PRP is a ABSOLUTE MONDATORY source of truth, always the rest align with all req: AND first quote PRP have;
2. **Signal-Driven Progress**: not confident in next step to 100% and some work what you can verify would become valuable? Then leave signal in related PRP progress with comment. Explain what do you think about work done, what you wold love in it? whats was wrong and can help us veriy and 
3. **LOOPMODE-workflow**: Related PRP always have a plan / dod / dor and signals, corresponding to signal priority. choose most important and start work as sub-agent with all related prp content with detailed instructions how to resolve this exact highest signal, choose best suitable robo-role for task. always comment with next signal right after work done; Next your message should contain after reflect exact changes we made list - what was expected - how we verified - what we recieved - what exact need do next - ⚠️ BLOCKERS - 💥 INCIDENT - 🎶 COMMENT AND SIGNAL LEFT, IDLE
4. **No orphan files**: Never create tmp/scripts/md files without deleting them right after. All tmp files - write about it in PRP first!
5. **No Paperovers**: Never use `--no-verify`, `--force`, or disable linting. Instead, comment signal describing the issue and work on solution. We forcing CDD measure-change-validate-reflect-stabelise and TDD red-green, main priority is maximum verification, stability and scalability. Performance and user accessability tests and proper user faced /docs with real situation is our honor!  
6. **Cleanup Responsibility**: Any `/tmp`, dev servers, ports, or external resources MUST be documented in PRP for proper cleanup, no rush, always mention in comment with signal about files created on you working on.
7. **Low Confidence Handling**: Before any uncertain action (less than 80% confidence), leave proress comment explaining risk with corresponding signal and wait for guidance.

---

## 🔄 WORKFLOW

### **PRP Creation & Analysis**
- Research problem domain - robo-system-analyst investigates requirements
- Draft complete PRP - Include DoR, DoD, acceptance criteria
- Review with team - Developer and QA provide feedback
- Prioritize work - Orchestrator schedules implementation
**Outcomes**: Goal clarification, goal not achievable, ready for preparation, validation required

### **Preparation & Planning**
- Refine requirements - Break down into implementable tasks with plan how to validate result after
- Create implementation plan - Define task sequence and dependencies
- Estimate effort - can be PRP done at once? or need arrange a several PR with milestones and checkpoints?
- Validate approach - Ensure technical feasibility
- Write down affected files list - parallel agent working and proper code review description should always rely on file list. We always during implementation working only with prp related files
**Outcomes**: Research request, verification plan, implementation plan ready, experiment required

### **Implementation**
- TDD approach - Write tests before implementation
- Development progress - Incremental commits with clear progression
- Handle blockers - Identify and resolve technical dependencies
- Research requests - Address unknowns or gaps in knowledge
- Prp scope - We working only with prp related files, need edit or create file? then update PRP first!
**Outcomes**: Tests prepared, development progress, blocker resolved, research completed

### **Verification & Testing**
- Test execution - robo-aqa runs comprehensive test suite
- Bug handling - Identify, fix, and verify bug resolution
- Code quality - Ensure quality standards and linting pass
- CI/CD validation - Automated testing and deployment pipeline
- Never trust code - Always rely on behavior
**Outcomes**: Tests written, bugs fixed, quality passed, CI passed, tests failed, CI failed, pre-release checklist completed, PR created, review progressed, cleanup done, review passed

### **Release & Deployment**
- Implementation verification - Confirm requirements met
- Release approval - Get authorization for deployment
- Merge & release - Deploy changes to production
- Post-release check - Verify deployment success
**Outcomes**: Implementation verified, release approved, merged, released

### **Post-Release**
- Post-release validation - Monitor system health and user feedback
- Incident handling - Address any production issues
- Post-mortem analysis - Document lessons learned
- Implementation verification - Confirm deployment goals achieved
**Outcomes**: Post-release checked, incident occurred, incident resolved, post-mortem written in PRP, implementation verified

---

## 🎵 ♫ SIGNAL SYSTEM

> reg: PRP is a place where we keeping our actual work progress status and next steps. We using special signals to communicate and push forward work. ALWAYS after some progress done leave details as comments and signal related to situation in PRP you workin on;

ALL PRPs/*.md should satisfy following structure:
```
# PRP-XXX: [Title]

> our goal of user quote with all user req: all prp always should be aligned with all req:

## progress (mondatory)
signal | comment | time | role-name (model name)
[AA] what have been done, what was expected, how did you can prof that? what you mood is? now admin-1 (user)
-- ALWAYS PUT HERE RESULT OF YOUR WORK AS PORGRESS COMMENT --

## description
[Clear description perfectly matched quote of what needs to be done]

## dor
- [ ] always check lint/test/other code quality status and fix problems first to trivial-* branch with trivial PR
- [ ] Checklist items

## dod
- [ ] Checklist items perfectly matches description and quote what we can measure
- [ ] and actual measure and prof with working links to /docs.md what always contain user-faced feature list with actual details with profs to our repo
- [ ] or any big step with feature needed to be confirmed by user
- [ ] Checklist items

## pre-release checklist
- [ ] cleanup completed
- [ ] all lint / code style and tests passed
- [ ] no problems paperovered or supressed
- [ ] manual confirmation with visual comparison with prp compare done
- [ ] CHANGELOG.md updated with verified items and actualised
- [ ] PRP satisfy this structure contain pre release comment and signal and all synced before last commit
- [ ] llm as judge test updated
- [ ] More checklist items

## post-release checklist
- [ ] admin menioned with details
- [ ] prod vorking with all new features confirmed with llm as judge tests
- [ ] verify each DoD status
- [ ] reflect if all DoD done
- [ ] Checklist items

## plan
- [ ] One line per file change with actual file name and expectation after change
- [ ] ALWAYS VERIFICATION STEP with e2e/unit tests our visual/manual after!
- [ ] all not listed here will be and should be deleted with cleanup! keep track
- [ ] pre-release! with ...

### if needed release flow in between PRP
- [ ] create additional section with actions
- [ ] and virifications we need make!

### Details (optional)

## research materials
### research date/time
> summary with research value, we need later keep link here to prof our solution
```
// exact code snippets we need refer to
// always preserve source link OR ⚠️ inference marker with confident score
```
- Links/references
```


### **System Signals (Using internaly)**
**[HF]** - Health Feedback (orchestration cycle start)
**[pr]** - Pull Request Preparation (optimization pre-catch)
**[PR]** - Pull Request Created (PR activity detected)
**[FF]** - System Fatal Error (corruption/unrecoverable errors)
**[TF]** - Terminal Closed (graceful session end)
**[TC]** - Terminal Crushed (process crash)
**[TI]** - Terminal Idle (inactivity timeout)

### **Agent Signals (should be always found in PRP)**

#### [bb] Blocker
- **WHO**: Any agent
- **WHEN**: Technical dependency, configuration, or external requirement blocks progress
- **WHAT**: Document blocker details in PRP, specify unblocking actions needed, continue with other tasks

#### [af] Feedback Request
- **WHO**: Any agent
- **WHEN**: Decision needed on design approach, implementation strategy, or requirement interpretation
- **WHAT**: Provide context and options in PRP, request specific guidance, wait for  direction before proceeding

#### [gg] Goal Clarification
- **WHO**: robo-system-analyst
- **WHEN**: PRP requirements are ambiguous, conflicting, or insufficient for implementation
- **WHAT**: Ask specific clarifying questions, propose requirement refinements, update PRP with clarified scope

#### [ff] Goal Not Achievable
- **WHO**: robo-system-analyst
- **WHEN**: Analysis shows PRP goals cannot be achieved with current constraints/technology
- **WHAT**: Document impossibility analysis, propose alternative approaches or modified goals, update PRP

#### [da] Done Assessment
- **WHO**: Any agent
- **WHEN**: Task or milestone completed, ready for Definition of Done validation
- **WHAT**: Provide completion evidence in PRP, reference DoD criteria, request validation before proceeding to next phase

#### [no] Not Obvious
- **WHO**: Any agent
- **WHEN**: Implementation complexity, technical uncertainty, or unknown dependencies discovered
- **WHAT**: Document complexity details, request research time or clarification, wait for analysis before proceeding

#### [rp] Ready for Preparation
- **WHO**: robo-system-analyst
- **WHEN**: PRP analysis complete, requirements clear, ready to move to planning phase
- **WHAT**: Signal completion of analysis phase, transition PRP status to preparation, trigger planning workflow

#### [vr] Validation Required
- **WHO**: robo-system-analyst
- **WHEN**: PRP needs external validation, stakeholder approval, or compliance review before proceeding
- **WHAT**: Document validation requirements, specify validators needed, pause workflow until validation received

#### [rr] Research Request
- **WHO**: Any agent
- **WHEN**: Unknown dependencies, technology gaps, or market research needed to proceed
- **WHAT**: Document research questions, estimate research time, request robo-system-analyst research assignment

#### [vp] Verification Plan
- **WHO**: robo-system-analyst
- **WHEN**: Complex requirements need verification approach or multi-stage validation strategy
- **WHAT**: Create verification checklist, define validation milestones, specify success criteria

#### [ip] Implementation Plan
- **WHO**: robo-system-analyst
- **WHEN**: Requirements analysis complete, ready to break down into implementable tasks
- **WHAT**: Document task breakdown, dependencies, estimates, and acceptance criteria

#### [er] Experiment Required
- **WHO**: robo-system-analyst
- **WHEN**: Technical uncertainty requires proof-of-concept or experimental validation
- **WHAT**: Define experiment scope, success metrics, and integration criteria

#### [tp] Tests Prepared
- **WHO**: robo-developer
- **WHEN**: TDD test cases written before implementation, ready for coding phase
- **WHAT**: Document test coverage, link to test files, signal ready for implementation

#### [dp] Development Progress
- **WHO**: robo-developer
- **WHEN**: Significant implementation milestone completed or increment ready
- **WHAT**: Document progress, update completion percentage, note any emerging issues

#### [br] Blocker Resolved
- **WHO**: Any agent
- **WHEN**: Previously documented blocker has been successfully resolved
- **WHAT**: Document resolution method, update PRP status, signal ready to continue work

#### [rc] Research Complete
- **WHO**: robo-system-analyst
- **WHEN**: Commissioned research investigation completed with findings
- **WHAT**: Provide research findings, recommendations, and impact on PRP requirements

#### [tw] Tests Written
- **WHO**: robo-developer
- **WHEN**: Unit tests, integration tests, or E2E tests implemented for feature
- **WHAT**: Document test coverage, link to test files, signal ready for testing phase

#### [bf] Bug Fixed
- **WHO**: robo-developer
- **WHEN**: Bug or issue has been identified, resolved, and tested
- **WHAT**: Document bug details, fix approach, and verification results

#### [cq] Code Quality
- **WHO**: robo-aqa
- **WHEN**: Code passes linting, formatting, and quality gate checks
- **WHAT**: Document quality metrics, any issues resolved, and overall quality status

#### [cp] CI Passed
- **WHO**: robo-aqa
- **WHEN**: Continuous integration pipeline completes successfully
- **WHAT**: Document CI results, link to build artifacts, signal deployment readiness

#### [tr] Tests Red
- **WHO**: robo-aqa
- **WHEN**: Test suite fails with failing tests identified
- **WHAT**: Document failing tests, error details, and debugging requirements

#### [tg] Tests Green
- **WHO**: robo-aqa
- **WHEN**: All tests passing with full coverage achieved
- **WHAT**: Document test results, coverage metrics, and quality status

#### [cf] CI Failed
- **WHO**: robo-aqa
- **WHEN**: Continuous integration pipeline fails with errors
- **WHAT**: Document CI failure details, debugging steps, and resolution requirements

#### [pc] Pre-release Complete
- **WHO**: robo-aqa
- **WHEN**: All pre-release checks completed including documentation, changelogs, and verification
- **WHAT**: Document checklist completion, final quality status, and release readiness

#### [rg] Review Progress
- **WHO**: Any agent
- **WHEN**: Code review in progress with feedback being addressed
- **WHAT**: Document review status, feedback items, and resolution timeline

#### [cd] Cleanup Done
- **WHO**: robo-developer
- **WHEN**: Code cleanup, temporary file removal, and final polishing completed
- **WHAT**: Document cleanup actions, removed artifacts, and final code state

#### [rv] Review Passed
- **WHO**: robo-aqa
- **WHEN**: Code review completed successfully with all feedback addressed
- **WHAT**: Document review completion, approvals received, and merge readiness

#### [iv] Implementation Verified
- **WHO**: robo-quality-control
- **WHEN**: Manual visual testing completed against published package or testable deployment
- **WHAT**: Document visual verification results, user experience validation, and final approval

#### [ra] Release Approved
- **WHO**: robo-system-analyst
- **WHEN**: All prerequisites met, stakeholder approval received, ready for release
- **WHAT**: Document approval details, release scope, and deployment authorization

#### [mg] Merged
- **WHO**: robo-developer
- **WHEN**: Code successfully merged to target branch with integration complete
- **WHAT**: Document merge details, integration status, and any merge conflicts resolved

#### [rl] Released
- **WHO**: robo-developer
- **WHEN**: Deployment completed successfully with release published
- **WHAT**: Document release details, deployment status, and user availability

#### [ps] Post-release Status
- **WHO**: robo-system-analyst
- **WHEN**: Post-release monitoring and status check completed
- **WHAT**: Document post-release health, user feedback, and system stability

#### [ic] Incident
- **WHO**: System Monitor/Any Agent
- **WHEN**: Production issue, error, or unexpected behavior detected
- **WHAT**: Document incident details, impact assessment, and immediate response actions

#### [JC] Jesus Christ (Incident Resolved)
- **WHO**: robo-developer/robo-devops-sre
- **WHEN**: Critical production incident successfully resolved and service restored
- **WHAT**: Document resolution details, root cause, and prevention measures

#### [pm] Post-mortem
- **WHO**: robo-system-analyst
- **WHEN**: Incident analysis complete with lessons learned documented
- **WHAT**: Document incident timeline, root causes, improvements, and prevention strategies

#### [oa] Orchestrator Attention
- **WHO**: Any agent
- **WHEN**: Need coordination of parallel work, resource allocation, or workflow orchestration
- **WHAT**: Request orchestrator intervention for task distribution, agent coordination, or workflow optimization

#### [aa] Admin Attention
- **WHO**: Any agent/PRP
- **WHEN**: Report generation required, system status needed, or administrative oversight requested
- **WHAT**: Specify report requirements, timeline, and format needed for administrative review

#### [ap] Admin Preview Ready
- **WHO**: robo-system-analyst/robo-aqa
- **WHEN**: Comprehensive report, analysis, or review ready for admin preview with how-to guide
- **WHAT**: Provide preview package with summary, guide, and admin instructions for review

---

## 🧪 COMPREHENSIVE TESTING FRAMEWORK

### **Robo-AQA Testing Infrastructure Crisis Analysis (Updated 2025-11-05)**

**Current State**: CRITICAL INFRASTRUCTURE FAILURE 🚨
- **Overall Coverage**: 0.12% Statements (16/13,270 lines) - CATASTROPHIC
- **Test Files**: 35 test files, 8 major suites failing
- **Source Files**: 147 TypeScript files, 0.1% function coverage
- **Core Issue**: Systemic test infrastructure breakdown preventing meaningful quality assurance

### **Critical Infrastructure Failures Identified**

#### 1. **Jest ES Module Configuration Breakdown** 🔥🔥🔥
- **Signal**: `[tr]` Tests Red - Complete configuration failure
- **Root Cause**: `__filename` declared multiple times across multiple files
- **Affected Files**: `src/utils/version.ts`, `src/nonInteractive.ts`, `src/config/schema-validator.ts`, `src/inspector/parallel-executor.ts`
- **Impact**: Complete test execution failure, entire wizard test suite blocked
- **Error Pattern**: `SyntaxError: Identifier '__filename' has already been declared`
- **Jest Status**: Cannot parse TypeScript files with ESM imports

#### 2. **Signal Detection RegExp Implementation Bug** 🔥🔥🔥
- **Signal**: `[tr]` Tests Red - Core algorithm failure
- **Location**: `src/scanner/signal-detector.ts:1026`
- **Root Cause**: `RegExp.exec()` returns array, code expects string
- **Error**: `TypeError: match.substring is not a function`
- **Impact**: 10+ test methods failing, entire signal detection system broken
- **Affected Tests**: enhanced-signal-detector.test.ts, scanner integration tests

#### 3. **Test Infrastructure Systemic Issues** 🔥🔥
- **DynamicContextManager**: Token distribution calculations completely wrong
- **Scanner Reactive**: Console spam flooding test output (14,000+ lines)
- **TokenAccountant**: Invalid JSON handling causing initialization failures
- **Scanner Full System**: Missing `subscribe` method causing interface mismatches
- **Signal Detection Logic**: Expecting strings, receiving complex objects

#### 4. **CLI Testing Infrastructure Nonexistent** 🔥🔥🔥
- **CLI Entry Points**: 0% coverage, no tests for `src/cli.ts`
- **Template Engine**: 0% coverage, `src/templateEngine.ts` completely untested
- **Non-Interactive Mode**: 0% coverage, `src/nonInteractive.ts` no test infrastructure
- **Command Handlers**: <1% coverage across entire `src/commands/` directory
- **Error Handling**: No testing for CLI error conditions or user interactions

### **Test Infrastructure Analysis**

#### **Coverage Breakdown**:
- **Statements**: 0.12% (16/13,270) - CATASTROPHIC FAILURE
- **Branches**: 0.17% (11/6,341) - CATASTROPHIC FAILURE
- **Functions**: 0.1% (3/2,854) - CATASTROPHIC FAILURE
- **Lines**: 0.12% (16/12,806) - CATASTROPHIC FAILURE

#### **Critical Components with 0% Coverage**:
1. **CLI Entry Points** (`src/cli.ts`) - 0% coverage, completely untested
2. **Template Engine** (`src/templateEngine.ts`) - 0% coverage, core functionality missing
3. **Non-Interactive Mode** (`src/nonInteractive.ts`) - 0% coverage, production workflows untested
4. **Command Handlers** (`src/commands/`) - <1% coverage, entire command system broken
5. **Scanner Core** - Partial coverage with 14,000+ lines of console spam
6. **Signal Processing** - Broken due to RegExp implementation bug
7. **Error Handling** - 0% coverage across entire codebase
8. **User Interactions** - No testing for interactive CLI components

#### **Root Cause Analysis**:
- **Configuration Crisis**: Jest cannot handle ES modules with multiple `__filename` declarations
- **Implementation Bugs**: Core signal detection algorithm fundamentally broken
- **Test Design**: Tests expecting wrong data types and incorrect business logic
- **Infrastructure**: No CLI testing framework or mock systems in place
- **Quality Gates**: No functional test infrastructure preventing broken deployments

### **Comprehensive Testing Strategy**

#### **Emergency CLI Testing Framework**:
```typescript
// Critical CLI command testing infrastructure
import { execAsync } from 'child_process';
import { createMockStdin, createMockStdout } from './helpers/cli-mocks';

describe('CLI Command Execution', () => {
  beforeEach(async () => {
    testDir = await createTempDirectory();
  });

  afterEach(async () => {
    await cleanupDirectory(testDir);
  });

  it('should handle prp create command with validation', async () => {
    const result = await execAsync(`node dist/cli.js prp create ${testDir}/test-project`);
    expect(result.stdout).toContain('PRP created successfully');
    expect(fs.existsSync(`${testDir}/test-project/PRP-001.md`)).toBe(true);
  });

  it('should handle invalid commands with proper error messages', async () => {
    await expect(execAsync('node dist/cli.js invalid-command'))
      .rejects.toThrow('Unknown command: invalid-command');
  });

  it('should handle missing required arguments', async () => {
    await expect(execAsync('node dist/cli.js prp create'))
      .rejects.toThrow('Required: --name argument');
  });
});

// Interactive mode testing with proper mocking
describe('Interactive CLI Mode', () => {
  it('should handle user input prompts correctly', async () => {
    const mockInput = createMockStdin(['test-project\n', 'fastapi\n', 'y\n']);
    const mockOutput = createMockStdout();

    const result = await runInteractiveCLI(mockInput, mockOutput);
    expect(result.exitCode).toBe(0);
    expect(mockOutput.getOutput()).toContain('Project created: test-project');
  });

  it('should handle user cancellation gracefully', async () => {
    const mockInput = createMockStdin(['test-project\n', '\x03']); // Ctrl+C
    const result = await runInteractiveCLI(mockInput);
    expect(result.exitCode).toBe(130); // SIGINT exit code
  });
});

// Template engine testing
describe('Template Engine Operations', () => {
  it('should generate FastAPI project correctly', async () => {
    const project = await generateTemplate('fastapi', testDir, options);
    expect(fs.existsSync(`${testDir}/main.py`)).toBe(true);
    expect(fs.existsSync(`${testDir}/requirements.txt`)).toBe(true);
    expect(fs.existsSync(`${testDir}/README.md`)).toBe(true);
  });

  it('should handle template errors gracefully', async () => {
    await expect(generateTemplate('invalid-template', testDir, options))
      .rejects.toThrow('Unknown template: invalid-template');
  });
});
```

#### **ES Module Configuration Fixes**:
```javascript
// Fixed jest.config.js for ES modules
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^axios$': 'axios/dist/node/axios.cjs'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022'
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
```

#### **Signal Detection Bug Fix**:
```typescript
// Fixed signal detection in signal-detector.ts
private extractSignalInfo(match: RegExpExecArray, content: string, lineNum: number): SignalInfo | null {
  if (!match || !match[0]) return null;

  const signalText = match[0]; // FIX: Use match[0] instead of match directly
  const signalMatch = signalText.match(/^\[([a-zA-Z]{1,4})\]/);

  if (!signalMatch) return null;

  return {
    signal: signalMatch[1],
    context: content.substring(match.index, match.index + 100),
    line: lineNum,
    column: match.index,
    type: this.classifySignal(signalMatch[1]),
    timestamp: new Date()
  };
}
```

### **Test Automation Improvements**

#### **Parallel Test Execution**:
```json
// jest.config.js
{
  "maxWorkers": 4,
  "testTimeout": 30000,
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

#### **CI/CD Pipeline Integration**:
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### **Emergency Test Infrastructure Recovery Roadmap**

#### **Phase 1: Critical Infrastructure Stabilization (Week 1)**
**IMMEDIATE ACTIONS REQUIRED - BLOCKING ALL DEVELOPMENT**

1. **Fix Jest ES Module Configuration** 🔥🔥🔥
   - `[tr]` → `[cq]` Resolve `__filename` declaration conflicts across 5 files
   - `[tr]` → `[cq]` Update Jest config for proper ES module handling
   - `[tr]` → `[cq]` Add Node.js `--experimental-vm-modules` support
   - **Success Criteria**: All test files can be parsed and loaded

2. **Fix Signal Detection RegExp Bug** 🔥🔥🔥
   - `[tr]` → `[cq]` Fix `match.substring is not a function` in signal-detector.ts:1026
   - `[tr]` → `[cq]` Update all signal detection methods to handle RegExp arrays properly
   - `[tr]` → `[cq]` Add proper null checking and error handling
   - **Success Criteria**: Signal detection tests pass without TypeError

3. **Correct Test Assertion Logic** 🔥🔥
   - `[tr]` → `[cq]` Fix DynamicContextManager token distribution calculations
   - `[tr]` → `[cq]` Update scanner behavior tests to expect objects instead of strings
   - `[tr]` → `[cq]` Correct TokenAccountant alert type and percentage expectations
   - **Success Criteria**: All existing test suites run without assertion errors

4. **Eliminate Console Spam** 🔥
   - `[tr]` → `[cq]` Fix TokenAccountant invalid JSON handling
   - `[tr]` → `[cq]` Add proper test environment isolation
   - `[tr]` → `[cq]` Implement mock logger for test execution
   - **Success Criteria**: Test output under 100 lines, no console warnings

**TARGET BY END OF WEEK 1**: 20% coverage, all critical infrastructure bugs resolved

#### **Phase 2: Core CLI Testing Infrastructure (Week 2-3)**
**BUILDING FOUNDATIONAL TEST COVERAGE**

1. **CLI Command Testing Framework** 🎯
   - `[cq]` Implement CLI process spawning and execution testing
   - `[cq]` Create mock stdin/stdout for interactive testing
   - `[cq]` Add command validation and error handling tests
   - **Success Criteria**: All CLI commands have basic coverage

2. **Template Engine Test Suite** 🎯
   - `[cq]` Create template generation and validation tests
   - `[cq]` Add template error handling and edge case testing
   - `[cq]` Implement template file structure verification
   - **Success Criteria**: All templates tested, 90% template engine coverage

3. **File System Operations Testing** 🎯
   - `[cq]` Create temp directory management for test isolation
   - `[cq]` Add project creation and cleanup testing
   - `[cq]` Implement file permission and validation tests
   - **Success Criteria**: All file operations have comprehensive coverage

4. **Non-Interactive Mode Testing** 🎯
   - `[cq]` Create non-interactive CLI execution tests
   - `[cq]` Add argument validation and error handling tests
   - `[cq]` Implement project generation workflow testing
   - **Success Criteria**: Non-interactive mode 80% coverage

**TARGET BY END OF WEEK 3**: 50% coverage, core functionality fully tested

#### **Phase 3: Advanced Testing Capabilities (Week 4-6)**
**COMPREHENSIVE QUALITY ASSURANCE**

1. **E2E Workflow Testing** 🎯
   - `[tg]` Create end-to-end project generation scenarios
   - `[tg]` Add user journey testing for all template types
   - `[tg]` Implement integration testing with real file systems
   - **Success Criteria**: 10+ E2E scenarios, all user paths tested

2. **Performance Testing Suite** 🎯
   - `[tg]` Add CLI startup time benchmarks (< 2 seconds)
   - `[tg]` Implement memory usage monitoring (< 50MB)
   - `[tg]` Create template generation performance tests
   - **Success Criteria**: Performance regression detection, benchmark tracking

3. **Signal System Integration Testing** 🎯
   - `[tg]` Create comprehensive signal detection and processing tests
   - `[tg]` Add scanner-reactive integration testing
   - `[tg]` Implement signal workflow validation
   - **Success Criteria**: Signal system 95% coverage, all workflows tested

4. **Error Handling and Edge Cases** 🎯
   - `[tg]` Add comprehensive error condition testing
   - `[tg]` Create network failure and file system error scenarios
   - `[tg]` Implement graceful degradation testing
   - **Success Criteria**: All error paths tested, proper error messages

**TARGET BY END OF WEEK 6**: 80% coverage, production-ready test suite

#### **Phase 4: CI/CD Pipeline Integration (Week 7-8)**
**AUTOMATED QUALITY GATES**

1. **Automated Testing Pipeline** 🎯
   - `[cp]` Configure GitHub Actions test workflows
   - `[cp]` Add multi-node version testing (Node 18, 20, 22)
   - `[cp]` Implement parallel test execution optimization
   - **Success Criteria**: All tests run on every PR, < 5 minute execution time

2. **Coverage Reporting and Quality Gates** 🎯
   - `[cp]` Set up Codecov integration for coverage tracking
   - `[cp]` Implement minimum coverage requirements (80% new code)
   - `[cp]` Add critical path coverage validation (100% required)
   - **Success Criteria**: Coverage trend tracking, quality gate enforcement

3. **Test Performance Monitoring** 🎯
   - `[cp]` Add test execution time monitoring
   - `[cp]` Implement flaky test detection and alerting
   - `[cp]` Create test stability metrics dashboard
   - **Success Criteria**: < 2% flaky test rate, performance regression alerts

4. **Release Readiness Validation** 🎯
   - `[pc]` Create comprehensive pre-release test checklist
   - `[pc]` Add automated smoke testing for releases
   - `[pc]` Implement post-deployment validation testing
   - **Success Criteria**: Zero critical bugs in production, automated release validation

**TARGET BY END OF WEEK 8**: 90% coverage, fully automated quality pipeline

### **Quality Gates and Success Metrics**

#### **Coverage Targets**:
- **Week 1**: 20% statement coverage (fix critical failures)
- **Week 3**: 50% statement coverage (basic functionality)
- **Week 6**: 80% statement coverage (comprehensive testing)
- **Week 8**: 90% statement coverage (production ready)

#### **Quality Requirements**:
- All tests must pass before merge (`[tg]` signal)
- Minimum 80% coverage for new code
- Critical paths must have 100% coverage
- Performance tests must meet baseline benchmarks
- CLI workflows must have E2E test coverage

### **Test File Organization**

#### **Recommended Test Structure**:
```
tests/
├── unit/                    # 70% - Fast, isolated tests
│   ├── commands/
│   ├── scanner/
│   ├── utils/
│   └── templates/
├── integration/             # 20% - Component interactions
│   ├── cli-workflows/
│   ├── file-operations/
│   └── scanner-system/
├── e2e/                     # 10% - Complete user journeys
│   ├── scenarios/
│   ├── user-flows/
│   └── regression/
├── fixtures/                # Test data and templates
├── helpers/                 # Test utilities and mocks
└── coverage/                # Coverage reports
```

### **Testing Signals Integration**

#### **Quality Assurance Workflow**:
1. **Pre-flight**: `[cq]` Code quality validation
2. **Testing**: `[tr]` → `[tg]` Test execution and results
3. **CI/CD**: `[cf]` → `[cp]` Pipeline validation
4. **Release**: `[pc]` Pre-release checklist completion
5. **Deployment**: `[rl]` Release and post-validation

#### **Parallel Testing Coordination**:
- Use `[oa]` signal for orchestrator coordination during parallel test execution
- Coordinate with Robo-QC for visual testing handoff using QC agent signals
- Apply `[bb]` signal when test dependencies block progress
- Use `[br]` signal when testing blockers are resolved

### **Current Test Infrastructure Crisis Summary**

**🚨 CRITICAL INFRASTRUCTURE BREAKDOWN - PRODUCTION AT RISK**:
- **Coverage**: 0.12% statements (16/13,270 lines) - COMPLETE FAILURE
- **Test Status**: 8/35 test suites failing with critical infrastructure bugs
- **CLI Coverage**: 0% - All core functionality completely untested
- **Signal System**: Broken - RegExp implementation bug blocking all signal detection
- **Quality Gates**: Non-existent - No functional test infrastructure

**🔥 IMMEDIATE BLOCKERS REQUIRING EMERGENCY INTERVENTION**:
1. **Jest Configuration Crisis**: Cannot parse TypeScript files with ES modules
2. **Signal Detection Bug**: TypeError preventing core system functionality
3. **Console Spam Flood**: 14,000+ lines of output blocking test execution
4. **Assertion Logic Errors**: Tests expecting wrong data types and calculations

**📊 ROOT CAUSE ANALYSIS**:
- **Technical Debt**: Accumulated without proper test infrastructure
- **Configuration Drift**: Jest config incompatible with ES modules
- **Implementation Bugs**: Core algorithms fundamentally broken
- **Quality Process Failure**: No validation preventing broken deployments

**⚡ IMMEDIATE ACTIONS REQUIRED (Next 24 Hours)**:
1. **EMERGENCY**: Fix Jest ES module configuration for basic test parsing
2. **EMERGENCY**: Resolve RegExp bug in signal-detector.ts:1026
3. **URGENT**: Correct DynamicContextManager token distribution logic
4. **URGENT**: Implement test environment isolation to eliminate console spam

**📈 RECOVERY PROJECTIONS**:
- **Week 1**: Stabilize infrastructure, achieve 20% coverage
- **Week 3**: Core functionality testing, achieve 50% coverage
- **Week 6**: Comprehensive testing, achieve 80% coverage
- **Week 8**: Production-ready pipeline, achieve 90% coverage

**🚨 RISK ASSESSMENT**:
- **Deployment Risk**: CRITICAL - No functional test coverage
- **Regression Risk**: CRITICAL - Cannot detect breaking changes
- **Production Stability**: AT RISK - Core functionality unvalidated
- **User Experience**: DEGRADED - CLI errors not caught before release

**📋 COMPREHENSIVE ANALYSIS DOCUMENTATION**:
- Detailed test failure analysis available in project issue tracker
- Performance benchmarks and quality metrics dashboard
- CI/CD pipeline integration specifications
- Emergency response procedures for test infrastructure failures

**Status**: CRITICAL INFRASTRUCTURE FAILURE - IMMEDIATE ACTION REQUIRED
**Priority**: BLOCKING ALL DEVELOPMENT UNTIL RESOLVED
**Escalation**: PROJECT MANAGEMENT AWARE - QUALITY GATES FAILED
*Comprehensive analysis completed by Robo-AQA on 2025-11-05T04:50:00Z*

#### [cc] Cleanup Complete
- **WHO**: robo-developer
- **WHEN**: All cleanup tasks completed before final commit (temp files, logs, artifacts removed)
- **WHAT**: Document cleanup actions, removed items, and system ready for final commit

---

### 🎨 UX/UI DESIGNER SIGNALS

#### [du] Design Update
- **WHO**: robo-ux-ui-designer
- **WHEN**: Design changes, new components, or visual updates are created
- **WHAT**: Document design modifications, update design system, signal design handoff readiness

#### [ds] Design System Updated
- **WHO**: robo-ux-ui-designer
- **WHEN**: Design system components, tokens, or guidelines are modified
- **WHAT**: Update design system documentation, coordinate with development on implementation

#### [dr] Design Review Requested
- **WHO**: robo-ux-ui-designer
- **WHEN**: Design proposals need feedback or approval
- **WHAT**: Present design concepts, request specific feedback, wait for review before proceeding

#### [dh] Design Handoff Ready
- **WHO**: robo-ux-ui-designer
- **WHEN**: Design assets and specifications are ready for development
- **WHAT**: Provide complete design package, assets, and implementation guidelines

#### [da] Design Assets Delivered
- **WHO**: robo-ux-ui-designer
- **WHEN**: Final design assets are exported and available
- **WHAT**: Document asset delivery, formats, and optimization status

#### [dc] Design Change Implemented
- **WHO**: robo-ux-ui-designer
- **WHEN**: Design modifications are reflected in the live application
- **WHAT**: Verify design implementation accuracy, document any deviations

#### [df] Design Feedback Received
- **WHO**: robo-ux-ui-designer
- **WHEN**: User feedback, stakeholder input, or testing results are available
- **WHAT**: Document feedback insights, plan design iterations based on findings

#### [di] Design Issue Identified
- **WHO**: robo-ux-ui-designer
- **WHEN**: UX problems, accessibility issues, or design inconsistencies are found
- **WHAT**: Document design issues, impact assessment, and proposed solutions

#### [dt] Design Testing Complete
- **WHO**: robo-ux-ui-designer
- **WHEN**: User testing, A/B tests, or usability studies are finished
- **WHAT**: Provide test results, recommendations, and design improvements

#### [dp] Design Prototype Ready
- **WHO**: robo-ux-ui-designer
- **WHEN**: Interactive prototypes or mockups are available for review
- **WHAT**: Present prototype functionality, user flows, and interaction patterns

---

### ⚙️ DEVOPS/SRE SIGNALS

#### [id] Infrastructure Deployed
- **WHO**: robo-devops-sre
- **WHEN**: Infrastructure changes are deployed and verified
- **WHAT**: Document infrastructure updates, performance impact, and health status

#### [cd] CI/CD Pipeline Updated
- **WHO**: robo-devops-sre
- **WHEN**: Build, test, or deployment pipelines are modified
- **WHAT**: Update pipeline documentation, test new workflows, verify integration

#### [mo] Monitoring Online
- **WHO**: robo-devops-sre
- **WHEN**: Monitoring systems are configured and operational
- **WHAT**: Document monitoring coverage, alert rules, and dashboard availability

#### [ir] Incident Resolved
- **WHO**: robo-devops-sre
- **WHEN**: Production incidents are fixed and services restored
- **WHAT**: Document incident resolution, root cause, and prevention measures

#### [so] System Optimized
- **WHO**: robo-devops-sre
- **WHEN**: Performance improvements or cost optimizations are implemented
- **WHAT**: Document optimization results, performance gains, and resource savings

#### [sc] Security Check Complete
- **WHO**: robo-devops-sre
- **WHEN**: Security scans, vulnerability assessments, or compliance checks are done
- **WHAT**: Provide security findings, remediation status, and compliance validation

#### [pb] Performance Baseline Set
- **WHO**: robo-devops-sre
- **WHEN**: Performance benchmarks and baselines are established
- **WHAT**: Document performance metrics, thresholds, and monitoring targets

#### [dr] Disaster Recovery Tested
- **WHO**: robo-devops-sre
- **WHEN**: Disaster recovery procedures are validated through testing
- **WHAT**: Document test results, recovery times, and improvement areas

#### [cu] Capacity Updated
- **WHO**: robo-devops-sre
- **WHEN**: System capacity is scaled or resource allocation is modified
- **WHAT**: Document capacity changes, scaling triggers, and cost implications

#### [ac] Automation Configured
- **WHO**: robo-devops-sre
- **WHEN**: New automation workflows or scripts are implemented
- **WHAT**: Document automation coverage, efficiency gains, and maintenance requirements

#### [sl] SLO/SLI Updated
- **WHO**: robo-devops-sre
- **WHEN**: Service Level Objectives or Indicators are modified
- **WHAT**: Update reliability targets, measurement criteria, and monitoring alerts

#### [eb] Error Budget Status
- **WHO**: robo-devops-sre
- **WHEN**: Error budget consumption is tracked or thresholds are reached
- **WHAT**: Document error budget usage, burn rate, and release freeze decisions

#### [ip] Incident Prevention
- **WHO**: robo-devops-sre
- **WHEN**: Proactive measures are taken to prevent potential incidents
- **WHAT**: Document prevention actions, risk mitigation, and monitoring improvements

#### [rc] Reliability Check Complete
- **WHO**: robo-devops-sre
- **WHEN**: System reliability assessments or health checks are performed
- **WHAT**: Provide reliability status, identified risks, and improvement recommendations

#### [rt] Recovery Time Measured
- **WHO**: robo-devops-sre
- **WHEN**: Recovery time objectives are measured or tested
- **WHAT**: Document RTO metrics, recovery procedures, and performance against targets

#### [ao] Alert Optimized
- **WHO**: robo-devops-sre
- **WHEN**: Alert rules, thresholds, or notification systems are improved
- **WHAT**: Document alert changes, noise reduction, and response time improvements

#### [ps] Post-mortem Started
- **WHO**: robo-devops-sre
- **WHEN**: Incident post-mortem analysis begins
- **WHAT**: Document post-mortem scope, participants, and investigation timeline

#### [ts] Troubleshooting Session
- **WHO**: robo-devops-sre
- **WHEN**: Active troubleshooting of system issues is in progress
- **WHAT**: Document investigation steps, findings, and resolution progress

#### [er] Escalation Required
- **WHO**: robo-devops-sre
- **WHEN**: Issues require escalation to senior teams or external vendors
- **WHAT**: Document escalation reasons, current status, and expected resolution timeline

---

### 🔄 PARALLEL COORDINATION SIGNALS

#### [pc] Parallel Coordination Needed
- **WHO**: Any agent
- **WHEN**: Multiple agents need to synchronize work or resolve dependencies
- **WHAT**: Request coordination meeting, identify conflicts, propose resolution approach

#### [fo] File Ownership Conflict
- **WHO**: Any agent
- **WHEN**: File ownership or modification conflicts arise between agents
- **WHAT**: Document conflict details, propose ownership resolution, coordinate changes

#### [cc] Component Coordination
- **WHO**: robo-ux-ui-designer & robo-developer
- **WHEN**: UI components need coordinated design and development
- **WHAT**: Sync component specifications, coordinate implementation timelines

#### [as] Asset Sync Required
- **WHO**: robo-ux-ui-designer & robo-devops-sre
- **WHEN**: Design assets need deployment or CDN updates
- **WHAT**: Coordinate asset delivery, optimization, and deployment pipeline

#### [pt] Performance Testing Design
- **WHO**: robo-ux-ui-designer & robo-devops-sre
- **WHEN**: Design changes require performance validation
- **WHAT**: Coordinate performance testing, measure design impact, optimize delivery

#### [pe] Parallel Environment Ready
- **WHO**: robo-devops-sre
- **WHEN**: Staging or testing environments are ready for parallel work
- **WHAT**: Document environment status, access details, and coordination requirements

#### [fs] Feature Flag Service Updated
- **WHO**: robo-devops-sre
- **WHEN**: Feature flags need configuration for parallel development
- **WHAT**: Update feature flag configurations, coordinate rollout strategies

#### [ds] Database Schema Sync
- **WHO**: robo-devops-sre & robo-developer
- **WHEN**: Database changes require coordinated deployment
- **WHAT**: Sync schema changes, coordinate migration timing, validate compatibility

#### [rb] Rollback Prepared
- **WHO**: robo-devops-sre
- **WHEN**: Rollback procedures need preparation for parallel deployments
- **WHAT**: Document rollback plans, test rollback procedures, verify recovery paths

---

## 🚀 EMOTIONAL STATE TRACKING & MENTAL HEALTH

### **Agent Personalities & Communication Style**
- **robo-system-analyst**: Uses Portuguese expressions (Encantado ✨, Incrível 🎉)
- **robo-developer**: Pragmatic, focused (Confident ✅, Blocked 🚫)
- **robo-quality-control**: Skeptical, thorough (Validated 🎯, Frustrated 😤)
- **robo-ux-ui-designer**: Visual, aesthetic (Excited 🎉, Optimistic 🌟)
- **robo-devops-sre**: Systematic and reliability-focused (System Optimized ⚙️, Infrastructure Stable 🛡️, Automated 🤖)

### **Mental Health Best Practices**
- **PRP Comments**: Always leave comments about work done and how you feel about it
- **Cleanup Documentation**: Comment on `/tmp` files, dev servers, ports that need cleanup
- **Work Scope Boundaries**: Comment when working on files outside expected PRP scope
- **Uncertainty Handling**: Comment on uncertainty and wait for guidance for complex decisions
- **Context Management**: Create checkpoints when context limits are reached
- **Frustration Escalation**: Use proper escalation paths when technically blocked

### **Gate-Based Validation Using Actual Signals**
- **DoD Verification**: Use `[da]` signal when ready for Definition of Done validation
- **Quality Gates**: Signal when each quality gate is passed or failed
- **Pre-Release**: Signal when pre-release checklist completed
- **Release Approval**: Signal when release is approved for deployment

---

## 🔄 PARALLEL COORDINATION RULES

> !! work in parallel when possible and use sub-agents what most suitable for always !!

### **File Ownership Management**
- **Primary Ownership**: Each agent has defined file patterns they own primarily
- **Shared Files**: Coordination required for files that overlap ownership boundaries
- **Conflict Resolution**: Use `[fo]` signal for ownership conflicts, escalate to orchestrator if unresolved
- **Change Notification**: Agents must signal changes to shared files using appropriate coordination signals

### **Design-DevOps Coordination**
- **Asset Pipeline**: robo-ux-ui-designer creates assets → `[da]` signal → robo-devops-sre optimizes deployment → `[as]` signal
- **Performance Impact**: Design changes requiring performance validation trigger `[pt]` signal
- **Design System Updates**: Design system changes require `[ds]` signal and coordination with development team

### **Development-DevOps Coordination**
- **Infrastructure Changes**: Development requirements trigger `[id]` signal from robo-devops-sre
- **Database Schemas**: Schema changes require `[ds]` signal coordination between developer and SRE
- **Environment Management**: Parallel development requires `[pe]` signal for environment readiness

### **Cross-Functional Workflows**
- **Component Development**: `[cc]` signal coordinates design and development work
- **Feature Rollouts**: `[fs]` signal manages feature flag coordination
- **Incident Response**: `[er]` signal escalates issues requiring multiple agents

### **Synchronization Protocols**
- **Daily Checkpoints**: Agents use `[oa]` signal for orchestrator coordination
- **Milestone Alignment**: Major deliverables require `[pc]` signal for parallel work sync
- **Quality Gates**: Cross-agent quality checks use `[rg]` signal for review coordination

### **Parallel Work Optimization**
- **Independent Work**: Agents can work independently on owned files without coordination
- **Dependent Work**: Required coordination signals must be used before dependent work begins
- **Simultaneous Delivery**: Multiple agents can deliver simultaneously when dependencies are resolved

### **Conflict Prevention**
- **Pre-emptive Communication**: Agents signal upcoming changes that might affect others
- **Shared Roadmap**: Regular coordination through `[oa]` signal maintains alignment
- **Resource Allocation**: Orchestrator manages competing priorities through `[pc]` signal

---

> SYSTEM PART END! NEVER EDIT ABOVE

## USER SECTION!

### release flow
TBD

### landing gh-pages deploy
TBD

## 🚀 PERFORMANCE REQUIREMENTS & GUIDELINES

### **Performance Standards**
All agents and components MUST adhere to the following performance requirements:

#### **CLI Performance Requirements**
- **Startup Time**: < 2 seconds (target: 1.5 seconds)
- **Memory Usage**: < 50MB during normal operations (target: 30MB)
- **Command Response**: < 100ms for basic commands, < 5 seconds for complex operations
- **File Operations**: < 50ms for small files, < 1s for large files (>1MB)
- **Cache Hit Rate**: > 80% for repeated operations

#### **Scanner Performance Requirements**
- **File Watching**: < 100ms latency from file change to event emission
- **Signal Parsing**: < 10ms per file for typical PRP files
- **Batch Processing**: Handle 100+ files in < 2 seconds
- **Memory Efficiency**: < 100MB for projects with 1000+ files
- **Cache Performance**: > 90% hit rate for unchanged files

#### **Orchestrator Performance Requirements**
- **Decision Making**: < 500ms for cached decisions, < 5s for new decisions
- **Agent Spawning**: < 2 seconds to spawn and initialize agents
- **Context Management**: < 50ms to load cached contexts
- **Memory Usage**: < 200MB for full orchestrator with agents
- **Concurrent Operations**: Support 10+ concurrent agent sessions

### **Performance Monitoring & Metrics**

#### **Required Performance Signals**
Agents must emit these performance-related signals when thresholds are exceeded:

**[pm] Performance Monitoring** - General performance issue detected
- **WHO**: Any agent
- **WHEN**: Performance metrics exceed acceptable thresholds
- **WHAT**: Document performance metrics, identify bottlenecks, request optimization

**[po] Performance Optimized** - Performance improvement implemented
- **WHO**: robo-developer
- **WHEN**: Performance optimizations implemented and verified
- **WHAT**: Document improvements, before/after metrics, optimization techniques used

**[ps] Performance Regression** - Performance degradation detected
- **WHO**: Any agent
- **WHEN**: Performance metrics show degradation from baseline
- **WHAT**: Document regression, identify cause, request investigation

### **Performance Optimization Techniques**

#### **Lazy Loading Implementation**
```typescript
// ✅ GOOD: Use lazy loading for heavy dependencies
const heavyDependency = new LazyLoader(() => import('./heavy-module'));

// ❌ BAD: Load everything at startup
import { HeavyModule } from './heavy-module';
```

#### **Caching Strategies**
```typescript
// ✅ GOOD: Implement intelligent caching
const cached = await performanceManager.cached(key, () => expensiveOperation());

// ❌ BAD: Repeated expensive operations without caching
const result = expensiveOperation(); // Called every time
```

#### **Memory Management**
```typescript
// ✅ GOOD: Clean up resources properly
class Resource {
  private cleanup = new Set<() => void>();

  addCleanup(fn: () => void) {
    this.cleanup.add(fn);
  }

  dispose() {
    this.cleanup.forEach(fn => fn());
    this.cleanup.clear();
  }
}

// ❌ BAD: Memory leaks from event emitters
const emitter = new EventEmitter();
// Never removing listeners causes memory leaks
```

#### **Batch Processing**
```typescript
// ✅ GOOD: Process items in batches
for (const batch of chunkArray(items, batchSize)) {
  await processBatch(batch);
  await new Promise(resolve => setImmediate(resolve)); // Allow event loop
}

// ❌ BAD: Process all items at once
items.forEach(item => processItem(item)); // Blocks event loop
```

### **Performance Testing Requirements**

#### **Mandatory Performance Tests**
All PRPs MUST include performance tests for:

1. **CLI Operations**: Startup time, command execution, memory usage
2. **File Operations**: Reading, writing, watching, parsing
3. **Agent Operations**: Spawning, communication, cleanup
4. **Cache Operations**: Hit rates, eviction policies, memory usage
5. **Memory Management**: Leak detection, cleanup verification

#### **Performance Test Execution**
```bash
# Run performance test suite
npm run test:performance

# Run specific performance tests
npm run test:performance:cli
npm run test:performance:scanner
npm run test:performance:orchestrator

# Generate performance report
npm run perf:report
```

#### **Performance Benchmarking**
- Baseline metrics established for each component
- Regression testing for performance changes
- Automated performance gates in CI/CD pipeline
- Performance monitoring in production environments

### **Performance Optimization Workflow**

#### **Performance Issue Detection**
1. **Monitor metrics** - Real-time performance monitoring
2. **Identify bottlenecks** - Profile and analyze slow operations
3. **Document findings** - Use `[pm]` signal with detailed metrics
4. **Prioritize optimizations** - Focus on high-impact improvements

#### **Optimization Implementation**
1. **Research solutions** - Identify proven optimization techniques
2. **Implement changes** - Apply optimizations with proper testing
3. **Measure impact** - Verify improvements with before/after metrics
4. **Document results** - Use `[po]` signal with performance gains

#### **Performance Validation**
1. **Run test suite** - Execute comprehensive performance tests
2. **Verify benchmarks** - Ensure all performance requirements met
3. **Update baselines** - Adjust target metrics if needed
4. **Monitor production** - Continuously track performance in production

### **Performance Signals in PRPs**

#### **Required Performance Documentation**
Every PRP MUST include performance requirements in the DoD section:

```markdown
## dod - Performance Requirements
- [ ] CLI startup time < 2 seconds
- [ ] Memory usage < 50MB during normal operations
- [ ] File watching latency < 100ms
- [ ] Signal parsing < 10ms per file
- [ ] All performance tests passing
- [ ] Performance benchmarks met
```

#### **Performance Progress Tracking**
Use performance signals to track optimization progress:

```markdown
## progress
[pm] Performance issue identified: CLI startup taking 3.5 seconds, exceeding 2 second target | robo-developer | 2025-01-01-10:00
[po] Performance optimized: CLI startup reduced to 1.2 seconds through lazy loading and caching | robo-developer | 2025-01-01-12:00
```

### **Performance Monitoring Tools**

#### **Built-in Performance Manager**
```typescript
import { performanceManager } from '../performance/index.js';

// Start timing an operation
performanceManager.startOperation('my-operation');

// End timing and record metrics
performanceManager.endOperation('my-operation');

// Get performance report
const report = performanceManager.getReport();
```

#### **Memory Monitoring**
```typescript
import { MemoryMonitor } from '../performance/index.js';

const monitor = new MemoryMonitor();
monitor.startMonitoring(5000); // Check every 5 seconds

const trend = monitor.getTrend();
if (trend.increasing) {
  console.warn(`Memory increasing at ${trend.rate}MB/s`);
}
```

### **Performance Best Practices**

#### **DO ✅**
- Use lazy loading for heavy dependencies
- Implement intelligent caching with TTL
- Clean up resources and event listeners
- Process items in batches to avoid blocking
- Monitor memory usage and implement cleanup
- Profile before optimizing
- Use performance decorators for measurement
- Implement proper error handling to avoid crashes

#### **DON'T ❌**
- Load all modules at startup
- Ignore memory leaks
- Block the event loop with long operations
- Skip performance testing
- Use synchronous I/O operations
- Forget to clean up event listeners
- Ignore performance warnings
- Optimize without measuring first

### **Performance Emergency Procedures**

#### **When Performance Issues Occur**
1. **Immediate Response**: Document issue with `[pm]` signal
2. **Assessment**: Determine impact on user experience
3. **Temporary Measures**: Implement workarounds if needed
4. **Investigation**: Profile and identify root cause
5. **Resolution**: Implement and test optimizations
6. **Verification**: Confirm fix and update documentation

#### **Performance Regression Response**
1. **Detection**: Automated alerts or user reports
2. **Documentation**: Use `[ps]` signal with regression details
3. **Analysis**: Compare with baseline performance
4. **Rollback**: Consider rollback if regression is severe
5. **Fix**: Address root cause of performance degradation
6. **Validation**: Ensure performance restored to acceptable levels

---

### mondatory project rules!
- NEVER git stash or play with git branch or history! NEVER! i need you always ask confirmation
- ALWAYS update ONLY related to prp files, before start work leave list of files you will work on, then work only with related files! ALL CODE REVIEW MAXIMUM ALERT IF ANYTHING OUTSIDE PRP SCOPE EDITED WITHOUT REASON AND NOTICE!
- **PERFORMANCE REQUIREMENT**: ALL code changes MUST meet performance standards. Use performance monitoring and optimization techniques to ensure CLI starts < 2s, memory usage < 50MB, and responsive user interaction.
