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
export type ScreenType = 'orchestrator' | 'info' | 'prp-context' | 'agent' | 'token-metrics';
export type NavigationMode = 'global' | 'list' | 'agent' | 'input' | 'filter';
export type Theme = 'dark' | 'light';
export type LayoutMode = 'compact' | 'normal' | 'wide' | 'ultrawide';
// Hex color literal types
export type HexColor = `#${string}`;
export interface ColorScheme {
  // Accent / Orchestrator colors
  accent_orange: HexColor;
  accent_orange_dim: HexColor;
  accent_orange_bg: HexColor;
  // Role colors (active versions)
  robo_aqa: HexColor;
  robo_quality_control: HexColor;
  robo_system_analyst: HexColor;
  robo_developer: HexColor;
  robo_devops_sre: HexColor;
  robo_ux_ui: HexColor;
  robo_legal_compliance: HexColor;
  orchestrator: HexColor;
  // Role colors (dim versions)
  robo_aqa_dim: HexColor;
  robo_quality_control_dim: HexColor;
  robo_system_analyst_dim: HexColor;
  robo_developer_dim: HexColor;
  robo_devops_sre_dim: HexColor;
  robo_ux_ui_dim: HexColor;
  robo_legal_compliance_dim: HexColor;
  orchestrator_dim: HexColor;
  // Role background colors
  robo_aqa_bg: HexColor;
  robo_quality_control_bg: HexColor;
  robo_system_analyst_bg: HexColor;
  robo_developer_bg: HexColor;
  robo_devops_sre_bg: HexColor;
  robo_ux_ui_bg: HexColor;
  robo_legal_compliance_bg: HexColor;
  orchestrator_bg: HexColor;
  // Neutral colors
  base_fg: HexColor;
  base_bg: HexColor;
  muted: HexColor;
  error: HexColor;
  warn: HexColor;
  ok: HexColor;
  gray: HexColor;
  // Signal colors
  signal_braces: HexColor;
  signal_placeholder: HexColor;
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
  navigationMode: NavigationMode;
  multiScreenMode: boolean;
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
  config?: TUIConfig;
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
export interface TokenMetricsScreenProps {
  isActive: boolean;
  onNavigate: () => void;
}
export interface FooterProps {
  currentScreen: ScreenType;
  debugMode: boolean;
  agentCount: number;
  prpCount: number;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}
export interface InputBarProps {
  value: string;
  onChange: () => void;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}

// Utility functions for TUI components
export interface RoleColors {
  active: HexColor;
  bg: HexColor;
  dim: HexColor;
}

/**
 * Get color scheme for a specific role
 */
export const getRoleColors = (role: Role, colors: ColorScheme): RoleColors => {
  const roleKey = role.replace('-', '_') as keyof ColorScheme;
  const activeKey = roleKey;
  const bgKey = `${roleKey}_bg` as keyof ColorScheme;
  const dimKey = `${roleKey}_dim` as keyof ColorScheme;

  return {
    active: colors[activeKey],
    bg: colors[bgKey],
    dim: colors[dimKey],
  };
};

/**
 * Get color for a signal based on its code and state
 */
export const getSignalColor = (
  signalCode: string,
  signalState: SignalState,
  colors: ColorScheme,
): HexColor => {
  // Special signal codes with specific colors
  if (signalCode.includes('[oa]') || signalCode.includes('[pc]')) {
    return colors.accent_orange;
  }
  if (signalCode.includes('[br]') || signalCode.includes('[mg]')) {
    return colors.ok;
  }
  if (signalCode.includes('[bb]')) {
    return colors.warn;
  }
  if (signalCode.includes('[ff]')) {
    return colors.error;
  }

  // Default colors based on state
  switch (signalState) {
    case 'active':
      return colors.signal_braces;
    case 'progress':
      return colors.accent_orange;
    case 'resolved':
      return colors.ok;
    case 'placeholder':
    default:
      return colors.signal_placeholder;
  }
};
