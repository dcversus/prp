/**
 * ♫ Debug Screen Component
 *
 * Debug mode screen showing full JSON logs and system events
 * with syntax highlighting and detailed event information
 */

import { Box, Text } from 'ink';
import { TUIState, TUIConfig, TerminalLayout } from '../../types/TUIConfig.js';

interface DebugScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}

function getEventColor(source: string, config: TUIConfig): string {
  switch (source) {
    case 'system': return config.colors.accent_orange;
    case 'scanner': return config.colors.robo_devops_sre;
    case 'inspector': return config.colors.robo_system_analyst;
    case 'orchestrator': return config.colors.orchestrator;
    default: return config.colors.base_fg;
  }
}

export function DebugScreen({ state, config, terminalLayout }: DebugScreenProps) {
  const { history, agents, prps } = state;

  return (
    <Box flexDirection="column" width={terminalLayout.columns}>
      <Text color={config.colors.warn} bold>
        ⚠️ DEBUG MODE ⚠️
      </Text>
      <Text color={config.colors.muted}>
        Showing full system events and logs...
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text color={config.colors.accent_orange} bold>
          System Events:
        </Text>
        {history.slice(-10).map((item, index) => (
          <Box key={index} flexDirection="column">
            <Text color={getEventColor(item.source, config)}>
              {item.timestamp} :: {item.source.toUpperCase()}
            </Text>
            <Text color={config.colors.base_fg}>
              {JSON.stringify(item.data, null, 2)}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color={config.colors.accent_orange} bold>
          Active Agents: {agents.size} | PRPs: {prps.size}
        </Text>
      </Box>
    </Box>
  );
}