/**
 * ♫ Agent Screen Component
 *
 * Fullscreen agent view with Claude Code-style interface
 * showing detailed agent output and tool calls
 */

import { Box, Text } from 'ink';
import { TUIState, TUIConfig, TerminalLayout } from '../../types/TUIConfig.js';

interface AgentScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}

export function AgentScreen({ state, config, terminalLayout }: AgentScreenProps) {
  const { agents } = state;
  const agentArray = Array.from(agents.values());

  return (
    <Box flexDirection="column" width={terminalLayout.columns}>
      <Text color={config.colors.accent_orange} bold>
        Agent Fullscreen Screen
      </Text>
      <Text color={config.colors.muted}>
        (This screen will display detailed agent output in Claude Code style)
      </Text>
      {agentArray.length > 0 && (
        <Box marginTop={1}>
          <Text color={config.colors.base_fg}>
            Active Agents: {agentArray.map(a => a.id).join(', ')}
          </Text>
        </Box>
      )}
    </Box>
  );
}