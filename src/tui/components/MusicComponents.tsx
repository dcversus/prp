/**
 * ♫ Music Components Index
 *
 * Central export for all music-themed TUI components:
 * - Music visualizers
 * - Signal animations
 * - Agent monitoring enhancements
 * - Orchestration displays
 */

// Import all music components
import MusicVisualizerComponent, {
  CompactMusicIndicator,
  MusicStatusBar,
} from './MusicVisualizer';
import EnhancedSignalTickerComponent, {
  HeaderSignalTicker,
} from './EnhancedSignalTicker';
import SignalOrchestrationDisplayComponent, {
  SignalOrchestrationHeader,
} from './SignalOrchestrationDisplay';
import { AgentCard } from './AgentCard';

// Re-export existing components for convenience
export { MusicIcon, OptimizedMusicIcon, useMusicIcon } from './MusicIcon';
export { SignalAnimation } from './SignalAnimation';
export { SignalDisplay, SignalBadge, SignalList } from './SignalDisplay';

// Import for default export
import { MusicIcon as ImportedMusicIcon, OptimizedMusicIcon as ImportedOptimizedMusicIcon, useMusicIcon as ImportedUseMusicIcon } from './MusicIcon';
import { SignalAnimation as ImportedSignalAnimation } from './SignalAnimation';
import { SignalDisplay as ImportedSignalDisplay } from './SignalDisplay';

// Export the main components
export {
  MusicVisualizerComponent as MusicVisualizer,
  EnhancedSignalTickerComponent as EnhancedSignalTicker,
  SignalOrchestrationDisplayComponent as SignalOrchestrationDisplay,
  CompactMusicIndicator,
  MusicStatusBar,
  HeaderSignalTicker,
  SignalOrchestrationHeader,
  AgentCard,
};

// Types for music components
export type {
  MusicVisualizerProps,
  BeatIndicatorProps,
  SignalPatternProps,
} from './MusicVisualizer';

export type {
  EnhancedSignalTickerProps,
  SignalSlot,
} from './EnhancedSignalTicker';

export type {
  SignalOrchestrationDisplayProps,
  SignalFlow,
  AgentState as OrchestrationAgentState,
} from './SignalOrchestrationDisplay';

/**
 * Quick setup function for music components
 */
export const setupMusicComponents = (options: {
  enableMelody?: boolean;
  bpm?: number;
  theme?: 'classical' | 'modern' | 'minimal';
}) => {
  const {
    enableMelody = true,
    bpm = 120,
    theme = 'classical'
  } = options;

  // Configure music system
  const config = {
    melodyEnabled: enableMelody,
    baseBPM: bpm,
    visualTheme: theme,
    beatSyncAnimations: true,
    classicalIntegration: theme === 'classical',
  };

  return {
    config,
    components: {
      MusicVisualizer: MusicVisualizerComponent,
      EnhancedSignalTicker: EnhancedSignalTickerComponent,
      SignalOrchestrationDisplay: SignalOrchestrationDisplayComponent,
      CompactMusicIndicator,
      AgentCard,
    },
  };
};

/**
 * Utility functions for music component integration
 */
export const MusicComponentUtils = {
  /**
   * Get appropriate melody for a signal type
   */
  getMelodyForSignal: (signal: string): string => {
    const melodyMap: Record<string, string> = {
      '[aa]': 'MISSION_IMPOSSIBLE',
      '[ic]': 'STAR_WARS',
      '[ff]': 'BACH_FUGUE',
      '[mg]': 'COMPLETION_FANFARE',
      '[rl]': 'VIVALDI_SPRING',
      '[bf]': 'DEBUSSY_CLAIR',
      '[dp]': 'SYSTEM_READY',
      '[tw]': 'AGENT_SPAWNING',
      '[cq]': 'MOZART_SONATA',
      '[tg]': 'BEETHOVEN_ODE',
      '[cp]': 'TASK_SUCCESS',
      '[cf]': 'TASK_ERROR',
    };
    return melodyMap[signal] || 'SYSTEM_READY';
  },

  /**
   * Get color scheme for signal type
   */
  getSignalColor: (signal: string): string => {
    const colorMap: Record<string, string> = {
      '[dp]': '#10B981', // Green
      '[tw]': '#34D399', // Light green
      '[bf]': '#F59E0B', // Amber
      '[cq]': '#60A5FA', // Blue
      '[tg]': '#10B981', // Green
      '[cp]': '#F59E0B', // Amber
      '[cf]': '#EF4444', // Red
      '[rv]': '#8B5CF6', // Purple
      '[ra]': '#10B981', // Green
      '[rl]': '#34D399', // Light green
      '[mg]': '#F59E0B', // Amber
      '[aa]': '#EF4444', // Red
      '[ic]': '#EF4444', // Red
      '[ff]': '#DC2626', // Dark red
    };
    return colorMap[signal] || '#6B7280';
  },

  /**
   * Format agent status with music theme
   */
  formatAgentStatus: (status: string): { icon: string; color: string; signal: string } => {
    const statusMap: Record<string, { icon: string; color: string; signal: string }> = {
      SPAWNING: { icon: '🎵', color: '#FBBF24', signal: '[dp]' },
      RUNNING: { icon: '🎶', color: '#10B981', signal: '[tw]' },
      IDLE: { icon: '💤', color: '#6B7280', signal: '[cq]' },
      ERROR: { icon: '⚠️', color: '#EF4444', signal: '[cf]' },
    };
    return statusMap[status] || { icon: '❓', color: '#6B7280', signal: '[dp]' };
  },

  /**
   * Create music-themed status indicators
   */
  createStatusIndicator: (active: boolean, signal: string): string => {
    if (active) {
      return '🎵'; // On beat
    }
    return '♪'; // Off beat
  },
};

export default {
  // Components
  MusicVisualizer: MusicVisualizerComponent,
  EnhancedSignalTicker: EnhancedSignalTickerComponent,
  SignalOrchestrationDisplay: SignalOrchestrationDisplayComponent,
  CompactMusicIndicator,
  AgentCard,

  // Utilities
  setupMusicComponents,
  MusicComponentUtils,

  // Legacy exports - Use imported components
  MusicIcon: ImportedMusicIcon,
  OptimizedMusicIcon: ImportedOptimizedMusicIcon,
  useMusicIcon: ImportedUseMusicIcon,
  SignalAnimation: ImportedSignalAnimation,
  SignalDisplay: ImportedSignalDisplay,
};