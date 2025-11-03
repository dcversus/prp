/**
 * TUI Debug Screen Configuration Factory
 *
 * Provides color schemes and configuration options for the debug screen
 * based on the specifications in tui-implementation.md
 */

import type { DebugConfig } from './debug-screen';

export function createDebugConfig(overrides: Partial<DebugConfig> = {}): DebugConfig {
  const defaultConfig: DebugConfig = {
    maxEvents: 100,
    refreshInterval: 1000, // 1 second
    showFullJson: false,
    colorScheme: {
      // System colors (brand orange for system, pastel colors for roles)
      system: '\x1b[38;5;208m', // Brand orange #FF9A38
      scanner: '\x1b[38;5;214m', // Light orange
      inspector: '\x1b[38;5;208m', // Brand orange for priority
      orchestrator: '\x1b[38;5;208m', // Brand orange
      guidelines: '\x1b[38;5;140m', // Purple

      // Role colors (based on tui-implementation.md specifications)
      agent: '\x1b[38;5;147m', // Light purple for general agents

      // Priority colors
      low: '\x1b[38;5;245m',      // Gray
      medium: '\x1b[38;5;226m',   // Yellow
      high: '\x1b[38;5;196m',     // Red
      critical: '\x1b[38;5;9m',   // Bright red

      // JSON syntax highlighting colors
      json: {
        key: '\x1b[38;5;147m',     // Light purple for keys
        string: '\x1b[38;5;107m',   // Green for strings
        number: '\x1b[38;5;220m',   // Orange for numbers
        boolean: '\x1b[38;5;213m',  // Pink for booleans
        null: '\x1b[38;5;245m',     // Gray for null
        bracket: '\x1b[38;5;151m',  // Light gray for brackets
        brace: '\x1b[38;5;151m'     // Light gray for braces
      }
    },
    keyBindings: {
      toggleFullJson: 'j',
      clearEvents: 'c',
      exportLogs: 'e',
      backToMain: 'q',
      pauseUpdates: 'p'
    }
  };

  return { ...defaultConfig, ...overrides };
}

export function createDarkThemeDebugConfig(): DebugConfig {
  return createDebugConfig({
    colorScheme: {
      system: '\x1b[38;5;208m', // Accent orange
      scanner: '\x1b[38;5;214m',
      inspector: '\x1b[38;5;208m',
      orchestrator: '\x1b[38;5;208m',
      guidelines: '\x1b[38;5;140m',
      agent: '\x1b[38;5;147m',
      low: '\x1b[38;5;245m',
      medium: '\x1b[38;5;226m',
      high: '\x1b[38;5;196m',
      critical: '\x1b[38;5;9m',
      json: {
        key: '\x1b[38;5;147m',
        string: '\x1b[38;5;107m',
        number: '\x1b[38;5;220m',
        boolean: '\x1b[38;5;213m',
        null: '\x1b[38;5;245m',
        bracket: '\x1b[38;5;151m',
        brace: '\x1b[38;5;151m'
      }
    }
  });
}

export function createLightThemeDebugConfig(): DebugConfig {
  return createDebugConfig({
    colorScheme: {
      system: '\x1b[38;5;202m', // Darker orange for light theme
      scanner: '\x1b[38;5;130m',
      inspector: '\x1b[38;5;166m',
      orchestrator: '\x1b[38;5;202m',
      guidelines: '\x1b[38;5;91m',
      agent: '\x1b[38;5;92m',
      low: '\x1b[38;5;240m',
      medium: '\x1b[38;5;130m',
      high: '\x1b[38;5;124m',
      critical: '\x1b[38;5;52m',
      json: {
        key: '\x1b[38;5;92m',
        string: '\x1b[38;5;28m',
        number: '\x1b[38;5;130m',
        boolean: '\x1b[38;5;91m',
        null: '\x1b[38;5;240m',
        bracket: '\x1b[38;5;242m',
        brace: '\x1b[38;5;242m'
      }
    }
  });
}

export function createHighContrastDebugConfig(): DebugConfig {
  return createDebugConfig({
    colorScheme: {
      system: '\x1b[1;33m',      // Bold yellow
      scanner: '\x1b[1;93m',     // Bold bright yellow
      inspector: '\x1b[1;33m',   // Bold yellow
      orchestrator: '\x1b[1;33m', // Bold yellow
      guidelines: '\x1b[1;35m',  // Bold magenta
      agent: '\x1b[1;36m',       // Bold cyan
      low: '\x1b[37m',           // White
      medium: '\x1b[1;33m',      // Bold yellow
      high: '\x1b[1;31m',        // Bold red
      critical: '\x1b[1;41;97m', // White on red background
      json: {
        key: '\x1b[1;36m',       // Bold cyan
        string: '\x1b[1;32m',     // Bold green
        number: '\x1b[1;33m',     // Bold yellow
        boolean: '\x1b[1;35m',    // Bold magenta
        null: '\x1b[37m',         // White
        bracket: '\x1b[37m',      // White
        brace: '\x1b[37m'         // White
      }
    }
  });
}

export function createMinimalDebugConfig(): DebugConfig {
  return createDebugConfig({
    colorScheme: {
      system: '\x1b[90m',        // Bright black (gray)
      scanner: '\x1b[90m',
      inspector: '\x1b[90m',
      orchestrator: '\x1b[90m',
      guidelines: '\x1b[90m',
      agent: '\x1b[90m',
      low: '\x1b[90m',
      medium: '\x1b[90m',
      high: '\x1b[90m',
      critical: '\x1b[90m',
      json: {
        key: '\x1b[90m',
        string: '\x1b[90m',
        number: '\x1b[90m',
        boolean: '\x1b[90m',
        null: '\x1b[90m',
        bracket: '\x1b[90m',
        brace: '\x1b[90m'
      }
    }
  });
}

// Role-specific color configurations based on tui-implementation.md
export function getRoleColorConfig(role: string): Partial<DebugConfig> {
  const roleColors: Record<string, string> = {
    'robo-aqa': '\x1b[38;5;147m',           // B48EAD (purple)
    'robo-quality-control': '\x1b[38;5;167m', // E06C75 (red)
    'robo-system-analyst': '\x1b[38;5;180m',  // C7A16B (brown, high contrast)
    'robo-developer': '\x1b[38;5;75m',        // 61AFEF (blue)
    'robo-devops-sre': '\x1b[38;5;114m',      // 98C379 (green)
    'robo-ux-ui': '\x1b[38;5;215m',          // D19A66 (pink/rose)
    'robo-legal-compliance': '\x1b[38;5;183m', // C5A3FF (light-violet)
    'orchestrator': '\x1b[38;5;208m'          // FF9A38 (accent orange)
  };

  return {
    colorScheme: {
      system: '\x1b[38;5;208m',
      scanner: '\x1b[38;5;214m',
      inspector: '\x1b[38;5;208m',
      orchestrator: '\x1b[38;5;208m',
      guidelines: '\x1b[38;5;140m',
      agent: roleColors[role] || '\x1b[38;5;147m',
      low: '\x1b[38;5;245m',
      medium: '\x1b[38;5;226m',
      high: '\x1b[38;5;196m',
      critical: '\x1b[38;5;9m',
      json: {
        key: '\x1b[38;5;147m',
        string: '\x1b[38;5;107m',
        number: '\x1b[38;5;220m',
        boolean: '\x1b[38;5;213m',
        null: '\x1b[38;5;245m',
        bracket: '\x1b[38;5;151m',
        brace: '\x1b[38;5;151m'
      }
    }
  };
}

// Signal-specific color configurations
export function getSignalColorConfig(): Record<string, string> {
  return {
    // System/orchestrator signals (brand orange)
    '[HF]': '\x1b[38;5;208m',
    '[pr]': '\x1b[38;5;208m',
    '[PR]': '\x1b[38;5;208m',
    '[FF]': '\x1b[38;5;208m',
    '[TF]': '\x1b[38;5;208m',
    '[TC]': '\x1b[38;5;208m',
    '[TI]': '\x1b[38;5;208m',

    // Agent-specific signals (role colors)
    '[aA]': '\x1b[38;5;147m', // robo-aqa (purple)
    '[cq]': '\x1b[38;5;167m', // robo-quality-control (red)
    '[gg]': '\x1b[38;5;180m', // robo-system-analyst (brown)
    '[dp]': '\x1b[38;5;75m',  // robo-developer (blue)
    '[id]': '\x1b[38;5;114m', // robo-devops-sre (green)
    '[du]': '\x1b[38;5;215m', // robo-ux-ui (pink)
    '[da]': '\x1b[38;5;183m', // robo-legal-compliance (light-violet)
    '[oa]': '\x1b[38;5;208m', // orchestrator (orange)

    // Common signals (gray/blue)
    '[bb]': '\x1b[38;5;109m', // Blocker (blue)
    '[af]': '\x1b[38;5;109m', // Feedback (blue)
    '[no]': '\x1b[38;5;109m', // Not obvious (blue)
    '[rc]': '\x1b[38;5;109m', // Research complete (blue)

    // Default/placeholder
    '[  ]': '\x1b[38;5;245m'  // Empty placeholder (gray)
  };
}

export function createDebugConfigFromTheme(theme: string, role?: string): DebugConfig {
  let baseConfig: DebugConfig;

  switch (theme) {
    case 'dark':
      baseConfig = createDarkThemeDebugConfig();
      break;
    case 'light':
      baseConfig = createLightThemeDebugConfig();
      break;
    case 'high-contrast':
      baseConfig = createHighContrastDebugConfig();
      break;
    case 'minimal':
      baseConfig = createMinimalDebugConfig();
      break;
    default:
      baseConfig = createDebugConfig();
  }

  // Apply role-specific colors if specified
  if (role) {
    const roleConfig = getRoleColorConfig(role);
    baseConfig = { ...baseConfig, ...roleConfig };
  }

  return baseConfig;
}