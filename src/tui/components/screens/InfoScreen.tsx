/**
 * ♫ Info Screen Component
 *
 * 4-section layout screen: PRP context, split view, agent details, and system info
 * Enhanced with PRP-007 signal system integration for real-time PRP signals and filtering
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { RoboRolePill } from '../RoboRolePill.js';
import { SignalBar } from '../SignalBar.js';
import { MusicIcon } from '../MusicIcon.js';
import { getRoleColors } from '../../config/TUIConfig.js';
import { SignalDisplay } from '../SignalDisplay.js';
import { useSignalSubscription } from '../../hooks/useSignalSubscription.js';

interface InfoScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}


interface PRPContextSectionProps {
  prps: Map<string, PRPItem>;
  selectedPRP?: string;
  onSelectPRP: (prpName: string) => void;
  config: TUIConfig;
  isSelected: boolean;
}

const PRPContextSection: React.FC<PRPContextSectionProps> = ({
  prps,
  selectedPRP,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _onSelectPRP,
  config,
  isSelected
}) => {
  const prpArray = Array.from(prps.values()).slice(0, 5);

  return (
    <Box flexDirection="column">
      {prpArray.length === 0 ? (
        <Text color={config.colors.muted}>
          ♪ No PRPs available
        </Text>
      ) : (
        prpArray.map((prp) => {
          const roleColors = prp.role ? getRoleColors(prp.role, config.colors) : null;
          const isFocused = prp.name === selectedPRP;

          return (
            <Box
              key={prp.name}
              flexDirection="column"
              marginBottom={1}
              paddingX={isFocused ? 1 : 0}
              backgroundColor={isFocused ? config.colors.accent_orange_bg : undefined}
            >
              {/* PRP header line */}
              <Box justifyContent="space-between" marginBottom={1}>
                <Text
                  color={isSelected && isFocused ? config.colors.base_fg :
                    prp.status === 'IDLE' ? config.colors.muted :
                      prp.status === 'RUNNING' ? config.colors.base_fg :
                        prp.priority && prp.priority >= 9 ? config.colors.accent_orange :
                          config.colors.base_fg}
                  bold={prp.status === 'RUNNING' || (isSelected && isFocused)}
                >
                  {prp.name}
                </Text>
                <Text color={config.colors.muted}>
                  · {prp.status}
                </Text>
                {roleColors && (
                  <RoboRolePill role={prp.role} state="active" size="small" />
                )}
              </Box>

              {/* PRP scope preview */}
              <Box flexDirection="column" marginBottom={1}>
                <Text color={config.colors.muted} wrap="truncate">
                  {prp.name.includes('bootstrap') && 'Bootstrap workspace and initial configuration'}
                  {prp.name.includes('agents') && 'Agent taxonomy and L4 rules consolidation'}
                  {prp.name.includes('tui') && 'Terminal User Interface implementation'}
                  {prp.name.includes('landing') && 'Landing page and documentation'}
                  {!prp.name.includes('bootstrap') &&
                   !prp.name.includes('agents') &&
                   !prp.name.includes('tui') &&
                   !prp.name.includes('landing') && 'Product requirements and implementation'}
                </Text>
              </Box>

              {/* Signals line */}
              <Box justifyContent="flex-start">
                <SignalBar signals={prp.signals} config={config} />
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};

interface AgentDetailsSectionProps {
  agents: Map<string, AgentCard>;
  selectedAgent?: string;
  onSelectAgent: (agentId: string) => void;
  config: TUIConfig;
  isSelected: boolean;
}

const AgentDetailsSection: React.FC<AgentDetailsSectionProps> = ({
  agents,
  selectedAgent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _onSelectAgent,
  config,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isSelected
}) => {
  const agentArray = Array.from(agents.values()).slice(0, 3);

  return (
    <Box flexDirection="column">
      {agentArray.length === 0 ? (
        <Text color={config.colors.muted}>
          ♪ No agents currently running
        </Text>
      ) : (
        agentArray.map((agent) => {
          const roleColors = getRoleColors(agent.role, config.colors);
          const isFocused = agent.id === selectedAgent;

          return (
            <Box
              key={agent.id}
              flexDirection="column"
              marginBottom={1}
              paddingX={1}
              backgroundColor={isFocused ? (roleColors?.bg || '#000') : undefined}
            >
              {/* Agent header */}
              <Box justifyContent="space-between" marginBottom={1}>
                <Box>
                  <MusicIcon status={agent.status} animate={agent.status === 'RUNNING'} />
                  <Text color={isFocused ? config.colors.base_fg : (roleColors?.active || config.colors.base_fg)} bold>
                    {' '}{agent.prp}#{agent.role}
                  </Text>
                </Box>
                <Text color={config.colors.muted}>
                  {agent.timeLeft} · {agent.progress}%
                </Text>
              </Box>

              {/* Agent task */}
              <Box marginBottom={1}>
                <Text color={isFocused ? config.colors.base_fg : config.colors.muted} wrap="truncate">
                  {agent.task}
                </Text>
              </Box>

              {/* Last output lines */}
              {agent.output.length > 0 && (
                <Box flexDirection="column" marginBottom={1}>
                  {agent.output.slice(-2).map((line, index) => (
                    <Text key={index} color={config.colors.muted} wrap="truncate">
                      last ▸ {line}
                    </Text>
                  ))}
                </Box>
              )}

              {/* Service line */}
              <Box>
                <Text color={config.colors.muted}>
                  svc ▸ tokens={agent.tokens} · active={agent.active}
                </Text>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};

interface SystemInfoSectionProps {
  history: HistoryItem[];
  config: TUIConfig;
  isSelected: boolean;
  allSignals: {
    signals: import('../../types.js').SignalEvent[];
    loading: boolean;
    error: Error | null;
  };
}

const SystemInfoSection: React.FC<SystemInfoSectionProps> = ({
  history,
  config,
  isSelected,
  allSignals
}) => {
  const recentHistory = history.slice(-2);

  return (
    <Box flexDirection="column">
      {/* Signal Activity Summary */}
      {!allSignals.loading && !allSignals.error && allSignals.signals.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={isSelected ? config.colors.accent_orange : config.colors.muted} bold>
            Signal Activity:
          </Text>
          <Box flexDirection="row" flexWrap="wrap" marginLeft={2}>
            {allSignals.signals.slice(-3).map((signal) => (
              <Box key={signal.id} marginRight={1} marginBottom={1}>
                <SignalDisplay
                  signal={signal}
                  compact={true}
                  animated={true}
                  config={config}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Legacy system history */}
      {recentHistory.length === 0 && !allSignals.loading && allSignals.signals.length === 0 ? (
        <Text color={config.colors.muted}>
          ♪ Waiting for system events...
        </Text>
      ) : (
        recentHistory.map((item, index) => (
          <Box key={index} flexDirection="column" marginBottom={1}>
            {/* Source line */}
            <Box>
              <Text color={config.colors.muted}>
                {item.source}
              </Text>
              <Text color={config.colors.muted}>
                {' · '}{item.timestamp}
              </Text>
            </Box>

            {/* Data content */}
            {typeof item.data === 'object' ? (
              <Text color={isSelected ? config.colors.base_fg : config.colors.muted}>
                {JSON.stringify(item.data, null, 0)}
              </Text>
            ) : (
              <Text color={config.colors.muted}>
                {String(item.data)}
              </Text>
            )}
          </Box>
        ))
      )}

      {/* Loading or error state */}
      {allSignals.loading && (
        <Text color={config.colors.muted} italic>
          Loading signals...
        </Text>
      )}

      {allSignals.error && (
        <Text color={config.colors.error}>
          Signal error: {allSignals.error.message}
        </Text>
      )}
    </Box>
  );
};

export function InfoScreen({ state, config, terminalLayout }: InfoScreenProps) {
  const [focusedSection, setFocusedSection] = useState(0);
  const [selectedPRP, setSelectedPRP] = useState<string>();
  const [selectedAgent, setSelectedAgent] = useState<string>();

  const sections = ['PRP Context', 'Agent Details', 'System Info'];
  const sectionWidth = Math.floor((terminalLayout.columns - 8) / 3); // Account for padding and borders

  // Subscribe to all signals for the InfoScreen
  const allSignals = useSignalSubscription(undefined, {
    types: ['agent', 'system', 'scanner', 'inspector', 'orchestrator']
  }, {
    historySize: 30,
    debounceDelay: 150
  });

  
  // Handle keyboard input for section navigation
  useInput((input, key) => {
    if (key.tab) {
      // Tab navigation handled at app level
      return;
    }

    switch (input) {
      case 'h':
      case 'H':
      case 'left':
        setFocusedSection(prev => Math.max(0, prev - 1));
        break;
      case 'l':
      case 'L':
      case 'right':
        setFocusedSection(prev => Math.min(2, prev + 1));
        break;
      case '1':
        setFocusedSection(0);
        break;
      case '2':
        setFocusedSection(1);
        break;
      case '3':
        setFocusedSection(2);
        break;
      case 'enter':
        // Handle selection in focused section
        if (focusedSection === 0 && selectedPRP) {
          // Could navigate to PRP details
          // TODO: Implement PRP navigation
        } else if (focusedSection === 1 && selectedAgent) {
          // Could navigate to agent details
          // TODO: Implement agent navigation
        }
        break;
      case 'up':
        if (focusedSection === 0) {
          // Navigate PRPs up
          const prpNames = Array.from(state.prps.keys());
          const currentIndex = selectedPRP ? prpNames.indexOf(selectedPRP) : -1;
          if (currentIndex > 0) {
            setSelectedPRP(prpNames[currentIndex - 1]);
          }
        } else if (focusedSection === 1) {
          // Navigate agents up
          const agentIds = Array.from(state.agents.keys());
          const currentIndex = selectedAgent ? agentIds.indexOf(selectedAgent) : -1;
          if (currentIndex > 0) {
            setSelectedAgent(agentIds[currentIndex - 1]);
          }
        }
        break;
      case 'down':
        if (focusedSection === 0) {
          // Navigate PRPs down
          const prpNames = Array.from(state.prps.keys());
          const currentIndex = selectedPRP ? prpNames.indexOf(selectedPRP) : -1;
          if (currentIndex < prpNames.length - 1) {
            setSelectedPRP(prpNames[currentIndex + 1]);
          }
        } else if (focusedSection === 1) {
          // Navigate agents down
          const agentIds = Array.from(state.agents.keys());
          const currentIndex = selectedAgent ? agentIds.indexOf(selectedAgent) : -1;
          if (currentIndex < agentIds.length - 1) {
            setSelectedAgent(agentIds[currentIndex + 1]);
          }
        }
        break;
    }
  });

  // Auto-select first items if not selected
  React.useEffect(() => {
    if (!selectedPRP && state.prps.size > 0) {
      setSelectedPRP(Array.from(state.prps.keys())[0]);
    }
    if (!selectedAgent && state.agents.size > 0) {
      setSelectedAgent(Array.from(state.agents.keys())[0]);
    }
  }, [state.prps, state.agents, selectedPRP, selectedAgent]);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={config.colors.accent_orange} bold>
          ♫ @dcversus/prp - System Overview
        </Text>
        <Text color={config.colors.muted}>
          ⧗ {new Date().toLocaleString()}
        </Text>
      </Box>

      <Text color={config.colors.muted}>
        ─────────────────────────────────────────────────────────────────
      </Text>

      {/* Main content - 3 column layout */}
      <Box flexDirection="row" marginBottom={1}>
        {/* PRP Context Section */}
        <Box width={sectionWidth}>
          <PRPContextSection
            prps={state.prps}
            selectedPRP={selectedPRP}
            onSelectPRP={setSelectedPRP}
            config={config}
            isSelected={focusedSection === 0}
          />
        </Box>

        {/* Agent Details Section */}
        <Box width={sectionWidth}>
          <AgentDetailsSection
            agents={state.agents}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            config={config}
          />
        </Box>

        {/* System Info Section */}
        <Box width={sectionWidth}>
          <SystemInfoSection
            history={state.history}
            config={config}
            isSelected={focusedSection === 2}
            allSignals={{
              signals: allSignals.signals,
              loading: allSignals.loading,
              error: allSignals.error
            }}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Text color={config.colors.muted}>
        ─────────────────────────────────────────────────────────────────
      </Text>
      <Text color={config.colors.muted}>
        Navigation: [←→] or [1-3] sections | [↑↓] navigate items | [Enter] select | [Tab] switch screens
      </Text>
      <Box justifyContent="space-between">
        <Text color={config.colors.muted}>
          Focused: {sections[focusedSection]}
        </Text>
        <Text color={config.colors.muted}>
          agents {state.agents.size} · prp {state.prps.size} · history {state.history.length}
        </Text>
      </Box>
    </Box>
  );
}