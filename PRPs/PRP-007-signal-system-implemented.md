# PRP-007: Complete Signal System Implementation - Scanner/Inspector/Orchestrator Framework

> req: scanner NOT an a llm, but actualy an layer of tools what should parse incoming changes AND by default just read all [XX] with signals in log - some signal appear to be in commit? in edit? in logs? then scanner should take all there it happen and analyticaly sort between -> need to check \ already resolved \ new signals. pushing this to events bus. event is bus with signals; also scanner connects all guidelince scaner addapters at the same time give them api to read strim/filter it or just get most recent data as abstraction layer; and adaptors in scanner should have api to emit any signal they want to event bus; scanner always look for every tmux/agents, ALSO with different filters keeping all logs from inspector and orchestrator, their token usage/current context/token destribution at current time and more, scaner should always keep track on that data AND if we open debug mode we actualy should see ALL raw output of scanner, cause he first make syncronisations. the next element-layouer is a NEXT is inspector who is llm with base prompt and for each signal we have we should have guidelince inspector prompt, what we also connects to inspector prompt with - inspector-prp-context what should have proper limit and be compacted by special compaction prompt, then should be runned special adapter with auto requests, using scanner state and methods they just make ordinary preparation data, they gather different info and can use all inspector.shared inspector.infra inspecor.XX (signal name tools! its' just simple midlewares what each adapter dynamicaly connects for each signal. they can work with guthub api, or openai api or anything, they would collect a BIG amount data (small for low priority - bigger for incidents FF/BB/AA from agents.md)  some text/logs/changes and previus. the next all this gatheret context + previus context of inspector result (always result of inspector is cap 40k!) + system inspector prompt + guideline prompt and structured response with all classification questions we need do like calculate confidence score, acceptance prp score (1-100),  and comply what in each signal we verify and analyse all needed to reaction. structure output will help us preserve all needed to decition making result of inspector is always with result 40k limit for llm; inspector properly prepare and clasify all info into signals bus, inspector mechanism should be responsible for signal merging, conflict resolving and matching signals with artifacts needed for orchestration. during scaner to inspector we FiFo event bus, but with inspector - orchestrator we always clasify signal priority and take most important signal to work, orchestrator is a layer with llm what: { tokenCap: 200_000; // 200K tokens total, basePrompt: 20_000; // 20K tokens, guidelinePrompt: 20_000; // 20K tokens, agentsmd: 10_000; // 10K tokens, notesPrompt: 20_000; // 20K tokens, inspectorPayload: 40_000; // 40K tokens, prp: 20_000; // 20K tokens, sharedContext: 10_000; // 10K tokens, prpContext: 70_000; // 70K tokens } AND this should be exposed to configuration, so orchestrator take all related info and CoT on solution with guideline promt orchestrator should have a list of instruction what need to follow, then notes is a collection of prompts in markdown for special situations with signal combinations, some kind pattern matching in file name to .md what contain some kind pattern what we can match and apply note prompt to orchestrator instructions to resolve complex dead-end and stored in /shared/notes/*.md. SO guidelines then is a horisontal slice what contain: scanner adapter (special detection mechanism, to pre-catch signals before they written down and emit eirlier, inspector prompt wwith instructions on aggregation and classification and inspector adapter as endpoint-like takes a time to make some requests or get scanner state to arrange all data around exact signal we working on, then inspector should make decidion making, protect from dublicates and put new signal to signals bus with classified data and priority. we need work with tmux and read all logs/statuses/events from terminal and keep all in persisted storage for debug, including all changes in worktree happen, that stream flow of scanner what should be very optemised to extract [XX] patterns and some complex slowwest analyse for some signals with sometime polling another servise. orchestrator CoT update status on prp with it's what was done, what expected, how it working, what next tasks, any blockers?, any incident? scheme to shared prp context. so each prp should share same token limit space. shared prp context needed for cooperation and orchestrator always report to it in one of CoT after all tool calls and prefius reflection right before sending message to agent via special tool, what should be a wrapper - take instructions -> recieve properly adapted message for agent-type agent use, orchestrator should know all agents avaiable details including token caps, strong sides, features enabled, signals what can resolve etc, we need presets for claude code/codex/gemini/amp/aider/open code/etc with some helpers for each how to general config from agents.md, .mcp.json, .prprc transform to needed files and formats and preserve their updates then needed, so, we should be able during init set glm and claude both, and both use agent-type claude code, so each time we call agent work, some script should call helpers and force before run all to be in place; .prprc should provide all configs of guidelines and agents configuration to be used. token limits and caps -> we need preserve in scanner account of all tokens we waste in inspector, orchestrator and all prp and agents and agent-type, we need keep optimal amount info but be able to fust get status for some specific time slices (1m/5m/30min/1h/6/12) and create a graph when needed for session, prp or all time, need adjust to TUI; token limits - prprc config of agent with different configuration about limitation, we have two agent caps - compact limit - waste limit, compact limit should be calculaed on historical data or based on model presets optimal values with compacting instructions, when waste limits on historical data calculates then catches  dayly/weekly limit approaching, and with settings based on agent tariff public data (per model/subscription type) AND money management mechanism, with tariffs per agent and proper accounting for all system parts and warning and stop values for prprc. eg users should be able set daily limit to all agents to be $30 shared or each (depends on place where define) and be daily / weekly / monthly; all this internal signals should have codes and resolve instructions with proper guidelines - guideline = signal; and properly reacts on compacts and warnings or limits; same for agents, same for inspector and orchestrator (eg orchestrator have no money = [FM], looking for local llm runned or run something local or stop working, as eg); our work and architecture should be implemented right we have base signals for flow prp -> deploy to gh-page or kubectl with failover system, proper user interaction feedback and mechanism to send (invoke) orchestrator with direct message or mcp. Build scheme based on that

## Signal System Implementation

### Core Scanner Signal Detection
- `/src/scanner/signal-detector.ts` | Complete signal detection engine with 75+ patterns | Advanced pattern matching with context awareness and caching [da]
- `/src/scanner/enhanced-signal-detector.ts` | Enhanced signal detection with optimizations | Performance improvements and advanced detection algorithms [dp]
- `/src/scanner/enhanced-signal-detector-with-patterns.ts` | Pattern-based signal detection system | Configurable signal patterns with priority scoring [dp]

### Orchestrator Signal Processing
- `/src/orchestrator/signal-processor.ts` | High-performance signal processing engine | Batching, memory management, and optimized throughput [da]
- `/src/orchestrator/signal-router.ts` | Advanced signal routing and distribution system | Priority handling and intelligent signal distribution [da]
- `/src/orchestrator/signal-aggregation.ts` | Signal aggregation and bulk delivery system | Optimizes orchestrator coordination and reduces notification noise [da]
- `/src/orchestrator/signal-resolution-engine.ts` | Comprehensive signal-to-action mapping system | Decision trees, workflow orchestration, and agent coordination [da]
- `/src/orchestrator/shared-scheduler.ts` | Enhanced with task distribution from signals | Signal-to-task conversion with automatic agent assignment [dp]
- `/src/orchestrator/tool-registry.ts` | Enhanced with agent capability management | Tool access control based on agent capabilities and task requirements [dp]
- `/src/orchestrator/cot-processor.ts` | Enhanced with task chain-of-thought processing | Task-aware CoT generation and result integration [dp]

### Shared Signal Infrastructure
- `/src/shared/signals/index.ts` | Signal system entry point and exports | Main signal interface with complete type definitions [da]
- `/src/shared/signals/registry.ts` | Signal registration and lookup system | Centralized signal type management [da]
- `/src/shared/signals/processor.ts` | Core signal processing utilities | Signal validation and transformation logic [da]
- `/src/shared/signals/tracker.ts` | Signal lifecycle tracking system | Monitors signal status and progression [da]
- `/src/shared/signals/priority-queue.ts` | Signal prioritization system | Manages signal ordering based on importance [da]
- `/src/shared/signals/ephemeral-signal-system.ts` | Temporary signal handling system | Real-time event signal management [da]

### Task Management System
- `/src/shared/tasks/types.ts` | Complete task management type definitions | TaskDefinition, TaskAssignment, TaskResult interfaces [da]
- `/src/shared/tasks/task-manager.ts` | Central task management system | Task creation, assignment, and completion tracking [da]
- `/src/shared/tasks/index.ts` | Task system entry point and exports | Main task management interface [da]

### Audio Feedback Integration
- `/src/audio/signal-orchestra.ts` | Audio feedback system for signals | Sound generation and notification cues [da]
- `/src/audio/__tests__/signal-orchestra.test.ts` | Audio system test coverage | Comprehensive validation of sound generation [tw]

### Performance and Monitoring
- `/src/shared/performance/signal-processor.ts` | Performance-optimized signal processing | Enhanced signal processing with caching strategies [dp]

### Test Infrastructure
- `/tests/unit/signal-system.test.ts` | Signal system unit tests | Core signal processing validation [tw]
- `/tests/integration/signal-flow.test.ts` | End-to-end signal flow tests | Complete signal lifecycle validation [tw]
- `/src/shared/scanner/__tests__/signal-parser.test.ts` | Signal parsing validation | Pattern matching and extraction tests [tw]
- `/debug/orchestrator-scanner-inspector/step-04-task-distribution/test-integration.ts` | Task distribution integration tests | Comprehensive task creation, assignment, and completion validation [tw]

## System Architecture

### Signal Processing Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     SCANNER     │───▶│    INSPECTOR    │───▶│  ORCHESTRATOR   │
│                 │    │                 │    │                 │
│ • Signal Detect │    │ • Context Analyze│    │ • Resolution    │
│ • Pattern Match │    │ • LLM Process   │    │ • Agent Action  │
│ • Event Emit    │    │ • Signal Score   │    │ • Tool Execute  │
│ • Real-time     │    │ • 40K Limit      │    │ • Status Update │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
  │ PRP Files   │        │ Guidelines   │        │ Agents      │
  │ Git History │        │ Prompts      │        │ Tools       │
  │ Logs        │        │ Context      │        │ Workflows   │
  └─────────────┘        └─────────────┘        └─────────────┘
```

### Token Distribution and Caps
- **Inspector cap**: 1M tokens, no tools, separate LLM config in .prprc
  - Inspector base prompt: 20K
  - Inspector guideline prompt: 20K
  - Context: Remaining tokens

- **Orchestrator cap**: 200K tokens, tools, reasoning, CoT, separate LLM config in .prprc
  - Orchestrator base prompt: 20K
  - Orchestrator guideline prompt: 20K
  - AGENTS.md: 10K
  - Notes prompt: 20K
  - Inspector payload: 40K
  - PRP: 20K
  - Shared context: 10K
  - PRP context (CoT/Tool calls): 70K

## Implementation Status

### Complete Features ✅
- Real-time signal detection and pattern matching for 75+ signals
- LLM-powered signal classification with 40k payload limits
- Chain-of-thought reasoning and decision making
- Multi-agent coordination with parallel execution
- Signal routing and aggregation systems
- Comprehensive resolution engine with decision trees
- Audio feedback system for signal notifications
- Performance optimization and caching strategies
- Complete test infrastructure coverage

### Next Steps [oa]
- Enhanced error handling and recovery mechanisms
- Additional guideline implementations for edge cases
- Performance optimization for large-scale deployments
- Documentation and example configurations
- Integration with external monitoring systems

--
Architecture

The signal system follows a three-layer architecture:

1. **Scanner Layer**: Non-LLM signal detection and pattern matching
2. **Inspector Layer**: LLM-powered signal analysis and classification
3. **Orchestrator Layer**: Signal resolution and agent coordination

Each layer processes signals with specific token limits and responsibilities, ensuring efficient signal flow from detection to resolution.

--
Token Distribution and Caps

The system implements strict token limits to ensure efficient operation:

- **Scanner**: Real-time processing, no token limits
- **Inspector**: 1M tokens for comprehensive signal analysis
- **Orchestrator**: 200K tokens for decision making and coordination

Token accounting tracks usage across all components for cost management and performance optimization.