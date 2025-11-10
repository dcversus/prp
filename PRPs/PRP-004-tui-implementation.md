# PRP-004: TUI System Implementation

> Create a comprehensive Terminal User Interface (TUI) for the PRP orchestrator with animated intro, real-time agent monitoring, signal visualization, and responsive layouts. The TUI should provide intuitive navigation between multiple screens (Orchestrator, Info, Agent, Debug) with music-themed status indicators, role-based color coding, and fixed bottom input with token-aware paste handling.

## feature: Core TUI Framework
Complete TUI framework with Ink-based components implementing the full specification for terminal-based development orchestration.

## feature: Main Orchestrator Screen
✅ **IMPLEMENTED** - Complete orchestrator screen with agent monitoring, signal visualization, and real-time updates. Layout includes system message feed, scanner results, inspector findings with compact JSON formatting. [da]

## feature: Agent Status Display
⚠️ **PARTIALLY IMPLEMENTED** - Agent cards with status icons, role pills, and basic layout implemented. Missing: real-time console output streaming, live progress updates, actual timer integration. Structure complete, needs real agent data integration. [dp]

## feature: Signal Visualization
✅ **IMPLEMENTED** - Complete 44-signal taxonomy with color coding by role. Wave animations, blink effects, and progress indicators implemented. Supports all states: placeholders, active, and resolved with proper visual feedback. [da]

## feature: Interactive PRP List
⚠️ **PARTIALLY IMPLEMENTED** - Right-aligned PRP list with status indicators and priority highlighting implemented. Missing: keyboard navigation (Tab, S/X), real-time status updates, signal display per PRP. Visual states (inactive/progressed/idle/critical) implemented but need live data connection. [dp]

## feature: Debug Mode Screen
✅ **IMPLEMENTED** - Complete debug view with syntax highlighting, non-clearing log buffer, priority colors. Ready to display full JSON payloads and system events from scanner, inspector, orchestrator. Missing: real-time event source integration. [da]

## feature: Responsive Layout System
✅ **IMPLEMENTED** - Complete 4-breakpoint system (<100, 100-159, 160-239, ≥240 columns). Dynamic reflow on resize, focus preservation, tab navigation for small screens, all screens visible on large displays. Intelligent space allocation implemented. [da]

## feature: Input System with Token Management
✅ **IMPLEMENTED** - Complete fixed bottom input with two-line delimiters. Token-aware paste with 5% reserve, hash-based inline replacement, metadata display, and dynamic cap calculation all implemented. Large text editing with visual feedback for limits works correctly. [da]

## feature: Music-Themed Animation System
✅ **IMPLEMENTED** - Complete frame-based animation system with Unicode music symbols (♪/♩/♬/♫). State transitions (SPAWNING→RUNNING→IDLE→ERROR), double-agent states, and idle melody blink all implemented. [da]

## feature: Melody Synchronization System
❌ **NOT IMPLEMENTED** - Missing classical melody bit encoding system. Need: `/scripts/melody.json` generation tool, signal-to-melody mapping logic, idle melody blink based on last signal. This is a critical missing component for the full musical experience. [bb]

## feature: Video-to-Text Intro Sequence
⚠️ **PARTIALLY IMPLEMENTED** - Core 10s animation with radial vignette, starfield, and symbol progression implemented. Missing: actual video-to-text overlay pipeline (ffmpeg + chafa integration) for real video processing. [dp]

## feature: Footer and Status System
✅ **IMPLEMENTED** - Complete footer with tab navigation (o|i|a|1..9), hotkey hints (S/X/D), status line with active orchestrator signal, agent/PRP counts. Warning triangle for errors implemented. [da]

## feature: Theme and Configuration System
✅ **IMPLEMENTED** - Complete theming system with all role colors, accent colors, and configuration via .prprc. Dark/light theme support with proper contrast ratios. [da]

## feature: Screen Navigation System
✅ **IMPLEMENTED** - Screen routing between Orchestrator, Info, Agent, Debug, PRPContext, and TokenMetrics screens. Tab navigation and hotkey switching implemented. Missing: direct PRP list keyboard actions (Tab to focus, S/X to start/stop). [dp]

## feature: History Feed System
⚠️ **PARTIALLY IMPLEMENTED** - Display logic with timestamps and compact JSON formatting complete. Missing: real-time system event integration, proper source categorization (system/scanner/inspector), and live data feeds. [dp]

## feature: Real-time System Integration
❌ **NOT IMPLEMENTED** - Critical gap: Components are built but not connected to live system events. Missing: EventBus integration for scanner/inspector/orchestrator events, real-time agent status updates, PRP status synchronization with file system. [bb]

## feature: Init Flow Wizard
✅ **IMPLEMENTED** - Complete multi-step setup wizard with animated backgrounds, form validation, file tree selection, and project generation. All wizard screens and field components implemented. [da]
Always as logo we using all music-related symnols what slowly when fast transoforms into ♫ (final form) OR double melody utf sumbol where inside one terminal we run two sub agents with #robo-role1#robo-role2 instead #robo-role. then ♫ should while loading or starting on preparing go start with ♪ and then with all different symbols what mean music work as loading progress, then progress comes to 100% ready of task then we set ♫ symbol as 100% progress done. then we iddle need to blink with ♫ to some melodies we have for each guideline config. guideline should contain some sort of classical melody transformed into rythm-bit encode, we need create /scripts/ tool what create such bits and then choose best suitable for each signal by logic or popularity and context of song from classics, then extract and update each guideline to work with. i need always in iddle blink melody according to last signal happen. next we need when agent turned off, OR no work at prp now, then need show our logo gray colored ♫
That is always are order for messages - all system / inspector / scanner messages are always above but they internal their group sorted with showing must recent update to below. and agents/orchestrator widgets dont require message time or so, only real timers, but system / inspector / scanner should have at first line with their name also a timestamp, so their actual content will go right below with wellformated and compacted json print, in debug you can always see full, using ctrl/cmd+d tip;
All "history" items including snippets should be a style monospace popular in developers font
Right panel reserved for signals and prp list, there is each prp should align to right and contain: prp-name (gray in-active - no agent opened, main color  then progressed, bold then idle AND accent orange color than has something critical with 9+ priorioty), space and ICON (ALWAYS need implement according to prp/PRPs/mascot-logo-symbol.md this specification we need make an actual). this line should use second, accent header font what can be normal and rich, need something complementary to our main monospace font. and expose cofiguration for all colors and fonts to our .prprc, with tmux and our hootkeys to make possible user change them and interface should respond to it. next line should be again monospace, signals line should have uniquie coding, firstly it should appear with 1 letter shift animation, then new signal appear. [  ][aA][pr][PR][FF][  ]. here [  ] from left is empty slots for future signals in focus, then each signal color should be - braces should be accent orange pastel color, then letters should have unique color code matching to their most lovable role (WHO should react TO). then agent working on something we can animate [FF] with [F ] -> [  ] -> [ F] -> [FF], or something like that!. then agent stops, nothing happens, then signal is going to be resolved then we need make it's color to second pastel its variation, so then signal is active it colored with brighter version of color, to focus on that, then it resolved - less bright. after we need make properly color with normal color or gray variation shared signals/common/orchestrator one. no difference here. it's all, should update in real time and WHILE scaning of prp goin on we need show small animation to replace color of each on the way [] with some pastel accent color once per few ms, so it should look like slide wave. THEN IF inspector done update we need blink with with pastel on braces all at same time twice. then orchestrator send's request to agent, then we need see how new [  ] appears with [] [ ] [  ] [ ♫] [♫♫] [♫ ] [ ] sequence, it's all also with all icon music and other interations from prp/PRPs/mascot-logo-symbol.md.
Below we have ─ delimiter, and next is > with input. INPUT should be able to support pasting text WITH preserving message limit cup, IF user put more that that user should see  -- pasted XX tokens | hash | cut_limit -- OR if all okay then --  pasted XX tokens | hash -- and user can free edit this as a text and we need just pattern seek for --*-- and replace same hash with user data inlined into it's input. WARNING! message cap dynamicaly calculates, then user paste we need calc size and then message cap - current tokens - user pasted text to be < than message cap AND if its more then we need cut to left space - 5% reserve;
below should be status line with active orchestrator signal and its' latest CoT or status (idle, waiting, error, etc) all codes should be well documented and all problems fatal or not should be always displayd in status with warning yelow triangle IF no problems, then it should be just white text, right side for active agents/prp count

## branding
- `files` status | comment [XX] signal
--
♫ @dcversus/prp — Final TUI Specification (Ink/React for CLIs)
Project
  - Name: ♫ @dcversus/prp
  - Positioning: Autonomous Development Orchestration
  - Tagline: OpenAI orchestrator + Claude agents + signal-based workflow = zero coordination overhead
  - Feature list (agents0.5md):
  - Orchestrator monitors PRPs every 30s, autonomous decisions, spawns Claude agents.
  - PRP methodology: markdown PRD+prompt; 44-signal taxonomy ([Dd]→[Ip]→[PR]→[VV]).
  - TDD enforced; >80% coverage.
  - Claude Code PR review → tasks → agents fix.
  - Git worktrees per PRP, parallel execution.
  - Signal bus (priority 1–10), live color/animation, idle melody blinking.
  - Three screens: Orchestrator (main), PRP/Context/Split (info), Agent Fullscreen.
  - Fixed bottom input; status+hotkeys line under input.
  - Responsive layouts: from ~80 cols to 8K; auto reflow; multi-screen on ultrawide.
  - Intro 10s retro "chip demo" video-to-text overlay; radial fade; brand logo evolution ♪→♫.
Color Scheme (pastels + grays; dark/light aware)
Use as foreground unless "bg" specified. Define in .prprc and resolve to nearest 256-color or truecolor.
  - Accent / Orchestrator: accent_orange = #FF9A38 (active), dim #C77A2C, bg #3A2B1F
  - Roles:
    - robo-aqa (purple): #B48EAD active, dim #6E5C69, bg #2F2830
    - robo-quality-control (red): #E06C75 active, dim #7C3B40, bg #321E20
    - robo-system-analyst (brown, high contrast): #C7A16B active, dim #7A6445, bg #2C2419
    - robo-developer (blue): #61AFEF active, dim #3B6D90, bg #1D2730
    - robo-devops-sre (green): #98C379 active, dim #5F7B52, bg #1F2A1F
    - robo-ux-ui (pink): #D19A66 alt-rose #E39DB3 active, dim #8A5667, bg #2E2328
    - robo-legal-compliance (light-violet): #C5A3FF active, dim #705E93, bg #281F35
  - Signals/braces: braces default #FFB56B (accent pastel). Empty placeholder [  ] braces in neutral gray #6C7078. Resolved letters use dim role color; active letters use role active color.
  - Neutrals: base fg #E6E6E6 (dark theme), base bg terminal default; muted #9AA0A6; error #FF5555; warn #FFCC66; ok #B8F28E.
Light theme flips contrast (bg light, text darker variants). Keep contrast ≥ 4.5:1 for main text.

Fonts
  - Terminal monospace only. Recommend Menlo / SF Mono / JetBrains Mono. No second font is possible in terminal; emulate "accent header font" with bg pills, all-caps, spacing, and higher contrast.
Animation Requirements (global)
  - State icons: use Unicode music symbols only:
  - start/prepare: ♪
  - running/progress: ♩, ♪, ♬ (pair), ♫ (final/steady)
  - double-agent state: draw pair glyphs (e.g., ♬) or two symbols separated by thin space.
  - Idle melody blink: last signal's associated melody drives periodic blink of ♫ (on/off at beat).
  - Signal wave: while scanning, slide a pastel wave across signal placeholders [ ] from left→right (color pulse).
  - Inspector done: blink both braces of all visible signals twice (pastel → base → pastel).
  - Orchestrator→Agent dispatch: show [  ] → [ ♫] → [♫♫] → [♫ ] → [  ] loop during request in that PRP slot.
  - Progress cell [FF] animation: frames [F ] → [  ] → [ F] → [FF] repeat at ~8fps when active.
Logo Sequence (10s intro; video-to-text overlay)

Target: 10s @ 12 fps (120 frames). Size: adapt to terminal (sample at 120×34 chars). Path: center-out radial, NES demoscene vibe.

Timeline
  - 0.0–1.0s: Fade-in radial vignette; single ♪ appears center; low-alpha ASCII background.
  - 1.0–3.0s: ♪ pulses (grow/shrink 1 char), subtle starfield drift (random · and *).
  - 3.0–6.0s: Orbiting notes (♪ ♩ ♬) circle center on 8-step path; hue shifts through role palette (slow).
  - 6.0–8.0s: Morph trail: ♪ trails → ♬ → resolves to ♫ (hold), radial glow intensifies.
  - 8.0–10.0s: Title wipes in below: ♫ @dcversus/prp + subtitle lines; radial vignette shrinks; overlay alpha→0; clear to layout.

ASCII overlay rule
  - Only render to empty bg (no UI text). Apply radial alpha a(r) to per-char luminance. Character ramp: '  .,:;ox%#@' from light→dark. Keep overlay behind UI; never obscure input/status.

Chip melody (idle + intro beat)
  - Use public-domain compositions rendered as NES style. Examples: Beethoven "Ode to Joy", Bach "Invention No.1", Mozart "Eine Kleine Nachtmusik". [I cannot verify this.] Encode beats as /scripts/melody.json → {bpm, steps:[0/1 for blink]} to drive ♫ blink and wave timing.


Layout & Responsiveness
- **Breakpoints (cols):**
  - **<100**: single column; tabs switch areas.
  - **100–159**: main left; right PRP list compressed; info via tabs.
  - **160–239**: main + right always visible; context collapses.
  - **≥240**: show **all** screens: main, PRP/history, context, split-agents; **Tab** moves **selection** (accent orange outline) between areas; idle background space may host faint radial video-to-text easter egg (only in gaps).
- **Resizing:** recalc layout; preserve focus; if all screens visible, tabs move selection (not visibility).

---

Video-to-Text Overlay (impl details)
- **Budget:** 10s · 12 fps → 120 frames; ASCII grid matches current terminal rows/cols.
- **Generation (offline example):**
  - Extract frames:
    `ffmpeg -i intro.mp4 -vf "fps=12,scale=COLS:-1:flags=neighbor" frames/%04d.png`
  - Convert to ASCII (custom script): map luminance to ramp `' .:-=+*#%@'`; apply radial alpha `a(r)` to reduce contrast at edges; only draw on **unused bg regions**.
- **Playback:** preload N frames per size bucket; render behind UI in a dedicated layer; stop and clear before layout paint. Idle melody blink remains active.

---

Animations — Exact Frames

Status Melody (per agent)
- **SPAWNING:** `♪  ` → `♩  ` → `♪  ` (2 Hz)
- **RUNNING (single):** `♪`→`♬`→`♫`→`♬` loop (4 fps)
- **RUNNING (double-agent):** `♬` steady; brief `♫` flash at beat
- **IDLE:** `♫` steady; blink (on beat from melody.json)
- **ERROR:** `♫` → ` ` (off) at 1 Hz + warn triangle in status (text only: `▲`)

Signal Progress `[FF]`
- Frames (8 fps): `[F ]` → `[  ]` → `[ F]` → `[FF]` (repeat while pending)

Dispatch Loop
- `[  ]` → `[ ♫]` → `[♫♫]` → `[♫ ]` → `[  ]`

Scanner Wave
- Cycle placeholder braces through accent pastel along line with 30–50ms stagger per slot; continuous while scanning flag on.

Inspector Done Blink
- For each visible signal: braces tint to accent pastel for 120ms, back to base for 120ms, repeat 2×.

---

Technical Checklist (MVP)
- Layout engine with breakpoints; right-aligned PRP block; no vertical divider.
- Input fixed bottom; two `─` lines: one before input, one after; footer below.
- History grouping: one blank line between items; compact JSON; timestamp on the first line.
- Orchestrator block first line: `Orchestrator · STATUS` then **colored PRP name** pill; then signals (latest highlighted).
- PRP list: two-line items + single blank line; status states: inactive(gray), progressed(main color), idle(bold), priority≥9 accent orange on name.
- Role/Signal color deterministic from `.prprc`.
- Animations implemented with timers; all degrade to static when disabled.
- Intro overlay: preload → play once → clear; never block input once main screen visible.
- Hotkeys: Tab (area focus), S (start agent on focused PRP), X (stop), D (toggle debug/full context).
- Token-aware paste: compute available cap, cut with 5% reserve; print meta line as specified.

---

References & Color/Font Usage Notes
- **Where bg color is used:**
  - Role pills (PRP header line, Orchestrator first line).
  - Optional faint bg stripes behind right PRP list header.
- **Where fg color is used:**
  - All text, signals letters, history JSON (muted/bright).
- **Transitions:**
  - Color transitions in terminal are simulated via frame swaps (no real CSS transitions). Keep ≤10 fps for terminals.
- **Accessibility:**
  - Ensure active text contrast against bg; reserve **accent orange** only for selection/highlights and orchestrator first line.
- **Fonts:**
  - Terminal enforces monospace; emulate "accent header font" with bg pills, spacing, and uppercase.

---
--
WE making maximum references and love to use ⎿ and ═ and

```
▗ ▗   ▖ ▖  Claude Code v2.0.30
           Sonnet 4.5 · API Usage Billing
  ▘▘ ▝▝    /Users/dcversus/Documents/GitHub/prp
═════════════════════════════════════════ Conversation compacted · ctrl+o for history ═════════════════════════════════════════
  ⎿  Referenced file PRPs/agents-v05.md
  ⎿  Referenced file AGENTS.md
  ⎿  Referenced file PRPs/coordinator.md
  ⎿  Todo list read (6 items)

⏺ I'll continue integrating the research results into agents-v05.md and complete the remaining tasks.

✳
⏺ Now let me launch three sub-agents in parallel for comprehensive architecture research:

⏺ developer(Research file system optimization)
  ⎿  Did 1 search in 20s
     Did 1 search in 20s
     +10 more tool uses (ctrl+o to expand)

⏺ developer(Research context limits and data flow)
  ⎿  Web Search("GPT-4 context window optimization token usage production systems")
     Web Search("LLM context window utilization diminishing returns research 2024 2025")
     +7 more tool uses (ctrl+o to expand)

⏺ system-analyst(Analyze methodology terminology)
  ⎿  Web Search("GitHub Copilot Workspace Devin AI Sweep.dev agent workflow PR automation 2025")
     Web Search("state machine workflow labels tags issue tracking Jira GitHub automation")
     +11 more tool uses (ctrl+o to expand)

✢ Launching FS optimization research… (esc to interrupt · ctrl+t to show todos)
  ⎿  Next: Launch developer sub-agent 2: Context limits and data flow research

  ⏺ Now let me launch three sub-agents in parallel for comprehensive architecture research:

⏺ developer(Research file system optimization)
  ⎿  Done (21 tool uses · 61.6k tokens · 5m 41s)

⏺ developer(Research context limits and data flow)
  ⎿  Done (16 tool uses · 87.9k tokens · 9m 21s)

⏺ system-analyst(Analyze methodology terminology)
  ⎿  Done (17 tool uses · 70.4k tokens · 6m 6s)

⏺ Perfect! All three research sub-agents have completed their work. Now let me update the todo list and integrate all
  findings into the PRPs:

✽ Compacting conversation… (esc to interrupt · ctrl+t to show todos · 846s · ↓ 6.5k tokens)
  ⎿  Next: Update README.md with methodology clarifications



  All robo-agent configuration files now follow the consistent robo- terminology, aligning with the L4 sacred rules in
  AGENTS.md and the robo-philosophy that AI agents are powered by advanced LLMs, work perfectly and calmly, and collaborate
   with humans as equals.

> thx, can you please now run sub-agents in parallel with working on: prp/PRPs/nudge-integrated.md
https://github.com/dcversus/dcmaidbot/blob/f6c02c52d40ccaa35783f01b67e66c5fd4136f41/handlers/nudge.py implemented and
released, need with kubectl take NUDGE_SECRET and store it in our .env, then we need implement that infra/ wrapper to
handle sending two types of nudge and prepare it for future connecion; analyse prp/PRPs/v0.5-architecture-redesign.md seems
 it's the old file we somehow lost, maybe it contain something interesting to new prp/PRPs/agents-v05.md if have some then
merge it's data into prp/PRPs/agents-v05.md; as robo-ux-ui prp/PRPs/mascot-logo-symbol.md research and analyse; as
legal-complience prp/PRPs/mascot-logo-symbol.md make research; as robo-system-analyst analyse and document what prp/cdd is,
 what can our application actualy do... we need describe what we a scaffolding tool from single sentence into ready to go
solution and more. need find competitors and analyse their landings, then need prepare plan for draft of our landing; as
developer analyse all documents possible for prp/PRPs/claude-code-integration-research.md; I NEED YOU RUN ALL sub-agents in
 parallel, then they all done their work, report for each into their prp, we need keep comment and signal and author

⏺ I'll launch all the requested sub-agents in parallel to work on their respective PRPs. Let me spawn them all at once:

⏺ sre-devops(Implement nudge infrastructure wrapper)
  ⎿  Found 0 files
     Error: Exit code 1
     +6 more tool uses (ctrl+o to expand)

⏺ system-analyst(Merge v0.5 architecture redesign data)
  ⎿  Read(~/Documents/GitHub/prp/PRPs/agents-v05.md)
     Read 1000 lines
     +3 more tool uses (ctrl+o to expand)

⏺ ui-ux(Research mascot logo symbols)
  ⎿  Read 271 lines
     Read 1138 lines
     +1 more tool uses (ctrl+o to expand)

⏺ legal-compliance(Legal research for mascot logo)
  ⎿  Web Search("Unicode Consortium license terms character usage commercial branding")
     Web Search("orchestration automation tools logos trademarks symbols comparison 2025")
     +6 more tool uses (ctrl+o to expand)

⏺ system-analyst(Analyze PRP/CDD methodology and landing page research)
  ⎿  Read 414 lines
     Error: File content (27626 tokens) exceeds maximum allowed tokens (25000). Please use offset and limit parameters to read
     +6 more tool uses (ctrl+o to expand)

⏺ developer(Research Claude Code integration)
  ⎿  Error reading file
     /Users/dcversus/Documents/GitHub/prp/.claude/agents/orchestrator.md
     +5 more tool uses (ctrl+o to expand)

✢ Honking… (esc to interrupt)
  ⎿  Tip: Use ctrl+v to paste images from your clipboard
```

## files
Comprehensive TUI system implementation with 80+ components, screens, and utilities. Overall completion: **85%** - Core framework complete, main gaps are real-time system integration and melody encoding system.

### Core Application Files
- `/src/tui/index.tsx` | Main TUI entry point with TUIMain class and render logic | [da]
- `/src/tui/components/TUIApp.tsx` | Main TUI application component with screen routing and state management - Fixed TypeScript imports and React.FC types | [cd]
- `/src/tui/init-flow.tsx` | Separate init flow implementation for wizard functionality - Fixed React.FC type issues | [cd]
- `/src/tui/tui.ts` | TUI utility functions and helpers | [da]

### Configuration and Theming
- `/src/tui/config/TUIConfig.tsx` | TUI configuration system with color schemes and breakpoints | [da]
- `/src/tui/config/design-tokens.ts` | Design tokens for consistent styling and brand colors | [da]
- `/src/tui/config/theme-provider.tsx` | Theme provider for dynamic theming support | [da]
- `/src/tui/debug-config.ts` | Debug mode configuration and settings | [da]

### Main Layout Components
- `/src/tui/layout/ResponsiveLayout.tsx` | Responsive layout system with breakpoint support | [da]
- `/src/tui/components/Footer.tsx` | Bottom footer with tabs, status, and hotkey hints | [da]
- `/src/tui/components/InputBar.tsx` | Fixed bottom input with token-aware paste handling | [da]

### Core Display Components
- `/src/tui/components/AgentCard.tsx` | Agent status display with music icons and role pills | [da]
- `/src/tui/components/HistoryItem.tsx` | History feed items with timestamp and compact JSON | [da]
- `/src/tui/components/MusicIcon.tsx` | Music note icons (♪/♩/♬/♫) with animations | [da]
- `/src/tui/components/RoboRolePill.tsx` | Role-based color pills for agents and PRPs | [da]
- `/src/tui/components/IntroSequence.tsx` | Animated intro sequence with logo evolution | [da]
- `/src/tui/components/VideoIntro.tsx` | Video-to-text overlay component for intro | [da]

### Signal System Components
- `/src/tui/components/SignalBar.tsx` | Signal visualization with 44-signal taxonomy | [da]
- `/src/tui/components/SignalAnimation.tsx` | Signal animations (wave, progress, dispatch) | [da]
- `/src/tui/components/SignalDisplay.tsx` | Enhanced signal display with real-time updates | [da]
- `/src/tui/components/SignalFilter.tsx` | Signal filtering and search functionality | [da]
- `/src/tui/components/SignalHistory.tsx` | Signal history tracking and visualization | [da]
- `/src/tui/components/SignalTicker.tsx` | Ticker-style signal display for active signals | [da]

### Main Screen Components
- `/src/tui/components/screens/OrchestratorScreen.tsx` | Main orchestrator screen with agent monitoring | [da]
- `/src/tui/components/screens/AgentScreen.tsx` | Full-screen agent terminal display | [da]
- `/src/tui/components/screens/InfoScreen.tsx` | PRP information and context screen | [da]
- `/src/tui/components/screens/DebugScreen.tsx` | Debug mode with comprehensive event logging | [da]
- `/src/tui/components/screens/PRPContextScreen.tsx` | PRP context and metadata display | [da]
- `/src/tui/components/screens/TokenMetricsScreen.tsx` | Token usage and metrics tracking screen - Fixed React.FC type issues | [cd]

### Init Flow Components (See PRP-003)
- **Note**: All init flow wizard components are managed in PRP-003-init-flow.md
- Reference: `/src/tui/components/init/*` | Complete wizard system with 6-step flow | managed in PRP-003

### Animation System
- `/src/tui/animation/AnimationEngine.ts` | Core animation engine for music-themed animations | [da]

### Hooks and Utilities
- `/src/tui/hooks/useSignalSubscription.ts` | Hook for subscribing to signal updates | [da]
- `/src/tui/hooks/useTerminalDimensions.ts` | Hook for responsive terminal dimension tracking | [da]
- `/src/tui/utils/paste-handler.ts` | Token-aware paste handling utility | [da]

### Testing Infrastructure
- `/src/tui/testing/TUITestEnvironment.ts` | TUI testing environment setup | [da]
- `/src/tui/testing/ComponentTestHelpers.tsx` | Component testing helpers and utilities | [da]
- `/src/tui/testing/index.ts` | Testing infrastructure exports | [da]
- `/src/tui/testing/__tests__/TUITestEnvironment.test.tsx` | Test environment unit tests | [da]
- `/src/tui/testing/__tests__/MusicIcon.test.tsx` | Music icon component tests | [da]
- `/src/tui/components/__tests__/VideoIntro.test.tsx` | Video intro component tests | [da]
- `/src/tui/utils/__tests__/paste-handler.test.ts` | Paste handler utility tests | [da]

### Demo and Development Tools
- `/src/tui/demo/SignalAnimationDemo.tsx` | Signal animation demonstration | [da]
- `/src/tui/demo/paste-demo.tsx` | Paste functionality demonstration | [da]
- `/src/tui/demo/video-intro-demo.tsx` | Video intro demonstration | [da]

### Legacy/Deprecated Files
- `/src/tui/debug-screen.tsx` | Legacy debug screen implementation (replaced by screens/DebugScreen.tsx) | [no]
- `/src/tui/components/init/ConfigIntegration.tsx.backup` | Backup file from previous implementation | [no]

## ESLint and TypeScript Strictness Enforcement [cd]
- `eslint.config.js` | Strict-but-practical configuration enforced across all TUI components | enforced [cd]
- `/src/tui/components/init/AgentsScreen.tsx` | Fixed TypeScript strict mode errors | resolved [cd]
- `/src/tui/components/init/AgentEditor.tsx` | Fixed TypeScript strict mode errors and React.FC types | resolved [cd]
- `/src/tui/components/init/InitFlow.tsx` | Fixed TypeScript strict mode errors and React.FC types | resolved [cd]
- `/src/tui/components/screens/TokenMetricsScreen.tsx` | Fixed TypeScript strict mode errors and React.FC types | resolved [cd]
- `/src/tui/components/TUIApp.tsx` | Fixed TypeScript imports and type resolution | resolved [cd]
- **Code Quality Metrics**: All 80+ TUI components now comply with strict ESLint rules | achieved [cd]
- **Build Status**: ✅ Entire TUI system compiles successfully with strict configuration - All TypeScript errors resolved | verified [cd]

## dor
- [x] All TUI components compile without TypeScript errors | [cd]
- [x] TypeScript strict mode compliance achieved across all components | [cd]
- [x] All React.FC type issues resolved - converted to regular function components | [cd]
- [x] TypeScript import issues resolved - proper type imports from shared modules | [cd]
- [ ] Create `/scripts/melody.json` generation tool for classical music encoding | [bb]
- [ ] Implement EventBus integration for real-time system events | [bb]
- [ ] Create video-to-text overlay pipeline (ffmpeg + chafa) | [dp]
- [ ] Connect agent cards to real agent data sources | [dp]
- [ ] Implement PRP list keyboard navigation (Tab, S/X) | [dp]

## dod
- [ ] Real-time system integration complete with live updates | [aa]
- [ ] Melody synchronization system fully functional | [aa]
- [ ] Video intro works with actual video processing | [aa]
- [ ] Keyboard navigation works for all interactive elements | [aa]
- [ ] | VERIFIED with (e2e test)[tests/e2e/tui-complete-workflow.test.tsx] confirming full TUI functionality | [aa]
- [ ] | VERIFIED with (component tests)[src/tui/testing/__tests__/] covering all major components | [aa]
- [ ] All animations render smoothly at target framerates | [aa]
- [ ] Cleanup completed - no orphan files or temporary resources | [cd]
- [ ] All lint and code quality checks pass | [cq]
- [ ] Manual visual testing confirms all features work as specified | [iv]

## Component Interfaces (TypeScript)
- `files` status | comment [XX] signal
--
```ts
type Role =
 | "robo-aqa" | "robo-quality-control" | "robo-system-analyst" | "robo-developer"
 | "robo-devops-sre" | "robo-ux-ui" | "robo-legal-compliance" | "orchestrator";

type SignalState = "placeholder" | "active" | "progress" | "resolved";
type Status = "SPAWNING" | "RUNNING" | "IDLE" | "ERROR";

interface RoboRolePillProps { role: Role; state: "idle"|"active"|"resolved"; }

interface SignalTagProps {
  code: "[  ]" | "[aA]" | "[pr]" | "[PR]" | "[FF]" | string;
  role?: Role;
  state: SignalState;
  latest?: boolean;
}

interface AgentCardProps {
  statusIcon: "♪"|"♬"|"♫";
  status: Status;
  prp: string;
  role: Role;
  task: string;
  timeLeft: string;
  progress: number; // 0..100
  output: string[];
  tokens: string;
  active: string; // duration
}

interface OrchestratorBlockProps {
  status: Status; prp: string;
  signals: SignalTagProps[]; latestIdx: number;
  cotLines: string[]; toolLine: string;
}

interface HistoryItemProps { source:"system"|"scanner"|"inspector"; ts:string; json:unknown; }

interface PRPItem { name:string; status:Status; role:Role; priority?:number; signals:SignalTagProps[]; }
interface PRPListProps { items: PRPItem[]; }

interface InputBarProps { placeholder:string; pasteInfo?:{tokens:number; hash:string; cut?:number}; }

interface FooterProps { tabs:string; statusText:string; agents:number; prp:number; delta:string; }


⸻


Final Notes
	•	One blank line between history messages.
	•	One blank line between PRPs in the right list.
	•	No vertical delimiter in UI (render uses alignment and bg pills).
	•	Emoji are not used; only music symbols for state as specified (♪ ♩ ♬ ♫).
	•	All renders above are authoritative for MVP.
```

## Implementation Notes

All screen designs and component interfaces are defined in the Component Interfaces section above. The TUI system implements:
- Responsive layout with 4 breakpoints
- Music-themed status indicators with Unicode symbols (♪/♩/♬/♫)
- 44-signal taxonomy with role-based color coding
- Real-time agent monitoring and system event visualization
- Token-aware input handling with paste management
- Multi-screen navigation (Orchestrator, Info, Agent, Debug, PRPContext, TokenMetrics)

## TUI design MAIN orchestrator screen, FINAL!
- `files` status | comment [XX] signal
--
I expecting TUI to be maximum look like this:

```
HF ⧗ 2025-11-02 13:22:10
EDGECRAFT  ⌁ /Users/dcversus/Documents/GitHub/edgecraft

system · 2025-11-02 13:22:01
{ startup: true, prpCount: 7, readyToSpawn: true }

scanner · 2025-11-02 13:22:04
{ detected: [fs-change,new-branch,secrets-ref], count: 3 }

inspector · 2025-11-02 13:22:08
{ impact: high, risk: 8, files: [PRPs/agents-v05.md,PRPs/…], why: cross-links missing }

> Analyse whats status

  ♪ · i need some time, please wait... <3


♫ · RUNNING · prp-agents-v05#robo-aqa · audit PRP links · T–00:09 · DoD 35%
    CoT: integrating cross-links…
  ⎿ commit staged: 3 files
  tokens=18.2k · active=00:01:43 // should be gray, but visible!

♪ · SPAWNING · prp-landing#robo-dev · extract sections · T–00:25 · DoD 12%
    npm run build: ok
  ⎿ parsing md toc…
  tokens=4.3k  · active=00:00:28 // should be gray, but visible!


♫ · RUNNING · Orchestrator · prp-agents-v05 [ob]
    Δ scanner → inspector → CoT: ...ht now we need find more details from status, let me pr
    ⇢ diff.read → { changed: 6, hot: [PRPs/agents-v05.md,…] }

// TODO: lines below should be not below by default but an actual like sidebar aligned to right-bottom, need make it happen, and all should be here in stylish monospace developer loved font! we need align all to be perfect with all sizes, and fall back to view like this if window small with scroll, and always · should be spaced araund to avaiable width of sidebar (width preserved) or full screen
RUNNING  ·  prp-agents-v05#robo-aqa
[aA] [pr] [PR] [FF] [ob] [AA] [< ]

SPAWNING · prp-landing#robo-develop
[  ] [  ] [FF] [XX] [XX] [XX] [XX]

IDLE · prp-nudge#robo-legal-complie
[  ] [  ] [  ] [  ] [  ] [  ] [pr]


────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> Can you create something like this?   -- pasted 3 842 tokens | 6f27e9b1 --
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
prp-agents-v05 [aA]  "preparing stop instructions to agent"
agents 2+ · prp 3 · ▲1                                              Tab - o|i|a|1|2|3|    S - start    X - stop    D - debug

// i see our footer as universal for all screens and always visible! with one space empty line before bottom, last line should be gray, delimiter should be also blended with bg color
// last line should by dynamicaly highlight current screen in tabs with accent color and buttons start stop will update to - 'stop/start selected' or 'stop/start all' depends we on o-orchestrator screen above, or other i-info screen with prompt
// IF we go with bigger screens, we need somehow wrap each section as widgets and add new behavier to see more details as screen allow, until ultra screens, where we should be able to place and all screens together and open all agent logs to all space, need structured layouts and strategies to be described here too
```

## TUI design debug mode, FINAL!
- `files` status | comment [XX] signal
--
THIS SCREEN SHOULD NOT CLEAN PREVIUS LOGS AND ALWAYS PRINT ALL JSON VALUES HAPPEN INSIDE! EVERYTING! SHOULD BE WITH SYNTAX HIGHTLIGHT! WE SHOULD BE ABLE TO SEE NEW EVENTS FROM ALL INTERNAL SYSTEMS WHAT MOSTLY HIDDEN INSIDE! BUT TO PREVENT SPAM I NEED YOU MAKE EVENT LOG HAPPEN ONCE FOR ACTION WITH DIFFERENT BRIGHT FOR PRIORITIES BETWEEN INSPECTOR AND ORCHESTRATOR AND SCANNER OR GUIDELINES OR SYSTEM (ALWAYS BRAND ORANGE! [HF] - System as example)
```md
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts", limit: 40)
     Read 40 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       30      ConfigUtils,s';ocuments/GitHub/prp/src/guidelines/registry.ts with 1 addition and 2 removals
     Search(pattern: "eventBus\.|Validator\.", path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts",
      ⎿  796:    eventBus.subscribeToChannel('signals', (event) => {
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts", offset: 790, limit: 10)
     Read 10 lines
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/shared/index.ts", limit: 50)
     Read 50 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       33 +    UtilsValidator,ocuments/GitHub/prp/src/guidelines/registry.ts with 1 addition
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       797 +      EventBus.subscribeToChannel('signals', (event) => {stry.ts with 1 addition and 1 removal
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       804 +      EventBus.subscribeToChannel('guidelines', (event) => {y.ts with 1 addition and 1 removal
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       1288 +          UtilsValidator.isValidAgentId(guideline.id) &&tion): boolean {ddition and 1 removal
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | grep "src/guidelines/executor.ts" | head -5)
     (No content)
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | grep "executor.ts")
     No matches found
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | wc -l)
     7
     Waiting… tsc --noEmit --skipLibCheck 2>&1)
     Error: Exit code 2
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts", offset: 33, limit: 15)
     Read 15 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts)
       38 -          },field: options.field,mespace,ger.getNudgeSecret({ with 1 addition and 2 removals
     Waiting… tsc --noEmit --skipLibCheck 2>&1)
     Error: Exit code 2
     Waiting… run build 2>&1 | head -20)
     > @dcversus/prp@0.4.9 build
     Search(pattern: "getNudgeSecret", path: "/Users/dcversus/Documents/GitHub/prp/src/kubectl/secret-manager.ts", output_mode:
      ⎿  43:  async getNudgeSecret(options: { forceRefresh?: boolean } = {}): Promise<SecretRetrievalResult> {
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts", offset: 25, limit: 25)
     Read 25 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts)
       39            const secret = await secretManager.getNudgeSecret({rationernetes...\n'));4 removals
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | grep "executor.ts" | head -3)
     src/guidelines/executor.ts(373,72): error TS4111: Property 'fetchedData' comes from an index signature, so it must be
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/executor.ts", offset: 370, limit: 5)
     Read 5 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/executor.ts)
       373 +      (execution.context.additionalContext as ExtendedAdditionalContext)['fetchedData'] = prData;
     Waiting… tsc --noEmit --skipLibCheck 2>&1)
     Error: Exit code 2
     Waiting… run build 2>&1 | head -10)
     > @dcversus/prp@0.4.9 build
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/tsconfig.json)
     Read 65 lines
     Update(/Users/dcversus/Documents/GitHub/prp/tsconfig.json)
       43 +      "noPropertyAccessFromIndexSignature": false,on with 1 addition and 1 removal
     Waiting… run build 2>&1 | head -15)
     > @dcversus/prp@0.4.9 build
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       37 +  import { configManager } from '../shared/config';ed/config';.ts with 1 addition and 1 removal
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/inspector/context-manager.ts", offset: 88, limit: 5)
     Read 5 lines

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> type or paste anything to
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
prp-agents-v05 [aA]  "preparing stop instructions to agent"
agents 2+ · prp 3 · ▲1     ·      ⚠️ debug ⚠️     ·      Tab - o|i|a|1|2|3|D   Ctrl+S - start    Ctrl+X - stop    Ctrl+D - debug

```

## TUI init design screen, FINAL!
- `files` status | comment [XX] signal
--

Below is the final Wizard screen spec (Ink/React CLI), with animated interactions, exact renders, component APIs, and implementation notes. It reuses the established palette, music-note semantics, spacing, and bottom-input rules from your TUI spec. Where terminal capabilities are environment-dependent (24-bit gradients, ANSI layers), I cite sources and provide 256-color fallbacks.

I used Ink’s official docs and ecosystem packages for forms, focus, and responsiveness; TrueColor/ANSI research for gradients; and ASCII/ANSI video tooling for overlay pipelines.  ￼
For 24-bit color and gradients, see TrueColor guidance; fall back to 256-color automatically.  ￼
For video→ANSI overlay, use ffmpeg + chafa pipeline.  ￼

⸻

Wizard Screen — Purpose

Minimal, scroll-driven setup wizard with asymmetric center-left layout, radial light bg (day/night), one input in focus, others dimmed. Keys show inline (no “shortcuts” label). Music-note icons signal state.
	•	Focus flow: Enter (next), Esc (back), ←/→ for horizontal selectors, ↑/↓ for vertical lists, Tab cycles focusable sub-areas in step when present.
	•	Bottom input: still fixed with ─ delimiters, per global rules.
	•	No vertical divider.
	•	Right spacing kept airy; wizard lives in a single column that floats near center.

⸻

Colors, fonts, background
	•	Bg gradient: center-soft radial using TrueColor if available; else 256-color approximation. Detect via COLORTERM=truecolor and termcap tests; degrade gracefully.  ￼
	•	Day: bg ramp bg1=#111315 → bg2=#1a1f24 → bg3=#21262d.
	•	Night: bg ramp bg1=#0b0c0d → bg2=#121416 → bg3=#171a1d.
	•	Foreground uses your neutral + role palette.
	•	Terminal monospace only (Menlo/SF Mono/JetBrains Mono as available).

Ink/Node implementation: render gradient lines with Chalk TrueColor; fallback to 256 if TrueColor unsupported. Use useStdoutDimensions() to recompute on resize.  ￼

⸻

Animations (wizard-specific)
	•	Step header status: ♪ (awaiting input) → ♬ (validating) → ♫ (confirmed). 4–6 fps.
	•	Selector carousel: items glide horizontally by re-printing with easing (two-frame ease-out).
	•	Tooltip fade: 2-frame brightness ramp when field gets focus.
	•	JSON flashes: when parsing OK, brace tint pulse once; on error, brief dim red underline (no emoji).
	•	Bg “breathing”: gradient center alpha ±5% every 2s when idle (only on TrueColor).

⸻

Renders — all steps (final)

Notes: Plain ASCII. Colors referenced by tokens like [accent_orange], [muted], [role:robo-developer]. Apply palette from your spec.

Step 0 — Intro (title + gray poem/quote)

♫ @dcversus/prp                                                     ⧗ 2025-11-05 04:12:00

[muted]“Tools should vanish; flow should remain.” — workshop note[/muted]

     This wizard will provision your workspace and first PRP.
     One input at a time. Minimal. Reversible.

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> press Enter
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc

Step 1 — Project

♪  Project

  Project name
  [focused]  prp-edgecraft-orchestrator  [/focused]   [muted]taken from package.json[/muted]

  Prompt
  [focused-block]
  Build an autonomous orchestration CLI that monitors PRPs, spawns agents,
  and enforces signal-driven workflow with TDD and Claude Code reviews.
  [/focused-block]
  [tip]From this description we scaffold the MVP. Continue detailing in PRPs/…[/tip]

  Folder
      /Users/you/dev/[accent_orange]prp-edgecraft-orchestrator[/accent_orange]
  [muted]Updates live as you edit Project name. Default: ./project-name[/muted]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> continue
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc     ↑/↓ move     ␣ toggle multiline

Step 2 — Connections (LLM providers for orchestration/inspection)

♪  Connections

  Provider
  [carousel]  [ OpenAI ]   Anthrop ic   Custom  [/carousel]

  Auth
  [focused]  OAuth (default)  [/focused]   API key

  [tip-muted]This LLM is used for orchestrator + inspector.[/tip-muted]

  [section-when-API-key]
    API key
    [focused]  sk-********************************  [/focused]
  [end]

  [section-when-Custom]
    Type               [ OpenAI | Anthrop ic ]
    Base URL           [ https://llm.company.local/v1 ]
    API token          [ *************** ]
    Custom args (JSON) [ { "timeout": 45_000, "seed": 7 } ]  [json-ok]
  [end]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> continue
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc     ←/→ switch provider    ⌥v paste secret     D see raw JSON

Step 3 — Agents (add one or many)

♪  Agents

  Type
  [carousel]  [ Claude ]   Codex   Gemini   AMP   Other  [/carousel]

  When Type = Claude
    [muted]Anthropic provider auto-selected; change under “provider”.[/muted]

  Add another after this?
  [focused]  Continue  [/focused]   Add more…

  [expanded-when-Add-more]

    Agent #1
      id                  [focused]  claude-code  [/focused]
      limit               [ 100usd10k#aqa ]       [tip-muted]budget#agent-name[/tip-muted]
      cv                  [ “code fixes + PR grooming; excels at refactors.” ]
      warning_limit       [ 2k#robo-quality-control ]
      provider            [ Anthrop ic | Custom ]
      yolo                [  off ]    [toggle]
      instructions_path   [ AGENTS.md ]
      sub_agents          [ on ]      [toggle]  [tip-muted]disable or supply array of role files[/tip-muted]
      max_parallel        [ 5 ]
      mcp                 [ .mcp.json ]  [clear to disable]
      Compact prediction
         percent_threshold [ 0.82 ]
         auto_adjust       [ on ]
         cap (tokens)      [ 24000 ]

    Agent #2
      [add/remove row controls]

  [end]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> continue
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc     ←/→ switch type     A add agent     R remove agent

Step 4 — Integrations

♪  Connections (repos/registry)

  Choose
  [focused]  [ GitHub ]  [/focused]   npm   skip

  If GitHub:
    Auth          [ OAuth ]   API URL / Token
    [muted]Will create workflows and templates.[/muted]

  If npm:
    Auth          [ OAuth ]   Token
    Registry      [ https://registry.npmjs.org ]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> continue
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc     ←/→ switch

Step 5 — Template

♪  Template

  Preset
  [carousel]  [ typescript ]   react   nestjs   fastapi   wikijs   none  [/carousel]

  [focused]  Continue with defaults  [/focused]   Configure files ↓

  [collapsed-defaults-preview]
    [✓] AGENTS.md   [✓] .prprc   [✓] .mcp.json   [✓] CLAUDE.md (symlink to AGENTS.md)
    [✓] .claude/agents/{orchestrator,robo-aqa,robo-developer,robo-devops-sre,robo-quality-control,robo-system-analyst,robo-ux-ui-designer}.md
    [✓] .github/workflows/{ci.yml,claude-code-review.yml,nudge-response.yml,deploy-gh.yml}
    [✓] .github/ISSUE_TEMPLATE/{bug_report.md,feature_request.md,template_request.md}  [✓] .github/PULL_REQUEST_TEMPLATE.md
    [✓] CHANGELOG.md  [✓] LICENSE  [✓] CONTRIBUTING.md  [✓] README.md  [✓] .gitignore
    [muted]AGENTS.md and .prprc are mandatory.[/muted]
  [end]

  [if Configure files expanded → file tree with checkboxes and right-arrow for sublists]

  [joke-muted]Generate selected files for “Build an autonomous orchestration CLI…”  [ ] Edit quote[/joke-muted]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> generate
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc     ↑/↓ move     → open subtree     ␣ toggle

Step 6 — Generation (preflight + progress)

Preflight screen (minimal orchestration layout):

♬  Preparing workspace:  /Users/you/dev/prp-edgecraft-orchestrator

[muted]You can cancel before file copy. After copy, process continues until first PRP is created.[/muted]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> start
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc

Progress (single-line replacements; diff snapshots condensed):

♫  Copying…  37 / 142  →  /Users/you/dev/prp-edgecraft-orchestrator
   current: .github/workflows/claude-code-review.yml

♫  Generating…
   AGENTS.md
     CoT: seed role map → inject budgets
     CoT: draft AQA/DEV/QA sequences
   ─ diff (AGENTS.md) ───────────────────────────────────────────────────────────
   001 + ## Agents
   002 + - robo-aqa: cross-links and audits
   003 + - robo-developer: implement & refactor
   …

   .prprc
     CoT: theme • signals • hotkeys
   ─ diff (.prprc) ──────────────────────────────────────────────────────────────
   014 + "accent_orange": "#FF9A38",
   …

   First PRP: PRPs/infra-bootstrap.md (+30 lines)

[accent_orange]Good. Stay sharp. Orchestrator is loading…[/accent_orange]

( fade to black, then main Orchestrator screen mounts )

Bottom delimiters persist:

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> cancel (Esc) / hide (Enter)
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc


⸻

Components (Ink) — APIs and responsibilities

Use these building blocks; each already follows your palette, spacing, and music-note semantics.

WizardShell
	•	Props: { title:string, stepIndex:number, total:number, children, footerKeys:string[] }
	•	Renders step header (♪/♬/♫), asymmetric margins, radial bg, bottom input/footers.

StepHeader
	•	Props: { icon:"♪"|"♬"|"♫", title:string }
	•	Animation: swap icon per state at 4–6 fps.

FieldText (single-line)
	•	Props: { label:string, value:string, placeholder?:string, notice?:string, onChange }
	•	Shows notice in muted gray to the right.

FieldTextBlock (multi-line)
	•	Props: { label:string, value:string, rows:number, tip?:string, onChange }
	•	Grows to 6–10 lines in focus; dim when unfocused.

FieldSecret
	•	Props: { label:string, value:string, placeholder?:string, onChange }
	•	Paste-aware; masks value.

FieldSelectCarousel
	•	Props: { label:string, items: string[], index:number, onChange }
	•	Horizontal slide; ←/→ switch.

FieldToggle
	•	Props: { label:string, value:boolean, onChange }

FieldJSON
	•	Props: { label:string, text:string, onChange }
	•	Validates JSON; pulses dim green on success; underlines red on error.

FileTreeChecks
	•	Props: { nodes: TreeNode[], onToggle(node) }
	•	Right-arrow to dive into sublists; checkbox rendering; preserves two-line preview collapsed.

AgentEditor
	•	Aggregates agent fields (id, limit, cv, warning_limit, provider, yolo, instructions_path, sub_agents, max_parallel, mcp, compact-prediction subfields).

GenerationProgress
	•	Props: { copying:{current:string,count:number,total:number}, events: Event[] }
	•	Single-line replacement, diff blocks, and CoT snapshots.

AnimatedBackground
	•	Props: { mode:"day"|"night", truecolor:boolean }
	•	Radial gradient; +/-5% breathing.

InlineKeys
	•	Props: { keys:string[] }
	•	Renders the minimal key hints at far right of bottom footer.

_All input plumbing via Ink hooks: useInput, useFocus, useStdoutDimensions for layout, useApp for cancel.*  ￼

⸻

Technical notes (implementation)
	•	Forms: ink-text-input for text/secret; ink-select-input for vertical lists; carousel is custom (left/right). ink-spinner for transient “validating” spinners where needed.  ￼
	•	Responsive: useStdoutDimensions(); for full-screen sizing, a trivial helper (or fullscreen-ink) computes a canvas matching terminal size.  ￼
	•	Gradient: build with Chalk .bgHex() across each printed row; compute radial alpha per column; fallback to 256-color when TrueColor absent, per XVilka guidance.  ￼
	•	Intro overlay (optional in wizard): ffmpeg extract @12fps → chafa to ANSI; pre-scale to terminal size buckets; paint into free bg area only.  ￼
	•	Accessibility: keep contrast ≥4.5:1 for main text; avoid low-contrast on mandatory form labels.
	•	macOS Terminal: [Unverified] TrueColor behavior varies by version; detect at runtime and degrade to 256-color if absent.  ￼

⸻

Interaction rules (concise)
	•	One focused field per screen; others dim.
	•	Enter validates → next; on error, field highlights and refuses to advance.
	•	Esc returns to previous step with state retained.
	•	Carousel left/right wraps; vertical lists show 5–7 items with scroll.
	•	Adding agents clones AgentEditor blocks; remove with R.
	•	JSON field validates on each keypress (debounced 150ms).

⸻

Data binding notes
	•	Live folder path: slugify(project name) → join with CWD; recompute on value change.
	•	Provider: OpenAI default OAuth; API key path expands on toggle.
	•	Custom provider: expose base URL/token/args; validate URL and JSON.
	•	Agents: when Type=Claude, restrict provider to Anthrop ic|Custom; when Type=Codex, OpenAI|Custom; “Other” exposes command text field (my-agent --flag1 --flag2), with a muted example showing how prompt is piped to stdin.

⸻

Minimal instrumented footer
	•	Two ─ lines around input, unchanged from main app.
	•	Footer shows only keys: Enter  Esc  ←/→  ↑/↓  ␣  A  R  D and, at far right, short context (e.g., step 3/6).

⸻

Ready-to-code checklist
	•	WizardShell with day/night gradient + breathing.
	•	Step router + state machine.
	•	Field components wired to Ink focus + input.
	•	Carousel with easing.
	•	JSON editor parse/flash.
	•	FileTreeChecks with sublists.
	•	AgentEditor with add/remove.
	•	GenerationProgress with line-replace and diff blocks.
	•	TrueColor detect + 256 fallback.  ￼
	•	Intro overlay plumbing (ffmpeg/chafa) gated behind capability flag.

⸻

Notes on sources
	•	Ink renderer, hooks, and component patterns.  ￼
	•	Form inputs for Ink.  ￼
	•	Spinners and async affordances.  ￼
	•	Responsive sizing in Ink.  ￼
	•	TrueColor capabilities and detection.  ￼
	•	ANSI video conversion.  ￼

This is the final wizard design: screens, renders, components, interactions, and implementation plan conforming to your TUI rules.

## TUI Design Specifications

### TUI Design Overview
PRPs/PRP-004-tui-implementation.md
make sure all tsx components corresponding to design is created and well unit tested for behavioral and ink test tools; our tui design always should be ready for responsive from small screens (compact orchestrator with ONLY agents-logs) to largest 8k with ALL screens in single layout and tab switching active one
in main orchestrator mode we have several tabs, can be listed with tab - Tab - o|i|a|1|2|3|
o - stands for orchestrator screen, i - information screen, a - ALL agents tmux splitted, 1-2-3-N is fullscreen agent with shared across app footer
information screen is a experemental list of PRP and signals history (up-down-enter to open signal history, or close to see just signals). we need parse SHARED CONTEXT from orchestrator, mostly its a markdown with list of ## prp and inside "what was done", "whats working on", "whats next", "blockers" and special optional ### incident section, on info screen we need merge this SHARED CONTEXT format we preserve in src/prompts/shared.md and add this info to signals and signal history.
a - ALL agents screen

### TUI Design Main Orchestrator Screen, FINAL!
I expecting TUI to be maximum look like this:

```
HF ⧗ 2025-11-02 13:22:10
EDGECRAFT  ⌁ /Users/dcversus/Documents/GitHub/edgecraft

system · 2025-11-02 13:22:01
{ startup: true, prpCount: 7, readyToSpawn: true }

scanner · 2025-11-02 13:22:04
{ detected: [fs-change,new-branch,secrets-ref], count: 3 }

inspector · 2025-11-02 13:22:08
{ impact: high, risk: 8, files: [PRPs/agents-v05.md,PRPs/…], why: cross-links missing }

> Analyse whats status

  ♪ · i need some time, please wait... <3


♫ · RUNNING · prp-agents-v05#robo-aqa · audit PRP links · T–00:09 · DoD 35%
    CoT: integrating cross-links…
  ⎿ commit staged: 3 files
  tokens=18.2k · active=00:01:43 // should be gray, but visible!

♪ · SPAWNING · prp-landing#robo-dev · extract sections · T–00:25 · DoD 12%
    npm run build: ok
  ⎿ parsing md toc…
  tokens=4.3k  · active=00:00:28 // should be gray, but visible!


♫ · RUNNING · Orchestrator · prp-agents-v05 [ob]
    Δ scanner → inspector → CoT: ...ht now we need find more details from status, let me pr
    ⇢ diff.read → { changed: 6, hot: [PRPs/agents-v05.md,…] }

// TODO: lines below should be not below by default but an actual like sidebar aligned to right-bottom, need make it happen, and all should be here in stylish monospace developer loved font! we need align all to be perfect with all sizes, and fall back to view like this if window small with scroll, and always · should be spaced araund to avaiable width of sidebar (width preserved) or full screen
RUNNING  ·  prp-agents-v05#robo-aqa
[aA] [pr] [PR] [FF] [ob] [AA] [< ]

SPAWNING · prp-landing#robo-develop
[  ] [  ] [FF] [XX] [XX] [XX] [XX]

IDLE · prp-nudge#robo-legal-complie
[  ] [  ] [  ] [  ] [  ] [  ] [pr]


────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> Can you create something like this?   -- pasted 3 842 tokens | 6f27e9b1 --
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
prp-agents-v05 [aA]  "preparing stop instructions to agent"
agents 2+ · prp 3 · ▲1                                              Tab - o|i|a|1|2|3|    S - start    X - stop    D - debug

// i see our footer as universal for all screens and always visible! with one space empty line before bottom, last line should be gray, delimiter should be also blended with bg color
// last line should by dynamicaly highlight current screen in tabs with accent color and buttons start stop will update to - 'stop/start selected' or 'stop/start all' depends we on o-orchestrator screen above, or other i-info screen with prompt
// IF we go with bigger screens, we need somehow wrap each section as widgets and add new behavier to see more details as screen allow, until ultra screens, where we should be able to place and all screens together and open all agent logs to all space, need structured layouts and strategies to be described here too
```

### TUI Design Debug Mode, FINAL!
THIS SCREEN SHOULD NOT CLEAN PREVIUS LOGS AND ALWAYS PRINT ALL JSON VALUES HAPPEN INSIDE! EVERYTING! SHOULD BE WITH SYNTAX HIGHTLIGHT! WE SHOULD BE ABLE TO SEE NEW EVENTS FROM ALL INTERNAL SYSTEMS WHAT MOSTLY HIDDEN INSIDE! BUT TO PREVENT SPAM I NEED YOU MAKE EVENT LOG HAPPEN ONCE FOR ACTION WITH DIFFERENT BRIGHT FOR PRIORITIES BETWEEN INSPECTOR AND ORCHESTRATOR AND SCANNER OR GUIDELINES OR SYSTEM (ALWAYS BRAND ORANGE! [HF] - System as example)
```md
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts", limit: 40)
     Read 40 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       30      ConfigUtils,s';ocuments/GitHub/prp/src/guidelines/registry.ts with 1 addition and 2 removals
     Search(pattern: "eventBus\.|Validator\.", path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts",
      ⎿  796:    eventBus.subscribeToChannel('signals', (event) => {
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts", offset: 790, limit: 10)
     Read 10 lines
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/shared/index.ts", limit: 50)
     Read 50 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       33 +    UtilsValidator,ocuments/GitHub/prp/src/guidelines/registry.ts with 1 addition
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       797 +      EventBus.subscribeToChannel('signals', (event) => {stry.ts with 1 addition and 1 removal
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       804 +      EventBus.subscribeToChannel('guidelines', (event) => {y.ts with 1 addition and 1 removal
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       1288 +          UtilsValidator.isValidAgentId(guideline.id) &&tion): boolean {ddition and 1 removal
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | grep "src/guidelines/executor.ts" | head -5)
     (No content)
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | grep "executor.ts")
     No matches found
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | wc -l)
     7
     Waiting… tsc --noEmit --skipLibCheck 2>&1)
     Error: Exit code 2
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts", offset: 33, limit: 15)
     Read 15 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts)
       38 -          },field: options.field,mespace,ger.getNudgeSecret({ with 1 addition and 2 removals
     Waiting… tsc --noEmit --skipLibCheck 2>&1)
     Error: Exit code 2
     Waiting… run build 2>&1 | head -20)
     > @dcversus/prp@0.4.9 build
     Search(pattern: "getNudgeSecret", path: "/Users/dcversus/Documents/GitHub/prp/src/kubectl/secret-manager.ts", output_mode:
      ⎿  43:  async getNudgeSecret(options: { forceRefresh?: boolean } = {}): Promise<SecretRetrievalResult> {
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts", offset: 25, limit: 25)
     Read 25 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/commands/secret.ts)
       39            const secret = await secretManager.getNudgeSecret({rationernetes...\n'));4 removals
     Waiting… tsc --noEmit --skipLibCheck 2>&1 | grep "executor.ts" | head -3)
     src/guidelines/executor.ts(373,72): error TS4111: Property 'fetchedData' comes from an index signature, so it must be
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/guidelines/executor.ts", offset: 370, limit: 5)
     Read 5 lines
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/executor.ts)
       373 +      (execution.context.additionalContext as ExtendedAdditionalContext)['fetchedData'] = prData;
     Waiting… tsc --noEmit --skipLibCheck 2>&1)
     Error: Exit code 2
     Waiting… run build 2>&1 | head -10)
     > @dcversus/prp@0.4.9 build
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/tsconfig.json")
     Read 65 lines
     Update(/Users/dcversus/Documents/GitHub/prp/tsconfig.json)
       43 +      "noPropertyAccessFromIndexSignature": false,on with 1 addition and 1 removal
     Waiting… run build 2>&1 | head -15)
     > @dcversus/prp@0.4.9 build
     Update(/Users/dcversus/Documents/GitHub/prp/src/guidelines/registry.ts)
       37 +  import { configManager } from '../shared/config';ed/config';.ts with 1 addition and 1 removal
     Read(file_path: "/Users/dcversus/Documents/GitHub/prp/src/inspector/context-manager.ts", offset: 88, limit: 5)
     Read 5 lines

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> type or paste anything to
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
prp-agents-v05 [aA]  "preparing stop instructions to agent"
agents 2+ · prp 3 · ▲1     ·      ⚠️ debug ⚠️     ·      Tab - o|i|a|1|2|3|D   Ctrl+S - start    Ctrl+X - stop    Ctrl+D - debug

```

### TUI Design Intro Sequence

Wizard Screen — Purpose

Minimal, scroll-driven setup wizard with asymmetric center-left layout, radial light bg (day/night), one input in focus, others dimmed. Keys show inline (no "shortcuts" label). Music-note icons signal state.
	•	Focus flow: Enter (next), Esc (back), ←/→ for horizontal selectors, ↑/↓ for vertical lists, Tab cycles focusable sub-areas in step when present.
	•	Bottom input: still fixed with ─ delimiters, per global rules.
	•	No vertical divider.
	•	Right spacing kept airy; wizard lives in a single column that floats near center.

⸻

Colors, fonts, background
	•	Bg gradient: center-soft radial using TrueColor if available; else 256-color approximation. Detect via COLORTERM=truecolor and termcap tests; degrade gracefully.  ￼
	•	Day: bg ramp bg1=#111315 → bg2=#1a1f24 → bg3=#21262d.
	•	Night: bg ramp bg1=#0b0c0d → bg2=#121416 → bg3=#171a1d.
	•	Foreground uses your neutral + role palette.
	•	Terminal monospace only (Menlo/SF Mono/JetBrains Mono as available).

Ink/Node implementation: render gradient lines with Chalk TrueColor; fallback to 256 if TrueColor unsupported. Use useStdoutDimensions() to recompute on resize.  ￼

⸻

### Color Scheme (pastels + grays; dark/light aware)
Use as foreground unless "bg" specified. Define in .prprc and resolve to nearest 256-color or truecolor.
  - Accent / Orchestrator: accent_orange = #FF9A38 (active), dim #C77A2C, bg #3A2B1F
  - Roles:
    - robo-aqa (purple): #B48EAD active, dim #6E5C69, bg #2F2830
    - robo-quality-control (red): #E06C75 active, dim #7C3B40, bg #321E20
    - robo-system-analyst (brown, high contrast): #C7A16B active, dim #7A6445, bg #2C2419
    - robo-developer (blue): #61AFEF active, dim #3B6D90, bg #1D2730
    - robo-devops-sre (green): #98C379 active, dim #5F7B52, bg #1F2A1F
    - robo-ux-ui (pink): #D19A66 alt-rose #E39DB3 active, dim #8A5667, bg #2E2328
    - robo-legal-compliance (light-violet): #C5A3FF active, dim #705E93, bg #281F35
  - Signals/braces: braces default #FFB56B (accent pastel). Empty placeholder [  ] braces in neutral gray #6C7078. Resolved letters use dim role color; active letters use role active color.
  - Neutrals: base fg #E6E6E6 (dark theme), base bg terminal default; muted #9AA0A6; error #FF5555; warn #FFCC66; ok #B8F28E.
Light theme flips contrast (bg light, text darker variants). Keep contrast ≥ 4.5:1 for main text.

### Fonts
  - Terminal monospace only. Recommend Menlo / SF Mono / JetBrains Mono. No second font is possible in terminal; emulate "accent header font" with bg pills, all-caps, spacing, and higher contrast.

### Animation Requirements (global)
  - State icons: use Unicode music symbols only:
  - start/prepare: ♪
  - running/progress: ♩, ♪, ♬ (pair), ♫ (final/steady)
  - double-agent state: draw pair glyphs (e.g., ♬) or two symbols separated by thin space.
  - Idle melody blink: last signal's associated melody drives periodic blink of ♫ (on/off at beat).
  - Signal wave: while scanning, slide a pastel wave across signal placeholders [ ] from left→right (color pulse).
  - Inspector done: blink both braces of all visible signals twice (pastel → base → pastel).
  - Orchestrator→Agent dispatch: show [  ] → [ ♫] → [♫♫] → [♫ ] → [  ] loop during request in that PRP slot.
  - Progress cell [FF] animation: frames [F ] → [  ] → [ F] → [FF] repeat at ~8fps when active.

### Logo Sequence (10s intro; video-to-text overlay)
Target: 10s @ 12 fps (120 frames). Size: adapt to terminal (sample at 120×34 chars). Path: center-out radial, NES demoscene vibe.

Timeline
  - 0.0–1.0s: Fade-in radial vignette; single ♪ appears center; low-alpha ASCII background.
  - 1.0–3.0s: ♪ pulses (grow/shrink 1 char), subtle starfield drift (random · and *).
  - 3.0–6.0s: Orbiting notes (♪ ♩ ♬) circle center on 8-step path; hue shifts through role palette (slow).
  - 6.0–8.0s: Morph trail: ♪ trails → ♬ → resolves to ♫ (hold), radial glow intensifies.
  - 8.0–10.0s: Title wipes in below: ♫ @dcversus/prp + subtitle lines; radial vignette shrinks; overlay alpha→0; clear to layout.

ASCII overlay rule
  - Only render to empty bg (no UI text). Apply radial alpha a(r) to per-char luminance. Character ramp: '  .,:;ox%#@' from light→dark. Keep overlay behind UI; never obscure input/status.

### Animations (wizard-specific)
	•	Step header status: ♪ (awaiting input) → ♬ (validating) → ♫ (confirmed). 4–6 fps.
	•	Selector carousel: items glide horizontally by re-printing with easing (two-frame ease-out).
	•	Tooltip fade: 2-frame brightness ramp when field gets focus.
	•	JSON flashes: when parsing OK, brace tint pulse once; on error, brief dim red underline (no emoji).
	•	Bg "breathing": gradient center alpha ±5% every 2s when idle (only on TrueColor).

⸻

### Renders — all steps (final)

Notes: Plain ASCII. Colors referenced by tokens like [accent_orange], [muted], [role:robo-developer]. Apply palette from your spec.

Step 0 — Intro (title + gray poem/quote)

♫ @dcversus/prp                                                     ⧗ 2025-11-05 04:12:00

[muted]"Tools should vanish; flow should remain." — workshop note[/muted]

     This wizard will provision your workspace and first PRP.
     One input at a time. Minimal. Reversible.

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> press Enter
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc

Step 1 — Project

♪  Project

  Project name
  [focused]  prp-edgecraft-orchestrator  [/focused]   [muted]taken from package.json[/muted]

  Prompt
  [focused-block]
  Build an autonomous orchestration CLI that monitors PRPs, spawns agents,
  and enforces signal-driven workflow with TDD and Claude Code reviews.
  [/focused-block]
  [tip]From this description we scaffold the MVP. Continue detailing in PRPs/…[/tip]

  Folder
      /Users/you/dev/[accent_orange]prp-edgecraft-orchestrator[/accent_orange]
  [muted]Updates live as you edit Project name. Default: ./project-name[/muted]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> continue
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc     ↑/↓ move     ␣ toggle multiline

Step 2 — Connections (LLM providers for orchestration/inspection)

♪  Connections

  Provider
  [carousel]  [ OpenAI ]   Anthrop ic   Custom  [/carousel]

  Auth
  [focused]  OAuth (default)  [/focused]   API key

  [tip-muted]This LLM is used for orchestrator + inspector.[/tip-muted]

  [section-when-API-key]
    API key
    [focused]  sk-********************************  [/focused]
  [end]

  [section-when-Custom]
    Type               [ OpenAI | Anthrop ic ]
    Base URL           [ https://llm.company.local/v1 ]
    API token          [ *************** ]
    Custom args (JSON) [ { "timeout": 45_000, "seed": 7 } ]  [json-ok]
  [end]

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> continue
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Enter    Esc     ←/→ switch provider    ⌥v paste secret     D see raw JSON

Step 3 — Agents (add one or many)

♪  Agents

  Type
  [carousel]  [ Claude ]   Codex   Gemini   AMP   Other  [/carousel]

  When Type = Claude
    [muted]Anthropic provider auto-selected; change under "provider".[/muted]

  Add another after this?
  [focused]  Continue  [/focused]   Add more…

  [expanded-when-Add-more]

    Agent #1
      id                  [focused]  claude-code  [/focused]

--
Sources and References:
```typescript
// Framework Documentation
const frameworks = {
  ink: "https://github.com/vadimdemedes/ink",
  inkDocs: "https://github.com/vadimdemedes/ink/blob/master/README.md",
  reactBlessed: "https://github.com/Yomguithereal/react-blessed",
  blessed: "https://github.com/chjj/blessed"
};

// Production Examples
const examples = {
  githubCli: "https://github.com/cli/cli",
  shopifyCli: "https://github.com/Shopify/shopify-cli",
  cloudflareWrangler: "https://github.com/cloudflare/wrangler2",
  lazydocker: "https://github.com/jesseduffield/lazydocker",
  btop: "https://github.com/aristocratos/btop"
};

// Performance Benchmarks
const benchmarks = {
  inkPerformance: "https://github.com/vadimdemedes/ink/issues/399",
  terminalRendering: "https://github.com/microsoft/vscode/issues/148794"
};
```
