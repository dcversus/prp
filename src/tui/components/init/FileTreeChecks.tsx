/**
 * ♫ FileTreeChecks - File tree with checkboxes
 *
 * Hierarchical file tree with checkboxes, expand/collapse,
 * right-arrow navigation, and bulk operations
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  checked: boolean;
  children?: TreeNode[];
  description?: string;
  required?: boolean;
}

export interface FileTreeChecksProps {
  nodes: TreeNode[];
  onToggle: (nodeId: string, checked: boolean) => void;
  config?: TUIConfig;
  disabled?: boolean;
  showLineNumbers?: boolean;
  maxHeight?: number;
  expandOnFocus?: boolean;
}

export const FileTreeChecks: React.FC<FileTreeChecksProps> = ({
  nodes,
  onToggle,
  config,
  disabled = false,
  showLineNumbers = true,
  maxHeight = 10,
  expandOnFocus = true
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  // Toggle node expansion
  const toggleExpand = useCallback((nodeId: string, path: string[] = []) => {
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
  const handleToggle = useCallback((nodeId: string, checked: boolean, path: string[] = []) => {
    if (disabled) return;
    onToggle(nodeId, checked);
    setSelectedNode(nodeId);
    setSelectedPath(path);
  }, [disabled, onToggle]);

  // Navigate through tree
  const navigateTree = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (disabled) return;

    // Simple navigation implementation
    // In a full implementation, this would traverse the tree structure
    if (direction === 'right' && selectedNode) {
      // Expand if it's a directory
      const findNode = (nodes: TreeNode[], path: string[]): { node: TreeNode; path: string[] } | null => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const currentPath = [...path, node.id];

          if (node.id === selectedNode) {
            return { node, path: currentPath };
          }

          if (node.children) {
            const found = findNode(node.children, currentPath);
            if (found) return found;
          }
        }
        return null;
      };

      const found = findNode(nodes, []);
      if (found?.node.type === 'directory' && found.node.children) {
        toggleExpand(found.node.id, found.path);
      }
    }
  }, [disabled, selectedNode, nodes, toggleExpand]);

  // Handle space to toggle checkbox
  const handleSpace = useCallback(() => {
    if (disabled || !selectedNode) return;
    const findNode = (nodes: TreeNode[], path: string[]): { node: TreeNode; path: string[] } | null => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const currentPath = [...path, node.id];

        if (node.id === selectedNode) {
          return { node, path: currentPath };
        }

        if (node.children) {
          const found = findNode(node.children, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    const found = findNode(nodes, []);
    if (found && !found.node.required) {
      handleToggle(found.node.id, !found.node.checked, found.path);
    }
  }, [disabled, selectedNode, nodes, handleToggle]);

  // Keyboard navigation
  useInput((input, key) => {
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
  }, { isActive: !disabled });

  // Calculate tree statistics
  const calculateStats = useCallback((nodes: TreeNode[]): { total: number; checked: number; partial: number } => {
    let total = 0;
    let checked = 0;
    let partial = 0;

    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        if (node.type === 'file') {
          total++;
          if (node.checked) checked++;
        } else if (node.children) {
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
  const renderNode = (node: TreeNode, depth: number = 0, path: string[] = []): JSX.Element => {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedNode === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const currentPath = [...path, node.id];

    // Calculate checkbox state for directories
    let checkboxState = '□';
    let checkboxColor = config?.colors?.muted;

    if (node.type === 'directory' && node.children) {
      const childStats = calculateStats(node.children);
      if (childStats.checked === childStats.total && childStats.total > 0) {
        checkboxState = '✓';
        checkboxColor = config?.colors?.ok || '#00FF00';
      } else if (childStats.checked > 0) {
        checkboxState = '◐';
        checkboxColor = config?.colors?.warn || '#FFCC66';
      }
    } else if (node.checked) {
      checkboxState = '✓';
      checkboxColor = config?.colors?.ok || '#00FF00';
    }

    const nodeColor = isSelected
      ? config?.colors?.accent_orange
      : hasChildren
        ? config?.colors?.accent_orange
        : config?.colors?.base_fg;

    const indent = '  '.repeat(depth);

    return (
      <Box key={node.id} flexDirection="column">
        <Box flexDirection="row">
          {/* Checkbox */}
          <Text
            color={node.required ? config?.colors?.warn : checkboxColor}
            onClick={() => !node.required && handleToggle(node.id, !node.checked, currentPath)}
          >
            [{checkboxState}]
          </Text>

          {/* Indentation */}
          <Text color={config?.colors?.gray}>
            {indent}
          </Text>

          {/* Expand/collapse arrow for directories */}
          {hasChildren && (
            <Text
              color={nodeColor}
              onClick={() => toggleExpand(node.id, currentPath)}
            >
              {isExpanded ? '▼' : '▶'}
            </Text>
          )}

          {/* Node name */}
          <Text
            color={nodeColor}
            bold={isSelected}
            onClick={() => {
              setSelectedNode(node.id);
              setSelectedPath(currentPath);
            }}
          >
            {node.name}
          </Text>

          {/* Required indicator */}
          {node.required && (
            <Text color={config?.colors?.warn} marginLeft={1}>
              *
            </Text>
          )}

          {/* Description */}
          {node.description && (
            <Text color={config?.colors?.muted} dimColor marginLeft={1}>
              - {node.description}
            </Text>
          )}
        </Box>

        {/* Children (expanded) */}
        {isExpanded && hasChildren && (
          <Box marginLeft={3}>
            {node.children?.map((child) => renderNode(child, depth + 1, currentPath))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header with statistics */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color={config?.colors?.accent_orange} bold>
          Files & Directories
        </Text>
        <Text color={config?.colors?.muted}>
          {stats.checked}/{stats.total} selected
        </Text>
      </Box>

      {/* Tree structure */}
      <Box flexDirection="column" maxHeight={maxHeight} borderStyle="single" borderColor={config?.colors?.gray} padding={1}>
        {nodes.length === 0 ? (
          <Text color={config?.colors?.muted}>
            No files or directories
          </Text>
        ) : (
          nodes.map((node) => renderNode(node))
        )}
      </Box>

      {/* Legend and help */}
      <Box flexDirection="column" marginTop={1}>
        <Text color={config?.colors?.muted} dimColor>
          Legend: [□] empty • [✓] selected • [◐] partial • * = required
        </Text>
        <Text color={config?.colors?.muted} dimColor>
          [↑/↓] navigate • [→] open • [←] close • [Space] toggle • [Tab] next field
        </Text>
      </Box>
    </Box>
  );
};

export default FileTreeChecks;