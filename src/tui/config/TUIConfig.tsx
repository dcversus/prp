/**
 * ♫ TUI Configuration
 *
 * Configuration management for the Terminal User Interface
 * with color schemes, fonts, layouts, and animation settings
 */


// Re-export TUIConfig type for backward compatibility
export type { TUIConfig };

/**
 * Color scheme definitions for different roles and themes
 */
export const COLOR_SCHEMES = {
  dark: {
    // Accent / Orchestrator colors
    accent_orange: '#FF9A38',
    accent_orange_dim: '#C77A2C',
    accent_orange_bg: '#3A2B1F',

    // Role colors (active versions)
    robo_aqa: '#B48EAD',
    robo_quality_control: '#E06C75',
    robo_system_analyst: '#C7A16B',
    robo_developer: '#61AFEF',
    robo_devops_sre: '#98C379',
    robo_ux_ui: '#D19A66',
    robo_legal_compliance: '#C5A3FF',
    orchestrator: '#FF9A38',

    // Role colors (dim versions)
    robo_aqa_dim: '#6E5C69',
    robo_quality_control_dim: '#7C3B40',
    robo_system_analyst_dim: '#7A6445',
    robo_developer_dim: '#3B6D90',
    robo_devops_sre_dim: '#5F7B52',
    robo_ux_ui_dim: '#8A5667',
    robo_legal_compliance_dim: '#705E93',
    orchestrator_dim: '#C77A2C',

    // Role background colors
    robo_aqa_bg: '#2F2830',
    robo_quality_control_bg: '#321E20',
    robo_system_analyst_bg: '#2C2419',
    robo_developer_bg: '#1D2730',
    robo_devops_sre_bg: '#1F2A1F',
    robo_ux_ui_bg: '#2E2328',
    robo_legal_compliance_bg: '#281F35',
    orchestrator_bg: '#3A2B1F',

    // Neutral colors
    base_fg: '#E6E6E6',
    base_bg: '#000000',
    muted: '#9AA0A6',
    error: '#FF5555',
    warn: '#FFCC66',
    ok: '#B8F28E',
    gray: '#6C7078',

    // Signal colors
    signal_braces: '#FFB56B',
    signal_placeholder: '#6C7078'
  },
  light: {
    // Accent / Orchestrator colors
    accent_orange: '#E67E00',
    accent_orange_dim: '#B36100',
    accent_orange_bg: '#FFF8F0',

    // Role colors (active versions)
    robo_aqa: '#8B7AA8',
    robo_quality_control: '#CC5555',
    robo_system_analyst: '#A08050',
    robo_developer: '#4A90E2',
    robo_devops_sre: '#7FA060',
    robo_ux_ui: '#B07A40',
    robo_legal_compliance: '#9980CC',
    orchestrator: '#E67E00',

    // Role colors (dim versions)
    robo_aqa_dim: '#5A4A68',
    robo_quality_control_dim: '#8C3333',
    robo_system_analyst_dim: '#6A5535',
    robo_developer_dim: '#2E5A8C',
    robo_devops_sre_dim: '#527040',
    robo_ux_ui_dim: '#7A5028',
    robo_legal_compliance_dim: '#605080',
    orchestrator_dim: '#B36100',

    // Role background colors
    robo_aqa_bg: '#F5F0F8',
    robo_quality_control_bg: '#FFF0F0',
    robo_system_analyst_bg: '#F8F5F0',
    robo_developer_bg: '#F0F5F8',
    robo_devops_sre_bg: '#F0F8F0',
    robo_ux_ui_bg: '#F8F0F5',
    robo_legal_compliance_bg: '#F5F0FF',
    orchestrator_bg: '#FFF8F0',

    // Neutral colors
    base_fg: '#2C2C2C',
    base_bg: '#FFFFFF',
    muted: '#666666',
    error: '#CC0000',
    warn: '#CC9900',
    ok: '#66AA00',
    gray: '#888888',

    // Signal colors
    signal_braces: '#E67E00',
    signal_placeholder: '#888888'
  }
} as const;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  enabled: true,
  theme: 'dark',
  animations: {
    enabled: true,
    intro: {
      enabled: true,
      duration: 10000, // 10 seconds
      fps: 12
    },
    status: {
      enabled: true,
      fps: 4
    },
    signals: {
      enabled: true,
      waveSpeed: 50, // ms per slot
      blinkSpeed: 1000 // ms
    }
  },
  layout: {
    responsive: true,
    breakpoints: {
      compact: 100,   // < 100 cols: single column
      normal: 160,    // 100-159 cols: main + compressed right
      wide: 240,      // 160-239 cols: main + right always visible
      ultrawide: 240  // >= 240 cols: all screens visible
    },
    padding: {
      horizontal: 2,
      vertical: 1
    }
  },
  input: {
    maxTokens: 100000,
    tokenReserve: 0.05, // 5% reserve
    pasteTimeout: 1000
  },
  debug: {
    enabled: false,
    maxLogLines: 100,
    showFullJSON: false
  }
} as const;

/**
 * Create TUI configuration with defaults and overrides
 */
export function createTUIConfig(overrides: Partial<TUIConfig> = {}): TUIConfig {
  const theme = overrides.theme ?? DEFAULT_CONFIG.theme;
  const colors = COLOR_SCHEMES[theme];

  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    theme,
    colors,
    animations: {
      ...DEFAULT_CONFIG.animations,
      ...overrides.animations
    },
    layout: {
      ...DEFAULT_CONFIG.layout,
      ...overrides.layout
    },
    input: {
      ...DEFAULT_CONFIG.input,
      ...overrides.input
    },
    debug: {
      ...DEFAULT_CONFIG.debug,
      ...overrides.debug
    }
  };
}

/**
 * Get role color configuration
 */
export function getRoleColors(role: string, colors: ColorScheme) {
  const roleKey = role.replace(/-/g, '_');
  return {
     
    active: colors[roleKey as keyof typeof colors] || colors.orchestrator,
     
    dim: colors[`${roleKey}_dim` as keyof typeof colors] || colors.orchestrator_dim,
     
    bg: colors[`${roleKey}_bg` as keyof typeof colors] || colors.orchestrator_bg
  };
}

/**
 * Get color for signal state
 */
export function getSignalColor(
  code: string,
  state: 'placeholder' | 'active' | 'progress' | 'resolved',
  colors: ColorScheme
): string {
  if (state === 'placeholder') {
    return colors.signal_placeholder;
  }

  if (state === 'active') {
    // Map signal codes to roles
    const signalRoleMap: Record<string, string> = {
      '[aA]': 'robo-aqa',
      '[cq]': 'robo-aqa',
      '[bf]': 'robo-developer',
      '[dp]': 'robo-developer',
      '[tw]': 'robo-developer',
      '[br]': 'robo-developer',
      '[rc]': 'robo-system-analyst',
      '[gg]': 'robo-system-analyst',
      '[ff]': 'robo-system-analyst',
      '[rp]': 'robo-system-analyst',
      '[vr]': 'robo-system-analyst',
      '[ip]': 'robo-system-analyst',
      '[er]': 'robo-system-analyst',
      '[mg]': 'robo-devops-sre',
      '[rl]': 'robo-devops-sre',
      '[id]': 'robo-devops-sre',
      '[cd]': 'robo-devops-sre',
      '[mo]': 'robo-devops-sre',
      '[du]': 'robo-ux-ui',
      '[ds]': 'robo-ux-ui',
      '[dr]': 'robo-ux-ui',
      '[dh]': 'robo-ux-ui',
      '[da]': 'robo-ux-ui',
      '[dc]': 'robo-ux-ui',
      '[df]': 'robo-ux-ui',
      '[dt]': 'robo-ux-ui'
    };

    const role = signalRoleMap[code] ?? 'orchestrator';
    return getRoleColors(role, colors).active;
  }

  return colors.muted;
}

/**
 * Get terminal dimensions and layout information
 */
export function getTerminalLayout(config: TUIConfig) {
  const { columns, rows } = process.stdout;
  const { breakpoints, padding } = config.layout;

  // Determine layout mode based on width
  let layoutMode: 'compact' | 'normal' | 'wide' | 'ultrawide';
  if (columns < breakpoints.compact) {
    layoutMode = 'compact';
  } else if (columns < breakpoints.normal) {
    layoutMode = 'normal';
  } else if (columns < breakpoints.wide) {
    layoutMode = 'wide';
  } else {
    layoutMode = 'ultrawide';
  }

  // Calculate available space
  const availableWidth = columns - (padding.horizontal * 2);
  const availableHeight = rows - (padding.vertical * 2) - 4; // Account for header/footer

  return {
    columns,
    rows,
    layoutMode,
    availableWidth,
    availableHeight,
    padding
  };
}