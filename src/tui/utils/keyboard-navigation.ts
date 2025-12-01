/**
 * Enhanced Keyboard Navigation System for TUI
 *
 * Provides Tab/S/X key combinations for navigating PRP lists,
 * controlling agents, and managing interactive elements.
 */

import type { TUIConfig } from '../shared/types/TUIConfig';

export type NavigationMode = 'global' | 'list' | 'agent' | 'input' | 'filter';
export type NavigationDirection = 'next' | 'prev' | 'first' | 'last';
export interface SelectionState {
  index: number;
  count: number;
  id?: string;
}

export interface KeyboardNavigationConfig {
  mode: NavigationMode;
  selectedIndex?: number;
  totalItems?: number;
  selectedId?: string;
  shortcuts?: Record<string, () => void>;
}

export interface KeyboardEvent {
  input: string;
  key: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    return?: boolean;
    escape?: boolean;
    tab?: boolean;
    backspace?: boolean;
    delete?: boolean;
    up?: boolean;
    down?: boolean;
    left?: boolean;
    right?: boolean;
    space?: boolean;
    pageUp?: boolean;
    pageDown?: boolean;
    home?: boolean;
    end?: boolean;
  };
}

export class KeyboardNavigation {
  private config: KeyboardNavigationConfig;
  private readonly onNavigate?: (direction: NavigationDirection, index: number) => void;
  private readonly onSelect?: (id: string, index: number) => void;
  private readonly onAction?: (action: string, id?: string, index?: number) => void;
  private readonly onModeChange?: (mode: NavigationMode) => void;

  constructor(
    config: KeyboardNavigationConfig,
    handlers?: {
      onNavigate?: (direction: NavigationDirection, index: number) => void;
      onSelect?: (id: string, index: number) => void;
      onAction?: (action: string, id?: string, index?: number) => void;
      onModeChange?: (mode: NavigationMode) => void;
    }
  ) {
    this.config = config;
    this.onNavigate = handlers?.onNavigate;
    this.onSelect = handlers?.onSelect;
    this.onAction = handlers?.onAction;
    this.onModeChange = handlers?.onModeChange;
  }

  /**
   * Parse raw keyboard input into structured event
   */
  static parseInput(input: string): KeyboardEvent {
    const event: KeyboardEvent = {
      input,
      key: {},
    };

    // Parse control characters
    if (input === '\t') {
      event.key.tab = true;
    } else if (input === '\r' || input === '\n') {
      event.key.return = true;
    } else if (input === '\x1b') {
      event.key.escape = true;
    } else if (input === '\x7f' || input === '\x08') {
      event.key.backspace = true;
    } else if (input === '\x1b[A') {
      event.key.up = true;
    } else if (input === '\x1b[B') {
      event.key.down = true;
    } else if (input === '\x1b[C') {
      event.key.right = true;
    } else if (input === '\x1b[D') {
      event.key.left = true;
    } else if (input === '\x1b[5~') {
      event.key.pageUp = true;
    } else if (input === '\x1b[6~') {
      event.key.pageDown = true;
    } else if (input === '\x1b[H') {
      event.key.home = true;
    } else if (input === '\x1b[F') {
      event.key.end = true;
    } else if (input === ' ') {
      event.key.space = true;
    }

    return event;
  }

  /**
   * Handle keyboard input based on current mode
   */
  handleInput(input: string): boolean {
    const event = KeyboardNavigation.parseInput(input);
    let handled = false;

    switch (this.config.mode) {
      case 'global':
        handled = this.handleGlobalMode(event);
        break;
      case 'list':
        handled = this.handleListMode(event);
        break;
      case 'agent':
        handled = this.handleAgentMode(event);
        break;
      case 'input':
        handled = this.handleInputMode(event);
        break;
      case 'filter':
        handled = this.handleFilterMode(event);
        break;
    }

    // Check custom shortcuts
    if (!handled && this.config.shortcuts?.[input]) {
      this.config.shortcuts[input]();
      handled = true;
    }

    return handled;
  }

  /**
   * Global navigation mode
   */
  private handleGlobalMode(event: KeyboardEvent): boolean {
    // Tab: Enter navigation mode
    if (event.key.tab) {
      if (this.onModeChange) {
        this.onModeChange('list');
      }
      return true;
    }

    // S + Tab: Quick actions
    if (event.input === 'S' || event.input === 's') {
      if (this.onAction) {
        this.onAction('quick-menu');
      }
      return true;
    }

    // X + Tab: Exit current context
    if (event.input === 'X' || event.input === 'x') {
      if (this.onAction) {
        this.onAction('exit-context');
      }
      return true;
    }

    return false;
  }

  /**
   * List navigation mode (for PRP lists, agent lists, etc.)
   */
  private handleListMode(event: KeyboardEvent): boolean {
    const { selectedIndex = 0, totalItems = 0 } = this.config;
    let newIndex = selectedIndex;

    // Navigation keys
    if (event.key.down) {
      newIndex = Math.min(selectedIndex + 1, totalItems - 1);
      if (this.onNavigate) {
        this.onNavigate('next', newIndex);
      }
      return true;
    }

    if (event.key.up) {
      newIndex = Math.max(selectedIndex - 1, 0);
      if (this.onNavigate) {
        this.onNavigate('prev', newIndex);
      }
      return true;
    }

    if (event.key.pageDown) {
      newIndex = Math.min(selectedIndex + 10, totalItems - 1);
      if (this.onNavigate) {
        this.onNavigate('next', newIndex);
      }
      return true;
    }

    if (event.key.pageUp) {
      newIndex = Math.max(selectedIndex - 10, 0);
      if (this.onNavigate) {
        this.onNavigate('prev', newIndex);
      }
      return true;
    }

    if (event.key.home) {
      if (this.onNavigate) {
        this.onNavigate('first', 0);
      }
      return true;
    }

    if (event.key.end) {
      if (this.onNavigate) {
        this.onNavigate('last', totalItems - 1);
      }
      return true;
    }

    // Tab navigation between sections
    if (event.key.tab) {
      // Cycle through different list types
      if (this.onModeChange) {
        this.onModeChange('agent'); // Switch to agent mode
      }
      return true;
    }

    // Enter: Select item
    if (event.key.return && this.onSelect) {
      this.onSelect(this.config.selectedId || '', selectedIndex);
      return true;
    }

    // Space: Toggle selection
    if (event.key.space && this.onAction) {
      this.onAction('toggle', this.config.selectedId, selectedIndex);
      return true;
    }

    // S key: Actions menu
    if (event.input === 'S' || event.input === 's') {
      if (this.onAction) {
        this.onAction('actions', this.config.selectedId, selectedIndex);
      }
      return true;
    }

    // X key: Exit list mode
    if (event.input === 'X' || event.input === 'x') {
      if (this.onModeChange) {
        this.onModeChange('global');
      }
      return true;
    }

    // Number keys: Quick selection
    const num = parseInt(event.input);
    if (num >= 1 && num <= 9 && num <= totalItems) {
      const index = num - 1;
      if (this.onNavigate) {
        this.onNavigate('next', index);
      }
      if (this.onSelect) {
        this.onSelect(this.config.selectedId || '', index);
      }
      return true;
    }

    return false;
  }

  /**
   * Agent control mode
   */
  private handleAgentMode(event: KeyboardEvent): boolean {
    // Tab: Cycle to next mode
    if (event.key.tab) {
      if (this.onModeChange) {
        this.onModeChange('input');
      }
      return true;
    }

    // S key: Start/Stop agent
    if (event.input === 'S' || event.input === 's') {
      if (this.onAction) {
        this.onAction('toggle-agent', this.config.selectedId);
      }
      return true;
    }

    // X key: Terminate agent
    if (event.input === 'X' || event.input === 'x') {
      if (this.onAction) {
        this.onAction('terminate-agent', this.config.selectedId);
      }
      return true;
    }

    // R key: Restart agent
    if (event.input === 'R' || event.input === 'r') {
      if (this.onAction) {
        this.onAction('restart-agent', this.config.selectedId);
      }
      return true;
    }

    // P key: Pause/Resume
    if (event.input === 'P' || event.input === 'p') {
      if (this.onAction) {
        this.onAction('pause-agent', this.config.selectedId);
      }
      return true;
    }

    // M key: View metrics
    if (event.input === 'M' || event.input === 'm') {
      if (this.onAction) {
        this.onAction('view-metrics', this.config.selectedId);
      }
      return true;
    }

    // L key: View logs
    if (event.input === 'L' || event.input === 'l') {
      if (this.onAction) {
        this.onAction('view-logs', this.config.selectedId);
      }
      return true;
    }

    // C key: Configure agent
    if (event.input === 'C' || event.input === 'c') {
      if (this.onAction) {
        this.onAction('configure-agent', this.config.selectedId);
      }
      return true;
    }

    return false;
  }

  /**
   * Input mode
   */
  private handleInputMode(event: KeyboardEvent): boolean {
    // Tab: Cycle to next mode
    if (event.key.tab) {
      if (this.onModeChange) {
        this.onModeChange('filter');
      }
      return true;
    }

    // Escape: Cancel input
    if (event.key.escape) {
      if (this.onAction) {
        this.onAction('cancel-input');
      }
      return true;
    }

    return false; // Let input component handle the rest
  }

  /**
   * Filter mode
   */
  private handleFilterMode(event: KeyboardEvent): boolean {
    // Tab: Cycle back to global mode
    if (event.key.tab) {
      if (this.onModeChange) {
        this.onModeChange('global');
      }
      return true;
    }

    // Escape: Clear filter
    if (event.key.escape) {
      if (this.onAction) {
        this.onAction('clear-filter');
      }
      return true;
    }

    // Ctrl+R: Reset filters
    if (event.input === '\x12') { // Ctrl+R
      if (this.onAction) {
        this.onAction('reset-filters');
      }
      return true;
    }

    return false;
  }

  /**
   * Update navigation configuration
   */
  updateConfig(config: Partial<KeyboardNavigationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): KeyboardNavigationConfig {
    return { ...this.config };
  }

  /**
   * Get available shortcuts for current mode
   */
  getShortcuts(): Record<string, string> {
    const shortcuts: Record<string, string> = {};

    switch (this.config.mode) {
      case 'global':
        shortcuts['Tab'] = 'Enter navigation mode';
        shortcuts['S'] = 'Quick actions menu';
        shortcuts['X'] = 'Exit current context';
        break;

      case 'list':
        shortcuts['↑/↓'] = 'Navigate up/down';
        shortcuts['PageUp/PageDown'] = 'Navigate faster';
        shortcuts['Home/End'] = 'Jump to first/last';
        shortcuts['Enter'] = 'Select item';
        shortcuts['Space'] = 'Toggle selection';
        shortcuts['Tab'] = 'Switch to agent mode';
        shortcuts['S'] = 'Actions menu';
        shortcuts['X'] = 'Exit list mode';
        shortcuts['1-9'] = 'Quick selection';
        break;

      case 'agent':
        shortcuts['Tab'] = 'Switch to input mode';
        shortcuts['S'] = 'Start/Stop agent';
        shortcuts['X'] = 'Terminate agent';
        shortcuts['R'] = 'Restart agent';
        shortcuts['P'] = 'Pause/Resume';
        shortcuts['M'] = 'View metrics';
        shortcuts['L'] = 'View logs';
        shortcuts['C'] = 'Configure agent';
        break;

      case 'input':
        shortcuts['Tab'] = 'Switch to filter mode';
        shortcuts['Escape'] = 'Cancel input';
        break;

      case 'filter':
        shortcuts['Tab'] = 'Return to global mode';
        shortcuts['Escape'] = 'Clear filter';
        shortcuts['Ctrl+R'] = 'Reset all filters';
        break;
    }

    return shortcuts;
  }
}

/**
 * Hook for using keyboard navigation in React components
 */
export function useKeyboardNavigation(
  config: KeyboardNavigationConfig,
  handlers?: {
    onNavigate?: (direction: NavigationDirection, index: number) => void;
    onSelect?: (id: string, index: number) => void;
    onAction?: (action: string, id?: string, index?: number) => void;
    onModeChange?: (mode: NavigationMode) => void;
  }
) {
  // This would be implemented as a React hook in the actual component
  // For now, return the navigation instance
  return new KeyboardNavigation(config, handlers);
}

/**
 * Create default navigation configuration for TUI
 */
export function createDefaultNavigationConfig(
  mode: NavigationMode = 'global',
  options: Partial<KeyboardNavigationConfig> = {}
): KeyboardNavigationConfig {
  return {
    mode,
    selectedIndex: 0,
    totalItems: 0,
    ...options,
  };
}