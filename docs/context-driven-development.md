# Context-Driven Development

**The PRP methodology for building software with living context and autonomous coordination**

---

## 📋 Previous: [What is PRP? →](./what-is-prp.md) | Next: [Human as Agent →](./human-as-agent.md)

---

## Overview

Context-driven development is the core principle behind PRP's success. Unlike traditional development where context is fragmented across tools, meetings, and documents, PRP maintains a living context that flows through every stage of development.

## Key Concepts

### Living Context
- Context evolves with implementation
- No version mismatch between requirements and code
- Continuous alignment between business needs and technical delivery

### Three-Layer Flow
1. **Scanner** - Detects changes and emits signals
2. **Inspector** - Analyzes and enriches signals with context
3. **Orchestrator** - Coordinates agents based on contextual understanding

### Context Containers
- PRPs serve as the primary context containers
- Each PRP contains all relevant information, decisions, and progress
- Context is never lost or fragmented

## Implementation Details

### Context Flow
```typescript
// Signal with context
interface Signal {
  type: string;
  context: {
    prpId: string;
    files: FileContext[];
    decisions: Decision[];
    history: ContextHistory[];
  };
}
```

### Context Updates
- Real-time context propagation
- Automatic context aggregation
- Intelligent context resolution

## Best Practices

1. **Single Source of Truth**: PRPs contain all context
2. **Context Preservation**: Never lose context during transitions
3. **Continuous Sync**: Keep context updated across all agents
4. **Context Accessibility**: Make context easily discoverable

---

**Previous**: [What is PRP? →](./what-is-prp.md) | **Next**: [Human as Agent →](./human-as-agent.md)