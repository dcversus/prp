/**
 * ♫ Footer Component
 *
 * Bottom status line with tabs, status, and hotkey hints
 * implements the exact format from the PRP specification
 */

import React from 'react';
import { Box, Text } from 'ink';
import { FooterProps } from '../types/TUIConfig.js';

export function Footer({
  currentScreen,
  debugMode,
  agentCount,
  prpCount,
  config,
  terminalLayout
}: FooterProps) {
  // Screen tab labels
  const getScreenTab = (screen: string, isActive: boolean) => {
    const labels: Record<string, string> = {
      orchestrator: 'o',
      'prp-context': 'i',
      agent: 'a',
      'token-metrics': '4'
    };

    const label = labels[screen] || screen;
    const color = isActive ? config.colors.accent_orange : config.colors.muted;
    const bold = isActive;

    return (
      <Text color={color} bold={bold}>
        {label}
      </Text>
    );
  };

  // Render hotkey hints
  const renderHotkeys = () => {
    const hotkeys = ['Tab', 'S', 'X', 'D'];
    if (debugMode) {
      return (
        <Text color={config.colors.warn}>
          ⚠️ debug ⚠️
        </Text>
      );
    }

    return (
      <>
        {hotkeys.map((key, index) => (
          <Text key={index} color={config.colors.base_fg}>
            {index > 0 && ' '}
            {key}
            {index < hotkeys.length - 1 && ' -'}
          </Text>
        ))}
      </>
    );
  };

  // Render status section
  const renderStatus = () => {
    const currentSignal = '[PR]'; // This would come from state
    const statusText = '"allocating agent"';

    return (
      <Text color={config.colors.accent_orange}>
        [signal: {currentSignal}]  {statusText}
      </Text>
    );
  };

  // Render counters
  const renderCounters = () => (
    <Text color={config.colors.base_fg}>
      agents {agentCount} · prp {prpCount} · ▲0
    </Text>
  );

  return (
    <Box justifyContent="space-between" width={terminalLayout.columns}>
      {/* Left side - Tabs and hotkeys */}
      <Box>
        {/* Screen tabs */}
        <Text color={config.colors.muted}>
          Tab{' '}
        </Text>
        {getScreenTab('orchestrator', currentScreen === 'orchestrator')}
        <Text color={config.colors.muted}>
          {' | '}
        </Text>
        {getScreenTab('prp-context', currentScreen === 'prp-context')}
        <Text color={config.colors.muted}>
          {' | '}
        </Text>
        {getScreenTab('agent', currentScreen === 'agent')}
        <Text color={config.colors.muted}>
          {' | '}
        </Text>
        {getScreenTab('token-metrics', currentScreen === 'token-metrics')}
        <Text color={config.colors.muted}>
          {'    '}
        </Text>

        {/* Hotkeys */}
        {renderHotkeys()}
        <Text color={config.colors.muted}>
          {'    '}
        </Text>

        {/* Debug indicator */}
        {debugMode && (
          <>
            <Text color={config.colors.warn}>
              ⚠️ debug ⚠️
            </Text>
            <Text color={config.colors.muted}>
              {'     '}
            </Text>
          </>
        )}
      </Box>

      {/* Middle - Status */}
      <Box flexGrow={1} justifyContent="center">
        {renderStatus()}
      </Box>

      {/* Right side - Counters */}
      {renderCounters()}
    </Box>
  );
}