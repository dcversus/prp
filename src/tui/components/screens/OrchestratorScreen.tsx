/**
 * ♫ Orchestrator Screen Component
 *
 * Main orchestrator screen with agent cards, history, and PRP list
 * Enhanced with PRP-007 signal system integration for real-time orchestration signals
 */

import { Box, Text, useInput } from 'ink';

import { SignalBar } from '../SignalBar';
import { getRoleColors } from '../../../shared/types/TUIConfig';
import { SignalDisplay } from '../SignalDisplay';
import { useSignalSubscription } from '../../hooks/useSignalSubscription';
import {
  SignalTypeEnum,
  SignalSourceEnum,
  SignalCodeEnum
} from '../../../types';

import type { TUIState, TUIConfig, TerminalLayout } from '../../../shared/types/TUIConfig';

interface OrchestratorScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
};

export const OrchestratorScreen = ({ state, config, terminalLayout }: OrchestratorScreenProps) => {
  const { agents, prps, history } = state;

  // Subscribe to orchestration-specific signals
  const orchestrationSignals = useSignalSubscription(
    undefined,
    {
      types: [SignalTypeEnum.ORCHESTRATOR, SignalTypeEnum.AGENT],
      sources: [SignalSourceEnum.ORCHESTRATOR, SignalSourceEnum.ROBO_SYSTEM_ANALYST],
    },
    {
      historySize: 100,
      debounceDelay: 100,
    },
  );

  // Filter orchestration signals for display
  const relevantOrchestrationSignals = orchestrationSignals.signals.filter(
    (signal) =>
      signal.signal === SignalCodeEnum.ORCHESTRATOR_ATTENTION || // Orchestrator Attention
      signal.signal === SignalCodeEnum.PARALLEL_COORDINATION_NEEDED || // Parallel Coordination
      signal.signal === SignalCodeEnum.FILE_OWNERSHIP_CONFLICT || // File Ownership
      signal.signal === SignalCodeEnum.READY_FOR_PREPARATION || // Ready for Preparation
      signal.signal === SignalCodeEnum.IMPLEMENTATION_PLAN || // Implementation Plan
      signal.signal === SignalCodeEnum.DEVELOPMENT_PROGRESS || // Development Progress
      signal.signal === SignalCodeEnum.BLOCKER_RESOLVED || // Blocker Resolved
      signal.signal === SignalCodeEnum.MERGED || // Merged
      signal.signal === SignalCodeEnum.RELEASED, // Released
  );

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

  // Calculate layout dimensions - matching PRP design exactly
  const { columns, layoutMode } = terminalLayout;
  const rightPanelWidth = layoutMode === 'compact' ? 0 : Math.min(50, Math.floor(columns * 0.4)); // Responsive sidebar width
  const mainContentWidth = columns - rightPanelWidth - (rightPanelWidth > 0 ? 3 : 0); // Add spacing only when sidebar exists

  // Fallback to full width on very small screens
  const useFullWidth = columns < 80 || (layoutMode === 'compact' && columns < 100);

  // Header with logo and status - matching PRP design exactly
  const renderHeader = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    return (
      <Box flexDirection="column" marginBottom={1}>
        {/* Line 1: HF ⧗ timestamp */}
        <Box justifyContent="flex-start">
          <Text color={config.colors.accent_orange} bold>
            HF ⧗ {timestamp}
          </Text>
        </Box>

        {/* Line 2: ♫ @dcversus/prp */}
        <Box justifyContent="flex-start">
          <Text color={config.colors.base_fg} bold>
            ♫ @dcversus/prp
          </Text>
        </Box>

        {/* Line 3: ⌁ /path/to/project */}
        <Box justifyContent="flex-start">
          <Text color={config.colors.base_fg}>⌁ /Users/dcversus/Documents/GitHub/prp</Text>
        </Box>
      </Box>
    );
  };

  // Generate current timestamp for system logs
  const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
  };

  // History section (system/scanner/inspector messages) - matching PRP design format exactly
  const renderHistory = () => (
    <Box flexDirection="column" marginBottom={1}>
      {/* System startup message */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={config.colors.muted}>system · {getCurrentTimestamp()}</Text>
        <Text color={config.colors.base_fg}>
          {'{'} startup: true, prpCount: {prps.size}, readyToSpawn: true {'}'}
        </Text>
      </Box>

      {/* Scanner message */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={config.colors.muted}>scanner · {getCurrentTimestamp()}</Text>
        <Text color={config.colors.base_fg}>
          {'{'} detected: [fs-change,new-branch,secrets-ref], count: 3 {'}'}
        </Text>
      </Box>

      {/* Inspector message */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={config.colors.muted}>inspector · {getCurrentTimestamp()}</Text>
        <Text color={config.colors.base_fg}>
          {'{'} impact: high, risk: 8, files: [PRPs/agents-v05.md,PRPs/…], why: cross-links missing{' '}
          {'}'}
        </Text>
      </Box>

      {/* Interactive prompt - matching PRP design exactly */}
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" justifyContent="flex-start">
          <Text color={config.colors.base_fg}>{'> '}</Text>
          <Text color={config.colors.base_fg}>Analyse whats status</Text>
        </Box>

        <Box flexDirection="row" justifyContent="flex-start">
          <Text color={config.colors.base_fg}>{'  '}</Text>
          <Text color={config.colors.base_fg}>♪ · i need some time, please wait... {'<3'}</Text>
        </Box>
      </Box>

      {/* Additional history items - matching PRP format */}
      {history.slice(-2).map((item, index) => (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Text color={config.colors.muted}>
            {item.source} · {item.timestamp}
          </Text>
          <Text color={config.colors.base_fg}>{JSON.stringify(item.data, null, 0)}</Text>
        </Box>
      ))}
    </Box>
  );

  // Agent cards section - matching PRP design format exactly
  const renderAgents = () => {
    const agentArray = Array.from(agents.values());

    if (agentArray.length === 0) {
      // Render example agents based on PRP design when no real agents
      return (
        <Box flexDirection="column" marginBottom={2}>
          {/* Empty line for spacing */}
          <Box marginBottom={1}></Box>

          {/* Example agent 1 - matching PRP design exactly */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color={config.colors.base_fg}>
              ♫ · RUNNING · prp-agents-v05#robo-aqa · audit PRP links · T–00:09 · DoD 35%
            </Text>
            <Box flexDirection="column" marginLeft={4}>
              <Text color={config.colors.muted}> CoT: integrating cross-links…</Text>
              <Text color={config.colors.muted}> ⎿ commit staged: 3 files</Text>
              <Text color={config.colors.muted}> tokens=18.2k · active=00:01:43</Text>
            </Box>
          </Box>

          {/* Example agent 2 - matching PRP design exactly */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color={config.colors.base_fg}>
              ♫ · SPAWNING · prp-landing#robo-dev · extract sections · T–00:25 · DoD 12%
            </Text>
            <Box flexDirection="column" marginLeft={4}>
              <Text color={config.colors.muted}> npm run build: ok</Text>
              <Text color={config.colors.muted}> ⎿ parsing md toc…</Text>
              <Text color={config.colors.muted}> tokens=4.3k · active=00:00:28</Text>
            </Box>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}></Box>
        {agentArray.map((agent) => (
          <Box key={agent.id} flexDirection="column" marginBottom={1}>
            <Text color={config.colors.neutrals.text}>
              ♫ · {agent.status?.toUpperCase() || 'RUNNING'} · {agent.role}#{agent.prp}{' '}
              · {agent.task || 'processing'} · T–{agent.timeLeft || '00:00'} · DoD{' '}
              {agent.progress || '0'}%
            </Text>
            <Box flexDirection="column" marginLeft={4}>
              <Text color={config.colors.neutrals.muted_hover}> CoT: {agent.status || 'thinking...'}</Text>
              <Text color={config.colors.neutrals.muted_hover}> ⎿ {agent.task || 'initializing...'}</Text>
              <Text color={config.colors.neutrals.muted_hover}>
                {' '}
                tokens={agent.tokens || '0k'} · active={agent.active || '00:00:00'}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  // Orchestrator block with signal integration - matching PRP design format exactly
  const renderOrchestrator = () => {
    return (
      <Box flexDirection="column" marginBottom={2}>
        {/* Empty line for spacing */}
        <Box marginBottom={1}></Box>

        {/* Orchestrator header matching PRP design exactly */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color={config.colors.base_fg}>
            ♫ · RUNNING · Orchestrator · prp-agents-v05 [ob]
          </Text>
          <Box flexDirection="column" marginLeft={4}>
            <Text color={config.colors.muted}>
              Δ scanner → inspector → CoT: ...ht now we need find more details from status, let me
              pr
            </Text>
            <Text color={config.colors.muted}>
              ⇢ diff.read → {'{'} changed: 6, hot: [PRPs/agents-v05.md,…] {'}'}
            </Text>
          </Box>
        </Box>

        {/* Real-time orchestration signals - simplified */}
        {relevantOrchestrationSignals.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" marginLeft={4}>
            {relevantOrchestrationSignals.slice(-5).map((signal, index) => (
              <Box key={signal.id} marginRight={1}>
                <SignalDisplay signal={signal} compact={true} animated={true} config={config} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // Right panel with PRP list - matching PRP design format exactly
  const renderPRPList = () => {
    const shouldShowPRPList = layoutMode !== 'compact' || useFullWidth; // Show in fallback mode too

    if (!shouldShowPRPList) {
      return null;
    }

    const prpArray = Array.from(prps.values());

    // If no real PRPs, show example ones matching design exactly
    if (prpArray.length === 0) {
      const isRightAligned = !useFullWidth; // Only right-align in sidebar mode

      return (
        <Box flexDirection="column" flexGrow={1}>
          {/* Empty line for spacing */}
          <Box marginBottom={1}></Box>

          {/* Example PRP 1 - matching PRP design exactly with proper spacing */}
          <Box flexDirection="column" marginBottom={1}>
            <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'}>
              <Text color={config.colors.base_fg} bold>
                RUNNING · prp-agents-v05#robo-aqa
              </Text>
            </Box>
            <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'} marginTop={0}>
              <Text color={config.colors.base_fg}>[aA] [pr] [PR] [FF] [ob] [AA] [ ]</Text>
            </Box>
          </Box>

          {/* Example PRP 2 - matching PRP design exactly */}
          <Box flexDirection="column" marginBottom={1}>
            <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'}>
              <Text color={config.colors.base_fg} bold>
                SPAWNING · prp-landing#robo-develop
              </Text>
            </Box>
            <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'} marginTop={0}>
              <Text color={config.colors.base_fg}>[ ] [ ] [FF] [XX] [XX] [XX] [XX]</Text>
            </Box>
          </Box>

          {/* Example PRP 3 - matching PRP design exactly */}
          <Box flexDirection="column" marginBottom={1}>
            <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'}>
              <Text color={config.colors.muted} bold>
                IDLE · prp-nudge#robo-legal-complie
              </Text>
            </Box>
            <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'} marginTop={0}>
              <Text color={config.colors.muted}>[ ] [ ] [ ] [ ] [ ] [ ] [pr]</Text>
            </Box>
          </Box>

          {/* Add spacing at bottom */}
          <Box marginBottom={1}></Box>
        </Box>
      );
    }

    const isRightAligned = !useFullWidth; // Only right-align in sidebar mode

    return (
      <Box flexDirection="column" flexGrow={1}>
        {prpArray.map((prp) => {
          const roleColors = prp.role ? getRoleColors(prp.role, config.colors) : null;
          const isActive = prp.status === 'RUNNING';
          const isIdle = prp.status === 'IDLE';
          const textColor = isIdle
            ? config.colors.muted
            : isActive
              ? config.colors.base_fg
              : config.colors.base_fg;

          return (
            <Box key={prp.name} flexDirection="column" marginBottom={1}>
              {/* PRP header line - aligned based on layout mode */}
              <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'}>
                <Text color={textColor} bold={isActive}>
                  {prp.status.padEnd(8)} · {prp.name}
                </Text>
              </Box>

              {/* Signals line - aligned based on layout mode */}
              <Box justifyContent={isRightAligned ? 'flex-end' : 'flex-start'} marginTop={0}>
                <SignalBar signals={prp.signals} config={config} />
              </Box>
            </Box>
          );
        })}

        {/* Add spacing at bottom */}
        <Box marginBottom={1}></Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="row" width={columns} flexGrow={1}>
      {useFullWidth ? (
        // Full-width layout for small screens - stack everything vertically
        <Box flexDirection="column" width={columns} flexGrow={1}>
          {renderHeader()}
          {renderHistory()}
          {renderAgents()}
          {renderOrchestrator()}

          {/* Input area with delimiter - matching PRP design exactly */}
          <Box flexDirection="column" marginTop={2}>
            <Box flexDirection="row" justifyContent="flex-start" marginBottom={1}>
              <Text color={config.colors.muted}>{'─'.repeat(Math.min(mainContentWidth, 80))}</Text>
            </Box>
            <Box flexDirection="row" justifyContent="flex-start">
              <Text color={config.colors.base_fg}>{'> '}</Text>
              <Text color={config.colors.muted}>Analyze orchestration status...</Text>
            </Box>
          </Box>
          {rightPanelWidth > 0 && (
            <>
              {/* Add delimiter before PRP list on small screens */}
              <Box marginTop={1} marginBottom={1}>
                <Text color={config.colors.muted}>{'─'.repeat(Math.min(columns, 120))}</Text>
              </Box>
              {renderPRPList()}
            </>
          )}
        </Box>
      ) : (
        // Normal layout with sidebar on right
        <>
          {/* Main content area - takes remaining space */}
          <Box flexDirection="column" width={mainContentWidth} marginRight={2}>
            {renderHeader()}
            {renderHistory()}
            {renderAgents()}
            {renderOrchestrator()}

            {/* Input area with delimiter - matching PRP design exactly */}
            <Box flexDirection="column" marginTop={2}>
              <Box flexDirection="row" justifyContent="flex-start" marginBottom={1}>
                <Text color={config.colors.muted}>
                  {'─'.repeat(Math.min(mainContentWidth, 80))}
                </Text>
              </Box>
              <Box flexDirection="row" justifyContent="flex-start">
                <Text color={config.colors.base_fg}>{'> '}</Text>
                <Text color={config.colors.muted}>Analyze orchestration status...</Text>
              </Box>
            </Box>
          </Box>

          {/* Right panel - PRP list (sidebar) */}
          {rightPanelWidth > 0 && (
            <Box flexDirection="column" width={rightPanelWidth}>
              {renderPRPList()}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
