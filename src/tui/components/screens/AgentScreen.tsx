/**
 * ♫ Agent Screen Component
 *
 * Fullscreen agent view with Claude Code-style interface
 * showing detailed agent output and tool calls with pagination
 */

import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { MusicIcon } from '../MusicIcon.js';
import { getRoleColors } from '../../config/TUIConfig.js';

interface AgentScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
}

interface AgentPage {
  pageNumber: number;
  totalPages: number;
  content: React.ReactNode;
}

const generateMockOutput = (agent: AgentCard, page: number): string[] => {
  const baseOutput = [
    `▏update: ${agent.task.toLowerCase()}`,
    `▏diff: +${Math.floor(Math.random() * 20)} -${Math.floor(Math.random() * 5)}`,
    '▏todo: validate implementation',
    '▏stdout:',
    `▏  ✔ ${agent.role} processing complete`,
    `▏  ✔ status updated to ${agent.status}`,
    `▏  ✔ ${agent.tokens} tokens consumed`,
    '▏service:',
    `▏  usage: ${Math.floor(Math.random() * 1000)} prompt · ${Math.floor(Math.random() * 200)} output`,
    `▏  cost: $${(Math.random() * 0.5).toFixed(2)} (est)`,
    '▏orchestrator:',
    `▏  ◇ processing ${agent.prp}`,
    `▏  ⇢ current status: ${agent.progress}% complete`,
    '▏next:',
    '▏  1) continue with current task',
    '▏  2) await further instructions',
    '▏  3) report completion status'
  ];

  // Add page-specific content
  if (page === 1) {
    return baseOutput.slice(0, 8);
  } else if (page === 2) {
    return baseOutput.slice(6, 14);
  } else {
    return baseOutput.slice(12);
  }
};

const AgentDetailView: React.FC<{
  agent: AgentCard;
  config: TUIConfig;
  currentPage: number;
  onPageChange: (page: number) => void;
}> = ({ agent, config, currentPage, onPageChange }) => {
  const totalPages = 3;
  const roleColors = getRoleColors(agent.role, config.colors);

  // Generate page content
  const pageContent = useMemo(() => {
    return generateMockOutput(agent, currentPage);
  }, [agent, currentPage]);

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={roleColors.active} bold>
          Claude Code — {agent.prp} · streaming
        </Text>
        <Text color={config.colors.muted}>
          ⟦ page {currentPage} / {totalPages} ⟧
        </Text>
      </Box>

      {/* Agent status line */}
      <Box marginBottom={1}>
        <MusicIcon status={agent.status} animate={agent.status === 'RUNNING'} />
        <Text color={config.colors.base_fg}>
          {' '}last ▸ {agent.task.toLowerCase()}
        </Text>
      </Box>

      {/* Service line */}
      <Box marginBottom={1}>
        <Text color={config.colors.base_fg}>
          last ▸ commit prepared…
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={config.colors.muted}>
          svc  ▸ tokens={agent.tokens} · active={agent.active} · retries=0 · net=ok
        </Text>
      </Box>

      <Text color={config.colors.muted}>
        ⋯ scroll ⋯
      </Text>

      {/* Page content */}
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {pageContent.map((line, index) => (
          <Text key={index} color={config.colors.base_fg}>
            {line}
          </Text>
        ))}
      </Box>

      {/* Navigation hints */}
      {totalPages > 1 && (
        <Box justifyContent="center" marginTop={1}>
          <Text color={config.colors.muted}>
            {currentPage > 1 && '← prev'}{currentPage > 1 && currentPage < totalPages && ' | '}Page {currentPage}{currentPage < totalPages && ' | next →'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export function AgentScreen({ state, config, terminalLayout }: AgentScreenProps) {
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const agentArray = Array.from(state.agents.values());

  // Auto-select first agent if available
  React.useEffect(() => {
    if (agentArray.length > 0 && selectedAgentIndex >= agentArray.length) {
      setSelectedAgentIndex(0);
    }
  }, [agentArray.length, selectedAgentIndex]);

  const selectedAgent = agentArray[selectedAgentIndex];

  // Handle keyboard navigation
  useInput((input, key) => {
    switch (input) {
      case 'left':
        if (currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        break;
      case 'right':
        if (currentPage < 3) { // Assuming 3 pages max
          setCurrentPage(currentPage + 1);
        }
        break;
      case 'up':
        if (selectedAgentIndex > 0) {
          setSelectedAgentIndex(selectedAgentIndex - 1);
          setCurrentPage(1); // Reset to first page when switching agents
        }
        break;
      case 'down':
        if (selectedAgentIndex < agentArray.length - 1) {
          setSelectedAgentIndex(selectedAgentIndex + 1);
          setCurrentPage(1); // Reset to first page when switching agents
        }
        break;
      case '1':
        setCurrentPage(1);
        break;
      case '2':
        setCurrentPage(2);
        break;
      case '3':
        setCurrentPage(3);
        break;
    }
  });

  // No agents available
  if (agentArray.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2} width={terminalLayout.columns}>
        <Box justifyContent="space-between" marginBottom={1}>
          <Text color={config.colors.accent_orange} bold>
            ♫ @dcversus/prp - Agent View
          </Text>
          <Text color={config.colors.muted}>
            ⧗ {new Date().toLocaleString()}
          </Text>
        </Box>

        <Text color={config.colors.muted}>
          ─────────────────────────────────────────────────────────────────
        </Text>

        <Box flexDirection="column" justifyContent="center" alignItems="center" marginTop={5}>
          <MusicIcon status="IDLE" />
          <Text color={config.colors.muted} marginTop={1}>
            ♪ No agents currently running
          </Text>
          <Text color={config.colors.muted}>
            Switch to Orchestrator screen to start agents
          </Text>
        </Box>

        <Text color={config.colors.muted} marginTop={5}>
          ─────────────────────────────────────────────────────────────────
        </Text>
        <Text color={config.colors.muted}>
          idle · agents 0 · prp {state.prps.size} · ▲0
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2} width={terminalLayout.columns}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={config.colors.accent_orange} bold>
          ♫ @dcversus/prp - Agent View
        </Text>
        <Text color={config.colors.muted}>
          ⧗ {new Date().toLocaleString()}
        </Text>
      </Box>

      <Text color={config.colors.muted}>
        ─────────────────────────────────────────────────────────────────
      </Text>

      {/* Agent selection tabs (if multiple agents) */}
      {agentArray.length > 1 && (
        <Box justifyContent="center" marginBottom={1}>
          {agentArray.map((agent, index) => {
            const roleColors = getRoleColors(agent.role, config.colors);
            const isSelected = index === selectedAgentIndex;

            return (
              <Box
                key={agent.id}
                marginX={1}
                paddingX={1}
                backgroundColor={isSelected ? roleColors.bg : undefined}
              >
                <Text
                  color={isSelected ? config.colors.base_fg : roleColors.active}
                  bold={isSelected}
                >
                  {agent.role} {isSelected && '●'}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Agent detail view */}
      {selectedAgent && (
        <AgentDetailView
          agent={selectedAgent}
          config={config}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}

      <Text color={config.colors.muted}>
        ─────────────────────────────────────────────────────────────────
      </Text>

      {/* Footer */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={config.colors.muted}>
            Tab S X D
          </Text>
          <Text color={config.colors.muted}>
            {'    '}
          </Text>
        </Box>

        <Text color={config.colors.muted}>
          {selectedAgent ? (
            <>
              {selectedAgent.status.toLowerCase()} · agents {agentArray.length} · prp {state.prps.size} · ▲0
            </>
          ) : (
            <>idle · agents {agentArray.length} · prp {state.prps.size} · ▲0</>
          )}
        </Text>
      </Box>

      {/* Navigation hints */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={config.colors.muted}>
          Navigation: [Tab] switch screens | [↑↓] switch agents | [←→] or [1-3] pages | [S] start | [X] stop | [D] debug
        </Text>
      </Box>
    </Box>
  );
}