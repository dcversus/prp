/**
 * ♫ TUI Configuration Types
 *
 * TypeScript definitions for the Terminal User Interface configuration
 */

export type Role =
  | 'robo-aqa'
  | 'robo-quality-control'
  | 'robo-system-analyst'
  | 'robo-developer'
  | 'robo-devops-sre'
  | 'robo-ux-ui'
  | 'robo-legal-compliance'
  | 'orchestrator';

export type SignalState = 'placeholder' | 'active' | 'progress' | 'resolved';
export type AgentStatus = 'SPAWNING' | 'RUNNING' | 'IDLE' | 'ERROR';
export type ScreenType = 'orchestrator' | 'prp-context' | 'agent';
export type Theme = 'dark' | 'light';
export type LayoutMode = 'compact' | 'normal' | 'wide' | 'ultrawide';

export interface ColorScheme {
  // Accent / Orchestrator colors
  accent_orange: string;
  accent_orange_dim: string;
  accent_orange_bg: string;

  // Role colors (active versions)
  robo_aqa: string;
  robo_quality_control: string;
  robo_system_analyst: string;
  robo_developer: string;
  robo_devops_sre: string;
  robo_ux_ui: string;
  robo_legal_compliance: string;
  orchestrator: string;

  // Role colors (dim versions)
  robo_aqa_dim: string;
  robo_quality_control_dim: string;
  robo_system_analyst_dim: string;
  robo_developer_dim: string;
  robo_devops_sre_dim: string;
  robo_ux_ui_dim: string;
  robo_legal_compliance_dim: string;
  orchestrator_dim: string;

  // Role background colors
  robo_aqa_bg: string;
  robo_quality_control_bg: string;
  robo_system_analyst_bg: string;
  robo_developer_bg: string;
  robo_devops_sre_bg: string;
  robo_ux_ui_bg: string;
  robo_legal_compliance_bg: string;
  orchestrator_bg: string;

  // Neutral colors
  base_fg: string;
  base_bg: string;
  muted: string;
  error: string;
  warn: string;
  ok: string;
  gray: string;

  // Signal colors
  signal_braces: string;
  signal_placeholder: string;
}

export interface AnimationConfig {
  enabled: boolean;
  intro: {
    enabled: boolean;
    duration: number; // ms
    fps: number;
  };
  status: {
    enabled: boolean;
    fps: number;
  };
  signals: {
    enabled: boolean;
    waveSpeed: number; // ms per slot
    blinkSpeed: number; // ms
  };
}

export interface LayoutConfig {
  responsive: boolean;
  breakpoints: {
    compact: number;
    normal: number;
    wide: number;
    ultrawide: number;
  };
  padding: {
    horizontal: number;
    vertical: number;
  };
}

export interface InputConfig {
  maxTokens: number;
  tokenReserve: number; // 0-1
  pasteTimeout: number; // ms
}

export interface DebugConfig {
  enabled: boolean;
  maxLogLines: number;
  showFullJSON: boolean;
}

export interface TUIConfig {
  enabled: boolean;
  theme: Theme;
  colors: ColorScheme;
  animations: AnimationConfig;
  layout: LayoutConfig;
  input: InputConfig;
  debug: DebugConfig;
}

export interface TerminalLayout {
  columns: number;
  rows: number;
  layoutMode: LayoutMode;
  availableWidth: number;
  availableHeight: number;
  padding: {
    horizontal: number;
    vertical: number;
  };
}

// Signal and Agent Types

export interface SignalTag {
  code: string;
  role?: Role;
  state: SignalState;
  latest?: boolean;
  animationFrame?: number;
}

export interface AgentCard {
  id: string;
  statusIcon: '♪' | '♩' | '♬' | '♫';
  status: AgentStatus;
  prp: string;
  role: Role;
  task: string;
  timeLeft: string;
  progress: number; // 0-100
  output: string[];
  tokens: string;
  active: string; // duration
  lastUpdate: Date;
}

export interface HistoryItem {
  source: 'system' | 'scanner' | 'inspector' | 'orchestrator';
  timestamp: string;
  data: Record<string, unknown>;
  compact?: boolean;
}

export interface PRPItem {
  name: string;
  status: AgentStatus;
  role?: Role;
  priority?: number;
  signals: SignalTag[];
  lastUpdate: Date;
}

export interface OrchestratorBlock {
  status: AgentStatus;
  prp: string;
  signals: SignalTag[];
  latestSignalIndex: number;
  cotLines: string[];
  toolCall: string;
  lastUpdate: Date;
}

export interface InputState {
  value: string;
  pasteInfo?: {
    tokens: number;
    hash: string;
    cut?: number;
  };
  isSubmitting: boolean;
}

export interface TUIState {
  currentScreen: ScreenType;
  selectedPRP?: string;
  selectedAgent?: string;
  debugMode: boolean;
  introPlaying: boolean;
  agents: Map<string, AgentCard>;
  prps: Map<string, PRPItem>;
  history: HistoryItem[];
  orchestrator: OrchestratorBlock | null;
  input: InputState;
  terminalLayout: TerminalLayout;
}

// Event Types

export interface TerminalResizeEvent {
  columns: number;
  rows: number;
}

export interface SignalUpdateEvent {
  prpName: string;
  signal: SignalTag;
}

export interface AgentUpdateEvent {
  agentId: string;
  update: Partial<AgentCard>;
}

export interface PRPUpdateEvent {
  prpName: string;
  update: Partial<PRPItem>;
}

export interface HistoryUpdateEvent {
  item: HistoryItem;
}

export interface IntroCompleteEvent {
  success: boolean;
}

export interface InputSubmitEvent {
  value: string;
}

// Component Props

export interface RoboRolePillProps {
  role: Role;
  state: 'idle' | 'active' | 'resolved';
  size?: 'small' | 'normal' | 'large';
}

export interface MusicIconProps {
  status: AgentStatus;
  animate?: boolean;
  size?: 'small' | 'normal' | 'large';
}

export interface SignalBarProps {
  signals: SignalTag[];
  animate?: boolean;
}

export interface AgentStatusLineProps {
  agent: AgentCard;
  showDetails?: boolean;
}

export interface ProgressIndicatorProps {
  value: number; // 0-100
  width?: number;
  showPercentage?: boolean;
  animated?: boolean;
}