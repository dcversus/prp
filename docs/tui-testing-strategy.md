# TUI Testing Strategy

## Overview

TUI (Terminal User Interface) components require special testing considerations since they interact directly with terminal APIs that are not available in standard browser-based test environments like JSDOM.

## Testing Approach

### 1. Unit Tests (Non-Interactive Components)

Focus on testing pure logic components that don't require terminal interaction:

```typescript
// Test example for non-TUI logic
describe('SignalProcessor', () => {
  it('should process signals correctly', () => {
    // Test pure functions
    const result = processSignal(mockSignal);
    expect(result).toEqual(expectedResult);
  });
});
```

### 2. Integration Tests (Real Terminal Environment)

For testing actual TUI components, we need real terminal environments:

#### Option A: End-to-End CLI Testing
```bash
# Test using expect or similar CLI testing framework
npx expect ./tests/tui/scenarios/basic-navigation.exp
```

#### Option B: PTY (Pseudo-Terminal) Testing
```typescript
import { spawn } from 'pty.js';
import { expect } from 'chai';

describe('TUI Navigation', () => {
  it('should navigate between screens', async () => {
    const ptyProcess = spawn('./cli.js', ['tui'], {
      name: 'xterm-color',
      cols: 80,
      rows: 24
    });

    // Send key presses
    ptyProcess.write('\t');  // Tab
    ptyProcess.write('\x1b'); // Escape

    // Read output and assert
    const output = await ptyProcess.read();
    expect(output).to.contain('Orchestrator Screen');
  });
});
```

#### Option C: Manual Testing Scripts
Create interactive test scripts that guide human testers:

```typescript
// tests/tui/manual/test-navigation.js
console.log('=== TUI Navigation Test ===');
console.log('1. Navigate with Tab key');
console.log('2. Press 1-4 for screens');
console.log('3. Press Escape to quit');
console.log('Expected: All screens should render without errors');
```

## Test Categories

### 1. Component Logic Tests
- Signal processing
- State management
- Data transformation
- Configuration validation

### 2. Terminal API Tests
Mock terminal-specific APIs:
- `process.stdin` handling
- `process.stdout`/`process.stderr` output
- Terminal resize events
- Keyboard input processing

### 3. Integration Flow Tests
- Complete user workflows
- Error handling paths
- Performance under load

## Recommended Testing Tools

### For Unit Tests
- **Jest**: Already configured
- **Testing Library**: For component testing where applicable

### For Terminal Integration
- **PTY.js**: Node.js library for pseudo-terminals
- **Expect**: For automating terminal interactions
- **Node-pty**: Alternative PTY implementation

### For End-to-End
- **Playwright**: Can run CLI in real terminal
- **Custom test scripts**: Node.js scripts that test CLI behavior

## Example Test Structure

```
tests/
├── unit/                    # Pure logic tests
│   ├── signal-processor.test.ts
│   ├── state-manager.test.ts
│   └── config-validator.test.ts
├── integration/
│   ├── terminal-api.mock.ts   # Mock terminal APIs
│   └── component-logic.test.ts
├── e2e/                     # Real terminal tests
│   ├── basic-navigation.exp
│   ├── keyboard-shortcuts.exp
│   └── complete-workflow.test.ts
└── tui/
    ├── manual/
    │   ├── test-scenarios.js
    │   └── test-checklist.md
    └── automated/
        ├── pty-tests.js
        └── cli-e2e.test.ts
```

## Implementation Priority

1. **High Priority**: Unit tests for business logic
2. **Medium Priority**: Terminal API mocking for integration tests
3. **Low Priority**: Full terminal E2E tests (manual initially)

## Best Practices

1. **Separate Concerns**: Keep terminal logic separate from UI rendering
2. **Inject Dependencies**: Allow injection of terminal APIs for testing
3. **Mock Early**: Mock terminal APIs at the module level
4. **Test Scenarios**: Focus on user workflows, not implementation details
5. **Manual Verification**: Use human testers for visual/interactive components