# PRP-005: TUI System Implementation

> Implement comprehensive Terminal User Interface (TUI) system with real-time signal visualization, agent monitoring, music-based status indicators, and responsive 4-screen layout matching exact design specifications from tui-implementation.md

**Status**: 🔄 IN DEVELOPMENT
**Created**: 2025-11-05
**Updated**: 2025-11-05
**Owner**: Robo-UX/UI-Designer (TUI Implementation Specialist)
**Priority**: CRITICAL
**Complexity**: 10/10
**Timeline**: 3 weeks
**Dependencies**: None (Foundation PRP)

## 🎯 Primary Mission

Analyze standalone tui-implementation.md document, extract all TUI requirements and specifications, and implement comprehensive Terminal User Interface system with real-time signal visualization, agent monitoring, music-based status indicators, and responsive design that matches exact specifications from the implementation document.

### User Quote with All Requirements

> "♫ @dcversus/prp — Final TUI Specification (Ink/React for CLIs)"
> "I expecting TUI to be maximum look like this: [exact orchestrator screen design]"
> "ALL HERE IS REQ!" - Complete TUI implementation with branding, animations, and real-time updates

## 📊 Progress

[ip] Implementation Plan - Phase 1 foundation complete. Created responsive layout engine with breakpoints (100/160/240+ cols), animation system with frame management and melody sync, MusicIcon component with status-based animations, SignalBar component with wave effects and real-time updates, .prprc configuration integration with validation and hot-reload, and comprehensive testing framework with mock terminal and visual regression support. All core infrastructure components ready for Phase 2 component implementation. | 2025-11-07 14:00:00 | robo-ux-ui-designer (Sonnet 4.5)

[dp] Development Progress - Phase 1 TUI system foundation implemented. Responsive layout engine successfully handles terminal size detection and panel calculations. Animation engine provides 8fps frame management with melody synchronization. MusicIcon component integrates with animation engine for smooth status transitions. SignalBar component supports progress animations, wave effects, and real-time signal updates. Configuration system enables .prprc integration with validation and hot-reload capabilities. Testing framework provides comprehensive component testing with mock terminal environment. All Phase 1 deliverables completed with proper TypeScript types and documentation. | 2025-11-07 14:30:00 | robo-ux-ui-designer (Sonnet 4.5)

## Description

Based on comprehensive analysis of tui-implementation.md, implement a complete Terminal User Interface system for the @dcversus/prp orchestration platform. The TUI must match exact design specifications with symbol-to-symbol precision, featuring real-time signal visualization, music-based status indicators, agent monitoring, and responsive 4-screen layout system.

### Core Requirements Extracted from tui-implementation.md:

#### Branding & Visual Identity
- **Project Name**: ♫ @dcversus/prp
- **Positioning**: Autonomous Development Orchestration
- **Tagline**: OpenAI orchestrator + Claude agents + signal-based workflow = zero coordination overhead
- **Color Scheme**: Pastels + grays with dark/light theme support
- **Music Symbols**: ♪ ♩ ♬ ♫ for state indicators only

#### Screen Architecture
1. **Screen 1**: Orchestrator (main) - Signal bus, agent cards, CoT display
2. **Screen 2**: PRP/Context/Split - Split view with PRP details and context
3. **Screen 3**: Agent Fullscreen - Claude Code-style agent output display
4. **Screen 4**: Token Metrics Dashboard - Real-time graphs and analytics

#### Animation System
- Status icons: ♪ (start/prepare), ♩/♪/♬ (running), ♫ (steady/idle)
- Progress animations: [FF] signal frames at 8fps
- Scanner wave: Color pulse across signal placeholders
- Inspector done: Brace blink animation
- Idle melody: ♫ blinking at signal beat
- 10s intro sequence with logo evolution

## ✅ Definition of Done (DoD)

### Exact Design Implementation (Symbol-to-Symbol Matching)
- [ ] Orchestrator screen matches "### TUI design main orchestrator screen, FINAL!" exactly
- [ ] Debug mode screen matches "### TUI design debug mode, FINAL!" exactly
- [ ] All music symbols (♪ ♩ ♬ ♫) implemented with proper animations
- [ ] Color scheme matches pastel palette with role-based colors
- [ ] Layout matches 3-screen + token dashboard architecture
- [ ] Footer with fixed bottom input and status line implemented
- [ ] Right-aligned PRP list without vertical delimiters
- [ ] Responsive breakpoints (100, 160, 240+ cols) working
- [ ] Agent cards with real-time status updates functional
- [ ] Signal visualization with progress animations working

### Brand Implementation Complete
- [ ] ♫ @dcversus/prp branding displayed consistently
- [ ] Accent orange #FF9A38 for orchestrator elements
- [ ] Role-based colors: Purple (AQA), Red (QC), Brown (SA), Blue (Dev), Green (DevOps), Pink (UX)
- [ ] Pastel color variants for active/resolved states
- [ ] Terminal monospace font optimization
- [ ] Background pills for accent header effects

### Animation & Interactive Elements
- [ ] Status melody animations for all agent states
- [ ] Signal progress animation [F ] → [  ] → [ F] → [FF] at 8fps
- [ ] Scanner wave animation across placeholders
- [ ] Inspector done blink effect (2x brace flash)
- [ ] Idle melody blink synchronized with beats
- [ ] Dispatch loop animation [  ] → [ ♫] → [♫♫] → [♫ ] → [  ]
- [ ] 10s intro sequence with radial fade and logo evolution
- [ ] Real-time updates without UI lag

### Component System Implementation
- [ ] RoboRolePill with bg color effects
- [ ] SignalTag with animations and state management
- [ ] AgentCard with real-time updates and music icons
- [ ] OrchestratorBlock with CoT display
- [ ] HistoryItem with compact JSON formatting
- [ ] PRPList with right-aligned layout
- [ ] InputBar with paste handling and token counting
- [ ] Footer with status display and hotkeys
- [ ] DebugPanel with comprehensive event logging

### Real-time Data Integration
- [ ] EventBus integration for live signal updates
- [ ] Agent status tracking with real-time timers
- [ ] Scanner/Inspector/Orchestrator data feeds
- [ ] Token counting and cost tracking
- [ ] File system change detection and display
- [ ] Configuration changes with hot-reload
- [ ] Error handling and recovery mechanisms

### Performance & Accessibility
- [ ] Sub-100ms update latency for all components
- [ ] Memory-efficient animations with proper cleanup
- [ ] Keyboard navigation (Tab, S, X, D, arrows)
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] Responsive design for 80-240+ column terminals
- [ ] Performance optimization for large data sets
- [ ] Cross-platform compatibility (macOS, Linux, Windows)

### Configuration & Customization
- [ ] .prprc configuration file integration
- [ ] Real-time configuration updates
- [ ] Color scheme customization
- [ ] Font and layout preferences
- [ ] Hotkey customization
- [ ] Animation speed controls
- [ ] Theme switching (dark/light)

## ✅ Definition of Ready (DoR)

### Analysis Complete
- [x] tui-implementation.md thoroughly analyzed and all requirements extracted
- [x] Design specifications documented with exact UI requirements
- [x] Component architecture planned with React/Ink framework
- [x] Animation requirements specified with timing and frames
- [x] Color scheme and branding guidelines defined
- [x] Performance targets and accessibility requirements established

### Technical Prerequisites
- [x] Terminal UI framework research completed (Ink confirmed optimal)
- [x] React/TypeScript component patterns identified
- [x] Animation performance research applied
- [x] Testing framework for TUI components prepared
- [x] Development environment configured for TUI development

### Integration Requirements
- [x] Signal system integration points identified
- [x] Agent communication protocols defined
- [x] Real-time data flow architecture planned
- [x] Configuration management system designed
- [x] Error handling and recovery strategies planned

## 🚀 Pre-release Checklist

### Visual Quality Assurance
- [ ] All screens render exactly as specified in tui-implementation.md
- [ ] Symbol-to-symbol matching verified for all UI elements
- [ ] Color accuracy validated across different terminals
- [ ] Animation timing verified to match specifications
- [ ] Layout stability tested across window resizing
- [ ] No visual glitches or rendering artifacts

### Performance Validation
- [ ] Animation frame rates meet targets (8fps for progress, 4-6fps for status)
- [ ] Real-time update latency <100ms for all components
- [ ] Memory usage stable for long-running sessions
- [ ] CPU usage optimized for terminal environments
- [ ] Bundle size optimized for CLI distribution
- [ ] Performance regression tests passing

### Integration Testing
- [ ] Signal animation system integrated with EventBus
- [ ] Agent status updates reflect in real-time
- [ ] Configuration changes apply without restart
- [ ] Error scenarios handled gracefully
- [ ] Cross-platform compatibility validated
- [ ] Accessibility compliance verified

## 🔄 Post-release Checklist

### User Experience Validation
- [ ] Terminal compatibility verified across platforms
- [ ] User feedback collected on TUI experience
- [ ] Performance metrics monitored in production
- [ ] Animation smoothness validated on different terminals
- [ ] Real-time updates working under load
- [ ] Configuration system functioning correctly

### System Health & Maintenance
- [ ] Component health monitoring implemented
- [ ] Error rates tracked and addressed
- [ ] Documentation updated based on user feedback
- [ ] Training materials for development team prepared
- [ ] Future enhancement roadmap established

## 📋 Implementation Plan

### Phase 1: Foundation & Core Infrastructure (Days 1-3) ✅ COMPLETED

#### 1.1 TUI Framework Setup ✅
```bash
# Initialize TUI project structure
npm install ink@5.0.1 react@18.3.1
npm install ink-text-input ink-spinner ink-select-input
npm install @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**Implementation Tasks:**
- [x] Create TUI project structure with Ink/React framework
- [x] Set up TypeScript configuration for TUI components
- [x] Initialize testing framework with Jest and React Testing Library
- [x] Create build pipeline with hot reload for development
- [x] Set up linting and code quality tools

**Files Created:**
- `src/tui/layout/ResponsiveLayout.tsx` - Responsive layout system
- `src/tui/animation/AnimationEngine.ts` - Core animation engine
- `src/tui/testing/TUITestEnvironment.tsx` - Testing framework
- `src/tui/testing/ComponentTestHelpers.tsx` - Component testing utilities

#### 1.2 Configuration System ✅
```typescript
// .prprc configuration integration
interface TUIConfig {
  colors: {
    accent_orange: string;
    role_colors: Record<Role, { active: string; dim: string; bg: string }>;
    neutrals: { base: string; muted: string; error: string; warn: string; ok: string };
  };
  fonts: {
    terminal: string; // Menlo, SF Mono, JetBrains Mono
    accent_header: string; // Emulated with bg pills
  };
  animations: {
    enabled: boolean;
    speed_factor: number;
    idle_melody: boolean;
  };
  layout: {
    min_columns: number;
    breakpoints: Record<string, number>;
    right_panel_width: number;
  };
  hotkeys: Record<string, string>;
}
```

**Implementation Tasks:**
- [x] Implement .prprc configuration file parser
- [x] Create configuration validation and error handling
- [x] Set up real-time configuration updates
- [x] Create configuration TypeScript interfaces
- [x] Add configuration migration and backward compatibility

**Files Created:**
- `src/tui/config/PRCConfigManager.ts` - .prprc integration with validation
- Enhanced `src/tui/config/TUIConfig.tsx` - Extended configuration system

#### 1.3 Core Layout System ✅
```typescript
// Responsive layout engine
interface LayoutEngine {
  breakpoints: {
    compact: number;    // <100 cols
    standard: number;   // 100-159 cols
    wide: number;       // 160-239 cols
    ultra_wide: number; // >=240 cols
  };

  calculateLayout(terminalWidth: number, terminalHeight: number): LayoutConfig;
  adaptToResize(newWidth: number, newHeight: number): void;
  renderLayout(): JSX.Element;
}
```

**Implementation Tasks:**
- [x] Create responsive layout engine with breakpoints
- [x] Implement three-screen layout system
- [x] Add fixed bottom input with delimiter lines
- [x] Create right-aligned PRP list without vertical delimiters
- [x] Set up multi-screen layout for ultra-wide displays

**Files Created:**
- `src/tui/layout/ResponsiveLayout.tsx` - Complete responsive layout system
- `src/tui/layout/OrchestratorLayout.tsx` - Main orchestrator layout
- `src/tui/layout/SplitLayout.tsx` - Split view layouts

### Phase 2: Component System Implementation (Days 3-7)

#### 2.1 Music Icon & Status System
```typescript
// Music symbol animations
interface MusicIconProps {
  state: 'spawning' | 'running' | 'idle' | 'error';
  isDouble?: boolean; // For double-agent state
  melodySync?: boolean; // Sync with melody beats
}

interface AnimationState {
  icon: '♪' | '♩' | '♬' | '♫';
  frame: number;
  isAnimating: boolean;
  melodyBeat?: boolean;
}
```

**Implementation Tasks:**
- [ ] Create MusicIcon component with state-based rendering
- [ ] Implement status melody animations (4-6 fps)
- [ ] Add double-agent state animations
- [ ] Create idle melody blink synchronization
- [ ] Implement error state animations with warning indicators

#### 2.2 Signal Animation System
```typescript
// Signal visualization with animations
interface SignalAnimationProps {
  code: string; // [aA], [pr], [PR], [FF], etc.
  role?: Role;
  state: 'placeholder' | 'active' | 'progress' | 'resolved';
  latest?: boolean;
  onAnimationComplete?: () => void;
}

// Progress animation frames
const PROGRESS_FRAMES = {
  '[FF]': ['[F ]', '[  ]', '[ F]', '[FF]'], // 8fps = 125ms per frame
  '[  ]': ['[ ♫]', '[♫♫]', '[♫ ]', '[  ]'] // Dispatch loop
};
```

**Implementation Tasks:**
- [ ] Create SignalAnimation component with frame-based animations
- [ ] Implement progress animation [F ] → [  ] → [ F] → [FF]
- [ ] Add dispatch loop animation [  ] → [ ♫] → [♫♫] → [♫ ] → [  ]
- [ ] Create scanner wave animation across signal placeholders
- [ ] Implement inspector done blink effect (2x brace flash)
- [ ] Add color transitions for signal state changes

#### 2.3 Agent Card Component
```typescript
// Real-time agent monitoring
interface AgentCardProps {
  statusIcon: '♪' | '♬' | '♫';
  status: 'SPAWNING' | 'RUNNING' | 'IDLE' | 'ERROR';
  prp: string;
  role: Role;
  task: string;
  timeLeft: string;
  progress: number; // DoD percentage
  output: string[]; // Last N lines
  tokens: string;
  active: string; // Active duration
}
```

**Implementation Tasks:**
- [ ] Create AgentCard component with real-time updates
- [ ] Implement role-based color coding
- [ ] Add progress visualization and DoD percentage
- [ ] Create streaming output display
- [ ] Add token usage and active time tracking
- [ ] Implement error state handling and recovery

### Phase 3: Screen Implementation (Days 7-12)

#### 3.1 Orchestrator Screen (Screen 1)
```typescript
// Main orchestrator interface
interface OrchestratorScreenProps {
  agents: AgentCardProps[];
  orchestratorBlock: OrchestratorBlockProps;
  history: HistoryItemProps[];
  systemStatus: SystemStatusProps;
  prpList: PRPItem[];
}

// Exact implementation matching "### TUI design main orchestrator screen, FINAL!"
const OrchestratorScreen: React.FC<OrchestratorScreenProps> = ({ agents, orchestratorBlock, history, systemStatus, prpList }) => {
  return (
    <Box flexDirection="column" height="100%">
      {/* Header with branding */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={config.colors.accent_orange}>♫ @dcversus/prp</Text>
        <Text>⧗ {new Date().toISOString()}</Text>
      </Box>

      {/* System messages */}
      {history.map((item, index) => (
        <HistoryItem key={index} {...item} />
      ))}

      {/* Agent cards */}
      {agents.map((agent, index) => (
        <AgentCard key={index} {...agent} />
      ))}

      {/* Orchestrator block */}
      <OrchestratorBlock {...orchestratorBlock} />

      {/* Right-aligned PRP list */}
      <PRPList items={prpList} />

      {/* Input and footer */}
      <InputBar placeholder="Can you create something like this?" />
      <Footer tabs={['o', 'i', 'a', '1', '2', '3']} status="RUNNING" agents={agents.length} prp={prpList.length} delta="▲1" />
    </Box>
  );
};
```

**Implementation Tasks:**
- [ ] Implement exact orchestrator screen layout matching specifications
- [ ] Create system message display with timestamps
- [ ] Add real-time agent monitoring with status updates
- [ ] Implement orchestrator CoT display
- [ ] Create right-aligned PRP list with signal visualization
- [ ] Add fixed bottom input and footer

#### 3.2 Debug Mode Screen
```typescript
// Comprehensive debug interface
interface DebugScreenProps {
  events: DebugEvent[];
  systemLogs: SystemLog[];
  filterConfig: FilterConfig;
}

// Exact implementation matching "### TUI design debug mode, FINAL!"
const DebugScreen: React.FC<DebugScreenProps> = ({ events, systemLogs }) => {
  return (
    <Box flexDirection="column" height="100%">
      {/* Debug header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={config.colors.warn}>⚠️ debug ⚠️</Text>
        <Text>Debug Mode - All Events</Text>
      </Box>

      {/* Event log with syntax highlighting */}
      <Box flexDirection="column" flexGrow={1}>
        {events.map((event, index) => (
          <Box key={index} flexDirection="column">
            <Text color={getEventColor(event.source)}>{event.formattedMessage}</Text>
          </Box>
        ))}
      </Box>

      {/* Input and footer */}
      <InputBar placeholder="type or paste anything to" />
      <Footer tabs={['o', 'i', 'a', '1', '2', '3', 'D']} status="debug" agents={0} prp={0} delta="0" />
    </Box>
  );
};
```

**Implementation Tasks:**
- [ ] Implement debug mode with comprehensive event logging
- [ ] Add syntax highlighting for JSON events
- [ ] Create event filtering and search capabilities
- [ ] Implement real-time event streaming
- [ ] Add event source color coding

#### 3.3 PRP/Context/Split Screen (Screen 2)
```typescript
// Split view with PRP details and context
interface PRPContextScreenProps {
  selectedPRP: PRPItem;
  context: PRPContext;
  claudeInstances: ClaudeInstance[];
}

const PRPContextScreen: React.FC<PRPContextScreenProps> = ({ selectedPRP, context, claudeInstances }) => {
  return (
    <Box flexDirection="column" height="100%">
      {/* PRP information and signals */}
      <Box flexDirection="column">
        <Text>{selectedPRP.name} · {selectedPRP.status} · <RoboRolePill role={selectedPRP.role} /></Text>
        <SignalBar signals={selectedPRP.signals} />
        {/* Signal history */}
        {selectedPRP.history.map((item, index) => (
          <HistoryItem key={index} {...item} />
        ))}
      </Box>

      {/* Context information */}
      <Box flexDirection="column">
        <Text>Context (markdown ≤10k; compact; D=full)</Text>
        <Text>{selectedPRP.name}</Text>
        <Text>- scope: {context.scope}</Text>
        <Text>- goals: {context.goals}</Text>
      </Box>

      {/* Claude Code instances */}
      <Box flexDirection="column">
        {claudeInstances.map((instance, index) => (
          <ClaudeInstance key={index} {...instance} />
        ))}
      </Box>
    </Box>
  );
};
```

**Implementation Tasks:**
- [ ] Create split view layout for PRP and context
- [ ] Implement signal history display
- [ ] Add Claude Code instance monitoring
- [ ] Create context information display
- [ ] Add navigation and interaction controls

#### 3.4 Agent Fullscreen Screen (Screen 3)
```typescript
// Claude Code-style agent output display
interface AgentFullscreenScreenProps {
  agent: AgentCardProps;
  output: AgentOutput[];
  cot: ChainOfThought;
  toolCalls: ToolCall[];
}

const AgentFullscreenScreen: React.FC<AgentFullscreenScreenProps> = ({ agent, output, cot, toolCalls }) => {
  return (
    <Box flexDirection="column" height="100%">
      {/* Agent header */}
      <Text>Claude Code — {agent.prp} · streaming</Text>

      {/* Agent output with pagination */}
      <Box flexDirection="column" flexGrow={1}>
        {output.map((page, pageIndex) => (
          <Box key={pageIndex} flexDirection="column">
            <Text>⟦ page {pageIndex + 1} / {output.length} ⟧</Text>
            {page.content.map((line, lineIndex) => (
              <Text key={lineIndex}>{line}</Text>
            ))}
          </Box>
        ))}
      </Box>

      {/* Tool calls and status */}
      <Box flexDirection="column">
        {toolCalls.map((tool, index) => (
          <Text key={index}>{tool.formatted}</Text>
        ))}
      </Box>
    </Box>
  );
};
```

**Implementation Tasks:**
- [ ] Create fullscreen agent output display
- [ ] Implement pagination for long outputs
- [ ] Add tool call visualization
- [ ] Create streaming output updates
- [ ] Add agent status and progress tracking

### Phase 4: Real-time Integration & Animation (Days 12-18)

#### 4.1 EventBus Integration
```typescript
// Real-time data integration
interface TUIDataIntegration {
  subscribeToSignals(callback: (signals: Signal[]) => void): Subscription;
  subscribeToAgentStatus(callback: (agents: AgentStatus[]) => void): Subscription;
  subscribeToFileChanges(callback: (changes: FileChange[]) => void): Subscription;
  subscribeToOrchestratorEvents(callback: (events: OrchestratorEvent[]) => void): Subscription;
}

// Event handling with update throttling
const useRealtimeUpdates = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);

  useEffect(() => {
    const signalSubscription = eventBus.subscribeToSignals(
      throttle((newSignals) => setSignals(newSignals), 100)
    );

    const agentSubscription = eventBus.subscribeToAgentStatus(
      throttle((newAgents) => setAgents(newAgents), 150)
    );

    return () => {
      signalSubscription.unsubscribe();
      agentSubscription.unsubscribe();
    };
  }, []);

  return { signals, agents };
};
```

**Implementation Tasks:**
- [ ] Integrate with existing EventBus system
- [ ] Implement real-time signal updates
- [ ] Add agent status tracking with timers
- [ ] Create file system change detection
- [ ] Implement orchestrator event handling

#### 4.2 Melody Integration System
```typescript
// Music beat synchronization
interface MelodyConfig {
  bpm: number;
  steps: number[]; // 0/1 for blink pattern
  name: string;
  composer: string;
}

interface MelodySync {
  loadMelody(melodyPath: string): Promise<MelodyConfig>;
  syncWithBeat(callback: (onBeat: boolean) => void): void;
  getCurrentBeat(): number;
  setMelody(melody: MelodyConfig): void;
}

// Idle melody blink implementation
const useMelodySync = (melodyPath: string) => {
  const [isOnBeat, setIsOnBeat] = useState(false);
  const [melody, setMelody] = useState<MelodyConfig | null>(null);

  useEffect(() => {
    if (!melody) return;

    const beatInterval = 60000 / (melody.bpm * 2); // Convert BPM to ms
    let currentStep = 0;

    const interval = setInterval(() => {
      const onBeat = melody.steps[currentStep % melody.steps.length] === 1;
      setIsOnBeat(onBeat);
      currentStep++;
    }, beatInterval);

    return () => clearInterval(interval);
  }, [melody]);

  return { isOnBeat, loadMelody: setMelody };
};
```

**Implementation Tasks:**
- [ ] Create melody.json format and parser
- [ ] Implement beat synchronization system
- [ ] Add idle melody blink for ♫ symbols
- [ ] Create melody selection based on signal context
- [ ] Add melody configuration and customization

#### 4.3 Video-to-Text Intro System
```typescript
// 10s intro sequence with ASCII art
interface IntroSequence {
  frames: ASCIIFrame[];
  duration: number; // 10 seconds
  fps: number; // 12 fps
  soundtrack?: string; // Optional chip melody
}

interface ASCIIFrame {
  content: string[][];
  width: number;
  height: number;
  timestamp: number;
}

// Intro sequence implementation
const IntroSequence: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState<ASCIIFrame[]>([]);

  useEffect(() => {
    // Load pre-rendered frames based on terminal size
    loadFramesForTerminalSize().then(setFrames);
  }, []);

  useEffect(() => {
    if (frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 1000 / 12); // 12 fps

    return () => clearInterval(interval);
  }, [frames]);

  if (currentFrame >= frames.length - 1) {
    // Transition to main TUI
    return <TUIApp />;
  }

  return <ASCIIArtViewer frame={frames[currentFrame]} />;
};
```

**Implementation Tasks:**
- [ ] Create frame generation pipeline for 10s intro
- [ ] Implement ASCII art conversion with radial alpha
- [ ] Design logo evolution sequence (♪ → ♩ → ♬ → ♫)
- [ ] Add starfield drift effect
- [ ] Create title wipe-in animation
- [ ] Implement frame preloading for different terminal sizes

### Phase 5: Testing & Quality Assurance (Days 18-21)

#### 5.1 Component Testing Suite
```typescript
// Comprehensive testing for TUI components
describe('TUI Component Suite', () => {
  // Signal animation testing
  describe('SignalAnimation', () => {
    test('progress animation cycles through frames at 8fps', () => {
      const { result } = renderHook(() => useSignalAnimation('[FF]', 'progress'));

      act(() => {
        jest.advanceTimersByTime(125); // 8fps = 125ms per frame
      });

      expect(result.current.content).toBe('[  ]');

      act(() => {
        jest.advanceTimersByTime(125);
      });

      expect(result.current.content).toBe('[ F]');
    });

    test('scanner wave animation timing', () => {
      // Test scanner wave staggered timing
    });

    test('melody synchronization', () => {
      // Test beat sync with melody.json
    });
  });

  // Real-time data integration testing
  describe('Real-time Updates', () => {
    test('signal updates reflect in UI within 100ms', async () => {
      const startTime = Date.now();

      // Simulate signal update
      eventBus.emit('signal-update', testSignal);

      // Wait for UI update
      await waitFor(() => {
        expect(screen.getByText(testSignal.code)).toBeInTheDocument();
      });

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(100);
    });
  });

  // Performance testing
  describe('Performance', () => {
    test('memory usage stable with 50+ concurrent animations', () => {
      // Monitor memory during stress test
    });

    test('render performance meets targets', () => {
      // Measure render times
    });
  });
});
```

**Implementation Tasks:**
- [ ] Create comprehensive component test suite
- [ ] Implement animation timing tests with Jest fake timers
- [ ] Add real-time update integration tests
- [ ] Create performance testing for memory and CPU usage
- [ ] Implement cross-platform compatibility tests
- [ ] Add accessibility testing for screen readers

#### 5.2 Integration Testing
```typescript
// End-to-end TUI testing
describe('TUI Integration Tests', () => {
  test('complete orchestrator workflow', async () => {
    // Test full user journey from startup to agent monitoring
  });

  test('configuration hot-reload', async () => {
    // Test real-time configuration changes
  });

  test('error recovery mechanisms', async () => {
    // Test graceful error handling and recovery
  });

  test('multi-screen navigation', async () => {
    // Test Tab navigation and screen switching
  });
});
```

**Implementation Tasks:**
- [ ] Create end-to-end workflow tests
- [ ] Implement configuration integration tests
- [ ] Add error scenario testing
- [ ] Create navigation and interaction tests
- [ ] Implement data consistency validation

## 🔬 Research Materials

### Terminal UI Best Practices Research

#### 1. Modern Terminal UI Design Patterns (November 2025)
**Sources**: GitHub CLI, Shopify CLI, Docker Dashboard, kubectl, Lazydocker, htop

**Key Findings**:
- **Fixed Footer Pattern**: Universal across all modern TUIs for status and navigation
- **Right Panel Layout**: Effective for contextual information and navigation (GitHub CLI pattern)
- **Real-time Updates**: Critical for monitoring tools (Docker/Kubernetes pattern)
- **Color Coding**: Essential for status visualization and user experience
- **Keyboard Navigation**: Expected behavior for power users

**Accessibility Standards**:
- WCAG 2.1 AA compliance for terminal interfaces
- Color contrast ratios ≥ 4.5:1 for normal text
- Keyboard navigation support for all interactive elements
- Screen reader compatibility with proper ARIA labels

#### 2. Performance Optimization for Terminal Applications
**Sources**: Ink performance documentation, React rendering optimization

**Animation Performance Guidelines**:
- Limit animation frame rates to 8-12 fps for smooth terminal rendering
- Use React.memo for component optimization
- Implement proper cleanup for timers and event listeners
- Throttle real-time updates to prevent render spam

**Memory Management**:
- Cleanup unused components and event listeners
- Monitor memory usage for long-running sessions
- Implement efficient data structures for real-time updates
- Use object pooling for frequently created/destroyed objects

#### 3. Terminal Compatibility and Color Support
**Sources**: XVilka's terminal support research, COLORTERM specifications

**Color Support Matrix**:
- **TrueColor (24-bit)**: Modern terminals (iTerm2, Windows Terminal, GNOME Terminal)
- **256-color**: Fallback for older terminals
- **16-color**: Basic fallback with proper color mapping
- **Monochrome**: Emergency fallback with symbols and brightness

**Terminal Compatibility**:
- **macOS**: Terminal.app, iTerm2, Warp
- **Linux**: GNOME Terminal, Konsole, Alacritty, Kitty
- **Windows**: Windows Terminal, ConEmu, PuTTY

### Research Date/Time: 2025-11-05 18:00:00
> **Summary**: Comprehensive TUI implementation analysis complete with exact specifications extracted from tui-implementation.md. Terminal UI best practices researched with modern design patterns, performance optimization strategies, and accessibility standards. Implementation plan ready with 21 detailed tasks covering all aspects from foundation to testing. Ready to proceed with implementation phase.

### Additional Research Sources:
```typescript
// Terminal UI Framework Documentation
const frameworks = {
  ink: "https://github.com/vadimdemedes/ink",
  inkDocs: "https://github.com/vadimdemedes/ink/blob/master/README.md",
  reactBlessed: "https://github.com/Yomguithereal/react-blessed",
  blessed: "https://github.com/chjj/blessed"
};

// Production TUI Examples for Pattern Analysis
const examples = {
  githubCli: "https://github.com/cli/cli",
  shopifyCli: "https://github.com/Shopify/shopify-cli",
  lazydocker: "https://github.com/jesseduffield/lazydocker",
  htop: "https://github.com/aristocratos/btop",
  kubectl: "https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands"
};

// Color and Accessibility Standards
const standards = {
  wcag: "https://www.w3.org/WAI/WCAG21/Understanding/",
  colorContrast: "https://webaim.org/resources/contrastchecker/",
  terminalColors: "https://github.com/termstandard/colors",
  xvilkaResearch: "https://gist.github.com/XVilka/8346728"
};
```

---

**Ready for Implementation** 🚀

**Primary Focus**: Create exact TUI implementation matching tui-implementation.md specifications with comprehensive real-time visualization, music-based status indicators, and responsive design.

**Success Criteria**: All DoD items completed with exact symbol-to-symbol matching design specifications, smooth real-time animations, and optimal user experience.

**Next Steps**: Begin Phase 1 implementation with TUI framework setup, configuration system, and core layout infrastructure.