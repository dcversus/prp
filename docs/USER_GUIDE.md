# 📖 PRP User Guide - Complete Interface Documentation

## 🎯 Introduction to PRP

**PRP (Product Requirement Prompts)** is an autonomous development orchestration system that transforms how teams build software. By combining AI agent coordination with signal-based workflows, PRP eliminates manual project management and enables continuous, autonomous development.

### Core Philosophy
- **PRP-First Development**: All work flows through living requirement documents
- **Signal-Driven Progress**: 44-signal taxonomy enables precise agent coordination
- **Zero Coordination Overhead**: OpenAI orchestrator + Claude agents work autonomously
- **Continuous Delivery**: From idea to deployed software without manual intervention

## 🚀 Quick Start Guide

### Installation and Setup

```bash
# Install PRP CLI globally
npm install -g @dcversus/prp

# Initialize a new project
prp init my-project --template typescript

# Start autonomous development
cd my-project
npm run dev
```

### What Happens During Initialization
1. **Project Analysis**: PRP scans existing files and auto-populates configuration
2. **Template Setup**: Creates project structure with best-practice configurations
3. **Agent Configuration**: Sets up AI agents and orchestration system
4. **Git Integration**: Initializes repository with PRP-specific workflows
5. **Development Environment**: Launches orchestrator to begin autonomous work

## 🖥️ CLI Interface Documentation

### Core Commands Structure

The PRP CLI follows a consistent pattern: `prp <command> [options]`

#### **Project Initialization**
```bash
# Initialize new project with interactive wizard
prp init my-project

# Initialize with specific template
prp init my-project --template typescript --yes

# Initialize existing project for PRP
prp init . --existing --description "Add PRP to existing codebase"
```

**Interactive Wizard Features:**
- **Smart Detection**: Reads existing package.json, README, LICENSE files
- **Field Validation**: Real-time validation with helpful error messages
- **Intelligent Defaults**: Context-aware suggestions based on project structure
- **Configuration Import**: Respects existing .prprc files
- **CI Environment Detection**: Automatically blocks interactive prompts in CI

#### **Debug Mode**
```bash
# Start debug mode with CI-like output
prp debug --level verbose --output-file debug.log

# JSON output for parsing
prp debug --format json --quiet

# Monitor specific PRPs
prp debug --monitor PRP-001,PRP-007 --follow
```

**Debug Mode Features:**
- **Real-time Monitoring**: Live system status updates every 30 seconds
- **Signal History**: Complete audit trail of all agent communications
- **Performance Metrics**: Memory usage, token consumption, processing times
- **Agent Status**: Current state of all spawned agents
- **Keyboard Controls**: CTRL+C to exit, CTRL+D for orchestrator integration

#### **Build and Test Commands**
```bash
# Build project with quality gates
prp build --quality-gates --fix-issues

# Run comprehensive test suite
prp test --coverage --integration --e2e

# Lint and format code
prp lint --fix --format json
```

#### **Deployment and CI/CD**
```bash
# Deploy with validation
prp deploy --environment production --validate --with-tests

# CI/CD pipeline management
prp ci --validate-pipeline --run-workflows

# Status monitoring
prp status --detailed --include-prps --show-tokens
```

### Global Options

Available on all commands:
```bash
--ci              # CI mode (no interactive prompts, JSON output)
--debug           # Enable debug logging
--log-level <level> # error, warn, info, debug, verbose
--no-color        # Disable colored output
--log-file <path> # Write logs to file
--mcp-port <port> # MCP server port for context sharing
```

## 🎛️ TUI (Terminal User Interface) Documentation

### Launching TUI
```bash
# Start TUI interface
prp tui

# Start with specific layout
prp tui --layout orchestrator

# Start with dark/light theme
prp tui --theme dark
```

### TUI Layout Architecture

#### **Main Orchestrator Screen**
```
HF ⧗ 2025-11-06 15:30:45
MYPROJECT  ⌁ /Users/dcversus/Documents/GitHub/myproject

system · 2025-11-06 15:30:40
{ startup: true, prpCount: 5, readyToSpawn: true }

scanner · 2025-11-06 15:30:42
{ detected: [fs-change,new-branch], count: 2 }

inspector · 2025-11-06 15:30:44
{ impact: high, risk: 7, files: [PRPs/PRP-001.md], why: implementation ready }

> Analyse current status

  ♪ · i need some time, please wait... <3

♫ · RUNNING · prp-001-bootstrap#robo-dev · implement CLI · T–00:12 · DoD 67%
    CoT: implementing command structure...
  ⎿ commit staged: 2 files
  tokens=12.4k · active=00:01:23
```

#### **Screen Layouts**
1. **Orchestrator Screen** (Main): System overview and agent coordination
2. **PRP Context Screen**: Detailed PRP information and progress
3. **Agent Screen**: Full-screen agent interaction and debugging

#### **Responsive Design**
- **Minimum Width**: 80 columns
- **Maximum Width**: Unlimited (8K+ support)
- **Auto-reflow**: Content adapts to terminal size
- **Multi-screen**: Multiple layouts on ultrawide displays

### Visual Elements and Color Scheme

#### **Color System (Dark Theme)**
- **Orchestrator (Orange)**: `#FF9A38` active, `#C77A2C` dim, `#3A2B1F` background
- **Developer (Blue)**: `#61AFEF` active, `#3B6D90` dim, `#1D2730` background
- **Quality Control (Red)**: `#E06C75` active, `#7C3B40` dim, `#321E20` background
- **System Analyst (Brown)**: `#C7A16B` active, `#7A6445` dim, `#2C2419` background
- **DevOps/SRE (Green)**: `#98C379` active, `#5F7B52` dim, `#1F2A1F` background
- **UX/UI Designer (Pink)**: `#D19A66` active, `#8A5667` dim, `#2E2328` background

#### **Signal Visualization**
- **Active Signals**: `[gg]`, `[dp]`, `[tg]` - use role colors
- **Placeholders**: `[  ]` - neutral gray `#6C7078`
- **Animation**: Signal waves slide left→right during scanning
- **Progress**: Active cells animate at 8fps `[F ] → [  ] → [ F] → [FF]`

#### **Musical State Indicators**
- **Start/Prepare**: `♪` (single note)
- **Running/Progress**: `♩`, `♪`, `♬` (pair), `♫` (final/steady)
- **Double-agent**: `♬` or paired symbols with thin space
- **Idle Blink**: `♫` blinks to chip melody beat

### Interactive Features

#### **Navigation**
- **Tab**: Cycle through screen layouts
- **Arrow Keys**: Navigate within screens
- **Enter**: Select items, expand details
- **Escape**: Return to previous level
- **Ctrl+C**: Exit TUI

#### **Input System**
Fixed bottom input with context-aware suggestions:
```
> Analyse current status
   └─ Available commands: analyse, status, spawn, config
```

#### **Status Line**
Shows system status, active agents, and keyboard shortcuts:
```
Status: 5 agents running | Tokens: 45.2k | [Tab: Layouts] [Ctrl+C: Exit] [F1: Help]
```

## 🤖 Agent System Documentation

### Agent Types and Roles

#### **robo-system-analyst**
- **Purpose**: Requirements analysis and PRP creation
- **Signals**: `[gg]`, `[ff]`, `[rp]`, `[vr]`, `[rc]`
- **Portuguese Personality**: "Encantado! ✨", "Incrível! 🎉"
- **Specialization**: Business requirements, stakeholder communication

#### **robo-developer**
- **Purpose**: Code implementation and technical solutions
- **Signals**: `[tp]`, `[dp]`, `[bf]`, `[cd]`, `[mg]`
- **Personality**: Pragmatic, focused
- **Specialization**: TDD, clean code, architecture

#### **robo-quality-control**
- **Purpose**: Testing, validation, and quality assurance
- **Signals**: `[tr]`, `[tg]`, `[cq]`, `[cp]`, `[rv]`
- **Personality**: Skeptical, thorough
- **Specialization**: Test automation, quality gates

#### **robo-ux-ui-designer**
- **Purpose**: User experience and interface design
- **Signals**: `[du]`, `[ds]`, `[dr]`, `[dh]`, `[da]`
- **Personality**: Visual, aesthetic
- **Specialization**: User research, design systems

#### **robo-devops-sre**
- **Purpose**: Infrastructure, deployment, and reliability
- **Signals**: `[id]`, `[cd]`, `[mo]`, `[ir]`, `[so]`
- **Personality**: Systematic, reliability-focused
- **Specialization**: CI/CD, monitoring, security

### Agent Lifecycle

#### **Spawning Process**
1. **Signal Detection**: Orchestrator identifies need for agent
2. **Context Loading**: Agent receives PRP context and requirements
3. **Initialization**: Agent loads tools, models, and configuration
4. **Task Execution**: Agent works on assigned tasks with progress signals
5. **Cleanup**: Agent cleans up resources and reports completion

#### **Communication Patterns**
- **Signal Bus**: Priority-based message routing (1-10 priority levels)
- **Context Sharing**: Real-time information sharing via MCP protocol
- **Progress Updates**: Continuous signal emission for transparency
- **Conflict Resolution**: Orchestrator mediates competing priorities

## 📡 Signal System Documentation

### Signal Taxonomy

#### **Planning Signals**
- `[gg]` Goal Clarification - Requirements need refinement
- `[ff]` Goal Not Achievable - Technical constraints identified
- `[rp]` Ready for Preparation - Analysis complete, ready for planning
- `[vr]` Validation Required - External approval needed

#### **Research Signals**
- `[rr]` Research Request - Unknown dependencies need investigation
- `[vp]` Verification Plan - Multi-stage validation strategy
- `[ip]` Implementation Plan - Task breakdown and dependencies
- `[er]` Experiment Required - Technical uncertainty validation
- `[rc]` Research Complete - Investigation finished with findings

#### **Development Signals**
- `[tp]` Tests Prepared - TDD test cases written
- `[dp]` Development Progress - Implementation milestone
- `[bf]` Bug Fixed - Issue resolved and tested
- `[br]` Blocker Resolved - Technical dependency cleared
- `[tw]` Tests Written - Unit/integration tests implemented

#### **Quality Signals**
- `[cq]` Code Quality - Linting/formatting passed
- `[tr]` Tests Red - Test suite failing
- `[tg]` Tests Green - All tests passing
- `[cf]` CI Failed - Pipeline failure
- `[cp]` CI Passed - Pipeline success

#### **Release Signals**
- `[pc]` Pre-release Complete - All checks ready
- `[rv]` Review Passed - Code review approved
- `[ra]` Release Approved - Authorization received
- `[mg]` Merged - Code integrated successfully
- `[rl]` Released - Deployment complete

### Signal Workflow Example

```
[gg] Goal clarification needed - API endpoints undefined
    ↓
[rr] Research request - Investigate REST vs GraphQL
    ↓
[rc] Research complete - GraphQL recommended for flexibility
    ↓
[ip] Implementation plan - Schema, resolvers, tests
    ↓
[tp] Tests prepared - GraphQL schema test suite
    ↓
[dp] Development progress - Resolvers implemented
    ↓
[tg] Tests green - All GraphQL tests passing
    ↓
[cq] Code quality - Linting and formatting passed
    ↓
[ra] Release approved - Ready for deployment
```

## ⚙️ Configuration Management

### .prprc Configuration File

```json
{
  "name": "my-project",
  "type": "typescript",
  "description": "A TypeScript project with PRP orchestration",
  "version": "1.0.0",

  "debug": {
    "enabled": true,
    "level": "info",
    "outputFile": "logs/debug.log",
    "format": "json"
  },

  "cicd": {
    "platform": "github",
    "autoSetup": true,
    "workflows": ["test", "build", "deploy"],
    "qualityGates": ["eslint", "prettier", "coverage"]
  },

  "quality": {
    "gates": ["eslint", "prettier", "test", "coverage"],
    "autoFix": true,
    "thresholds": {
      "coverage": 80,
      "complexity": 10
    }
  },

  "orchestrator": {
    "enabled": true,
    "scanInterval": 30000,
    "maxAgents": 5,
    "contextWindow": "shared"
  },

  "tokens": {
    "provider": "openai",
    "model": "gpt-4",
    "maxTokens": 100000,
    "costTracking": true
  },

  "ui": {
    "theme": "dark",
    "colors": {
      "accent": "#FF9A38",
      "success": "#B8F28E",
      "error": "#FF5555"
    }
  }
}
```

### Configuration Commands

```bash
# Show current configuration
prp config show

# Set configuration value
prp config set debug.level verbose

# Get configuration value
prp config get quality.gates

# Edit configuration interactively
prp config edit

# Reset to defaults
prp config reset
```

### Environment Variables

```bash
# PRP configuration
PRP_CONFIG_PATH=/path/to/.prprc
PRP_LOG_LEVEL=verbose
PRP_DEBUG_MODE=true

# API keys
OPENAI_API_KEY=your_openai_key
GITHUB_TOKEN=your_github_token

# Development
PRP_MCP_PORT=3000
PRP_NO_COLOR=false
```

## 🔍 Advanced Features

### Token Accounting and Cost Monitoring

```bash
# Show token usage summary
prp token status

# Detailed usage by agent
prp token usage --by-agent --detailed

# Cost projection
prp token cost --project --next-month

# Set limits
prp token limit set --daily 50 --monthly 1000
```

**Token Monitoring Features:**
- **Real-time Tracking**: Live token consumption monitoring
- **Cost Calculation**: Provider-specific pricing models
- **Usage Analytics**: Historical trends and projections
- **Budget Management**: configurable limits and alerts
- **Efficiency Optimization**: Suggestions for cost reduction

### GitHub Integration

```bash
# Create pull request
prp pr create --title "Feature: Add user authentication" --draft

# Update pull request
prp pr update --add-reviewers --sync-status

# Link PRP to issue
prp issue link PRP-001 123

# Sync commits
prp sync --commits --status
```

**GitHub Features:**
- **Automated PRs**: Create pull requests from PRP completion
- **Issue Tracking**: Link PRPs to GitHub issues
- **Status Sync**: Update GitHub status from PRP progress
- **Review Automation**: Automated code review assignments
- **Release Management**: Semantic versioning and releases

### Quality Gates

```bash
# Run all quality gates
prp quality check --all --fix

# Individual quality checks
prp quality lint --fix --format json
prp quality test --coverage --integration
prp quality security --scan-dependencies

# Quality report
prp quality report --output quality-report.json
```

**Quality Gate Features:**
- **Multi-language Support**: TypeScript, JavaScript, Python
- **Customizable Rules**: Configure quality standards
- **Automated Fixes**: Auto-fix common issues
- **Coverage Tracking**: Test coverage monitoring
- **Security Scanning**: Vulnerability detection

### MCP (Model Context Protocol) Integration

```bash
# Start MCP server
prp mcp start --port 3000

# Connect agents
prp mcp connect --agent robo-developer

# Share context
prp mcp share --context PRP-001 --agents all

# Monitor connections
prp mcp status --show-traffic
```

**MCP Features:**
- **Context Sharing**: Real-time information exchange
- **Agent Coordination**: Cross-agent communication
- **State Management**: Persistent context across sessions
- **Performance Optimization**: Reduced redundant processing

## 📊 Monitoring and Analytics

### System Monitoring

```bash
# Real-time monitoring
prp monitor --real-time --refresh 5

# Performance metrics
prp monitor performance --memory --cpu --tokens

# Agent status
prp monitor agents --detailed --include-idle

# PRP progress
prp monitor prps --status --signals --timeline
```

### Analytics Dashboard

```bash
# Generate analytics report
prp analytics generate --period 30d --output report.html

# Team productivity
prp analytics team --by-agent --by-prp

# Cost analysis
prp analytics cost --by-project --trends

# Quality trends
prp analytics quality --coverage --bugs --fixes
```

## 🛠️ Troubleshooting Common Issues

### Debug Mode Issues

**Problem**: Debug mode not starting
```bash
# Check configuration
prp config show debug

# Enable verbose logging
prp debug --level verbose --diagnose

# Check system requirements
prp doctor --check-dependencies
```

**Problem**: No output in debug mode
```bash
# Ensure proper log level
prp debug --level info

# Check file permissions
prp debug --log-file /tmp/debug.log

# Verify JSON format
prp debug --format json --validate
```

### Agent Issues

**Problem**: Agents not spawning
```bash
# Check orchestrator status
prp orchestrator status

# Verify agent configuration
prp config get orchestrator

# Restart agent system
prp orchestrator restart
```

**Problem**: Agent communication failures
```bash
# Check signal bus
prp monitor signals --active

# Verify MCP connections
prp mcp status

# Reset agent connections
prp orchestrator reset-agents
```

### Configuration Issues

**Problem**: Invalid .prprc configuration
```bash
# Validate configuration
prp config validate

# Show syntax errors
prp config show --errors-only

# Reset to defaults
prp config reset --backup
```

### Performance Issues

**Problem**: Slow response times
```bash
# Check system resources
prp monitor performance --memory --cpu

# Optimize configuration
prp optimize --cache --performance

# Clear cache
prp cache clear --all
```

## 📚 Best Practices

### Project Organization

1. **PRP Structure**: Keep PRPs in dedicated `PRPs/` directory
2. **Naming Convention**: Use `PRP-XXX-descriptive-title.md` format
3. **Signal Hygiene**: Always leave progress signals with detailed comments
4. **Context Management**: Maintain shared context across related PRPs

### Development Workflow

1. **PRP-First**: Always create/update PRP before implementation
2. **Signal-Driven**: Use signals for all progress communication
3. **TDD Approach**: Write tests before implementation
4. **Continuous Integration**: Keep CI/CD pipelines updated

### Team Collaboration

1. **Clear Signals**: Use descriptive signal comments
2. **Context Sharing**: Share relevant context between agents
3. **Progress Tracking**: Monitor PRP progress regularly
4. **Quality Gates**: Enforce quality standards consistently

### Resource Management

1. **Token Optimization**: Monitor and optimize token usage
2. **Agent Lifecycle**: Clean up idle agents
3. **Cache Management**: Regular cache cleanup
4. **Performance Monitoring**: Continuous performance tracking

## 🔗 Reference Materials

### CLI Command Reference
- **init**: Project initialization and setup
- **debug**: Debug mode with monitoring
- **build**: Build project with quality gates
- **test**: Run tests and coverage
- **deploy**: Deploy with validation
- **status**: Show system and PRP status
- **config**: Configuration management
- **token**: Token usage and cost tracking
- **monitor**: Real-time monitoring
- **analytics**: Analytics and reporting
- **tui**: Terminal user interface
- **orchestrator**: Agent orchestration control
- **mcp**: Model Context Protocol management

### Signal Reference
Complete 44-signal taxonomy with usage patterns and examples available in the **Prompting Guide**.

### Configuration Reference
Detailed .prprc configuration options and environment variables in the **Theory Document**.

---

## 🎯 Getting Help

### Command Line Help
```bash
prp --help                    # General help
prp <command> --help         # Command-specific help
prp config --help           # Configuration help
```

### Community Resources
- **GitHub Repository**: https://github.com/dcversus/prp
- **Issue Tracker**: https://github.com/dcversus/prp/issues
- **Documentation**: https://docs.prp.theedgestory.org

### Troubleshooting
- **Diagnostic Tool**: `prp doctor --full-scan`
- **Log Analysis**: `prp logs analyze --errors-only`
- **Performance Profile**: `prp profile --export profile.json`

This User Guide provides comprehensive documentation for working with the PRP system. For methodology details, see the **Theory Document**. For prompting best practices, see the **Prompting Guide**.