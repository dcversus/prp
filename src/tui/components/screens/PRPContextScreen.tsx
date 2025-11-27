/**
 * ♫ PRP Context Screen Component
 *
 * PRP and Context information screen with signal history
 * and split view for Claude Code integration implementing
 * the exact layout from the PRP specification
 */

import React, { useState, JSX } from 'react';
import { Box, Text, useInput } from 'ink';

import { SignalBar } from '../SignalBar';
import { RoboRolePill } from '../RoboRolePill';
import { MusicIcon } from '../MusicIcon';
import { getRoleColors } from '../../config/TUIConfig';

import type { TUIConfig, PRPItem } from '../../../shared/types/TUIConfig';
import type { TUIState, TerminalLayout } from '../../../shared/types/TUIState';

interface PRPContextScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
};

// Mock context data generation
const generateMockContext = (prpName: string): string[] => {
  const contexts: Record<string, string[]> = {
    'prp-agents-v05': [
      `${prpName}`,
      '- scope: consolidate agent taxonomy and L4 rules',
      '- goals: unify robo-roles, add AQA cross-link pass',
      '- constraints: per-role token budgets, streaming CoT',
      '```diff',
      '+ Added: AQA pass for cross-links',
      '- Removed: legacy robo naming',
      '',
      '… implementation details …',
    ],
    'prp-landing': [
      `${prpName}`,
      '- scope: create professional landing page',
      '- goals: showcase @dcversus/prp capabilities',
      '- constraints: responsive design, fast loading',
      '```diff',
      '+ Added: hero section with animation',
      '+ Added: feature showcase',
      '- Removed: placeholder content',
      '',
      '… design implementation …',
    ],
    default: [
      `${prpName}`,
      '- scope: product requirement implementation',
      '- goals: deliver MVP functionality',
      '- constraints: time and budget limitations',
      '```diff',
      '+ Added: core features',
      '+ Updated: documentation',
      '- Fixed: critical bugs',
      '',
      '… progress continues …',
    ],
  };

  return contexts[prpName] || contexts['default'];
};

// Mock split Claude Code instances
const generateMockInstances = (prp: PRPItem) => {
  const baseInstances = [
    {
      role: 'AQA',
      icon: '♬' as const,
      lastAction: 'parsing toc…',
      tokens: '9.2k',
      active: '00:00:51',
      queries: 1,
    },
    {
      role: 'DEV',
      icon: '♪' as const,
      lastAction: 'building sections…',
      tokens: '3.1k',
      active: '00:00:14',
      queries: 0,
    },
    {
      role: 'SYS',
      icon: '♫' as const,
      lastAction: 'role map…',
      tokens: '2.7k',
      active: '00:00:09',
      queries: 0,
    },
  ];

  return baseInstances.map((instance) => ({
    ...instance,
    roleColor: instance.role === 'AQA' ? 'purple' : instance.role === 'DEV' ? 'blue' : 'orange',
  }));
};

export const PRPContextScreen = ({ state, config, terminalLayout }: PRPContextScreenProps) => {
  const [selectedPRP, setSelectedPRP] = useState<string>('');
  const [expandedContext, setExpandedContext] = useState(false);

  const { prps, agents, history } = state;
  const prpArray = Array.from(prps.values());

  // Auto-select first PRP if available
  React.useEffect(() => {
    if (prpArray.length > 0 && !selectedPRP) {
      setSelectedPRP(prpArray[0].name);
    }
  }, [prpArray, selectedPRP]);

  const selectedPRPData = prps.get(selectedPRP);
  const mockContext = selectedPRP ? generateMockContext(selectedPRP) : [];
  const mockInstances = selectedPRPData ? generateMockInstances(selectedPRPData) : [];

  // Calculate column widths for split view
  const leftColumnWidth = Math.floor(terminalLayout.columns * 0.35);
  const middleColumnWidth = Math.floor(terminalLayout.columns * 0.35);
  const rightColumnWidth = terminalLayout.columns - leftColumnWidth - middleColumnWidth - 6; // Account for padding

  // Handle keyboard navigation
  useInput((input, key) => {
    switch (input) {
      case 'left':
        if (prpArray.length > 0) {
          const currentIndex = selectedPRP ? prpArray.findIndex((p) => p.name === selectedPRP) : 0;
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : prpArray.length - 1;
          setSelectedPRP(prpArray[prevIndex].name);
        }
        break;
      case 'right':
        if (prpArray.length > 0) {
          const currentIndex = selectedPRP ? prpArray.findIndex((p) => p.name === selectedPRP) : 0;
          const nextIndex = currentIndex < prpArray.length - 1 ? currentIndex + 1 : 0;
          setSelectedPRP(prpArray[nextIndex].name);
        }
        break;
      case 'd':
      case 'D':
        setExpandedContext(!expandedContext);
        break;
      case 'up':
        // Navigate history up (could be implemented)
        break;
      case 'down':
        // Navigate history down (could be implemented)
        break;
      case 'enter':
        // Handle selection (could expand details)
        break;
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} width={terminalLayout.columns}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={config.colors.accent_orange} bold>
          ♫ @dcversus/prp - Context & Split View
        </Text>
        <Text color={config.colors.muted}>⧗ {new Date().toLocaleString()}</Text>
      </Box>

      <Text color={config.colors.muted}>
        ─────────────────────────────────────────────────────────────────
      </Text>

      {/* Main content - 3 column split view */}
      <Box flexDirection="row" marginBottom={1}>
        {/* Left Column - PRP & Signals History */}
        <Box flexDirection="column" width={leftColumnWidth} marginRight={2}>
          <Text color={config.colors.base_fg as string} bold marginBottom={1}>
            A) PRP + SIGNALS HISTORY
          </Text>

          {selectedPRPData ? (
            <Box flexDirection="column">
              {/* PRP header */}
              <Box marginBottom={1}>
                <Text color={config.colors.base_fg}>▸ {selectedPRPData.name}</Text>
                {selectedPRPData.role && (
                  <Box>
                    <Text color={config.colors.muted}> · {selectedPRPData.status}</Text>
                    <RoboRolePill role={selectedPRPData.role} state="active" size="small" />
                  </Box>
                )}
              </Box>

              {/* Signals line */}
              <Box marginBottom={1}>
                <SignalBar signals={selectedPRPData.signals} config={config} />
              </Box>

              {/* History items */}
              <Box flexDirection="column">
                {history
                  .filter(
                    (item: any) =>
                      item.source === 'system' ||
                      item.source === 'scanner' ||
                      item.source === 'inspector',
                  )
                  .slice(-3)
                  .map((item: any, index: number) => (
                    <Box key={index} flexDirection="column" marginBottom={1}>
                      <Box>
                        <Text color={config.colors.muted}>{item.timestamp}</Text>
                        <Text color={config.colors.muted}>
                          {' · '}
                          {item.source}
                        </Text>
                      </Box>
                      <Text color={config.colors.muted} wrap="truncate">
                        {typeof item.data === 'object' && item.data !== null
                          ? `${JSON.stringify(item.data).substring(0, 50)  }...`
                          : `${String(item.data).substring(0, 50)  }...`}
                      </Text>
                    </Box>
                  ))}
              </Box>

              {/* Additional PRPs */}
              {prpArray.slice(1, 3).map((prp, index) => (
                <Box key={prp.name} flexDirection="column" marginTop={1}>
                  <Text color={config.colors.muted}>
                    ▹ {prp.name} · {prp.status}
                  </Text>
                  <SignalBar signals={prp.signals} config={config} />
                </Box>
              ))}
            </Box>
          ) : (
            <Text color={config.colors.muted}>♪ No PRP selected</Text>
          )}
        </Box>

        {/* Middle Column - Context */}
        <Box flexDirection="column" width={middleColumnWidth} marginRight={2}>
          <Box justifyContent="space-between" marginBottom={1}>
            <Text color={config.colors.base_fg} bold>
              B) CONTEXT
            </Text>
            <Text color={config.colors.muted}>
              (markdown ≤10k; {expandedContext ? 'full' : 'compact'}; D=full)
            </Text>
          </Box>

          {selectedPRP ? (
            <Box flexDirection="column">
              {expandedContext ? (
                // Full context view
                mockContext.map((line, index) => (
                  <Text key={index} color={config.colors.base_fg}>
                    {line}
                  </Text>
                ))
              ) : (
                // Compact context view
                <>
                  <Text color={config.colors.base_fg}>{selectedPRP}</Text>
                  <Text color={config.colors.muted}>
                    - scope:{' '}
                    {selectedPRP.includes('bootstrap')
                      ? 'workspace setup'
                      : selectedPRP.includes('agents')
                        ? 'agent consolidation'
                        : selectedPRP.includes('tui')
                          ? 'terminal interface'
                          : 'product implementation'}
                  </Text>
                  <Text color={config.colors.muted}>
                    - goals:{' '}
                    {selectedPRP.includes('bootstrap')
                      ? 'initialize project'
                      : selectedPRP.includes('agents')
                        ? 'unify taxonomy'
                        : selectedPRP.includes('tui')
                          ? 'build TUI'
                          : 'deliver MVP'}
                  </Text>
                  <Text color={config.colors.muted} wrap="truncate">
                    {mockContext.slice(3, 6).join(' ')}
                  </Text>
                </>
              )}
            </Box>
          ) : (
            <Text color={config.colors.muted}>Select a PRP to view context</Text>
          )}
        </Box>

        {/* Right Column - Split Claude Code Instances */}
        <Box flexDirection="column" width={rightColumnWidth}>
          <Text color={config.colors.base_fg as string} bold marginBottom={1}>
            C) SPLIT CLAUDE CODE (instances)
          </Text>

          {mockInstances.length > 0 ? (
            <Box flexDirection="column">
              {mockInstances.map((instance, index) => (
                <Box key={index} flexDirection="column" marginBottom={1}>
                  <Box>
                    <MusicIcon status="RUNNING" animate={true} />
                    <Text color={instance.roleColor}> {instance.role}</Text>
                    <Text color={config.colors.muted}> last ▸ {instance.lastAction}</Text>
                  </Box>
                  <Text color={config.colors.muted}>
                    svc ▸ {instance.tokens} tok · {instance.active} · q {instance.queries}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : (
            <Text color={config.colors.muted}>♪ No Claude Code instances</Text>
          )}
        </Box>
      </Box>

      <Text color={config.colors.muted}>
        ─────────────────────────────────────────────────────────────────
      </Text>

      {/* Footer */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={config.colors.muted}>Tab ↑ ↓ Enter</Text>
          <Text color={config.colors.muted}>{'    '}</Text>
        </Box>

        <Text color={config.colors.muted}>
          {selectedPRP ? (
            <>
              [signal: PR] "processing context" agents {agents.size} · prp {prps.size} · ▲0
            </>
          ) : (
            <>
              idle · agents {agents.size} · prp {prps.size} · ▲0
            </>
          )}
        </Text>
      </Box>

      {/* Navigation hints */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={config.colors.muted}>
          Navigation: [Tab] screens | [←→] select PRP | [↑↓] history | [Enter] details | [D] toggle
          full context
        </Text>
      </Box>
    </Box>
  );
};
