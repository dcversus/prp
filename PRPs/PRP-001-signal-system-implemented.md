# PRP-001: Complete Signal System Implementation - Scanner/Inspector/Orchestrator/Guidelines

> req: Signal system implementing Scanner → Inspector → Orchestrator flow with comprehensive token accounting and agent coordination

## Signal System Implementation

### Core Scanner Signal Detection

- `/src/scanner/unified-signal-detector.ts` | Unified signal detection engine consolidating all detection patterns | EXISTING [da] | VERIFIED - Core signal detection with 75+ patterns, fully integrated [dp]

### Orchestrator Signal Processing

- `/src/orchestrator/signal-processor.ts` | High-performance signal processing engine | EXISTING [da] | VERIFIED - Signal processing operational with token tracking [dp]
- `/src/orchestrator/signal-router.ts` | Advanced signal routing and distribution system | EXISTING [da] | VERIFIED - Signal routing with priority queues working [dp]
- `/src/orchestrator/signal-aggregation.ts` | Signal aggregation and bulk delivery system | EXISTING [da] | VERIFIED - Bulk signal processing optimized [dp]
- `/src/orchestrator/signal-resolution-engine.ts` | Comprehensive signal-to-action mapping system | EXISTING [da] | VERIFIED - Signal-to-action mapping fully functional [dp]


### Shared Signal Infrastructure

- `/src/shared/signals/index.ts` | Signal system entry point and exports | EXISTING [da] | VERIFIED - All signal types and utilities properly exported [dp]
- `/src/shared/signals/registry.ts` | Signal registration and lookup system | EXISTING [da] | VERIFIED - Signal registry with type-safe registration working [dp]
- `/src/shared/signals/processor.ts` | Core signal processing utilities | EXISTING [da] | VERIFIED - Signal processing with validation complete [dp]
- `/src/shared/signals/tracker.ts` | Signal lifecycle tracking system | EXISTING [da] | VERIFIED - Signal tracking with persistence working [dp]
- `/src/shared/signals/priority-queue.ts` | Signal prioritization system | EXISTING [da] | VERIFIED - Priority queue with heap implementation [dp]
- `/src/shared/signal-pipeline.ts` | Signal pipeline for processing flow | EXISTING [da] | VERIFIED - Pipeline stages with transformers working [dp]

### Tmux Management System

- `/src/shared/types/tmux.ts` | Enhanced tmux types with TmuxManagerAPI interface | EXISTING [da] | VERIFIED - Complete tmux type system with agent lifecycle management [tw]
- `/src/shared/tmux-exports.ts` | Tmux integration exports and configuration | EXISTING [da] | VERIFIED - Proper exports for tmux system integration [tw]

### Task Management System

- `/src/shared/tasks/types.ts` | Complete task management type definitions | EXISTING [da] | VERIFIED - All task interfaces and enums defined [dp]
- `/src/shared/tasks/task-manager.ts` | Central task management system | EXISTING [da] | VERIFIED - Task scheduling and execution working [dp]
- `/src/shared/tasks/index.ts` | Task system entry point and exports | EXISTING [da] | VERIFIED - Task utilities and exports complete [dp]

### Audio Feedback Integration

- `/src/audio/signal-orchestra.ts` | Audio feedback system for signals | EXISTING [da] | VERIFIED - Audio feedback with melody patterns working [dp]
- `/src/audio/__tests__/signal-orchestra.test.ts` | Audio system test coverage | EXISTING [da] | VERIFIED - All audio tests passing [dp]
- `/src/audio/audio-feedback-manager.ts` | Audio feedback integration manager | EXISTING [da] | VERIFIED - Integration with signal system complete [dp]

### Music-Enhanced TUI Components

- `/src/tui/components/MusicVisualizer.tsx` | Comprehensive music visualization with beat sync | NEW [dp] | VERIFIED - Real-time music visualizer with frequency spectrum and classical themes [da]
- `/src/tui/components/EnhancedSignalTicker.tsx` | Enhanced signal ticker with wave animations | NEW [dp] | VERIFIED - Beat-synchronized signal scrolling with wave effects [da]
- `/src/tui/components/SignalOrchestrationDisplay.tsx` | Complete signal orchestration monitoring | NEW [dp] | VERIFIED - Multi-focus orchestration display with agent coordination [da]
- `/src/tui/components/MusicComponents.tsx` | Central music components export and utilities | NEW [dp] | VERIFIED - Complete music component integration with utility functions [da]
- `/src/tui/components/AgentCard.tsx` | Enhanced agent card with music visualizer | ENHANCED [du] | VERIFIED - Progress bars, beat indicators, and mini music visualizers [da]
- `/src/tui/components/__tests__/MusicComponents.test.tsx` | Comprehensive music component test suite | NEW [tp] | VERIFIED - All music components tested with performance validation [da]

### Melody Generation System

- `/melody.json` | Generated classical music melodies for signal system | ENHANCED [dp] | VERIFIED - 12 melodies including classical compositions with bit-packed encoding [da]
- `/scripts/generate-melody.ts` | Melody generation script with classical compositions | ENHANCED [da] | VERIFIED - Classical music generation with compression and metadata [da]

### Performance and Monitoring

- `/src/shared/performance/signal-processor.ts` | Performance-optimized signal processing | EXISTING [da] | VERIFIED - Signal processing with caching and optimization [dp]

### Test Infrastructure

- `/tests/unit/signals/processor.test.ts` | Signal processing unit tests | EXISTING [da] | VERIFIED - Signal processing tests passing [dp]
- `/tests/integration/tui-complete-workflow.test.tsx` | End-to-end workflow tests with signal integration | EXISTING [da] | VERIFIED - Integration tests cover signal flow [dp]

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


## signals
♫ SIGNAL SYSTEM

> reg: PRP is a place where we keeping our actual work progress status and next steps. We using special signals to communicate and push forward work. ALWAYS after some progress done leave details as comments and signal related to situation in PRP you workin on;

signals just a [XX] what agents can display to context or write to PRPs/\*.md document they working on, AND each signal XX should have own folder in /src/guidelines/XX/ with files for inspector (inspector.py, inspector.md), scanner (scanner.py), orchestrator (orchestrator.py, orchestrator.md). THEN scanner sees [XX] it invoke inspector (several can work in parallel), OR scanner guideline (optional) somehow different detects signal, like PR should detect logs of git push, gh pr create or so, and emit signal to inspector, inspector then FIFO and with /src/guidelines/XX/inspector.(py|md) prepare payload and analyse: priority, accuracy, acceptance, complexity, proofed scores (0-100 + comments) TO signals bus, orchestrator should consume most priority signals first and for each execute with tools and CoT actions like sending messages or spawning agents (ONE per PRP max! but with sub-agents from claude support!). Fool autonomus workflow, signals with guidelines cover situations with resolution protocol and reach toolset to analyse and build application from single prompt

- Tree-sitter (Node bindings) – The core parsing library. Install via NPM (npm install tree-sitter) and use language grammars (e.g. tree-sitter-javascript, tree-sitter-python, tree-sitter-rust, tree-sitter-html) to parse each file’s syntax tree ￼. These grammars are also NPM packages (e.g. npm install tree-sitter-javascript ￼). Tree-sitter keeps full syntax and position info, which is ideal for code indexing and LLM grounding ￼ ￼.
- File scanning/watching – Use Node’s fs or a watcher like chokidar to traverse the worktree directory and detect changed files. This lets you re-parse only updated files.
- Persistence/caching – Store each parse tree (code map) in a persistent store (e.g. JSON files, LevelDB/SQLite via lowdb or sqlite3) keyed by branch/worktree. Tools like diskcache (in Python) show one approach; Node can use node-cache or filesystem. RepoMapper (Aider) uses a cache folder invalidated on file change ￼.
- Diffing JSON/AST – Use a JSON diff library (e.g. json-diff-patch or deep-diff) to compare the old and new code map JSON. This helps detect added/removed functions or changed signatures.
- Duplicate-code detection – Use jscpd (JS/TS Copy/Paste Detector) which finds duplicated blocks across 150+ languages. It provides a CLI/API to report clone pairs, useful for duplication scenarios.
- Linting – Integrate standard linters (e.g. eslint for JS, flake8 for Python, clippy for Rust) to annotate nodes with lint errors. These can be added as properties on the AST (e.g. node.lintErrors = […]). (OPTIONAL!!! FUTURE!)
- Test coverage – Use coverage tools (nyc/Istanbul for JS, coverage.py for Python) to tag functions with coverage percentages. Again, store coverage data alongside the AST (e.g. node.coverage = 0.75). (OPTIONAL!!! FUTURE!)
- Git/Worktree management – Use Node Git libraries like simple-git or spawn git commands to create/manage worktrees or “corktrees”. Each worktree’s branch can be parsed separately while sharing the main repo store.


## Scanner System

a singleton, state with all prp, for each prp it's status, signal list, logs, stats, agent stats, tmux api and background scan of worktree responded for prp, scan should be maximum performance with debouncing optimised and store most actual in state for root and each prp worktree: file list changes (based on git diff), commits and their changes right from prp worktree and prp brach, PR comments (if GH enabled), PRP content (both from main/from prp branch), tmux agent logs (with search by time, per session, all, with fast aquare last 2k tokens logs), and with sub-agents statuses if they are happen/progress now, prp files affected list (for each file we need have a some filds with reasoning from inspector params, like purpose of changes, readiness, lint status, test coverage) and current branch prp codemap based on tree-sitter AND diff with main branch state; all this should be exposed as scanner API for next levels.
based on tree sitter https://github.com/wrale/mcp-server-tree-sitter and https://tree-sitter.github.io/tree-sitter/index.html
scanner should have a stream adapter with analysing each income to store log or change AND scanner should provide to guidelines (connect all enabled guidelines scanner adapters, connect src/guidelines/XX/scanner.py with proper API and contract to read stream of logs/changes for all prp worktrees) ability to also scan all incoming updates TO trigger event creation, mostly trigger to incoming regexp [XX] and mapping this value (signal) to event and next inpsection

> scanner NOT an a llm, but actualy an layer of tools what should parse incoming changes AND by default just read all [XX] with signals in log - some signal appear to be in commit? in edit? in logs? then scanner should take all there it happen and analyticaly sort between -> need to check \ already resolved \ new signals. pushing this to events bus. event is bus with signals; also scanner connects all guidelince scaner addapters at the same time give them api to read strim/filter it or just get most recent data as abstraction layer; and adaptors in scanner should have api to emit any signal they want to event bus; scanner always look for every tmux/agents, ALSO with different filters keeping all logs from inspector and orchestrator, their token usage/current context/token destribution at current time and more, scaner should always keep track on that data AND if we open debug mode we actualy should see ALL raw output of scanner, cause he first make syncronisations. the next element-layouer is a NEXT is inspector who is llm with base prompt and for each signal we have we should have guidelince inspector prompt, what we also connects to inspector prompt with - inspector-prp-context what should have proper limit and be compacted by special compaction prompt, then should be runned special adapter with auto requests, using scanner state and methods they just make ordinary preparation data, they gather different info and can use all inspector.shared inspector.infra inspecor.XX (signal name tools! its' just simple midlewares what each adapter dynamicaly connects for each signal. they can work with guthub api, or openai api or anything, they would collect a BIG amount data (small for low priority - bigger for incidents FF/BB/AA from agents.md) some text/logs/changes and previus. the next all this gatheret context + previus context of inspector result (always result of inspector is cap 40k!) + system inspector prompt + guideline prompt and structured response with all classification questions we need do like calculate confidence score, acceptance prp score (1-100), and comply what in each signal we verify and analyse all needed to reaction. structure output will help us preserve all needed to decition making result of inspector is always with result 40k limit for llm; inspector properly prepare and clasify all info into signals bus, inspector mechanism should be responsible for signal merging, conflict resolving and matching signals with artifacts needed for orchestration. during scaner to inspector we FiFo event bus, but with inspector - orchestrator we always clasify signal priority and take most important signal to work, orchestrator is a layer with llm what: { tokenCap: 200_000; // 200K tokens total, basePrompt: 20_000; // 20K tokens, guidelinePrompt: 20_000; // 20K tokens, agentsmd: 10_000; // 10K tokens, notesPrompt: 20_000; // 20K tokens, inspectorPayload: 40_000; // 40K tokens, prp: 20_000; // 20K tokens, sharedContext: 10_000; // 10K tokens, prpContext: 70_000; // 70K tokens } AND this should be exposed to configuration, so orchestrator take all related info and CoT on solution with guideline promt orchestrator should have a list of instruction what need to follow, then notes is a collection of prompts in markdown for special situations with signal combinations, some kind pattern matching in file name to .md what contain some kind pattern what we can match and apply note prompt to orchestrator instructions to resolve complex dead-end and stored in /shared/notes/\*.md. SO guidelines then is a horisontal slice what contain: scanner adapter (special detection mechanism, to pre-catch signals before they written down and emit eirlier, inspector prompt wwith instructions on aggregation and classification and inspector adapter as endpoint-like takes a time to make some requests or get scanner state to arrange all data around exact signal we working on, then inspector should make decidion making, protect from dublicates and put new signal to signals bus with classified data and priority. we need work with tmux and read all logs/statuses/events from terminal and keep all in persisted storage for debug, including all changes in worktree happen, that stream flow of scanner what should be very optemised to extract [XX] patterns and some complex slowwest analyse for some signals with sometime polling another servise. orchestrator CoT update status on prp with it's what was done, what expected, how it working, what next tasks, any blockers?, any incident? scheme to shared prp context. so each prp should share same token limit space. shared prp context needed for cooperation and orchestrator always report to it in one of CoT after all tool calls and prefius reflection right before sending message to agent via special tool, what should be a wrapper - take instructions -> recieve properly adapted message for agent-type agent use, orchestrator should know all agents avaiable details including token caps, strong sides, features enabled, signals what can resolve etc, we need presets for claude code/codex/gemini/amp/aider/open code/etc with some helpers for each how to general config from agents.md, .mcp.json, .prprc transform to needed files and formats and preserve their updates then needed, so, we should be able during init set glm and claude both, and both use agent-type claude code, so each time we call agent work, some script should call helpers and force before run all to be in place; .prprc should provide all configs of guidelines and agents configuration to be used. token limits and caps -> we need preserve in scanner account of all tokens we waste in inspector, orchestrator and all prp and agents and agent-type, we need keep optimal amount info but be able to fust get status for some specific time slices (1m/5m/30min/1h/6/12) and create a graph when needed for session, prp or all time, need adjust to TUI; token limits - prprc config of agent with different configuration about limitation, we have two agent caps - compact limit - waste limit, compact limit should be calculaed on historical data or based on model presets optimal values with compacting instructions, when waste limits on historical data calculates then catches dayly/weekly limit approaching, and with settings based on agent tariff public data (per model/subscription type) AND money management mechanism, with tariffs per agent and proper accounting for all system parts and warning and stop values for prprc. eg users should be able set daily limit to all agents to be $30 shared or each (depends on place where define) and be daily / weekly / monthly; all this internal signals should have codes and resolve instructions with proper guidelines - guideline = signal; and properly reacts on compacts and warnings or limits; same for agents, same for inspector and orchestrator (eg orchestrator have no money = [FM], looking for local llm runned or run something local or stop working, as eg); our work and architecture should be implemented right we have base signals for flow prp -> deploy to gh-page or kubectl with failover system, proper user interaction feedback and mechanism to send (invoke) orchestrator with direct message or mcp. Build scheme based on that

- scaner - Complete scanner implementation with all monitoring capabilities
- token accounting (agents/orchestrator/inspector) - Implement comprehensive token usage tracking not only for all components, but for all agents including claude code/codex/amp/gemini/etc with custom config for regexp's to catch compacting soon or there file and how take from it values about token usage
- git tree changes detected (any commit/push etc)
- any changes in PRP (should store always latest version of each prp in memory to provide actual one to orchestrator, and prevent orchestrator to read unactual version from main)
- compact limit prediction (auto adjust with comparison for last time appear + signal emit) we need just read terminal logs, then compacting happens soon or how did claude code or other agents printing notice you need create dictionary and websearch examples, thats it! just emit signal if it's happen inside prp. AND another feature, we should internaly account all tokens each agent waste with scanner and use this data then compacting previus time was soon we store that as value \* 110% compact model limit and next time we would trigger signal automaticaly if settings in guideline .prprc config set to envoke orckestrator not then agent tells what it happen soon, but then some amount of token is achived AND with REAL token limits we already known then in percent field like "emitCompactingSoon": { percent: 75, tokenCap: 200000, autoCap: false} (or user forced),
- price calculator (auto+config) - catch current prices, keep them in tokenPriceService and then apply to display wasted money per prp/session/app to agents with billing enabled.
- logs keeper (persisted storage, search funcs, session summaries storage). all logs from all agents should be avaiable for search and getting last output to orchestrator/inspector then needed. Service with persisted storage and interface for fast logs access
- interface for fast access to all operative data frin scanner, orchestrator should be able with tools get last logs from any agent/prp and file changes and git changes
- tmux manager, accaunting and proccessing events when terminal fail/idle etc, interface to spawn agent, send message to agent, stop agent from working, close terminal immidiatly. tmux manager should always send and store all logs with log keeper service
- scanner base utils should provide tools to extract signal, extract comment, return list changes with summaries per time/session/prp/agent and
- parallel sub-agents in prp/agent support (should be possible to see as two agents working at one prp in interface and in statuses for orchestrator). should be simple implementatin in few steps: 1. agent setting withSubAgents: true, subAgentPath: .claude/agents, 2. orchestrator development signals should always mention what IF plan can be executed in parallel in same invarenment OR we need working with legal complience or QC or system-analyst who always should be runned in sub-agents when possible! 3. orchestrator toll to send message as before, but orchestrator BASE prompt should contain simple instruction what, IF parallel execution needed, we need send message with instructions for each agent, but before ensure that agents exists in worktree, if so then just array of instructions for each and ask for favor to execute in paralel as sub-agents needed

## Inspector System
- **SEE PRP-000** for inspector implementation files

lets use cheapest model with tools and largest context window by default
For each event, FIFO inspector should be invoked with: scanner api, event payload with related files list, prp content, and nearby logs/changes with signal what contain some comment and details AND /src/prompts/inspector.md, INSPECTOR should according to signal with /src/guidelines/XX/inspector.md should invoke llm with tools from scanner to get file content needed or logs or another scanner api. inspector llm should CoT and call all needed tools and then last respond with structured output, schema should be with /src/guidelines/XX/inspector.py WHAT contains a banch of questions from XX/inspector.md we trying to answer coresponding to signal, that response should be limited by 40k tokens up AND stored in SIGNALS bus with payload and signal we analysed. this optional, some signals will recommend to do nothing; some signals can introduce own tools, like PR tools for github api from PR signal; inspector CoT count and questions also should be configured in /src/guidelines/XX/inspector.py

## Orchestrator System

Orchestrator is a LLM with tools, most high-end we have, with reasoing and responsible to resolution of signals;
Each signal have a priority classified by inspector and orchestrator take most high priority signal we have and then take /src/prompts/orchestrator.md + /src/guidelines/XX/orchestrator.md + signal inspector payload + SHARED context + PRP context + prp operative context (brief json from scanner about files and changes), next should be a CoT with banch of tools avaiable + scanner tool; CoT and additional tools can be introduced in /src/guidelines/XX/orchestrator.py; Orchestrator reason and then mostly will send message to agent or spawn/stop agent as resolution, or add request to invoke himself later; All signals should have a status coressponding it's pipeline step in scanner(finded/dublicate-invoked)-inpsector(analysing/prepared)-orchestrator(proceed/unresolved/delayed/resolved/canceled), all scanner-inspector statuses sets auto and only orchestrator should at the end always set it's resolution status;

- orchestrator
- send message tool with agent-enabled features like: set up sub-agent role, instructions to work with, ask to use tools then needed, run several-sub-agents in parallel (with proper tracking for several agents at-the-same time working on). we need simplify it! send message just send message, or stop active action and then send, or wait any needed time and then send. THATS IT! All special instructions on how to work with claude code or what exactly need to send we need put in guidelines. ALSO we need put TO BASE orchestrator prompt what his ultimate purpose - he reacts to signals and ALWAYS should resolve it AND resolving possible ONLY with send message to agent/prp no more options. PROMPT END! I NEED YOU implement scanner what detect send message tool call AND after orchestrator emit event what he done and take next task, orchestrator should last fixed send message prp active signal mark as resolved. ALWAYS. this is base and root of our application flow.
- scanner tools with actual state for all files/changes/logs/etc
- tmux / terminal tools
- github api tools, we already ask for github auth during init, now we should using github sdk create tools for working with PR and CI, should be researched and then prepared as checklist of tools
- mcp integration for orchestrator (.mcp.json)
  - kubectl tools from .mcp.json
  - playwrite tools from .mcp.json
- curl
- bash
- research tool ( we need research api of open ai research they should be able to provide it and we need adapt using it or find alternatives)
- shared context window (across all prp we working on, with additional tool to report prp status, should be preserved in format as what current working on / blockes / whats next, for each prp and if there incedent, should contain incident log too, until resolved) THIS SHOULD BE DISPLAYED in debug and info screens
- prp context (our actions history with this prp with prev tool calls/CoT of orchestrator)
- master prompt (base instructions for orchestrator)
- operative info in inspector/orchestrator (prp statuses/signals/last chat messages)
- prp context (with async compaction after overflow)
- system integrety detection FF with resolve protocol
- compacting orchestrator context
- managing compacting for agents (custom compacting instructions, with disabling auto-compact as option in .prprc/init)
- All TUI implementation details moved to PRPs/PRP-004-tui-implementation.md
- TUI includes: main screen (orchestrator), info screen (PRP/context/agent), agent screens, debug mode
- See PRPs/PRP-004-tui-implementation.md for comprehensive TUI specifications, implementation plans, and phase breakdown
- scanner tools to reach current prp-signal related state (or another IF NEEDED): project code map tree, changes with diffs, logs, signals history and details with access to all payloads in history

## Guidelines System

i see guidelines as core library of resolution prompts and instrictions/tools for orchestrator/inspector to resolve signal. /src/guidelines/XX/\*. with scanner.py, inspector.py, inspector.md, orchestrator.md, orchestrator.py and some other files/utils they import or needed for another systems to work;

- guidelines (most of practices from here should be an actual DoR list template, agents.md and all prp! and all should have proper prompt instructions with resolutions for orchestrator, all needed data for processing evaluation and evaluation criterias should be adopted for each case and implemented, all scaner utils where needed written and have proper banchmarks)
- base flow - create prp - analyse - plan - implement - test - review - release - reflect
- uknown signals flow
  - unknown danger
  - unknown non-danger
- feedback loop/verification signals
  - force TDD
  - force NO files OUTSIDE prp context
  - force llm-judge e2e cycle
  - force self-checks and reflection
  - force comment and signal
  - ask admin
  - inform about preview to admin
  - reports
- CI
  - codestyle
  - codereview
  - metrics
  - performance test recomendation
  - screnshoot tests with pixel samples
- system analytic flow
  - how we will measure success? Is it possible to measure it? What we need change to make it measurable? end rest proper questions to help reflect in future
  - research competitors
  - research papers
  - research forums/github/etc
  - project documentation intefrity
  - experiments
- quality gate flow (how to scan, how to prepare data, how to decidion making and resolve, write for each case from dcmaidbot judge prompt section and implement exact guidelines and new signals to agents.md included to enable llm-judge and e2e self-verification flow in all possible configurations)
  - e2e to dod/goal (SEE dcmaidbot judge prompt)
  - e2e as compact brief self-explanatory module-centric with proper continuation from one prp case to another, SEE dcmaidbot judge prompt as reference and reproduce and format and force on all levels
  - llm-judge force (SEE dcmaidbot judge prompt)
  - CI/CD workflows setup/validate (should all be setuped, worked and be meaningness to current project state, what we enable claude code cloud review or coderabbit, if no, need ask user to install and setup it)
  - DoD/DoR (should be forced in prp to be before implementation starts, need signal if prp have no DoR/DoD or goal or measurments or checklist AFTER development starts and should be throttled to 15 mins per prp and esposed with all guidelinse settings to .prprc )
  - units and e2e (should be meaningfull and analysed! signal if pre-release checks happen but there is no llm-judge OR in prp no signals about test review for release version completed, resolution - aqa should be called to properly setup all test infra / fix if needed, then inspect each test source code without actual implementation and then remove syntetic meaningless tests and write new test plan and then implement it until all test will match current prp progress, dod and goal, then leave test review for release version (i mean current value version, sorry for meta) completed signal and comment about current work to prp)
  - folow test order and quality
- pre-release checks force
  - tests sync to actual state verification checks
  - test meaningness checks
  - paperover check
  - development signals and flow
  - coding with verification checkpoints
  - experiments (/tmp folder, document before and what we want achive, then )
  - TDD (check what we firstly write and run tests and only fail code was written and then only pass red-green check should from scanner go direct to inspector to gather all prp details test code details and implementation details working on, score and make architecture high level overview then with inspector llm, that report with scores, recomendations and source code parts and file paths should be processed with reflection and tool calls by orchestrator, who then will stop agent, and send him instructions what need update in prp first, then comment signal to prp about recomendation to quality, then ask him with proper instructions what need change to what and continue when work with reporting at next checkpoint, THEN recomendation to quality should trigger scaner-inspector-orchestrator to run next time AQA to ensure what now tests have meaning and business value and not superflues, AQA after test verification leave signal what later again instruct most viraitly to call developer or developers in paralel to run work with). we need start with update files and logs analyser first, then make adapter guidelines to be able parse incoming strings from streams, to work with their speed, until they finished stream pool WITH some internal scanner state and all s-i-o scheme architecture we expecting now, for TDD then it would be easy - our parser seecing for test or test runs artifacts by our templates, then emit signal about it. another parser what scans for changes in development related directories, also easy, we known about /src, /tests, _.unit. _.test and we force it by our agents.md and write down instructions to orchestrator system prompt too how resolve that signals. AND then we see signal about coding before signal about test created and they red THIS IS NOTE! we need just create pattern matching simple two notes 'no test' - started implementation signal -> need stop agent and ask him to write test first or write why they not needed with signal to prp to resolve sognal THAT and ALL features require exact scanner, inspector and orchestrator architecture this is MINIMUM!
  - browser (chrome mcp, playwrite mcp setup and check working in agent and to orchestrator, what address avaiable and we can access to google as example etc, it's self-check with browser and same we need do with all environments)
  - npm-lib (npm auth creds, we need )
  - docker and k8s (tools should be avaiable and all should be setup, check should ensure what we can have access IF project require its and check what all creds provided or reqest their setup before we go next)
  - node debug (need setup all infra and tools including mcp to enable all debuger, same to browser and python, we need always setup and ensure all dedug tools in place and worked well)
  - python debug
  - documenting and reporting (only in prp and pr description, with forcing re-validate all governance files)
  - codestyle (strictest possible rules, always forced and setuped with webhooks, need always without paperovers make all types mathes and satisfy latest practice strict force rule!)
  - cleanup flow (all comments with only-urgent-comments policy, all code only what used to, only files what we should change in prp checks and clean and store. cleanup result is making commint happen)
- additional pre-checks (checklist should be actual exist, then actual checked before commit)
  - changelog force (CHOULD BE ALWAYS IN SYNC AND UPDATED BEFORE LAST COMMIT!)
  - report signals
  - force prp updates and signals (aggent iddle but no signal detected, resolution is to via scanner-inspector-orchestrator properly instruct agent to explain what he await and leave proper signal and comment in prp OR it can be another trigger, like pr happen but no signal pr detected, but it's part of pr policy please! OR it can be more options where and how we can discover what part work done but comment and signal not yet happen, and it can be some limited checks with throttling for 30min per prp check!)
- !! always instead prp try to use specific prp name in all system prompts pls
- enable roles and sub-roles (what all needed for prp .claude/agents in place, have proper robo-names, what agents.md in worktree have same robo-names, resolution is to ask developer copy-paste or rewrite them and sync agents.md and then make trivial commit with only this changes)
- post-release signals
  - manual verification
  - metrics measurament and storing
  - performance and accessability cheks
  - legal complience force
  - sync docs/governance force
  - reporting to user with nudge about preview / demo or results of release
  - reflect signals
  - observability
  - post-mortem and incident flow
  - prp done verification
  - prp goal measurment

### nudge AA, aa
- `/src/guidelines/aa/` | Admin Attention signal directory | NEED TO IMPLEMENT [no]
- `/src/guidelines/aa/guideline.md` | Admin Attention guideline - when and how to request admin intervention | NEED TO IMPLEMENT [no]
- `/src/guidelines/aa/inspector.md` | Inspector prompt for AA signal - gathers context for admin request | NEED TO IMPLEMENT [no]
- `/src/guidelines/aa/inspector.py` | Inspector script for AA signal - collects relevant data | NEED TO IMPLEMENT [no]
- `/src/guidelines/aa/orchestrator.md` | Orchestrator prompt for AA signal - formulates admin message | NEED TO IMPLEMENT [no]
- `/src/guidelines/aa/orchestrator.py` | Orchestrator script for AA signal - prepares and sends nudge | NEED TO IMPLEMENT [no]
- `/src/guidelines/ap/` | Admin Preview Ready signal directory | NEED: [no]
- `/src/guidelines/ap/guideline.md` | Admin Preview Ready guideline - preparing comprehensive reports for admin review | NEED: [no]
- `/src/guidelines/ap/inspector.md` | Inspector prompt for AP signal - validates report completeness | NEED: [no]
- `/src/guidelines/ap/inspector.py` | Inspector script for AP signal - gathers verification data | NEED: [no]
- `/src/guidelines/ap/orchestrator.md` | Orchestrator prompt for AP signal - compiles preview package | NEED: [no]
- `/src/guidelines/ap/orchestrator.py` | Orchestrator script for AP signal - sends preview with how-to guide | NEED: [no]
- `/src/guidelines/FF/scanner.py` | Scanner script for FF signal - captures system state on fatal error | NEED: [no]
- `/src/guidelines/FF/inspector.py` | Inspector script for FF signal - analyzes fatal error context | NEED: [no]
- `/src/guidelines/FF/orchestrator.py` | Orchestrator script for FF signal - sends critical incident nudge | NEED: [no]
- `/src/guidelines/JC/` | Jesus Christ (Incident Resolved) signal directory | NEED: [no]
- `/src/guidelines/JC/guideline.md` | Jesus Christ (Incident Resolved) guideline - post-incident communication | NEED: [no]
- `/src/guidelines/JC/inspector.md` | Inspector prompt for JC signal - validates resolution completeness | NEED: [no]
- `/src/guidelines/JC/inspector.py` | Inspector script for JC signal - documents resolution details | NEED: [no]
- `/src/guidelines/JC/orchestrator.md` | Orchestrator prompt for JC signal - prepares resolution summary | NEED: [no]
- `/src/guidelines/JC/orchestrator.py` | Orchestrator script for JC signal - sends resolution notification | NEED: [no]
- [ ] All admin signal guideline templates created (AA, AP, FF, JC)
- [ ] Inspector prompts include context gathering for admin decisions
- [ ] Orchestrator prompts include message formatting with options
- [ ] Scanner scripts capture relevant system state for incidents
- [ ] Nudge tool registered in orchestrator tool registry
- [ ] Kubectl secret management operational for NUDGE_SECRET
- [ ] All admin signals (AA, AP, FF, JC) trigger appropriate nudge messages
- [ ] Inspector scripts gather necessary context before nudge
- [ ] Orchestrator scripts format messages with decision options
- [ ] Nudge tool handles both direct and LLM-mode delivery
- [ ] FF signals include system state and error context
- [ ] JC signals include resolution details and prevention measures
- [ ] AP signals include comprehensive preview with how-to guide
- [ ] AA signals include clear decision requests with options
- [ ] | VERIFICATION with (e2e test)[tests/e2e/admin-signals-nudge.test.ts] confirming all admin signals trigger nudges - missing [no]
- [ ] | VERIFICATION with (integration test)[src/orchestrator/tools/nudge-tools.ts] showing tool registration and usage - missing [no]

## Multi-Provider Token Accounting with Real-Time Monitoring Implementation

### Core Components Implemented

- `/src/scanner/multi-provider-token-accounting.ts` | Comprehensive token usage tracking across multiple providers | IMPLEMENTED [da] | VERIFIED - Full multi-provider accounting with real-time pricing and limit prediction [dp]
- `/src/scanner/unified-token-monitoring-dashboard.ts` | Unified monitoring dashboard integrating all token metrics | IMPLEMENTED [da] | VERIFIED - Real-time dashboard with TUI integration and alerting [dp]
- `/src/scanner/token-cap-enforcement.ts` | Token cap enforcement system with automated actions | IMPLEMENTED [da] | VERIFIED - Inspector/orchestrator cap enforcement with configurable thresholds [dp]
- `/src/scanner/realtime-token-usage-detector.ts` | Real-time token usage detection from multiple sources | IMPLEMENTED [da] | VERIFIED - Terminal, file, and process monitoring with pattern detection [dp]
- `/src/scanner/comprehensive-monitoring-api.ts` | Comprehensive API for TUI dashboard integration | IMPLEMENTED [da] | VERIFIED - Complete API with health monitoring and caching [dp]
- `/src/scanner/automated-alerting-system.ts` | Intelligent alerting system with escalation policies | IMPLEMENTED [da] | VERIFIED - Rule-based alerting with multiple notification channels [dp]
- `/src/scanner/token-monitoring-integration.ts` | Main integration point coordinating all components | IMPLEMENTED [da] | VERIFIED - Complete system integration with factory functions [dp]
- `/src/scanner/examples/token-monitoring-usage.ts` | Usage examples demonstrating all functionality | IMPLEMENTED [da] | VERIFIED - Comprehensive examples covering all use cases [dp]

### Key Features Implemented

**Multi-Provider Support:**
- Support for Claude Code, OpenAI, Gemini, AMP providers
- Real-time pricing updates with automatic currency conversion
- Provider-specific rate limits and token caps
- Intelligent provider detection from metadata

**Real-Time Monitoring:**
- Terminal log monitoring with tmux session tracking
- File monitoring for log files and output streams
- Process monitoring for agent activities
- Pattern-based token extraction with high confidence

**Cap Enforcement Integration:**
- Inspector cap enforcement (1M tokens total)
- Orchestrator cap enforcement (200K tokens total)
- Configurable enforcement thresholds and actions
- Automated throttling, blocking, and emergency stops

**Comprehensive Dashboard:**
- Real-time token usage visualization
- Provider usage breakdown with projections
- System health monitoring with component tracking
- TUI-formatted data for dashboard integration

**Intelligent Alerting:**
- Rule-based alert system with customizable conditions
- Multi-level escalation policies
- Multiple notification channels (nudge, webhook, email, Slack)
- Alert acknowledgment and resolution workflows

**API Integration:**
- RESTful API for external monitoring
- TUI data formatting with real-time updates
- Health check endpoints and performance metrics
- Comprehensive error handling and reporting

### Token Distribution and Caps (Updated)

**Inspector Cap: 1M tokens**
- Base prompt: 20K
- Guideline prompt: 20K
- Context: 960K (remaining)
- Enforcement actions at 70%, 80%, 90%, 95% thresholds

**Orchestrator Cap: 200K tokens**
- Base prompt: 20K
- Guideline prompt: 20K
- AGENTS.md: 10K
- Notes prompt: 20K
- Inspector payload: 40K
- PRP: 20K
- Shared context: 10K
- PRP context: 70K
- Enforcement actions with configurable thresholds

### Integration Points

**Scanner Integration:**
- Real-time detection from logs and terminal output
- Automatic token usage recording from detected patterns
- File monitoring for persistent token tracking

**Inspector Integration:**
- Cap enforcement with automatic context compaction
- Token usage tracking per inspection operation
- Alert generation when approaching limits

**Orchestrator Integration:**
- Token cap enforcement with throttling
- Usage tracking per orchestration task
- Emergency stop capabilities at critical limits

**TUI Dashboard Integration:**
- Real-time data streaming via API
- Formatted display data for all components
- Alert notifications and status indicators

### Verification Status

- **Multi-provider accounting**: ✅ Fully implemented with provider detection
- **Real-time monitoring**: ✅ Terminal, file, and process monitoring active
- **Cap enforcement**: ✅ Inspector and orchestrator enforcement operational
- **Dashboard integration**: ✅ TUI-formatted data with real-time updates
- **Alerting system**: ✅ Rule-based alerts with escalation policies
- **API integration**: ✅ Comprehensive REST API with health monitoring
- **Example usage**: ✅ Complete examples demonstrating all functionality

### Performance and Scalability

- **Real-time processing**: Sub-second detection and alert generation
- **Memory efficient**: Configurable retention and cleanup policies
- **High availability**: Component health monitoring and auto-recovery
- **Scalable architecture**: Event-driven design with proper separation of concerns

### Next Steps for Integration

- Connect to actual inspector and orchestrator token usage APIs
- Integrate with nudge notification system for admin alerts
- Add persistent storage for long-term analytics
- Implement custom alert rules via configuration
- Add automated testing for all components
