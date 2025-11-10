/**
 * ♫ AgentEditor - Comprehensive agent configuration component
 *
 * Full agent configuration with all fields from PRP-003 specs:
 * id, limit, cv, warning_limit, provider, yolo, sub_agents, max_parallel,
 * mcp, compact_prediction subfields
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

// Import field components
import FieldText from './FieldText.js';
import FieldTextBlock from './FieldTextBlock.js';
import FieldSelectCarousel from './FieldSelectCarousel.js';
import FieldToggle from './FieldToggle.js';

// Import types
import type { AgentConfig, AgentEditorProps } from './types.js';

export { AgentEditorProps };

export const AgentEditor = ({
  agent,
  agentIndex,
  onUpdate,
  onRemove,
  config,
  disabled = false,
  showAdvanced = false
}: AgentEditorProps) => {
  const [expanded] = useState(true);
  const [currentField, setCurrentField] = useState(0);

  // Provider options
  const providerOptions = ['OpenAI', 'Anthropic', 'Custom'];
  const agentTypes = ['system-analyst', 'developer', 'quality-control', 'ux-ui-designer', 'devops-sre'];

  // Handle field updates
  const handleFieldUpdate = useCallback((field: keyof AgentConfig, value: AgentConfig[keyof AgentConfig]) => {
    if (disabled) {
      return;
    }
    onUpdate({ ...agent, [field]: value });
  }, [disabled, agent, onUpdate]);

  // Handle nested compact_prediction updates
  const handleCompactPredictionUpdate = useCallback((field: keyof AgentConfig['compact_prediction'], value: AgentConfig['compact_prediction'][keyof AgentConfig['compact_prediction']]) => {
    if (disabled) {
      return;
    }
    onUpdate({
      ...agent,
      compact_prediction: {
        ...agent.compact_prediction,
        [field]: value
      }
    });
  }, [disabled, agent, onUpdate]);

  
  // Keyboard navigation for fields
  useInput((input, key) => {
    if (disabled || !expanded) {
      return;
    }

    if (key.tab && !key.shift) {
      setCurrentField((prev) => (prev + 1) % 10); // 10 main fields
    } else if (key.tab && key.shift) {
      setCurrentField((prev) => (prev - 1 + 10) % 10);
    } else if (input === 'r') {
      onRemove();
    }
  }, { isActive: expanded && !disabled });

  // Color scheme
  const colors = config?.colors;
  const borderColor = colors?.accent_orange;
  const headerColor = colors?.accent_orange;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={1}
        borderStyle="round"
        borderColor={borderColor}
        padding={1}
      >
        <Box flexDirection="row" alignItems="center">
          <Text color={headerColor} bold={true}>
            Agent #{agentIndex + 1}: {agent.id || 'unnamed'}
          </Text>
          {agent.yolo && (
            <Box marginLeft={1}>
              <Text color={colors?.warn} bold={false}>
                ⚡ YOLO
              </Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="row" alignItems="center">
          <Box marginRight={1}>
            <Text color={colors?.muted} bold={false}>
              [{expanded ? '▼' : '▶'}]
            </Text>
          </Box>
          <Box marginRight={1}>
            <Text
              color={colors?.error}
              backgroundColor={colors?.error ? `${colors.error}20` : undefined}
              bold={false}
            >
              [R] Remove
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Expanded content */}
      {expanded && (
        <Box flexDirection="column" marginLeft={2} borderStyle="single" borderColor={colors?.gray} padding={1}>
          {/* Basic Configuration */}
          <Box flexDirection="column" marginBottom={1}>
            <Box marginBottom={1}>
              <Text color={colors?.accent_orange} bold={true}>
                Basic Configuration
              </Text>
            </Box>

            <Box flexDirection="row" marginBottom={1}>
              <Box flexGrow={1} marginRight={2}>
                <FieldText
                  label="ID"
                  value={agent.id}
                  onChange={(value) => handleFieldUpdate('id', value)}
                  placeholder="agent-name"
                  config={config}
                  disabled={disabled}
                  autoFocus={currentField === 0}
                />
              </Box>

              <Box flexGrow={1}>
                <FieldSelectCarousel
                  label="Type"
                  items={agentTypes}
                  selectedIndex={agentTypes.indexOf(agent.type) ?? 0}
                  onChange={(index) => handleFieldUpdate('type', agentTypes[index])}
                  config={config}
                  disabled={disabled}
                />
              </Box>
            </Box>

            <Box flexDirection="row" marginBottom={1}>
              <Box flexGrow={1} marginRight={2}>
                <FieldText
                  label="Limit"
                  value={agent.limit}
                  onChange={(value) => handleFieldUpdate('limit', value)}
                  placeholder="100usd10k#role"
                  config={config}
                  disabled={disabled}
                />
              </Box>

              <Box flexGrow={1}>
                <FieldText
                  label="Warning Limit"
                  value={agent.warning_limit || ''}
                  onChange={(value) => handleFieldUpdate('warning_limit', value)}
                  placeholder="2k#role"
                  config={config}
                  disabled={disabled}
                />
              </Box>
            </Box>

            <FieldTextBlock
              label="Curriculum Vitae (CV)"
              value={agent.cv}
              onChange={(value) => handleFieldUpdate('cv', value)}
              rows={3}
              minHeight={2}
              maxHeight={5}
              placeholder="Describe the agent's expertise and specialties..."
              config={config}
              disabled={disabled}
              multiline={true}
            />
          </Box>

          {/* Provider Configuration */}
          <Box flexDirection="column" marginBottom={1}>
            <Box marginBottom={1}>
              <Text color={colors?.accent_orange} bold>
                Provider Configuration
              </Text>
            </Box>

            <Box flexDirection="row" marginBottom={1}>
              <Box flexGrow={1} marginRight={2}>
                <FieldSelectCarousel
                  label="Provider"
                  items={providerOptions}
                  selectedIndex={providerOptions.indexOf(agent.provider ?? 'OpenAI') ?? 0}
                  onChange={(index) => handleFieldUpdate('provider', providerOptions[index])}
                  config={config}
                  disabled={disabled}
                />
              </Box>
            </Box>

            <Box flexDirection="row" marginBottom={1}>
              <Box flexGrow={1} marginRight={2}>
                <FieldText
                  label="MCP Config"
                  value={agent.mcp || ''}
                  onChange={(value) => handleFieldUpdate('mcp', value)}
                  placeholder=".mcp.json"
                  config={config}
                  disabled={disabled}
                />
              </Box>

              <Box flexGrow={1}>
                <FieldText
                  label="Max Parallel"
                  value={agent.max_parallel?.toString() ?? ''}
                  onChange={(value) => handleFieldUpdate('max_parallel', parseInt(value, 10) || 5)}
                  placeholder="5"
                  config={config}
                  disabled={disabled}
                />
              </Box>
            </Box>
          </Box>

          {/* Advanced Settings */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={1}>
              <Text color={colors?.accent_orange} bold>
                Advanced Settings
              </Text>

              <FieldToggle
                label="Sub-Agents"
                value={agent.sub_agents || false}
                onChange={(value) => handleFieldUpdate('sub_agents', value)}
                config={config}
                disabled={disabled}
                onValue="enabled"
                offValue="disabled"
              />
            </Box>

            <FieldToggle
              label="YOLO Mode"
              value={agent.yolo || false}
              onChange={(value) => handleFieldUpdate('yolo', value)}
              config={config}
              disabled={disabled}
              onValue="enabled"
              offValue="disabled"
            />

            {/* Compact Prediction */}
            {showAdvanced && (
              <Box flexDirection="column" marginTop={1}>
                <Box marginBottom={1}>
                  <Text color={colors?.accent_orange} bold>
                    Compact Prediction Settings
                  </Text>
                </Box>

                <Box flexDirection="row" marginBottom={1}>
                  <Box flexGrow={1} marginRight={2}>
                    <FieldText
                      label="Percent Threshold"
                      value={(agent.compact_prediction?.percent_threshold ?? 0.82).toString()}
                      onChange={(value) => handleCompactPredictionUpdate('percent_threshold', parseFloat(value) || 0.82)}
                      placeholder="0.82"
                      config={config}
                      disabled={disabled}
                    />
                  </Box>

                  <Box flexGrow={1}>
                    <FieldText
                      label="Token Cap"
                      value={agent.compact_prediction.cap?.toString() ?? ''}
                      onChange={(value) => handleCompactPredictionUpdate('cap', parseInt(value, 10) || 24000)}
                      placeholder="24000"
                      config={config}
                      disabled={disabled}
                    />
                  </Box>
                </Box>

                <FieldToggle
                  label="Auto Adjust"
                  value={agent.compact_prediction?.auto_adjust ?? false}
                  onChange={(value) => handleCompactPredictionUpdate('auto_adjust', value)}
                  config={config}
                  disabled={disabled}
                />
              </Box>
            )}
          </Box>

          {/* Status and Help */}
          <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
            <Text color={colors?.muted} dimColor>
              Fields: {Object.keys(agent).length} configured
            </Text>
            <Text color={colors?.muted} dimColor>
              [Tab] navigate fields • [R] remove agent
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AgentEditor;