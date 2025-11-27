/**
 * PRP List Component with Enhanced Navigation
 *
 * Interactive list of Product Requirement Prompts with
 * Tab/S/X navigation and agent assignment capabilities
 */

import { useState, useEffect, useMemo } from 'react';
import { Box, Text, Newline } from 'ink';

import { KeyboardNavigation, type NavigationMode } from '../utils/keyboard-navigation';

import type { TUIConfig } from '../shared/types/TUIConfig';

interface PRPItem {
  id: string;
  title: string;
  status: 'draft' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  signals: number;
  lastModified: Date;
  description?: string;
}

interface PRPListProps {
  config: TUIConfig;
  items: PRPItem[];
  onSelect?: (item: PRPItem) => void;
  onAssignAgent?: (prpId: string, agentType: string) => void;
  onToggleStatus?: (prpId: string) => void;
  navigationMode?: NavigationMode;
}

export const PRPList = ({
  config,
  items,
  onSelect,
  onAssignAgent,
  onToggleStatus,
  navigationMode = 'list',
}: PRPListProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Status colors
  const statusColors = {
    draft: config.colors.muted,
    'in-progress': config.colors.role_colors['robo-developer'],
    review: config.colors.role_colors['robo-aqa'],
    completed: config.colors.ok,
  };

  // Priority indicators
  const prioritySymbols = {
    low: '○',
    medium: '◐',
    high: '◑',
    critical: '●',
  };

  // Create navigation handler
  const navigation = useMemo(() => {
    return new KeyboardNavigation(
      {
        mode: navigationMode,
        selectedIndex,
        totalItems: items.length,
        selectedId: items[selectedIndex]?.id,
        shortcuts: {
          d: () => setShowDetails(!showDetails),
          enter: () => {
            if (onSelect && items[selectedIndex]) {
              onSelect(items[selectedIndex]);
            }
          },
        },
      },
      {
        onNavigate: (direction, index) => {
          setSelectedIndex(index);
        },
        onSelect: (id, index) => {
          if (onSelect && items[index]) {
            onSelect(items[index]);
          }
        },
        onAction: (action, id, index) => {
          switch (action) {
            case 'toggle':
              if (onToggleStatus && id) {
                onToggleStatus(id);
              }
              break;
            case 'actions':
              setShowActions(true);
              break;
            case 'assign-agent':
              // Would show agent selection dialog
              break;
            default:
              break;
          }
        },
      }
    );
  }, [navigationMode, selectedIndex, items.length, items, onSelect, onToggleStatus, showDetails]);

  // Format list item
  const formatItem = (item: PRPItem, isSelected: boolean) => {
    const statusColor = statusColors[item.status];
    const prioritySymbol = prioritySymbols[item.priority];
    const marker = isSelected ? '▶' : ' ';
    const agentLabel = item.assignedAgent ? `[${item.assignedAgent}]` : '';

    return (
      <Box key={item.id}>
        <Text color={isSelected ? config.colors.accent_orange : config.colors.base_fg}>
          {marker} {prioritySymbol} {item.title.padEnd(40)}{' '}
          <Text color={statusColor}>
            [{item.status}]
          </Text>
          {' '}
          <Text color={config.colors.muted}>
            {agentLabel}
          </Text>
          {' '}
          <Text color={config.colors.muted}>
            ({item.signals} signals)
          </Text>
        </Text>
      </Box>
    );
  };

  // Render item details
  const renderItemDetails = (item: PRPItem) => {
    if (!showDetails) return null;

    return (
      <Box flexDirection="column" marginTop={1} paddingX={2}>
        <Box borderStyle="round" borderColor={config.colors.accent_orange}>
          <Box paddingX={1}>
            <Text color={config.colors.accent_orange} bold>
              {item.title}
            </Text>
          </Box>
          <Newline />
          {item.description && (
            <Box paddingX={1}>
              <Text color={config.colors.muted}>
                {item.description}
              </Text>
            </Box>
          )}
          <Box paddingX={1}>
            <Text color={config.colors.muted}>
              ID: {item.id}
            </Text>
          </Box>
          <Box paddingX={1}>
            <Text color={config.colors.muted}>
              Last Modified: {item.lastModified.toLocaleString()}
            </Text>
          </Box>
          <Box paddingX={1}>
            <Text color={config.colors.muted}>
              Priority: {item.priority.toUpperCase()}
            </Text>
          </Box>
          {item.assignedAgent && (
            <Box paddingX={1}>
              <Text color={config.colors.muted}>
                Assigned: {item.assignedAgent}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Render actions menu
  const renderActionsMenu = () => {
    if (!showActions || !items[selectedIndex]) return null;

    const item = items[selectedIndex];
    const actions = [
      { key: 'S', label: 'Assign Agent' },
      { key: 'T', label: 'Toggle Status' },
      { key: 'M', label: 'View Metrics' },
      { key: 'E', label: 'Edit PRP' },
      { key: 'D', label: 'Toggle Details' },
      { key: 'X', label: 'Exit Menu' },
    ];

    return (
      <Box flexDirection="column" marginTop={1} paddingX={2}>
        <Box borderStyle="single" borderColor={config.colors.role_colors['robo-aqa']}>
          <Box paddingX={1}>
            <Text color={config.colors.role_colors['robo-aqa']} bold>
              Actions for: {item.title}
            </Text>
          </Box>
          <Newline />
          {actions.map(({ key, label }) => (
            <Box key={key} paddingX={1}>
              <Text color={config.colors.base_fg}>
                {key}: {label}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Render list header
  const renderHeader = () => {
    return (
      <Box borderStyle="single" borderColor={config.colors.muted}>
        <Box paddingX={1}>
          <Text color={config.colors.base_fg} bold>
            Product Requirement Prompts ({items.length})
          </Text>
        </Box>
        <Box paddingX={1}>
          <Text color={config.colors.muted}>
            ○ Low  ◐ Medium  ◑ High  ● Critical
          </Text>
        </Box>
      </Box>
    );
  };

  // Render summary
  const renderSummary = () => {
    const statusCounts = items.reduce(
      (acc, item) => {
        acc[item.status]++;
        return acc;
      },
      { draft: 0, 'in-progress': 0, review: 0, completed: 0 }
    );

    return (
      <Box marginTop={1}>
        <Text color={config.colors.muted}>
          Status: Draft ({statusCounts.draft}) | In Progress ({statusCounts['in-progress']}) |{' '}
          Review ({statusCounts.review}) | Completed ({statusCounts.completed})
        </Text>
      </Box>
    );
  };

  // Handle keyboard input
  useEffect(() => {
    const handleInput = (input: string) => {
      const handled = navigation.handleInput(input);

      // Handle action menu specific inputs
      if (showActions) {
        switch (input) {
          case 'X':
          case 'x':
            setShowActions(false);
            break;
          case 'D':
          case 'd':
            setShowDetails(!showDetails);
            setShowActions(false);
            break;
          case 'T':
          case 't':
            if (onToggleStatus && items[selectedIndex]) {
              onToggleStatus(items[selectedIndex].id);
            }
            break;
        }
      } else {
        // Handle global shortcuts
        switch (input) {
          case 'D':
          case 'd':
            setShowDetails(!showDetails);
            break;
          case 'S':
          case 's':
            setShowActions(true);
            break;
        }
      }
    };

    process.stdin.on('data', handleInput);
    return () => {
      process.stdin.off('data', handleInput);
    };
  }, [navigation, showActions, showDetails, selectedIndex, items, onToggleStatus]);

  return (
    <Box flexDirection="column" width={config.animations.status.fps * 10}>
      {renderHeader()}
      <Newline />

      {/* List items */}
      <Box flexDirection="column">
        {items.map((item, index) => formatItem(item, index === selectedIndex))}
      </Box>

      {/* Item details */}
      {renderItemDetails(items[selectedIndex])}

      {/* Actions menu */}
      {renderActionsMenu()}

      {/* Summary */}
      {renderSummary()}
    </Box>
  );
};