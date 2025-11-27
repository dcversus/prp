/**
 * ♫ Enhanced Debug Screen Component
 *
 * Debug mode screen implementing exact PRP-000-agents05.md specifications:
 * - Non-clearing log buffer (all JSON values from internal systems)
 * - Syntax highlighting for JSON logs
 * - Priority-based color coding (orchestrator/inspector/scanner/guidelines/system)
 * - Brand orange for system [HF] events
 * - Every event logged once per action with different brightness for priorities
 */

import { Box, Text } from 'ink';

import type { TUIState, TUIConfig, TerminalLayout } from '../../../shared/types/TUIState';

interface DebugScreenProps {
  state: TUIState;
  config: TUIConfig;
  terminalLayout: TerminalLayout;
};

// Priority levels for debug events (PRP spec)
type EventPriority = 'high' | 'medium' | 'low' | 'system';

interface DebugEvent {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  priority: EventPriority;
  data: Record<string, unknown> | unknown;
  brightness: 'high' | 'medium' | 'low'; // Different brightness for priorities
};

function getEventColor(
  source: string,
  priority: EventPriority,
  brightness: string,
  config: TUIConfig,
): string {
  // Safely access config colors with type guards
  const safeGetColor = (path: string[], fallback: string): string => {
    try {
      let current: unknown = config;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return fallback;
        }
      }
      return typeof current === 'string' ? current : fallback;
    } catch {
      return fallback;
    }
  };

  const baseColors = {
    system: safeGetColor(['colors', 'accent_orange'], '#FB923C'),
    orchestrator: safeGetColor(['colors', 'accent_orange'], '#FB923C'),
    inspector: safeGetColor(['colors', 'role', 'inspector', 'active'], '#E5C07B'),
    scanner: safeGetColor(['colors', 'role', 'scanner', 'active'], '#8BC4A0'),
    guidelines: safeGetColor(['colors', 'role', 'qc', 'active'], '#E06C75'),
    agent: safeGetColor(['colors', 'role', 'dev', 'active'], '#61AFEF'),
    signal: safeGetColor(['colors', 'signals', 'progress'], '#61AFEF'),
    default: safeGetColor(['colors', 'base_fg'], '#F3F4F6'),
  };

  const baseColor = baseColors[source as keyof typeof baseColors] || baseColors.default;

  // Apply brightness adjustments based on priority and brightness setting
  if (brightness === 'high') {
    return baseColor; // Full brightness
  } else if (brightness === 'medium') {
    // Use dim version for medium brightness
    if (source === 'system' || source === 'orchestrator') {
      return safeGetColor(['colors', 'accent_orange_dim'], '#C77A2C');
    }
    return safeGetColor(['colors', 'muted'], '#6B7280');
  } else {
    // Low brightness - very dim
    return safeGetColor(['colors', 'muted'], '#6B7280');
  }
};

// JSON syntax highlighting for debug logs
function highlightJSON(jsonString: string, config: TUIConfig): React.ReactNode[] {
  // Safely access color with fallback
  const safeGetColor = (path: string[], fallback: string): string => {
    try {
      let current: unknown = config;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return fallback;
        }
      }
      return typeof current === 'string' ? current : fallback;
    } catch {
      return fallback;
    }
  };

  try {
    const parsed = JSON.parse(jsonString);
    return highlightValue(parsed, config);
  } catch {
    // If parsing fails, return as plain text
    return [
      <Text key="plain" color={safeGetColor(['colors', 'base_fg'], '#F3F4F6')}>
        {jsonString}
      </Text>,
    ];
  }
};

function highlightValue(value: unknown, config: TUIConfig, key?: string): React.ReactNode[] {
  // Safely access color with fallback
  const safeGetColor = (path: string[], fallback: string): string => {
    try {
      let current: unknown = config;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return fallback;
        }
      }
      return typeof current === 'string' ? current : fallback;
    } catch {
      return fallback;
    }
  };

  if (value === null) {
    return [
      <Text key="null" color={safeGetColor(['colors', 'role', 'ux', 'active'], '#D19A66')}>
        null
      </Text>,
    ];
  }

  if (typeof value === 'boolean') {
    return [
      <Text key="boolean" color={safeGetColor(['colors', 'role', 'dev', 'active'], '#61AFEF')}>
        {String(value)}
      </Text>,
    ];
  }

  if (typeof value === 'number') {
    return [
      <Text key="number" color={safeGetColor(['colors', 'role', 'devops', 'active'], '#98C379')}>
        {String(value)}
      </Text>,
    ];
  }

  if (typeof value === 'string') {
    return [
      <Text key="string-open" color={config.colors.role?.sa?.active || '#C7A16B'}>
        "
      </Text>,
      <Text key="string-content" color={config.colors.base_fg || '#F3F4F6'}>
        {value}
      </Text>,
      <Text key="string-close" color={config.colors.role?.sa?.active || '#C7A16B'}>
        "
      </Text>,
    ];
  }

  if (Array.isArray(value)) {
    const result: React.ReactNode[] = [
      <Text key="array-open" color={config.colors.muted || '#6B7280'}>
        [
      </Text>,
    ];

    value.forEach((item, index) => {
      if (index > 0) {
        result.push(
          <Text key={index} color={config.colors.muted || '#6B7280'}>
            ,{' '}
          </Text>,
        );
      }
      result.push(...highlightValue(item, config));
    });

    result.push(
      <Text key="array-close" color={config.colors.muted || '#6B7280'}>
        ]
      </Text>,
    );
    return result;
  }

  if (typeof value === 'object') {
    const result: React.ReactNode[] = [
      <Text key="object-open" color={config.colors.muted || '#6B7280'}>
        {'{\n'}
      </Text>,
    ];

    Object.entries(value).forEach(([objKey, objValue], index) => {
      // Indentation
      result.push(
        <Text key={`${index}-indent`} color={config.colors.muted || '#6B7280'}>
          {' '}
        </Text>,
      );

      // Key
      result.push(
        <Text key={`${index}-key`} color={config.colors.role?.ux?.active || '#D19A66'}>
          "{objKey}"
        </Text>,
      );
      result.push(
        <Text key={`${index}-colon`} color={config.colors.muted || '#6B7280'}>
          :{' '}
        </Text>,
      );

      // Value
      result.push(...highlightValue(objValue, config));

      result.push(
        <Text key={`${index}-newline`} color={config.colors.muted || '#6B7280'}>
          \n
        </Text>,
      );
    });

    result.push(
      <Text key="object-close" color={config.colors.muted || '#6B7280'}>
        {'}'}
      </Text>,
    );
    return result;
  }

  return [
    <Text key="fallback" color={config.colors.base_fg}>
      {String(value)}
    </Text>,
  ];
};

export const DebugScreen = ({ state, config, terminalLayout }: DebugScreenProps) => {
  const { history, agents, prps } = state;

  // Convert history to debug events with priority and brightness
  const debugEvents: DebugEvent[] = history.map((item: any, index: number) => {
    // Determine priority based on source and content
    let priority: EventPriority = 'low';
    let brightness: 'high' | 'medium' | 'low' = 'low';

    // System events get high priority and brightness
    if (item.source === 'system') {
      priority = 'system';
      brightness = 'high';
    }
    // Orchestrator events get high priority
    else if (item.source === 'orchestrator') {
      priority = 'high';
      brightness = 'high';
    }
    // Inspector events get medium-high priority
    else if (item.source === 'inspector') {
      priority = 'high';
      brightness = 'medium';
    }
    // Scanner events get medium priority
    else if (item.source === 'scanner') {
      priority = 'medium';
      brightness = 'medium';
    }
    // Agent events get low-medium priority
    else if (item.source.startsWith('agent')) {
      priority = 'medium';
      brightness = 'low';
    }

    // Check for HF (Health Feedback) system events - brand orange
    const isHFEvent =
      item.data && typeof item.data === 'object' && 'type' in item.data && item.data.type === 'HF';
    if (isHFEvent) {
      priority = 'system';
      brightness = 'high';
    }

    // Check for error/warning events
    const isError =
      item.data &&
      typeof item.data === 'object' &&
      ('error' in item.data || ('level' in item.data && item.data.level === 'error'));
    if (isError) {
      priority = 'high';
      brightness = 'high';
    }

    return {
      id: `debug-${index}`,
      timestamp: item.timestamp,
      source: item.source,
      type: item.data?.type || 'unknown',
      priority,
      brightness,
      data: item.data,
    };
  });

  // Sort events by priority and time
  const sortedEvents = debugEvents.sort((a, b) => {
    const priorityOrder = { system: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return a.timestamp.localeCompare(b.timestamp);
  });

  // Non-clearing log buffer - show all events up to available space
  const maxLogLines = Math.max(20, terminalLayout.rows - 10); // Reserve space for header/footer
  const displayEvents = sortedEvents.slice(-maxLogLines);

  return (
    <Box flexDirection="column" width={terminalLayout.columns} height={terminalLayout.rows}>
      {/* Debug Mode Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="row" alignItems="center">
          <Text
            color={
              ((config.colors as any).accent?.orange ||
                (config.colors as any).accent_orange) as string
            }
            bold
          >
            ⚠️ DEBUG MODE
          </Text>
          <Text
            color={
              ((config.colors as any).neutrals?.muted || (config.colors as any).muted) as string
            }
            marginLeft={1}
          >
            (Non-clearing log buffer)
          </Text>
        </Box>
        <Text
          color={((config.colors as any).neutrals?.muted || (config.colors as any).muted) as string}
        >
          Events: {sortedEvents.length} | Agents: {agents.size} | PRPs: {prps.size}
        </Text>
      </Box>

      {/* Priority Legend */}
      <Box flexDirection="row" marginBottom={1}>
        <Text
          color={((config.colors as any).neutrals?.muted || (config.colors as any).muted) as string}
        >
          Priority:
        </Text>
        <Text
          color={
            ((config.colors as any).accent?.orange ||
              (config.colors as any).accent_orange) as string
          }
          marginLeft={1}
        >
          SYSTEM
        </Text>
        <Text
          color={
            ((config.colors as any).accent?.orange ||
              (config.colors as any).accent_orange) as string
          }
          marginLeft={1}
        >
          HIGH
        </Text>
        <Text
          color={((config.colors as any).neutrals?.muted || (config.colors as any).muted) as string}
          marginLeft={1}
        >
          MED
        </Text>
        <Text
          color={((config.colors as any).neutrals?.gray || (config.colors as any).gray) as string}
          marginLeft={1}
        >
          LOW
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {/* System Events with JSON highlighting */}
        {displayEvents.map((event, index) => (
          <Box key={event.id} flexDirection="column" marginBottom={1}>
            {/* Event Header */}
            <Box flexDirection="row">
              <Text color={getEventColor(event.source, event.priority, event.brightness, config)}>
                {event.timestamp} :: {event.source.toUpperCase()}
              </Text>
              {event.type && event.type !== 'unknown' && (
                <Text
                  color={
                    ((config.colors as any).neutrals?.muted ||
                      (config.colors as any).muted) as string
                  }
                  marginLeft={1}
                >
                  [{event.type}]
                </Text>
              )}
              {event.priority === 'system' && (
                <Text
                  color={
                    ((config.colors as any).accent?.orange ||
                      (config.colors as any).accent_orange) as string
                  }
                  marginLeft={1}
                >
                  [HF]
                </Text>
              )}
            </Box>

            {/* Event Data with JSON Syntax Highlighting */}
            <Box flexDirection="column" marginLeft={2}>
              {typeof event.data === 'string'
                ? highlightJSON(event.data, config).map((node, nodeIndex) => (
                    <Text key={nodeIndex}>{node}</Text>
                  ))
                : highlightJSON(JSON.stringify(event.data, null, 0), config).map(
                    (node, nodeIndex) => <Text key={nodeIndex}>{node}</Text>,
                  )}
            </Box>
          </Box>
        ))}

        {/* Empty state */}
        {displayEvents.length === 0 && (
          <Box flexDirection="column" alignItems="center" marginTop={5}>
            <Text
              color={
                ((config.colors as any).neutrals?.muted || (config.colors as any).muted) as string
              }
            >
              ♪ No system events yet...
            </Text>
            <Text
              color={
                ((config.colors as any).neutrals?.gray || (config.colors as any).gray) as string
              }
              marginTop={1}
            >
              Waiting for internal system activity
            </Text>
          </Box>
        )}
      </Box>

      {/* Debug Footer */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Text color={config.colors.neutrals.muted}>
          Buffer: {displayEvents.length}/{sortedEvents.length} events shown
        </Text>
        <Text color={config.colors.neutrals.muted}>Press 'D' again to clear buffer</Text>
      </Box>
    </Box>
  );
};
