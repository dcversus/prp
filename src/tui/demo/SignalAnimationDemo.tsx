/**
 * ♫ Signal Animation Demo
 *
 * Demonstration of the signal animation system in action
 * Shows all animation patterns and state transitions
 */

import { useState, useEffect } from 'react';
import { render } from 'ink';
import { Box, Text, useInput } from 'ink';
import { SignalAnimation, useSignalAnimationSystem } from '../components/SignalAnimation.js';
import { createLayerLogger } from '../../shared/logger.js';

const logger = createLayerLogger('tui');

interface DemoState {
  currentDemo: 'progress' | 'scanner' | 'inspector' | 'melody';
  signals: Array<{ id: string; code: string; state: string }>;
  isRunning: boolean;
}

function SignalAnimationDemo() {
  const [state, setState] = useState<DemoState>({
    currentDemo: 'progress',
    signals: [
      { id: 'signal-1', code: '[FF]', state: 'progress' },
      { id: 'signal-2', code: '[aA]', state: 'active' },
      { id: 'signal-3', code: '[PR]', state: 'resolved' },
      { id: 'signal-4', code: '[  ]', state: 'placeholder' }
    ],
    isRunning: true
  });

  const animationSystem = useSignalAnimationSystem();

  // Handle keyboard input
  useInput((input) => {
    switch (input) {
      case '1':
        setState(prev => ({ ...prev, currentDemo: 'progress' }));
        break;
      case '2':
        setState(prev => ({ ...prev, currentDemo: 'scanner' }));
        runScannerWave();
        break;
      case '3':
        setState(prev => ({ ...prev, currentDemo: 'inspector' }));
        runInspectorBlink();
        break;
      case '4':
        setState(prev => ({ ...prev, currentDemo: 'melody' }));
        break;
      case ' ':
        setState(prev => ({ ...prev, isRunning: !prev.isRunning }));
        break;
      case 'q':
      case 'Q':
        process.exit(0);
        break;
    }
  });

  // Demo functions
  const runScannerWave = () => {
    const signalIds = state.signals.map(s => s.id);
    animationSystem.triggerScannerWave(signalIds);
  };

  const runInspectorBlink = () => {
    const signalIds = state.signals.map(s => s.id);
    animationSystem.triggerInspectorBlink(signalIds);
  };

  // Update signals in animation system
  useEffect(() => {
    state.signals.forEach(signal => {
      animationSystem.updateSignal(signal.id, signal.state, signal.code);
    });
  }, [state.signals]);

  // Render current demo
  const renderDemo = () => {
    switch (state.currentDemo) {
      case 'progress':
        return (
          <Box flexDirection="column">
            <Text color="#FF9A38" bold>Progress Animation Demo</Text>
            <Text color="#9AA0A6">Shows [FF] signal animation at 8fps</Text>
            <Box marginTop={1} flexDirection="row">
              {state.signals.map((signal, index) => {
                const animation = SignalAnimation({
                  code: signal.code,
                  state: signal.state as "active" | "placeholder" | "progress" | "resolved",
                  animate: state.isRunning
                });
                return (
                  <Box key={signal.id}>
                    <Text>
                      {animation.content}
                    </Text>
                    {index < state.signals.length - 1 && <Text> </Text>}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      case 'scanner':
        return (
          <Box flexDirection="column">
            <Text color="#FF9A38" bold>Scanner Wave Demo</Text>
            <Text color="#9AA0A6">Shows wave animation across signals (press 2 to restart)</Text>
            <Box marginTop={1} flexDirection="row">
              {state.signals.map((signal, index) => {
                const animation = SignalAnimation({
                  code: signal.code,
                  state: signal.state as "active" | "placeholder" | "progress" | "resolved",
                  animate: state.isRunning
                });
                return (
                  <Box key={signal.id}>
                    <Text>
                      {animation.content}
                    </Text>
                    {index < state.signals.length - 1 && <Text> </Text>}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      case 'inspector':
        return (
          <Box flexDirection="column">
            <Text color="#FF9A38" bold>Inspector Blink Demo</Text>
            <Text color="#9AA0A6">Shows blink animation on signal inspection (press 3 to restart)</Text>
            <Box marginTop={1} flexDirection="row">
              {state.signals.map((signal, index) => {
                const animation = SignalAnimation({
                  code: signal.code,
                  state: signal.state as "active" | "placeholder" | "progress" | "resolved",
                  animate: state.isRunning
                });
                return (
                  <Box key={signal.id}>
                    <Text>
                      {animation.content}
                    </Text>
                    {index < state.signals.length - 1 && <Text> </Text>}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      case 'melody':
        return (
          <Box flexDirection="column">
            <Text color="#FF9A38" bold>Melody Sync Demo</Text>
            <Text color="#9AA0A6">Shows beat-synchronized animations</Text>
            <Box marginTop={1} flexDirection="row">
              {state.signals.map((signal, index) => {
                const animation = SignalAnimation({
                  code: signal.code,
                  state: signal.state as "active" | "placeholder" | "progress" | "resolved",
                  animate: state.isRunning
                });
                return (
                  <Box key={signal.id}>
                    <Text>
                      {animation.content}
                    </Text>
                    {index < state.signals.length - 1 && <Text> </Text>}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text color="#61AFEF" bold>♫ @dcversus/prp - Signal Animation Demo</Text>
        <Text color="#9AA0A6">Animation: {state.isRunning ? 'Running' : 'Paused'} | Current: {state.currentDemo}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {renderDemo()}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="#B48EAD" bold>Controls:</Text>
        <Text color="#9AA0A6">1 - Progress Animation | 2 - Scanner Wave | 3 - Inspector Blink | 4 - Melody Sync</Text>
        <Text color="#9AA0A6">Space - Pause/Resume | Q - Quit</Text>
      </Box>

      <Box flexDirection="column">
        <Text color="#98C379" bold>Animation System Features:</Text>
        <Text color="#9AA0A6">• Frame-based animations at 8fps for progress indicators</Text>
        <Text color="#9AA0A6">• Scanner wave with 30ms stagger between signals</Text>
        <Text color="#9AA0A6">• Inspector blink with 120ms frame duration</Text>
        <Text color="#9AA0A6">• Melody synchronization with BPM timing</Text>
        <Text color="#9AA0A6">• Memory-efficient timer cleanup</Text>
        <Text color="#9AA0A6">• Component state management</Text>
      </Box>
    </Box>
  );
}

// Run the demo
if (require.main === module) {
  logger.info('SignalAnimationDemo', 'Starting signal animation demo');
  render(<SignalAnimationDemo />);
}

export { SignalAnimationDemo };