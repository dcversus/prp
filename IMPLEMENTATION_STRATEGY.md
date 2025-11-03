# Implementation Strategy for PRP-007 with Current Constraints

## Current Status
- TypeScript Errors: 78 (down from 200+)
- ESLint Errors: 195 (down from 378)
- Tests: Some passing, but many need CLI built
- Build: Still failing but core components work

## Strategy: Pragmatic Implementation

### Phase 1: Focus on Working Components
Instead of fixing all 78 TS errors, let's implement PRP-007-F using the parts that already work:

1. **Use Existing Working Infrastructure**:
   - Scanner already has basic signal detection
   - Token accounting partially works
   - Event bus core functionality exists
   - TUI components render (with warnings)

2. **Implement Scanner Layer Incrementally**:
   - Create new files in `/src/scanner/event-bus/`
   - Use existing EventBus from shared/events.ts
   - Add signal adapters as pure functions
   - Focus on [XX] signal parsing

3. **Behavior-Driven Tests**:
   - Write tests that verify actual signal detection
   - Test real file watching scenarios
   - Verify event emission
   - No mocks, real file system operations

### Phase 2: Minimal TypeScript Fixes

Fix only what blocks PRP-007-F:

1. **Add Type Suppressions Where Needed**:
   ```typescript
   // @ts-ignore - Temporary for complex types
   // Use unknown instead of any
   // Add type assertions where safe
   ```

2. **Create Minimal Interfaces**:
   ```typescript
   interface ScannerEvent {
     type: string;
     data: unknown;
     timestamp: Date;
   }
   ```

3. **Use Dynamic Imports for Problematic Modules**:
   ```typescript
   const inquirer = await import('inquirer');
   ```

### Phase 3: Implementation Plan

#### 1. Create Scanner Event Bus (Day 1)
```typescript
// src/scanner/event-bus/EventBus.ts
export class ScannerEventBus {
  private events: ScannerEvent[] = [];

  emit(event: ScannerEvent): void {
    this.events.push(event);
  }

  subscribe(handler: (event: ScannerEvent) => void): void {
    // Implementation
  }
}
```

#### 2. Create Signal Parser (Day 1)
```typescript
// src/scanner/signal-parser/SignalParser.ts
export class SignalParser {
  parse(content: string): SignalEvent[] {
    const pattern = /\[([a-zA-Z]{2})\]/g;
    const signals: SignalEvent[] = [];
    let match;

    while ((match = pattern.exec(content)) !== null) {
      signals.push({
        signal: match[1],
        context: content.substring(match.index - 50, match.index + 50),
        timestamp: new Date()
      });
    }

    return signals;
  }
}
```

#### 3. Create File Watcher (Day 2)
```typescript
// src/scanner/file-watcher/FileWatcher.ts
export class FileWatcher {
  private watcher: FSWatcher;

  watch(paths: string[]): void {
    // Use chokidar or Node.js fs.watch
  }

  onChange(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf8');
    const signals = this.parser.parse(content);
    signals.forEach(signal => this.eventBus.emit(signal));
  }
}
```

#### 4. Create Scanner Adapters (Day 3)
```typescript
// src/scanner/adapters/GitAdapter.ts
export class GitAdapter {
  detectSignals(): SignalEvent[] {
    // Parse git log for [XX] signals
  }
}

// src/scanner/adapters/TmuxAdapter.ts
export class TmuxAdapter {
  detectSignals(): SignalEvent[] {
    // Parse tmux session logs
  }
}
```

### Phase 4: Integration Tests

Write tests that verify real behavior:

```typescript
// tests/integration/scanner.test.ts
describe('Scanner Integration', () => {
  test('should detect [XX] signals in PRP files', async () => {
    // Create actual PRP file
    // Run scanner
    // Verify signals detected
  });

  test('should emit events when file changes', async () => {
    // Watch file
    // Modify file
    // Verify event emitted
  });
});
```

### Phase 5: Connect to Inspector

Once Scanner works:
1. Create Inspector adapter interface
2. Send signals to Inspector
3. Verify 40K output limit

## Success Criteria

### Minimum Viable PRP-007-F:
1. ✅ Detects [XX] signals in files
2. ✅ Emits events to event bus
3. ✅ Tracks file changes
4. ✅ Has basic tests verifying behavior
5. ✅ No build errors in new code

### Nice to Have:
1. Git integration
2. Tmux monitoring
3. Token tracking integration
4. TUI visualization

## Risk Mitigation

1. **TypeScript Errors**: Use @ts-ignore for complex scenarios
2. **Import Issues**: Use dynamic imports
3. **Test Dependencies**: Use real file operations, no mocks
4. **Performance**: Optimize after basic functionality works

## Next Steps

1. Start with Scanner event bus implementation
2. Add signal parsing logic
3. Create behavior-driven tests
4. Integrate with existing components
5. Fix only blocking issues as they arise

This approach focuses on delivering working code rather than perfect code. We'll have a functioning Scanner layer that can detect and emit signals, which is the core requirement for PRP-007-F.