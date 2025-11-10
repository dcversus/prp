# What is PRP? ♫

**Understanding the methodology that transforms software development through living requirements and autonomous orchestration**

---

## 📋 Previous: [Welcome →](./readme.md) | Next: [Context-Driven Development →](./context-driven-development.md)

---

## 🎯 The Core Concept

PRP (Product Requirement Prompts) reimagines software development by treating requirements as **living documents** that evolve with implementation. Unlike traditional static PRDs, PRPs are both requirements and executable prompts that drive autonomous AI agents.

### The Problem PRP Solves

Traditional development suffers from:
- **Static Requirements**: PRDs become outdated before implementation completes
- **Communication Overhead**: Constant meetings, standups, and status updates
- **Context Switching**: Developers lose focus switching between tools and tasks
- **Coordination Complexity**: Managing dependencies across teams and timelines
- **Quality Variability**: Inconsistent standards and manual review processes

### The PRP Solution

PRP methodology addresses these through:
- **Living Requirements**: PRPs evolve with implementation in real-time
- **Signal-Driven Communication**: 44-signal taxonomy eliminates meeting overhead
- **Autonomous Coordination**: AI agents manage dependencies and workflow
- **Continuous Quality**: Built-in quality gates and automated testing
- **Zero-Touch Delivery**: From concept to production without human intervention

---

## 🏗️ PRP Anatomy

A PRP is both a **requirement document** and a **prompt template** that serves as:

1. **Source of Truth** - Absolute authority for requirements and implementation
2. **Context Container** - All relevant information, decisions, and progress
3. **Communication Hub** - Signal-based progress tracking and coordination
4. **Autonomous Executor** - Self-contained instructions for AI agents

### PRP Structure

```markdown
# PRP-XXX: [Descriptive Title]

> User quote with all requirements - ABSOLUTE MANDATORY SOURCE OF TRUTH

## progress
[AA] Signal-based progress tracking with comments and timestamps

## description
Clear description perfectly matched to user requirements

## dor (Definition of Ready)
- [ ] Checklist items for preparation phase

## dod (Definition of Done)
- [ ] Checklist items with measurable outcomes
- [ ] | VERIFIED with (test)[path/to/test] confirming implementation

## pre-release checklist
- [ ] Quality assurance items
- [ ] Documentation requirements

## post-release checklist
- [ ] Production validation items
- [ ] Monitoring and maintenance

## plan
- [ ] Implementation steps with file tracking
- [ ] VERIFICATION steps for each change

--
## research materials
### research date/time
> Summary with implementation references
```

---

## 🎵 The Three-Layer Architecture

### 1. **Scanner (Tuner) ♪**
- **Monitors**: File system changes, git events, external triggers
- **Emits Signals**: Changes detected, patterns identified
- **Maintains**: Real-time awareness of project state

### 2. **Inspector (Critic) ♩**
- **Analyzes**: Signals from Scanner, adds context
- **Classifies**: Signal types, priorities, and impact
- **Enriches**: Signals with relevant context and history

### 3. **Orchestrator (Conductor) ♫**
- **Coordinates**: Agent assignments and dependencies
- **Manages**: Workflow and task distribution
- **Ensures**: Progress toward Definition of Done

### 4. **Agents (Players) ♬**
- **Execute**: Specific tasks based on PRP instructions
- **Specialize**: Development, QA, DevOps, UX/UI roles
- **Report**: Progress through signal system

---

## 📊 The Signal System

PRP uses a 44-signal taxonomy for precise communication:

### System Signals
- `[HF]` - Health feedback (orchestration cycle start)
- `[FF]` - Fatal error (system corruption)
- `[TF]` - Terminal closed (graceful session end)
- `[TC]` - Terminal crashed (process failure)

### Agent Signals
- `[dp]` - Development progress
- `[tg]` - Tests green
- `[cq]` - Code quality passed
- `[iv]` - Implementation verified
- `[aa]` - Admin attention needed
- `[ap]` - Admin preview ready

### Workflow Signals
- `[gg]` - Goal clarification
- `[ip]` - Implementation plan
- `[tp]` - Tests prepared
- `[da]` - Done assessment

Each signal includes:
- **Context**: What triggered the signal
- **Priority**: Urgency and impact level
- **Action**: Required next steps
- **Metadata**: Relevant files, PRPs, and decisions

---

## 🔄 The PRP Workflow

### 1. **Creation & Analysis**
- User provides initial requirements
- robo-system-analyst researches domain
- Complete PRP drafted with DoD/DoR

### 2. **Preparation & Planning**
- Requirements refined into implementable tasks
- Implementation plan created with dependencies
- Technical feasibility validated

### 3. **Implementation**
- TDD approach with tests first
- Incremental commits with clear progression
- Continuous signal-driven progress updates

### 4. **Verification & Testing**
- Comprehensive test suite execution
- Bug fixing and quality validation
- CI/CD pipeline success

### 5. **Release & Deployment**
- Requirements validation complete
- Stakeholder approval received
- Merge to production with monitoring

### 6. **Post-Release**
- Production health monitoring
- Incident handling if needed
- Lessons learned documented

---

## 💡 Key Innovations

### Living Requirements
- PRPs update in real-time as implementation progresses
- No version mismatch between requirements and code
- Continuous alignment between business needs and technical delivery

### Signal-Driven Communication
- Eliminates 90% of meetings and status updates
- Precise, actionable communication through structured signals
- Complete audit trail of all decisions and progress

### Autonomous Coordination
- AI agents self-organize based on PRP instructions
- No human project management required
- Zero-touch delivery from concept to production

### Quality by Design
- Built-in quality gates in every PRP
- Automated testing at every step
- Continuous integration and deployment

---

## 🎯 Why PRP Works

1. **Reduces Cognitive Load**
   - Developers focus on one task at a time
   - Clear context and instructions in every PRP
   - No need to remember meeting outcomes or decisions

2. **Eliminates Waste**
   - No unnecessary meetings or status updates
   - Automated testing and quality checks
   - Direct path from requirement to deployment

3. **Increases Velocity**
   - Parallel execution through agent coordination
   - No waiting for human approvals or handoffs
   - Continuous integration and delivery

4. **Improves Quality**
   - Living requirements prevent scope drift
   - Built-in quality gates and testing
   - Full traceability from requirement to code

5. **Enhances Transparency**
   - Complete signal history
   - Real-time progress visibility
   - Clear decision documentation

---

## 📈 Real-World Impact

Teams using PRP report:
- **70% reduction** in meeting time
- **3x faster** delivery of features
- **90% fewer** production bugs
- **100% traceability** from requirements to code
- **Zero project management** overhead

---

<div style="text-align: center; margin-top: 3rem; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
  <strong>🎵 Remember:</strong><br>
  Requirements are not documents to be written and forgotten.<br>
  They are living instructions that guide autonomous development.<br>
  <em>"Scan. Hear. Decide. Play. One bar at a time."</em>
</div>

---

## 📚 Further Reading

- **[Context-Driven Development](./context-driven-development.md)** - How PRP works in practice
- **[Human as Agent](./human-as-agent.md)** - Your role in autonomous development
- **[PRP CLI](./prp-cli.md)** - Command-line tools for PRP management

---

**Previous**: [Welcome →](./readme.md) | **Next**: [Context-Driven Development →](./context-driven-development.md)