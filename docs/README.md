# 📚 PRP - Autonomous Development Orchestration

**Transform ideas into deployed software through AI agent coordination. OpenAI orchestrator + Claude agents + signal-based workflow = zero coordination overhead.**

## 🎯 What is PRP?

PRP (Product Requirement Prompts) is a revolutionary methodology that combines living requirement documents with autonomous AI agent orchestration. It eliminates the need for manual project management, sprint planning, and status meetings, enabling continuous autonomous development from idea to deployment.

### Core Innovation
- **Living Requirements**: PRPs evolve with implementation in real-time
- **Signal-Driven Communication**: 44-signal taxonomy eliminates meeting overhead
- **Autonomous Coordination**: AI agents manage dependencies and workflow
- **Zero-Touch Delivery**: From concept to production without human intervention

## 🚀 Quick Start

### Installation
```bash
# Install PRP CLI globally
npm install -g @dcversus/prp

# Initialize a new project
prp init my-project

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

## 📚 Documentation Structure

Our documentation is organized into four main guides:

### 📖 **[USER_GUIDE.md](./USER_GUIDE.md) - Complete Interface Documentation**
*How to work with the PRP application*

**Comprehensive guide covering:**
- CLI interface with all commands and options
- TUI (Terminal User Interface) with layouts and navigation
- Agent system and communication patterns
- Signal system with 44-signal taxonomy
- Configuration management and customization
- Advanced features and troubleshooting

**Perfect for**: Daily users and developers working with PRP

---

### 🧠 **[THEORY.md](./THEORY.md) - PRP Methodology**
*How PRP works as a methodology for autonomous development*

**In-depth exploration of:**
- PRP methodology foundations and principles
- Signal system architecture and taxonomy
- Autonomous agent coordination patterns
- Development workflow integration
- Performance and scalability considerations
- Future evolution and research directions

**Perfect for**: Understanding the why and how behind PRP

---

### 📝 **[PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md) - Mastering Autonomous Communication**
*How to write effective prompts for AI agents*

**Comprehensive prompting techniques:**
- Agent-specific prompting strategies
- Signal-driven communication patterns
- Advanced coordination and conflict resolution
- 100+ prompting settings and recommendations
- Quality validation and best practices
- Templates and real-world examples

**Perfect for**: PRP authors and anyone working with AI agents

---

### 📋 **[README.md](./README.md)** (this file) - Main Project Documentation
*Project overview and navigation guide*

**Key sections:**
- Quick start and installation
- Core concepts and architecture
- Configuration and usage examples
- Community resources and support
- Development and contribution guidelines

**Perfect for**: New users and project overview

## 🏗️ Core Concepts

### Product Requirement Prompts (PRPs)
PRPs are both requirement documents and prompt templates that serve as:
- **Source of Truth**: Absolute authority for requirements and implementation
- **Context Container**: All relevant information, decisions, and progress
- **Communication Hub**: Signal-based progress tracking and coordination
- **Autonomous Executor**: Self-contained instructions for AI agents

### Signal System
The 44-signal taxonomy enables precise agent coordination:
- **Planning Signals**: `[gg]`, `[ff]`, `[rp]`, `[vr]` - Requirements analysis
- **Development Signals**: `[tp]`, `[dp]`, `[bf]`, `[tg]` - Implementation progress
- **Quality Signals**: `[cq]`, `[tr]`, `[cp]`, `[rv]` - Testing and validation
- **Release Signals**: `[pc]`, `[ra]`, `[rl]`, `[ps]` - Deployment and monitoring

### Autonomous Agents
Specialized AI agents with distinct roles:
- **robo-system-analyst**: Requirements analysis and stakeholder communication
- **robo-developer**: Code implementation and technical solutions
- **robo-quality-control**: Testing, validation, and quality assurance
- **robo-ux-ui-designer**: User experience and interface design
- **robo-devops-sre**: Infrastructure, deployment, and reliability

## 🎮 Key Features

### 🏗️ Project Initialization
- Interactive wizard for new and existing projects
- Template-based project scaffolding
- Automatic dependency management
- Git repository setup and configuration
- Development environment validation

### 🔍 Debug Mode
- CI-like console output with verbose logging
- Debug interface with orchestrator integration
- Comprehensive error reporting and troubleshooting
- Performance monitoring and profiling
- Multi-language debugging support

### 🚀 CI/CD Pipeline Management
- Automated workflow validation and setup
- GitHub Actions integration and management
- Build pipeline configuration and optimization
- Test automation and quality enforcement
- Deployment pipeline monitoring

### 💰 Token Accounting
- Real-time token usage tracking
- Cost calculation with provider-specific pricing
- Usage limits and quota management
- Token efficiency optimization
- Comprehensive cost reporting

### 🐙 GitHub Integration
- GitHub SDK integration for API operations
- Pull request creation and management
- Issue tracking and workflow automation
- Repository management and collaboration
- Code review automation

## ⚙️ Configuration

The CLI uses a `.prprc` configuration file for customization:

```json
{
  "name": "my-project",
  "type": "typescript",
  "debug": {
    "enabled": true,
    "level": "verbose"
  },
  "cicd": {
    "platform": "github",
    "autoSetup": true
  },
  "quality": {
    "gates": ["eslint", "prettier", "test"],
    "autoFix": true
  }
}
```

## 🎮 Command Structure

```bash
prp <command> [options]

Commands:
  init          Initialize a new or existing project
  debug         Start debug mode with CI-like output
  build         Build and optimize your project
  test          Run tests and quality checks
  deploy        Deploy your application
  status        Show project and PRP status
  config        Manage CLI configuration
  token         Show token usage and costs
  tui           Launch terminal user interface
```

## 📝 Examples

### Initialize a New TypeScript Project
```bash
prp init my-typescript-app --template typescript --with-eslint --with-prettier
```

### Start Debug Mode
```bash
prp debug --level verbose --output-file debug.log
```

### Run Quality Gates
```bash
prp test --quality-gates --fix-issues
```

### Deploy with CI/CD
```bash
prp deploy --environment production --with-tests
```

## 🌟 Best Practices

1. **Always use `prp init`** for new projects to ensure proper setup
2. **Enable debug mode** during development for better visibility
3. **Configure quality gates** to maintain code quality standards
4. **Use token accounting** to monitor AI operation costs
5. **Leverage GitHub integration** for automated workflows
6. **Keep .prprc updated** with project-specific configurations

## 🚀 Performance Targets

PRP is optimized for high-performance autonomous development:

- **CLI Startup Time**: < 2 seconds
- **Memory Usage**: < 50MB during normal operations
- **Command Response**: < 100ms for basic commands
- **File Operations**: < 50ms for small files
- **Agent Coordination**: < 500ms for cached decisions
- **Context Loading**: < 50ms for cached contexts

## 🛠️ Architecture

### Scanner-Inspector-Orchestrator (SIO) Pattern
- **Scanner**: Monitors files, detects changes, identifies signals
- **Inspector**: Analyzes changes, assesses impact, generates payloads
- **Orchestrator**: Spawns agents, coordinates work, manages context

### Model Context Protocol (MCP)
- Real-time context sharing between agents
- Persistent context across sessions
- Performance optimization through caching
- Cross-agent communication and coordination

### Signal Bus Architecture
- Priority-based message routing (1-10 priority levels)
- Type-safe signal communication
- Comprehensive audit trail
- Conflict resolution and recovery

## 🤝 Community & Support

- **GitHub Repository**: https://github.com/dcversus/prp
- **Issue Tracker**: https://github.com/dcversus/prp/issues
- **Documentation**: https://docs.prp.theedgestory.org
- **Discord Community**: https://discord.gg/prp

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🎯 Where to Go Next

### **New to PRP?**
Start with the **[USER_GUIDE.md](./USER_GUIDE.md)** for comprehensive interface documentation and step-by-step instructions.

### **Want to understand the methodology?**
Read the **[THEORY.md](./THEORY.md)** to understand how PRP works as a methodology for autonomous development.

### **Working with AI agents?**
Master the art of prompting with the **[PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md)** for effective agent communication.

### **Need help?**
Check the troubleshooting section in the User Guide or open an issue on GitHub.