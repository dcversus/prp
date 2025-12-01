/**
 * ♫ Audio Feedback Manager
 *
 * Integrates the Signal Orchestra with the agent system to provide
 * real-time audio feedback for agent lifecycle events.
 */
import { logger } from '../shared/logger';

import { SignalOrchestra, MelodyPatterns, type OrchestraConfig, type AudioMetrics } from './signal-orchestra';

// Simple audio logger to avoid external dependencies
class AudioLogger {
  info(message: string, ...args: unknown[]): void {
    const metadata = args.length > 0 ? { args } : undefined;
    logger.info('shared', 'AudioFeedbackManager', message, metadata);
  }
  warn(message: string, ...args: unknown[]): void {
    const metadata = args.length > 0 ? { args } : undefined;
    logger.warn('shared', 'AudioFeedbackManager', message, metadata);
  }
  error(message: string, ...args: unknown[]): void {
    const metadata = args.length > 0 ? { args } : undefined;
    logger.error('shared', 'AudioFeedbackManager', message, undefined, metadata);
  }
  debug(message: string, ...args: unknown[]): void {
    if (process.env['NODE_ENV'] === 'development' || process.env['DEBUG'] !== undefined) {
      const metadata = args.length > 0 ? { args } : undefined;
      logger.debug('shared', 'AudioFeedbackManager', message, metadata);
    }
  }
}
const audioFeedbackLogger = new AudioLogger();
// Audio feedback interfaces - not exported until used
interface AudioFeedbackRule {
  agentType: string;
  event: string;
  // eslint-disable-next-line no-unused-vars
  condition?: (data: AudioEventData) => boolean;
  action: 'play_signal' | 'play_melody' | 'stop' | 'sequence';
  target: string;
  delay?: number;
}
interface AudioEventData {
  success?: boolean;
  significance?: string;
  [key: string]: unknown;
}
interface AudioEvent {
  type: string;
  agentId: string;
  agentType: string;
  data: AudioEventData;
  timestamp: number;
}
/**
 * Audio Feedback Manager - Orchestrates audio feedback for agent events
 * Not exported until used in the codebase
 */
 
class _AudioFeedbackManager { // Prefix with underscore to indicate unused
  private readonly orchestra: SignalOrchestra;
  private readonly rules: AudioFeedbackRule[] = [];
  private enabled = true;
  private eventQueue: AudioEvent[] = [];
  private isProcessing = false;
  constructor(config?: Partial<OrchestraConfig>) {
    this.orchestra = new SignalOrchestra(config);
    this.setupDefaultRules();
  }
  /**
   * Initialize the audio feedback system
   */
  async initialize(): Promise<void> {
    await this.orchestra.initialize();
    if (this.orchestra.getMetrics().latency > 0) {
      audioFeedbackLogger.info('🎵 Audio Feedback Manager initialized');
      this.startEventProcessor();
    } else {
      audioFeedbackLogger.warn('Audio system not available, disabling audio feedback');
      this.enabled = false;
    }
  }
  /**
   * Add custom audio feedback rule
   */
  addRule(rule: AudioFeedbackRule): void {
    this.rules.push(rule);
  }
  /**
   * Process agent lifecycle event
   */
  processAgentEvent(
    agentId: string,
    agentType: string,
    event: string,
    data: AudioEventData,
  ): void {
    if (!this.enabled) {
      return;
    }
    const audioEvent: AudioEvent = {
      type: event,
      agentId,
      agentType,
      data,
      timestamp: Date.now(),
    };
    this.eventQueue.push(audioEvent);
    if (!this.isProcessing) {
      void this.processEventQueue();
    }
  }
  /**
   * Process signal change event
   */
  processSignalChange(signal: string, agentType: string): void {
    if (!this.enabled) {
      return;
    }
    try {
      this.orchestra.playSignal(signal, agentType);
    } catch (error) {
      audioFeedbackLogger.error('Failed to play signal audio:', error);
    }
  }
  /**
   * Play melody for agent state
   */
  playMelodyForAgent(_agentId: string, agentType: string, state: string): void {
    if (!this.enabled) {
      return;
    }
    let pattern: typeof MelodyPatterns[keyof typeof MelodyPatterns] | null = null;
    switch (state) {
      case 'spawning':
        pattern = MelodyPatterns['AGENT_SPAWNING'] ?? null;
        break;
      case 'success':
        pattern = MelodyPatterns['TASK_SUCCESS'] ?? null;
        break;
      case 'error':
        pattern = MelodyPatterns['TASK_ERROR'] ?? null;
        break;
      case 'completed':
        pattern = MelodyPatterns['COMPLETION_FANFARE'] ?? null;
        break;
      default:
        return;
    }
    try {
      if (pattern !== null) {
        this.orchestra.playMelody(pattern, agentType);
      }
    } catch (error) {
      audioFeedbackLogger.error('Failed to play melody:', error);
    }
  }
  /**
   * Stop audio for specific agent
   */
  stopAgentAudio(agentId: string): void {
    if (!this.enabled) {
      return;
    }
    this.orchestra.stopAgentVoice(agentId);
  }
  /**
   * Enable/disable audio feedback
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.orchestra.stopAll();
    }
  }
  /**
   * Update audio configuration
   */
  updateConfig(config: Partial<OrchestraConfig>): void {
    this.orchestra.updateConfig(config);
  }
  /**
   * Get audio system metrics
   */
  getMetrics(): AudioMetrics {
    return this.orchestra.getMetrics();
  }
  /**
   * Get recent events
   */
  getRecentEvents(limit = 20): AudioEvent[] {
    return this.eventQueue.slice(-limit);
  }
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.enabled = false;
    this.orchestra.destroy();
    this.eventQueue = [];
  }
  /**
   * Setup default audio feedback rules
   */
  private setupDefaultRules(): void {
    // Agent spawning
    this.rules.push({
      agentType: '*',
      event: 'agent_spawning',
      action: 'play_melody',
      target: 'AGENT_SPAWNING',
      delay: 0,
    });
    // Agent spawned successfully
    this.rules.push({
      agentType: '*',
      event: 'agent_spawned',
      action: 'play_signal',
      target: '[tp]',
      delay: 100,
    });
    // Task completed
    this.rules.push({
      agentType: '*',
      event: 'task_completed',
      condition: (data) => Boolean(data.success),
      action: 'play_melody',
      target: 'TASK_SUCCESS',
      delay: 0,
    });
    // Task failed
    this.rules.push({
      agentType: '*',
      event: 'task_failed',
      action: 'play_melody',
      target: 'TASK_ERROR',
      delay: 0,
    });
    // Agent stopped
    this.rules.push({
      agentType: '*',
      event: 'agent_stopped',
      action: 'play_signal',
      target: '[cd]',
      delay: 0,
    });
    // Agent errors
    this.rules.push({
      agentType: '*',
      event: 'agent_error',
      action: 'play_signal',
      target: '[ic]',
      delay: 0,
    });
    // System ready
    this.rules.push({
      agentType: 'orchestrator',
      event: 'system_ready',
      action: 'play_melody',
      target: 'SYSTEM_READY',
      delay: 500,
    });
    // Completion fanfare for significant milestones
    this.rules.push({
      agentType: '*',
      event: 'milestone_completed',
      condition: (data) => data.significance === 'major',
      action: 'play_melody',
      target: 'COMPLETION_FANFARE',
      delay: 200,
    });
  }
  /**
   * Process queued events
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event !== undefined) {
        this.processEvent(event);
      }
      // Small delay to prevent audio overload
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.isProcessing = false;
  }
  /**
   * Process individual event
   */
  private processEvent(event: AudioEvent): void {
    // Find matching rules
    const matchingRules = this.rules.filter((rule) => {
      if (rule.agentType !== '*' && rule.agentType !== event.agentType) {
        return false;
      }
      if (rule.event !== '*' && rule.event !== event.type) {
        return false;
      }
      if (rule.condition !== undefined && !rule.condition(event.data)) {
        return false;
      }
      return true;
    });
    // Execute matching rules
    for (const rule of matchingRules) {
      if (rule.delay !== undefined && rule.delay > 0) {
        setTimeout(() => {
          this.executeRule(rule, event);
        }, rule.delay);
      } else {
        this.executeRule(rule, event);
      }
    }
  }
  /**
   * Execute audio feedback rule
   */
  private executeRule(rule: AudioFeedbackRule, event: AudioEvent): void {
    try {
      switch (rule.action) {
        case 'play_signal':
          this.orchestra.playSignal(rule.target, event.agentType);
          break;
        case 'play_melody': {
          const targetKey = rule.target;
          const pattern = MelodyPatterns[targetKey];
          if (pattern !== undefined) {
            this.orchestra.playMelody(pattern, event.agentId);
          }
          break;
        }
        case 'stop':
          this.orchestra.stopAgentVoice(event.agentId);
          break;
        case 'sequence':
          // Handle complex sequences if needed
          break;
      }
    } catch (error) {
      audioFeedbackLogger.error(`Failed to execute audio rule ${rule.action}:`, error);
    }
  }
  /**
   * Start continuous event processor
   */
  private startEventProcessor(): void {
    setInterval(() => {
      if (this.enabled && !this.isProcessing && this.eventQueue.length > 0) {
        void this.processEventQueue();
      }
    }, 100); // Check every 100ms
  }
}
// Audio feedback manager exports removed - not used in codebase
// Re-enable when implementing audio feedback features
// let audioFeedbackManager: AudioFeedbackManager | null = null;
// const initializeAudioFeedback = async (config?: Partial<OrchestraConfig>): Promise<void> => {
//   audioFeedbackManager = new AudioFeedbackManager(config);
//   await audioFeedbackManager.initialize();
// };
// const getAudioFeedbackManager = (): AudioFeedbackManager | null => {
//   return audioFeedbackManager;
// };
// const cleanupAudioFeedback = (): void => {
//   if (audioFeedbackManager !== null) {
//     audioFeedbackManager.destroy();
//     audioFeedbackManager = null;
//   }
// };
