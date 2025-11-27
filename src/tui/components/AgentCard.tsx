/**
 * ♫ Enhanced AgentCard Component
 *
 * Displays agent status with enhanced music icon, role pill, real-time output,
 * and integrated music visualizer elements for better agent monitoring
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

import { getRoleColors } from '../config/TUIConfig';
import { useAnimationEngine } from '../animation/AnimationEngine';

import { MusicIcon } from './MusicIcon';
import { CompactMusicIndicator } from './MusicVisualizer';

import type { AgentCard as AgentCardType, TUIConfig } from '../../shared/types/TUIConfig';

interface AgentCardProps {
  agent: AgentCardType;
  config: TUIConfig;
  maxWidth: number;
  showMusicVisualizer?: boolean;
};

export const AgentCard = ({ agent, config, showMusicVisualizer = false }: AgentCardProps) => {
  const { getCurrentBeat } = useAnimationEngine();
  const roleColors = getRoleColors(agent.role, config.colors) as { active: string; bg: string };
  const [lastSignal, setLastSignal] = useState<string>('[dp]');

  const beat = getCurrentBeat();

  // Determine agent's current signal based on status and progress
  useEffect(() => {
    let signal = '[dp]'; // Default to development progress

    switch (agent.status) {
      case 'SPAWNING':
        signal = '[dp]';
        break;
      case 'RUNNING':
        if (agent.progress > 80) {
          signal = '[mg]'; // Approaching merge
        } else if (agent.progress > 50) {
          signal = '[bf]'; // Bug fixes
        } else {
          signal = '[tw]'; // Tests written
        }
        break;
      case 'IDLE':
        signal = '[cq]'; // Code quality
        break;
      case 'ERROR':
        signal = '[cf]'; // CI failed
        break;
      default:
        signal = '[dp]';
    }

    setLastSignal(signal);
  }, [agent.status, agent.progress]);

  // Get agent-specific color based on role and status
  const getAgentAccentColor = (): string => {
    const statusColors = {
      SPAWNING: '#FBBF24',
      RUNNING: '#10B981',
      IDLE: '#6B7280',
      ERROR: '#EF4444',
    };
    return statusColors[agent.status] || '#6B7280';
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header with enhanced music indicators */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="row" alignItems="center">
          <MusicIcon status={agent.status} animate={true} />
          <Text color={config.colors.base_fg}> {agent.status} </Text>
          <Text color={config.colors.base_fg}>{agent.prp}#</Text>
          <Text color={roleColors.active} backgroundColor={roleColors.bg}>
            {agent.role}
          </Text>
        </Box>

        {showMusicVisualizer && (
          <CompactMusicIndicator active={agent.status === 'RUNNING'} signal={lastSignal} />
        )}
      </Box>

      {/* Progress bar with music-themed indicators */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color={config.colors.base_fg}>Progress:</Text>
        <Box flexGrow={1}>
          {createProgressBar(agent.progress, beat?.isOnBeat)}
        </Box>
        <Text color={getAgentAccentColor()}>
          {' '}{agent.progress}%
        </Text>
      </Box>

      {/* Task and timing information */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={config.colors.base_fg}>
          Task: {agent.task}
        </Text>
        <Text color={config.colors.muted}>
          {' • '}Time left: {agent.timeLeft}
        </Text>
      </Box>

      {/* Output lines with enhanced formatting */}
      {agent.output.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={config.colors.muted}>recent activity:</Text>
          {agent.output.map((line: string, index: number) => (
            <Box key={index} marginLeft={2}>
              <Text color={config.colors.muted}>▸ </Text>
              <Text color={config.colors.base_fg}>{line}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Service line with enhanced information */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          <Text color={config.colors.muted}>service:</Text>
          <Text color={config.colors.muted}>
            {' '}tokens={agent.tokens} · active={agent.active}
          </Text>
        </Box>

        {beat?.isOnBeat && agent.status === 'RUNNING' && (
          <Text color="#10B981">🎵</Text>
        )}
      </Box>

      {/* Music visualizer for active agents */}
      {showMusicVisualizer && agent.status === 'RUNNING' && beat?.isOnBeat && (
        <Box flexDirection="row" justifyContent="center" marginTop={1}>
          {createMiniMusicVisualizer()}
        </Box>
      )}
    </Box>
  );
};

/**
 * Create a progress bar with beat-synchronized animations
 */
const createProgressBar = (progress: number, isOnBeat?: boolean): JSX.Element => {
  const barWidth = 20;
  const filledWidth = Math.floor((progress / 100) * barWidth);
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(barWidth - filledWidth);

  return (
    <Box flexDirection="row" marginLeft={1}>
      <Text color={isOnBeat ? '#10B981' : '#6B7280'}>
        [{filled}{empty}]
      </Text>
    </Box>
  );
};

/**
 * Create mini music visualizer for agent cards
 */
const createMiniMusicVisualizer = (): JSX.Element => {
  const bars = [1, 3, 2, 4, 3, 1, 2, 3];
  const barChars = [' ', '░', '▒', '▓', '█'];

  return (
    <Text color="#10B981">
      {bars.map((height, i) => (
        <Text key={i}>
          {barChars[Math.min(height, barChars.length - 1)]}
        </Text>
      ))}
    </Text>
  );
};
