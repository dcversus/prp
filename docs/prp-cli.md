# PRP CLI

**Command-line interface for PRP project management**

---

## 📋 Previous: [GitHub Registration →](./github-registration.md) | Next: [PRP Init →](./prp-init.md)

---

## Overview

The PRP CLI provides command-line tools for managing PRP projects, initializing workflows, and orchestrating autonomous development.

## Installation

```bash
# Install globally
npm install -g @dcversus/prp

# Verify installation
prp --version
```

## Commands

### Main Commands

#### `prp`
The main entry point command.

```bash
# Show help
prp --help

# Check version
prp --version

# List all commands
prp --list-commands
```

#### `prp init`
Initialize a new PRP project.

```bash
# Interactive mode
prp init my-project

# TUI wizard mode
prp init --wizard

# Use specific template
prp init my-project --template typescript

# Skip interactive prompts
prp init my-project --template nestjs --agent robo-developer
```

#### `prp orchestrator`
Start the autonomous development orchestrator.

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

### Configuration Commands

#### `prp config`
Manage configuration settings.

```bash
# Show current config
prp config show

# Set configuration
prp config set agent.limit "100usd10k#robo-developer"

# Get configuration
prp config get orchestrator.parallel
```

#### `prp secret`
Manage secrets and API keys.

```bash
# Add secret
prp secret add openai-api-key

# List secrets
prp secret list

# Remove secret
prp secret remove openai-api-key
```

### Utility Commands

#### `prp status`
Show project status.

```bash
# Show overall status
prp status

# Show PRP status
prp status --prp PRP-001

# Show agent status
prp status --agents
```

#### `prp nudge`
Send signals to agents.

```bash
# Send nudge signal
prp nudge --type progress --message "Keep going!"

# Send to specific agent
prp nudge --agent robo-developer --type review
```

## Configuration

### `.prprc` File Structure
```json
{
  "project": {
    "name": "my-project",
    "description": "Project description",
    "version": "1.0.0"
  },
  "agents": [
    {
      "id": "robo-developer",
      "type": "developer",
      "limit": "100usd10k#robo-developer",
      "provider": "openai"
    }
  ],
  "orchestrator": {
    "mode": "autonomous",
    "parallel": true,
    "maxAgents": 5
  },
  "logging": {
    "level": "info",
    "file": ".prp/logs/prp.log"
  }
}
```

## Resource Limits Format

Resource limits use the format: `{amount}{unit}{type}#{agent/prp}{role?}`

Examples:
- `100usd10k#robo-developer` - $100 USD limit for 10k tokens for robo-developer
- `50eur5k#system-analyst` - 50 EUR limit for 5k tokens for system-analyst
- `200usd20k#PRP-001` - $200 USD limit for 20k tokens for PRP-001

## Environment Variables

```bash
# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# PRP Configuration
PRP_CONFIG_PATH=/path/to/.prprc
PRP_LOG_LEVEL=info
PRP_DEBUG=false

# GitHub Integration
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=username
GITHUB_REPO=repository
```

## Best Practices

1. **Version Control**: Always commit `.prprc` to version control
2. **Secret Management**: Use `prp secret` for sensitive data
3. **Resource Limits**: Set appropriate limits for each agent
4. **Documentation**: Document project-specific configurations

---

**Previous**: [GitHub Registration →](./github-registration.md) | **Next**: [PRP Init →](./prp-init.md)