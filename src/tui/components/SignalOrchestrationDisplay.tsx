/**
 * ♫ Signal Orchestration Display Component
 *
 * Comprehensive signal visualization system combining:
 * - Real-time signal flow visualization
 * - Beat-synchronized animations
 * - Agent orchestration monitoring
 * - Classical music integration
 * - Performance-optimized rendering
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';

import { useAnimationEngine } from '../animation/AnimationEngine';

import { MusicVisualizer, MusicStatusBar } from './MusicVisualizer';
import { EnhancedSignalTicker } from './EnhancedSignalTicker';

import type { JSX } from 'react';

interface SignalOrchestrationDisplayProps {
  width?: number;
  height?: number;
  showVisualizer?: boolean;
  showTicker?: boolean;
  showStatusBar?: boolean;
  compact?: boolean;
  focusMode?: 'signals' | 'melody' | 'orchestra';
}

interface SignalFlow {
  from: 'scanner' | 'inspector' | 'orchestrator' | 'agent';
  to: 'inspector' | 'orchestrator' | 'agent';
  signal: string;
  timestamp: number;
  active: boolean;
}

interface AgentState {
  name: string;
  role: string;
  status: 'SPAWNING' | 'RUNNING' | 'IDLE' | 'ERROR';
  currentSignal: string;
  progress: number;
  lastActivity: number;
}

/**
 * Signal flow visualization component
 */
const SignalFlow = ({ flows, width }: { flows: SignalFlow[]; width: number }): JSX.Element => {
  const flowWidth = Math.floor(width / 4);

  const createFlowArrow = (flow: SignalFlow): string => {
    const arrow = flow.active ? '→' : '⇢';
    const color = flow.active ? '#10B981' : '#6B7280';
    return arrow;
  };

  const getSourceIcon = (source: string): string => {
    const icons = {
      scanner: '🔍',
      inspector: '👁️',
      orchestrator: '🎼',
      agent: '🤖',
    };
    return icons[source] || '?';
  };

  const getTargetIcon = (target: string): string => {
    const icons = {
      inspector: '👁️',
      orchestrator: '🎼',
      agent: '🤖',
    };
    return icons[target] || '?';
  };

  return (
    <Box flexDirection="column" width={width}>
      {flows.map((flow, index) => (
        <Box key={index} flexDirection="row" alignItems="center" marginBottom={1}>
          <Box width={flowWidth}>
            <Text color="#9CA3AF">
              {getSourceIcon(flow.from)} {flow.from}
            </Text>
          </Box>
          <Box width={4} justifyContent="center">
            <Text color={flow.active ? '#10B981' : '#6B7280'}>
              {createFlowArrow(flow)}
            </Text>
          </Box>
          <Box width={flowWidth}>
            <Text color="#9CA3AF">
              {getTargetIcon(flow.to)} {flow.to}
            </Text>
          </Box>
          <Box flexGrow={1} justifyContent="flex-end">
            <Text color={flow.active ? '#10B981' : '#6B7280'}>
              {flow.signal}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Agent orchestration grid
 */
const AgentOrchestrationGrid = ({ agents, width }: { agents: AgentState[]; width: number }): JSX.Element => {
  const agentWidth = Math.floor(width / 3);

  const getStatusIcon = (status: string): string => {
    const icons = {
      SPAWNING: '🎵',
      RUNNING: '🎶',
      IDLE: '💤',
      ERROR: '⚠️',
    };
    return icons[status] || '❓';
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      SPAWNING: '#FBBF24',
      RUNNING: '#10B981',
      IDLE: '#6B7280',
      ERROR: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  return (
    <Box flexDirection="column" width={width}>
      <Text color="#10B981" bold marginBottom={1}>
        🤖 Agent Orchestration
      </Text>
      {agents.map((agent, index) => (
        <Box key={index} flexDirection="row" alignItems="center" marginBottom={1}>
          <Box width={agentWidth}>
            <Text color={getStatusColor(agent.status)} bold>
              {getStatusIcon(agent.status)} {agent.name}
            </Text>
          </Box>
          <Box width={agentWidth}>
            <Text color="#9CA3AF">
              {agent.role}
            </Text>
          </Box>
          <Box flexGrow={1} flexDirection="row" alignItems="center">
            <Box flexDirection="column">
              <Text color="#6B7280" dimColor>
                {agent.currentSignal}
              </Text>
              <Text color="#9CA3AF">
                {agent.progress}%
              </Text>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Main Signal Orchestration Display Component
 */
export const SignalOrchestrationDisplay = ({
  width = 80,
  height = 20,
  showVisualizer = true,
  showTicker = true,
  showStatusBar = true,
  compact = false,
  focusMode = 'orchestra'
}: SignalOrchestrationDisplayProps): JSX.Element => {
  const { engine, getCurrentBeat } = useAnimationEngine();
  const [signalFlows, setSignalFlows] = useState<SignalFlow[]>([]);
  const [agentStates, setAgentStates] = useState<AgentState[]>([]);
  const [activeSignals, setActiveSignals] = useState<string[]>([]);
  const [currentMelody, setCurrentMelody] = useState('SYSTEM_READY');

  const beat = getCurrentBeat();

  // Initialize simulated data
  useEffect(() => {
    // Initialize signal flows
    const flows: SignalFlow[] = [
      {
        from: 'scanner',
        to: 'inspector',
        signal: '[dp]',
        timestamp: Date.now(),
        active: beat?.isOnBeat ?? false,
      },
      {
        from: 'inspector',
        to: 'orchestrator',
        signal: '[rp]',
        timestamp: Date.now(),
        active: beat?.isOnBeat ?? false,
      },
      {
        from: 'orchestrator',
        to: 'agent',
        signal: '[dp]',
        timestamp: Date.now(),
        active: beat?.isOnBeat ?? false,
      },
    ];
    setSignalFlows(flows);

    // Initialize agent states
    const agents: AgentState[] = [
      {
        name: 'robo-developer',
        role: 'Developer',
        status: 'RUNNING',
        currentSignal: '[tw]',
        progress: 75,
        lastActivity: Date.now() - 5000,
      },
      {
        name: 'robo-quality-control',
        role: 'QA',
        status: 'IDLE',
        currentSignal: '[cq]',
        progress: 100,
        lastActivity: Date.now() - 15000,
      },
      {
        name: 'robo-system-analyst',
        role: 'Analyst',
        status: 'SPAWNING',
        currentSignal: '[dp]',
        progress: 25,
        lastActivity: Date.now() - 2000,
      },
    ];
    setAgentStates(agents);
  }, [beat?.isOnBeat]);

  // Update signal flows based on beat
  useEffect(() => {
    if (beat?.isOnBeat) {
      setSignalFlows(prev =>
        prev.map(flow => ({
          ...flow,
          active: Math.random() > 0.3,
          signal: ['[dp]', '[tw]', '[bf]', '[cq]', '[rv]'][Math.floor(Math.random() * 5)],
        }))
      );

      setAgentStates(prev =>
        prev.map(agent => ({
          ...agent,
          progress: Math.min(100, agent.progress + Math.random() * 5),
          currentSignal: ['[dp]', '[tw]', '[bf]', '[cq]', '[rv]'][Math.floor(Math.random() * 5)],
          lastActivity: Date.now(),
        }))
      );
    }
  }, [beat?.isOnBeat]);

  // Extract active signals
  useEffect(() => {
    const signals = new Set([
      ...signalFlows.map(f => f.signal),
      ...agentStates.map(a => a.currentSignal),
    ]);
    setActiveSignals(Array.from(signals));
  }, [signalFlows, agentStates]);

  // Determine current melody
  useEffect(() => {
    const melodyMap: Record<string, string> = {
      'SPAWNING': 'AGENT_SPAWNING',
      'ERROR': 'TASK_ERROR',
      'IDLE': 'DEBUSSY_CLAIR',
      'RUNNING': 'SYSTEM_READY',
    };

    const activeStatuses = agentStates.map(a => a.status);
    if (activeStatuses.includes('ERROR')) {
      setCurrentMelody('TASK_ERROR');
    } else if (activeStatuses.includes('SPAWNING')) {
      setCurrentMelody('AGENT_SPAWNING');
    } else if (activeStatuses.includes('RUNNING')) {
      setCurrentMelody('SYSTEM_READY');
    } else {
      setCurrentMelody('DEBUSSY_CLAIR');
    }
  }, [agentStates]);

  if (compact) {
    return (
      <Box flexDirection="column" width={width}>
        <Text color="#10B981" bold>
          🎵 Signal Orchestration
        </Text>
        <Text color="#9CA3AF">
          {activeSignals.length} signals • {agentStates.filter(a => a.status === 'RUNNING').length} active agents
        </Text>
        {beat?.isOnBeat && <Text color="#10B981">♪</Text>}
      </Box>
    );
  }

  switch (focusMode) {
    case 'signals':
      return (
        <Box flexDirection="column" width={width} height={height}>
          {showStatusBar && (
            <MusicStatusBar
              activeSignals={activeSignals}
              currentMelody={currentMelody}
              bpm={120}
            />
          )}
          {showTicker && (
            <Box marginBottom={1}>
              <EnhancedSignalTicker
                signals={activeSignals}
                width={width}
                showMusicIndicator={true}
                compact={false}
              />
            </Box>
          )}
          <SignalFlow flows={signalFlows} width={width} />
        </Box>
      );

    case 'melody':
      return (
        <Box flexDirection="column" width={width} height={height}>
          {showStatusBar && (
            <MusicStatusBar
              activeSignals={activeSignals}
              currentMelody={currentMelody}
              bpm={120}
            />
          )}
          <Box flexGrow={1}>
            <MusicVisualizer
              width={width}
              height={height - 3}
              showBeatIndicator={true}
              showSignalPattern={true}
              showClassicalTheme={true}
              compact={false}
            />
          </Box>
        </Box>
      );

    default: // orchestra
      return (
        <Box flexDirection="column" width={width} height={height}>
          {/* Header */}
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Text color="#10B981" bold>
              🎼 Signal Orchestration
            </Text>
            <Text color="#6B7280">
              {beat?.isOnBeat ? '🎵' : '♪'} Beat {beat?.index ?? 0}
            </Text>
          </Box>

          {showStatusBar && (
            <MusicStatusBar
              activeSignals={activeSignals}
              currentMelody={currentMelody}
              bpm={120}
            />
          )}

          {/* Main content */}
          <Box flexGrow={1} flexDirection="column">
            {/* Agent Grid */}
            <Box marginBottom={2}>
              <AgentOrchestrationGrid agents={agentStates} width={width} />
            </Box>

            {/* Signal Flow */}
            <SignalFlow flows={signalFlows} width={width} />

            {/* Enhanced Signal Ticker */}
            {showTicker && (
              <Box marginTop={2}>
                <EnhancedSignalTicker
                  signals={activeSignals}
                  width={width}
                  showMusicIndicator={true}
                  compact={false}
                />
              </Box>
            )}

            {/* Music Visualizer */}
            {showVisualizer && (
              <Box marginTop={2}>
                <MusicVisualizer
                  width={width}
                  height={6}
                  showBeatIndicator={true}
                  showSignalPattern={true}
                  showClassicalTheme={false}
                  compact={true}
                />
              </Box>
            )}
          </Box>
        </Box>
      );
  }
};

/**
 * Header-only version for minimal display
 */
export const SignalOrchestrationHeader = ({
  width = 60
}: {
  width?: number;
}): JSX.Element => {
  const { getCurrentBeat } = useAnimationEngine();
  const beat = getCurrentBeat();

  return (
    <Box flexDirection="row" justifyContent="space-between" width={width}>
      <Text color="#10B981" bold>
        🎵 Signal Orchestra
      </Text>
      <Text color="#6B7280">
        {beat?.isOnBeat ? '🎵' : '♪'} {beat?.index ?? 0}
      </Text>
    </Box>
  );
};

export default SignalOrchestrationDisplay;