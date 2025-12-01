/**
 * ♫ Footer Component
 *
 * Bottom status line with tabs, status, and hotkey hints
 * implements the exact format from the PRP specification
 */

import { Box, Text } from 'ink';

import type { FooterProps } from '../../shared/types/TUIConfig';

export const Footer = ({
  currentScreen,
  debugMode: _debugMode,
  agentCount,
  prpCount,
  config,
  terminalLayout,
}: FooterProps) => {
  // Screen tab labels - PRP spec: o|i|a|1..9
  const getScreenTab = (screen: string, isActive: boolean) => {
    const labels: Record<string, string> = {
      orchestrator: 'o',
      info: 'i',
      'prp-context': 'c',
      agent: 'a',
      'token-metrics': 't',
    };

    const label = labels[screen] ?? screen;
    const color = isActive === true
      ? config.colors.accent_orange ?? '#FF9A38'
      : config.colors.muted ?? '#6B7280';
    const bold = isActive;

    return (
      <Text color={color} bold={bold}>
        {label}
      </Text>
    );
  };

  // Render status section - PRP spec format exactly
  const renderStatus = () => {
    const currentPRP = 'prp-agents-v05';
    const currentSignal = '[aA]';
    const statusText = 'preparing stop instructions to agent';

    return (
      <Text color={config.colors.base_fg}>
        {currentPRP} {currentSignal} &quot;{statusText}&quot;
      </Text>
    );
  };

  // Render counters - PRP spec format exactly
  const renderCounters = () => (
    <Text color={config.colors.base_fg}>
      agents {agentCount}+ · prp {prpCount} · ▲1
    </Text>
  );

  return (
    <Box flexDirection="column" width={terminalLayout.columns}>
      {/* Gray delimiter line - matching PRP design exactly */}
      <Box justifyContent="flex-start" marginBottom={1}>
        <Text color={config.colors.muted}>{'─'.repeat(Math.min(terminalLayout.columns, 120))}</Text>
      </Box>

      {/* Status line - matching PRP design exactly */}
      <Box justifyContent="center" marginBottom={1}>
        {renderStatus()}
      </Box>

      {/* Gray delimiter line - matching PRP design exactly */}
      <Box justifyContent="flex-start" marginBottom={1}>
        <Text color={config.colors.muted}>{'─'.repeat(Math.min(terminalLayout.columns, 120))}</Text>
      </Box>

      {/* Navigation and counters line - matching PRP design exactly */}
      <Box justifyContent="space-between" width={terminalLayout.columns}>
        {/* Left side - Tabs matching PRP format: o|i|a|1|2|3| */}
        <Box flexGrow={1}>
          <Text color={config.colors.muted}>Tab - </Text>
          {getScreenTab('orchestrator', currentScreen === 'orchestrator')}
          <Text color={config.colors.muted}>|</Text>
          {getScreenTab('info', currentScreen === 'info')}
          <Text color={config.colors.muted}>|</Text>
          {getScreenTab('agent', currentScreen === 'agent')}
          <Text color={config.colors.muted}>|</Text>
          <Text color={config.colors.muted}>1</Text>
          <Text color={config.colors.muted}>|</Text>
          <Text color={config.colors.muted}>2</Text>
          <Text color={config.colors.muted}>|</Text>
          <Text color={config.colors.muted}>3</Text>
          <Text color={config.colors.muted}> </Text>
          <Text color={config.colors.base_fg}>S - start X - stop D - debug</Text>
          <Text color={config.colors.muted}> </Text>
          {renderCounters()}
        </Box>

        {/* Right side is now part of the single line to match PRP design */}
      </Box>
    </Box>
  );
};
