# Merge Prompt Utility - Usage Guide

## Overview

The `merge-prompt.ts` utility is a critical component of the PRP system that enables intelligent merging of markdown content with automatic resolution of file references and token-optimized parameter handling.

## Features

- **Markdown Link Resolution**: Automatically replaces `.md` file references with actual content
- **TOON (Token Optimized Notation)**: Minifies JSON parameters to reduce token usage
- **Content Caching**: Performance optimization through intelligent caching
- **Agent-Specific Merging**: Specialized merge orders for different agent types
- **Error Handling**: Graceful handling of missing files and circular references

## Basic Usage

### Simple Merge

```typescript
import { mergePrompt } from '@/shared/utils/merge-prompt';

// Merge multiple content strings
const result = await mergePrompt(
  '# System Instructions',
  '## Important Rules\n\nAlways follow AGENTS.md guidelines',
  { mode: 'production', version: '1.0.0' }
);

console.log(result);
// Output includes all content + minified JSON parameters
```

### With Parameters

```typescript
const result = await mergePrompt(
  '# Task Instructions',
  'Complete the following task:',
  {
    task: 'implement user authentication',
    requirements: ['password hashing', 'JWT tokens', 'session management'],
    deadline: '2024-12-01',
    priority: 'high'
  }
);
```

## Agent-Specific Usage

### Building Agent Prompts

```typescript
import { buildAgentPrompt } from '@/shared/utils/merge-prompt';

// For agent communication
const agentPrompt = await buildAgentPrompt(
  './.prprc',                                    // prprc.instructions_path
  [                                              // prprc.agents[].instructions_path
    './instructions/claude-code.md',
    './instructions/testing-agent.md'
  ],
  {                                              // Additional parameters
    agentId: 'claude-code',
    currentTask: 'implement authentication',
    context: {
      projectId: 'web-app',
      features: ['auth', 'dashboard', 'api']
    }
  }
);
```

### Building Inspector Prompts

```typescript
import { buildInspectorPrompt } from '@/shared/utils/merge-prompt';

// For signal analysis and pattern detection
const inspectorPrompt = await buildInspectorPrompt(
  './.prprc',                                    // prprc.instructions_path
  { instructions_path: './instructions/inspector.md' }, // prprc.inspector.instructions_path
  {                                              // scanner JSON
    signals: [
      { type: '[dp]', source: 'PRPs/PRP-001.md', timestamp: '2024-01-01T00:00:00Z' },
      { type: '[bf]', source: 'src/auth.ts', timestamp: '2024-01-01T01:00:00Z' }
    ],
    patterns: ['development progress', 'bug fixes'],
    health: 'optimal'
  },
  'Previous inspection noted development on auth module', // previous context
  {                                              // Additional parameters
    inspectionMode: 'comprehensive',
    focusArea: 'quality assurance'
  }
);
```

### Building Orchestrator Prompts

```typescript
import { buildOrchestratorPrompt } from '@/shared/utils/merge-prompt';

// For workflow coordination and agent management
const orchestratorPrompt = await buildOrchestratorPrompt(
  './.prprc',                                    // prprc.instructions_path
  { instructions_path: './instructions/orchestrator.md' }, // prprc.orchestrator.instructions_path
  {                                              // inspector payload
    analysis: {
      systemHealth: 'optimal',
      activeAgents: 3,
      blockageLevel: 'low',
      recommendations: ['proceed with current tasks']
    }
  },
  'PRP-001: 75% complete, authentication module done', // PRP context
  'System running in development mode',           // shared context
  {                                              // Additional parameters
    orchestrationMode: 'active',
    priorityTasks: ['complete API integration', 'add tests'],
    resourceConstraints: {
      maxTokens: 200000,
      maxAgents: 5
    }
  }
);
```

## Advanced Usage

### Manual Link Resolution

```typescript
import { MergePrompt } from '@/shared/utils/merge-prompt';

// Create content with markdown links
const content = `
# Main Instructions

Refer to [Agent Guidelines](guidelines/agent.md) for detailed instructions.

See [Project Requirements](project/requirements.md) for context.
`;

// Resolve links and merge with parameters
const result = await MergePrompt.merge([content], {
  project: 'web-application',
  phase: 'development'
});
```

### Custom Options

```typescript
const result = await MergePrompt.merge(
  ['# Instructions', '# Guidelines'],
  { custom: 'parameters' },
  {
    cache: false,           // Disable caching
    throwOnMissingFile: true, // Throw error if files missing
    maxDepth: 5,            // Limit recursion depth
    preserveFormatting: true // Preserve markdown formatting
  }
);
```

### Caching Control

```typescript
import { MergePrompt } from '@/shared/utils/merge-prompt';

// Clear cache
MergePrompt.clearCache();

// Get cache statistics
const stats = MergePrompt.getCacheStats();
console.log(`Cache size: ${stats.size}, Keys: ${stats.keys.length}`);

// Build with caching disabled
const result = await MergePrompt.merge(
  contentArray,
  params,
  { cache: false }
);
```

## TOON (Token Optimized Notation)

The utility includes TOON for minifying JSON parameters:

```typescript
import { TOON } from '@/shared/utils/merge-prompt';

const data = {
  user: {
    name: 'John Doe',
    settings: {
      theme: 'dark',
      notifications: true,
      features: ['email', 'push', 'sms']
    }
  },
  session: {
    id: 'abc123',
    timeout: 3600
  }
};

// Minify for token efficiency
const minified = TOON.minify(data);
// Result: {"user":{"name":"John Doe","settings":{"theme":"dark","notifications":true,"features":["email","push","sms"]}},"session":{"id":"abc123","timeout":3600}}

// Parse back when needed
const parsed = TOON.parse(minified);
```

## Integration with Existing System

### In Agent Communication

```typescript
// src/agents/agent-communication.ts
import { buildAgentPrompt } from '@/shared/utils/merge-prompt';

export async function createAgentMessage(
  agentId: string,
  taskId: string,
  context: any
): Promise<string> {
  const prprc = await loadPRPRC();
  const agentConfig = prprc.agents.find(a => a.id === agentId);

  return await buildAgentPrompt(
    prprc.instructions_path,
    [agentConfig],
    {
      agentId,
      taskId,
      context,
      timestamp: new Date().toISOString()
    }
  );
}
```

### In Signal Processing

```typescript
// src/orchestrator/signal-processor.ts
import { buildInspectorPrompt } from '@/shared/utils/merge-prompt';

export async function processSignals(
  signals: Signal[],
  context: ProcessingContext
): Promise<Insight[]> {
  const inspectorPrompt = await buildInspectorPrompt(
    context.prprcPath,
    context.inspectorConfig,
    { signals, patterns: analyzePatterns(signals) },
    context.previousInspection
  );

  // Send to LLM for analysis...
}
```

### In Orchestrator Workflow

```typescript
// src/orchestrator/workflow-manager.ts
import { buildOrchestratorPrompt } from '@/shared/utils/merge-prompt';

export async function coordinateAgents(
  task: Task,
  agents: Agent[],
  systemState: SystemState
): Promise<CoordinationPlan> {
  const orchestratorPrompt = await buildOrchestratorPrompt(
    systemState.prprcPath,
    systemState.orchestratorConfig,
    systemState.inspectorPayload,
    systemState.currentPRPContext,
    systemState.sharedContext,
    { task, agents, timestamp: Date.now() }
  );

  // Generate coordination plan...
}
```

## File Structure Setup

For the utility to work correctly, ensure your project follows this structure:

```
project/
├── .prprc                          # Main configuration
├── AGENTS.md                       # Agent guidelines (referenced from .prprc)
├── instructions/
│   ├── prprc.md                   # System instructions
│   ├── agent.md                   # Agent-specific instructions
│   ├── inspector.md               # Inspector instructions
│   └── orchestrator.md            # Orchestrator instructions
├── src/prompts/
│   ├── agent.md                   # Agent prompt template
│   ├── inspector.md               # Inspector prompt template
│   ├── orchestrator.md            # Orchestrator prompt template
│   └── nudge.md                   # Nudge prompt template
├── guidelines/
│   └── EN/
│       ├── agent.md               # English agent guidelines
│       ├── inspector.md           # English inspector guidelines
│       └── orchestrator.md        # English orchestrator guidelines
└── PRPs/
    └── PRP-*.md                   # Product Requirement Prompts
```

## Best Practices

### 1. Content Organization
- Keep instructions focused and modular
- Use clear, descriptive file names
- Structure content logically with clear headings

### 2. Link Management
- Use relative paths for better portability
- Avoid circular references
- Test link resolution in CI/CD

### 3. Parameter Optimization
- Use TOON for large parameter objects
- Structure data hierarchically for better minification
- Include only necessary data in parameters

### 4. Performance Considerations
- Enable caching for production use
- Monitor cache size and clear when needed
- Use appropriate maxDepth for complex link structures

### 5. Error Handling
- Set `throwOnMissingFile: true` in development
- Use graceful error handling in production
- Log resolution errors for debugging

## Troubleshooting

### Common Issues

**Links not resolving:**
- Check file paths are correct
- Ensure files exist and are readable
- Verify working directory context

**Performance issues:**
- Enable caching: `{ cache: true }`
- Limit recursion depth: `{ maxDepth: 5 }`
- Clear cache if it grows too large

**Token usage too high:**
- Use TOON for parameter minification
- Reduce parameter complexity
- Optimize content length

### Debug Mode

```typescript
// Enable detailed logging for debugging
const result = await MergePrompt.merge(
  contents,
  params,
  {
    cache: false,
    throwOnMissingFile: true
  }
);

// Check cache statistics
console.log('Cache stats:', MergePrompt.getCacheStats());
```

## Examples Repository

See the test files for comprehensive examples:
- `tests/unit/shared/utils/merge-prompt.test.ts` - Unit tests and basic usage
- `tests/integration/shared/utils/merge-prompt.integration.test.ts` - Real-world scenarios

These tests demonstrate practical usage patterns and can serve as additional documentation.