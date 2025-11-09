/**
 * ♫ PRP Context Screen Component
 *
 * PRP and Context information screen with signal history
 * and split view for Claude Code integration
 */

import { Box, Text } from 'ink';
import { TUIState, TUIConfig, TerminalLayout } from '../../types/TUIConfig.js';

interface PRPContextScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}

export function PRPContextScreen({ state, config, terminalLayout }: PRPContextScreenProps) {
  const { prps } = state;

  return (
    <Box flexDirection="column" width={terminalLayout.columns}>
      <Text color={config.colors.accent_orange} bold>
        PRP & Context Screen
      </Text>
      <Text color={config.colors.muted}>
        (This screen will display PRP details, signal history, and context information)
      </Text>
      <Box marginTop={1}>
        <Text color={config.colors.base_fg}>
          Available PRPs: {Array.from(prps.keys()).join(', ')}
        </Text>
      </Box>
    </Box>
  );
}