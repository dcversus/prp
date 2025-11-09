/**
 * ♫ AgentCard Component
 *
 * Displays agent status with music icon, role pill, and real-time output
 * implements the exact format from the PRP specification
 */

import { Box, Text } from 'ink';
import { AgentCard as AgentCardType, TUIConfig } from '../types/TUIConfig.js';
import { MusicIcon } from './MusicIcon.js';
import { getRoleColors } from '../config/TUIConfig.js';

interface AgentCardProps {
  agent: AgentCardType;
  config: TUIConfig;
  maxWidth: number;
}

export function AgentCard({ agent, config }: AgentCardProps) {
  const roleColors = getRoleColors(agent.role, config.colors);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Main agent line */}
      <Box>
        <MusicIcon status={agent.status} animate={true} />
        <Text color={config.colors.base_fg}>
          {' '}{agent.status}{' '}
        </Text>
        <Text color={config.colors.base_fg}>
          {agent.prp}#
        </Text>
        <Text color={roleColors.active} backgroundColor={roleColors.bg}>
          {agent.role}
        </Text>
        <Text color={config.colors.base_fg}>
          {' — '}{agent.task}{' — '}{agent.timeLeft}{' — '}{agent.progress}%
        </Text>
      </Box>

      {/* Output lines */}
      {agent.output.map((line, index) => (
        <Box key={index}>
          <Text color={config.colors.muted}>
            last ▸{' '}
          </Text>
          <Text color={config.colors.base_fg}>
            {line}
          </Text>
        </Box>
      ))}

      {/* Service line */}
      <Box>
        <Text color={config.colors.muted}>
          svc ▸{' '}
        </Text>
        <Text color={config.colors.muted}>
          tokens={agent.tokens} · active={agent.active}
        </Text>
      </Box>
    </Box>
  );
}