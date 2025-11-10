/**
 * ♫ Design Tokens for @dcversus/prp TUI System
 *
 * Central design system configuration with colors, fonts, spacing,
 * animations, and visual specifications matching PRP-005 requirements.
 */

export const tokens = {
  // Brand identity
  brand: {
    name: '@dcversus/prp',
    tagline: 'Autonomous Development Orchestration',
    positioning: 'OpenAI orchestrator + Claude agents + signal-based workflow = zero coordination overhead',
    icon: '♫'
  },

  // Color palette - pastels + grays with dark/light theme support
  colors: {
    // Primary accent colors (matching PRP spec exactly)
    accent: {
      orange: '#FF9A38',        // Main orchestrator color
      orange_dim: '#C77A2C',     // Dim version
      orange_bg: '#3A2B1F'      // Background variant
    },

    // Role-based colors (exact PRP spec colors)
    role: {
      // robo-aqa - Purple
      aqa: {
        active: '#B48EAD',
        dim: '#6E5C69',
        bg: '#2F2830',
        pastel: '#E9D5FF'
      },
      // robo-quality-control - Red
      qc: {
        active: '#E06C75',
        dim: '#7C3B40',
        bg: '#321E20',
        pastel: '#FECACA'
      },
      // robo-system-analyst - Brown
      sa: {
        active: '#C7A16B',
        dim: '#7A6445',
        bg: '#2C2419',
        pastel: '#FEF3C7'
      },
      // robo-developer - Blue
      dev: {
        active: '#61AFEF',
        dim: '#3B6D90',
        bg: '#1D2730',
        pastel: '#DBEAFE'
      },
      // robo-devops-sre - Green
      devops: {
        active: '#98C379',
        dim: '#5F7B52',
        bg: '#1F2A1F',
        pastel: '#D1FAE5'
      },
      // robo-ux-ui-designer - Pink/Orange variant
      ux: {
        active: '#D19A66',
        dim: '#8A5667',
        bg: '#2E2328',
        pastel: '#FBCFE8'
      },
      // robo-legal-compliance - Light violet
      legal: {
        active: '#C5A3FF',
        dim: '#705E93',
        bg: '#281F35',
        pastel: '#E9D5FF'
      },
      // Scanner (Tuner) - Mint green
      scanner: {
        active: '#8BC4A0',
        dim: '#558769',
        bg: '#1A2F2A',
        pastel: '#D1FAE5'
      },
      // Inspector (Critic) - Yellow
      inspector: {
        active: '#E5C07B',
        dim: '#9A8A5F',
        bg: '#2F2A1F',
        pastel: '#FEF3C7'
      }
    },

    // Neutral colors
    neutrals: {
      base: '#111315',      // Main background
      base_hover: '#1A1F24',
      base_active: '#21262D',
      muted: '#6B7280',      // Secondary text
      muted_hover: '#9CA3AF',
      text: '#F3F4F6',       // Primary text
      text_dim: '#D1D5DB',   // Dimmed text
      white: '#FFFFFF',
      black: '#000000'
    },

    // Status colors
    status: {
      error: '#EF4444',
      error_dim: '#DC2626',
      warn: '#F59E0B',
      warn_dim: '#D97706',
      ok: '#10B981',
      ok_dim: '#059669',
      info: '#3B82F6',
      info_dim: '#2563EB'
    },

    // Signal colors (exact PRP spec)
    signals: {
      braces: '#FFB56B',        // Signal braces color
      placeholder: '#6C7078',    // Empty placeholder [ ]
      active: '#FF9A38',         // Active signal (orchestrator orange)
      progress: '#61AFEF',       // Progress indicators
      resolved: '#98C379',       // Resolved/complete
      error: '#E06C75',          // Error states
      wave: '#FFB56B'           // Wave animation color
    },

    // Background gradients
    gradients: {
      day: {
        start: '#111315',    // bg1
        middle: '#1a1f24',   // bg2
        end: '#21262d'      // bg3
      },
      night: {
        start: '#0b0c0d',    // bg1
        middle: '#121416',   // bg2
        end: '#171a1d'      // bg3
      }
    }
  },

  // Typography
  fonts: {
    terminal: {
      family: 'Menlo, "SF Mono", "JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      size: {
        xs: 11,
        sm: 12,
        base: 13,
        lg: 14,
        xl: 16
      },
      weight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    accent: {
      // Emulated with background pills for headers
      family: 'Menlo, "SF Mono", monospace',
      style: 'uppercase'
    }
  },

  // Spacing system
  spacing: {
    xs: 1,      // 1 char
    sm: 2,      // 2 chars
    md: 3,      // 3 chars
    lg: 4,      // 4 chars
    xl: 6,      // 6 chars
    xxl: 8,     // 8 chars
    // Layout margins
    container: {
      horizontal: 4,
      vertical: 2
    }
  },

  // Animation specifications (exact PRP spec)
  animations: {
    // Frame rates (ms per frame)
    fps: {
      status: 250,        // 4 fps for status icons
      signal: 50,         // 20 fps for signal wave (50ms per slot)
      progress: 125,      // 8 fps for progress cells
      melody: 1000,       // 1 fps for melody blink
      inspector: 200     // 5 fps for inspector double brace
    },
    // State icon animations (exact PRP spec)
    stateIcons: {
      await: '♪',         // Awaiting input
      parse: '♩',         // Parsing data
      spawn: '♬',         // Spawning agents (pair)
      steady: '♫',        // Steady state
      double_agent: '♬'  // Double agent state (pair)
    },
    // Progress animations (PRP spec)
    progress: {
      signal_cell: ['[F ]', '[  ]', '[ F]', '[FF]'],  // ~8fps animation
      dispatch: ['[  ]', '[ ♫]', '[♫♫]', '[♫ ]', '[  ]'], // Request loop
      scanner_wave: 'wave',                             // Sliding pastel wave
      inspector_blink: ['{{ }}', '{{  }}', '{{ }}']    // Double brace blink
    },
    // Signal animations
    signals: {
      wave_speed: 50,      // ms per slot for wave animation
      blink_speed: 1000,   // ms for melody blink
      inspector_blink: 200, // ms for inspector double brace
      progress_fps: 8     // fps for progress cell animation
    },
    // Timing (in ms)
    duration: {
      blink: 500,
      transition: 150,
      slide: 200,
      fade: 300,
      intro: 10000,       // 10 seconds intro sequence
      breathing: 4000    // 4 second breathing cycle
    },
    // Idle animation (PRP spec)
    idle: {
      enabled: true,
      melody_blink: {
        enabled: true,
        symbol: '♫',     // Last signal's melody drives blink
        on_beat: true    // Sync with beat
      },
      breathing: {
        enabled: true,
        amplitude: 0.05,  // 5% breathing effect for gradients
        period: 4000     // 4s breathing cycle
      }
    }
  },

  // Layout system (PRP responsive design)
  layout: {
    // Breakpoints (exact PRP spec - responsive from ~80 cols to 8K)
    breakpoints: {
      compact: 80,        // < 80 cols: compact mode (agent logs only)
      normal: 120,        // 80-119 cols: normal mode
      wide: 160,          // 120-159 cols: wide mode
      ultrawide: 240     // >= 240 cols: ultrawide/8K mode
    },
    // Responsive layout strategies
    responsive: {
      compact: {
        description: 'Compact orchestrator with ONLY agents-logs',
        right_panel: false,
        agent_cards_max: 3,
        history_lines: 3,
        columns: 1
      },
      normal: {
        description: 'Main + compressed right panel',
        right_panel: true,
        right_panel_width: 35,
        agent_cards_max: 5,
        history_lines: 5,
        columns: 1
      },
      wide: {
        description: 'Main + right always visible',
        right_panel: true,
        right_panel_width: 40,
        agent_cards_max: 8,
        history_lines: 8,
        columns: 2,
        info_columns: 2
      },
      ultrawide: {
        description: 'All screens + agent logs in single layout',
        right_panel: true,
        right_panel_width: 45,
        agent_cards_max: 12,
        history_lines: 10,
        columns: 3,
        info_columns: 3,
        all_screens_visible: true
      }
    },
    // Panel sizing
    panels: {
      right_width: 35,     // Right panel (PRP list) - default
      footer_height: 4,    // Fixed bottom input + status line
      header_height: 4,    // Header with branding
      min_height: 24,
      padding: {
        horizontal: 2,
        vertical: 1
      }
    },
    // Screen layout modes
    screens: {
      orchestrator: {
        mode: 'default',   // Signal bus, agent cards, CoT, PRP sidebar
        layout: 'main_with_sidebar',
        tabs: ['o']
      },
      info: {
        mode: 'split',     // PRP context split view
        layout: 'multi_column',
        tabs: ['i'],
        columns: 3        // PRP, signals, shared context
      },
      agent: {
        mode: 'fullscreen', // Fullscreen agent with shared footer
        layout: 'single_fullscreen',
        tabs: ['a', '1', '2', '3', '4', '5', '6', '7', '8', '9']
      },
      debug: {
        mode: 'log',       // Non-clearing log buffer
        layout: 'full_height',
        tabs: ['D']
      }
    }
  },

  // Music symbols and states
  music: {
    symbols: {
      start: '♪',
      prepare: '♩',
      running: '♬',
      steady: '♫',
      error: '⚠',
      done: '✓'
    },
    // Melody synchronization
    melody: {
      enabled: true,
      bpm: 120,         // Default beats per minute
      sync_tolerance: 50 // ms tolerance
    }
  },

  // Visual effects
  effects: {
    background: {
      radial: {
        enabled: true,
        center_weight: 0.6,  // Gradient center position
        edge_alpha: 0.3     // Edge transparency
      }
    },
    pills: {
      border_radius: 2,
      padding: { x: 1, y: 0 }
    },
    borders: {
      thin: { char: '─', style: 'single' },
      thick: { char: '═', style: 'double' },
      corners: {
        tl: '┌', tr: '┐',
        bl: '└', br: '┘',
        cross: '┼',
        tee: { up: '┴', down: '┬', left: '├', right: '┤' }
      }
    }
  },

  // Input and interaction
  input: {
    delimiter: {
      char: '─',
      repeat: 80
    },
    focus: {
      indicator: '█',
      color: '#60A5FA'
    },
    validation: {
      success: { color: '#10B981', flash: true },
      error: { color: '#EF4444', underline: true }
    }
  },

  // Performance targets
  performance: {
    latency: {
      update_max: 100,      // Max UI update latency (ms)
      animation_max: 125,    // Max animation frame time (ms)
      render_target: 16     // Target render time (60fps)
    },
    memory: {
      max_animations: 50,    // Max concurrent animations
      cleanup_interval: 5000 // Cleanup interval (ms)
    }
  },

  // Accessibility
  accessibility: {
    contrast: {
      minimum: 4.5,    // WCAG AA standard
      enhanced: 7      // WCAG AAA (optional)
    },
    keyboard: {
      navigation: true,
      focus_visible: true,
      shortcuts: {
        tab: 'cycle_focus',
        escape: 'back',
        enter: 'confirm',
        arrows: 'navigate',
        s: 'toggle_music',
        x: 'cancel',
        d: 'debug_mode'
      }
    }
  }
};

export type DesignTokens = typeof tokens;