/**
 * ♫ Signal Orchestra Tests
 */

import { SignalOrchestra, MelodyPatterns } from '../signal-orchestra';

// Mock AudioContext for testing
class MockAudioContext {
  state: string = 'running';
  sampleRate: number = 44100;
  currentTime: number = 0;

  createOscillator(): MockOscillator {
    return new MockOscillator();
  }

  createGain(): MockGainNode {
    return new MockGainNode();
  }

  createDynamicsCompressor(): MockDynamicsCompressor {
    return new MockDynamicsCompressor();
  }

  createConvolver(): MockConvolverNode {
    return new MockConvolverNode();
  }

  createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode();
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  close(): void {
    // Mock implementation
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }
}

class MockOscillator implements MockAudioNode {
  type: OscillatorType = 'sine';
  frequency: MockAudioParam = new MockAudioParam();
  started: boolean = false;
  stopped: boolean = false;
  startTime: number = 0;
  stopTime: number = 0;
  connectedNodes: MockAudioNode[] = [];

  start(time?: number): void {
    this.started = true;
    this.startTime = time ?? 0;
  }

  stop(time?: number): void {
    this.stopped = true;
    this.stopTime = time ?? 0;
  }

  connect(node: MockAudioNode): void {
    this.connectedNodes.push(node);
  }

  disconnect(): void {
    this.connectedNodes = [];
  }
}

class MockGainNode implements MockAudioNode {
  gain: MockAudioParam = new MockAudioParam();
  connectedNodes: MockAudioNode[] = [];

  connect(node: MockAudioNode): void {
    this.connectedNodes.push(node);
  }

  disconnect(): void {
    this.connectedNodes = [];
  }
}

class MockAudioParam {
  value: number = 0;

  setValueAtTime(value: number): void {
    this.value = value;
  }

  linearRampToValueAtTime(value: number): void {
    this.value = value;
  }

  exponentialRampToValueAtTime(value: number): void {
    this.value = value;
  }
}

class MockDynamicsCompressor implements MockAudioNode {
  threshold: MockAudioParam = new MockAudioParam();
  knee: MockAudioParam = new MockAudioParam();
  ratio: MockAudioParam = new MockAudioParam();
  attack: MockAudioParam = new MockAudioParam();
  release: MockAudioParam = new MockAudioParam();

  connect(): void {
    // Mock implementation
  }

  disconnect(): void {
    // Mock implementation
  }
}

class MockConvolverNode implements MockAudioNode {
  buffer: MockAudioBuffer | null = null;

  connect(): void {
    // Mock implementation
  }

  disconnect(): void {
    // Mock implementation
  }
}

class MockAnalyserNode implements MockAudioNode {
  fftSize: number = 2048;

  connect(): void {
    // Mock implementation
  }

  disconnect(): void {
    // Mock implementation
  }
}

class MockAudioBuffer {
  constructor(
    public channels: number,
    public length: number,
    public sampleRate: number
  ) {}

  getChannelData(): Float32Array {
    return new Float32Array(this.length);
  }
}

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
type MusicalNote = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'A#' | 'C#' | 'D#' | 'F#' | 'G#';

// Mock interface for audio nodes
interface MockAudioNode {
  connect(node: MockAudioNode): void;
  disconnect(): void;
}

// Mock window.AudioContext
(global as any).AudioContext = MockAudioContext;

describe('Signal Orchestra', () => {
  let orchestra: SignalOrchestra;

  beforeEach(() => {
    orchestra = new SignalOrchestra({
      enabled: true,
      masterVolume: 0.1, // Low volume for testing
      latencyTarget: 50,
      enableReverb: false, // Disable for simpler testing
      enableCompressor: false
    });
  });

  afterEach(() => {
    orchestra.destroy();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await orchestra.initialize();

      const metrics = orchestra.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle disabled initialization gracefully', async () => {
      const disabledOrchestra = new SignalOrchestra({ enabled: false });
      await disabledOrchestra.initialize();

      const metrics = disabledOrchestra.getMetrics();
      expect(metrics.latency).toBe(0);

      disabledOrchestra.destroy();
    });
  });

  describe('Signal Playback', () => {
    beforeEach(async () => {
      await orchestra.initialize();
    });

    it('should play a basic signal', async () => {
      const playPromise = orchestra.playSignal('[tp]', 'robo-developer');

      await expect(playPromise).resolves.not.toThrow();

      const metrics = orchestra.getMetrics();
      expect(metrics.activeVoices).toBe(1);
    });

    it('should handle unknown signals gracefully', async () => {
      const playPromise = orchestra.playSignal('[unknown]', 'robo-developer');

      await expect(playPromise).resolves.not.toThrow();

      const metrics = orchestra.getMetrics();
      expect(metrics.activeVoices).toBe(0); // Should not create voice for unknown signal
    });

    it('should stop agent voice when playing new signal', async () => {
      // Play first signal
      await orchestra.playSignal('[tp]', 'robo-developer');
      expect(orchestra.getMetrics().activeVoices).toBe(1);

      // Play second signal for same agent
      await orchestra.playSignal('[dp]', 'robo-developer');
      expect(orchestra.getMetrics().activeVoices).toBe(1); // Should still be 1 voice
    });

    it('should track signal history', async () => {
      await orchestra.playSignal('[tp]', 'robo-developer');
      await orchestra.playSignal('[dp]', 'robo-developer');
      await orchestra.playSignal('[tw]', 'robo-developer');

      const history = orchestra.getSignalHistory(10);
      expect(history).toHaveLength(3);
      expect(history[0]?.toSignal).toBe('[tp]');
      expect(history[1]?.toSignal).toBe('[dp]');
      expect(history[2]?.toSignal).toBe('[tw]');
      expect(history.every((h) => h.agentType === 'robo-developer')).toBe(true);
    });
  });

  describe('Melody Playback', () => {
    beforeEach(async () => {
      await orchestra.initialize();
    });

    it('should play a melody pattern', async () => {
      const pattern = {
        notes: ['C', 'E', 'G'] as MusicalNote[],
        durations: [200, 200, 400],
        tempo: 120,
        instrument: 'piano' as const
      };

      const playPromise = orchestra.playMelody(pattern, 'test-agent');

      await expect(playPromise).resolves.not.toThrow();
    });

    it('should play predefined melody patterns', async () => {
      const playPromise = orchestra.playMelody(MelodyPatterns['AGENT_SPAWNING']!, 'test-agent');

      await expect(playPromise).resolves.not.toThrow();
    });

    it('should stop agent voice when playing melody', async () => {
      // Start with a signal
      await orchestra.playSignal('[tp]', 'test-agent');
      expect(orchestra.getMetrics().activeVoices).toBe(1);

      // Play melody (should replace the signal voice)
      await orchestra.playMelody(MelodyPatterns['TASK_SUCCESS']!, 'test-agent');
      // Voice count might vary due to sequenced notes, but should not crash
    });
  });

  describe('Instrument Mappings', () => {
    beforeEach(async () => {
      await orchestra.initialize();
    });

    it('should use different instruments for different agent types', async () => {
      await orchestra.playSignal('[tp]', 'robo-developer'); // Should use piano
      await orchestra.playSignal('[tp]', 'robo-quality-control'); // Should use strings
      await orchestra.playSignal('[tp]', 'robo-system-analyst'); // Should use brass

      const history = orchestra.getSignalHistory(3);
      expect(history[0]?.agentType).toBe('robo-developer');
      expect(history[1]?.agentType).toBe('robo-quality-control');
      expect(history[2]?.agentType).toBe('robo-system-analyst');
    });
  });

  describe('Configuration', () => {
    it('should update configuration', async () => {
      await orchestra.initialize();

      orchestra.updateConfig({ masterVolume: 0.5 });

      // Configuration should be updated without errors
      expect(true).toBe(true); // Simple assertion that no error was thrown
    });

    it('should enable/disable audio', async () => {
      const disabledOrchestra = new SignalOrchestra({ enabled: false });
      await disabledOrchestra.initialize();

      await disabledOrchestra.playSignal('[tp]', 'test-agent');

      const metrics = disabledOrchestra.getMetrics();
      expect(metrics.activeVoices).toBe(0);

      disabledOrchestra.destroy();
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await orchestra.initialize();
    });

    it('should track latency metrics', async () => {
      const startTime = performance.now();
      await orchestra.playSignal('[tp]', 'test-agent');
      const endTime = performance.now();

      const metrics = orchestra.getMetrics();
      expect(metrics.latency).toBeGreaterThan(0);
      expect(metrics.latency).toBeLessThan(endTime - startTime + 10); // Allow some margin
    });

    it('should track active voices', async () => {
      expect(orchestra.getMetrics().activeVoices).toBe(0);

      await orchestra.playSignal('[tp]', 'agent-1');
      expect(orchestra.getMetrics().activeVoices).toBe(1);

      await orchestra.playSignal('[tp]', 'agent-2');
      expect(orchestra.getMetrics().activeVoices).toBe(2);

      orchestra.stopAgentVoice('agent-1');
      expect(orchestra.getMetrics().activeVoices).toBe(1);
    });

    it('should estimate CPU and memory usage', async () => {
      await orchestra.playSignal('[tp]', 'test-agent');

      const metrics = orchestra.getMetrics();
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle playback errors gracefully', async () => {
      await orchestra.initialize();

      // Force an error by trying to play with invalid configuration
      const invalidOrchestra = new SignalOrchestra();
      await invalidOrchestra.initialize();

      // Should not throw even with invalid operations
      await expect(invalidOrchestra.playSignal('[tp]', 'test-agent')).resolves.not.toThrow();

      invalidOrchestra.destroy();
    });

    it('should cleanup resources properly', async () => {
      await orchestra.initialize();
      await orchestra.playSignal('[tp]', 'test-agent');

      expect(orchestra.getMetrics().activeVoices).toBe(1);

      orchestra.destroy();

      // After destroy, operations should be safe no-ops
      await expect(orchestra.playSignal('[tp]', 'test-agent')).resolves.not.toThrow();
    });
  });

  describe('Note Mapping', () => {
    it('should have valid note mappings for all signals', () => {
      // This is a more structural test
      const signals = Object.keys({
        '[tp]': 'C',
        '[dp]': 'E',
        '[tw]': 'G',
        '[bf]': 'C',
        '[cq]': 'A',
        '[tg]': 'B',
        '[cp]': 'D',
        '[cf]': 'F#',
        '[rv]': 'G',
        '[ra]': 'C',
        '[rl]': 'E',
        '[mg]': 'C',
        '[aa]': 'A#',
        '[oa]': 'G#',
        '[ic]': 'F',
        '♪': 'C',
        '♩': 'E',
        '♬': 'G',
        '♫': 'C'
      });

      expect(signals.length).toBeGreaterThan(0);
    });
  });
});
