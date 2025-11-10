/**
 * ♫ FileTreeChecks - File tree with checkboxes
 *
 * Hierarchical file tree with checkboxes, expand/collapse,
 * right-arrow navigation, and bulk operations
 */
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

// Import types
import type { TemplateFile, FileTreeChecksProps } from './types.js';

// Use TemplateFile from types.ts as TreeNode
export type TreeNode = TemplateFile;

export const FileTreeChecks: React.FC<FileTreeChecksProps> = ({
  nodes,
  onToggle,
  focused = false
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Toggle node expansion
  const toggleExpand = useCallback((nodeId: string) => {
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Toggle node selection
  const handleToggle = useCallback((nodeId: string, _checked: boolean) => {
    onToggle(nodeId);
    setSelectedNode(nodeId);
  }, [onToggle]);

  // Navigate through tree
  const navigateTree = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Simple navigation implementation
    if (direction === 'right' && selectedNode) {
      const findNode = (nodes: TreeNode[]): TreeNode | null => {
        for (const node of nodes) {
          if (node.path === selectedNode) {
            return node;
          }
          if (node.children) {
            const found = findNode(node.children);
            if (found) {
              return found;
            }
          }
        }
        return null;
      };

      const found = findNode(nodes);
      if (found?.children && found.children.length > 0) {
        toggleExpand(found.path);
      }
    }
  }, [selectedNode, nodes, toggleExpand]);

  // Handle space to toggle checkbox
  const handleSpace = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.path === selectedNode) {
          return node;
        }
        if (node.children) {
          const found = findNode(node.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    const found = findNode(nodes);
    if (found && !found.required) {
      handleToggle(found.path, !found.checked);
    }
  }, [selectedNode, nodes, handleToggle]);

  // Keyboard navigation
  useInput((input, key) => {
    if (!focused) {
      return;
    }

    if (key.upArrow) {
      navigateTree('up');
    } else if (key.downArrow) {
      navigateTree('down');
    } else if (key.leftArrow) {
      navigateTree('left');
    } else if (key.rightArrow) {
      navigateTree('right');
    } else if (input === ' ') {
      handleSpace();
    }
  });

  // Calculate tree statistics
  const calculateStats = useCallback((nodes: TreeNode[]): { total: number; checked: number; partial: number } => {
    let total = 0;
    let checked = 0;
    let partial = 0;

    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        if (!node.children || node.children.length === 0) {
          total++;
          if (node.checked) {
            checked++;
          }
        } else {
          const childStats = traverse(node.children);
          total += childStats.total;

          if (childStats.checked === childStats.total && childStats.total > 0) {
            checked += childStats.total;
          } else if (childStats.checked > 0) {
            partial++;
          }
        }
      }
      return { total, checked, partial };
    };

    return traverse(nodes);
  }, []);

  const stats = calculateStats(nodes);

  // Render tree node
  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    const isExpanded = expanded.has(node.path);
    const isSelected = selectedNode === node.path;
    const hasChildren = node.children && node.children.length > 0;

    // Calculate checkbox state for directories
    let checkboxState = '□';
    let checkboxColor = '#666666';

    if (hasChildren) {
      const childStats = calculateStats(node.children ?? []);
      if (childStats.checked === childStats.total && childStats.total > 0) {
        checkboxState = '✓';
        checkboxColor = '#00FF00';
      } else if (childStats.checked > 0) {
        checkboxState = '◐';
        checkboxColor = '#FFCC66';
      }
    } else if (node.checked) {
      checkboxState = '✓';
      checkboxColor = '#00FF00';
    }

    const nodeColor = isSelected
      ? '#FF8C00'
      : hasChildren
        ? '#FF8C00'
        : '#FFFFFF';

    const indent = '  '.repeat(depth);

    return (
      <Box key={node.path} flexDirection="column">
        <Box flexDirection="row">
          {/* Checkbox */}
          <Text
            color={node.required ? '#FFCC66' : checkboxColor}
          >
            [{checkboxState}]
          </Text>

          {/* Indentation */}
          <Text color="#666666">
            {indent}
          </Text>

          {/* Expand/collapse arrow for directories */}
          {hasChildren && (
            <Text
              color={nodeColor}
            >
              {isExpanded ? '▼' : '▶'}
            </Text>
          )}

          {/* Node name */}
          <Text
            color={nodeColor}
            bold={isSelected}
          >
            {node.name}
          </Text>

          {/* Required indicator */}
          {node.required && (
            <Box marginLeft={1}>
              <Text color="#FFCC66">
                *
              </Text>
            </Box>
          )}

          {/* Description */}
          {node.description && (
            <Box marginLeft={1}>
              <Text color="#666666" dimColor>
                - {node.description}
              </Text>
            </Box>
          )}
        </Box>

        {/* Children (expanded) */}
        {isExpanded && hasChildren && (
          <Box marginLeft={3}>
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header with statistics */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color="#FF8C00" bold>
          Files & Directories
        </Text>
        <Text color="#666666">
          {stats.checked}/{stats.total} selected
        </Text>
      </Box>

      {/* Tree structure */}
      <Box flexDirection="column" borderStyle="single" borderColor="#666666" padding={1}>
        {nodes.length === 0 ? (
          <Text color="#666666">
            No files or directories
          </Text>
        ) : (
          nodes.map((node) => renderNode(node))
        )}
      </Box>

      {/* Legend and help */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="#666666" dimColor>
          Legend: [□] empty • [✓] selected • [◐] partial • * = required
        </Text>
        <Text color="#666666" dimColor>
          [↑/↓] navigate • [→] open • [←] close • [Space] toggle • [Tab] next field
        </Text>
      </Box>
    </Box>
  );
};

export default FileTreeChecks;