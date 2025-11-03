## Branding Implementation (♫ @dcversus/prp)

### Music Symbol Animation System
- [ ] **Symbol State Mapping**:
  - Start/prepare: ♪
  - Running/progress: ♩, ♪, ♬ (pair), ♫ (final/steady)
  - Double-agent states: Pair glyphs (♬) or two symbols with thin space
- [ ] **Idle Melody Blink**: Last signal's melody drives periodic ♫ blink
- [ ] **Signal Wave Animation**: Pastel wave slides across signal placeholders [ ]
- [ ] **Inspector Completion**: Both braces blink twice (pastel → base → pastel)
- [ ] **Progress Animation**: [FF] cycles through [F ] → [  ] → [ F] → [FF] at ~8fps
- [ ] **Agent Dispatch**: [  ] → [ ♫] → [♫♫] → [♫ ] → [  ] loop during requests

### Retro Chip Demo Intro (10 seconds)
- [ ] **Technical Specs**: 12 fps, 120 frames total, 120×34 chars base size
- [ ] **Visual Elements**:
  - Radial fade vignette from center
  - Single ♪ appears at center (0.0-1.0s)
  - Low-alpha ASCII background
  - Starfield drift with random · and *
  - Orbiting notes with color transitions
  - Title wipe-in effect
- [ ] **NES Demoscene Aesthetic**: Retro computer demo scene vibe
- [ ] **Adaptive Sizing**: Scales to terminal size
- [ ] **Frame Preloading**: Different sizes preloaded
- [ ] **Playback System**: Proper timing without blocking UI

### Color Scheme Implementation
- [ ] **Accent Colors**:
  - Orchestrator: #FF9A38 (active), #C77A2C (dim), #3A2B1F (bg)
  - Default braces: #FFB56B (accent pastel)
  - Empty placeholder [ ]: #6C7078 (neutral gray)
- [ ] **Role Colors**:
  - robo-aqa: Purple #B48EAD / #6E5C69 / #2F2830
  - robo-quality-control: Red #E06C75 / #7C3B40 / #321E20
  - robo-system-analyst: Brown #C7A16B (high contrast)
  - robo-developer: Blue #61AFEF / #3B6D90 / #1D2730
  - robo-devops-sre: Green #98C379 / #5F7B52 / #1F2A1F
  - robo-ux-ui: Pink #D19A66 / #E39DB3 / #2E2328
- [ ] **Contrast Requirements**: ≥4.5:1 for main text
- [ ] **Theme Support**: Dark/light theme with flipped contrast

### Signal-to-Melody Mapping Rules
- [ ] **Critical Signals** ([FF], [bb], [ic], [JC]): Full orchestral tutti, brass fanfares
- [ ] **Progress Signals** ([dp], [tp], [bf]): Rising melodies with crescendo
- [ ] **Testing Signals** ([tg], [cq], [cp]): Steady rhythms, clear harmonies
- [ ] **Coordination Signals** ([oa], [pc], [cc]): Instrumental dialogues
- [ ] **Completion Signals** ([rv], [mg], [rl]): Perfect cadences, major key resolutions

### Integration Points
- [ ] **Scanner Integration**: Receive [XX] signals via event bus
- [ ] **TUI Integration**: Display music symbols in terminal
- [ ] **Inspector Enhancement**: 40K output includes musical summaries
- [ ] **Token Monitoring**: Track audio system resource usage
- [ ] **Configuration**: .prprc settings for audio preferences