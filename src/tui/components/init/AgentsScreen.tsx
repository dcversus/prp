/**
 * ♫ Agents Screen - Step 3
 *
 * Agent management interface with add/remove functionality.
 * Comprehensive agent editor with all AgentConfig fields including
 * type, limits, CV, warning limits, provider settings, and MCP configuration.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Import field components
import InitShell from './InitShell.js';
import FieldSelectCarousel from './FieldSelectCarousel.js';
import AgentEditor from './AgentEditor.js';

// Import types
import type { InitState, AgentConfig } from './types.js';

interface AgentsScreenProps {
  state: InitState;
  onChange: (state: InitState) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

const AGENT_TYPES: string[] = ['claude', 'codex', 'gemini', 'amp', 'other'];

const AgentsScreen: React.FC<AgentsScreenProps> = ({
  state,
  onChange,
  onNext,
  onBack,
  onCancel
}) => {
  const [focusedField, setFocusedField] = useState(0);
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  // Initialize with one agent if none exist
  useEffect(() => {
    if (state.agents.length === 0) {
      const defaultAgent: AgentConfig = {
        id: 'claude-code',
        type: 'claude',
        limit: '100usd10k#aqa',
        cv: 'code fixes + PR grooming; excels at refactors.',
        warning_limit: '2k#robo-quality-control',
        provider: 'anthropic',
        yolo: false,
        sub_agents: true,
        max_parallel: 5,
        mcp: '.mcp.json',
        compact_prediction: {
          percent_threshold: 0.82,
          auto_adjust: true,
          cap: 24000
        }
      };

      onChange({
        ...state,
        agents: [defaultAgent],
        currentAgentIndex: 0
      });
    }
  }, []);

  // Get current focused agent
  const currentAgent = state.agents[state.currentAgentIndex] ?? state.agents[0];

  // Validate current state
  const validateState = () => {
    const validation = { ...state.validation };

    state.agents.forEach((agent, index) => {
      const agentKey = `agent_${index}`;

      // Validate agent ID
      if (!agent.id.trim()) {
        validation[`${agentKey}_id`] = {
          isValid: false,
          message: 'Agent ID is required'
        };
      } else if (!/^[a-z0-9-]+$/.test(agent.id)) {
        validation[`${agentKey}_id`] = {
          isValid: false,
          message: 'Agent ID must contain only lowercase letters, numbers, and hyphens'
        };
      } else {
        validation[`${agentKey}_id`] = { isValid: true };
      }

      // Validate limit format
      if (!agent.limit.trim()) {
        validation[`${agentKey}_limit`] = {
          isValid: false,
          message: 'Limit is required'
        };
      } else if (!/^\d+[a-zA-Z]+#\w+$/.test(agent.limit)) {
        validation[`${agentKey}_limit`] = {
          isValid: false,
          message: 'Limit must be in format: "100usd10k#agent-name"'
        };
      } else {
        validation[`${agentKey}_limit`] = { isValid: true };
      }

      // Validate CV
      if (!agent.cv?.trim()) {
        validation[`${agentKey}_cv`] = {
          isValid: false,
          message: 'Agent CV is required'
        };
      } else {
        validation[`${agentKey}_cv`] = { isValid: true };
      }

      // Validate warning limit
      if (!agent.warning_limit?.trim()) {
        validation[`${agentKey}_warning_limit`] = {
          isValid: false,
          message: 'Warning limit is required'
        };
      } else if (!/^\d+[a-zA-Z]+#\w+$/.test(agent.warning_limit)) {
        validation[`${agentKey}_warning_limit`] = {
          isValid: false,
          message: 'Warning limit must be in format: "2k#role-name"'
        };
      } else {
        validation[`${agentKey}_warning_limit`] = { isValid: true };
      }

      // Validate max_parallel
      const maxParallel = agent.max_parallel ?? 5;
      if (maxParallel < 1 || maxParallel > 20) {
        validation[`${agentKey}_max_parallel`] = {
          isValid: false,
          message: 'Max parallel must be between 1 and 20'
        };
      } else {
        validation[`${agentKey}_max_parallel`] = { isValid: true };
      }

      // Validate compact prediction values
      const percentThreshold = agent.compact_prediction?.percent_threshold ?? 0.5;
      if (percentThreshold < 0 || percentThreshold > 1) {
        validation[`${agentKey}_percent_threshold`] = {
          isValid: false,
          message: 'Percent threshold must be between 0 and 1'
        };
      } else {
        validation[`${agentKey}_percent_threshold`] = { isValid: true };
      }

      const cap = agent.compact_prediction?.cap ?? 10000;
      if (cap < 1000 || cap > 100000) {
        validation[`${agentKey}_cap`] = {
          isValid: false,
          message: 'Cap must be between 1000 and 100000 tokens'
        };
      } else {
        validation[`${agentKey}_cap`] = { isValid: true };
      }
    });

    onChange({ ...state, validation });
  };

  // Validate on changes
  useEffect(() => {
    validateState();
  }, [state.agents]);

  // Add new agent
  const addAgent = () => {
    const newAgent: AgentConfig = {
      id: `agent-${state.agents.length + 1}`,
      type: 'claude',
      limit: '50usd5k#new-agent',
      cv: 'New agent capabilities and responsibilities.',
      warning_limit: '1k#robo-quality-control',
      provider: 'anthropic',
      yolo: false,
      sub_agents: true,
      max_parallel: 3,
      mcp: '.mcp.json',
      compact_prediction: {
        percent_threshold: 0.8,
        auto_adjust: true,
        cap: 16000
      }
    };

    onChange({
      ...state,
      agents: [...state.agents, newAgent],
      currentAgentIndex: state.agents.length
    });
    setExpandedAgent(state.agents.length);
  };

  // Remove agent
  const removeAgent = (index: number) => {
    if (state.agents.length <= 1) {
      return; // Don't allow removing the last agent
    }

    const newAgents = state.agents.filter((_, i) => i !== index);
    const newIndex = Math.min(index, newAgents.length - 1);

    onChange({
      ...state,
      agents: newAgents,
      currentAgentIndex: newIndex
    });

    if (expandedAgent === index) {
      setExpandedAgent(null);
    } else if (expandedAgent !== null && expandedAgent > index) {
      setExpandedAgent(expandedAgent - 1);
    }
  };

  // Update agent
  const updateAgent = (index: number, agent: AgentConfig) => {
    const newAgents = [...state.agents];
    newAgents[index] = agent;
    onChange({
      ...state,
      agents: newAgents
    });
  };

  
  // Check if can proceed
  const canProceed = state.agents.length > 0 &&
    Object.values(state.validation).every(v => v?.isValid ?? true);

  
  // Render field based on focus
  const renderField = (fieldIndex: number) => {
    const isFocused = focusedField === fieldIndex;

    switch (fieldIndex) {
      case 0: // Agent Type for new agent
        return (
          <Box flexDirection="column" gap={1}>
            <FieldSelectCarousel
              label="Type"
              items={AGENT_TYPES}
              selectedIndex={AGENT_TYPES.indexOf(currentAgent?.type ?? 'claude')}
              onChange={(index) => {
                const newType = AGENT_TYPES[index];
                const updatedAgent = {
                  ...currentAgent!,
                  type: newType as AgentConfig['type'],
                  // Auto-select provider based on type
                  provider: newType === 'claude' ? 'anthropic' :
                    newType === 'codex' ? 'openai' :
                      currentAgent?.provider ?? 'anthropic'
                };
                updateAgent(state.currentAgentIndex, updatedAgent);
              }}
              focused={isFocused}
            />

            {/* Provider hint based on type */}
            {currentAgent?.type === 'claude' && (
              <Text color="gray" dimColor>
                Anthropic provider auto-selected; change under "provider".
              </Text>
            )}
          </Box>
        );

      case 1: // Add another / Continue
        return (
          <FieldSelectCarousel
            label="Add another after this?"
            items={['Continue', 'Add more...']}
            selectedIndex={expandedAgent !== null ? 1 : 0}
            onChange={(index) => {
              if (index === 1) {
                addAgent();
                setFocusedField(2); // Move to new agent editor
              } else {
                setExpandedAgent(null);
              }
            }}
            focused={isFocused}
          />
        );

      case 2: // Remove agent button (when expanded)
        if (expandedAgent !== null) {
          return (
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text color="red" bold>
                Press R to remove Agent #{expandedAgent + 1}
              </Text>
              <Text color="gray" dimColor>
                {currentAgent?.id}
              </Text>
            </Box>
          );
        }
        break;

      default:
        return null;
    }

    return null;
  };

  // Generate footer keys based on current field
  const getFooterKeys = () => {
    const keys = ['Enter', 'Esc'];

    if (focusedField === 0) {
      keys.push('←/→', 'switch type');
    }

    if (focusedField === 1) {
      keys.push('←/→', 'toggle');
    }

    if (expandedAgent !== null) {
      keys.push('A', 'add agent', 'R', 'remove agent', '↑/↓', 'select');
    }

    return keys;
  };

  return (
    <InitShell
      stepIndex={3}
      totalSteps={6}
      title="Agents"
      icon={canProceed ? '♫' : '♪'}
      footerKeys={getFooterKeys()}
      onBack={onBack}
      onForward={canProceed ? onNext : undefined}
      onCancel={onCancel}
    >
      <Box flexDirection="column" gap={1}>
        {/* Render top-level fields */}
        {Array.from({ length: 2 }, (_, index) => (
          <Box key={index}>
            {renderField(index)}
          </Box>
        ))}

        {/* Agent editors */}
        {state.agents.map((agent, index) => (
          <Box key={index} flexDirection="column" marginBottom={1}>
            {/* Agent header */}
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              paddingX={1}
            >
              <Text color={expandedAgent === index ? 'white' : 'cyan'}>
                {expandedAgent === index ? '▼' : '▶'} Agent #{index + 1}
              </Text>
              <Text color={expandedAgent === index ? 'white' : 'gray'}>
                {agent.id}
              </Text>
            </Box>

            {/* Expanded agent editor */}
            {expandedAgent === index && (
              <Box paddingLeft={2} marginTop={1}>
                <AgentEditor
                  agent={agent}
                  agentIndex={index}
                  onUpdate={(updatedAgent: AgentConfig) => updateAgent(index, updatedAgent)}
                  onRemove={() => removeAgent(index)}
                />
              </Box>
            )}
          </Box>
        ))}

        {/* Validation errors */}
        {!canProceed && (
          <Box marginTop={1}>
            <Text color="red">
              ⚠ Please fix validation errors before continuing
            </Text>
          </Box>
        )}
      </Box>
    </InitShell>
  );
};

export default AgentsScreen;