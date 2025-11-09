/**
 * ♫ Audio Feedback Manager
 *
 * Integrates the Signal Orchestra with the agent system to provide
 * real-time audio feedback for agent lifecycle events.
 */

import { SignalOrchestra, MelodyPatterns, OrchestraConfig } from './signal-orchestra.js';

export interface AudioFeedbackRule {
  agentType: string;
  event: string;
  condition?: (data: any) => boolean;
  action: 'play_signal' | 'play_melody' | 'stop' | 'sequence';
  target: string;
  delay?: number;
}

export interface AudioEvent {
  type: string;
  agentId: string;
  agentType: string;
  data: any;
  timestamp: number;
}

/**
 * Audio Feedback Manager - Orchestrates audio feedback for agent events
 */
export class AudioFeedbackManager {
  private orchestra: SignalOrchestra;
  private rules: AudioFeedbackRule[] = [];
  private enabled: boolean = true;
  private eventQueue: AudioEvent[] = [];
  private isProcessing: boolean = false;

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
      console.log('🎵 Audio Feedback Manager initialized');
      this.startEventProcessor();
    } else {
      console.warn('Audio system not available, disabling audio feedback');
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
  async processAgentEvent(agentId: string, agentType: string, event: string, data: any): Promise<void> {
    if (!this.enabled) return;

    const audioEvent: AudioEvent = {
      type: event,
      agentId,
      agentType,
      data,
      timestamp: Date.now()
    };

    this.eventQueue.push(audioEvent);

    if (!this.isProcessing) {
      this.processEventQueue();
    }
  }

  /**
   * Process signal change event
   */
  async processSignalChange(signal: string, agentType: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.orchestra.playSignal(signal, agentType);
    } catch (error) {
      console.error('Failed to play signal audio:', error);
    }
  }

  /**
   * Play melody for agent state
   */
  async playMelodyForAgent(_agentId: string, agentType: string, state: string): Promise<void> {
    if (!this.enabled) return;

    let pattern = null;

    switch (state) {
      case 'spawning':
        pattern = MelodyPatterns.AGENT_SPAWNING;
        break;
      case 'success':
        pattern = MelodyPatterns.TASK_SUCCESS;
        break;
      case 'error':
        pattern = MelodyPatterns.TASK_ERROR;
        break;
      case 'completed':
        pattern = MelodyPatterns.COMPLETION_FANFARE;
        break;
      default:
        return;
    }

    try {
      if (pattern) {
        await this.orchestra.playMelody(pattern, agentType);
      }
    } catch (error) {
      console.error('Failed to play melody:', error);
    }
  }

  /**
   * Stop audio for specific agent
   */
  stopAgentAudio(agentId: string): void {
    if (!this.enabled) return;
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
  getMetrics() {
    return this.orchestra.getMetrics();
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 20): AudioEvent[] {
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
      delay: 0
    });

    // Agent spawned successfully
    this.rules.push({
      agentType: '*',
      event: 'agent_spawned',
      action: 'play_signal',
      target: '[tp]',
      delay: 100
    });

    // Task completed
    this.rules.push({
      agentType: '*',
      event: 'task_completed',
      condition: (data) => data.success,
      action: 'play_melody',
      target: 'TASK_SUCCESS',
      delay: 0
    });

    // Task failed
    this.rules.push({
      agentType: '*',
      event: 'task_failed',
      action: 'play_melody',
      target: 'TASK_ERROR',
      delay: 0
    });

    // Agent stopped
    this.rules.push({
      agentType: '*',
      event: 'agent_stopped',
      action: 'play_signal',
      target: '[cd]',
      delay: 0
    });

    // Agent errors
    this.rules.push({
      agentType: '*',
      event: 'agent_error',
      action: 'play_signal',
      target: '[ic]',
      delay: 0
    });

    // System ready
    this.rules.push({
      agentType: 'orchestrator',
      event: 'system_ready',
      action: 'play_melody',
      target: 'SYSTEM_READY',
      delay: 500
    });

    // Completion fanfare for significant milestones
    this.rules.push({
      agentType: '*',
      event: 'milestone_completed',
      condition: (data) => data.significance === 'major',
      action: 'play_melody',
      target: 'COMPLETION_FANFARE',
      delay: 200
    });
  }

  /**
   * Process queued events
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      await this.processEvent(event);

      // Small delay to prevent audio overload
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  /**
   * Process individual event
   */
  private async processEvent(event: AudioEvent): Promise<void> {
    // Find matching rules
    const matchingRules = this.rules.filter(rule => {
      if (rule.agentType !== '*' && rule.agentType !== event.agentType) {
        return false;
      }

      if (rule.event !== '*' && rule.event !== event.type) {
        return false;
      }

      if (rule.condition && !rule.condition(event.data)) {
        return false;
      }

      return true;
    });

    // Execute matching rules
    for (const rule of matchingRules) {
      if (rule.delay && rule.delay > 0) {
        setTimeout(() => this.executeRule(rule, event), rule.delay);
      } else {
        await this.executeRule(rule, event);
      }
    }
  }

  /**
   * Execute audio feedback rule
   */
  private async executeRule(rule: AudioFeedbackRule, event: AudioEvent): Promise<void> {
    try {
      switch (rule.action) {
        case 'play_signal':
          await this.orchestra.playSignal(rule.target, event.agentType);
          break;

        case 'play_melody': {
          const pattern = (MelodyPatterns as any)[rule.target];
          if (pattern) {
            await this.orchestra.playMelody(pattern, event.agentId);
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
      console.error(`Failed to execute audio rule ${rule.action}:`, error);
    }
  }

  /**
   * Start continuous event processor
   */
  private startEventProcessor(): void {
    setInterval(() => {
      if (this.enabled && !this.isProcessing && this.eventQueue.length > 0) {
        this.processEventQueue();
      }
    }, 100); // Check every 100ms
  }
}

/**
 * Global audio feedback manager instance
 */
export let audioFeedbackManager: AudioFeedbackManager | null = null;

/**
 * Initialize global audio feedback manager
 */
export async function initializeAudioFeedback(config?: Partial<OrchestraConfig>): Promise<void> {
  audioFeedbackManager = new AudioFeedbackManager(config);
  await audioFeedbackManager.initialize();
}

/**
 * Get global audio feedback manager
 */
export function getAudioFeedbackManager(): AudioFeedbackManager | null {
  return audioFeedbackManager;
}

/**
 * Cleanup global audio feedback manager
 */
export function cleanupAudioFeedback(): void {
  if (audioFeedbackManager) {
    audioFeedbackManager.destroy();
    audioFeedbackManager = null;
  }
}