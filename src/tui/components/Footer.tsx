/**
 * ♫ Footer Component
 *
 * Bottom status line with tabs, status, and hotkey hints
 * implements the exact format from the PRP specification
 */

import { Box, Text } from 'ink';
import type { FooterProps } from '../../shared/types/TUIConfig.js';

export function Footer({
  currentScreen,
  debugMode,
  agentCount,
  prpCount,
  config,
  terminalLayout
}: FooterProps) {
  // Screen tab labels - PRP spec: o|i|a|1..9
  const getScreenTab = (screen: string, isActive: boolean) => {
    const labels: Record<string, string> = {
      orchestrator: 'o',
      info: 'i',
      'prp-context': 'c',
      agent: 'a',
      'token-metrics': 't'
    };

    const label = labels[screen] ?? screen;
    const color = isActive ? (config.colors.accent_orange || '#FF9A38') : (config.colors.muted || '#6B7280');
    const bold = isActive;

    return (
      <Text color={color} bold={bold}>
        {label}
      </Text>
    );
  };

  // Render hotkey hints - PRP spec format
  const renderHotkeys = () => {
    if (debugMode) {
      return (
        <Text color={config.colors.warn || '#F59E0B'}>
          ⚠️ debug ⚠️
        </Text>
      );
    }

    // PRP spec: S - start, X - stop, D - debug
    return (
      <Text color={config.colors.base_fg || '#F3F4F6'}>
        S - start    X - stop    D - debug
      </Text>
    );
  };

  // Render status section - PRP spec format
  const renderStatus = () => {
    // This would come from actual state in a real implementation
    const currentPRP = 'prp-agents05';
    const currentSignal = '[aA]';
    const statusText = 'preparing stop instructions to agent';

    return (
      <Text color={config.colors.accent_orange || '#FF9A38'}>
        {currentPRP} {currentSignal}  "{statusText}"
      </Text>
    );
  };

  // Render counters - PRP spec format
  const renderCounters = () => (
    <Text color={config.colors.base_fg || '#F3F4F6'}>
      agents {agentCount}+ · prp {prpCount} · ▲1
    </Text>
  );

  return (
    <Box flexDirection="column" width={terminalLayout.columns}>
      {/* Top delimiter line */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color={config.colors.muted || '#6B7280'}>
          {'─'.repeat(terminalLayout.columns)}
        </Text>
      </Box>

      {/* Main footer content */}
      <Box justifyContent="space-between" width={terminalLayout.columns}>
        {/* Left side - Tabs */}
        <Box>
          <Text color={config.colors.muted || '#6B7280'}>
            Tab - {' '}
          </Text>
          {getScreenTab('orchestrator', currentScreen === 'orchestrator')}
          <Text color={config.colors.muted || '#6B7280'}>
            {' | '}
          </Text>
          {getScreenTab('info', currentScreen === 'info')}
          <Text color={config.colors.muted || '#6B7280'}>
            {' | '}
          </Text>
          {getScreenTab('agent', currentScreen === 'agent')}
          <Text color={config.colors.muted || '#6B7280'}>
            {' | '}
          </Text>
          {getScreenTab('token-metrics', currentScreen === 'token-metrics')}
          <Text color={config.colors.muted || '#6B7280'}>
            {'    '}
          </Text>
        </Box>

        {/* Middle - Status */}
        <Box flexGrow={1} justifyContent="center">
          {renderStatus()}
        </Box>

        {/* Right side - Hotkeys and counters */}
        <Box flexDirection="column" alignItems="flex-end">
          {renderHotkeys()}
          <Text color={config.colors.muted || '#6B7280'}>
            {renderCounters()}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}