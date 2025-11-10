# PRP Orchestrator

**Managing autonomous development with AI agent coordination**

---

## 📋 Previous: [PRP Init →](./prp-init.md) | Next: [How to Contribute →](./how-to-contribute.md)

---

## Overview

The PRP Orchestrator is the command center for autonomous development. It coordinates AI agents, manages workflows, and ensures project progress through signal-driven communication.

## Starting the Orchestrator

### Basic Usage
```bash
# Start orchestrator
prp orchestrator

# Start in debug mode
prp orchestrator --debug

# Start with custom config
prp orchestrator --config custom.prprc

# Run in background
prp orchestrator --daemon
```

### TUI Interface

The orchestrator provides a Terminal User Interface (TUI) with:

- **Dashboard** - Overview of all active PRPs and agents
- **Signal Monitor** - Real-time signal feed from all components
- **Agent Management** - View and control agent activities
- **PRP Context** - Detailed view of active PRPs
- **Token Metrics** - Resource usage monitoring

## TUI Screens

### 1. Dashboard Screen
- Active PRPs list with status
- Agent availability and load
- Recent signals and events
- System health indicators

### 2. Orchestrator Screen
- Agent assignment management
- Parallel task coordination
- Workflow orchestration
- Resource allocation

### 3. PRP Context Screen
- PRP details and progress
- Signal history
- Related files and context
- Next action recommendations

### 4. Token Metrics Screen
- Token usage by agent
- Cost tracking
- Budget alerts
- Resource optimization

## Agent Coordination

### Parallel Execution
The orchestrator can run multiple agents in parallel:

```typescript
// Example: Parallel agent execution
{
  "parallel": true,
  "maxAgents": 5,
  "agents": [
    "robo-developer",
    "robo-quality-control",
    "robo-ux-ui-designer",
    "robo-devops-sre",
    "robo-system-analyst"
  ]
}
```

### Agent Roles

#### robo-system-analyst
- Analyzes requirements
- Creates PRPs
- Clarifies goals
- Research coordination

#### robo-developer
- Implementation
- Testing (TDD)
- Code quality
- Bug fixes

#### robo-quality-control
- Test automation
- Code review
- Quality gates
- CI/CD validation

#### robo-ux-ui-designer
- Design system
- User experience
- Accessibility
- Prototypes

#### robo-devops-sre
- Deployment
- Monitoring
- Infrastructure
- Security

## Signal System

The orchestrator uses a 44-signal taxonomy for communication:

### System Signals
- `[HF]` - Health feedback
- `[FF]` - Fatal error
- `[TF]` - Terminal closed
- `[TC]` - Terminal crashed

### Agent Signals
- `[dp]` - Development progress
- `[tg]` - Tests green
- `[cq]` - Code quality passed
- `[iv]` - Implementation verified
- `[aa]` - Admin attention needed

### Workflow Signals
- `[gg]` - Goal clarification
- `[ip]` - Implementation plan
- `[tp]` - Tests prepared
- `[da]` - Done assessment

## Configuration

### Orchestrator Settings
```json
{
  "orchestrator": {
    "mode": "autonomous",
    "parallel": true,
    "maxAgents": 5,
    "autoAssign": true,
    "retryAttempts": 3,
    "timeout": 300000
  }
}
```

### Agent Configuration
```json
{
  "agents": [
    {
      "id": "robo-developer",
      "type": "developer",
      "limit": "100usd10k#robo-developer",
      "provider": "openai",
      "model": "gpt-4",
      "enabled": true
    }
  ]
}
```

## Best Practices

1. **Monitor Resources**: Keep an eye on token usage and costs
2. **Signal Clarity**: Use precise signals for clear communication
3. **Parallel Work**: Enable parallel execution for faster delivery
4. **Context Management**: Ensure PRPs contain all necessary context
5. **Quality Gates**: Don't bypass quality checks for speed

## Troubleshooting

### Common Issues

#### Orchestrator Won't Start
```bash
# Check configuration
prp config validate

# Check dependencies
prp --version

# Check logs
tail -f .prp/logs/orchestrator.log
```

#### Agents Not Responding
- Check agent configuration
- Verify API keys
- Check resource limits
- Review signal history

#### Performance Issues
- Reduce parallel agents
- Optimize PRP scope
- Clear old PRPs
- Check system resources

### Debug Mode
```bash
# Start with debug logging
prp orchestrator --debug --log-level debug

# Enable verbose output
prp orchestrator --verbose

# Check system status
prp orchestrator --status
```

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl+C` - Graceful shutdown
- `Ctrl+Z` - Suspend orchestrator
- `F1` - Help screen
- `F5` - Refresh dashboard

### Navigation
- `Tab` - Next screen/section
- `Shift+Tab` - Previous screen/section
- `↑/↓` - Navigate items
- `Enter` - Select/confirm
- `Esc` - Back/cancel

### Quick Actions
- `n` - New PRP
- `a` - Agent management
- `s` - Signal search
- `c` - Configuration
- `q` - Quit

---

**Previous**: [PRP Init →](./prp-init.md) | **Next**: [How to Contribute →](./how-to-contribute.md)