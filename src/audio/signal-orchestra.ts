/**
 * ♫ Signal Orchestra System
 *
 * Maps AGENTS.md signals to musical notes and melodies using Web Audio API.
 * Provides real-time audio feedback for agent status transitions with <100ms latency.
 */

export interface SignalNoteMapping {
  [signal: string]: {
    note: MusicalNote;
    duration: number;
    instrument: InstrumentType;
    volume: number; // 0-1
  };
}

export interface SignalTransition {
  fromSignal?: string;
  toSignal: string;
  agentType: string;
  timestamp: number;
}

export interface MelodyPattern {
  notes: MusicalNote[];
  durations: number[];
  tempo: number; // BPM
  instrument: InstrumentType;
}

export type MusicalNote = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type InstrumentType = 'piano' | 'strings' | 'brass' | 'woodwinds' | 'percussion' | 'synth';

export interface OrchestraConfig {
  enabled: boolean;
  masterVolume: number; // 0-1
  latencyTarget: number; // milliseconds
  enableReverb: boolean;
  enableCompressor: boolean;
  instrumentMappings: Record<string, InstrumentType>;
}

export interface AudioMetrics {
  latency: number; // milliseconds
  bufferUnderruns: number;
  activeVoices: number;
  cpuUsage: number; // percentage
  memoryUsage: number; // bytes
}

/**
 * Signal Orchestra - Maps system signals to musical feedback
 */
export class SignalOrchestra {
  private audioContext: AudioContext | null = null;
  private config: OrchestraConfig;
  private signalMappings: SignalNoteMapping;
  private activeVoices: Map<string, OscillatorNode> = new Map();
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private convolver: ConvolverNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Performance tracking
  private metrics: AudioMetrics;
    private signalHistory: SignalTransition[] = [];

  constructor(config?: Partial<OrchestraConfig>) {
    this.config = {
      enabled: true,
      masterVolume: 0.3,
      latencyTarget: 50, // 50ms target latency
      enableReverb: true,
      enableCompressor: true,
      instrumentMappings: {
        'robo-developer': 'piano',
        'robo-quality-control': 'strings',
        'robo-system-analyst': 'brass',
        'robo-devops-sre': 'percussion',
        'robo-ux-ui-designer': 'woodwinds',
        'orchestrator': 'synth'
      },
      ...config
    };

    this.signalMappings = this.createDefaultSignalMappings();
    this.metrics = {
      latency: 0,
      bufferUnderruns: 0,
      activeVoices: 0,
      cpuUsage: 0,
      memoryUsage: 0
    };
  }

  /**
   * Initialize the audio system
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Create audio context with low latency
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
      });

      // Wait for context to be ready
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Setup audio processing chain
      this.setupAudioChain();

      // Load impulse response for reverb
      if (this.config.enableReverb) {
        await this.setupReverb();
      }

      console.log('🎵 Signal Orchestra initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize audio system:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Play a signal as a musical note
   */
  async playSignal(signal: string, agentType: string = 'unknown'): Promise<void> {
    if (!this.config.enabled || !this.audioContext) return;

    const startTime = performance.now();

    try {
      const mapping = this.signalMappings[signal];
      if (!mapping) return;

      // Stop any existing note for this agent
      this.stopAgentVoice(agentType);

      // Create instrument voice
      const voice = this.createVoice(mapping.instrument, mapping.note, mapping.volume);

      if (voice) {
        voice.connect(this.gainNode!);
        voice.start();

        // Store active voice
        this.activeVoices.set(agentType, voice);

        // Schedule note stop
        voice.stop(this.audioContext.currentTime + mapping.duration / 1000);

        // Track signal transition
        this.trackSignalTransition(signal, agentType);

        // Update metrics
        this.metrics.latency = performance.now() - startTime;
        this.metrics.activeVoices = this.activeVoices.size;

        console.log(`🎵 Playing signal ${signal} for ${agentType} as ${mapping.note} (${mapping.instrument})`);
      }
    } catch (error) {
      console.error('Failed to play signal:', error);
      this.metrics.bufferUnderruns++;
    }
  }

  /**
   * Play a melody pattern for an agent state transition
   */
  async playMelody(pattern: MelodyPattern, agentType: string): Promise<void> {
    if (!this.config.enabled || !this.audioContext) return;

    const startTime = performance.now();

    try {
      // Stop any existing voice for this agent
      this.stopAgentVoice(agentType);

      // Create sequencer for melody
      const noteTime = 60 / pattern.tempo; // Time per beat in seconds

      pattern.notes.forEach((note, index) => {
        const voice = this.createVoice(pattern.instrument, note, 0.3);

        if (voice) {
          voice.connect(this.gainNode!);

          const startTime = this.audioContext!.currentTime + (index * noteTime);
          const duration = (pattern.durations[index] || 100) / 1000;

          voice.start(startTime);
          voice.stop(startTime + duration);
        }
      });

      // Update metrics
      this.metrics.latency = performance.now() - startTime;

      console.log(`🎵 Playing melody for ${agentType} (${pattern.notes.length} notes)`);
    } catch (error) {
      console.error('Failed to play melody:', error);
      this.metrics.bufferUnderruns++;
    }
  }

  /**
   * Stop audio for a specific agent
   */
  stopAgentVoice(agentType: string): void {
    const voice = this.activeVoices.get(agentType);
    if (voice) {
      try {
        voice.stop();
        voice.disconnect();
      } catch (error) {
        // Voice might have already stopped
      }
      this.activeVoices.delete(agentType);
    }
  }

  /**
   * Stop all audio
   */
  stopAll(): void {
    this.activeVoices.forEach((_voice, agentType) => {
      this.stopAgentVoice(agentType);
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OrchestraConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.gainNode && config.masterVolume !== undefined) {
      this.gainNode.gain.value = config.masterVolume;
    }
  }

  /**
   * Get current audio metrics
   */
  getMetrics(): AudioMetrics {
    // Update CPU usage estimate
    if (this.audioContext) {
      this.metrics.cpuUsage = this.estimateCPUUsage();
      this.metrics.memoryUsage = this.estimateMemoryUsage();
    }

    return { ...this.metrics };
  }

  /**
   * Get recent signal history
   */
  getSignalHistory(limit: number = 50): SignalTransition[] {
    return this.signalHistory.slice(-limit);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAll();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.gainNode = null;
    this.compressor = null;
    this.convolver = null;
    this.analyser = null;
    this.signalHistory = [];
  }

  /**
   * Setup audio processing chain
   */
  private setupAudioChain(): void {
    if (!this.audioContext) return;

    // Create master gain node
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.config.masterVolume;

    // Create compressor for dynamics control
    if (this.config.enableCompressor) {
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    } else {
      this.gainNode.connect(this.audioContext.destination);
    }

    // Create analyser for performance monitoring
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
  }

  /**
   * Setup reverb effect
   */
  private async setupReverb(): Promise<void> {
    if (!this.audioContext) return;

    try {
      this.convolver = this.audioContext.createConvolver();

      // Create simple impulse response for room reverb
      const length = this.audioContext.sampleRate * 2; // 2 seconds
      const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
      }

      this.convolver.buffer = impulse;

      // Insert reverb into the chain
      if (this.compressor) {
        this.compressor.disconnect();
        this.compressor.connect(this.convolver);
        this.convolver.connect(this.gainNode!);
      } else {
        this.gainNode!.disconnect();
        this.gainNode!.connect(this.convolver);
        this.convolver.connect(this.audioContext.destination);
      }
    } catch (error) {
      console.warn('Failed to setup reverb:', error);
    }
  }

  /**
   * Create instrument voice
   */
  private createVoice(instrument: InstrumentType, note: MusicalNote, volume: number): OscillatorNode | null {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Set frequency based on note
    oscillator.frequency.value = this.noteToFrequency(note);

    // Set waveform based on instrument
    oscillator.type = this.getWaveform(instrument);

    // Set envelope for instrument
    this.applyInstrumentEnvelope(gainNode, instrument, volume);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.compressor || this.gainNode!);

    return oscillator;
  }

  /**
   * Convert musical note to frequency
   */
  private noteToFrequency(note: MusicalNote): number {
    const noteFrequencies: Record<MusicalNote, number> = {
      'C': 261.63,
      'C#': 277.18,
      'D': 293.66,
      'D#': 311.13,
      'E': 329.63,
      'F': 349.23,
      'F#': 369.99,
      'G': 392.00,
      'G#': 415.30,
      'A': 440.00,
      'A#': 466.16,
      'B': 493.88
    };

    return noteFrequencies[note] || 440.00;
  }

  /**
   * Get waveform type for instrument
   */
  private getWaveform(instrument: InstrumentType): OscillatorType {
    const waveforms: Record<InstrumentType, OscillatorType> = {
      'piano': 'triangle',
      'strings': 'sawtooth',
      'brass': 'square',
      'woodwinds': 'sine',
      'percussion': 'square',
      'synth': 'sawtooth'
    };

    return waveforms[instrument] || 'sine';
  }

  /**
   * Apply instrument-specific envelope
   */
  private applyInstrumentEnvelope(gainNode: GainNode, instrument: InstrumentType, volume: number): void {
    const now = this.audioContext!.currentTime;

    switch (instrument) {
      case 'piano':
        // Quick attack, medium decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        break;

      case 'strings':
        // Medium attack, long sustain
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2);
        break;

      case 'brass':
        // Quick attack, strong sustain
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.8, now + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
        break;

      case 'woodwinds':
        // Gentle attack, medium sustain
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        break;

      case 'percussion':
        // Immediate attack, very quick decay
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        break;

      case 'synth':
        // Medium attack, medium sustain with slight modulation
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.8, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
        break;

      default:
        gainNode.gain.value = volume;
    }
  }

  /**
   * Create default signal-to-note mappings
   */
  private createDefaultSignalMappings(): SignalNoteMapping {
    return {
      // Progress signals - ascending scale
      '[tp]': { note: 'C', duration: 200, instrument: 'piano', volume: 0.3 },
      '[dp]': { note: 'E', duration: 200, instrument: 'piano', volume: 0.3 },
      '[tw]': { note: 'G', duration: 200, instrument: 'piano', volume: 0.3 },
      '[bf]': { note: 'C', duration: 300, instrument: 'brass', volume: 0.4 },

      // Status signals - different tonalities
      '[cq]': { note: 'A', duration: 150, instrument: 'strings', volume: 0.2 },
      '[tg]': { note: 'B', duration: 150, instrument: 'strings', volume: 0.3 },
      '[cp]': { note: 'D', duration: 200, instrument: 'brass', volume: 0.4 },
      '[cf]': { note: 'F#', duration: 200, instrument: 'synth', volume: 0.3 },

      // Resolution signals - pleasant cadences
      '[rv]': { note: 'G', duration: 200, instrument: 'woodwinds', volume: 0.3 },
      '[ra]': { note: 'C', duration: 400, instrument: 'piano', volume: 0.4 },
      '[rl]': { note: 'E', duration: 500, instrument: 'strings', volume: 0.4 },
      '[mg]': { note: 'C', duration: 600, instrument: 'brass', volume: 0.5 },

      // Alert signals - attention-grabbing
      '[aa]': { note: 'A#', duration: 100, instrument: 'percussion', volume: 0.6 },
      '[oa]': { note: 'G#', duration: 150, instrument: 'synth', volume: 0.5 },
      '[ic]': { note: 'F', duration: 200, instrument: 'brass', volume: 0.7 },

      // State transition symbols - musical motifs
      '♪': { note: 'C', duration: 100, instrument: 'piano', volume: 0.2 },
      '♩': { note: 'E', duration: 200, instrument: 'strings', volume: 0.3 },
      '♬': { note: 'G', duration: 300, instrument: 'woodwinds', volume: 0.3 },
      '♫': { note: 'C', duration: 400, instrument: 'brass', volume: 0.4 }
    };
  }

  /**
   * Track signal transitions for analysis
   */
  private trackSignalTransition(signal: string, agentType: string): void {
    const transition: SignalTransition = {
      fromSignal: this.signalHistory.length > 0 ? this.signalHistory[this.signalHistory.length - 1]?.toSignal : undefined,
      toSignal: signal,
      agentType,
      timestamp: Date.now()
    };

    this.signalHistory.push(transition);
    
    // Keep only recent history
    if (this.signalHistory.length > 1000) {
      this.signalHistory = this.signalHistory.slice(-500);
    }
  }

  /**
   * Estimate CPU usage based on audio metrics
   */
  private estimateCPUUsage(): number {
    // Simple estimation based on active voices and buffer underruns
    const baseUsage = this.activeVoices.size * 2; // 2% per voice
    const penaltyScore = this.metrics.bufferUnderruns * 5; // 5% per underrun
    return Math.min(100, baseUsage + penaltyScore);
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimation based on active nodes and history
    const nodeMemory = this.activeVoices.size * 1024; // 1KB per voice
    const historyMemory = this.signalHistory.length * 100; // 100 bytes per transition
    return nodeMemory + historyMemory;
  }
}

/**
 * Melody Patterns for common agent states
 */
export const MelodyPatterns: Record<string, MelodyPattern> = {
  AGENT_SPAWNING: {
    notes: ['C', 'E', 'G', 'C'] as MusicalNote[],
    durations: [100, 100, 100, 200],
    tempo: 120,
    instrument: 'piano' as InstrumentType
  },

  TASK_SUCCESS: {
    notes: ['G', 'B', 'D', 'G'] as MusicalNote[],
    durations: [150, 150, 150, 300],
    tempo: 100,
    instrument: 'strings' as InstrumentType
  },

  TASK_ERROR: {
    notes: ['F#', 'F', 'E'] as MusicalNote[],
    durations: [100, 100, 200],
    tempo: 80,
    instrument: 'brass' as InstrumentType
  },

  SYSTEM_READY: {
    notes: ['C', 'E', 'G', 'C', 'E'] as MusicalNote[],
    durations: [200, 200, 200, 200, 400],
    tempo: 90,
    instrument: 'woodwinds' as InstrumentType
  },

  COMPLETION_FANFARE: {
    notes: ['C', 'E', 'G', 'C', 'G', 'E', 'C'] as MusicalNote[], // Fixed C5 to C
    durations: [150, 150, 150, 300, 150, 150, 450],
    tempo: 120,
    instrument: 'brass' as InstrumentType
  }
};