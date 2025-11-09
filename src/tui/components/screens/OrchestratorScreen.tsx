/**
 * ♫ Orchestrator Screen Component
 *
 * Main orchestrator screen with agent cards, history, and PRP list
 * implementing the exact layout from the PRP specification
 */

import { Box, Text, useInput } from 'ink';
import { TUIState, TUIConfig, TerminalLayout, ColorScheme } from '../../types/TUIConfig.js';
import { SignalBar } from '../SignalBar.js';
import { AgentCard } from '../AgentCard.js';
import { HistoryItem } from '../HistoryItem.js';
import { getRoleColors } from '../../config/TUIConfig.js';

interface OrchestratorScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}

export function OrchestratorScreen({ state, config, terminalLayout }: OrchestratorScreenProps) {
  const { agents, prps, history, orchestrator } = state;

  // Handle keyboard input specific to this screen
  useInput((input, key) => {
    if (key.tab) {
      // Tab navigation is handled at the app level
      return;
    }

    // Screen-specific shortcuts
    switch (input) {
      case 's':
      case 'S':
        // Start agent on selected PRP (if any)
        break;
      case 'x':
      case 'X':
        // Stop selected agent (if any)
        break;
      case '1':
      case '2':
      case '3':
        // Switch to specific screen
        break;
    }
  });

  // Calculate layout dimensions
  const { columns, layoutMode } = terminalLayout;
  const rightPanelWidth = layoutMode === 'compact' ? 0 : 35;
  const mainContentWidth = columns - rightPanelWidth;
  
  // Header with logo and status
  const renderHeader = () => (
    <Box flexDirection="column" marginBottom={1}>
      <Box justifyContent="space-between">
        <Text color={config.colors.accent_orange} bold>
          ♫ @dcversus/prp
        </Text>
        <Text color={config.colors.muted}>
          ⧗ {new Date().toLocaleString()}
        </Text>
      </Box>
      <Box justifyContent="flex-start">
        <Text color={config.colors.base_fg}>
          ⌁ {process.cwd()}
        </Text>
      </Box>
    </Box>
  );

  // History section (system/scanner/inspector messages)
  const renderHistory = () => (
    <Box flexDirection="column" marginBottom={1}>
      {history.slice(-5).map((item, index) => (
        <HistoryItem key={index} item={item} config={config} />
      ))}
    </Box>
  );

  // Agent cards section
  const renderAgents = () => {
    const agentArray = Array.from(agents.values());

    if (agentArray.length === 0) {
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={config.colors.muted}>
            ♪ No agents currently running
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginBottom={1}>
        {agentArray.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            config={config}
            maxWidth={mainContentWidth}
          />
        ))}
      </Box>
    );
  };

  // Orchestrator block
  const renderOrchestrator = () => {
    if (!orchestrator) {
      return null;
    }

    const orchestratorColors = getRoleColors('orchestrator', config.colors);

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={orchestratorColors.bg} backgroundColor={orchestratorColors.bg}>
            {' '}
          </Text>
          <Text color={orchestratorColors.active} bold>
            {' '}Orchestrator · {orchestrator.status}{' '}
          </Text>
          <Text color={orchestratorColors.bg} backgroundColor={orchestratorColors.bg}>
            {' '}
          </Text>
          <Text color={config.colors.base_fg}>
            {' '}{orchestrator.prp} [end]{' '}
          </Text>
          <SignalBar signals={orchestrator.signals} config={config as TUIConfig & ColorScheme} />
        </Box>

        {orchestrator.cotLines.map((line, index) => (
          <Box key={index}>
            <Text color={config.colors.accent_orange}>
              •{' '}
            </Text>
            <Text color={config.colors.base_fg}>
              {line}
            </Text>
          </Box>
        ))}

        <Box>
          <Text color={config.colors.accent_orange}>
            ⇢{' '}
          </Text>
          <Text color={config.colors.muted}>
            {orchestrator.toolCall}
          </Text>
        </Box>
      </Box>
    );
  };

  // Right panel with PRP list
  const renderPRPList = () => {
    if (layoutMode === 'compact') {
      return null; // No right panel in compact mode
    }

    const prpArray = Array.from(prps.values());

    return (
      <Box flexDirection="column" paddingLeft={2}>
        {prpArray.map((prp) => {
          const roleColors = prp.role ? getRoleColors(prp.role, config.colors) : null;

          return (
            <Box key={prp.name} flexDirection="column" marginBottom={1}>
              {/* PRP header line */}
              <Box justifyContent="flex-end">
                <Text color={prp.status === 'IDLE' ? config.colors.muted :
                           prp.status === 'RUNNING' ? config.colors.base_fg :
                           prp.priority && prp.priority >= 9 ? config.colors.accent_orange :
                           config.colors.base_fg}
                      bold={prp.status === 'RUNNING'}>
                  {prp.name}
                </Text>
                <Text color={config.colors.muted}>
                  {' '}· {prp.status}
                </Text>
                {roleColors && (
                  <>
                    <Text color={roleColors.bg} backgroundColor={roleColors.bg}>
                      {' '}
                    </Text>
                    <Text color={roleColors.active} backgroundColor={roleColors.bg}>
                      {prp.role}
                    </Text>
                    <Text color={roleColors.bg} backgroundColor={roleColors.bg}>
                      {' '}
                    </Text>
                  </>
                )}
              </Box>

              {/* Signals line */}
              <Box justifyContent="flex-end">
                <SignalBar signals={prp.signals} config={config as TUIConfig & ColorScheme} />
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box flexDirection="row" width={columns}>
      {/* Main content area */}
      <Box flexDirection="column" width={mainContentWidth}>
        {renderHeader()}
        {renderHistory()}
        {renderAgents()}
        {renderOrchestrator()}
      </Box>

      {/* Right panel - PRP list */}
      {renderPRPList()}
    </Box>
  );
}