# PRP-003: Init Flow Enhancement and Standardization

> "The init command should create the perfect foundation for any PRP project, detecting existing environments and setting up comprehensive project structure with minimal friction"

## init flow
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
  [carousel]  [ OpenAI ]   Anthropic   Custom  [/carousel]

  Auth
  [focused]  OAuth (default)  [/focused]   API key

  [tip-muted]This LLM is used for orchestrator + inspector.[/tip-muted]

  [section-when-API-key]
    API key
    [focused]  sk-********************************  [/focused]
  [end]

  [section-when-Custom]
    Type               [ OpenAI | Anthropic ]
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

## dor
- [ ] Extract TUI wizard components from PRP-000 specification
- [ ] Implement responsive layout with day/night themes
- [ ] Create field components with validation
- [ ] Add generation progress with real-time feedback

## dod
- [ ] All 6 wizard steps implemented and functional
- [ ] Intro sequence with ASCII animation works
- [ ] Form validation with real-time feedback
- [ ] File tree with checkbox selection
- [ ] Agent configuration system
- [ ] Generation progress with diff snapshots
- [ ] | VERIFIED with (e2e test)[tests/e2e/init-wizard.test.ts] confirming full wizard flow
- [ ] | VERIFIED with (component tests)[src/tui/components/__tests__/] verifying each component

## init flow files
- `/src/tui/init-flow.tsx` | Main init wizard entry point that imports wizard components (currently broken - missing wizard directory) | [bb]
- `/src/tui/components/init/InitFlow.tsx` | Complete 6-step flow component implementing PRP-003 wizard specifications | [dp]
- `/src/tui/components/init/InitShell.tsx` | Wizard shell wrapper with animated background and step navigation | [dp]
- `/src/tui/components/init/IntroScreen.tsx` | Intro screen with ASCII animation and welcome message | [dp]
- `/src/tui/components/init/IntroSequence.tsx` | Animated intro sequence component | [dp]
- `/src/tui/components/init/ProjectScreen.tsx` | Project configuration screen with name and prompt inputs | [dp]
- `/src/tui/components/init/ConnectionsScreen.tsx` | LLM provider configuration screen | [dp]
- `/src/tui/components/init/AgentsScreen.tsx` | Agent configuration screen with add/remove functionality | [dp]
- `/src/tui/components/init/IntegrationsScreen.tsx` | GitHub/npm integrations configuration screen | [dp]
- `/src/tui/components/init/TemplateScreen.tsx` | Template selection and file tree configuration screen | [dp]
- `/src/tui/components/init/WizardShell.tsx` | Core wizard shell component with step headers and navigation | [dp]
- `/src/tui/components/init/FieldText.tsx` | Single-line text input field component | [dp]
- `/src/tui/components/init/FieldTextBlock.tsx` | Multi-line text area component | [dp]
- `/src/tui/components/init/FieldSecret.tsx` | Secret field component for API keys and passwords | [dp]
- `/src/tui/components/init/FieldSelectCarousel.tsx` | Horizontal carousel selector component | [dp]
- `/src/tui/components/init/FieldToggle.tsx` | Boolean toggle switch component | [dp]
- `/src/tui/components/init/FieldJSON.tsx` | JSON editor with validation and syntax highlighting | [dp]
- `/src/tui/components/init/FileTreeChecks.tsx` | File tree with checkbox selection for template files | [dp]
- `/src/tui/components/init/AgentEditor.tsx` | Agent configuration form with advanced settings | [dp]
- `/src/tui/components/init/GenerationProgress.tsx` | Progress component with diff snapshots and real-time updates | [dp]
- `/src/tui/components/init/ConfigIntegration.tsx` | Configuration integration utilities | [dp]
- `/src/tui/components/init/types.ts` | TypeScript type definitions for init flow | [dp]
- `/src/tui/components/init/index.ts` | Export barrel for init components | [dp]
- `/src/commands/tui-init.ts` | TUI init command handler with CI mode support and strict TypeScript compliance | [dp]
- `/src/commands/init.ts` | Main init command that delegates to tui-init | [dp]

### Missing Implementations Identified by E2E Tests (2025-11-10)
- [ ] **E2E Test Missing Implementations** | Comprehensive test suite identifies missing wizard components and TUI integration | [er]
- [ ] **6-step wizard flow implementation** | Complete wizard flow with all steps from intro to generation progress | [ip]
- [ ] **TUI component integration** | All 17 wizard field components need implementation and integration | [ip]
- [ ] **Animated background system** | Day/night gradient background with breathing animation (TrueColor/256 fallback) | [ip]
- [ ] **Music note state indicators** | Step header status animations (♪ → ♬ → ♫) with 4-6 fps timing | [ip]
- [ ] **Input validation system** | Real-time field validation with visual feedback and error handling | [ip]
- [ ] **File tree navigation** | Interactive file selection with sub-tree expansion and checkbox controls | [ip]
- [ ] **Generation progress visualization** | Real-time diff snapshots and CoT visualization during project generation | [ip]
- [ ] **Keyboard navigation system** | Complete keyboard shortcuts (Enter, Esc, arrows, Tab, space) with focus management | [ip]
- [ ] **Responsive layout system** | Asymmetric center-left layout with proper spacing and responsive design | [ip]
- [ ] **Template preview system** | Live template preview with file tree and selection feedback | [ip]
- [ ] **Configuration validation** | Real-time .prprc validation with schema checking and error reporting | [ip]
- [ ] **Agent configuration UI** | Complete agent setup with add/remove functionality and advanced settings | [ip]
- [ ] **Integration setup flow** | GitHub and npm integration with OAuth and API key management | [ip]

### backup files (cleanup needed)
- `/src/tui/components/init/InitFlow.tsx.bak` | Backup file - needs deletion | [cd]
- `/src/tui/components/init/ConfigIntegration.tsx.backup` | Backup file - needs deletion | [cd]
- `/src/tui/components/init/ConfigIntegration.tsx.bak` | Backup file - needs deletion | [cd]
- `/src/tui/components/init/types.ts.bak` | Backup file - needs deletion | [cd]
- `/src/tui/components/IntroSequence.tsx.bak` | Backup file in parent directory - needs deletion | [cd]
- `/src/tui/components/VideoIntro.tsx.bak` | Backup file in parent directory - needs deletion | [cd]