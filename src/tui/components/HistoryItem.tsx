/**
 * ♫ HistoryItem Component
 *
 * Displays system/scanner/inspector history items with timestamps
 * and compact JSON formatting as specified in the PRP
 */

import { Box, Text } from 'ink';

import type { HistoryItem as HistoryItemType, TUIConfig } from '../../shared/types/TUIConfig';

interface HistoryItemProps {
  item: HistoryItemType;
  config: TUIConfig;
};

export const HistoryItem = ({ item, config }: HistoryItemProps) => {
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'system':
        return config.colors.accent_orange;
      case 'scanner':
        return config.colors.robo_devops_sre;
      case 'inspector':
        return config.colors.robo_system_analyst;
      case 'orchestrator':
        return config.colors.orchestrator;
      default:
        return config.colors.base_fg;
    }
  };

  // Format JSON compactly on one line
  const formatCompactJSON = (data: Record<string, unknown>): string => {
    try {
      const json = JSON.stringify(data).replace(/"/g, '').replace(/,/g, ', ').replace(/:/g, ': ');
      return json.length > 100 ? `${json.substring(0, 97)  }...` : json;
    } catch {
      return '[Invalid JSON]';
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Source and timestamp line */}
      <Box>
        <Text color={getSourceColor(item.source)}>
          {item.source} · {item.timestamp}
        </Text>
      </Box>

      {/* Compact JSON data */}
      <Box>
        <Text color={config.colors.base_fg}>{formatCompactJSON(item.data)}</Text>
      </Box>
    </Box>
  );
};
